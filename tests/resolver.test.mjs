import assert from 'node:assert/strict';
import {PublicKey,SystemProgram} from '@solana/web3.js';
import {PROGRAM_ID,COLLECTION_ID,MPL_CORE_ID,getConfigPda,getHandlePda,getAssetPda,getPrimaryHandlePda} from 'solhandle-sdk';
import {resolveWalletQuery,parseWalletQuery} from '../src/solhandle.mjs';
  const wallet='5ZeA2mx6MotvFgpF8ZyGHSAVLZAqGuNK5aj8udFwtLC3',other='CZvu8vnzLKyfGmbpixypQcfW4iiw7em43utW4k6ordYP',mint='8B2G4oiTKZKbSVTKPAP7Cfe6zAsEtrySCYcX9M2kpump';
  const name='parallax',asset=getAssetPda(name),record=getHandlePda(name),config=getConfigPda(),primary=getPrimaryHandlePda(wallet);
  let owner=wallet,mode='ok',calls=[];
  const account=(data,owner)=>({data:[data.toString('base64'),'base64'],owner:owner.toBase58(),executable:false,lamports:1,rentEpoch:0});
  function recordData(){const b=Buffer.alloc(44+name.length);b.writeUInt32LE(name.length,8);b.write(name,12);Buffer.from(asset.toBytes()).copy(b,12+name.length);return b;}
  function info(address) {
    if(address===record.toBase58())return mode==='missing'?null:account(recordData(),mode==='bad-program'?SystemProgram.programId:PROGRAM_ID);
    if(address===asset.toBase58()) {
      if(mode==='retired')return null;
      const b=Buffer.alloc(66);b[0]=1;new PublicKey(owner).toBuffer().copy(b,1);b[33]=2;(mode==='bad-collection'?SystemProgram.programId:COLLECTION_ID).toBuffer().copy(b,34);
      return account(b,MPL_CORE_ID);
    }
    if(address===config.toBase58()){const b=Buffer.alloc(187);b[186]=mode==='bad-version'?1:2;return account(b,PROGRAM_ID);}
    if(address===primary.toBase58())return mode==='no-primary'?null:account(recordData(),PROGRAM_ID);
    if([wallet,other].includes(address))return account(Buffer.alloc(0),SystemProgram.programId);
    return null;
  }
  async function reader(method,params) {
    calls.push({method,params});if(mode==='down')throw Error('fixture-provider-error');
    if(method==='getMultipleAccounts')return {context:{slot:123},value:params[0].map(info)};
    if(method==='getAccountInfo')return {context:{slot:123},value:info(params[0])};
    if(method==='getBalance')return {context:{slot:123},value:1500000000};
    if(method==='getSignaturesForAddress')return [];
    throw Error('Unexpected RPC method');
  }
  assert.deepEqual(parseWalletQuery(' @Parallax '),{kind:'handle',value:'@parallax'});
  for(const value of ['@','@@name','@bad_name','@a'.padEnd(23,'a'),'<script>',null])assert.throws(()=>parseWalletQuery(value));
  let resolved=await resolveWalletQuery('@Parallax',reader);
  assert.equal(resolved.address,wallet);assert.equal(resolved.identity.handle,'@parallax');assert.equal(resolved.identity.lookup,'forward');
  resolved=await resolveWalletQuery(wallet,reader);assert.equal(resolved.identity.handle,'@parallax');assert.equal(resolved.identity.lookup,'primary');
  owner=other;
  assert.equal((await resolveWalletQuery('@parallax',reader)).address,other,'ownership changes must refresh without cached resolution');
  assert.equal((await resolveWalletQuery(wallet,reader)).identity.status,'not-set','transferred primary asset cannot label its former owner');
  owner=wallet;
  for(const bad of ['bad-program','bad-collection','bad-version','retired']) {
    mode=bad;await assert.rejects(()=>resolveWalletQuery('@parallax',reader),e=>e.status===422);
  }
  mode='missing';await assert.rejects(()=>resolveWalletQuery('@parallax',reader),e=>e.status===404);
  mode='down';await assert.rejects(()=>resolveWalletQuery('@parallax',reader),e=>e.status===503&&!e.message.includes('fixture-provider-error'));
  assert.equal((await resolveWalletQuery(wallet,reader)).identity.status,'unavailable','raw wallet input remains usable during identity outages');
  mode='ok';

console.log('PASS: official record checks, ownership transfer, stale primary rejection and address fallback.');
