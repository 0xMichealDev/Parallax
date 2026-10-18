/* Explicit sharing only. No analytics, wallet requests or publishing calls. */
(()=>{'use strict';
 for (const root of document.querySelectorAll('[data-story-share]')) {
  const button=root.querySelector('[data-copy-story]'),status=root.querySelector('[role="status"]'),fallback=root.querySelector('.universe-share-fallback');
  if (!button||!status||!fallback) continue;
  const link=button.dataset.copyStory;
  if (!/^https:\/\/parallaxlaunch\.live\/universe\/[0-9]{3}-[a-z0-9-]+$/.test(link||'')) continue;
  button.hidden=false;
  button.addEventListener('click',async()=>{
   try {await navigator.clipboard.writeText(link);status.textContent='Story link copied.';fallback.hidden=true;}
   catch {fallback.hidden=false;const input=fallback.querySelector('input');input.value=link;input.focus();input.select();status.textContent='Select and copy the story link above.';}
  });
 }
})();
