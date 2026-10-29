(()=>{'use strict';
const body=document.body,page=body.dataset.workspacePage;
const main=document.querySelector('main');if(!main)return;
const frame=document.createElement('div');frame.className='gold-site-frame';frame.hidden=true;frame.setAttribute('aria-hidden','true');body.append(frame);
let active=false,firstName='',welcome=null,finishes=null,arrived=false;
let finish='champagne';try{const saved=localStorage.getItem('parallax-gold-finish');if(['champagne','obsidian','warm'].includes(saved))finish=saved;}catch{}
const labels={champagne:'Champagne',obsidian:'Obsidian',warm:'Warm gold'};
const hero=document.querySelector('.pro-hero h1'),lead=document.querySelector('.pro-lead');
const originalHero=hero?.innerHTML,originalLead=lead?.textContent;
if(['pro','control','creator','following'].includes(page)){
 welcome=document.createElement('section');welcome.className='gold-welcome';welcome.hidden=true;welcome.setAttribute('aria-label','Your Gold workspace');
 welcome.innerHTML='<div class="gold-welcome-copy"><span class="gold-eyebrow">PARALLAX / GOLD MEMBER</span><h2 data-gold-greeting>Welcome back.</h2><p>Your tools. Your perspective. Your place in the observatory.</p></div><a class="gold-welcome-link" href="/pro">Your Gold workspace <span aria-hidden="true">↗</span></a>';
 main.prepend(welcome);
}
const card=document.getElementById('pro-member-card');
if(card){
 finishes=document.createElement('fieldset');finishes.className='gold-finishes';finishes.hidden=true;
 const legend=document.createElement('legend');legend.textContent='Make it yours';finishes.append(legend);
 for(const [key,label]of Object.entries(labels)){const button=document.createElement('button');button.type='button';button.className='gold-finish';button.dataset.finish=key;button.textContent=label;button.setAttribute('aria-pressed',String(key===finish));button.addEventListener('click',()=>{if(!active)return;finish=key;try{localStorage.setItem('parallax-gold-finish',finish);}catch{}applyFinish();window.dispatchEvent(new CustomEvent('parallax-gold-finish'));});finishes.append(button);}
 card.after(finishes);
 const workspace=document.getElementById('pro-workspace');
 if(workspace){const benefits=document.createElement('nav');benefits.className='gold-tool-links';benefits.setAttribute('aria-label','Make the most of Pro');benefits.innerHTML='<a href="#pro-add"><span>01 / MONITOR</span><strong>Keep your signal close <b aria-hidden="true">↗</b></strong><p>Your wallets and projects, together.</p></a><a href="/control"><span>02 / RESEARCH</span><strong>Follow the evidence <b aria-hidden="true">↗</b></strong><p>Open Wallet Watch and Project Passports.</p></a><a href="#pro-member-card"><span>03 / MAKE IT YOURS</span><strong>Carry your Gold card <b aria-hidden="true">↗</b></strong><p>Choose a finish. Share your membership.</p></a>';workspace.prepend(benefits);}
}
function applyFinish(){body.dataset.goldFinish=finish;window.ParallaxGoldFinish=finish;finishes?.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.finish===finish)));}
function session(value){firstName=typeof value?.firstName==='string'?value.firstName.slice(0,32):'';if(welcome)welcome.querySelector('[data-gold-greeting]').textContent=firstName?'Welcome back, '+firstName+'.':'Welcome back.';}
function set(value){active=value?.eligible===true&&typeof value.wallet==='string'&&/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value.wallet);frame.hidden=!active;if(welcome)welcome.hidden=!active;if(finishes)finishes.hidden=!active;body.classList.toggle('gold-member-active',active);
 if(hero)hero.innerHTML=active?'Your Gold workspace.':originalHero;
 if(lead)lead.textContent=active?'Your membership is active. Open your tools or manage your access below.':originalLead;
 if(active&&!arrived){arrived=true;body.classList.add('gold-arrival');}
}
window.ParallaxGold={set,session};applyFinish();session(window.ParallaxProSession);set(window.ParallaxProMemberState);window.dispatchEvent(new CustomEvent('parallax-gold-finish'));
})();
