(()=>{'use strict';
const privacyKey='parallax-project-analytics-off',browserKey='parallax-project-browser-v1',sessionsKey='parallax-project-sessions-v1';
let active=null,memoryBrowser=null,memorySessions={},privacyButton=null,memoryOptOut=null;
const blocked=()=>navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;
function optedOut(){if(memoryOptOut!==null)return memoryOptOut;try{return localStorage.getItem(privacyKey)==='1'}catch{return false}}
function random(){return crypto.randomUUID();}
function browser(){
 const now=Date.now();try{let b=JSON.parse(localStorage.getItem(browserKey)||'null');if(!b||typeof b.id!=='string'||!/^[a-f0-9-]{36}$/i.test(b.id)||!Number.isFinite(b.created)||now-b.created>90*86400000){b={id:random(),created:now};localStorage.setItem(browserKey,JSON.stringify(b));}return b.id;}catch{if(!memoryBrowser)memoryBrowser=random();return memoryBrowser;}
}
function session(id){
 let sessions=memorySessions;try{const raw=JSON.parse(localStorage.getItem(sessionsKey)||'{}');if(raw&&typeof raw==='object'&&!Array.isArray(raw))sessions=raw;}catch{}
 const now=Date.now();for(const [key,value]of Object.entries(sessions))if(!value||typeof value!=='object'||!Number.isFinite(value.last)||now-value.last>86400000)delete sessions[key];
 if(!sessions[id]||typeof sessions[id].id!=='string'||!/^[a-f0-9-]{36}$/i.test(sessions[id].id)||now-sessions[id].last>=1800000||sessions[id].last>now)sessions[id]={id:random(),last:now};sessions[id].last=now;
 // Keep bounded first-party session state. No visits outside PARALLAX are observed.
 const entries=Object.entries(sessions).sort((a,b)=>b[1].last-a[1].last).slice(0,100);memorySessions=Object.fromEntries(entries);try{localStorage.setItem(sessionsKey,JSON.stringify(memorySessions));}catch{}
 return sessions[id].id;
}
function record(kind){
 if(!active||active.owner||blocked()||optedOut()||document.hidden||!crypto?.randomUUID)return;
 try{const body={projectId:active.id,entry:active.entry,visitorId:browser(),sessionId:session(active.id),kind,...(kind==='click'?{eventId:random()}:{})};fetch('/api/creator/track',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),keepalive:true}).catch(()=>{});}catch{}
}
function privacyUI(){
 if(!privacyButton)return;privacyButton.textContent=blocked()?'Project analytics disabled by browser privacy settings':optedOut()?'Project analytics off · Enable':'Project analytics on · Disable';privacyButton.disabled=blocked();privacyButton.setAttribute('aria-pressed',String(!blocked()&&!optedOut()));
}
function makePrivacy(){
 if(privacyButton)return;const box=document.createElement('div');box.className='project-privacy';privacyButton=document.createElement('button');privacyButton.type='button';privacyButton.onclick=()=>{const off=!optedOut();memoryOptOut=off;let saved=true;if(off){memoryBrowser=null;memorySessions={};}try{localStorage.setItem(privacyKey,off?'1':'0');if(off){localStorage.removeItem(browserKey);localStorage.removeItem(sessionsKey);}}catch{saved=false;}privacyUI();if(!saved)privacyButton.textContent=off?'Project analytics off for this page · Enable':'Project analytics on for this page · Disable';if(!off)record('visit');};
 const note=document.createElement('span');note.textContent='First-party visit and website-click counts help this creator understand their audience. Browser identifiers stay separate from your wallet.';box.append(privacyButton,note);(document.querySelector('main')||document.body).append(box);privacyUI();
}
async function feed(id){
 let section=document.getElementById('project-update-feed');if(!section){section=document.createElement('section');section.id='project-update-feed';section.className='project-public-updates';section.setAttribute('aria-label','Project updates');(document.querySelector('#observatory')||document.querySelector('main')||document.body).append(section);}
 section.replaceChildren();const title=document.createElement('h2');title.textContent='From the creator';const intro=document.createElement('p');intro.className='project-updates-intro';intro.textContent='Project milestones and updates, shared by the creator.';section.append(title,intro);section.hidden=false;
 try{const r=await fetch('/api/creator/updates?project='+encodeURIComponent(id),{credentials:'same-origin'});if(!r.ok)throw Error();const data=await r.json();if(!data.updates.length){section.hidden=true;return;}
 for(const update of data.updates){const article=document.createElement('article'),time=document.createElement('time'),heading=document.createElement('h3'),body=document.createElement('p');time.dateTime=new Date(update.createdAt).toISOString();time.textContent=new Date(update.createdAt).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'});heading.textContent=update.title;body.textContent=update.body;article.append(time,heading,body);section.append(article);}
 }catch{const note=document.createElement('p');note.textContent='Project updates could not load. Refresh to try again.';section.append(note);}
}
function start(id,owner=false){const path=location.pathname.match(/^\/(world|mission)\/([^/]+)\/?$/);if(!path||path[2]!==id||active)return;active={id,owner,entry:path[1]};feed(id);makePrivacy();record('visit');}
document.addEventListener('click',e=>{const a=e.target?.closest?.('a[data-project-website]');if(a&&active&&(!a.dataset.projectId||a.dataset.projectId===active.id))record('click');});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)record('visit')});
window.ParallaxProjectMetrics={start};
})();
