/* Local-only dashboard navigation. No quotes, wallet access, or background API requests. */
(() => {
  'use strict';
  const dialog = document.getElementById('dashboard-command');
  const input = document.getElementById('dashboard-command-input');
  const close = document.getElementById('dashboard-command-close');
  const status = document.getElementById('dashboard-command-status');
  const directory = dialog?.querySelector('.tool-directory');
  const empty = dialog?.querySelector('.command-empty');
  const links = directory ? [...directory.querySelectorAll('a')] : [];
  const triggers = [...document.querySelectorAll('[data-open-tools]')];
  let opener = null;
  function filter() {
    const terms = input.value.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    let count = 0;
    for (const link of links) {
      const haystack = (link.textContent + ' ' + link.dataset.toolSearch).toLocaleLowerCase();
      link.hidden = !terms.every(term => haystack.includes(term));
      if (!link.hidden) count++;
    }
    directory.querySelectorAll('.tool-category').forEach(category => {
      category.hidden = ![...category.querySelectorAll('a')].some(link => !link.hidden);
    });
    empty.hidden = count !== 0;
    status.textContent = count === 1 ? '1 tool found.' : count + ' tools found.';
    directory.scrollTop = 0;
  }
  function open(source) {
    if (dialog.open || document.querySelector('dialog[open]') || document.body.classList.contains('intro-film-active')) return;
    opener = source || document.activeElement;
    input.value = '';
    filter();
    dialog.showModal();
    // Keep the full directory visible on phones without summoning the keyboard.
    if (window.matchMedia?.('(max-width:900px), (hover:none) and (pointer:coarse) and (max-width:1100px)').matches) close.focus({ preventScroll: true });
    else input.focus({ preventScroll: true });
  }
  if (dialog && input && close && status && directory && empty && typeof dialog.showModal === 'function') {
    triggers.forEach(button => {
      button.hidden = false;
      button.addEventListener('click', event => { event.preventDefault(); open(button); });
    });
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => { if (opener?.isConnected) opener.focus({ preventScroll: true }); });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    input.addEventListener('input', filter);
    dialog.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const visible = links.filter(link => !link.hidden);
      if (!visible.length) return;
      const active = document.activeElement;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (active !== input && !links.includes(active)) return;
        event.preventDefault();
        const index = visible.indexOf(active);
        if (index < 0) visible[event.key === 'ArrowDown' ? 0 : visible.length - 1].focus();
        else if (event.key === 'ArrowUp' && index === 0) input.focus();
        else visible[(index + (event.key === 'ArrowDown' ? 1 : -1) + visible.length) % visible.length].focus();
      } else if (event.key === 'Enter' && active === input) {
        event.preventDefault();
        visible[0].click();
      }
    });
    document.addEventListener('keydown', event => {
      const editing = event.target?.closest?.('input,textarea,select,[contenteditable]');
      if (editing || event.repeat || event.altKey) return;
      if (((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') || (event.key === '/' && !event.metaKey && !event.ctrlKey)) {
        event.preventDefault();
        open(document.activeElement);
      }
    });
  }
  // Keep direct Wallet Watch / walking links in sync with hash navigation.
  function markCurrentDestination() {
    const current = location.pathname + (location.search || '') + location.hash;
    for (const selector of ['.dashboard-sidebar', '.mobile-dock']) {
      const nav = document.querySelector(selector);
      if (!nav) continue;
      const items = [...nav.querySelectorAll('a[href]')];
      const exact = items.find(link => link.getAttribute('href') === current)
        || items.find(link => link.getAttribute('href') === location.pathname + location.hash)
        || items.find(link => link.getAttribute('href') === location.pathname)
        || items.filter(link => {
          const href = link.getAttribute('href');
          return href !== '/' && !/[?#]/.test(href) && location.pathname.startsWith(href + '/');
        }).sort((a,b) => b.getAttribute('href').length - a.getAttribute('href').length)[0];
      items.forEach(link => link.removeAttribute('aria-current'));
      // Secondary destinations belong to All tools on the compact mobile dock.
      if (!exact) {
        if (selector === '.mobile-dock') nav.querySelector('[data-open-tools]')?.setAttribute('aria-current', 'page');
        continue;
      }
      exact.setAttribute('aria-current', 'page');
      const group = exact.closest('details');
      if (group) group.open = true;
    }
  }
  markCurrentDestination();
  window.addEventListener('hashchange', markCurrentDestination);
  const group = document.querySelector('.dashboard-filters');
  const controls = group ? [...group.querySelectorAll('[data-tool-filter]')] : [];
  const cards = [...document.querySelectorAll('[data-tool-group]')];
  const filterStatus = document.getElementById('dashboard-filter-status');
  if (group && controls.length && cards.length) {
    group.hidden = false;
    controls.forEach(button => button.addEventListener('click', () => {
      const selected = button.dataset.toolFilter;
      let count = 0;
      controls.forEach(control => control.setAttribute('aria-pressed', String(control === button)));
      cards.forEach(card => { card.hidden = selected !== 'all' && card.dataset.toolGroup !== selected; if (!card.hidden) count++; });
      if (filterStatus) filterStatus.textContent = count + (count === 1 ? ' tool shown.' : ' tools shown.');
    }));
  }
})();
