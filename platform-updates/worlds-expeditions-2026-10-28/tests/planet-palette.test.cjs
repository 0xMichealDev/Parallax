const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const worlds=[...JSON.parse(fs.readFileSync('public/ecosystem-worlds.json','utf8')),JSON.parse(fs.readFileSync('public/gatto-world.json','utf8'))];
const identityCodes={bonk:1,pengu:2,wif:3,popcat:4,sheeple:5,trump:6,gatto:7};

test('project palettes reach the renderer and never bleed into subsequent creator planets',()=>{
 const values={},frames=[];
 const gl=new Proxy({
  getShaderParameter:()=>true,getProgramParameter:()=>true,getUniformLocation:(_,name)=>name,
  uniform1f:(name,value)=>values[name]=value,uniform3fv:(name,value)=>values[name]=Array.from(value),
  drawArrays:()=>frames.push(structuredClone(values))
 },{get:(target,name)=>target[name]||(()=>1)});
 const canvas={getContext:()=>gl,addEventListener(){}};
 const ctx={window:{dispatchEvent(){}},document:{createElement:()=>canvas},Event:class{},Image:class{set src(value){this.onload?.();}}};
 vm.createContext(ctx);
 vm.runInContext(fs.readFileSync('public/planet-design.js','utf8'),ctx);
 vm.runInContext(fs.readFileSync('public/planet-renderer.js','utf8'),ctx);
 vm.runInContext(fs.readFileSync('public/premium-scene.js','utf8'),ctx);
 vm.runInContext(fs.readFileSync('public/community-atlas-core.js','utf8'),ctx);
 const renderer=ctx.window.ParallaxPlanetRenderer;
 const draw=style=>assert.equal(renderer.draw({drawImage(){}},200,200,100,'p-0-earth-wide-clear',6.4,style),true);
 const rgb=hex=>hex.slice(1).match(/.{2}/g).map(v=>parseInt(v,16)/255);
 for(const world of worlds){
  draw(world.style);
  assert.equal(frames.at(-1).uBrandEnabled,1);
  assert.deepEqual(frames.at(-1).uBrandPrimary,rgb(world.style.palette.primary));
  assert.deepEqual(frames.at(-1).uBrandSecondary,rgb(world.style.palette.secondary));
  assert.deepEqual(frames.at(-1).uBrandRing,rgb(world.style.palette.ring));
  assert.equal(frames.at(-1).uIdentity,identityCodes[world.id]||0,world.id+' must use its own reviewed identity');
  if(Object.hasOwn(identityCodes,world.id)){
   assert.equal(world.style.identity,world.id);
   const project=ctx.window.ParallaxCommunityCore.project({
    id:'curated-'+world.id,name:world.name,ticker:world.ticker,description:world.description||world.concept,
    color:world.design,provenance:'curated',href:'/projects/'+world.id,
    profile:{category:'token'},style:{theme:'aurora',moons:0,...world.style}
   });
   assert.equal(project.style.identity,world.id,'Atlas normalization must retain the community identity');
   draw(project.style);assert.equal(frames.at(-1).uIdentity,identityCodes[world.id]);
  }else assert.equal(world.style.identity,undefined,'Existing tool worlds must not acquire community motifs');
  draw({surface:'glacial',accent:'#42aaff'});
  assert.equal(frames.at(-1).uBrandEnabled,0);
  assert.equal(frames.at(-1).uIdentity,0,'Community identity must not leak into the next creator draw');
  assert.deepEqual(frames.at(-1).uBrandPrimary,[0,0,0]);
  assert.deepEqual(frames.at(-1).uAccent,rgb('#42aaff'));
 }
 for(const palette of [undefined,{}, {primary:'#ff8b20',secondary:'#ff4b00'}, {...worlds[0].style.palette,primary:'invalid'}]){
  draw({palette});assert.equal(frames.at(-1).uBrandEnabled,0);
 }
 for(const identity of [undefined,null,'unknown','BONK','__proto__','constructor','toString',1,{}]){
  draw({identity,surface:'original'});
  assert.equal(frames.at(-1).uIdentity,0,'Only an exact supported identity may enable a motif');
 }
 // Natural surface correction follows solar worlds across consumers; custom materials retain their profile.
 assert.equal(renderer.draw({drawImage(){}},200,200,180,'solar-pluto',2,{optics:'atlas',lighting:'dusk'}),true);
 assert.equal(frames.at(-1).uRefined,1);assert.equal(frames.at(-1).uPluto,1);
 assert.equal(frames.at(-1).uIdentity,0,'Natural worlds must reset community identity');
 assert.ok(frames.at(-1).uAir<.1);
 assert.ok(Math.abs(Math.hypot(...frames.at(-1).uLight)-1)<1e-6);
 assert.equal(renderer.draw({drawImage(){}},200,200,180,'solar-earth',2,{optics:'atlas'}),true);
 assert.equal(frames.at(-1).uPluto,0);assert.equal(frames.at(-1).uAir,1);
 draw({surface:'glacial',accent:'#42aaff'});
 assert.equal(frames.at(-1).uRefined,0);assert.equal(frames.at(-1).uPluto,0);
 assert.equal(renderer.draw({drawImage(){}},200,200,180,'p-8-earth-wide-clouds',2,{surface:'obsidian',accent:'#d7b367',rings:'double'}),true);
 assert.equal(frames.at(-1).uMaterial,4);assert.equal(frames.at(-1).uWeather,0);assert.equal(frames.at(-1).uRings,4);assert.equal(frames.at(-1).uNatural,0);assert.equal(frames.at(-1).uRefined,0);
 assert.deepEqual(frames.at(-1).uAccent,rgb('#d7b367'));
 assert.equal(renderer.draw({drawImage(){}},200,200,180,'solar-pluto',2,{}),true);
 assert.equal(frames.at(-1).uRefined,1);assert.equal(frames.at(-1).uPluto,1);
 assert.equal(renderer.draw({drawImage(){}},200,200,180,'solar-pluto',2,{surface:'glacial'}),true);
 assert.equal(frames.at(-1).uRefined,0);assert.equal(frames.at(-1).uPluto,0);
 assert.equal(renderer.draw({drawImage(){}},200,200,180,'p-3-earth-none-clouds',2,null,{profile:'studio'}),true);
 assert.equal(frames.at(-1).uRefined,1);assert.equal(frames.at(-1).uNatural,0);assert.equal(frames.at(-1).uPluto,0);
 assert.equal(renderer.draw({drawImage(){}},200,200,180,'solar-pluto',2,{surface:'original',accent:'#42aaff',atmosphere:'ion'}),true);
 assert.equal(frames.at(-1).uPluto,1);assert.equal(frames.at(-1).uNatural,0);assert.equal(frames.at(-1).uAtmosphere,2);
 assert.equal(renderer.available(),true);
});
