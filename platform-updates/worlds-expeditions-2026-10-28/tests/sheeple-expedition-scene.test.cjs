const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/sheeple-expedition-scene.js'),'utf8');
const playerSource=fs.readFileSync(path.join(__dirname,'../public/sheeple-player.js'),'utf8');
const materialSource=fs.readFileSync(path.join(__dirname,'../public/expedition-materials.js'),'utf8');

function harness({width=1100,height=720,reduced=false,playable=false,audio,materials=false}={}){
  let now=100,id=0,draws=0,observer,resize;
  const frames=new Map(),statuses=[],interactions=[],gradients=[],soundStates=[],events=[],images=[];
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
    fill(){draws++;},drawImage(){},
    createLinearGradient(...v){finite(...v);return {addColorStop(n,color){assert.ok(n>=0&&n<=1);gradients.push(color);}};},
    createRadialGradient(...v){finite(...v);assert.ok(v[2]>=0&&v[5]>=0);return {addColorStop(n,color){assert.ok(n>=0&&n<=1);gradients.push(color);}};}
  };
  const media=eventTarget({matches:reduced});
  const win=eventTarget({devicePixelRatio:3,matchMedia:()=>media,requestAnimationFrame:fn=>(frames.set(++id,fn),id),cancelAnimationFrame:i=>frames.delete(i),
    IntersectionObserver:class{constructor(fn){this.fn=fn;observer=this;}observe(){}disconnect(){this.disconnected=true;}},
    ResizeObserver:class{constructor(fn){this.fn=fn;resize=this;}observe(){}disconnect(){this.disconnected=true;}}
  });
  if(audio)win.AudioContext=audio.AudioContext;
  if(materials){
    win.Image=class{constructor(){this.naturalWidth=this.naturalHeight=1254;images.push(this);}set src(value){this.url=value;}};
    vm.runInNewContext(materialSource,{window:win,module:{exports:{}},Promise});
  }
  const doc=eventTarget({defaultView:win,hidden:false,createElement(){return {width:1,height:1,getContext:type=>type==='2d'?ctx:null};}});
  const attributes=new Map(),canvas=eventTarget({ownerDocument:doc,style:{},width:0,height:0,getContext:type=>type==='2d'?ctx:null,
    getBoundingClientRect:()=>({left:0,top:0,width,height}),getAttribute:k=>attributes.get(k)??null,setAttribute:(k,v)=>attributes.set(k,v),removeAttribute:k=>attributes.delete(k),focus(){},setPointerCapture(){}});
  if(playable)vm.runInNewContext(playerSource,{window:win,module:{exports:{}}});
  vm.runInNewContext(source,{window:win,document:doc,Promise,module:{exports:{}}});
  let ready=0;
  const scene=win.ParallaxSheepleScene.create({canvas,playable,reducedMotion:reduced,onStatus:s=>statuses.push(s),onInteract:id=>interactions.push(id),onSoundState:s=>soundStates.push(s),onEvent:e=>events.push(e),onReady:()=>ready++});
  scene.setMotion(false);
  function step(ms=50){now+=ms;const batch=[...frames.values()];frames.clear();batch.forEach(fn=>fn(now));}
  function settle(){for(let i=0;i<45&&frames.size;i++)step(50);}
  return {scene,canvas,doc,win,media,frames,statuses,interactions,soundStates,events,images,step,settle,get draws(){return draws;},get ready(){return ready;},get observer(){return observer;},get resize(){return resize;},setSize(w,h){width=w;height=h;resize.fn();}};
}

