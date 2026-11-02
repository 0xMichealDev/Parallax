# Shooting while aiming

Mouse button chords now use mousedown/mouseup, so holding right aim no longer suppresses a subsequent left fire press. Pointer events only suppress conflicting drag setup without cancelling compatibility mouse events. Document-level release clears aim even when the pointer leaves the stage. Tests cover repeated fire while aiming, both release orders, fire-first then aim, and blocking menus. Controller bindings are unchanged.
