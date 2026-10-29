/* Display-only chart units. Provider candles and actual executions stay unchanged. */
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ParallaxTerminalChart=api;})(typeof window==='object'?window:globalThis,()=>{'use strict';
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const positive=value=>finite(value)&&value>0;
const compact=new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2});
const price=new Intl.NumberFormat('en-US',{maximumSignificantDigits:6});
function formatAxis(value,currency='USD'){
 if(!finite(value))return '—';
 const absolute=Math.abs(value),amount=absolute>=1000?compact.format(absolute):absolute>0&&absolute<.000001?absolute.toExponential(2):price.format(absolute);
 return (value<0?'−':'')+(currency==='USD'?'$':'')+amount+(currency&&currency!=='USD'?' '+currency:'');
}
function valuationBasis(data,kind,now=Date.now()){
 const valuation=data?.valuation;
 if(data?.demo)return {available:false,reason:'Sample mode shows simulated prices.'};
 if(valuation&&(!data.pool||valuation.pool!==data.pool))return {available:false,reason:'The valuation does not identify this exact pool.'};
 const amount=kind==='fdv'?valuation?.fdvUsd:valuation?.marketCapUsd,label=kind==='fdv'?'FDV':'Market cap';
 if(!positive(amount))return {available:false,reason:kind==='cap'&&finite(valuation?.fdvUsd)?'Market cap is unverified. FDV is a different valuation.':label+' is unavailable.'};
 if(!positive(valuation?.priceUsd))return {available:false,reason:'A matching USD price is unavailable.'};
 const observedAt=Date.parse(valuation.fetchedAt),age=now-observedAt;
 if(valuation.stale||data.stale||!Number.isFinite(observedAt)||age>15*60*1000||age< -60000)return {available:false,reason:'The '+label+' basis is delayed or has no observation time.'};
 const factor=amount/valuation.priceUsd;
 if(!positive(factor))return {available:false,reason:'A usable '+label+' basis is unavailable.'};
 if(data.chartCurrency==='usd'&&Array.isArray(data.candles)&&data.candles.some(candle=>['open','high','low','close'].some(key=>!finite(candle[key])||candle[key]<0||!finite(candle[key]*factor))))return {available:false,reason:'The candle values cannot support a reliable '+label+' conversion.'};
 return {available:true,kind,factor,observedAt,source:typeof valuation.source==='string'?valuation.source:'Market provider',value:amount,priceUsd:valuation.priceUsd};
}
const capBasis=(data,now)=>valuationBasis(data,'cap',now),fdvBasis=(data,now)=>valuationBasis(data,'fdv',now);
function display(data,requested='price',now=Date.now()){
 const target=requested==='valuation'?(capBasis(data,now).available?'cap':'fdv'):requested;
 const basis=target==='fdv'?fdvBasis(data,now):capBasis(data,now),raw=Array.isArray(data?.candles)?data.candles:[];
 let measure=['cap','fdv'].includes(target)&&basis.available&&data.chartCurrency==='usd'?target:'price';
 let candles=raw;
 if(measure!=='price'){
  const scaled=raw.map(candle=>({...candle,...Object.fromEntries(['open','high','low','close'].map(key=>[key,candle[key]*basis.factor]))}));
  if(scaled.every(candle=>['open','high','low','close'].every(key=>finite(candle[key])&&candle[key]>=0)))candles=scaled;
  else{measure='price';basis.available=false;basis.reason='Valuation conversion exceeds the available price range. Price is shown.';}
 }
 return {measure,candles,basis,currency:measure!=='price'?'USD':data?.currency||'USD',factor:measure!=='price'?basis.factor:1};
}
function tradeMarkers(trades,candles,intervalMinutes){
 const span=intervalMinutes*60;if(!positive(span)||!Array.isArray(candles))return [];
 const times=new Set(candles.map(candle=>candle.time));
 return (Array.isArray(trades)?trades:[]).filter(trade=>finite(trade.time)&&['buy','sell'].includes(trade.side)&&times.has(Math.floor(trade.time/span)*span)).map(trade=>({time:Math.floor(trade.time/span)*span,position:trade.side==='buy'?'belowBar':'aboveBar',color:trade.side==='buy'?'#71d6b0':'#e58ca4',shape:trade.side==='buy'?'arrowUp':'arrowDown',text:trade.side==='buy'?'B':'S',id:trade.signature})).sort((a,b)=>a.time-b.time);
}
function entryPrice(data,position,measure='price'){
 const basis=position?.basis;
 return measure==='price'&&basis&&position.mint===data?.mint&&data.chartCurrency==='token'&&data.quoteMint===basis.quoteMint&&positive(basis.averageEntry)?basis.averageEntry:null;
}
return Object.freeze({formatAxis,capBasis,fdvBasis,display,tradeMarkers,entryPrice});
});
