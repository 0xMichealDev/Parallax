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
    return (noise(x * .014 + 3, z * .014 + 7) - .5) * 6 +
      (noise(x * .047, z * .047) - .5) * 1.5 + (noise(x * .16, z * .16) - .5) * .3 - .4 * Math.exp(-Math.pow((x-Math.sin(z*.014)*11)/7,2));
  }
  const CAMPUS={x:-111,z:-106,width:68,depth:66};
  function height(x,z){const t=clamp((Math.hypot(x,z+10)-7)/6,0,1),desert=naturalHeight(0,-10)+(naturalHeight(x,z)-naturalHeight(0,-10))*t*t*(3-2*t);const edge=Math.max(Math.abs(x-CAMPUS.x)-CAMPUS.width/2,Math.abs(z-CAMPUS.z)-CAMPUS.depth/2),blend=clamp(edge/9,0,1);return naturalHeight(CAMPUS.x,CAMPUS.z)+(desert-naturalHeight(CAMPUS.x,CAMPUS.z))*blend*blend*(3-2*blend);}

  const CAMP={fire:[0,ground(0,-8),-8],tent:[-4.5,ground(-4.5,-10.5),-10.5],telescope:[3.5,ground(3.5,-13),-13]};
  const TRAIL=[
    {id:'overlook',name:'Quiet overlook',x:-21,z:-28,note:'The lantern cairn marks a quiet place away from the campfire. Turn toward the open sky and follow the Milky Way above the ridgeline.'},
    {id:'meteorite',name:'Meteorite field study',x:19,z:-26,note:'An imagined meteorite specimen rests beside a small survey marker. Walk around its dark, pitted surface and try the flashlight from different angles.'},
    {id:'station',name:'Remote survey station',x:26,z:8,note:'A small solar-powered field station watches over the valley. From here, the fire becomes a warm point of light guiding you back to camp.'},
    {id:'arch',name:'Sandstone arch',x:-47,z:-48,note:'A worn sandstone arch frames the stars. The western trail passes beneath it before climbing toward the launch campus.'},
    {id:'wash',name:'Dry creek crossing',x:40,z:22,note:'Rounded stones trace a shallow desert wash. The eastern loop follows this quiet crossing back past the survey station.'},
    {id:'campus',name:'SpaceX launch campus',x:-104,z:-92,note:'A fan-built desert launch campus, with a SpaceX sign, a Starship-inspired display, and a Falcon-style rocket in custom black finishes. Follow the forecourt between the hangar, tanks and launch towers. This fictional scene is not an official SpaceX location.'},
    {id:'crash',name:'The silent visitor',x:58,z:-61,hidden:true,note:'A half-buried craft lies beyond the broken trail. Scorched soil, torn alloy, and an instrument that still answers. PARALLAX field record: origin unknown. A fictional Easter egg.'}
  ];
  const CRASH={x:65,z:-69,radius:5.8};
  const PATHS=[
    {id:'camp',name:'Camp junction',width:1.9,points:[[-7,-3],[-4,-1],[0,0],[6,-3]]},
    {id:'west',name:'Western ridge trail',width:3.4,points:[[-7,-3],[-10,-12],[-15,-21],[-21,-25],[-27,-34],[-38,-40],[-47,-48]]},
    {id:'rover-road',name:'Rover service road',width:4.8,points:[[12,-4],[6,-3],[0,0],[-7,-3],[-15,-8],[-23,-16],[-32,-29],[-45,-39],[-47,-43],[-47,-48],[-48,-54]]},
    {id:'east',name:'Meteorite trail',width:1.8,points:[[6,-3],[9,-11],[13,-18],[15,-25],[18,-31],[24,-34],[34,-39],[45,-45]]},
    {id:'wash',name:'Creek loop',width:1.9,points:[[6,-3],[15,0],[24,3],[30,7],[34,18],[40,22]]},
    {id:'loop',name:'Eastern return',width:1.65,points:[[40,22],[46,11],[42,-3],[29,-14],[15,-25]]},
    {id:'launch-road',name:'Launch campus access road',width:3.4,points:[[-47,-48],[-48,-54],[-59,-58],[-70,-64],[-82,-76],[-95,-84],[-104,-92],[-104,-103]]},
    {id:'campus-loop',name:'Launch forecourt',width:4.2,points:[[-104,-92],[-117,-92],[-117,-109],[-105,-110],[-97,-109],[-97,-96],[-104,-92]]},
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
  function camera() { return { x: 0, z: 0, yaw: 0, pitch: .025, distance: 0, edge: false, seated: false }; }
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
    uniform float aspect; uniform float lens;
    uniform float objectMode;uniform vec3 objectOrigin;uniform vec4 objectPose;
    varying vec3 point; varying vec3 norm; varying vec2 kind;
    void main(){point=position;norm=normal;kind=material;
      if(objectMode>.5){point=vec3(position.x*objectPose.x-position.z*objectPose.y,position.y,position.x*objectPose.y+position.z*objectPose.x);point.y+=point.x*objectPose.z+point.z*objectPose.w;point+=objectOrigin;norm=vec3(normal.x*objectPose.x-normal.z*objectPose.y,normal.y,normal.x*objectPose.y+normal.z*objectPose.x);norm.x-=objectPose.z*norm.y;norm.z-=objectPose.w*norm.y;norm=normalize(norm);}
      vec3 p=point-eye;float depth=dot(p,forward);
      gl_Position=vec4(dot(p,right)/(aspect*lens),dot(p,up)/lens,1.000025*depth-.10000125,depth);}
  `;
  const meshFragment = `#extension GL_OES_standard_derivatives : enable\n` + common + `
    varying vec3 point; varying vec3 norm; varying vec2 kind;
    uniform float flashlightOn,redLight,fireBoost,ufoAwake,campusLights;uniform vec3 flashlightPosition,flashlightDirection;
    uniform sampler2D clothMap; uniform float time; uniform float fireOn; uniform float lanternOn; uniform float tentOpen; uniform vec3 firePosition; uniform vec3 lanternPosition;
    uniform sampler2D trailMap; uniform sampler2D groundNormal; uniform sampler2D groundMap; uniform sampler2D shadeMap; uniform sampler2D plantMap; uniform float plantReady; uniform float textured;
    ${woodCoordinates}
    vec3 groundSample(vec2 p){return texture2D(groundMap,p).rgb;}
    float flashlight(vec3 point){vec3 p=point-flashlightPosition;float distance=length(p),angle=dot(normalize(p),flashlightDirection);return flashlightOn*smoothstep(.885,.965,angle)*(1.-smoothstep(23.,40.,distance))*5.5/(1.+distance*distance*.07);}
    void main(){
      if(kind.x>3.5&&kind.x<4.5&&panoramaReady>.5&&night<.5)discard;
      if(kind.x>14.5&&kind.x<15.5&&tentOpen>.5)discard;
      float dist=length(point-eye);
      if(kind.x>31.5&&kind.x<32.5){vec2 signUV=vec2(clamp((point.x+140.)/18.,0.,1.),1.-clamp((point.y-${(ground(-131,-81)+5.).toFixed(6)})/6.,0.,1.));vec3 signColor=texture2D(clothMap,vec2(.5+signUV.x*.5,signUV.y*.25)).rgb;gl_FragColor=vec4(signColor*(.45+campusLights*.4),1.);return;}
      if(kind.x>5.5&&kind.x<6.5){
        if(plantReady<.5)discard;vec4 plant=texture2D(plantMap,norm.xy);if(plant.a<.42)discard;
        float lum=dot(plant.rgb,vec3(.2126,.7152,.0722));vec3 foliage=mix(vec3(lum),plant.rgb,.65);
        foliage*=vec3(.44,.48,.53)*(.83+.17*kind.y)*(1.-night*.52);foliage+=plant.rgb*mix(vec3(.72,.67,.55),vec3(.62,.045,.01),redLight)*flashlight(point)*.35;
        float fog=1.-exp(-dist*.00085);vec3 haze=sky(normalize(vec3(point.x-eye.x,.025,point.z-eye.z)))*.68;
        gl_FragColor=vec4(mix(foliage,haze,clamp(fog,0.,.86)),1.);return;
      }
      vec3 n=normalize(norm),view=normalize(eye-point);float woodEmber=0.;
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
      if(kind.x>38.5&&kind.x<39.5)base=vec3(.53,.57,.59)*(.95+.05*sin(point.y*510.));
      if(kind.x>39.5&&kind.x<40.5)base=vec3(.025,.061,.08);
      if(kind.x>40.5&&kind.x<41.5)base=vec3(.055,.085,.12);
      if(kind.x>41.5&&kind.x<42.5)base=vec3(.94,.37,.055);
      if(kind.x>42.5&&kind.x<43.5)base=vec3(.57,.35,.23);
      if(kind.x>43.5&&kind.x<44.5)base=vec3(.7,.04,.02);
      if(kind.x>44.5&&kind.x<45.5)base=vec3(.70,.73,.66);
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
      illumination+=vec3(.50,.61,.74)*campusGlow*(.34+.66*max(n.y,0.));
      vec3 color=pow(max(base,vec3(.001)),vec3(2.2))*illumination;
      color+=woodEmber*fireOn*vec3(.36,.038,.001)*flicker;
      if(kind.x>25.5&&kind.x<30.5){float rim=pow(1.-max(0.,dot(n,view)),3.);color+=vec3(.025,.055,.072)*(.15+rim);color+=lampTint*flashlight(point)*pow(max(0.,dot(reflect(-normalize(flashlightPosition-point),n),view)),44.)*.3;}
      if(kind.x>27.5&&kind.x<28.5)color+=vec3(.025,.62,.85)*(.30+ufoAwake*.8)*alienPulse;
      if(kind.x<.5){float shade=texture2D(shadeMap,point.xz/660.+.5).r;color*=mix(.28,1.,shade);}
      if(kind.x>11.5&&kind.x<12.5)color+=fireOn*vec3(.75,.07,.002)*(.2+.8*noise(point.xz*21.+time*.15))*flicker;
      if(kind.x>12.5&&kind.x<13.5)color+=lanternOn*vec3(1.8,.8,.2);
      if(kind.x>7.5&&kind.x<10.5){vec3 halfway=normalize(view+normalize(toFire));color+=fireOn*vec3(.6,.2,.04)*pow(max(dot(n,halfway),0.),42.)/(1.+dot(toFire,toFire)*.3);}
      if(kind.x>17.5&&kind.x<18.5)color+=flashlightOn*lampTint*1.1;
      if(kind.x>15.5&&kind.x<18.5)color+=pow(base,vec3(2.2))*vec3(.17,.19,.23);
      if(kind.x>20.5&&kind.x<21.5)color+=pow(base,vec3(2.2))*.3;
      if(kind.x>21.5&&kind.x<22.5)color+=vec3(.48,.21,.045);
      if(kind.x>33.5&&kind.x<35.5){float finish=kind.x<34.5?.26:1.;color+=vec3(.09,.12,.15)*campusGlow*pow(1.-max(0.,dot(n,view)),2.)*finish;color+=vec3(.2,.25,.29)*pow(max(0.,dot(n,normalize(view+vec3(.4,.1,1.)))),22.)*campusGlow*finish;}
      if(kind.x>35.5&&kind.x<36.5)color+=vec3(.01,.14,.20)*campusLights;
      if(kind.x>36.5&&kind.x<37.5)color+=vec3(.8,.93,1.)*campusLights;
      if(kind.x>38.5){color+=pow(base,vec3(2.2))*vec3(.13,.17,.23);}
      if(kind.x>38.5&&kind.x<40.5){float rim=pow(1.-max(0.,dot(n,view)),3.);color+=vec3(.12,.17,.23)*rim;vec3 reflection=sky(reflect(-view,n));color+=reflection*(kind.x<39.5?.28:.65);color+=lampTint*flashlight(point)*pow(max(0.,dot(reflect(-normalize(flashlightPosition-point),n),view)),55.)*.6;}
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
    varying vec3 point,norm;varying vec2 kind;
    void main(){vec3 local=position+vec3(handSway,0.);local.x-=max(0.,1.-aspect)*.33;float depth=-local.z;point=eye+right*local.x+up*local.y-forward*local.z;norm=normalize(right*normal.x+up*normal.y-forward*normal.z);kind=material;
    gl_Position=vec4(local.x/(aspect*lens),local.y/lens,1.000025*depth-.10000125,depth);}
  `;
  function handGeometry(){
    const data=[];
    const vertex=(p,n,k)=>data.push(...p,...n,k,.5);
    function tri(a,b,c,na,nb,nc,k){vertex(a,na,k);vertex(b,nb,k);vertex(c,nc,k);}
    function sphere(center,size,k){const rows=12,sides=20;const point=(i,j)=>{const lat=-Math.PI/2+i/rows*Math.PI,a=j/sides*TAU,n=[Math.cos(lat)*Math.cos(a),Math.sin(lat),Math.cos(lat)*Math.sin(a)];return {p:center.map((v,t)=>v+n[t]*size[t]),n};};for(let i=0;i<rows;i++)for(let j=0;j<sides;j++){const a=point(i,j),b=point(i+1,j),c=point(i,j+1),d=point(i+1,j+1);tri(a.p,b.p,c.p,a.n,b.n,c.n,k);tri(c.p,b.p,d.p,c.n,b.n,d.n,k);}}
    function cylinder(a,b,r,k,sides=24){let d=b.map((v,i)=>v-a[i]),len=Math.hypot(...d);d=d.map(v=>v/len);let u=[d[1],-d[0],0];if(Math.hypot(...u)<.001)u=[1,0,0];len=Math.hypot(...u);u=u.map(v=>v/len);const v=[d[1]*u[2]-d[2]*u[1],d[2]*u[0]-d[0]*u[2],d[0]*u[1]-d[1]*u[0]];const n=i=>u.map((x,j)=>x*Math.cos(i/sides*TAU)+v[j]*Math.sin(i/sides*TAU));for(let i=0;i<sides;i++){const na=n(i),nb=n(i+1),pa=a.map((x,j)=>x+na[j]*r),pb=a.map((x,j)=>x+nb[j]*r),pc=b.map((x,j)=>x+na[j]*r),pd=b.map((x,j)=>x+nb[j]*r);tri(pa,pc,pb,na,na,nb,k);tri(pb,pc,pd,nb,na,nb,k);tri(a,pb,pa,d.map(x=>-x),d.map(x=>-x),d.map(x=>-x),k);tri(b,pc,pd,d,d,d,k);}}
    // A canvas sleeve and a fitted tan field glove gripping a metal flashlight.
    cylinder([.57,-.66,-.24],[.35,-.36,-.49],.082,17);sphere([.35,-.36,-.49],[.087,.084,.091],17);
    cylinder([.36,-.39,-.46],[.32,-.30,-.57],.066,17);sphere([.316,-.275,-.60],[.063,.052,.089],16);
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
        const peak=22+layer*28+Math.pow(rugged,1.6)*(85+layer*30);
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
    function rock(x,z,r,force=false){
      if(!force&&(Math.hypot(x,z+10)<8||Math.max(Math.abs(x-CAMPUS.x)-CAMPUS.width/2,Math.abs(z-CAMPUS.z)-CAMPUS.depth/2)<2||pathClearance(x,z)<r+.6||Math.hypot(x-CRASH.x,z-CRASH.z)<11||TRAIL.some(p=>Math.hypot(x-p.x,z-p.z)<4)))return;
      const y=ground(x,z)-r*.2,tone=rand(),rotation=rand()*TAU,stretch=.7+rand()*.8,sides=r>.45?14:7,rows=r>.45?7:3;
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
    function shrub(x,z,size){
      if(Math.hypot(x,z+10)<8||Math.max(Math.abs(x-CAMPUS.x)-CAMPUS.width/2,Math.abs(z-CAMPUS.z)-CAMPUS.depth/2)<2||pathClearance(x,z)<size*.6+.6||Math.hypot(x-CRASH.x,z-CRASH.z)<10||TRAIL.some(p=>Math.hypot(x-p.x,z-p.z)<4))return;
      const y=ground(x,z)-.055,tone=rand(),width=size*2.2,h=width*.84,rotation=rand()*TAU;
      // Crossed alpha cutouts give fine leaves and branches from every bearing.
      // For plant vertices, the normal channel carries texture coordinates.
      for(let j=0;j<3;j++){
        const a=rotation+j*Math.PI/3,dx=Math.cos(a)*width*.5,dz=Math.sin(a)*width*.5;
        const bl=[x-dx,y,z-dz],br=[x+dx,y,z+dz],tl=[x-dx,y+h,z-dz],tr=[x+dx,y+h,z+dz];
        tri(bl,br,tl,6,tone,false,[[0,1,1],[1,1,1],[0,0,1]]);tri(br,tr,tl,6,tone,false,[[1,1,1],[1,0,1],[0,0,1]]);
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
    // Rounded wash stones and banks form a distinct, low crossing on the eastern loop.
    for(let i=0;i<26;i++){const z=12+i*.8,center=40+Math.sin(z*.19)*1.3;for(const side of [-1,1]){const x=center+side*(2.8+rand());if(pathClearance(x,z)>.8)rock(x,z,.18+rand()*.35,true);}}
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
      function box(x,z,w,d,h,k,base=y){const a=[x-w/2,base,z-d/2],b=[x+w/2,base,z-d/2],c=[x+w/2,base,z+d/2],e=[x-w/2,base,z+d/2],top=p=>[p[0],p[1]+h,p[2]];quad(a,b,top(b),top(a),k);quad(b,c,top(c),top(b),k);quad(c,e,top(e),top(c),k);quad(e,a,top(a),top(e),k);quad(top(a),top(b),top(c),top(e),k);}
      function building(x,z,w,d,h){box(x,z,w,d,h,33);for(let a=-w/2+2;a<w/2;a+=3)for(let b=-d/2+2;b<d/2;b+=3)obstacles.push({x:x+a,z:z+b,radius:2.1});occluders.push({x,z,radius:Math.max(w,d)/2,height:h,strength:.8});}
      building(-131,-94,20,24,14);box(-131,-81.92,15,.10,8.2,34); // Large integration hangar door.
      for(let x=-138;x<-124;x+=2.8)box(x,-81.82,2.1,.06,1.5,36,y+10.5);
      quad([-140,y+5,-81.75],[-122,y+5,-81.75],[-122,y+11,-81.75],[-140,y+11,-81.75],32);
      building(-88,-90,10,13,5.5);for(let x=-91;x<-84;x+=2)box(x,-83.46,1.4,.08,1.5,36,y+2.7);
      // Structural frames, roof equipment, conduits and a lit pedestrian entrance.
      for(const x of [-141.2,-121]){box(x,-94,.28,24.8,14.4,35);box(x,-94,.42,25,.25,35,y+14.4);for(let z=-105;z<-81;z+=4)box(x,z,.34,.26,13.5,35);}
      box(-131,-94,20.7,24.8,.25,35,y+14);box(-131,-81.68,20.4,.12,.22,37,y+12.2);
      for(let z=-102;z<-85;z+=5){box(-131,z,3.5,2.8,1.2,33,y+14.3);for(let j=0;j<8;j++)box(-131,z-1+j*.29,3.2,.05,.03,10,y+15.51);}
      for(let x=-139;x<-122;x+=2.1){box(x,-81.8,.06,.13,4.8,35);box(x,-106.3,.12,.3,14,35);}
      for(let j=0;j<9;j++)box(-131,-81.78,15,.06,.028,35,y+.4+j*.48);
      for(const x of [-141.4,-120.7]){cylinder([x,y+.3,-81.8],[x,y+13.8,-81.8],.075,35,10);for(let j=0;j<7;j++)cylinder([x,y+j*2,-81.8],[x,y+j*2+.08,-81.8],.115,35,10);}
      box(-88,-90,10.5,13.5,.26,35,y+5.5);box(-86,-88,3.2,3,1.1,33,y+5.76);box(-91,-93,2.3,2.3,.12,20,y+5.77);
      cylinder([-92,y+5.6,-94],[-92,y+9.7,-94],.055,35,10);for(let j=0;j<4;j++)cylinder([-93,y+7+j*.7,-94],[-91,y+7+j*.7,-94],.026,35,8);
      box(-93.08,-91,.10,1.4,2.4,40);box(-94,-91,1.8,2.3,.16,35,y+2.45);box(-94,-91,1.8,2.3,.035,37,y+2.40);
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
    let alive=true,currentZoom=1,ready=false,worker=null;const state=camera(),camp={fireOn:true,lanternOn:true,tentOpen:true,night:true,flashlightOn:true,redLight:false,hands:true,satellitesOn:true,binoculars:false,fireBoost:0,ufoAwake:false,campusLights:true};let time=4,onFoot=false,handVisible=true,swayEnabled=true;
    const Life=window.ParallaxLife,life=Life?.create();const lifeBuffers=new Map();
    function program(v,f){const p=gl.createProgram();for(const [type,src] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);gl.deleteShader(s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
    try{
      const sky=program(skyVertex,skyFragment),mesh=program(meshVertex,meshFragment),fire=program(fireVertex,fireFragment),embers=program(emberVertex,emberFragment),hand=program(handVertex,meshFragment);let world={vertices:new Float32Array(0),obstacles:[]};

      const skyBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const meshBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,meshBuffer);gl.bufferData(gl.ARRAY_BUFFER,world.vertices,gl.STATIC_DRAW);
      const info=p=>({p,position:gl.getAttribLocation(p,'position'),normal:gl.getAttribLocation(p,'normal'),material:gl.getAttribLocation(p,'material'),uniform:Object.fromEntries(['eye','right','up','forward','aspect','lens','time','fireOn','lanternOn','tentOpen','firePosition','lanternPosition','night','flashlightOn','redLight','flashlightPosition','flashlightDirection','handSway','pixelAngle','satellitesOn','fireBoost','ufoAwake','campusLights','objectMode','objectOrigin','objectPose'].map(n=>[n,gl.getUniformLocation(p,n)]))});
      const skyInfo=info(sky),meshInfo=info(mesh),fireInfo=info(fire),emberInfo=info(embers),handInfo=info(hand);
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
        for(const p of [sky,mesh,hand]){gl.useProgram(p);gl.uniform1f(gl.getUniformLocation(p,'panoramaReady'),1);}if(host.closest('dialog')?.open)render(currentZoom);
      };panoramaImage.src='/assets/desert-twilight-panorama.png';
      const nightTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,nightTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([3,5,10,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      for(const p of [sky,mesh,hand]){gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'nightMap'),5);gl.uniform1f(gl.getUniformLocation(p,'nightReady'),0);}
      const nightImage=new Image();nightImage.onload=()=>{if(!alive)return;const tile=document.createElement('canvas');tile.width=Math.min(4096,gl.getParameter(gl.MAX_TEXTURE_SIZE),Math.pow(2,Math.ceil(Math.log2(nightImage.width))));tile.height=tile.width/2;tile.getContext('2d').drawImage(nightImage,0,0,tile.width,tile.height);gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,nightTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);for(const p of [sky,mesh,hand]){gl.useProgram(p);gl.uniform1f(gl.getUniformLocation(p,'nightReady'),1);}if(host.closest('dialog')?.open)render(currentZoom);};nightImage.src='/assets/eso-milkyway.jpg';
      const plantTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,plantTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.useProgram(mesh);gl.uniform1i(gl.getUniformLocation(mesh,'plantMap'),3);gl.uniform1f(gl.getUniformLocation(mesh,'plantReady'),0);
      const plantImage=new Image();plantImage.onload=()=>{
        if(!alive)return;const tile=document.createElement('canvas');tile.width=tile.height=1024;tile.getContext('2d').drawImage(plantImage,0,0,1024,1024);
        gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,plantTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        gl.useProgram(mesh);gl.uniform1f(gl.getUniformLocation(mesh,'plantReady'),1);if(host.closest('dialog')?.open)render(currentZoom);
      };plantImage.src='/assets/desert-creosote.png';
      const clothTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,clothTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([170,145,105,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.useProgram(mesh);gl.uniform1i(gl.getUniformLocation(mesh,'clothMap'),4);
      const clothAtlas=document.createElement('canvas');clothAtlas.width=2048;clothAtlas.height=2048;const atlasCtx=clothAtlas.getContext('2d');atlasCtx.fillStyle='#aa9169';atlasCtx.fillRect(0,0,1024,2048);
      function uploadAtlas(){if(!alive)return;gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,clothTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,clothAtlas);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);if(host.closest('dialog')?.open)render(currentZoom);}
      function paintSign(logo){atlasCtx.save();atlasCtx.translate(1024,0);atlasCtx.fillStyle='#091119';atlasCtx.fillRect(0,0,1024,2048);atlasCtx.scale(1,1.5);atlasCtx.strokeStyle='#758590';atlasCtx.lineWidth=2;atlasCtx.strokeRect(12,12,1000,317);atlasCtx.fillStyle='#e5edf2';if(logo){atlasCtx.filter='invert(1)';atlasCtx.drawImage(logo,72,61,880,110);atlasCtx.filter='none';}else{atlasCtx.font='italic 110px sans-serif';atlasCtx.fillText('SPACEX',100,156);}atlasCtx.font='27px monospace';atlasCtx.fillText('DESERT LAUNCH CAMPUS',188,238);atlasCtx.fillStyle='#94aab6';atlasCtx.font='18px monospace';atlasCtx.fillText('PARALLAX / FAN-BUILT EXPERIENCE',183,282);atlasCtx.restore();uploadAtlas();}
      const clothImage=new Image();clothImage.onload=()=>{atlasCtx.drawImage(clothImage,0,0,1024,1024);uploadAtlas();};clothImage.src='/assets/camp-canvas.png';const barkImage=new Image();barkImage.onload=()=>{atlasCtx.drawImage(barkImage,0,1024,1024,1024);uploadAtlas();};barkImage.src='/assets/log-bark.jpg';paintSign();const logoImage=new Image();logoImage.onload=()=>paintSign(logoImage);logoImage.src='/assets/spacex-logo.svg';
      const groundImage=new Image();groundImage.onload=()=>{
        if(!alive)return;const tile=document.createElement('canvas');tile.width=tile.height=2048;tile.getContext('2d').drawImage(groundImage,0,0,2048,2048);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile);gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');if(anisotropy)gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        gl.useProgram(mesh);gl.uniform1f(textureFlag,1);if(host.closest('dialog')?.open)render(currentZoom);
      };groundImage.src='/assets/gravelly-sand-diff.jpg';
      const normalTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,normalTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,255,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      for(const p of [mesh,hand]){gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'groundNormal'),6);}
      const normalImage=new Image();normalImage.onload=()=>{if(!alive)return;gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,normalTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,normalImage);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);const ext=gl.getExtension('EXT_texture_filter_anisotropic');if(ext)gl.texParameterf(gl.TEXTURE_2D,ext.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));if(host.closest('dialog')?.open)render(currentZoom);};normalImage.src='/assets/gravelly-sand-nor_gl.jpg';
      const trailTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,trailTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,1,1,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,new Uint8Array([0]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);for(const p of [mesh,hand]){gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'trailMap'),7);}
      gl.useProgram(hand);for(const [name,unit] of [['groundMap',0],['panoramaMap',1],['shadeMap',2],['plantMap',3],['clothMap',4],['nightMap',5]])gl.uniform1i(gl.getUniformLocation(hand,name),unit);gl.uniform1f(gl.getUniformLocation(hand,'textured'),1);
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();alive=false;worker?.terminate();canvas.remove();onFailure?.();});
      function acceptWorld(result){if(!alive)return;world=result;gl.bindBuffer(gl.ARRAY_BUFFER,meshBuffer);gl.bufferData(gl.ARRAY_BUFFER,world.vertices,gl.STATIC_DRAW);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,shadeTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,world.shadeSize,world.shadeSize,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,world.shade);gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,trailTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,world.trailSize,world.trailSize,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,world.trailMask);ready=true;worker?.terminate();worker=null;onReady?.();}
      // Construct geometry off the UI thread; keep the landscape visible while it loads.
      try{worker=new Worker('/desert-world.js?v=36');worker.onmessage=e=>acceptWorld(e.data);worker.onerror=()=>{worker.terminate();worker=null;setTimeout(()=>acceptWorld(geometry()),0)};worker.postMessage({build:true});}
      catch{setTimeout(()=>acceptWorld(geometry()),0)}
      function cameraEye(){
        const base=[state.x,ground(state.x,state.z)+(state.seated?1.03:1.72),state.z];if(!life?.driving)return base;
        // A chase camera retreats only as far as the clear space behind the vehicle.
        const sy=Math.sin(state.yaw),cy=Math.cos(state.yaw);let retreat=7.2;
        for(let d=1;d<=7.2;d+=.3){const x=state.x-sy*d,z=state.z+cy*d;if(world.obstacles.some(o=>Math.hypot(x-o.x,z-o.z)<o.radius+.35)){retreat=Math.max(.5,d-.5);break;}}
        const x=state.x-sy*retreat,z=state.z+cy*retreat;return [x,Math.max(base[1]+2.3,ground(x,z)+1.4),z];
      }
      function render(zoom=1){
        if(!alive||!ready)return;currentZoom=zoom;
        const ratio=Math.min(devicePixelRatio||1,innerWidth<700?1.25:1.5,Math.sqrt(2400000/(innerWidth*innerHeight))),w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        gl.viewport(0,0,w,h);gl.clearColor(.015,.025,.05,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        const sy=Math.sin(state.yaw),cy=Math.cos(state.yaw),sp=Math.sin(state.pitch),cp=Math.cos(state.pitch);
        const eye=cameraEye(),right=[cy,0,sy],up=[-sy*sp,cp,cy*sp],forward=[sy*cp,sp,-cy*cp];
        const lens=viewLens(zoom,camp.binoculars);
        const sway=swayEnabled&&onFoot?[Math.sin(state.distance*3.7)*.008,Math.cos(state.distance*7.4)*.006]:[0,0];
        let flashlightPosition=eye.map((v,i)=>v+right[i]*(.263+sway[0]-Math.max(0,1-w/h)*.33)+up[i]*(-.24+sway[1])+forward[i]*.89);
        let flashlightDirection=forward.map((v,i)=>v*.990+up[i]*.05+right[i]*-.129),fl=Math.hypot(...flashlightDirection);for(let i=0;i<3;i++)flashlightDirection[i]/=fl;
        if(life?.driving){const v=Life.active(life);flashlightPosition=[v.x+Math.sin(v.yaw)*2.8,ground(v.x,v.z)+.9,v.z-Math.cos(v.yaw)*2.8];flashlightDirection=[Math.sin(v.yaw),-.035,-Math.cos(v.yaw)];}
        function uniforms(i){gl.useProgram(i.p);gl.uniform3fv(i.uniform.eye,eye);gl.uniform3fv(i.uniform.right,right);gl.uniform3fv(i.uniform.up,up);gl.uniform3fv(i.uniform.forward,forward);gl.uniform1f(i.uniform.aspect,w/h);gl.uniform1f(i.uniform.lens,lens);gl.uniform1f(i.uniform.night,Number(camp.night));gl.uniform1f(i.uniform.time,time);gl.uniform1f(i.uniform.pixelAngle,2*lens/h);gl.uniform1f(i.uniform.satellitesOn,Number(camp.satellitesOn));gl.uniform2fv(i.uniform.handSway,sway);gl.uniform1f(i.uniform.flashlightOn,Number(onFoot&&(life?.driving||camp.hands&&camp.flashlightOn&&!camp.binoculars)));gl.uniform1f(i.uniform.redLight,Number(!life?.driving&&camp.redLight));gl.uniform3fv(i.uniform.flashlightPosition,flashlightPosition);gl.uniform3fv(i.uniform.flashlightDirection,flashlightDirection);gl.uniform1f(i.uniform.fireOn,Number(camp.fireOn));gl.uniform1f(i.uniform.fireBoost,camp.fireBoost);gl.uniform1f(i.uniform.ufoAwake,Number(camp.ufoAwake));gl.uniform1f(i.uniform.campusLights,Number(camp.campusLights));gl.uniform1f(i.uniform.lanternOn,Number(camp.lanternOn));gl.uniform1f(i.uniform.tentOpen,Number(camp.tentOpen));gl.uniform3fv(i.uniform.firePosition,CAMP.fire);gl.uniform3fv(i.uniform.lanternPosition,[-4.25,CAMP.tent[1]+.47,-9.22]);}
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
        if(camp.fireOn&&Math.hypot(state.x,state.z+8)<100){
          gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
          uniforms(fireInfo);gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);for(let i=0;i<3;i++)gl.disableVertexAttribArray(i);gl.enableVertexAttribArray(fireInfo.position);gl.vertexAttribPointer(fireInfo.position,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);
          uniforms(emberInfo);gl.bindBuffer(gl.ARRAY_BUFFER,emberBuffer);for(let i=0;i<3;i++)gl.disableVertexAttribArray(i);gl.enableVertexAttribArray(emberInfo.position);gl.vertexAttribPointer(emberInfo.position,1,gl.FLOAT,false,0,0);gl.drawArrays(gl.POINTS,0,28);
          gl.depthMask(true);gl.disable(gl.BLEND);
        }
        if(onFoot&&!life?.driving&&camp.hands&&handVisible&&!camp.binoculars){gl.clear(gl.DEPTH_BUFFER_BIT);uniforms(handInfo);gl.bindBuffer(gl.ARRAY_BUFFER,handBuffer);for(const [loc,size,offset] of [[handInfo.position,3,0],[handInfo.normal,3,12],[handInfo.material,2,24]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,32,offset);}gl.drawArrays(gl.TRIANGLES,0,handVertices.length/8);}
      }
      return {canvas,state,camp,life,points:CAMP,
        get driving(){return life?.driving||null;},get speed(){return life?Life.active(life)?.speed||0:0;},
        nearestRover(){return life?Life.nearestVehicle(life,state):null;},
        enterRover(id){if(!life||!Life.enter(life,state,id))return false;camp.binoculars=false;render(currentZoom);return true;},
        exitRover(){const ok=life&&Life.exit(life,state,world.obstacles);if(ok)render(currentZoom);return ok;},
        brake(){if(life)Life.brake(life);},
        recallRovers(){if(!life)return;life.driving=null;for(let i=0;i<life.vehicles.length;i++)Object.assign(life.vehicles[i],Life.SPAWNS[i],{speed:0,wheel:0});Object.assign(state,camera());render(currentZoom);},trail:TRAIL,paths:PATHS,routeTo:place=>trailRoute(state,place),terrainHeight:ground,render,
        setWalking(value){onFoot=value;if(!value){camp.binoculars=false;if(life)Life.brake(life);}},setHandVisible(value){handVisible=value;},setMotion(value){swayEnabled=value;},
        satellitePoints(){return [0,1,2].map(i=>satelliteDirection(time,i).map((v,j)=>v*1000+(j===0?state.x:j===1?ground(state.x,state.z)+1.72:state.z)));},
        watchSky(){camp.night=true;state.yaw=0;state.pitch=.61;render(currentZoom);},
        setCamp(patch){Object.assign(camp,patch);render(currentZoom);},
        stoke(){camp.fireOn=true;camp.fireBoost=1;render(currentZoom);},
        tick(dt){const step=Math.min(Math.max(0,dt),.1);time+=step;if(life)Life.crewTick(life,step,state);camp.fireBoost=Math.max(0,camp.fireBoost-step/18);return !!life||camp.satellitesOn||camp.fireOn&&Math.hypot(state.x,state.z+8)<75;},
        project(point){const sy=Math.sin(state.yaw),cy=Math.cos(state.yaw),sp=Math.sin(state.pitch),cp=Math.cos(state.pitch),eye=cameraEye(),p=point.map((v,i)=>v-eye[i]);const d=p[0]*sy*cp+p[1]*sp-p[2]*cy*cp,lens=viewLens(currentZoom,camp.binoculars);return {x:innerWidth/2+(p[0]*cy+p[2]*sy)/d/lens*innerHeight/2,y:innerHeight/2-(-p[0]*sy*sp+p[1]*cp+p[2]*cy*sp)/d/lens*innerHeight/2,depth:d,distance:Math.hypot(...p)};},
        visit(place){if(life){Life.brake(life);life.driving=null;}const positions={fire:[0,-5.15,0,-.14],tent:[-4.5,-6.25,0,.03],telescope:[3.5,-10.6,0,.13],camp:[0,-2.8,0,.025]};const p=positions[place]||positions.camp;Object.assign(state,{x:p[0],z:p[1],yaw:p[2],pitch:p[3],edge:false,seated:place==='fire'});render(currentZoom);},
        get ready(){return ready;},
        look(dx,dy){state.yaw=(state.yaw-dx*(camp.binoculars?.0012:.0035))%TAU;state.pitch=clamp(state.pitch+dy*(camp.binoculars?.001:.003),-1.4,1.4);},
        turn(yaw,pitch){state.yaw=(state.yaw+yaw)%TAU;state.pitch=clamp(state.pitch+pitch,-1.4,1.4);},
        move:(forward,side,dt,fast)=>ready&&(life?.driving?Life.drive(life,state,forward,side,dt,world.obstacles,ground):move(state,forward,side,dt,fast,life?world.obstacles.concat(life.vehicles.flatMap(v=>Life.circles(v,.98)),life.crew.map(p=>({x:p.x,z:p.z,radius:.28}))):world.obstacles)),
        reset(){if(life){Life.brake(life);life.driving=null;}Object.assign(state,camera());}
      };
    }catch(error){canvas.remove();gl.getExtension('WEBGL_lose_context')?.loseContext();console.warn('Desert view unavailable:',error.message);return null;}
  }
  if(typeof window!=='undefined')window.ParallaxDesert={create};
  else if(typeof self!=='undefined')self.onmessage=()=>{const world=geometry();self.postMessage(world,[world.vertices.buffer,world.shade.buffer,world.trailMask.buffer]);};
  // Pure movement and terrain helpers also support non-browser regression checks.
  if(typeof module!=='undefined'&&module.exports)module.exports={CAMPUS,CRASH,PATHS,ROUTES,LOGS,trailRoute,pathClearance,bakeTrailMap,viewLens,ground,height,move,camera,geometry,handGeometry,CAMP,TRAIL,satelliteDirection,shaders:{skyVertex,skyFragment,meshVertex,meshFragment,fireVertex,fireFragment,emberVertex,emberFragment,handVertex}};
})();
