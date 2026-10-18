/* Fixed, silent ambient flight. Native playback is independent of page scrolling. */
(() => {
  'use strict';
  const host = document.getElementById('dashboard-flight');
  const video = document.getElementById('dashboard-flight-video');
  if (!host || !video || !document.body.classList.contains('dashboard-flight')) return;
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const retryButtons = [...document.querySelectorAll('[data-flight-retry]')];
  let active = true, started = false, failed = false, blocked = false, pendingPlay = false;
  let deadline = 0, attempt = 0, wasAllowed = false, lastPlaybackTime = 0;
  const allowed = () => active && !document.hidden && !reduced.matches &&
    body.classList.contains('home-motion-running');

  function buttons() {
    for (const button of retryButtons) {
      button.hidden = !allowed() || !(failed || blocked);
      button.textContent = failed ? 'Retry background' : 'Play background';
    }
  }
  function clearDeadline() { clearTimeout(deadline); deadline = 0; }
  function stop() {
    ++attempt; pendingPlay = false;
    clearDeadline(); video.pause();
  }
  function fail() {
    if (failed) return;
    failed = true; blocked = false;
    stop(); host.dataset.state = 'fallback';
    video.removeAttribute('src'); video.load();
    buttons();
  }
  function armDeadline() {
    if (!deadline && allowed() && !failed && !blocked) {
      lastPlaybackTime = video.currentTime;
      deadline = setTimeout(fail, 30000);
    }
  }
  function paint() {
    if (!failed && video.readyState >= 2) host.dataset.state = 'ready';
  }
  function rejection(error) {
    pendingPlay = false;
    if (error?.name === 'NotSupportedError') { fail(); return; }
    // A user gesture may be required by the browser. Never change the saved motion preference.
    blocked = true; clearDeadline(); buttons();
  }
  function play() {
    if (!allowed() || failed || blocked || pendingPlay || !video.paused) return;
    const token = ++attempt;
    pendingPlay = true; armDeadline();
    try {
      const result = video.play();
      if (result?.then) result.then(() => {
        if (token !== attempt) return;
        pendingPlay = false;
        if (!allowed()) { stop(); return; }
        blocked = false; clearDeadline(); paint(); buttons();
      }, error => { if (token === attempt && allowed()) rejection(error); });
      else pendingPlay = false;
    } catch (error) { if (token === attempt) rejection(error); }
  }
  function sync() {
    if (!allowed()) { wasAllowed = false; stop(); buttons(); return; }
    if (!wasAllowed) blocked = false;
    wasAllowed = true;
    if (failed) { buttons(); return; }
    if (!started) {
      started = true;
      // Keep the selected buffer across resizing and phone rotation.
      video.src = matchMedia('(max-width: 900px)').matches || navigator.connection?.saveData
        ? video.dataset.mobileSrc : video.dataset.desktopSrc;
      video.preload = 'auto';
      video.muted = true; video.defaultMuted = true;
      video.loop = true; video.playsInline = true;
      video.defaultPlaybackRate = .75; video.playbackRate = .75;
      video.load();
    }
    play(); buttons();
  }
  function retry() {
    if (!allowed()) return;
    if (failed) { failed = false; started = false; host.dataset.state = 'poster'; }
    blocked = false; sync();
  }
  retryButtons.forEach(button => button.addEventListener('click', retry));
  video.addEventListener('loadeddata', () => { paint(); play(); });
  video.addEventListener('canplay', () => { paint(); play(); });
  video.addEventListener('playing', () => {
    if (!allowed() || failed) { stop(); return; }
    blocked = false; clearDeadline(); paint(); buttons();
  });
  video.addEventListener('timeupdate', () => {
    if (allowed() && !video.paused && !failed && video.currentTime !== lastPlaybackTime) {
      lastPlaybackTime = video.currentTime; clearDeadline(); paint();
    }
  });
  video.addEventListener('waiting', armDeadline);
  video.addEventListener('stalled', armDeadline);
  video.addEventListener('pause', () => {
    if (allowed() && !failed && !pendingPlay && video.readyState >= 2) {
      blocked = true; clearDeadline(); buttons();
    }
  });
  video.addEventListener('ended', play);
  video.addEventListener('error', fail);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  window.addEventListener('pagehide', () => { active = false; sync(); });
  window.addEventListener('pageshow', () => { active = true; sync(); });
  window.addEventListener('online', () => { if (failed) retry(); });
  // home-living remains the sole owner of Pause/Resume and persistent settings.
  if (window.MutationObserver) new MutationObserver(sync).observe(body, { attributes: true, attributeFilter: ['class'] });
  sync();
})();
