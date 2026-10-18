/* The dashboard's approved flight follows native page scroll. No playback or scroll interception. */
(() => {
  'use strict';
  const host = document.getElementById('dashboard-flight');
  const video = document.getElementById('dashboard-flight-video');
  if (!host || !video || !document.body.classList.contains('dashboard-flight')) return;
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const compact = matchMedia('(max-width: 900px)');
  const retryButtons = [...document.querySelectorAll('[data-flight-retry]')];
  let active = true, started = false, failed = false, pending = false;
  let frame = 0, deadline = 0, lastTarget = NaN, lastTick = 0, selectedSrc = '';
  const motionAllowed = () => active && !document.hidden && !reduced.matches &&
    body.classList.contains('home-motion-running');
  const allowed = () => motionAllowed() && !failed;

  function buttons() {
    for (const button of retryButtons) {
      button.hidden = !failed || !motionAllowed();
      button.textContent = 'Retry background';
    }
  }
  function clearDeadline() { clearTimeout(deadline); deadline = 0; }
  function stopWork() {
    cancelAnimationFrame(frame); frame = 0;
    lastTick = 0;
    clearDeadline();
    video.pause();
  }
  function fail() {
    if (failed) return;
    failed = true;
    stopWork();
    pending = false;
    lastTarget = NaN;
    host.dataset.state = 'fallback';
    video.removeAttribute('src');
    video.load();
    buttons();
  }
  function armDeadline() {
    if (!deadline && allowed() && (pending || video.readyState < 2)) {
      deadline = setTimeout(fail, pending ? 12000 : 30000);
    }
  }
  function paint() {
    if (failed || video.readyState < 2 || pending) return;
    host.dataset.state = 'ready';
    clearDeadline();
  }
  function seek(time) {
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
    if (Number.isFinite(lastTarget) && Math.abs(target - lastTarget) < .001) { lastTick = 0; paint(); return; }
    if (!Number.isFinite(lastTarget) && Math.abs(video.currentTime - target) < 1 / 48) {
      lastTarget = target; paint(); return;
    }
    // Ease wheel/trackpad steps on desktop. Native scrolling itself stays immediate.
    // Bound the elapsed time so a slow decode or restored tab cannot cause a large catch-up jump.
    const elapsed = lastTick ? Math.min(50, Math.max(1, time - lastTick)) : 1000 / 60;
    lastTick = time;
    const next = !compact.matches && Number.isFinite(lastTarget) && Math.abs(target - lastTarget) > 1 / 24
      ? lastTarget + (target - lastTarget) * (1 - Math.exp(-elapsed / 160)) : target;
    pending = true;
    lastTarget = next;
    clearDeadline(); armDeadline();
    try { video.currentTime = next; } catch { fail(); }
  }
  function schedule() {
    if (!allowed() || frame || pending) return;
    frame = requestAnimationFrame(seek);
  }
  function sync() {
    buttons();
    if (!allowed()) { stopWork(); return; }
    // A browser can finish a seek while the page is frozen without delivering its event.
    if (pending && !video.seeking && video.readyState >= 2) {
      pending = false;
      lastTarget = video.currentTime;
      clearDeadline();
      paint();
    }
    if (!started) {
      started = true;
      // Select once: rotating a phone must not discard a buffered journey.
      selectedSrc ||= compact.matches || navigator.connection?.saveData
        ? video.dataset.mobileSrc : video.dataset.desktopSrc;
      video.src = selectedSrc;
      video.preload = 'auto';
      video.muted = true; video.defaultMuted = true;
      video.loop = false; video.autoplay = false; video.playsInline = true;
      video.pause();
      video.load();
    }
    if (pending || video.readyState < 2) armDeadline();
    schedule();
  }
  function retry() {
    if (!motionAllowed() || !failed) return;
    failed = false; started = false; pending = false; lastTarget = NaN;
    host.dataset.state = 'poster';
    sync();
  }
  retryButtons.forEach(button => button.addEventListener('click', retry));
  video.addEventListener('loadedmetadata', schedule);
  video.addEventListener('durationchange', schedule);
  video.addEventListener('loadeddata', () => { paint(); schedule(); });
  video.addEventListener('canplay', () => { paint(); schedule(); });
  video.addEventListener('seeked', () => {
    pending = false;
    clearDeadline(); paint(); schedule();
  });
  video.addEventListener('error', fail);
  video.addEventListener('waiting', armDeadline);
  video.addEventListener('stalled', armDeadline);
  video.addEventListener('play', () => video.pause());
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  window.addEventListener('pagehide', () => { active = false; stopWork(); });
  window.addEventListener('pageshow', () => { active = true; sync(); });
  window.addEventListener('online', retry);
  // home-living owns all controls and the saved preference. This module only reads its state.
  if (window.MutationObserver) new MutationObserver(sync).observe(body, { attributes: true, attributeFilter: ['class'] });
  if (window.ResizeObserver) new ResizeObserver(schedule).observe(body);
  sync();
})();
