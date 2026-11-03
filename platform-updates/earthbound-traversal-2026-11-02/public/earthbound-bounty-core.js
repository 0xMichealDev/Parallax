/* Practice credits only. No wallet, token, deposit or withdrawal support. */
(function(root){'use strict';
const L=globalThis.__earthboundLayout||root?.ParallaxMatchLayout;
function createClass(Room){return class BountyRoom extends Room{
 constructor(options){super(options);this.maxSpeed=7;this.round=1;this.phase='lobby';this.starts=0;this.ends=0;this.openAt=0;this.resetAt=0;this.records=new Map();this.issued=0;this.forfeited=0;this.drops=new Map();this.dropSerial=0;}
 add(id,now){const p=super.add(id,now);if(p)p.practiceBank=0;return p;}
 record(id){return this.records.get(id);}
 active(id){return this.phase==='active'&&this.record(id)?.status==='active';}
 loadoutAllowed(){return this.phase==='lobby';}
 safe(p,now){return !this.active(p.id)||p.protectedUntil>now;}
 canDamage(owner,victim){return this.active(owner)&&this.active(victim.id);}
 note(type,id,amount=0){this.events.push({type,id,amount});}
 settle(id,status,now,killerId){const r=this.record(id);if(!r||r.status!=='active')return false;const amount=r.carried;r.carried=0;r.status=status;r.extractAt=0;
  const killer=this.record(killerId);if(status==='extracted'){r.banked+=amount;const p=this.players.get(id);if(p)p.practiceBank+=amount;this.note('bountyBanked',id,amount);}
  else if(killerId!==id&&killer?.status==='active'){killer.carried+=amount;this.note('bountyTaken',killerId,amount);}else this.forfeited+=amount;
  this.note('bountyExit',id);return true;
 }
 onDamage(victim,owner,now){const r=this.record(victim.id);if(r){r.extractAt=0;r.attacker=owner;r.hitAt=now;}}
 drop(p,weapon,ammo,reserve,now){const id=++this.dropSerial;this.drops.set(id,{id,weapon,ammo,reserve,x:p.x,y:this.ground(p.x,p.z)+.1,z:p.z,expires:now+180000});return id;}
 onDown(victim,owner,now){for(const weapon of [pPrimary(victim),'sidearm']){const bag=weapon===victim.weapon?victim:victim.inventory[weapon];if(bag)this.drop(victim,weapon,bag.ammo,bag.reserve,now);}this.settle(victim.id,'eliminated',now,owner);}
 remove(id){const r=this.record(id);if(r?.status==='active')this.settle(id,'disconnected',Date.now(),r.hitAt&&Date.now()-r.hitAt<10000?r.attacker:null);if(this.phase==='lobby')this.records.delete(id);super.remove(id);}
 command(id,m,now){const p=this.players.get(id);if(!p||!m||typeof m!=='object')return false;p.lastSeen=now;
  if(m.type==='bountyJoin'||m.type==='bountyLeave'||m.type==='extract'||m.type==='pickup'){if(!Number.isSafeInteger(m.seq)||m.seq<=p.sequence)return false;p.sequence=m.seq;
   if(m.type==='bountyLeave'){if(this.phase!=='lobby')return false;return this.records.delete(id);}
   if(m.type==='pickup'){const d=this.drops.get(m.drop);if(!this.active(id)||!d||now>=d.expires||p.health<=0||p.reloadAt||now<p.nextShot||Math.hypot(p.x-d.x,p.z-d.z)>2.5)return false;this.drops.delete(d.id);const slot=d.weapon==='sidearm'?'sidearm':p.primary;p.inventory[p.weapon]={ammo:p.ammo,reserve:p.reserve};const old=p.inventory[slot];if(old)this.drop(p,slot,old.ammo,old.reserve,now);if(d.weapon!=='sidearm')p.primary=d.weapon;p.inventory[d.weapon]={ammo:d.ammo,reserve:d.reserve};p.weapon=d.weapon;Object.assign(p,p.inventory[d.weapon]);p.nextShot=now+500;const r=this.record(id);r.extractAt=0;return true;}
   if(m.type==='bountyJoin'){if(this.phase!=='lobby'||this.records.has(id))return false;this.records.set(id,{id,name:p.name,status:'queued',carried:0,banked:0,extractAt:0,hitAt:0});return true;}
   const r=this.record(id);if(!this.active(id)||now<this.openAt||p.health<=0||p.mode!=='foot'||!(L?.extractions||[{x:0,z:3,radius:7}]).some(e=>Math.hypot(p.x-e.x,p.z-e.z)<=e.radius))return false;r.extractAt=now+8000;r.extractX=p.x;r.extractZ=p.z;return true;
  }
  if(m.type==='loadout'||m.type==='appearance')return this.phase==='lobby'&&super.command(id,m,now);
  if(!this.active(id))return false;
  if(m.type==='travel'||m.type==='respawn')return false;
  if(m.type==='move'&&(m.mode!=='foot'||Math.abs(m.jump)>5)){this.events.push({type:'correct',id,x:p.x,z:p.z});return false;}
  const ok=super.command(id,m,now),r=this.record(id);if(ok&&r?.extractAt&&(m.type==='fire'||m.type==='move'&&(Math.hypot(p.x-r.extractX,p.z-r.extractZ)>.35||m.jump>.1)))r.extractAt=0;return ok;
 }
 start(now){this.phase='active';this.starts=now;this.ends=now+600000;this.openAt=now+30000;this.issued=0;this.forfeited=0;this.bullets=[];this.drops.clear();let i=0;const spawns=L?.spawns||[[-45,7],[56,-58],[-99,-88],[35,30]];
  for(const r of this.records.values()){const p=this.players.get(r.id);if(!p||r.status!=='queued')continue;const point=spawns[(i++ + this.round-1)%spawns.length],offset=0;r.status='active';r.carried=5;this.issued+=5;Object.assign(p,{x:point[0]+offset,z:point[1]+offset,health:100,ammo:30,reserve:90,reloadAt:0,nextShot:0,protectedUntil:now+5000,mode:'foot',stance:'stand',moveCredit:3.5,lastMove:now});this.arm(p);p.y=this.ground(p.x,p.z);this.events.push({type:'teleport',id:p.id,x:p.x,z:p.z,place:'bounty'});}
 }
 tick(dt,now){if(this.phase==='lobby'){const count=[...this.records.values()].filter(r=>r.status==='queued'&&this.players.has(r.id)).length;if(count<2)this.starts=0;else if(!this.starts)this.starts=now+15000;else if(now>=this.starts)this.start(now);}
  for(const [id,d]of this.drops)if(now>=d.expires)this.drops.delete(id);
  super.tick(dt,now);
  if(this.phase==='active'){for(const r of this.records.values()){const p=this.players.get(r.id);if(r.status!=='active'||!p)continue;if(r.extractAt&&now>=r.extractAt&&p.health>0&&(L?.extractions||[{x:0,z:3,radius:7}]).some(e=>Math.hypot(p.x-e.x,p.z-e.z)<=e.radius))this.settle(p.id,'extracted',now);if(now>=this.ends)this.settle(p.id,'expired',now);}
   if(![...this.records.values()].some(r=>r.status==='active')){this.phase='results';this.resetAt=now+20000;this.bullets=[];}}
  if(this.phase==='results'&&now>=this.resetAt){this.round++;this.phase='lobby';this.starts=0;this.records.clear();this.drops.clear();this.issued=this.forfeited=0;for(const p of this.players.values()){p.health=100;super.teleport(p,'camp',now);}}
 }
 meta(now){return {mode:'bounty',practice:true,extractions:L?.extractions||[{id:'camp',name:'Camp beacon',x:0,z:3,radius:7}],drops:[...this.drops.values()].map(({expires,...d})=>d),round:this.round,phase:this.phase,countdown:this.phase==='lobby'&&this.starts?Math.max(0,this.starts-now)/1000:0,remaining:this.phase==='active'?Math.max(0,this.ends-now)/1000:0,extractOpens:Math.max(0,this.openAt-now)/1000,reset:this.phase==='results'?Math.max(0,this.resetAt-now)/1000:0,issued:this.issued,forfeited:this.forfeited,entry:5,extraction:{x:0,z:3,radius:7},players:[...this.records.values()].map(r=>({id:r.id,name:r.name,status:r.status,carried:r.carried,banked:r.banked}))};}
 snapshot(now){return super.snapshot(now).map(p=>{const r=this.record(p.id);return {...p,bounty:{status:r?.status||'spectator',carried:r?.carried||0,banked:r?.banked||0,total:this.players.get(p.id).practiceBank,extract:Math.max(0,(r?.extractAt||0)-now)/1000},protected:this.safe(this.players.get(p.id),now)};});}
};}
function pPrimary(p){return p.primary||'ar';}
const api={createClass};if(typeof module!=='undefined')module.exports=api;if(root)root.ParallaxBounty=api;
})(typeof window!=='undefined'?window:null);
