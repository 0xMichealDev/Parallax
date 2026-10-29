import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile,access} from 'node:fs/promises';
const source=await readFile('public/terminal.js','utf8'),html=await readFile('app/terminal.html','utf8');
const mint='8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump',other='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',wallet='5ZeA2mx6MotvFgpF8ZyGHSAVLZAqGuNK5aj8udFwtLC3',sol='So11111111111111111111111111111111111111112',pool='6iep3EgqksbZwgzMBCyAJtiVtVYkCgL9BnPBEwLR8AGQ';
const at=new Date().toISOString(),ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'unique element IDs');
for(const [,path] of html.matchAll(/(?:src|href)="(\/[^"?#]+\.(?:js|css))(?:\?[^"#]*)?"/g))await access('public'+path);
function harness({search='?chart=dex',phantom=false,now=Date.now(),saved={}}={}){
 const clock={now};class ClockDate extends Date{constructor(...args){super(...(args.length?args:[clock.now]));}static now(){return clock.now;}}
 class Element{
  constructor(){this.hidden=false;this.disabled=false;this.value='';this.dataset={};this.attrs={};this.listeners={};this.children=[];this._html='';this._text='';this.htmlWrites=0;this.queryCache=new Map();this.classes=new Set();this.classList={toggle:(s,on)=>on?this.classes.add(s):this.classes.delete(s)};}
  set innerHTML(s){this._html=s;this._text='';this.children=[];this.htmlWrites++;this.queryCache.clear();if(this.id==='replay-quote')this.value=s.match(/value="([^"]+)"/)?.[1]||'';}
  get innerHTML(){return this._html+this.children.map(child=>child.outerHTML).join('');}
  get outerHTML(){return '<'+(this.tagName||'div')+' '+Object.entries({...this.attrs,...Object.fromEntries(Object.entries(this.dataset).map(([k,v])=>['data-'+k,v])),class:[...this.classes].join(' ')}).map(([k,v])=>k+'="'+v+'"').join(' ')+'>'+this.innerHTML+'</'+(this.tagName||'div')+'>';}
  set className(s){this.classes=new Set(s.split(/\s+/).filter(Boolean));}
  get className(){return [...this.classes].join(' ');}
  set textContent(s){this._text=s;this._html='';}
  get textContent(){return this._text;}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(k,fn){this.listeners[k]=fn;}
  replaceChildren(...children){this.innerHTML='';this.textContent='';this.children=children;children.forEach(child=>child.parentNode=this);}
  insertAdjacentHTML(_,s){this._html+=s;}
  append(el){this.insertBefore(el,null);}
  insertBefore(el,before){if(el===before)return;el.remove();const at=before?this.children.indexOf(before):-1;this.children.splice(at<0?this.children.length:at,0,el);el.parentNode=this;this.queryCache.clear();}
  remove(){this.removed=true;if(this.parentNode){const at=this.parentNode.children.indexOf(this);if(at>=0)this.parentNode.children.splice(at,1);this.parentNode=null;}}
  contains(el){return el===this||this.children.some(child=>child.contains(el));}
  scrollIntoView(){}
  querySelector(selector){return /<button|<input/.test(this.innerHTML)?new Element():null;}
  querySelectorAll(selector){
   if(selector==='*')return this.children;
   if(selector==='[data-mint]'){
    if(this.children.some(child=>child.dataset.mint))return this.children.filter(child=>child.dataset.mint);
    if(!this.queryCache.has(selector))this.queryCache.set(selector,[...this.innerHTML.matchAll(/<button\b([^>]*)>/g)].filter(m=>/data-mint="/.test(m[1])).map(m=>{const el=new Element();for(const [,key,value] of m[1].matchAll(/([\w-]+)="([^"]*)"/g)){el.attrs[key]=value;if(key.startsWith('data-'))el.dataset[key.slice(5)]=value;if(key==='class')value.split(/\s+/).filter(Boolean).forEach(c=>el.classes.add(c));}return el;}));
    return this.queryCache.get(selector);
   }
   const attr=selector==='[data-mint]'?'mint':selector==='[data-point]'?'point':null;
   if(attr)return [...this.innerHTML.matchAll(new RegExp('data-'+attr+'="([^"]+)"','g'))].map(m=>{const el=new Element();el.dataset[attr]=m[1];return el;});
   if(selector==='tr')return [...this.innerHTML.matchAll(/<tr>/g)].map(()=>new Element());return [];
  }
 }
 const nodes=new Map(ids.map(id=>{const el=new Element();el.id=id;return [id,el];})),requests=[],events={},scripts=[],intervals=new Map(),timeouts=new Map(),observers=[];let timer=0;
 nodes.get('feed-sort').value='rank';
 // Legacy interaction fixtures explicitly disable discovery thresholds. Threshold boundaries are tested separately.
 for(const id of ['feed-min-cap','feed-max-cap','feed-min-volume'])nodes.get(id).value='0';
 const sides=['buy','sell'].map(side=>{const el=new Element();el.dataset.side=side;return el;}),feeds=['trending','new','prebond','near'].map(feed=>{const el=new Element();el.dataset.feed=feed;return el;}),preview=new Element();
 const window=phantom?{phantom:{solana:{isPhantom:true}}}:{},document={hidden:false,getElementById:id=>{assert(nodes.has(id),id);return nodes.get(id);},querySelector:s=>s==='.swap-preview'?preview:new Element(),querySelectorAll:s=>s==='[data-side]'?sides:s==='[data-feed]'?feeds:[],addEventListener:(n,fn)=>events[n]=fn,createElement:tag=>Object.assign(new Element(),{tagName:tag}),head:{append:s=>scripts.push(s)}};
 const context={window,document,sessionStorage:{getItem:k=>saved[k]||null,setItem:(k,v)=>saved[k]=v},location:{search,origin:'https://example.test'},history:{replaceState(){}},navigator:{clipboard:{writeText:async()=>{}}},URL,URLSearchParams,Date:ClockDate,Intl,AbortController,AbortSignal,console,Blob,matchMedia:()=>({matches:false}),addEventListener:(n,fn)=>events[n]=fn,MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}},setTimeout:(fn,ms)=>{const id=++timer;timeouts.set(id,{fn,ms});return id;},clearTimeout:id=>timeouts.delete(id),setInterval:fn=>{const id=++timer;intervals.set(id,fn);return id;},clearInterval:id=>intervals.delete(id),fetch:(path,init)=>new Promise((resolve,reject)=>requests.push({path,init,resolve:(data,status=200)=>resolve(Response.json(data,{status})),reject}))};
 vm.runInNewContext(source,context);return {nodes,requests,events,scripts,window,sides,feeds,intervals,timeouts,observers,document,clock};
}
const flush=()=>new Promise(r=>setImmediate(r));
const market=(address=mint,extra={})=>({address,fetchedAt:at,market:{name:'Example <img onerror=bad()>',symbol:'X<svg>',priceUsd:1,marketCapUsd:null,fdvUsd:900,liquidityUsd:50,volume24hUsd:0,change24hPercent:-2,...extra},chain:{mintAuthority:null,freezeAuthority:null,supply:'100',slot:10},gaps:[]});
function pending(h,p){const r=h.requests.find(r=>!r.used&&r.path.startsWith(p));assert(r,'pending '+p);r.used=true;return r;}
async function ready(h){pending(h,'/api/terminal/status').resolve({signedIn:true,replayConfigured:true});pending(h,'/api/terminal/discovery').resolve({pools:[{address:pool,mint,name:'<img src=x>',symbol:'<img src=x>',pair:'<script>bad()</script>',priceUsd:1,volume24hUsd:0,liquidityUsd:10,change24h:-2,dex:'<svg>',launchpad:{completed:false,progressPct:50}}],fetchedAt:at});pending(h,'/api/market').resolve(market());await flush();}
async function select(h,address){h.nodes.get('token-input').value=address;h.nodes.get('token-search').onsubmit({preventDefault(){}});await flush();}
let h=harness();assert.equal(h.requests.length,3);assert.equal(h.scripts.length,0,'page load never loads or opens the wallet interface');await ready(h);
assert.match(h.nodes.get('feed-list').innerHTML,/&lt;img src=x&gt;/);assert.doesNotMatch(h.nodes.get('feed-list').innerHTML,/<script>/);assert.match(h.nodes.get('token-links').innerHTML,/\/control\?mint=/);assert.match(h.nodes.get('token-links').innerHTML,new RegExp('/markets\\?address='+mint+'#market-observatory'));assert.doesNotMatch(h.nodes.get('token-links').innerHTML,/href="\/research\//);assert.match(h.nodes.get('token-metrics').innerHTML,/FDV · cap unverified<\/span><strong class="">\$900/);
assert.equal(h.requests.filter(r=>r.path.includes('replay')).length,0,'no automatic wallet history retrieval');
// Market and chart results arriving after a new token selection are discarded.
await select(h,other);const old=pending(h,'/api/market');await select(h,mint);pending(h,'/api/market').resolve(market(mint,{pairAddress:pool}));await flush();old.resolve(market(other));await flush();assert.equal(h.nodes.get('token-address').textContent,mint);
h.nodes.get('chart-mode-snapshot').onclick();const oldChart=pending(h,'/api/terminal/chart');await select(h,other);assert.equal(oldChart.init.signal.aborted,true);pending(h,'/api/market').resolve(market(other));await flush();oldChart.resolve({pool,mint,candles:[{time:1,open:1,high:2,low:1,close:2}],fetchedAt:at});await flush();assert.doesNotMatch(h.nodes.get('market-chart').innerHTML,/<svg/);
// Swap loader stays opt-in and recovers in place without an external-site action.
const opening=h.nodes.get('swap-open').onclick();assert.equal(h.scripts.length,1);assert.equal(h.scripts[0].src,'https://plugin.jup.ag/plugin-v1.js');
h.scripts[0].onerror();await opening;assert.match(h.nodes.get('swap-status').textContent,/could not load/);assert(!h.nodes.has('jupiter-external'));assert.equal(h.nodes.get('swap-open').textContent,'Retry swap form');assert(!html.includes('href="https://jup.ag/'));
let init,closed=0;h.window.Jupiter={init:opts=>{init=opts;h.nodes.get('jupiter-plugin').innerHTML='<button>Connect wallet</button>';},close:()=>closed++};await h.nodes.get('swap-open').onclick();assert.equal(init.autoConnect,false);assert.equal(init.formProps.initialOutputMint,other);assert.equal(init.formProps.initialInputMint,sol);assert.equal(init.formProps.initialAmount,undefined);assert.equal(init.referralAccount,undefined);
assert.equal(h.nodes.get('jupiter-plugin').hidden,false);h.nodes.get('swap-close').onclick();const closedStatus=h.nodes.get('swap-status').textContent;init.onSuccess({txid:'5'.repeat(88)});assert.equal(h.nodes.get('swap-status').textContent,closedStatus,'old widget callback cannot report a new selection succeeded');assert.equal(closed,1);
// Selecting a coin closes the old swap immediately and requires an explicit new open.
h=harness();await ready(h);const swapInits=[];let selectionCloses=0;
h.window.Jupiter={init:options=>{swapInits.push(options);h.nodes.get('jupiter-plugin').innerHTML='<button>Connect wallet</button>';},close:()=>selectionCloses++};
await h.nodes.get('swap-open').onclick();h.nodes.get('token-input').value=other;h.nodes.get('token-search').onsubmit({preventDefault(){}});
assert.equal(h.nodes.get('token-address').textContent,other,'coin selection changes before the market request resolves');assert.equal(selectionCloses,1);assert.equal(h.nodes.get('jupiter-plugin').hidden,true);assert.equal(h.nodes.get('swap-open').hidden,false);assert.equal(swapInits.length,1,'coin selection must not automatically open another wallet form');
const switchedStatus=h.nodes.get('swap-status').textContent;assert.match(switchedStatus,/closed/i);assert.match(switchedStatus,/does not cancel|not cancel/i);
swapInits[0].onSuccess({txid:'5'.repeat(88)});swapInits[0].onSwapError({});swapInits[0].onFormUpdate({});assert.equal(h.nodes.get('swap-status').textContent,switchedStatus,'late old-form events cannot alter the new selection');
pending(h,'/api/market').resolve(market(other));await flush();await h.nodes.get('swap-open').onclick();assert.equal(swapInits.length,2);assert.equal(swapInits[1].formProps.initialOutputMint,other);assert.equal(swapInits[1].autoConnect,false);
// A late plugin script cannot reopen the old coin after selection during loading.
h=harness();await ready(h);const delayedOpening=h.nodes.get('swap-open').onclick();await select(h,other);let lateInitCalls=0;
h.window.Jupiter={init:()=>lateInitCalls++,close(){}};h.scripts[0].onload();await delayedOpening;
assert.equal(lateInitCalls,0);assert.equal(h.nodes.get('token-address').textContent,other);assert.equal(h.nodes.get('jupiter-plugin').hidden,true);assert.equal(h.nodes.get('swap-open').hidden,false);assert.equal(h.nodes.get('swap-open').disabled,false);
// Replay separates SOL and stablecoin prices and exports no made-up P&L.
h=harness();await ready(h);h.nodes.get('replay-wallet').value=wallet;const loading=h.nodes.get('replay-form').onsubmit({preventDefault(){}});const request=pending(h,'/api/terminal/replay');assert.equal(request.init.method,'POST');assert.equal(JSON.parse(request.init.body).wallet,wallet);
const trades=[{signature:'5'.repeat(88),time:100,side:'buy',tokenAmount:'250.000000001',quoteAmount:'1.000000001',quoteMint:sol,quoteSymbol:'SOL',executionPrice:1/250,networkFeeSol:.000005,walletPaidNetworkFee:true},{signature:'6'.repeat(88),time:200,side:'sell',tokenAmount:'200',quoteAmount:'2',quoteMint:other,quoteSymbol:'USDC',executionPrice:.01,networkFeeSol:null,walletPaidNetworkFee:null}];
request.resolve({wallet,mint,trades,scanned:2,unsupported:0,fetchedAt:at,coverage:'Limited provider coverage',pricing:'No complete P&L'});await loading;assert.equal(h.nodes.get('replay-result').hidden,false);assert.match(h.nodes.get('replay-rows').innerHTML,/250\.000000001/);assert.doesNotMatch(h.nodes.get('replay-rows').innerHTML,/USDC/);
h.nodes.get('replay-quote').value=other;h.nodes.get('replay-quote').onchange();assert.match(h.nodes.get('replay-rows').innerHTML,/USDC/);assert.doesNotMatch(h.nodes.get('replay-rows').innerHTML,/250\.000000001/);
h.events.pagehide();for(const id of ['replay-rows','replay-chart','replay-summary','replay-coverage','replay-pricing','replay-quote'])assert.equal(h.nodes.get(id).innerHTML,'');assert.equal(h.nodes.get('replay-wallet').value,'');assert.equal(h.nodes.get('replay-result').hidden,true);
// A response cannot repopulate replay after navigating away; sign-in failures remain explicit.
h=harness();await ready(h);h.nodes.get('replay-wallet').value=wallet;const denied=h.nodes.get('replay-form').onsubmit({preventDefault(){}});pending(h,'/api/terminal/replay').resolve({error:'Sign in to load wallet replay.'},401);await denied;assert.equal(h.nodes.get('replay-signin').hidden,false);
const late=h.nodes.get('replay-form').onsubmit({preventDefault(){}}),lateReq=pending(h,'/api/terminal/replay');h.events.pagehide();lateReq.resolve({wallet,mint,trades,scanned:2,unsupported:0,fetchedAt:at});await late;assert.equal(h.nodes.get('replay-result').hidden,true);assert.equal(h.nodes.get('replay-rows').innerHTML,'');
// Signing in must return to the chosen token, not silently switch back to PRLX.
h=harness();await ready(h);h.nodes.get('replay-wallet').value=wallet;await select(h,other);
pending(h,'/api/market').resolve(market(other,{priceUsd:0.0000000000123}));await flush();
const signIn=h.nodes.get('replay-signin').href||html.match(/id="replay-signin"[^>]*href="([^"]+)"/)[1];
assert.equal(new URL(signIn,'https://example.test').searchParams.get('return_to'),'/terminal?token='+other+'#wallet-replay');
assert(!signIn.includes(wallet),'wallet searches never enter the sign-in URL');
assert.match(h.nodes.get('token-metrics').innerHTML,/\$1\.230e-11/,'a positive tiny token price must not display as zero');
// Sell mode and rejection remain explicit; success is only a provider report with a valid explorer link.
let sellInit;h.window.Jupiter={init:o=>{sellInit=o;h.nodes.get('jupiter-plugin').innerHTML='<button>Connect wallet</button>';},close(){}};h.sides[1].onclick();await h.nodes.get('swap-open').onclick();
assert.equal(sellInit.formProps.initialInputMint,other);assert.equal(sellInit.formProps.initialOutputMint,sol);
sellInit.onSwapError({error:{message:'User rejected'}});assert.match(h.nodes.get('swap-status').textContent,/not confirmed/);assert(h.nodes.get('swap-status').classes.has('error'));
sellInit.onSuccess({txid:'javascript:invalid'});assert(!h.nodes.get('swap-status').innerHTML.includes('href'));
sellInit.onSuccess({txid:'5'.repeat(88)});assert.match(h.nodes.get('swap-status').textContent,/Jupiter reported/);assert.match(h.nodes.get('swap-status').innerHTML,/https:\/\/solscan.io\/tx\/555/);
// A loaded script without readiness evidence is not ready, but timeout must not remove a form in use.
h=harness();await ready(h);let slowInit,slowCloses=0;h.window.Jupiter={init:o=>slowInit=o,close(){slowCloses++;}};
const blank=h.nodes.get('swap-open').onclick();await flush();
assert.doesNotMatch(h.nodes.get('swap-status').textContent,/form ready/);assert.equal(h.nodes.get('swap-close').hidden,false);
const renderDeadline=[...h.timeouts.values()].find(t=>t.ms===20000);assert(renderDeadline);renderDeadline.fn();await blank;
assert.match(h.nodes.get('swap-status').textContent,/has not reported readiness/);assert.equal(h.nodes.get('jupiter-plugin').hidden,false);assert.equal(slowCloses,0);assert.equal(h.nodes.get('swap-open').hidden,true);
assert(h.requests.some(r=>r.path==='/api/terminal/diagnostic'&&JSON.parse(r.init.body).phase==='render-timeout'));
slowInit.onFormUpdate({});assert.match(h.nodes.get('swap-status').textContent,/form ready/);assert(!h.nodes.get('swap-status').classes.has('error'));
h.nodes.get('swap-close').onclick();
// Canceling during initialization cannot re-open an old form.
const canceled=h.nodes.get('swap-open').onclick();await flush();h.nodes.get('swap-close').onclick();await canceled;
assert.equal(h.nodes.get('jupiter-plugin').hidden,true);assert(![...h.timeouts.values()].some(t=>t.ms===20000));
const afterCancel=h.nodes.get('swap-status').textContent;slowInit.onScreenUpdate('Swap');assert.equal(h.nodes.get('swap-status').textContent,afterCancel);
// Readiness works across nested open shadow roots, including controls that appear after init.
h=harness();await ready(h);let shadow;
h.window.Jupiter={init(){const host=h.document.createElement('div'),nested=h.document.createElement('div');host.shadowRoot=h.document.createElement('shadow');shadow=h.document.createElement('shadow');nested.shadowRoot=shadow;host.shadowRoot.append(nested);h.nodes.get('jupiter-plugin').append(host);},close(){}};
await h.nodes.get('swap-open').onclick();assert.doesNotMatch(h.nodes.get('swap-status').textContent,/form ready/);
shadow.innerHTML='<button>Connect wallet</button>';for(const observer of h.observers)if(!observer.disconnected)observer.fn();
assert.match(h.nodes.get('swap-status').textContent,/form ready/);assert.equal(h.nodes.get('swap-close').textContent,'Close swap form');assert(![...h.timeouts.values()].some(t=>t.ms===20000));assert(h.observers.every(o=>o.disconnected));
// Official callbacks can arrive synchronously during init and must not overwrite a later receipt.
h=harness();await ready(h);let eventInit;h.window.Jupiter={init:o=>{eventInit=o;o.onScreenUpdate('Swap');},close(){}};
await h.nodes.get('swap-open').onclick();assert.match(h.nodes.get('swap-status').textContent,/form ready/);
eventInit.onSuccess({txid:'5'.repeat(88)});eventInit.onFormUpdate({});assert.match(h.nodes.get('swap-status').textContent,/Jupiter reported/);assert.match(h.nodes.get('swap-status').innerHTML,/solscan.io/);
// Mobile hand-off is a browser-open link, never a signing request, and preserves token/direction only.
h=harness();await ready(h);await select(h,other);pending(h,'/api/market').resolve(market(other));await flush();h.sides[1].onclick();
const mobileLink=new URL(h.nodes.get('phantom-open').href),destination=new URL(decodeURIComponent(mobileLink.pathname.slice('/ul/browse/'.length)));
assert.equal(mobileLink.origin,'https://phantom.com');assert.equal(destination.origin,'https://example.test');assert.equal(destination.pathname,'/terminal');assert.equal(destination.searchParams.get('token'),other);assert.equal(destination.searchParams.get('side'),'sell');assert.equal(destination.hash,'#trade-panel');assert.equal(mobileLink.searchParams.get('ref'),'https://example.test');assert(!mobileLink.href.includes(wallet));assert.equal(h.scripts.length,0);
h=harness({phantom:true,search:'?token='+other+'&side=sell'});assert.equal(h.nodes.get('phantom-open').hidden,true);assert.equal(h.nodes.get('phantom-manual').hidden,true);assert.match(h.nodes.get('phantom-help-text').textContent,/available in this browser/);assert.equal(h.sides[1].attrs['aria-pressed'],'true');
// Chart throttles expose a timed retry and do not trigger another provider request immediately.
h=harness();await ready(h);await select(h,other);pending(h,'/api/market').resolve(market(other,{pairAddress:pool}));await flush();
h.nodes.get('chart-mode-snapshot').onclick();
pending(h,'/api/terminal/chart').resolve({error:'Provider rate limit',retryAfterSeconds:120},429);await flush();
assert.equal(h.nodes.get('chart-retry').disabled,true);assert.match(h.nodes.get('chart-status').textContent,/Retry after/);
const requestCount=h.requests.length;h.nodes.get('chart-retry').onclick();assert.equal(h.requests.length,requestCount);
[...h.timeouts.values()].find(t=>t.ms===120000).fn();assert.equal(h.nodes.get('chart-retry').disabled,false);
h.nodes.get('chart-retry').onclick();assert.equal(h.requests.length,requestCount+1);
pending(h,'/api/terminal/chart').resolve({pool,mint:other,pair:'USDC / SOL',source:'CoinGecko',intervalMinutes:1,currency:'USD',candles:[{time:Math.floor(Date.now()/60000)*60,open:1,high:2,low:1,close:2}],fetchedAt:at,stale:true,retryAfterSeconds:60});await flush();
assert.match(h.nodes.get('chart-status').textContent,/Older snapshot/);assert.equal(h.nodes.get('chart-retry').disabled,true);
assert.match(h.nodes.get('chart-note').innerHTML,/CoinGecko/);
h.nodes.get('feed-refresh').onclick();pending(h,'/api/terminal/discovery').resolve({source:'CoinGecko',pools:[],fetchedAt:at});await flush();
assert.equal(h.nodes.get('feed-source').textContent,'Data by CoinGecko ↗');assert.equal(h.nodes.get('feed-source').href,'https://www.coingecko.com/en/api');
console.log('PASS: nested shadow form readiness; official callbacks and late readiness; non-destructive timeout; cancellation; mobile Phantom browser link and token/direction continuity; in-page retry; receipt handling; provider cooldown UI; replay privacy; exact amounts.');

