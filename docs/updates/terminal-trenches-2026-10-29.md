# Terminal and Trenches — October 29, 2026

[Open Terminal](https://parallaxlaunch.live/terminal) · [Open Trenches](https://parallaxlaunch.live/trenches) · [Public source snapshot](../../platform-updates/terminal-trenches-2026-10-29/)

Hosted **v215** records native source `3b66a88e96d75b23ccf3ac46a55bebef258a7eb5` after synchronized v212 `71ab595e472670c98b5b047b1bd3b8ba2da690e0`. The update improves the trading workspace and introduces a separate launch-discovery board. This snapshot groups the rollout and its production follow-up fixes since v212, including exact-pool handoff, serialized shared discovery requests, compact swap labels and delayed-data handling.

## A clearer selected-market workspace

The Terminal uses neutral graphite surfaces, a restrained jade accent and muted coral for down moves. The selected token's reported market cap is prominent; an unverified cap remains missing, and available fully diluted valuation is labeled **FDV**. An available delayed exact-pool observation can fill an otherwise empty view, with explicit delay labels; it cannot displace a newer fresh observation. Holder counts include their own observation age, and available token metadata updates the trade labels independently of market availability. Provider-listed website and social links open separately and reject unsafe or credential-bearing URLs. A listed link does not verify the destination's ownership or endorse a project.

The native chart has explicit **Market cap**, **FDV** and **Price** controls. Dollar labels use K/M/B units, and the readout retains detailed underlying values. Valuation views use one exact-pool provider observation and disclose their current supply basis. They estimate historical valuation from price candles; they do not claim historical circulating supply. Unknown, stale, mismatched and unusable bases fall back to the price view. Pool-currency candles are never multiplied by a USD factor; selecting a valuation view deliberately loads USD candles first.

Line mode shows the same candle closes in jade. Candles and trade markers use jade/coral direction colors. Actual wallet fills stay actual execution prices, and average-entry lines appear only with a matching quote currency. Chart display changes do not alter order amounts or open a swap. Existing Phantom connection, explicit Jupiter quote review, saved research, position evidence and Replay remain available.

## Launch discovery in three stages

Trenches separates fresh indexed launchpad pools, incomplete curves approaching graduation, and provider-reported graduated tokens. Completion and migration remain distinct evidence. Token cards preserve the selected mint and pool when opening Terminal. A token's name, address suffix, DEX label or volume does not prove its lifecycle stage.

Each column has its own filters and sorting. Unknown metrics do not silently satisfy required thresholds, valuation filters distinguish reported cap from permitted FDV, and preferences stay on the current device. Stage tabs adapt the board to smaller screens. Refresh and loading states, stale data and provider coverage remain visible.

Filters apply to the loaded indexed sample, not every Solana launch. Provider indexing can lag, and loading another page can add matching tokens. Counts and rankings describe observed data, not future price performance. Holder and project metadata can update less often than price candles.

## Public source and verification

This snapshot contains **49 exact exports totaling 1,018,782 bytes**. Every one of the **26 native changed paths** is classified: **18 exact exports** and **8 source-only summaries**, with **31 unchanged reviewed dependencies** included for the browser pages and offline checks. The shared presentation module already appears on the verifier's exact exception list; no private TypeScript allowlist is widened.

The private implementation reuses existing provider connections and shared caches. Runtime credentials, provider transport, native page routes and service-dependent fixtures remain in the native application. No new subscription or database schema is required by this release.

Run `npm run check:terminal-trenches` for the public chart, filter and browser-controller suites, or `npm run check` for the full public gate. Source-backed verification compares exported bytes to `3b66a88e96d75b23ccf3ac46a55bebef258a7eb5` and classifies the complete delta from v212. GitHub CI checks the public repository; native deployment and public publication are separate release steps.

The earlier [Replay](replay-2026-10-28.md), [worlds and expeditions](worlds-expeditions-2026-10-28.md), [workspace](workspace-2026-10-25.md) and [Terminal](terminal-2026-10-24.md) snapshots remain intact with their original provenance.
