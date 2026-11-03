/* Shared placement and cosmetic catalog: stable locations for client and server. */
(function(root){'use strict';
const spawns=[[-45,7],[-65,48],[-92,25],[-115,-35],[-65,-55],[-35,-92],[0,-105],[45,-110],[85,-75],[110,-28],[85,18],[70,70],[25,90],[-25,90],[-105,85]];
const extractions=[{id:'camp',name:'Camp beacon',x:0,z:3,radius:7},{id:'north',name:'North launch pad',x:14,z:-87,radius:7},{id:'east',name:'East rescue pad',x:95,z:55,radius:7}];
const structures=[{type:'bunker',x:-48,z:-35,yaw:.2,width:2.87,depth:2.91,height:3.2},{type:'bunker',x:75,z:50,yaw:-.4,width:2.87,depth:2.91,height:3.2},{type:'bunker',x:-75,z:75,yaw:.6,width:2.87,depth:2.91,height:3.2},{type:'bunker',x:-5,z:-65,yaw:1,width:2.87,depth:2.91,height:3.2}];
const barriers=[[-30,-22],[-40,-48],[-58,-26],[62,40],[86,37],[67,63],[-88,64],[-60,64],[-65,88],[9,-57],[-20,-76],[5,-79],[40,2],[-20,30]].map(([x,z],i)=>({type:'barrier',x,z,yaw:i*.83,width:3.4,depth:1,height:1.5}));
const trees=[[-19,44],[-28,51],[-36,46],[-14,58],[-41,65],[-50,57],[-48,77],[-27,74],[-8,78],[8,69],[17,56],[29,49],[45,55],[48,72],[52,88],[84,87],[92,74],[105,83],[117,60],[115,38],[103,24],[90,4],[108,-7],[98,-47],[75,-39],[64,-22],[51,-38],[31,-50],[17,-37],[-6,-42],[-23,-53],[-40,-66],[-60,-82],[-81,-46],[-91,-24],[-109,4],[-123,23],[-111,49]].map(([x,z],i)=>({type:'tree',x,z,yaw:i*2.399,height:4.5+(i%4)*.55,width:4.2,depth:4.2}));
function cover(ground){const out=[];for(const p of [...structures,...barriers]){const c=Math.cos(p.yaw),s=Math.sin(p.yaw);for(let x=-p.width/2+.25;x<p.width/2;x+=.5)for(let z=-p.depth/2+.25;z<p.depth/2;z+=.5){const xx=p.x+x*c-z*s,zz=p.z+x*s+z*c;out.push([xx,zz,.36,ground(p.x,p.z),p.height]);}}for(const p of trees)out.push([p.x,p.z,.26,ground(p.x,p.z),2.8]);return out;}
const wardrobe={head:['Field helmet','Desert helmet','Night helmet','Recon helmet','Ghillie hood'],shirt:['Ranger olive','Desert sand','Night tactical','Slate recon','Ghillie jacket'],pants:['Ranger olive','Desert sand','Night tactical','Slate recon','Ghillie trousers']};
const colors=[[.39,.46,.28],[.67,.58,.40],[.19,.25,.31],[.46,.53,.55],[.31,.39,.19]];
const validSkin=s=>s&&['head','shirt','pants'].every(k=>Number.isInteger(s[k])&&s[k]>=0&&s[k]<5);
const api={spawns,extractions,structures,barriers,trees,cover,wardrobe,colors,validSkin};if(typeof module!=='undefined')module.exports=api;if(root)root.ParallaxMatchLayout=api;
})(typeof window!=='undefined'?window:globalThis);
