const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/gatto-expedition-scene.js'),'utf8');
const materialSource=fs.readFileSync(path.join(__dirname,'../public/expedition-materials.js'),'utf8');

function harness({width=1100,height=720,reduced=false,materials=false}={}){
  let now=100,id=0,draws=0,observer,resize;
  let recordColors=false;
  const frames=new Map(),statuses=[],interactions=[],gradients=[],colors=[],images=[];
  function eventTarget(object={}){
    const handlers=new Map();
    object.addEventListener=(name,callback)=>{if(!handlers.has(name))handlers.set(name,new Set());handlers.get(name).add(callback);};
    object.removeEventListener=(name,callback)=>handlers.get(name)?.delete(callback);
    object.dispatch=(name,event={})=>{for(const fn of [...(handlers.get(name)||[])])fn(event);};
    object.listenerCount=()=>[...handlers.values()].reduce((n,s)=>n+s.size,0);
    return object;
  }
  const finite=(...values)=>{for(const n of values)assert.ok(Number.isFinite(n),'rendered coordinates must be finite: '+n);};
  const ctx={
    setTransform:finite,fillRect:finite,beginPath(){},closePath(){},moveTo:finite,lineTo:finite,arc:finite,
    fill(){draws++;if(recordColors)colors.push(this.fillStyle);},drawImage(){},
    getImageData(){
      const data=new Uint8ClampedArray(256*256*4);
      for(let y=0;y<256;y++)for(let x=0;x<256;x++){
        const value=y<128?(x<128?38:205):(x<128?155:95),offset=(y*256+x)*4;
        data[offset]=value;data[offset+1]=value;data[offset+2]=value;data[offset+3]=255;
      }
      return {data};
    },
    createLinearGradient(...v){finite(...v);return {addColorStop(n,color){assert.ok(n>=0&&n<=1);gradients.push(color);}};},
    createRadialGradient(...v){finite(...v);assert.ok(v[2]>=0&&v[5]>=0);return {addColorStop(n,color){assert.ok(n>=0&&n<=1);gradients.push(color);}};}
  };
  const media=eventTarget({matches:reduced});
  const win=eventTarget({devicePixelRatio:3,matchMedia:()=>media,requestAnimationFrame:fn=>(frames.set(++id,fn),id),cancelAnimationFrame:i=>frames.delete(i),
    IntersectionObserver:class{constructor(fn){this.fn=fn;observer=this;}observe(){}disconnect(){this.disconnected=true;}},
    ResizeObserver:class{constructor(fn){this.fn=fn;resize=this;}observe(){}disconnect(){this.disconnected=true;}}
  });
  if(materials)win.Image=class{constructor(){this.naturalWidth=this.naturalHeight=1024;images.push(this);}};
  const doc=eventTarget({defaultView:win,hidden:false,createElement(){return {width:1,height:1,getContext:type=>type==='2d'?ctx:null};}});
  const attributes=new Map(),canvas=eventTarget({ownerDocument:doc,style:{},width:0,height:0,getContext:type=>type==='2d'?ctx:null,
    getBoundingClientRect:()=>({left:0,top:0,width,height}),getAttribute:k=>attributes.get(k)??null,setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k),focus(){},setPointerCapture(){}});
  const context={window:win,document:doc,Promise,module:{exports:{}}};vm.createContext(context);
  if(materials)vm.runInContext(materialSource,context);
  vm.runInContext(source,context);
  let ready=0;
  const scene=win.ParallaxGattoScene.create({canvas,reducedMotion:reduced,onStatus:s=>statuses.push(s),onInteract:id=>interactions.push(id),onReady:()=>ready++});
  scene.setMotion(false);
  function step(ms=50){now+=ms;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now));}
  function settle(){for(let i=0;i<45&&frames.size;i++)step(50);}
  return {scene,canvas,doc,win,media,frames,statuses,interactions,images,step,settle,beginColors(){colors.length=0;recordColors=true;},endColors(){recordColors=false;return colors.slice();},get draws(){return draws;},get ready(){return ready;},get observer(){return observer;},get resize(){return resize;},setSize(w,h){width=w;height=h;resize.fn();}};
}

test('fallback renders actual finite geometry immediately and announces readiness asynchronously',async()=>{
  const h=harness();assert.equal(h.scene.getState().renderMode,'canvas');assert.ok(h.draws>1500,'thousands of projected mesh faces are visible');
  assert.equal(h.ready,0);await Promise.resolve();assert.equal(h.ready,1);
  assert.ok(h.canvas.width<=1650,'Canvas DPR is capped to 1.5');assert.equal(h.scene.getState().nearby,null);
  const capture=h.scene.capture();assert.equal(capture.width,h.canvas.width);assert.equal(capture.height,h.canvas.height);h.scene.destroy();
});

