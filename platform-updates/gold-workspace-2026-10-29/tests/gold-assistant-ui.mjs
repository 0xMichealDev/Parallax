import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const code=fs.readFileSync('public/gold-assistant.js','utf8'),flush=()=>new Promise(setImmediate);
class Node{constructor(tag='div'){this.tag=tag;this.children=[];this.hidden=false;this.disabled=false;this.dataset={};this.attrs={};this._value='';this.textContent='';}set innerHTML(v){throw Error('Unsafe HTML rendering');}get value(){return this._value||(this.tag==='select'?this.children[0]?.value||'':'');}set value(v){this._value=v;}append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;if(this.tag==='select')this._value='';}setAttribute(k,v){this.attrs[k]=v;}focus(){this.focused=true;}click(){}}
function client({member=true,signedIn=true,ai=true}={}){
 const nodes=new Map(),requests=[],handlers={},prompts=[new Node('button')];prompts[0].dataset.prompt='Explain evidence';
 const $=id=>{if(!nodes.has(id))nodes.set(id,new Node(['assistant-report','assistant-compare'].includes(id)?'select':'div'));return nodes.get(id);};
 const state={membership:{eligible:member,access:member?{eligible:true,wallet:'wallet'}:undefined},aiEnabled:ai,reports:[{id:'a',address:'mint',name:'<script>unsafe</script>',created_at:'2026-10-20T10:00:00Z'},{id:'b',address:'mint',name:'Other snapshot',created_at:'2026-10-19T10:00:00Z'},{id:'c',address:'other-token',name:'Other token',created_at:'2026-10-20T10:00:00Z'}],chats:[],remaining:20,dailyLimit:20};
 const chat={chat:{id:'chat-1',title:'<img onerror=bad()>',focus:'Plain English'},turns:[]};let pending=null,failAsk=false;
 const document={getElementById:$,createElement:t=>new Node(t),querySelectorAll:s=>s==='[data-prompt]'?prompts:s.includes('.chat-item')?[...$('assistant-chats').children.filter(n=>n.tag==='button'),...prompts]:[]};
 vm.runInNewContext(code,{document,window:{phantom:{solana:{on:(e,f)=>{handlers[e]=f;}}}},location:{search:'?report=a'},URLSearchParams,URL,Blob,crypto:{randomUUID:()=>String(requests.length)},Date,console,confirm:()=>true,setTimeout(){},fetch:async(url,init)=>{
  requests.push({url,body:init.body?JSON.parse(init.body):null});if(!signedIn)return Response.json({error:'Sign in',code:'signin'},{status:401});
  if(url.endsWith('/state'))return Response.json(state);
  if(url.endsWith('/create')){state.chats=[{id:'chat-1',title:chat.chat.title,updated_at:Date.now()}];return Response.json({id:'chat-1'});}
  if(url.includes('/chat?'))return Response.json(chat);
  if(url.endsWith('/ask')){if(pending)await pending;if(failAsk)return Response.json({error:'Provider unavailable'},{status:503});const body=JSON.parse(init.body);chat.turns.push({id:'turn',question:body.question,answer:'<script>bad()</script> [A:S2]',status:'completed',created_at:Date.now(),evidence:[{id:'a',address:'mint',collectedAt:'2026-10-20T10:00:00Z',sources:[{id:'A:S2',url:'https://dexscreener.com/solana/mint',label:'Market',status:'retrieved'},{id:'A:S3',url:'javascript:alert(1)',label:'bad',status:'retrieved'}]}]});state.remaining--;return Response.json({ok:true});}
  if(url.endsWith('/delete')){state.chats=[];return Response.json({ok:true});}throw Error('Unexpected request');
 }});
 return {$,state,requests,handlers,prompts,setPending:p=>{pending=p;},setFailAsk:v=>{failAsk=v;}};
}
let c=client({signedIn:false});await flush();assert.equal(c.$('assistant-workspace').hidden,true);assert(c.$('assistant-access-link').href.startsWith('/signin-with-chatgpt'));
c=client({member:false});await flush();assert.equal(c.$('assistant-start').disabled,true);assert.equal(c.requests.length,1);
c=client({ai:false});await flush();assert.equal(c.$('assistant-start').disabled,true);
c=client();await flush();assert.equal(c.$('assistant-start').disabled,false);assert.equal(c.$('assistant-compare').children.length,2,'exclude other token');
c.$('assistant-focus').value='Plain English';await c.$('assistant-create').onsubmit({preventDefault(){}});assert.equal(c.$('assistant-conversation').hidden,false);assert.equal(c.requests.find(r=>r.url.endsWith('/create')).body.reportId,'a');
c.prompts[0].onclick();assert.equal(c.$('assistant-question').value,'Explain evidence');
await c.$('assistant-ask').onsubmit({preventDefault(){}});assert.equal(c.$('assistant-question').value,'');assert.match(c.$('assistant-remaining').textContent,/19 of 20/);assert.equal(c.$('assistant-title').textContent,'<img onerror=bad()>');
const links=[];function walk(n){if(n.href)links.push(n.href);for(const child of n.children||[])walk(child);}walk(c.$('assistant-messages'));assert(links.includes('https://dexscreener.com/solana/mint'));assert(!links.some(s=>s.startsWith('javascript:')));
c.setFailAsk(true);c.$('assistant-question').value='Preserve my question';await c.$('assistant-ask').onsubmit({preventDefault(){}});assert.equal(c.$('assistant-question').value,'Preserve my question');assert.match(c.$('assistant-status').textContent,/Provider unavailable/);c.setFailAsk(false);
let release;c.setPending(new Promise(r=>{release=r;}));c.$('assistant-question').value='Delayed';const sending=c.$('assistant-ask').onsubmit({preventDefault(){}});await flush();assert.equal(c.$('assistant-new').disabled,true);c.handlers.accountChanged();release();await sending;assert.equal(c.$('assistant-conversation').hidden,true);assert.equal(c.$('assistant-messages').children.length,0,'stale response cannot restore cleared UI');assert.equal(c.$('assistant-send').disabled,true);
console.log('PASS assistant UI: sign-in, Gold gate, unavailable AI, report selection, suggestions, saved answer, failure recovery, safe text/source rendering and wallet-switch race.');
