const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const source=readFileSync('public/terminal-plus.js','utf8');
const NOW=1793250000000,MINT='8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump',OTHER='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',POOL='6iep3EgqksbZwgzMBCyAJtiVtVYkCgL9BnPBEwLR8AGQ';
const rowMints=[...'23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'].map(c=>c.repeat(32));
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));};
function harness({chart=null}={}){
 let now=NOW,selection={mint:MINT,pool:POOL},rows=[],intersection,chartState=chart;
 const requests=[],nodes=new Map(),events=new Map(),documentEvents=new Map(),intervals=[],appliedInfo=[],appliedMarket=[];
 class Element{
  constructor(){this.dataset={};this.attrs={};this.value='';this.hidden=false;this.disabled=false;this.isConnected=true;this.textContent='—';this.style={};this.listeners=new Map();this.children=[];this.queries=new Map();this.classList={toggle(){},add(){},remove(){}};}
  addEventListener(name,fn){this.listeners.set(name,fn);}setAttribute(name,value){this.attrs[name]=String(value);}getAttribute(name){return this.attrs[name]||null;}
  querySelector(selector){if(selector==='img')return this.children.find(el=>el.tagName==='img')||null;if(!this.queries.has(selector))this.queries.set(selector,new Element());return this.queries.get(selector);}
  prepend(el){this.children.unshift(el);}remove(){this.isConnected=false;}dispatchEvent(event){this.listeners.get(event.type)?.(event);}click(){return this.listeners.get('click')?.();}
 }
 const node=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
 const document={hidden:false,getElementById:node,querySelector:node,querySelectorAll(selector){if(selector==='[data-project-mint]')return rows;return [];},createElement:tag=>Object.assign(new Element(),{tagName:tag}),addEventListener:(name,fn)=>documentEvents.set(name,fn)};
 const window={ParallaxTerminal:{getSelection:()=>selection,getChart:()=>chartState,applyTokenInfo:d=>appliedInfo.push(d),applyMarketView:d=>appliedMarket.push(d),refreshSwapLabels(){}},addEventListener:(name,fn)=>events.set(name,fn)};
 class ClockDate extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return now;}}
 const context={window,document,Date:ClockDate,URL,Intl,AbortSignal,Event,console,MutationObserver:class{observe(){}},IntersectionObserver:class{constructor(fn){intersection=fn;}observe(){}unobserve(){}disconnect(){}},setInterval:fn=>intervals.push(fn),setTimeout:()=>0,
  fetch:(path,init)=>new Promise((resolve,reject)=>requests.push({path,init,url:new URL(path,'https://example.test'),used:false,resolve(data,status=200,headers={}){resolve({ok:status>=200&&status<300,status,headers:{get:key=>headers[key]||null},json:async()=>data});},reject}))};
 vm.runInNewContext(source,context);
 return {requests,nodes,events,document,documentEvents,appliedInfo,appliedMarket,clock:value=>{now=value;},chart:value=>{chartState=value;},tick:()=>intervals.forEach(fn=>fn()),select(mint){selection={mint,pool:POOL};events.get('parallax:terminal-selection')();},visible(mints){rows=mints.map(mint=>{const el=new Element();el.dataset.projectMint=mint;return el;});intersection(rows.map(target=>({target,isIntersecting:true})));}};
}
const info=(mint=MINT,extra={})=>({mint,name:'Fixture',symbol:'TEST',holders:42,holdersUpdatedAt:new Date(NOW).toISOString(),links:[],linksStatus:'none',...extra});
const market=(mint=MINT,extra={})=>({mint,pool:POOL,source:'Fixture',fetchedAt:new Date(NOW).toISOString(),activity:{},...extra});
function pending(h,path,mint){const r=h.requests.find(r=>!r.used&&r.url.pathname===path&&(!mint||r.url.searchParams.get('mint')===mint));assert(r,'Pending '+path+' '+(mint||''));r.used=true;return r;}
async function initial(h){pending(h,'/api/terminal/market-view').resolve(market());pending(h,'/api/terminal/token-info').resolve(info());await flush();}
const infoRequests=h=>h.requests.filter(r=>r.url.pathname==='/api/terminal/token-info');
const marketRequests=h=>h.requests.filter(r=>r.url.pathname==='/api/terminal/market-view');

test('visible-row metadata has a total limit, bounded concurrency, and selected-token priority',async()=>{
 const h=harness();await initial(h);h.visible(rowMints.slice(0,40));
 assert.equal(infoRequests(h).length,3,'selected token plus only two concurrent row reads');
 for(const mint of rowMints.slice(0,2))pending(h,'/api/terminal/token-info',mint).resolve(info(mint));await flush();
 assert.equal(infoRequests(h).length,5,'only four automatic reads in this window');
 for(const mint of rowMints.slice(2,4))pending(h,'/api/terminal/token-info',mint).resolve(info(mint));await flush();h.tick();
 assert.equal(infoRequests(h).length,5,'scrolling a long list cannot drain the allowance');
 h.select(OTHER);assert.equal(infoRequests(h).length,6,'explicit selected-token metadata is not starved by row enrichment');
 pending(h,'/api/terminal/token-info',OTHER).resolve(info(OTHER));await flush();
 h.clock(NOW+120001);h.tick();assert.equal(infoRequests(h).length,8,'a new window resumes at most two concurrent rows');
});

