/* Reviewed PARALLAX expedition rover; shares the existing GLB/PBR loader.
 * The mesh is fitted within the existing vehicle collision envelope. */
(() => {
  'use strict';
  const WHEELS = [[-.79,.46,-1.03],[.79,.46,-1.03],[-.79,.46,1.04],[.79,.46,1.04]];
  function prepareModel(model) {
    const {min,max}=model.bounds, scale=2.02/(max[2]-min[2]);
    const cx=(min[0]+max[0])/2,cz=(min[2]+max[2])/2;
    const points=new Float32Array(model.positions.length), normals=new Float32Array(model.normals.length);
    for(let i=0;i<model.vertexCount;i++){
      const k=i*3; points[k]=-(model.positions[k+2]-cz)*scale;points[k+1]=(model.positions[k+1]-min[1])*scale;points[k+2]=(model.positions[k]-cx)*scale;
      normals[k]=-model.normals[k+2];normals[k+1]=model.normals[k+1];normals[k+2]=model.normals[k];
    }
    // Expand once so each triangle has one rigid part; no triangle stretches across a wheel seam.
    const count=model.indices.length,positions=new Float32Array(count*3),ns=new Float32Array(count*3),uvs=new Float32Array(count*2),parts=new Float32Array(count);
    const partCounts=[0,0,0,0,0];
    for(let i=0;i<count;i+=3){
      const center=[0,0,0];for(let j=0;j<3;j++)for(let a=0;a<3;a++)center[a]+=points[model.indices[i+j]*3+a]/3;
      let part=0;
      for(let w=0;w<4;w++){const p=WHEELS[w];if(Math.sign(center[0])===Math.sign(p[0])&&Math.abs(center[0])>.64&&Math.hypot(center[1]-p[1],center[2]-p[2])<.49){part=w+1;break;}}
      partCounts[part]++;
      for(let j=0;j<3;j++){const src=model.indices[i+j],dst=i+j;positions.set(points.subarray(src*3,src*3+3),dst*3);ns.set(normals.subarray(src*3,src*3+3),dst*3);uvs.set(model.uvs.subarray(src*2,src*2+2),dst*2);parts[dst]=part;}
    }
    if(partCounts.some(n=>n<100))throw new Error('Rover wheel segmentation is incomplete');
    const height=(max[1]-min[1])*scale,length=(max[0]-min[0])*scale;
    return {...model,positions,normals:ns,uvs,parts,indices:Uint32Array.from({length:count},(_,i)=>i),vertexCount:count,
      bounds:{min:[-1.01,0,-length/2],max:[1.01,height,length/2]},center:[0,0,0],partCounts};
  }
  const lightingGLSL=`
    uniform vec3 roverLightOrigin;
    uniform vec4 roverLightPose;
    uniform vec2 roverLightPower;
    vec3 roverLightPoint(vec3 p){vec2 q=vec2(p.x*roverLightPose.x-p.z*roverLightPose.y,p.x*roverLightPose.y+p.z*roverLightPose.x);return roverLightOrigin+vec3(q.x,p.y+dot(q,roverLightPose.zw),q.y);}
    float roverBeam(vec3 p,vec3 n,vec3 source,vec3 target){vec3 d=p-source;float d2=max(dot(d,d),.001);return smoothstep(.87,.97,dot(d*inversesqrt(d2),normalize(target-source)))*max(0.,dot(n,-d*inversesqrt(d2)))/(1.+d2*.045);}
    vec3 roverIllumination(vec3 p,vec3 n){
      float a=roverBeam(p,n,roverLightPoint(vec3(-.55,.95,-1.50)),roverLightPoint(vec3(-.8,-.35,-13.)));
      float b=roverBeam(p,n,roverLightPoint(vec3(.55,.95,-1.50)),roverLightPoint(vec3(.8,-.35,-13.)));
      vec3 light=vec3(5.8,6.6,7.2)*(a+b)*roverLightPower.x;
      vec3 d=roverLightPoint(vec3(0.,1.65,1.25))-p;float d2=max(dot(d,d),.001);
      light+=vec3(2.5,1.45,.55)*max(0.,dot(n,d*inversesqrt(d2)))/(1.+d2*.6)*roverLightPower.y;
      return light;
    }
  `;
  const vertexShader=`
    precision highp float;
    attribute vec3 position,normal;attribute vec2 uv;attribute float modelPart;
    uniform vec3 eye,right,up,forward,vehicleOrigin;
    uniform vec4 vehiclePose;
    uniform vec3 vehicleMotion;
    uniform float aspect,lens;
    varying vec3 point,norm;varying vec2 textureUV;
    void main(){
      vec3 p=position,n=normal;
      if(modelPart>.5){
        bool front=modelPart<2.5;float side=(modelPart<1.5||(modelPart>2.5&&modelPart<3.5))?-1.:1.;
        vec3 pivot=vec3(side*.79,.46,front?-1.03:1.04);p-=pivot;
        float c=cos(-vehicleMotion.x),s=sin(-vehicleMotion.x);p.yz=mat2(c,s,-s,c)*p.yz;n.yz=mat2(c,s,-s,c)*n.yz;
        float steer=vehicleMotion.y*(front?1.:-.2);c=cos(steer);s=sin(steer);p.xz=mat2(c,s,-s,c)*p.xz;n.xz=mat2(c,s,-s,c)*n.xz;p+=pivot;
      }
      vec2 q=vec2(p.x*vehiclePose.x-p.z*vehiclePose.y,p.x*vehiclePose.y+p.z*vehiclePose.x);
      vec2 nn=vec2(n.x*vehiclePose.x-n.z*vehiclePose.y,n.x*vehiclePose.y+n.z*vehiclePose.x);
      point=vehicleOrigin+vec3(q.x,p.y+dot(q,vehiclePose.zw),q.y);
      norm=normalize(vec3(nn.x-vehiclePose.z*n.y,n.y,nn.y-vehiclePose.w*n.y));textureUV=uv;
      // Match the world's terrain transform followed by its shared stunt pivot.
      float c=cos(vehicleMotion.z),s=sin(vehicleMotion.z);vec3 axis=vec3(-vehiclePose.y,0.,vehiclePose.x),pivot=vehicleOrigin+vec3(0.,1.,0.),offset=point-pivot;
      point=pivot+offset*c+cross(axis,offset)*s+axis*dot(axis,offset)*(1.-c);
      norm=normalize(norm*c+cross(axis,norm)*s+axis*dot(axis,norm)*(1.-c));
      vec3 v=point-eye;float depth=dot(v,forward);gl_Position=vec4(dot(v,right)/(aspect*lens),dot(v,up)/lens,1.000025*depth-.10000125,depth);
    }
  `;
  const uniformNames=['vehicleOrigin','vehiclePose','vehicleMotion','roverLightOrigin','roverLightPose','roverLightPower'];
  function lightFrame(vehicle,ground,{enabled=true,driving=false,ready=true}={}){
    const pose={origin:[vehicle.x,ground(vehicle.x,vehicle.z),vehicle.z],pose:[Math.cos(vehicle.yaw),Math.sin(vehicle.yaw),(ground(vehicle.x+1,vehicle.z)-ground(vehicle.x-1,vehicle.z))/2,(ground(vehicle.x,vehicle.z+1)-ground(vehicle.x,vehicle.z-1))/2]};
    return {...pose,power:ready&&!vehicle.stunt?[driving?1:enabled?.45:0,enabled&&!driving?.8:0]:[0,0]};
  }
  function setLights(gl,u,light){gl.uniform3fv(u.roverLightOrigin,light.origin);gl.uniform4fv(u.roverLightPose,light.pose);gl.uniform2fv(u.roverLightPower,light.power);}
  function create(gl,options){
    const base=window.ParallaxRocketModel;
    return base.create(gl,{...options,lamps:false,height:1,prepareModel,vertexShader,uniformNames,
      fragmentShader:environment=>base.shaders.fragment(environment).replace('uniform sampler2D baseMap',lightingGLSL+'\n uniform sampler2D baseMap').replace('rocketIllumination(point,n)','(rocketIllumination(point,n)+roverIllumination(point,n))'),
      setFrameUniforms(gl,u,frame){gl.uniform3fv(u.rocketOrigin,frame.rocketOrigin);gl.uniform3fv(u.vehicleOrigin,frame.vehicleOrigin);gl.uniform4fv(u.vehiclePose,frame.vehiclePose);gl.uniform3fv(u.vehicleMotion,frame.vehicleMotion);setLights(gl,u,frame.roverLight);}
    });
  }
  const api={create,prepareModel,lightingGLSL,lightFrame,setLights,WHEELS,shaders:{vertex:vertexShader}};
  if(typeof window!=='undefined')window.ParallaxRoverModel=api;
  if(typeof module!=='undefined')module.exports=api;
})();
