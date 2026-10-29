# Changelog

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
