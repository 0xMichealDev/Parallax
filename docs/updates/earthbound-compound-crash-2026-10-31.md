# Hosted v231

Deployed source: eab1f16b8106a65c91f7f2584d163e3dc8370af4.

# Earthbound compound and crash-site upgrade

The launch campus now includes textured Meshy hangar, operations and habitat buildings, generator, communications dish, checkpoint, cargo stacks and service cart. Concrete paving, perimeter fencing, entrance lighting and floodlights connect the compound. The existing walkable research lab contains a mission-control console and specimen workstation.

Six crew members use a detailed human mesh with a shared 24-frame walking cycle and idle pose, replacing the procedural figures only after the complete animation is ready. Patrols, visitor-facing behavior and paused-motion controls remain intact.

The alien crash site has a tilted, partially buried hull with a locally cut impact opening, scorching, debris and a reactor. Existing beacon and First Contact interactions remain available. Assets load on approach; scene disposal cancels pending downloads and releases model resources.

## Cost and provenance

14 generated, textured and optimized Meshy assets at 35 credits each: 490 credits. Worker rigging: 5; idle animation: 3. Actual total: **498 credits against the approved 500-credit cap**. No paid reruns. Each asset directory contains task lineage, content hashes, texture and geometry verification. Worker animation has additional baking provenance.

## Validation and limits

54 focused checks cover model integrity, PBR textures, costs, animation skinning and normals, loading fallbacks, disposal, path clearance, crew behavior, mission interactions and existing camp/rocket/rover behavior. Browser inspection confirmed all new models ready without graphics warnings, realistic crew visible, lab entry usable and crash-site assets rendered. Production build is required before publication.

This is an artistic real-time scene, not a photorealistic simulation. New buildings have closed exteriors; the existing research lab remains walkable. Crew share one appearance and a compact walking/idle animation, without separate task-specific gestures. Meshy omitted the requested worker helmet. Console has four monitors; specimen workstation has a rear panel, with the procedural specimen cradle retained. Lighting and contact shadows are approximations. Physical mobile and controller testing was not performed.

Deployment packaging runs scripts/prune-unused-build-assets.mjs after the build to omit three unreferenced, superseded dashboard videos (v122/v124/v125). Original source files remain archived; current v132 dashboard media stays deployed. This keeps the complete artifact below the hosting service's 256 MiB input limit.
The package also omits the unused original desert-ground-texture.png and static worker/web.glb. Runtime uses gravelly-sand-diff.jpg and worker/animated.glb plus animation.bin; source assets remain available for provenance and tests. Both compressed and expanded artifact sizes are checked against 256 MiB.
