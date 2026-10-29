// Offline browser-controller regressions. Uses only public source and the page template.
// The small DOM fixture does not establish visual layout or real-browser rendering.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const [coreSource,uiSource,html]=await Promise.all([
 readFile('public/replay-core.js','utf8'),
 readFile('public/replay.js','utf8'),
 readFile('app/replay.html','utf8'),
]);
const MINT='8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump';
const OTHER='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const POOL='6iep3EgqksbZwgzMBCyAJtiVtVYkCgL9BnPBEwLR8AGQ';
const WALLET='5ZeA2mx6MotvFgpF8ZyGHSAVLZAqGuNK5aj8udFwtLC3';
const SNAPSHOT='a'.repeat(64),FROM=1793217600;
const flush=()=>new Promise(resolve=>setImmediate(resolve));

function harness({search='?mint='+MINT,clipboardFails=false}={}){
 const requests=[],clipboard=[],historyEntries=[],frames=new Map(),windowEvents=new Map(),documentEvents=new Map();
 let nextFrame=0,document;
 class Element{
  constructor(id=''){this.id=id;this.value='';this.hidden=false;this.disabled=false;this.dataset={};this.attrs={};this.listeners=new Map();this.queries=new Map();this._html='';this._text='';this.classes=new Set();this.classList={add:name=>this.classes.add(name),remove:name=>this.classes.delete(name),toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name)};}
  set innerHTML(value){this._html=String(value);this._text='';this.queries.clear();}
  get innerHTML(){return this._html;}
  set textContent(value){this._text=String(value);this._html='';this.queries.clear();}
  get textContent(){return this._text;}
  setAttribute(name,value){this.attrs[name]=String(value);}
  getAttribute(name){return this.attrs[name]??null;}
  addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list);}
  dispatch(type,extra={}){const event={target:this,currentTarget:this,preventDefault(){},...extra};return this.listeners.get(type)?.map(fn=>fn(event)).at(-1);}
  replaceChildren(){this.innerHTML='';}
  focus(){document.activeElement=this;}
  select(){this.selected=true;}
  click(){return this.dispatch('click');}
  getBoundingClientRect(){return {left:0,width:1000};}
  closest(selector){
   if(selector==='section')return coverageSection;
   const key=selector==='[data-rp-event]'?'rpEvent':selector==='[data-rp-follow]'?'rpFollow':null;
   return key&&this.dataset[key]!==undefined?this:null;
  }
  querySelector(selector){
   if(selector==='a'&&!this.innerHTML.includes('<a '))return null;
   if(!this.queries.has(selector))this.queries.set(selector,new Element());
   return this.queries.get(selector);
  }
 }
 const nodes=new Map();
 for(const [,tag,attributes,id]of html.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*\bid="([^"]+)"[^>]*)>/g)){
  assert(!nodes.has(id),'unique template ID: '+id);
  const node=new Element(id);node.tagName=tag;node.disabled=/\sdisabled(?:\s|$)/.test(attributes);node.hidden=/\shidden(?:\s|$)/.test(attributes);nodes.set(id,node);
 }
 const controls={hours:[],side:[],mint:[]};
 for(const [,attrs]of html.matchAll(/<button\b([^>]*)>/g))for(const type of Object.keys(controls)){
  const value=attrs.match(new RegExp('data-rp-'+type+'="([^"]+)"'))?.[1];
  if(value){const node=new Element();node.dataset['rp'+type[0].toUpperCase()+type.slice(1)]=value;controls[type].push(node);}
 }
 const coverageSection=new Element();
 nodes.get('rp-speed').value='1';
 document={hidden:false,activeElement:null,getElementById:id=>nodes.get(id)||null,
  querySelectorAll:selector=>controls[selector.match(/^\[data-rp-(hours|side|mint)\]$/)?.[1]]||[],
  querySelector:selector=>selector==='[data-rp-side="all"]'?controls.side.find(n=>n.dataset.rpSide==='all'):null,
  addEventListener:(type,fn)=>documentEvents.set(type,fn),createElement:()=>new Element()};
 const location=new URL('https://example.test/replay'+search);
 const context={document,location,history:{replaceState(_state,_title,url){location.href=new URL(url,location).href;historyEntries.push(location.href);}},
  navigator:{clipboard:{async writeText(value){if(clipboardFails)throw Error('Clipboard is unavailable.');clipboard.push(value);}}},
  URL,URLSearchParams,Date,Intl,AbortController,Blob,console,
  requestAnimationFrame:fn=>{const id=++nextFrame;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
  setTimeout:()=>1,addEventListener:(type,fn)=>windowEvents.set(type,fn),
  // Deliberately allow resolution after abort to exercise the controller's stale-response guard.
  fetch:(path,init)=>new Promise((resolve,reject)=>requests.push({path,query:new URL(path,location).searchParams,init,used:false,
   resolve(body,status=200){resolve({ok:status>=200&&status<300,status,json:async()=>structuredClone(body)});},reject})),
 };
 context.window=context;vm.createContext(context);
 vm.runInContext(coreSource,context,{filename:'public/replay-core.js'});
 vm.runInContext(uiSource,context,{filename:'public/replay.js'});
 return {nodes,controls,requests,clipboard,frames,document,windowEvents,documentEvents,location,historyEntries,
  click:id=>nodes.get(id).click(),submit(){return nodes.get('rp-form').dispatch('submit');},
  windowButton:hours=>controls.hours.find(n=>n.dataset.rpHours===String(hours)),
  newElement:()=>new Element(),
 };
}

