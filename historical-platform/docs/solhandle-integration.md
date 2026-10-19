# SolHandle integration — Parallax

## Shipped scope

- `/solhandle`: integration explanation, live identity lookup, links to Wallet Watch, Atlas, Passports and SolHandle. Partner Mint is explicitly future work.
- Wallet Watch: existing forward `@handle` lookup and current-primary reverse resolution; prominent inspected identity; saved watch rows display current primary handles alongside full addresses. Saved labels are identified as user labels.
- Community and solar-system Atlas cards: optional creator identity enrichment. Detailed community profiles and published worlds show separate wallet-control and project-access information. Curated editorial worlds do not receive fabricated creator identities.
- Project Passports (private and shared): current identities for Parallax profiles linked to the researched token. This panel is separate from saved snapshots, original exports, summaries and SHA-256 fingerprints. A community listing is not token affiliation verification.

Terminal wallet replay (`/terminal#wallet-replay`) retains its existing @handle support. Forward lookups still have a seven-second identity budget and a full-address review before saving. Re-resolution rejects a handle ownership change between inspection and save; saving never enables Telegram rules automatically.

## Data paths

Existing `solhandle-sdk` 1.0.1 uses the configured server RPC transport. Its official program/config/collection/current-asset-owner checks remain intact. No new API keys, mutable owner cache, or handle-based authorization is introduced.

`GET /api/identity/wallet?query=@handle-or-address` resolves identities. `GET /api/identity/project?id=...` reads the original published creator wallet and provides contextual identity plus the requesting user's project permission state. `GET /api/identity/projects?token=...` returns up to three linked public profile creators (with a more-results indicator).

Responses are private/no-store. Identity reads are capped at 120 requests/minute per Worker isolate. The browser runs at most two concurrent requests, deduplicates in-flight identical lookups, and loads cards as they enter view. Labels expire after 60 seconds; Recheck identity resolves ownership again. Optional identity failure retains the underlying wallet address.

## Independent checks

1. Handle ownership: current official SolHandle asset owner, validated by the SDK.
2. Wallet control: published projects required a signed proof at creation. A current proof remains tied to its original Parallax account and exact wallet, with expiration.
3. Project permissions: original `missions.user_id` plus an unexpired proof for `missions.wallet`. Identity lookup never changes either field or grants permission. Token authority and external project affiliation remain unverified.

After a handle transfer, new forward lookups select its new owner, and stale primary records cannot label its former wallet. Saved watches continue following their pinned addresses. Existing projects, signing proofs, Pro holdings and edit access do not transfer.

## Validation

`scripts/test-solhandle.mjs` covers SDK registry/collection/version checks, fresh ownership, transferred primary rejection, saved-watch pinning, and new project identity/permission separation through a simulated transfer. It also covers changed/expired proofs, anonymous reads, linked Passport creators and provider failure. `scripts/test-wallet-ui.mjs`, `scripts/test-control.mjs`, and `tests/wallet-api.mjs` passed. Production build passed. Browser/Phantom/live-mainnet end-to-end QA is not available in this environment.

No outbound partner messages or payments were sent. Partner Mint has no minting implementation in this release.

Historical verification: the prior release resolved `@solhandle` to `CZvu8vnzLKyfGmbpixypQcfW4iiw7em43utW4k6ordYP` on mainnet on October 16, 2026 UTC; it had no Primary Handle at that time. This is historical evidence, not a current ownership assertion. Primary references: https://solhandle.io/developers and https://www.npmjs.com/package/solhandle-sdk.

Repository-wide TypeScript checking still reports the existing QRCode option mismatch in `app/growth-service.ts:33`; no new integration type errors were reported.
