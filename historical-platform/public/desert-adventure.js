/* Mission log, nearby crew/vehicle interactions, and accessible touch controls. */
(() => {
  'use strict';
  function create({root,getGround,isWalking,enterWalk,openPanel,closePanel,guide,announce,stage,draw,freeze,clearGuide,ping}){
    let storage;try{storage=window.localStorage;}catch{}
    const FC=window.ParallaxFirstContact,story=(FC||window.ParallaxStory).create(storage),hud=document.createElement('div');hud.className='u-adventure';
    hud.innerHTML='<button class="u-mission-summary" aria-haspopup="dialog"><small>NIGHT SHIFT / STORY · J</small><strong>The Quiet Signal</strong><span>Answer the field radio ↗</span></button><div class="u-drive-readout" hidden><strong>ROVER 01</strong><span>0 KM/H</span><small>W/S drive · A/D steer · Space brake<br>Touch: hold arrows to drive &amp; steer</small><button class="u-drive-brake">Brake</button></div><button class="u-adventure-interact" hidden></button><div class="u-objective-pin" aria-hidden="true" hidden>◇</div>';
    const panel=document.createElement('section');panel.className='u-camp-menu u-mission-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','u-mission-title');root.append(hud,panel);
    const q=s=>hud.querySelector(s),summary=q('.u-mission-summary'),prompt=q('.u-adventure-interact'),driveHUD=q('.u-drive-readout');let context=null,view='log',feedback='',rendered=-1;
    let scanning=false,scanTime=0,beepTime=0,revealTime=0;
    const scanner=document.createElement('section'),tool=document.createElement('button'),reveal=document.createElement('div');
    scanner.className='fc-scanner';scanner.hidden=true;scanner.setAttribute('aria-label','Field scanner');scanner.innerHTML='<span class="fc-scanner-label">PARALLAX / FIELD RECEIVER</span><strong>STANDBY</strong><span class="fc-bearing"></span><progress max="1" value="0" aria-label="Signal strength or scan progress"></progress><span class="fc-scan-status"></span><button class="fc-scan-button">Scan · E</button>';
    tool.className='fc-tool-toggle';tool.hidden=true;tool.onclick=equipScanner;reveal.className='fc-reveal';reveal.hidden=true;reveal.innerHTML='<span>ARCHIVE UNLOCKED</span><strong>“We followed your light<br>across the dark.”</strong><p>Fragment recovered · Return to the research lab.</p><button>Continue exploring ↗</button>';reveal.querySelector('button').onclick=()=>{reveal.hidden=true;revealTime=0;stage.focus();};hud.append(scanner,tool,reveal);scanner.querySelector('.fc-scan-button').onclick=startScan;
    if(FC)summary.querySelector('small').textContent='FIRST CONTACT / CHAPTER 01 · J';
    const distance=p=>{const g=getGround();return Math.hypot(g.state.x-p.x,g.state.z-p.z);};
    function nearby(){const g=getGround();if(!isWalking()||!g?.ready)return null;if(g.driving)return {kind:'exit',label:'Park & exit rover · E'};
      if(FC&&story.scannerUnlocked&&getGround().camp.scanner&&story.target(g.state)&&distance(story.target(g.state))<=8)return {kind:'scan',label:scanning?'Cancel scan · E':'Scan signal · E'};
      const objective=story.objective;if(objective&&distance(objective)<=(FC?(objective.scan?8:2.5):3.4))return {kind:'mission',label:objective.action+' · E'};
      if(FC&&story.complete&&FC.insideLab(g.state)&&distance(FC.LAB.sample)<2.5)return {kind:'lab',label:'Examine the recovered fragment · E'};
      const rover=g.nearestRover?.();if(rover&&rover.d<4.5)return {kind:'rover',id:rover.v.id,label:'Drive '+rover.v.name+' · E'};
      const crew=g.life?.crew.map(p=>({p,d:distance(p)})).sort((a,b)=>a.d-b.d)[0];if(crew&&crew.d<2.8)return {kind:'crew',person:crew.p,label:'Talk to '+crew.p.name+' · E'};return null;
    }
    function shell(kicker,title,text){panel.innerHTML='<button class="u-camp-close" data-close aria-label="Close mission log">✕</button><span class="u-camp-kicker"></span><h2 id="u-mission-title"></h2><p class="u-mission-copy"></p><div class="u-mission-content"></div><p class="u-mission-feedback" role="status" aria-live="polite"></p><small class="u-mission-storage"></small>';panel.querySelector('[data-close]').onclick=()=>closePanel();panel.querySelector('.u-camp-kicker').textContent=kicker;panel.querySelector('h2').textContent=title;panel.querySelector('.u-mission-copy').textContent=text;panel.querySelector('.u-mission-feedback').textContent=feedback;panel.querySelector('.u-mission-storage').textContent=story.saved?'Story progress saved on this browser.':'Progress stays in this visit; browser storage is unavailable.';return panel.querySelector('.u-mission-content');}
    function button(host,text,action,primary=false){const b=document.createElement('button');b.textContent=text;if(primary)b.className='u-camp-primary';b.onclick=action;host.append(b);return b;}
    function advance(code){const g=getGround(),step=story.step,result=story.act(step,{...g.state,driving:!!g.driving},code);feedback=result.message;if(!result.ok){panel.querySelector('.u-mission-feedback').textContent=feedback;return;}
      clearGuide?.();if(step===5)g.setCamp({ufoAwake:true});syncContact();announce(result.message);
      if(FC&&step===5){closePanel(false);reveal.hidden=false;revealTime=8;stage.focus();}else showLog();draw();
    }
    function showLog(){if(FC)return showContact();view='log';rendered=story.step;const objective=story.objective,done=story.complete;
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
    function syncContact(){if(!FC)return;const g=getGround();if(!g)return;const settings={campusLights:!story.blackout,artifactInstalled:story.installed};if(story.recovered)settings.ufoAwake=true;if(Object.keys(settings).some(k=>g.camp[k]!==settings[k]))g.setCamp(settings);}
    function equipScanner(){if(!FC||!story.scannerUnlocked){announce('Collect the field scanner inside the research lab first.');return;}const g=getGround();g.setCamp({scanner:!g.camp.scanner,binoculars:false,hands:true});scanning=false;scanTime=0;stage.focus();draw();}
    function startScan(){const g=getGround();if(!FC||!story.scannerUnlocked||g.driving)return false;const target=story.target(g.state);if(!target)return false;g.setCamp({scanner:true,binoculars:false,hands:true});scanning=!scanning;scanTime=0;closePanel(false);stage.focus();announce(scanning?'Face the source and hold it steady for three seconds.':'Scan cancelled.');return true;}
    function circuitUI(content){
      const turns=FC.INITIAL.slice(),grid=document.createElement('div');grid.className='fc-circuit';grid.setAttribute('role','group');grid.setAttribute('aria-label','Rotate circuit tiles. Connect supply on middle left to receiver on middle right.');
      const cells=[];const readout=document.createElement('p');readout.className='fc-puzzle-status';readout.setAttribute('role','status');
      function refresh(){const result=FC.circuit(turns);cells.forEach((b,i)=>{const mask=result.masks[i];b.innerHTML='<span class="fc-wire-center"></span>'+[1,2,4,8].map((bit,k)=>mask&bit?'<i class="fc-port fc-port-'+k+'"></i>':'').join('');b.className='fc-cell'+(result.lit.includes(i)?' powered':'')+(i===4?' isolator':'');b.setAttribute('aria-label','Row '+(Math.floor(i/3)+1)+', column '+(i%3+1)+': '+(i===4?'isolator':['north','east','south','west'].filter((_,k)=>mask&(1<<k)).join(' and '))+'. Rotate clockwise.');});readout.textContent=result.solved?'RECEIVER ONLINE · Circuit connected.':'SUPPLY → Connect through the top row → RECEIVER';}
      for(let i=0;i<9;i++){const b=document.createElement('button');b.type='button';b.disabled=i===4;b.onclick=()=>{turns[i]=(turns[i]+1)%4;refresh();};cells.push(b);grid.append(b);}content.append(grid,readout);refresh();button(content,'Restore receiver power',()=>advance(turns),true);
    }
    function phaseUI(content){
      const values=[0,0,0],targets=[2,4,1],rack=document.createElement('div');rack.className='fc-phase-rack';const status=document.createElement('p');status.className='fc-puzzle-status';status.setAttribute('role','status');
      const cells=[];function refresh(){cells.forEach((b,i)=>{b.innerHTML='<span class="fc-ring" style="--phase:'+values[i]*60+'deg;--target:'+targets[i]*60+'deg"><i class="fc-ring-target"></i><i class="fc-ring-marker"></i></span><span>PHASE '+String(i+1).padStart(2,'0')+'</span>';b.setAttribute('aria-label','Phase '+(i+1)+': '+values[i]*60+' degrees. Target '+targets[i]*60+' degrees. Rotate 60 degrees.');});status.textContent=values.filter((v,i)=>v===targets[i]).length+' / 3 CHANNELS ALIGNED · Cyan markers meet white targets.';}
      for(let i=0;i<3;i++)cells.push(button(rack,'Rotate phase '+(i+1),()=>{values[i]=(values[i]+1)%6;refresh();}));content.append(rack,status);refresh();button(content,'Open the archive',()=>advance(values),true);
    }
    function showContact(){
      view='log';rendered=story.step;const o=story.objective,done=story.complete;
      const ending=story.ending==='welcome'?'You sent a welcome into the dark. A pulse answered.':'You kept the channel open and listened. A second signal emerged.';
      const content=shell(done?'FIRST CONTACT / EXPEDITION COMPLETE':'FIRST CONTACT / '+String(story.step+1).padStart(2,'0')+' OF 08',done?'The universe answered.':o.title,done?ending+' Your recovered fragment is on display in the lab. The scanner can now find three hidden field records around the valley.':o.text);
      const pack=document.createElement('p');pack.className='u-mission-inventory';pack.textContent='PACK / '+story.inventory;content.append(pack);
      if(story.legacy){const legacy=document.createElement('small');legacy.textContent='Pathfinder badge retained from The Quiet Signal.';content.append(legacy);}
      if(done){const badge=document.createElement('div');badge.className='u-field-badge';badge.textContent='◇ '+(story.ending==='welcome'?'AMBASSADOR':'WATCHKEEPER')+' / FIRST CONTACT';content.append(badge);button(content,'Equip scanner & find field records',()=>{closePanel(false);if(!getGround().camp.scanner)equipScanner();},true);
        for(const record of FC.RECORDS){const p=document.createElement('p');p.className='fc-record';p.textContent=story.records.includes(record.id)?'✓ '+record.text:'◇ Unrecovered field record';content.append(p);}
      }else{
        const near=distance(o)<=(o.scan?8:2.5)&&!getGround().driving,indoor=![1,2,6,7].includes(story.step)||FC.insideLab(getGround().state);
        if(near&&indoor){if(o.puzzle==='power')circuitUI(content);else if(o.puzzle==='phase')phaseUI(content);else if(o.puzzle==='choice'){button(content,'Transmit a welcome',()=>advance('welcome'),true);button(content,'Observe in silence',()=>advance('listen'));}else if(o.scan)button(content,'Equip scanner & begin scan',startScan,true);else button(content,o.action+' ↗',()=>advance(),true);}
        else{const hint=document.createElement('p');hint.textContent=Math.round(distance(o))+' m to '+o.name+'. '+(!indoor?'Enter through the cyan doorway.':getGround().driving?'Park and step out.':'');content.append(hint);}
        button(content,'Guide me to the objective',()=>guide({...o,id:'contact-'+story.step}),!near);
        if(story.scannerUnlocked)button(content,'Return to the field with scanner',()=>{closePanel(false);if(!getGround().camp.scanner)equipScanner();});
      }
      const list=document.createElement('ol');list.className='u-mission-checklist';FC.STEPS.forEach((s,i)=>{const li=document.createElement('li');li.textContent=(i<story.step?'✓ ':i===story.step?'◇ ':'· ')+(i<=story.step||done?s.title:'Unrevealed objective');if(i===story.step)li.setAttribute('aria-current','step');list.append(li);});content.append(list);
      button(content,'Keep exploring',()=>{closePanel(false);stage.focus();});
      button(content,'Recover rovers at base camp',()=>{getGround().recallRovers?.();closePanel(false);stage.focus();announce('Rovers recovered. Story progress is saved.');draw();});
      if(done)button(content,'Replay First Contact',()=>{story.reset();getGround().setCamp({scanner:false,ufoAwake:false});syncContact();feedback='A new transmission is waiting at camp.';showContact();});openPanel(panel);
    }
    function contactTick(dt,{active,blocking}){
      if(!FC)return;const g=getGround();if(!g)return;const available=active&&!blocking&&!document.hidden&&!g.driving&&(!g.flight||g.flight.mode==='ground');
      const target=story.target(g.state),r=FC.reading({...g.state,driving:!!g.driving},target),equipped=!!g.camp.scanner&&g.camp.hands&&!g.camp.binoculars;
      if(!available||!equipped){scanning=false;scanTime=0;}else if(scanning){scanTime=r.aligned?scanTime+Math.max(0,Math.min(.1,dt)):Math.max(0,scanTime-dt*2);if(scanTime>=3){const result=story.scan({...g.state,driving:!!g.driving},scanTime);scanning=false;scanTime=0;if(result.ok){syncContact();clearGuide?.();announce(result.message);feedback=result.message;draw();}}}
      scanner.hidden=!available||!equipped;scanner.querySelector('strong').textContent=target?Math.round(r.strength*100)+'% SIGNAL':'STANDBY';scanner.querySelector('.fc-bearing').textContent=target?String(Math.round(r.bearing)).padStart(3,'0')+'° · '+Math.round(r.distance)+' m':'Open J for your current objective';
      scanner.querySelector('progress').value=scanning?scanTime/3:r.strength;scanner.querySelector('.fc-scan-status').textContent=scanning?(r.aligned?'HOLD STEADY · '+Math.round(scanTime/3*100)+'%':Math.abs(r.turn)>.34?(r.turn>0?'Turn right toward the signal':'Turn left toward the signal'):'Move closer and level the scanner'):target?'Face the source within 8 m':'Receiver ready';
      const scanButton=scanner.querySelector('.fc-scan-button');scanButton.disabled=!target;scanButton.textContent=scanning?'Cancel scan':'Scan · E';
      Object.assign(g.camp,{scannerStrength:r.strength,scanProgress:scanTime/3});
      tool.hidden=!active||blocking||!story.scannerUnlocked||!!g.driving;tool.textContent=g.camp.scanner?'Stow scanner · R':'Equip scanner · R';tool.setAttribute('aria-pressed',String(!!g.camp.scanner));
      if(available&&equipped&&target){beepTime-=dt;if(beepTime<=0){ping?.(r.strength);beepTime=1.5-r.strength*1.28;}}
      if(revealTime>0){revealTime-=dt;if(revealTime<=0)reveal.hidden=true;}
    }

    function crewDialog(person){view='crew';const lines={Mara:'The campus is on a night shift. Open your mission log when you are ready to help with the relay. The research lab is through the cyan doorway east of the hangar. Its emergency lights are always on.',Ellis:'See the seams, service lines and engine bells? Every part has a job. Tonight mine is checking the pad hardware—and getting that relay back.',Jun:'Integration is patient work: inspect, document, check again. I am comparing the hangar equipment with the shift checklist.',Inez:'I follow the pipe runs before every rehearsal. If a system needs attention, we stop and fix it. No shortcuts.',Noah:'Beyond these work lights, the sky gets wonderfully dark. Bring the telescope into focus when your shift is done.',Rae:'Both field rovers are yours to explore with. W and S drive, A and D steer. Park with E before stepping out. You can recover them from the mission log.'};const c=shell(person.role.toUpperCase()+' / NIGHT CREW',person.name,lines[person.name]||'A quiet night under an extraordinary sky.');button(c,'Open mission log',showLog,true);openPanel(panel);}
    function interact(){context=nearby();if(!context)return false;const g=getGround();if(context.kind==='scan')return startScan();if(context.kind==='exit'){g.brake();if(!g.exitRover())announce('The doors are blocked. Move to an open spot, then exit.');else announce('Rover parked. Back on foot.');stage.focus();draw();return true;}
      if(context.kind==='rover'){if(g.enterRover(context.id)){announce('Rover ready. W/S drive · A/D steer · Space brake · E exit.');stage.focus();draw();}return true;}
      feedback='';if(context.kind==='crew')crewDialog(context.person);else showLog();return true;
    }
    summary.onclick=()=>{enterWalk();feedback='';showLog();};prompt.onclick=interact;q('.u-drive-brake').onclick=()=>{freeze();getGround().brake();stage.focus();draw();};
    function update({visible,blocking}){const g=getGround();syncContact();hud.hidden=!visible||!isWalking();if(hud.hidden)return;hud.inert=blocking;summary.hidden=blocking;prompt.hidden=blocking;const o=story.objective;
      summary.querySelector('strong').textContent=story.complete?(FC?'First Contact · complete':'Pathfinder · shift complete'):o.title;summary.querySelector('span').textContent=story.complete?'Open field log ↗':String(story.step+1).padStart(2,'0')+(FC?'/08 · ':'/07 · ')+Math.round(distance(o))+' m · '+o.name;
      driveHUD.hidden=!g.driving||blocking;if(g.driving){driveHUD.querySelector('strong').textContent='ROVER '+g.driving;driveHUD.querySelector('span').textContent=Math.round(Math.abs(g.speed)*3.6)+' KM/H'+(g.speed<-.1?' · REVERSE':'');}
      context=nearby();prompt.hidden=blocking||!context;if(context)prompt.textContent=context.label;
      const pin=q('.u-objective-pin');pin.hidden=true;if(o&&!blocking){const p=g.project([o.x,g.terrainHeight(o.x,o.z)+2.5,o.z]);if(p.depth>.5&&p.x>40&&p.x<innerWidth-40&&p.y>160&&p.y<innerHeight-230){pin.hidden=false;pin.style.left=p.x+'px';pin.style.top=p.y+'px';pin.textContent='◇ '+Math.round(distance(o))+' m';}}
      if(!panel.hidden&&view==='log'&&rendered!==story.step)showLog();
    }
    return {panel,hud,story,interact,update,open:showLog,equipScanner,tick:contactTick,close(){scanning=false;scanTime=0;revealTime=0;reveal.hidden=true;scanner.hidden=true;tool.hidden=true;}};
  }
  window.ParallaxAdventure={create};
})();
