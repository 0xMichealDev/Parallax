/* Mission log, nearby crew/vehicle interactions, and accessible touch controls. */
(() => {
  'use strict';
  function create({root,getGround,isWalking,enterWalk,openPanel,closePanel,guide,announce,stage,draw,freeze,clearGuide}){
    let storage;try{storage=window.localStorage;}catch{}
    const story=window.ParallaxStory.create(storage),hud=document.createElement('div');hud.className='u-adventure';
    hud.innerHTML='<button class="u-mission-summary" aria-haspopup="dialog"><small>NIGHT SHIFT / STORY · J</small><strong>The Quiet Signal</strong><span>Answer the field radio ↗</span></button><div class="u-drive-readout" hidden><strong>ROVER 01</strong><span>0 KM/H</span><small>W/S drive · A/D steer · Space brake<br>Touch: hold arrows to drive &amp; steer</small><button class="u-drive-brake">Brake</button></div><button class="u-adventure-interact" hidden></button><div class="u-objective-pin" aria-hidden="true" hidden>◇</div>';
    const panel=document.createElement('section');panel.className='u-camp-menu u-mission-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','u-mission-title');root.append(hud,panel);
    const q=s=>hud.querySelector(s),summary=q('.u-mission-summary'),prompt=q('.u-adventure-interact'),driveHUD=q('.u-drive-readout');let context=null,view='log',feedback='',rendered=-1;
    const distance=p=>{const g=getGround();return Math.hypot(g.state.x-p.x,g.state.z-p.z);};
    function nearby(){const g=getGround();if(!isWalking()||!g?.ready)return null;if(g.driving)return {kind:'exit',label:'Park & exit rover · E'};
      const objective=story.objective;if(objective&&distance(objective)<=3.4)return {kind:'mission',label:objective.action+' · E'};
      const rover=g.nearestRover?.();if(rover&&rover.d<4.5)return {kind:'rover',id:rover.v.id,label:'Drive '+rover.v.name+' · E'};
      const crew=g.life?.crew.map(p=>({p,d:distance(p)})).sort((a,b)=>a.d-b.d)[0];if(crew&&crew.d<2.8)return {kind:'crew',person:crew.p,label:'Talk to '+crew.p.name+' · E'};return null;
    }
    function shell(kicker,title,text){panel.innerHTML='<button class="u-camp-close" data-close aria-label="Close mission log">✕</button><span class="u-camp-kicker"></span><h2 id="u-mission-title"></h2><p class="u-mission-copy"></p><div class="u-mission-content"></div><p class="u-mission-feedback" role="status" aria-live="polite"></p><small class="u-mission-storage"></small>';panel.querySelector('[data-close]').onclick=()=>closePanel();panel.querySelector('.u-camp-kicker').textContent=kicker;panel.querySelector('h2').textContent=title;panel.querySelector('.u-mission-copy').textContent=text;panel.querySelector('.u-mission-feedback').textContent=feedback;panel.querySelector('.u-mission-storage').textContent=story.saved?'Story progress saved on this browser.':'Progress stays in this visit; browser storage is unavailable.';return panel.querySelector('.u-mission-content');}
    function button(host,text,action,primary=false){const b=document.createElement('button');b.textContent=text;if(primary)b.className='u-camp-primary';b.onclick=action;host.append(b);return b;}
    function advance(code){const g=getGround(),step=story.step,result=story.act(step,{...g.state,driving:!!g.driving},code);feedback=result.message;if(!result.ok){panel.querySelector('.u-mission-feedback').textContent=feedback;return;}
      clearGuide?.();if(step===5)g.setCamp({ufoAwake:true});announce(result.message);showLog();draw();
    }
    function showLog(){view='log';rendered=story.step;const objective=story.objective,done=story.complete;
      const content=shell(done?'EXPEDITION COMPLETE / 07 OF 07':'THE QUIET SIGNAL / '+String(story.step+1).padStart(2,'0')+' OF 07',done?'Keep the light burning.':objective.title,done?'The relay is repaired. The flight log is safe. You earned the Pathfinder field badge. Keep exploring, talk to the night crew, or take either rover out beneath the stars.':objective.text);
      const inventory=document.createElement('p');inventory.className='u-mission-inventory';inventory.textContent='PACK / '+story.inventory;content.append(inventory);
      if(done){const badge=document.createElement('div');badge.className='u-field-badge';badge.textContent='◇  PATHFINDER / NIGHT SHIFT 01';content.append(badge);}else{
        const near=distance(objective)<=3.4&&!getGround().driving;
        if(near&&story.step===4){const dials=document.createElement('div');dials.className='u-signal-dials';const controls=[];for(const name of ['A','B','C']){const label=document.createElement('label');label.textContent='CHANNEL '+name;const select=document.createElement('select');select.setAttribute('aria-label','Receiver channel '+name);for(const n of [1,2,3]){const o=document.createElement('option');o.value=String(n);o.textContent=String(n);select.append(o);}select.value='1';controls.push(select);label.append(select);dials.append(label);}content.append(dials);button(content,'Lock receiver signal ↗',()=>advance(controls.map(s=>s.value).join('')),true);}
        else if(near)button(content,objective.action+' ↗',()=>advance(),true);
        else{const hint=document.createElement('p');hint.textContent=(getGround().driving?'Park and exit at the marker. ':'')+Math.round(distance(objective))+' m to '+objective.name;content.append(hint);}
        button(content,'Guide me to the objective',()=>guide({...objective,id:'story-'+story.step}),!near);
      }
      const history=document.createElement('ol');history.className='u-mission-checklist';window.ParallaxStory.STEPS.forEach((step,i)=>{const li=document.createElement('li');li.textContent=(i<story.step?'✓ ':i===story.step?'◇ ':'· ')+(i<=story.step||done?step.title:'Unrevealed objective');if(i===story.step)li.setAttribute('aria-current','step');history.append(li);});content.append(history);
      button(content,'Recover rovers at base camp',()=>{getGround().recallRovers?.();closePanel(false);stage.focus();announce('Both rovers returned to their parking spots. You are back at camp; mission progress is kept.');draw();});
      if(done)button(content,'Play this story again',()=>{story.reset();feedback='New night shift started.';showLog();});openPanel(panel);
    }
    function crewDialog(person){view='crew';const lines={Mara:'The campus is on a night shift. Open your mission log when you are ready to help with the relay. The rockets are staying on their pads tonight.',Ellis:'See the seams, service lines and engine bells? Every part has a job. Tonight mine is checking the pad hardware—and getting that relay back.',Jun:'Integration is patient work: inspect, document, check again. I am comparing the hangar equipment with the shift checklist.',Inez:'I follow the pipe runs before every rehearsal. If a system needs attention, we stop and fix it. No shortcuts.',Noah:'Beyond these work lights, the sky gets wonderfully dark. Bring the telescope into focus when your shift is done.',Rae:'Both field rovers are yours to explore with. W and S drive, A and D steer. Park with E before stepping out. You can recover them from the mission log.'};const c=shell(person.role.toUpperCase()+' / NIGHT CREW',person.name,lines[person.name]||'A quiet night under an extraordinary sky.');button(c,'Open mission log',showLog,true);openPanel(panel);}
    function interact(){context=nearby();if(!context)return false;const g=getGround();if(context.kind==='exit'){g.brake();if(!g.exitRover())announce('The doors are blocked. Move to an open spot, then exit.');else announce('Rover parked. Back on foot.');stage.focus();draw();return true;}
      if(context.kind==='rover'){if(g.enterRover(context.id)){announce('Rover ready. W/S drive · A/D steer · Space brake · E exit.');stage.focus();draw();}return true;}
      feedback='';if(context.kind==='crew')crewDialog(context.person);else showLog();return true;
    }
    summary.onclick=()=>{enterWalk();feedback='';showLog();};prompt.onclick=interact;q('.u-drive-brake').onclick=()=>{freeze();getGround().brake();stage.focus();draw();};
    function update({visible,blocking}){const g=getGround();hud.hidden=!visible||!isWalking();if(hud.hidden)return;hud.inert=blocking;summary.hidden=blocking;prompt.hidden=blocking;const o=story.objective;
      summary.querySelector('strong').textContent=story.complete?'Pathfinder · shift complete':o.title;summary.querySelector('span').textContent=story.complete?'Open field log ↗':String(story.step+1).padStart(2,'0')+'/07 · '+Math.round(distance(o))+' m · '+o.name;
      driveHUD.hidden=!g.driving||blocking;if(g.driving){driveHUD.querySelector('strong').textContent='ROVER '+g.driving;driveHUD.querySelector('span').textContent=Math.round(Math.abs(g.speed)*3.6)+' KM/H'+(g.speed<-.1?' · REVERSE':'');}
      context=nearby();prompt.hidden=blocking||!context;if(context)prompt.textContent=context.label;
      const pin=q('.u-objective-pin');pin.hidden=true;if(o&&!blocking){const p=g.project([o.x,g.terrainHeight(o.x,o.z)+2.5,o.z]);if(p.depth>.5&&p.x>40&&p.x<innerWidth-40&&p.y>160&&p.y<innerHeight-230){pin.hidden=false;pin.style.left=p.x+'px';pin.style.top=p.y+'px';pin.textContent='◇ '+Math.round(distance(o))+' m';}}
      if(!panel.hidden&&view==='log'&&rendered!==story.step)showLog();
    }
    return {panel,hud,story,interact,update,open:showLog};
  }
  window.ParallaxAdventure={create};
})();
