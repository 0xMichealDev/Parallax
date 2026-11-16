/* Telescope-to-flight integration candidate. Reuses the existing world and arrival adapter. */
(() => {
  'use strict';
  function create({root,getGround,isWalking,openPanel,closePanel,guide,announce,stage,draw,freeze,depart,motion}) {
    const R=window.ParallaxRocket;
    const hud=document.createElement('div');hud.className='u-rocket-hud';hud.hidden=true;
    hud.innerHTML='<span class="u-camp-kicker">PARALLAX / CREW ACCESS</span><strong></strong><p></p><button class="u-rocket-action" type="button"></button><button class="u-rocket-resume" type="button" hidden>Resume flight</button><button class="u-rocket-retry" type="button" hidden>Retry arrival</button><button class="u-rocket-exit" type="button" hidden>Return to launch pad</button>';
    const panel=document.createElement('section');panel.className='u-camp-menu u-rocket-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','u-rocket-title');
    panel.innerHTML='<button class="u-camp-close" type="button" data-close aria-label="Close flight plan">✕</button><span class="u-camp-kicker">STARSHIP / FLIGHT DECK</span><h2 id="u-rocket-title">Your next orbit.</h2><p>Review the course you chose at the telescope, or select another world. Nothing launches until you confirm.</p><label for="u-rocket-planet">Flight destination</label><select id="u-rocket-planet"></select><p class="u-rocket-plan-note" role="status" aria-live="polite"></p><button class="u-camp-primary u-rocket-launch" type="button">Confirm &amp; launch ↗</button><p class="u-camp-footnote">A fictional flight experience. Explore supported planets, moons and Pluto from orbit.</p>';
    root.append(hud,panel);
    const action=hud.querySelector('.u-rocket-action'),back=hud.querySelector('.u-rocket-exit'),resume=hud.querySelector('.u-rocket-resume'),retry=hud.querySelector('.u-rocket-retry'),title=hud.querySelector('strong'),detail=hud.querySelector('p'),select=panel.querySelector('select'),note=panel.querySelector('.u-rocket-plan-note'),launch=panel.querySelector('.u-rocket-launch');
    for(const name of R.PLANETS){const option=document.createElement('option');option.value=option.textContent=name;select.append(option);}
    let previous='',departed=false,pending=false,arrivalError=false,epoch=0,paused=false,active=false,disposed=false;
    function invalidate(){previous='';}
    function supported(name){return typeof name==='string'&&R.PLANETS.includes(name);}
    function currentPlanet(){const name=getGround()?.flight?.planet;return supported(name)?name:null;}
    function syncSelect(){const planet=currentPlanet();select.value=planet||'';launch.disabled=!planet;note.textContent=planet?'Planned destination: '+planet+'. Confirm below to launch.':'Choose an available destination.';}
    function plan(planet){const g=getGround();if(disposed||typeof R.selectDestination!=='function'||!g?.ready||g.driving||g.flight?.mode!=='ground'||!supported(planet)||!R.selectDestination(g.flight,planet))return false;syncSelect();invalidate();draw();return true;}
    function guideToRocket(){const g=getGround();if(!g?.boarding||g.flight?.mode!=='ground'||g.driving)return false;guide({...g.boarding,id:'boarding',name:'Rocket boarding lift'+(currentPlanet()?' · course: '+currentPlanet():'')});return true;}
    const near=()=>{const g=getGround();return !!g?.ready&&g.flight?.mode==='ground'&&!g.driving&&isWalking()&&Number.isFinite(g.state.x)&&Number.isFinite(g.state.z)&&Math.hypot(g.state.x-g.boarding.x,g.state.z-g.boarding.z)<3.3;};
    function open(){if(disposed||getGround()?.flight?.mode!=='cabin')return false;syncSelect();openPanel(panel);return true;}
    function board(){const g=getGround();if(disposed||!near()||!g.boardRocket())return false;freeze();epoch++;departed=pending=arrivalError=paused=false;invalidate();announce('Boarding lift rising. Planned destination: '+currentPlanet()+'.');if(!motion())for(let i=0;i<51;i++)g.flightTick(.1);draw();stage.focus();return true;}
    function cancel(announceExit=true){epoch++;pending=departed=arrivalError=paused=false;closePanel(false);freeze();const g=getGround();if(g?.flight?.mode!=='ground')g?.exitRocket();syncSelect();invalidate();if(announceExit){stage.focus();announce('Back on the launch pad. Your planned destination is '+currentPlanet()+'.');}draw();}
    action.onclick=()=>near()?board():open();back.onclick=()=>cancel();panel.querySelector('[data-close]').onclick=()=>closePanel();
    select.onchange=()=>{const ok=supported(select.value);launch.disabled=!ok;note.textContent=ok?'Ready to confirm: '+select.value+'. Your previous course is kept until launch.':'Choose an available destination.';};
    launch.onclick=()=>{const g=getGround();if(disposed||document.hidden||!supported(select.value)||!g?.launchRocket(select.value))return;epoch++;pending=departed=arrivalError=paused=false;closePanel(false);freeze();invalidate();announce('Flight plan confirmed for '+select.value+'. Launch sequence started.');if(!motion())for(let i=0;i<111;i++)g.flightTick(.1);draw();stage.focus();};
    function failArrival(token){if(disposed||token!==epoch)return;pending=false;arrivalError=true;departed=false;invalidate();announce('The destination did not open. Retry arrival or return to the launch pad.');draw();}
    function arrive(){
      const g=getGround(),f=g?.flight;
      if(disposed||pending||departed||f?.mode!=='orbit'||document.hidden)return;
      if(!supported(f.planet)||typeof depart!=='function'){arrivalError=true;invalidate();return;}
      const token=++epoch;pending=true;arrivalError=false;invalidate();const planet=f.planet;
      try {
        const result=depart(planet);
        const finish=accepted=>{if(disposed||token!==epoch)return;if(accepted===false){failArrival(token);return;}pending=false;departed=true;invalidate();if(g.flight===f&&f.mode==='orbit')g.exitRocket();};
        // Existing adapter is synchronous; also contain a rejected optional async adapter.
        if(result&&typeof result.then==='function')Promise.resolve(result).then(finish,()=>failArrival(token));else finish(result);
      } catch {failArrival(token);}
    }
    retry.onclick=()=>{if(arrivalError)arrive();};
    resume.onclick=()=>{if(disposed||document.hidden)return;paused=false;freeze();invalidate();announce('Flight resumed.');stage.focus();draw();};
    function pause(){if(disposed)return;freeze();const mode=getGround()?.flight?.mode;if(['lift','launch'].includes(mode)){paused=true;invalidate();}}
    function visibility(){if(document.hidden)pause();}
    document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',pause);
    function tick(dt){const g=getGround(),f=g?.flight;if(disposed||!active||document.hidden||paused||!f||f.mode==='ground')return;if(g.flightTick(dt))draw();if(f.mode==='orbit'&&!arrivalError)arrive();}
    function update({visible,blocking}){
      active=!!visible&&!blocking;const g=getGround(),f=g?.flight,mode=f?.mode||'ground';
      hud.hidden=disposed||!visible||blocking||!isWalking()||(!near()&&mode==='ground');if(hud.hidden)return;
      const key=[mode,f.planet,Math.floor(f.elapsed),Math.round(f.rise),paused,pending,arrivalError].join(':');if(key===previous)return;previous=key;
      action.hidden=mode!=='ground'&&mode!=='cabin';back.hidden=mode==='ground';resume.hidden=!paused;retry.hidden=!arrivalError;
      if(paused){title.textContent='Flight paused';detail.textContent='Resume when you’re ready, or return to the launch pad.';}
      else if(arrivalError){title.textContent='Arrival needs another try';detail.textContent='Course: '+f.planet+'. Your destination has not been changed.';}
      else if(mode==='ground'){title.textContent='Your ride to '+f.planet+'.';detail.textContent='Crew lift · flight deck 54 m · review your course aboard';action.textContent='Board rocket · E';}
      else if(mode==='lift'){title.textContent='Ascending the gantry';detail.textContent=Math.round(f.rise)+' / 54 m · course: '+f.planet;}
      else if(mode==='cabin'){title.textContent='Welcome to the flight deck.';detail.textContent='Planned destination: '+f.planet+'. Review your course before launch.';action.textContent='Review flight plan · E';}
      else if(mode==='orbit'){title.textContent='Opening '+f.planet;detail.textContent='Handing off to the planetary explorer…';}
      else{title.textContent=f.elapsed<3?'T − '+Math.max(1,Math.ceil(3-f.elapsed)):'Liftoff → '+f.planet;detail.textContent=f.elapsed<3?'Cabin secure · engines starting':Math.round(f.rise)+' m above pad · climbing to orbit';}
    }
    syncSelect();
    return {hud,panel,tick,update,plan,guide:guideToRocket,exit:()=>cancel(),close:()=>cancel(false),
      interact(){if(disposed)return false;if(near())return board();if(getGround()?.flight?.mode==='cabin')return open();const mode=getGround()?.flight?.mode;return !!mode&&mode!=='ground';},
      destroy(){if(disposed)return;cancel(false);disposed=true;document.removeEventListener('visibilitychange',visibility);window.removeEventListener('blur',pause);hud.remove();panel.remove();}
    };
  }
  window.ParallaxRocketExperience={create};
})();