test('focus never discovers; only an explicit interaction with the reachable location does',()=>{
  const h=harness();assert.equal(h.scene.interact('cats'),false);assert.equal(h.scene.focus('not-a-place'),false);
  assert.equal(h.scene.focus('cats'),true);assert.equal(h.scene.getState().nearby,null);assert.equal(h.scene.interact('cats'),false);
  assert.equal(h.scene.getState().travelling,true);
  h.canvas.dispatch('keydown',{key:'ArrowRight',preventDefault(){}});
  assert.equal(h.scene.getState().travelling,false,'manual camera input cancels travel immediately');
  assert.equal(h.scene.getState().nearby,null);h.scene.focus('cats');
  h.settle();assert.equal(h.scene.getState().nearby,'cats');assert.deepEqual(h.interactions,[]);
  assert.equal(h.scene.getState().travelling,false);
  assert.equal(h.scene.interact('lanterns'),false);assert.equal(h.scene.interact(),true);assert.deepEqual(h.interactions,['cats']);
  h.scene.focus('lanterns');assert.equal(h.scene.interact('cats'),false);h.settle();assert.equal(h.scene.interact('lanterns'),true);
  h.scene.destroy();
});

test('all three destinations are reachable on a small mobile screen with reduced motion',()=>{
  const h=harness({width:390,height:700,reduced:true});
  for(const id of ['cats','lanterns','sardine']){assert.equal(h.scene.focus(id),true);assert.equal(h.scene.getState().nearby,id);assert.equal(h.scene.getState().arriving,false);assert.equal(h.scene.interact(id),true);}
  assert.deepEqual(h.interactions,['cats','lanterns','sardine']);h.scene.reset();assert.equal(h.scene.getState().location,null);assert.equal(h.scene.interact('sardine'),false);h.scene.destroy();
});

test('slow Canvas frames do not stretch camera travel beyond its wall-time duration',()=>{
  const h=harness();h.scene.focus('sardine');h.step(50);
  h.step(500);h.step(500);assert.equal(h.scene.getState().nearby,null);h.step(500);
  assert.equal(h.scene.getState().nearby,'sardine');assert.deepEqual(h.interactions,[]);
  h.scene.flyIn();assert.equal(h.scene.getState().arriving,true);h.step(50);
  for(let i=0;i<8;i++)h.step(500);
  assert.equal(h.scene.getState().arriving,false);assert.equal(h.scene.getState().location,null);h.scene.destroy();
});

test('skipping arrival ends navigation without awarding discovery and the reduced version is instant',()=>{
  const h=harness();h.scene.flyIn();assert.equal(h.scene.getState().arriving,true);assert.equal(h.scene.interact('cats'),false);
  h.scene.skipArrival();assert.equal(h.scene.getState().arriving,false);assert.equal(h.scene.getState().nearby,null);assert.deepEqual(h.interactions,[]);h.scene.destroy();
  const r=harness({reduced:true});r.scene.flyIn();assert.equal(r.scene.getState().arriving,false);assert.equal(r.scene.getState().camera.distance,33);r.scene.destroy();
});

test('visibility, offscreen suspension and reduced-motion changes stop ambient work',()=>{
  const h=harness();h.scene.setMotion(true);h.step();assert.ok(h.frames.size>0);
  h.doc.hidden=true;h.doc.dispatch('visibilitychange');assert.equal(h.frames.size,0);
  h.doc.hidden=false;h.doc.dispatch('visibilitychange');assert.ok(h.frames.size>0);
  h.observer.fn([{isIntersecting:false}]);assert.equal(h.frames.size,0);h.observer.fn([{isIntersecting:true}]);assert.ok(h.frames.size>0);
  h.scene.focus('lanterns');h.media.matches=true;h.media.dispatch('change',{matches:true});assert.equal(h.scene.getState().nearby,'lanterns');assert.equal(h.scene.getState().motion,false);
  h.settle();assert.equal(h.frames.size,0);h.scene.setMotion(true);assert.equal(h.scene.getState().motion,false);
  h.media.matches=false;h.media.dispatch('change',{matches:false});assert.equal(h.scene.getState().motion,true);h.scene.destroy();
});

test('keyboard interactions remain gated, zooming away removes reachability, and teardown is complete',async()=>{
  const h=harness({reduced:true});const key=key=>h.canvas.dispatch('keydown',{key,preventDefault(){}});
  key('Enter');assert.deepEqual(h.interactions,[]);h.scene.focus('cats');key('e');assert.deepEqual(h.interactions,['cats']);
  for(let i=0;i<14;i++)key('-');assert.equal(h.scene.getState().nearby,null);key('Enter');assert.deepEqual(h.interactions,['cats']);
  assert.ok(h.canvas.listenerCount()>0);h.scene.destroy();h.scene.destroy();assert.equal(h.canvas.listenerCount(),0);assert.equal(h.win.listenerCount(),0);assert.equal(h.doc.listenerCount(),0);assert.equal(h.media.listenerCount(),0);
  assert.equal(h.frames.size,0);assert.equal(h.observer.disconnected,true);assert.equal(h.resize.disconnected,true);assert.equal(h.scene.capture(),null);assert.equal(h.scene.focus('sardine'),false);
  await Promise.resolve();assert.equal(h.ready,0,'destroyed scenes cannot emit a late ready callback');
});


