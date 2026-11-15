const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = filename => readFileSync(path.join(root, filename), 'utf8');
const html = read('app/dashboard.html');
const script = read('public/dashboard-tour.js');

test('the observatory offers the correct tour beside its skip link, without loading the movie on arrival', () => {
  const topline = html.match(/class="journey-topline"[\s\S]*?(?=class="journey-chapters")/)[0];
  const trigger = topline.match(/<a\b[^>]*\bid="watch-dashboard-tour"[^>]*>/)[0];
  assert.match(trigger, /href="https:\/\/www\.veed\.io\/view\/416e810f-af56-4351-b95f-052612c5ab74"/);
  assert.match(trigger, /aria-controls="dashboard-tour"/);
  assert.match(topline, /href="#dashboard-destinations"/);

  const dialog = html.match(/<dialog\b[^>]*\bid="dashboard-tour"[\s\S]*?<\/dialog>/)[0];
  const video = dialog.match(/<video\b[^>]*>/)[0];
  assert.match(video, /\scontrols\b/);
  assert.match(video, /\splaysinline\b/);
  assert.match(video, /preload="none"/);
  assert.doesNotMatch(video, /\s(?:src|autoplay)\b/);
  assert.doesNotMatch(dialog, /<source\b[^>]*\ssrc=/);
  assert.match(dialog, /<track\b[^>]*kind="captions"/);
  assert.match(dialog, /href="https:\/\/www\.veed\.io\/view\/416e810f-af56-4351-b95f-052612c5ab74"/);
});

// Exercise the page script through native-style events. Escape and the close
// button both ultimately dispatch the dialog's close event in a browser.
function setup() {
  const document = new EventTarget();
  const nodes = Object.fromEntries(['trigger', 'dialog', 'close', 'video', 'error'].map(name => [name, new EventTarget()]));
  const {trigger, dialog, close, video, error} = nodes;
  const window = new EventTarget();
  window.scrollY = 350;
  window.scrollTo = options => { window.scrollY = options.top; };
  error.hidden = true;
  document.getElementById = id => ({'watch-dashboard-tour': trigger, 'dashboard-tour': dialog})[id] ?? null;
  dialog.querySelector = selector => ({video, '[data-tour-close]': close, '[data-tour-error]': error})[selector] ?? null;
  trigger.focus = options => {
    document.activeElement = trigger;
    if (!options?.preventScroll) window.scrollY = 0;
  };
  dialog.showModal = () => {
    dialog.open = true;
    document.activeElement = close;
    window.scrollY = 58; // Native dialog focus moved the sticky observatory in browser QA.
  };
  dialog.close = () => { dialog.open = false; dialog.dispatchEvent(new Event('close')); };
  video.dataset = {src: '/assets/dashboard-tour/nicole.mp4'};
  video.hasAttribute = name => name === 'src' && Boolean(video.src);
  video.getAttribute = name => name === 'src' ? video.src || null : null;
  video.play = async () => { video.paused = false; video.playCount++; };
  video.pause = () => { video.paused = true; };
  video.playCount = 0;
  video.paused = true;
  vm.runInNewContext(script, {document, window});
  function click(node) {
    const event = new Event('click', {cancelable: true});
    Object.defineProperty(event, 'button', {value: 0});
    node.dispatchEvent(event);
    return event;
  }
  return {...nodes, document, window, click};
}

test('the tour starts on demand, both close paths stop audio, and visitors return to their dashboard position', () => {
  const {trigger, dialog, close, video, document, window, click} = setup();
  assert.equal(video.src, undefined);
  assert.equal(video.playCount, 0);
  for (const [start, dismiss] of [[350, () => click(close)], [640, () => dialog.close()]]) {
    window.scrollY = start;
    assert.equal(click(trigger).defaultPrevented, true, 'stay on the dashboard');
    assert.equal(dialog.open, true);
    assert.equal(video.src, '/assets/dashboard-tour/nicole.mp4');
    assert.equal(video.paused, false);
    dismiss();
    assert.equal(dialog.open, false);
    assert.equal(video.paused, true, 'stop narration even after native dismissal');
    assert.equal(document.activeElement, trigger);
    assert.equal(window.scrollY, start, 'return to the chapter position from this opening');
  }
  assert.equal(video.playCount, 2);
});

test('a media failure exposes the backup player', () => {
  const {trigger, video, error, click} = setup();
  click(trigger);
  assert.equal(error.hidden, true);
  video.dispatchEvent(new Event('error'));
  assert.equal(error.hidden, false);
});
