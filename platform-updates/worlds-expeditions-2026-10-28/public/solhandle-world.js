/* One original creator record, one shared planet design, no wallet actions. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('shw-planet'), scene = $('shw-scene'), fallback = $('shw-fallback');
  if (!canvas || !scene || !fallback) return;
  let world;
  try { world = JSON.parse($('shw-data').textContent); } catch { return; }
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let playing = !motion.matches && !navigator.connection?.saveData;
  let phase = 6.4, drag = null, raf = 0, last = 0, active = true, visible = !window.IntersectionObserver, ready = false;
  const renderer = () => window.ParallaxPlanetRenderer;
  const available = () => active && visible && !document.hidden;
  const animating = () => available() && ready && playing && !motion.matches;
  function stop() { cancelAnimationFrame(raf); raf = 0; last = 0; }
  function controls() {
    $('shw-controls').hidden = !ready;
    $('shw-motion').disabled = motion.matches;
    $('shw-motion').textContent = motion.matches ? 'Reduced motion' : playing ? 'Pause rotation' : 'Resume rotation';
    $('shw-motion').setAttribute('aria-pressed', String(playing && !motion.matches));
    canvas.tabIndex = ready ? 0 : -1;
  }
  function draw() {
    if (!available()) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = Math.round(Math.min(1500, Math.max(700, (canvas.clientWidth || 800) * Math.min(devicePixelRatio || 1, 2))));
    const height = Math.round(width / 1.12);
    if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
    ctx.clearRect(0, 0, width, height);
    const cx = width * .5, cy = height * .49, radius = Math.min(width * .235, height * .28);
    for (let i = 0; i < 45; i++) {
      ctx.fillStyle = i % 9 ? '#97b4df33' : '#cbd4fa88';
      ctx.fillRect(i * 137.7 % width, i * 71.3 % height, i % 9 ? 1 : 1.5, i % 9 ? 1 : 1.5);
    }
    let painted = false;
    try { painted = !!renderer()?.draw(ctx, cx, cy, radius, world.design, phase, world.style); } catch { /* Keep static art available. */ }
    ready = painted && !!renderer()?.ready(world.design, world.style);
    scene.classList.toggle('shw-ready', ready);
    $('shw-render-status').textContent = ready ? renderer().available() ? 'DRAG OR USE ← → TO EXPLORE' : 'ILLUSTRATED VIEW / DRAG TO TURN' : 'THE IDENTITY WORLD';
    controls();
  }
  function frame(now) {
    raf = 0;
    if (!animating()) return;
    if (!last || now - last >= 80) {
      phase += last ? Math.min((now - last) / 1000, .2) * .19 : 0;
      last = now; draw();
    }
    if (animating()) raf = requestAnimationFrame(frame);
  }
  function reconcile() { stop(); draw(); controls(); if (animating()) raf = requestAnimationFrame(frame); }
  $('shw-motion').addEventListener('click', () => { playing = !playing; reconcile(); });
  $('shw-reset').addEventListener('click', () => { phase = 6.4; draw(); });
  canvas.addEventListener('keydown', event => {
    if (!ready || !['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault(); phase = event.key === 'Home' ? 6.4 : phase + (event.key === 'ArrowRight' ? 1 : -1); draw();
  });
  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !ready) return;
    drag = {id:event.pointerId, x:event.clientX, y:event.clientY, last:event.clientX, captured:false};
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.captured) {
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 8) { drag = null; return; }
      if (Math.abs(dx) < 8) return;
      drag.captured = true; canvas.setPointerCapture?.(event.pointerId);
    }
    phase += (event.clientX - drag.last) * .026; drag.last = event.clientX; draw();
  });
  for (const name of ['pointerup','pointercancel','lostpointercapture']) canvas.addEventListener(name, () => { drag = null; });
  motion.addEventListener('change', () => { if (motion.matches) playing = false; reconcile(); });
  document.addEventListener('visibilitychange', reconcile);
  window.addEventListener('parallax:planet-texture', reconcile);
  window.addEventListener('resize', draw, {passive:true});
  window.addEventListener('pagehide', () => { active = false; stop(); });
  window.addEventListener('pageshow', () => { active = true; reconcile(); });
  fallback.addEventListener('load', reconcile);
  fallback.addEventListener('error', () => { if (!ready) $('shw-render-status').textContent = 'Loading the identity world…'; });
  if (window.IntersectionObserver) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; reconcile(); }, {threshold:.03}).observe(scene);
  $('shw-copy').addEventListener('click', async () => {
    const link = world.shareUrl || 'https://parallaxlaunch.live' + world.href;
    try {
      await navigator.clipboard.writeText(link);
      $('shw-share-status').textContent = 'Planet link copied.';
      $('shw-copy-fallback').hidden = true;
    } catch {
      $('shw-copy-fallback').hidden = false;
      $('shw-copy-fallback').focus(); $('shw-copy-fallback').select();
      $('shw-share-status').textContent = 'Copy the planet link below.';
    }
  });
  // Use the existing creator APIs; personal access still comes from the server.
  fetch('/api/missions/' + encodeURIComponent(world.id), {credentials:'same-origin',cache:'no-store'})
    .then(response => response.ok ? response.json() : null)
    .then(project => {
      if (project?.id !== world.id || project.wallet !== world.creatorWallet) return;
      window.ParallaxProjectMetrics?.start(project.id, !!project.canManage);
      // The share alias has the full project page, without a new analytics entry.
      if (world.shareUrl && location.pathname === new URL(world.shareUrl).pathname) {
        window.ParallaxPlanetUpdates?.world(project.id);
        window.ParallaxProjectResearch?.load(project.id);
      }
    }).catch(() => { $('project-update-feed').textContent = 'Creator updates are temporarily unavailable. Reload to try again.'; });
  reconcile();
})();
