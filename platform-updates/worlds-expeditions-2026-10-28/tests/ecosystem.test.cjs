const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const worlds=JSON.parse(fs.readFileSync('public/ecosystem-worlds.json','utf8'));
const gattoWorld=JSON.parse(fs.readFileSync('public/gatto-world.json','utf8'));
const script=fs.readFileSync('public/ecosystem.js','utf8');
const motionContext={window:{}};vm.runInNewContext(fs.readFileSync('public/planet-renderer.js','utf8'),motionContext);
const {isPortrait,portraitAngle,portraitPhaseForYaw}=motionContext.window.ParallaxPlanetRenderer;
function setup({selected='solana',standalone=false,reducedMotion=false,graphics=true,ready=true,share,clipboard}={}){
 let seq=0,draws=0,observer,dialogOpen=false,prevented=0;
 const nodes=new Map(),events=new Map(),rafs=new Map(),timers=new Map(),historyCalls=[],drawCalls=[];
 class Node{
  constructor(){this.dataset={};this.style={setProperty:(k,v)=>this.style[k]=v};this.attributes={};this.events={};this.children=[];this.hidden=false;this.textContent='';const classes=new Set();this.classList={add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),contains:x=>classes.has(x)};}
  setAttribute(k,v){this.attributes[k]=v;}
  addEventListener(k,f){this.events[k]=f;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(){this.children=[];}
  focus(){this.focused=true;}
  select(){this.selected=true;}
  getBoundingClientRect(){return {width:600,height:600};}
  getContext(){return {clearRect(){}};}
  setPointerCapture(){this.captured=true;}
  click(extra={}){return this.events.click?.({button:0,preventDefault(){prevented++;},...extra});}
  key(key){return this.events.keydown?.({key,preventDefault(){prevented++;}});}
 }
 const get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
 const root=get('ecosystem');root.dataset.world=selected;root.dataset.standalone=String(standalone);
 const links=worlds.map(w=>{const n=new Node();n.dataset.ecoSelect=w.id;return n;});root.querySelectorAll=()=>standalone?[]:links;
 get('ecosystem-data').textContent=JSON.stringify(worlds);
 const document={hidden:false,getElementById:get,createElement:()=>new Node(),querySelector:()=>dialogOpen?{}:null,querySelectorAll:()=>[],addEventListener:(name,fn)=>events.set(name,fn)};
 const reduced={matches:reducedMotion,addEventListener:(name,fn)=>events.set('reduced',fn)};
 class IO{constructor(fn){observer=fn;}observe(){}}
 const renderer={isPortrait,portraitAngle,portraitPhaseForYaw,draw(...args){draws++;drawCalls.push(args);return graphics;},ready:()=>ready};
 const location={href:'https://fixture.example/explore?ecosystem='+selected+'#ecosystem',origin:'https://fixture.example'};
 const context={document,window:{IntersectionObserver:IO,ParallaxPlanetRenderer:renderer,addEventListener:(name,fn)=>events.set(name,fn)},navigator:{share,clipboard},location,URL,matchMedia:()=>reduced,IntersectionObserver:IO,devicePixelRatio:2,
 history:{pushState:(s,t,url)=>{historyCalls.push({mode:'push',url});location.href=new URL(url,location.origin).href;},replaceState:(s,t,url)=>{historyCalls.push({mode:'replace',url});location.href=new URL(url,location.origin).href;}},
 requestAnimationFrame:fn=>{const id=++seq;rafs.set(id,fn);return id;},cancelAnimationFrame:id=>rafs.delete(id),setTimeout:fn=>{const id=++seq;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(script,context);
 return {get,root,links,events,document,reduced,rafs,timers,historyCalls,drawCalls,location,renderer,get draws(){return draws;},get prevented(){return prevented;},visible(value){observer([{isIntersecting:value}]);},frame(time){const next=rafs.entries().next().value;if(!next)return;rafs.delete(next[0]);next[1](time);},dialog(open){dialogOpen=open;events.get('visibilitychange')();}};
}
test('ten worlds have valid existing renderer designs, actual fallback assets and official HTTPS sources',()=>{
 const context={};vm.runInNewContext(fs.readFileSync('public/planet-design.js','utf8'),context);
 assert.equal(worlds.length,10);assert.equal(new Set(worlds.map(w=>w.id)).size,10);
 for(const w of worlds){assert.ok(context.validPlanetDesign(w.design));assert.ok(fs.existsSync('public'+w.image));assert.ok(fs.existsSync('public/assets/globe/'+w.map));assert.equal(new URL(w.source).protocol,'https:');assert.equal(new URL(w.url).protocol,'https:');assert.equal(w.facts.length,3);{assert.equal(typeof w.shareImage,'string');assert.ok(fs.existsSync('public'+w.shareImage),w.id+' share artwork must exist');assert.equal(typeof w.icon,'string');assert.ok(fs.existsSync('public'+w.icon),w.id+' navigation icon must exist');assert.notEqual(w.icon,w.image,'The tightly framed icon must not replace the full planet artwork');}}
 assert.equal(new URL(worlds.find(w=>w.id==='solflare').url).hostname,'www.solflare.com');
});
test('selection updates the explanation, official link, sources, artwork and shareable URL without a network request',()=>{
 const s=setup();s.visible(true);s.links[1].click();
 assert.equal(s.root.dataset.world,'solflare');assert.equal(s.get('eco-name').textContent,'Solflare');assert.equal(s.get('eco-official').href,'https://www.solflare.com/');assert.match(s.get('eco-fallback').src,/solflare-v209\.webp/);assert.equal(s.get('eco-facts').children.length,3);assert.match(s.get('eco-status').textContent,/Unofficial/);assert.equal(s.historyCalls[0].url,'/explore?ecosystem=solflare#ecosystem');
 assert.equal(s.drawCalls.at(-1)[4],worlds[1].design);assert.equal(s.drawCalls.at(-1)[6].surface,'volcanic');
});
test('keyboard selection, browser back and modified-click navigation preserve correct project identity',()=>{
 const s=setup();s.links[0].key('ArrowRight');assert.equal(s.root.dataset.world,'solflare');assert.equal(s.links[1].focused,true);assert.equal(s.historyCalls.at(-1).mode,'replace');
 s.links[1].key('End');assert.equal(s.root.dataset.world,'trump');s.links.at(-1).click({ctrlKey:true});assert.equal(s.historyCalls.length,2,'modified click uses native link behavior');
 s.location.href='https://fixture.example/explore?ecosystem=phantom#ecosystem';s.events.get('popstate')();assert.equal(s.root.dataset.world,'phantom');
 s.location.href='https://fixture.example/explore';s.events.get('popstate')();assert.equal(s.root.dataset.world,'solana');
});
test('animation pauses offscreen, in hidden tabs, in dialogs and on pagehide; reduced motion remains static',()=>{
 const s=setup();assert.equal(s.draws,0);s.visible(true);assert.equal(s.rafs.size,1);s.frame(100);s.frame(200);s.visible(false);assert.equal(s.rafs.size,0);
 s.visible(true);s.document.hidden=true;s.events.get('visibilitychange')();assert.equal(s.rafs.size,0);s.document.hidden=false;s.events.get('visibilitychange')();assert.equal(s.rafs.size,1);
 s.dialog(true);assert.equal(s.rafs.size,0);s.dialog(false);assert.equal(s.rafs.size,1);s.events.get('pagehide')();assert.equal(s.rafs.size,0);s.events.get('pageshow')();assert.equal(s.rafs.size,1);
 const r=setup({reducedMotion:true});r.visible(true);assert.equal(r.rafs.size,0);assert.ok(r.draws>0);assert.equal(r.get('eco-rotate').disabled,true);assert.equal(r.get('eco-stage').classList.contains('eco-live'),true);
});
test('unavailable WebGL and stalled textures preserve static art and readable project guides',()=>{
 const s=setup({graphics:false});s.visible(true);assert.equal(s.get('eco-stage').classList.contains('eco-live'),false);assert.equal(s.rafs.size,0);s.links[1].click();assert.equal(s.get('eco-name').textContent,'Solflare');assert.equal(s.get('eco-rotate').hidden,true);
 const t=setup({ready:false});t.visible(true);assert.equal(t.rafs.size,0);assert.equal(t.timers.size,1);[...t.timers.values()][0]();assert.equal(t.get('eco-stage').classList.contains('eco-live'),false);assert.match(t.get('eco-graphics').textContent,/unavailable/);
});
test('horizontal drag rotates while vertical gestures remain available for page scrolling',()=>{
 const s=setup();s.visible(true);const c=s.get('eco-canvas');
 c.events.pointerdown({button:0,pointerId:1,clientX:100,clientY:100});c.events.pointermove({pointerId:1,clientX:102,clientY:125});assert.equal(c.captured,undefined);
 c.events.pointerdown({button:0,pointerId:2,clientX:100,clientY:100});const before=s.drawCalls.at(-1)[5];c.events.pointermove({pointerId:2,clientX:150,clientY:102});assert.equal(c.captured,true);assert.notEqual(s.drawCalls.at(-1)[5],before);
 c.events.pointercancel();const count=s.draws;c.events.pointermove({pointerId:2,clientX:200,clientY:102});assert.equal(s.draws,count);
});
test('portrait input remains directional at both limits and automatic turns resume smoothly after dragging',()=>{
 const limit=24*Math.PI/180,epsilon=1e-9;
 for(const id of ['bonk','pengu','wif','popcat','sheeple','trump']){
  const s=setup({selected:id,reducedMotion:true});s.visible(true);const c=s.get('eco-canvas'),yaw=()=>s.renderer.portraitAngle(s.drawCalls.at(-1)[5]);
  for(let i=0;i<24;i++){const before=yaw();c.key('ArrowRight');assert(yaw()>=before-epsilon,id+' right arrow must never turn left');assert(yaw()<=limit+epsilon);}
  assert(Math.abs(yaw()-limit)<epsilon);c.key('ArrowLeft');assert(yaw()<limit-epsilon,'Reversing input must move immediately without hidden overshoot');
  for(let i=0;i<24;i++){const before=yaw();c.key('ArrowLeft');assert(yaw()<=before+epsilon,id+' left arrow must never turn right');assert(yaw()>=-limit-epsilon);}
  assert(Math.abs(yaw()+limit)<epsilon);c.key('ArrowRight');assert(yaw()>-limit+epsilon);
  c.key('Home');assert.equal(s.drawCalls.at(-1)[5],6.4);assert(Math.abs(yaw())<epsilon);
  c.events.pointerdown({button:0,pointerId:1,clientX:0,clientY:0});c.events.pointermove({pointerId:1,clientX:10000,clientY:0});assert(Math.abs(yaw()-limit)<epsilon);
  c.events.pointermove({pointerId:1,clientX:10010,clientY:0});assert(Math.abs(yaw()-limit)<epsilon);
  c.events.pointermove({pointerId:1,clientX:10000,clientY:0});assert(yaw()<limit-epsilon,'A reversed drag must immediately leave the right boundary');c.events.pointerup();
 }
 const s=setup({selected:'bonk'});s.visible(true);const c=s.get('eco-canvas'),yaw=()=>s.renderer.portraitAngle(s.drawCalls.at(-1)[5]),angles=[];
 for(let i=0;i<1200;i++){s.frame(100+i*200);angles.push(yaw());}
 assert(angles.every(angle=>Math.abs(angle)<=limit+epsilon));assert(angles.some(angle=>angle>limit*.9)&&angles.some(angle=>angle<-limit*.9),'Autoplay must visit both sides');
 assert(angles.some((angle,i)=>i>0&&angle<angles[i-1]-epsilon)&&angles.some((angle,i)=>i>0&&angle>angles[i-1]+epsilon),'Autoplay must turn back in both directions');
 assert(angles.every((angle,i)=>i===0||Math.abs(angle-angles[i-1])<.1),'Automatic turns must not jump at the boundaries');
 const before=yaw();c.key('ArrowRight');assert(yaw()>=before-epsilon,'Manual direction must remain correct after many automatic cycles');
 c.events.pointerdown({button:0,pointerId:2,clientX:100,clientY:100});c.events.pointermove({pointerId:2,clientX:130,clientY:100});assert.equal(s.rafs.size,0,'Active portrait dragging pauses automatic advancement');
 c.events.pointerup();assert.equal(s.rafs.size,1,'Releasing the portrait restores the selected autoplay state');
 const resumed=yaw();s.frame(250000);assert(Math.abs(yaw()-resumed)<epsilon,'Resuming must not jump by elapsed drag time');
 s.links.find(link=>link.dataset.ecoSelect==='solana').click();for(let i=0;i<24;i++)c.key('ArrowRight');assert.equal(s.drawCalls.at(-1)[5],30.4,'Terrain world controls retain their existing unrestricted phase');
});
test('sharing uses the selected planet, cancellation is quiet and unavailable clipboard has a copyable fallback',async()=>{
 const shares=[];const s=setup({share:async data=>shares.push(data)});s.links[1].click();await s.get('eco-share').click();assert.equal(shares.length,1);assert.equal(shares[0].url,'https://parallaxlaunch.live/share/solflare-v209');assert.match(shares[0].text,/unofficial/);
 const a=setup({share:async()=>{throw Object.assign(new Error(),{name:'AbortError'});}});await a.get('eco-share').click();assert.equal(a.get('eco-share').disabled,false);
 const f=setup({clipboard:{writeText:async()=>{throw new Error('denied');}}});f.links[2].click();await f.get('eco-share').click();assert.equal(f.get('eco-share-fallback').hidden,false);assert.equal(f.get('eco-share-url').value,'https://parallaxlaunch.live/share/phantom-v209');assert.equal(f.get('eco-share-url').selected,true);
});
test('the server renders selected content without JavaScript; unknown query values cannot inject HTML',async()=>{
 const ts=require('typescript');let source=fs.readFileSync('app/ecosystem.ts','utf8').replace("import worlds from '../public/ecosystem-worlds.json';",'const worlds='+JSON.stringify(worlds)+';').replace("import gattoWorld from '../public/gatto-world.json';",'const gattoWorld='+JSON.stringify(gattoWorld)+';');
 const encoded=Buffer.from(ts.transpile(source,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022})).toString('base64');const {ecosystemSection}=await import('data:text/javascript;base64,'+encoded);
 const html=ecosystemSection('solflare');assert.match(html,/id="eco-name">Solflare/);assert.match(html,/data-eco-select="solflare" aria-current="true"/);assert.match(html,/not partnerships/);assert.match(html,/href="https:\/\/www.solflare.com\//);
 const gattoCard=html.match(/<a(?=[^>]*href="\/projects\/gatto")[^>]*>[\s\S]*?<\/a>/)?.[0];
 assert(gattoCard?.includes('src="'+gattoWorld.icon+'"'),'GATTO is discoverable with its own tightly framed icon');
 assert.doesNotMatch(gattoCard,/data-eco-select/,'GATTO opens its dedicated page instead of an unsupported in-place selection');
 assert.match(html,/11 CONCEPT WORLDS/);
 for(const asset of [gattoWorld.image,gattoWorld.icon,gattoWorld.shareImage])assert(fs.existsSync('public'+asset),'GATTO artwork exists: '+asset);
 for(const world of worlds){
  const card=html.match(new RegExp('<a(?=[^>]*data-eco-select="'+world.id+'")[^>]*>[\\s\\S]*?</a>'))?.[0];
  assert(card?.includes('<img src="'+(world.icon||world.image)+'"'),world.id+' selector uses its tightly framed icon, or the original artwork when no icon exists');
  const page=ecosystemSection(world.id,true),fallback=page.match(/<img\b[^>]*id="eco-fallback"[^>]*>/)?.[0];
  assert(fallback?.includes('src="'+world.image+'"'),world.id+' full-size stage must keep the uncropped production render');
  if(world.showcase==='community-showcase'){
   const more=page.match(/<nav class="eco-community-nav"[\s\S]*?<\/nav>/)?.[0];
   for(const other of worlds.filter(item=>item.showcase==='community-showcase'&&item.id!==world.id))assert(more?.includes('<img src="'+other.icon+'"'),other.id+' community navigation uses its small icon');
  }
 }
 assert.doesNotMatch(ecosystemSection('<script>alert(1)</script>'),/<script>alert/);
 const route=fs.readFileSync('app/explore/route.ts','utf8');assert.match(route,/ecosystemSection\(selected\)/);assert.match(route,/planet-renderer.js/);assert.match(fs.readFileSync('app/dashboard.html','utf8'),/explore\?ecosystem=solflare#ecosystem/);
});

test('dedicated project pages share the versioned card URL and retain their identity on history changes',async()=>{
 const copied=[];const s=setup({selected:'phantom',standalone:true,clipboard:{writeText:async value=>copied.push(value)}});
 s.visible(true);await s.get('eco-share').click();assert.equal(copied[0],'https://parallaxlaunch.live/share/phantom-v209');
 s.location.href='https://fixture.example/projects/phantom';s.events.get('popstate')();assert.equal(s.root.dataset.world,'phantom');assert.equal(s.get('eco-name').textContent,'Phantom');
});

test('token selection keeps mint, research, passport, sources and optional social links aligned',async()=>{
 const copied=[],s=setup({clipboard:{writeText:async value=>copied.push(value)}});
 s.visible(true);
 for(const id of ['bonk','pengu','wif','popcat','sheeple','trump']){
  const w=worlds.find(world=>world.id===id);s.links.find(link=>link.dataset.ecoSelect===id).click();
  assert.equal(s.get('eco-concept-label').textContent,'COMMUNITY SHOWCASE');assert.equal(s.get('eco-token').hidden,false);
  assert.equal(s.get('eco-token-address').textContent,w.contractAddress);assert.equal(s.get('eco-research').href,'/terminal?token='+w.contractAddress);
  assert.equal(s.get('eco-passport').href,'/control?mint='+w.contractAddress+'#passport');assert.equal(s.get('eco-explorer').href,'https://solscan.io/token/'+w.contractAddress);
  assert.equal(s.get('eco-mint-source').href,w.mintSource);assert.equal(s.get('eco-reviewed').textContent,'Reviewed 27 October 2026');
  assert.equal(s.get('eco-x').hidden,!w.x);if(w.x)assert.equal(s.get('eco-x').href,w.x);
  assert.equal(s.drawCalls.at(-1)[6].identity,id,'The active live world must retain its recognizable identity');
  assert.equal(s.drawCalls.at(-1)[5],6.4,'A newly selected identity must begin at the card-facing orientation');
  assert.equal(s.get('eco-fallback').src,w.image);assert.equal(s.get('eco-card-preview').src,w.shareImage);
  await s.get('eco-copy-mint').click();assert.equal(copied.at(-1),w.contractAddress);
 }
 s.links[1].click();assert.equal(s.get('eco-token').hidden,true);assert.equal(s.get('eco-token-address').textContent,'');assert.equal(s.get('eco-passport').hidden,true);assert.equal(s.get('eco-explorer').hidden,true);assert.equal(s.get('eco-x').hidden,false);assert.equal(s.get('eco-x').href,worlds[1].x);assert.equal(s.get('eco-mint-source-row').hidden,true);assert.equal(s.get('eco-reviewed').textContent,'Reviewed 27 October 2026');
 assert.equal(s.drawCalls.at(-1)[6].identity,undefined,'Tool worlds must retain their original artwork after a community selection');
});


test('project invitations share the selected versioned card and keep paired identities separate',async()=>{
 const copied=[],s=setup({clipboard:{writeText:async value=>copied.push(value)}});
 for(const id of ['bonk','sheeple','trump','pengu']) {
  s.links.find(link=>link.dataset.ecoSelect===id).click();
  const shareUrl=worlds.find(world=>world.id===id).shareUrl;
  assert.equal(s.get('eco-community-invite').hidden,false);
  const intent=new URL(s.get('eco-share-x').href);
  assert.equal(intent.origin,'https://x.com');assert.equal(intent.pathname,'/intent/post');
  assert.equal(intent.searchParams.get('url'),shareUrl);
  assert.match(intent.searchParams.get('text'),/PARALLAX/);
  assert.equal(s.get('eco-download-card').href,worlds.find(world=>world.id===id).shareImage);
  assert.equal(s.get('eco-team-link').href,'/projects/'+id+'#project-wallet');
  assert.equal(s.get('eco-paired-world').hidden,!['sheeple','trump'].includes(id));
  if(id==='sheeple'||id==='trump')assert.equal(s.get('eco-paired-link').href,'/projects/'+(id==='sheeple'?'trump':'sheeple'));
  await s.get('eco-share').click();assert.equal(copied.at(-1),shareUrl);
 }
 s.links.find(link=>link.dataset.ecoSelect==='solflare').click();
 assert.equal(s.get('eco-community-invite').hidden,false);assert.equal(s.get('eco-paired-world').hidden,true);assert.equal(s.get('eco-team-link').hidden,true);assert.equal(s.get('eco-team-note').hidden,true);assert.doesNotMatch(new URL(s.get('eco-share-x').href).searchParams.get('text'),/\$Solflare/);
 await s.get('eco-share').click();assert.equal(copied.at(-1),'https://parallaxlaunch.live/share/solflare-v209');
});

test('community pages expose sources and token tools without JavaScript and mount wallet linking only for the reviewed six projects',async()=>{
 const ts=require('typescript'),code=fs.readFileSync('app/ecosystem.ts','utf8').replace("import worlds from '../public/ecosystem-worlds.json';",'const worlds='+JSON.stringify(worlds)+';').replace("import gattoWorld from '../public/gatto-world.json';",'const gattoWorld='+JSON.stringify(gattoWorld)+';');
 const {ecosystemProjectPage}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpile(code,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022})).toString('base64'));
 for(const id of ['bonk','pengu','wif','popcat','sheeple','trump']){
  const w=worlds.find(world=>world.id===id),html=ecosystemProjectPage(id);
  assert.match(html,/AN INDEPENDENT COMMUNITY SHOWCASE/);assert.match(html,/COMMUNITY SHOWCASE/);assert.match(html,/Reviewed 27 October 2026/);
  assert(html.includes('href="/terminal?token='+w.contractAddress+'"'));assert(html.includes('href="/control?mint='+w.contractAddress+'#passport"'));
  assert(html.includes('data-project-wallet="'+id+'"'));assert.match(html,/\/project-wallet-link\.js/);assert.match(html,/\/project-wallet-link\.css/);
  assert(html.includes('content="https://parallaxlaunch.live'+w.shareImage+'"'));
  assert(html.includes('href="/projects/'+id+'#project-wallet"'));
  assert(html.includes('href="'+w.mintSource+'"'));assert.match(html,/not partnerships/);
 }
 assert.doesNotMatch(ecosystemProjectPage('solflare'),/data-project-wallet|project-wallet-link\.(?:js|css)/);
 assert.equal(ecosystemProjectPage('unknown'),null);
});

