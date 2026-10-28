const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r))};
const gattoWorld=JSON.parse(fs.readFileSync('public/gatto-world.json','utf8'));
const motionContext={window:{}};vm.runInNewContext(fs.readFileSync('public/planet-renderer.js','utf8'),motionContext);
const portraitAngle=motionContext.window.ParallaxPlanetRenderer.portraitAngle;
const gatto={id:'curated-gatto',name:'GATTO',ticker:'GATTO',description:gattoWorld.description,color:gattoWorld.design,wallet:null,contractAddress:gattoWorld.contractAddress,url:gattoWorld.url,href:'/projects/gatto',shareUrl:'https://parallaxlaunch.live/share/gatto-v207',provenance:'curated',showcase:'community-showcase',profile:{category:'token',image:gattoWorld.image,x:gattoWorld.x},style:gattoWorld.style};
const project={id:'owned-world',name:'Developer tools',ticker:'TOOLS',description:'Build things',color:'p-1-earth-thin-clouds',wallet:'wallet',contractAddress:null,href:'/world/owned-world',provenance:'community',profile:{category:'tool'}};
const feed=(projects=[gatto],extra={})=>({projects,total:projects.length,nextOffset:null,...extra});
const discovery=(sort,asOf=1792324800000)=>({sort,asOf,from:sort==='explored'?asOf-7*86400000:null});
function harness({data=feed(),reduced=false,search='',canvas=true,width=900,height=560}={}){
 const ids=new Map(),all=[],events=new Map(),frames=new Map(),timers=new Map(),observers=new Map(),calls=[],draws=[],paints=[];let index=0;
 class El{constructor(tag='div'){this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.hidden=false;this.disabled=false;this.open=false;this.isConnected=true;this.style={setProperty:(k,v)=>{this.style[k]=v}};this.events={};this.clientWidth=width;this.clientHeight=height;this.classList={toggle(){},add(){},remove(){}};this._text='';this.value='';all.push(this)}
 set id(v){this._id=v;ids.set(v,this)}get id(){return this._id}set textContent(v){this._text=String(v);this.children=[]}get textContent(){return this._text+this.children.map(x=>x.textContent).join(' ')}set innerHTML(v){throw Error('Unsafe HTML '+v)}
 append(...xs){this.children.push(...xs)}replaceChildren(...xs){this.children=[];this._text='';this.append(...xs)}before(...xs){this.beforeNodes=xs}setAttribute(k,v){this.attrs[k]=String(v)}getAttribute(k){return this.attrs[k]}removeAttribute(k){delete this.attrs[k];if(k.startsWith('data-'))delete this.dataset[k.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]}
 showModal(){this.open=true}close(){this.open=false;(this.events.close||[]).forEach(fn=>fn({}))}
 addEventListener(k,fn){(this.events[k]??=[]).push(fn)}focus(){document.activeElement=this;this.onfocus?.()}click(){this.onclick?.()}scrollIntoView(){}closest(){return null}setPointerCapture(){}
 getContext(){if(!canvas)return null;return new Proxy({drawImage:(image,x,y,w,h)=>paints.push({canvas:this.id,source:image.src,x,y,w,h}),createRadialGradient:()=>({addColorStop(){}})},{get:(t,k)=>k in t?t[k]:()=>{},set:(t,k,v)=>{t[k]=v;return true}})}
 }
 for(const m of fs.readFileSync('app/planets.html','utf8').matchAll(/<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"[^>]*>/g)){const e=new El(m[1]);e.id=m[2];e.hidden=/\bhidden\b/.test(m[0]);}
 const flight=new El(),settings={data,direct:feed([])},listen=(name,fn)=>{(events.get(name)||events.set(name,[]).get(name)).push(fn)};
 const document={hidden:false,body:new El('body'),activeElement:null,getElementById:id=>ids.get(id)||null,createElement:t=>new El(t),querySelector:s=>s==='.universe-flight-bar'?flight:null,querySelectorAll:s=>s==='[data-universe-project]'?all.filter(e=>e.dataset.universeProject):[],addEventListener:(k,fn)=>listen('document:'+k,fn)};
 const sandbox={document,window:null,location:{href:'https://parallaxlaunch.live/planets'+search,search,origin:'https://parallaxlaunch.live'},history:{replaceState(_a,_b,url){settings.url=url}},URL,URLSearchParams,AbortController,console,Date,performance:{now:()=>0},devicePixelRatio:1,navigator:{clipboard:{writeText:async v=>{settings.copied=v}}},CustomEvent:class{constructor(type,arg){this.type=type;this.detail=arg?.detail}},matchMedia:()=>({matches:reduced,addEventListener(){}}),addEventListener:listen,dispatchEvent:e=>(events.get(e.type)||[]).forEach(fn=>fn(e)),requestAnimationFrame:fn=>{frames.set(++index,fn);return index},cancelAnimationFrame:id=>frames.delete(id),setTimeout:(fn,delay)=>{timers.set(++index,{fn,delay});return index},clearTimeout:id=>timers.delete(id),IntersectionObserver:class{constructor(fn){this.fn=fn}observe(el){observers.set(el.id,this.fn)}},ResizeObserver:class{observe(){}},fetch:async(url,opts)=>{calls.push({url,opts});const d=url.includes('id=')?settings.direct:settings.data;if(d instanceof Error)throw d;const result=typeof d==='function'?await d(url):d;return{ok:true,json:async()=>result}},ParallaxSingularity:{draw:(ctx,x,y,r,t,options)=>{draws.push({x,y,r,t,options,design:'singularity'});return 'live'}},ParallaxPlanetRenderer:{draw:(ctx,x,y,r,design,t,style)=>{draws.push({x,y,r,design,t,style});return true}}};
 sandbox.window=sandbox;vm.createContext(sandbox);for(const file of ['planet-design.js','premium-scene.js','community-atlas-core.js','community-atlas-scene.js','community-atlas.js'])vm.runInContext(fs.readFileSync('public/'+file,'utf8'),sandbox);
 return{get:id=>ids.get(id),settings,sandbox,draws,paints,calls,all,frames,flight,observers,fire:(name,e={})=>(events.get(name)||[]).forEach(fn=>fn(e)),elementEvent:(id,name,e)=>(ids.get(id).events[name]||[]).forEach(fn=>fn(e)),frame(now=100){const current=[...frames.values()];frames.clear();current.forEach(fn=>fn(now))}};
}
test('GATTO is a rendered world in the default community mode with its actual design, artwork and page',async()=>{const h=harness();await flush();h.frame();assert.equal(h.get('community-atlas').hidden,false);assert.equal(h.get('solar-atlas').hidden,true);assert.equal(h.get('universe-hit-targets').children.length,1);assert.equal(h.get('universe-project-name').textContent,'GATTO');assert.equal(h.get('universe-project-art').children[0].src,gattoWorld.image);assert.equal(h.get('universe-project-actions').children[0].href,'/projects/gatto');assert(h.draws.some(d=>d.style?.identity==='gatto'&&d.t===6.4));assert.match(h.get('universe-project-note').textContent,/token address comes from project sources/);assert.equal(h.get('universe-project-token').hidden,false);assert.equal(h.get('universe-project-token').children[1].textContent,gattoWorld.contractAddress);assert.equal(h.get('universe-project-socials').children[0].href,gattoWorld.url);assert.equal(h.get('universe-project-socials').children[1].href,gattoWorld.x);assert.equal(h.get('universe-land-gatto').hidden,false);assert.equal(h.get('universe-land-sheeple').hidden,true);assert.equal(h.settings.url,'/planets?world=curated-gatto');assert.equal(h.calls.length,1);await h.get('universe-project-actions').children[1].onclick();assert.equal(h.settings.copied,'https://parallaxlaunch.live/share/gatto-v207')});
test('discovery filters open a usable list with counted visits, direct explore links and preserved search',async()=>{
 const counted={...project,countedVisits7d:12},h=harness({search:'?sort=explored&q=Developer&category=tool',data:feed([counted],{discovery:discovery('explored')})});await flush();
 assert.equal(h.get('universe-list').hidden,false);assert.equal(h.get('universe-discovery').value,'explored');assert.match(h.calls[0].url,/sort=explored/);assert.match(h.calls[0].url,/q=Developer&category=tool/);
 assert.match(h.get('universe-list').children[0].textContent,/12 counted visits · 7d/);assert.match(h.get('universe-discovery-note').textContent,/Most Explored.*Updated.*UTC/);
 const actions=h.get('universe-list').children[0].children.find(e=>e.className==='universe-card-actions');assert.equal(actions.children[0].tagName,'a');assert.equal(actions.children[0].href,project.href);assert.equal(actions.children[0].textContent,'Explore planet ↗');
 h.settings.data=feed([{...project,createdAt:'2026-10-17T19:00:00Z'}],{discovery:discovery('newest')});h.get('universe-discovery').value='newest';h.get('universe-discovery').onchange();await flush();
 assert.match(h.get('universe-list').children[0].textContent,/Published .*2026.*UTC/);assert.doesNotMatch(h.get('universe-list').children[0].textContent,/counted visits/);assert.match(h.settings.url,/sort=newest/);assert.match(h.settings.url,/q=Developer/);
 h.get('universe-view-space').click();assert.equal(h.get('universe-stage').hidden,false);assert.match(h.settings.url,/view=space/);
});
test('rank pagination pins its window and failed refreshes keep the prior timestamp',async()=>{
 const meta=discovery('explored'),h=harness({search:'?sort=explored',data:feed([{...project,countedVisits7d:8}],{total:2,nextOffset:60,discovery:meta})});await flush();
 const note=h.get('universe-discovery-note').textContent;h.settings.data=feed([{...project,id:'next-world',countedVisits7d:2}],{total:2,discovery:meta});await h.get('universe-more').onclick();
 assert.match(h.calls.at(-1).url,new RegExp('asOf='+meta.asOf));assert.equal(h.get('universe-list').children.length,2);
 h.settings.data=Error('Service unavailable');await h.get('universe-retry').onclick();assert.match(h.get('universe-status').textContent,/previously loaded/);assert.equal(h.get('universe-discovery-note').textContent,note);assert.equal(h.get('universe-list').children.length,2);
 h.get('universe-discovery').value='newest';h.get('universe-discovery').onchange();await flush();assert.equal(h.get('universe-list').children.length,0);assert.equal(h.get('universe-empty').hidden,true);assert.match(h.get('universe-discovery-note').textContent,/unavailable/);
});
test('empty discovery explains enrollment and shared worlds cannot contaminate rankings',async()=>{
 const h=harness({search:'?sort=explored&world=curated-gatto',data:feed([],{discovery:discovery('explored')})});await flush();
 assert.equal(h.calls.length,1);assert.equal(h.get('universe-list').children.length,0);assert.equal(h.get('universe-empty').hidden,false);assert.match(h.get('universe-empty-copy').textContent,/No enrolled projects/);assert.match(h.get('universe-status').textContent,/outside these discovery results/);
 h.settings.data=feed([gatto]);h.get('universe-discovery').value='all';h.get('universe-discovery').onchange();await flush();assert.equal(h.get('universe-project-name').textContent,'GATTO');assert.equal(h.get('universe-discovery-note').textContent,'');
 const c=h.sandbox.ParallaxCommunityCore;for(const value of [0,-2,1.5,'5',Infinity])assert.throws(()=>c.project({...project,countedVisits7d:value}));assert.throws(()=>c.project({...gatto,countedVisits7d:5}));
});
test('safe list and map selection share the same profile, preserving non-token identities',async()=>{const h=harness({data:feed([gatto,{...project,name:'<script>bad</script>',profile:{category:'tool',x:'javascript:alert(1)',image:'//evil.test/a'}}])});await flush();h.get('universe-view-list').click();assert.equal(h.get('universe-stage').hidden,true);assert.equal(h.frames.size,0);h.all.find(e=>e.dataset.universeProject===project.id).click();assert.equal(h.get('universe-project-name').textContent,'<script>bad</script>');assert.equal(h.get('universe-project-ticker').textContent,'TOOLS');assert.equal(h.get('universe-project-socials').children.length,0);assert.equal(h.get('universe-project-art').hidden,true);assert.match(h.settings.url,/world=owned-world/);await h.get('universe-project-actions').children[1].onclick();assert.equal(h.settings.copied,'https://parallaxlaunch.live/planets?world=owned-world')});
test('search, sectors, pagination and failed requests retain the correct visible state',async()=>{const h=harness({data:feed([gatto],{total:2,nextOffset:60})});await flush();h.settings.data=feed([gatto,project],{total:2});await h.get('universe-more').onclick();assert.equal(h.get('universe-list').children.length,2);assert.match(h.calls.at(-1).url,/offset=60/);h.settings.data=Error('Service unavailable');await h.get('universe-retry').onclick();assert.match(h.get('universe-status').textContent,/previously loaded/);h.get('universe-sector').value='tool';h.get('universe-sector').onchange();await flush();assert.equal(h.get('universe-list').children.length,0);assert.equal(h.get('universe-count').textContent,'Project count unavailable');assert.equal(h.get('universe-empty').hidden,true);h.settings.data=feed([]);h.get('universe-search').value='missing';h.get('universe-search-form').onsubmit({preventDefault(){}});await flush();assert.match(h.calls.at(-1).url,/q=missing&category=tool/);assert.equal(h.get('universe-empty').hidden,false)});
test('a stale response cannot replace newer filtered worlds',async()=>{let finish;const h=harness({data:()=>new Promise(r=>finish=r)});await flush();h.settings.data=feed([project]);h.get('universe-sector').value='tool';h.get('universe-sector').onchange();await flush();finish(feed([gatto]));await flush();assert.equal(h.get('universe-project-name').textContent,'Developer tools');assert.equal(h.get('universe-list').children.length,1)});
test('deep links resolve worlds beyond page one and claiming refreshes the shared feed',async()=>{const h=harness({search:'?world=owned-world'});h.settings.direct=feed([project]);await flush();assert.equal(h.get('universe-project-name').textContent,'Developer tools');assert.equal(h.calls.length,2);h.settings.data=feed([gatto,project]);h.fire('parallax:atlas-claims-changed',{detail:{id:project.id}});await flush();assert.equal(h.get('universe-project-name').textContent,'Developer tools');assert.equal(h.get('universe-list').children.length,2)});
test('solar links still open the solar mode and switching suspends inactive scenes',async()=>{const h=harness({search:'?planet=saturn'});await flush();assert.equal(h.get('community-atlas').hidden,true);assert.equal(h.get('solar-atlas').hidden,false);assert.equal(h.frames.size,0);h.get('mode-community').click();h.frame();assert.equal(h.get('community-atlas').hidden,false);assert(h.frames.size>0);assert(!h.settings.url.includes('planet='));h.get('mode-solar').click();assert.equal(h.frames.size,0);assert.match(h.settings.url,/mode=solar/)});
test('camera controls alter projected positions, honor reduced motion and remain bounded',async()=>{const h=harness({data:feed([gatto,project]),reduced:true});await flush();h.frame();assert.equal(h.frames.size,0);h.get('universe-home').click();h.frame(200);const button=h.get('universe-hit-targets').children[1],before=button.style.transform;h.get('universe-right').click();h.frame(300);assert.notEqual(button.style.transform,before);for(let i=0;i<100;i++)h.get('universe-zoom-in').click();h.frame(400);assert.doesNotMatch(button.style.transform,/NaN|Infinity/);h.get('universe-motion').click();h.frame(500);assert(h.frames.size>0);h.sandbox.document.hidden=true;h.fire('document:visibilitychange');assert.equal(h.frames.size,0)});
test('geometry is deterministic, culls points behind camera and rejects malformed feeds/URLs',async()=>{const h=harness();await flush();const c=h.sandbox.ParallaxCommunityCore,p=c.project(gatto),camera={x:0,y:0,z:0,yaw:0,pitch:0,distance:300};assert.equal(c.projectPoint({x:0,y:0,z:400},camera,900,500),null);assert.equal(c.projectPoint({x:0,y:0,z:0},camera,900,500).x,450);assert.equal(c.layout([p]).get(p.id).x,c.layout([p]).get(p.id).x);assert.throws(()=>c.feed({projects:[gatto],total:'1',nextOffset:null}));assert.throws(()=>c.project({...gatto,href:'javascript:alert(1)'}));for(const v of ['javascript:alert(1)','//evil.test/a','http://evil.test/a','https://user:pass@example.test'])assert.equal(c.safeURL(v,true),null)});
test('canvas-unavailable browsers default to a usable list, never a blank map',async()=>{const h=harness({canvas:false});await flush();assert.equal(h.get('universe-list').hidden,false);assert.equal(h.get('universe-view-space').disabled,true);assert.equal(h.get('universe-list').children.length,1);assert.match(h.get('universe-status').textContent,/List view/)});
test('touch orbit and pinch update the camera; expanded list retains a visible exit',async()=>{const h=harness({reduced:true});await flush();h.frame();const button=h.get('universe-hit-targets').children[0],before=button.style.width;const pointer=(pointerId,x,y)=>({pointerId,clientX:x,clientY:y,button:0,target:h.get('universe-stage')});h.elementEvent('universe-stage','pointerdown',pointer(1,100,100));h.elementEvent('universe-stage','pointerdown',pointer(2,200,100));h.elementEvent('universe-stage','pointermove',pointer(2,350,100));h.frame(200);assert.notEqual(button.style.width,before);h.elementEvent('universe-stage','pointerup',pointer(1,100,100));h.elementEvent('universe-stage','pointercancel',pointer(2,350,100));h.get('universe-expand').click();assert.equal(h.get('universe-collapse').hidden,false);h.get('universe-view-list').click();assert.equal(h.get('universe-collapse').hidden,false);h.get('universe-collapse').click();assert.equal(h.get('universe-collapse').hidden,true)});
test('dense maps bound detailed planets and stop rendering offscreen',async()=>{const many=Array.from({length:180},(_,i)=>({...project,id:'world-'+i,href:'/world/world-'+i,profile:{category:['token','tool','community','infrastructure','creative'][i%5]}}));const h=harness({data:feed(many)});await flush();h.get('universe-home').click();for(let i=1;i<60;i++)h.frame(i*40);assert(h.get('universe-hit-targets').children.filter(b=>!b.hidden).length<=24);h.observers.get('universe-stage')([{isIntersecting:false}]);assert.equal(h.frames.size,0);h.observers.get('universe-stage')([{isIntersecting:true}]);assert(h.frames.size>0)});
test('project details open only on request, suspend motion, and return focus when closed',async()=>{const h=harness();await flush();h.frame();assert.equal(h.get('universe-profile-dialog').open,false);assert.equal(h.get('universe-spotlight-name').textContent,'GATTO');assert.equal(h.get('universe-enter-world').href,'/projects/gatto');h.get('universe-open-profile').focus();h.get('universe-open-profile').click();assert.equal(h.get('universe-profile-dialog').open,true);assert.equal(h.frames.size,0);assert.equal(h.sandbox.document.activeElement,h.get('universe-close-profile'));h.get('universe-close-profile').click();assert.equal(h.get('universe-profile-dialog').open,false);assert.equal(h.sandbox.document.activeElement,h.get('universe-open-profile'));assert(h.frames.size>0)});
test('focused worlds render at higher resolution, with simpler framing',async()=>{const h=harness();await flush();h.frame();assert(h.draws.some(d=>d.design===gatto.color&&d.r>200));assert.equal(h.get('universe-next').hidden,true);});

test('all ecosystem worlds retain their branded render styles, artwork, independent status and destinations',async()=>{
 const catalog=JSON.parse(fs.readFileSync('public/ecosystem-worlds.json','utf8'));
 const entries=catalog.map(w=>({...project,id:'curated-'+w.id,name:w.name,ticker:w.ticker||(w.id==='solana'?'SOL':w.name.toUpperCase()),label:w.label,description:w.description,color:w.design,url:w.url,href:'/projects/'+w.id,shareUrl:w.shareUrl,wallet:null,contractAddress:w.contractAddress||null,provenance:'curated',showcase:w.showcase||'ecosystem',profile:{category:w.sector||(w.id==='solana'?'infrastructure':'tool'),image:w.image,imageAlt:w.concept,x:w.x},style:{theme:'aurora',moons:0,...w.style}}));
 const h=harness({data:feed([gatto,...entries]),reduced:true});await flush();h.frame();assert.equal(h.get('universe-hit-targets').children.length,11);assert.equal(h.get('universe-next').hidden,false);
 for(const w of catalog){
  h.fire('parallax:community-select',{detail:{id:'curated-'+w.id}});h.frame();
  assert.equal(h.get('universe-spotlight-name').textContent,w.name);assert.equal(h.get('universe-enter-world').href,'/projects/'+w.id);assert.equal(h.get('universe-project-art').children[0].src,w.image);assert.equal(h.get('universe-project-ticker').textContent,w.label);assert.equal(h.get('universe-project-token').hidden,!w.contractAddress);
  if(w.contractAddress){assert.equal(h.get('universe-provenance').textContent,w.showcase==='community-showcase'?'COMMUNITY SHOWCASE':'CURATED');assert.match(h.get('universe-project-note').textContent,/partnership/);assert.equal(h.get('universe-project-token').children[1].textContent,w.contractAddress);assert.equal(h.get('universe-project-token').children[3].href,'/terminal?token='+w.contractAddress);assert.equal(h.get('universe-project-identity').hidden,true);}else assert.match(h.get('universe-project-note').textContent,/not a partnership/);
  assert.equal(h.get('universe-project-socials').children[0].href,w.url);
  const rendering=h.draws.find(d=>d.design===w.design&&d.style?.palette?.primary===w.style.palette.primary);
  assert(rendering);assert.equal(rendering.style.identity,w.style.identity,'The Atlas must pass the selected motif through to its shared renderer');assert.equal(rendering.style.realism,w.style.realism,'Curated material settings must survive Atlas normalization');
  assert.equal(rendering.t,w.style.identity||w.style.realism==='terrain-v209'?6.4:2,'Curated artwork should match the exported view in Atlas thumbnails');
  await h.get('universe-project-actions').children[1].onclick();assert.equal(h.settings.copied,w.shareUrl);
 }
 assert.equal(h.sandbox.ParallaxCommunityCore.safeURL('/assets/ecosystem/../../private',true),null);
});

test('Atlas portrait autoplay uses the shared bounded turn while camera controls keep their existing role',async()=>{
 const w=JSON.parse(fs.readFileSync('public/ecosystem-worlds.json','utf8')).find(world=>world.id==='bonk');
 const entry={...gatto,id:'curated-bonk',name:w.name,color:w.design,href:'/projects/bonk',shareUrl:w.shareUrl,profile:{category:'token',image:w.image},style:{theme:'aurora',moons:0,...w.style}};
 const h=harness({data:feed([entry])});await flush();
 for(let i=1;i<=420;i++)h.frame(i*100);
 const phases=h.draws.filter(draw=>draw.style?.identity==='bonk').map(draw=>draw.t),angles=phases.map(portraitAngle),limit=24*Math.PI/180;
 assert(phases.some(phase=>phase>6.4+limit/.15),'Atlas must pass the continuous animation phase to the shared renderer');
 assert(angles.every(angle=>Math.abs(angle)<=limit+1e-9));
 assert(angles.some((angle,i)=>i>0&&angle<angles[i-1]-1e-6),'The selected portrait must turn back automatically');
 h.get('universe-motion').click();h.get('universe-right').click();h.frame(43000);
 assert.equal(h.get('universe-project-name').textContent,w.name);assert.equal(h.get('universe-enter-world').href,'/projects/bonk');
 assert.equal(h.get('universe-stage').attrs['aria-label'],'Community space camera. Use arrow keys to orbit, plus and minus to zoom, Home for overview.');
});

test('community artwork replaces the WebGL fallback after loading even with motion paused, and errors do not retry',async()=>{
 for(const w of [...JSON.parse(fs.readFileSync('public/ecosystem-worlds.json','utf8')).filter(w=>['bonk','solana'].includes(w.id)),gattoWorld]){
 const entry={...gatto,shareUrl:w.shareUrl,id:'curated-'+w.id,name:w.name,color:w.design,profile:{category:'token',image:w.image},style:{theme:'aurora',moons:0,...w.style}};
 for(const outcome of ['load','error']){
  const h=harness({data:feed([entry]),reduced:true}),images=[];
  h.sandbox.ParallaxPlanetRenderer.draw=()=>false;
  h.sandbox.Image=class{constructor(){images.push(this)}};
  await flush();h.frame();
  assert.equal(images.length,1);assert.equal(images[0].src,w.image);assert.equal(h.frames.size,0);
  const listOrb=h.get('universe-list').children[0].children.find(el=>el.className==='universe-card-heading').children[0];
  assert.equal(listOrb.tagName,'img');assert.equal(listOrb.src,w.image,'Unavailable WebGL must retain the matching export in list thumbnails');
  assert(!h.paints.some(p=>p.source===w.image),'The pending image must not be drawn before it loads');
  images[0]['on'+outcome]();
  if(outcome==='load'){
   assert.equal(h.frames.size,1,'Loaded artwork must schedule a frame even when reduced motion is enabled');
   h.frame(200);assert(h.paints.some(p=>p.source===w.image&&p.w>0&&p.h>0));
  }else assert.equal(h.frames.size,0,'A failed image must leave the static fallback without starting an animation loop');
  h.fire('parallax:planet-texture');h.frame(300);
  assert.equal(images.length,1,'Invalidating a sprite must reuse the loaded or failed artwork request');
  assert.equal(h.frames.size,0);
  if(outcome==='error')assert(!h.paints.some(p=>p.source===w.image));
 }
 }
});

test('pending curated textures use the current export in the Atlas and list until readiness is confirmed',async()=>{
 const worlds=JSON.parse(fs.readFileSync('public/ecosystem-worlds.json','utf8')).filter(w=>['bonk','solana'].includes(w.id));
 worlds.push(JSON.parse(fs.readFileSync('public/solhandle-world.json','utf8')));
 for(const w of worlds){
  const entry={...gatto,shareUrl:w.shareUrl,id:'curated-'+w.id,name:w.name,color:w.design,profile:{category:'tool',image:w.image},style:{theme:'aurora',moons:0,...w.style}};
  const h=harness({data:feed([entry]),reduced:true}),images=[];let ready=false;
  h.sandbox.ParallaxPlanetRenderer.ready=()=>ready;
  h.sandbox.Image=class{constructor(){images.push(this)}};
  await flush();h.frame();
  assert(h.draws.some(draw=>draw.design===w.design),'Draw must still start the shared renderer texture requests');
  assert.equal(images.length,1);assert.equal(images[0].src,w.image);
  const orb=()=>h.get('universe-list').children[0].children.find(el=>el.className==='universe-card-heading').children[0];
  assert.equal(orb().tagName,'img');assert.equal(orb().src,w.image);
  images[0].onload();h.frame(200);assert(h.paints.some(paint=>paint.source===w.image));
  const staticPaints=h.paints.filter(paint=>paint.source===w.image).length;
  h.get('universe-view-list').click();ready=true;h.fire('parallax:planet-texture');
  assert.equal(orb().tagName,'canvas','The texture-ready event restores the live list render');
  h.get('universe-view-space').click();h.frame(300);
  assert.equal(h.paints.filter(paint=>paint.source===w.image).length,staticPaints,'A ready live world must replace its static fallback');
  assert.equal(images.length,1,'Texture readiness must not duplicate the exported-image request');
 }
});

test('the Parallax home is a compact 3D black hole with a working destination, token research and share links',async()=>{
 const home={...gatto,shareUrl:undefined,id:'curated-parallax',name:'PARALLAX',ticker:'PRLX',label:'$PRLX / THE SINGULARITY',href:'/projects/parallax',renderKind:'singularity',showcase:'parallax',contractAddress:'8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump',profile:{category:'token',image:'/assets/projects/parallax-horizon.webp',telegram:'https://t.me/parallaxliveupdates'}};
 const h=harness({data:feed([home,gatto,project]),reduced:true});await flush();h.frame();
 assert.equal(h.get('universe-spotlight-name').textContent,'PARALLAX');assert.equal(h.get('universe-provenance').textContent,'PARALLAX HOME');assert.equal(h.get('universe-enter-world').href,'/projects/parallax');assert.equal(h.get('universe-project-art').children[0].src,'/assets/projects/parallax-horizon.webp');assert.equal(h.get('universe-project-token').hidden,false);assert(h.draws.some(d=>d.design==='singularity'));assert.doesNotMatch(h.get('universe-project-note').textContent,/have not been linked/);
 const core=h.sandbox.ParallaxCommunityCore,points=core.layout([core.project(home),core.project(gatto)]);assert(points.get(home.id).r<points.get(gatto.id).r);assert(Math.hypot(points.get(home.id).x-points.get(gatto.id).x,points.get(home.id).y-points.get(gatto.id).y,points.get(home.id).z-points.get(gatto.id).z)>250);
 assert.equal(core.project({...home,id:'fake',provenance:'community'}).renderKind,'planet');
 await h.get('universe-project-actions').children[1].onclick();assert.equal(h.settings.copied,'https://parallaxlaunch.live/planets?world=curated-parallax');
});


test('Atlas opens in overview and the compact black hole responds to orbit even with motion paused',async()=>{
 const home={...gatto,shareUrl:undefined,id:'curated-parallax',name:'PARALLAX',ticker:'PRLX',href:'/projects/parallax',renderKind:'singularity',showcase:'parallax'};
 const h=harness({data:feed([home,gatto,project]),reduced:true});await flush();h.frame();
 assert.match(h.get('universe-location').textContent,/OVERVIEW/);
 const worlds=h.get('universe-hit-targets').children;assert(worlds.every(b=>!b.hidden));
 const blackHole=h.draws.filter(d=>d.design==='singularity').at(-1),before=blackHole.options.yaw;
 h.get('universe-right').click();h.frame(200);
 const after=h.draws.filter(d=>d.design==='singularity').at(-1);assert.notEqual(after.options.yaw,before);assert.equal(h.frames.size,0);
 h.fire('parallax:community-select',{detail:{id:gatto.id}});h.get('universe-home').click();h.frame(300);
 const unselected=h.draws.filter(d=>d.design==='singularity').at(-1).options.pitch;
 h.get('universe-up').click();h.frame(400);assert.notEqual(h.draws.filter(d=>d.design==='singularity').at(-1).options.pitch,unselected);
 h.fire('parallax:community-select',{detail:{id:home.id}});h.frame(500);
 for(let i=0;i<20;i++)h.get('universe-zoom-in').click();h.frame(600);
 assert(parseFloat(worlds[0].style.width)<=200,'Black-hole hit target must remain bounded when zoomed');
});


test('the black hole leaves every curated planet clear in desktop and mobile overview',async()=>{
 const home={...gatto,shareUrl:undefined,id:'curated-parallax',name:'PARALLAX',ticker:'PRLX',href:'/projects/parallax',renderKind:'singularity',showcase:'parallax'};
 const catalog=JSON.parse(fs.readFileSync('public/ecosystem-worlds.json','utf8'));
 const worlds=catalog.map(w=>({...project,id:'curated-'+w.id,name:w.name,href:'/projects/'+w.id,provenance:'curated',profile:{category:w.sector||(w.id==='solana'?'infrastructure':'tool')}}));
 for(const width of [390,900,1440]){
  const h=harness({data:feed([home,gatto,...worlds]),reduced:true,width,height:650});await flush();h.frame();
  const buttons=h.get('universe-hit-targets').children;
  const screen=b=>{const [x,y]=b.style.transform.match(/-?[\d.]+/g).map(Number),size=parseFloat(b.style.width);return{x:x+size/2,y:y+size/2}};
  const centers=buttons.map(screen),rendered=h.paints.filter(p=>p.canvas==='universe-canvas');
  const body=center=>{const p=rendered.find(p=>Math.hypot(p.x+p.w/2-center.x,p.y+p.h/2-center.y)<1);assert(p);return{...center,r:p.w*.45}};
  const bh=body(centers[0]);
  assert(buttons.every(b=>!b.hidden));
  for(const b of buttons.slice(1)){
   const p=body(screen(b));assert(Math.hypot(p.x-bh.x,p.y-bh.y)>p.r+bh.r,'Black-hole disk overlaps '+b.attrs['aria-label']+' at width '+width+' '+JSON.stringify({bh,p}));
  }
 }
});

test('growth keeps a common free size, caps diameter at 1.8x, and separates maxed worlds',async()=>{
 const h=harness({data:feed([project,gatto]),reduced:true});await flush();const core=h.sandbox.ParallaxCommunityCore;
 const base=core.layout([core.project(project)]).get(project.id);assert.equal(base.r,62);
 const max=core.layout([core.project({...project,growthLevel:100})]).get(project.id);assert.equal(max.r,62*1.8);
 assert.equal(core.project({...project,growthLevel:10000}).growthLevel,1);
 const worlds=Array.from({length:60},(_,i)=>core.project({...project,id:'world-'+i,growthLevel:100})),points=[...core.layout(worlds).values()];
 assert(points.every(p=>p.r===62*1.8));for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){const p=points[i],q=points[j];assert(Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)>=(p.r+q.r)*2.2+23.9);}
});

