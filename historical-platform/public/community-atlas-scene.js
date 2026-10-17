/* Perspective space camera. One shared planet renderer; bounded, cached sprites. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),root=$('universe-stage');if(!root)return;
 const core=window.ParallaxCommunityCore,canvas=$('universe-canvas'),ctx=canvas.getContext('2d'),media=matchMedia('(prefers-reduced-motion: reduce)');
 const camera={x:0,y:0,z:0,yaw:-.15,pitch:.25,distance:950};let target={...camera};
 let projects=[],points=new Map(),selected=null,active=false,visible=true,paused=media.matches,raf=0,last=0,phase=0,dirty=true,lastSprite=0;
 const sprites=new Map(),buttons=new Map(),pointers=new Map();let gesture=null,moved=false;
 const blocked=()=>!!($('atlas-claim-dialog')?.open||$('dashboard-command')?.open);
 const bounds=()=>({w:root.clientWidth||900,h:root.clientHeight||560});
 const emit=(name,detail)=>window.dispatchEvent(new CustomEvent(name,{detail}));
 function fallback(c,p,r){const color=p.style?.accent||planetPalette[decodePlanet(p.color).index][1],g=c.createRadialGradient(128-r*.4,128-r*.4,0,128,128,r);g.addColorStop(0,p.style?.surface==='obsidian'?'#4b4535':color);g.addColorStop(.45,p.style?.surface==='obsidian'?'#111318':color+'99');g.addColorStop(1,'#03060c');c.fillStyle=g;c.beginPath();c.arc(128,128,r,0,Math.PI*2);c.fill();if(p.style?.rings||decodePlanet(p.color).rings!=='none'){c.strokeStyle=color;c.lineWidth=2;for(const k of p.style?.rings==='double'?[1.5,1.7]:[1.55]){c.beginPath();c.ellipse(128,128,r*k,r*.37,-.3,0,Math.PI*2);c.stroke()}}}
 function sprite(p,animate=false){let item=sprites.get(p.id);if(item&&!animate){sprites.delete(p.id);sprites.set(p.id,item);return item}if(!item){item=document.createElement('canvas');item.width=item.height=256}const c=item.getContext('2d');if(!c)return null;c.clearRect(0,0,256,256);const r=59,t=animate?phase:2;
  if(!window.ParallaxPlanetRenderer?.draw(c,128,128,r,p.color,t,p.style||{lighting:'studio'}))fallback(c,p,r);
  window.ParallaxPremiumScene?.foreground(c,256,256,p.style,t,128,128,r,{frame:false});
  sprites.delete(p.id);sprites.set(p.id,item);while(sprites.size>40)sprites.delete(sprites.keys().next().value);return item;
 }
 function draw(){if(!ctx)return;const {w,h}=bounds(),dpr=Math.min(devicePixelRatio||1,w<600?1.5:2);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const glow=ctx.createRadialGradient(w*.45,h*.42,0,w*.5,h*.5,w*.72);glow.addColorStop(0,'#21443e45');glow.addColorStop(.45,'#12213355');glow.addColorStop(1,'#060b12');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
  for(let i=0;i<230;i++){const x=((i*179.37+camera.yaw*(i%3+1)*28-camera.x*.03)%w+w)%w,y=((i*83.71+camera.pitch*90-camera.y*.025)%h+h)%h;ctx.fillStyle=i%13?'#77939d50':'#d0e3d99c';ctx.fillRect(x,y,i%13?.8:1.6,i%13?.8:1.6)}
  // Spatial orbit guides remain behind the project worlds.
  for(const radius of [220,460,740,1050]){ctx.beginPath();let started=false;for(let i=0;i<=100;i++){const a=i/100*Math.PI*2,p=core.projectPoint({x:Math.cos(a)*radius,y:-90,z:Math.sin(a)*radius},camera,w,h);if(!p){started=false;continue}if(started)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);started=true}ctx.strokeStyle='#94c4b016';ctx.lineWidth=1;ctx.stroke()}
  const center=core.projectPoint({x:0,y:-90,z:0,r:12},camera,w,h);if(center&&center.x>-100&&center.x<w+100&&center.y>-100&&center.y<h+100){const g=ctx.createRadialGradient(center.x,center.y,0,center.x,center.y,55);g.addColorStop(0,'#d7efe8a0');g.addColorStop(.1,'#9de5c559');g.addColorStop(1,'#85cdb000');ctx.fillStyle=g;ctx.fillRect(center.x-55,center.y-55,110,110);ctx.fillStyle='#93b3a8';ctx.font='9px monospace';ctx.textAlign='center';ctx.fillText('PARALLAX',center.x,center.y+35)}
  const projected=projects.map(p=>({p,point:core.projectPoint(points.get(p.id),camera,w,h)})).filter(({point:p})=>p&&p.x>-160&&p.x<w+160&&p.y>-160&&p.y<h+160);
  const detailed=new Set([...projected].sort((a,b)=>(a.p.id===selected?-1:b.p.id===selected?1:a.point.depth-b.point.depth)).slice(0,w<600?12:24).map(o=>o.p.id));
  for(const {button}of buttons.values())button.hidden=true;
  for(const {p,point:v}of projected.sort((a,b)=>b.point.depth-a.point.depth)){
   const color=p.style?.accent||core.sectors[p.category].color,r=core.clamp(v.r,3,180);if(!detailed.has(p.id)||r<9){ctx.fillStyle=color;ctx.beginPath();ctx.arc(v.x,v.y,2.5,0,Math.PI*2);ctx.fill();continue}
   const image=sprite(p);if(image)ctx.drawImage(image,v.x-r*2.17,v.y-r*2.17,r*4.34,r*4.34);
   if(p.id===selected){ctx.beginPath();ctx.ellipse(v.x,v.y,r*1.22,r*1.22,0,0,Math.PI*2);ctx.setLineDash([3,8]);ctx.strokeStyle=color+'66';ctx.lineWidth=1;ctx.stroke();ctx.setLineDash([])}
   const {button,label,tag}=buttons.get(p.id),size=core.clamp(r*2.5,52,340);button.hidden=false;button.style.width=size+'px';button.style.height=size+'px';button.style.transform=`translate(${v.x-size/2}px,${v.y-size/2}px)`;button.style.zIndex=String(Math.round(10000-v.depth));button.style.setProperty('--world-accent',color);label.style.top=Math.min(size*.85,r+size/2+10)+'px';tag.hidden=r<21;button.setAttribute('aria-pressed',String(p.id===selected));
  }
 }
 function moving(){return Object.keys(camera).some(k=>Math.abs(target[k]-camera[k])>.005)}
 function frame(now){raf=0;if(!active||!visible||document.hidden||blocked())return;const elapsed=Math.min((now-last)/1000,.08);if(now-last>=33||dirty){last=now;const travel=moving();if(travel)for(const key of Object.keys(camera))camera[key]+= (target[key]-camera[key])*(media.matches?1:.16);
   if(!paused)phase+=elapsed*.5;if(selected&&!paused&&now-lastSprite>120){const p=projects.find(p=>p.id===selected);if(p)sprite(p,true);lastSprite=now}draw();dirty=false;
  }if(!paused||moving())raf=requestAnimationFrame(frame);
 }
 function sync(){dirty=true;if(!raf&&active&&visible&&!document.hidden&&!blocked())raf=requestAnimationFrame(frame);if((!active||!visible||document.hidden||blocked())&&raf){cancelAnimationFrame(raf);raf=0}}
 function setTarget(next){target={...target,...next};target.distance=core.clamp(target.distance,260,3600);target.pitch=core.clamp(target.pitch,-1.1,1.1);if(media.matches)Object.assign(camera,target);sync()}
 function focus(id,fly=true){const p=projects.find(p=>p.id===id);if(!p)return;selected=id;$('universe-location').textContent=p.name.toUpperCase()+' / '+core.sectors[p.category].name.toUpperCase();if(fly){const pos=points.get(id);setTarget({x:pos.x,y:pos.y,z:pos.z,distance:390})}sync()}
 function overview(){const values=[...points.values()];const span=Math.max(550,...values.map(p=>Math.hypot(p.x,p.z)+180));setTarget({x:0,y:0,z:-100,yaw:-.15,pitch:.28,distance:Math.min(3600,span*1.8)});$('universe-location').textContent='ALL LOADED WORLDS / OVERVIEW'}
 function setProjects(next){projects=next;points=core.layout(next);sprites.clear();buttons.clear();$('universe-hit-targets').replaceChildren();for(const p of projects){const button=document.createElement('button'),label=document.createElement('span'),name=document.createElement('strong'),tag=document.createElement('small');button.className='universe-world';button.type='button';button.hidden=true;button.setAttribute('aria-label','Explore '+p.name+(p.category==='token'?' $'+p.ticker:''));name.textContent=p.name;tag.textContent=(p.category==='token'?'$':'')+p.ticker;label.className='universe-world-label';label.append(name,tag);button.append(label);button.onclick=()=>{if(!moved)emit('parallax:community-select',{id:p.id})};button.onfocus=()=>emit('parallax:community-select',{id:p.id,fly:false});$('universe-hit-targets').append(button);buttons.set(p.id,{button,label,tag})}if(selected&&!projects.some(p=>p.id===selected))selected=null;sync()}
 const motion=()=>{$('universe-motion').textContent=paused?'Resume motion':'Pause motion';$('universe-motion').setAttribute('aria-pressed',String(paused))};
 $('universe-motion').onclick=()=>{paused=!paused;motion();sync()};$('universe-home').onclick=overview;
 $('universe-left').onclick=()=>setTarget({yaw:target.yaw-.25});$('universe-right').onclick=()=>setTarget({yaw:target.yaw+.25});$('universe-up').onclick=()=>setTarget({pitch:target.pitch+.16});$('universe-down').onclick=()=>setTarget({pitch:target.pitch-.16});$('universe-zoom-in').onclick=()=>setTarget({distance:target.distance*.8});$('universe-zoom-out').onclick=()=>setTarget({distance:target.distance*1.25});
 function beginGesture(){const all=[...pointers.values()];gesture={points:all.map(p=>({...p})),camera:{...target},distance:all.length>1?Math.hypot(all[0].x-all[1].x,all[0].y-all[1].y):0}}
 root.addEventListener('pointerdown',e=>{if(e.button!==undefined&&e.button!==0||e.target.closest('button'))return;moved=false;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});root.setPointerCapture?.(e.pointerId);beginGesture()});
 root.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const all=[...pointers.values()];if(all.length>1&&gesture.points.length>1){const d=Math.hypot(all[0].x-all[1].x,all[0].y-all[1].y);if(d>0)setTarget({distance:gesture.camera.distance*gesture.distance/d});moved=true;return}const dx=all[0].x-gesture.points[0].x,dy=all[0].y-gesture.points[0].y;if(Math.abs(dx)+Math.abs(dy)>4)moved=true;if(e.shiftKey){setTarget({x:gesture.camera.x-dx*gesture.camera.distance/650,y:gesture.camera.y+dy*gesture.camera.distance/650})}else setTarget({yaw:gesture.camera.yaw+dx*.006,pitch:gesture.camera.pitch+dy*.004})});
 function end(e){pointers.delete(e.pointerId);if(pointers.size)beginGesture();else gesture=null;setTimeout(()=>{moved=false},0)}root.addEventListener('pointerup',end);root.addEventListener('pointercancel',end);root.addEventListener('lostpointercapture',end);
 root.addEventListener('wheel',e=>{e.preventDefault();setTarget({distance:target.distance*Math.exp(core.clamp(e.deltaY,-100,100)*.003)})},{passive:false});
 root.addEventListener('keydown',e=>{if(e.target!==root)return;const action={ArrowLeft:'universe-left',ArrowRight:'universe-right',ArrowUp:'universe-up',ArrowDown:'universe-down','+':'universe-zoom-in','=':'universe-zoom-in','-':'universe-zoom-out',Home:'universe-home'}[e.key];if(action){e.preventDefault();$(action).click()}});
 document.addEventListener('visibilitychange',sync);media.addEventListener('change',()=>{paused=media.matches;motion();sync()});window.addEventListener('parallax:planet-texture',()=>{sprites.clear();sync()});
 if(typeof ResizeObserver==='function')new ResizeObserver(sync).observe(root);else window.addEventListener('resize',sync);
 if(typeof IntersectionObserver==='function')new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync()},{rootMargin:'100px'}).observe(root);
 for(const id of ['atlas-claim-dialog','dashboard-command'])$(id)?.addEventListener('close',sync);window.addEventListener('parallax:atlas-claim-open',sync);
 root.tabIndex=0;root.setAttribute('aria-label','Community space camera. Use arrow keys to orbit, plus and minus to zoom, Home for overview.');root.setAttribute('aria-describedby','universe-camera-help');
 window.ParallaxCommunityScene={setProjects,focus,overview,refresh:sync,setActive(value){active=value;if(value)visible=true;sync()},available:!!ctx};motion();
})();
