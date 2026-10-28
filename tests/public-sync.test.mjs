import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import test from 'node:test';
import {fingerprintTree, hash, safePath, verifyPublicSync} from '../scripts/verify-public-sync.mjs';

const ID = 'fixture-2026-10-28';
const SNAPSHOT = `platform-updates/${ID}`;
const OLD = 'platform-updates/fixture-2026-10-25';
function write(root, path, value) {
  mkdirSync(dirname(join(root, path)), {recursive: true});
  writeFileSync(join(root, path), value);
}
function git(root, ...args) {
  return execFileSync('git', ['-C', root, ...args], {stdio: ['ignore', 'pipe', 'pipe']}).toString().trim();
}
function init(root) {
  mkdirSync(root, {recursive: true});
  git(root, 'init', '-q');
  git(root, 'config', 'user.name', 'Sync test');
  git(root, 'config', 'user.email', 'sync-test@example.invalid');
}
function commit(root, message) {
  git(root, 'add', '.');
  git(root, 'commit', '-qm', message);
  return git(root, 'rev-parse', 'HEAD');
}
function fixture(t) {
  const temp = mkdtempSync(join(tmpdir(), 'parallax-sync-'));
  t.after(() => rmSync(temp, {recursive: true, force: true}));
  const root = join(temp, 'public'), source = join(temp, 'native');
  init(source);
  mkdirSync(root);
  write(source, 'public/client.js', 'export const version = 1;\n');
  const baselineCommit = commit(source, 'baseline');
  const client = 'export const version = 2;\n';
  write(source, 'public/client.js', client);
  write(source, 'app/internal-service.ts', 'export const implementation = 1;\n');
  const sourceCommit = commit(source, 'release');
  write(root, `${OLD}/README.md`, 'Prior immutable snapshot.\n');
  write(root, 'historical-platform/README.md', 'Original imported history.\n');
  write(root, `${SNAPSHOT}/public/client.js`, client);
  const readme = 'Selected public source.\n';
  write(root, `${SNAPSHOT}/README.md`, readme);
  const manifest = {
    schemaVersion: 1, releaseId: ID,
    source: {repository: 'native-sites', baselineCommit, commit: sourceCommit, hostedVersion: 210},
    reviewedPresentationSources: [],
    approvedExports: [{source: 'public/client.js', destination: `${SNAPSHOT}/public/client.js`, sha256: hash(client), bytes: Buffer.byteLength(client)}],
    sourceOnlyChanges: [{path: 'app/internal-service.ts', status: 'A', summary: 'Private service changed; implementation remains in native source.'}],
    generatedFiles: [{path: `${SNAPSHOT}/README.md`, sha256: hash(readme), bytes: Buffer.byteLength(readme), purpose: 'Public snapshot scope and verification instructions.'}],
    retainedSnapshots: [fingerprintTree(root, OLD), fingerprintTree(root, 'historical-platform')],
  };
  const index = {schemaVersion: 1, latestRelease: ID, releases: [{id: ID, manifest: `${SNAPSHOT}/PUBLIC-SYNC.json`}]};
  const save = () => {
    write(root, 'PUBLIC-SYNC.json', JSON.stringify(index, null, 2));
    write(root, `${SNAPSHOT}/PUBLIC-SYNC.json`, JSON.stringify(manifest, null, 2));
  };
  save();
  return {root, source, manifest, index, save};
}

test('verifies immutable public files without requiring private source or credentials', t => {
  const f = fixture(t);
  const result = verifyPublicSync({root: f.root});
  assert.equal(result.status, 'verified');
  assert.equal(result.exportedFiles, 1);
  assert.equal(result.sourceVerified, false);
});

test('source verification reads exact committed blobs and covers every changed path', t => {
  const f = fixture(t);
  write(f.source, 'public/client.js', 'uncommitted work must not change recorded provenance');
  const result = verifyPublicSync({root: f.root, source: f.source, release: ID});
  assert.equal(result.changedSourcePaths, 2);
  assert.equal(result.sourceVerified, true);
});

