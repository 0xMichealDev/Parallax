(() => {
  'use strict';

  function openEarthbound() {
    if (!window.parallaxUniverse?.open) return false;
    const match = new URLSearchParams(location.search).get('bounty') === '1';
    window.parallaxUniverse.open('Earthbound', {walk: match, mode: match ? 'bounty' : 'free'});
    return true;
  }

  function reveal() {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); }
    catch { return; }
    if (id === 'walk-on-earth' && openEarthbound()) return;
    const target = document.getElementById(id);
    const section = target?.closest('#observatory,#creator-kit,#launch-guide,#roadmap,#mission,#our-planet,#dex-boost');
    if (section) {
      section.classList.add('show-legacy');
      target.scrollIntoView();
    }
    if (id === 'market-observatory') location.replace('/markets' + (location.search || '') + '#market-observatory');
  }

  const entry = document.querySelector('.explore-entry');
  if (entry) {
    // Reopen a closed game when its entry link already matches the address bar.
    for (const link of entry.querySelectorAll('[data-earth-entry]')) {
      link.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (link.href === location.href && openEarthbound()) event.preventDefault();
      });
    }
    const film = document.getElementById('after-dark-play');
    const showFilm = entry.querySelector('[data-watch-film]');
    if (film && showFilm) {
      showFilm.hidden = false;
      showFilm.addEventListener('click', () => film.click());
    }
  }

  reveal();
  addEventListener('hashchange', reveal);
  document.addEventListener('parallax:browse-planet', event => location.assign('/planets?planet=' + encodeURIComponent(event.detail)));
  document.addEventListener('parallax:inspect-token', event => location.assign('/markets?address=' + encodeURIComponent(String(event.detail))));
})();
