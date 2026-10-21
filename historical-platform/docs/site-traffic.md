# Lifetime website counters

The public homepage, Creator Studio and Premium Worlds display lifetime recorded page views and estimated unique browsers. First-party recording runs on all HTML pages, once per visible page load. Polling and tab switches do not add views. Totals start with the first accepted event in this release, not the original launch date. Earlier project-scoped analytics cannot be safely combined into site-wide unique visitors and are not backfilled.

`site_visitors` stores a domain-specific SHA-256 hash of a random browser ID, first/last timestamps and a cumulative view count. No wallet, authenticated account, IP address or full browsing URL is written to these counters. Browser storage resets, private browsing and multiple devices can overcount people; privacy settings and blocked requests can undercount visits. The label explicitly says estimated browsers.

`site_page_events` deduplicates per-load UUIDs. A D1 transaction inserts the event, increments only an uncounted event's visitor total, and marks it counted. The event log can be pruned after 30 days; lifetime visitor rows and counts persist. Requests require the same Origin, a known route category, valid UUIDs and a bounded body. Common bots, DNT and GPC are excluded. Per-browser limits are 30 accepted page loads/minute and 500/day; this is not a bot-proof count.

Visitors can disable counting. The client shares the opt-out with existing project analytics. The public API returns only aggregated totals, the first recorded timestamp and definitions. `/api/site-stats` is distinct from the existing token-market analytics endpoint.

`node tests/site-stats.mjs` tests real SQL migrations, duplicate/concurrent request handling, returning browsers, counter preservation across pruning and fresh worker instances, rate limits, origins, private response boundaries, visible-page behavior and opt-out.
