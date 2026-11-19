# i18n: German translation for Valetudo

The build-time and runtime translation layer of this fork. See [`../AGENTS.md`](../AGENTS.md) for how it works
and for the steps to follow on each new upstream release.

```sh
npm ci
VALETUDO_LANG=de npm run build          # German frontend + backend build (or: npm run build_de)
node i18n/scripts/extract.mjs           # what needs translating -> i18n/de/missing.json
node i18n/scripts/check.mjs             # fails if anything is untranslated or stale
```

| Path | Purpose |
|---|---|
| `de/frontend.json` | UI strings, `"English": "Deutsch"` (`null` = do not translate) |
| `de/backend.json` | Messages from backend/robot, `{0}` placeholders match any text |
| `de/overrides/` | German copies of `frontend/src/**/res/*.ts` help texts |
| `de/glossary.md` | Terminology and translation rules |
| `babel-plugin-translate.js` | Replaces UI strings at build time |
| `webpack-i18n.js` | Hooks the above into the upstream webpack config |
| `../frontend/src/i18n/` | Runtime: backend message lookup + Bergamot offline machine translation |

## Manual test

```sh
# config: copy backend/lib/res/default_config.json and set
#   "embedded": false, "robot": {"implementation": "MockValetudoRobot", ...}
npm run generate_code --workspace=backend          # once, generates the gitignored protobuf code
cd backend && VALETUDO_CONFIG_PATH=/path/to/config.json npm start
```

Then open http://127.0.0.1:8080. The mock robot raises error and dust-bin events.
Known messages appear in plain German. To see Bergamot's output, temporarily remove a key from `de/backend.json`:
the message then appears as `German (English)`. The first time, it takes a while to download the ~27 MB engine and model.

## Manual install on a robot

Needed for the first switch from upstream to the German build, and for builds that the updater does not offer
(same version as already installed). Pick the binary for your robot (see the supported robots page in `docs/`):
`aarch64`, `armv7` or `armv7-lowmem`; use the `.upx` variant only if the robot is short on storage.

```sh
# Dreame / Mova (binary at /data/valetudo)
scp -O build/aarch64/valetudo root@<robot-ip>:/data/valetudo.new
ssh root@<robot-ip> 'killall valetudo; mv /data/valetudo.new /data/valetudo && chmod +x /data/valetudo && reboot'

# Roborock (binary at /mnt/data/valetudo, init script)
ssh root@<robot-ip> /etc/init/S11valetudo stop
#   ...copy the binary as above, then:
ssh root@<robot-ip> /etc/init/S11valetudo start
```

Never overwrite the running binary in place ("Text file busy"): copy it under a new name and rename it.
`scp -O` is needed because the robots' SSH server usually has no SFTP support.
