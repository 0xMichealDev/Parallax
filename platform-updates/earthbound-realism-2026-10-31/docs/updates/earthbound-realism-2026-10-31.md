# Earthbound realistic expedition scenery

Three Meshy assets add textured sandstone, rugged field equipment and caged trail lanterns. Nine placements reuse three GPU meshes and texture sets. Nearby lanterns cast warm light onto the terrain and new props; their glass responds to the existing camp lantern toggle. The props receive flashlight, campfire, rover and rocket light. A cooler night key, material roughness and normal maps keep their surfaces readable. Ground textures blend two scales to reduce repetition, and contact shading anchors each new object.

The scene retains its artistic sky and existing procedural landscape. This is a focused realism upgrade, not a claim of a fully photoreal world or real-time ray tracing. The existing tent, plants, distant terrain and other camp equipment remain.

## Assets and cost

- Sandstone: 12,316 triangles, 2,221,828 bytes.
- Field station: 11,249 triangles, 2,749,112 bytes.
- Lantern: 8,096 triangles, 3,032,304 bytes.
- Total: 8,003,244 bytes. Each asset uses embedded 1024-pixel PBR material maps.
- Each asset cost 20 credits for geometry, 10 for textures and 5 for remeshing. Actual total: 105 Meshy credits, matching the approved cap.

Each asset directory contains provenance with the producing task IDs, actual charges, hashes and geometry-preservation checks. Local texture packaging preserves all remeshed geometry and material definitions. The original generation and remesh task records remain in the local Meshy project folders for reuse.

## Runtime and verification

Simple solid proxy meshes remain until each type is ready, and remain on download or graphics failure. A model is loaded once per type and drawn at multiple positions, with distance culling beyond 110 metres. Colliders and contact shadows are established before downloads finish so late assets do not add new obstacles. Routes, bridge access and rocket boarding remain clear. Shadows are approximate contact patches rather than dynamic occlusion from every light.

The three model previews were inspected. Local Windows browser review confirmed all models ready, no graphics warnings, and the lantern, sandstone and station visible at walking distance. Focused checks cover the assets, budgets, fallback draw ranges, collider envelopes, route clearance, world movement, camp interactions and existing rover/rocket loading. Physical mobile devices and controllers were not tested.

No private API, account or trading behavior changes.
