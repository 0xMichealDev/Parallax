import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

// Exercise the shipped browser script with account-local data and mocked HTTP.
// No provider, wallet signature, AI, or production request is made by this test.
const code = fs.readFileSync('public/holder-pro.js', 'utf8');
const flush = () => new Promise(setImmediate);
const memberWallet = '9'.repeat(32);
const storageKey = 'parallax-pro-v1:' + memberWallet;
const savedEntries = [
  { kind: 'wallet', address: '2'.repeat(32), label: 'Alpha treasury' },
  { kind: 'wallet', address: '3'.repeat(32), label: 'Beta operations' },
  { kind: 'project', address: '4'.repeat(32), label: 'Alpha token' },
  { kind: 'project', address: '5'.repeat(32), label: 'Gamma token' }
];

class Node {
  constructor(tag = 'div') {
    this.tag = tag;
    this.children = [];
    this.attrs = {};
    this.dataset = {};
    this.value = '';
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this._text = '';
    const classes = new Set();
    this.classList = {
      toggle(name, force) {
        const enabled = force === undefined ? !classes.has(name) : force;
        if (enabled) classes.add(name); else classes.delete(name);
        return enabled;
      },
      contains(name) { return classes.has(name); }
    };
  }
  set textContent(value) { this._text = String(value ?? ''); this.children = []; }
  get textContent() { return this._text + this.children.map(node => typeof node === 'string' ? node : node.textContent).join(''); }
  set innerHTML(_value) { throw Error('Monitor must render user labels and provider data as safe text.'); }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this._text = ''; this.children = [...nodes]; }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  click() {}
}

async function client({ entries = savedEntries } = {}) {
  const nodes = new Map(), requests = [], storageWrites = [], handlers = {}, timers = [];
  const storage = new Map([[storageKey, JSON.stringify(entries)]]);
  const filters = ['all', 'wallet', 'project'].map(kind => {
    const button = new Node('button');
    button.dataset.monitorFilter = kind;
    button.setAttribute('aria-pressed', String(kind === 'all'));
    return button;
  });
  const $ = id => {
    if (!nodes.has(id)) nodes.set(id, new Node());
    return nodes.get(id);
  };
  $('pro-kind').value = 'wallet';
  $('pro-threshold').value = '5';
  $('pro-export').disabled = true;
  const body = new Node('body');
  let now = Date.parse('2026-10-29T20:00:00Z');
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const access = { eligible: true, wallet: memberWallet, balance: '100000', required: '100000' };
  let scanItems = entries.map(item => ({
    kind: item.kind, address: item.address, checkedAt: '2026-10-29T20:00:00.000Z',
    data: item.kind === 'wallet'
      ? { sol: 2.5, transactions: [] }
      : { market: { priceUsd: 0.1, liquidityUsd: 5000, volume24hUsd: 100, change24hPercent: 2, pairAddress: 'pair-' + item.address, symbol: 'TEST', dex: 'fixture' } }
  }));
  let waitForScan = null;
  const document = {
    body, hidden: false, getElementById: $, createElement: tag => new Node(tag),
    querySelectorAll: selector => selector === '[data-monitor-filter]' ? filters : []
  };
  vm.runInNewContext(code, {
    document,
    window: { phantom: { solana: { on: (event, handler) => { handlers[event] = handler; } } } },
    location: { origin: 'https://fixture.test' },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => { storageWrites.push({ key, value }); storage.set(key, value); }
    },
    Date: Clock, URL, Blob, TextEncoder, console,
    setInterval: fn => { timers.push(fn); return timers.length; },
    setTimeout() {},
    fetch: async (path, options) => {
      const request = { path, body: options.body ? JSON.parse(options.body) : null };
      requests.push(request);
      if (path === '/api/session') return Response.json({ signedIn: true, wallet: memberWallet });
      if (path === '/api/pro/status') return Response.json(access);
      if (path === '/api/pro/scan') {
        if (waitForScan) await waitForScan;
        return Response.json({ access, checkedAt: new Clock().toISOString(), items: scanItems });
      }
      throw Error('Unexpected request: ' + path);
    }
  });
  await flush();
  return {
    $, body, requests, storage, storageWrites, handlers, timers,
    filter: kind => filters.find(button => button.dataset.monitorFilter === kind),
    cards: () => $('pro-cards').children.filter(node => node.tag === 'article'),
    setItems: items => { scanItems = items; },
    setScanWait: promise => { waitForScan = promise; },
    advance: (ms = 11000) => { now += ms; },
    checkedAt: () => new Clock().toISOString()
  };
}

function metricValue(card, name) {
  const metrics = card.children.find(node => node.tag === 'dl');
  const metric = metrics?.children.find(node => node.children[0]?.textContent === name);
  return metric?.children[1]?.textContent;
}
function cardLabels(app) {
  return app.cards().map(card => card.children.find(node => node.tag === 'h3')?.textContent);
}

const app = await client();
assert.equal(app.$('pro-workspace').hidden, false);
assert.equal(app.cards().length, 4);
assert.equal(app.$('pro-wallet-count').textContent, '2 / 5');
assert.equal(app.$('pro-project-count').textContent, '2 / 5');
assert.equal(app.$('pro-last-collected').textContent, 'Not collected');
assert.equal(app.$('pro-refresh-mode').textContent, 'Manual');
const originalStorage = app.storage.get(storageKey);
const originalRequests = app.requests.length;

