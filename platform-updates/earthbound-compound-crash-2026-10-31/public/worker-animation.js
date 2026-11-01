/* Baked Meshy worker poses. Shared cached frames keep six crew members inexpensive. */
(() => {
  'use strict';
  function parse(input) {
    const b=input instanceof ArrayBuffer?new Uint8Array(input):ArrayBuffer.isView(input)?new Uint8Array(input.buffer,input.byteOffset,input.byteLength):null;
    if(!b||b.length<32||b.length>32*1024*1024)throw Error('Invalid worker animation size');
    const v=new DataView(b.buffer,b.byteOffset,b.byteLength),vertices=v.getUint32(8,true),frames=v.getUint32(12,true),duration=v.getFloat32(16,true),quantum=v.getFloat32(20,true);
    if(v.getUint32(0,true)!==0x4e415750||v.getUint32(4,true)!==1||vertices<3||vertices>200000||frames<3||frames>65||!Number.isFinite(duration)||duration<=0||duration>20||!Number.isFinite(quantum)||quantum<=0||quantum>.01||32+vertices*frames*12!==b.length)throw Error('Invalid worker animation header');
    const data=new Int16Array(vertices*frames*6);for(let i=0;i<data.length;i++)data[i]=v.getInt16(32+i*2,true);
    return {vertices,frames,duration,quantum,data};
  }
  function create(model,input) {
    const clip=parse(input);if(model.vertexCount!==clip.vertices||model.uvs.length!==clip.vertices*2)throw Error('Worker animation vertex mismatch');
    const cache=new Map();
    function frame(index) {
      if(cache.has(index))return cache.get(index);
      const out=new Float32Array(clip.vertices*8),offset=index*clip.vertices*6;
      for(let i=0;i<clip.vertices;i++){const k=offset+i*6,j=i*8;for(let a=0;a<3;a++)out[j+a]=clip.data[k+a]*clip.quantum;const nx=clip.data[k+3]/32767,ny=clip.data[k+4]/32767,nz=clip.data[k+5]/32767,l=Math.hypot(nx,ny,nz)||1;out[j+3]=nx/l;out[j+4]=ny/l;out[j+5]=nz/l;out[j+6]=model.uvs[i*2];out[j+7]=model.uvs[i*2+1];}
      cache.set(index,out);return out;
    }
    return {duration:clip.duration,frames:clip.frames-1,pose(phase=0,walking=false){if(!Number.isFinite(phase))phase=0;const fraction=((phase/(Math.PI*2))%1+1)%1;return frame(walking?1+Math.floor(fraction*(clip.frames-1)):0);},clear(){cache.clear();}};
  }
  const api={parse,create};if(typeof module!=='undefined')module.exports=api;if(typeof window!=='undefined')window.ParallaxWorkerAnimation=api;
})();
