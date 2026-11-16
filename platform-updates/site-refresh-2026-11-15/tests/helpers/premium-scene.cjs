const fs=require('node:fs'),vm=require('node:vm');
const sceneScript=fs.readFileSync('public/premium-scene.js','utf8');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function clock(){
 let now=0,sequence=0;const timers=new Map();
 return{setTimeout(fn,delay){const id=++sequence;timers.set(id,{fn,at:now+delay});return id},clearTimeout(id){timers.delete(id)},
 async advance(ms){const end=now+ms;for(;;){await settle();const next=[...timers].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;timers.delete(next[0]);now=next[1].at;next[1].fn()}now=end;await settle()},timers};
}
function sceneHarness(fetch){const timer=clock(),window={};const sandbox={window,fetch,AbortController,...timer,console};vm.createContext(sandbox);vm.runInContext(sceneScript,sandbox);return{scene:window.ParallaxPremiumScene,timer,sandbox};}
const premium={theme:'aurora',accent:'#78ebd3',moons:2,surface:'biolume',rings:'double',atmosphere:'ion',lighting:'sunrise'};
const response=style=>({ok:true,json:async()=>({style})});
module.exports={clock,settle,sceneScript,sceneHarness,premium,response};
