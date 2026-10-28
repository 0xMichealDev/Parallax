(()=>{'use strict';
const input=document.getElementById('docs-search'),results=document.getElementById('docs-search-results'),reading=document.getElementById('docs-reading'),status=document.getElementById('docs-search-status'),empty=document.getElementById('docs-search-empty');
if(!input||!results||!reading)return;
document.querySelector('[data-search-control]').hidden=false;
const cards=[...results.querySelectorAll('[data-doc-result]')];
function search(){const words=input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);const searching=words.length>0;results.hidden=!searching;reading.hidden=searching;let count=0;for(const card of cards){const match=words.every(word=>card.dataset.search.includes(word));card.hidden=!match;if(match)count++;}status.textContent=searching?count+' guide'+(count===1?'':'s')+' found.':'';empty.hidden=count!==0;}
input.addEventListener('input',search);
document.getElementById('docs-search-clear').onclick=()=>{input.value='';search();input.focus();};
input.addEventListener('keydown',event=>{if(event.key==='Escape'){input.value='';search();}});
})();
