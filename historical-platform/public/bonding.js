/* Fixed PRLX milestone. No wallet prompts, writes, or client-side status overrides. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id), root=$('summit');if(!root)return;
 const mint='8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),dialog=$('summit-celebration'),shareDialog=$('summit-share-dialog');
 let current=null,busy=false,lastRequest=0,visible=true,shown=false,closeTimer=0,pending=false,returnFocus=null,audio=null,cardBlob=null,cardURL=null,post='',cardEpoch=0;
 const date=value=>new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
 const verified=s=>s?.state==='live'&&s.celebrate===true&&!!s.proof&&/^[1-9A-HJ-NP-Za-km-z]{64,88}$/.test(s.proof.signature)&&Number.isFinite(Date.parse(s.proof.migratedAt));
 const staticMotion=()=>reduced.matches||document.body.classList.contains('motion-paused')||navigator.connection?.saveData;
 const seenKey=s=>'parallax.summit.seen.v1.'+s.proof.signature;
 function seen(s){try{return localStorage.getItem(seenKey(s))==='1';}catch{return shown;}}
 function text(id,value){$(id).textContent=value;}
 function fresh(s){return s?.freshness==='verified-history'||s?.freshness==='fresh'&&Date.now()-Date.parse(s.checkedAt)<=120000;}
 function render(s){
  const live=verified(s),stale=!fresh(s),p=Number.isFinite(s.percent)?Math.max(0,Math.min(s.percent,100)):null;
  root.dataset.state=live?'live':s.state;document.body.classList.toggle('summit-bonded',live);
  root.style.setProperty('--summit-power',live?'1':stale?'.12':String(.12+(p||0)/100*.7));
  text('summit-kicker',live?'A MILESTONE, MADE TOGETHER':s.state==='migrating'?'CURVE COMPLETE / VERIFYING MIGRATION':'THE NEXT PARALLAX MILESTONE');
  text('summit-title',live?'One summit. A new horizon.':s.state==='migrating'?'The next chapter is opening.':'The climb continues.');
  text('summit-intro',live?'PARALLAX has migrated to PumpSwap. Thank you for making this milestone possible. We keep building from here.':'A community building toward its next chapter. Follow the journey from the bonding curve to PumpSwap.');
  text('summit-percent',p===null?'—':(p===100?'100':p.toFixed(1))+'%');
  text('summit-meter-label',live?'Bonding curve complete':stale&&s.checkedAt?'Last recorded progress':p===100?'Bonding curve complete':'Estimated bonding progress');
  const bar=$('summit-progress');bar.querySelector('i').style.width=(p||0)+'%';
  if(p!==null)bar.setAttribute('aria-valuenow',String(p));else bar.removeAttribute('aria-valuenow');
  bar.setAttribute('aria-valuetext',p===null?'Progress unavailable':`${p}%${s.estimated?' estimated':''}${stale?' · last recorded':''}`);
  let status=live?'Migration verified · '+date(s.proof.migratedAt):!s.checkedAt?'Chain data is temporarily unavailable. Checking again shortly.':(stale?'Updates delayed · Last checked ':'Checked ')+date(s.checkedAt);
  if(s.state==='migrating')status+=' · Waiting for migration verification.';
  text('summit-status',status);
  text('summit-curve-record',s.checkedAt?(s.percent===100?'Curve completion verified':'Curve status observed')+' · '+date(s.checkedAt)+(s.slot?' · Solana slot '+s.slot.toLocaleString():''):'No verified curve snapshot yet.');
  text('summit-migration-record',live?'Finalized migration · '+date(s.proof.migratedAt)+'. ':s.state==='migrating'?'Curve complete. Verifying the canonical pool and finalized migration transaction.':'Migration has not been verified.');
  $('summit-proof').hidden=!live;if(live)$('summit-proof').href='https://solscan.io/tx/'+s.proof.signature;
  if(live&&s.community)text('summit-community-record',s.community.visitors.toLocaleString()+' estimated unique browsers · '+s.community.pageViews.toLocaleString()+' recorded page views. Captured '+date(s.community.capturedAt)+', when PARALLAX recorded the milestone; not a reconstruction of traffic at the transaction time.');
  text('summit-source-record',live?'Finalized migration evidence is permanently saved. Verified '+date(s.proof.verifiedAt)+'.': 'Refreshes every 30 seconds while visible. Percentage is an estimate; finalization and provider delays can lag Pump.fun.');
  root.querySelectorAll('[data-summit-stage]').forEach(el=>{const active=el.dataset.summitStage===s.state;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
  $('summit-replay').hidden=!live;text('summit-share',live?'Share the milestone ↗':'Share the climb ↗');
  $('summit-market-link').href=live?'https://swap.pump.fun/?input=So11111111111111111111111111111111111111112&output='+mint:'https://pump.fun/coin/'+mint;
  text('summit-market-link',live?'View on PumpSwap ↗':'View on Pump.fun ↗');
  if(live&&!shown&&!seen(s))pending=true;
  maybeCelebrate();
 }
 async function refresh(){
  if(busy||document.hidden||Date.now()-lastRequest<10000)return;
  busy=true;lastRequest=Date.now();$('summit-refresh').disabled=true;
  try{const r=await fetch('/api/bonding',{cache:'no-store',signal:AbortSignal.timeout(45000)});if(!r.ok)throw new Error();const s=await r.json();if(s.mint!==mint||!['unknown','bonding','migrating','live'].includes(s.state))throw new Error();current=s;render(s);}
  catch{if(current){current={...current,freshness:verified(current)?'verified-history':'stale'};render(current);}else text('summit-status','Live data is temporarily unavailable. Use the official token link or retry shortly.');}
  finally{busy=false;$('summit-refresh').disabled=false;}
 }
 function stopSound(){if(audio){audio.close().catch(()=>{});audio=null;}text('summit-sound','Play celebration sound');}
 function closeCelebration(){clearTimeout(closeTimer);stopSound();dialog.close();returnFocus?.focus?.({preventScroll:true});}
 function celebrate(manual=false){
  if(!verified(current)||dialog.open||shareDialog.open)return;
  if(!manual&&(document.hidden||!visible||document.querySelector('dialog[open],[aria-modal="true"]')||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable))return;
  returnFocus=document.activeElement;dialog.classList.toggle('summit-static',!!staticMotion());
  dialog.showModal();shown=true;pending=false;try{localStorage.setItem(seenKey(current),'1');}catch{}
  text('summit-skip',staticMotion()?'Continue ✕':'Skip ✕');
  if(!staticMotion())closeTimer=setTimeout(closeCelebration,7000);
 }
 function maybeCelebrate(){if(pending&&!shown)celebrate();}
 $('summit-skip').onclick=closeCelebration;dialog.addEventListener('cancel',e=>{e.preventDefault();closeCelebration();});
 dialog.addEventListener('close',()=>{clearTimeout(closeTimer);stopSound();});
 $('summit-replay').onclick=()=>celebrate(true);
 $('summit-sound').onclick=async()=>{
  if(audio){stopSound();return;}
  try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;audio=new Audio();await audio.resume();
   const start=audio.currentTime;[261.63,329.63,392,523.25].forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=f;o.connect(g);g.connect(audio.destination);g.gain.setValueAtTime(0,start);g.gain.linearRampToValueAtTime(.045,start+.08+i*.18);g.gain.exponentialRampToValueAtTime(.0001,start+2.2+i*.18);o.start(start+i*.18);o.stop(start+3);});text('summit-sound','Stop sound');
  }catch{stopSound();text('summit-sound','Sound unavailable');}
 };
 function shareText(s){return verified(s)?'I was here for the PARALLAX bonding milestone. $PRLX has migrated to PumpSwap. Research. Create. Explore. The next chapter starts here. https://parallaxlaunch.live/#summit':'Following the PARALLAX journey: project discovery, Solana research, and creator worlds. Track the $PRLX bonding milestone with us. https://parallaxlaunch.live/#summit';}
 function wrap(ctx,value,x,y,maxWidth,lineHeight){let line='';for(const word of value.split(' ')){const next=line?line+' '+word:word;if(ctx.measureText(next).width>maxWidth&&line){ctx.fillText(line,x,y);y+=lineHeight;line=word;}else line=next;}ctx.fillText(line,x,y);return y+lineHeight;}
 async function buildCard(){
  const epoch=++cardEpoch,s=current?JSON.parse(JSON.stringify(current)):null,live=verified(s),canvas=$('summit-share-canvas'),ctx=canvas.getContext('2d');
  cardBlob=null;$('summit-download').hidden=true;$('summit-native-share').hidden=true;
  post=shareText(s);text('summit-share-copy',post);$('summit-x').href='https://twitter.com/intent/tweet?text='+encodeURIComponent(post);text('summit-share-status','Preparing your image…');
  if(!ctx){text('summit-share-status','Image export is unavailable in this browser. You can still copy or post the text.');return;}
  ctx.fillStyle='#07100f';ctx.fillRect(0,0,1200,675);
  try{const img=new Image();img.src='/assets/bonding/summit-1672.webp';await img.decode();if(epoch!==cardEpoch)return;ctx.drawImage(img,0,0,1200,675);}catch{}
  const gradient=ctx.createLinearGradient(0,0,1200,0);gradient.addColorStop(0,'rgba(4,12,10,.98)');gradient.addColorStop(.47,'rgba(4,12,10,.8)');gradient.addColorStop(1,'rgba(4,12,10,.08)');ctx.fillStyle=gradient;ctx.fillRect(0,0,1200,675);
  ctx.fillStyle='#b6f5df';ctx.font='500 20px sans-serif';ctx.fillText('P A R A L L A X   /   $ P R L X',64,74);
  ctx.font='500 62px sans-serif';ctx.fillStyle='#effff7';wrap(ctx,live?'I was here for the summit.':'The climb continues.',64,214,570,68);
  ctx.fillStyle='#b8d6c9';ctx.font='24px sans-serif';wrap(ctx,live?'Bonding complete. Migration to PumpSwap verified.':'A community building its next chapter.',64,408,520,34);
  ctx.font='16px sans-serif';ctx.fillStyle='#c6ddd3';
  const stamp=live?'MIGRATED '+new Date(s.proof.migratedAt).toISOString().replace('T',' ').slice(0,19)+' UTC':s?.checkedAt?(fresh(s)?'SNAPSHOT ':'LAST RECORDED ')+new Date(s.checkedAt).toISOString().replace('T',' ').slice(0,19)+' UTC':'FOLLOW THE LIVE MILESTONE TRACKER';
  ctx.fillText(stamp,64,520);if(!live&&Number.isFinite(s?.percent)){ctx.fillText((s.percent===100?'CURVE COMPLETE · MIGRATION NOT YET VERIFIED':s.percent.toFixed(1)+'% ESTIMATED BONDING PROGRESS'),64,552);}
  ctx.strokeStyle='#b6f5df55';ctx.beginPath();ctx.moveTo(64,585);ctx.lineTo(1136,585);ctx.stroke();ctx.font='18px sans-serif';ctx.fillStyle='#edf7f1';ctx.fillText('RESEARCH. CREATE. EXPLORE.',64,625);ctx.textAlign='right';ctx.fillText('parallaxlaunch.live',1136,625);ctx.textAlign='left';
  canvas.setAttribute('aria-label',(live?'PARALLAX bonding complete, migration verified.':'PARALLAX — the climb continues.')+' '+stamp);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(epoch!==cardEpoch||!blob)return;
  if(cardURL)URL.revokeObjectURL(cardURL);cardBlob=blob;cardURL=URL.createObjectURL(blob);$('summit-download').href=cardURL;$('summit-download').hidden=false;
  const file=new File([blob],'parallax-summit.png',{type:'image/png'});$('summit-native-share').hidden=!navigator.canShare?.({files:[file]});text('summit-share-status','Ready. Save the PNG, share the image, or open your X draft.');
 }
 $('summit-share').hidden=false;$('summit-refresh').hidden=false;
 $('summit-share').onclick=()=>{returnFocus=document.activeElement;shareDialog.showModal();buildCard().catch(()=>text('summit-share-status','Image export failed. You can still copy or post the text.'));};
 $('summit-share-close').onclick=()=>shareDialog.close();shareDialog.addEventListener('close',()=>returnFocus?.focus?.({preventScroll:true}));
 $('summit-native-share').onclick=async()=>{if(!cardBlob)return;try{await navigator.share({files:[new File([cardBlob],'parallax-summit.png',{type:'image/png'})],title:'PARALLAX / The Summit',text:post});}catch(e){if(e.name!=='AbortError')text('summit-share-status','Sharing is unavailable. Use Download PNG instead.');}};
 $('summit-copy-post').onclick=async()=>{try{await navigator.clipboard.writeText(post);text('summit-share-status','Post copied.');}catch{text('summit-share-status','Select and copy the post above.');}};
 $('summit-refresh').onclick=refresh;
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;document.body.classList.toggle('summit-offscreen',!visible);maybeCelebrate();}).observe(root);
 document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('summit-tab-hidden',document.hidden);if(document.hidden){if(dialog.open)closeCelebration();}else refresh();});
 reduced.addEventListener?.('change',()=>{if(dialog.open&&staticMotion()){clearTimeout(closeTimer);dialog.classList.add('summit-static');text('summit-skip','Continue ✕');}});
 setInterval(()=>{if(!document.hidden){if(current&&!fresh(current)&&!verified(current))render(current);maybeCelebrate();}},2000);
 setInterval(refresh,30000);refresh();
})();
