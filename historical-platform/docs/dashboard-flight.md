# Homepage and custom dashboard flight

The main homepage / and custom dashboard /?view=dashboard use a fixed, automatically playing ambient background. This replaces scroll scrubbing at the user's request in v125. Native page scrolling and all dashboard controls stay independent of the video. Atlas, authentication, layout persistence and wallet flows are unchanged.

The approved Runway task is b0df2013-456c-401c-a13a-9e4f148704e1. No new footage was generated. The original 1920×1080, 24 fps, silent file has SHA-256 f79776108368e18fbcdbbbce5396c0f7202bbb2fd6d03ab9b5916785a7e8cb6a and duration 10.041667 seconds.

## Durable media and quality

The Site serves video and WebP posters from public/assets/dashboard-flight/. No expiring external URL is used at runtime. The desktop file flight-original-1080-v125.mp4 is the original video remuxed for fast start without re-encoding. It is 11,239,055 bytes. FFprobe verified every encoded video packet matches the approved original. The full-resolution 1920×1080 poster is retained from v124.

Mobile keeps the smaller 960×540 file, 2,247,273 bytes. The source is selected once; resizing does not discard its buffer. Older assets remain for cached pages.

## Playback and recovery

The video plays silently at 0.75 speed and loops, giving roughly 13.4 seconds per journey. It stays fixed behind readable cards. No scroll, wheel or touch handlers, current-time writes, animation-frame loops or scroll observers control this video.

home-living.js still owns Pause/Resume and the stored motion preference. The background only reads that state. Saved pause, reduced motion, data saver and hidden tabs are respected. Returning to a visible tab or from the page cache resumes permitted motion without rewriting preferences.

The first-frame poster appears immediately, including without JavaScript. Playback rejection exposes a Play background button for an explicit user gesture; it does not silently fight browser autoplay rules. Errors, unsupported media or a 30-second loading/buffering stall show the poster with Retry background. Recovery ignores stale playback promises. A reconnect can retry a failed load. A blocked or failed background never intercepts dashboard controls.

## Verification and limits

tests/dashboard-flight.test.cjs exercises the real background and existing motion controllers together: automatic silent looping, no scroll dependency, saved pause, reduced motion, data saver, browser playback rejection, explicit retry, buffering stalls, stale promises, tab visibility, page restoration and mobile source retention. Existing motion and site-integrity checks cover preserved controls and both routes. FFprobe confirms original video packets, silence, dimensions and frame rate; MP4 inspection confirms fast start.

Browser QA is unavailable in this managed environment. Direct production media checks were rejected by Cloudflare with error 1010 for this tool client, so they do not establish the cause of the user's browser failure. Actual browser autoplay, visual composition and device playback require an in-browser check.
