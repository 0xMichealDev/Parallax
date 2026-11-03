/* Shared fictional game balance. Values are not real-world weapon specifications. */
(function(root){'use strict';
 const definitions={
  ar:{id:'ar',name:'PARALLAX AR',role:'Versatile primary',capacity:30,reserve:90,reload:2.2,cooldown:.18,damage:25,speed:180,life:.9,spread:.012,aimSpread:.002,zoom:1.15,kick:1,muzzle:[0,.29,-2.07],scale:.28,hipY:-.32,aimY:-.195},
  sniper:{id:'sniper',name:'SPECTRE / precision',role:'Scoped precision · slow follow-up',capacity:5,reserve:20,reload:3.1,cooldown:1.25,damage:75,speed:260,life:1.3,spread:.045,aimSpread:.0007,zoom:3.5,kick:1.55,muzzle:[0,.36,-2.4],scale:.28,hipY:-.30,aimY:-.22},
  sidearm:{id:'sidearm',name:'VECTOR / sidearm',role:'Quick backup · short range',capacity:12,reserve:48,reload:1.65,cooldown:.24,damage:20,speed:140,life:.55,spread:.022,aimSpread:.005,zoom:1.12,kick:.75,muzzle:[0,.46,-.75],scale:.28,hipY:-.32,aimY:-.16}
 };
 const get=id=>definitions[id]||definitions.ar;
 const inventory=primary=>Object.fromEntries([primary==='sniper'?'sniper':'ar','sidearm'].map(id=>[id,{ammo:get(id).capacity,reserve:get(id).reserve}]));
 const api={definitions,get,inventory};if(typeof module!=='undefined')module.exports=api;if(root)root.ParallaxWeapons=api;
})(typeof window!=='undefined'?window:null);
