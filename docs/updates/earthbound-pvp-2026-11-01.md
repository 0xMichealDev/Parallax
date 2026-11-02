# Hosted v246

Deployed source: b4b717a41e1bfcb6991af6abb7fe62853dc61694.

# Earthbound shared-world combat alpha

Visitors now join anonymous shared rooms automatically on entering Earthbound. Nearby on-foot players use animated expedition-worker avatars with names and health bars. Copy room link keeps invited visitors in the same room (up to 16 players, eight rooms).

The rifle flash is a depth-tested 3D effect anchored at the Blender model's muzzle and uses the rifle's aim/recoil transform. Shots have short visible travel trails, gravity and impact sparks. The server validates ammunition, reload timing, projectile intersections, approximate terrain/cover, health, death and delayed respawn. Camp and arrivals are protected. Health is 100; a hit deals 25 damage; respawn unlocks after five seconds. Hunger and thirst are deliberately omitted.

Solo target practice remains separate from combat. Vehicles and rocket flights are protected; this first release synchronizes on-foot avatars, not shared vehicle ownership. Sessions and scores reset on reconnect. This is a casual multiplayer alpha, not a ranked or independently audited anti-cheat system. No accounts, chat, purchases or paid asset credits were added. If the service is unavailable, the UI explicitly reports offline exploration and retries.

Validation: 54 focused automated tests passed across combat rules, browser-network reconciliation, rifle controls, camp interactions, model loading and Atlas. Two actual WebSocket clients in an isolated room passed presence, movement, four projectile hits, death, reload, respawn protection and disconnect. Edge displayed the controlled second client as a 3D avatar and confirmed shared-world firing (30 to 29 rounds) and reload (30/89). The 55ms flash is too brief for the desktop screenshot check; its anchor was checked against the original model's muzzle provenance. Production build is also required before packaging.

Private service summary: a dedicated Railway Bun WebSocket service owns ephemeral room state and a baked terrain collision map. It is separate from Sites hosting. Source-only server and map files are retained privately; browser code and regression tests are included in the matching public snapshot. The service responds successfully at its health endpoint. Sustained 16-player load and mobile layout remain unverified.
