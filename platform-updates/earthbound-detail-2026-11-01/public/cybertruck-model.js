/* Blender-finished stainless expedition pickup. Requires rocket-model.js and rover-model.js. */
(() => {
  'use strict';
  const WHEELS=[[-.886,.445,-1.963],[.886,.445,-1.963],[-.886,.445,1.672],[.886,.445,1.672]];
  const PART_RANGES=[[3564,7020,1],[7020,10476,3],[10476,13932,2],[13932,17388,4]];
  function prepareModel(model){
    if(model.vertexCount!==26460)throw Error('Unexpected Cybertruck asset topology');
    const parts=new Float32Array(model.vertexCount);
    for(const [start,end,part]of PART_RANGES)parts.fill(part,start,end);
    return {...model,parts,center:[0,0,0]};
  }
  function create(gl,options){
    const base=window.ParallaxRocketModel,rover=window.ParallaxRoverModel;
    const vertexShader=rover.shaders.vertex.replace('side*.79,.46,front?-1.03:1.04','side*.886,.445,front?-1.963:1.672');
    return base.create(gl,{...options,lamps:false,height:1,prepareModel,vertexShader,
      uniformNames:['vehicleOrigin','vehiclePose','vehicleMotion','roverLightOrigin','roverLightPose','roverLightPower'],
      fragmentShader:env=>base.shaders.fragment(env).replace('uniform sampler2D baseMap',rover.lightingGLSL+'\nuniform sampler2D baseMap').replace('rocketIllumination(point,n)','(rocketIllumination(point,n)+roverIllumination(point,n))'),
      setFrameUniforms(g,u,f){g.uniform3fv(u.rocketOrigin,f.rocketOrigin);g.uniform3fv(u.vehicleOrigin,f.vehicleOrigin);g.uniform4fv(u.vehiclePose,f.vehiclePose);g.uniform3fv(u.vehicleMotion,f.vehicleMotion);rover.setLights(g,u,f.roverLight);}
    });
  }
  const api={create,prepareModel,WHEELS};
  if(typeof window!=='undefined')window.ParallaxCybertruckModel=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
