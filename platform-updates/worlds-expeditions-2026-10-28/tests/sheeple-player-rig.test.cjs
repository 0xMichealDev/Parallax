const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function load(name){const module={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public',name),'utf8'),{module});return module.exports;}
const {create,WORLD}=load('sheeple-player.js');
const {playerPose,terrainHeight}=load('sheeple-expedition-scene.js');
const EPS=1e-7;
const point=(p,m)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const column=(m,i)=>[m[i*4],m[i*4+1],m[i*4+2]];
const inversePoint=(p,m)=>{const d=p.map((v,i)=>v-m[12+i]);return [0,1,2].map(i=>dot(d,column(m,i))/dot(column(m,i),column(m,i)));};
const close=(a,b,label)=>assert.ok(Math.abs(a-b)<EPS,`${label}: ${a} vs ${b}`);
const samePoint=(a,b,label)=>a.forEach((v,i)=>close(v,b[i],label+' axis '+i));
const ellipsoid=(p,center,radii)=>p.reduce((sum,v,i)=>sum+((v-center[i])/radii[i])**2,0);

function inspectPose(state){
  const pose=playerPose(state),quadrants=new Set();
  assert.equal(pose.legs.length,4);
  assert.ok(pose.root.every(Number.isFinite));
  close(Math.hypot(...column(pose.root,0)),WORLD.player.scale,'player and rendered model use the same scale');
  for(const leg of pose.legs){
    assert.ok([...leg.legMatrix,...leg.hoofMatrix].every(Number.isFinite),'rendered limb transforms are finite');
    const hip=inversePoint(leg.hip,pose.root);
    assert.ok(ellipsoid(hip,[0,1.13,0],[.59,.53,.83])<.9,'upper leg stays inside the wool body');
    quadrants.add(`${Math.sign(hip[0])}:${Math.sign(hip[2])}`);
    samePoint(point([0,0,0],leg.legMatrix),leg.hip,'upper rendered leg connection');
    samePoint(point([0,-1,0],leg.legMatrix),leg.ankle,'lower rendered leg connection');
    const ankle=inversePoint(leg.ankle,leg.hoofMatrix);
    assert.ok(ellipsoid(ankle,[0,.105,0],[.13,.105,.18])<.8,'ankle remains inside the hoof');
    const legLength=Math.hypot(...leg.hip.map((v,i)=>v-leg.ankle[i]))/WORLD.player.scale;
    assert.ok(legLength>.35&&legLength<1.35,'walking and tucked jump legs stay at a plausible length');
    const axes=[0,1,2].map(i=>column(leg.legMatrix,i));
    close(Math.hypot(...axes[0]),Math.hypot(...axes[1]),'uniform scale for both renderers');
    close(Math.hypot(...axes[1]),Math.hypot(...axes[2]),'uniform scale for both renderers');
    close(dot(axes[0],axes[1]),0,'orthogonal limb transform');
    if(state.grounded)assert.ok(leg.foot[1]>=terrainHeight(leg.foot[0],leg.foot[2])-EPS,'walking hooves stay above the displayed terrain');
    else if(state.height>.3)assert.ok(leg.foot[1]>=terrainHeight(leg.foot[0],leg.foot[2])-EPS,'airborne hooves clear the terrain');
  }
  assert.equal(quadrants.size,4,'all four leg attachments remain distinct');
}

function expedition(){
  const events=[],completed=[];
  const player=create({groundHeight:terrainHeight,onEvent:event=>events.push(event),onComplete:id=>completed.push(id)});
  let ticks=0,walking=0,airborne=0;
  player.setEnabled(true);
  function step(){
    const p=player.step(1/60,0);
    assert.ok(p.y>=terrainHeight(p.x,p.z)-EPS,'player never enters the real terrain');
    if(p.grounded)close(p.y,terrainHeight(p.x,p.z),'feet rest at the displayed ground height');
    if(ticks++%6===0){inspectPose(p);if(p.grounded&&p.speed>.1)walking++;if(!p.grounded)airborne++;}
    for(const rock of WORLD.obstacles)assert.ok(Math.hypot(p.x-rock.x,p.z-rock.z)>=rock.radius+WORLD.player.radius-EPS,'route never clips a solid prop');
    return p;
  }
  function run(seconds){for(let i=0;i<Math.ceil(seconds*60);i++)step();}
  function walkTo(x,z){
    for(let i=0;i<1600;i++){
      const p=player.getState(),dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);
      if(d<.035&&p.speed<.08){player.setMove(0,0);return;}
      const magnitude=Math.min(1,d/.6);
      player.setMove(d?dx/d*magnitude:0,d?-dz/d*magnitude:0);step();
    }
    assert.fail(`Mission route is blocked at ${x},${z}; player ${JSON.stringify(player.getState())}`);
  }
  return {player,events,completed,run,walkTo,get samples(){return {walking,airborne};}};
}

test('the playable route reaches the board and all three missions on the actual terrain with attached limbs',()=>{
  const h=expedition();
  inspectPose(h.player.getState());
  h.walkTo(WORLD.board.x,WORLD.board.z+1.9);
  assert.equal(h.player.getState().nearby,'board');assert.equal(h.player.interact(),true);
  assert.equal(h.events.filter(event=>event.type==='board').length,1);
  h.walkTo(WORLD.flock.x,WORLD.flock.z+1.2);
  assert.deepEqual(h.completed,[]);h.player.baa();assert.deepEqual(h.completed,['flock']);
  for(const [index,spark]of WORLD.sparks.entries()){
    h.walkTo(spark.x,spark.z);assert.equal(h.player.getState().sparks[index],false);
    assert.equal(h.player.jump(),true);inspectPose(h.player.getState());h.run(1.3);
    assert.equal(h.player.getState().sparks[index],true);assert.equal(h.player.getState().grounded,true);
  }
  h.walkTo(WORLD.signal.x,WORLD.signal.z+1.4);h.player.interact();
  assert.deepEqual(h.completed,['flock','signal']);
  h.walkTo(-3,-4);h.walkTo(WORLD.bell.x,-5);h.walkTo(WORLD.bell.x,WORLD.bell.z+1.1);
  assert.equal(h.player.getState().nearby,'bell');assert.equal(h.player.jump(),true);h.run(1.4);
  assert.deepEqual(h.completed,['flock','signal','bell']);
  assert.ok(h.samples.walking>25&&h.samples.airborne>20,'the route checks moving and airborne poses, not just a static sheep');
});

test('the board and arch sides are solid while their useful approach spaces stay reachable',()=>{
  const h=expedition();
  h.walkTo(WORLD.board.x,WORLD.board.z+1.9);h.player.setMove(0,1);h.run(1.5);
  const boardState=h.player.getState();
  close(Math.hypot(boardState.x-WORLD.board.x,boardState.z-WORLD.board.z),.9+WORLD.player.radius,'the board stops forward motion at its surface');
  assert.ok(boardState.z>WORLD.board.z,'approaching the front cannot pass through the board');
  assert.equal(boardState.nearby,'board');assert.equal(h.player.interact(),true,'the board is readable without entering it');
  h.walkTo(-8.3,-3.5);h.walkTo(-10.45,-4.6);h.player.setMove(0,1);h.run(1.2);
  const archState=h.player.getState();
  close(Math.hypot(archState.x+10.45,archState.z+6.6),.7+WORLD.player.radius,'arch left side is solid');
  assert.ok(archState.z>-6.6,'approaching the arch side cannot pass through its rock');
  h.walkTo(-8.3,-4.5);h.walkTo(-8.3,-8);
  assert.equal(h.player.getState().nearby,'bell','the open arch center reaches the bell clearing');
});