function pending(h){const request=h.requests.find(r=>!r.used);assert(request,'a replay request is pending');request.used=true;return request;}
function trade(id,side,volumeUsd,time=FROM+120){return {id,side,volumeUsd,time,wallet:WALLET,tokenAmount:10,priceUsd:volumeUsd===null?null:volumeUsd/10,signature:'2'.repeat(88)};}
function snapshot({mint=MINT,pool=POOL,hours=6,symbol='TEST',trades=[trade('buy','buy',10),trade('sell','sell',5,FROM+180)],sharedSnapshot=false,...extra}={}){
 const to=FROM+hours*3600;
 return {schema:'parallax.replay.v1',snapshotId:SNAPSHOT,mint,pool:{address:pool,symbol,pair:symbol+' / SOL'},window:{from:FROM,to,hours},
  capturedAt:new Date(to*1000).toISOString(),expiresAt:'2026-11-02T14:30:00.000Z',sharedSnapshot,stale:false,source:'Fixture indexed pool data',
  intervalMinutes:1,chartAvailable:true,candles:[{time:FROM,open:1,high:1,low:1,close:1},{time:FROM+60,open:1,high:2,low:1,close:2}],trades,
  coverage:{loaded:trades.length,returned:trades.length,firstTradeAt:trades[0]?.time??null,lastTradeAt:trades.at(-1)?.time??null,oldestReturned:trades[0]?.time??null,
   windowTruncated:false,invalid:0,duplicates:0,unknownWallets:0,missingUsd:trades.filter(t=>t.volumeUsd===null).length,scope:'Recent swaps from one selected pool.'},
  notes:{chart:'Completed closes only.',wallets:'Senders are not necessarily beneficial owners.',retention:'Captured snapshots have a fixed expiry.',associations:'No fixture labels.'},associations:[],...extra};
}
async function ready(h,body=snapshot()){pending(h).resolve(body);await flush();assert.equal(h.nodes.get('rp-error').hidden,true,h.nodes.get('rp-error-text').textContent);return body;}
function assertFailed(h){
 assert.equal(h.nodes.get('rp-workspace').getAttribute('aria-busy'),'false');
 assert.equal(h.nodes.get('rp-error').hidden,false);
 assert.equal(h.nodes.get('rp-chart-empty').querySelector('strong').textContent,'Replay unavailable.');
 for(const id of ['rp-chart-title','rp-count-note','rp-events','rp-wallets'])assert.doesNotMatch(h.nodes.get(id).textContent+h.nodes.get(id).innerHTML,/Loading|Retrieving|Gathering/,'terminal failure copy: '+id);
 for(const id of ['rp-share','rp-play','rp-timeline','rp-export'])assert.equal(h.nodes.get(id).disabled,true,id+' stays disabled after failure');
 assert.equal(h.nodes.get('rp-load').disabled,false,'loading can be retried');
}

