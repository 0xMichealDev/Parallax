# Planet collection and launch paths

The catalogue in `public/planet-design.js` contains eight planets, the Moon, Europa, and Pluto. Its map, classification, color, and renderer body IDs feed Creator Studio, Project Atlas, the star map and rocket flight plan. Moon and Europa are labeled as moons; Pluto is a dwarf planet. Imagined designs remain separate from real destinations. Surface maps and their limitations are credited in the interface and `public/assets/globe/SOURCES.txt`.

Creator Studio provides 15 free starting points: four imagined worlds and 11 solar-system worlds. Solar presets use their own material, weather and ring defaults; only Saturn starts with rings. Changing the fine-tuning controls creates a custom design. Premium preview and paid entitlement rules remain unchanged.

Project publishing and planet claims validate the new design IDs on the server. Existing ownership, wallet proof, duplicate-address and origin protections apply. No database migration or checkout configuration change is required.

The explorer has 15 total stops: Earthbound, 11 worlds and three deep-space views. Destinations keep stable indices; `routeOrder` controls presentation order. Rocket arrival hands off from Earth orbit, preventing a second ground liftoff. An illustrated textured sphere remains available while the globe loads or if WebGL fails. The star map becomes a scrollable three-column grid on small screens.

Studio's token launch section unlocks for the latest published project and a verified creator session. It provides copy/download details and a deliberate external Pump.fun link. Unpublished edits reset the handoff acknowledgment. PARALLAX does not deploy tokens or submit a wallet transaction through this flow. The simulator remains a hypothetical constant-product pool, not a Pump.fun bonding-curve model.

Verification: wallet/API SQLite tests, Studio client tests, camp boarding/flight controls, normal and reduced-motion route tests, unavailable-WebGL fallback, launch-kit download/handoff guards, simulation invariants, TypeScript check, production build, and native GLES rendering of the production planet shader. Browser/device UI testing and a real Phantom/Pump.fun transaction were not performed in this environment.
