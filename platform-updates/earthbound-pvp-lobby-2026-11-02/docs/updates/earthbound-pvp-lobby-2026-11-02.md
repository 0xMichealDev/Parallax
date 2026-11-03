# Earthbound lobby and field update

Free Roam and PvP Match are selected before entering. Free Roam no longer deals player damage. PvP supports 15 players, explicit ready/unready, a minimum of two ready players and a cancellable 15-second countdown.

Combat hides player nameplates and exploration labels, separates ammunition/caliber at bottom left, and places the match clock at the top. Nearby prompts handle weapon pickup and extraction. Death plays a short fall animation before the body disappears. Fifteen separated spawn points and five seconds of arrival protection reduce immediate spawn encounters.

Eliminated players drop their primary and sidearm with remaining ammunition. The server validates proximity, cooldown, ownership and one-time pickup. Three extraction pads share the existing eight-second stationary channel. All bounty values remain free practice credits with no cash or token settlement.

New Meshy artwork: solid exterior shelters, concrete barriers, mesquite trees, helmet, tactical vest and ghillie hood. A separate ghillie mantle was derived in Blender. Five head, shirt and trouser style choices combine equipment and color palettes; these are cosmetic variations, not five unique body meshes or a full skeletal ragdoll. The existing worker animation remains the base avatar. Tree and accessory distance limits bound rendering cost. Grass patches and pad beacons use local geometry.

Meshy expenditure: 180 credits total (90 environment, 90 wardrobe) out of a 300-credit cap. Local weapon-detail candidates were rejected because they did not clearly improve the existing gun surfaces; existing gun models and distinct reports remain. This release does not claim a new photoreal weapon rebuild.

Validation: 67 focused gameplay, networking, asset, controls and navigation checks passed, including fifteen spawn points, minimum-ready cancellation, atomic pickup and all extraction sites. The compressed Bun server bundle initializes and accepts a Free Roam session. Asset GLBs passed the strict parser and optimized assets were reviewed in Blender. Browser visual review was blocked by the computer-control URL check; the owner requested publication for in-game review. Production build and deployment verification are recorded in the matching public release.

Private multiplayer gateway changes are deployed separately; private server source and operational data are not part of the public export.

The home page and dashboard prominently advertise Walk on Earth · PvP Match. The direct link opens the PvP lobby without automatically readying the player; ordinary Earthbound entry offers both modes.

Player count is compact at the side. On entering each PvP lobby, the weapons/character screen opens before Ready Up; opening it while queued marks the player unready and can cancel the countdown. Clothing selectors sit before the return-to-lobby action.
