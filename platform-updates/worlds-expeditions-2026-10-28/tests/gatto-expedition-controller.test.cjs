const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const KEY = 'parallax:expedition-log:v1';
const GATTO_KEY = 'parallax:expedition-log:gatto:v1';
const logSource = fs.readFileSync('public/expedition-log.js', 'utf8');
const controllerSource = fs.readFileSync('public/gatto-expedition.js', 'utf8');
const template = fs.readFileSync('app/gatto-expedition.html', 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };
const encoded = (discoveredAt = {}, completedAt = null, world = 'sheeple') => JSON.stringify({version:1, world, discoveredAt, completedAt});

function harness({raw = null, gattoRaw = null, blocked = '', controller = true, search = '', reduced = false, clipboard = true, legacyLog} = {}) {
  const storageMap = new Map(raw === null ? [] : [[KEY, raw]]), writes = [], events = new Map(), ids = new Map(), timers = new Map();
  if (gattoRaw !== null) storageMap.set(GATTO_KEY, gattoRaw);
  const scenes = [], drawings = [], downloads = [], revoked = [], emitted = [], all = [];
  let timerId = 0;
  const settings = {blocked, clipboard, copied:null};
  const listen = (name, fn) => { if (!events.has(name)) events.set(name, []); events.get(name).push(fn); };
  const fire = (name, event = {}) => { for (const fn of events.get(name) || []) fn(event); };
  const storage = {
    getItem(key) { if (settings.blocked === 'read') throw new Error('Storage denied'); return storageMap.get(key) ?? null; },
    setItem(key, value) { writes.push({key,value}); if (settings.blocked === 'write') throw new Error('Quota exceeded'); storageMap.set(key, value); }
  };
  let document;
  class Element {
    constructor(tag = 'div') {
      this.tagName = tag.toUpperCase(); this.children = []; this.attrs = new Map(); this.dataset = {}; this.events = new Map(); this.style = {};
      this.hidden = false; this.disabled = false; this.open = false; this.isConnected = true; this.className = ''; this.value = ''; this._text = '';
      all.push(this);
    }
    set id(value) { this._id = value; ids.set(value, this); }
    get id() { return this._id || ''; }
    set textContent(value) { this._text = String(value); this.children = []; }
    get textContent() { return this._text + this.children.map(child => child.textContent).join(' '); }
    set innerHTML(value) { throw new Error('Unsafe HTML assignment: ' + value); }
    append(...children) { for (const child of children) { child.remove(); child.parent = this; child.isConnected = true; this.children.push(child); } }
    replaceChildren(...children) { for (const child of this.children) child.parent = null; this.children = []; this._text = ''; this.append(...children); }
    remove() { if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this); this.parent = null; }
    contains(target) { return target === this || this.children.some(child => child.contains(target)); }
    setAttribute(key, value) { this.attrs.set(key, String(value)); if (key === 'open') this.open = true; }
    getAttribute(key) { return this.attrs.get(key) ?? null; }
    hasAttribute(key) { return key === 'open' ? this.open : this.attrs.has(key); }
    removeAttribute(key) { this.attrs.delete(key); if (key === 'open') this.open = false; }
    addEventListener(name, fn) { if (!this.events.has(name)) this.events.set(name, []); this.events.get(name).push(fn); }
    dispatch(name, event = {}) { return Promise.all((this.events.get(name) || []).map(fn => fn({target:this, preventDefault(){}, ...event}))); }
    click() { if (this.disabled) return Promise.resolve(); if (this.tagName === 'A' && this.download) downloads.push({href:this.href, filename:this.download}); return this.dispatch('click'); }
    focus() { document.activeElement = this; }
    select() { this.selected = true; }
    showModal() { this.open = true; }
    close() { this.open = false; queueMicrotask(() => this.dispatch('close')); }
    querySelectorAll(selector) {
      const matches = element => selector === '[data-expedition-go]' ? !!element.dataset.expeditionGo
        : selector === '[data-expedition-check]' ? !!element.dataset.expeditionCheck
        : selector.startsWith('.') ? element.className.split(' ').includes(selector.slice(1))
        : selector.includes(',') ? ['BUTTON','A','INPUT'].includes(element.tagName) && !element.disabled
        : element.tagName.toLowerCase() === selector;
      const result = [];
      const walk = element => { for (const child of element.children) { if (matches(child)) result.push(child); walk(child); } };
      walk(this); return result;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
    getContext() {
      return {drawImage:(source, ...args) => drawings.push({kind:'image',source,args}), fillRect:(...args) => drawings.push({kind:'rect',args}), fillText:(value,...args) => drawings.push({kind:'text',value,args})};
    }
    toBlob(callback, type) { callback({type, width:this.width, height:this.height}); }
  }
  const body = new Element('body');
  document = {body, hidden:false, activeElement:body, getElementById:id => ids.get(id) || null, createElement:tag => new Element(tag), querySelectorAll:selector => body.querySelectorAll(selector), addEventListener:(name,fn) => listen('document:' + name, fn)};
  const add = (id, tag = 'div', parent = body) => { const element = new Element(tag); element.id = id; parent.append(element); return element; };
  if (controller) {
    const canvas = add('expedition-canvas', 'canvas'); canvas.width = 1200; canvas.height = 800;
    const intro = add('expedition-intro'); intro.append(new Element('small')); add('expedition-start', 'button', intro);
    const arrival = add('expedition-arrival'); arrival.hidden = true; add('expedition-skip', 'button', arrival);
    for (const id of ['status','location','share-status','progress','progress-fill','storage-note','controls']) add('expedition-' + id);
    for (const id of ['interact','reset','motion','photo','capture','photo-exit','share','claim','log-open','help-open','welcome-open']) add('expedition-' + id, 'button');
    const claim = ids.get('expedition-claim'); claim.append(new Element('span'), new Element('span'));
    const fallback = add('expedition-copy-fallback', 'input'); fallback.hidden = true;
    const objectives = add('expedition-objectives', 'nav');
    for (const id of ['cats','lanterns','sardine']) {
      const button = new Element('button'); button.dataset.expeditionGo = id;
      const check = new Element('span'); check.dataset.expeditionCheck = id; button.append(check); objectives.append(button);
    }
    for (const name of ['welcome','log','stamp','help']) {
      const dialog = add('expedition-' + name + '-dialog', 'dialog');
      const eyebrow = new Element('p'); eyebrow.className = 'expedition-eyebrow'; dialog.append(eyebrow);
      add('expedition-' + name + '-close', 'button', dialog);
      if (name === 'log') {
        add('expedition-log-content', 'div', dialog); const note = new Element('p'); note.className = 'expedition-dialog-note'; dialog.append(note);
      } else if (name === 'stamp') { add('expedition-stamp-date', 'time', dialog); add('expedition-stamp-status', 'p', dialog); }
      else if (name === 'welcome') { add('expedition-welcome-title', 'h2', dialog); add('expedition-welcome-continue', 'button', dialog); }
    }
  }
  const media = {matches:reduced, addEventListener:(name, fn) => listen('media:' + name, fn)};
  const sandbox = {
    document, navigator:{clipboard:{writeText:async value => { if (!settings.clipboard) throw new Error('Clipboard denied'); settings.copied = value; }}},
    location:{search}, Date, URLSearchParams, console,
    URL:class extends URL { static createObjectURL(blob) { return 'blob:photo-' + blob.width + 'x' + blob.height; } static revokeObjectURL(url) { revoked.push(url); } },
    matchMedia:() => media,
    CustomEvent:class { constructor(type, options) { this.type = type; this.detail = options?.detail; } },
    addEventListener:listen, dispatchEvent:event => { emitted.push(event); fire(event.type, event); },
    setTimeout:(fn, delay) => { const id = ++timerId; timers.set(id, {fn,delay}); return id; }, clearTimeout:id => timers.delete(id),
    fetch:() => { throw new Error('Expeditions must not call network APIs'); },
    ParallaxSheepleScene:{create() { throw new Error('GATTO must not load the Sheeple scene'); }},
    ParallaxGattoScene:{create(options) {
      const state = {location:null, nearby:null, arriving:false, travelling:false, renderMode:'canvas'};
      const instance = {options, state, focused:[], motions:[], flights:0, skipped:0, destroyed:false,
        ready() { options.onReady(); },
        emit() { options.onStatus({...state}); },
        focus(id) { this.focused.push(id); Object.assign(state, {location:id,nearby:null,travelling:true}); this.emit(); },
        arrive(id) { Object.assign(state, {location:id,nearby:id,arriving:false,travelling:false}); this.emit(); },
        interact() { if (!state.nearby) return false; options.onInteract(state.nearby); return true; },
        setMotion(value) { this.motions.push(value); },
        flyIn() { this.flights++; state.arriving = true; this.emit(); },
        skipArrival() { this.skipped++; state.arriving = false; this.emit(); },
        reset() { Object.assign(state, {location:null,nearby:null}); this.emit(); },
        capture() { return ids.get('expedition-canvas'); },
        getState() { return {...state}; }, destroy() { this.destroyed = true; }
      };
      scenes.push(instance); return instance;
    }}
  };
  sandbox.window = sandbox;
  if (legacyLog) sandbox.ParallaxExpeditionLog = legacyLog;
  Object.defineProperty(sandbox, 'localStorage', {get() { if (settings.blocked === 'getter') throw new Error('Storage denied'); return storage; }});
  vm.createContext(sandbox);
  vm.runInContext(logSource, sandbox);
  if (controller) vm.runInContext(controllerSource, sandbox);
  return {sandbox, log:sandbox.ParallaxExpeditionLogs.gatto, sheeple:sandbox.ParallaxExpeditionLog, storage, storageMap, writes, fire, emitted, settings, scenes, drawings, downloads, revoked, timers, media, all,
    get:id => ids.get(id), nav:id => all.find(element => element.dataset.expeditionGo === id),
    runTimer(delay) { const entry = [...timers].find(([,value]) => value.delay === delay); if (entry) { timers.delete(entry[0]); entry[1].fn(); } }
  };
}


