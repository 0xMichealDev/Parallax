const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function fixture({supported=true}={}){
 const events={},requests=[],uploads=[],notifications=[];let canvases=0,programs=0,draws=0;
 const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,createProgram:()=>++programs,
  getUniformLocation:(_,n)=>n,texImage2D(...args){if(args.at(-1)?.url)uploads.push(args.at(-1).url);},drawArrays(){draws++;}
 },{get:(t,k)=>k in t?t[k]:(()=>1)});
 const canvas={getContext:()=>supported?gl:null,addEventListener(k,f){(events[k]??=[]).push(f);}};
 const scope={window:{dispatchEvent:e=>notifications.push(e.type)},document:{createElement(){canvases++;return canvas;}},Event:class{constructor(type){this.type=type;}},Image:class{set src(url){this.url=url;this.naturalWidth=this.naturalHeight=512;requests.push(url);this.onload?.();}}};
 vm.createContext(scope);for(const p of ['planet-design.js','planet-renderer.js'])vm.runInContext(fs.readFileSync('public/'+p,'utf8'),scope);
 const api=scope.window.ParallaxPlanetRenderer;
 return {api,draw:()=>api.draw({drawImage(){}},100,100,50,'solar-earth',2,{optics:'atlas'}),emit(k){let prevented=false;for(const f of events[k]||[])f({preventDefault(){prevented=true;}});return prevented;},stats:()=>({canvases,programs,draws,uploads:uploads.length,requests:requests.length,notifications:notifications.length})};
}
test('planet graphics recover across repeated device interruptions with fresh GPU resources',()=>{
 const f=fixture();assert.equal(f.draw(),true);const initial=f.stats();assert.ok(initial.uploads>=3);
 for(let i=1;i<=3;i++){
  assert.equal(f.emit('webglcontextlost'),true);assert.equal(f.api.available(),false);
  const stopped=f.stats();assert.equal(f.draw(),false);assert.equal(f.stats().draws,stopped.draws,'do not draw while the context is lost');
  f.emit('webglcontextrestored');assert.equal(f.draw(),true,'restored graphics resume without reloading the page');
  assert.equal(f.stats().programs,i+1);assert.equal(f.stats().uploads,initial.uploads*(i+1),'textures must be uploaded into the restored context');
  assert.equal(f.stats().requests,initial.requests,'reuse decoded source images');assert.equal(f.stats().canvases,1,'restore the same canvas instead of leaking contexts');
 }
});
test('unsupported graphics stay a bounded fallback rather than repeatedly creating contexts',()=>{
 const f=fixture({supported:false});for(let i=0;i<10;i++)assert.equal(f.draw(),false);assert.equal(f.api.available(),false);assert.equal(f.stats().canvases,1);
});
