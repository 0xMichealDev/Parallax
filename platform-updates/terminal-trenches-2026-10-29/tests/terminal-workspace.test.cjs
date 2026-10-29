const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const source = readFileSync('public/terminal-workspace.js', 'utf8');

function setup({hash = '', missingPanel = false} = {}) {
  class Element {
    constructor(id, tagName = 'DIV') {
      this.id = id; this.tagName = tagName; this.hidden = false;
      this.dataset = {}; this.attrs = {}; this.listeners = {}; this.children = [];
      this.style = {}; this.classes = new Set(); this.tabIndex = 0; this.focused = false; this.scrolls = 0;
      this.classList = {toggle: (name, active) => active ? this.classes.add(name) : this.classes.delete(name)};
    }
    append(child) { this.children.push(child); child.parentElement = this; return child; }
    contains(child) { return this === child || this.children.some(node => node.contains(child)); }
    getAttribute(key) { return this.attrs[key] ?? null; }
    setAttribute(key, value) { this.attrs[key] = value; }
    addEventListener(name, callback) { (this.listeners[name] ??= []).push(callback); }
    emit(name, extra = {}) {
      const event = {target: this, button: 0, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, ...extra};
      for (const callback of this.listeners[name] || []) callback(event);
      return event;
    }
    getBoundingClientRect() { return {height: 520}; }
    focus() { this.focused = true; }
    scrollIntoView() { this.scrolls++; }
    closest() { return this.tagName === 'A' && this.attrs.href?.startsWith('#') ? this : this.parentElement?.closest() || null; }
  }
  const nodes = new Map();
  const create = (id, parent, tag) => { const node = new Element(id, tag); nodes.set(id, node); return parent ? parent.append(node) : node; };
  const body = create('body');
  const main = create('terminal-main', body);
  const chart = create('terminal-chart-panel', main);
  const button = create('terminal-chart-expand', chart, 'BUTTON');
  const market = create('market', main);
  const sample = create('desk-demo-banner', main);
  const drawer = create('terminal-research-drawer', main, 'DETAILS'); drawer.open = false;
  const drawerToggle = create('terminal-research-toggle', main, 'BUTTON');
  const workspace = create('workspace', drawer);
  const tablist = create('tablist', workspace); tablist.hidden = true;
  const panels = {};
  const tabs = ['position', 'fills', 'pulse', 'evidence'].map(key => {
    const tab = create('terminal-tab-' + key, tablist, 'BUTTON'); tab.dataset.workspaceTab = key;
    const id = key === 'position' ? 'desk-position' : 'terminal-' + key + '-panel';
    const panel = create(id, workspace); panels[key] = panel; tab.attrs['aria-controls'] = id;
    return tab;
  });
  const disclosure = create('evidence-details', panels.evidence, 'DETAILS');
  const nested = create('evidence-source', disclosure);
  const positionLink = create('position-link', main, 'A'); positionLink.attrs.href = '#desk-position';
  if (missingPanel) nodes.delete('terminal-fills-panel');
  workspace.querySelector = () => tablist;
  tablist.querySelectorAll = () => tabs;
  const document = new Element('document');
  Object.assign(document, {body, openDialog: null, getElementById: id => nodes.get(id) || null, querySelector: selector => selector === '.terminal-workspace-tabs' ? tablist : selector === '.terminal-bottom-workspace' ? workspace : selector === '.terminal-market-strip' ? market : selector === 'dialog[open]' ? document.openDialog : null});
  const window = new Element('window'); window.scrollY = 410; window.scrolls = [];
  window.scrollTo = options => { window.scrolls.push(options); window.scrollY = options.top; };
  const location = {hash};
  // Deliberately provide no fetch, storage, wallet, or transaction APIs.
  vm.runInNewContext(source, {document, window, location, requestAnimationFrame: callback => callback()});
  return {main, chart, button, body, drawer, drawerToggle, workspace, tablist, tabs, panels, nested, disclosure, positionLink, document, window, location};
}

test('tabs enhance progressively and leave one selected panel with a roving tab stop', () => {
  const h = setup();
  assert.equal(h.tablist.hidden, false);
  assert.equal(h.panels.position.hidden, false);
  assert(h.panels.fills.hidden && h.panels.pulse.hidden && h.panels.evidence.hidden);
  h.tabs[1].emit('click');
  assert.equal(h.panels.fills.hidden, false);
  assert.equal(h.panels.position.hidden, true);
  assert.deepEqual(h.tabs.map(tab => tab.tabIndex), [-1, 0, -1, -1]);
  assert.equal(h.tabs[1].attrs['aria-selected'], 'true');
  const fallback = setup({missingPanel: true});
  assert.equal(fallback.tablist.hidden, true);
  assert(Object.values(fallback.panels).every(panel => !panel.hidden));
});