// A saved-link retry must never substitute a different evidence window, even after expiry.
{
 const h=harness({search:'?snapshot='+SNAPSHOT+'&mint='+MINT+'&hours=6&at='+(FROM+120)});
 const original=pending(h);assert.equal(original.query.get('snapshot'),SNAPSHOT);original.resolve({error:'Provider temporarily unavailable.'},503);await flush();assertFailed(h);
 h.click('rp-retry');const retry=pending(h);assert.equal(retry.path,original.path,'retry preserves the saved snapshot request');
 retry.resolve({error:'This saved replay has expired.'},410);await flush();assertFailed(h);assert.match(h.nodes.get('rp-error-text').textContent,/expired/);
 h.click('rp-retry');const expiredRetry=pending(h);assert.equal(expiredRetry.path,original.path,'410 retry must not silently load a recent capture');
 expiredRetry.resolve({error:'This saved replay has expired.'},410);await flush();
 h.click('rp-refresh');const latest=pending(h);assert.equal(latest.query.has('snapshot'),false,'Load latest explicitly requests fresh evidence');assert.equal(latest.query.get('mint'),MINT);
 latest.resolve(snapshot());await flush();assert.equal(h.nodes.get('rp-error').hidden,true);
 console.log('PASS: snapshot retries retain the original request through 503 and 410; Load latest is explicit.');
}

// The selected market remains pinned across refreshes and window changes, but not token changes.
{
 const h=harness({search:'?mint='+MINT+'&pool='+POOL+'&hours=6'});
 assert.equal(h.requests[0].query.get('pool'),POOL);await ready(h);
 h.click('rp-refresh');let request=pending(h);assert.equal(request.query.get('pool'),POOL);request.resolve(snapshot());await flush();
 h.windowButton(24).click();request=pending(h);assert.equal(request.query.get('pool'),POOL);assert.equal(request.query.get('hours'),'24');request.resolve(snapshot({hours:24}));await flush();
 assert.equal(h.location.searchParams.get('pool'),POOL,'the URL records the actual selected market');
 h.nodes.get('rp-mint').value=OTHER;h.submit();request=pending(h);assert.equal(request.query.get('mint'),OTHER);assert.equal(request.query.has('pool'),false,'a different token cannot inherit the old pool');
 request.resolve(snapshot({mint:OTHER,pool:WALLET,hours:24,symbol:'OTHER'}));await flush();assert.equal(h.nodes.get('rp-chart-title').textContent,'OTHER / Replay');
 console.log('PASS: pool pinning survives refresh/window changes and resets when the token changes.');
}

// Aborting a request is not sufficient: a late response must also be ignored.
{
 const h=harness(),old=pending(h);
 h.nodes.get('rp-mint').value=OTHER;h.submit();const current=pending(h);assert.equal(old.init.signal.aborted,true);
 current.resolve(snapshot({mint:OTHER,pool:WALLET,symbol:'CURRENT'}));await flush();
 old.resolve(snapshot({symbol:'STALE'}));await flush();
 assert.equal(h.nodes.get('rp-chart-title').textContent,'CURRENT / Replay');assert.equal(h.nodes.get('rp-mint').value,OTHER);
 assert.equal(h.nodes.get('rp-terminal').href,'/terminal?token='+OTHER);assert.equal(h.nodes.get('rp-error').hidden,true);
 // A separate late failure must likewise leave the current successful display intact.
 const failing=harness(),obsolete=pending(failing);failing.nodes.get('rp-mint').value=OTHER;failing.submit();pending(failing).resolve(snapshot({mint:OTHER,symbol:'CURRENT'}));await flush();
 obsolete.reject(Error('Old request failed.'));await flush();assert.equal(failing.nodes.get('rp-chart-title').textContent,'CURRENT / Replay');assert.equal(failing.nodes.get('rp-error').hidden,true);
 console.log('PASS: late successes and failures cannot replace the currently selected token.');
}