// SolHandle input accepts a resolved wallet, discloses it even for empty histories,
// and ignores completion after the input changes.
h=harness();await ready(h);h.nodes.get('replay-wallet').value='@Parallax';
const handleLoad=h.nodes.get('replay-form').onsubmit({preventDefault(){}});
pending(h,'/api/terminal/replay').resolve({requestedWallet:'@Parallax',wallet,mint,identity:{status:'resolved',handle:'@parallax',checkedAt:at},trades:[],scanned:0,unsupported:0,fetchedAt:at});await handleLoad;
assert.equal(h.nodes.get('replay-identity').hidden,false);assert.match(h.nodes.get('replay-identity').innerHTML,/@parallax/);assert(h.nodes.get('replay-identity').innerHTML.includes(wallet));
const staleHandle=h.nodes.get('replay-form').onsubmit({preventDefault(){}}),staleHandleRequest=pending(h,'/api/terminal/replay');
h.nodes.get('replay-wallet').value='@changed';h.nodes.get('replay-wallet').listeners.input();
staleHandleRequest.resolve({requestedWallet:'@Parallax',wallet,mint,identity:{status:'resolved',handle:'@parallax',checkedAt:at},trades,scanned:2,unsupported:0,fetchedAt:at});await staleHandle;
assert.equal(h.nodes.get('replay-identity').hidden,true);assert.equal(h.nodes.get('replay-result').hidden,true);
console.log('PASS: handle resolution, address disclosure for empty replay, and stale handle response rejection.');