function audioHarness(){
  const contexts=[],starts=[],pending=[];
  let resumeMode='resolve';
  function param(value=0){
    return {value,events:[],setValueAtTime(value,time){this.value=value;this.events.push({kind:'set',value,time});return this;},
      linearRampToValueAtTime(value,time){this.value=value;this.events.push({kind:'linear',value,time});return this;},
      exponentialRampToValueAtTime(value,time){this.value=value;this.events.push({kind:'exponential',value,time});return this;},
      setTargetAtTime(value,time,constant){this.value=value;this.events.push({kind:'target',value,time,constant});return this;},
      cancelScheduledValues(time){this.events.push({kind:'cancel',time});return this;}};
  }
  class AudioContext {
    constructor(){this.state='suspended';this.currentTime=0;this.destination={};this.nodes=[];this.resumeCalls=0;this.closeCalls=0;this.listeners=new Set();contexts.push(this);}
    addEventListener(type,fn){if(type==='statechange')this.listeners.add(fn);}
    removeEventListener(type,fn){if(type==='statechange')this.listeners.delete(fn);}
    changeState(state){this.state=state;this.onstatechange?.();for(const fn of this.listeners)fn();}
    resume(){
      this.resumeCalls++;
      if(resumeMode==='reject')return Promise.reject(new Error('Audio permission blocked'));
      if(resumeMode==='pending')return new Promise((resolve,reject)=>pending.push({resolve:()=>{if(this.state!=='closed')this.changeState('running');resolve();},reject}));
      return Promise.resolve().then(()=>{if(this.state!=='closed')this.changeState('running');});
    }
    close(){this.closeCalls++;this.changeState('closed');return Promise.resolve();}
    createNode(kind){const node={kind,connections:[],connect(target){this.connections.push(target);return target;},disconnect(){this.connections=[];}};this.nodes.push(node);return node;}
    createGain(){return Object.assign(this.createNode('gain'),{gain:param(1)});}
    createBiquadFilter(){return Object.assign(this.createNode('filter'),{frequency:param(350),Q:param(1),gain:param(0)});}
    createOscillator(){
      const context=this;
      return Object.assign(this.createNode('oscillator'),{frequency:param(440),detune:param(0),start(time){starts.push({node:this,context,state:context.state,time});},stop(){}});
    }
  }
  return {AudioContext,contexts,starts,pending,setResumeMode(value){resumeMode=value;}};
}

function playableAudioHarness(audio=audioHarness()){
  const h=harness({playable:true,reduced:true,audio});
  h.scene.flyIn();h.scene.setPlaying(true);
  return {...h,audio};
}

const flushAudio=()=>new Promise(resolve=>setImmediate(resolve));
function advanceBaaCooldown(h){for(let i=0;i<20;i++)h.step(120);}

test('a late material load redraws a paused scene without advancing the sheep or its discoveries',async()=>{
  const h=harness({playable:true,reduced:true,materials:true});h.settle();await Promise.resolve();
  assert.equal(h.images.length,1);assert.equal(h.scene.getState().materialsReady,false);
  assert.equal(h.frames.size,0);
  const before=h.draws,player=JSON.stringify(h.scene.getState().player);
  h.images[0].onload();await Promise.resolve();
  assert.equal(h.scene.getState().materialsReady,true);assert.ok(h.frames.size>0,'a completed material invalidates a static view');
  h.step();assert.ok(h.draws>before);
  assert.equal(JSON.stringify(h.scene.getState().player),player);assert.deepEqual(h.interactions,[]);
  h.scene.destroy();assert.equal(h.images[0].onload,null);assert.equal(h.frames.size,0);
});

test('fallback renders actual finite geometry immediately and announces readiness asynchronously',async()=>{
  const h=harness();assert.equal(h.scene.getState().renderMode,'canvas');assert.ok(h.draws>1500,'thousands of projected mesh faces are visible');
  assert.equal(h.ready,0);await Promise.resolve();assert.equal(h.ready,1);
  assert.ok(h.canvas.width<=1650,'Canvas DPR is capped to 1.5');assert.equal(h.scene.getState().nearby,null);
  const capture=h.scene.capture();assert.equal(capture.width,h.canvas.width);assert.equal(capture.height,h.canvas.height);h.scene.destroy();
});

test('focus never discovers; only an explicit interaction with the reachable location does',()=>{
  const h=harness();assert.equal(h.scene.interact('flock'),false);assert.equal(h.scene.focus('not-a-place'),false);
  assert.equal(h.scene.focus('flock'),true);assert.equal(h.scene.getState().nearby,null);assert.equal(h.scene.interact('flock'),false);
  assert.equal(h.scene.getState().travelling,true);
  h.canvas.dispatch('keydown',{key:'ArrowRight',preventDefault(){}});
  assert.equal(h.scene.getState().travelling,false,'manual camera input cancels travel immediately');
  assert.equal(h.scene.getState().nearby,null);h.scene.focus('flock');
  h.settle();assert.equal(h.scene.getState().nearby,'flock');assert.deepEqual(h.interactions,[]);
  assert.equal(h.scene.getState().travelling,false);
  assert.equal(h.scene.interact('signal'),false);assert.equal(h.scene.interact(),true);assert.deepEqual(h.interactions,['flock']);
  h.scene.focus('signal');assert.equal(h.scene.interact('flock'),false);h.settle();assert.equal(h.scene.interact('signal'),true);
  h.scene.destroy();
});

