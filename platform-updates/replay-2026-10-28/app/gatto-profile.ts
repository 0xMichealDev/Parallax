import gatto from '../public/gatto-world.json';

const escape = (value:string) => value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const external = (label:string, url:string) => `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)} <span aria-hidden="true">↗</span></a>`;

// The project profile and landing welcome share the same source-checked identity.
export function gattoProjectInfo(prefix = 'gatto') {
 return `<div class="gatto-project-info">
  <nav class="gatto-project-links" aria-label="GATTO official links">${external('Website',gatto.url)}${external('X · '+gatto.xLabel,gatto.x)}${external('Token explorer','https://solscan.io/token/'+gatto.contractAddress)}</nav>
  <div class="gatto-contract"><div><span>SOLANA CONTRACT ADDRESS</span><button type="button" data-gatto-copy="${escape(gatto.contractAddress)}" aria-label="Copy GATTO contract address">Copy CA</button></div><code>${escape(gatto.contractAddress)}</code><p data-gatto-copy-status role="status" aria-live="polite"></p></div>
  <nav class="gatto-project-links" aria-label="GATTO research in Parallax"><a href="/replay?mint=${escape(gatto.contractAddress)}">Replay recent activity <span aria-hidden="true">↗</span></a></nav>
  <details class="gatto-project-details"><summary>Project details &amp; on-chain links</summary>
   <dl><div><dt>Built by</dt><dd>${escape(gatto.creatorName)}</dd></div><div><dt>What they’re building</dt><dd>${escape(gatto.buildDescription)}</dd></div><div><dt>City landmark</dt><dd><strong>${escape(gatto.building.name)}</strong> · ${escape(gatto.building.description)} ${external('Official artwork',gatto.building.source)}</dd></div><div><dt>Market</dt><dd>${escape(gatto.marketPair)}</dd></div><div><dt>Public launch wallet</dt><dd>${external(gatto.creatorWallet,'https://solscan.io/account/'+gatto.creatorWallet)}</dd></div></dl>
   <nav class="gatto-project-links gatto-market-links" aria-label="GATTO market pages">${external('DEX Screener',gatto.dexUrl)}${external('Pump.fun',gatto.pumpUrl)}${external('CrypTok chart',gatto.chartUrl)}</nav>
   <p class="gatto-source" id="${escape(prefix)}-source">Project information from ${external('gattocoin.com',gatto.source)} · Checked <time datetime="${gatto.checkedAt}">27 October 2026</time>.</p>
  </details>
 </div>`;
}

export function gattoWelcomeStory() {
 return `<p id="expedition-welcome-introduction">${escape(gatto.description)} Here, the famiglia gathers beside a warm Italian city—nine black cats, one piazza, and a place for you.</p>
 <div class="expedition-welcome-fact"><span class="expedition-eyebrow">A LITTLE ITALIAN CAT LORE</span><p>${escape(gatto.funFact)} ${external('Word origin',gatto.funFactSource)}</p></div>
 <p class="expedition-welcome-joke">“${escape(gatto.joke)}”</p>`;
}
