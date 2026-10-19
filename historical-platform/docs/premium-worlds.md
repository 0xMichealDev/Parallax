# Premium Worlds v1

The storefront is `/premium`. It offers three cinematic backgrounds, volcanic/glacial/bioluminescent materials, signature halo/double-halo/stardust rings, three lighting directions, atmospheric glow, a brand accent, companion moons, and matching artwork in the existing Studio. Base creation and publishing remain free.

## SOL checkout migration · October 19, 2026

New purchases use native SOL. The owner requested the currency change; a SOL price has not yet been supplied. Checkout remains closed until an explicit `PREMIUM_SOL_PRICE` is configured. **Never reinterpret the legacy 600000 PRLX price as SOL.** The existing owner-designated merchant wallet is preserved.

| Variable | Required value |
| --- | --- |
| `PRLX_CHECKOUT_ENABLED` | `true` to accept new payment requests; any other value pauses them |
| `PRLX_MERCHANT_WALLET` | Existing owner-designated Solana receiving wallet; an on-curve public address |
| `PREMIUM_SOL_PRICE` | Owner-approved exact positive SOL amount per project; at most nine decimals, no exponent or commas |
| `PRLX_PREMIUM_PRICE` | Legacy configuration only; ignored for new invoices |

Deploy after updating runtime variables. Existing `SOLANA_RPC_URL` and optional fallback are reused. Mainnet genesis is verified before invoice creation, preparation and payment verification. SOL uses the currency discriminator `SOL` in invoice storage and nine decimals; it is never treated as wrapped SOL or an SPL token.

Existing paid PRLX purchases keep their benefits and receipts. Unpaid PRLX invoices are recovery-only: no new token transaction, payment URL or QR is offered. Previously submitted token payments can still be finalized and recovered. A project may have a legacy pending invoice and a native SOL pending invoice, but only one paid invoice. Receipt amounts retain their original currency; development reporting separates SOL and PRLX totals.

No live transfer has been made during development.

## Development fund

Premium Worlds proceeds are designated for PARALLAX project development and future updates. Checkout sends the full invoice amount directly to the owner-designated receiving wallet; network fees are separate. The storefront links that wallet on Solscan and explains that it is managed by the project owner. This designation does not introduce a smart-contract pool, spending enforcement, automated allocation or public expense accounting. Do not present the wallet balance as premium revenue: it can include unrelated transfers.

## Behavior

- A native signed-in account and verified creator wallet create one current SOL invoice per published project. Price, currency, recipient, payer and reference are immutable snapshots. Existing invoices retain their quoted price when the catalog changes.
- Phantom receives an unsigned transaction containing the invoice memo followed by an exact native `SystemProgram.transfer`, with the invoice reference as a read-only non-signing account. The payer’s SOL balance is checked against the invoice amount plus the fee for that message. The customer approves and broadcasts it. Mobile Solana Pay and an authenticated QR endpoint use the same invoice.
- Verification queries `getTransaction` at finalized commitment. It checks signature, successful execution, payer signature, System Program, exact transfer amount, recipient, invoice reference inside the transfer instruction, memo and corresponding lamport balance changes. Legacy recovery retains the original PRLX mint/program/decimal and token-balance checks.
- Partial unique paid-project and pending-project/currency indexes, plus unique reference and transaction-signature indexes enforce invoice and receipt uniqueness. A repeated verification returns the saved receipt. The UI warns against retrying a pending payment and provides explicit recovery/retry controls. A direct transfer outside the invoice is not an order payment.
- Pausing checkout prevents new orders and new prepared transactions, but still verifies previously submitted payments and restores existing access. A previously copied on-chain payment URL cannot be revoked, so existing invoices remain verifiable.
- Styling is server-authorized by the paid invoice and the same project/account/wallet. Published style reads contain no private invoices. Receipts survive project deletion; the deleted project's style does not. Access is a hosted project feature, not transferable virtual property.
- All receipt and invoice data is private to its native account. API responses use `no-store`.

## Validation

`node tests/premium.mjs` covers decimal amounts, mainnet checks, closed checkout, wallet/account isolation, invoice idempotency, unsigned instruction contents, forged/mismatched/replayed/failed payments, finalized verification, receipt recovery, access restoration and deletion.

`node tests/premium-client.mjs` exercises the real client with fixtures, including closed checkout, safe creator text, preview-only controls, explicit wallet submission, duplicate-click handling without storage, and restored paid access.

The existing Studio, wallet API and creator-dashboard checks remain required. Browser/physical iPhone and an actual Phantom transaction remain unverified. Follow up with a real-device purchase using an explicitly approved amount and wallet, then check the receipt and public premium look. Never use development fixtures as production purchases.

## Protocol references

- [Phantom transaction submission](https://docs.phantom.com/solana/sending-a-transaction)
- [Solana Pay transfer requests](https://docs.solanapay.com/spec)
- [Solana transaction verification](https://solana.com/docs/payments/accept-payments/verification-tools)
- [getTransaction](https://solana.com/docs/rpc/http/gettransaction)

## Visual collection update

The shared WebGL renderer provides correctly mapped textured spheres, surface lighting, ocean highlights, Earth night lights, moving clouds, atmosphere and depth-correct rings for free Studio worlds. It is used by Premium previews, saved public worlds and Studio PNG exports. Existing premium receipts unlock the expanded material controls without a second purchase. Legacy three-field styles still validate and retain their original surface/rings. New style fields are optional and enum-validated on the server.

Drag rotates the globe. Motion honors reduced-motion preferences and pauses when hidden. Browsers without WebGL keep the earlier renderer and show a notice about limited previews. Free previews never publish or submit payments; unpaid exports use the free design.

Native GLES compilation/render checks verify the actual shader. Browser layout and physical iPhone performance remain unverified in this environment.

## Interrupted wallet responses

Version 78 writes the submitted-payment guard before asking the wallet to sign and send. An interrupted response keeps the invoice guarded against a second submission. Known user cancellation (4001) clears the guard; uncertain responses require payment verification or signature recovery before retrying. Tests cover uncertain response → recovery and explicit cancellation → fresh attempt. Actual iPhone approval and onchain transfer remain unverified; fixtures do not complete that device check.

The public `/development` report summarizes confirmed receipts and a separately published expense ledger without exposing customer invoices.

## Signature collection

Four editable presets (Aurora Drift, Obsidian Crown, Arctic Frontier and Ember Horizon) combine the existing materials with refined rings, silk bands or asteroid belts. Optional satellites, an orbital station or explorer probes share the world’s accent. Moons have lunar-stone, icy-Europa and dark-obsidian finishes. Far-side companions are occluded by the planet. Styles persist in the same validated document and appear in public worlds and Studio artwork. Existing paid projects receive these options without repurchase.

The collection thumbnails are generated from the production GLSL with `python scripts/render-premium.py`; they show the planet material and rings. The interactive preview includes the full accessory scene. Native GLES rendering and automated fixtures are checked; live browser layout and an actual wallet purchase remain unverified.
