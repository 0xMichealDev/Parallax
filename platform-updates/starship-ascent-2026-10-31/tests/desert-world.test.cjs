const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const context={window:{},module:{exports:{}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/desert-world.js'),'utf8'),context);
const {camera,move,ground,geometry,handGeometry,satelliteDirection}=context.module.exports;
let cachedScene;const getScene=()=>cachedScene??=geometry();
test('binoculars use a narrower field of view without changing ordinary zoom',()=>{
 const {viewLens}=context.module.exports;
 assert.ok(viewLens(1,true)<viewLens(1,false)/3);
 assert.equal(viewLens(1,true),viewLens(4,true));
 assert.ok(viewLens(4,false)<viewLens(1,false));
});
test('walking follows the viewing direction and has equal diagonal speed',()=>{
 const ahead=camera(),right=camera(),diagonal=camera();right.yaw=Math.PI/2;
 for(let i=0;i<100;i++){move(ahead,1,0,.02,false,[]);move(right,1,0,.02,false,[]);move(diagonal,1,1,.02,false,[]);}
 assert.ok(ahead.z < -5 && Math.abs(ahead.x)<.001);
 assert.ok(right.x > 5 && Math.abs(right.z)<.001);
 assert.ok(Math.abs(ahead.distance-diagonal.distance)<.00001);
 assert.ok(Math.abs(ground(ahead.x,ahead.z)-ground(ahead.x+.01,ahead.z))<.03);
});
test('obstacles stop walking through rocks and the valley boundary contains the player',()=>{
 const s=camera(),obstacle={x:0,z:-3,radius:1};
 for(let i=0;i<1000;i++)move(s,1,0,.02,true,[obstacle]);
 assert.ok(Math.hypot(s.x-obstacle.x,s.z-obstacle.z)>=1.349);
 const edge=camera();edge.x=209.95;
 move(edge,0,1,.05,true,[]);
 assert.ok(Math.hypot(edge.x,edge.z)<=210.00001);assert.equal(edge.edge,true);
 move(edge,0,-1,.05,false,[]);assert.equal(edge.edge,false);
 const before=[edge.x,edge.z];move(edge,0,0,.05,true,[]);assert.deepEqual([edge.x,edge.z],before);
});
test('scene geometry is finite and has clear starting space',()=>{
 const scene=getScene();assert.ok(scene.vertices.length/8>250000);
 assert.ok(scene.vertices.every(Number.isFinite));
 assert.ok(scene.obstacles.every(o=>Math.hypot(o.x,o.z)>o.radius+1));
 for(let i=3;i<scene.vertices.length;i+=8)if(![6,54].includes(scene.vertices[i+3]))assert.ok(Math.abs(Math.hypot(scene.vertices[i],scene.vertices[i+1],scene.vertices[i+2])-1)<.0001);
});

test('walking out of a seat restores standing height',()=>{const s=camera();s.seated=true;move(s,0,0,.02,false,[]);assert.equal(s.seated,true);move(s,1,0,.02,false,[]);assert.equal(s.seated,false);});

test('connected trails can be walked from camp to every discovery without getting stuck',()=>{
 const {trailRoute,TRAIL,ROUTES}=context.module.exports,scene=getScene();
 for(const target of TRAIL){const s=camera(),route=trailRoute(s,target);assert.ok(route.length>5,target.id+' is connected');
  for(const waypoint of route){let frames=0;while(Math.hypot(s.x-waypoint.x,s.z-waypoint.z)>.45&&Math.hypot(s.x-target.x,s.z-target.z)>2.7&&frames++<250){s.yaw=Math.atan2(waypoint.x-s.x,s.z-waypoint.z);move(s,1,0,.03,false,scene.obstacles);}assert.ok(frames<250,target.id+' blocked at '+JSON.stringify(waypoint));}
  assert.ok(Math.hypot(s.x-target.x,s.z-target.z)<3,target.id+' can be discovered');
 }
 const forecourt=ROUTES.find(p=>p.id==='campus-loop');for(const [x,z]of forecourt.points){assert.ok(Math.hypot(x,z)<205);assert.ok(scene.obstacles.every(o=>Math.hypot(x-o.x,z-o.z)>o.radius+.4),'Campus road blocked at '+x+','+z);}
});

test('the equipped viewmodel has finite geometry and satellites travel continuously',()=>{
 const hand=handGeometry();assert.ok(hand.length>1000);assert.ok(hand.every(Number.isFinite));
 for(let i=3;i<hand.length;i+=8)assert.ok(Math.abs(Math.hypot(hand[i],hand[i+1],hand[i+2])-1)<.0001);
 for(let i=0;i<3;i++){const a=satelliteDirection(4,i),b=satelliteDirection(4.1,i),c=satelliteDirection(24,i);assert.ok(Math.abs(Math.hypot(...a)-1)<.00001);assert.ok(Math.hypot(...a.map((v,j)=>v-b[j]))<.01);assert.ok(Math.hypot(...a.map((v,j)=>v-c[j]))>.01);}
});


test('river banks prevent wading while the bridge and boarding trail remain walkable',()=>{
 const W=context.module.exports,scene=getScene();
 for(const z of [4,10,40,70,100]){assert.equal(W.canWalk(W.riverX(z),z),false,'water blocks movement');assert.ok(W.ground(W.riverX(z),z)<W.waterHeight(z));}
 const s={...camera(),x:28,z:22,yaw:Math.PI/2};let previous=W.walkingGround(s.x,s.z);
 for(let i=0;i<240;i++){move(s,1,0,.03,false,scene.obstacles);const y=W.walkingGround(s.x,s.z);assert.ok(Math.abs(y-previous)<.3,'continuous bridge deck');previous=y;}
 assert.ok(s.x>45,'walked across the river');
 const p=camera(),target=W.BOARDING;for(const waypoint of W.trailRoute(p,target)){let frames=0;while(Math.hypot(p.x-waypoint.x,p.z-waypoint.z)>.40&&frames++<300){p.yaw=Math.atan2(waypoint.x-p.x,p.z-waypoint.z);move(p,1,0,.03,false,scene.obstacles);}assert.ok(frames<300,'clear boarding route');}assert.ok(Math.hypot(p.x-target.x,p.z-target.z)<.5);
});


test('the extended river has variable width, lower hills and a continuous bank trail',()=>{
 const W=context.module.exports,scene=getScene();assert.ok(W.RIVER.end-W.RIVER.start>=330);
 assert.ok(Math.hypot(W.riverX(W.RIVER.start),W.RIVER.start)>300,'source outside walkable area');
 for(let z=-6;z>-310;z-=8)assert.ok(W.ground(W.riverX(z),z)<W.waterHeight(z),'continuous upstream channel');
 for(const [x,z] of [[-64,14],[-18,55],[101,-23]])assert.ok(W.ground(x,z)<9,'low desert hills');
 for(let z=0;z<320;z+=8){assert.ok(W.ground(W.riverX(z),z)<W.waterHeight(z),'river bed below water');assert.equal(W.canWalk(W.riverX(z),z),false);}
 assert.ok(W.riverWidth(93)>W.riverWidth(22)+1.5,'wider pool downstream');
 const p={...camera(),x:47,z:22},path=W.ROUTES.find(r=>r.id==='river-walk');
 for(const [x,z] of path.points){let frames=0;while(Math.hypot(x-p.x,z-p.z)>.45&&frames++<160){p.yaw=Math.atan2(x-p.x,p.z-z);move(p,1,0,.03,false,scene.obstacles);}assert.ok(frames<160,'bank trail clear at '+x+','+z);}
 assert.ok(p.z>160);
});

test('the textured ship replaces only the old exterior once its asset is ready',()=>{
 const W=context.module.exports,scene=getScene(),total=scene.vertices.length/8,range=scene.mainRocketRange;
 assert.ok(range.start>0&&range.count>0&&range.start+range.count<total);
 const pending=W.rocketDrawRanges(total,range,false),loaded=W.rocketDrawRanges(total,range,true);
 assert.equal(pending.length,1);assert.equal(pending[0][1],total,'loading or failed assets keep the complete fallback');
 assert.equal(loaded.reduce((sum,[,count])=>sum+count,0),total-range.count);
 for(let i=range.start;i<range.start+range.count;i++)assert.ok(scene.vertices[i*8+6]<60,'the replacement never removes the boarding lift or cabin');
 const retainedKinds=new Set();for(const [start,count] of loaded)for(let i=start;i<start+count;i++)retainedKinds.add(scene.vertices[i*8+6]);
 for(const kind of [60,61,62,63,64])assert.ok(retainedKinds.has(kind),'cabin/lift material '+kind+' remains');
});

test('the wider rocket feet are solid while the complete boarding path stays clear',()=>{
 const W=context.module.exports,scene=getScene(),obstacles=W.rocketObstacles(scene.obstacles,true);
 assert.equal(W.rocketObstacles(scene.obstacles,false),scene.obstacles,'fallback has its original collision set');
 for(const foot of W.ROCKET_FEET){
  assert.ok(Math.hypot(foot.x+110,foot.z+120)+foot.radius<15.2,'foot fits the apron');
  assert.ok(Math.abs(W.walkingGround(foot.x,foot.z)-W.ground(foot.x,foot.z)-.12)<1e-6);
  const p={...camera(),x:foot.x,z:foot.z+foot.radius+2,yaw:0};
  for(let i=0;i<200;i++)move(p,1,0,.03,false,obstacles);
  assert.ok(Math.hypot(p.x-foot.x,p.z-foot.z)>=foot.radius+.349,'walking stops at the landing foot');
 }
 const p=camera();for(const waypoint of W.trailRoute(p,W.BOARDING)){let frames=0;while(Math.hypot(p.x-waypoint.x,p.z-waypoint.z)>.40&&frames++<300){p.yaw=Math.atan2(waypoint.x-p.x,p.z-waypoint.z);move(p,1,0,.03,false,obstacles);}assert.ok(frames<300,'new feet preserve the boarding route');}
 assert.ok(Math.hypot(p.x-W.BOARDING.x,p.z-W.BOARDING.z)<.5);
 const flightContext={module:{exports:{}}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/rocket-state.js'),'utf8'),flightContext);
 const flight=flightContext.module.exports;assert.equal(flight.BOARDING.x,W.BOARDING.x);assert.equal(flight.BOARDING.z,W.BOARDING.z);assert.ok(flight.board(flight.create(),p,false),'reached platform activates the actual flight sequence');
});

test('a rover can leave a foot that appears during loading and cannot re-enter it',()=>{
 const W=context.module.exports,foot=W.ROCKET_FEET[0],grace=new Set([foot]);
 const overlapping=[{x:foot.x,z:foot.z,radius:1.03}];
 assert.ok(!W.roverRocketObstacles([],true,overlapping,grace).includes(foot),'the newly loaded collider does not pin an overlapping rover');
 const clear=[{x:foot.x,z:foot.z+foot.radius+2,radius:1.03}];
 assert.ok(W.roverRocketObstacles([],true,clear,grace).includes(foot),'collision activates once the rover clears it');
 assert.ok(W.roverRocketObstacles([],true,overlapping,grace).includes(foot),'collision stays active if the rover returns');
});
