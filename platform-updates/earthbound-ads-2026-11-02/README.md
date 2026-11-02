# Earthbound aimed shooting — v251

Deployed native revision: 41d73a7ef0175d7d3ea2224470f6b61cb882274e.

Fixes firing while right-click aim is held, using independent mouse button events. Regression tests cover repeated aimed shots, either release order and blocking menus. 23 focused checks and the production build passed. Physical-device visual testing is not claimed.

Run npm run check:earthbound-ads. See docs/updates/earthbound-ads-2026-11-02.md.
