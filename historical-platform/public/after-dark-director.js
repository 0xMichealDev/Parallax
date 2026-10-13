(() => {
  'use strict';
  const SHOTS = [
    {id:'camp', name:'Night watch', tag:'EARTHBOUND / THE NIGHT BEGINS', title:'Stay a little\ncloser to the stars.', text:'A warm fire. An open tent. Your outpost at the edge of the unknown.', action:'Walk the desert', detail:'CAMP 01 · ARIZONA VALLEY', duration:16, from:[7,2.8,1], to:[3.8,2.5,-1.3], aim:[-1,1.3,-9], endAim:[0,3.4,-14], zoom:1},
    {id:'river', name:'Moonlit river', tag:'EARTHBOUND / FOLLOW THE WATER', title:'Let the valley\nlead you onward.', text:'Cross the timber bridge. Follow moving water into the desert.', action:'Explore the river trail', detail:'RIVERBEND · FOOTBRIDGE', duration:18, from:[49,5.5,36], to:[47,4.8,29], aim:[37,1.7,22], endAim:[33,1.4,12], zoom:.95},
    {id:'rover', name:'Desert runners', tag:'EARTHBOUND / TAKE THE WHEEL', title:'The trail is\ncalling.', text:'Take a rover beyond camp and find your own way through the valley.', action:'Enter the experience', detail:'ROVER 02 · SERVICE FORECOURT', duration:14, zoom:1.05},
    {id:'campus', name:'Launch campus', tag:'THE NEXT FRONTIER / READY TO EXPLORE', title:'A bigger horizon\nis waiting.', text:'Meet the night crew. Board the rocket. Choose your next planet.', action:'Visit the launch campus', detail:'LAUNCH CAMPUS · NIGHT SHIFT', duration:20, from:[-77,9,-64], to:[-84,15,-70], aim:[-115,28,-116], endAim:[-114,39,-119], zoom:.9},
    {id:'signal', name:'The quiet signal', tag:'FIELD RECORD / ORIGIN UNKNOWN', title:'You are not\nthe first visitor.', text:'A broken trail. A buried craft. A signal that still answers.', action:'Begin your story', detail:'UNMARKED SITE · SIGNAL DETECTED', duration:16, from:[54,3.2,-56], to:[56,2.6,-59], aim:[65,.8,-69], endAim:[65,1.3,-69], zoom:1.05},
    {id:'sky', name:'Above the valley', tag:'NIGHT WATCH / LOOK A LITTLE HIGHER', title:'A whole universe\noverhead.', text:'The Milky Way stretches above the valley. Watch for passing satellites.', action:'Go stargazing', detail:'MILKY WAY · NIGHT-SKY PANORAMA', duration:16, from:[-12,3.4,0], to:[-8,4.2,-2], aim:[28,45,-38], endAim:[22,60,-42], zoom:.85},
    {id:'singularity', name:'Find your orbit', tag:'PARALLAX / $PRLX', title:'Find your orbit.', text:'An explorable universe. A home for your project. A story we are building together.', action:'Discover community projects', detail:'PARALLAX · THE ONCHAIN OBSERVATORY', duration:20}
  ];
  const TOTAL=SHOTS.reduce((total,s)=>total+s.duration,0),FINAL=SHOTS.length-1;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function restore(saved){
    const index=saved?.version===2?SHOTS.findIndex(s=>s.id===saved.shot):-1;
    const chapter=index<0?0:index,elapsed=index<0||!Number.isFinite(saved.elapsed)?0:clamp(saved.elapsed,0,SHOTS[chapter].duration);
    return {chapter,elapsed,cycle:Math.max(1,Math.floor(Number.isFinite(saved?.cycle)?saved.cycle:1)),ended:chapter===FINAL&&elapsed>=SHOTS[FINAL].duration};
  }
  function snapshot(state){return {version:2,shot:SHOTS[state.chapter].id,elapsed:state.elapsed,cycle:state.cycle};}
  function position(state){return SHOTS.slice(0,state.chapter).reduce((n,s)=>n+s.duration,0)+state.elapsed;}
  function seek(state,seconds){
    seconds=Number.isFinite(seconds)?seconds:0;
    let left=clamp(seconds,0,TOTAL),chapter=0;
    while(chapter<FINAL&&left>=SHOTS[chapter].duration){left-=SHOTS[chapter].duration;chapter++;}
    return {...state,chapter,elapsed:left,ended:seconds>=TOTAL};
  }
  function advance(state,seconds,{loop=true,paused=false,hidden=false,waiting=false}={}){
    if(paused||hidden||waiting||state.ended||!Number.isFinite(seconds)||seconds<=0)return state;
    const next=position(state)+seconds;
    if(!loop)return seek(state,next);
    return seek({...state,cycle:state.cycle+Math.floor(next/TOTAL)},next%TOTAL);
  }
  const mix=(a,b,t)=>a+(b-a)*t;
  function camera(index,progress,ground,vehicle,aspect=16/9){
    const s=SHOTS[index];if(!s||s.id==='singularity')return null;
    const t=Math.max(0,Math.min(1,progress)),p=t*t*(3-2*t);
    let a=s.from,b=s.to,target=s.aim,end=s.endAim;
    if(s.id==='rover'){
      const v=vehicle||{x:-112,z:-85,yaw:Math.PI/2},angle=v.yaw-Math.PI/2+mix(.6,1.15,p);
      const eye=[v.x+Math.cos(angle)*8.2,ground(v.x,v.z)+2.35,v.z+Math.sin(angle)*8.2];
      target=[v.x,ground(v.x,v.z)+.95,v.z];
      return pose(eye,target,s.zoom,false,aspect,s.id,ground);
    }
    const eye=[mix(a[0],b[0],p),0,mix(a[2],b[2],p)];eye[1]=ground(eye[0],eye[2])+mix(a[1],b[1],p);
    const aim=[mix(target[0],end[0],p),0,mix(target[2],end[2],p)];aim[1]=ground(aim[0],aim[2])+mix(target[1],end[1],p);
    return pose(eye,aim,s.zoom,s.id==='signal',aspect,s.id,ground);
  }
  function pose(eye,target,zoom,signal,aspect,id,ground){
    const portrait=Math.max(0,Math.min(1,(1-aspect)/.5));
    // Widen portrait framing horizontally; pulling down from a high rocket target can bury the camera.
    eye=eye.map((v,i)=>i===1?v:target[i]+(v-target[i])*(1+portrait*.4));
    eye[1]=Math.max(eye[1],ground(eye[0],eye[2])+2);
    const dx=target[0]-eye[0],dy=target[1]-eye[1],dz=target[2]-eye[2];
    return {eye,yaw:Math.atan2(dx,-dz)-.2*Math.max(0,Math.min(1,(aspect-1)/.65)),pitch:Math.atan2(dy,Math.hypot(dx,dz))-portrait*(id==='camp'?.22:id==='campus'?0:.13),zoom:zoom*(1-portrait*.2),signal};
  }
  function eligible({enabled,reduced,paused,hidden,modal,nearHero,editing,focused=true}){return enabled&&!reduced&&!paused&&!hidden&&!modal&&nearHero&&!editing&&focused;}
  const api={SHOTS,TOTAL,FINAL,restore,snapshot,position,seek,advance,camera,eligible};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.ParallaxAfterDarkDirector=api;
})();
