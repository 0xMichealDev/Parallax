import assert from 'node:assert/strict';
import test from 'node:test';
import {setImmediate as settle} from 'node:timers/promises';
import {clipFor, clockText, editCut, initEditor, overlapFor} from '../public/multicam-editor.mjs';
import {angleAt, coverRect, exportSize, extensionFor, recordEdit} from '../public/multicam-export.mjs';

test('positive and negative B offsets yield shared A-clock ranges and a bounded movable export', () => {
  assert.deepEqual(overlapFor(80, 52, 2), {start: 2, end: 54, duration: 52});
  assert.deepEqual(overlapFor(80, 52, -2), {start: 0, end: 50, duration: 50});
  assert.equal(overlapFor(3, 5, -5), null);
  assert.equal(overlapFor(Infinity, 5, 0), null);
  assert.deepEqual(clipFor(overlapFor(80, 52, 2), 10, 300), {start: 12, end: 42, duration: 30});
  assert.deepEqual(clipFor(overlapFor(80, 52, 2), 50, 10), {start: 52, end: 54, duration: 2});
  assert.equal(clockText(68.3), '1:08.30');
});

test('cuts replace the active angle at a time, keep chronological order, and survive trim windows', () => {
  const before = [{at: 3, angle: 'B'}, {at: 8, angle: 'A'}];
  assert.equal(angleAt(before, 2.99), 'A');
  assert.equal(angleAt(before, 3), 'B');
  assert.equal(angleAt(before, 4), 'B');
  assert.equal(angleAt(before, 8), 'A');
  assert.deepEqual(editCut(before, 3.001, 'A'), []);
  assert.deepEqual(editCut(before, 5, 'A'), [{at: 3, angle: 'B'}, {at: 5, angle: 'A'}]);
  assert.deepEqual(editCut(before, 3, 'B'), before);
  assert.equal(editCut(before, 5, 'X'), before);
});

class El extends EventTarget {
  constructor() {
    super();
    Object.assign(this, {dataset:{}, style:{}, attrs:{}, children:[], hidden:false, value:'', currentTime:0, paused:true});
  }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  removeAttribute(name) { delete this.attrs[name]; if (name === 'src') this.src = ''; }
  append(...items) { this.children.push(...items); }
  replaceChildren() { this.children.length = 0; }
  get valueAsNumber() { return this.value === '' ? NaN : Number(this.value); }
  click() { if (!this.disabled) this.dispatchEvent(new Event('click')); }
  load() {
    this.readyState = this.src ? 4 : 0;
    this.duration = this.src ? 10 : NaN;
    this.videoWidth = this.src ? 640 : 0;
    this.videoHeight = this.src ? 360 : 0;
    this.currentTime = 0;
  }
  pause() { this.paused = true; }
  async play() { this.paused = false; }
  remove() { this.removed = true; }
}

function editor() {
  const nodes = new Map(), document = new El(), env = new El();
  const node = key => { if (!nodes.has(key)) nodes.set(key, new El()); return nodes.get(key); };
  document.getElementById = id => node(id.slice(3));
  document.createElement = () => new El();
  const revoked = [], fetched = [];
  let serial = 0;
  env.URL = {createObjectURL: () => 'blob:test-' + (++serial), revokeObjectURL: url => revoked.push(url)};
  env.fetch = async url => { fetched.push(url); return {ok:true, blob:async () => new Blob([url])}; };
  env.requestAnimationFrame = () => 1; env.cancelAnimationFrame = () => {};
  const instance = initEditor(document, env);
  function upload(angle) {
    const field = node('file-' + angle), blob = new Blob([angle]);
    Object.defineProperty(blob, 'name', {value: angle + '.mp4'});
    field.files = [blob]; field.dispatchEvent(new Event('change'));
  }
  return {node, upload, fetched, revoked, instance};
}