test('all three destinations are reachable on a small mobile screen with reduced motion',()=>{
  const h=harness({width:390,height:700,reduced:true});
  for(const id of ['flock','signal','bell']){assert.equal(h.scene.focus(id),true);assert.equal(h.scene.getState().nearby,id);assert.equal(h.scene.getState().arriving,false);assert.equal(h.scene.interact(id),true);}
  assert.deepEqual(h.interactions,['flock','signal','bell']);h.scene.reset();assert.equal(h.scene.getState().location,null);assert.equal(h.scene.interact('bell'),false);h.scene.destroy();
});

test('slow Canvas frames do not stretch camera travel beyond its wall-time duration',()=>{
  const h=harness();h.scene.focus('bell');h.step(50);
  h.step(500);h.step(500);assert.equal(h.scene.getState().nearby,null);h.step(500);
  assert.equal(h.scene.getState().nearby,'bell');assert.deepEqual(h.interactions,[]);
  h.scene.flyIn();assert.equal(h.scene.getState().arriving,true);h.step(50);
  for(let i=0;i<8;i++)h.step(500);
  assert.equal(h.scene.getState().arriving,false);assert.equal(h.scene.getState().location,null);h.scene.destroy();
});

test('skipping arrival ends navigation without awarding discovery and the reduced version is instant',()=>{
  const h=harness();h.scene.flyIn();assert.equal(h.scene.getState().arriving,true);assert.equal(h.scene.interact('flock'),false);
  h.scene.skipArrival();assert.equal(h.scene.getState().arriving,false);assert.equal(h.scene.getState().nearby,null);assert.deepEqual(h.interactions,[]);h.scene.destroy();
  const r=harness({reduced:true});r.scene.flyIn();assert.equal(r.scene.getState().arriving,false);assert.equal(r.scene.getState().camera.distance,34);r.scene.destroy();
});

test('visibility, offscreen suspension and reduced-motion changes stop ambient work',()=>{
  const h=harness();h.scene.setMotion(true);h.step();assert.ok(h.frames.size>0);
  h.doc.hidden=true;h.doc.dispatch('visibilitychange');assert.equal(h.frames.size,0);
  h.doc.hidden=false;h.doc.dispatch('visibilitychange');assert.ok(h.frames.size>0);
  h.observer.fn([{isIntersecting:false}]);assert.equal(h.frames.size,0);h.observer.fn([{isIntersecting:true}]);assert.ok(h.frames.size>0);
  h.scene.focus('signal');h.media.matches=true;h.media.dispatch('change',{matches:true});assert.equal(h.scene.getState().nearby,'signal');assert.equal(h.scene.getState().motion,false);
  h.settle();assert.equal(h.frames.size,0);h.scene.setMotion(true);assert.equal(h.scene.getState().motion,false);
  h.media.matches=false;h.media.dispatch('change',{matches:false});assert.equal(h.scene.getState().motion,true);h.scene.destroy();
});

test('keyboard interactions remain gated, zooming away removes reachability, and teardown is complete',async()=>{
  const h=harness({reduced:true});const key=key=>h.canvas.dispatch('keydown',{key,preventDefault(){}});
  key('Enter');assert.deepEqual(h.interactions,[]);h.scene.focus('flock');key('e');assert.deepEqual(h.interactions,['flock']);
  for(let i=0;i<14;i++)key('-');assert.equal(h.scene.getState().nearby,null);key('Enter');assert.deepEqual(h.interactions,['flock']);
  assert.ok(h.canvas.listenerCount()>0);h.scene.destroy();h.scene.destroy();assert.equal(h.canvas.listenerCount(),0);assert.equal(h.win.listenerCount(),0);assert.equal(h.doc.listenerCount(),0);assert.equal(h.media.listenerCount(),0);
  assert.equal(h.frames.size,0);assert.equal(h.observer.disconnected,true);assert.equal(h.resize.disconnected,true);assert.equal(h.scene.capture(),null);assert.equal(h.scene.focus('bell'),false);
  await Promise.resolve();assert.equal(h.ready,0,'destroyed scenes cannot emit a late ready callback');
});

