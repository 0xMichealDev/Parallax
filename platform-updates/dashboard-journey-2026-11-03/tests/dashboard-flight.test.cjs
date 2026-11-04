const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const atProgress=progress=>1/24+(10-1/24)*progress;

async function setup({saved=null,reducedMotion=false,mobile=false,saveData=false,deferDownload=false,downloadStatus=200,mediaType="video/mp4",width=1440,height=900,dpr=1,fourK=true,effectiveType="4g",journey=false}={}){
 let sequence=0,loads=0,plays=0,writes=0,clock=0;
 const frames=new Map(),timers=new Map(),mutations=new Set(),observers=[],resizers=[];
 const downloads=[],objects=new Map(),revoked=[];let releaseDownload;
 const network=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
 class Node {
  constructor(){this.events=new Map();this.dataset={};this.attributes={};this.hidden=false;this.disabled=false;
   this.style={values:new Map(),setProperty(k,v){this.values.set(k,v);}};
   const set=new Set();this.classList={contains:k=>set.has(k),toggle:(k,on)=>{const next=on??!set.has(k);if(next===set.has(k))return;next?set.add(k):set.delete(k);for(const o of observers)if(o.target===this)mutations.add(o.fn);},add:k=>this.classList.toggle(k,true),remove:k=>this.classList.toggle(k,false)};}
  addEventListener(k,fn,options){if(!this.events.has(k))this.events.set(k,[]);this.events.get(k).push({fn,options});}
  emit(k,event){for(const {fn} of this.events.get(k)||[])fn(event);}
  setAttribute(k,v){this.attributes[k]=v;}
  removeAttribute(k){delete this[k];}
  contains(node){return this===node||node?.parentElement===this;}
  focus(options){document.activeElement=this;this.focusOptions=options;}
  scrollIntoView(options){this.scrollOptions=options;}
 }
 const body=new Node();body.classList.add('dashboard-flight');
 const host=new Node();host.dataset.state='poster';
 const video=new Node(),buttons=[new Node(),new Node()],retry=new Node(),status=new Node();
 video.dataset={mobileSrc:'/assets/dashboard-flight/flight-hd-v132.mp4',desktopSrc:'/assets/dashboard-flight/flight-hd-v132.mp4',highSrc:'/assets/dashboard-flight/flight-4k-v132.mp4',saverSrc:'/assets/dashboard-flight/flight-960-v122.mp4'};
 video.canPlayType=()=>fourK?'probably':'';
 video.readyState=0;video.duration=NaN;video.seeking=false;video.seeks=[];
 let currentTime=0;
 Object.defineProperty(video,'currentTime',{get:()=>currentTime,set:v=>{if(video.throwSeek)throw Error('decode failed');currentTime=v;video.seeks.push(v);video.seeking=true;}});
 video.paused=true;
 video.load=()=>{loads++;currentTime=0;video.readyState=0;video.duration=NaN;video.seeking=false;};
 video.pause=()=>{video.paused=true;};video.play=()=>{plays++;video.paused=false;video.emit('play');};
 const document=new Node();document.body=body;document.hidden=false;
 document.scrollingElement={scrollTop:0,scrollHeight:5800,clientHeight:800};document.documentElement=document.scrollingElement;
 const track=journey?new Node():null,stage=journey?new Node():null,chapters=journey?[new Node(),new Node(),new Node()]:[],steps=journey?[new Node(),new Node(),new Node()]:[];
 if(track){
  host.dataset.track='dashboard-journey';Object.assign(track,{top:400,height:2600});Object.assign(stage,{height:800,top:64});
  track.getBoundingClientRect=()=>({top:track.top-document.scrollingElement.scrollTop,height:track.height});
  stage.getBoundingClientRect=()=>({height:stage.height});
  track.querySelector=selector=>selector==='.journey-stage'?stage:null;
  track.querySelectorAll=selector=>selector==='[data-journey-chapter]'?chapters:selector==='[data-journey-step]'?steps:[];
  chapters.forEach((node,i)=>node.dataset.journeyChapter=String(i));steps.forEach((node,i)=>node.dataset.journeyStep=String(i));
 }
 document.getElementById=id=>id==='dashboard-flight'?host:id==='dashboard-flight-video'?video:id==='dashboard-journey'?track:null;
 document.querySelector=()=>null;document.querySelectorAll=s=>s==='[data-home-motion]'?buttons:s==='[data-flight-retry]'?[retry]:s==='[data-flight-status]'?[status]:[];
 const reduced=new Node();reduced.matches=reducedMotion;const narrow={matches:mobile};
 const window=new Node();window.visualViewport=new Node();Object.assign(window,{innerWidth:width,innerHeight:height,devicePixelRatio:dpr});
 window.getComputedStyle=node=>({top:node.top+'px'});
 window.scrollTo=options=>{window.lastScroll=options;document.scrollingElement.scrollTop=options.top;window.emit('scroll');};
 class MutationObserver{constructor(fn){this.fn=fn;}observe(target){this.target=target;observers.push(this);}}
 class ResizeObserver{constructor(fn){resizers.push(fn);}observe(){}}
 Object.assign(window,{MutationObserver,ResizeObserver});
 const memory=new Map(saved?[['parallax.home.motion.v1',saved]]:[]);
 const context={document,window,navigator:{connection:{saveData,effectiveType}},MutationObserver,ResizeObserver,AbortController,
  fetch:async(url,options)=>{downloads.push({url,options});if(deferDownload)await new Promise(resolve=>{releaseDownload=resolve;});return {ok:downloadStatus===200,status:downloadStatus,blob:async()=>({size:14000000,type:mediaType})};},
  URL:{createObjectURL:blob=>{const url="blob:flight-"+(++sequence);objects.set(url,blob);return url;},revokeObjectURL:url=>{revoked.push(url);objects.delete(url);}},
  matchMedia:q=>q.includes('reduced-motion')?reduced:narrow,
  localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>{writes++;memory.set(k,v);}},
  requestAnimationFrame:fn=>{const id=++sequence;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
  setTimeout:(fn,delay)=>{const id=++sequence;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id)};
 vm.createContext(context);
 vm.runInContext(read('public/home-living.js'),context);
 vm.runInContext(read('public/dashboard-flight.js'),context);
 function flush(){for(let i=0;mutations.size&&i<20;i++){const callbacks=[...mutations];mutations.clear();callbacks.forEach(fn=>fn());}assert.equal(mutations.size,0,'no mutation feedback loop');}
 await network();flush();
 const t={video,host,body,buttons,retry,status,document,window,reduced,narrow,frames,timers,memory,track,stage,chapters,steps,
  downloads,objects,revoked,network,release:()=>releaseDownload?.(),pendingDownload:()=>releaseDownload,
  get loads(){return loads;},get plays(){return plays;},get writes(){return writes;},flush,
  frame(elapsed=1000/60){clock+=elapsed;const tasks=[...frames.values()];frames.clear();tasks.forEach(fn=>fn(clock));flush();},
  ready(){video.duration=10+1/24;video.readyState=2;video.emit('loadedmetadata');video.emit('loadeddata');},
  scroll(top){document.scrollingElement.scrollTop=top;window.emit('scroll');},
  sought(){video.seeking=false;video.emit('seeked');},
  resize(){resizers.forEach(fn=>fn());window.emit('resize');},
  click(index=0){buttons[index].emit('click');flush();},
  reduce(value){reduced.matches=value;reduced.emit('change');flush();},
  visibility(hidden){document.hidden=hidden;document.emit('visibilitychange');flush();}
 };
 t.settle=()=>{for(let i=0;i<200&&(video.seeking||frames.size);i++){if(video.seeking)t.sought();t.frame();}assert.equal(frames.size,0);assert.equal(video.seeking,false);};
 return t;
}

