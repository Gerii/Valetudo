/*
 * i18n fork (see AGENTS.md): Bergamot translation worker.
 *
 * Valetudo's CSP only allows same-origin workers, so this worker is bundled by webpack and loads
 * the Emscripten glue + wasm of @browsermt/bergamot-translator from a CDN at runtime.
 * The model handling is a condensed port of worker/translator-worker.js from
 * @browsermt/bergamot-translator 0.4.9 (MPL-2.0, https://github.com/browsermt/bergamot-translator).
 *
 * Plain HTTP (the usual way Valetudo is accessed) is not a secure context, so neither the
 * Cache API nor crypto.subtle are guaranteed to exist. Downloads are cached in IndexedDB.
 */
const ctx: any = self;

const DB_NAME = "valetudo-i18n-bergamot";
const STORE = "files";

const GEMM_TO_FALLBACK_FUNCTIONS_MAP: Record<string, string> = {
    "int8_prepare_a": "int8PrepareAFallback",
    "int8_prepare_b": "int8PrepareBFallback",
    "int8_prepare_b_from_transposed": "int8PrepareBFromTransposedFallback",
    "int8_prepare_b_from_quantized_transposed": "int8PrepareBFromQuantizedTransposedFallback",
    "int8_prepare_bias": "int8PrepareBiasFallback",
    "int8_multiply_and_add_bias": "int8MultiplyAndAddBiasFallback",
    "int8_select_columns_of_b": "int8SelectColumnsOfBFallback"
};

interface Request {
    id: number;
    text: string;
    from: string;
    to: string;
    engineBaseUrl: string;
    registryUrl: string;
    timeoutMs?: number; // download timeout, only set by tests
}

function openDb(): Promise<IDBDatabase | undefined> {
    return new Promise((resolve) => {
        try {
            const req = indexedDB.open(DB_NAME, 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore(STORE);
            };
            req.onsuccess = () => {
                resolve(req.result);
            };
            req.onerror = () => {
                resolve(undefined);
            };
        } catch (e) {
            resolve(undefined);
        }
    });
}

async function idbGet(key: string): Promise<ArrayBuffer | undefined> {
    const db = await openDb();
    if (!db) {
        return undefined;
    }

    return new Promise((resolve) => {
        const req = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
        req.onsuccess = () => {
            resolve(req.result instanceof ArrayBuffer ? req.result : undefined);
        };
        req.onerror = () => {
            resolve(undefined);
        };
    });
}

async function idbPut(key: string, value: ArrayBuffer): Promise<void> {
    const db = await openDb();
    if (!db) {
        return;
    }

    return new Promise((resolve) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(value, key);
        tx.oncomplete = () => {
            resolve();
        };
        tx.onerror = () => {
            resolve();
        };
    });
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string | undefined> {
    if (!ctx.crypto?.subtle) {
        return undefined; // Not a secure context
    }
    const digest = await ctx.crypto.subtle.digest("SHA-256", buffer);

    return Array.from(new Uint8Array(digest)).map(b => {
        return b.toString(16).padStart(2, "0");
    }).join("");
}

const DEFAULT_DOWNLOAD_TIMEOUT_MS = 120_000;
const WASM_MAGIC = [0x00, 0x61, 0x73, 0x6d]; // "\0asm"

interface Expectation {
    sha256?: string;
    size?: number;
    wasm?: boolean;
}

async function idbDelete(key: string): Promise<void> {
    const db = await openDb();
    if (!db) {
        return;
    }

    return new Promise((resolve) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(key);
        tx.oncomplete = () => {
            resolve();
        };
        tx.onerror = () => {
            resolve();
        };
    });
}

async function idbClear(): Promise<void> {
    const db = await openDb();
    if (!db) {
        return;
    }

    return new Promise((resolve) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).clear();
        tx.oncomplete = () => {
            resolve();
        };
        tx.onerror = () => {
            resolve();
        };
    });
}

// Cheap sanity checks that also work without crypto.subtle (plain HTTP). They catch captive portals,
// proxies or error pages answering with "200 OK" and truncated downloads.
function findProblem(buffer: ArrayBuffer, expectation: Expectation): string | undefined {
    if (buffer.byteLength === 0) {
        return "empty file";
    }
    if (expectation.size !== undefined && buffer.byteLength !== expectation.size) {
        return `unexpected size ${buffer.byteLength} (expected ${expectation.size})`;
    }
    if (expectation.wasm) {
        const head = new Uint8Array(buffer, 0, Math.min(4, buffer.byteLength));
        if (!WASM_MAGIC.every((b, i) => {
            return head[i] === b;
        })) {
            return "not a WebAssembly file";
        }
    }

    return undefined;
}

// Downloads a file; the timeout covers the whole transfer, not just the response headers
async function download(url: string, timeoutMs: number): Promise<ArrayBuffer> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
        controller.abort();
    }, timeoutMs);

    try {
        const response = await fetch(url, {credentials: "omit", signal: controller.signal});
        if (!response.ok) {
            throw new Error(`Could not fetch ${url}: ${response.status}`);
        }

        return await response.arrayBuffer();
    } catch (e: any) {
        if (e?.name === "AbortError") {
            throw new Error(`Timeout after ${timeoutMs} ms while fetching ${url}`);
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }
}