test('angled 3D overview separates thirteen worlds while retaining depth and readable sizes',async()=>{
 const home={...gatto,shareUrl:undefined,id:'curated-parallax',name:'PARALLAX',ticker:'PRLX',href:'/projects/parallax',renderKind:'singularity',showcase:'parallax'};
 const catalog=JSON.parse(fs.readFileSync('public/ecosystem-worlds.json','utf8'));
 const worlds=[home,gatto,...catalog.map(w=>({...project,id:'curated-'+w.id,name:w.name,href:'/projects/'+w.id,provenance:'curated',profile:{category:w.sector||'tool'}})),{...project,id:'community-jupiter',name:'Community Jupiter',href:'/world/community-jupiter',profile:{category:'community'}}];
 for(const [width,height]of [[390,560],[900,600],[1440,760]]){
  const h=harness({data:feed(worlds),reduced:true,width,height});await flush();h.frame();
  const buttons=h.get('universe-hit-targets').children,rendered=h.paints.filter(p=>p.canvas==='universe-canvas');
  const centers=buttons.map(button=>{assert.equal(button.hidden,false);const [x,y]=button.style.transform.match(/-?[\d.]+/g).map(Number),size=parseFloat(button.style.width),center={x:x+size/2,y:y+size/2};const paint=rendered.find(p=>Math.hypot(p.x+p.w/2-center.x,p.y+p.h/2-center.y)<1);assert(paint);return{...center,r:paint.w*.45}});
  assert(Math.abs(centers[0].x-width/2)<1);assert(Math.abs(centers[0].y-height/2)<1);
  for(let i=0;i<centers.length;i++){
   const p=centers[i];assert(p.x-p.r>=12&&p.x+p.r<=width-12&&p.y-p.r>=55&&p.y+p.r<=height-55,'World should fit the safe overview area');
   for(let j=i+1;j<centers.length;j++){const q=centers[j];assert(Math.hypot(p.x-q.x,p.y-q.y)>p.r+q.r+3,'Curated art overlaps at '+width+'px: '+buttons[i].attrs['aria-label']+' / '+buttons[j].attrs['aria-label'])}
  }
  const core=h.sandbox.ParallaxCommunityCore,forward=core.layout(worlds.map(core.project)),backward=core.layout([...worlds].reverse().map(core.project));
  for(const [id,p]of forward)assert.deepEqual(p,backward.get(id),'Feed order should not move a world');
  const cloud=core.layout(worlds.map(core.project),{w:width,h:height,compact:width<700}),camera=core.overviewCamera(cloud,width,height),views=[...cloud.values()].map(p=>core.projectPoint(p,camera,width,height));
  assert.equal(camera.yaw,-.15);assert.equal(camera.pitch,.28);
  const depths=views.map(p=>p.depth);assert(Math.max(...depths)-Math.min(...depths)>(width<700?250:400),'The overview must retain substantial genuine foreground/background depth');
  const bodyRadii=[...cloud].filter(([id])=>id!==home.id).map(([,p])=>core.projectPoint(p,camera,width,height).r);
  assert(Math.max(...bodyRadii)/Math.min(...bodyRadii)>1.2,'Perspective must produce visible near/far size variation');
  assert(Math.min(...bodyRadii)>(width<700?13:21),'Browsing art must remain readable rather than zooming everything into tiny dots');
  const positions=[...cloud.values()],a=positions[0];let volume=0;
  for(let i=1;i<positions.length;i++)for(let j=i+1;j<positions.length;j++)for(let k=j+1;k<positions.length;k++){const b=positions[i],c=positions[j],d=positions[k],u=[b.x-a.x,b.y-a.y,b.z-a.z],v=[c.x-a.x,c.y-a.y,c.z-a.z],t=[d.x-a.x,d.y-a.y,d.z-a.z];volume=Math.max(volume,Math.abs(u[0]*(v[1]*t[2]-v[2]*t[1])-u[1]*(v[0]*t[2]-v[2]*t[0])+u[2]*(v[0]*t[1]-v[1]*t[0])))}
  assert(volume>1000000,'Worlds must occupy a volume instead of a single flat orbital plane');
 }
});

