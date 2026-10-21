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
})();
