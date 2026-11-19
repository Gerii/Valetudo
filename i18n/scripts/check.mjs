/*
 * Fails (exit code 1) if anything is untranslated, stale or broken. Run before building a release.
 *
 * Usage: node i18n/scripts/check.mjs [--lang de]
 */
import {analyze, rel} from "./lib.mjs";

const args = process.argv.slice(2);
const lang = args.includes("--lang") ? args[args.indexOf("--lang") + 1] : "de";
const result = analyze(lang);
const problems = [];

Object.entries(result.missingFrontend).forEach(([k, v]) => {
    problems.push(`missing frontend: ${JSON.stringify(k)} (${v.locations[0]})`);
});
Object.entries(result.missingBackend).forEach(([k, v]) => {
    problems.push(`missing backend: ${JSON.stringify(k)} (${v.locations[0]})`);
});
result.overrides.textResources.filter(r => r.status !== "ok").forEach(r => {
    problems.push(`${r.status} override: ${rel(r.override)} (upstream-sha256: ${r.hash})`);
});
result.overrides.orphanedOverrides.forEach(o => {
    problems.push(`orphaned override: ${rel(o)}`);
});
result.placeholderErrors.forEach(e => {
    problems.push(`placeholder mismatch: ${e}`);
});

const unused = result.unusedFrontend.length + result.unusedBackend.length;

if (problems.length) {
    console.log(problems.join("\n"));
    console.log(`\n${problems.length} problem(s). Run "node i18n/scripts/extract.mjs" and see AGENTS.md.`);
    process.exit(1);
}
console.log(`i18n/${lang}: OK${unused ? ` (${unused} unused dictionary keys, remove with extract.mjs --prune)` : ""}`);
