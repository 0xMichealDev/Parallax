const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function load(file){const c={module:{exports:{}},TextDecoder,ArrayBuffer,Uint8Array,Uint16Array,Uint32Array,Float32Array,DataView};vm.runInNewContext(fs.readFileSync('public/'+file,'utf8'),c);return c.module.exports;}
const S=load('scenery-model.js'),G=load('rocket-model.js'),W=load('desert-world.js');
test('three embedded PBR assets stay within the approved 105-credit and web budgets',()=>{
 let total=0,credits=0;for(const type of ['rocks','station','lantern']){const bytes=fs.readFileSync('public/assets/scenery/'+type+'/web.glb'),m=G.parseGLB(bytes),p=JSON.parse(fs.readFileSync('public/assets/scenery/'+type+'/provenance.json'));total+=bytes.length;credits+=p.total_consumed_credits;assert.ok(m.triangles<15000);assert.equal(m.images.length,3);assert.equal(p.geometry_preserved.verified,true);assert.equal(p.web.bytes,bytes.length);assert.equal(p.tasks.length,3);
 for(const prop of W.SCENERY.filter(p=>p.type===type)){const halfX=(m.bounds.max[0]-m.bounds.min[0])/2,halfZ=(m.bounds.max[2]-m.bounds.min[2])/2,scale=prop.height/(m.bounds.max[1]-m.bounds.min[1]);assert.ok(Math.hypot(halfX,halfZ)*scale<prop.radius+.02,'collider contains asset '+type);}}
 assert.ok(total<8500000);assert.equal(credits,105);
});
test('scenery preserves trail width and placement coordinates are finite',()=>{for(const p of W.SCENERY.filter(p=>!['tent','camp','bridge'].includes(p.type))){assert.ok(W.pathClearance(p.x,p.z)>p.radius+.3,p.type+' keeps route clear');assert.ok([p.x,p.y,p.z,p.height,p.yaw,p.radius].every(Number.isFinite));}});
test('partially loaded scenery suppresses only its matching proxies and rocket range',()=>{const ranges=[{type:'rocks',start:6,count:9},{type:'station',start:30,count:6},{type:'rocket',start:60,count:12}];const result=JSON.parse(JSON.stringify(S.drawRanges(90,ranges,{rocks:true,rocket:true})));assert.deepEqual(result,[[0,6],[15,45],[72,18]]);assert.deepEqual(JSON.parse(JSON.stringify(S.drawRanges(90,ranges,{}))),[[0,90]]);});
test('camp upgrade preserves texture maps and stays within its separate 105-credit budget',()=>{
 let bytes=0,credits=0;for(const type of ['tent','camp','bridge']){const b=fs.readFileSync('public/assets/scenery/'+type+'/web.glb'),m=G.parseGLB(b),p=JSON.parse(fs.readFileSync('public/assets/scenery/'+type+'/provenance.json'));bytes+=b.length;credits+=p.total_consumed_credits;assert.ok(m.triangles<=23000);assert.equal(m.images.length,3);assert.equal(p.web.bytes,b.length);assert.equal(p.geometry_preserved.verified,true);}
 assert.ok(bytes<9500000);assert.equal(credits,105);
});
test('fitted bridge spans both banks with its broad deck following the walkable surface',()=>{
 const original=G.parseGLB(fs.readFileSync('public/assets/scenery/bridge/web.glb')),m=S.fitModel('bridge',original,W.walkingGround),p=W.SCENERY.find(p=>p.type==='bridge');
 assert.equal(m.bounds.min[0],-8.5);assert.equal(m.bounds.max[0],8.5);let deckVertices=0;
 for(let i=0;i<original.vertexCount;i++){const k=i*3;if(Math.abs(original.positions[k+1]-m.deckSourceHeight)<.004&&original.normals[k+1]>.8){assert.ok(Math.abs(m.positions[k+1]+p.y-W.walkingGround(p.x+m.positions[k],p.z))<.025);deckVertices++;}assert.ok(Number.isFinite(m.positions[k]+m.positions[k+1]+m.positions[k+2]));assert.ok(Math.abs(Math.hypot(...m.normals.subarray(k,k+3))-1)<.001);}
 assert.ok(deckVertices>100);assert.ok(m.deckSourceHeight<original.bounds.min[1]+(original.bounds.max[1]-original.bounds.min[1])*.4);
});
