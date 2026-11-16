// Positive offset means angle B starts later. At master time t, show B at t - offset.
const framesPerSecond = 50;
const bandCount = 3;
const baselineRadius = 15;
const maxFrames = 60 * framesPerSecond;
const maxInputBytes = 128 * 1024 * 1024;

/** Build compact audio fingerprints on the same 20 ms grid at any input sample rate. */
export function extractAudioFeatures(channels, sampleRate) {
  const front = channels.slice(0, 2);
  if (!Number.isFinite(sampleRate) || sampleRate < 4000 || sampleRate > 384000 ||
      !front.length || front.some(track => !ArrayBuffer.isView(track) || !Number.isInteger(track.length))) {
    throw new TypeError('Unsupported PCM audio.');
  }
  const sampleCount = Math.min(...front.map(track => track.length));
  const frames = Math.min(maxFrames, Math.floor(sampleCount * framesPerSecond / sampleRate));
  const bands = new Float32Array(frames * bandCount);
  const peaks = new Float64Array(bandCount);
  const bass = new Float64Array(front.length), mids = new Float64Array(front.length);
  const bassAlpha = 1 - Math.exp(-2 * Math.PI * 225 / sampleRate);
  const midAlpha = 1 - Math.exp(-2 * Math.PI * 1800 / sampleRate);
  for (let frame = 0; frame < frames; frame++) {
    const start = Math.round(frame * sampleRate / framesPerSecond);
    const end = Math.round((frame + 1) * sampleRate / framesPerSecond);
    const pos = frame * bandCount;
    for (let ch = 0; ch < front.length; ch++) {
      let low = bass[ch], middle = mids[ch], lowPower = 0, midPower = 0, highPower = 0;
      for (let i = start; i < end; i++) {
        const sample = front[ch][i];
        low += bassAlpha * (sample - low);
        middle += midAlpha * (sample - middle);
        lowPower += low * low;
        midPower += (middle - low) ** 2;
        highPower += (sample - middle) ** 2;
      }
      bass[ch] = low; mids[ch] = middle;
      // Combine channel energies, so stereo tracks with inverted polarity don't cancel.
      bands[pos] += lowPower; bands[pos + 1] += midPower; bands[pos + 2] += highPower;
    }
    for (let band = 0; band < bandCount; band++) {
      const rms = Math.sqrt(bands[pos + band] / ((end - start) * front.length));
      bands[pos + band] = rms;
      peaks[band] = Math.max(peaks[band], rms);
    }
  }

  const values = new Float32Array(bands.length);
  const sums = new Float64Array(frames + 1);
  for (let band = 0; band < bandCount; band++) {
    // Relative amplitude and a local baseline tolerate microphone gain differences.
    const floor = Math.max(0.0001, peaks[band] * 0.012);
    for (let i = 0; i < frames; i++) {
      const pos = i * bandCount + band;
      bands[pos] = Math.log(Math.max(bands[pos], floor));
      sums[i + 1] = sums[i] + bands[pos];
    }
    for (let i = baselineRadius; i < frames - baselineRadius; i++) {
      const pos = i * bandCount + band;
      const mean = (sums[i + baselineRadius + 1] - sums[i - baselineRadius]) / (2 * baselineRadius + 1);
      const onset = bands[pos] - bands[pos - bandCount * 2];
      values[pos] = Math.tanh(bands[pos] - mean + 0.5 * onset);
    }
  }
  return {frames, values};
}

