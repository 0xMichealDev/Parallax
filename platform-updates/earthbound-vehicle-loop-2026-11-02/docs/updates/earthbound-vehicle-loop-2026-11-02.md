# Earthbound vehicle freeze and PvP return

Entering either vehicle could recursively close an already closed loadout panel. Closing triggered a synchronous redraw before visibility handling finished, overflowing the stack and stopping the game animation loop. Loadout close now commits its hidden state first and only redraws when an open panel actually closes. This applies to both rover 01 and truck 02, including entry while the loadout is open. Collision, terrain and multiplayer movement limits are unchanged.

Free Roam now has a compact, prominent Join PvP button in the upper-right corner. It switches to the existing lobby and saved loadout flow, releases mouse capture, and leaves Ready Up under player control. The button returns after leaving PvP and hides outside Free Roam or behind the loadout screen.

Validation: 35 focused checks passed for loadout saving, vehicle entry/drive/exit/walking, terrain traversal, network corrections, controls, stunts, lobby transitions and match rules. Four vehicle regressions failed with stack overflow before the fix and pass afterward. A full-map simulation verified forward/reverse travel and successful exit/walking for both vehicles at their actual spawn positions. Browser 3D gameplay remains unverified in this environment.

No new asset generation or credits. No server behavior or real-token features changed.
