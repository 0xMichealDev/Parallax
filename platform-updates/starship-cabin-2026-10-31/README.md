# Starship flight deck and graphics compatibility — v233

Successfully deployed native revision: 54872ea6100faffad2885c674e8ea58fc33a9add.

Fitted flight deck with padded seats, harnesses, recessed instruments, lockers, warm lighting and direct cabin travel. Explicit floating-point shader constructors address the observed Windows D3D compilation failure. See docs/updates/starship-cabin-2026-10-31.md and each asset provenance file for the exact task trail, changes and limitations.

Native focused tests and production build passed. Local Edge inspection reached the walking state with the compatibility patch. Native window screenshots were blocked pending permission, so visual cabin verification remains incomplete. The in-app browser still reports disabled graphics; no browser settings were changed.

Run npm run check:starship-cabin from the repository root. All source exports are exact committed bytes, including the unchanged world, camp and destination-map test dependencies.
