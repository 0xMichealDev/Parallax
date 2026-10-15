# Ecosystem concept worlds

`/explore#ecosystem` presents four independent educational concepts: Solana, Solflare, Phantom and Jupiter. A direct link such as `/explore?ecosystem=solflare#ecosystem` renders the chosen guide on the server, then progressively adds rotation and sharing. The homepage provides direct entries to all four.

These are PARALLAX illustrations, not paid listings, partnerships, project-owned planets, tokens, wallet connections or executed swaps. Existing Creator Studio designs, project claims, premium entitlements and checkout paths are unchanged. The showcase never reads an account or connects a wallet.

The reviewed catalogue is `public/ecosystem-worlds.json`. Each entry includes an official product URL and an official explanatory source. Descriptions were checked on 15 October 2026 UTC. No prices, TVL, yields, holders, endorsements or safety ratings are shown. Future catalogue edits should recheck official sources and update the reviewed date.

The shared production `planet-renderer.js` renders the worlds. Native Mesa EGL output from the same shader supplies transparent WebP fallbacks in `public/assets/ecosystem`. Reproduce them with `python scripts/render-ecosystem.py` in a development environment with Mesa EGL and Pillow. Texture sources are Solar System Scope / INOVE, CC BY 4.0: https://www.solarsystemscope.com/textures/ . Rendering adds procedural terrain, color, atmospheric light and orbital rings. Source credits appear in the showcase.

Animation runs only while the view is visible, the tab is active, motion is allowed and no site dialog is open. Reduced-motion preference and data-saving preference are respected. Static guides remain available if JavaScript, canvas, WebGL or textures are unavailable. Horizontal dragging rotates the world; vertical touch gestures remain available for page scrolling. There are no automatic carousels or notifications. Share opens the native device sheet when supported, otherwise copies the selected URL or presents a selectable field.

Verification: ecosystem DOM/server tests, existing universe/launch and homepage animation tests, TypeScript, CSS and HTML checks, native production-shader renders and build. Browser/iPhone visual testing is unavailable in this environment; native renders check the graphics, not the browser layout.
