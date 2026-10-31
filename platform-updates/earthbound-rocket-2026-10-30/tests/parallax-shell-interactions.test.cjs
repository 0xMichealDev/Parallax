// Run the shipped shell controllers with a small DOM/event fixture. These checks
// exercise navigation and appearance behavior without accounts or network calls.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const systemSource = fs.readFileSync('public/parallax-system.js', 'utf8');
const navigationSource = fs.readFileSync('public/dashboard-pro.js', 'utf8');
const homeSource = fs.readFileSync('public/home-living.js', 'utf8');
const motionKey = 'parallax.motion.v1', legacyKey = 'parallax.home.motion.v1';

function fixture({memory = new Map(), reduced = false, saveData = false, storageBlocked = false, market = false, mobile = false, legacy = false, url = 'https://fixture.test/control#wallet', scripts = ['system']} = {}) {
  let document, location = new URL(url);
  const emitted = [];
  class Target {
    constructor() { this.listeners = new Map(); }
    addEventListener(type, callback) {
      const callbacks = this.listeners.get(type) || [];
      callbacks.push(callback); this.listeners.set(type, callbacks);
    }
    dispatchEvent(event) {
      if (!event.target) event.target = this;
      event.currentTarget = this;
      for (const callback of this.listeners.get(event.type) || []) callback(event);
      if (event.bubbles && this.parent && !event.propagationStopped) this.parent.dispatchEvent(event);
      return !event.defaultPrevented;
    }
    emit(type, values = {}) {
      const event = {type, bubbles: false, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() { this.propagationStopped = true; }, ...values};
      this.dispatchEvent(event); return event;
    }
  }
  class Element extends Target {
    constructor(tag = 'div', classes = '') {
      super(); this.tagName = tag.toUpperCase(); this.dataset = {}; this.attrs = {};
      this.hidden = false; this.disabled = false; this.value = ''; this.textContent = ''; this.isConnected = true;
      const names = new Set(classes.split(/\s+/).filter(Boolean));
      this.classList = {contains: name => names.has(name), add: name => names.add(name), remove: name => names.delete(name), toggle(name, enabled) { if (enabled === undefined) enabled = !names.has(name); if (enabled) names.add(name); else names.delete(name); return enabled; }};
    }
    setAttribute(name, value) { this.attrs[name] = String(value); }
    getAttribute(name) { return this.attrs[name] ?? null; }
    removeAttribute(name) { delete this.attrs[name]; }
    closest(selector) {
      const matches = selector === '.dashboard-sidebar' ? this.classList.contains('dashboard-sidebar')
        : selector === 'a[href]' ? this.tagName === 'A' && this.getAttribute('href') !== null
        : selector.includes('input,textarea,select') ? ['INPUT', 'TEXTAREA', 'SELECT'].includes(this.tagName) || this.getAttribute('contenteditable') !== null
        : selector === 'details' ? this.tagName === 'DETAILS' : false;
      return matches ? this : this.parent?.closest?.(selector) || null;
    }
    focus() { document.activeElement = this; }
    click() {
      if (this.disabled) return;
      const event = this.emit('click', {bubbles: true});
      const anchor = this.closest('a[href]');
      if (anchor && !event.defaultPrevented) {
        const next = new URL(anchor.getAttribute('href'), location), previousHash = location.hash;
        const sameDocument = next.pathname === location.pathname && next.search === location.search;
        location.href = next.href;
        if (sameDocument && next.hash !== previousHash) window.emit('hashchange');
      }
    }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    getBoundingClientRect() { return {left: 100, right: 700, top: 100, bottom: 700}; }
  }
  const body = new Element('body', market ? 'parallax-market-workspace' : '');
  const sidebar = new Element('aside', 'dashboard-sidebar'); sidebar.parent = body;
  const navToggle = new Element('button'); navToggle.parent = sidebar; navToggle.hidden = true; navToggle.setAttribute('aria-expanded', 'false');
  const motionButtons = [new Element('button'), new Element('button')];
  for (const button of motionButtons) { button.parent = body; button.label = new Element('span'); button.querySelector = () => button.label; button.hidden = true; }
  const legacyButton = new Element('button'); legacyButton.parent = body;
  const main = new Element('main'); main.parent = body;
  const dialog = new Element('dialog'); dialog.parent = body; dialog.open = false; dialog.showCount = 0;
  dialog.showModal = () => { dialog.open = true; dialog.showCount++; };
  dialog.close = () => { if (!dialog.open) return; dialog.open = false; dialog.emit('close'); };
  const input = new Element('input'), close = new Element('button'), status = new Element(), empty = new Element();
  input.parent = dialog; close.parent = dialog;
  const directory = new Element('nav'); directory.parent = dialog;
  const category = new Element('section'); category.parent = directory;
  const links = [['/control#wallet', 'Wallet Watch', 'wallet telegram'], ['/control#vault', 'Snapshot Library', 'reports snapshots'], ['/terminal', 'Terminal', 'tokens swaps']].map(([href, text, aliases]) => {
    const link = new Element('a'); link.parent = category; link.setAttribute('href', href); link.textContent = text; link.dataset.toolSearch = aliases; return link;
  });
  const trigger = new Element('a'); trigger.parent = body; trigger.setAttribute('href', '/#tools');
  category.querySelectorAll = () => links;
  directory.querySelectorAll = selector => selector === 'a' ? links : selector === '.tool-category' ? [category] : [];
  dialog.querySelector = selector => selector === '.tool-directory' ? directory : selector === '.command-empty' ? empty : null;
  const ids = new Map([['dashboard-command', dialog], ['dashboard-command-input', input], ['dashboard-command-close', close], ['dashboard-command-status', status]]);
  document = new Target(); body.parent = document;
  document.body = body; document.hidden = false; document.activeElement = main; document.otherDialog = false;
  document.getElementById = id => ids.get(id) || null;
  document.querySelector = selector => selector === '[data-prlx-nav-toggle]' ? navToggle : selector === 'dialog[open]' ? (dialog.open || document.otherDialog ? dialog : null) : null;
  document.querySelectorAll = selector => selector === '[data-prlx-motion]' ? motionButtons : selector === '[data-home-motion]' ? (legacy ? [legacyButton] : []) : selector === '[data-open-tools]' ? [trigger] : [];
  const media = new Target(); media.matches = reduced;
  const window = new Target();
  window.matchMedia = query => query === '(prefers-reduced-motion: reduce)' ? media : {matches: mobile};
  window.addEventListener('parallax:motion', event => emitted.push({enabled: event.detail.enabled, requested: event.detail.requested}));
  const context = {
    document, window, location, navigator: {connection: {saveData}},
    matchMedia: window.matchMedia, CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    localStorage: {getItem(key) { if (storageBlocked) throw Error('Storage blocked'); return memory.get(key) || null; }, setItem(key, value) { if (storageBlocked) throw Error('Storage blocked'); memory.set(key, value); }},
    cancelAnimationFrame() {}, requestAnimationFrame() { throw Error('No canvas loop is expected in this shell fixture'); },
    fetch() { throw Error('Shell preferences and navigation must not make network requests'); }, console
  };
  vm.createContext(context);
  if (legacy) vm.runInContext(homeSource, context);
  for (const script of scripts) vm.runInContext(script === 'system' ? systemSource : navigationSource, context);
  return {body, main, sidebar, navToggle, motionButtons, legacyButton, media, window, document, memory, emitted, dialog, input, close, status, empty, trigger, directory, links, location,
    reduce(value) { media.matches = value; media.emit('change'); },
    visibility(hidden) { document.hidden = hidden; document.emit('visibilitychange'); },
    keyboard(key, target = main, values = {}) { return document.emit('keydown', {target, key, ...values}); }
  };
}