// Rapid duplicate reads share one transport, including repeated token searches.
h=harness();await select(h,mint);await select(h,mint);h.nodes.get('feed-refresh').onclick();h.nodes.get('feed-refresh').onclick();
assert.equal(h.requests.length,3,'duplicate reads do not start new requests');await ready(h);
assert.equal(h.nodes.get('feed-list').attrs['aria-busy'],'false');
// Honor server freshness and back off after failure, retaining dated results.
const tick=Date.now();h=harness({now:tick});
pending(h,'/api/terminal/status').resolve({marketProvider:'CoinGecko'});
pending(h,'/api/market').resolve(market());
pending(h,'/api/terminal/discovery').resolve({mode:'prebond',source:'CoinGecko',pools:[{mint,address:pool,symbol:'PRLX',name:'PARALLAX',pair:'PRLX / SOL',launchpad:{completed:false,progressPct:50}}],fetchedAt:new Date(tick).toISOString(),freshUntil:new Date(tick+120000).toISOString(),refreshAfterSeconds:120,cached:true});await flush();
const feedMarkup=h.nodes.get('feed-list').innerHTML,feedAt=h.nodes.get('feed-freshness').textContent,initialReads=h.requests.length;
assert.match(feedAt,/Cached/);
h.clock.now=tick+61000;for(const f of h.intervals.values())f();assert.equal(h.requests.length,initialReads,'no polling inside server freshness window');
h.document.hidden=true;h.clock.now=tick+121000;for(const f of h.intervals.values())f();assert.equal(h.requests.length,initialReads,'hidden tabs do not poll');
h.document.hidden=false;h.events.visibilitychange();assert.equal(h.requests.length,initialReads+1);assert.equal(h.nodes.get('feed-list').attrs['aria-busy'],'true');
pending(h,'/api/terminal/discovery').resolve({error:'Provider temporarily unavailable'},503);await flush();
assert.equal(h.nodes.get('feed-list').innerHTML,feedMarkup);assert.equal(h.nodes.get('feed-freshness').dataset.state,'stale');assert.match(h.nodes.get('feed-freshness').textContent,/Delayed data/);assert.match(h.nodes.get('feed-freshness').title,/Retrieved/);
assert.equal(h.nodes.get('feed-refresh').disabled,true);h.clock.now+=15000;for(const f of h.intervals.values())f();assert.equal(h.requests.length,initialReads+1,'outage does not cause a 15-second retry loop');
h.clock.now+=46000;for(const f of h.intervals.values())f();assert.equal(h.requests.length,initialReads+2,'failed request is cleared and can retry');
pending(h,'/api/terminal/discovery').resolve({source:'CoinGecko',mode:'prebond',pools:[],fetchedAt:new Date(h.clock.now).toISOString(),freshUntil:new Date(h.clock.now+120000).toISOString(),refreshAfterSeconds:120});await flush();assert.equal(h.nodes.get('feed-freshness').dataset.state,'ready');
// Late responses cannot populate a different discovery mode.
h=harness();const trendingRequest=pending(h,'/api/terminal/discovery');h.feeds[1].onclick();const newRequest=pending(h,'/api/terminal/discovery');
trendingRequest.resolve({mode:'trending',source:'CoinGecko',pools:[{mint,address:pool,symbol:'WRONG',name:'Old mode'}],fetchedAt:at});await flush();assert.doesNotMatch(h.nodes.get('feed-list').innerHTML,/WRONG/);
newRequest.resolve({mode:'new',source:'CoinGecko',pools:[],fetchedAt:at});await flush();assert.match(h.nodes.get('feed-status').textContent,/0 shown/);
// A refresh failure keeps only the matching chart and visibly marks it old.
h=harness({now:tick});await ready(h);await select(h,other);pending(h,'/api/market').resolve(market(other,{pairAddress:pool}));await flush();
h.nodes.get('chart-mode-snapshot').onclick();
pending(h,'/api/terminal/chart').resolve({pool,mint:other,pair:'USDC / SOL',source:'CoinGecko',candles:[{time:Math.floor(tick/1000)-900,open:1,high:2,low:.5,close:1.5}],fetchedAt:new Date(tick).toISOString(),freshUntil:new Date(tick+300000).toISOString()});await flush();
const chartMarkup=h.nodes.get('market-chart').innerHTML;assert.match(chartMarkup,/<svg/);assert.equal(h.nodes.get('chart-freshness').dataset.state,'ready');
h.clock.now=tick+301000;for(const f of h.intervals.values())f();assert.equal(h.nodes.get('chart-freshness').dataset.state,'stale','chart ages even without a request');
h.nodes.get('chart-retry').onclick();assert.equal(h.nodes.get('market-chart').innerHTML,chartMarkup);assert.equal(h.nodes.get('market-chart').attrs['aria-busy'],'true');
pending(h,'/api/terminal/chart').resolve({error:'Provider unavailable'},503);await flush();assert.equal(h.nodes.get('market-chart').innerHTML,chartMarkup);assert.match(h.nodes.get('chart-status').textContent,/Previous chart retained/);assert.equal(h.nodes.get('market-chart').attrs['aria-busy'],'false');
await select(h,mint);assert.doesNotMatch(h.nodes.get('market-chart').innerHTML,/<svg/);assert.equal(h.nodes.get('chart-freshness').textContent,'','changing token clears old chart freshness');
console.log('PASS: duplicate GET sharing; server-paced polling; hidden-tab pause/resume; outage backoff; feed mode isolation; retained and aging chart snapshots.');

