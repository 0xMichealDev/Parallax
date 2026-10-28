const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const KEY = 'parallax:expedition-log:v1';
const GATTO_KEY = 'parallax:expedition-log:gatto:v1';
const logSource = fs.readFileSync('public/expedition-log.js', 'utf8');
const copy = value => JSON.parse(JSON.stringify(value));
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise(resolve => setImmediate(resolve)); };
const encoded = (discoveredAt = {}, completedAt = null, world = 'sheeple') => JSON.stringify({version:1, world, discoveredAt, completedAt});

function harness({raw = null, gattoRaw = null, blocked = '', controller = false, search = '', reduced = false, clipboard = true, legacyLog} = {}) {
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
    close() { this.open = false; this.dispatch('close'); }
    querySelectorAll(selector) {
      const matches = element => selector === '[data-expedition-go]' ? !!element.dataset.expeditionGo
        : selector === '[data-expedition-check]' ? !!element.dataset.expeditionCheck
        : selector === '[data-expedition-move]' ? Object.hasOwn(element.dataset, 'expeditionMove')
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
    for (const id of ['status','location','share-status','progress','progress-fill','storage-note','controls','mission-panel','waypoint-title','waypoint-hint','waypoint-distance','spark-count']) add('expedition-' + id);
    for (const id of ['interact','reset','motion','photo','capture','photo-exit','share','claim','log-open','help-open','welcome-open','welcome-continue','sound','jump','baa','missions-toggle']) add('expedition-' + id, 'button');
    for (const [id,x,y] of [['forward',0,1],['left',-1,0],['right',1,0],['back',0,-1]]) {
      const button = add('expedition-move-' + id, 'button'); Object.assign(button.dataset, {expeditionMove:'',moveX:String(x),moveY:String(y)});
    }
    const claim = ids.get('expedition-claim'); claim.append(new Element('span'), new Element('span'));
    const fallback = add('expedition-copy-fallback', 'input'); fallback.hidden = true;
    const objectives = add('expedition-objectives', 'nav');
    for (const id of ['flock','signal','bell']) {
      const button = new Element('button'); button.dataset.expeditionGo = id;
      const check = new Element('span'); check.dataset.expeditionCheck = id; button.append(check); objectives.append(button);
    }
    for (const name of ['log','stamp','help','welcome']) {
      const dialog = add('expedition-' + name + '-dialog', 'dialog');
      const eyebrow = new Element('p'); eyebrow.className = 'expedition-eyebrow'; dialog.append(eyebrow);
      add('expedition-' + name + '-close', 'button', dialog);
      if (name === 'log') {
        add('expedition-log-content', 'div', dialog); const note = new Element('p'); note.className = 'expedition-dialog-note'; dialog.append(note);
      } else if (name === 'stamp') { add('expedition-stamp-date', 'time', dialog); add('expedition-stamp-status', 'p', dialog); }
      else if (name === 'welcome') add('expedition-welcome-title', 'h2', dialog);
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
    ParallaxSheepleScene:{create(options) {
      const state = {location:null, mission:null, nearby:null, arriving:false, renderMode:'canvas', sparks:0, playable:true};
      const instance = {options, state, focused:[], motions:[], playings:[], moves:[], sounds:[], progress:[], flights:0, skipped:0, baas:0, jumps:0, destroyed:false,
        ready() { options.onReady(); },
        emit() { options.onStatus({...state}); },
        focus(id) { this.focused.push(id); Object.assign(state, {location:id,mission:id}); this.emit(); },
        arrive(id, extra = {}) { Object.assign(state, {location:id,mission:id,nearby:id,arriving:false,sparks:id === 'signal' ? 3 : state.sparks}, extra); this.emit(); },
        interact() { if (state.nearby === 'board') { options.onBoard(); return true; } if (state.nearby !== 'signal' || state.sparks < 3) return false; options.onInteract('signal'); return true; },
        baa() { this.baas++; if (state.nearby === 'flock') options.onInteract('flock'); return true; },
        jump() { this.jumps++; if (state.nearby === 'bell') options.onInteract('bell'); return true; },
        setMotion(value) { this.motions.push(value); },
        setPlaying(value) { this.playings.push(value); },
        setMove(right,forward) { this.moves.push([right,forward]); },
        setSound(value) { this.sounds.push(value); },
        setProgress(value) { this.progress.push([...value]); },
        flyIn() { this.flights++; state.arriving = true; this.emit(); },
        skipArrival() { this.skipped++; state.arriving = false; this.emit(); },
        reset() { Object.assign(state, {location:null,mission:null,nearby:null}); this.emit(); },
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
  if (controller) vm.runInContext(fs.readFileSync('public/sheeple-expedition.js', 'utf8'), sandbox);
  return {sandbox, log:sandbox.ParallaxExpeditionLog, storage, storageMap, writes, fire, emitted, settings, scenes, drawings, downloads, revoked, timers, media, all,
    get:id => ids.get(id), nav:id => all.find(element => element.dataset.expeditionGo === id),
    runTimer(delay) { const entry = [...timers].find(([,value]) => value.delay === delay); if (entry) { timers.delete(entry[0]); entry[1].fn(); } }
  };
}

test('reading, invalid discovery IDs and premature claims cannot create progress or storage writes', () => {
  const h = harness();
  assert.deepEqual(copy(h.log.summary()), {world:'sheeple',count:0,total:3,claimed:false,completedAt:null,persistence:'device',storageIssue:null});
  for (const id of [null, '', 'visit', 'sheeple', '__proto__', 'FLOCK', {id:'flock'}]) h.log.discover(id);
  h.log.read(); h.log.refresh(); h.log.claim(); h.fire('pageshow');
  assert.equal(h.log.read().count, 0); assert.equal(h.writes.length, 0);
});

test('only the three allowed interactions unlock one persistent, idempotent stamp', () => {
  const h = harness(), notifications = [];
  const unsubscribe = h.log.subscribe(value => notifications.push(copy(value)));
  h.log.discover('signal'); h.log.discover('flock'); h.log.discover('bell');
  const completed = h.log.read();
  assert.equal(completed.readyToClaim, true); assert.equal(completed.claimed, false);
  const claimed = copy(h.log.claim()), writes = h.writes.length, changes = notifications.length;
  assert.equal(claimed.claimed, true); assert.equal(claimed.readyToClaim, false); assert.equal(writes, 4);
  h.log.discover('flock'); h.log.discover('bell'); h.log.claim();
  assert.equal(h.writes.length, writes); assert.equal(notifications.length, changes);
  assert.equal(h.log.read().completedAt, claimed.completedAt);
  const returning = harness({raw:h.storageMap.get(KEY)});
  assert.deepEqual(copy(returning.log.read()), claimed); assert.equal(returning.writes.length, 0);
  assert(Object.isFrozen(h.log.read())); assert(Object.isFrozen(h.log.read().discoveries)); assert(Object.isFrozen(h.log.read().discoveredAt));
  unsubscribe();
});

test('blocked storage retains an honest in-memory log and never claims device persistence', () => {
  for (const blocked of ['getter','read','write']) {
    const h = harness({blocked});
    for (const id of ['flock','signal','bell']) h.log.discover(id);
    const claimed = h.log.claim();
    assert.equal(claimed.claimed, true); assert.equal(claimed.count, 3); assert.equal(claimed.persistence, 'visit'); assert.equal(claimed.storageIssue, 'blocked');
    h.log.refresh(); h.fire('pageshow');
    assert.equal(h.log.read().claimed, true, 'A failed write must not replace this visit with the older stored record');
    assert.equal(h.storageMap.has(KEY), false);
  }
});

test('corrupt, unsupported and forged completion records fall back without overwriting saved bytes', () => {
  const time = '2026-10-27T10:00:00.000Z';
  for (const raw of ['{', 'null', encoded({flock:time}, time), encoded({visitor:time}), encoded({flock:'bad date'}), JSON.stringify({version:2}), 'x'.repeat(5000)]) {
    const h = harness({raw});
    assert.equal(h.log.read().count, 0); assert.equal(h.log.read().claimed, false); assert.equal(h.log.read().persistence, 'visit');
    h.log.discover('flock'); h.log.claim();
    assert.equal(h.log.read().count, 1); assert.equal(h.log.read().claimed, false); assert.equal(h.storageMap.get(KEY), raw); assert.equal(h.writes.length, 0);
  }
});

test('valid device changes refresh summaries; clearing the saved log removes device progress', () => {
  const h = harness(), notices = [];
  h.log.subscribe(state => notices.push(state.count));
  h.storageMap.set(KEY, encoded({flock:'2026-10-27T10:00:00.000Z'}));
  h.fire('storage', {key:KEY, storageArea:h.storage});
  assert.equal(h.log.summary().count, 1); assert.deepEqual(notices, [1]);
  assert.equal(h.emitted.at(-1).type, 'parallax:expedition-log'); assert.equal(h.emitted.at(-1).detail.count, 1);
  h.storageMap.delete(KEY); h.fire('storage', {key:KEY, storageArea:h.storage});
  assert.equal(h.log.read().count, 0); assert.equal(h.writes.length, 0);
});

test('the world registry preserves the legacy Sheeple API and existing saved stamps without migration writes', () => {
  const time = '2026-10-27T10:00:00.000Z';
  const raw = encoded({flock:time, signal:time, bell:time}, time);
  const h = harness({raw}), registry = h.sandbox.ParallaxExpeditionLogs;
  assert.equal(registry.sheeple, h.log);
  assert(Object.isFrozen(registry)); assert(Object.isFrozen(registry.sheeple)); assert(Object.isFrozen(registry.gatto));
  assert.deepEqual(Object.keys(registry), ['sheeple','gatto']);
  assert.equal(h.log.read().claimed, true); assert.equal(h.log.read().completedAt, time);
  assert.equal(registry.gatto.read().count, 0); assert.equal(h.storageMap.get(KEY), raw);
  h.log.read(); h.log.summary(); registry.gatto.read(); registry.gatto.summary(); h.fire('pageshow');
  vm.runInContext(logSource, h.sandbox);
  assert.equal(h.sandbox.ParallaxExpeditionLog, h.log); assert.equal(h.sandbox.ParallaxExpeditionLogs, registry);
  assert.equal(h.writes.length, 0);

  const legacyLog = Object.freeze({read:() => ({world:'sheeple', count:1})});
  const upgrade = harness({legacyLog});
  assert.equal(upgrade.sandbox.ParallaxExpeditionLogs.sheeple, legacyLog);
  assert.equal(upgrade.log, legacyLog);
  assert.equal(upgrade.sandbox.ParallaxExpeditionLogs.gatto.read().world, 'gatto');
  assert.equal(upgrade.writes.length, 0);
});

test('GATTO discoveries, claims, subscriptions and storage remain independent of Sheeple', () => {
  const h = harness(), gatto = h.sandbox.ParallaxExpeditionLogs.gatto, notices = [];
  h.log.subscribe(state => notices.push(state.world)); gatto.subscribe(state => notices.push(state.world));
  for (const id of ['flock','signal','bell',null,'GATTO','__proto__']) gatto.discover(id);
  for (const id of ['cats','lanterns','sardine']) h.log.discover(id);
  gatto.read(); gatto.refresh(); gatto.claim();
  assert.equal(h.writes.length, 0); assert.equal(notices.length, 0);
  for (const id of ['sardine','cats','lanterns']) gatto.discover(id);
  assert.deepEqual(copy(gatto.read().discoveries), ['cats','lanterns','sardine']);
  assert.equal(gatto.read().readyToClaim, true); assert.equal(h.log.read().count, 0);
  h.log.claim();
  const stamp = copy(gatto.claim());
  assert.equal(stamp.claimed, true); assert.equal(stamp.world, 'gatto'); assert.equal(h.log.read().claimed, false);
  gatto.claim(); gatto.discover('cats');
  assert.equal(h.writes.length, 4); assert(h.writes.every(write => write.key === GATTO_KEY));
  assert.deepEqual(notices, ['gatto','gatto','gatto','gatto']);
  assert(h.emitted.every(event => event.type === 'parallax:expedition-log' && event.detail.world === 'gatto'));

  h.log.discover('flock');
  assert.equal(h.writes.at(-1).key, KEY); assert.equal(h.emitted.at(-1).detail.world, 'sheeple');
  assert.deepEqual(copy(gatto.read()), stamp);
  const returning = harness({raw:h.storageMap.get(KEY), gattoRaw:h.storageMap.get(GATTO_KEY)});
  assert.deepEqual(copy(returning.sandbox.ParallaxExpeditionLogs.gatto.read()), stamp);
  assert.equal(returning.log.read().count, 1); assert.equal(returning.log.read().claimed, false);
  assert.equal(returning.writes.length, 0);
});

test('cross-tab events refresh only their own world and clearing storage refreshes both without writes', () => {
  const h = harness(), gatto = h.sandbox.ParallaxExpeditionLogs.gatto, notices = [];
  const time = '2026-10-27T10:00:00.000Z';
  h.log.subscribe(state => notices.push(state.world)); gatto.subscribe(state => notices.push(state.world));
  h.storageMap.set(KEY, encoded({flock:time}));
  h.storageMap.set(GATTO_KEY, encoded({cats:time}, null, 'gatto'));
  h.fire('storage', {key:GATTO_KEY, storageArea:{}});
  assert.equal(gatto.read().count, 0);
  h.fire('storage', {key:GATTO_KEY, storageArea:h.storage});
  assert.equal(gatto.read().count, 1); assert.equal(h.log.read().count, 0);
  assert.deepEqual(notices, ['gatto']);
  h.fire('storage', {key:KEY, storageArea:h.storage});
  assert.equal(h.log.read().count, 1); assert.deepEqual(notices, ['gatto','sheeple']);
  h.storageMap.clear(); h.fire('storage', {key:null, storageArea:h.storage});
  assert.equal(gatto.read().count, 0); assert.equal(h.log.read().count, 0);
  assert.deepEqual(notices, ['gatto','sheeple','sheeple','gatto']);
  assert.equal(h.writes.length, 0);
});

test('corrupt or cross-world GATTO records cannot overwrite saved bytes or disable Sheeple persistence', () => {
  const time = '2026-10-27T10:00:00.000Z', earlier = '2026-10-27T09:00:00.000Z';
  const invalidRecords = [
    '{', encoded({cats:time}), encoded({cats:time}, null, 'unknown'),
    encoded({flock:time}, null, 'gatto'), encoded({cats:'2026-02-30T10:00:00.000Z'}, null, 'gatto'),
    encoded({cats:time}, time, 'gatto'), encoded({cats:time,lanterns:time,sardine:time}, earlier, 'gatto'),
    JSON.stringify({version:2, world:'gatto'}), 'x'.repeat(5000)
  ];
  for (const raw of invalidRecords) {
    const h = harness({gattoRaw:raw}), gatto = h.sandbox.ParallaxExpeditionLogs.gatto;
    assert.equal(gatto.read().persistence, 'visit'); assert.equal(gatto.read().count, 0);
    for (const id of ['cats','lanterns','sardine']) gatto.discover(id);
    assert.equal(gatto.claim().claimed, true);
    gatto.refresh(); h.fire('pageshow');
    assert.equal(gatto.read().claimed, true); assert.equal(h.storageMap.get(GATTO_KEY), raw);
    assert.equal(h.writes.length, 0);
    h.log.discover('flock');
    assert.equal(h.log.read().persistence, 'device'); assert.equal(h.log.read().count, 1);
    assert.equal(h.writes.length, 1); assert.equal(h.writes[0].key, KEY);
  }
  const h = harness({raw:'{'}), gatto = h.sandbox.ParallaxExpeditionLogs.gatto;
  gatto.discover('cats');
  assert.equal(gatto.read().persistence, 'device'); assert.equal(h.log.read().persistence, 'visit');
  assert.equal(h.storageMap.get(KEY), '{'); assert.equal(h.writes[0].key, GATTO_KEY);
});

test('GATTO storage failures keep a visit-only stamp and a backward clock cannot precede discoveries', () => {
  for (const blocked of ['getter','read','write']) {
    const h = harness({blocked}), gatto = h.sandbox.ParallaxExpeditionLogs.gatto;
    for (const id of ['cats','lanterns','sardine']) gatto.discover(id);
    const stamp = gatto.claim();
    assert.equal(stamp.claimed, true); assert.equal(stamp.persistence, 'visit'); assert.equal(stamp.storageIssue, 'blocked');
    gatto.refresh(); h.fire('pageshow');
    assert.equal(gatto.read().claimed, true); assert.equal(h.storageMap.has(GATTO_KEY), false);
    assert.equal(h.log.read().count, 0);
  }
  const earlier = '2099-01-01T10:00:00.000Z', latest = '2099-01-01T11:00:00.000Z';
  const h = harness({
    raw:encoded({flock:earlier, signal:latest, bell:earlier}),
    gattoRaw:encoded({cats:earlier, lanterns:latest, sardine:earlier}, null, 'gatto')
  });
  assert.equal(h.log.claim().completedAt, latest);
  assert.equal(h.sandbox.ParallaxExpeditionLogs.gatto.claim().completedAt, latest);
});

test('landing, navigation, arrival and a failed interact never count as discoveries', async () => {
  const h = harness({controller:true}), scene = h.scenes[0];
  scene.ready(); assert.equal(h.sandbox.document.body.dataset.expeditionState, 'intro');
  scene.options.onInteract('flock'); assert.equal(h.log.read().count, 0, 'The intro is not an exploration');
  await h.get('expedition-start').click(); assert.equal(scene.flights, 1);
  scene.options.onInteract('flock'); assert.equal(h.log.read().count, 0, 'The arrival is not an interaction');
  await h.get('expedition-skip').click(); assert.equal(h.sandbox.document.body.dataset.expeditionState, 'exploring');
  await h.nav('flock').click(); assert.deepEqual(scene.focused, ['flock']); assert.equal(h.log.read().count, 0);
  await h.get('expedition-interact').click(); assert.equal(h.log.read().count, 0);
  scene.arrive('flock'); assert.equal(h.get('expedition-interact').disabled, false); assert.equal(h.log.read().count, 0);
  await h.get('expedition-interact').click(); assert.equal(h.log.read().count, 1); assert.equal(h.nav('flock').dataset.discovered, 'true');
  for (const id of ['signal','bell']) { await h.nav(id).click(); scene.arrive(id); await h.get('expedition-interact').click(); }
  assert.equal(h.get('expedition-progress').textContent, '3 / 3'); assert.equal(h.get('expedition-claim').disabled, false); assert.equal(h.log.read().claimed, false);
  await h.get('expedition-claim').click(); assert.equal(h.log.read().claimed, true); assert.equal(h.get('expedition-stamp-dialog').open, true);
  assert.match(h.get('expedition-stamp-status').textContent, /cosmetic keepsake/);
});

test('waypoints guide walking and proximity controls require the matching gameplay action', async () => {
  const h = harness({controller:true, search:'?arrival=1'}), scene = h.scenes[0];
  scene.ready(); await h.get('expedition-skip').click();
  assert.equal(scene.options.playable, true); assert.deepEqual(copy(scene.options.completed), []);
  assert.equal(h.get('expedition-welcome-dialog').open, false, 'landing does not interrupt play with the field guide');
  assert.equal(h.sandbox.document.activeElement, h.get('expedition-canvas'));
  await h.nav('flock').click();
  assert.equal(h.get('expedition-status').textContent, 'Walk over to the flock and press B to baa.');
  const state = {mission:'flock', location:'flock', nearby:null, arriving:false, sparks:0, distance:12.2, hint:'Follow the flock waypoint.', renderMode:'canvas'};
  scene.options.onStatus(state);
  assert.equal(h.get('expedition-interact').textContent, 'Explore the habitat');
  assert.equal(h.get('expedition-interact').disabled, true);
  assert.equal(h.get('expedition-waypoint-distance').textContent, '12 m');
  assert.equal(h.get('expedition-waypoint-hint').textContent, 'Follow the flock waypoint.');
  scene.arrive('flock');
  assert.equal(h.get('expedition-interact').textContent, 'Baa to the flock');
  assert.equal(h.get('expedition-interact').disabled, false);
  assert.equal(h.log.read().count, 0);
  await h.get('expedition-interact').click(); assert.equal(scene.baas, 1); assert.equal(h.log.read().count, 1);
  scene.arrive('signal', {sparks:2});
  assert.equal(h.get('expedition-interact').disabled, true); assert.equal(h.get('expedition-interact').textContent, 'Find the signal rings');
  await h.get('expedition-interact').click(); assert.equal(h.log.read().count, 1);
  scene.arrive('signal'); await h.get('expedition-interact').click(); assert.equal(h.log.read().count, 2);
  scene.arrive('bell'); await h.get('expedition-interact').click(); assert.equal(scene.jumps, 1); assert.equal(h.log.read().count, 3);
  assert.equal(h.get('expedition-mission-panel').dataset.expanded, 'true', 'a ready stamp is revealed');
});

test('walking controls release on cancel, dialogs, visibility and blur; board reading pauses play', async () => {
  const h = harness({controller:true, search:'?arrival=1'}), scene = h.scenes[0];
  scene.ready(); await h.get('expedition-skip').click();
  assert.equal(scene.playings.at(-1), true); assert.equal(scene.sounds.at(-1), null);
  await h.get('expedition-move-forward').dispatch('pointerdown', {pointerId:1, button:0});
  await h.get('expedition-move-right').dispatch('pointerdown', {pointerId:2, button:0});
  assert.deepEqual(scene.moves.at(-1), [1,1]);
  await h.get('expedition-move-forward').dispatch('pointercancel', {pointerId:1});
  assert.deepEqual(scene.moves.at(-1), [1,0]);
  h.fire('blur'); assert.deepEqual(scene.moves.at(-1), [0,0]);
  scene.arrive('board'); assert.equal(h.get('expedition-interact').textContent, 'Read the field guide');
  await h.get('expedition-interact').click();
  assert.equal(h.get('expedition-welcome-dialog').open, true); assert.equal(scene.playings.at(-1), false); assert.equal(h.log.read().count, 0);
  await h.get('expedition-baa').click(); assert.equal(scene.baas, 0, 'dialog prevents background actions');
  await h.get('expedition-welcome-continue').click(); assert.equal(scene.playings.at(-1), true);
  assert.equal(h.sandbox.document.activeElement, h.get('expedition-canvas'));
  await h.get('expedition-sound').click(); assert.equal(scene.sounds.at(-1), true);
  await h.get('expedition-move-left').dispatch('pointerdown', {pointerId:3,button:0});
  h.sandbox.document.hidden = true; h.fire('document:visibilitychange');
  assert.deepEqual(scene.moves.at(-1), [0,0]); assert.equal(scene.playings.at(-1), false);
  scene.options.onInteract('flock'); assert.equal(h.log.read().count, 0, 'a hidden world cannot award a late discovery');
  h.sandbox.document.hidden = false; h.fire('document:visibilitychange'); assert.equal(scene.playings.at(-1), true);
  await h.get('expedition-photo').click(); assert.equal(scene.playings.at(-1), false);
  await h.get('expedition-photo-exit').click(); assert.equal(scene.playings.at(-1), true);
});

test('sound control reflects actual playback state and retries a blocked unlock', async () => {
  const h = harness({controller:true, search:'?arrival=1'}), scene = h.scenes[0], button = h.get('expedition-sound');
  scene.ready(); await h.get('expedition-skip').click();
  assert.equal(scene.sounds.at(-1), null, 'untouched auto sound must not become explicit mute');
  assert.equal(button.textContent, 'Baa enables sound');
  scene.options.onSoundState({preference:'on',status:'starting',enabled:false});
  assert.equal(button.textContent, 'Enabling sound…'); assert.equal(button.disabled, false);
  scene.options.onSoundState({preference:'on',status:'blocked',enabled:false});
  assert.equal(button.textContent, 'Enable sound'); assert.equal(button.getAttribute('aria-pressed'), 'false');
  await button.click(); assert.equal(scene.sounds.at(-1), true, 'retry requests an unlock, not a mute');
  assert.equal(button.textContent, 'Enable sound', 'intent alone must not claim audio is playing');
  scene.options.onSoundState({preference:'on',status:'on',enabled:true});
  assert.equal(button.textContent, 'Sound on · mute'); assert.equal(button.getAttribute('aria-pressed'), 'true');
  await button.click(); assert.equal(scene.sounds.at(-1), false);
  scene.options.onSoundState({preference:'off',status:'muted',enabled:false});
  assert.equal(button.textContent, 'Muted · enable sound'); assert.equal(button.getAttribute('aria-pressed'), 'false');
  await button.click(); assert.equal(scene.sounds.at(-1), true);
});

test('log intent wins over automatic arrival and a stalled descent always has an exit', async () => {
  const h = harness({controller:true, search:'?log=1&arrival=1'}), scene = h.scenes[0]; scene.ready();
  assert.equal(h.get('expedition-log-dialog').open, true); assert.equal(scene.flights, 0); assert.equal(h.sandbox.document.body.dataset.expeditionState, 'intro');
  assert.match(h.get('expedition-log-content').textContent, /first stamp is waiting/);
  await h.get('expedition-log-close').click();
  const arriving = harness({controller:true, search:'?arrival=1'}), incoming = arriving.scenes[0]; incoming.ready();
  assert.equal(incoming.flights, 1); assert.equal(arriving.get('expedition-intro').hidden, true); assert.equal(arriving.get('expedition-arrival').hidden, false);
  arriving.runTimer(4400);
  assert.equal(arriving.sandbox.document.body.dataset.expeditionState, 'exploring'); assert.equal(incoming.skipped, 1); assert.equal(arriving.writes.length, 0);
});

test('reduced-motion landing finishes immediately even when the scene deduplicates its unchanged status', () => {
  const h = harness({controller:true, search:'?arrival=1', reduced:true}), scene = h.scenes[0];
  scene.flyIn = function () { this.flights++; this.state.arriving = false; };
  scene.ready();
  assert.equal(scene.flights, 1); assert.equal(h.sandbox.document.body.dataset.expeditionState, 'exploring');
  assert.equal(h.get('expedition-arrival').hidden, true); assert.equal(h.timers.size, 0); assert.equal(h.writes.length, 0);
});

test('photo export uses the captured pixels plus branding, without creating discoveries', async () => {
  const h = harness({controller:true, search:'?arrival=1'}), scene = h.scenes[0]; scene.ready(); await h.get('expedition-skip').click();
  await h.get('expedition-photo').click(); assert.equal(h.sandbox.document.body.dataset.photo, 'true'); assert.equal(scene.motions.at(-1), false);
  scene.options.onInteract('flock'); assert.equal(h.log.read().count, 0, 'Photo mode does not award progress');
  await h.get('expedition-capture').click(); await settle();
  assert.equal(h.downloads.length, 1); assert.match(h.downloads[0].filename, /^parallax-lunar-flock-\d{4}-\d{2}-\d{2}\.png$/);
  assert(h.drawings.some(draw => draw.kind === 'image' && draw.source === h.get('expedition-canvas')));
  assert(h.drawings.some(draw => draw.kind === 'text' && draw.value === 'PARALLAX / THE LUNAR FLOCK'));
  assert(!h.drawings.some(draw => draw.kind === 'text' && /stamp|complete|reward/i.test(draw.value)));
  assert.equal(h.writes.length, 0);
  h.fire('document:keydown', {key:'Escape', preventDefault(){}}); assert.equal(h.sandbox.document.body.dataset.photo, undefined);
  h.fire('pagehide'); assert.equal(h.revoked.length, 1);
});

test('clipboard denial provides a selectable link and blocked storage updates all persistence copy', async () => {
  const h = harness({controller:true, search:'?arrival=1', clipboard:false, blocked:'write'}), scene = h.scenes[0]; scene.ready(); await h.get('expedition-skip').click();
  await h.get('expedition-share').click();
  assert.equal(h.get('expedition-copy-fallback').hidden, false); assert.equal(h.get('expedition-copy-fallback').selected, true);
  assert.equal(h.get('expedition-copy-fallback').value, 'https://parallaxlaunch.live/expeditions/sheeple?arrival=1');
  scene.arrive('flock'); await h.get('expedition-interact').click();
  assert.match(h.get('expedition-storage-note').textContent, /lasts for this visit/);
  assert.match(h.get('expedition-intro').textContent, /lasts for this visit/);
  await h.get('expedition-log-open').click();
  assert.match(h.get('expedition-log-dialog').textContent, /YOUR JOURNEY \/ THIS VISIT/);
  assert.equal(h.log.read().count, 1);
});

test('page lifecycle destroys and restores the scene, retains progress and never repeats automatic flight', async () => {
  const h = harness({controller:true, search:'?arrival=1', reduced:true}), first = h.scenes[0]; first.ready(); await h.get('expedition-skip').click();
  first.arrive('flock'); await h.get('expedition-interact').click();
  assert.equal(h.get('expedition-motion').disabled, true); assert(first.motions.every(value => value === false));
  h.fire('pagehide'); assert.equal(first.destroyed, true);
  first.options.onInteract('signal'); assert.equal(h.log.read().count, 1, 'A destroyed scene cannot add discoveries');
  h.fire('pageshow', {persisted:true}); assert.equal(h.scenes.length, 2);
  const next = h.scenes[1]; next.ready();
  assert.equal(next.flights, 0); assert.equal(h.sandbox.document.body.dataset.expeditionState, 'exploring'); assert.equal(h.log.read().count, 1);
  h.fire('pageshow', {persisted:true}); assert.equal(h.scenes.length, 2, 'Repeated pageshow must not bind a second controller');
  next.arrive('signal'); await h.get('expedition-interact').click(); assert.equal(h.log.read().count, 2);
});
