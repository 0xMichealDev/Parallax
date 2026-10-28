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
 function orbitParent(id){return id==='moon'?'earth':id==='europa'?'jupiter':id}
 // Labels move around their world, never the orbit itself. No frame-by-frame DOM measurement.
 function labelLayout(items,width,height,priority=[],previous={}){
  const placed=[{x:width*.5-15,y:height*.49+(width<500?13:20)+5,width:30,height:14}],result={},pad=8,bottom=height-36;
  const overlaps=(a,b)=>a.x<b.x+b.width+4&&a.x+a.width+4>b.x&&a.y<b.y+b.height+3&&a.y+a.height+3>b.y;
  const touches=(rect,body)=>{const dx=body.x-Math.max(rect.x,Math.min(body.x,rect.x+rect.width)),dy=body.y-Math.max(rect.y,Math.min(body.y,rect.y+rect.height));return dx*dx+dy*dy<(body.r+3)**2};
  const rank=id=>{const i=priority.indexOf(id);return i<0?priority.length:i};
  const bodies=[...items,{x:width*.5,y:height*.49,r:width<500?18:25}];
  for(const item of [...items].sort((a,b)=>rank(a.id)-rank(b.id))){
   const w=item.name.length*6+14,h=20,gap=item.r+7;
   const offsets=[[0,gap+h/2],[0,-gap-h/2],[gap+w/2,0],[-gap-w/2,0],[gap+w/2,gap],[-gap-w/2,gap],[gap+w/2,-gap],[-gap-w/2,-gap],[0,gap+h*1.6],[0,-gap-h*1.6]];
   for(const reach of [18,36])offsets.push([gap+w/2+reach,0],[-gap-w/2-reach,0],[gap+w/2,gap+reach],[-gap-w/2,gap+reach],[gap+w/2,-gap-reach],[-gap-w/2,-gap-reach]);
   const order=offsets.map((_,i)=>i),prior=previous[item.id]?.slot;
   if(Number.isInteger(prior)&&order.includes(prior)){order.splice(order.indexOf(prior),1);order.unshift(prior)}
   let best=null,bestScore=Infinity;
   for(const slot of order){const [dx,dy]=offsets[slot],rect={x:Math.max(pad,Math.min(width-pad-w,item.x+dx-w/2)),y:Math.max(pad,Math.min(bottom-h,item.y+dy-h/2)),width:w,height:h,slot};
    const score=placed.filter(p=>overlaps(rect,p)).length*4+bodies.filter(body=>touches(rect,body)).length;
    if(score<bestScore){best=rect;bestScore=score}if(score===0)break;
   }
   best.hidden=bestScore>0&&!priority.includes(item.id);result[item.id]=best;if(!best.hidden)placed.push(best);
  }
  return result;
 }
 function planetLink(id){return '/planets'+(worldIds.includes(id)?'?planet='+id:'')}
 function safeWebsite(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}}
 function validClaim(m){return m&&typeof m.id==='string'&&m.id.length>0&&m.id.length<=64&&['name','ticker','description','wallet'].every(k=>typeof m[k]==='string')&&worldIds.includes(m.planet)&&(m.contractAddress==null||m.contractAddress===''||(typeof m.contractAddress==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(m.contractAddress)))}
 function directory(data){
  if(!data||!Array.isArray(data.claims)||!data.claims.every(validClaim)||!Number.isSafeInteger(data.total)||data.total<0||!Array.isArray(data.counts)||(data.nextOffset!==null&&(!Number.isSafeInteger(data.nextOffset)||data.nextOffset<1)))throw Error('The project directory returned incomplete data. Please retry.');
  const counts=Object.fromEntries(worldIds.map(id=>[id,0]));
  for(const c of data.counts){if(!worldIds.includes(c.planet)||!Number.isSafeInteger(c.count)||c.count<0)throw Error('Planet counts are temporarily unavailable. Please retry.');counts[c.planet]=c.count}
  return{claims:data.claims,total:data.total,nextOffset:data.nextOffset,counts};
 }
 window.ParallaxAtlasCore={worldIds,mainIds,point,orbitParent,labelLayout,planetLink,safeWebsite,validClaim,directory};
})();
