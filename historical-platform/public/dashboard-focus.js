/* Native disclosures keep the dashboard calm; linked content stays reachable. */
(() => {
 'use strict';
 function reveal(target) {
  if (!target) return;
  for (let parent=target.parentElement;parent;parent=parent.parentElement) {
   if (parent.tagName==='DETAILS') parent.open=true;
  }
 }
 function revealHash() {
  let id;
  try { id=decodeURIComponent(location.hash.slice(1)); } catch { return; }
  if (!id) return;
  const target=document.getElementById(id);
  if (!target) return;
  reveal(target);
  requestAnimationFrame(()=>target.scrollIntoView({behavior:'auto',block:'start'}));
 }
 // Open the comparison before the existing gallery handler scrolls to it.
 document.addEventListener('click',event=>{
  if (event.target.closest('[data-compare-look]')) reveal(document.getElementById('planet-comparison'));
  const link=event.target.closest('a[href^="#"]');
  if(link && link.getAttribute('href')===location.hash) revealHash();
 },true);
 window.addEventListener('hashchange',revealHash);
 revealHash();
})();
