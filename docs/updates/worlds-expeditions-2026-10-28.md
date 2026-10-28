# Worlds, Expeditions & Community Tools — October 28, 2026

[Open PARALLAX](https://parallaxlaunch.live) · [Public source snapshot](../../platform-updates/worlds-expeditions-2026-10-28/) · [Project Atlas](https://parallaxlaunch.live/planets)

This records feature work shipped after the [v186 workspace update](workspace-2026-10-25.md), through hosted version **210**, followed by the workflow-only **v211** release-policy update. The games and their runtime assets remain at v210. The public snapshot is pinned to the complete v211 source revision.

| Revision | Source commit | Scope |
| --- | --- | --- |
| v186 | `97e972053a734e5e2b394aeaab4e98a868656e3f` | Previous published workspace snapshot |
| v210 | `b92e26dd4c0232b9c7e471a4563d40f01afe12bc` | Completed feature and game-material work |
| v211 | `c79c3c7ff8f8e0f2a8a71a62138072a0b7433910` | Complete export source, including the native release-policy instructions; game runtime unchanged |

The update includes the public browser implementation, complete world and expedition runtime assets, original artwork, render helpers and focused tests. The snapshot's `PROVENANCE.json` supplies the exact exported file inventory and SHA-256 hashes. Private server work is summarized below and remains outside the public source boundary.

The frozen inventory contains **454 exact source exports totaling 86,697,311 bytes**, including 14 focused browser/rendering test files. Every source change since v186 is classified: **207 of 224 changed paths are exported**, and **17 source-only changes are summarized**. The remaining exported files provide unchanged public dependencies, source maps and runtime assets. Generated snapshot support files are recorded separately from these source-export totals.

## Community destinations and project identity

BONK, PENGU, WIF, POPCAT, SHEEPLE and OFFICIAL TRUMP gained dedicated community showcase pages and Atlas entries. Their catalogs contain reviewed descriptions, official project sources and exact Solana token addresses. Links open the corresponding Terminal research, Token Passport and explorer views. Exploring a world does not initiate a token purchase.

SHEEPLE and OFFICIAL TRUMP link to each other's destinations with a source for the reported market pairing. The pages identify them as independent projects. A curated listing, shared visual theme or linked token address does not establish a partnership or creator ownership.

GATTO's project page and expedition welcome now share a source-reviewed profile: official website and X links, a copyable contract address, builder and market references, and the Trattoria Gatto landmark. The imagined Italian city uses that project context while keeping the original source references visible.

### Public project-wallet linking

The six community pages gained a project-identity section with a deliberate wallet-linking flow. It distinguishes the token mint, signing operator and designated public project or treasury wallet. The interface supports reviewing a project-specific signing message, downloading a website proof document, checking its status, viewing the public wallet link and removing a link through the existing permission checks.

The hosted service requires both a wallet signature and matching proof on the project's predefined official HTTPS website. The public documentation explains the proof's scope, validity and removal process. It also describes how a treasury address can differ from the signing operator. Website verification establishes that particular association; it does not confer planet editing rights or substitute for creator authorization.

The browser interface and public guide are included in this release. The service implementation, signature verification, account binding, storage and database migration remain private. No credentials, account records, pending proof requests or signed messages are exported.

## Atlas, navigation and creator tools

The community Atlas now spaces worlds and their orbital accessories within the visible frame while retaining foreground and background depth. Labels choose clearer positions around their worlds, and narrow layouts use an appropriate overview camera. The solar-system view also improves label placement without changing the orbits or scientific identities of its destinations.

The Atlas starts lazy texture requests and keeps each world's matching static artwork visible until its live rendering is ready. Texture or WebGL failure retains the correct fallback. Landing links lead to the two expeditions, with separate discovery indicators from their local travel logs. Reduced motion uses direct navigation instead of the departure animation.

SolHandle received a dedicated identity-world presentation attached to its original published creator record. Its exact project ID, creator wallet and official domain determine that presentation; an arbitrary matching name or ticker does not. Atlas, the world page and Studio previews use the same look while respecting an existing saved paid style. Studio restores canonical wallet, contract and claimed-planet fields from the owned published record when loading a saved project or its backup.

The release also isolates legacy Explore navigation styling from the shared sidebar, improves project navigation spacing, adds the project-wallet guide and displays per-guide update dates and the actual guide count. These changes build on the previous workspace release rather than repeating its Gold or Terminal feature claims.

## One consistent realistic world collection

The user-approved GATTO v207 face became the visual benchmark for the curated collection. Its approved planet, navigation icon and social card remain at their v207 filenames. Eleven other worlds now use matching v209 exports:

| Treatment | Worlds |
| --- | --- |
| Detailed character portraits on shaped volumes | BONK, PENGU, WIF, POPCAT, SHEEPLE, OFFICIAL TRUMP |
| Physical terrain, atmospheric light and orbital materials | Solana, Solflare, Phantom, Jupiter, SolHandle |
| Preserved approved black-cat identity | GATTO v207 |

The live views, full-frame fallback renders, padded navigation icons and 1200 × 630 social cards use the same production renderer and source settings. The combined project lineup includes all twelve worlds. Product headings do not acquire a token-style dollar prefix.

Original generated PNGs remain the artwork sources. The six v209 runtime portraits use lossless WebP copies verified to decode to the same RGBA pixels. Small contour data textures are derived from the source alpha for the rounded portrait volumes. The source records retain prompts, references, dimensions and hashes. Existing third-party map credits remain with the assets.

The six single-view v209 portraits turn smoothly within **±24°** of the front. Arrow keys and dragging stop at the boundaries and reverse immediately; autoplay turns back and forth without a discontinuity. This avoids exposing an unsupported full profile or back view. GATTO and the five terrain worlds retain their prior rotation behavior. Scientific solar-system destinations and arbitrary creator designs do not inherit these curated-only materials.

### Sharing and preview identity

Copy, native-share and editable X-compose actions use a distinct destination for each revised world: `/share/<slug>-v209`, with GATTO retaining `/share/gatto-v207`. Ordinary project navigation keeps its existing URL. Each share destination serves the full project page with its own canonical URL, Open Graph URL and matching large-image card, rather than redirecting to an older card identity.

Share actions remain explicit: opening an X draft does not send a post. Native sharing has clipboard and selectable-URL fallbacks. A new share URL gives an external service a distinct page identity; it does not guarantee a refresh of that service's previously cached preview. SolHandle's alias retains the verified original project context for its journal and research sections.

## GATTO: an Italian city expedition

[Enter GATTO's city](https://parallaxlaunch.live/expeditions/gatto)

The expedition adds a warm piazza, the Trattoria landmark and nine animated black cats. Visitors can approach the cats, light the lanterns and find the golden sardine. Only explicit interactions within the required reach complete discoveries; selecting a destination or moving the camera does not award progress.

The v210 scene refines connected feline anatomy, ears, muzzles, amber almond-shaped eyes, paws and tails. Short black-fur material follows each moving mesh. Limestone, stucco and roof surfaces retain their own colors, and activated lanterns cast warm local light on nearby geometry. The four-leg rigs, ground contact, travel timing, quest gates and photo controls remain intact.

## SHEEPLE: a playable lunar habitat

[Enter SHEEPLE's habitat](https://parallaxlaunch.live/expeditions/sheeple)

Players control a sheep in a three-dimensional lunar habitat, walk and jump, baa to the flock, collect the three signal rings, wake the beacon and jump for the golden bell. Keyboard and touch controls support movement, and sound has an explicit control beside Baa. Audio unlocks from a visitor gesture.

The scene uses articulated sheep with connected legs, ivory fleece, dark camera heads, collars, solar panels and grounded hooves. The v210 material treatment adds lunar regolith and differentiated metal, glass and other surfaces. Character materials remain attached to moving geometry. Both expeditions use complete moving meshes rather than placing a frontal planet portrait on the playable model.

### Progress, accessibility and fallback behavior

Each expedition keeps a separate travel log in the current browser. Discoveries and a cosmetic completion stamp provide memories of the visit; they do not mint an asset, send a transaction or grant an account entitlement. If storage is unavailable or cannot be read, the interface explains that new progress lasts for the visit. The Atlas reads these same local logs.

Both games provide landing and skip controls, destination guidance, help and log dialogs, photo capture and explicit sharing. Reduced motion, paused animation, page visibility and offscreen state remain supported. The approved planet artwork appears in the introduction and arrival overlay to connect the games visually to their Atlas worlds.

The shared material atlas loads asynchronously. Play, discoveries and photo controls remain available before it arrives and after an image failure. Cached scenery redraws when material readiness or lighting changes, including while motion is paused. WebGL and Canvas use the same material assignments, with simplified lighting in the Canvas fallback. Filtered, padded atlas quadrants prevent adjacent materials from bleeding into each other.

## Source scope, reproduction and checks

The dated snapshot includes the browser code, markup and reviewed presentation helpers for these changes; complete world/game runtime textures and exported artwork; original generated sources and attribution; render and contour helpers; and relevant offline tests. Supporting public dependencies are included so the visual implementations can be inspected alongside their actual assets. Earlier dated snapshots and the original SolHandle kit retain their own contents and provenance.

The copied `docs/community-showcases.md` is preserved byte-for-byte from the Site source and contains **historical v192/v193 notes**. Its earlier artwork descriptions, GATTO identity limitations and canonical-page sharing instructions describe that stage of development. This release record is the authoritative current summary; the current catalogs, asset provenance and runtime files define the v209/v210 behavior.

This remains a selected public source release. It does not include the full hosted backend, authentication services, account database, migrations, private configuration or deployment credentials. Public pages that normally call hosted APIs require compatible services or fixtures; the snapshot is not a complete standalone deployment. Server-side project-wallet verification and creator-route behavior are recorded as hosted changes, with their private implementation omitted.

The native planet render helpers require Python, Pillow and Mesa EGL/OpenGL ES. The source maps and current textures needed by these world renders are bundled with their credits. Original generation records and derived-asset helpers explain which images are source artwork and which are reproducible exports. The existing repository license and each third-party asset's attribution continue to apply.

The included checks cover render-state isolation, portrait turn limits, loading/failure fallbacks, sharing identity, gameplay reach rules, connected rigs, local-log behavior, controller lifecycle and material resource handling. See the [snapshot README](../../platform-updates/worlds-expeditions-2026-10-28/README.md) for the commands, test inventory and recorded verification results. The inclusion of a suite is separate from confirmation that a particular GitHub CI run passed.

The complete local `npm run check` passed for this export: 22 of 22 runner-reported test files, comprising three root files, two Terminal files, three workspace files and all 14 new world/game files. The separate Gold client harness and seven Premium client scenarios also passed. Provenance checks verified the 454 current exports, both original SolHandle modules, 14 Terminal snapshot files and 35 workspace snapshot files. There were no failed, skipped or cancelled test files. These are local results; GitHub Actions reports its own run status separately.

During the hosted release, actual production shaders and scene buffers were replayed through native GLES for front/turn views and game overview/close views. The final game shaders compiled unmodified, with atlas readiness and lantern state checked in the captured frames. These checks establish the inspected rendering behavior; they do not replace a full iPhone, touch-device or wallet-signing walkthrough. No real wallet transaction is needed for the offline visual and game suites.

## Keeping later releases in the public record

The v211 source revision records this release policy in the native Site's `AGENTS.md`. Future hosted changes should receive a matching reviewed GitHub update under the same source boundary: public browser implementation, required assets, relevant tests and release notes, all tied to the deployed source revision. Private server changes should be described in those notes without exporting protected implementation or data. GitHub CI verifies the files already committed; the dated snapshot and provenance record establish which Site revision has reached the repository. These publishing instructions do not add an independent background service that automatically copies unpublished Site changes.
