# Terminal and Trenches

PARALLAX separates market inspection and trade review from launch discovery. Open `/terminal` to inspect one token and its selected pool. Open `/trenches` to compare fresh launchpad pools, curves approaching graduation and active graduated tokens.

## Read the valuation clearly

The selected market has a prominent dollar valuation, a separate token price and an indexed holder count. Market cap and fully diluted valuation (FDV) are different measurements. When a provider does not report market cap, the interface labels the available FDV explicitly and preserves the missing market cap as unavailable.

The native chart supports Market cap, FDV and Price views. Dollar axes use compact, readable units such as `$25K` and `$1.2M`. Exact values remain available in the chart readout and value titles. Market-cap and FDV views require a positive valuation and USD price from the same provider observation for the exact selected pool.

Historical valuation candles are estimates: each price candle is multiplied by the supply implied by that coherent valuation/price observation. This is a current supply basis, not a historical circulating-supply series. The chart identifies that basis and its observation time. Price candles, reported traded volume and execution prices remain separate; switching the display does not change transaction amounts or quotes. A pool-currency price series is never multiplied by a USD valuation basis.

## Holders and project links

Holder counts come from indexed token metadata and have their own observation time. A missing count stays unavailable; it does not become zero. Counts can refresh less often than prices.

Website and social links are provider-supplied project metadata. Displaying a link does not establish the destination's ownership or endorse the project. Links are normalized before rendering, reject credential-bearing and unsafe URLs, and open separately. Missing links and temporarily unavailable metadata are distinguishable.

## Follow a token through the launch lifecycle

Trenches presents three independently filtered stages:

- **Fresh launches:** an indexed sample of uncompleted launchpad pools, ordered by their pool creation time. Pool age is not asserted to be the token's minting time.
- **Near graduation:** uncompleted launchpad curves with reported bonding progress, with a default threshold of 70%. Unknown graduation progress is not fabricated from market cap or token age.
- **Graduated:** tokens with provider-reported completion and a verified post-curve trading pool. Completion of a bonding curve and migration into a destination trading pool are distinct observations. When a destination pool is supplied, it must match the token before the discovery entry can open it. Without a supplied destination, an observed PumpSwap pool for that completed token can qualify; unknown completion status does not.

A token's name, ticker, address suffix, DEX name or high volume alone does not prove its launch state. Missing or contradictory lifecycle evidence does not qualify an arbitrary pool as graduated.

## Filter the loaded sample

Each column has independent valuation, liquidity, activity, age and holder filters, with a separate sorting choice. The valuation filter states whether it uses reported market cap or permits clearly labeled FDV. A required metric that is unknown cannot silently satisfy a minimum. Search, reset controls and active-filter counts help explain a sparse or empty result.

Preferences are stored on the current device. On smaller screens, stage tabs retain the same filters and data. Token cards open the Terminal with both the mint and pool selection. Opening a card does not initiate a swap.

Holder and social filters can require additional metadata. Applying those filters checks a small batch of eligible loaded tokens and shows how many still need checking. The explicit “Check next 4” control can inspect another batch, including when no cards currently match. An unknown field remains unknown until an observation is available.

The page displays indexed snapshots and their timestamps. First-page discovery snapshots use shared five-minute caches, while older candidate pages can be cached longer. Bounded candidate requests control provider usage; the discovery refresh interval is separate from Terminal chart and market refreshes. A paused page, a hidden browser tab or a row being inspected does not needlessly reorder the board. Stale snapshots and refresh failures are identified explicitly.

Filters apply to the loaded provider sample. Loading another page can add matching tokens. The board is not a complete, immediate stream of every Solana launch, and provider indexing can delay a new listing. Ranking by recent activity is a way to inspect observed data, not a forecast of future price moves.

## Data sources and scope

Market observations use the existing CoinGecko/GeckoTerminal and DEX Screener connections. Launchpad details, holder metadata and available social fields depend on provider coverage. No new data subscription, account connection or database schema is required for this release.

Relevant provider contracts:

- [CoinGecko pool details](https://docs.coingecko.com/reference/pool-address)
- [CoinGecko token information](https://docs.coingecko.com/reference/token-info-contract-address)
- [DEX Screener API reference](https://docs.dexscreener.com/api/reference)

Existing wallet connections, explicit Jupiter quote review, saved research and Replay remain available from the trading workspace. The public source snapshot contains the browser implementation and its offline checks; provider transport, credentials and private service implementation remain in the native application.
