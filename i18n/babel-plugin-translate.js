/*
 * Build-time translation of the Valetudo frontend.
 *
 * Replaces English UI strings in the frontend sources with their translation from a
 * dictionary ({ "English": "Deutsch" }). A string is only ever replaced when it is
 * present in the dictionary AND appears in a position that can be user-visible.
 * Anything not in the dictionary stays untouched, so the plugin is safe by default.
 *
 * Handled:
 *   - JSXText                         <Typography>Some text</Typography>
 *   - StringLiteral                   label="Some text", { title: "Some text" }, foo("Some text")
 *   - TemplateLiteral                 `Error while sending ${a} to ${b}` -> key "Error while sending {0} to {1}"
 *
 * Never touched (see isExcludedContext):
 *   import/export sources, object keys, comparisons, switch cases, TS enums/types,
 *   technical JSX attributes (className, key, value, ...), arguments of storage/network calls.
 *
 * Options:
 *   dictionary: object   - the parsed dictionary (key -> translation | null)
 *   collect:    function - if set, nothing is replaced; collect(entry) is called for every candidate
 *                          string instead (used by i18n/scripts/extract.mjs)
 */
"use strict";

const EXCLUDED_JSX_ATTRIBUTES = new Set([
    "className", "key", "id", "href", "src", "style", "value", "name", "type", "to", "ref",
    "component", "variant", "color", "size", "edge", "anchor", "align", "direction", "orientation",
    "position", "role", "target", "rel", "htmlFor", "autoComplete", "inputMode", "pattern",
    "defaultValue", "sx", "severity", "fontSize", "padding", "margin", "justifyContent", "alignItems",
    "aria-controls", "aria-labelledby", "aria-describedby", "aria-haspopup", "aria-expanded",
    "data-testid", "language", "lang", "mode", "maxWidth", "placement", "scroll", "textAlign"
]);

const UI_JSX_ATTRIBUTES = new Set([
    "label", "title", "placeholder", "primary", "secondary", "primaryLabel", "secondaryLabel",
    "helperText", "alt", "aria-label", "tooltip", "text", "description", "header", "subheader",
    "confirmationDialogTitle", "confirmationDialogBody", "buttonLabel", "helpText", "hint"
]);

const EXCLUDED_CALLEES = new Set([
    "require", "fetch", "useLocalStorage", "getItem", "setItem", "removeItem",
    "get", "post", "put", "delete", "patch", "includes", "startsWith", "endsWith", "indexOf",
    "split", "replace", "replaceAll", "match", "matchAll", "test", "querySelector",
    "querySelectorAll", "getElementById", "addEventListener", "removeEventListener",
    "createElement", "setAttribute", "getAttribute", "postMessage", "invalidateQueries",
    "useQuery", "useMutation", "Symbol", "URL", "RegExp", "Worker", "EventSource",
    "ReconnectingEventSource", "toLocaleString", "toLocaleDateString", "toLocaleTimeString",
    "padStart", "padEnd", "join", "styled", "alpha", "darken", "lighten", "keyframes"
]);

const EXCLUDED_OBJECT_PROPERTY_KEYS = new Set([
    "__class", "id", "key", "type", "value", "route", "path", "href", "url", "className",
    "variant", "color", "position", "display", "flexDirection", "justifyContent", "alignItems",
    "textAlign", "fontFamily", "fontWeight", "cursor", "overflow", "whiteSpace", "wordBreak",
    "mode", "method", "contentType", "queryKey", "mutationKey", "capability", "name"
]);

/**
 * Re-implementation of the JSX whitespace rules (babel-types cleanJSXElementLiteralChild)
 * so that we know exactly which text React will render for a JSXText node.
 *
 * @param {string} value
 * @returns {string}
 */
function renderJsxText(value) {
    const lines = value.split(/\r\n|\n|\r/);
    let lastNonEmptyLine = 0;

    for (let i = 0; i < lines.length; i++) {
        if (/[^ \t]/.test(lines[i])) {
            lastNonEmptyLine = i;
        }
    }

    let str = "";

    for (let i = 0; i < lines.length; i++) {
        const isFirstLine = i === 0;
        const isLastLine = i === lines.length - 1;
        const isLastNonEmptyLine = i === lastNonEmptyLine;
        let trimmedLine = lines[i].replace(/\t/g, " ");

        if (!isFirstLine) {
            trimmedLine = trimmedLine.replace(/^[ ]+/, "");
        }
        if (!isLastLine) {
            trimmedLine = trimmedLine.replace(/[ ]+$/, "");
        }
        if (trimmedLine) {
            if (!isLastNonEmptyLine) {
                trimmedLine += " ";
            }
            str += trimmedLine;
        }
    }

    return str;
}

