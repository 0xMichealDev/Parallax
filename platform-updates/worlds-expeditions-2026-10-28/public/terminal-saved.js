(() => {
  'use strict';
  const terminal = window.ParallaxTerminal, request = window.ParallaxResearch?.request;
  const $ = id => document.getElementById(id);
  if (!terminal || !request || !$('terminal-saved-list')) return;
  const valid = value => typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const short = value => value.slice(0,5) + '…' + value.slice(-5);
  const date = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString(undefined, {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'Time unavailable';
  const api = (action, body) => request('/api/control/' + action, body);
  const pendingReports = new Map();
  let projects = [], state = 'loading', active = true, epoch = 0, saving = false, saveEpoch = 0;

  function status(message, error = false) {
    $('terminal-saved-status').textContent = message;
    $('terminal-saved-status').classList.toggle('error', error);
  }
  function controls() {
    const selected = terminal.getSelection(), followed = projects.some(p => p.address === selected.mint);
    const signin = '/signin-with-chatgpt?return_to=' + encodeURIComponent('/terminal' + (valid(selected.mint) ? '?token=' + selected.mint : ''));
    $('terminal-saved-signin').href = signin;
    $('terminal-follow-signin').href = signin;
    $('terminal-follow-signin').hidden = state !== 'guest';
    $('terminal-follow-manage').hidden = !followed || state !== 'ready';
    $('terminal-saved-refresh').disabled = state === 'loading' || saving;
    $('terminal-saved-refresh').hidden = state === 'guest';
    $('terminal-saved-list').setAttribute('aria-busy', String(state === 'loading'));
    $('terminal-follow').disabled = state !== 'ready' || saving || !selected.ready || !valid(selected.mint) || followed || projects.length >= 20;
    $('terminal-follow').textContent = saving ? 'Saving project…' : followed ? 'Following ✓' : pendingReports.has(selected.mint) ? 'Retry following' : 'Save & follow';
    $('terminal-follow-help').textContent = state === 'guest' ? 'Sign in to keep this project in your private research workspace. No wallet connection needed.'
      : followed ? 'Saved to your account. Your original baseline stays fixed; review new snapshots in Saved Projects or Your Briefing.'
      : projects.length >= 20 ? 'You follow 20 projects. Manage your list to make room for another.'
      : pendingReports.has(selected.mint) ? 'Your Passport was saved. Retry following to use that same baseline.'
      : 'Saves a Passport baseline and follows this token. Up to 20 projects; uses your existing 60-Passport daily allowance.';
  }
  function render() {
    const selected = terminal.getSelection().mint;
    $('terminal-saved-count').textContent = state === 'ready' ? projects.length + ' / 20' : '';
    $('terminal-saved-gate').hidden = state !== 'guest';
    $('terminal-saved-list').innerHTML = state === 'guest' ? '' : projects.length ? projects.map(p => {
      const changes = p.comparison?.counts?.changed;
      const summary = p.state === 'baseline-only' ? 'Baseline saved' : Number.isSafeInteger(changes) && changes >= 0 ? changes + ' observed ' + (changes === 1 ? 'change' : 'changes') : 'Review saved evidence';
      const before = p.baseline?.id, after = p.latest?.id;
      const compare = p.comparison && typeof before === 'string' && typeof after === 'string' && before !== after;
      const url = compare ? '/control?before=' + encodeURIComponent(before) + '&after=' + encodeURIComponent(after) + '&from=following#compare' : '/following';
      return '<article class="saved-token ' + (selected === p.address ? 'selected' : '') + '"><button type="button" class="saved-token-select" data-saved-token="' + esc(p.address) + '" aria-pressed="' + (selected === p.address) + '" aria-label="Inspect ' + esc(p.name || short(p.address)) + '"><span class="saved-token-picture" data-project-mint="' + esc(p.address) + '"><span>' + esc(String(p.symbol||'T').slice(0,2)) + '</span></span><span class="saved-token-symbol">' + esc(String(p.symbol || 'TOKEN').slice(0,20)) + '<span aria-hidden="true">↗</span></span><strong>' + esc(String(p.name || 'Solana token').slice(0,80)) + '</strong><span class="saved-token-address">' + esc(short(p.address)) + '</span></button><div class="saved-token-context"><span>' + esc(summary) + '</span><span>Snapshot: ' + esc(date(p.latest?.collectedAt)) + (p.latest?.partial ? ' · Partial data' : '') + '</span><a href="' + esc(url) + '">' + (compare ? 'Review changes' : 'Manage baseline') + ' ↗</a></div></article>';
    }).join('') : state === 'ready' ? '<div class="saved-workspace-empty"><div><strong>Keep the projects that matter to you.</strong><p>Inspect a token below, then choose Save &amp; follow to keep its first research baseline.</p></div></div>' : '';
    controls();
  }
  function clearPrivate(nextState = 'loading') {
    epoch++; saveEpoch++; saving = false; projects = []; pendingReports.clear(); state = nextState; render();
  }
  async function load(message = '') {
    if (!active || document.hidden) return false;
    const current = ++epoch; state = 'loading'; controls(); status('Loading your private saved projects…');
    try {
      const data = await api('following');
      if (!active || current !== epoch) return false;
      if (!Array.isArray(data.projects) || data.projects.length > 20 || data.projects.some(p => !p || !valid(p.address))) throw Error('Your saved projects could not be read. Please retry.');
      projects = data.projects; state = 'ready'; render();
      status(message || 'Your account list · Saved observations, not live prices. Select a project to retrieve its current market data.');
      return true;
    } catch (error) {
      if (!active || current !== epoch) return false;
      if (error.status === 401) { clearPrivate('guest'); status('Private to your account · Free to use'); }
      else { state = 'error'; render(); status(error.message || 'Saved projects are unavailable. Please retry.', true); }
      return false;
    }
  }
  async function save() {
    const selected = terminal.getSelection(), address = selected.mint;
    if (state !== 'ready' || saving || !selected.ready || !valid(address) || projects.length >= 20 || projects.some(p => p.address === address)) return;
    const current = epoch, operation = ++saveEpoch; saving = true; controls();
    status(pendingReports.has(address) ? 'Following the project using your saved baseline…' : 'Saving a Passport baseline for ' + short(address) + '…');
    try {
      let report = pendingReports.get(address);
      if (!report) {
        report = await api('passport', {address});
        if (!active || current !== epoch) return;
        if (report.address !== address || typeof report.id !== 'string' || !report.id || report.id.length > 64) throw Error('The saved Passport did not match this token. Open My reports to check it.');
        pendingReports.set(address, {id:report.id, address});
      }
      const result = await api('following/add', {id:report.id});
      if (!active || current !== epoch) return;
      if (result.ok !== true || result.address !== address) throw Error('Following could not be confirmed. Refresh your saved list to check.');
      pendingReports.delete(address);
      await load('Project ' + short(address) + ' is saved. Open it here next time, or review it in Your Briefing.');
    } catch (error) {
      if (!active || current !== epoch) return;
      if (error.status === 401) { clearPrivate('guest'); status('Sign in again to check your saved research.'); }
      else { status((pendingReports.has(address) ? 'Your Passport is saved, but following was not confirmed. Retry uses the same baseline. ' : '') + (error.message || 'Please retry.'), true); }
    } finally {
      if (operation === saveEpoch) { saving = false; controls(); }
    }
  }
  $('terminal-follow').onclick = save;
  $('terminal-saved-refresh').onclick = () => { if (!saving) load(); };
  $('terminal-saved-list').onclick = event => {
    const button = event.target.closest('[data-saved-token]');
    if (state === 'ready' && button && projects.some(p => p.address === button.dataset.savedToken)) terminal.selectToken(button.dataset.savedToken);
  };
  window.addEventListener('parallax:terminal-selection', render);
  // Never put account research into localStorage or restore it from a prior page session.
  window.addEventListener('pagehide', () => { active = false; clearPrivate(); status('Loading your private saved projects…'); });
  window.addEventListener('pageshow', event => { if (event.persisted) { active = true; load(); } });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearPrivate(); status('Loading your private saved projects…'); }
    else if (active) load();
  });
  render(); load();
})();
