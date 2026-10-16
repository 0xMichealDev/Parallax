# Homepage Market Radar release

This release makes the existing Terminal visible and directly usable from the homepage.

## Changes

- Market Radar replaces the previous shortcut sidebar beside the orbital hero. It previews up to three provider-ranked pools, their prices, 24-hour changes, pool liquidity, and volume.
- Trending and new-pool modes use the existing `/api/terminal/discovery` service and its shared server cache. Each pool opens token research in `/terminal?token=...`.
- A contract-address form in the hero validates and opens a Solana token in the Terminal. It has a native GET-form fallback and does not connect a wallet or submit a swap.
- A dated “Just shipped” section explains Market Radar, direct research, and the refreshed dashboard. Personal shortcuts to Briefing, Saved projects, and Wallet Watch remain available there.
- Existing dashboard panel keys and the wide-screen centering correction remain intact.

## Data behavior

- Initial reads wait for the market panel to be visible. Automatic refresh pauses offscreen and in hidden tabs.
- Normal reads are at least two minutes apart per mode. Switching back to a still-current mode reuses its in-memory snapshot.
- Provider Retry-After cooldowns apply across both modes. Missing values remain unavailable; they are not shown as zero.
- Snapshot expiry updates the stale indicator even when the next read is scheduled later. Failed refreshes preserve earlier real values with an older-snapshot label.
- Provider text is inserted as text nodes. Token and pool addresses are validated before links are built; no remote token images or arbitrary links are accepted.
- The preview uses pool-specific metrics. Terminal research can select a different indexed pool for the same token; this distinction is noted in the interface.

## Verification

- Eight homepage market tests passed: lazy loading, safe rendering, contract validation, mode races, cache reuse, stale expiry, outage retention, cooldowns, hidden-tab/offscreen behavior, and malformed responses.
- Shared navigation audit passed for 14 page templates, 740 internal links, and 291 asset references.
- Existing saved-layout checks, six home motion/comparison tests, and six guided-tour tests passed.
- New JavaScript and CSS syntax checks passed.
- No backend schema, checkout, wallet signing, or alert-delivery behavior was changed.
- Browser rendering and physical iPhone visual QA were unavailable in the editing environment and remain unverified.
