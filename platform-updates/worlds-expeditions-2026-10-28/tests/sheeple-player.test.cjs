const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const loaded={exports:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/sheeple-player.js'),'utf8'),{module:loaded});
const {create,WORLD}=loaded.exports;
const EPS=1e-7;
const close=(a,b,message)=>assert.ok(Math.abs(a-b)<EPS,`${message}: ${a} vs ${b}`);

function harness(options={}){
  const completions=[],events=[];
  const player=create({...options,onComplete:id=>completions.push(id),onEvent:event=>events.push(event)});
  player.setEnabled(true);
  function run(seconds,yaw=0){for(let i=0;i<Math.ceil(seconds*60);i++)player.step(1/60,yaw);}
  function stop(){player.setMove(0,0);run(.5);}
  function walkTo(x,z){
    for(let i=0;i<1400;i++){
      const p=player.getState(),dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);
      if(d<.035&&p.speed<.08){player.setMove(0,0);return;}
      const magnitude=Math.min(1,d/.6);
      player.setMove(d?dx/d*magnitude:0,d?-dz/d*magnitude:0);
      player.step(1/60,0);
    }
    assert.fail(`Could not walk to ${x},${z}; ended at ${JSON.stringify(player.getState())}`);
  }
  return {player,completions,events,run,stop,walkTo};
}

test('movement is camera-relative and diagonals have the same capped speed',()=>{
  const cardinal=harness(),diagonal=harness(),rotated=harness();
  cardinal.player.setMove(1,0);diagonal.player.setMove(-1,1);rotated.player.setMove(0,1);
  cardinal.run(2);diagonal.run(2);rotated.run(2,Math.PI/2);
  const a=cardinal.player.getState(),b=diagonal.player.getState(),c=rotated.player.getState();
  close(a.speed,b.speed,'diagonal speed');
  assert.ok(a.speed<=WORLD.player.speed&&a.speed>3.79);
  close(Math.hypot(a.x,a.z-11),Math.hypot(b.x,b.z-11),'distance travelled');
  assert.ok(c.x<0);close(c.z,11,'rotated forward movement');
  close(a.x,-c.x,'camera rotation preserves speed');
  assert.ok(Math.abs(a.yaw-Math.PI/2)<.001,'the sheep turns its +Z face toward rightward travel');
});

test('lunar jumps arc above terrain, reject double jumps, and land exactly once',()=>{
  const terrain=(x,z)=>.2*Math.sin(x*.4)+.08*z;
  const h=harness({groundHeight:terrain});
  assert.equal(h.player.jump(),true);assert.equal(h.player.jump(),false);
  let maximum=0;
  h.player.setMove(.2,1);
  for(let i=0;i<120;i++){
    const p=h.player.step(1/60,0);maximum=Math.max(maximum,p.height);
    assert.ok(p.y>=terrain(p.x,p.z)-EPS,'feet never pass below the terrain');
  }
  const state=h.player.getState();
  assert.ok(maximum>1.4&&maximum<1.9,'jump has a bounded lunar arc');
  assert.equal(state.grounded,true);close(state.y,terrain(state.x,state.z),'landing height');
  assert.equal(h.events.filter(event=>event.type==='land').length,1);
  assert.equal(state.jumpCount,1);
  assert.equal(h.player.jump(),true,'landing permits the next deliberate jump');
});

test('rocks and world bounds remain solid, including after a long frame',()=>{
  const h=harness();
  const target=WORLD.obstacles[2],dx=target.x,dz=target.z-11,length=Math.hypot(dx,dz);
  h.player.setMove(dx/length,-dz/length);
  for(let i=0;i<350;i++){
    const p=h.player.step(i===80?100:1/60,0);
    for(const obstacle of WORLD.obstacles)assert.ok(Math.hypot(p.x-obstacle.x,p.z-obstacle.z)>=obstacle.radius+WORLD.player.radius-EPS,'player cannot enter a solid rock');
    assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&Number.isFinite(p.z));
  }
  h.player.reset();h.player.setMove(0,1);
  const before=h.player.getState();h.player.step(100,0);
  assert.ok(Math.hypot(h.player.getState().x-before.x,h.player.getState().z-before.z)<1,'suspended time cannot teleport the player');
  for(let i=0;i<100;i++)h.player.step(.25,0);
  const end=h.player.getState();
  close(end.z,WORLD.bounds.minZ+WORLD.player.radius,'north boundary');
  close(end.vz,0,'velocity into the boundary is stopped');
  const frozen=JSON.stringify(end);h.player.step(NaN);h.player.step(-2);h.player.step(0);
  assert.equal(JSON.stringify(h.player.getState()),frozen);
});

