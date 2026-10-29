(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ParallaxReplayCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const address=value=>typeof value==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);
 const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
 function through(trades,time,side='all',wallet=''){return trades.filter(t=>t.time<=time&&(side==='all'||t.side===side)&&(!wallet||t.wallet===wallet));}
 function aggregate(trades){
  const wallets=new Map();let buyUsd=0,sellUsd=0,buys=0,sells=0,missingUsd=0,unknownWallets=0,buyKnownUsd=0,sellKnownUsd=0,buyMissingUsd=0,sellMissingUsd=0;
  for(const t of trades){
   const buy=t.side==='buy';if(buy)buys++;else sells++;
   if(t.volumeUsd===null||!Number.isFinite(t.volumeUsd)){missingUsd++;if(buy)buyMissingUsd++;else sellMissingUsd++;}else if(buy){buyUsd+=t.volumeUsd;buyKnownUsd++;}else{sellUsd+=t.volumeUsd;sellKnownUsd++;}
   if(!t.wallet){unknownWallets++;continue;}
   const row=wallets.get(t.wallet)||{wallet:t.wallet,count:0,buys:0,sells:0,buyUsd:0,sellUsd:0,netTokens:0,missingUsd:0,buyKnownUsd:0,sellKnownUsd:0,buyMissingUsd:0,sellMissingUsd:0};
   row.count++;row[buy?'buys':'sells']++;row.netTokens+=(buy?1:-1)*t.tokenAmount;
   if(t.volumeUsd===null||!Number.isFinite(t.volumeUsd)){row.missingUsd++;row[buy?'buyMissingUsd':'sellMissingUsd']++;}else{row[buy?'buyUsd':'sellUsd']+=t.volumeUsd;row[buy?'buyKnownUsd':'sellKnownUsd']++;}
   wallets.set(t.wallet,row);
  }
  return {buyUsd,sellUsd,buys,sells,missingUsd,unknownWallets,buyKnownUsd,sellKnownUsd,buyMissingUsd,sellMissingUsd,wallets:[...wallets.values()].sort((a,b)=>(b.buyUsd+b.sellUsd)-(a.buyUsd+a.sellUsd)||b.count-a.count||a.wallet.localeCompare(b.wallet))};
 }
 function largest(trades,side,wallet=''){return trades.filter(t=>t.side===side&&(!wallet||t.wallet===wallet)&&Number.isFinite(t.volumeUsd)).reduce((best,t)=>!best||t.volumeUsd>best.volumeUsd?t:best,null);}
 function visibleCandles(candles,cursor,intervalMinutes){return candles.filter(c=>c.time+intervalMinutes*60<=cursor);}
 function shareURL(origin,data,cursor,filters={}){
  if(!/^[a-f0-9]{64}$/.test(data.snapshotId))throw Error('A saved snapshot is required.');
  const u=new URL('/replay',origin);u.searchParams.set('snapshot',data.snapshotId);u.searchParams.set('mint',data.mint);u.searchParams.set('hours',String(data.window.hours));u.searchParams.set('at',String(Math.floor(clamp(cursor,data.window.from,data.window.to))));
  if(address(filters.wallet))u.searchParams.set('wallet',filters.wallet);
  if(['buy','sell'].includes(filters.side))u.searchParams.set('side',filters.side);
  return u.href;
 }
 function readLink(search){
  const p=new URLSearchParams(search),rawAt=p.get('at'),at=rawAt&&/^\d{1,12}$/.test(rawAt)?Number(rawAt):null;
  return {snapshot:p.get('snapshot'),mint:address(p.get('mint'))?p.get('mint'):null,pool:address(p.get('pool'))?p.get('pool'):null,hours:['1','6','24'].includes(p.get('hours'))?Number(p.get('hours')):6,at,side:['buy','sell'].includes(p.get('side'))?p.get('side'):'all',wallet:address(p.get('wallet'))?p.get('wallet'):''};
 }
 return {address,clamp,through,aggregate,largest,visibleCandles,shareURL,readLink};
});
