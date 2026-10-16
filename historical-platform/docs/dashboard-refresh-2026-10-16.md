# PARALLAX orbital dashboard refresh

## Scope

- New realistic orbital hero artwork, headline, and clear Terminal / guided-tour actions.
- Mint active navigation, clearer labels, floating mobile navigation, and larger search controls across the shared workspace.
- Larger tool tiles, refreshed personal shortcuts, and consistent typography and surfaces through the homepage.
- All ten saved dashboard panel identifiers, density settings, filters, and product links are retained.
- Existing data sources, account behavior, payments, swaps, and alert configuration are unchanged.

## Artwork

Generated with the built-in imagegen tool, then encoded as responsive WebP assets with Sharp. No text or product data is baked into the image.

- `public/assets/refresh/orbital-1672-v102.webp` — 103,504 bytes
- `public/assets/refresh/orbital-960-v102.webp` — 41,556 bytes
- `public/assets/refresh/orbital-640-v102.webp` — 20,404 bytes

Generation prompt:

> Use case: stylized-concept. Asset type: cinematic hero background for PARALLAX, a premium Solana research and creation dashboard. Create a stunning ultra-wide 16:9 photorealistic 3D space artwork. An enormous dark obsidian terrestrial planet occupies the right 55 percent, its northern edge illuminated by a precise pale mint-white sunrise, detailed rocky oceanic textures and delicate atmospheric haze. Two elegant thin brushed-metal orbital rings sweep diagonally around the planet, with tiny restrained mint light points along their rims, dramatic depth and realistic occlusion. A tiny distant moon at upper right. The left 42 percent is deep near-black navy negative space for website text, with just a handful of fine stars; keep left low contrast. The planet itself should be visible as a globe with rich details, and the metallic orbit provides a strong sculptural silhouette. Sophisticated scientific observatory aesthetic, immaculate ray-traced materials, striking but restrained, mint #b9ead7, icy silver, graphite #080c10, deep blue-black. No text, no logos, no numbers, no charts, no fake UI, no people, no astronauts, no spacecraft, no purple, no green neon fog. High-end architectural product-render quality, polished quiet composition, wide cinematic crop.

## Verification

- Site integrity: 14 rendered page templates, 730 internal links, 289 asset references; metadata and recovery behavior passed.
- Motion and comparison: six tests passed, including the new image hero's no-canvas path, pause, hidden-tab behavior, reduced motion, and slider functionality.
- Saved layout client checks passed: ordering, pin limits, density, persistence, cancellation, reset, conflict handling, and account isolation.
- Guided tour: six tests passed, including manual play, idle behavior, captions, media recovery, and preferences.
- Creator reporting and development report client checks passed.
- TypeScript, JavaScript syntax, CSS parsing (401 rules), and diff whitespace checks passed.
- Rendered browser QA was unavailable in this environment. Desktop/mobile layout is implemented and source-reviewed, but has not been visually confirmed in a browser or on a physical iPhone.

## Motion

The image hero uses a subtle CSS drift, gated by viewport visibility, the existing motion preference, reduced-motion settings, and tab visibility. The legacy canvas renderer does not request animation frames when its canvas is absent.
