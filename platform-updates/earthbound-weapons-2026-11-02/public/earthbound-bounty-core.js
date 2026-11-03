/* Practice credits only. No wallet, token, deposit or withdrawal support. */
(function(root){'use strict';
function createClass(Room){return class BountyRoom extends Room{
 constructor(options){super(options);this.maxSpeed=7;this.round=1;this.phase='lobby';this.starts=0;this.ends=0;this.openAt=0;this.resetAt=0;this.records=new Map();this.issued=0;this.forfeited=0;}
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
 onDown(victim,owner,now){this.settle(victim.id,'eliminated',now,owner);}
 remove(id){const r=this.record(id);if(r?.status==='active')this.settle(id,'disconnected',Date.now(),r.hitAt&&Date.now()-r.hitAt<10000?r.attacker:null);if(this.phase==='lobby')this.records.delete(id);super.remove(id);}
 command(id,m,now){const p=this.players.get(id);if(!p||!m||typeof m!=='object')return false;p.lastSeen=now;
  if(m.type==='bountyJoin'||m.type==='extract'){if(!Number.isSafeInteger(m.seq)||m.seq<=p.sequence)return false;p.sequence=m.seq;
   if(m.type==='bountyJoin'){if(this.phase!=='lobby'||this.records.has(id))return false;this.records.set(id,{id,name:p.name,status:'queued',carried:0,banked:0,extractAt:0,hitAt:0});return true;}
   const r=this.record(id);if(!this.active(id)||now<this.openAt||p.health<=0||p.mode!=='foot'||Math.hypot(p.x,p.z-3)>7)return false;r.extractAt=now+8000;r.extractX=p.x;r.extractZ=p.z;return true;
  }
  if(m.type==='loadout')return this.phase==='lobby'&&super.command(id,m,now);
  if(!this.active(id))return false;
  if(m.type==='travel'||m.type==='respawn')return false;
  if(m.type==='move'&&(m.mode!=='foot'||Math.abs(m.jump)>1.8)){this.events.push({type:'correct',id,x:p.x,z:p.z});return false;}
  const ok=super.command(id,m,now),r=this.record(id);if(ok&&r?.extractAt&&(m.type==='fire'||m.type==='move'&&(Math.hypot(p.x-r.extractX,p.z-r.extractZ)>.35||m.jump>.1)))r.extractAt=0;return ok;
 }
 start(now){this.phase='active';this.starts=now;this.ends=now+600000;this.openAt=now+30000;this.issued=0;this.forfeited=0;this.bullets=[];let i=0;const spawns=[[-45,7],[56,-58],[-99,-88],[35,30]];
  for(const r of this.records.values()){const p=this.players.get(r.id);if(!p||r.status!=='queued')continue;const point=spawns[i%4],offset=Math.floor(i++/4)*2;r.status='active';r.carried=5;this.issued+=5;Object.assign(p,{x:point[0]+offset,z:point[1]+offset,health:100,ammo:30,reserve:90,reloadAt:0,nextShot:0,protectedUntil:now+3000,mode:'foot',stance:'stand',moveCredit:3.5,lastMove:now});this.arm(p);p.y=this.ground(p.x,p.z);this.events.push({type:'teleport',id:p.id,x:p.x,z:p.z,place:'bounty'});}
 }
 tick(dt,now){if(this.phase==='lobby'){const count=[...this.records.values()].filter(r=>r.status==='queued'&&this.players.has(r.id)).length;if(count<2)this.starts=0;else if(!this.starts)this.starts=now+15000;else if(now>=this.starts)this.start(now);}
  super.tick(dt,now);
  if(this.phase==='active'){for(const r of this.records.values()){const p=this.players.get(r.id);if(r.status!=='active'||!p)continue;if(r.extractAt&&now>=r.extractAt&&p.health>0&&Math.hypot(p.x,p.z-3)<=7)this.settle(p.id,'extracted',now);if(now>=this.ends)this.settle(p.id,'expired',now);}
   if(![...this.records.values()].some(r=>r.status==='active')){this.phase='results';this.resetAt=now+20000;this.bullets=[];}}
  if(this.phase==='results'&&now>=this.resetAt){this.round++;this.phase='lobby';this.starts=0;this.records.clear();this.issued=this.forfeited=0;for(const p of this.players.values()){p.health=100;super.teleport(p,'camp',now);}}
 }
 meta(now){return {mode:'bounty',practice:true,round:this.round,phase:this.phase,countdown:this.phase==='lobby'&&this.starts?Math.max(0,this.starts-now)/1000:0,remaining:this.phase==='active'?Math.max(0,this.ends-now)/1000:0,extractOpens:Math.max(0,this.openAt-now)/1000,reset:this.phase==='results'?Math.max(0,this.resetAt-now)/1000:0,issued:this.issued,forfeited:this.forfeited,entry:5,extraction:{x:0,z:3,radius:7},players:[...this.records.values()].map(r=>({id:r.id,name:r.name,status:r.status,carried:r.carried,banked:r.banked}))};}
 snapshot(now){return super.snapshot(now).map(p=>{const r=this.record(p.id);return {...p,bounty:{status:r?.status||'spectator',carried:r?.carried||0,banked:r?.banked||0,total:this.players.get(p.id).practiceBank,extract:Math.max(0,(r?.extractAt||0)-now)/1000},protected:this.safe(this.players.get(p.id),now)};});}
};}
const api={createClass};if(typeof module!=='undefined')module.exports=api;if(root)root.ParallaxBounty=api;
})(typeof window!=='undefined'?window:null);
