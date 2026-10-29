# Terminal and Trenches

PARALLAX separates market inspection and trade review from launch discovery. Open `/terminal` to inspect one token and its selected pool. Open `/trenches` to compare fresh launchpad pools, curves approaching graduation and active graduated tokens.

## One market workspace

Terminal and Trenches share a neutral midnight palette, soft iris accents, readable panel borders and compact navigation to Terminal, Trenches, Replay and Workspace. Mint and rose distinguish positive and negative market activity. The workspace keeps its data controls visible without giving every control the same visual weight.

The desktop Terminal puts a compact market strip above the main chart, with discovery on the left and trade review on the right. The strip keeps valuation, holders and their observation age, USD price, liquidity or curve reserves, 24-hour pool volume and 24-hour change together. Project links and pool selection remain available beside the market identity. On smaller screens, the layout and metric strip reflow.

Use the discovery-panel button beside the chart controls to hide or restore the desktop market rail and give the chart more width. **Focus chart** provides a larger chart view; Escape exits it. The research drawer retains Position, Fills, Market pulse and Token evidence tabs. Opening that drawer preserves the chart's current height. Saved projects, wallet trade replay, source disclosures and execution controls remain available.

Press `/` to focus the Terminal's token-address search. It does not intercept typing inside an input, text area or editable region, or while a dialog is open. From chart focus, the shortcut restores the normal workspace and selects the search text. The layout controls do not request wallet access, initiate trades or persist a layout preference.

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

Each column has independent valuation, liquidity, activity, age, holder and project-link filters, with a separate sorting choice. Volume controls switch between five-minute and one-hour observations. The valuation filter states whether it uses reported market cap or permits clearly labeled FDV. A required metric that is unknown cannot silently satisfy a minimum. Search, reset controls, visible counts and active-filter counts help explain a sparse or empty result.

Trenches starts in **Compact** density to fit more rows on screen. **Comfortable** density adds room around the same information. Each desktop column scrolls independently; on smaller screens, stage tabs retain the same filters and data. Density, filters, the selected stage and the pause preference are stored on the current device.

Token rows show reported MCAP or explicitly labeled FDV, selected-period volume, liquidity or curve reserves, five-minute price change, holder count, buy/sell transaction counts and available bonding or completion evidence. Pool age remains distinct from the snapshot's observation age. Missing measurements display as unavailable instead of becoming zero.

Search filters the loaded sample by token name, symbol or mint address. Press `/` to focus search and Escape from that input to clear it. A valid pasted contract also exposes an **Inspect this contract** link to Terminal, even if that token is absent from the loaded sample. This direct contract lookup does not establish a pool in advance; opening a token row passes both its mint and its exact selected pool.

## Pins and token actions

Use a row's star to save up to **20 local pins**. The pin strip retains the token mint, selected pool and symbol, so reopening a pin hands the exact saved token/pool pair to Terminal. Pins are deduplicated by token mint and remain on the current device. The **Pinned** filter narrows each loaded stage to matching pinned tokens; it does not fetch a separate market feed or guarantee that every saved pin is present in the current sample. The pin-strip links remain available for reopening those markets.

Each row also has a copy-contract control, a token explorer link and available project links. Copy uses the browser clipboard and reports success or unavailability. Opening a row, pin or contract link does not initiate a swap. Local pins are separate from the account's saved research projects.

## Bounded discovery and detail loading

Each stage starts with page 1 and can progressively load pages 2 and 3 for a broader opening sample when the source reports more results. This opening expansion is bounded, stops at the end of the available sample and respects pause and browser visibility. **Load more pools** continues through provider pages up to page 10 for that stage. The number of displayed tokens depends on provider coverage, lifecycle eligibility, duplicate removal and the user's filters; a page is not a promise of a fixed number of qualifying rows.

Fresh and Near graduation share the same underlying pre-bond snapshot for a given page. Their requests for the same page are serialized so the second stage can reuse the completed shared cache entry. Different page numbers and the Graduated feed can load independently. Refreshing page 1 does not automatically fetch all deeper pages again.

Holder and social filters can require additional metadata. The board reuses available cached metadata rather than requesting details for every visible row on each refresh. Applying these filters checks a small batch of eligible loaded tokens and shows how many still need checking. The explicit **Check next 4** control can inspect another batch, including when no cards currently match. A row's **Details** action checks that token directly.

Detail work is bounded to four queued or active tokens and two concurrent requests. Hover or keyboard-focus checks are additionally limited to four tokens within a two-minute window. Successful detail observations are retained locally for 15 minutes; errors use a retry delay. An unknown field remains unknown until an observation is available, and recently checked missing data is not repeatedly fetched just to force a match.

## Snapshot ages and refresh behavior

The board shows indexed observations, each with its own age. Column labels identify the first-page observation, while token rows show the snapshot age for the page that supplied them. Older or expired observations have an explicit indicator, including an aggregate older-snapshot badge when retained deeper pages have aged. A recent page-1 refresh does not make older loaded pages appear newly observed. Holder metadata has its own observation time and may be older than a pool's market snapshot.

First-page discovery snapshots use shared **five-minute provider caches**. Deeper pages use **15-minute provider caches**. The browser follows the returned refresh timing for page 1 and retains loaded deeper pages; those pages are not silently re-polled on every first-page refresh. A successful request can return a cached observation, so its arrival time is not the same as a new upstream market observation. Refresh controls do not bypass provider caching or rate-limit cooldowns.

Automatic refresh pauses when requested or while the browser tab is hidden. Rows being hovered, focused, touched or scrolled retain their current order while incoming observations wait to be applied. Source errors retain previous observations with a refresh-failure message; stale data does not become a fresh observation simply because it can still be displayed. Discovery refresh is separate from the Terminal's chart and selected-market refreshes.

Filters apply to the loaded provider sample. Loading another page can add matching tokens. The board is not a complete, immediate stream of every Solana launch, and provider indexing can delay a new listing. Ranking by recent activity is a way to inspect observed data, not a forecast of future price moves.

## Data sources and scope

Market observations use the existing CoinGecko/GeckoTerminal and DEX Screener connections. Launchpad details, holder metadata and available social fields depend on provider coverage. No new data subscription, account connection or database schema is required for this release.

Relevant provider contracts:

- [CoinGecko pool details](https://docs.coingecko.com/reference/pool-address)
- [CoinGecko token information](https://docs.coingecko.com/reference/token-info-contract-address)
- [DEX Screener API reference](https://docs.dexscreener.com/api/reference)

Existing wallet connections, explicit Jupiter quote review, saved research and Replay remain available from the trading workspace. The public source snapshot contains the browser implementation and its offline checks; provider transport, credentials and private service implementation remain in the native application.
