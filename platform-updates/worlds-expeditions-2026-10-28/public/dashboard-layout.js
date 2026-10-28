/* Explicit dashboard preferences. Account layouts stay off shared browser storage. */
(() => {
 'use strict';
 const host=document.getElementById('dashboard-panels'),dialog=document.getElementById('layout-dialog');
 if(!host||!dialog||typeof dialog.showModal!=='function')return;
 const titles={overview:'Overview & next moves',tools:'Workspace tools',continue:'Briefing & discovery',following:'Saved projects',ecosystem:'Ecosystem worlds',premium:'Premium Worlds',examples:'Planet design gallery',community:'Community activity',milestone:'The Summit',reports:'Creator reports'};
 const keys=Object.keys(titles),panels=new Map([...host.querySelectorAll('[data-dashboard-panel]')].map(n=>[n.dataset.dashboardPanel,n]));
 if(keys.some(k=>!panels.has(k)))return;
 const el=id=>document.getElementById(id),button=el('layout-customize'),list=el('layout-panel-list'),status=el('layout-status'),summary=el('layout-summary'),storage=el('layout-storage'),save=el('layout-save'),reload=el('layout-reload'),signin=el('layout-signin');
 const radios=[...dialog.querySelectorAll('[name="dashboard-density"]')];
 const guestKey='parallax.dashboard.guest.v1';
 const defaults=()=>({version:1,order:[...keys],hidden:[],pinned:[],density:'comfortable'});
 const clone=value=>JSON.parse(JSON.stringify(value));
 const validArray=v=>Array.isArray(v)&&v.length<=keys.length&&v.every(k=>keys.includes(k))&&new Set(v).size===v.length;
 const valid=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===5&&Object.keys(v).every(k=>['version','order','hidden','pinned','density'].includes(k))&&v.version===1&&validArray(v.order)&&v.order.length===keys.length&&validArray(v.hidden)&&v.hidden.length<keys.length&&validArray(v.pinned)&&v.pinned.length<=3&&v.pinned.every(k=>!v.hidden.includes(k))&&['comfortable','compact'].includes(v.density);
 let applied=defaults(),draft=clone(applied),account=null,revision=0,loaded=false,busy=false,active=true,epoch=0,blocked=false;
 const ordered=layout=>[...layout.order.filter(k=>layout.pinned.includes(k)),...layout.order.filter(k=>!layout.pinned.includes(k))];
 const notify=text=>{status.textContent=text;};
 function apply(layout){
  for(const key of ordered(layout)){
   const panel=panels.get(key);panel.hidden=layout.hidden.includes(key);panel.classList.toggle('dashboard-panel-pinned',layout.pinned.includes(key));host.append(panel);
  }
  document.body.dataset.dashboardDensity=layout.density;
 }
 function count(layout){return (keys.length-layout.hidden.length)+' panels shown · '+layout.pinned.length+' pinned';}
 function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
 function action(text,label,key,name,disabled=false){const b=node('button','layout-row-button',text);b.type='button';b.dataset.layoutAction=name;b.dataset.panelKey=key;b.setAttribute('aria-label',label);b.disabled=disabled||busy||!loaded||blocked;return b;}
 function controls(){
  for(const id of ['layout-close','layout-cancel','layout-reset'])el(id).disabled=busy;
  save.disabled=busy||!loaded||blocked;save.textContent=busy?'Saving…':account?'Save to account':'Save on this browser';
  radios.forEach(r=>r.disabled=busy||!loaded||blocked);
  reload.disabled=busy;
 }
 function render(focus){
  list.replaceChildren();const order=ordered(draft);
  for(const key of order){
   const row=node('li','layout-row');row.dataset.panelKey=key;
   const label=node('div','layout-row-label');label.append(node('strong','',titles[key]),node('small','',draft.pinned.includes(key)?'Pinned to the top':draft.hidden.includes(key)?'Hidden from your dashboard':'Dashboard panel'));
   const actions=node('div','layout-row-actions'),show=node('label','layout-show'),checkbox=node('input');checkbox.type='checkbox';checkbox.checked=!draft.hidden.includes(key);checkbox.dataset.layoutAction='show';checkbox.dataset.panelKey=key;checkbox.setAttribute('aria-label','Show '+titles[key]);checkbox.disabled=busy||!loaded||blocked;show.append(checkbox,node('span','', 'Show'));
   const pinned=draft.pinned.includes(key),group=order.filter(k=>draft.pinned.includes(k)===pinned),at=group.indexOf(key);
   const pin=action(pinned?'Pinned':'Pin',(pinned?'Unpin ':'Pin ')+titles[key],key,'pin',!pinned&&draft.pinned.length>=3);pin.setAttribute('aria-pressed',String(pinned));
   actions.append(show,pin,action('↑','Move '+titles[key]+' up',key,'up',at===0),action('↓','Move '+titles[key]+' down',key,'down',at===group.length-1));row.append(label,actions);list.append(row);
  }
  radios.forEach(r=>r.checked=r.value===draft.density);controls();
  if(focus){const next=list.querySelector('[data-panel-key="'+focus.key+'"][data-layout-action="'+focus.action+'"]');if(next&&!next.disabled)next.focus({preventScroll:true});else list.querySelector('[data-panel-key="'+focus.key+'"][data-layout-action="pin"]')?.focus({preventScroll:true});}
 }
 async function request(body){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  try{const response=await fetch('/api/dashboard-layout',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:controller.signal});let data;try{data=await response.json();}catch{throw Error('The layout service did not respond. Please retry.');}if(!response.ok)throw Object.assign(Error(data.error||'Your layout could not be saved.'),{code:data.code,status:response.status});return data;}
  catch(error){if(controller.signal.aborted)throw Error('The layout request timed out. Please retry.');throw error;}
  finally{clearTimeout(timer);}
 }
 async function load(){
  if(!active||busy)return;const token=++epoch;loaded=false;blocked=false;account=null;revision=0;applied=defaults();draft=clone(applied);apply(applied);render();storage.textContent='Checking your saved layout…';notify('');reload.hidden=true;signin.hidden=true;
  try{
   const data=await request();if(token!==epoch||!active)return;
   if(data.signedIn===true){
    if(!/^[a-f0-9]{64}$/.test(data.accountKey||'')||!Number.isSafeInteger(data.revision)||data.revision<0||(data.layout!==null&&!valid(data.layout)))throw Error('Your saved layout could not be read. Please retry.');
    account=data.accountKey;revision=data.revision;applied=data.layout||defaults();storage.textContent='Saved privately to your account. Available when you sign in on another device.';
   }else if(data.signedIn===false){
    try{const local=JSON.parse(localStorage.getItem(guestKey)||'null');if(valid(local))applied=local;}catch{}
    storage.textContent='Browser layout. Changes stay on this browser; signing in opens your account’s layout.';signin.hidden=false;
   }else throw Error('Your account status could not be checked. Please retry.');
   loaded=true;draft=clone(applied);apply(applied);render();summary.textContent=count(applied)+' · '+(account?'Account layout':'Browser layout');
  }catch(error){if(token!==epoch||!active)return;storage.textContent='Saved layout unavailable. The default dashboard is still available.';notify(error.message);reload.hidden=false;summary.textContent='Default layout · Saved preferences unavailable';render();}
 }
 button.hidden=false;
 button.addEventListener('click',()=>{
  if(document.querySelector('dialog[open]'))return;draft=clone(applied);render();notify(loaded?'Changes are previewed behind this panel. Save to keep them.':status.textContent);dialog.showModal();el('layout-close').focus();
 });
 function cancel(){if(!busy)dialog.close();}
 el('layout-close').addEventListener('click',cancel);el('layout-cancel').addEventListener('click',cancel);
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 dialog.addEventListener('close',()=>{draft=clone(applied);apply(applied);if(active)button.focus({preventScroll:true});});
 function change(key,name,checked){
  if(!loaded||busy||blocked||!keys.includes(key))return;
  if(name==='show'){
   if(!checked&&draft.hidden.length===keys.length-1){notify('Keep at least one panel visible.');render({key,action:name});return;}
   draft.hidden=draft.hidden.filter(k=>k!==key);if(!checked){draft.hidden.push(key);draft.pinned=draft.pinned.filter(k=>k!==key);}
  }else if(name==='pin'){
   if(draft.pinned.includes(key))draft.pinned=draft.pinned.filter(k=>k!==key);else{if(draft.pinned.length>=3)return;draft.pinned.push(key);draft.hidden=draft.hidden.filter(k=>k!==key);}
  }else if(name==='up'||name==='down'){
   const pinned=draft.pinned.includes(key),group=ordered(draft).filter(k=>draft.pinned.includes(k)===pinned),index=group.indexOf(key),other=group[index+(name==='up'?-1:1)];
   if(!other)return;const a=draft.order.indexOf(key),b=draft.order.indexOf(other);[draft.order[a],draft.order[b]]=[draft.order[b],draft.order[a]];
  }else return;
  apply(draft);render({key,action:name});notify('Preview updated · '+count(draft)+'. Save to keep these changes.');
 }
 list.addEventListener('click',event=>{const b=event.target.closest('button[data-layout-action]');if(b)change(b.dataset.panelKey,b.dataset.layoutAction);});
 list.addEventListener('change',event=>{const input=event.target;if(input.dataset.layoutAction==='show')change(input.dataset.panelKey,'show',input.checked);});
 radios.forEach(r=>r.addEventListener('change',()=>{if(busy||!loaded||blocked)return;draft.density=r.value;apply(draft);notify('Preview updated. Save to keep this display density.');}));
 el('layout-reset').addEventListener('click',()=>{if(!loaded||busy||blocked)return;draft=defaults();apply(draft);render();notify('Default layout previewed. Save to keep it, or Cancel to return to your saved layout.');});
 reload.addEventListener('click',load);
 save.addEventListener('click',async()=>{
  if(!loaded||busy||blocked||!valid(draft))return;const payload=clone(draft),token=epoch;busy=true;render();notify('Saving your layout…');
  try{
   if(account){const data=await request({layout:payload,revision,accountKey:account});if(!active||token!==epoch)return;if(data.accountKey!==account||!valid(data.layout)||!Number.isSafeInteger(data.revision)||data.revision<=revision)throw Error('The save could not be confirmed. Reload your saved layout.');revision=data.revision;applied=clone(data.layout);}
   else{try{localStorage.setItem(guestKey,JSON.stringify(payload));}catch{throw Error('Browser storage is blocked. Enable storage or sign in to save a layout.');}applied=payload;}
   summary.textContent='Layout saved · '+count(applied)+' · '+(account?'Your account':'This browser');apply(applied);busy=false;dialog.close();
  }catch(error){if(!active||token!==epoch)return;notify(error.message);if(error.code==='account-changed'||error.status===401){blocked=true;account=null;applied=defaults();apply(applied);storage.textContent='Sign-in changed. Reload the layout for your current account.';}else if(error.code==='layout-conflict')blocked=true;reload.hidden=false;}
  finally{if(active&&token===epoch){busy=false;render();}}
 });
 window.addEventListener('pagehide',()=>{active=false;epoch++;busy=false;loaded=false;account=null;revision=0;applied=defaults();draft=clone(applied);if(dialog.open)dialog.close();apply(applied);summary.textContent='';});
 window.addEventListener('pageshow',event=>{if(event.persisted){active=true;load();}});
 load();
})();
