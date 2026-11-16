(() => {
  'use strict';
  const directory = document.getElementById('tools');
  function revealDirectory() {
    if (location.hash === '#tools' && directory) directory.open = true;
    if (['#summit', '#platform-update', '#whats-new'].includes(location.hash)) {
      location.replace('/?view=dashboard' + location.hash);
    }
    if (location.hash === '#destinations' && directory) {
      directory.open = true;
      directory.scrollIntoView();
    }
  }
  document.querySelectorAll('a[href="#tools"]').forEach(link => link.addEventListener('click', () => {
    if (directory) directory.open = true;
  }));
  window.addEventListener('hashchange', revealDirectory);
  revealDirectory();

  const preview = document.getElementById('project-preview');
  const film = document.getElementById('prlx-demo');
  const productTab = document.getElementById('project-preview-tab');
  const filmTab = document.getElementById('project-film-tab');
  if (!preview || !film || !productTab || !filmTab) return;
  const tabs = [productTab, filmTab];
  const panels = [preview, film];
  const player = film.querySelector('video');
  const navigation = productTab.parentElement;
  const consolePanel = navigation.parentElement;
  navigation.setAttribute('role', 'tablist');

  function selectView(index) {
    for (let i = 0; i < tabs.length; i++) {
      const selected = i === index;
      tabs[i].setAttribute('aria-selected', String(selected));
      tabs[i].tabIndex = selected ? 0 : -1;
      panels[i].hidden = !selected;
    }
    if (index === 0 && player && !player.paused) player.pause();
  }
  function revealViewHash() {
    if (!['#prlx-demo', '#project-preview', '#official-token'].includes(location.hash)) return;
    selectView(location.hash === '#prlx-demo' ? 1 : 0);
    document.getElementById(location.hash.slice(1)).scrollIntoView({block: 'start'});
  }
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].tabIndex = 0;
    tab.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      selectView(index);
    });
    tab.addEventListener('keydown', event => {
      const directions = {ArrowLeft: 1 - index, ArrowRight: 1 - index, Home: 0, End: 1, ' ': index};
      if (!Object.hasOwn(directions, event.key)) return;
      event.preventDefault();
      const next = directions[event.key];
      selectView(next);
      tabs[next].focus();
    });
  });
  consolePanel.dataset.viewsReady = '';
  selectView(location.hash === '#prlx-demo' ? 1 : 0);
  document.querySelector('a[href="#official-token"]')?.addEventListener('click', () => selectView(0));
  window.addEventListener('hashchange', revealViewHash);
})();
