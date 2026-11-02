# Hosted v248

Deployed source: 4ba27e73ac3fa3caa590ec1fcf4fc758c562359e.

# Earthbound equipment, navigation and rifle controls

The bottom-right equipment panel starts collapsed and opens/closes with its Equipment tab. A separate collapsible minimap uses existing terrain heights, fixed landmark labels and a heading-aware player marker; it creates no extra WebGL context. The map is a navigation diagram, not an enemy radar.

Standard controllers: RT fires once per squeeze, LT holds aim, X/Square reloads, Y/Triangle interacts, B/Circle crouches (or brakes while driving), D-pad down toggles prone, A/Cross jumps/stands up, and View/Back toggles equipment. Neutral-input arming, menu guards and disconnect handling remain in place. Mouse bindings follow the owner's requested layout: left button holds aim, right button fires; clicking the view requests mouse look. Escape releases mouse capture. The Aim button remains a toggle. C and Z toggle crouch/prone; Space stands up from either posture.

Crouch/prone change movement speed, smoothly lower the camera, replicate posture, and alter server shot origins/hit volumes. Remote avatars use procedural crouch/lying transforms of the existing worker mesh rather than new motion-capture clips. Vehicles and flights retain their existing restrictions.

The original Blender rifle now has navy/teal/sand digital camouflage, a PARALLAX receiver insignia and an open reflex-optic hood. A red aiming reticle aligns with its sight picture. The model remains under the existing 15,000-triangle and 1.5 MiB budgets (14,780 triangles; 1,333,444 bytes). No paid generation credits or third-party textures were used.

Validation: 38 focused tests pass, including analog trigger thresholds, one-shot firing, held aim, menu rearming, mouse bindings, posture speeds, equipment collapse, minimap plotting, and authoritative prone hit volumes. Two actual network clients passed both standing and prone combat/reload/respawn against the updated server. Blender's material/model preview was inspected. A physical controller was not operated, and final in-game visual inspection was deferred while the owner's Edge session was active. Production build and matching public-source verification are required before publication.

Private server summary: posture is validated, replicated and used for shot origin and hit volumes. The 15-player room limit and existing connection safeguards remain unchanged.
