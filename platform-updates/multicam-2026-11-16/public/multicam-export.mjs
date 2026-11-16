export const MAX_CLIP_SECONDS = 30;
const encodings = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4',
  'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm',
];

export function exportSize(format) {
  return format === 'portrait' ? {width: 720, height: 1280} : {width: 1280, height: 720};
}

export function coverRect(width, height, targetWidth, targetHeight) {
  const scale = Math.max(targetWidth / width, targetHeight / height);
  const w = targetWidth / scale, h = targetHeight / scale;
  return {x: (width - w) / 2, y: (height - h) / 2, width: w, height: h};
}

export function angleAt(cuts, time) {
  let angle = 'A';
  for (const cut of cuts) {
    if (cut.at > time + 0.00001) break;
    angle = cut.angle;
  }
  return angle;
}

export function exportSupported(env = globalThis) {
  return Boolean(env.MediaRecorder && env.MediaStream && (env.AudioContext || env.webkitAudioContext)
    && env.HTMLCanvasElement?.prototype.captureStream);
}

export function extensionFor(type) {
  if (type?.toLowerCase().startsWith('video/mp4')) return 'mp4';
  if (type?.toLowerCase().startsWith('video/webm')) return 'webm';
  throw new Error('This browser returned an unrecognized video format.');
}

function abortError() {
  return new DOMException('Export canceled.', 'AbortError');
}

export function waitForMedia(video, events, ready, signal, timeout = 15000) {
  if (signal?.aborted) return Promise.reject(abortError());
  if (video.error) return Promise.reject(new Error('The browser could not decode this video.'));
  if (ready()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const finish = error => {
      clearTimeout(timer);
      for (const event of events) video.removeEventListener(event, onReady);
      video.removeEventListener('error', onError);
      signal?.removeEventListener('abort', onAbort);
      if (error) reject(error); else resolve();
    };
    const onReady = () => { if (ready()) finish(); };
    const onError = () => finish(new Error('The browser could not decode this video.'));
    const onAbort = () => finish(abortError());
    const timer = setTimeout(() => finish(new Error('The video did not become ready in time.')), timeout);
    for (const event of events) video.addEventListener(event, onReady);
    video.addEventListener('error', onError);
    signal?.addEventListener('abort', onAbort, {once: true});
  });
}

async function prepare(video, src, start, signal) {
  video.src = src;
  video.load();
  await waitForMedia(video, ['loadedmetadata'], () => video.readyState >= 1, signal);
  if (Math.abs(video.currentTime - start) > .001) video.currentTime = start;
  await waitForMedia(video, ['seeked', 'loadeddata', 'canplay'], () => !video.seeking && video.readyState >= 2, signal);
}

function startRecorder(stream, Recorder, configure) {
  for (const mimeType of encodings) {
    if (Recorder.isTypeSupported && !Recorder.isTypeSupported(mimeType)) continue;
    let candidate;
    try {
      candidate = new Recorder(stream, {mimeType, videoBitsPerSecond: 4_000_000});
      configure(candidate);
      candidate.start(250);
      return candidate;
    } catch {
      // A reported container may lack an encoder for this particular stream.
      if (candidate) {
        candidate.ondataavailable = candidate.onstop = candidate.onerror = null;
        if (candidate.state !== 'inactive') candidate.stop();
      }
    }
  }
  throw new Error('This browser could not create an MP4 or WebM encoder.');
}