/**
 * Dictionary key normalisation: collapse ASCII whitespace runs, trim.
 * Non-breaking spaces and other special characters are preserved.
 *
 * @param {string} str
 * @returns {string}
 */
function normalizeKey(str) {
    return str.replace(/[ \t\r\n]+/g, " ").trim();
}

/**
 * Splits a string into leading whitespace, core and trailing whitespace
 *
 * @param {string} str
 * @returns {{lead: string, core: string, trail: string}}
 */
function splitWhitespace(str) {
    const m = /^([ \t\r\n]*)([\s\S]*?)([ \t\r\n]*)$/.exec(str);

    return {lead: m[1], core: m[2], trail: m[3]};
}

function calleeName(callee) {
    if (!callee) {
        return undefined;
    }
    if (callee.type === "Identifier") {
        return callee.name;
    }
    if ((callee.type === "MemberExpression" || callee.type === "OptionalMemberExpression") && !callee.computed && callee.property.type === "Identifier") {
        return callee.property.name;
    }

    return undefined;
}

function propertyKeyName(node) {
    if (!node) {
        return undefined;
    }
    if (node.type === "Identifier") {
        return node.name;
    }
    if (node.type === "StringLiteral") {
        return node.value;
    }

    return undefined;
}

/**
 * Walks up from a literal through "transparent" wrappers (ternaries, logical expressions,
 * TS casts, parentheses) and decides whether the literal is used in a technical position.
 *
 * @param {import("@babel/core").NodePath} path
 * @returns {{excluded: boolean, uiAttribute: boolean}}
 */
function classifyContext(path) {
    let child = path;
    let parent = path.parentPath;

    while (parent) {
        const p = parent.node;

        switch (p.type) {
            case "ConditionalExpression":
                if (p.test === child.node) {
                    return {excluded: true, uiAttribute: false};
                }
                break;
            case "LogicalExpression":
            case "TSAsExpression":
            case "TSSatisfiesExpression":
            case "TSNonNullExpression":
            case "ParenthesizedExpression":
            case "SequenceExpression":
                break;
            case "ArrayExpression": {
                // Arrays of literals that are compared against (e.g. ["a","b"].includes(x)) are excluded
                // via the CallExpression case below, everything else is treated like its parent.
                break;
            }
            case "JSXExpressionContainer":
                break;
            case "JSXAttribute": {
                const attrName = p.name.type === "JSXNamespacedName" ? `${p.name.namespace.name}:${p.name.name.name}` : p.name.name;

                if (EXCLUDED_JSX_ATTRIBUTES.has(attrName) || attrName.startsWith("data-") || /^on[A-Z]/.test(attrName)) {
                    return {excluded: true, uiAttribute: false};
                }

                return {excluded: false, uiAttribute: UI_JSX_ATTRIBUTES.has(attrName)};
            }
            case "ObjectProperty":
                if (p.key === child.node || p.computed) {
                    return {excluded: true, uiAttribute: false};
                }
                if (EXCLUDED_OBJECT_PROPERTY_KEYS.has(propertyKeyName(p.key))) {
                    return {excluded: true, uiAttribute: false};
                }

                return {excluded: false, uiAttribute: false};
            case "ObjectMethod":
            case "ClassMethod":
            case "ClassProperty":
            case "ClassPrivateProperty":
                if (p.key === child.node) {
                    return {excluded: true, uiAttribute: false};
                }

                return {excluded: false, uiAttribute: false};
            case "MemberExpression":
            case "OptionalMemberExpression":
                // obj["key"] or "literal".method()
                return {excluded: true, uiAttribute: false};
            case "BinaryExpression":
                if (["==", "===", "!=", "!==", "in", "instanceof"].includes(p.operator)) {
                    return {excluded: true, uiAttribute: false};
                }
                // String concatenation: only the pieces are seen, which won't be in the dictionary anyway
                break;
            case "SwitchCase":
            case "ImportDeclaration":
            case "ExportNamedDeclaration":
            case "ExportAllDeclaration":
            case "ImportExpression":
            case "TSEnumMember":
            case "TSLiteralType":
            case "TSPropertySignature":
            case "TSTypeAnnotation":
            case "TSIndexedAccessType":
            case "TSExternalModuleReference":
            case "TSModuleDeclaration":
            case "Directive":
            case "DirectiveLiteral":
            case "TaggedTemplateExpression":
            case "AssignmentPattern":
                return {excluded: true, uiAttribute: false};
            case "CallExpression":
            case "OptionalCallExpression":
            case "NewExpression": {
                if (p.callee === child.node) {
                    return {excluded: true, uiAttribute: false};
                }
                const name = calleeName(p.callee);
                if (p.callee.type === "Import" || EXCLUDED_CALLEES.has(name)) {
                    return {excluded: true, uiAttribute: false};
                }
                if (
                    (p.callee.type === "MemberExpression" || p.callee.type === "OptionalMemberExpression") &&
                    p.callee.object.type === "Identifier" &&
                    ["localStorage", "sessionStorage", "axios", "valetudoAPI", "console", "JSON", "Object", "document", "window"].includes(p.callee.object.name)
                ) {
                    return {excluded: true, uiAttribute: false};
                }

                return {excluded: false, uiAttribute: false};
            }
            default:
                return {excluded: false, uiAttribute: false};
        }

        child = parent;
        parent = parent.parentPath;
    }

    return {excluded: false, uiAttribute: false};
}

