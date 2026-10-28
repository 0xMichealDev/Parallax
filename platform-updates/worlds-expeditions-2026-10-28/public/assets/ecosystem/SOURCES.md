# Ecosystem concept illustrations

Created by PARALLAX. Rendered using the production `public/planet-renderer.js` shader with the catalogue settings in `public/ecosystem-worlds.json`, phase 6.4, at 960 × 960, transparent background.

These concepts do not imply affiliation, sponsorship, endorsement or ownership by Solana, Solflare, Phantom or Jupiter. Product names identify the subjects of independent educational guides.

Base maps: Earth day, Earth night, Earth clouds, Mars and Jupiter from Solar System Scope / INOVE, https://www.solarsystemscope.com/textures/ , [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Combined with procedural surfaces, atmospheric lighting, color changes and rings by PARALLAX.

Reproduction: `python scripts/render-ecosystem.py` using Mesa EGL and Pillow. These are code-rendered product illustrations, not screenshots of third-party applications.

Color revision 77: Solana uses the green `#14F195` and purple `#9945FF` documented at https://solana.com/branding . Jupiter uses the lime `#C7F284` present in its official brand-kit page at https://developers.jup.ag/docs/resources/brand-kit , with an illustrative darker jade secondary. Solflare's orange/ember palette and Phantom's lavender/violet palette are PARALLAX interpretations of their visual identities at https://www.solflare.com/ and https://phantom.com/ ; these secondary shades are artistic choices, not claimed official brand specifications. Sources reviewed 15 October 2026.

The `-v77.webp` files are rendered from the same opt-in `style.palette` settings as the rotating worlds, including their surfaces, emissions, atmosphere and rings. Versioned filenames prevent stale cached previews.


Community additions reviewed 25 October 2026: `sheeple.webp` / Flock Haven and `trump.webp` / Gilded Frontier use the same production shader at phase 6.4 and 960 × 960. Sheeple uses the Earth day/cloud/night maps with emerald and pale meadow colors. TRUMP uses the Mars terrain map with navy valleys and a fine gold ring. Palettes and world names are PARALLAX creative interpretations, not issuer brand specifications.

