/* Local simulation: fictional field rovers and a working night crew. */
(() => {
  'use strict';
  const TAU=Math.PI*2,clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const SPAWNS=[{id:'01',name:'Rover 01',x:12,z:-4,yaw:-.7},{id:'02',name:'Rover 02',x:-112,z:-85,yaw:Math.PI/2}];
  const CREW=[
    {name:'Mara',role:'Night shift lead',route:[[-102,-96]],work:'radio'},
    {name:'Ellis',role:'Propulsion technician',route:[[-105,-112],[-100,-112],[-102,-104]],work:'inspect'},
    {name:'Jun',role:'Integration engineer',route:[[-120,-87],[-119,-96],[-119,-103]],work:'tablet'},
    {name:'Inez',role:'Ground systems',route:[[-133,-114],[-126,-114],[-122,-115]],work:'repair'},
    {name:'Noah',role:'Flight operations',route:[[-98,-89],[-98,-98],[-98,-102]],work:'tablet'},
    {name:'Rae',role:'Vehicle support',route:[[-115,-80],[-108,-80]],work:'inspect'}
  ];
  function create(){return {vehicles:SPAWNS.map(s=>({...s,speed:0,wheel:0})),crew:CREW.map((s,i)=>({...s,x:s.route[0][0],z:s.route[0][1],yaw:i*.8,next:s.route.length>1?1:0,pause:i*.7,phase:i,walking:false})),driving:null,travel:0,clock:0};}
  const active=life=>life.vehicles.find(v=>v.id===life.driving);
  function crewTick(life,dt,player){life.clock+=dt;for(const p of life.crew){p.walking=false;if(Math.hypot(p.x-player.x,p.z-player.z)<4.5){p.yaw=Math.atan2(player.x-p.x,p.z-player.z);continue;}if(p.route.length===1)continue;if(p.pause>0){p.pause-=dt;continue;}if(Math.hypot(p.x-player.x,p.z-player.z)<2.8||life.vehicles.some(v=>Math.hypot(p.x-v.x,p.z-v.z)<4))continue;const target=p.route[p.next],dx=target[0]-p.x,dz=target[1]-p.z,d=Math.hypot(dx,dz);if(d<.15){p.next=(p.next+1)%p.route.length;p.pause=3.5;continue;}const step=Math.min(d,dt*.82);p.x+=dx/d*step;p.z+=dz/d*step;p.yaw=Math.atan2(dx,-dz);p.phase+=step*5.5;p.walking=true;}}
  function circles(v,r=1.03){return [-1.65,0,1.65].map(t=>({x:v.x+Math.sin(v.yaw)*t,z:v.z-Math.cos(v.yaw)*t,radius:r}));}
  function blocked(v,obstacles,ground){const cc=circles(v);if(cc.some(p=>Math.hypot(p.x,p.z)>207.8||obstacles.some(o=>Math.hypot(p.x-o.x,p.z-o.z)<p.radius+o.radius)))return true;return Math.abs(ground(cc[0].x,cc[0].z)-ground(cc[2].x,cc[2].z))>2.1;}
  function drive(life,state,forward,side,dt,obstacles,ground){const v=active(life);if(!v)return false;dt=clamp(dt,0,.05);const target=clamp(forward,-1,1)*(forward<0?4:12),accel=forward?5:8;v.speed+=clamp(target-v.speed,-accel*dt,accel*dt);if(Math.abs(v.speed)<.01)v.speed=0;const count=Math.max(1,Math.ceil(Math.abs(v.speed)*dt/.15));let moved=false;const solids=obstacles.concat(life.vehicles.filter(c=>c!==v).flatMap(c=>circles(c)),life.crew.map(p=>({x:p.x,z:p.z,radius:.5})));
    for(let i=0;i<count;i++){const step=dt/count,turn=clamp(side,-1,1)*v.speed*.13*step,old={x:v.x,z:v.z,yaw:v.yaw};v.yaw+=turn;v.x+=Math.sin(v.yaw)*v.speed*step;v.z-=Math.cos(v.yaw)*v.speed*step;if(blocked(v,solids,ground)){Object.assign(v,old);v.speed=0;break;}const distance=Math.hypot(v.x-old.x,v.z-old.z);life.travel+=distance;state.distance+=distance;v.wheel+=distance/.43;state.yaw+=turn;moved=moved||distance>0;}
    state.x=v.x;state.z=v.z;state.seated=false;state.edge=Math.hypot(v.x,v.z)>204;return moved;
  }
  function nearestVehicle(life,state){return life.vehicles.map(v=>({v,d:Math.hypot(v.x-state.x,v.z-state.z)})).sort((a,b)=>a.d-b.d)[0];}
  function enter(life,state,id){const v=life.vehicles.find(v=>v.id===id);if(!v||life.driving||Math.hypot(v.x-state.x,v.z-state.z)>4.5)return false;life.driving=id;v.speed=0;Object.assign(state,{x:v.x,z:v.z,yaw:v.yaw,pitch:-.16,seated:false});return true;}
  function exit(life,state,obstacles){const v=active(life);if(!v)return false;v.speed=0;const others=obstacles.concat(life.vehicles.flatMap(c=>circles(c)),life.crew.map(p=>({x:p.x,z:p.z,radius:.5})));
    for(const radius of [2.05,3.3,4.5])for(const a of [-Math.PI/2,Math.PI/2,Math.PI,0]){const p={x:v.x+Math.sin(v.yaw+a)*radius,z:v.z-Math.cos(v.yaw+a)*radius};if(Math.hypot(p.x,p.z)>209||others.some(o=>Math.hypot(p.x-o.x,p.z-o.z)<o.radius+.4))continue;Object.assign(state,p,{pitch:.01});life.driving=null;return true;}return false;
  }
  function brake(life){const v=active(life);if(v)v.speed=0;}
  // Shared triangle builder. Smooth radial normals keep rounded components readable at close range.
  function builder(){const data=[];let origin=[0,0,0],yaw=0,slopeX=0,slopeZ=0;const point=p=>[origin[0]+p[0]*Math.cos(yaw)-p[2]*Math.sin(yaw),origin[1]+p[1]+(p[0]*Math.cos(yaw)-p[2]*Math.sin(yaw))*slopeX+(p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw))*slopeZ,origin[2]+p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw)];
    function tri(a,b,c,k,t=.5){a=point(a);b=point(b);c=point(c);const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n);if(l<1e-9)return;for(const p of [a,b,c])data.push(...p,...n.map(v=>v/l),k,t);}
    const quad=(a,b,c,d,k,t)=>{tri(a,b,c,k,t);tri(a,c,d,k,t);};
    function box(x,y,z,w,h,d,k){const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],up=p=>[p[0],p[1]+h,p[2]];quad(a,b,up(b),up(a),k);quad(b,c,up(c),up(b),k);quad(c,e,up(e),up(c),k);quad(e,a,up(a),up(e),k);quad(up(a),up(b),up(c),up(e),k);quad(e,c,b,a,k);}
    function tube(a,b,r,k,sides=10,r2=r){const d=b.map((v,i)=>v-a[i]),l=Math.hypot(...d)||1,n=d.map(v=>v/l),raw=Math.abs(n[1])>.9?[1,0,0]:[n[2],0,-n[0]],ul=Math.hypot(...raw),u=raw.map(v=>v/ul),v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];const p=(c,r,t)=>c.map((q,i)=>q+r*(u[i]*Math.cos(t)+v[i]*Math.sin(t)));for(let j=0;j<sides;j++){const t=j/sides*TAU,tt=(j+1)/sides*TAU;quad(p(a,r,t),p(a,r,tt),p(b,r2,tt),p(b,r2,t),k);tri(a,p(a,r,tt),p(a,r,t),k);tri(b,p(b,r2,t),p(b,r2,tt),k);}}
    function ball(x,y,z,rx,ry,rz,k){for(let i=0;i<6;i++)for(let j=0;j<12;j++){const p=(a,b)=>[x+Math.sin(a)*Math.cos(b)*rx,y+Math.cos(a)*ry,z+Math.sin(a)*Math.sin(b)*rz];quad(p(i/6*Math.PI,j/12*TAU),p((i+1)/6*Math.PI,j/12*TAU),p((i+1)/6*Math.PI,(j+1)/12*TAU),p(i/6*Math.PI,(j+1)/12*TAU),k);}}
    return {data,tri,quad,box,tube,ball,at(x,y,z,angle=0,sx=0,sz=0){origin=[x,y,z];yaw=angle;slopeX=sx;slopeZ=sz;}};
  }
  function geometry(life,ground){const b=builder(),{box,quad,tube,ball}=b;
    for(const v of life.vehicles){b.at(v.x,ground(v.x,v.z),v.z,v.yaw,(ground(v.x+1,v.z)-ground(v.x-1,v.z))/2,(ground(v.x,v.z+1)-ground(v.x,v.z-1))/2);
      box(0,.43,0,1.86,.34,4.8,10); // chassis and angular stainless exoskeleton
      const profile=[[-2.65,.73],[-2.63,1.06],[-1.55,1.17],[-.30,1.92],[.32,1.95],[2.65,1.17],[2.65,.73]];
      for(const side of [-1,1]){const x=side*1.05;for(let i=1;i<profile.length-1;i++)b.tri([x,profile[0][1],profile[0][0]],[x,profile[i][1],profile[i][0]],[x,profile[i+1][1],profile[i+1][0]],39);}
      for(let i=0;i<profile.length;i++){const a=profile[i],c=profile[(i+1)%profile.length];quad([-1.05,a[1],a[0]],[1.05,a[1],a[0]],[1.05,c[1],c[0]],[-1.05,c[1],c[0]],39);}
      // Panoramic glass, divided side windows, door gaps, flush handles and mirrors.
      quad([-.96,1.2,-1.51],[.96,1.2,-1.51],[.88,1.89,-.30],[-.88,1.89,-.30],40);
      for(const s of [-1,1]){const x=s*1.065;quad([x,1.24,-1.39],[x,1.87,-.26],[x,1.88,.29],[x,1.24,1.38],40);tube([x,1.23,.10],[x,1.9,.10],.025,10,6);for(const z of [-1.4,.10,1.4])tube([x,.77,z],[x,1.24,z],.009,10,6);for(const z of [-.5,.7])box(x,1.18,z,.024,.032,.23,10);tube([x,1.25,-1.17],[s*1.24,1.30,-1.25],.027,10);box(s*1.24,1.28,-1.25,.20,.11,.24,39);}
      box(0,.81,-2.68,1.94,.065,.035,37);box(0,1.12,2.67,1.96,.058,.035,44);
      box(0,.56,-2.68,1.75,.13,.10,10);box(0,.60,2.69,1.64,.13,.10,10);
      for(let z=.65;z<2.55;z+=.14)box(0,1.96-(z-.32)*.337,z,1.97,.008,.012,41);
      for(const x of [-1.03,1.03])for(const z of [-1.67,1.63]){tube([x-.16,.46,z],[x+.16,.46,z],.46,10,20);const outside=x+Math.sign(x)*.17;tube([outside,.46,z],[outside+Math.sign(x)*.022,.46,z],.28,35,12);for(let j=0;j<7;j++){const a=j/7*TAU+v.wheel;tube([outside,.46,z],[outside,.46+Math.cos(a)*.24,z+Math.sin(a)*.24],.035,10,5);}for(let j=0;j<16;j++){const a=j/16*TAU+v.wheel;tube([x-.18,.46+Math.sin(a)*.459,z+Math.cos(a)*.459],[x+.18,.46+Math.sin(a)*.459,z+Math.cos(a)*.459],.017,41,5);}}
      box(0,1.975,.16,.50,.07,.20,38); // amber work beacon
    }
    life.crew.forEach((p,i)=>{b.at(p.x,ground(p.x,p.z),p.z,p.yaw);const work=!p.walking,phase=p.phase,swing=p.walking?Math.sin(phase)*.28:0,lean=work&&p.work==='repair'?.27:0;
      ball(0,1.09,-lean,.235,.285,.15,42);box(0,.91,-lean-.145,.38,.032,.023,45);box(0,1.20,-lean-.133,.38,.034,.023,45);box(0,.91,-lean+.145,.38,.032,.023,45);box(0,1.20,-lean+.133,.38,.034,.023,45); // reflective work vest
      for(const s of [-1,1]){const hip=[s*.105,.90,-lean*.4],knee=[s*.12,.48,s*swing*.50],ankle=[s*.13,.14,-s*swing];tube(hip,knee,.095,41,10);tube(knee,ankle,.072,41,10);box(s*.13,.035,ankle[2]-.065,.17,.15,.29,10);
        const shoulder=[s*.25,1.22,-lean],elbow=work?[s*.30,1.01,-.22-lean]:[s*.27,.96,-s*swing],hand=work?[s*.13,1.15+Math.sin(life.clock*2+i)*.024,-.43-lean]:[s*.27,.74,-s*swing*1.2];tube(shoulder,elbow,.073,41);tube(elbow,hand,.06,41);ball(...hand,.067,.085,.063,43);
      }
      tube([0,1.29,-lean],[0,1.40,-lean],.065,43);ball(0,1.49,-lean,.13,.17,.12,43);ball(0,1.61,-lean,.16,.11,.15,i%3===0?9:38);tube([0,1.60,-lean],[0,1.625,-lean],.18,i%3===0?9:38,16);
      box(0,1.49,-.117-lean,.21,.052,.018,40);if(work){box(0,1.095,-.44-lean,.25,.028,.19,35);box(0,1.125,-.44-lean,.20,.008,.14,36);}box(-.13,1.24,-.125-lean,.065,.075,.026,10);
    });return new Float32Array(b.data);
  }
  // Cache local poses; the GPU handles world transforms instead of rebuilding all meshes each frame.
  const modelCache=new Map();
  function models(life,ground){const commands=[],cached=(key,make)=>{if(!modelCache.has(key))modelCache.set(key,make());return modelCache.get(key);};
    for(const v of life.vehicles){const frame=((Math.floor(v.wheel/TAU*8)%8)+8)%8,key='rover-'+frame;commands.push({key,vertices:cached(key,()=>geometry({vehicles:[{x:0,z:0,yaw:0,wheel:frame/8*TAU}],crew:[],clock:0},()=>0)),x:v.x,y:ground(v.x,v.z),z:v.z,yaw:v.yaw,sx:(ground(v.x+1,v.z)-ground(v.x-1,v.z))/2,sz:(ground(v.x,v.z+1)-ground(v.x,v.z-1))/2});}
    for(const p of life.crew){const frame=p.walking?((Math.floor(p.phase/TAU*12)%12)+12)%12:Math.floor(life.clock*2)%4,key=(p.walking?'walk':p.work)+'-'+frame;commands.push({key,vertices:cached(key,()=>geometry({vehicles:[],crew:[{...p,x:0,z:0,yaw:0,phase:frame/12*TAU}],clock:frame*.5},()=>0)),x:p.x,y:ground(p.x,p.z),z:p.z,yaw:p.yaw,sx:0,sz:0});}return commands;
  }
  const api={SPAWNS,CREW,create,active,crewTick,circles,blocked,drive,nearestVehicle,enter,exit,brake,builder,geometry,models};
  if(typeof window!=='undefined')window.ParallaxLife=api;if(typeof module!=='undefined')module.exports=api;
})();
