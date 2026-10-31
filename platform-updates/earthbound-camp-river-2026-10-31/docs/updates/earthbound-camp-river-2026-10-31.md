# Earthbound camp and river upgrade

Textured Meshy canvas shelter, folding chairs and cooking table replace the simple tent shell and camp seat. A weathered timber footbridge replaces the procedural bridge after its asset loads. Two reused lanterns light the approaches. The tent flap, camp controls, walking routes and bridge collision surface remain functional.

The bridge mesh is fitted to the existing 17-metre crossing: its broad upward-facing deck is detected from triangle area, then follows the bank ramps. The tent is fitted to the existing camp footprint. These are runtime position/normal transforms; stored GLB geometry remains unchanged during texture packaging. Each asset type retains its procedural fallback until ready.

Riverbank terrain uses one-metre subdivisions instead of three-metre panels. Water has gentler ripples, smaller and less prominent bed detail, reduced foam and soft shade beneath the deck. Inspection found angular shoreline panels beside the old bridge; a separate loose box was not conclusively identified. The old bridge geometry is hidden when its replacement is ready.

## Assets and actual cost

| Asset | Triangles | Web bytes | Credits |
| --- | ---: | ---: | ---: |
| Tent | 20,585 | 2,991,188 | 35 |
| Camp furniture | 18,013 | 3,310,020 | 35 |
| Footbridge | 14,297 | 2,977,940 | 35 |
| Total | 52,895 | 9,279,148 | 105 |

Each asset has embedded 1024-pixel base color, normal and metallic/roughness maps. Its provenance.json records geometry, texture and remesh task IDs, actual charges, exact hashes and packaging invariants. Original task records and downloaded models remain in the local Meshy project folders. No extra paid reruns were used.

## Validation and limits

All 42 focused checks passed: asset budgets and embedded maps, fitted deck alignment, normalized normals, fallback ranges, route clearance, walking and camp interactions, plus rocket and rover regressions. Local Windows browser review confirmed all six scenery types ready with no graphics warnings, the tent closing control, walking across the new bridge, and the adjacent riverbank.

The environment retains an artistic sky and procedural landscape. Water reflection and under-bridge shade are approximations, not a full fluid simulation or dynamic scene reflection. Physical mobile/controller testing was not performed. No private API, account or trading behavior changes.