test('the poster stays until an explicit first-frame seek completes, even when media is fully buffered',async()=>{
 for(const journey of [false,true]){
  const t=await setup({journey});t.ready();t.video.readyState=4;t.video.emit('canplay');
  assert.equal(t.video.currentTime,0);assert.equal(t.host.dataset.state,'poster');assert.equal(t.status.hidden,false);
  t.video.emit('seeked');assert.equal(t.host.dataset.state,'poster','an unsolicited event cannot reveal the poster as a decoded frame');
  t.frame();assert.deepEqual(t.video.seeks,[1/24]);assert.equal(t.video.seeking,true);
  t.video.emit('loadeddata');t.video.emit('canplay');
  assert.equal(t.host.dataset.state,'poster','buffer readiness does not complete the pending handoff');
  t.sought();assert.equal(t.host.dataset.state,'ready');assert.equal(t.status.hidden,true);t.settle();
  assert.equal(t.video.seeks.length,1,'stationary startup does not seek repeatedly');
  t.scroll(journey?516:500);t.frame();assert.ok(t.video.currentTime>1/24&&t.video.currentTime<1,'the first scroll advances from the displayed first frame');
  assert.equal(t.plays,0);
 }
});

test('native scroll seeks forward and backward, coalesces events, and has no idle render loop',async()=>{
 const t=await setup();t.ready();t.settle();assert.equal(t.host.dataset.state,'ready');
 assert.equal(t.video.loop,false);assert.equal(t.video.autoplay,false);assert.equal(t.video.paused,true);assert.equal(t.retry.hidden,true);
 t.scroll(2500);t.scroll(3000);assert.equal(t.frames.size,1);t.frame();assert.ok(t.video.currentTime>0&&t.video.currentTime<1,'first wheel step is softened');
 t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(0.6))<.01);
 t.scroll(4000);t.frame();t.scroll(1000);assert.equal(t.frames.size,0,'in-flight seek is serialized');
 const previous=t.video.currentTime;t.sought();t.frame();assert.ok(t.video.currentTime<previous&&t.video.currentTime>2,'reversal eases toward the latest target');
 t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(0.2))<.01);assert.equal(t.timers.size,0);
 t.scroll(5000);t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(1.0))<.01);
 t.scroll(-100);t.settle();assert.equal(t.video.currentTime,1/24);
 assert.equal(t.plays,0);assert.equal(t.writes,0);
 assert.equal(t.window.events.has('wheel'),false);assert.equal(t.window.events.has('touchmove'),false);
 assert.equal(t.window.events.get('scroll')[0].options.passive,true);
 const count=t.video.seeks.length;for(let i=0;i<60;i++)t.frame();assert.equal(t.video.seeks.length,count,'stationary page holds its last frame');
 t.video.play();assert.equal(t.video.paused,true,'external playback is immediately stopped');
});
test('existing pause buttons freeze the flight and alone persist user preference',async()=>{
 const t=await setup();t.ready();t.settle();t.scroll(2000);t.settle();
 t.click();assert.equal(t.memory.get('parallax.home.motion.v1'),'off');assert.equal(t.buttons[1].textContent,'Resume motion');
 const count=t.video.seeks.length;t.scroll(4500);t.frame();assert.equal(t.video.seeks.length,count);assert.equal(t.timers.size,0);
 t.click(1);t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(0.9))<.01);assert.equal(t.writes,2);
 const paused=await setup({saved:'off'});assert.equal(paused.loads,0);assert.equal(paused.writes,0);assert.equal(paused.host.dataset.state,'poster');
});
test('reduced motion and data saver begin with the poster without rewriting saved motion',async()=>{
 const t=await setup({saved:'on',reducedMotion:true});assert.equal(t.loads,0);assert.equal(t.buttons[0].disabled,true);assert.equal(t.writes,0);
 t.reduce(false);await t.network();assert.equal(t.loads,1);t.ready();t.settle();t.scroll(1000);t.frame();t.sought();t.frame();
 t.reduce(true);const count=t.video.seeks.length;t.scroll(4000);t.frame();assert.equal(t.video.seeks.length,count);assert.equal(t.writes,0);
 assert.equal(t.memory.get('parallax.home.motion.v1'),'on');
 const saver=await setup({saveData:true});assert.equal(saver.loads,0);saver.click();await saver.network();assert.equal(saver.loads,1);await saver.network();assert.match(saver.downloads[0].url,/960/);
});
test('hidden tabs and page-cache navigation stop work and resume at the current scroll position',async()=>{
 const t=await setup();t.ready();t.settle();t.scroll(3000);t.visibility(true);assert.equal(t.frames.size,0);assert.equal(t.timers.size,0);
 t.frame();assert.equal(t.video.seeks.length,1,'hidden tab does not seek beyond its initial frame');t.visibility(false);t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(0.6))<.01);
 t.window.emit('pagehide');t.scroll(4500);t.frame();assert.ok(Math.abs(t.video.currentTime-atProgress(0.6))<.01);
 t.window.emit('pageshow');t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(0.9))<.01);
});
test('mobile selects the HD asset once and panel or viewport resizing updates the scroll range',async()=>{
 const t=await setup({mobile:true});assert.match(t.downloads[0].url,/hd-v132/);t.ready();t.settle();t.scroll(2500);t.frame();t.sought();t.frame();
 assert.ok(Math.abs(t.video.currentTime-atProgress(0.5))<.01);
 t.narrow.matches=false;t.document.scrollingElement.scrollHeight=10800;t.resize();t.settle();
 assert.ok(Math.abs(t.video.currentTime-atProgress(0.25))<.01);assert.equal(t.loads,1);assert.match(t.downloads[0].url,/hd-v132/);
 t.document.scrollingElement.scrollHeight=800;t.resize();t.settle();assert.equal(t.video.currentTime,1/24);
});
test('desktop easing halts mid-flight when paused and cannot jump after a long decode',async()=>{
 const t=await setup();t.ready();t.settle();t.scroll(4000);t.frame();const first=t.video.currentTime;
 t.sought();t.frame(3000);assert.ok(t.video.currentTime-first<2.2,'elapsed time is capped after a slow decode');
 t.click();const count=t.video.seeks.length;t.sought();t.frame();assert.equal(t.video.seeks.length,count);assert.equal(t.frames.size,0);
 t.click();t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(0.8))<.01);
 const mobile=await setup({mobile:true});mobile.ready();mobile.settle();mobile.scroll(4000);mobile.frame();assert.ok(Math.abs(mobile.video.currentTime-atProgress(0.8))<.01,'mobile keeps direct seeking');
});
test('media errors, stalled loading, stalled seeking, and unsupported seeks retain a usable poster',async()=>{
 const error=await setup();error.video.emit('error');assert.equal(error.host.dataset.state,'fallback');assert.equal(error.video.src,undefined);assert.equal(error.frames.size,0);error.scroll(1000);assert.equal(error.frames.size,0);
 const stalled=await setup();[...stalled.timers.values()][0].fn();assert.equal(stalled.host.dataset.state,'fallback');
 const seek=await setup();seek.ready();seek.settle();seek.scroll(3000);seek.frame();assert.equal([...seek.timers.values()][0].delay,12000);[...seek.timers.values()][0].fn();assert.equal(seek.host.dataset.state,'fallback');
 const unsupported=await setup();unsupported.ready();unsupported.settle();unsupported.video.throwSeek=true;unsupported.scroll(1000);unsupported.frame();assert.equal(unsupported.host.dataset.state,'fallback');
});
test('failed loading or seeking can be retried at the latest scroll position without autoplay',async()=>{
 const t=await setup();t.scroll(3000);t.video.emit('error');assert.equal(t.retry.hidden,false);assert.equal(t.retry.textContent,'Retry background');
 t.click();assert.equal(t.retry.hidden,true);t.retry.emit('click');assert.equal(t.video.src,undefined,'retry respects paused motion');
 t.click();assert.equal(t.retry.hidden,false);t.retry.emit('click');await t.network();assert.match(t.downloads.at(-1).url,/hd-v132/);t.ready();t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(0.6))<.01);
 assert.equal(t.host.dataset.state,'ready');assert.equal(t.retry.hidden,true);assert.equal(t.plays,0);
 t.video.emit('stalled');assert.equal(t.timers.size,0,'idle buffering cannot falsely fail a decoded frame');
 t.scroll(4000);t.frame();[...t.timers.values()][0].fn();assert.equal(t.host.dataset.state,'fallback');
 t.window.emit('online');await t.network();t.ready();t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(0.8))<.01);
 assert.equal(t.writes,2,'only the two motion button clicks write preferences');
});
test('a seek completed during page suspension cannot leave scrubbing stuck',async()=>{
 const t=await setup();t.ready();t.settle();t.scroll(3000);t.frame();t.window.emit('pagehide');
 t.video.seeking=false; // completion happened while frozen, with no seeked event
 t.scroll(4000);t.window.emit('pageshow');t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(0.8))<.01);assert.equal(t.timers.size,0);
});
test('the section journey clamps before/after the stage and ignores unrelated page length',async()=>{
 const t=await setup({journey:true});t.ready();t.settle();
 assert.equal(t.video.currentTime,1/24);assert.equal(t.track.dataset.progress,'0.0000');
 t.scroll(1236);t.settle(); // 400px section start - 64px sticky top + 900px travel
 assert.ok(Math.abs(t.video.currentTime-atProgress(0.5))<.01);assert.equal(t.track.dataset.chapter,'1');
 t.document.scrollingElement.scrollHeight=20000;t.resize();t.settle();
 assert.ok(Math.abs(t.video.currentTime-atProgress(0.5))<.01,'panels below the journey do not retime it');
 t.scroll(2136);t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(1.0))<.01);
 t.scroll(15000);t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(1.0))<.01);
 t.scroll(0);t.settle();assert.equal(t.video.currentTime,1/24);
 assert.equal(t.window.events.has('wheel'),false);assert.equal(t.window.events.has('touchmove'),false);
});

