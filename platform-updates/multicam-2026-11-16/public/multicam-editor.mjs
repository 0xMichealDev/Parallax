import {decodeAudioFeatures, alignAudioFeatures} from './multicam-sync.mjs';
import {angleAt, exportSupported, MAX_CLIP_SECONDS, recordEdit, waitForMedia} from './multicam-export.mjs';

export function overlapFor(a, b, offset) {
  if (![a, b, offset].every(Number.isFinite) || a <= 0 || b <= 0) return null;
  const start = Math.max(0, offset), end = Math.min(a, b + offset);
  return end > start ? {start, end, duration: end - start} : null;
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export function clipFor(overlap, trim, length) {
  if (!overlap) return null;
  const minLength = Math.min(.1, overlap.duration);
  const start = overlap.start + clamp(trim || 0, 0, overlap.duration - minLength);
  const duration = clamp(length || MAX_CLIP_SECONDS, minLength, Math.min(MAX_CLIP_SECONDS, overlap.end - start));
  return {start, end: start + duration, duration};
}

export function editCut(cuts, at, angle) {
  if (!['A', 'B'].includes(angle) || !Number.isFinite(at) || at < 0) return cuts;
  const next = [...cuts.filter(cut => Math.abs(cut.at - at) > .012), {at, angle}].sort((a, b) => a.at - b.at);
  let previous = 'A';
  return next.filter(cut => {
    if (cut.angle === previous) return false;
    previous = cut.angle;
    return true;
  });
}

export function clockText(seconds) {
  const ticks = Math.max(0, Math.round((seconds || 0) * 100));
  return Math.floor(ticks / 6000) + ':' + String(Math.floor(ticks / 100) % 60).padStart(2, '0')
    + '.' + String(ticks % 100).padStart(2, '0');
}

const numberText = value => String(Math.round(value * 1000) / 1000);
const reasons = {
  silent: 'The clips lack a distinct shared sound.',
  'insufficient-overlap': 'There is too little shared audio.',
  ambiguous: 'Several offsets sound alike.',
  'weak-match': 'The two soundtracks do not match clearly.',
};

export function initEditor(document = globalThis.document, env = globalThis) {
  const get = key => document.getElementById('mc-' + key);
  const video = {A: get('video-a'), B: get('video-b')};
  if (!video.A || !video.B) return;
  const clips = {}, importJobs = {}, features = {};
  const scr = get('scrub'), offsetField = get('offset'), play = get('play');
  const file = {A: get('file-a'), B: get('file-b')};
  const clipStart = get('clip-start'), clipLength = get('clip-length'), format = get('format');
  const downloader = get('download'), cancelButton = get('cancel');
  const status = get('status'), syncStatus = get('sync-status') || status, exportStatus = get('export-status') || status;
  const cleaner = new AbortController(), options = {signal: cleaner.signal};
  let offset = 0, overlap, clip, time = 0, cuts = [], history = [], trim = 0, length = MAX_CLIP_SECONDS;
  let syncVersion = 0, sampleJob, exportJob, renderURL, playing = false, playVersion = 0, frame, activeView;
  let syncing = false, disposed = false;
  video.A.muted = false;
  video.B.muted = true;
  for (const el of Object.values(video)) { el.playsInline = true; el.preload = 'auto'; }
  const canExport = exportSupported(env);
  const listen = (el, name, fn) => el?.addEventListener(name, fn, options);
  function clearDownload() {
    if (renderURL) env.URL.revokeObjectURL(renderURL);
    renderURL = null;
    downloader.hidden = true;
    downloader.removeAttribute('href');
  }
  function invalidateDownload() {
    if (!renderURL) return;
    clearDownload();
    exportStatus.textContent = 'Edit changed. Export again for a new download.';
  }
  function position() {
    const relative = clip ? clamp(time - clip.start, 0, clip.duration) : 0;
    const angle = clip ? angleAt(cuts, time) : clips.A ? 'A' : clips.B ? 'B' : null;
    if (angle !== activeView) {
      activeView = angle;
      video.A.hidden = angle !== 'A';
      video.B.hidden = angle !== 'B';
      get('cut-a').setAttribute('aria-pressed', String(angle === 'A'));
      get('cut-b').setAttribute('aria-pressed', String(angle === 'B'));
      if (get('current-angle')) get('current-angle').textContent = angle ? 'Camera ' + angle : 'Preview';
      if (get('monitor')) get('monitor').dataset.angle = angle || '';
    }
    scr.value = String(relative);
    const label = clockText(relative), durationLabel = clockText(clip?.duration);
    get('clock').textContent = get('duration') ? label : label + ' / ' + durationLabel;
    if (get('duration')) get('duration').textContent = clip ? durationLabel : 'Up to 30 seconds';
    scr.setAttribute('aria-valuetext', label + ' of ' + durationLabel);
  }
  function seekTo(value) {
    if (!clip) return;
    time = clamp(value, clip.start, clip.end);
    video.A.currentTime = Math.min(time, clips.A.duration);
    video.B.currentTime = clamp(time - offset, 0, clips.B.duration);
    position();
  }
  function controls() {
    const busy = Boolean(exportJob);
    for (const el of [play, scr, get('cut-a'), get('cut-b')]) el.disabled = !clip || busy;
    get('sync').disabled = !clips.A || !clips.B || busy || syncing;
    offsetField.disabled = !clips.A || !clips.B || busy;
    if (clipStart) clipStart.disabled = !overlap || busy;
    if (clipLength) clipLength.disabled = !overlap || busy;
    if (format) format.disabled = busy;
    for (const el of [file.A, file.B, get('sample')]) el.disabled = busy;
    get('undo').disabled = !history.length || busy;
    get('reset').disabled = !cuts.length || busy;
    get('export').disabled = !clip || !canExport || busy || syncing || Boolean(sampleJob);
    if (cancelButton) cancelButton.hidden = !busy;
    play.textContent = playing ? 'Pause' : 'Play';
    play.setAttribute('aria-pressed', String(playing));
    if (get('monitor')) get('monitor').dataset.format = format?.value || 'landscape';
  }
  function pause() {
    playVersion++;
    playing = false;
    env.cancelAnimationFrame(frame);
    for (const el of Object.values(video)) el.pause();
    controls();
  }
  function drawCuts() {
    const list = get('cuts');
    list.replaceChildren();
    if (!clip) return;
    const entries = [{at: clip.start, angle: angleAt(cuts, clip.start)}, ...cuts.filter(cut => cut.at > clip.start + .00001 && cut.at < clip.end)];
    for (const cut of entries) {
      const li = document.createElement('li'), button = document.createElement('button');
      button.type = 'button';
      button.textContent = clockText(cut.at - clip.start) + ' · Camera ' + cut.angle;
      button.addEventListener('click', () => { if (!exportJob) { pause(); seekTo(cut.at); } });
      li.append(button);
      list.append(li);
    }
  }
  function recompute() {
    pause();
    overlap = overlapFor(clips.A?.duration, clips.B?.duration, offset);
    clip = clipFor(overlap, trim, length);
    if (clipStart) {
      clipStart.value = numberText(clip ? clip.start - overlap.start : 0);
      clipStart.max = numberText(overlap ? Math.max(0, overlap.duration - .1) : 0);
    }
    if (clipLength) {
      clipLength.value = numberText(clip?.duration || MAX_CLIP_SECONDS);
      clipLength.max = numberText(clip ? Math.min(MAX_CLIP_SECONDS, overlap.end - clip.start) : MAX_CLIP_SECONDS);
    }
    scr.min = '0'; scr.step = '.01'; scr.max = numberText(clip?.duration || 0);
    if (clip) seekTo(clamp(time, clip.start, clip.end)); else { time = 0; position(); }
    if (clips.A && clips.B) status.textContent = clip
      ? 'Both angles are ready. Play the clip and choose where to cut.'
      : 'These angles do not overlap at this offset. Adjust camera B’s start time.';
    drawCuts(); controls();
  }
  function invalidateSync() { syncVersion++; syncing = false; }
  function releaseAngle(angle) {
    importJobs[angle]?.abort();
    delete importJobs[angle];
    const previous = clips[angle];
    delete clips[angle]; delete features[angle];
    video[angle].removeAttribute('src');
    video[angle].load();
    if (previous) env.URL.revokeObjectURL(previous.url);
  }
  async function importAngle(angle, blob, name) {
    if (!blob || disposed) return false;
    invalidateSync(); pause(); invalidateDownload(); releaseAngle(angle);
    history = []; cuts = []; offset = trim = time = 0; length = MAX_CLIP_SECONDS;
    offsetField.value = '0'; syncStatus.textContent = '';
    recompute();
    const job = new AbortController(), url = env.URL.createObjectURL(blob), el = video[angle];
    importJobs[angle] = job;
    const label = get('name-' + angle.toLowerCase());
    if (label) label.textContent = name;
    status.textContent = 'Opening camera ' + angle + '…';
    try {
      el.src = url; el.load();
      await waitForMedia(el, ['loadedmetadata', 'durationchange'], () => el.readyState >= 1 && el.videoWidth > 0, job.signal);
      if (job.signal.aborted) throw new DOMException('Canceled', 'AbortError');
      if (!Number.isFinite(el.duration) || el.duration <= 0) throw new Error('This file has no finite playable video duration.');
      clips[angle] = {blob, url, duration: el.duration};
      status.textContent = 'Camera ' + angle + ' is ready. Add the other angle to edit.';
      recompute();
      return true;
    } catch (error) {
      if (!job.signal.aborted) {
        el.removeAttribute('src'); el.load();
        if (label) label.textContent = 'Choose another file';
        status.textContent = 'Camera ' + angle + ' could not open. Choose a video your browser can play.';
      }
      env.URL.revokeObjectURL(url);
      return false;
    } finally { if (importJobs[angle] === job) delete importJobs[angle]; }
  }
  async function synchronize() {
    if (!clips.A || !clips.B || exportJob || syncing) return;
    const id = ++syncVersion;
    syncing = true; controls(); pause();
    syncStatus.textContent = 'Comparing the sound from both cameras…';
    try {
      for (const angle of ['A', 'B']) {
        if (features[angle]) continue;
        const input = clips[angle];
        if (input.blob.size > 128 * 1024 * 1024)
          throw new Error('This file is too large for automatic audio analysis. Set the offset manually or use a shorter clip.');
        // decodeAudioData expands the entire file even though feature extraction uses its first minute.
        if (input.duration > 600)
          throw new Error('This file is too large for automatic audio analysis. Set the offset manually or use a shorter clip.');
        const data = await input.blob.arrayBuffer();
        if (id !== syncVersion) return;
        const feature = await decodeAudioFeatures(data);
        if (id !== syncVersion) return;
        features[angle] = feature;
      }
      const result = alignAudioFeatures(features.A, features.B);
      if (result.reliable && Number.isFinite(result.offsetSeconds)) {
        invalidateDownload(); offset = result.offsetSeconds;
        offsetField.value = numberText(offset);
        recompute();
        syncStatus.textContent = 'Audio matched. Camera B starts ' + numberText(Math.abs(offset)) + ' s '
          + (offset < 0 ? 'before' : 'after') + ' camera A.';
        return true;
      } else syncStatus.textContent = (reasons[result.reason] || 'Audio sync was inconclusive.') + ' Set the offset manually.';
    } catch (error) {
      if (id === syncVersion) syncStatus.textContent = error.message?.startsWith('This file is too large')
        ? error.message : 'Audio could not be matched. Both videos remain available for manual alignment.';
    } finally { if (id === syncVersion) { syncing = false; controls(); } }
  }
  async function openSample() {
    sampleJob?.abort();
    const job = new AbortController();
    sampleJob = job;
    controls();
    const timeout = setTimeout(() => job.abort(), 25000);
    status.textContent = 'Opening the two sample angles…';
    try {
      const blobs = await Promise.all(['a','b'].map(async angle => {
        const response = await env.fetch('/assets/multicam/angle-' + angle + '.mp4', {signal: job.signal});
        if (!response.ok) throw new Error('Sample unavailable');
        return response.blob();
      }));
      if (job.signal.aborted || disposed) return;
      file.A.value = ''; file.B.value = '';
      const imported = await Promise.all(blobs.map((blob, i) => importAngle(i ? 'B' : 'A', blob, 'Sample · Camera ' + (i ? 'B' : 'A'))));
      if (!job.signal.aborted && imported.every(Boolean) && await synchronize()
          && !job.signal.aborted && clip && !cuts.length && !history.length) {
        const first = editCut([], clip.start + clip.duration * .34, 'B');
        history = [[], first];
        cuts = editCut(first, clip.start + clip.duration * .72, 'A');
        seekTo(clip.start); drawCuts();
        status.textContent = 'Sample synced. Play to preview two cuts, or change them.';
      }
    } catch {
      if (sampleJob === job && !disposed) status.textContent = 'The sample could not load. Try again or choose two local videos.';
    } finally { clearTimeout(timeout); if (sampleJob === job) { sampleJob = null; controls(); } }
  }
  async function togglePlayback() {
    if (playing) { pause(); return; }
    if (!clip || exportJob) return;
    if (time >= clip.end - .025) seekTo(clip.start);
    const id = ++playVersion;
    playing = true; controls();
    function tick() {
      if (id !== playVersion) return;
      time = clamp(video.A.currentTime, clip.start, clip.end);
      if (time >= clip.end - .008 || video.A.ended) { pause(); seekTo(clip.end); return; }
      const target = time - offset;
      if (!video.B.seeking && Math.abs(video.B.currentTime - target) > .12) video.B.currentTime = Math.max(0, target);
      position();
      frame = env.requestAnimationFrame(tick);
    }
    try {
      await Promise.all([video.A.play(), video.B.play()]);
      if (id === playVersion) tick();
    } catch {
      if (id !== playVersion) return;
      pause(); status.textContent = 'Playback was interrupted. Choose Play to try again.';
    }
  }
  function saveCut(angle) {
    if (!clip || exportJob) return;
    const at = playing ? video.A.currentTime : time;
    if (at >= clip.end - .012) { status.textContent = 'Move the playhead inside the clip to add a cut.'; return; }
    const next = editCut(cuts, at, angle);
    if (next.length === cuts.length && next.every((cut, i) => cut.at === cuts[i].at && cut.angle === cuts[i].angle)) return;
    time = at; history.push(cuts); cuts = next; invalidateDownload(); drawCuts(); position(); controls();
  }
  async function doExport() {
    if (!canExport || !clip || exportJob || syncing || sampleJob) return;
    pause(); clearDownload();
    const job = new AbortController(); exportJob = job; controls();
    exportStatus.textContent = 'Preparing the export…';
    let percent = -1;
    try {
      const output = await recordEdit({
        sources: {A: clips.A.url, B: clips.B.url}, offset, start: clip.start, duration: clip.duration,
        cuts, format: format?.value || 'landscape', signal: job.signal,
        onProgress(value) {
          const next = Math.floor(value * 10) * 10;
          if (next !== percent) { percent = next; exportStatus.textContent = 'Exporting ' + percent + '%… Keep this tab visible.'; }
        },
      }, env);
      if (disposed || job.signal.aborted) return;
      renderURL = env.URL.createObjectURL(output.blob);
      downloader.href = renderURL;
      downloader.download = 'parallax-multicam.' + output.extension;
      downloader.textContent = 'Download ' + output.extension.toUpperCase();
      downloader.hidden = false;
      exportStatus.textContent = 'Your ' + output.extension.toUpperCase() + ' is ready to download.';
    } catch (error) {
      if (!disposed) exportStatus.textContent = error.name === 'AbortError' ? 'Export stopped. Keep the tab visible to record again.' : error.message || 'Export failed.';
    } finally { if (exportJob === job) { exportJob = null; controls(); } }
  }
  for (const angle of ['A','B']) {
    listen(file[angle], 'change', () => {
      const selected = file[angle].files?.[0];
      if (!selected) return;
      sampleJob?.abort(); sampleJob = null;
      importAngle(angle, selected, selected.name);
    });
    listen(get('cut-' + angle.toLowerCase()), 'click', () => saveCut(angle));
  }
  listen(get('sample'), 'click', openSample);
  listen(get('sync'), 'click', synchronize);
  listen(play, 'click', togglePlayback);
  listen(scr, 'input', () => { if (clip && !exportJob) { pause(); seekTo(clip.start + Number(scr.value)); } });
  listen(offsetField, 'change', () => {
    const next = offsetField.valueAsNumber;
    if (!Number.isFinite(next)) { offsetField.value = numberText(offset); return; }
    invalidateSync(); invalidateDownload(); offset = next; recompute();
    syncStatus.textContent = 'Manual offset applied.';
  });
  for (const field of [clipStart, clipLength]) listen(field, 'change', () => {
    const next = field.valueAsNumber;
    if (Number.isFinite(next)) { if (field === clipStart) trim = Math.max(0, next); else length = Math.max(.1, next); }
    invalidateDownload(); recompute();
  });
  listen(format, 'change', () => { invalidateDownload(); controls(); });
  listen(get('undo'), 'click', () => {
    if (!history.length || exportJob) return;
    cuts = history.pop(); invalidateDownload(); drawCuts(); position(); controls();
  });
  listen(get('reset'), 'click', () => {
    if (!cuts.length || exportJob) return;
    history.push(cuts); cuts = []; invalidateDownload(); drawCuts(); position(); controls();
  });
  listen(get('export'), 'click', doExport);
  listen(cancelButton, 'click', () => exportJob?.abort());
  listen(document, 'visibilitychange', () => { if (document.hidden) pause(); });
  function destroy() {
    if (disposed) return;
    disposed = true;
    cleaner.abort(); sampleJob?.abort(); invalidateSync(); exportJob?.abort(); pause(); clearDownload();
    releaseAngle('A'); releaseAngle('B');
  }
  listen(env, 'pagehide', event => { if (event.persisted) { pause(); exportJob?.abort(); } else destroy(); });
  if (!canExport) exportStatus.textContent = 'Preview and cuts are available. Use a browser with canvas recording and Web Audio to export.';
  recompute();
  return {destroy};
}

if (typeof document !== 'undefined') initEditor();
