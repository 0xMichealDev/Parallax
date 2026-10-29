# PARALLAX Replay source snapshot — October 28, 2026

This immutable selected-source snapshot records hosted **v212**, source `71ab595e472670c98b5b047b1bd3b8ba2da690e0`, after the previously synchronized v211 revision `c79c3c7ff8f8e0f2a8a71a62138072a0b7433910`.

[Open Replay](https://parallaxlaunch.live/replay) · [Release record](../../docs/updates/replay-2026-10-28.md) · [Exact export ledger](PUBLIC-SYNC.json)

| Record | Value |
| --- | --- |
| Exact exports | 37 files / 492,664 bytes |
| Native changed paths | 22: 16 exported and 6 source-only summaries |
| Shared unchanged dependencies | 21 |
| Public focused checks | Replay core tests and browser-controller fixture harness |

## Included behavior and source

Replay provides a public 1, 6 or 24 hour view of a selected Solana pool, a synchronized transaction timeline, playback and scrub controls, sender/side filters, largest-trade jumps, source links and JSON evidence export. Copied replay links reopen the same captured dataset and preserve the playhead and filters until its original fixed expiry.

The exact browser implementation, page styles, page template, integration links, selected shared navigation styles/scripts, public project catalogs and two focused offline test files are included. The changed navigation/presentation modules were already on the public verifier's exact exception allowlist; this release does not widen that list.

The provider response can contain at most 300 recent indexed trades from the preceding 24 hours, and may cover less time than the chart. Sender totals describe loaded swaps only. Missing USD values remain unknown or visibly partial; token flow is not a wallet balance or profit. Transfers, liquidity events, other pools and extended Gold history are outside this release.

## Public tests

From this snapshot directory, with Node.js 22.13 or newer:

```sh
node --test tests/replay-core.test.cjs
node scripts/test-replay-ui.mjs
```

Both commands use built-in Node modules and public source fixtures. They do not need account credentials, network access, a wallet or private server code. The core tests cover event visibility, sender aggregation, completed-candle timing and share-state round trips. The UI harness covers exact snapshot retries (including expiry), selected-pool continuity, stale-response rejection, terminal error states, missing/partial USD values, original snapshot expiry, keyboard-focus pausing and escaped metadata.

From the public repository root:

```sh
npm run check:replay
node scripts/verify-public-sync.mjs --source /absolute/native-checkout --release replay-2026-10-28
node scripts/verify-public-sync.mjs --base-ref 4e30e7241cac977009ed7eab0b89a47ee01216e7
npm run check
```

The source-backed verifier compares exact committed blobs and accounts for every native changed path. Public-only checks validate the committed export evidence; they cannot independently observe the private backend or deployed Site.

## Scope and dependencies

This is a selected source snapshot, not a complete standalone application. Replay's hosted route, provider normalization, service, credential handling and service fixture suite remain private and are summarized in `sourceOnlyChanges`. The HTML template is normally wrapped by the hosted route. The copied shared browser code still expects compatible hosted APIs or explicit fixtures.

Supporting shared CSS/JavaScript and the two project catalogs are copied unchanged from the new source revision and checked against the preceding reviewed export. Shared artwork and unrelated Terminal/planet renderer dependencies remain in the preserved [worlds snapshot](../worlds-expeditions-2026-10-28/). No new artwork or provider subscription was required for this feature. Existing source availability and third-party licensing terms remain unchanged.

All older snapshots and `historical-platform/` retain their exact content and fingerprints. Generated support is limited to this README and `PROVENANCE.json`; source files retain their native paths and original bytes.
