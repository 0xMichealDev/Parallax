const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
// ANGLE's Windows D3D backend rejected an integer vector-constructor overload
// during its deferred pixel-shader compilation and lost the entire GPU context.
test('floating point vector constructors do not request integer overloads',()=>{
 for(const file of ['desert-world.js','planet-renderer.js']){
  const source=fs.readFileSync(path.join(__dirname,'../public',file),'utf8');
  for(const match of source.matchAll(/\bvec[234]\(/g)){
   let depth=1,start=match.index+match[0].length;
   for(let i=start;i<source.length&&depth;i++){
    if(source[i]==='(')depth++;
    if(source[i]===')')depth--;
    if((source[i]===','&&depth===1)||depth===0){
     assert.ok(!/^\s*-?\d+\s*$/.test(source.slice(start,i)),`${file}: integer component at ${start}`);start=i+1;
    }
   }
  }
 }
});
test('flight deck aisle stays open while seats and pressure shell stop movement',()=>{
 const context={module:{exports:{}}};require('node:vm').runInNewContext(fs.readFileSync(path.join(__dirname,'../public/rocket-state.js'),'utf8'),context);const rocket=context.module.exports;
 const p={x:-110,z:-121.7,yaw:Math.PI,distance:0};
 for(let i=0;i<35;i++)rocket.cabinMove(p,1,0,.05);
 assert.ok(p.z> -119.2&&p.z<= -118.6);
 for(let i=0;i<80;i++)rocket.cabinMove(p,1,0,.05);
 assert.ok(p.z<= -118.6);
 const seated={x:-110,z:-120.4,yaw:0,distance:0};
 for(let i=0;i<80;i++)rocket.cabinMove(seated,0,-1,.05);
 assert.ok(seated.x> -110.61,'seat collision preserves the padded seat footprint');
});
