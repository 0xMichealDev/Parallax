/* Read-only homepage discovery. Reuses Terminal's shared cache; never starts a swap. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const root = $('home-market'), form = $('home-token-search'), input = $('home-token-input');
  const valid = value => typeof value === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
  if (form && input) {
    form.noValidate = true;
    form.addEventListener('submit', event => {
      event.preventDefault();
      const token = input.value.trim();
      if (!valid(token)) {
        input.setAttribute('aria-invalid', 'true');
        $('home-token-help').textContent = 'Enter a Solana token contract address, not a ticker or website.';
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      window.location.assign('/terminal?token=' + encodeURIComponent(token));
    });
    input.addEventListener('input', () => {
      input.removeAttribute('aria-invalid');
      $('home-token-help').textContent = 'No wallet needed to research.';
    });
  }
  if (!root) return;

  const list = $('home-market-list'), refresh = $('home-market-refresh');
  const tabs = [...root.querySelectorAll('[data-home-feed]')];
  const snapshots = new Map();
  let mode = 'trending', sequence = 0, loading = false, alive = true;
  let visible = !window.IntersectionObserver, timer = 0, controller = null, cooldownUntil = 0;
  let renderedData, renderedState = '';
  const numeric = n => typeof n === 'number' && Number.isFinite(n);
  const text = (s, max = 60) => typeof s === 'string' ? s.slice(0, max) : '';
  const seconds = (s, fallback = 120) => numeric(s) && s > 0 ? Math.min(86400, Math.max(120, s)) : fallback;
  const time = value => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const short = address => address.slice(0, 4) + '…' + address.slice(-4);
  const usd = (value, compact = false) => {
    if (!numeric(value) || value < 0) return 'Unavailable';
    if (value > 0 && value < 1e-8) return '$' + value.toExponential(2);
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: compact ? 'compact' : 'standard', maximumFractionDigits: compact ? 1 : value >= 1 ? 2 : 9 }).format(value);
  };
  const node = (tag, className, value) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  };
  const canUpdate = () => alive && visible && !document.hidden && !root.closest('[hidden]');
  function card(pool, index) {
    const link = node('a', 'radar-pool');
    const symbol = text(pool.symbol, 20) || 'TOKEN';
    link.href = '/terminal?token=' + encodeURIComponent(pool.mint);
    link.setAttribute('aria-label', 'Research ' + symbol + ', contract ' + pool.mint);
    const top = node('span', 'radar-pool-top'), identity = node('span', 'radar-token');
    const avatar = node('span', 'radar-avatar radar-avatar-' + index, symbol.slice(0, 2).toUpperCase());
    avatar.setAttribute('aria-hidden', 'true');
    const title = node('span', 'radar-token-name');
    title.append(node('strong', '', symbol), node('small', '', short(pool.mint)));
    identity.append(avatar, title);
    const price = node('span', 'radar-price'), change = pool.change24h;
    price.append(node('strong', '', usd(pool.priceUsd)), node('small', numeric(change) ? change < 0 ? 'radar-down' : 'radar-up' : '', numeric(change) ? (change > 0 ? '+' : '') + change.toFixed(2) + '% / 24h' : '24h change unavailable'));
    top.append(identity, price);
    const metrics = node('span', 'radar-pool-metrics');
    for (const [label, value] of [['POOL LIQ', pool.liquidityUsd], ['24H VOL', pool.volume24hUsd]]) {
      const metric = node('span', '', label + ' ');
      metric.append(node('b', '', usd(value, true)));
      metrics.append(metric);
    }
    link.title = text(pool.pair) + ' · ' + text(pool.dex, 40) + ' · Pool ' + pool.address;
    link.append(top, metrics);
    return link;
  }
  function render() {
    const entry = snapshots.get(mode), data = entry?.data, now = Date.now();
    const old = !!data && (!!entry.failed || data.stale === true || now >= Date.parse(data.freshUntil));
    const paused = now < cooldownUntil;
    root.dataset.state = loading ? 'loading' : data ? old ? 'stale' : 'ready' : entry?.failed ? 'unavailable' : 'loading';
    $('home-market-state').textContent = loading ? 'Updating' : data ? old ? 'Older snapshot' : 'Snapshot ready' : entry?.failed ? 'Unavailable' : 'Waiting';
    tabs.forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.homeFeed === mode)));
    list.setAttribute('aria-busy', String(loading));
    refresh.disabled = loading || paused || (entry?.failed === true && now < entry.nextAt);
    refresh.title = loading ? 'Updating Market Radar' : refresh.disabled ? 'Next refresh available after ' + time(Math.max(cooldownUntil, entry?.nextAt || 0)) : 'Check for market updates';
    const status = $('home-market-status');
    status.textContent = loading ? 'Loading ' + (mode === 'new' ? 'new pools' : 'trending pools') + '…' : paused ? 'Refresh paused until ' + time(cooldownUntil) + '.' : old ? 'Refresh delayed. Showing the last available snapshot.' : data ? 'Open a pool’s token to continue your research.' : entry?.failed ? 'Market preview unavailable. The Terminal is still accessible below.' : 'The latest available pool snapshot appears here.';
    const rows = data?.pools.slice(0, 3) || [];
    const rowState = mode + ':' + (data ? 'data' : loading ? 'loading' : 'empty');
    if (renderedData !== data || renderedState !== rowState) {
      const focusedHref = [...list.children].find(child => child === document.activeElement)?.href;
      list.replaceChildren();
      if (rows.length) rows.forEach((pool, i) => list.append(card(pool, i)));
      else list.append(node('p', 'home-market-empty', data ? 'No indexed pools were returned for this feed.' : loading ? 'Fetching pool names, prices, and liquidity…' : 'No market data to display yet.'));
      if (focusedHref) [...list.children].find(child => child.href === focusedHref)?.focus({ preventScroll: true });
      renderedData = data; renderedState = rowState;
    }
    const source = data?.source === 'CoinGecko' ? 'CoinGecko' : data?.source === 'GeckoTerminal' ? 'GeckoTerminal' : 'Market provider';
    $('home-market-freshness').textContent = data ? source + ' · ' + rows.length + ' of ' + data.pools.length + ' pools\nRetrieved ' + time(data.fetchedAt) : 'Snapshot time appears when data is available.';
    $('home-market-note').textContent = mode === 'new' ? 'New pools can contain existing tokens. Preview metrics are pool-specific.' : 'Provider order · Pool-specific metrics. Terminal opens token research.';
  }
  function schedule() {
    clearTimeout(timer); timer = 0;
    if (!canUpdate() || loading) return;
    const entry = snapshots.get(mode), now = Date.now();
    const next = Math.max(cooldownUntil, entry?.nextAt || 0);
    const expiry = Date.parse(entry?.data?.freshUntil);
    // Mark a cached snapshot old when it expires, even if the next read is later.
    const wake = Number.isFinite(expiry) && expiry > now ? Math.min(next, expiry) : next;
    timer = setTimeout(sync, Math.max(1000, Math.min(86400000, wake - now)));
  }
  async function sync() {
    clearTimeout(timer); timer = 0;
    if (!canUpdate() || loading) return;
    const entry = snapshots.get(mode);
    if (Date.now() < Math.max(cooldownUntil, entry?.nextAt || 0)) { render(); schedule(); return; }
    const requested = mode, id = ++sequence, activeController = new AbortController();
    controller = activeController; loading = true; render();
    const timeout = setTimeout(() => activeController.abort(), 18000);
    try {
      const response = await fetch('/api/terminal/discovery?mode=' + requested, { credentials: 'same-origin', cache: 'no-store', signal: activeController.signal });
      let data; try { data = await response.json(); } catch { throw Error('Invalid market response'); }
      if (!alive || id !== sequence || requested !== mode) return;
      if (!response.ok) {
        const raw = response.headers.get('Retry-After');
        const retryHeader = raw && /^\d+$/.test(raw) ? Number(raw) : raw ? Math.ceil((Date.parse(raw) - Date.now()) / 1000) : 0;
        const retry = Math.max(seconds(data?.retryAfterSeconds), seconds(retryHeader));
        if (response.status === 429) cooldownUntil = Date.now() + retry * 1000;
        throw Object.assign(Error('Market request failed'), { retry });
      }
      if (data?.mode !== requested || !Array.isArray(data.pools) || !Number.isFinite(Date.parse(data.fetchedAt)) || !Number.isFinite(Date.parse(data.freshUntil))) throw Error('Invalid market snapshot');
      const seen = new Set();
      data.pools = data.pools.slice(0, 30).filter(pool => {
        if (!pool || !valid(pool.mint) || !valid(pool.address) || seen.has(pool.address)) return false;
        seen.add(pool.address); return true;
      });
      const delay = Math.max(seconds(data.refreshAfterSeconds), data.stale ? seconds(data.retryAfterSeconds) : 120);
      if (data.stale && numeric(data.retryAfterSeconds)) cooldownUntil = Math.max(cooldownUntil, Date.now() + seconds(data.retryAfterSeconds) * 1000);
      snapshots.set(requested, { data, nextAt: Date.now() + delay * 1000, failed: false });
    } catch (error) {
      if (alive && id === sequence && requested === mode) snapshots.set(requested, { data: entry?.data, nextAt: Date.now() + seconds(error.retry) * 1000, failed: true });
    } finally {
      clearTimeout(timeout);
      if (id === sequence) { controller = null; loading = false; render(); schedule(); }
    }
  }
  tabs.forEach(tab => tab.addEventListener('click', () => {
    if (!['trending', 'new'].includes(tab.dataset.homeFeed) || mode === tab.dataset.homeFeed) return;
    sequence++; controller?.abort(); controller = null; loading = false;
    mode = tab.dataset.homeFeed; render(); sync();
  }));
  refresh.addEventListener('click', () => {
    const entry = snapshots.get(mode), now = Date.now();
    if (!loading && entry?.data && !entry.failed && now < entry.nextAt && now >= cooldownUntil) {
      render();
      $('home-market-status').textContent = (entry.data.stale || now >= Date.parse(entry.data.freshUntil) ? 'Older snapshot.' : 'Snapshot is current.') + ' Next update after ' + time(entry.nextAt) + '.';
      return;
    }
    sync();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(timer); timer = 0; } else { render(); sync(); } });
  window.addEventListener('pagehide', () => { alive = false; sequence++; controller?.abort(); controller = null; loading = false; clearTimeout(timer); });
  window.addEventListener('pageshow', () => { alive = true; render(); sync(); });
  if (window.IntersectionObserver) {
    new IntersectionObserver(entries => {
      const entry = entries.find(e => e.target === root);
      if (!entry) return;
      visible = entry.isIntersecting;
      if (visible) { render(); sync(); } else { clearTimeout(timer); timer = 0; }
    }, { threshold: .05 }).observe(root);
  }
  render(); sync();
})();
