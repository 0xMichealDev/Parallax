/* A read-only launch checklist over the creator's existing saved projects. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);if(!$('launch-checklist'))return;
 const validId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(id),origin='https://parallaxlaunch.live';
 let projects=[],selected=null,epoch=0;
 async function api(path){const r=await fetch(path,{credentials:'same-origin',headers:{Accept:'application/json'}});if(!r.ok)throw Error('Your project progress could not load. Please retry.');return r.json()}
 function render(){
  selected=projects.find(p=>p.id===$('launch-project').value)||null;
  const listed=!!selected?.planet,id=selected?encodeURIComponent(selected.id):'',studio='/studio?from=projects'+(id?'&project='+id:'');
  $('launch-create').href=studio;$('launch-create').textContent=selected?'Edit your project ↗':'Create your planet ↗';
  $('launch-claim').href=selected?'/planets?claim=1&project='+id:'/planets?claim=1';$('launch-claim').textContent=listed?'Manage Atlas listing ↗':'Claim your Atlas spot ↗';
  $('launch-kit').href=studio+'&step=4';
  for(const [key,state,label] of [['create',selected?'complete':'next',selected?'Published':'Start here'],['claim',listed?'complete':selected?'next':'pending',listed?'Listed in Atlas':selected?'Next step':'After publishing'],['share',listed?'next':'pending',listed?'Ready to share':'After listing']]){$('launch-step-'+key).dataset.state=state;$('launch-state-'+key).textContent=label;}
  $('launch-share-tools').hidden=!listed;
  $('launch-progress').textContent=listed?selected.name+' is published and listed. Your campaign links are ready.':selected?selected.name+' is published. Add its Atlas listing so others can discover it.':'Start with a project name, a story, and a planet design. Standard publishing is free.';
  if(listed){const url=new URL('/world/'+id,origin);url.searchParams.set('utm_source',$('launch-source').value);url.searchParams.set('utm_campaign','claim-your-planet');$('launch-link').value=url.href;const text=selected.name+' is part of the Parallax universe. Explore our planet and see what we’re building.';$('launch-compose-x').href='https://twitter.com/intent/tweet?'+new URLSearchParams({text,url:new URL('/world/'+id+'?utm_source=x&utm_campaign=claim-your-planet',origin).href});$('launch-compose-telegram').href='https://t.me/share/url?'+new URLSearchParams({text,url:new URL('/world/'+id+'?utm_source=telegram&utm_campaign=claim-your-planet',origin).href});}
 }
 async function load(){const own=++epoch;$('launch-refresh').disabled=true;$('launch-status').textContent='Checking your saved projects…';$('launch-account').hidden=true;
  try{const session=await api('/api/session');if(own!==epoch)return;
   if(!session.signedIn){projects=[];$('launch-selector').hidden=true;$('launch-account').hidden=false;$('launch-status').textContent='Sign in to see your saved progress, or begin designing in Studio.';render();return;}
   const result=await api('/api/my-missions');if(own!==epoch)return;if(!Array.isArray(result.missions))throw Error('Your saved projects could not load. Please retry.');
   projects=result.missions.filter(p=>validId(p.id)&&typeof p.name==='string'&&typeof p.ticker==='string');const previous=$('launch-project').value,wanted=new URLSearchParams(location.search).get('project');
   $('launch-project').replaceChildren(...projects.map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name+' · '+p.ticker;return o}));$('launch-project').value=projects.some(p=>p.id===previous)?previous:projects.some(p=>p.id===wanted)?wanted:projects[0]?.id||'';
   $('launch-selector').hidden=!projects.length;render();$('launch-status').textContent=projects.length?'Progress comes from your saved project and current Atlas listing. Sharing opens a draft for you to review.':'No published projects yet. Start in Studio; your browser drafts stay there.';
  }catch(e){if(own===epoch){projects=[];$('launch-project').replaceChildren();$('launch-selector').hidden=true;render();$('launch-progress').textContent='Your saved progress is temporarily unavailable. You can still open Studio or Atlas.';$('launch-status').textContent=e.message;}}
  finally{if(own===epoch)$('launch-refresh').disabled=false;}
 }
 $('launch-project').addEventListener('change',()=>{render();$('launch-status').textContent='Selected project updated.'});$('launch-source').addEventListener('change',render);$('launch-refresh').addEventListener('click',load);
 $('launch-copy').addEventListener('click',async()=>{if(!selected?.planet)return;try{await navigator.clipboard.writeText($('launch-link').value);$('launch-status').textContent='Campaign link copied. See recorded visits in your creator dashboard.';}catch{$('launch-link').focus();$('launch-link').select();$('launch-status').textContent='Select and copy the campaign link above.'}});
 render();load();window.addEventListener('pageshow',e=>{if(e.persisted)load()});
})();