test('the shared project catalog has the exact reviewed mints and fixed issuer origins',async()=>{
 const expected={
  bonk:['DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263','https://www.bonkcoin.com'],
  pengu:['2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv','https://pengu.pudgypenguins.com'],
  wif:['EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm','https://dogwifcoin.org'],
  popcat:['7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr','https://www.popcatsolana.xyz'],
  sheeple:['TVvnJTedD3WgAPede2xUmRjweJqNdhCEgyjtKv3rCq4','https://www.thesheepleflock.com'],
  trump:['6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN','https://gettrumpmemes.com']
 };
 const ts=require('typescript'),code=fs.readFileSync('app/community-showcase.ts','utf8').replace("import worlds from '../public/ecosystem-worlds.json';",'const worlds='+JSON.stringify(worlds)+';');
 const {getCommunityProject}=await import('data:text/javascript;base64,'+Buffer.from(ts.transpile(code,{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022})).toString('base64'));
 for(const [slug,[mint,origin]] of Object.entries(expected)){const project=getCommunityProject(slug);assert.equal(project.slug,slug);assert.equal(project.mint,mint);assert.equal(project.proofOrigin,origin);assert.equal(new URL(project.website).origin,origin);assert(Object.isFrozen(project));}
 for(const slug of ['solana','unknown','toString','__proto__','BONK','https://www.bonkcoin.com'])assert.equal(getCommunityProject(slug),null);
});
