/* Shared framing rules for the Atlas fleet. No network or browser state. */
(()=>{'use strict';
 const assets=[
  {id:'station',name:'Atlas Station',eyebrow:'01 / THE ORBITAL GATEWAY',description:'A place between worlds. Explore the station’s connected habitats, docking structures and working exterior.',span:3.6},
  {id:'shuttle',name:'Expedition shuttle',eyebrow:'02 / BUILT TO EXPLORE',description:'Ceramic heat shielding, recessed cockpit glass and maneuvering thrusters. A closer look at the craft connecting our worlds.',span:3.5},
  {id:'observatory',name:'PARALLAX Observatory',eyebrow:'03 / OUR WINDOW INTO SPACE',description:'A new architectural landmark for the PARALLAX universe: an observatory with a telescope, observation decks and a rugged foundation.',span:3.4},
  {id:'docking-platform',name:'Docking platform',eyebrow:'04 / ARRIVAL & DEPARTURE',description:'Service arms, cargo handling and a carefully detailed approach platform at the edge of the station.',span:3.5},
  {id:'satellite',name:'Deep-space relay',eyebrow:'05 / STAY CONNECTED',description:'Directional dishes, articulated solar arrays and antenna hardware designed for the space between destinations.',span:3.3},
  {id:'habitat',name:'Orbital habitat',eyebrow:'06 / LIFE ABOVE THE WORLD',description:'A pressurized home in orbit, with observation windows, an airlock and exposed utility systems.',span:3.4}
 ];
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 function fit(bounds,span){const sizes=bounds.max.map((v,i)=>v-bounds.min[i]);if(!sizes.every(v=>Number.isFinite(v)&&v>0))throw Error('Invalid asset bounds');return {center:bounds.min.map((v,i)=>(v+bounds.max[i])/2),radius:span*Math.hypot(...sizes)/(2*Math.max(...sizes)),height:span*sizes[1]/Math.max(...sizes)};}
 function camera(yaw,pitch,distance,aspect){pitch=clamp(pitch,-1.15,1.15);distance=clamp(distance,2.7,9);const eye=[Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance],forward=eye.map(v=>-v/distance),right=[Math.cos(yaw),0,-Math.sin(yaw)],up=[-Math.sin(yaw)*Math.sin(pitch),Math.cos(pitch),-Math.cos(yaw)*Math.sin(pitch)];return{eye,forward,right,up,aspect,lens:.49};}
 const api={assets,fit,camera,clamp};if(typeof window!=='undefined')window.ParallaxAtlasPortCore=api;if(typeof module!=='undefined')module.exports=api;
})();
