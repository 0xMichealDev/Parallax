# SolHandle integration

Wallet Watch (`/control#wallet`) and Terminal wallet replay (`/terminal#wallet-replay`) accept `@handle` input alongside public Solana wallet addresses.

- The pinned official `solhandle-sdk` 1.0.1 resolves handles using the site's configured Solana RPC transport. It validates the program, deterministic handle and asset records, protocol version, official Metaplex collection, and current asset owner.
- Explicit wallet addresses receive optional Primary Handle enrichment. A primary record is displayed only while that wallet still owns the matching official asset. Missing primary handles and failed lookups have separate states.
- Every inspection resolves current chain state. Identity work has a seven-second budget; the existing RPC transport keeps credentials server-side and bounds retries. Address-based research continues if optional identity lookup fails.
- Results disclose the full wallet address and identity-check time. UI responses are discarded after the input or selected token changes.
- Saving an @handle requires inspecting its address first. The server resolves again and rejects an ownership change between inspection and saving. Watches persist the reviewed address and never retarget automatically. Saving does not enable Telegram alerts.
- This release supports read-only identity lookup. It does not mint names, change Primary Handles, initiate payments, or claim official SolHandle partner certification.

## Validation

- `node scripts/test-solhandle.mjs`: official-record validation, transfers, stale primary rejection, missing names, outages, authorization, address pinning, and Terminal integration.
- Existing control, monitoring, Terminal, wallet renderer, and Terminal renderer suites pass with the new input path.
- `node scripts/test-terminal-worker.mjs`: imported services operate inside the Workers runtime.
- TypeScript validation and the production build pass.
- A read-only Mainnet check resolved `@solhandle` to `CZvu8vnzLKyfGmbpixypQcfW4iiw7em43utW4k6ordYP`, with verified collection membership; its reverse lookup had no Primary Handle at test time (October 16, 2026 UTC).
- Browser/device layout testing was unavailable in this session.

Primary references: https://solhandle.io/developers and https://www.npmjs.com/package/solhandle-sdk.