test('journey geometry follows the actual sticky stage, header offset, and resized section',async()=>{
 const t=await setup({journey:true,mobile:true});t.ready();t.scroll(1236);t.settle();
 assert.ok(Math.abs(t.video.currentTime-atProgress(0.5))<.01);
 t.stage.height=600;t.stage.top=0;t.resize();t.settle();
 assert.ok(Math.abs(t.video.currentTime-atProgress(0.418))<.01);
 t.track.top=700;t.track.height=3000;t.resize();t.settle();
 assert.ok(Math.abs(t.video.currentTime-atProgress(536/2400))<.01);
 t.track.height=500;t.resize();t.settle();assert.equal(t.video.currentTime,1/24,'a static-sized section never divides by zero');
});

test('chapters and step controls work while paused, loading, and after failed media',async()=>{
 for(const options of [{saved:'off'},{deferDownload:true},{downloadStatus:503}]){
  const t=await setup({journey:true,...options});
  t.scroll(1686); // 75% of the dedicated section
  assert.equal(t.track.dataset.progress,'0.7500');assert.equal(t.track.style.values.get('--journey-progress'),'0.7500');
  assert.equal(t.track.dataset.chapter,'2');
  assert.deepEqual(t.chapters.map(n=>n.hidden),[true,true,false]);
  assert.deepEqual(t.chapters.map(n=>n.inert),[true,true,false]);
  assert.equal(t.steps[2].attributes['aria-current'],'true');
  assert.equal(t.chapters[0].attributes['aria-hidden'],'true');
  const link={parentElement:t.chapters[2]};t.document.activeElement=link;
  t.steps[0].emit('click');
  assert.equal(t.window.lastScroll.top,336);assert.equal(t.window.lastScroll.behavior,'instant');
  assert.equal(t.track.dataset.chapter,'0');assert.equal(t.document.activeElement,t.steps[0]);
  assert.equal(t.steps[0].focusOptions.preventScroll,true);
  t.steps[1].emit('click');assert.equal(t.track.dataset.chapter,'1');
  assert.equal(t.plays,0);assert.equal(t.writes,0);
 }
});

