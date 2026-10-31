# Earthbound expedition rover and ground lighting

Rover 01 near the starting camp now uses a textured Meshy expedition vehicle. Rover 02 retains the existing Cybertruck appearance. The new vehicle reuses the existing driving, steering, braking, chase camera, parking, collision and kickflip systems.

## Visible changes

- Pale body panels, dark windows, rugged tires and material maps for surface detail and reflections.
- Four separately moving wheel regions, using the existing steering and travel state.
- Two vehicle-aligned headlights illuminate the terrain. Looking around with the chase camera does not rotate the beams.
- Warm rear work lighting while parked with campus power enabled, plus small cyan and warm fixture accents.
- The procedural vehicle stays visible until the model is fully ready; failed downloads or unsupported graphics retain it. Context loss cleans up both asset renderers.

## Asset budget and provenance

The source model contained 3,391,022 triangles and 107,636,396 bytes. Meshy remeshing produced 30,616 triangles. Local texture packaging preserves the remeshed geometry, UVs and material definitions, and produces a 4,714,688-byte GLB with embedded 1024-pixel color, normal and metallic/roughness maps.

Meshy charged 20 credits for geometry, 10 for textures and 5 for remeshing: 35 credits total. Producing task IDs and exact file hashes are recorded in `public/assets/rover/provenance.json`. No account credentials or signed download links are published.

The model is fitted within the existing vehicle collision envelope; its collider is intentionally more generous than the visible body. Wheel regions are fitted to this reviewed asset rather than being a general-purpose vehicle rig. Lights do not add shadow maps; the existing contact shadow remains. During kickflips the road/work illumination is disabled rather than projecting a fixed beam through the ground.

## Validation

- 40 focused tests passed across rover assets, fallback selection, vehicle-aligned lighting, rocket loading, walking/collisions, stunts, and camp/boarding/mission interactions.
- Local browser: both model readiness indicators reached `ready`; boarding, driving, steering, kickflip and parking/exit were exercised. No graphics warnings or errors were reported in that session.
- The 4.7 MB runtime GLB passed the existing strict embedded-material parser. All four wheel regions were populated; triangle tags are constant within each triangle.
- Browser validation was on this Windows desktop. Mobile and controller behavior retain the existing code but were not separately tested on physical devices.

This release changes no market, trading, account or private API behavior.
