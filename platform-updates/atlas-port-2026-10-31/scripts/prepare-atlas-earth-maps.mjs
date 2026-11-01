// Match the desktop globe's existing 4096-pixel GPU cap before transfer.
// Original 8K source images remain archived; source attribution is unchanged.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
const root=path.resolve('public/assets/globe'),files=[];
for(const kind of ['daymap','nightmap','clouds']){
 const original='8k_earth_'+kind+'.jpg',output='4k_earth_'+kind+'.jpg';
 const input=await fs.readFile(path.join(root,original));
 const bytes=await sharp(input).resize(4096,2048,{fit:'fill',kernel:'lanczos3'}).jpeg({quality:kind==='clouds'?90:93,chromaSubsampling:'4:4:4'}).toBuffer();
 await fs.writeFile(path.join(root,output),bytes);
 files.push({source:original,output,source_sha256:createHash('sha256').update(input).digest('hex'),sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,width:4096,height:2048});
}
await fs.writeFile(path.join(root,'atlas-earth-preparation.json'),JSON.stringify({purpose:'Match existing desktop render cap without downloading unused resolution',files},null,2)+'\n');
console.log(JSON.stringify(files.map(({output,bytes})=>({output,bytes}))));