/** Decode locally. A supplied context belongs to the caller. decodeAudioData consumes its ArrayBuffer. */
export async function decodeAudioFeatures(arrayBuffer, audioContext) {
  if (!(arrayBuffer instanceof ArrayBuffer) || !arrayBuffer.byteLength || arrayBuffer.byteLength > maxInputBytes) {
    throw new RangeError('Use a local clip up to 128 MiB with a decodable audio track.');
  }
  const OfflineContext = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!audioContext && !OfflineContext) throw new Error('Audio decoding is unavailable in this browser.');
  // The importer should check duration before reading the file. Web Audio decodes
  // the complete container even though only the first minute is fingerprinted.
  const context = audioContext || new OfflineContext(1, 1, 12000);
  const buffer = await context.decodeAudioData(arrayBuffer);
  const channels = Array.from({length: Math.min(2, buffer.numberOfChannels)}, (_, i) => buffer.getChannelData(i));
  return extractAudioFeatures(channels, buffer.sampleRate);
}

function signalEnergy(features) {
  const {frames, values} = features;
  if (!Number.isInteger(frames) || frames < 0 || frames > maxFrames || values?.length !== frames * bandCount) {
    throw new TypeError('Invalid audio features.');
  }
  const energy = new Float64Array(frames + 1);
  for (let i = 0; i < frames; i++) {
    const pos = i * bandCount;
    energy[i + 1] = energy[i] + values[pos] ** 2 + values[pos + 1] ** 2 + values[pos + 2] ** 2;
  }
  return energy;
}

function fallback(reason, overlapSeconds = 0) {
  return {reliable: false, offsetSeconds: null, confidence: 0, overlapSeconds, reason};
}

/** Match independent recordings. Confidence measures match quality, not a probability. */
export function alignAudioFeatures(a, b) {
  const energyA = signalEnergy(a), energyB = signalEnergy(b);
  const shorter = Math.min(a.frames, b.frames);
  const minOverlap = Math.max(2 * framesPerSecond, Math.min(5 * framesPerSecond, Math.ceil(shorter / 4)));
  if (shorter - 2 * baselineRadius < minOverlap) return fallback('insufficient-overlap');
  const minEnergyPerFrame = 0.006;
  if (energyA[a.frames] < minEnergyPerFrame * a.frames || energyB[b.frames] < minEnergyPerFrame * b.frames) {
    return fallback('silent');
  }

  const firstOffset = 2 * baselineRadius + minOverlap - b.frames;
  const lastOffset = a.frames - 2 * baselineRadius - minOverlap;
  const scores = new Float32Array(lastOffset - firstOffset + 1).fill(-1);
  let best = -1, bestOffset = 0, bestLength = 0;
  for (let shift = firstOffset; shift <= lastOffset; shift++) {
    const start = baselineRadius + Math.max(0, shift);
    const end = Math.min(a.frames, b.frames + shift) - baselineRadius;
    const length = end - start;
    const powerA = energyA[end] - energyA[start];
    const powerB = energyB[end - shift] - energyB[start - shift];
    if (Math.min(powerA, powerB) < minEnergyPerFrame * length) continue;
    let dot = 0;
    const delta = shift * bandCount;
    for (let i = start * bandCount; i < end * bandCount; i++) dot += a.values[i] * b.values[i - delta];
    const score = dot / Math.sqrt(powerA * powerB);
    scores[shift - firstOffset] = score;
    if (score > best) { best = score; bestOffset = shift; bestLength = length; }
  }
  const overlapSeconds = bestLength ? (bestLength + 2 * baselineRadius) / framesPerSecond : 0;
  if (best < 0.65) return fallback('weak-match', overlapSeconds);
  // Other peaks within 250 ms belong to the same onset. A strong rival farther
  // away usually means a repeated phrase or beat cannot identify a unique cut.
  let rival = -1;
  for (let i = 0; i < scores.length; i++) {
    if (Math.abs(i + firstOffset - bestOffset) > framesPerSecond / 4) rival = Math.max(rival, scores[i]);
  }
  const gap = best - rival;
  if (gap < 0.09) return fallback('ambiguous', overlapSeconds);
  const confidence = Math.min(1, best) * Math.min(1, gap / 0.22);
  return {reliable: true, offsetSeconds: bestOffset / framesPerSecond, confidence, overlapSeconds, reason: 'aligned'};
}
