(() => {
  'use strict';
  const D=window.ParallaxAfterDarkDirector;if(!D)return;
  const hero=document.querySelector('.hero'),entry=document.querySelector('#after-dark-play'),preference=document.querySelector('#after-dark-auto');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),dialog=document.createElement('dialog');
  dialog.id='after-dark';dialog.setAttribute('aria-labelledby','ad-name');
  dialog.innerHTML=`<div class="ad-world" aria-hidden="true"></div><div class="ad-singularity" aria-hidden="true"></div><div class="ad-grade" aria-hidden="true"></div><div class="ad-shutter" aria-hidden="true"></div>
    <header class="ad-header"><div class="ad-brand">◎ PARALLAX<span id="ad-name">AFTER DARK</span></div><div class="ad-top-right"><span class="ad-loop"><i></i> CINEMATIC SHOWCASE</span><button id="ad-close" type="button" aria-label="Back to site">Back to site <span>✕</span></button></div></header>
    <div class="ad-frame-mark" aria-hidden="true"><span>EXPLORE / DISCOVER / BELONG</span><i></i></div>
    <section class="ad-copy" aria-label="Current chapter"><p id="ad-tag"></p><h2 id="ad-title"></h2><p id="ad-description"></p><button id="ad-action" type="button"></button></section>
    <aside class="ad-signature" aria-label="Project"><span>THE ONCHAIN OBSERVATORY</span><strong>$PRLX</strong><span>PARALLAXLAUNCH.LIVE</span></aside>
    <footer class="ad-footer"><div class="ad-chapters" role="group" aria-label="Showcase chapters"></div><div class="ad-footer-row"><span id="ad-credit">Rendered PARALLAX world</span><div><button id="ad-pause" type="button">Pause Ⅱ</button><button id="ad-next" type="button">Next chapter →</button><button id="ad-control" type="button">Take control ↗</button></div></div></footer>
    <p id="ad-status" role="status"></p>`;
  document.body.append(dialog);
  const q=s=>dialog.querySelector(s),worldHost=q('.ad-world'),holeHost=q('.ad-singularity'),buttons=[];
  let enabled=true;try{enabled=localStorage.getItem('parallax.after-dark.auto')!=='off';}catch{}
  let ground=null,hole=null,holeHome=null,returnFocus=null,chapter=0,elapsed=0,last=0,drawn=0,raf=0,paused=false,dirty=true,closed=true,autoStarted=false,loadingSince=0,autoTimer=0;
  function motionPaused(){return paused||reduced.matches||document.body.classList.contains('motion-paused');}
  function preferenceLabel(){preference.setAttribute('aria-pressed',String(enabled));preference.textContent='Auto showcase '+(enabled?'on':'off');preference.title=enabled?'Plays after 20 seconds of inactivity at the top of the page.':'Automatic showcase is disabled.';}
  function eligible(){return D.eligible({enabled,reduced:reduced.matches,paused:document.body.classList.contains('motion-paused'),hidden:document.hidden,modal:!!document.querySelector('dialog[open]'),nearHero:scrollY<Math.min(180,hero.clientHeight*.2),editing:!!document.activeElement?.closest('input,textarea,select,[contenteditable="true"]'),focused:document.hasFocus()});}
  function arm(){clearTimeout(autoTimer);if(!closed)return;autoTimer=setTimeout(()=>{if(eligible())open(true);else arm();},20000);}
  preference.onclick=()=>{enabled=!enabled;try{localStorage.setItem('parallax.after-dark.auto',enabled?'on':'off');}catch{}preferenceLabel();arm();};preferenceLabel();
  D.SHOTS.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<span class="ad-track"><i></i></span><span class="ad-chapter-label"><b>0${i+1}</b> ${s.name}</span>`;b.setAttribute('aria-label','Chapter '+(i+1)+': '+s.name);b.onclick=()=>change(i,true);q('.ad-chapters').append(b);buttons.push(b);});
  function labels(){const stop=motionPaused();dialog.classList.toggle('ad-paused',stop);q('#ad-pause').textContent=stop?'Play ▷':'Pause Ⅱ';q('#ad-pause').setAttribute('aria-pressed',String(stop));q('#ad-pause').disabled=reduced.matches||document.body.classList.contains('motion-paused');q('#ad-pause').title=q('#ad-pause').disabled?'Automatic motion is disabled by your motion preference. Use chapter buttons to explore.':'';}
  function change(index,manual=false){
    chapter=(index+D.SHOTS.length)%D.SHOTS.length;elapsed=manual?1.1:0;dirty=true;
    const s=D.SHOTS[chapter];dialog.dataset.chapter=s.id;
    q('#ad-tag').textContent=s.tag;q('#ad-title').textContent=s.title;q('#ad-description').textContent=s.text;q('#ad-action').textContent=s.action+' ↗';
    q('#ad-credit').textContent=s.id==='singularity'?'Artistic black-hole visualization':'Rendered PARALLAX world';
    buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===chapter)));
    if(manual)q('#ad-status').textContent='Chapter '+(chapter+1)+': '+s.name;
    draw();
  }
  function draw(){
    if(closed||document.hidden)return;
    const s=D.SHOTS[chapter],still=motionPaused(),progress=reduced.matches?.35:Math.min(1,elapsed/s.duration);
    if(s.id!=='singularity'&&ground?.ready&&ground.canvas.isConnected){const pose=D.camera(chapter,progress,ground.terrainHeight,ground.life?.vehicles[1],innerWidth/innerHeight);ground.render(pose.zoom,pose);worldHost.classList.add('ad-ready');}
    else worldHost.classList.remove('ad-ready');
    const fade=still||(chapter<4&&!ground?.ready)?0:Math.max(0,1-elapsed/.9,1-(s.duration-elapsed)/.9);
    dialog.style.setProperty('--ad-fade',fade.toFixed(3));
    buttons.forEach((b,i)=>b.style.setProperty('--ad-progress',i<chapter?'1':i===chapter?String(elapsed/s.duration):'0'));
    dirty=false;
  }
  function tick(t){
    if(closed)return;const dt=last?Math.min((t-last)/1000,.1):0;last=t;
    if(!document.hidden){
      const waiting=chapter<4&&ground&&!ground.ready&&t-loadingSince<12000;
      if(!motionPaused()&&!waiting){elapsed+=dt;if(chapter<4&&ground?.ready)ground.tick(dt);if(elapsed>=D.SHOTS[chapter].duration)change(chapter+1);}
      if(chapter<4&&(!ground||!ground.canvas.isConnected||(!ground.ready&&t-loadingSince>=12000)))change(4,true);
      if(dirty||!motionPaused()&&t-drawn>40||ground?.ready&&!worldHost.classList.contains('ad-ready')&&chapter<4){draw();drawn=t;}
    }
    raf=requestAnimationFrame(tick);
  }
  function open(automatic=false){
    if(!closed||document.querySelector('dialog[open]'))return;
    clearTimeout(autoTimer);autoStarted=automatic;returnFocus=document.activeElement;paused=false;closed=false;
    dialog.showModal();document.body.classList.add('after-dark-active');
    ground=window.parallaxUniverse?.borrowWorld(worldHost)||null;
    hole=document.querySelector('#singularity-dialog .black-hole-canvas');if(hole){holeHome=hole.parentElement;holeHost.append(hole);}
    loadingSince=performance.now();last=drawn=0;labels();change(ground?0:4);q('#ad-close').focus({preventScroll:true});raf=requestAnimationFrame(tick);
  }
  function cleanup(){if(closed)return;closed=true;cancelAnimationFrame(raf);window.parallaxUniverse?.releaseWorld();if(hole&&holeHome)holeHome.prepend(hole);document.body.classList.remove('after-dark-active');ground=null;hole=null;returnFocus?.focus({preventScroll:true});arm();}
  function close(){if(!closed){dialog.close();cleanup();}}
  function explore(){close();window.parallaxUniverse?.open('Earthbound',{walk:true});}
  entry.onclick=()=>open(false);q('#ad-close').onclick=close;q('#ad-control').onclick=explore;
  q('#ad-action').onclick=()=>{if(chapter===4){close();document.querySelector('#project-atlas')?.scrollIntoView({behavior:reduced.matches?'instant':'smooth'});}else explore();};
  q('#ad-next').onclick=()=>change(chapter+1,true);q('#ad-pause').onclick=()=>{paused=!paused;labels();dirty=true;draw();};
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',()=>{if(!dialog.open)cleanup();});
  dialog.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();change(chapter+(e.key==='ArrowRight'?1:-1),true);}else if(e.key===' '&&e.target===dialog){e.preventDefault();q('#ad-pause').click();}});
  dialog.addEventListener('pointerdown',e=>{if(autoStarted&&!e.target.closest('button'))close();});
  dialog.addEventListener('wheel',e=>{e.preventDefault();if(autoStarted)close();},{passive:false});
  for(const name of ['pointerdown','pointermove','keydown','scroll','touchstart'])document.addEventListener(name,()=>{if(closed)arm();},{passive:true});
  document.addEventListener('visibilitychange',()=>{last=0;if(!document.hidden){dirty=true;arm();}});
  addEventListener('focus',arm);addEventListener('resize',()=>{dirty=true;draw();});
  reduced.addEventListener('change',()=>{labels();dirty=true;draw();arm();});
  new MutationObserver(()=>{labels();dirty=true;arm();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  labels();arm();
})();
