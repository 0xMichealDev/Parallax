/* Local target practice rules. Pure commands keep future network validation separate. */
(()=>{'use strict';
 const W=globalThis.__earthboundWeapons||(typeof window!=='undefined'?window.ParallaxWeapons:require('./earthbound-weapons.js'));
 const capacity=30,reloadSeconds=2.2,cooldown=.18;
 const create=(weapon='ar')=>({weapon,ammo:W.get(weapon).capacity,reserve:W.get(weapon).reserve,reload:0,cooldown:0,kick:0,flash:0,hit:0,shots:0,hits:0,score:0,sequence:0,lastTarget:null});
 function tick(s,dt){dt=Number.isFinite(dt)?Math.max(0,Math.min(dt,.1)):0;const active=s.reload>0||s.kick>0||s.flash>0||s.hit>0;for(const k of ['cooldown','kick','flash','hit'])s[k]=Math.max(0,s[k]-dt);if(s.reload>0){s.reload=Math.max(0,s.reload-dt);if(!s.reload){const n=Math.min(W.get(s.weapon).capacity-s.ammo,s.reserve);s.ammo+=n;s.reserve-=n;}}return active;}
 function reload(s){if(s.reload||s.ammo===W.get(s.weapon).capacity||!s.reserve)return false;s.reload=W.get(s.weapon).reload;s.sequence++;return true;}
 function shoot(s,origin,direction,targets=[],blocked=()=>false){if(s.reload||s.cooldown||s.ammo<=0)return {fired:false,reason:s.reload?'reloading':s.ammo<=0?'empty':'cooldown'};
  if(!Array.isArray(origin)||!Array.isArray(direction)||origin.length!==3||direction.length!==3||![...origin,...direction].every(Number.isFinite)||Math.hypot(...direction)<.001)return {fired:false,reason:'invalid'};
  s.ammo--;s.shots++;s.sequence++;s.cooldown=W.get(s.weapon).cooldown;s.kick=.22;s.flash=.055;s.lastTarget=null;const n=Math.hypot(...direction),d=direction.map(v=>v/n);let nearest=null;
  for(const target of targets){if(Math.abs(d[2])<.001)continue;const t=(target.z-origin[2])/d[2];if(t<=0||t>70)continue;const x=origin[0]+d[0]*t,y=origin[1]+d[1]*t,r=Math.hypot(x-target.x,y-target.y);if(r<=target.radius&&(!nearest||t<nearest.distance)&&!blocked(origin,d,t))nearest={id:target.id,distance:t,bullseye:r<target.radius*.26};}
  if(nearest){s.hits++;s.score+=nearest.bullseye?100:50;s.hit=.25;s.lastTarget=nearest.id;}return {fired:true,hit:nearest,sequence:s.sequence};
 }
 const api={capacity,reloadSeconds,create,tick,reload,shoot};if(typeof module!=='undefined')module.exports=api;if(typeof window!=='undefined')window.ParallaxRangeCore=api;
})();
