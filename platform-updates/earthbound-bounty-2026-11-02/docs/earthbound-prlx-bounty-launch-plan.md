# Future PRLX bounty launch: requirements, not an enabled feature

The shipped mode uses free practice credits. This document is a proposed design for a later real-token release, not a legal clearance, security audit, implemented escrow, or promise of token value.

## Entry and escrow

- Resolve the official PRLX mint and token-program variant through verified project configuration; never accept a mint supplied by a browser. Specify supported transfer extensions and exclude unsupported transfer-fee or freeze behavior.
- Create a unique match ID and immutable rules hash. Quote an exact integer amount of token base units at entry, with a short expiry and a named price source if marketing the entry as approximately $5. Token prices move: lock the amount for the match and display it before signing; never promise a $5 redemption value.
- Use an independently audited Solana escrow program with a per-match vault, bounded entry list, deposit receipts, refund deadline and explicit settlement state machine. A verified deposit can fund only one entry. The game server must never hold wallet seed phrases or request unlimited spending approval.
- Close entries before combat begins. Reconcile finality, failed/duplicate transactions, token decimals, rent and fees. Publish what happens if there are too few players, the match fails to start, or the service is interrupted.

## Results and payment

- Replace anonymous sessions with signed wallet authentication and durable player/match identities. Store an append-only event ledger with unique entry, kill, extraction and settlement IDs. Reconnect must recover the same entry rather than create another life.
- The browser submits intentions, never balances, damage awards or payout amounts. The authoritative simulation records results. A server-authorized result alone is a trust assumption; define and disclose the operator trust model.
- Use delayed, idempotent settlement. Commit a complete result set and conservation proof: deposits equal payouts plus disclosed fees plus refunds/unclaimed handling. Define dispute/review windows and bounded settlement timeouts before accepting funds.
- Define the real-token disconnect and timeout policy separately. The prototype's disappearing unclaimed credits must not become stranded token balances. Specify audited refund, redistribution or other legally reviewed treatment for every deposited unit.
- Require independent authorization for settlement, protected signing keys, key rotation, monitoring, reconciliation and incident procedures. Include emergency pause and time-bounded refunds without an unrestricted operator withdrawal path.

## Fairness and abuse work

- Move all movement, collision, weapon cadence, ammo, aim constraints and lag compensation to an authoritative tick simulation. The current prototype still accepts bounded client positions and is not adequate for real stakes.
- Test wall hacks/position spoofing, packet replay, teleporting, altered client modes, duplicate logins, reconnect races, latency advantages, intentional disconnects, collusion, win trading and multiple identities. Add replay evidence, moderation and appeals.
- Load-test full lobbies with separate real clients and representative latency/device conditions, then run a sustained free-credit beta. Audit the escrow and settlement integration independently and exercise refund recovery on a test network before any mainnet deposits.

## Legal and launch decisions still required

- Obtain jurisdiction-specific counsel's review of the proposed paid competitive format, prize rules, token use, age eligibility, geographic restrictions, consumer disclosures, taxes and any applicable licensing or identity obligations. Skill-based gameplay alone is not a legal determination.
- Decide the launch jurisdictions, operator entity, age policy, fees, refunds, disputes, unclaimed-token treatment, pricing source and settlement authority. These are unresolved product and legal inputs.
- Do not enable real-token entry until those decisions, independent security review and operational readiness checks are complete. Keep the practice and real-token modes clearly separate.
