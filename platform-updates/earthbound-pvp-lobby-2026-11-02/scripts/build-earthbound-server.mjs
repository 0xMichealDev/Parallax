import fs from 'node:fs';import path from 'node:path';import {gzipSync} from 'node:zlib';
const out=process.argv[2];if(!out||!path.isAbsolute(out))throw Error('An absolute output path is required');const core=fs.readFileSync('public/earthbound-combat-core.js','utf8'),bounty=fs.readFileSync('public/earthbound-bounty-core.js','utf8'),map=JSON.parse(fs.readFileSync('app/earthbound-network-map.json','utf8').replace(/^\uFEFF/,'')),server=fs.readFileSync('app/earthbound-network-server.ts','utf8');const weapons=fs.readFileSync('public/earthbound-weapons.js','utf8');const packed=gzipSync(JSON.stringify(map),{level:9}).toString('base64');const pack=s=>gzipSync(s,{level:9}).toString('base64');const layout=fs.readFileSync('public/earthbound-match-layout.js','utf8');const code=`const load=b=>{const module={exports:{}};new Function('module',new TextDecoder().decode(Bun.gunzipSync(Buffer.from(b,'base64'))))(module);return module.exports;};
 globalThis.__earthboundWeapons=load('${pack(weapons)}');
 globalThis.__earthboundLayout=load('${pack(layout)}');
 globalThis.__earthboundCombat=load('${pack(core)}');
 globalThis.__earthboundBounty=load('${pack(bounty)}');
 globalThis.__earthboundMap=JSON.parse(new TextDecoder().decode(Bun.gunzipSync(Buffer.from('${packed}','base64'))));
${server}`;if(Buffer.byteLength(code)>96*1024)throw Error('Railway function size budget exceeded');fs.writeFileSync(out,code);console.log('Built multiplayer service: '+Buffer.byteLength(code)+' bytes');
