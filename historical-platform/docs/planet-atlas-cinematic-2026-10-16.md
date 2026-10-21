# Planet Atlas cinematic edition

Extends the dedicated Atlas without changing claim prices, ownership checks, project records, or premium entitlements.

- Cinematic view moves the existing stage into a native modal dialog. It retains the same selection and renderer, locks background scrolling, restores the original stage and keyboard focus on exit, and returns to the main Atlas before opening a claim.
- Daylight, sunrise, and dusk pass the existing lighting presets into the shared planet renderer. Close-ups support horizontal drag, keyboard rotation, explicit rotation buttons, and bounded zoom. Vertical touch gestures remain available for scrolling.
- Adds a richer star field, illuminated orbital track, subtle viewfinder, larger cinema typography, and an edge-to-edge presentation for livestream demonstrations.
- Optional guided tour visits each of eleven worlds once, twelve seconds per destination. It starts only after a click, performs no network requests, stops after the final world or manual exploration, and suspends while hidden or offscreen. Reduced-motion users receive static worlds without the animated progress line.
- Tour descriptions are world introductions. Project counts and listings continue coming from the real directory API. The current planet's project filter is applied only when explicitly browsing its projects, not on every tour transition.
- Scene rendering stops while a claim or tool dialog is open and resumes when it closes.

Validation: 17 Atlas interaction tests cover existing directory and claim flows, cinema return/focus, all eleven tour destinations, no tour fetches, hidden/offscreen timers, manual interruption, lighting/zoom/drag render inputs, vertical gestures, and dialog rendering suspension. Navigation/metadata/assets, CSS parsing, JavaScript syntax, TypeScript, and production build checked. Live HTTP checks follow publication.

No actual wallet connection, signing, claim, release, or financial action was performed. Supported browser visual QA is unavailable in this managed environment; responsive appearance and GPU output still require device inspection.
