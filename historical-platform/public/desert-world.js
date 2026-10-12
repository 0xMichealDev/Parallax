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
  function height(x,z){const t=clamp((Math.hypot(x,z+10)-7)/6,0,1);return naturalHeight(0,-10)+(naturalHeight(x,z)-naturalHeight(0,-10))*t*t*(3-2*t);}
  const CAMP={fire:[0,ground(0,-8),-8],tent:[-4.5,ground(-4.5,-10.5),-10.5],telescope:[3.5,ground(3.5,-13),-13]};
  // Match the triangle mesh exactly, so the camera follows the ground.
  function ground(x, z) {
    const bx = Math.floor(x / STEP) * STEP, bz = Math.floor(z / STEP) * STEP;
    const u = (x - bx) / STEP, v = (z - bz) / STEP;
    const a = height(bx, bz), b = height(bx + STEP, bz), c = height(bx, bz + STEP), d = height(bx + STEP, bz + STEP);
    return u + v <= 1 ? a + u * (b - a) + v * (c - a) : d + (1 - u) * (c - d) + (1 - v) * (b - d);
  }
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
    uniform sampler2D panoramaMap; uniform float panoramaReady;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    vec3 panorama(vec3 d){
      vec2 uv=vec2(atan(d.x,-d.z)/6.2831853+.5,clamp(acos(clamp(d.y,-1.,1.))/3.14159265+.045,0.,1.));
      vec3 c=texture2D(panoramaMap,uv).rgb;
      // Blend the far-back seam over a few degrees without touching the sunset.
      float seam=smoothstep(.975,1.,abs(uv.x-.5)*2.);
      vec3 edge=(texture2D(panoramaMap,vec2(.001,uv.y)).rgb+texture2D(panoramaMap,vec2(.999,uv.y)).rgb)*.5;
      return mix(c,edge,seam);
    }
    vec3 sky(vec3 d){
      float h=max(d.y,0.); float sunset=pow(max(dot(normalize(d.xz),normalize(vec2(.35,-1.))),0.),12.);
      vec3 c=mix(vec3(.115,.15,.23),vec3(.009,.023,.059),pow(clamp(h*1.5,0.,1.),.48));
      c+=vec3(.49,.18,.065)*exp(-h*13.)*sunset;
      c+=vec3(.12,.038,.033)*exp(-h*4.)*sunset;
      return mix(c,panorama(d)*.72,panoramaReady)*(1.-night*.78);
    }
  `;
  const skyVertex = 'attribute vec2 position; varying vec2 uv; void main(){uv=position;gl_Position=vec4(position,.9999,1.);}';
  const skyFragment = common + `
    varying vec2 uv;
    void main(){
      vec3 d=normalize(forward+right*uv.x*aspect*lens+up*uv.y*lens); vec3 col=sky(d);
      if(panoramaReady<.5){
      vec2 stars=vec2(atan(d.x,-d.z),asin(d.y))*430.; vec2 cell=floor(stars);
      float star=step(.9983,hash(cell))*(1.-smoothstep(.05,.45,length(fract(stars)-.5)));
      col+=vec3(.50,.60,.74)*star*smoothstep(.1,.6,d.y)*.58;
      if(d.y>.015){vec2 p=d.xz/(d.y+.24);float n=noise(p*2.1)+.35*noise(p*7.);float cloud=smoothstep(.72,1.05,n)*exp(-d.y*3.)*.16;col=mix(col,vec3(.14,.13,.18),cloud);}
      }
      if(night>.5&&d.y>.015){
        vec2 p=vec2(atan(d.x,-d.z),asin(d.y))*650.;vec2 cell=floor(p);float star=step(.997,hash(cell))*(1.-smoothstep(.04,.37,length(fract(p)-.5)));
        col+=mix(vec3(.55,.67,.9),vec3(.95,.75,.53),hash(cell+42.))*star*smoothstep(.015,.25,d.y)*.85;
        float band=exp(-pow((dot(d,normalize(vec3(.6,.42,.7)))-.1)/.11,2.));float cloud=noise(d.xz*22.+d.y*9.)*.65+noise(d.xz*61.)*.35;
        col+=vec3(.07,.074,.105)*band*cloud*smoothstep(.04,.5,d.y);
      }
      gl_FragColor=vec4(col,1.);
    }
  `;
  const meshVertex = `
    precision highp float;
    attribute vec3 position; attribute vec3 normal; attribute vec2 material;
    uniform vec3 eye; uniform vec3 right; uniform vec3 up; uniform vec3 forward;
    uniform float aspect; uniform float lens;
    varying vec3 point; varying vec3 norm; varying vec2 kind;
    void main(){vec3 p=position-eye;float depth=dot(p,forward);point=position;norm=normal;kind=material;
      gl_Position=vec4(dot(p,right)/(aspect*lens),dot(p,up)/lens,1.000025*depth-.10000125,depth);}
  `;
  const meshFragment = `#extension GL_OES_standard_derivatives : enable\n` + common + `
    varying vec3 point; varying vec3 norm; varying vec2 kind;
    uniform sampler2D clothMap; uniform float time; uniform float fireOn; uniform float lanternOn; uniform float tentOpen; uniform vec3 firePosition; uniform vec3 lanternPosition;
    uniform sampler2D groundMap; uniform sampler2D shadeMap; uniform sampler2D plantMap; uniform float plantReady; uniform float textured;
    vec3 groundSample(vec2 p){
      vec2 tile=floor(p*.15),blend=fract(p*.15);blend=blend*blend*(3.-2.*blend);
      vec2 a=vec2(hash(tile),hash(tile+37.));
      vec2 b=vec2(hash(tile+vec2(1,0)),hash(tile+vec2(38,37)));
      vec2 c=vec2(hash(tile+vec2(0,1)),hash(tile+vec2(37,38)));
      vec2 d=vec2(hash(tile+vec2(1,1)),hash(tile+38.));
      return mix(mix(texture2D(groundMap,p+a).rgb,texture2D(groundMap,p+b).rgb,blend.x),mix(texture2D(groundMap,p+c).rgb,texture2D(groundMap,p+d).rgb,blend.x),blend.y);
    }
    void main(){
      if(kind.x>3.5&&kind.x<4.5&&panoramaReady>.5)discard;
      if(kind.x>14.5&&tentOpen>.5)discard;
      float dist=length(point-eye);
      if(kind.x>5.5&&kind.x<6.5){
        if(plantReady<.5)discard;vec4 plant=texture2D(plantMap,norm.xy);if(plant.a<.42)discard;
        float lum=dot(plant.rgb,vec3(.2126,.7152,.0722));vec3 foliage=mix(vec3(lum),plant.rgb,.65);
        foliage*=vec3(.44,.48,.53)*(.83+.17*kind.y);
        float fog=1.-exp(-dist*.00085);vec3 haze=sky(normalize(vec3(point.x-eye.x,.025,point.z-eye.z)))*.68;
        gl_FragColor=vec4(mix(foliage,haze,clamp(fog,0.,.86)),1.);return;
      }
      vec3 n=normalize(norm),view=normalize(eye-point);
      float macro=noise(point.xz*.036),grain=noise(point.xz*4.7),detail=noise(point.xz*34.);
      vec3 base=mix(vec3(.31,.265,.205),vec3(.46,.37,.27),macro);
      vec3 groundColor=groundSample(point.xz*.27);
      float wash=exp(-pow((point.x-sin(point.z*.014)*11.)/6.,2.));
      base=mix(base,groundColor,textured)*(.73+macro*.3);
      base=mix(base,vec3(.36,.285,.20)*(.8+grain*.2),wash*.26);
      n=normalize(n+vec3((grain-.5)*.12,0.,(detail-.5)*.09));
      #ifdef GL_OES_standard_derivatives
      if(kind.x<.5){
        float elevation=dot(groundColor,vec3(.25,.5,.25));vec3 dx=dFdx(point),dy=dFdy(point);
        vec3 cx=cross(dy,n),cy=cross(n,dx);float det=dot(dx,cx);
        vec3 gradient=sign(det)*(dFdx(elevation)*cx+dFdy(elevation)*cy)/max(abs(det),.00001);
        n=normalize(n-gradient*.075*(1.-smoothstep(12.,45.,dist)));
      }
      #endif
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
      if(kind.x>6.5&&kind.x<7.5||kind.x>14.5){
        vec2 uv=abs(n.x)>.4?point.zy:point.xy;
        base=texture2D(clothMap,uv*1.1).rgb*vec3(.91,.82,.65);
        base*=.92+.08*noise(point.zy*26.);
      }
      if(kind.x>7.5&&kind.x<8.5)base=vec3(.23,.25,.25);
      if(kind.x>8.5&&kind.x<9.5)base=vec3(.82,.84,.8);
      if(kind.x>9.5&&kind.x<10.5)base=vec3(.026,.032,.034);
      if(kind.x>10.5&&kind.x<11.5){float bark=noise(point.xz*vec2(38.,6.)+point.y*14.);base=vec3(.13,.095,.067)*(.3+bark*.8);}
      if(kind.x>4.5&&kind.x<5.5){float bark=noise(vec2(point.x*4.,point.y*43.+point.z*21.));base=vec3(.27,.17,.1)*(.5+bark*.6);if(abs(n.x)>.8){float rings=.7+.3*sin(length(vec2(point.y-(firePosition.y+.27),point.z+4.5))*130.);base=vec3(.49,.34,.21)*rings;}}
      if(kind.x>11.5&&kind.x<12.5)base=vec3(.075,.035,.015);
      if(kind.x>12.5&&kind.x<13.5)base=vec3(.9,.66,.25);
      if(kind.x>13.5&&kind.x<14.5)base=vec3(.035,.05,.04);
      float light=max(dot(n,normalize(vec3(.32,.20,-1.))),0.);
      float hemisphere=.5+.5*n.y;
      vec3 illumination=mix(vec3(.035,.035,.038),vec3(.095,.115,.16),hemisphere)+light*vec3(.09,.055,.022);
      illumination*=1.-night*.45;
      vec3 toFire=firePosition+vec3(0,.7,0)-point;
      float flicker=.9+.065*sin(time*9.)+.045*sin(time*17.3+1.);
      illumination+=vec3(2.3,.71,.14)*fireOn*flicker*max(.12,dot(n,normalize(toFire)))/(1.+dot(toFire,toFire)*.26);
      vec3 toLantern=lanternPosition-point;
      illumination+=vec3(1.3,.7,.2)*lanternOn*max(.08,dot(n,normalize(toLantern)))/(1.+dot(toLantern,toLantern)*3.);
      vec3 color=pow(max(base,vec3(.001)),vec3(2.2))*illumination;
      if(kind.x<.5){float shade=texture2D(shadeMap,point.xz/660.+.5).r;color*=mix(.28,1.,shade);}
      if(kind.x>11.5&&kind.x<12.5)color+=fireOn*vec3(.75,.07,.002)*(.2+.8*noise(point.xz*21.+time*.15))*flicker;
      if(kind.x>12.5&&kind.x<13.5)color+=lanternOn*vec3(1.8,.8,.2);
      if(kind.x>7.5&&kind.x<10.5){vec3 halfway=normalize(view+normalize(toFire));color+=fireOn*vec3(.6,.2,.04)*pow(max(dot(n,halfway),0.),42.)/(1.+dot(toFire,toFire)*.3);}
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
    uniform vec3 firePosition;uniform float time,fireOn;varying vec3 worldPoint;
    float field(vec3 p){return noise(p.xz*3.+vec2(p.y*1.5,-time*1.1))*.62+noise(p.xz*7.+vec2(p.y*3.,-time*2.3))*.38;}
    void main(){
      if(fireOn<.5)discard;
      vec3 ray=normalize(worldPoint-eye),sum=vec3(0.);float alpha=0.;
      for(int i=0;i<28;i++){
        vec3 p=worldPoint-firePosition+ray*(float(i)/27.-.5)*2.4;
        float h=p.y,rad=length(p.xz+vec2(sin(h*4.-time*2.),cos(h*3.+time))*h*.10);
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
    uniform vec3 eye,right,up,forward,firePosition;uniform float aspect,lens,time,fireOn;
    varying float fade;
    void main(){float phase=fract(position*.618+time*(.13+fract(position*.37)*.12));float a=position*2.399+phase*2.;
    vec3 world=firePosition+vec3(sin(a)*(.08+phase*.6),.3+phase*2.8,cos(a)*(.08+phase*.6));
    vec3 p=world-eye;float d=dot(p,forward);fade=sin(phase*3.14159)*fireOn;
    gl_Position=vec4(dot(p,right)/(aspect*lens),dot(p,up)/lens,1.000025*d-.10000125,d);gl_PointSize=clamp(24./max(d,1.),1.,4.);}
  `;
  const emberFragment=`precision mediump float;varying float fade;void main(){float a=(1.-smoothstep(.05,.5,length(gl_PointCoord-.5)))*fade;gl_FragColor=vec4(vec3(1.,.38,.05)*a,a);}`;
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
      if(Math.hypot(x,z+10)<8)return;
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
      if(!force&&Math.hypot(x,z+10)<8)return;
      const y=ground(x,z)-r*.2,tone=rand(),rotation=rand()*TAU,stretch=.7+rand()*.8,sides=r>.45?10:6,rows=r>.45?5:3;
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
      if(Math.hypot(x,z+10)<8)return;
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
    for(let i=0;i<7;i++){const a=i/7*TAU;cylinder([fx+Math.cos(a)*.55,fy+.14,fz+Math.sin(a)*.55],[fx-Math.cos(a)*.36,fy+.33+rand()*.1,fz-Math.sin(a)*.36],.10+rand()*.03,11,12);}
    for(let i=0;i<22;i++){const a=rand()*TAU,r=rand()*.58,x=fx+Math.cos(a)*r,z=fz+Math.sin(a)*r;cylinder([x,fy+.075,z],[x,fy+.095,z],.04+rand()*.075,12,7);}
    obstacles.push({x:fx,z:fz,radius:1.0});
    cylinder([-1.15,fy+.27,-4.5],[1.15,fy+.27,-4.5],.24,5);
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
    return { vertices:new Float32Array(data),obstacles,shade,shadeSize };
  }
  function create(host,onFailure,onReady) {
    const canvas=document.createElement('canvas');canvas.id='u-desert';canvas.setAttribute('aria-hidden','true');
    const gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});
    if(!gl)return null;gl.getExtension('OES_standard_derivatives');
    let alive=true,currentZoom=1,ready=false,worker=null;const state=camera(),camp={fireOn:true,lanternOn:true,tentOpen:true,night:false};let time=4;
    function program(v,f){const p=gl.createProgram();for(const [type,src] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);gl.deleteShader(s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
    try{
      const sky=program(skyVertex,skyFragment),mesh=program(meshVertex,meshFragment),fire=program(fireVertex,fireFragment),embers=program(emberVertex,emberFragment);let world={vertices:new Float32Array(0),obstacles:[]};
      const skyBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const meshBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,meshBuffer);gl.bufferData(gl.ARRAY_BUFFER,world.vertices,gl.STATIC_DRAW);
      const info=p=>({p,position:gl.getAttribLocation(p,'position'),normal:gl.getAttribLocation(p,'normal'),material:gl.getAttribLocation(p,'material'),uniform:Object.fromEntries(['eye','right','up','forward','aspect','lens','time','fireOn','lanternOn','tentOpen','firePosition','lanternPosition','night'].map(n=>[n,gl.getUniformLocation(p,n)]))});
      const skyInfo=info(sky),meshInfo=info(mesh),fireInfo=info(fire),emberInfo=info(embers);
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
      for(const p of [sky,mesh]){gl.useProgram(p);gl.uniform1i(gl.getUniformLocation(p,'panoramaMap'),1);gl.uniform1f(gl.getUniformLocation(p,'panoramaReady'),0);}
      const panoramaImage=new Image();panoramaImage.onload=()=>{
        if(!alive)return;const tile=document.createElement('canvas');tile.width=Math.min(4096,gl.getParameter(gl.MAX_TEXTURE_SIZE),Math.pow(2,Math.ceil(Math.log2(panoramaImage.width))));tile.height=tile.width/2;tile.getContext('2d').drawImage(panoramaImage,0,0,tile.width,tile.height);
        gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,panoramaTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        for(const p of [sky,mesh]){gl.useProgram(p);gl.uniform1f(gl.getUniformLocation(p,'panoramaReady'),1);}if(host.closest('dialog')?.open)render(currentZoom);
      };panoramaImage.src='/assets/desert-twilight-panorama.png';
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
      const clothImage=new Image();clothImage.onload=()=>{if(!alive)return;const tile=document.createElement('canvas');tile.width=tile.height=1024;tile.getContext('2d').drawImage(clothImage,0,0,1024,1024);gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,clothTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);if(host.closest('dialog')?.open)render(currentZoom);};clothImage.src='/assets/camp-canvas.png';
      const groundImage=new Image();groundImage.onload=()=>{
        if(!alive)return;const tile=document.createElement('canvas');tile.width=tile.height=1024;tile.getContext('2d').drawImage(groundImage,0,0,1024,1024);
        gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile);gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');if(anisotropy)gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        gl.useProgram(mesh);gl.uniform1f(textureFlag,1);if(host.closest('dialog')?.open)render(currentZoom);
      };groundImage.src='/assets/desert-ground-texture.png';
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();alive=false;worker?.terminate();canvas.remove();onFailure?.();});
      function acceptWorld(result){if(!alive)return;world=result;gl.bindBuffer(gl.ARRAY_BUFFER,meshBuffer);gl.bufferData(gl.ARRAY_BUFFER,world.vertices,gl.STATIC_DRAW);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,shadeTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,world.shadeSize,world.shadeSize,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,world.shade);ready=true;worker?.terminate();worker=null;onReady?.();}
      // Construct geometry off the UI thread; keep the landscape visible while it loads.
      try{worker=new Worker('/desert-world.js?v=32');worker.onmessage=e=>acceptWorld(e.data);worker.onerror=()=>{worker.terminate();worker=null;setTimeout(()=>acceptWorld(geometry()),0)};worker.postMessage({build:true});}
      catch{setTimeout(()=>acceptWorld(geometry()),0)}
      function render(zoom=1){
        if(!alive||!ready)return;currentZoom=zoom;
        const ratio=Math.min(devicePixelRatio||1,innerWidth<700?1.25:1.5,Math.sqrt(2400000/(innerWidth*innerHeight))),w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        gl.viewport(0,0,w,h);gl.clearColor(.015,.025,.05,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        const sy=Math.sin(state.yaw),cy=Math.cos(state.yaw),sp=Math.sin(state.pitch),cp=Math.cos(state.pitch);
        const eye=[state.x,ground(state.x,state.z)+(state.seated?1.03:1.72),state.z],right=[cy,0,sy],up=[-sy*sp,cp,cy*sp],forward=[sy*cp,sp,-cy*cp];
        const lens=Math.tan(clamp(68/Math.sqrt(Math.max(.65,zoom)),45,84)*Math.PI/360);
        function uniforms(i){gl.useProgram(i.p);gl.uniform3fv(i.uniform.eye,eye);gl.uniform3fv(i.uniform.right,right);gl.uniform3fv(i.uniform.up,up);gl.uniform3fv(i.uniform.forward,forward);gl.uniform1f(i.uniform.aspect,w/h);gl.uniform1f(i.uniform.lens,lens);gl.uniform1f(i.uniform.night,Number(camp.night));gl.uniform1f(i.uniform.time,time);gl.uniform1f(i.uniform.fireOn,Number(camp.fireOn));gl.uniform1f(i.uniform.lanternOn,Number(camp.lanternOn));gl.uniform1f(i.uniform.tentOpen,Number(camp.tentOpen));gl.uniform3fv(i.uniform.firePosition,CAMP.fire);gl.uniform3fv(i.uniform.lanternPosition,[-4.25,CAMP.tent[1]+.47,-9.22]);}
        gl.disable(gl.DEPTH_TEST);uniforms(skyInfo);gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);
        for(let i=0;i<3;i++)gl.disableVertexAttribArray(i);
        gl.enableVertexAttribArray(skyInfo.position);gl.vertexAttribPointer(skyInfo.position,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);
        gl.enable(gl.DEPTH_TEST);uniforms(meshInfo);gl.bindBuffer(gl.ARRAY_BUFFER,meshBuffer);
        for(const [loc,size,offset]of [[meshInfo.position,3,0],[meshInfo.normal,3,12],[meshInfo.material,2,24]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,32,offset);}
        gl.drawArrays(gl.TRIANGLES,0,world.vertices.length/8);
        if(camp.fireOn&&Math.hypot(state.x,state.z+8)<100){
          gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
          uniforms(fireInfo);gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);for(let i=0;i<3;i++)gl.disableVertexAttribArray(i);gl.enableVertexAttribArray(fireInfo.position);gl.vertexAttribPointer(fireInfo.position,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);
          uniforms(emberInfo);gl.bindBuffer(gl.ARRAY_BUFFER,emberBuffer);for(let i=0;i<3;i++)gl.disableVertexAttribArray(i);gl.enableVertexAttribArray(emberInfo.position);gl.vertexAttribPointer(emberInfo.position,1,gl.FLOAT,false,0,0);gl.drawArrays(gl.POINTS,0,28);
          gl.depthMask(true);gl.disable(gl.BLEND);
        }
      }
      return {canvas,state,camp,points:CAMP,render,
        setCamp(patch){Object.assign(camp,patch);render(currentZoom);},
        tick(dt){if(camp.fireOn){time+=Math.min(dt,.1);return Math.hypot(state.x,state.z+8)<75;}return false;},
        project(point){const sy=Math.sin(state.yaw),cy=Math.cos(state.yaw),sp=Math.sin(state.pitch),cp=Math.cos(state.pitch),p=[point[0]-state.x,point[1]-ground(state.x,state.z)-(state.seated?1.03:1.72),point[2]-state.z];const d=p[0]*sy*cp+p[1]*sp-p[2]*cy*cp,lens=Math.tan(clamp(68/Math.sqrt(Math.max(.65,currentZoom)),45,84)*Math.PI/360);return {x:innerWidth/2+(p[0]*cy+p[2]*sy)/d/lens*innerHeight/2,y:innerHeight/2-(-p[0]*sy*sp+p[1]*cp+p[2]*cy*sp)/d/lens*innerHeight/2,depth:d,distance:Math.hypot(...p)};},
        visit(place){const positions={fire:[0,-5.15,0,-.14],tent:[-4.5,-6.25,0,.03],telescope:[3.5,-10.6,0,.13],camp:[0,-2.8,0,.025]};const p=positions[place]||positions.camp;Object.assign(state,{x:p[0],z:p[1],yaw:p[2],pitch:p[3],edge:false,seated:place==='fire'});render(currentZoom);},
        get ready(){return ready;},
        look(dx,dy){state.yaw=(state.yaw-dx*.0035)%TAU;state.pitch=clamp(state.pitch+dy*.003,-1.4,1.4);},
        turn(yaw,pitch){state.yaw=(state.yaw+yaw)%TAU;state.pitch=clamp(state.pitch+pitch,-1.4,1.4);},
        move:(forward,side,dt,fast)=>ready&&move(state,forward,side,dt,fast,world.obstacles),
        reset(){Object.assign(state,camera());}
      };
    }catch(error){canvas.remove();gl.getExtension('WEBGL_lose_context')?.loseContext();console.warn('Desert view unavailable:',error.message);return null;}
  }
  if(typeof window!=='undefined')window.ParallaxDesert={create};
  else if(typeof self!=='undefined')self.onmessage=()=>{const world=geometry();self.postMessage(world,[world.vertices.buffer,world.shade.buffer]);};
  // Pure movement and terrain helpers also support non-browser regression checks.
  if(typeof module!=='undefined'&&module.exports)module.exports={ground,height,move,camera,geometry,CAMP,shaders:{skyVertex,skyFragment,meshVertex,meshFragment,fireVertex,fireFragment,emberVertex,emberFragment}};
})();