test('reduced motion exposes every chapter and restores section navigation without hiding content',async()=>{
 const t=await setup({journey:true,reducedMotion:true});
 assert.equal(t.track.dataset.journeyMode,'static');assert.equal(t.loads,0);
 t.scroll(1800);assert.deepEqual(t.chapters.map(n=>n.hidden),[false,false,false]);
 assert.deepEqual(t.chapters.map(n=>n.inert),[false,false,false]);
 t.steps[1].emit('click');assert.equal(t.chapters[1].scrollOptions.behavior,'auto');
 assert.equal(t.chapters[1].scrollOptions.block,'center');assert.equal(t.window.lastScroll,undefined);
 t.reduce(false);await t.network();t.ready();t.settle();
 assert.equal(t.track.dataset.journeyMode,'scroll');assert.equal(t.chapters.filter(n=>!n.hidden).length,1);
 t.reduce(true);assert.deepEqual(t.chapters.map(n=>n.hidden),[false,false,false]);
 assert.equal(t.frames.size,0);assert.equal(t.writes,0);
});

test('whole-file delivery buffers the exact approved asset before attaching a seekable local video',async()=>{
 const t=await setup({deferDownload:true});
 assert.equal(t.video.src,undefined);assert.equal(t.loads,0);assert.equal(t.downloads.length,1);
 assert.equal(t.status.hidden,false);assert.equal(t.status.textContent,'Preparing your flight…');
 assert.match(t.downloads[0].url,/flight-hd-v132\.mp4$/);
 assert.equal(t.downloads[0].options.headers,undefined,'no reliance on remote Range support');
 t.scroll(3500);t.frame();assert.equal(t.video.seeks.length,0);
 t.release();await t.network();assert.equal(t.loads,1);assert.match(t.video.src,/^blob:/);
 assert.equal(t.objects.size,1);t.ready();t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(0.7))<.01);
 assert.equal(t.status.hidden,true);t.scroll(1000);t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(0.2))<.01);
 assert.equal(t.downloads.length,1,'reverse seeking does not request another download');
 assert.equal(t.plays,0);
});
test('download failure and non-video responses expose recovery and never attach unusable media',async()=>{
 for(const options of [{downloadStatus:503},{mediaType:'text/html'}]){
  const t=await setup(options);assert.equal(t.host.dataset.state,'fallback');assert.equal(t.retry.hidden,false);
  assert.equal(t.objects.size,0);assert.equal(t.video.src,undefined);assert.equal(t.frames.size,0);
  assert.equal(t.status.textContent,'Flight unavailable. Please retry.');
 }
});
test('timed-out downloads are aborted and stale completion cannot replace the fallback',async()=>{
 const t=await setup({deferDownload:true});const signal=t.downloads[0].options.signal;
 [...t.timers.values()][0].fn();assert.equal(signal.aborted,true);assert.equal(t.host.dataset.state,'fallback');
 t.release();await t.network();assert.equal(t.objects.size,0);assert.equal(t.video.src,undefined);
 assert.equal(t.host.dataset.state,'fallback');
});
test('local media is released on failure and a download finishing while paused cannot start motion',async()=>{
 const t=await setup({deferDownload:true});t.click();t.release();await t.network();t.ready();t.settle();
 assert.equal(t.video.seeks.length,0);assert.equal(t.plays,0);assert.equal(t.frames.size,0);
 const local=t.video.src;t.video.emit('error');assert.deepEqual(t.revoked,[local]);assert.equal(t.objects.size,0);
 assert.equal(t.retry.hidden,true,'saved pause is respected even when media fails');
});
test('missing seeked events recover on the next scroll or watchdog without reloading the clip',async()=>{
 for(const trigger of ['scroll','deadline']){
  const t=await setup();t.ready();t.settle();t.scroll(3000);t.frame();
  t.video.seeking=false; // browser completed the frame but omitted the event
  if(trigger==='scroll')t.scroll(1000);else [...t.timers.values()][0].fn();
  t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(trigger==='scroll'?.2:.6))<.01);
  assert.equal(t.host.dataset.state,'ready');assert.equal(t.downloads.length,1);assert.equal(t.objects.size,1);
 }
});

