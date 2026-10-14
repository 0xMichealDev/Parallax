# Token utility: project research panels

The `/utility` hub connects the existing Premium Worlds purchase to cinematic planet identity, matching Studio artwork, and an optional public Project Passport panel. The new panel uses the existing project-bound paid order; it does not create a second invoice or alter the configured price, mint, merchant wallet, or payment verification.

## Creator journey

1. Publish a world in Studio and link its token contract.
2. Collect a Project Passport for that exact contract in `/control` (free).
3. Open `/utility?project=…`, select a saved snapshot and inspect its private preview. The current shared AI summary is also previewed, or the page explicitly says there is none.
4. Unlock Premium Worlds for this project if necessary. Verify its creator wallet, select the public-sharing checkbox, and publish the panel.
5. The public world and legacy mission page load the selected snapshot. A creator can replace or remove the panel. Research remains freely available outside the premium presentation feature.

## Access and publication boundaries

- Authenticated account ownership, a paid order for the same project/account/wallet, a current verified creator wallet, and the exact linked token address are checked on publication.
- Previews do not create shared links. Publication atomically creates a public share (if necessary) and attaches its exact token to the project. Existing shared summaries are preserved.
- Each public request rechecks paid entitlement, account/wallet ownership, token-address match and the current share token. No private report, wallet watchlist, account identifier or payment record is returned.
- Revoking the share or deleting the report hides the public panel. Re-sharing that report under a new token does not restore the old panel; the creator must explicitly publish again.
- Replacing/removing a panel does not revoke previously shared passport links. This is explained before publication and removal. Use the existing Research revoke action to make the passport private again. Previously downloaded copies cannot be withdrawn.
- Account owners can remove their panel even if wallet verification expires. Project deletion cascades the panel; purchase receipts remain.

## Data presentation

Panels show historical collection times, a 24-hour stale notice, linked sources and their retrieval status, explicit unavailable values, evidence gaps, and the immutable SHA-256 fingerprint. Market metrics represent the selected indexed pair, not aggregate token activity. The fingerprint checks exported file integrity; it is not an onchain proof or token safety certification. Paid presentation does not change the research or imply endorsement.

Premium payments continue to go to the owner-managed PARALLAX Development Fund wallet. No automatic treasury allocation, buyback or revenue-sharing mechanism is introduced.

## Validation

- `node tests/utility.mjs`: real SQLite migrations and access/publication/revocation/rollback/deletion checks, plus public renderer safety and data-format checks.
- `node tests/utility-client.mjs`: creator UI state, explicit consent, replacement/removal behavior and stale asynchronous preview handling.
- Existing premium server/client, creator dashboard and traffic-counter checks continue to pass.
- TypeScript and the production Sites build are required before publishing. No real payment or token launch is performed by these tests. Native browser/device QA is not available in this managed execution environment; iPhone and Phantom purchase validation remain manual.
