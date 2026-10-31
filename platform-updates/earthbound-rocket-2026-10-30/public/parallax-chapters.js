/* PARALLAX / Chapter instruments.
 * Decorative, progressively enhanced CSS scenes. No market data, wallet access,
 * network calls, or control handlers live in this layer.
 */
(function () {
  'use strict';
  var body = document.body;
  if (!body || !body.dataset.workspacePage || body.dataset.chapterInstruments) return;
  body.dataset.chapterInstruments = 'ready';
  var page = body.dataset.workspacePage;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var precise = window.matchMedia('(hover: hover) and (pointer: fine)');
  var instruments = [];
  var lifePaused = false;
  var observer;
  var motionObserver;

  var orbit = '<div class="chapter-turntable"><i class="chapter-orbit chapter-orbit-a"></i><i class="chapter-orbit chapter-orbit-b"></i><i class="chapter-orbit chapter-orbit-c"></i><i class="chapter-core"></i><i class="chapter-satellite chapter-satellite-a"></i><i class="chapter-satellite chapter-satellite-b"></i></div>';
  var folio = '<div class="chapter-turntable"><i class="chapter-folio chapter-folio-a"><b></b><b></b><b></b></i><i class="chapter-folio chapter-folio-b"><b></b><b></b><b></b></i><i class="chapter-folio chapter-folio-c"><b></b><b></b><b></b></i></div>';
  var radar = '<div class="chapter-radar-plane"><i class="chapter-radar-ring chapter-radar-ring-a"></i><i class="chapter-radar-ring chapter-radar-ring-b"></i><i class="chapter-radar-ring chapter-radar-ring-c"></i><i class="chapter-radar-cross"></i><i class="chapter-radar-sweep"></i><i class="chapter-radar-center"></i></div>';
  var aperture = '<div class="chapter-turntable chapter-aperture"><i></i><i></i><i></i><i></i><i></i><i></i><b class="chapter-aperture-core"></b></div>';
  var forge = '<div class="chapter-turntable chapter-forge"><i class="chapter-face chapter-face-front"></i><i class="chapter-face chapter-face-back"></i><i class="chapter-face chapter-face-top"></i><i class="chapter-face chapter-face-bottom"></i><i class="chapter-face chapter-face-left"></i><i class="chapter-face chapter-face-right"></i><b class="chapter-forge-core"></b></div>';
  var wave = '<div class="chapter-wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>';
  var artwork = { orbit: orbit, astrolabe: orbit, trajectory: orbit, seal: orbit, folio: folio, compare: folio, archive: folio, ledger: folio, radar: radar, scan: radar, aperture: aperture, forge: forge, wave: wave };

  function add(selector, kind, caption, options) {
    var host = document.querySelector(selector);
    if (!host || host.querySelector('.prlx-chapter-art')) return;
    options = options || {};
    var art = document.createElement('div');
    art.className = 'prlx-chapter-art' + (options.compact ? ' chapter-compact' : '');
    art.dataset.art = kind;
    art.dataset.chapterMotion = 'paused';
    art.setAttribute('aria-hidden', 'true');
    art.innerHTML = '<div class="chapter-art-frame"><span class="chapter-reticle chapter-reticle-a"></span><span class="chapter-reticle chapter-reticle-b"></span><div class="chapter-art-perspective">' + artwork[kind] + '</div><span class="chapter-art-baseline"></span></div><span class="chapter-art-caption">' + caption + '</span>';
    host.classList.add('prlx-chapter-host');
    if (options.replaceDecoration && host.getAttribute('aria-hidden') === 'true') {
      // Retire only the old ornament class; legacy descendant selectors would
      // otherwise turn the new folios and rings into the previous tiny dots.
      ['passport-art', 'pro-hero-signature', 'assistant-emblem', 'docs-orbit'].forEach(function (name) {
        if (host.classList.contains(name)) { host.dataset.chapterSlot = name; host.classList.remove(name); }
      });
      host.replaceChildren(art);
      host.classList.add('prlx-chapter-art-only');
    } else {
      host.appendChild(art);
    }
    var item = { element: art, host: host, visible: false, frame: 0 };
    instruments.push(item);
    if (observer) observer.observe(art);
    if (precise.matches) {
      host.addEventListener('pointermove', function (event) {
        if (!item.visible || paused() || !precise.matches || item.frame) return;
        var x = event.clientX;
        var y = event.clientY;
        item.frame = window.requestAnimationFrame(function () {
          item.frame = 0;
          if (paused() || !item.visible) return;
          var bounds = host.getBoundingClientRect();
          if (!bounds.width || !bounds.height) return;
          art.style.setProperty('--chapter-look-x', Math.max(-5, Math.min(5, ((y - bounds.top) / bounds.height - .5) * -10)) + 'deg');
          art.style.setProperty('--chapter-look-y', Math.max(-8, Math.min(8, ((x - bounds.left) / bounds.width - .5) * 16)) + 'deg');
        });
      }, { passive: true });
      host.addEventListener('pointerleave', function () {
        art.style.setProperty('--chapter-look-x', '0deg');
        art.style.setProperty('--chapter-look-y', '0deg');
      }, { passive: true });
    }
  }

  function paused() {
    var root = document.documentElement;
    return lifePaused || document.hidden || reduced.matches || body.dataset.motion === 'paused' || root.dataset.motion === 'paused' || body.classList.contains('prlx-motion-paused') || root.classList.contains('prlx-motion-paused');
  }
  function syncMotion() {
    var stop = paused();
    instruments.forEach(function (item) {
      item.element.dataset.chapterMotion = !stop && item.visible ? 'running' : 'paused';
      if (stop) {
        if (item.frame) window.cancelAnimationFrame(item.frame);
        item.frame = 0;
        item.element.style.setProperty('--chapter-look-x', '0deg');
        item.element.style.setProperty('--chapter-look-y', '0deg');
      }
    });
  }
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var item = instruments.find(function (candidate) { return candidate.element === entry.target; });
        if (item) item.visible = entry.isIntersecting && entry.intersectionRatio > .1;
      });
      syncMotion();
    }, { threshold: [0, .1, .5] });
  }

  switch (page) {
    case 'terminal':
      add('.terminal-command-bar', 'wave', 'MARKET INSTRUMENT', { compact: true });
      break;
    case 'trenches':
      add('.tr-workspace-title', 'scan', 'DISCOVERY SCAN', { compact: true });
      break;
    case 'replay':
      add('.rp-heading', 'trajectory', 'TIME / IN PERSPECTIVE');
      break;
    case 'pro':
      add('.pro-hero-signature', 'astrolabe', 'THE GOLD STANDARD', { replaceDecoration: true });
      break;
    case 'control':
      add('#passport .passport-art', 'folio', 'COLLECT / COMPARE / UNDERSTAND', { replaceDecoration: true });
      add('#wallet .research-intro', 'radar', 'OBSERVE / FOLLOW / RETURN');
      add('#compare .research-intro', 'compare', 'TWO MOMENTS / ONE PERSPECTIVE');
      add('#vault .research-intro', 'archive', 'YOUR EVIDENCE / IN ORDER');
      add('#verify .research-intro', 'seal', 'THE ORIGINAL / PRESERVED');
      break;
    case 'assistant':
      add('.assistant-emblem', 'aperture', 'QUESTIONS / IN FOCUS', { replaceDecoration: true });
      break;
    case 'planets':
      add('.atlas-intro', 'orbit', 'ONE UNIVERSE / MANY WORLDS');
      break;
    case 'studio':
      add('main > .intro', 'forge', 'YOUR WORLD / TAKING SHAPE');
      break;
    case 'creator':
      add('.creator-heading', 'orbit', 'YOUR WORLDS / IN ORBIT');
      break;
    case 'premium':
      add('main > .hero', 'astrolabe', 'THE CREATOR COLLECTION');
      break;
    case 'projects':
      add('.projects-hero-art', 'orbit', 'YOUR PROJECT / ANOTHER DIMENSION', { compact: true });
      break;
    case 'discover':
      add('.discovery-hero', 'trajectory', 'A NEW POINT OF VIEW');
      break;
    case 'docs':
      add('.docs-orbit', 'folio', 'THE PARALLAX FIELD GUIDE', { replaceDecoration: true });
      break;
    case 'roadmap':
      add('main > .hero', 'trajectory', 'THE NEXT PERSPECTIVE');
      break;
    case 'development':
      add('.fund-hero', 'ledger', 'RECORDED / TRACEABLE / OPEN');
      break;
    case 'utility':
      add('.utility-hero', 'seal', 'PARALLAX / PRLX');
      break;
    case 'observatory':
      add('.obs-hero', 'radar', 'YOUR RESEARCH / AT A GLANCE');
      break;
    case 'following':
      add('.following-intro', 'archive', 'THE PROJECTS YOU FOLLOW');
      break;
    case 'briefing':
      add('.briefing-hero', 'folio', 'PICK UP THE THREAD');
      break;
  }

  // Never animate hidden tabs, a background document or a reduced-motion view.
  if ('MutationObserver' in window && instruments.length) {
    motionObserver = new MutationObserver(syncMotion);
    motionObserver.observe(body, { attributes: true, attributeFilter: ['data-motion', 'class'] });
    motionObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion', 'class'] });
  }
  if (reduced.addEventListener) reduced.addEventListener('change', syncMotion);
  document.addEventListener('visibilitychange', syncMotion);
  window.addEventListener('pagehide', function () { lifePaused = true; syncMotion(); });
  window.addEventListener('pageshow', function () { lifePaused = false; syncMotion(); });
  syncMotion();
}());
