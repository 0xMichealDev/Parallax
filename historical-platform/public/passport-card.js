/* A share image from one saved research snapshot. No live fetch, account data or AI text. */
((root)=>{'use strict';
 const origin='https://parallaxlaunch.live',validPath=p=>typeof p==='string'&&/^\/research\/[a-f0-9]{64}$/.test(p)?p:null;
 const clean=(v,max=160)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max):'';
 const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const finite=v=>(typeof v==='number'||typeof v==='string'&&/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(v.trim()))&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null;
 function model(input){
  const p=input?.snapshot||{},m=p.market||{},c=p.chain||{},sources=Array.isArray(p.sources)?p.sources:[];
  const chain=!!p.chain&&sources.some(s=>s.id==='S1'&&s.status==='retrieved'),market=!!p.market&&sources.some(s=>s.id==='S2'&&s.status==='retrieved');
  const n=Date.parse(p.fetchedAt),collected=Number.isFinite(n)?new Date(n).toISOString().replace('T',' ').slice(0,19)+' UTC':'Collection time unavailable';
  const usd=v=>{const n=finite(v);return n===null?'Unavailable':n===0?'$0':n>=1e15||n<1e-8?'$'+n.toExponential(3):n<1?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumSignificantDigits:5}).format(n):new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',notation:n>=1e6?'compact':'standard',maximumFractionDigits:2}).format(n)};
  const supply=chain?finite(c.supply):null;
  const gaps=(Array.isArray(p.gaps)?p.gaps:[]).map(s=>clean(s,260)).filter(Boolean);
  const address=clean(p.address,64),hash=typeof input?.sha256==='string'&&/^[a-f0-9]{64}$/.test(input.sha256)?input.sha256:null;
  return {name:clean(m.name,80)||'Solana project',symbol:clean(m.symbol,16),address,collected,chain,market,gaps,hash,sharedPath:validPath(input?.sharedPath),
   metrics:[['TOKEN SUPPLY · ROUNDED',supply===null?'Unavailable':supply>=1e15||supply>0&&supply<.01?supply.toExponential(3):new Intl.NumberFormat('en-US',{notation:supply>=1e6?'compact':'standard',maximumFractionDigits:2}).format(supply),'Solana RPC [S1]'],['INDEXED PRICE',usd(market?m.priceUsd:null),'DEX Screener [S2]'],['PAIR LIQUIDITY',usd(market?m.liquidityUsd:null),'DEX Screener [S2]'],['24H PAIR VOLUME',usd(market?m.volume24hUsd:null),'DEX Screener [S2]']]};
 }
 function lines(value,width,max=2){const words=String(value).split(/\s+/),out=[];let line='';for(const word of words){if(line.length+word.length+1>width){out.push(line);line=''}line+=(line?' ':'')+word;}if(line)out.push(line);if(out.length>max)out[max-1]=out[max-1].slice(0,width-2)+'…';return out.slice(0,max);}
 const fit=(value,width,size)=>Math.min(size,width/Math.max(1,[...String(value)].reduce((sum,c)=>sum+(/[MW@#%]/.test(c)?.99:/[ilI1.,' :]/.test(c)?.34:/[^\u0000-\u007f]/.test(c)?1:.64),0)));
 function svg(input){const d=model(input),text=(v,x,y,size=18,color='#96abae',extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" ${extra}>${escape(v)}</text>`;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675" role="img" aria-label="${escape(d.name+' research snapshot collected '+d.collected)}"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#0d1c25"/><stop offset="1" stop-color="#060d15"/></linearGradient></defs><rect width="1200" height="675" fill="url(#bg)"/><path d="M1100 30a145 145 0 1 0 140 190M1120 5a170 170 0 1 0 150 255" fill="none" stroke="#87cbb8" stroke-opacity=".09" stroke-width="1"/><rect x="0" y="0" width="5" height="675" fill="#b1ddcc"/><g font-family="Arial,Helvetica,sans-serif">`;
  s+=text('PARALLAX',56,50,19,'#dcece4','letter-spacing="5"')+text('PROJECT PASSPORT  /  RESEARCH SNAPSHOT',1144,50,12,'#96abae','text-anchor="end" letter-spacing="2"');
  s+=text(d.name,56,134,fit(d.name,1040,49),'#f0f4ed','font-weight="600"');
  s+=text((d.symbol?d.symbol+'  /  ':'')+'SOLANA MAINNET',56,173,13,'#acd9c6','letter-spacing="2"')+text('COLLECTED '+d.collected,1144,173,12,'#a3b6bd','text-anchor="end"');
  s+=text(d.address||'Token address unavailable',56,217,17,'#a9bdc3','font-family="monospace"');
  d.metrics.forEach(([label,value,source],i)=>{const x=56+i*276;s+=`<rect x="${x}" y="249" width="260" height="132" rx="8" fill="#adcecb" fill-opacity=".045" stroke="#adcecb" stroke-opacity=".15"/>`;s+=text(label,x+18,278,11,'#8fa6af','letter-spacing="1"')+text(value,x+18,326,Math.min(31,Math.max(19,220/(value.length*.6))),value==='Unavailable'?'#8c9da7':'#e7eee8')+text(source,x+18,357,11,'#839ca9');});
  s+=text('SOURCE COVERAGE',56,420,11,'#8fa6af','letter-spacing="2"')+text('SOLANA RPC: '+(d.chain?'RECEIVED':'UNAVAILABLE'),56,449,13,d.chain?'#bbdacd':'#d2b98c')+text('DEX SCREENER: '+(d.market?'RECEIVED':'UNAVAILABLE'),430,449,13,d.market?'#bbdacd':'#d2b98c');
  const gap=d.gaps[0]||'This snapshot does not verify project identity, token safety or future performance.';
  lines(gap,115,2).forEach((line,i)=>s+=text(line,56,484+i*22,fit(line,1088,15),'#b5c1c4'));
  s+=text('Market figures describe one indexed pool. Missing data is not zero.',56,540,13,'#829aa5');
  s+=`<path d="M56 565H1144" stroke="#a0b5bd" stroke-opacity=".2"/>`+text('HISTORICAL DATA · NOT A SAFETY CERTIFICATION',56,600,12,'#adc2be','letter-spacing="1"');
  s+=text(d.hash?'Snapshot fingerprint: '+d.hash.slice(0,16)+'…':'Snapshot fingerprint unavailable',56,628,12,'#7d96a0','font-family="monospace"')+text('parallaxlaunch.live',1144,605,20,'#cde3d8','text-anchor="end"');
  return s+'</g></svg>';
 }
 function caption(input){const d=model(input);return `${d.name}${d.symbol?' · '+d.symbol:''}\nProject Passport snapshot collected ${d.collected}.\nToken: ${d.address}\nSource coverage: Solana RPC ${d.chain?'received':'unavailable'}; DEX Screener ${d.market?'received':'unavailable'}.\nHistorical data, not a safety certification.${d.sharedPath?'\nRead the source evidence: '+origin+d.sharedPath:''}`;}
 function mount(host,input){
  if(!host)return null;host._passportCleanup?.();host.replaceChildren();let data={...input},disposed=false,previewURL='';
  const doc=host.ownerDocument||document,node=(tag,cls,value)=>{const el=doc.createElement(tag);if(cls)el.className=cls;if(value!==undefined)el.textContent=value;return el};
  const details=node('details','passport-card-tools'),summary=node('summary','','Share a research card'),intro=node('p','passport-card-note','A card from this exact saved snapshot. Downloading it does not create a public report link.');
  const preview=node('img','passport-card-preview');preview.width=1200;preview.height=675;preview.alt=model(data).name+' research card, collected '+model(data).collected;
  previewURL=URL.createObjectURL(new Blob([svg(data)],{type:'image/svg+xml'}));preview.src=previewURL;
  const actions=node('div','passport-card-actions'),download=node('button','','Download PNG ↓'),copy=node('button','','Copy post text'),status=node('p','passport-card-status'),note=node('p','passport-card-note');download.type=copy.type='button';status.setAttribute('role','status');
  const shareState=()=>{const shared=validPath(data.sharedPath);copy.disabled=!shared;note.textContent=shared?'Post text includes your public evidence link. Attach the downloaded PNG when you share.':'Create a shareable link above to enable post text with the source evidence. Your report stays private until you choose to share it.';intro.textContent=shared?'A card from this exact saved snapshot. Anyone with its shared link can review the full evidence.':'A card from this exact saved snapshot. Downloading it does not create a public report link.';};
  download.onclick=async()=>{download.disabled=true;status.textContent='Preparing PNG…';try{
   await preview.decode();if(disposed)return;const canvas=doc.createElement('canvas');canvas.width=1200;canvas.height=675;const ctx=canvas.getContext('2d');if(!ctx)throw Error('PNG export is unavailable in this browser.');ctx.drawImage(preview,0,0,1200,675);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('PNG export could not finish. Please retry.');if(disposed)return;
   const url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='PARALLAX-Passport-'+(model(data).symbol||model(data).address.slice(0,8)||'research').replace(/[^a-z0-9_-]/gi,'').slice(0,24)+'.png';doc.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);status.textContent='PNG downloaded. It contains this saved snapshot, not live prices.';
  }catch(e){if(!disposed)status.textContent=e.message||'Could not export the card. Please retry.';}finally{download.disabled=false}};
  copy.onclick=async()=>{if(!validPath(data.sharedPath))return;try{await navigator.clipboard.writeText(caption(data));status.textContent='Post text copied. Attach your downloaded research card.';}catch{status.textContent=caption(data);}};
  actions.append(download,copy);details.append(summary,intro,preview,actions,note,status);host.append(details);shareState();
  host._passportCleanup=()=>{disposed=true;URL.revokeObjectURL(previewURL)};
  return {setSharedPath(path){data.sharedPath=validPath(path);shareState();},dispose:host._passportCleanup};
 }
 const api={model,svg,caption,mount};root.ParallaxPassportCard=api;
 if(typeof document!=='undefined'){const payload=document.getElementById('shared-card-data'),host=document.getElementById('shared-card-tools');if(payload&&host){try{const data=JSON.parse(payload.textContent);mount(host,data);host.querySelector('details').open=true;}catch{host.textContent='The research card could not load. The original report is available below.';}}}
})(typeof window==='undefined'?globalThis:window);
