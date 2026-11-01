/* Route validation and a bounded cinematic flight, shared with offline tests. */
(()=>{'use strict';
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const duration=12;
 function destination(p){if(!p||typeof p.id!=='string'||typeof p.name!=='string'||!p.name.trim()||typeof p.href!=='string'||!/^\/(?:projects|world)\/[a-zA-Z0-9_-]+$/.test(p.href))return null;let profile=p.profile;if(typeof profile==='string'){try{profile=JSON.parse(profile);}catch{profile={};}}
  const art=profile?.image;return{id:p.id.slice(0,160),name:p.name.slice(0,100),ticker:typeof p.ticker==='string'?p.ticker.slice(0,24):'',href:p.href,image:typeof art==='string'&&/^\/assets\/[a-zA-Z0-9_/-]+\.(?:png|jpe?g|webp)$/.test(art)?art:null};}
 function feed(data){if(!data||!Array.isArray(data.projects))throw Error('Invalid project directory');const seen=new Set(),projects=[];for(const p of data.projects){const d=destination(p);if(d&&!seen.has(d.id)){seen.add(d.id);projects.push(d);}}const next=Number.isSafeInteger(data.nextOffset)&&data.nextOffset>=0?data.nextOffset:null;return{projects,next};}
 function frame(elapsed){const t=clamp(Number.isFinite(elapsed)?elapsed:0,0,duration),release=smooth(t/3),burn=smooth((t-2)/5),approach=smooth((t-7.4)/3.8);return{t,done:t>=duration,phase:t<2?'Releasing docking clamps':t<4.5?'Clearing Atlas Station':t<8?'Departure burn':t<11?'Approaching destination':'Arrival complete',offset:[1.65+release*.7+burn*2.8,-.45+release*.4+burn*.6,1.05+release*.5+burn*8],yaw:-.35-burn*.65,thrust:smooth((t-2)/1.5)*(1-smooth((t-9)/2)),approach,fade:smooth((t-11.3)/.7)};}
 function tick(elapsed,dt){return clamp(elapsed+clamp(Number.isFinite(dt)?dt:0,0,.08),0,duration);}
 const api={duration,destination,feed,frame,tick,smooth};if(typeof window!=='undefined')window.ParallaxAtlasFlightCore=api;if(typeof module!=='undefined')module.exports=api;
})();
