/*
 * i18n fork (see AGENTS.md): full consumable names.
 *
 * Upstream composes the name as "<subtype> <type>" (utils.ts getConsumableName), which cannot produce
 * German compound nouns ("Hauptbürste"). The full English names below are translated by the build-time
 * plugin like any other string (i18n/<lang>/frontend.json), so translators see whole names.
 * Unknown combinations fall back to the upstream composition.
 */
import {I18N_CONFIG} from "./config";

const CONSUMABLE_NAMES: Record<string, string> = {
    "bin/dock": "Dock Bin",
    "brush/dock": "Dock Brush",
    "brush/main": "Main Brush",
    "brush/secondary": "Secondary Brush",
    "brush/side_right": "Right Brush",
    "brush/side_left": "Left Brush",
    "cleaning/sensor": "Sensor Cleaning",
    "cleaning/wheel": "Wheel Cleaning",
    "detergent/dock": "Dock Detergent",
    "filter/dock": "Dock Filter",
    "filter/main": "Main Filter",
    "filter/secondary": "Secondary Filter",
    "mop/all": "Mop Pads",
    "mop/main": "Main Mop",
};

export function getLocalizedConsumableName(type: string, subType?: string): string | undefined {
    if (!I18N_CONFIG) {
        return undefined;
    }

    return CONSUMABLE_NAMES[`${type}/${subType ?? "none"}`];
}
