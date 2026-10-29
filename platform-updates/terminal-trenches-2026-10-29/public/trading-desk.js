(()=>{'use strict';
const $=id=>document.getElementById(id),terminal=window.ParallaxTerminal,SOL='So11111111111111111111111111111111111111112';
if(!terminal||!$('desk-position'))return;
const chartUnits=window.ParallaxTerminalChart;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const valid=v=>typeof v==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
const finite=n=>typeof n==='number'&&Number.isFinite(n),fmt=n=>finite(n)?new Intl.NumberFormat('en-US',{maximumSignificantDigits:7}).format(n):'—';
const usd=n=>finite(n)?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(n):'—';
const short=s=>s.slice(0,5)+'…'+s.slice(-5),clock=t=>new Date(t).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'});
const info=(id,message,error=false)=>{$(id).textContent=message;$(id).classList.toggle('error',error);};
let wallet=null,provider=null,position=null,epoch=0,loading=false,demo=false,alive=true,activeMint=terminal.getSelection().mint,loadController=null;
let chart=null,series=null,candleSeries=null,lineSeries=null,volumeSeries=null,volumeShown=null,markers=null,entryLine=null,chartData=null,chartCrosshair=null,chartKey='',chartFitted=false,hoveredTime=null,chartView='snapshot',chartStyle='candles',logScale=false,showVolume=true,lastChartRefresh=0,refreshTimers=[],connecting=false,demoCurrency='usd',lastRenderedMarkFresh=false;
let chartDisplay=null,chartMeasure='valuation';
try{const savedMeasure=sessionStorage.getItem('parallax:terminal-measure');if(['cap','fdv','price'].includes(savedMeasure))chartMeasure=savedMeasure;}catch{}
const markIsFresh=mark=>!!mark&&!mark.stale&&Number.isFinite(Date.parse(mark.fetchedAt))&&Date.now()-Date.parse(mark.fetchedAt)<120000;
const clearTimers=()=>{refreshTimers.forEach(clearTimeout);refreshTimers=[];};
function setMetric(id,value,sign=false){$(id).textContent=value;$(id).classList.remove('positive','negative');if(sign&&value!=='—')$(id).classList.add(value.startsWith('-')?'negative':'positive');}
function walletUI(){
 $('desk-wallet-label').textContent=wallet?short(wallet):'Wallet disconnected';$('desk-connect').textContent=connecting?'Connecting…':wallet?'Refresh connection':'Connect Phantom';
 $('desk-connect').disabled=connecting||demo;$('desk-disconnect').hidden=!wallet;$('desk-disconnect').disabled=demo;
 $('desk-refresh').disabled=loading||!wallet||demo;
 const canSell=!!position&&!loading&&!demo&&position.wallet===wallet&&position.mint===activeMint&&BigInt(position.balance.rawAmount)>0n&&!position.balance.frozen;
 document.querySelectorAll('[data-sell-percent]').forEach(b=>b.disabled=!canSell);$('desk-custom-sell').disabled=!canSell;
 terminal.refreshSwapLabels();
}
function clearPosition(){
 ++epoch;if($('desk-pending')){$('desk-pending').hidden=true;$('desk-pending').textContent='';}loading=false;loadController?.abort();loadController=null;position=null;clearTimers();$('desk-order-note').hidden=true;
 ['desk-balance','desk-entry','desk-unrealized','desk-realized'].forEach(id=>setMetric(id,'—'));
 $('desk-balance-value').textContent='Selected token';$('desk-entry-currency').textContent='Per token';$('desk-unrealized-percent').textContent='Current position';
 $('desk-position-empty').hidden=false;$('desk-position-state').textContent=wallet?'Ready to load':'Not connected';$('desk-position-state').dataset.state='empty';
 $('desk-fill-count').textContent='0 fills loaded';$('desk-fills').innerHTML='<p class="desk-fills-empty">Connect your wallet to see supported entries and exits for this token.</p>';
 $('desk-basis-note').textContent='Entry cost appears only when supported history reconciles with the token balance. Transfers and missing history remain unknown.';
 $('desk-signin').hidden=true;info('desk-position-status',wallet?'Loading your selected position…':'Your wallet stays in control. Each sale needs your approval.');
 updateMarkers();walletUI();
}
function renderPosition(){
 if(!position)return;const {balance,basis,mark}=position,quantity=Number(balance.amount),quote=basis.quoteSymbol||'';
 $('desk-position-empty').hidden=true;$('desk-position-title').textContent=demo?'Sample position':'Your position';
 $('desk-position-state').textContent=demo?'Sample data':balance.frozen?'Frozen account':basis.status==='reconciled'?'Reconciled':'Partial history';
 $('desk-position-state').dataset.state=demo?'demo':basis.status==='reconciled'?'ready':'partial';
 const markFresh=markIsFresh(mark);lastRenderedMarkFresh=markFresh;
 setMetric('desk-balance',fmt(quantity));$('desk-balance-value').textContent=markFresh&&finite(mark.priceUsd)?usd(quantity*mark.priceUsd)+' · market estimate':mark?'Market price delayed':'Market value unavailable';
 setMetric('desk-entry',finite(basis.averageEntry)?fmt(basis.averageEntry):'Unknown');$('desk-entry-currency').textContent=quote?quote+' per token':'Acquisition cost unavailable';
 const price=markFresh&&mark.quoteMint===basis.quoteMint&&finite(mark.priceQuote)?mark.priceQuote:null;
 const pnl=price!==null&&finite(basis.remainingCost)&&quantity>0?quantity*price-basis.remainingCost:null;
 setMetric('desk-unrealized',pnl===null?'—':(pnl>0?'+':'')+fmt(pnl)+' '+quote,true);
 $('desk-unrealized-percent').textContent=pnl!==null&&basis.remainingCost>0?(pnl>0?'+':'')+fmt(pnl/basis.remainingCost*100)+'% · gross estimate':quantity===0?'No open balance':'Needs matched price and cost';
 setMetric('desk-realized',finite(basis.realized)?(basis.realized>0?'+':'')+fmt(basis.realized)+' '+quote:'—',true);
 $('desk-basis-note').textContent=[...(basis.reasons||[]),basis.method].filter(Boolean).join(' ');
 $('desk-coverage').textContent=position.coverage;
 const fills=position.trades.slice().reverse();$('desk-fill-count').textContent=fills.length+' supported '+(fills.length===1?'fill':'fills');
 $('desk-fills').innerHTML=fills.length?fills.map(t=>`<div class="fill-row"><span class="fill-side ${t.side==='sell'?'sell':''}">${esc(t.side.toUpperCase())}</span><div><strong>${esc(fmt(Number(t.tokenAmount)))} tokens</strong><small>${esc(new Date(t.time*1000).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}))}</small></div><div class="fill-price"><strong>${esc(fmt(t.executionPrice))} ${esc(t.quoteSymbol)}</strong><small>${esc(fmt(Number(t.quoteAmount)))} ${esc(t.quoteSymbol)} total</small></div>${demo?'<span aria-label="Simulated trade">·</span>':`<a href="https://solscan.io/tx/${encodeURIComponent(t.signature)}" target="_blank" rel="noopener noreferrer" aria-label="View ${esc(t.side)} transaction">↗</a>`}</div>`).join(''):'<p class="desk-fills-empty">No supported swaps in the loaded window. An existing balance may have been acquired earlier or transferred in.</p>';
 info('desk-position-status',demo?'Sample only. These figures are simulated; trading is disabled.':(balance.frozen?'A token account is frozen. Selling from this panel is disabled. ':'')+'Finalized balance and history · Updated '+clock(Date.parse(position.fetchedAt))+'. Refresh after a trade settles.');
 updateMarkers();walletUI();
}
async function loadPosition(){
 if(!wallet||!valid(activeMint)||demo||!alive||loading)return false;
 const requestWallet=wallet,token=activeMint,id=++epoch;loadController?.abort();const controller=new AbortController();loadController=controller;loading=true;walletUI();
 info('desk-position-status','Checking finalized holdings and supported trade history…');
 try{
  const response=await fetch('/api/terminal/position',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({wallet:requestWallet,mint:token}),signal:AbortSignal.any([controller.signal,AbortSignal.timeout(30000)])});
  let d;try{d=await response.json();}catch{throw Error('The position service returned an unreadable response.');}
  if(id!==epoch||!alive||demo||wallet!==requestWallet||activeMint!==token)return false;
  if(!response.ok){$('desk-signin').hidden=response.status!==401;throw Error(d.error||'Position could not be loaded.');}
  if(d.wallet!==requestWallet||d.mint!==token||!d.balance||!/^\d+$/.test(d.balance.rawAmount)||!Array.isArray(d.trades)||!d.basis)throw Error('The position response did not match this wallet and token.');
  position=d;$('desk-signin').hidden=true;renderPosition();return true;
 }catch(e){if(id===epoch&&e.name!=='AbortError'){if(position){position.mark=null;renderPosition();}info('desk-position-status',(e.name==='TimeoutError'?'Position request timed out. Please retry.':e.message)+(position?' Previous holdings may be stale.':''),true);}}
 finally{if(id===epoch){loading=false;walletUI();}}
 return false;
}
function changedWallet(key){
 const next=key?.toString?.()||null;if(next===wallet)return;
 if(wallet)terminal.closeSwap();wallet=valid(next)?next:null;clearPosition();terminal.syncWallet?.();
 if(wallet){info('desk-connection-status','Connected '+short(wallet)+'. Position reads do not request a signature.');loadPosition();}
 else info('desk-connection-status','Wallet disconnected. Private position data cleared.');
}
async function connect(){
 if(demo||connecting)return;const p=window.phantom?.solana||window.solana;
 if(!p?.isPhantom){info('desk-connection-status','Open this page inside Phantom’s browser on your phone, or use the Phantom browser extension.');$('phantom-open').scrollIntoView({behavior:'smooth',block:'center'});return;}
 connecting=true;walletUI();
 try{
  if(provider!==p){provider?.removeListener?.('accountChanged',changedWallet);provider?.removeListener?.('disconnect',disconnected);provider=p;p.on?.('accountChanged',changedWallet);p.on?.('disconnect',disconnected);}
  const result=await p.connect();changedWallet(result.publicKey);if(wallet&&!position&&!loading)loadPosition();
 }catch(e){info('desk-connection-status',e.code===4001?'Connection cancelled.':e.message||'Could not connect Phantom.',true);}
 finally{connecting=false;walletUI();}
}
function disconnected(){changedWallet(null);}
async function disconnect(){terminal.closeSwap();changedWallet(null);try{await provider?.disconnect();}catch{}}
function walletOptions(){
 if(!wallet||!provider||demo)return {enableWalletPassthrough:true,onRequestConnectWallet:connect,passthroughWalletContextState:{publicKey:null,wallet:null,wallets:[],connected:false,connecting:false,disconnecting:false,autoConnect:false,select:()=>{},connect,disconnect,sendTransaction:async()=>{throw Error('Connect a wallet first.');}}};
 const expected=wallet,p=provider,pk=p.publicKey;
 const check=()=>{if(demo||wallet!==expected||p.publicKey?.toString()!==expected)throw Error('Wallet changed. Reopen the trade for the connected account.');};
 const signTransaction=async tx=>{check();return p.signTransaction(tx);};
 const signAllTransactions=async txs=>{check();return p.signAllTransactions(txs);};
 const signMessage=async bytes=>{check();const r=await p.signMessage(bytes,'utf8');return r.signature;};
 const sendTransaction=async(tx,_connection,options)=>{check();const result=await p.signAndSendTransaction(tx,options);return result.signature;};
 const adapter={name:'Phantom',url:'https://phantom.com',icon:'https://phantom.com/img/phantom-logo.svg',readyState:'Installed',publicKey:pk,connected:true,connecting:false,supportedTransactionVersions:new Set(['legacy',0]),connect,disconnect,signTransaction,signAllTransactions,signMessage,sendTransaction,on:p.on?.bind(p),off:p.removeListener?.bind(p)};
 return {enableWalletPassthrough:true,onRequestConnectWallet:connect,passthroughWalletContextState:{autoConnect:false,wallets:[{adapter,readyState:'Installed'}],wallet:{adapter,readyState:'Installed'},publicKey:pk,connected:true,connecting:false,disconnecting:false,select:()=>{},connect,disconnect,signTransaction,signAllTransactions,signMessage,sendTransaction}};
}
function decimal(raw,decimals){const s=raw.padStart(decimals+1,'0');return decimals?(s.slice(0,-decimals)+'.'+s.slice(-decimals)).replace(/\.?0+$/,''):s;}
async function sell(percent){
 if(demo||!wallet||loading)return;const expected=wallet,token=activeMint;
 if(!position||Date.now()-Date.parse(position.fetchedAt)>15000){if(!await loadPosition())return;}
 if(demo||wallet!==expected||activeMint!==token||!position||position.wallet!==wallet||position.mint!==token||position.balance.frozen)return;
 const raw=BigInt(position.balance.rawAmount);if(raw<=0n)return;
 const selected=percent?raw*BigInt(percent)/100n:null;if(selected===0n){info('desk-position-status','That percentage is below the token’s smallest unit.',true);return;}
 $('desk-order-note').hidden=false;$('desk-order-note').textContent=selected!==null?'Review sale: '+decimal(selected.toString(),position.balance.decimals)+' tokens ('+percent+'%) · '+short(wallet):'Custom sale · '+short(wallet)+'. Enter the amount in the swap form.';
 await terminal.openPositionSell({amountRaw:selected===null?null:selected.toString()});
}
const candleDateFormat=new Intl.DateTimeFormat('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'UTC'});
const candleTime=time=>candleDateFormat.format(new Date(time*1000))+' UTC';
const volumeAvailable=candle=>finite(candle.volume)&&candle.volume>=0;
function chartReady(){return !!(alive&&chart&&chartData?.candles.length&&(demo||chartView==='snapshot'));}
function chartControls(){
 const native=demo||chartView==='snapshot',ready=chartReady();
 $('desk-chart-tools').hidden=!native;$('desk-chart-hover').hidden=!native;
 document.querySelectorAll('[data-chart-style]').forEach(button=>{button.disabled=!ready;button.setAttribute('aria-pressed',String(button.dataset.chartStyle===chartStyle));});
 ['desk-fit','desk-live','desk-log','desk-volume'].forEach(id=>$(id).disabled=!ready);
 $('desk-log').setAttribute('aria-pressed',String(logScale));$('desk-volume').setAttribute('aria-pressed',String(showVolume));
 if(ready&&!chartData.candles.some(volumeAvailable))$('desk-volume').disabled=true;
 const capBasis=chartUnits?.capBasis(chartData),fdvBasis=chartUnits?.fdvBasis(chartData),measure=chartDisplay?.measure||'price',basis=measure==='fdv'?fdvBasis:capBasis;
 $('desk-measure-cap').disabled=!ready||demo||!capBasis?.available;$('desk-measure-fdv').disabled=!ready||demo||!fdvBasis?.available;$('desk-measure-price').disabled=!ready||demo;
 for(const value of ['cap','fdv','price'])$('desk-measure-'+value).setAttribute('aria-pressed',String(ready&&measure===value));
 $('desk-measure-cap').title=capBasis?.available?'Estimate historical market cap using the current reported supply basis.':capBasis?.reason||'Market cap requires a matching reported value and USD price.';
 $('desk-measure-fdv').title=fdvBasis?.available?'Estimate fully diluted valuation using the current diluted supply basis.':fdvBasis?.reason||'FDV requires a matching reported value and USD price.';
 const note=$('desk-chart-basis');note.hidden=!native;
 if(!ready)note.textContent='';
 else if(measure!=='price'){note.textContent=(measure==='fdv'?'Estimated FDV · current diluted supply basis':'Estimated market cap · current supply basis')+' · '+new Date(basis.observedAt).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+'. Historical supply changes are not reflected.';note.title=basis.source+' · Reported '+(measure==='fdv'?'FDV':'market cap')+' ÷ matching USD price = '+fmt(basis.factor)+' implied '+(measure==='fdv'?'fully diluted':'circulating')+' tokens. Observed '+new Date(basis.observedAt).toLocaleString()+'.';}
 else{note.textContent=demo?'Sample prices · simulated data':capBasis?.available||fdvBasis?.available?'Price per token · valuation views use a current supply estimate.':(capBasis?.reason||'Valuation conversion is unavailable.')+' Price per token is shown.';note.title='';}
}
function renderChartReadout(){
 const readout=$('desk-chart-hover');
 if(!chartData?.candles.length){readout.textContent=chartData?'No candle data for this market.':'';return;}
 const hovered=hoveredTime===null?null:chartData.candles.find(c=>c.time===hoveredTime),candle=hovered||chartData.candles.at(-1);
 if(!hovered)hoveredTime=null;
 const associated=chartTrades().filter(t=>Math.floor(t.time/(chartData.intervalMinutes*60))*(chartData.intervalMinutes*60)===candle.time);
 const displayed=chartDisplay?.candles.find(row=>row.time===candle.time)||candle,cap=chartDisplay?.measure==='cap'||chartDisplay?.measure==='fdv',valueLabel=chartDisplay?.measure==='fdv'?'FDV':'cap';
 const prices=[['O','Open',displayed.open],['H','High',displayed.high],['L','Low',displayed.low],['C','Close',displayed.close]];
 readout.innerHTML='<span class="chart-readout-context"><span class="chart-readout-mode">'+(demo?'Sample · ':'')+(hovered?'Candle':'Latest candle')+'</span><time datetime="'+new Date(candle.time*1000).toISOString()+'">'+esc(candleTime(candle.time))+'</time><span class="chart-readout-currency">'+esc(chartData.currency)+(cap?' · Est. '+valueLabel:' · Price')+'</span></span>'+
  '<span class="chart-readout-prices" data-direction="'+(candle.close>=candle.open?'up':'down')+'">'+prices.map(([label,title,value])=>'<span><abbr title="'+title+'">'+label+'</abbr> <strong title="'+esc(cap?'Estimated '+valueLabel+' $'+String(value):String(value)+' '+chartData.currency+' per token')+'">'+esc(cap?chartUnits.formatAxis(value):fmt(value))+'</strong></span>').join('')+'</span>'+
  (cap?'<span class="chart-readout-price">Token price <strong title="'+esc(String(candle.close)+' USD per token')+'">'+esc(chartUnits.formatAxis(candle.close))+'</strong></span>':'')+
  '<span class="chart-readout-volume"><abbr title="Volume reported by the candle provider">V</abbr> <strong>'+esc(volumeAvailable(candle)?fmt(candle.volume):'Unavailable')+'</strong></span>'+
  (associated.length?'<span class="chart-readout-fills">'+associated.map(t=>esc(t.side.toUpperCase()+' '+fmt(Number(t.tokenAmount))+' @ '+fmt(t.executionPrice)+' '+t.quoteSymbol)).join(' · ')+'</span>':'');
}
function syncVolumeVisibility(){
 const visible=showVolume&&chartData.candles.some(volumeAvailable);if(visible===volumeShown)return;
 volumeSeries.applyOptions({visible});chart.priceScale('right').applyOptions({scaleMargins:{top:.1,bottom:visible ? .25 : .09}});volumeShown=visible;
}
function disposeChart(){
 if(chart){try{if(chartCrosshair)chart.unsubscribeCrosshairMove(chartCrosshair);if(markers)markers.detach();chart.remove();}catch{}}
 chart=null;series=null;candleSeries=null;lineSeries=null;volumeSeries=null;volumeShown=null;markers=null;entryLine=null;chartData=null;chartDisplay=null;chartCrosshair=null;chartKey='';chartFitted=false;hoveredTime=null;
 $('market-chart').classList.remove('native-chart');$('desk-chart-hover').textContent='';chartControls();
}
function chartModeChanged(mode){chartView=mode;chartControls();}
function setChartMeasure(measure){
 if(!chartReady()||demo||!['cap','fdv','price'].includes(measure))return;
 if(measure!=='price'&&!(measure==='fdv'?chartUnits?.fdvBasis(chartData):chartUnits?.capBasis(chartData))?.available)return;
 chartMeasure=measure;try{sessionStorage.setItem('parallax:terminal-measure',measure);}catch{}
 if(measure!=='price'&&chartData.chartCurrency!=='usd'){
  $('desk-chart-currency').value='usd';terminal.setChart(String(chartData.intervalMinutes||1),'usd');
  $('desk-chart-basis').textContent='Loading USD candles for the '+(measure==='fdv'?'FDV':'market cap')+' view…';return;
 }
 const range=chart.timeScale().getVisibleRange();renderChart(chartData);if(range)chart.timeScale().setVisibleRange(range);
}
function setChartStyle(style){
 if(!chartReady()||!['candles','line'].includes(style)||style===chartStyle)return;
 const scale=chart.timeScale(),view=scale.getVisibleLogicalRange();
 if(entryLine){series.removePriceLine(entryLine);entryLine=null;}markers.detach();chartStyle=style;
 candleSeries.applyOptions({visible:style==='candles'});lineSeries.applyOptions({visible:style==='line'});
 series=style==='candles'?candleSeries:lineSeries;markers=window.LightweightCharts.createSeriesMarkers(series,[]);
 if(view)scale.setVisibleLogicalRange(view);
 updateMarkers();chartControls();
}
function renderChart(data){
 if(!alive||demo&&!data.demo)return;
 const previous=chartData;lastChartRefresh=Date.now();chartModeChanged('snapshot');
 const display=chartUnits?chartUnits.display(data,chartMeasure):{measure:'price',candles:data.candles,currency:data.currency,factor:1};
 const key=data.mint+':'+data.pool+':'+data.chartCurrency+':'+data.currency+':'+data.intervalMinutes+':'+!!data.demo+':'+display.measure;
 const axis=value=>chartUnits?chartUnits.formatAxis(value,display.currency):fmt(value);
 if(!window.LightweightCharts){disposeChart();$('market-chart').innerHTML='<div class="empty-chart"><p>The native chart could not load. Use DEX Screener above.</p></div>';return;}
 if(!chart||key!==chartKey){
  disposeChart();chartKey=key;$('market-chart').replaceChildren();$('market-chart').classList.add('native-chart');
  const L=window.LightweightCharts;volumeShown=showVolume&&data.candles.some(volumeAvailable);
  chart=L.createChart($('market-chart'),{
   autoSize:true,height:matchMedia('(max-width:760px)').matches?370:540,
   layout:{background:{type:L.ColorType.Solid,color:'#101314'},textColor:'#9da7a3',fontSize:12,fontFamily:'Inter, ui-sans-serif, system-ui, sans-serif',attributionLogo:true},
   grid:{vertLines:{color:'rgba(194,203,199,.025)'},horzLines:{color:'rgba(194,203,199,.06)'}},
   rightPriceScale:{mode:logScale?L.PriceScaleMode.Logarithmic:L.PriceScaleMode.Normal,borderColor:'rgba(194,203,199,.12)',minimumWidth:82,ticksVisible:true,scaleMargins:{top:.1,bottom:volumeShown ? .25 : .09}},
   timeScale:{borderColor:'rgba(194,203,199,.12)',timeVisible:true,secondsVisible:false,rightOffset:8,barSpacing:8,minBarSpacing:3,minimumHeight:30,ticksVisible:true,lockVisibleTimeRangeOnResize:true},
   crosshair:{mode:L.CrosshairMode.Normal,vertLine:{color:'#9da7a360',labelBackgroundColor:'#28312d'},horzLine:{color:'#9da7a360',labelBackgroundColor:'#28312d'}},
   handleScroll:{vertTouchDrag:false},localization:{locale:'en-US',priceFormatter:axis,timeFormatter:candleTime}
  });
  const close=display.candles.at(-1)?.close||1,precision=Math.max(2,Math.min(12,Math.ceil(-Math.log10(close))+4));
  const priceOptions={priceFormat:{type:'custom',formatter:axis,minMove:10**-precision},priceLineVisible:true,priceLineSource:L.PriceLineSource.LastBar,priceLineColor:'#7ad6b0',priceLineWidth:1,priceLineStyle:L.LineStyle.Dashed,lastValueVisible:true};
  candleSeries=chart.addSeries(L.CandlestickSeries,{...priceOptions,visible:chartStyle==='candles',upColor:'#7ad6b0',downColor:'#dd879b',wickUpColor:'#7ad6b0',wickDownColor:'#dd879b',borderVisible:false});
  // The line is the same provider candles' closes. No smoothing or invented intrabar prices.
  lineSeries=chart.addSeries(L.LineSeries,{...priceOptions,visible:chartStyle==='line',color:'#7ad6b0',lineWidth:2,lineType:L.LineType.Simple,crosshairMarkerRadius:4,crosshairMarkerBorderColor:'#101314',crosshairMarkerBackgroundColor:'#7ad6b0'});
  volumeSeries=chart.addSeries(L.HistogramSeries,{visible:volumeShown,priceFormat:{type:'volume'},priceScaleId:'volume',lastValueVisible:false,priceLineVisible:false});
  chart.priceScale('volume').applyOptions({scaleMargins:{top:.84,bottom:0},visible:false});
  series=chartStyle==='candles'?candleSeries:lineSeries;
  markers=L.createSeriesMarkers(series,[]);
  const createdChart=chart;
  chartCrosshair=param=>{if(!alive||chart!==createdChart)return;const next=finite(param.time)&&chartData?.candles.some(c=>c.time===param.time)?param.time:null;if(next===hoveredTime)return;hoveredTime=next;renderChartReadout();};
  chart.subscribeCrosshairMove(chartCrosshair);
 }
 chartData=data;chartDisplay=display;
 const scale=chart.timeScale(),logical=chartFitted?scale.getVisibleLogicalRange():null;
 // Preserve the actual times being inspected when a rolling response drops its oldest bar.
 // At the right edge, retain the chart library's natural follow-the-latest behavior.
 const inspectingHistory=logical&&previous?.candles?.length&&logical.to<previous.candles.length-2;
 const viewed=inspectingHistory?scale.getVisibleRange():null;
 candleSeries.setData(display.candles);lineSeries.setData(display.candles.map(c=>({time:c.time,value:c.close})));
 volumeSeries.setData(data.candles.filter(volumeAvailable).map(c=>({time:c.time,value:c.volume,color:c.close>=c.open?'rgba(122,214,176,.25)':'rgba(221,135,155,.25)'})));
 if(!chartFitted&&data.candles.length){scale.fitContent();chartFitted=true;}else if(viewed&&data.candles.length)scale.setVisibleRange(viewed);
 syncVolumeVisibility();updateMarkers();chartControls();
 if(!data.candles.length)info('chart-status','No candles are available for this pool and interval.');
}
function chartTrades(){return position&&position.mint===chartData?.mint?position.trades:[];}
function updateMarkers(){
 if(!series||!markers||!chartData)return;
 if(entryLine){series.removePriceLine(entryLine);entryLine=null;}
 const candles=chartData.candles,first=candles[0]?.time,last=candles.at(-1)?.time,span=chartData.intervalMinutes*60;
 let matched=[];
 for(const t of chartTrades()){
  const bucket=Math.floor(t.time/span)*span;
  if(bucket<first||bucket>last)continue;
  // Only place a time marker on an existing candle. Never invent a fill price in USD.
  if(!candles.some(c=>c.time===bucket))continue;
  matched.push({time:bucket,position:t.side==='buy'?'belowBar':'aboveBar',color:t.side==='buy'?'#7ad6b0':'#dd879b',shape:t.side==='buy'?'arrowUp':'arrowDown',text:t.side==='buy'?'B':'S',id:t.signature});
 }
 if(chartUnits)matched=chartUnits.tradeMarkers(chartTrades(),candles,chartData.intervalMinutes);
 matched.sort((a,b)=>a.time-b.time);markers.setMarkers(matched);
 const basis=position?.basis;
 const entry=chartUnits?chartUnits.entryPrice(chartData,position,chartDisplay?.measure):basis&&position.mint===chartData.mint&&chartData.chartCurrency==='token'&&chartData.quoteMint===basis.quoteMint&&finite(basis.averageEntry)&&basis.averageEntry>0?basis.averageEntry:null;
 if(entry!==null){entryLine=series.createPriceLine({price:entry,color:'#d8b97d',lineWidth:1,lineStyle:2,axisLabelVisible:true,title:'AVG ENTRY'});}
 if(demo)$('chart-note').textContent='Hover or drag the chart. B = sample buy. S = sample sell. Gold line = average entry.';
 else{const extra=chartTrades().length-matched.length;$('chart-note').textContent=chartData.source+' · '+chartData.intervalMinutes+'m · '+chartData.currency+'. '+(chartTrades().length?'Markers show trade times; hover for actual fills.'+(extra?' '+extra+' fills are outside the loaded candles.':'')+(basis?.averageEntry&&chartData.chartCurrency!=='token'?' Choose Pool currency to show a matching average-entry line.':''):'Provider snapshots · updates every 30s while visible.');}
 if(chartStyle==='line')$('chart-note').textContent+=' Line shows candle closes.';
 renderChartReadout();
}
function swapReported(signature,token){
 if(demo||token!==activeMint)return;if(!wallet){info('desk-position-status','Swap reported. Connect the trading wallet here to load your fills.');return;}clearTimers();const w=wallet;const receipt=$('desk-pending');if(receipt){receipt.hidden=false;receipt.innerHTML='<span class="pending-dot"></span><div><strong>Swap reported · verifying your fill</strong><a href="https://solscan.io/tx/'+encodeURIComponent(signature)+'" target="_blank" rel="noopener noreferrer">View transaction ↗</a></div>';}
 info('desk-position-status','Swap reported. Waiting for finalized history before updating your position.');
 for(const delay of [4000,12000,30000])refreshTimers.push(setTimeout(async()=>{if(!alive||demo||wallet!==w||activeMint!==token||document.hidden)return;await loadPosition();if(position?.trades.some(t=>t.signature===signature)){clearTimers();if($('desk-pending'))$('desk-pending').hidden=true;info('desk-position-status','Trade found in finalized history. Position updated.');terminal.refreshChart();}else if(delay===30000){if($('desk-pending'))$('desk-pending').querySelector('strong').textContent='Fill not indexed yet · check the transaction';info('desk-position-status','Trade is not in finalized history yet. Check the transaction link and refresh your position shortly.');}},delay));
}
function sample(){
 const now=Math.floor(Date.now()/60000)*60,candles=[];let close=.000014;
 for(let i=0;i<120;i++){const open=close,drift=Math.sin(i*.31)*.00000045+Math.cos(i*.17)*.0000002+.00000009;close=Math.max(.000004,open+drift);candles.push({time:now-(119-i)*60,open,close,high:Math.max(open,close)+.00000032,low:Math.min(open,close)-.0000003,volume:0});}
 const mk=(i,side,amount)=>({signature:'sample-'+i,time:candles[i].time,side,tokenAmount:String(amount),quoteAmount:String(amount*candles[i].close),quoteMint:SOL,quoteSymbol:'SOL',executionPrice:candles[i].close});
 const trades=[mk(22,'buy',50000),mk(48,'buy',25000),mk(84,'sell',15000)],average=(Number(trades[0].quoteAmount)+Number(trades[1].quoteAmount))/75000,remaining=60000;
 return {candles,position:{wallet:'sample',mint:activeMint,fetchedAt:new Date().toISOString(),balance:{rawAmount:'60000000000',amount:String(remaining),decimals:6,frozen:false},trades,basis:{status:'reconciled',quoteMint:SOL,quoteSymbol:'SOL',remainingCost:remaining*average,averageEntry:average,realized:Number(trades[2].quoteAmount)-15000*average,reasons:[],method:'Simulated weighted-average example. No funds or wallet are involved.'},mark:{priceUsd:close*150,priceQuote:close,quoteMint:SOL,fetchedAt:new Date().toISOString()},coverage:'Sample data for exploring the layout. These are not actual trades or market prices.'}};
}
function enterDemo(){
 terminal.closeSwap();terminal.suspendChart();clearPosition();demo=true;document.body.classList.add('desk-demo-active');$('desk-demo-banner').hidden=false;$('desk-demo').textContent='Exit sample';
 $('desk-position-title').textContent='Sample position';$('desk-connect').disabled=true;demoCurrency=$('desk-chart-currency').value;$('desk-chart-currency').value='token';$('desk-chart-currency').disabled=true;
 document.querySelectorAll('[data-interval]').forEach(b=>b.disabled=true);['chart-mode-dex','chart-mode-snapshot','chart-retry'].forEach(id=>$(id).disabled=true);
 const d=sample();position=d.position;disposeChart();renderChart({demo:true,mint:activeMint,pool:'sample',currency:'SOL',chartCurrency:'token',quoteMint:SOL,intervalMinutes:1,candles:d.candles,source:'Sample data'});renderPosition();
 info('chart-status','SAMPLE / SOL · Simulated candles and fills');$('chart-freshness').textContent='LAYOUT PREVIEW · NOT LIVE DATA';
 info('swap-status','Trading is disabled in sample mode. Return to the market to trade.');walletUI();$('desk-demo-banner').scrollIntoView({behavior:'smooth',block:'start'});
}
function exitDemo(){
 if(!demo)return;demo=false;document.body.classList.remove('desk-demo-active');$('desk-demo-banner').hidden=true;$('desk-demo').textContent='Explore a sample ↗';$('desk-position-title').textContent='Your position';$('desk-chart-currency').disabled=false;$('desk-chart-currency').value=demoCurrency;
 document.querySelectorAll('[data-interval]').forEach(b=>b.disabled=false);['chart-mode-dex','chart-mode-snapshot','chart-retry'].forEach(id=>$(id).disabled=false);clearPosition();disposeChart();terminal.refreshChart();if(wallet)loadPosition();walletUI();
}
$('desk-connect').onclick=connect;$('desk-disconnect').onclick=disconnect;$('desk-refresh').onclick=loadPosition;
$('desk-demo').onclick=()=>demo?exitDemo():enterDemo();$('desk-demo-exit').onclick=exitDemo;
$('desk-custom-sell').onclick=()=>sell(null);document.querySelectorAll('[data-sell-percent]').forEach(b=>b.onclick=()=>sell(Number(b.dataset.sellPercent)));
$('desk-fit').onclick=()=>{if(chartReady())chart.timeScale().fitContent();};
$('desk-live').onclick=()=>{if(!chartReady())return;chart.timeScale().scrollToRealTime();hoveredTime=null;renderChartReadout();};
$('desk-log').onclick=()=>{if(!chartReady())return;logScale=!logScale;chart.priceScale('right').applyOptions({mode:logScale?window.LightweightCharts.PriceScaleMode.Logarithmic:window.LightweightCharts.PriceScaleMode.Normal,autoScale:true});chartControls();};
$('desk-volume').onclick=()=>{if(!chartReady()||!chartData.candles.some(volumeAvailable))return;showVolume=!showVolume;syncVolumeVisibility();chartControls();};
for(const measure of ['cap','fdv','price'])$('desk-measure-'+measure).onclick=()=>setChartMeasure(measure);
document.querySelectorAll('[data-chart-style]').forEach(button=>button.onclick=()=>setChartStyle(button.dataset.chartStyle));
let interval='1';document.querySelectorAll('[data-interval]').forEach(b=>b.onclick=()=>{if(demo)return;interval=b.dataset.interval;document.querySelectorAll('[data-interval]').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));terminal.setChart(interval,$('desk-chart-currency').value);});
$('desk-chart-currency').onchange=()=>{if(demo)return;if($('desk-chart-currency').value!=='usd'){chartMeasure='price';try{sessionStorage.setItem('parallax:terminal-measure','price');}catch{}}terminal.setChart(interval,$('desk-chart-currency').value);};
window.addEventListener('parallax:terminal-selection',()=>{
 const selected=terminal.getSelection();$('desk-signin').href='/signin-with-chatgpt?return_to='+encodeURIComponent('/terminal?token='+selected.mint+'&view=trade');if(selected.mint!==activeMint){if(demo)exitDemo();activeMint=selected.mint;clearPosition();if(wallet)loadPosition();}
});
window.addEventListener('pagehide',()=>{alive=false;demo=false;wallet=null;clearPosition();disposeChart();});
window.addEventListener('pageshow',e=>{if(e.persisted){alive=true;demo=true;exitDemo();walletUI();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&position&&!demo)renderPosition();});
setInterval(()=>{if(!alive||document.hidden||demo)return;if(position&&lastRenderedMarkFresh!==markIsFresh(position.mark))renderPosition();const state=terminal.getChart();if(state.mode!=='snapshot')return;if(chartDisplay&&chartDisplay.measure!=='price'&&!(chartDisplay.measure==='fdv'?chartUnits?.fdvBasis(chartData):chartUnits?.capBasis(chartData))?.available)renderChart(chartData);if(!state.loading&&state.nextRefreshAt&&Date.now()>=state.nextRefreshAt){lastChartRefresh=Date.now();terminal.refreshChart();}},5000);
window.ParallaxTrading={isDemo:()=>demo,walletOptions,swapReported,disposeChart,renderChart,chartModeChanged};
walletUI();const already=window.phantom?.solana||window.solana;if(already?.isPhantom&&already.isConnected&&valid(already.publicKey?.toString())){provider=already;provider.on?.('accountChanged',changedWallet);provider.on?.('disconnect',disconnected);changedWallet(already.publicKey);}const existing=terminal.getChart();chartModeChanged(existing.mode);if(existing.mode==='snapshot'&&existing.data)renderChart(existing.data);
})();
