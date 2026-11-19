/*
 * Translates i18n/<lang>/missing.json with Claude and merges the result into
 * frontend.json / backend.json. Stale/missing overrides are translated as whole files.
 *
 * Alternative without an API key: ask Claude Code (or any coding agent) to do it, see AGENTS.md.
 *
 * Usage:
 *   npm install --no-save @anthropic-ai/sdk     (kept out of package.json on purpose, see AGENTS.md)
 *   node i18n/scripts/extract.mjs
 *   node i18n/scripts/llm-fill.mjs [--lang de] [--only frontend|backend|overrides] [--batch 150]
 *
 * Credentials are resolved by the SDK (ANTHROPIC_API_KEY, or an `ant auth login` profile).
 * Review the resulting git diff before committing.
 */
import fs from "node:fs";
import path from "node:path";
import {I18N_DIR, REPO_DIR, readJson, sha256, writeJson} from "./lib.mjs";

const MODEL = "claude-opus-5-5";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
    return args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
};
const lang = opt("--lang", "de");
const only = opt("--only", undefined);
const batchSize = parseInt(opt("--batch", "150"), 10);
const langDir = path.join(I18N_DIR, lang);

let Anthropic;
try {
    Anthropic = (await import("@anthropic-ai/sdk")).default;
} catch (e) {
    console.error("@anthropic-ai/sdk is not installed. Run: npm install --no-save @anthropic-ai/sdk");
    process.exit(1);
}
const client = new Anthropic();

const glossary = fs.readFileSync(path.join(langDir, "glossary.md"), "utf-8");
const missing = readJson(path.join(langDir, "missing.json"), undefined);
if (!missing) {
    console.error(`${path.join(langDir, "missing.json")} not found. Run extract.mjs first.`);
    process.exit(1);
}

const SYSTEM = `You translate the user interface of Valetudo (a self-hosted web UI for vacuum robots) from English to the language "${lang}".
Follow these rules and this glossary strictly:

${glossary}`;

const TRANSLATION_SCHEMA = {
    type: "object",
    properties: {
        translations: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    key: {type: "string"},
                    value: {anyOf: [{type: "string"}, {type: "null"}]}
                },
                required: ["key", "value"],
                additionalProperties: false
            }
        }
    },
    required: ["translations"],
    additionalProperties: false
};

async function ask(content, schema) {
    const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 64000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: {
            effort: "high",
            ...(schema ? {format: {type: "json_schema", schema: schema}} : {})
        },
        system: SYSTEM,
        messages: [{role: "user", content: content}]
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
        throw new Error(`Request was refused: ${message.stop_details?.explanation ?? "no details"}`);
    }
    if (message.stop_reason === "max_tokens") {
        throw new Error("Response hit max_tokens, use a smaller --batch");
    }

    return message.content.filter(b => {
        return b.type === "text";
    }).map(b => {
        return b.text;
    }).join("");
}

function placeholderSet(str) {
    return (str.replace(/\{(\d+)\?[^:{}]*:[^{}]*\}/g, "{$1}").match(/\{\d+\}/g) || [])
        .filter((x, i, arr) => {
            return arr.indexOf(x) === i;
        }).sort().join();
}

function readSource(location) {
    const [file, line] = location.split(":");
    const full = path.join(REPO_DIR, file);
    if (!fs.existsSync(full)) {
        return "";
    }
    const lines = fs.readFileSync(full, "utf-8").split("\n");
    const n = parseInt(line, 10) - 1;

    return lines.slice(Math.max(0, n - 3), n + 4).join("\n");
}

async function translateEntries(kind, entries) {
    const dictPath = path.join(langDir, `${kind}.json`);
    const keys = Object.keys(entries);
    const notes = kind === "backend" ?
        "These are backend messages. The {n?then:else} choice syntax is NOT available; every {n} of the key must appear in the value." :
        "These are frontend strings, replaced at build time by exact match.";

    for (let i = 0; i < keys.length; i += batchSize) {
        const batch = keys.slice(i, i + batchSize);
        const items = batch.map(key => {
            const loc = entries[key].locations[0];

            return {key: key, kind: entries[key].kind, location: loc, context: readSource(loc)};
        });

        console.log(`${kind}: translating ${i + 1}-${i + batch.length} of ${keys.length}`);
        const text = await ask(
            `${notes}\nTranslate every item. Return each key exactly as given with its translation, or null if it must not be translated.\n\n${JSON.stringify(items, null, 1)}`,
            TRANSLATION_SCHEMA
        );
        const result = JSON.parse(text).translations;

        const dict = readJson(dictPath, {});
        let added = 0;
        for (const {key, value} of result) {
            if (!batch.includes(key)) {
                console.warn(`  ignoring unknown key ${JSON.stringify(key)}`);
                continue;
            }
            if (typeof value === "string" && placeholderSet(value) !== placeholderSet(key)) {
                console.warn(`  placeholder mismatch, skipped: ${JSON.stringify(key)} -> ${JSON.stringify(value)}`);
                continue;
            }
            dict[key] = value;
            added++;
        }
        writeJson(dictPath, Object.fromEntries(Object.entries(dict).sort(([a], [b]) => {
            return a.localeCompare(b);
        })));
        console.log(`  merged ${added}/${batch.length}`);
    }
}

async function translateOverrides(overrides) {
    for (const o of overrides) {
        const source = path.join(REPO_DIR, o.source);
        const override = path.join(REPO_DIR, o.override);
        const previous = fs.existsSync(override) ? fs.readFileSync(override, "utf-8") : undefined;

        console.log(`override: ${o.override} (${o.status})`);
        let prompt = "Translate the human-readable text in this TypeScript file. It must stay a drop-in replacement: same exports, names and code; only prose inside string/template literals changes. Keep markdown, HTML tags, ${...} expressions, links and code spans. Answer with the complete file content only, no code fences.\n\n" +
            fs.readFileSync(source, "utf-8");
        if (previous) {
            prompt += `\n\nThe previous translation (of an older version of the English file) is below. Reuse its wording where the English did not change:\n\n${previous}`;
        }

        let content = (await ask(prompt)).trim().replace(/^```[a-z]*\n/, "").replace(/\n```$/, "");
        content = content.replace(/^\/\/ upstream-sha256: .*\n/, "");
        fs.mkdirSync(path.dirname(override), {recursive: true});
        fs.writeFileSync(override, `// upstream-sha256: ${sha256(source)}\n${content}\n`);
    }
}

if (!only || only === "frontend") {
    await translateEntries("frontend", missing.frontend);
}
if (!only || only === "backend") {
    await translateEntries("backend", missing.backend);
}
if (!only || only === "overrides") {
    await translateOverrides(missing.overrides);
}
console.log("Done. Run extract.mjs again, review the git diff, then build.");