test('disabled play clears held motion and cannot jump, baa, interact, or advance',()=>{
  const h=harness();h.player.setMove(1,0);h.run(.4);h.player.jump();h.run(.2);h.player.baa();
  h.player.setEnabled(false);
  const paused=JSON.stringify(h.player.getState());
  assert.equal(h.player.setMove(1,1),false);assert.equal(h.player.jump(),false);assert.equal(h.player.baa(),false);assert.equal(h.player.interact(),false);
  h.player.step(30,2);assert.equal(JSON.stringify(h.player.getState()),paused);
  h.player.setEnabled(true);h.run(2);
  assert.equal(h.player.getState().grounded,true);close(h.player.getState().speed,0,'stale movement does not resume');
});

test('the flock discovery needs a nearby baa and is awarded only once',()=>{
  const h=harness();
  assert.equal(h.player.baa(),true);assert.equal(h.player.baa(),false,'baa has a cooldown');
  assert.deepEqual(h.completions,[],'a remote baa does not greet the flock');
  h.walkTo(WORLD.flock.x,WORLD.flock.z);
  assert.deepEqual(h.completions,[],'arriving never awards a discovery');
  assert.equal(h.player.interact(),false,'the flock responds to the baa action');
  assert.equal(h.player.baa(),true);h.run(1);h.player.baa();
  assert.deepEqual(h.completions,['flock']);
  assert.ok(h.events.some(event=>event.type==='baa'&&event.flock));
});

test('signal rings need real jumps and the beacon still needs a nearby interaction',()=>{
  const h=harness();
  for(const spark of WORLD.sparks)h.walkTo(spark.x,spark.z);
  assert.equal(h.player.getState().sparks.some(Boolean),false,'walking through rings cannot collect them');
  h.walkTo(WORLD.signal.x,WORLD.signal.z);assert.equal(h.player.interact(),true);
  assert.ok(h.events.some(event=>event.type==='hint'&&event.message.includes('all three signal rings')));
  assert.deepEqual(h.completions,[]);
  for(const [index,spark]of WORLD.sparks.entries()){
    h.walkTo(spark.x,spark.z);assert.equal(h.player.jump(),true);h.run(1.3);
    assert.equal(h.player.getState().sparks[index],true);
  }
  assert.deepEqual(h.completions,[],'collecting rings alone does not activate the station');
  h.walkTo(WORLD.signal.x,WORLD.signal.z);assert.equal(h.player.interact(),true);h.player.interact();
  assert.deepEqual(h.completions,['signal']);
  assert.equal(h.events.filter(event=>event.type==='spark').length,3);
});

test('the bell requires jumping in its clearing, and the board opens only within reach',()=>{
  const h=harness();
  assert.equal(h.player.interact(),false);
  h.walkTo(WORLD.board.x,WORLD.board.z+1.9);
  assert.equal(h.events.filter(event=>event.type==='board').length,0,'walking past a board never opens a dialog automatically');
  assert.equal(h.player.getState().nearby,'board');assert.equal(h.player.interact(),true);
  assert.equal(h.events.filter(event=>event.type==='board').length,1);
  h.walkTo(-8.3,-5);h.walkTo(WORLD.bell.x,WORLD.bell.z);
  assert.deepEqual(h.completions,[]);assert.equal(h.player.interact(),false);
  h.player.jump();h.run(1.4);h.player.jump();h.run(1.4);
  assert.deepEqual(h.completions,['bell']);
});

test('saved progress and recovery preserve discoveries without synthetic completion events',()=>{
  const h=harness({completed:['signal','flock','invalid']});
  assert.equal(h.player.getState().sparks.every(Boolean),true);
  assert.equal(h.player.getState().completed.join(','),'flock,signal');
  assert.deepEqual(h.completions,[]);
  h.player.setCompleted(['bell']);h.player.setCompleted([]);
  h.player.setMove(-1,0);h.run(1);h.player.jump();h.run(.2);h.player.reset();
  const reset=h.player.getState();
  close(reset.x,WORLD.spawn.x,'recovery X');close(reset.z,WORLD.spawn.z,'recovery Z');
  assert.equal(reset.grounded,true);assert.equal(reset.sparks.every(Boolean),true);
  assert.equal(reset.completed.join(','),'flock,signal,bell');assert.deepEqual(h.completions,[]);
  reset.sparks.fill(false);reset.completed.length=0;reset.x=99;
  assert.equal(h.player.getState().sparks.every(Boolean),true,'snapshots cannot mutate internal progress');
  close(h.player.getState().x,WORLD.spawn.x,'snapshots cannot move the player');
});
