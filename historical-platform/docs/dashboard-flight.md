# Dashboard scroll flight — v128

The approved silent 10-second flight remains on the homepage and custom dashboard. It stays fixed behind the cards; native page scroll maps to video time, scrolling upward reverses the flight, and a stationary page holds its frame. There is no autoplay, looping or intercepted wheel/touch scrolling.

## Media delivery fix

A production check on October 18 returned HTTP 200 and all 14,323,975 bytes when requesting only bytes 0–2047 of the desktop MP4. The controller previously handed the remote MP4 URL directly to the media element and depended on its seeking/loading behavior.

The controller now fetches the complete same-origin asset once and attaches a local Blob URL. Seeking no longer depends on the host honoring byte-range requests. The poster remains visible with “Preparing your flight…” during download; failed or invalid responses show a retry control. A 30-second load deadline aborts the download, and generation tracking prevents a stale completion from replacing a retry or fallback. Blob URLs are released when media fails. A completed seek with a missing event is recovered on the next scroll/update or the 12-second watchdog.

Desktop retains flight-1920-v124.mp4 (1920×1080), mobile retains flight-960-v122.mp4 (960×540). Both are the approved original flight with frequent keyframes; no new footage or further re-encoding was introduced. All media and posters remain durable Site assets. The larger original remux and older files remain available to cached pages.

## Preserved behavior

Desktop easing, the longer desktop page, mobile composition and ordinary page controls are unchanged. home-living.js owns the saved motion choice. Paused motion, reduced motion, data saver and tab visibility remain respected; background loading never changes preferences or starts playback. Resize and page-cache return reconcile with the current scroll position.

## Verification

Node regression checks cover whole-file HTTP delivery, buffered local media, delayed/failed/non-video downloads, timeout cancellation, stale completions, object URL cleanup, forward/reverse seeks, missing seek events, idle behavior, pause/reduced-motion/data-saver controls, mobile source retention, resize, tab visibility and page-cache restoration. Site-integrity checks and the production build are also required before publication.

Browser QA is unavailable in this managed environment. Live HTTP delivery was inspected, but actual rendering, browser decoding and real-device scrolling still require an in-browser check. The initial flight waits for the full file to download (about 14.3 MB desktop or 2.25 MB mobile); the still poster is visible in the meantime.

## HD clarity upgrade — v132, October 18

Based on current source v131 (`cb444bf33d4ffd703426c8b4442b73b7553e54a4`), preserving the latest quiet dashboard and expandable sections. The original footage was 1920×1080; its close-up ring glow and foreground motion already contain softness. No CSS blur was applied to the flight itself. The previous mobile rendition was 960×540.

The exact original flight was enhanced through Runway video upscale task `8af5bfcb-3744-4de9-b104-94e1adb776dc`, resulting in 3840×2160, 24 fps, 241 frames and 10.041667 seconds. This is an AI-enhanced rendition, not a native 4K render or a claim that all baked-in motion blur has been removed. The same content, timing, camera movement, colors, and framing are retained.

Durable delivery files, encoded from that enhanced master:

- `flight-4k-v132.mp4`: 3840×2160, 20,879,865 bytes; H.264 High 5.1, CRF 19, capped at 16 Mb/s.
- `flight-hd-v132.mp4`: 1920×1080, 11,756,078 bytes; H.264 High 4.1, Lanczos downsample, CRF 18, capped at 9 Mb/s.
- Both use six-frame closed seek intervals, no B frames, no audio, and front-loaded MP4 metadata. Both are below 25 MB. Every frame and the original duration are retained.
- HD and 4K WebP posters match the new opening frame. Desktop poster sources follow pixel density; compact screens use HD.

The controller selects one rendition per page visit. A desktop viewport needing more than 2100 physical horizontal pixels (including cover-height scaling, DPR capped at 2) uses 4K when H.264 5.1 is advertised. Other screens use HD. Data saver and reported 2G/3G connections retain the existing 540p asset. Resize never discards a buffered clip. 4K loading/decode failure automatically retries once in HD at the current page position; later failure uses the existing poster/retry recovery. Generation tracking prevents late 4K downloads replacing the recovered HD buffer.

No scroll timing, desktop easing, playback logic, native wheel/touch behavior, dashboard layout, or saved motion preferences changed. Paused/reduced-motion users still start on the poster. Whole-file Blob delivery remains necessary for the asset host, so HD/4K waits for its full download before scrubbing.

Validation: 22 focused flight/dashboard-focus tests; site integrity audit (26 templates, 1,579 internal links, 458 asset references); frame-count, keyframe, MP4 fast-start and size checks; extracted encoded frames visually inspected. Browser/device QA is unavailable in this managed environment. The source's intentional bloom and motion softness remain visible in close fly-bys; the upgrade cannot recreate missing native detail perfectly.

Delivery SHA256:
- HD: `b3516840ba8f26710b895e2718d7c44da1ac984d098a4f8c224d0880bf8b9320`
- 4K: `088efbad4a65216dc7f93236247f0641519b50f692adc3fda1ea41b61fce55bc`
