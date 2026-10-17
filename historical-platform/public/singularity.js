(()=>{'use strict';
 const $=id=>document.getElementById(id),stage=$('sg-stage'),renderer=window.ParallaxSingularity;if(!stage||!renderer)return;
 const canvas=$('sg-canvas'),ctx=canvas.getContext('2d'),dialog=$('sg-cinema-dialog'),media=matchMedia('(prefers-reduced-motion: reduce)'),params=new URLSearchParams(location.search);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),number=(value,fallback)=>{const n=parseFloat(value);return Number.isFinite(n)?n:fallback};
 let mode=Object.hasOwn(renderer.palettes,params.get('look'))?params.get('look'):'original';
 let zoom=clamp(number(params.get('zoom'),1),.85,1.7),angle=clamp(number(params.get('angle'),0),-.2,.2),targetZoom=zoom,targetAngle=angle;
 let paused=media.matches||!!navigator.connection?.saveData,visible=true,pageActive=true,frameId=0,last=0,time=0,dirty=true,drag=null,renderState='loading',opener=null;
 const looks=[...document.querySelectorAll('[data-sg-look]')],random=i=>{const v=Math.sin(i*127.1+31.7)*43758.5453;return v-Math.floor(v)};
 const moving=()=>Math.abs(targetZoom-zoom)>.001||Math.abs(targetAngle-angle)>.0001;
 const available=()=>!!ctx&&visible&&pageActive&&!document.hidden&&!$('dashboard-command')?.open;
 function motionLabel(){const still=renderState==='illustrated'||!ctx;$('sg-motion').disabled=still;$('sg-motion').textContent=still?'Still artwork':paused?'Resume motion':'Pause motion';$('sg-motion').setAttribute('aria-pressed',String(paused||still));}
 function cameraLabels(){$('sg-zoom').value=String(targetZoom);$('sg-zoom-value').textContent=Math.round(targetZoom*100)+'%';const near=targetZoom>1.3;$('sg-approach').setAttribute('aria-pressed',String(near));$('sg-approach').textContent=near?'Return to orbit ↙':'Approach horizon ↗';}
 function applyLook(){stage.dataset.look=mode;stage.style.setProperty('--sg-accent',renderer.palettes[mode].accent);$('sg-look-name').textContent=renderer.palettes[mode].name.toUpperCase();for(const b of looks)b.setAttribute('aria-pressed',String(b.dataset.sgLook===mode));}
 function paint(){
  if(!ctx)return;const bounds=stage.getBoundingClientRect(),w=bounds.width,h=bounds.height;if(!w||!h)return;
  const ratio=Math.min(devicePixelRatio||1,w<700?1.5:1.75,1600/w),pw=Math.round(w*ratio),ph=Math.round(h*ratio);if(canvas.width!==pw||canvas.height!==ph){canvas.width=pw;canvas.height=ph;}ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#03060b';ctx.fillRect(0,0,w,h);
  const mobile=w<700,cx=w*(mobile?.51:.65),cy=h*(mobile?.31:.43),r=Math.min(w*(mobile?.255:.19),h*.225)*zoom,color=renderer.palettes[mode].accent;
  const haze=ctx.createRadialGradient(cx,cy,r*.6,cx,cy,r*4);haze.addColorStop(0,color+'12');haze.addColorStop(.5,color+'07');haze.addColorStop(1,color+'00');ctx.fillStyle=haze;ctx.fillRect(0,0,w,h);
  for(let i=0;i<300;i++){
   let x=random(i+1)*w,y=random(i+501)*h;const dx=x-cx,dy=y-cy,dist=Math.hypot(dx,dy),lens=Math.exp(-Math.pow((dist-r*1.6)/(r*1.5),2))*.055;
   x+=dx*lens+Math.sin(time*.025+random(i)*6.28)*2;y+=dy*lens;const a=.1+random(i+1000)*.38,s=.25+random(i+1400)*.65;
   ctx.fillStyle='rgba(190,208,222,'+a+')';ctx.beginPath();ctx.arc(x,y,s,0,Math.PI*2);ctx.fill();
  }
  // Sparse orbiting dust gives depth without covering the event horizon with interface graphics.
  for(let i=0;i<30;i++){const a=i*2.39996+time*.035/(1+i*.04),rr=r*(1.8+random(i+1500)*1.8),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*.3;ctx.fillStyle=color+'36';ctx.beginPath();ctx.arc(x,y,.45+random(i+1900),0,Math.PI*2);ctx.fill();}
  renderState=renderer.draw(ctx,cx,cy,r,time,{mode,angle,energy:1.1,quality:Math.min(w<700?960:1600,r*6*ratio)})||'illustrated';
  stage.classList.add('sg-ready');motionLabel();const text=renderState==='live'?'Moving light · artistic visualization':renderState==='loading'?'Preparing the Singularity…':'Illustrated view · enhanced effects unavailable';if($('sg-graphics').textContent!==text)$('sg-graphics').textContent=text;
 }
 function frame(now){frameId=0;if(!available())return;const elapsed=last?Math.min((now-last)/1000,.1):0;if(!last||now-last>=33||dirty){last=now;
   const ease=media.matches?1:1-Math.exp(-elapsed*3.2);zoom+=(targetZoom-zoom)*ease;angle+=(targetAngle-angle)*ease;if(!paused&&renderState==='live')time+=elapsed;paint();dirty=false;
  }if(moving()||!paused&&renderState==='live')frameId=requestAnimationFrame(frame);
 }
 function refresh(){dirty=true;if(!available()){cancelAnimationFrame(frameId);frameId=0;last=0;return}if(!frameId){last=0;frameId=requestAnimationFrame(frame)}}
 function camera(nextZoom=targetZoom,nextAngle=targetAngle){targetZoom=clamp(nextZoom,.85,1.7);targetAngle=clamp(nextAngle,-.2,.2);if(media.matches){zoom=targetZoom;angle=targetAngle;}cameraLabels();refresh();}
 looks.forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.sgLook;applyLook();refresh()}));
 $('sg-zoom').addEventListener('input',()=>camera(number($('sg-zoom').value,1)));$('sg-approach').addEventListener('click',()=>camera(targetZoom>1.3?1:1.65,targetZoom>1.3?0:-.08));
 $('sg-reset').addEventListener('click',()=>camera(1,0));$('sg-motion').addEventListener('click',()=>{paused=!paused;motionLabel();refresh()});
 canvas.addEventListener('pointerdown',e=>{if(e.button!==0||!ctx)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,angle:targetAngle,active:false}});
 canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.active){if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>8){drag=null;return}if(Math.abs(dx)<8)return;drag.active=true;canvas.setPointerCapture?.(e.pointerId)}camera(targetZoom,drag.angle+dx*.0008)});
 for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>{drag=null});
 canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','+','=','-','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')camera(1,0);else if(e.key==='ArrowLeft'||e.key==='ArrowRight')camera(targetZoom,targetAngle+(e.key==='ArrowLeft'?-.03:.03));else camera(targetZoom+(e.key==='-'?-.1:.1))});
 $('sg-immerse').addEventListener('click',()=>{if(dialog.open)return;opener=document.activeElement;$('sg-cinema-slot').append(stage);dialog.showModal();document.body.classList.add('sg-cinema-open');visible=true;refresh();$('sg-exit').focus()});
 $('sg-exit').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{$('sg-stage-anchor').after(stage);document.body.classList.remove('sg-cinema-open');visible=true;refresh();if(opener?.isConnected)opener.focus()});
 async function copy(value,success){try{await navigator.clipboard.writeText(value);$('sg-feedback').textContent=success}catch{$('sg-feedback').textContent='Copy: '+value}}
 $('sg-copy-ca').addEventListener('click',()=>copy($('sg-ca').textContent.trim(),'Contract address copied.'));
 $('sg-share').addEventListener('click',()=>{const url=new URL('/projects/parallax','https://parallaxlaunch.live');url.searchParams.set('look',mode);url.searchParams.set('zoom',targetZoom.toFixed(2));url.searchParams.set('angle',targetAngle.toFixed(2));return copy(url.href,'Your Singularity view is copied.');});
 document.addEventListener('visibilitychange',refresh);window.addEventListener('parallax:singularity-ready',refresh);window.addEventListener('resize',refresh,{passive:true});window.addEventListener('pagehide',()=>{pageActive=false;refresh()});window.addEventListener('pageshow',()=>{pageActive=true;refresh()});
 media.addEventListener('change',()=>{if(media.matches){paused=true;zoom=targetZoom;angle=targetAngle;}motionLabel();refresh()});
 if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;refresh()},{rootMargin:'100px'}).observe(stage);
 if(typeof ResizeObserver==='function')new ResizeObserver(refresh).observe(stage);
 if(typeof MutationObserver==='function'&&$('dashboard-command'))new MutationObserver(refresh).observe($('dashboard-command'),{attributes:true,attributeFilter:['open']});
 if(!ctx){canvas.tabIndex=-1;$('sg-zoom').disabled=true;$('sg-approach').disabled=true;$('sg-reset').disabled=true;$('sg-graphics').textContent='Still artwork · interactive rendering unavailable.';}
 applyLook();cameraLabels();motionLabel();refresh();
})();
