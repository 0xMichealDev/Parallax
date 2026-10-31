const {test}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
// A small DOM contract fixture: these checks exercise controls without claiming browser layout coverage.
function fixture(audioClass,world,adventure=false,rocketOptions=null){
 let document;
 class Element {
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.dataset={};this.style={};this.attrs={};this.listeners={};this.hidden=false;this.inert=false;this.disabled=false;this.clientWidth=this.clientHeight=500;this.textContent='';const classes=new Set();this.classList={add:(...a)=>a.forEach(v=>classes.add(v)),remove:(...a)=>a.forEach(v=>classes.delete(v)),contains:v=>classes.has(v)};}
  set className(v){this.attrs.class=v;v.split(' ').forEach(c=>this.classList.add(c));}
  get className(){return this.attrs.class||'';}
  setAttribute(k,v){this.attrs[k]=String(v);if(k==='class')this.className=v;if(k==='id')this.id=v;if(k==='value')this.value=v;if(k==='hidden')this.hidden=true;if(k.startsWith('data-'))this.dataset[k.slice(5)]=v;}
  getAttribute(k){return this.attrs[k];}
  append(...items){items.forEach(el=>{el.parentElement=this;this.children.push(el);});}
  set innerHTML(html){this.children=[];const stack=[this];for(const m of html.matchAll(/<\/?([a-z][\w-]*)([^>]*)>/gi)){const [all,tag,attrs]=m;if(all.startsWith('</')){if(stack.length>1)stack.pop();continue;}const el=new Element(tag);for(const a of attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g))el.setAttribute(a[1],a[2]??'');stack.at(-1).append(el);if(!['img','input','br','hr','meta','link'].includes(tag))stack.push(el);}}
  matches(sel){const tag=sel.match(/^[\w-]+/)?.[0];if(tag&&this.tagName!==tag.toUpperCase())return false;for(const m of sel.matchAll(/([.#])([\w-]+)|\[([\w-]+)(?:="([^"]*)")?\]/g)){if(m[1]==='.'&&!this.classList.contains(m[2]))return false;if(m[1]==='#'&&this.id!==m[2])return false;if(m[3]&&!(m[3] in this.attrs))return false;if(m[4]!==undefined&&this.attrs[m[3]]!==m[4])return false;}return true;}
  querySelectorAll(sel){const nodes=[];const walk=el=>el.children.forEach(c=>{nodes.push(c);walk(c);});walk(this);return nodes.filter(el=>sel.split(',').some(part=>{const chain=part.trim().split(/\s+/);let current=el;if(!current.matches(chain.pop()))return false;while(chain.length){const wanted=chain.pop();current=current.parentElement;while(current&&current!==this&&!current.matches(wanted))current=current.parentElement;if(!current||!current.matches(wanted))return false;}return true;}));}
  querySelector(sel){return this.querySelectorAll(sel)[0]||null;}
  addEventListener(k,f){(this.listeners[k]??=[]).push(f);}
  dispatchEvent(event){event.target??=this;event.preventDefault??=()=>event.prevented=true;event.stopPropagation??=()=>{};(this.listeners[event.type]||[]).forEach(f=>f(event));return event;}
  focus(){document.activeElement=this;}
  setPointerCapture(){}
  get isConnected(){return true;}
 }
 document=new Element('document');document.body=new Element('body');document.hidden=false;document.createElement=tag=>new Element(tag);
 const dialog=new Element('dialog'),stage=new Element('div'),oldInert=new Element('aside');oldInert.inert=true;dialog.append(stage,oldInert);dialog.open=true;
 let surface=true,walking=false,freezeCount=0,lastStatus='';
 const ground={ready:true,state:{x:0,z:0,seated:false,distance:0},camp:{fireOn:true,lanternOn:true,tentOpen:true,night:false,hands:true,flashlightOn:true,redLight:false,satellitesOn:true},points:{fire:[0,0,-8],tent:[-4.5,0,-10.5],telescope:[3.5,0,-13]},trail:[{id:'one',name:'Overlook',x:-21,z:-28,note:'Overlook field note.'},{id:'two',name:'Meteorite',x:19,z:-26,note:'Meteorite field note.'},{id:'three',name:'Station',x:26,z:8,note:'Station field note.'}],terrainHeight(){return 0;},satellitePoints(){return [[0,100,-100]];},watchSky(){this.camp.night=true;this.state.pitch=.61;},stoke(){this.camp.fireOn=true;this.camp.fireBoost=1;},setHandVisible(value){this.handVisible=value;},setCamp(p){Object.assign(this.camp,p);},visit(place){const pos={fire:[0,-5.15],tent:[-4.5,-6.25],telescope:[3.5,-10.6],camp:[0,-2.8]}[place];this.state.x=pos[0];this.state.z=pos[1];this.state.seated=place==='fire';},project(){return {x:500,y:300,depth:10,distance:10};}};
 if(world)Object.assign(ground,world);
 const memory=new Map();const window={ParallaxCampSound:audioClass,localStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)}};if(adventure)for(const file of ["desert-story.js",...(adventure==='contact'?['first-contact.js']:[]),"desert-adventure.js"])vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../public/"+file),"utf8"),{window,document,innerWidth:1440,innerHeight:900,Math,console});if(rocketOptions)for(const file of ['rocket-state.js','rocket-experience.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/'+file),'utf8'),{window,document,Math});vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/camp-experience.js'),'utf8'),{window,document,innerWidth:1440,innerHeight:900,Math,console,setTimeout:()=>1,clearTimeout(){}});
 const targets=[{name:'Andromeda',image:'PIA08787',description:'Composite image of Andromeda.',credit:'NASA/JPL-Caltech'},{name:'Whirlpool',image:'PIA04230',description:'Hubble view.',credit:'NASA/Hubble Heritage'},{name:'Cosmic Cliffs',image:'carina_nebula',description:'Webb infrared.',credit:'NASA, ESA, CSA, STScI'}];
 const controller=window.ParallaxCamp.create({dialog,stage,getGround:()=>ground,isSurface:()=>surface,isWalking:()=>walking,enterWalk:()=>walking=true,freeze:()=>freezeCount++,draw(){},status:s=>lastStatus=s,targets,...rocketOptions});controller.update();const q=s=>dialog.querySelector(s);
 return {q,dialog,stage,document,ground,controller,oldInert,window,setSurface(v){surface=v;controller.update();},status:()=>lastStatus,freezeCount:()=>freezeCount};
}
test('camp controls change the world and restore modal focus and inert state',()=>{
 const f=fixture();f.q('.u-camp-entry').focus();f.q('.u-camp-entry').onclick();assert.equal(f.controller.blocking,true);assert.equal(f.stage.inert,true);assert.equal(f.q('#u-camp-panel').hidden,false);assert.equal(f.q('.u-field-journal').hidden,true);assert.equal(f.q('#u-camp-sound').parentElement.parentElement,f.q('#u-camp-panel'));
 for(const [control,state] of [['fire','fireOn'],['tent','tentOpen'],['lantern','lanternOn']]){f.q('#u-camp-'+control).onclick();assert.equal(f.ground.camp[state],false);f.q('#u-camp-'+control).onclick();assert.equal(f.ground.camp[state],true);}
 f.q('#u-camp-night').onclick();assert.equal(f.ground.camp.night,true);
 const event=f.q('.u-camp').dispatchEvent({type:'keydown',key:'Escape'});assert.equal(event.prevented,true);assert.equal(f.controller.blocking,false);assert.equal(f.stage.inert,false);assert.equal(f.oldInert.inert,true);assert.equal(f.document.activeElement,f.q('.u-camp-entry'));
});
test('telescope opens at the instrument, switches images, zooms, focuses and resets',()=>{
 const f=fixture();f.q('[data-place="telescope"]').onclick();assert.equal(f.controller.blocking,true);assert.equal(f.q('.u-scope').hidden,false);assert.equal(f.ground.state.x,3.5);
 const img=f.q('.u-scope-eye img');assert.match(img.src,/PIA08787/);img.onload();assert.equal(img.hidden,false);
 f.q('#u-scope-zoom').oninput({target:{value:'3'}});f.q('#u-scope-focus').oninput({target:{value:'10'}});assert.match(img.style.transform,/scale\(3\)/);assert.match(img.style.filter,/5.2px/);
 const eye=f.q('.u-scope-eye');eye.onpointerdown({pointerId:1,clientX:0,clientY:0});eye.onpointermove({pointerId:1,clientX:100,clientY:80});assert.match(img.style.transform,/translate\(100px,80px\)/);
 f.q('#u-scope-reset').onclick();assert.match(img.style.filter,/blur\(0px\)/);assert.match(img.style.transform,/translate\(0px,0px\) scale\(1\)/);
 f.q('.u-scope-targets').children[1].onclick();assert.match(img.src,/PIA04230/);img.onerror();assert.equal(img.hidden,true);assert.match(f.q('#u-scope-status').textContent,/retry/);
 f.q('.u-scope-targets').children[1].onclick();img.onload();assert.equal(img.hidden,false);
 f.q('.u-scope').querySelector('[data-close]').onclick();assert.equal(f.controller.blocking,false);assert.equal(f.ground.state.z,-10.6);
});
test('sitting, nearby keyboard interaction, target focus trap and scene cleanup',()=>{
 const f=fixture();f.q('.u-camp-entry').onclick();f.q('#u-camp-sit').onclick();assert.equal(f.ground.state.seated,true);assert.equal(f.controller.blocking,false);assert.equal(f.document.activeElement,f.stage);
 f.dialog.dispatchEvent({type:'keydown',code:'KeyE',target:f.stage});assert.equal(f.controller.blocking,true);assert.ok(f.freezeCount()>1);
 f.q('#u-camp-scope').onclick();const close=f.q('.u-scope').querySelector('[data-close]');close.focus();f.q('.u-camp').dispatchEvent({type:'keydown',key:'Tab',shiftKey:true});assert.equal(f.document.activeElement,f.q('#u-scope-reset'));
 f.q('.u-camp').dispatchEvent({type:'keydown',key:'Tab',shiftKey:false});assert.equal(f.document.activeElement,close);
 f.setSurface(false);assert.equal(f.q('.u-camp').hidden,true);assert.equal(f.controller.blocking,false);assert.equal(f.stage.inert,false);
 f.setSurface(true);assert.equal(f.q('.u-camp').hidden,false);assert.equal(f.q('#u-camp-sound').getAttribute('aria-pressed'),'false');f.controller.close();assert.equal(f.q('.u-camp').hidden,true);
});

test('flashlight modes, stowing and keyboard shortcuts stay out of telescope controls',()=>{
 const f=fixture();f.q('.u-camp-entry').onclick();f.q('.u-camp').dispatchEvent({type:'keydown',key:'Escape'});
 f.q('#u-field-light').onclick();assert.equal(f.ground.camp.redLight,true);assert.equal(f.ground.camp.flashlightOn,true);
 f.q('#u-field-light').onclick();assert.equal(f.ground.camp.flashlightOn,false);f.q('#u-field-light').onclick();assert.equal(f.ground.camp.redLight,false);assert.equal(f.ground.camp.flashlightOn,true);
 f.dialog.dispatchEvent({type:'keydown',code:'KeyQ',target:f.stage});assert.equal(f.ground.camp.hands,false);f.q('#u-field-hands').onclick();assert.equal(f.ground.camp.hands,true);
 f.q('#u-field-sky').onclick();assert.equal(f.ground.camp.night,true);assert.ok(f.ground.state.pitch>.5);
 f.q('[data-place="telescope"]').onclick();assert.equal(f.ground.handVisible,false);f.dialog.dispatchEvent({type:'keydown',code:'KeyF',target:f.stage});assert.equal(f.ground.camp.redLight,false);f.q('.u-scope').querySelector('[data-close]').onclick();assert.equal(f.ground.handVisible,true);
});
test('field notes require approaching each real world location and do not reset on menu close',()=>{
 const f=fixture();f.q('.u-camp-entry').onclick();f.q('.u-camp').dispatchEvent({type:'keydown',key:'Escape'});f.q('#u-field-notes').onclick();assert.equal(f.q('.u-field-journal').hidden,false);assert.equal(f.controller.blocking,true);f.q('.u-field-entries').querySelector('button').onclick();assert.equal(f.controller.blocking,false);f.controller.update();assert.match(f.q('.u-field-direction').textContent,/Overlook/);
 Object.assign(f.ground.state,{x:-21,z:-27});f.controller.update();assert.match(f.q('#u-field-notes').textContent,/1\/3/);assert.match(f.q('.u-field-entries').querySelector('p').textContent,/Overlook field note/);
 f.q('#u-field-notes').onclick();f.q('.u-field-journal').querySelector('[data-close]').onclick();f.controller.update();assert.match(f.q('#u-field-notes').textContent,/1\/3/);
 f.q('#u-field-notes').onclick();f.q('#u-field-return').onclick();f.controller.update();assert.match(f.q('.u-field-direction').textContent,/Base camp/);
});

test('binoculars magnify independently, stow on modal entry and leave no equipment state behind',()=>{
 const f=fixture();f.q('.u-camp-entry').onclick();f.q('.u-camp').dispatchEvent({type:'keydown',key:'Escape'});
 f.dialog.dispatchEvent({type:'keydown',code:'KeyB',target:f.stage});assert.equal(f.ground.camp.binoculars,true);assert.equal(f.q('.u-binocular-view').hidden,false);
 f.q('#u-field-light').onclick();assert.equal(f.ground.camp.binoculars,false);
 f.q('#u-field-binoculars').onclick();f.q('#u-field-notes').onclick();assert.equal(f.ground.camp.binoculars,false);assert.equal(f.q('.u-binocular-view').hidden,true);
 f.q('.u-field-journal').querySelector('[data-close]').onclick();f.q('#u-field-binoculars').onclick();f.setSurface(false);assert.equal(f.ground.camp.binoculars,false);
});
test('the wreck stays secret until walked to, and its beacon interaction restores control',()=>{
 const world={window:{},module:{exports:{}}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/desert-world.js'),'utf8'),world);
 const {TRAIL,ROUTES}=world.module.exports;let guided=null;
 const f=fixture(undefined,{trail:TRAIL,paths:ROUTES,routeTo(place){guided=place.id;return [{x:-7,z:-3},{x:place.x,z:place.z}];}});
 const cards=f.q('.u-field-entries').children,secret=cards.at(-1);assert.equal(secret.querySelector('h3').textContent,'Uncharted signal');assert.equal(secret.querySelector('button').disabled,true);assert.equal(f.q('.u-trail-pins').children.at(-1).hidden,true);assert.equal(f.q('.u-trail-map').querySelectorAll('circle').length,7);
 f.q('.u-camp-entry').onclick();f.q('.u-camp').dispatchEvent({type:'keydown',key:'Escape'});f.q('#u-field-notes').onclick();cards[5].querySelector('button').onclick();assert.equal(guided,'campus');f.controller.update();assert.match(f.q('.u-field-direction').textContent,/SpaceX launch campus/);
 f.q('.u-crash-interact').onclick();assert.equal(f.controller.blocking,false);
 Object.assign(f.ground.state,{x:58,z:-61});f.controller.update();f.controller.update();assert.equal(secret.querySelector('h3').textContent,'The silent visitor');assert.equal(secret.querySelector('button').disabled,false);assert.equal(f.q('.u-trail-map').querySelectorAll('circle').length,8);assert.equal(f.q('.u-crash-interact').hidden,false);
 f.dialog.dispatchEvent({type:'keydown',code:'KeyE',target:f.stage});assert.equal(f.controller.blocking,true);assert.equal(f.q('.u-crash-panel').hidden,false);assert.equal(f.stage.inert,true);
 f.q('#u-crash-wake').onclick();assert.equal(f.ground.camp.ufoAwake,true);assert.match(f.q('#u-crash-feedback').textContent,/FIND YOUR ORBIT/);f.q('#u-crash-wake').onclick();assert.equal(f.ground.camp.ufoAwake,false);
 f.q('#u-crash-leave').onclick();assert.equal(f.controller.blocking,false);assert.equal(f.stage.inert,false);assert.equal(f.document.activeElement,f.stage);
 f.q('.u-crash-interact').onclick();f.setSurface(false);assert.equal(f.controller.blocking,false);assert.equal(f.stage.inert,false);
});
test('stoking rekindles the fire and telescope includes all three solar-system observations',()=>{
 const f=fixture();f.q('.u-camp-entry').onclick();f.q('#u-camp-fire').onclick();f.q('#u-camp-stoke').onclick();assert.equal(f.ground.camp.fireOn,true);assert.equal(f.ground.camp.fireBoost,1);assert.equal(f.ground.state.seated,true);
 f.q('#u-camp-scope').onclick();const choices=f.q('.u-scope-targets').children;assert.equal(choices.length,6);
 for(const [i,id] of [[3,'PIA00405'],[4,'PIA22946'],[5,'PIA17172']]){choices[i].onclick();assert.ok(f.q('.u-scope-eye img').src.includes(id));assert.equal(f.q('.u-scope-eye img').style.objectFit,'contain');}
});
test('sound is opt-in, wind stays on without fire, footsteps require movement, and background/exit mute',async()=>{
 let sound;class Audio {constructor(){sound=this;this.levels=[];this.steps=0;this.suspended=0;}async resume(){this.resumed=true;}volume(v){this.vol=v;}level(...v){this.levels.push(v);}step(){this.steps++;}suspend(){this.suspended++;}}
 const f=fixture(Audio);assert.equal(sound,undefined);f.q('.u-camp-entry').onclick();await f.q('#u-camp-sound').onclick();assert.equal(sound.vol,.65);assert.equal(f.q('#u-field-sound').getAttribute('aria-pressed'),'true');
 f.q('#u-camp-fire').onclick();assert.equal(sound.levels.at(-1)[0],0);assert.ok(sound.levels.at(-1)[1]>0);
 f.q('.u-camp').dispatchEvent({type:'keydown',key:'Escape'});for(let i=0;i<10;i++){f.ground.state.distance+=.15;f.controller.update();}assert.equal(sound.steps,1);f.controller.update();assert.equal(sound.steps,1);
 f.q('.u-camp-entry').onclick();f.ground.state.distance+=.5;f.controller.update();assert.equal(sound.steps,1);
 f.document.hidden=true;f.document.dispatchEvent({type:'visibilitychange'});assert.equal(sound.suspended,1);f.controller.update();assert.deepEqual(sound.levels.at(-1),[0,0]);
 f.document.hidden=false;f.document.dispatchEvent({type:'visibilitychange'});await Promise.resolve();assert.ok(sound.resumed);
 f.setSurface(false);assert.ok(sound.suspended>=2);assert.equal(f.q('#u-field-sound').getAttribute('aria-pressed'),'false');
});

test('mission UI completes every objective, traps focus and preserves the camp modal contract',()=>{
 const f=fixture(undefined,{},true);f.q('.u-mission-summary').onclick();assert.equal(f.controller.blocking,true);assert.equal(f.q('.u-mission-panel').hidden,false);assert.equal(f.stage.inert,true);assert.equal(f.q('.u-adventure').inert,true);
 const action=()=>f.q('.u-mission-content').querySelector('button');action().onclick();assert.match(f.q('#u-mission-title').textContent,/Report/);
 const points=[[-102,-96],[-115,-83],[26,8],[26,8],[58,-61],[-102,-96]];
 for(let i=0;i<points.length;i++){f.q('.u-mission-panel').querySelector('[data-close]').onclick();Object.assign(f.ground.state,{x:points[i][0],z:points[i][1]});f.controller.update();f.q('.u-adventure-interact').onclick();if(i===3){const dials=f.q('.u-signal-dials').querySelectorAll('select');action().onclick();assert.match(f.q('.u-mission-feedback').textContent,/unstable/);dials.forEach((d,j)=>d.value=['3','1','2'][j]);}action().onclick();}
 assert.match(f.q('#u-mission-title').textContent,/Keep the light/);assert.equal(f.ground.camp.ufoAwake,true);assert.ok(f.q('.u-field-badge'));f.q('.u-mission-panel').querySelector('[data-close]').onclick();assert.equal(f.stage.inert,false);assert.equal(f.oldInert.inert,true);assert.equal(f.q('.u-adventure').inert,false);assert.equal(f.controller.blocking,false);
});

function flightFixture(reduced=false){
 const departed=[],f=fixture(undefined,undefined,true,{motion:()=>!reduced,depart:name=>departed.push(name)}),R=f.window.ParallaxRocket,g=f.ground;
 g.flight=R.create();g.boarding=R.BOARDING;g.boardRocket=()=>R.board(g.flight,g.state,g.driving);g.launchRocket=p=>R.launch(g.flight,p);g.flightTick=dt=>{const old=g.flight.mode,r=R.tick(g.flight,dt);if(old==='lift'&&g.flight.mode==='cabin')Object.assign(g.state,{x:-110,z:-121.7});return r;};g.exitRocket=()=>{R.exit(g.flight);Object.assign(g.state,{x:-105,z:-111});};
 f.q('.u-camp-entry').onclick();f.q('#u-camp-panel [data-close]').onclick();Object.assign(g.state,{x:-105,z:-113});f.controller.update();return {...f,departed};
}
test('boarding, flight-plan modal, countdown and planetary handoff work as one sequence',()=>{
 const f=flightFixture();assert.equal(f.q('.u-rocket-hud').hidden,false);f.dialog.dispatchEvent({type:'keydown',code:'KeyE',target:f.stage});assert.equal(f.ground.flight.mode,'lift');
 for(let i=0;i<51;i++)f.controller.tick(.1);f.controller.update();assert.equal(f.ground.flight.mode,'cabin');assert.equal(f.q('.u-field-tools').hidden,true);assert.equal(f.q('.u-adventure-hud')?.hidden??true,true);
 f.dialog.dispatchEvent({type:'keydown',code:'KeyE',target:f.stage});assert.equal(f.controller.blocking,true);assert.equal(f.stage.inert,true);assert.equal(f.q('.u-rocket-panel').hidden,false);
 f.q('#u-rocket-planet').value='Saturn';f.q('.u-rocket-launch').onclick();assert.equal(f.controller.blocking,false);assert.equal(f.stage.inert,false);assert.equal(f.ground.flight.mode,'launch');
 for(let i=0;i<112;i++)f.controller.tick(.1);assert.deepEqual(f.departed,['Saturn']);assert.equal(f.ground.flight.mode,'ground');f.controller.tick(.1);assert.equal(f.departed.length,1);
});
test('crew lift can be cancelled and reduced-motion flights still reach their destination',()=>{
 const f=flightFixture();f.q('.u-rocket-action').onclick();f.controller.tick(.1);f.q('.u-rocket-exit').onclick();assert.equal(f.ground.flight.mode,'ground');assert.equal(f.ground.state.z,-111);
 const r=flightFixture(true);r.q('.u-rocket-action').onclick();assert.equal(r.ground.flight.mode,'cabin');r.q('.u-rocket-action').onclick();r.q('#u-rocket-planet').value='Mars';r.q('.u-rocket-launch').onclick();r.controller.tick(.1);assert.deepEqual(r.departed,['Mars']);
});


test('First Contact controls complete puzzles and scans, restore campus power and retain the specimen',()=>{
 const f=fixture(undefined,{},'contact'),F=f.window.ParallaxFirstContact;
 const step=()=>JSON.parse(f.window.localStorage.getItem(F.KEY)||'{"step":0}').step;
 const action=label=>f.q('.u-mission-content').querySelectorAll('button').find(b=>b.textContent.startsWith(label));
 const close=()=>f.q('.u-mission-panel').querySelector('[data-close]').onclick();
 const approach=(x,z)=>{if(f.controller.blocking)close();Object.assign(f.ground.state,{x,z,yaw:0,pitch:0});f.controller.update();f.q('.u-mission-summary').onclick();};
 f.q('.u-mission-summary').onclick();action('Answer').onclick();assert.equal(step(),1);assert.equal(f.ground.camp.campusLights,false);
 approach(-88,-93);action('Collect').onclick();assert.equal(step(),2);
 approach(-85.2,-89);const cells=f.q('.fc-circuit').querySelectorAll('button');action('Restore').onclick();assert.match(f.q('.u-mission-feedback').textContent,/isolated/);
 F.INITIAL.forEach((n,i)=>{for(let j=0;j<(4-n)%4;j++)cells[i].onclick();});action('Restore').onclick();assert.equal(step(),3);
 approach(27,20);action('Equip scanner & begin').onclick();assert.equal(f.controller.blocking,false);assert.equal(f.ground.camp.scanner,true);
 for(let i=0;i<15;i++)f.controller.tick(.1);f.document.hidden=true;for(let i=0;i<35;i++)f.controller.tick(.1);assert.equal(step(),3);f.document.hidden=false;
 f.q('.fc-scan-button').onclick();for(let i=0;i<32;i++)f.controller.tick(.1);assert.equal(step(),4);
 Object.assign(f.ground.state,{x:58,z:-57,yaw:Math.PI});f.q('.fc-scan-button').onclick();for(let i=0;i<35;i++)f.controller.tick(.1);assert.equal(step(),4);f.ground.state.yaw=0;for(let i=0;i<32;i++)f.controller.tick(.1);assert.equal(step(),5);
 approach(58,-61);const phase=f.q('.fc-phase-rack').querySelectorAll('button');[2,4,1].forEach((n,i)=>{for(let j=0;j<n;j++)phase[i].onclick();});action('Open the archive').onclick();assert.equal(step(),6);assert.equal(f.controller.blocking,false);assert.equal(f.ground.camp.ufoAwake,true);assert.equal(f.q('.fc-reveal').hidden,false);f.q('.fc-reveal button').onclick();
 approach(-90,-90);action('Place the fragment').onclick();assert.equal(step(),7);assert.equal(f.ground.camp.artifactInstalled,true);assert.equal(f.ground.camp.campusLights,true);
 approach(-88,-93);action('Transmit a welcome').onclick();assert.equal(step(),8);assert.match(f.q('.u-field-badge').textContent,/AMBASSADOR/);
 close();f.controller.close();assert.equal(f.q('.fc-reveal').hidden,true);assert.equal(f.stage.inert,false);assert.equal(f.oldInert.inert,true);
});

test('new moon and dwarf-planet flights depart exactly once in normal and reduced-motion modes',()=>{
 for(const reduced of [false,true])for(const name of ['Moon','Europa','Pluto']){const f=flightFixture(reduced);f.q('.u-rocket-action').onclick();for(let i=0;i<51;i++)f.controller.tick(.1);assert.equal(f.ground.flight.mode,'cabin');f.q('.u-rocket-action').onclick();f.q('#u-rocket-planet').value=name;f.q('.u-rocket-launch').onclick();for(let i=0;i<114;i++)f.controller.tick(.1);assert.deepEqual(f.departed,[name]);assert.equal(f.ground.flight.mode,'ground');assert.equal(f.stage.inert,false);}
});
