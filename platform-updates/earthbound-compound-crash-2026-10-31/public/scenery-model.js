/* Meshy expedition scenery. One GPU asset per type, reused at fixed world placements. */
(() => {
  'use strict';
  const TYPES=['rocks','station','lantern','tent','camp','bridge','hangar','operations','habitat','power','comms','checkpoint','cargo','service','wreck','debris','core','worker','console','specimen'];
  function fitModel(type,model,terrainHeight,dimensions){
    if(dimensions?.compound){const span=model.bounds.max.map((v,i)=>v-model.bounds.min[i]),center=model.bounds.min.map((v,i)=>(v+model.bounds.max[i])/2),scale=[dimensions.width/span[0],dimensions.height/span[1],dimensions.depth/span[2]],positions=new Float32Array(model.positions.length),normals=new Float32Array(model.normals.length);
      for(let i=0;i<model.vertexCount;i++){const k=i*3,n=[];for(let a=0;a<3;a++){positions[k+a]=(model.positions[k+a]-(a===1?model.bounds.min[a]:center[a]))*scale[a];n[a]=model.normals[k+a]/scale[a];}const len=Math.hypot(...n)||1;normals.set(n.map(v=>v/len),k);}
      if(type==='wreck'){
        // Open the impact quarter and tilt the intact dome into the soil.
        const kept=[];for(let k=0;k<model.indices.length;k+=3){const ids=Array.from(model.indices.subarray(k,k+3)),c=[0,0,0];for(const i of ids)for(let a=0;a<3;a++)c[a]+=positions[i*3+a]/3;const r=Math.hypot(c[0],c[2]),angle=Math.atan2(c[2],c[0]),jag=.04*Math.sin(r*8);if(r>2.35&&c[1]<2.55&&angle>1.88+jag&&angle<2.52+jag)continue;kept.push(...ids);}
        const rotate=(x,y,z)=>{const xx=x*Math.cos(.21)-y*Math.sin(.21),yy=x*Math.sin(.21)+y*Math.cos(.21);return [xx,yy*Math.cos(.13)-z*Math.sin(.13),yy*Math.sin(.13)+z*Math.cos(.13)];};
        const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let k=0;k<positions.length;k+=3){const p=rotate(...positions.subarray(k,k+3)),n=rotate(...normals.subarray(k,k+3));positions.set(p,k);normals.set(n,k);for(let a=0;a<3;a++){min[a]=Math.min(min[a],p[a]);max[a]=Math.max(max[a],p[a]);}}
        const indices=new model.indices.constructor(kept);return {...model,positions,normals,indices,triangles:indices.length/3,material:{...model.material,doubleSided:true},center:[0,0,0],bounds:{min,max}};
      }
      return {...model,positions,normals,center:[0,0,0],bounds:{min:[-dimensions.width/2,0,-dimensions.depth/2],max:[dimensions.width/2,dimensions.height,dimensions.depth/2]}};
    }
    if(type!=='tent'&&type!=='bridge')return {...model,center:[(model.bounds.min[0]+model.bounds.max[0])/2,model.bounds.min[1],(model.bounds.min[2]+model.bounds.max[2])/2]};
    const {min,max}=model.bounds,span=max.map((v,i)=>v-min[i]),center=min.map((v,i)=>(v+max[i])/2);
    const positions=new Float32Array(model.positions.length),normals=new Float32Array(model.normals.length);
    let deck=min[1],longAxis=span[0]>span[2]?0:2,shortAxis=longAxis===0?2:0;
    if(type==='bridge'){
      // Identify the broad, upward-facing central deck, excluding the narrow rail tops.
      const bins=Array.from({length:200},()=>({area:0,y:0}));
      for(let k=0;k<model.indices.length;k+=3){const ids=[model.indices[k],model.indices[k+1],model.indices[k+2]],p=ids.map(i=>Array.from(model.positions.subarray(i*3,i*3+3)));
        const y=p.reduce((s,v)=>s+v[1]/3,0),short=p.reduce((s,v)=>s+v[shortAxis]/3,0),ny=ids.reduce((s,i)=>s+model.normals[i*3+1]/3,0);
        if(ny<.65||Math.abs(short-center[shortAxis])>span[shortAxis]*.30)continue;
        const area=Math.abs((p[1][0]-p[0][0])*(p[2][2]-p[0][2])-(p[1][2]-p[0][2])*(p[2][0]-p[0][0]))*.5;
        const bin=bins[Math.min(199,Math.max(0,Math.floor((y-min[1])/span[1]*200)))];bin.area+=area;bin.y+=y*area;
      }
      const best=bins.reduce((a,b)=>b.area>a.area?b:a);if(best.area<=0)throw Error('Bridge has no identifiable walking deck');deck=best.y/best.area;
      if(max[1]-deck<span[1]*.25)throw Error('Bridge deck detection selected a railing');
    }
    const scale=type==='tent'?[3.3/span[0],2.2/span[1],3.8/span[2]]:[17/span[longAxis],1.05/(max[1]-deck),3.2/span[shortAxis]];
    const outMin=[Infinity,Infinity,Infinity],outMax=[-Infinity,-Infinity,-Infinity];
    for(let i=0;i<model.vertexCount;i++){
      const k=i*3,p=Array.from(model.positions.subarray(k,k+3)),n=Array.from(model.normals.subarray(k,k+3));let v,nn;
      if(type==='tent'){v=[(p[0]-center[0])*scale[0],(p[1]-min[1])*scale[1],(p[2]-center[2])*scale[2]];nn=n.map((a,j)=>a/scale[j]);}
      else {const x=(p[longAxis]-center[longAxis])*scale[0],z=(p[shortAxis]-center[shortAxis])*scale[2],slope=(terrainHeight(37+x+.02,22)-terrainHeight(37+x-.02,22))/.04;
        v=[x,(p[1]-deck)*scale[1]+terrainHeight(37+x,22)-terrainHeight(37,22),z];nn=[n[longAxis]/scale[0]-slope*n[1]/scale[1],n[1]/scale[1],n[shortAxis]/scale[2]];
        // Swapping X/Z reverses winding. Preserve orientation with a Z reflection.
        if(longAxis===2){v[2]=-v[2];nn[2]=-nn[2];}
      }
      positions.set(v,k);const len=Math.hypot(...nn)||1;normals.set(nn.map(a=>a/len),k);for(let a=0;a<3;a++){outMin[a]=Math.min(outMin[a],v[a]);outMax[a]=Math.max(outMax[a],v[a]);}
    }
    return {...model,positions,normals,bounds:{min:outMin,max:outMax},center:[0,0,0],deckSourceHeight:deck};
  }
  function lightingGLSL(placements){
    const lamps=placements.filter(p=>p.type==='lantern');
    return `uniform float sceneryPower,compoundPower,alienPower;
      float compoundLamp(vec3 p,vec3 n,vec3 source){vec3 d=source-p;float d2=max(dot(d,d),.01);float down=smoothstep(.15,.65,d.y*inversesqrt(d2));return down*max(.0,dot(n,d*inversesqrt(d2)))/(1.+d2*.045);}
      vec3 compoundIllumination(vec3 p,vec3 n){vec3 light=vec3(0.);
        if(length(p.xz-vec2(-111.,-100.))<78.){float y=${(placements.find(p=>p.type==='hangar')?.y||0).toFixed(5)};
          light+=vec3(1.6,1.9,2.2)*(compoundLamp(p,n,vec3(-143.,y+7.5,-79.))+compoundLamp(p,n,vec3(-119.,y+7.5,-79.))+compoundLamp(p,n,vec3(-79.,y+7.5,-107.))+compoundLamp(p,n,vec3(-110.,y+7.5,-137.)))*compoundPower;
          light+=vec3(2.2,1.5,.8)*(compoundLamp(p,n,vec3(-126.,y+4.5,-69.4))+compoundLamp(p,n,vec3(-102.,y+7.,-73.4))+compoundLamp(p,n,vec3(-73.,y+4.,-78.)))*compoundPower;
        }
        vec3 d=vec3(61.5,${((placements.find(p=>p.type==='core')?.y||0)+1.3).toFixed(5)},-65.)-p;float d2=max(dot(d,d),.01);light+=vec3(.05,1.5,1.85)*(.28+.72*alienPower)*max(.06,dot(n,d*inversesqrt(d2)))/(1.+d2*.22);return light;
      }
      float sceneryContact(vec3 p){float shade=0.;${placements.filter(p=>p.type!=='bridge').map(p=>`shade=max(shade,exp(-dot((p.xz-vec2(${p.x.toFixed(5)},${p.z.toFixed(5)}))/vec2(${(p.radius*.8).toFixed(5)}),(p.xz-vec2(${p.x.toFixed(5)},${p.z.toFixed(5)}))/vec2(${(p.radius*.8).toFixed(5)})))*.68);`).join('')}return 1.-shade;}
      vec3 sceneryLamp(vec3 p,vec3 n,vec3 source){vec3 d=source-p;float d2=max(dot(d,d),.001);return vec3(3.4,2.1,1.05)*max(0.,dot(n,d*inversesqrt(d2)))/(1.+d2*1.3);}
      vec3 sceneryIllumination(vec3 p,vec3 n){return compoundIllumination(p,n)+sceneryPower*(${lamps.map(p=>`sceneryLamp(p,n,vec3(${[p.x,p.y+p.height*.68,p.z].map(n=>n.toFixed(5)).join(',')}))`).join('+')||'vec3(0.)'});}`;
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
  function create(gl,{placements,environmentFragment,lightingSource,onState,terrainHeight}){
    const base=window.ParallaxRocketModel,rover=window.ParallaxRoverModel,views={};
    const sharedNames=['propOrigin','propRotation','sceneryPower','propKind','propHeightLimit','compoundPower','alienPower','sceneryFlashPosition','sceneryFlashDirection','sceneryFlashPower','sceneryFirePosition','sceneryFirePower','roverLightOrigin','roverLightPose','roverLightPower'];
    const extra=`${lightingSource}\n${rover.lightingGLSL}
      uniform vec3 sceneryFlashPosition,sceneryFlashDirection,sceneryFirePosition;
      uniform float sceneryFlashPower,sceneryFirePower,propKind,propHeightLimit;varying float propHeight;
      vec3 localIllumination(vec3 p,vec3 n){
        vec3 d=p-sceneryFlashPosition;float d2=max(dot(d,d),.001);
        float beam=smoothstep(.885,.965,dot(d*inversesqrt(d2),sceneryFlashDirection));
        vec3 fire=sceneryFirePosition-p;float f2=max(dot(fire,fire),.001);
        return sceneryIllumination(p,n)+roverIllumination(p,n)+vec3(4.8,4.4,3.6)*sceneryFlashPower*beam*max(0.,dot(n,-d*inversesqrt(d2)))/(1.+d2*.07)+vec3(2.3,.71,.14)*sceneryFirePower*max(.06,dot(n,fire*inversesqrt(f2)))/(1.+f2*.26);
      }`;
    let alive=true,workerModel=null,workerBytes=null,workerAnimation=null;const animationAbort=new AbortController();
    function prepareWorker(){if(!alive||!workerModel||!workerBytes)return;try{workerAnimation=window.ParallaxWorkerAnimation.create(workerModel,workerBytes);if(views.worker?.ready)onState?.('worker','ready');}catch(error){onState?.('worker','fallback');console.warn('Crew animation unavailable:',error.message);}}
    function start(type){if(views[type]||!alive)return;onState?.(type,'loading');
      if(type==='worker')fetch('/assets/scenery/worker/animation.bin?v=20261031-compound',{signal:animationAbort.signal,credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('Crew animation download failed');return r.arrayBuffer();}).then(b=>{workerBytes=b;prepareWorker();}).catch(error=>{if(alive){onState?.('worker','fallback');console.warn('Crew animation unavailable:',error.message);}});
      views[type]=base.create(gl,{url:`/assets/scenery/${type}/${type==='worker'?'animated':'web'}.glb?v=20261031-compound`,origin:[0,0,0],height:1,prepareModel:m=>{if(type==='worker'){workerModel={...m,center:[0,0,0]};prepareWorker();return workerModel;}return fitModel(type,m,terrainHeight,placements.find(p=>p.type===type));},vertexData:type==='worker'?f=>workerAnimation?.pose(f.workerPhase,f.workerWalking):undefined,lamps:false,environmentFragment,vertexShader:vertex,uniformNames:sharedNames,
        fragmentShader:env=>base.shaders.fragment(env)
          .replace('uniform sampler2D baseMap',extra+'\nuniform sampler2D baseMap')
          .replace('rocketIllumination(point,n)','(rocketIllumination(point,n)+localIllumination(point,n))')
          .replace('vec3(.48,.43,.34)*diffuse','mix(vec3(.48,.43,.34),vec3(.085,.105,.145),night)*diffuse')
          .replace('color=pow(max(color,vec3(0.)),vec3(1./2.2));',`if(propKind>1.5&&propKind<2.5){float glass=smoothstep(.40,.50,propHeight/propHeightLimit)*(1.-smoothstep(.82,.88,propHeight/propHeightLimit));float pale=smoothstep(.22,.5,dot(albedo,vec3(.333)));color+=vec3(1.4,.84,.36)*glass*pale*sceneryPower;}if(propKind>13.5&&propKind<14.5){float burn=1.-smoothstep(1.6,4.4,length((point.xz-vec2(61.5,-65.))*vec2(1.,.72)));color*=1.-burn*(.68+.12*noise(point.xz*7.));}if(propKind>15.5&&propKind<16.5){float cyan=smoothstep(.04,.18,albedo.g-albedo.r)*smoothstep(.12,.45,albedo.b);color+=vec3(.015,.65,.85)*cyan*(.28+.72*alienPower);}color=pow(max(color,vec3(0.)),vec3(1./2.2));`),
        setFrameUniforms(g,u,f){g.uniform3fv(u.rocketOrigin,f.rocketOrigin);g.uniform3fv(u.propOrigin,f.prop.origin);g.uniform2fv(u.propRotation,[Math.cos(f.prop.yaw),Math.sin(f.prop.yaw)]);g.uniform1f(u.propKind,TYPES.indexOf(type));g.uniform1f(u.compoundPower,f.compoundPower||0);g.uniform1f(u.alienPower,f.alienPower||0);g.uniform1f(u.propHeightLimit,f.prop.height);g.uniform1f(u.sceneryPower,f.sceneryPower);g.uniform3fv(u.sceneryFlashPosition,f.flashPosition);g.uniform3fv(u.sceneryFlashDirection,f.flashDirection);g.uniform1f(u.sceneryFlashPower,f.flashPower);g.uniform3fv(u.sceneryFirePosition,f.firePosition);g.uniform1f(u.sceneryFirePower,f.firePower);rover.setLights(g,u,f.roverLight);},
        onReady:()=>{if(type!=='worker'||workerAnimation)onState?.(type,'ready');},onError:error=>{onState?.(type,'fallback');console.warn('Scenery '+type+' unavailable:',error.message);}
      });
    }
    return {get ready(){return Object.fromEntries(TYPES.map(t=>[t,!!views[t]?.ready&&(t!=='worker'||!!workerAnimation)]));},
      draw(frame){if(frame.crew?.some(p=>Math.hypot(p.x-frame.eye[0],p.z-frame.eye[2])<85))start('worker');for(const prop of placements){const distance=Math.hypot(prop.x-frame.eye[0],prop.z-frame.eye[2]);if(distance<(prop.height>5?155:95))start(prop.type);const view=views[prop.type];if(!view?.ready||Math.hypot(prop.x-frame.eye[0],prop.z-frame.eye[2])>(prop.height>5?180:110))continue;
        // Each draw shares immutable buffers/textures; only placement and scale change.
        const fitted=prop.compound||prop.type==='tent'||prop.type==='bridge',modelHeight=fitted?view.metadata.bounds.max[1]-view.metadata.bounds.min[1]:prop.height;
        view.draw({...frame,prop:{...prop,origin:[prop.x,prop.y,prop.z]},modelHeight});}
        if(views.worker?.ready&&workerAnimation)for(const p of frame.crew||[]){if(Math.hypot(p.x-frame.eye[0],p.z-frame.eye[2])>85)continue;views.worker.draw({...frame,prop:{origin:[p.x,terrainHeight(p.x,p.z),p.z],yaw:p.yaw+Math.PI,height:1.8},modelHeight:1.8,workerPhase:frame.motion?p.phase:0,workerWalking:!!frame.motion&&p.walking});}},
      destroy(){alive=false;animationAbort.abort();workerAnimation?.clear();for(const view of Object.values(views))view.destroy();}};
  }
  const api={TYPES,fitModel,lightingGLSL,drawRanges,create};
  if(typeof window!=='undefined')window.ParallaxSceneryModel=api;
  if(typeof module!=='undefined')module.exports=api;
})();
