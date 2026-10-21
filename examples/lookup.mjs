import {resolveWalletQuery} from '../src/solhandle.mjs';
const query=process.argv[2];
if(!query){console.error('Usage: node examples/lookup.mjs @handle-or-wallet');process.exit(1);}
const endpoint=process.env.SOLANA_RPC_URL||'https://api.mainnet-beta.solana.com';
async function readRpc(method,params){
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(7000)});
  if(!response.ok)throw Error('RPC request unavailable.');
  const payload=await response.json();
  if(payload.error||!Object.hasOwn(payload,'result'))throw Error('RPC response unavailable.');
  return payload.result;
}
try{console.log(JSON.stringify(await resolveWalletQuery(query,readRpc),null,2));}
catch(error){console.error(error.message);process.exitCode=1;}
