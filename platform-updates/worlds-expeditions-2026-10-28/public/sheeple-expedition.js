/* The expedition controller records only interactions reported by the habitat scene. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('expedition-canvas'), log = window.ParallaxExpeditionLog;
  if (!canvas || !log) return;
  const places = Object.freeze({
    flock:{name:'The flock', action:'Baa to the flock', objective:'Meet the flock', instruction:'Walk over to the flock and press B to baa.', found:'Baa received. The flock knows you now.'},
    signal:{name:'Signal station', action:'Wake the signal', objective:'Wake the signal', instruction:'Jump through the three glowing signal rings, then wake the beacon.', found:'The signal station is awake. A little light reaches the moon.'},
    bell:{name:'The golden bell', action:'Jump for the bell', objective:'Ring the golden bell', instruction:'Find the golden bell beyond the arch and jump beneath it.', found:'One small leap. One very golden bell.'}
  });
  const ids = Object.keys(places);
  const nav = Array.from(document.querySelectorAll('[data-expedition-go]'));
  const checks = Array.from(document.querySelectorAll('[data-expedition-check]'));
  const moveButtons = Array.from(document.querySelectorAll('[data-expedition-move]'));
  const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const params = new URLSearchParams(window.location.search);
  const shareURL = 'https://parallaxlaunch.live/expeditions/sheeple?arrival=1';
  const stampArt = '/assets/expeditions/lunar-flock-stamp.svg';
  const dialogNames = ['welcome', 'log', 'stamp', 'help'];
  const dialogs = dialogNames.map(name => $('expedition-' + name + '-dialog')).filter(Boolean);
  const openers = new Map(), downloadURLs = new Map();
  let scene = null, ready = false, active = true, started = false, phase = 'intro';
  let photo = false, capturing = false, arrivalTimer = 0, epoch = 0, initialIntentConsumed = false;
  let motion = !media?.matches && !navigator.connection?.saveData;
  let lastStatus = {location:null, nearby:null, arriving:false, travelling:false, renderMode:null, sparks:0, hint:'', distance:null};
  let resumeLocation = null, pendingFocus = null, unsubscribe = null, appliedMotion = null, appliedPlaying = null;
  let sound = null, soundStatus = 'ready';
  const moves = new Map();

  const text = (id, value) => { const element = $(id); if (element) element.textContent = value; };
  const status = message => text('expedition-status', message);
  const known = id => typeof id === 'string' && Object.prototype.hasOwnProperty.call(places, id);
  const anyDialog = () => dialogs.some(dialog => dialog.open || dialog.hasAttribute('open'));
  const exploring = () => active && ready && started && phase === 'exploring' && !anyDialog();
  const canPlay = () => exploring() && !photo && !document.hidden;
  function focusWorld() { if (canPlay()) canvas.focus({preventScroll:true}); }
  function releaseMoves() { moves.clear(); scene?.setMove?.(0, 0); }
  function updateMove() {
    let right = 0, forward = 0;
    for (const move of moves.values()) { right += move[0]; forward += move[1]; }
    scene?.setMove?.(Math.max(-1, Math.min(1, right)), Math.max(-1, Math.min(1, forward)));
  }
  function setMissionsExpanded(value) {
    const panel = $('expedition-mission-panel'), button = $('expedition-missions-toggle');
    if (panel) panel.dataset.expanded = String(value);
    button?.setAttribute('aria-expanded', String(value));
  }
  function on(element, name, handler, options) { element?.addEventListener(name, handler, options); }
  function make(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (value !== undefined) element.textContent = value;
    return element;
  }
  function dateLabel(value) {
    if (!value) return '';
    try { return new Date(value).toLocaleDateString(undefined, {year:'numeric', month:'long', day:'numeric'}); }
    catch { return value.slice(0, 10); }
  }
  function storageMessage(state) {
    if (state.persistence === 'device') return 'Progress is saved in this browser on this device.';
    if (state.storageIssue === 'corrupt' || state.storageIssue === 'unsupported') return 'Your saved log could not be read. New progress lasts for this visit.';
    return 'Browser storage is unavailable. Progress lasts for this visit.';
  }
  function applyMotion() {
    const enabled = !!(motion && ready && active && started && phase === 'exploring' && !document.hidden && !photo && !anyDialog());
    if (scene && enabled !== appliedMotion) {
      // Set the cache before calling the scene, which may publish a status update.
      appliedMotion = enabled;
      scene.setMotion?.(enabled);
    }
    const playing = canPlay();
    if (scene && playing !== appliedPlaying) {
      appliedPlaying = playing;
      if (!playing) releaseMoves();
      scene.setPlaying?.(playing);
    }
    const button = $('expedition-motion');
    if (button) {
      button.disabled = !!media?.matches || !ready;
      button.textContent = media?.matches ? 'Reduced motion' : motion ? 'Ambient motion on' : 'Ambient motion off';
      button.setAttribute('aria-pressed', String(motion && !media?.matches));
    }
  }
  function updateControls() {
    const available = exploring();
    for (const button of nav) button.disabled = !available;
    const nearby = lastStatus.nearby;
    const interact = $('expedition-interact');
    if (interact) {
      interact.disabled = !available || photo || !nearby || (nearby === 'signal' && lastStatus.sparks < 3);
      interact.textContent = nearby === 'board' ? 'Read the field guide' : nearby === 'signal' && lastStatus.sparks < 3 ? 'Find the signal rings' : known(nearby) ? places[nearby].action : 'Explore the habitat';
    }
    text('expedition-location', nearby === 'board' ? 'THE FLOCK / FIELD GUIDE' : known(nearby) ? places[nearby].name : 'ROAM FREE');
    text('expedition-waypoint-title', known(lastStatus.location) ? places[lastStatus.location].objective : 'Your hooves. Your adventure.');
    text('expedition-waypoint-hint', lastStatus.hint || (known(lastStatus.location) ? places[lastStatus.location].instruction : 'Walk, jump, baa. The moon is yours to explore.'));
    text('expedition-waypoint-distance', Number.isFinite(lastStatus.distance) && known(lastStatus.location) ? Math.round(lastStatus.distance) + ' m' : '');
    text('expedition-spark-count', lastStatus.sparks + ' / 3 rings');
    document.body.dataset.nearby = nearby || '';
    for (const button of nav) {
      if (button.dataset.expeditionGo === lastStatus.location) button.setAttribute('aria-current', 'location');
      else button.removeAttribute('aria-current');
    }
    for (const id of ['expedition-reset', 'expedition-photo']) if ($(id)) $(id).disabled = !available;
    for (const id of ['expedition-jump', 'expedition-baa']) if ($(id)) $(id).disabled = !available || photo;
    for (const button of moveButtons) button.disabled = !available || photo;
    if ($('expedition-sound')) {
      const labels = {ready:'Baa enables sound', starting:'Enabling sound…', on:'Sound on · mute', muted:'Muted · enable sound', blocked:'Enable sound', unavailable:'Audio unavailable'};
      $('expedition-sound').textContent = labels[soundStatus] || 'Enable sound';
      $('expedition-sound').setAttribute('aria-pressed', String(soundStatus === 'on'));
      $('expedition-sound').disabled = !ready;
    }
    if ($('expedition-start')) $('expedition-start').disabled = !ready || started;
    if ($('expedition-capture')) $('expedition-capture').disabled = !ready || capturing;
    applyMotion();
  }
  function setPhase(value) {
    phase = value;
    document.body.dataset.expeditionState = value;
    if ($('expedition-intro')) $('expedition-intro').hidden = value !== 'intro';
    if ($('expedition-arrival')) $('expedition-arrival').hidden = value !== 'arriving';
    updateControls();
  }
  function clearArrival() { if (arrivalTimer) clearTimeout(arrivalTimer); arrivalTimer = 0; }
  function resumeLanding() {
    if (!exploring()) return;
    if (pendingFocus) { const id = pendingFocus; pendingFocus = null; navigate(id); }
  }
  function finishLanding() {
    if (!active || !started || phase !== 'arriving') return;
    clearArrival();
    setPhase('exploring');
    status('You are the sheep. Move with WASD or arrows, jump with Space, and baa with B.');
    focusWorld();
    resumeLanding();
  }
  function beginLanding() {
    if (!active || !ready || started) return;
    started = true;
    setPhase('arriving');
    status(media?.matches ? 'Arriving at the Lunar Flock.' : 'Descending to the Lunar Flock. You can skip the arrival.');
    $('expedition-skip')?.focus({preventScroll:true});
    try {
      scene.flyIn();
      // Reduced-motion arrival may finish without changing the scene's deduplicated status.
      const current = scene.getState?.();
      if (current && typeof current.arriving === 'boolean') receiveStatus(current);
    }
    catch { scene?.skipArrival?.(); finishLanding(); }
    // A lost renderer callback must never strand the visitor behind the arrival layer.
    if (phase === 'arriving') arrivalTimer = setTimeout(() => { scene?.skipArrival?.(); finishLanding(); }, 4400);
  }
  function skipArrival() {
    if (!started || phase !== 'arriving') return;
    scene?.skipArrival?.();
    finishLanding();
  }
  function navigate(id) {
    if (!known(id) || !exploring()) return;
    status(places[id].instruction);
    scene?.focus?.(id);
    setMissionsExpanded(false);
    focusWorld();
  }
  function receiveStatus(next) {
    if (!active || !next || typeof next !== 'object') return;
    lastStatus = {
      location:known(next.mission) ? next.mission : known(next.location) ? next.location : null,
      nearby:known(next.nearby) || next.nearby === 'board' ? next.nearby : null,
      arriving:!!next.arriving,
      travelling:!!next.travelling,
      sparks:Math.max(0, Math.min(3, Number(next.sparks) || 0)),
      hint:typeof next.hint === 'string' ? next.hint : '',
      distance:Number.isFinite(next.distance) ? next.distance : null,
      renderMode:next.renderMode === 'webgl' ? 'webgl' : next.renderMode === 'canvas' ? 'canvas' : null
    };
    if (lastStatus.renderMode) document.body.dataset.expeditionRenderer = lastStatus.renderMode;
    if (started && phase === 'arriving' && !lastStatus.arriving) finishLanding();
    updateControls();
  }
  function receiveInteraction(id) {
    // Selection, flying, page visits, timers and photo capture never award discoveries.
    if (!known(id) || !canPlay()) return;
    const before = log.read();
    const next = log.discover(id);
    const wasSeen = before.discoveries.includes(id);
    const ending = next.readyToClaim ? ' All three discoveries are yours. Collect your stamp when you are ready.' : next.claimed ? ' Your discovery stamp is already in your travel log.' : ' ' + next.count + ' of 3 discoveries.';
    status(places[id].found + (wasSeen ? ' Welcome back.' : '') + ending);
  }
  function restoreFocus(dialog) {
    const opener = openers.get(dialog);
    openers.delete(dialog);
    if (!active) return;
    const target = started && !photo ? canvas : opener?.isConnected && !opener.disabled && !opener.hidden ? opener : $('expedition-start');
    target?.focus({preventScroll:true});
  }
  function closeDialog(dialog) {
    if (!dialog || !(dialog.open || dialog.hasAttribute('open'))) return;
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); dialog.removeAttribute('aria-modal'); afterDialogClose(dialog); }
  }
  function afterDialogClose(dialog) {
    restoreFocus(dialog); updateControls(); resumeLanding();
  }
  function openDialog(dialog, closeButton) {
    if (!active || !dialog) return;
    for (const other of dialogs) if (other !== dialog) closeDialog(other);
    if (!(dialog.open || dialog.hasAttribute('open'))) {
      openers.set(dialog, document.activeElement);
      try {
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else { dialog.setAttribute('open', ''); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); }
      } catch { dialog.setAttribute('open', ''); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); }
    }
    updateControls();
    closeButton?.focus({preventScroll:true});
  }
  function stampDetails(state) {
    const time = $('expedition-stamp-date');
    if (time) { time.dateTime = state.completedAt || ''; time.textContent = state.completedAt ? 'Collected ' + dateLabel(state.completedAt) : ''; }
    text('expedition-stamp-status', state.persistence === 'device' ? 'Saved in your travel log on this device. A cosmetic keepsake of your exploration.' : 'Collected for this visit. Browser storage is unavailable, so this stamp will not be kept after you leave.');
  }
  function claimStamp() {
    const state = log.claim();
    if (!state.claimed) { status('Interact with the flock, signal station and golden bell before collecting your stamp.'); return; }
    stampDetails(state);
    openDialog($('expedition-stamp-dialog'), $('expedition-stamp-close'));
  }
  function continueFromLog() {
    const state = log.read();
    closeDialog($('expedition-log-dialog'));
    if (state.claimed || state.readyToClaim) { claimStamp(); return; }
    const next = ids.find(id => !state.discoveries.includes(id));
    pendingFocus = next || null;
    if (!started) beginLanding();
    else resumeLanding();
  }
  function renderLog(state) {
    scene?.setProgress?.(state.discoveries);
    text('expedition-progress', state.count + ' / ' + state.total);
    $('expedition-progress')?.setAttribute('aria-label', state.count + ' of ' + state.total + ' discoveries');
    if ($('expedition-progress-fill')) $('expedition-progress-fill').style.width = (state.count / state.total * 100) + '%';
    for (const button of nav) {
      const id = button.dataset.expeditionGo, found = state.discoveries.includes(id);
      button.dataset.discovered = String(found);
      if (known(id)) button.setAttribute('aria-label', places[id].objective + (found ? ', discovered' : ''));
    }
    for (const check of checks) {
      const id = check.dataset.expeditionCheck;
      check.textContent = state.discoveries.includes(id) ? '✓' : String(ids.indexOf(id) + 1).padStart(2, '0');
    }
    const claim = $('expedition-claim');
    if (claim) {
      claim.disabled = !state.readyToClaim && !state.claimed;
      claim.dataset.claimed = String(state.claimed);
      const label = claim.querySelector('span');
      if (label) label.textContent = state.claimed ? 'View discovery stamp' : 'Collect discovery stamp';
    }
    if (state.readyToClaim) setMissionsExpanded(true);
    text('expedition-storage-note', storageMessage(state));
    const introNote = $('expedition-intro')?.querySelector('small');
    if (introNote) introNote.textContent = state.persistence === 'device' ? 'No account needed. Your travel log stays in this browser on this device.' : 'No account needed. Browser storage is unavailable; progress lasts for this visit.';
    const logDialog = $('expedition-log-dialog');
    const eyebrow = logDialog?.querySelector('.expedition-eyebrow');
    if (eyebrow) eyebrow.textContent = state.persistence === 'device' ? 'YOUR JOURNEY / THIS DEVICE' : 'YOUR JOURNEY / THIS VISIT';
    const note = logDialog?.querySelector('.expedition-dialog-note');
    if (note) note.textContent = state.persistence === 'device' ? 'A personal collection of discoveries, saved in this browser. Stamps are cosmetic keepsakes.' : storageMessage(state) + ' Stamps are cosmetic keepsakes.';
    stampDetails(state);
    const container = $('expedition-log-content');
    if (!container) return;
    const entry = make('article', 'expedition-log-entry' + (!state.count ? ' expedition-log-empty' : ''));
    entry.dataset.claimed = String(state.claimed);
    const art = make('img', 'expedition-log-art');
    art.src = stampArt; art.alt = state.claimed ? 'Your Lunar Flock discovery stamp' : 'Lunar Flock expedition emblem'; art.width = 112; art.height = 112;
    const details = make('div', 'expedition-log-details');
    details.append(make('h3', '', 'The Lunar Flock'));
    details.append(make('p', 'expedition-log-progress', state.claimed ? '1 discovery stamp collected' : state.count ? state.count + ' of 3 discoveries' : 'Your first stamp is waiting.'));
    const message = state.claimed ? 'You met the flock, woke the signal and found the golden bell.' : state.readyToClaim ? 'You found all three discoveries. Your stamp is ready to collect.' : state.count ? 'Your discoveries are here. Pick up where you left off.' : 'Become a sheep, meet the flock and leap into your first discoveries.';
    details.append(make('p', '', message));
    if (state.count) {
      const list = make('ul', 'expedition-log-discoveries');
      for (const id of ids) {
        const item = make('li', '', (state.discoveries.includes(id) ? '✓ ' : '○ ') + places[id].objective);
        item.dataset.discovered = String(state.discoveries.includes(id));
        list.append(item);
      }
      details.append(list);
    }
    if (state.completedAt) {
      const time = make('time', 'expedition-log-meta', 'Collected ' + dateLabel(state.completedAt));
      time.dateTime = state.completedAt; details.append(time);
    }
    const button = make('button', 'expedition-log-continue', state.claimed ? 'View your stamp ↗' : state.readyToClaim ? 'Collect your stamp ↗' : state.count ? 'Continue exploring ↗' : 'Begin expedition ↗');
    button.type = 'button';
    button.disabled = !ready && !state.claimed && !state.readyToClaim;
    button.addEventListener('click', continueFromLog);
    const preserveFocus = container.contains(document.activeElement);
    details.append(button); entry.append(art, details); container.replaceChildren(entry);
    if (preserveFocus && active && logDialog?.open) button.focus({preventScroll:true});
  }
  function setPhoto(value) {
    if (value && !exploring()) return;
    photo = !!value;
    if (photo) document.body.dataset.photo = 'true';
    else delete document.body.dataset.photo;
    updateControls();
    if (active) (photo ? $('expedition-photo-exit') : $('expedition-photo'))?.focus({preventScroll:true});
    if (photo) status('Photo mode. Frame your view, then take a photo. Escape returns to exploring.');
    else if (started) { status('Back on your hooves. Keep exploring.'); focusWorld(); }
  }
  function revokeDownload(url) {
    const timer = downloadURLs.get(url);
    if (timer) clearTimeout(timer);
    downloadURLs.delete(url);
    URL.revokeObjectURL(url);
  }
  async function capturePhoto() {
    if (!active || !ready || !photo || capturing) return;
    const operation = epoch;
    capturing = true; updateControls(); status('Preparing your expedition photo…');
    try {
      const source = await scene.capture();
      if (!active || operation !== epoch) return;
      if (!source || !Number.isFinite(source.width) || !Number.isFinite(source.height) || source.width <= 0 || source.height <= 0) throw new Error('No captured view');
      const scale = Math.min(1, 2048 / source.width, 2048 / source.height);
      const width = Math.max(1, Math.round(source.width * scale)), height = Math.max(1, Math.round(source.height * scale));
      const footer = Math.max(64, Math.round(width * .072));
      const output = document.createElement('canvas'); output.width = width; output.height = height + footer;
      const context = output.getContext('2d');
      if (!context) throw new Error('Photo export unavailable');
      context.drawImage(source, 0, 0, width, height);
      context.fillStyle = '#07121c'; context.fillRect(0, height, width, footer);
      context.fillStyle = '#b2dca4'; context.fillRect(0, height, width, Math.max(2, Math.round(width / 700)));
      const pad = Math.max(12, Math.round(width * .025));
      context.fillStyle = '#f4f4e9'; context.textBaseline = 'middle';
      context.font = '600 ' + Math.max(11, Math.round(width * .018)) + 'px system-ui, sans-serif';
      context.fillText('PARALLAX / THE LUNAR FLOCK', pad, height + footer * .38, width - pad * 2);
      context.fillStyle = '#adc0c4'; context.font = Math.max(9, Math.round(width * .012)) + 'px system-ui, sans-serif';
      context.fillText('A Sheeple expedition · parallaxlaunch.live', pad, height + footer * .73, width - pad * 2);
      const blob = await new Promise((resolve, reject) => output.toBlob(value => value ? resolve(value) : reject(new Error('Photo export unavailable')), 'image/png'));
      if (!active || operation !== epoch) return;
      const url = URL.createObjectURL(blob);
      const link = make('a'); link.href = url; link.download = 'parallax-lunar-flock-' + new Date().toISOString().slice(0, 10) + '.png';
      document.body.append(link); link.click(); link.remove();
      downloadURLs.set(url, setTimeout(() => revokeDownload(url), 30000));
      status('Your scene photo is ready. Check your browser downloads.');
    } catch {
      if (active && operation === epoch) status('The photo could not be saved. Try again, or take a screenshot of your view.');
    } finally {
      if (operation === epoch) { capturing = false; updateControls(); }
    }
  }
  async function share() {
    const operation = epoch;
    const fallback = $('expedition-copy-fallback');
    if (fallback) fallback.value = shareURL;
    try {
      await navigator.clipboard.writeText(shareURL);
      if (!active || operation !== epoch) return;
      if (fallback) fallback.hidden = true;
      text('expedition-share-status', 'Expedition link copied. Your personal log stays on this device.');
    } catch {
      if (!active || operation !== epoch) return;
      if (fallback) { fallback.hidden = false; fallback.focus({preventScroll:true}); fallback.select(); }
      text('expedition-share-status', 'Copy the expedition link below.');
    }
  }
  function createScene() {
    const operation = ++epoch;
    ready = false; appliedMotion = null; appliedPlaying = null;
    try {
      if (typeof window.ParallaxSheepleScene?.create !== 'function') throw new Error('Scene unavailable');
      scene = window.ParallaxSheepleScene.create({
        canvas, reducedMotion:!!media?.matches, playable:true, completed:log.read().discoveries,
        onStatus:next => { if (active && operation === epoch) receiveStatus(next); },
        onInteract:id => { if (active && operation === epoch) receiveInteraction(id); },
        onBoard:() => { if (active && operation === epoch && canPlay()) openDialog($('expedition-welcome-dialog'), $('expedition-welcome-title')); },
        onEvent:event => { if (active && operation === epoch && canPlay() && typeof event?.message === 'string') status(event.message); },
        onSoundState:next => {
          if (!active || operation !== epoch) return;
          sound = next.preference === 'auto' ? null : next.preference === 'on';
          soundStatus = next.status;
          updateControls();
        },
        onReady:() => {
          if (!active || operation !== epoch) return;
          ready = true;
          if (started) {
            setPhase('exploring'); scene?.skipArrival?.();
            if (known(resumeLocation)) scene?.focus?.(resumeLocation);
            status('Welcome back to the Lunar Flock. Your travel log is ready.');
          } else {
            setPhase('intro');
            status('The Lunar Flock is ready for landing.');
          }
          scene?.setSound?.(sound); renderLog(log.read()); updateControls();
          if (started) resumeLanding();
          if (!initialIntentConsumed) {
            initialIntentConsumed = true;
            if (params.get('log') === '1') openDialog($('expedition-log-dialog'), $('expedition-log-close'));
            else if (params.get('arrival') === '1') beginLanding();
          }
        }
      });
      if (!scene || typeof scene.flyIn !== 'function') throw new Error('Scene unavailable');
      applyMotion();
    } catch {
      ready = false; scene = null;
      status('The habitat could not load. Reload to try again, or return to the Atlas.');
      updateControls();
      if (params.get('log') === '1' && !initialIntentConsumed) { initialIntentConsumed = true; openDialog($('expedition-log-dialog'), $('expedition-log-close')); }
    }
  }

  for (const button of nav) on(button, 'click', () => navigate(button.dataset.expeditionGo));
  on($('expedition-start'), 'click', beginLanding);
  on($('expedition-skip'), 'click', skipArrival);
  on($('expedition-interact'), 'click', () => {
    if (!canPlay()) return;
    const action = lastStatus.nearby === 'flock' ? scene?.baa?.() : lastStatus.nearby === 'bell' ? scene?.jump?.() : scene?.interact?.();
    if (!action) status(lastStatus.hint || 'Walk closer to the board or a discovery to interact.');
    focusWorld();
  });
  on($('expedition-reset'), 'click', () => {
    if (!exploring()) return;
    releaseMoves(); scene?.reset?.(); status('Back at the landing spot. Your discoveries are still yours.'); focusWorld();
  });
  on($('expedition-motion'), 'click', () => { if (!media?.matches) { motion = !motion; applyMotion(); } });
  on($('expedition-sound'), 'click', () => { scene?.setSound?.(soundStatus !== 'on'); focusWorld(); });
  on($('expedition-jump'), 'click', () => { if (canPlay()) { scene?.jump?.(); focusWorld(); } });
  on($('expedition-baa'), 'click', () => { if (canPlay()) { scene?.baa?.(); focusWorld(); } });
  on($('expedition-missions-toggle'), 'click', () => setMissionsExpanded($('expedition-mission-panel')?.dataset.expanded !== 'true'));
  for (const button of moveButtons) {
    const direction = [Number(button.dataset.moveX) || 0, Number(button.dataset.moveY) || 0];
    on(button, 'pointerdown', event => {
      if (!canPlay() || event.button > 0) return;
      event.preventDefault();
      moves.set('p:' + event.pointerId, direction);
      button.setPointerCapture?.(event.pointerId);
      updateMove();
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) on(button, name, event => {
      moves.delete('p:' + event.pointerId); updateMove();
    });
    on(button, 'keydown', event => {
      if (!canPlay() || ![' ', 'Enter'].includes(event.key)) return;
      event.preventDefault(); moves.set('k:' + button.id, direction); updateMove();
    });
    on(button, 'keyup', event => {
      if (![' ', 'Enter'].includes(event.key)) return;
      event.preventDefault(); moves.delete('k:' + button.id); updateMove();
    });
    on(button, 'blur', () => { moves.delete('k:' + button.id); updateMove(); });
  }
  on($('expedition-photo'), 'click', () => setPhoto(!photo));
  on($('expedition-photo-exit'), 'click', () => setPhoto(false));
  on($('expedition-capture'), 'click', capturePhoto);
  on($('expedition-share'), 'click', share);
  on($('expedition-claim'), 'click', claimStamp);
  on($('expedition-log-open'), 'click', () => { renderLog(log.refresh()); openDialog($('expedition-log-dialog'), $('expedition-log-close')); });
  on($('expedition-help-open'), 'click', () => openDialog($('expedition-help-dialog'), $('expedition-help-close')));
  on($('expedition-welcome-open'), 'click', () => openDialog($('expedition-welcome-dialog'), $('expedition-welcome-title')));
  on($('expedition-welcome-continue'), 'click', () => closeDialog($('expedition-welcome-dialog')));
  for (const name of dialogNames) {
    const dialog = $('expedition-' + name + '-dialog');
    on($('expedition-' + name + '-close'), 'click', () => closeDialog(dialog));
    on(dialog, 'cancel', event => { event.preventDefault(); closeDialog(dialog); });
    on(dialog, 'click', event => { if (event.target === dialog) closeDialog(dialog); });
    on(dialog, 'close', () => afterDialogClose(dialog));
    on(dialog, 'keydown', event => {
      if (event.key !== 'Tab' || typeof dialog.showModal === 'function') return;
      const focusable = Array.from(dialog.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])')).filter(element => !element.hidden);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    });
  }
  on(document, 'keydown', event => {
    if (event.key !== 'Escape') return;
    const fallbackDialog = dialogs.find(dialog => dialog.hasAttribute('open') && typeof dialog.showModal !== 'function');
    if (fallbackDialog) { event.preventDefault(); closeDialog(fallbackDialog); }
    else if (photo && !anyDialog()) { event.preventDefault(); setPhoto(false); }
  });
  on(document, 'visibilitychange', () => { if (document.hidden) releaseMoves(); applyMotion(); });
  on(window, 'blur', releaseMoves);
  for (const name of ['pointerup', 'pointercancel']) on(document, name, event => { moves.delete('p:' + event.pointerId); updateMove(); });
  on(media, 'change', () => { if (media.matches) motion = false; applyMotion(); });
  on(window, 'pagehide', () => {
    active = false; epoch++; ready = false; capturing = false;
    releaseMoves();
    resumeLocation = lastStatus.location; clearArrival();
    unsubscribe?.(); unsubscribe = null;
    for (const dialog of dialogs) closeDialog(dialog);
    photo = false; delete document.body.dataset.photo;
    scene?.destroy?.(); scene = null;
    for (const url of [...downloadURLs.keys()]) revokeDownload(url);
  });
  on(window, 'pageshow', () => {
    if (active) return;
    active = true; unsubscribe = log.subscribe(renderLog);
    renderLog(log.refresh()); createScene();
  });
  unsubscribe = log.subscribe(renderLog);
  setMissionsExpanded(!window.matchMedia?.('(max-width:760px)')?.matches);
  renderLog(log.read()); setPhase('intro'); createScene();
})();