test('playable mission selection sets a waypoint without moving the sheep or camera',()=>{
  const h=harness({playable:true,reduced:true});h.scene.flyIn();h.settle();
  const before=h.scene.getState();
  for(const id of ['signal','bell','flock']){
    assert.equal(h.scene.focus(id),true);h.settle();
    const after=h.scene.getState();
    assert.equal(after.location,id);assert.equal(after.travelling,false);
    assert.equal(JSON.stringify(after.player),JSON.stringify(before.player),'waypoints cannot move or alter the player');
    assert.equal(JSON.stringify(after.camera),JSON.stringify(before.camera),'waypoints cannot teleport the camera');
    assert.equal(h.scene.interact(id),false,'a selected mission is not an interaction');
  }
  assert.deepEqual(h.interactions,[]);h.scene.destroy();
});

test('held W, key release, and jumping work with reduced ambient motion',()=>{
  const h=harness({playable:true,reduced:true});h.scene.flyIn();h.scene.setPlaying(true);
  const key=(value,repeat=false)=>h.canvas.dispatch('keydown',{key:value,repeat,preventDefault(){}});
  const before=h.scene.getState().player;
  key('W');for(let i=0;i<10;i++)h.step(120);
  const moving=h.scene.getState();
  assert.equal(moving.motion,false);assert.equal(moving.reducedMotion,true);
  assert.ok(moving.player.z<before.z-2,'held W advances the actual sheep');
  assert.ok(Math.abs(moving.player.x-before.x)<1e-8,'forward follows the initial camera direction');
  assert.ok(moving.player.speed>3.7);
  h.win.dispatch('keyup',{key:'W'});for(let i=0;i<8;i++)h.step(120);
  const stopped=h.scene.getState().player;
  assert.equal(stopped.speed,0,'key release stops held movement');
  for(let i=0;i<3;i++)h.step(120);
  assert.equal(h.scene.getState().player.z,stopped.z,'no stale key continues movement');
  key(' ');key(' ',true);for(let i=0;i<4;i++)h.step(120);
  assert.ok(h.scene.getState().player.height>.3,'jump physics still runs when ambient motion is reduced');
  assert.equal(h.scene.getState().player.jumpCount,1,'a repeated key does not double-jump');
  for(let i=0;i<12;i++)h.step(120);
  assert.equal(h.scene.getState().player.grounded,true);assert.equal(h.scene.getState().player.height,0);
  assert.deepEqual(h.interactions,[]);h.scene.destroy();
});

test('pausing playable controls clears held keys and refuses actions until resumed',()=>{
  const h=harness({playable:true,reduced:true});h.scene.flyIn();h.scene.setPlaying(true);
  h.canvas.dispatch('keydown',{key:'w',preventDefault(){}});for(let i=0;i<6;i++)h.step(120);
  h.scene.setPlaying(false);const paused=h.scene.getState().player;
  assert.equal(paused.speed,0);assert.equal(paused.enabled,false);
  assert.equal(h.scene.jump(),false);assert.equal(h.scene.baa(),false);assert.equal(h.scene.interact('flock'),false);
  h.canvas.dispatch('keydown',{key:'w',preventDefault(){}});h.scene.setMove(1,1);
  for(let i=0;i<4;i++)h.step(120);
  assert.equal(JSON.stringify(h.scene.getState().player),JSON.stringify(paused),'paused actions cannot change the player or mission progress');
  h.scene.setPlaying(true);for(let i=0;i<8;i++)h.step(120);
  const resumed=h.scene.getState().player;
  assert.equal(resumed.x,paused.x);assert.equal(resumed.z,paused.z);assert.equal(resumed.speed,0,'resuming clears both keyboard and touch input');
  assert.deepEqual(h.interactions,[]);h.scene.destroy();
});

