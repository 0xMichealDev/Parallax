/* Shared appearance preferences only. Does not read accounts, wallets or market data. */
(() => {
  'use strict';
  const body = document.body;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'parallax.motion.v1';
  const legacyKey = 'parallax.home.motion.v1';
  const buttons = [...document.querySelectorAll('[data-prlx-motion]')];
  const navToggle = document.querySelector('[data-prlx-nav-toggle]');
  if (navToggle && body.classList.contains('parallax-market-workspace')) {
    navToggle.hidden = false;
    const setExpanded = expanded => {
      body.classList.toggle('prlx-nav-expanded', expanded);
      navToggle.setAttribute('aria-expanded', String(expanded));
      const label = expanded ? 'Collapse navigation' : 'Expand navigation';
      navToggle.setAttribute('aria-label', label);
      navToggle.title = label;
    };
    navToggle.addEventListener('click', () => setExpanded(navToggle.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !document.querySelector('dialog[open]')) setExpanded(false);
    });
    document.addEventListener('click', event => {
      if (body.classList.contains('prlx-nav-expanded') && !event.target.closest('.dashboard-sidebar')) setExpanded(false);
    });
  }
  let requested = !navigator.connection?.saveData;
  try {
    const preference = localStorage.getItem(key) || localStorage.getItem(legacyKey);
    if (preference === 'off') requested = false;
    else if (preference === 'on') requested = true;
  } catch { /* A private browser still gets a working session preference. */ }
  function reconcile(notify = true) {
    const enabled = requested && !media.matches;
    const mode = enabled ? 'running' : 'paused';
    if (body.dataset.motion !== mode) body.dataset.motion = mode;
    body.classList.toggle('prlx-motion-paused', !enabled);
    body.dataset.pageVisible = String(!document.hidden);
    for (const button of buttons) {
      button.hidden = false;
      button.disabled = media.matches;
      button.setAttribute('aria-pressed', String(!enabled));
      const label = media.matches ? 'Motion reduced by your device settings' : enabled ? 'Pause decorative motion' : 'Resume decorative motion';
      button.setAttribute('aria-label', label);
      button.title = label;
      const text = button.querySelector('[data-prlx-motion-label]');
      if (text) text.textContent = media.matches ? 'Reduced motion' : enabled ? 'Motion on' : 'Motion paused';
    }
    if (notify) window.dispatchEvent(new CustomEvent('parallax:motion', {detail:{enabled,requested}}));
  }
  function save() {
    try {
      localStorage.setItem(key, requested ? 'on' : 'off');
      localStorage.setItem(legacyKey, requested ? 'on' : 'off');
    } catch { /* The toggle works even when storage is unavailable. */ }
  }
  buttons.forEach(button => button.addEventListener('click', () => {
    requested = !requested;
    save();
    reconcile();
  }));
  // Existing dashboard controls keep the same preference across all pages.
  document.querySelectorAll('[data-home-motion]').forEach(button => button.addEventListener('click', () => {
    requested = button.getAttribute('aria-pressed') === 'true';
    save();
    reconcile();
  }));
  media.addEventListener('change', () => reconcile());
  document.addEventListener('visibilitychange', () => reconcile(false));
  window.addEventListener('pageshow', () => reconcile());
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === legacyKey) {
      requested = event.newValue !== 'off';
      reconcile();
    }
  });
  reconcile();
})();
