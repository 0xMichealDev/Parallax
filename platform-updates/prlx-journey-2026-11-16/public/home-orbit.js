/* Optional homepage view of the same Singularity rendered on the PARALLAX world. */
(() => {
  'use strict';

  const panel = document.getElementById('project-preview');
  const canvas = document.getElementById('home-orbit-canvas');
  const toggle = document.getElementById('home-orbit-toggle');
  const status = document.getElementById('home-orbit-status');
  if (!panel || !canvas || !toggle || !status) return;

  const stage = canvas.parentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const defaultYaw = -.15, defaultPitch = .28;
  let requested = false, pageActive = true, onScreen = !('IntersectionObserver' in window);
  let resource = null, ctx = null, frame = 0, last = 0, time = 0, dirty = true, drag = null;
  let yaw = defaultYaw, pitch = defaultPitch;

  function renderer() {
    if (window.ParallaxSingularity) return Promise.resolve(window.ParallaxSingularity);
    if (!resource) {
      resource = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/singularity-renderer.js?v=118';
        script.onload = () => window.ParallaxSingularity ? resolve(window.ParallaxSingularity) : reject();
        script.onerror = () => { script.remove(); reject(); };
        document.head.append(script);
      }).catch(error => { resource = null; throw error; });
    }
    return resource;
  }

  const canDraw = () => requested && pageActive && onScreen && !panel.hidden && !document.hidden;
  const animate = () => !reduced.matches && document.body.dataset.motion !== 'paused';

  function stopFrames() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }
  function showImage(message = '') {
    requested = false;
    drag = null;
    stopFrames();
    canvas.hidden = true;
    toggle.setAttribute('aria-pressed', 'false');
    toggle.textContent = 'Explore orbit';
    status.textContent = message;
    if (document.activeElement === canvas) toggle.focus({preventScroll: true});
  }
  function queueFrame() {
    if (!frame && canDraw() && ctx && window.ParallaxSingularity) frame = requestAnimationFrame(paint);
  }
  function refresh() {
    dirty = true;
    if (canDraw()) queueFrame();
    else { drag = null; stopFrames(); }
  }
  function paint(now) {
    frame = 0;
    if (!canDraw()) return;
    const moving = animate();
    if (dirty || !last || now - last >= 1000 / 24) {
      const {width, height} = stage.getBoundingClientRect();
      if (!width || !height) return;
      if (moving && last) time += Math.min((now - last) / 1000, .08);
      last = now; dirty = false;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5, 1080 / width);
      const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      ctx.clearRect(0, 0, w, h);
      const radius = Math.min(w * .20, h * .216);
      let live = false;
      try {
        live = window.ParallaxSingularity.draw(ctx, w * .52, h * .45, radius, time, {
          mode: 'original', yaw, pitch, quality: width < 550 ? 384 : 544
        }) === 'live';
      } catch { /* Keep the original image if this device loses its graphics context. */ }
      if (!live) { showImage('3D is unavailable. Showing the project image.'); return; }
      if (canvas.hidden) {
        canvas.hidden = false;
        toggle.textContent = 'Show image';
        status.textContent = 'Drag or use arrow keys to orbit. Home resets the view.';
        if (document.activeElement === toggle) canvas.focus({preventScroll: true});
      }
    }
    if (moving) queueFrame();
  }

  toggle.hidden = false;
  toggle.addEventListener('click', async () => {
    if (requested) { showImage(); return; }
    requested = true; dirty = true;
    toggle.textContent = 'Show image';
    toggle.setAttribute('aria-pressed', 'true');
    status.textContent = 'Loading orbit…';
    try {
      await renderer();
      if (!requested) return;
      ctx ||= canvas.getContext('2d');
      if (!ctx) throw Error();
      refresh();
    } catch { if (requested) showImage('3D is unavailable. Showing the project image.'); }
  });

  function rotate(dx, dy) {
    yaw = (yaw + dx) % (Math.PI * 2);
    pitch = Math.max(-1.15, Math.min(1.15, pitch + dy));
    refresh();
  }
  canvas.addEventListener('keydown', event => {
    if (!requested) return;
    switch (event.key) {
      case 'ArrowLeft': rotate(-.15, 0); break;
      case 'ArrowRight': rotate(.15, 0); break;
      case 'ArrowUp': rotate(0, .12); break;
      case 'ArrowDown': rotate(0, -.12); break;
      case 'Home': yaw = defaultYaw; pitch = defaultPitch; refresh(); break;
      case 'Escape': showImage(); break;
      default: return;
    }
    event.preventDefault();
  });
  canvas.addEventListener('pointerdown', event => {
    if (!requested || drag || event.button !== 0) return;
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY};
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({preventScroll: true});
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    drag.x = event.clientX; drag.y = event.clientY;
    rotate(dx * .012, -dy * .010);
  });
  const endDrag = event => { if (drag?.id === event.pointerId) drag = null; };
  for (const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name, endDrag);

  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    refresh();
  }).observe(stage);
  else window.addEventListener('scroll', () => {
    const rect = stage.getBoundingClientRect();
    onScreen = rect.bottom > 0 && rect.top < window.innerHeight;
    refresh();
  }, {passive:true});
  new MutationObserver(refresh).observe(panel, {attributes:true, attributeFilter:['hidden']});
  if ('ResizeObserver' in window) new ResizeObserver(refresh).observe(stage);
  else window.addEventListener('resize', refresh);
  reduced.addEventListener('change', refresh);
  for (const name of ['parallax:motion','parallax:singularity-ready']) window.addEventListener(name, refresh);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('pagehide', () => { pageActive = false; refresh(); });
  window.addEventListener('pageshow', () => { pageActive = true; refresh(); });
})();