test('import, manual sync, camera switches, undo, replacement and disposal use local file URLs', async () => {
  const {node, upload, fetched, revoked, instance} = editor();
  assert.equal(node('video-a').hidden, true);
  assert.equal(node('video-b').hidden, true);
  upload('a'); await settle(); upload('b'); await settle();
  assert.equal(node('play').disabled, false);
  assert.equal(node('cuts').children.length, 1, 'personal footage starts without example cuts');
  assert.equal(node('video-a').muted, false);
  assert.equal(node('video-b').muted, true);
  const offset = node('offset'); offset.value = '2'; offset.dispatchEvent(new Event('change'));
  assert.equal(node('video-a').currentTime, 2); assert.equal(node('video-b').currentTime, 0);
  const scrub = node('scrub'); scrub.value = '3'; scrub.dispatchEvent(new Event('input'));
  assert.equal(node('video-a').currentTime, 5); assert.equal(node('video-b').currentTime, 3);
  node('cut-b').click();
  assert.equal(node('video-b').hidden, false); assert.equal(node('cuts').children.length, 2);
  node('undo').click(); assert.equal(node('video-b').hidden, true);
  node('cut-b').click(); node('reset').click(); node('undo').click();
  assert.equal(node('cuts').children.length, 2);
  offset.value = '12'; offset.dispatchEvent(new Event('change'));
  assert.equal(node('play').disabled, true); assert.match(node('status').textContent, /do not overlap/);
  offset.value = '-2'; offset.dispatchEvent(new Event('change'));
  assert.equal(node('play').disabled, false); assert.equal(node('video-b').currentTime - node('video-a').currentTime, 2);
  upload('b'); await settle(); assert.equal(revoked.length, 1); assert.equal(node('cuts').children.length, 1);
  assert.deepEqual(fetched, []);
  instance.destroy(); assert.equal(new Set(revoked).size, 3);
});

test('successful demo sync seeds two editable cuts; weak demo sync offers manual alignment', async () => {
  const original = globalThis.OfflineAudioContext;
  const rate = 8000, pcm = new Float32Array(rate * 10);
  let state = 45913;
  for (let sample = 0; sample < pcm.length;) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const width = 50 + state % 550;
    for (let n = 0; n < width && sample + n < pcm.length; n++)
      pcm[sample + n] = Math.sin(n * (.03 + (state % 159) / 130)) * Math.exp(-n / width);
    sample += width + 200 + state % 1900;
  }
  let silent = false;
  globalThis.OfflineAudioContext = class {
    async decodeAudioData() {
      return {numberOfChannels:1, sampleRate:rate, getChannelData:() => silent ? new Float32Array(pcm.length) : pcm};
    }
  };
  try {
    for (silent of [false, true]) {
      const {node, fetched, instance} = editor();
      node('sample').click(); await settle(); await settle();
      assert.deepEqual(fetched, ['/assets/multicam/angle-a.mp4','/assets/multicam/angle-b.mp4']);
      assert.equal(node('cuts').children.length, silent ? 1 : 3);
      if (silent) assert.match(node('sync-status').textContent, /manually/);
      else {
        assert.match(node('status').textContent, /preview two cuts/);
        assert.match(node('cuts').children[1].children[0].textContent, /0:03.40 · Camera B/);
        node('undo').click(); assert.equal(node('cuts').children.length, 2);
        node('reset').click(); assert.equal(node('cuts').children.length, 1);
      }
      instance.destroy();
    }
  } finally {
    if (original === undefined) delete globalThis.OfflineAudioContext; else globalThis.OfflineAudioContext = original;
  }
});

