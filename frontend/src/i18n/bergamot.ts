/*
 * i18n fork (see AGENTS.md): client side of the Bergamot (Mozilla offline machine translation) worker.
 *
 * The worker is only started when the first unknown backend message has to be translated.
 * It downloads the translation engine (~5 MB wasm) and the en->target model (~22 MB) once
 * and keeps them in IndexedDB. Translation itself runs fully offline in the browser.
 */
import {I18N_CONFIG} from "./config";

type Pending = { resolve: (text: string) => void, reject: (error: Error) => void };

const RESPONSE_TIMEOUT_MS = 5 * 60 * 1000;

let worker: Worker | undefined;
let failed = false;
let nextId = 1;
const pending = new Map<number, Pending>();
const memo = new Map<string, Promise<string>>();

export function isBergamotAvailable(): boolean {
    return !failed && !!I18N_CONFIG?.bergamot && typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";
}

function getWorker(): Worker {
    if (worker === undefined) {
        worker = new Worker(new URL("./bergamot.worker", import.meta.url));

        worker.addEventListener("message", (evt: MessageEvent) => {
            const {id, result, error, fatal} = evt.data ?? {};
            const request = pending.get(id);

            if (fatal) {
                failed = true;
            }
            if (!request) {
                return;
            }
            pending.delete(id);

            if (error !== undefined) {
                request.reject(new Error(error));
            } else {
                request.resolve(result);
            }
        });
        worker.addEventListener("error", (evt) => {
            failed = true;
            pending.forEach(p => {
                p.reject(new Error(evt.message || "Bergamot worker error"));
            });
            pending.clear();
        });
    }

    return worker;
}

export function bergamotTranslate(text: string): Promise<string> {
    if (!isBergamotAvailable()) {
        return Promise.reject(new Error("Bergamot is not available"));
    }

    let result = memo.get(text);
    if (result === undefined) {
        result = new Promise<string>((resolve, reject) => {
            const id = nextId++;
            // Last line of defense if the worker never answers (downloads have their own timeout)
            const timer = setTimeout(() => {
                if (pending.delete(id)) {
                    failed = true;
                    reject(new Error("Bergamot did not answer in time"));
                }
            }, RESPONSE_TIMEOUT_MS);

            pending.set(id, {
                resolve: (text) => {
                    clearTimeout(timer);
                    resolve(text);
                },
                reject: (error) => {
                    clearTimeout(timer);
                    reject(error);
                }
            });

            getWorker().postMessage({
                id: id,
                text: text,
                from: "en",
                to: I18N_CONFIG!.lang,
                engineBaseUrl: I18N_CONFIG!.bergamot!.engineBaseUrl,
                registryUrl: I18N_CONFIG!.bergamot!.registryUrl
            });
        });
        result.catch(() => {
            memo.delete(text);
        });
        memo.set(text, result);
    }

    return result;
}
