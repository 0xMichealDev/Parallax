# Hosted v251

Deployed source: 41d73a7ef0175d7d3ea2224470f6b61cb882274e.

# Shooting while aiming

Mouse button chords now use mousedown/mouseup, so holding right aim no longer suppresses a subsequent left fire press. Pointer events only suppress conflicting drag setup without cancelling compatibility mouse events. Document-level release clears aim even when the pointer leaves the stage. Tests cover repeated fire while aiming, both release orders, fire-first then aim, and blocking menus. Controller bindings are unchanged.
