/* Public discovery controller. Provider observations remain separate from unknown data. */
(function(){
 'use strict';
 const C=window.ParallaxTrenchesCore,$=id=>document.getElementById(id);
 if(!C||!$('trenches-main'))return;
 const STAGES=C.STAGES,NAMES={fresh:'Fresh launches',near:'Near graduation',graduated:'Graduated'},KEY='parallax:trenches:v1';
 let raw='';try{raw=localStorage.getItem(KEY)||'';}catch{}
 const preferences=C.preferences(raw),screen=matchMedia('(max-width:980px)');
 const queryStage=new URLSearchParams(location.search).get('stage');if(STAGES.includes(queryStage))preferences.activeStage=queryStage;
 const states=Object.fromEntries(STAGES.map(key=>[key,{pages:new Map(),incoming:new Map(),loading:false,sequence:0,error:'',retryAt:0,nextAt:0,hover:false,touch:false,scrollUntil:0,pendingRender:false,controller:null}]));
 const metadata=new Map(),infoQueue=[],infoControllers=new Set();let infoActive=0,hoverRoundAt=0,hoverRoundCount=0;
 let alive=true,query='',filterStage='fresh',filterOpener=null,timer=null,searchTimer=null,prebondPending=null;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const short=v=>v?v.slice(0,4)+'…'+v.slice(-4):'—';
 const compact=n=>C.number(n)===null?'—':new Intl.NumberFormat('en-US',{notation:n>=1000?'compact':'standard',maximumFractionDigits:n>=1000?1:0}).format(n);
 const dollars=n=>C.number(n)===null?'—':'$'+compact(n);
 const ago=v=>{const t=typeof v==='number'?v:C.timestamp(v);if(t===null||!Number.isFinite(t))return 'Unknown';const seconds=Math.max(0,Math.floor((Date.now()-t)/1000));return seconds<60?'Just now':seconds<3600?Math.floor(seconds/60)+'m ago':seconds<86400?Math.floor(seconds/3600)+'h ago':Math.floor(seconds/86400)+'d ago';};
 const age=v=>{const t=C.timestamp(v);if(t===null||t>Date.now()+60000)return '—';const minutes=Math.max(0,Math.floor((Date.now()-t)/60000));return minutes<1?'<1m':minutes<60?minutes+'m':minutes<1440?Math.floor(minutes/60)+'h':Math.floor(minutes/1440)+'d';};
 function save(){try{const value=JSON.stringify(preferences);if(value.length<=6000)localStorage.setItem(KEY,value);}catch{}}
 function list(key){return $('tr-list-'+key);}
 function locked(key){const s=states[key];return s.hover||s.touch||s.scrollUntil>Date.now()||list(key).contains(document.activeElement);}
 function rowsFor(key){return C.mergePages(states[key].pages).map(p=>metadata.get(p.mint)?.data?C.withMetadata(p,metadata.get(p.mint).data):p);}
 function metadataFilters(key){const f=preferences.filters[key];return f.minHolders>0||f.requireAnySocial||f.requiredSocials.length>0;}
 function metadataUnknown(key,rows){const f=preferences.filters[key];return C.metadataCandidates(rows,key,f,query).filter(p=>f.minHolders>0&&p.holders===null||(f.requireAnySocial||f.requiredSocials.length)&&p.linksStatus==='unavailable');}
 function updateGlobal(){
  const available=STAGES.filter(k=>states[k].pages.size).length,errors=STAGES.filter(k=>states[k].error).length,loading=STAGES.some(k=>states[k].loading);
  $('tr-global-status').textContent=preferences.paused?'Automatic refresh paused. You can still refresh a column.':available===0&&loading?'Loading the three stages…':available===0&&errors?'Discovery is unavailable. Use Refresh to try again.':errors?'Some feeds could not refresh. Previous observations are retained.':available+' of 3 feeds loaded · refreshes follow the source cache.';
  $('tr-global-status').dataset.error=String(errors>0);
  $('tr-refresh').disabled=loading;
  $('tr-pause').setAttribute('aria-pressed',String(preferences.paused));$('tr-pause').querySelector('span').textContent=preferences.paused?'Resume refresh':'Pause refresh';
  const descriptions=[...new Set(STAGES.map(k=>states[k].pages.get(1)?.coverage).filter(x=>typeof x==='string'&&x))];
  if(descriptions.length)$('tr-coverage-source').textContent=descriptions.join(' ');
 }
 function freshness(key){
  const s=states[key],d=s.pages.get(1),until=C.timestamp(d?.freshUntil),stale=!!d&&(d.stale===true||!!s.error||until!==null&&Date.now()>until+60000);
  $('tr-freshness-'+key).textContent=d?'Updated '+ago(d.fetchedAt)+' · '+String(d.source||'Indexed source').slice(0,50):s.loading?'Checking indexed pools…':s.error?'Source unavailable':'Waiting for data';
  $('tr-stale-'+key).hidden=!stale;
  const note=$('tr-status-'+key);note.dataset.error=String(!!s.error);
  if(s.error)note.textContent=s.pages.size?'Refresh unavailable · previous pools retained':s.error;
 }
 function syncControls(key){
  const f=preferences.filters[key],count=C.activeCount(f,key),parts=[f.valuationPolicy==='cap-only'?'MCAP only':'MCAP / FDV'];
  if(key==='near')parts.push(f.nearMinPercent+'%+ bonding');
  if(f.maxAgeMinutes)parts.push('Pool age ≤'+(f.maxAgeMinutes>=60?compact(f.maxAgeMinutes/60)+'h':f.maxAgeMinutes+'m'));
  if(f.minVolume)parts.push(dollars(f.minVolume)+'+ '+(f.volumeWindow==='h1'?'1h':'5m')+' vol');
  if(count>parts.length-1)parts.push(count+' active filters');else if(parts.length===1)parts.push('no extra filters');
  $('tr-summary-'+key).textContent=parts.join(' · ');$('tr-reset-'+key).hidden=count===0;
  $('tr-filter-count-'+key).hidden=count===0;$('tr-filter-count-'+key).textContent=String(count);
  $('tr-sort-'+key).value=f.sort;
  document.querySelectorAll('[data-tr-volume]').forEach(b=>{const [owner,value]=b.dataset.trVolume.split(':');if(owner===key)b.setAttribute('aria-pressed',String(value===f.volumeWindow));});
  if(key==='near')$('tr-near-description').textContent=f.nearMinPercent+'%+ of the curve completed.';
 }
 function linkIcon(type){return type==='website'?'<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3c4 4 4 10 0 14-4-4-4-10 0-14"/></svg>':type==='telegram'?'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m3 9 14-6-3 14-5-5-3 3 1-5 7-5-9 6z"/></svg>':'<svg viewBox="0 0 20 20" aria-hidden="true"><path d="m4 3 12 14M16 3 4 17M4 3h4l8 14h-4z"/></svg>';}
 function card(p,key){
  const f=preferences.filters[key],val=C.valuation(p,f.valuationPolicy),vol=C.volume(p,f.volumeWindow),progress=p.launchpad.progressPct,knownHolder=C.number(p.holders)!==null;
  const holderTitle=knownHolder?'Indexed holders'+(p.holdersUpdatedAt?' · observed '+p.holdersUpdatedAt:''):'Holder count unavailable. Open Details to check the metadata.';
  const info=metadata.get(p.mint),checking=info?.queued||info?.loading;
  const projectLinks=p.links.map(l=>'<a href="'+esc(l.url)+'" target="_blank" rel="noopener noreferrer" title="Reported '+esc(l.label)+' link">'+linkIcon(l.type)+'<span>'+esc(l.label)+'</span></a>').join('');
  const linkState=checking?'Checking details…':p.linksStatus==='none'?'No reported links':'Links unavailable';
  const details=!knownHolder||p.linksStatus==='unavailable'?'<button type="button" data-tr-detail="'+esc(p.mint)+'" aria-label="Check holder count and project links for '+esc(p.symbol)+'"'+(checking?' disabled':'')+'>'+ (checking?'Checking…':'Details')+'</button>':'';
  const status=p.launchpad.completed===true?'<div class="tr-completion"><span class="tr-completion-badge"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7"/></svg>'+ (p.launchpad.migratedPool===p.address?'Migration pool':'Curve complete')+'</span><span'+(p.launchpad.completedAt?' title="Curve completion reported '+esc(p.launchpad.completedAt)+'"':'')+'>'+(p.launchpad.completedAt?'Completed '+age(p.launchpad.completedAt)+' ago':'Completion time unavailable')+'</span></div>':progress!==null?'<div class="tr-progress"><label for="tr-meter-'+key+'-'+esc(p.mint)+'">BONDING</label><meter id="tr-meter-'+key+'-'+esc(p.mint)+'" min="0" max="100" value="'+progress+'">'+progress+'%</meter><strong>'+progress.toFixed(1).replace('.0','')+'%</strong></div>':'<div class="tr-progress tr-progress-unknown">Bonding progress unavailable</div>';
  return '<article class="tr-card" data-tr-mint="'+esc(p.mint)+'"><a class="tr-card-main" href="'+esc(C.terminalURL(p))+'" aria-label="Open '+esc(p.symbol)+' in Terminal"><div class="tr-card-heading"><span class="tr-token-image" aria-hidden="true">'+esc(p.symbol.slice(0,1))+(p.imageUrl?'<img src="'+esc(p.imageUrl)+'" alt="" loading="lazy" referrerpolicy="no-referrer">':'')+'</span><div class="tr-token-name"><strong>'+esc(p.symbol)+'</strong><span>'+esc(p.name)+'</span></div><span class="tr-pool-age"'+(p.createdAt?' title="Pool created '+esc(p.createdAt)+'"':'')+'><small>POOL AGE</small><span data-tr-age="'+esc(p.createdAt||'')+'">'+age(p.createdAt)+'</span></span></div><div class="tr-card-values"><div><span class="'+(val.label==='FDV'?'tr-fdv-label':'')+'" title="'+(val.label==='FDV'?'Fully diluted valuation; verified market cap is unavailable':'Reported market capitalization')+'">'+val.label+'</span><strong>'+dollars(val.value)+'</strong></div><div><span>'+(p.launchpad.completed===false?'RESERVES':'LIQUIDITY')+'</span><strong>'+dollars(p.liquidityUsd)+'</strong></div><div><span>'+ (f.volumeWindow==='h1'?'1H':'5M')+' VOLUME</span><strong>'+dollars(vol)+'</strong></div></div><div class="tr-card-activity"><span title="'+esc(holderTitle)+'">Holders <b>'+compact(p.holders)+'</b></span><span class="tr-trade-counts" title="Buy and sell counts in the last five minutes"><span>5m</span><b class="tr-buy">B '+compact(p.buys5m)+'</b><span>/</span><b class="tr-sell">S '+compact(p.sells5m)+'</b></span></div>'+status+'</a><div class="tr-card-footer"><div class="tr-card-links">'+(projectLinks||'<span class="tr-links-empty">'+linkState+'</span>')+details+'</div><a class="tr-card-address" href="https://solscan.io/token/'+esc(p.mint)+'" target="_blank" rel="noopener noreferrer" title="Token '+esc(p.mint)+' on Solscan">'+esc(short(p.mint))+' ↗</a></div></article>';
 }
 function render(key,force=false){
  const s=states[key];if(!alive)return;
  if(!force&&s.pages.size&&locked(key)){s.pendingRender=true;$('tr-held-'+key).hidden=false;return;}
  for(const [page,data]of s.incoming)s.pages.set(page,data);s.incoming.clear();s.pendingRender=false;$('tr-held-'+key).hidden=true;
  const all=rowsFor(key),eligible=all.filter(p=>C.eligibility(p,key)),visible=C.select(all,key,preferences.filters[key],query),unknown=metadataFilters(key)?metadataUnknown(key,all):[];
  const pending=unknown.filter(p=>metadata.get(p.mint)?.queued||metadata.get(p.mint)?.loading).length;
  $('tr-meta-'+key).hidden=!unknown.length;$('tr-meta-note-'+key).textContent=unknown.length+' pools need holder or link details.';
  $('tr-meta-check-'+key).disabled=!!pending||infoActive+infoQueue.length>=4;$('tr-meta-check-'+key).textContent=pending?'Checking '+pending+'…':'Check next 4';
  $('tr-count-'+key).textContent=String(visible.length);$('tr-tab-count-'+key).textContent=String(visible.length);
  const target=list(key),scroll=target.scrollTop;
  if(visible.length)target.innerHTML=visible.map(p=>card(p,key)).join('');
  else if(s.loading&&!s.pages.size)target.innerHTML='<div class="tr-empty"><span class="tr-empty-mark" aria-hidden="true">'+(STAGES.indexOf(key)+1).toString().padStart(2,'0')+'</span><strong>Reading '+esc(NAMES[key].toLowerCase())+'</strong><p>Checking indexed launchpad pools.</p></div>';
  else if(s.error&&!s.pages.size)target.innerHTML='<div class="tr-empty" data-error="true"><span class="tr-empty-mark" aria-hidden="true">↻</span><strong>This feed is unavailable</strong><p>'+esc(s.error)+'</p><button type="button" data-tr-retry="'+key+'">Try again</button></div>';
  else target.innerHTML='<div class="tr-empty"><span class="tr-empty-mark" aria-hidden="true">'+(STAGES.indexOf(key)+1).toString().padStart(2,'0')+'</span><strong>'+(unknown.length?'Some details are still unknown':eligible.length?'No loaded pools match':'No matching indexed pools')+'</strong><p>'+(unknown.length?unknown.length+' loaded '+(unknown.length===1?'pool needs':'pools need')+' holder or link details before these filters can be evaluated.':eligible.length?'Adjust this column’s filters, clear the search, or load another page.':'The source may not have matching pools yet. Try another stage or refresh later.')+'</p>'+(unknown.length?'<button type="button" data-tr-check="'+key+'"'+(pending?' disabled':'')+'>'+(pending?'Checking '+pending+' pools…':'Check up to 4 more pools')+'</button>':eligible.length?'<button type="button" data-tr-clear-empty="'+key+'">Clear this column’s filters</button>':'')+'</div>';
  target.scrollTop=scroll;target.setAttribute('aria-busy',String(s.loading&&!s.pages.size));
  const highest=Math.max(0,...s.pages.keys()),last=s.pages.get(highest),more=$('tr-more-'+key);more.hidden=!last?.hasMore||highest>=10;more.disabled=s.loading;more.innerHTML=s.loading?'Loading…':'Load more pools <span aria-hidden="true">↓</span>';
  const message=$('tr-status-'+key);message.dataset.error=String(!!s.error);
  if(!s.error)message.textContent=visible.length+' of '+eligible.length+' loaded'+(unknown.length?' · '+unknown.length+' unknown details':'')+(s.pages.get(1)?.partial?' · partial source':'');
  freshness(key);syncControls(key);updateGlobal();
 }
 function flush(key,force=false){if(force||!locked(key))render(key,force);}
 async function api(path,controller){
  const response=await fetch(path,{headers:{Accept:'application/json'},credentials:'same-origin',signal:controller.signal});
  let data;try{data=await response.json();}catch{throw Error('The data source returned an unreadable response.');}
  if(!response.ok){const error=new Error(typeof data?.error==='string'?data.error.slice(0,240):'The data source is unavailable.');error.retryAfter=Math.max(30,Math.min(86400,Number(data?.retryAfterSeconds)||Number(response.headers.get('Retry-After'))||60));throw error;}
  return data;
 }
 async function load(key,page=1){
  const s=states[key];if(!alive||s.loading||Date.now()<s.retryAt)return;
  const sequence=++s.sequence,controller=new AbortController();let timeout=null,previous=null,release=null;s.controller=controller;s.loading=true;
  // Fresh and Near read the same cached pre-bond snapshot. Finish one first-page
  // response before starting the other so separate Workers can reuse its D1 write.
  // Deeper pages and Graduated have independent caches and can load concurrently.
  if(page===1&&(key==='fresh'||key==='near')){
   previous=prebondPending;let unlock;const pending=new Promise(resolve=>{unlock=resolve;});prebondPending=pending;
   release=()=>{if(prebondPending===pending)prebondPending=null;unlock();};
  }
  if(!s.pages.size)render(key);else{list(key).setAttribute('aria-busy','true');$('tr-more-'+key).disabled=true;updateGlobal();}
  try{
   if(previous)await previous;
   if(!alive||sequence!==s.sequence||controller.signal.aborted)return;
   timeout=setTimeout(()=>controller.abort(),30000);
   const d=await api('/api/terminal/discover?'+new URLSearchParams({stage:key,page:String(page)}),controller);
   if(!alive||sequence!==s.sequence)return;
   if(d?.stage!==key||Number(d.page)!==page||!Array.isArray(d.pools))throw Error('The source response did not match this discovery stage.');
   d.pools=d.pools.slice(0,100).map(C.normalizePool).filter(Boolean);s.error='';s.retryAt=0;s.nextAt=Date.now()+Math.max(30,Math.min(1800,Number(d.refreshAfterSeconds)||300))*1000;s.incoming.set(page,d);
  }catch(e){if(!alive||sequence!==s.sequence)return;s.error=e.name==='AbortError'?'This feed timed out. Try again.':e.message||'This feed could not be loaded.';s.retryAt=Date.now()+Math.max(30,e.retryAfter||60)*1000;s.nextAt=s.retryAt;}
  finally{clearTimeout(timeout);release?.();if(alive&&sequence===s.sequence){s.loading=false;s.controller=null;list(key).setAttribute('aria-busy','false');render(key);freshness(key);updateGlobal();}}
 }
 function setStage(key,changeURL=true){
  if(!STAGES.includes(key))return;preferences.activeStage=key;save();
  for(const name of STAGES){const active=name===key,panel=$('tr-column-'+name),tab=$('tr-tab-'+name);panel.dataset.active=String(active);panel.hidden=screen.matches&&!active;panel.setAttribute('role',screen.matches?'tabpanel':'region');panel.setAttribute('aria-labelledby',screen.matches?'tr-tab-'+name:'tr-title-'+name);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;}
  if(changeURL){const u=new URL(location.href);u.searchParams.set('stage',key);history.replaceState(null,'',u.pathname+u.search+u.hash);}
 }
 function clearColumn(key){preferences.filters[key]={...C.defaults(key),maxAgeMinutes:0};save();list(key).scrollTop=0;render(key,true);}
 function enqueueMetadata(mint,explicit=false){
  if(!C.address(mint)||!alive)return false;
  const now=Date.now(),old=metadata.get(mint);if(old?.loading||old?.queued||old?.expiresAt>now||old?.retryAt>now)return false;
  if(!explicit){if(now-hoverRoundAt>120000){hoverRoundAt=now;hoverRoundCount=0;}if(hoverRoundCount>=4)return false;hoverRoundCount++;}
  if(infoQueue.length+infoActive>=4)return false;
  metadata.set(mint,{...old,queued:true});infoQueue.push(mint);drainMetadata();return true;
 }
 async function drainMetadata(){
  if(!alive||infoActive>=2||!infoQueue.length)return;
  const mint=infoQueue.shift(),prior=metadata.get(mint)||{},controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
  infoActive++;infoControllers.add(controller);metadata.set(mint,{...prior,queued:false,loading:true});
  try{const info=await api('/api/terminal/token-info?mint='+encodeURIComponent(mint),controller);if(info?.mint!==mint)throw Error('Token metadata did not match the requested token.');metadata.set(mint,{data:info,expiresAt:Date.now()+900000,loading:false,queued:false});}
  catch(e){metadata.set(mint,{...prior,loading:false,queued:false,retryAt:Date.now()+Math.max(60,e.retryAfter||300)*1000});}
  finally{clearTimeout(timeout);infoControllers.delete(controller);infoActive--;if(metadata.size>240){for(const [key,value]of metadata){if(!value.loading&&!value.queued){metadata.delete(key);break;}}}if(alive){for(const key of STAGES)render(key);drainMetadata();}}
  drainMetadata();
 }
 function checkDetails(key){
  const candidates=metadataUnknown(key,rowsFor(key));let count=0;
  for(const p of candidates){if(enqueueMetadata(p.mint,true))count++;if(count>=4)break;}
  if(count){$('tr-status-'+key).textContent='Checking details for '+count+' loaded '+(count===1?'pool':'pools')+'…';render(key,true);}
  else $('tr-status-'+key).textContent=infoActive||infoQueue.length?'A small batch of details is still loading.':'Details were checked recently. Missing data remains unknown.';
 }
 function hoverDetails(target){const card=target?.closest?.('[data-tr-mint]');if(!card)return;enqueueMetadata(card.dataset.trMint);}
 const numericFields=['minValuation','maxValuation','minLiquidity','minVolume','maxAgeMinutes','minHolders','minTrades5m','nearMinPercent'];
 function fillForm(key,filters){
  filterStage=key;$('tr-filter-title').textContent=NAMES[key];$('tr-filter-description').textContent='Apply these filters to '+NAMES[key].toLowerCase()+' in the loaded sample.';
  for(const field of numericFields)$('tr-f-'+field).value=filters[field]===0&&field!=='nearMinPercent'?'':String(filters[field]);
  $('tr-f-valuationPolicy').value=filters.valuationPolicy;$('tr-f-volumeWindow').value=filters.volumeWindow;$('tr-f-requireAnySocial').checked=filters.requireAnySocial;
  document.querySelectorAll('input[name="requiredSocials"]').forEach(input=>{input.checked=filters.requiredSocials.includes(input.value);});
  $('tr-near-fields').hidden=key!=='near';$('tr-f-nearMinPercent').disabled=key!=='near';$('tr-filter-error').hidden=true;
 }
 function openFilters(key,opener){filterOpener=opener;fillForm(key,preferences.filters[key]);$('tr-filters-dialog').showModal();}
 function closeFilters(){$('tr-filters-dialog').close();filterOpener?.focus();}
 $('tr-filter-form').addEventListener('submit',event=>{
  event.preventDefault();const value={...preferences.filters[filterStage]};for(const field of numericFields)value[field]=$('tr-f-'+field).value;
  if(Number(value.maxValuation)>0&&Number(value.minValuation)>Number(value.maxValuation)){$('tr-filter-error').textContent='Maximum valuation must be at least the minimum.';$('tr-filter-error').hidden=false;return;}
  value.valuationPolicy=$('tr-f-valuationPolicy').value;value.volumeWindow=$('tr-f-volumeWindow').value;value.requireAnySocial=$('tr-f-requireAnySocial').checked;value.requiredSocials=[...document.querySelectorAll('input[name="requiredSocials"]')].filter(input=>input.checked).map(input=>input.value);
  preferences.filters[filterStage]=C.cleanFilters(value,filterStage);save();list(filterStage).scrollTop=0;closeFilters();render(filterStage,true);if(metadataFilters(filterStage))checkDetails(filterStage);
 });
 $('tr-filter-close').addEventListener('click',closeFilters);$('tr-filter-reset').addEventListener('click',()=>fillForm(filterStage,C.defaults(filterStage)));
 $('tr-filters-dialog').addEventListener('click',event=>{if(event.target===$('tr-filters-dialog')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeFilters();}});
 document.querySelectorAll('[data-tr-filter]').forEach(b=>b.addEventListener('click',()=>openFilters(b.dataset.trFilter,b)));
 document.querySelectorAll('[data-tr-reset]').forEach(b=>b.addEventListener('click',()=>clearColumn(b.dataset.trReset)));
 document.querySelectorAll('[data-tr-sort]').forEach(s=>s.addEventListener('change',()=>{const key=s.dataset.trSort;preferences.filters[key]=C.cleanFilters({...preferences.filters[key],sort:s.value},key);save();render(key,true);}));
 document.querySelectorAll('[data-tr-volume]').forEach(b=>b.addEventListener('click',()=>{const [key,period]=b.dataset.trVolume.split(':');preferences.filters[key].volumeWindow=period;save();render(key,true);}));
 document.querySelectorAll('[data-tr-more]').forEach(b=>b.addEventListener('click',()=>{const key=b.dataset.trMore;load(key,Math.max(0,...states[key].pages.keys())+1);}));
 document.querySelectorAll('[data-tr-apply]').forEach(b=>b.addEventListener('click',()=>flush(b.dataset.trApply,true)));
  document.querySelectorAll('[data-tr-check-more]').forEach(b=>b.addEventListener('click',()=>checkDetails(b.dataset.trCheckMore)));
 document.querySelectorAll('[data-tr-tab]').forEach(b=>{b.addEventListener('click',()=>setStage(b.dataset.trTab));b.addEventListener('keydown',event=>{const index=STAGES.indexOf(b.dataset.trTab);let next;if(event.key==='ArrowRight')next=(index+1)%3;else if(event.key==='ArrowLeft')next=(index+2)%3;else if(event.key==='Home')next=0;else if(event.key==='End')next=2;else return;event.preventDefault();setStage(STAGES[next]);$('tr-tab-'+STAGES[next]).focus();});});
 for(const key of STAGES){
  const target=list(key),s=states[key];let hoverTimer=null,scrollTimer=null;
  target.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')s.hover=true;});
  target.addEventListener('pointerleave',()=>{s.hover=false;clearTimeout(hoverTimer);flush(key);});
  target.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>hoverDetails(event.target),600);});
  target.addEventListener('focusin',event=>hoverDetails(event.target));
  target.addEventListener('focusout',()=>setTimeout(()=>flush(key),0));
  target.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')s.touch=true;});
  for(const name of ['pointerup','pointercancel'])target.addEventListener(name,()=>{s.touch=false;setTimeout(()=>flush(key),1250);});
  target.addEventListener('scroll',()=>{s.scrollUntil=Date.now()+1100;clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>flush(key),1150);},{passive:true});
  target.addEventListener('error',event=>{if(event.target.tagName==='IMG')event.target.hidden=true;},true);
  target.addEventListener('click',event=>{const detail=event.target.closest('[data-tr-detail]'),check=event.target.closest('[data-tr-check]'),retry=event.target.closest('[data-tr-retry]'),clear=event.target.closest('[data-tr-clear-empty]');if(detail){enqueueMetadata(detail.dataset.trDetail,true);render(key);}else if(check)checkDetails(key);else if(retry)load(key);else if(clear)clearColumn(key);});
 }
 function changeSearch(){query=$('tr-search').value.slice(0,100).trim();$('tr-search-clear').hidden=!query;for(const key of STAGES){list(key).scrollTop=0;render(key,true);}}
 $('tr-search').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(changeSearch,130);});$('tr-search-clear').addEventListener('click',()=>{$('tr-search').value='';changeSearch();$('tr-search').focus();});
 $('tr-pause').addEventListener('click',()=>{preferences.paused=!preferences.paused;save();updateGlobal();if(!preferences.paused)tick();});
 $('tr-refresh').addEventListener('click',()=>{for(const key of STAGES)load(key);});
 function tick(){
  if(!alive)return;for(const key of STAGES){freshness(key);const s=states[key];if(s.pendingRender&&!locked(key))flush(key);if(!document.hidden&&!preferences.paused&&!s.loading&&Date.now()>=s.nextAt)load(key);}
  document.querySelectorAll('[data-tr-age]').forEach(node=>{node.textContent=age(node.dataset.trAge);});
 }
 screen.addEventListener?.('change',()=>setStage(preferences.activeStage,false));document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
 window.addEventListener('pagehide',()=>{alive=false;prebondPending=null;clearInterval(timer);for(const key of STAGES){const s=states[key];s.sequence++;s.controller?.abort();s.loading=false;s.controller=null;}for(const mint of infoQueue){const old=metadata.get(mint);if(old)old.queued=false;}infoQueue.length=0;for(const controller of infoControllers)controller.abort();});
 window.addEventListener('pageshow',event=>{if(event.persisted){alive=true;for(const key of STAGES)render(key);timer=setInterval(tick,5000);tick();}});
 setStage(preferences.activeStage,false);for(const key of STAGES){syncControls(key);load(key);}updateGlobal();timer=setInterval(tick,5000);
})();
