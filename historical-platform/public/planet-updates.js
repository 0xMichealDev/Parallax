(() => {
  'use strict';
  const labels={update:'Update',released:'Released','in-progress':'In progress',planned:'Planned'};
  const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
  const link=(text,url,cls='planet-update-button')=>{const a=el('a',cls,text);a.href=url;return a;};
  const external=(text,url)=>{const a=link(text,url,'planet-update-source');a.target='_blank';a.rel='noopener noreferrer';a.referrerPolicy='no-referrer';return a;};
  function safeURL(value,image=false){try{const u=new URL(value),h=u.hostname.toLowerCase();return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&h.includes('.')&&!h.includes(':')&&!/^\d[\d.]*$/.test(h)&&!/(^|\.)(localhost|local|internal|test|invalid)$/.test(h)&&(!image||/\.(png|jpe?g|webp|gif|avif)$/i.test(u.pathname))?u.href:null;}catch{return null;}}
  async function request(action,body){
    if(window.ParallaxResearch)return window.ParallaxResearch.request('/api/creator/'+action,body);
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
    try{const r=await fetch('/api/creator/'+action,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal});const data=await r.json();if(!r.ok)throw Object.assign(Error(data.error||'Updates could not load. Try again.'),{status:r.status});return data;}
    catch(e){if(controller.signal.aborted)throw Error('The request timed out. Refresh updates before retrying.');throw e;}
    finally{clearTimeout(timer);}
  }
  function card(item,{project=false}={}){
    const theme=['mint','violet','amber'].includes(item.presentation)?item.presentation:'standard';
    const article=el('article','planet-update-card update-theme-'+theme);article.id='update-'+item.id;
    if(project)article.append(link((item.projectName||'Project')+' · $'+(item.projectTicker||'')+' ↗','/world/'+encodeURIComponent(item.projectId)+'#project-update-feed','planet-update-project'));
    const meta=el('div','planet-update-meta'),kind=Object.hasOwn(labels,item.status)?item.status:'update';meta.append(el('span','planet-update-badge status-'+kind,labels[kind]));
    const d=new Date(item.createdAt),time=el('time','',d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}));time.dateTime=d.toISOString();meta.append(time);article.append(meta,el('h3','',item.title),el('p','planet-update-body',item.body));
    if(item.editedAt){const edited=el('p','planet-update-edited','Edited '+new Date(item.editedAt).toLocaleString(undefined,{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'}));article.append(edited);}
    const source=safeURL(item.linkUrl);if(source)article.append(external('Supporting link · '+new URL(source).hostname+' ↗',source));
    const media=(Array.isArray(item.media)?item.media:[]).slice(0,4).filter(m=>safeURL(m.url,true));
    if(media.length){
      const host=el('div','planet-update-media'),button=el('button','planet-update-button','Load '+media.length+' screenshot'+(media.length===1?'':'s'));button.type='button';
      host.append(button,el('p','planet-update-media-note','Images load from the creator’s external host when you choose.'));
      button.onclick=()=>{button.remove();const gallery=el('div','planet-update-gallery');host.prepend(gallery);
        for(const m of media){const figure=el('figure'),a=external('',safeURL(m.url,true)),img=el('img');img.alt=m.alt||'Project screenshot';img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';img.width=960;img.height=600;img.onerror=()=>{img.hidden=true;a.textContent='Image unavailable · open original ↗';};img.src=safeURL(m.url,true);a.append(img);figure.append(a,el('figcaption','',m.alt));gallery.append(figure);}
      };article.append(host);
    }
    return article;
  }
  function mount(root,{projectId=null}={}){
    root.classList.add('planet-update-feed');root.replaceChildren();
    const top=el('div','planet-update-heading'),intro=el('div');intro.append(el('p','planet-update-eyebrow',projectId?'PROJECT JOURNAL':'YOUR FOLLOWED PROJECTS'),el('h2','',projectId?'From the creator.':'Progress worth coming back for.'),el('p','planet-update-note',projectId?'Announcements and milestones published by this project’s creator. Status labels describe the creator’s plans and progress.':'Creator announcements from followed planets and planets linked to the exact tokens in your saved research.'));
    top.append(intro);root.append(top);
    const follow=el('div','planet-follow-controls');if(projectId)root.append(follow);
    const tools=el('div','planet-update-tools'),filterLabel=el('label','','Show'),filter=el('select');filter.setAttribute('aria-label','Filter project updates by progress');for(const [value,label]of [['all','All updates'],...Object.entries(labels)]){const o=el('option','',label);o.value=value;filter.append(o);}filterLabel.append(filter);
    const refresh=el('button','planet-update-button','Refresh updates');refresh.type='button';tools.append(filterLabel,refresh);root.append(tools);
    const status=el('p','planet-update-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const list=el('div','planet-update-list'),more=el('button','planet-update-button','Load older updates');more.type='button';more.hidden=true;
    const manage=el('details','planet-follow-manage');manage.hidden=true;root.append(status,list,more,manage);
    let cursor=null,epoch=0,busy=false,active=true;
    const message=(text,error=false)=>{status.textContent=text;status.dataset.error=String(error);};
    function signIn(){list.replaceChildren();follow.replaceChildren();manage.replaceChildren();manage.hidden=true;more.hidden=true;const a=link('Sign in to follow projects ↗','/signin-with-chatgpt?return_to='+encodeURIComponent(location.pathname+location.search+(projectId?'#project-update-feed':'#followed-updates')));a.target='_top';(projectId?follow:list).append(a);}
    function renderFollow(state){follow.replaceChildren();if(!state?.signedIn){const a=link('Sign in to follow this planet ↗','/signin-with-chatgpt?return_to='+encodeURIComponent(location.pathname+location.search+'#project-update-feed'));a.target='_top';follow.append(a);return;}
      const b=el('button','planet-update-button',state.direct?'Unfollow planet':'Follow planet');b.type='button';b.setAttribute('aria-pressed',String(state.direct));follow.append(b,link('Open followed updates ↗','/following#followed-updates','planet-update-source'));
      if(state.research)follow.append(el('p','planet-update-note','Also included through your saved token research. Manage that follow in Saved projects.'));
      b.onclick=async()=>{b.disabled=true;try{await request(state.direct?'unfollow-world':'follow-world',{projectId});await load(false);}catch(e){message(e.message||'Could not save this follow. Retry.',true);b.disabled=false;}};
    }
    function renderWorlds(worlds){manage.replaceChildren();manage.hidden=!worlds.length;if(!worlds.length)return;manage.append(el('summary','',worlds.length+' followed planet'+(worlds.length===1?'':'s')+' · Manage'));
      const rows=el('div','planet-follow-rows');for(const p of worlds){const row=el('div','planet-follow-row');row.append(link(p.name+' ↗','/world/'+encodeURIComponent(p.id),'planet-update-source'));
        if(p.research)row.append(el('small','','Included through saved token research'));
        if(p.direct){const b=el('button','planet-update-button','Unfollow planet');b.type='button';b.onclick=async()=>{b.disabled=true;try{await request('unfollow-world',{projectId:p.id});await load(false);}catch(e){message(e.message,true);b.disabled=false;}};row.append(b);}rows.append(row);}
      manage.append(rows,el('p','planet-update-note','Unfollowing a planet does not remove its saved token research. Manage token follows in Saved projects below.'));
    }
    async function load(append=false){if(!active)return;const token=++epoch;busy=true;refresh.disabled=more.disabled=true;filter.disabled=true;message('Loading project updates…');if(!append){list.replaceChildren();more.hidden=true;}
      const params=new URLSearchParams({status:filter.value||'all'});if(projectId)params.set('project',projectId);if(append&&cursor)params.set('cursor',cursor);
      try{const data=await request((projectId?'updates':'followed-updates')+'?'+params);if(token!==epoch||!active)return;
        if(!append){if(projectId)renderFollow(data.follow);else renderWorlds(data.worlds||[]);}
        for(const item of data.updates)list.append(card(item,{project:!projectId}));cursor=data.nextCursor;more.hidden=!cursor;
        if(!list.children.length){const empty=el('div','planet-updates-empty');empty.append(el('h3','',filter.value!=='all'?'No updates with this label yet.':projectId?'The next chapter starts here.':'Your feed is ready for its first update.'),el('p','',projectId?'The creator has not shared a matching update. Follow this planet to find future posts in Saved projects.':'Follow a planet from its public page. Matching creator announcements will appear here when published.'));
          if(!projectId)empty.append(link('Explore creator worlds ↗','/explore'));else if(data.canManage)empty.append(link('Write your first update ↗','/creator#creator-updates'));list.append(empty);}
        message('Creator posts · newest published first. Edits retain the original publication date.');
        if(projectId&&location.hash.startsWith('#update-'))document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'nearest'});
      }catch(e){if(token!==epoch)return;if(e.status===401){signIn();message('Your followed list is private to your account.');}else message((e.message||'Updates could not load.')+' Use Refresh updates to retry.',true);}
      finally{if(token===epoch){busy=false;refresh.disabled=more.disabled=false;filter.disabled=false;}}
    }
    filter.onchange=()=>load(false);refresh.onclick=()=>load(false);more.onclick=()=>{if(!busy)load(true);};
    window.addEventListener('parallax:research-following-changed',()=>{if(!projectId&&active)load(false);});
    window.addEventListener('pagehide',()=>{active=false;++epoch;list.replaceChildren();follow.replaceChildren();manage.replaceChildren();manage.hidden=true;more.hidden=true;});window.addEventListener('pageshow',e=>{active=true;if(e.persisted)load(false);});
    load();
  }
  function world(id){let root=document.getElementById('project-update-feed');if(!root){root=el('section','project-public-updates');root.id='project-update-feed';root.setAttribute('aria-label','Project updates');(document.querySelector('#observatory')||document.querySelector('main')||document.body).append(root);}mount(root,{projectId:id});}
  window.ParallaxPlanetUpdates={card,world,request,safeURL};
  const saved=document.querySelector('[data-planet-updates]');if(saved)mount(saved);
})();
