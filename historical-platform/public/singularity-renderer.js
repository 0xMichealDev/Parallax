/* Shared artistic Singularity renderer. One GPU context; original artwork is the fallback. */
(()=>{'use strict';
 const image=new Image(),surface=document.createElement('canvas'),fallbacks=new Map();
 const palettes={original:{name:'Event horizon',accent:'#a8cfff',tint:[.47,.69,1],mix:0},ion:{name:'Ion veil',accent:'#90edcf',tint:[.25,1,.73],mix:.86},gold:{name:'Golden eclipse',accent:'#edc88c',tint:[1,.65,.24],mix:.92}};
 let loaded=false,failed=false,lost=false,gl=null,program=null,uniforms=null,texture=null;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const notify=()=>window.dispatchEvent(new CustomEvent('parallax:singularity-ready'));
 const vertex='attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
 const fragment=`precision mediump float;
 uniform sampler2D scene;uniform vec2 resolution;uniform float time;uniform float angle;uniform float energy;uniform vec3 tint;uniform float recolor;
 void main(){
   vec2 uv=gl_FragCoord.xy/resolution;vec2 raw=(uv-.5)*vec2(5.4,4.0);
   float ca=cos(angle),sa=sin(angle);vec2 p=mat2(ca,-sa,sa,ca)*raw;
   float r=length(p),a=atan(p.y,p.x);
   float belt=smoothstep(.96,1.22,r)*(1.-smoothstep(2.2,3.1,r));
   float disk=exp(-pow(p.y/.24,2.))*(1.-smoothstep(2.1,3.1,abs(p.x)));
   float eddy=(sin(a*9.+r*8.-time*.42)*.018+sin(a*17.-r*15.+time*.68)*.009)*belt*energy;
   vec2 warped=vec2(cos(a+eddy),sin(a+eddy))*r;
   warped.x+=sin(p.x*15.-time*.6)*.017*disk*energy;
   warped.y+=sin(p.x*11.+time*.43)*.009*disk*energy;
   vec2 source=vec2(.384,.51)+warped*vec2(.18/1.7777778,.18);
   vec3 color=texture2D(scene,source).rgb;
   float flow=sin(a*13.+r*19.-time*1.05),stream=sin(p.x*26.-time*1.7+p.y*22.);
   color*=1.+(.07*flow*belt+.08*stream*disk)*energy;
   float luminance=dot(color,vec3(.2126,.7152,.0722));
   vec3 toned=mix(tint*luminance*1.45,vec3(luminance),smoothstep(.38,.9,luminance));
   color=mix(color,toned,recolor);
   float photon=exp(-pow((r-1.005)/.014,2.));
   color+=tint*photon*.14*energy;
   float alpha=1.-smoothstep(.66,1.,length(raw/vec2(2.7,2.0)));
   gl_FragColor=vec4(color,alpha);
 }`;
 function setup(){
  if(gl||failed||lost||!loaded)return;
  try{
   gl=surface.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,powerPreference:'low-power'});if(!gl)throw Error('No WebGL');
   const compile=(type,code)=>{const shader=gl.createShader(type);gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);throw Error('Shader unavailable')}return shader};
   const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Program unavailable');gl.useProgram(program);
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
   const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
   texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
   for(const p of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,p,gl.CLAMP_TO_EDGE);
   for(const p of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,p,gl.LINEAR);
   uniforms=Object.fromEntries(['scene','resolution','time','angle','energy','tint','recolor'].map(k=>[k,gl.getUniformLocation(program,k)]));gl.uniform1i(uniforms.scene,0);
  }catch{failed=true;gl=null;}
 }
 function illustration(mode){
  if(fallbacks.has(mode))return fallbacks.get(mode);if(!loaded)return null;
  const c=document.createElement('canvas');c.width=960;c.height=711;const ctx=c.getContext('2d');if(!ctx)return null;
  const height=image.naturalHeight||image.height,width=image.naturalWidth||image.width,sw=height*.18*5.4,sh=height*.18*4;
  ctx.drawImage(image,width*.384-sw/2,height*.49-sh/2,sw,sh,0,0,c.width,c.height);
  if(mode!=='original'){ctx.globalCompositeOperation='color';ctx.fillStyle=palettes[mode].accent;ctx.fillRect(0,0,c.width,c.height);}
  ctx.globalCompositeOperation='destination-in';ctx.save();ctx.scale(c.width/2,c.height/2);const mask=ctx.createRadialGradient(1,1,.66,1,1,1);mask.addColorStop(0,'#fff');mask.addColorStop(1,'#ffffff00');ctx.fillStyle=mask;ctx.fillRect(0,0,2,2);ctx.restore();ctx.globalCompositeOperation='source-over';fallbacks.set(mode,c);return c;
 }
 function placeholder(ctx,x,y,r,color){
  ctx.save();const glow=ctx.createRadialGradient(x,y,r*.85,x,y,r*1.7);glow.addColorStop(0,'#000');glow.addColorStop(.22,color+'60');glow.addColorStop(1,color+'00');ctx.fillStyle=glow;ctx.fillRect(x-r*2,y-r*2,r*4,r*4);
  ctx.beginPath();ctx.ellipse(x,y,r*2.1,r*.27,-.07,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=r*.04;ctx.stroke();ctx.beginPath();ctx.arc(x,y,r*.96,0,Math.PI*2);ctx.fillStyle='#010307';ctx.fill();ctx.restore();
 }
 function draw(ctx,x,y,r,time=0,options={}){
  if(!ctx||![x,y,r,time].every(Number.isFinite)||r<=0)return false;
  const mode=Object.hasOwn(palettes,options.mode)?options.mode:'original',palette=palettes[mode];
  const angle=clamp(Number(options.angle)||0,-.25,.25),energy=clamp(Number(options.energy)||1,.4,1.7),size=Math.round(clamp(Number(options.quality)||r*7,128,1600)/32)*32;
  setup();
  if(gl&&!lost){try{
   const height=Math.round(size*4/5.4);if(surface.width!==size||surface.height!==height){surface.width=size;surface.height=height;gl.viewport(0,0,size,height);}
   gl.uniform2f(uniforms.resolution,size,height);gl.uniform1f(uniforms.time,time%4096);gl.uniform1f(uniforms.angle,angle);gl.uniform1f(uniforms.energy,energy);gl.uniform3fv(uniforms.tint,palette.tint);gl.uniform1f(uniforms.recolor,palette.mix);gl.drawArrays(gl.TRIANGLES,0,6);ctx.drawImage(surface,x-r*2.7,y-r*2,r*5.4,r*4);return 'live';
  }catch{failed=true;gl=null;}}
  const art=illustration(mode);if(art){ctx.save();ctx.translate(x,y);ctx.rotate(-angle);ctx.drawImage(art,-r*2.7,-r*2,r*5.4,r*4);ctx.restore();return 'illustrated'}
  placeholder(ctx,x,y,r,palette.accent);return failed?'illustrated':'loading';
 }
 surface.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;gl=null;notify()});surface.addEventListener('webglcontextrestored',()=>{lost=false;failed=false;gl=null;notify()});
 image.onload=()=>{loaded=true;notify()};image.onerror=()=>{failed=true;notify()};image.src='/assets/parallax-singularity.png';
 window.ParallaxSingularity={draw,palettes,status:()=>lost||failed?'illustrated':loaded?'ready':'loading'};
})();
