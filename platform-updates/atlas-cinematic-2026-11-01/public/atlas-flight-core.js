/* Route validation and a bounded cinematic flight, shared with offline tests. */
(()=>{'use strict';
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const duration=12;
 function destination(p){if(!p||typeof p.id!=='string'||typeof p.name!=='string'||!p.name.trim()||typeof p.href!=='string'||!/^\/(?:projects|world)\/[a-zA-Z0-9_-]+$/.test(p.href))return null;let profile=p.profile;if(typeof profile==='string'){try{profile=JSON.parse(profile);}catch{profile={};}}
  const art=profile?.image;return{id:p.id.slice(0,160),name:p.name.slice(0,100),ticker:typeof p.ticker==='string'?p.ticker.slice(0,24):'',href:p.href,image:typeof art==='string'&&/^\/assets\/[a-zA-Z0-9_/-]+\.(?:png|jpe?g|webp)$/.test(art)?art:null};}
 function feed(data){if(!data||!Array.isArray(data.projects))throw Error('Invalid project directory');const seen=new Set(),projects=[];for(const p of data.projects){const d=destination(p);if(d&&!seen.has(d.id)){seen.add(d.id);projects.push(d);}}const next=Number.isSafeInteger(data.nextOffset)&&data.nextOffset>=0?data.nextOffset:null;return{projects,next};}
 function frame(elapsed){
  const t=clamp(Number.isFinite(elapsed)?elapsed:0,0,duration),release=smooth(t/2.8),burn=smooth((t-2.4)/5.8),approach=smooth((t-7.5)/4.5),chase=smooth((t-2)/4);
  const offset=[1.65+release*.95+burn*5,-.45+release*.3+burn*2,1.05+release*.8+burn*55];
  return{t,done:t>=duration,phase:t<2?'Docking clamps released':t<4.5?'Main engine ignition':t<7.5?'Leaving Atlas behind':t<11?'Destination approach':'Welcome to your next world',offset,yaw:-.35+chase*.35,thrust:smooth((t-1.2)/1.6)*(1-smooth((t-9.5)/2.5)*.65),approach,fade:smooth((t-11.5)/.5),chase,release,burn};
 }
 const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0),unit=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
 function camera(f,aspect){
  const orbit=.85+f.chase*2.25,range=(3.1+f.chase*.5)*(aspect<1?1.35:1);
  const eye=f.offset.map((v,i)=>v+[Math.sin(orbit)*range,1.1-f.chase*.35,Math.cos(orbit)*range][i]);
  const target=f.offset.map((v,i)=>v+[0,.05,f.chase*.5][i]),forward=unit(target.map((v,i)=>v-eye[i]));
  const right=unit([-forward[2],0,forward[0]]),up=[right[1]*forward[2]-right[2]*forward[1],right[2]*forward[0]-right[0]*forward[2],right[0]*forward[1]-right[1]*forward[0]];
  return{eye,forward,right,up,aspect,lens:.38+f.chase*.04};
 }
 function project(point,view){const p=point.map((v,i)=>v-view.eye[i]),z=dot(p,view.forward);if(z<=.05)return null;return{x:(.5+dot(p,view.right)/(z*view.aspect*view.lens)*.5)*100,y:(.5-dot(p,view.up)/(z*view.lens)*.5)*100};}
 function tick(elapsed,dt){return clamp(elapsed+clamp(Number.isFinite(dt)?dt:0,0,.08),0,duration);}
 const api={duration,destination,feed,frame,tick,smooth,camera,project};if(typeof window!=='undefined')window.ParallaxAtlasFlightCore=api;if(typeof module!=='undefined')module.exports=api;
})();
