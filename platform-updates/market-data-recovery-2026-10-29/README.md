# Market data recovery

[Live Terminal](https://parallaxlaunch.live/terminal) · [Live Trenches](https://parallaxlaunch.live/trenches) · [Release record](../../docs/updates/market-data-recovery-2026-10-29.md)

This immutable source snapshot records hosted **v220**, native revision `33f8c23fa4aca7e181f4713531a066f6ac5c822a`, after synchronized v217 `fddfd0fac87276fe1806c05255f9899bdbd7a62f`. It groups the recovery revisions made since that public baseline.

## What changed

This release addresses a shared market-data allowance failure that left the Trenches stages empty and prevented Terminal charts from loading. After the base application allowance, the paid data path can receive a bounded additional grant only after the server verifies sufficient included account and key capacity. Shared inspections, a hard daily ceiling, a reserve and short revalidation windows constrain those grants. Actual account credit figures remain private.

The existing public provider remains a separately bounded fallback when a local paid allowance cannot cover an operation. Genuine upstream throttling and authentication failures retain their error and cooldown handling. Existing discovery and chart observations can remain available for display for up to 24 hours from their original observation, explicitly marked stale. Token/pool identity verification and trade-review boundaries remain intact.

Terminal opening discovery and metadata enrichment are bounded; the selected native chart has priority over automatic deeper discovery. Deeper pages retain their own observations, retries respect server guidance and deferred holder details no longer remain labelled as loading.

## Export scope

The snapshot contains **52 exact source files totaling 1,122,725 bytes**. All **15** native changed paths are classified: **10** changed paths are exported and **5** private implementation or dependent test paths have source-only summaries. The other **42** files are reviewed unchanged browser, shared-presentation and fixture dependencies.

`PUBLIC-SYNC.json` is the authoritative manifest. `PROVENANCE.json` records exact Git-blob hashes, the full change classification and fingerprints for all eight retained historical directories. Earlier snapshots remain unchanged. Private services, account data, credentials and deployment configuration are excluded.

## Run the focused checks

From the repository root, run `npm run check:market-recovery`. Run `npm run check` for the complete retained public gate. The public suites use offline fixtures without a wallet, provider connection or credentials. Native server fixtures are summarized separately.

## Practical limits

Discovery remains an indexed provider sample. Recovery snapshots are historical observations, not current prices, and their original timestamps remain visible. Source coverage and provider limits can still constrain a response. Account activity elsewhere can change remaining capacity between inspections. No subscription or overage billing setting was changed, and no wallet transaction was performed as part of this release.

Passing public checks establishes fixture behavior and source provenance, not live provider availability or correctness of excluded private services. See the [product and data guide](docs/terminal-trenches.md), [connection and allowance policy](docs/coingecko-connection.md) and [release record](../../docs/updates/market-data-recovery-2026-10-29.md).
