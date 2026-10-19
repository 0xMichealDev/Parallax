/* A local, explorable desert. No remote engine, tracking, or location data. */
(() => {
  'use strict';
  const TAU = Math.PI * 2, LIMIT = 210, STEP = 3, HALF = 330;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const hash = (x, z) => { const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return n - Math.floor(n); };
  function noise(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z); x -= ix; z -= iz;
    x = x * x * (3 - 2 * x); z = z * z * (3 - 2 * z);
    const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
    return a + (b - a) * x + (c - a) * z * (1 - x) + (d - b) * x * z;
  }
  function naturalHeight(x, z) {
    return (noise(x * .014 + 3, z * .014 + 7) - .5) * 4 +
      (noise(x * .047, z * .047) - .5) * 1.0 + (noise(x * .16, z * .16) - .5) * .3 - .4 * Math.exp(-Math.pow((x-Math.sin(z*.014)*11)/7,2))+
      3.0*Math.exp(-Math.pow(x/65,2)-Math.pow((z+8)/62,2))+
      (4.8+noise(x*.042,z*.051)*2.2)*Math.exp(-Math.pow((x+64)/28,2)-Math.pow((z-14)/43,2))+
      (3.2+noise(x*.053,z*.046)*1.8)*Math.exp(-Math.pow((x+18)/37,2)-Math.pow((z-55)/26,2))+
      (4.2+noise(x*.041,z*.058)*2.0)*Math.exp(-Math.pow((x-101)/31,2)-Math.pow((z+23)/40,2));
  }
  const CAMPUS={x:-111,z:-106,width:68,depth:66};
  const campElevation=naturalHeight(0,-10),campusElevation=naturalHeight(CAMPUS.x,CAMPUS.z),springElevation=naturalHeight(37,22);
  const terrainGrid=new Map();
  const RIVER={start:-328,end:328,bridgeZ:22,bridgeX:37};
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  const riverX=z=>37+Math.sin((z-22)*.022)*10+Math.sin((z-22)*.060)*2+smooth(70,240,z)*Math.sin((z-70)*.013)*20+smooth(22,50,z)*Math.sin((z-22)*.048)*6+smooth(0,70,-z)*75;
  const riverWidth=z=>3.35+.60*Math.sin(z*.052)+.45*Math.sin(z*.14)+smooth(45,170,z)*2.6+2.2*Math.exp(-Math.pow((z-93)/18,2));
  const bankWidth=(z,side)=>riverWidth(z)+(.24*Math.sin(z*.77+side*2)+.16*Math.sin(z*1.71+side))*(1-Math.exp(-Math.pow((z-22)/5,2)));
  const waterHeight=z=>springElevation-.88-(z-22)*.004-2.15*smooth(22,110,z);
  function riverDistance(x,z){return Math.hypot(x-riverX(clamp(z,RIVER.start,RIVER.end)),Math.max(RIVER.start-z,0,z-RIVER.end));}
  function height(x,z){const key=x%3===0&&z%3===0?x+','+z:null;if(key!==null&&terrainGrid.has(key))return terrainGrid.get(key);const t=clamp((Math.hypot(x,z+10)-7)/6,0,1),desert=campElevation+(naturalHeight(x,z)-campElevation)*t*t*(3-2*t);const edge=Math.max(Math.abs(x-CAMPUS.x)-CAMPUS.width/2,Math.abs(z-CAMPUS.z)-CAMPUS.depth/2),blend=clamp(edge/9,0,1);let y=campusElevation+(desert-campusElevation)*blend*blend*(3-2*blend);
    // A broad, low upstream watershed supports the channel as it winds beyond the walking boundary.
    y+=smooth(35,105,-z)*Math.max(0,waterHeight(z)+.8-y)*Math.exp(-Math.pow((x-riverX(z))/42,2));
    const d=riverDistance(x,z),rz=clamp(z,RIVER.start,RIVER.end),width=bankWidth(rz,x<riverX(rz)?-1:1),bank=clamp((d-width)/5.5,0,1),bed=waterHeight(rz)-1.05+Math.pow(Math.min(1,d/width),2.6)*1.10;
    const result=bed+(y-bed)*bank*bank*(3-2*bank);if(key!==null)terrainGrid.set(key,result);return result;
  }
  function onBridge(x,z){return Math.abs(z-RIVER.bridgeZ)<1.85&&Math.abs(x-RIVER.bridgeX)<8.5;}
  function walkingGround(x,z){const y=ground(x,z);if(!onBridge(x,z))return y;const t=clamp((8.5-Math.abs(x-RIVER.bridgeX))/2.5,0,1);return y*(1-t)+(waterHeight(22)+1.6)*t+.055;}
  function canWalk(x,z){return onBridge(x,z)||riverDistance(x,z)>riverWidth(z)+2.1||ground(x,z)>waterHeight(z)-.15;}
  walkingGround.canTraverse=canWalk;
  const BOARDING={x:-105,z:-113,name:'Starship boarding lift',deck:54};

  const CAMP={fire:[0,ground(0,-8),-8],tent:[-4.5,ground(-4.5,-10.5),-10.5],telescope:[3.5,ground(3.5,-13),-13]};
  const TRAIL=[
    {id:'overlook',name:'Quiet overlook',x:-21,z:-28,note:'The lantern cairn marks a quiet place away from the campfire. Turn toward the open sky and follow the Milky Way above the ridgeline.'},
    {id:'meteorite',name:'Meteorite field study',x:19,z:-26,note:'An imagined meteorite specimen rests beside a small survey marker. Walk around its dark, pitted surface and try the flashlight from different angles.'},
    {id:'station',name:'Remote survey station',x:26,z:8,note:'A small solar-powered field station watches over the valley. From here, the fire becomes a warm point of light guiding you back to camp.'},
    {id:'arch',name:'Sandstone arch',x:-47,z:-48,note:'A worn sandstone arch frames the stars. The western trail passes beneath it before climbing toward the launch campus.'},
    {id:'wash',name:'Riverbend footbridge',x:47,z:22,note:'Moving water, polished stones and a timber footbridge connect the two banks. Cross on foot and follow the bank trail beside widening pools and a longer winding river.'},
    {id:'campus',name:'SpaceX launch campus',x:-104,z:-92,note:'A fan-built launch campus with black rockets, working crew and an illuminated tank farm. Follow the forecourt to the Starship boarding lift at the south side of the tall rocket. Ride up, enter the cabin and choose your planet. This fictional experience is not an official SpaceX location.'},
    {id:'crash',name:'The silent visitor',x:58,z:-61,hidden:true,note:'A half-buried craft lies beyond the broken trail. Scorched soil, torn alloy, and an instrument that still answers. PARALLAX field record: origin unknown. A fictional Easter egg.'}
  ];
  const CRASH={x:65,z:-69,radius:5.8};
  const PATHS=[
    {id:'camp',name:'Camp junction',width:1.9,points:[[-7,-3],[-4,-1],[0,0],[6,-3]]},
    {id:'west',name:'Western ridge trail',width:3.4,points:[[-7,-3],[-10,-12],[-15,-21],[-21,-25],[-27,-34],[-38,-40],[-47,-48]]},
    {id:'rover-road',name:'Rover service road',width:4.8,points:[[12,-4],[6,-3],[0,0],[-7,-3],[-15,-8],[-23,-16],[-32,-29],[-45,-39],[-47,-43],[-47,-48],[-48,-54]]},
    {id:'east',name:'Meteorite trail',width:1.8,points:[[6,-3],[9,-11],[13,-18],[15,-25],[18,-31],[24,-34],[34,-39],[45,-45]]},
    {id:'wash',name:'Riverbank trail',width:2.0,points:[[6,-3],[15,0],[24,3],[28,10],[28,18],[31,22],[37,22],[43,22],[47,22]]},
    {id:'loop',name:'River return trail',width:1.8,points:[[24,3],[21,-5],[21,-14],[15,-25]]},
    {id:'launch-road',name:'Launch campus access road',width:3.4,points:[[-47,-48],[-48,-54],[-59,-58],[-70,-64],[-82,-76],[-99,-79],[-104,-92],[-104,-103]]},
    {id:'campus-loop',name:'Launch forecourt',width:4.2,points:[[-104,-92],[-117,-92],[-117,-109],[-105,-110],[-97,-109],[-97,-96],[-104,-92]]},
    {id:'research-lab',name:'Research lab access',width:1.6,points:[[-104,-92],[-101,-84],[-96,-80],[-88,-80],[-88,-84],[-88,-89],[-88,-93]]},
    {id:'boarding',name:'Crew boarding path',width:2.6,points:[[-105,-110],[-105,-113]]},
    {id:'river-walk',name:'Lower river trail',width:1.6,points:[[47,22],...Array.from({length:13},(_,i)=>{const z=31+i*11;return [riverX(z)+riverWidth(z)+4.5,z];})]},
    {id:'signal',name:'Unmarked spur',width:1.25,hidden:true,points:[[45,-45],[48,-51],[53,-54],[56,-58],[58,-61]]}
  ];
  function samplePath(path){const result=[];for(let i=0;i<path.points.length-1;i++){
    const a=path.points[Math.max(0,i-1)],b=path.points[i],c=path.points[i+1],d=path.points[Math.min(path.points.length-1,i+2)],steps=Math.ceil(Math.hypot(c[0]-b[0],c[1]-b[1]));
    for(let j=0;j<steps;j++){const t=j/steps;result.push([0,1].map(k=>.5*((2*b[k])+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t*t+(-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t)));}
  }result.push(path.points.at(-1));return {...path,points:result};}
  const ROUTES=PATHS.map(samplePath);
  const SEGMENTS=ROUTES.flatMap(p=>p.points.slice(1).map((b,i)=>({a:p.points[i],b,width:p.width,hidden:p.hidden})));
  function segmentDistance(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}
  function pathClearance(x,z){let distance=Infinity;for(const p of SEGMENTS)distance=Math.min(distance,segmentDistance(x,z,p.a,p.b)-p.width/2);return distance;}
  function trailRoute(from,to){
    const nodes=[],lookup=new Map();function node(p){const key=p.map(v=>v.toFixed(3)).join(',');if(!lookup.has(key)){lookup.set(key,nodes.length);nodes.push({p,edges:[]});}return lookup.get(key);}
    for(const p of SEGMENTS){const a=node(p.a),b=node(p.b),cost=Math.hypot(p.a[0]-p.b[0],p.a[1]-p.b[1]);nodes[a].edges.push([b,cost]);nodes[b].edges.push([a,cost]);}
    const nearest=p=>nodes.reduce((best,n,i)=>Math.hypot(n.p[0]-p.x,n.p[1]-p.z)<Math.hypot(nodes[best].p[0]-p.x,nodes[best].p[1]-p.z)?i:best,0);
    const start=nearest(from),end=nearest(to),cost=nodes.map(()=>Infinity),previous=[],done=new Set();cost[start]=0;
    while(done.size<nodes.length){let current=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(current<0||cost[i]<cost[current]))current=i;if(current<0||!Number.isFinite(cost[current]))break;if(current===end)break;done.add(current);for(const [next,weight]of nodes[current].edges)if(cost[current]+weight<cost[next]){cost[next]=cost[current]+weight;previous[next]=current;}}
    if(!Number.isFinite(cost[end]))return [{x:to.x,z:to.z}];const route=[];for(let i=end;i!==undefined;i=previous[i]){route.unshift({x:nodes[i].p[0],z:nodes[i].p[1]});if(i===start)break;}route.push({x:to.x,z:to.z});return route;
  }
  function bakeTrailMap(){const size=2048,extent=440,pixel=extent/size,mask=new Uint8Array(size*size);
    for(const {a,b,width} of SEGMENTS){const r=width/2+.6;
      const minX=clamp(Math.floor((Math.min(a[0],b[0])-r+extent/2)/pixel),0,size-1),maxX=clamp(Math.ceil((Math.max(a[0],b[0])+r+extent/2)/pixel),0,size-1),minZ=clamp(Math.floor((Math.min(a[1],b[1])-r+extent/2)/pixel),0,size-1),maxZ=clamp(Math.ceil((Math.max(a[1],b[1])+r+extent/2)/pixel),0,size-1);
      for(let j=minZ;j<=maxZ;j++)for(let i=minX;i<=maxX;i++){const x=(i+.5)*pixel-extent/2,z=(j+.5)*pixel-extent/2,d=segmentDistance(x,z,a,b),edge=width/2+(noise(x*2,z*2)-.5)*.32,v=clamp((edge+.35-d)/.55,0,1),index=j*size+i;mask[index]=Math.max(mask[index],Math.round(255*v*v*(3-2*v)));}
    }return {mask,size};
  }
  function logFrame(a,b){const axis=b.map((v,i)=>v-a[i]),length=Math.hypot(...axis),d=axis.map(v=>v/length);let u=[d[1],-d[0],0];if(Math.hypot(...u)<.01)u=[1,0,0];const len=Math.hypot(...u);u=u.map(v=>v/len);const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]];return {d,u,v,length};}
  const LOGS=Array.from({length:7},(_,i)=>{const a=i/7*TAU+.2,fy=CAMP.fire[1];return {a:[Math.cos(a)*.72,fy+.15,-8+Math.sin(a)*.72],b:[-Math.cos(a)*.48,fy+.37+(i%2)*.10,-8-Math.sin(a)*.48],radius:.12+(i%3)*.016,burnt:true};});
  LOGS.push({a:[-1.15,CAMP.fire[1]+.27,-4.5],b:[1.15,CAMP.fire[1]+.27,-4.5],radius:.24});
  for(let i=0;i<3;i++)LOGS.push({a:[-2.8,CAMP.fire[1]+.15+(i===2?.23:0),-7.1+(i%2)*.27],b:[-1.6,CAMP.fire[1]+.15+(i===2?.23:0),-6.9+(i%2)*.27],radius:.13});
  LOGS.push({a:[-21.9,ground(-21,-28)+.32,-29.2],b:[-20.1,ground(-21,-28)+.32,-29.2],radius:.23});
  const glslVector=v=>'vec3('+v.map(n=>n.toFixed(6)).join(',')+')';
  const woodCoordinates='vec3 woodCoordinates(vec3 p,float id){'+LOGS.map((log,i)=>{const f=logFrame(log.a,log.b);return 'if(id<'+(i+.5).toFixed(1)+'){vec3 d=p-'+glslVector(log.a)+';return vec3(dot(d,'+glslVector(f.u)+'),dot(d,'+glslVector(f.v)+'),dot(d,'+glslVector(f.d)+'));}';}).join('')+'return p;}';
  function satelliteDirection(time,index){const phase=((time*(.0035+index*.0007)+.24+index*.31)%1+1)%1,az=-1.35+phase*2.7+index*2.1,alt=.12+Math.sin(phase*Math.PI)*(.47+index*.08);return [Math.sin(az)*Math.cos(alt),Math.sin(alt),-Math.cos(az)*Math.cos(alt)];}
  // Match the triangle mesh exactly, so the camera follows the ground.
  function ground(x, z) {
    const bx = Math.floor(x / STEP) * STEP, bz = Math.floor(z / STEP) * STEP;
    const u = (x - bx) / STEP, v = (z - bz) / STEP;
    const a = height(bx, bz), b = height(bx + STEP, bz), c = height(bx, bz + STEP), d = height(bx + STEP, bz + STEP);
    return u + v <= 1 ? a + u * (b - a) + v * (c - a) : d + (1 - u) * (c - d) + (1 - v) * (b - d);
  }
  function viewLens(zoom,binoculars){return Math.tan((binoculars?20:clamp(68/Math.sqrt(Math.max(.65,zoom)),45,84))*Math.PI/360);}
  function camera() { return { x: 0, z: 0, yaw: 0, pitch: .025, distance: 0, edge: false, seated: false, jumpHeight:0, jumpVelocity:0 }; }
  function resetJump(state){state.jumpHeight=0;state.jumpVelocity=0;}
  function jump(state){if(state.jumpHeight>0||state.jumpVelocity>0)return false;state.seated=false;state.jumpVelocity=5.2;return true;}
  // A grounded, single jump. Horizontal collisions still apply while airborne.
  function jumpTick(state,dt){
    if(!state.jumpHeight&&!state.jumpVelocity)return false;
    const step=Math.min(.1,Math.max(0,dt));
    state.jumpHeight=Math.max(0,(state.jumpHeight||0)+state.jumpVelocity*step-6.5*step*step);
    state.jumpVelocity-=13*step;
    if(!state.jumpHeight&&state.jumpVelocity<0)resetJump(state);
    return true;
  }
  function move(state, forward, side, dt, fast, obstacles) {
    const length = Math.hypot(forward, side); if (!length) { state.edge = false; return false; }
    state.seated=false;
    const speed = (fast ? 6 : 2.6) * Math.min(.05, Math.max(0, dt)) / Math.max(1, length);
    const dx = (Math.sin(state.yaw) * forward + Math.cos(state.yaw) * side) * speed;
    const dz = (-Math.cos(state.yaw) * forward + Math.sin(state.yaw) * side) * speed;
    let x = state.x + dx, z = state.z + dz;
    const radius = Math.hypot(x, z); state.edge = radius > LIMIT;
    if (state.edge) { x *= LIMIT / radius; z *= LIMIT / radius; }
    for (const o of obstacles) {
      const ox = x - o.x, oz = z - o.z, d = Math.hypot(ox, oz), r = o.radius + .35;
      if (d < r) { const a = d > .0001 ? ox / d : 1, b = d > .0001 ? oz / d : 0; x = o.x + a * r; z = o.z + b * r; }
    }
    if(!canWalk(x,z)){state.edge=false;return false;}
    state.distance += Math.hypot(x - state.x, z - state.z); state.x = x; state.z = z;
    return true;
  }
  const common = `
    precision highp float;
    uniform vec3 eye; uniform vec3 right; uniform vec3 up; uniform vec3 forward;
    uniform float aspect; uniform float lens; uniform float night;
    uniform sampler2D panoramaMap; uniform float panoramaReady; uniform sampler2D nightMap; uniform float nightReady;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    vec3 panorama(vec3 d){
      vec2 uv=vec2(atan(d.x,-d.z)/6.2831853+.5,clamp(acos(clamp(d.y,-1.,1.))/3.14159265+.045,0.,1.));
      vec3 c=texture2D(panoramaMap,uv).rgb;
      // Blend the far-back seam over a few degrees without touching the sunset.
      float seam=smoothstep(.975,1.,abs(uv.x-.5)*2.);
      vec3 edge=(texture2D(panoramaMap,vec2(.001,uv.y)).rgb+texture2D(panoramaMap,vec2(.999,uv.y)).rgb)*.5;
      vec3 twilight=mix(c,edge,seam);
      // All-sky photography in a rotated celestial frame; horizon atmosphere is separate.
      vec3 gal=vec3(d.x,.819152*d.y+.573576*d.z,-.573576*d.y+.819152*d.z);
      gal.xy=mat2(.913545,-.406737,.406737,.913545)*gal.xy;
      vec2 starUV=vec2(atan(gal.x,-gal.z)/6.2831853+.5,acos(clamp(gal.y,-1.,1.))/3.14159265);
      vec3 photo=texture2D(nightMap,starUV).rgb;
      float extinction=smoothstep(-.035,.20,d.y);
      vec3 nocturne=pow(max(photo,vec3(0.)),vec3(1.05))*.88*extinction;
      nocturne+=mix(vec3(.028,.035,.048),vec3(.006,.010,.021),smoothstep(0.,.42,max(d.y,0.)));
      nocturne+=vec3(.018,.008,.003)*exp(-max(d.y,0.)*24.);
      float dusk=pow(max(0.,dot(normalize(d.xz),normalize(vec2(-.65,-1.)))),8.);
      nocturne+=vec3(.20,.075,.032)*exp(-max(d.y,0.)*15.)*dusk;
      return mix(twilight,nocturne,night*nightReady);
    }
    vec3 sky(vec3 d){
      float h=max(d.y,0.); float sunset=pow(max(dot(normalize(d.xz),normalize(vec2(.35,-1.))),0.),12.);
      vec3 c=mix(vec3(.115,.15,.23),vec3(.009,.023,.059),pow(clamp(h*1.5,0.,1.),.48));
      c+=vec3(.49,.18,.065)*exp(-h*13.)*sunset;
      c+=vec3(.12,.038,.033)*exp(-h*4.)*sunset;
      return mix(c,panorama(d)*.72,panoramaReady)*(1.-night*(1.-nightReady)*.78);
    }
  `;
  const skyVertex = 'attribute vec2 position; varying vec2 uv; void main(){uv=position;gl_Position=vec4(position,.9999,1.);}';
  const skyFragment = common + `
    varying vec2 uv;uniform float time,pixelAngle,satellitesOn;
    void main(){
      vec3 d=normalize(forward+right*uv.x*aspect*lens+up*uv.y*lens); vec3 col=sky(d);
      if(panoramaReady<.5){
      vec2 stars=vec2(atan(d.x,-d.z),asin(d.y))*430.; vec2 cell=floor(stars);
      float star=step(.9983,hash(cell))*(1.-smoothstep(.05,.45,length(fract(stars)-.5)));
      col+=vec3(.50,.60,.74)*star*smoothstep(.1,.6,d.y)*.58;
      if(d.y>.015){vec2 p=d.xz/(d.y+.24);float n=noise(p*2.1)+.35*noise(p*7.);float cloud=smoothstep(.72,1.05,n)*exp(-d.y*3.)*.16;col=mix(col,vec3(.14,.13,.18),cloud);}
      }
      if(night>.5&&nightReady<.5&&d.y>.015){
        vec2 p=vec2(atan(d.x,-d.z),asin(d.y))*650.;vec2 cell=floor(p);float star=step(.997,hash(cell))*(1.-smoothstep(.04,.37,length(fract(p)-.5)));
        col+=mix(vec3(.55,.67,.9),vec3(.95,.75,.53),hash(cell+42.))*star*smoothstep(.015,.25,d.y)*.85;
        float band=exp(-pow((dot(d,normalize(vec3(.6,.42,.7)))-.1)/.11,2.));float cloud=noise(d.xz*22.+d.y*9.)*.65+noise(d.xz*61.)*.35;
        col+=vec3(.07,.074,.105)*band*cloud*smoothstep(.04,.5,d.y);
      }
      // Satellite passes are illustrative, not live orbital predictions.
      if(satellitesOn>.5&&d.y>.09){for(int i=0;i<3;i++){
        float j=float(i),phase=fract(time*(.0035+j*.0007)+.24+j*.31),az=-1.35+phase*2.7+j*2.1,alt=.12+sin(phase*3.14159265)*(.47+j*.08);
        vec3 sat=vec3(sin(az)*cos(alt),sin(alt),-cos(az)*cos(alt));float angular=length(cross(d,sat))/max(pixelAngle,.0001);
        float core=exp(-angular*angular*.7),halo=exp(-angular*angular*.075)*.1;
        col+=vec3(.91,.95,1.)*(core+halo)*step(0.,dot(d,sat))*smoothstep(.1,.25,alt)*(.8+night*.5);
      }}
      if(night>.5&&d.y>.15){
        float cycle=floor(time/19.),age=fract(time/19.)*19.;
        float az=sin(cycle*7.13)*1.8+age*.27,alt=.72-age*.13;
        vec3 head=vec3(sin(az)*cos(alt),sin(alt),-cos(az)*cos(alt));
        vec3 tail=vec3(sin(az-.10)*cos(alt+.05),sin(alt+.05),-cos(az-.10)*cos(alt+.05));
        vec3 trail=head-tail;float along=clamp(dot(d-tail,trail)/dot(trail,trail),0.,1.);
        float width=length(d-mix(tail,head,along))/max(pixelAngle,.0001);
        col+=vec3(.67,.79,1.)*exp(-width*width*.9)*along*smoothstep(0.,.12,age)*(1.-smoothstep(.6,1.,age));
      }
      gl_FragColor=vec4(col,1.);
    }
  `;
  const meshVertex = `
    precision highp float;
    attribute vec3 position; attribute vec3 normal; attribute vec2 material;
    uniform vec3 eye; uniform vec3 right; uniform vec3 up; uniform vec3 forward;
    uniform float aspect; uniform float lens;uniform float time,launchHeight;
    uniform float objectMode;uniform vec3 objectOrigin;uniform vec4 objectPose;
    varying vec3 point; varying vec3 norm; varying vec2 kind; varying vec3 surfacePoint;
    void main(){surfacePoint=position;point=position;norm=normal;kind=material;
      if(material.x>59.5&&material.x<64.5)point.y+=launchHeight;
      if(material.x>52.5&&material.x<53.5)point.y+=.012*sin(position.z*2.1-time*2.3)+.008*sin(position.x*3.7+position.z*.9-time*1.7);
      if(material.x>53.5&&material.x<54.5)point.x+=sin(time*1.3+position.x*.7+position.z*.3)*.045*(1.-normal.y);
      if(objectMode>.5){point=vec3(position.x*objectPose.x-position.z*objectPose.y,position.y,position.x*objectPose.y+position.z*objectPose.x);point.y+=point.x*objectPose.z+point.z*objectPose.w;point+=objectOrigin;norm=vec3(normal.x*objectPose.x-normal.z*objectPose.y,normal.y,normal.x*objectPose.y+normal.z*objectPose.x);norm.x-=objectPose.z*norm.y;norm.z-=objectPose.w*norm.y;norm=normalize(norm);}
      vec3 p=point-eye;float depth=dot(p,forward);
      gl_Position=vec4(dot(p,right)/(aspect*lens),dot(p,up)/lens,1.000025*depth-.10000125,depth);}
  `;
  const meshFragment = `#extension GL_OES_standard_derivatives : enable\n` + common + `
    varying vec3 point; varying vec3 norm; varying vec2 kind; varying vec3 surfacePoint;
    uniform vec4 roverShadowA,roverShadowB;
    uniform float scannerStrength,scanProgress,artifactInstalled;
    uniform float flashlightOn,redLight,fireBoost,ufoAwake,campusLights,cabinMode,liftMode,launchHeight;uniform vec3 flashlightPosition,flashlightDirection;
    uniform sampler2D clothMap; uniform float time; uniform float fireOn; uniform float lanternOn; uniform float tentOpen; uniform vec3 firePosition; uniform vec3 lanternPosition;
    uniform sampler2D trailMap; uniform sampler2D groundNormal; uniform sampler2D groundMap; uniform sampler2D shadeMap; uniform sampler2D plantMap; uniform float plantReady; uniform float textured;
    ${woodCoordinates}
    vec3 groundSample(vec2 p){return texture2D(groundMap,p).rgb;}
    float waterNoise(vec2 p){return noise(p)*.72+noise(p*2.43+13.7)*.28;}
    float riverCenter(float z){return 37.+sin((z-22.)*.022)*10.+sin((z-22.)*.060)*2.+smoothstep(70.,240.,z)*sin((z-70.)*.013)*20.+smoothstep(22.,50.,z)*sin((z-22.)*.048)*6.+smoothstep(0.,70.,-z)*75.;}
    float riverHalfWidth(float z){return 3.35+.60*sin(z*.052)+.45*sin(z*.14)+smoothstep(45.,170.,z)*2.6+2.2*exp(-pow((z-93.)/18.,2.));}
    float roverShade(vec4 vehicle){if(dot(vehicle.zw,vehicle.zw)<.5)return 0.;vec2 d=point.xz-vehicle.xy;vec2 p=vec2(dot(d,vec2(vehicle.w,vehicle.z)),dot(d,vec2(-vehicle.z,vehicle.w)));return exp(-pow(p.x/1.03,4.)-pow(p.y/2.71,4.))*.70;}
    float flashlight(vec3 point){vec3 p=point-flashlightPosition;float distance=length(p),angle=dot(normalize(p),flashlightDirection);return flashlightOn*smoothstep(.885,.965,angle)*(1.-smoothstep(23.,40.,distance))*5.5/(1.+distance*distance*.07);}
    void main(){
      if(kind.x>69.5&&kind.x<70.5){
        vec2 uv=(surfacePoint.xy-vec2(.215,-.355))/vec2(.205,.245),p=(uv-.5)*2.;float r=length(p),ring=pow(.5+.5*cos(r*23.),22.)*.12;
        float sweep=pow(max(0.,cos(atan(p.y,p.x)-time*1.7)),28.)*(1.-smoothstep(.6,1.,r));
        float trace=1.-smoothstep(.015,.042,abs(p.y-sin(p.x*14.+time*4.)*(.04+scannerStrength*.25)));
        vec3 c=vec3(.006,.022,.027)+vec3(.05,.64,.49)*(ring+sweep*.32+trace*.30);if(uv.y<.055&&uv.x<scanProgress)c+=vec3(.2,1.,.75);
        gl_FragColor=vec4(c,1.);return;
      }
      if(kind.x>70.5&&kind.x<71.5){if(artifactInstalled<.5)discard;gl_FragColor=vec4(vec3(.12,.65,.85)*(.7+.2*sin(time*1.4))+abs(normalize(norm))*.14,1.);return;}
      if(kind.x>71.5&&kind.x<72.5){vec3 glow=vec3(.17,.64,.64);if(point.z< -95.&&point.y>${(ground(-88,-90)+1.2).toFixed(6)}){vec2 p=point.xy*12.;float wave=1.-smoothstep(.07,.19,abs(fract(p.y*.15)-(.5+.12*sin(p.x*1.3+time))));float grid=step(.95,fract(p.x))+step(.95,fract(p.y));glow=vec3(.005,.04,.06)+vec3(.10,.65,.52)*(grid*.10+wave*.6);}gl_FragColor=vec4(glow,1.);return;}
      if(kind.x>72.5&&kind.x<73.5){vec2 uv=vec2(clamp((point.x+90.2)/4.4,0.,1.),1.-clamp((point.y-${(ground(-88,-90)+3.1).toFixed(6)})/.95,0.,1.));gl_FragColor=vec4(texture2D(clothMap,vec2(.5+uv.x*.5,(600.+uv.y*220.)/2048.)).rgb,1.);return;}
      if(kind.x>59.5&&kind.x<63.5&&cabinMode<.5)discard;
      if(kind.x>63.5&&kind.x<64.5&&liftMode<.5)discard;
      if(cabinMode>.5&&kind.x<59.5&&length(point.xz-vec2(-110.,-120.))<6.6&&point.y>${(ground(-110,-120)+45).toFixed(6)})discard;
      if(kind.x>3.5&&kind.x<4.5&&panoramaReady>.5&&night<.5)discard;
      if(kind.x>14.5&&kind.x<15.5&&tentOpen>.5)discard;
      float dist=length(point-eye);
      if(kind.x>31.5&&kind.x<32.5){vec2 signUV=vec2(clamp((point.x+140.)/18.,0.,1.),1.-clamp((point.y-${(ground(-131,-81)+5.).toFixed(6)})/6.,0.,1.));vec3 signColor=texture2D(clothMap,vec2(.5+signUV.x*.5,signUV.y*.25)).rgb;gl_FragColor=vec4(signColor*(.45+campusLights*.4),1.);return;}
      if(kind.x>5.5&&kind.x<6.5||kind.x>53.5&&kind.x<54.5){
        if(plantReady<.5)discard;vec4 plant=texture2D(plantMap,norm.xy);if(plant.a<.42)discard;
        float lum=dot(plant.rgb,vec3(.2126,.7152,.0722));vec3 foliage=mix(vec3(lum),plant.rgb,.65);
        if(kind.x>53.5)foliage*=vec3(.65,1.12,.56);
        foliage*=vec3(.48,.53,.57)*(.83+.17*kind.y)*(1.-night*.35);foliage+=plant.rgb*mix(vec3(.72,.67,.55),vec3(.62,.045,.01),redLight)*flashlight(point)*.35;
        float fog=1.-exp(-dist*.00085);vec3 haze=sky(normalize(vec3(point.x-eye.x,.025,point.z-eye.z)))*.68;
        gl_FragColor=vec4(mix(foliage,haze,clamp(fog,0.,.86)),1.);return;
      }
      vec3 n=normalize(norm),view=normalize(eye-point);float woodEmber=0.;
      if(kind.x>52.5&&kind.x<53.5){
        float center=riverCenter(point.z),width=riverHalfWidth(point.z),crossRiver=point.x-center,edge=clamp(abs(crossRiver)/width,0.,1.);
        float current=.55+.8*(1.-edge*edge);vec2 flow=vec2(crossRiver,point.z-time*current);
        vec2 rippleUV=flow*vec2(2.3,3.8);float wave=waterNoise(rippleUV);
        float dx=waterNoise(rippleUV+vec2(.16,0.))-wave,dz=waterNoise(rippleUV+vec2(0.,.16))-wave;
        vec3 wn=normalize(vec3(dx*.75,1.,dz*.80));
        vec3 reflected=max(sky(reflect(-view,wn)),vec3(.045,.061,.075));float fresnel=.045+.955*pow(1.-max(0.,dot(wn,view)),4.);
        vec3 pebbles=groundSample(point.xz*.65+wn.xz*.14)*vec3(.15,.19,.20);
        float shallow=pow(edge,4.);vec3 bottom=mix(vec3(.015,.033,.039),pebbles,shallow*.50);
        vec3 water=mix(bottom,reflected*.92,fresnel);
        water+=vec3(.045,.065,.078)*smoothstep(.68,.88,wave)*(.3+.7*fresnel);
        // Broken foam collects at the bank and trails downstream from protruding river stones.
        float foam=smoothstep(.80,.99,edge)*smoothstep(.60,.82,noise(flow*vec2(2.,4.)));
        float rockIndex=floor((point.z-8.)/26.),rz=8.+rockIndex*26.,rx=riverCenter(rz)+sin(rockIndex*2.4)*riverHalfWidth(rz)*.55;
        vec2 wake=point.xz-vec2(rx,rz);float ripple=sin(length(wake*vec2(1.,.65))*13.-time*4.);
        float wakeMask=exp(-pow((abs(wake.x)-.5-max(0.,wake.y)*.16)/.32,2.))*smoothstep(.05,.7,wake.y)*(1.-smoothstep(2.,4.5,wake.y));
        float froth=wakeMask*smoothstep(.42,.76,noise(flow*6.))*max(0.,ripple);
        water+=vec3(.19,.23,.22)*(foam*.45+froth*.62);
        float glint=pow(max(0.,dot(wn,normalize(view+vec3(-.3,.22,-.8)))),100.);
        water+=vec3(.26,.30,.32)*glint*.50;
        water+=vec3(.15,.15,.11)*flashlight(point)*(.08+shallow*.08);
        gl_FragColor=vec4(water,1.);return;
      }
      float macro=noise(point.xz*.036),grain=noise(point.xz*4.7),detail=noise(point.xz*34.);
      vec3 base=mix(vec3(.31,.265,.205),vec3(.46,.37,.27),macro);
      vec3 groundColor=groundSample(point.xz*.40);
      float wash=exp(-pow((point.x-sin(point.z*.014)*11.)/6.,2.));
      base=mix(base,groundColor,textured)*(.73+macro*.3);
      base=mix(base,vec3(.36,.285,.20)*(.8+grain*.2),wash*.26);
      if(kind.x<.5){
        // A scanned tangent-space normal preserves pebble relief under moving light.
        vec3 bump=texture2D(groundNormal,point.xz*.40).xyz*2.-1.;
        vec3 tangent=normalize(vec3(n.y,-n.x,0.)),bitangent=normalize(cross(tangent,n));
        float path=texture2D(trailMap,point.xz/440.+.5).r;float strength=.72*(1.-smoothstep(18.,65.,dist))*(1.-path*.77);
        n=normalize(n*max(.25,bump.z)+strength*(tangent*bump.x-bitangent*bump.y));
        base*=.90+.10*noise(point.xz*.11);
        vec3 packedSoil=mix(vec3(.32,.275,.215),vec3(.48,.405,.31),macro)*(.87+.13*noise(point.xz*18.));base=mix(base,packedSoil,path*.83);
        float paved=1.-smoothstep(0.,1.,max(abs(point.x+111.)-34.,abs(point.z+106.)-33.));float joints=max(1.-smoothstep(.02,.06,abs(fract(point.x*.16)-.5)),1.-smoothstep(.02,.06,abs(fract(point.z*.16)-.5)));
        base=mix(base,vec3(.30,.32,.32)*(.94+noise(point.xz*30.)*.12)*(1.-joints*.1),paved);n=normalize(mix(n,normalize(norm),paved*.8));
        float scour=1.-smoothstep(.75,1.2,length((point.xz-vec2(65.,-69.))/vec2(8.,6.))+(noise(point.xz*2.)-.5)*.14);base=mix(base,vec3(.075,.060,.043)*(.7+grain*.6),scour*.86);
        float slope=1.-smoothstep(.58,.95,normalize(norm).y);
        float erosion=.74+.18*noise(point.xz*.65+point.y*.21)+.08*noise(point.xz*2.3);
        vec3 rocky=groundSample(point.xy*.46)*vec3(1.10,.91,.76)*erosion;
        base=mix(base,rocky,slope*.68);
        float bankDistance=abs(point.x-riverCenter(point.z)),shore=1.-smoothstep(riverHalfWidth(point.z)-.3,riverHalfWidth(point.z)+2.2,bankDistance);
        shore*=smoothstep(${(RIVER.start-3).toFixed(1)},${(RIVER.start+2).toFixed(1)},point.z)*(1.-smoothstep(326.,330.,point.z));
        base*=1.-shore*.34;
      }
      if(kind.x>.5&&kind.x<1.5){
        vec3 weights=abs(n);weights/=weights.x+weights.y+weights.z;
        float stone=dot(texture2D(groundMap,point.zy*.7).rgb,vec3(.33))*weights.x+dot(texture2D(groundMap,point.xz*.7).rgb,vec3(.33))*weights.y+dot(texture2D(groundMap,point.xy*.7).rgb,vec3(.33))*weights.z;
        base=mix(vec3(.41,.42,.43),vec3(.49,.405,.325),kind.y)*(.66+.5*stone+.18*grain);
      }
      if(kind.x>1.5&&kind.x<2.5){
        float ribs=.72+.28*sin(atan(n.z,n.x)*15.);float flecks=noise(point.xz*120.+point.y*17.);
        base=mix(vec3(.19,.225,.135),vec3(.255,.275,.17),kind.y)*ribs*(.8+.2*flecks);
      }
      if(kind.x>2.5&&kind.x<3.5)base=mix(vec3(.23,.25,.15),vec3(.36,.31,.21),kind.y)*(.75+grain*.25);
      if(kind.x>3.5&&kind.x<4.5)base=mix(vec3(.15,.17,.2),vec3(.25,.215,.19),noise(point.xz*.08));
      if(kind.x>4.5&&kind.x<5.5)base=vec3(.29,.23,.17)*(.7+grain*.3);
      if(kind.x>6.5&&kind.x<7.5||kind.x>14.5&&kind.x<15.5){
        vec2 uv=abs(n.x)>.4?point.zy:point.xy;
        base=texture2D(clothMap,vec2(fract(uv.x*1.1)*.5,fract(uv.y*1.1)*.5)).rgb*vec3(.91,.82,.65);
        base*=.92+.08*noise(point.zy*26.);
      }
      if(kind.x>7.5&&kind.x<8.5)base=vec3(.23,.25,.25);
      if(kind.x>8.5&&kind.x<9.5)base=vec3(.82,.84,.8);
      if(kind.x>9.5&&kind.x<10.5)base=vec3(.026,.032,.034);
      if((kind.x>4.5&&kind.x<5.5)||(kind.x>10.5&&kind.x<11.5)||(kind.x>22.5&&kind.x<24.5)){
        vec3 w=woodCoordinates(point,kind.y);float angle=atan(w.y,w.x),radius=length(w.xy);
        float grain=noise(vec2(angle*9.,w.z*3.)),fibre=noise(vec2(angle*48.,w.z*8.));
        float fissure=smoothstep(.80,.97,noise(vec2(angle*13.+noise(vec2(w.z*2.,angle)),w.z*4.)));
        float checks=smoothstep(.87,.98,noise(vec2(angle*6.,w.z*24.)));
        float burnt=((kind.x>10.5&&kind.x<11.5)||(kind.x>23.5&&kind.x<24.5))?1.:0.;
        vec3 barkPhoto=texture2D(clothMap,vec2(fract(angle/6.2831853+.5)*.5,.5+fract(w.z*.9)*.5)).rgb;
        base=barkPhoto*vec3(.92,.78,.63)*(.9+fibre*.15)*(1.-fissure*.28);
        if(kind.x>22.5){float rings=.5+.5*sin(radius*115.+noise(w.xy*12.)*1.4);float split=pow(1.-abs(sin(angle*3.+radius*2.)),36.)*smoothstep(.035,.10,radius);base=mix(vec3(.37,.245,.14),vec3(.55,.37,.22),rings*.36+fibre*.08)*(1.-split*.38);}
        if(burnt>.5){float ash=smoothstep(.68,.92,grain)*.40;base=mix(base*.30,vec3(.28,.26,.23),ash)*(1.-fissure*.35);woodEmber=max(fissure,checks*.65)*(1.-smoothstep(.45,.95,length(point-firePosition)))*(.45+.55*noise(w.xy*12.+w.z*3.));}
      }
      if(kind.x>11.5&&kind.x<12.5)base=vec3(.075,.035,.015);
      if(kind.x>12.5&&kind.x<13.5)base=vec3(.9,.66,.25);
      if(kind.x>13.5&&kind.x<14.5)base=vec3(.035,.05,.04);
      if(kind.x>15.5&&kind.x<16.5)base=vec3(.34,.24,.14)*(.55+noise(point.xz*35.)*.45);
      if(kind.x>16.5&&kind.x<17.5)base=vec3(.075,.11,.10)*(.7+noise(point.xz*75.)*.3);
      if(kind.x>17.5&&kind.x<18.5)base=vec3(.56,.59,.60);
      if(kind.x>18.5&&kind.x<19.5){float pits=noise(point.xz*9.+point.y*4.);base=vec3(.16,.17,.17)*(.35+pits);}
      if(kind.x>19.5&&kind.x<20.5){float grid=step(.88,fract(point.x*8.))+step(.92,fract(point.z*11.));base=mix(vec3(.035,.085,.14),vec3(.28,.34,.36),clamp(grid,0.,1.));}
      if(kind.x>20.5&&kind.x<21.5)base=vec3(.15,.17,.18);
      if(kind.x>25.5&&kind.x<30.5){
        vec3 hull=point-vec3(65.,0.,-69.);float radial=length(hull.xz),angle=atan(hull.z,hull.x);
        float seam=1.-smoothstep(.015,.045,abs(fract(angle/6.2831853*24.)-.5));float score=noise(vec2(point.y*25.+noise(point.xz*2.),angle*8.));
        base=mix(vec3(.18,.23,.25),vec3(.42,.46,.46),score*.6)*(.70+.30*grain)*(1.-seam*.55);
        if(kind.x>26.5&&kind.x<27.5)base=vec3(.021,.050,.063);
        if(kind.x>27.5&&kind.x<28.5)base=vec3(.07,.52,.58);
        if(kind.x>29.5)base=vec3(.17,.19,.19)*(.5+score*.6);
      }
      if(kind.x>30.5&&kind.x<31.5)base=vec3(.32,.34,.34)*(.8+grain*.2);
      if(kind.x>32.5&&kind.x<33.5){float ribs=.82+.18*sin((abs(n.z)>.5?point.x:point.z)*16.);base=vec3(.24,.28,.31)*ribs;}
      if(kind.x>33.5&&kind.x<34.5){vec2 tileUV=vec2((point.x+point.z)*3.8,point.y*2.8);tileUV.x+=mod(floor(tileUV.y),2.)*.5;float tile=smoothstep(.015,.06,min(min(fract(tileUV.x),1.-fract(tileUV.x)),min(fract(tileUV.y),1.-fract(tileUV.y))));float weld=smoothstep(.01,.035,abs(fract(point.y/2.)-.5));base=vec3(.073,.085,.098)*(.72+tile*.28)*(.65+.35*weld);}
      if(kind.x>34.5&&kind.x<35.5)base=vec3(.42,.47,.49);
      if(kind.x>35.5&&kind.x<36.5)base=vec3(.025,.11,.14);
      if(kind.x>36.5&&kind.x<37.5)base=vec3(.83,.89,.94);
      if(kind.x>37.5&&kind.x<38.5)base=vec3(.68,.49,.12);
      if(kind.x>38.5&&kind.x<39.5){float brush=noise(vec2(surfacePoint.y*680.,surfacePoint.z*.9));base=vec3(.64,.66,.675)*(.985+brush*.03);}
      if(kind.x>39.5&&kind.x<40.5)base=vec3(.025,.061,.08);
      if(kind.x>40.5&&kind.x<41.5)base=vec3(.055,.085,.12);
      if(kind.x>41.5&&kind.x<42.5)base=vec3(.94,.37,.055);
      if(kind.x>42.5&&kind.x<43.5)base=vec3(.57,.35,.23);
      if(kind.x>43.5&&kind.x<44.5)base=vec3(.7,.04,.02);
      if(kind.x>44.5&&kind.x<45.5)base=vec3(.70,.73,.66);
      if(kind.x>45.5&&kind.x<46.5)base=vec3(.026,.029,.031)*(.94+noise(surfacePoint.yz*170.)*.12);
      if(kind.x>46.5&&kind.x<47.5)base=vec3(.052,.059,.067);
      if(kind.x>47.5&&kind.x<48.5)base=vec3(.095,.105,.12);
      if(kind.x>48.5&&kind.x<49.5)base=vec3(.023,.038,.045);
      if(kind.x>49.5&&kind.x<50.5)base=vec3(.28,.32,.35);
      if(kind.x>50.5&&kind.x<51.5)base=vec3(.6,.21,.025);
      if(kind.x>51.5&&kind.x<52.5)base=vec3(.28,.30,.31);
      if(kind.x>54.5&&kind.x<55.5)base=texture2D(clothMap,vec2(fract((point.x+point.z)*1.3)*.5,.5+fract(point.y*.4)*.5)).rgb*vec3(.63,.57,.43);
      if(kind.x>55.5&&kind.x<56.5){float grain=noise(vec2(point.x*2.,point.z*75.));base=mix(vec3(.21,.13,.065),vec3(.39,.28,.16),grain);}
      if(kind.x>56.5&&kind.x<57.5)base=mix(vec3(.28,.14,.075),vec3(.78,.56,.40),kind.y);
      if(kind.x>57.5&&kind.x<58.5)base=vec3(.65,.63,.57);
      if(kind.x>58.5&&kind.x<59.5)base=vec3(.021,.017,.014);
      if(kind.x>59.5&&kind.x<60.5){
        vec3 cabin=point-vec3(-110.,${(ground(-110,-120)+54).toFixed(6)}+launchHeight,-120.);
        vec2 uv=vec2((cabin.x+cabin.z)*1.6,cabin.y*.72);vec2 cell=fract(uv);
        float seams=1.-smoothstep(.006,.025,min(min(cell.x,1.-cell.x),min(cell.y,1.-cell.y)));
        float screws=1.-smoothstep(.018,.034,length(cell-vec2(.075,.08)));
        base=vec3(.64,.67,.67)*(.98+.02*noise(cabin.xz*80.))*(1.-seams*.35-screws*.52);
      }
      if(kind.x>60.5&&kind.x<61.5)base=vec3(.09,.115,.13);
      if(kind.x>61.5&&kind.x<62.5)base=vec3(.016,.08,.095);
      if(kind.x>62.5&&kind.x<63.5)base=vec3(.65,.8,.8);if(kind.x>63.5)base=vec3(.23,.27,.28);
      float light=max(dot(n,normalize(vec3(.32,.20,-1.))),0.);
      float hemisphere=.5+.5*n.y;
      vec3 illumination=mix(vec3(.035,.035,.038),vec3(.095,.115,.16),hemisphere)+light*vec3(.09,.055,.022);
      illumination*=1.-night*.45;
      vec3 lampTint=mix(vec3(1.,.92,.76),vec3(1.,.065,.015),redLight);
      illumination+=lampTint*flashlight(point)*max(.15,dot(n,normalize(flashlightPosition-point)));
      vec3 toFire=firePosition+vec3(0,.7,0)-point;
      float flicker=(1.+fireBoost*.5)*(.9+.065*sin(time*9.)+.045*sin(time*17.3+1.));
      illumination+=vec3(2.3,.71,.14)*fireOn*flicker*max(.12,dot(n,normalize(toFire)))/(1.+dot(toFire,toFire)*.26);
      vec3 toLantern=lanternPosition-point;
      illumination+=vec3(1.3,.7,.2)*lanternOn*max(.08,dot(n,normalize(toLantern)))/(1.+dot(toLantern,toLantern)*3.);
      float alienPulse=.72+.10*sin(time*1.3);vec3 toWreck=vec3(65.,${(ground(65,-69)+1.1).toFixed(6)},-69.)-point;
      illumination+=vec3(.04,.85,1.1)*(0.22+ufoAwake*.65)*alienPulse*max(.1,dot(n,normalize(toWreck)))/(1.+dot(toWreck,toWreck)*.17);
      float campusGlow=campusLights*(1.-smoothstep(34.,70.,length(point.xz-vec2(-111.,-106.))));
      float labLight=(1.-smoothstep(4.5,5.5,abs(point.x+88.)))*(1.-smoothstep(6.,7.,abs(point.z+90.)))*(1.-smoothstep(${(ground(-88,-90)+4.5).toFixed(6)},${(ground(-88,-90)+5.5).toFixed(6)},point.y));
      illumination+=vec3(.15,.23,.26)*labLight;
      illumination+=vec3(.10,.13,.17)*campusGlow*(.25+.75*max(n.y,0.));
      for(int j=0;j<6;j++){float f=float(j);vec3 lightPos=vec3(j==0?-143.:j==1?-119.:j==2?-79.:j==3?-79.:j==4?-143.:-110.,${(ground(-111,-106)+7.5).toFixed(6)},j==0||j==1?-79.:j==2?-81.:j==3?-107.:j==4?-109.:-137.);vec3 l=lightPos-point;illumination+=vec3(1.25,.97,.68)*campusLights*max(.08,dot(n,normalize(l)))*15./(1.+dot(l,l)*.32);}
      if(kind.x>59.5&&kind.x<63.5)illumination=vec3(.25,.31,.35)+max(0.,dot(n,normalize(vec3(.15,1.,.3))))*.35;
      vec3 color=pow(max(base,vec3(.001)),vec3(2.2))*illumination;
      color+=woodEmber*fireOn*vec3(.36,.038,.001)*flicker;
      if(kind.x>25.5&&kind.x<30.5){float rim=pow(1.-max(0.,dot(n,view)),3.);color+=vec3(.025,.055,.072)*(.15+rim);color+=lampTint*flashlight(point)*pow(max(0.,dot(reflect(-normalize(flashlightPosition-point),n),view)),44.)*.3;}
      if(kind.x>27.5&&kind.x<28.5)color+=vec3(.025,.62,.85)*(.30+ufoAwake*.8)*alienPulse;
      if(kind.x<.5){float shade=texture2D(shadeMap,point.xz/660.+.5).r;color*=mix(.28,1.,shade)*(1.-max(roverShade(roverShadowA),roverShade(roverShadowB)));}
      if(kind.x>11.5&&kind.x<12.5)color+=fireOn*vec3(.75,.07,.002)*(.2+.8*noise(point.xz*21.+time*.15))*flicker;
      if(kind.x>12.5&&kind.x<13.5)color+=lanternOn*vec3(1.8,.8,.2);
      if(kind.x>7.5&&kind.x<10.5){vec3 halfway=normalize(view+normalize(toFire));color+=fireOn*vec3(.6,.2,.04)*pow(max(dot(n,halfway),0.),42.)/(1.+dot(toFire,toFire)*.3);}
      if(kind.x>17.5&&kind.x<18.5)color+=flashlightOn*lampTint*1.1;
      if(kind.x>15.5&&kind.x<18.5)color+=pow(base,vec3(2.2))*vec3(.17,.19,.23);
      if(kind.x>20.5&&kind.x<21.5)color+=pow(base,vec3(2.2))*.3;
      if(kind.x>21.5&&kind.x<22.5)color+=vec3(.48,.21,.045);
      if(kind.x>33.5&&kind.x<35.5){float finish=kind.x<34.5?.26:1.;color+=vec3(.09,.12,.15)*campusGlow*pow(1.-max(0.,dot(n,view)),2.)*finish;color+=vec3(.2,.25,.29)*pow(max(0.,dot(n,normalize(view+vec3(.4,.1,1.)))),22.)*campusGlow*finish;}
      if(kind.x>35.5&&kind.x<36.5)color+=vec3(.01,.14,.20)*campusLights;
      if(kind.x>36.5&&kind.x<37.5)color+=vec3(1.,.75,.43)*campusLights;
      if(kind.x>61.5&&kind.x<62.5){
        vec2 panelUV=vec2((point.x+111.6)*.9,(point.z+118.62)*2.8);float grid=step(.97,fract(panelUV.x*9.))+step(.97,fract(panelUV.y*8.));
        float orbit=1.-smoothstep(.010,.018,abs(length((panelUV-vec2(1.5,.63))*vec2(.8,1.))-.36));
        float readout=step(.62,fract(panelUV.y*11.))*step(fract(panelUV.x*3.),.56)*step(.22,panelUV.y);
        color+=vec3(.009,.052,.064)+vec3(.02,.18,.21)*grid*.35+vec3(.11,.49,.44)*orbit+vec3(.06,.20,.23)*readout;
      }
      if(kind.x>62.5&&kind.x<63.5)color+=vec3(.75,.93,1.2);
      if(kind.x>38.5){color+=pow(base,vec3(2.2))*vec3(.13,.17,.23);}
      if(kind.x>38.5&&kind.x<39.5){
        vec3 reflected=reflect(-view,n);float facing=max(0.,dot(n,view)),fresnel=.28+.62*pow(1.-facing,5.);
        vec3 reflection=(sky(reflected)+sky(normalize(reflected+vec3(.08,.10,.06)))+sky(normalize(reflected-vec3(.08,.03,.06))))/3.;
        color=color*.68+reflection*vec3(.78,.81,.84)*fresnel;
        // Broad sky fill keeps the folded steel readable in the twilight scene.
        color+=vec3(.048,.058,.073)*(.45+.55*max(n.y,0.));
        vec3 toFlood=normalize(vec3(-119.,8.,-79.)-point);color+=vec3(.48,.54,.61)*campusGlow*pow(max(0.,dot(n,normalize(view+toFlood))),26.);
        color+=lampTint*flashlight(point)*pow(max(0.,dot(n,normalize(view+normalize(flashlightPosition-point)))),42.)*.32;
      }
      if((kind.x>48.5&&kind.x<50.5)||(kind.x>39.5&&kind.x<40.5)){float facing=max(0.,dot(n,view)),fresnel=.08+.76*pow(1.-facing,5.);vec3 reflection=sky(reflect(-view,n));color=color*.3+reflection*fresnel*(kind.x>49.5?.85:.43)+vec3(.005,.009,.014);color+=vec3(.10,.13,.16)*campusGlow*pow(max(0.,dot(n,normalize(view+vec3(.2,.9,.2)))),48.);}
      if(kind.x>47.5&&kind.x<48.5)color+=vec3(.020,.026,.034)*pow(1.-max(0.,dot(n,view)),3.)+vec3(.010,.014,.018)*campusGlow;
      if(kind.x>50.5&&kind.x<51.5)color+=vec3(.34,.09,.002);
      if(kind.x>43.5&&kind.x<44.5)color+=vec3(.65,.018,.003);
      if(kind.x>44.5&&kind.x<45.5)color+=vec3(.28,.32,.23)*flashlight(point);
      color=pow(color,vec3(1./2.2));
      float fog=1.-exp(-dist*.00085);vec3 haze=sky(normalize(vec3(point.x-eye.x,.025,point.z-eye.z)))*.68;
      color=mix(color,haze,clamp(fog,0.,.86));
      gl_FragColor=vec4(color,1.);
    }
  `;
  const fireVertex = `
    precision highp float;attribute vec2 position;
    uniform vec3 eye,right,up,forward,firePosition;uniform float aspect,lens;
    varying vec3 worldPoint;
    void main(){worldPoint=firePosition+right*position.x*1.3+vec3(0,(position.y+1.)*1.65,0);vec3 p=worldPoint-eye;float d=dot(p,forward);
    gl_Position=vec4(dot(p,right)/(aspect*lens),dot(p,up)/lens,1.000025*d-.10000125,d);}
  `;
  const fireFragment = common + `
    uniform vec3 firePosition;uniform float time,fireOn,fireBoost;varying vec3 worldPoint;
    float field(vec3 p){return noise(p.xz*3.+vec2(p.y*1.5,-time*1.1))*.62+noise(p.xz*7.+vec2(p.y*3.,-time*2.3))*.38;}
    void main(){
      if(fireOn<.5)discard;
      vec3 ray=normalize(worldPoint-eye),sum=vec3(0.);float alpha=0.;
      for(int i=0;i<28;i++){
        vec3 p=worldPoint-firePosition+ray*(float(i)/27.-.5)*2.4;
        float h=p.y/(1.+fireBoost*.30),rad=length(p.xz+vec2(sin(h*4.-time*2.),cos(h*3.+time))*h*.10);
        float taper=max(.02,.5*(1.-h/1.65));float n=field(p);
        float shape=taper-rad+(n-.5)*.44;
        for(int j=0;j<3;j++){float a=float(j)*2.094;vec2 bend=vec2(cos(a+time*.3),sin(a+time*.3))*(.27-h*.08)+vec2(sin(h*7.-time*3.+a),cos(h*5.-time*2.+a))*h*.07;
          float tongue=max(.01,.18*(1.-h/(1.35+.25*sin(time*1.7+a))))-length(p.xz-bend)+(n-.5)*.18;shape=max(shape,tongue);}
        float f=smoothstep(-.015,.085,shape)*smoothstep(.035,.18,h)*(1.-smoothstep(1.0,1.8,h));
        float core=clamp((taper-rad)*3.,0.,1.)*(1.-smoothstep(.2,1.1,h));
        vec3 c=mix(vec3(1.,.12,.008),vec3(1.,.88,.48),clamp(core+n*.48,0.,1.));
        float smoke=smoothstep(.35,.85,n)*max(0.,1.-rad/(.2+h*.24))*smoothstep(1.1,1.9,h)*(1.-smoothstep(2.,3.25,h))*.012;
        float a=f*.19+smoke;sum+=(1.-alpha)*(c*f*.22+vec3(.14,.13,.12)*smoke);alpha+=(1.-alpha)*a;
      }
      if(alpha<.002)discard;gl_FragColor=vec4(sum,alpha);
    }
  `;
  const emberVertex = `
    precision highp float;attribute float position;
    uniform vec3 eye,right,up,forward,firePosition;uniform float aspect,lens,time,fireOn,fireBoost;
    varying float fade;
    void main(){float phase=fract(position*.618+time*(.13+fract(position*.37)*.12));float a=position*2.399+phase*2.;
    vec3 world=firePosition+vec3(sin(a)*(.08+phase*.6),.3+phase*(2.8+fireBoost*1.7),cos(a)*(.08+phase*.6));
    vec3 p=world-eye;float d=dot(p,forward);fade=sin(phase*3.14159)*fireOn;
    gl_Position=vec4(dot(p,right)/(aspect*lens),dot(p,up)/lens,1.000025*d-.10000125,d);gl_PointSize=clamp(24./max(d,1.),1.,4.);}
  `;
  const emberFragment=`precision mediump float;varying float fade;void main(){float a=(1.-smoothstep(.05,.5,length(gl_PointCoord-.5)))*fade;gl_FragColor=vec4(vec3(1.,.38,.05)*a,a);}`;
  const handVertex=`
    precision highp float;attribute vec3 position,normal;attribute vec2 material;
    uniform vec3 eye,right,up,forward;uniform float aspect,lens;uniform vec2 handSway;
    varying vec3 point,norm,surfacePoint;varying vec2 kind;
    void main(){surfacePoint=position;vec3 local=position+vec3(handSway,0.);local.x-=max(0.,1.-aspect)*.33;float depth=-local.z;point=eye+right*local.x+up*local.y-forward*local.z;norm=normalize(right*normal.x+up*normal.y-forward*normal.z);kind=material;
    gl_Position=vec4(local.x/(aspect*lens),local.y/lens,1.000025*depth-.10000125,depth);}
  `;
  function handGeometry(scanner=false){
    const data=[];
    const vertex=(p,n,k)=>data.push(...p,...n,k,.5);
    function tri(a,b,c,na,nb,nc,k){vertex(a,na,k);vertex(b,nb,k);vertex(c,nc,k);}
    function sphere(center,size,k){const rows=12,sides=20;const point=(i,j)=>{const lat=-Math.PI/2+i/rows*Math.PI,a=j/sides*TAU,n=[Math.cos(lat)*Math.cos(a),Math.sin(lat),Math.cos(lat)*Math.sin(a)];return {p:center.map((v,t)=>v+n[t]*size[t]),n};};for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){const a=point(i,j),b=point(i+1,j),c=point(i,j+1),d=point(i+1,j+1);tri(a.p,b.p,c.p,a.n,b.n,c.n,k);tri(c.p,b.p,d.p,c.n,b.n,d.n,k);}}
    function cylinder(a,b,r,k,sides=24){let d=b.map((v,i)=>v-a[i]),len=Math.hypot(...d);d=d.map(v=>v/len);let u=[d[1],-d[0],0];if(Math.hypot(...u)<.001)u=[1,0,0];len=Math.hypot(...u);u=u.map(v=>v/len);const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]];const n=i=>u.map((x,j)=>x*Math.cos(i/sides*TAU)+v[j]*Math.sin(i/sides*TAU));for(let i=0;i<sides;i++){const na=n(i),nb=n(i+1),pa=a.map((x,j)=>x+na[j]*r),pb=a.map((x,j)=>x+nb[j]*r),pc=b.map((x,j)=>x+na[j]*r),pd=b.map((x,j)=>x+nb[j]*r);tri(pa,pc,pb,na,na,nb,k);tri(pb,pc,pd,nb,na,nb,k);tri(a,pb,pa,d.map(x=>-x),d.map(x=>-x),d.map(x=>-x),k);tri(b,pc,pd,d,d,d,k);}}
    // A canvas sleeve and a fitted tan field glove gripping a metal flashlight.
    if(scanner){cylinder([.64,-.66,-.24],[.47,-.43,-.56],.080,17);sphere([.47,-.40,-.58],[.074,.072,.065],17);sphere([.47,-.335,-.62],[.052,.084,.045],16);}
    else{cylinder([.57,-.66,-.24],[.35,-.36,-.49],.082,17);sphere([.35,-.36,-.49],[.087,.084,.091],17);cylinder([.36,-.39,-.46],[.32,-.30,-.57],.066,17);sphere([.316,-.275,-.60],[.063,.052,.089],16);}
    if(scanner){
      function quad(a,b,c,d,k){const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);let n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],l=Math.hypot(...n);n=n.map(v=>v/l);tri(a,b,c,n,n,n,k);tri(a,c,d,n,n,n,k);}
      function box(x,y,z,w,h,d,k){const a=[x-w/2,y-h/2,z+d/2],b=[x+w/2,y-h/2,z+d/2],c=[x+w/2,y+h/2,z+d/2],e=[x-w/2,y+h/2,z+d/2],back=p=>[p[0],p[1],p[2]-d];quad(a,b,c,e,k);quad(back(b),back(a),back(e),back(c),k);quad(a,e,back(e),back(a),k);quad(b,back(b),back(c),c,k);quad(e,c,back(c),back(e),k);}
      box(.317,-.25,-.61,.27,.38,.07,21);box(.317,-.233,-.565,.235,.29,.025,8);
      quad([.215,-.355,-.546],[.42,-.355,-.546],[.42,-.11,-.546],[.215,-.11,-.546],70);
      for(const x of [.22,.414])for(const y of [-.42,-.08])sphere([x,y,-.56],[.012,.012,.008],35);
      for(const x of [.25,.31,.37])box(x,-.405,-.559,.03,.016,.018,35);
      cylinder([.22,-.075,-.63],[.20,.09,-.64],.011,35,12);sphere([.20,.09,-.64],[.014,.018,.014],8);
      for(let i=0;i<4;i++){const yy=-.37+i*.038;cylinder([.40,yy,-.63],[.456,yy+.01,-.58],.018,16,12);sphere([.452,yy+.01,-.58],[.02,.02,.023],16);}
      cylinder([.45,-.38,-.59],[.416,-.32,-.535],.022,16,14);
      return new Float32Array(data);
    }
    const rear=[.315,-.26,-.49],front=[.263,-.24,-.89],axis=front.map((v,i)=>v-rear[i]),at=t=>rear.map((v,i)=>v+axis[i]*t);
    cylinder(rear,at(.8),.042,21);cylinder(at(.73),at(.93),.065,8);cylinder(at(.88),front,.073,21);cylinder(front,at(1.015),.061,18);
    for(let i=0;i<8;i++)cylinder(at(.10+i*.065),at(.115+i*.065),.044,8,24);
    for(let i=0;i<4;i++){const z=-.66+i*.038,yy=-.245-i*.004;const points=[[.335,yy-.065,z+.014],[.359,yy-.025,z],[.352,yy+.013,z-.007],[.329,yy+.018,z-.010]];for(let j=0;j<3;j++){cylinder(points[j],points[j+1],.016,16,12);sphere(points[j+1],[.016,.016,.016],16);}}
    cylinder([.265,-.31,-.575],[.266,-.257,-.625],.022,16,14);sphere([.267,-.25,-.637],[.025,.019,.029],16);
    return new Float32Array(data);
  }
  function geometry() {
    const data = [], obstacles = [], occluders = [];
    const gridSize=HALF*2/STEP+1, heights=new Float32Array(gridSize*gridSize),normals=[];
    for(let z=0;z<gridSize;z++)for(let x=0;x<gridSize;x++)heights[z*gridSize+x]=height(x*STEP-HALF,z*STEP-HALF);
    for(let z=0;z<gridSize;z++)for(let x=0;x<gridSize;x++){
      const nx=heights[z*gridSize+Math.max(0,x-1)]-heights[z*gridSize+Math.min(gridSize-1,x+1)];
      const nz=heights[Math.max(0,z-1)*gridSize+x]-heights[Math.min(gridSize-1,z+1)*gridSize+x];
      const l=Math.hypot(nx,STEP*2,nz);normals.push([nx/l,STEP*2/l,nz/l]);
    }
    let seed = 49871; const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    function tri(a,b,c,kind,tone=.5,smooth=false,custom=null) {
      const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
      let n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
      const len=Math.hypot(...n)||1;n=n.map(v=>v/len);
      for(const [i,p] of [a,b,c].entries()){
        let normal=custom?custom[i]:n;
        if(smooth)normal=normals[Math.round((p[2]+HALF)/STEP)*gridSize+Math.round((p[0]+HALF)/STEP)];
        data.push(...p,...normal,kind,tone);
      }
    }
    for(let z=-HALF;z<HALF;z+=STEP)for(let x=-HALF;x<HALF;x+=STEP){
      const a=[x,height(x,z),z],b=[x+STEP,height(x+STEP,z),z],c=[x,height(x,z+STEP),z+STEP],d=[x+STEP,height(x+STEP,z+STEP),z+STEP];
      tri(a,c,b,0,.5,true);tri(b,c,d,0,.5,true);
    }
    // Extend the desert beneath the distant mountain belts.
    for(let i=0;i<160;i++)for(let j=0;j<8;j++){
      const vertex=(i,j)=>{const a=i/160*TAU,r=315+j*320;return [Math.sin(a)*r,-1.5,Math.cos(a)*r]};
      const a=vertex(i,j),b=vertex(i+1,j),c=vertex(i,j+1),d=vertex(i+1,j+1);tri(a,b,c,0);tri(b,d,c,0);
    }
    // Three closed mountain belts surround the valley in every direction.
    for(let layer=0;layer<3;layer++){
      const radius=740+layer*480,segments=480,rows=16;
      function vertex(i,j){const angle=i/segments*TAU,t=j/rows;
        const rugged=noise(Math.cos(angle)*8+layer*13,Math.sin(angle)*8+layer*7);
        const peak=12+layer*15+Math.pow(rugged,1.5)*(43+layer*19);
        const r=radius+t*400;const y=-4+Math.sin(t*Math.PI)*peak*(.89+.11*noise(Math.cos(angle)*55+t*4,Math.sin(angle)*55+t*3));
        return [Math.sin(angle)*r,y,Math.cos(angle)*r];}
      for(let i=0;i<segments;i++)for(let j=0;j<rows;j++){
        const a=vertex(i,j),b=vertex(i+1,j),c=vertex(i,j+1),d=vertex(i+1,j+1);tri(a,b,c,4,.4);tri(b,d,c,4,.4);
      }
    }
    function tube(points,radius,kind,tone){
      const sides=14, rings=[],normals=[];
      for(let j=0;j<points.length;j++){
        const prev=points[Math.max(0,j-1)],next=points[Math.min(points.length-1,j+1)];
        const tangent=next.map((v,i)=>v-prev[i]),length=Math.hypot(...tangent);for(let i=0;i<3;i++)tangent[i]/=length;
        let axis=[tangent[1],-tangent[0],0],alen=Math.hypot(...axis);if(alen<.001){axis=[1,0,0];alen=1;}for(let i=0;i<3;i++)axis[i]/=alen;
        const cross=[tangent[1]*axis[2]-tangent[2]*axis[1],tangent[2]*axis[0]-tangent[0]*axis[2],tangent[0]*axis[1]-tangent[1]*axis[0]];
        const cap=j===points.length-1?.025:j===points.length-2?.7:1, r=radius*cap;
        const rn=Array.from({length:sides},(_,i)=>{const a=i/sides*TAU;let n=axis.map((v,k)=>Math.cos(a)*v+Math.sin(a)*cross[k]);if(j>=points.length-2){n=n.map((v,k)=>v*.65+tangent[k]*(1-cap));const l=Math.hypot(...n);n=n.map(v=>v/l);}return n;});normals.push(rn);
        rings.push(Array.from({length:sides},(_,i)=>{const a=i/sides*TAU;return points[j].map((v,k)=>v+r*(Math.cos(a)*axis[k]+Math.sin(a)*cross[k]))}));
      }
      for(let j=0;j<rings.length-1;j++)for(let i=0;i<sides;i++){
        const k=(i+1)%sides,a=rings[j][i],b=rings[j][k],c=rings[j+1][i],d=rings[j+1][k];
        tri(a,c,b,kind,tone,false,[normals[j][i],normals[j+1][i],normals[j][k]]);tri(b,c,d,kind,tone,false,[normals[j][k],normals[j+1][i],normals[j+1][k]]);
      }
    }
    function cactus(x,z,size){
      if(riverDistance(x,z)<7)return;
      if(Math.hypot(x,z+10)<8||Math.max(Math.abs(x-CAMPUS.x)-CAMPUS.width/2,Math.abs(z-CAMPUS.z)-CAMPUS.depth/2)<2||pathClearance(x,z)<size*.6+.6||Math.hypot(x-CRASH.x,z-CRASH.z)<10||TRAIL.some(p=>Math.hypot(x-p.x,z-p.z)<4))return;
      const y=ground(x,z)-.06,h=size*3.8,r=size*.22,tone=rand(),rotation=rand()*TAU,lean=(rand()-.5)*.22;
      const stalk=Array.from({length:12},(_,j)=>{const t=j/11;return [x+lean*t*t,y+h*t,z+lean*.5*t]});tube(stalk,r,2,tone);
      const arms=size<.7?0:1+Math.floor(rand()*3);
      for(let arm=0;arm<arms;arm++){
        const angle=rotation+arm*2.4,low=h*(.3+rand()*.3),reach=size*(.6+rand()*.5),rise=size*(1+rand()*.7);
        const path=Array.from({length:15},(_,j)=>{const t=j/14;const horizontal=reach*Math.sin(Math.min(1,t*2)*Math.PI*.5);const vertical=rise*(1-Math.cos(t*Math.PI*.5));return [x+Math.cos(angle)*horizontal,y+low+vertical,z+Math.sin(angle)*horizontal]});
        tube(path,r*.65,2,tone);
      }
      obstacles.push({x,z,radius:r+.18});occluders.push({x,z,radius:r*2+.2,height:h,strength:.66});
    }
    cactus(-8,-18,1.35);cactus(13,-31,1.5);cactus(-18,12,1.1);
    for(let i=0;i<75;i++){const angle=rand()*TAU,r=28+rand()*245;cactus(Math.sin(angle)*r,Math.cos(angle)*r,.4+rand()*1.35);}
    function rock(x,z,r,force=false,waterStone=false){
      if(!force&&(riverDistance(x,z)<4.5||onBridge(x,z)))return;
      if(!force&&(Math.hypot(x,z+10)<8||Math.max(Math.abs(x-CAMPUS.x)-CAMPUS.width/2,Math.abs(z-CAMPUS.z)-CAMPUS.depth/2)<2||pathClearance(x,z)<r+.6||Math.hypot(x-CRASH.x,z-CRASH.z)<11||TRAIL.some(p=>Math.hypot(x-p.x,z-p.z)<4)))return;
      const y=waterStone?waterHeight(z)-r*.25:ground(x,z)-r*.2,tone=waterStone?.18:rand(),rotation=rand()*TAU,stretch=.7+rand()*.8,sides=r>.45?14:7,rows=r>.45?7:3;
      const points=[],ns=[];
      for(let j=0;j<=rows;j++){
        const lat=-.25+(Math.PI*.5+.25)*j/rows,ring=[],normal=[];
        for(let k=0;k<=sides;k++){
          const a=k/sides*TAU+rotation,v=.72+.28*noise(Math.cos(a)*4+x,Math.sin(a)*4+z+j*.5);
          const n=[Math.cos(a)*Math.cos(lat),Math.sin(lat),Math.sin(a)*Math.cos(lat)];normal.push(n);
          const px=Math.sign(n[0])*Math.pow(Math.abs(n[0]),.76),pz=Math.sign(n[2])*Math.pow(Math.abs(n[2]),.83);
          ring.push([x+px*r*v*stretch+n[1]*r*.18,y+(n[1]+.2)*r*(.55+.25*noise(x+Math.cos(a)*2,z+Math.sin(a)*2))*v,z+pz*r*v+n[1]*r*.12]);
        }points.push(ring);ns.push(normal);
      }
      for(let j=0;j<rows;j++)for(let k=0;k<sides;k++){
        tri(points[j][k],points[j+1][k],points[j][k+1],1,tone,false,[ns[j][k],ns[j+1][k],ns[j][k+1]]);
        tri(points[j][k+1],points[j+1][k],points[j+1][k+1],1,tone,false,[ns[j][k+1],ns[j+1][k],ns[j+1][k+1]]);
      }
      if(r>.55)obstacles.push({x,z,radius:r*stretch});if(r>.12)occluders.push({x,z,radius:r*1.15,height:r*.6,strength:.6});
    }
    rock(-3.7,-6.4,.8);rock(5,-11,.8);rock(-4.5,-7.3,.42);
    for(let i=0;i<480;i++){
      const angle=rand()*TAU,range=i<170?5+rand()*65:35+rand()*240,x=Math.sin(angle)*range,z=Math.cos(angle)*range;
      rock(x,z,.08+Math.pow(rand(),2.8)*(i<170?.9:1.4));
    }
    // Small physical stones break up the near-ground silhouette and texture.
    for(let i=0;i<620;i++){const angle=rand()*TAU,r=2+rand()*48;rock(Math.sin(angle)*r,Math.cos(angle)*r,.025+rand()*.11);}
    function shrub(x,z,size,wet=false){
      if(!wet&&riverDistance(x,z)<4.5)return;
      if(Math.hypot(x,z+10)<8||Math.max(Math.abs(x-CAMPUS.x)-CAMPUS.width/2,Math.abs(z-CAMPUS.z)-CAMPUS.depth/2)<2||pathClearance(x,z)<size*.6+.6||Math.hypot(x-CRASH.x,z-CRASH.z)<10||TRAIL.some(p=>Math.hypot(x-p.x,z-p.z)<4))return;
      const y=ground(x,z)-.055,tone=rand(),width=size*2.2,h=width*.84,rotation=rand()*TAU;
      // Crossed alpha cutouts give fine leaves and branches from every bearing.
      // For plant vertices, the normal channel carries texture coordinates.
      for(let j=0;j<3;j++){
        const a=rotation+j*Math.PI/3,dx=Math.cos(a)*width*.5,dz=Math.sin(a)*width*.5;
        const bl=[x-dx,y,z-dz],br=[x+dx,y,z+dz],tl=[x-dx,y+h,z-dz],tr=[x+dx,y+h,z+dz];
        tri(bl,br,tl,wet?54:6,tone,false,[[0,1,1],[1,1,1],[0,0,1]]);tri(br,tr,tl,wet?54:6,tone,false,[[1,1,1],[1,0,1],[0,0,1]]);
      }
      occluders.push({x,z,radius:size*.8,height:size,strength:.35});
    }
    shrub(3.3,-5.3,.8);shrub(-5.8,-9.2,.6);shrub(7,-16,1);
    for(let i=0;i<450;i++){
      const angle=rand()*TAU,r=i<140?4+rand()*70:35+rand()*220;shrub(Math.sin(angle)*r,Math.cos(angle)*r,.35+rand()*.75);
    }
    // Camp props are real world geometry, with their own materials and collisions.
    function quad(a,b,c,d,k,t=.5){tri(a,b,c,k,t);tri(a,c,d,k,t);}
    function cylinder(a,b,r,k,sides=18){
      const axis=b.map((v,i)=>v-a[i]),l=Math.hypot(...axis),d=axis.map(v=>v/l);
      let u=[d[1],-d[0],0];if(Math.hypot(...u)<.01)u=[1,0,0];const ul=Math.hypot(...u);u=u.map(v=>v/ul);
      const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]];
      const norm=i=>u.map((n,j)=>n*Math.cos(i/sides*TAU)+v[j]*Math.sin(i/sides*TAU));
      for(let i=0;i<sides;i++){const n=norm(i),m=norm(i+1),p=a.map((x,j)=>x+n[j]*r),q=a.map((x,j)=>x+m[j]*r),s=b.map((x,j)=>x+n[j]*r),t=b.map((x,j)=>x+m[j]*r);
        tri(p,s,q,k,.5,false,[n,n,m]);tri(q,s,t,k,.5,false,[m,n,m]);tri(a,q,p,k);tri(b,s,t,k);}
    }
    function detailedLog(log,index){const {a,b,radius,burnt}=log,{d,u,v,length}=logFrame(a,b),sides=32,rows=15,rings=[],ns=[];
      for(let j=0;j<=rows;j++){const t=j/rows,ring=[],norm=[];
        for(let k=0;k<sides;k++){const angle=k/sides*TAU,n=u.map((n,i)=>n*Math.cos(angle)+v[i]*Math.sin(angle));
          const ridge=1+.065*Math.sin(angle*13.+t)+.055*(noise(Math.cos(angle)*5.+index,Math.sin(angle)*5.+t*5.)-.5),taper=1-t*.13;
          const knot=1+.13*Math.exp(-Math.pow((t-.38)/.12,2))*Math.pow(Math.max(0,Math.cos(angle-1.2)),12);
          const chip=0;
          ring.push(a.map((p,i)=>p+d[i]*(t*length+chip)+n[i]*radius*ridge*taper*knot));norm.push(n);
        }rings.push(ring);ns.push(norm);
      }
      for(let j=0;j<rows;j++)for(let k=0;k<sides;k++){const n=(k+1)%sides;tri(rings[j][k],rings[j+1][k],rings[j][n],burnt?11:5,index,false,[ns[j][k],ns[j+1][k],ns[j][n]]);tri(rings[j][n],rings[j+1][k],rings[j+1][n],burnt?11:5,index,false,[ns[j][n],ns[j+1][k],ns[j+1][n]]);}
      for(let k=0;k<sides;k++){const n=(k+1)%sides,back=d.map(v=>-v);tri(a,rings[0][n],rings[0][k],burnt?24:23,index,false,[back,back,back]);tri(b,rings[rows][k],rings[rows][n],burnt?24:23,index,false,[d,d,d]);}
    }
    const [tx,ty,tz]=CAMP.tent;
    const L=[tx-1.65,ty+.08,tz+1.9],R=[tx+1.65,ty+.08,tz+1.9],T=[tx,ty+2.2,tz+1.9];
    const LB=[tx-1.65,ty+.08,tz-1.9],RB=[tx+1.65,ty+.08,tz-1.9],TB=[tx,ty+2.2,tz-1.9];
    // Subdivided canvas sags slightly between the ridge and the staked edges.
    for(const side of [-1,1])for(let i=0;i<16;i++)for(let j=0;j<12;j++){
      const vertex=(i,j)=>{const u=i/16,v=j/12;return [tx+side*u*1.65,ty+.08+(1-u)*2.12-Math.sin(u*Math.PI)*.1*(.65+.35*Math.sin(v*Math.PI)),tz+1.9-v*3.8]};
      quad(vertex(i,j),vertex(i+1,j),vertex(i+1,j+1),vertex(i,j+1),7);
    }
    tri(LB,TB,RB,7);quad(L,R,RB,LB,14);
    // Two front canvas panels frame a dark triangular doorway; the flap can close.
    const dl=[tx-.86,ty+.09,tz+1.91],dr=[tx+.86,ty+.09,tz+1.91],dt=[tx,ty+1.82,tz+1.91];
    quad(L,dl,dt,T,7);quad(dr,R,T,dt,7);tri(dl,dr,dt,15);
    cylinder([tx,ty,tz-1.9],TB,.027,8);cylinder([tx,ty+.07,tz+1.9],T,.025,8);cylinder(T,TB,.023,8);
    for(const side of [-1,1])for(const z of [tz-1.9,tz+1.9]){
      const anchor=[tx+side*2.45,ground(tx+side*2.45,z+.32)+.025,z+.32];
      cylinder([tx+side*1.62,ty+.13,z],anchor,.009,7,6);cylinder(anchor,[anchor[0],anchor[1]+.18,anchor[2]],.015,8,8);
      cylinder([tx,ty+2.21,z],[tx+side*1.66,ty+.08,z],.013,7,8);
    }
    // A rolled sleeping mat, low lantern stand, and log seat make the camp lived in.
    cylinder([tx-.65,ty+.18,tz-.8],[tx+.6,ty+.18,tz-.8],.14,14);
    const lantern=[tx+.25,ty+.47,tz+1.28];
    cylinder([lantern[0],ty+.07,lantern[2]],[lantern[0],ty+.19,lantern[2]],.16,8);
    cylinder([lantern[0],ty+.20,lantern[2]],[lantern[0],ty+.66,lantern[2]],.105,13);
    cylinder([lantern[0],ty+.66,lantern[2]],[lantern[0],ty+.73,lantern[2]],.16,8);
    for(let i=0;i<4;i++){const a=i/4*TAU,dx=Math.cos(a)*.12,dz=Math.sin(a)*.12;cylinder([lantern[0]+dx,ty+.18,lantern[2]+dz],[lantern[0]+dx,ty+.69,lantern[2]+dz],.012,8,6);}
    obstacles.push({x:tx,z:tz,radius:1.95});occluders.push({x:tx,z:tz,radius:2.1,height:2.2,strength:.9});
    const [fx,fy,fz]=CAMP.fire;
    for(let i=0;i<13;i++){const a=i/13*TAU;rock(fx+Math.cos(a)*.87,fz+Math.sin(a)*.87,.24+rand()*.10,true);}
    LOGS.forEach(detailedLog);
    for(let i=0;i<22;i++){const a=rand()*TAU,r=rand()*.58,x=fx+Math.cos(a)*r,z=fz+Math.sin(a)*r;cylinder([x,fy+.075,z],[x,fy+.095,z],.04+rand()*.075,12,7);}
    obstacles.push({x:fx,z:fz,radius:1.0});
    occluders.push({x:0,z:-4.5,radius:1.15,height:.5,strength:.7},{x:-2.2,z:-6.9,radius:.7,height:.5,strength:.65});
    for(const x of [-.8,0,.8])obstacles.push({x,z:-4.5,radius:.2});
    // A refractor telescope with dew shield, lens, finder, focusing knobs and tripod.
    const [sx,sy,sz]=CAMP.telescope,center=[sx,sy+1.48,sz],axis=[.14,.62,-.77];
    const at=t=>center.map((v,i)=>v+axis[i]*t);
    cylinder([sx,sy+.75,sz],center,.09,8);
    for(let i=0;i<3;i++){const a=i/3*TAU+.4;const foot=[sx+Math.cos(a)*.82,ground(sx+Math.cos(a)*.82,sz+Math.sin(a)*.82)+.03,sz+Math.sin(a)*.82];
      cylinder([sx,sy+1.22,sz],foot,.035,8);cylinder([sx,sy+.5,sz],foot.map((v,j)=>j===1?v+.12:v),.012,8,8);cylinder(foot,[foot[0],foot[1]+.08,foot[2]],.065,10,10);}
    cylinder(at(-.65),at(.66),.155,9,32);cylinder(at(.51),at(.94),.193,9,32);
    cylinder(at(.941),at(.948),.173,10,32);cylinder(at(.95),at(.958),.143,14,32);
    cylinder(at(-.64),at(-.82),.088,8);const rear=at(-.82);cylinder(rear,[rear[0],rear[1]+.2,rear[2]],.056,10);cylinder([rear[0],rear[1]+.17,rear[2]],[rear[0],rear[1]+.25,rear[2]],.072,8);
    cylinder(at(-.15),at(-.1),.174,8);cylinder(at(.25),at(.3),.174,8);
    const finder=t=>at(t).map((v,i)=>v+(i===1?.21:0));cylinder(finder(-.22),finder(.33),.045,9,16);
    cylinder([sx-.24,sy+1.38,sz],[sx+.24,sy+1.38,sz],.09,8);cylinder([sx-.26,sy+1.38,sz],[sx-.29,sy+1.38,sz],.11,10);
    cylinder([sx,sy+1.15,sz],[sx-.4,sy+1.05,sz+.6],.018,8);cylinder([sx-.4,sy+1.05,sz+.6],[sx-.46,sy+1.02,sz+.76],.04,10);
    obstacles.push({x:sx,z:sz,radius:.65});occluders.push({x:sx,z:sz,radius:.6,height:1.9,strength:.65});
    for(const place of TRAIL){const {x,z,id}=place,y=ground(x,z);
      if(place.hidden)continue;
      // A low amber marker makes each destination discoverable without floating collectibles.
      cylinder([x-1.1,y,z+.5],[x-1.1,y+.62,z+.5],.045,8,10);cylinder([x-1.1,y+.55,z+.5],[x-1.1,y+.63,z+.5],.073,22,12);
      if(id==='overlook'){for(let i=0;i<5;i++){const begin=data.length;rock(x+(i%2)*.08,z-i*.015,.62-i*.075,true);for(let j=begin+1;j<data.length;j+=8)data[j]+=i*.17;}}
      if(id==='meteorite'){const start=data.length;rock(x,z,1.05,true);for(let i=start+6;i<data.length;i+=8)data[i]=19;for(let i=0;i<8;i++){const a=i/8*TAU;rock(x+Math.cos(a)*1.5,z+Math.sin(a)*1.5,.15,true);}}
      if(id==='station'){cylinder([x,y,z],[x,y+2.6,z],.045,8);cylinder([x-.65,y+2.34,z],[x+.65,y+2.34,z],.019,8);cylinder([x-.42,y+2.1,z-.3],[x+.42,y+2.1,z+.3],.018,8);cylinder([x,y+.3,z],[x,y+1.13,z],.26,9);quad([x-1,y+.9,z-.7],[x+.15,y+.9,z-.7],[x+.15,y+.58,z+.3],[x-1,y+.58,z+.3],20);}
      if(id==='overlook'||id==='meteorite'||id==='station')obstacles.push({x,z,radius:.9});occluders.push({x,z,radius:1.1,height:1.2,strength:.65});
    }
    // Low stakes at bends make the paths readable in the dark without a glowing runway.
    for(const route of ROUTES)for(let i=8;i<route.points.length;i+=13){const p=route.points[i],prev=route.points[i-1],dx=p[0]-prev[0],dz=p[1]-prev[1],length=Math.hypot(dx,dz),side=route.width/2+.36,x=p[0]-dz/length*side,z=p[1]+dx/length*side,y=ground(x,z);
      if(x>-93.3&&x<-82.7&&z>-96.8&&z<-83.2)continue;
      cylinder([x,y,z],[x+(route.hidden?.18:0),y+(route.hidden?.3:.46),z],.025,8,8);if(!route.hidden)cylinder([x,y+.38,z],[x,y+.44,z],.038,22,8);
    }
    // A sandstone arch is open underneath so visitors can walk through it.
    {const x=-47,z=-48,y=ground(x,z),segments=40,sides=12,rings=[],normals=[];
      for(let j=0;j<=segments;j++){const a=j/segments*Math.PI,center=[x+Math.cos(a)*3.4,y+.15+Math.sin(a)*4.0,z+.15*Math.sin(a*3.)],ring=[],ns=[];
        for(let k=0;k<sides;k++){const b=k/sides*TAU,n=[Math.cos(a)*Math.cos(b),Math.sin(a)*Math.cos(b),Math.sin(b)],radius=.68*(1+.12*Math.sin(a*9.+b*3.)+.12*noise(j*.3,k));ring.push(center.map((v,i)=>v+n[i]*radius));ns.push(n);}rings.push(ring);normals.push(ns);
      }
      for(let j=0;j<segments;j++)for(let k=0;k<sides;k++){const n=(k+1)%sides;tri(rings[j][k],rings[j+1][k],rings[j][n],1,.9,false,[normals[j][k],normals[j+1][k],normals[j][n]]);tri(rings[j][n],rings[j+1][k],rings[j+1][n],1,.9,false,[normals[j][n],normals[j+1][k],normals[j+1][n]]);}
      for(const side of [-1,1]){rock(x+side*3.4,z,1.2,true);obstacles.push({x:x+side*3.4,z,radius:1.15});occluders.push({x:x+side*2.5,z,radius:1.8,height:4,strength:.7});}
    }
    // A long river with asymmetric banks, wider pools and small riffles around exposed stones.
    // Several strips across its width give the moving surface enough geometry at close range.
    for(let z=RIVER.start;z<RIVER.end;z+=.8){
      const at=(z,t)=>{const cap=Math.min(1,Math.sqrt(Math.max(.001,(z-RIVER.start)/4)),Math.sqrt(Math.max(.001,(RIVER.end-z)/4))),side=t<0?-1:1;return [riverX(z)+t*(bankWidth(z,side)+2.0)*cap,waterHeight(z),z];};
      for(let j=0;j<6;j++){const t=-1+j/3,tt=t+1/3,next=Math.min(RIVER.end,z+.8);quad(at(z,t),at(z,tt),at(next,tt),at(next,t),53);}
    }
    for(let i=0;i<195;i++){const z=-4+i*1.68;for(const side of [-1,1]){const x=riverX(z)+side*(bankWidth(z,side)+.1+rand()*2.8);if(pathClearance(x,z)>.8&&!onBridge(x,z)){
      rock(x,z,.15+Math.pow(rand(),1.5)*.72,true);
      if(rand()<.61)shrub(x+side*(.7+rand()*1.6),z+.7,.27+rand()*.57,true);
      // Small gravel clusters break the clean cut between mud, stone and water.
      if(i%3===0)for(let k=0;k<4;k++)rock(x+(rand()-.5)*1.5,z+(rand()-.5)*2,.035+rand()*.10,true);
    }}}
    for(let i=0;i<13;i++){const z=8+i*26,x=riverX(z)+Math.sin(i*2.4)*riverWidth(z)*.55;if(z<RIVER.end-4)rock(x,z,.78+.30*Math.sin(i*1.9+1),true,true);}
    // The upstream reach keeps flowing around an eastern bend, well beyond the playable valley.
    for(let z=-12;z>RIVER.start+12;z-=3.8){for(const side of [-1,1]){const x=riverX(z)+side*(bankWidth(z,side)+.5+rand()*2.2);if(pathClearance(x,z)>1.2){rock(x,z,.22+rand()*.70,true);if(rand()<.38)shrub(x+side*1.3,z,.4+rand()*.45,true);}}}
    // A low rock outcrop conceals the remote mesh endpoint; the near-camp dirt cap is gone.
    {const z=RIVER.start+4,x=riverX(z);rock(x,z,5.8,true,true);rock(x-4.1,z-1.5,4.2,true,true);rock(x+4.4,z-2,4.6,true,true);}
    // River willows: bending trunks, branching limbs and overlapping leaf cutouts.
    for(let i=0;i<34;i++){const z=2+i*9.2+(rand()-.5)*7,side=rand()>.5?1:-1,x=riverX(z)+side*(riverWidth(z)+3.3+rand()*3.2);if(pathClearance(x,z)<2.6)continue;const y=ground(x,z),h=2.6+rand()*2.0;
      cylinder([x,y,z],[x+.28,y+h*.76,z+.13],.14,55,12);
      for(let j=0;j<5;j++){const a=j/5*TAU,dx=Math.cos(a)*1.25,dz=Math.sin(a)*1.25;cylinder([x+.12,y+h*.42,z],[x+dx,y+h*(.75+rand()*.15),z+dz],.055,55,10);
        for(let k=0;k<3;k++){const angle=k*Math.PI/3+.2,ww=1.5+rand()*.6,cx=x+dx*.7,cz=z+dz*.7,cy=y+h*.58,ax=Math.cos(angle)*ww,az=Math.sin(angle)*ww;
          tri([cx-ax,cy,cz-az],[cx+ax,cy,cz+az],[cx-ax,cy+2.4,cz-az],54,.5,false,[[0,1,1],[1,1,1],[0,0,1]]);tri([cx+ax,cy,cz+az],[cx+ax,cy+2.4,cz+az],[cx-ax,cy+2.4,cz-az],54,.5,false,[[1,1,1],[1,0,1],[0,0,1]]);
        }
      }obstacles.push({x,z,radius:.3});occluders.push({x,z,radius:2.1,height:h,strength:.62});
    }
    for(let i=0;i<125;i++){const a=rand()*TAU,r=14+rand()*48;rock(Math.sin(a)*r,Math.cos(a)*r,.25+rand()*1.05);}
    // A planked footbridge has ramps, handrails, support beams, bolts and a matching walking surface.
    {const z=22,left=28.5,right=45.5,deck=x=>walkingGround(x,z);
      for(let x=left;x<right;x+=.28){const b=Math.min(right,x+.265),y=deck(x),yy=deck(b);quad([x,y,z-1.6],[b,yy,z-1.6],[b,yy,z+1.6],[x,y,z+1.6],56);for(const side of [-1,1]){quad([x,y,z+side*1.6],[b,yy,z+side*1.6],[b,yy-.16,z+side*1.6],[x,y-.16,z+side*1.6],56);}}
      for(const side of [-1,1]){for(let x=left+.2;x<right-.1;x+=1.65){const y=deck(x),zz=z+side*1.58;cylinder([x,y-.22,zz],[x,y+1.05,zz],.075,56,10);obstacles.push({x,z:zz,radius:.055});for(const dy of [.45,.98]){const nx=Math.min(right-.15,x+1.65);cylinder([x,y+dy,zz],[nx,deck(nx)+dy,zz],.038,56,10);}cylinder([x-.078,y+.88,zz],[x+.078,y+.88,zz],.016,35,8);}
        for(let x=31;x<=43;x+=4){const yy=deck(x);cylinder([x,ground(x,z+side*1.15),z+side*1.15],[x,yy-.15,z+side*1.15],.16,56,12);}
      }
      for(const x of [29,45])for(const side of [-1,1]){const y=deck(x),zz=z+side*1.72;cylinder([x,y,zz],[x,y+.8,zz],.055,35,10);cylinder([x,y+.68,zz],[x,y+.81,zz],.10,22,12);}
    }
    // The wreck is a tilted, partly buried saucer with an open torn sector.
    {const x=CRASH.x,z=CRASH.z,y=ground(x,z)+.66;
      const transform=p=>{const a=[p[0]*.978-p[1]*.208,p[0]*.208+p[1]*.978,p[2]];return [x+a[0],y+a[1]*.991-a[2]*.1305,z+a[1]*.1305+a[2]*.991];};
      const rotate=n=>{const a=[n[0]*.978-n[1]*.208,n[0]*.208+n[1]*.978,n[2]],b=[a[0],a[1]*.991-a[2]*.1305,a[1]*.1305+a[2]*.991],len=Math.hypot(...b);return b.map(v=>v/len);};
      const profile=[[.08,-.48],[2.3,-.60],[4.9,-.29],[5.8,0],[5.55,.25],[4.4,.62],[2.1,1.02],[1.9,1.35],[1.3,1.86],[.05,2.04]],sides=96;
      const at=(j,k)=>{const a=k/sides*TAU,[r,h]=profile[j],dent=(j>1&&j<6)?Math.sin(a*11.)*.045+Math.sin(a*3.)*.08:0;return transform([Math.cos(a)*(r+dent),h+dent,Math.sin(a)*(r+dent)]);};
      const normal=(j,k)=>{const a=k/sides*TAU,prev=profile[Math.max(0,j-1)],next=profile[Math.min(profile.length-1,j+1)],dr=next[0]-prev[0],dy=next[1]-prev[1],n=[dy*Math.cos(a),-dr,dy*Math.sin(a)],len=Math.hypot(...n);return rotate(n.map(v=>v/len));};
      for(let j=0;j<profile.length-1;j++)for(let k=0;k<sides;k++){const a=(k+.5)/sides*TAU;if(j>1&&j<6&&a>1.90&&a<2.50)continue;const kind=j>=6?27:26;tri(at(j,k),at(j+1,k),at(j,k+1),kind,.5,false,[normal(j,k),normal(j+1,k),normal(j,k+1)]);tri(at(j,k+1),at(j+1,k),at(j+1,k+1),kind,.5,false,[normal(j,k+1),normal(j+1,k),normal(j+1,k+1)]);}
      for(let i=0;i<24;i++){const a=i/24*TAU;if(a>1.8&&a<2.6)continue;const b=a+.13;cylinder(transform([Math.cos(a)*5.59,.28,Math.sin(a)*5.59]),transform([Math.cos(b)*5.59,.28,Math.sin(b)*5.59]),.034,28,8);}
      // Bent ribs reveal a dim, still-powered core through the impact opening.
      for(let i=0;i<5;i++){const a=1.89+i*.16;const p=transform([Math.cos(a)*4.7,.12,Math.sin(a)*4.7]),q=transform([Math.cos(a)*2.4,.6+i*.06,Math.sin(a)*2.4]);cylinder(p,q,.042,30,8);}
      cylinder(transform([-.65,-.1,.35]),transform([-.65,.95,.35]),.33,28,24);
      for(let i=0;i<9;i++){const a=1.92+i*.07,r=5.1+rand()*3.0,cx=x+Math.cos(a)*r,cz=z+Math.sin(a)*r,cy=ground(cx,cz)+.08,span=.28+rand()*.6;tri([cx-span,cy,cz],[cx+span,cy+.08,cz-.23],[cx+.12,cy+.15+rand()*.3,cz+.75],30,.6);}
      // A small tilted console is reachable from the end of the trail.
      cylinder([59.7,ground(59.7,-62)+.03,-62],[59.8,ground(59.7,-62)+.72,-62],.055,30,10);quad([59.35,ground(59.7,-62)+.72,-62.35],[60.15,ground(59.7,-62)+.72,-62.35],[60.15,ground(59.7,-62)+.61,-61.9],[59.35,ground(59.7,-62)+.61,-61.9],28);
      obstacles.push({x,z,radius:6.05});occluders.push({x,z,radius:6.1,height:2.5,strength:.85});
      for(let i=0;i<13;i++){const a=i/13*TAU,cx=x+Math.cos(a)*8.5,cz=z+Math.sin(a)*8;if(pathClearance(cx,cz)>1.4&&Math.hypot(cx-58,cz+61)>3)rock(cx,cz,.25+rand()*.40,true);}
    }
    // The field radio sits on a hard case beside the camp junction.
    {const x=0,z=-3.4,y=ground(x,z);cylinder([x,y,z],[x,y+.42,z],.34,21,4);cylinder([x,y+.42,z],[x,y+.63,z],.23,8,4);cylinder([x+.17,y+.61,z],[x+.17,y+1.05,z],.012,35,8);quad([x-.13,y+.46,z+.19],[x+.10,y+.46,z+.19],[x+.10,y+.55,z+.19],[x-.13,y+.55,z+.19],36);obstacles.push({x,z,radius:.38});}
    // A walkable fan-made launch campus; rockets are custom black display vehicles.
    {const y=ground(CAMPUS.x,CAMPUS.z);
      function box(x,z,w,d,h,k,base=y){const a=[x-w/2,base,z-d/2],b=[x+w/2,base,z-d/2],c=[x+w/2,base,z+d/2],e=[x-w/2,base,z+d/2],top=p=>[p[0],p[1]+h,p[2]];quad(a,top(a),top(b),b,k);quad(b,top(b),top(c),c,k);quad(c,top(c),top(e),e,k);quad(e,top(e),top(a),a,k);quad(top(a),top(e),top(c),top(b),k);}
      function building(x,z,w,d,h){box(x,z,w,d,h,33);for(let a=-w/2+2;a<w/2;a+=3)for(let b=-d/2+2;b<d/2;b+=3)obstacles.push({x:x+a,z:z+b,radius:2.1});occluders.push({x,z,radius:Math.max(w,d)/2,height:h,strength:.8});}
      building(-131,-94,20,24,14);box(-131,-81.92,15,.10,8.2,34); // Large integration hangar door.
      for(let x=-138;x<-124;x+=2.8)box(x,-81.82,2.1,.06,1.5,36,y+10.5);
      quad([-140,y+5,-81.75],[-122,y+5,-81.75],[-122,y+11,-81.75],[-140,y+11,-81.75],32);
      // Research lab: an open doorway and a furnished, fully walkable interior.
      const wall=(x,z,w,d,h,base=y)=>{box(x,z,w,d,h,33,base);if(base>y+.2)return;const long=Math.max(w,d);for(let t=-long/2+.12;t<long/2;t+=.28)obstacles.push({x:x+(w>d?t:0),z:z+(d>=w?t:0),radius:.20});};
      wall(-93,-90,.24,13,4.5);wall(-83,-90,.24,13,4.5);wall(-88,-96.5,10,.24,4.5);
      wall(-91.175,-83.5,3.65,.24,4.5);wall(-84.825,-83.5,3.65,.24,4.5);wall(-88,-83.5,2.7,.24,1.55,y+2.95);
      box(-88,-90,9.8,12.8,.04,31,y+.012);box(-88,-90,10.5,13.5,.22,35,y+4.5);
      // Ceiling underside and emergency strips remain lit during the campus outage.
      quad([-92.9,y+4.5,-96.4],[-82.9,y+4.5,-96.4],[-82.9,y+4.5,-83.4],[-92.9,y+4.5,-83.4],33);
      for(const x of [-89.35,-86.65]){box(x,-83.33,.09,.13,2.98,72);box(x,-83.33,.18,.19,.12,35,y+3.0);}
      for(const x of [-88.77,-87.23]){cylinder([x,y,-82.2],[x,y+.82,-82.2],.07,35,10);cylinder([x,y+.65,-82.2],[x,y+.80,-82.2],.075,72,10);obstacles.push({x,z:-82.2,radius:.09});}
      for(const x of [-92.6,-83.4]){box(x,-90,.09,11,.07,72,y+.14);for(const z of [-86,-90,-94])box(x,z,.08,1,.65,72,y+2.5);}
      for(let z=-83;z>-93;z-=.75)box(-88,z,.06,.23,.009,72,y+.06);
      quad([-90.2,y+3.1,-83.32],[-85.8,y+3.1,-83.32],[-85.8,y+4.05,-83.32],[-90.2,y+4.05,-83.32],73);
      // Rear briefing console with three inset displays, keyboard and service cabinetry.
      box(-88,-95.15,5.8,1.0,1.03,35);obstacles.push({x:-89.8,z:-95.15,radius:.55},{x:-88,z:-95.15,radius:.55},{x:-86.2,z:-95.15,radius:.55});
      for(const x of [-89.8,-88,-86.2]){box(x,-95.4,1.36,.16,.86,8,y+1.14);box(x,-95.29,1.2,.03,.69,72,y+1.22);for(let j=0;j<5;j++)box(x-.44+j*.2,-94.76,.13,.23,.025,8,y+1.055);}
      for(const x of [-90.5,-85.5])box(x,-94.59,.05,.06,.75,10,y+.16);
      // Eastern power router and battery racks; the center aisle stays clear.
      box(-83.6,-89, .65,3.0,1.8,35);for(const z of [-90,-88])obstacles.push({x:-83.6,z,radius:.4});
      for(let row=0;row<3;row++)for(let col=0;col<3;col++)box(-83.97,-89.6+col*.38,.045,.22,.19,72,y+.70+row*.30);
      // Western specimen cradle. The recovered fragment appears only after delivery.
      box(-91.45,-90,1.55,2.5,.92,35);obstacles.push({x:-91.45,z:-90.65,radius:.7},{x:-91.45,z:-89.35,radius:.7});
      cylinder([-91.45,y+.93,-90],[-91.45,y+1.03,-90],.52,8,32);cylinder([-91.45,y+1.03,-90],[-91.45,y+1.065,-90],.47,72,32);
      for(const dx of [-.62,.62])cylinder([-91.45+dx,y+.94,-90],[-91.45+dx,y+2.0,-90],.035,35,10);
      for(let i=0;i<6;i++){const a=i/6*TAU,b=(i+1)/6*TAU,top=[-91.45,y+1.90,-90],bottom=[-91.45,y+1.15,-90],pa=[-91.45+Math.cos(a)*.32,y+1.50,-90+Math.sin(a)*.32],pb=[-91.45+Math.cos(b)*.32,y+1.50,-90+Math.sin(b)*.32];tri(top,pa,pb,71);tri(bottom,pb,pa,71);}
      // Shelves, labeled equipment shapes, ventilation slats and roof hardware.
      for(const level of [.7,1.5,2.3]){box(-92.5,-86.7,.6,2.0,.09,35,y+level);for(const z of [-87.3,-86.6,-86])box(-92.45,z,.32,.35,.3,level>2?72:8,y+level+.09);}
      for(let i=0;i<12;i++)box(-90.8+i*.48,-96.31,.3,.025,.035,10,y+3.5);
      box(-86,-88,3.2,3,1.1,33,y+4.76);box(-91,-93,2.3,2.3,.12,20,y+4.77);

      // Structural frames, roof equipment, conduits and a lit pedestrian entrance.
      for(const x of [-141.2,-121]){box(x,-94,.28,24.8,14.4,35);box(x,-94,.42,25,.25,35,y+14.4);for(let z=-105;z<-81;z+=4)box(x,z,.34,.26,13.5,35);}
      box(-131,-94,20.7,24.8,.25,35,y+14);box(-131,-81.68,20.4,.12,.22,37,y+12.2);
      for(let z=-102;z<-85;z+=5){box(-131,z,3.5,2.8,1.2,33,y+14.3);for(let j=0;j<8;j++)box(-131,z-1+j*.29,3.2,.05,.03,10,y+15.51);}
      for(let x=-139;x<-122;x+=2.1){box(x,-81.8,.06,.13,4.8,35);box(x,-106.3,.12,.3,14,35);}
      for(let j=0;j<9;j++)box(-131,-81.78,15,.06,.028,35,y+.4+j*.48);
      for(const x of [-141.4,-120.7]){cylinder([x,y+.3,-81.8],[x,y+13.8,-81.8],.075,35,10);for(let j=0;j<7;j++)cylinder([x,y+j*2,-81.8],[x,y+j*2+.08,-81.8],.115,35,10);}

      box(-92,-94,.45,.45,.94,35,y+4.68);
      cylinder([-92,y+5.6,-94],[-92,y+9.7,-94],.055,35,10);for(let j=0;j<4;j++)cylinder([-93,y+7+j*.7,-94],[-91,y+7+j*.7,-94],.026,35,8);

      // Service crates and a receiver pedestal give mission interactions physical anchors.
      box(-115,-83,1.1,.75,.7,35);box(-115,-83,1.16,.80,.10,36,y+.7);for(const x of [-115.4,-114.6])box(x,-83,.045,.85,.78,10);
      obstacles.push({x:-115,z:-83,radius:.65});box(-101,-96,.60,.5,1.0,35);box(-101,-96,.66,.55,.1,36,y+1.0);obstacles.push({x:-101,z:-96,radius:.42});
      for(const [x,z] of [[-137,-78],[-134.5,-78],[-120,-112]]){box(x,z,1.5,1.1,1,33);for(const dx of [-.6,.6])box(x+dx,z,.065,1.16,1.02,35);obstacles.push({x,z,radius:.9});}
      for(let x=-117;x<-107;x+=3){box(x,-85,.06,6,.025,38,y+.026);}box(-112,-88,10,.06,.026,38,y+.026);
      // Pad foundations and black rocket silhouettes with distinct fins, interstages and engine bells.
      function rocket(x,z,r,h,starship){
        cylinder([x,y+.12,z],[x,y+1.1,z],r*2.1,31,48);cylinder([x,y+1.1,z],[x,y+2.5,z],r*1.25,35,32);
        const profile=starship?[[r*.87,2.4],[r,3.0],[r,h*.64],[r*.98,h*.70],[r*.96,h*.83],[r*.80,h*.90],[r*.49,h*.965],[.025,h]]:[[r*.91,2.4],[r,3.2],[r,h*.65],[r*.98,h*.69],[r*.97,h*.79],[r*1.20,h*.81],[r*1.2,h*.90],[r*.84,h*.96],[.018,h]];
        const sides=48;for(let j=0;j<profile.length-1;j++)for(let k=0;k<sides;k++){const a=k/sides*TAU,b=(k+1)/sides*TAU,[ra,ha]=profile[j],[rb,hb]=profile[j+1],point=(r,h,a)=>[x+Math.cos(a)*r,y+h,z+Math.sin(a)*r],n=a=>{const v=[Math.cos(a),-(rb-ra)/(hb-ha),Math.sin(a)],l=Math.hypot(...v);return v.map(q=>q/l);};tri(point(ra,ha,a),point(rb,hb,a),point(ra,ha,b),34,.5,false,[n(a),n(a),n(b)]);tri(point(ra,ha,b),point(rb,hb,a),point(rb,hb,b),34,.5,false,[n(b),n(a),n(b)]);}
        for(const level of starship?[.19,.36,.51,.65]:[.19,.65,.79])cylinder([x,y+h*level,z],[x,y+h*level+.16,z],r*1.012,35,48);
        for(let i=0;i<4;i++){const a=i/4*TAU+.25,dx=Math.cos(a),dz=Math.sin(a),t=[-dz,0,dx];if(starship){for(const level of [.25,.83]){const tall=level<.5?h*.16:h*.09;quad([x+dx*r,y+h*level,z+dz*r],[x+dx*r*2.15,y+h*level-tall*.35,z+dz*r*2.15],[x+dx*r*1.95,y+h*level+tall*.5,z+dz*r*1.95],[x+dx*r,y+h*level+tall,z+dz*r],34);}}
          else{cylinder([x+dx*r,y+8,z+dz*r],[x+dx*r*1.9,y+2,z+dz*r*1.9],.09,35,10);quad([x+dx*r+t[0]*.7,y+h*.60,z+dz*r+t[2]*.7],[x+dx*r*1.9+t[0]*.7,y+h*.60,z+dz*r*1.9+t[2]*.7],[x+dx*r*1.9-t[0]*.7,y+h*.60,z+dz*r*1.9-t[2]*.7],[x+dx*r-t[0]*.7,y+h*.60,z+dz*r-t[2]*.7],35);}
        }
        for(let i=0;i<7;i++){const a=i/6*TAU,rr=i===6?0:r*.62,ex=x+Math.cos(a)*rr,ez=z+Math.sin(a)*rr;const profile=[[r*.23,1.45],[r*.20,1.7],[r*.115,2.25],[r*.09,2.55]];for(let j=0;j<profile.length-1;j++)for(let k=0;k<20;k++){const aa=k/20*TAU,bb=(k+1)/20*TAU,[ra,ha]=profile[j],[rb,hb]=profile[j+1];quad([ex+Math.cos(aa)*ra,y+ha,ez+Math.sin(aa)*ra],[ex+Math.cos(bb)*ra,y+ha,ez+Math.sin(bb)*ra],[ex+Math.cos(bb)*rb,y+hb,ez+Math.sin(bb)*rb],[ex+Math.cos(aa)*rb,y+hb,ez+Math.sin(aa)*rb],35);}cylinder([ex,y+2.5,ez],[ex,y+3.2,ez],r*.095,35,12);}
        for(let i=0;i<4;i++){const a=i/4*TAU+.25,dx=Math.cos(a),dz=Math.sin(a);cylinder([x+dx*r*1.015,y+4,z+dz*r*1.015],[x+dx*r*1.015,y+h*.63,z+dz*r*1.015],.035,35,8);for(const level of starship?[.25,.83]:[.60]){cylinder([x+dx*r*1.04,y+h*level,z+dz*r*1.04],[x+dx*r*1.04,y+h*(level+.045),z+dz*r*1.04],r*.075,35,12);}}
        for(let j=0;j<6;j++){const a=j/6*TAU;box(x+Math.cos(a)*r*.9,z+Math.sin(a)*r*.9,.18,.18,.34,35,y+h*.68);}
        obstacles.push({x,z,radius:r*2.2});occluders.push({x,z,radius:r*2.2,height:h,strength:.8});
      }
      rocket(-110,-120,3.0,69,true);rocket(-90,-120,1.35,43,false);
      function tower(x,z,h){for(const dx of [-2,2])for(const dz of [-2,2])cylinder([x+dx,y,z+dz],[x+dx,y+h,z+dz],.23,35,10);for(let j=0;j<h;j+=6){for(const side of [-2,2]){cylinder([x-2,y+j,z+side],[x+2,y+j+5.8,z+side],.08,35,8);cylinder([x+side,y+j,z-2],[x+side,y+j+5.8,z+2],.08,35,8);}box(x,z,4.8,4.8,.18,35,y+j);}box(x,z,5,5,.5,37,y+h);obstacles.push({x,z,radius:3});}
      tower(-117,-125,66);tower(-97,-125,39);
      // Boarding lift and its illuminated access arm. The approach stays clear for pedestrians.
      for(const x of [-106.3,-103.7]){cylinder([x,y,-114.2],[x,y+57,-114.2],.13,35,12);obstacles.push({x,z:-114.2,radius:.2});}
      for(let level=0;level<57;level+=3){cylinder([-106.3,y+level,-114.2],[-103.7,y+level+2.8,-114.2],.045,35,8);box(-105,-114.25,2.7,.15,.06,37,y+level+.2);}
      box(-105,-113,2.4,2.2,.08,64,y+.05);for(const x of [-106.12,-103.88]){cylinder([x,y+.08,-114.02],[x,y+1.08,-114.02],.04,64,8);cylinder([x,y+1.08,-114.02],[x,y+1.08,-112.05],.04,64,8);}
      box(-105,-113,2.5,2.3,.10,35,y+.03);box(-105,-113,2.7,2.5,.18,35,y+54);
      box(-107.4,-116.1,2.1,6.2,.18,35,y+54);box(-107.4,-116.1,2.25,6.3,.10,35,y+56.7);
      for(const x of [-108.5,-106.3])for(let z=-118.7;z<-113;z+=1.2){cylinder([x,y+54,z],[x,y+56.7,z],.045,35,8);cylinder([x,y+55,z],[x,y+55,z+1.2],.04,35,8);}
      box(-105,-114.4,1.55,.12,.65,36,y+1.4);box(-105,-114.5,2.5,.25,.14,37,y+3);
      // A compact flight deck inside the tall ship. Material IDs 60–63 stay hidden from outside.
      const cy=ground(-110,-120)+54,cx=-110,cz=-120;
      cylinder([cx,cy-.14,cz],[cx,cy,cz],2.68,61,48);
      cylinder([cx,cy+3.1,cz],[cx,cy+3.23,cz],2.65,60,48);
      for(let i=0;i<48;i++){const a=i/48*TAU,b=(i+1)/48*TAU;
        const p=(r,h,t)=>[cx+Math.cos(t)*r,cy+h,cz+Math.sin(t)*r];
        if(Math.sin((a+b)/2)<.52){quad(p(2.62,0,a),p(2.62,3.1,a),p(2.62,3.1,b),p(2.62,0,b),60);}
        else{quad(p(2.62,0,a),p(2.62,.82,a),p(2.62,.82,b),p(2.62,0,b),60);quad(p(2.62,2.6,a),p(2.62,3.1,a),p(2.62,3.1,b),p(2.62,2.6,b),60);}
        if(i%6===0){cylinder(p(2.57,0,a),p(2.57,3.1,a),.05,61,8);cylinder(p(2.50,2.91,a),p(2.50,2.91,b+.10),.021,63,8);}
      }
      // Panoramic windshield mullions and a low console leave a clear view of the valley.
      for(const x of [-111.9,-110,-108.1])cylinder([x,cy+.75,-118.12],[x,cy+2.72,-118.12],.035,61,8);
      box(-110,-118.25,3.4,.58,.73,61,cy);quad([-111.65,cy+.76,-118.60],[-108.35,cy+.76,-118.60],[-108.35,cy+1.05,-118.04],[-111.65,cy+1.05,-118.04],62);
      for(let i=0;i<9;i++)box(-111.36+i*.34,-118.58,.07,.10,.023,i%3===0?63:60,cy+.78);
      for(const x of [-111.2,-108.8]){
        box(x,-120.4,.64,.76,.17,61,cy+.43);box(x,-120.78,.64,.14,.90,61,cy+.50);box(x,-120.78,.34,.20,.23,60,cy+1.28);
        for(const dx of [-.23,.23]){box(x+dx,-120.67,.052,.10,.67,60,cy+.59);cylinder([x+dx,cy+.1,-120.62],[x+dx,cy+.46,-120.25],.04,60,8);}
        box(x,-120.61,.12,.13,.08,63,cy+.61);
      }
      for(const x of [-112.15,-107.85]){box(x,-120.2,.20,1.45,1.8,60,cy+.2);box(x+(x<-110?.12:-.12),-120.2,.02,.8,.45,62,cy+1.1);}
      for(let z=-121.7;z<-118.8;z+=.3)box(-110,z,.03,.16,.006,63,cy+.004);
      // Service equipment, cooling racks and apron beacons give the campus depth at night.
      for(const [x,z] of [[-136,-110],[-131,-110],[-84,-105]]){box(x,z,2.7,1.65,1.7,33);for(let i=0;i<9;i++)box(x-1.14+i*.28,z+.85,.11,.045,1.1,35,y+.3);box(x,z,2.8,1.75,.10,35,y+1.7);obstacles.push({x,z,radius:1.55});}
      for(let i=0;i<12;i++){const x=-139+i*5;box(x,-75,.35,.35,.32,35);box(x,-75,.23,.23,.04,37,y+.32);}
      for(const level of [41,54]){cylinder([-117,y+level,-123],[-110,y+level,-119],.21,35,10);cylinder([-117,y+level+1.1,-123],[-110,y+level+1.1,-119],.16,35,10);}
      // Tank farm, pipe runs, guardrails, and site lights give the campus a useful scale.
      for(let i=0;i<4;i++){const x=-138+i*5.2,z=-124;cylinder([x,y+.1,z],[x,y+7.2,z],1.75,35,32);cylinder([x,y+7.2,z],[x,y+7.45,z],1.9,35,32);obstacles.push({x,z,radius:1.9});}
      cylinder([-139,y+.45,-118],[-109,y+.45,-118],.13,35,12);
      for(const [x,z] of [[-143,-79],[-119,-79],[-79,-81],[-79,-107],[-143,-109],[-110,-137]]){cylinder([x,y,z],[x,y+7.5,z],.10,35,12);box(x,z,1.2,.5,.22,37,y+7.5);obstacles.push({x,z,radius:.18});}
      for(let x=-143;x<-79;x+=4){for(const z of [-139]){cylinder([x,y,z],[x,y+1.1,z],.045,35,8);cylinder([x,y+.8,z],[x+4,y+.8,z],.035,35,8);}}
      for(let i=0;i<4;i++)box(-107+i*2.4,-84,1.5,.08,.03,38,y+.024);
    }
    // Soft baked contact and long, low-contrast twilight shadows anchor objects.
    const shadeSize=1024,shade=new Uint8Array(shadeSize*shadeSize);shade.fill(255);const px=shadeSize/660;
    for(const o of occluders){
      const cx=(o.x+330)*px,cz=(o.z+330)*px,r=(o.radius+.5)*px,length=o.height*1.2*px;
      const span=Math.ceil(r*2+length),minX=Math.max(0,Math.floor(cx-span)),maxX=Math.min(shadeSize-1,Math.ceil(cx+span));
      const minZ=Math.max(0,Math.floor(cz-span)),maxZ=Math.min(shadeSize-1,Math.ceil(cz+span));
      for(let z=minZ;z<=maxZ;z++)for(let x=minX;x<=maxX;x++){
        const dx=x-cx,dz=z-cz,contact=Math.exp(-(dx*dx+dz*dz)/(r*r*.75))*o.strength;
        const along=dx*-.3+dz*.954,across=dx*.954+dz*.3;
        const cast=along>0&&along<length?Math.exp(-across*across/(r*r*.55))*(1-along/length)*.24:0;
        const value=Math.round(255*(1-Math.max(contact,cast)));const index=z*shadeSize+x;shade[index]=Math.min(shade[index],value);
      }
    }
    const trail=bakeTrailMap();return {vertices:new Float32Array(data),obstacles,shade,shadeSize,trailMask:trail.mask,trailSize:trail.size};
  }
  function create(host,onFailure,onReady) {
    const canvas=document.createElement('canvas');canvas.id='u-desert';canvas.setAttribute('aria-hidden','true');
    const gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});
    if(!gl)return null;gl.getExtension('OES_standard_derivatives');
    let alive=true,currentZoom=1,currentShot=null,ready=false,worker=null;const state=camera(),camp={fireOn:true,lanternOn:true,tentOpen:true,night:true,flashlightOn:true,redLight:false,hands:true,satellitesOn:true,binoculars:false,fireBoost:0,ufoAwake:false,campusLights:true,scanner:false,scannerStrength:0,scanProgress:0,artifactInstalled:false};let time=4,onFoot=false,handVisible=true,swayEnabled=true;
    const Life=window.ParallaxLife,life=Life?.create(),Rocket=window.ParallaxRocket,flight=Rocket?.create();const lifeBuffers=new Map();
    function program(v,f){const p=gl.createProgram();for(const [type,src] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);gl.deleteShader(s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
    try{
      const sky=program(skyVertex,skyFragment),mesh=program(meshVertex,meshFragment),fire=program(fireVertex,fireFragment),embers=program(emberVertex,emberFragment),hand=program(handVertex,meshFragment);let world={vertices:new Float32Array(0),obstacles:[]};

      const skyBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const meshBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,meshBuffer);gl.bufferData(gl.ARRAY_BUFFER,world.vertices,gl.STATIC_DRAW);
      const info=p=>({p,position:gl.getAttribLocation(p,'position'),normal:gl.getAttribLocation(p,'normal'),material:gl.getAttribLocation(p,'material'),uniform:Object.fromEntries(['eye','right','up','forward','aspect','lens','time','fireOn','lanternOn','tentOpen','firePosition','lanternPosition','night','flashlightOn','redLight','flashlightPosition','flashlightDirection','handSway','pixelAngle','satellitesOn','fireBoost','ufoAwake','campusLights','objectMode','objectOrigin','objectPose','roverShadowA','roverShadowB','cabinMode','liftMode','launchHeight','scannerStrength','scanProgress','artifactInstalled'].map(n=>[n,gl.getUniformLocation(p,n)]))});
      const skyInfo=info(sky),meshInfo=info(mesh),fireInfo=info(fire),emberInfo=info(embers),handInfo=info(hand);
      const scannerVertices=handGeometry(true),scannerBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,scannerBuffer);gl.bufferData(gl.ARRAY_BUFFER,scannerVertices,gl.STATIC_DRAW);
      const handVertices=handGeometry(),handBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,handBuffer);gl.bufferData(gl.ARRAY_BUFFER,handVertices,gl.STATIC_DRAW);
      const emberBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,emberBuffer);gl.bufferData(gl.ARRAY_BUFFER,Float32Array.from({length:28},(_,i)=>i),gl.STATIC_DRAW);host.append(canvas);
      const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([100,83,65,255]));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      const textureFlag=gl.getUniformLocation(mesh,'textured');gl.useProgram(mesh);gl.uniform1i(gl.getUniformLocation(mesh,'groundMap'),0);gl.uniform1f(textureFlag,0);
      const panoramaTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,panoramaTexture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([20,28,42,255]));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      const shadeTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,shadeTexture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,1,1,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,new Uint8Array([255]));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.useProgram(mesh);gl.uniform1i(gl.getUniformLocation(mesh,'shadeMap'),2);
      for(const p of [sky,mesh,hand]){gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'panoramaMap'),1);gl.uniform1f(gl.getUniformLocation(p,'panoramaReady'),0);}
      const panoramaImage=new Image();panoramaImage.onload=()=>{
        if(!alive)return;const tile=document.createElement('canvas');tile.width=Math.min(4096,gl.getParameter(gl.MAX_TEXTURE_SIZE),Math.pow(2,Math.ceil(Math.log2(panoramaImage.width))));tile.height=tile.width/2;tile.getContext('2d').drawImage(panoramaImage,0,0,tile.width,tile.height);
        gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,panoramaTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        for(const p of [sky,mesh,hand]){gl.useProgram(p);gl.uniform1f(gl.getUniformLocation(p,'panoramaReady'),1);}if(canvas.closest('dialog')?.open)render(currentZoom,currentShot);
      };panoramaImage.src='/assets/desert-twilight-panorama.png';
      const nightTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,nightTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([3,5,10,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      for(const p of [sky,mesh,hand]){gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'nightMap'),5);gl.uniform1f(gl.getUniformLocation(p,'nightReady'),0);}
      const nightImage=new Image();nightImage.onload=()=>{if(!alive)return;const tile=document.createElement('canvas');tile.width=Math.min(4096,gl.getParameter(gl.MAX_TEXTURE_SIZE),Math.pow(2,Math.ceil(Math.log2(nightImage.width))));tile.height=tile.width/2;tile.getContext('2d').drawImage(nightImage,0,0,tile.width,tile.height);gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,nightTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);for(const p of [sky,mesh,hand]){gl.useProgram(p);gl.uniform1f(gl.getUniformLocation(p,'nightReady'),1);}if(canvas.closest('dialog')?.open)render(currentZoom,currentShot);};nightImage.src='/assets/eso-milkyway.jpg';
      const plantTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,plantTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.useProgram(mesh);gl.uniform1i(gl.getUniformLocation(mesh,'plantMap'),3);gl.uniform1f(gl.getUniformLocation(mesh,'plantReady'),0);
      const plantImage=new Image();plantImage.onload=()=>{
        if(!alive)return;const tile=document.createElement('canvas');tile.width=tile.height=1024;tile.getContext('2d').drawImage(plantImage,0,0,1024,1024);
        gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,plantTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        gl.useProgram(mesh);gl.uniform1f(gl.getUniformLocation(mesh,'plantReady'),1);if(canvas.closest('dialog')?.open)render(currentZoom,currentShot);
      };plantImage.src='/assets/desert-creosote.png';
      const clothTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,clothTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([170,145,105,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.useProgram(mesh);gl.uniform1i(gl.getUniformLocation(mesh,'clothMap'),4);
      const clothAtlas=document.createElement('canvas');clothAtlas.width=2048;clothAtlas.height=2048;const atlasCtx=clothAtlas.getContext('2d');atlasCtx.fillStyle='#aa9169';atlasCtx.fillRect(0,0,1024,2048);
      function uploadAtlas(){if(!alive)return;gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,clothTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,clothAtlas);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);if(canvas.closest('dialog')?.open)render(currentZoom,currentShot);}
      function paintSign(logo){atlasCtx.save();atlasCtx.translate(1024,0);atlasCtx.fillStyle='#091119';atlasCtx.fillRect(0,0,1024,2048);atlasCtx.scale(1,1.5);atlasCtx.strokeStyle='#758590';atlasCtx.lineWidth=2;atlasCtx.strokeRect(12,12,1000,317);atlasCtx.fillStyle='#e5edf2';if(logo){atlasCtx.filter='invert(1)';atlasCtx.drawImage(logo,72,61,880,110);atlasCtx.filter='none';}else{atlasCtx.font='italic 110px sans-serif';atlasCtx.fillText('SPACEX',100,156);}atlasCtx.font='27px monospace';atlasCtx.fillText('DESERT LAUNCH CAMPUS',188,238);atlasCtx.fillStyle='#94aab6';atlasCtx.font='18px monospace';atlasCtx.fillText('PARALLAX / FAN-BUILT EXPERIENCE',183,282);atlasCtx.restore();atlasCtx.fillStyle='#091b25';atlasCtx.fillRect(1024,600,1024,220);atlasCtx.fillStyle='#b8fff0';atlasCtx.font='bold 66px sans-serif';atlasCtx.fillText('RESEARCH LAB',1110,698);atlasCtx.font='29px monospace';atlasCtx.fillText('PARALLAX / FIELD SCIENCE',1120,763);uploadAtlas();}
      const clothImage=new Image();clothImage.onload=()=>{atlasCtx.drawImage(clothImage,0,0,1024,1024);uploadAtlas();};clothImage.src='/assets/camp-canvas.png';const barkImage=new Image();barkImage.onload=()=>{atlasCtx.drawImage(barkImage,0,1024,1024,1024);uploadAtlas();};barkImage.src='/assets/log-bark.jpg';paintSign();const logoImage=new Image();logoImage.onload=()=>paintSign(logoImage);logoImage.src='/assets/spacex-logo.svg';
      const groundImage=new Image();groundImage.onload=()=>{
        if(!alive)return;const tile=document.createElement('canvas');tile.width=tile.height=2048;tile.getContext('2d').drawImage(groundImage,0,0,2048,2048);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile);gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');if(anisotropy)gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        gl.useProgram(mesh);gl.uniform1f(textureFlag,1);if(canvas.closest('dialog')?.open)render(currentZoom,currentShot);
      };groundImage.src='/assets/gravelly-sand-diff.jpg';
      const normalTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,normalTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,255,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      for(const p of [mesh,hand]){gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'groundNormal'),6);}
      const normalImage=new Image();normalImage.onload=()=>{if(!alive)return;gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,normalTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,normalImage);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);const ext=gl.getExtension('EXT_texture_filter_anisotropic');if(ext)gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));if(canvas.closest('dialog')?.open)render(currentZoom,currentShot);};normalImage.src='/assets/gravelly-sand-nor_gl.jpg';
      const trailTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,trailTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,1,1,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,new Uint8Array([0]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);for(const p of [mesh,hand]){gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'trailMap'),7);}
      gl.useProgram(hand);for(const [name,unit] of [['groundMap',0],['panoramaMap',1],['shadeMap',2],['plantMap',3],['clothMap',4],['nightMap',5]])gl.uniform1i(gl.getUniformLocation(hand,name),unit);gl.uniform1f(gl.getUniformLocation(hand,'textured'),1);
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();alive=false;worker?.terminate();canvas.remove();onFailure?.();});
      function acceptWorld(result){if(!alive)return;world=result;gl.bindBuffer(gl.ARRAY_BUFFER,meshBuffer);gl.bufferData(gl.ARRAY_BUFFER,world.vertices,gl.STATIC_DRAW);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,shadeTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,world.shadeSize,world.shadeSize,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,world.shade);gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,trailTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,world.trailSize,world.trailSize,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,world.trailMask);ready=true;worker?.terminate();worker=null;onReady?.();}
      // Construct geometry off the UI thread; keep the landscape visible while it loads.
      try{worker=new Worker('/desert-world.js?v=135');worker.onmessage=e=>acceptWorld(e.data);worker.onerror=()=>{worker.terminate();worker=null;setTimeout(()=>acceptWorld(geometry()),0)};worker.postMessage({build:true});}
      catch{setTimeout(()=>acceptWorld(geometry()),0)}
      function cameraEye(){
        const base=[state.x,walkingGround(state.x,state.z)+(state.seated?1.03:1.72)+(state.jumpHeight||0),state.z];if(flight&&flight.mode!=='ground'){base[1]=ground(-110,-120)+(flight.mode==='lift'?flight.rise:54+flight.rise)+1.62;return base;}if(!life?.driving)return base;
        // A chase camera retreats only as far as the clear space behind the vehicle.
        const sy=Math.sin(state.yaw),cy=Math.cos(state.yaw);let retreat=7.2;
        for(let d=1;d<=7.2;d+=.3){const x=state.x-sy*d,z=state.z+cy*d;if(world.obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.radius+.35)){retreat=Math.max(.5,d-.5);break;}}
        const x=state.x-sy*retreat,z=state.z+cy*retreat;return [x,Math.max(base[1]+2.3,ground(x,z)+1.4),z];
      }
      function render(zoom=1,shot=null){
        if(!alive||!ready)return;currentZoom=zoom;currentShot=shot;
        const ratio=Math.min(devicePixelRatio||1,innerWidth<700?1.25:1.5,Math.sqrt(2400000/(innerWidth*innerHeight))),w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        gl.viewport(0,0,w,h);gl.clearColor(.015,.025,.05,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        const view=shot||state;
        const sy=Math.sin(view.yaw),cy=Math.cos(view.yaw),sp=Math.sin(view.pitch),cp=Math.cos(view.pitch);
        const eye=shot?shot.eye:cameraEye(),right=[cy,0,sy],up=[-sy*sp,cp,cy*sp],forward=[sy*cp,sp,-cy*cp];
        const lens=viewLens(zoom,!shot&&camp.binoculars);
        const sway=!shot&&swayEnabled&&onFoot?[Math.sin(state.distance*3.7)*.008,Math.cos(state.distance*7.4)*.006]:[0,0];
        let flashlightPosition=eye.map((v,i)=>v+right[i]*(.263+sway[0]-Math.max(0,1-w/h)*.33)+up[i]*(-.24+sway[1])+forward[i]*.89);
        let flashlightDirection=forward.map((v,i)=>v*.990+up[i]*.05+right[i]*-.129),fl=Math.hypot(...flashlightDirection);for(let i=0;i<3;i++)flashlightDirection[i]/=fl;
        if(life?.driving){const v=Life.active(life);flashlightPosition=[v.x+Math.sin(v.yaw)*2.8,ground(v.x,v.z)+.9,v.z-Math.cos(v.yaw)*2.8];flashlightDirection=[Math.sin(v.yaw),-.035,-Math.cos(v.yaw)];}
        function uniforms(i){gl.useProgram(i.p);gl.uniform1f(i.uniform.scannerStrength,camp.scannerStrength||0);gl.uniform1f(i.uniform.scanProgress,camp.scanProgress||0);gl.uniform1f(i.uniform.artifactInstalled,Number(!!camp.artifactInstalled));gl.uniform1f(i.uniform.liftMode,Number(!shot&&flight?.mode==='lift'));gl.uniform1f(i.uniform.cabinMode,Number(!shot&&flight&&['cabin','launch','orbit'].includes(flight.mode)));gl.uniform1f(i.uniform.launchHeight,shot?0:flight?.rise||0);if(life)life.vehicles.forEach((v,j)=>gl.uniform4f(i.uniform[j===0?"roverShadowA":"roverShadowB"],v.x,v.z,Math.sin(v.yaw),Math.cos(v.yaw)));gl.uniform3fv(i.uniform.eye,eye);gl.uniform3fv(i.uniform.right,right);gl.uniform3fv(i.uniform.up,up);gl.uniform3fv(i.uniform.forward,forward);gl.uniform1f(i.uniform.aspect,w/h);gl.uniform1f(i.uniform.lens,lens);gl.uniform1f(i.uniform.night,Number(!!shot||camp.night));gl.uniform1f(i.uniform.time,time);gl.uniform1f(i.uniform.pixelAngle,2*lens/h);gl.uniform1f(i.uniform.satellitesOn,Number(!!shot||camp.satellitesOn));gl.uniform2fv(i.uniform.handSway,sway);gl.uniform1f(i.uniform.flashlightOn,Number(!shot&&(!flight||flight.mode==='ground')&&onFoot&&(life?.driving||camp.hands&&camp.flashlightOn&&!camp.binoculars&&!camp.scanner)));gl.uniform1f(i.uniform.redLight,Number(!life?.driving&&camp.redLight));gl.uniform3fv(i.uniform.flashlightPosition,flashlightPosition);gl.uniform3fv(i.uniform.flashlightDirection,flashlightDirection);gl.uniform1f(i.uniform.fireOn,Number(!!shot||camp.fireOn));gl.uniform1f(i.uniform.fireBoost,camp.fireBoost);gl.uniform1f(i.uniform.ufoAwake,Number(shot?shot.signal:camp.ufoAwake));gl.uniform1f(i.uniform.campusLights,Number(!!shot||camp.campusLights));gl.uniform1f(i.uniform.lanternOn,Number(!!shot||camp.lanternOn));gl.uniform1f(i.uniform.tentOpen,Number(camp.tentOpen));gl.uniform3fv(i.uniform.firePosition,CAMP.fire);gl.uniform3fv(i.uniform.lanternPosition,[-4.25,CAMP.tent[1]+.47,-9.22]);}
        gl.disable(gl.DEPTH_TEST);uniforms(skyInfo);gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);
        for(let i=0;i<3;i++)gl.disableVertexAttribArray(i);
        gl.enableVertexAttribArray(skyInfo.position);gl.vertexAttribPointer(skyInfo.position,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);
        gl.enable(gl.DEPTH_TEST);uniforms(meshInfo);gl.uniform1f(meshInfo.uniform.objectMode,0);gl.bindBuffer(gl.ARRAY_BUFFER,meshBuffer);
        for(const [loc,size,offset]of [[meshInfo.position,3,0],[meshInfo.normal,3,12],[meshInfo.material,2,24]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,32,offset);}
        gl.drawArrays(gl.TRIANGLES,0,world.vertices.length/8);
        if(life){gl.uniform1f(meshInfo.uniform.objectMode,1);for(const model of Life.models(life,ground)){
          let buffer=lifeBuffers.get(model.key);if(!buffer){buffer=gl.createBuffer();lifeBuffers.set(model.key,buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,model.vertices,gl.STATIC_DRAW);}else gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
          gl.uniform3f(meshInfo.uniform.objectOrigin,model.x,model.y,model.z);gl.uniform4f(meshInfo.uniform.objectPose,Math.cos(model.yaw),Math.sin(model.yaw),model.sx,model.sz);
          for(const [loc,size,offset]of [[meshInfo.position,3,0],[meshInfo.normal,3,12],[meshInfo.material,2,24]])gl.vertexAttribPointer(loc,size,gl.FLOAT,false,32,offset);gl.drawArrays(gl.TRIANGLES,0,model.vertices.length/8);
        }gl.uniform1f(meshInfo.uniform.objectMode,0);}
        if((shot||camp.fireOn)&&Math.hypot(eye[0],eye[2]+8)<100){
          gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
          uniforms(fireInfo);gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);for(let i=0;i<3;i++)gl.disableVertexAttribArray(i);gl.enableVertexAttribArray(fireInfo.position);gl.vertexAttribPointer(fireInfo.position,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);
          uniforms(emberInfo);gl.bindBuffer(gl.ARRAY_BUFFER,emberBuffer);for(let i=0;i<3;i++)gl.disableVertexAttribArray(i);gl.enableVertexAttribArray(emberInfo.position);gl.vertexAttribPointer(emberInfo.position,1,gl.FLOAT,false,0,0);gl.drawArrays(gl.POINTS,0,28);
          gl.depthMask(true);gl.disable(gl.BLEND);
        }
        if(!shot&&(!flight||flight.mode==='ground')&&onFoot&&!life?.driving&&camp.hands&&handVisible&&!camp.binoculars){gl.clear(gl.DEPTH_BUFFER_BIT);uniforms(handInfo);gl.bindBuffer(gl.ARRAY_BUFFER,camp.scanner?scannerBuffer:handBuffer);for(const [loc,size,offset] of [[handInfo.position,3,0],[handInfo.normal,3,12],[handInfo.material,2,24]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,32,offset);}gl.drawArrays(gl.TRIANGLES,0,(camp.scanner?scannerVertices:handVertices).length/8);}
      }
      return {canvas,state,camp,life,flight,points:CAMP,boarding:BOARDING,
        boardRocket(){if(!Rocket||!Rocket.board(flight,state,life?.driving))return false;resetJump(state);camp.binoculars=false;Object.assign(state,{x:BOARDING.x,z:BOARDING.z,yaw:2.20,pitch:-.10,seated:false});return true;},
        launchRocket(planet){return !!Rocket?.launch(flight,planet);},
        exitRocket(){if(flight)Rocket.exit(flight);Object.assign(state,{x:BOARDING.x,z:BOARDING.z+2,yaw:Math.PI,pitch:.03,seated:false});render();},
        flightTick(dt){if(!flight)return false;const old=flight.mode,moved=Rocket.tick(flight,dt);if(old==='lift'&&flight.mode==='cabin')Object.assign(state,{x:-110,z:-121.7,yaw:Math.PI,pitch:-.05,seated:false});return moved;},
        riverLevel(){const distance=riverDistance(state.x,state.z);return Math.max(0,1-distance/24)*.5;},
        get driving(){return life?.driving||null;},get speed(){return life?Life.active(life)?.speed||0:0;},
        nearestRover(){return life?Life.nearestVehicle(life,state):null;},
        enterRover(id){if(flight&&flight.mode!=='ground')return false;if(!life||!Life.enter(life,state,id))return false;resetJump(state);camp.binoculars=false;render(currentZoom,currentShot);return true;},
        exitRover(){const ok=life&&Life.exit(life,state,world.obstacles);if(ok)render(currentZoom,currentShot);return ok;},
        brake(){if(life)Life.brake(life);},
        recallRovers(){if(flight)Rocket.exit(flight);if(!life)return;life.driving=null;for(let i=0;i<life.vehicles.length;i++)Object.assign(life.vehicles[i],Life.SPAWNS[i],{speed:0,wheel:0,steer:0});Object.assign(state,camera());render(currentZoom,currentShot);},trail:TRAIL,paths:PATHS,routeTo:place=>trailRoute(state,place),terrainHeight:walkingGround,render,
        setWalking(value){onFoot=value;if(!value){resetJump(state);camp.binoculars=false;if(life)Life.brake(life);}},setHandVisible(value){handVisible=value;},setMotion(value){swayEnabled=value;},
        jump(){return ready&&onFoot&&!life?.driving&&(!flight||flight.mode==='ground')&&jump(state);},
        jumpTick(dt){return jumpTick(state,dt);},
        satellitePoints(){return [0,1,2].map(i=>satelliteDirection(time,i).map((v,j)=>v*1000+(j===0?state.x:j===1?ground(state.x,state.z)+1.72:state.z)));},
        watchSky(){camp.night=true;state.yaw=0;state.pitch=.61;render(currentZoom,currentShot);},
        setCamp(patch){Object.assign(camp,patch);render(currentZoom,currentShot);},
        stoke(){camp.fireOn=true;camp.fireBoost=1;render(currentZoom,currentShot);},
        tick(dt){const step=Math.min(Math.max(0,dt),.1);time+=step;if(life)Life.crewTick(life,step,state);camp.fireBoost=Math.max(0,camp.fireBoost-step/18);return !!life||camp.satellitesOn||camp.fireOn&&Math.hypot(state.x,state.z+8)<75;},
        project(point){const sy=Math.sin(state.yaw),cy=Math.cos(state.yaw),sp=Math.sin(state.pitch),cp=Math.cos(state.pitch),eye=cameraEye(),p=point.map((v,i)=>v-eye[i]);const d=p[0]*sy*cp+p[1]*sp-p[2]*cy*cp,lens=viewLens(currentZoom,camp.binoculars);return {x:innerWidth/2+(p[0]*cy+p[2]*sy)/d/lens*innerHeight/2,y:innerHeight/2-(-p[0]*sy*sp+p[1]*cp+p[2]*cy*sp)/d/lens*innerHeight/2,depth:d,distance:Math.hypot(...p)};},
        visit(place){resetJump(state);if(flight)Rocket.exit(flight);if(life){Life.brake(life);life.driving=null;}const positions={fire:[0,-5.15,0,-.14],tent:[-4.5,-6.25,0,.03],telescope:[3.5,-10.6,0,.13],camp:[0,-2.8,0,.025]};const p=positions[place]||positions.camp;Object.assign(state,{x:p[0],z:p[1],yaw:p[2],pitch:p[3],edge:false,seated:place==='fire'});render(currentZoom,currentShot);},
        get ready(){return ready;},
        look(dx,dy){state.yaw=(state.yaw-dx*(camp.binoculars?.0012:.0035))%TAU;state.pitch=clamp(state.pitch+dy*(camp.binoculars?.001:.003),-1.4,1.4);},
        turn(yaw,pitch){state.yaw=(state.yaw+yaw)%TAU;state.pitch=clamp(state.pitch+pitch,-1.4,1.4);},
        move:(forward,side,dt,fast)=>ready&&(flight&&flight.mode!=='ground'?(flight.mode==='cabin'&&Rocket.cabinMove(state,forward,side,dt)):life?.driving?Life.drive(life,state,forward,side,dt,world.obstacles,walkingGround):move(state,forward,side,dt,fast,life?world.obstacles.concat(life.vehicles.flatMap(v=>Life.circles(v,.98)),life.crew.map(p=>({x:p.x,z:p.z,radius:.28}))):world.obstacles)),
        reset(){if(flight)Rocket.exit(flight);if(life){Life.brake(life);life.driving=null;}Object.assign(state,camera());}
      };
    }catch(error){canvas.remove();gl.getExtension('WEBGL_lose_context')?.loseContext();console.warn('Desert view unavailable:',error.message);return null;}
  }
  if(typeof window!=='undefined')window.ParallaxDesert={create};
  else if(typeof self!=='undefined')self.onmessage=()=>{const world=geometry();self.postMessage(world,[world.vertices.buffer,world.shade.buffer,world.trailMask.buffer]);};
  // Pure movement and terrain helpers also support non-browser regression checks.
  if(typeof module!=='undefined'&&module.exports)module.exports={RIVER,BOARDING,riverX,riverWidth,riverDistance,waterHeight,walkingGround,onBridge,canWalk,CAMPUS,CRASH,PATHS,ROUTES,LOGS,trailRoute,pathClearance,bakeTrailMap,viewLens,ground,height,move,camera,jump,jumpTick,resetJump,geometry,handGeometry,CAMP,TRAIL,satelliteDirection,shaders:{skyVertex,skyFragment,meshVertex,meshFragment,fireVertex,fireFragment,emberVertex,emberFragment,handVertex}};
})();
