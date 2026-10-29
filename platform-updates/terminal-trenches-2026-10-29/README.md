# Terminal and Trenches source snapshot — October 29, 2026

This immutable selected-source snapshot records successfully hosted **v215**, native source `3b66a88e96d75b23ccf3ac46a55bebef258a7eb5`, continuing from synchronized v212 `71ab595e472670c98b5b047b1bd3b8ba2da690e0`.

[Open Terminal](https://parallaxlaunch.live/terminal) · [Open Trenches](https://parallaxlaunch.live/trenches) · [Release record](../../docs/updates/terminal-trenches-2026-10-29.md) · [Exact ledger](PUBLIC-SYNC.json)

| Record | Value |
| --- | --- |
| Exact exports | 49 files / 1,018,782 bytes |
| Native changed paths | 26: 18 exported and 8 summarized |
| Reviewed unchanged dependencies | 31 |
| Native baseline | Hosted v212, `71ab595e472670c98b5b047b1bd3b8ba2da690e0` |

## What is included

Terminal presents a prominent reported market cap or separately labeled FDV, indexed holders with observation age, and provider-supplied project links. Available delayed market observations are labeled explicitly and do not replace newer fresh observations. Native chart views separate Market cap, FDV and Price. Currency axes use readable compact units. Historical valuation candles multiply raw USD prices by the current supply implied by one coherent exact-pool valuation/price observation; they are estimates and do not reconstruct historical circulating supply. Pool-quote prices and actual execution prices remain separate.

Trenches is a separate launch-discovery board with fresh, near-graduation and graduated stages, independently filtered and sorted loaded samples, freshness states, device-local preferences and exact token/pool links into Terminal. Provider-reported completion and migration evidence determine lifecycle classification. Missing observations are retained as unknown rather than inferred from token names, price activity or address suffixes.

The reviewed browser controllers, styles, page templates, navigation presentation module, feature documentation, offline tests and required shared browser dependencies are exported without modification. The vendored Lightweight Charts bundle retains its existing license and chart attribution. Other homepage artwork and unrelated world-renderer assets remain in the preserved earlier snapshots.

Private API/provider service code, normalization implementation, hosted routes and service-dependent tests are represented by source-only summaries. This is a public source record, not a complete offline deployment. Runtime credentials, account data and hosting configuration are excluded. Existing licensing and provenance terms remain in effect.

## Run the public fixtures

With Node.js 22.13 or newer, from this snapshot directory:

```sh
node tests/terminal-chart.test.cjs && node --test tests/terminal-workspace.test.cjs tests/terminal-amount.test.cjs tests/trenches-core.test.cjs && node scripts/test-terminal-ui.mjs && node scripts/test-terminal-selection.mjs && node scripts/test-trenches-ui.mjs
```

From the public repository root, `npm run check:terminal-trenches` runs these checks. `npm run check` additionally verifies the export ledger, earlier snapshots and the existing public suites.

Chart fixtures cover K/M/B currency formatting, missing/stale/wrong-pool bases, cap-versus-FDV distinction, unmodified raw data and volume, quote-to-USD switching, entry-line currency matching, time-only fill markers and view restoration. The controller fixtures cover normal and failed requests, selection continuity and browser interaction without real wallets or provider requests. Fixture results do not establish live upstream availability or visual rendering on every device.

All five prior retained directories keep their exact bytes and fingerprints. Generated support is limited to this README and `PROVENANCE.json`; native source files preserve their paths and committed bytes.
