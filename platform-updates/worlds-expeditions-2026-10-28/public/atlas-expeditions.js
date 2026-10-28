/* Landable destinations share the Atlas, while keeping separate travel logs. */
(() => {
  'use strict';
  const worlds = Object.freeze({
    '/expeditions/sheeple':{id:'sheeple', project:'curated-sheeple', chip:'expedition-stamp-count'},
    '/expeditions/gatto':{id:'gatto', project:'curated-gatto', chip:'expedition-gatto-stamp-count'}
  });
  const logs = window.ParallaxExpeditionLogs || {};
  const entries = Object.values(worlds).map(world => ({
    chip:document.getElementById(world.chip),
    log:logs[world.id] || (world.id === 'sheeple' ? window.ParallaxExpeditionLog : null)
  }));
  const refresh = entry => {
    if (!entry.chip || !entry.log) return;
    const state = entry.log.summary();
    entry.chip.textContent = state.claimed ? '1 discovery stamp' : state.count ? state.count + ' / ' + state.total + ' discoveries' : '0 stamps';
    entry.chip.title = state.persistence === 'device' ? 'Saved on this device' : 'Available for this visit';
  };
  for (const entry of entries) {
    refresh(entry);
    entry.log?.subscribe(() => refresh(entry));
  }
  window.addEventListener('pageshow', () => {
    for (const entry of entries) { entry.log?.refresh(); refresh(entry); }
  });
  let departure = null;
  const stage = document.getElementById('universe-stage');
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[data-expedition-land]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === '_blank') return;
    const destination = new URL(link.href, location.href);
    const world = worlds[destination.pathname];
    if (destination.origin !== location.origin || !world) return;
    if (!stage || stage.hidden || !window.ParallaxCommunityScene?.available || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!document.querySelector('[data-universe-project="' + world.project + '"]')) return;
    event.preventDefault();
    if (departure) return;
    const profile = document.getElementById('universe-profile-dialog');
    if (profile?.open) profile.close();
    window.dispatchEvent(new CustomEvent('parallax:community-select', {detail: {id:world.project,fly:true}}));
    stage.dataset.expeditionDeparture = world.id;
    stage.classList.add('universe-departing');
    departure = setTimeout(() => {
      departure = null;
      location.assign(destination.pathname + destination.search);
    }, 750);
  });
  const clearDeparture = () => {
    clearTimeout(departure); departure = null;
    if (stage) { stage.classList.remove('universe-departing'); delete stage.dataset.expeditionDeparture; }
  };
  window.addEventListener('pagehide', clearDeparture);
  window.addEventListener('pageshow', clearDeparture);
})();
