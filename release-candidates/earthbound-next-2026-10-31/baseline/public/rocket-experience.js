/* Flight deck controls share the camp's focus-managed modal. */
(() => {
  'use strict';
  function create({root,getGround,isWalking,openPanel,closePanel,guide,announce,stage,draw,freeze,depart,motion}){
    const hud=document.createElement('div');hud.className='u-rocket-hud';hud.hidden=true;
    hud.innerHTML='<span class="u-camp-kicker">PARALLAX / CREW ACCESS</span><strong></strong><p></p><button class="u-rocket-action"></button><button class="u-rocket-exit" hidden>Return to launch pad</button>';
    const panel=document.createElement('section');panel.className='u-camp-menu u-rocket-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','u-rocket-title');
    panel.innerHTML='<button class="u-camp-close" data-close aria-label="Close flight plan">✕</button><span class="u-camp-kicker">STARSHIP / FLIGHT DECK</span><h2 id="u-rocket-title">Choose your next orbit.</h2><p>The valley is below you. Set a destination, then launch through the windshield into the planetary explorer.</p><label for="u-rocket-planet">Flight destination</label><select id="u-rocket-planet"></select><button class="u-camp-primary u-rocket-launch">Begin launch sequence ↗</button><p class="u-camp-footnote">A fictional flight experience. Explore planets, moons and Pluto from orbit.</p>';
    root.append(hud,panel);
    const action=hud.querySelector('.u-rocket-action'),back=hud.querySelector('.u-rocket-exit'),title=hud.querySelector('strong'),detail=hud.querySelector('p'),select=panel.querySelector('select');
    for(const name of window.ParallaxRocket.PLANETS){const option=document.createElement('option');option.value=option.textContent=name;select.append(option);}select.value='Mars';
    let previous='',departed=false;
    const near=()=>{const g=getGround();return g?.flight?.mode==='ground'&&!g.driving&&isWalking()&&Math.hypot(g.state.x-g.boarding.x,g.state.z-g.boarding.z)<3.3;};
    const open=()=>{if(getGround()?.flight?.mode==='cabin')openPanel(panel);};
    function board(){const g=getGround();if(!near()||!g.boardRocket())return false;freeze();departed=false;announce('Boarding lift rising to the flight deck.');if(!motion())for(let i=0;i<51;i++)g.flightTick(.1);draw();stage.focus();return true;}
    function exit(){closePanel(false);freeze();getGround()?.exitRocket();departed=false;stage.focus();announce('Back on the launch pad.');draw();}
    action.onclick=()=>{if(near())board();else open();};back.onclick=exit;panel.querySelector('[data-close]').onclick=()=>closePanel();
    panel.querySelector('.u-rocket-launch').onclick=()=>{const g=getGround();if(!g?.launchRocket(select.value))return;closePanel(false);freeze();announce('Flight plan set for '+select.value+'. Launch sequence started.');if(!motion())for(let i=0;i<111;i++)g.flightTick(.1);draw();stage.focus();};
    function tick(dt){const g=getGround(),f=g?.flight;if(!f||f.mode==='ground')return;if(g.flightTick(dt))draw();if(f.mode==='orbit'&&!departed){departed=true;const planet=f.planet;depart(planet);g.exitRocket();}}
    function update({visible,blocking}){const g=getGround(),f=g?.flight,mode=f?.mode||'ground';hud.hidden=!visible||blocking||!isWalking()||(!near()&&mode==='ground');if(hud.hidden)return;
      const key=mode+':'+Math.floor(f.elapsed)+':'+Math.round(f.rise);if(key===previous)return;previous=key;
      action.hidden=mode==='lift'||mode==='launch'||mode==='orbit';back.hidden=mode==='ground';
      if(mode==='ground'){title.textContent='Your ride to the stars.';detail.textContent='Starship crew lift · flight deck 54 m';action.textContent='Board Starship · E';}
      else if(mode==='lift'){title.textContent='Ascending the gantry';detail.textContent=Math.round(f.rise)+' / 54 m · watch the valley fall away';}
      else if(mode==='cabin'){title.textContent='Welcome to the flight deck.';detail.textContent='Walk the aisle. Look through the panoramic window. Choose your next world.';action.textContent='Set flight plan · E';}
      else{title.textContent=f.elapsed<3?'T − '+Math.max(1,Math.ceil(3-f.elapsed)):'Liftoff → '+f.planet;detail.textContent=f.elapsed<3?'Cabin secure · engines starting':Math.round(f.rise)+' m above pad · climbing to orbit';}
    }
    return {hud,panel,tick,update,exit,interact(){if(near())return board();if(getGround()?.flight?.mode==='cabin'){open();return true;}return getGround()?.flight?.mode!=='ground';},guide(){const g=getGround();if(g?.boarding)guide({...g.boarding,id:'boarding'});}};
  }
  window.ParallaxRocketExperience={create};
})();
