# Atlas discovery

`/planets?sort=explored` opens Most Explored in List view. `/planets?sort=newest` opens New Discoveries. `sort=all` is the existing curated + community universe; Space remains available for every filter. Search and sector apply within the selected view. The list has a direct Explore planet link, artwork, a short description and a secondary details action.

## Public counts and consent

Projects must be listed in Atlas and explicitly opt in through the existing claim form. `missions.discovery_enabled` defaults to 0; `discovery_since` is server-controlled. Only the existing authenticated account + verified creator wallet can change this setting. Old clients that omit the option preserve the existing setting. Disabling or releasing the listing removes it from Most Explored. Re-enabling begins a new enrollment period. Profile edits and repeated saves do not reset an active enrollment.

The public API aggregates existing `creator_visits` after enrollment. It never returns browser hashes, session IDs, campaign data or individual visit timestamps. Original creator analytics remain session-based, so they intentionally differ from public discovery totals. Visitor privacy copy now explains aggregate use when the creator opts in.

## Counting rules

- Trailing seven days, as of the server-provided timestamp. One visit per project/browser/UTC date; repeated sessions, reloads and website clicks cannot add another count that day.
- Existing collection excludes signed-in owners, recognized bots and DNT/GPC/opt-out browsers; the known automation user-agent list is expanded. Existing session deduplication and collection caps remain. No raw IP addresses, wallet data or new tracking identifiers are collected.
- These are limited browser visit counts, not unique people or Sybil-resistant proof. Browser resets, different browsers, logged-out owners and unrecognized automation can affect them. There are no rewards tied to rank and no safety or token-performance claim.
- Only projects with at least one qualifying recorded visit appear. There are no seed counts. Curated worlds have no comparable measured project-page activity and are excluded from Most Explored and New Discoveries.
- Ties use project name (case-insensitive), then project ID. Filters narrow the eligible set. An optional `asOf` pins the seven-day window across pages; requests older than 30 minutes must refresh. Enrollment/removal and late writes can still change results; this is not an immutable snapshot.
- New Discoveries sorts listed community projects by original `created_at`, then ID. Releasing/reclaiming does not promote an older project.

Empty, unavailable and previously loaded results are distinct UI states. Deep links cannot insert an unranked curated world into ranked results. API failure is never converted into a successful empty leaderboard. Paid planet styles do not affect position. Public methods are explained beside the results.
