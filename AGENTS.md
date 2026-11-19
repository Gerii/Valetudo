# AGENTS.md: German Valetudo fork

This repository is a fork of [Valetudo](https://github.com/Hypfer/Valetudo). It adds a **German web UI**.
Upstream does not want i18n, so the translation is kept as a small patch set and rebased onto every
upstream release. Your main job here is usually to **update the fork to a new upstream release**.

## How it works (read before changing anything)

- **Never translate by editing upstream source files.** Upstream sources stay English. Translations live in `i18n/`.
  Translations are applied at build time and only when `VALETUDO_LANG=de` is set. Without it, the build is plain upstream.
- `i18n/babel-plugin-translate.js` replaces a string literal, JSX text or template literal in `frontend/src`
  with its translation from `i18n/de/frontend.json` when its text exactly matches a key there.
  Technical positions are never replaced: comparisons, object keys, `className` and similar.
  A value of `null` means "known, intentionally not translated".
- Help and markdown texts in `frontend/src/**/res/*.ts` are replaced as whole files by
  `i18n/de/overrides/<same path>`. The first line of each override is `// upstream-sha256: <hash of the English file>`.
  It tells us when the English file has changed and the override is stale.
- Messages from the backend or robot are translated at runtime by `frontend/src/i18n/`:
  - The dictionary `i18n/de/backend.json` is checked first: an exact key match, then a key with `{0}` placeholders.
    A dictionary match is shown as plain German.
  - Messages the dictionary doesn't know are translated offline in the browser by Mozilla Bergamot.
    The engine and model are downloaded from a CDN on first use and cached in IndexedDB. These messages are shown as `German (English original)`.
    If Bergamot fails (offline, timeout after 120 s, a captive portal answering instead of the CDN, a corrupt model),
    the English original is shown, the cache in IndexedDB is cleared, and Bergamot isn't tried again until the page is reloaded.
    Downloads are checked against the registry's file sizes and the wasm magic bytes. SHA-256 is only checked in secure contexts (HTTPS).
    Disable Bergamot with `VALETUDO_BERGAMOT=off`. Override its URLs with `VALETUDO_BERGAMOT_ENGINE_URL` / `VALETUDO_BERGAMOT_REGISTRY_URL`.
- `i18n/webpack-i18n.js` wires all of this into the upstream webpack config.

### Upstream files touched by the fork (the only places a rebase can conflict)

| File | Change | On conflict |
|---|---|---|
| `frontend/config/webpack.config.js` | 2 lines at the end: `module.exports = require("../../i18n/webpack-i18n.js")(module.exports);` | Re-append them at the very end |
| `frontend/src/components/ValetudoEventControls.tsx` | event `message`/`description` wrapped in `<BackendText text={…}/>` | Re-wrap the fields that come from the backend; keep the frontend strings as plain JSX |
| `frontend/src/robot/capabilities/Quirks.tsx` | quirk title, description, option label wrapped in `<BackendText/>` | Only the *displayed* text gets wrapped, never `value={o}` |
| `frontend/src/valetudo/Updater.tsx` | `state.message` wrapped | same |
| `frontend/src/options/connectivity/NTPConnectivityPage.tsx` | `status.state.message` wrapped | same |
| `frontend/src/controls/RobotStatus.tsx` | `status.value` / `status.flag` wrapped in `<BackendText/>` (raw enum values) | same |
| `frontend/src/controls/Dock.tsx` | `{dockState}` wrapped in `<BackendText/>` | same |
| `frontend/src/utils.ts` | `getConsumableName` first asks `getLocalizedConsumableName()` (`frontend/src/i18n/consumableNames.ts`), because German needs compound nouns ("Hauptbürste") | Re-add the 4 lines at the top of the function. If upstream adds consumable type/subtype pairs, add their full English name to `consumableNames.ts` |
| `frontend/src/api/hooks.ts` | `useOnCommandError`: `enqueueSnackbar(backendMessage(\`…${capability}:\n\`, errorMessage), …)` | Keep the English template as the first argument |
| `frontend/src/components/ValetudoAppBar.tsx` | `menuEntryIsVisible` hides the routes in `frontend/src/fork/hiddenMenuRoutes.ts` (camera, AI assistant) from the menu; the pages stay reachable by URL | Re-add the 3-line check at the top of `menuEntryIsVisible`. To hide or show more pages, edit `hiddenMenuRoutes.ts` |
| `README.md` | fork note at the top | Keep the note |
| `package.json` (root) | `"build_de"` script | Re-add the line |
| `package.json`, `package-lock.json` (root) | `"version": "<upstream version>-de"` | Take upstream's new version and append `-de` |
| `backend/lib/updater/lib/update_provider/GithubValetudoUpdateProvider.js` | `RELEASES_URL` points to `Gerii/Valetudo` instead of `Hypfer/Valetudo`, so the built-in updater installs German releases of this fork | Keep the fork URL |

Each changed line carries a `// i18n fork` comment where possible. If upstream adds a new place that shows
backend-provided text (`.message`, `.description`, `.title` of an API object), wrap it the same way.

New files that upstream never touches: `AGENTS.md`, `i18n/**`, `frontend/src/i18n/**`, `frontend/src/fork/**`.

The **nightly** update channel (`GithubValetudoNightlyUpdateProvider.js`) still points to Hypfer's nightly builds,
because the fork has none. A robot switched to the nightly channel installs the English upstream nightly.

## Updating to a new upstream release

Requires Node.js ≥ 20 (upstream builds with a current LTS) and `npm ci` once.

1. **Rebase.** Upstream tags are kept in their own namespace `upstream/*` and never pushed to the fork,
   so they can't be confused with the fork's release tags (`<version>-de`):
   ```sh
   # once
   git remote add upstream https://github.com/Hypfer/Valetudo.git
   git config remote.upstream.tagOpt --no-tags
   git config --add remote.upstream.fetch '+refs/tags/*:refs/tags/upstream/*'
   # each release
   git fetch upstream
   git rebase upstream/<new-tag>    # on branch "german-translation"
   ```
   Resolve conflicts with the table above. Do not "fix" conflicts by translating upstream code.
   The `version` in `package.json` and `package-lock.json` (2×, the root entries) conflicts on every upstream release:
   set it to `<new upstream version>-de`, e.g. `2026.11.0-de`.
2. **Find what's new.**
   ```sh
   node i18n/scripts/extract.mjs --prune
   ```
   This writes `i18n/de/missing.json`, which has:
   - new or changed frontend strings
   - new backend messages
   - overrides that are missing or stale (the English help text changed)
   
   `--prune` drops dictionary keys whose English source no longer exists.
3. **Translate.** You do it as the agent, or with `node i18n/scripts/llm-fill.mjs`,
   which needs `npm install --no-save @anthropic-ai/sdk` and API credentials. **Do not add the SDK to package.json**:
   it would conflict with the lockfile on every rebase.
   - Follow `i18n/de/glossary.md` strictly: "du" form, the terminology list, placeholder rules, and `null` for technical strings.
   - Frontend: add `"English key": "Deutsch"` entries to `i18n/de/frontend.json`. Open the source location
     from `missing.json` when the context is unclear: fragments, short words, possible technical strings.
     English plural suffixes use the choice syntax: `"{0} minute{1} ago": "vor {0} {1?Minuten:Minute}"`.
     It keeps the condition of expression `{1}` (which must be a ternary) and replaces its branches.
   - One English word may need different German in different places. For that, add a **scoped key**:
     `"<path below frontend/src>|<key>"` or, scoped further to JSX text / string literal / template,
     `"<path>#jsx|<key>"` (`#string`, `#template`). A scoped key wins over the plain key; a scoped `null`
     blocks it. Examples in `frontend.json`: `"controls/Dock.tsx#jsx|Empty": "Entleeren"` (button) and the plain key
     `"Empty": "Leer"` (status); `segments` is `null` globally because it is a mode id, but it is translated for the JSX text in `SegmentActions.tsx`.
   - Backend: add entries to `i18n/de/backend.json`. Every `{n}` must be kept, and there's no choice syntax.
   - Stale overrides: update the German file to match the new English file, then set the hash in its first line
     to the `upstream-sha256` value printed in `missing.json`.
4. **Verify.**
   ```sh
   node i18n/scripts/check.mjs                         # must print "OK"
   npm run ts-check_all && npm run lint_all
   VALETUDO_LANG=de npm run build                      # or: npm run build_de
   ```
   A wrong placeholder in a frontend translation fails the build with an `i18n:` error that names the key.
   Then run the backend with the mock robot and click through the UI, as described in `i18n/README.md`.
5. **Commit.** Keep the history at five commits on top of upstream, so the next rebase stays easy:
   - `i18n: German translation infrastructure and dictionaries` (`AGENTS.md`, `README.md`, `i18n/`, `frontend/src/i18n/`)
   - `i18n: hooks in upstream files` (the frontend files and `package.json` in the table above)
   - `fork: install updates from the fork's GitHub releases` (`GithubValetudoUpdateProvider.js`)
   - `fork: hide camera and AI assistant from the menu` (`ValetudoAppBar.tsx`, `frontend/src/fork/`)
   - `fork: version suffix -de` (`version` in `package.json`, `package-lock.json`)

   Squash later changes into the matching commit with `git commit --fixup=<commit>` + `git rebase -i --autosquash`.
   An agent can't run interactive rebases; use `GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash upstream/<tag>` instead.
   **Do not add `Co-Authored-By:` or any other AI attribution trailers to commit messages.**

## Creating a release (German binaries for the built-in updater)

Robots running this fork query `https://api.github.com/repos/Gerii/Valetudo/releases`. A release is offered when:
- it is published, i.e. neither a draft nor a pre-release
- its tag equals the `version` in `package.json`, and therefore the manifest's version (e.g. `2026.11.0-de`)
- it has the binaries under the exact names below, plus `valetudo_release_manifest.json` with their SHA-256 sums

The updater offers the next release after the version currently installed. A robot that already runs
`2026.10.0-de` is not offered `2026.10.0-de` again, so translation fixes without a new upstream version need a new
version (e.g. `2026.10.0-de.2`) or a manual install. The first switch from upstream to the German build is always manual
(see `i18n/README.md`), because upstream builds look for updates at Hypfer's repository.

**Only release when the user asks for it. Never push or release on your own.**

1. **Preconditions**
   - The branch is rebased, verified (step 4 above) and committed.
   - **GitHub Actions must stay disabled in the fork** (repository Settings → Actions). Otherwise publishing
     a release runs upstream's `.github/workflows/release.yml`, which builds the *English* frontend and uploads binaries under the
     same asset names. Check that no workflow runs exist:
     `curl -s https://api.github.com/repos/Gerii/Valetudo/actions/runs | grep total_count` must show `0`.
   - `gh` is logged in as an account with write access to `Gerii/Valetudo` (`gh auth status`, `gh auth switch`).
2. **Push the branch** (after a rebase this needs a force push):
   ```sh
   git push --force-with-lease origin german-translation
   ```
   Never push the `upstream/*` tags (`git push --tags` would push them).
3. **Build exactly like upstream's release workflow, but with the German frontend:**
   ```sh
   rm -rf build
   npm ci
   npm run build_openapi_schema
   VALETUDO_LANG=de npm run build --workspace=frontend
   npm run build_armv7 --workspace=backend
   npm run build_armv7_lowmem --workspace=backend
   npm run build_aarch64 --workspace=backend
   npm run upx
   npm run build_release_manifest
   grep -o '<html lang="de"' frontend/build/index.html                     # must match
   node -p "require('./build/valetudo_release_manifest.json').version"     # must equal package.json version
   ```
   The backend build must not warn about a missing `valetudo.openapi.schema.json`.
4. **Stage the assets** under the names the updater looks for:
   ```sh
   mkdir -p build/release
   cp build/armv7/valetudo                build/release/valetudo-armv7
   cp build/armv7/valetudo-lowmem         build/release/valetudo-armv7-lowmem
   cp build/aarch64/valetudo              build/release/valetudo-aarch64
   cp build/armv7/valetudo.upx            build/release/valetudo-armv7.upx
   cp build/armv7/valetudo-lowmem.upx     build/release/valetudo-armv7-lowmem.upx
   cp build/aarch64/valetudo.upx          build/release/valetudo-aarch64.upx
   cp build/valetudo_release_manifest.json build/valetudo.openapi.schema.json build/release/
   (cd build/release && sha256sum valetudo-* | sort)   # compare with the manifest
   ```
5. **Write the release notes** to `build/release-notes.md`, in German. The updater shows them as the changelog.
   Mention the upstream version it is based on and link the upstream changelog
   (`https://github.com/Hypfer/Valetudo/releases/tag/<version>`), plus what changed in the translation.
6. **Create the release** for the commit that was just pushed. The tag is created on GitHub only:
   ```sh
   VERSION=$(node -p "require('./package.json').version")
   gh release create "$VERSION" --repo Gerii/Valetudo --target "$(git rev-parse HEAD)" \
       --title "$VERSION (Deutsch)" --notes-file build/release-notes.md build/release/*
   ```
   Do not use `--draft` or `--prerelease`; the updater ignores those.
7. **Verify** that the release has the assets under the right names:
   ```sh
   gh release view "$VERSION" --repo Gerii/Valetudo --json assets --jq '.assets[].name'
   ```
   On a robot running an older German version: Valetudo → Updater → Check should offer `$VERSION`.

## Don'ts

- Don't add `Co-Authored-By:` or other AI attribution trailers to commits.
- Don't push, tag or release unless the user explicitly asks for it.
- Don't translate API values: capability names, enum values, preset values, quirk option values sent to the API, MQTT topics.
- Don't add an i18n library or wrap strings in `t()` in upstream files.
- Don't edit `frontend/src/**/res/*.ts`. Edit the override.
