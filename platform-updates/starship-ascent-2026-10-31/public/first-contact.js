/* First Contact: local story state, spatial scanning, and a real circuit puzzle. */
(() => {
  'use strict';
  const KEY='parallax.first-contact.v1',LAB={x:-88,z:-90,door:{x:-88,z:-82},console:{x:-88,z:-93},power:{x:-84.8,z:-89},sample:{x:-91,z:-90}};
  const insideLab=p=>p.x>-92.6&&p.x<-83.4&&p.z>-96.1&&p.z<-83.4;
  const STEPS=[
    {title:'The night goes quiet',action:'Answer the distress call',x:0,z:-2,name:'Camp radio',text:'MARA / RESEARCH CHANNEL\nA pulse just crossed the valley. The launch campus is dark, but our lab is on emergency power. Answer the radio to begin First Contact. Free exploration stays available.'},
    {...LAB.console,title:'Report to research',action:'Collect field scanner',name:'Research lab · briefing terminal',text:'MARA / EMERGENCY BRIEFING\nFollow the cyan entrance lights into the small research building east of the hangar. Your scanner is waiting at the back console. We need to find what overloaded the receiver.'},
    {...LAB.power,title:'Restore the lab receiver',action:'Connect the power grid',name:'Research lab · power panel',puzzle:'power',text:'ELLIS / ENGINEERING\nRotate the circuit tiles to connect the left-hand supply to the right-hand receiver. The center cell is an isolator. Emergency lights will keep the lab visible while you work.'},
    {title:'Follow the river echo',action:'Scan the river echo',x:27,z:16,name:'Riverbend echo',scan:true,text:'SCANNER / FIRST ECHO\nThe receiver caught a reflection near the river bridge. Equip your scanner, follow its bearing and watch the signal grow. Get within 8 m, face the source, then scan for three seconds.'},
    {title:'Find the source',action:'Scan the unknown craft',x:58,z:-61,name:'Unmarked eastern trail',scan:true,text:'SCANNER / SECOND ECHO\nThe river was only reflecting the signal. A stronger source lies beyond the eastern trail. Follow the scanner to the broken craft and hold its signal steady.'},
    {title:'Wake the archive',action:'Align the phase rings',x:58,z:-61,name:'Craft · archive interface',puzzle:'phase',text:'ARCHIVE / LISTENING\nThree phase rings protect the flight record. Rotate each cyan marker onto its white target. Match all three rings to open the archive.'},
    {...LAB.sample,title:'Bring the fragment home',action:'Place the fragment in the cradle',name:'Research lab · specimen bench',text:'RECOVERED FRAGMENT\nThe message reads: “We followed your light across the dark.” Bring the fragment into the lab and place it on the examination bench. Its stored energy may restore the campus.'},
    {...LAB.console,title:'Choose your response',action:'Respond to the signal',name:'Research lab · transmission console',puzzle:'choice',text:'MARA / FIRST CONTACT\nThe campus is back online. The coordinates are stable. We can send a welcome, or listen without revealing more. The choice is yours.'}
  ];
  const RECORDS=[
    {id:'meteor',x:19,z:-26,name:'Meteorite resonance',text:'FIELD RECORD 01 / The alloy in the recovered fragment shares an unusual resonance with this meteorite.'},
    {id:'arch',x:-47,z:-48,name:'The arch echo',text:'FIELD RECORD 02 / The sandstone focuses the carrier wave. This valley has been listening longer than we have.'},
    {id:'overlook',x:-21,z:-28,name:'Distant reply',text:'FIELD RECORD 03 / A second pulse answers from beyond the sky. Your night shift is only the beginning.'}
  ];
  const BASE=[6,10,12,9,0,3,3,10,9],INITIAL=[1,1,2,2,0,1,0,1,2];
  const rotate=(mask,n)=>{for(let i=0;i<((n%4)+4)%4;i++)mask=((mask<<1)&15)|(mask>>3);return mask;};
  function circuit(turns){
    const masks=BASE.map((m,i)=>rotate(m,Number.isInteger(turns?.[i])?turns[i]:0)),lit=new Set(),queue=[];
    if(masks[3]&8){lit.add(3);queue.push(3);}
    for(let q=0;q<queue.length;q++){const i=queue[q],r=Math.floor(i/3),c=i%3;
      for(const [dr,dc,bit,opposite] of [[-1,0,1,4],[0,1,2,8],[1,0,4,1],[0,-1,8,2]]){const nr=r+dr,nc=c+dc,j=nr*3+nc;if(nr<0||nr>2||nc<0||nc>2||!(masks[i]&bit)||!(masks[j]&opposite)||lit.has(j))continue;lit.add(j);queue.push(j);}
    }return {masks,lit:[...lit],solved:lit.has(5)&&!!(masks[5]&2)};
  }
  function reading(position,target){
    if(!target)return {distance:0,strength:0,bearing:0,aligned:false};
    const dx=target.x-position.x,dz=target.z-position.z,distance=Math.hypot(dx,dz),angle=Math.atan2(dx,-dz),difference=Math.atan2(Math.sin(angle-(position.yaw||0)),Math.cos(angle-(position.yaw||0)));
    const facing=Math.max(0,Math.cos(difference)),strength=Math.max(0,1-distance/175)*(.16+.84*Math.pow(facing,3));
    return {distance,strength,bearing:(angle*180/Math.PI+360)%360,aligned:distance<=8&&Math.abs(difference)<.34&&Math.abs(position.pitch||0)<.65&&!position.driving,turn:difference};
  }
  function create(storage){
    let step=0,ending='',records=[],saved=!!storage,legacy=false;
    try{legacy=JSON.parse(storage?.getItem('parallax.quiet-signal.v1')||'null')?.step>=7;const data=JSON.parse(storage?.getItem(KEY)||'null');if(data?.version===1&&Number.isInteger(data.step)&&data.step>=0&&data.step<=STEPS.length){step=data.step;ending=['welcome','listen'].includes(data.ending)?data.ending:'';records=RECORDS.filter(r=>data.records?.includes(r.id)).map(r=>r.id);}}catch{saved=false;}
    function persist(){try{if(!storage)throw Error();storage.setItem(KEY,JSON.stringify({version:1,step,ending,records}));saved=true;}catch{saved=false;}}
    const api={chapter:'first-contact',get step(){return step;},get complete(){return step===STEPS.length;},get objective(){return STEPS[step]||null;},get saved(){return saved;},get legacy(){return legacy;},get ending(){return ending;},get records(){return records.slice();},get scannerUnlocked(){return step>=2;},get blackout(){return step>0&&step<7;},get recovered(){return step>=6;},get installed(){return step>=7;},get inventory(){return step>=7?'Field scanner · archived fragment':step>=6?'Field scanner · recovered fragment':step>=2?'Field scanner':'Field radio';},
      target(position){if(STEPS[step]?.scan)return STEPS[step];if(step===STEPS.length)return RECORDS.filter(r=>!records.includes(r.id)).sort((a,b)=>Math.hypot(a.x-position.x,a.z-position.z)-Math.hypot(b.x-position.x,b.z-position.z))[0]||null;return null;},
      act(expected,p,value){
        const o=STEPS[step];if(expected!==step||!o)return {ok:false,message:'This objective is not active.'};
        if(p.driving)return {ok:false,message:'Park and step out before interacting.'};
        if(Math.hypot(o.x-p.x,o.z-p.z)>(o.scan?8:2.5))return {ok:false,message:'Move closer to '+o.name+'.'};
        if([1,2,6,7].includes(step)&&!insideLab(p))return {ok:false,message:'Walk through the cyan entrance into the research lab.'};
        if(o.scan)return {ok:false,message:'Equip the scanner and hold a stable scan.'};
        if(o.puzzle==='power'&&(!Array.isArray(value)||value.length!==9||!value.every(n=>Number.isInteger(n)&&n>=0&&n<4)||!circuit(value).solved))return {ok:false,message:'The receiver is isolated. Route power across the top row, then down to the right outlet.'};
        if(o.puzzle==='phase'&&(!Array.isArray(value)||value.join(',')!=='2,4,1'))return {ok:false,message:'Align each cyan marker with its white target.'};
        if(o.puzzle==='choice'&&!['welcome','listen'].includes(value))return {ok:false,message:'Choose how to answer the signal.'};
        if(o.puzzle==='choice')ending=value;step++;persist();return {ok:true,message:step===8?'First Contact complete · '+(ending==='welcome'?'Ambassador':'Watchkeeper')+' badge earned.':step===7?'Campus power restored. The fragment is on display.':'Objective complete · '+STEPS[step].title};
      },
      scan(p,seconds){const target=api.target(p);if(!api.scannerUnlocked||!target||!Number.isFinite(seconds)||seconds<3||!reading(p,target).aligned)return {ok:false,message:'Face the source within 8 m and keep the scanner steady.'};if(step<8)step++;else records.push(target.id);persist();return {ok:true,message:target.id?target.text:step===4?'Echo resolved. The source is beyond the eastern trail.':'Archive located. Approach the craft to align its phase rings.'};},
      reset(){step=0;ending='';records=[];persist();}
    };return api;
  }
  const api={KEY,LAB,STEPS,RECORDS,BASE,INITIAL,circuit,reading,insideLab,create};if(typeof window!=='undefined')window.ParallaxFirstContact=api;if(typeof module!=='undefined')module.exports=api;
})();
