const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('public/rocket-model.js', 'utf8');
function api(extra = {}) {
  const scope = { module: { exports: {} }, TextDecoder, ArrayBuffer, Uint8Array, Uint16Array, Uint32Array, Float32Array, DataView, AbortController, URL, setTimeout, clearTimeout, ...extra };
  vm.runInNewContext(source, scope, { filename: 'rocket-model.js' });
  return scope.module.exports;
}
const rocket = api();

// A valid, interleaved triangle with separate image buffer views exercises glTF byte offsets.
function fixture(edit = () => {}) {
  const vertices = new Float32Array([
    -1, 0, 0, 0, 0, 1, 0, 0,
    1, 0, 0, 0, 0, 1, 1, 0,
    0, 2, 0, 0, 0, 1, .5, 1
  ]);
  const binary = Buffer.alloc(116);
  Buffer.from(vertices.buffer).copy(binary);
  [0, 1, 2].forEach((value, index) => binary.writeUInt16LE(value, 96 + index * 2));
  const json = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
    accessors: [
      { bufferView: 0, type: 'VEC3', componentType: 5126, count: 3 },
      { bufferView: 0, byteOffset: 12, type: 'VEC3', componentType: 5126, count: 3 },
      { bufferView: 0, byteOffset: 24, type: 'VEC2', componentType: 5126, count: 3 },
      { bufferView: 1, type: 'SCALAR', componentType: 5123, count: 3 }
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: 96, byteStride: 32 },
      { buffer: 0, byteOffset: 96, byteLength: 6 },
      { buffer: 0, byteOffset: 104, byteLength: 4 },
      { buffer: 0, byteOffset: 108, byteLength: 4 },
      { buffer: 0, byteOffset: 112, byteLength: 4 }
    ],
    buffers: [{ byteLength: binary.length }],
    images: [2, 3, 4].map(bufferView => ({ bufferView, mimeType: 'image/png' })),
    textures: [0, 1, 2].map(source => ({ source })),
    materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicRoughnessTexture: { index: 1 }, metallicFactor: .7, roughnessFactor: .8 }, normalTexture: { index: 2 } }]
  };
  edit(json, binary);
  const encoded = Buffer.from(JSON.stringify(json));
  const jsonBytes = Buffer.alloc(Math.ceil(encoded.length / 4) * 4, 32); encoded.copy(jsonBytes);
  const output = Buffer.alloc(12 + 8 + jsonBytes.length + 8 + binary.length);
  output.writeUInt32LE(0x46546c67, 0); output.writeUInt32LE(2, 4); output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(jsonBytes.length, 12); output.writeUInt32LE(0x4e4f534a, 16); jsonBytes.copy(output, 20);
  const at = 20 + jsonBytes.length; output.writeUInt32LE(binary.length, at); output.writeUInt32LE(0x004e4942, at + 4); binary.copy(output, at + 8);
  return output;
}

test('the shipped rocket has the intended geometry and embedded PBR channels', () => {
  const model = rocket.parseGLB(fs.readFileSync('public/assets/rocket/parallax-rocket-web.glb'));
  assert.equal(model.triangles, 51271);
  assert.equal(model.vertexCount, 56384);
  assert.equal(model.indices.BYTES_PER_ELEMENT, 2);
  assert.equal(model.material.doubleSided, true);
  assert.deepEqual(Array.from(model.images, image => image.mimeType), ['image/jpeg', 'image/png', 'image/jpeg']);
  assert.ok(model.images.every(image => image.bytes.length > 1000));
  // An asymmetric rear foot must not displace the hull from the existing flight deck.
  assert.ok(Math.abs(model.center[0] - .001125) < .000001);
  assert.ok(Math.abs(model.center[2] - .070635) < .000001);
  assert.ok(model.center[1] < -.95);
});

test('interleaved accessors and indexed triangles preserve normals, UVs, and material factors', () => {
  const model = rocket.parseGLB(fixture());
  assert.deepEqual(Array.from(model.positions), [-1, 0, 0, 1, 0, 0, 0, 2, 0]);
  assert.deepEqual(Array.from(model.normals), [0, 0, 1, 0, 0, 1, 0, 0, 1]);
  assert.deepEqual(Array.from(model.uvs), [0, 0, 1, 0, .5, 1]);
  assert.equal(model.material.metallic, .7);
  assert.equal(model.material.roughness, .8);
  assert.deepEqual(Array.from(rocket.interleave(model, true)), [
    -1, 0, 0, 0, 0, 1, 0, 0,
    1, 0, 0, 0, 0, 1, 1, 0,
    0, 2, 0, 0, 0, 1, .5, 1
  ]);
});

test('truncated, oversized-accessor, invalid-index and non-finite inputs fail before upload', () => {
  const truncated = fixture().subarray(0, -4);
  assert.throws(() => rocket.parseGLB(truncated), /file length/);
  assert.throws(() => rocket.parseGLB(fixture(json => { json.accessors[0].count = 4; })), /accessor exceeds/);
  assert.throws(() => rocket.parseGLB(fixture((json, binary) => { binary.writeUInt16LE(3, 96); })), /index exceeds/);
  assert.throws(() => rocket.parseGLB(fixture((json, binary) => { binary.writeFloatLE(NaN, 0); })), /non-finite/);
});

