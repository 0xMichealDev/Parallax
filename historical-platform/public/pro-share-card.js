(()=>{'use strict';
const card=document.getElementById('pro-member-card');if(!card)return;
const panel=document.createElement('div');panel.className='pro-member-share';panel.hidden=true;
panel.innerHTML='<div class="pro-share-actions"><button type="button" id="pro-card-download">Download gold card</button><a id="pro-card-x" class="pro-button" target="_blank" rel="noopener noreferrer">Share on X ↗</a></div><p id="pro-card-share-status" role="status" aria-live="polite">A gold card for your timeline. Your wallet address and balance stay private.</p>';
card.after(panel);
const download=panel.querySelector('#pro-card-download'),share=panel.querySelector('#pro-card-x'),status=panel.querySelector('#pro-card-share-status');
const caption='My access. Elevated. I’m a Parallax Pro member.\n\nWallet Watch. Project monitoring. A workspace unlocked by holding $PRLX.';
share.href='https://twitter.com/intent/tweet?'+new URLSearchParams({text:caption,url:'https://parallaxlaunch.live/pro'});
let imageURL=null,generation=0,active=false,stamp='';
function revoke(){if(imageURL)URL.revokeObjectURL(imageURL);imageURL=null;}
function rounded(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function artwork(date){
 const canvas=document.createElement('canvas');canvas.width=1600;canvas.height=900;const c=canvas.getContext('2d');if(!c)throw Error('Canvas unavailable');
 c.fillStyle='#080e12';c.fillRect(0,0,1600,900);
 const halo=c.createRadialGradient(1150,260,20,1000,300,800);halo.addColorStop(0,'#66502b66');halo.addColorStop(1,'#080e1200');c.fillStyle=halo;c.fillRect(0,0,1600,900);
 rounded(c,85,80,1430,740,36);c.save();c.clip();
 const bg=c.createLinearGradient(100,100,1420,800);bg.addColorStop(0,'#41351f');bg.addColorStop(.42,'#171a17');bg.addColorStop(1,'#302718');c.fillStyle=bg;c.fillRect(85,80,1430,740);
 c.strokeStyle='#edcf8220';c.lineWidth=1;for(let x=-800;x<1700;x+=9){c.beginPath();c.moveTo(x,820);c.lineTo(x+600,80);c.stroke();}
 const planet=c.createRadialGradient(1150,330,5,1250,430,220);planet.addColorStop(0,'#bca15f');planet.addColorStop(.35,'#6a5931');planet.addColorStop(.72,'#302c20');planet.addColorStop(1,'#101713');c.fillStyle=planet;c.beginPath();c.arc(1250,430,215,0,Math.PI*2);c.fill();
 for(let i=0;i<3;i++){c.strokeStyle=['#e3c57399','#d7b76a66','#d7b76a33'][i];c.lineWidth=2;c.beginPath();c.ellipse(1250,430,345+i*24,110+i*40,-.65,0,Math.PI*2);c.stroke();}
 c.restore();rounded(c,85,80,1430,740,36);c.strokeStyle='#d2b166';c.lineWidth=2;c.stroke();
 c.fillStyle='#f5e5bd';c.font='600 27px system-ui, sans-serif';c.fillText('P A R A L L A X',155,168);
 rounded(c,1190,127,250,56,9);c.fillStyle='#6d542955';c.fill();c.strokeStyle='#d2b16688';c.lineWidth=1;c.stroke();c.font='600 21px system-ui, sans-serif';c.fillStyle='#ffe5ab';c.fillText('★  PRO MEMBER',1215,164);
 c.font='400 92px system-ui, sans-serif';c.fillStyle='#e4d5b6';c.fillText('Your access.',155,360);c.font='600 112px system-ui, sans-serif';c.fillStyle='#ffe9b3';c.fillText('Elevated.',150,485);
 c.font='400 24px system-ui, sans-serif';c.fillStyle='#c6b693';c.fillText('THE ONCHAIN OBSERVATORY',157,553);
 c.beginPath();c.moveTo(155,645);c.lineTo(1445,645);c.strokeStyle='#d1b57355';c.stroke();
 c.fillStyle='#c5af7c';c.font='500 17px ui-monospace, monospace';c.fillText('VERIFIED PRLX HOLDER',155,696);
 c.font='500 25px system-ui, sans-serif';c.fillStyle='#f4dfaa';c.fillText('parallaxlaunch.live',155,742);
 c.textAlign='right';c.fillStyle='#e9cf92';c.font='500 21px system-ui, sans-serif';c.fillText('MEMBERSHIP SNAPSHOT',1443,697);c.font='400 18px ui-monospace, monospace';c.fillStyle='#bca982';c.fillText(date,1443,739);
 return canvas;
}
function set(member){
 const eligible=member?.eligible===true&&typeof member.wallet==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(member.wallet);
 panel.hidden=!eligible;active=eligible;
 if(!eligible){generation++;stamp='';revoke();return;}
 const checked=new Date(member.checkedAt);const date=Number.isFinite(checked.getTime())?checked.toISOString().slice(0,10)+' UTC':new Date().toISOString().slice(0,10)+' UTC';
 if(stamp===date&&imageURL)return;stamp=date;const token=++generation;revoke();download.disabled=true;share.setAttribute('aria-disabled','true');
 try{artwork(date).toBlob(blob=>{if(token!==generation||!active)return;if(!blob){failed();return;}imageURL=URL.createObjectURL(blob);download.disabled=false;share.removeAttribute('aria-disabled');},'image/png');}catch{failed();}
}
function failed(){stamp='';status.textContent='The image could not be prepared in this browser. Recheck holdings to retry.';}
function save(){if(!active||!imageURL)return false;const a=document.createElement('a');a.href=imageURL;a.download='PARALLAX-Pro-Member.png';document.body.append(a);a.click();a.remove();return true;}
download.addEventListener('click',()=>{if(save())status.textContent='Gold card saved. Attach PARALLAX-Pro-Member.png to your X post.';});
share.addEventListener('click',event=>{if(!save()){event.preventDefault();status.textContent='Your card is still preparing. Please try again in a moment.';return;}status.textContent='Your card is downloading and your X draft is opening. Attach the downloaded PNG before posting.';});
window.addEventListener('pagehide',()=>{generation++;stamp='';revoke();});
window.addEventListener('pageshow',()=>set(window.ParallaxProMemberState));
window.ParallaxProShare={set};set(window.ParallaxProMemberState);
})();