function exportEnvironment({failMp4 = false, abortAfterFrame} = {}) {
  const body = new El(), document = new El(), draws = [], tracks = [], audioInputs = [], recordings = [];
  const videos = body.children;
  const track = kind => { const item = {kind, stop() { this.stopped = true; }}; tracks.push(item); return item; };
  class Stream {
    constructor(tracks) { this.tracks = tracks; }
    getAudioTracks() { return this.tracks.filter(t => t.kind === 'audio'); }
    getVideoTracks() { return this.tracks.filter(t => t.kind === 'video'); }
    getTracks() { return this.tracks; }
  }
  class Canvas {
    captureStream() { return new Stream([track('video')]); }
    getContext() { return {drawImage:(video, ...rect) => draws.push({src:video.src, rect})}; }
  }
  document.body = body;
  document.createElement = tag => tag === 'canvas' ? new Canvas() : new El();
  let closed = false;
  class Audio {
    async resume() {}
    createMediaElementSource(el) { audioInputs.push(el); return {connect(){}, disconnect(){}}; }
    createMediaStreamDestination() { return {stream:new Stream([track('audio')]), disconnect(){}}; }
    async close() { closed = true; }
  }
  class Recorder {
    static isTypeSupported() { return true; }
    constructor(stream, {mimeType}) { Object.assign(this, {stream, mimeType, state:'inactive'}); recordings.push(this); }
    start() {
      if (failMp4 && this.mimeType.startsWith('video/mp4')) throw new Error('MP4 encoder unavailable');
      this.state = 'recording';
    }
    stop() {
      this.state = 'inactive';
      this.ondataavailable?.({data:new Blob(['recorded'], {type:this.mimeType})});
      this.onstop?.();
    }
  }
  const env = {document, MediaRecorder:Recorder, MediaStream:Stream, AudioContext:Audio, HTMLCanvasElement:Canvas,
    requestAnimationFrame(fn) {
      return setImmediate(() => { for (const el of videos) if (!el.paused) el.currentTime += .25; abortAfterFrame?.(); fn(); });
    },
    cancelAnimationFrame:clearImmediate,
  };
  return {env, draws, tracks, audioInputs, videos, recordings, closed:() => closed};
}

const config = {sources:{A:'blob:a',B:'blob:b'}, offset:1, start:2, duration:1, cuts:[{at:2.5,angle:'B'}], format:'portrait'};
test('export renders actual A/B cuts, crops to the selected frame, and uses only camera A audio', async () => {
  const f = exportEnvironment();
  const output = await recordEdit(config, f.env);
  assert.equal(output.extension, 'mp4');
  assert.ok(output.blob.type.startsWith('video/mp4'));
  assert.deepEqual([...new Set(f.draws.map(d => d.src))], ['blob:a','blob:b']);
  assert.deepEqual(f.draws[0].rect.slice(-2), [720,1280]);
  assert.deepEqual(f.audioInputs, [f.videos[0]]);
  assert.equal(f.recordings[0].stream.getTracks().length, 2);
  assert.ok(f.closed() && f.tracks.every(t=>t.stopped) && f.videos.every(v=>v.removed && v.paused));
  const fallback = exportEnvironment({failMp4:true});
  const webm = await recordEdit({...config, format:'landscape'}, fallback.env);
  assert.equal(webm.extension, 'webm'); assert.match(webm.blob.type, /^video\/webm/);
  assert.deepEqual(fallback.draws[0].rect.slice(-2), [1280,720]);
});

test('export cancellation stops recording, frees tracks and audio, and never creates an incomplete download', async () => {
  const controller = new AbortController();
  const f = exportEnvironment({abortAfterFrame:() => controller.abort()});
  await assert.rejects(recordEdit({...config, signal:controller.signal}, f.env), {name:'AbortError'});
  assert.equal(f.closed(), true); assert.ok(f.tracks.every(t=>t.stopped));
  assert.ok(f.recordings.every(r=>r.state === 'inactive')); assert.ok(f.videos.every(v=>v.removed));
  await assert.rejects(recordEdit({...config, duration:40}, f.env), /30 seconds/);
  assert.equal(extensionFor('VIDEO/MP4;codecs=avc1'), 'mp4');
  assert.throws(() => extensionFor('application/octet-stream'));
  assert.deepEqual(exportSize('landscape'), {width:1280,height:720});
  assert.deepEqual(coverRect(1600,900,1280,720), {x:0,y:0,width:1600,height:900});
});