test('external images, transforms, unsupported texture coordinates and compressed extensions fail explicitly', () => {
  assert.throws(() => rocket.parseGLB(fixture(json => { json.images[0].uri = 'https://example.com/private.png'; })), /embedded color image/);
  assert.throws(() => rocket.parseGLB(fixture(json => { json.nodes[0].translation = [1, 0, 0]; })), /transformed/);
  assert.throws(() => rocket.parseGLB(fixture(json => { json.materials[0].normalTexture.texCoord = 1; })), /unsupported normal map/);
  assert.throws(() => rocket.parseGLB(fixture(json => { json.extensionsUsed = ['KHR_draco_mesh_compression']; })), /compressed/);
});

test('boarding never raises the exterior or ignites the engines, and cancellation resets lights', () => {
  const flight = { mode: 'lift', rise: 37, elapsed: 3 };
  const state = rocket.lightingState(flight);
  assert.equal(state.mode, 'BOARDING'); assert.equal(state.rise, 0); assert.equal(state.values[2], 0);
  assert.equal(flight.rise, 37);
  assert.equal(rocket.lightingState({ mode: 'cabin' }).values[2], 0);
  assert.equal(rocket.lightingState({ mode: 'ground' }).values[2], 0);
  const off = rocket.lightingState({ mode: 'ground' }, { enabled: false });
  assert.equal(off.mode, 'OFF'); assert.ok(off.values.every(value => value === 0));
  assert.equal(rocket.lightingState({ mode: 'launch', elapsed: 2.99 }).values[2], 0);
  assert.equal(rocket.lightingState({ mode: 'launch', elapsed: 3 }).values[2], 0);
  assert.equal(rocket.lightingState({ mode: 'launch', elapsed: 3.25 }, { motion: false }).values[2], .5);
  const launch = rocket.lightingState({ mode: 'launch', elapsed: 4, rise: 100 }, { motion: false, time: 10 });
  assert.equal(launch.mode, 'LAUNCH'); assert.equal(launch.rise, 100); assert.equal(launch.values[2], 1);
  assert.deepEqual(Array.from(launch.values), Array.from(rocket.lightingState({ mode: 'launch', elapsed: 4, rise: 100 }, { motion: false, time: 11 }).values));
  assert.equal(rocket.lightingState({ mode: 'launch', elapsed: 4 }, { ready: false }).mode, 'OFF');
});

test('a failed asset leaves an error handle and reports asynchronously only once', async () => {
  let errors = 0, returned = false;
  const gl = { canvas: { addEventListener() {}, removeEventListener() {} }, deleteProgram() {}, deleteBuffer() {}, deleteTexture() {} };
  const model = api({ location: { href: 'https://parallax.test/explore', origin: 'https://parallax.test' }, fetch: async () => ({ ok: true, headers: { get: () => null }, arrayBuffer: async () => new ArrayBuffer(4) }) });
  const handle = model.create(gl, { url: '/rocket.glb', environmentFragment: 'vec3 sky(vec3 p){return p;}', onError() { assert.equal(returned, true); errors++; } });
  assert.equal(handle.status, 'loading'); returned = true;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(handle.status, 'error'); assert.equal(handle.ready, false); assert.equal(errors, 1);
  assert.equal(handle.draw({}), false); handle.destroy(); assert.equal(handle.status, 'destroyed');
});

test('a failed material image closes decoded bitmaps and preserves the existing GPU scene', async () => {
  let decoded = 0, closed = 0, revoked = 0, gpuAllocations = 0, failure;
  let finish;
  const done = new Promise(resolve => { finish = resolve; });
  class LocalURL extends URL {
    static createObjectURL() { return 'blob:test-material'; }
    static revokeObjectURL() { revoked++; }
  }
  class FailedImage { set src(value) { queueMicrotask(() => this.onerror()); } }
  const gl = {
    canvas: { addEventListener() {}, removeEventListener() {} }, getExtension() { return {}; },
    createProgram() { gpuAllocations++; throw new Error('material failure must precede GPU allocation'); },
    deleteProgram() {}, deleteBuffer() {}, deleteTexture() {}
  };
  const model = api({
    Blob, URL: LocalURL, Image: FailedImage,
    location: { href: 'https://parallax.test/explore', origin: 'https://parallax.test' },
    fetch: async () => ({ ok: true, headers: { get: () => null }, arrayBuffer: async () => fixture() }),
    createImageBitmap: async () => {
      decoded++;
      if (decoded === 2) throw new Error('corrupt material image');
      return { width: 8, height: 8, close() { closed++; } };
    }
  });
  const handle = model.create(gl, {
    url: '/rocket.glb', environmentFragment: 'vec3 sky(vec3 p){return p;}',
    onError(error) { failure = error; finish(); }
  });
  await done;
  assert.match(failure.message, /texture decode failed/);
  assert.equal(decoded, 2); assert.equal(closed, 1); assert.equal(revoked, 1);
  assert.equal(gpuAllocations, 0); assert.equal(handle.status, 'error'); assert.equal(handle.draw({}), false);
  handle.destroy();
});

test('destroy aborts an unfinished request without a late error or ready callback', async () => {
  let signal, callbacks = 0;
  const gl = { canvas: { addEventListener() {}, removeEventListener() {} }, deleteProgram() {}, deleteBuffer() {}, deleteTexture() {} };
  const model = api({ location: { href: 'https://parallax.test/explore', origin: 'https://parallax.test' }, fetch: (url, options) => {
    signal = options.signal;
    return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))));
  } });
  const handle = model.create(gl, { url: '/rocket.glb', environmentFragment: 'vec3 sky(vec3 p){return p;}', onReady() { callbacks++; }, onError() { callbacks++; } });
  await new Promise(resolve => setImmediate(resolve)); handle.destroy();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(signal.aborted, true); assert.equal(handle.status, 'destroyed'); assert.equal(callbacks, 0);
});
