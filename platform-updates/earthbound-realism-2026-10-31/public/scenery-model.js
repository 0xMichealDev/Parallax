/* Meshy expedition scenery. One GPU asset per type, reused at fixed world placements. */
(() => {
  'use strict';
  const TYPES=['rocks','station','lantern'];
  function lightingGLSL(placements){
    const lamps=placements.filter(p=>p.type==='lantern');
    return `uniform float sceneryPower;
      float sceneryContact(vec3 p){float shade=0.;${placements.map(p=>`shade=max(shade,exp(-dot((p.xz-vec2(${p.x.toFixed(5)},${p.z.toFixed(5)}))/vec2(${(p.radius*.8).toFixed(5)}),(p.xz-vec2(${p.x.toFixed(5)},${p.z.toFixed(5)}))/vec2(${(p.radius*.8).toFixed(5)})))*.68);`).join('')}return 1.-shade;}
      vec3 sceneryLamp(vec3 p,vec3 n,vec3 source){vec3 d=source-p;float d2=max(dot(d,d),.001);return vec3(3.4,2.1,1.05)*max(0.,dot(n,d*inversesqrt(d2)))/(1.+d2*1.3);}
      vec3 sceneryIllumination(vec3 p,vec3 n){return sceneryPower*(${lamps.map(p=>`sceneryLamp(p,n,vec3(${[p.x,p.y+p.height*.68,p.z].map(n=>n.toFixed(5)).join(',')}))`).join('+')||'vec3(0.)'});}`;
  }
  const vertex=`precision highp float;
    attribute vec3 position,normal;attribute vec2 uv;
    uniform vec3 eye,right,up,forward,propOrigin,modelCenter;
    uniform float aspect,lens,modelScale;uniform vec2 propRotation;
    varying vec3 point,norm;varying vec2 textureUV;varying float propHeight;
    void main(){vec3 p=(position-modelCenter)*modelScale;
      point=propOrigin+vec3(p.x*propRotation.x-p.z*propRotation.y,p.y,p.x*propRotation.y+p.z*propRotation.x);
      norm=normalize(vec3(normal.x*propRotation.x-normal.z*propRotation.y,normal.y,normal.x*propRotation.y+normal.z*propRotation.x));
      textureUV=uv;propHeight=p.y;vec3 v=point-eye;float d=dot(v,forward);
      gl_Position=vec4(dot(v,right)/(aspect*lens),dot(v,up)/lens,1.000025*d-.10000125,d);}`;
  function drawRanges(total,ranges,ready){
    const excluded=ranges.filter(r=>ready[r.type]).sort((a,b)=>a.start-b.start),result=[];let from=0;
    for(const r of excluded){if(r.start>from)result.push([from,r.start-from]);from=Math.max(from,r.start+r.count);}
    if(from<total)result.push([from,total-from]);return result;
  }
  function create(gl,{placements,environmentFragment,lightingSource,onState}){
    const base=window.ParallaxRocketModel,rover=window.ParallaxRoverModel,views={};
    const sharedNames=['propOrigin','propRotation','sceneryPower','propKind','propHeightLimit','sceneryFlashPosition','sceneryFlashDirection','sceneryFlashPower','sceneryFirePosition','sceneryFirePower','roverLightOrigin','roverLightPose','roverLightPower'];
    const extra=`${lightingSource}\n${rover.lightingGLSL}
      uniform vec3 sceneryFlashPosition,sceneryFlashDirection,sceneryFirePosition;
      uniform float sceneryFlashPower,sceneryFirePower,propKind,propHeightLimit;varying float propHeight;
      vec3 localIllumination(vec3 p,vec3 n){
        vec3 d=p-sceneryFlashPosition;float d2=max(dot(d,d),.001);
        float beam=smoothstep(.885,.965,dot(d*inversesqrt(d2),sceneryFlashDirection));
        vec3 fire=sceneryFirePosition-p;float f2=max(dot(fire,fire),.001);
        return sceneryIllumination(p,n)+roverIllumination(p,n)+vec3(4.8,4.4,3.6)*sceneryFlashPower*beam*max(0.,dot(n,-d*inversesqrt(d2)))/(1.+d2*.07)+vec3(2.3,.71,.14)*sceneryFirePower*max(.06,dot(n,fire*inversesqrt(f2)))/(1.+f2*.26);
      }`;
    for(const type of TYPES){
      views[type]=base.create(gl,{url:`/assets/scenery/${type}/web.glb?v=20261031`,origin:[0,0,0],height:1,prepareModel:m=>({...m,center:[(m.bounds.min[0]+m.bounds.max[0])/2,m.bounds.min[1],(m.bounds.min[2]+m.bounds.max[2])/2]}),lamps:false,environmentFragment,vertexShader:vertex,uniformNames:sharedNames,
        fragmentShader:env=>base.shaders.fragment(env)
          .replace('uniform sampler2D baseMap',extra+'\nuniform sampler2D baseMap')
          .replace('rocketIllumination(point,n)','(rocketIllumination(point,n)+localIllumination(point,n))')
          .replace('vec3(.48,.43,.34)*diffuse','mix(vec3(.48,.43,.34),vec3(.085,.105,.145),night)*diffuse')
          .replace('color=pow(max(color,vec3(0.)),vec3(1./2.2));',`if(propKind>1.5){float glass=smoothstep(.40,.50,propHeight/propHeightLimit)*(1.-smoothstep(.82,.88,propHeight/propHeightLimit));float pale=smoothstep(.22,.5,dot(albedo,vec3(.333)));color+=vec3(1.4,.84,.36)*glass*pale*sceneryPower;}color=pow(max(color,vec3(0.)),vec3(1./2.2));`),
        setFrameUniforms(g,u,f){g.uniform3fv(u.rocketOrigin,f.rocketOrigin);g.uniform3fv(u.propOrigin,f.prop.origin);g.uniform2fv(u.propRotation,[Math.cos(f.prop.yaw),Math.sin(f.prop.yaw)]);g.uniform1f(u.propKind,TYPES.indexOf(type));g.uniform1f(u.propHeightLimit,f.prop.height);g.uniform1f(u.sceneryPower,f.sceneryPower);g.uniform3fv(u.sceneryFlashPosition,f.flashPosition);g.uniform3fv(u.sceneryFlashDirection,f.flashDirection);g.uniform1f(u.sceneryFlashPower,f.flashPower);g.uniform3fv(u.sceneryFirePosition,f.firePosition);g.uniform1f(u.sceneryFirePower,f.firePower);rover.setLights(g,u,f.roverLight);},
        onReady:()=>onState?.(type,'ready'),onError:error=>{onState?.(type,'fallback');console.warn('Scenery '+type+' unavailable:',error.message);}
      });
    }
    return {get ready(){return Object.fromEntries(TYPES.map(t=>[t,!!views[t]?.ready]));},
      draw(frame){for(const prop of placements){const view=views[prop.type];if(!view?.ready||Math.hypot(prop.x-frame.eye[0],prop.z-frame.eye[2])>110)continue;
        // Each draw shares immutable buffers/textures; only placement and scale change.
        view.draw({...frame,prop:{...prop,origin:[prop.x,prop.y,prop.z]},modelHeight:prop.height});}},
      destroy(){for(const view of Object.values(views))view.destroy();}};
  }
  const api={TYPES,lightingGLSL,drawRanges,create};
  if(typeof window!=='undefined')window.ParallaxSceneryModel=api;
  if(typeof module!=='undefined')module.exports=api;
})();
