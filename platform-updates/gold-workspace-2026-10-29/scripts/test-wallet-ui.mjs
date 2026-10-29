import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the production renderer with controlled request completion order.
const source=await readFile(new URL('../public/control.js',import.meta.url),'utf8');
const start=source.indexOf('  async function inspectWallet(address){');
const end=source.indexOf("  $('wallet-address').addEventListener",start);
assert.ok(start>0&&end>start);
const elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{hidden:false,innerHTML:'',textContent:'',dataset:{}});return elements.get(id);};
const pending=[];
const context=vm.createContext({
  $:element,
  escape:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  date:value=>value||'Time unavailable',shorten:value=>value.slice(0,7),encodeURIComponent,
  status:(id,text,error=false)=>Object.assign(element(id),{textContent:text,error}),
  api:(action,body)=>new Promise((resolve,reject)=>pending.push({action,body,resolve,reject}))
});
vm.runInContext('let walletEpoch=0;'+source.slice(start,end),context);
const inspect=address=>context.inspectWallet(address);
const fixture=address=>({address,sol:1.5,slot:123,transactions:[],fetchedAt:'2026-10-14T03:00:00Z',availability:{transactions:'retrieved'},partial:false,gaps:[]});
const first=inspect('WalletA'),second=inspect('WalletB');
assert.equal(element('wallet-view').hidden,true);
pending[1].resolve(fixture('WalletB'));await second;
pending[0].resolve(fixture('WalletA'));await first;
assert.match(element('wallet-view').innerHTML,/WalletB/);assert.doesNotMatch(element('wallet-view').innerHTML,/WalletA/);
const old=inspect('WalletC'),current=inspect('WalletD');
pending[3].resolve(fixture('WalletD'));await current;
pending[2].reject(new Error('Old failure'));await old;
assert.match(element('wallet-view').innerHTML,/WalletD/);assert.doesNotMatch(element('wallet-status').textContent,/Old failure/);
const partial=inspect('WalletE');pending[4].resolve({...fixture('WalletE'),sol:null,slot:null,partial:true,gaps:['Balance unavailable'],transactions:[{signature:'test-signature',confirmation:'confirmed',time:null,failed:false}]});await partial;
assert.match(element('wallet-view').innerHTML,/SOL balance unavailable/);assert.match(element('wallet-view').innerHTML,/test-si/);assert.doesNotMatch(element('wallet-view').innerHTML,/>0 SOL/);
const missingHistory=inspect('WalletF');pending[5].resolve({...fixture('WalletF'),partial:true,availability:{transactions:'unavailable'}});await missingHistory;
assert.match(element('wallet-view').innerHTML,/History could not be retrieved/);assert.doesNotMatch(element('wallet-view').innerHTML,/No recent signatures/);
const tiny=inspect('WalletG');pending[6].resolve({...fixture('WalletG'),sol:0.000000001});await tiny;
assert.match(element('wallet-view').innerHTML,/0\.000000001 SOL/);
const failure=inspect('WalletH');pending[7].reject(new Error('Provider unavailable'));await failure;
assert.match(element('wallet-view').innerHTML,/Snapshot unavailable/);assert.match(element('wallet-view').innerHTML,/WalletH/);assert.doesNotMatch(element('wallet-view').innerHTML,/WalletG/);assert.equal(element('wallet-status').error,true);
console.log('PASS: partial wallet data, missing history, lamport precision, stale successes and failures, and explorer recovery.');

const handleLookup=inspect('@parallax');pending[8].resolve({...fixture('ResolvedWallet'),identity:{status:'resolved',handle:'@parallax',lookup:'forward',checkedAt:'2026-10-16T03:00:00Z'}});await handleLookup;
assert.match(element('wallet-view').innerHTML,/@parallax/);assert.match(element('wallet-view').innerHTML,/ResolvedWallet/);assert.equal(element('wallet-address').dataset.resolvedAddress,'ResolvedWallet');
const handleFailure=inspect('@missing');pending[9].reject(new Error('Handle not found'));await handleFailure;
assert.doesNotMatch(element('wallet-view').innerHTML,/solscan.io\/account\/%40missing/);assert.equal(element('wallet-address').dataset.resolvedAddress,undefined);
console.log('PASS: SolHandle ownership label, full wallet disclosure, save review state, and no explorer link for unresolved handles.');
