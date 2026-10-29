# Terminal and Trenches validation follow-up

This immutable selected-source snapshot records successfully hosted **v216**, native source `610995b2368af062314d4e41ad24be8ce0207ea3`, after v215 `3b66a88e96d75b23ccf3ac46a55bebef258a7eb5`.

[Terminal](https://parallaxlaunch.live/terminal) · [Trenches](https://parallaxlaunch.live/trenches) · [Release record](../../docs/updates/terminal-trenches-validation-2026-10-29.md) · [Exact ledger](PUBLIC-SYNC.json)

The only native change is an offline Terminal selection assertion. Supported Node.js/ICU versions can format the same compact USD amount as `$20K` or `$20.00K`. The fixture accepts those equivalent displays while still checking the selected pool's $20,000 observation and rejecting the unrelated pool's metrics. No hosted runtime code or visual styling changed.

The snapshot contains **3 exact exports (101,324 bytes)**: the changed selection test and its two unchanged input files, `app/terminal.html` and `public/terminal.js`. The test reads those files directly from its current working directory; it makes no real wallet or provider requests.

From this directory, run:

```sh
node scripts/test-terminal-selection.mjs
```

From the repository root, `npm run check:terminal-trenches` retains the chart, workspace, amount, filters, Terminal UI and Trenches UI suites in the original v215 snapshot, then runs the corrected selection suite from this snapshot. No selection scenarios or other suites are skipped. `npm run check` continues to run the full public gate.

All six earlier retained directories, including the complete v215 feature snapshot, preserve their exact published bytes. No private service, runtime configuration or credentials are included. Existing provenance and licensing terms remain in effect.
