/*
 * i18n fork (see AGENTS.md): build-time configuration, injected by i18n/webpack-i18n.js.
 * undefined in English (upstream) builds.
 */
declare const __VALETUDO_I18N__: {
    lang: string;
    backend: Record<string, string>;
    bergamot: { engineBaseUrl: string; registryUrl: string } | null;
} | undefined;

export const I18N_CONFIG = typeof __VALETUDO_I18N__ !== "undefined" ? __VALETUDO_I18N__ : undefined;
