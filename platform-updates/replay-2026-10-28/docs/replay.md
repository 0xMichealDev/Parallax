# PARALLAX Replay

Replay is a public, on-demand view of recent Solana pool activity at `/replay`. Choose a token or one of the PRLX, SHEEPLE and GATTO shortcuts, then inspect a 1, 6 or 24 hour window. The Terminal and project pages link directly to the selected token.

## Experience

- Play, pause, rewind and scrub the timeline, with 0.5× to 8× playback speed.
- Inspect completed USD candle closes and individual loaded buy/sell events.
- Jump to the largest loaded buy or sell, filter by side, or follow a transaction sender.
- Review sender totals through the playhead. Net tokens means bought minus sold in the loaded swaps; it is not balance, cost basis or profit.
- Open each selected transaction and sender in Solscan.
- Copy a replay link that preserves the captured dataset, playhead and filters for seven days. Export the underlying evidence as JSON.

## Data and limitations

The first release uses the existing CoinGecko connection, or the existing GeckoTerminal fallback when no Pro key is configured. One selected pool is verified against the requested mint before fetching trades or candles. Swaps are classified from the target token's actual input or output leg. Trade IDs, not just transaction signatures, determine uniqueness.

The ordinary trade feed returns up to 300 recent indexed swaps within the preceding 24 hours. This can be shorter than the selected chart window. The interface shows loaded counts, trade timestamps, cap truncation, missing USD values and the capture time. Provider-flagged anomalous trades are excluded. Transfers, liquidity changes, other pools and complete historical wallet P&L are outside this release. A transaction sender can represent a router or shared account; it is not an identified person.

Only completed candles are returned and a close appears during playback after its interval has ended. Empty candle intervals are omitted. The chart range and the available trade history remain separate.

Public project-wallet website associations, where present, are captured with their verification timestamps. A saved label describes the association observed at capture time. It does not imply a current association, token safety or direct treasury control.

## Sharing and cost control

Recent replays share a two-minute cache. Resolved pool metadata is cached for five minutes. Upstream requests use the existing global provider quota and cooldown; an additional minute allowance bounds uncached replay builds. No provider key enters a URL or browser response. Credentials remain server-side.

Snapshots are immutable, content-addressed records with a fixed seven-day lifetime. Opening a saved link reads that record without refreshing external data. Expired or absent records return an explicit unavailable state; the user can load a new recent replay. This release uses the existing market-cache table and requires no database migration or new paid provider.

## Verification

`node scripts/test-replay.mjs` checks provider normalization, selected-pool matching, candle timing, missing values, capped coverage, credential handling, cache reuse, immutable snapshot retrieval/expiry and rate limits. `node --test tests/replay-core.test.cjs` checks playback filtering, sender aggregates and share-state round trips.

Longer history, multi-pool aggregation, transfers/liquidity event replay and additional Gold features remain future work.
