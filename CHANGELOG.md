# Changelog

## Earthbound realistic expedition — v229

Meshy sandstone, field equipment and lanterns with improved ground lighting and contact shading. [Release notes](docs/updates/earthbound-realism-2026-10-31.md) · [Exact source snapshot](platform-updates/earthbound-realism-2026-10-31/).

Public validation follow-up: [complete rover snapshot](platform-updates/earthbound-rover-validation-2026-10-31/) includes the unchanged rocket boarding state needed by the test suite. Hosted v228 is unchanged; the original snapshot is preserved.

## Earthbound expedition rover — hosted v228

- Textured Rover 01 with animated wheels, terrain-facing headlights and parked work lighting; preserved Rover 02 and the procedural fallback.
- Reduced the 107.6 MB generation to a 4.7 MB, 30,616-triangle runtime asset; total generation cost 35 Meshy credits.
- Production build, 40 focused native tests and local browser driving/stunt/exit checks passed.
- [Release details](docs/updates/earthbound-rover-2026-10-31.md) · [Exact source snapshot](platform-updates/earthbound-rover-2026-10-31/).

## Earthbound rocket and Observatory interface — hosted v227

- Recorded source `bc4320d02021f78f04c9bc6f8111d0945118455d` after synchronized v225 `89dabd844238dd7f6738b4b4da692a37511dbee3`, grouping the v226 Observatory interface and v227 rocket integration.
- Added the textured, normal-mapped Earthbound rocket: 51,271 triangles, a 9,266,280-byte web GLB, preserved geometry/UV bytes, runtime work lamps and launch-engine lighting, and a procedural loading/support fallback.
- Fitted the launch apron, footprint collisions, service tower, boarding lift and nearby equipment to the model; preserved the cabin/launch flow and added a late-load rover clearance window.
- Caught up the shared Observatory navigation/page treatments and repairs for directory dismissal, motion preferences, Snapshot Library refresh, paused Trenches cooldown recovery, and bounded Gold request failures.
- Published 35 exact files (10,053,716 bytes), classifying all 38 native changes as 34 changed exports and 4 source-only summaries, with one unchanged fixture dependency. Existing exact presentation exceptions suffice.
- Appended `npm run check:earthbound-rocket`; preserved all 10 earlier snapshot/archive directories. Offline shader/model renders and live asset-byte checks are recorded separately from unverified real-device browser performance.
- See the [release record](docs/updates/earthbound-rocket-2026-10-30.md) and [source snapshot](platform-updates/earthbound-rocket-2026-10-30/).

## Gold research suite remodel — hosted v225

- Recorded source `89dabd844238dd7f6738b4b4da692a37511dbee3` after synchronized v220 `33f8c23fa4aca7e181f4713531a066f6ac5c822a`, including the preceding v221 Terminal launch-card catch-up.
- Remodeled Gold home, Wallet Watch, the snapshot library/comparison views and Gold AI with a shared charcoal and champagne palette, clearer research surfaces and active suite navigation.
- Added local monitor wallet/project filtering, name/address search, collection status and distinct empty/unavailable states. Full saved-monitor refresh and wallet-change isolation remain intact.
- Added local research-row filtering and keyboard focus helpers; reorganized the assistant's saved conversations, evidence selection, focus suggestions, request allowance and composer.
- Preserved existing membership verification, account separation, provider request behavior, source timestamps and safe answer rendering. The remodel changes no private service implementation.
- Published 65 exact files (1,492,786 bytes), classifying all 21 native changes as 20 changed exports and 1 share-route summary, with 45 unchanged dependencies.
- Appended `npm run check:gold-workspace` and preserved all 9 earlier snapshot/archive directories. Release notes record live desktop checks, scoped offline coverage and remaining authenticated/mobile visual limits.
- See the [release record](docs/updates/gold-workspace-2026-10-29.md) and [source snapshot](platform-updates/gold-workspace-2026-10-29/).

## Market data recovery — hosted v220

- Recorded source `33f8c23fa4aca7e181f4713531a066f6ac5c822a` after synchronized v217 `fddfd0fac87276fe1806c05255f9899bdbd7a62f`, grouping the recovery revisions since that public baseline.
- Addressed the fixed local allowance stopping market data despite included capacity. Additional paid usage now requires strictly verified, bounded grants with a reserve, revalidation and shared coordination; existing usage counters and billing settings remain intact.
- Preserved separately bounded public-provider fallback and retained discovery/chart observations with original timestamps and explicit stale labels. Exact token/pool and quote-review requirements remain enforced.
- Prioritized the selected native chart; bounded Terminal opening discovery and metadata requests, retained deeper observations and respected server retry guidance. Updated asset versions for existing visitors.
- Published 52 exact files (1,122,725 bytes), classifying all 15 native changes as 10 changed exports and 5 private summaries, with 42 unchanged dependencies.
- Added the reviewed connection/allowance guide and five offline request-budget checks. Appended `npm run check:market-recovery` and preserved all eight earlier snapshot/archive directories.
- See the [release record](docs/updates/market-data-recovery-2026-10-29.md) and [source snapshot](platform-updates/market-data-recovery-2026-10-29/).