test('motion choice persists between page loads and updates every shell toggle', () => {
  const memory = new Map(), first = fixture({memory});
  assert.equal(first.body.dataset.motion, 'running');
  first.motionButtons[0].click();
  assert.equal(first.body.dataset.motion, 'paused');
  for (const button of first.motionButtons) { assert.equal(button.getAttribute('aria-pressed'), 'true'); assert.equal(button.label.textContent, 'Motion paused'); }
  assert.equal(memory.get(motionKey), 'off'); assert.equal(memory.get(legacyKey), 'off');
  const second = fixture({memory, url: 'https://fixture.test/planets'});
  assert.equal(second.body.dataset.motion, 'paused', 'the next route restores the same preference');
  second.motionButtons[1].click();
  assert.equal(second.body.dataset.motion, 'running');
  assert.deepEqual(second.emitted.at(-1), {enabled: true, requested: true});
  assert.equal(memory.get(motionKey), 'on');
});

test('device reduced motion overrides a saved preference without erasing it', () => {
  const memory = new Map([[motionKey, 'on']]), h = fixture({memory, reduced: true});
  assert.equal(h.body.dataset.motion, 'paused');
  assert(h.motionButtons.every(button => button.disabled));
  h.motionButtons[0].click(); assert.equal(memory.get(motionKey), 'on', 'a disabled control does not overwrite the saved choice');
  h.reduce(false); assert.equal(h.body.dataset.motion, 'running');
  h.motionButtons[0].click(); h.reduce(true); h.reduce(false);
  assert.equal(h.body.dataset.motion, 'paused', 'the user pause survives device-setting changes');
});

test('data saving, legacy preferences, blocked storage, and visibility remain usable', () => {
  assert.equal(fixture({saveData: true}).body.dataset.motion, 'paused');
  assert.equal(fixture({memory: new Map([[legacyKey, 'off']])}).body.dataset.motion, 'paused');
  const h = fixture({storageBlocked: true});
  assert.doesNotThrow(() => h.motionButtons[0].click());
  assert.equal(h.body.dataset.motion, 'paused');
  const eventCount = h.emitted.length;
  h.visibility(true); assert.equal(h.body.dataset.pageVisible, 'false');
  h.visibility(false); assert.equal(h.body.dataset.pageVisible, 'true');
  assert.equal(h.body.dataset.motion, 'paused');
  assert.equal(h.emitted.length, eventCount, 'visibility does not change the stored motion preference');
  h.window.emit('pageshow'); assert.equal(h.body.dataset.motion, 'paused');
});

