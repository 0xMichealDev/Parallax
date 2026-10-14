(()=>{'use strict';
const cache=new Map(),pending=new Map();
function valid(s){return s&&['aurora','eclipse','orbit'].includes(s.theme)&&/^#[a-f0-9]{6}$/i.test(s.accent)&&[0,1,2].includes(s.moons);}
function background(ctx,w,h,s,t=0){if(!valid(s))return;ctx.save();const glow=ctx.createRadialGradient(w*.68,h*.43,0,w*.68,h*.43,w*.7);glow.addColorStop(0,s.accent+'22');glow.addColorStop(.7,s.accent+'08');glow.addColorStop(1,s.accent+'00');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 if(s.theme==='aurora'){for(let j=0;j<4;j++){ctx.beginPath();ctx.moveTo(-w*.1,h*(.16+j*.055));ctx.bezierCurveTo(w*.3,h*(.6+Math.sin(t*.3+j)*.05),w*.6,h*(-.12+j*.06),w*1.1,h*(.2+j*.07));ctx.strokeStyle=s.accent+['16','20','12','0d'][j];ctx.lineWidth=h*(.024+j*.008);ctx.stroke();}}
 if(s.theme==='orbit'){ctx.translate(w*.51,h*.48);for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(0,0,w*(.27+i*.047),h*(.13+i*.055),-.45+i*.13,0,Math.PI*2);ctx.strokeStyle=s.accent+(i===1?'50':'20');ctx.lineWidth=1.4;ctx.setLineDash(i===2?[4,10]:[]);ctx.stroke();}ctx.setLineDash([]);}
 ctx.restore();}
function foreground(ctx,w,h,s,t=0,cx=w/2,cy=h/2,r=h*.26){if(!valid(s))return;ctx.save();
 if(s.theme==='eclipse'){ctx.beginPath();ctx.arc(cx,cy,r*1.035,Math.PI*.95,Math.PI*1.94);ctx.strokeStyle=s.accent+'aa';ctx.lineWidth=Math.max(2,r*.017);ctx.shadowBlur=r*.15;ctx.shadowColor=s.accent;ctx.stroke();ctx.shadowBlur=0;}
 for(let i=0;i<s.moons;i++){const angle=t*.035+(i?2.65:-.7),x=cx+Math.cos(angle)*r*(i?1.68:1.85),y=cy+Math.sin(angle)*r*(i?.65:.85),mr=r*(i?.075:.11);ctx.beginPath();ctx.arc(x,y,mr,0,Math.PI*2);const g=ctx.createRadialGradient(x-mr*.4,y-mr*.4,0,x+mr*.5,y+mr*.5,mr*2);g.addColorStop(0,'#f1f3ee');g.addColorStop(.35,s.accent);g.addColorStop(1,'#070d19');ctx.fillStyle=g;ctx.fill();}
 ctx.strokeStyle=s.accent+'55';ctx.lineWidth=2;const pad=Math.min(w,h)*.037,len=Math.min(w,h)*.045;for(const [x,y,sx,sy]of [[pad,pad,1,1],[w-pad,pad,-1,1],[pad,h-pad,1,-1],[w-pad,h-pad,-1,-1]]){ctx.beginPath();ctx.moveTo(x,y+sy*len);ctx.lineTo(x,y);ctx.lineTo(x+sx*len,y);ctx.stroke();}ctx.restore();}
async function load(id,done){if(!id||cache.has(id))return;if(pending.has(id))return;pending.set(id,true);try{const r=await fetch('/api/premium/world?project='+encodeURIComponent(id),{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const data=await r.json();cache.set(id,valid(data.style)?data.style:null);done?.();}catch{cache.set(id,null);}finally{pending.delete(id);}}
window.ParallaxPremiumScene={background,foreground,load,get:id=>cache.get(id)||null,isLoading:id=>pending.has(id),valid};
})();
