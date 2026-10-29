(function(){
 'use strict';
 const C=window.ParallaxReplayCore,$=id=>document.getElementById(id);
 if(!C||!$('rp-main')&&!$('replay-main'))return;
 const PRLX='8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump',linkState=C.readLink(location.search);
 let data=null,hours=linkState.hours,cursor=0,side=linkState.side,wallet=linkState.wallet,selected='',eventLimit=35,requestId=0,controller=null,playing=false,frame=0,lastFrame=0,lastRender=0,lastRequest={},activePool=linkState.pool,activeMint=linkState.mint||PRLX;
 const safe=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const short=value=>value?value.slice(0,5)+'…'+value.slice(-5):'Unreported sender';
 const number=value=>Number.isFinite(value)?new Intl.NumberFormat('en-US',{notation:Math.abs(value)>=100000?'compact':'standard',maximumFractionDigits:Math.abs(value)<1?6:2}).format(value):'—';
 const usd=value=>Number.isFinite(value)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:Math.abs(value)>=100000?'compact':'standard',maximumFractionDigits:2}).format(value):'—';
 const sideUsd=(row,side)=>row[side==='buy'?'buys':'sells']>0&&!row[side+'KnownUsd']?'—':usd(row[side+'Usd'])+(row[side+'MissingUsd']?'*':'');
 const price=value=>Number.isFinite(value)?'$'+new Intl.NumberFormat('en-US',{maximumSignificantDigits:6}).format(value):'—';
 const clock=(time,seconds=false)=>Number.isFinite(time)?new Date(time*1000).toLocaleTimeString('en-GB',{timeZone:'UTC',hour:'2-digit',minute:'2-digit',...(seconds?{second:'2-digit'}:{})}):'—';
 const stamp=value=>{const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleString('en-GB',{timeZone:'UTC',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+' UTC':'Unavailable';};
 const text=(id,value)=>{$(id).textContent=value;};
 const status=value=>text('rp-status',value);
 function toggles(){document.querySelectorAll('[data-rp-hours]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.rpHours)===hours)));document.querySelectorAll('[data-rp-side]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rpSide===side)));}
 function stop(){playing=false;cancelAnimationFrame(frame);frame=0;lastFrame=0;lastRender=0;$('rp-play').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg><span>Play replay</span>';$('rp-play').setAttribute('aria-label','Play replay');}
 function ready(enabled){['rp-share','rp-play','rp-rewind','rp-end','rp-timeline','rp-export','rp-largest-buy','rp-largest-sell'].forEach(id=>$(id).disabled=!enabled);}
 function resetDisplay(loading){
  data=null;ready(false);$('rp-workspace').setAttribute('aria-busy',String(loading));$('rp-error').hidden=true;$('rp-share-fallback').hidden=true;$('rp-selected-event').hidden=true;
  ['rp-count','rp-wallet-count','rp-buy-volume','rp-sell-volume','rp-price'].forEach(id=>text(id,'—'));
  text('rp-chart-title',loading?'Loading replay…':'Select a token');text('rp-count-note',loading?'Retrieving indexed swaps':'Waiting for data');text('rp-pool-link','Pool activity');$('rp-pool-link').href='https://www.geckoterminal.com/solana/pools';
  $('rp-chart').replaceChildren();$('rp-chart-empty').hidden=false;$('rp-chart-empty').querySelector('strong').textContent=loading?'Gathering the evidence.':'Your market, in replay.';$('rp-chart-empty').querySelector('p').textContent=loading?'Loading a timestamped chart and recent pool swaps.':'Load a token to inspect its chart and transaction timeline.';
  $('rp-events').innerHTML='<p class="rp-empty-copy">'+(loading?'Retrieving recent swaps…':'Transactions appear here as the replay advances.')+'</p>';
  $('rp-wallets').innerHTML='<tr><td colspan="6" class="rp-table-empty">'+(loading?'Loading sender activity…':'Load a replay to inspect sender activity.')+'</td></tr>';
  $('rp-more-events').hidden=true;text('rp-event-count','0');text('rp-wallet-limit','');text('rp-clock','— UTC');['rp-chart-from','rp-chart-mid','rp-chart-to'].forEach(id=>text(id,'—'));
  text('rp-coverage-summary','Every replay shows its source, captured time and the extent of its loaded history.');$('rp-coverage-details').replaceChildren();$('rp-coverage-title').closest('section').classList.remove('partial');
  text('rp-buy-note','USD volume');text('rp-sell-note','USD volume');text('rp-capture-badge','RECENT SNAPSHOT');text('rp-interval-label','Pool price · USD');text('rp-playback-note','A captured time window. No wallet connection needed.');$('rp-wallet-filter').hidden=true;
 }
 async function load(options={}){
  const mint=($('rp-mint').value||'').trim();
  const hasSnapshot=options.snapshot!==undefined&&options.snapshot!==null;
  if(!hasSnapshot&&!C.address(mint)){showError('Enter a valid Solana token address.');$('rp-mint').focus();return;}
  const pool=options.pool||(mint===activeMint?activePool:null);lastRequest={...options,...(pool?{pool}:{})};
  stop();controller?.abort();controller=new AbortController();const seq=++requestId;selected='';eventLimit=35;resetDisplay(true);toggles();status(options.snapshot?'Opening the saved replay…':'Loading recent pool activity…');$('rp-load').disabled=true;
  const query=new URLSearchParams(hasSnapshot?{snapshot:options.snapshot}:{mint,hours:String(hours),...(pool?{pool}:{})});
  try{
   const response=await fetch('/api/replay?'+query,{signal:controller.signal,headers:{Accept:'application/json'},cache:'no-store'});
   let body;try{body=await response.json();}catch{throw Error('The replay response could not be read. Try again.');}
   if(seq!==requestId)return;
   if(!response.ok)throw Error(body.error||'Replay data is temporarily unavailable.');
   if(body.schema!=='parallax.replay.v1'||!Array.isArray(body.trades)||!Array.isArray(body.candles)||!Number.isFinite(body.window?.from)||!Number.isFinite(body.window?.to)||body.window.to<=body.window.from)throw Error('The replay data could not be verified.');
   data=body;hours=body.window.hours;activeMint=body.mint;activePool=body.pool.address;$('rp-mint').value=body.mint;cursor=options.at!==null&&Number.isFinite(options.at)?C.clamp(options.at,body.window.from,body.window.to):body.window.to;
   if(wallet&&!body.trades.some(t=>t.wallet===wallet))wallet='';
   $('rp-timeline').min=String(body.window.from);$('rp-timeline').max=String(body.window.to);ready(true);$('rp-workspace').setAttribute('aria-busy','false');
   $('rp-terminal').href='/terminal?token='+encodeURIComponent(body.mint);text('rp-chart-title',body.pool.symbol+' / Replay');text('rp-pool-link',body.pool.pair+' · '+short(body.pool.address));$('rp-pool-link').href='https://www.geckoterminal.com/solana/pools/'+encodeURIComponent(body.pool.address);
   text('rp-capture-badge',body.sharedSnapshot?'SAVED REPLAY':body.stale?'OLDER SNAPSHOT':'RECENT SNAPSHOT');text('rp-interval-label',body.intervalMinutes+'m closes · USD');
   text('rp-chart-from',clock(body.window.from));text('rp-chart-mid',clock((body.window.from+body.window.to)/2)+' UTC');text('rp-chart-to',clock(body.window.to));
   if(!hasSnapshot){const u=new URL(location.href);u.search='';u.searchParams.set('mint',body.mint);u.searchParams.set('hours',String(hours));u.searchParams.set('pool',body.pool.address);history.replaceState(null,'',u.pathname+u.search);}
   status((body.sharedSnapshot?'Saved replay':'Snapshot')+' · '+stamp(body.capturedAt)+' · '+body.source+(body.stale?' · Refresh unavailable; showing an older capture.':''));
   renderCoverage();toggles();render();
  }catch(e){if(e.name!=='AbortError'&&seq===requestId){resetDisplay(false);showError(e.message||'Replay is temporarily unavailable.');$('rp-chart-empty').querySelector('strong').textContent='Replay unavailable.';$('rp-chart-empty').querySelector('p').textContent='Retry this request or choose Load latest for a new recent replay.';status('No new replay was loaded.');}}
  finally{if(seq===requestId)$('rp-load').disabled=false;}
 }
 function showError(message){$('rp-error').hidden=false;text('rp-error-text',message);}
 function renderCoverage(){
  const c=data.coverage,span=c.firstTradeAt!==null?clock(c.firstTradeAt)+'–'+clock(c.lastTradeAt)+' UTC':'no swaps in the loaded response';
  const partial=c.windowTruncated||c.invalid>0||!data.chartAvailable;
  $('rp-coverage-title').closest('section').classList.toggle('partial',partial);
  text('rp-coverage-summary',c.loaded+' loaded swaps · '+span+'. '+(c.windowTruncated?'The provider’s recent-trade limit does not reach the beginning of this window. ':c.invalid>0?'Some provider records could not be interpreted. ':'')+(!data.chartAvailable?'Candle history is unavailable. ':'')+'One selected pool.');
  const paragraphs=[
   '<strong>Captured:</strong> '+safe(stamp(data.capturedAt))+'. Requested '+safe(stamp(data.window.from*1000))+' to '+safe(stamp(data.window.to*1000))+'.',
   '<strong>Trade coverage:</strong> '+safe(c.scope)+' Loaded '+c.loaded+' of '+c.returned+' returned records within this window. '+c.invalid+' unreadable or unsupported; '+c.duplicates+' duplicate records removed.',
   '<strong>Chart:</strong> '+safe(data.notes.chart)+' '+data.candles.length+' completed candles loaded.'+(!data.chartAvailable?' Chart retrieval was unavailable.':''),
   '<strong>Wallets:</strong> '+safe(data.notes.wallets)+' '+c.unknownWallets+' swaps lack a sender; '+c.missingUsd+' lack USD volume.',
   '<strong>Saved link:</strong> '+safe(data.notes.retention)+' Available until '+safe(stamp(data.expiresAt))+'. New activity does not change a saved snapshot.',
   '<strong>Source:</strong> <a href="https://www.geckoterminal.com/solana/pools/'+safe(data.pool.address)+'" target="_blank" rel="noopener noreferrer">'+safe(data.source)+' · selected pool</a>. <a href="https://solscan.io/token/'+safe(data.mint)+'" target="_blank" rel="noopener noreferrer">Token on Solscan</a>. The order of trades alone does not establish what caused a price move.'
  ];
  if(data.associations?.length)paragraphs.push('<strong>Project labels:</strong> '+safe(data.notes.associations));
  $('rp-coverage-details').innerHTML=paragraphs.map(p=>'<p>'+p+'</p>').join('');
 }
 function drawChart(){
  const {from,to}=data.window,all=data.candles,visible=C.visibleCandles(all,cursor,data.intervalMinutes),filtered=C.through(data.trades,cursor,side,wallet);
  const prices=[...all.map(c=>c.close),...data.trades.map(t=>t.priceUsd).filter(p=>Number.isFinite(p)&&p>0)];
  const svg=$('rp-chart');
  if(!prices.length){svg.replaceChildren();$('rp-chart-empty').hidden=false;$('rp-chart-empty').querySelector('strong').textContent=data.chartAvailable?'No completed candles in this window.':'Candle history is unavailable.';$('rp-chart-empty').querySelector('p').textContent='Any loaded swaps remain available in the timeline and wallet table.';text('rp-price','—');return;}
  $('rp-chart-empty').hidden=true;
  let min=Math.min(...prices),max=Math.max(...prices),spread=max-min||max*.03||.01;min=Math.max(0,min-spread*.13);max+=spread*.13;
  const left=16,right=908,top=16,bottom=320,x=t=>left+(t-from)/(to-from)*(right-left),y=p=>bottom-(p-min)/(max-min)*(bottom-top),parts=[];
  for(let i=0;i<=4;i++){const yy=top+(bottom-top)*i/4,val=max-(max-min)*i/4;parts.push('<line x1="'+left+'" x2="'+right+'" y1="'+yy+'" y2="'+yy+'" stroke="#20304a" stroke-width="1" stroke-dasharray="2 6"/><text x="924" y="'+(yy+4)+'" fill="#7188a9" font-size="11" font-family="monospace">'+safe(price(val))+'</text>');}
  if(data.coverage.windowTruncated&&data.coverage.oldestReturned>from){const end=x(Math.min(to,data.coverage.oldestReturned));parts.push('<rect x="'+left+'" y="'+top+'" width="'+Math.max(0,end-left)+'" height="'+(bottom-top)+'" fill="#bc8b45" opacity=".055"/>');}
  let previous=null,path='';for(const candle of visible){const t=candle.time+data.intervalMinutes*60;if(t<from)continue;path+=(previous&&t-previous<=data.intervalMinutes*120?' L':' M')+x(t).toFixed(2)+' '+y(candle.close).toFixed(2);previous=t;}
  if(path)parts.push('<path d="'+path+'" fill="none" stroke="#8cbded" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>');
  for(const t of filtered){if(!Number.isFinite(t.priceUsd)||t.priceUsd<=0)continue;const xx=x(t.time),yy=y(t.priceUsd),isSelected=t.id===selected,color=t.side==='buy'?'#7edcbd':'#ee8f9e';parts.push('<circle cx="'+xx.toFixed(2)+'" cy="'+yy.toFixed(2)+'" r="'+(isSelected?6:3.3)+'" fill="'+color+'" opacity="'+(isSelected?1:.8)+'" stroke="'+(isSelected?'#e2efff':'#0a1525')+'" stroke-width="'+(isSelected?1.8:1)+'"/>');}
  const xx=x(cursor);parts.push('<line x1="'+xx+'" x2="'+xx+'" y1="6" y2="'+bottom+'" stroke="#8ec2ff" stroke-width="1" stroke-dasharray="4 4" opacity=".8"/><path d="M '+(xx-5)+' 4 L '+(xx+5)+' 4 L '+xx+' 11 Z" fill="#acd4ff"/>');
  svg.innerHTML=parts.join('');text('rp-price',price(visible.at(-1)?.close));svg.setAttribute('aria-label',data.pool.symbol+' price and loaded swap events through '+clock(cursor,true)+' UTC. Last completed close '+price(visible.at(-1)?.close)+'. Arrow keys move the playhead.');
 }
 function render(){
  if(!data)return;
  cursor=C.clamp(cursor,data.window.from,data.window.to);$('rp-timeline').value=String(Math.floor(cursor));$('rp-timeline').setAttribute('aria-valuetext',clock(cursor,true)+' UTC');text('rp-clock',clock(cursor,true)+' UTC');
  const trades=C.through(data.trades,cursor),summary=C.aggregate(trades),filtered=C.through(data.trades,cursor,side,wallet);
  text('rp-count',String(trades.length));text('rp-count-note','of '+data.trades.length+' loaded swaps');text('rp-wallet-count',String(summary.wallets.length));text('rp-buy-volume',sideUsd(summary,'buy'));text('rp-sell-volume',sideUsd(summary,'sell'));
  text('rp-buy-note',summary.buys+' loaded buys'+(summary.buyMissingUsd?' · USD incomplete':''));text('rp-sell-note',summary.sells+' loaded sells'+(summary.sellMissingUsd?' · USD incomplete':''));
  const pct=Math.round((cursor-data.window.from)/(data.window.to-data.window.from)*100);text('rp-playback-note',pct+'% of '+hours+'h window'+(wallet?' · Following '+short(wallet):' · Drag the timeline to inspect'));
  $('rp-wallet-filter').hidden=!wallet;text('rp-wallet-filter-label','Following '+short(wallet));
  $('rp-largest-buy').disabled=!C.largest(data.trades,'buy',wallet);$('rp-largest-sell').disabled=!C.largest(data.trades,'sell',wallet);
  drawChart();renderEvents(filtered);renderWallets(summary.wallets);
 }
 function renderEvents(trades){
  text('rp-event-count',String(trades.length));
  const shown=trades.slice(-eventLimit).reverse();
  $('rp-events').innerHTML=shown.length?shown.map(t=>'<article class="rp-event'+(t.id===selected?' selected':'')+'"><button type="button" data-rp-event="'+safe(t.id)+'" aria-label="Inspect '+t.side+' '+safe(usd(t.volumeUsd))+' at '+clock(t.time,true)+' UTC"><span class="rp-side-icon '+t.side+'" aria-hidden="true">'+(t.side==='buy'?'↗':'↘')+'</span><span class="rp-event-identity"><strong>'+safe(short(t.wallet))+'</strong><small>'+clock(t.time,true)+' UTC</small></span><span class="rp-event-value"><strong class="rp-'+t.side+'-text">'+safe(usd(t.volumeUsd))+'</strong><small>'+safe(number(t.tokenAmount))+' '+safe(data.pool.symbol)+'</small></span></button></article>').join(''):'<p class="rp-empty-copy">'+(data.trades.length?'No matching swaps through this point. Move the playhead forward or clear a filter.':'No swaps from this window were present in the recent provider response.')+'</p>';
  $('rp-more-events').hidden=trades.length<=eventLimit;
  const trade=selected?data.trades.find(t=>t.id===selected&&t.time<=cursor):null;$('rp-selected-event').hidden=!trade;
  if(trade)$('rp-selected-event').innerHTML='<p><strong>'+safe(trade.side==='buy'?'Buy':'Sell')+' · '+safe(number(trade.tokenAmount))+' '+safe(data.pool.symbol)+'</strong><br>'+clock(trade.time,true)+' UTC · '+safe(usd(trade.volumeUsd))+' reported volume</p><div><a href="https://solscan.io/tx/'+safe(trade.signature)+'" target="_blank" rel="noopener noreferrer">View transaction ↗</a>'+(trade.wallet?'<button type="button" data-rp-follow="'+safe(trade.wallet)+'">Follow sender ↗</button>':'')+'</div>';
 }
 function renderWallets(rows){
  text('rp-wallet-limit',rows.length>20?'Top 20 by loaded USD volume':rows.length+' sender'+(rows.length===1?'':'s'));
  $('rp-wallets').innerHTML=rows.slice(0,20).map(row=>{
   const known=data.associations?.find(a=>a.wallet===row.wallet),tone=[...row.wallet].reduce((n,c)=>n+c.charCodeAt(0),0)%360;
   const badge=known?'<span class="rp-wallet-badge">'+safe(known.role)+' · website association at capture</span>':'';
   return '<tr class="'+(row.wallet===wallet?'followed':'')+'"><td><button type="button" data-rp-follow="'+safe(row.wallet)+'" title="Follow '+safe(row.wallet)+'"><i class="rp-wallet-identicon" style="background:linear-gradient(140deg,hsl('+tone+' 30% 48%),#17243b)" aria-hidden="true"></i>'+safe(short(row.wallet))+'</button>'+badge+'</td><td>'+row.count+(row.buys&&row.sells?' <span title="Both buys and sells are present">↔</span>':'')+'</td><td class="rp-buy-text">'+safe(sideUsd(row,'buy'))+'</td><td class="rp-sell-text">'+safe(sideUsd(row,'sell'))+'</td><td>'+safe((row.netTokens>0?'+':'')+number(row.netTokens))+'</td><td><a href="https://solscan.io/account/'+safe(row.wallet)+'" target="_blank" rel="noopener noreferrer" aria-label="Open '+safe(row.wallet)+' on Solscan">Solscan ↗</a></td></tr>';
  }).join('')||'<tr><td colspan="6" class="rp-table-empty">No sender activity through this point in the loaded history.</td></tr>';
 }
 function setCursor(value){if(!data)return;stop();cursor=C.clamp(value,data.window.from,data.window.to);render();}
 function selectEvent(id){const t=data?.trades.find(t=>t.id===id);if(!t)return;selected=id;setCursor(t.time);$('rp-selected-event').querySelector('a')?.focus();}
 function follow(value){stop();wallet=C.address(value)?value:'';selected='';eventLimit=35;render();if(wallet)$('rp-clear-wallet').focus();else document.querySelector('[data-rp-side="all"]')?.focus();}
 function tick(now){
  if(!playing||!data)return;if(!lastFrame)lastFrame=now;
  const delta=Math.min(now-lastFrame,250)/1000;lastFrame=now;cursor+=(data.window.to-data.window.from)/90*Number($('rp-speed').value)*delta;
  if(cursor>=data.window.to){cursor=data.window.to;stop();render();return;}
  if(now-lastRender>=120){render();lastRender=now;}frame=requestAnimationFrame(tick);
 }
 $('rp-play').addEventListener('click',()=>{if(!data)return;if(playing){stop();return;}if(cursor>=data.window.to)cursor=data.window.from;selected='';playing=true;$('rp-play').innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg><span>Pause</span>';$('rp-play').setAttribute('aria-label','Pause replay');frame=requestAnimationFrame(tick);});
 $('rp-rewind').addEventListener('click',()=>{selected='';setCursor(data.window.from);});$('rp-end').addEventListener('click',()=>setCursor(data.window.to));$('rp-timeline').addEventListener('input',e=>{selected='';setCursor(Number(e.target.value));});
 ['buy','sell'].forEach(kind=>$('rp-largest-'+kind).addEventListener('click',()=>{const t=C.largest(data.trades,kind,wallet);if(t){side='all';toggles();selectEvent(t.id);}}));
 $('rp-form').addEventListener('submit',e=>{e.preventDefault();wallet='';side='all';load();});
 document.querySelectorAll('[data-rp-hours]').forEach(button=>button.addEventListener('click',()=>{hours=Number(button.dataset.rpHours);load();}));
 document.querySelectorAll('[data-rp-mint]').forEach(button=>button.addEventListener('click',()=>{$('rp-mint').value=button.dataset.rpMint;wallet='';side='all';load();}));
 document.querySelectorAll('[data-rp-side]').forEach(button=>button.addEventListener('click',()=>{side=button.dataset.rpSide;selected='';eventLimit=35;toggles();render();}));
 $('rp-refresh').addEventListener('click',()=>load());$('rp-retry').addEventListener('click',()=>load(lastRequest));$('rp-clear-wallet').addEventListener('click',()=>follow(''));
 $('rp-more-events').addEventListener('click',()=>{eventLimit+=50;render();});
 $('replay-main').addEventListener('click',e=>{const event=e.target.closest('[data-rp-event]'),sender=e.target.closest('[data-rp-follow]');if(event)selectEvent(event.dataset.rpEvent);if(sender)follow(sender.dataset.rpFollow);});
 ['rp-events','rp-wallets','rp-selected-event'].forEach(id=>$(id).addEventListener('focusin',stop));
 $('rp-chart').addEventListener('pointerdown',e=>{if(!data)return;const box=e.currentTarget.getBoundingClientRect(),fraction=((e.clientX-box.left)/box.width*1000-16)/(908-16);selected='';setCursor(data.window.from+C.clamp(fraction,0,1)*(data.window.to-data.window.from));});
 $('rp-chart').addEventListener('keydown',e=>{if(!data||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();selected='';setCursor(e.key==='Home'?data.window.from:e.key==='End'?data.window.to:cursor+(e.key==='ArrowLeft'?-60:60)*(e.shiftKey?10:1));});
 $('rp-share').addEventListener('click',async()=>{if(!data)return;const url=C.shareURL(location.origin,data,cursor,{wallet,side}),expiry=stamp(data.expiresAt);try{await navigator.clipboard.writeText(url);status('Replay link copied. This captured snapshot is available until '+expiry+'.');}catch{$('rp-share-fallback').hidden=false;$('rp-share-url').value=url;$('rp-share-fallback').querySelector('p').textContent='This link preserves the captured snapshot and playhead until '+expiry+'.';$('rp-share-url').focus();$('rp-share-url').select();}});
 $('rp-export').addEventListener('click',()=>{if(!data)return;const blob=new Blob([JSON.stringify({...data,exportedAt:new Date().toISOString(),playhead:Math.floor(cursor)},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='parallax-replay-'+data.mint.slice(0,8)+'-'+data.capturedAt.slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('pagehide',()=>{stop();controller?.abort();});
 $('rp-mint').value=linkState.mint||PRLX;toggles();load({snapshot:linkState.snapshot,pool:linkState.pool,at:linkState.at});
})();
