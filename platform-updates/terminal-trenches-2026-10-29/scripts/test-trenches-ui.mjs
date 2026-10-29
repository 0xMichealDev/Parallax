// Offline controller checks. Does not claim browser layout or live-source verification.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const [html,coreSource,uiSource]=await Promise.all([readFile('app/trenches.html','utf8'),readFile('public/trenches-core.js','utf8'),readFile('public/trenches.js','utf8')]);
const NOW=1793250000000,MINT='8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump',POOL='3f82MmfsyzNHa8kFNwVUYRHF5Ane7boeSo2hpDXeVJDo';
const OTHER='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));await new Promise(resolve=>setImmediate(resolve));};
function harness({saved='',mobile=false}={}){
 let document,clock=NOW,serial=0;const requests=[],timers=new Map(),intervals=new Map(),windowEvents=new Map(),documentEvents=new Map(),controls=[];
 class Element{
  constructor(id=''){this.id=id;this.dataset={};this.value='';this.hidden=false;this.disabled=false;this.checked=false;this.scrollTop=0;this.attrs={};this.listeners=new Map();this.parent=null;this.queries=new Map();this._html='';this._text='';this.tagName='DIV';}
  set innerHTML(value){this._html=String(value);this._text='';}get innerHTML(){return this._html;}
  set textContent(value){this._text=String(value);this._html='';}get textContent(){return this._text;}
  setAttribute(name,value){this.attrs[name]=String(value);}getAttribute(name){return this.attrs[name]??null;}
  addEventListener(type,fn){const a=this.listeners.get(type)||[];a.push(fn);this.listeners.set(type,a);}
  dispatch(type,extra={}){const e={target:this,currentTarget:this,preventDefault(){},...extra};return this.listeners.get(type)?.map(fn=>fn(e)).at(-1);}
  click(){return this.dispatch('click');}focus(){document.activeElement=this;}showModal(){this.open=true;}close(){this.open=false;}
  querySelector(selector){if(!this.queries.has(selector)){const e=new Element();e.parent=this;this.queries.set(selector,e);}return this.queries.get(selector);}
  contains(node){while(node){if(node===this)return true;node=node.parent;}return false;}
  closest(selector){if(selector==='[data-tr-mint]'&&this.dataset.trMint)return this;const key=selector.match(/^\[data-(tr-[a-z-]+)\]$/)?.[1]?.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return key&&this.dataset[key]!==undefined?this:this.parent?.closest(selector)||null;}
  getBoundingClientRect(){return {left:0,right:430,top:0,bottom:900};}
 }
 const nodes=new Map();
 for(const [,tag,attrs]of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/g)){
  const id=attrs.match(/\bid="([^"]+)"/)?.[1],data=[...attrs.matchAll(/\bdata-([a-z-]+)="([^"]*)"/g)],name=attrs.match(/\bname="([^"]+)"/)?.[1];
  if(!id&&!data.length&&name!=='requiredSocials')continue;const e=new Element(id);e.tagName=tag.toUpperCase();e.hidden=/\shidden(?:\s|$)/.test(attrs);e.disabled=/\sdisabled(?:\s|$)/.test(attrs);e.value=attrs.match(/\bvalue="([^"]*)"/)?.[1]||'';e.name=name;
  for(const [,key,value]of data)e.dataset[key.replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=value;
  if(id){assert(!nodes.has(id),'Unique template ID '+id);nodes.set(id,e);}controls.push(e);
 }
 const selectAll=selector=>selector==='input[name="requiredSocials"]'?controls.filter(e=>e.name==='requiredSocials'):selector==='[data-tr-age]'?[]:controls.filter(e=>{const name=selector.match(/^\[data-([a-z-]+)\]$/)?.[1]?.replace(/-([a-z])/g,(_,c)=>c.toUpperCase());return name&&e.dataset[name]!==undefined;});
 document={hidden:false,activeElement:null,getElementById:id=>nodes.get(id)||null,querySelectorAll:selectAll,addEventListener:(type,fn)=>documentEvents.set(type,fn)};
 class ClockDate extends Date{constructor(...args){super(...(args.length?args:[clock]));}static now(){return clock;}}
 let savedValue=saved;const location=new URL('https://example.test/trenches');const media={matches:mobile,addEventListener(){}};
 const context={document,location,history:{replaceState(_a,_b,path){location.href=new URL(path,location).href;}},localStorage:{getItem:()=>savedValue,setItem(_key,value){savedValue=value;}},matchMedia:()=>media,URL,URLSearchParams,Date:ClockDate,Intl,AbortController,console,
  setTimeout:(fn,ms)=>{const id=++serial;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),setInterval:(fn,ms)=>{const id=++serial;intervals.set(id,{fn,ms});return id;},clearInterval:id=>intervals.delete(id),addEventListener:(name,fn)=>windowEvents.set(name,fn),
  fetch:(path,init)=>new Promise((resolve,reject)=>requests.push({path,init,url:new URL(path,location),used:false,resolve(body,status=200){resolve({ok:status>=200&&status<300,status,headers:{get:()=>null},json:async()=>structuredClone(body)});},reject})),
 };context.window=context;vm.createContext(context);vm.runInContext(coreSource,context);vm.runInContext(uiSource,context);
 return {nodes,requests,controls,windowEvents,document,media,saved:()=>savedValue,clock:value=>{clock=value;},tick:()=>[...intervals.values()].forEach(t=>t.fn()),click:id=>nodes.get(id).click(),submit:()=>nodes.get('tr-filter-form').dispatch('submit'),selector:selectAll,card(mint,key='fresh'){const e=new Element();e.dataset.trMint=mint;e.parent=nodes.get('tr-list-'+key);return e;},button(attr,value,key='fresh'){const e=new Element();e.dataset[attr]=value;e.parent=nodes.get('tr-list-'+key);return e;},timers};
}
function pool({mint=MINT,symbol='PRLX',completed=false,progress=75,holders=null,...rest}={}){return {mint,address:POOL,name:'Parallax',symbol,marketCapUsd:15000,fdvUsd:18000,liquidityUsd:7000,volume5mUsd:500,volume1hUsd:3000,buys5m:5,sells5m:2,holders,holdersUpdatedAt:null,links:[],linksStatus:'unavailable',createdAt:new Date(NOW-3600000).toISOString(),launchpad:{completed,progressPct:progress,completedAt:null,migratedPool:completed?POOL:null},...rest};}
function feed(stage,pools=[pool({completed:stage==='graduated'})],extra={}){return {stage,page:1,pools,source:'Fixture source',fetchedAt:new Date(NOW).toISOString(),freshUntil:new Date(NOW+300000).toISOString(),refreshAfterSeconds:300,hasMore:false,partial:false,coverage:'Sample of indexed pools.',...extra};}
function request(h,stage){const r=h.requests.find(r=>!r.used&&r.url.searchParams.get('stage')===stage);assert(r,'Pending request for '+stage);r.used=true;return r;}
async function initial(h,rows,extra={}){for(const key of ['fresh','near','graduated']){request(h,key).resolve(feed(key,rows?rows.map(p=>({...p,launchpad:{...p.launchpad,completed:key==='graduated'}})):undefined,extra));await flush();}}