// Feed clicks display the exact clicked pool before research finishes, without replacing cards.
const secondPool='9'.repeat(44),canonicalPool='7'.repeat(44);
h=harness();pending(h,'/api/terminal/status').resolve({signedIn:true,replayConfigured:true});pending(h,'/api/market').resolve(market());
pending(h,'/api/terminal/discovery').resolve({source:'CoinGecko',fetchedAt:at,pools:[
 {mint,address:pool,name:'PARALLAX',symbol:'PRLX',pair:'PRLX / SOL',priceUsd:1,launchpad:{completed:false,progressPct:50}},
 {mint:other,address:pool,name:'Example token',symbol:'EXAMPLE',pair:'EXAMPLE / SOL',priceUsd:9.87,marketCapUsd:9000,liquidityUsd:500,launchpad:{completed:false,progressPct:60}},
 {mint:other,address:secondPool,name:'Example token',symbol:'EXAMPLE',pair:'EXAMPLE / USDC',priceUsd:12.34,marketCapUsd:12000,liquidityUsd:700,launchpad:{completed:false,progressPct:75}}
]});await flush();
const feedList=h.nodes.get('feed-list'),cards=feedList.querySelectorAll('[data-mint]'),feedWrites=feedList.htmlWrites;feedList.scrollTop=245;
assert.equal(cards[2].dataset.pool,secondPool);cards[2].listeners.click();
assert.equal(h.nodes.get('token-name').textContent,'Example token');assert.equal(h.nodes.get('token-symbol').textContent,'$EXAMPLE');assert.match(h.nodes.get('token-metrics').innerHTML,/\$12\.34/);assert.doesNotMatch(h.nodes.get('token-metrics').innerHTML,/\$9\.87/);
assert.match(h.nodes.get('token-status').textContent,/Market feed snapshot/);assert.equal(h.window.ParallaxTerminal.getSelection().ready,false,'feed preview cannot enable saved research before full token validation');assert.equal(h.nodes.get('analytics-load').disabled,true);
assert.equal(feedList.htmlWrites,feedWrites);assert.equal(feedList.querySelectorAll('[data-mint]')[2],cards[2],'selected feed card remains the same DOM node');assert.equal(feedList.scrollTop,245);assert.equal(cards[2].attrs['aria-pressed'],'true');assert.equal(cards[0].attrs['aria-pressed'],'false');
const previewFrame=h.nodes.get('market-chart').children[0];assert(previewFrame);assert.equal(new URL(previewFrame.src).pathname,'/solana/'+secondPool);assert.equal(h.requests.filter(r=>r.path.startsWith('/api/terminal/chart')).length,0,'embedded charts do not also request snapshot data');
h.nodes.get('chart-mode-snapshot').onclick();assert.equal(h.nodes.get('market-chart').children.length,0,'snapshot mode removes the third-party frame');
const feedChart=pending(h,'/api/terminal/chart?pool='+secondPool);assert.equal(new URL(feedChart.path,'https://test.local').searchParams.get('mint'),other);
feedChart.resolve({pool:secondPool,mint:other,pair:'EXAMPLE / USDC',candles:[{time:1,open:12,high:13,low:11,close:12.34}],fetchedAt:at});await flush();assert.match(h.nodes.get('market-chart').innerHTML,/<svg/);assert.equal(h.window.ParallaxTerminal.getSelection().ready,false);
pending(h,'/api/market').resolve(market(other,{pairAddress:secondPool,name:'Verified example'}));await flush();
assert.equal(h.window.ParallaxTerminal.getSelection().ready,true);assert.equal(h.nodes.get('token-name').textContent,'Verified example');assert.equal(h.requests.filter(r=>r.path.startsWith('/api/terminal/chart?pool='+secondPool)).length,1,'matching final pool reuses the already requested chart');assert.equal(feedList.htmlWrites,feedWrites);

