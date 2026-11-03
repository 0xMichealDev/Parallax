# Earthbound vehicle freeze and PvP return — v258

Deployed native revision: 5bb4730a84bc1dc8425ffeabeeaaf3efe24d3a22.

Fixed recursive loadout closing that stopped the game update loop on vehicle entry. Both vehicles now pass enter/drive/exit/walk regressions. Free Roam has a prominent Join PvP button that restores the saved loadout and returns to the lobby without automatically readying. 35 focused checks passed; browser 3D playtesting remains unverified. No new asset credits, server changes or real-token features.

Run npm run check:earthbound-vehicle-loop. See docs/updates/earthbound-vehicle-loop-2026-11-02.md.
