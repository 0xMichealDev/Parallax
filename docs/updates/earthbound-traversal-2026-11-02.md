# Hosted v256

Deployed source: 23992ecd95d0b170d0f2a6de26a5eda9053d21be.

# Earthbound vehicle and scenery traversal

Free Roam vehicle entry/exit now fits the server movement allowance, the server and client share the outer world boundary, and a position correction updates the active vehicle together with its driver. Exits reject water and reset posture. Vehicles remain unavailable in PvP.

Low rocks can be driven over with body/camera lift. Rocks, crates, low equipment and the camp tent have reachable landing surfaces. Jump height is about 2.6 metres; players can stand on scenery, jump again and fall when walking off. Multiplayer snapshots retain elevated positions while crouched or prone. Large walls, buildings and tall rocks still block vehicles.

Regression coverage includes landing and leaving scenery at 30/60/144 Hz, vehicle rock traversal, safe exits, movement allowance and existing combat/controller behavior. The actual Gaea map test drove the launch-site truck 5.81 metres, exited, then walked 3 metres. Visual playtesting has not been completed for this revision. Scenery collisions use simplified surfaces rather than per-triangle physics.

No new artwork credits or real-token features. Private multiplayer gateway changes are summarized here; gateway source is not part of the public export.
