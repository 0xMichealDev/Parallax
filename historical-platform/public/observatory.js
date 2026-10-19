import {KEY,addressOK,validSnapshot,readState,updateSnapshot,compareItem,safeSource,summary} from './observatory-core.js?v=137';
const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>new Date(v).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}),enc=encodeURIComponent;
const request=(path,body)=>window.ParallaxResearch.request(path,body),errors=new Map(),checked=new Map();
let state,preview=null,busy=false,active=true,generation=0,loadError=false,visibleCount=20;
try{state=readState(localStorage.getItem(KEY));}catch{state=readState(null);loadError=true;}
function status(text,error=false){$('obs-status').textContent=text;$('obs-status').classList.toggle('error',error);}
// Read again before every write so another tab's saved projects are preserved.
function save(change){let latest;try{latest=readState(localStorage.getItem(KEY));const next=change(latest);localStorage.setItem(KEY,JSON.stringify(next));state=next;return true;}catch{status('This browser could not save your changes. Check storage settings; your previous saved list has not been replaced.',true);return false;}}
function money(v){return typeof v==='number'&&Number.isFinite(v)?v.toLocaleString(undefined,{style:'currency',currency:'USD',maximumSignificantDigits:5}):'Unavailable';}
function value(row,v){return row.unit==='usd'?money(v):v==null?'Unavailable':String(v);}
function change(row){if(row.status==='not-comparable')return 'Not comparable';if(row.status==='unavailable')return 'Unavailable';if(row.status==='unchanged')return 'Unchanged';if(row.percent!==null)return (row.percent>0?'+':'')+row.percent.toLocaleString(undefined,{maximumFractionDigits:2})+'%';return 'Changed';}
function sources(s){return (Array.isArray(s.sources)?s.sources:[]).filter(v=>v.status==='retrieved'&&safeSource(v.url)).map(v=>'<a target="_blank" rel="noopener noreferrer" href="'+esc(safeSource(v.url))+'">'+esc(v.id==='S1'?'Solscan':'DEX Screener')+' ↗</a>').join('');}
function card(item,isPreview=false){
 const s=item.latest,c=compareItem(item),name=s.market?.name||'Solana token',stale=Date.now()-Date.parse(s.fetchedAt)>3600000;
 const wanted=['liquidityUsd','priceUsd','supply','mintAuthority','freezeAuthority'];
 const rows=c?c.rows.filter(r=>wanted.includes(r.key)):[];
 return '<article class="obs-card" data-address="'+esc(item.address)+'"'+(isPreview?' data-preview="true"':'')+'><div class="obs-card-top"><div><h3>'+esc(name)+'</h3><p class="obs-symbol">'+esc(s.market?.symbol||'SOLANA MAINNET')+'</p></div><span class="obs-badge">'+(isPreview?'Shared token preview':'Saved on this device')+'</span></div><p class="obs-address">'+esc(item.address)+'</p><div class="obs-badges">'+(stale?'<span class="obs-badge warn">Over 1 hour old</span>':'')+(!s.chain||!s.market?'<span class="obs-badge warn">Partial source coverage</span>':'')+(c&&!c.sameMarketPair?'<span class="obs-badge warn">Pool comparison unavailable</span>':'')+'</div><h4>'+esc(isPreview?'Public research snapshot':summary(item))+'</h4><p class="obs-dates">Collected '+esc(date(s.fetchedAt))+(c?'<br>Compared with '+esc(date(item.reference.fetchedAt)):'')+'</p>'+
 (c?'<ul class="obs-changes">'+rows.map(r=>'<li><span>'+esc(r.label)+'</span><strong>'+esc(change(r))+'</strong><small>'+esc(value(r,r.before))+' → '+esc(value(r,r.after))+' · '+(r.source==='S1'?'Solana confirmed account':'DEX Screener selected pool')+'</small></li>').join('')+'</ul>':'<ul class="obs-changes"><li><span>Indexed price</span><strong>'+esc(money(s.market?.priceUsd))+'</strong><small>DEX Screener · selected pool</small></li><li><span>Pair liquidity</span><strong>'+esc(money(s.market?.liquidityUsd))+'</strong><small>DEX Screener · selected pool</small></li></ul><p class="obs-fine">'+(isPreview?'Follow this token to save a starting point.':'Your starting point is saved. A newer observation is needed to show changes.')+'</p>')+
 (errors.has(item.address)?'<p class="obs-error">'+esc(errors.get(item.address))+' Previous evidence is kept.</p>':'')+
 '<div class="obs-card-actions">'+(isPreview?'<button class="obs-button primary" data-action="follow">Follow this token</button>':'<button class="obs-button" data-action="refresh">Refresh ↻</button>'+(c?'<button class="obs-button primary" data-action="review">Mark reviewed</button>':''))+'<button class="obs-button" data-action="share">Share token ↗</button><a class="obs-button" href="/terminal?token='+enc(item.address)+'">Open research ↗</a></div><details><summary>Sources, evidence &amp; options</summary><div class="obs-source-row">'+sources(s)+'</div><p>Selected pool: '+esc(s.market?.pairAddress||'Unavailable')+'</p><p>'+esc((c?.warnings||['Two observations are needed for a comparison.']).join(' '))+'</p><p>'+esc((Array.isArray(s.gaps)?s.gaps:[]).join(' '))+'</p><div class="obs-card-actions"><button class="obs-button" data-action="download">Download evidence ↓</button>'+(!isPreview?'<button class="obs-button" data-action="account">Save to account ↗</button><button class="obs-button" data-action="remove">Unfollow</button>':'')+'</div></details></article>';
}
function render(){
 $('obs-count').textContent=state.items.length+' followed';$('obs-auto').checked=state.auto;
 $('obs-list').innerHTML=state.items.length?state.items.slice(0,visibleCount).map(i=>card(i)).join(''):'<div class="obs-empty"><p class="obs-eyebrow">YOUR FIRST OBSERVATION STARTS HERE</p><h3>A watchlist with a memory.</h3><p>Paste a token address above. We’ll collect a starting snapshot so your next visit has something to compare.</p><button class="obs-button" data-action="try">Try the official PRLX token ↗</button></div>';
 $('obs-more').hidden=visibleCount>=state.items.length;
 $('obs-more').textContent='Show more tokens ('+Math.max(0,state.items.length-visibleCount)+' remaining)';
 $('obs-preview').hidden=!preview;$('obs-preview').innerHTML=preview?card({address:preview.address,reference:preview,latest:preview},true):'';
 controls();
}
function controls(){document.querySelectorAll('.observatory-main button,.observatory-main input').forEach(e=>e.disabled=busy);$('obs-refresh').disabled=busy||!state.items.length;}
async function snapshot(address){const data=await request('/api/market?address='+enc(address));if(!validSnapshot(data,address))throw Error('The source response was incomplete. Please retry.');checked.set(address,Date.now());return data;}
async function run(work){if(busy)return;busy=true;controls();try{await work();}catch(e){if(active)status(e.message||'The request failed. Please retry.',true);}finally{busy=false;if(active)controls();}}
async function follow(address,supplied){
 if(!addressOK(address))throw Error('Paste a valid Solana token contract address.');
 if(state.items.some(i=>i.address===address)){status('You already follow this token. Your reference is unchanged.');return;}
 status('Collecting your first observation…');const g=generation,s=supplied||await snapshot(address);if(!active||g!==generation)return;
 if(save(current=>{if(current.items.some(i=>i.address===address))return current;return {...current,items:[{address,reference:s,latest:s},...current.items]};})){
  window.dispatchEvent(new CustomEvent('parallax:observatory-activity',{detail:{kind:'follow'}}));errors.delete(address);preview=null;$('obs-form').reset();render();status('Token followed. Return here to compare a new observation with this starting point.');
 }
}
async function refresh(addresses){
 let success=0,failed=0,skipped=0;const g=generation;
 for(const address of addresses){if(!active||g!==generation||document.hidden)break;
  if(Date.now()-(checked.get(address)||0)<60000){skipped++;continue;}
  status('Refreshing '+(success+failed+skipped+1)+' of '+addresses.length+'…');
  try{const s=await snapshot(address);if(!active||g!==generation)return;
   if(!save(current=>({...current,items:current.items.map(i=>i.address===address?updateSnapshot(i,s):i)})))return;
   errors.delete(address);success++;
  }catch(e){if(!active||g!==generation)return;errors.set(address,e.message||'Unable to collect data.');failed++;if(e.status===429){render();status('Data requests are rate limited. Previous evidence is kept; retry in a minute.',true);return;}}
  render();
 }
 if(active)status(success+' refreshed · '+failed+' unavailable'+(skipped?' · '+skipped+' checked within the last minute':'')+'. References stay fixed until you mark them reviewed.',failed>0);
}
async function share(address,button){
 const url=location.origin+'/observatory?token='+enc(address);
 try{if(navigator.share){await navigator.share({title:'PARALLAX · Token research',url});return;}await navigator.clipboard.writeText(url);status('Token link copied. Your personal watchlist and history are not included.');}
 catch(e){if(e.name==='AbortError')return;const input=document.createElement('input');input.className='obs-share-link';input.readOnly=true;input.value=url;input.setAttribute('aria-label','Share this token link');button.closest('.obs-card').append(input);input.focus();input.select();status('Copy the selected link to share this token.');}
}
async function account(item){
 status('Saving a fresh snapshot to your account…');
 try{const report=await request('/api/control/passport',{address:item.address});await request('/api/control/following/add',{id:report.id});status('Saved to your account. Open Account-saved projects or Your Briefing to continue across devices.');}
 catch(e){if(e.status===401||e.status===403){status('Sign in with ChatGPT below, then choose Save to account again. Your device list is kept.',true);return;}throw e;}
}
$('obs-form').onsubmit=e=>{e.preventDefault();run(()=>follow($('obs-address').value.trim()));};
$('obs-refresh').onclick=()=>run(()=>refresh(state.items.map(i=>i.address)));
$('obs-more').onclick=()=>{visibleCount+=20;render();status('Showing '+Math.min(visibleCount,state.items.length)+' of '+state.items.length+' followed tokens.');};
$('obs-auto').onchange=e=>{if(save(s=>({...s,auto:e.target.checked})))status(e.target.checked?'Saved tokens will refresh when you reopen this page.':'Automatic refresh is off. Choose Refresh to collect new observations.');render();};
async function action(e){const button=e.target.closest('button[data-action]');if(!button||busy)return;
 const a=button.dataset.action;if(a==='try'){$('obs-address').value='8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump';$('obs-address').focus();status('Official PRLX address filled. Choose Follow token to start.');return;}
 const el=button.closest('[data-address]'),address=el?.dataset.address,isPreview=el?.dataset.preview==='true',item=isPreview?preview&&{address,reference:preview,latest:preview}:state.items.find(i=>i.address===address);if(!item)return;
 if(a==='share'){await share(address,button);return;}
 if(a==='refresh')return run(()=>refresh([address]));
 if(a==='follow')return run(()=>follow(address,preview));
 if(a==='account')return run(()=>account(item));
 if(a==='review'){
  if(save(s=>({...s,items:s.items.map(i=>i.address===address?{...i,reference:item.latest}:i)}))){window.dispatchEvent(new CustomEvent('parallax:observatory-activity',{detail:{kind:'review'}}));render();status('Reviewed. Future changes will compare with the observation you just reviewed.');}
 }
 if(a==='remove'){
  if(!confirm('Unfollow this token and remove its snapshots from this device? Account-saved reports are kept.'))return;
  if(save(s=>({...s,items:s.items.filter(i=>i.address!==address)}))){errors.delete(address);render();status('Token removed from this device.');}
 }
 if(a==='download'){
  const data={format:'parallax.observatory.evidence.v1',exportedAt:new Date().toISOString(),address,reference:item.reference,latest:item.latest,comparison:compareItem(item)};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='PARALLAX-'+address.slice(0,8)+'-evidence.json';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);status('Evidence downloaded with collection times and original source links.');
 }
}
$('obs-list').onclick=action;$('obs-preview').onclick=action;
window.addEventListener('storage',e=>{if(e.key===KEY){state=readState(e.newValue);render();}});
window.addEventListener('pagehide',()=>{active=false;generation++;});
window.addEventListener('pageshow',e=>{active=true;if(e.persisted){try{state=readState(localStorage.getItem(KEY));}catch{}render();if(state.auto)run(()=>refresh(state.items.map(i=>i.address)));}});
render();if(loadError)status('Browser storage could not be read. Enable browser storage to keep a watchlist.',true);
const token=new URLSearchParams(location.search).get('token');
run(async()=>{
 if(token){if(!addressOK(token))status('This shared link does not contain a valid Solana token address.',true);
  else if(!state.items.some(i=>i.address===token)){status('Loading the shared token’s public snapshot…');try{preview=await snapshot(token);if(active){render();status('Shared token loaded. Choose Follow this token to add it to your device.');}}catch(e){status(e.message,true);}}
 }
 if(state.auto&&state.items.length)await refresh(state.items.map(i=>i.address));
});
