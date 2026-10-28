const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('public/expedition-materials.js','utf8');

function harness(){
 const images=[],timers=new Map();let changed=0;
 const data=new Uint8ClampedArray(256*256*4),tiles=[[12,18,24],[237,225,204],[208,176,133],[111,117,123]];
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){const color=tiles[(y>=128?2:0)+(x>=128?1:0)],p=(y*256+x)*4;data.set([...color,255],p);}
 const win={Image:class{constructor(){this.naturalWidth=this.naturalHeight=1254;images.push(this);}set src(value){this.url=value;}},setTimeout(fn){timers.set(1,fn);return 1;},clearTimeout(id){timers.delete(id);}};
 const doc={defaultView:win,createElement:()=>({getContext:()=>({drawImage(){},getImageData:()=>({data})})})};
 const module={exports:{}};vm.runInNewContext(source,{window:win,module});
 const M=module.exports,materials=M.create({document:doc,onChange(){changed++;}});
 return {M,materials,images,timers,get changed(){return changed;}};
}
function graphics({failUpload=false}={}){
 const values={},parameters=[],uploads=[];let textures=0,deleted=0,mipmaps=0;
 return {values,parameters,uploads,get textures(){return textures;},get deleted(){return deleted;},get mipmaps(){return mipmaps;},
  TEXTURE0:100,TEXTURE_2D:1,RGBA:2,UNSIGNED_BYTE:3,TEXTURE_WRAP_S:4,TEXTURE_WRAP_T:5,CLAMP_TO_EDGE:6,TEXTURE_MIN_FILTER:7,TEXTURE_MAG_FILTER:8,LINEAR:9,UNPACK_FLIP_Y_WEBGL:10,UNPACK_PREMULTIPLY_ALPHA_WEBGL:11,LINEAR_MIPMAP_LINEAR:12,
  createTexture(){textures++;return {};},deleteTexture(){deleted++;},activeTexture(){},bindTexture(){},pixelStorei(){},
  texImage2D(...args){uploads.push(args);if(failUpload&&args.length===6)throw new Error('unsupported upload');},texParameteri(...args){parameters.push(args);},generateMipmap(){mipmaps++;},
  getUniformLocation:(_,name)=>name,uniform1i:(name,value)=>values[name]=value,uniform1f:(name,value)=>values[name]=value};
}

test('atlas loading is optional, invalidates cached surfaces once, and keeps tile repeats separate',async()=>{
 const h=harness(),tri={material:h.M.ID.wool,center:[.2,.3,.4],n:[0,1,0],color:[.9,.85,.75,1]};
 const before=h.materials.surface(tri);assert.equal(h.materials.surface(tri),before);assert.equal(h.materials.ready,false);
 assert.equal(h.images.length,1);assert.equal(h.changed,0);
 h.images[0].onload();assert.equal(h.changed,0,'load invalidation is asynchronous');await Promise.resolve();
 assert.equal(h.materials.ready,true);assert.equal(h.changed,1);assert.equal(h.timers.size,0);
 const after=h.materials.surface(tri);assert.notEqual(after,before);assert.equal(h.materials.surface(tri),after);
 for(const p of [[.2,.3,.4],[-14.2,33.8,-99.1]]){
  const fur=h.materials.albedo(h.M.ID.fur,p,[0,1,0],[.1,.1,.1]);
  const wool=h.materials.albedo(h.M.ID.wool,p,[0,1,0],[.9,.85,.75]);
  assert.ok(Math.max(...fur)<.15,'black fur never samples the adjacent white wool');
  assert.ok(Math.min(...wool)>.7,'mirrored wool repeats never sample the lower gray tile');
 }
 const stone=h.materials.albedo(h.M.ID.stone,[.3,.7,.1],[0,1,0],[.8,.3,.1]);
 assert.ok(Math.abs(stone[0]/stone[1]-8/3)<1e-10,'stone detail preserves terracotta/paint hue');
 h.materials.dispose();
});

test('NPOT source becomes a padded POT texture, uploads once with mipmaps, and disposes GPU resources',()=>{
 const h=harness(),gl=graphics(),program={};
 h.materials.bind(gl,program);assert.equal(gl.values.uHasMaterialAtlas,0);assert.equal(gl.uploads.length,1);
 h.images[0].onload();h.materials.bind(gl,program);h.materials.bind(gl,program);
 assert.equal(gl.values.uHasMaterialAtlas,1);assert.equal(gl.textures,1);assert.equal(gl.uploads.length,2);
 assert.equal(gl.uploads[1].at(-1).width,1024);assert.equal(gl.uploads[1].at(-1).height,1024);
 assert.equal(gl.mipmaps,1);assert.ok(gl.parameters.some(p=>p[1]===gl.TEXTURE_MIN_FILTER&&p[2]===gl.LINEAR_MIPMAP_LINEAR));
 assert.ok(gl.parameters.some(p=>p[1]===gl.TEXTURE_WRAP_S&&p[2]===gl.CLAMP_TO_EDGE));
 assert.ok(gl.parameters.some(p=>p[1]===gl.TEXTURE_WRAP_T&&p[2]===gl.CLAMP_TO_EDGE));
 h.materials.dispose();h.materials.dispose();assert.equal(gl.deleted,1);
});

test('failed uploads and timed-out downloads retain procedural materials without retry loops',async()=>{
 const h=harness(),gl=graphics({failUpload:true}),program={};
 h.images[0].onload();h.materials.bind(gl,program);h.materials.bind(gl,program);
 assert.equal(gl.values.uHasMaterialAtlas,0);assert.equal(gl.uploads.filter(args=>args.length===6).length,1);
 h.materials.dispose();
 const timeout=harness(),late=timeout.images[0].onload;timeout.timers.get(1)();late();await Promise.resolve();
 assert.equal(timeout.materials.ready,false);assert.equal(timeout.changed,1);
 const wool=timeout.materials.surface({material:2,center:[0,0,0],n:[0,1,0],color:[.9,.85,.75,1]});
 assert.ok(wool.slice(0,3).every(v=>Number.isFinite(v)&&v>.6));timeout.materials.dispose();
});

test('teardown suppresses late asset callbacks and shading remains finite for all materials',async()=>{
 const h=harness(),late=h.images[0].onload;h.materials.dispose();late();await Promise.resolve();
 assert.equal(h.changed,0);assert.equal(h.timers.size,0);
 const out=[0,0,0];
 for(const kind of Object.values(h.M.ID))for(const n of [[0,1,0],[0,0,0],[-1,.1,.3]]){
  assert.equal(h.M.shade(kind,[.2,.4,.6],n,[0,0,1],[0,0,-1],out),out);
  assert.ok(out.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 }
});
