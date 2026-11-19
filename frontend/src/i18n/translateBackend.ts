/*
 * i18n fork (see AGENTS.md): runtime translation of messages coming from the backend/robot.
 *
 * 1. Dictionary lookup (i18n/<lang>/backend.json, injected at build time): exact match, then
 *    pattern entries with {0}, {1}, ... placeholders. Shown as plain translation.
 * 2. Unknown messages: offline machine translation with Mozilla Bergamot in a web worker.
 *    Shown as "Translation (Original)".
 * 3. English build or nothing available: the original message.
 */
import {bergamotTranslate, isBergamotAvailable} from "./bergamot";
import {I18N_CONFIG} from "./config";

interface Pattern {
    regex: RegExp;
    placeholders: Array<number>;
    translation: string;
    literalLength: number;
}

const PLACEHOLDER_REGEX = /\{(\d+)\}/g;

let patterns: Array<Pattern> | undefined;

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getPatterns(): Array<Pattern> {
    if (patterns === undefined) {
        patterns = [];

        for (const [key, translation] of Object.entries(I18N_CONFIG?.backend ?? {})) {
            if (!/\{\d+\}/.test(key)) {
                continue;
            }
            const placeholders: Array<number> = [];
            const regexSource = key.split(PLACEHOLDER_REGEX).map((part, i) => {
                if (i % 2 === 1) {
                    placeholders.push(parseInt(part, 10));

                    return "([\\s\\S]*?)";
                }

                return escapeRegex(part);
            }).join("");

            patterns.push({
                regex: new RegExp(`^${regexSource}$`),
                placeholders: placeholders,
                translation: translation,
                literalLength: key.replace(PLACEHOLDER_REGEX, "").length
            });
        }

        // Most specific patterns first
        patterns.sort((a, b) => {
            return b.literalLength - a.literalLength;
        });
    }

    return patterns;
}

function normalize(text: string): string {
    return text.replace(/[ \t\r\n]+/g, " ").trim();
}

// Dictionary-only translation. Returns undefined if the message is unknown.
export function translateBackendSync(text: string, depth: number = 0): string | undefined {
    const dictionary = I18N_CONFIG?.backend;
    if (!dictionary || !text) {
        return undefined;
    }
    const key = normalize(text);

    if (Object.prototype.hasOwnProperty.call(dictionary, key)) {
        return dictionary[key];
    }

    for (const pattern of getPatterns()) {
        const match = pattern.regex.exec(key);

        if (match) {
            const values: Record<number, string> = {};
            pattern.placeholders.forEach((placeholder, i) => {
                const value = match[i + 1];
                // Nested messages (e.g. "Error while doing X: <inner error>") get translated as well
                values[placeholder] = (depth < 2 ? translateBackendSync(value, depth + 1) : undefined) ?? value;
            });

            return pattern.translation.replace(PLACEHOLDER_REGEX, (_, idx) => {
                return values[parseInt(idx, 10)] ?? "";
            });
        }
    }

    return undefined;
}

export type BackendTranslation = { text: string, source: "dictionary" | "machine" | "original" };

// Returns the dictionary translation if there is one, otherwise the original.
export function translateBackendSyncOrOriginal(text: string): BackendTranslation {
    const translated = translateBackendSync(text);

    if (translated !== undefined) {
        return {text: translated, source: "dictionary"};
    }

    return {text: text, source: "original"};
}

function worthMachineTranslating(text: string): boolean {
    const trimmed = text.trim();

    // Needs some actual words, identifiers like "error_42" or "XCapability" are not worth it
    return /[A-Za-z]{3,}/.test(trimmed) && (/\s/.test(trimmed) || !/^[A-Za-z0-9_.:-]+$/.test(trimmed));
}

// Full translation: dictionary, then Bergamot. Never rejects.
export async function translateBackend(text: string): Promise<BackendTranslation> {
    const sync = translateBackendSyncOrOriginal(text);

    if (sync.source === "dictionary" || !text || !isBergamotAvailable() || !worthMachineTranslating(text)) {
        return sync;
    }

    try {
        const machine = await bergamotTranslate(text);

        if (machine && machine.trim() !== text.trim()) {
            return {text: machine, source: "machine"};
        }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("i18n: machine translation failed", e);
    }

    return sync;
}

// Display format: dictionary -> translation, machine -> "translation (original)", else original
export function formatBackendTranslation(original: string, translation: BackendTranslation): string {
    if (translation.source === "machine") {
        return `${translation.text} (${original})`;
    }

    return translation.text;
}