test('the scene awards the flock only after physically approaching and using baa',()=>{
  const h=harness({playable:true,reduced:true});h.scene.flyIn();h.scene.setPlaying(true);
  assert.equal(h.scene.baa(),true);assert.deepEqual(h.interactions,[],'a remote baa does not complete the flock mission');
  h.scene.focus('flock');assert.equal(h.scene.interact('flock'),false);
  h.canvas.dispatch('keydown',{key:'e',preventDefault(){}});assert.deepEqual(h.interactions,[]);
  h.canvas.dispatch('keydown',{key:'w',preventDefault(){}});for(let i=0;i<15;i++)h.step(120);
  h.win.dispatch('keyup',{key:'w'});for(let i=0;i<7;i++)h.step(120);
  assert.equal(h.scene.getState().nearby,'flock','the player reached the flock through movement');
  assert.deepEqual(h.interactions,[],'arrival alone is not a mission action');
  h.canvas.dispatch('keydown',{key:'e',preventDefault(){}});assert.deepEqual(h.interactions,[],'a generic prompt cannot replace the baa mission');
  h.canvas.dispatch('keydown',{key:'b',preventDefault(){}});
  assert.deepEqual(h.interactions,['flock']);
  assert.equal(h.scene.getState().player.completed.join(','),'flock');
  for(let i=0;i<9;i++)h.step(120);h.scene.baa();
  assert.deepEqual(h.interactions,['flock'],'repeated baas cannot duplicate completion');
  h.scene.destroy();
});

for(const input of ['Baa button API','keyboard B'])test(`${input} enables a first bleat only after audio is running`,async()=>{
  const h=playableAudioHarness();
  h.scene.setSound(null);
  assert.equal(h.soundStates.at(-1).status,'ready');
  assert.equal(h.audio.contexts.length,0,'entering the world does not start browser audio');
  h.scene.jump();
  assert.equal(h.audio.contexts.length,0,'automatic sound effects cannot opt the player into audio');
  if(input==='keyboard B')h.canvas.dispatch('keydown',{key:'b',preventDefault(){}});
  else assert.equal(h.scene.baa(),true);
  assert.equal(h.audio.contexts.length,1,'the real Baa gesture creates one audio context');
  assert.equal(h.audio.contexts[0].resumeCalls,1,'audio resume starts synchronously in the gesture');
  assert.equal(h.audio.starts.length,0,'a suspended context cannot receive a queued bleat');
  await flushAudio();
  assert.ok(h.audio.starts.length>0,'the Baa action actually schedules sound after resume');
  assert.ok(h.audio.starts.every(start=>start.state==='running'));
  assert.equal(h.soundStates.at(-1).status,'on');
  assert.equal(h.soundStates.at(-1).enabled,true);
  const starts=h.audio.starts.length;
  h.canvas.dispatch('keydown',{key:'b',repeat:true,preventDefault(){}});
  assert.equal(h.audio.starts.length,starts,'held key repeat cannot duplicate the bleat');
  h.scene.destroy();
});

test('an explicit mute is respected by both Baa button and keyboard actions',async()=>{
  const h=playableAudioHarness();
  h.scene.setSound(false);
  assert.equal(h.scene.baa(),true,'muting does not block the sheep action');
  advanceBaaCooldown(h);
  h.canvas.dispatch('keydown',{key:'b',preventDefault(){}});
  await flushAudio();
  assert.equal(h.audio.contexts.length,0,'a deliberately muted Baa never opens audio');
  assert.equal(h.audio.starts.length,0);
  assert.equal(h.soundStates.at(-1).preference,'off');
  assert.equal(h.soundStates.at(-1).status,'muted');
  assert.equal(h.soundStates.at(-1).enabled,false);
  h.scene.destroy();
});

test('muting cuts the audible output and prevents subsequent Baa effects',async()=>{
  const h=playableAudioHarness();
  h.scene.baa();await flushAudio();
  const context=h.audio.contexts[0];
  const output=context.nodes.find(node=>node.kind==='gain'&&node.connections.includes(context.destination));
  assert.ok(output,'all voices pass through a controllable output gain');
  assert.ok(output.gain.value>0);
  const starts=h.audio.starts.length;
  h.scene.setSound(false);
  assert.equal(output.gain.value,0,'mute silences a bleat already in progress');
  advanceBaaCooldown(h);h.scene.baa();await flushAudio();
  assert.equal(h.audio.starts.length,starts,'muted Baa cannot start another sound');
  assert.equal(h.soundStates.at(-1).status,'muted');
  h.scene.destroy();
});

