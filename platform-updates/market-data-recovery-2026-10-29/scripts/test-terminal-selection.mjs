import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const html=await readFile('app/terminal.html','utf8'),source=await readFile('public/terminal.js','utf8');
const mint='8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump',other='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const pool='6iep3EgqksbZwgzMBCyAJtiVtVYkCgL9BnPBEwLR8AGQ',defaultPool='7'.repeat(44),thirdPool='8'.repeat(44),at=new Date().toISOString();
class Element{
 constructor(){this.innerHTML='';this.textContent='';this.hidden=false;this.disabled=false;this.value='';this.dataset={};this.attrs={};this.listeners={};this.children=[];this.classList={toggle(){}};}
 setAttribute(key,value){this.attrs[key]=value;}addEventListener(key,fn){this.listeners[key]=fn;}
 replaceChildren(...children){this.children=children;this.innerHTML='';this.textContent='';}querySelectorAll(){return [];}querySelector(){return null;}scrollIntoView(){}insertAdjacentHTML(_position,html){this.innerHTML+=html;}
}
function harness(search='?token='+mint+'&pool='+pool+'&view=trade'){
 const nodes=new Map([...html.matchAll(/id="([^"]+)"/g)].map(match=>[match[1],new Element()])),requests=[],events={},urls=[],renders=[];
 const window={ParallaxTrading:{isDemo:()=>false,disposeChart(){},chartModeChanged(){},renderChart:data=>renders.push(data)},dispatchEvent(){}};
 const document={hidden:false,getElementById:id=>{assert(nodes.has(id),id);return nodes.get(id);},querySelector:()=>new Element(),querySelectorAll:()=>[],addEventListener:(key,fn)=>events[key]=fn,createElement:()=>new Element()};
 const context={window,document,location:{search,origin:'https://fixture.invalid'},sessionStorage:{getItem:()=>null,setItem(){}},history:{replaceState:(_state,_title,url)=>urls.push(url)},navigator:{clipboard:{}},URL,URLSearchParams,Date,Intl,AbortController,AbortSignal,Event,console,setTimeout:()=>1,clearTimeout(){},setInterval:()=>1,clearInterval(){},matchMedia:()=>({matches:false}),addEventListener:(key,fn)=>events[key]=fn,fetch:(url,init)=>new Promise(resolve=>requests.push({url,init,resolve:body=>resolve(Response.json(body))}))};
 vm.runInNewContext(source,context);
 return {nodes,requests,events,urls,renders,terminal:window.ParallaxTerminal};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const next=(h,prefix)=>{const request=h.requests.find(item=>!item.used&&item.url.startsWith(prefix));assert(request,'Expected '+prefix);request.used=true;return request;};
const chart=(address=pool,token=mint)=>({mint:token,pool:address,source:'Fixture',pair:'TOKEN / SOL',fetchedAt:at,intervalMinutes:1,chartCurrency:'usd',currency:'USD',candles:[{time:Math.floor(Date.now()/60000)*60,open:1,high:2,low:.5,close:1.5}],refreshAfterSeconds:30});
const research=(address=defaultPool)=>({address:mint,fetchedAt:at,market:{pairAddress:address,name:'Token identity',symbol:'TOKEN',priceUsd:99,liquidityUsd:999999,marketCapUsd:9999999,volume24hUsd:99999},chain:{supply:'100',slot:1,mintAuthority:null,freezeAuthority:null},gaps:[]});
const marketView=(address=pool,extra={})=>({mint,pool:address,source:'Fixture',fetchedAt:at,name:'Selected pool token',symbol:'TOKEN',priceUsd:2,marketCapUsd:20000,fdvUsd:30000,liquidityUsd:500,activity:{h24:{volumeUsd:700,changePercent:3}},...extra});

// A direct URL works before this pool has appeared in any discovery feed.
let h=harness();assert.equal(h.terminal.getSelection().pool,pool);assert.equal(h.requests.filter(request=>request.url.startsWith('/api/terminal/pool?')).length,0);
assert.equal(new URL(next(h,'/api/terminal/chart?').url,'https://fixture.invalid').searchParams.get('pool'),pool);
h.terminal.applyMarketView(marketView());assert.equal(h.terminal.getSelection().ready,false);assert.equal(h.terminal.getSelection().market.marketCapUsd,20000);
// ICU versions differ in trailing zeros for compact currency ($20K or $20.00K).
assert.match(h.nodes.get('token-metrics').innerHTML,/\$20(?:\.0{1,2})?K<\/strong>/,'an exact-pool response can render the correct compact value before generic chain research');
next(h,'/api/market?').resolve(research());await flush();assert.equal(h.terminal.getSelection().ready,true);assert.equal(h.terminal.getSelection().market.pool,pool);assert.equal(h.terminal.getSelection().market.priceUsd,2);
assert.match(h.nodes.get('token-metrics').innerHTML,/\$500/);assert.doesNotMatch(h.nodes.get('token-metrics').innerHTML,/999/);assert.match(h.nodes.get('chain-facts').innerHTML,/100/,'generic chain evidence remains usable');
assert.match(h.nodes.get('token-links').innerHTML,new RegExp('dexscreener.com/solana/'+pool));assert.doesNotMatch(h.nodes.get('token-links').innerHTML,new RegExp(defaultPool));assert.equal(new URL(h.nodes.get('terminal-replay-link').href,'https://fixture.invalid').searchParams.get('pool'),pool);
h.terminal.applyMarketView(marketView(defaultPool,{priceUsd:88}));assert.equal(h.terminal.getSelection().market.priceUsd,2,'a late response from the default pool cannot overwrite the selected pool');

// Until exact-pool metrics arrive, unknown is more accurate than another pool's quote.
h=harness();next(h,'/api/market?').resolve(research());await flush();assert.equal(h.terminal.getSelection().market.pool,pool);assert.equal(h.terminal.getSelection().market.priceUsd,undefined);assert.match(h.nodes.get('token-metrics').innerHTML,/Unavailable/);assert.doesNotMatch(h.nodes.get('token-metrics').innerHTML,/999/);
h.terminal.applyMarketView(marketView());next(h,'/api/terminal/chart?').resolve(chart());await flush();
h.nodes.get('token-refresh').onclick();assert.equal(new URL(next(h,'/api/terminal/chart?').url,'https://fixture.invalid').searchParams.get('pool'),pool);assert.equal(h.terminal.getSelection().market.priceUsd,2,'refresh retains the exact-pool quote while awaiting replacement');
h.events.pagehide();h.events.pageshow({persisted:true});assert.equal(h.terminal.getSelection().pool,pool);assert.equal(new URL(next(h,'/api/terminal/chart?').url,'https://fixture.invalid').searchParams.get('pool'),pool);

// Same-token pool changes clear old pool metrics and preserve the pool in the URL.
h.terminal.selectToken(mint,thirdPool);assert.equal(h.terminal.getSelection().pool,thirdPool);assert.equal(h.terminal.getSelection().market.priceUsd,undefined);assert.equal(new URL(h.urls.at(-1),'https://fixture.invalid').searchParams.get('pool'),thirdPool);
assert.equal(new URL(next(h,'/api/terminal/chart?').url,'https://fixture.invalid').searchParams.get('pool'),thirdPool);h.terminal.applyMarketView(marketView());assert.equal(h.terminal.getSelection().market.priceUsd,undefined);
h.terminal.selectToken(other);assert.equal(h.terminal.getSelection().pool,undefined);assert.equal(new URL(h.urls.at(-1),'https://fixture.invalid').searchParams.has('pool'),false,'a new token does not inherit the previous token pool');
h=harness('?token='+mint+'&pool=javascript%3Aexample&view=trade');assert.equal(h.terminal.getSelection().pool,undefined);assert(h.requests.some(request=>request.url.startsWith('/api/terminal/pool?')));assert(!h.requests.some(request=>request.url.includes('javascript')));

// Provider links and holder metadata stay literal, safe and explicit about missing data.
h=harness();h.terminal.applyTokenInfo({mint,holders:0,holdersUpdatedAt:at,linksStatus:'available',links:[{type:'website',url:'https://example.org/project'},{type:'x',url:'https://x.com/example'},{type:'telegram',url:'javascript:alert(1)'},{type:'website',url:'https://user:secret@example.org'},{type:'custom',label:'<img onerror=bad()>',url:'https://example.org/other'}]});
assert.match(h.nodes.get('token-metrics').innerHTML,/>0<\/strong>/);assert.match(h.nodes.get('token-metrics').innerHTML,/Observed just now/);assert.match(h.nodes.get('terminal-project-links').innerHTML,/Website/);assert.match(h.nodes.get('terminal-project-links').innerHTML,/rel="noopener noreferrer"/);assert.doesNotMatch(h.nodes.get('terminal-project-links').innerHTML,/javascript|user:secret|<img/);assert.match(h.nodes.get('terminal-project-links').innerHTML,/&lt;img/);
h.terminal.applyTokenInfo({mint,holders:null,links:[],linksStatus:'none'});assert.match(h.nodes.get('token-metrics').innerHTML,/Unknown/);assert.match(h.nodes.get('token-metrics').innerHTML,/Observation time unavailable/);assert.match(h.nodes.get('terminal-project-links').innerHTML,/No project links listed/);
h.terminal.applyTokenInfo({mint,holders:null,links:[],linksStatus:'unavailable'});assert.match(h.nodes.get('terminal-project-links').innerHTML,/Project links unavailable/);

// A delayed exact-pool snapshot is useful when the view has no fresher market data.
const fiveMinutesAgo=new Date(Date.now()-300000).toISOString(),tenMinutesAgo=new Date(Date.now()-600000).toISOString();
h=harness();h.terminal.applyMarketView(marketView(pool,{stale:true,fetchedAt:fiveMinutesAgo,marketCapUsd:null,fdvUsd:45000,priceUsd:.5}));
assert.equal(h.terminal.getSelection().market.fdvUsd,45000);assert.equal(h.terminal.getSelection().market.stale,true);assert.match(h.nodes.get('token-metrics').innerHTML,/FDV · cap unverified/);assert.match(h.nodes.get('token-metrics').innerHTML,/Delayed FDV snapshot/);assert.match(h.nodes.get('token-status').textContent,/^Delayed/);
next(h,'/api/market?').resolve(research());await flush();assert.equal(h.terminal.getSelection().market.fdvUsd,45000);assert.match(h.nodes.get('token-status').textContent,/^Delayed/,'generic chain completion cannot erase the selected pool delay label');
h.terminal.applyMarketView(marketView(pool,{stale:true,fetchedAt:tenMinutesAgo,priceUsd:.1,fdvUsd:10000}));assert.equal(h.terminal.getSelection().market.priceUsd,.5,'older delayed observations do not replace newer delayed observations');
h.terminal.applyMarketView(marketView(pool,{stale:false,fetchedAt:at}));assert.equal(h.terminal.getSelection().market.priceUsd,2);assert.doesNotMatch(h.nodes.get('token-status').textContent,/^Delayed/);
h.terminal.applyMarketView(marketView(pool,{stale:true,fetchedAt:fiveMinutesAgo,priceUsd:.2,marketCapUsd:5000}));assert.equal(h.terminal.getSelection().market.priceUsd,2);assert.equal(h.terminal.getSelection().market.marketCapUsd,20000,'newer fresh observations survive old stale cache results');
h=harness();h.terminal.applyTokenInfo({mint,symbol:'DUBBLE',holders:null,links:[],linksStatus:'unavailable'});assert.equal(h.nodes.get('swap-output-label').textContent,'DUBBLE','metadata updates the trade label even without a market response');
console.log('PASS: exact URL pool handoff without a feed match; early market observations; generic research pool isolation; refresh/BFCache continuity; same-token pool switches; safe links; zero/unknown holders; labeled stale fallback and fresh-snapshot preservation; metadata trade labels.');