/** Record the rendered picture in real time, with a single uninterrupted camera A audio source. */
export async function recordEdit({sources, offset, start, duration, cuts, format, signal, onProgress}, env = globalThis) {
  if (!exportSupported(env)) throw new Error('This browser can preview the edit. Export requires canvas recording and Web Audio.');
  if (signal?.aborted) throw abortError();
  if (!Number.isFinite(start) || !Number.isFinite(offset) || !Number.isFinite(duration)
      || duration <= 0 || duration > MAX_CLIP_SECONDS + .00001 || start < 0 || start - offset < -.00001)
    throw new Error('Choose a clip of up to 30 seconds inside both videos.');
  const {document} = env;
  if (document.hidden) throw new Error('Keep the editor visible while exporting.');
  const audio = new (env.AudioContext || env.webkitAudioContext)();
  const cancel = new AbortController();
  const forwardAbort = () => cancel.abort();
  const onHide = () => { if (document.hidden) cancel.abort(); };
  signal?.addEventListener('abort', forwardAbort, {once: true});
  document.addEventListener('visibilitychange', onHide);
  const videos = [];
  const streams = [];
  const nodes = [];
  let recorder, frame, watchdog;
  try {
    await audio.resume();
    for (const angle of ['A', 'B']) {
      const video = document.createElement('video');
      videos.push(video);
      video.muted = angle === 'B';
      video.playsInline = true;
      video.preload = 'auto';
      video.tabIndex = -1;
      video.setAttribute('aria-hidden', 'true');
      video.style.cssText = 'position:fixed;bottom:0;right:0;width:1px;height:1px;opacity:0;pointer-events:none';
      document.body.append(video);
    }
    const [a, b] = videos;
    await Promise.all([prepare(a, sources.A, start, cancel.signal), prepare(b, sources.B, Math.max(0, start - offset), cancel.signal)]);
    if (start + duration > a.duration + .01 || start - offset + duration > b.duration + .01)
      throw new Error('The selected clip extends beyond a source video.');
    const canvas = document.createElement('canvas');
    Object.assign(canvas, exportSize(format));
    const ctx = canvas.getContext('2d', {alpha: false});
    if (!ctx) throw new Error('The export canvas is unavailable.');
    const source = audio.createMediaElementSource(a), destination = audio.createMediaStreamDestination();
    nodes.push(source, destination);
    source.connect(destination);
    streams.push(destination.stream);
    function draw(time) {
      const video = angleAt(cuts, time) === 'B' ? b : a;
      const crop = coverRect(video.videoWidth, video.videoHeight, canvas.width, canvas.height);
      ctx.drawImage(video, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
    }
    draw(start);
    const captured = canvas.captureStream(30);
    streams.push(captured);
    const stream = new env.MediaStream([...captured.getVideoTracks(), ...destination.stream.getAudioTracks()]);
    streams.push(stream);
    const chunks = [];
    return await new Promise((resolve, reject) => {
      let complete = false;
      cancel.signal.addEventListener('abort', () => reject(abortError()), {once: true});
      if (cancel.signal.aborted) return reject(abortError());
      recorder = startRecorder(stream, env.MediaRecorder, candidate => {
        candidate.ondataavailable = event => { if (event.data?.size) chunks.push(event.data); };
        candidate.onerror = () => reject(new Error('The browser encoder could not finish this recording.'));
        candidate.onstop = () => {
          if (!complete || !chunks.length) return reject(new Error('The recording ended before the clip was complete.'));
          try {
            const mimeType = chunks[0].type || candidate.mimeType;
            const extension = extensionFor(mimeType);
            resolve({blob: new Blob(chunks, {type: mimeType}), extension});
          } catch (error) { reject(error); }
        };
      });
      for (const video of videos)
        video.addEventListener('error', () => reject(new Error('A source video could not play during export.')), {once: true});
      const end = start + duration;
      let lastClock = start, lastAdvance = Date.now();
      function tick() {
        try {
          const clock = a.currentTime;
          if (clock >= end - .008 || (a.ended && end - clock < .12)) {
            complete = true;
            for (const video of videos) video.pause();
            recorder.stop();
            return;
          }
          if (a.ended || (b.ended && end - clock > .25))
            throw new Error('A source video ended before the chosen clip.');
          if (Math.abs(b.currentTime - (clock - offset)) > .4)
            throw new Error('The videos drifted during export. Close other media and retry.');
          if (clock > lastClock) { lastClock = clock; lastAdvance = Date.now(); }
          if (Date.now() - lastAdvance > 3000) throw new Error('Playback stalled during export. Retry with a shorter clip.');
          draw(clock);
          onProgress?.(Math.min(1, Math.max(0, (clock - start) / duration)));
          frame = env.requestAnimationFrame(tick);
        } catch (error) { reject(error); }
      }
      // Bound stalled play promises, inactive frame callbacks and encoder finalization.
      watchdog = setTimeout(() => reject(new Error('Export timed out. Keep the editor visible and retry.')), (duration + 12) * 1000);
      draw(start);
      Promise.all(videos.map(video => video.play())).then(() => {
        if (recorder.state === 'recording') tick();
      }, reject);
    });
  } finally {
    env.cancelAnimationFrame(frame);
    clearTimeout(watchdog);
    cancel.abort();
    signal?.removeEventListener('abort', forwardAbort);
    document.removeEventListener('visibilitychange', onHide);
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    for (const video of videos) { video.pause(); video.removeAttribute('src'); video.load(); video.remove(); }
    const tracks = new Set(streams.flatMap(stream => stream.getTracks()));
    for (const track of tracks) track.stop();
    for (const node of nodes) node.disconnect();
    await audio.close().catch(() => {});
  }
}
