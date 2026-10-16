# CoinGecko chart connection

Production charts and Terminal discovery use CoinGecko's paid API when the private
`COINGECKO_API_KEY` runtime setting is present. Basic and other paid tiers use
`https://pro-api.coingecko.com/api/v3/onchain/networks/solana` and the
`x-cg-pro-api-key` header. The key must never be committed, sent to the browser,
included in URLs, or copied into logs. Redirects use `manual` and reject 3xx
responses explicitly: the deployed Workers runtime does not accept `error` mode.
Configure and rotate
the secret through Sites runtime environment settings, then redeploy to apply it.

With no key, the existing free GeckoTerminal connection remains available. A
configured but rejected paid key does not silently switch to free data; the API
returns a sanitized configuration error. No provider response body is exposed.

Shared D1 caches retain feeds for 2 minutes, candles for 5 minutes, and verified
pool identities for 30 minutes. Paid caches and cooldowns are separate from the
free provider. Concurrent identical requests in one Worker isolate coalesce.
Upstream 429 responses retain their Retry-After cooldown across endpoints.
Recent stale chart/feed snapshots retain their observation timestamp and warning.
Stale pool identities are not reused to validate a selected token.

Terminal responses expose `freshUntil` and the remaining `refreshAfterSeconds`
without extending the original cache expiration. Discovery polls when that window
expires while visible, pauses in hidden tabs, and rechecks on return. Concurrent
identical browser GETs share one request; POST actions are never coalesced. This
supplements the existing in-isolate server coalescing, not a cross-isolate lock.
Failed discovery requests back off for at least a minute unless the provider
specifies another cooldown. Daily allowance exhaustion waits until the UTC reset.

Chart refreshes keep the last valid chart for the same selection on failure,
clearly label it as an older snapshot, and retain its retrieval timestamp. Changing
tokens clears that chart. Retrieval age and expiration labels update as time
passes; a successful cache read is not presented as newly retrieved market data.
These labels describe when PARALLAX retrieved data, not a guarantee that the
provider's prices are real time. Successful zero-candle responses remain empty.

The paid connection is capped at 3,000 upstream attempts per UTC day. Cache hits
do not count; pool verification and candle retrieval each count. This allows at
most 93,000 requests per 31 UTC days through this integration, leaving some space
within a 100,000-credit subscription. It is not a billing-period meter: other
applications, manual requests, and provider plan changes can affect availability.
No overage billing settings are changed. Chart subscriptions do not alter Jupiter,
Helius, DEX Screener, wallet approvals, or token-launch behavior.

Validation: `node scripts/test-terminal.mjs`, `node scripts/test-terminal-ui.mjs`,
`node scripts/test-terminal-worker.mjs`,
and TypeScript/build checks. Provider fixtures cover header isolation, redaction,
pool matching, shared caching, cooldowns, and the actual-request budget.
The Workers-runtime test also exercises the actual service fetch options; transport
failures and genuine timeouts have separate, sanitized messages.

Official references:
- https://docs.coingecko.com/reference/authentication
- https://docs.coingecko.com/reference/pool-ohlcv-contract-address
- https://docs.coingecko.com/reference/trending-pools-network
- https://docs.coingecko.com/reference/latest-pools-network
