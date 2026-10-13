(() => {
  'use strict';
  const $=id=>document.getElementById(id),form=$('home-research-form');if(!form)return;
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const prlx='8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump';
  let signedIn=false;
  async function api(action,body){const r=await fetch('/api/control/'+action,{method:body===undefined?'GET':'POST',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error||'Research is temporarily unavailable.');return d;}
  $('home-use-prlx').onclick=()=>{$('home-mint').value=prlx;$('home-mint').focus();};
  form.onsubmit=async event=>{event.preventDefault();const address=$('home-mint').value.trim();if(!signedIn){location.assign('/control?mint='+encodeURIComponent(address));return;}
    const button=$('home-research-submit'),message=$('home-research-status');button.disabled=true;button.textContent='Collecting…';message.dataset.error='false';message.textContent='Fetching sources and saving your passport…';
    try{const r=await api('passport',{address});location.assign('/control?report='+encodeURIComponent(r.id));}catch(error){message.textContent=error.message;message.dataset.error='true';button.disabled=false;button.textContent='Create passport ↗';}
  };
  (async()=>{try{const state=await api('status');signedIn=state.signedIn;
    if(!signedIn)return;
    $('home-research-submit').textContent='Create passport ↗';$('home-research-note').textContent='Private until you choose to share';$('home-account').textContent='Open all reports ↗';$('home-account').href='/control#vault';
    const {reports}=await api('reports');
    $('home-recent-heading').textContent=reports.length?'Pick up your research.':'Your first passport awaits.';
    $('home-recent-list').innerHTML=reports.length?reports.slice(0,3).map(r=>`<a class="home-report-item" href="/control?report=${encodeURIComponent(r.id)}"><strong>${escape(r.name||r.symbol||'Project Passport')} ↗</strong><code>${escape(r.address.slice(0,8)+'…'+r.address.slice(-6))}</code><small>${escape(new Date(r.createdAt).toLocaleString())}</small></a>`).join(''):'<p>Research a token to start your history. Save another snapshot later to see what changed.</p>';
  }catch{$('home-recent-list').textContent='Open Mission Control to check your saved research.';}})();
})();
