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
