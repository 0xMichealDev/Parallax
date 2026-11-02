# Hosted v242

Deployed source: 2a31b47a14cb037d2eab83ba924bdc06d27929e2.

# Gaea terrain in Earthbound

The river valley now uses erosion exported from Gaea 2.3.1 Indie. The 192-metre region blends into the existing landscape. Camp foundations, bridge supports, the water channel and authored bank stones retain their original elevations. Terrain normals and one-metre triangles reveal the eroded slopes; walking uses the same triangles.

The destination menu adds River footbridge for a direct visit.

## Export and calibration

An isolated project with an explicit Standard build type successfully exported its cached 1024-square build through the Gaea UI. This establishes a working UI export path; it does not establish that unattended Swarm exports are repaired. Height, flow, wear and deposits EXRs were saved locally. Only height-derived erosion is used by this release.

The File node changed the global height range. A least-squares scale/offset calibration against the original input removes that shift before applying the erosion residual in metres. Samples are resampled to 0.5-metre spacing and millimetre precision for a 576 KB browser payload. The public provenance record includes the source EXR hash. No new Meshy credits or third-party assets were purchased.

## Validation

Terrain tests cover finite samples, seamless region perimeter, fixed foundations and waterline, movement-to-mesh agreement, and matching worker/main-thread heights. Existing world tests run with the real Gaea field, including all discovery routes, bridge crossing and rocket access. Edge visual checks cover camp and the river; the production build passes.
