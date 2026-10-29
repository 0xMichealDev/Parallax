# Terminal and Trenches market workspace

[Terminal](https://parallaxlaunch.live/terminal) · [Trenches](https://parallaxlaunch.live/trenches) · [Source snapshot](../../platform-updates/terminal-trenches-workspace-2026-10-29/)

Hosted **v217** records native source `fddfd0fac87276fe1806c05255f9899bdbd7a62f`, following synchronized v216 `610995b2368af062314d4e41ad24be8ce0207ea3`. The native build and deployment completed successfully. This release redesigns the two market pages and expands their bounded discovery workflow while preserving explicit token/pool selection and trade review.

## A focused market workspace

Both pages use a shared midnight palette with soft iris accents. Mint and rose distinguish market direction, while neutral borders and text separate controls and data. Compact navigation links Terminal, Trenches, Replay and Workspace without the previous wide research sidebar competing with the market view.

The desktop Terminal places a compact token and metric strip above the chart, discovery to its left and trade review to its right. The discovery-panel control can reclaim chart width. Focus chart, the research drawer, position and fills, saved projects and wallet replay remain available. Pressing `/` selects token-address search when the user is not typing in another control or using a dialog.

The chart uses the matching palette and preserves its cap, FDV and price transformations, actual execution-marker timing and price/quote invariants. This is a presentation and workspace change, not a change to swap approval.

## A denser Trenches board

Fresh launches, Near graduation and Graduated have compact sticky headers, independent scrolling and per-stage filters. Compact density is the default; Comfortable density provides more room. On smaller screens, stage tabs retain the same data and preferences.

Rows put token identity and reported market cap or labeled FDV first, followed by the selected volume window, liquidity or reserves, five-minute change, holders, buy/sell counts and lifecycle evidence. Pool age and market-observation age are separate. Missing metrics remain unavailable.

Up to **20 device-local pins** retain a token's mint, pool and symbol. Their strip opens the saved market directly; the Pinned filter narrows the loaded stages. Copy-contract buttons, explorer and project links, keyboard search and an explicit pasted-contract handoff reduce repeated navigation. These actions do not initiate a trade, and local pins remain separate from account-saved research.

## Broader coverage with explicit observation ages

The board progressively opens pages 1 through 3 when the source offers additional pages. Users can explicitly load further pages through page 10. It merges duplicates while retaining the chosen observation and exact pool. Deeper pages are not fetched again on every first-page refresh.

The private service update expands deeper launch discovery and graduated-candidate verification within the existing bounded request, cache and cooldown model. Lifecycle qualification still requires provider evidence and token/pool matching; broader coverage does not infer graduation from a name, address suffix or activity alone.

Each row now carries the age of the page that supplied it. The first-page column timestamp, row-level ages and an older-snapshot indicator prevent a recently returned first page from making retained older pages look new. Hover, focus, touch and scrolling hold incoming row reordering until interaction ends. Pause and hidden tabs also stop automatic loading; source errors preserve prior observations with a failure message.

## What was exported

The release exports **50 exact native files totaling 1,090,727 bytes**. The complete **20-path** native delta is classified as **15 changed exports** and **5 source-only summaries**, with **35 unchanged dependencies** included for shared presentation and offline checks.

Every added or modified public browser file is exported, including the new `market-workspace.css` and `terminal-pro.css`. The sole reviewed TypeScript presentation exception is `app/workspace-shell.ts`. Native service and route implementation and two server-dependent fixture files remain private; their changes are summarized in the manifest. No native hosting configuration, database implementation or credentials are included.

All seven earlier snapshot/archive directories retain their fingerprints and original contents. The new `check:market-workspace` command is appended to the public gate, preserving the existing historical suites and corrected v216 selection fixture.

## Validation and practical limits

The native release passed the Terminal service, pre-bond, upgrade and actual-Worker checks, trading-desk and browser regressions, chart and workspace checks, and the expanded Trenches core/UI scenarios. Desktop and 390-pixel responsive layouts were inspected in the native preview. Production checks confirmed all three discovery stages populated, pin and copy behavior, exact token/pool handoff into Terminal, the native valuation chart and explicit delayed-observation labeling. No wallet transaction was performed.

The new public snapshot runs chart, workspace, amount, Trenches core, Terminal UI, Trenches UI and exact-selection suites. These exercise pins, density, search handoffs, page loading, request lifecycle, snapshot ages, stale/error behavior, exact pool links, chart transformations and existing execution boundaries. The source-backed verifier checks every exported byte against the recorded native commit and verifies complete delta classification; the public-baseline gate checks that older releases remain intact.

GitHub CI validates the exported public checkout on its configured Node.js versions. It does not independently observe the native deployment, execute excluded private server tests or establish live provider availability.

Discovery remains a **bounded indexed sample**, with **five-minute first-page caches** and **15-minute deeper-page caches**. Provider coverage, lifecycle eligibility, duplicate removal and filters determine the displayed count. A refresh can return a cached observation, and the board is not an immediate stream of every Solana launch. Holder observations have their own timestamps. Market cap and FDV remain distinct; historical valuation candles disclose their current supply basis.

The exported [Terminal and Trenches guide](../../platform-updates/terminal-trenches-workspace-2026-10-29/docs/terminal-trenches.md) records the product behavior, source boundaries and refresh policy in detail.