test('rejects path traversal and cross-platform path escapes', () => {
  for (const path of ['../outside', '/absolute', 'C:/outside', 'public/../outside', 'public\\outside', 'a//b', 'a/./b', 'a\0b']) {
    assert.throws(() => safePath(path), /path/);
  }
});

test('rejects exported bytes that no longer match their hash', t => {
  const f = fixture(t);
  write(f.root, `${SNAPSHOT}/public/client.js`, 'export const version = 3;\n');
  assert.throws(() => verifyPublicSync({root: f.root}), /SHA-256 mismatch/);
});

test('rejects a public hash updated to disguise a change from the recorded native source', t => {
  const f = fixture(t), changed = 'export const version = 3;\n';
  write(f.root, `${SNAPSHOT}/public/client.js`, changed);
  f.manifest.approvedExports[0].sha256 = hash(changed);
  f.save();
  assert.throws(() => verifyPublicSync({root: f.root, source: f.source}), /does not match the recorded source commit/);
});

test('fails closed for unclassified source changes or invented summaries', t => {
  const f = fixture(t), original = f.manifest.sourceOnlyChanges[0];
  f.manifest.sourceOnlyChanges = [];
  f.save();
  assert.throws(() => verifyPublicSync({root: f.root, source: f.source}), /unclassified source change/);
  f.manifest.sourceOnlyChanges = [original, {path: 'app/invented.ts', status: 'M', summary: 'No matching source delta.'}];
  f.save();
  assert.throws(() => verifyPublicSync({root: f.root, source: f.source}), /not part of the recorded delta/);
});

test('changed public runtime files cannot be omitted under source-only summaries', t => {
  const f = fixture(t);
  rmSync(join(f.root, `${SNAPSHOT}/public/client.js`));
  f.manifest.approvedExports = [];
  f.manifest.sourceOnlyChanges.push({path: 'public/client.js', status: 'M', summary: 'The browser update was omitted.'});
  f.save();
  assert.throws(() => verifyPublicSync({root: f.root}), /public files must be exported/);
  assert.throws(() => verifyPublicSync({root: f.root, source: f.source}), /public files must be exported/);
  // Misreporting the update as a deletion cannot evade the source-backed gate.
  f.manifest.sourceOnlyChanges.at(-1).status = 'D';
  f.save();
  assert.throws(() => verifyPublicSync({root: f.root, source: f.source}), /public files must be exported/);
});

test('rejects unlisted snapshot files and a generated-file source bypass', t => {
  const f = fixture(t), extra = `${SNAPSHOT}/public/unlisted.js`, body = 'unlisted';
  write(f.root, extra, body);
  assert.throws(() => verifyPublicSync({root: f.root}), /outside the approved/);
  f.manifest.generatedFiles.push({path: extra, sha256: hash(body), bytes: body.length, purpose: 'Attempt to relabel source.'});
  f.save();
  assert.throws(() => verifyPublicSync({root: f.root}), /cannot be relabelled/);
});

test('generated support cannot hide renamed source in an arbitrary directory', t => {
  const f = fixture(t), path = `${SNAPSHOT}/support/internal-service.mjs`, body = 'export const privateImplementation = true;';
  write(f.root, path, body);
  f.manifest.generatedFiles.push({path, sha256: hash(body), bytes: Buffer.byteLength(body), purpose: 'A renamed private file presented as generated support.'});
  f.save();
  assert.throws(() => verifyPublicSync({root: f.root}), /unreviewed generated-support path/);
});

test('rejects symlink exports even when their target matches the expected hash', t => {
  const f = fixture(t), file = join(f.root, `${SNAPSHOT}/public/client.js`);
  rmSync(file);
  symlinkSync(join(f.source, 'public/client.js'), file);
  assert.throws(() => verifyPublicSync({root: f.root}), /symlinks/);
});

