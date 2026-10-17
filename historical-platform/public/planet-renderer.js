/* Shared real-time planet renderer for Studio, Premium, public worlds and PNGs. */
(()=>{'use strict';
const vertex=`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
const fragment=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap,uCloud,uNight;
uniform vec3 uAccent,uLight;
uniform vec3 uBrandPrimary,uBrandSecondary,uBrandRing;
uniform float uBrandEnabled,uAtlas,uAir,uPluto,uPixel;
uniform float uTime,uSurface,uMaterial,uRings,uWeather,uAtmosphere,uHasMap,uHasCloud,uHasNight;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,v=0.;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec3(8.2,3.7,1.4);a*=.5;}return v;}
vec3 rotateY(vec3 p,float a){return vec3(cos(a)*p.x+sin(a)*p.z,p.y,-sin(a)*p.x+cos(a)*p.z);}
vec2 sphereUV(vec3 p){return vec2(fract(atan(p.z,p.x)/6.2831853+.5),acos(clamp(p.y,-1.,1.))/3.14159265);}
void main(){
 vec2 p=(vUv-.5)*4.1;float rr=dot(p,p),d=sqrt(rr),z=sqrt(max(0.,1.-rr));vec3 col=vec3(0.);float alpha=0.;
 vec3 atm=mix(vec3(.22,.55,1.),uAccent,.48);float strength=1.+uAtmosphere*.36;
 if(uAtlas>.5){atm=mix(uAccent,vec3(.55,.72,.86),.18);strength=uAir;}
 if(uBrandEnabled>.5)atm=mix(uBrandPrimary,uBrandSecondary,.18);
 if(rr>1.){float halo=exp(-(d-1.)*21.)*.32*strength;halo+=exp(-(d-1.)*7.)*.028;
 if(uAtlas>.5)halo=(exp(-(d-1.)*55.)*.20+exp(-(d-1.)*18.)*.018)*uAir;float side=.35+.65*max(0.,dot(normalize(vec3(p,.1)),uLight));col=atm;alpha=halo*side;}
 if(rr<=1.){
  vec3 n=vec3(p,z),rot=rotateY(n,uTime*.15),material=rot;vec2 uv=sphereUV(rot);float light=dot(n,uLight),day=smoothstep(-.12,.2,light),diff=max(0.,light);
  vec3 tex=mix(vec3(.25,.36,.42),texture2D(uMap,uv).rgb,uHasMap);
  // Pluto's source mosaic has no southern coverage. Blend into an explicitly
  // credited artistic continuation; never show the missing-data mask as terrain.
  if(uPluto>.5&&uHasMap>.5){
   float terrain=fbm(material*8.),grain=fbm(material*65.);
   vec3 fill=mix(vec3(.31,.24,.20),vec3(.65,.57,.49),smoothstep(.25,.75,terrain))*(.86+.26*grain);
   vec3 observed=texture2D(uMap,vec2(uv.x,min(uv.y,.60))).rgb;
   tex=mix(observed,fill,smoothstep(.50,.66,uv.y));
  }
  vec3 base=pow(tex,vec3(2.2));vec3 emission=vec3(0.);float spec=0.;
  if(uMaterial<.5){if(uAtlas<.5)base=mix(base,base*uAccent*1.8,.17);if(uSurface<.5){float ocean=smoothstep(.025,.13,tex.b-max(tex.r,tex.g)*.7);spec=pow(max(0.,dot(reflect(-uLight,n),vec3(0,0,1))),48.)*ocean*.55;emission=pow(texture2D(uNight,uv).rgb,vec3(1.3))*vec3(1.,.68,.32)*(1.-day)*uHasNight*.8;}}
  if(uMaterial>.5&&uMaterial<1.5){float land=fbm(material*5.);float cracks=1.-smoothstep(.014,.065,abs(fbm(material*12.+land*4.)-.49));base=mix(vec3(.018,.012,.02),vec3(.17,.065,.025),land);emission=mix(vec3(1.,.11,.008),vec3(1.,.55,.08),cracks)*pow(cracks,2.)*(1.2+.15*sin(uTime+land*20.));}
  if(uMaterial>1.5&&uMaterial<2.5){float ice=fbm(material*6.);float seams=1.-smoothstep(.01,.055,abs(fbm(material*18.)-.51));base=mix(vec3(.025,.13,.25),vec3(.62,.82,.87),smoothstep(.3,.65,ice));base*=1.-seams*.5;emission=vec3(.05,.55,1.)*seams*.24;spec=pow(max(0.,dot(reflect(-uLight,n),vec3(0,0,1))),65.)*.75;}
  if(uMaterial>2.5){float islands=fbm(material*4.8);float coast=1.-smoothstep(.005,.045,abs(islands-.52));float cells=pow(noise(material*180.),14.);base=mix(vec3(.005,.025,.06),vec3(.01,.15,.12),smoothstep(.48,.55,islands));emission=(vec3(.06,1.,.64)*coast*.7+vec3(.25,.5,1.)*cells*.8)*(1.-day*.5);spec=pow(max(0.,dot(reflect(-uLight,n),vec3(0,0,1))),42.)*.3;}
  // Ecosystem palettes are opt-in. Existing creator materials retain their original colors.
  if(uBrandEnabled>.5){
   vec3 primary=pow(uBrandPrimary,vec3(2.2)),secondary=pow(uBrandSecondary,vec3(2.2));
   if(uMaterial<.5){float band=dot(tex,vec3(.2126,.7152,.0722));base=mix(secondary*.24,primary,smoothstep(.12,.82,band));}
   else if(uMaterial<1.5){float terrain=fbm(material*5.);float lava=1.-smoothstep(.014,.065,abs(fbm(material*12.+terrain*4.)-.49));base=mix(secondary*.012,primary*.16,terrain);emission=mix(secondary,primary,lava)*pow(lava,2.)*(1.25+.15*sin(uTime+terrain*20.));}
   else if(uMaterial<2.5){float ice=fbm(material*6.);float seams=1.-smoothstep(.01,.055,abs(fbm(material*18.)-.51));base=mix(secondary*.23,primary,smoothstep(.25,.65,ice))*(1.-seams*.45);emission=primary*seams*.22;spec*=.45;}
   else{float islands=fbm(material*4.8);float coast=1.-smoothstep(.005,.045,abs(islands-.52));float cells=pow(noise(material*180.),14.);base=mix(secondary*.22,primary*.24,smoothstep(.48,.55,islands));emission=(primary*coast*.9+secondary*cells*1.3)*(1.-day*.5);}
  }
  if(uAtlas<.5){float relief=fbm(material*35.);base*=.83+.35*relief;}
  col=base*(.025+diff*1.28)+spec*vec3(.9,.94,1.)+emission;
  if(uAtlas>.5){float fill=.045+.045*z,softDiffuse=.5*(light+sqrt(light*light+.035));col=base*(fill+softDiffuse*1.12)+spec*vec3(.83,.91,1.)*.6+emission*.7;}
  if(uWeather>.5&&uHasCloud>.5){vec2 cuv=sphereUV(rotateY(n,uTime*.165));vec4 cloud=texture2D(uCloud,cuv);float c=pow(cloud.r,1.3)*(uAtlas>.5?.58:.8);col=mix(col,vec3(.74,.83,.93)*(.08+diff),c*(uMaterial>.5?.4:1.));}
  float rim=pow(1.-z,3.7)*(.16+diff*.85)*strength;if(uAtlas>.5)rim=pow(1.-z,5.)*(.025+diff*.20)*uAir;col+=atm*rim;col=pow(max(col,vec3(0.)),vec3(.4545));alpha=1.-smoothstep(uAtlas>.5?1.-uPixel:.993,1.,d);
 }
 if(uRings>.5){
  vec3 rn=normalize(vec3(.22,.81,.43));float rz=-(rn.x*p.x+rn.y*p.y)/rn.z;float rad=length(vec3(p,rz));
  float outer=uRings<1.5?1.51:uRings<2.5?1.86:1.95;
  float ring=smoothstep(1.24,1.27,rad)*(1.-smoothstep(outer-.025,outer,rad));
  if(uRings>2.5&&uRings<3.5)ring*=1.-smoothstep(.015,.045,abs(rad-1.59));
  else if(uRings>3.5&&uRings<4.5)ring*=1.-smoothstep(.018,.04,min(abs(rad-1.42),abs(rad-1.82)));
  else ring*=.35+.65*pow(.5+.5*sin(rad*240.+sin(rad*83.)*2.),2.);
  ring*=1.-(smoothstep(1.60,1.61,rad)*(1.-smoothstep(1.64,1.65,rad)));
  if(uRings>4.5){ring*=.3+.7*noise(vec3(p*250.,rz*220.));}
  if(rr<1.&&rz<z)ring=0.;
  vec3 rp=vec3(p,rz);float along=dot(rp,uLight);float shadow=along<0.&&dot(rp,rp)-along*along<1.?.13:1.;
  vec3 ringCol=mix(vec3(.74,.69,.58),uAccent,.37)*shadow*(.7+.3*sin(rad*180.));if(uRings>2.5&&uRings<4.5)ringCol=uAccent*1.2;
  if(uBrandEnabled>.5)ringCol=uBrandRing*shadow*(.76+.24*sin(rad*180.));
  float ra=ring*(uRings>2.5?.92:.8);col=(col*alpha*(1.-ra)+ringCol*ra)/max(.0001,alpha*(1.-ra)+ra);alpha=alpha+(1.-alpha)*ra;
 }
 gl_FragColor=vec4(col,clamp(alpha,0.,1.));
}`;
let gl=null,canvas=null,program=null,failed=false;const uniforms={},images=new Map(),textures=new Map();
function init(){if(gl)return true;if(failed)return false;try{canvas=document.createElement('canvas');canvas.width=canvas.height=1536;gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false,depth:false});if(!gl)throw Error();const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error();gl.useProgram(program);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);for(const name of ['uAtlas','uAir','uPluto','uPixel','uBrandEnabled','uBrandPrimary','uBrandSecondary','uBrandRing','uMap','uCloud','uNight','uAccent','uLight','uTime','uSurface','uMaterial','uRings','uWeather','uAtmosphere','uHasMap','uHasCloud','uHasNight'])uniforms[name]=gl.getUniformLocation(program,name);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;gl=null;window.dispatchEvent(new Event('parallax:planet-texture'));});return true;}catch{gl=null;failed=true;return false;}}
function texture(file,unit){gl.activeTexture(gl.TEXTURE0+unit);let im=images.get(file);if(!im){im=new Image();im.crossOrigin='anonymous';im.onload=()=>{im.ready=true;window.dispatchEvent(new Event('parallax:planet-texture'));};im.src='/assets/globe/'+file;images.set(file,im);}let tx=textures.get(file);if(!tx){tx=gl.createTexture();textures.set(file,tx);gl.bindTexture(gl.TEXTURE_2D,tx);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([70,90,110,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);}gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tx);if(im.ready&&!im.uploaded){gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);const pot=v=>Number.isInteger(v)&&v>0&&(v&(v-1))===0;if(pot(im.naturalWidth)&&pot(im.naturalHeight)){gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);}im.uploaded=true;}return !!im.ready;}
function draw(ctx,cx,cy,r,design,time,premium){if(!init())return false;try{const d=decodePlanet(design),s=premium||{},accent=s.accent||planetPalette[d.index][1];const atlas=s.optics==='atlas'&&design?.startsWith('solar-');const size=Math.min(atlas?1536:1200,Math.max(128,Math.ceil(r*4.1)));gl.viewport(0,0,size,size);gl.useProgram(program);const isSolar=design?.startsWith('solar-'),file=isSolar?realPlanetMaps[design.slice(6)]:({earth:'2k_earth_daymap.jpg',rocky:'2k_mars.jpg',gas:'2k_jupiter.jpg'}[d.surface]);const hasMap=texture(file||'2k_earth_daymap.jpg',0),hasCloud=texture('2k_earth_clouds.jpg',1),hasNight=texture('2k_earth_nightmap.jpg',2);for(const [u,v] of [['uMap',0],['uCloud',1],['uNight',2]])gl.uniform1i(uniforms[u],v);const rgb=accent.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)/255);gl.uniform3fv(uniforms.uAccent,rgb);const palette=s.palette,branded=!!palette&&['primary','secondary','ring'].every(key=>typeof palette[key]==='string'&&/^#[a-f0-9]{6}$/i.test(palette[key]));gl.uniform1f(uniforms.uBrandEnabled,branded?1:0);for(const [key,name] of [['primary','uBrandPrimary'],['secondary','uBrandSecondary'],['ring','uBrandRing']])gl.uniform3fv(uniforms[name],branded?palette[key].slice(1).match(/.{2}/g).map(v=>parseInt(v,16)/255):[0,0,0]);const lights={studio:[-.65,.45,.62],sunrise:[-.91,.18,.32],dusk:[.75,.25,.23]};const light=atlas?({studio:[-.48,.36,.80],sunrise:[-.85,.24,.47],dusk:[.72,.29,.49]}[s.lighting]||[-.48,.36,.80]):(lights[s.lighting]||lights.studio);gl.uniform3fv(uniforms.uLight,atlas?light.map(v=>v/Math.hypot(...light)):light);const air={mercury:.035,venus:.55,earth:1,moon:.025,mars:.13,jupiter:.28,europa:.04,saturn:.24,uranus:.58,neptune:.52,pluto:.06};gl.uniform1f(uniforms.uAtlas,atlas?1:0);gl.uniform1f(uniforms.uAir,atlas?(air[design.slice(6)]??.1):1);gl.uniform1f(uniforms.uPluto,atlas&&design==='solar-pluto'?1:0);gl.uniform1f(uniforms.uPixel,4.1/size);const rings=s.rings&&s.rings!=='inherit'?{halo:3,double:4,dust:5}[s.rings]:({none:0,thin:1,wide:2}[d.rings]);for(const [u,v] of [['uTime',time],['uSurface',d.surface==='earth'?0:d.surface==='gas'?2:1],['uMaterial',{volcanic:1,glacial:2,biolume:3}[s.surface]||0],['uRings',rings||0],['uWeather',d.weather==='clouds'?1:0],['uAtmosphere',s.atmosphere==='ion'?2:s.atmosphere==='vivid'?1:0],['uHasMap',hasMap?1:0],['uHasCloud',hasCloud?1:0],['uHasNight',hasNight?1:0]])gl.uniform1f(uniforms[u],v);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);ctx.drawImage(canvas,0,canvas.height-size,size,size,cx-r*2.05,cy-r*2.05,r*4.1,r*4.1);return true;}catch{failed=true;gl=null;return false;}}
function ready(design,premium){if(failed)return true;const d=decodePlanet(design),file=design?.startsWith('solar-')?realPlanetMaps[design.slice(6)]:({earth:'2k_earth_daymap.jpg',rocky:'2k_mars.jpg',gas:'2k_jupiter.jpg'}[d.surface]);return !!images.get(file)?.ready&&(!(d.weather==='clouds')||!!images.get('2k_earth_clouds.jpg')?.ready)&&!!images.get('2k_earth_nightmap.jpg')?.ready;}
window.ParallaxPlanetRenderer={draw,ready,available:()=>!failed,shaders:{vertex,fragment}};
})();