/**
 * Heuristic used in collect mode only: does this look like prose a human will read?
 *
 * @param {string} key
 * @returns {boolean}
 */
function looksLikeUiText(key) {
    if (!/[A-Za-z]{2,}/.test(key)) {
        return false;
    }
    if (/^(https?:|mailto:|\/|\.\/|\.\.\/|#|data:)/.test(key)) {
        return false;
    }
    if (/^[a-z0-9_.:\-/]+$/.test(key)) { // snake_case, kebab-case, paths, ids, enum values
        return false;
    }
    if (/^[A-Z][A-Za-z0-9]*(Capability|State|Attribute|Event|Error|Interaction|Type)$/.test(key)) {
        return false;
    }
    if (/^[a-z]+([A-Z][a-z0-9]*)+$/.test(key)) { // camelCase identifiers
        return false;
    }
    if (/^[A-Z0-9_]+$/.test(key) && key.length > 1 && key.includes("_")) { // CONSTANT_CASE
        return false;
    }
    if (/^\d+(\.\d+)?(px|em|rem|%|vh|vw|s|ms)?( \d+(\.\d+)?(px|em|rem|%|vh|vw|s|ms)?)*$/.test(key)) {
        return false;
    }
    if (/^(rgba?|hsla?|calc|translate|scale|rotate|var)\(/.test(key)) {
        return false;
    }

    return true;
}

const PLACEHOLDER_SPLIT_REGEX = /\{(\d+)(?:\?([^:{}]*):([^{}]*))?\}/;

/**
 * Path of a source file relative to frontend/src, with forward slashes ("controls/Dock.tsx")
 *
 * @param {string} filename
 * @returns {string|undefined}
 */
function relativeSourcePath(filename) {
    if (!filename) {
        return undefined;
    }
    const normalized = filename.split("\\").join("/");
    const idx = normalized.lastIndexOf("/frontend/src/");

    return idx === -1 ? undefined : normalized.slice(idx + "/frontend/src/".length);
}

function templateKey(quasis) {
    return quasis.map((q, i) => (i > 0 ? `{${i - 1}}` : "") + q.value.cooked).join("");
}

module.exports = function valetudoTranslatePlugin(babel) {
    const t = babel.types;

    /*
     * Lookup order (first hit wins):
     *   "<file>#<kind>|<key>"  e.g. "controls/Dock.tsx#jsx|Empty"   (file + jsx/string/template)
     *   "<file>|<key>"         e.g. "map/actions/live_map_actions/SegmentActions.tsx|segments"
     *   "<key>"
     * <file> is relative to frontend/src. Scoped keys resolve words that need different
     * translations in different places. A scoped null blocks the global entry.
     */
    function lookup(state, key, kind) {
        const dict = state.opts.dictionary || {};
        const file = relativeSourcePath(state.filename);
        const candidates = file ? [`${file}#${kind}|${key}`, `${file}|${key}`, key] : [key];

        for (const candidate of candidates) {
            if (Object.prototype.hasOwnProperty.call(dict, candidate)) {
                const value = dict[candidate];

                return typeof value === "string" && value.length > 0 ? value : undefined;
            }
        }

        return undefined;
    }

    function collect(state, path, kind, key, uiAttribute) {
        const loc = path.node.loc ? `${state.filename}:${path.node.loc.start.line}` : state.filename;

        state.opts.collect({
            key: key,
            kind: kind,
            ui: kind === "jsx" || uiAttribute || looksLikeUiText(key),
            location: loc
        });
    }

    return {
        name: "valetudo-translate",
        visitor: {
            JSXText(path, state) {
                const rendered = renderJsxText(path.node.value);
                const {lead, core, trail} = splitWhitespace(rendered);

                if (!core || !/[A-Za-z]/.test(core)) {
                    return;
                }
                const key = normalizeKey(core);

                if (state.opts.collect) {
                    collect(state, path, "jsx", key, true);

                    return;
                }

                const translation = lookup(state, key, "jsx");
                if (translation === undefined) {
                    return;
                }

                path.replaceWith(t.jsxExpressionContainer(t.stringLiteral(lead + translation + trail)));
                path.skip();
            },

            StringLiteral(path, state) {
                const {lead, core, trail} = splitWhitespace(path.node.value);

                if (!core) {
                    return;
                }
                const ctx = classifyContext(path);
                if (ctx.excluded) {
                    return;
                }
                const key = normalizeKey(core);

                if (state.opts.collect) {
                    collect(state, path, "string", key, ctx.uiAttribute);

                    return;
                }

                const translation = lookup(state, key, "string");
                if (translation === undefined) {
                    return;
                }

                const replacement = t.stringLiteral(lead + translation + trail);
                if (path.parentPath.isJSXAttribute()) {
                    path.replaceWith(t.jsxExpressionContainer(replacement));
                } else {
                    path.replaceWith(replacement);
                }
                path.skip();
            },

            TemplateLiteral(path, state) {
                if (path.parentPath.isTaggedTemplateExpression()) {
                    return;
                }
                const quasis = path.node.quasis;
                if (quasis.some(q => typeof q.value.cooked !== "string")) {
                    return;
                }
                const ctx = classifyContext(path);
                if (ctx.excluded) {
                    return;
                }

                const full = templateKey(quasis);
                const {lead, core, trail} = splitWhitespace(full);
                if (!core || !/[A-Za-z]{2,}/.test(core.replace(/\{\d+\}/g, ""))) {
                    return;
                }
                // Keys of multi-line templates (markdown help texts) keep their line breaks
                const key = core.includes("\n") ? core : normalizeKey(core);

                if (state.opts.collect) {
                    collect(state, path, "template", key, ctx.uiAttribute);

                    return;
                }

                const translation = lookup(state, key, "template");
                if (translation === undefined) {
                    return;
                }

                const expressions = path.node.expressions;
                // {n} = expression n, {n?then:else} = expression n must be a conditional; its test is
                // kept and the branches are replaced (for English plural suffixes like `minute${x ? "s" : ""}`)
                const parts = (lead + translation + trail).split(PLACEHOLDER_SPLIT_REGEX);
                const newQuasis = [];
                const newExpressions = [];
                const used = new Set();

                for (let i = 0; i < parts.length; i += 4) {
                    const cooked = parts[i];
                    const raw = cooked.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
                    newQuasis.push(t.templateElement({raw: raw, cooked: cooked}, i === parts.length - 1));

                    if (i + 1 >= parts.length) {
                        break;
                    }
                    const idx = parseInt(parts[i + 1], 10);
                    const thenBranch = parts[i + 2];
                    const elseBranch = parts[i + 3];
                    const expression = expressions[idx];

                    if (expression === undefined) {
                        throw path.buildCodeFrameError(`i18n: translation of "${key}" references unknown placeholder {${idx}}`);
                    }
                    if (thenBranch !== undefined) {
                        if (expression.type !== "ConditionalExpression") {
                            throw path.buildCodeFrameError(`i18n: translation of "${key}" uses {${idx}?..:..} but expression ${idx} is not a conditional`);
                        }
                        newExpressions.push(t.conditionalExpression(t.cloneNode(expression.test, true), t.stringLiteral(thenBranch), t.stringLiteral(elseBranch)));
                    } else {
                        newExpressions.push(used.has(idx) ? t.cloneNode(expression, true) : expression);
                    }
                    used.add(idx);
                }

                if (used.size !== expressions.length) {
                    // Dropping an expression could drop side effects or information. Refuse.
                    throw path.buildCodeFrameError(`i18n: translation of "${key}" does not use all placeholders`);
                }

                path.replaceWith(t.templateLiteral(newQuasis, newExpressions));
                path.skip();
            }
        }
    };
};

module.exports.normalizeKey = normalizeKey;
module.exports.relativeSourcePath = relativeSourcePath;
module.exports.renderJsxText = renderJsxText;
module.exports.looksLikeUiText = looksLikeUiText;
