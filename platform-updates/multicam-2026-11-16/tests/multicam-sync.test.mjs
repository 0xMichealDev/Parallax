import test from 'node:test';
import assert from 'node:assert/strict';
import {alignAudioFeatures, decodeAudioFeatures, extractAudioFeatures} from '../public/multicam-sync.mjs';

function random(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };
}

function performance(seed = 7) {
  const next = random(seed), events = [];
  for (let t = 0.12; t < 38; t += 0.17 + next() * 0.6) {
    events.push({start: t, duration: 0.1 + next() * 0.32, frequency: 170 + 1150 * next(), level: 0.2 + 0.7 * next()});
  }
  return events;
}

function record(events, start, duration, rate, {gain = 1, noise = 0.01, seed = 1} = {}) {
  const pcm = new Float32Array(Math.round(duration * rate)), next = random(seed);
  for (let i = 0; i < pcm.length; i++) pcm[i] = (next() * 2 - 1) * noise;
  for (const event of events) {
    const before = Math.max(0, Math.ceil((event.start - start) * rate));
    const after = Math.min(pcm.length, Math.ceil((event.start + event.duration - start) * rate));
    for (let i = before; i < after; i++) {
      const age = start + i / rate - event.start;
      const env = Math.sin(Math.PI * age / event.duration) ** 2;
      pcm[i] += gain * event.level * env * Math.sin(2 * Math.PI * event.frequency * age);
    }
  }
  return pcm;
}

test('different phone rates, gain, noise and partial overlap produce the signed camera start offset', () => {
  const events = performance();
  const angleA = extractAudioFeatures([record(events, 0.4, 15, 44100)], 44100);
  const later = record(events, 5.83, 14, 48000, {gain: 0.31, noise: 0.007, seed: 8});
  const angleB = extractAudioFeatures([later, later.map(value => -value)], 48000);
  for (const [a, b, offset] of [[angleA, angleB, 5.43], [angleB, angleA, -5.43]]) {
    const result = alignAudioFeatures(a, b);
    assert.equal(result.reliable, true, JSON.stringify(result));
    assert.ok(Math.abs(result.offsetSeconds - offset) <= 0.025);
    assert.ok(Math.abs(result.overlapSeconds - 9.57) < 0.1);
    assert.ok(result.confidence > 0 && result.confidence <= 1);
  }
});

test('silence, flat audio and insufficient recordings do not suggest an offset', () => {
  const silent = extractAudioFeatures([new Float32Array(8000 * 6)], 8000);
  assert.equal(alignAudioFeatures(silent, silent).reason, 'silent');
  const tone = Float32Array.from({length: 8000 * 6}, (_, i) => 0.4 * Math.sin(2 * Math.PI * 500 * i / 8000));
  const flat = extractAudioFeatures([tone], 8000);
  assert.equal(alignAudioFeatures(flat, flat).reliable, false);
  const short = extractAudioFeatures([tone.subarray(0, 8000)], 8000);
  assert.deepEqual(alignAudioFeatures(flat, short), {reliable: false, offsetSeconds: null, confidence: 0, overlapSeconds: 0, reason: 'insufficient-overlap'});
});

test('repeating music has multiple plausible offsets and falls back to manual sync', () => {
  const beats = Array.from({length: 70}, (_, i) => ({start: i / 2, duration: 0.21, frequency: 260, level: 0.7}));
  const a = extractAudioFeatures([record(beats, 0, 12, 12000)], 12000);
  const b = extractAudioFeatures([record(beats, 2.24, 13, 8000, {gain: 0.65, seed: 12})], 8000);
  const result = alignAudioFeatures(a, b);
  assert.equal(result.reason, 'ambiguous'); assert.equal(result.offsetSeconds, null);
});

test('unrelated performances and loud unrelated noise do not manufacture a match', () => {
  const pcm = record(performance(13), 0, 16, 12000);
  const a = extractAudioFeatures([pcm], 12000);
  for (const other of [record(performance(247), 0, 12, 12000), record([], 0, 13, 12000, {noise: 0.8, seed: 9})]) {
    const result = alignAudioFeatures(a, extractAudioFeatures([other], 12000));
    assert.equal(result.reliable, false); assert.equal(result.offsetSeconds, null);
  }
});

test('decoder scans only one minute, supports caller contexts and rejects unreadable clips', async () => {
  const rate = 8000;
  const pcm = record(performance(), 0, 65, rate);
  let calls = 0;
  const context = {async decodeAudioData() { calls++; return {sampleRate: rate, numberOfChannels: 1, getChannelData: () => pcm}; }};
  const features = await decodeAudioFeatures(new ArrayBuffer(12), context);
  assert.equal(features.frames, 3000); assert.equal(features.values.length, 9000);
  assert.equal(calls, 1);
  await assert.rejects(decodeAudioFeatures(new ArrayBuffer(0), context), /local clip/);
  const unsupported = {async decodeAudioData() { throw new Error('No decodable track'); }};
  await assert.rejects(decodeAudioFeatures(new ArrayBuffer(12), unsupported), /No decodable track/);
});
