const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const load=p=>{const m={exports:{}};new Function('module',fs.readFileSync('public/'+p,'utf8'))(m);return m.exports;};
const W=globalThis.__earthboundWeapons=load('earthbound-weapons.js'),{Room}=load('earthbound-combat-core.js'),Bounty=load('earthbound-bounty-core.js').createClass(Room);
test('loadout changes are server gated; switching preserves each magazine and enforces draw time',()=>{
 const r=new Room({random:()=>.5}),p=r.add('a',0);let seq=0;const send=(m,t)=>r.command('a',{...m,seq:++seq},t);
 assert.equal(send({type:'loadout',primary:'sniper'},100),true);assert.equal(p.ammo,5);assert.equal(p.reserve,20);
 assert.equal(send({type:'fire',yaw:0,pitch:0,aim:true},700),true);assert.equal(p.ammo,4);assert.equal(send({type:'equip',weapon:'sidearm'},800),false);
 assert.equal(send({type:'equip',weapon:'sidearm'},2000),true);assert.equal(p.ammo,12);assert.equal(send({type:'fire',yaw:0,pitch:0},2100),false);
 assert.equal(send({type:'fire',yaw:0,pitch:0},2400),true);assert.equal(p.ammo,11);
 assert.equal(send({type:'equip',weapon:'sniper'},2800),true);assert.equal(p.ammo,4);
 assert.equal(send({type:'loadout',primary:'ar'},3300),true);assert.equal(send({type:'loadout',primary:'sniper'},3900),true);assert.equal(p.ammo,4,'loadout cannot refill a used gun');
 Object.assign(p,{x:50,z:50,protectedUntil:0});assert.equal(send({type:'loadout',primary:'ar'},10000),false);assert.equal(send({type:'equip',weapon:'ar'},11000),false);
 assert.equal(send({type:'reload'},11000),true);assert.equal(send({type:'equip',weapon:'sidearm'},11500),false);r.tick(.1,14101);assert.equal(p.ammo,5);assert.equal(p.reserve,19);
});
test('bounty locks primary at round start, equips selected primary, retains sidearm, and resets ammo only next round',()=>{
 const r=new Bounty(),a=r.add('a',0);r.add('b',0);r.command('a',{type:'loadout',primary:'sniper',seq:1},1);r.command('a',{type:'bountyJoin',seq:2},2);r.command('b',{type:'bountyJoin',seq:1},2);r.tick(.1,10);r.tick(.1,15010);
 assert.equal(a.weapon,'sniper');assert.equal(a.ammo,5);assert.equal(r.command('a',{type:'loadout',primary:'ar',seq:3},15011),false,'arrival protection is not a loadout loophole');assert.equal(r.command('a',{type:'equip',weapon:'sidearm',seq:4},19000),true);assert.equal(a.ammo,12);
});
test('each projectile carries its own server damage after its owner switches weapons',()=>{
 for(const id of ['ar','sniper','sidearm']){const r=new Room({random:()=>.5}),a=r.add('a',0),b=r.add('b',0);a.primary=id==='sidearm'?'ar':id;r.arm(a);if(id==='sidearm'){a.weapon=id;Object.assign(a,a.inventory[id]);}Object.assign(a,{x:-45,z:7,protectedUntil:0});Object.assign(b,{x:-45,z:0,protectedUntil:0});assert.equal(r.command('a',{type:'fire',seq:1,yaw:0,pitch:-.04,aim:true},20000),true);a.weapon='ar';r.tick(.05,20050);assert.equal(b.health,100-W.get(id).damage);assert.equal(r.drain().find(e=>e.type==='shot').weapon,id);}
});
test('new game models decode with PBR maps and stay within web budgets',()=>{const parser=load('rocket-model.js');for(const id of ['sniper','sidearm']){const data=fs.readFileSync('public/assets/earthbound-weapons/'+id+'-web.glb'),m=parser.parseGLB(data);assert.ok(data.length<2.5*1024*1024);assert.ok(m.triangles<=24000);assert.equal(m.images.length,3);assert.ok(m.bounds.min[2]<-.7);}});
test('weapon report waveforms are distinct and finite',()=>{const audio=load('shot-effects.js');const a=audio.waveform(24000,'ar'),b=audio.waveform(24000,'sniper'),c=audio.waveform(24000,'sidearm');assert.notDeepEqual(a,b);assert.notDeepEqual(b,c);for(const x of [a,b,c])assert.ok(x.every(Number.isFinite));});