Project identity sources: [Sheeple official homepage](https://www.thesheepleflock.com/), [Sheeple token page](https://www.thesheepleflock.com/token/), and [OFFICIAL TRUMP website](https://gettrumpmemes.com/). The Sheeple token page establishes the SHEEPLE / OFFICIAL TRUMP pool pairing; the projects remain independent and neither these assets nor their appearance asserts a partnership.

Community identity revision 190, 26 October 2026: BONK, PENGU, WIF, POPCAT, SHEEPLE and OFFICIAL TRUMP use project-inspired terrain and dimensional landmarks in the production shader. The `*-v190.webp` assets are 960 × 960 renders at phase 6.4. Ear ridges, flippers, the knitted polar cap, camera and swept golden crest use original procedural geometry and materials; no issuer logo or mascot image is embedded. Existing source maps and their attribution above remain applicable. These are independent PARALLAX interpretations, not issuer-approved artwork.

Reproduce these six planets with `python3 scripts/render-ecosystem.py bonk pengu wif popcat sheeple trump`. Reproduce their 1200 × 630 PNG share cards and the combined `community-lineup-v190.webp` overview with `python3 scripts/render-community-cards.py`. Both compositions use these exact production renders. Previous image filenames remain available for cached and historical links.


Community polish revision 192, 25 October 2026: the six community worlds use smoother original procedural surfaces and project-specific facial shapes and accessories. Their full-frame `*-v192.webp` images retain the production phase and resolution above; the `icons/` variants are padded crops for small navigation boxes. No third-party mascot image is embedded in the runtime or final render.

Primary visual references inspected for this revision:

- [BONK Brand Kit](https://brand.bonkcoin.com/) and its [3D head reference](https://brand.bonkcoin.com/images/dogs/BONK_Pose_Head_001_LR.jpg): orange and cream face, brow patches, crescent eyes and peach inner ears. The kit describes a character generally without a mouth.
- [PENGU official site](https://pengu.pudgypenguins.com/) and [Pax Pengu](https://www.pudgypenguins.com/pages/pax-pengu): blue/periwinkle penguin, white face and belly, dark oval eyes and small orange beak.
- [WIF official site](https://dogwifcoin.org/) and [official icon](https://dogwifcoin.org/wp-content/uploads/2023/11/cropped-wif_icon_512x512.png): tan Shiba and tall salmon crochet hat.
- [POPCAT official site](https://www.popcatsolana.xyz/) and its [open-mouth artwork](https://www.popcatsolana.xyz/_next/static/media/mouth-open.d5a7be8e.png): cream/taupe cat, soft ears and large near-round open mouth.
- [Sheeple official site](https://www.thesheepleflock.com/) and [token logo](https://www.thesheepleflock.com/token/logo.jpg): ivory sheep, black CCTV camera head, small solar panel and red collar.
- [OFFICIAL TRUMP site](https://gettrumpmemes.com/) and [portrait artwork](https://gettrumpmemes.com/images/fight-card.png): swept hair, suit and black/gold presentation. The cute planet face is an original PARALLAX interpretation, not an official mascot or a reproduction of the portrait.

These references guide subject recognition only. The planets, lighting, silhouettes, expressions and materials remain independently authored PARALLAX artwork, with the independent-showcase labels preserved. Earlier image versions remain available for historical links.

GATTO identity revision 193, 25 October 2026: `gatto-v193.webp` is an original procedural black-cat world based on the GATTO community banner already provided at `/assets/projects/gatto-community.png`. Visual cues are its black face, amber-gold eyes with narrow pupils, pointed ears, subtle whiskers and black-and-gold presentation. The original banner remains in the GATTO About section; no issuer image is embedded in the planet shader. This reference does not establish a token mint, official website or project-wallet ownership.

GATTO visual revision 207, 28 October 2026: the user approved a new detailed black-cat portrait generated with the built-in Image Generation tool, using the existing GATTO community banner as the identity reference. The unchanged portrait is stored as `/assets/globe/gatto-face-v207.png` and mapped onto GATTO's sculpted rotating head. The same production shader supplies `gatto-v207.webp`, its navigation icon and the `gatto-v207.png` share card, including the gold rings and companion moon. The earlier assets remain available for historical links. Reproduce the new exports with `python3 scripts/render-ecosystem.py gatto` and `python3 scripts/render-community-cards.py gatto`. The image-generation brief requested a frontal, orthographic head-only portrait of the existing black GATTO mascot, fine charcoal fur, expressive almond-shaped amber eyes with slit pupils, tapered cheeks, detailed pointed ears, neutral studio illumination and a restrained gold rim, with a transparent background and no text, rings, moon, body or jewelry. The user approved the generated face before integration; its original pixels and alpha are retained in the texture.

`public/gatto-world.json` holds its shared render settings. The full render uses phase 6.4 and a transparent 960 × 960 frame, with the matching padded 256 × 256 navigation crop and 1200 × 630 share card. In revision 193 the companion moon was a separate scene element in the dedicated page and Atlas; revision 207 renders it in the shared shader so it is also present in exports. Reproduce the art with `python3 scripts/render-ecosystem.py gatto` and its icon/card with `python3 scripts/render-community-cards.py gatto`.


Sheeple identity revision 194, 26 October 2026: `sheeple-v194.webp` uses the shared rotating renderer with a raised, deep black security-camera head, an overhanging sun hood, compact concentric lens, mounting bracket, tilted solar array, red neck collar, fleece body and small split hooves. The design reference is the [canonical mascot photograph on Sheeple’s official website](https://www.thesheepleflock.com/assets/photo_2026-09-17_13-28-20.jpg), inspected for the character’s recognizable shape and materials. No issuer photograph is embedded in the planet.

`public/assets/globe/sheeple-fleece-v194.png` is an original texture made with the built-in image-generation tool, then normalized to a 1024 × 1024 RGB PNG for WebGL texture compatibility. Prompt: “A square seamless evenly lit warm-ivory short-curly sheep-fleece material map, dense small natural irregular wool curls and fine fibers, gentle local shading and restrained contrast. Surface only: no animal silhouette, skin, objects, camera, text, border, vignette, directional light, or oversized clumps.” It supplies only the fleece material; the planet, camera, collar, panel, lighting and rotation are code-rendered.

Reproduce the matching full planet, icon and social card with `python3 scripts/render-ecosystem.py sheeple` followed by `python3 scripts/render-community-cards.py sheeple`. The share card leaves extra vertical space around the raised panel. Earlier images remain available for historical links.

Sheeple anatomy revision 195, 26 October 2026: `sheeple-v195.webp` completes the existing sculpture with two woolly hind legs and matching dark split hooves. The four legs are staggered in depth so the front and rear pairs remain distinguishable at the default presentation angle. The renderer, icon, fallback and social card share this updated geometry; the camera, collar, panel and original fleece texture remain as in revision 194. Reproduce the assets with `python3 scripts/render-ecosystem.py sheeple` and `python3 scripts/render-community-cards.py sheeple`.

TRUMP sculpture revision 196, 26 October 2026: `trump-v196.webp` refines the original character planet with swept golden hair, dimensional facial geometry, blue eyes, a tailored navy suit, white collar, red tie and one slender champagne-gold orbit. The live shader, 960 × 960 transparent fallback, padded 256 × 256 navigation icon and 1200 × 630 share card use the same original procedural model. The existing subject reference and independent-showcase labels above still apply. Reproduce the assets with `python3 scripts/render-ecosystem.py trump` and `python3 scripts/render-community-cards.py trump`. Earlier artwork remains available at its previous filenames.

## Curated realism revision 209 — 28 October 2026

The user requested the GATTO revision 207 level of realism across the other curated project worlds. GATTO's approved portrait and its existing `v207` planet, icon and social card remain unchanged. The collection's lasting art direction is recorded in `docs/planet-collection.md`.

Six original transparent portraits were generated with the built-in `image_gen.imagegen` tool. Each source is a 1254 × 1254 RGBA PNG, copied without changing its original pixels or transparency. The GATTO face was the photographic-detail and lighting reference for all six. PENGU, SHEEPLE and OFFICIAL TRUMP also used their earlier PARALLAX planet renders as references for recognizable components; BONK, WIF and POPCAT used subject-specific written descriptions. These are generated PARALLAX interpretations, not photographs supplied or approved by the named projects.

| World | Original source in `public/assets/globe/` | Preserved identity cues |
| --- | --- | --- |
| BONK | `bonk-realism-v209.png` | Orange-and-cream Shiba fur, cream brows, upright ears and a calm expression |
| PENGU | `pengu-realism-v209.png` | Blue-gray penguin feathers, white face and belly, short flippers and orange beak and feet |
| WIF | `wif-realism-v209.png` | Tan Shiba fur, cream muzzle and a salmon-pink knitted hat |
| POPCAT | `popcat-realism-v209.png` | Cream-and-taupe cat fur, fine whiskers and the open O-shaped mouth |
| SHEEPLE | `sheeple-realism-v209.png` | Ivory wool, black CCTV camera head, red collar, solar panel and dark hooves |
| OFFICIAL TRUMP | `trump-realism-v209.png` | Swept blond hair, realistic skin detail, blue eyes, navy suit, white collar and red tie |

Exact prompts, reference-image paths, generation-source filenames, dimensions, alpha bounds and SHA-256 hashes are recorded in [`../globe/realism-v209-sources.json`](../globe/realism-v209-sources.json). The earlier project-identity sources listed above remain the basis for recognizing each subject; this visual revision does not change the reviewed project descriptions, contract addresses or ownership records.

Runtime textures use matching `*-realism-v209.webp` files encoded from those PNGs with Pillow WebP settings `lossless=True`, `quality=100`, `method=6`, `exact=True`. Decoded RGBA bytes were checked against each original PNG and are identical. These files reduce transfer size without cropping, repainting or changing the generated portrait. The original PNGs remain the source of record. Live and offline rendering use the same WebP textures on continuous rounded volumes, with object-space shading and orbital details supplied by `public/planet-renderer.js`. The compact `*-realism-contour-v209.png` files contain geometric row bounds derived from portrait alpha by `scripts/build-portrait-contours.py`; they are data textures, not displayed artwork. Regenerate those contours after changing a portrait source.

These six portraits are limited to ±24° from their frontal presentation. Their single frontal source does not supply a reliable full-profile or rear view, and full spins exposed the backing geometry during review. Manual drag and arrow controls clamp at each limit without reversing direction; automatic presentation turns smoothly back and forth. This limit applies only to BONK, PENGU, WIF, POPCAT, SHEEPLE and OFFICIAL TRUMP. GATTO and the terrain worlds keep their existing rotation. Phase 6.4 remains the front-facing export position, so this motion refinement changes no main render, icon, social card or lineup pixels.

Solana, Solflare, Phantom, Jupiter and SolHandle use the existing attributed source maps with the explicit `style.realism: "terrain-v209"` material setting. The new treatment retains coastlines, volcanic and glacial terrain, gas bands or obsidian relief while using restrained atmospheric light and physically shaded rings. SolHandle retains its existing `solhandle-emblem-v198.png` identity mark and original creator record. This setting is confined to these five curated presentations; scientific solar destinations and arbitrary creator worlds keep their existing material behavior.

The eleven updated worlds have matching 960 × 960 planet renders, padded 256 × 256 icons and 1200 × 630 PNG social cards under their `v209` asset names. Each has a distinct `/share/<slug>-v209` sharing destination; ordinary project navigation remains on its existing URL. New share destinations do not guarantee that an external platform will refresh a previously cached card.

Reproduce the eleven planet renders with:

```sh
python3 scripts/render-ecosystem.py solana solflare phantom jupiter bonk pengu wif popcat sheeple trump solhandle
```

Generate their icons and cards, then compose all twelve worlds using the existing approved GATTO render:

```sh
python3 scripts/render-community-cards.py solana solflare phantom jupiter bonk pengu wif popcat sheeple trump solhandle --lineup
```

The combined image is `project-lineup-v209.webp`. `--lineup-only` composes it from existing planet renders without changing individual icons or cards. The default card-generation command also skips GATTO; regenerating its `v207` assets requires explicitly naming `gatto`. Historical artwork remains available at its original filenames. The separate `render-solhandle-card.py` script reproduces the historical `v198` layout; the unified generator above supplies the current SolHandle card.
