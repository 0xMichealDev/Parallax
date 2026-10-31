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
  function create(){return {vehicles:SPAWNS.map(s=>({...s,speed:0,wheel:0,steer:0})),crew:CREW.map((s,i)=>({...s,x:s.route[0][0],z:s.route[0][1],yaw:i*.8,next:s.route.length>1?1:0,pause:i*.7,phase:i,walking:false})),driving:null,travel:0,clock:0};}
  const active=life=>life.vehicles.find(v=>v.id===life.driving);
  const STUNT_SECONDS=1.6;
  function stuntPose(v){
    if(!v?.stunt)return {height:0,roll:0};
    const p=clamp(v.stunt.time/STUNT_SECONDS,0,1),spin=clamp((p-.18)/.64,0,1);
    return {height:16*p*(1-p),roll:TAU*spin*spin*(3-2*spin)};
  }
  function stuntJump(life){const v=active(life);if(!v||v.stunt||v.stuntCooldown>0)return false;v.stunt={time:0};return true;}
  function stuntTick(life,dt){let changed=false;const step=clamp(dt,0,.1);for(const v of life.vehicles){v.stuntCooldown=Math.max(0,(v.stuntCooldown||0)-step);if(!v.stunt)continue;changed=true;v.stunt.time+=step;if(v.stunt.time>=STUNT_SECONDS){v.stunt=null;v.stuntCooldown=.45;}}return changed;}
  function cancelStunts(life){for(const v of life.vehicles){v.stunt=null;v.stuntCooldown=0;}}
  function crewTick(life,dt,player){life.clock+=dt;for(const p of life.crew){p.walking=false;if(Math.hypot(p.x-player.x,p.z-player.z)<4.5){p.yaw=Math.atan2(player.x-p.x,p.z-player.z);continue;}if(p.route.length===1)continue;if(p.pause>0){p.pause-=dt;continue;}if(Math.hypot(p.x-player.x,p.z-player.z)<2.8||life.vehicles.some(v=>Math.hypot(p.x-v.x,p.z-v.z)<4))continue;const target=p.route[p.next],dx=target[0]-p.x,dz=target[1]-p.z,d=Math.hypot(dx,dz);if(d<.15){p.next=(p.next+1)%p.route.length;p.pause=3.5;continue;}const step=Math.min(d,dt*.82);p.x+=dx/d*step;p.z+=dz/d*step;p.yaw=Math.atan2(dx,-dz);p.phase+=step*5.5;p.walking=true;}}
  function circles(v,r=1.03){return [-1.81,0,1.81].map(t=>({x:v.x+Math.sin(v.yaw)*t,z:v.z-Math.cos(v.yaw)*t,radius:r}));}
  function blocked(v,obstacles,ground){const cc=circles(v);if(ground.canTraverse&&cc.some(p=>!ground.canTraverse(p.x,p.z)))return true;if(cc.some(p=>Math.hypot(p.x,p.z)>207.8||obstacles.some(o=>Math.hypot(p.x-o.x,p.z-o.z)<p.radius+o.radius)))return true;return Math.abs(ground(cc[0].x,cc[0].z)-ground(cc[2].x,cc[2].z))>2.1;}
  function drive(life,state,forward,side,dt,obstacles,ground){const v=active(life);if(!v)return false;dt=clamp(dt,0,.05);v.steer=(v.steer||0)+(clamp(side,-1,1)*.40-(v.steer||0))*Math.min(1,dt*8);const target=clamp(forward,-1,1)*(forward<0?4:12),accel=forward?5:8;v.speed+=clamp(target-v.speed,-accel*dt,accel*dt);if(Math.abs(v.speed)<.01)v.speed=0;const count=Math.max(1,Math.ceil(Math.abs(v.speed)*dt/.15));let moved=false;const solids=obstacles.concat(life.vehicles.filter(c=>c!==v).flatMap(c=>circles(c)),life.crew.map(p=>({x:p.x,z:p.z,radius:.5})));
    for(let i=0;i<count;i++){const step=dt/count,turn=clamp(side,-1,1)*v.speed*.13*step,old={x:v.x,z:v.z,yaw:v.yaw};v.yaw+=turn;v.x+=Math.sin(v.yaw)*v.speed*step;v.z-=Math.cos(v.yaw)*v.speed*step;if(blocked(v,solids,ground)){Object.assign(v,old);v.speed=0;break;}const distance=Math.hypot(v.x-old.x,v.z-old.z);life.travel+=distance;state.distance+=distance;v.wheel+=Math.sign(v.speed)*distance/.445;state.yaw+=turn;moved=moved||distance>0;}
    state.x=v.x;state.z=v.z;state.seated=false;state.edge=Math.hypot(v.x,v.z)>204;return moved;
  }
  function nearestVehicle(life,state){return life.vehicles.map(v=>({v,d:Math.hypot(v.x-state.x,v.z-state.z)})).sort((a,b)=>a.d-b.d)[0];}
  function enter(life,state,id){const v=life.vehicles.find(v=>v.id===id);if(!v||life.driving||Math.hypot(v.x-state.x,v.z-state.z)>4.5)return false;life.driving=id;v.speed=0;Object.assign(state,{x:v.x,z:v.z,yaw:v.yaw,pitch:-.16,seated:false});return true;}
  function exit(life,state,obstacles){const v=active(life);if(!v||v.stunt)return false;v.speed=0;const others=obstacles.concat(life.vehicles.flatMap(c=>circles(c)),life.crew.map(p=>({x:p.x,z:p.z,radius:.5})));
    for(const radius of [2.05,3.3,4.5])for(const a of [-Math.PI/2,Math.PI/2,Math.PI,0]){const p={x:v.x+Math.sin(v.yaw+a)*radius,z:v.z-Math.cos(v.yaw+a)*radius};if(Math.hypot(p.x,p.z)>209||others.some(o=>Math.hypot(p.x-o.x,p.z-o.z)<o.radius+.4))continue;Object.assign(state,p,{pitch:.01});life.driving=null;return true;}return false;
  }
  function brake(life){const v=active(life);if(v)v.speed=0;}
  // Shared triangle builder. Smooth radial normals keep rounded components readable at close range.
  function builder(){const data=[];let origin=[0,0,0],yaw=0,slopeX=0,slopeZ=0;const point=p=>[origin[0]+p[0]*Math.cos(yaw)-p[2]*Math.sin(yaw),origin[1]+p[1]+(p[0]*Math.cos(yaw)-p[2]*Math.sin(yaw))*slopeX+(p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw))*slopeZ,origin[2]+p[0]*Math.sin(yaw)+p[2]*Math.cos(yaw)];
    function tri(a,b,c,k,t=.5,smooth){a=point(a);b=point(b);c=point(c);const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n);if(l<1e-9)return;for(const [i,p]of [a,b,c].entries()){let nn=n.map(v=>v/l);if(smooth){const v=smooth[i];nn=[v[0]*Math.cos(yaw)-v[2]*Math.sin(yaw)-slopeX*v[1],v[1],v[0]*Math.sin(yaw)+v[2]*Math.cos(yaw)-slopeZ*v[1]];const len=Math.hypot(...nn)||1;nn=nn.map(v=>v/len);}data.push(...p,...nn,k,t);}}
    const quad=(a,b,c,d,k,t)=>{tri(a,b,c,k,t);tri(a,c,d,k,t);};
    function box(x,y,z,w,h,d,k){const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],up=p=>[p[0],p[1]+h,p[2]];quad(a,b,up(b),up(a),k);quad(b,c,up(c),up(b),k);quad(c,e,up(e),up(c),k);quad(e,a,up(a),up(e),k);quad(up(a),up(b),up(c),up(e),k);quad(e,c,b,a,k);}
    function tube(a,b,r,k,sides=10,r2=r){const d=b.map((v,i)=>v-a[i]),l=Math.hypot(...d)||1,n=d.map(v=>v/l),raw=Math.abs(n[1])>.9?[1,0,0]:[n[2],0,-n[0]],ul=Math.hypot(...raw),u=raw.map(v=>v/ul),v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]];const p=(c,r,t)=>c.map((q,i)=>q+r*(u[i]*Math.cos(t)+v[i]*Math.sin(t)));for(let j=0;j<sides;j++){const t=j/sides*TAU,tt=(j+1)/sides*TAU;quad(p(a,r,t),p(a,r,tt),p(b,r2,tt),p(b,r2,t),k);tri(a,p(a,r,tt),p(a,r,t),k);tri(b,p(b,r2,t),p(b,r2,tt),k);}}
    function ball(x,y,z,rx,ry,rz,k){for(let i=0;i<6;i++)for(let j=0;j<12;j++){const p=(a,b)=>[x+Math.sin(a)*Math.cos(b)*rx,y+Math.cos(a)*ry,z+Math.sin(a)*Math.sin(b)*rz];quad(p(i/6*Math.PI,j/12*TAU),p((i+1)/6*Math.PI,j/12*TAU),p((i+1)/6*Math.PI,(j+1)/12*TAU),p(i/6*Math.PI,(j+1)/12*TAU),k);}}
    return {data,tri,quad,box,tube,ball,at(x,y,z,angle=0,sx=0,sz=0){origin=[x,y,z];yaw=angle;slopeX=sx;slopeZ=sz;}};
  }
  // Custom production-style model, referenced against Tesla's exterior and dimension diagrams:
  // tesla.com/ownersmanual/cybertruck/en_us/GUID-12A976DD-EB60-431B-AFF1-5A37E95006DB.html
  const TRUCK={length:5.683,width:2.032,height:1.854,wheelbase:3.635,track:1.772,frontAxle:-1.963,rearAxle:1.672,tireRadius:.445};
  function truckPose(v,ground){return {y:ground(v.x,v.z)+stuntPose(v).height,sx:(ground(v.x+1,v.z)-ground(v.x-1,v.z))/2,sz:(ground(v.x,v.z+1)-ground(v.x,v.z-1))/2};}
  function wheelPose(v,side,front,pose){const x=side*TRUCK.track/2,z=front?TRUCK.frontAxle:TRUCK.rearAxle,dx=x*Math.cos(v.yaw)-z*Math.sin(v.yaw),dz=x*Math.sin(v.yaw)+z*Math.cos(v.yaw);return {x:v.x+dx,y:pose.y+TRUCK.tireRadius+dx*pose.sx+dz*pose.sz,z:v.z+dz,yaw:v.yaw+(v.steer||0)*(front?1:-.2)};}
  function panel(b,points,material,facing,tone=.5){const a=points[0],u=points[1].map((v,i)=>v-a[i]),v=points[2].map((v,i)=>v-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(n.reduce((s,v,i)=>s+v*facing[i],0)<0)points=points.slice().reverse();for(let i=1;i<points.length-1;i++)b.tri(points[0],points[i],points[i+1],material,tone);}
  function truckBox(b,x,y,z,w,h,d,k){const a=[x-w/2,y,z-d/2],c=[x+w/2,y,z+d/2],up=p=>[p[0],p[1]+h,p[2]],p=[c[0],y,a[2]],q=[a[0],y,c[2]];panel(b,[a,p,up(p),up(a)],k,[0,0,-1]);panel(b,[p,c,up(c),up(p)],k,[1,0,0]);panel(b,[c,q,up(q),up(c)],k,[0,0,1]);panel(b,[q,a,up(a),up(q)],k,[-1,0,0]);panel(b,[up(a),up(p),up(c),up(q)],k,[0,1,0]);panel(b,[a,p,c,q],k,[0,-1,0]);}
  function truckBody(b){const {tube}=b,front=-TRUCK.length/2,rear=TRUCK.length/2,half=TRUCK.width/2;
    const belt=z=>1.08+(z-front)/(rear-front)*.17,sideX=y=>half-Math.max(0,y-1.235)*.30;
    const lower=z=>{let y=.45;for(const center of [TRUCK.frontAxle,TRUCK.rearAxle]){const d=Math.abs(z-center);if(d<.71)y=Math.max(y,d<.37?1.105:1.105-(d-.37)/.34*.655);}return y;};
    const sidePoint=(side,y,z)=>[side*sideX(y),y,z];
    truckBox(b,0,.30,0,1.66,.18,4.68,46);
    for(const side of [-1,1]){
      const stops=[front,...[TRUCK.frontAxle,TRUCK.rearAxle].flatMap(z=>[z-.71,z-.37,z+.37,z+.71]),rear].sort((a,b)=>a-b);
      for(let i=0;i<stops.length-1;i++){const a=stops[i],c=stops[i+1];panel(b,[sidePoint(side,lower(a),a),sidePoint(side,lower(c),c),sidePoint(side,belt(c),c),sidePoint(side,belt(a),a)],39,[side,0,0]);}
      // The roof is inset; separate front/rear windows leave proper A/B/C pillars.
      panel(b,[sidePoint(side,belt(-1.96),-1.96),sidePoint(side,1.854,-.49),sidePoint(side,1.672,.88),sidePoint(side,belt(.96),.96)],39,[side,0,0]);
      const glass=(y,z)=>{const p=sidePoint(side,y,z);p[0]+=side*.005;return p;};
      panel(b,[glass(1.155,-1.84),glass(1.79,-.47),glass(1.754,-.19),glass(1.216,-.19)],49,[side,0,0]);
      panel(b,[glass(1.219,-.115),glass(1.743,-.115),glass(1.639,.755),glass(1.244,.82)],49,[side,0,0]);
      // Door seams and black rockers. Cybertruck uses pillar buttons rather than handles.
      // A crisp folded shoulder catches the sky along the uninterrupted steel belt.
      for(const [a,c] of [[-1.25,-.15],[-.15,.96]]){
        panel(b,[[side*(half+.006),belt(a)-.055,a],[side*(half+.006),belt(c)-.055,c],[side*(half-.014),belt(c),c],[side*(half-.014),belt(a),a]],39,[side,1,0],.62);
      }
      for(const z of [-1.245,-.15,.965])tube([side*(half+.004),lower(z)+.014,z],[side*(half+.004),belt(z)-.015,z],.0048,47,5);
      for(const z of [-.16,.87])truckBox(b,side*(sideX(1.31)+.01),1.30,z,.008,.028,.020,47);
      panel(b,[[side*(half+.003),.455,-1.22],[side*(half+.003),.455,.94],[side*(half+.003),.59,.94],[side*(half+.003),.59,-1.22]],52,[side,0,0]);
      truckBox(b,side*.965,.37,-.12,.15,.075,2.12,47);
      // Open polygonal wheel wells with thick, beveled black arch surrounds.
      for(const center of [TRUCK.frontAxle,TRUCK.rearAxle]){
        const inner=[[-.685,.45],[-.37,1.08],[.37,1.08],[.685,.45]],outer=[[-.805,.43],[-.435,1.20],[.435,1.20],[.805,.43]];
        for(let j=0;j<3;j++){const a=inner[j],c=inner[j+1],d=outer[j+1],e=outer[j];panel(b,[[side*1.046,a[1],center+a[0]],[side*1.046,c[1],center+c[0]],[side*1.031,d[1],center+d[0]],[side*1.031,e[1],center+e[0]]],47,[side,0,0]);panel(b,[[side*.91,a[1],center+a[0]],[side*.91,c[1],center+c[0]],[side*1.046,c[1],center+c[0]],[side*1.046,a[1],center+a[0]]],46,[side,0,0]);}
        // Recessed liner behind the wheel keeps the body opening dark.
        for(let j=0;j<18;j++){const a=j/18*Math.PI,aa=(j+1)/18*Math.PI,p=t=>[side*.775,.445+Math.sin(t)*.60,center+Math.cos(t)*.60];panel(b,[[side*.775,.445,center],p(a),p(aa)],46,[side,0,0]);}
      }
      // Triangular mirror housings with reflective rear faces.
      tube([side*.995,1.195,-1.13],[side*1.155,1.265,-1.12],.033,47,8);
      const m=[[side*1.025,1.23,-1.30],[side*1.215,1.24,-1.16],[side*1.175,1.365,-1.035],[side*1.035,1.34,-1.08]];
      panel(b,m,47,[side,.2,-.5]);panel(b,m.map(p=>[p[0],p[1],p[2]+.053]),50,[side,0,1]);for(let j=0;j<4;j++)panel(b,[m[j],m[(j+1)%4],m[(j+1)%4].map((p,i)=>p+(i===2?.053:0)),m[j].map((p,i)=>p+(i===2?.053:0))],47,[side,1,0]);
      // Side camera and discreet marker lights.
      truckBox(b,side*(half+.012),1.114,-1.275,.015,.036,.072,47);truckBox(b,side*1.062,.73,TRUCK.frontAxle-.64,.012,.028,.12,51);
    }
    // Broad frunk and enormous windshield; steel edges remain visible around the glass.
    panel(b,[[-half,1.08,front],[half,1.08,front],[half,belt(-1.96),-1.96],[-half,belt(-1.96),-1.96]],39,[0,1,0]);
    panel(b,[[-half,belt(-1.96),-1.96],[half,belt(-1.96),-1.96],[sideX(1.854),1.854,-.49],[-sideX(1.854),1.854,-.49]],47,[0,1,-1]);
    panel(b,[[-.965,1.134,-1.917],[.965,1.134,-1.917],[.82,1.842,-.523],[-.82,1.842,-.523]],49,[0,1,-1]);
    // Single oversized wiper parked against the driver's side of the windshield.
    tube([-.935,1.16,-1.895],[-.817,1.815,-.565],.011,47,8);tube([-.82,1.19,-1.86],[-.894,1.45,-1.35],.013,47,8);
    panel(b,[[-sideX(1.854),1.854,-.49],[sideX(1.854),1.854,-.49],[sideX(1.672),1.672,.88],[-sideX(1.672),1.672,.88]],39,[0,1,0]);
    panel(b,[[-.80,1.852,-.44],[.80,1.852,-.44],[.847,1.686,.83],[-.847,1.686,.83]],49,[0,1,0]);
    // Closed, dark roller cover rather than a stainless slatted roof over the bed.
    const coverY=z=>1.662-(z-.92)*.213;
    panel(b,[[-.90,coverY(.92),.92],[.90,coverY(.92),.92],[.94,coverY(2.785),2.785],[-.94,coverY(2.785),2.785]],47,[0,1,0]);
    for(let z=.98;z<2.78;z+=.075)panel(b,[[-.9,coverY(z)+.002,z],[.9,coverY(z)+.002,z],[.9,coverY(z+.007)+.002,z+.007],[-.9,coverY(z+.007)+.002,z+.007]],46,[0,1,0]);
    for(const side of [-1,1]){panel(b,[[side*.90,1.668,.90],[side*sideX(1.672),1.672,.88],[side*half,1.25,rear],[side*.94,1.258,2.785]],39,[side,1,0]);panel(b,[sidePoint(side,belt(.96),.96),sidePoint(side,1.66,.96),sidePoint(side,1.25,rear)],39,[side,0,0]);}
    // Full-width lightbar at the hood edge and inset headlamps low in the bumper.
    // Folded stainless nose: a broad flat face and chamfered corners, not a box.
    panel(b,[[-.88,.61,front],[.88,.61,front],[.96,1.024,front],[-.96,1.024,front]],39,[0,0,-1]);
    for(const side of [-1,1]){
      panel(b,[[side*.88,.61,front],[side*.96,1.024,front],[side*half,1.024,front+.105],[side*half,.56,front+.15]],39,[side,0,-1]);
      panel(b,[[side*.88,.61,front],[side*half,.56,front+.15],[side*.82,.49,front+.17]],47,[side,-1,-1]);
      // Short wraparound ends join the full-width daytime light blade.
      truckBox(b,side*1.004,1.046,front+.035,.024,.025,.11,37);
    }
    panel(b,[[-.88,.61,front],[.88,.61,front],[.82,.49,front+.17],[-.82,.49,front+.17]],47,[0,-1,-1]);
    truckBox(b,0,1.030,front-.009,2.032,.052,.024,47);
    truckBox(b,0,1.044,front-.025,2.012,.025,.012,37);
    truckBox(b,0,.46,front+.09,1.65,.13,.17,47);truckBox(b,0,.35,front+.18,1.43,.11,.22,46);
    for(const side of [-1,1]){truckBox(b,side*.867,.40,front+.076,.32,.23,.19,47);truckBox(b,side*.795,.62,front-.008,.33,.064,.022,46);truckBox(b,side*.795,.639,front-.023,.28,.022,.018,37);tube([side*.52,.42,front+.01],[side*.52,.38,front-.045],.018,48,10);}
    for(let i=0;i<6;i++)truckBox(b,0,.493+i*.021,front-.008,1.38,.006,.015,46);
    truckBox(b,0,.645,front-.019,.055,.035,.013,50);
    // Tailgate, segmented light rail, bumper steps, license recess and receiver hitch.
    panel(b,[[-half,.51,rear],[half,.51,rear],[half,1.20,rear],[-half,1.20,rear]],39,[0,0,1]);
    truckBox(b,0,1.20,rear,2.03,.051,.022,47);truckBox(b,0,1.213,rear+.015,1.91,.018,.01,44);
    for(const side of [-1,1]){truckBox(b,side*.939,1.205,rear+.015,.14,.053,.013,44);truckBox(b,side*.965,.535,rear+.011,.005,.60,.012,47);truckBox(b,side*.80,.414,rear-.015,.39,.21,.21,47);truckBox(b,side*.80,.628,rear-.015,.39,.018,.22,46);truckBox(b,side*.80,.63,rear+.031,.16,.018,.014,44);}
    truckBox(b,0,.41,rear-.04,1.30,.14,.18,47);truckBox(b,0,.544,rear+.012,.42,.12,.01,46);truckBox(b,0,.559,rear+.02,.32,.077,.008,48);truckBox(b,0,.286,rear-.04,.11,.10,.17,46);truckBox(b,0,.292,rear+.049,.069,.067,.008,10);
    truckBox(b,0,1.196,rear+.035,.043,.025,.015,50);
    // Charge-port flap ahead of the left rear lamp, flush with the side panel.
    panel(b,[[-half-.004,.93,2.34],[-half-.004,1.16,2.34],[-half-.004,1.16,2.59],[-half-.004,.93,2.59]],52,[-1,0,0]);
  }
  function truckWheel(b,spin,side){
    const profile=[[-.146,.284],[-.152,.353],[-.133,.406],[-.089,.437],[-.056,.445],[.056,.445],[.10,.431],[.141,.393],[.157,.307]],segments=40;
    for(let j=0;j<profile.length-1;j++)for(let i=0;i<segments;i++){const a=i/segments*TAU,c=(i+1)/segments*TAU,[x,r]=profile[j],[xx,rr]=profile[j+1],p=(x,r,a)=>[x,Math.sin(a)*r,Math.cos(a)*r],slope=(rr-r)/(xx-x),normal=a=>{const n=[-slope,Math.sin(a),Math.cos(a)],l=Math.hypot(...n);return n.map(v=>v/l);};const A=p(x,r,a),B=p(x,r,c),C=p(xx,rr,c),D=p(xx,rr,a),N=[normal(a),normal(c),normal(c),normal(a)];b.tri(A,B,C,46,.5,[N[0],N[1],N[2]]);b.tri(A,C,D,46,.5,[N[0],N[2],N[3]]);}
    // Raised staggered tread blocks follow the round tire instead of crossing it as bars.
    for(let i=0;i<32;i++)for(const band of [-1,0,1]){const a=i/32*TAU+spin+band*.025,da=.062,x=band*.062,rr=band===0?.449:.443,p=(xx,t)=>[xx,Math.sin(t)*rr,Math.cos(t)*rr];panel(b,[p(x-.025,a-da),p(x+.025,a-da+.023),p(x+.025,a+da),p(x-.025,a+da-.023)],47,[0,Math.sin(a),Math.cos(a)]);}
    // Seven broad aero sections and a recessed center cap match the production wheel silhouette.
    const cap=side*.167,radial=(r,a,x=cap)=>[x,Math.sin(a)*r,Math.cos(a)*r];
    // Dark recessed barrel behind the seven angular covers prevents see-through rims.
    for(let i=0;i<40;i++){const a=i/40*TAU,c=(i+1)/40*TAU;panel(b,[[cap-side*.018,0,0],radial(.304,a,cap-side*.018),radial(.304,c,cap-side*.018)],46,[side,0,0]);}
    for(let i=0;i<40;i++){const a=i/40*TAU,c=(i+1)/40*TAU;panel(b,[radial(.265,a),radial(.313,a),radial(.313,c),radial(.265,c)],48,[side,0,0]);}
    for(let i=0;i<7;i++){const a=i/7*TAU+spin,da=TAU/7;panel(b,[radial(.085,a+.04,cap+side*.008),radial(.278,a+.045),radial(.293,a+da*.69),radial(.109,a+da*.84,cap+side*.008)],48,[side,0,0]);panel(b,[radial(.13,a+.06,cap+side*.012),radial(.291,a+.07,cap+side*.003),radial(.292,a+.095,cap+side*.003),radial(.128,a+.095,cap+side*.012)],47,[side,0,0]);}
    b.tube([cap,0,0],[cap+side*.014,0,0],.096,47,7);for(let i=0;i<6;i++){const a=i/6*TAU+spin;b.tube(radial(.060,a,cap+side*.015),radial(.060,a,cap+side*.019),.008,48,6);}
  }
/* Drop-in mesh asset. Uses only builder.tri; coordinates are metres, facing -Z.
 * Call crewBody(b, person, stableCrewIndex, simulationClock) after b.at().
 * Material 57 uses tone (0..1) for a natural skin-colour range.
 */
function crewBody(b,p,index,clock){
  const TAU=Math.PI*2,walk=!!p.walking,phase=p.phase||0,work=p.work||'inspect';
  const gait=walk?Math.sin(phase):0,bob=walk?Math.cos(phase*2)*.011:Math.sin(clock*1.4+index)*.003;
  const lean=!walk&&work==='repair'?.24:walk?.018:0;
  const height=[1,.982,1.018,.966,1.027,.995][index%6]||1;
  const skin=[.69,.37,.53,.82,.42,.62][index%6]||.55;
  const pos=v=>[v[0],(v[1]+bob)*height,v[2]-Math.max(0,v[1]-.9)*lean];
  const normal=(n,v)=>{const q=[n[0],(n[1]+(v[1]>.9?lean*n[2]:0))/height,n[2]],l=Math.hypot(...q)||1;return q.map(t=>t/l);};
  const tri=(a,c,d,k,t=.5,ns)=>{const u=c.map((v,i)=>v-a[i]),v=d.map((q,i)=>q-a[i]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];if(ns&&cross.reduce((s,v,i)=>s+v*ns[0][i],0)<0){[c,d]=[d,c];ns=[ns[0],ns[2],ns[1]];}b.tri(pos(a),pos(c),pos(d),k,t,ns&&ns.map((n,i)=>normal(n,[a,c,d][i])));};
  const unit=v=>{const l=Math.hypot(...v)||1;return v.map(q=>q/l);};
  const cross=(a,c)=>[a[1]*c[2]-a[2]*c[1],a[2]*c[0]-a[0]*c[2],a[0]*c[1]-a[1]*c[0]];
  const mix=(a,c,t)=>a.map((v,i)=>v+(c[i]-v)*t);
  function surface(center,radius,k,t=.5,cols=10,rows=6,start=0,end=Math.PI){
    if(Math.max(...radius)<.055){cols=Math.min(cols,6);rows=Math.min(rows,3);}
    else if(Math.max(...radius)<.12){cols=Math.min(cols,10);rows=Math.min(rows,5);}
    const point=(a,c)=>center.map((v,i)=>v+radius[i]*[Math.sin(a)*Math.cos(c),Math.cos(a),Math.sin(a)*Math.sin(c)][i]);
    const n=(a,c)=>unit([Math.sin(a)*Math.cos(c)/radius[0],Math.cos(a)/radius[1],Math.sin(a)*Math.sin(c)/radius[2]]);
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=start+(end-start)*i/rows,aa=start+(end-start)*(i+1)/rows,c=j/cols*TAU,cc=(j+1)/cols*TAU,A=point(a,c),B=point(aa,c),C=point(aa,cc),D=point(a,cc);tri(A,B,C,k,t,[n(a,c),n(aa,c),n(aa,cc)]);tri(A,C,D,k,t,[n(a,c),n(aa,cc),n(a,cc)]);}
  }
  // Smooth tapered garment/limb profiles; capped ends overlap at anatomical joints.
  function limb(a,c,r1,r2,k,t=.5,sides=8){
    const dir=unit(c.map((v,i)=>v-a[i])),u=unit(cross(Math.abs(dir[1])>.85?[1,0,0]:[0,1,0],dir)),v=cross(dir,u),len=Math.hypot(...c.map((q,i)=>q-a[i]));
    const rings=r1<.03?[[0,r1],[1,r2]]:[[0,r1*.76],[.36,r1*.86+r2*.14],[1,r2*.78]];
    const pt=(ring,ang)=>{const [s,r]=ring,cen=mix(a,c,s);return cen.map((q,i)=>q+r*(u[i]*Math.cos(ang)+v[i]*Math.sin(ang)));};
    for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++){
      const ang=j/sides*TAU,next=(j+1)/sides*TAU,slope=(rings[i+1][1]-rings[i][1])/((rings[i+1][0]-rings[i][0])*len),n=q=>unit(dir.map((x,k)=>u[k]*Math.cos(q)+v[k]*Math.sin(q)-x*slope));
      const A=pt(rings[i],ang),B=pt(rings[i],next),C=pt(rings[i+1],next),D=pt(rings[i+1],ang);tri(A,B,C,k,t,[n(ang),n(next),n(next)]);tri(A,C,D,k,t,[n(ang),n(next),n(ang)]);
      if(i===0&&r1<.03)tri(a,B,A,k,t,[dir.map(v=>-v),dir.map(v=>-v),dir.map(v=>-v)]);
      if(i===rings.length-2&&r1<.03)tri(c,D,C,k,t,[dir,dir,dir]);
    }
  }
  function box(x,y,z,w,h,d,k,t=.5){
    const points=[[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]].map(p=>[x+p[0]*w/2,y+p[1]*h/2,z+p[2]*d/2]);
    for(const [face,n]of [[[0,1,2,3],[0,0,-1]],[[1,5,6,2],[1,0,0]],[[5,4,7,6],[0,0,1]],[[4,0,3,7],[-1,0,0]],[[3,2,6,7],[0,1,0]],[[4,5,1,0],[0,-1,0]]]){const[a,c,d,e]=face.map(i=>points[i]);tri(a,c,d,k,t,[n,n,n]);tri(a,d,e,k,t,[n,n,n]);}
  }
  // Contoured jacket and vest. Broad shoulders taper into a narrower waist.
  function torso(material,offset,start=0,end=TAU,tone=.5){
    const rings=[[.925,.145,.105],[1.00,.155,.116],[1.17,.178,.126],[1.34,.206,.130],[1.405,.204,.116],[1.43,.128,.099]],sides=end-start<TAU-.1?8:12;
    for(let i=0;i<rings.length-1;i++)for(let j=0;j<sides;j++){
      const a=start+(end-start)*j/sides,c=start+(end-start)*(j+1)/sides,point=(r,q)=>[Math.cos(q)*(r[1]+offset),r[0],Math.sin(q)*(r[2]+offset)],N=q=>unit([Math.cos(q),.04,Math.sin(q)*1.25]);
      const A=point(rings[i],a),B=point(rings[i],c),C=point(rings[i+1],c),D=point(rings[i+1],a);tri(A,B,C,material,tone,[N(a),N(c),N(c)]);tri(A,C,D,material,tone,[N(a),N(c),N(a)]);
    }
  }
  torso(41,0);torso(42,.006,.08,Math.PI-.08);torso(42,.006,Math.PI+.08,TAU-.08);
  function vestPoint(x,y,side){const r=y<1.17?[.155+(y-1)/.17*.023,.116+(y-1)/.17*.010]:[.178+(y-1.17)/.17*.028,.126+(y-1.17)/.17*.004];return [x,y,side*(Math.sqrt(Math.max(.01,1-x*x/(r[0]*r[0])))*r[1]+.009)];}
  function stripe(x,y,w,h,side){const A=vestPoint(x-w/2,y-h/2,side),B=vestPoint(x+w/2,y-h/2,side),C=vestPoint(x+w/2,y+h/2,side),D=vestPoint(x-w/2,y+h/2,side),n=[0,0,side];tri(A,B,C,45,.5,[n,n,n]);tri(A,C,D,45,.5,[n,n,n]);}
  for(const y of [1.015,1.12])for(const side of [-1,1])for(let j=0;j<8;j++)stripe(-.125+j*.0357,y,.037,.022,side);
  // Zipper, open collar, shoulder straps, chest/waist reflectors and breast pockets.
  box(0,1.174,-.135,.013,.41,.010,10);
  for(const s of [-1,1]){
    limb([s*.054,1.44,-.073],[s*.032,1.357,-.136],.018,.014,41,.5,6);
    stripe(s*.122,1.326,.025,.155,-1);
    stripe(s*.115,1.285,.026,.190,1);
    box(s*.107,1.22,-.146,.073,.067,.014,41);box(s*.107,1.247,-.157,.074,.014,.005,45);
  }
  box(.078,1.318,-.148,.065,.029,.006,9);box(.078,1.318,-.153,.043,.007,.003,41);
  // Pelvis, duty belt, fabric cargo pockets, buckle and compact tool holster.
  surface([0,.928,0],[.153,.104,.113],41,.5,12,5);
  box(0,.948,-.105,.281,.038,.022,10);box(0,.948,.105,.281,.038,.020,10);box(0,.948,-.124,.039,.028,.012,35);
  box(.170,.924,.012,.047,.099,.066,10);limb([.18,.95,.025],[.18,1.08,.025],.015,.015,35,.5,6);
  box(-.166,.916,.025,.047,.088,.070,41);box(-.191,.927,.025,.009,.029,.052,45);
  // Legs use forward-bending knees and staggered foot lift rather than straight tubes.
  for(const s of [-1,1]){
    const step=s*gait,footZ=walk?-step*.245:s*.015,footLift=walk?Math.max(0,Math.cos(phase+(s<0?Math.PI:0)))*.052:0;
    const hip=[s*.104,.946,0],knee=[s*.112,.550,footZ*.49-.045-(work==='repair'&&!walk?.025:0)],ankle=[s*.115,.165+footLift,footZ];
    limb(hip,knee,.091,.073,41);surface(knee,[.076,.080,.076],41,.5,10,4);limb(knee,ankle,.071,.050,41);
    box(s*.187,.763,footZ*.23,.025,.129,.104,41);box(s*.203,.814,footZ*.23,.013,.022,.112,10);
    // Cloth folds at knee and trouser cuff, plus a small reflective ankle strip.
    limb([s*.11-.051,.542,knee[2]-.059],[s*.11+.051,.542,knee[2]-.059],.006,.006,10,.5,6);
    limb([s*.115,.175+footLift,footZ],[s*.115,.203+footLift,footZ],.053,.053,45,.5,10);
    surface([s*.115,.087+footLift,footZ-.047],[.077,.069,.143],10,.5,12,5);
    box(s*.115,.036+footLift,footZ-.043,.143,.026,.237,10);surface([s*.115,.094+footLift,footZ-.127],[.072,.038,.065],10,.5,8,4);
    for(let lace=0;lace<3;lace++)limb([s*.115-.039,.132+footLift,footZ-.034-lace*.021],[s*.115+.039,.132+footLift,footZ-.041-lace*.021],.0035,.0035,41,.5,5);
  }
  // Neck is human-sized and tucked inside a structured collar.
  limb([0,1.408,0],[0,1.524,0],.050,.049,57,skin,12);
  // Facial anatomy with smooth shading: jaw, cheeks, nose, ears and recessed eyes.
  surface([0,1.634,0],[.097,.137,.094],57,skin,14,8);
  surface([0,1.554,-.016],[.074,.053,.071],57,skin,10,5);
  surface([0,1.631,-.097],[.018,.032,.026],57,skin,8,5);
  surface([0,1.614,-.115],[.021,.014,.017],57,skin,8,4);
  for(const s of [-1,1]){
    surface([s*.097,1.631,.004],[.017,.032,.019],57,skin,8,5);
    surface([s*.039,1.656,-.087],[.017,.007,.005],58,.5,8,4);
    surface([s*.039,1.656,-.094],[.006,.0055,.0035],59,.5,6,4);
    limb([s*.021,1.671,-.091],[s*.059,1.672,-.082],.005,.004,10,.5,6);
  }
  limb([-.022,1.595,-.098],[.022,1.595,-.098],.003,.003,10,.5,6);
  // Low-profile hard hat with brim, crown ribs and headlamp; no oversized toy helmet.
  surface([0,1.715,.003],[.109,.097,.110],index%3===0?9:38,.5,12,5,0,Math.PI/2);
  surface([0,1.711,-.008],[.125,.014,.132],index%3===0?9:38,.5,12,4);
  for(const s of [-1,1])limb([s*.034,1.728,-.098],[s*.027,1.801,-.007],.009,.009,index%3===0?9:38,.5,7);
  box(0,1.727,-.119,.058,.029,.022,10);box(0,1.728,-.132,.038,.015,.003,45);
  // Wrist/hand poses. Tablet and radio users now have distinct arm positions.
  let hands=[];
  for(const s of [-1,1]){
    const shoulder=[s*.210,1.376,.002];let elbow,hand;
    if(walk){elbow=[s*.249,1.096,s*gait*.11];hand=[s*.232,.852,s*gait*.19-.025];}
    else if(work==='radio'&&s<0){elbow=[s*.280,1.145,-.12];hand=[s*.105,1.497,-.122];}
    else if(work==='radio'){elbow=[s*.251,1.096,-.015];hand=[s*.232,.852,-.02];}
    else if(work==='inspect'){elbow=[s*.254,1.105,-.075];hand=s<0?[s*.245,.857,-.067]:[.16,1.081,-.264];}
    else{elbow=[s*.267,1.137,-.095];hand=[s*.131,1.180+Math.sin(clock*1.6+index+s)*.008,-.325];}
    limb(shoulder,elbow,.071,.052,41);surface(elbow,[.054,.056,.054],41,.5,8,4);limb(elbow,hand,.053,.037,41);
    const cuff=mix(hand,elbow,.12);limb(cuff,mix(hand,elbow,.23),.046,.049,45,.5,10);
    // Palm plus separated curled fingers and a thumb. Work gloves use dark fabric.
    const gloves=work==='repair'||work==='inspect',material=gloves?10:57,tone=gloves?.5:skin;
    const palm=[hand[0],hand[1]-.012,hand[2]-.013];surface(palm,[.038,.050,.024],material,tone,8,5);
    for(let finger=0;finger<4;finger++){const x=palm[0]-.025+finger*.016,len=[.043,.052,.049,.037][finger];limb([x,palm[1]-.027,palm[2]-.004],[x,palm[1]-.027-len*.7,palm[2]-.014],.0068,.0056,material,tone,5);limb([x,palm[1]-.027-len*.7,palm[2]-.014],[x,palm[1]-.027-len,palm[2]+.001],.0056,.0048,material,tone,5);}
    limb([palm[0]-s*.029,palm[1]+.012,palm[2]],[palm[0]-s*.045,palm[1]-.018,palm[2]-.020],.010,.007,material,tone,6);
    hands.push(hand);
  }
  // Radio, lapel mic, shoulder patch and work-specific hand tools.
  box(-.084,1.324,-.151,.033,.057,.026,10);limb([-.086,1.35,-.148],[-.087,1.407,-.141],.004,.004,10,.5,5);
  box(.247,1.330,-.012,.009,.052,.050,45);
  if(!walk&&work==='radio'){
    const h=hands[0];box(h[0],h[1],h[2]-.032,.042,.091,.024,10);box(h[0],h[1]+.012,h[2]-.046,.026,.019,.004,36);limb([h[0]-.014,h[1]+.045,h[2]-.031],[h[0]-.014,h[1]+.120,h[2]-.031],.0035,.003,10,.5,5);
  }else if(!walk&&(work==='tablet'||work==='repair')){
    box(0,1.182,-.341,.224,.019,.150,10);box(0,1.194,-.341,.196,.004,.124,36);for(let row=0;row<3;row++)box(-.033,1.197,-.37+row*.026,.095-row*.017,.002,.007,45);
  }else if(!walk&&work==='inspect'){
    const h=hands[1];limb([h[0],h[1]-.035,h[2]-.014],[h[0],h[1]+.087,h[2]-.014],.018,.023,10,.5,10);surface([h[0],h[1]+.089,h[2]-.014],[.021,.009,.021],45,.5,8,4);
  }
}
if(typeof module!=='undefined')module.exports={crewBody};

  function geometry(life,ground){const b=builder(),{box,quad,tube,ball}=b;
    for(const v of life.vehicles){const pose=truckPose(v,ground);b.at(v.x,pose.y,v.z,v.yaw,pose.sx,pose.sz);truckBody(b);for(const side of [-1,1])for(const front of [true,false]){const p=wheelPose(v,side,front,pose);b.at(p.x,p.y,p.z,p.yaw,pose.sx,pose.sz);truckWheel(b,v.wheel,side);}}
    life.crew.forEach((p,i)=>{b.at(p.x,ground(p.x,p.z),p.z,p.yaw);crewBody(b,p,i,life.clock);});return new Float32Array(b.data);
  }
  // Cache local poses; the GPU handles world transforms instead of rebuilding all meshes each frame.
  const modelCache=new Map();
  function models(life,ground,roverReady=false){const commands=[],cached=(key,make)=>{if(!modelCache.has(key))modelCache.set(key,make());return modelCache.get(key);};
    for(const v of life.vehicles){const pose=truckPose(v,ground),stunt={pivot:[v.x,pose.y+1,v.z],roll:stuntPose(v).roll,axis:[-Math.sin(v.yaw),0,Math.cos(v.yaw)]};
      if(roverReady&&v.id==='01'){
        commands.push({key:'expedition-rover-lamps',vertices:cached('expedition-rover-lamps',()=>{const b=builder();for(const side of [-1,1]){b.box(side*.55,.91,-1.51,.18,.08,.035,63);b.box(side*.67,1.64,.8,.10,.045,.035,36);b.box(side*.50,1.60,1.26,.13,.06,.035,37);}return new Float32Array(b.data);}),x:v.x,y:pose.y,z:v.z,yaw:v.yaw,sx:pose.sx,sz:pose.sz,...stunt});
        continue;
      }
      commands.push({key:'truck-body',vertices:cached('truck-body',()=>{const b=builder();truckBody(b);return new Float32Array(b.data);}),x:v.x,y:pose.y,z:v.z,yaw:v.yaw,sx:pose.sx,sz:pose.sz,...stunt});
      for(const side of [-1,1])for(const front of [true,false]){const frame=((Math.floor(v.wheel/TAU*16)%16)+16)%16,key='truck-wheel-'+side+'-'+frame,p=wheelPose(v,side,front,pose);commands.push({key,vertices:cached(key,()=>{const b=builder();truckWheel(b,frame/16*TAU,side);return new Float32Array(b.data);}),...p,sx:pose.sx,sz:pose.sz,...stunt});}
    }
    for(const [i,p] of life.crew.entries()){const frame=p.walking?((Math.floor(p.phase/TAU*12)%12)+12)%12:Math.floor(life.clock*2)%4,key='crew-'+i+'-'+(p.walking?'walk':p.work)+'-'+frame;commands.push({key,vertices:cached(key,()=>{const b=builder();crewBody(b,{...p,phase:frame/12*TAU},i,frame*.5);return new Float32Array(b.data);}),x:p.x,y:ground(p.x,p.z),z:p.z,yaw:p.yaw,sx:0,sz:0});}return commands;
  }
  const api={SPAWNS,CREW,create,active,crewTick,circles,blocked,drive,nearestVehicle,enter,exit,brake,builder,geometry,models,TRUCK,stuntJump,stuntTick,stuntPose,cancelStunts};
  if(typeof window!=='undefined')window.ParallaxLife=api;if(typeof module!=='undefined')module.exports=api;
})();
