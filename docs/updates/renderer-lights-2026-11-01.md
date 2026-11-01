# Hosted v239

Deployed source: 6d16cf35d5578ab78acf82b5ce85ca2db5ff19d0.

# Restore the first 3D frame

Edge exposed a shared renderer error: plain and typed arrays have a `values()` method, which was mistakenly sent to `uniform4fv` as lighting data. Dashboard and Atlas viewers could finish loading yet never draw their first frame.

The renderer now distinguishes numeric arrays from structured lighting states. Both mesh uniforms and lamp visibility use the same selection. Renderer script URLs are refreshed on all four consuming pages.

Validation: 31 focused model, dashboard, Atlas, rover, scenery and compound tests passed. A new regression executes the actual renderer draw with plain arrays, typed arrays, structured lighting and default lights, enforcing numeric WebGL uniform inputs and mesh/lamp draw counts. The corrected local dashboard was visually checked in Edge: citadel renders, orbit moves, and pause responds. No new Meshy generation or credits.
