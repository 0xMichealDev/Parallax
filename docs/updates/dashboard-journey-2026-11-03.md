# Hosted v260

Deployed source: 6482b0e18afa9d546f2bcdd36a3ca65fe17e1f8d.

# Dashboard observatory journey

The customizable dashboard at `/?view=dashboard` now opens with a dedicated cinematic orbital observatory section. Native scrolling moves through the video; upward scrolling reverses it. Three chapter buttons jump between perspective, wallet research, and project worlds. A skip link leads directly to Terminal, Wallet Watch, Planet Atlas, and Creator Studio. Earthbound PvP and Free Roam remain direct destinations.

The original ten dashboard panels, token research form, official PRLX address, panel customization, and saved layout behavior remain available below the section. The default `/` homepage is unchanged. The dashboard no longer loads the prior opt-in Meshy viewer; its assets remain preserved for other uses.

## Media

Generated in VEED using Google Veo 3.1, generation `695d7605-0b58-4f9b-8ce7-f00db4797924`. The user explicitly approved the 310-credit generation. The source is an eight-second 1280×720, 24 fps cinematic station scene. Browser renditions remove audio, retain the original resolution for desktop, and use 960×540 on small screens. Both use short closed keyframe intervals, no B-frames, and faststart for forward and reverse seeking. No upscaling was used. Exact metadata, prompt summary, hashes, and credit provenance are in `public/assets/dashboard-journey/provenance.json`.

This is a generated cinematic background, not a navigable 3D simulation. Desktop video is approximately 11.8 MB; mobile is approximately 3.6 MB. A still poster remains available while buffering or after a media error. Reduced motion presents all chapters as static content; data-saving visitors begin with the poster. Motion can be paused, and failed downloads can be retried. The page never intercepts wheel scrolling or autoplays sound.

## Validation

- Controller tests cover section bounds, reverse scrubbing, initial poster handoff, chapter navigation, pause, reduced motion, failed media, stalled seeks, mobile selection, tab suspension, and recovery without idle rendering.
- Dashboard and home tests preserve panel identities, customization hooks, direct destinations, no-autoplay markup, and the unchanged default homepage.
- Dashboard layout API and client checks pass, including account isolation, persistence, preview/cancel, conflicts, and storage failures.
- The navigation audit passes across 53 page templates, 4,097 internal links, and 1,777 assets, along with metadata and deep-link checks.
- A pre-existing audit fixture omitted the browser's `URLSearchParams` and expected a PvP entry for the free-roam URL. The fixture now covers both already-shipped modes explicitly; application routing was not changed.
- Local browser review checked the desktop scene in Edge, forward/reverse chapter motion, pause, skip-to-tools, the customization dialog, and a 390-pixel mobile layout without horizontal overflow. Both encoded video files passed full decode checks.

The public release snapshot records the exact deployed source revision and hosted version. Existing public snapshots are retained.

Deployment packaging retains the archived introduction film in source but omits its 18,937,579-byte MP4 from the hosted build. No current template or runtime entry loads the retired introduction player. The existing build pruner now refuses this omission if an application template or another runtime script restores the film link, player script, or original tour controls. This preserves room for the new dashboard video within hosting's expanded-archive limit; current dashboard media and Meshy models remain included.
