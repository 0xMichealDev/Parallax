# Market data recovery

[Terminal](https://parallaxlaunch.live/terminal) · [Trenches](https://parallaxlaunch.live/trenches) · [Source snapshot](../../platform-updates/market-data-recovery-2026-10-29/)

Hosted **v220** records native source `33f8c23fa4aca7e181f4713531a066f6ac5c822a`, following synchronized v217 `fddfd0fac87276fe1806c05255f9899bdbd7a62f`. This snapshot groups the recovery revisions since that public baseline.

## Failure addressed

Trenches and Terminal shared a market-data dependency whose fixed application-side daily allowance had been exhausted. The configured paid account still had included capacity, while the public backup was returning upstream rate limits. Without a usable response or retained server snapshot, a new visit could show empty discovery stages and no chart. This release addresses the application allowance and unnecessary client demand while retaining explicit provider limits.

## Verified paid capacity

After the base application allowance, the server can authorize additional requests only after verifying the account and key's remaining included capacity through the fixed official account-usage endpoint. Strict numeric validation, a shared inspection lease and atomic usage reservations prevent concurrent visitors from duplicating grants.

Grants are bounded in size and total daily usage, retain an included-credit reserve, expire for revalidation and have a separate minute ceiling based on the stricter verified provider limits. Revalidating an unused grant does not increase its ceiling. Missing, invalid or insufficient capacity stops additional paid usage and backs off. Existing usage counters remain intact, and no subscription or overage billing setting is changed.

Capacity checks use the existing server-held credential. Actual account figures, account identities and credentials are not published in browser code or API responses. A bounded owner diagnostic stays in private runtime records. The exported [connection guide](../../platform-updates/market-data-recovery-2026-10-29/docs/coingecko-connection.md) records the exact limits and official provider references.

## Recovery and client behavior

Eligible read-only market operations can use the existing public GeckoTerminal path when their local paid allowance cannot cover a request. That path has independent caches and limits. Genuine upstream throttling and authentication failures retain their existing error and cooldown handling.

Existing discovery and chart observations can be retained for up to 24 hours from their original observation time. A recovery response preserves that time and reports the data as stale. Exact token/pool identity checks and independent transaction quote requirements remain enforced.

The Terminal limits initial automatic discovery to three pages, retains deeper-page observations and bounds automatic row metadata enrichment to four new checks per two minutes with at most two in flight. The selected native chart finishes before automatic deeper discovery. Deferred holder details remain explicitly unknown until checked. Client retries respect server cooldown guidance, including successful responses containing older observations. Updated asset versions load the repaired clients for existing visitors.

## Export and provenance

The release exports **52 exact native files totaling 1,122,725 bytes**. The complete **15-path** native delta is classified as **10 changed exports** and **5 source-only summaries**, with **42 unchanged dependencies** included for shared presentation and offline checks.

All changed public browser files and both reviewed data guides are exported. Private provider services and server-dependent fixtures are summarized in the manifest. Private database implementation, account records, credentials and hosting configuration are excluded. The existing reviewed `app/workspace-shell.ts` presentation exception is retained without expanding the allowlist.

All eight earlier snapshot/archive directories retain their fingerprints and original contents. `check:market-recovery` is appended to the public gate, preserving every historical suite.

## Validation and limits

The native production build and deployment completed successfully. Focused service, pre-bond, upgrade, Replay and pulse checks passed. Recovery fixtures and the actual Worker/D1 suite exercised budget and verified-capacity behavior, provider isolation, request accounting, exact-pool rejection, retained observations and expiry. The private service suites remain separate from exported browser checks.

The exported chart, workspace, amount, Trenches core and five request-budget checks passed, along with Terminal UI, Trenches UI and exact-selection suites. They cover selected-chart priority, bounded opening pages and row metadata, preserved deeper snapshots, cooldowns on both errors and retained HTTP-200 responses, hidden/departed pages and dated holder retention.

Production verification of v220 showed all three Trenches feeds ready with current CoinGecko observations and **130 distinct tokens loaded**. The displayed stage counts were **86 Fresh**, **7 Near graduation** and **42 Graduated**; stage samples can overlap, so their sum is not a unique-token count. The native Terminal chart rendered current CoinGecko one-minute USD candles for the explicit DUBBLE token/pool selection, and the selected-pool metrics were current. These were observations during this check, not fixed coverage or availability guarantees. No wallet transaction was performed.

Public CI validates the exported checkout on its configured Node.js versions. It cannot independently observe the hosted deployment, execute excluded private server tests or establish continuous provider availability.

Discovery remains a bounded indexed sample, not an immediate stream of every Solana launch. Retained data is historical and visibly identified; source coverage, cache age, lifecycle eligibility and filters determine displayed rows. Other account activity can alter included capacity between inspections. No wallet transaction was performed during this release. The exported [Terminal and Trenches guide](../../platform-updates/market-data-recovery-2026-10-29/docs/terminal-trenches.md) records the recovery and refresh policy.
