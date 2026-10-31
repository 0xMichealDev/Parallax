const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
function load(name,extra={}) {
  const sandbox={module:{exports:{}},window:{},...extra};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public',name),'utf8'),sandbox);
  return sandbox.module.exports;
}
const R=load('rocket-state.js'),J=load('observatory-journey.js');
const copy=x=>JSON.parse(JSON.stringify(x));
const advance=(f,mode)=>{for(let i=0;i<1000&&f.mode!==mode;i++)R.tick(f,.1);assert.equal(f.mode,mode);};
const board=f=>R.board(f,{x:R.BOARDING.x,z:R.BOARDING.z},false);
const catalog=[{id:'saturn',name:'Saturn',rocketPlanet:'Saturn'},{id:'gatto',name:'GATTO'}];
const scope=(f=R.create(),destinations=catalog)=>({f,t:J.createTelescope({rocket:R,flight:f,destinations})});
const pose=(yaw=0)=>({x:0,y:1.7,z:0,yaw,pitch:0,fov:1});

test('v227 coordinates, default destination and initial mode remain compatible',()=>{
 assert.deepEqual(copy(R.BOARDING),{x:-105,z:-110,deck:54});assert.deepEqual(copy(R.create()),{mode:'ground',elapsed:0,rise:0,planet:'Mars'});
});
test('reviewed catalog names are filtered and de-duplicated',()=>{
 const r=load('rocket-state.js',{solarSystemWorlds:[null,{name:'Saturn'},{name:'Saturn'},{name:''}]});
 assert.deepEqual(copy(r.PLANETS),['Saturn']);assert.equal(r.create().planet,'Saturn');
});
test('empty catalogs keep the existing fallback destinations',()=>{
 assert.equal(load('rocket-state.js',{solarSystemWorlds:[]}).create().planet,'Mars');
});
test('unknown destinations cannot be selected',()=>{
 const f=R.create();assert.equal(R.selectDestination(f,'https://untrusted.example'),false);assert.equal(f.planet,'Mars');
});
test('selection works only before flight or from the cabin',()=>{
 for(const mode of ['ground','cabin']){const f={...R.create(),mode};assert.equal(R.selectDestination(f,'Saturn'),true);}
 for(const mode of ['lift','launch','orbit'])assert.equal(R.selectDestination({...R.create(),mode},'Saturn'),false);
});
test('boarding requires proximity and no active rover driving',()=>{
 assert.equal(R.board(R.create(),{x:-105,z:-110},true),false);
 assert.equal(R.board(R.create(),{x:0,z:0},false),false);assert.equal(board(R.create()),true);
});
test('non-finite or absent boarding coordinates are rejected',()=>{
 for(const p of [null,{}, {x:NaN,z:-110},{x:Infinity,z:-110},{x:-105,z:NaN}])assert.equal(R.board(R.create(),p,false),false);
});
test('lift rises monotonically and arrives in the existing cabin state',()=>{
 const f=R.create();board(f);let prev=0;
 for(let i=0;i<100&&f.mode==='lift';i++){R.tick(f,.1);if(f.mode==='lift'){assert.ok(f.rise>=prev);assert.ok(f.rise<=54);prev=f.rise;}}
 assert.equal(f.mode,'cabin');assert.equal(f.rise,0);assert.equal(f.elapsed,0);
});
test('launch is forbidden outside the cabin',()=>{
 for(const mode of ['ground','lift','launch','orbit'])assert.equal(R.launch({...R.create(),mode},'Saturn'),false);
});
test('repeat board and launch actions cannot restart an active sequence',()=>{
 const f=R.create();board(f);R.tick(f,.1);assert.equal(board(f),false);assert.equal(f.elapsed,.1);
 advance(f,'cabin');R.launch(f,'Saturn');R.tick(f,.1);assert.equal(R.launch(f,'Mars'),false);assert.equal(f.elapsed,.1);assert.equal(f.planet,'Saturn');
});
test('exiting preserves the planned destination and resets motion',()=>{
 const f=R.create('Saturn');board(f);R.tick(f,.1);R.exit(f);
 assert.deepEqual(copy(f),{mode:'ground',elapsed:0,rise:0,planet:'Saturn'});
});
test('an invalid destination is repaired on exit',()=>{
 const f={...R.create(),planet:'missing'};R.exit(f);assert.equal(f.planet,'Mars');
});
test('invalid frame times are ignored without mutating flight',()=>{
 for(const dt of [NaN,Infinity,-1,0,undefined]){const f=R.create();board(f);const before=copy(f);assert.equal(R.tick(f,dt),false);assert.deepEqual(copy(f),before);}
});
test('long frames remain capped rather than skipping the entire flight',()=>{
 const f=R.create();board(f);R.tick(f,600);assert.equal(f.elapsed,.1);assert.equal(f.mode,'lift');
});
test('complete sequence reaches orbit and does not repeat arrival',()=>{
 const f=R.create('Saturn');board(f);advance(f,'cabin');assert.equal(R.launch(f),true);advance(f,'orbit');
 assert.equal(f.planet,'Saturn');assert.equal(f.rise,1200);const before=copy(f);assert.equal(R.tick(f,.1),false);assert.deepEqual(copy(f),before);
});
test('non-finite walking input cannot poison the camera',()=>{
 for(const bad of [NaN,Infinity,undefined])for(const field of ['dt','forward','side','yaw']){
  const p={x:-110,z:-119,yaw:0,distance:0},input={dt:.02,forward:1,side:0,yaw:0};input[field]=bad;p.yaw=input.yaw;
  const before={...p};assert.equal(R.cabinMove(p,input.forward,input.side,input.dt),false);assert.deepEqual(p,before);
 }
});
test('cabin movement preserves existing bounds and normalizes diagonals',()=>{
 const a={x:-110,z:-119,yaw:0,distance:0},b={...a};assert.equal(R.cabinMove(a,1,0,.02),true);assert.equal(R.cabinMove(b,1,1,.02),true);
 assert.ok(Math.abs(a.distance-b.distance)<1e-9);
 const wall={x:-110,z:-121.99,yaw:0,distance:0};assert.equal(R.cabinMove(wall,1,0,.05),false);
 const seat={x:-111.2,z:-119.82,yaw:0,distance:0};assert.equal(R.cabinMove(seat,1,0,.05),false);
});
test('telescope entry requires proximity, ground mode and no driving',()=>{
 const {t,f}=scope();assert.equal(t.enter({x:100,z:100}),false);assert.equal(t.enter({x:NaN,z:-13}),false);
 assert.equal(t.enter({x:3.5,z:-13},true),false);f.mode='cabin';assert.equal(t.enter({x:3.5,z:-13}),false);
});
test('inspecting a world does not commit it; cancel preserves previous choice',()=>{
 const {t,f}=scope();assert.equal(t.enter({x:3.5,z:-13}),true);assert.equal(t.enter({x:3.5,z:-13}),false);
 assert.equal(t.inspect('saturn').launchable,true);assert.equal(f.planet,'Mars');t.close();assert.equal(f.planet,'Mars');assert.equal(t.commit().ok,false);
});
test('explicit telescope selection carries through boarding into launch',()=>{
 const {t,f}=scope();t.enter({x:3.5,z:-13});t.inspect('saturn');assert.equal(t.commit().ok,true);assert.equal(t.isOpen,false);
 board(f);advance(f,'cabin');R.launch(f);assert.equal(f.planet,'Saturn');
});
test('unknown IDs cannot replace a telescope selection',()=>{
 const {t}=scope();t.enter({x:3.5,z:-13});t.inspect('saturn');assert.equal(t.inspect('invented'),null);assert.equal(t.commit().ok,false);
});
test('unconnected community destinations remain explicitly unavailable for launch',()=>{
 const {t,f}=scope();t.enter({x:3.5,z:-13});assert.equal(t.inspect('gatto').launchable,false);
 assert.equal(t.commit().reason,'destination-not-connected');assert.equal(f.planet,'Mars');
});
test('a flight state change invalidates a telescope commit',()=>{
 const {t,f}=scope();t.enter({x:3.5,z:-13});t.inspect('saturn');board(f);assert.equal(t.commit().ok,false);assert.equal(f.planet,'Mars');
});
test('invalid or duplicate catalog records fail at setup',()=>{
 for(const destinations of [[{id:'x',name:'X'},{id:'x',name:'Y'}],[null],[{id:' ',name:'X'}]])assert.throws(()=>scope(R.create(),destinations));
});
test('telescope snapshots caller data instead of allowing later mutation',()=>{
 const entries=[{id:'saturn',name:'Saturn',rocketPlanet:'Saturn'}],anchor={x:3.5,z:-13};
 const f=R.create(),t=J.createTelescope({rocket:R,flight:f,destinations:entries,anchor});entries[0].rocketPlanet='Mars';anchor.x=999;
 assert.equal(t.enter({x:3.5,z:-13}),true);t.inspect('saturn');t.commit();assert.equal(f.planet,'Saturn');
});
test('camera transitions follow the short yaw arc instead of spinning',()=>{
 const a=pose(179*Math.PI/180),b={...pose(-179*Math.PI/180),x:10};const mid=J.blendCamera(a,b,.5);
 assert.ok(Math.abs(mid.yaw-Math.PI)<1e-10);assert.equal(mid.x,5);assert.equal(a.x,0);assert.equal(b.x,10);
});
test('camera interpolation is bounded and reduced motion skips the sweep',()=>{
 const a=pose(),b={...pose(),x:10};assert.equal(J.blendCamera(a,b,-1).x,0);assert.equal(J.blendCamera(a,b,2).x,10);
 assert.equal(J.blendCamera(a,b,NaN).x,0);assert.equal(J.blendCamera(a,b,.01,{reducedMotion:true}).x,10);
 assert.throws(()=>J.blendCamera({...a,x:NaN},b,.5));assert.throws(()=>J.blendCamera(a,{...b,fov:0},.5));
});
test('ambience stays silent until enabled and when hidden or flying',()=>{
 const p={x:0,z:-8};for(const opts of [{},{enabled:true,hidden:true},{enabled:true,flightMode:'cabin'}])assert.deepEqual(copy(J.ambienceTargets(p,opts)),{fire:0,wind:0});
});
test('fire gain decreases smoothly with distance and never becomes negative',()=>{
 const gains=[0,6,12,18,24,50].map(d=>J.ambienceTargets({x:d,z:-8},{enabled:true}).fire);
 assert.equal(gains[0],1);assert.equal(gains.at(-1),0);gains.forEach((g,i)=>{assert.ok(g>=0&&g<=1);if(i)assert.ok(g<=gains[i-1]);});
});
test('presentation derives countdown and arrival from the flight state',()=>{
 assert.equal(J.flightPresentation({mode:'launch',elapsed:0}).countdown,3);
 assert.equal(J.flightPresentation({mode:'launch',elapsed:2.1}).countdown,1);
 assert.equal(J.flightPresentation({mode:'launch',elapsed:7}).progress,.5);
 assert.equal(J.flightPresentation({mode:'orbit'}).stage,'arrival-ready');
});
test('helpers load without DOM, audio, network or timers',()=>{
 // The VM deliberately supplies none of these capabilities. Calls above succeed without them.
 assert.equal(typeof J.createTelescope,'function');assert.equal(typeof R.board,'function');
});
