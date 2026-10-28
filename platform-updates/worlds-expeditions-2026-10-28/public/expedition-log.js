/* Cosmetic expedition memories, kept in this browser. No account or network access. */
(() => {
  'use strict';
  if (window.ParallaxExpeditionLogs) return;

  function createLog(world, key, ids) {
    const KEY = key;
    const IDS = Object.freeze([...ids]);
    const listeners = new Set();
    const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
    const empty = () => ({version:1, world, discoveredAt:{}, completedAt:null});
    let record = empty(), storage = null, persistence = 'device', storageIssue = null;

    function validTime(value) {
      if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
      const time = Date.parse(value);
      return Number.isFinite(time) && new Date(time).toISOString() === value;
    }
    function decode(raw) {
      if (raw === null) return {record:empty()};
      if (typeof raw !== 'string' || raw.length > 4096) return {issue:'corrupt'};
      let value;
      try { value = JSON.parse(raw); } catch { return {issue:'corrupt'}; }
      if (!value || typeof value !== 'object' || Array.isArray(value)) return {issue:'corrupt'};
      if (value.version !== 1) return {issue:'unsupported'};
      if (value.world !== world || !value.discoveredAt || typeof value.discoveredAt !== 'object' || Array.isArray(value.discoveredAt)) return {issue:'corrupt'};
      const keys = Object.keys(value.discoveredAt);
      if (keys.some(id => !IDS.includes(id) || !validTime(value.discoveredAt[id]))) return {issue:'corrupt'};
      const next = empty();
      for (const id of IDS) if (own(value.discoveredAt, id)) next.discoveredAt[id] = value.discoveredAt[id];
      if (value.completedAt !== null) {
        if (!validTime(value.completedAt) || keys.length !== IDS.length || keys.some(id => value.discoveredAt[id] > value.completedAt)) return {issue:'corrupt'};
        next.completedAt = value.completedAt;
      }
      return {record:next};
    }
    function visitOnly(issue) { persistence = 'visit'; storageIssue = issue; }
    function merge(first, second) {
      const result = empty();
      for (const id of IDS) {
        const times = [first.discoveredAt[id], second.discoveredAt[id]].filter(Boolean).sort();
        if (times.length) result.discoveredAt[id] = times[0];
      }
      result.completedAt = [first.completedAt, second.completedAt].filter(Boolean).sort()[0] || null;
      return result;
    }
    function snapshot() {
      const discoveries = Object.freeze(IDS.filter(id => own(record.discoveredAt, id)));
      return Object.freeze({
        version:1, world, discoveries,
        discoveredAt:Object.freeze({...record.discoveredAt}),
        completedAt:record.completedAt, claimed:!!record.completedAt,
        readyToClaim:discoveries.length === IDS.length && !record.completedAt,
        count:discoveries.length, total:IDS.length, persistence, storageIssue
      });
    }
    function summary() {
      const value = snapshot();
      return Object.freeze({world:value.world, count:value.count, total:value.total, claimed:value.claimed, completedAt:value.completedAt, persistence:value.persistence, storageIssue:value.storageIssue});
    }
    function fingerprint() { return JSON.stringify([IDS.map(id => record.discoveredAt[id] || null), record.completedAt, persistence, storageIssue]); }
    function publish() {
      const value = snapshot();
      for (const listener of listeners) { try { listener(value); } catch { /* One view must not prevent another updating. */ } }
      try { window.dispatchEvent(new CustomEvent('parallax:expedition-log', {detail:summary()})); } catch { /* The direct subscription remains available. */ }
    }
    function load(replace) {
      if (persistence !== 'device' || !storage) return;
      try {
        const result = decode(storage.getItem(KEY));
        if (result.issue) visitOnly(result.issue);
        else record = replace ? result.record : merge(record, result.record);
      } catch { visitOnly('blocked'); }
    }
    function persist() {
      if (persistence !== 'device' || !storage) return;
      try {
        const encoded = JSON.stringify(record);
        storage.setItem(KEY, encoded);
        if (storage.getItem(KEY) !== encoded) visitOnly('blocked');
      } catch { visitOnly('blocked'); }
    }
    function refresh() {
      const before = fingerprint();
      load(true);
      if (fingerprint() !== before) publish();
      return snapshot();
    }
    function discover(id) {
      if (!IDS.includes(id)) return snapshot();
      const before = fingerprint();
      load(false);
      if (!own(record.discoveredAt, id)) {
        record.discoveredAt[id] = new Date().toISOString();
        persist();
      }
      if (fingerprint() !== before) publish();
      return snapshot();
    }
    function claim() {
      const before = fingerprint();
      load(false);
      if (!record.completedAt && IDS.every(id => own(record.discoveredAt, id))) {
        // Preserve ordering if the device clock moved backwards between interactions.
        record.completedAt = new Date(Math.max(Date.now(), ...IDS.map(id => Date.parse(record.discoveredAt[id])))).toISOString();
        persist();
      }
      if (fingerprint() !== before) publish();
      return snapshot();
    }

    try {
      storage = window.localStorage;
      if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') visitOnly('blocked');
      else load(true);
    } catch { visitOnly('blocked'); }
    const api = Object.freeze({
      read:snapshot, summary, discover, claim, refresh,
      subscribe(listener) {
        if (typeof listener !== 'function') return () => {};
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
    });
    window.addEventListener('storage', event => {
      if ((event.key === KEY || event.key === null) && (!event.storageArea || event.storageArea === storage)) refresh();
    });
    window.addEventListener('pageshow', refresh);
    return api;
  }

  // Retain the legacy Sheeple API and storage format for existing visitors.
  const sheeple = window.ParallaxExpeditionLog || createLog('sheeple', 'parallax:expedition-log:v1', ['flock', 'signal', 'bell']);
  const gatto = createLog('gatto', 'parallax:expedition-log:gatto:v1', ['cats', 'lanterns', 'sardine']);
  window.ParallaxExpeditionLog = sheeple;
  window.ParallaxExpeditionLogs = Object.freeze({sheeple, gatto});
})();
