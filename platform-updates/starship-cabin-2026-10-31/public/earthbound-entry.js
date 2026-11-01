(function(root){
  'use strict';
  // Own one scene per entry. Late callbacks cannot revive a disposed attempt.
  function create({build,onChange=()=>{},schedule=setTimeout,cancel=clearTimeout,timeout=25000}) {
    let scene=null,state='idle',message='',generation=0,timer=null;
    const clear=()=>{if(timer!==null)cancel(timer);timer=null;};
    const emit=()=>onChange({state,message,scene});
    function dispose(){generation++;clear();const old=scene;scene=null;old?.destroy?.();state='idle';message='';}
    function start(){
      dispose();const attempt=generation;state='loading';emit();
      const fail=reason=>{if(attempt!==generation)return;clear();generation++;const old=scene;scene=null;old?.destroy?.();state='error';message=reason||'The browser could not start the 3D scene.';emit();};
      const ready=()=>{if(attempt!==generation||!scene)return;clear();state='ready';emit();};
      let result;
      try{result=build(fail,()=>{if(scene)ready();});}catch(error){fail(error.message);return;}
      if(attempt!==generation){result?.destroy?.();return;}
      scene=result;
      if(!scene){fail('The browser could not start 3D graphics.');return;}
      if(scene.ready)ready();
      else timer=schedule(()=>fail('The scene took too long to load. Please retry.'),timeout);
      return scene;
    }
    return {start,dispose,get scene(){return scene;},get state(){return state;},get message(){return message;}};
  }
  const api={create};if(typeof module!=='undefined')module.exports=api;else root.ParallaxEarthboundEntry=api;
})(typeof window!=='undefined'?window:this);
