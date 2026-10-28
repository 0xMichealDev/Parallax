#!/usr/bin/env node
// Read-only release gate. This script never copies, commits, pushes, fetches, or deploys.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lstatSync, readFileSync, readdirSync, realpathSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHA256 = /^[a-f0-9]{64}$/;
const COMMIT = /^[a-f0-9]{40}$/;
const RELEASE = /^[a-z0-9][a-z0-9-]{0,99}$/;
const SOURCE_ROOTS = new Set(['public', 'docs', 'tests', 'scripts']);
const GENERATED_SUPPORT = new Set(['README.md', 'PROVENANCE.json', 'verify.mjs']);
const PRIVATE_SEGMENT = /^(?:\.git|\.openai|\.env(?:\..*)?|\.aws|\.ssh|node_modules|db|drizzle|server|servers|api|secrets?|credentials?)$/i;
const PRIVATE_FILE = /(?:^|[._-])(?:credentials?|secrets?|private[-_]?key)(?:[._-]|$)|\.(?:pem|key|p12|pfx|sqlite3?|db|sql)$/i;
// Exact reviewed HTML/catalog/metadata adapters. This is not permission to export app/.
// A future addition needs the same source review, an explicit change here, and a manifest entry.
const REVIEWABLE_PRESENTATION_SOURCES = new Set([
  'app/ecosystem.ts', 'app/community-showcase.ts', 'app/workspace-shell.ts',
  'app/recovery-response.ts', 'app/site-response.ts', 'app/gatto-profile.ts',
  'app/project-presentations.ts', 'app/solhandle-world.ts', 'app/docs-content.ts',
  'app/docs-render.ts', 'app/universe-editorial.ts',
  'app/projects/[slug]/route.ts', 'app/projects/gatto/route.ts',
  'app/expeditions/gatto/route.ts', 'app/expeditions/sheeple/route.ts',
  'app/share/gatto-v207/route.ts', 'app/share/[slug]/route.ts',
  'app/explore/route.ts', 'app/planets/route.ts', 'app/studio/route.ts',
  'app/sitemap.xml/route.ts',
]);

