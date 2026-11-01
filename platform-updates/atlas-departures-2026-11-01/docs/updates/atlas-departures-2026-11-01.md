# Atlas departures

Atlas Station and the exploration shuttle now share a departure scene. Visitors search the real project directory, select a destination, and fly through a twelve-second undocking, departure and approach sequence before opening that project's world page. The animation uses the existing Meshy assets, reflective materials, engine lighting and a tracking camera. No additional Meshy credits were spent.

Flights can be cancelled. A direct visit link and reduced-motion navigation are available. Browsers without WebGL use an animated rendered preview. Hidden tabs and offscreen scenes pause travel; stale search responses cannot replace newer results. The Atlas material shader now declares its camera uniform, fixing a cause of model loading failure.

Validation: model fitting, scene lifecycle, destination validation, single navigation, cancellation, visibility, reduced motion, directory errors and existing Atlas tests; production build. The local browser preview was inspected. Full GPU visual verification was interrupted when computer control could not establish the Edge address reliably; the automatic tests do not establish visual fidelity on every GPU.
