/* Shared, optional surface materials for the articulated expedition meshes. */
(() => {
  'use strict';
  const ID=Object.freeze({plain:0,fur:1,wool:2,stone:3,regolith:4,metal:5,glass:6,leather:7,solar:8});
  const URL='/assets/expeditions/material-atlas-v210.webp';
  const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const unit=v=>{const length=Math.hypot(...v)||1;return v.map(n=>n/length);};
  const hash=p=>{const x=Math.sin(dot(p,[127.1,311.7,74.7]))*43758.5453;return x-Math.floor(x);};
  const mirror=v=>1-Math.abs(((v%2)+2)%2-1);
  const scales=[0,1.55,1.18,.36,.72];
  const blends=[0,.76,.78,.64,.78];

  function procedural(kind,p,base){
    let grain=1;
    if(kind===ID.fur)grain=.94+.045*hash(p.map(v=>v*73))+.015*Math.sin(p[1]*160+Math.sin(p[0]*31)*2);
    else if(kind===ID.wool)grain=.90+.10*hash(p.map(v=>v*38));
    else if(kind===ID.stone||kind===ID.regolith)grain=.87+.09*hash(p.map(v=>v*2.7))+.04*hash(p.map(v=>v*57));
    else if(kind===ID.metal)grain=.97+.03*Math.sin(p[1]*180+p[0]*13);
    else if(kind===ID.leather)grain=.92+.08*hash(p.map(v=>v*95));
    else if(kind===ID.solar)grain=.93+.07*hash(p.map(v=>v*110));
    return base.slice(0,3).map(v=>clamp(v*grain));
  }
  function shade(kind,albedo,normal,viewDirection,lightDirection,out=[]){
    const nl=Math.hypot(...normal)||1,vl=Math.hypot(...viewDirection)||1,ll=Math.hypot(...lightDirection)||1;
    const nx=normal[0]/nl,ny=normal[1]/nl,nz=normal[2]/nl,vx=viewDirection[0]/vl,vy=viewDirection[1]/vl,vz=viewDirection[2]/vl;
    const lx=lightDirection[0]/ll,ly=lightDirection[1]/ll,lz=lightDirection[2]/ll;
    const ndl=nx*lx+ny*ly+nz*lz,soft=kind===ID.fur||kind===ID.wool;
    const diffuse=soft?Math.max(0,ndl*.87+.13):Math.max(0,ndl);
    const hemi=.26+.09*Math.max(0,ny);
    const fresnel=(1-clamp(nx*vx+ny*vy+nz*vz))**4;
    let strength=soft?.018:kind===ID.metal?.28:kind===ID.glass?.65:kind===ID.solar?.26:kind===ID.leather?.055:.012;
    const exponent=kind===ID.glass?100:kind===ID.solar?64:kind===ID.metal?36:kind===ID.leather?18:12;
    const hx=vx+lx+.000001,hy=vy+ly+.000001,hz=vz+lz+.000001,hl=Math.hypot(hx,hy,hz)||1;
    const specular=Math.max(0,(nx*hx+ny*hy+nz*hz)/hl)**exponent*strength*Math.max(.15,diffuse);
    const edge=fresnel*(soft?.018:kind===ID.glass?.07:.01);
    out[0]=clamp(albedo[0]*(hemi*.88+diffuse*1.02*.78)+specular*.90+edge*.64);
    out[1]=clamp(albedo[1]*(hemi*.96+diffuse*.78)+specular*.95+edge*.76);
    out[2]=clamp(albedo[2]*(hemi*1.04+diffuse*.96*.78)+specular+edge*.87);
    return out;
  }

  const glsl=`
uniform sampler2D uMaterialAtlas;
uniform float uHasMaterialAtlas;
float expeditionHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
vec2 expeditionMirror(vec2 p){return 1.-abs(mod(p,2.)-1.);}
vec3 expeditionTile(vec2 uv,float kind){
 float tile=floor(kind+.5)-1.;vec2 origin=vec2(mod(tile,2.),floor(tile/2.));
 // Mirrored repeats meet at the same edge texels. Insets exclude neighbouring tiles.
 return texture2D(uMaterialAtlas,(origin+.0791015625+expeditionMirror(uv)*.841796875)*.5).rgb;
}
vec3 expeditionAlbedo(float kind,vec3 p,vec3 localNormal,vec3 base){
 float grain=1.;
 if(kind>.5&&kind<1.5)grain=.94+.045*expeditionHash(p*73.)+.015*sin(p.y*160.+sin(p.x*31.)*2.);
 else if(kind<2.5&&kind>1.5)grain=.90+.10*expeditionHash(p*38.);
 else if(kind>2.5&&kind<4.5)grain=.87+.09*expeditionHash(p*2.7)+.04*expeditionHash(p*57.);
 else if(kind>4.5&&kind<5.5)grain=.97+.03*sin(p.y*180.+p.x*13.);
 else if(kind>6.5&&kind<7.5)grain=.92+.08*expeditionHash(p*95.);
 else if(kind>7.5)grain=.93+.07*expeditionHash(p*110.);
 vec3 albedo=base*grain;
 if(kind>.5&&kind<4.5&&uHasMaterialAtlas>.5){
  float scale=kind<1.5?1.55:kind<2.5?1.18:kind<3.5?.36:.72;
  vec3 weight=pow(abs(localNormal),vec3(4.));weight/=max(.0001,weight.x+weight.y+weight.z);
  vec3 q=p*scale;
  vec3 tex=expeditionTile(q.yz,kind)*weight.x+expeditionTile(q.xz,kind)*weight.y+expeditionTile(q.xy,kind)*weight.z;
  if(kind>2.5&&kind<3.5)tex=base*(.62+dot(tex,vec3(.299,.587,.114))*.58);
  float blend=kind<1.5?.76:kind<2.5?.78:kind<3.5?.64:.78;
  albedo=mix(albedo,tex,blend);
 }
 return clamp(albedo,0.,1.);
}
vec3 expeditionShade(float kind,vec3 albedo,vec3 normal,vec3 viewDirection,vec3 lightDirection){
 vec3 n=normalize(normal),view=normalize(viewDirection),light=normalize(lightDirection);
 bool soft=kind>.5&&kind<2.5;
 float ndl=dot(n,light),diffuse=soft?max(0.,ndl*.87+.13):max(0.,ndl);
 float hemi=.26+.09*max(0.,n.y),fresnel=pow(1.-clamp(dot(n,view),0.,1.),4.);
 float strength=soft?.018:kind>4.5&&kind<5.5?.28:kind>5.5&&kind<6.5?.65:kind>7.5?.26:kind>6.5?.055:.012;
 float exponent=kind>5.5&&kind<6.5?100.:kind>7.5?64.:kind>4.5&&kind<5.5?36.:kind>6.5?18.:12.;
 vec3 halfway=normalize(view+light+vec3(.000001));
 float specular=pow(max(0.,dot(n,halfway)),exponent)*strength*max(.15,diffuse);
 vec3 color=albedo*(hemi*vec3(.88,.96,1.04)+diffuse*vec3(1.02,1.,.96)*.78)+specular*vec3(.90,.95,1.);
 color+=fresnel*(soft?.018:kind>5.5&&kind<6.5?.07:.01)*vec3(.64,.76,.87);
 return clamp(color,0.,1.);
}`;

  function create({document:doc,onChange}={}){
    const win=doc?.defaultView||globalThis;
    const ImageClass=win.Image||globalThis.Image;
    const resources=new Map();let image=null,filteredAtlas=null,pixels=null,pixelSize=0,ready=false,alive=true,settled=false,revision=0,timer=null;
    let cache=new WeakMap();
    const later=()=>Promise.resolve().then(()=>{if(alive)try{onChange?.();}catch{}});
    function stopTimer(){if(timer!==null){(win.clearTimeout||globalThis.clearTimeout)?.(timer);timer=null;}}
    function completed(){revision++;cache=new WeakMap();later();}
    if(typeof ImageClass==='function'){
      image=new ImageClass();image.decoding='async';
      image.onload=()=>{
        if(!alive||settled)return;settled=true;stopTimer();
        if(!(image.naturalWidth||image.width)||!(image.naturalHeight||image.height)){completed();return;}
        ready=true;
        try{
          const canvas=doc?.createElement('canvas');pixelSize=256;canvas.width=canvas.height=pixelSize;
          const context=canvas.getContext('2d',{willReadFrequently:true});
          context.drawImage(image,0,0,pixelSize,pixelSize);pixels=context.getImageData(0,0,pixelSize,pixelSize).data;
        }catch{pixels=null;pixelSize=0;}
        try{
          // A small POT copy provides real minification. Wide replicated gutters
          // keep the four unrelated materials apart throughout useful mip levels.
          const canvas=doc.createElement('canvas');canvas.width=canvas.height=1024;
          const context=canvas.getContext('2d',{alpha:false});context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
          const tile=512,pad=40,inner=tile-pad*2,sw=(image.naturalWidth||image.width)/2,sh=(image.naturalHeight||image.height)/2;
          for(let y=0;y<2;y++)for(let x=0;x<2;x++){
            const dx=x*tile,dy=y*tile;
            context.drawImage(image,x*sw,y*sh,sw,sh,dx+pad,dy+pad,inner,inner);
            context.drawImage(canvas,dx+pad,dy+pad,1,inner,dx,dy+pad,pad,inner);
            context.drawImage(canvas,dx+pad+inner-1,dy+pad,1,inner,dx+pad+inner,dy+pad,pad,inner);
            context.drawImage(canvas,dx,dy+pad,tile,1,dx,dy,tile,pad);
            context.drawImage(canvas,dx,dy+pad+inner-1,tile,1,dx,dy+pad+inner,tile,pad);
          }
          filteredAtlas=canvas;
        }catch{filteredAtlas=null;}
        completed();
      };
      image.onerror=()=>{if(alive&&!settled){settled=true;stopTimer();completed();}};
      const timeout=win.setTimeout||globalThis.setTimeout;
      if(timeout){timer=timeout(()=>{timer=null;if(alive&&!settled){settled=true;image.onload=image.onerror=null;completed();}},15000);timer?.unref?.();}
      image.src=URL;
    }
    function tileSample(u,v,kind){
      const x=clamp(Math.floor((((kind-1)%2)+.004+mirror(u)*.992)*.5*pixelSize),0,pixelSize-1);
      const y=clamp(Math.floor((Math.floor((kind-1)/2)+.004+mirror(v)*.992)*.5*pixelSize),0,pixelSize-1);
      const offset=(y*pixelSize+x)*4;return [pixels[offset]/255,pixels[offset+1]/255,pixels[offset+2]/255];
    }
    function albedo(kind,p,n,base){
      const color=procedural(kind,p,base);
      if(!pixels||kind<1||kind>4)return color;
      const weights=n.map(v=>Math.abs(v)**4),sum=weights.reduce((a,b)=>a+b,0)||1;
      const q=p.map(v=>v*scales[kind]);
      const a=tileSample(q[1],q[2],kind),b=tileSample(q[0],q[2],kind),c=tileSample(q[0],q[1],kind);
      let tex=color.map((_,i)=>(a[i]*weights[0]+b[i]*weights[1]+c[i]*weights[2])/sum);
      if(kind===ID.stone){const detail=.62+dot(tex,[.299,.587,.114])*.58;tex=base.slice(0,3).map(v=>v*detail);}
      return color.map((value,i)=>mix(value,tex[i],blends[kind]));
    }
    function surface(triangle){
      let value=cache.get(triangle);if(value)return value;
      const color=albedo(triangle.material||0,triangle.center,triangle.n,triangle.color);
      value=[...color,triangle.color[3]??1];cache.set(triangle,value);return value;
    }
    function bind(gl,program,unit=0){
      if(!alive)return;
      let state=resources.get(gl);
      if(!state){
        const texture=gl.createTexture();state={texture,uploaded:false,attempted:false,locations:new Map()};resources.set(gl,state);
        gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([128,128,128,255]));
        for(const parameter of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,parameter,gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      }
      gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,state.texture);
      if(ready&&!state.attempted){
        state.attempted=true;
        try{
          gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,filteredAtlas||image);
          if(filteredAtlas){gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);}
          // WebGL reports allocation/upload failures through its error state.
          state.uploaded=typeof gl.getError!=='function'||gl.getError()===gl.NO_ERROR;
        }catch{/* A failed upload keeps procedural materials without per-frame retries. */}
      }
      let locations=state.locations.get(program);
      if(!locations){locations=[gl.getUniformLocation(program,'uMaterialAtlas'),gl.getUniformLocation(program,'uHasMaterialAtlas')];state.locations.set(program,locations);}
      gl.uniform1i(locations[0],unit);gl.uniform1f(locations[1],state.uploaded?1:0);
    }
    function dispose(){
      if(!alive)return;alive=false;stopTimer();if(image)image.onload=image.onerror=null;
      for(const [gl,state]of resources)try{gl.deleteTexture(state.texture);}catch{}
      resources.clear();cache=new WeakMap();pixels=null;filteredAtlas=null;image=null;ready=false;
    }
    return {bind,surface,albedo,dispose,get ready(){return ready;},get revision(){return revision;}};
  }
  const api={ID,URL,glsl,create,shade};
  if(typeof window!=='undefined')window.ParallaxExpeditionMaterials=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
