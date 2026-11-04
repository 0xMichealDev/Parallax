# Earthbound telescope-to-rocket integration candidate

**Status: implemented and tested in an isolated browser fixture; NOT DEPLOYED.**

This advances the earlier helper-only draft into edits to the actual v230 camp and flight-deck controllers. It does not replace the rocket, rover, station, terrain, bridge, tent, textures or models. No Meshy task or paid generation was submitted.

## Implemented

- The existing Moon, Jupiter and Saturn telescope observations have an explicit Set course action. Known image IDs map to the existing supported flight catalog. Deep-sky observations remain observation-only.
- Confirming a course closes the telescope through the existing modal controller, clears walking inputs, restores stage focus and guides the visitor to the existing boarding lift. Merely looking at an observation does not change the course.
- The flight deck preselects the planned destination. Closing an edited plan discards unconfirmed edits; the Confirm & launch button commits the new choice.
- Lift/countdown cancellation uses the existing world exit routine, restores the launch-pad pose and keeps the chosen destination. Invalid input and duplicate actions remain guarded.
- Flight pauses on window blur or page hiding and requires explicit resume. Reduced-motion mode keeps the existing shortened sequence.
- The selected world is passed once to the existing destination callback. Explicit false, exceptions or rejected callbacks show retry/return controls. Late results cannot restore a cancelled local flight.
- Ground ambience is silenced during boarding/flight. Sound remains opt-in.
- Additive responsive CSS covers the new course/deck controls. No full-site theme was replaced.

## Source provenance

Reviewed baseline: hosted v230, native revision `d6a74578017735a9e10af104127157a3e0865ea7`.

Exact baseline camp, flight-deck and state modules were retrieved through the GitHub connector and reconstructed locally. Their SHA-256 hashes match the published release manifest. The v230 world adapter's `boardRocket`, `launchRocket`, `exitRocket`, `flightTick` and `visit` implementations were also read; the fixture uses those same controller calls and poses but does not render the world.

The unchanged v228 `universe.js` supplies the current destination adapter. The installer patches that reviewed callback to return false for an unavailable destination and true after accepting a supported one. The full universe module and full native HTML were not executed here. Their exact source hashes must match before application.

`baseline/public/camp-experience.js` + `scripts/build-camp.py` deterministically generate the integrated camp module. The other replacement scripts are in `public/`. The prior `observatory-journey.js` helper is retained for its original regression suite; it is not added as another runtime dependency.

## Reproduce the checks

```sh
python scripts/build-camp.py
node --test tests/journey.test.cjs
python tests/patch_tests.py
python tests/browser_journey.py
```

Browser tests require the Python Playwright package and a local Chromium executable (`CHROMIUM_PATH`, default `/usr/bin/chromium`). No package installation is performed by these scripts.

Observed results in this work session:

- 31 pure controller/helper checks passed.
- 48 Chromium DOM interaction checks passed: 24 desktop and 24 at 390 x 844 with touch emulation.
- 9 source-lock/patch checks passed.
- All candidate JavaScript files passed `node --check`.

The browser test uses offline document injection because local HTTP navigation returned `ERR_BLOCKED_BY_ADMINISTRATOR`. No browser security settings or network policy were changed. The test uses the actual candidate camp/flight UI code, a simulated ground/routing/audio adapter and a minimal fixture stylesheet. Images are intentionally unavailable to exercise the image-error state. The two screenshots are **fixture screenshots, not live site screenshots or new world renders**.

## Apply to a native working checkout

```sh
python scripts/build-camp.py
python scripts/apply-native.py --root /path/to/native-parallax
# Only after the dry run matches the reviewed source:
python scripts/apply-native.py --root /path/to/native-parallax --apply
```

The installer checks all five baseline source files before any write, checks package output hashes, refuses changed sources and escaping paths, creates a backup, updates the four script cache versions together, adds the new stylesheet, and restores written files on an application error. It changes only browser source and `app/site.html`. It does not merge main, change a release ledger, build, publish or spend credits. No full-native-checkout application was performed in this session.

## Still required before release

Native application build and existing world/rocket/rover regression suites; full-scene desktop visual/routing walkthrough; real iPhone Safari/Phantom and controller testing; full-site CSS/CSP review; actual 3D loading, GPU performance, lighting/audio listening and destination-render validation. Offline UI passes do not establish these results.

The native site publisher is not available in this chat. Production remains unchanged. Keep the GitHub request in draft until native integration and release checks have been completed.
