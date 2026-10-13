(() => {
  'use strict';
  const D=window.ParallaxAfterDarkDirector;if(!D)return;
  const hero=document.querySelector('.hero'),entry=document.querySelector('#after-dark-play'),preference=document.querySelector('#after-dark-auto');
  if(!hero||!entry||!preference)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),dialog=document.createElement('dialog');
  const SAVE='parallax.after-dark.playback.v2',LOOP='parallax.after-dark.loop';
  const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
  const write=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
  let saved=null;try{saved=JSON.parse(read(SAVE));}catch{}
  let playback=D.restore(saved),loop=read(LOOP)!=='off';
  dialog.id='after-dark';dialog.setAttribute('aria-labelledby','ad-name');
  dialog.innerHTML=`<div class="ad-world" aria-hidden="true"></div><div class="ad-singularity" aria-hidden="true"></div><div class="ad-grade" aria-hidden="true"></div><div class="ad-shutter" aria-hidden="true"></div>
    <header class="ad-header"><div class="ad-brand">◎ PARALLAX<span id="ad-name">AFTER DARK</span></div><div class="ad-top-right"><span class="ad-loop"><i></i> A JOURNEY THROUGH THE NIGHT</span><button id="ad-clean" type="button" aria-pressed="false">Clean view</button><button id="ad-close" type="button" aria-label="Back to site">Back to site <span>✕</span></button></div></header>
    <div class="ad-scene-meta" aria-hidden="true"><span id="ad-scene-number"></span><span id="ad-location"></span></div>
    <section class="ad-copy" aria-label="Current chapter"><p id="ad-tag"></p><h2 id="ad-title"></h2><p id="ad-description"></p><button id="ad-action" type="button"></button></section>
    <aside class="ad-signature" aria-label="Project"><span>THE ONCHAIN OBSERVATORY</span><strong>$PRLX</strong><span>PARALLAXLAUNCH.LIVE</span></aside>
    <footer class="ad-footer"><div class="ad-chapters" role="group" aria-label="Showcase chapters"></div>
      <div class="ad-timeline"><label for="ad-seek">JOURNEY</label><input id="ad-seek" type="range" min="0" max="${D.TOTAL}" step="0.1" value="0" aria-label="Seek through the showcase"><output id="ad-time" for="ad-seek">0:00 / 2:00</output><span id="ad-playback-state"></span></div>
      <div class="ad-footer-row"><div class="ad-context"><span id="ad-credit">Rendered PARALLAX world</span><span id="ad-up-next"></span></div><div class="ad-controls"><button id="ad-pause" type="button">Pause Ⅱ</button><button id="ad-next" type="button">Next →</button><button id="ad-restart" type="button" title="Restart the showcase only">Restart ↺</button><button id="ad-loop-toggle" type="button" aria-pressed="true">Loop on</button><button id="ad-fullscreen" type="button">Fullscreen ↗</button><button id="ad-control" type="button">Take control ↗</button></div></div>
    </footer><p id="ad-status" role="status"></p>`;
  document.body.append(dialog);
  const q=s=>dialog.querySelector(s),worldHost=q('.ad-world'),holeHost=q('.ad-singularity'),buttons=[];
  let enabled=read('parallax.after-dark.auto')!=='off';
  let ground=null,hole=null,holeHome=null,returnFocus=null,last=0,drawn=0,raf=0,paused=false,dirty=true,closed=true,loadingSince=0,autoTimer=0,savedAt=0,clean=false,unavailable=false;
  const current=()=>D.SHOTS[playback.chapter];
  const worldShot=()=>current().id!=='singularity';
  const stamp=t=>Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
  function motionPaused(){return paused||playback.ended||reduced.matches||document.body.classList.contains('motion-paused');}
  function persist(){write(SAVE,JSON.stringify(D.snapshot(playback)));}
  function preferenceLabel(){preference.setAttribute('aria-pressed',String(enabled));preference.textContent='Auto showcase '+(enabled?'on':'off');preference.title=enabled?'Resumes after 20 seconds of inactivity at the top of the page.':'Automatic showcase is disabled.';}
  function eligible(){return D.eligible({enabled,reduced:reduced.matches,paused:document.body.classList.contains('motion-paused'),hidden:document.hidden,modal:!!document.querySelector('dialog[open]'),nearHero:scrollY<Math.min(180,hero.clientHeight*.2),editing:!!document.activeElement?.closest('input,textarea,select,[contenteditable="true"]'),focused:document.hasFocus()});}
  function arm(){clearTimeout(autoTimer);if(!closed||!enabled)return;autoTimer=setTimeout(()=>{if(eligible()&&!(playback.ended&&!loop))open(true);else arm();},20000);}
  preference.onclick=()=>{enabled=!enabled;write('parallax.after-dark.auto',enabled?'on':'off');preferenceLabel();arm();};preferenceLabel();
  D.SHOTS.forEach((s,i)=>{const b=document.createElement('button');b.type='button';b.innerHTML=`<span class="ad-track"><i></i></span><span class="ad-chapter-label"><b>0${i+1}</b> ${s.name}</span>`;b.setAttribute('aria-label','Chapter '+(i+1)+': '+s.name);b.title=s.name;b.onclick=()=>change(i,true);q('.ad-chapters').append(b);buttons.push(b);});
  function labels(){
    const stop=motionPaused(),restricted=reduced.matches||document.body.classList.contains('motion-paused');
    dialog.classList.toggle('ad-paused',stop);q('#ad-pause').textContent=playback.ended?'Replay ▷':stop?'Play ▷':'Pause Ⅱ';q('#ad-pause').setAttribute('aria-pressed',String(stop));q('#ad-pause').disabled=restricted;
    q('#ad-pause').title=restricted?'Motion is disabled by your preference. Use chapters or the timeline to explore.':'';
    q('#ad-loop-toggle').textContent=loop?'Loop on':'Loop off';q('#ad-loop-toggle').setAttribute('aria-pressed',String(loop));
    q('#ad-clean').textContent=clean?'Show controls':'Clean view';q('#ad-clean').setAttribute('aria-pressed',String(clean));
    dialog.classList.toggle('ad-clean',clean);
  }
  function scene(){
    const s=current();dialog.dataset.chapter=s.id;
    q('#ad-tag').textContent=s.tag;q('#ad-title').textContent=s.title;q('#ad-description').textContent=s.text;q('#ad-action').textContent=s.action+' ↗';
    q('#ad-location').textContent=s.detail;q('#ad-scene-number').textContent=String(playback.chapter+1).padStart(2,'0')+' / 07';
    q('#ad-credit').textContent=unavailable?'Desert renderer unavailable · black-hole showcase':s.id==='singularity'?'Artistic black-hole visualization':'Rendered PARALLAX world';
    q('#ad-up-next').textContent=playback.chapter===D.FINAL?(loop?'NEXT · THE NIGHT BEGINS AGAIN':'FINALE · STAY AS LONG AS YOU LIKE'):'UP NEXT · '+D.SHOTS[playback.chapter+1].name.toUpperCase();
    buttons.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===playback.chapter)));labels();dirty=true;
  }
  function change(index,manual=false){
    playback={...playback,chapter:(index+D.SHOTS.length)%D.SHOTS.length,elapsed:manual?1:0,ended:false};
    scene();if(manual){q('#ad-status').textContent='Chapter '+(playback.chapter+1)+': '+current().name;persist();}draw();
  }
  function draw(){
    if(closed||document.hidden)return;
    const s=current(),still=motionPaused(),progress=reduced.matches?.35:Math.min(1,playback.elapsed/s.duration);
    if(worldShot()&&ground?.ready&&ground.canvas.isConnected){const pose=D.camera(playback.chapter,progress,ground.terrainHeight,ground.life?.vehicles[1],innerWidth/innerHeight);ground.render(pose.zoom,pose);worldHost.classList.add('ad-ready');}
    else worldHost.classList.remove('ad-ready');
    const fade=still||worldShot()&&!ground?.ready?0:Math.max(0,1-playback.elapsed/.8,playback.chapter===D.FINAL&&!loop?0:1-(s.duration-playback.elapsed)/.8);
    dialog.style.setProperty('--ad-fade',fade.toFixed(3));
    buttons.forEach((b,i)=>b.style.setProperty('--ad-progress',i<playback.chapter?'1':i===playback.chapter?String(playback.elapsed/s.duration):'0'));
    const time=D.position(playback);q('#ad-seek').value=String(time);q('#ad-seek').setAttribute('aria-valuetext',stamp(time)+' of '+stamp(D.TOTAL)+', '+s.name);q('#ad-time').textContent=stamp(time)+' / '+stamp(D.TOTAL);
    q('#ad-playback-state').textContent=playback.ended?'COMPLETE':still?'PAUSED':loop?'LOOP '+String(playback.cycle).padStart(2,'0'):'PLAY ONCE';dirty=false;
  }
  function tick(t){
    if(closed)return;const dt=last?Math.min((t-last)/1000,.1):0;last=t;
    if(!document.hidden){
      const waiting=worldShot()&&ground&&!ground.ready&&t-loadingSince<12000;
      if(worldShot()&&(!ground||!ground.canvas.isConnected||(!ground.ready&&t-loadingSince>=12000))){unavailable=true;change(D.FINAL,true);}
      const before=playback;playback=D.advance(playback,dt,{loop,paused:motionPaused(),waiting});
      if(before.chapter!==playback.chapter||before.ended!==playback.ended){scene();persist();}
      if(!motionPaused()&&!waiting&&worldShot()&&ground?.ready)ground.tick(dt);
      if(dirty||!motionPaused()&&t-drawn>40||ground?.ready&&!worldHost.classList.contains('ad-ready')&&worldShot()){draw();drawn=t;}
      if(t-savedAt>5000){persist();savedAt=t;}
    }
    raf=requestAnimationFrame(tick);
  }
  function open(automatic=false){
    if(!closed||document.querySelector('dialog[open]'))return;
    clearTimeout(autoTimer);returnFocus=document.activeElement;paused=false;closed=false;unavailable=false;clean=false;
    if(playback.ended&&loop)playback=D.restore(null);
    dialog.showModal();document.body.classList.add('after-dark-active');
    ground=window.parallaxUniverse?.borrowWorld(worldHost)||null;
    hole=document.querySelector('#singularity-dialog .black-hole-canvas');if(hole){holeHome=hole.parentElement;holeHost.append(hole);}
    loadingSince=performance.now();last=drawn=0;savedAt=loadingSince;
    if(!ground){unavailable=true;change(D.FINAL,true);}else{scene();draw();}
    q('#ad-status').textContent=D.position(playback)>1?'Resumed at '+stamp(D.position(playback))+'. Restart begins the showcase again.':'Seven chapters. Two minutes. Explore at your own pace.';
    q('#ad-close').focus({preventScroll:true});raf=requestAnimationFrame(tick);
  }
  function cleanup(){
    if(closed)return;persist();closed=true;cancelAnimationFrame(raf);
    if(document.fullscreenElement===dialog)document.exitFullscreen().catch(()=>{});
    window.parallaxUniverse?.releaseWorld();if(hole&&holeHome)holeHome.prepend(hole);
    document.body.classList.remove('after-dark-active');ground=null;hole=null;holeHome=null;returnFocus?.focus({preventScroll:true});arm();
  }
  function close(){if(!closed){dialog.close();cleanup();}}
  function explore(){close();window.parallaxUniverse?.open('Earthbound',{walk:true});}
  function restart(){playback=D.restore(null);paused=false;scene();draw();persist();q('#ad-status').textContent='Showcase restarted. Your exploration progress is unchanged.';}
  entry.onclick=()=>open(false);q('#ad-close').onclick=close;q('#ad-control').onclick=explore;
  q('#ad-action').onclick=()=>{if(!worldShot()){close();document.querySelector('#project-atlas')?.scrollIntoView({behavior:reduced.matches?'instant':'smooth'});}else explore();};
  q('#ad-next').onclick=()=>change(playback.chapter+1,true);q('#ad-restart').onclick=restart;
  q('#ad-pause').onclick=()=>{if(playback.ended)restart();else{paused=!paused;labels();dirty=true;draw();persist();}};
  q('#ad-loop-toggle').onclick=()=>{loop=!loop;write(LOOP,loop?'on':'off');scene();draw();q('#ad-status').textContent=loop?'The showcase repeats every two minutes.':'The showcase will stay on its final scene.';};
  q('#ad-clean').onclick=()=>{clean=!clean;labels();};
  q('#ad-seek').addEventListener('input',e=>{playback=D.seek(playback,Number(e.target.value));scene();draw();});
  q('#ad-seek').addEventListener('change',persist);
  q('#ad-fullscreen').onclick=async()=>{try{if(document.fullscreenElement===dialog)await document.exitFullscreen();else if(dialog.requestFullscreen)await dialog.requestFullscreen();else throw new Error('unsupported');}catch{q('#ad-status').textContent='Fullscreen is unavailable in this browser. The showcase already fills this window.';}};
  document.addEventListener('fullscreenchange',()=>{q('#ad-fullscreen').textContent=document.fullscreenElement===dialog?'Exit fullscreen':'Fullscreen ↗';dirty=true;});
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.addEventListener('close',()=>{if(!dialog.open)cleanup();});
  dialog.addEventListener('keydown',e=>{
    if(e.target.closest('input,textarea,select'))return;
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();change(playback.chapter+(e.key==='ArrowRight'?1:-1),true);}
    else if(e.key.toLowerCase()==='h'){e.preventDefault();q('#ad-clean').click();}
    else if(e.key===' '&&!e.target.closest('button,a')){e.preventDefault();q('#ad-pause').click();}
  });
  for(const name of ['pointerdown','pointermove','keydown','scroll','touchstart'])document.addEventListener(name,()=>{if(closed)arm();},{passive:true});
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden&&!closed)persist();else{dirty=true;arm();}});
  addEventListener('pagehide',()=>{if(!closed)persist();});addEventListener('focus',arm);addEventListener('resize',()=>{dirty=true;draw();});
  reduced.addEventListener('change',()=>{labels();dirty=true;draw();arm();});
  new MutationObserver(()=>{labels();dirty=true;arm();}).observe(document.body,{attributes:true,attributeFilter:['class']});
  labels();arm();
})();
