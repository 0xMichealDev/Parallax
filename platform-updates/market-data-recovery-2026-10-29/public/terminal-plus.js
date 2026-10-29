/* Terminal instruments: review-only order presets, timestamped activity and project identity. */
(()=>{'use strict';
const $=id=>document.getElementById(id),terminal=window.ParallaxTerminal;if(!terminal)return;
const valid=v=>typeof v==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const finite=v=>typeof v==='number'&&Number.isFinite(v),num=v=>finite(v)?new Intl.NumberFormat('en-US',{maximumFractionDigits:2,notation:'compact'}).format(v):'—';
const imageUrl=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&v.length<=2048?u.href:null;}catch{return null;}};
const cache=new Map(),pending=new Map();let current=null,period='m5',epoch=0,loading=false,nextAt=0,marketRetryAt=0,active=true;
const retrySeconds=value=>{const n=Number(value);return Number.isFinite(n)?Math.max(0,Math.min(86400,n)):0;};
function responseError(response,data,fallback){const error=Error(data?.error||fallback);error.status=response.status;error.retryAfterSeconds=retrySeconds(data?.retryAfterSeconds)||retrySeconds(response.headers?.get('Retry-After'));return error;}
function buyAmountRaw(){const value=$('terminal-buy-amount').value.trim();if(!value)return null;if(!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,9})?$/.test(value))return null;const [whole,fraction='']=value.split('.');const raw=BigInt(whole)*1000000000n+BigInt(fraction.padEnd(9,'0'));return raw>0n?raw.toString():null;}
window.ParallaxTerminalPlus={buyAmountRaw,buyAmountValid:()=>!$('terminal-buy-amount').value.trim()||buyAmountRaw()!==null};
function orderUI(){const sell=document.querySelector('[data-side="sell"]')?.getAttribute('aria-pressed')==='true',busy=$('swap-open').hidden,demo=!!window.ParallaxTrading?.isDemo();
 $('terminal-buy-amount').hidden=sell;$('terminal-order-controls').querySelector('label').hidden=sell;document.querySelector('.terminal-buy-presets').hidden=sell;document.querySelector('.terminal-sell-shortcuts').hidden=!sell;
 document.querySelectorAll('[data-buy-sol],#terminal-buy-amount').forEach(el=>el.disabled=busy||demo);
 document.querySelectorAll('[data-terminal-sell]').forEach(el=>el.disabled=busy||demo||$('desk-balance').textContent==='—'||$('desk-position-state').textContent==='Not connected');
 const invalid=$('terminal-buy-amount').value.trim()&&!buyAmountRaw();$('terminal-buy-amount').setAttribute('aria-invalid',String(!!invalid));
 $('terminal-amount-note').textContent=sell?'Choose a balance percentage or enter a custom sale in Jupiter.':invalid?'Enter a positive SOL amount with up to 9 decimals.':'Amount carries into Jupiter. Review route, slippage, price impact and fees there.';
 if(invalid&&!sell&&!busy)$('swap-open').disabled=true;
}
$('terminal-buy-amount').addEventListener('input',()=>{terminal.refreshSwapLabels();document.querySelectorAll('[data-buy-sol]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.buySol===$('terminal-buy-amount').value)));orderUI();});
document.querySelectorAll('[data-buy-sol]').forEach(b=>b.addEventListener('click',()=>{$('terminal-buy-amount').value=b.dataset.buySol;$('terminal-buy-amount').dispatchEvent(new Event('input'));}));
document.querySelectorAll('[data-terminal-sell]').forEach(b=>b.addEventListener('click',()=>document.querySelector('[data-sell-percent="'+b.dataset.terminalSell+'"]')?.click()));
new MutationObserver(orderUI).observe($('swap-open'),{attributes:true,attributeFilter:['hidden']});
document.querySelectorAll('[data-side]').forEach(b=>new MutationObserver(orderUI).observe(b,{attributes:true,attributeFilter:['aria-pressed']}));
new MutationObserver(orderUI).observe($('desk-balance'),{childList:true,subtree:true});
function picture(el,url,label){if(!el)return;const safe=imageUrl(url);if(!safe)return;let img=el.querySelector('img');if(img?.getAttribute('src')===safe)return;img=document.createElement('img');img.src=safe;img.alt='';img.referrerPolicy='no-referrer';img.loading='lazy';img.addEventListener('error',()=>{img.remove();el.classList.remove('has-project-image');},{once:true});img.addEventListener('load',()=>el.classList.add('has-project-image'),{once:true});el.querySelector('img')?.remove();el.prepend(img);el.setAttribute('aria-label',label||'Project');}
async function read(mint,pool=''){const key=mint+':'+pool,old=cache.get(key);if(old&&Date.now()-old.at<30000)return old.data;if(pending.has(key))return pending.get(key);const task=(async()=>{const response=await fetch('/api/terminal/market-view?mint='+encodeURIComponent(mint)+(pool?'&pool='+encodeURIComponent(pool):''),{signal:AbortSignal.timeout(18000)});const d=await response.json();if(!response.ok)throw responseError(response,d,'Market data unavailable.');if(d.mint!==mint||(pool&&d.pool!==pool))throw Error('Market response did not match the selected pool.');cache.set(key,{at:Date.now(),data:d});return d;})();pending.set(key,task);try{return await task;}finally{pending.delete(key);}}
const metadataCache=new Map(),metadataPending=new Map(),metadataRetry=new Map();let metadataProviderRetryAt=0;
async function readInfo(mint,selected=false){
 const old=metadataCache.get(mint),now=Date.now();if(old&&now-old.at<900000)return old.data;if(metadataPending.has(mint))return metadataPending.get(mint);
 // Explicit token selection can still retrieve a different token's saved server
 // snapshot. Automatic row enrichment waits for the shared provider cooldown.
 const blockedUntil=Math.max(metadataRetry.get(mint)||0,selected?0:metadataProviderRetryAt);
 if(now<blockedUntil){if(old)return {...old.data,stale:true};const error=Error('Token metadata is cooling down.');error.retryAfterSeconds=Math.ceil((blockedUntil-now)/1000);throw error;}
 const task=(async()=>{const r=await fetch('/api/terminal/token-info?mint='+encodeURIComponent(mint),{signal:AbortSignal.timeout(18000)}),d=await r.json();if(!r.ok)throw responseError(r,d,'Token metadata unavailable.');if(d.mint!==mint)throw Error('Metadata did not match the selected token.');
  const cooldown=retrySeconds(d.retryAfterSeconds);metadataCache.set(mint,{at:Date.now(),data:d});if(cooldown){const until=Date.now()+cooldown*1000;metadataRetry.set(mint,until);metadataProviderRetryAt=Math.max(metadataProviderRetryAt,until);}else metadataRetry.delete(mint);return d;
 })();metadataPending.set(mint,task);try{return await task;}catch(error){const until=Date.now()+Math.max(60,error.retryAfterSeconds||300)*1000;metadataRetry.set(mint,until);if(error.status===429)metadataProviderRetryAt=Math.max(metadataProviderRetryAt,until);if(old)return {...old.data,stale:true};throw error;}finally{metadataPending.delete(mint);}
}
function metadata(d){document.querySelectorAll('[data-holder-mint="'+d.mint+'"]').forEach(el=>{el.textContent=finite(d.holders)?num(d.holders):'Not indexed';el.title=d.holdersUpdatedAt?'Holders observed '+new Date(d.holdersUpdatedAt).toLocaleString()+(d.stale?' · Delayed snapshot':''):'Holder observation time unavailable';});
 document.querySelectorAll('[data-project-mint="'+d.mint+'"]').forEach(el=>picture(el,d.imageUrl,d.name));
 if(terminal.getSelection().mint===d.mint){terminal.applyTokenInfo?.(d);picture(document.querySelector('.token-orbit'),d.imageUrl,d.name);}}
function missingMetadata(mint){const old=metadataCache.get(mint);if(old){metadata({...old.data,stale:true});return;}document.querySelectorAll('[data-holder-mint="'+mint+'"]').forEach(el=>{el.textContent='—';el.title='Holder metadata is currently unavailable. Select the token to check its details.';});if(terminal.getSelection().mint===mint)terminal.applyTokenInfo?.({mint,holders:null,links:[],linksStatus:'unavailable'});}
function refreshMetadata(){const mint=terminal.getSelection().mint;if(valid(mint))readInfo(mint,true).then(metadata).catch(()=>missingMetadata(mint));}
function render(){const a=current?.activity?.[period]||{},buys=a.buys,sells=a.sells,total=finite(buys)&&finite(sells)&&buys>=0&&sells>=0?buys+sells:null,share=total>0?buys/total*100:null;
 $('terminal-activity-values').innerHTML=[['Change',finite(a.changePercent)?(a.changePercent>0?'+':'')+a.changePercent.toFixed(2)+'%':'—'],['Volume',finite(a.volumeUsd)?'$'+num(a.volumeUsd):'—'],['Buys',num(buys)],['Sells',num(sells)],['Buy share',share===null?'—':share.toFixed(1)+'%']].map(([k,v])=>'<div><span>'+k+'</span><strong>'+esc(v)+'</strong></div>').join('');
 $('terminal-flow-fill').style.width=(share??0)+'%';document.querySelector('.terminal-flow-track').hidden=share===null;
}
async function refresh(){if(!active||document.hidden||loading||Date.now()<marketRetryAt||window.ParallaxTrading?.isDemo())return;const selection=terminal.getSelection();if(!valid(selection.mint))return;const id=epoch;loading=true;$('terminal-data-refresh').disabled=true;
 try{const d=await read(selection.mint,selection.pool||'');if(id!==epoch||selection.mint!==terminal.getSelection().mint||terminal.getSelection().pool&&d.pool!==terminal.getSelection().pool)return;current=d;terminal.applyMarketView?.(d);const info=metadataCache.get(d.mint);if(info)metadata(info.data);const cooldown=retrySeconds(d.retryAfterSeconds);marketRetryAt=cooldown?Date.now()+cooldown*1000:0;nextAt=Date.now()+Math.max(30,retrySeconds(d.refreshAfterSeconds),cooldown)*1000;render();picture(document.querySelector('.token-orbit'),d.imageUrl,d.name);$('terminal-data-status').textContent=d.source+(d.fallback?' · Secondary source':'')+(d.stale?' · STALE snapshot':' · Pool snapshot')+' · '+new Date(d.fetchedAt).toLocaleTimeString()+(cooldown?' · Updates paused until '+new Date(marketRetryAt).toLocaleTimeString():' · Refreshes while visible');$('terminal-data-status').classList.toggle('error',!!d.stale);
 }catch(e){if(id===epoch){marketRetryAt=Date.now()+Math.max(60,e.retryAfterSeconds||0)*1000;nextAt=marketRetryAt;$('terminal-data-status').textContent=(current?'Refresh failed; previous snapshot retained. ':'')+e.message+' Retry after '+new Date(marketRetryAt).toLocaleTimeString()+'.';$('terminal-data-status').classList.add('error');}}
 finally{loading=false;$('terminal-data-refresh').disabled=Date.now()<marketRetryAt;}}
window.addEventListener('parallax:terminal-selection',()=>{epoch++;current=null;nextAt=0;marketRetryAt=0;const orbit=document.querySelector('.token-orbit');orbit?.querySelector('img')?.remove();orbit?.classList.remove('has-project-image');render();refreshMetadata();if(loading){setTimeout(refresh,1000);}else refresh();orderUI();});
$('terminal-data-refresh').addEventListener('click',refresh);
document.querySelectorAll('[data-activity]').forEach(b=>b.addEventListener('click',()=>{period=b.dataset.activity;document.querySelectorAll('[data-activity]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render();}));
// Resolve only visible rows, with a small total allowance as well as concurrency.
// A long scroll or repeated DOM update must not drain the provider's daily budget.
let inFlight=0,detailWindowAt=Date.now(),detailReads=0,seen=new WeakSet();const queue=[],queuedMints=new Set();
function pump(){
 if(!active||document.hidden||Date.now()<metadataProviderRetryAt)return;
 const chart=terminal.getChart?.();if(chart?.mode==='snapshot'&&(!chart.data||chart.loading))return;
 if(Date.now()-detailWindowAt>=120000){detailWindowAt=Date.now();detailReads=0;}
 while(inFlight<2&&queue.length&&detailReads<4){const el=queue.shift(),mint=el.dataset.projectMint;queuedMints.delete(mint);if(!el.isConnected||!valid(mint))continue;
  const old=metadataCache.get(mint);if(old&&Date.now()-old.at<900000){metadata(old.data);continue;}if(Date.now()<(metadataRetry.get(mint)||0)){missingMetadata(mint);continue;}
  if(!metadataPending.has(mint))detailReads++;inFlight++;readInfo(mint).then(d=>{if(el.isConnected)metadata(d);}).catch(()=>missingMetadata(mint)).finally(()=>{inFlight--;pump();});
 }
}
const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){observer.unobserve(e.target);const mint=e.target.dataset.projectMint,old=metadataCache.get(mint);if(old&&Date.now()-old.at<900000){metadata(old.data);return;}if(queue.length<24&&!queuedMints.has(mint)){queue.push(e.target);queuedMints.add(mint);}pump();}}),{rootMargin:'80px'});
function observePictures(){document.querySelectorAll('[data-project-mint]').forEach(el=>{if(!seen.has(el)){seen.add(el);const img=el.querySelector('img');if(img){img.addEventListener('error',()=>{img.remove();const cached=metadataCache.get(el.dataset.projectMint);if(cached)picture(el,cached.data.imageUrl,cached.data.name);},{once:true});}observer.observe(el);}});}
new MutationObserver(observePictures).observe($('terminal-main'),{childList:true,subtree:true});
setInterval(()=>{$('terminal-data-refresh').disabled=loading||Date.now()<marketRetryAt;if(Date.now()>=nextAt)refresh();pump();},5000);document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(Date.now()>=nextAt)refresh();pump();}});window.addEventListener('pagehide',()=>{active=false;queue.length=0;queuedMints.clear();observer.disconnect();});window.addEventListener('pageshow',e=>{if(e.persisted){active=true;seen=new WeakSet();observePictures();refresh();}});
render();refresh();refreshMetadata();orderUI();observePictures();
})();
