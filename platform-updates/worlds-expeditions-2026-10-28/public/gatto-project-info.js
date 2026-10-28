/* Copy the source-checked mint; keep the full address visible if clipboard access is unavailable. */
(() => {
 'use strict';
 document.querySelectorAll('[data-gatto-copy]').forEach(button => {
  button.addEventListener('click', async () => {
   const panel = button.closest('.gatto-contract');
   const status = panel?.querySelector('[data-gatto-copy-status]');
   try {
    await navigator.clipboard.writeText(button.dataset.gattoCopy);
    if (status) status.textContent = 'GATTO contract address copied.';
   } catch {
    const code = panel?.querySelector('code');
    if (code && window.getSelection) {
     const range = document.createRange(); range.selectNodeContents(code);
     const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
    }
    if (status) status.textContent = 'Select and copy the full contract address above.';
   }
  });
 });
})();
