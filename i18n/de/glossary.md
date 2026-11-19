# German glossary and translation rules

Used by everyone (human or LLM) translating `missing.json` into `frontend.json` / `backend.json`
and the files in `overrides/`. Consistency beats creativity.

## Tone

- Address the user with **"du"** (informal), lowercase ("du", "dein"), as Valetudo's English is casual.
- Keep Valetudo's dry humour and jokes; translate their meaning, don't make them formal.
- UI labels are short. Prefer "Speichern" over "Konfiguration jetzt speichern" if the English is short.
- Use German typographic quotes „…“ only where the English uses quotes as prose; keep `"` / `'` where they
  are part of composed strings (fragments).

## Technical rules

1. **Placeholders**: `{0}`, `{1}`, … must all appear in the translation, order may change.
   Plural/choice: if the English is something like `{0} minute{1} ago` where `{1}` is a conditional
   (`x !== 1 ? "s" : ""`), write `vor {0} {1?Minuten:Minute}` — the condition of expression `{1}` is kept,
   `?then:else` replace its two branches. Check the source location to see what the expression is.
   Choice text may not contain `:`, `{` or `}`.
2. **Fragments**: Some keys are fragments of a sentence that is composed in code (e.g. `Add (`, `' be called?`).
   Look at the source location and translate so that the composed result reads well. Keep the punctuation
   that glues them together (parentheses, quotes, trailing colon).
3. **Scoped keys** (frontend only): when one English word needs different translations in different places,
   use `"<path below frontend/src>|<key>"` or `"<path>#jsx|<key>"` / `#string` / `#template`. These win over the plain key.
4. **`null` = not user-visible / do not translate**. Use it for CSS values, SVG, ids, class/type names
   (`CarpetMapStructure`, `StateAttributesUpdated`), URLs, routes (`robot/*`), file names, the bad-words filter
   list in `valetudo/res/Badwords.ts`, version strings, and anything where a translation could break logic.
   If unsure, read the source location. A wrong translation of a technical string can break the UI.
5. Proper names stay: Valetudo, Valetudo Genuine Advantage, MQTT, NTP, Home Assistant, Wi-Fi SSID, TLS,
   Swagger UI, GoldSrc, CCCongress, Hypfer, product/brand names.
6. Markdown, HTML tags, `<br/>`, code spans and URLs in texts are kept as-is.
7. Units and abbreviations: `GiB`, `MiB`, `KiB`, `dBm`, `ms` stay; `bytes` → `Bytes`.
8. Keep the trailing `…` / `...` / `:` / `?` / `!` of the English.

## Terms

| English | Deutsch |
|---|---|
| robot / vacuum robot | Roboter / Saugroboter |
| dock | Station |
| auto-empty (dock) | Absaugstation / automatische Entleerung |
| mop (noun) / mopping | Mopp / Wischen |
| vacuum (verb) / vacuuming | saugen / Saugen |
| Vacuum & Mop / Vacuum then Mop | Saugen & Wischen / Erst saugen, dann wischen |
| cleanup / cleaning | Reinigung |
| full cleanup | Komplettreinigung |
| segment | Bereich (der Bereich, die Bereiche; may be a room or not). Never "Segment", except in code identifiers like `segment_ids` |
| zone | Zone |
| no-go area / no-mop area | Sperrzone / Wisch-Sperrzone |
| virtual wall | virtuelle Wand |
| virtual restrictions | virtuelle Begrenzungen |
| map / live map | Karte / Live-Karte |
| persistent map | persistente Karte |
| mapping pass | Kartierungsfahrt |
| map annotations | Kartenanmerkungen |
| go to (location) | Fahre zu (Position) |
| locate robot | Roboter orten |
| consumable | Verbrauchsmaterial |
| main brush / side brush / filter | Hauptbürste / Seitenbürste / Filter |
| dust bin / dustbag | Staubbehälter / Staubbeutel |
| freshwater / wastewater tank | Frischwassertank / Schmutzwassertank |
| detergent | Reinigungsmittel |
| fan speed / fan | Saugstärke / Saugleistung |
| water grade / water | Wassermenge / Wasser |
| operation mode / mode | Modus |
| preset | Voreinstellung |
| Off / Min / Low / Medium / High / Max / Turbo | Aus / Min / Niedrig / Mittel / Hoch / Max / Turbo |
| Quiet | Leise |
| carpet / carpet mode | Teppich / Teppichmodus |
| obstacle avoidance | Hindernisvermeidung |
| obstacle images | Hindernisbilder |
| voice pack | Sprachpaket |
| speaker / volume | Lautsprecher / Lautstärke |
| Do not disturb | Bitte nicht stören |
| quirks | Quirks (Valetudo term, keep) |
| capability | Funktion (in technical messages: Capability) |
| timer / pre-action | Timer / Vorab-Aktion |
| events | Ereignisse |
| updater / update channel | Updater / Update-Kanal |
| settings / options | Einstellungen / Optionen |
| connectivity | Konnektivität |
| Wi-Fi | WLAN |
| network advertisement | Netzwerk-Ankündigung |
| friendly name | Anzeigename |
| attachments | Zubehör |
| statistics / achievements | Statistiken / Erfolge |
| manual control | Manuelle Steuerung |
| battery | Akku |
| docked / charging | angedockt / lädt |
| idle / paused / returning / error | bereit / pausiert / kehrt zurück / Fehler |
| reset | Zurücksetzen |
| dismiss | Verwerfen |
| apply | Übernehmen |
| Start / Stop / Pause / Resume / Home | Start / Stopp / Pause / Fortsetzen / Zur Station |
