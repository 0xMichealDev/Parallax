(()=>{'use strict';
const selector='[data-solhandle-wallet],[data-solhandle-project],[data-solhandle-token]',states=new WeakMap(),pending=new Map(),queue=[];let active=0,refreshEpoch=0;
const node=(tag,value,cls)=>{const e=document.createElement(tag);if(value!==undefined)e.textContent=value;if(cls)e.className=cls;return e;};
function anchor(label,href){const a=node('a',label);a.href=href;if(href.startsWith('https://')){a.target='_blank';a.rel='noopener noreferrer';}return a;}
function schedule(work){return new Promise((resolve,reject)=>{queue.push({work,resolve,reject});drain();});}
function drain(){while(active<2&&queue.length){const task=queue.shift();active++;task.work().then(task.resolve,task.reject).finally(()=>{active--;drain();});}}
function request(url){const epoch=refreshEpoch,key=epoch+':'+url;if(pending.has(key))return pending.get(key);const p=schedule(async()=>{if(epoch!==refreshEpoch)throw Error('Identity check expired.');const r=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(12000)});const d=await r.json();if(!r.ok)throw Error(d.error||'Identity could not be checked.');return d;}).finally(()=>pending.delete(key));pending.set(key,p);return p;}
function details(root,value,project){const identity=value.identity,row=node('div',undefined,'solhandle-name-row');if(identity?.status==='resolved'){row.append(node('strong',identity.handle,'solhandle-name'),node('span','SolHandle','solhandle-provider'));}else row.append(node('span',identity?.status==='not-set'?'No current primary handle':identity?.status==='unavailable'?'Handle lookup unavailable':'Wallet identity','solhandle-fallback'));root.append(row,anchor(value.address,'https://solscan.io/account/'+value.address));root.lastChild.className='solhandle-address';if(identity?.checkedAt)root.append(node('small','Ownership checked '+new Date(identity.checkedAt).toLocaleTimeString()+'.','solhandle-checked'));
if(project){const list=node('div',undefined,'solhandle-checks');list.append(node('p','Wallet control: checked when this Parallax profile was published.'));const permissions=project.projectPermissions;list.append(node('p',permissions.canManage?'Your project access: creator account and signed wallet verified.':permissions.status==='creator-wallet-required'?'Your project access: verify the original creator wallet.':permissions.status==='sign-in-required'?'Your project access: sign in to check editing permission.':'Your project access: this profile belongs to another creator account.'));list.append(node('small','Handle ownership does not prove token affiliation or grant project permissions.'));root.append(list);}}
function describe(root){if(root.dataset.solhandleProject)return {url:'/api/identity/project?id='+encodeURIComponent(root.dataset.solhandleProject),kind:'project',value:root.dataset.solhandleProject};if(root.dataset.solhandleToken)return {url:'/api/identity/projects?token='+encodeURIComponent(root.dataset.solhandleToken),kind:'token',value:root.dataset.solhandleToken};return {url:'/api/identity/wallet?query='+encodeURIComponent(root.dataset.solhandleWallet||''),kind:'wallet',value:root.dataset.solhandleWallet||''};}
function footer(root,state){const row=node('div',undefined,'solhandle-actions'),button=node('button','Recheck identity');button.type='button';button.onclick=()=>load(root,state);row.append(button,anchor('How SolHandle works ↗','/solhandle'));root.append(row);}
function addresses(root,state){
 const values=state.addresses?.length?state.addresses:state.kind==='wallet'?[{address:state.value}]:[];
 for(const value of values)if(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.address)){
  if(value.name)root.append(node('span',value.name,'solhandle-section-title'));
  root.append(node('code',value.address,'solhandle-address'));
 }
}
function placeholder(root,state,message){root.replaceChildren(node('span',message,'solhandle-fallback'));addresses(root,state);footer(root,state);}
function invalidate(root,state){
 clearTimeout(state.timer);state.revision++;state.loading=false;state.expiresAt=0;
 root.removeAttribute('aria-busy');placeholder(root,state,'Identity check expired. Recheck for the current owner.');
}
async function load(root,state){
 if(state.loading||document.hidden||!root.isConnected)return;
 state.loading=true;const revision=++state.revision,startedAt=Date.now();clearTimeout(state.timer);
 const current=()=>root.isConnected&&states.get(root)===state&&state.revision===revision;
 root.setAttribute('aria-busy','true');placeholder(root,state,'Checking current SolHandle ownership…');
 try{
  const data=await request(state.url);if(!current())return;
  state.addresses=state.kind==='token'?data.projects.map(p=>({address:p.creator.address,name:p.project.name})):[{address:data.creator?.address||data.address}];
  // Measure from request start, not receipt: slow or suspended tabs cannot extend verification.
  state.expiresAt=startedAt+60000;
  if(document.hidden||Date.now()>=state.expiresAt){invalidate(root,state);return;}
  root.replaceChildren();
  if(state.kind==='token'){
   root.append(node('strong','Linked Parallax profile creators','solhandle-section-title'),node('p','Current identity lookup, separate from this saved research snapshot.','solhandle-checked'));
   if(!data.projects.length)root.append(node('p','No Parallax creator profile is linked to this token. A token address alone does not identify its creator.'));
   for(const project of data.projects){const card=node('section',undefined,'solhandle-project-entry');card.append(anchor(project.project.name+' ↗',project.project.href));details(card,project.creator,project);root.append(card);}
   if(data.hasMore)root.append(anchor('See more project listings ↗','/planets?q='+encodeURIComponent(state.value)));
  }else if(state.kind==='project'){
   root.append(node('span','PARALLAX PROFILE CREATOR','solhandle-section-title'));details(root,data.creator,root.dataset.solhandleCompact==='true'?null:data);
  }else details(root,data,null);
  footer(root,state);
  state.timer=setTimeout(()=>{if(current())invalidate(root,state);},Math.max(0,state.expiresAt-Date.now()));
 }catch(e){if(current())placeholder(root,state,e.message||'Identity unavailable. Retry shortly.');}
 finally{if(current()){state.loading=false;root.removeAttribute('aria-busy');}}
}
function invalidateAll(){
 refreshEpoch++;
 document.querySelectorAll(selector).forEach(root=>{const state=states.get(root);if(state)invalidate(root,state);});
}
function resume(){
 if(document.hidden)return;
 document.querySelectorAll(selector).forEach(root=>{
  const state=states.get(root);if(!state||state.loading||state.expiresAt>Date.now())return;
  if(observer)observer.observe(root);else load(root,state);
 });
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)invalidateAll();else resume();});
window.addEventListener('pagehide',invalidateAll);
window.addEventListener('pageshow',event=>{if(event.persisted){invalidateAll();resume();}});
const observer='IntersectionObserver'in window?new IntersectionObserver(items=>{for(const item of items)if(item.isIntersecting){observer.unobserve(item.target);const state=states.get(item.target);if(state)load(item.target,state);}},{rootMargin:'80px'}):null;
function mount(root){if(!root.matches(selector)){const previous=states.get(root);if(previous)clearTimeout(previous.timer);states.delete(root);observer?.unobserve(root);return;}const next=describe(root),old=states.get(root);if(old?.url===next.url)return;if(old)clearTimeout(old.timer);const state={...next,loading:false,timer:null,revision:0,expiresAt:0,addresses:[]};states.set(root,state);root.classList.add('solhandle-identity');root.replaceChildren(node('span','SolHandle identity','solhandle-fallback'));if(observer)observer.observe(root);else load(root,state);}
function scan(scope){if(scope.matches?.(selector))mount(scope);scope.querySelectorAll?.(selector).forEach(mount);}
scan(document);new MutationObserver(records=>{for(const record of records){if(record.type==='attributes')mount(record.target);else for(const added of record.addedNodes)if(added.nodeType===1)scan(added);}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-solhandle-wallet','data-solhandle-project','data-solhandle-token']});
})();
