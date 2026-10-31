/* PARALLAX Earthbound: one self-contained static GLB, rendered in the existing WebGL context.
   This intentionally supports the reviewed rocket asset, not arbitrary glTF scenes.
   The caller owns the world's texture bindings and restores them after draw(). */
(() => {
  'use strict';

  const MODEL_HEIGHT = 69;
  const MAX_ASSET_BYTES = 64 * 1024 * 1024;
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const integer = value => Number.isSafeInteger(value) && value >= 0;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  function requireValue(condition, message) { if (!condition) throw new Error('Rocket model: ' + message); }

  // Positions are in metres after centering the cylindrical hull, with the feet at y=0.
  // The low work lamps are fitted just in front of the actual remeshed surface.
  const fixtures = Object.freeze([
    { name: 'nose-beacon', position: [-.063, 69.12, .182], color: [.76, .88, 1], size: .63, channel: 1 },
    { name: 'upper-red', position: [-4.74, 56, 4.12], color: [1, .055, .018], size: .46, channel: 1 },
    { name: 'port-cyan', position: [-4.64, 30, 4.09], color: [.06, .63, 1], size: .48, channel: 1 },
    { name: 'starboard-red', position: [5.16, 29, 3.34], color: [1, .055, .018], size: .46, channel: 1 },
    { name: 'upper-work', position: [1.96, 40, 5.95], color: [1, .73, .40], size: .61, channel: 0 },
    { name: 'lower-work', position: [-3.54, 17, 5.25], color: [1, .73, .40], size: .61, channel: 0 },
    { name: 'skirt-work', position: [.76, 9.7, 7.62], color: [1, .73, .40], size: .57, channel: 0 },
    { name: 'port-flood', position: [-5.24, 7.3, 6.23], color: [1, .73, .40], size: .72, channel: 0 },
    { name: 'starboard-flood', position: [5.16, 7.3, 6.14], color: [1, .73, .40], size: .72, channel: 0 },
    { name: 'port-leg', position: [-9.04, 5, 5.71], color: [1, .73, .40], size: .55, channel: 0 },
    { name: 'starboard-leg', position: [8.96, 5, 5.66], color: [1, .73, .40], size: .55, channel: 0 },
    { name: 'engine-center', position: [0, 2.6, 0], color: [.48, .72, 1], size: 2.4, channel: 2 },
    { name: 'engine-port', position: [-2.6, 2.8, -1.5], color: [.48, .72, 1], size: 2.1, channel: 2 },
    { name: 'engine-starboard', position: [2.6, 2.8, -1.5], color: [.48, .72, 1], size: 2.1, channel: 2 }
  ].map(value => Object.freeze({ ...value, position: Object.freeze(value.position), color: Object.freeze(value.color) })));

  // Exactly two downward work lights and one engine light. No shadow maps or fullscreen passes.
  const lightingGLSL = `
    uniform vec3 rocketOrigin;
    uniform float rocketRise;
    uniform vec4 rocketLights;
    float rocketSpot(vec3 p,vec3 n,vec3 source,vec3 target){
      vec3 delta=p-source;float d2=max(dot(delta,delta),.001);
      float cone=dot(delta*inversesqrt(d2),normalize(target-source));
      return smoothstep(.80,.96,cone)*max(0.,dot(n,-delta*inversesqrt(d2)))/(1.+d2*.055);
    }
    vec3 rocketIllumination(vec3 p,vec3 n){
      vec3 origin=rocketOrigin+vec3(0.,rocketRise,0.);
      float left=rocketSpot(p,n,origin+vec3(-5.24,7.3,6.23),origin+vec3(-8.,0.,10.));
      float right=rocketSpot(p,n,origin+vec3(5.16,7.3,6.14),origin+vec3(8.,0.,10.));
      vec3 result=vec3(7.2,4.7,2.5)*(left+right)*rocketLights.x;
      vec3 toEngine=origin+vec3(0.,2.6,0.)-p;float d2=max(dot(toEngine,toEngine),.001);
      result+=vec3(9.,14.,22.)*rocketLights.z*max(0.,dot(n,toEngine*inversesqrt(d2)))/(1.+d2*.12);
      return result;
    }
  `;

  function lightingState(flight, options = {}) {
    const { enabled = true, ready = true, motion = true, time = 0 } = options;
    const mode = flight?.mode || 'ground';
    const elapsed = finite(flight?.elapsed) ? Math.max(0, flight.elapsed) : 0;
    const rise = (mode === 'launch' || mode === 'orbit') && finite(flight?.rise) ? Math.max(0, flight.rise) : 0;
    if (!ready) return { mode: 'OFF', values: [0, 0, 0, 0], rise };
    if (mode === 'launch' || mode === 'orbit') {
      const ignition = mode === 'orbit' ? 1 : clamp((elapsed - 3) / .5, 0, 1);
      // Slow, restrained engine variation; reduced-motion mode keeps every lamp steady.
      const steady = motion && finite(time) ? .98 + .02 * Math.sin(time * 4) : 1;
      return { mode: 'LAUNCH', values: [.92, 1, ignition * steady, 0], rise };
    }
    if (mode === 'lift' || mode === 'cabin') return { mode: 'BOARDING', values: [1.25, 1, 0, 1], rise: 0 };
    return enabled
      ? { mode: 'STANDBY', values: [.70, .78, 0, 0], rise: 0 }
      : { mode: 'OFF', values: [0, 0, 0, 0], rise: 0 };
  }

  function parseGLB(input) {
    const bytes = input instanceof ArrayBuffer ? new Uint8Array(input)
      : ArrayBuffer.isView(input) ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength) : null;
    requireValue(bytes && bytes.byteLength >= 28 && bytes.byteLength <= MAX_ASSET_BYTES, 'invalid file size');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    requireValue(view.getUint32(0, true) === 0x46546c67 && view.getUint32(4, true) === 2, 'expected GLB version 2');
    requireValue(view.getUint32(8, true) === bytes.byteLength, 'file length does not match header');
    let json = null, binary = null;
    for (let offset = 12; offset < bytes.byteLength;) {
      requireValue(offset + 8 <= bytes.byteLength, 'truncated chunk header');
      const length = view.getUint32(offset, true), type = view.getUint32(offset + 4, true);
      requireValue(length % 4 === 0 && offset + 8 + length <= bytes.byteLength, 'invalid chunk bounds');
      const chunk = bytes.subarray(offset + 8, offset + 8 + length);
      if (type === 0x4e4f534a) {
        requireValue(json === null && offset === 12, 'expected one leading JSON chunk');
        json = JSON.parse(new TextDecoder().decode(chunk));
      } else if (type === 0x004e4942) {
        requireValue(binary === null, 'multiple binary chunks are unsupported'); binary = chunk;
      }
      offset += 8 + length;
    }
    requireValue(json && binary && json.asset?.version === '2.0', 'missing model data');
    requireValue(!json.extensionsRequired?.length && !json.extensionsUsed?.length, 'extended/compressed assets are unsupported');
    requireValue(!json.animations?.length && !json.skins?.length, 'animated assets are unsupported');
    requireValue(json.buffers?.length === 1 && !json.buffers[0].uri, 'expected an embedded buffer');
    requireValue(integer(json.buffers[0].byteLength) && json.buffers[0].byteLength <= binary.byteLength, 'invalid buffer size');
    const bufferLength = json.buffers[0].byteLength;
    requireValue(json.nodes?.length === 1 && json.meshes?.length === 1 && json.nodes[0].mesh === 0, 'expected one static mesh node');
    const node = json.nodes[0];
    requireValue(!node.children?.length && node.skin === undefined, 'node hierarchy is unsupported');
    for (const [key, expected] of [['matrix', identity], ['translation', [0, 0, 0]], ['rotation', [0, 0, 0, 1]], ['scale', [1, 1, 1]]]) {
      requireValue(node[key] === undefined || (Array.isArray(node[key]) && node[key].length === expected.length && node[key].every((n, i) => finite(n) && Math.abs(n - expected[i]) < 1e-7)), 'transformed mesh nodes are unsupported');
    }
    const scene = json.scenes?.[json.scene ?? 0];
    requireValue(scene?.nodes?.length === 1 && scene.nodes[0] === 0, 'unexpected active scene');
    const primitives = json.meshes[0].primitives;
    requireValue(primitives?.length === 1 && (primitives[0].mode ?? 4) === 4 && !primitives[0].targets, 'expected one triangle primitive');
    const primitive = primitives[0];
    function bufferView(index) {
      requireValue(integer(index) && !!json.bufferViews?.[index], 'missing buffer view');
      const value = json.bufferViews[index], offset = value.byteOffset ?? 0;
      requireValue(value.buffer === 0 && integer(offset) && integer(value.byteLength) && offset + value.byteLength <= bufferLength, 'buffer view exceeds binary data');
      return { ...value, byteOffset: offset };
    }
    function accessor(index, type, components, isIndex = false) {
      requireValue(integer(index) && !!json.accessors?.[index], 'missing accessor');
      const value = json.accessors[index], offset = value.byteOffset ?? 0;
      requireValue(value.type === type && integer(value.count) && value.count > 0 && value.count <= 3000000 && !value.sparse && !value.normalized, 'unsupported accessor');
      requireValue(isIndex ? [5121, 5123, 5125].includes(value.componentType) : value.componentType === 5126, 'unsupported component type');
      const source = bufferView(value.bufferView), size = value.componentType === 5121 ? 1 : value.componentType === 5123 ? 2 : 4;
      const packed = size * components, stride = source.byteStride ?? packed;
      requireValue(integer(offset) && offset % size === 0 && integer(stride) && stride >= packed && stride % size === 0, 'invalid accessor stride');
      requireValue(offset + (value.count - 1) * stride + packed <= source.byteLength, 'accessor exceeds its buffer view');
      const result = isIndex ? new Uint32Array(value.count) : new Float32Array(value.count * components);
      const data = new DataView(binary.buffer, binary.byteOffset + source.byteOffset, source.byteLength);
      for (let i = 0; i < value.count; i++) for (let j = 0; j < components; j++) {
        const at = offset + i * stride + j * size;
        const number = !isIndex ? data.getFloat32(at, true) : size === 1 ? data.getUint8(at) : size === 2 ? data.getUint16(at, true) : data.getUint32(at, true);
        requireValue(finite(number), 'non-finite vertex data'); result[i * components + j] = number;
      }
      return result;
    }
    const positions = accessor(primitive.attributes?.POSITION, 'VEC3', 3);
    const normals = accessor(primitive.attributes?.NORMAL, 'VEC3', 3);
    const uvs = accessor(primitive.attributes?.TEXCOORD_0, 'VEC2', 2);
    const vertexCount = positions.length / 3;
    requireValue(normals.length === positions.length && uvs.length === vertexCount * 2, 'attribute counts disagree');
    let indices = primitive.indices === undefined ? Uint32Array.from({ length: vertexCount }, (_, i) => i) : accessor(primitive.indices, 'SCALAR', 1, true);
    requireValue(indices.length % 3 === 0, 'incomplete triangles');
    let maxIndex = 0;
    for (const index of indices) { requireValue(index < vertexCount, 'triangle index exceeds vertex count'); maxIndex = Math.max(maxIndex, index); }
    if (maxIndex <= 65535) indices = new Uint16Array(indices);
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < positions.length; i++) { const axis = i % 3; min[axis] = Math.min(min[axis], positions[i]); max[axis] = Math.max(max[axis], positions[i]); }
    requireValue(max[1] - min[1] > .00001, 'zero-height geometry');
    // Center the hull, not the asymmetric landing feet, to align with the existing flight deck.
    const lower = min[1] + (max[1] - min[1]) * .38, upper = min[1] + (max[1] - min[1]) * .65;
    const hullMin = [Infinity, Infinity], hullMax = [-Infinity, -Infinity]; let hullCount = 0;
    for (let i = 0; i < vertexCount; i++) if (positions[i * 3 + 1] >= lower && positions[i * 3 + 1] <= upper) {
      hullCount++;
      for (const [slot, axis] of [[0, 0], [1, 2]]) { const number = positions[i * 3 + axis]; hullMin[slot] = Math.min(hullMin[slot], number); hullMax[slot] = Math.max(hullMax[slot], number); }
    }
    const center = hullCount ? [(hullMin[0] + hullMax[0]) / 2, min[1], (hullMin[1] + hullMax[1]) / 2]
      : [(min[0] + max[0]) / 2, min[1], (min[2] + max[2]) / 2];
    const material = json.materials?.[primitive.material ?? 0] || {};
    requireValue(!material.extensions && (material.alphaMode ?? 'OPAQUE') === 'OPAQUE', 'unsupported transparent/extended material');
    const pbr = material.pbrMetallicRoughness || {};
    function imageFor(textureInfo, label) {
      requireValue(textureInfo && (textureInfo.texCoord ?? 0) === 0 && !textureInfo.extensions, 'missing or unsupported ' + label + ' map');
      const texture = json.textures?.[textureInfo.index], source = json.images?.[texture?.source];
      requireValue(texture && source && !texture.extensions && !source.uri && ['image/png', 'image/jpeg'].includes(source.mimeType), 'expected an embedded ' + label + ' image');
      const bv = bufferView(source.bufferView), sampler = json.samplers?.[texture.sampler] || {};
      return { mimeType: source.mimeType, bytes: binary.subarray(bv.byteOffset, bv.byteOffset + bv.byteLength), sampler };
    }
    const images = [imageFor(pbr.baseColorTexture, 'color'), imageFor(pbr.metallicRoughnessTexture, 'metallic/roughness'), imageFor(material.normalTexture, 'normal')];
    const color = pbr.baseColorFactor ?? [1, 1, 1, 1];
    requireValue(Array.isArray(color) && color.length === 4 && color.every(n => finite(n) && n >= 0 && n <= 1), 'invalid base-color factor');
    const metallic = pbr.metallicFactor ?? 1, roughness = pbr.roughnessFactor ?? 1, normalScale = material.normalTexture.scale ?? 1;
    requireValue(finite(metallic) && metallic >= 0 && metallic <= 1 && finite(roughness) && roughness >= 0 && roughness <= 1 && finite(normalScale), 'invalid material factors');
    return { positions, normals, uvs, indices, images, vertexCount, triangles: indices.length / 3, bounds: { min, max }, center,
      material: { color, metallic, roughness, normalScale, doubleSided: !!material.doubleSided } };
  }

  function interleave(model, expand = false) {
    const count = expand ? model.indices.length : model.vertexCount, output = new Float32Array(count * 8);
    for (let i = 0; i < count; i++) {
      const source = expand ? model.indices[i] : i, target = i * 8;
      for (let j = 0; j < 3; j++) { output[target + j] = model.positions[source * 3 + j]; output[target + 3 + j] = model.normals[source * 3 + j]; }
      output[target + 6] = model.uvs[source * 2]; output[target + 7] = model.uvs[source * 2 + 1];
    }
    return output;
  }

  const vertexShader = `
    precision highp float;
    attribute vec3 position,normal;attribute vec2 uv;
    uniform vec3 eye,right,up,forward,rocketOrigin,modelCenter;
    uniform float aspect,lens,modelScale,rocketRise;
    varying vec3 point,norm;varying vec2 textureUV;
    void main(){point=(position-modelCenter)*modelScale+rocketOrigin+vec3(0.,rocketRise,0.);norm=normal;textureUV=uv;
      vec3 p=point-eye;float depth=dot(p,forward);
      gl_Position=vec4(dot(p,right)/(aspect*lens),dot(p,up)/lens,1.000025*depth-.10000125,depth);}
  `;
  function fragmentShader(environmentFragment) {
    return '#extension GL_OES_standard_derivatives : enable\n' + environmentFragment + lightingGLSL + `
      uniform sampler2D baseMap,metalRoughMap,normalMap;
      uniform vec4 baseFactor;uniform float metallicFactor,roughnessFactor,normalScale;
      varying vec3 point,norm;varying vec2 textureUV;
      vec3 surfaceNormal(){
        vec3 n=normalize(norm);if(!gl_FrontFacing)n=-n;
        vec3 q1=dFdx(point),q2=dFdy(point);vec2 s1=dFdx(textureUV),s2=dFdy(textureUV);
        vec3 q2perp=cross(q2,n),q1perp=cross(n,q1);
        vec3 tangent=q2perp*s1.x+q1perp*s2.x,bitangent=q2perp*s1.y+q1perp*s2.y;
        float length2=max(dot(tangent,tangent),dot(bitangent,bitangent));
        if(length2<.00000001)return n;
        vec3 map=texture2D(normalMap,textureUV).xyz*2.-1.;map.xy*=normalScale;
        return normalize(mat3(tangent*inversesqrt(length2),bitangent*inversesqrt(length2),n)*map);
      }
      void main(){
        vec3 n=surfaceNormal(),view=normalize(eye-point);
        vec3 albedo=pow(max(texture2D(baseMap,textureUV).rgb*baseFactor.rgb,vec3(.001)),vec3(2.2));
        vec3 materialSample=texture2D(metalRoughMap,textureUV).rgb;
        float metal=clamp(materialSample.b*metallicFactor,0.,1.),rough=clamp(materialSample.g*roughnessFactor,.14,1.);
        float facing=max(dot(n,view),0.);vec3 f0=mix(vec3(.04),albedo,metal);
        vec3 fresnel=f0+(1.-f0)*pow(1.-facing,5.);
        vec3 reflected=reflect(-view,n),blur=vec3(.18,.13,.11)*rough;
        vec3 environment=(sky(reflected)*.5+sky(normalize(reflected+blur))*.25+sky(normalize(reflected-blur))*.25);
        environment=pow(max(environment,vec3(.001)),vec3(2.2));
        vec3 key=normalize(vec3(-.32,.65,.62));float diffuse=max(dot(n,key),0.);
        vec3 fill=mix(vec3(.12,.15,.19),vec3(.055,.075,.105),night)*(.48+.52*max(n.y,0.));
        vec3 color=albedo*(1.-metal*.82)*(fill+vec3(.48,.43,.34)*diffuse);
        color+=environment*fresnel*(2.4-rough*.8);
        float specular=pow(max(dot(n,normalize(view+key)),0.),mix(120.,9.,rough));
        color+=fresnel*vec3(1.25,1.30,1.38)*specular*(1.-rough*.55);
        color+=(albedo*(1.-metal)+f0*.80)*rocketIllumination(point,n);
        color+=albedo*vec3(.022,.030,.044)*(.4+.6*pow(1.-facing,2.));
        color=pow(max(color,vec3(0.)),vec3(1./2.2));
        float fog=clamp(1.-exp(-length(point-eye)*.00085),0.,.86);
        vec3 haze=sky(normalize(vec3(point.x-eye.x,.025,point.z-eye.z)))*.68;
        gl_FragColor=vec4(mix(color,haze,fog),1.);
      }
    `;
  }
  const glowVertex = `
    precision highp float;
    attribute vec3 position,normal;attribute vec2 uv;
    uniform vec3 eye,right,up,forward,rocketOrigin;uniform float aspect,lens,rocketRise,viewportHeight,fixtureScale;
    uniform vec4 rocketLights;varying vec3 glowColor;varying float power;
    void main(){
      power=uv.y<.5?rocketLights.x:uv.y<1.5?rocketLights.y:rocketLights.z;
      glowColor=normal;vec3 p=position*fixtureScale+rocketOrigin+vec3(0.,rocketRise,0.)-eye;float depth=dot(p,forward);
      gl_Position=vec4(dot(p,right)/(aspect*lens),dot(p,up)/lens,1.000025*depth-.10000125,depth);
      gl_PointSize=clamp(uv.x*fixtureScale*viewportHeight/(max(depth,.1)*lens)*2.5,2.,72.);
      if(power<=0.||depth<=.05)gl_Position=vec4(2.,2.,2.,1.);
    }
  `;
  const glowFragment = `
    precision mediump float;varying vec3 glowColor;varying float power;
    void main(){vec2 p=gl_PointCoord*2.-1.;float r2=dot(p,p);if(r2>1.||power<=0.)discard;
      float halo=exp(-r2*5.)*.20,core=exp(-r2*42.)*1.25;
      gl_FragColor=vec4(glowColor*(halo+core)*power,0.);}
  `;

  async function decodeImage(image) {
    const blob = new Blob([image.bytes], { type: image.mimeType });
    if (typeof createImageBitmap === 'function') {
      try { return await createImageBitmap(blob, { imageOrientation: 'none', premultiplyAlpha: 'none', colorSpaceConversion: 'none' }); }
      catch (_) { /* Older Safari falls back to an Image without changing the texture coordinates. */ }
    }
    return new Promise((resolve, reject) => {
      const objectURL = URL.createObjectURL(blob), img = new Image();
      img.onload = () => { URL.revokeObjectURL(objectURL); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(objectURL); reject(new Error('Rocket model: texture decode failed')); };
      img.src = objectURL;
    });
  }

  function create(gl, options = {}) {
    let status = 'loading', alive = true, modelInfo = null, material = null, vertexBuffer, indexBuffer, glowBuffer, meshProgram, lampProgram;
    let drawCount = 0, indexType = null, textures = [], uniforms, lampUniforms, partBuffer;
    const resources = { programs: [], buffers: [], textures: [] }, abort = new AbortController();
    const height = options.height ?? MODEL_HEIGHT, origin = options.origin || [0, 0, 0];
    const timeout = setTimeout(() => abort.abort(), 30000);
    const contextLost = () => destroy();
    gl.canvas?.addEventListener?.('webglcontextlost', contextLost);
    function clearResources() {
      for (const name of resources.programs.splice(0)) gl.deleteProgram(name);
      for (const name of resources.buffers.splice(0)) gl.deleteBuffer(name);
      for (const name of resources.textures.splice(0)) gl.deleteTexture(name);
      textures = [];
    }
    function destroy() {
      if (!alive) return; alive = false; status = 'destroyed'; abort.abort(); clearTimeout(timeout);
      gl.canvas?.removeEventListener?.('webglcontextlost', contextLost); clearResources();
    }
    function program(vertex, fragment) {
      const value = gl.createProgram(), shaders = [];
      try {
        for (const [type, source] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, fragment]]) {
          const shader = gl.createShader(type); shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader);
          requireValue(gl.getShaderParameter(shader, gl.COMPILE_STATUS), 'shader compile failed: ' + (gl.getShaderInfoLog(shader) || 'unknown error'));
          gl.attachShader(value, shader);
        }
        ['position', 'normal', 'uv'].forEach((name, index) => gl.bindAttribLocation(value, index, name));
        if (options.prepareModel) gl.bindAttribLocation(value, 3, 'modelPart');
        gl.linkProgram(value);
        requireValue(gl.getProgramParameter(value, gl.LINK_STATUS), 'shader link failed: ' + (gl.getProgramInfoLog(value) || 'unknown error'));
        resources.programs.push(value); return value;
      } catch (error) { gl.deleteProgram(value); throw error; }
      finally { for (const shader of shaders) gl.deleteShader(shader); }
    }
    const locate = (program, names) => Object.fromEntries(names.map(name => [name, gl.getUniformLocation(program, name)]));
    function buffer(target, data) {
      const value = gl.createBuffer(); resources.buffers.push(value); gl.bindBuffer(target, value); gl.bufferData(target, data, gl.STATIC_DRAW); return value;
    }
    function uploadImage(image, sampler) {
      const active = gl.getParameter(gl.ACTIVE_TEXTURE), oldFlip = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL), oldPremultiply = gl.getParameter(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL);
      const oldConversion = gl.getParameter(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL);
      gl.activeTexture(gl.TEXTURE0); const binding = gl.getParameter(gl.TEXTURE_BINDING_2D);
      const value = gl.createTexture(); resources.textures.push(value);
      try {
        requireValue(image.width > 0 && image.height > 0 && image.width <= gl.getParameter(gl.MAX_TEXTURE_SIZE) && image.height <= gl.getParameter(gl.MAX_TEXTURE_SIZE), 'unsupported texture dimensions');
        gl.bindTexture(gl.TEXTURE_2D, value); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        const pot = n => (n & (n - 1)) === 0, mipmaps = pot(image.width) && pot(image.height);
        const wrap = n => [gl.REPEAT, gl.CLAMP_TO_EDGE, gl.MIRRORED_REPEAT].includes(n) ? n : gl.REPEAT;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, mipmaps ? wrap(sampler.wrapS) : gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, mipmaps ? wrap(sampler.wrapT) : gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, sampler.magFilter === gl.NEAREST ? gl.NEAREST : gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
        if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
        const extension = gl.getExtension('EXT_texture_filter_anisotropic');
        if (extension) gl.texParameterf(gl.TEXTURE_2D, extension.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(4, gl.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
        return value;
      } finally {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, oldFlip); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, oldPremultiply); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, oldConversion);
        gl.bindTexture(gl.TEXTURE_2D, binding); gl.activeTexture(active);
      }
    }
    async function load() {
      try {
        requireValue(finite(height) && height > 0 && origin.length === 3 && origin.every(finite), 'invalid placement');
        const url = new URL(options.url, location.href);
        requireValue(url.origin === location.origin, 'asset must be same-origin');
        requireValue(typeof options.environmentFragment === 'string' && options.environmentFragment.includes('vec3 sky('), 'missing world lighting shader');
        const response = await fetch(url.href, { credentials: 'same-origin', cache: 'force-cache', signal: abort.signal });
        requireValue(response.ok, 'asset download failed (' + response.status + ')');
        const reportedLength = Number(response.headers.get('content-length') || 0);
        requireValue(!reportedLength || reportedLength <= MAX_ASSET_BYTES, 'asset is too large');
        let model = parseGLB(await response.arrayBuffer()); if (!alive) return;
        if (options.prepareModel) model = options.prepareModel(model);
        requireValue(!!gl.getExtension('OES_standard_derivatives'), 'normal mapping is unsupported on this device');
        const images = [];
        try {
          for (const image of model.images) { const decoded = await decodeImage(image); images.push(decoded); if (!alive) return; }
          meshProgram = program(options.vertexShader || vertexShader, options.fragmentShader ? options.fragmentShader(options.environmentFragment) : fragmentShader(options.environmentFragment)); lampProgram = program(glowVertex, glowFragment);
          const expanded = model.indices instanceof Uint32Array && !gl.getExtension('OES_element_index_uint');
          vertexBuffer = buffer(gl.ARRAY_BUFFER, interleave(model, expanded));
          if (model.parts) partBuffer = buffer(gl.ARRAY_BUFFER, expanded ? Float32Array.from(model.indices, index => model.parts[index]) : model.parts);
          if (!expanded) { indexBuffer = buffer(gl.ELEMENT_ARRAY_BUFFER, model.indices); indexType = model.indices instanceof Uint16Array ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT; }
          drawCount = model.indices.length;
          glowBuffer = buffer(gl.ARRAY_BUFFER, new Float32Array(fixtures.flatMap(item => [...item.position, ...item.color, item.size, item.channel])));
          textures = images.map((image, index) => uploadImage(image, model.images[index].sampler));
          const names = ['eye', 'right', 'up', 'forward', 'aspect', 'lens', 'night', 'rocketOrigin', 'rocketRise', 'rocketLights', 'modelCenter', 'modelScale', 'baseFactor', 'metallicFactor', 'roughnessFactor', 'normalScale', 'baseMap', 'metalRoughMap', 'normalMap', 'panoramaMap', 'nightMap', 'panoramaReady', 'nightReady'];
          uniforms = locate(meshProgram, names.concat(options.uniformNames || [])); lampUniforms = locate(lampProgram, ['eye', 'right', 'up', 'forward', 'aspect', 'lens', 'rocketOrigin', 'rocketRise', 'rocketLights', 'viewportHeight', 'fixtureScale']);
          material = model.material;
          modelInfo = { triangles: model.triangles, vertices: model.vertexCount, bounds: model.bounds, center: model.center, scale: height / (model.bounds.max[1] - model.bounds.min[1]), textureSizes: images.map(image => [image.width, image.height]) };
          if (!alive) return; status = 'ready'; clearTimeout(timeout); options.onReady?.(modelInfo);
        } finally { for (const image of images) image.close?.(); }
      } catch (error) {
        if (!alive) return; status = 'error'; clearTimeout(timeout); clearResources(); options.onError?.(error);
      }
    }
    // Defer callbacks until the caller has assigned the returned renderer handle.
    Promise.resolve().then(load);
    function frameUniforms(values, frame) {
      for (const name of ['eye', 'right', 'up', 'forward']) gl.uniform3fv(values[name], frame[name]);
      gl.uniform1f(values.aspect, frame.aspect); gl.uniform1f(values.lens, frame.lens); gl.uniform3fv(values.rocketOrigin, origin);
      gl.uniform1f(values.rocketRise, Math.max(0, frame.rocketRise || 0)); gl.uniform4fv(values.rocketLights, frame.lights?.values || frame.lights || [0, 0, 0, 0]);
    }
    function draw(frame) {
      if (!alive || status !== 'ready' || frame.cabinMode) return false;
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
      if (material.doubleSided) gl.disable(gl.CULL_FACE); else { gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); }
      gl.useProgram(meshProgram); frameUniforms(uniforms, frame);
      options.setFrameUniforms?.(gl, uniforms, frame, modelInfo);
      gl.uniform3fv(uniforms.modelCenter, modelInfo.center); gl.uniform1f(uniforms.modelScale, modelInfo.scale);
      gl.uniform4fv(uniforms.baseFactor, material.color); gl.uniform1f(uniforms.metallicFactor, material.metallic); gl.uniform1f(uniforms.roughnessFactor, material.roughness); gl.uniform1f(uniforms.normalScale, material.normalScale);
      gl.uniform1f(uniforms.night, Number(!!frame.night)); gl.uniform1f(uniforms.panoramaReady, Number(!!frame.panoramaReady)); gl.uniform1f(uniforms.nightReady, Number(!!frame.nightReady));
      for (const [index, name, texture] of [[0, 'baseMap', textures[0]], [1, 'metalRoughMap', textures[1]], [2, 'normalMap', textures[2]], [3, 'panoramaMap', frame.panoramaTexture], [4, 'nightMap', frame.nightTexture]]) {
        gl.activeTexture(gl.TEXTURE0 + index); gl.bindTexture(gl.TEXTURE_2D, texture || textures[0]); gl.uniform1i(uniforms[name], index);
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      for (const [location, size, offset] of [[0, 3, 0], [1, 3, 12], [2, 2, 24]]) { gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, gl.FLOAT, false, 32, offset); }
      if (partBuffer) { gl.bindBuffer(gl.ARRAY_BUFFER, partBuffer); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 4, 0); }
      if (indexBuffer) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer); gl.drawElements(gl.TRIANGLES, drawCount, indexType, 0); }
      else gl.drawArrays(gl.TRIANGLES, 0, drawCount);
      if (partBuffer) gl.disableVertexAttribArray(3);
      gl.disable(gl.CULL_FACE);
      const powers = frame.lights?.values || frame.lights || [];
      if (options.lamps !== false && powers.some(value => value > 0)) {
        gl.useProgram(lampProgram); frameUniforms(lampUniforms, frame); gl.uniform1f(lampUniforms.viewportHeight, frame.viewportHeight || gl.canvas.height); gl.uniform1f(lampUniforms.fixtureScale, height / MODEL_HEIGHT);
        gl.bindBuffer(gl.ARRAY_BUFFER, glowBuffer);
        for (const [location, size, offset] of [[0, 3, 0], [1, 3, 12], [2, 2, 24]]) { gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, size, gl.FLOAT, false, 32, offset); }
        gl.depthMask(false); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.drawArrays(gl.POINTS, 0, fixtures.length); gl.depthMask(true); gl.disable(gl.BLEND);
      }
      gl.activeTexture(gl.TEXTURE0); return true;
    }
    return { get ready() { return status === 'ready'; }, get status() { return status; }, get metadata() { return modelInfo; }, draw, destroy };
  }

  const api = { create, parseGLB, interleave, lightingState, lightingGLSL, fixtures, MODEL_HEIGHT, shaders: { vertex: vertexShader, fragment: fragmentShader, glowVertex, glowFragment } };
  if (typeof window !== 'undefined') window.ParallaxRocketModel = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
