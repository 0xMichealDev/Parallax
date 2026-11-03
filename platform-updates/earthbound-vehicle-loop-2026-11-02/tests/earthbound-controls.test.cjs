const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const world={window:{},module:{exports:{}}};vm.runInNewContext(fs.readFileSync('public/desert-world.js','utf8'),world);
const W=world.module.exports;
test('jump rises about two and a half metres, rejects double jumps and lands at several frame rates',()=>{
 for(const dt of [1/30,1/60,1/144]){
  const s=W.camera();s.seated=true;assert.equal(W.jump(s),true);assert.equal(s.seated,false);assert.equal(W.jump(s),false);
  let apex=0;for(let t=0;t<1.5;t+=dt){W.jumpTick(s,dt);apex=Math.max(apex,s.jumpHeight);if(s.jumpHeight>0)assert.equal(W.jump(s),false);}
  assert.ok(apex>2.55&&apex<2.6);assert.equal(s.jumpHeight,0);assert.equal(s.jumpVelocity,0);assert.equal(W.jump(s),true);
  W.resetJump(s);assert.equal(W.jumpTick(s,dt),false);
 }
});
test('jumping preserves horizontal obstacles and the walking boundary',()=>{
 const s=W.camera();W.jump(s);for(let i=0;i<30;i++){W.jumpTick(s,1/60);W.move(s,1,0,1/60,true,[{x:0,z:-1.4,radius:.5}]);}
 assert.ok(Math.hypot(s.x,s.z+1.4)>=.849);assert.ok(s.jumpHeight>0);
});
function controller(){
 const pad={index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false}))};let pads=[pad];
 const code=fs.readFileSync('public/universe.js','utf8');const scope={navigator:{getGamepads:()=>pads},Math};vm.createContext(scope);
 vm.runInContext(code.slice(code.indexOf('let padIndex='),code.indexOf('function stopWalkingInput'))+';this.read=controllerInput;',scope);
 return{pad,read:scope.read,disconnect:()=>pads=[],connect:()=>pads=[pad]};
}
test('analog RT fires once per squeeze, LT holds aim, and actions rearm after menus',()=>{const f=controller();f.read(true);f.pad.buttons[6].value=.8;f.pad.buttons[7].value=.8;let r=f.read(true);assert.equal(r.aim,true);assert.equal(r.fire,true);assert.equal(f.read(true).fire,false);f.pad.buttons[7].value=0;f.read(true);f.pad.buttons[7].value=.8;assert.equal(f.read(true).fire,true);f.read(false);assert.ok(!f.read(true).fire);f.pad.buttons[6].value=f.pad.buttons[7].value=0;f.read(true);f.pad.buttons[2].pressed=true;assert.equal(f.read(true).reload,true);f.pad.buttons[1].pressed=true;assert.equal(f.read(true).crouch,true);f.pad.buttons[13].pressed=true;assert.equal(f.read(true).prone,true);f.disconnect();assert.ok(!f.read(true).aim);});
test('crouch and prone reduce movement even while sprint is requested',()=>{const distances=['stand','crouch','prone'].map(stance=>{const s=W.camera();s.stance=stance;W.move(s,1,0,.05,true,[]);return Math.hypot(s.x,s.z);});assert.ok(distances[0]>distances[1]*3);assert.ok(distances[1]>distances[2]*1.9);});
test('controller deadzone, analog magnitude, one-shot jump and menu rearming',()=>{
 const f=controller();f.read(true);f.pad.axes=[.1,-.1,0,0];assert.ok(f.read(true).forward===0);
 f.pad.axes=[0,-.59,.59,0];let r=f.read(true);assert.ok(Math.abs(r.forward-.5)<1e-6);assert.ok(Math.abs(r.turn-.5)<1e-6);
 f.pad.buttons[0].pressed=true;assert.equal(f.read(true).jump,true);assert.equal(!!f.read(true).jump,false);
 assert.equal(f.read(false).forward,0);assert.ok(f.read(true).forward===0);
 f.pad.axes=[0,0,0,0];f.pad.buttons[0].pressed=false;f.read(true);f.pad.axes[1]=-1;assert.equal(f.read(true).forward,1);
 f.disconnect();assert.ok(f.read(true).forward===0);f.connect();assert.ok(f.read(true).forward===0);
 f.pad.axes[1]=0;f.read(true);f.pad.buttons[3].pressed=true;assert.equal(f.read(true).interact,true);assert.equal(!!f.read(true).interact,false);
});
test('unsupported controllers are ignored and drifting sticks do not arm on connect',()=>{
 const f=controller();f.pad.axes[0]=.4;assert.equal(f.read(true).side,0);assert.equal(f.read(true).side,0);
 f.pad.mapping='';f.pad.axes[0]=0;f.read(true);f.pad.axes[1]=-1;assert.ok(f.read(true).forward===0);
});
