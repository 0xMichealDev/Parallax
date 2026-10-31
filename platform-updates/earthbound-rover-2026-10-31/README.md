# Earthbound rover — hosted v228

Native source: `8c30b81415f7a861e7cb9765e72d7c3a7e4e10e1`. Previous native source: `bc4320d02021f78f04c9bc6f8111d0945118455d`.

Textured Rover 01, independently animated wheels, vehicle-aligned headlights and parked work lighting. Rover 02 and procedural fallback remain.

The reviewed asset is 4,714,688 bytes and 30,616 triangles. Meshy generation, textures and remeshing cost 35 credits total. See the exported release notes and asset provenance for exact details and practical limits.

Validation: production build and 40 focused native checks passed; local Windows browser boarding, driving, steering, kickflip and exit passed with no reported graphics errors. The four exported suites exercise 26 model/world/stunt checks. No physical mobile/controller test is claimed.

Run from this directory:

`node --test tests/rover-model.test.cjs tests/rocket-model.test.cjs tests/rover-stunts.test.cjs tests/desert-world.test.cjs`

Source files are exact Git blobs from the recorded native revision. No private application implementation or hosting credentials are included.
