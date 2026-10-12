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
  function height(x, z) {
    return (noise(x * .014 + 3, z * .014 + 7) - .5) * 6 +
      (noise(x * .047, z * .047) - .5) * 1.1 + (noise(x * .16, z * .16) - .5) * .2;
  }
  // Match the triangle mesh exactly, so the camera follows the ground.
  function ground(x, z) {
    const bx = Math.floor(x / STEP) * STEP, bz = Math.floor(z / STEP) * STEP;
    const u = (x - bx) / STEP, v = (z - bz) / STEP;
    const a = height(bx, bz), b = height(bx + STEP, bz), c = height(bx, bz + STEP), d = height(bx + STEP, bz + STEP);
    return u + v <= 1 ? a + u * (b - a) + v * (c - a) : d + (1 - u) * (c - d) + (1 - v) * (b - d);
  }
  function camera() { return { x: 0, z: 0, yaw: 0, pitch: .025, distance: 0, edge: false }; }
  function move(state, forward, side, dt, fast, obstacles) {
    const length = Math.hypot(forward, side); if (!length) { state.edge = false; return false; }
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
    uniform float aspect; uniform float lens;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    vec3 sky(vec3 d){
      float h=max(d.y,0.); float sunset=pow(max(dot(normalize(d.xz),normalize(vec2(.35,-1.))),0.),12.);
      vec3 c=mix(vec3(.115,.15,.23),vec3(.009,.023,.059),pow(clamp(h*1.5,0.,1.),.48));
      c+=vec3(.49,.18,.065)*exp(-h*13.)*sunset;
      c+=vec3(.12,.038,.033)*exp(-h*4.)*sunset;
      return c;
    }
  `;
  const skyVertex = 'attribute vec2 position; varying vec2 uv; void main(){uv=position;gl_Position=vec4(position,.9999,1.);}';
  const skyFragment = common + `
    varying vec2 uv;
    void main(){
      vec3 d=normalize(forward+right*uv.x*aspect*lens+up*uv.y*lens); vec3 col=sky(d);
      vec2 stars=vec2(atan(d.x,-d.z),asin(d.y))*430.; vec2 cell=floor(stars);
      float star=step(.9983,hash(cell))*(1.-smoothstep(.05,.45,length(fract(stars)-.5)));
      col+=vec3(.50,.60,.74)*star*smoothstep(.1,.6,d.y)*.58;
      if(d.y>.015){vec2 p=d.xz/(d.y+.24);float n=noise(p*2.1)+.35*noise(p*7.);float cloud=smoothstep(.72,1.05,n)*exp(-d.y*3.)*.16;col=mix(col,vec3(.14,.13,.18),cloud);}
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
  const meshFragment = common + `
    varying vec3 point; varying vec3 norm; varying vec2 kind;
    uniform sampler2D groundMap; uniform float textured;
    void main(){
      vec3 n=normalize(norm); vec3 d=normalize(point-eye); float dist=length(point-eye);
      float grain=noise(point.xz*3.2); float detail=noise(point.xz*19.);
      vec3 base=mix(vec3(.22,.185,.155),vec3(.38,.30,.225),noise(point.xz*.45));
      base*=.68+.32*grain+.14*detail;
      vec3 groundColor=texture2D(groundMap,point.xz*.22).rgb;
      base=mix(base,groundColor*(.72+.25*noise(point.xz*.13)),textured);
      n=normalize(n+vec3((grain-.5)*.12,0.,(detail-.5)*.08));
      if(kind.x>.5&&kind.x<1.5)base=vec3(.245,.205,.185)*(.6+.45*grain);
      if(kind.x>1.5&&kind.x<2.5)base=vec3(.095,.145,.104)*(.82+.18*sin((point.x+point.z)*90.));
      if(kind.x>2.5&&kind.x<3.5)base=vec3(.15,.155,.108)*(.65+.35*grain);
      if(kind.x>3.5)base=mix(vec3(.12,.14,.18),vec3(.21,.185,.18),noise(point.xz*.08));
      float light=max(dot(n,normalize(vec3(.35,.18,-1.))),0.);
      vec3 color=base*(vec3(.31,.40,.56)+light*vec3(.68,.40,.22));
      color*=.8+kind.y*.32;
      float fog=1.-exp(-dist*.00165); color=mix(color,sky(d)*.68,clamp(fog,0.,.92));
      gl_FragColor=vec4(color,1.);
    }
  `;
  function geometry() {
    const data = [], obstacles = [];
    const gridSize=HALF*2/STEP+1, heights=new Float32Array(gridSize*gridSize),normals=[];
    for(let z=0;z<gridSize;z++)for(let x=0;x<gridSize;x++)heights[z*gridSize+x]=height(x*STEP-HALF,z*STEP-HALF);
    for(let z=0;z<gridSize;z++)for(let x=0;x<gridSize;x++){
      const nx=heights[z*gridSize+Math.max(0,x-1)]-heights[z*gridSize+Math.min(gridSize-1,x+1)];
      const nz=heights[Math.max(0,z-1)*gridSize+x]-heights[Math.min(gridSize-1,z+1)*gridSize+x];
      const l=Math.hypot(nx,STEP*2,nz);normals.push([nx/l,STEP*2/l,nz/l]);
    }
    let seed = 49871; const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    function tri(a,b,c,kind,tone=.5,smooth=false) {
      const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
      let n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
      const len=Math.hypot(...n)||1;n=n.map(v=>v/len);
      for(const p of [a,b,c]){
        let normal=n;
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
      const sides=10, rings=[];
      for(let j=0;j<points.length;j++){
        const prev=points[Math.max(0,j-1)],next=points[Math.min(points.length-1,j+1)];
        const tangent=next.map((v,i)=>v-prev[i]),length=Math.hypot(...tangent);for(let i=0;i<3;i++)tangent[i]/=length;
        const axis=[tangent[1],-tangent[0],0],alen=Math.hypot(...axis)||1;for(let i=0;i<3;i++)axis[i]/=alen;
        const cross=[tangent[1]*axis[2]-tangent[2]*axis[1],tangent[2]*axis[0]-tangent[0]*axis[2],tangent[0]*axis[1]-tangent[1]*axis[0]];
        const r=j===points.length-1?radius*.15:radius;
        rings.push(Array.from({length:sides},(_,i)=>{const a=i/sides*TAU;return points[j].map((v,k)=>v+r*(Math.cos(a)*axis[k]+Math.sin(a)*cross[k]))}));
      }
      for(let j=0;j<rings.length-1;j++)for(let i=0;i<sides;i++){
        const a=rings[j][i],b=rings[j][(i+1)%sides],c=rings[j+1][i],d=rings[j+1][(i+1)%sides];tri(a,c,b,kind,tone);tri(b,c,d,kind,tone);
      }
    }
    function cactus(x,z,size){
      const y=ground(x,z),h=size*3.5,r=size*.21,tone=rand();
      tube([[x,y,z],[x,y+h*.4,z],[x+.05,y+h*.92,z],[x+.05,y+h,z]],r,2,tone);
      for(const side of [-1,1]){const low=h*(side===1?.36:.53),reach=size*(side===1?.85:.7);
        tube([[x,y+low,z],[x+reach*side,y+low+.15,z],[x+reach*side,y+low+size*.5,z],[x+reach*side,y+low+size*1.45,z]],r*.72,2,tone);}
      obstacles.push({x,z,radius:r+.18});
    }
    // A few nearby silhouettes establish scale, with more vegetation down-valley.
    cactus(-7,-14,1.35);cactus(11,-24,1.7);cactus(-16,10,1.1);
    for(let i=0;i<145;i++){const angle=rand()*TAU,r=20+rand()*275;cactus(Math.sin(angle)*r,Math.cos(angle)*r,.5+rand()*1.25);}
    for(let i=0;i<600;i++){
      const x=(rand()-.5)*560,z=(rand()-.5)*560;if(Math.hypot(x,z)<4)continue;
      const y=ground(x,z),r=.12+Math.pow(rand(),3)*1.5,tone=rand();
      const ring=Array.from({length:7},(_,j)=>{const a=j/7*TAU;return [x+Math.cos(a)*r*(.7+rand()*.4),y+r*(.15+rand()*.22),z+Math.sin(a)*r*(.7+rand()*.4)];});
      const top=[x+r*.1,y+r*.85,z-r*.14];
      for(let j=0;j<7;j++){tri(ring[j],top,ring[(j+1)%7],1,tone);tri([ring[j][0],y-.1,ring[j][2]],ring[j],ring[(j+1)%7],1,tone);}
      if(r>.55)obstacles.push({x,z,radius:r*.8});
    }
    for(let i=0;i<460;i++){
      const x=(rand()-.5)*550,z=(rand()-.5)*550,y=ground(x,z),r=.25+rand()*.65;
      for(let j=0;j<5;j++){const a=rand()*TAU;const dx=Math.cos(a)*r,dz=Math.sin(a)*r;tri([x-dz*.1,y,z+dx*.1],[x+dx,y+r*(.6+rand()),z+dz],[x+dz*.1,y,z-dx*.1],3,rand());}
    }
    return { vertices:new Float32Array(data),obstacles };
  }
  function create(host,onFailure,onReady) {
    const canvas=document.createElement('canvas');canvas.id='u-desert';canvas.setAttribute('aria-hidden','true');
    const gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'low-power'});
    if(!gl)return null;
    let alive=true,currentZoom=1,ready=false,worker=null;const state=camera();
    function program(v,f){const p=gl.createProgram();for(const [type,src] of [[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);gl.deleteShader(s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
    try{
      const sky=program(skyVertex,skyFragment),mesh=program(meshVertex,meshFragment);let world={vertices:new Float32Array(0),obstacles:[]};
      const skyBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const meshBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,meshBuffer);gl.bufferData(gl.ARRAY_BUFFER,world.vertices,gl.STATIC_DRAW);
      const info=p=>({p,position:gl.getAttribLocation(p,'position'),normal:gl.getAttribLocation(p,'normal'),material:gl.getAttribLocation(p,'material'),uniform:Object.fromEntries(['eye','right','up','forward','aspect','lens'].map(n=>[n,gl.getUniformLocation(p,n)]))});
      const skyInfo=info(sky),meshInfo=info(mesh);host.append(canvas);
      const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([100,83,65,255]));
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      const textureFlag=gl.getUniformLocation(mesh,'textured');gl.useProgram(mesh);gl.uniform1i(gl.getUniformLocation(mesh,'groundMap'),0);gl.uniform1f(textureFlag,0);
      const groundImage=new Image();groundImage.onload=()=>{
        if(!alive)return;const tile=document.createElement('canvas');tile.width=tile.height=1024;tile.getContext('2d').drawImage(groundImage,0,0,1024,1024);
        gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile);gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
        const anisotropy=gl.getExtension('EXT_texture_filter_anisotropic');if(anisotropy)gl.texParameterf(gl.TEXTURE_2D,anisotropy.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(8,gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        gl.useProgram(mesh);gl.uniform1f(textureFlag,1);if(host.closest('dialog')?.open)render(currentZoom);
      };groundImage.src='/assets/desert-ground-texture.png';
      canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();alive=false;worker?.terminate();canvas.remove();onFailure?.();});
      function acceptWorld(result){if(!alive)return;world=result;gl.bindBuffer(gl.ARRAY_BUFFER,meshBuffer);gl.bufferData(gl.ARRAY_BUFFER,world.vertices,gl.STATIC_DRAW);ready=true;worker?.terminate();worker=null;onReady?.();}
      // Construct geometry off the UI thread; keep the landscape visible while it loads.
      try{worker=new Worker('/desert-world.js?v=30');worker.onmessage=e=>acceptWorld(e.data);worker.onerror=()=>{worker.terminate();worker=null;setTimeout(()=>acceptWorld(geometry()),0)};worker.postMessage({build:true});}
      catch{setTimeout(()=>acceptWorld(geometry()),0)}
      function render(zoom=1){
        if(!alive||!ready)return;currentZoom=zoom;
        const ratio=Math.min(devicePixelRatio||1,innerWidth<700?1.25:1.5),w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);
        if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
        gl.viewport(0,0,w,h);gl.clearColor(.015,.025,.05,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        const sy=Math.sin(state.yaw),cy=Math.cos(state.yaw),sp=Math.sin(state.pitch),cp=Math.cos(state.pitch);
        const eye=[state.x,ground(state.x,state.z)+1.72,state.z],right=[cy,0,sy],up=[-sy*sp,cp,cy*sp],forward=[sy*cp,sp,-cy*cp];
        const lens=Math.tan(clamp(68/Math.sqrt(Math.max(.65,zoom)),45,84)*Math.PI/360);
        function uniforms(i){gl.useProgram(i.p);gl.uniform3fv(i.uniform.eye,eye);gl.uniform3fv(i.uniform.right,right);gl.uniform3fv(i.uniform.up,up);gl.uniform3fv(i.uniform.forward,forward);gl.uniform1f(i.uniform.aspect,w/h);gl.uniform1f(i.uniform.lens,lens);}
        gl.disable(gl.DEPTH_TEST);uniforms(skyInfo);gl.bindBuffer(gl.ARRAY_BUFFER,skyBuffer);
        for(let i=0;i<3;i++)gl.disableVertexAttribArray(i);
        gl.enableVertexAttribArray(skyInfo.position);gl.vertexAttribPointer(skyInfo.position,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);
        gl.enable(gl.DEPTH_TEST);uniforms(meshInfo);gl.bindBuffer(gl.ARRAY_BUFFER,meshBuffer);
        for(const [loc,size,offset]of [[meshInfo.position,3,0],[meshInfo.normal,3,12],[meshInfo.material,2,24]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,32,offset);}
        gl.drawArrays(gl.TRIANGLES,0,world.vertices.length/8);
      }
      return {canvas,state,render,get ready(){return ready;},
        look(dx,dy){state.yaw=(state.yaw-dx*.0035)%TAU;state.pitch=clamp(state.pitch+dy*.003,-1.4,1.4);},
        turn(yaw,pitch){state.yaw=(state.yaw+yaw)%TAU;state.pitch=clamp(state.pitch+pitch,-1.4,1.4);},
        move:(forward,side,dt,fast)=>ready&&move(state,forward,side,dt,fast,world.obstacles),
        reset(){Object.assign(state,camera());}
      };
    }catch(error){canvas.remove();gl.getExtension('WEBGL_lose_context')?.loseContext();console.warn('Desert view unavailable:',error.message);return null;}
  }
  if(typeof window!=='undefined')window.ParallaxDesert={create};
  else if(typeof self!=='undefined')self.onmessage=()=>{const world=geometry();self.postMessage(world,[world.vertices.buffer]);};
  // Pure movement and terrain helpers also support non-browser regression checks.
  if(typeof module!=='undefined'&&module.exports)module.exports={ground,height,move,camera,geometry,shaders:{skyVertex,skyFragment,meshVertex,meshFragment}};
})();
