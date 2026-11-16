const test = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const code = readFileSync('public/home-orbit.js', 'utf8');

function preview({reduced = false} = {}) {
  const elements = new Map(), frames = new Map(), scripts = [], calls = [];
  let next = 0, intersection, mutation, result = 'live', contexts = 0;
  class Element {
    constructor() { this.events = {}; this.attrs = {}; this.dataset = {}; this.hidden = false; }
    addEventListener(name, fn) { this.events[name] = fn; }
    fire(name, args = {}) { return this.events[name]?.({preventDefault(){}, ...args}); }
    setAttribute(name, value) { this.attrs[name] = value; }
    setPointerCapture() {}
    focus() { doc.activeElement = this; }
  }
  const el = id => { if (!elements.has(id)) elements.set(id, new Element()); return elements.get(id); };
  const doc = new Element(), win = new Element(), media = new Element();
  doc.body = new Element(); doc.head = {append: script => scripts.push(script)};
  doc.getElementById = el; doc.createElement = () => Object.assign(new Element(), {remove(){}});
  const stage = el('stage'), canvas = el('home-orbit-canvas'), toggle = el('home-orbit-toggle'), panel = el('project-preview');
  stage.getBoundingClientRect = () => ({width: 480, height: 270});
  canvas.parentElement = stage; canvas.hidden = true;
  canvas.getContext = () => { contexts++; return {clearRect(){}}; };
  media.matches = reduced;
  class IntersectionObserver { constructor(fn) { intersection = fn; } observe() {} }
  class MutationObserver { constructor(fn) { mutation = fn; } observe() {} }
  win.IntersectionObserver = IntersectionObserver;
  const context = {document:doc, window:win, IntersectionObserver, MutationObserver, matchMedia:() => media,
    requestAnimationFrame:fn => { frames.set(++next, fn); return next; }, cancelAnimationFrame:id => frames.delete(id)};
  vm.runInNewContext(code, context);
  const visible = value => intersection([{isIntersecting:value}]);
  visible(true);
  const frame = (now = 100) => { for (const [id, fn] of [...frames]) { frames.delete(id); fn(now); } };
  const provideRenderer = () => {
    win.ParallaxSingularity = {draw: (...args) => { calls.push(args); return result; }};
    scripts.at(-1).onload();
  };
  return {doc,win,canvas,toggle,el,media,frames,scripts,calls,visible,frame,provideRenderer,
    contexts:() => contexts, outcome:value => { result = value; },
    tab:hidden => { panel.hidden = hidden; mutation(); }};
}

test('the homepage loads no renderer until requested, and an abandoned request keeps the image', async () => {
  const p = preview();
  assert.deepEqual([p.scripts.length,p.contexts(),p.frames.size],[0,0,0]);
  const opening = p.toggle.fire('click');
  assert.equal(p.scripts[0].src, '/singularity-renderer.js?v=118');
  assert.equal(p.canvas.hidden,true);
  await p.toggle.fire('click'); p.provideRenderer(); await opening;
  assert.equal(p.frames.size,0); assert.equal(p.canvas.hidden,true);
  await p.toggle.fire('click'); p.frame();
  assert.equal(p.scripts.length,1); assert.equal(p.canvas.hidden,false);
  assert.equal(p.calls[0][5].mode,'original');
});

test('reduced motion draws only on input, with bounded pointer and keyboard orbit and a reset', async () => {
  const p=preview({reduced:true});
  const opening=p.toggle.fire('click'); p.provideRenderer(); await opening; p.frame();
  const initial=p.calls.at(-1)[5];
  assert.equal(p.frames.size,0);
  p.canvas.fire('keydown',{key:'ArrowRight'}); p.frame(200);
  assert.ok(p.calls.at(-1)[5].yaw>initial.yaw); assert.equal(p.frames.size,0);
  p.canvas.fire('pointerdown',{button:0,pointerId:1,clientX:10,clientY:20});
  p.canvas.fire('pointermove',{pointerId:1,clientX:55,clientY:-1000}); p.frame(300);
  assert.equal(p.calls.at(-1)[5].pitch,1.15);
  p.canvas.fire('pointerup',{pointerId:1});
  p.canvas.fire('keydown',{key:'Home'}); p.frame(400);
  assert.equal(p.calls.at(-1)[5].yaw,initial.yaw);
  assert.equal(p.calls.at(-1)[5].pitch,initial.pitch);
  assert.equal(p.calls.at(-1)[4],0);
  p.canvas.fire('keydown',{key:'Escape'});
  assert.equal(p.canvas.hidden,true); assert.equal(p.doc.activeElement,p.toggle);
});

test('offscreen, film tab, page lifecycle and site motion controls suspend the render loop', async () => {
  const p=preview(); const opening=p.toggle.fire('click'); p.provideRenderer(); await opening; p.frame();
  assert.equal(p.frames.size,1);
  p.visible(false); assert.equal(p.frames.size,0); p.visible(true); p.frame();
  p.tab(true); assert.equal(p.frames.size,0); p.tab(false); p.frame();
  p.doc.hidden=true; p.doc.fire('visibilitychange'); assert.equal(p.frames.size,0);
  p.doc.hidden=false; p.doc.fire('visibilitychange'); p.frame();
  p.win.fire('pagehide'); assert.equal(p.frames.size,0); p.win.fire('pageshow'); p.frame();
  p.doc.body.dataset.motion='paused'; p.win.fire('parallax:motion'); p.frame();
  assert.equal(p.frames.size,0);
});

test('unsupported graphics and a failed download retain the real project image', async () => {
  const p=preview();
  const first=p.toggle.fire('click'); p.scripts[0].onerror(); await first;
  assert.equal(p.canvas.hidden,true); assert.equal(p.frames.size,0);
  const retry=p.toggle.fire('click'); p.outcome('illustrated'); p.provideRenderer(); await retry; p.frame();
  assert.equal(p.canvas.hidden,true); assert.equal(p.frames.size,0);
  assert.equal(p.toggle.attrs['aria-pressed'],'false');
  assert.match(p.el('home-orbit-status').textContent,/project image/);
});
