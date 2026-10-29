(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ParallaxTrenchesCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const STAGES=['fresh','near','graduated'];
 const SORTS=['newest','progress','volume','liquidity','holders','valuation-high','valuation-low','trades'];
 const address=v=>typeof v==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
 const number=v=>v===null||v===undefined||typeof v==='boolean'||typeof v==='string'&&!v.trim()?null:(typeof v==='number'||typeof v==='string')&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
 const text=(v,max=80)=>typeof v==='string'?v.slice(0,max):'';
 const timestamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?Date.parse(v):null;
 const bounded=(v,max=1e12)=>Math.min(max,number(v)??0);
 const stage=value=>STAGES.includes(value)?value:'fresh';
 function defaults(key){return {valuationPolicy:'cap-or-fdv',minValuation:0,maxValuation:0,minLiquidity:0,minVolume:0,volumeWindow:key==='graduated'?'h1':'m5',maxAgeMinutes:key==='fresh'?1440:0,minHolders:0,minTrades5m:0,requiredSocials:[],requireAnySocial:false,nearMinPercent:70,sort:key==='near'?'progress':key==='graduated'?'volume':'newest'};}
 function cleanFilters(value,key){
  const d=defaults(stage(key)),v=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
  const f={...d,valuationPolicy:v.valuationPolicy==='cap-only'?'cap-only':'cap-or-fdv',minValuation:bounded(v.minValuation),maxValuation:bounded(v.maxValuation),minLiquidity:bounded(v.minLiquidity),minVolume:bounded(v.minVolume),volumeWindow:['m5','h1'].includes(v.volumeWindow)?v.volumeWindow:d.volumeWindow,maxAgeMinutes:v.maxAgeMinutes===undefined?d.maxAgeMinutes:bounded(v.maxAgeMinutes,525600),minHolders:Math.floor(bounded(v.minHolders,1e9)),minTrades5m:Math.floor(bounded(v.minTrades5m,1e9)),requiredSocials:Array.isArray(v.requiredSocials)?[...new Set(v.requiredSocials.filter(x=>['website','twitter','telegram'].includes(x)))].slice(0,3):[],requireAnySocial:v.requireAnySocial===true,nearMinPercent:Math.min(99.99,number(v.nearMinPercent)??70),sort:SORTS.includes(v.sort)&&!(key==='graduated'&&v.sort==='progress')?v.sort:d.sort};
  if(f.maxValuation>0&&f.maxValuation<f.minValuation)f.maxValuation=0;
  return f;
 }
 function preferences(raw){
  let v={};try{if(typeof raw==='string'&&raw.length<=6000){const parsed=JSON.parse(raw);if(parsed?.version===1&&typeof parsed==='object'&&!Array.isArray(parsed))v=parsed;}}catch{}
  return {version:1,activeStage:stage(v.activeStage),paused:v.paused===true,filters:Object.fromEntries(STAGES.map(key=>[key,cleanFilters(v.filters?.[key],key)]))};
 }
 function safeURL(value){
  if(typeof value!=='string'||value.length>2048)return null;
  try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&!u.username&&!u.password&&u.hostname?u.href:null;}catch{return null;}
 }
 function links(rows){
  const seen=new Set();return (Array.isArray(rows)?rows:[]).slice(0,12).flatMap(row=>{
   const type=row?.type==='x'?'twitter':row?.type,url=safeURL(row?.url);
   if(!['website','twitter','telegram'].includes(type)||!url||seen.has(type))return [];seen.add(type);return [{type,url,label:type==='twitter'?'X':type==='telegram'?'Telegram':'Website'}];
  });
 }
 function normalizePool(p){
  if(!p||!address(p.mint)||!address(p.address))return null;
  const lp=p.launchpad&&typeof p.launchpad==='object'?p.launchpad:{};
  const parsedLinks=links(p.links),rawProgress=number(lp.progressPct);
  const out={...p,mint:p.mint,address:p.address,name:text(p.name)||text(p.symbol,24)||'Unnamed token',symbol:text(p.symbol,24)||'TOKEN',imageUrl:safeURL(p.imageUrl),createdAt:timestamp(p.createdAt)!==null?p.createdAt:null,holdersUpdatedAt:timestamp(p.holdersUpdatedAt)!==null?p.holdersUpdatedAt:null,links:parsedLinks,linksStatus:['available','none','unavailable'].includes(p.linksStatus)?p.linksStatus:'unavailable',launchpad:{completed:typeof lp.completed==='boolean'?lp.completed:null,progressPct:rawProgress!==null&&rawProgress<=100?rawProgress:null,completedAt:timestamp(lp.completedAt)!==null?lp.completedAt:null,migratedPool:address(lp.migratedPool)?lp.migratedPool:null}};
  for(const key of ['marketCapUsd','fdvUsd','liquidityUsd','volume5mUsd','volume1hUsd','buys5m','sells5m','holders'])out[key]=number(p[key]);
  return out;
 }
 function eligibility(p,key){return key==='graduated'?p.launchpad?.completed===true:p.launchpad?.completed===false&&(key!=='near'||number(p.launchpad?.progressPct)!==null);}
 function valuation(p,policy='cap-or-fdv'){
  const cap=number(p.marketCapUsd),fdv=number(p.fdvUsd);if(cap!==null)return {value:cap,label:'MCAP'};
  return policy==='cap-or-fdv'&&fdv!==null?{value:fdv,label:'FDV'}:{value:null,label:'MCAP'};
 }
 function volume(p,window){return number(window==='h1'?p.volume1hUsd:p.volume5mUsd);}
 function trades5m(p){const b=number(p.buys5m),s=number(p.sells5m);return b===null||s===null?null:b+s;}
 function ageMinutes(p,now){const t=timestamp(p.createdAt);return t===null||t>now+60000?null:Math.max(0,(now-t)/60000);}
 function activeCount(f,key){
  const d=defaults(key);return ['minValuation','maxValuation','minLiquidity','minVolume','maxAgeMinutes','minHolders','minTrades5m'].filter(k=>f[k]>0).length+(f.valuationPolicy!==d.valuationPolicy?1:0)+(f.requiredSocials.length||f.requireAnySocial?1:0)+(key==='near'&&f.nearMinPercent!==70?1:0);
 }
 function matches(p,key,filters,query='',now=Date.now()){
  if(!eligibility(p,key))return false;
  const f=filters,v=valuation(p,f.valuationPolicy).value,vol=volume(p,f.volumeWindow),age=ageMinutes(p,now),tx=trades5m(p);
  if(f.valuationPolicy==='cap-only'&&v===null)return false;
  if(query&&!`${p.name} ${p.symbol} ${p.mint}`.toLowerCase().includes(text(query,100).trim().toLowerCase()))return false;
  if(f.minValuation>0&&(v===null||v<f.minValuation)||f.maxValuation>0&&(v===null||v>f.maxValuation))return false;
  if(f.minLiquidity>0&&(number(p.liquidityUsd)===null||p.liquidityUsd<f.minLiquidity)||f.minVolume>0&&(vol===null||vol<f.minVolume))return false;
  if(f.maxAgeMinutes>0&&(age===null||age>f.maxAgeMinutes)||f.minHolders>0&&(number(p.holders)===null||p.holders<f.minHolders)||f.minTrades5m>0&&(tx===null||tx<f.minTrades5m))return false;
  if(key==='near'&&(number(p.launchpad?.progressPct)===null||p.launchpad.progressPct<f.nearMinPercent))return false;
  const types=new Set(links(p.links).map(l=>l.type));
  if(f.requireAnySocial&&!types.size||f.requiredSocials.some(type=>!types.has(type)))return false;
  return true;
 }
 function rank(a,b,descending=true){if(a===null&&b===null)return 0;if(a===null)return 1;if(b===null)return -1;return descending?b-a:a-b;}
 function select(rows,key,filters,query='',now=Date.now()){
  const f=cleanFilters(filters,key);return rows.filter(p=>matches(p,key,f,query,now)).sort((a,b)=>{
   let order=0;
   if(f.sort==='newest')order=rank(timestamp(a.createdAt),timestamp(b.createdAt));
   else if(f.sort==='progress')order=rank(number(a.launchpad?.progressPct),number(b.launchpad?.progressPct));
   else if(f.sort==='volume')order=rank(volume(a,f.volumeWindow),volume(b,f.volumeWindow));
   else if(f.sort==='liquidity')order=rank(number(a.liquidityUsd),number(b.liquidityUsd));
   else if(f.sort==='holders')order=rank(number(a.holders),number(b.holders));
   else if(f.sort==='trades')order=rank(trades5m(a),trades5m(b));
   else order=rank(valuation(a,f.valuationPolicy).value,valuation(b,f.valuationPolicy).value,f.sort==='valuation-high');
   return order||a.mint.localeCompare(b.mint)||a.address.localeCompare(b.address);
  });
 }
 function mergePages(pages){const found=new Map();for(const page of [...pages].sort((a,b)=>a[0]-b[0]))for(const p of page[1].pools||[]){const row=normalizePool(p);if(row&&!found.has(row.mint))found.set(row.mint,row);if(found.size>=500)return [...found.values()];}return [...found.values()];}
 function metadataCandidates(rows,key,filters,query='',now=Date.now()){return select(rows,key,{...filters,minHolders:0,requiredSocials:[],requireAnySocial:false},query,now).filter(p=>p.holders===null||p.linksStatus==='unavailable');}
 function withMetadata(p,info){if(!info||info.mint!==p.mint)return p;return {...p,holders:number(info.holders),holdersUpdatedAt:timestamp(info.holdersUpdatedAt)!==null?info.holdersUpdatedAt:null,links:links(info.links),linksStatus:['available','none','unavailable'].includes(info.linksStatus)?info.linksStatus:'unavailable',linksSource:text(info.linksSource,50)};}
 function terminalURL(p){if(!address(p.mint)||!address(p.address))return null;return '/terminal?token='+encodeURIComponent(p.mint)+'&pool='+encodeURIComponent(p.address);}
 return {STAGES,SORTS,address,number,timestamp,defaults,cleanFilters,preferences,safeURL,links,normalizePool,eligibility,valuation,volume,trades5m,ageMinutes,activeCount,matches,select,mergePages,metadataCandidates,withMetadata,terminalURL};
});
