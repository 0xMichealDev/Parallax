const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('public/dashboard-focus.js','utf8');
function setup(hash=''){
 const outer={tagName:'DETAILS',open:false,parentElement:null};
 const inner={tagName:'DETAILS',open:false,parentElement:outer};
 let scrolled=0;
 const target={parentElement:inner,scrollIntoView(){scrolled++;}};
 const events={};
 const location={hash};
 const context={location,requestAnimationFrame:fn=>fn(),document:{getElementById:id=>['summit-history','planet-comparison'].includes(id)?target:null,addEventListener:(name,fn)=>events[name]=fn},window:{addEventListener:(name,fn)=>events[name]=fn}};
 vm.runInNewContext(script,context);
 return {outer,inner,target,events,location,get scrolled(){return scrolled;}};
}
test('a linked nested panel opens before scrolling, including repeated same-fragment links',()=>{
 const h=setup('#summit-history');assert.equal(h.outer.open,true);assert.equal(h.inner.open,true);assert.equal(h.scrolled,1);
 h.outer.open=false;h.inner.open=false;
 h.events.click({target:{closest:s=>s==='a[href^="#"]'?{getAttribute:()=>h.location.hash}:null}});
 assert.equal(h.outer.open,true);assert.equal(h.inner.open,true);assert.equal(h.scrolled,2);
});
test('gallery comparison opens its enclosing panel without taking over the gallery scroll handler',()=>{
 const h=setup();h.events.click({target:{closest:s=>s==='[data-compare-look]'?{}:null}});
 assert.equal(h.outer.open,true);assert.equal(h.inner.open,true);assert.equal(h.scrolled,0);
});
test('empty, missing and malformed fragments leave the dashboard alone',()=>{
 for(const hash of ['', '#unknown', '#%E0%A4%A']){const h=setup(hash);assert.equal(h.outer.open,false);assert.equal(h.scrolled,0);}
});
