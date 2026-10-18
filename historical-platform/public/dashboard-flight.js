/* The dashboard's approved flight follows native page scroll. No playback or scroll interception. */
(() => {
  'use strict';
  const host = document.getElementById('dashboard-flight');
  const video = document.getElementById('dashboard-flight-video');
  if (!host || !video || !document.body.classList.contains('dashboard-flight')) return;
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let active = true, started = false, failed = false, pending = false;
  let frame = 0, deadline = 0, lastTarget = NaN;
  const allowed = () => active && !failed && !document.hidden && !reduced.matches &&
    body.classList.contains('home-motion-running');

  function clearDeadline() { clearTimeout(deadline); deadline = 0; }
  function stopWork() {
    cancelAnimationFrame(frame); frame = 0;
    clearDeadline();
    video.pause();
  }
  function fail() {
    if (failed) return;
    failed = true;
    stopWork();
    host.dataset.state = 'fallback';
    video.removeAttribute('src');
    video.load();
  }
  function armDeadline() {
    if (!deadline && allowed()) deadline = setTimeout(fail, pending ? 8000 : 20000);
  }
  function paint() {
    if (failed || video.readyState < 2 || pending) return;
    host.dataset.state = 'ready';
    clearDeadline();
  }
  function seek() {
    frame = 0;
    if (!allowed()) return;
    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0 || video.readyState < 1 || pending) {
      armDeadline(); return;
    }
    const page = document.scrollingElement || document.documentElement;
    const distance = Math.max(0, page.scrollHeight - page.clientHeight);
    const progress = distance ? Math.max(0, Math.min(1, page.scrollTop / distance)) : 0;
    // Stop on the last decodable frame, including after a layout change or overscroll.
    const target = progress * Math.max(0, duration - 1 / 24);
    if (Number.isFinite(lastTarget) && Math.abs(target - lastTarget) < 1 / 48) { paint(); return; }
    if (!Number.isFinite(lastTarget) && Math.abs(video.currentTime - target) < 1 / 48) {
      lastTarget = target; paint(); return;
    }
    pending = true;
    lastTarget = target;
    clearDeadline(); armDeadline();
    try { video.currentTime = target; } catch { fail(); }
  }
  function schedule() {
    if (!allowed() || frame || pending) return;
    frame = requestAnimationFrame(seek);
  }
  function sync() {
    if (!allowed()) { stopWork(); return; }
    if (!started) {
      started = true;
      // Select once: rotating a phone must not discard a buffered journey.
      video.src = matchMedia('(max-width: 900px)').matches || navigator.connection?.saveData
        ? video.dataset.mobileSrc : video.dataset.desktopSrc;
      video.preload = 'auto';
      video.muted = true;
      video.load();
    }
    if (pending || video.readyState < 2) armDeadline();
    schedule();
  }
  video.addEventListener('loadedmetadata', schedule);
  video.addEventListener('durationchange', schedule);
  video.addEventListener('loadeddata', () => { paint(); schedule(); });
  video.addEventListener('canplay', () => { paint(); schedule(); });
  video.addEventListener('seeked', () => {
    pending = false;
    clearDeadline(); paint(); schedule();
  });
  video.addEventListener('error', fail);
  video.addEventListener('play', () => video.pause());
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  window.addEventListener('pagehide', () => { active = false; stopWork(); });
  window.addEventListener('pageshow', () => { active = true; sync(); });
  // home-living owns all controls and the saved preference. This module only reads its state.
  if (window.MutationObserver) new MutationObserver(sync).observe(body, { attributes: true, attributeFilter: ['class'] });
  if (window.ResizeObserver) new ResizeObserver(schedule).observe(body);
  sync();
})();
