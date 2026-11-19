/*
 * Shared scanning logic for extract.mjs / check.mjs.
 *
 * Frontend: runs babel-plugin-translate.js in "collect" mode over frontend/src, so exactly the
 *           strings the build would look up are found.
 * Backend:  collects messages that can reach the UI (see AGENTS.md, "Backend messages").
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

const require = createRequire(import.meta.url);
const babel = require("@babel/core");
const traverse = require("@babel/traverse").default;
const translatePlugin = require("../babel-plugin-translate.js");

export const I18N_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_DIR = path.resolve(I18N_DIR, "..");
export const FRONTEND_SRC = path.join(REPO_DIR, "frontend", "src");
export const BACKEND_LIB = path.join(REPO_DIR, "backend", "lib");

const OVERRIDE_HASH_REGEX = /^\/\/ upstream-sha256: ([0-9a-f]{64})/m;

export function walk(dir, filter, out = []) {
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            if (entry.name !== "node_modules" && entry.name !== "generated") {
                walk(full, filter, out);
            }
        } else if (filter(full)) {
            out.push(full);
        }
    }

    return out.sort();
}

export function sha256(file) {
    return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

export function rel(file) {
    return path.relative(REPO_DIR, file);
}

export function readJson(file, fallback) {
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf-8")) : fallback;
}

export function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 4) + "\n");
}

/**
 * Text resources (markdown help texts etc.) are translated as whole files via overrides.
 * A res file qualifies if it has no imports and contains a multi-line template literal.
 *
 * @param {string} file
 * @returns {boolean}
 */
export function isTextResource(file) {
    if (!file.split(path.sep).includes("res") || !/\.tsx?$/.test(file)) {
        return false;
    }
    const content = fs.readFileSync(file, "utf-8");

    return !/^\s*import\s/m.test(content) && !/<svg/.test(content) && /`[^`]*\n[^`]*`/.test(content);
}

/**
 * @param {string} lang
 * @returns {{
 *   textResources: Array<{source: string, override: string, status: "ok"|"missing"|"stale"|"unstamped", hash: string}>
 *   orphanedOverrides: Array<string>
 * }}
 */
export function scanOverrides(lang) {
    const overridesDir = path.join(I18N_DIR, lang, "overrides");
    const textResources = walk(FRONTEND_SRC, isTextResource).map(source => {
        const override = path.join(overridesDir, path.relative(FRONTEND_SRC, source));
        const hash = sha256(source);
        let status = "ok";

        if (!fs.existsSync(override)) {
            status = "missing";
        } else {
            const m = OVERRIDE_HASH_REGEX.exec(fs.readFileSync(override, "utf-8"));
            if (!m) {
                status = "unstamped";
            } else if (m[1] !== hash) {
                status = "stale";
            }
        }

        return {source, override, status, hash};
    });

    const orphanedOverrides = fs.existsSync(overridesDir) ? walk(overridesDir, f => /\.tsx?$/.test(f)).filter(o => {
        return !fs.existsSync(path.join(FRONTEND_SRC, path.relative(overridesDir, o)));
    }) : [];

    return {textResources, orphanedOverrides};
}

/**
 * @returns {Map<string, {kind: string, ui: boolean, locations: Array<string>}>}
 */
export function scanFrontend() {
    const results = new Map();
    const files = walk(FRONTEND_SRC, f => /\.(ts|tsx|js|jsx)$/.test(f) && !f.endsWith(".d.ts"))
        .filter(f => !isTextResource(f));

    for (const file of files) {
        babel.transformSync(fs.readFileSync(file, "utf-8"), {
            filename: file,
            babelrc: false,
            configFile: false,
            code: false,
            ast: false,
            parserOpts: {plugins: ["typescript", "jsx"]},
            plugins: [[translatePlugin, {
                collect: (entry) => {
                    const existing = results.get(entry.key);
                    const location = entry.location.replace(REPO_DIR + path.sep, "");

                    if (existing) {
                        existing.ui = existing.ui || entry.ui;
                        if (!existing.locations.includes(location)) {
                            existing.locations.push(location);
                        }
                    } else {
                        results.set(entry.key, {kind: entry.kind, ui: entry.ui, locations: [location]});
                    }
                }
            }]]
        });
    }

    return results;
}

const BACKEND_MESSAGE_PROPERTIES = new Set(["message", "title", "description"]);
const RAW_ENUM_FILES = ["StatusStateAttribute.js", "DockStatusStateAttribute.js"].map(f => path.join("entities", "state", "attributes", f));

function literalKey(node) {
    if (!node) {
        return undefined;
    }
    if (node.type === "StringLiteral") {
        return translatePlugin.normalizeKey(node.value);
    }
    if (node.type === "TemplateLiteral") {
        return translatePlugin.normalizeKey(node.quasis.map((q, i) => (i > 0 ? `{${i - 1}}` : "") + q.value.cooked).join(""));
    }

    return undefined;
}

/**
 * Collects backend strings that can be shown in the UI:
 *  - values of message/title/description properties and assignments (x.message = "...")
 *  - first string argument of `new SomethingError(...)` and of res.send()/res.status().send()
 *  - quirk option arrays (`options: ["a", "b"]`) in QuirkFactory files
 *  - robot/dock status enum values (rendered raw by the UI)
 *
 * @returns {Map<string, {kind: string, ui: boolean, locations: Array<string>}>}
 */