test('a preference changed in another tab updates the current route and honors reduced motion', () => {
  const h = fixture();
  h.window.emit('storage', {key: motionKey, newValue: 'off'});
  assert.equal(h.body.dataset.motion, 'paused');
  h.reduce(true); h.window.emit('storage', {key: legacyKey, newValue: 'on'});
  assert.equal(h.body.dataset.motion, 'paused');
  h.reduce(false); assert.equal(h.body.dataset.motion, 'running');
});

test('the preserved dashboard motion button and shared shell use one preference', () => {
  const h = fixture({legacy: true});
  h.legacyButton.click();
  assert.equal(h.body.dataset.motion, 'paused');
  assert.equal(h.memory.get(motionKey), 'off');
  assert.equal(h.motionButtons[0].getAttribute('aria-pressed'), 'true');
  h.motionButtons[0].click();
  assert.equal(h.body.classList.contains('home-motion-running'), true);
  assert.equal(h.legacyButton.textContent, 'Pause motion');
  h.legacyButton.click();
  assert.equal(h.body.dataset.motion, 'paused', 'the legacy button remains synchronized after a shared-shell change');
});

test('trading navigation expands on click and collapses only on an outside click', () => {
  const h = fixture({market: true});
  assert.equal(h.navToggle.hidden, false);
  h.navToggle.click();
  assert.equal(h.body.classList.contains('prlx-nav-expanded'), true, 'the bubbling toggle click does not immediately collapse the sidebar');
  assert.equal(h.navToggle.getAttribute('aria-expanded'), 'true');
  assert.equal(h.navToggle.getAttribute('aria-label'), 'Collapse navigation');
  h.sidebar.click(); assert.equal(h.navToggle.getAttribute('aria-expanded'), 'true');
  h.main.click(); assert.equal(h.navToggle.getAttribute('aria-expanded'), 'false');
  assert.equal(h.navToggle.getAttribute('aria-label'), 'Expand navigation');
  assert.equal(fixture().navToggle.hidden, true, 'regular pages do not expose the trading-only control');
});

test('Escape respects an open dialog before collapsing the trading sidebar', () => {
  const h = fixture({market: true}); h.navToggle.click();
  h.document.otherDialog = true; h.keyboard('Escape');
  assert.equal(h.navToggle.getAttribute('aria-expanded'), 'true');
  h.document.otherDialog = false; h.keyboard('Escape');
  assert.equal(h.navToggle.getAttribute('aria-expanded'), 'false');
});

test('choosing a same-page tool closes the modal and follows its hash destination', () => {
  const h = fixture({scripts: ['navigation']});
  h.trigger.click(); assert.equal(h.dialog.open, true); assert.equal(h.document.activeElement, h.input);
  h.links[1].click();
  assert.equal(h.dialog.open, false, 'the modal cannot remain over the selected research tab');
  assert.equal(h.location.pathname, '/control'); assert.equal(h.location.hash, '#vault');
  assert.equal(h.document.activeElement, h.trigger, 'closing releases and restores focus to the opener');
  h.trigger.click(); h.links[1].click();
  assert.equal(h.dialog.open, false, 'selecting the already-current hash also closes the modal');
});

test('tool search and keyboard selection navigate to a real matching destination', () => {
  const h = fixture({scripts: ['navigation']}); h.trigger.click();
  h.input.value = 'snapshot reports'; h.input.emit('input');
  assert.equal(h.status.textContent, '1 tool found.'); assert.equal(h.links[1].hidden, false);
  h.dialog.emit('keydown', {key: 'Enter'});
  assert.equal(h.location.hash, '#vault'); assert.equal(h.dialog.open, false);
  const phone = fixture({scripts: ['navigation'], mobile: true}); phone.trigger.click();
  assert.equal(phone.document.activeElement, phone.close, 'opening navigation on a phone does not summon the keyboard');
});

test('global shortcuts honor page-consumed events and input focus', () => {
  const h = fixture({scripts: ['navigation']});
  const consumed = h.keyboard('/', h.main, {defaultPrevented: true});
  assert.equal(consumed.defaultPrevented, true); assert.equal(h.dialog.open, false);
  h.keyboard('/', h.input); assert.equal(h.dialog.open, false, 'typing a slash in a field does not open navigation');
  h.keyboard('k', h.main, {ctrlKey: true}); assert.equal(h.dialog.open, true);
  h.close.click(); h.keyboard('/', h.main); assert.equal(h.dialog.open, true);
  h.close.click(); h.document.otherDialog = true; h.keyboard('k', h.main, {metaKey: true});
  assert.equal(h.dialog.open, false, 'another active dialog keeps priority');
});