## Terminal and Trenches market workspace — hosted v217

- Recorded source `fddfd0fac87276fe1806c05255f9899bdbd7a62f` after synchronized v216 `610995b2368af062314d4e41ad24be8ce0207ea3`.
- Unified the market pages with a midnight palette, iris accents, mint/rose activity colors and compact navigation. Refined the Terminal market strip, discovery collapse, chart focus and keyboard search.
- Rebuilt Trenches around denser columns, Compact/Comfortable views, up to 20 local pins, pinned filtering, copy-contract actions and exact market handoffs.
- Expanded bounded opening discovery and deeper-source coverage while retaining lifecycle proof, cached provider observations, cooldowns and explicit loading limits.
- Added per-page row snapshot ages and older-observation indicators; preserved interaction-held refresh ordering, hidden-tab/pause behavior and prior data on source failures.
- Published 50 exact files (1,090,727 bytes), classifying all 20 native changes as 15 changed exports and 5 private summaries, with 35 unchanged dependencies.
- Added `npm run check:market-workspace` without removing existing public suites. Preserved all seven older snapshot/archive directories and their fingerprints.
- See the [release record](docs/updates/terminal-trenches-workspace-2026-10-29.md) and [source snapshot](platform-updates/terminal-trenches-workspace-2026-10-29/).

## Terminal and Trenches validation follow-up — hosted v216

- Recorded source `610995b2368af062314d4e41ad24be8ce0207ea3` after synchronized v215 `3b66a88e96d75b23ccf3ac46a55bebef258a7eb5`.
- Corrected one offline selection assertion to accept equivalent compact USD formatting across supported Node.js/ICU versions. Runtime behavior and visual styling are unchanged.
- Published the changed fixture plus its two unchanged browser inputs as a new immutable snapshot: 3 exact files, 101,324 bytes.
- Kept all existing Terminal and Trenches suites active and routed the selection suite to the corrected snapshot. Preserved all six earlier retained directories, including v215.
- See the [release record](docs/updates/terminal-trenches-validation-2026-10-29.md) and [source snapshot](platform-updates/terminal-trenches-validation-2026-10-29/).

## Hosted Terminal and Trenches update — 2026-10-29

- Recorded hosted v215, source `3b66a88e96d75b23ccf3ac46a55bebef258a7eb5`, after synchronized v212.
- Refined Terminal with graphite surfaces, jade/coral charts, a prominent reported valuation, indexed holder freshness and safe provider-listed website/social links.
- Added explicit Market cap, FDV and Price chart views with readable currency units and a disclosed coherent current-supply estimate. Preserved raw candles, volume, quote-currency entry lines and actual execution prices.
- Added the separate three-stage Trenches board with independent filters, sorting, device-local preferences, freshness and exact token/pool links into Terminal.
- Kept launch completion and migration dependent on provider evidence; missing metrics and incomplete indexed coverage remain visible.
- Published 49 exact files (1,018,782 bytes), classifying all 26 native changes as 18 changed exports and 8 private summaries, with 31 unchanged dependencies.
- Added `npm run check:terminal-trenches` to the public gate. Preserved all five earlier retained directories and their fingerprints.
- See the [release record](docs/updates/terminal-trenches-2026-10-29.md) and [source snapshot](platform-updates/terminal-trenches-2026-10-29/).

## Hosted Replay update — 2026-10-28

- Recorded hosted v212, native source `71ab595e472670c98b5b047b1bd3b8ba2da690e0`, continuing from synchronized v211.
- Added public 1H/6H/24H selected-pool replay, completed candle closes, buy/sell markers, sender filters and totals, largest-trade jumps, Solscan links and JSON evidence export.
- Added fixed-lifetime snapshot sharing that preserves the captured dataset, playhead and filters; retries preserve the original request and explicit Load latest starts a new capture.
- Linked Replay from shared navigation, the homepage, Terminal and project worlds. Token and pool selections remain explicit across refreshes.
- Exposed recent-trade caps, missing USD, chart gaps and capture timestamps; this first release does not claim full token history, wallet profit/loss or transfers/liquidity replay.
- Published 37 exact files (492,664 bytes), covering 16 of 22 changed native paths plus 21 shared dependencies. The remaining 6 private changes are summarized without implementation or runtime data.
- Added public core and browser-controller fixtures to `npm run check:replay` and the complete public CI gate. Preserved all older snapshots and their hashes.
- See the [Replay release record](docs/updates/replay-2026-10-28.md) and [source snapshot](platform-updates/replay-2026-10-28/).

