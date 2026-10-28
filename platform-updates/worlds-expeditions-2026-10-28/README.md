# Worlds and Expeditions source snapshot — October 28, 2026

This immutable snapshot records the reviewed public portion of the PARALLAX changes after hosted v186 through v211. The world collection and game runtime reached v210; v211 adds the native release-continuity policy without changing those game assets.

Read the [current release record](../../docs/updates/worlds-expeditions-2026-10-28.md) for the shipped behavior and verification limits. [PUBLIC-SYNC.json](PUBLIC-SYNC.json) is the exact export and source-change ledger. [PROVENANCE.json](PROVENANCE.json) records the source revision, file inventory, scope and retained history.

| Record | Value |
| --- | --- |
| Native baseline | `97e972053a734e5e2b394aeaab4e98a868656e3f` — hosted v186 |
| Native source | `c79c3c7ff8f8e0f2a8a71a62138072a0b7433910` — hosted v211 |
| Runtime feature revision | v210; GATTO art v207 and collection art v209 remain intentionally versioned |
| Exact source exports | 454 files / 86,697,311 bytes |
| Native changed paths | 224: 207 exported and 17 documented source-only changes |
| Included focused test suites | 14 |

## What is included

- All 123 asset and provenance files added or changed since the baseline, preserving both current artwork and the intermediate images from this development interval. Original generated PNGs, lossless runtime WebPs, contour data textures, planet renders, navigation icons, share cards and expedition materials keep their source bytes.
- All 219 root-level public JavaScript, CSS and JSON files, including the 36 changed browser files and their unchanged shared dependencies. The chart browser bundle and its license are included for the copied Terminal template.
- All 27 top-level HTML templates, the public editorial catalog, and 21 explicitly reviewed TypeScript presentation or metadata modules. These give context for the world pages and focused tests without exporting the application backend.
- Thirteen small solar maps, their attribution, the three desktop Earth maps loaded dynamically by the included globe module, the Studio cloud texture, relevant project artwork, branding, shared social images, premium-world preview art and favicon. The selected pages use system-font stacks; no local web-font files are required.
- Two implementation-note documents, four Python render/contour helpers and the fourteen focused browser/scene test suites listed below.

The active six portrait worlds load `*-realism-v209.webp` **and** their `*-realism-contour-v209.png` geometry textures. GATTO still loads `gatto-face-v207.png`; SHEEPLE still loads `sheeple-fleece-v194.png`; SolHandle still loads `solhandle-emblem-v198.png`. Their older version suffixes do not make these files obsolete. The games use `assets/expeditions/material-atlas-v210.webp`; their moving characters are articulated meshes.

## Scope and historical notes

This is a selected world/game browser-source snapshot, not a full offline application or deployable copy of PARALLAX. Other browser files and HTML templates are retained as source context; unrelated home, film and desert media collections are not bundled in full. Hosted API calls, authenticated creator data, account permissions and production routing still require compatible services or explicit test fixtures.

Private API implementations, services, database schemas, migrations, operational configuration and account records are omitted. The native changes to those paths are summarized individually in `sourceOnlyChanges`. The seven changed whole-application `.mjs` suites stay with their private or omitted route dependencies. The included `project-share.test.cjs` explicitly stubs the private creator route and exercises the real public SolHandle presentation; the private `app/world/[id]/route.ts` is not exported.

The public catalogs intentionally preserve already published token addresses, project identity references and the original SolHandle project ID/creator-wallet pins. Those identify the reviewed public presentation; they are not credentials and do not grant account access. Source files are not sanitized or rewritten during export.

The copied [community-showcases.md](docs/community-showcases.md) contains historical v192/v193 notes. Its earlier artwork descriptions, GATTO identity limitations and canonical-page sharing instructions describe that stage. The [current release record](../../docs/updates/worlds-expeditions-2026-10-28.md), current catalogs and asset provenance define the later v209/v210 behavior. Other dated source notes likewise keep their original context.

## Verify the snapshot

From the public repository root:

```sh
node scripts/verify-public-sync.mjs
node scripts/verify-public-sync.mjs --source /absolute/native-checkout --release worlds-expeditions-2026-10-28
npm run check
```

The first command validates public evidence: exact exported paths, bytes and hashes, the closed snapshot inventory and retained older snapshots. The source-backed command also checks every exported Git blob and accounts for all 224 native changed paths. A public-only check cannot independently establish native deployment state. The repository's release record and actual CI run report the executed checks; inclusion of a test file is not itself a passing result.

To run just the included suites after installing the public kit dependencies, start at this snapshot root:

```sh
node --test tests/*.test.cjs
```

The public kit supplies TypeScript for the presentation-module harness. The suites use local fixtures and do not require a wallet transaction. Included suites:

- `tests/community-atlas.test.cjs`
- `tests/ecosystem.test.cjs`
- `tests/expedition-log.test.cjs`
- `tests/expedition-materials.test.cjs`
- `tests/gatto-expedition-controller.test.cjs`
- `tests/gatto-expedition-scene.test.cjs`
- `tests/planet-atlas.test.cjs`
- `tests/planet-palette.test.cjs`
- `tests/planet-realism.test.cjs`
- `tests/project-share.test.cjs`
- `tests/sheeple-expedition-rig.test.cjs`
- `tests/sheeple-expedition-scene.test.cjs`
- `tests/sheeple-player-rig.test.cjs`
- `tests/sheeple-player.test.cjs`

## Reproduce artwork

Run these commands from this snapshot root in a suitable rendering environment:

```sh
python3 scripts/build-portrait-contours.py
python3 scripts/render-ecosystem.py solana solflare phantom jupiter bonk pengu wif popcat sheeple trump solhandle
python3 scripts/render-community-cards.py solana solflare phantom jupiter bonk pengu wif popcat sheeple trump solhandle --lineup
```

The render helpers require Python, Pillow and Mesa EGL/OpenGL ES. Card generation expects DejaVu fonts at the system paths named in the source. The historical SolHandle card helper can use Nimbus Sans or DejaVu and deliberately reproduces its v198 layout. These tools write derived images; run them in a separate working copy when preserving this snapshot's recorded hashes.

The approved GATTO v207 exports remain unchanged by the default card command. Explicitly naming `gatto` regenerates them. All source PNGs needed by the contour helper are included. No image-generation request is required to render the bundled sources.

## Provenance and retained history

Credits and generation records are preserved in [ecosystem/SOURCES.md](public/assets/ecosystem/SOURCES.md), [globe/SOURCES.txt](public/assets/globe/SOURCES.txt), [portrait provenance](public/assets/globe/realism-v209-sources.json) and [material provenance](public/assets/expeditions/material-atlas-v210-sources.json). Existing repository licensing and each third-party asset's attribution continue to apply; this export grants no additional rights in named project identities.

`historical-platform/`, `platform-updates/terminal-2026-10-24/` and `platform-updates/workspace-2026-10-25/` remain unchanged. Their directory fingerprints and file counts are recorded in this release manifest. The original public developer kit and Git history are preserved separately from the native Sites history.
