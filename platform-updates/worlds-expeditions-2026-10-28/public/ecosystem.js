/* Educational showcase. No account, wallet, purchase, or external data requests. */
(() => {
 'use strict';
 const root=document.getElementById('ecosystem');if(!root)return;
 const standalone=root.dataset.standalone==='true';
 const $=id=>document.getElementById(id);
 let worlds;try{worlds=JSON.parse($('ecosystem-data').textContent);}catch{return;}
 if(!Array.isArray(worlds)||!worlds.length)return;
 const find=id=>worlds.find(w=>w.id===id),links=[...root.querySelectorAll('[data-eco-select]')];
 const stage=$('eco-stage'),canvas=$('eco-canvas'),fallback=$('eco-fallback'),motion=$('eco-rotate'),reset=$('eco-reset');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let selected=find(root.dataset.world)||worlds[0],phase=6.4,frameId=0,lastTime=0,visible=false,pageActive=true,failed=false,textureTimer=0,context=null,drag=null,sharing=false,revision=0;
 let playing=!reduced.matches&&!navigator.connection?.saveData;
 const status=text=>{$('eco-status').textContent=text;};
 function communityLinks(world){
  const community=world.showcase==='community-showcase',path='/projects/'+world.id,url=world.shareUrl||'https://parallaxlaunch.live'+path;
  const card=world.shareImage||'/assets/ecosystem/share/'+world.id+'.png',intent=new URL('https://x.com/intent/post');
  intent.searchParams.set('text','A planet imagined for the '+(world.ticker?'$'+world.ticker:world.name)+' community.\n\nExplore '+world.world+' on PARALLAX. What should we add to your world next?');
  intent.searchParams.set('url',url);
  $('eco-community-invite').hidden=!world.shareImage;
  $('eco-share-x').href=world.shareImage?intent.href:'#';$('eco-download-card').href=world.shareImage?card:'#';$('eco-download-card').download='parallax-'+world.id+'-planet.png';
  $('eco-team-link').href=community?path+'#project-wallet':'#';$('eco-team-link').hidden=!community;$('eco-team-note').hidden=!community;
  $('eco-invite-description').textContent='Share '+world.name+'’s world and tell your community what you would add next.';
  if(world.shareImage){$('eco-card-preview').src=card;$('eco-card-preview').alt=world.name+' planet card by PARALLAX';$('eco-card-preview-link').href=card;$('eco-card-preview-link').setAttribute('aria-label','Open '+world.name+' planet card');}
  const paired=find(world.pairedWorld);$('eco-paired-world').hidden=!paired;$('eco-paired-link').href=paired?'/projects/'+paired.id:'#';$('eco-paired-link').textContent=paired?'Explore '+paired.name+' ↗':'';
 }
 const reviewed=date=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T00:00:00Z'));
 const isReady=()=>!failed&&window.ParallaxPlanetRenderer?.ready(selected.design,selected.style);
 const portrait=()=>!!window.ParallaxPlanetRenderer?.isPortrait?.(selected.style);
 const canMove=()=>playing&&!reduced.matches&&visible&&pageActive&&!document.hidden&&!document.querySelector('dialog[open]')&&!failed&&!(drag?.active&&portrait());
 function turn(amount){
  const renderer=window.ParallaxPlanetRenderer;
  phase=portrait()?renderer.portraitPhaseForYaw(renderer.portraitAngle(phase)+amount*.15,phase):phase+amount;
 }
 function stop(){cancelAnimationFrame(frameId);frameId=0;lastTime=0;}
 function graphicsFallback(){failed=true;clearTimeout(textureTimer);textureTimer=0;stage.classList.remove('eco-live');stop();$('eco-graphics').textContent='Illustrated view · enhanced 3D unavailable';$('eco-render-help').textContent='Planet guides and sharing are available in this view.';motion.hidden=true;reset.hidden=true;canvas.tabIndex=-1;}
 function draw(){
  if(failed||!visible||!pageActive||document.hidden)return;
  try{
   const renderer=window.ParallaxPlanetRenderer;if(!renderer){graphicsFallback();return;}
   context ||=canvas.getContext('2d');if(!context){graphicsFallback();return;}
   const bounds=stage.getBoundingClientRect();if(!bounds.width||!bounds.height)return;
   const ratio=Math.min(devicePixelRatio||1,1.4,960/Math.max(bounds.width,bounds.height));
   const w=Math.round(bounds.width*ratio),h=Math.round(bounds.height*ratio);
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   context.clearRect(0,0,w,h);
   if(!renderer.draw(context,w/2,h/2,Math.min(w,h)/4.1,selected.design,phase,selected.style)){graphicsFallback();return;}
   if(renderer.ready(selected.design,selected.style)){clearTimeout(textureTimer);textureTimer=0;stage.classList.add('eco-live');motion.hidden=false;reset.hidden=false;canvas.tabIndex=0;$('eco-graphics').textContent='Rendered concept world · '+selected.world;$('eco-render-help').textContent='Drag horizontally or use ← → to rotate. Scroll normally to explore the page.';}
   else {stage.classList.remove('eco-live');if(!textureTimer)textureTimer=setTimeout(graphicsFallback,15000);}
  }catch{graphicsFallback();}
 }
 function frame(now){frameId=0;if(!canMove())return;
  if(!lastTime||now-lastTime>=80){phase+=lastTime?Math.min((now-lastTime)/1000,.2)*.34:0;lastTime=now;draw();}
  if(canMove()&&isReady())frameId=requestAnimationFrame(frame);
 }
 function reconcile(){
  motion.disabled=reduced.matches;motion.setAttribute('aria-pressed',String(playing&&!reduced.matches));motion.textContent=reduced.matches?'Reduced motion':playing?'Pause rotation':'Resume rotation';
  stop();if(!visible||document.hidden||!pageActive){clearTimeout(textureTimer);textureTimer=0;}draw();if(canMove()&&isReady())frameId=requestAnimationFrame(frame);
 }
 function select(id,{historyMode='none',announce=true}={}){
  const next=find(id);if(!next)return false;
  selected=next;revision++;phase=6.4;drag=null;clearTimeout(textureTimer);textureTimer=0;stage.classList.remove('eco-live','eco-image-error');
  root.dataset.world=next.id;root.style.setProperty('--eco-accent',next.accent);root.style.setProperty('--eco-secondary',next.secondary);stage.style.setProperty('--eco-map',"url('/assets/globe/"+next.map+"')");
  for(const link of links)link.setAttribute('aria-current',String(link.dataset.ecoSelect===next.id));
  for(const [id,value] of [['eco-world-name',next.world],['eco-category',next.category],['eco-name',next.name],['eco-description',next.description]])$(id).textContent=value;
  const facts=$('eco-facts');facts.replaceChildren();for(const fact of next.facts){const row=document.createElement('div'),title=document.createElement('h4'),copy=document.createElement('p');title.textContent=fact.title;copy.textContent=fact.text;row.append(title,copy);facts.append(row);}
  fallback.src=next.image;fallback.alt=next.concept;canvas.setAttribute('aria-label','Rotate the '+next.name+' concept planet using left and right arrow keys or dragging');
  $('eco-official').href=next.url;$('eco-official').textContent='Visit '+next.name+' ↗';$('eco-source').href=next.source;$('eco-source').textContent=next.sourceLabel;$('eco-research').href=next.nextUrl;$('eco-research').textContent=next.nextLabel+' ↗';
  const mint=next.contractAddress||'',community=next.showcase==='community-showcase';
  $('eco-concept-label').textContent=community?'COMMUNITY SHOWCASE':'UNOFFICIAL CONCEPT';$('eco-reviewed').textContent='Reviewed '+reviewed(next.checkedAt);
  $('eco-x').hidden=!next.x;$('eco-x').href=next.x||'#';$('eco-token').hidden=!mint;$('eco-token-address').textContent=mint;$('eco-copy-mint').hidden=!mint||!navigator.clipboard?.writeText;
  $('eco-passport').hidden=!mint;$('eco-passport').href=mint?'/control?mint='+encodeURIComponent(mint)+'#passport':'#';$('eco-explorer').hidden=!mint;$('eco-explorer').href=mint?'https://solscan.io/token/'+mint:'#';
  $('eco-mint-source-row').hidden=!mint;$('eco-mint-source').href=next.mintSource||'#';$('eco-mint-source').textContent=next.mintSourceLabel||'';
  communityLinks(next);
  $('eco-share-fallback').hidden=true;if(announce)status(next.name+' selected. '+next.category+'. '+(community?'Independent PARALLAX community showcase.':'Unofficial PARALLAX concept.'));
  if(historyMode!=='none'){const url=new URL(location.href);url.searchParams.set('ecosystem',next.id);url.hash='ecosystem';try{history[historyMode+'State']({},'',url.pathname+url.search+url.hash);}catch{}}
  reconcile();return true;
 }
 links.forEach((link,index)=>{
  link.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||event.button>0)return;event.preventDefault();select(link.dataset.ecoSelect,{historyMode:'push'});});
  link.addEventListener('keydown',event=>{let i;if(event.key==='ArrowRight')i=(index+1)%links.length;else if(event.key==='ArrowLeft')i=(index+links.length-1)%links.length;else if(event.key==='Home')i=0;else if(event.key==='End')i=links.length-1;else return;event.preventDefault();links[i].focus();select(links[i].dataset.ecoSelect,{historyMode:'replace'});});
 });
 window.addEventListener('popstate',()=>select(standalone?root.dataset.world:new URL(location.href).searchParams.get('ecosystem')||worlds[0].id));
 fallback.addEventListener('error',()=>stage.classList.add('eco-image-error'));fallback.addEventListener('load',()=>stage.classList.remove('eco-image-error'));
 motion.addEventListener('click',()=>{playing=!playing;reconcile();});reset.addEventListener('click',()=>{phase=6.4;draw();});
 canvas.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home'].includes(event.key)||!isReady())return;event.preventDefault();if(event.key==='Home')phase=6.4;else turn(event.key==='ArrowRight'?1:-1);draw();});
 canvas.addEventListener('pointerdown',event=>{if(event.button!==0||!isReady())return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,last:event.clientX,active:false};});
 canvas.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
  if(!drag.active){if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){drag=null;return;}if(Math.abs(dx)<8)return;drag.active=true;canvas.setPointerCapture?.(event.pointerId);if(portrait())stop();}
  turn((event.clientX-drag.last)*.025);drag.last=event.clientX;draw();
 });
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{const resume=drag?.active&&portrait();drag=null;if(resume)reconcile();});
 const copyMint=$('eco-copy-mint');copyMint.hidden=!selected.contractAddress||!navigator.clipboard?.writeText;
 copyMint.addEventListener('click',async()=>{const mint=selected.contractAddress,stamp=revision;if(!mint)return;try{await navigator.clipboard.writeText(mint);if(stamp===revision)status('Solana token address copied.');}catch{if(stamp===revision)status('Select and copy the full token address shown above.');}});
 const share=$('eco-share');share.hidden=false;
 share.addEventListener('click',async()=>{if(sharing)return;sharing=true;share.disabled=true;const current=selected,stamp=revision;
  const url=new URL(current.shareUrl||'/projects/'+current.id,'https://parallaxlaunch.live');
  const manual=()=>{if(stamp!==revision)return;$('eco-share-fallback').hidden=false;$('eco-share-url').value=url.href;$('eco-share-url').focus();$('eco-share-url').select();status('Select and copy this link to share the planet.');};
  const community=current.showcase==='community-showcase';
  try{if(navigator.share){try{await navigator.share({title:current.name+' — PARALLAX '+(community?'community showcase':'ecosystem concept'),text:current.name+', imagined as a planet. '+(community?'An independent community showcase':'An unofficial educational concept')+' by PARALLAX.',url:url.href});if(stamp===revision)status('Planet link shared.');}catch(error){if(error.name!=='AbortError')manual();}}
   else if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(url.href);if(stamp===revision)status('Planet link copied.');}catch{manual();}}else manual();
  }finally{sharing=false;share.disabled=false;}
 });
 document.addEventListener('visibilitychange',reconcile);reduced.addEventListener('change',()=>{if(reduced.matches)playing=false;reconcile();});
 window.addEventListener('resize',draw,{passive:true});window.addEventListener('parallax:planet-texture',reconcile);
 window.addEventListener('pagehide',()=>{pageActive=false;stop();clearTimeout(textureTimer);textureTimer=0;});window.addEventListener('pageshow',()=>{pageActive=true;reconcile();});
 if(window.IntersectionObserver){new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;reconcile();},{threshold:.08}).observe(stage);}
 if(window.MutationObserver)for(const dialog of document.querySelectorAll('dialog'))new MutationObserver(reconcile).observe(dialog,{attributes:true,attributeFilter:['open']});
 communityLinks(selected);reconcile();
})();
