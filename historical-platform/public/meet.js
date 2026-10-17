(() => {
 'use strict';
 const ids=['welcome','research','swap','universe','create','connect'];
 const labels=['Overview','Research','Swap','Explore','Create','Your next step'];
 const defaults=['earth','earth','neptune','earth','saturn','earth'];
 const $=id=>document.getElementById(id);
 const sections=ids.map($),links=[...document.querySelectorAll('.chapters a')];
 const canvas=$('meet-planet'),ctx=canvas?.getContext('2d'),renderer=window.ParallaxPlanetRenderer;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let index=0,world='earth',paused=reduced.matches,raf=0,last=0,time=4,visible=true;
 function chooseWorld(id){
  const entry=solarSystemWorlds.find(w=>w.id===id);if(!entry)return;
  world=id;$('meet-world-name').textContent=entry.name;$('meet-world-type').textContent=entry.kind;
  canvas.setAttribute('aria-label',entry.name+' rendered in the PARALLAX planet engine');
  $('meet-atlas-link').href='/planets?planet='+id;
  document.querySelectorAll('[data-world]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.world===id)));
  $('meet-fallback').style.backgroundImage="linear-gradient(110deg,#0000 25%,#02060c99),url('/assets/globe/"+entry.map+"')";
  draw();
 }
 function renderChapter(focus=false){
  let hash;try{hash=decodeURIComponent(location.hash.slice(1))}catch{hash='welcome'}
  const found=ids.indexOf(hash);index=found<0?0:found;
  sections.forEach((s,i)=>{s.hidden=i!==index});
  links.forEach((a,i)=>{if(i===index)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current')});
  $('meet-count').textContent=String(index+1).padStart(2,'0')+' / 06';$('meet-label').textContent=labels[index];
  $('meet-progress').style.width=((index+1)/ids.length*100)+'%';$('meet-prev').disabled=index===0;
  $('meet-next').innerHTML=index===ids.length-1?'Back to overview <span aria-hidden="true">↺</span>':'Next chapter <span aria-hidden="true">→</span>';
  $('meet-status').textContent='Chapter '+(index+1)+' of 6: '+labels[index];
  chooseWorld(defaults[index]);
  if(focus){sections[index].querySelector('h1').focus({preventScroll:true});if(matchMedia('(max-width: 700px)').matches)$('main').scrollIntoView({block:'start',behavior:'instant'})}
 }
 function go(i){location.hash=ids[(i+ids.length)%ids.length]}
 $('meet-prev').onclick=()=>{if(index>0)go(index-1)};$('meet-next').onclick=()=>go(index+1);
 document.querySelector('.step-controls').hidden=false;
 addEventListener('hashchange',()=>renderChapter(true));
 document.addEventListener('keydown',e=>{
  if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||e.shiftKey||e.target.closest('input,textarea,select,[contenteditable],button,a'))return;
  if(e.key==='ArrowRight'){e.preventDefault();go(index+1)}
  if(e.key==='ArrowLeft'&&index>0){e.preventDefault();go(index-1)}
 });
 document.querySelectorAll('[data-world]').forEach(b=>b.onclick=()=>chooseWorld(b.dataset.world));
 function draw(){
  if(!ctx||!renderer)return;
  const size=Math.min(1200,Math.max(600,Math.round(canvas.clientWidth*Math.min(devicePixelRatio||1,1.5))));
  if(canvas.width!==size){canvas.width=canvas.height=size}
  ctx.setTransform(size/1000,0,0,size/1000,0,0);ctx.clearRect(0,0,1000,1000);ctx.imageSmoothingEnabled=true;
  const ok=renderer.draw(ctx,500,500,world==='saturn'?170:245,'solar-'+world,time,null,{profile:'studio'});
  const ready=ok&&renderer.ready('solar-'+world);
  canvas.style.opacity=ready?'1':'0';$('meet-fallback').hidden=!!ready;
 }
 function tick(now){raf=0;if(paused||document.hidden||!visible)return;if(now-last>=40){time+=Math.min((now-last)/1000,.1);last=now;draw()}raf=requestAnimationFrame(tick)}
 function syncMotion(){cancelAnimationFrame(raf);raf=0;last=performance.now();$('meet-motion').textContent=paused?'Play motion ▷':'Pause motion Ⅱ';$('meet-motion').setAttribute('aria-pressed',String(paused));if(!paused&&!document.hidden&&visible)raf=requestAnimationFrame(tick)}
 if(ctx&&renderer){$('meet-motion').hidden=false;$('meet-motion').onclick=()=>{paused=!paused;syncMotion()};}
 addEventListener('parallax:planet-texture',draw);addEventListener('resize',draw);
 document.addEventListener('visibilitychange',syncMotion);addEventListener('pagehide',()=>cancelAnimationFrame(raf));addEventListener('pageshow',syncMotion);
 reduced.addEventListener('change',()=>{paused=reduced.matches;syncMotion();draw()});
 if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;syncMotion()},{threshold:0}).observe(canvas);
 const frame=$('presentation'),full=$('meet-fullscreen');
 if(document.fullscreenEnabled&&frame.requestFullscreen){full.hidden=false;full.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await frame.requestFullscreen()}catch{$('meet-status').textContent='Fullscreen is unavailable. You can continue in this view.'}};document.addEventListener('fullscreenchange',()=>{full.textContent=document.fullscreenElement?'Exit presentation ⛶':'Present ⛶';draw()})}
 renderChapter();syncMotion();
})();
