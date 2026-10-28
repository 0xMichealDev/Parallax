(()=>{'use strict';
 const roots=[...document.querySelectorAll('[data-discovery]')],full=roots.find(r=>r.dataset.discovery==='full');
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const a=(text,path,cls='discovery-button')=>{const n=el('a',cls,text);n.href=typeof path==='string'&&path.startsWith('/')&&!path.startsWith('//')?path:'/discover';return n;};
 const button=(text,fn)=>{const n=el('button','discovery-button',text);n.type='button';n.onclick=fn;return n;};
 const fullFallback=full?.querySelector('[data-discovery-missions]')?.cloneNode(true);
 let active=true,epoch=0,pendingComparison=null,lastComparison='';
 function status(root,text,error=false){let n=root.querySelector('[data-discovery-status]');if(!n){n=el('p','discovery-status');n.setAttribute('data-discovery-status','');n.setAttribute('role','status');n.setAttribute('aria-live','polite');root.append(n);}n.textContent=text;n.dataset.error=String(error);}
 function ring(data){const n=el('div','discovery-progress-ring');n.style.setProperty('--progress',String(data.completed/3*100));n.setAttribute('role','img');n.setAttribute('aria-label',data.completed+' of 3 missions completed');const core=el('div','discovery-progress-core');core.append(el('strong','',data.completed+'/3'),el('small','','MISSIONS'));n.append(core);return n;}
 function clear(){lastComparison='';pendingComparison=null;for(const r of roots){if(r===full){r.querySelector('[data-discovery-profile]').replaceChildren();if(fullFallback)r.querySelector('[data-discovery-missions]').replaceChildren(...[...fullFallback.cloneNode(true).children]);}else r.replaceChildren();}}
 function guest(){clear();for(const r of roots){const box=el('div','discovery-summary'),copy=el('div','discovery-summary-copy');copy.append(el('p','discovery-eyebrow','DISCOVERY MISSIONS'),el('h2','','Your next discovery starts here.'),el('p','','Three free missions. Sign in to save your Explorer achievements.'));
   const sign=a('Sign in to save progress ↗','/signin-with-chatgpt?return_to='+encodeURIComponent(location.pathname+location.search+(r===full?'#mission-board':'')),'discovery-button discovery-primary');sign.target='_top';const actions=el('div','discovery-actions');actions.append(sign);if(r!==full)actions.append(a('Explore the missions ↗','/discover','discovery-text-link'));box.append(copy,actions);if(r===full)r.querySelector('[data-discovery-profile]').append(box);else r.append(box);status(r,'Free to participate · No wallet required');}}
 function render(data){
  if(!Array.isArray(data.missions)||data.missions.length!==3||!Number.isInteger(data.completed)||data.completed<0||data.completed>3)throw Error('Progress could not be read. Please retry.');
  for(const root of roots){
   if(root===full){
    const profile=root.querySelector('[data-discovery-profile]');profile.replaceChildren();const copy=el('div','discovery-profile-copy');copy.append(el('p','discovery-eyebrow','YOUR EXPLORER PROFILE / PRIVATE'),el('h2','',data.rank),el('p','',data.completed===3?'First expedition complete. Your next perspective is waiting.':'Your progress stays with your account, across visits and devices.'));
    const meta=el('div','discovery-profile-meta');meta.append(el('span','discovery-level',data.points+' / 100 XP'),el('p','','Achievement points · No monetary value'));if(data.completed===3)meta.append(el('p','discovery-earned','✧ Pathfinder badge earned'),a('Return to saved projects ↗','/following'));profile.append(ring(data),copy,meta);
    const list=root.querySelector('[data-discovery-missions]');list.replaceChildren();
    for(const m of data.missions){const card=el('article','discovery-mission'+(m.completed?' completed':''));card.id='mission-'+m.id;
     card.append(el('span','discovery-step',m.number+' / '+(m.completed?'COMPLETED':m.points+' XP')),el('div','discovery-badge',m.completed?'✦':'◎'),el('h3','',m.title),el('p','',m.description),el('p','discovery-requirement',m.requirement));
     card.append(el('p','discovery-earned',m.completed?m.badge+' · Recognized '+new Date(m.earnedAt).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Unlock the '+m.badge+' badge'));if(!m.completed&&m.hint)card.append(el('p','discovery-hint',m.hint));
     card.append(a(m.completed?'Explore again ↗':m.cta+' ↗',m.href));list.append(card);}
   }else{
    root.replaceChildren();const next=data.missions.find(m=>m.id===data.next),box=el('div','discovery-summary'),copy=el('div','discovery-summary-copy');copy.append(el('p','discovery-eyebrow','DISCOVERY MISSIONS / '+data.points+' XP'),el('h2','',next?'Continue your mission.':'First expedition complete.'),el('p','',next?next.title+' · '+(next.hint||next.requirement):'Pathfinder earned. Return to your saved projects for your next perspective.'));
    const actions=el('div','discovery-actions');actions.append(a(next?next.cta+' ↗':'Open saved projects ↗',next?next.href:'/following','discovery-button discovery-primary'),a('Explorer profile ↗','/discover#mission-board','discovery-text-link'));box.append(ring(data),copy,actions);root.append(box);
   }
   status(root,'Progress saved · '+data.completed+' of 3 missions complete');
  }
 }
 async function load(){
  if(!active)return;const token=++epoch,comparison=pendingComparison;
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
  for(const root of roots){status(root,'Checking your Explorer progress…');const b=root.querySelector('[data-discovery-refresh]');if(b)b.disabled=true;}
  try{const r=await fetch('/api/discovery/'+(comparison?'compare':'sync'),{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(comparison||{}),signal:controller.signal});let data;try{data=await r.json();}catch{throw Error('Progress could not be read. Please retry.');}if(token!==epoch||!active)return;
   if(r.status===401){guest();return;}if(!r.ok)throw Object.assign(Error(data.error||'Progress could not be saved. Please retry.'),{status:r.status});
   render(data);if(comparison){lastComparison=JSON.stringify(comparison);if(JSON.stringify(pendingComparison)===lastComparison)pendingComparison=null;}
  }catch(e){if(token!==epoch||!active)return;if(e.status===400||e.status===404)pendingComparison=null;for(const root of roots){status(root,controller.signal.aborted?'Progress check timed out. Retry to check your saved state.':e.message||'Progress unavailable. Please retry.',true);if(root!==full){let retry=root.querySelector('[data-discovery-refresh]');if(!retry){retry=button('Retry progress',load);retry.setAttribute('data-discovery-refresh','');root.append(retry);}}}}
  finally{clearTimeout(timer);if(token===epoch&&active)for(const root of roots){const b=root.querySelector('[data-discovery-refresh]');if(b)b.disabled=false;}}
 }
 function comparison(before,after){if(!active||typeof before!=='string'||typeof after!=='string')return;const next={before,after};if(JSON.stringify(next)===lastComparison)return;pendingComparison=next;return load();}
 window.ParallaxDiscovery={sync:load,comparison};
 for(const root of roots){const b=root.querySelector('[data-discovery-refresh]');if(b){b.hidden=false;b.onclick=load;}}
 window.addEventListener('parallax:research-following-changed',load);
 window.addEventListener('pagehide',()=>{active=false;epoch++;clear();for(const root of roots)status(root,'Progress will refresh when you return.');});
 window.addEventListener('pageshow',e=>{if(e.persisted){active=true;load();}});
 if(roots.length)load();
})();
