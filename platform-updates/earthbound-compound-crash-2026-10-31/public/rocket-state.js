/* Local flight sequence. No wallet action, purchase, or network request. */
(() => {
  'use strict';
  const PLANETS=typeof solarSystemWorlds!=='undefined'?solarSystemWorlds.map(w=>w.name):['Mercury','Venus','Earth','Moon','Mars','Jupiter','Europa','Saturn','Uranus','Neptune','Pluto'];
  const BOARDING={x:-105,z:-110,deck:54};
  const create=()=>({mode:'ground',elapsed:0,rise:0,planet:'Mars'});
  function board(f,p,driving){if(f.mode!=='ground'||driving||Math.hypot(p.x-BOARDING.x,p.z-BOARDING.z)>3.3)return false;Object.assign(f,{mode:'lift',elapsed:0,rise:0});return true;}
  function launch(f,planet){if(f.mode!=='cabin'||!PLANETS.includes(planet))return false;Object.assign(f,{mode:'launch',elapsed:0,rise:0,planet});return true;}
  function tick(f,dt){dt=Number.isFinite(dt)?Math.min(.1,Math.max(0,dt)):0;if(f.mode!=='lift'&&f.mode!=='launch')return false;f.elapsed+=dt;
    if(f.mode==='lift'){const p=Math.min(1,f.elapsed/5);f.rise=54*p*p*(3-2*p);if(p===1)Object.assign(f,{mode:'cabin',elapsed:0,rise:0});}
    else{const p=Math.min(1,Math.max(0,(f.elapsed-3)/8));f.rise=1200*p*p;if(p===1)f.mode='orbit';}
    return true;
  }
  function exit(f){Object.assign(f,create());}
  function cabinMove(p,forward,side,dt){const length=Math.hypot(forward,side);if(!length)return false;const step=1.5*Math.min(.05,Math.max(0,dt))/Math.max(1,length),x=p.x+(Math.sin(p.yaw)*forward+Math.cos(p.yaw)*side)*step,z=p.z+(-Math.cos(p.yaw)*forward+Math.sin(p.yaw)*side)*step;
    if(Math.hypot(x+110,z+120)>2.16||z> -118.6||z< -122.0)return false;
    if([-111.2,-108.8].some(s=>Math.hypot(x-s,z+120.4)<.60))return false;
    p.distance+=Math.hypot(x-p.x,z-p.z);p.x=x;p.z=z;return true;
  }
  const api={PLANETS,BOARDING,create,board,launch,tick,exit,cabinMove};if(typeof window!=='undefined')window.ParallaxRocket=api;if(typeof module!=='undefined')module.exports=api;
})();