// Loading a board must not fan out metadata requests merely because rows exist.
{
 const h=harness();assert.deepEqual(h.requests.map(r=>r.url.searchParams.get('stage')),['fresh','graduated'],'Near waits for the cold Fresh response while Graduated loads independently');await initial(h);
 assert.equal(h.requests.length,3);assert.equal(h.nodes.get('tr-count-fresh').textContent,'1');
 assert.match(h.nodes.get('tr-list-fresh').innerHTML,/Holders <b>—<\/b>/);
 assert.match(h.nodes.get('tr-list-fresh').innerHTML,/token=8B2G4oi.*&amp;pool=3f82/);
 assert.match(h.nodes.get('tr-list-graduated').innerHTML,/Migration pool/);
 console.log('PASS initial feed loads preserve unknowns and make no metadata fanout');
}
// Fresh and Near must never build the same first-page source in parallel, including
// the common five-minute expiry and manual refresh. Other source pages stay independent.
{
 const h=harness();await initial(h);h.clock(NOW+301000);h.tick();
 assert.deepEqual(h.requests.slice(3).map(r=>r.url.searchParams.get('stage')),['fresh','graduated']);
 h.tick();assert.equal(h.requests.length,5,'queued Near is already loading and repeated ticks cannot duplicate it');
 request(h,'graduated').resolve(feed('graduated'));await flush();assert.equal(h.requests.length,5,'Graduated completion does not release Near');
 request(h,'fresh').resolve(feed('fresh'));await flush();assert.equal(h.requests.length,6);assert.equal(h.requests.at(-1).url.searchParams.get('stage'),'near');
 request(h,'near').resolve(feed('near'));await flush();
 h.click('tr-refresh');assert.deepEqual(h.requests.slice(6).map(r=>r.url.searchParams.get('stage')),['fresh','graduated'],'manual refresh shares the same request lane');
 request(h,'fresh').resolve(feed('fresh'));await flush();assert.equal(h.requests.length,9);request(h,'near').resolve(feed('near'));request(h,'graduated').resolve(feed('graduated'));await flush();
 console.log('PASS five-minute and manual refresh serialize Fresh/Near while Graduated stays parallel');
}
{
 const h=harness();await initial(h,undefined,{hasMore:true});
 h.selector('[data-tr-more]').find(b=>b.dataset.trMore==='fresh').click();h.selector('[data-tr-more]').find(b=>b.dataset.trMore==='near').click();
 assert.deepEqual(h.requests.slice(3).map(r=>[r.url.searchParams.get('stage'),r.url.searchParams.get('page')]),[['fresh','2'],['near','2']],'load-more pages retain independent requests');
 console.log('PASS direct pagination remains independent');
}
// A background refresh remains pending while the reader is inspecting that list.
{
 const h=harness();await initial(h);const target=h.nodes.get('tr-list-fresh'),before=target.innerHTML;
 target.dispatch('pointerenter',{pointerType:'mouse'});h.clock(NOW+301000);h.tick();
 request(h,'fresh').resolve(feed('fresh',[pool({symbol:'UPDATED'})]));await flush();
 assert.equal(target.innerHTML,before);assert.equal(h.nodes.get('tr-held-fresh').hidden,false);
 target.dispatch('pointerleave');assert.match(target.innerHTML,/UPDATED/);assert.equal(h.nodes.get('tr-held-fresh').hidden,true);
 console.log('PASS refresh holds rows while hovered and applies after inspection');
}
// Missing holder/link data cannot deadlock an active filter into an unresolvable empty board.
{
 const h=harness(),mints=[MINT,OTHER,'2'.repeat(32),'3'.repeat(32),'4'.repeat(32),'5'.repeat(32)];await initial(h,mints.map(mint=>pool({mint})));
 h.selector('[data-tr-filter]').find(b=>b.dataset.trFilter==='fresh').click();h.nodes.get('tr-f-minHolders').value='100';h.submit();await flush();
 let info=h.requests.filter(r=>r.url.pathname.endsWith('/token-info'));assert.equal(info.length,2,'only two concurrent metadata reads');
 assert.equal(h.nodes.get('tr-count-fresh').textContent,'0');assert.equal(h.nodes.get('tr-meta-fresh').hidden,false);assert.match(h.nodes.get('tr-list-fresh').innerHTML,/still unknown/);
 for(let round=0;round<2;round++){info=h.requests.filter(r=>r.url.pathname.endsWith('/token-info')&&!r.used);for(const r of info){r.used=true;r.resolve({mint:r.url.searchParams.get('mint'),holders:150,links:[],linksStatus:'none'});}await flush();}
 assert.equal(h.requests.filter(r=>r.url.pathname.endsWith('/token-info')).length,4,'Apply checks no more than four new mints');
 assert.equal(h.nodes.get('tr-count-fresh').textContent,'4');assert.equal(h.nodes.get('tr-meta-fresh').hidden,false,'next-batch action remains available with visible matches');
 h.click('tr-meta-check-fresh');await flush();assert.equal(h.requests.filter(r=>r.url.pathname.endsWith('/token-info')).length,6);
 console.log('PASS metadata filters check a bounded cohort and expose the next cohort');
}
// Per-column preferences and mobile navigation remain independent.
{
 const h=harness({mobile:true});await initial(h);h.selector('[data-tr-volume]').find(b=>b.dataset.trVolume==='near:h1').click();
 assert.equal(JSON.parse(h.saved()).filters.near.volumeWindow,'h1');assert.equal(JSON.parse(h.saved()).filters.fresh.volumeWindow,'m5');
 h.nodes.get('tr-tab-fresh').dispatch('keydown',{key:'ArrowRight'});assert.equal(h.nodes.get('tr-column-fresh').hidden,true);assert.equal(h.nodes.get('tr-column-near').hidden,false);
 h.click('tr-pause');const count=h.requests.length;h.clock(NOW+601000);h.tick();assert.equal(h.requests.length,count,'paused pages do not poll');
 h.click('tr-pause');assert.equal(h.requests.length,count+2,'resume starts Fresh and Graduated while Near waits');request(h,'fresh').resolve(feed('fresh'));await flush();assert.equal(h.requests.length,count+3,'resume starts Near after Fresh completes');
 console.log('PASS independent settings, keyboard tabs, and pause/resume');
}
// Failed refreshes retain observations, and mismatched stage payloads never enter a column.
{
 const h=harness();await initial(h);h.clock(NOW+301000);h.tick();request(h,'fresh').resolve({error:'Provider is cooling down.',retryAfterSeconds:120},429);await flush();request(h,'near').resolve(feed('graduated'));await flush();
 assert.match(h.nodes.get('tr-list-fresh').innerHTML,/PRLX/);assert.equal(h.nodes.get('tr-stale-fresh').hidden,false);
 assert.match(h.nodes.get('tr-status-near').textContent,/Refresh unavailable/);assert.doesNotMatch(h.nodes.get('tr-list-near').innerHTML,/Migration pool/);
 const before=h.requests.length;h.clock(NOW+350000);h.tick();assert.equal(h.requests.length,before,'Retry-After is respected');
 console.log('PASS failed refresh retention, stage matching, and cooldown');
}
// Restoring a page after navigation must not leave an interrupted fetch permanently loading.
{
 const h=harness();h.windowEvents.get('pagehide')({persisted:true});h.windowEvents.get('pageshow')({persisted:true});assert.equal(h.requests.length,4,'restoration starts a new Fresh/Graduated pair without waiting on the abandoned lane');
 request(h,'fresh').resolve(feed('fresh'));await flush();assert.equal(h.requests.length,4,'the old queued Near cannot restart after restoration');
 request(h,'fresh').resolve(feed('fresh'));await flush();assert.equal(h.requests.length,5,'restored Fresh completion starts exactly one Near');
 console.log('PASS back-forward restoration restarts interrupted feeds');
}
