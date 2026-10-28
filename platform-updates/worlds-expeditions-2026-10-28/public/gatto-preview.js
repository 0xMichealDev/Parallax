/* GATTO uses the same curated identity and front-facing artwork in every view. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),canvas=$('gatto-planet'),scene=$('gatto-scene'),art=$('gatto-fallback'),controls=$('gatto-controls'),button=$('gatto-motion'),reset=$('gatto-reset'),notice=$('gatto-graphics');
 if(!canvas||!scene||!art)return;
 let world;try{world=JSON.parse($('gatto-world-data').textContent);}catch{return;}
 const style=world.style,media=matchMedia('(prefers-reduced-motion: reduce)');
 let playing=!media.matches&&!navigator.connection?.saveData,phase=6.4,drag=null,last=0,raf=0,enhanced=false,failed=false,active=true,visible=!window.IntersectionObserver;
 const available=()=>visible&&active&&!document.hidden;
 const canAnimate=()=>available()&&enhanced&&playing&&!media.matches;
 function stop(){cancelAnimationFrame(raf);raf=0;last=0;}
 function updateControls(){controls.hidden=!enhanced;button.disabled=media.matches;button.textContent=media.matches?'Reduced motion':playing?'Pause orbit':'Resume orbit';button.setAttribute('aria-pressed',String(playing&&!media.matches));canvas.tabIndex=enhanced?0:-1;}
 function draw(){
  if(!available())return;
  const ctx=canvas.getContext('2d');if(!ctx){notice.textContent='Illustrated view';return;}
  const w=Math.min(1500,Math.max(700,(canvas.clientWidth||900)*Math.min(devicePixelRatio||1,2))),h=Math.round(w*.75);
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  const cx=w*.5,cy=h*.48,r=h*.265;ctx.clearRect(0,0,w,h);ctx.fillStyle='#07090d';ctx.fillRect(0,0,w,h);
  for(let i=0;i<130;i++){ctx.fillStyle=i%9?'#c4c9ce33':'#d7b36766';ctx.fillRect(i*131.7%w,i*73.3%h,i%9?1:1.5,i%9?1:1.5);}
  window.ParallaxPremiumScene?.background(ctx,w,h,style,phase);
  enhanced=false;
  if(!failed){try{const renderer=window.ParallaxPlanetRenderer;const drawn=renderer?.draw(ctx,cx,cy,r,world.design,phase,style);if(!drawn)failed=true;else enhanced=!!renderer.ready(world.design,style);}catch{failed=true;}}
  let painted=enhanced;
  if(!enhanced&&art.complete&&art.naturalWidth){ctx.drawImage(art,cx-r*2.05,cy-r*2.05,r*4.1,r*4.1);painted=true;}
  if(painted){window.ParallaxPremiumScene?.foreground(ctx,w,h,style,phase,cx,cy,r,{frame:false});scene.classList.add('gatto-ready');}
  else scene.classList.remove('gatto-ready');
  notice.textContent=enhanced?'Drag or use the arrow keys to explore GATTO.':failed?'Illustrated view · enhanced 3D unavailable.':'GATTO · Obsidian Gold';
  updateControls();
 }
 function frame(now){raf=0;if(!canAnimate())return;if(!last||now-last>=80){phase+=last?Math.min((now-last)/1000,.2)*.34:0;last=now;draw();}if(canAnimate())raf=requestAnimationFrame(frame);}
 function reconcile(){stop();draw();updateControls();if(canAnimate())raf=requestAnimationFrame(frame);}
 button.addEventListener('click',()=>{playing=!playing;reconcile();});
 reset.addEventListener('click',()=>{phase=6.4;draw();});
 canvas.addEventListener('keydown',event=>{if(!enhanced||!['ArrowLeft','ArrowRight','Home'].includes(event.key))return;event.preventDefault();phase=event.key==='Home'?6.4:phase+(event.key==='ArrowRight'?1:-1);draw();});
 canvas.addEventListener('pointerdown',event=>{if(event.button!==0||!enhanced)return;drag={id:event.pointerId,x:event.clientX,y:event.clientY,last:event.clientX,active:false};});
 canvas.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(!drag.active){if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){drag=null;return;}if(Math.abs(dx)<8)return;drag.active=true;canvas.setPointerCapture?.(event.pointerId);}phase+=(event.clientX-drag.last)*.025;drag.last=event.clientX;draw();});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>{drag=null;});
 art.addEventListener('load',reconcile);art.addEventListener('error',()=>{if(!enhanced)notice.textContent='The planet artwork could not load. Please reload this page.';});
 media.addEventListener('change',()=>{if(media.matches)playing=false;reconcile();});
 document.addEventListener('visibilitychange',reconcile);window.addEventListener('parallax:planet-texture',reconcile);window.addEventListener('resize',draw,{passive:true});
 window.addEventListener('pagehide',()=>{active=false;stop();});window.addEventListener('pageshow',()=>{active=true;reconcile();});
 if(window.IntersectionObserver)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;reconcile();},{threshold:.05}).observe(scene);
 reconcile();
})();
