const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context={module:{exports:{}},URL,Date,console};
vm.runInNewContext(fs.readFileSync('public/trenches-core.js','utf8'),context);
const C=context.module.exports,NOW=1793250000000;
const MINT='8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump',POOL='3f82MmfsyzNHa8kFNwVUYRHF5Ane7boeSo2hpDXeVJDo';
const other='EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
function row(extra={}){return C.normalizePool({mint:MINT,address:POOL,name:'Parallax',symbol:'PRLX',marketCapUsd:15000,fdvUsd:18000,liquidityUsd:7000,volume5mUsd:20,volume1hUsd:2000,buys5m:2,sells5m:1,holders:80,createdAt:new Date(NOW-3600000).toISOString(),links:[],linksStatus:'none',launchpad:{completed:false,progressPct:75},...extra});}
const filters=(stage,extra={})=>C.cleanFilters({...C.defaults(stage),...extra},stage);

test('stage eligibility requires known provider state, with an adjustable near threshold',()=>{
 assert.equal(C.matches(row({launchpad:{completed:null,progressPct:98}}),'fresh',filters('fresh'),'',NOW),false);
 assert.equal(C.matches(row({launchpad:{completed:true,progressPct:100}}),'near',filters('near'),'',NOW),false);
 assert.equal(C.matches(row({launchpad:{completed:false,progressPct:0}}),'near',filters('near',{nearMinPercent:0}),'',NOW),true);
 assert.equal(C.matches(row({launchpad:{completed:false,progressPct:null}}),'near',filters('near',{nearMinPercent:0}),'',NOW),false);
 assert.equal(C.matches(row({launchpad:{completed:true}}),'graduated',filters('graduated'),'',NOW),true);
});
test('market-cap-only filters never silently substitute FDV, and observed zero remains zero',()=>{
 const unverified=row({marketCapUsd:null,fdvUsd:100000});
 assert.equal(C.matches(unverified,'fresh',filters('fresh',{minValuation:90000}),'',NOW),true);
 assert.equal(C.matches(unverified,'fresh',filters('fresh',{valuationPolicy:'cap-only'}),'',NOW),false);
 assert.equal(C.valuation(row({marketCapUsd:0,fdvUsd:100000})).label,'MCAP');
 assert.equal(C.valuation(row({marketCapUsd:0,fdvUsd:100000})).value,0);
 assert.equal(C.matches(row({marketCapUsd:null,fdvUsd:null}),'fresh',filters('fresh',{maxValuation:100000}),'',NOW),false);
});
test('volume limits and sorting use the selected time window; incomplete transaction counts stay unknown',()=>{
 const slow=row({volume5mUsd:10,volume1hUsd:10000}),recent=row({mint:other,volume5mUsd:1000,volume1hUsd:2000});
 assert.equal(C.matches(slow,'fresh',filters('fresh',{minVolume:100,volumeWindow:'m5'}),'',NOW),false);
 assert.equal(C.matches(slow,'fresh',filters('fresh',{minVolume:100,volumeWindow:'h1'}),'',NOW),true);
 assert.equal(C.select([slow,recent],'fresh',filters('fresh',{sort:'volume',volumeWindow:'m5'}),'',NOW)[0].mint,other);
 assert.equal(C.select([slow,recent],'fresh',filters('fresh',{sort:'volume',volumeWindow:'h1'}),'',NOW)[0].mint,MINT);
 assert.equal(C.trades5m(row({buys5m:null,sells5m:5})),null);
 assert.equal(C.matches(row({buys5m:null,sells5m:5}),'fresh',filters('fresh',{minTrades5m:1}),'',NOW),false);
});
test('age filters use pool creation, never curve completion time',()=>{
 const p=row({createdAt:new Date(NOW-48*3600000).toISOString(),launchpad:{completed:true,completedAt:new Date(NOW-60000).toISOString()}});
 assert.equal(C.matches(p,'graduated',filters('graduated',{maxAgeMinutes:60}),'',NOW),false);
 assert.equal(C.ageMinutes(p,NOW),2880);
 assert.equal(C.matches(row({createdAt:null}),'fresh',filters('fresh'),'',NOW),false);
});
test('saved preferences are bounded, independent and recover from malformed input',()=>{
 const p=C.preferences(JSON.stringify({version:1,activeStage:'near',paused:true,filters:{fresh:{minVolume:12},near:{nearMinPercent:0,requiredSocials:['twitter','script','twitter']},graduated:{minHolders:20}}}));
 assert.equal(p.activeStage,'near');assert.equal(p.paused,true);assert.equal(p.filters.fresh.minVolume,12);assert.equal(p.filters.near.minVolume,0);assert.equal(p.filters.near.nearMinPercent,0);assert.equal(p.filters.graduated.minHolders,20);assert.equal(p.filters.near.requiredSocials.join(','),'twitter');
 assert.equal(C.preferences('{bad json').filters.fresh.maxAgeMinutes,1440);
 assert.equal(C.preferences('x'.repeat(6001)).activeStage,'fresh');
 const invalid=filters('near',{minValuation:100,maxValuation:1,minHolders:-5,nearMinPercent:200});
 assert.equal(invalid.maxValuation,0);assert.equal(invalid.minHolders,0);assert.equal(invalid.nearMinPercent,99.99);
});
test('reported links are protocol checked and unknown metadata stays distinguishable from empty metadata',()=>{
 const unknown=row({holders:null,linksStatus:'unavailable'});
 assert.equal(C.matches(unknown,'fresh',filters('fresh',{requireAnySocial:true}),'',NOW),false);
 assert.equal(C.links([{type:'website',url:'javascript:alert(1)'},{type:'twitter',url:'https://x.com/example'},{type:'telegram',url:'https://name:password@example.com'}]).length,1);
 const checked=C.withMetadata(unknown,{mint:MINT,holders:0,links:[],linksStatus:'none'});assert.equal(checked.holders,0);assert.equal(checked.linksStatus,'none');
 assert.equal(C.withMetadata(unknown,{mint:other,holders:999}),unknown);
 assert.equal(C.terminalURL(unknown),'/terminal?token='+MINT+'&pool='+POOL);
});
test('unknown rows remain available to an explicit metadata batch even when their filters exclude them',()=>{
 const unknown=row({holders:null,linksStatus:'unavailable'}),f=filters('near',{minHolders:100,requireAnySocial:true});
 assert.equal(C.select([unknown],'near',f,'',NOW).length,0);
 assert.equal(C.metadataCandidates([unknown],'near',f,'PRLX',NOW).length,1);
 assert.equal(C.metadataCandidates([unknown],'near',f,'DIFFERENT',NOW).length,0);
 assert.equal(C.metadataCandidates([row({holders:null,launchpad:{completed:true}})],'near',f,'',NOW).length,0);
});
test('pagination deduplicates mints deterministically with first-page observations taking precedence',()=>{
 const one=row({name:'First page'}),old=row({name:'Older page'});
 const merged=C.mergePages(new Map([[2,{pools:[old,row({mint:other})]}],[1,{pools:[one,{mint:'invalid',address:POOL}]}]]));
 assert.equal(merged.length,2);assert.equal(merged[0].name,'First page');assert.equal(merged[1].mint,other);
});
test('missing values sort last in either direction and each time window remains independent',()=>{
 const unknown=row({mint:other,marketCapUsd:null,fdvUsd:null}),known=row();
 assert.equal(C.select([unknown,known],'fresh',filters('fresh',{sort:'valuation-low'}),'',NOW)[0].mint,MINT);
 assert.equal(C.select([unknown,known],'fresh',filters('fresh',{sort:'valuation-high'}),'',NOW)[0].mint,MINT);
});
