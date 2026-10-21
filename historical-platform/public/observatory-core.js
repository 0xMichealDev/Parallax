import {compareSnapshots} from './observatory-compare.js';
export const KEY='parallax-observatory-v1';
export const addressOK=v=>typeof v==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(v);
export function validSnapshot(s,address=s?.address){return !!s&&s.schema==='parallax.passport.v1'&&s.network==='solana-mainnet'&&addressOK(s.address)&&s.address===address&&Number.isFinite(Date.parse(s.fetchedAt))&&(!!s.chain||!!s.market);}
export function readState(raw){
 const fallback={version:1,auto:true,items:[]};if(!raw)return fallback;
 try{const s=JSON.parse(raw);if(s.version!==1||!Array.isArray(s.items))throw Error();const seen=new Set();return {version:1,auto:s.auto!==false,items:s.items.filter(i=>{if(!validSnapshot(i?.latest,i?.address)||!validSnapshot(i?.reference,i?.address)||seen.has(i.address))return false;seen.add(i.address);return true;})};}catch{return fallback;}
}
export function updateSnapshot(item,s){
 if(!validSnapshot(s,item.address))throw Error('The source returned an invalid snapshot. Your previous evidence was kept.');
 if(Date.parse(s.fetchedAt)<=Date.parse(item.latest.fetchedAt))return item;
 return {...item,latest:s};
}
export function compareItem(item){try{return compareSnapshots(item.reference,item.latest);}catch{return null;}}
export function safeSource(url){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&['solscan.io','dexscreener.com'].includes(u.hostname)?u.href:null;}catch{return null;}}
export function summary(item){const c=compareItem(item);return !c?'First observation saved':c.counts.changed?c.counts.changed+' observed '+(c.counts.changed===1?'change':'changes'):'No changes in comparable fields';}
