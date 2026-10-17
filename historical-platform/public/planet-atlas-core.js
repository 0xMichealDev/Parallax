/* Shared, deterministic atlas data and geometry helpers. No wallet or network side effects. */
(()=>{'use strict';
 const worldIds=['mercury','venus','earth','moon','mars','jupiter','europa','saturn','uranus','neptune','pluto'];
 const mainIds=['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune','pluto'];
 const initial=[-2.4,.9,-.75,2.55,-1.65,.3,2,-.45,2.9];
 function point(id,time,width,height){
  if(id==='moon'||id==='europa'){
   const parent=point(id==='moon'?'earth':'jupiter',time,width,height),angle=time*.035+(id==='moon'?2.1:-.8),r=width<500?23:34;
   return{x:parent.x+Math.cos(angle)*r,y:parent.y+Math.sin(angle)*r*.65};
  }
  const i=Math.max(0,mainIds.indexOf(id)),ratio=.23+i*.093,angle=initial[i]+time*(.018-i*.0013);
  const x=Math.cos(angle)*width*.43*ratio,y=Math.sin(angle)*height*.39*ratio;
  return{x:width*.5+x,y:height*.49+y};
 }
 function planetLink(id){return '/planets'+(worldIds.includes(id)?'?planet='+id:'')}
 function safeWebsite(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}}
 function validClaim(m){return m&&typeof m.id==='string'&&m.id.length>0&&m.id.length<=64&&['name','ticker','description','wallet','contractAddress'].every(k=>typeof m[k]==='string')&&worldIds.includes(m.planet)&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(m.contractAddress)}
 function directory(data){
  if(!data||!Array.isArray(data.claims)||!data.claims.every(validClaim)||!Number.isSafeInteger(data.total)||data.total<0||!Array.isArray(data.counts)||(data.nextOffset!==null&&(!Number.isSafeInteger(data.nextOffset)||data.nextOffset<1)))throw Error('The project directory returned incomplete data. Please retry.');
  const counts=Object.fromEntries(worldIds.map(id=>[id,0]));
  for(const c of data.counts){if(!worldIds.includes(c.planet)||!Number.isSafeInteger(c.count)||c.count<0)throw Error('Planet counts are temporarily unavailable. Please retry.');counts[c.planet]=c.count}
  return{claims:data.claims,total:data.total,nextOffset:data.nextOffset,counts};
 }
 window.ParallaxAtlasCore={worldIds,mainIds,point,planetLink,safeWebsite,validClaim,directory};
})();