test('presentation source exceptions cannot include private routes or services', t => {
  const f = fixture(t);
  for (const path of ['app/api/project-wallet/route.ts', 'app/world/[id]/route.ts', 'app/atlas-projects.ts', 'app/internal-service.ts']) {
    f.manifest.reviewedPresentationSources = [path];
    f.save();
    assert.throws(() => verifyPublicSync({root: f.root}), /not exportable|not on the reviewed/);
  }
});

test('allows only explicitly named reviewed public presentation adapters', t => {
  const f = fixture(t), path = 'app/share/[slug]/route.ts', body = 'export const metadata = true;\n';
  write(f.root, `${SNAPSHOT}/${path}`, body);
  f.manifest.approvedExports.push({source: path, destination: `${SNAPSHOT}/${path}`, sha256: hash(body), bytes: Buffer.byteLength(body)});
  f.save();
  assert.throws(() => verifyPublicSync({root: f.root}), /not an approved public source/);
  f.manifest.reviewedPresentationSources = [path];
  f.save();
  assert.equal(verifyPublicSync({root: f.root}).exportedFiles, 2);
});

test('prior snapshots are retained byte-for-byte and cannot disappear from the ledger', t => {
  const f = fixture(t);
  f.manifest.retainedSnapshots = f.manifest.retainedSnapshots.filter(item => item.path !== OLD);
  f.save();
  assert.throws(() => verifyPublicSync({root: f.root}), /absent from the retention ledger/);
  f.manifest.retainedSnapshots.push(fingerprintTree(f.root, OLD));
  f.save();
  write(f.root, `${OLD}/README.md`, 'Silently rewritten history.\n');
  assert.throws(() => verifyPublicSync({root: f.root}), /retained snapshot changed/);
});

test('public base comparison detects rewritten prior snapshots even if fingerprints were refreshed', t => {
  const f = fixture(t);
  init(f.root);
  const base = commit(f.root, 'published snapshot');
  write(f.root, `${OLD}/README.md`, 'Changed old history.\n');
  f.manifest.retainedSnapshots = f.manifest.retainedSnapshots.map(item => item.path === OLD ? fingerprintTree(f.root, OLD) : item);
  f.save();
  assert.throws(() => verifyPublicSync({root: f.root, baseRef: base}), /Previously published snapshot content changed/);
});

test('public base comparison also catches untracked files added to a legacy snapshot', t => {
  const f = fixture(t);
  init(f.root);
  const base = commit(f.root, 'published snapshot');
  write(f.root, `${OLD}/extra.md`, 'Untracked but incorrectly added to the new fingerprint.\n');
  f.manifest.retainedSnapshots = f.manifest.retainedSnapshots.map(item => item.path === OLD ? fingerprintTree(f.root, OLD) : item);
  f.save();
  assert.throws(() => verifyPublicSync({root: f.root, baseRef: base}), /Previously published snapshot file inventory changed/);
});

test('drift distinguishes a current checkout from a newer source commit without changing either', t => {
  const f = fixture(t);
  assert.equal(verifyPublicSync({root: f.root, source: f.source, checkDrift: true}).status, 'current');
  write(f.source, 'public/client.js', 'export const version = 4;\n');
  const next = commit(f.source, 'next release');
  const before = readFileSync(join(f.root, 'PUBLIC-SYNC.json'));
  const result = verifyPublicSync({root: f.root, source: f.source, checkDrift: true});
  assert.equal(result.status, 'public-behind-source');
  assert.equal(result.currentSourceCommit, next);
  assert.equal(result.unrecordedChangedPaths, 1);
  assert.deepEqual(readFileSync(join(f.root, 'PUBLIC-SYNC.json')), before);
  // A source head can be ahead of the deployed commit: check the native deployment's exact hash.
  assert.equal(verifyPublicSync({root: f.root, source: f.source, checkDrift: true, sourceRevision: f.manifest.source.commit}).status, 'current');
});

test('drift refuses a dirty checkout instead of treating uncommitted work as released', t => {
  const f = fixture(t);
  write(f.source, 'public/pending.js', 'unfinished work');
  assert.throws(() => verifyPublicSync({root: f.root, source: f.source, checkDrift: true}), /uncommitted changes/);
});
