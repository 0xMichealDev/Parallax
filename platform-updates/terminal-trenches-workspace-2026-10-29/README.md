# Terminal and Trenches market workspace

[Live Terminal](https://parallaxlaunch.live/terminal) · [Live Trenches](https://parallaxlaunch.live/trenches) · [Release record](../../docs/updates/terminal-trenches-workspace-2026-10-29.md)

This immutable source snapshot records hosted **v217**, native revision `fddfd0fac87276fe1806c05255f9899bdbd7a62f`, after synchronized v216 `610995b2368af062314d4e41ad24be8ce0207ea3`.

## What changed

Terminal and Trenches now share a compact midnight workspace with soft iris accents, mint and rose market signals, clear navigation and a wider working area. The Terminal has a tighter market strip, a collapsible discovery panel, focused chart controls and a `/` search shortcut. Its chart, trade review, position and research features retain their existing roles.

Trenches uses dense independently scrolling desktop columns and stage tabs on smaller screens. Compact and Comfortable density, up to 20 device-local pins, a pinned filter, copy-contract actions and direct contract inspection make repeated scanning easier. Rows retain exact token/pool handoffs and distinguish market cap, FDV, price movement, liquidity or reserves, activity and observation age.

Discovery progressively opens up to three provider pages per stage when available, with explicit loading through page 10. Per-page snapshot ages and an older-observation indicator keep retained pages distinct from a freshly returned first page. Automatic refresh respects pause, hidden tabs and active pointer, keyboard or scroll interaction. Private service changes expand bounded source coverage and retain lifecycle verification.

## Export scope

The snapshot contains **50 exact source files totaling 1,090,727 bytes**. All **20** changed native paths are classified: **15** changed paths are exported and **5** private implementation or dependent test paths have source-only summaries. The other **35** files are reviewed unchanged browser, shared-presentation and fixture dependencies.

`PUBLIC-SYNC.json` is the authoritative manifest. `PROVENANCE.json` records file hashes, the complete change classification and fingerprints for all seven retained historical directories. Source exports were read from the exact Git objects above, with the original source-relative paths and executable modes. Older snapshots remain unchanged.

The reviewed `app/workspace-shell.ts` presentation module is the sole TypeScript allowlist exception. Native service and route implementation, database code, authentication, credentials and deployment configuration are excluded. This is a source record and testable browser slice, not a standalone copy of the hosted application. The native routes apply the exported workspace styles to the templates.

## Run the focused checks

From this snapshot directory, using the repository's supported Node.js version:

```sh
node --test tests/terminal-chart.test.cjs tests/terminal-workspace.test.cjs tests/terminal-amount.test.cjs tests/trenches-core.test.cjs
node scripts/test-terminal-ui.mjs
node scripts/test-trenches-ui.mjs
node scripts/test-terminal-selection.mjs
```

From the repository root, run `npm run check:market-workspace` for those checks or `npm run check` for the full retained public gate. The public suites use fixtures without a wallet, credentials or a provider connection. Native server fixtures are summarized separately and do not run in this public kit.

## Data and validation limits

The board displays a bounded indexed sample, not every Solana launch or an immediate market stream. First-page discovery observations use five-minute provider caches; deeper pages use 15-minute caches. A returned cached response does not establish a new upstream observation. Available row counts vary with provider coverage, lifecycle eligibility, deduplication and filters.

Market cap and FDV remain separate. Historical valuation candles use a disclosed current supply estimate; holder metadata has its own observation time. A missing measurement stays unavailable. Local pins are not account-synced research saves. No wallet transaction was performed during this release's layout and regression checks.

See the exported [product and data guide](docs/terminal-trenches.md) for detailed behavior. Passing public checks establishes the exported fixture behavior and provenance, not live provider availability or private application correctness.