test('large and high-density desktops use 4K while small displays and slow links avoid that download',async()=>{
 for(const options of [{width:2560,height:1440},{dpr:2}]){
  const t=await setup(options);assert.match(t.downloads[0].url,/4k-v132/);
  t.ready();t.settle();t.scroll(3500);t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(0.7))<.01);
  t.window.devicePixelRatio=1;t.window.innerWidth=1000;t.resize();t.settle();
  assert.equal(t.downloads.length,1,'display changes do not restart an already buffered flight');
 }
 for(const options of [{mobile:true,dpr:3},{fourK:false,dpr:2},{}]){
  const t=await setup(options);assert.match(t.downloads[0].url,/hd-v132/);
 }
 for(const effectiveType of ['slow-2g','2g','3g']){
  const t=await setup({effectiveType,dpr:2});assert.match(t.downloads[0].url,/960-v122/);
 }
});

test('a failed 4K decode releases its buffer and recovers once in HD at the current scroll position',async()=>{
 const t=await setup({dpr:2});const first=t.video.src;
 t.scroll(3000);t.video.emit('error');await t.network();
 assert.deepEqual(t.revoked,[first]);assert.equal(t.downloads.length,2);
 assert.match(t.downloads[1].url,/hd-v132/);assert.equal(t.objects.size,1);
 t.ready();t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(0.6))<.01);
 assert.equal(t.host.dataset.state,'ready');assert.equal(t.plays,0);assert.equal(t.writes,0);
 t.video.emit('error');await t.network();assert.equal(t.downloads.length,2,'no endless rendition retry loop');
 assert.equal(t.host.dataset.state,'fallback');assert.equal(t.objects.size,0);assert.equal(t.retry.hidden,false);
});

