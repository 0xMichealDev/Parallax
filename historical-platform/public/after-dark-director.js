(() => {
  'use strict';
  const SHOTS = [
    {id:'camp', name:'Night watch', tag:'01 / EARTHBOUND', title:'The night is\njust the beginning.', text:'A fire. A telescope. A sky worth getting lost in.', action:'Walk the desert', duration:15, from:[7,2.8,1], to:[4,2.4,-1], aim:[-1,1.3,-9], endAim:[0,3.4,-14], zoom:1},
    {id:'campus', name:'The launch campus', tag:'02 / THE NEXT FRONTIER', title:'Built for\na bigger horizon.', text:'Explore the launch campus. Meet the night crew.', action:'Enter the experience', duration:15, from:[-77,9,-64], to:[-84,12,-68], aim:[-115,28,-116], endAim:[-114,30,-119], zoom:.9},
    {id:'rover', name:'Desert runners', tag:'03 / TAKE THE WHEEL', title:'Leave the\nordinary behind.', text:'Two drivable rovers. Open trails. Your next discovery.', action:'Explore on foot', duration:13, zoom:1.05},
    {id:'signal', name:'The quiet signal', tag:'04 / AN UNEXPECTED DISCOVERY', title:'Something\nis transmitting.', text:'Follow the signal. Uncover what fell from the sky.', action:'Begin your story', duration:15, from:[54,3.2,-56], to:[56,2.6,-59], aim:[65,.8,-69], endAim:[65,1.3,-69], zoom:1.05},
    {id:'singularity', name:'Find your orbit', tag:'05 / PARALLAX · $PRLX', title:'Find your orbit.', text:'An explorable universe. A home for your project.', action:'Discover community projects', duration:17}
  ];
  const mix=(a,b,t)=>a+(b-a)*t;
  function camera(index,progress,ground,vehicle,aspect=16/9){
    const s=SHOTS[index];if(!s||s.id==='singularity')return null;
    const t=Math.max(0,Math.min(1,progress)),p=t*t*(3-2*t);
    let a=s.from,b=s.to,target=s.aim,end=s.endAim;
    if(s.id==='rover'){
      const v=vehicle||{x:-112,z:-85,yaw:Math.PI/2},angle=v.yaw-Math.PI/2+mix(.6,1.15,p);
      const eye=[v.x+Math.cos(angle)*8.2,ground(v.x,v.z)+2.35,v.z+Math.sin(angle)*8.2];
      target=[v.x,ground(v.x,v.z)+.95,v.z];
      return pose(eye,target,s.zoom,false,aspect,s.id);
    }
    const eye=[mix(a[0],b[0],p),0,mix(a[2],b[2],p)];eye[1]=ground(eye[0],eye[2])+mix(a[1],b[1],p);
    const aim=[mix(target[0],end[0],p),0,mix(target[2],end[2],p)];aim[1]=ground(aim[0],aim[2])+mix(target[1],end[1],p);
    return pose(eye,aim,s.zoom,s.id==='signal',aspect,s.id);
  }
  function pose(eye,target,zoom,signal,aspect,id){
    const portrait=Math.max(0,Math.min(1,(1-aspect)/.5));
    eye=eye.map((v,i)=>target[i]+(v-target[i])*(1+portrait*.4));
    const dx=target[0]-eye[0],dy=target[1]-eye[1],dz=target[2]-eye[2];
    return {eye,yaw:Math.atan2(dx,-dz)-.2*Math.max(0,Math.min(1,(aspect-1)/.65)),pitch:Math.atan2(dy,Math.hypot(dx,dz))-portrait*(id==='camp'?.22:id==='campus'?0:.13),zoom:zoom*(1-portrait*.2),signal};
  }
  function eligible({enabled,reduced,paused,hidden,modal,nearHero,editing,focused=true}){return enabled&&!reduced&&!paused&&!hidden&&!modal&&nearHero&&!editing&&focused;}
  const api={SHOTS,camera,eligible};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.ParallaxAfterDarkDirector=api;
})();
