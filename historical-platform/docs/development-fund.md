# Development Fund reporting

`/development` and public read-only `/api/development` report cumulative verified Premium Worlds revenue for the fixed PRLX mint. Only paid orders with a receipt signature and a paid timestamp at or before report time count. Pending/unsigned orders and other mints are excluded. Unrelated wallet transfers are never queried or counted. Receipts survive project deletion and historical merchant configurations; cumulative revenue can span receiving wallets. The current merchant wallet is linked separately.

Raw amounts are grouped in SQL and normalized with BigInt before summing. Floating-point amounts and SQLite integer sums are not used for revenue. The report displays the latest 12 months with receipts plus all-time totals. It exposes no customer account IDs, paying wallets, project IDs, invoice IDs, references or individual signatures. Responses use no-store. Query failures show unavailable/stale status rather than zero revenue.

The owner-managed expense ledger is versioned in `app/development-ledger.json`. No expense evidence was supplied for this release, so expenses and expense-linked milestones are empty. This means no records are published, not that no spending occurred. No available-balance, smart-contract pool, audited balance, automatic allocation, buyback or revenue-sharing claim is made.

To publish an expense in a future reviewed update, add an `expenses` entry with a unique lowercase `id`, ISO date, plain title, `asset` (PRLX, SOL or USD), exact decimal-string `amount`, and public HTTPS `evidenceUrl`. Remove private/customer details from evidence first. Add a delivered milestone only with a real internal feature URL and `expenseIds` matching published records. Do not invent costs or imply existing features were premium-funded without evidence. Keep `coverage` explicit and update `updatedAt`. The API rejects invalid records and unlinked milestones.

The JSON download contains only the public report. Ledger edits are reviewed source changes, not an unprotected public write API. Premium Worlds, Utility, the homepage announcement and creator dashboard link to the report.

Validation: development and growth-client tests, existing premium verification/recovery tests, TypeScript and production build. A real iPhone/Phantom payment remains a manual check; no live transfer was executed.
