const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(bounty=false){
 class El{constructor(){this.children=[];this.nodes=new Map();this.style={};this.classList={add(){},remove(){},toggle(){}};}append(e){this.children.push(e);}replaceChildren(){this.children=[];}remove(){this.removed=true;}querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new El());return this.nodes.get(s);}}
 const sockets=[],sent=[],root=new El(),g={ready:true,state:{x:0,z:3,yaw:0,pitch:0},camp:{},rifle:{range:false,state:{ammo:30,reserve:90,reload:0}},setBountyMode(v){this.bountyMode=v;},setNetworkDown(v){this.down=v;},setNetworkPeers(v){this.peers=v;},setNetworkEffects(){},setNetworkTravel(fn){this.travel=fn;},terrainHeight(){return 0;},project(){return {x:100,y:100,depth:3,distance:3};}};
 class WS{constructor(url){this.url=url;this.readyState=1;sockets.push(this);}send(x){sent.push(JSON.parse(x));}close(){this.readyState=3;this.onclose?.();}}
 const window={},context={window,document:{createElement:()=>new El()},location:{href:'https://parallaxlaunch.live/explore'+(bounty?'?bounty=1':'')},URL,URLSearchParams,Date,setTimeout,WebSocket:WS,navigator:{clipboard:{writeText:async()=>{}}},fetch:async()=>({ok:true,json:async()=>({endpoint:'wss://earthbound-live-production.up.railway.app/play'})})};vm.runInNewContext(fs.readFileSync('public/earthbound-bounty-ui.js','utf8'),context);vm.runInNewContext(fs.readFileSync('public/earthbound-network.js','utf8'),context);
 const net=window.ParallaxEarthboundNetwork.create({root,dialog:Object.assign(new El(),{open:true,dataset:{}}),getGround:()=>g,isWalking:()=>true,announce(){},draw(){}});return {root,net,g,sockets,sent,message(m){sockets.at(-1).onmessage({data:JSON.stringify(m)});}};
}
test('network reconciles server health and ammo, renders a remote avatar, and cleans up',async()=>{
 const f=fixture();f.net.tick(.016);await new Promise(setImmediate);assert.equal(f.sockets.length,1);
 const own={id:'a',seq:0,x:0,y:0,z:3,health:100,ammo:30,reserve:90,reload:0,protected:true,respawn:0,mode:'foot'},peer={...own,id:'b',name:'Explorer B',x:2,y:1,walking:true};
 f.message({type:'welcome',id:'a',room:'1',players:[own,peer]});f.net.tick(.016);assert.equal(f.net.ready,true);assert.equal(f.g.peers.length,1);assert.equal(f.g.peers[0].remote,true);assert.equal(f.g.peers[0].y,1);
 f.net.fire(true);assert.equal(f.sent.at(-1).type,'fire');f.g.rifle.state.ammo=29;
 f.message({type:'state',players:[own,peer]});assert.equal(f.g.rifle.state.ammo,29,'stale acknowledgement cannot undo a pending shot');
 f.message({type:'state',players:[{...own,seq:1,health:0,ammo:28},peer]});assert.equal(f.g.rifle.state.ammo,28);assert.equal(f.g.down,true);
 f.message({type:'events',events:[{type:'teleport',id:'a',x:3,z:4}]});assert.equal(f.g.state.x,3);
 f.net.close();assert.equal(f.net.ready,false);assert.equal(f.g.peers.length,0);assert.equal(f.g.down,false);
});
test('bounty lobby separates connections, sends entry intent, freezes spectators and never credits locally',async()=>{
 const f=fixture(true);f.net.tick(.016);await new Promise(setImmediate);assert.match(f.sockets[0].url,/mode=bounty/);assert.equal(f.g.down,true);assert.equal(f.g.bountyMode,true);
 const p={id:'a',seq:0,x:0,y:0,z:3,health:100,ammo:30,reserve:90,reload:0,protected:true,mode:'foot',bounty:{status:'spectator',carried:0,banked:0}};
 const match={phase:'lobby',players:[],issued:0,entry:5};f.message({type:'welcome',id:'a',room:'b1',players:[p],match});f.net.tick(.016);const ui=f.root.children[0].children[0];ui.querySelector('[data-bounty="join"]').onclick();assert.equal(f.sent.at(-1).type,'bountyJoin');assert.equal(f.net.self.bounty.carried,0);
 f.message({type:'state',players:[{...p,bounty:{status:'active',carried:5,banked:0}}],match:{...match,phase:'active',remaining:600,extractOpens:0}});f.net.tick(.016);assert.equal(f.g.down,false);f.root.children.find(e=>e.className==='u-match-prompt').querySelector('[data-extract]').onclick();assert.equal(f.sent.at(-1).type,'extract');assert.equal(f.net.self.bounty.banked,0);
 f.message({type:'state',players:[{...p,bounty:{status:'extracted',carried:0,banked:5}}],match:{...match,phase:'results',reset:20}});f.net.tick(.016);assert.equal(f.g.down,true);f.net.close();assert.equal(f.g.bountyMode,false);assert.equal(f.g.down,false);
});
