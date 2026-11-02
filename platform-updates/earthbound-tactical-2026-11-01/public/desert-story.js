/* The Quiet Signal: ordered, browser-local story progress. */
(() => {
  'use strict';
  const KEY='parallax.quiet-signal.v1';
  const STEPS=[
    {title:'An unexpected transmission',action:'Answer the radio',x:0,z:-2,name:'Base camp radio',text:'MARA / LAUNCH CONTROL\nYou picked an interesting night to arrive. The remote relay went dark, then sent a pulse no one can explain. Take a field rover to the western campus. I will meet you outside Operations.'},
    {title:'Report to the night shift',action:'Speak with Mara',x:-102,z:-96,name:'Mara · Operations',text:'MARA / NIGHT SHIFT LEAD\nThe pad crew is holding a systems rehearsal. We need that relay online first. Pick up the spare power cell at the blue service crate beside the hangar. You can take either rover—or follow the trail on foot.'},
    {title:'Prepare for the field repair',action:'Collect the power cell',x:-115,z:-83,name:'Service crate',text:'ELLIS / ENGINEERING NOTE\nOne charged power cell. One dead relay. The survey station is east of camp. Install the cell, then tune the three receiver channels in this order: 3 · 1 · 2.'},
    {title:'Bring the relay online',action:'Install power cell',x:26,z:8,name:'Remote survey station',text:'RELAY / POWER OFFLINE\nThe housing is intact. Slide the spare cell into the service port to restore receiver power.'},
    {title:'Tune the strange signal',action:'Tune the receiver',x:26,z:8,name:'Remote survey station',text:'ELLIS / RECEIVER CHECK\nSet channels A, B and C to the calibration sequence from the service note: 3 · 1 · 2. A stable signal will reveal its source.'},
    {title:'Find the silent visitor',action:'Recover the flight log',x:58,z:-61,name:'Unknown signal',text:'UNKNOWN CRAFT / RECOVERABLE LOG\nThe signal ends at a broken craft. Its last entry contains the coordinates of this observatory—and a message: “We found your light. Keep it burning.” Download the fragment and bring it back to Mara.'},
    {title:'Complete the night shift',action:'Deliver the flight log',x:-102,z:-96,name:'Mara · Operations',text:'MARA / LAUNCH CONTROL\nThat was no equipment fault. Someone out there found us. The relay is stable and the record is secure. Tonight, we keep watching. Good work, pathfinder.'}
  ];
  function create(storage){let step=0,saved=true;try{const raw=JSON.parse(storage?.getItem(KEY)||'null');if(raw?.version===1&&Number.isInteger(raw.step)&&raw.step>=0&&raw.step<=STEPS.length)step=raw.step;}catch{saved=false;}
    function persist(){try{if(!storage)throw Error();storage.setItem(KEY,JSON.stringify({version:1,step}));saved=true;}catch{saved=false;}}
    return {get step(){return step;},get complete(){return step===STEPS.length;},get objective(){return STEPS[step]||null;},get saved(){return saved&&!!storage;},get inventory(){return step===3?'Charged power cell':step===6?'Recovered flight log':'Field radio';},
      act(expected,position,code){if(expected!==step||!STEPS[step]||position.driving)return {ok:false,message:'Park, step out, and approach the objective.'};const p=STEPS[step];if(Math.hypot(p.x-position.x,p.z-position.z)>3.4)return {ok:false,message:'Move within 3 m of '+p.name+'.'};if(step===4&&code!=='312')return {ok:false,message:'Signal unstable. Check Ellis’s note: A = 3, B = 1, C = 2.'};step++;persist();return {ok:true,message:step===STEPS.length?'Night shift complete · Pathfinder field badge earned.':'Objective complete · '+STEPS[step].title};},
      reset(){step=0;persist();}
    };
  }
  const api={KEY,STEPS,create};if(typeof window!=='undefined')window.ParallaxStory=api;if(typeof module!=='undefined')module.exports=api;
})();
