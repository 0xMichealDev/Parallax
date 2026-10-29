const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup({mobile=true,hash=''}={}){
 const events={},mainEvents={};let scrolls=0;
 const outer={tagName:'DETAILS',open:false,parentElement:null};
 const detail={tagName:'DETAILS',open:true,parentElement:outer};
 const target={parentElement:detail,closest(){return !detail.open?detail:!outer.open?outer:null},scrollIntoView(){scrolls++}};
 const location={hash};
 const main={addEventListener:(name,fn)=>mainEvents[name]=fn};
 vm.runInNewContext(fs.readFileSync('public/workspace-usability.js','utf8'),{
  document:{querySelector:()=>main,querySelectorAll:()=>[detail],getElementById:id=>id==='wallet-replay'?target:null,body:{dataset:{workspacePage:'control'}}},
  window:{matchMedia:()=>({matches:mobile}),addEventListener:(name,fn)=>events[name]=fn},
  location,requestAnimationFrame:fn=>fn()
 });
 return {detail,outer,target,location,events,mainEvents,scrolls:()=>scrolls};
}
test('mobile secondary sections collapse; desktop sections remain open',()=>{
 assert.equal(setup().detail.open,false);
 assert.equal(setup({mobile:false}).detail.open,true);
});
test('direct links reveal all collapsed ancestors before scrolling',()=>{
 const page=setup({hash:'#wallet-replay'});
 assert.equal(page.detail.open,true);assert.equal(page.outer.open,true);assert.equal(page.scrolls(),1);
});
test('hash changes reveal a section and malformed hashes do not interrupt navigation',()=>{
 const page=setup();page.location.hash='#wallet-replay';page.events.hashchange();
 assert.equal(page.detail.open,true);assert.equal(page.scrolls(),1);
 page.location.hash='#%E0%A4%A';assert.doesNotThrow(page.events.hashchange);
});
test('native validation reveals nested inputs before the browser focuses them',()=>{
 const page=setup();page.mainEvents.invalid({target:page.target});
 assert.equal(page.detail.open,true);assert.equal(page.outer.open,true);
});

test('focusing a disclosure summary leaves its native toggle in control',()=>{
 const page=setup();page.mainEvents.focusin({target:{tagName:'SUMMARY',parentElement:page.detail}});
 assert.equal(page.detail.open,false);
 page.mainEvents.focusin({target:page.target});
 assert.equal(page.detail.open,true);
});
