const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const solhandle = JSON.parse(fs.readFileSync(path.join(root, 'public/solhandle-world.json'), 'utf8'));
const creatorRoute = path.join(root, 'app/world/[id]/route.ts');

function harness() {
  const cache = new Map();
  const requests = [];
  let failure;
  function load(filename) {
    if (filename === creatorRoute) return {GET: async request => {
      requests.push(new URL(request.url).pathname);
      if (failure) return failure;
      const {solhandleWorldPage} = load(path.join(root, 'app/solhandle-world.ts'));
      const body = solhandleWorldPage({id: solhandle.id, wallet: solhandle.creatorWallet, url: solhandle.url,
        name: solhandle.name, ticker: 'SOLHANDLE', description: 'Creator project description.'});
      assert.ok(body, 'Use the original SolHandle identity and its real page template');
      return new Response(body, {headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'}});
    }};
    if (cache.has(filename)) return cache.get(filename).exports;
    if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
    const module = {exports: {}};
    cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true}
    }).outputText;
    const localRequire = specifier => {
      if (!specifier.startsWith('.')) return require(specifier);
      const resolved = path.resolve(path.dirname(filename), specifier);
      return load(path.extname(resolved) ? resolved : resolved + '.ts');
    };
    new Function('require', 'module', 'exports', code)(localRequire, module, module.exports);
    return module.exports;
  }
  const route = load(path.join(root, 'app/share/[slug]/route.ts'));
  return {route, requests, fail: response => {failure = response;}};
}

test('each realistic planet share link serves its complete page with one distinct card identity', async () => {
  const {route, requests} = harness();
  for (const id of ['solana', 'solflare', 'phantom', 'jupiter', 'bonk', 'pengu', 'wif', 'popcat', 'sheeple', 'trump', 'solhandle']) {
    const url = 'https://parallaxlaunch.live/share/' + id + '-v209';
    const response = await route.GET(new Request(url));
    const html = await response.text();
    const image = 'https://parallaxlaunch.live/assets/ecosystem/share/' + id + '-v209.png';
    assert.equal(response.status, 200, id);
    assert.equal(response.headers.get('location'), null, 'Keep the new URL without a redirect');
    assert.match(response.headers.get('content-type'), /^text\/html/);
    assert.deepEqual([...html.matchAll(/<link rel="canonical" href="([^"]+)">/g)].map(match => match[1]), [url]);
    for (const [attribute, name, expected] of [['property', 'og:url', url], ['property', 'og:image', image], ['name', 'twitter:image', image], ['name', 'twitter:card', 'summary_large_image']]) {
      const tags = [...html.matchAll(new RegExp('<meta ' + attribute + '="' + name + '" content="([^"]+)">', 'g'))];
      assert.deepEqual(tags.map(match => match[1]), [expected], id + ' ' + name);
    }
    assert.match(html, /<main\b/, 'The share URL must keep a full navigable project page');
    assert.match(html, /<canvas\b/, 'The planet experience remains available');
  }
  assert.deepEqual(requests, ['/world/' + solhandle.id], 'SolHandle stays tied to its original creator record');
});

test('incomplete, unknown and unsupported share slugs remain explicit missing pages', async () => {
  const {route} = harness();
  for (const slug of ['bonk-v20', 'unknown-v209', 'bonk-v210', 'solhandle-v209-extra']) {
    const response = await route.GET(new Request('https://parallaxlaunch.live/share/' + slug));
    assert.equal(response.status, 404, slug);
    assert.match(response.headers.get('x-robots-tag'), /noindex/);
  }
});

test('creator-world failures pass through without being converted to a valid preview', async () => {
  const h = harness();
  h.fail(new Response('Unavailable', {status: 503, headers: {'Retry-After': '30'}}));
  const response = await h.route.GET(new Request('https://parallaxlaunch.live/share/solhandle-v209'));
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('retry-after'), '30');
  assert.equal(await response.text(), 'Unavailable');
});