test('automatic metadata waits for the selected native chart, while explicit DEX mode remains usable',async()=>{
 const h=harness({chart:{mode:'snapshot',data:null,loading:true}});await initial(h);h.visible(rowMints.slice(0,8));h.tick();assert.equal(infoRequests(h).length,1,'native chart receives the budget before automatic row details');
 h.chart({mode:'snapshot',data:null,loading:false});h.tick();assert.equal(infoRequests(h).length,1,'a failed cold chart does not release its allowance to background metadata');
 h.select(OTHER);assert.equal(infoRequests(h).length,2,'selected metadata remains prioritized while its chart loads');pending(h,'/api/terminal/token-info',OTHER).resolve(info(OTHER));await flush();
 h.chart({mode:'snapshot',data:{candles:[{time:1,close:1}]},loading:false});h.tick();assert.equal(infoRequests(h).length,4,'metadata starts after successful native data');
 const dex=harness({chart:{mode:'dex',data:null,loading:false}});await initial(dex);dex.visible(rowMints.slice(0,8));assert.equal(infoRequests(dex).length,3,'explicit external-chart mode does not require native candles');
});

test('metadata cooldown applies across automatic rows, preserves explicit cached lookup, and resumes',async()=>{
 const h=harness();await initial(h);h.visible(rowMints.slice(0,8));
 pending(h,'/api/terminal/token-info',rowMints[0]).resolve({error:'Provider limit',retryAfterSeconds:120},429);
 pending(h,'/api/terminal/token-info',rowMints[1]).resolve(info(rowMints[1]));await flush();
 assert.equal(infoRequests(h).length,3,'a provider limit stops queued row enrichment');
 h.select(rowMints[0]);await flush();assert.equal(infoRequests(h).length,3,'same-token retries respect its cooldown');
 h.select(OTHER);assert.equal(infoRequests(h).length,4,'a newly selected token can still request its retained server snapshot');pending(h,'/api/terminal/token-info',OTHER).resolve(info(OTHER,{stale:true}));await flush();
 h.clock(NOW+119000);h.tick();assert.equal(infoRequests(h).length,4);
 h.clock(NOW+121000);h.tick();assert.equal(infoRequests(h).length,6,'finite provider cooldown resumes bounded automatic work');
});

test('market failures and retained HTTP-200 responses both honor Retry-After',async()=>{
 const h=harness();pending(h,'/api/terminal/token-info').resolve(info());pending(h,'/api/terminal/market-view').resolve({error:'Provider limit'},429,{'Retry-After':'120'});await flush();
 assert.equal(h.nodes.get('terminal-data-refresh').disabled,true);
 h.clock(NOW+119000);h.tick();h.nodes.get('terminal-data-refresh').click();assert.equal(marketRequests(h).length,1,'clicks and polling respect the header cooldown');
 h.clock(NOW+121000);h.tick();assert.equal(marketRequests(h).length,2);
 pending(h,'/api/terminal/market-view').resolve(market(MINT,{stale:true,retryAfterSeconds:300,refreshAfterSeconds:0}));await flush();
 assert.match(h.nodes.get('terminal-data-status').textContent,/STALE snapshot/);assert.match(h.nodes.get('terminal-data-status').textContent,/Updates paused until/);assert.equal(h.nodes.get('terminal-data-refresh').disabled,true);
 h.clock(NOW+420000);h.tick();assert.equal(marketRequests(h).length,2);
 h.clock(NOW+422000);h.tick();assert.equal(marketRequests(h).length,3,'retained success resumes at the server deadline');
});

test('failed metadata refresh retains dated holders instead of replacing them with unknown',async()=>{
 const h=harness();await initial(h);h.clock(NOW+900001);h.select(MINT);
 pending(h,'/api/terminal/token-info',MINT).resolve({error:'Temporarily unavailable'},503);await flush();
 const retained=h.appliedInfo.at(-1);assert.equal(retained.holders,42);assert.equal(retained.holdersUpdatedAt,new Date(NOW).toISOString());assert.equal(retained.stale,true);
 const count=infoRequests(h).length;h.select(MINT);await flush();assert.equal(infoRequests(h).length,count,'an immediate repeated selection uses the retained observation during cooldown');
});

test('hidden and departed pages do not drain queued row metadata',async()=>{
 const h=harness();await initial(h);h.document.hidden=true;h.visible(rowMints.slice(0,8));h.clock(NOW+121000);h.tick();assert.equal(infoRequests(h).length,1);
 h.document.hidden=false;h.documentEvents.get('visibilitychange')();assert.equal(infoRequests(h).length,3);
 h.events.get('pagehide')();for(const mint of rowMints.slice(0,2))pending(h,'/api/terminal/token-info',mint).resolve(info(mint));await flush();h.tick();assert.equal(infoRequests(h).length,3,'late completions cannot start more metadata after navigation');
});
