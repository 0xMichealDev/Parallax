/* Earthbound camp controls. Visual state stays local; sound is always opt-in. */
(() => {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  class CampSound {
    constructor(){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw Error('Audio unavailable');
      this.ctx=new AC();this.gain=this.ctx.createGain();this.gain.gain.value=0;this.gain.connect(this.ctx.destination);
      const rate=this.ctx.sampleRate,buffer=this.ctx.createBuffer(1,rate*7,rate),data=buffer.getChannelData(0);let low=0,pop=0;
      for(let i=0;i<data.length;i++){low=(low+(Math.random()*2-1)*.018)/1.018;if(Math.random()<.00012)pop=.25+Math.random()*.5;pop*=.992;data[i]=low*1.5+pop*(Math.random()*2-1);}
      const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter();source.buffer=buffer;source.loop=true;filter.type='lowpass';filter.frequency.value=3800;source.connect(filter);filter.connect(this.gain);source.start();this.source=source;
    }
    async resume(){await this.ctx.resume();}
    level(value){this.gain.gain.setTargetAtTime(value,this.ctx.currentTime,.18);}
    suspend(){this.level(0);this.ctx.suspend().catch(()=>{});}
  }
  function create({dialog,stage,getGround,isSurface,isWalking,enterWalk,freeze,draw,status,targets,motion=()=>true,toggleMotion=()=>{}}){
    const root=document.createElement('div');root.className='u-camp';root.hidden=true;
    root.innerHTML=`<button class="u-camp-entry" aria-haspopup="dialog">⌂ Stargazing camp <span>TELESCOPE · FIRE · FIELD NOTES</span></button>
      <div class="u-field-tools" role="group" aria-label="Walking equipment"><button id="u-field-light" aria-pressed="true">Light: white · F</button><button id="u-field-hands" aria-pressed="true">Stow torch · Q</button><button id="u-field-sky">Look at Milky Way ↗</button><button id="u-field-notes" aria-haspopup="dialog">Field notes · 0/3</button></div>
      <div class="u-trail-pins" aria-label="Walking discoveries"></div><div class="u-satellite-guide" aria-hidden="true" hidden>SATELLITE PASS <small>SIMULATED</small></div>
      <p class="u-field-direction" hidden></p><p class="u-field-toast" role="status" aria-live="polite"></p>
      <section class="u-camp-menu u-field-journal" role="dialog" aria-modal="true" aria-labelledby="u-field-title" hidden><button class="u-camp-close" data-close aria-label="Close field notes">✕</button><span class="u-camp-kicker">PARALLAX / DESERT FIELD NOTES</span><h2 id="u-field-title">A little farther out.</h2><p>Follow a trail marker and approach within 3 meters to record a discovery. Your notes stay with you during this visit.</p><div class="u-field-entries"></div><p class="u-field-progress" role="status"></p><button id="u-field-return">Guide me back to camp</button><p class="u-field-sky-note">The sky and satellite passes are an artistic simulation. They do not show live positions or a location-specific star chart.</p></section>
      <div class="u-camp-pins" aria-label="Campsite interactions"><button data-place="tent">Canvas tent <small>OPEN CAMP</small></button><button data-place="fire">Campfire <small>SIT &amp; UNWIND</small></button><button data-place="telescope">Telescope <small>LOOK THROUGH ↗</small></button></div>
      <section class="u-camp-menu" role="dialog" aria-modal="true" aria-labelledby="u-camp-title" hidden>
        <button class="u-camp-close" data-close aria-label="Close camp controls">✕</button><span class="u-camp-kicker">EARTHBOUND / BASE CAMP</span><h2 id="u-camp-title">Stay a little longer.</h2><p>A warm fire. An open sky. A universe waiting just beyond the eyepiece.</p>
        <button class="u-camp-primary" id="u-camp-scope">Look through telescope <span>↗</span></button>
        <div class="u-camp-options"><button id="u-camp-sit">Sit by the fire</button><button id="u-camp-fire" aria-pressed="true">Extinguish fire</button><button id="u-camp-tent" aria-pressed="true">Close tent</button><button id="u-camp-lantern" aria-pressed="true">Turn lantern off</button><button id="u-camp-sound" aria-pressed="false">Crackling sound · off</button><button id="u-camp-night" aria-pressed="false">Switch to night sky</button><button id="u-camp-satellites" aria-pressed="true">Satellite guide · on</button><button id="u-camp-motion" aria-pressed="true">Pause sky &amp; fire</button><button id="u-camp-return">Return to camp</button></div>
        <p id="u-camp-feedback" role="status" aria-live="polite">Sound is optional. Your campsite settings stay in this visit.</p><small class="u-camp-footnote">WASD to walk · drag to look · E to interact nearby</small>
      </section>
      <section class="u-scope" role="dialog" aria-modal="true" aria-labelledby="u-scope-title" hidden>
        <header><div><span class="u-camp-kicker">PARALLAX / DEEP SKY OBSERVING</span><h2 id="u-scope-title">Through the eyepiece.</h2></div><button data-close>Back to camp ✕</button></header>
        <div class="u-scope-layout"><div class="u-scope-optics"><div class="u-scope-eye" tabindex="0" role="application" aria-label="Telescope image. Drag or use arrow keys to pan; plus and minus to zoom."><img alt="" draggable="false"><i class="u-scope-reticle" aria-hidden="true"></i><span class="u-scope-readout" aria-hidden="true">1.0× / FOCUS 50</span></div><p>DRAG TO EXPLORE · SCROLL TO ZOOM</p></div>
        <aside class="u-scope-controls"><span class="u-camp-kicker">CHOOSE AN OBSERVATION</span><div class="u-scope-targets" role="group" aria-label="Telescope targets"></div><p id="u-scope-description"></p>
        <label for="u-scope-zoom">Image zoom <output id="u-scope-zoom-value">1.0×</output></label><input id="u-scope-zoom" type="range" min="1" max="4" step="0.1" value="1">
        <label for="u-scope-focus">Focus <output id="u-scope-focus-value">Sharp</output></label><input id="u-scope-focus" type="range" min="0" max="100" value="50">
        <button id="u-scope-reset">Center &amp; refocus</button><p id="u-scope-status" role="status" aria-live="polite"></p><small id="u-scope-credit"></small><small class="u-scope-note">Space-telescope imagery with enhanced or composite colors. An immersive simulation, not a live backyard view.</small></aside></div>
      </section>`;
    dialog.append(root);const q=s=>root.querySelector(s),menu=q('.u-camp-menu'),scope=q('.u-scope'),pins=q('.u-camp-pins'),entry=q('.u-camp-entry'),eye=q('.u-scope-eye'),picture=q('.u-scope-eye img'),journal=q('.u-field-journal'),fieldTools=q('.u-field-tools'),trailPins=q('.u-trail-pins');
    let panel=null,returnFocus=null,inertSaved=[],audio=null,soundOn=false,soundPending=false,visible=false,scopeIndex=0,scale=1,focus=50,panX=0,panY=0,drag=null;
    const found=new Set();let trailBuilt=false,guideTarget=null,guideOn=true,toastTimer=null,fieldSignature='';
    const trailButtons=new Map(),noteButtons=new Map();
    function fieldLabels(){const g=getGround();if(!g)return;const signature=[g.camp.flashlightOn,g.camp.redLight,g.camp.hands,found.size].join(':');if(signature===fieldSignature)return;fieldSignature=signature;q('#u-field-light').textContent='Light: '+(!g.camp.flashlightOn?'off':g.camp.redLight?'red':'white')+' · F';q('#u-field-light').setAttribute('aria-pressed',String(g.camp.flashlightOn));q('#u-field-hands').textContent=g.camp.hands?'Stow torch · Q':'Equip torch · Q';q('#u-field-hands').setAttribute('aria-pressed',String(g.camp.hands));q('#u-field-notes').textContent='Field notes · '+found.size+'/'+(g.trail?.length||3);}
    function announce(message){q('.u-field-toast').textContent=message;clearTimeout(toastTimer);toastTimer=setTimeout(()=>q('.u-field-toast').textContent='',5500);}
    function setGuide(place){guideTarget=place;closePanel(false);stage.focus();announce('Follow the bearing to '+place.name+'.');draw();}
    function buildTrail(){const g=getGround();if(trailBuilt||!g?.trail)return;trailBuilt=true;for(const place of g.trail){
      const pin=document.createElement('button');pin.textContent=place.name;pin.onclick=()=>setGuide(place);trailPins.append(pin);trailButtons.set(place.id,pin);
      const card=document.createElement('article'),title=document.createElement('h3'),note=document.createElement('p'),button=document.createElement('button');title.textContent=place.name;note.textContent='Not yet discovered. Follow its marker to record a field note.';button.textContent='Follow trail ↗';button.onclick=()=>setGuide(place);card.append(title,note,button);q('.u-field-entries').append(card);noteButtons.set(place.id,{note,button});
    }}
    function updateTrail(){const g=getGround();if(!g?.trail)return;const s=g.state;for(const place of g.trail){const distance=Math.hypot(place.x-s.x,place.z-s.z);if(distance<3&&!found.has(place.id)){found.add(place.id);const card=noteButtons.get(place.id);card.note.textContent=place.note;card.button.textContent='Revisit ↗';announce('Discovered: '+place.name+' · '+found.size+'/'+g.trail.length+' field notes');if(guideTarget?.id===place.id)guideTarget=null;fieldLabels();}
      const pin=trailButtons.get(place.id),p=g.project([place.x,g.terrainHeight(place.x,place.z)+1.1,place.z]);pin.hidden=!!panel||!isWalking()||p.depth<.5||distance>65||p.x<90||p.x>innerWidth-90||p.y<265||p.y>innerHeight-165;
      if(!pin.hidden){pin.style.left=p.x+'px';pin.style.top=p.y+'px';pin.textContent=(found.has(place.id)?'✓ ':'')+place.name+' · '+Math.round(distance)+' m';}
    }
    const progress=found.size+' of '+g.trail.length+' places discovered.';if(q('.u-field-progress').textContent!==progress)q('.u-field-progress').textContent=progress;
    if(guideTarget?.id==='camp'&&Math.hypot(s.x-guideTarget.x,s.z-guideTarget.z)<3){guideTarget=null;announce('Back at base camp.');}
    const direction=q('.u-field-direction');direction.hidden=!guideTarget||!!panel||!isWalking();if(guideTarget){const dx=guideTarget.x-s.x,dz=guideTarget.z-s.z,bearing=(Math.atan2(dx,-dz)*180/Math.PI+360)%360;direction.textContent=guideTarget.name+' · '+Math.round(Math.hypot(dx,dz))+' m · '+String(Math.round(bearing)).padStart(3,'0')+'°';}
    }
    function cycleLight(){const g=getGround();if(!g?.ready)return;const c=g.camp;if(!c.flashlightOn)g.setCamp({hands:true,flashlightOn:true,redLight:false});else if(!c.redLight)g.setCamp({hands:true,redLight:true});else g.setCamp({flashlightOn:false});fieldLabels();}
    q('#u-field-light').onclick=cycleLight;
    function toggleHands(){const g=getGround();g.setCamp({hands:!g.camp.hands});fieldLabels();}
    q('#u-field-hands').onclick=toggleHands;
    q('#u-field-sky').onclick=()=>{freeze();getGround().watchSky();draw();announce('Look up: the Milky Way above camp. Small steady lights are simulated satellites.');};
    q('#u-field-notes').onclick=()=>{buildTrail();openPanel(journal);};
    q('#u-field-return').onclick=()=>setGuide({id:'camp',name:'Base camp',x:0,z:-3});
    q('#u-camp-satellites').onclick=()=>{guideOn=!guideOn;q('#u-camp-satellites').textContent='Satellite guide · '+(guideOn?'on':'off');q('#u-camp-satellites').setAttribute('aria-pressed',String(guideOn));};
    q('#u-camp-motion').onclick=()=>{toggleMotion();labels();};
    const pinButtons=[...pins.querySelectorAll('button')];
    function feedback(text){q('#u-camp-feedback').textContent=text;}
    function labels(){const g=getGround();if(!g)return;const c=g.camp;
      q('#u-camp-fire').textContent=c.fireOn?'Extinguish fire':'Light campfire';q('#u-camp-fire').setAttribute('aria-pressed',String(c.fireOn));
      q('#u-camp-tent').textContent=c.tentOpen?'Close tent':'Open tent';q('#u-camp-tent').setAttribute('aria-pressed',String(c.tentOpen));
      q('#u-camp-lantern').textContent=c.lanternOn?'Turn lantern off':'Turn lantern on';q('#u-camp-lantern').setAttribute('aria-pressed',String(c.lanternOn));
      q('#u-camp-night').textContent=c.night?'Return to twilight':'Switch to night sky';q('#u-camp-night').setAttribute('aria-pressed',String(c.night));
      q('#u-camp-motion').textContent=motion()?'Pause sky & fire':'Resume sky & fire';q('#u-camp-motion').setAttribute('aria-pressed',String(motion()));fieldLabels();
      q('#u-camp-sit').textContent=g.state.seated?'Stand up':'Sit by the fire';q('#u-camp-sound').textContent='Crackling sound · '+(soundOn?'on':'off');q('#u-camp-sound').setAttribute('aria-pressed',String(soundOn));
    }
    function audioLevel(){if(!audio)return;const g=getGround(),distance=g?Math.hypot(g.state.x,g.state.z+8):100;audio.level(visible&&!document.hidden&&soundOn&&g?.camp.fireOn?Math.max(0,.42*(1-distance/24)):0);}
    function openPanel(next){
      freeze();if(!panel){returnFocus=document.activeElement;inertSaved=[...dialog.children].filter(el=>el!==root).map(el=>[el,el.inert]);inertSaved.forEach(([el])=>el.inert=true);}
      panel=next;for(const item of [menu,scope,journal])item.hidden=next!==item;entry.inert=pins.inert=fieldTools.inert=trailPins.inert=true;getGround()?.setHandVisible?.(next!==scope);dialog.classList.add('u-camp-modal');labels();
      next.querySelector('[data-close]').focus();
    }
    function closePanel(restore=true){if(!panel)return;panel=null;menu.hidden=scope.hidden=journal.hidden=true;entry.inert=pins.inert=fieldTools.inert=trailPins.inert=false;getGround()?.setHandVisible?.(true);inertSaved.forEach(([el,value])=>el.inert=value);inertSaved=[];dialog.classList.remove('u-camp-modal');drag=null;freeze();if(restore)(returnFocus?.isConnected&&!returnFocus.hidden?returnFocus:stage).focus();}
    function visit(place){const g=getGround();if(!g?.ready)return;enterWalk();freeze();g.visit(place);draw();labels();}
    function openScope(){visit('telescope');openPanel(scope);selectTarget(scopeIndex);}
    entry.onclick=()=>{enterWalk();if(Math.hypot(getGround().state.x,getGround().state.z+8)>20)visit('camp');openPanel(menu);};
    pinButtons.forEach(button=>button.onclick=()=>{const place=button.dataset.place;if(place==='telescope')openScope();else{visit(place);openPanel(menu);feedback(place==='fire'?'Take a seat. The fire is yours to tend.':'Canvas, warm lantern light, and shelter beneath the stars.');}});
    root.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>closePanel());
    q('#u-camp-scope').onclick=openScope;
    q('#u-camp-sit').onclick=()=>{const g=getGround();if(g.state.seated){g.state.seated=false;draw();}else visit('fire');closePanel(false);stage.focus();status(g.state.seated?'Seated by the campfire. Walk in any direction to stand up.':'Standing at the campsite.');};
    q('#u-camp-return').onclick=()=>{visit('camp');closePanel(false);stage.focus();};
    for(const [selector,key,on,off] of [['fire','fireOn','The campfire is burning.','The fire is out. Embers have cooled.'],['tent','tentOpen','The tent is open.','The tent is closed.'],['lantern','lanternOn','The lantern is glowing.','The lantern is off.'],['night','night','The stars are out. Look up to explore the night sky.','Twilight has returned to the valley.']]){
      q('#u-camp-'+selector).onclick=()=>{const g=getGround();g.setCamp({[key]:!g.camp[key]});labels();audioLevel();feedback(g.camp[key]?on:off);};
    }
    q('#u-camp-sound').onclick=async()=>{if(soundPending)return;soundPending=true;try{audio??=new CampSound();if(!soundOn)await audio.resume();if(!visible||document.hidden){audio.suspend();return;}soundOn=!soundOn;labels();audioLevel();feedback(soundOn?'Crackling follows your distance from the fire.':'Crackling sound is off.');}catch{feedback('Sound is unavailable in this browser. The campsite is still interactive.');}finally{soundPending=false;}};
    function updateOptics(){
      const limitX=eye.clientWidth*(scale-1)/2,limitY=eye.clientHeight*(scale-1)/2;panX=clamp(panX,-limitX,limitX);panY=clamp(panY,-limitY,limitY);
      picture.style.transform=`translate(${panX}px,${panY}px) scale(${scale})`;picture.style.filter=`blur(${Math.abs(focus-50)*.13}px)`;
      q('#u-scope-zoom').value=scale;q('#u-scope-focus').value=focus;q('#u-scope-zoom-value').textContent=scale.toFixed(1)+'×';q('#u-scope-focus-value').textContent=Math.abs(focus-50)<5?'Sharp':'Adjust to sharpen';q('.u-scope-readout').textContent=scale.toFixed(1)+'× / FOCUS '+focus;
    }
    function selectTarget(i){scopeIndex=i;const target=targets[i];scale=1;focus=50;panX=panY=0;picture.hidden=true;q('#u-scope-status').textContent='Loading '+target.name+'…';q('#u-scope-description').textContent=target.description;q('#u-scope-credit').textContent=target.credit;picture.alt=target.description;picture.src='/assets/gallery/'+target.image+'.jpg';q('.u-scope-targets').querySelectorAll('button').forEach((b,j)=>b.setAttribute('aria-pressed',String(i===j)));updateOptics();}
    targets.forEach((target,i)=>{const b=document.createElement('button');b.textContent=target.name;b.setAttribute('aria-pressed',String(i===0));b.onclick=()=>selectTarget(i);q('.u-scope-targets').append(b);});
    picture.onload=()=>{picture.hidden=false;q('#u-scope-status').textContent=targets[scopeIndex].name+' is ready. Adjust the focus or zoom in.';};
    picture.onerror=()=>{picture.hidden=true;q('#u-scope-status').textContent='This image could not load. Select it to retry, or choose another observation.';};
    q('#u-scope-zoom').oninput=e=>{scale=+e.target.value;updateOptics();};q('#u-scope-focus').oninput=e=>{focus=+e.target.value;updateOptics();};q('#u-scope-reset').onclick=()=>{scale=1;focus=50;panX=panY=0;updateOptics();};
    eye.onpointerdown=e=>{eye.focus();drag={x:e.clientX,y:e.clientY,id:e.pointerId};eye.setPointerCapture(e.pointerId);};
    eye.onpointermove=e=>{if(!drag||drag.id!==e.pointerId)return;panX+=e.clientX-drag.x;panY+=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY,id:e.pointerId};updateOptics();};
    eye.onpointerup=eye.onpointercancel=eye.onlostpointercapture=()=>{drag=null;};
    eye.addEventListener('wheel',e=>{e.preventDefault();scale=clamp(scale-e.deltaY*.002,1,4);updateOptics();},{passive:false});
    eye.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(e.key==='ArrowLeft')panX+=25;if(e.key==='ArrowRight')panX-=25;if(e.key==='ArrowUp')panY+=25;if(e.key==='ArrowDown')panY-=25;if(e.key==='+'||e.key==='=')scale=clamp(scale+.1,1,4);if(e.key==='-')scale=clamp(scale-.1,1,4);updateOptics();};
    root.addEventListener('keydown',e=>{if(!panel)return;if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closePanel();return;}if(e.key==='Tab'){const items=[...panel.querySelectorAll('button,input,[tabindex="0"]')].filter(el=>!el.disabled&&!el.hidden);const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}e.stopPropagation();});
    dialog.addEventListener('keydown',e=>{if(panel||!visible||!isWalking()||e.repeat||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(e.code==='KeyF'){e.preventDefault();cycleLight();}if(e.code==='KeyQ'){e.preventDefault();toggleHands();}});
    dialog.addEventListener('cancel',e=>{if(panel){e.preventDefault();closePanel();}});
    dialog.addEventListener('keydown',e=>{if(panel||!visible||e.code!=='KeyE'||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;const g=getGround();const nearest=Object.entries(g.points).map(([name,p])=>({name,distance:Math.hypot(p[0]-g.state.x,p[2]-g.state.z)})).sort((a,b)=>a.distance-b.distance)[0];if(nearest.distance>5){status('Walk closer to the tent, campfire, or telescope to interact.');return;}e.preventDefault();if(nearest.name==='telescope')openScope();else{visit(nearest.name);openPanel(menu);}});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)audio?.suspend();else if(visible&&soundOn)audio?.resume().then(audioLevel).catch(()=>{});});
    function update(){
      const g=getGround(),next=!!(dialog.open&&isSurface()&&g?.ready);if(next!==visible){visible=next;root.hidden=!visible;if(!visible){closePanel(false);soundOn=false;audio?.suspend();labels();}}
      if(!visible)return;buildTrail();fieldTools.hidden=!isWalking()||!!panel;trailPins.hidden=!isWalking()||!!panel;updateTrail();fieldLabels();
      const satGuide=q('.u-satellite-guide');satGuide.hidden=true;if(guideOn&&isWalking()&&!panel&&g.camp.satellitesOn){const projected=(g.satellitePoints?.()||[]).map(p=>g.project(p)).find(p=>p.depth>0&&p.x>100&&p.x<innerWidth-150&&p.y>70&&p.y<innerHeight*.56);if(projected){satGuide.hidden=false;satGuide.style.left=projected.x+'px';satGuide.style.top=projected.y+'px';}}
      pins.hidden=!isWalking()||!!panel||dialog.classList.contains('u-cinema');
      if(!pins.hidden)pinButtons.forEach(b=>{const base=g.points[b.dataset.place],p=g.project([base[0],base[1]+(b.dataset.place==='fire'?1.05:2.35),base[2]]);b.hidden=p.depth<.5||p.distance>22||p.x<70||p.x>innerWidth-70||p.y<185||p.y>innerHeight-170;if(!b.hidden){b.style.left=p.x+'px';b.style.top=p.y+'px';}});
      audioLevel();
    }
    return {update,close(){clearTimeout(toastTimer);q('.u-field-toast').textContent='';closePanel(false);visible=false;root.hidden=true;soundOn=false;audio?.suspend();},get observing(){return panel===scope;},get blocking(){return !!panel;}};
  }
  window.ParallaxCamp={create};
})();
