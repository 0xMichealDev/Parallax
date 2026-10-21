# Creator Studio planet surface fix

The reported `/studio #planet` defect remained after v108 because surface correction required an Atlas-only option. Studio, saved public worlds, and PNG artwork still sampled Pluto's black missing-data region and used the darker original lighting. Studio also used a fixed 1000×800 canvas on every screen.

## Changes

- Natural solar presets use the completed surface consistently in the shared renderer, including Studio, public worlds, Premium previews, and exported artwork.
- Original Pluto surfaces always receive the credited artistic fill, including recolored original surfaces. Procedural volcanic, glacial, and bioluminescent designs retain their chosen materials.
- Studio's original mapped surfaces use softer lighting; custom colors and Premium atmosphere controls remain active. Display options are separate from saved design data.
- Studio canvas follows display size and pixel density up to 1600×1280. The shader respects the output canvas transform, up to its bounded render target.
- Non-WebGL Studio fallback uses finer sampling, lighter shading, and crops Pluto to observed map coverage.
- Renderer and design asset versions are refreshed across all consumers so cached Studio code cannot retain the old behavior. Pluto source credits now describe rendered artistic completion consistently.

## Verification

45 Atlas, Studio, and renderer/palette tests passed, including preview/export profile consistency, preserved draft/entitlement behavior, natural surface correction outside Atlas, and bounded display resolution. Site integrity, TypeScript, JavaScript syntax, and diff checks passed. Actual shader sources compiled and rendered through Mesa EGL; eleven destination previews were rendered and the Pluto before/after comparison was inspected.

Full browser layout and actual iPhone rendering could not be tested because supported browser tooling is unavailable. No live project edits, payment transactions, or wallet signatures were submitted during testing.
