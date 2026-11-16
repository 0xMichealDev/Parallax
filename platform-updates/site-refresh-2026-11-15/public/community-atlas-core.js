/* Pure camera, layout and input validation shared by the map and its controller. */
(()=>{'use strict';
 const sectors={token:{name:'Coins & memes',x:230,y:10,z:0,color:'#d7b367'},community:{name:'Communities',x:-300,y:90,z:50,color:'#98d9bb'},tool:{name:'Tools & apps',x:0,y:-45,z:-380,color:'#8ab7e9'},infrastructure:{name:'Infrastructure',x:390,y:140,z:-400,color:'#b59de3'},creative:{name:'Creative worlds',x:-330,y:-110,z:-390,color:'#e9a3b9'}};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function safeURL(value,local=false){if(typeof value!=='string')return null;if(local&&(value==='/assets/parallax-singularity.png'||/^\/(?:assets\/(?:projects|ecosystem)\/|world\/|projects\/)[A-Za-z0-9_./%-]+$/.test(value)&&!value.includes('..')))return value;try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
 function project(p){
  if(!p||!['id','name','ticker','description','color'].every(k=>typeof p[k]==='string')||!/^[A-Za-z0-9_-]{1,64}$/.test(p.id)||!['curated','community'].includes(p.provenance)||!/^\/(world|projects)\/[A-Za-z0-9_%-]+$/.test(p.href||''))throw Error('Project data is incomplete. Please refresh.');
  const profile=p.profile&&typeof p.profile==='object'&&!Array.isArray(p.profile)?p.profile:{};
  if(p.countedVisits7d!==undefined&&(!Number.isSafeInteger(p.countedVisits7d)||p.countedVisits7d<1||p.provenance!=='community'))throw Error('Discovery counts are unavailable. Please refresh.');
  return {...p,profile,growthLevel:Number.isInteger(p.growthLevel)&&p.growthLevel>=1&&p.growthLevel<=100?p.growthLevel:1,renderKind:p.id==='curated-parallax'&&p.provenance==='curated'&&p.renderKind==='singularity'?'singularity':'planet',category:Object.hasOwn(sectors,profile.category)?profile.category:'token',color:validPlanetDesign(p.color)?p.color:'ocean',style:window.ParallaxPremiumScene?.valid(p.style)?p.style:null};
 }
 function feed(data){if(!data||!Array.isArray(data.projects)||!Number.isSafeInteger(data.total)||data.total<0||!(data.nextOffset===null||Number.isSafeInteger(data.nextOffset)&&data.nextOffset>0))throw Error('The universe is temporarily unavailable. Please retry.');if(data.discovery&&(!['all','newest','explored'].includes(data.discovery.sort)||!Number.isSafeInteger(data.discovery.asOf)||data.discovery.sort==='explored'&&!Number.isSafeInteger(data.discovery.from)))throw Error('Discovery data is temporarily unavailable. Please refresh.');return{...data,projects:data.projects.map(project)}}
 const overviewYaw=-.15,overviewPitch=.28;
 const worldRadius=p=>p.renderKind==='singularity'?44:62*(1+.8*((p.growthLevel||1)-1)/99);
 function cameraSpace(p){const x=Math.cos(overviewYaw)*p.x+Math.sin(overviewYaw)*p.z,z=-Math.sin(overviewYaw)*p.x+Math.cos(overviewYaw)*p.z;return{x,y:Math.cos(overviewPitch)*p.y-Math.sin(overviewPitch)*z,z:Math.sin(overviewPitch)*p.y+Math.cos(overviewPitch)*z}}
 function worldSpace(p){const y=Math.cos(overviewPitch)*p.y+Math.sin(overviewPitch)*p.z,z=-Math.sin(overviewPitch)*p.y+Math.cos(overviewPitch)*p.z;return{x:Math.cos(overviewYaw)*p.x-Math.sin(overviewYaw)*z,y,z:Math.sin(overviewYaw)*p.x+Math.cos(overviewYaw)*z}}
 // Keep the original sector cloud and golden-angle placement in real 3D.
 // Spacing corrections travel only along camera-right/up: every world's
 // foreground/background depth survives, including on the narrow layout.
 function layout(projects,{compact=false,w=compact?390:900,h=compact?560:600}={}){
  const points=new Map(),groups={},seeds=[];
  for(const p of [...projects].sort((a,b)=>a.id.localeCompare(b.id))){
   if(p.renderKind==='singularity'){seeds.push({id:p.id,r:44,home:true,x:0,y:0,z:0});continue}
   (groups[p.category]??=[]).push(p);
  }
  for(const [category,items]of Object.entries(groups)){
   const sector=sectors[category]||sectors.token;
   items.forEach((p,i)=>{const angle=i*2.399963,radius=i===0?0:205*Math.sqrt(i);seeds.push({id:p.id,r:worldRadius(p),home:false,x:sector.x+Math.cos(angle)*radius,y:sector.y+Math.sin(i*1.7)*Math.min(145,i*36),z:sector.z+Math.sin(angle)*radius})});
  }
  seeds.sort((a,b)=>a.id.localeCompare(b.id));
  if(seeds.length===1){points.set(seeds[0].id,{x:0,y:0,z:0,r:seeds[0].r});return points}
  if(!seeds.length)return points;
  const raw=seeds.map(p=>({...p,...cameraSpace(p)})),hasHome=raw.some(p=>p.home);
  const centerX=(Math.min(...raw.map(p=>p.x))+Math.max(...raw.map(p=>p.x)))/2,centerY=hasHome?0:(Math.min(...raw.map(p=>p.y))+Math.max(...raw.map(p=>p.y)))/2;
  const rangeX=Math.max(1,...raw.map(p=>Math.abs(p.x-centerX))),rangeY=Math.max(1,...raw.map(p=>Math.abs(p.y-centerY))),rangeZ=Math.max(1,...raw.map(p=>Math.abs(p.z)));
  const depthRange=compact?220:310,focal=Math.min(w,h)*1.1,overflow=Math.max(1,Math.sqrt(seeds.length/24)),frameW=w*overflow,frameH=h*overflow;
  const density=Math.sqrt(seeds.reduce((sum,p)=>sum+p.r*p.r,0)/(13*62*62));
  let distance=clamp((compact?1300:1150)*density,compact?850:720,3600),placed=[];
  for(let attempt=0;attempt<8;attempt++){
   placed=raw.map(p=>{const depth=p.home?0:p.z/rangeZ*depthRange,scale=focal/(distance-depth);return{...p,depth,scale,foot:p.r*2.2*scale+6,sx:0,sy:0}});
   const largest=Math.max(...placed.map(p=>p.foot)),spanX=Math.max(45,frameW/2-largest-30),spanY=Math.max(45,frameH/2-largest-66);
   for(const p of placed){p.sx=p.home?0:(p.x-centerX)/rangeX*spanX*.94;p.sy=p.home?0:(p.y-centerY)/rangeY*spanY*.94}
   const push=(a,b,dx,dy,amount,world=false)=>{const weight=a.home?0:b.home?1:.5;a.sx+=dx*amount*weight*(world?a.scale:1);a.sy+=dy*amount*weight*(world?a.scale:1);b.sx-=dx*amount*(1-weight)*(world?b.scale:1);b.sy-=dy*amount*(1-weight)*(world?b.scale:1)};
   for(let pass=0;pass<100;pass++){
    let change=0;
    for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++){
     const a=placed[i],b=placed[j];let dx=a.sx-b.sx,dy=a.sy-b.sy,length=Math.hypot(dx,dy),required=a.foot+b.foot+8;
     if(length<required){if(length<.001){const angle=(i+j+1)*2.399963;dx=Math.cos(angle);dy=Math.sin(angle);length=1}const amount=required-length;push(a,b,dx/length,dy/length,amount);change=Math.max(change,amount)}
     dx=a.sx/a.scale-b.sx/b.scale;dy=a.sy/a.scale-b.sy/b.scale;length=Math.hypot(dx,dy);const dz=a.depth-b.depth,clearance=(a.r+b.r)*2.2+24,needed=Math.sqrt(Math.max(0,clearance*clearance-dz*dz));
     if(length<needed){if(length<.001){const angle=(i+j+1)*2.399963;dx=Math.cos(angle);dy=Math.sin(angle);length=1}const amount=needed-length;push(a,b,dx/length,dy/length,amount,true);change=Math.max(change,amount*Math.max(a.scale,b.scale))}
    }
    for(const p of placed)if(!p.home){p.sx=clamp(p.sx,-frameW/2+24+p.foot,frameW/2-24-p.foot);p.sy=clamp(p.sy,-frameH/2+62+p.foot,frameH/2-62-p.foot)}
    if(change<.025)break;
   }
   const clear=placed.every((p,i)=>placed.slice(i+1).every(q=>Math.hypot(p.sx-q.sx,p.sy-q.sy)>=p.foot+q.foot+7.8&&Math.hypot(p.sx/p.scale-q.sx/q.scale,p.sy/p.scale-q.sy/q.scale,p.depth-q.depth)>=(p.r+q.r)*2.2+23.9));
   if(clear||distance>=3600)break;distance=Math.min(3600,distance*1.10);
  }
  for(const p of placed)points.set(p.id,{...worldSpace({x:p.sx/p.scale,y:p.sy/p.scale,z:p.depth}),r:p.r});
  Object.defineProperty(points,'overview',{value:{distance,w,h}});
  return points;
 }
 function overviewCamera(points,w,h){
  const focal=Math.min(w,h)*1.1,halfW=Math.max(80,w/2-30),halfH=Math.max(100,h/2-68);let distance=points.overview?.distance||620;
  for(const p of points.values()){const view=cameraSpace(p),extent=p.r*2.2;distance=Math.max(distance,view.z+focal*(Math.abs(view.x)+extent)/halfW,view.z+focal*(Math.abs(view.y)+extent)/halfH)}
  return{x:0,y:0,z:0,yaw:overviewYaw,pitch:overviewPitch,distance:Math.min(3600,distance)};
 }
 const overlap=(a,b)=>Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
 function placeLabels(items,w,h){
  const placed=[],result=new Map(),top=60,bottom=h-60;
  const order=[...items].sort((a,b)=>(b.priority||0)-(a.priority||0)||b.r-a.r||a.id.localeCompare(b.id));
  for(const item of order){
   const width=Math.min(item.w||100,w-24),height=item.h||34,r=item.r+7;
   const candidates=[{x:item.x-width/2,y:item.y+r},{x:item.x-width/2,y:item.y-r-height},{x:item.x+r,y:item.y-height/2},{x:item.x-r-width,y:item.y-height/2},{x:item.x+r*.7,y:item.y+r*.7},{x:item.x-r*.7-width,y:item.y+r*.7},{x:item.x+r*.7,y:item.y-r*.7-height},{x:item.x-r*.7-width,y:item.y-r*.7-height}];
   let best=null,bestScore=Infinity;
   for(const candidate of candidates){
    const rect={x:clamp(candidate.x,12,w-width-12),y:clamp(candidate.y,top,Math.max(top,bottom-height)),w:width,h:height};
    let score=placed.reduce((sum,p)=>sum+overlap(rect,p)*3,0);
    for(const other of items){const x=clamp(other.x,rect.x,rect.x+rect.w),y=clamp(other.y,rect.y,rect.y+rect.h),distance=Math.hypot(other.x-x,other.y-y);if(distance<other.r+4)score+=(other.r+4-distance)*height*2}
    if(score<bestScore){best=rect;bestScore=score}if(score===0)break;
   }
   if(best&&(bestScore===0||item.priority>0)){result.set(item.id,best);placed.push(best)}
  }
  return result;
 }
 function projectPoint(p,c,w,h){const dx=p.x-c.x,dy=p.y-c.y,dz=p.z-c.z,x=Math.cos(c.yaw)*dx+Math.sin(c.yaw)*dz,z=-Math.sin(c.yaw)*dx+Math.cos(c.yaw)*dz,y=Math.cos(c.pitch)*dy-Math.sin(c.pitch)*z,depth=c.distance-(Math.sin(c.pitch)*dy+Math.cos(c.pitch)*z);if(depth<70)return null;const scale=Math.min(w,h)*1.1/depth;return{x:w/2+x*scale,y:h/2-y*scale,scale,depth,r:(p.r||1)*scale}}
 function projectLink(id){return '/planets?world='+encodeURIComponent(id)}
 window.ParallaxCommunityCore={sectors,clamp,safeURL,project,feed,layout,overviewCamera,placeLabels,projectPoint,projectLink};
})();