test('keyboard tabs wrap and support Home and End without stealing other keys', () => {
  const h = setup();
  const left = h.tablist.emit('keydown', {target: h.tabs[0], key: 'ArrowLeft'});
  assert.equal(left.defaultPrevented, true);
  assert.equal(h.panels.evidence.hidden, false);
  assert.equal(h.tabs[3].focused, true);
  h.tablist.emit('keydown', {target: h.tabs[3], key: 'ArrowRight'});
  assert.equal(h.panels.position.hidden, false);
  h.tablist.emit('keydown', {target: h.tabs[0], key: 'End'});
  assert.equal(h.panels.evidence.hidden, false);
  h.tablist.emit('keydown', {target: h.tabs[3], key: 'Home'});
  assert.equal(h.panels.position.hidden, false);
  assert.equal(h.tablist.emit('keydown', {target: h.tabs[0], key: 'Tab'}).defaultPrevented, false);
});

test('deep links reveal hidden panels and nested disclosures before scrolling', () => {
  const h = setup({hash: '#evidence-source'});
  assert.equal(h.panels.evidence.hidden, false);
  assert.equal(h.disclosure.open, true);
  assert.equal(h.nested.scrolls, 1);
  h.location.hash = '#desk-position'; h.window.emit('hashchange');
  assert.equal(h.panels.position.hidden, false);
  h.tabs[1].emit('click');
  h.main.emit('click', {target: h.positionLink});
  assert.equal(h.panels.position.hidden, false, 'same-hash links reveal their panel even without a hashchange');
  h.location.hash = '#%E0%A4%A';
  assert.doesNotThrow(() => h.window.emit('hashchange'));
});

test('focus chart is reversible with Escape and restores the previous scroll position', () => {
  const h = setup();
  h.button.emit('click');
  assert(h.body.classes.has('terminal-chart-focus'));
  assert.equal(h.button.attrs['aria-pressed'], 'true');
  assert.equal(h.window.scrollY, 0);
  assert.match(h.button.attrs['aria-label'], /Escape/);
  h.document.emit('keydown', {key: 'Escape'});
  assert.equal(h.body.classes.has('terminal-chart-focus'), false);
  assert.equal(h.button.attrs['aria-pressed'], 'false');
  assert.equal(h.button.focused, true);
  assert.equal(h.window.scrollY, 410);
});

test('navigation out of chart focus reveals the destination without restoring stale scroll', () => {
  const h = setup();
  h.button.emit('click');
  h.location.hash = '#terminal-chart-panel'; h.window.emit('hashchange');
  assert(h.body.classes.has('terminal-chart-focus'));
  h.location.hash = '#evidence-source'; h.window.emit('hashchange');
  assert.equal(h.body.classes.has('terminal-chart-focus'), false);
  assert.equal(h.panels.evidence.hidden, false);
  assert.equal(h.nested.scrolls, 1);
  assert.equal(h.window.scrolls.length, 1, 'destination scrolling must not race the old page position');
});

test('Escape belongs to an open shared dialog before it exits chart focus', () => {
  const h = setup();
  h.button.emit('click');
  h.document.openDialog = {};
  const escape = h.document.emit('keydown', {key: 'Escape'});
  assert.equal(escape.defaultPrevented, false);
  assert(h.body.classes.has('terminal-chart-focus'));
  h.document.openDialog = null;
  h.document.emit('keydown', {key: 'Escape'});
  assert.equal(h.body.classes.has('terminal-chart-focus'), false);
});

test('validation reveals a hidden panel and page lifecycle resets transient focus', () => {
  const h = setup();
  h.main.emit('invalid', {target: h.nested});
  assert.equal(h.panels.evidence.hidden, false);
  assert.equal(h.disclosure.open, true);
  h.button.emit('click'); h.window.emit('pagehide');
  assert.equal(h.body.classes.has('terminal-chart-focus'), false);
  h.location.hash = '#desk-position'; h.window.emit('pageshow');
  assert.equal(h.panels.position.hidden, false);
});

 test('visible tabs open research without reducing chart height, and collapse restores sizing', () => {
 const h = setup();
 assert.equal(h.drawer.open, false);
 assert.equal(h.drawerToggle.hidden, false);
 h.tabs[2].emit('click');
 assert.equal(h.drawer.open, true);
 assert.equal(h.chart.style.minHeight, '520px');
 assert.equal(h.drawerToggle.attrs['aria-expanded'], 'true');
 assert.equal(h.panels.pulse.hidden, false);
 h.drawerToggle.emit('click');
 assert.equal(h.drawer.open, false);
 assert.equal(h.chart.style.minHeight, '');
 assert.equal(h.drawerToggle.attrs['aria-expanded'], 'false');
 });
