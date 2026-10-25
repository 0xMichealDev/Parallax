import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const manifest=JSON.parse(readFileSync('PROVENANCE.json','utf8'));
for(const f of manifest.files)assert.equal(createHash('sha256').update(readFileSync(f.path)).digest('hex'),f.sha256,f.path);
console.log(`PASS: ${manifest.files.length} exported files match hosted v${manifest.hostedVersion} source.`);
