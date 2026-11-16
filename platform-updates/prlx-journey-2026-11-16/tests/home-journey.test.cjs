const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const read = filename => readFileSync(path.join(__dirname, '..', filename), 'utf8');
const html = read('app/home.html');
const script = read('public/home-hub.js');

test('featured journey opens the official mint in Terminal and offers the native captioned walkthrough', () => {
  const mint = '8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump';
  const link = html.match(/class="entry-primary" href="([^"]+)"/)[1];
  const destination = new URL(link.replaceAll('&amp;', '&'), 'https://parallaxlaunch.live');
  assert.equal(destination.pathname, '/terminal');
  assert.equal(destination.searchParams.get('token'), mint);
  assert.equal(destination.searchParams.get('tour'), 'prlx');
  assert.ok(html.includes('id="official-ca" tabindex="0" aria-labelledby="official-ca-label">' + mint + '</code>'));
  assert.match(html, /href="\/?\?view=dashboard"/);
  assert.match(html, /id="home-token-search" action="\/terminal" method="get"/);

  const block = html.match(/<video\b[\s\S]*?<\/video>/)[0];
  const tag = block.slice(0, block.indexOf('>'));
  assert.match(tag, /\scontrols\b/);
  assert.match(tag, /\splaysinline\b/);
  assert.match(tag, /preload="none"/);
  assert.doesNotMatch(tag, /\sautoplay\b/);
  assert.match(tag, /poster="\/assets\/home\/prlx-journey\.webp"/);
  assert.match(block, /<source src="\/assets\/home\/prlx-journey\.mp4" type="video\/mp4"/);
  assert.match(block, /<track kind="captions" src="\/assets\/home\/prlx-journey\.vtt" srclang="en" label="English" default/);
});

function setup(hash = '') {
  class Element extends EventTarget {
    attrs = {};
    dataset = {};
    setAttribute(key, value) { this.attrs[key] = value; }
    focus() { this.focused = true; }
    scrollIntoView() { this.scrolled = true; }
  }
  const ids = ['project-preview', 'prlx-demo', 'project-preview-tab', 'project-film-tab', 'official-token'];
  const elements = Object.fromEntries(ids.map(id => [id, new Element()]));
  const [preview, film, previewTab, filmTab, official] = ids.map(id => elements[id]);
  const player = {paused: true, pause() { this.paused = true; }};
  const returnLink = new Element(), nav = new Element(), window = new EventTarget(), location = {hash};
  previewTab.parentElement = filmTab.parentElement = nav;
  nav.parentElement = new Element();
  film.querySelector = () => player;
  const document = {getElementById: id => elements[id], querySelector: () => returnLink, querySelectorAll: () => []};
  vm.runInNewContext(script, {document, window, location});
  return {preview, film, previewTab, filmTab, official, player, returnLink, window, location};
}

test('the preview supports pointer, keyboard and direct film links, and pauses when hidden', () => {
  const {preview, film, previewTab, filmTab, player, returnLink} = setup();
  assert.equal(preview.hidden, false);
  assert.equal(film.hidden, true);
  assert.equal(previewTab.tabIndex, 0);
  assert.equal(filmTab.attrs['aria-selected'], 'false');
  const key = new Event('keydown', {cancelable: true});
  Object.defineProperty(key, 'key', {value: 'ArrowRight'});
  previewTab.dispatchEvent(key);
  assert.ok(key.defaultPrevented);
  assert.equal(filmTab.focused, true);
  assert.equal(film.hidden, false);
  assert.equal(filmTab.tabIndex, 0);
  assert.equal(previewTab.tabIndex, -1);
  player.paused = false;
  previewTab.dispatchEvent(new Event('click', {cancelable: true}));
  assert.equal(player.paused, true);
  assert.equal(film.hidden, true);
  filmTab.dispatchEvent(new Event('click', {cancelable: true}));
  returnLink.dispatchEvent(new Event('click'));
  assert.equal(preview.hidden, false);

  const direct = setup('#prlx-demo');
  assert.equal(direct.film.hidden, false);
  direct.location.hash = '#official-token';
  direct.window.dispatchEvent(new Event('hashchange'));
  assert.equal(direct.preview.hidden, false);
  assert.equal(direct.official.scrolled, true);
});
