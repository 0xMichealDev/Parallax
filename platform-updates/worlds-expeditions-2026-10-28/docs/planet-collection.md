# Planet collection and launch paths

## Curated project art direction

The user approved GATTO revision 207 as the visual benchmark on 28 October 2026 and requested that the other curated project worlds use the same realistic approach. Realism is the default for this collection: lifelike fur, feathers, wool, skin, fabric and terrain; physical lighting and restrained atmospheric effects; and recognizable character or brand cues. Avoid cartoon, plush-toy and smooth plastic appearances. Preserve each project's identity and the approved GATTO face.

Use the shared production renderer for the rotating world, static fallback, Atlas view, navigation icon and social card. Export these from the same source art and settings so sharing does not introduce a different character. Revision 209 applies this direction to BONK, PENGU, WIF, POPCAT, SHEEPLE, OFFICIAL TRUMP, Solana, Solflare, Phantom, Jupiter and SolHandle. GATTO retains its approved revision 207 assets.

The six revision 209 portrait worlds—BONK, PENGU, WIF, POPCAT, SHEEPLE and OFFICIAL TRUMP—use a bounded turn of ±24° from the front. Their source art supplies one frontal view; full-profile and rear spins reveal an unsuitable flat backing. Manual drag and arrow controls stop at the bounds and remain directional, while autoplay turns smoothly back and forth. Keep this limit when changing the renderer or its consumers. GATTO and the five terrain worlds retain their existing rotation. Phase 6.4 is the front view, so the approved main exports, icons, social cards and collection lineup remain unchanged.

This direction concerns imagined project worlds. Scientific solar destinations keep their accurate identities, maps, classification and physical presentation. Generic creator designs and saved paid styles do not inherit curated-only material settings.

## Expedition art direction

The realism direction also applies to the GATTO and SHEEPLE games. Their freely viewed, moving characters use articulated three-dimensional meshes with surface materials, rather than the single frontal portraits used for curated planet presentations. Keep the existing limb rigs, ground contact, movement, collision, interaction distances, mission completion rules, and local travel logs intact when changing their appearance.

Revision 210 introduces a shared local material atlas for charcoal cat fur, ivory fleece, warm limestone, and gray lunar regolith. The unchanged image-generation source, its lossless WebP runtime copy, and exact provenance are in `public/assets/expeditions/material-atlas-v210*`. Sample each quadrant independently with mirrored coordinates and a filter-safe inset; the whole atlas must not repeat across a mesh. Additional metal, glass, leather, and architectural finishes can use restrained procedural variation. Surface detail belongs in object coordinates on moving characters. Keep the triangle and texture budgets suitable for mobile use.

Material images are an enhancement: loading or image failure must never block landing, movement, discoveries, photo capture, or the non-WebGL fallback. Texture readiness and lighting changes must invalidate cached scenery, including when ambient motion is paused. Preserve the Canvas renderer’s grounded geometry and a simplified material/lighting treatment.

The approved GATTO v207 and SHEEPLE v209 artwork also appears in their landing introductions and approach overlays, linking the games visually to the Atlas. Those images do not replace playable anatomy. The ±24° turn limit applies only to the six portrait-based curated planet views; expedition cameras and articulated characters retain their existing full three-dimensional behavior.

## Solar collection and publishing

The catalogue in `public/planet-design.js` contains eight planets, the Moon, Europa, and Pluto. Its map, classification, color, and renderer body IDs feed Creator Studio, Project Atlas, the star map and rocket flight plan. Moon and Europa are labeled as moons; Pluto is a dwarf planet. Imagined designs remain separate from real destinations. Surface maps and their limitations are credited in the interface and `public/assets/globe/SOURCES.txt`.

Creator Studio provides 15 free starting points: four imagined worlds and 11 solar-system worlds. Solar presets use their own material, weather and ring defaults; only Saturn starts with rings. Changing the fine-tuning controls creates a custom design. Premium preview and paid entitlement rules remain unchanged.

Project publishing and planet claims validate the new design IDs on the server. Existing ownership, wallet proof, duplicate-address and origin protections apply. No database migration or checkout configuration change is required.

The explorer has 15 total stops: Earthbound, 11 worlds and three deep-space views. Destinations keep stable indices; `routeOrder` controls presentation order. Rocket arrival hands off from Earth orbit, preventing a second ground liftoff. An illustrated textured sphere remains available while the globe loads or if WebGL fails. The star map becomes a scrollable three-column grid on small screens.

Studio's token launch section unlocks for the latest published project and a verified creator session. It provides copy/download details and a deliberate external Pump.fun link. Unpublished edits reset the handoff acknowledgment. PARALLAX does not deploy tokens or submit a wallet transaction through this flow. The simulator remains a hypothetical constant-product pool, not a Pump.fun bonding-curve model.

Verification: wallet/API SQLite tests, Studio client tests, camp boarding/flight controls, normal and reduced-motion route tests, unavailable-WebGL fallback, launch-kit download/handoff guards, simulation invariants, TypeScript check, production build, and native GLES rendering of the production planet shader. Browser/device UI testing and a real Phantom/Pump.fun transaction were not performed in this environment.