## Hosted worlds, expeditions and community tools update — 2026-10-28

- Recorded all feature work after v186 through v210, application revision `b92e26dd4c0232b9c7e471a4563d40f01afe12bc`. The complete public export is pinned to subsequent workflow-only v211 source revision `c79c3c7ff8f8e0f2a8a71a62138072a0b7433910`.
- Added six community showcase destinations with reviewed project and token links, public project-wallet linking controls, editable sharing actions and documentation of the separate website-and-wallet proof process.
- Refined Atlas spacing, label placement, mobile framing and static fallback behavior; added landing links and separate local expedition memories.
- Added GATTO's Italian city expedition and SHEEPLE's playable lunar habitat, including explicit discoveries, photo controls, cosmetic stamps, keyboard/touch controls, reduced-motion support and browser-local progress.
- Brought the curated collection to the approved realistic style: GATTO v207, eleven matching v209 worlds, consistent live/static/card artwork, and distinct versioned share URLs. Six frontal portraits use bounded ±24° turns; scientific worlds and ordinary creator designs retain their existing behavior.
- Added v210 game materials, refined articulated cat and sheep anatomy, warm architectural surfaces and local lighting, matching Canvas fallbacks, and nonblocking material loading.
- Refined SolHandle's original creator-world presentation and Studio exports; preserved ownership, saved-style precedence and the distinction between product identities and token tickers. Expanded GATTO's source-reviewed project profile and fixed navigation style interference.
- Published the public browser implementation, complete world/game runtime assets, original artwork, source provenance, render helpers and focused tests in a separate dated snapshot. Private server work is documented in the release record without exporting backend, authentication or database code.
- Included 454 exact source exports totaling 86,697,311 bytes and 14 focused browser/rendering test files. Classified all 224 source changes since v186: 207 exported paths and 17 documented source-only changes, with supporting unchanged public dependencies included in the export.
- Recorded the ongoing release-update policy in the native Site source for v211: keep the public source record tied to each deployed Site revision, with the same reviewed scope and preserved historical snapshots. This workflow update leaves the v210 game runtime unchanged.
- Retained the source's v192/v193 community-showcase notes byte-for-byte as historical documentation; the new release record describes the current catalog, artwork and sharing behavior.
- See the [worlds and expeditions release record](docs/updates/worlds-expeditions-2026-10-28.md) and its [source snapshot](platform-updates/worlds-expeditions-2026-10-28/).

## Hosted workspace update — 2026-10-25

- Recorded shipped work through version 186: My Workspace, consistent navigation, simpler Gold and research pages, Premium Worlds mobile layout and eight textured thumbnails.
- Added the Terminal chart-height and disclosure fixes; documented exact-pool valuation enrichment and data limits.
- Published a separate 35-file selected-source snapshot with hashes, 18 navigation/layout tests and Gold/Premium client harnesses. Existing archives remain intact.
- See the [workspace release record](docs/updates/workspace-2026-10-25.md). Run `npm run check:workspace` for the new offline checks.

## Hosted Terminal update — 2026-10-24

- Recorded the deployed Terminal rebuild through hosted version 179: larger charts, compact project-image rows, expanded paginated discovery, bonding data and quote-review controls.
- Published selected unmodified browser assets and markup with source provenance and nine offline checks, included in `npm run check`.
- Documented provider freshness, FDV labeling, coverage limits and remaining mobile/signing checks. Saved discovery filters remain a proposed follow-up.
- See the [Terminal release record](docs/updates/terminal-2026-10-24.md). The October 20 history archive and developer-kit version are unchanged.

## Unreleased

- Prepared a filtered import of 155 original browser-code, stylesheet and implementation-note commits, preserving original dates and Codex attribution. See the import receipt for completion status.

- Published a retrospective of 162 original application-source commits and their mapping to 158 saved site versions; these are metadata records, not imported GitHub commits.
- Added ten hosted-platform guide snapshots covering research, membership, identity, creator tools, transparency and release status, with original validation limits.

- Added PARALLAX repository branding, a product overview and a guide to the included source.
- Added architecture, integration, testing and roadmap documentation.
- Added a dependency lockfile, provenance verification and CI checks on Node 22 and 24.
- Added structured bug reports, feature proposals and a pull request template.

## 0.1.0 — 2026-10-20

Initial selected-source preview: SolHandle resolver, browser identity module, offline ownership and lifecycle checks, read-only lookup example and contribution guidance. Partner SDK review, a real NFT transfer and iPhone/Phantom signing checks remain outstanding for the broader integration.
