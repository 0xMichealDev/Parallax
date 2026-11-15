(() => {
  'use strict';
  const trigger = document.getElementById('watch-dashboard-tour');
  const dialog = document.getElementById('dashboard-tour');
  if (!trigger || typeof dialog?.showModal !== 'function') return;

  const video = dialog.querySelector('video');
  const error = dialog.querySelector('[data-tour-error]');
  let scrollBeforeTour = 0;
  trigger.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    scrollBeforeTour = window.scrollY;
    dialog.showModal();
    event.preventDefault();
    error.hidden = true;
    if (!video.hasAttribute('src')) video.src = video.dataset.src;
    else if (video.error) video.load();
    // Native controls still allow manual playback when a browser blocks play().
    video.play().catch(() => { if (video.error) error.hidden = false; });
  });
  video.addEventListener('error', () => { error.hidden = false; });
  dialog.querySelector('[data-tour-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    video.pause();
    trigger.focus({ preventScroll: true });
    // Showing a modal can move the sticky chapter even when focus uses preventScroll.
    window.scrollTo({ top: scrollBeforeTour, behavior: 'instant' });
  });
})();
