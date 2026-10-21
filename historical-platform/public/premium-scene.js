(()=>{'use strict';
const cache=new Map(),requests=new Map();
const retryDelays=[1000,3000];
function valid(s){return s&&['aurora','eclipse','orbit'].includes(s.theme)&&/^#[a-f0-9]{6}$/i.test(s.accent)&&[0,1,2].includes(s.moons)&&Object.entries({surface:['original','volcanic','glacial','biolume','obsidian'],rings:['inherit','none','halo','double','dust','silk','asteroid'],atmosphere:['soft','vivid','ion'],lighting:['studio','sunrise','dusk'],accessory:['none','satellites','station','beacons'],moonStyle:['rocky','ice','charcoal']}).every(([k,v])=>s[k]===undefined||v.includes(s[k]));}
function background(ctx,w,h,s,t=0){if(!valid(s))return;ctx.save();
const bloom=(x,y,r,color,a)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color+a);g.addColorStop(.4,color+'15');g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);};
bloom(w*.69,h*.31,w*.65,s.accent,'35');bloom(w*.2,h*.64,w*.48,s.surface==='obsidian'?'#81622d':'#6356c9',s.surface==='obsidian'?'15':'25');
if(s.theme==='aurora'){ctx.globalCompositeOperation='screen';for(let j=0;j<20;j++){ctx.beginPath();const y=h*(.08+j*.011);ctx.moveTo(-w*.1,y);ctx.bezierCurveTo(w*.26,h*(.55+Math.sin(t*.13+j*.08)*.07),w*.62,h*(-.13+j*.018),w*1.1,h*(.12+j*.012));ctx.strokeStyle=s.accent+(j%3===0?'0c':'06');ctx.lineWidth=h*(.025+j*.0008);ctx.stroke();}ctx.globalCompositeOperation='source-over';}
if(s.theme==='eclipse'){bloom(w*.64,h*.22,w*.32,'#ffc485','27');for(let j=0;j<22;j++){const a=j*2.399;ctx.beginPath();ctx.moveTo(w*.5+Math.cos(a)*h*.28,h*.47+Math.sin(a)*h*.28);ctx.lineTo(w*.5+Math.cos(a)*h*(.34+.08*Math.sin(j)),h*.47+Math.sin(a)*h*(.34+.08*Math.sin(j)));ctx.strokeStyle=s.accent+'09';ctx.lineWidth=4;ctx.stroke();}}
if(s.theme==='orbit'){ctx.translate(w*.51,h*.48);for(let i=0;i<4;i++){const rx=w*(.29+i*.047),ry=h*(.14+i*.055),tilt=-.45+i*.13;ctx.beginPath();ctx.ellipse(0,0,rx,ry,tilt,0,Math.PI*2);ctx.strokeStyle=s.accent+(i===1?'45':'17');ctx.lineWidth=1.2;ctx.setLineDash(i===2?[3,12]:[]);ctx.stroke();const a=t*.06+i*2,x=Math.cos(a)*rx,y=Math.sin(a)*ry;ctx.beginPath();ctx.arc(x*Math.cos(tilt)-y*Math.sin(tilt),x*Math.sin(tilt)+y*Math.cos(tilt),i===1?3:2,0,Math.PI*2);ctx.fillStyle=s.accent;ctx.shadowBlur=12;ctx.shadowColor=s.accent;ctx.fill();ctx.shadowBlur=0;}ctx.setLineDash([]);}
ctx.restore();}
function foreground(ctx,w,h,s,t=0,cx=w/2,cy=h/2,r=h*.26,options={}){if(!valid(s))return;ctx.save();
 if(s.theme==='eclipse'){ctx.beginPath();ctx.arc(cx,cy,r*1.035,Math.PI*.95,Math.PI*1.94);ctx.strokeStyle=s.accent+'aa';ctx.lineWidth=Math.max(2,r*.017);ctx.shadowBlur=r*.15;ctx.shadowColor=s.accent;ctx.stroke();ctx.shadowBlur=0;}
 // Occlude far-side companions against the actual planet, including exports.
 const behind=fn=>{ctx.save();ctx.beginPath();ctx.rect(0,0,w,h);ctx.moveTo(cx+r,cy);ctx.arc(cx,cy,r,0,Math.PI*2,true);ctx.clip();fn();ctx.restore();};
 for(let i=0;i<s.moons;i++){
  const angle=t*.035+(i?2.65:-.7),depth=Math.sin(angle),x=cx+Math.cos(angle)*r*(i?1.68:1.85),y=cy+depth*r*(i?.65:.85),mr=r*(i?.09:.135);
  const moon=()=>{const finish=s.moonStyle||'rocky',design=finish==='ice'?'solar-europa':'solar-moon',settings={lighting:s.lighting||'studio',rings:'none',optics:'atlas',...(finish==='charcoal'?{surface:'obsidian',accent:'#a8b9c6'}:{})};if(window.ParallaxPlanetRenderer?.draw(ctx,x,y,mr,design,t*.7,settings))return;ctx.beginPath();ctx.arc(x,y,mr,0,Math.PI*2);const g=ctx.createRadialGradient(x-mr*.4,y-mr*.4,0,x+mr*.5,y+mr*.5,mr*2);g.addColorStop(0,finish==='ice'?'#e0f4ff':finish==='charcoal'?'#667580':'#e1ded7');g.addColorStop(.4,finish==='ice'?'#7aa4bc':finish==='charcoal'?'#273441':'#8e9396');g.addColorStop(1,'#070d19');ctx.fillStyle=g;ctx.fill();};
  if(depth<0)behind(moon);else moon();
 }
 const accessory=s.accessory||'none',count=accessory==='satellites'?2:accessory==='beacons'?3:accessory==='station'?1:0;
 for(let i=0;i<count;i++){
  const a=t*.045+i*2.4+.5,x=cx+Math.cos(a)*r*1.68,y=cy+Math.sin(a)*r*.56,unit=Math.max(2,r*.027);
  const drawAccessory=()=>{ctx.save();ctx.translate(x,y);ctx.rotate(-.25+Math.cos(a)*.18);ctx.lineWidth=Math.max(.7,r*.003);ctx.strokeStyle=s.accent+'aa';ctx.fillStyle='#172b3b';
   if(accessory==='station'){
    ctx.save();ctx.scale(1,.46);ctx.beginPath();ctx.arc(0,0,unit*3.1,0,Math.PI*2);ctx.strokeStyle='#c4d6de';ctx.lineWidth=unit*.65;ctx.stroke();ctx.lineWidth=Math.max(.7,r*.003);ctx.strokeStyle=s.accent;ctx.beginPath();ctx.arc(0,0,unit*3.1,0,Math.PI*1.8);ctx.stroke();ctx.restore();
    ctx.fillStyle='#b8c8cf';ctx.fillRect(-unit*.6,-unit*2.2,unit*1.2,unit*4.4);ctx.fillStyle='#293e51';ctx.fillRect(-unit*4,-unit*.35,unit*8,unit*.7);
   }else if(accessory==='satellites'){
    for(const side of [-1,1]){const px=side<0?-unit*3.7:unit*1.3;ctx.fillRect(px,-unit,unit*2.4,unit*2);ctx.strokeRect(px,-unit,unit*2.4,unit*2);ctx.beginPath();ctx.moveTo(px+unit*1.2,-unit);ctx.lineTo(px+unit*1.2,unit);ctx.moveTo(px,0);ctx.lineTo(px+unit*2.4,0);ctx.stroke();}
    ctx.fillStyle='#cfdbdf';ctx.fillRect(-unit*.65,-unit*.9,unit*1.3,unit*1.8);ctx.beginPath();ctx.moveTo(0,-unit);ctx.lineTo(0,-unit*2);ctx.stroke();
   }else{ctx.beginPath();ctx.moveTo(0,-unit*1.5);ctx.lineTo(unit,unit);ctx.lineTo(-unit,unit);ctx.closePath();ctx.fillStyle='#a6bdc6';ctx.fill();ctx.stroke();}
   ctx.beginPath();ctx.arc(0,0,Math.max(.9,unit*.24),0,Math.PI*2);ctx.fillStyle=s.accent;ctx.shadowBlur=unit;ctx.shadowColor=s.accent;ctx.fill();ctx.restore();
  };if(Math.sin(a)<0)behind(drawAccessory);else drawAccessory();
 }

 if(options.frame!==false){ctx.strokeStyle=s.accent+'55';ctx.lineWidth=2;const pad=Math.min(w,h)*.037,len=Math.min(w,h)*.045;for(const [x,y,sx,sy]of [[pad,pad,1,1],[w-pad,pad,-1,1],[pad,h-pad,1,-1],[w-pad,h-pad,-1,-1]]){ctx.beginPath();ctx.moveTo(x,y+sy*len);ctx.lineTo(x,y);ctx.lineTo(x+sx*len,y);ctx.stroke();}}ctx.restore();}