// A slower canonical-pool lookup must not replace a pool explicitly chosen in discovery.
cards[1].listeners.click();const previewChart=pending(h,'/api/terminal/chart?pool='+pool);
previewChart.resolve({pool,mint:other,pair:'EXAMPLE / SOL',candles:[{time:1,open:9,high:10,low:8,close:9.87}],fetchedAt:at});await flush();assert.match(h.nodes.get('market-chart').innerHTML,/<svg/);
const chosenChart=h.nodes.get('market-chart').innerHTML;
pending(h,'/api/market').resolve(market(other,{pairAddress:canonicalPool}));await flush();
assert.equal(h.nodes.get('market-chart').innerHTML,chosenChart);assert.equal(h.window.ParallaxTerminal.getSelection().pool,pool);
assert(!h.requests.some(r=>r.path.startsWith('/api/terminal/chart?pool='+canonicalPool)),'metadata lookup does not silently switch the explicitly selected pool');

// Rapid A -> B -> A aborts obsolete reads and does not reuse or delete an aborted A transport.
h=harness();const firstA=pending(h,'/api/market');await select(h,other);const requestB=pending(h,'/api/market');
assert.equal(firstA.init.signal.aborted,true);await select(h,mint);const currentA=pending(h,'/api/market');assert.equal(requestB.init.signal.aborted,true);assert.notEqual(currentA,firstA);assert.equal(currentA.init.signal.aborted,false);
firstA.resolve(market(mint,{name:'Obsolete A'}));requestB.resolve(market(other,{name:'Obsolete B'}));await flush();
assert.equal(h.window.ParallaxTerminal.getSelection().ready,false);assert.equal(h.nodes.get('token-address').textContent,mint);assert.doesNotMatch(h.nodes.get('token-name').textContent,/Obsolete/);
const beforeDuplicate=h.requests.length;await select(h,mint);assert.equal(h.requests.length,beforeDuplicate,'old completion must not delete the new A read');assert.equal(currentA.init.signal.aborted,false,'duplicate current selection shares its transport');
currentA.resolve(market(mint,{name:'Current A'}));await flush();assert.equal(h.nodes.get('token-name').textContent,'Current A');assert.equal(h.window.ParallaxTerminal.getSelection().ready,true);

