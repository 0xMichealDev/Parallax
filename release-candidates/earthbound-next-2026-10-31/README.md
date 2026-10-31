# Earthbound next pass — staged development candidate

**Status: NOT DEPLOYED. No new 3D asset was generated. No Meshy job was submitted.**

Approved scope: (1) launch reliability, (2) the campsite/interactive observatory, and (3) connected solar-system travel. This package is an initial, tested logic pass and the integration specification, not the finished visual overhaul.

## Verified baseline

The current public release ledger identifies `earthbound-rocket-2026-10-30`, hosted v227, native revision `bc4320d02021f78f04c9bc6f8111d0945118455d`. Reuse its textured rocket and existing launch scene. Do not replace the accepted asset or rewrite historical snapshots.

Source reviewed through GitHub:

- `platform-updates/earthbound-rocket-2026-10-30/PUBLIC-SYNC.json`
- `platform-updates/earthbound-rocket-2026-10-30/public/rocket-state.js`
- `platform-updates/earthbound-rocket-2026-10-30/public/desert-world.js`, terrain/camp/route definitions
- `platform-updates/earthbound-rocket-2026-10-30/tests/desert-world.test.cjs`

The exact original rocket-controller bytes were reconstructed locally and verified against the release manifest: SHA-256 `5d9e0af9918533bd249dc6af5691e9c73bdcaadd79dd3a31d6a4e58bd73fa65a`. Baseline reproduction confirmed that exit resets Saturn to Mars, non-finite boarding coordinates can pass the distance check, and an invalid cabin-movement timestep can produce non-finite camera coordinates. These are source-level findings, not reports of observed production incidents.

## Implemented in this candidate

`public/rocket-state.js` retains the v227 export name, existing function names, boarding location, cabin limits, 5-second lift, 3-second countdown and 8-second ascent. It adds explicit destination selection, retains the selected destination when exiting, rejects invalid boarding/movement input, and preserves duplicate-action guards. This is a proposed replacement in the native source, not an edit to the archived release.

`public/observatory-journey.js` provides call-driven, renderer-independent helpers:

- Telescope proximity checks, inspect/cancel/confirm behavior, and confirmed destination handoff to the candidate rocket controller.
- Stable IDs supplied by the owning catalog. Unconnected community destinations explicitly return `destination-not-connected`; no invented launch route or arbitrary URL is accepted.
- Smooth camera interpolation using the shortest yaw arc, plus a reduced-motion path.
- Distance-based campfire and wind gain targets, silent until enabled and while hidden or flying. These are mixer targets, not a newly connected audio graph.
- Countdown, ascent and arrival-ready presentation derived from the existing flight state, without a second timer or a navigation side effect.

The helpers do not attach themselves to the site. They create no render loop, DOM, audio context, network requests, storage writes or wallet actions.

## Test evidence

Run with Node.js:

```sh
node --test tests/journey.test.cjs
```

Local Node 22.16.0 result: **31 tests passed, 0 failed**. Both browser files also passed `node --check`. Tests cover catalog handling, invalid inputs, boarding proximity, repeat actions, cancellation, complete state progression, cabin bounds, telescope commit/cancel and unsupported destinations, camera angles, reduced motion, ambience gains and derived countdown states.

This is **not** a full application build, live-browser walkthrough, shader validation, model-loading test, mobile performance measurement, audio listening check or a claim that every existing regression suite passes. No publisher is available in the current chat; direct repository cloning also failed DNS resolution. GitHub connector reads/writes are available.

## Integration sequence for the native application

### 1. Launch reliability first

Apply the controller candidate only after comparing it against the current native source; refuse a blind replacement if its baseline hash differs. Keep the established scene renderer, collision map, boarding lift and cabin. Update asset-version references through the native release flow so caches do not mix old and new controllers.

Verify proximity/rover restrictions, boarding, opening and dismissing the destination picker, exiting the lift/cabin/countdown, launch and one-time arrival. Reset pointer/touch input on cancellation, blur and visibility changes. The current helper's `exit` resets flight state only: the owning scene must still restore player position, camera, focus and collision/input state using its established exit path. Do not simply call `exit` from a new UI button and assume that completes cancellation.

Exercise repeated clicks/taps, switching tabs, late model loading, unsupported graphics and reduced motion. Preserve the procedural rocket fallback. Do not claim an uninterrupted cross-page flight until routing and arrival are actually tested.

### 2. Observatory and campsite

Reuse the existing telescope placement at x=3.5, z=-13, fire at x=0, z=-8, and tent at x=-4.5, z=-10.5. Obtain vertical positions from the current terrain code; do not hard-code new ground heights. Inspect the existing assets before deciding whether a new telescope mesh is needed.

Proposed art direction: brushed metal equipment, charcoal housings, warm amber work lamps, cool moonlight, grounded stone/terrain detail. Improve the existing tent, telescope, cases and camp-to-campus route; do not add a decorative asset pile or alter path collisions without tests. Visual/material work has not been implemented in this package.

Wire the telescope helper to a deliberate nearby Interact action. Use one accessible view with a visible exit, correct keyboard focus, touch controls and no walking input while observing. Confirming a supported destination updates the rocket selection; inspecting or cancelling must not. Display the chosen destination at the boarding console. Community-planet travel needs the actual current catalog and arrival adapter; leave it explicitly unavailable until connected.

Connect ambience targets to the existing user-enabled audio mixer, ramp gain changes, preserve mute, and restore audio only through permitted playback state. Firelight illumination, positional panning, real audio playback and the warmer environment materials remain integration work.

### 3. Solar-system travel

Drive camera transitions and captions from the existing flight clock, not independent timers. Respect reduced motion and cancellation. Wire arrival once through the existing destination router and preserve the exact selected planet ID. Keep a clear unavailable/error state rather than silently sending the visitor to a different world.

Then review planet materials, atmosphere edges, ring transparency, orbit spacing and label overlap. Keep approved community artwork and all current worlds; this package does not change shaders, textures, ring geometry or live routing.

## Release gate

A native preview must pass the existing terrain/rocket tests, the new logic tests, full application build, desktop journey and real-device mobile walkthrough before publishing. Check actual GLB loading, collision clearance, light transitions, sound/mute, touch controls, page visibility, failed assets, reduced motion and repeated arrival/cancel actions. Record evidence and limits; only then publish and update the release ledger/provenance. Keep the current public `PUBLIC-SYNC.json` and immutable snapshots unchanged until a real deployment exists.
