// Package completed, reviewed Meshy outputs. This performs no API calls or spending.
import fs from 'node:fs/promises';import path from 'node:path';import sharp from 'sharp';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const sourceRoot=path.resolve(process.argv[2]||'../atlas-meshy'),output=path.resolve('public/assets/atlas-port');
const ids=['station','shuttle','observatory','docking-platform','satellite','habitat'];const entries=await fs.readdir(sourceRoot,{withFileTypes:true});const assets=[];
for(const id of ids){
 const found=entries.filter(e=>e.isDirectory()&&e.name.includes('_'+id+'_'));if(found.length!==1)throw Error('Expected one reviewed project for '+id);
 const project=path.join(sourceRoot,found[0].name),lineagePath=path.join(project,'lineage.json'),lineage=JSON.parse(await fs.readFile(lineagePath,'utf8'));
 const directory=path.join(output,id);await fs.mkdir(directory,{recursive:true});
 const model=path.join(directory,'web.glb');execFileSync(process.execPath,['scripts/prepare-atlas-asset.mjs','--source',path.join(project,'remeshed.glb'),'--lineage',lineagePath,'--output',model],{stdio:'pipe'});
 let thumbnail;for(const candidate of ['textured-preview/thumbnail.png','textured.png']){try{thumbnail=await fs.readFile(path.join(project,candidate));break;}catch{}}if(!thumbnail)throw Error('Missing inspected preview for '+id);
 const preview=await sharp(thumbnail).resize(768,768,{fit:'inside',withoutEnlargement:true}).webp({quality:92}).toBuffer();await fs.writeFile(path.join(directory,'preview.webp'),preview);
 const provenance=JSON.parse(await fs.readFile(path.join(directory,'provenance.json'),'utf8'));provenance.preview={file:'preview.webp',kind:'Meshy rendered thumbnail',sha256:createHash('sha256').update(preview).digest('hex'),visually_inspected:true};await fs.writeFile(path.join(directory,'provenance.json'),JSON.stringify(provenance,null,2)+'\n');
 const credits=lineage.total_consumed_credits??lineage.consumed_credits;if(!Number.isFinite(credits))throw Error('Missing actual cost for '+id);
 assets.push({id,model:`/assets/atlas-port/${id}/web.glb`,preview:`/assets/atlas-port/${id}/preview.webp`,provenance:`/assets/atlas-port/${id}/provenance.json`,bytes:provenance.web.bytes,triangles:provenance.web.triangles,consumed_credits:credits});
}
const manifest={schema_version:1,budget_credits:300,consumed_credits:assets.reduce((n,a)=>n+a.consumed_credits,0),assets};await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');console.log(JSON.stringify(manifest));
