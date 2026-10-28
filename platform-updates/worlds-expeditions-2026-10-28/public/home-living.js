/* Progressive homepage motion and product examples; no wallet or checkout actions. */
(() => {
  'use strict';
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motionButtons = [...document.querySelectorAll('[data-home-motion]')];
  const motionKey = 'parallax.home.motion.v1';
  let requested = !navigator.connection?.saveData;
  try { if (localStorage.getItem(motionKey) === 'off') requested = false; } catch {}
  let frameId = 0, lastFrame = 0, textureTimer = 0, phase = 6.4, heroVisible = false, graphicsFailed = false;
  const hero = document.getElementById('home-earth-canvas');
  const host = hero?.parentElement;
  let context;
  const enabled = () => requested && !reduced.matches;
  const running = () => enabled() && !document.hidden && !body.classList.contains('intro-film-active');

  function drawEarth() {
    if (!hero || !heroVisible || graphicsFailed || !enabled()) return;
    try {
      context ||= hero.getContext('2d');
      if (!context || !window.ParallaxPlanetRenderer) return;
      const bounds = host.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const ratio = Math.min(devicePixelRatio || 1, 1.3, 1100 / bounds.width);
      const w = Math.round(bounds.width * ratio), h = Math.round(bounds.height * ratio);
      if (hero.width !== w || hero.height !== h) { hero.width = w; hero.height = h; }
      context.clearRect(0, 0, w, h);
      const mobile = bounds.width <= 700;
      const drift = Math.sin((phase - 6.4) * .12) * h * .006;
      const ok = window.ParallaxPlanetRenderer.draw(context, w * (mobile ? .66 : .82) + drift,
        h * .9, h * (mobile ? .82 : .8), 'solar-earth', phase, null);
      if (!ok) { graphicsFailed = true; host.classList.remove('earth-live'); return; }
      if (window.ParallaxPlanetRenderer.ready('solar-earth')) {
        clearTimeout(textureTimer); textureTimer = 0;
        host.classList.add('earth-live');
      } else if (!textureTimer) {
        textureTimer = setTimeout(() => { graphicsFailed = true; host.classList.remove('earth-live'); reconcile(); }, 16000);
      }
    } catch { graphicsFailed = true; host.classList.remove('earth-live'); }
  }

  function frame(time) {
    frameId = 0;
    if (!hero || !running() || !heroVisible || graphicsFailed) return;
    if (!lastFrame || time - lastFrame >= 80) {
      phase += lastFrame ? Math.min((time - lastFrame) / 1000, .2) * .16 : 0;
      lastFrame = time;
      drawEarth();
    }
    if (!graphicsFailed) frameId = requestAnimationFrame(frame);
  }
  function reconcile() {
    body.classList.toggle('home-motion-enabled', enabled());
    body.classList.toggle('home-motion-running', running());
    for (const button of motionButtons) {
      button.hidden = false;
      button.disabled = reduced.matches;
      button.setAttribute('aria-pressed', String(enabled()));
      button.textContent = reduced.matches ? 'Motion reduced' : requested ? 'Pause motion' : 'Resume motion';
    }
    if (hero && running() && heroVisible && !graphicsFailed) {
      if (!frameId) { lastFrame = 0; drawEarth(); if (!graphicsFailed) frameId = requestAnimationFrame(frame); }
    } else { cancelAnimationFrame(frameId); frameId = 0; lastFrame = 0; }
  }
  motionButtons.forEach(button => button.addEventListener('click', () => {
    requested = !requested;
    try { localStorage.setItem(motionKey, requested ? 'on' : 'off'); } catch {}
    reconcile();
  }));
  reduced.addEventListener('change', reconcile);
  document.addEventListener('visibilitychange', reconcile);
  window.addEventListener('parallax:planet-texture', () => { drawEarth(); reconcile(); });
  window.addEventListener('resize', drawEarth, { passive: true });
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frameId); frameId = 0; });
  window.addEventListener('pageshow', reconcile);
  if (window.MutationObserver) new MutationObserver(reconcile).observe(body, { attributes: true, attributeFilter: ['class'] });
  const heroSection = document.querySelector('.dashboard-hero');
  const cards = [...document.querySelectorAll('.path-card')];
  if (window.IntersectionObserver) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === heroSection) heroVisible = entry.isIntersecting;
        entry.target.classList.toggle('is-in-view', entry.isIntersecting);
      }
      reconcile();
    }, { threshold: .05 });
    if (heroSection) observer.observe(heroSection);
    cards.forEach(card => observer.observe(card));
  }
  // Older browsers keep the static image instead of starting an unbounded animation.
  reconcile();

  const compare = document.getElementById('planet-comparison');
  const slider = document.getElementById('planet-reveal');
  if (!compare || !slider) return;
  const premiumImage = document.getElementById('compare-premium-image');
  const name = document.getElementById('compare-look-name');
  const detail = document.getElementById('compare-look-detail');
  const status = document.getElementById('compare-status');
  const looks = {
    biolume: { name: 'Luminous Tide', detail: 'Bioluminescent surface · dust rings · ion atmosphere · two moons', alt: 'A mint bioluminescent planet with dust rings and two companion moons.' },
    glacial: { name: 'Frozen Atlas', detail: 'Glacial surface · double rings · orbital backdrop · two moons', alt: 'An icy blue planet with luminous double rings and two companion moons.' },
    volcanic: { name: 'Molten Core', detail: 'Volcanic surface · halo ring · eclipse backdrop · two moons', alt: 'A volcanic planet with glowing amber fissures, a halo ring and two companion moons.' }
  };
  function reveal() {
    const value = Math.max(0, Math.min(100, Number(slider.value) || 0));
    compare.style.setProperty('--reveal', value + '%');
    slider.setAttribute('aria-valuetext', value + '% free design; ' + (100 - value) + '% premium design');
  }
  slider.disabled = false;
  document.getElementById('compare-help').textContent = 'DRAG TO COMPARE · OR USE THE ARROW KEYS';
  slider.addEventListener('input', reveal);
  reveal();
  compare.classList.add('comparison-ready');
  const options = [...document.querySelectorAll('[data-compare-look]')];
  options.forEach(button => { button.hidden = false; });
  let selection = 0;
  options.forEach(button => button.addEventListener('click', async () => {
    const key = button.dataset.compareLook, look = looks[key];
    if (!look) return;
    const request = ++selection;
    status.textContent = 'Loading ' + look.name + '…';
    const next = new Image();
    next.src = '/assets/home/examples/' + key + '-1000.webp';
    try {
      await next.decode();
      if (request !== selection) return;
      premiumImage.src = next.src;
      premiumImage.alt = look.alt;
      name.textContent = look.name;
      detail.textContent = look.detail;
      options.forEach(option => option.setAttribute('aria-pressed', String(option === button)));
      status.textContent = look.name + ' selected. Use the comparison above to reveal the premium design.';
      compare.scrollIntoView({ behavior: enabled() ? 'smooth' : 'auto', block: 'center' });
      slider.focus({ preventScroll: true });
    } catch { if (request === selection) status.textContent = 'That preview could not load. Please try again.'; }
  }));
})();
