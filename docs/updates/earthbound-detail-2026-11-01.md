# Hosted v241

Deployed source: 97b18a4c5592a21bb7bfe343a97f6b8518377e6f.

# Earthbound detail upgrade

Adds Blender-authored camp anchors, bridge/riverbank detail, compound equipment, wreck fragments and a stainless pickup with connected wheel pivots. Water uses layered surface ripples and a shallower bed treatment. The boarding lift has a connected cage and a twelve-second eased ascent. Moves the camp control away from the destination selector and versions changed browser modules to refresh cached clients.

Validation: 44 focused checks pass for routes, crossing, asset parsing/alignment, wheel pivots, lift, boarding and destination handoff, including reduced motion. Framework production build passes. Edge visual checks cover camp night/twilight, destination navigation, compound and animated crew. Additional visual checks are recorded in the release summary.

No new Meshy credits consumed. Existing Meshy models retained; new detail geometry authored in Blender 4.5.15. Poly Haven rocky_terrain_02 maps used under CC0. Provenance accompanies the browser assets.

Limit: Gaea opens the custom eroded riverbank project, but its batch export has not produced a usable file. The live release retains the established collision-aligned terrain; it does not claim a shipped Gaea heightfield. Windows sleep settings were not changed.
