# Hosted v240

Deployed source: cd2597db848cff08a60f478ced6fb6e74ad19ef5.

# Cinematic Atlas departures

The flight now starts with a close camera alongside the Meshy shuttle, moves around into a following view during ignition, and keeps the shuttle framed as Atlas Station recedes. The camera and ship use a continuous 12-second trajectory. Projected exhaust, restrained star streaks, letterboxing, a progress line, and a textured approach globe replace the distant orbit-and-overlay presentation. Selected project artwork appears in the arrival identification panel; the approach globe is illustrative scenery.

Destination selection, direct links, cancellation, reduced-motion direct arrival, hidden-tab pausing and one-time navigation are retained. Flight scrolls the scene into view. No new Meshy assets or credits.

Validation: camera trajectories tested at wide, square and narrow aspect ratios for continuous movement, valid orthonormal camera axes, and on-screen shuttle framing. Flight lifecycle, route validation, destination selection, cancellation, request races, WebGL fallback and shared renderer tests pass. In-app browser fallback flight reaches the selected Solana project. Full GPU appearance remains unverified for this release: the in-app browser lacks WebGL and the user requested using that browser instead of Edge.
