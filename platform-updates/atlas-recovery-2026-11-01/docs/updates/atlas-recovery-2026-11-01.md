# Atlas graphics recovery

The shared planet renderer now recovers after a WebGL context is restored. Previously a temporary graphics interruption permanently set the failed flag, leaving the planet view on its fallback until the page was reloaded. Restoration now rebuilds shaders and textures on the original canvas, reuses decoded images, and notifies Atlas to redraw its cached planets.

A regression test first reproduced the old failure, then passed three loss/restore cycles with texture reuploads and no extra canvas or image requests. Unsupported WebGL remains a bounded fallback. Existing palette, realism, Atlas model and flight checks pass (20 tests). The production build passes. This repairs a confirmed recovery defect; it does not establish the cause of every reported Edge freeze or add WebGL support to the in-app browser.

The unfinished Nexus spaceport is preserved separately and is not part of this repair. No new paid assets or Meshy credits.
