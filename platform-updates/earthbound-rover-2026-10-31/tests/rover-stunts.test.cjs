const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function load(file){const c={window:{},module:{exports:{}}};vm.runInNewContext(fs.readFileSync('public/'+file,'utf8'),c);return c.module.exports;}
const L=load('desert-life.js'),W=load('desert-world.js');
function fixture(){const life=L.create(),state=W.camera(),v=life.vehicles[0];Object.assign(state,{x:v.x,z:v.z});L.enter(life,state,v.id);return {life,state,v};}
test('stunt reaches four metres, completes one rotation, lands upright and enforces cooldown',()=>{
 for(const dt of [1/30,1/60,1/144]){const {life,v}=fixture();assert.equal(L.stuntJump(life),true);assert.equal(L.stuntJump(life),false);let apex=0,lastRoll=0;
  while(v.stunt){const p=L.stuntPose(v);apex=Math.max(apex,p.height);assert.ok(p.height>=0);assert.ok(p.roll>=lastRoll);lastRoll=p.roll;L.stuntTick(life,dt);}
  assert.ok(apex>3.99&&apex<=4);assert.ok(Math.abs(lastRoll-Math.PI*2)<.001);assert.equal(L.stuntPose(v).height,0);assert.equal(L.stuntPose(v).roll,0);assert.equal(L.stuntJump(life),false);
  for(let i=0;i<80;i++)L.stuntTick(life,dt);assert.equal(L.stuntJump(life),true);
 }
});
test('body and wheels use one shared airborne pivot and keep cached meshes',()=>{
 const {life,v}=fixture(),before=L.models(life,()=>2);L.stuntJump(life);for(let i=0;i<8;i++)L.stuntTick(life,.1);
 const airborne=L.models(life,()=>2);for(let i=0;i<5;i++){assert.equal(before[i].vertices,airborne[i].vertices);assert.deepEqual(airborne[i].pivot,airborne[0].pivot);assert.equal(airborne[i].roll,airborne[0].roll);assert.ok(Math.abs(airborne[i].y-before[i].y-4)<.001);}
 assert.ok(Math.abs(airborne[0].roll-Math.PI)<.001);for(let i=5;i<airborne.length;i++)assert.equal(airborne[i].roll||0,0);L.cancelStunts(life);assert.equal(v.stunt,null);assert.equal(L.models(life,()=>2)[0].y,2);
});
test('airborne exit is blocked and horizontal obstacle checks remain active during stunts',()=>{
 const {life,state,v}=fixture();L.stuntJump(life);assert.equal(L.exit(life,state,[]),false);
 const wall={x:v.x+Math.sin(v.yaw)*5,z:v.z-Math.cos(v.yaw)*5,radius:1};
 for(let i=0;i<100;i++){L.drive(life,state,1,0,.05,[wall],()=>0);L.stuntTick(life,.05);}
 assert.equal(v.speed,0);assert.equal(L.blocked(v,[wall],()=>0),false);assert.equal(L.exit(life,state,[wall]),true);
});
