(()=>{'use strict';
const badges=Array.from(document.querySelectorAll('[data-pro-member-badge]'));if(!badges.length)return;
let epoch=0,working=false,lastChecked=0,suppressed=false;
function set(value){const active=value?.eligible===true;for(const badge of badges){badge.hidden=!active;badge.title=active?'Verified Pro holder · '+value.wallet.slice(0,6)+'…'+value.wallet.slice(-4):'';}document.body.classList.toggle('has-pro-membership',active);}
window.ParallaxProMembership={set};
const isPro=document.body.dataset.workspacePage==='pro';if(isPro){set(window.ParallaxProMemberState||null);return;}
async function refresh(){if(working||suppressed||document.hidden||Date.now()-lastChecked<60000)return;working=true;lastChecked=Date.now();const turn=epoch;try{const s=await fetch('/api/session',{credentials:'same-origin',cache:'no-store'});if(!s.ok)throw Error();const session=await s.json();if(turn!==epoch)return;if(!session.signedIn||!session.wallet){set(null);return;}const r=await fetch('/api/pro/status',{credentials:'same-origin',cache:'no-store'});if(!r.ok)throw Error();const member=await r.json();if(turn===epoch)set(member);}catch{if(turn===epoch)set(null);}finally{working=false;}}
const provider=window.phantom?.solana;const clear=()=>{epoch++;suppressed=true;set(null);};provider?.on?.('accountChanged',clear);provider?.on?.('disconnect',clear);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});window.addEventListener('focus',refresh);setInterval(refresh,60000);refresh();
})();
