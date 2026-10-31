/**
 * Package a reviewed Meshy scenery asset for the browser without changing its mesh.
 *
 * Usage:
 *   node scripts/prepare-scenery-asset.mjs --source <remeshed.glb> --lineage <lineage.json>
 * Optional: --output <web.glb>
 *
 * Requires an already available sharp installation. No dependency is installed.
 * Geometry, UVs, accessors, indices, materials and samplers remain unchanged.
 * Only image encoding, image dimensions and GLB buffer offsets are rewritten.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaults = {
  output: path.resolve(scriptDir, '../public/assets/scenery/parallax-scenery-web.glb'),
};
const args = { ...defaults };
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i]?.replace(/^--/, '');
  if (!['source', 'lineage', 'output'].includes(key) || !process.argv[i + 1]) {
    throw new Error('Use --source <remeshed.glb> --lineage <lineage.json> [--output <web.glb>].');
  }
  args[key] = path.resolve(process.argv[i + 1]);
}
if (!args.source || !args.lineage) {
  throw new Error('Both --source and --lineage are required. They are read-only inputs.');
}
if ([args.source, args.lineage].includes(args.output)) {
  throw new Error('The derived output must not overwrite the source model or lineage record.');
}

let sharp;
try {
  sharp = require('sharp');
} catch {
  const modules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (!modules) throw new Error('sharp is unavailable. Provide an existing sharp installation.');
  sharp = require(path.join(modules, 'sharp'));
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const align4 = (n) => (n + 3) & ~3;
const invariant = (ok, message) => { if (!ok) throw new Error(message); };

function parseGlb(bytes) {
  invariant(bytes.length >= 20 && bytes.readUInt32LE(0) === 0x46546c67, 'Invalid GLB magic.');
  invariant(bytes.readUInt32LE(4) === 2, 'Only glTF 2.0 is supported.');
  invariant(bytes.readUInt32LE(8) === bytes.length, 'Incorrect GLB total length.');
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    invariant(offset + 8 <= bytes.length, 'Truncated GLB chunk header.');
    const length = bytes.readUInt32LE(offset);
    const type = bytes.readUInt32LE(offset + 4);
    invariant(length % 4 === 0 && offset + 8 + length <= bytes.length, 'Invalid GLB chunk size.');
    chunks.push({ type, bytes: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  invariant(chunks.length === 2 && chunks[0].type === 0x4e4f534a && chunks[1].type === 0x004e4942,
    'Expected one JSON chunk followed by one binary chunk.');
  const json = JSON.parse(chunks[0].bytes.toString('utf8'));
  const binary = chunks[1].bytes;
  invariant(json.buffers?.length === 1 && !json.buffers[0].uri, 'Expected one embedded buffer.');
  invariant(json.buffers[0].byteLength <= binary.length, 'Invalid declared buffer length.');
  for (const view of json.bufferViews ?? []) {
    invariant((view.buffer ?? 0) === 0, 'External buffers are unsupported.');
    invariant((view.byteOffset ?? 0) % 4 === 0, 'Unaligned buffer view.');
    invariant((view.byteOffset ?? 0) + view.byteLength <= json.buffers[0].byteLength,
      'Buffer view extends outside the embedded buffer.');
  }
  return { bytes, json, binary };
}

function viewBytes(glb, index) {
  const view = glb.json.bufferViews[index];
  invariant(!!view, `Missing buffer view ${index}.`);
  const start = view.byteOffset ?? 0;
  return glb.binary.subarray(start, start + view.byteLength);
}

function triangles(json) {
  let count = 0;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives ?? []) {
      invariant((primitive.mode ?? 4) === 4, 'This preparation script expects triangle primitives.');
      const accessor = primitive.indices ?? primitive.attributes.POSITION;
      invariant(json.accessors[accessor].count % 3 === 0, 'Invalid triangle index count.');
      count += json.accessors[accessor].count / 3;
    }
  }
  return count;
}

function rebuildGlb(json, binary) {
  const jsonBytes = Buffer.from(JSON.stringify(json));
  const jsonChunk = Buffer.alloc(align4(jsonBytes.length), 0x20);
  jsonBytes.copy(jsonChunk);
  const binChunk = Buffer.alloc(align4(binary.length));
  binary.copy(binChunk);
  const result = Buffer.alloc(12 + 8 + jsonChunk.length + 8 + binChunk.length);
  result.writeUInt32LE(0x46546c67, 0);
  result.writeUInt32LE(2, 4);
  result.writeUInt32LE(result.length, 8);
  result.writeUInt32LE(jsonChunk.length, 12);
  result.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(result, 20);
  const binHeader = 20 + jsonChunk.length;
  result.writeUInt32LE(binChunk.length, binHeader);
  result.writeUInt32LE(0x004e4942, binHeader + 4);
  binChunk.copy(result, binHeader + 8);
  return result;
}

const sourceBytes = await fs.readFile(args.source);
const source = parseGlb(sourceBytes);
const json = structuredClone(source.json);
const roles = new Map();
function registerRole(texture, role) {
  invariant(texture?.index !== undefined, `Missing ${role} texture.`);
  const image = json.textures[texture.index].source;
  invariant(image !== undefined, `Missing ${role} image.`);
  invariant(!roles.has(image) || roles.get(image) === role, 'Image reused for incompatible texture roles.');
  roles.set(image, role);
}
for (const material of json.materials ?? []) {
  registerRole(material.pbrMetallicRoughness?.baseColorTexture, 'base_color');
  registerRole(material.pbrMetallicRoughness?.metallicRoughnessTexture, 'metallic_roughness');
  registerRole(material.normalTexture, 'normal');
}
invariant(roles.size === json.images.length, 'Unexpected image role; refuse to transcode blindly.');
const imageViews = new Map();
const textureInfo = [];
for (const [index, image] of json.images.entries()) {
  invariant(image.bufferView !== undefined && !image.uri, 'All textures must be embedded.');
  invariant(!imageViews.has(image.bufferView), 'Images sharing a buffer view are unsupported.');
  const role = roles.get(index);
  const input = viewBytes(source, image.bufferView);
  const inputMeta = await sharp(input).metadata();
  invariant(inputMeta.channels === 3 || inputMeta.channels === 4, 'Expected RGB or RGBA texture.');
  const encoder = sharp(input).removeAlpha().resize(1024, 1024, { fit: 'fill', kernel: 'lanczos3' });
  const quality = role === 'base_color' ? 92 : role === 'normal' ? 96 : undefined;
  const output = role === 'metallic_roughness'
    ? await encoder.png({ compressionLevel: 9, palette: false, adaptiveFiltering: true }).toBuffer()
    : await encoder.jpeg({ quality, chromaSubsampling: '4:4:4', mozjpeg: true }).toBuffer();
  const { data: decoded, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
  invariant(info.width === 1024 && info.height === 1024 && info.channels === 3,
    `Unexpected ${role} texture dimensions or channels.`);
  invariant(decoded.length === 1024 * 1024 * 3, `Could not decode all ${role} pixels.`);
  const mimeType = role === 'metallic_roughness' ? 'image/png' : 'image/jpeg';
  image.mimeType = mimeType;
  imageViews.set(image.bufferView, output);
  textureInfo.push({
    role, image_index: index, source_width: inputMeta.width, source_height: inputMeta.height,
    source_mime_type: source.json.images[index].mimeType, source_bytes: input.length,
    width: info.width, height: info.height, channels: info.channels,
    mime_type: mimeType, bytes: output.length, resize_kernel: 'lanczos3',
    ...(quality ? { quality, chroma_subsampling: '4:4:4' } : { lossless_encoding: true }),
    sha256: sha256(output),
  });
}

const accessorViews = new Set();
for (const accessor of json.accessors ?? []) {
  if (accessor.bufferView !== undefined) accessorViews.add(accessor.bufferView);
  if (accessor.sparse) {
    accessorViews.add(accessor.sparse.indices.bufferView);
    accessorViews.add(accessor.sparse.values.bufferView);
  }
}
for (const index of accessorViews) invariant(!imageViews.has(index), 'Image shares a geometry buffer view.');

const parts = [];
let binaryLength = 0;
for (const [index, view] of json.bufferViews.entries()) {
  const bytes = imageViews.get(index) ?? viewBytes(source, index);
  view.byteOffset = binaryLength;
  view.byteLength = bytes.length;
  parts.push(bytes);
  const padding = align4(bytes.length) - bytes.length;
  if (padding) parts.push(Buffer.alloc(padding));
  binaryLength += bytes.length + padding;
}
json.buffers[0].byteLength = binaryLength;
const derivedBytes = rebuildGlb(json, Buffer.concat(parts));
const derived = parseGlb(derivedBytes);
invariant(derivedBytes.length <= 10_000_000, 'Packaged GLB exceeds the 10 MB target.');

const geometryViews = [];
for (let index = 0; index < json.bufferViews.length; index++) {
  if (imageViews.has(index)) continue;
  const before = viewBytes(source, index);
  const after = viewBytes(derived, index);
  invariant(before.equals(after), `Geometry buffer view ${index} changed.`);
  geometryViews.push({ buffer_view: index, bytes: after.length, sha256: sha256(after) });
}
for (const key of ['accessors', 'meshes', 'nodes', 'scenes', 'scene', 'materials', 'textures', 'samplers']) {
  invariant(JSON.stringify(source.json[key]) === JSON.stringify(derived.json[key]), `${key} changed.`);
}
invariant(triangles(source.json) === triangles(derived.json), 'Triangle count changed.');
const sourceGeometryHash = sha256(Buffer.concat(geometryViews.map(({ buffer_view }) => viewBytes(source, buffer_view))));
const derivedGeometryHash = sha256(Buffer.concat(geometryViews.map(({ buffer_view }) => viewBytes(derived, buffer_view))));
invariant(sourceGeometryHash === derivedGeometryHash, 'Aggregate geometry hash changed.');

const provenance = {
  schema_version: 1,
  ...JSON.parse(await fs.readFile(args.lineage,'utf8')),
  remeshed: { bytes: sourceBytes.length, triangles: triangles(source.json), sha256: sha256(sourceBytes) },
  web: { filename: path.basename(args.output), bytes: derivedBytes.length, triangles: triangles(derived.json), sha256: sha256(derivedBytes) },
  texture_encoding: textureInfo,
  geometry_preserved: {
    verified: true, source_sha256: sourceGeometryHash, derived_sha256: derivedGeometryHash,
    unchanged: ['indices', 'positions', 'normals', 'uvs', 'accessors', 'meshes', 'nodes', 'scenes', 'materials', 'textures', 'samplers'],
    buffer_views: geometryViews,
  },
  preparation: { script: 'scripts/prepare-scenery-asset.mjs', encoder: 'sharp', encoder_version: sharp.versions.sharp },
};
await fs.mkdir(path.dirname(args.output), { recursive: true });
await fs.writeFile(args.output, derivedBytes);
await fs.writeFile(path.join(path.dirname(args.output), 'provenance.json'), `${JSON.stringify(provenance, null, 2)}\n`);
const saved = await fs.readFile(args.output);
invariant(sha256(saved) === provenance.web.sha256, 'Written GLB hash does not match verified output.');
console.log(JSON.stringify({
  output: args.output, bytes: saved.length, triangles: triangles(derived.json),
  geometry_preserved: true, sha256: provenance.web.sha256,
  textures: textureInfo.map(({ role, width, height, channels, mime_type, bytes }) => ({ role, width, height, channels, mime_type, bytes })),
}, null, 2));


