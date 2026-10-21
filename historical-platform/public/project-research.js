(()=>{'use strict';
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
function safeURL(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}}
function date(value){const time=new Date(value);return Number.isFinite(time.getTime())?time.toLocaleString():'Collection time unavailable';}
function money(value){if(value===null||value===undefined||value===''||!['string','number'].includes(typeof value))return 'Unavailable';const n=Number(value);if(!Number.isFinite(n))return 'Unavailable';if(n>0&&n<.00000001)return '< $0.00000001';return new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:n>1?2:8}).format(n);}
function render(host,panel,{preview=false}={}){
 host.replaceChildren();const p=panel.snapshot||{},market=p.market||{},chain=p.chain||{},wrap=el('div','research-panel-content');
 wrap.append(el('p','research-panel-label',preview?'PROJECT PASSPORT / PREVIEW':'PROJECT PASSPORT / CREATOR SELECTED'),el('h2','research-panel-title','A closer look at this project.'),el('p','research-panel-time','Snapshot collected '+date(p.fetchedAt)));
 const address=el('p','research-panel-address',panel.address);wrap.append(address);
 const age=Date.now()-Date.parse(p.fetchedAt),notice=el('p','research-panel-notice',Number.isFinite(age)&&age>86400000?'This snapshot is more than 24 hours old. Conditions may have changed.':'A saved snapshot, not a live price feed. Conditions may have changed.');wrap.append(notice);
 const metrics=el('dl','research-panel-metrics');for(const [label,value]of [['Price · S2',money(market.priceUsd)],['Liquidity · S2',money(market.liquidityUsd)],['24h volume · S2',money(market.volume24hUsd)],['Confirmed slot · S1',Number.isSafeInteger(chain.slot)?chain.slot.toLocaleString():'Unavailable']]){const item=el('div');item.append(el('dt','',label),el('dd','',value));metrics.append(item);}wrap.append(metrics);
 if(p.market)wrap.append(el('p','research-panel-time','Market figures describe the indexed pair with the highest reported USD liquidity, not the entire token market.'));
 const sources=el('div','research-panel-sources');sources.append(el('h3','','Sources & collection times'));for(const s of (p.sources||[])){const row=el('div'),href=safeURL(s.url),label=s.id+' · '+s.label;if(href){const a=el('a','',label+' ↗');a.href=href;a.target='_blank';a.rel='noopener noreferrer';row.append(a)}else row.append(el('span','',label));row.append(el('span','', (s.status==='retrieved'?'Retrieved':'Unavailable')+' · '+date(s.fetchedAt)));sources.append(row);}wrap.append(sources);
 const gaps=el('div','research-panel-gaps');gaps.append(el('h3','','What this snapshot does not establish'));const list=el('ul');for(const gap of p.gaps||[])list.append(el('li','',gap));if(!list.children.length)list.append(el('li','','This snapshot does not establish project identity, token safety or future performance.'));gaps.append(list);wrap.append(gaps);
 const fingerprint=el('details','research-panel-fingerprint');fingerprint.append(el('summary','','Snapshot fingerprint'),el('code','',panel.sha256),el('p','','SHA-256 checks the exported file’s integrity. It is not an onchain record, an audit or a safety certification.'));wrap.append(fingerprint);
 if(panel.sharedPath&&/^\/research\/[a-f0-9]{64}$/.test(panel.sharedPath)){const actions=el('div','research-panel-actions');for(const [label,path]of [['Read full passport ↗',panel.sharedPath],['Download snapshot ↓',panel.sharedPath+'?download=1']]){const a=el('a','',label);a.href=path;actions.append(a);}wrap.append(actions);}
 wrap.append(el('p','research-panel-disclosure','Selected by the project creator. Premium pays for presentation, not a research rating or endorsement.'));host.append(wrap);
}
let epoch=0;
async function load(id){
 const turn=++epoch;let host=document.getElementById('project-research-panel');if(!host){host=el('section','project-research-panel');host.id='project-research-panel';host.setAttribute('aria-label','Project research snapshot');(document.querySelector('#observatory')||document.querySelector('main')||document.body).append(host);}host.hidden=true;
 try{const r=await fetch('/api/utility/world?project='+encodeURIComponent(id),{credentials:'same-origin',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const data=await r.json();if(turn!==epoch)return;if(!data.panel)return;render(host,data.panel);host.hidden=false;}catch{if(turn!==epoch)return;host.replaceChildren(el('p','research-panel-notice','The research panel could not load. Refresh to try again.'));host.hidden=false;}
}
window.ParallaxProjectResearch={render,load};
})();
