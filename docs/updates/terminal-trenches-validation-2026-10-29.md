# Terminal and Trenches validation follow-up

[Terminal](https://parallaxlaunch.live/terminal) · [Trenches](https://parallaxlaunch.live/trenches) · [Source snapshot](../../platform-updates/terminal-trenches-validation-2026-10-29/)

Hosted **v216** records native source `610995b2368af062314d4e41ad24be8ce0207ea3`, following synchronized v215 `3b66a88e96d75b23ccf3ac46a55bebef258a7eb5`. This release changes one offline test assertion; Terminal and Trenches runtime behavior and design are unchanged.

## Why the fixture changed

The initial public v215 checks passed on Node.js 24 but its selection fixture failed on Node.js 22 because compact currency formatting produced `$20.00K` where the assertion expected `$20K`. Both strings represent the same $20,000 observation. The corrected assertion accepts the supported formatting variants while preserving its exact-pool rendering check and the rest of the selection, stale-data and link-safety scenarios.

## What is published

The follow-up exports **3 exact files totaling 101,324 bytes**. The single native changed path, `scripts/test-terminal-selection.mjs`, is exported. The unchanged Terminal template and controller are included because the fixture reads them directly. No private source summaries or verifier exceptions are needed.

The root `check:terminal-trenches` command continues to run the original chart, workspace, amount, filter, Terminal UI and Trenches UI suites. It runs the corrected selection fixture from the new snapshot rather than altering the published v215 archive. Every existing snapshot remains intact, including the full [Terminal and Trenches feature record](terminal-trenches-2026-10-29.md).

Source-backed validation checks exact native Git objects and the complete one-file delta. GitHub CI validates the public checkout on its configured Node.js versions; it does not independently observe native deployment or live data availability. The five-minute launch-discovery snapshots, valuation-basis disclosure, holder freshness and provider coverage boundaries from v215 remain unchanged.
