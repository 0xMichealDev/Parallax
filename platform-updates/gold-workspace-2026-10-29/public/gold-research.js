/* Presentation-only enhancements for the Gold research workspace.
 * Filters operate on account rows already rendered by control.js; no requests or writes. */
(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  if (!document.body.classList.contains('gold-research-page')) return;

  const filters = [
    {input: 'research-wallet-filter', list: 'watchlist', row: '.watched-wallet', empty: 'research-wallet-no-match', status: 'research-wallet-filter-status', noun: 'wallet', defaultStatus: ''},
    {input: 'research-report-filter', list: 'reports-list', row: '.saved-row', empty: 'research-report-no-match', status: 'research-report-filter-status', noun: 'snapshot', defaultStatus: 'Your account library'},
  ];
  const setText = (element, text) => { if (element && element.textContent !== text) element.textContent = text; };

  for (const config of filters) {
    const input = byId(config.input), list = byId(config.list), empty = byId(config.empty), status = byId(config.status);
    if (!input || !list || !empty || !status) continue;
    const apply = () => {
      const query = input.value.trim().toLocaleLowerCase();
      const rows = Array.from(list.querySelectorAll(config.row));
      let visible = 0;
      for (const row of rows) {
        const identity = row.querySelector('.saved-row > div:first-child') || row.querySelector(':scope > div:first-child') || row;
        const fields = Array.from(identity.querySelectorAll('strong,.address,[data-solhandle-wallet]'));
        const text = (fields.length ? fields.map(field => field.textContent).join(' ') : identity.textContent).toLocaleLowerCase();
        row.hidden = !!query && !text.includes(query);
        if (!row.hidden) visible++;
      }
      empty.hidden = !rows.length || !query || visible > 0;
      const noun = config.noun + (rows.length === 1 ? '' : 's');
      setText(status, rows.length ? (query ? `${visible} of ${rows.length} ${noun}` : `${rows.length} saved ${noun}`) : config.defaultStatus);
    };
    input.addEventListener('input', apply);
    input.addEventListener('keydown', event => {
      if (event.key === 'Escape' && input.value) {
        event.preventDefault(); input.value = ''; apply();
      }
    });
    document.querySelectorAll(`[data-clear-search="${config.input}"]`).forEach(button => {
      button.addEventListener('click', () => { input.value = ''; apply(); input.focus(); });
    });
    new MutationObserver(apply).observe(list, {childList: true, subtree: true});
    apply();
  }

  const snapshot = byId('wallet-view'), blank = byId('research-wallet-empty');
  if (snapshot && blank) {
    const syncSnapshot = () => { blank.hidden = !snapshot.hidden; };
    new MutationObserver(syncSnapshot).observe(snapshot, {attributes: true, attributeFilter: ['hidden']});
    syncSnapshot();
  }

  const syncTab = () => {
    const current = document.querySelector('[data-tab][aria-selected="true"]')?.dataset.tab || 'passport';
    document.body.dataset.researchView = current;
    const labels = {wallet:'Wallet Watch', passport:'Project Passports', compare:'Snapshot comparisons', vault:'Snapshot library', verify:'Verify export'};
    document.title = `${labels[current] || 'Research workspace'} · PARALLAX`;
  };
  const tabs = document.querySelector('.tabs');
  if (tabs) new MutationObserver(syncTab).observe(tabs, {attributes: true, subtree: true, attributeFilter: ['aria-selected']});
  syncTab();

  document.addEventListener('keydown', event => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || event.defaultPrevented) return;
    if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    const view = document.body.dataset.researchView;
    const input = byId(view === 'wallet' ? 'research-wallet-filter' : view === 'vault' ? 'research-report-filter' : '');
    if (!input || input.closest('[hidden]')) return;
    event.preventDefault(); input.focus();
  });
})();
