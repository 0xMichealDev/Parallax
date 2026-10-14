(() => {
  'use strict';
  const chapters = window.ParallaxTourChapters, policy = window.ParallaxTourPolicy;
  const entry = document.querySelector('#guided-tour-play');
  // The same HTML serves shared mission pages. Only the homepage owns idle playback.
  if (!entry || !chapters || !policy) return;
  const read = (store, key) => { try { return store.getItem(key); } catch { return null; } };
  const write = (store, key, value) => { try { store.setItem(key, value); } catch {} };
  const AUTO = 'parallax.guided-tour.auto.v1', SEEN = 'parallax.guided-tour.seen.v1';
  const SOUND = 'parallax.guided-tour.voice.v1';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let enabled = read(localStorage, AUTO) !== 'off';
  let seen = read(sessionStorage, SEEN) === 'yes';
  let voiceOn = read(localStorage, SOUND) === 'on', musicOn = true, captionsOn = true;
  let index = 0, elapsed = 0, opened = false, paused = false, ended = false;
  let audioReady = false, epoch = 0, ticker = 0, idleTimer = 0, loadTimer = 0, last = 0, returnFocus;
  const dialog = document.createElement('dialog');
  dialog.id = 'parallax-tour';
  dialog.setAttribute('aria-labelledby', 'pt-name');
  dialog.innerHTML = `<div class="pt-shell">
    <header class="pt-header"><div class="pt-brand">◎ PARALLAX<span id="pt-name">DISCOVER PARALLAX</span></div><button type="button" id="pt-close">Back to site <span aria-hidden="true">×</span></button></header>
    <div class="pt-stage"><section class="pt-copy" aria-labelledby="pt-title"><p id="pt-eyebrow"></p><h2 id="pt-title"></h2><p id="pt-summary"></p><ol id="pt-steps"></ol><a id="pt-action" href="/control"></a></section>
    <figure class="pt-visual"><div class="pt-browser"><i></i><i></i><i></i><span id="pt-screen-label">PARALLAX / SITE WALKTHROUGH</span></div><img id="pt-image" alt="" width="1341" height="921"><figcaption id="pt-image-note">A look inside Parallax</figcaption></figure></div>
    <div class="pt-caption" id="pt-caption"></div>
    <footer class="pt-footer"><div class="pt-chapters" role="group" aria-label="Choose a tour chapter"></div><div class="pt-progress"><progress id="pt-progress" value="0" max="100" aria-label="Tour progress"></progress><output id="pt-time"></output></div>
    <div class="pt-controls"><div class="pt-playback"><button type="button" id="pt-prev" aria-label="Previous chapter">←</button><button type="button" id="pt-pause">Pause</button><button type="button" id="pt-next" aria-label="Next chapter">→</button></div><div class="pt-options"><button type="button" id="pt-voice" aria-pressed="false">Enable voiceover</button><button type="button" id="pt-music" aria-pressed="true">Music on</button><button type="button" id="pt-cc" aria-pressed="true" aria-label="Show captions">CC</button><button type="button" data-tour-auto aria-pressed="true">Idle tour on</button></div></div>
    <div class="pt-meta"><p id="pt-status" role="status"></p><details id="pt-transcript"><summary>Read this chapter</summary><p id="pt-transcript-text"></p></details></div></footer>
    <audio id="pt-audio" preload="metadata" playsinline controls aria-label="Chapter voiceover player"></audio><audio id="pt-bed" preload="none" loop></audio></div>`;
  document.body.append(dialog);
  const q = s => dialog.querySelector(s), voice = q('#pt-audio'), music = q('#pt-bed');
  const autoButtons = [...document.querySelectorAll('[data-tour-auto]')];
  const buttons = [], total = chapters.reduce((sum, c) => sum + c.duration, 0);
  voice.volume = 1; music.volume = .065;
  music.src = '/assets/guided-tour/music.mp3';
  const stamp = n => Math.floor(n / 60) + ':' + String(Math.floor(n % 60)).padStart(2, '0');
  const status = text => { q('#pt-status').textContent = text; };
  const markSeen = () => { seen = true; write(sessionStorage, SEEN, 'yes'); };
  function preferences() {
    autoButtons.forEach(b => { b.textContent = 'Idle tour ' + (enabled ? 'on' : 'off'); b.setAttribute('aria-pressed', String(enabled)); });
    q('#pt-voice').textContent = voiceOn ? 'Voiceover on' : 'Enable voiceover';
    q('#pt-voice').setAttribute('aria-pressed', String(voiceOn));
    q('#pt-music').textContent = musicOn ? 'Music on' : 'Music off';
    q('#pt-music').setAttribute('aria-pressed', String(musicOn));
    q('#pt-cc').setAttribute('aria-pressed', String(captionsOn));
    q('#pt-caption').hidden = !captionsOn;
    q('#pt-pause').textContent = ended ? 'Replay' : paused ? 'Play' : 'Pause';
    q('#pt-pause').setAttribute('aria-label', ended ? 'Replay tour' : paused ? 'Play tour' : 'Pause tour');
    q('#pt-prev').disabled = index === 0;
    q('#pt-next').disabled = index === chapters.length - 1;
  }
  function eligible() {
    return policy.eligible({enabled, seen, hidden: document.hidden, focused: document.hasFocus(),
      nearTop: scrollY < Math.max(180, document.querySelector('.research-home')?.offsetHeight || 0), editing: !!document.activeElement?.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]'),
      modal: !!document.querySelector('dialog[open],[aria-modal="true"]'), reduced: reduced.matches,
      motionPaused: document.body.classList.contains('motion-paused'),
      mediaPlaying: [...document.querySelectorAll('audio,video')].some(a => !a.paused && !a.ended)});
  }
  function arm() {
    clearTimeout(idleTimer);
    if (location.pathname === '/' && !opened && enabled && !seen) idleTimer = setTimeout(() => { if (eligible()) open(true); else arm(); }, policy.IDLE_MS);
  }
  function quietFallback(message) {
    clearTimeout(loadTimer); epoch++; audioReady = false; voiceOn = false;
    voice.pause(); music.pause(); status(message); preferences(); last = performance.now();
  }
  function playAudio() {
    if (!opened || paused || ended || !voiceOn || document.hidden) return;
    const token = ++epoch;
    audioReady = false;
    clearTimeout(loadTimer);
    loadTimer = setTimeout(() => { if (token === epoch && !audioReady) quietFallback('Audio is taking a moment. Captions are continuing; tap Enable voiceover to retry.'); }, 10000);
    // play() is called directly from a click when possible; a blocked autoplay stays useful with captions.
    voice.play().then(() => {
      if (token !== epoch || !opened || paused || document.hidden) return;
      clearTimeout(loadTimer); audioReady = true; status('Voiceover playing · Use the chapter buttons to explore.');
    }).catch(() => {
      if (token === epoch && opened) quietFallback('Tap Enable voiceover to hear the tour. Captions are playing.');
    });
    if (musicOn) music.play().catch(() => {});
  }
  function draw() {
    const c = chapters[index];
    const before = chapters.slice(0, index).reduce((sum, chapter) => sum + chapter.duration, 0);
    const duration = audioReady && Number.isFinite(voice.duration) ? voice.duration : c.duration;
    const progress = ended ? total : before + Math.min(elapsed / duration, 1) * c.duration;
    q('#pt-progress').value = progress / total * 100;
    q('#pt-time').textContent = stamp(progress) + ' / ' + stamp(total);
    q('#pt-caption').textContent = policy.caption(c.voice, elapsed, duration);
    buttons.forEach((b, i) => {
      b.setAttribute('aria-pressed', String(i === index));
      b.style.setProperty('--pt-progress', i < index ? '100%' : i === index ? Math.min(100, elapsed / duration * 100) + '%' : '0%');
    });
  }
  function showChapter(next) {
    epoch++; clearTimeout(loadTimer); voice.pause(); audioReady = false;
    index = Math.max(0, Math.min(chapters.length - 1, next)); elapsed = 0; ended = false;
    const c = chapters[index];
    dialog.dataset.chapter = c.id;
    q('#pt-eyebrow').textContent = c.eyebrow;
    q('#pt-title').textContent = c.title;
    q('#pt-summary').textContent = c.summary;
    q('#pt-steps').replaceChildren(...c.steps.map(step => { const li = document.createElement('li'); li.textContent = step; return li; }));
    q('#pt-action').textContent = c.action + ' ↗'; q('#pt-action').href = c.href;
    q('#pt-image').src = c.image === 'earth' ? '/assets/earth-cinematic.png' : '/assets/guided-tour/' + c.image;
    q('#pt-image').alt = c.alt;
    q('#pt-image-note').textContent = c.image === 'earth' ? 'Parallax / A universe we’re building together' : c.id === 'create' ? 'Site screen · Hypothetical example scenario' : 'Site screen · Explore the live tools using the link';
    q('#pt-screen-label').textContent = c.id === 'next' ? 'PARALLAX / THE ROAD AHEAD' : 'PARALLAX / SITE WALKTHROUGH';
    q('#pt-transcript-text').textContent = c.voice;
    voice.src = '/assets/guided-tour/' + c.id + '.mp3';
    last = performance.now(); preferences(); draw();
    if (!paused) playAudio();
  }
  function finish() {
    ended = true; paused = true; epoch++; clearTimeout(loadTimer); voice.pause(); music.pause();
    elapsed = chapters[index].duration; preferences(); draw();
    status('Thanks for being part of Parallax. Replay the tour or return to the site.');
  }
  function advance() { if (index === chapters.length - 1) finish(); else showChapter(index + 1); }
  function tick() {
    const now = performance.now(), delta = Math.min((now - last) / 1000, .5); last = now;
    if (!opened || paused || document.hidden) return;
    if (voiceOn) { if (audioReady) elapsed = voice.currentTime; }
    else elapsed += delta;
    if (!voiceOn && elapsed >= chapters[index].duration) advance();
    draw();
  }
  function setPaused(value) {
    paused = value; last = performance.now();
    if (paused) { epoch++; clearTimeout(loadTimer); voice.pause(); music.pause(); status('Paused · Continue whenever you’re ready.'); }
    else { q('#pt-transcript').open = false; playAudio(); if (!voiceOn) status('Captions playing · Tap Enable voiceover to listen.'); }
    preferences();
  }
  function open(automatic = false) {
    if (opened || document.querySelector('dialog[open],[aria-modal="true"]')) return;
    returnFocus = document.activeElement; markSeen(); clearTimeout(idleTimer);
    opened = true; paused = false; ended = false;
    voiceOn = !automatic; if (!automatic) write(localStorage, SOUND, 'on');
    dialog.showModal(); document.body.classList.add('guided-tour-active');
    q('#pt-transcript').open = false;
    showChapter(0);
    status(automatic ? 'A quick look around Parallax. Enable voiceover to listen, or return to the site at any time.' : 'Welcome to Parallax. Voiceover and captions guide each chapter.');
    q(voiceOn ? '#pt-close' : '#pt-voice').focus({preventScroll: true});
    ticker = setInterval(tick, 250);
  }
  function cleanup() {
    if (!opened) return;
    opened = false; epoch++; clearInterval(ticker); clearTimeout(loadTimer);
    voice.pause(); music.pause(); voice.removeAttribute('src'); voice.load();
    document.body.classList.remove('guided-tour-active');
    returnFocus?.focus({preventScroll: true});
  }
  function close() { dialog.close(); cleanup(); }
  chapters.forEach((c, i) => {
    const button = document.createElement('button'); button.type = 'button';
    button.textContent = String(i + 1).padStart(2, '0') + ' ' + ['Welcome','Passports','Changes','Wallets','Explore','Create','What’s next','Thank you'][i];
    button.setAttribute('aria-label', 'Chapter ' + (i + 1) + ': ' + c.title);
    button.onclick = () => { const wasEnded = ended; if (wasEnded) paused = false; showChapter(i); };
    q('.pt-chapters').append(button); buttons.push(button);
  });
  autoButtons.forEach(b => { b.onclick = () => { enabled = !enabled; if(enabled){seen=false;write(sessionStorage, SEEN, 'no');} write(localStorage, AUTO, enabled ? 'on' : 'off'); preferences(); arm(); }; });
  entry.onclick = () => open(false);
  const topEntry=document.querySelector('#tour-play-top');if(topEntry)topEntry.onclick=()=>open(false);
  q('#pt-close').onclick = close;
  q('#pt-prev').onclick = () => showChapter(index - 1);
  q('#pt-next').onclick = () => showChapter(index + 1);
  q('#pt-pause').onclick = () => { if (ended) { paused = false; showChapter(0); } else setPaused(!paused); };
  q('#pt-voice').onclick = () => {
    voiceOn = !voiceOn; write(localStorage, SOUND, voiceOn ? 'on' : 'off');
    if (voiceOn) { paused = false; showChapter(ended ? 0 : index); }
    else { epoch++; clearTimeout(loadTimer); voice.pause(); music.pause(); audioReady = false; status('Voiceover off · Captions continue.'); }
    preferences();
  };
  q('#pt-music').onclick = () => { musicOn = !musicOn; if (!musicOn) music.pause(); else if (opened && voiceOn && !paused) music.play().catch(() => {}); preferences(); };
  q('#pt-cc').onclick = () => { captionsOn = !captionsOn; preferences(); };
  q('#pt-transcript').addEventListener('toggle', () => { if (q('#pt-transcript').open && opened) setPaused(true); });
  q('#pt-action').onclick = event => {
    const c = chapters[index];
    close();
    if (c.href.startsWith('/#')) {
      event.preventDefault(); const target = document.querySelector(c.href.slice(1));
      target?.scrollIntoView({behavior: reduced.matches ? 'instant' : 'smooth', block: 'start'});
      if (target) { target.setAttribute('tabindex', '-1'); target.focus({preventScroll: true}); }
    }
  };
  voice.addEventListener('playing',()=>{if(!opened)return;clearTimeout(loadTimer);audioReady=true;voiceOn=true;paused=false;last=performance.now();status('Voiceover playing.');preferences();});
  voice.addEventListener('ended', () => { if (opened && voiceOn && !paused && audioReady) advance(); });
  voice.addEventListener('error', () => { if (opened && voiceOn) quietFallback('This audio chapter could not load. Captions are continuing; you can retry voiceover.'); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.addEventListener('close', cleanup);
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' && index < chapters.length - 1) { event.preventDefault(); showChapter(index + 1); }
    if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); showChapter(index - 1); }
  });
  for (const name of ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart', 'input', 'focusin']) document.addEventListener(name, () => { if (!opened) arm(); }, {passive: true});
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(idleTimer); if (opened && !paused) setPaused(true); } else arm(); });
  addEventListener('blur', () => { clearTimeout(idleTimer); if (opened && !paused) setPaused(true); });
  addEventListener('focus', arm);
  addEventListener('pagehide', () => { if (opened) close(); clearTimeout(idleTimer); });
  addEventListener('pageshow', arm);
  reduced.addEventListener('change', arm);
  // One idle experience. After Dark stays available as a manually selected cinematic tour.
  window.parallaxGuidedTour = {open: () => open(false)};
  preferences(); arm();
})();
