/* Navigation only. Membership is always decided by the existing verified access flow. */
(() => {
  'use strict';
  const links = Array.from(document.querySelectorAll('[data-gold-view]'));
  if (!links.length) return;
  function update() {
    const page = document.body.dataset.workspacePage;
    const researchView = document.querySelector('[data-tab][aria-selected="true"]')?.dataset.tab || location.hash.slice(1);
    const selected = page === 'control' ? (researchView === 'wallet' ? 'wallet' : 'snapshots') : page;
    if (page === 'control') {
      const breadcrumb = document.querySelector('.dashboard-breadcrumb span:last-child');
      const labels = {wallet:'Wallet Watch',passport:'Project Passports',compare:'Snapshot comparisons',vault:'Snapshot library',verify:'Verify export'};
      if (breadcrumb) breadcrumb.textContent = labels[researchView] || 'Research workspace';
    }
    for (const link of links) {
      if (link.dataset.goldView === selected) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  }
  const researchTabs = document.querySelector('.tabs[role="tablist"]');
  if (researchTabs) {
    // The existing research controller uses replaceState, which does not emit hashchange.
    new MutationObserver(update).observe(researchTabs, {subtree:true, attributes:true, attributeFilter:['aria-selected']});
  }
  window.addEventListener('hashchange', update);
  update();
})();
