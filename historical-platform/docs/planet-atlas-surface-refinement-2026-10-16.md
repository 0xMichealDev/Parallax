# Planet Atlas surface refinement

Refines `/planets` after the supplied screenshot showed Pluto's black missing-data mask and heavy, uniform atmosphere glow.

- Atlas opts into its own renderer profile. Surface colors remain closer to the source maps; added procedural relief is removed from real mapped worlds.
- Soft directional lighting and per-world atmosphere strength replace the common bright blue rim. Earth retains a subtle atmosphere and thinner clouds.
- Pluto's missing southern coverage transitions into clearly credited procedural artistic terrain. Original imagery is unchanged. This does not represent newly observed terrain. Non-WebGL Atlas previews crop to observed coverage.
- Close-up canvas resolution follows the visible scene dimensions and device pixel ratio, capped at 1200. Atlas render target is capped at 1536. Existing pause, reduced-motion, visibility, and dialog suspension behavior remains.
- Power-of-two textures use repeat wrapping across longitude and mipmap filtering to reduce seams and small-scale shimmer. Other maps retain compatible WebGL 1 filtering.
- Saturn's inspector radius is reduced to keep its rings inside the preview. Frames and library cards have quieter visual treatment.

## Verification

18 existing Atlas and palette tests pass, including new assertions for profile isolation and Pluto-only artistic completion. Site integrity, JavaScript syntax, TypeScript, and whitespace checks pass.

The actual vertex and fragment shader sources compile and render through Mesa EGL. Inspected rendered previews for all eleven worlds and a before/after Pluto comparison. An initial stretched fill was rejected and replaced with three-dimensional procedural terrain.

Browser tooling is unavailable in this environment. These shader images verify surfaces, not complete page layout or actual iPhone rendering. No live wallet, listing, premium, or trading transactions were performed.
