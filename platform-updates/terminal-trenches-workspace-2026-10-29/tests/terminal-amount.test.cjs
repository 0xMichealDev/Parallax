const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {readFileSync}=require('node:fs');
const source=readFileSync('public/terminal-plus.js','utf8');
const amountFunction=source.slice(source.indexOf('function buyAmountRaw()'),source.indexOf('window.ParallaxTerminalPlus='));
function raw(value){return vm.runInNewContext(amountFunction+';buyAmountRaw()',{$:()=>({value})});}
test('SOL order inputs preserve exact lamports at preset and smallest-unit boundaries',()=>{
 assert.equal(raw('0.1'),'100000000');assert.equal(raw('0.25'),'250000000');assert.equal(raw('0.000000001'),'1');assert.equal(raw('1.234567891'),'1234567891');assert.equal(raw('99999999.999999999'),'99999999999999999');
});
test('empty, zero, signed, exponent, excess precision and malformed amounts cannot prefill an order',()=>{
 for(const v of ['', '0','0.000000000','-1','+1','1e9','Infinity','NaN','0.0000000001','1,000','00.1','<script>'])assert.equal(raw(v),null,v);
});