export function scanBackend() {
    const results = new Map();
    const files = walk(BACKEND_LIB, f => f.endsWith(".js"));

    for (const file of files) {
        const code = fs.readFileSync(file, "utf-8");
        let ast;

        try {
            ast = babel.parseSync(code, {filename: file, babelrc: false, configFile: false, sourceType: "unambiguous"});
        } catch (e) {
            console.warn(`Could not parse ${rel(file)}: ${e.message}`);
            continue;
        }

        const add = (node, kind) => {
            const key = literalKey(node);
            if (!key || !/[A-Za-z]{2,}/.test(key.replace(/\{\d+\}/g, ""))) {
                return;
            }
            const location = `${rel(file)}:${node.loc.start.line}`;
            const existing = results.get(key);

            if (existing) {
                if (!existing.locations.includes(location)) {
                    existing.locations.push(location);
                }
            } else {
                results.set(key, {kind, ui: true, locations: [location]});
            }
        };

        const addExpression = (node, kind) => {
            // follow ternaries / logical expressions
            if (!node) {
                return;
            }
            if (node.type === "ConditionalExpression") {
                addExpression(node.consequent, kind);
                addExpression(node.alternate, kind);
            } else if (node.type === "LogicalExpression") {
                addExpression(node.left, kind);
                addExpression(node.right, kind);
            } else {
                add(node, kind);
            }
        };

        traverse(ast, {
            ObjectProperty(p) {
                const keyName = p.node.key.type === "Identifier" ? p.node.key.name : (p.node.key.type === "StringLiteral" ? p.node.key.value : undefined);

                if (BACKEND_MESSAGE_PROPERTIES.has(keyName)) {
                    addExpression(p.node.value, keyName);
                }
                if (keyName === "options" && file.endsWith("QuirkFactory.js") && p.node.value.type === "ArrayExpression") {
                    p.node.value.elements.forEach(el => {
                        add(el, "quirk-option");
                    });
                }
            },
            AssignmentExpression(p) {
                const left = p.node.left;

                // Enum values rendered as-is by the UI (robot status + flag, dock status)
                if (
                    RAW_ENUM_FILES.some(f => file.endsWith(f)) && left.type === "MemberExpression" && !left.computed &&
                    ["VALUE", "FLAG"].includes(left.property.name) && p.node.right.type === "CallExpression" &&
                    p.node.right.arguments[0]?.type === "ObjectExpression"
                ) {
                    p.node.right.arguments[0].properties.forEach(prop => {
                        add(prop.value, "state-value");
                    });
                }

                if (left.type === "MemberExpression" && !left.computed && BACKEND_MESSAGE_PROPERTIES.has(left.property.name)) {
                    addExpression(p.node.right, left.property.name);
                }
            },
            NewExpression(p) {
                const callee = p.node.callee;
                const name = callee.type === "Identifier" ? callee.name : (callee.type === "MemberExpression" && !callee.computed ? callee.property.name : "");

                if (/Error$/.test(name)) {
                    p.node.arguments.forEach(arg => {
                        addExpression(arg, "error");
                    });
                }
            },
            CallExpression(p) {
                const callee = p.node.callee;

                if (callee.type === "MemberExpression" && !callee.computed && callee.property.name === "send" && file.includes(`${path.sep}webserver${path.sep}`)) {
                    addExpression(p.node.arguments[0], "http-response");
                }
            }
        });
    }

    return results;
}

/**
 * Compares sources against the dictionaries of a language.
 *
 * @param {string} lang
 */
export function analyze(lang) {
    const langDir = path.join(I18N_DIR, lang);
    const frontendDictionary = readJson(path.join(langDir, "frontend.json"), {});
    const backendDictionary = readJson(path.join(langDir, "backend.json"), {});

    const frontend = scanFrontend();
    const backend = scanBackend();
    const overrides = scanOverrides(lang);

    const missingFrontend = {};
    for (const [key, info] of frontend) {
        if (info.ui && !Object.prototype.hasOwnProperty.call(frontendDictionary, key)) {
            missingFrontend[key] = info;
        }
    }
    const missingBackend = {};
    for (const [key, info] of backend) {
        if (!Object.prototype.hasOwnProperty.call(backendDictionary, key)) {
            missingBackend[key] = info;
        }
    }

    // Scoped keys ("file#kind|key", "file|key") count as used if file and key still exist
    const unusedFrontend = Object.keys(frontendDictionary).filter(k => {
        if (k.startsWith("$")) {
            return false;
        }
        const m = /^([^|]+\.(?:tsx?|jsx?)(?:#(?:jsx|string|template))?)\|([\s\S]*)$/.exec(k);
        if (m) {
            const file = m[1].replace(/#.*$/, "");
            const info = frontend.get(m[2]);

            return !info || !info.locations.some(l => l.startsWith(`frontend/src/${file}:`));
        }

        return !frontend.has(k);
    });
    const unusedBackend = Object.keys(backendDictionary).filter(k => !k.startsWith("$") && !backend.has(k));

    const placeholderErrors = [];
    for (const [name, dict] of [["frontend", frontendDictionary], ["backend", backendDictionary]]) {
        for (const [k, v] of Object.entries(dict)) {
            if (typeof v !== "string") {
                continue;
            }
            const a = (k.match(/\{\d+\}/g) || []).sort().join();
            const b = (v.replace(/\{(\d+)\?[^:{}]*:[^{}]*\}/g, "{$1}").match(/\{\d+\}/g) || []).filter((x, i, arr) => arr.indexOf(x) === i).sort().join();
            if (a !== b) {
                placeholderErrors.push(`${name}: "${k}" -> "${v}"`);
            }
        }
    }

    return {missingFrontend, missingBackend, unusedFrontend, unusedBackend, overrides, placeholderErrors};
}
