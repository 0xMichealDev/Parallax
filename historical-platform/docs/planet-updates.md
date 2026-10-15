# Planet journals and followed announcements

The existing creator update records and posting interface now support progress labels, supporting links, screenshots, themes, editing and private followed feeds. Existing posts are preserved with the neutral `Update` label.

## Creator flow

Open `/creator#creator-updates`, choose an owned world, verify its creator wallet and write a post. Preview is local and does not publish. New posts and edits are public immediately after saving. Dates come from the server. Edits preserve the original publication date, record an edit timestamp and use an optimistic revision check. Creator labels describe their own work; they are not PARALLAX verification badges.

Free creators can publish an 80-character title, 800-character body, one public HTTPS supporting link and one screenshot. Premium Worlds for that same account, creator wallet and planet unlocks up to four screenshots and mint, violet or amber themes. Existing premium pricing and payment instructions do not change. Server checks enforce the entitlement.

Images use externally hosted public HTTPS URLs ending in PNG, JPG, WebP, GIF or AVIF, plus required descriptions up to 160 characters. This version does not upload files. No images are fetched by the server. Readers choose to load images; the browser uses `no-referrer`, lazy decoding/loading, and safe external link attributes. Text is rendered with DOM textContent, not HTML. Generic screenshots of simulated features should be labeled by their creator.

Up to five new posts per hour and 100 retained posts per planet. Removing a post removes it from public and followed feeds. The editor uses a stable draft UUID so retrying an interrupted save cannot publish duplicate posts. Reusing that UUID with different content produces a conflict. Stale edits and revision-aware removals are rejected. Failed requests keep the draft; history can be refreshed before retrying.

## Following

Public world and mission pages expose Follow planet. Sign-in is required, but no wallet connection or payment. Up to 50 direct follows per account. `/following#followed-updates` combines those follows with the existing saved research list, matching a world's exact `contract_address`. Matching is never by name or ticker. Direct and research-derived follows are deduplicated.

Unfollowing a planet does not remove a saved token research follow. The UI identifies research-derived inclusion, and research follow changes refresh the announcements feed. Follow lists are private; no follower identities are exposed. Only the content of creator posts is public. Browser back/forward restoration clears old feed state and fetches the current account's list again.

Progress filters and stable timestamp-plus-ID pagination apply to both public planet journals and followed feeds. Oldest entries remain reachable. The creator's history displays up to all 100 retained posts. Posts remain ordered by original publication, so editing an old post does not bump it above a new announcement.

## Persistence and verification

Migration `0012_tiresome_stick.sql` adds constant-default columns to creator_updates and a new creator_world_follows table. Deleting a planet cascades to its updates and direct follows. Saved research and payment receipts keep their independent retention rules.

Run `node tests/planet-updates.mjs` for real SQLite integration cases and `node tests/planet-updates-client.mjs` for actual client scripts against DOM/request fixtures. Existing creator analytics and saved research tests remain relevant. Browser/iPhone visual QA requires an available supported browser. No real wallet purchase was performed for this release.