// Only a successful, explicit null means a standard world. Network failures
// remain retryable, and never replace the last confirmed premium design.
function status(id){return id?requests.get(id)?.status||'idle':'ready';}
function notify(id,request){for(const listener of request.listeners){try{listener(id)}catch{/* A view error must not change the saved-design result. */}}}
function record(id,done){let request=requests.get(id);if(!request){request={status:'idle',promise:null,listeners:new Set()};requests.set(id,request)}if(typeof done==='function')request.listeners.add(done);return request;}
async function fetchStyle(id){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch('/api/premium/world?project='+encodeURIComponent(id),{signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw Error('Saved design unavailable');
  const data=await response.json();
  if(!data||!Object.prototype.hasOwnProperty.call(data,'style')||(data.style!==null&&!valid(data.style)))throw Error('Invalid saved design');
  return data.style;
 }finally{clearTimeout(timeout)}
}
function start(id,request){
 request.status='loading';
 // Install the shared promise before notifying views, including synchronous ones.
 request.promise=Promise.resolve().then(async()=>{
  for(let attempt=0;attempt<=retryDelays.length;attempt++){
   let style;
   try{style=await fetchStyle(id)}catch{
    if(attempt<retryDelays.length){request.status='retrying';notify(id,request);await new Promise(resolve=>setTimeout(resolve,retryDelays[attempt]));continue}
    request.status='error';request.promise=null;notify(id,request);return null;
   }
   cache.set(id,style);request.status='ready';request.promise=null;notify(id,request);return style;
  }
 });
 const promise=request.promise;notify(id,request);return promise;
}
function load(id,done){if(!id)return Promise.resolve(null);const request=record(id,done);return request.promise||(request.status==='idle'?start(id,request):Promise.resolve(cache.get(id)||null));}
function retry(id,done){if(!id)return Promise.resolve(null);const request=record(id,done);return request.promise||start(id,request);}
window.ParallaxPremiumScene={background,foreground,load,retry,status,get:id=>cache.get(id)||null,isLoading:id=>['loading','retrying'].includes(status(id)),valid};
})();
