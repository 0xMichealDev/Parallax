import { validSnapshot, safeSource } from './observatory-core.js?v=137';

const check = document.getElementById('prlx-market-check');
const status = document.getElementById('prlx-market-status');
const facts = document.getElementById('prlx-market-facts');
const mint = document.getElementById('official-ca')?.textContent.trim();
const usd = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 9});
const volume = new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
const percent = new Intl.NumberFormat('en-US', {maximumFractionDigits: 2, signDisplay: 'exceptZero'});
const collected = new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'});

function showSnapshot(snapshot) {
  const market = snapshot.market;
  if (!validSnapshot(snapshot, mint) || !market) return false;
  const metrics = [
    ['Pool price', market.priceUsd, value => usd.format(value)],
    ['24h change', market.change24hPercent, value => percent.format(value) + '%'],
    ['24h pool volume', market.volume24hUsd, value => volume.format(value)],
  ];
  if (!metrics.some(([, value]) => Number.isFinite(value))) return false;

  const list = document.createElement('dl');
  for (const [name, value, format] of metrics) {
    const group = document.createElement('div');
    const label = document.createElement('dt');
    const amount = document.createElement('dd');
    label.textContent = name;
    amount.textContent = Number.isFinite(value) ? format(value) : 'Unavailable';
    group.append(label, amount);
    list.append(group);
  }
  facts.replaceChildren(list);
  const source = snapshot.sources?.find(s => s.id === market.source && s.status === 'retrieved');
  const url = source && safeSource(source.url);
  if (url) {
    const link = document.createElement('a');
    link.href = url;
    link.textContent = 'View pool on DEX Screener';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    facts.append(link);
  }
  facts.hidden = false;
  facts.dataset.collected = collected.format(new Date(snapshot.fetchedAt));
  status.textContent = 'Snapshot collected ' + facts.dataset.collected + '.';
  return true;
}

if (check && facts && status && mint) {
  check.hidden = false;
  check.addEventListener('click', async () => {
    if (check.disabled) return;
    check.disabled = true;
    status.textContent = 'Checking the $PRLX pool…';
    try {
      const response = await fetch('/api/market?address=' + encodeURIComponent(mint), {
        signal: AbortSignal.timeout(18000),
      });
      if (!response.ok || !showSnapshot(await response.json())) throw new Error('No market snapshot');
      check.textContent = 'Refresh market';
    } catch {
      status.textContent = facts.hidden
        ? 'Market data is unavailable. You can retry or continue to Terminal.'
        : 'Refresh unavailable. Showing the snapshot from ' + facts.dataset.collected + '.';
    } finally {
      check.disabled = false;
    }
  });
}
