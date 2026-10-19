(()=>{'use strict';
const badges=Array.from(document.querySelectorAll('[data-pro-member-badge]'));if(!badges.length)return;
let epoch=0,working=false,lastChecked=0,suppressed=false;
function show(state,detail,title){
 for(const badge of badges){badge.hidden=false;badge.dataset.state=state;badge.classList.toggle('is-active',state==='active');badge.title=title;badge.setAttribute('aria-label',title);const label=badge.querySelector('[data-pro-detail]');if(label)label.textContent=detail;badge.href=state==='signin'?'/signin-with-chatgpt?return_to=%2Fpro':'/pro';}
 document.body.classList.toggle('has-pro-membership',state==='active');
}
function set(value){
 if(value?.eligible===true&&typeof value.wallet==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.wallet)){show('active','MEMBER','Verified Parallax Pro member · '+value.wallet.slice(0,6)+'…'+value.wallet.slice(-4)+' · Open your workspace');return;}
 if(value?.eligible===false){show('holdings','Check','Parallax Pro · Holding requirement not met. Open Pro to review access.');return;}
 show('verify','Verify','Parallax Pro · Verify your wallet to check membership.');
}
window.ParallaxProMembership={set};
const isPro=document.body.dataset.workspacePage==='pro';
if(isPro){set(window.ParallaxProMemberState||null);return;}
async function refresh(){
 if(working||suppressed||document.hidden||Date.now()-lastChecked<60000)return;
 working=true;lastChecked=Date.now();const turn=epoch;
 try{
  const s=await fetch('/api/session',{credentials:'same-origin',cache:'no-store'});if(!s.ok)throw Error();const session=await s.json();if(turn!==epoch)return;
  if(!session.signedIn){show('signin','Sign in','Sign in to check your Parallax Pro membership.');return;}
  if(!session.wallet){set(null);return;}
  const r=await fetch('/api/pro/status',{credentials:'same-origin',cache:'no-store'});const member=await r.json();if(turn!==epoch)return;
  if(r.status===401){show('signin','Sign in','Sign in again to check your Parallax Pro membership.');return;}
  if(r.status===403&&member.code==='verify'){set(null);return;}
  if(!r.ok)throw Error();set(member);
 }catch{if(turn===epoch)show('unavailable','Retry','Pro membership could not be checked. Open Pro to retry.');}finally{working=false;}
}
const clear=()=>{epoch++;suppressed=true;set(null);};
const provider=window.phantom?.solana;provider?.on?.('accountChanged',clear);provider?.on?.('disconnect',clear);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('focus',refresh);setInterval(refresh,60000);
show('checking','Check','Checking your Parallax Pro membership…');refresh();
})();
