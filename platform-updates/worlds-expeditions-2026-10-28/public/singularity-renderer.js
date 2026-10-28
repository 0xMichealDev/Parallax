/* Shared procedural 3D Singularity: a spherical horizon and a depth-tested accretion disk.
   The canvas outside the geometry stays transparent. No photograph or background plate. */
(()=>{'use strict';
 const surface=document.createElement('canvas');
 const palettes={original:{name:'Event horizon',accent:'#a8cfff',tint:[.47,.69,1]},ion:{name:'Ion veil',accent:'#90edcf',tint:[.25,1,.73]},gold:{name:'Golden eclipse',accent:'#edc88c',tint:[1,.65,.24]}};
 let failed=false,lost=false,gl=null,program=null,uniforms=null;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const notify=()=>window.dispatchEvent(new CustomEvent('parallax:singularity-ready'));
 const vertex='attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
 const fragment=`precision highp float;
 uniform vec2 resolution;uniform float time;uniform float yaw;uniform float pitch;uniform float energy;uniform vec3 tint;
 vec3 rotateView(vec3 p){
  float cy=cos(yaw),sy=sin(yaw),cp=cos(pitch),sp=sin(pitch);
  p=vec3(cy*p.x+sy*p.z,p.y,-sy*p.x+cy*p.z);
  return vec3(p.x,cp*p.y-sp*p.z,sp*p.y+cp*p.z);
 }
 float grain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(grain(i),grain(i+vec2(1,0)),f.x),mix(grain(i+vec2(0,1)),grain(i+vec2(1,1)),f.x),f.y);}
 void main(){
  vec2 p=(gl_FragCoord.xy/resolution-.5)*4.4;
  float d=length(p),pixel=4.4/resolution.x,core=.72;
  // Analytic ray/sphere intersection. Only the event horizon itself is opaque.
  float sphere=sqrt(max(0.,core*core-dot(p,p)));
  float coverage=1.-smoothstep(core-pixel,core+pixel,d);
  float photon=exp(-abs(d-core-.018)/max(.008,pixel*.7));
  float halo=exp(-max(0.,d-core)*34.)*.12;
  float alpha=max(coverage,photon*.64+halo*(1.-coverage));
  vec3 rim=tint*(photon*.72+pow(clamp(d/core,0.,1.),18.)*.045);
  vec3 color=mix(tint*.55,vec3(.0015,.002,.004)+rim,coverage);
  vec3 premult=color*alpha;
  // Object-space basis transformed by the same orbit camera as the Atlas.
  vec3 normal=rotateView(normalize(vec3(.12,.93,.35)));
  vec3 axis=rotateView(normalize(vec3(.946,0.,-.324)));
  axis=normalize(axis-normal*dot(axis,normal));vec3 tangent=cross(normal,axis);
  float nz=abs(normal.z)<.055?(normal.z<0.?-.055:.055):normal.z;
  // Five slices give the disk thickness, with back/front ordering and sphere occlusion.
  for(int i=0;i<5;i++){
   float layer=(float(i)-2.)*.018*(nz<0.?-1.:1.);
   float z=(layer-dot(normal.xy,p))/nz;
   vec3 hit=vec3(p,z),diskPoint=hit-normal*layer;
   float rad=length(diskPoint);
   float edge=smoothstep(.87,.98,rad)*(1.-smoothstep(1.58,1.90,rad));
   float occult=1.-coverage*(1.-smoothstep(sphere-pixel,sphere+pixel,z));
   float a=atan(dot(diskPoint,tangent),dot(diskPoint,axis));
   float flow=a-time*.20/pow(max(rad,.9),1.5);
   float clouds=noise(vec2(cos(flow)*5.+rad*9.,sin(flow)*5.+rad*4.));
   float strands=.5+.5*sin(rad*136.+clouds*5.+sin(flow*7.+rad*13.)*1.9);
   float streak=pow(.5+.5*sin(flow*9.+rad*28.+clouds*3.),3.);
   float hot=exp(-(rad-.96)*3.5);
   float doppler=.64+.36*(.5+.5*cos(a-.7));
   float density=edge*(.28+.48*strands+.24*streak)*(.8+.2*clouds);
   float da=clamp(density*.47*occult,0.,.72);
   vec3 disk=mix(tint*.48,mix(tint,vec3(1.,.97,.91),.72),clamp(hot*.90+strands*.16,0.,1.));
   disk*=doppler*(.66+strands*.5+streak*.24)*energy;
   premult=premult*(1.-da)+disk*da;alpha=alpha+(1.-alpha)*da;
  }
  // A narrow light ring outside the spherical horizon; no opaque bounding box.
  float gleam=photon*.23*(.6+.4*sin(atan(p.y,p.x)*2.+.8));
  premult+=tint*gleam;alpha=max(alpha,gleam);
  if(d>2.02||alpha<.002){gl_FragColor=vec4(0.);return;}
  gl_FragColor=vec4(clamp(premult/max(alpha,.0001),0.,1.),clamp(alpha,0.,1.));
 }`;
 function setup(){
  if(gl||failed||lost)return;
  try{
   gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,powerPreference:'low-power'});if(!gl)throw Error('No WebGL');
   const compile=(type,code)=>{const shader=gl.createShader(type);gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw Error('Shader unavailable')}return shader};
   const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Program unavailable');gl.useProgram(program);
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
   uniforms=Object.fromEntries(['resolution','time','yaw','pitch','energy','tint'].map(k=>[k,gl.getUniformLocation(program,k)]));
  }catch{failed=true;gl=null;}
 }
 // Canvas fallback also uses projected 3D points, with the back half behind the sphere.
 function fallback(ctx,x,y,r,time,palette,yaw,pitch){
  const cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const view=([a,b,c])=>{const xx=cy*a+sy*c,zz=-sy*a+cy*c;return[xx,cp*b-sp*zz,sp*b+cp*zz]};
  const normal=[.12,.93,.35],len=Math.hypot(...normal);for(let i=0;i<3;i++)normal[i]/=len;
  let axis=[.946,0,-.324],dot=axis.reduce((s,v,i)=>s+v*normal[i],0);axis=axis.map((v,i)=>v-dot*normal[i]);const al=Math.hypot(...axis);axis=axis.map(v=>v/al);
  const tangent=[normal[1]*axis[2]-normal[2]*axis[1],normal[2]*axis[0]-normal[0]*axis[2],normal[0]*axis[1]-normal[1]*axis[0]];
  const ring=(front)=>{for(let j=0;j<20;j++){const rad=.95+j*.043;ctx.lineWidth=r*.018;ctx.strokeStyle=palette.accent;ctx.globalAlpha=(.2+.22*Math.sin(j*2.4)**2)*(1-j/24);for(let i=0;i<90;i++){const a=i*Math.PI*2/90,b=(i+1)*Math.PI*2/90,p=view(axis.map((v,k)=>rad*(v*Math.cos(a)+tangent[k]*Math.sin(a)))),q=view(axis.map((v,k)=>rad*(v*Math.cos(b)+tangent[k]*Math.sin(b))));if((p[2]>=0)!==front)continue;ctx.beginPath();ctx.moveTo(x+p[0]*r,y-p[1]*r);ctx.lineTo(x+q[0]*r,y-q[1]*r);ctx.stroke()}}};
  ctx.save();ring(false);ctx.globalAlpha=1;ctx.beginPath();ctx.arc(x,y,r*.72,0,Math.PI*2);ctx.fillStyle='#010207';ctx.fill();ctx.strokeStyle=palette.accent;ctx.lineWidth=Math.max(.7,r*.015);ctx.stroke();ring(true);ctx.restore();
 }
 function draw(ctx,x,y,r,time=0,options={}){
  if(!ctx||![x,y,r,time].every(Number.isFinite)||r<=0)return false;
  const mode=Object.hasOwn(palettes,options.mode)?options.mode:'original',palette=palettes[mode];
  const angle=clamp(Number(options.angle)||0,-.25,.25),yaw=Number.isFinite(options.yaw)?options.yaw:angle*4-.15,pitch=Number.isFinite(options.pitch)?options.pitch:.28+angle;
  const energy=clamp(Number(options.energy)||1,.4,1.3),size=Math.round(clamp(Number(options.quality)||r*6,128,1280)/32)*32;
  setup();
  if(gl&&!lost){try{
   if(surface.width!==size||surface.height!==size){surface.width=surface.height=size;gl.viewport(0,0,size,size);}
   gl.uniform2f(uniforms.resolution,size,size);gl.uniform1f(uniforms.time,time%4096);gl.uniform1f(uniforms.yaw,yaw);gl.uniform1f(uniforms.pitch,pitch);gl.uniform1f(uniforms.energy,energy);gl.uniform3fv(uniforms.tint,palette.tint);gl.drawArrays(gl.TRIANGLES,0,6);ctx.drawImage(surface,x-r*2.2,y-r*2.2,r*4.4,r*4.4);return 'live';
  }catch{failed=true;gl=null;}}
  fallback(ctx,x,y,r,time,palette,yaw,pitch);return 'illustrated';
 }
 surface.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;gl=null;notify()});surface.addEventListener('webglcontextrestored',()=>{lost=false;failed=false;gl=null;notify()});
 window.ParallaxSingularity={draw,palettes,status:()=>lost||failed?'illustrated':'ready'};
})();
