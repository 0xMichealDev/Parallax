# Hosted v232

Deployed source: 7d39ccaf1ac11191b62fce902b6eef3a8a2d6381.

# Earthbound entry and recovery

Earthbound now opens with a clear entry panel over a landscape image, rather than a blank canvas and a hidden walking button after failure. Camp, launch compound and alien crash site have direct entry buttons. Walking mode also has a location selector. Travel changes the visitor's position, not mission completion.

Loading has a 25-second deadline. Failed and stalled attempts can be retried without refreshing the page; callbacks from discarded attempts cannot revive an old scene. Exit and After Dark cleanup terminate geometry work, dispose model resources and release the graphics context. Context loss returns visitors to the entry panel. Graphics startup no longer forces the low-power adapter or antialiasing; panorama uploads and the render pixel budget are reduced.

The entry panel distinguishes a disabled graphics renderer from a general startup failure and provides retry, a copyable Earthbound link and access to other destinations. Its background does not depend on canvas rendering.

## Validation and remaining limitation

42 focused checks cover failed-to-successful retry, timeout, stale callbacks, context loss, scene disposal, selected-location entry, existing destinations and flights, path clearance and camp interactions. Browser inspection verified the error panel, retry and destination map against an actual disabled WebGL renderer. The browser reported `GL_RENDERER = Disabled`; a website cannot enable graphics that the host browser has disabled. Healthy 3D entry is covered by the integration fixture; actual healthy GPU rendering could not be rechecked in this disabled browser. No claim is made that the host browser's graphics restriction has been repaired.

The existing 14 Meshy compound assets and crew animation remain shipped. No additional Meshy credits were used. Deployment continues to run the reviewed unused-build-asset pruning step to stay within the hosting limit.