// Selection cancels obsolete market research, while feed reads and POST actions stay independent.
h=harness();await ready(h);h.nodes.get('replay-wallet').value=wallet;h.nodes.get('replay-form').onsubmit({preventDefault(){}});const replayPost=pending(h,'/api/terminal/replay');
h.nodes.get('analytics-load').onclick();const obsoleteAnalytics=pending(h,'/api/analytics');h.nodes.get('feed-refresh').onclick();const independentFeed=pending(h,'/api/terminal/discovery');
await select(h,other);const newMarket=pending(h,'/api/market');assert.equal(obsoleteAnalytics.init.signal.aborted,true);assert.equal(independentFeed.init.signal.aborted,false);assert.equal(replayPost.init.signal.aborted,false);
h.events.pagehide();assert.equal(independentFeed.init.signal.aborted,true);assert.equal(newMarket.init.signal.aborted,true);assert.equal(replayPost.init.signal.aborted,false,'page cleanup does not cancel a POST action');
console.log('PASS: immediate exact-pool preview; feed card identity and scroll stability; research readiness separation; canonical-pool chart isolation; obsolete GET cancellation and A/B/A races; POST independence; coin changes during open and loading swaps.');

// The default interactive chart uses a fixed provider origin and the selected pool only.
h=harness();await ready(h);assert.equal(h.nodes.get('chart-mode-dex').disabled,true);
await select(h,other);pending(h,'/api/market').resolve(market(other,{pairAddress:pool,symbol:'USDC'}));await flush();
const dexRegion=h.nodes.get('market-chart'),dexFrame=dexRegion.children[0],dexUrl=new URL(dexFrame.src);
assert.equal(dexUrl.origin,'https://dexscreener.com');assert.equal(dexUrl.pathname,'/solana/'+pool);assert.equal(dexUrl.searchParams.get('embed'),'1');assert.equal(dexUrl.searchParams.get('theme'),'dark');assert.equal(dexUrl.searchParams.get('trades'),'0');assert.equal(dexUrl.searchParams.get('info'),'0');
assert.equal(dexFrame.title,'DEX Screener chart for USDC');assert.equal(dexFrame.referrerPolicy,'no-referrer');assert.equal(dexFrame.attrs.sandbox,'allow-scripts allow-same-origin allow-popups');assert(!dexFrame.attrs.sandbox.includes('allow-top-navigation'));assert(!dexFrame.attrs.sandbox.includes('allow-forms'));
assert.equal(h.nodes.get('chart-mode-dex').attrs['aria-pressed'],'true');assert.equal(h.nodes.get('chart-mode-snapshot').attrs['aria-pressed'],'false');assert.equal(h.nodes.get('chart-external').hidden,false);assert.equal(h.nodes.get('chart-external').href,'https://dexscreener.com/solana/'+pool);
assert.equal(h.requests.filter(r=>r.path.startsWith('/api/terminal/chart')).length,0,'DEX Screener is not accompanied by redundant candle requests');assert.equal(h.scripts.length,0,'displaying a chart never opens a wallet form');

// Refreshing metadata for the same selected pool preserves the embedded chart instance.
h.nodes.get('token-refresh').onclick();assert.equal(dexRegion.children[0],dexFrame);
pending(h,'/api/market').resolve(market(other,{pairAddress:pool,symbol:'USDC'}));await flush();assert.equal(dexRegion.children[0],dexFrame);
[...h.timeouts.values()].find(t=>t.ms===15000).fn();assert.match(h.nodes.get('chart-status').textContent,/Chart \+ trades or Open chart/);assert.equal(dexRegion.children[0],dexFrame,'a slow iframe is left available to finish');
dexFrame.onload();assert.equal(dexRegion.attrs['aria-busy'],'false');assert.doesNotMatch(h.nodes.get('chart-status').textContent,/ready|verified|live/i,'load events do not verify third-party chart readiness');assert.match(h.nodes.get('chart-note').textContent,/If it does not appear/);

// An explicit reload replaces only the chart; retired iframe callbacks are ignored.
h.nodes.get('chart-retry').onclick();const reloadedFrame=dexRegion.children[0];assert.notEqual(reloadedFrame,dexFrame);const reloadStatus=h.nodes.get('chart-status').textContent;
dexFrame.onload();dexFrame.onerror();assert.equal(h.nodes.get('chart-status').textContent,reloadStatus);assert.equal(dexRegion.attrs['aria-busy'],'true');
reloadedFrame.onerror();assert.match(h.nodes.get('chart-status').textContent,/could not load/);assert.match(h.nodes.get('chart-status').textContent,/Chart \+ trades or Open chart/);assert.equal(h.nodes.get('chart-mode-snapshot').disabled,false);

// Snapshot fallback is opt-in; leaving it aborts its read and rejects late snapshot results.
h.nodes.get('chart-mode-snapshot').onclick();const abandonedSnapshot=pending(h,'/api/terminal/chart');assert.equal(dexRegion.children.length,0);assert.equal(h.nodes.get('chart-mode-snapshot').attrs['aria-pressed'],'true');
const snapshotStatus=h.nodes.get('chart-status').textContent;reloadedFrame.onload();assert.equal(h.nodes.get('chart-status').textContent,snapshotStatus);
h.nodes.get('chart-mode-dex').onclick();const restoredFrame=dexRegion.children[0];assert.equal(abandonedSnapshot.init.signal.aborted,true);assert.equal(h.nodes.get('chart-freshness').textContent,'');
abandonedSnapshot.resolve({pool,mint:other,pair:'OLD SNAPSHOT',candles:[{time:1,open:1,high:2,low:1,close:2}],fetchedAt:at});await flush();assert.equal(dexRegion.children[0],restoredFrame);assert.doesNotMatch(dexRegion.innerHTML,/<svg/);assert.doesNotMatch(h.nodes.get('chart-status').textContent,/OLD SNAPSHOT/);

