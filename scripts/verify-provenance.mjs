import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('PROVENANCE.json',root),'utf8'));
for(const [path,expected] of Object.entries(manifest.files)){
  const bytes=await readFile(new URL(path,root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),expected,`${path}: source provenance mismatch`);
  console.log(`Verified source hash: ${path}`);
}
