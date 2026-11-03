const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(path,hash='',search=''){
 const link=href=>({attrs:{href},getAttribute(k){return this.attrs[k]},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},closest(){return null}});
 const sidebar=['/','/workspace','/?view=dashboard','/projects','/control','/control#wallet','/explore','/explore#walk-on-earth'].map(link);
 const mobile=['/','/terminal','/explore#walk-on-earth','/workspace','/control#wallet','/#tools'].map(link);
 const sections=['/workspace','/observatory','/control#wallet','/workspace#alerts','/control#vault','/briefing'].map(link);
 const nav=items=>({querySelectorAll:()=>items,querySelector:()=>items.at(-1)}),events={};
 const location={pathname:path,hash,search};
 vm.runInNewContext(fs.readFileSync('public/dashboard-pro.js','utf8'),{location,document:{getElementById:()=>null,querySelectorAll:()=>[],querySelector:s=>s==='.dashboard-sidebar'?nav(sidebar):s==='.mobile-dock'?nav(mobile):s==='.workspace-section-nav'?nav(sections):null},window:{addEventListener:(e,fn)=>events[e]=fn}});
 return {location,events,current:items=>items.filter(l=>l.attrs['aria-current']==='page').map(l=>l.attrs.href),sidebar,mobile,sections};
}
test('wallet fragment navigation falls back to the page when selecting another section',()=>{
 const h=setup('/control','#wallet');assert.deepEqual(h.current(h.sidebar),['/control#wallet']);
 h.location.hash='#compare';h.events.hashchange();assert.deepEqual(h.current(h.sidebar),['/control']);assert.deepEqual(h.current(h.mobile),['/#tools']);
});
test('custom dashboard and walking keep the correct destination highlighted',()=>{
 const h=setup('/','','?view=dashboard');assert.deepEqual(h.current(h.sidebar),['/?view=dashboard']);
 const w=setup('/explore','#walk-on-earth');assert.deepEqual(w.current(w.mobile),['/explore#walk-on-earth']);
 w.location.hash='';w.events.hashchange();assert.deepEqual(w.current(w.sidebar),['/explore']);assert.deepEqual(w.current(w.mobile),['/#tools']);
});
test('individual project pages retain their parent navigation',()=>{
 const h=setup('/projects/gatto');assert.deepEqual(h.current(h.sidebar),['/projects']);assert.deepEqual(h.current(h.mobile),['/#tools']);
});

test('workspace children retain one parent and identify their own section',()=>{
 for(const [path,hash,section] of [['/observatory','','/observatory'],['/following','','/observatory'],['/briefing','','/briefing'],['/control','#vault','/control#vault'],['/control','#wallet','/control#wallet'],['/observatory','#liquidity','/workspace#alerts'],['/workspace','#alerts','/workspace#alerts']]){
  const h=setup(path,hash);const control=path==='/control';assert.deepEqual(h.current(h.sidebar),[control?(hash==='#wallet'?'/control#wallet':'/control'):'/workspace']);assert.deepEqual(h.current(h.mobile),[control?(hash==='#wallet'?'/control#wallet':'/#tools'):'/workspace']);assert.deepEqual(h.current(h.sections),[section]);
 }
});
test('changing research tabs updates workspace parent without trapping Passport navigation',()=>{
 const h=setup('/control','#vault');assert.deepEqual(h.current(h.sections),['/control#vault']);h.location.hash='#passport';h.events.hashchange();assert.deepEqual(h.current(h.sidebar),['/control']);assert.deepEqual(h.current(h.sections),[]);
});
