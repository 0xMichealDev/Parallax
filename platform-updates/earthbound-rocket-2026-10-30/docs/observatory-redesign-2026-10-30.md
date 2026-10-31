# PARALLAX — Observatory interface redesign

Date: October 30, 2026

## Intent and design decisions

Give the whole product a recognizable observatory identity, clearer navigation, and distinct rooms for trading, research, and exploration. Preserve the main dashboard's arrangement, saved layout, and familiar entry points. Keep useful controls and data ahead of decoration.

The shared interface uses deep charcoal surfaces, precise typography, restrained orbital details, flatter panels, and consistent focus and active states. Trade uses jade; Gold research uses champagne and bronze; Universe uses pale violet and mineral tones. Documentation and project information use a quieter editorial treatment. Terminal chart dimensions, existing planet renderers, game controls, and membership requirements remain governed by their existing implementations.

## Navigation and page treatments

The sidebar exposes Dashboard and My Workspace, then three clear groups: **Trade**, **Research**, and **Universe**. Gold, Documentation, About, and the searchable tool directory remain available. Research subviews keep their functional tabs. The main dashboard retains its layout.

Terminal and Trenches use a 72px desktop icon rail that expands to 224px, with their market topbar as the primary header. Mobile uses the shared bottom navigation and safe-area spacing. Full-chart mode retains an unobstructed chart. The final theme loads after page-specific market styles so older styles cannot hide the shared navigation or restore the previous palette.

| Area | Treatment |
| --- | --- |
| Terminal | Compact graphite instrument surfaces, jade actions and selected states, subtle abstract waveform, preserved chart workspace. |
| Trenches | Clearer stage hierarchy, compact scanner ornament, jade fresh launches, amber near graduation, pale-ice graduated markets. |
| Replay | A restrained orbital time motif and clearer instrument panels. |
| Gold home | Brass astrolabe, defined membership panel, structured research-tool presentation. |
| Project Passports | Layered evidence folios and a focused token-entry surface. |
| Wallet Watch | Tilted radar ornament, distinct watchlist and inspection work areas. |
| Comparison, library, export verification | Offset evidence planes, archive stack, and geometric integrity seal respectively. |
| Gold AI | Folded aperture, warm research desk, and preserved evidence and conversation controls. |
| Observatory, Saved projects, Briefing | Related radar, archive, and folio motifs with clearer research hierarchy. |
| Atlas, Projects, Creator | Orbital framing, sharper expedition and creator surfaces, preserved project artwork and interactive worlds. |
| Studio, Premium Worlds, Discovery | Construction cube, creator-collection instrument, and trajectory motif; existing previews and game rendering remain intact. |
| Docs, Roadmap, Development, Utility, SolHandle | Indexed documentation, editorial milestones, ledger-style reporting, and restrained project-information surfaces. |

## Interaction repairs

- The tool directory closes when following a destination on the current page, including research hash tabs. Active navigation and breadcrumbs follow research-tab changes and browser history.
- Search and global keyboard shortcuts respect an event already handled by a page control. Navigation expansion supports outside-click and Escape dismissal.
- Snapshot Library Refresh now explains sign-in requirements and reports loading, failure, retry, and success states.
- When a provider cooldown expires while Trenches is paused, manual Refresh and Load more become usable again without an automatic fetch or movement of inspected rows.
- Gold Assistant reads have a 30-second deadline; answer requests have a 60-second deadline. Timeout recovery releases controls, preserves the question, and asks the user to check for a saved answer before retrying. It never automatically resubmits a paid question. Unreadable authentication responses retain their status.
- Gold monitoring reads have a 30-second deadline; scans have a 45-second deadline. Failed scans release controls and retain previous observations with their original collection times.

## Motion, accessibility, and performance

New chapter instruments use CSS transforms without additional canvas renderers, WebGL, dependencies, or network requests. They are decorative, hidden from assistive technology, and cannot intercept clicks. Existing planet and chart rendering remains separate.

Decorative motion respects the device's reduced-motion preference, a shared saved preference, data-saving mode by default, document visibility, and offscreen visibility. The dashboard's existing motion control and the shared control use the same preference. Motion state survives route changes and synchronizes between tabs. Storage failure leaves a working session control. Pointer tilt runs only for visible instruments with a fine pointer and enabled motion. Narrow layouts hide or reduce ornaments to preserve control space.

Collapsed sidebar labels retain accessible names. Focus indicators, keyboard tool search, modal dismissal, and mobile navigation remain available. Protected and inactive panels retain their hidden states; presentation never grants access.

## Verification and limits

Completed checks include TypeScript compilation and native site integrity across **53 rendered routes, 3,980 internal-link occurrences, and 1,740 asset references**. JavaScript syntax checks passed. Lightning CSS parsed both new stylesheets without warnings.

Actual-script fixture checks passed for research refresh, Trenches, Gold Assistant, Gold monitoring, Wallet Watch, Telegram connection UI, Terminal controls and selection, the trading desk, Planet Atlas, and Creator Dashboard. The shared-shell behavioral suite passed **10 tests**, covering motion preferences and lifecycle, legacy controls, navigation expansion, same-page modal closure, search, mobile focus, shortcut conflicts, and absence of network activity from the appearance layer.

Signed-out browser checks confirmed same-page Wallet Watch-to-Snapshot Library navigation closes the directory, the trading rail expands and collapses, and the desktop layout avoids horizontal page overflow. The explicitly labeled Terminal sample verified Candles-to-Line switching and full-chart mode; its simulated chart is a layout check, not evidence of live market-data quality or trade execution. Browser review also inspected Wallet Watch, Terminal, Trenches, Gold AI, Studio, Documentation, and Planet Atlas in phone and tablet viewports (390px and 768px). The observed Terminal decorative overflow was repaired without clipping controls. Terminal and Studio were checked for horizontal page overflow, and the main dashboard was visually reviewed.

No wallet signatures, swaps, paid AI requests, live authenticated account actions, or Telegram sends were performed for this release verification. Fixture coverage does not replace those end-to-end checks. Live provider availability and account-specific behavior retain their existing external dependencies.

Source commit, saved Site version, deployment result, and public GitHub synchronization provenance are recorded by the release process after publication; no pending identifier is asserted here.