// A new selection removes the prior frame immediately; late loads cannot revive it.
await select(h,mint);const selectedFrame=dexRegion.children[0];assert.notEqual(selectedFrame,restoredFrame);const selectedChartStatus=h.nodes.get('chart-status').textContent;
restoredFrame.onload();restoredFrame.onerror();assert.equal(h.nodes.get('chart-status').textContent,selectedChartStatus);
pending(h,'/api/market').resolve(market(mint,{pairAddress:canonicalPool}));await flush();assert.equal(new URL(dexRegion.children[0].src).pathname,'/solana/'+canonicalPool);assert.equal(h.nodes.get('chart-external').href,'https://dexscreener.com/solana/'+canonicalPool);
selectedFrame.onload();assert.doesNotMatch(h.nodes.get('chart-status').textContent,/Pool 6iep/);
h.events.pagehide();assert.equal(dexRegion.children.length,0,'page cleanup releases the external chart');assert.equal(h.nodes.get('chart-external').hidden,true);assert.equal(h.nodes.get('chart-mode-dex').disabled,true);

// Invalid provider identifiers never become iframe URLs or external links.
h=harness();await ready(h);await select(h,other);pending(h,'/api/market').resolve(market(other,{pairAddress:'https://untrusted.example/'}));await flush();
assert.equal(new URL(h.nodes.get('market-chart').children[0].src).pathname,'/solana/'+other);assert.equal(h.nodes.get('chart-external').href,'https://dexscreener.com/solana/'+other);assert.equal(h.nodes.get('chart-mode-dex').disabled,true);
console.log('PASS: explicit DEX Screener embed, fixed-origin pool URL, restricted iframe, no duplicate data requests, stable metadata refresh, honest loading/fallback states, retired callbacks, explicit snapshot fallback, and cleanup.');

// Native chart starts independently of chain evidence and survives refreshes.
h=harness({search:''});assert.equal(h.window.ParallaxTerminal.getChart().mode,'snapshot');
const resolving=pending(h,'/api/terminal/pool');resolving.resolve({mint,pool});await flush();
const early=pending(h,'/api/terminal/chart');assert.equal(h.window.ParallaxTerminal.getSelection().ready,false);
const candleTime=Math.floor(Date.now()/60000)*60;
early.resolve({pool,mint,pair:'PRLX / SOL',source:'CoinGecko',intervalMinutes:1,currency:'USD',chartCurrency:'usd',candles:[{time:candleTime,open:1,high:2,low:1,close:2}],fetchedAt:at,refreshAfterSeconds:30});await flush();
assert.match(h.nodes.get('market-chart').innerHTML,/<svg/);assert.equal(h.window.ParallaxTerminal.getChart().loading,false);assert(h.window.ParallaxTerminal.getChart().nextRefreshAt>h.clock.now);
pending(h,'/api/market').resolve(market(mint,{pairAddress:pool}));await flush();
const retained=h.nodes.get('market-chart').innerHTML;h.nodes.get('token-refresh').onclick();assert.equal(h.nodes.get('market-chart').innerHTML,retained,'refresh does not blank a usable native chart');
pending(h,'/api/terminal/chart').resolve({error:'Slow provider'},503);await flush();assert.equal(h.nodes.get('market-chart').innerHTML,retained);assert.match(h.nodes.get('chart-status').textContent,/Previous chart retained/);
h=harness({search:'',saved:{'parallax:terminal-market':other}});assert.equal(h.window.ParallaxTerminal.getSelection().mint,other);
pending(h,'/api/terminal/pool').resolve({mint:other,pool});await flush();const slow=pending(h,'/api/terminal/chart');const fallback=[...h.timeouts.values()].find(t=>t.ms===6000);fallback.fn();assert.match(h.nodes.get('market-chart').children[0].src,/dexscreener/);assert.equal(h.nodes.get('chart-external').hidden,false);
await select(h,mint);assert.equal(slow.init.signal.aborted,true);slow.resolve({pool,mint:other,candles:[{time:candleTime,open:1,high:2,low:1,close:2}]});await flush();assert.doesNotMatch(h.nodes.get('market-chart').innerHTML,/<svg/);
console.log('PASS: native default, market restoration, pool lookup before research, retained chart on refresh/failure, timed alternative chart, and late response rejection.');

// Genuine pre-bond rows exclude unknown/completed curves and preserve DOM/focus while quotes update.
h=harness();const prebondRequest=pending(h,'/api/terminal/discovery');assert.equal(prebondRequest.path,'/api/terminal/discovery?mode=prebond');
pending(h,'/api/terminal/status').resolve({signedIn:true,replayConfigured:true});pending(h,'/api/market').resolve(market(mint,{pairAddress:pool}));
h.nodes.get('feed-sort').value='momentum';
const curves=[
 {mint,address:pool,name:'Near curve',symbol:'NEAR',launchpad:{completed:false,progressPct:80},volume24hUsd:200,volume5mUsd:200,buyers5m:2,buys5m:300,marketCapUsd:1000,createdAt:at},
 {mint:other,address:secondPool,name:'Early curve',symbol:'EARLY',launchpad:{completed:false,progressPct:20},volume24hUsd:50,volume5mUsd:50,buyers5m:null,buys5m:null,marketCapUsd:null,createdAt:at},
 {mint:sol,address:'8'.repeat(44),name:'Unknown curve',symbol:'UNKNOWN',launchpad:{completed:null,progressPct:null},volume5mUsd:9000},
 {mint:wallet,address:'6'.repeat(44),name:'Already bonded',symbol:'BONDED',launchpad:{completed:true,progressPct:100},volume5mUsd:10000}
];
const curveResponse=pools=>({mode:'prebond',source:'CoinGecko',pools,fetchedAt:at,refreshAfterSeconds:120,scanned:4,partial:false,coverage:'Indexed sample'});
prebondRequest.resolve(curveResponse(curves));await flush();
const curveList=h.nodes.get('feed-list'),curveNodes=curveList.querySelectorAll('[data-mint]');assert.equal(curveNodes.length,2);assert.equal(curveNodes[0].dataset.mint,mint);assert.doesNotMatch(curveList.innerHTML,/UNKNOWN|BONDED/);assert.match(curveNodes[0].innerHTML,/HOLDERS<\/span><strong data-holder-mint=/,'holder counts load from token metadata, not buyers');assert.match(curveNodes[1].innerHTML,/VALUATION<\/span><strong>—/,'unknown cap does not become zero');
curveList.scrollTop=120;curveList.listeners.pointerenter();const beforeRows=curveList.htmlWrites;h.nodes.get('feed-refresh').onclick();
pending(h,'/api/terminal/discovery').resolve(curveResponse([curves[0],{...curves[1],volume5mUsd:900,volume24hUsd:900}]));await flush();
assert.equal(curveList.querySelectorAll('[data-mint]')[0],curveNodes[0],'hovered feed does not reorder underneath the pointer');assert.equal(curveList.htmlWrites,beforeRows,'poll updates keep existing row nodes');assert.equal(curveList.scrollTop,120);assert.match(curveNodes[1].innerHTML,/\$900/);
curveList.listeners.pointerleave();assert.equal(curveList.querySelectorAll('[data-mint]')[0],curveNodes[1],'rank updates after pointer leaves');
const beforeNear=h.requests.length;h.feeds.find(b=>b.dataset.feed==='near').onclick();assert.equal(h.requests.length,beforeNear,'near bond reuses the pre-bond snapshot');assert.equal(curveList.querySelectorAll('[data-mint]').length,1);assert.equal(curveList.querySelectorAll('[data-mint]')[0].dataset.mint,mint);assert.match(h.nodes.get('feed-status').textContent,/1 shown/);
h.feeds.find(b=>b.dataset.feed==='prebond').onclick();assert.equal(h.requests.length,beforeNear);assert.equal(curveList.querySelectorAll('[data-mint]').length,2);
const previousMetrics=h.nodes.get('token-metrics').innerHTML;h.nodes.get('token-refresh').onclick();assert.equal(h.nodes.get('token-metrics').innerHTML,previousMetrics,'metadata refresh retains visible values');
console.log('PASS: strict pre-bond classification, missing-value display, distinct buyer labels, keyed row refresh, pointer-safe ranking, cached Near bond switch, and stable token metrics.');

