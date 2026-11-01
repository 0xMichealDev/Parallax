const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/rocket-state.js'),'utf8'),ctx);const R=ctx.module.exports;
test('cinematic ascent holds for countdown, accelerates continuously and reaches space once',()=>{
 const f=R.create();f.mode='cabin';assert.equal(R.launch(f,'Mars'),true);let previous=0,previousSpeed=0;const phases=new Set();
 for(let i=0;i<R.LAUNCH_DURATION*10+2;i++){R.tick(f,.1);const p=R.launchFrame(f);assert.ok(Number.isFinite(f.rise)&&f.rise>=previous&&f.rise<=100000);assert.ok(p.speed>=previousSpeed);if(f.elapsed<3)assert.equal(f.rise,0);previous=f.rise;previousSpeed=p.speed;phases.add(p.phase);}
 assert.equal(f.mode,'orbit');assert.equal(f.rise,100000);assert.equal(R.tick(f,.1),false);
 for(const p of ['COUNTDOWN','ENGINE IGNITION','CLEAR OF THE TOWER','CLOUD LAYER','UPPER ATMOSPHERE','EDGE OF SPACE'])assert.ok(phases.has(p),p);
});
test('vibration is bounded, absent in reduced motion, and fades before orbital handoff',()=>{
 for(let elapsed=0;elapsed<=22;elapsed+=.1){const f={mode:'launch',elapsed};const a=R.launchFrame(f);assert.ok(a.shake>=0&&a.shake<=.0045);assert.equal(R.launchFrame(f,false).shake,0);assert.ok(a.fade>=0&&a.fade<=1);}
 assert.equal(R.launchFrame({mode:'launch',elapsed:20}).shake,0);assert.equal(R.launchFrame({mode:'launch',elapsed:22}).fade,1);
 const f={mode:'launch',elapsed:15,rise:25000};R.exit(f);assert.equal(f.mode,'ground');assert.equal(R.launchFrame(f).active,false);assert.equal(R.launchFrame(f).fade,0);
});
test('pauses and invalid time steps do not jump the ascent',()=>{
 const f={...R.create(),mode:'launch'};for(const dt of [-1,NaN,Infinity]){R.tick(f,dt);assert.equal(f.elapsed,0);}R.tick(f,20);assert.equal(f.elapsed,.1);
});
