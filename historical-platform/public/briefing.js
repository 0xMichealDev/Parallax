(() => {
 'use strict';
 const $=id=>document.getElementById(id);if(!$('briefing-list'))return;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const enc=encodeURIComponent,api=(path,body)=>window.ParallaxResearch.request(path,body);
 const date=value=>{const d=new Date(value);return Number.isFinite(d.getTime())?d.toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'Time unavailable';};
 const labels={update:'Creator update',released:'Released','in-progress':'In progress',planned:'Planned'};
 let data=null,readFilter='unread',kindFilter='all',loading=false,working=false,refreshing=false,stop=false,active=true,epoch=0,lifecycle=0;
 const allItems=()=>data?[...data.research,...data.updates]:[];
 const visibleItems=()=>allItems().filter(i=>(readFilter==='all'||i.unread)&&(kindFilter==='all'||i.kind===kindFilter)).sort((a,b)=>activity(b)-activity(a)||a.id.localeCompare(b.id));
 const activity=i=>i.kind==='research'?Date.parse(i.latest?.collectedAt||'')||0:i.activityAt||0;
 const marker=i=>({kind:i.kind,id:i.id,version:i.version});
 function status(message,error=false){$('briefing-status').textContent=message;$('briefing-status').classList.toggle('error',error);}
 function clearPrivate(showGate=false){++epoch;++lifecycle;stop=true;loading=false;working=false;refreshing=false;data=null;$('briefing-list').innerHTML='';$('briefing-workspace').hidden=true;$('briefing-gate').hidden=!showGate;['briefing-unread','briefing-changed','briefing-gaps'].forEach(id=>$(id).textContent='—');$('briefing-loaded-at').textContent='';$('briefing-refresh-status').textContent='';$('briefing-showing').textContent='';}
 function fail(error){if([401,403].includes(error.status)){clearPrivate(true);$('briefing-retry').hidden=true;status('Sign in to continue with your private briefing.');return;}status(error.message||'Your briefing could not load. Please retry.',true);$('briefing-retry').hidden=false;}
 function value(row,v){if(v===null||v===undefined)return 'Unavailable';if(row.unit==='usd'&&typeof v==='number')return v.toLocaleString(undefined,{style:'currency',currency:'USD',maximumSignificantDigits:5});if(row.unit==='address'&&String(v).length>24)return String(v).slice(0,7)+'…'+String(v).slice(-6);return String(v);}
 function difference(row){if(row.unit==='usd'&&typeof row.delta==='number')return (row.delta>0?'+':'')+value(row,row.delta);if(row.key==='supply'&&row.delta!==null)return (String(row.delta).startsWith('-')?'':'+')+String(row.delta)+' tokens';return 'Changed';}
 function sourceLinks(item){return (item.latest?.sources||[]).filter(s=>s.status==='retrieved').map(s=>{let u;try{u=new URL(s.url);}catch{return '';}
  if(u.protocol!=='https:'||!['solscan.io','dexscreener.com'].includes(u.hostname)||u.username||u.password)return '';
  return '<a href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer">'+esc(s.id==='S1'?'Solscan':'DEX Screener')+' ↗</a>';
 }).join('');}
 function reviewButton(i){return i.version?'<button class="brief-text-button" type="button" data-action="'+(i.unread?'read':'unread')+'">'+(i.unread?(i.kind==='research'?'Mark reviewed':'Mark read'):'Mark unread')+'</button>':'';}
 function researchCard(i){
  const stale=i.latest&&Date.now()-Date.parse(i.latest.collectedAt)>86400000;
  const referenceLabels={'baseline':'your saved baseline','last-review':'your last reviewed snapshot','previous-review':'the review interval you just acknowledged'};
  let title='A reference snapshot is missing.',description='The earlier saved report is unavailable. Collect and review a new snapshot to start a new review interval.';
  if(i.state==='missing-snapshot'){title='A new snapshot is needed.';description='No valid saved snapshot is available for this followed token. Refresh the project to collect evidence.';}
  else if(i.state==='first-snapshot'){title='Your first snapshot is ready.';description='Review this starting point. Collect a newer snapshot later to see observed differences.';}
  else if(i.state==='not-comparable'){title='These observations cannot be compared.';description='The saved snapshots do not form a valid comparison. Check their collection times and sources, or collect a new snapshot.';}
  else if(i.comparison){title=i.comparison.counts.changed?i.comparison.counts.changed+' observed '+(i.comparison.counts.changed===1?'change.':'changes.'):'No changes in comparable fields.';description='Compared with '+referenceLabels[i.referenceKind]+'. '+i.comparison.counts.unchanged+' unchanged · '+i.comparison.counts.unknown+' unavailable or not comparable.';}
  const rows=(i.comparison?.rows||[]).filter(r=>r.status==='changed'&&['supply','mintAuthority','freezeAuthority','priceUsd','liquidityUsd'].includes(r.key)).slice(0,3);
  const compare=i.reference&&i.latest&&i.comparison?'/control?before='+enc(i.reference.id)+'&after='+enc(i.latest.id)+'&from=briefing#compare':null;
  return '<article class="briefing-card research '+(i.unread?'is-unread':'is-read')+'" data-kind="research" data-id="'+esc(i.id)+'"><div class="briefing-card-top"><div class="briefing-project"><span class="briefing-project-icon" aria-hidden="true">◎</span><div><h3>'+esc(i.name)+'</h3><p>'+esc(i.symbol||'SOLANA')+' / RESEARCH SNAPSHOT</p></div></div><span class="briefing-read-label">'+(!i.latest?'Needs evidence':i.unread?i.markedUnread?'Marked unread':'Unread':'Reviewed')+'</span></div><h4>'+esc(title)+'</h4><p class="briefing-card-description">'+esc(description)+'</p><div class="briefing-badges"><span>'+esc(i.latest?'Collected '+date(i.latest.collectedAt):'No snapshot')+'</span>'+(stale?'<span class="warning">Over 24 hours old</span>':'')+(i.latest?.partial?'<span class="warning">Partial source coverage</span>':'')+(i.comparison&&!i.comparison.sameMarketPair?'<span class="warning">Market comparison unavailable</span>':'')+'</div>'+
   (rows.length?'<ul class="briefing-differences">'+rows.map(r=>'<li><span>'+esc(r.label)+'</span><strong>'+esc(difference(r))+'</strong><small>'+esc(value(r,r.before))+' → '+esc(value(r,r.after))+' · '+(r.source==='S1'?'Solana account data':'DEX Screener selected pool')+'</small></li>').join('')+'</ul>':'')+
   '<div class="briefing-card-actions">'+(compare?'<a class="brief-button" href="'+esc(compare)+'">Review the evidence ↗</a>':i.latest?'<a class="brief-button" href="/control?report='+enc(i.latest.id)+'">Open Passport ↗</a>':'')+'<button class="brief-button" type="button" data-action="refresh">Refresh project ↻</button>'+reviewButton(i)+'</div><details><summary>Sources &amp; review history</summary><p>Token: '+esc(i.address)+'</p><p>Reference: '+esc(i.reference?date(i.reference.collectedAt):'Unavailable')+'<br>Latest snapshot: '+esc(i.latest?date(i.latest.collectedAt):'Unavailable')+'<br>Last marked reviewed: '+esc(i.reviewedAt?date(i.reviewedAt):'Not yet reviewed')+'</p><div class="briefing-sources">'+sourceLinks(i)+'</div>'+(i.reference?'<a href="/control?report='+enc(i.reference.id)+'">Open reference Passport ↗</a>':'')+'<p>'+esc(i.comparison?.warnings?.join(' ')||'Two snapshots show observations at collection time, not every event. Missing evidence remains unknown.')+'</p><p>Your original Saved projects baseline is unchanged by briefing reviews.</p></details></article>';
 }
 function updateCard(i){return '<article class="briefing-card creator '+(i.unread?'is-unread':'is-read')+'" data-kind="update" data-id="'+esc(i.id)+'"><div class="briefing-card-top"><div class="briefing-project"><span class="briefing-project-icon" aria-hidden="true">◎</span><div><h3>'+esc(i.name)+'</h3><p>'+esc(i.symbol||'CREATOR WORLD')+' / CREATOR UPDATE</p></div></div><span class="briefing-read-label">'+(i.unread?'Unread':'Read')+'</span></div><div class="briefing-badges"><span>'+esc(labels[i.status]||'Creator update')+'</span>'+(i.editedAt?'<span>Edited · revision '+esc(i.version)+'</span>':'')+'</div><h4>'+esc(i.title)+'</h4><p class="briefing-update-body">'+esc(i.body)+'</p><p class="briefing-update-date">Published '+esc(date(i.createdAt))+(i.editedAt?' · Edited '+esc(date(i.editedAt)):'')+' · Creator statement</p><div class="briefing-card-actions"><a class="brief-button" href="/world/'+enc(i.projectId)+'#project-update-feed">Open project &amp; sources ↗</a>'+reviewButton(i)+'</div></article>';}
 function controls(){const disabled=working||refreshing||loading;
  ['briefing-refresh','briefing-reload','briefing-more','briefing-retry','briefing-mark-visible'].forEach(id=>$(id).disabled=disabled);
  $('briefing-list').querySelectorAll('button').forEach(b=>b.disabled=disabled);
  if(!data)return;
  $('briefing-refresh').disabled=disabled||data.research.length===0;
  $('briefing-refresh').textContent='Refresh '+data.research.length+' followed '+(data.research.length===1?'project':'projects')+' ↻';
  const count=visibleItems().filter(i=>i.unread&&i.version).length;
  $('briefing-mark-visible').disabled=disabled||!count;
  $('briefing-mark-visible').textContent=count>50?'Mark first 50 displayed items reviewed':'Mark '+count+' displayed '+(count===1?'item':'items')+' reviewed';
  $('briefing-stop').hidden=!refreshing;$('briefing-stop').disabled=stop;
 }
 function render(){if(!data)return;$('briefing-gate').hidden=true;$('briefing-workspace').hidden=false;
  const c=data.counts;$('briefing-unread').textContent=(c.unreadResearch+c.unreadUpdates).toLocaleString();$('briefing-changed').textContent=c.changedProjects.toLocaleString();$('briefing-gaps').textContent=c.needsEvidence.toLocaleString();$('briefing-loaded-at').textContent='Loaded '+date(data.generatedAt);
  $('brief-filter-unread').setAttribute('aria-pressed',String(readFilter==='unread'));$('brief-filter-all').setAttribute('aria-pressed',String(readFilter==='all'));
  const items=visibleItems();$('briefing-showing').textContent=items.length+' displayed · '+data.updates.length+' of '+c.totalUpdates+' creator updates loaded';
  $('briefing-list').innerHTML=items.length?items.map(i=>i.kind==='research'?researchCard(i):updateCard(i)).join(''):
   '<div class="briefing-empty"><span class="briefing-empty-symbol" aria-hidden="true">◎</span><h3>'+(!data.research.length&&!c.totalUpdates?'Build your first briefing.':data.nextCursor?'No matching items in this page.':readFilter==='unread'?'You’re caught up in this view.':'Nothing in this view yet.')+'</h3><p>'+(!data.research.length&&!c.totalUpdates?'Follow a token from a saved Passport or follow a creator’s planet. Your research and their published updates will appear here.':data.nextCursor?'Load older creator updates below, or choose another filter.':'Refresh your followed projects for new evidence, or switch to All items to revisit your saved research.')+'</p><a class="brief-button" href="/following">Manage followed projects ↗</a><a class="brief-button" href="/explore">Explore creator worlds ↗</a></div>';
  $('briefing-more').hidden=!data.nextCursor;controls();
 }
 async function load(append=false){if(!active)return false;const token=++epoch;loading=true;controls();$('briefing-retry').hidden=true;
  try{const result=await api('/api/briefing'+(append&&data?.nextCursor?'?cursor='+enc(data.nextCursor):''));if(token!==epoch||!active)return false;
   if(append&&data){const combined=new Map(data.updates.map(i=>[i.id,i]));result.updates.forEach(i=>combined.set(i.id,i));result.updates=[...combined.values()];}
   data=result;render();status('Saved research and creator statements. Choose a refresh to collect new source data.');return true;
  }catch(error){if(token===epoch&&active)fail(error);return false;}
  finally{if(token===epoch){loading=false;controls();}}
 }
 async function mark(items,action){if(working||refreshing||loading||!items.length)return;const life=lifecycle;working=true;controls();
  try{const result=await api('/api/briefing',{action,items:items.slice(0,50).map(marker)});if(!active||life!==lifecycle)return;
   if(await load())status(result.changed<result.requested?'Saved eligible items. Some changed or were removed; the briefing has been reloaded.':action==='read'?'Your review is saved. New snapshots and edited announcements will appear unread.':'Marked unread. Your research checkpoint has been kept.');
  }catch(error){if(active&&life===lifecycle)fail(error);}finally{if(life===lifecycle){working=false;controls();}}
 }
 async function refreshProjects(projects){if(refreshing||working||loading||!projects.length)return;refreshing=true;stop=false;controls();
  const token=epoch,results={fresh:0,cached:0,failed:0,partial:0};let processed=0,reason='';
  for(const project of projects){if(stop||!active||token!==epoch)break;
   $('briefing-refresh-status').textContent='Collecting '+(processed+1)+' of '+projects.length+' · '+project.name;
   try{const result=await api('/api/control/passport',{address:project.address});if(!active||token!==epoch)return;
    results[result.cached?'cached':'fresh']++;try{const payload=JSON.parse(result.payload);if(!payload.chain||!payload.market)results.partial++;}catch{}
   }catch(error){if(!active||token!==epoch)return;results.failed++;if([401,403].includes(error.status)){fail(error);return;}if(error.status===429){reason=error.message;stop=true;}}
   processed++;
  }
  if(active&&token===epoch){await load();if(data){$('briefing-refresh-status').textContent=results.fresh+' new · '+results.cached+' reused · '+results.failed+' failed'+(results.partial?' · '+results.partial+' partial':'')+(processed<projects.length?' · '+(projects.length-processed)+' not requested':'')+'. '+(reason||'Your reviews and original baselines are unchanged.');}}
 }
 async function runRefresh(projects){if(refreshing||working||loading||!active)return;const life=lifecycle;try{await refreshProjects(projects);}finally{if(life===lifecycle){refreshing=false;controls();}}}
 $('brief-filter-unread').onclick=()=>{readFilter='unread';render();};$('brief-filter-all').onclick=()=>{readFilter='all';render();};
 $('briefing-type').onchange=e=>{kindFilter=e.target.value;render();};
 $('briefing-reload').onclick=()=>load();$('briefing-retry').onclick=()=>{loading=false;load();};$('briefing-more').onclick=()=>load(true);
 $('briefing-refresh').onclick=()=>runRefresh(data?.research||[]);$('briefing-stop').onclick=()=>{stop=true;controls();$('briefing-refresh-status').textContent='Stopping after the current project finishes. Completed snapshots stay saved.';};
 $('briefing-mark-visible').onclick=()=>mark(visibleItems().filter(i=>i.unread&&i.version),'read');
 $('briefing-list').onclick=e=>{const button=e.target.closest('button[data-action]');if(!button||working||refreshing||loading)return;const card=button.closest('[data-id]'),item=allItems().find(i=>i.id===card?.dataset.id&&i.kind===card?.dataset.kind);if(!item)return;
  if(button.dataset.action==='refresh')runRefresh([item]);else mark([item],button.dataset.action);
 };
 window.addEventListener('pagehide',()=>{active=false;clearPrivate();status('Loading your private briefing…');});
 window.addEventListener('pageshow',e=>{active=true;if(e.persisted){loading=false;working=false;refreshing=false;load();}});
 load();
})();
