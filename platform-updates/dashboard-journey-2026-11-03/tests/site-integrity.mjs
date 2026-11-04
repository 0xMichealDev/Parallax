import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const codeURL=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const moduleURL=(name,replacements={})=>{let code=ts.transpile(fs.readFileSync(name,'utf8'),{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022});for(const [from,to]of Object.entries(replacements))code=code.replaceAll("'"+from+"'",JSON.stringify(to));return codeURL(code)};
const {workspaceShell}=await import(moduleURL('app/workspace-shell.ts'));
const gattoData=codeURL('export default '+fs.readFileSync('public/gatto-world.json','utf8'));
const gattoProfile=moduleURL('app/gatto-profile.ts',{'../public/gatto-world.json':gattoData});
const {ecosystemSection,ecosystemProjectPage}=await import(moduleURL('app/ecosystem.ts',{'../public/ecosystem-worlds.json':codeURL('export default '+fs.readFileSync('public/ecosystem-worlds.json','utf8')),'../public/gatto-world.json':gattoData}));
const editorialData=codeURL('export default '+fs.readFileSync('app/universe-editions.json','utf8'));
const {atlasEditorial,universeIndex,universeStory,publishedEditions}=await import(moduleURL('app/universe-editorial.ts',{'./universe-editions.json':editorialData}));
const names={workspace:'workspace',pro:'pro',assistant:'assistant',solhandle:'solhandle',observatory:'observatory',projects:'projects',home:'overview',planets:'planets',site:'explore',terminal:'terminal',trenches:'trenches',replay:'replay',markets:'markets',studio:'studio',creator:'creator',control:'control',briefing:'briefing',following:'following',discover:'discover',premium:'premium',utility:'utility',development:'development',roadmap:'roadmap'};
const docs=new Map(Object.entries(names).map(([file,key])=>{let html=workspaceShell(fs.readFileSync('app/'+file+'.html','utf8'),key);if(file==='planets')html=html.replace('<!--ATLAS_EDITORIAL-->',atlasEditorial());if(file==='site')html=html.replace('<section class="home-overview"',ecosystemSection(null)+'<section class="home-overview"');return [file==='home'?'/':file==='site'?'/explore':'/'+file,html]}));
const guidesURL=moduleURL('app/docs-content.ts');
const {docGuides}=await import(guidesURL);
const {docsResponse}=await import(moduleURL('app/docs-render.ts',{'./docs-content':guidesURL,'./workspace-shell':moduleURL('app/workspace-shell.ts')}));
docs.set('/docs',await docsResponse().text());
for(const guide of docGuides)docs.set('/docs/'+guide.slug,await docsResponse(guide.slug).text());
docs.set('/?view=dashboard',workspaceShell(fs.readFileSync('app/dashboard.html','utf8'),'overview'));
docs.set('/projects/parallax',workspaceShell(fs.readFileSync('app/singularity.html','utf8').replaceAll('__PRLX_MINT__','8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump'),'projects'));
const {GET:gattoGET}=await import(moduleURL('app/projects/gatto/route.ts',{
 '../../workspace-shell':moduleURL('app/workspace-shell.ts'),
 '../../gatto-preview.html?raw':codeURL('export default '+JSON.stringify(fs.readFileSync('app/gatto-preview.html','utf8'))),
 '../../../public/gatto-world.json':gattoData,
 '../../gatto-profile':gattoProfile
}));
const gattoHTML=await gattoGET().text(),gattoConfig=gattoHTML.match(/<script id="gatto-world-data" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
assert(gattoConfig,'GATTO renders its shared style record without waiting for a network request');
assert.deepEqual(JSON.parse(gattoConfig),JSON.parse(fs.readFileSync('public/gatto-world.json','utf8')));
assert.doesNotMatch(gattoHTML,/__GATTO_WORLD_DATA__|data-project-wallet=|\/terminal\?token=/);
docs.set('/projects/gatto',gattoHTML);
for(const name of ['sheeple','gatto']){
 const {GET}=await import(moduleURL('app/expeditions/'+name+'/route.ts',{
  ['../../'+name+'-expedition.html?raw']:codeURL('export default '+JSON.stringify(fs.readFileSync('app/'+name+'-expedition.html','utf8'))),
  '../../gatto-profile':gattoProfile
 }));
 const html=await GET().text();
 assert.doesNotMatch(html,/__GATTO_WELCOME_STORY__|__GATTO_PROFILE__/);
 docs.set('/expeditions/'+name,html);
}
for(const id of ['solana','solflare','phantom','jupiter','bonk','pengu','wif','popcat','sheeple','trump'])docs.set('/projects/'+id,workspaceShell(ecosystemProjectPage(id),'projects'));
assert.equal(ecosystemProjectPage('unknown'),null);
docs.set('/universe',workspaceShell(universeIndex(),'planets'));
for(const edition of publishedEditions())docs.set('/universe/'+edition.slug,workspaceShell(universeStory(edition.slug),'planets'));
docs.set('/meet',fs.readFileSync('app/meet.html','utf8'));
const ids=new Map([...docs].map(([path,html])=>[path,new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]))]));
let links=0,assets=0;
for(const [path,html]of docs){
 const head=html.slice(0,html.indexOf('</head>'));
 assert.equal((head.match(/rel="canonical"/g)||[]).length,1,path+' has one canonical URL');
 assert(head.includes('rel="canonical" href="https://parallaxlaunch.live'+path.split('?')[0]+'"'),path+' canonical matches its route');
 for(const property of ['og:title','og:description','og:type','og:url','og:image'])assert.equal((head.match(new RegExp('property="'+property+'"','g'))||[]).length,1,path+' has one '+property);
 assert(head.includes('name="twitter:card" content="summary_large_image"'),path+' supports large social previews');
 const first=html.slice(html.indexOf('<body')).match(/<a\b[^>]*>/)?.[0];assert.match(first||'',/class="(?:workspace-skip|expedition-skip-link)"/,path+' skip content must precede navigation');
 const target=first.match(/href="#([^"]+)"/)[1],tag=[...html.matchAll(/<[a-z][a-z0-9-]*\b[^>]*>/g)].map(m=>m[0]).find(t=>t.includes('id="'+target+'"'));
 assert(tag&&(tag.includes('tabindex="-1"')||/^<(?:button|input|select|textarea)\b/.test(tag)||/^<a\b/.test(tag)&&/\bhref=/.test(tag)),path+' skip destination receives keyboard focus');
 for(const [,attribute,link]of html.matchAll(/\b(href|src)="([^"<>]+)"/g)){
  if(!link||/^(?:mailto:|tel:|data:)/.test(link))continue;assert(!link.startsWith('javascript:'),path+' script link');
  const u=new URL(link,'https://parallaxlaunch.live'+path);if(u.origin!=='https://parallaxlaunch.live')continue;
  if(attribute==='src'||/\.[a-z0-9]{2,5}$/i.test(u.pathname)){assets++;assert(fs.existsSync('public'+u.pathname),path+' missing asset '+link);continue}
  links++;if(u.pathname==='/signin-with-chatgpt'||u.pathname==='/signout-with-chatgpt'||u.pathname.startsWith('/api/'))continue;
  assert(docs.has(u.pathname)||/^\/(world|mission|research)\//.test(u.pathname),path+' missing route '+link);
  const destination=u.pathname==='/'&&u.searchParams.get('view')==='dashboard'?'/?view=dashboard':u.pathname;
  if(u.hash&&docs.has(destination))assert(ids.get(destination).has(decodeURIComponent(u.hash.slice(1))),path+' missing anchor '+link);
 }
}
console.log(`PASS navigation audit: ${docs.size} page templates, ${links} internal links, ${assets} asset references; skip links first and focusable`);
const shared=workspaceShell('<html><head><title>A &amp; B "world"</title><link rel="canonical" href="https://parallaxlaunch.live/mission/example"><meta property="og:title" content="Creator title"></head><body><main></main></body></html>','explore');
assert(shared.includes('property="og:url" content="https://parallaxlaunch.live/mission/example"'));
assert(shared.includes('property="og:title" content="Creator title"'));
assert.equal((shared.match(/rel="canonical"/g)||[]).length,1);
console.log('PASS page metadata: all main routes have complete social previews; explicit project URLs and titles are preserved');
// Nested launch-lab links must reveal their hidden parent, including on hash navigation.
const events={},section={classes:new Set(),classList:{add(v){section.classes.add(v)}}};let scrolled=0,redirect=null;
const target={closest:s=>s.includes('#observatory')?section:null,scrollIntoView(){scrolled++}};
const location={hash:'#scenario-heading',search:'?address=token',replace:s=>redirect=s,assign(){}};
vm.runInNewContext(fs.readFileSync('public/explore-clean.js','utf8'),{URLSearchParams,window:{},document:{querySelector:()=>null,getElementById:id=>id==='scenario-heading'?target:null,addEventListener(){}},location,addEventListener:(name,fn)=>events[name]=fn});
assert(section.classes.has('show-legacy'));assert.equal(scrolled,1);
location.hash='#market-observatory';events.hashchange();assert.equal(redirect,'/markets?address=token#market-observatory');
location.hash='#%E0%A4%A';assert.doesNotThrow(()=>events.hashchange());
console.log('PASS deep links: Launch Lab reveals its section; market redirects keep the selected address; malformed hashes do not crash');
for(const [search,walk,mode]of [['',false,'free'],['?bounty=1',true,'bounty']]){
 const walkCalls=[];
 vm.runInNewContext(fs.readFileSync('public/explore-clean.js','utf8'),{
  URLSearchParams,
  window:{parallaxUniverse:{open:(name,options)=>walkCalls.push({name,walk:options.walk,mode:options.mode})}},
  document:{querySelector:()=>null,getElementById:()=>null,addEventListener(){}},
  location:{hash:'#walk-on-earth',search},addEventListener(){}
 });
 assert.deepEqual(walkCalls,[{name:'Earthbound',walk,mode}]);
}
const {GET:homeGET}=await import(moduleURL('app/route.ts',{
 './workspace-shell':moduleURL('app/workspace-shell.ts'),
 './home.html?raw':codeURL('export default '+JSON.stringify(fs.readFileSync('app/home.html','utf8'))),
 './dashboard.html?raw':codeURL('export default '+JSON.stringify(fs.readFileSync('app/dashboard.html','utf8')))
}));
const homeResponse=homeGET(new Request('https://parallaxlaunch.live/'));
const customResponse=homeGET(new Request('https://parallaxlaunch.live/?view=dashboard'));
assert.equal(homeResponse.status,200);assert.equal(customResponse.status,200);
const compactHome=await homeResponse.text(),customHome=await customResponse.text();
const homeClasses=compactHome.match(/<body\b[^>]*class="([^"]+)"/)?.[1].split(/\s+/)||[];
for(const name of ['workspace-shell','home-hub','observatory-arrival'])assert(homeClasses.includes(name),'default home retains its '+name+' identity');
assert.doesNotMatch(compactHome,/id="dashboard-panels"|src="\/planet-renderer/);
assert.match(compactHome,/src="\/home-hub.js/); // Static home navigation; no canvas renderer.
assert.match(customHome,/id="dashboard-panels"/);assert.match(customHome,/id="layout-dialog"/);
assert.match(customHome,/id="home-market"/);
console.log('PASS home routing: compact default, preserved custom dashboard, and direct Earth walking entry');
const recovery=moduleURL('app/recovery-response.ts'),{recoveryResponse}=await import(recovery);
let r=recoveryResponse(503,'Temporary <failure>','Try again & return.','/world/example?x="quoted"');assert.equal(r.status,503);assert.equal(r.headers.get('retry-after'),'30');assert.equal(r.headers.get('cache-control'),'no-store');let html=await r.text();assert(html.includes('&lt;failure&gt;'));assert(html.includes('&quot;quoted&quot;'));assert(!html.includes('<failure>'));
for(const bad of ['https://outside.example','//outside.example','/\\outside.example'])assert(!(await recoveryResponse(503,'Unavailable','Retry',bad).text()).includes('Try again'));
const {sharedPassport}=await import(moduleURL('app/shared-passport.ts',{'./recovery-response':recovery}));
const req=new Request('https://fixture.example/research/'+'a'.repeat(64));
r=await sharedPassport(req);assert.equal(r.status,503);assert.match(await r.text(),/Return to dashboard/);
r=await sharedPassport(req,{prepare(){throw Error('private database detail')}});assert.equal(r.status,503);assert(!((await r.text()).includes('private database detail')));
r=await sharedPassport(req,{prepare(){return{bind(){return this},async first(){return null}}}});assert.equal(r.status,404);assert.match(await r.text(),/revoked or deleted/);
r=await sharedPassport(req,{prepare(){return{bind(){return this},async first(){return{payload:'broken-json'}}}}});assert.equal(r.status,503,'malformed stored reports have a recovery page');
console.log('PASS recovery: escaped content, internal-only retry links, proper statuses, missing/corrupt report handling, and no error-detail disclosure');
const missingRoute=await import(moduleURL('app/[...unmatched]/route.ts',{'../recovery-response':recovery}));
r=missingRoute.GET();assert.equal(r.status,404);assert.match(await r.text(),/This page is off the map/);
r=missingRoute.HEAD();assert.equal(r.status,404);assert.equal(await r.text(),'');
const sitemap=await import(moduleURL('app/sitemap.xml/route.ts',{'../docs-content':guidesURL,'../universe-editorial':moduleURL('app/universe-editorial.ts',{'./universe-editions.json':editorialData}),'../../public/ecosystem-worlds.json':codeURL('export default '+fs.readFileSync('public/ecosystem-worlds.json','utf8'))}));
r=sitemap.GET();assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/application\/xml/);
const xml=await r.text(),locations=[...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]));
assert.equal(new Set(locations.map(u=>u.href)).size,locations.length);
for(const u of locations){assert.equal(u.origin,'https://parallaxlaunch.live');assert(docs.has(u.pathname),'sitemap destination exists: '+u.pathname);}
for(const issue of publishedEditions())assert(xml.includes('/universe/'+issue.slug));
for(const slug of ['bonk','pengu','wif','popcat','sheeple','trump'])assert(locations.some(u=>u.pathname==='/projects/'+slug),'community planet has a discoverable sitemap URL: '+slug);
assert(fs.readFileSync('public/robots.txt','utf8').includes('Sitemap: https://parallaxlaunch.live/sitemap.xml'));
console.log('PASS crawler recovery: complete 404/HEAD responses, published-only sitemap and robots discovery');
