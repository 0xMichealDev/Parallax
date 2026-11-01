const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/home-living.js'),'utf8');
function setup({reducedMotion=false,saved='on',webgl=true,textureReady=true,canvas=true}={}){
  let seq=0,draws=0,scrolls=0;const rafs=new Map(),timers=new Map(),events=new Map(),nodes=new Map(),pending=[];
  class Node{
    constructor(){this.events={};this.attributes={};this.dataset={};this.disabled=false;this.value='50';this.props={};this.style={setProperty:(k,v)=>this.props[k]=v};const set=new Set();this.classList={add:k=>set.add(k),remove:k=>set.delete(k),contains:k=>set.has(k),toggle:(k,on)=>{if(on)set.add(k);else set.delete(k);}};}
    setAttribute(k,v){this.attributes[k]=v;}
    addEventListener(k,fn){this.events[k]=fn;}
    getBoundingClientRect(){return {width:1100,height:620};}
    getContext(){return {clearRect(){}};}
    scrollIntoView(){scrolls++;}
    focus(){this.focused=true;}
    click(){return this.events.click?.();}
  }
  const get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
  const buttons=[new Node(),new Node()],options=['biolume','glacial','volcanic'].map(key=>{const n=new Node();n.dataset.compareLook=key;return n;});
  const cards=[new Node(),new Node(),new Node()],body=new Node(),heroSection=new Node(),hero=get('home-earth-canvas');hero.parentElement=new Node();
  const document={body,hidden:false,getElementById:id=>id==='home-earth-canvas'&&!canvas?null:get(id),querySelector:()=>heroSection,querySelectorAll:s=>s==='[data-home-motion]'?buttons:s==='[data-compare-look]'?options:cards,addEventListener:(n,f)=>events.set(n,f)};
  const reduced={matches:reducedMotion,addEventListener:(n,f)=>events.set('reduced',f)};
  const memory=new Map([['parallax.home.motion.v1',saved]]);
  let observer;
  class IO{constructor(fn){observer=fn;}observe(){}}
  class Image{decode(){return new Promise((resolve,reject)=>pending.push({resolve,reject,image:this}));}}
  const window={IntersectionObserver:IO,ParallaxPlanetRenderer:{draw(){draws++;return webgl;},ready:()=>textureReady},addEventListener:(n,f)=>events.set(n,f)};
  const context={window,document,navigator:{},matchMedia:()=>reduced,IntersectionObserver:IO,Image,devicePixelRatio:1,
    localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},
    requestAnimationFrame:fn=>{const id=++seq;rafs.set(id,fn);return id;},cancelAnimationFrame:id=>rafs.delete(id),
    setTimeout:fn=>{const id=++seq;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id)};
  vm.runInNewContext(source,context);
  return {get,body,buttons,options,cards,document,hero,heroSection,reduced,events,memory,rafs,pending,timers,
    get draws(){return draws;},get scrolls(){return scrolls;},visible:value=>observer([{target:heroSection,isIntersecting:value}]),
    cardsVisible:()=>observer(cards.map(target=>({target,isIntersecting:true}))),
    frame(time){const [id,fn]=rafs.entries().next().value;rafs.delete(id);fn(time);}};
}
test('image hero keeps motion controls and comparison usable without a canvas animation loop',()=>{
 const t=setup({canvas:false});t.visible(true);
 assert.ok(t.heroSection.classList.contains('is-in-view'));
 assert.ok(t.body.classList.contains('home-motion-running'));
 assert.equal(t.rafs.size,0);assert.equal(t.draws,0);
 t.buttons[0].click();assert.equal(t.body.classList.contains('home-motion-running'),false);
 assert.equal(t.buttons[1].textContent,'Resume motion');
 t.buttons[1].click();assert.ok(t.body.classList.contains('home-motion-running'));
 t.document.hidden=true;t.events.get('visibilitychange')();assert.equal(t.body.classList.contains('home-motion-running'),false);
 t.visible(false);assert.equal(t.heroSection.classList.contains('is-in-view'),false);
 const slider=t.get('planet-reveal');slider.value='100';slider.events.input();
 assert.equal(t.get('planet-comparison').props['--reveal'],'100%');
 assert.equal(t.rafs.size,0);
 const reduced=setup({canvas:false,reducedMotion:true});reduced.visible(true);
 assert.equal(reduced.body.classList.contains('home-motion-running'),false);
});
test('animation starts only in view, pauses offscreen and in hidden tabs, and resumes without time jumps',()=>{
 const t=setup();assert.equal(t.draws,0);assert.equal(t.rafs.size,0);
 t.visible(true);assert.equal(t.rafs.size,1);assert.ok(t.hero.parentElement.classList.contains('earth-live'));
 t.frame(100);const count=t.draws;t.visible(false);assert.equal(t.rafs.size,0);assert.equal(t.draws,count);
 t.visible(true);t.document.hidden=true;t.events.get('visibilitychange')();assert.equal(t.rafs.size,0);assert.equal(t.body.classList.contains('home-motion-running'),false);
 t.document.hidden=false;t.events.get('visibilitychange')();assert.equal(t.rafs.size,1);
 t.body.classList.add('intro-film-active');t.events.get('visibilitychange')();assert.equal(t.rafs.size,0);
});
test('pause is shared, persisted, and reduced motion never starts the GPU animation',()=>{
 const t=setup();t.visible(true);t.buttons[0].click();assert.equal(t.rafs.size,0);assert.equal(t.memory.get('parallax.home.motion.v1'),'off');assert.equal(t.buttons[1].textContent,'Resume motion');
 const saved=setup({saved:'off'});saved.visible(true);assert.equal(saved.draws,0);
 const reduced=setup({reducedMotion:true});reduced.visible(true);assert.equal(reduced.draws,0);assert.equal(reduced.buttons[0].disabled,true);
 t.buttons[1].click();assert.equal(t.rafs.size,1);t.reduced.matches=true;t.events.get('reduced')();assert.equal(t.rafs.size,0);
});
test('WebGL failure and stalled textures keep the static fallback and stop animation',()=>{
 const t=setup({webgl:false});t.visible(true);assert.equal(t.rafs.size,0);assert.equal(t.hero.parentElement.classList.contains('earth-live'),false);
 const stalled=setup({textureReady:false});stalled.visible(true);assert.equal(stalled.hero.parentElement.classList.contains('earth-live'),false);[...stalled.timers.values()][0]();assert.equal(stalled.rafs.size,0);
});
test('native range reaches both endpoints and describes the visible proportions',()=>{
 const t=setup(),input=t.get('planet-reveal');assert.equal(input.disabled,false);
 for(const value of ['0','50','100']){input.value=value;input.events.input();assert.equal(t.get('planet-comparison').props['--reveal'],value+'%');assert.equal(input.attributes['aria-valuetext'],value+'% free design; '+(100-Number(value))+'% premium design');}
});
test('latest preview selection wins; failed downloads preserve the displayed selection',async()=>{
 const t=setup();const older=t.options[1].click(),latest=t.options[2].click();
 t.pending[1].resolve();await latest;assert.equal(t.get('compare-look-name').textContent,'Molten Core');assert.equal(t.options[2].attributes['aria-pressed'],'true');assert.equal(t.scrolls,1);assert.ok(t.get('planet-reveal').focused);
 t.pending[0].resolve();await older;assert.equal(t.get('compare-look-name').textContent,'Molten Core');
 const failed=t.options[1].click();t.pending[2].reject(new Error('offline'));await failed;assert.equal(t.get('compare-look-name').textContent,'Molten Core');assert.match(t.get('compare-status').textContent,/could not load/);
});
