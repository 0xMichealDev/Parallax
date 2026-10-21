# Planet growth and separate Premium pricing

Premium Worlds is a one-time $9.99 USD design purchase per project. Growth is
independent: level 1 is free, and level 100 costs $500 in cumulative growth
purchases. Buying both from scratch costs $509.99, plus Solana network fees.

Growth target cost in cents is `round((level - 1) * 50000 / 99)`. Each invoice
charges target cost minus the confirmed current level cost. The 99 paid steps
therefore add to exactly $500 without rounding drift. Premium does not count
toward growth or promotion ranking. Neither product requests project tokens.

New invoices use a fresh Coinbase SOL/USD spot response. Currency and base are
validated; invalid/unavailable rates fail closed. Integer arithmetic rounds the
payment upward to the nearest lamport. The native SOL amount and reference are
immutable once invoiced; the UI explains that later exchange-rate changes do
not change an existing invoice. This is not an expiring FX quote service.
Existing legacy invoices and receipts retain their original terms.

The existing checkout enable switch and merchant wallet are preserved. No
owner wallet is automatically charged. The visitor must verify their creator
wallet and explicitly approve their own transaction. Growth requires a claimed
Atlas listing, not Premium. Only a matching finalized native SOL transfer with
the invoice memo, reference, amount, payer and recipient grants growth.

One pending growth invoice per project prevents overlapping purchases. Opening
another target restores that pending invoice instead of issuing a second bill.
An unpaid invoice is not automatically cancelled or repriced. A wrong pending
target requires support review; do not send a second payment to work around it.
Receipts survive deletion, but removed/delisted projects are not promoted.

Public levels are derived from paid receipts matching the current account and
creator wallet. The browser cannot save an entitlement or a leaderboard score.
Promotion ranks listed projects by confirmed lifetime growth USD spend; ties
use the earliest last upgrade, then project ID. The first five are highlighted,
with scrolling and bounded pagination for others. Rankings are labeled paid
promotion, not project quality, market value, token safety, or promised traffic.

Community planets share a base radius of 62. Growth scales diameter linearly to
1.8 times the base at level 100. Enlarged maps separate orbital footprints and
adjust close-up camera distance; sprite caches and detailed-render budgets stay
bounded. This does not establish an unlimited project or traffic capacity.
No forced buyouts, resale marketplace, or ownership transfers were introduced.

Validation: growth/payment/pricing/migration tests, existing Premium server and
client tests, Atlas API and discovery tests, revenue aggregation, community
scene tests (including sixty max-size planets), and production build. Browser
visual QA and a real-money end-to-end payment were not performed.