async function land(h) {
  const scene = h.scenes[0]; scene.ready();
  if (h.sandbox.document.body.dataset.expeditionState === 'intro') await h.get('expedition-start').click();
  await h.get('expedition-skip').click();
  assert.equal(h.get('expedition-welcome-dialog').open, true);
  await h.get('expedition-welcome-continue').click();
  return scene;
}

test('the GATTO template supplies the controller hooks and loads the GATTO scene after the shared log', () => {
  const h = harness();
  for (const element of h.all) {
    if (element.id) assert(template.includes('id="' + element.id + '"'), 'Missing HTML hook: ' + element.id);
  }
  assert.deepEqual([...template.matchAll(/data-expedition-go="([^"]+)"/g)].map(match => match[1]), ['cats','lanterns','sardine']);
  assert(template.indexOf('/expedition-log.js?') < template.indexOf('/gatto-expedition-scene.js?'));
  assert(template.indexOf('/gatto-expedition-scene.js?') < template.indexOf('/gatto-expedition.js?'));
  assert.equal(h.scenes.length, 1);
  assert.equal(h.log.read().world, 'gatto'); assert.equal(h.get('expedition-progress').textContent, '0 / 3');
  assert.match(h.get('expedition-log-content').textContent, /The Golden Quarter/);
  assert.equal(h.writes.length, 0);
});

test('landing, welcome, navigation and arrival do not award GATTO progress before an action', async () => {
  const time = '2026-10-27T10:00:00.000Z';
  const sheepleRaw = encoded({flock:time,signal:time,bell:time}, time);
  const h = harness({raw:sheepleRaw}), scene = h.scenes[0];
  scene.ready();
  scene.options.onInteract('cats'); await h.nav('cats').click();
  assert.equal(h.log.read().count, 0); assert.equal(scene.focused.length, 0);
  await h.get('expedition-start').click();
  assert.equal(scene.flights, 1); assert.equal(h.sandbox.document.body.dataset.expeditionState, 'arriving');
  scene.options.onInteract('cats'); assert.equal(h.log.read().count, 0);
  await h.get('expedition-skip').click();
  assert.equal(h.get('expedition-welcome-dialog').open, true);
  assert.equal(h.sandbox.document.activeElement, h.get('expedition-welcome-title'));
  assert.equal(h.nav('cats').disabled, true); assert.equal(scene.motions.at(-1), false);
  scene.options.onInteract('cats'); await h.get('expedition-interact').click();
  assert.equal(h.log.read().count, 0); assert.equal(h.writes.length, 0);
  await h.get('expedition-welcome-continue').click();
  assert.equal(h.sandbox.document.activeElement, h.get('expedition-objectives'));
  assert.equal(h.nav('cats').disabled, false);
  await h.nav('cats').click();
  assert.deepEqual(scene.focused, ['cats']); assert.equal(h.log.read().count, 0);
  assert.equal(h.get('expedition-interact').disabled, true);
  scene.arrive('cats'); assert.equal(h.log.read().count, 0);
  assert.equal(h.get('expedition-interact').textContent, 'Call the cats');
  await h.get('expedition-interact').click();
  assert.equal(h.log.read().count, 1); assert.equal(h.nav('cats').dataset.discovered, 'true');
  for (const id of ['lanterns','sardine']) {
    await h.nav(id).click(); scene.arrive(id); await h.get('expedition-interact').click();
  }
  assert.equal(h.get('expedition-progress').textContent, '3 / 3');
  assert.equal(h.log.read().claimed, false); assert.equal(h.get('expedition-claim').disabled, false);
  await h.get('expedition-claim').click();
  assert.equal(h.log.read().claimed, true); assert.equal(h.get('expedition-stamp-dialog').open, true);
  assert.match(h.get('expedition-stamp-status').textContent, /cosmetic keepsake/);
  assert(h.writes.every(write => write.key === GATTO_KEY));
  assert.equal(h.storageMap.get(KEY), sheepleRaw);
  assert.equal(h.sheeple.read().completedAt, time);
});

test('the welcome can close, reopen and pause interactions without changing saved discoveries', async () => {
  const h = harness(), scene = await land(h);
  scene.arrive('cats'); await h.get('expedition-interact').click();
  const saved = h.storageMap.get(GATTO_KEY), writes = h.writes.length;
  for (const close of ['button','cancel','backdrop','continue']) {
    h.get('expedition-welcome-open').focus(); await h.get('expedition-welcome-open').click();
    assert.equal(h.get('expedition-welcome-dialog').open, true);
    assert.equal(h.get('expedition-interact').disabled, true); assert.equal(scene.motions.at(-1), false);
    scene.options.onInteract('lanterns'); assert.equal(h.log.read().count, 1);
    if (close === 'button') await h.get('expedition-welcome-close').click();
    else if (close === 'continue') await h.get('expedition-welcome-continue').click();
    else await h.get('expedition-welcome-dialog').dispatch(close === 'cancel' ? 'cancel' : 'click');
    assert.equal(h.get('expedition-welcome-dialog').open, false);
    assert.equal(h.get('expedition-interact').disabled, false);
    assert.equal(h.sandbox.document.activeElement, h.get('expedition-welcome-open'));
  }
  assert.equal(h.writes.length, writes); assert.equal(h.storageMap.get(GATTO_KEY), saved);
});

test('log intent wins over arrival and continuing waits for the introduction before focusing the next GATTO discovery', async () => {
  const time = '2026-10-27T10:00:00.000Z';
  const h = harness({search:'?log=1&arrival=1', gattoRaw:encoded({cats:time}, null, 'gatto')}), scene = h.scenes[0];
  scene.ready();
  assert.equal(h.get('expedition-log-dialog').open, true); assert.equal(scene.flights, 0);
  assert.equal(h.sandbox.document.body.dataset.expeditionState, 'intro');
  assert.match(h.get('expedition-log-content').textContent, /1 of 3 discoveries/);
  await h.get('expedition-log-content').querySelector('.expedition-log-continue').click();
  assert.equal(h.get('expedition-log-dialog').open, false); assert.equal(scene.flights, 1);
  assert.deepEqual(scene.focused, []);
  await h.get('expedition-skip').click();
  assert.equal(h.get('expedition-welcome-dialog').open, true); assert.deepEqual(scene.focused, []);
  await h.get('expedition-welcome-continue').click();
  assert.deepEqual(scene.focused, ['lanterns']);
  assert.equal(h.log.read().count, 1); assert.equal(h.writes.length, 0);
});

test('continuing a log opened during descent resumes the missing discovery after the arrival welcome', async () => {
  const time = '2026-10-27T10:00:00.000Z';
  const h = harness({search:'?arrival=1', gattoRaw:encoded({cats:time}, null, 'gatto')}), scene = h.scenes[0];
  scene.ready(); assert.equal(h.sandbox.document.body.dataset.expeditionState, 'arriving');
  await h.get('expedition-log-open').click();
  await h.get('expedition-log-content').querySelector('.expedition-log-continue').click();
  assert.deepEqual(scene.focused, []);
  await h.get('expedition-skip').click();
  assert.equal(h.get('expedition-welcome-dialog').open, true);
  await h.get('expedition-welcome-continue').click();
  assert.deepEqual(scene.focused, ['lanterns']);
  assert.equal(h.log.read().count, 1); assert.equal(h.writes.length, 0);
});

test('landing behind an open log preserves welcome priority before the pending discovery', async () => {
  const time = '2026-10-27T10:00:00.000Z';
  const h = harness({search:'?arrival=1', gattoRaw:encoded({cats:time}, null, 'gatto')}), scene = h.scenes[0];
  scene.ready(); await h.get('expedition-log-open').click(); h.runTimer(4400);
  assert.equal(h.sandbox.document.body.dataset.expeditionState, 'exploring');
  assert.equal(h.get('expedition-log-dialog').open, true);
  assert.equal(h.get('expedition-welcome-dialog').open, false);
  await h.get('expedition-log-content').querySelector('.expedition-log-continue').click();
  assert.equal(h.get('expedition-welcome-dialog').open, true); assert.deepEqual(scene.focused, []);
  await h.get('expedition-welcome-continue').click();
  assert.deepEqual(scene.focused, ['lanterns']); assert.equal(h.writes.length, 0);
});

test('a stalled or reduced-motion arrival reaches the welcome without automatic progress', async () => {
  const stalled = harness({search:'?arrival=1'}), incoming = stalled.scenes[0];
  incoming.ready(); stalled.runTimer(4400);
  assert.equal(stalled.get('expedition-welcome-dialog').open, true);
  assert.equal(stalled.get('expedition-arrival').hidden, true); assert.equal(incoming.skipped, 1);
  assert.equal(stalled.log.read().count, 0); assert.equal(stalled.writes.length, 0);
  const reduced = harness({search:'?arrival=1', reduced:true}), scene = reduced.scenes[0];
  scene.flyIn = function () { this.flights++; this.state.arriving = false; };
  scene.ready();
  assert.equal(reduced.get('expedition-welcome-dialog').open, true);
  assert.equal(reduced.sandbox.document.body.dataset.expeditionState, 'exploring');
  assert.equal(reduced.timers.size, 0); assert.equal(reduced.writes.length, 0);
  await reduced.get('expedition-welcome-continue').click();
  assert.equal(reduced.get('expedition-motion').disabled, true);
  assert(scene.motions.every(enabled => enabled === false));
});

test('photo export uses GATTO scene pixels and branding while progress and share links remain separate', async () => {
  const h = harness({clipboard:false}), scene = await land(h);
  await h.get('expedition-photo').click();
  assert.equal(h.sandbox.document.body.dataset.photo, 'true');
  scene.options.onInteract('cats');
  await h.get('expedition-capture').click(); await settle();
  assert.equal(h.downloads.length, 1);
  assert.match(h.downloads[0].filename, /^parallax-golden-quarter-\d{4}-\d{2}-\d{2}\.png$/);
  assert(h.drawings.some(draw => draw.kind === 'image' && draw.source === h.get('expedition-canvas')));
  assert(h.drawings.some(draw => draw.kind === 'text' && draw.value === 'PARALLAX / THE GOLDEN QUARTER'));
  assert(!h.drawings.some(draw => draw.kind === 'text' && /sheeple|flock|stamp|complete|reward/i.test(draw.value)));
  assert.equal(h.log.read().count, 0); assert.equal(h.writes.length, 0);
  h.fire('document:keydown', {key:'Escape', preventDefault(){}});
  assert.equal(h.sandbox.document.body.dataset.photo, undefined);
  await h.get('expedition-share').click();
  assert.equal(h.get('expedition-copy-fallback').value, 'https://parallaxlaunch.live/expeditions/gatto?arrival=1');
  assert.equal(h.get('expedition-copy-fallback').selected, true);
  h.fire('pagehide'); assert.equal(h.revoked.length, 1);
});

test('persisted reopening retains GATTO progress, ignores destroyed callbacks and does not repeat the landing', async () => {
  const h = harness({search:'?arrival=1'}), first = await land(h);
  first.arrive('cats'); await h.get('expedition-interact').click();
  await h.get('expedition-welcome-open').click();
  h.fire('pagehide'); await settle();
  assert.equal(first.destroyed, true); assert.equal(h.get('expedition-welcome-dialog').open, false);
  first.options.onInteract('lanterns'); assert.equal(h.log.read().count, 1);
  h.fire('pageshow', {persisted:true});
  assert.equal(h.scenes.length, 2); const next = h.scenes[1]; next.ready();
  assert.equal(next.flights, 0); assert.equal(h.get('expedition-welcome-dialog').open, false);
  assert.equal(h.sandbox.document.body.dataset.expeditionState, 'exploring');
  assert.equal(h.log.read().count, 1); assert.deepEqual(next.focused, ['cats']);
  h.fire('pageshow', {persisted:true}); assert.equal(h.scenes.length, 2);
  next.arrive('lanterns'); await h.get('expedition-interact').click();
  assert.equal(h.log.read().count, 2); assert.equal(h.sheeple.read().count, 0);
  await h.get('expedition-welcome-open').click(); assert.equal(h.get('expedition-welcome-dialog').open, true);
  assert.equal(h.writes.length, 2);
});

test('an interrupted first descent restores the pending welcome on persisted reopening', async () => {
  const h = harness({search:'?arrival=1'}), first = h.scenes[0]; first.ready();
  assert.equal(h.sandbox.document.body.dataset.expeditionState, 'arriving');
  h.fire('pagehide'); await settle();
  h.fire('pageshow', {persisted:true}); const next = h.scenes[1]; next.ready();
  assert.equal(next.flights, 0); assert.equal(h.get('expedition-welcome-dialog').open, true);
  await h.get('expedition-welcome-continue').click();
  assert.equal(h.sandbox.document.body.dataset.expeditionState, 'exploring');
  assert.equal(h.log.read().count, 0); assert.equal(h.writes.length, 0);
});

