# Saved projects in the Terminal

The Terminal uses the existing account-owned Saved Projects list. It does not
create a second watchlist, browser-local bookmarks, price alerts, or automatic
research scans.

On load, the new strip reads `/api/control/following`. Cards show saved snapshot
times and observed comparison counts, not live quotes. Selecting a card uses the
existing Terminal selection flow and its swap-session guard. Comparison links
open the exact baseline/latest pair; management and Your Briefing use the
existing pages.

`Save & follow` is an explicit user action. It first saves a Passport through
`/api/control/passport`, then follows that owned report through
`/api/control/following/add`. Existing account authorization, fixed baselines,
recent-report reuse, the 20-project cap, and Passport allowances still apply.
If following fails after a report is saved, retrying in the same page session
reuses that report. Duplicate clicks cannot start another save while one runs.
Switching tokens cannot change the destination of an in-flight save.

Private project state and pending report references remain in memory only. They
clear when the page hides or is left; returning reloads the authenticated list.
Late completions cannot repopulate a cleared view or start the second write after
leaving. Sign-in uses a top-level link returning to the selected Terminal token.
No wallet connection, Telegram send, AI call, or trade is started by this feature.

Validation: `scripts/test-terminal-saved.mjs`, `scripts/test-terminal-ui.mjs`,
and `tests/following.mjs` cover the UI flow and real service/database ownership,
baseline idempotency, quotas, missing snapshots, and comparison behavior.
