# Premium Worlds v1

The storefront is `/premium`. It offers three cinematic backgrounds, a brand accent, companion moons, and matching artwork in the existing Studio. Base creation and publishing remain free.

## Activation

Checkout is closed by default when configuration is absent. The owner approved activation on October 14, 2026 at **600,000 PRLX per published project, one-time**, received by **5ZeA2mx6MotvFgpF8ZyGHSAVLZAqGuNK5aj8udFwtLC3**. Configure these native Sites runtime variables:

| Variable | Required value |
| --- | --- |
| `PRLX_CHECKOUT_ENABLED` | `true` to accept new payment requests; any other value pauses them |
| `PRLX_MERCHANT_WALLET` | Owner-designated Solana receiving wallet; an on-curve public address, not a token account |
| `PRLX_PREMIUM_PRICE` | Exact positive decimal amount of PRLX per published project; no exponent or commas |

Deploy a saved version after updating runtime variables. The existing `SOLANA_RPC_URL` and optional fallback are reused. The official mint is fixed in code: `8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump`. Invoice creation checks the mainnet genesis and mint program/decimals. Token-2022 is not supported by this version.

Do not infer a receiving wallet from other projects or connected visitor wallets. The approved runtime values are `PRLX_CHECKOUT_ENABLED=true`, `PRLX_PREMIUM_PRICE=600000` and the receiving wallet above. No live transfer has been made during development.

## Development fund

Premium Worlds proceeds are designated for PARALLAX project development and future updates. Checkout sends the full invoice amount directly to the owner-designated receiving wallet; network fees are separate. The storefront links that wallet on Solscan and explains that it is managed by the project owner. This designation does not introduce a smart-contract pool, spending enforcement, automated allocation or public expense accounting. Do not present the wallet balance as premium revenue: it can include unrelated transfers.

## Behavior

- A native signed-in account and verified creator wallet create one invoice per published project. Price, mint, recipient, payer and reference are immutable snapshots. Existing invoices retain their quoted price when the catalog changes.
- Phantom receives an unsigned transaction containing recipient ATA creation, the invoice memo and an exact `TransferChecked`. The customer approves and broadcasts it. Mobile Solana Pay and an authenticated QR endpoint use the same invoice.
- Verification queries `getTransaction` at finalized commitment. It checks signature, successful execution, payer signature, mint/program/decimals, transfer amount, destination ATA, recipient owner, invoice reference inside the transfer instruction, memo, and corresponding token balance changes.
- Unique project, reference and transaction-signature indexes enforce invoice and receipt uniqueness. A repeated verification returns the saved receipt. The UI warns against retrying a pending payment and provides explicit recovery/retry controls. A direct transfer outside the invoice is not an order payment.
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
