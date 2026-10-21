# Solana Universe and Featured Builders

Launched 2026-10-17 with issue 001, GATTO. `/planets#solana-universe` shows the latest published issue; `/planets#featured-builders` shows the editorial builder selection. `/universe` lists all published issues, newest first. Each issue has a permanent `/universe/<slug>` page, branded metadata, project and Atlas links, and explicit share drafts.

## Publishing the next issue

This is an editor-published weekly series, not a calendar-driven rotation. A new date alone must never relabel an old story as a new issue. No scheduled job or automatic social posting was added.

1. Review the next project with Michael. Verify the public page, artwork permission, project identity claims, current data sources and any partnership wording. Do not infer a project claim or endorsement from an ecosystem concept page.
2. Add or update its public-only record in `app/universe-editions.json` under `builders`. Never add account names, private wallet associations or signatures. Use exact existing internal paths and known Atlas IDs. This file is committed source, not a visitor submission store.
3. Append a new edition with a unique `NNN-project` slug, increasing number, original publication date and `status: "draft"`. Write a short project story, concrete design details and the appropriate provenance note. Only `published` entries render in public indexes or article routes; draft records must not be imported into client scripts.
4. Before release, set the approved issue to `published` and publish the site through the existing Sites workflow. Keep older issue slugs, numbers, original publication dates and factual attribution intact. The latest issue is chosen by publication date, then issue number. It does not claim to be from the current week when an issue is late.
5. Run `node tests/universe-editorial.mjs`, `node tests/site-integrity.mjs`, the TypeScript check and the normal production build. Verify actual links, metadata, images and mobile layout when browser QA is available.

Features are editorial, not rankings. Premium purchases do not grant a feature. The current GATTO feature explicitly has no linked creator wallet or token contract. Parallax is labeled as our own project. Prospective creators use the existing Claim Your Planet flow and community portal for review; nothing reserves a feature or grants project permissions.

The browser sharing script only copies a branded story URL. X and Telegram links open composer drafts on user action; neither sends a post. Clipboard denial exposes a selectable URL. No new tracking, database schema, account access or wallet connection is involved.
