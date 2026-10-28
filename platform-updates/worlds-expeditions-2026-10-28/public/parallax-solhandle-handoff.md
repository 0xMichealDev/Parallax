# PARALLAX × SolHandle — integration handoff

Prepared October 20, 2026. Public implementation notes for partner review.

## Review the existing layouts

- Integration page and public identity lookup: https://parallaxlaunch.live/solhandle
- Wallet Watch: https://parallaxlaunch.live/control#wallet
- Project Atlas: https://parallaxlaunch.live/planets
- Project Passports: https://parallaxlaunch.live/control
- Creator Studio: https://parallaxlaunch.live/studio

Wallet Watch puts the inspected wallet's full address and current Primary Handle beside its balance/history snapshot. Saved rows use a separate personal label and stay pinned to addresses. Snapshot and replay handle observations are explicitly historical; a separate current identity card checks the pinned wallet.

Atlas community cards show the original creator wallet's current Primary Handle. Detailed profiles show handle ownership, the publication-time wallet-control check, and the signed-in viewer's project permission state separately. Editorial worlds have no invented creator identity.

Private and shared Passports display creators of linked community profiles beside the report. The current identity panel is separate from historical report content and fingerprints. Community listing does not prove token affiliation.

## Current implementation contract

The deployed integration uses the public `solhandle-sdk` pinned to 1.0.1 and server-side Solana RPC. No PARALLAX-specific SDK download has been supplied for this review yet. Please send its direct link and version so we can compare interfaces before adopting it.

- Forward lookup verifies the official program, deterministic registry record/asset, protocol version, official collection, and current NFT owner.
- Reverse lookup shows only the wallet's currently owned Primary Handle. Missing, transferred or unavailable identities fall back to the wallet address.
- Identity reads are read-only and return private/no-store responses. No identity owner cache is used by PARALLAX.
- Browser identity cards expire within 60 seconds of request start. They clear when backgrounded and recheck on return into view. Late responses cannot restore an invalidated label. Full addresses remain available.
- Wallet-control proofs require a signed challenge and remain tied to the authenticated account and exact wallet, with expiration.
- Project changes require the original creator account and an unexpired proof for the recorded creator wallet. Handle resolution never grants permission.
- Saving a handle watch rechecks ownership against the reviewed address. Later transfers do not move saved watches, Telegram rules, project records, wallet proofs or holder-gated access.

## Read-only integration endpoints

`GET /api/identity/wallet?query=@handle-or-address`

Returns the canonical address and identity metadata: provider, network, status, lookup type, handle, asset address and check time. Forward resolution failures never select an unverified wallet.

`GET /api/identity/project?id=published-profile-id`

Returns the recorded creator wallet, current identity, publication-time wallet verification context, and the current viewer's independent project permission state. Project IDs come from actual published profiles.

`GET /api/identity/projects?token=solana-token-address`

Returns up to three linked community profile creators and a more-results indicator. It does not certify external project or token authority.

## Validation evidence and remaining joint checks

Local automated tests cover transferred NFT ownership, stale Primary Handle rejection, wrong program/collection/version, retired and missing handles, RPC failures, watch pinning, expired/changed wallet proofs, and actual project-update authorization after a simulated handle transfer. UI lifecycle tests cover background and browser back-forward restoration, late responses, expiry, address preservation, request deduplication and bounded concurrency.

A public mainnet read on October 20, 2026 resolved `@solhandle` through PARALLAX. This is timestamped lookup evidence, not a permanent ownership assertion or official partner certification.

Still to complete together: review the dedicated partner package, test with partner-provided owned Primary Handles, perform an authorized real NFT transfer with both owners, and verify the signed wallet flows on iPhone/Phantom and desktop. No real NFT transfer or user wallet signature was performed in this development session. Local simulated tests do not replace that joint live verification.

Partner Mint remains a later phase. No minting, payment, fee-split, or transfer interface is introduced by this release.

References: https://solhandle.io/developers and https://solhandle.io/docs
