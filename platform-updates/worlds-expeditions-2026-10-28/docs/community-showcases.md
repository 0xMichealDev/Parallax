# Community showcase worlds

BONK, PENGU, WIF, POPCAT, SHEEPLE and OFFICIAL TRUMP are independent PARALLAX community showcases. Their Atlas records remain editorial entries (`provenance: curated`, `wallet: null`, `planet: null`). An included mint is token identity for research, not a claimed creator wallet, team affiliation, endorsement or token-safety rating. The four existing Solana/tool worlds retain their original identities and source dates.

## Catalog and destinations

`public/ecosystem-worlds.json` supplies the renderer styles, project pages, selector and project directory cards. `app/atlas-projects.ts` exposes these worlds to Atlas with `showcase: community-showcase`, `profile.category: token`, the reviewed ticker and the Solana mint. Routes are `/projects/bonk`, `/projects/pengu`, `/projects/wif`, `/projects/popcat`, `/projects/sheeple` and `/projects/trump`; Atlas deep links are `/planets?world=curated-<slug>`.

The project pages expose the full mint, project and mint sources, Terminal (`/terminal?token=<mint>`), Token passport (`/control?mint=<mint>#passport`) and Solscan. Token passport preselects the address; the visitor chooses whether to run research. No token-purchase action is triggered by exploring a world.

`app/community-showcase.ts` exports `getCommunityProject(slug)` with the canonical `{slug, mint, website, proofOrigin}` tuple. It accepts only the six exact slugs and keeps issuer proof origins in a fixed allowlist. Project-wallet linking is a separate flow mounted on these six pages; editorial data must not be changed into an owner claim when a source is added.

## Reviewed sources — 25 October 2026