test('three interactions produce distinct persistent scene changes without awarding on focus',()=>{
  const h=harness({reduced:true});
  assert.equal(h.scene.getState().catCount,9);
  assert.deepEqual(JSON.parse(JSON.stringify(h.scene.getState().worldState)),{catsGathered:false,lanternsLit:false,sardineFound:false});
  for(const [id,flag] of [['cats','catsGathered'],['lanterns','lanternsLit'],['sardine','sardineFound']]){
    h.scene.focus(id);assert.equal(h.scene.getState().worldState[flag],false);
    h.scene.interact(id);assert.equal(h.scene.getState().worldState[flag],true);
  }
  h.scene.reset();assert.deepEqual(JSON.parse(JSON.stringify(h.scene.getState().worldState)),{catsGathered:true,lanternsLit:true,sardineFound:true});
  assert.deepEqual(h.interactions,['cats','lanterns','sardine']);h.scene.destroy();
});

test('all nine black-cat rigs keep connected legs and grounded idle paws across gathering and animation',()=>{
  const mod={exports:{}};vm.runInNewContext(source,{module:mod});
  const {CATS,catPose,point,terrainHeight}=mod.exports;
  const near=(a,b)=>assert.ok(Math.hypot(...a.map((v,i)=>v-b[i]))<1e-8,'connected joint endpoints');
  assert.equal(CATS.length,9);
  for(const cat of CATS)for(const t of [0,.3,1,37,200])for(const gathered of [0,.25,.75,1]){
    const pose=catPose(cat,t,gathered);assert.equal(pose.legs.length,4);
    for(const limb of pose.legs){
      near(point([0,0,0],limb.legMatrix),limb.hip);
      near(point([0,-1,0],limb.legMatrix),limb.ankle);
      near(point([0,0,0],limb.pawMatrix),limb.foot);
      assert.ok(limb.foot[1]>=terrainHeight(limb.foot[0],limb.foot[2])-1e-8);
      if(gathered===0||gathered===1)assert.ok(Math.abs(limb.foot[1]-terrainHeight(limb.foot[0],limb.foot[2]))<1e-8);
    }
    near(point([0,0,0],pose.tail),point([0,1.05,-.52],pose.root));
  }
});

test('Canvas material readiness repaints a paused scene and the lantern quest changes actual surface lighting',async()=>{
  const h=harness({width:600,height:460,reduced:true,materials:true});await Promise.resolve();h.settle();
  assert.equal(h.ready,1,'The city must be playable before material images load');
  assert.equal(h.images.length,1);assert.equal(h.images[0].src,'/assets/expeditions/material-atlas-v210.webp');
  h.beginColors();h.scene.focus('lanterns');const procedural=h.endColors();
  assert.equal(h.scene.getState().nearby,'lanterns');assert.deepEqual(h.interactions,[]);
  h.beginColors();h.images[0].onload();await Promise.resolve();
  assert.equal(h.frames.size,1,'Material readiness schedules one paused redraw');h.step();const textured=h.endColors();
  assert.notDeepEqual(textured,procedural,'Ready material samples must replace the cached procedural surface colors');
  assert.equal(h.frames.size,0,'Texture readiness must not restart ambient motion');assert.deepEqual(h.interactions,[]);
  h.beginColors();assert.equal(h.scene.interact('lanterns'),true);const lit=h.endColors();
  assert.notDeepEqual(lit,textured,'Lighting the piazza must update the rendered surfaces');
  assert.equal(h.scene.getState().worldState.lanternsLit,true);assert.deepEqual(h.interactions,['lanterns']);
  const M=h.win.ParallaxExpeditionMaterials,near=moduleLighting(),far=moduleLighting([100,0,100]);
  function moduleLighting(position=[4.9,0,-2]){const mod={exports:{}};vm.runInNewContext(source,{module:mod});return mod.exports.lanternLight(M.ID.stone,[.6,.6,.6],position,[0,1,0],[0,.5,1]);}
  assert(near[0]>near[1]&&near[1]>near[2],'The new scene lighting has a warm lantern spectrum');assert(near[0]>far[0]*10,'Lantern illumination must fall off with distance');
  h.scene.destroy();assert.equal(h.images[0].onload,null);assert.equal(h.images[0].onerror,null);assert.equal(h.frames.size,0);
  const failed=harness({width:390,height:500,reduced:true,materials:true});await Promise.resolve();failed.images[0].onerror();await Promise.resolve();failed.settle();
  failed.scene.focus('cats');assert.equal(failed.scene.getState().nearby,'cats');assert.equal(failed.scene.interact('cats'),true,'A failed atlas keeps all gameplay available');failed.scene.destroy();
});
