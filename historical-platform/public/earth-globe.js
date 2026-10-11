/* Locally hosted globe textures; analytic 3D sphere rendered in one WebGL pass. */
(()=>{
 const host=document.querySelector('.photographic');if(!host)return;
 const canvas=document.createElement('canvas');canvas.className='earth-globe';canvas.setAttribute('aria-hidden','true');
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});if(!gl)return;
 let stopped=false,raf=0;
 const fallback=()=>{stopped=true;cancelAnimationFrame(raf);document.body.classList.remove('globe-ready');canvas.remove()};
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback()});
 const vertex=`attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}`;
 const fragment=`precision highp float;
 uniform vec2 resolution;uniform float time;uniform sampler2D dayMap;uniform sampler2D nightMap;uniform sampler2D cloudMap;
 const float PI=3.14159265359;
 vec2 uvFor(vec3 n,float spin){return vec2(fract(atan(n.x,n.z)/(2.*PI)+.5+spin),acos(clamp(n.y,-1.,1.))/PI);}
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){
 vec2 screen=vec2(gl_FragCoord.x,resolution.y-gl_FragCoord.y);
 float scale=max(resolution.x/1672.,resolution.y/941.);
 vec2 p=(screen-resolution*.5)/scale+vec2(836.,470.5);
 vec2 xy=(p-vec2(1240.,1035.))/930.;xy.y=-xy.y;
 float rr=dot(xy,xy);vec3 light=normalize(vec3(.8,.5,.65));
 vec3 col=vec3(.003,.007,.013);
 vec2 cell=floor(p/4.);float star=step(.9985,hash(cell));float spot=1.-smoothstep(.15,.65,length(fract(p/4.)-.5));col+=vec3(.55,.68,.85)*star*spot*.65;
 if(rr<1.){
 vec3 n=vec3(xy,sqrt(1.-rr));
 // A small axial tilt makes polar terrain and the rotating limb feel dimensional.
 float a=.12;vec3 tilted=vec3(n.x*cos(a)+n.y*sin(a),-n.x*sin(a)+n.y*cos(a),n.z);
 vec2 uv=uvFor(tilted,time/180.);
 vec3 tex=texture2D(dayMap,uv).rgb;float lum=dot(tex,vec3(.2126,.7152,.0722));tex=mix(vec3(lum),tex,.78);vec3 surface=pow(tex,vec3(2.2));float sun=dot(n,light);float daylight=smoothstep(-.12,.35,sun);
 col=surface*(.008+1.25*max(sun,0.));
 vec3 city=texture2D(nightMap,uv).rgb;float intensity=smoothstep(.28,.75,max(city.r,max(city.g,city.b)));
 col+=pow(city,vec3(2.2))*intensity*(1.-daylight)*.65*(.98+.02*sin(time*.6+uv.x*90.));
 float ocean=smoothstep(.03,.12,tex.b-tex.r)*(1.-smoothstep(.28,.5,tex.r));float spec=pow(max(dot(reflect(-light,n),vec3(0.,0.,1.)),0.),65.);
 col+=vec3(.7,.8,.9)*spec*ocean*.13;
 vec3 cn=normalize(vec3(xy/1.008,sqrt(max(0.,1.-rr/1.016))));vec2 cuv=uvFor(vec3(cn.x*cos(a)+cn.y*sin(a),-cn.x*sin(a)+cn.y*cos(a),cn.z),time/171.+.015);
 vec4 cloud=texture2D(cloudMap,cuv);float cover=smoothstep(.06,.9,cloud.r)*.94;float shadow=texture2D(cloudMap,cuv+vec2(.0015,-.001)).r;col*=1.-shadow*.22*daylight;
 col=mix(col,vec3(.92,.96,1.)*(.012+1.05*max(dot(cn,light),0.)),cover);
 float rim=pow(1.-n.z,5.5);col+=vec3(.018,.10,.28)*rim*(.08+.4*daylight);col=pow(max(col,vec3(0.)),vec3(1./2.2));
 }else{
 float glow=exp(-(sqrt(rr)-1.)*160.);col+=vec3(.06,.23,.48)*glow*.4;
 }
 gl_FragColor=vec4(col,1.);
 }`;
 try{
 const compile=(type,src)=>{const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error('Globe shader unavailable');return sh};
 const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Globe shader link failed');gl.useProgram(program);
 const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const location=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
 const size=gl.getUniformLocation(program,'resolution'),clock=gl.getUniformLocation(program,'time');
 const load=(file,unit,name)=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{try{const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);let source=img;const cap=Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE),innerWidth<700?2048:4096);if(img.width>cap){const scaled=document.createElement('canvas');scaled.width=cap;scaled.height=Math.round(img.height*cap/img.width);scaled.getContext('2d').drawImage(img,0,0,scaled.width,scaled.height);source=scaled}gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(program,name),unit);resolve()}catch(e){reject(e)}};img.onerror=reject;img.src='/assets/globe/'+file});
 const quality=innerWidth<700?'2k':'8k';Promise.all([load(quality+'_earth_daymap.jpg',0,'dayMap'),load(quality+'_earth_nightmap.jpg',1,'nightMap'),load(quality+'_earth_clouds.jpg',2,'cloudMap')]).then(()=>{
 if(stopped)return;host.prepend(canvas);let elapsed=0,last=0,drawn=0;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const resize=()=>{const ratio=Math.min(devicePixelRatio||1,1.75),w=Math.round(innerWidth*ratio),h=Math.round(innerHeight*ratio);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h)}gl.uniform2f(size,w,h)};
 const draw=()=>{resize();gl.uniform1f(clock,elapsed);gl.drawArrays(gl.TRIANGLES,0,6)};draw();if(gl.getError()!==gl.NO_ERROR){fallback();return}document.body.classList.add('globe-ready');
 function frame(t){if(stopped)return;const delta=last?Math.min((t-last)/1000,.1):0;last=t;if(!document.hidden&&!reduced.matches&&!document.body.classList.contains('motion-paused')){elapsed+=delta;if(t-drawn>33){draw();drawn=t}}raf=requestAnimationFrame(frame)}
 addEventListener('resize',draw);raf=requestAnimationFrame(frame);
 }).catch(fallback);
 }catch{fallback()}
})();