| Project | Solana mint | Primary project sources | Website proof origin |
| --- | --- | --- | --- |
| BONK | `DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263` | [Project overview](https://www.bonkcoin.com/about); [official account mint post](https://x.com/bonk_inu/status/1918333747684126747) | `https://www.bonkcoin.com` |
| PENGU | `2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv` | [Official token site](https://pengu.pudgypenguins.com/); [official launch post](https://x.com/pudgypenguins/status/1869004982328213543); [later official full-mint post](https://x.com/pudgypenguins/status/2044192286481743898/photo/1) | `https://pengu.pudgypenguins.com` |
| WIF | `EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm` | [Official project site](https://dogwifcoin.org/), whose contract link targets [this Solscan token](https://solscan.io/token/EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm) | `https://dogwifcoin.org` |
| POPCAT | `7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr` | [Official homepage and printed mint](https://www.popcatsolana.xyz/); [project background and repeated mint](https://about.popcatsolana.xyz/) | `https://www.popcatsolana.xyz` |
| SHEEPLE | `TVvnJTedD3WgAPede2xUmRjweJqNdhCEgyjtKv3rCq4` | [Official token page: mint and primary pool pair](https://www.thesheepleflock.com/token/); [official homepage and community links](https://www.thesheepleflock.com/) | `https://www.thesheepleflock.com` |
| OFFICIAL TRUMP | `6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN` | [Official project homepage and mint](https://gettrumpmemes.com/) | `https://gettrumpmemes.com` |

The BONK site links to `x.com/bonk_inu`, the PENGU site links to `x.com/pudgypenguins`, and dogwifhat links to `twitter.com/dogwifcoin` (normalized to `x.com/dogwifcoin`). POPCAT's proposed `@POPCATSOLANA` handle was corroborated by an exchange listing, but the fetched project site did not expose its X link. The public catalog therefore omits POPCAT's X link until a canonical project source is available. Direct X fetches may be blocked; mint posts were also checked through indexed official-account results. PENGU's original digital collectibles and its Solana token are distinct objects.

The project descriptions are neutral summaries of those sources. No market-cap, performance, safety or partnership claims are included. Dates identify source review, not a promise that metadata cannot change.

Sheeple’s official homepage links to `x.com/TheSheepleFlock`. Its token page identifies OFFICIAL TRUMP as the paired token in its primary pool and describes the projects as independent. `pairedWorld` links the two editorial destinations; it does not assert shared ownership or a partnership. The TRUMP world deliberately omits an X link because no project-owned account was established from its canonical website.

## Visual direction

Version 192 refines the six community planets around clearer project-specific expressions and smoother, softly lit materials:

- BONK / Ember Frontier: orange Shiba world with cream brow patches, sleepy crescent eyes, a large cream muzzle and peach inner ears; no mouth line.
- PENGU / Polar Haven: periwinkle-blue shell, broad white face, glossy oval eyes, small peach beak and rounded paddle flippers.
- WIF / Rose Dunes: calm tan Shiba face with almond eyes under a tall salmon-pink knitted beanie and rolled brim.
- POPCAT / Copper Echo: cream-and-taupe cat world, broad soft ears and a large round open-mouth crater.
- SHEEPLE / Flock Haven: ivory wool forms, a compact black CCTV head and projecting lens, red collar and a small solar panel above.
- OFFICIAL TRUMP / Gilded Frontier: a stylized face with a swept golden quiff, navy suit-like lower surface, small red tie and gold orbital ring.

The art direction was checked against each project's own public visual references. These are independent PARALLAX interpretations; TRUMP's cute character is an original translation of its portrait-based token imagery. Sources and reproduction notes are in `public/assets/ecosystem/SOURCES.md`.

`style.identity` opts the reviewed community catalog into a fixed renderer identity. Unknown and prototype-key names resolve to zero on every draw. Identity-only surfaces use cleaner facial masks and softer material detail while the existing creator and solar-world rendering path is preserved. Saved creator styles do not gain these curated identity fields.

Versioned full-frame fallback artwork lives under `/assets/ecosystem/<slug>-v192.webp`. The optional `shareImage` field points to its matching 1200 × 630 PNG card. The optional `icon` field points to a tightly framed, padded 256 × 256 transparent render for small navigation images. Only navigation uses the tighter crop: Atlas and the large planet stage retain the full frame for alignment with the rotating renderer. No layout boxes need to grow for the character to read more clearly.

Atlas and project pages use the same front-facing phase of 6.4 for their initial/static renders. Atlas uses the baked community artwork if enhanced rendering is unavailable. Reduced-motion behavior remains supported. The version 191 layout fixes remain in place: the legacy header CSS is scoped and navigation groups size to their contents.

Reproduce selected fallback assets with `python3 scripts/render-ecosystem.py bonk pengu wif popcat sheeple trump`; the helper also accepts `--phase` and `--output-dir` for visual QA. Reproduce the current icons, share cards and combined community lineup with `python3 scripts/render-community-cards.py`.

## GATTO visual update — 25 October 2026

Version 193 gives the existing GATTO showcase a dedicated black-cat identity: satin charcoal shading, amber almond eyes with narrow pupils, softly pointed ears, a small dark nose and restrained whiskers. Its double gold rings and companion moon remain. The source is the GATTO community banner already supplied to PARALLAX, retained in the page's About section and editorial feature.

`public/gatto-world.json` supplies the shared renderer style, full-frame artwork, navigation icon and share card. The dedicated `/projects/gatto` route injects that configuration into its page. The Atlas uses the same square planet render for its fallback, while Explore and the other community pages link directly to GATTO's dedicated destination. GATTO stays a single curated record with no linked wallet or token contract; this visual update does not infer a mint, issuer domain or project permissions.

The dedicated page starts at phase 6.4, keeps the actual character artwork visible without enhanced 3D, supports keyboard and drag rotation, and respects reduced motion and page visibility. The source banner remains unchanged. Reproduce GATTO with `python3 scripts/render-ecosystem.py gatto` and `python3 scripts/render-community-cards.py gatto`.

## Validation

Run `node tests/ecosystem.test.cjs`, `node tests/community-atlas.test.cjs`, `node tests/planet-palette.test.cjs`, `node tests/atlas-projects.mjs`, `node tests/site-integrity.mjs`, and the normal TypeScript/build gates. The checks cover exact reviewed mints/origins, address and link alignment when switching worlds, independent labels, absence of fabricated owner identities, keyboard navigation, static fallback assets, and all dedicated destinations. Wallet-link proof and permission tests belong to their separate service.


## Community sharing — 25 October 2026

All six community pages include a server-rendered sharing panel. The X action opens an editable compose URL and never sends a post. Planet-card downloads are 1200 × 630 PNG files under `/assets/ecosystem/share/`, composed from the production-shader fallback artwork by `scripts/render-community-cards.py`. Each dedicated page provides canonical, Open Graph and X card metadata using its own PNG and project URL. Third-party preview caches may take time to refresh.

Community sharing always targets `/projects/<slug>`, including when the visitor starts in the Explore selector. The native share sheet falls back to clipboard copying or a selectable URL. All destinations remain free to explore without connecting a wallet. A team link leads to that project's existing signature-plus-website proof flow; it does not grant project ownership or editing rights.

Sheeple and OFFICIAL TRUMP link to each other's worlds with an explicit independent-project label and a source for the reported market pairing. Both require separate project-specific wallet signatures and proof on their own reviewed domains. The sitemap now uses the catalog so every community destination is included automatically.

Release validation includes the ecosystem interactions, curated Atlas identity, wallet proof lifecycle and separate-project isolation, internal links/assets, TypeScript and production build. The preview daemon started, but the cloud browser could not reach its local route; local browser/mobile visual QA was unavailable.
