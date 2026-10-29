const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const context={module:{exports:{}},URL,URLSearchParams};
vm.runInNewContext(readFileSync('public/replay-core.js','utf8'),context);
const C=context.module.exports,wallet='5ZeA2mx6MotvFgpF8ZyGHSAVLZAqGuNK5aj8udFwtLC3';
const rows=[
 {id:'a',time:100,side:'buy',wallet,tokenAmount:40,volumeUsd:12},
 {id:'b',time:200,side:'sell',wallet,tokenAmount:10,volumeUsd:5},
 {id:'c',time:300,side:'buy',wallet:null,tokenAmount:7,volumeUsd:null},
 {id:'d',time:400,side:'sell',wallet:'So11111111111111111111111111111111111111112',tokenAmount:9,volumeUsd:2}
];
test('playhead and sender filters exclude future records without inventing activity',()=>{
 assert.equal(C.through(rows,99).length,0);
 assert.equal(C.through(rows,200).length,2);
 assert.equal(C.through(rows,400,'buy',wallet).length,1);
 assert.equal(C.through(rows,400,'sell',wallet)[0].id,'b');
});
test('loaded sender totals track repeat buys/sells and preserve missing USD and unknown senders',()=>{
 const summary=C.aggregate(rows);
 assert.equal(summary.buyUsd,12);assert.equal(summary.sellUsd,7);assert.equal(summary.missingUsd,1);assert.equal(summary.unknownWallets,1);
 const sender=summary.wallets.find(r=>r.wallet===wallet);
 assert.equal(sender.netTokens,30);assert.equal(sender.count,2);assert.equal(sender.buys,1);assert.equal(sender.sells,1);
 assert.equal(summary.wallets.length,2);assert.equal(C.largest(rows,'buy').id,'a');assert.equal(C.largest(rows,'sell',wallet).id,'b');
 assert.equal(C.largest([rows[2]],'buy'),null);
 const missing=C.aggregate([{...rows[0],volumeUsd:null}]);assert.equal(missing.buyKnownUsd,0);assert.equal(missing.buyMissingUsd,1);assert.equal(missing.wallets[0].buyKnownUsd,0);assert.equal(missing.wallets[0].buyMissingUsd,1);assert.equal(missing.sellMissingUsd,0);
});
test('a candle close appears only when its full interval has elapsed',()=>{
 const candles=[{time:60,close:1},{time:120,close:2},{time:180,close:3}];
 assert.equal(C.visibleCandles(candles,119,1).length,0);
 assert.equal(C.visibleCandles(candles,120,1).length,1);
 assert.equal(C.visibleCandles(candles,179,1).length,1);
 assert.equal(C.visibleCandles(candles,240,1).length,3);
});
test('share links round-trip the immutable snapshot, exact playhead and filters',()=>{
 const data={snapshotId:'a'.repeat(64),mint:'8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump',window:{from:100,to:400,hours:6}};
 const url=new URL(C.shareURL('https://parallaxlaunch.live',data,247.9,{wallet,side:'sell'})),parsed=C.readLink(url.search);
 assert.equal(url.pathname,'/replay');assert.equal(parsed.snapshot,data.snapshotId);assert.equal(parsed.at,247);assert.equal(parsed.wallet,wallet);assert.equal(parsed.side,'sell');assert.equal(parsed.mint,data.mint);assert.equal(parsed.hours,6);
 assert.equal(new URL(C.shareURL(url.origin,data,999)).searchParams.get('at'),'400');
 assert.equal(C.readLink('?at=NaN&wallet=bad&side=oops&hours=999').at,null);
 assert.equal(C.readLink('?at=NaN&wallet=bad&side=oops&hours=999').wallet,'');
 assert.throws(()=>C.shareURL(url.origin,{...data,snapshotId:'bad'},200));
});