async function fetchCached(url: string, expectation: Expectation, timeoutMs: number): Promise<ArrayBuffer> {
    const cached = await idbGet(url);
    if (cached) {
        if (findProblem(cached, expectation) === undefined) {
            return cached;
        }
        await idbDelete(url); // broken cache entry, download again
    }

    const buffer = await download(url, timeoutMs);
    const problem = findProblem(buffer, expectation);
    if (problem) {
        throw new Error(`Invalid download ${url}: ${problem}`);
    }
    if (expectation.sha256) {
        const actual = await sha256Hex(buffer);
        if (actual !== undefined && actual !== expectation.sha256) {
            throw new Error(`Checksum mismatch for ${url}`);
        }
    }

    await idbPut(url, buffer);

    return buffer;
}

function loadModule(engineBaseUrl: string, timeoutMs: number): Promise<any> {
    return new Promise((resolve, reject) => {
        fetchCached(engineBaseUrl + "bergamot-translator-worker.wasm", {wasm: true}, timeoutMs).then((wasm) => {
            const Module: any = {
                instantiateWasm: (info: any, accept: (instance: WebAssembly.Instance) => void) => {
                    const gemm = Object.fromEntries(Object.entries(GEMM_TO_FALLBACK_FUNCTIONS_MAP).map(([key, name]) => {
                        return [key, (...args: Array<any>) => {
                            return ctx.Module["asm"][name](...args);
                        }];
                    }));

                    WebAssembly.instantiate(wasm, {...info, "wasm_gemm": gemm}).then(({instance}) => {
                        accept(instance);
                    }).catch(reject);

                    return {};
                },
                onRuntimeInitialized: () => {
                    resolve(ctx.Module);
                },
                print: () => {
                    // silence
                },
                printErr: (msg: string) => {
                    // eslint-disable-next-line no-console
                    console.debug("bergamot:", msg);
                }
            };

            // Emscripten glue code picks up the global Module object
            ctx.Module = Module;
            ctx.importScripts(engineBaseUrl + "bergamot-translator-worker.js");
        }).catch(reject);
    });
}

function toConfigString(config: Record<string, string>): string {
    return Object.entries(config).map(([key, value]) => {
        return `${key}: ${value}\n`;
    }).join("");
}

function alignedMemory(module: any, buffer: ArrayBuffer, alignment: number): any {
    const bytes = new Int8Array(buffer);
    const memory = new module.AlignedMemory(bytes.byteLength, alignment);
    memory.getByteArrayView().set(bytes);

    return memory;
}

async function loadModel(module: any, request: Request, timeoutMs: number): Promise<any> {
    const registry = JSON.parse(new TextDecoder().decode(await download(request.registryUrl, timeoutMs)));
    const files = registry[`${request.from}${request.to}`];
    if (!files) {
        throw new Error(`No Bergamot model for ${request.from} -> ${request.to}`);
    }
    const get = (file: { name: string, size?: number, expectedSha256Hash?: string } | undefined) => {
        return file ? fetchCached(file.name, {size: file.size, sha256: file.expectedSha256Hash}, timeoutMs) : undefined;
    };

    const [model, lex, vocab, srcvocab, trgvocab] = await Promise.all([
        get(files.model),
        get(files.lex),
        get(files.vocab),
        get(files.srcvocab),
        get(files.trgvocab),
    ]);
    if (!model || !lex || !(vocab || (srcvocab && trgvocab))) {
        throw new Error(`Incomplete Bergamot model registry entry for ${request.from} -> ${request.to}`);
    }

    const vocabs = new module.AlignedMemoryList();
    (vocab ? [vocab] : [srcvocab!, trgvocab!]).forEach(v => {
        vocabs.push_back(alignedMemory(module, v, 64));
    });

    const config: Record<string, string> = {
        "beam-size": "1",
        "normalize": "1.0",
        "word-penalty": "0",
        "cpu-threads": "0",
        "gemm-precision": files.model.name.endsWith("intgemm8.bin") ? "int8shiftAll" : "int8shiftAlphaAll",
        "skip-cost": "true",
        "alignment": "soft",
        "quiet": "true",
        "quiet-translation": "true",
        "max-length-break": "128",
        "mini-batch-words": "1024",
        "workspace": "128",
        "max-length-factor": "2.0",
    };

    return new module.TranslationModel(
        toConfigString(config),
        alignedMemory(module, model, 256),
        alignedMemory(module, lex, 64),
        vocabs,
        null
    );
}

let engine: Promise<{ module: any, service: any, model: any }> | undefined;

function getEngine(request: Request) {
    if (engine === undefined) {
        const timeoutMs = request.timeoutMs ?? DEFAULT_DOWNLOAD_TIMEOUT_MS;

        engine = (async () => {
            const module = await loadModule(request.engineBaseUrl, timeoutMs);
            const service = new module.BlockingService({cacheSize: 0});
            const model = await loadModel(module, request, timeoutMs);

            return {module: module, service: service, model: model};
        })();
    }

    return engine;
}

async function translate(request: Request): Promise<string> {
    const {module, service, model} = await getEngine(request);

    const input = new module.VectorString();
    input.push_back(request.text);
    const options = new module.VectorResponseOptions();
    options.push_back({alignment: false, html: false, qualityScores: false});

    const responses = service.translate(model, input, options);
    const result = responses.get(0).getTranslatedText();

    input.delete();
    options.delete();
    responses.delete();

    return result;
}

ctx.addEventListener("message", (evt: MessageEvent) => {
    const request: Request = evt.data;

    translate(request).then((result) => {
        ctx.postMessage({id: request.id, result: result});
    }).catch(async (e: any) => {
        // Failures are permanent for this session (an aborted wasm module can't be reused).
        // The cache might be the cause, e.g. a corrupt model of plausible size, which only fails
        // on the first translation. Clear it so the next page load starts from scratch.
        await idbClear();
        ctx.postMessage({id: request.id, error: String(e?.message ?? e), fatal: true});
    });
});

export {};