test('muting while resume is pending cancels the waiting bleat',async()=>{
  const audio=audioHarness();audio.setResumeMode('pending');
  const h=playableAudioHarness(audio);
  h.scene.baa();
  assert.equal(audio.pending.length,1);
  assert.equal(audio.starts.length,0);
  assert.equal(h.soundStates.at(-1).status,'starting');
  h.scene.setSound(false);
  audio.pending[0].resolve();await flushAudio();
  assert.equal(audio.starts.length,0,'a late audio resume cannot undo explicit mute');
  assert.equal(h.soundStates.at(-1).status,'muted');
  assert.equal(h.soundStates.at(-1).enabled,false);
  h.scene.destroy();
});

test('a failed audio resume reports blocked and a later Baa can retry',async()=>{
  const audio=audioHarness();audio.setResumeMode('reject');
  const h=playableAudioHarness(audio);
  h.scene.baa();await flushAudio();
  assert.equal(audio.starts.length,0);
  assert.equal(h.soundStates.at(-1).status,'blocked');
  assert.equal(h.soundStates.at(-1).enabled,false);
  assert.ok(h.events.some(event=>event.type==='hint'&&event.message),'blocked audio has a visible recovery hint');
  audio.setResumeMode('resolve');advanceBaaCooldown(h);
  assert.equal(h.scene.baa(),true);await flushAudio();
  assert.equal(audio.contexts.length,1,'retry reuses the available context');
  assert.equal(audio.contexts[0].resumeCalls,2);
  assert.ok(audio.starts.length>0);
  assert.equal(h.soundStates.at(-1).status,'on');
  h.scene.destroy();
});

test('a Baa gesture recovers audio interrupted after an earlier successful bleat',async()=>{
  const h=playableAudioHarness();
  h.scene.baa();await flushAudio();advanceBaaCooldown(h);
  const context=h.audio.contexts[0],starts=h.audio.starts.length;
  context.changeState('suspended');
  h.scene.baa();
  assert.equal(context.resumeCalls,2,'a new gesture retries the suspended context');
  assert.equal(h.audio.starts.length,starts,'no sound is queued during suspension');
  await flushAudio();
  assert.ok(h.audio.starts.length>starts);
  assert.ok(h.audio.starts.every(start=>start.state==='running'));
  assert.equal(h.soundStates.at(-1).status,'on');
  h.scene.destroy();
});

test('a stale rejected resume cannot mute audio after a newer gesture succeeds',async()=>{
  const audio=audioHarness();audio.setResumeMode('pending');
  const h=playableAudioHarness(audio);
  h.scene.baa();advanceBaaCooldown(h);
  audio.setResumeMode('resolve');h.scene.baa();await flushAudio();
  assert.equal(h.soundStates.at(-1).status,'on');
  assert.ok(audio.starts.length>0,'the second gesture recovers while the first is pending');
  audio.pending[0].reject(new Error('The old resume was blocked'));await flushAudio();
  assert.equal(h.soundStates.at(-1).status,'on','an obsolete failure cannot overwrite a successful retry');
  assert.equal(h.soundStates.at(-1).enabled,true);
  const context=audio.contexts[0],output=context.nodes.find(node=>node.kind==='gain'&&node.connections.includes(context.destination));
  assert.ok(output.gain.value>0,'an obsolete failure cannot silence the active output');
  h.scene.destroy();
});

test('destroying a scene prevents a late resume from starting sound or updating the UI',async()=>{
  const audio=audioHarness();audio.setResumeMode('pending');
  const h=playableAudioHarness(audio);
  h.scene.baa();h.scene.destroy();
  const notifications=h.soundStates.length;
  audio.pending[0].resolve();await flushAudio();
  assert.equal(audio.starts.length,0);
  assert.equal(audio.contexts[0].closeCalls,1);
  assert.equal(h.soundStates.length,notifications,'the destroyed scene cannot emit late audio state');
});

test('unsupported browser audio is reported without stopping sheep controls',async()=>{
  const h=harness({playable:true,reduced:true});
  h.scene.flyIn();h.scene.setPlaying(true);
  assert.equal(h.scene.baa(),true);await flushAudio();
  assert.equal(h.soundStates.at(-1).status,'unavailable');
  assert.equal(h.soundStates.at(-1).enabled,false);
  assert.ok(h.events.some(event=>event.type==='hint'&&/sound|audio/i.test(event.message)));
  assert.equal(h.scene.jump(),true,'audio support is optional for exploring');
  h.scene.destroy();
});
