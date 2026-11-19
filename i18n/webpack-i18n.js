/*
 * Wraps the upstream webpack config factory (frontend/config/webpack.config.js) and, if
 * VALETUDO_LANG is set to a language other than "en", adds
 *   - the build-time string translation (babel-plugin-translate.js)
 *   - whole-file overrides for src/**\/res/*.ts (i18n/<lang>/overrides/<same path>)
 *   - <html lang="..."> in index.html
 *   - the backend message dictionary + Bergamot settings for the runtime (__VALETUDO_I18N__)
 *
 * Without VALETUDO_LANG the config is returned untouched, apart from defining
 * __VALETUDO_I18N__ as undefined.
 */
"use strict";

const fs = require("fs");
const path = require("path");

const I18N_DIR = __dirname;
const DEFAULT_BERGAMOT = {
    // Emscripten glue + wasm of @browsermt/bergamot-translator (MPL-2.0), loaded on demand only
    engineBaseUrl: "https://cdn.jsdelivr.net/npm/@browsermt/bergamot-translator@0.4.9/worker/",
    // Model registry used by the bergamot-translator npm package (Mozilla/Bergamot project models)
    registryUrl: "https://bergamot.s3.amazonaws.com/models/index.json"
};

function readJson(file, fallback) {
    if (!fs.existsSync(file)) {
        return fallback;
    }

    return JSON.parse(fs.readFileSync(file, "utf-8"));
}

/**
 * Loads a dictionary and drops the entries without translation (null / "")
 *
 * @param {string} file
 * @returns {Record<string, string>}
 */
function loadDictionary(file) {
    const raw = readJson(file, {});
    const out = {};

    for (const [k, v] of Object.entries(raw)) {
        if (!k.startsWith("$") && typeof v === "string" && v.length > 0) {
            out[k] = v;
        }
    }

    return out;
}

function findRule(rules, predicate) {
    for (const rule of rules) {
        if (!rule) {
            continue;
        }
        if (predicate(rule)) {
            return rule;
        }
        if (Array.isArray(rule.oneOf)) {
            const found = findRule(rule.oneOf, predicate);
            if (found) {
                return found;
            }
        }
    }

    return undefined;
}

class HtmlLangPlugin {
    constructor(lang) {
        this.lang = lang;
    }

    apply(compiler) {
        const HtmlWebpackPlugin = require("html-webpack-plugin");

        compiler.hooks.compilation.tap("ValetudoHtmlLangPlugin", (compilation) => {
            HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tap("ValetudoHtmlLangPlugin", (data) => {
                data.html = data.html.replace(/<html lang="[^"]*"/, `<html lang="${this.lang}"`);

                return data;
            });
        });
    }
}

class ResOverridePlugin {
    constructor(srcDir, overridesDir) {
        this.srcDir = srcDir;
        this.overridesDir = overridesDir;
    }

    apply(compiler) {
        compiler.hooks.normalModuleFactory.tap("ValetudoResOverridePlugin", (nmf) => {
            nmf.hooks.afterResolve.tap("ValetudoResOverridePlugin", (resolveData) => {
                const createData = resolveData.createData;
                const resource = createData && createData.resource;
                if (!resource) {
                    return;
                }
                const rel = path.relative(this.srcDir, resource);
                if (rel.startsWith("..") || path.isAbsolute(rel) || !rel.split(path.sep).includes("res")) {
                    return;
                }
                const override = path.join(this.overridesDir, rel);
                if (!fs.existsSync(override)) {
                    return;
                }

                createData.resource = override;
                createData.request = createData.request.replace(resource, override);
                createData.userRequest = createData.userRequest.replace(resource, override);
                if (createData.resourceResolveData) {
                    createData.resourceResolveData.path = override;
                }
            });
        });
    }
}

module.exports = function wrapWebpackConfigFactory(factory) {
    return function (webpackEnv) {
        const config = factory(webpackEnv);
        const webpack = require("webpack");
        const lang = (process.env.VALETUDO_LANG || "en").toLowerCase();

        if (lang === "en") {
            config.plugins.push(new webpack.DefinePlugin({__VALETUDO_I18N__: "undefined"}));

            return config;
        }

        const langDir = path.join(I18N_DIR, lang);
        if (!fs.existsSync(langDir)) {
            throw new Error(`VALETUDO_LANG=${lang} but ${langDir} does not exist`);
        }

        const frontendDictionary = loadDictionary(path.join(langDir, "frontend.json"));
        const backendDictionary = loadDictionary(path.join(langDir, "backend.json"));
        const overridesDir = path.join(langDir, "overrides");

        const babelRule = findRule(config.module.rules, (rule) => {
            return typeof rule.loader === "string" && rule.loader.includes("babel-loader") && rule.include && rule.options && rule.options.presets &&
                JSON.stringify(rule.options.presets).includes("babel-preset-react-app") && !JSON.stringify(rule.options.presets).includes("dependencies");
        });
        if (!babelRule) {
            throw new Error("i18n: could not find the babel-loader rule for the frontend sources in the webpack config");
        }
        const srcDir = Array.isArray(babelRule.include) ? babelRule.include[0] : babelRule.include;

        babelRule.include = [srcDir, overridesDir];
        babelRule.options.plugins = (babelRule.options.plugins || []).concat([
            [require.resolve("./babel-plugin-translate.js"), {dictionary: frontendDictionary}]
        ]);
        // The dictionary is not part of babel-loader's cache key. Keep it simple and correct.
        babelRule.options.cacheDirectory = false;

        config.plugins.push(
            new ResOverridePlugin(srcDir, overridesDir),
            new HtmlLangPlugin(lang),
            new webpack.DefinePlugin({
                __VALETUDO_I18N__: JSON.stringify({
                    lang: lang,
                    backend: backendDictionary,
                    bergamot: process.env.VALETUDO_BERGAMOT === "off" ? null : {
                        engineBaseUrl: process.env.VALETUDO_BERGAMOT_ENGINE_URL || DEFAULT_BERGAMOT.engineBaseUrl,
                        registryUrl: process.env.VALETUDO_BERGAMOT_REGISTRY_URL || DEFAULT_BERGAMOT.registryUrl,
                    }
                })
            })
        );

        return config;
    };
};

module.exports.loadDictionary = loadDictionary;