function requireThat(condition, message) {
  if (!condition) throw new Error(message);
}
function object(value, label) {
  requireThat(value !== null && typeof value === 'object' && !Array.isArray(value), `${label}: expected an object`);
}
function array(value, label) {
  requireThat(Array.isArray(value), `${label}: expected an array`);
}
function text(value, label) {
  requireThat(typeof value === 'string' && value.trim().length > 0 && value.length <= 2000, `${label}: expected concise nonempty text`);
}
function unique(items, label) {
  requireThat(new Set(items).size === items.length, `${label}: duplicate entries`);
}
export function safePath(value, label = 'path') {
  requireThat(typeof value === 'string' && value.length > 0 && value.length <= 500, `${label}: invalid path`);
  requireThat(!isAbsolute(value) && !/^[A-Za-z]:/.test(value) && !/[\\\x00-\x1f\x7f]/.test(value), `${label}: path escape or control character`);
  requireThat(value.split('/').every(part => part && part !== '.' && part !== '..'), `${label}: path escape or noncanonical path`);
  return value;
}
function safePublicPath(path, label) {
  safePath(path, label);
  requireThat(!path.split('/').some(part => part.startsWith('.') || PRIVATE_SEGMENT.test(part)) && !PRIVATE_FILE.test(path.split('/').at(-1)), `${label}: private/configuration path is not exportable`);
  return path;
}
function contained(root, path) {
  safePath(path);
  const full = join(root, ...path.split('/'));
  let current = root;
  for (const part of path.split('/')) {
    current = join(current, part);
    requireThat(!lstatSync(current).isSymbolicLink(), `${path}: symlinks are not permitted`);
  }
  const actual = realpathSync(full);
  const rel = relative(root, actual);
  requireThat(rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel), `${path}: resolves outside the repository`);
  return full;
}
function bytesAt(root, path) {
  const file = contained(root, path);
  requireThat(lstatSync(file).isFile(), `${path}: expected a regular file`);
  return readFileSync(file);
}
function jsonAt(root, path) {
  try { return JSON.parse(bytesAt(root, path).toString('utf8')); }
  catch (error) { throw new Error(`${path}: ${error.message}`); }
}
export function hash(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}
function inventory(root, path) {
  const files = [];
  function walk(dir) {
    const absolute = contained(root, dir);
    requireThat(lstatSync(absolute).isDirectory(), `${dir}: expected a directory`);
    for (const item of readdirSync(absolute, {withFileTypes: true})) {
      const next = `${dir}/${item.name}`;
      safePath(next);
      requireThat(!item.isSymbolicLink(), `${next}: symlinks are not permitted`);
      if (item.isDirectory()) walk(next);
      else {
        requireThat(item.isFile(), `${next}: unsupported file type`);
        files.push(next);
      }
    }
  }
  walk(path);
  return files.sort();
}
export function fingerprintTree(root, path) {
  root = realpathSync(root);
  safePath(path);
  const files = inventory(root, path);
  const digest = createHash('sha256');
  for (const file of files) digest.update(`${file.slice(path.length + 1)}\0${hash(bytesAt(root, file))}\n`);
  return {path, treeSha256: digest.digest('hex'), fileCount: files.length};
}
function git(root, args, {allowFailure = false} = {}) {
  try {
    return execFileSync('git', ['-c', 'core.quotePath=false', '-C', root, ...args], {maxBuffer: 128 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe']});
  } catch {
    if (allowFailure) return null;
    // Never print credential-bearing Git diagnostics or a private file's contents.
    throw new Error('Local Git inspection failed; verify the checkout and required commits are available. No remote operation was attempted.');
  }
}
function gitText(root, args, options) {
  const output = git(root, args, options);
  return output === null ? null : output.toString('utf8').trim();
}
function changedPaths(root, baseline, commit) {
  const fields = git(root, ['diff', '--name-status', '--no-renames', '-z', baseline, commit, '--']).toString('utf8').split('\0');
  fields.pop();
  requireThat(fields.length % 2 === 0, 'Source diff has an unexpected format');
  const result = new Map();
  for (let i = 0; i < fields.length; i += 2) {
    requireThat(/^[AMDT]$/.test(fields[i]), 'Source diff contains an unsupported status');
    result.set(safePath(fields[i + 1], 'source delta'), fields[i]);
  }
  return result;
}
function sourceTree(root, commit) {
  const result = new Map();
  for (const record of git(root, ['ls-tree', '-rz', '--full-tree', commit]).toString('utf8').split('\0').filter(Boolean)) {
    const match = /^([0-7]+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/.exec(record);
    requireThat(match, 'Source tree has an unexpected format');
    result.set(match[4], {mode: match[1], type: match[2], oid: match[3]});
  }
  return result;
}
function fileRecord(record, path, label, root) {
  object(record, label);
  requireThat(SHA256.test(record.sha256), `${label}: expected a lowercase SHA-256 hash`);
  requireThat(Number.isSafeInteger(record.bytes) && record.bytes >= 0, `${label}: expected a byte count`);
  const actual = bytesAt(root, path);
  requireThat(actual.length === record.bytes, `${path}: byte count mismatch`);
  requireThat(hash(actual) === record.sha256, `${path}: SHA-256 mismatch`);
}
function permittedSource(path, presentationSources) {
  safePublicPath(path, 'export source');
  if (SOURCE_ROOTS.has(path.split('/')[0])) return;
  if (path === 'AGENTS.md' || /^app\/[^/]+\.(?:html|json)$/.test(path)) return;
  requireThat(presentationSources.has(path), `${path}: not an approved public source or reviewed presentation module`);
}
function readRelease(root, entry) {
  object(entry, 'release entry');
  requireThat(RELEASE.test(entry.id), 'release entry: invalid id');
  const snapshot = `platform-updates/${entry.id}`;
  requireThat(entry.manifest === `${snapshot}/PUBLIC-SYNC.json`, `${entry.id}: manifest must be inside its own snapshot`);
  const manifest = jsonAt(root, entry.manifest);
  object(manifest, entry.manifest);
  requireThat(manifest.schemaVersion === 1 && manifest.releaseId === entry.id, `${entry.id}: schema or release id mismatch`);
  object(manifest.source, `${entry.id}.source`);
  const source = manifest.source;
  requireThat(source.repository === 'native-sites', `${entry.id}: source repository must be the noncredential label native-sites`);
  requireThat(COMMIT.test(source.baselineCommit) && COMMIT.test(source.commit), `${entry.id}: full source commit hashes are required`);
  requireThat(Number.isSafeInteger(source.hostedVersion) && source.hostedVersion > 0, `${entry.id}: hostedVersion must be a positive integer`);
  for (const key of ['approvedExports', 'sourceOnlyChanges', 'generatedFiles', 'retainedSnapshots']) array(manifest[key], `${entry.id}.${key}`);
  const presentation = manifest.reviewedPresentationSources ?? [];
  array(presentation, `${entry.id}.reviewedPresentationSources`);
  unique(presentation, `${entry.id}.reviewedPresentationSources`);
  for (const path of presentation) {
    safePublicPath(path, 'reviewed presentation source');
    requireThat(REVIEWABLE_PRESENTATION_SOURCES.has(path), `${path}: not on the reviewed presentation-source allowlist`);
  }
  const presentationSet = new Set(presentation);
  const sourcePaths = new Set();
  const destinations = new Set([entry.manifest]);
  for (const record of manifest.approvedExports) {
    object(record, 'approved export');
    const sourcePath = safePath(record.source, 'export source');
    permittedSource(sourcePath, presentationSet);
    requireThat(record.destination === `${snapshot}/${sourcePath}`, `${sourcePath}: export must preserve its source path within the snapshot`);
    safePublicPath(record.destination, 'export destination');
    requireThat(!sourcePaths.has(sourcePath) && !destinations.has(record.destination), `${sourcePath}: duplicate export`);
    sourcePaths.add(sourcePath);
    destinations.add(record.destination);
    fileRecord(record, record.destination, `export ${sourcePath}`, root);
  }
  for (const path of presentation) requireThat(sourcePaths.has(path), `${path}: reviewed presentation source is not exported`);
  const sourceOnly = new Set();
  for (const record of manifest.sourceOnlyChanges) {
    object(record, 'source-only change');
    const path = safePath(record.path, 'source-only path');
    requireThat(/^[AMDT]$/.test(record.status), `${path}: source-only status must be A, M, D, or T`);
    requireThat(!(path.startsWith('public/') && /^[AM]$/.test(record.status)), `${path}: added or modified public files must be exported, not summarized`);
    text(record.summary, `${path}: source-only summary`);
    requireThat(!sourceOnly.has(path) && !sourcePaths.has(path), `${path}: duplicated or contradictory classification`);
    sourceOnly.add(path);
  }
  for (const record of manifest.generatedFiles) {
    object(record, 'generated file');
    const path = safePublicPath(record.path, 'generated file');
    requireThat(path.startsWith(`${snapshot}/`), `${path}: generated support must stay inside its immutable snapshot`);
    const inner = path.slice(snapshot.length + 1);
    requireThat(!/^(?:app|public|scripts|tests)\//.test(inner), `${path}: source files cannot be relabelled as generated support`);
    requireThat(GENERATED_SUPPORT.has(inner), `${path}: unreviewed generated-support path`);
    requireThat(!destinations.has(path), `${path}: duplicate or self-referencing generated file`);
    text(record.purpose, `${path}: generated purpose`);
    destinations.add(path);
    fileRecord(record, path, `generated ${path}`, root);
  }
  const actualFiles = inventory(root, snapshot);
  requireThat(actualFiles.length === destinations.size && actualFiles.every(path => destinations.has(path)), `${entry.id}: snapshot contains files outside the approved export/generated-file allowlist`);
  unique(manifest.retainedSnapshots.map(record => record.path), `${entry.id}.retainedSnapshots`);
  for (const retained of manifest.retainedSnapshots) {
    object(retained, 'retained snapshot');
    safePath(retained.path, 'retained snapshot');
    requireThat(retained.path === 'historical-platform' || /^platform-updates\/[a-z0-9][a-z0-9-]*$/.test(retained.path), `${retained.path}: invalid retained snapshot root`);
    requireThat(retained.path !== snapshot, `${entry.id}: cannot retain itself`);
    requireThat(SHA256.test(retained.treeSha256) && Number.isSafeInteger(retained.fileCount) && retained.fileCount > 0, `${retained.path}: incomplete tree fingerprint`);
    const actual = fingerprintTree(root, retained.path);
    requireThat(actual.treeSha256 === retained.treeSha256 && actual.fileCount === retained.fileCount, `${retained.path}: retained snapshot changed`);
  }
  return {...manifest, snapshot, manifestPath: entry.manifest};
}
function verifySource(root, release) {
  const {baselineCommit, commit} = release.source;
  requireThat(git(root, ['merge-base', '--is-ancestor', baselineCommit, commit], {allowFailure: true}) !== null, `${release.releaseId}: source baseline is absent or not an ancestor`);
  const tree = sourceTree(root, commit);
  for (const record of release.approvedExports) {
    const item = tree.get(record.source);
    requireThat(item && item.type === 'blob' && /^(?:100644|100755)$/.test(item.mode), `${record.source}: source commit does not contain a regular file`);
    const bytes = git(root, ['cat-file', 'blob', item.oid]);
    requireThat(bytes.length === record.bytes && hash(bytes) === record.sha256, `${record.source}: public export does not match the recorded source commit`);
  }
  const delta = changedPaths(root, baselineCommit, commit);
  const exported = new Set(release.approvedExports.map(record => record.source));
  const summaries = new Map(release.sourceOnlyChanges.map(record => [record.path, record.status]));
  for (const [path, status] of delta) {
    requireThat(exported.has(path) || summaries.has(path), `${path}: unclassified source change`);
    requireThat(!(path.startsWith('public/') && /^[AM]$/.test(status)) || exported.has(path), `${path}: added or modified public files must be exported, not summarized`);
    if (summaries.has(path)) requireThat(summaries.get(path) === status, `${path}: source-only change status mismatch`);
  }
  for (const path of summaries.keys()) requireThat(delta.has(path), `${path}: source-only summary is not part of the recorded delta`);
  return delta.size;
}
function verifyBase(root, baseRef, index) {
  requireThat(typeof baseRef === 'string' && baseRef.length > 0 && !baseRef.startsWith('-') && !/[\x00-\x20:]/.test(baseRef), 'Invalid public base ref');
  const base = gitText(root, ['rev-parse', '--verify', `${baseRef}^{commit}`]);
  requireThat(COMMIT.test(base), 'Public base ref did not resolve to a commit');
  const priorRaw = git(root, ['show', `${base}:PUBLIC-SYNC.json`], {allowFailure: true});
  if (priorRaw) {
    const prior = JSON.parse(priorRaw.toString('utf8'));
    array(prior.releases, 'base releases');
    requireThat(index.releases.length >= prior.releases.length, 'Public sync index removed a prior release');
    for (let i = 0; i < prior.releases.length; i++) requireThat(index.releases[i]?.id === prior.releases[i].id && index.releases[i]?.manifest === prior.releases[i].manifest, 'Public sync index reordered or changed prior releases');
  }
  const priorSnapshots = gitText(root, ['ls-tree', '-d', '--name-only', `${base}:platform-updates`], {allowFailure: true});
  const paths = priorSnapshots ? priorSnapshots.split('\n').filter(Boolean).map(path => `platform-updates/${path}`) : [];
  if (git(root, ['cat-file', '-e', `${base}:historical-platform`], {allowFailure: true}) !== null) paths.push('historical-platform');
  if (paths.length) {
    // Git diff does not see untracked files. Compare path inventories as well, so
    // adding an untracked file to an old snapshot cannot be hidden by rehashing it.
    const before = sourceTree(root, base);
    for (const path of paths) {
      const expected = [...before.keys()].filter(file => file.startsWith(`${path}/`)).sort();
      const actual = inventory(root, path);
      requireThat(expected.length === actual.length && expected.every((file, i) => file === actual[i]), 'Previously published snapshot file inventory changed relative to the public base ref');
    }
    const delta = gitText(root, ['diff', '--name-only', '--no-renames', base, '--', ...paths]);
    requireThat(!delta, 'Previously published snapshot content changed relative to the public base ref');
  }
}
export function verifyPublicSync({root = REPO_ROOT, source, release: selectedId, baseRef, checkDrift = false, sourceRevision = 'HEAD'} = {}) {
  root = realpathSync(root);
  const index = jsonAt(root, 'PUBLIC-SYNC.json');
  object(index, 'PUBLIC-SYNC.json');
  requireThat(index.schemaVersion === 1, 'Unsupported public sync index schema');
  array(index.releases, 'releases');
  requireThat(index.releases.length > 0, 'Public sync index has no releases');
  unique(index.releases.map(entry => entry.id), 'releases');
  requireThat(index.latestRelease === index.releases.at(-1).id, 'latestRelease must identify the last append-only release');
  const releases = index.releases.map(entry => readRelease(root, entry));
  for (let i = 1; i < releases.length; i++) {
    requireThat(releases[i].source.baselineCommit === releases[i - 1].source.commit, `${releases[i].releaseId}: source baseline must continue the previous release`);
    requireThat(releases[i].source.hostedVersion >= releases[i - 1].source.hostedVersion, 'Hosted version moved backwards');
  }
  const latest = releases.at(-1);
  const kept = new Set(latest.retainedSnapshots.map(record => record.path));
  const snapshotDir = contained(root, 'platform-updates');
  for (const item of readdirSync(snapshotDir, {withFileTypes: true})) {
    requireThat(item.isDirectory(), `platform-updates/${item.name}: expected an immutable snapshot directory`);
    const path = `platform-updates/${item.name}`;
    requireThat(path === latest.snapshot || kept.has(path), `${path}: earlier snapshot is absent from the retention ledger`);
  }
  try {
    lstatSync(join(root, 'historical-platform'));
    requireThat(kept.has('historical-platform'), 'historical-platform: missing from the retention ledger');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (baseRef) verifyBase(root, baseRef, index);
  const selected = selectedId ? releases.filter(item => item.releaseId === selectedId) : releases;
  requireThat(selected.length > 0, 'Requested release is not in the public sync index');
  let changedSourcePaths = 0;
  if (source) {
    source = realpathSync(source);
    for (const release of selected) changedSourcePaths += verifySource(source, release);
  }
  const result = {
    status: 'verified', latestRelease: latest.releaseId, releases: releases.length,
    exportedFiles: releases.reduce((sum, item) => sum + item.approvedExports.length, 0),
    recordedSourceCommit: latest.source.commit, sourceVerified: Boolean(source),
    ...(source ? {changedSourcePaths} : {}),
  };
  if (checkDrift) {
    requireThat(source && !selectedId, '--check-drift requires --source and always checks the latest release');
    requireThat(sourceRevision === 'HEAD' || COMMIT.test(sourceRevision), '--source-revision must be HEAD or a full commit hash');
    requireThat(!gitText(source, ['status', '--porcelain', '--untracked-files=normal']), 'Source checkout has uncommitted changes; isolate or refresh it before checking release drift');
    const current = gitText(source, ['rev-parse', '--verify', `${sourceRevision}^{commit}`]);
    result.currentSourceCommit = current;
    if (current !== latest.source.commit) {
      if (git(source, ['merge-base', '--is-ancestor', latest.source.commit, current], {allowFailure: true}) !== null) result.status = 'public-behind-source';
      else if (git(source, ['merge-base', '--is-ancestor', current, latest.source.commit], {allowFailure: true}) !== null) result.status = 'source-checkout-behind';
      else result.status = 'source-history-diverged';
      result.unrecordedChangedPaths = changedPaths(source, latest.source.commit, current).size;
    } else result.status = 'current';
  }
  return result;
}

function main(argv) {
  const options = {};
  let json = false, fingerprint;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help') {
      console.log('Usage: node scripts/verify-public-sync.mjs [--source PATH] [--release ID] [--base-ref PUBLIC_REF] [--json]\n       node scripts/verify-public-sync.mjs --source PATH --check-drift [--source-revision SHA] [--json]\n       node scripts/verify-public-sync.mjs --fingerprint REPO_RELATIVE_DIRECTORY\n\nRead-only. Exit 0: verified/current; 1: invalid or incomplete; 2: source/public drift.');
      return;
    }
    if (arg === '--json') json = true;
    else if (arg === '--check-drift') options.checkDrift = true;
    else {
      const names = {'--source': 'source', '--release': 'release', '--base-ref': 'baseRef', '--source-revision': 'sourceRevision', '--fingerprint': 'fingerprint'};
      requireThat(names[arg] && argv[i + 1] && !argv[i + 1].startsWith('--'), `Unknown or incomplete argument: ${arg}`);
      if (arg === '--fingerprint') fingerprint = argv[++i];
      else options[names[arg]] = argv[++i];
    }
  }
  if (fingerprint) {
    requireThat(Object.keys(options).length === 0, '--fingerprint cannot be combined with verification flags');
    console.log(JSON.stringify(fingerprintTree(REPO_ROOT, fingerprint), null, 2));
    return;
  }
  requireThat(!options.sourceRevision || options.checkDrift, '--source-revision requires --check-drift');
  const result = verifyPublicSync(options);
  if (json) console.log(JSON.stringify(result, null, 2));
  else console.log(`${result.status}: ${result.releases} release(s), ${result.exportedFiles} exact exports; latest ${result.latestRelease}.${result.sourceVerified ? ` Verified ${result.changedSourcePaths} source changes.` : ' Private source/deployment state was not accessed.'}`);
  if (!['verified', 'current'].includes(result.status)) process.exitCode = 2;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`Public sync check failed: ${error.message}`); process.exitCode = 1; }
}
