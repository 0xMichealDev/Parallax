(() => {
  'use strict';
  const root=document.querySelector('[data-following]');if(!root)return;
  const $=selector=>root.querySelector(selector),compact=root.dataset.following==='compact';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const date=value=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Time unavailable';
  const urlValue=value=>encodeURIComponent(value);
  const api=(action,body)=>window.ParallaxResearch.request('/api/control/'+action,body);
  const form=$('[data-follow-form]'),list=$('[data-follow-list]'),gate=$('[data-follow-gate]'),retry=$('[data-follow-retry]');
  let projects=[],signedIn=false,epoch=0,pendingReport=null,working=false,pageActive=true;
  function status(message,error=false){const el=$('[data-follow-status]');el.textContent=message;el.classList.toggle('error',error);}
  function signIn(){signedIn=false;projects=[];pendingReport=null;list.innerHTML='';$('[data-follow-count]').textContent='';if(form)form.hidden=true;gate.hidden=false;
    gate.innerHTML='<div class="following-gate"><div><h3>Your research, ready when you return.</h3><p>Sign in to follow projects and keep your baseline across devices. This list is private to your account.</p></div><a class="follow-button follow-primary" target="_top" href="/signin-with-chatgpt?return_to='+urlValue(location.pathname+location.search)+'">Sign in with ChatGPT ↗</a></div>';status('');retry.hidden=true;
  }
  function fail(error){if(error.status===401){++epoch;signIn();return;}status(error.message||'Your projects could not be loaded. Please retry.',true);retry.hidden=false;}
  function comparisonURL(p){return '/control?before='+urlValue(p.baseline.id)+'&after='+urlValue(p.latest.id)+'&from=following#compare';}
  function difference(row){
    if(row.unit==='usd'&&typeof row.delta==='number')return (row.delta>0?'+':'')+row.delta.toLocaleString(undefined,{style:'currency',currency:'USD',maximumSignificantDigits:5});
    if(row.key==='supply')return (String(row.delta).startsWith('-')?'':'+')+String(row.delta)+' tokens';
    return 'Changed · review before and after';
  }
  function changeSummary(p){
    if(p.state==='baseline-only')return '<h4>Baseline saved.</h4><p>Collect another snapshot to compare. Your starting point stays fixed.</p>';
    if(p.state==='missing-baseline')return '<h4>Choose a new baseline.</h4><p>The baseline report was deleted. Your project is still followed; open Manage project to use the latest saved snapshot.</p>';
    if(p.state==='missing-snapshots')return '<h4>No saved snapshots remain.</h4><p>Collect a snapshot, then set it as the new baseline in Manage project.</p>';
    if(!p.comparison)return '<h4>These snapshots cannot be compared.</h4><p>Collect a newer snapshot or review your baseline. Collection times must differ.</p>';
    const c=p.comparison,rows=c.rows.filter(r=>r.status==='changed'&&['supply','mintAuthority','freezeAuthority','priceUsd','liquidityUsd'].includes(r.key)).slice(0,compact?2:3);
    return '<h4>'+c.counts.changed+' observed '+(c.counts.changed===1?'change':'changes')+'</h4><p>Since your baseline · '+c.counts.unchanged+' unchanged · '+c.counts.unknown+' unavailable or not comparable</p>'+
      (rows.length?'<ul>'+rows.map(r=>'<li>'+esc(r.label)+': '+esc(difference(r))+'<small>'+esc(r.source==='S1'?'Solana account data':'DEX Screener · selected pool')+'</small></li>').join('')+'</ul>':'')+
      (!c.sameMarketPair?'<p>Market differences are withheld when a source is missing or the selected pool changes.</p>':'')+
      (!compact?'<p>Two observations, not every event. No change does not establish safety.</p>':'');
  }
  function sources(p){return (p.latest?.sources||[]).filter(s=>s.status==='retrieved').map(s=>{
    let u;try{u=new URL(s.url);}catch{return '';}
    if(u.protocol!=='https:'||!['solscan.io','dexscreener.com'].includes(u.hostname))return '';
    return '<a href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer">'+esc(s.id==='S1'?'Solscan':'DEX Screener')+' ↗</a>';
  }).join('');}
  function card(p){const stale=p.latest&&Date.now()-Date.parse(p.latest.collectedAt)>86400000;
    return '<article class="following-card" data-project="'+esc(p.address)+'"><div class="following-card-top"><span class="following-token-icon" aria-hidden="true">◎</span><div><h3>'+esc(p.name)+'</h3><p class="following-symbol">'+esc(p.symbol||'SOLANA MAINNET')+'</p></div></div><p class="following-address">'+esc(p.address)+'</p><div class="following-badges"><span>Private</span>'+(stale?'<span class="follow-warning">Snapshot over 24h old</span>':'<span>Saved snapshot</span>')+(p.latest?.partial?'<span class="follow-warning">Partial source coverage</span>':'')+'</div><dl class="following-dates"><div><dt>Baseline</dt><dd>'+esc(p.baseline?date(p.baseline.collectedAt):'Not available')+'</dd></div><div><dt>Latest saved</dt><dd>'+esc(p.latest?date(p.latest.collectedAt):'Not available')+'</dd></div></dl><div class="following-change">'+changeSummary(p)+'</div><div class="following-actions">'+
      (p.comparison?'<a class="follow-button follow-primary" href="'+esc(comparisonURL(p))+'">Review changes ↗</a>':p.latest?'<a class="follow-button" href="/control?report='+urlValue(p.latest.id)+'">Open Passport ↗</a>':'')+
      (compact?'<a class="follow-button" href="/following">Manage ↗</a>':'<button type="button" class="follow-button" data-action="refresh">Collect new snapshot</button>')+'</div>'+
      (!compact?'<div class="following-sources">'+sources(p)+'</div><details><summary>Manage project</summary><p>Replacing the baseline starts a new comparison period. Your saved reports remain in My reports.</p><div class="following-actions">'+(p.latest&&p.latest.id!==p.baseline?.id?'<button type="button" class="follow-button" data-action="baseline">Use latest as baseline</button>':'')+(p.baseline?'<a class="follow-button" href="/control?report='+urlValue(p.baseline.id)+'">Open baseline ↗</a>':'')+'<button type="button" class="follow-button follow-remove" data-action="remove">Unfollow project</button></div></details>':'')+'</article>';
  }
  function render(){
    gate.hidden=true;if(form)form.hidden=false;
    $('[data-follow-count]').textContent=projects.length+' / 20';
    list.innerHTML=projects.length?projects.slice(0,compact?3:20).map(card).join(''):'<div class="following-empty"><div><h3>Your next visit starts here.</h3><p>Follow a token to keep its first snapshot as your baseline. Come back, collect a newer snapshot, and review what changed.</p></div>'+(compact?'<a class="follow-button follow-primary" href="/following">Follow your first project ↗</a>':'<a class="follow-button" href="/control#vault">Follow from a saved Passport ↗</a>')+'</div>';
    controls();
  }
  function controls(){root.querySelectorAll('button,input').forEach(el=>el.disabled=working);if(form){const button=form.querySelector('[type=submit]');button.disabled=working||projects.length>=20;button.textContent=working?'Working…':projects.length>=20?'20 projects followed':pendingReport?'Retry saving this baseline':'Create baseline & follow ↗';}}
  async function load(){if(!pageActive)return false;const requestEpoch=++epoch;retry.hidden=true;
    try{const data=await api('following');if(requestEpoch!==epoch)return false;signedIn=true;projects=data.projects;render();status(projects.length?compact?'Showing '+Math.min(3,projects.length)+' of '+projects.length+' followed projects.':'Saved observations loaded. Choose a project to collect new evidence.':'');return true;}
    catch(error){if(requestEpoch!==epoch)return false;fail(error);return false;}
  }
  retry.onclick=()=>{status('Loading your saved projects…');load();};
  if(form){
    form.querySelector('input').addEventListener('input',()=>{if(pendingReport&&pendingReport.address!==form.querySelector('input').value.trim()){pendingReport=null;controls();}});
    form.onsubmit=async event=>{event.preventDefault();if(working||!signedIn)return;
      const address=form.querySelector('input').value.trim();
      if(!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)){status('Enter a valid Solana token contract address.',true);return;}
      if(projects.some(p=>p.address===address)){status('You already follow this project. Your original baseline is unchanged.');return;}
      working=true;controls();status(pendingReport?'Saving your baseline…':'Collecting source data for your baseline…');
      try{if(!pendingReport)pendingReport=await api('passport',{address});await api('following/add',{id:pendingReport.id});pendingReport=null;form.reset();if(await load())status('Project followed. Your baseline is saved; future scans will not replace it.');}
      catch(error){fail(error);if(error.status!==401&&pendingReport)status('The Passport is saved, but the project could not be followed. '+error.message+' Retry saving this baseline below.',true);}
      finally{working=false;controls();}
    };
  }
  list.onclick=async event=>{const button=event.target.closest('button[data-action]');if(!button||working||!signedIn)return;
    const p=projects.find(item=>item.address===button.closest('[data-project]').dataset.project);if(!p)return;
    const action=button.dataset.action;
    if(action==='baseline'&&!confirm('Use the snapshot from '+date(p.latest.collectedAt)+' as your new baseline? Your earlier reports will remain saved.'))return;
    working=true;controls();status(action==='refresh'?'Collecting a new snapshot. Your baseline will stay the same…':'Saving your changes…');
    try{let message='';
      if(action==='refresh'){const result=await api('passport',{address:p.address});message=result.cached?'Reused your recent snapshot. A new scan is available in '+result.retryAfterSeconds+' seconds.':'New snapshot saved. Compare it with your baseline to review the evidence.';}
      else if(action==='baseline'){await api('following/baseline',{address:p.address,id:p.latest.id,confirmed:true});message='Baseline updated. Your earlier reports remain saved.';}
      else if(action==='remove'){await api('following/remove',{address:p.address});message='Project unfollowed. Your saved Passports remain in My reports.';}
      if(await load())status(message);
    }catch(error){fail(error);}
    finally{working=false;controls();}
  };
  // Do not restore another account's private cards from the browser back/forward cache.
  window.addEventListener('pagehide',()=>{pageActive=false;++epoch;projects=[];list.innerHTML='';gate.innerHTML='';if(form)form.hidden=true;$('[data-follow-count]').textContent='';status('Loading your saved projects…');});
  window.addEventListener('pageshow',event=>{pageActive=true;if(event.persisted)load();});
  load();
})();
