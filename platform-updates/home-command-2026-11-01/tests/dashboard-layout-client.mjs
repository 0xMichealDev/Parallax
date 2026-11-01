import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('public/dashboard-layout.js','utf8');
const keys=['overview','tools','continue','following','ecosystem','premium','examples','community','milestone','reports'];
const defaults=()=>({version:1,order:[...keys],hidden:[],pinned:[],density:'comfortable'});
const guestKey='parallax.dashboard.guest.v1',accountKey='a'.repeat(64),flush=()=>new Promise(r=>setImmediate(r));
function harness({local,storageBlocked=false}={}){
 const events={},requests=[],stored=new Map(local?[[guestKey,JSON.stringify(local)]]:[]);let document;
 class Element{
  constructor(tag='div'){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.events={};this.hidden=false;this.disabled=false;this.open=false;this.classes=new Set();this.classList={toggle:(k,v)=>v?this.classes.add(k):this.classes.delete(k)};}
  setAttribute(k,v){this.attrs[k]=v}
  addEventListener(k,v){this.events[k]=v}
  async fire(k,event={}){if(k==='click'&&this.disabled)return;return this.events[k]?.({target:this,preventDefault(){},...event})}
  append(...nodes){for(const n of nodes){if(n.parent)n.parent.children=n.parent.children.filter(x=>x!==n);n.parent=this;this.children.push(n)}}
  replaceChildren(...nodes){for(const n of this.children)n.parent=null;this.children=[];this.append(...nodes)}
  querySelectorAll(s){return this.children.flatMap(c=>[c,...c.querySelectorAll('*')]).filter(c=>matches(c,s))}
  querySelector(s){return this.querySelectorAll(s)[0]||null}
  closest(s){return matches(this,s)?this:this.parent?.closest(s)}
  focus(){document.activeElement=this}
  showModal(){this.open=true}
  close(){this.open=false;this.fire('close')}
 }
 function matches(node,s){if(s==='*')return true;if(s.startsWith('button')&&node.tag!=='button')return false;const attrs=[...s.matchAll(/\[([^=\]]+)(?:="([^"]*)")?\]/g)];return attrs.every(([,attr,value])=>{const found=attr.startsWith('data-')?node.dataset[attr.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]:node.attrs[attr];return value===undefined?found!==undefined:found===value})}
 const ids=['dashboard-panels','layout-dialog','layout-customize','layout-panel-list','layout-status','layout-summary','layout-storage','layout-save','layout-reload','layout-signin','layout-close','layout-cancel','layout-reset'];
 const nodes=new Map(ids.map(k=>[k,new Element(k.includes('save')||k.includes('cancel')?'button':'div')]));
 const body=new Element(),dialog=nodes.get('layout-dialog'),panels=new Map(keys.map(k=>{const n=new Element();n.dataset.dashboardPanel=k;nodes.get('dashboard-panels').append(n);return[k,n]}));
 const radios=['comfortable','compact'].map(value=>{const n=new Element('input');n.value=value;n.attrs.name='dashboard-density';dialog.append(n);return n});
 document={body,activeElement:null,getElementById:k=>nodes.get(k),createElement:t=>new Element(t),querySelector:s=>s==='dialog[open]'&&dialog.open?dialog:null};
 vm.runInNewContext(source,{document,window:{addEventListener:(k,v)=>events[k]=v},localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>{if(storageBlocked)throw Error('blocked');stored.set(k,v)}},AbortController,setTimeout:()=>1,clearTimeout(){},fetch:(url,init)=>new Promise(resolve=>requests.push({url,init,resolve:(data,status=200)=>resolve(Response.json(data,{status}))}))});
 return{nodes,panels,events,requests,stored,body,radios,dialog,document,order:()=>nodes.get('dashboard-panels').children.map(n=>n.dataset.dashboardPanel)};
}
async function ready(h,data={signedIn:false}){h.requests.shift().resolve(data);await flush()}
const click=(h,id)=>h.nodes.get(id).fire('click');
async function action(h,key,name,checked){const list=h.nodes.get('layout-panel-list');const n=list.querySelector('[data-panel-key="'+key+'"][data-layout-action="'+name+'"]');assert(n,'missing control '+name);if(checked!==undefined)n.checked=checked;await list.fire(name==='show'?'change':'click',{target:n})}
let h=harness();await ready(h);await click(h,'layout-customize');assert(h.dialog.open);assert.equal(h.nodes.get('layout-panel-list').children.length,10);
await action(h,'following','pin');assert.equal(h.order()[0],'following');await action(h,'premium','pin');await action(h,'ecosystem','pin');assert(h.nodes.get('layout-panel-list').querySelector('[data-panel-key="overview"][data-layout-action="pin"]').disabled,'fourth pin is disabled');
await action(h,'premium','up');assert.equal(h.order()[1],'premium');await action(h,'premium','up');assert.equal(h.order()[0],'premium');await action(h,'following','show',false);assert(h.panels.get('following').hidden);assert(!h.panels.get('following').classes.has('dashboard-panel-pinned'));
await click(h,'layout-cancel');assert.deepEqual(h.order(),keys);assert(!h.panels.get('following').hidden,'cancel restores saved state');assert.equal(h.stored.size,0,'preview never persists');
await click(h,'layout-customize');await action(h,'tools','pin');await action(h,'community','show',false);await h.radios[1].fire('change');assert.equal(h.body.dataset.dashboardDensity,'compact');await click(h,'layout-save');assert(!h.dialog.open);let saved=JSON.parse(h.stored.get(guestKey));assert.deepEqual(saved.pinned,['tools']);assert.deepEqual(saved.hidden,['community']);assert.equal(saved.density,'compact');assert.equal(h.requests.length,0,'guest saves do not send account writes');
h=harness({local:saved});await ready(h);assert.equal(h.order()[0],'tools');assert(h.panels.get('community').hidden);await click(h,'layout-customize');await click(h,'layout-reset');assert.deepEqual(h.order(),keys);await click(h,'layout-cancel');assert.equal(h.order()[0],'tools');await click(h,'layout-customize');await click(h,'layout-reset');await click(h,'layout-save');assert.deepEqual(JSON.parse(h.stored.get(guestKey)),defaults());
// Retain at least one visible panel, including through repeated changes.
h=harness();await ready(h);await click(h,'layout-customize');for(const k of keys)await action(h,k,'show',false);assert.equal([...h.panels.values()].filter(n=>!n.hidden).length,1);assert.match(h.nodes.get('layout-status').textContent,/at least one/);
// Account saves never read or write guest layouts, and require a confirmed save.
h=harness({local:saved});await ready(h,{signedIn:true,accountKey,layout:null,revision:0});assert.deepEqual(h.order(),keys);await click(h,'layout-customize');await action(h,'reports','pin');const saving=click(h,'layout-save'),req=h.requests.shift(),sent=JSON.parse(req.init.body);assert.equal(sent.accountKey,accountKey);assert.equal(sent.revision,0);assert.equal(req.init.credentials,'same-origin');req.resolve({accountKey,layout:sent.layout,revision:1});await saving;assert.match(h.nodes.get('layout-summary').textContent,/Your account/);assert.deepEqual(JSON.parse(h.stored.get(guestKey)),saved);
// Conflicts block repeated stale saves until the latest layout is loaded.
await click(h,'layout-customize');await action(h,'tools','pin');const conflict=click(h,'layout-save');h.requests.shift().resolve({code:'layout-conflict',error:'Reload saved layout.'},409);await conflict;assert(h.nodes.get('layout-save').disabled);assert(!h.nodes.get('layout-reload').hidden);const reloading=click(h,'layout-reload');h.requests.shift().resolve({signedIn:true,accountKey,layout:defaults(),revision:2});await reloading;assert(!h.nodes.get('layout-save').disabled);assert.deepEqual(h.order(),keys);
// Sign-in change cannot expose the previous account's saved layout or overwrite another account.
const switched=click(h,'layout-save');h.requests.shift().resolve({code:'account-changed',error:'Account changed.'},409);await switched;assert(h.nodes.get('layout-save').disabled);assert.deepEqual(h.order(),keys);
// Storage failure stays visible and does not claim success.
h=harness({storageBlocked:true});await ready(h);await click(h,'layout-customize');await action(h,'tools','pin');await click(h,'layout-save');assert(h.dialog.open);assert.match(h.nodes.get('layout-status').textContent,/storage is blocked/);assert.equal(h.stored.size,0);await click(h,'layout-cancel');assert.deepEqual(h.order(),keys);
// Failed identity checks never fall back to potentially wrong guest or account preferences.
h=harness({local:saved});h.requests.shift().resolve({error:'Unavailable'},503);await flush();assert.deepEqual(h.order(),keys);assert(h.nodes.get('layout-save').disabled);
// A cached page and late response must not re-expose the previous account's layout.
h=harness();const late=h.requests.shift();h.events.pagehide();late.resolve({signedIn:true,accountKey,layout:saved,revision:1});await flush();assert.deepEqual(h.order(),keys);h.events.pageshow({persisted:true});assert.equal(h.requests.length,1);await ready(h);assert.deepEqual(h.order(),keys);
console.log('PASS dashboard UI: pin limits, ordering, preview/cancel, density, persistence, reset, conflict/account guards, storage failures, and late-response isolation');
