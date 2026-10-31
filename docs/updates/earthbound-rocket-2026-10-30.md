# Earthbound rocket and Observatory interface — hosted v227

Date: October 30, 2026

Public maintainer: Micheal / @0xMichealDev

## Recorded release

| Item | Value |
| --- | --- |
| Native source | `bc4320d02021f78f04c9bc6f8111d0945118455d` |
| Previous public source baseline | `89dabd844238dd7f6738b4b4da692a37511dbee3` — hosted v225 |
| Recorded hosted version | **227** |
| Grouped changes | v226 Observatory presentation and v227 Earthbound rocket |
| Immutable snapshot | [`platform-updates/earthbound-rocket-2026-10-30/`](../../platform-updates/earthbound-rocket-2026-10-30/) |
| Exact exports | **35 files; 10,053,716 bytes** |
| Complete native delta | **38 paths: 34 changed exports and 4 source-only summaries** |
| Unchanged fixture dependency | `public/trenches-core.js` |
| Retained earlier snapshots/archive | **10**, unchanged |

## Earthbound rocket

The main launchpad now uses the textured rocket derived from the supplied reference. The browser asset is **9,266,280 bytes** with **51,271 triangles**. Meshy reduced the source from 619,356 triangles; packaging then reduced the remeshed file from 48,695,740 bytes while preserving its geometry, indices, normals and UV bytes. Base color and normal maps use 2048-pixel JPEGs with 4:4:4 sampling; the metallic/roughness map uses lossless PNG encoding after resizing.

The existing scene context renders the model with normal mapping, metallic/roughness data and environmental reflections. Visible fixtures and runtime lighting add white, red and cyan markers, warm work lamps, two ground-facing work lights and launch-engine illumination. The GLB remains a static mesh: the lights and boarding/launch behavior come from the application. A procedural fallback remains available when loading or graphics support fails.

Terrain, apron and collision handling use the measured model footprint. The service tower and crate were moved clear of the mesh; the boarding lift was moved forward with a longer access arm to the same cabin. A rover already near the model receives a short clearance window when the detailed asset finishes loading. Existing cabin and launch behavior is retained.

## Observatory interface catch-up

This snapshot includes the complete v226 presentation delta after the last public ledger entry: a shared charcoal Observatory shell, distinct Trade/Research/Universe page treatments, clearer navigation, and decorative chapter instruments with reduced-motion and visibility handling. The main dashboard arrangement remains familiar.

Interaction repairs cover same-page tool-directory closure, navigation state, keyboard shortcut conflicts, signed-out Snapshot Library refresh feedback, and manual Trenches refresh after a cooldown while paused. Gold assistant and monitoring requests release controls after their bounded deadlines, preserve prior input/observations, and avoid automatic resubmission of a paid answer request.

The source's original [Observatory redesign note](../../platform-updates/earthbound-rocket-2026-10-30/docs/observatory-redesign-2026-10-30.md) is retained byte-for-byte, including its separate browser-verification record.

## Public boundary

The new snapshot exports every added/modified public runtime path and the reviewed HTML, presentation, documentation, preparation helper and focused tests. The three presentation TypeScript exceptions were already permitted; no public allowlist expansion was needed.

The changed Replay, Terminal and Trenches hosted route adapters receive non-sensitive source-only summaries. The full application-integrity fixture also remains source-only because it imports private modules. Public test inputs are included explicitly rather than importing those internals. Private services, account/authentication data, database implementation and native hosting configuration remain outside this public kit.

## Checks and limitations

The public release adds `npm run check:earthbound-rocket` to the existing `npm run check` chain. It covers GLB/material parsing and invalid data, terrain/footprint and boarding behavior, navigation/motion interactions, Gold request recovery, research refresh controls and Trenches cooldown behavior. The source-backed verifier checks every export against the recorded native Git blob; the base-ref verifier preserves the previous public ledger and immutable directories.

The native release workflow completed its build and focused checks and verified the deployed model and scripts. Seven actual shader programs compiled and linked successfully in a local OpenGL ES context. Offline renders using the model and nearby world geometry verified visible ground illumination and the final physical clearances.

Live 3D browser review was unavailable in the review environment. The offline render does not establish mobile/browser GPU support or real-device performance. Public CI uses offline fixtures and cannot independently observe private native code, live deployment, authenticated wallet actions or provider availability. No live transaction or paid answer request is needed by the exported checks.

The exact asset preparation script is included for reproducibility and requires an existing Sharp installation plus the original source inputs; it is not executed by public CI. Task and encoding provenance are in the asset directory. Earlier snapshots, their licensing/authorship records and the historical archive are preserved.
