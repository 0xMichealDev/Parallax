/* Terminal layout controls. No data requests, wallet access, or stored preferences. */
(() => {
  'use strict';

  const main = document.getElementById('terminal-main');
  const workspace = document.querySelector('.terminal-bottom-workspace');
  const tablist = workspace?.querySelector('.terminal-workspace-tabs');
  if (!main || !workspace || !tablist) return;

  const tabs = Array.from(tablist.querySelectorAll('[data-workspace-tab]')).map(button => ({
    button,
    key: button.dataset.workspaceTab,
    panel: document.getElementById(button.getAttribute('aria-controls'))
  }));
  // Keep every panel readable if the markup cannot support the enhancement.
  if (!tabs.length || tabs.some(tab => !tab.panel)) return;

  function selectTab(key, moveFocus = false) {
    const selected = tabs.find(tab => tab.key === key);
    if (!selected) return;
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.button.setAttribute('aria-selected', String(active));
      tab.button.tabIndex = active ? 0 : -1;
      tab.panel.hidden = !active;
    });
    if (moveFocus) selected.button.focus({preventScroll: true});
  }

  tabs.forEach(tab => tab.button.addEventListener('click', () => selectTab(tab.key)));
  tablist.addEventListener('keydown', event => {
    const index = tabs.findIndex(tab => tab.button === event.target);
    if (index === -1) return;
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    selectTab(tabs[next].key, true);
  });

  const focusButton = document.getElementById('terminal-chart-expand');
  const chart = document.getElementById('terminal-chart-panel');
  const market = document.querySelector('.terminal-market-strip');
  const sampleBanner = document.getElementById('desk-demo-banner');
  let focused = false;
  let previousScroll = 0;

  function focusChart(next, restore = true) {
    if (!focusButton || !chart || focused === next) return;
    if (next) previousScroll = window.scrollY;
    focused = next;
    document.body.classList.toggle('terminal-chart-focus', next);
    focusButton.setAttribute('aria-pressed', String(next));
    const label = next ? 'Exit chart focus (Escape)' : 'Focus chart';
    focusButton.setAttribute('aria-label', label);
    focusButton.title = label;
    focusButton.textContent = next ? 'Exit focus ×' : 'Focus chart ⛶';
    if (!next && restore) focusButton.focus({preventScroll: true});
    if (next || restore) {
      const top = next ? 0 : previousScroll;
      requestAnimationFrame(() => {
        if (focused === next) window.scrollTo({top, behavior: 'instant'});
      });
    }
  }

  focusButton?.addEventListener('click', () => focusChart(!focused));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && focused && !event.defaultPrevented && !document.querySelector('dialog[open]')) {
      event.preventDefault();
      focusChart(false);
    }
  });

  function targetFromHash(hash) {
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return null;
    }
  }

  function reveal(target, scroll = false) {
    if (!target || !main.contains(target)) return;
    const focusVisible = chart?.contains(target) || market?.contains(target) || sampleBanner?.contains(target);
    if (focused && !focusVisible) focusChart(false, false);
    const tab = tabs.find(item => item.panel.contains(target));
    if (tab) selectTab(tab.key);
    // A tab can also contain existing source/coverage disclosures.
    for (let parent = target; parent && parent !== main; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
    if (scroll) requestAnimationFrame(() => target.scrollIntoView({block: 'start'}));
  }

  selectTab('position');
  tablist.hidden = false;
  workspace.dataset.workspaceReady = 'true';
  reveal(targetFromHash(location.hash), Boolean(location.hash));

  window.addEventListener('hashchange', () => reveal(targetFromHash(location.hash), true));
  main.addEventListener('click', event => {
    if (event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest('a[href^="#"]');
    if (anchor) reveal(targetFromHash(anchor.getAttribute('href')), true);
  });
  main.addEventListener('focusin', event => reveal(event.target));
  main.addEventListener('invalid', event => reveal(event.target), true);
  window.addEventListener('pagehide', () => focusChart(false, false));
  window.addEventListener('pageshow', () => reveal(targetFromHash(location.hash)));
})();
