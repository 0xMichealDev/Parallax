(()=>{'use strict';
const $=id=>document.getElementById(id),SOL='So11111111111111111111111111111111111111112',PRLX='8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump';
const valid=v=>typeof v==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v),sig=v=>typeof v==='string'&&/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(v);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numeric=n=>typeof n==='number'&&Number.isFinite(n),usd=(n,compact=false)=>numeric(n)?n!==0&&Math.abs(n)<1e-8?(n<0?'-$':'$')+Math.abs(n).toExponential(3):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:compact?'compact':'standard',maximumFractionDigits:compact?2:n>=1?2:9}).format(n):'Unavailable';
const fmt=n=>numeric(n)?new Intl.NumberFormat('en-US',{maximumSignificantDigits:7}).format(n):'Unavailable',percent=n=>numeric(n)?(n>0?'+':'')+n.toFixed(2)+'%':'—',direction=n=>numeric(n)?n<0?'down':'up':'';
const time=n=>new Date(n).toLocaleString(),short=a=>a.slice(0,5)+'…'+a.slice(-5),link=(label,url)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
const status=(id,text,error=false)=>{$(id).textContent=text;$(id).classList.toggle('error',error);};
let tokenInfo=null,lastRenderedMarket=null;
let deskOrder=null,chartInterval='1',chartCurrency='usd',chartLoading=false,chartNextAt=0,chartFallbackTimer=null;
let mode='prebond',feed=[],feedSeq=0,feedLoading=false,feedNextRefreshAt=0,feedData=null,feedFailed=false,mint='',snapshot=null,selectionPreview=null,selectedPool='',selectionSeq=0,replaySeq=0,replay=null,replayRows=[],step=0,playTimer=null,swapSide='buy',swapActive=false,swapLoading=false,pluginPromise=null,swapGeneration=0,swapRenderCancel=null,chartContext=null,chartData=null,chartFailed=false,chartRequestSeq=0,chartRetryTimer=null,chartMode='snapshot',chartFrame=null,chartEmbedTimer=null,feedRetryAt=0,diagnosticsSent=0,alive=true,feedHover=false,feedFocus=false;
let feedPaging=false;
const feedCache=new Map(),feedRows=new Map(),feedSourceMode=value=>value==='near'?'prebond':value;
const readRequests=new Map();
function api(path,body){
 // Share only concurrent reads. Wallet actions and other POSTs always remain separate.
 if(!body&&readRequests.has(path))return readRequests.get(path).task;
 const controller=body?null:new AbortController(),timeout=AbortSignal.timeout(25000);
 const task=(async()=>{const r=await fetch(path,{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),signal:controller?AbortSignal.any([controller.signal,timeout]):timeout});let d;try{d=await r.json();}catch{throw Error('The service returned an unreadable response. Please retry.');}if(!r.ok){const e=Error(d.error||'Request failed. Please retry.');e.status=r.status;e.retryAfterSeconds=Number(d.retryAfterSeconds)||0;throw e;}return d;})();
 if(!body){const entry={task,controller};readRequests.set(path,entry);const clear=()=>{if(readRequests.get(path)===entry)readRequests.delete(path);};task.then(clear,clear);}return task;
}
function cancelReads(matches){for(const [path,entry] of readRequests){if(matches(path)){readRequests.delete(path);entry.controller.abort();}}}
function freshness(id,data,failed=false){
 const node=$(id);if(!data){node.textContent='';node.dataset.state='empty';return;}
 const observed=Date.parse(data.fetchedAt),expires=Date.parse(data.freshUntil),age=Number.isFinite(observed)?Math.max(0,Math.floor((Date.now()-observed)/1000)):null;
 const old=failed||data.stale||Number.isFinite(expires)&&Date.now()>=expires;
 node.dataset.state=old?'stale':'ready';
 const ageText=age===null?'time unavailable':age<60?'just now':age<3600?Math.floor(age/60)+'m ago':Math.floor(age/3600)+'h ago';
 node.textContent=(old?'Delayed data':data.cached?'Cached':'Updated')+' · '+ageText;
 node.title=(age!==null?'Retrieved '+time(observed)+'. ':'')+(old?'The latest refresh is unavailable or this snapshot has expired.':'Provider snapshots may lag market activity.');
}
function refreshDataStates(){freshness('feed-freshness',feedData,feedFailed);freshness('chart-freshness',chartData,chartFailed);$('feed-refresh').disabled=feedLoading||Date.now()<feedRetryAt;$('feed-list').setAttribute('aria-busy',String(feedLoading));}
const compact=n=>numeric(n)?usd(n,true):'—';
function poolAge(value){const ms=Date.now()-Date.parse(value);if(!Number.isFinite(ms)||ms<0)return '—';const minutes=Math.floor(ms/60000);return minutes<1?'<1m':minutes<60?minutes+'m':minutes<1440?Math.floor(minutes/60)+'h':Math.floor(minutes/1440)+'d';}
function isPrebond(p){return p.launchpad?.completed===false;}
function bondProgress(p){const value=p.launchpad?.progressPct;return numeric(value)&&value>=0&&value<=100?value:null;}
function marketRowContent(p){
 const progress=bondProgress(p),prebond=isPrebond(p),completed=p.launchpad?.completed===true,cap=valuation(p);
 const image=typeof p.imageUrl==='string'&&/^https:\/\//.test(p.imageUrl)&&p.imageUrl.length<2048?p.imageUrl:null;
 const token=p.symbol||'TOKEN',age=poolAge(p.createdAt);
 return `<span class="market-row-head"><span class="market-avatar" data-project-mint="${esc(p.mint)}">${image?`<img src="${esc(image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}<span>${esc(token.slice(0,2).toUpperCase())}</span></span><span class="market-name"><span class="market-symbol"><strong>${esc(token)}</strong><span class="market-age" title="Pool age; this may differ from token age">${esc(age)}</span></span><span class="market-subtitle">${esc(p.name||p.pair||short(p.mint))}</span></span><span class="market-change ${direction(p.change5m)}">${percent(p.change5m)}<small>5m</small></span></span><span class="market-stats"><span class="market-stat"><span title="FDV uses total supply and is not a verified circulating market cap">${cap.label}</span><strong>${compact(cap.value)}</strong></span><span class="market-stat"><span>VOL 24h</span><strong>${compact(p.volume24hUsd)}</strong></span><span class="market-stat"><span>HOLDERS</span><strong data-holder-mint="${esc(p.mint)}">Loading…</strong></span><span class="market-stat"><span>${prebond?'CURVE LIQ':'LIQUIDITY'}</span><strong title="Provider-reported pool or curve reserve value; not a promise of exit liquidity">${compact(p.liquidityUsd)}</strong></span></span><span class="market-row-foot"><span class="market-stage ${prebond?'prebond':completed?'bonded':'indexed'}">${prebond?'Pre-bond':completed?'Bonded':esc(p.dex||'Indexed pool')}</span><span class="market-address">${esc(short(p.mint))}</span>${prebond?`<span class="market-progress-label">${progress===null?'Curve —':progress.toFixed(1)+'% bonded'}</span>`:`<span class="market-liquidity">LIQ ${compact(p.liquidityUsd)}</span>`}</span>${prebond?`<span class="market-bond ${progress===null?'unknown':''}" role="${progress===null?'presentation':'progressbar'}"${progress===null?'':` aria-label="Bonding progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"`}><span style="width:${progress===null?0:progress}%"></span></span>`:''}`;
}
function valuation(p){return numeric(p.marketCapUsd)&&p.marketCapUsd>=0?{value:p.marketCapUsd,label:'MCAP'}:numeric(p.fdvUsd)&&p.fdvUsd>=0?{value:p.fdvUsd,label:'FDV'}:{value:null,label:'VALUATION'};}
function discoveryLimits(){const read=(id,fallback)=>{const value=$(id)?.value;return value===''||value===undefined?fallback:Math.max(0,Number(value)||0);};return {min:read('feed-min-cap',7000),max:read('feed-max-cap',0),volume:read('feed-min-volume',10000)};}
function matchesLimits(p,limits){const cap=valuation(p).value;return (!(limits.min||limits.max)||cap!==null&&cap>=limits.min&&(!limits.max||cap<=limits.max))&&(!limits.volume||numeric(p.volume24hUsd)&&p.volume24hUsd>=limits.volume);}
function renderFeed(){
 const needle=$('feed-filter').value.trim().toLowerCase(),sort=$('feed-sort').value,limits=discoveryLimits();
 const summary=$('feed-filter-summary');if(summary)summary.textContent=(limits.min?compact(limits.min):'Any')+'–'+(limits.max?compact(limits.max):'no cap')+' · '+compact(limits.volume)+'+ vol 24h';
 let rows=feed.filter(p=>matchesLimits(p,limits)&&(p.name+' '+p.symbol+' '+p.mint).toLowerCase().includes(needle)&&(!['prebond','near'].includes(mode)||isPrebond(p))&&(mode!=='near'||bondProgress(p)>=70));
 const desc=(a,b,key)=>(numeric(b[key])?b[key]:-Infinity)-(numeric(a[key])?a[key]:-Infinity);
 if(sort==='cap-low'||sort==='cap-high')rows.sort((a,b)=>sort==='cap-low'?(valuation(a).value??Infinity)-(valuation(b).value??Infinity):(valuation(b).value??-Infinity)-(valuation(a).value??-Infinity));
 if(sort==='momentum')rows.sort((a,b)=>desc(a,b,'volume5mUsd')||desc(a,b,'buyers5m')||desc(a,b,'change5m'));
 if(sort==='newest')rows.sort((a,b)=>(Date.parse(b.createdAt)||0)-(Date.parse(a.createdAt)||0));
 if(sort==='progress'||mode==='near'&&sort==='rank')rows.sort((a,b)=>(bondProgress(b)??-1)-(bondProgress(a)??-1));
 if(sort==='volume')rows.sort((a,b)=>desc(a,b,'volume24hUsd'));if(sort==='liquidity')rows.sort((a,b)=>desc(a,b,'liquidityUsd'));
 const list=$('feed-list'),scroll=list.scrollTop,existing=[...list.querySelectorAll('[data-mint]')],order=new Map(existing.map((node,index)=>[node.dataset.pool+':'+node.dataset.mint,index]));
 // A background quote update must not move the row underneath a pointer or keyboard focus.
 if(feedHover||feedFocus)rows.sort((a,b)=>(order.get(a.address+':'+a.mint)??Infinity)-(order.get(b.address+':'+b.mint)??Infinity));
 const wanted=new Set(rows.map(p=>p.address+':'+p.mint));for(const [key,node] of feedRows){if(!wanted.has(key)){node.remove();feedRows.delete(key);}}
 if(!rows.length){feedRows.clear();list.innerHTML='<div class="market-empty"><span>⌁</span><strong>'+esc(needle?'No matching markets':mode==='near'?'No near-bond curves match your filters':mode==='prebond'?'No pre-bond markets match your filters':'No indexed markets in this sample')+'</strong><p>'+esc(needle?'Try a symbol, name or contract.':mode==='prebond'||mode==='near'?'Try widening valuation or volume limits. This is a sampled feed, not every launch.':'The feed will refresh automatically.')+'</p></div>';return;}
 if(!existing.length)list.replaceChildren();
 rows.forEach((p,index)=>{const key=p.address+':'+p.mint;let node=feedRows.get(key);if(!node){node=document.createElement('button');node.className='feed-card market-row';node.type='button';node.dataset.mint=p.mint;node.dataset.pool=p.address;node.addEventListener('click',()=>selectToken(node.dataset.mint,true,node.dataset.pool));feedRows.set(key,node);}
  const markup=marketRowContent(p);if(node._marketMarkup!==markup){node.innerHTML=markup;node._marketMarkup=markup;node.querySelectorAll('img').forEach(img=>img.addEventListener('error',()=>img.remove(),{once:true}));}
  const selected=p.mint===mint&&(!chartContext||p.address===chartContext.pool);node.classList.toggle('active',selected);node.setAttribute('aria-pressed',String(selected));node.setAttribute('aria-label','Inspect '+(p.symbol||'token')+' · '+p.mint);node.title=(p.name||p.symbol)+' · '+valuation(p).label+' '+compact(valuation(p).value)+' · 24h volume '+compact(p.volume24hUsd)+' · Liquidity '+compact(p.liquidityUsd)+' · 5m '+percent(p.change5m);
  const current=list.children[index];if(current!==node)list.insertBefore(node,current||null);
 });list.scrollTop=scroll;
}
function updateFeedSelection(){$('feed-list').querySelectorAll('[data-mint]').forEach(b=>{const selected=b.dataset.mint===mint&&(!chartContext||b.dataset.pool===chartContext.pool);b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});}
function marketSource(source){const paid=source==='CoinGecko';$('feed-source').textContent='Data by '+(paid?'CoinGecko':'GeckoTerminal')+' ↗';$('feed-source').href=paid?'https://www.coingecko.com/en/api':'https://www.geckoterminal.com/solana/pools';}
function describeFeed(d){
 const sourceMode=feedSourceMode(mode),count=feed.filter(p=>matchesLimits(p,discoveryLimits())).filter(p=>sourceMode!=='prebond'||isPrebond(p)).filter(p=>mode!=='near'||bondProgress(p)>=70).length;
 status('feed-status',`${count} shown · ${feed.length} loaded${d.partial?' · Partial coverage':''}${d.stale?' · Delayed snapshot':''}`,!!d.stale);
 const more=$('feed-more');if(more){more.hidden=!d.hasMore;more.disabled=feedPaging||Date.now()<feedRetryAt;more.textContent=feedPaging?'Loading more markets…':'Load more markets';}
 $('feed-status').title=(d.coverage||'Sampled provider feed; not every token or launch.')+(numeric(d.scanned)?' '+d.scanned+' candidates checked.':'');
}
function applyFeedPages(pages){
 const ordered=pages.slice().sort((a,b)=>(a.page||1)-(b.page||1)),unique=new Map();
 for(const page of ordered)for(const pool of page.pools||[])if(valid(pool.mint)&&valid(pool.address)&&!unique.has(pool.address+':'+pool.mint))unique.set(pool.address+':'+pool.mint,pool);
 feed=[...unique.values()];const first=ordered[0],last=ordered.at(-1);
 feedData={...first,pools:feed,pages:ordered,hasMore:last.hasMore===true,fetchedAt:ordered.map(p=>p.fetchedAt).sort()[0],freshUntil:ordered.map(p=>p.freshUntil).filter(Boolean).sort()[0],scanned:ordered.reduce((n,p)=>n+(p.scanned||p.pools.length),0),partial:ordered.some(p=>p.partial),stale:ordered.some(p=>p.stale)};
 feedCache.set(feedSourceMode(mode),{data:feedData,nextAt:feedNextRefreshAt,retryAt:feedRetryAt});renderFeed();describeFeed(feedData);refreshDataStates();
}
async function loadMoreFeed(id=feedSeq){
 if(feedPaging||!feedData?.hasMore||Date.now()<feedRetryAt)return false;
 const sourceMode=feedSourceMode(mode),page=(feedData.pages?.length||1)+1;if(page>10)return false;
 feedPaging=true;describeFeed(feedData);
 try{const d=await api('/api/terminal/discovery?mode='+sourceMode+'&page='+page);
  if(!alive||id!==feedSeq)return false;
  if(d.mode!==sourceMode||d.page!==page||!Array.isArray(d.pools))throw Error('More markets returned an invalid page.');
  applyFeedPages([...(feedData.pages||[feedData]),d]);return true;
 }catch(e){if(id===feedSeq){feedRetryAt=Date.now()+Math.max(15,e.retryAfterSeconds||60)*1000;status('feed-status',feed.length+' markets retained · More markets temporarily unavailable',true);$('feed-status').title=e.message;}return false;
 }finally{if(id===feedSeq){feedPaging=false;const more=$('feed-more');if(more){more.disabled=Date.now()<feedRetryAt;more.textContent='Load more markets';}}}
}
async function expandFeed(id){
 // A first page is a starting point, never the entire discovery universe.
 // Shared deeper-page caches bound provider use across all visitors.
 while(alive&&id===feedSeq&&feedData?.hasMore&&((feedData.pages?.length||1)<3||feed.filter(p=>matchesLimits(p,discoveryLimits())&&(mode!=='near'||bondProgress(p)>=70)).length<40)){
  if(!await loadMoreFeed(id))break;
 }
}
async function loadFeed(){
 if(Date.now()<feedRetryAt){status('feed-status','Refresh is paused. Retry after '+time(feedRetryAt)+'.',true);refreshDataStates();return;}
 const id=++feedSeq,requestedMode=mode,sourceMode=feedSourceMode(mode);feedLoading=true;feedPaging=false;refreshDataStates();status('feed-status',feedData?'Refreshing markets…':sourceMode==='prebond'?'Finding verified bonding curves…':'Loading indexed markets…');
 if(!feedData)$('feed-list').innerHTML='<div class="market-empty"><span>⌁</span><strong>Discovering markets</strong><p>Checking indexed '+(sourceMode==='prebond'?'bonding curves':'pools')+'…</p></div>';
 try{const d=await api('/api/terminal/discovery?mode='+sourceMode);if(!alive||id!==feedSeq||mode!==requestedMode)return;
  if(d.mode&&d.mode!==sourceMode||!Array.isArray(d.pools))throw Error('The discovery response did not match this feed. Please retry.');
  marketSource(d.source);feedFailed=false;feedRetryAt=d.retryAfterSeconds?Date.now()+d.retryAfterSeconds*1000:0;
  feedNextRefreshAt=Date.now()+Math.max(1,numeric(d.refreshAfterSeconds)?d.refreshAfterSeconds:60)*1000;applyFeedPages([{...d,page:1,hasMore:d.hasMore??d.pools.length>=20}]);expandFeed(id);
 }catch(e){if(alive&&id===feedSeq&&mode===requestedMode){feedFailed=true;feedRetryAt=Date.now()+Math.max(15,e.retryAfterSeconds||60)*1000;feedNextRefreshAt=feedRetryAt;
  status('feed-status',e.message+' Retry after '+time(feedRetryAt)+'.'+(feedData?' Previous results are retained and may be stale.':''),true);if(!feedData)$('feed-list').innerHTML='<p class="muted">The feed is unavailable. Please retry when the cooldown ends.</p>';
 }}finally{if(id===feedSeq){feedLoading=false;refreshDataStates();}}
}
const metric=(label,value,cls='')=>`<div class="metric"><span>${esc(label)}</span><strong class="${cls}">${esc(value)}</strong></div>`;
function swapLabels(){const name=lastRenderedMarket?.symbol||tokenInfo?.symbol||snapshot?.market?.symbol||selectionPreview?.symbol||short(mint||'Select a token');$('swap-input-label').textContent=swapSide==='buy'?'SOL':name;$('swap-output-label').textContent=swapSide==='buy'?name:'SOL';
 const phantomAvailable=!!(window.phantom?.solana?.isPhantom||window.solana?.isPhantom);
 $('phantom-open').hidden=phantomAvailable;$('phantom-help-text').textContent=phantomAvailable?'Phantom is available in this browser. Connect using the swap form below.':'On iPhone, open PARALLAX in Phantom’s browser, then connect using the swap form.';
 $('phantom-open').href='https://phantom.com/ul/browse/'+encodeURIComponent(location.origin+'/terminal'+(valid(mint)?'?token='+mint+'&side='+swapSide:'')+'#trade-panel')+'?ref='+encodeURIComponent(location.origin);
 $('phantom-manual').hidden=phantomAvailable;
 $('swap-open').disabled=swapSide==='buy'&&window.ParallaxTerminalPlus?.buyAmountValid()===false||!valid(mint)||mint===SOL||swapActive||swapLoading||!!window.ParallaxTrading?.isDemo();
 document.querySelectorAll('[data-side]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.side===swapSide));b.disabled=swapActive||swapLoading||!!window.ParallaxTrading?.isDemo();});
}
function selectionChanged(){window.dispatchEvent?.(new Event('parallax:terminal-selection'));}
function renderMarket(m){lastRenderedMarket=m;const cap=valuation(m||{});$('token-name').textContent=m?.name||'Solana token';$('token-symbol').textContent=m?.symbol?'$'+m.symbol:'Onchain snapshot';
 $('token-metrics').innerHTML=metric('Price / USD',usd(m?.priceUsd))+metric(cap.label==='MCAP'?'Market cap':cap.label==='FDV'?'FDV · cap unverified':'Market cap',usd(cap.value,true))+'<div class="metric"><span>Holders</span><strong id="terminal-selected-holders" title="'+esc(tokenInfo?.holdersUpdatedAt?'Holder count observed '+time(tokenInfo.holdersUpdatedAt):'Holder count comes from indexed token metadata')+'">'+(numeric(tokenInfo?.holders)?fmt(tokenInfo.holders):tokenInfo?'Not indexed':'Loading…')+'</strong></div>'+metric(tokenInfo?.launchpad?.completed===false?'Curve reserves':'Pool liquidity',usd(m?.liquidityUsd,true))+metric('24h pool volume',usd(m?.volume24hUsd,true))+metric('24h change',percent(m?.change24hPercent),direction(m?.change24hPercent));
}
function renderTokenLinks(pool){$('token-links').innerHTML=`<a href="/markets?address=${encodeURIComponent(mint)}#market-observatory">Project research ↗</a><a href="/control?mint=${encodeURIComponent(mint)}">Save a Passport ↗</a>`+link('Token explorer','https://solscan.io/token/'+mint)+(valid(pool)?link('Pool on DEX Screener','https://dexscreener.com/solana/'+pool):'');}
function renderToken(p){snapshot=p;selectionChanged();const m=p.market,c=p.chain;renderMarket(m);
 status('token-status',(m&&c?'Market + chain data':'Partial data')+' · Updated '+time(p.fetchedAt)+(m?' · DEX Screener pool':' · Market data unavailable'));
 renderTokenLinks(m?.pairAddress);
 const facts=c?[['Mint authority',c.mintAuthority?'Present':'None reported'],['Freeze authority',c.freezeAuthority?'Present':'None reported'],['Supply',c.supply??'Unavailable'],['Confirmed slot',fmt(c.slot)]]:[['Chain data','Unavailable']];
 $('chain-facts').innerHTML=facts.map(([a,b])=>`<div><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('');
 $('token-gaps').innerHTML=(Array.isArray(p.gaps)?p.gaps:[]).map(t=>`<li>${esc(t)}</li>`).join('');swapLabels();
}
function chartControls(){const available=!!chartContext&&valid(chartContext.pool)&&chartContext.token===mint;
 ['dex','snapshot'].forEach(mode=>{const button=$('chart-mode-'+mode);button.disabled=!available;button.setAttribute('aria-pressed',String(chartMode===mode));});
 $('chart-external').hidden=!available;$('chart-external').href=available?'https://dexscreener.com/solana/'+chartContext.pool:'#';
}
function resetChart(){clearTimeout(chartFallbackTimer);chartLoading=false;chartNextAt=0;window.ParallaxTrading?.disposeChart();clearTimeout(chartRetryTimer);clearTimeout(chartEmbedTimer);chartFrame=null;chartContext=null;chartData=null;chartFailed=false;chartRequestSeq++;$('market-chart').setAttribute('aria-busy','false');freshness('chart-freshness',null);$('chart-retry').hidden=true;$('market-chart').innerHTML='<div class="empty-chart"><span>⌁</span><p>Select a market to open its chart.</p></div>';$('chart-note').textContent='Interactive charts by DEX Screener. Snapshot is available as an alternative.';chartControls();}
async function selectToken(value,navigate=false,poolAddress=''){
 value=String(value||'').trim();if(!valid(value)){status('terminal-message','Paste a complete Solana token contract address.',true);return;}
 const changed=value!==mint,id=++selectionSeq,closedSwap=changed&&(swapActive||swapLoading);
 if(valid(poolAddress))selectedPool=poolAddress;else if(changed)selectedPool='';
 if(closedSwap)closeSwap();if(changed){deskOrder=null;tokenInfo=null;lastRenderedMarket=null;}
 if(changed)cancelReads(path=>/^\/api\/(market\?|analytics\?|terminal\/(chart|pool)\?)/.test(path));
 const keepChart=!changed&&(chartFrame||chartData)&&chartContext?.token===value&&(!poolAddress||chartContext.pool===poolAddress);
 if(!keepChart)resetChart();else{chartContext.id=id;if(chartLoading){chartRequestSeq++;chartLoading=false;cancelReads(path=>path.startsWith('/api/terminal/chart?'));}}
 const previousSnapshot=!changed?snapshot:null,chosenPool=poolAddress||(!changed?chartContext?.pool:'');
 mint=value;snapshot=previousSnapshot;selectionPreview=feed.find(p=>p.mint===value&&(!chosenPool||p.address===chosenPool))||null;selectionChanged();$('token-input').value=value;$('token-address').textContent=value;$('copy-address').disabled=false;$('token-refresh').disabled=true;$('analytics-load').disabled=true;
 $('replay-signin').href='/signin-with-chatgpt?return_to='+encodeURIComponent('/terminal?token='+value+'#wallet-replay');
 if(!previousSnapshot){$('token-name').textContent='Loading token…';$('token-symbol').textContent=short(value);$('token-metrics').replaceChildren();$('token-links').replaceChildren();$('concentration').replaceChildren();$('chain-facts').innerHTML='<p class="muted">Retrieving confirmed chain observations…</p>';$('token-gaps').replaceChildren();status('analytics-status','');}
 status('token-status',previousSnapshot?'Refreshing market data…':'Retrieving market data and confirmed token state…');status('terminal-message','Inspecting '+short(value)+'.');
 if(!keepChart)status('chart-status','Awaiting a matching indexed pool.');
 if(selectionPreview&&(!previousSnapshot||poolAddress&&!keepChart)){renderMarket({...selectionPreview,change24hPercent:selectionPreview.change24h});renderTokenLinks(selectionPreview.address);status('token-status','Market feed snapshot'+(feedData?.fetchedAt?' · '+time(feedData.fetchedAt):'')+(feedData?.stale||feedFailed?' · May be stale':'')+' · Refreshing details…');}
 if(changed)clearReplay();updateFeedSelection();swapLabels();
 if(closedSwap)status('swap-status','Selected coin changed. The previous swap form is closed; open a new form for this token. Transactions already sent to your wallet or network are not cancelled.');
 if(navigate){history.replaceState(null,'','/terminal?token='+encodeURIComponent(value)+'&view=trade&chart='+(chartMode==='dex'?'dex':'trades'));if(matchMedia('(max-width:760px)').matches)document.querySelector('.token-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}
 try{sessionStorage.setItem('parallax:terminal-market',value);}catch{}
 // The feed already identifies a pool. Its chart can load while chain evidence is retrieved.
 if(keepChart&&chartMode==='snapshot')loadChart(chartContext.pool,value,id);
 else if(!keepChart&&valid(selectionPreview?.address))loadChart(selectionPreview.address,value,id);
 else if(!keepChart&&chartMode==='snapshot'){
  // Do not wait for the slower chain/research request to choose a chart pool.
  chartFallbackTimer=setTimeout(()=>{if(alive&&id===selectionSeq&&!chartData&&!window.ParallaxTrading?.isDemo())fallbackChart(value,'Finding the pool. Alternative DEX chart is available below.');},6000);
  api('/api/terminal/pool?mint='+encodeURIComponent(value)).then(d=>{if(!alive||id!==selectionSeq||d.mint!==mint||chartContext||window.ParallaxTrading?.isDemo())return;if(valid(d.pool))loadChart(d.pool,value,id);else fallbackChart(value,'This token has no indexed pool yet. The alternative chart may also be unavailable.');}).catch(()=>{if(alive&&id===selectionSeq&&!chartContext)fallbackChart(value,'Pool lookup is delayed. Alternative DEX chart shown; use Refresh to retry.');});
 }
 try{const p=await api('/api/market?address='+encodeURIComponent(value));if(!alive||id!==selectionSeq)return;if(p.address!==value)throw Error('Token response did not match the selection.');renderToken(p);status('terminal-message','Market ready.');$('analytics-load').disabled=false;if(valid(p.market?.pairAddress)){if(!chartContext||chartContext.token!==value||!selectedPool&&chartContext.pool!==p.market.pairAddress)loadChart(p.market.pairAddress,value,id);}else if(!chartContext)fallbackChart(value,'No indexed pool found yet. Alternative DEX chart shown.');}
 catch(e){if(alive&&id===selectionSeq){if(!selectionPreview&&!previousSnapshot)$('token-name').textContent='Token data unavailable';status('token-status',e.message+(selectionPreview||previousSnapshot?' Previous market data retained; it may be stale.':''),true);status('terminal-message',e.message,true);if(!previousSnapshot)$('chain-facts').innerHTML='<p class="muted">Token state is unavailable. Use Refresh to retry.</p>';if(!chartContext)fallbackChart(value,'Pool lookup is unavailable. Alternative DEX chart shown.');}}
 finally{if(id===selectionSeq)$('token-refresh').disabled=false;}
}
function plot(points,{candles=false,label='',currency='USD',selected=-1}={}){
 if(!points.length)return '<div class="empty-chart"><p>No supported data in this window.</p></div>';
 const W=800,H=280,L=14,R=95,T=20,B=35,values=points.flatMap(p=>candles?[p.low,p.high]:[p.price]),min=Math.min(...values),max=Math.max(...values),pad=(max-min||max||1)*.12,lo=Math.max(0,min-pad),hi=max+pad;
 const first=points[0].time,last=points.at(-1).time,span=Math.max(1,last-first),x=t=>L+(t-first)/span*(W-L-R),y=v=>T+(hi-v)/(hi-lo)*(H-T-B);
 let s=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>`;
 for(let i=0;i<4;i++){const v=lo+(hi-lo)*i/3,yy=y(v);s+=`<line x1="${L}" y1="${yy}" x2="${W-R}" y2="${yy}" stroke="#223141" stroke-dasharray="3 5"/><text x="${W-R+10}" y="${yy+4}" fill="#94a6b8" font-size="11">${esc(currency==='USD'?usd(v):fmt(v))}</text>`;}
 if(candles){const w=Math.max(1,Math.min(9,(W-L-R)/points.length*.65));points.forEach(p=>{const color=p.close>=p.open?'#9ae8d3':'#ff9da9';s+=`<g><title>${esc(time(p.time*1000))}: O ${esc(usd(p.open))}, H ${esc(usd(p.high))}, L ${esc(usd(p.low))}, C ${esc(usd(p.close))}</title><line x1="${x(p.time)}" y1="${y(p.high)}" x2="${x(p.time)}" y2="${y(p.low)}" stroke="${color}"/><rect x="${x(p.time)-w/2}" y="${Math.min(y(p.open),y(p.close))}" width="${w}" height="${Math.max(1,Math.abs(y(p.close)-y(p.open)))}" fill="${color}"/></g>`;});}
 else{points.forEach((p,i)=>{s+=`<g><title>${esc(p.side.toUpperCase()+' · '+time(p.time*1000)+' · '+fmt(p.price)+' '+currency)}</title>${selected===i?`<line x1="${x(p.time)}" y1="${T}" x2="${x(p.time)}" y2="${H-B}" stroke="#55796d"/>`:''}<circle data-point="${i}" cx="${x(p.time)}" cy="${y(p.price)}" r="${selected===i?7:4}" fill="${p.side==='buy'?'#9ae8d3':'#ff9da9'}" stroke="${selected===i?'#ffffff':'none'}"/></g>`;});}
 s+=`<text x="${L}" y="${H-8}" fill="#94a6b8" font-size="11">${esc(time(first*1000))}</text><text x="${W-R}" y="${H-8}" text-anchor="end" fill="#94a6b8" font-size="11">${esc(time(last*1000))}</text></svg>`;return s;
}
function chartRetry(seconds=0){
 clearTimeout(chartRetryTimer);$('chart-retry').hidden=false;$('chart-retry').disabled=seconds>0;$('chart-retry').textContent=seconds>0?'Waiting for provider…':'Refresh snapshot';
 if(seconds>0){const context=chartContext;chartRetryTimer=setTimeout(()=>{if(alive&&chartContext===context&&chartMode==='snapshot'){$('chart-retry').disabled=false;$('chart-retry').textContent='Retry snapshot';}},Math.min(seconds*1000,2147483647));}
}
function loadChart(pool,token,id,force=false){
 if(!alive||id!==selectionSeq||token!==mint||!valid(pool)||!valid(token)||window.ParallaxTrading?.isDemo())return;
 if(chartContext&&(chartContext.pool!==pool||chartContext.token!==token)){cancelReads(path=>path.startsWith('/api/terminal/chart?'));resetChart();}
 if(!chartContext)chartContext={pool,token,id};else chartContext.id=id;
 chartControls();updateFeedSelection();window.ParallaxTrading?.chartModeChanged(chartMode);
 if(chartMode==='snapshot')return loadSnapshotChart(pool,token,id);
 if(chartFrame&&!force)return;
 clearTimeout(chartRetryTimer);clearTimeout(chartEmbedTimer);const requestId=++chartRequestSeq,context=chartContext,frame=document.createElement('iframe');
 chartFrame=frame;chartData=null;chartFailed=false;freshness('chart-freshness',null);
 frame.className='dex-chart-frame';frame.title='DEX Screener chart for '+(snapshot?.market?.symbol||selectionPreview?.symbol||short(token));
 frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups');frame.setAttribute('allow','fullscreen');frame.referrerPolicy='no-referrer';frame.loading='eager';
 const current=()=>alive&&chartMode==='dex'&&chartContext===context&&chartRequestSeq===requestId&&mint===token;
 frame.onload=()=>{if(!current())return;clearTimeout(chartEmbedTimer);$('market-chart').setAttribute('aria-busy','false');status('chart-status','DEX Screener · Pool '+short(pool));};
 frame.onerror=()=>{if(!current())return;clearTimeout(chartEmbedTimer);$('market-chart').setAttribute('aria-busy','false');status('chart-status','The embedded chart could not load. Choose Chart + trades or Open chart.',true);};
 frame.src='https://dexscreener.com/solana/'+pool+'?embed=1&info=0&trades=0&tabs=0&theme=dark&chartTheme=dark&chartLeftToolbar=0&chartDefaultOnMobile=1&chartType=usd&interval=15';
 $('market-chart').replaceChildren(frame);$('market-chart').setAttribute('aria-busy','true');$('chart-retry').hidden=false;$('chart-retry').disabled=false;$('chart-retry').textContent='Reload chart';
 status('chart-status','Opening DEX Screener for the selected pool…');
 // An iframe load event cannot prove a cross-origin chart rendered successfully.
 $('chart-note').textContent='Chart supplied by DEX Screener. If it does not appear, choose Chart + trades or Open chart.';
 chartEmbedTimer=setTimeout(()=>{if(!current())return;$('market-chart').setAttribute('aria-busy','false');status('chart-status','Chart taking longer than expected? Choose Chart + trades or Open chart.');},15000);
}
function changeChartMode(next){if(next===chartMode||!chartContext||window.ParallaxTrading?.isDemo())return;try{sessionStorage.setItem('parallax:terminal-chart',next);}catch{}const context=chartContext;chartMode=next;cancelReads(path=>path.startsWith('/api/terminal/chart?'));resetChart();loadChart(context.pool,context.token,selectionSeq);}
function fallbackChart(token,message){
 if(window.ParallaxTrading?.isDemo()||!alive||token!==mint)return;
 if(chartData){status('chart-status',message+' Previous chart retained; prices may be stale.',true);return;}
 if(!chartFrame){window.ParallaxTrading?.disposeChart();const frame=document.createElement('iframe');frame.className='dex-chart-frame';frame.title='Alternative DEX Screener market chart';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-popups');frame.setAttribute('allow','fullscreen');frame.referrerPolicy='no-referrer';frame.src='https://dexscreener.com/solana/'+(chartContext?.pool||token)+'?embed=1&info=0&trades=0&tabs=0&theme=dark&chartTheme=dark&chartLeftToolbar=0&chartDefaultOnMobile=1&chartType=usd&interval=1';$('market-chart').replaceChildren(frame);chartFrame=frame;}
 $('market-chart').setAttribute('aria-busy','false');status('chart-status',message,true);$('chart-external').href='https://dexscreener.com/solana/'+(chartContext?.pool||token);$('chart-external').hidden=false;
 $('chart-note').textContent='Alternative chart supplied by DEX Screener. Your fill markers appear in Chart + trades when available. If this embed is blocked, use Open chart.';
}
async function loadSnapshotChart(pool,token,id){
 if(chartLoading)return;clearTimeout(chartRetryTimer);clearTimeout(chartFallbackTimer);const requestId=++chartRequestSeq;chartLoading=true;
 $('market-chart').setAttribute('aria-busy','true');$('chart-retry').hidden=false;$('chart-retry').disabled=true;
 status('chart-status',chartData?'Updating candles…':'Loading '+chartInterval+'-minute candles…');
 chartFallbackTimer=setTimeout(()=>{if(alive&&id===selectionSeq&&requestId===chartRequestSeq&&!chartData)fallbackChart(token,'Candle provider is taking longer than expected. Alternative chart shown while we retry.');},6000);
 try{const d=await api('/api/terminal/chart?pool='+encodeURIComponent(pool)+'&mint='+encodeURIComponent(token)+'&interval='+chartInterval+'&currency='+chartCurrency);if(!alive||chartMode!=='snapshot'||id!==selectionSeq||requestId!==chartRequestSeq||window.ParallaxTrading?.isDemo())return;if(d.pool!==pool||d.mint!==token||!Array.isArray(d.candles))throw Error('Chart does not match the selected pool.');
  if(!d.candles.length)throw Error('No candles indexed for this pool yet.');
  const last=d.candles.at(-1).time*1000,old=Date.now()-last>Math.max(120000,d.intervalMinutes*120000);
  chartData=d;chartFailed=!!d.stale;chartFrame=null;chartNextAt=Date.now()+Math.max(15,d.retryAfterSeconds||d.refreshAfterSeconds||30)*1000;
  $('chart-note').innerHTML=`${d.source==='CoinGecko'?'CoinGecko':'GeckoTerminal'} · Provider snapshots · 30s checks. `+link('Inspect source','https://www.geckoterminal.com/solana/pools/'+pool);
  if(window.ParallaxTrading)window.ParallaxTrading.renderChart(d);else $('market-chart').innerHTML=plot(d.candles,{candles:true,label:'Selected pool candlesticks'});
  status('chart-status',`${d.pair} · ${d.intervalMinutes}m · ${d.stale?'Older snapshot; refresh unavailable':old?'No recent candle; market inactive or data delayed':'Last candle '+new Date(last).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`,!!d.stale||old);$('chart-status').title='Last indexed candle: '+time(last);
  chartRetry(d.retryAfterSeconds||0);
 }catch(e){if(alive&&id===selectionSeq&&requestId===chartRequestSeq&&!window.ParallaxTrading?.isDemo()){chartFailed=true;chartNextAt=Date.now()+Math.max(30,e.retryAfterSeconds||30)*1000;fallbackChart(token,e.message+(e.retryAfterSeconds?' Retry after '+time(Date.now()+e.retryAfterSeconds*1000)+'.':''));chartRetry(e.retryAfterSeconds||0);}}
 finally{if(alive&&id===selectionSeq&&requestId===chartRequestSeq){chartLoading=false;clearTimeout(chartFallbackTimer);$('market-chart').setAttribute('aria-busy','false');freshness('chart-freshness',chartData,chartFailed);}}
}

async function analytics(){const token=mint,id=selectionSeq;$('analytics-load').disabled=true;status('analytics-status','Loading largest token accounts…');try{const d=await api('/api/analytics?address='+encodeURIComponent(token));if(!alive||id!==selectionSeq)return;if(d.address!==token)throw Error('Analytics did not match the token.');const h=d.holders;if(!h){status('analytics-status','Concentration data is unavailable. Please retry.',true);return;}const pct=n=>numeric(n)?n.toFixed(2)+'%':'Unavailable';$('concentration').innerHTML='<p class="footnote">Largest token accounts, not unique holders. Pool vaults, lockers and exchange accounts are included. Percentages use total minted supply.</p><div class="metrics">'+metric('Largest account',pct(h.top1Percent))+metric('Top 5 accounts',pct(h.top5Percent))+metric('Top 10 accounts',pct(h.top10Percent))+'</div><div class="table-scroll" tabindex="0" role="region" aria-label="Largest token accounts"><table><thead><tr><th>Rank</th><th>Account</th><th>Supply share</th></tr></thead><tbody>'+h.rows.slice(0,10).map((r,i)=>`<tr><td>${i+1}</td><td>${valid(r.address)?link(short(r.address),'https://solscan.io/account/'+r.address):'Unavailable'}</td><td>${pct(r.sharePercent)}</td></tr>`).join('')+'</tbody></table></div>';status('analytics-status','Retrieved '+time(d.fetchedAt)+'. '+(h.inconsistent?'Account totals are inconsistent; percentages withheld.':'Account and supply slots may differ.'));}catch(e){if(alive&&id===selectionSeq)status('analytics-status',e.message,true);}finally{if(id===selectionSeq)$('analytics-load').disabled=false;}}
function swapDiagnostic(phase){
 if(!alive||diagnosticsSent++>=10)return;
 fetch('/api/terminal/diagnostic',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({phase}),keepalive:true}).catch(()=>{});
}
function loadPlugin(){
 if(window.Jupiter?.init)return Promise.resolve();if(pluginPromise)return pluginPromise;
 pluginPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://plugin.jup.ag/plugin-v1.js';script.async=true;script.setAttribute('data-preload','');let settled=false;
  const timer=setTimeout(()=>fail('script-timeout'),20000);
  function fail(phase){if(settled)return;settled=true;clearTimeout(timer);script.remove();pluginPromise=null;swapDiagnostic(phase);reject(Error('The in-page swap service could not load. Tap Retry swap form to try again here.'));}
  script.onerror=()=>fail('script-error');script.onload=()=>{if(window.Jupiter?.init){settled=true;clearTimeout(timer);resolve();}else fail('script-error');};document.head.append(script);
 });return pluginPromise;
}
function watchSwapForm(onReady,onSlow){
 const target=$('jupiter-plugin'),observers=new Map();let finished=false;
 const poll=setInterval(check,250),timer=setTimeout(()=>{if(finished)return;clearInterval(poll);swapDiagnostic('render-timeout');onSlow();},20000);
 function cancel(){if(finished)return;finished=true;clearTimeout(timer);clearInterval(poll);observers.forEach(o=>o.disconnect());observers.clear();}
 function ready(){if(finished)return;cancel();onReady();}
 function inspect(root){
  if(finished)return;
  if(!observers.has(root)){const observer=new MutationObserver(check);observers.set(root,observer);observer.observe(root,{childList:true,subtree:true});}
  if(root.querySelector('button,input')){ready();return;}
  // DOM queries and observers do not cross the plugin's open shadow boundaries.
  if(root.shadowRoot)inspect(root.shadowRoot);
  for(const element of root.querySelectorAll('*'))if(element.shadowRoot)inspect(element.shadowRoot);
 }
 function check(){if(!finished)inspect(target);}
 return {ready,cancel,check};
}
async function openSwap(){
 if(swapSide==='buy'&&window.ParallaxTerminalPlus?.buyAmountValid()===false)return;
 if(!valid(mint)||mint===SOL||swapActive||swapLoading||window.ParallaxTrading?.isDemo())return;
 const token=mint,side=swapSide,generation=++swapGeneration;swapLoading=true;swapLabels();$('swap-open').hidden=true;$('swap-close').hidden=false;$('swap-close').textContent='Cancel loading';status('swap-status','Loading the swap form inside PARALLAX…');
 try{
  await loadPlugin();if(!alive||generation!==swapGeneration||token!==mint)return;
  $('jupiter-plugin').hidden=false;$('jupiter-plugin').setAttribute('aria-busy','true');document.querySelector('.swap-preview').hidden=true;
  const watcher=watchSwapForm(()=>{
   if(!alive||generation!==swapGeneration)return;
   swapActive=true;swapLoading=false;$('jupiter-plugin').setAttribute('aria-busy','false');$('swap-close').textContent='Close swap form';swapDiagnostic('form-ready');
   status('swap-status','Swap form ready inside PARALLAX. Review the wallet connection, both token addresses, amounts, costs, and approval before signing.');swapLabels();
  },()=>{
   if(!alive||generation!==swapGeneration)return;
   // Never tear down a usable wallet form because our readiness check timed out.
   $('jupiter-plugin').setAttribute('aria-busy','false');
   status('swap-status','The service has not reported readiness yet. If the form is visible, continue there. If it is blank, close it and reopen it.',true);
  });swapRenderCancel=watcher.cancel;
  try{window.Jupiter.init({displayMode:'integrated',integratedTargetId:'jupiter-plugin',containerStyles:{height:'560px',width:'100%'},branding:{name:'PARALLAX',logoUri:location.origin+'/favicon.svg'},localStoragePrefix:'parallax-terminal-jupiter',autoConnect:false,...(window.ParallaxTrading?.walletOptions()||{enableWalletPassthrough:false}),formProps:{initialInputMint:side==='buy'?SOL:token,initialOutputMint:side==='buy'?token:SOL,...(side==='sell'&&deskOrder?.mint===token&&deskOrder.amountRaw?{initialAmount:deskOrder.amountRaw}:{}),...(side==='buy'&&window.ParallaxTerminalPlus?.buyAmountRaw()?{initialAmount:window.ParallaxTerminalPlus.buyAmountRaw()}:{}),fixedMint:token},
   onFormUpdate:watcher.ready,onScreenUpdate:watcher.ready,
   onSuccess:({txid})=>{if(!alive||generation!==swapGeneration)return;watcher.ready();status('swap-status','Jupiter reported a completed swap. Inspect the transaction to confirm its final status.');if(sig(txid)){$('swap-status').insertAdjacentHTML('beforeend',' '+link('View transaction','https://solscan.io/tx/'+txid));window.ParallaxTrading?.swapReported(txid,token);}},
   onSwapError:()=>{if(alive&&generation===swapGeneration){watcher.ready();status('swap-status','The swap was not confirmed by Jupiter. Check your wallet and transaction history before retrying.',true);}}});
  }catch{swapDiagnostic('init-error');throw Error('The in-page swap form could not start. Tap Retry swap form.');}
  swapActive=true;swapLoading=false;$('swap-close').textContent='Close swap form';watcher.check();swapLabels();
 }catch(e){if(alive&&generation===swapGeneration){closeSwap();$('swap-open').textContent='Retry swap form';status('swap-status',e.message,true);}}
 finally{if(generation===swapGeneration){swapLoading=false;swapLabels();}}
}
function closeSwap(){
 swapGeneration++;swapActive=false;swapLoading=false;swapRenderCancel?.();swapRenderCancel=null;try{window.Jupiter?.close();}catch{}
 $('jupiter-plugin').replaceChildren();$('jupiter-plugin').hidden=true;$('jupiter-plugin').setAttribute('aria-busy','false');$('swap-close').hidden=true;$('swap-open').hidden=false;$('swap-open').textContent='Review quote';document.querySelector('.swap-preview').hidden=false;swapLabels();status('swap-status','Swap form closed. Closing the form does not cancel any transaction already sent to your wallet or network.');
}
function stopPlay(){clearInterval(playTimer);playTimer=null;$('replay-play').textContent='Play replay';}
function clearReplay(){replaySeq++;stopPlay();replay=null;replayRows=[];step=0;$('replay-result').hidden=true;$('replay-identity').hidden=true;$('replay-identity').replaceChildren();$('replay-rows').replaceChildren();$('replay-chart').replaceChildren();$('replay-selected').replaceChildren();['replay-summary','replay-coverage','replay-pricing','replay-step-label','replay-quote'].forEach(id=>$(id).replaceChildren());$('replay-step').value='0';$('replay-step').max='0';$('replay-load').disabled=false;status('replay-status','Load supported swaps for the selected token. Up to 20 requests per day (UTC).');}
function showStep(n){if(!replayRows.length)return;step=Math.min(Math.max(0,n),replayRows.length-1);const t=replayRows[step];$('replay-step').value=String(step);$('replay-step-label').textContent=`${step+1} / ${replayRows.length}`;$('replay-selected').innerHTML=`<strong class="${t.side==='buy'?'up':'down'}">${esc(t.side.toUpperCase())}</strong> · ${esc(t.tokenAmount)} tokens for ${esc(t.quoteAmount)} ${esc(t.quoteSymbol)} · ${esc(time(t.time*1000))}`+link('Inspect transaction','https://solscan.io/tx/'+t.signature);
 $('replay-chart').innerHTML=plot(replayRows.map(r=>({time:r.time,price:r.executionPrice,side:r.side})),{currency:t.quoteSymbol,selected:step,label:'Historical wallet execution prices in '+t.quoteSymbol+' per token. Green buys and pink sells.'});
 $('replay-chart').querySelectorAll('[data-point]').forEach(p=>p.addEventListener('click',()=>{stopPlay();showStep(Number(p.dataset.point));}));$('replay-rows').querySelectorAll('tr').forEach((row,i)=>row.classList.toggle('current',i===step));
}
function renderReplayQuote(){stopPlay();const q=$('replay-quote').value;replayRows=replay.trades.filter(t=>t.quoteMint===q);$('replay-summary').textContent=`${replayRows.length} supported executions in ${replayRows[0]?.quoteSymbol||'this currency'}. Prices are historical execution ratios, not a continuous market chart or a profit calculation.`;$('replay-rows').innerHTML=replayRows.map(t=>`<tr><td>${esc(time(t.time*1000))}</td><td class="${t.side==='buy'?'up':'down'}">${t.side.toUpperCase()}</td><td>${esc(t.tokenAmount)}</td><td>${esc(t.quoteAmount)} ${esc(t.quoteSymbol)}</td><td>${fmt(t.executionPrice)} ${esc(t.quoteSymbol)}</td><td>${numeric(t.networkFeeSol)?fmt(t.networkFeeSol)+' SOL'+(t.walletPaidNetworkFee===true?'':t.walletPaidNetworkFee===false?' · paid by another account':' · payer unavailable'):'Unavailable'}</td><td>${link('Transaction','https://solscan.io/tx/'+t.signature)}</td></tr>`).join('');$('replay-step').max=String(Math.max(0,replayRows.length-1));$('replay-play').disabled=replayRows.length<2;$('replay-step').disabled=!replayRows.length;showStep(0);}
async function loadReplay(e){e.preventDefault();const wallet=$('replay-wallet').value.trim(),token=mint;if(!valid(token)||!snapshot?.chain){status('replay-status','Select a token with retrieved mint data before loading wallet replay.',true);return;}if(!valid(wallet)&&!/^@[a-z0-9]{1,20}$/i.test(wallet)){status('replay-status','Enter a complete Solana wallet address or @handle.',true);return;}clearReplay();const id=replaySeq;$('replay-load').disabled=true;$('replay-signin').hidden=true;status('replay-status','Retrieving up to 100 finalized, provider-classified swaps…');try{const d=await api('/api/terminal/replay',{wallet,mint:token});if(!alive||id!==replaySeq||token!==mint)return;const handleInput=wallet.startsWith('@');if(!valid(d.wallet)||d.mint!==token||(handleInput?(d.requestedWallet!==wallet||d.identity?.status!=='resolved'||d.identity.handle!==wallet.toLowerCase()):d.wallet!==wallet))throw Error('Replay response did not match the request.');replay=d;
 const identity=d.identity,identityText=identity?.status==='resolved'?`At replay lookup: ${identity.handle} · Ownership checked ${time(identity.checkedAt)}`:identity?.status==='not-set'?'No verified Primary SolHandle was found at replay lookup.':identity?.status==='unavailable'?'SolHandle lookup unavailable. Using the entered wallet address.':'Wallet address';
 $('replay-identity').innerHTML=`<strong>${esc(identityText)}</strong><p class="address">${esc(d.wallet)}</p>${link('View wallet','https://solscan.io/account/'+d.wallet)}<div data-solhandle-wallet="${esc(d.wallet)}"></div>`;$('replay-identity').hidden=false;
status('replay-status',`${d.trades.length} supported swaps for this token from ${d.scanned} decoded records · Retrieved ${time(d.fetchedAt)}. ${d.unsupported} unsupported records excluded.`);if(!d.trades.length){status('replay-status','No supported swaps for this token in the latest '+d.scanned+' decoded swap records. This does not prove the wallet never traded it.');return;}$('replay-result').hidden=false;$('replay-quote').innerHTML=[...new Map(d.trades.map(t=>[t.quoteMint,t.quoteSymbol]))].map(([value,name])=>`<option value="${esc(value)}">${esc(name)} per token</option>`).join('');$('replay-coverage').textContent=d.coverage;$('replay-pricing').textContent=d.pricing;renderReplayQuote();}catch(e){if(alive&&id===replaySeq){status('replay-status',e.message,true);$('replay-signin').hidden=e.status!==401;}}finally{if(id===replaySeq)$('replay-load').disabled=false;}}
document.querySelectorAll('[data-feed]').forEach(b=>b.onclick=()=>{if(b.dataset.feed===mode)return;mode=b.dataset.feed;$('feed-sort').value=mode==='new'?'newest':mode==='trending'?'rank':'progress';feedSeq++;feedLoading=false;feedPaging=false;const sourceMode=feedSourceMode(mode),cached=feedCache.get(sourceMode);cancelReads(path=>path.startsWith('/api/terminal/discovery?')&&!path.endsWith('mode='+sourceMode));feed=cached?.data.pools||[];feedData=cached?.data||null;feedFailed=!!feedData?.stale;feedNextRefreshAt=cached?.nextAt||0;feedRetryAt=cached?.retryAt||0;feedHover=false;feedFocus=false;renderFeed();refreshDataStates();document.querySelectorAll('[data-feed]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));if(feedData){marketSource(feedData.source);describeFeed(feedData);}if(!feedData||Date.now()>=feedNextRefreshAt)loadFeed();});
document.querySelectorAll('[data-side]').forEach(b=>b.onclick=()=>{if(swapActive||swapLoading)return;swapSide=b.dataset.side;deskOrder=null;swapLabels();});
$('feed-list').addEventListener('pointerenter',()=>feedHover=true);$('feed-list').addEventListener('pointerleave',()=>{feedHover=false;if(!feedFocus)renderFeed();});
$('feed-list').addEventListener('focusin',()=>feedFocus=true);$('feed-list').addEventListener('focusout',e=>{feedFocus=!!e.relatedTarget&&$('feed-list').contains(e.relatedTarget);if(!feedFocus&&!feedHover)renderFeed();});
['feed-min-cap','feed-max-cap','feed-min-volume'].forEach(id=>$(id)?.addEventListener('input',()=>{renderFeed();if(feedData)describeFeed(feedData);}));
$('feed-filter-reset')?.addEventListener('click',()=>{$('feed-min-cap').value='7000';$('feed-max-cap').value='0';$('feed-min-volume').value='10000';renderFeed();if(feedData)describeFeed(feedData);});
$('feed-more')?.addEventListener('click',()=>loadMoreFeed());
$('feed-filter').addEventListener('input',renderFeed);$('feed-sort').addEventListener('change',renderFeed);$('feed-refresh').onclick=loadFeed;
$('token-search').onsubmit=e=>{e.preventDefault();selectToken($('token-input').value,true);};$('token-refresh').onclick=()=>selectToken(mint);$('analytics-load').onclick=analytics;
$('copy-address').onclick=async()=>{try{await navigator.clipboard.writeText(mint);status('terminal-message','Token address copied.');}catch{status('terminal-message','Copy is unavailable. Select the contract address above to copy it.');}};
$('chart-retry').onclick=()=>{if(chartContext&&!$('chart-retry').disabled)loadChart(chartContext.pool,chartContext.token,chartContext.id,true);};
$('chart-mode-dex').onclick=()=>changeChartMode('dex');$('chart-mode-snapshot').onclick=()=>changeChartMode('snapshot');
$('swap-open').onclick=openSwap;$('swap-close').onclick=closeSwap;$('replay-form').onsubmit=loadReplay;$('replay-wallet').addEventListener('input',clearReplay);$('replay-quote').onchange=renderReplayQuote;$('replay-step').oninput=()=>{stopPlay();showStep(Number($('replay-step').value));};
$('replay-play').onclick=()=>{if(playTimer){stopPlay();return;}if(matchMedia('(prefers-reduced-motion:reduce)').matches){showStep((step+1)%replayRows.length);return;}if(step>=replayRows.length-1)showStep(0);$('replay-play').textContent='Pause replay';playTimer=setInterval(()=>{if(!alive||document.hidden||step>=replayRows.length-1){stopPlay();return;}showStep(step+1);},1000);};
$('replay-export').onclick=()=>{if(!replay)return;const blob=new Blob([JSON.stringify(replay,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='parallax-wallet-replay.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function refreshVisibleData(){if(!alive||document.hidden)return;refreshDataStates();if(!feedLoading&&Date.now()>=feedRetryAt&&Date.now()>=feedNextRefreshAt)loadFeed();}
setInterval(refreshVisibleData,15000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlay();else refreshVisibleData();});
addEventListener('pagehide',()=>{alive=false;selectionSeq++;feedSeq++;chartRequestSeq++;cancelReads(()=>true);resetChart();clearReplay();$('replay-wallet').value='';closeSwap();});
addEventListener('pageshow',e=>{if(e.persisted){alive=true;feedLoading=false;loadFeed();if(mint)selectToken(mint);}});
api('/api/terminal/status').then(d=>{if(!alive)return;if(d.marketProvider)marketSource(d.marketProvider);if(!d.signedIn)$('replay-signin').hidden=false;if(!d.replayConfigured)status('replay-status','Wallet replay’s data connection is awaiting configuration.');}).catch(()=>{});
window.ParallaxTerminal={applyTokenInfo:d=>{if(d.mint!==mint)return;tokenInfo=d;renderMarket(lastRenderedMarket);const el=$('terminal-selected-holders');if(el){el.textContent=numeric(d.holders)?fmt(d.holders):'Not indexed';el.title=d.holdersUpdatedAt?'Holder count observed '+time(d.holdersUpdatedAt):'Holder observation time unavailable';}},applyMarketView:d=>{if(d.mint!==mint||!snapshot||d.stale||chartContext?.pool&&d.pool!==chartContext.pool)return;renderMarket({...snapshot.market,name:d.name||snapshot.market?.name,symbol:d.symbol||snapshot.market?.symbol,priceUsd:d.priceUsd,marketCapUsd:d.marketCapUsd,fdvUsd:d.fdvUsd,liquidityUsd:d.liquidityUsd,volume24hUsd:d.activity?.h24?.volumeUsd,change24hPercent:d.activity?.h24?.changePercent});swapLabels();status('token-status',d.source+' market · '+time(d.fetchedAt)+' · Research snapshot: '+time(snapshot.fetchedAt));},selectToken:(value,pool)=>selectToken(value,true,pool),getSelection:()=>({mint,ready:!!snapshot,market:snapshot?.market,pool:chartContext?.pool}),
 getChart:()=>({mode:chartMode,data:chartData,loading:chartLoading,nextRefreshAt:chartNextAt}),suspendChart:()=>{chartRequestSeq++;chartLoading=false;clearTimeout(chartFallbackTimer);cancelReads(path=>path.startsWith('/api/terminal/chart?'));clearTimeout(chartRetryTimer);clearTimeout(chartEmbedTimer);$('market-chart').setAttribute('aria-busy','false');},closeSwap,syncWallet:()=>{if((swapActive||swapLoading)&&window.Jupiter?.syncProps&&window.ParallaxTrading)window.Jupiter.syncProps({passthroughWalletContextState:window.ParallaxTrading.walletOptions().passthroughWalletContextState});},refreshSwapLabels:swapLabels,
 setChart:(interval=chartInterval,currency=chartCurrency)=>{chartLoading=false;cancelReads(path=>path.startsWith('/api/terminal/chart?'));chartInterval=interval;chartCurrency=currency;if(chartMode!=='snapshot')changeChartMode('snapshot');else if(chartContext)loadChart(chartContext.pool,mint,selectionSeq,true);},
 refreshChart:()=>{if(chartContext)loadChart(chartContext.pool,mint,selectionSeq,true);},
 openPositionSell:async order=>{closeSwap();deskOrder={mint,...order};swapSide='sell';swapLabels();document.getElementById('trade-panel').scrollIntoView({behavior:'smooth',block:'start'});await openSwap();},
 enableTradeView:()=>changeChartMode('snapshot')};
loadFeed();const params=new URLSearchParams(location.search);let initial=params.get('token');try{if(!initial)initial=sessionStorage.getItem('parallax:terminal-market');if(sessionStorage.getItem('parallax:terminal-chart')==='dex')chartMode='dex';}catch{}if(params.get('view')==='trade')chartMode='snapshot';if(params.get('chart')==='dex')chartMode='dex';if(params.get('side')==='sell')swapSide='sell';selectToken(valid(initial)?initial:PRLX);
})();
