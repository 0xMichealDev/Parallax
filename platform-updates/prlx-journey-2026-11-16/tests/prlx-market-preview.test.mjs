import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import {validSnapshot, safeSource} from '../public/observatory-core.js';

const script = fs.readFileSync(new URL('../public/prlx-market-preview.js', import.meta.url), 'utf8')
  .replace(/^import[^\n]+\n/, '');
const mint = '8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump';
const snapshot = {
  schema: 'parallax.passport.v1', network: 'solana-mainnet', address: mint,
  fetchedAt: '2026-11-16T08:00:00Z',
  market: {source:'S2', priceUsd:0.0000039, change24hPercent:0, volume24hUsd:null},
  sources: [{id:'S2', status:'retrieved', url:'https://dexscreener.com/solana/' + mint}],
};

function element() {
  return {hidden: true, textContent: '', children: [], dataset: {},
    append(...nodes) { this.children.push(...nodes); },
    replaceChildren(...nodes) { this.children = nodes; },
    addEventListener(type, fn) { this[type] = fn; },
  };
}

function setup() {
  const check = element(), facts = element(), status = element();
  const ids = {'prlx-market-check':check, 'prlx-market-facts':facts, 'prlx-market-status':status, 'official-ca':{textContent:mint}};
  const calls = [];
  const replies = [];
  vm.runInNewContext(script, {document: {getElementById: id => ids[id], createElement:element},
    AbortSignal, validSnapshot, safeSource, fetch: async url => {
      calls.push(url);
      return {ok:true, json:async () => replies.shift()};
    },
  });
  return {check, facts, status, calls, replies};
}

test('market preview loads on request, displays zero accurately and identifies missing values', async () => {
  const {check, facts, calls, replies} = setup();
  assert.equal(check.hidden, false);
  assert.equal(calls.length, 0);
  replies.push(snapshot);
  await Promise.all([check.click(), check.click()]);
  assert.deepEqual(calls, ['/api/market?address=' + mint]);
  assert.equal(facts.hidden, false);
  const [prices, source] = facts.children;
  assert.deepEqual(prices.children.map(group => group.children[1].textContent), ['$0.0000039', '0%', 'Unavailable']);
  assert.equal(source.href, snapshot.sources[0].url);
});

test('invalid initial results stay hidden and a failed refresh keeps the last timestamp', async () => {
  const {check, facts, status, replies} = setup();
  replies.push({...snapshot, address:'wrong'}, snapshot, {...snapshot, fetchedAt:'invalid'});
  await check.click();
  assert.equal(facts.hidden, true);
  await check.click();
  const previous = facts.children;
  const time = facts.dataset.collected;
  await check.click();
  assert.equal(facts.children, previous);
  assert(status.textContent.includes(time));
  assert.equal(check.disabled, false);
});
