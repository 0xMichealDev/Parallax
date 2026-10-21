import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../browser/solhandle-identity.js',import.meta.url),'utf8');
const wallet='5ZeA2mx6MotvFgpF8ZyGHSAVLZAqGuNK5aj8udFwtLC3',other='CZvu8vnzLKyfGmbpixypQcfW4iiw7em43utW4k6ordYP';
class Element{
 constructor(tag='div',dataset={}){this.tag=tag;this.dataset=dataset;this.children=[];this.attrs={};this.isConnected=true;this.classList={add(){}};this.value='';}
 set textContent(value){this.value=value;this.children=[];}get textContent(){return this.value+this.children.map(e=>e.textContent).join(' ');}
 append(...children){this.children.push(...children);}replaceChildren(...children){this.value='';this.children=children;}
 get lastChild(){return this.children.at(-1);}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}
 matches(){return Object.keys(this.dataset).some(k=>['solhandleWallet','solhandleProject','solhandleToken'].includes(k));}
 querySelectorAll(){return [];}
 button(){return this.children.flatMap(c=>[c,...c.children]).find(e=>e.tag==='button');}
}
const flush=async()=>{for(let n=0;n<20;n++)await Promise.resolve();};
function harness(roots){
 let now=1000;const pending=[],timers=new Map(),listeners={},winListeners={};let timerId=0;
 const document={hidden:false,body:{},createElement:tag=>new Element(tag),querySelectorAll:()=>roots,addEventListener:(name,fn)=>listeners[name]=fn};
 const window={addEventListener:(name,fn)=>winListeners[name]=fn};
 class Clock extends Date{static now(){return now;}}
 vm.runInNewContext(source,{document,window,Date:Clock,MutationObserver:class{observe(){}},AbortSignal:{timeout:()=>undefined},encodeURIComponent,
 setTimeout:(fn,delay)=>{const id=++timerId;timers.set(id,{fn,at:now+delay});return id;},clearTimeout:id=>timers.delete(id),
 fetch:(url,options)=>new Promise(resolve=>pending.push({url,options,resolve:data=>resolve({ok:true,json:async()=>data})}))});
 return {pending,document,async visibility(hidden){document.hidden=hidden;listeners.visibilitychange();await flush();},async restore(){winListeners.pageshow({persisted:true});await flush();},async advance(ms,runTimers=true){now+=ms;if(runTimers)for(const [id,t]of [...timers])if(t.at<=now){timers.delete(id);t.fn();}await flush();}};
}
const resolved=(address=wallet,handle='@parallax')=>({address,identity:{status:'resolved',handle,checkedAt:new Date().toISOString()}});
const root=new Element('div',{solhandleWallet:wallet}),h=harness([root]);
h.pending[0].resolve(resolved());await flush();assert.match(root.textContent,/@parallax/);
await h.visibility(true);assert.doesNotMatch(root.textContent,/@parallax/);assert.match(root.textContent,new RegExp(wallet));
await h.visibility(false);assert.equal(h.pending.length,2);assert.equal(h.pending[1].options.cache,'no-store');
h.pending[1].resolve({address:wallet,identity:{status:'not-set'}});await flush();assert.doesNotMatch(root.textContent,/@parallax/);assert.match(root.textContent,/No current primary handle/);
// An old in-flight request cannot resurrect a transferred name after tab resume.
root.button().onclick();await flush();await h.visibility(true);await h.visibility(false);assert.equal(h.pending.length,4);
h.pending[3].resolve(resolved(wallet,'@current'));await flush();h.pending[2].resolve(resolved(wallet,'@stale'));await flush();assert.match(root.textContent,/@current/);assert.doesNotMatch(root.textContent,/@stale/);
await h.advance(60001);assert.doesNotMatch(root.textContent,/@current/);assert.match(root.textContent,new RegExp(wallet));
await h.restore();assert.equal(h.pending.length,5);h.pending[4].resolve(resolved());await flush();
// Delayed responses do not receive a new 60-second lease after device suspension.
root.button().onclick();await flush();await h.advance(60001,false);h.pending[5].resolve(resolved(wallet,'@late'));await flush();assert.doesNotMatch(root.textContent,/@late/);assert.match(root.textContent,/expired/);
// Every linked creator address survives Passport identity expiry.
const passport=new Element('div',{solhandleToken:wallet}),p=harness([passport]);
const project=(address,name)=>({project:{name,href:'/world/test'},creator:resolved(address),projectPermissions:{canManage:false,status:'sign-in-required'}});
p.pending[0].resolve({projects:[project(wallet,'First'),project(other,'Second')],hasMore:false});await flush();await p.advance(60001);
assert.match(passport.textContent,new RegExp(wallet));assert.match(passport.textContent,new RegExp(other));assert.doesNotMatch(passport.textContent,/@parallax/);
// Duplicate cards share one request, while the queue never exceeds two in-flight reads.
const cards=[new Element('div',{solhandleWallet:wallet}),new Element('div',{solhandleWallet:wallet}),new Element('div',{solhandleWallet:other}),new Element('div',{solhandleWallet:'11111111111111111111111111111111'})],q=harness(cards);
assert.equal(q.pending.length,2);q.pending[0].resolve(resolved());await flush();assert.equal(q.pending.length,3);assert.match(cards[0].textContent,/@parallax/);assert.match(cards[1].textContent,/@parallax/);
console.log('PASS: background/BFCache invalidation, fresh resume, stale-response rejection, delayed-response expiry, pinned Passport addresses, request deduplication and bounded concurrency.');