app.filter('wallet').onclick();
assert.deepEqual(cardLabels(app), ['Alpha treasury', 'Beta operations']);
assert.equal(app.filter('wallet').attrs['aria-pressed'], 'true');
assert.equal(app.filter('all').attrs['aria-pressed'], 'false');
app.$('pro-search').value = '  ALPHA  ';
app.$('pro-search').oninput();
assert.deepEqual(cardLabels(app), ['Alpha treasury'], 'search combines with the wallet filter');
app.filter('project').onclick();
assert.deepEqual(cardLabels(app), ['Alpha token'], 'search combines with the project filter');
app.$('pro-search').value = savedEntries[3].address;
app.$('pro-search').oninput();
assert.deepEqual(cardLabels(app), ['Gamma token'], 'full public addresses can be searched');
assert.equal(app.$('pro-wallet-count').textContent, '2 / 5', 'summary counts all saved wallets, not only visible cards');
assert.equal(app.$('pro-project-count').textContent, '2 / 5', 'summary counts all saved projects, not only visible cards');
assert.equal(app.storage.get(storageKey), originalStorage);
assert.equal(app.storageWrites.length, 0, 'filtering and searching never rewrite the monitor');
assert.equal(app.requests.length, originalRequests, 'filtering and searching are local operations');

app.$('pro-search').value = 'nothing matches this';
app.$('pro-search').oninput();
assert.equal(app.cards().length, 0);
assert.match(app.$('pro-cards').textContent, /No monitored items match this view/);
const empty = await client({ entries: [] });
assert.match(empty.$('pro-cards').textContent, /Add a public wallet or token address/);
assert.doesNotMatch(empty.$('pro-cards').textContent, /No monitored items match/);

// A refresh still collects the full saved monitor while its displayed view is filtered.
app.$('pro-search').value = 'Alpha';
app.$('pro-search').oninput();
await app.$('pro-refresh').onclick();
const scan = app.requests.find(request => request.path === '/api/pro/scan');
assert.deepEqual(scan.body.wallets, savedEntries.filter(item => item.kind === 'wallet').map(item => item.address));
assert.deepEqual(scan.body.projects, savedEntries.filter(item => item.kind === 'project').map(item => item.address));
assert.equal(app.$('pro-last-collected').title, new Date(app.checkedAt()).toLocaleString());
assert.equal(app.$('pro-last-collected').textContent, new Date(app.checkedAt()).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }));
assert.equal(app.$('pro-export').disabled, false);
assert.equal(app.$('pro-wallet-count').textContent, '2 / 5');
assert.equal(app.$('pro-project-count').textContent, '2 / 5');
app.$('pro-auto').checked = true;
app.$('pro-auto').onchange();
assert.equal(app.$('pro-refresh-mode').textContent, 'Every 60s');
assert.equal(app.storage.get(storageKey), originalStorage);

// Unknown provider fields must remain unknown; a collected zero is a separate state.
const partial = await client({ entries: [savedEntries[0]] });
partial.setItems([{ kind: 'wallet', address: savedEntries[0].address, checkedAt: partial.checkedAt(), data: { partial: true, transactions: null } }]);
await partial.$('pro-refresh').onclick();
assert.equal(metricValue(partial.cards()[0], 'Native SOL'), 'Unavailable');
assert.equal(metricValue(partial.cards()[0], 'Recent signatures'), 'Unavailable');
assert.match(partial.cards()[0].textContent, /unknown, not zero/);
partial.advance();
partial.setItems([{ kind: 'wallet', address: savedEntries[0].address, checkedAt: partial.checkedAt(), data: { sol: 0, transactions: [] } }]);
await partial.$('pro-refresh').onclick();
assert.equal(metricValue(partial.cards()[0], 'Native SOL'), '0');
assert.equal(metricValue(partial.cards()[0], 'Recent signatures'), '0');
assert.doesNotMatch(partial.$('pro-feed').textContent, /undefined|NaN|SOL balance changed/, 'missing data cannot become a fabricated balance-change notice');

// A wallet switch removes private render state and prevents an old scan from restoring it.
app.advance();
let release;
app.setScanWait(new Promise(resolve => { release = resolve; }));
const pending = app.$('pro-refresh').onclick();
await flush();
app.handlers.accountChanged();
assert.equal(app.$('pro-workspace').hidden, true);
assert.equal(app.$('pro-member-card').hidden, true);
assert.equal(app.$('pro-member-wallet').textContent, '');
assert.equal(app.$('pro-export').disabled, true);
assert.equal(app.$('pro-auto').checked, false);
assert.equal(app.$('pro-wallet-count').textContent, '0 / 5');
assert.equal(app.$('pro-project-count').textContent, '0 / 5');
assert.equal(app.$('pro-last-collected').textContent, 'Not collected');
assert.equal(app.$('pro-last-collected').title, '');
assert.equal(app.$('pro-refresh-mode').textContent, 'Manual');
assert.equal(app.cards().length, 0);
assert.equal(app.body.classList.contains('is-pro-member'), false);
release();
await pending;
assert.equal(app.$('pro-workspace').hidden, true, 'late collection cannot restore access');
assert.equal(app.cards().length, 0, 'late collection cannot restore private cards');
assert.doesNotMatch(app.$('pro-cards').textContent, /Alpha|Beta|Gamma|Collected/);
assert.doesNotMatch(app.$('pro-feed').textContent, /Alpha|Beta|Gamma/);
assert.equal(app.$('pro-last-collected').textContent, 'Not collected');
assert.equal(app.$('pro-export').disabled, true);
assert.equal(app.storage.get(storageKey), originalStorage, 'changing wallets does not delete the former wallet’s saved monitor');

console.log('PASS Gold monitor UI: local filters/search, saved-entry summaries, collection times, empty/no-results states, partial data, observed zero, and wallet-switch scan isolation.');
