# Earthbound entry and recovery — v232

Successfully deployed native revision: 7d39ccaf1ac11191b62fce902b6eef3a8a2d6381.

Clear Earthbound entry, direct location travel, retryable loading and graphics resource cleanup. See docs/updates/earthbound-entry-2026-10-31.md for the exact changes and limitations.

Native focused tests and production build passed. Browser inspection verified the visible recovery screen, retry and destination map with a disabled WebGL renderer. Healthy graphics entry is covered by integration tests; browser rendering remains blocked when the host disables 3D graphics.

Run npm run check:earthbound-entry from the repository root. All source exports are exact committed bytes, including the unchanged world, camp and destination-map test dependencies.
