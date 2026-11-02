const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'../public',p),'utf8');
function load(terrain){const c={window:{},module:{exports:{}}};if(terrain)vm.runInNewContext(read('assets/terrain/gaea-river.js'),c);vm.runInNewContext(read('desert-world.js'),c);return c.module.exports;}
const before=load(false),world=load(true);
test('Gaea erosion changes slopes while keeping the region boundary continuous',()=>{
 let changed=0,max=0;
 for(let z=-64;z<=128;z+=2)for(let x=-64;x<=128;x+=2){const d=world.height(x,z)-before.height(x,z);assert.ok(Number.isFinite(d));max=Math.max(max,Math.abs(d));if(Math.abs(d)>.02)changed++;}
 assert.ok(changed>1000);assert.ok(max<2);
 for(let t=-64;t<=128;t+=3)for(const [x,z]of[[-64,t],[128,t],[t,-64],[t,128]])assert.equal(world.height(x,z),before.height(x,z));
});
test('Camp foundations, bridge deck and river waterline remain aligned',()=>{
 for(const [x,z]of [[0,-8],[-4.5,-10.5],[3.5,-13],[30,22],[37,22],[44,22]])assert.equal(world.ground(x,z),before.ground(x,z));
 for(let z=-60;z<125;z+=3){const x=world.riverX(z);assert.equal(world.height(x,z),before.height(x,z));}
 for(let x=29;x<=45;x+=.5)assert.ok(world.canWalk(x,22));
});
test('Walking height matches the actual one metre mesh triangles',()=>{
 for(let z=57.17;z<110;z+=3.37)for(let x=-40.23;x<100;x+=4.71){const bx=Math.floor(x),bz=Math.floor(z),u=x-bx,v=z-bz,a=world.height(bx,bz),b=world.height(bx+1,bz),c=world.height(bx,bz+1),d=world.height(bx+1,bz+1),expected=u+v<=1?a+u*(b-a)+v*(c-a):d+(1-u)*(c-d)+(1-v)*(b-d);assert.ok(Math.abs(world.ground(x,z)-expected)<1e-9);}
});
test('Worker and main thread use the same Gaea heightfield',()=>{
 const worker={module:{exports:{}},self:{},importScripts(){vm.runInNewContext(read('assets/terrain/gaea-river.js'),worker);}};
 vm.runInNewContext(read('desert-world.js'),worker);
 for(const [x,z]of[[-28,40],[70,82],[90,-20]])assert.equal(worker.module.exports.height(x,z),world.height(x,z));
});
