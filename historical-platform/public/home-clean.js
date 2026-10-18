(() => {
  'use strict';
  const legacy = new Set(['observatory', 'project-atlas', 'our-planet', 'space-gallery', 'creator-kit', 'launch-guide', 'roadmap', 'mission', 'explore', 'dex-boost']);
  function route() {
    const id = location.hash.slice(1);
    if (id === 'market-observatory') { location.replace('/markets#market-observatory'); return; }
    if (legacy.has(id)) location.replace('/explore#' + id);
  }
  route();
  addEventListener('hashchange', route);
  const button = document.getElementById('copy-ca');
  const address = document.getElementById('official-ca');
  const status = document.getElementById('copy-status');
  if (!button || !address || !status) return;
  button.hidden = false;
  button.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(address.textContent.trim());
      status.textContent = 'Contract address copied.';
    } catch {
      address.focus();
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(address);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      status.textContent = 'Select the address above and copy it manually.';
    }
  });
})();