test('4K recovery respects pause and reduced motion, including a late HD download',async()=>{
 for(const stop of ['pause','reduced']){
  const t=await setup({dpr:2});t.scroll(2500);
  if(stop==='pause')t.click();else t.reduce(true);
  t.video.emit('error');await t.network();t.ready();t.settle();
  assert.equal(t.video.seeks.length,0);assert.equal(t.plays,0);assert.equal(t.frames.size,0);
  assert.equal(t.retry.hidden,true);
  if(stop==='pause')t.click();else t.reduce(false);
  t.settle();assert.ok(Math.abs(t.video.currentTime-atProgress(0.5))<.01);
 }
});

test('a timed-out 4K download cannot overwrite the recovered HD buffer when it finishes late',async()=>{
 const t=await setup({dpr:2,deferDownload:true});const release4k=t.pendingDownload();
 const firstSignal=t.downloads[0].options.signal;
 [...t.timers.values()][0].fn();
 assert.equal(firstSignal.aborted,true);assert.equal(t.downloads.length,2);
 assert.match(t.downloads[1].url,/hd-v132/);
 t.release();await t.network();t.ready();t.settle();const hd=t.video.src;
 release4k();await t.network();
 assert.equal(t.video.src,hd);assert.equal(t.host.dataset.state,'ready');assert.equal(t.objects.size,1);
});
