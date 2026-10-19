/* Navigation enhancement only: no storage, wallet calls, or API requests. */
(() => {
  'use strict';
  const main = document.querySelector('main');
  if (!main) return;
  const compact = window.matchMedia('(max-width:760px)');
  document.querySelectorAll('[data-mobile-disclosure]').forEach(section => {
    if (compact.matches) section.open = false;
  });
  function reveal(target) {
    let parent = target?.parentElement;
    while (parent) {
      if (parent.tagName === 'DETAILS') parent.open = true;
      parent = parent.parentElement;
    }
  }
  function revealHash() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    if (!id) return;
    const target = document.getElementById(id);
    if (!target) return;
    const collapsed = target.closest('details:not([open])');
    reveal(target);
    if (collapsed) requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
  }
  revealHash();
  window.addEventListener('hashchange', revealHash);
  // Native validation must never try to focus a field inside a closed section.
  main.addEventListener('invalid', event => reveal(event.target), true);
  main.addEventListener('focusin', event => reveal(event.target));
  const sections = {
    terminal:[['#token-search','Find a token'],['.discovery','Market pulse'],['.research-column','Chart & evidence'],['#trade-panel','Swap'],['#wallet-replay','Wallet replay']],
    observatory:[['.obs-start','Follow a token'],['.obs-workspace','Followed tokens'],['#liquidity','Liquidity alerts']],
    markets:[['#market-search','Search tokens'],['.market-columns','Market & on-chain data'],['.chain-research','Detailed evidence']],
    creator:[['.creator-heading','Overview'],['#creator-worlds','My worlds'],['#creator-updates','Publish updates'],['#creator-performance','Performance']],
    following:[['.following-shell','Saved projects'],['#followed-updates','Project updates']],
    briefing:[['.briefing-feed','Latest activity'],['.briefing-refresh-panel','Refresh research']],
    premium:[['.signature-collection','Choose a look'],['#checkout','Upgrade a world'],['#planet-growth','Planet size upgrades'],['#receipts-section','Invoices & receipts'],['#development-fund','Development fund']],
    planets:[['#community-atlas','Explore Atlas'],['.atlas-world-library','World collection'],['#project-directory','Find a project']],
    projects:[['#claim','Create & claim'],['#solana-universe','Explore projects'],['#pilot','Join the pilot'],['.projects-faq','Questions']],
    utility:[['.utility-benefits','PRLX benefits'],['.utility-price','Upgrade pricing'],['#workspace','Project evidence'],['.utility-fund','Development']],
    pro:[['.pro-access','Check eligibility'],['#pro-workspace','My Pro workspace'],['.pro-notices','Recent changes']],
    development:[['.fund-stats','Funding overview'],['.fund-columns','Funding records']],
    solhandle:[['.sh-lookup','Look up a handle'],['.sh-grid','How it works'],['.sh-scope','Ownership & permissions']],
    roadmap:[['#milestones','Release milestones'],['.closing','Start creating']]
  }[document.body.dataset.workspacePage];
  if (!sections) return;
  const entries = sections.map(([selector,label],index) => {
    const target = main.querySelector(selector);
    if (!target) return null;
    if (!target.id) target.id = 'page-section-' + index;
    return {target,label};
  }).filter(Boolean);
  if (entries.length < 2) return;
  const menu = document.createElement('details');
  menu.className = 'page-sections';
  const summary = document.createElement('summary');
  summary.textContent = 'On this page';
  menu.append(summary);
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label','Page sections');
  const links = [];
  entries.forEach(({target,label}) => {
    const link = document.createElement('a');
    link.href = '#' + target.id;
    link.textContent = label;
    link.addEventListener('click', event => {
      event.preventDefault();
      menu.open = false;
      reveal(target);
      if (target.tagName === 'DETAILS') target.open = true;
      requestAnimationFrame(() => {
        target.scrollIntoView({block:'start'});
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex','-1');
        target.focus({preventScroll:true});
      });
    });
    nav.append(link);
    links.push({link,target});
  });
  menu.append(nav);
  // Account-only areas appear in the index when their existing gate opens.
  function updateSections() {
    links.forEach(({link,target}) => {
      const hidden = Boolean(target.closest('[hidden]'));
      if (link.hidden !== hidden) link.hidden = hidden;
    });
    const hidden = links.filter(({link}) => !link.hidden).length < 2;
    if (menu.hidden !== hidden) menu.hidden = hidden;
  }
  main.prepend(menu);
  updateSections();
  const observer = new MutationObserver(updateSections);
  observer.observe(main,{subtree:true,attributes:true,attributeFilter:['hidden']});
})();
