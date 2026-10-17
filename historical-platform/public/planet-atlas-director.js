/* Optional local tour and accessible cinema presentation. Never fetches market or directory data. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),stage=$('atlas-stage-wrap'),dialog=$('atlas-showcase-dialog');if(!stage||!dialog)return;
 const anchor=$('atlas-stage-anchor'),home=anchor.parentNode,media=matchMedia('(prefers-reduced-motion: reduce)'),worlds=solarSystemWorlds;
 let selected='earth',active=false,timer=0,visited=0,visible=true,opener=null,closing=false;
 function clear(){clearTimeout(timer);timer=0;$('tour-progress').style.animation='none'}
 function status(text){$('tour-status').textContent=text}
 function ready(){return visible&&!document.hidden&&!$('atlas-claim-dialog')?.open}
 function stopTour(message='Tour stopped. Explore at your own pace.'){if(!active)return;active=false;clear();$('atlas-tour').textContent='Start guided tour ▷';$('atlas-tour').setAttribute('aria-pressed','false');status(message)}
 function schedule(){clear();if(!active)return;if(!ready()){status('Tour paused while the atlas is out of view.');return}status('Guided tour · '+visited+' of 11 · next world in 12 seconds');if(!media.matches){void $('tour-progress').offsetWidth;$('tour-progress').style.animation='atlas-tour-progress 12s linear forwards'}timer=setTimeout(()=>{timer=0;if(!active||!ready()){schedule();return}if(visited>=worlds.length){stopTour('Tour complete. Choose your next orbit.');return}visited++;const next=worlds[(worlds.findIndex(w=>w.id===selected)+1)%worlds.length];window.dispatchEvent(new CustomEvent('parallax:atlas-select',{detail:{id:next.id,source:'tour'}}));schedule()},12000)}
 function startTour(){if(active){stopTour();return}active=true;visited=1;window.ParallaxAtlasScene?.setView('closeup');$('atlas-tour').textContent='Stop guided tour Ⅱ';$('atlas-tour').setAttribute('aria-pressed','true');schedule()}
 function openShowcase(){if(dialog.open)return;opener=document.activeElement;$('atlas-showcase-slot').append(stage);dialog.showModal();document.body.classList.add('atlas-showcase-active');$('atlas-showcase-open').hidden=true;window.ParallaxAtlasScene?.setView('closeup');visible=true;window.ParallaxAtlasScene?.resize();$('atlas-showcase-close').focus();schedule()}
 function restore(){if(closing||stage.parentNode===home)return;closing=true;stopTour();home.insertBefore(stage,anchor);document.body.classList.remove('atlas-showcase-active');$('atlas-showcase-open').hidden=false;window.ParallaxAtlasScene?.resize();if(opener?.isConnected)opener.focus({preventScroll:true});closing=false}
 function closeShowcase(){if(dialog.open){dialog.close();restore()}}
 function browse(){stopTour();closeShowcase();window.dispatchEvent(new CustomEvent('parallax:atlas-browse',{detail:selected}))}
 $('atlas-showcase-open').onclick=openShowcase;$('atlas-showcase-close').onclick=closeShowcase;dialog.addEventListener('close',restore);$('atlas-tour').onclick=startTour;$('tour-browse').onclick=browse;
 $('showcase-claim').onclick=()=>{stopTour();closeShowcase();$('claim-selected').click()};
 window.addEventListener('parallax:atlas-destination',e=>{const p=worlds.find(w=>w.id===e.detail?.id);if(!p)return;selected=p.id;$('tour-chapter').textContent=String(worlds.indexOf(p)+1).padStart(2,'0')+' / 11 · '+p.name.toUpperCase()+' · '+p.kind.toUpperCase();$('tour-description').textContent=e.detail.description||'';$('tour-browse').textContent='Projects on '+p.name+' ↗';$('showcase-claim').textContent='Claim a spot on '+p.name+' ↗';if(e.detail.source!=='tour')stopTour()});
 window.addEventListener('parallax:atlas-camera-interaction',()=>stopTour('Tour stopped so you can explore this world.'));
 window.addEventListener('parallax:atlas-claim-open',()=>{stopTour();closeShowcase()});
 document.addEventListener('visibilitychange',schedule);window.addEventListener('pagehide',()=>{clear();stopTour()});media.addEventListener('change',schedule);
 if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule()},{rootMargin:'60px'}).observe(stage);
 window.addEventListener('parallax:atlas-mode',e=>{if(e.detail!=='solar'){stopTour();closeShowcase()}});
 window.ParallaxAtlasDirector={openShowcase,closeShowcase,stopTour};
})();