// The production defaults select active small caps, including explicitly labeled FDV fallbacks.
h=harness();for(const [id,value] of [['feed-min-cap','7000'],['feed-max-cap','100000'],['feed-min-volume','10000']])h.nodes.get(id).value=value;
const thresholdRows=[
 {mint,address:pool,name:'Boundary',symbol:'PASS',marketCapUsd:7000,fdvUsd:7000,volume24hUsd:10000,launchpad:{completed:false,progressPct:70}},
 {mint:other,address:secondPool,name:'Too small',symbol:'SMALL',marketCapUsd:6999,volume24hUsd:20000,launchpad:{completed:false,progressPct:30}},
 {mint:wallet,address:'6'.repeat(44),name:'Too quiet',symbol:'QUIET',marketCapUsd:8000,volume24hUsd:9999,launchpad:{completed:false,progressPct:20}},
 {mint:sol,address:'8'.repeat(44),name:'Estimated valuation',symbol:'FDVPASS',marketCapUsd:null,fdvUsd:100000,liquidityUsd:5000,volume24hUsd:10000,launchpad:{completed:false,progressPct:90}},
 {mint:'9'.repeat(44),address:'7'.repeat(44),name:'Missing',symbol:'MISSING',marketCapUsd:null,fdvUsd:null,volume24hUsd:20000,launchpad:{completed:false,progressPct:50}}
];
pending(h,'/api/terminal/discovery').resolve({mode:'prebond',pools:thresholdRows,fetchedAt:at});await flush();
assert.equal(h.nodes.get('feed-list').querySelectorAll('[data-mint]').length,2);
assert.match(h.nodes.get('feed-list').innerHTML,/FDVPASS/);assert.match(h.nodes.get('feed-list').innerHTML,/>FDV<\/span>/);assert.match(h.nodes.get('feed-list').innerHTML,/CURVE LIQ/);assert.doesNotMatch(h.nodes.get('feed-list').innerHTML,/>SMALL<|>QUIET<|>MISSING</);
h.nodes.get('feed-min-cap').value='0';h.nodes.get('feed-max-cap').value='0';h.nodes.get('feed-min-volume').value='0';h.nodes.get('feed-min-cap').listeners.input();assert.equal(h.nodes.get('feed-list').querySelectorAll('[data-mint]').length,5);
console.log('PASS: inclusive $7K valuation / $10K 24h volume boundaries, $100K upper limit, labeled FDV fallback, unknown-value exclusion and explicit filter reset.');

// Auto-expand real pages, deduplicate repeated pools and preserve the oldest timestamp.
h=harness();
const earlier=new Date(Date.parse(at)-600000).toISOString();
pending(h,'/api/terminal/discovery').resolve({mode:'prebond',page:1,hasMore:true,pools:[thresholdRows[0]],fetchedAt:at});await flush();
pending(h,'/api/terminal/discovery?mode=prebond&page=2').resolve({mode:'prebond',page:2,hasMore:true,pools:[thresholdRows[0],thresholdRows[1]],fetchedAt:earlier});await flush();
pending(h,'/api/terminal/discovery?mode=prebond&page=3').resolve({mode:'prebond',page:3,hasMore:false,pools:[thresholdRows[2]],fetchedAt:at});await flush();
assert.equal(h.nodes.get('feed-list').querySelectorAll('[data-mint]').length,3);
assert.equal(h.nodes.get('feed-more').hidden,true);assert.match(h.nodes.get('feed-status').textContent,/3 shown · 3 loaded/);
assert.match(h.nodes.get('feed-freshness').textContent,/10m ago/);
h=harness();pending(h,'/api/terminal/discovery').resolve({mode:'prebond',page:1,hasMore:true,pools:[thresholdRows[0]],fetchedAt:at});await flush();
const obsoletePage=pending(h,'/api/terminal/discovery?mode=prebond&page=2');h.feeds.find(b=>b.dataset.feed==='trending').onclick();
obsoletePage.resolve({mode:'prebond',page:2,hasMore:false,pools:[thresholdRows[1]],fetchedAt:at});await flush();
pending(h,'/api/terminal/discovery?mode=trending').resolve({mode:'trending',page:1,hasMore:false,pools:[thresholdRows[2]],fetchedAt:at});await flush();
assert.equal(h.nodes.get('feed-list').querySelectorAll('[data-mint]').length,1);assert.match(h.nodes.get('feed-list').innerHTML,/QUIET/);assert.doesNotMatch(h.nodes.get('feed-list').innerHTML,/SMALL/);
assert.match(html,/id="feed-max-cap"[^>]*value="0"/,'production has no hidden upper valuation limit');
console.log('PASS: automatic multi-page discovery, duplicate suppression, truthful aggregate freshness and obsolete-page rejection after a feed switch.');

// A partial refresh must not erase a recent valuation for the exact same pool.
h=harness();await ready(h);
h.window.ParallaxTerminal.applyMarketView({mint,pool,marketCapUsd:12345,fdvUsd:null,source:'Fixture',fetchedAt:at});
assert.match(h.nodes.get('token-metrics').innerHTML,/12.35K/);
h.window.ParallaxTerminal.applyMarketView({mint,pool,marketCapUsd:null,fdvUsd:null,source:'Fixture',fetchedAt:at});
assert.match(h.nodes.get('token-metrics').innerHTML,/last available/);assert.match(h.nodes.get('token-metrics').innerHTML,/12.35K/);
h.clock.now+=900001;
h.window.ParallaxTerminal.applyMarketView({mint,pool,marketCapUsd:null,fdvUsd:null,source:'Fixture',fetchedAt:at});
assert.match(h.nodes.get('token-metrics').innerHTML,/Not indexed/);assert.doesNotMatch(h.nodes.get('token-metrics').innerHTML,/12.35K/);
h.window.ParallaxTerminal.applyMarketView({mint,pool,marketCapUsd:null,fdvUsd:15000,source:'Fixture',fetchedAt:at});
assert.match(h.nodes.get('token-metrics').innerHTML,/FDV · cap unverified/);assert.doesNotMatch(h.nodes.get('token-metrics').innerHTML,/last available/);
await select(h,other);pending(h,'/api/market').resolve(market(other,{marketCapUsd:null,fdvUsd:null}));await flush();
assert.match(h.nodes.get('token-metrics').innerHTML,/Not indexed/);assert.doesNotMatch(h.nodes.get('token-metrics').innerHTML,/15.00K/);
console.log('PASS: missing valuation retention is labeled, expires, preserves FDV distinction, and clears on token changes.');
