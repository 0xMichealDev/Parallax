# Earthbound rocket and Observatory interface — October 30, 2026

This immutable snapshot records hosted **v227**, native source revision `bc4320d02021f78f04c9bc6f8111d0945118455d`, following the verified public baseline `89dabd844238dd7f6738b4b4da692a37511dbee3` from v225. It groups the preceding **v226 Observatory interface redesign** with the **v227 Earthbound rocket integration**.

## Shipped behavior

Earthbound loads the textured rocket as a same-origin GLB in the existing WebGL context. The asset preserves its stainless-steel shell, dark heat-shield panels, landing gear and engine bells. It contains **51,271 triangles** and is **9,266,280 bytes**. Browser packaging retains the remeshed geometry, indices and UV bytes while reducing the embedded maps to 2048-pixel textures.

The runtime supplies visible marker/work lamps, two downward work lights and an engine light. The existing campus-light control affects standby lighting; boarding and launch use their corresponding light states. The normal-mapped material samples the scene environment. Drawing restores the world's texture bindings and render state. Missing assets or unsupported graphics retain the existing procedural rocket fallback.

The launch apron, footprint collisions, service tower, boarding lift and nearby equipment are fitted to the larger model. The lift moves forward while its access arm retains the cabin connection. Late model loading gives a nearby rover time to clear the revised footprint. The cabin, flight state, destination selection and existing game controls continue through their established paths.

The v226 catch-up adds the shared Observatory presentation and clearer Trade, Research and Universe navigation while preserving the dashboard arrangement. Its chapter artwork uses CSS and follows shared motion preferences. It also repairs tool-directory dismissal, active navigation, manual Trenches refresh after cooldown, signed-out Snapshot Library feedback, and recovery deadlines for Gold assistant/monitor requests. See the unchanged source note [Observatory interface redesign](docs/observatory-redesign-2026-10-30.md) for its original decisions and verification record.

## Source scope and provenance

The snapshot contains **35 exact source files (10,053,716 bytes)**: all **34** approved changed files and the unchanged `public/trenches-core.js` dependency needed by the Trenches fixture. Its manifest classifies all **38** changed native paths. Three hosted route adapters and the full application-integrity fixture have source-only summaries because they depend on private application internals.

`app/docs-content.ts`, `app/docs-render.ts` and `app/workspace-shell.ts` use existing exact presentation exceptions. No verifier allowlist was expanded. All **10** earlier snapshot/archive directories retain their published fingerprints.

`PUBLIC-SYNC.json` binds exports to the committed source bytes. `PROVENANCE.json` records hashes, byte counts, scope and retained-directory evidence. The asset's own `public/assets/rocket/provenance.json` records its Meshy source/remesh tasks, actual five-credit remesh charge, texture encoding and geometry-preservation hashes.

This selected browser/presentation export is not a complete deployable application. Earlier unchanged assets remain in their existing snapshots; private provider services, authentication, account records, database code, secrets and hosting configuration are excluded. Source availability does not grant a new license or constitute a security audit.

## Reproduce the public checks

From the public repository root, with its existing dependencies installed:

```sh
npm run check:earthbound-rocket
node scripts/verify-public-sync.mjs
npm run check
```

The new suite runs the actual GLB parser and material-data checks, malformed-input rejection, terrain/boarding/footprint fixtures, shared navigation and motion behavior, Gold request recovery, Snapshot Library controls and Trenches cooldown behavior. These checks use local files and simulated browser responses; they require no wallet, provider credentials, paid AI request or transaction.

The preparation helper is included as exact source. It uses an already available Sharp installation and the original/remeshed inputs; the public checks do not rerun it or require Sharp. The distributed web GLB is the verified output.

## Verification limits

The owning release workflow completed the native build and focused checks, published v227, and verified the live model/script bytes against the committed source. Current rocket and world shaders compiled and linked in a local OpenGL ES context, and offline renders checked the integrated model, final clearance changes, work-light illumination and visible landing feet.

The review environment did not provide a usable live browser 3D context. Offline OpenGL ES renders are not real-device browser validation; mobile GPU performance and a full interactive phone walkthrough remain unverified. Public CI verifies the exported fixtures and evidence, not private source or current live deployment. The original v226 note separately records that redesign's browser review and its limits.

Release record: [Earthbound rocket and Observatory interface](../../docs/updates/earthbound-rocket-2026-10-30.md).
