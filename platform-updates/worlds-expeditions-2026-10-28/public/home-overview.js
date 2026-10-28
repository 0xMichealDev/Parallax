(() => {
  // Real section links remain usable if the interactive explorer cannot start.
  document.querySelectorAll('[data-explore-universe]').forEach(link => {
    if (window.parallaxUniverse?.open) {
      link.setAttribute('aria-haspopup', 'dialog');
      link.setAttribute('aria-controls', 'universe');
    }
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button > 0) return;
      if (!window.parallaxUniverse?.open) return;
      window.parallaxUniverse.open('Earthbound');
      event.preventDefault();
    });
  });
})();