// USD missingness is independent for each side, both in aggregate cards and wallet rows.
{
 const cases=[
  {trades:[trade('unknown-buy','buy',null),trade('known-sell','sell',5,FROM+180)],buy:'—',sell:'$5.00',buyPartial:true,sellPartial:false},
  {trades:[trade('known-buy','buy',10),trade('unknown-buy','buy',null,FROM+180)],buy:'$10.00*',sell:'$0.00',buyPartial:true,sellPartial:false},
  {trades:[trade('zero-buy','buy',0)],buy:'$0.00',sell:'$0.00',buyPartial:false,sellPartial:false},
  {trades:[trade('unknown-buy','buy',null),trade('unknown-sell','sell',null,FROM+180)],buy:'—',sell:'—',buyPartial:true,sellPartial:true},
 ];
 for(const fixture of cases){
  const h=harness();await ready(h,snapshot({trades:fixture.trades}));
  assert.equal(h.nodes.get('rp-buy-volume').textContent,fixture.buy);assert.equal(h.nodes.get('rp-sell-volume').textContent,fixture.sell);
  assert.equal(h.nodes.get('rp-buy-note').textContent.includes('USD incomplete'),fixture.buyPartial);assert.equal(h.nodes.get('rp-sell-note').textContent.includes('USD incomplete'),fixture.sellPartial);
  const row=h.nodes.get('rp-wallets').innerHTML;
  assert.equal(row.match(/<td class="rp-buy-text">([^<]*)<\/td>/)?.[1],fixture.buy);
  assert.equal(row.match(/<td class="rp-sell-text">([^<]*)<\/td>/)?.[1],fixture.sell);
 }
 console.log('PASS: unknown USD, partial totals, genuine zero and the opposite side render distinctly.');
}

// Re-sharing an older capture preserves its fixed expiry rather than promising another seven days.
{
 const at=FROM+180,search='?snapshot='+SNAPSHOT+'&mint='+MINT+'&hours=6&at='+at+'&wallet='+WALLET+'&side=sell';
 const h=harness({search});await ready(h,snapshot({sharedSnapshot:true}));await h.click('rp-share');
 const shared=new URL(h.clipboard[0]);assert.equal(shared.searchParams.get('snapshot'),SNAPSHOT);assert.equal(shared.searchParams.get('at'),String(at));assert.equal(shared.searchParams.get('wallet'),WALLET);assert.equal(shared.searchParams.get('side'),'sell');
 assert.match(h.nodes.get('rp-status').textContent,/until 02 Nov, 14:30 UTC/);assert.doesNotMatch(h.nodes.get('rp-status').textContent,/seven days/);
 const fallback=harness({search,clipboardFails:true});await ready(fallback,snapshot({sharedSnapshot:true}));await fallback.click('rp-share');
 assert.equal(fallback.nodes.get('rp-share-fallback').hidden,false);assert.match(fallback.nodes.get('rp-share-fallback').querySelector('p').textContent,/until 02 Nov, 14:30 UTC/);
 assert.equal(new URL(fallback.nodes.get('rp-share-url').value).searchParams.get('snapshot'),SNAPSHOT);assert.equal(fallback.document.activeElement,fallback.nodes.get('rp-share-url'));
 console.log('PASS: sharing and clipboard fallback preserve the saved filters, playhead and actual expiry.');
}

// Keyboard users entering a frequently redrawn list pause playback before its nodes are replaced.
{
 const h=harness();await ready(h);
 for(const id of ['rp-events','rp-wallets','rp-selected-event']){
  h.click('rp-play');assert.equal(h.frames.size,1);h.nodes.get(id).dispatch('focusin');assert.equal(h.frames.size,0);assert.equal(h.nodes.get('rp-play').getAttribute('aria-label'),'Play replay');
 }
 // Untrusted token display metadata is text/escaped markup, never executable event-list HTML.
 h.click('rp-refresh');pending(h).resolve(snapshot({symbol:'<img src=x onerror=bad()>',trades:[trade('markup','buy',10)]}));await flush();
 assert.equal(h.nodes.get('rp-chart-title').textContent,'<img src=x onerror=bad()> / Replay');assert.match(h.nodes.get('rp-events').innerHTML,/&lt;img src=x onerror=bad\(\)&gt;/);assert.doesNotMatch(h.nodes.get('rp-events').innerHTML,/<img /);
 console.log('PASS: list focus pauses playback and token metadata is safely rendered.');
}
