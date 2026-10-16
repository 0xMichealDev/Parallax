(()=>{'use strict';
const $=id=>document.getElementById(id),SOL='So11111111111111111111111111111111111111112',PRLX='8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump';
const valid=v=>typeof v==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v),sig=v=>typeof v==='string'&&/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(v);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numeric=n=>typeof n==='number'&&Number.isFinite(n),usd=(n,compact=false)=>numeric(n)?n!==0&&Math.abs(n)<1e-8?(n<0?'-$':'$')+Math.abs(n).toExponential(3):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:compact?'compact':'standard',maximumFractionDigits:compact?2:n>=1?2:9}).format(n):'Unavailable';
const fmt=n=>numeric(n)?new Intl.NumberFormat('en-US',{maximumSignificantDigits:7}).format(n):'Unavailable',percent=n=>numeric(n)?(n>0?'+':'')+n.toFixed(2)+'%':'—',direction=n=>numeric(n)?n<0?'down':'up':'';
const time=n=>new Date(n).toLocaleString(),short=a=>a.slice(0,5)+'…'+a.slice(-5),link=(label,url)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)} ↗</a>`;
const status=(id,text,error=false)=>{$(id).textContent=text;$(id).classList.toggle('error',error);};
let mode='trending',feed=[],feedSeq=0,feedLoading=false,feedNextRefreshAt=0,feedData=null,feedFailed=false,mint='',snapshot=null,selectionSeq=0,replaySeq=0,replay=null,replayRows=[],step=0,playTimer=null,swapSide='buy',swapActive=false,swapLoading=false,pluginPromise=null,swapGeneration=0,swapRenderCancel=null,chartContext=null,chartData=null,chartFailed=false,chartRequestSeq=0,chartRetryTimer=null,feedRetryAt=0,diagnosticsSent=0,alive=true;
const readRequests=new Map();
function api(path,body){
 // Share only concurrent reads. Wallet actions and other POSTs always remain separate.
 if(!body&&readRequests.has(path))return readRequests.get(path);
 const task=(async()=>{const r=await fetch(path,{...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)});let d;try{d=await r.json();}catch{throw Error('The service returned an unreadable response. Please retry.');}if(!r.ok){const e=Error(d.error||'Request failed. Please retry.');e.status=r.status;e.retryAfterSeconds=Number(d.retryAfterSeconds)||0;throw e;}return d;})();
 if(!body){readRequests.set(path,task);const clear=()=>{if(readRequests.get(path)===task)readRequests.delete(path);};task.then(clear,clear);}return task;
}
function freshness(id,data,failed=false){
 const node=$(id);if(!data){node.textContent='';node.dataset.state='empty';return;}
 const observed=Date.parse(data.fetchedAt),expires=Date.parse(data.freshUntil),age=Number.isFinite(observed)?Math.max(0,Math.floor((Date.now()-observed)/1000)):null;
 const old=failed||data.stale||Number.isFinite(expires)&&Date.now()>=expires;
 node.dataset.state=old?'stale':'ready';
 const ageText=age===null?'Time unavailable':age<60?'less than a minute ago':age<3600?Math.floor(age/60)+' min ago':Math.floor(age/3600)+' hr ago';
 node.textContent=(old?'Older snapshot':data.cached?'Cached snapshot':'Retrieved snapshot')+' · '+ageText+(age!==null?' · Retrieved '+time(observed):'')+(old?' · Refresh needed':'');
}
function refreshDataStates(){freshness('feed-freshness',feedData,feedFailed);freshness('chart-freshness',chartData,chartFailed);$('feed-refresh').disabled=feedLoading||Date.now()<feedRetryAt;$('feed-list').setAttribute('aria-busy',String(feedLoading));}
function renderFeed(){
 const needle=$('feed-filter').value.trim().toLowerCase(),sort=$('feed-sort').value;
 const rows=feed.filter(p=>(p.name+' '+p.symbol+' '+p.mint).toLowerCase().includes(needle)).slice();
 if(sort==='volume')rows.sort((a,b)=>(b.volume24hUsd??-1)-(a.volume24hUsd??-1));if(sort==='liquidity')rows.sort((a,b)=>(b.liquidityUsd??-1)-(a.liquidityUsd??-1));
 $('feed-list').innerHTML=rows.length?rows.map(p=>`<button class="feed-card ${p.mint===mint?'active':''}" type="button" data-mint="${esc(p.mint)}" aria-pressed="${p.mint===mint}" aria-label="Inspect ${esc(p.symbol)} ${esc(p.mint)}"><span class="feed-top"><strong>${esc(p.symbol||'TOKEN')}</strong><span>${usd(p.priceUsd)}</span></span><span class="feed-name">${esc(p.pair)}</span><span class="feed-bottom"><span>VOL ${usd(p.volume24hUsd,true)} · LIQ ${usd(p.liquidityUsd,true)}</span><span class="${direction(p.change24h)}">${percent(p.change24h)} / 24h</span></span><span class="feed-bottom"><span>${esc(p.dex)}</span><span>${esc(short(p.mint))}</span></span></button>`).join(''):'<p class="muted">No matching pools in this feed.</p>';
 $('feed-list').querySelectorAll('[data-mint]').forEach(b=>b.addEventListener('click',()=>selectToken(b.dataset.mint,true)));
}
function marketSource(source){const paid=source==='CoinGecko';$('feed-source').textContent='Data by '+(paid?'CoinGecko':'GeckoTerminal')+' ↗';$('feed-source').href=paid?'https://www.coingecko.com/en/api':'https://www.geckoterminal.com/solana/pools';}
async function loadFeed(){
 if(Date.now()<feedRetryAt){status('feed-status','Refresh is paused. Retry after '+time(feedRetryAt)+'.',true);refreshDataStates();return;}
 const id=++feedSeq,requestedMode=mode;feedLoading=true;refreshDataStates();status('feed-status','Updating the '+(mode==='new'?'new-pool':'trending')+' feed…');
 if(!feedData)$('feed-list').innerHTML='<p class="muted">Loading indexed pools…</p>';
 try{const d=await api('/api/terminal/discovery?mode='+requestedMode);if(!alive||id!==feedSeq||mode!==requestedMode)return;
  if(d.mode&&d.mode!==requestedMode||!Array.isArray(d.pools))throw Error('The discovery response did not match this feed. Please retry.');
  marketSource(d.source);feed=d.pools;feedData=d;feedFailed=false;feedRetryAt=d.retryAfterSeconds?Date.now()+d.retryAfterSeconds*1000:0;
  feedNextRefreshAt=Date.now()+Math.max(1,numeric(d.refreshAfterSeconds)?d.refreshAfterSeconds:60)*1000;renderFeed();
  status('feed-status',`${feed.length} pools · ${d.stale?'Refresh unavailable. Showing the last saved results.':'Refreshes automatically while this tab is visible.'}`+(feedRetryAt?' Retry after '+time(feedRetryAt)+'.':''),!!d.stale);
 }catch(e){if(alive&&id===feedSeq&&mode===requestedMode){feedFailed=true;feedRetryAt=Date.now()+Math.max(15,e.retryAfterSeconds||60)*1000;feedNextRefreshAt=feedRetryAt;
  status('feed-status',e.message+' Retry after '+time(feedRetryAt)+'.'+(feedData?' Previous results are retained and may be stale.':''),true);if(!feedData)$('feed-list').innerHTML='<p class="muted">The feed is unavailable. Please retry when the cooldown ends.</p>';
 }}finally{if(id===feedSeq){feedLoading=false;refreshDataStates();}}
}
const metric=(label,value,cls='')=>`<div class="metric"><span>${esc(label)}</span><strong class="${cls}">${esc(value)}</strong></div>`;
function swapLabels(){const name=snapshot?.market?.symbol||short(mint||'Select a token');$('swap-input-label').textContent=swapSide==='buy'?'SOL':name;$('swap-output-label').textContent=swapSide==='buy'?name:'SOL';
 const phantomAvailable=!!(window.phantom?.solana?.isPhantom||window.solana?.isPhantom);
 $('phantom-open').hidden=phantomAvailable;$('phantom-help-text').textContent=phantomAvailable?'Phantom is available in this browser. Connect using the swap form below.':'On iPhone, open PARALLAX in Phantom’s browser, then connect using the swap form.';
 $('phantom-open').href='https://phantom.com/ul/browse/'+encodeURIComponent(location.origin+'/terminal'+(valid(mint)?'?token='+mint+'&side='+swapSide:'')+'#trade-panel')+'?ref='+encodeURIComponent(location.origin);
 $('phantom-manual').hidden=phantomAvailable;
 $('swap-open').disabled=!valid(mint)||mint===SOL||swapActive||swapLoading;
 document.querySelectorAll('[data-side]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.side===swapSide));b.disabled=swapActive||swapLoading;});
}
function renderToken(p){snapshot=p;const m=p.market,c=p.chain;$('token-name').textContent=m?.name||'Solana token';$('token-symbol').textContent=m?.symbol?'$'+m.symbol:'Onchain snapshot';
 $('token-metrics').innerHTML=metric('Price / USD',usd(m?.priceUsd))+metric('Market cap',usd(m?.marketCapUsd,true))+metric('FDV',usd(m?.fdvUsd,true))+metric('Pool liquidity',usd(m?.liquidityUsd,true))+metric('24h pool volume',usd(m?.volume24hUsd,true))+metric('24h change',percent(m?.change24hPercent),direction(m?.change24hPercent));
 status('token-status',(m&&c?'Sources retrieved':'Partial data')+' · '+time(p.fetchedAt)+'. Market figures use DEX Screener’s highest-liquidity indexed base-token pool.');
 $('token-links').innerHTML=`<a href="/markets?address=${encodeURIComponent(mint)}#market-observatory">Project research ↗</a><a href="/control?mint=${encodeURIComponent(mint)}">Save a Passport ↗</a>`+link('Token explorer','https://solscan.io/token/'+mint)+(valid(m?.pairAddress)?link('Pool on DEX Screener','https://dexscreener.com/solana/'+m.pairAddress):'');
 const facts=c?[['Mint authority',c.mintAuthority?'Present':'None reported'],['Freeze authority',c.freezeAuthority?'Present':'None reported'],['Supply',c.supply??'Unavailable'],['Confirmed slot',fmt(c.slot)]]:[['Chain data','Unavailable']];
 $('chain-facts').innerHTML=facts.map(([a,b])=>`<div><span>${esc(a)}</span><strong>${esc(b)}</strong></div>`).join('');
 $('token-gaps').innerHTML=(Array.isArray(p.gaps)?p.gaps:[]).map(t=>`<li>${esc(t)}</li>`).join('');swapLabels();
}
async function selectToken(value,navigate=false){
 value=String(value||'').trim();if(!valid(value)){status('terminal-message','Paste a complete Solana token contract address.',true);return;}
 if((swapActive||swapLoading)&&value!==mint){status('terminal-message','Close the swap form before selecting a different token.',true);return;}
 clearTimeout(chartRetryTimer);chartContext=null;chartData=null;chartFailed=false;chartRequestSeq++;$('market-chart').setAttribute('aria-busy','false');freshness('chart-freshness',null);$('chart-retry').hidden=true;
 const changed=value!==mint,id=++selectionSeq;mint=value;snapshot=null;$('token-input').value=value;$('token-address').textContent=value;$('copy-address').disabled=false;$('token-refresh').disabled=true;$('analytics-load').disabled=true;
 $('replay-signin').href='/signin-with-chatgpt?return_to='+encodeURIComponent('/terminal?token='+value+'#wallet-replay');
 $('token-name').textContent='Loading token…';$('token-symbol').textContent=short(value);$('token-metrics').replaceChildren();$('token-links').replaceChildren();$('concentration').replaceChildren();$('chain-facts').innerHTML='<p class="muted">Retrieving confirmed chain observations…</p>';$('token-gaps').replaceChildren();status('analytics-status','');status('token-status','Retrieving market data and confirmed token state…');status('terminal-message','Inspecting '+short(value)+'.');
 $('market-chart').innerHTML='<div class="empty-chart"><span>⌁</span><p>Retrieving the selected pool…</p></div>';status('chart-status','Awaiting a matching indexed pool.');$('chart-note').textContent='Up to 96 OHLCV candles. Missing periods are not filled with invented prices.';
 if(changed)clearReplay();renderFeed();swapLabels();
 if(navigate){history.replaceState(null,'','/terminal?token='+encodeURIComponent(value));if(matchMedia('(max-width:760px)').matches)document.querySelector('.token-panel').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}
 try{const p=await api('/api/market?address='+encodeURIComponent(value));if(!alive||id!==selectionSeq)return;if(p.address!==value)throw Error('Token response did not match the selection.');renderToken(p);status('terminal-message','Research ready. Inspect the contract address before opening a swap.');$('analytics-load').disabled=false;if(valid(p.market?.pairAddress))loadChart(p.market.pairAddress,value,id);else{status('chart-status','No matching indexed base-token pool is available.');$('market-chart').innerHTML='<div class="empty-chart"><p>No chart data available.</p></div>';}}
 catch(e){if(alive&&id===selectionSeq){$('token-name').textContent='Token data unavailable';status('token-status',e.message,true);status('terminal-message',e.message,true);$('market-chart').innerHTML='<div class="empty-chart"><p>Chart unavailable.</p></div>';}}
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
 clearTimeout(chartRetryTimer);$('chart-retry').hidden=false;$('chart-retry').disabled=seconds>0;$('chart-retry').textContent=seconds>0?'Waiting for provider…':'Refresh chart';
 if(seconds>0){const context=chartContext;chartRetryTimer=setTimeout(()=>{if(alive&&chartContext===context){$('chart-retry').disabled=false;$('chart-retry').textContent='Retry chart';}},Math.min(seconds*1000,2147483647));}
}
async function loadChart(pool,token,id){
 clearTimeout(chartRetryTimer);const requestId=++chartRequestSeq;
 chartContext={pool,token,id};$('market-chart').setAttribute('aria-busy','true');$('chart-retry').hidden=false;$('chart-retry').disabled=true;status('chart-status',chartData?'Refreshing candles. The previous chart remains visible…':'Loading 15-minute candles for the selected research pool…');
 try{const d=await api('/api/terminal/chart?pool='+encodeURIComponent(pool)+'&mint='+encodeURIComponent(token));if(!alive||id!==selectionSeq||requestId!==chartRequestSeq)return;if(d.pool!==pool||d.mint!==token||!Array.isArray(d.candles))throw Error('Chart does not match the selected pool.');
  chartData=d;chartFailed=false;$('market-chart').innerHTML=plot(d.candles,{candles:true,label:'Selected pool 15-minute USD candlesticks'});status('chart-status',`${d.pair} · ${d.candles.length} candles${d.stale?' · Older snapshot; refresh unavailable.':''}`,!!d.stale);
  $('chart-note').innerHTML=`${d.source==='CoinGecko'?'CoinGecko':'GeckoTerminal'} · Pool ${esc(short(pool))}. Last candle may be incomplete. `+link('Inspect source','https://www.geckoterminal.com/solana/pools/'+pool);chartRetry(d.retryAfterSeconds||0);
 }catch(e){if(alive&&id===selectionSeq&&requestId===chartRequestSeq){chartFailed=true;status('chart-status',e.message+(e.retryAfterSeconds?' Retry after '+time(Date.now()+e.retryAfterSeconds*1000)+'.':'')+(chartData?' Previous chart retained; prices may be stale.':''),true);if(!chartData)$('market-chart').innerHTML='<div class="empty-chart"><p>Chart unavailable. Token evidence remains available above.</p></div>';chartRetry(e.retryAfterSeconds||0);}}
 finally{if(alive&&id===selectionSeq&&requestId===chartRequestSeq){$('market-chart').setAttribute('aria-busy','false');freshness('chart-freshness',chartData,chartFailed);}}
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
 if(!valid(mint)||mint===SOL||swapActive||swapLoading)return;
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
  try{window.Jupiter.init({displayMode:'integrated',integratedTargetId:'jupiter-plugin',containerStyles:{height:'560px',width:'100%'},branding:{name:'PARALLAX',logoUri:location.origin+'/favicon.svg'},localStoragePrefix:'parallax-terminal-jupiter',autoConnect:false,enableWalletPassthrough:false,formProps:{initialInputMint:side==='buy'?SOL:token,initialOutputMint:side==='buy'?token:SOL},
   onFormUpdate:watcher.ready,onScreenUpdate:watcher.ready,
   onSuccess:({txid})=>{if(!alive||generation!==swapGeneration)return;watcher.ready();status('swap-status','Jupiter reported a completed swap. Inspect the transaction to confirm its final status.');if(sig(txid))$('swap-status').insertAdjacentHTML('beforeend',' '+link('View transaction','https://solscan.io/tx/'+txid));},
   onSwapError:()=>{if(alive&&generation===swapGeneration){watcher.ready();status('swap-status','The swap was not confirmed by Jupiter. Check your wallet and transaction history before retrying.',true);}}});
  }catch{swapDiagnostic('init-error');throw Error('The in-page swap form could not start. Tap Retry swap form.');}
  swapActive=true;swapLoading=false;$('swap-close').textContent='Close swap form';watcher.check();swapLabels();
 }catch(e){if(alive&&generation===swapGeneration){closeSwap();$('swap-open').textContent='Retry swap form';status('swap-status',e.message,true);}}
 finally{if(generation===swapGeneration){swapLoading=false;swapLabels();}}
}
function closeSwap(){
 swapGeneration++;swapActive=false;swapLoading=false;swapRenderCancel?.();swapRenderCancel=null;try{window.Jupiter?.close();}catch{}
 $('jupiter-plugin').replaceChildren();$('jupiter-plugin').hidden=true;$('jupiter-plugin').setAttribute('aria-busy','false');$('swap-close').hidden=true;$('swap-open').hidden=false;$('swap-open').textContent='Open swap form';document.querySelector('.swap-preview').hidden=false;swapLabels();status('swap-status','Swap form closed. Closing the form does not cancel any transaction already sent to your wallet or network.');
}
function stopPlay(){clearInterval(playTimer);playTimer=null;$('replay-play').textContent='Play replay';}
function clearReplay(){replaySeq++;stopPlay();replay=null;replayRows=[];step=0;$('replay-result').hidden=true;$('replay-identity').hidden=true;$('replay-identity').replaceChildren();$('replay-rows').replaceChildren();$('replay-chart').replaceChildren();$('replay-selected').replaceChildren();['replay-summary','replay-coverage','replay-pricing','replay-step-label','replay-quote'].forEach(id=>$(id).replaceChildren());$('replay-step').value='0';$('replay-step').max='0';$('replay-load').disabled=false;status('replay-status','Load supported swaps for the selected token. Up to 20 requests per day (UTC).');}
function showStep(n){if(!replayRows.length)return;step=Math.min(Math.max(0,n),replayRows.length-1);const t=replayRows[step];$('replay-step').value=String(step);$('replay-step-label').textContent=`${step+1} / ${replayRows.length}`;$('replay-selected').innerHTML=`<strong class="${t.side==='buy'?'up':'down'}">${esc(t.side.toUpperCase())}</strong> · ${esc(t.tokenAmount)} tokens for ${esc(t.quoteAmount)} ${esc(t.quoteSymbol)} · ${esc(time(t.time*1000))}`+link('Inspect transaction','https://solscan.io/tx/'+t.signature);
 $('replay-chart').innerHTML=plot(replayRows.map(r=>({time:r.time,price:r.executionPrice,side:r.side})),{currency:t.quoteSymbol,selected:step,label:'Historical wallet execution prices in '+t.quoteSymbol+' per token. Green buys and pink sells.'});
 $('replay-chart').querySelectorAll('[data-point]').forEach(p=>p.addEventListener('click',()=>{stopPlay();showStep(Number(p.dataset.point));}));$('replay-rows').querySelectorAll('tr').forEach((row,i)=>row.classList.toggle('current',i===step));
}
function renderReplayQuote(){stopPlay();const q=$('replay-quote').value;replayRows=replay.trades.filter(t=>t.quoteMint===q);$('replay-summary').textContent=`${replayRows.length} supported executions in ${replayRows[0]?.quoteSymbol||'this currency'}. Prices are historical execution ratios, not a continuous market chart or a profit calculation.`;$('replay-rows').innerHTML=replayRows.map(t=>`<tr><td>${esc(time(t.time*1000))}</td><td class="${t.side==='buy'?'up':'down'}">${t.side.toUpperCase()}</td><td>${esc(t.tokenAmount)}</td><td>${esc(t.quoteAmount)} ${esc(t.quoteSymbol)}</td><td>${fmt(t.executionPrice)} ${esc(t.quoteSymbol)}</td><td>${numeric(t.networkFeeSol)?fmt(t.networkFeeSol)+' SOL'+(t.walletPaidNetworkFee===true?'':t.walletPaidNetworkFee===false?' · paid by another account':' · payer unavailable'):'Unavailable'}</td><td>${link('Transaction','https://solscan.io/tx/'+t.signature)}</td></tr>`).join('');$('replay-step').max=String(Math.max(0,replayRows.length-1));$('replay-play').disabled=replayRows.length<2;$('replay-step').disabled=!replayRows.length;showStep(0);}
async function loadReplay(e){e.preventDefault();const wallet=$('replay-wallet').value.trim(),token=mint;if(!valid(token)||!snapshot?.chain){status('replay-status','Select a token with retrieved mint data before loading wallet replay.',true);return;}if(!valid(wallet)&&!/^@[a-z0-9]{1,20}$/i.test(wallet)){status('replay-status','Enter a complete Solana wallet address or @handle.',true);return;}clearReplay();const id=replaySeq;$('replay-load').disabled=true;$('replay-signin').hidden=true;status('replay-status','Retrieving up to 100 finalized, provider-classified swaps…');try{const d=await api('/api/terminal/replay',{wallet,mint:token});if(!alive||id!==replaySeq||token!==mint)return;const handleInput=wallet.startsWith('@');if(!valid(d.wallet)||d.mint!==token||(handleInput?(d.requestedWallet!==wallet||d.identity?.status!=='resolved'||d.identity.handle!==wallet.toLowerCase()):d.wallet!==wallet))throw Error('Replay response did not match the request.');replay=d;
 const identity=d.identity,identityText=identity?.status==='resolved'?`${identity.handle} · Ownership checked ${time(identity.checkedAt)}`:identity?.status==='not-set'?'No currently owned Primary SolHandle is set.':identity?.status==='unavailable'?'SolHandle lookup unavailable. Using the entered wallet address.':'Wallet address';
 $('replay-identity').innerHTML=`<strong>${esc(identityText)}</strong><p class="address">${esc(d.wallet)}</p>${link('View wallet','https://solscan.io/account/'+d.wallet)}`;$('replay-identity').hidden=false;
status('replay-status',`${d.trades.length} supported swaps for this token from ${d.scanned} decoded records · Retrieved ${time(d.fetchedAt)}. ${d.unsupported} unsupported records excluded.`);if(!d.trades.length){status('replay-status','No supported swaps for this token in the latest '+d.scanned+' decoded swap records. This does not prove the wallet never traded it.');return;}$('replay-result').hidden=false;$('replay-quote').innerHTML=[...new Map(d.trades.map(t=>[t.quoteMint,t.quoteSymbol]))].map(([value,name])=>`<option value="${esc(value)}">${esc(name)} per token</option>`).join('');$('replay-coverage').textContent=d.coverage;$('replay-pricing').textContent=d.pricing;renderReplayQuote();}catch(e){if(alive&&id===replaySeq){status('replay-status',e.message,true);$('replay-signin').hidden=e.status!==401;}}finally{if(id===replaySeq)$('replay-load').disabled=false;}}
document.querySelectorAll('[data-feed]').forEach(b=>b.onclick=()=>{if(b.dataset.feed===mode)return;mode=b.dataset.feed;feedSeq++;feedLoading=false;feed=[];feedData=null;feedFailed=false;feedNextRefreshAt=0;renderFeed();refreshDataStates();document.querySelectorAll('[data-feed]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));loadFeed();});
document.querySelectorAll('[data-side]').forEach(b=>b.onclick=()=>{if(swapActive||swapLoading)return;swapSide=b.dataset.side;swapLabels();});
$('feed-filter').addEventListener('input',renderFeed);$('feed-sort').addEventListener('change',renderFeed);$('feed-refresh').onclick=loadFeed;
$('token-search').onsubmit=e=>{e.preventDefault();selectToken($('token-input').value,true);};$('token-refresh').onclick=()=>selectToken(mint);$('analytics-load').onclick=analytics;
$('copy-address').onclick=async()=>{try{await navigator.clipboard.writeText(mint);status('terminal-message','Token address copied.');}catch{status('terminal-message','Copy is unavailable. Select the contract address above to copy it.');}};
$('chart-retry').onclick=()=>{if(chartContext&&!$('chart-retry').disabled)loadChart(chartContext.pool,chartContext.token,chartContext.id);};
$('swap-open').onclick=openSwap;$('swap-close').onclick=closeSwap;$('replay-form').onsubmit=loadReplay;$('replay-wallet').addEventListener('input',clearReplay);$('replay-quote').onchange=renderReplayQuote;$('replay-step').oninput=()=>{stopPlay();showStep(Number($('replay-step').value));};
$('replay-play').onclick=()=>{if(playTimer){stopPlay();return;}if(matchMedia('(prefers-reduced-motion:reduce)').matches){showStep((step+1)%replayRows.length);return;}if(step>=replayRows.length-1)showStep(0);$('replay-play').textContent='Pause replay';playTimer=setInterval(()=>{if(!alive||document.hidden||step>=replayRows.length-1){stopPlay();return;}showStep(step+1);},1000);};
$('replay-export').onclick=()=>{if(!replay)return;const blob=new Blob([JSON.stringify(replay,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='parallax-wallet-replay.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
function refreshVisibleData(){if(!alive||document.hidden)return;refreshDataStates();if(!feedLoading&&Date.now()>=feedRetryAt&&Date.now()>=feedNextRefreshAt)loadFeed();}
setInterval(refreshVisibleData,15000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlay();else refreshVisibleData();});
addEventListener('pagehide',()=>{alive=false;selectionSeq++;feedSeq++;chartRequestSeq++;readRequests.clear();clearTimeout(chartRetryTimer);clearReplay();$('replay-wallet').value='';closeSwap();});
addEventListener('pageshow',e=>{if(e.persisted){alive=true;feedLoading=false;loadFeed();if(mint)selectToken(mint);}});
api('/api/terminal/status').then(d=>{if(!alive)return;if(d.marketProvider)marketSource(d.marketProvider);if(!d.signedIn)$('replay-signin').hidden=false;if(!d.replayConfigured)status('replay-status','Wallet replay’s data connection is awaiting configuration.');}).catch(()=>{});
loadFeed();const params=new URLSearchParams(location.search),initial=params.get('token');if(params.get('side')==='sell')swapSide='sell';selectToken(valid(initial)?initial:PRLX);
})();
