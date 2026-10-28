const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');

function harness({webgl=true}={}){
 const requested=[],pending=new Map(),values={},frames=[],mipmaps=[];
 let uploaded=null;
 const gl=new Proxy({
  getShaderParameter:()=>true,getProgramParameter:()=>true,getUniformLocation:(_,name)=>name,
  uniform1f:(name,value)=>values[name]=value,uniform1i:(name,value)=>values[name]=value,uniform3fv:(name,value)=>values[name]=Array.from(value),
  texImage2D(...args){const image=args.at(-1);uploaded=image?.url||null;},
  generateMipmap(){mipmaps.push(uploaded);},drawArrays:()=>frames.push({...values})
 },{get:(target,name)=>target[name]||(()=>1)});
 const canvas={getContext:()=>webgl?gl:null,addEventListener(){}};
 const context={window:{dispatchEvent(){}},document:{createElement:()=>canvas},Event:class{},Image:class{
  set src(url){this.url=url;requested.push(url);this.naturalWidth=this.naturalHeight=1254;
   if(/-realism(?:-contour)?-v209\./.test(url))pending.set(url,this);else this.onload?.();
  }
 }};
 vm.createContext(context);vm.runInContext(fs.readFileSync('public/planet-design.js','utf8'),context);
 vm.runInContext(fs.readFileSync('public/planet-renderer.js','utf8'),context);
 const renderer=context.window.ParallaxPlanetRenderer;
 return {renderer,requested,pending,frames,mipmaps,draw(style,design='p-4-rocky-none-clear'){
  assert.equal(renderer.draw({drawImage(){}},200,200,100,design,6.4,style),true);
 }};
}

test('photographic portraits load only for the selected identity and gate live readiness',()=>{
 const h=harness(),style={identity:'bonk',surface:'original',accent:'#f6a659'};
 assert.deepEqual(h.requested,[]);
 h.draw(style);
 const portraits=h.requested.filter(url=>/-realism-v209\./.test(url));
 assert.equal(portraits.length,1);assert.match(portraits[0],/\/bonk-realism-v209\./);
 assert.equal(h.renderer.ready('p-4-rocky-none-clear',style),false);
 assert.equal(h.frames.at(-1).uHasPortrait,0);
 h.pending.get(portraits[0]).onload();h.draw(style);
 assert.equal(h.renderer.ready('p-4-rocky-none-clear',style),false,'The portrait must wait for its matching volume contour');
 assert.equal(h.frames.at(-1).uHasPortrait,0);
 const contour='/assets/globe/bonk-realism-contour-v209.png';
 assert.equal(h.requested.filter(url=>url.includes('-realism-contour-')).length,1);
 h.pending.get(contour).onload();h.draw(style);
 assert.equal(h.renderer.ready('p-4-rocky-none-clear',style),true);
 assert.equal(h.frames.at(-1).uHasPortrait,1);
 assert.equal(h.requested.filter(url=>/-realism-v209\./.test(url)).length,1);
 assert.equal(h.mipmaps.includes(portraits[0]),false,'NPOT portrait images must not use WebGL1 mipmaps');
 assert.equal(h.mipmaps.includes(contour),false,'NPOT geometry data must not use WebGL1 mipmaps');
 h.draw({surface:'original',accent:'#42aaff'});
 assert.equal(h.frames.at(-1).uHasPortrait,0,'A prior portrait must not leak into another world');
 assert.equal(h.frames.at(-1).uIdentity,0);
 assert.equal(h.frames.at(-1).uPortraitContour,0,'Inactive contour samplers need a complete bound texture');
 h.draw({identity:'wif',surface:'original',accent:'#d6a0ad'});
 assert.equal(h.requested.filter(url=>/-realism-v209\./.test(url)).length,2);
 assert.equal(h.renderer.ready('p-4-rocky-none-clear',{identity:'wif'}),false);
});

test('terrain realism is explicit and cannot recolor a real solar-system world',()=>{
 const h=harness();
 h.draw({realism:'terrain-v209',surface:'biolume',accent:'#9945ff'});
 assert.equal(h.frames.at(-1).uRealTerrain,1);
 for(const realism of [true,'terrain','unknown',undefined]){
  h.draw({realism,surface:'original',accent:'#42aaff'});
  assert.equal(h.frames.at(-1).uRealTerrain,0);
 }
 h.draw({realism:'terrain-v209',surface:'original'},'solar-earth');
 assert.equal(h.frames.at(-1).uRealTerrain,0);
 assert.equal(h.frames.at(-1).uNatural,1);
});

test('the refined SolHandle view retains exported art when WebGL is unavailable',()=>{
 const h=harness({webgl:false});
 assert.equal(h.renderer.draw({drawImage(){}},200,200,100,'p-8-rocky-thin-clear',6.4,{identity:'solhandle',realism:'terrain-v209'}),false);
 assert.equal(h.renderer.available(),false);
});

test('portrait autoplay stays within the verified turn and manual direction survives every boundary',()=>{
 const {renderer}=harness(),limit=24*Math.PI/180;
 assert.equal(renderer.isPortrait({identity:'bonk'}),true);
 for(const identity of ['gatto','solhandle','solana',undefined])assert.equal(renderer.isPortrait({identity}),false);
 for(let phase=-100;phase<=100;phase+=.17){
  const before=renderer.portraitAngle(phase);
  assert.ok(Math.abs(before)<=limit+1e-12);
  const right=renderer.portraitAngle(renderer.portraitPhaseForYaw(before+.15,phase));
  const left=renderer.portraitAngle(renderer.portraitPhaseForYaw(before-.15,phase));
  assert.ok(right>=before-1e-12,'Right input must not reverse on the descending automatic turn');
  assert.ok(left<=before+1e-12,'Left input must not reverse on the ascending automatic turn');
 }
 let phase=123;
 for(let i=0;i<30;i++)phase=renderer.portraitPhaseForYaw(renderer.portraitAngle(phase)+.15,phase);
 assert.ok(Math.abs(renderer.portraitAngle(phase)-limit)<1e-10);
 phase=renderer.portraitPhaseForYaw(renderer.portraitAngle(phase)-.15,phase);
 assert.ok(renderer.portraitAngle(phase)<limit-.14,'Reversing away from the boundary must respond immediately');
 assert.equal(renderer.clampPortraitYaw(100),limit);
 assert.equal(renderer.clampPortraitYaw(-100),-limit);
 assert.equal(renderer.portraitAngle(6.4),0,'Canonical artwork keeps its exact frontal pose');
});
