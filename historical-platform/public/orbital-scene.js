(()=>{
 const scene=document.querySelector('.orbital-scene'),hero=document.querySelector('.hero');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),fine=matchMedia('(pointer:fine)');
 let frame=0;
 hero.addEventListener('pointermove',e=>{
  if(reduced.matches||!fine.matches||document.body.classList.contains('motion-paused'))return;
  if(frame)return;
  frame=requestAnimationFrame(()=>{const r=hero.getBoundingClientRect();scene.style.setProperty('--orbit-x',`${12+(e.clientY-r.top)/r.height*4-2}deg`);scene.style.setProperty('--orbit-y',`${-8+(e.clientX-r.left)/r.width*6-3}deg`);frame=0;});
 });
 hero.addEventListener('pointerleave',()=>{scene.style.removeProperty('--orbit-x');scene.style.removeProperty('--orbit-y')});
 let visible=true;const sync=()=>scene.classList.toggle('scene-hidden',!visible||document.hidden);
 if('IntersectionObserver'in window)new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()}).observe(hero);
 document.addEventListener('visibilitychange',sync);
 let timer;
 document.addEventListener('parallax:mission-saved',e=>{
  document.querySelector('.mission-arrival')?.remove();clearTimeout(timer);
  const notice=document.createElement('div');notice.className='mission-arrival';notice.setAttribute('role','status');notice.textContent=e.detail?.remote?'Mission profile saved · Your world is ready to explore':'Draft saved · Your world is ready to explore';document.body.append(notice);timer=setTimeout(()=>notice.remove(),4500);
 });
})();
