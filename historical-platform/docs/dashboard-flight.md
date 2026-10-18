# Homepage and custom dashboard flight

The main homepage `/` and custom dashboard `/?view=dashboard` use the fixed backdrop. The homepage keeps its compact tool hub, token search and navigation. Atlas, authentication, layout persistence, and wallet flows are unchanged. The approved Runway task is `b0df2013-456c-401c-a13a-9e4f148704e1`; no new footage was generated. The original 1920×1080, 24 fps, silent file has SHA-256 `f79776108368e18fbcdbbbce5396c0f7202bbb2fd6d03ab9b5916785a7e8cb6a` and a measured duration of 10.041667 seconds.

## Durable media

The Site serves both H.264 renditions and first-frame WebP posters from `public/assets/dashboard-flight/`. No signed external URL is used at runtime. The 1600×900 rendition is 5,933,596 bytes; the 960×540 rendition is 2,247,273 bytes. Both retain 24 fps, use a six-frame GOP (maximum keyframe gap 0.25 seconds), omit audio and B frames, and put `moov` before `mdat` for fast start. The mobile rendition is selected once at initialization; resizing does not discard buffered media.

## Interaction and accessibility

`dashboard-flight.js` maps native document scroll from top to bottom onto the clip, stopping at its last frame. It serializes seeks, takes the newest scroll position after each completed seek, and schedules animation frames only when work is needed. Desktop uses a short time-based easing step to soften wheel/trackpad jumps, with bounded elapsed time and an exact final seek. The main homepage also has a taller desktop hero and more space between its useful sections, spreading the same flight over more native scroll distance. These spacing changes are limited to widths above 900px; mobile seeking remains direct. ResizeObserver updates the range when the custom dashboard rearranges or hides panels. There are no wheel/touch interceptors, forced intros, playback loops, or scroll offsets imposed on the visitor.

`home-living.js` remains the sole owner of the existing motion buttons and saved preference. The flight reads its body classes without writing storage. Pause freezes seeking; reduced motion shows the still poster and prevents video loading until motion is allowed. Data saver respects the existing default. Hidden tabs and page-cache navigation stop scheduled work. Loading errors, decoding exceptions, a 20-second initial timeout, or an eight-second seek timeout return to the poster. A failed decorative asset never blocks dashboard controls. Videos are silent, noninteractive, excluded from assistive navigation, and never autoplay.

The fixed layer has no pointer events. Cards keep dark surfaces; the original static hero artwork is removed from both views and other decorative loops are disabled in its scoped stylesheet. Mobile uses a lightly cropped, contained landscape composition to retain the rings instead of severely cropping a landscape clip into portrait.

## Verification

The controller is exercised together with the real motion controller in `tests/dashboard-flight.test.cjs`: forward/reverse/rapid scroll, idle work, saved pause, reduced motion, data saver, hidden tabs, page restoration, source selection, resize and panel-height changes, failed or stalled media, and placement on both requested views. Existing home motion, Market Radar/token search, dashboard layout, navigation, and type checks cover preserved controls. FFprobe confirmed frame rate, silence, GOP spacing and duration; MP4 box inspection confirmed fast start.

Browser QA was unavailable in this managed environment. Actual browser decoding latency, touch scrolling, visual composition and device-specific behavior still need an in-browser review; simulated controller tests do not establish those qualities.
