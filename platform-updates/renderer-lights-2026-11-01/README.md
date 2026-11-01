# Shared 3D lighting fix — v239

Deployed native revision: 6d16cf35d5578ab78acf82b5ce85ca2db5ff19d0.

Fixes an array-iterator error that stopped the first dashboard and Atlas 3D frame. The real renderer draw is tested with plain, typed, structured and default lighting. Edge local preview confirmed visible geometry, orbit and pause. No new Meshy credits.

Run npm run check:renderer-lights. See docs/updates/renderer-lights-2026-11-01.md.
