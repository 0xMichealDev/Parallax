// Execute the real research controller with local fixtures. No account or
// provider requests are made; these checks cover visible retry behavior.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('public/control.js', 'utf8');
const flush = () => new Promise(setImmediate);

async function client(signedIn) {
  const nodes = new Map(), requests = [];
  let reportsError = null;
  const $ = id => {
    if (!nodes.has(id)) {
      const classes = new Set();
      nodes.set(id, {
        id, dataset: {}, hidden: false, disabled: false, value: '', files: [],
        textContent: '', innerHTML: '',
        classList: {toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }, contains(name) { return classes.has(name); }},
        addEventListener() {}, setAttribute() {}, querySelector() { return null; },
        focus() {}, scrollIntoView() {}
      });
    }
    return nodes.get(id);
  };
  vm.runInNewContext(source, {
    document: {getElementById: $, querySelectorAll: () => [], addEventListener() {}, body: {classList: {toggle() {}}, append() {}}, hidden: false},
    window: {addEventListener() {}, ParallaxResearch: {async request(url) {
      requests.push(url);
      if (url === '/api/control/status') return {signedIn, aiEnabled: false};
      if (url === '/api/control/reports') {
        if (reportsError) throw Error(reportsError);
        return {reports: []};
      }
      if (url === '/api/control/telegram') return new Promise(() => {});
      throw Error('Unexpected fixture request: ' + url);
    }}},
    location: {pathname: '/control', search: '', hash: '#vault'}, history: {replaceState() {}},
    URLSearchParams, URL, Blob, WeakSet, console, setTimeout, clearTimeout,
    setInterval() { return 1; }, clearInterval() {}
  });
  await flush();
  return {$, requests, failReports(message) { reportsError = message; }};
}

const guest = await client(false);
await guest.$('reload-reports').onclick({currentTarget: guest.$('reload-reports')});
assert.match(guest.$('vault-status').textContent, /Sign in/i, 'signed-out Refresh explains how to open the private library');
assert.equal(guest.$('sign-in-note').hidden, false);
assert.equal(guest.$('reload-reports').disabled, false);
assert.equal(guest.requests.filter(url => url === '/api/control/reports').length, 0, 'the signed-out action does not query private reports');

const member = await client(true);
member.failReports('Connection unavailable');
await member.$('reload-reports').onclick({currentTarget: member.$('reload-reports')});
assert.match(member.$('vault-status').textContent, /Connection unavailable/);
assert.equal(member.$('vault-status').classList.contains('error'), true);
assert.equal(member.$('reload-reports').disabled, false, 'a failed refresh remains retryable');
member.failReports(null);
await member.$('reload-reports').onclick({currentTarget: member.$('reload-reports')});
assert.match(member.$('vault-status').textContent, /refreshed/i);
assert.equal(member.$('vault-status').classList.contains('error'), false, 'a successful retry clears the previous error');
assert.match(member.$('reports-list').innerHTML, /No reports yet/);
console.log('PASS snapshot-library refresh: sign-in guidance, no guest reads, error feedback, retry, and success state.');
