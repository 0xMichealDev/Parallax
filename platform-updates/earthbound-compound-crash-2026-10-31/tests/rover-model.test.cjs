const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function load(file){const c={module:{exports:{}},TextDecoder,ArrayBuffer,Uint8Array,Uint16Array,Uint32Array,Float32Array,DataView};vm.runInNewContext(fs.readFileSync('public/'+file,'utf8'),c);return c.module.exports;}
const R=load('rover-model.js'),G=load('rocket-model.js'),L=load('desert-life.js');
test('the shipped rover retains PBR maps within a five-megabyte and 35k triangle budget',()=>{
 const bytes=fs.readFileSync('public/assets/rover/parallax-rover-web.glb'),raw=G.parseGLB(bytes),m=R.prepareModel(raw);
 assert.ok(bytes.length<5_000_000);assert.equal(raw.triangles,30616);assert.equal(m.triangles,raw.triangles);assert.equal(raw.images.length,3);assert.ok(raw.images.every(i=>i.bytes.length>1000));
 assert.ok(m.bounds.max[0]<=1.03&&m.bounds.min[0]>=-1.03);assert.ok(m.bounds.max[2]<2.84);assert.equal(m.bounds.min[1],0);
 assert.equal(m.parts.length,m.vertexCount);assert.ok(m.partCounts.every(n=>n>100));
 for(let i=0;i<m.indices.length;i+=3){assert.equal(m.parts[i],m.parts[i+1]);assert.equal(m.parts[i],m.parts[i+2]);}
 assert.ok(m.positions.every(Number.isFinite));assert.ok(m.normals.every(Number.isFinite));
});
test('the expedition asset replaces only Rover 01 after readiness, retaining Rover 02 and the fallback',()=>{
 const life=L.create(),ground=()=>0,normal=L.models(life,ground),enhanced=L.models(life,ground,true);
 assert.equal(normal.filter(m=>m.key==='truck-body').length,2);
 assert.equal(enhanced.filter(m=>m.key==='truck-body').length,1);
 assert.equal(enhanced.filter(m=>m.key.startsWith('truck-wheel-')).length,4);
 assert.equal(enhanced.filter(m=>m.key==='expedition-rover-lamps').length,1);
 assert.equal(enhanced.find(m=>m.key==='truck-body').x,life.vehicles[1].x);
 assert.deepEqual(L.models(life,ground).map(m=>m.key),normal.map(m=>m.key));
});
test('headlights follow the vehicle rather than the chase camera and go dark during a stunt or fallback',()=>{
 const v=L.create().vehicles[0],ground=(x,z)=>x*.1+z*.2;
 const parked=R.lightFrame(v,ground),driving=R.lightFrame(v,ground,{driving:true});
 assert.ok(parked.power[1]>0);assert.equal(driving.power[0],1);assert.equal(driving.power[1],0);
 assert.ok(Math.abs(driving.pose[2]-.1)<1e-9);assert.ok(Math.abs(driving.pose[3]-.2)<1e-9);
 v.yaw=Math.PI/2;const turned=R.lightFrame(v,ground);assert.ok(Math.abs(turned.pose[0])<1e-9);assert.equal(turned.pose[1],1);
 assert.deepEqual(Array.from(R.lightFrame(v,ground,{ready:false}).power),[0,0]);
 v.stunt={time:.8};assert.deepEqual(Array.from(R.lightFrame(v,ground,{driving:true}).power),[0,0]);
});
