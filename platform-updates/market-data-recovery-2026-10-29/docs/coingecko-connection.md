# CoinGecko chart connection

Production charts and Terminal discovery use CoinGecko's paid API when the private
`COINGECKO_API_KEY` runtime setting is present. Basic and other paid tiers use
`https://pro-api.coingecko.com/api/v3/onchain/networks/solana` and the
`x-cg-pro-api-key` header. The key must never be committed, sent to the browser,
included in URLs, or copied into logs. Redirects use `manual` and reject 3xx
responses explicitly: the deployed Workers runtime does not accept `error` mode.
Configure and rotate
the secret through Sites runtime environment settings, then redeploy to apply it.

With no key, the existing public GeckoTerminal connection remains available.
A configured but rejected paid key does not silently switch connections; the API
returns a sanitized configuration error or a clearly marked retained observation.
No provider error body is exposed. Genuine provider rate limits also keep their
cooldown and do not trigger provider switching.

## Caches and refresh behavior

Shared D1 caches use the following freshness windows:

| Observation | Freshness window |
| --- | --- |
| First-page Fresh / Near graduation / Graduated discovery | 5 minutes |
| Deeper discovery pages | 15 minutes |
| General new/trending pools | 2 minutes on CoinGecko; 1 minute on public GeckoTerminal |
| Native candles | 30 seconds |
| Verified pool identity | 5 minutes |
| Token holder/social metadata | 15 minutes |
| DEX Screener selected-market observations | 30 seconds |

Paid caches and cooldowns are separate from the public provider. Concurrent
identical requests in one Worker isolate coalesce. Upstream 429 responses retain
their Retry-After cooldown across endpoints. When a refresh cannot succeed,
discovery and candle observations can remain available for display for up to
24 hours from their original observation, explicitly marked stale. Other
eligible metadata has a 15-minute stale horizon. Expired pool identities are never
reused to validate a selected token. Retained display data does not replace a
fresh transaction quote.

Terminal responses expose `freshUntil` and the remaining `refreshAfterSeconds`
without extending the original cache expiration. Discovery polls when that window
expires while visible, pauses in hidden tabs, and rechecks on return. Concurrent
identical browser GETs share one request; POST actions are never coalesced. This
supplements the existing in-isolate server coalescing, not a cross-isolate lock.
Failed discovery requests back off for at least a minute unless the provider
specifies another cooldown. Retry instructions also apply to successful responses
that contain retained stale data. Automatic deep paging and metadata loading are
bounded, yield to the selected native chart and pause during applicable cooldowns.
Explicit Load more controls retain access to supported deeper provider pages.

Chart refreshes keep the last valid chart for the same selection on failure,
clearly label it as an older snapshot, and retain its retrieval timestamp. Changing
tokens clears that chart. Retrieval age and expiration labels update as time
passes; a successful cache read is not presented as newly retrieved market data.
These labels describe when PARALLAX retrieved data, not a guarantee that the
provider's prices are real time. Successful zero-candle responses remain empty.

## Credit-aware application allowance

The paid connection starts with 3,000 upstream market attempts per UTC day.
Cache hits do not count; pool verification and candle retrieval each count.
Multi-request operations atomically reserve their maximum bounded cost before
starting and refund unused reservations. The original daily usage counter stays
intact throughout recovery.

After the base allowance, additional usage requires verified included capacity
from the fixed official `https://pro-api.coingecko.com/api/v3/key` endpoint:

- Grant at most 1,000 additional attempts at a time, up to a hard ceiling of
  10,000 paid market attempts per UTC day.
- Use the minimum of account remaining credits, account credit limit minus usage,
  and key credit limit minus usage. All required fields must be nonnegative safe
  integers; missing or invalid capacity never authorizes more paid usage.
- Preserve a 5,000-credit reserve and require enough verified capacity for the
  entire unused grant. Revalidate after five minutes or when another chunk is
  needed. Revalidating an unused chunk does not increase its ceiling.
- Coordinate inspections and grants through a shared D1 compare-and-swap lease,
  so simultaneous visitors cannot duplicate a grant. Inspection failures and
  insufficient capacity back off for five minutes; longer upstream cooldowns
  remain in force.
- Limit additional paid traffic to 60 reserved requests per fixed UTC minute,
  or the lower verified account/key rate limit. These local limits do not promise
  upstream availability.

The capacity check uses the existing secret header and rejects redirects. Grant
storage contains only its application ceiling, validity and retry state. Account
figures are not exposed in public API responses or browser code. A bounded private
owner diagnostic can record the first capacity inspection of a UTC day; it reuses
that inspection and does not create another account request.

If the local paid allowance cannot cover an operation, that operation can use
the existing public GeckoTerminal connection. It has separate caches and a
4,000-attempt daily allowance, with at most 10 reserved requests per fixed UTC
minute. The paid credential is never forwarded to it. An actual upstream 429 or
authentication error does not activate this fallback. If both connections are
unavailable, eligible retained observations keep their original source and age.

These safeguards are not a billing-period meter or a guarantee of continuous
provider service. Other applications, manual requests and provider plan changes
can affect available credits between inspections. CoinGecko's monthly credits
reset on the first day of the calendar month, separately from these UTC daily
application counters. No subscription or overage billing setting is changed.
The connection does not alter Jupiter, Helius, DEX Screener, wallet approvals or
token-launch behavior.

Validation: `node scripts/test-terminal.mjs`, `node scripts/test-terminal-ui.mjs`,
`node scripts/test-terminal-worker.mjs`,
`node scripts/test-market-recovery.mjs`,
`node scripts/test-market-recovery-worker.mjs`,
and TypeScript/build checks. Provider fixtures cover header isolation, redaction,
pool matching, shared caching, cooldowns, the actual-request budget, credit grants,
exhaustion recovery and retained snapshot expiry.
The Workers-runtime test also exercises the actual service fetch options; transport
failures and genuine timeouts have separate, sanitized messages.

Official references:
- https://docs.coingecko.com/reference/authentication
- https://docs.coingecko.com/reference/pool-ohlcv-contract-address
- https://docs.coingecko.com/reference/trending-pools-network
- https://docs.coingecko.com/reference/latest-pools-network
- https://docs.coingecko.com/reference/api-usage
- https://support.coingecko.com/articles/7409560328-when-does-my-request-volume-monthly-api-credit-reset
- https://apiguide.geckoterminal.com/
