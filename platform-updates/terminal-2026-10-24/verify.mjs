import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('./', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('PROVENANCE.json', root), 'utf8'));
assert.equal(manifest.hostedVersion, 179);
assert.equal(manifest.sourceRevision, 'ccd95fe82ca8ec566e005c36d47ee9003f23c279');
assert.equal(manifest.files.length, 14);
for (const entry of manifest.files) {
  assert(!entry.path.startsWith('/') && !entry.path.split('/').includes('..'), 'relative snapshot path');
  const data = await readFile(new URL(entry.path, root));
  assert.equal(createHash('sha256').update(data).digest('hex'), entry.sha256, entry.path);
}
console.log('Verified ' + manifest.files.length + ' Terminal snapshot files against source provenance.');
