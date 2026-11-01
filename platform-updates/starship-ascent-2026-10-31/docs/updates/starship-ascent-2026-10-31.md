# Cinematic Starship ascent

Starship now follows a 22-second cinematic launch: countdown, engine ignition, slow tower clearance, acceleration through clouds, upper atmosphere and the edge of space. The cabin stays around the visitor throughout ascent. Restrained vibration settles with altitude; the final view fades into the existing planetary travel flow without replaying a second ground launch.

The exterior sky transitions from the local landscape to a curved Earth horizon, a blue atmospheric limb and a dark sky. Altitude and speed are illustrative values for an accelerated fictional flight, not a physical mission simulation. The existing engine illumination remains synchronized with ignition. Reduced-motion launches skip the animation, and returning to the pad resets the flight and view.

This release also includes the corrected flight display aspect ratio and orientation from the saved, unpublished v234 checkpoint. The geometry worker URL is advanced with the scene so returning visitors load the matching cabin geometry.

Validation: focused ascent tests cover monotonic altitude, bounded vibration, reduced motion, cancellation, invalid time steps and the terminal orbit state. Camp integration tests cover complete flight handoff exactly once, cancellation and reduced-motion routes; existing entry, world and model checks remain applicable. Edge rendered the updated local ground scene successfully. No new Meshy generation or credits were used.
