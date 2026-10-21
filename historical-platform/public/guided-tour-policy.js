(function (root) {
  'use strict';
  const IDLE_MS = 60000;
  function eligible(s) {
    return s.enabled && !s.seen && !s.hidden && s.focused && s.nearTop &&
      !s.editing && !s.modal && !s.reduced && !s.motionPaused && !s.mediaPlaying;
  }
  function caption(text, elapsed, duration) {
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
    const total = sentences.reduce((sum, sentence) => sum + sentence.length, 0);
    let end = 0;
    for (const sentence of sentences) {
      end += sentence.length / total * duration;
      if (elapsed < end) return sentence.trim();
    }
    return sentences[sentences.length - 1].trim();
  }
  const api = {IDLE_MS, eligible, caption};
  if (typeof module !== 'undefined') module.exports = api;
  root.ParallaxTourPolicy = api;
})(typeof window !== 'undefined' ? window : globalThis);