test('overview labels avoid collisions and retain selected and keyboard-focused identities',async()=>{
 const home={...gatto,shareUrl:undefined,id:'curated-parallax',name:'PARALLAX',ticker:'PRLX',href:'/projects/parallax',renderKind:'singularity'};
 const h=harness({data:feed([home,gatto,...Array.from({length:9},(_,i)=>({...project,id:'world-'+i,name:'Community '+i,href:'/world/world-'+i}))]),reduced:true,width:390,height:560});await flush();h.frame();
 const stage=h.get('universe-stage'),buttons=h.get('universe-hit-targets').children;
 assert.equal(stage.dataset.cameraMode,'overview');assert.equal(buttons[0].children[0].hidden,false);
 const rectangles=buttons.filter(b=>!b.hidden&&!b.children[0].hidden).map(button=>{const [x,y]=button.style.transform.match(/-?[\d.]+/g).map(Number),label=button.children[0];return{x:x+parseFloat(label.style.left),y:y+parseFloat(label.style.top),w:parseFloat(label.style.width),h:label.children[1].hidden?23:35}});
 for(let i=0;i<rectangles.length;i++)for(let j=i+1;j<rectangles.length;j++){const a=rectangles[i],b=rectangles[j];assert(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'Visible labels must not overlap')}
 assert(buttons.every(b=>b.attrs['aria-label'].startsWith('Explore ')));
 buttons[4].focus();h.frame(200);assert.equal(stage.dataset.cameraMode,'overview');assert.equal(buttons[4].children[0].hidden,false,'Keyboard focus must reveal its identity');
 h.fire('parallax:community-select',{detail:{id:gatto.id}});h.frame(300);assert.equal(stage.dataset.cameraMode,'focus');
 h.get('universe-home').click();h.frame(400);assert.equal(stage.dataset.cameraMode,'overview');
});
