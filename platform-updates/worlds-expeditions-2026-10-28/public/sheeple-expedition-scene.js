/* Sheeple's lunar habitat. Articulated geometry with shared local surface materials. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const Materials=typeof window!=='undefined'?window.ParallaxExpeditionMaterials:null;
  const MAT=Materials?.ID||{plain:0,fur:1,wool:2,stone:3,regolith:4,metal:5,glass:6,leather:7,solar:8};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const length = v => Math.hypot(v[0], v[1], v[2]);
  const unit = v => { const d = length(v) || 1; return v.map(x => x / d); };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const hash = (x, z = 0) => { const n = Math.sin(x * 127.1 + z * 311.7) * 43758.5453; return n - Math.floor(n); };
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const LIGHT = unit([-.48, .82, .36]);
  const FOG = [.047, .104, .139];
  const WOOL = [.93, .89, .77], FACE = [.075, .105, .12], ROCK = [.28, .36, .40];
  const CYAN = [.30, .91, .90], GOLD = [.98, .65, .19];
  const TERRAIN_STEP = 3;
  const LOCATIONS = {
    flock: { target: [-2.1, 1.2, 3.0], yaw: -.21, pitch: .14, distance: 10.6, reach: 15.8, radius: 3.5 },
    signal: { target: [5.7, 1.9, -3.3], yaw: .49, pitch: .17, distance: 10.4, reach: 14.7, radius: 2.0 },
    bell: { target: [-8.3, 1.5, -8.9], yaw: -.34, pitch: .13, distance: 8.8, reach: 12.8, radius: 1.1 }
  };
  const FLOCK = [
    { x: -2.7, z: 4.3, yaw: -.15, scale: 1.16, phase: .1 },
    { x: .5, z: 4.7, yaw: -.60, scale: .77, phase: 2.0 },
    { x: -5.3, z: 2.1, yaw: .66, scale: .95, phase: 3.7 },
    { x: -.7, z: .7, yaw: 1.05, scale: .97, phase: 5.1 },
    { x: -6.4, z: 5.0, yaw: .34, scale: .74, phase: 1.5 },
    { x: 2.4, z: 1.1, yaw: -.85, scale: .84, phase: 4.3 }
  ];

  function noise(x, z) {
    const a = Math.floor(x), b = Math.floor(z), u = smooth(x - a), v = smooth(z - b);
    return mix(mix(hash(a, b), hash(a + 1, b), u), mix(hash(a, b + 1), hash(a + 1, b + 1), u), v);
  }
  function ground(x, z) {
    return (noise(x * .17 + 9, z * .17 + 2) - .5) * .43 + .08 * Math.sin(x * .4 + z * .19) +
      .55 * Math.exp(-((x + 10) ** 2 / 34 + (z + 8) ** 2 / 46)) +
      1.7 * Math.exp(-(x * x / 700 + (z + 30) ** 2 / 100));
  }
  function groundNormal(x, z) { return unit([ground(x - .15, z) - ground(x + .15, z), .30, ground(x, z - .15) - ground(x, z + .15)]); }
  function terrainHeight(x, z) {
    const x0 = Math.floor(x / TERRAIN_STEP) * TERRAIN_STEP, z0 = Math.floor(z / TERRAIN_STEP) * TERRAIN_STEP;
    const u = (x - x0) / TERRAIN_STEP, v = (z - z0) / TERRAIN_STEP;
    const h00 = ground(x0, z0), h10 = ground(x0 + TERRAIN_STEP, z0), h01 = ground(x0, z0 + TERRAIN_STEP);
    if (u + v <= 1) return h00 + (h10 - h00) * u + (h01 - h00) * v;
    const h11 = ground(x0 + TERRAIN_STEP, z0 + TERRAIN_STEP);
    return h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v);
  }
  function matrix(position = [0, 0, 0], yaw = 0, pitch = 0, roll = 0, scale = 1) {
    const c = Math.cos(yaw), s = Math.sin(yaw), a = Math.cos(pitch), b = Math.sin(pitch), d = Math.cos(roll), e = Math.sin(roll);
    return [(c * d + s * b * e) * scale, a * e * scale, (-s * d + c * b * e) * scale, 0,
      (-c * e + s * b * d) * scale, a * d * scale, (s * e + c * b * d) * scale, 0,
      s * a * scale, -b * scale, c * a * scale, 0, ...position, 1];
  }
  function multiply(a, b) {
    const out = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) out[c * 4 + r] = a[r] * b[c * 4] + a[r + 4] * b[c * 4 + 1] + a[r + 8] * b[c * 4 + 2] + a[r + 12] * b[c * 4 + 3];
    return out;
  }
  const point = (p, m) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
  const normal = (p, m) => unit([m[0] * p[0] + m[4] * p[1] + m[8] * p[2], m[1] * p[0] + m[5] * p[1] + m[9] * p[2], m[2] * p[0] + m[6] * p[1] + m[10] * p[2]]);

  function segmentMatrix(top, bottom) {
    const extent = length(sub(top, bottom)), up = unit(sub(top, bottom));
    const right = unit(cross(up, Math.abs(up[2]) < .95 ? [0, 0, 1] : [1, 0, 0]));
    const forward = cross(right, up);
    // Uniform scale keeps normals and both rendering paths consistent. The unit leg
    // runs down local Y, exactly from its body attachment to the grounded ankle.
    return [...right.map(v => v * extent), 0, ...up.map(v => v * extent), 0,
      ...forward.map(v => v * extent), 0, ...top, 1];
  }
  function sheepPose(p, t) {
    const sway = Math.sin(t * .43 + p.phase) * .018 * p.scale;
    const bob = Math.sin(t * .85 + p.phase) * .010 * p.scale;
    const root = matrix([p.x + Math.cos(p.yaw) * sway, ground(p.x, p.z) + bob, p.z - Math.sin(p.yaw) * sway],
      p.yaw + Math.sin(t * .23 + p.phase) * .012, 0, 0, p.scale);
    const stance = matrix([p.x, 0, p.z], p.yaw, 0, 0, p.scale);
    const legs = [];
    for (let j = 0; j < 4; j++) {
      const x = j % 2 === 0 ? -.36 : .36, z = j < 2 ? .50 : -.50;
      const hip = point([x, 1.04, z], root), foot = point([x, 0, z], stance);
      foot[1] = terrainHeight(foot[0], foot[2]);
      const ankle = [foot[0], foot[1] + .14 * p.scale, foot[2]];
      legs.push({hip, ankle, foot, legMatrix:segmentMatrix(hip, ankle), hoofMatrix:matrix(foot, p.yaw, 0, 0, p.scale)});
    }
    return {root, legs};
  }

  function playerPose(p) {
    const scale = .75, stride = Math.min(1, p.speed / 3.8);
    const bounce = p.grounded ? Math.abs(Math.sin(p.gait * 2)) * .035 * stride : 0;
    const root = matrix([p.x, p.y + bounce, p.z], p.yaw, 0, 0, scale);
    const stance = matrix([p.x, 0, p.z], p.yaw, 0, 0, scale), legs = [];
    for (let j = 0; j < 4; j++) {
      const phase = p.gait + (j === 0 || j === 3 ? 0 : Math.PI);
      const x = j % 2 === 0 ? -.36 : .36, z = j < 2 ? .50 : -.50;
      const hip = point([x, 1.04, z], root);
      const foot = point([x, 0, z + Math.sin(phase) * .28 * stride], stance);
      foot[1] = p.grounded ? terrainHeight(foot[0], foot[2]) + Math.max(0, Math.cos(phase)) * .19 * stride : p.y + .12 + .09 * Math.sin(phase);
      const ankle = [foot[0], foot[1] + .14 * scale, foot[2]];
      legs.push({hip, ankle, foot, legMatrix:segmentMatrix(hip, ankle), hoofMatrix:matrix(foot, p.yaw, 0, 0, scale)});
    }
    return {root, legs};
  }

  // Each mesh contains positions, smooth normals, colour, alpha, emission and material. Both renderers
  // consume these exact triangles; Canvas is a perspective raster fallback, not a sprite scene.
  function builder(detail=1) {
    const vertices = [], triangles = [];
    let material=MAT.plain;
    function tri(a, b, c, color, normals, emission = 0, twoSided = false) {
      const face = unit(cross(sub(b, a), sub(c, a)));
      if (length(cross(sub(b, a), sub(c, a))) < .000001) return;
      normals = normals || [face, face, face];
      const colors = Array.isArray(color[0]) ? color : [color, color, color];
      for (let i = 0; i < 3; i++) vertices.push(...[a, b, c][i], ...normals[i], colors[i][0], colors[i][1], colors[i][2], colors[i][3] ?? 1, emission,material);
      triangles.push({ a, b, c, center:[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3,(a[2]+b[2]+c[2])/3],n: unit(normals.reduce((n, v) => n.map((x, i) => x + v[i]), [0, 0, 0])),
        color: [0, 1, 2, 3].map(i => colors.reduce((n, v) => n + (v[i] ?? 1), 0) / 3), emission, twoSided,material });
    }
    function quad(a, b, c, d, color, n, emission = 0, twoSided = false) { tri(a, b, c, color, n ? [n, n, n] : null, emission, twoSided); tri(a, c, d, color, n ? [n, n, n] : null, emission, twoSided); }
    function finish() { return { vertices: new Float32Array(vertices), triangles }; }
    return { tri, quad, finish, detail,get material(){return material;},set material(value){material=value;} };
  }
  function sphere(b, center, radii, color, sides = 10, rows = 7, emission = 0, rocky = 0) {
    if(b.detail<1){sides=Math.max(6,Math.round(sides*b.detail));rows=Math.max(4,Math.round(rows*b.detail));}
    const sample = (i, j) => {
      const lat = -Math.PI / 2 + i / rows * Math.PI, lng = (j % sides) / sides * TAU;
      const n = [Math.cos(lat) * Math.cos(lng), Math.sin(lat), Math.cos(lat) * Math.sin(lng)];
      const r = 1 + rocky * (hash(i + 4, (j % sides) + center[0] * 3) - .5);
      return { p: n.map((v, k) => center[k] + v * radii[k] * r), n: unit(n.map((v, k) => v / radii[k])) };
    };
    for (let i = 0; i < rows; i++) for (let j = 0; j < sides; j++) {
      const a = sample(i, j), c = sample(i, j + 1), d = sample(i + 1, j + 1), e = sample(i + 1, j);
      const col = typeof color === 'function' ? color(i / rows, j / sides) : color;
      b.tri(a.p, e.p, c.p, col, rocky ? null : [a.n, e.n, c.n], emission);
      b.tri(c.p, e.p, d.p, col, rocky ? null : [c.n, e.n, d.n], emission);
    }
  }
  function cylinder(b, start, end, r0, r1, color, sides = 10, emission = 0) {
    const axis = unit(sub(end, start)), u = unit(cross(axis, Math.abs(axis[1]) < .9 ? [0, 1, 0] : [0, 0, 1])), v = cross(axis, u);
    const sample = (center, r, j) => { const a = j / sides * TAU, n = u.map((x, k) => x * Math.cos(a) + v[k] * Math.sin(a)); return { p: center.map((x, k) => x + n[k] * r), n }; };
    for (let j = 0; j < sides; j++) {
      const a = sample(start, r0, j), c = sample(start, r0, j + 1), d = sample(end, r1, j + 1), e = sample(end, r1, j);
      b.tri(a.p, c.p, e.p, color, [a.n, c.n, e.n], emission); b.tri(c.p, d.p, e.p, color, [c.n, d.n, e.n], emission);
      b.tri(start, c.p, a.p, color, [axis.map(x => -x), axis.map(x => -x), axis.map(x => -x)], emission);
      b.tri(end, e.p, d.p, color, [axis, axis, axis], emission);
    }
  }
  function box(b, center, size, color, yaw = 0, emission = 0, pitch = 0) {
    const m = matrix(center, yaw, pitch), p = (x, y, z) => point([x * size[0] / 2, y * size[1] / 2, z * size[2] / 2], m);
    for (const [a, c, d, e, n] of [
      [[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1],[0,0,1]], [[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1],[0,0,-1]],
      [[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1],[1,0,0]], [[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1],[-1,0,0]],
      [[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1],[0,1,0]], [[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1],[0,-1,0]]
    ]) b.quad(p(...a), p(...c), p(...d), p(...e), color, normal(n, m), emission);
  }
  function beveledBox(b,center,size,radius,color){
    const half=size.map(v=>v*.5),inner=half.map(v=>v-radius);
    for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
      const u=(axis+1)%3,v=(axis+2)%3,us=[-half[u],-inner[u],inner[u],half[u]],vs=[-half[v],-inner[v],inner[v],half[v]];
      const sample=(i,j)=>{
        const p=[0,0,0];p[axis]=half[axis]*sign;p[u]=us[i];p[v]=vs[j];
        const core=p.map((value,k)=>clamp(value,-inner[k],inner[k])),n=unit(sub(p,core));
        return {p:core.map((value,k)=>center[k]+value+n[k]*radius),n};
      };
      for(let i=0;i<3;i++)for(let j=0;j<3;j++){
        const a=sample(i,j),c=sample(i+1,j),d=sample(i+1,j+1),e=sample(i,j+1);
        if(sign>0){b.tri(a.p,c.p,d.p,color,[a.n,c.n,d.n]);b.tri(a.p,d.p,e.p,color,[a.n,d.n,e.n]);}
        else{b.tri(a.p,d.p,c.p,color,[a.n,d.n,c.n]);b.tri(a.p,e.p,d.p,color,[a.n,e.n,d.n]);}
      }
    }
  }
  function ring(b, center, axis, inner, outer, color, segments = 40, emission = 0) {
    axis = unit(axis); const u = unit(cross(axis, Math.abs(axis[1]) < .9 ? [0, 1, 0] : [0, 0, 1])), v = cross(axis, u);
    const p = (r, j) => center.map((x, k) => x + r * (u[k] * Math.cos(j / segments * TAU) + v[k] * Math.sin(j / segments * TAU)));
    for (let j = 0; j < segments; j++) b.quad(p(inner, j), p(outer, j), p(outer, j + 1), p(inner, j + 1), color, axis, emission, true);
  }
  function torus(b, center, axis, radius, tube, color, segments = 24, sides = 6, emission = 0) {
    axis = unit(axis); const u = unit(cross(axis, Math.abs(axis[1]) < .9 ? [0, 1, 0] : [0, 0, 1])), v = cross(axis, u);
    const p = (i, j) => { const a = i / segments * TAU, t = j / sides * TAU, radial = u.map((x, k) => x * Math.cos(a) + v[k] * Math.sin(a)), n = radial.map((x, k) => x * Math.cos(t) + axis[k] * Math.sin(t)); return { p: center.map((x, k) => x + radial[k] * radius + n[k] * tube), n }; };
    for (let i = 0; i < segments; i++) for (let j = 0; j < sides; j++) { const a = p(i,j), c = p(i+1,j), d = p(i+1,j+1), e = p(i,j+1); b.tri(a.p,c.p,e.p,color,[a.n,c.n,e.n],emission); b.tri(c.p,d.p,e.p,color,[c.n,d.n,e.n],emission); }
  }
  function shadow(b, x, z, rx, rz, opacity) {
    const p = (r, a) => { const px = x + Math.cos(a) * rx * r, pz = z + Math.sin(a) * rz * r; return [px, ground(px, pz) + .026, pz]; };
    for (let j = 0; j < 24; j++) {
      const a = j / 24 * TAU, c = (j+1) / 24 * TAU;
      b.tri(p(0,0),p(1,a),p(1,c),[[.012,.026,.037,opacity],[.012,.026,.037,0],[.012,.026,.037,0]],[[0,1,0],[0,1,0],[0,1,0]],1,true);
    }
  }
  function terrainMesh() {
    const b = builder(), step = TERRAIN_STEP;
    b.material=MAT.regolith;
    function vertex(x,z) {
      const v = noise(x*.35,z*.35), path = Math.min(Math.abs(z-2+x*.10),Math.abs(z+x*.55-.7));
      const pale = Math.max(0,1-path/1.25)*.055;
      return { p:[x,ground(x,z),z], n:groundNormal(x,z), c:[.25+v*.085+pale,.335+v*.075+pale,.368+v*.075+pale] };
    }
    for(let z=-66;z<42;z+=step)for(let x=-60;x<60;x+=step){const a=vertex(x,z),c=vertex(x+step,z),d=vertex(x+step,z+step),e=vertex(x,z+step);b.tri(a.p,e.p,c.p,[a.c,e.c,c.c],[a.n,e.n,c.n]);b.tri(c.p,e.p,d.p,[c.c,e.c,d.c],[c.n,e.n,d.n]);}
    return b.finish();
  }
  function clipGround(mesh) {
    const b=builder();
    for(const [index,tri] of mesh.triangles.entries()){
      const input=[tri.a,tri.b,tri.c].map((p,i)=>({p,n:Array.from(mesh.vertices.slice(index*36+i*12+3,index*36+i*12+6))})),output=[];
      for(let i=0;i<input.length;i++){
        const a=input[i],c=input[(i+1)%input.length],ha=a.p[1]-terrainHeight(a.p[0],a.p[2]),hc=c.p[1]-terrainHeight(c.p[0],c.p[2]);
        if(ha>=0)output.push(a);
        if((ha>=0)!==(hc>=0)){
          const f=ha/(ha-hc),p=a.p.map((v,k)=>mix(v,c.p[k],f));p[1]=terrainHeight(p[0],p[2])+.002;output.push({p,n:unit(a.n.map((v,k)=>mix(v,c.n[k],f)))});
        }
      }
      b.material=tri.material||0;
      for(let i=1;i+1<output.length;i++)b.tri(output[0].p,output[i].p,output[i+1].p,tri.color,[output[0].n,output[i].n,output[i+1].n],tri.emission,tri.twoSided);
    }
    return b.finish();
  }
  function sheepMesh(cameraHead=false,detail=1) {
    const b = builder(detail);
    b.material=MAT.wool;
    sphere(b,[0,1.13,0],[.59,.53,.83],WOOL,16,10);
    // Fine curls come from the material. Shallow overlapping lobes only soften
    // the silhouette, leaving the continuous torso and all four hip anchors intact.
    const curls=[[-.36,1.27,.44],[.36,1.27,.44],[-.43,1.15,0],[.43,1.15,0],[-.34,1.24,-.50],[.34,1.24,-.50],[0,1.48,.41],[0,1.51,-.10],[0,1.42,-.56],[-.26,1.45,.09],[.26,1.45,.09],[0,1.08,-.65]];
    curls.forEach((p,i)=>sphere(b,p,[.235+(i%3)*.012,.205,.245],WOOL,9,6));
    if(cameraHead){
      // The lead is Sheeple's camera-headed mascot, matching its existing icon: a dark camera,
      // circular lens, red collar and solar-panel roof. Its companions remain natural sheep.
      const black=[.035,.044,.050],metal=[.19,.22,.24],red=[.64,.035,.045];
      cylinder(b,[0,1.12,1.0],[0,1.32,1.0],.25,.23,WOOL,10);
      b.material=MAT.leather;
      cylinder(b,[0,1.20,1.0],[0,1.29,1.0],.265,.255,red,16);
      b.material=MAT.metal;
      box(b,[.18,1.23,1.253],[.09,.10,.035],[.55,.60,.59]);
      beveledBox(b,[0,1.57,1.0],[.73,.61,.61],.045,black);
      box(b,[0,1.57,1.314],[.68,.56,.035],[.075,.095,.10]);
      cylinder(b,[0,1.57,1.32],[0,1.57,1.47],.22,.205,metal,20);
      b.material=MAT.glass;
      sphere(b,[0,1.57,1.48],[.172,.172,.042],[.018,.041,.052],16,10);
      b.material=MAT.metal;
      torus(b,[0,1.57,1.493],[0,0,1],.177,.018,[.20,.25,.28],24,5);
      b.material=MAT.plain;
      sphere(b,[.258,1.755,1.338],[.021,.021,.009],red,7,5,.6);
      b.material=MAT.metal;
      for(const y of [1.48,1.68])cylinder(b,[.366,y,1.0],[.39,y,1.0],.045,.045,metal,8);
      const panel=matrix([0,1.97,1.0],0,.16);
      box(b,[0,1.97,1.0],[1.04,.065,.87],[.20,.22,.23],0,0,.16);
      b.material=MAT.solar;
      for(let x=0;x<5;x++)for(let z=0;z<4;z++)box(b,point([-.40+x*.20,.042,-.31+z*.205],panel),[.181,.012,.184],[.065+.008*(z%2),.105,.16],0,0,.16);
      return b.finish();
    }
    // A dark elongated face, two broad ears and a small muzzle sit in front of the fleece.
    b.material=MAT.fur;
    sphere(b,[0,1.27,.91],[.31,.39,.32],FACE,12,8);
    sphere(b,[0,1.06,1.11],[.235,.16,.21],[.095,.12,.13],10,6);
    sphere(b,[-.40,1.39,.82],[.27,.095,.145],FACE,10,6);
    sphere(b,[.40,1.39,.82],[.27,.095,.145],FACE,10,6);
    sphere(b,[-.40,1.408,.876],[.16,.035,.075],[.22,.24,.23],8,5);
    sphere(b,[.40,1.408,.876],[.16,.035,.075],[.22,.24,.23],8,5);
    for(const x of [-.205,.205]){
      b.material=MAT.glass;
      sphere(b,[x,1.35,1.16],[.047,.052,.033],[.16,.12,.065],8,6);
      sphere(b,[x,1.35,1.187],[.028,.035,.016],[.014,.017,.020],8,5);
    }
    b.material=MAT.leather;
    sphere(b,[-.08,1.043,1.295],[.028,.018,.012],[.025,.034,.034],6,4);
    sphere(b,[.08,1.043,1.295],[.028,.018,.012],[.025,.034,.034],6,4);
    b.material=MAT.wool;
    sphere(b,[-.19,1.59,.83],[.23,.20,.23],WOOL,10,6);
    sphere(b,[.14,1.64,.78],[.25,.21,.24],WOOL,10,6);
    sphere(b,[0,1.59,.98],[.21,.16,.18],WOOL,10,6);
    return b.finish();
  }
  function legMesh(wool=false) {
    const b=builder();b.material=wool?MAT.wool:MAT.fur;
    cylinder(b,[0,0,0],[0,-.52,0],.165,.13,wool?WOOL:FACE,10);
    cylinder(b,[0,-.52,0],[0,-1,0],.13,.10,wool?WOOL:FACE,10);
    return b.finish();
  }
  function hoofMesh() {
    const b=builder();b.material=MAT.leather;sphere(b,[0,.105,0],[.13,.105,.18],[.055,.065,.068],10,6);
    return b.finish();
  }
  function scenery() {
    const b=builder(), s=builder(), sky=builder(), bell=builder(), pulse=builder(), lights=[];
    b.material=MAT.regolith;bell.material=MAT.metal;
    // Low distant ridges preserve a broad night sky instead of enclosing the habitat in walls.
    for(const [x,z,rx,ry,rz]of [[-25,-29,11,4.9,8],[-12,-35,9,6.2,8],[4,-43,15,7,10],[23,-34,12,5.2,9],[-36,-14,8,3.3,10],[39,-20,9,4,9]])sphere(b,[x,ground(x,z)-1,z],[rx,ry,rz],[.21,.29,.34],11,5,0,.42);
    const rocks=[[-11,5,1.25,.68,.95],[8.4,4.8,1.6,.65,1.25],[4.5,8.8,.85,.43,.8],[-9.2,8.8,.74,.43,.54],[-4.4,-2.2,.55,.32,.65],[8,-7,1.35,.72,1.0],[-13,-3,1.8,1.1,1.7],[11.5,-1,1.7,.7,1.2],[-1,9,.28,.19,.23],[3,6.5,.36,.21,.29],[-7,-2,.45,.26,.37],[-3,7.5,.23,.14,.22]];
    rocks.forEach(([x,z,rx,ry,rz],i)=>{sphere(b,[x,ground(x,z)+ry*.46,z],[rx,ry,rz],ROCK.map(v=>v+(i%3)*.025),8,5,0,.26);shadow(s,x+.18,z+.13,rx*1.5,rz*1.5,.33);});
    // The rock arch is actual open geometry. The bell stands beyond it, out of the arrival view.
    for(let i=0;i<=8;i++){const a=i/8*Math.PI,x=-8.3+Math.cos(a)*2.15,y=ground(-8.3,-6.6)+.65+Math.sin(a)*2.65;sphere(b,[x,y,-6.6+Math.sin(i*1.7)*.10],[.66,.88,.77],[.30+i*.003,.36+i*.003,.405+i*.003],8,6,0,.23);}
    shadow(s,-8.3,-6.5,3.3,1.5,.36);
    b.material=MAT.plain;
    for(let patch=0;patch<26;patch++){
      const x=-9+hash(patch,8)*17,z=-3+hash(patch,7)*12;
      sphere(b,[x,ground(x,z)-.025,z],[.45+hash(patch)*.3,.10,.38],[.12,.28,.255],8,4);
      for(let j=0;j<9;j++){const px=x+(hash(patch,j)-.5)*.7,pz=z+(hash(j,patch+5)-.5)*.65,y=ground(px,pz),h=.22+hash(j+2,patch)*.28,lean=(hash(j,patch+9)-.5)*.17;
        const c=[.23+hash(j)*.11,.47+hash(j,2)*.10,.37+hash(j,3)*.10];b.tri([px-.028,y,pz],[px+lean,y+h,pz-.07],[px+.028,y,pz],c,[[0,.5,1],[0,.5,1],[0,.5,1]],0,true);
      }
    }
    // Small orbital signal hut, with an open forecourt, door, observation windows and a dish.
    b.material=MAT.metal;
    const x=5.7,z=-3.3,y=ground(x,z),hull=[.60,.68,.69],steel=[.115,.20,.23];
    cylinder(b,[x,y-.02,z],[x,y+.23,z],2.1,2.1,[.20,.29,.33],12);
    cylinder(b,[x,y+.23,z],[x,y+.44,z],1.65,1.52,steel,12);
    cylinder(b,[x,y+.42,z],[x,y+2.05,z],1.18,1.18,hull,16);
    sphere(b,[x,y+2.05,z],[1.22,.53,1.22],[.73,.78,.76],16,8);
    torus(b,[x,y+.58,z],[0,1,0],1.20,.045,steel,28,5);
    torus(b,[x,y+1.93,z],[0,1,0],1.19,.045,CYAN,28,5,.75);
    box(b,[x,y+1.09,z+1.18],[.64,1.29,.07],[.038,.086,.105]);
    for(const side of [-1,1])box(b,[x+side*.38,y+1.11,z+1.22],[.037,1.34,.05],CYAN,0,.85);
    box(b,[x,y+1.78,z+1.21],[.82,.065,.06],CYAN,0,.8);
    for(const side of [-1,1]){box(b,[x+side*.91,y+1.42,z+.77],[.44,.46,.10],[.035,.12,.17],side*.64);box(b,[x+side*.91,y+1.43,z+.83],[.30,.23,.026],[.18,.51,.57],side*.64,.3);}
    for(let i=0;i<3;i++)box(b,[x,y+.055+i*.07,z+2.02-i*.23],[1.03,.10,.45],[.40,.48,.49]);
    cylinder(b,[x+.35,y+2.3,z-.13],[x+.35,y+3.94,z-.13],.065,.042,steel,8);
    sphere(b,[x+.35,y+3.78,z-.13],[.62,.16,.58],[.23,.36,.4],12,6);
    torus(b,[x+.35,y+3.85,z-.13],[0,1,0],.57,.032,CYAN,28,5,.8);
    cylinder(b,[x+.35,y+3.83,z-.13],[x+.35,y+4.32,z-.13],.018,.012,[.79,.83,.78],6);
    sphere(b,[x+.35,y+4.32,z-.13],[.055,.055,.055],CYAN,6,4,1);lights.push({p:[x+.35,y+4.32,z-.13],color:[88,239,228],radius:.24,kind:'signal'});
    // A panel array is geometry too, including the thin individual cell dividers.
    for(const side of [-1,1]){
      const px=x+side*2.35,pz=z-.58;cylinder(b,[px,ground(px,pz),pz],[px,y+1.13,pz],.055,.055,steel,6);
      b.material=MAT.solar;box(b,[px,y+1.16,pz],[1.3,.08,1.7],[.055,.105,.16],.12);b.material=MAT.metal;
      for(let i=-2;i<=2;i++)box(b,[px+i*.235,y+1.207,pz],[.012,.009,1.6],[.34,.55,.61],.12,.1);
      for(let i=-2;i<=2;i++)box(b,[px,y+1.213,pz+i*.30],[1.21,.009,.012],[.34,.55,.61],.12,.1);
    }
    shadow(s,x,z,2.3,2.0,.47);
    for(const [px,pz]of [[2.1,2.7],[3.1,1.4],[4.25,.15],[5.05,-1.25],[-.4,6.7]]){
      const py=ground(px,pz);cylinder(b,[px,py,pz],[px,py+.22,pz],.10,.085,steel,8);sphere(b,[px,py+.25,pz],[.095,.045,.095],CYAN,8,4,.9);lights.push({p:[px,py+.25,pz],color:[107,231,216],radius:.16});
    }
    // The discoverable bell has a turned metal body, an open lip and a separate clapper.
    const bx=-8.3,bz=-8.9,by=ground(bx,bz);
    cylinder(b,[bx,by,bz],[bx,by+.20,bz],.85,.75,[.25,.29,.31],10);
    for(const sx of [-.65,.65])cylinder(b,[bx+sx,by+.12,bz],[bx+sx,by+2.56,bz],.065,.065,steel,8);
    cylinder(b,[bx-.70,by+2.58,bz],[bx+.70,by+2.58,bz],.065,.065,steel,8);
    cylinder(b,[bx,by+2.58,bz],[bx,by+1.97,bz],.023,.023,[.65,.50,.27],6);
    const profile=[[.10,1.82],[.19,1.72],[.25,1.55],[.29,1.33],[.43,1.11],[.49,1.08],[.49,1.00],[.39,1.00]];
    for(let row=0;row<profile.length-1;row++)for(let j=0;j<24;j++){
      const a=j/24*TAU,c=(j+1)/24*TAU,[r0,h0]=profile[row],[r1,h1]=profile[row+1];
      const p=(r,h,t)=>[Math.cos(t)*r,h,Math.sin(t)*r],n=t=>unit([Math.cos(t),.35,Math.sin(t)]);
      const col=GOLD.map(v=>v*(row===5?.83:1));bell.tri(p(r0,h0,a),p(r1,h1,a),p(r0,h0,c),col,[n(a),n(a),n(c)],.06);bell.tri(p(r0,h0,c),p(r1,h1,a),p(r1,h1,c),col,[n(c),n(a),n(c)],.06);
    }
    torus(bell,[0,1.91,0],[0,0,1],.105,.034,GOLD,16,6,.05);
    sphere(bell,[0,1.045,0],[.09,.13,.09],[.75,.39,.08],10,6);
    cylinder(bell,[0,1.48,0],[0,1.06,0],.028,.025,[.64,.39,.12],6);
    lights.push({p:[bx,by+1.35,bz],color:[255,190,78],radius:.65,kind:'bell'});shadow(s,bx,bz,1.0,.8,.40);
    FLOCK.forEach(p=>shadow(s,p.x+.17,p.z-.04,p.scale*.95,p.scale*1.16,.47));
    // Real distant sphere + annular rings share the depth projection of the foreground.
    const pc=[-43,21,-145];
    sphere(sky,pc,[10,10,10],(lat)=>{const stripe=.5+.5*Math.sin(lat*31);return [.31+stripe*.035,.43+stripe*.04,.51+stripe*.055];},28,18);
    for(let i=0;i<7;i++)ring(sky,pc,[.19,.68,.46],13.5+i*.72,14.03+i*.72,[.38+i*.024,.45+i*.020,.53+i*.018],88,.05);
    sky.material=MAT.regolith;sphere(sky,[65,32,-212],[7,7,7],[.39,.43,.47],20,12);
    ring(pulse,[0,0,0],[0,1,0],.97,1,[.35,.93,.88,.25],48,.9);
    return {props:b.finish(),shadows:s.finish(),sky:sky.finish(),bell:bell.finish(),pulse:pulse.finish(),lights,bellBase:[bx,by,bz]};
  }
  function playScenery(config) {
    const b=builder(),hoop=builder(),collected=builder(),halo=builder(),shade=builder(),particle=builder();
    b.material=MAT.metal;hoop.material=collected.material=MAT.metal;
    const board=config.board, y=terrainHeight(board.x,board.z), steel=[.11,.22,.25], mint=[.55,.94,.81];
    // A freestanding field guide, placed on the path from the landing circle.
    for(const side of [-1,1]){
      box(b,[board.x+side*1.42,y+1.48,board.z],[.13,2.96,.18],steel);
      box(b,[board.x+side*1.42,y+.055,board.z],[.48,.11,.62],[.26,.36,.38]);
    }
    box(b,[board.x,y+2.20,board.z],[3.55,2.13,.23],steel);
    box(b,[board.x,y+2.20,board.z+.126],[3.35,1.93,.045],[.035,.09,.11]);
    box(b,[board.x,y+3.18,board.z+.165],[3.35,.06,.055],mint,0,.7);
    for(const dx of [-1.57,1.57])sphere(b,[board.x+dx,y+3.18,board.z+.20],[.055,.055,.04],CYAN,7,4,1);
    cylinder(b,[board.x,y+.02,board.z+1.25],[board.x,y+.07,board.z+1.25],1.12,1.12,[.24,.34,.36],24);
    ring(b,[board.x,y+.08,board.z+1.25],[0,1,0],1.0,1.045,[.50,.87,.80,.8],32,.7);
    const spawn=config.spawn,sy=terrainHeight(spawn.x,spawn.z);
    ring(b,[spawn.x,sy+.035,spawn.z],[0,1,0],1.52,1.59,[.49,.79,.78,.6],40,.55);
    for(let i=0;i<8;i++){const a=i/8*TAU;box(b,[spawn.x+Math.sin(a)*1.72,sy+.045,spawn.z+Math.cos(a)*1.72],[.05,.05,.15],CYAN,a,.65);}
    // Small stepping stones make the signal route legible from sheep height.
    b.material=MAT.regolith;
    config.sparks.forEach((p,i)=>{
      const py=terrainHeight(p.x,p.z);
      cylinder(b,[p.x,py-.04,p.z],[p.x,py+.09,p.z],.72,.68,[.29,.39,.40],12);
      ring(b,[p.x,py+.105,p.z],[0,1,0],.58,.64,CYAN,24,.65);
      for(const dx of [-.89,.89])cylinder(b,[p.x+dx,py,p.z],[p.x+dx,py+.5,p.z],.035,.025,steel,6);
    });
    for(let i=0;i<10;i++){
      const f=i/9,px=mix(-3.4,-8.3,f),pz=mix(.2,-5.1,f),py=terrainHeight(px,pz);
      if(i%2===0)sphere(b,[px,py+.07,pz],[.13,.07,.16],[.62,.55,.35],8,4,.4);
    }
    torus(hoop,[0,0,0],[0,0,1],.90,.042,CYAN,26,5,.9);
    torus(collected,[0,0,0],[0,0,1],.90,.026,[.41,.63,.56],26,5,.25);
    ring(halo,[0,0,0],[0,1,0],.96,1.025,[.59,.94,.82,.75],36,1);
    for(let i=0;i<20;i++){const a=i/20*TAU,c=(i+1)/20*TAU;shade.tri([0,0,0],[Math.cos(c),0,Math.sin(c)],[Math.cos(a),0,Math.sin(a)],[[.006,.018,.024,.40],[.006,.018,.024,0],[.006,.018,.024,0]],[[0,1,0],[0,1,0],[0,1,0]],1,true);}
    sphere(particle,[0,0,0],[.065,.065,.065],CYAN,7,4,1);
    return {props:b.finish(),hoop:hoop.finish(),collected:collected.finish(),halo:halo.finish(),shadow:shade.finish(),particle:particle.finish(),boardY:y};
  }
  function cameraBasis(camera) {
    const cp=Math.cos(camera.pitch),eye=[camera.target[0]+Math.sin(camera.yaw)*cp*camera.distance,camera.target[1]+Math.sin(camera.pitch)*camera.distance,camera.target[2]+Math.cos(camera.yaw)*cp*camera.distance];
    const forward=unit(sub(camera.target,eye)),right=unit(cross(forward,[0,1,0])),up=cross(right,forward);
    return {eye,forward,right,up};
  }
  function projection(p,basis,view) {
    const d=sub(p,basis.eye),z=dot(d,basis.forward);
    return z>.15 ? {x:view.cx+dot(d,basis.right)*view.f/z,y:view.cy-dot(d,basis.up)*view.f/z,z,scale:view.f/z} : null;
  }
  function colorFor(n,p,color,emission,basis,fog,opacity=1) {
    const lit=Math.max(0,dot(n,LIGHT)),hemi=.29+.12*Math.max(0,n[1]),rim=(1-Math.abs(dot(n,unit(sub(basis.eye,p)))))**3*.16;
    const dist=length(sub(p,basis.eye)),mist=fog?Math.min(.79,1-Math.exp(-dist*dist*.000075)):0;
    const tint=[.79,.92,1.0],amb=[.78,.91,1.02];
    const rgb=color.slice(0,3).map((v,i)=>{let c=v*(hemi*amb[i]+lit*tint[i]*.84)+rim*[.10,.24,.27][i];c=mix(c,v,clamp(emission,0,1));c=mix(c,FOG[i],mist);return Math.round(clamp(c,0,1)*255);});
    return 'rgba('+rgb.join(',')+','+clamp((color[3]??1)*opacity,0,1).toFixed(3)+')';
  }

  const VERTEX = `
    precision highp float;
    attribute vec3 position; attribute vec3 normal; attribute vec4 color; attribute float emission,material;
    uniform mat4 model; uniform vec3 eye,right,up,forward; uniform float lens,aspect; uniform vec2 offset;
    varying vec3 vNormal,vWorld,vLocal,vLocalNormal; varying vec4 vColor; varying float vEmission,vMaterial;
    void main(){vec3 p=(model*vec4(position,1.0)).xyz;vec3 d=p-eye;float z=dot(d,forward);
      gl_Position=vec4(dot(d,right)/(lens*aspect)+offset.x*z,dot(d,up)/lens+offset.y*z,1.000375*z-.300056,z);
      vNormal=normalize(mat3(model)*normal);vWorld=p;vLocal=position;vLocalNormal=normal;vColor=color;vEmission=emission;vMaterial=material;}`;
  const FRAGMENT = `
    precision highp float;
    uniform vec3 eye;uniform float fog,opacity;
    varying vec3 vNormal,vWorld,vLocal,vLocalNormal;varying vec4 vColor;varying float vEmission,vMaterial;
    ${Materials?.glsl||'vec3 expeditionAlbedo(float k,vec3 p,vec3 n,vec3 b){return b;} vec3 expeditionShade(float k,vec3 a,vec3 n,vec3 v,vec3 l){return a*(.29+.84*max(0.,dot(normalize(n),normalize(l))));}'}
    void main(){vec3 n=normalize(vNormal),albedo=expeditionAlbedo(vMaterial,vLocal,normalize(vLocalNormal),vColor.rgb);
      vec3 c=expeditionShade(vMaterial,albedo,n,eye-vWorld,vec3(-.48,.82,.36));
      c=mix(c,albedo,clamp(vEmission,0.0,1.0));float d=length(eye-vWorld);float mist=min(.79,1.0-exp(-d*d*.000075))*fog;
      gl_FragColor=vec4(mix(c,vec3(.047,.104,.139),mist),vColor.a*opacity);}`;

  function createGL(doc,materials) {
    const surface=doc.createElement('canvas');let gl,program;const buffers=new Map(),shaders=[];
    try{
      gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
      if(!gl)return null;
      program=gl.createProgram();
      for(const [type,source]of [[gl.VERTEX_SHADER,VERTEX],[gl.FRAGMENT_SHADER,FRAGMENT]]){const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Scene shader unavailable');gl.attachShader(program,shader);}
      gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Scene program unavailable');
      shaders.forEach(s=>gl.deleteShader(s));shaders.length=0;
      const attrs=Object.fromEntries(['position','normal','color','emission','material'].map(n=>[n,gl.getAttribLocation(program,n)]));
      const uniforms=Object.fromEntries(['model','eye','right','up','forward','lens','aspect','offset','fog','opacity'].map(n=>[n,gl.getUniformLocation(program,n)]));
      gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      return {surface,gl,
        render(objects,basis,view,w,h){
          if(gl.isContextLost())throw Error('Scene context lost');
          if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;}
          gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
          materials?.bind(gl,program,0);
          for(const k of ['eye','right','up','forward'])gl.uniform3fv(uniforms[k],basis[k]);
          gl.uniform1f(uniforms.lens,view.lens);gl.uniform1f(uniforms.aspect,view.w/view.h);gl.uniform2f(uniforms.offset,view.cx/view.w*2-1,1-view.cy/view.h*2);
          for(const obj of objects){
            if(obj.opacity<=.001)continue;let buffer=buffers.get(obj.mesh);
            if(!buffer){buffer=gl.createBuffer();buffers.set(obj.mesh,buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,obj.mesh.vertices,gl.STATIC_DRAW);}else gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
            for(const [name,size,offset]of [['position',3,0],['normal',3,12],['color',4,24],['emission',1,40],['material',1,44]]){if(attrs[name]<0)continue;gl.enableVertexAttribArray(attrs[name]);gl.vertexAttribPointer(attrs[name],size,gl.FLOAT,false,48,offset);}
            gl.uniformMatrix4fv(uniforms.model,false,obj.matrix);gl.uniform1f(uniforms.fog,obj.fog===false?0:1);gl.uniform1f(uniforms.opacity,obj.opacity??1);gl.depthMask(!obj.transparent);
            gl.drawArrays(gl.TRIANGLES,0,obj.mesh.vertices.length/12);
          }
          gl.depthMask(true);
        },
        destroy(){for(const b of buffers.values())gl.deleteBuffer(b);buffers.clear();gl.deleteProgram(program);surface.width=surface.height=1;gl.getExtension('WEBGL_lose_context')?.loseContext();}
      };
    }catch{
      if(gl){shaders.forEach(s=>gl.deleteShader(s));if(program)gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}
      return null;
    }
  }

  function create(options={}) {
    const canvas=options.canvas;if(!canvas||typeof canvas.getContext!=='function')return null;
    const doc=canvas.ownerDocument||document,ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return null;
    const win=doc.defaultView||window,media=win.matchMedia?.('(prefers-reduced-motion: reduce)');
    const Player=win.ParallaxSheeplePlayer,playable=!!options.playable;
    if(playable&&typeof Player?.create!=='function')throw Error('Sheeple movement unavailable');
    let reduced=!!options.reducedMotion||!!media?.matches,requestedMotion=!reduced,motion=!reduced,alive=true,visible=true,ready=false,frame=0,last=0,clock=0,lastPaint=0;
    const materials=Materials?.create({document:doc,onChange(){if(!alive)return;projectedStatic=null;projectedBackdrop=null;dirty=true;sync();}});
    let glRenderer=createGL(doc,materials),renderMode=glRenderer?'webgl':'canvas',location=null,arriving=false,transition=null,dirty=true,statusKey='';
    let width=1,height=1,dpr=1,view=null,basis=null,projectedStatic=null,projectedBackdrop=null,staticKey='',interactionClock=-100,interactionID=null;
    let playing=false,playClock=0,baaClock=-100,flockResponds=false,replyPlayed=false;
    let soundPreference='auto',soundStatus='ready',soundStateKey='',audioContext=null,audioMaster=null,audioRevision=0,audioAttempt=0,baaRequest=0;
    const keys=new Set(),touchMove={right:0,forward:0};
    const detail=playable&&renderMode==='canvas'?.72:1;
    const terrain=terrainMesh(),world=scenery(),sheep=sheepMesh(false,detail),mascot=sheepMesh(true,detail),leg=legMesh(),mascotLeg=legMesh(true),hoof=hoofMesh(),I=identity();
    const playground=playable?playScenery(Player.WORLD):null;
    if(playable){world.props=clipGround(world.props);playground.props=clipGround(playground.props);}
    const staticObjects=[{mesh:world.sky,matrix:I,fog:false},{mesh:terrain,matrix:I},{mesh:world.shadows,matrix:I,transparent:true},{mesh:world.props,matrix:I}];
    if(playground)staticObjects.push({mesh:playground.props,matrix:I});
    const stars=Array.from({length:640},(_,i)=>{const y=.025+hash(i,63)*.96,a=hash(i,77)*TAU,r=Math.sqrt(1-y*y);return {p:[Math.cos(a)*r,y,Math.sin(a)*r],size:.45+hash(i,44)*1.15,alpha:.22+hash(i,21)*.64,phase:hash(i,25)*TAU};});
    const pointers=new Map(),events=[],oldTouch=canvas.style?.touchAction,oldCursor=canvas.style?.cursor,oldTab=canvas.getAttribute?.('tabindex');
    let pinch=0,pointerStart=null,dragged=false,resizeObserver=null,intersectionObserver=null;
    const camera={target:[0,1.05,0],yaw:.105,pitch:.22,distance:34};
    const player=playable?Player.create({groundHeight:terrainHeight,completed:options.completed||[],onComplete(id){
      interactionID=id;interactionClock=playClock;dirty=true;safeCall('onInteract',id);
      if(id==='bell')sound('bell');else sound('complete');
    },onEvent(event){
      if(event.type==='board')safeCall('onBoard');
      else if(event.type==='baa'){baaClock=playClock;flockResponds=!!event.flock;replyPlayed=false;sound('baa');}
      else if(event.type==='jump')sound('jump');
      else if(event.type==='spark')sound('spark');
      if(event.type!=='complete')safeCall('onEvent',event);
      dirty=true;
    }}):null;
    if(playable)location='flock';
    function followView(){const p=player.getState();return {target:[p.x,terrainHeight(p.x,p.z)+1.0,p.z],yaw:0,pitch:.28,distance:width<700?9.2:8.6};}
    function overview(){return playable?followView():{target:[0,1.05,0],yaw:.105,pitch:.22,distance:width<700?37:34};}
    function listen(target,name,handler,opts){target?.addEventListener?.(name,handler,opts);events.push(()=>target?.removeEventListener?.(name,handler,opts));}
    function safeCall(name,arg){try{options[name]?.(arg);}catch(error){win.console?.error?.('Sheeple scene callback:',error);}}
    function nearby(){
      if(playable)return arriving?null:player.getState().nearby;
      if(!location||arriving||transition)return null;const p=LOCATIONS[location];
      return camera.distance<=p.reach&&(length(sub(camera.target,p.target))<1.5)?location:null;
    }
    function status(){
      const base={location,nearby:nearby(),arriving,travelling:!!transition,renderMode};
      if(!playable)return base;
      const p=player.getState(),sparks=p.sparks.filter(Boolean).length,target=Player.WORLD[location];
      const hints={board:'Walk-up field guide. Press E to read.',flock:'The flock is listening. Press B to baa.',signal:sparks===3?'Signal charged. Press E at the beacon.':'Jump through the glowing rings: '+sparks+' / 3.',bell:'Jump beneath the golden bell to ring it.'};
      return {...base,playable:true,mission:location,sparks,player:{x:Math.round(p.x*10)/10,z:Math.round(p.z*10)/10,grounded:p.grounded,height:Math.round(p.height*20)/20,speed:Math.round(p.speed*10)/10},
        distance:target?Math.round(Math.hypot(p.x-target.x,p.z-target.z)):null,hint:hints[p.nearby]||(location==='signal'?'Jump through the three signal rings, then wake the beacon.':location==='bell'?'Follow the gold stones. Jump beneath the bell.':'Find the flock and give them a baa.')};
    }
    function notify(){const data=status(),key=JSON.stringify(data);if(key!==statusKey){statusKey=key;safeCall('onStatus',data);}}
    function setCamera(value){camera.target=value.target.slice();camera.yaw=value.yaw;camera.pitch=value.pitch;camera.distance=value.distance;dirty=true;}
    function cameraCopy(){return {target:camera.target.slice(),yaw:camera.yaw,pitch:camera.pitch,distance:camera.distance};}
    function clearMovement(){keys.clear();touchMove.right=touchMove.forward=0;player?.setMove(0,0);}
    function movement(){
      if(!playable||!playing)return;
      const right=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))+touchMove.right;
      const forward=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'))+touchMove.forward;
      player.setMove(right,forward);dirty=true;sync();
    }
    function action(kind){if(!playable||!playing||arriving)return false;const ok=player[kind]();if(ok){dirty=true;notify();sync();}return ok;}
    function reportSound(value){
      soundStatus=value;
      const key=soundPreference+':'+value;if(key===soundStateKey)return;soundStateKey=key;
      safeCall('onSoundState',{preference:soundPreference,status:value,enabled:value==='on'});
    }
    function audioOutput(value){
      if(!audioMaster||!audioContext)return;
      try{audioMaster.gain.cancelScheduledValues(audioContext.currentTime);audioMaster.gain.setValueAtTime(value,audioContext.currentTime);}catch{audioMaster.gain.value=value;}
    }
    function audioBlocked(value){
      audioOutput(0);reportSound(value);
      safeCall('onEvent',{type:'hint',message:value==='unavailable'?'Sound is unavailable in this browser. You can keep exploring.':'Tap Enable sound or Baa to let your browser play the sheep.'});
      return false;
    }
    function ensureAudio(){
      if(!alive||soundPreference!=='on')return Promise.resolve(false);
      try{
        if(!audioContext||audioContext.state==='closed'){
          const Audio=win.AudioContext||win.webkitAudioContext;if(!Audio)throw Error('No audio');
          audioMaster?.disconnect();audioContext=new Audio();audioMaster=audioContext.createGain();
          audioMaster.gain.value=0;audioMaster.connect(audioContext.destination);
          const created=audioContext;
          listen(created,'statechange',()=>{
            if(!alive||audioContext!==created||soundPreference!=='on')return;
            if(created.state==='running'){audioOutput(1);reportSound('on');}
            else if(soundStatus!=='starting'){audioOutput(0);reportSound('blocked');}
          });
        }
      }catch{return Promise.resolve(audioBlocked('unavailable'));}
      const ac=audioContext,revision=audioRevision,attempt=++audioAttempt;
      const current=()=>alive&&audioContext===ac&&audioRevision===revision&&soundPreference==='on';
      const finish=()=>{if(!current())return false;if(ac.state!=='running')return audioBlocked('blocked');audioOutput(1);reportSound('on');return true;};
      const failed=()=>!current()||attempt!==audioAttempt?false:ac.state==='running'?finish():audioBlocked('blocked');
      if(ac.state==='running')return Promise.resolve(finish());
      reportSound('starting');
      // Call resume inside the click/key gesture, then schedule tones only once it succeeds.
      // A subsequent gesture may retry even if an earlier resume promise is still pending.
      try{return Promise.resolve(ac.resume()).then(finish,failed);}
      catch{return Promise.resolve(failed());}
    }
    function setSound(value){
      if(!alive)return false;
      audioRevision++;soundPreference=value===null?'auto':value?'on':'off';
      if(soundPreference!=='on'){audioOutput(0);reportSound(soundPreference==='off'?'muted':'ready');return false;}
      ensureAudio();return soundStatus==='on';
    }
    function sound(kind){
      if(!alive||soundPreference==='off')return;
      if(kind==='baa'&&soundPreference==='auto'){soundPreference='on';audioRevision++;}
      if(soundPreference!=='on'||(kind!=='baa'&&soundStatus!=='on'))return;
      const revision=audioRevision,request=kind==='baa'?++baaRequest:0;
      ensureAudio().then(ok=>{
        if(!ok||!alive||revision!==audioRevision||soundPreference!=='on'||audioContext?.state!=='running'||(request&&request!==baaRequest))return;
        playSound(kind);
      });
    }
    function playSound(kind){
      try{
        const ac=audioContext,t=ac.currentTime,gain=ac.createGain();gain.connect(audioMaster);
        if(kind==='baa'||kind==='reply'){
          const voice=ac.createOscillator(),filter=ac.createBiquadFilter(),flutter=ac.createOscillator(),depth=ac.createGain();
          const base=kind==='reply'?185:145;voice.type='sawtooth';voice.frequency.setValueAtTime(base,t);voice.frequency.exponentialRampToValueAtTime(base*.77,t+.72);
          filter.type='bandpass';filter.frequency.setValueAtTime(820,t);filter.frequency.exponentialRampToValueAtTime(540,t+.76);filter.Q.value=1.1;
          flutter.frequency.value=12;depth.gain.value=16;flutter.connect(depth);depth.connect(voice.frequency);
          voice.connect(filter);filter.connect(gain);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.42,t+.035);gain.gain.setValueAtTime(.34,t+.46);gain.gain.exponentialRampToValueAtTime(.001,t+.84);
          voice.start(t);flutter.start(t);voice.stop(t+.86);flutter.stop(t+.86);voice.onended=()=>{voice.disconnect();filter.disconnect();gain.disconnect();flutter.disconnect();depth.disconnect();};
        }else{
          const voice=ac.createOscillator();voice.type=kind==='bell'?'sine':'triangle';const freq=kind==='jump'?210:kind==='spark'?780:kind==='bell'?660:520,duration=kind==='bell'?.95:kind==='jump'?.16:.24;
          voice.frequency.setValueAtTime(freq,t);voice.frequency.exponentialRampToValueAtTime(freq*(kind==='jump'?1.65:kind==='bell'?1:1.35),t+duration);
          voice.connect(gain);gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(kind==='bell'?.10:.045,t+.012);gain.gain.exponentialRampToValueAtTime(.001,t+duration);voice.start(t);voice.stop(t+duration+.03);voice.onended=()=>{voice.disconnect();gain.disconnect();};
        }
      }catch{ /* Movement and discoveries continue if audio is unavailable. */ }
    }
    function size(){
      const rect=canvas.getBoundingClientRect?.()||{},w=Math.max(240,Math.round(rect.width||canvas.clientWidth||960)),h=Math.max(260,Math.round(rect.height||canvas.clientHeight||640));
      const ratio=Math.min(win.devicePixelRatio||1,renderMode==='webgl'?1.75:1.5,Math.sqrt(1800000/(w*h)));
      if(w===width&&h===height&&Math.abs(ratio-dpr)<.001)return;
      const wasMobile=width<700;width=w;height=h;dpr=ratio;canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
      if((!location||playable)&&!transition&&(wasMobile!==(w<700)||!ready))setCamera(overview());
      const lens=Math.tan((playable?29:26)*Math.PI/180);view={w,h,lens,f:h/(2*lens),cx:w*(playable?.50:w<700?.50:.59),cy:h*(playable?(w<700?.54:.60):w<700?.40:.51)};dirty=true;projectedStatic=null;
    }
    function objects(){
      const out=staticObjects.slice(),t=clock,state=player?.getState(),baaAge=playClock-baaClock;
      FLOCK.forEach((p,index)=>{
        const reply=playable&&flockResponds&&baaAge>.18&&baaAge<2.7?smooth((baaAge-.18)*3)*(1-smooth((baaAge-1.8)/.9)):0;
        const angle=state?Math.atan2(state.x-p.x,state.z-p.z)-p.yaw:0;
        const pose=sheepPose(reply?{...p,yaw:p.yaw+Math.atan2(Math.sin(angle),Math.cos(angle))*reply}:p,t);
        for(const limb of pose.legs){
          out.push({mesh:index===0?mascotLeg:leg,matrix:limb.legMatrix});
          out.push({mesh:hoof,matrix:limb.hoofMatrix});
        }
        out.push({mesh:index===0?mascot:sheep,matrix:pose.root});
      });
      if(state){
        const pose=playerPose(state),floor=terrainHeight(state.x,state.z);
        out.push({mesh:playground.shadow,matrix:matrix([state.x,floor+.035,state.z],0,0,0,1.1),opacity:1-Math.min(.65,state.height*.25),transparent:true});
        out.push({mesh:playground.halo,matrix:matrix([state.x,floor+.042,state.z],0,0,0,.78),opacity:.42,transparent:true});
        for(const limb of pose.legs){out.push({mesh:mascotLeg,matrix:limb.legMatrix});out.push({mesh:hoof,matrix:limb.hoofMatrix});}
        out.push({mesh:mascot,matrix:pose.root});
        Player.WORLD.sparks.forEach((p,i)=>{
          const py=terrainHeight(p.x,p.z)+1.34+(motion?Math.sin(clock*1.6+i)*.08:0);
          out.push({mesh:state.sparks[i]?playground.collected:playground.hoop,matrix:matrix([p.x,py,p.z],-.3)});
          if(!state.sparks[i])out.push({mesh:playground.particle,matrix:matrix([p.x,py+.1,p.z],clock,clock*.7)});
        });
        if(baaAge>=0&&baaAge<1.2)out.push({mesh:playground.halo,matrix:matrix([state.x,floor+.06,state.z],0,0,0,.8+baaAge*2.9),opacity:(1-baaAge/1.2)*.55,transparent:true});
      }
      const elapsed=(playable?playClock:clock)-interactionClock,ringing=interactionID==='bell'&&elapsed<3?Math.sin(elapsed*11)*Math.exp(-elapsed*1.2)*.18:0;
      const bellMatrix=multiply(matrix(world.bellBase),multiply(matrix([0,1.91,0],0,0,ringing),matrix([0,-1.91,0])));
      out.push({mesh:world.bell,matrix:bellMatrix});
      if(interactionID==='signal'&&elapsed>=0&&elapsed<3)for(let i=0;i<3;i++){const f=(elapsed*.55+i*.32)%1,scale=.6+f*1.8;out.push({mesh:world.pulse,matrix:matrix([6.05,ground(5.7,-3.3)+4.0+f*.8,-3.43],0,0,0,scale),opacity:(1-f)*.7,transparent:true});}
      return out;
    }
    function sky(){
      const gradient=ctx.createLinearGradient(0,0,0,height);gradient.addColorStop(0,'#030912');gradient.addColorStop(.43,'#0b2030');gradient.addColorStop(.78,'#173844');gradient.addColorStop(1,'#10232f');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
      // Broad atmospheric light sits behind the actual projected mountain and planet geometry.
      for(const [direction,color,r]of [[[.2,.15,-1],'rgba(40,109,130,.17)',.66],[[-.65,.36,-1],'rgba(92,91,143,.13)',.48]]){
        const d=unit(direction),z=dot(d,basis.forward);if(z<=.1)continue;const x=view.cx+dot(d,basis.right)*view.f/z,y=view.cy-dot(d,basis.up)*view.f/z,radius=width*r;
        const g=ctx.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
      }
      for(const star of stars){const z=dot(star.p,basis.forward);if(z<=.1)continue;const x=view.cx+dot(star.p,basis.right)*view.f/z,y=view.cy-dot(star.p,basis.up)*view.f/z;if(x<-3||x>width+3||y<-3||y>height+3)continue;
        const shimmer=.86+.14*Math.sin(clock*.45+star.phase);ctx.fillStyle='rgba(200,230,239,'+(star.alpha*shimmer).toFixed(3)+')';ctx.beginPath();ctx.arc(x,y,star.size,0,TAU);ctx.fill();
        if(star.size>1.45){ctx.fillStyle='rgba(165,221,233,.11)';ctx.fillRect(x-3.5,y-.45,7,1);ctx.fillRect(x-.45,y-3.5,1,7);}
      }
      const moon=projection([-43,21,-145],basis,view);if(moon){const radius=moon.scale*24,g=ctx.createRadialGradient(moon.x,moon.y,moon.scale*9,moon.x,moon.y,radius);g.addColorStop(0,'rgba(103,156,180,.11)');g.addColorStop(1,'rgba(39,74,113,0)');ctx.fillStyle=g;ctx.fillRect(moon.x-radius,moon.y-radius,radius*2,radius*2);}
    }
    function projectObjects(list){
      const out=[];
      for(const obj of list){if(obj.opacity<=.001)continue;const m=obj.matrix;
        // Compose local-to-camera once per object. The inner loop avoids allocating world
        // vectors for every vertex, keeping the software path useful on mobile hardware.
        const scale=Math.hypot(m[0],m[1],m[2]),inverse=1/scale,dx=basis.eye[0]-m[12],dy=basis.eye[1]-m[13],dz=basis.eye[2]-m[14];
        const localEye=[(m[0]*dx+m[1]*dy+m[2]*dz)*inverse*inverse,(m[4]*dx+m[5]*dy+m[6]*dz)*inverse*inverse,(m[8]*dx+m[9]*dy+m[10]*dz)*inverse*inverse];
        const localLight=[(m[0]*LIGHT[0]+m[1]*LIGHT[1]+m[2]*LIGHT[2])*inverse,(m[4]*LIGHT[0]+m[5]*LIGHT[1]+m[6]*LIGHT[2])*inverse,(m[8]*LIGHT[0]+m[9]*LIGHT[1]+m[10]*LIGHT[2])*inverse];
        const rows=[basis.right,basis.up,basis.forward].map(v=>[v[0]*m[0]+v[1]*m[1]+v[2]*m[2],v[0]*m[4]+v[1]*m[5]+v[2]*m[6],v[0]*m[8]+v[1]*m[9]+v[2]*m[10],-dot(v,[dx,dy,dz])]);
        const rx=rows[0],ry=rows[1],rz=rows[2],opacity=obj.opacity??1,worldNormal=[0,0,0],worldView=[0,0,0],shaded=[0,0,0];
        for(const tri of obj.mesh.triangles){
          const n=tri.n,a=tri.a,b=tri.b,c=tri.c,center=tri.center,ex=localEye[0]-center[0],ey=localEye[1]-center[1],ez=localEye[2]-center[2],facing=n[0]*ex+n[1]*ey+n[2]*ez;
          if(!tri.twoSided&&facing<=0)continue;
          const az=dot(a,rz)+rz[3],bz=dot(b,rz)+rz[3],cz=dot(c,rz)+rz[3];if(az<=.15||bz<=.15||cz<=.15)continue;
          const ax=view.cx+(dot(a,rx)+rx[3])*view.f/az,ay=view.cy-(dot(a,ry)+ry[3])*view.f/az,bx=view.cx+(dot(b,rx)+rx[3])*view.f/bz,by=view.cy-(dot(b,ry)+ry[3])*view.f/bz,cx=view.cx+(dot(c,rx)+rx[3])*view.f/cz,cy=view.cy-(dot(c,ry)+ry[3])*view.f/cz;
          if(Math.max(ax,bx,cx)<-2||Math.min(ax,bx,cx)>width+2||Math.max(ay,by,cy)<-2||Math.min(ay,by,cy)>height+2||Math.abs((bx-ax)*(cy-ay)-(by-ay)*(cx-ax))<.035)continue;
          const dist=Math.hypot(ex,ey,ez),lit=Math.max(0,dot(n,localLight)),hemi=.29+.12*Math.max(0,(m[1]*n[0]+m[5]*n[1]+m[9]*n[2])*inverse),rim=(1-Math.abs(facing/(dist||1)))**3*.16,mist=obj.fog===false?0:Math.min(.79,1-Math.exp(-dist*dist*scale*scale*.000075)),color=materials?materials.surface(tri):tri.color,em=clamp(tri.emission,0,1);
          if(materials){
            worldNormal[0]=(m[0]*n[0]+m[4]*n[1]+m[8]*n[2])*inverse;worldNormal[1]=(m[1]*n[0]+m[5]*n[1]+m[9]*n[2])*inverse;worldNormal[2]=(m[2]*n[0]+m[6]*n[1]+m[10]*n[2])*inverse;
            worldView[0]=m[0]*ex+m[4]*ey+m[8]*ez;worldView[1]=m[1]*ex+m[5]*ey+m[9]*ez;worldView[2]=m[2]*ex+m[6]*ey+m[10]*ez;
            Materials.shade(tri.material||0,color,worldNormal,worldView,LIGHT,shaded);
          }else{shaded[0]=color[0]*(hemi*.78+lit*.79*.84)+rim*.10;shaded[1]=color[1]*(hemi*.91+lit*.92*.84)+rim*.24;shaded[2]=color[2]*(hemi*1.02+lit*.84)+rim*.27;}
          const r=Math.round(clamp(mix(mix(shaded[0],color[0],em),FOG[0],mist),0,1)*255),g=Math.round(clamp(mix(mix(shaded[1],color[1],em),FOG[1],mist),0,1)*255),bl=Math.round(clamp(mix(mix(shaded[2],color[2],em),FOG[2],mist),0,1)*255);
          const alpha=color[3]*opacity,css=alpha>.998?'rgb('+r+','+g+','+bl+')':'rgba('+r+','+g+','+bl+','+alpha.toFixed(3)+')';
          out.push({ax,ay,bx,by,cx,cy,z:(az+bz+cz)/3,color:css,opaque:alpha>.98&&!obj.transparent});
        }
      }
      out.sort((a,b)=>b.z-a.z);return out;
    }
    function canvasMesh(list){
      const key=[width,height,...camera.target,camera.yaw,camera.pitch,camera.distance].map(v=>Number(v).toFixed(5)).join('|');
      if(!projectedStatic||key!==staticKey){
        staticKey=key;
        // Ground is a heightfield beneath the player. Painting its large triangles before
        // foreground geometry prevents average-depth sorting from hiding grounded hooves.
        projectedBackdrop=playable?projectObjects(staticObjects.slice(0,3)):[];
        projectedStatic=projectObjects(playable?staticObjects.slice(3):staticObjects);
      }
      const dynamic=projectObjects(list.slice(staticObjects.length));let a=0,b=0;
      function paint(tri){
        ctx.fillStyle=tri.color;ctx.beginPath();
        // A fraction of a CSS pixel seals antialias cracks without changing the 3D silhouette.
        const cx=(tri.ax+tri.bx+tri.cx)/3,cy=(tri.ay+tri.by+tri.cy)/3,expand=tri.opaque?.22:0,al=Math.hypot(tri.ax-cx,tri.ay-cy)||1,bl=Math.hypot(tri.bx-cx,tri.by-cy)||1,cl=Math.hypot(tri.cx-cx,tri.cy-cy)||1;
        ctx.moveTo(tri.ax+(tri.ax-cx)/al*expand,tri.ay+(tri.ay-cy)/al*expand);ctx.lineTo(tri.bx+(tri.bx-cx)/bl*expand,tri.by+(tri.by-cy)/bl*expand);ctx.lineTo(tri.cx+(tri.cx-cx)/cl*expand,tri.cy+(tri.cy-cy)/cl*expand);
        ctx.closePath();ctx.fill();
      }
      for(const tri of projectedBackdrop)paint(tri);
      while(a<projectedStatic.length||b<dynamic.length){
        const tri=b>=dynamic.length||(a<projectedStatic.length&&projectedStatic[a].z>=dynamic[b].z)?projectedStatic[a++]:dynamic[b++];paint(tri);
      }
    }
    function accents(){
      for(const light of world.lights){
        // The secret's glow becomes visible only from its clearing, never through the arch.
        if(light.kind==='bell'&&location!=='bell')continue;
        const p=projection(light.p,basis,view);if(!p||p.x<-30||p.x>width+30||p.y<-30||p.y>height+30)continue;
        const r=clamp(p.scale*light.radius,2.4,30),pulse=.86+.14*Math.sin(clock*.9+(light.kind==='signal'?0:1.5)),g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
        g.addColorStop(0,'rgba('+light.color.join(',')+','+(.30*pulse).toFixed(3)+')');g.addColorStop(.22,'rgba('+light.color.join(',')+',.13)');g.addColorStop(1,'rgba('+light.color.join(',')+',0)');ctx.fillStyle=g;ctx.fillRect(p.x-r,p.y-r,r*2,r*2);
      }
      const vignette=ctx.createRadialGradient(width*.55,height*.43,Math.min(width,height)*.25,width*.52,height*.45,Math.max(width,height)*.80);
      vignette.addColorStop(0,'rgba(1,7,14,0)');vignette.addColorStop(1,'rgba(1,7,14,.40)');ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
    }
    function playOverlay(){
      if(!playable||arriving||typeof ctx.fillText!=='function')return;
      const state=player.getState(),config=Player.WORLD;
      function pill(position,label,color='#bce9d9',small=false){
        const p=projection(position,basis,view);if(!p||p.z>37||p.x<42||p.x>width-42||p.y<85||p.y>height-125)return;
        ctx.save();ctx.font=(small?'9':'10')+'px ui-monospace, monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        const w=ctx.measureText(label).width+19;ctx.fillStyle='rgba(4,17,25,.78)';ctx.fillRect(p.x-w/2,p.y-12,w,24);ctx.fillStyle=color;ctx.fillText(label,p.x,p.y);ctx.restore();
      }
      const board=config.board,by=playground.boardY;
      if(basis.eye[2]>board.z&&Math.hypot(state.x-board.x,state.z-board.z)<19){
        const a=projection([board.x-1.46,by+2.98,board.z+.155],basis,view),b=projection([board.x+1.46,by+2.98,board.z+.155],basis,view),c=projection([board.x-1.46,by+1.43,board.z+.155],basis,view);
        if(a&&b&&c){
          ctx.save();ctx.transform((b.x-a.x)/300,(b.y-a.y)/300,(c.x-a.x)/160,(c.y-a.y)/160,a.x,a.y);ctx.textAlign='left';ctx.textBaseline='top';
          ctx.fillStyle='#b4ecdb';ctx.font='bold 20px system-ui, sans-serif';ctx.fillText('THE SHEEPLE FLOCK',0,0);
          ctx.fillStyle='#789ba7';ctx.font='11px ui-monospace, monospace';ctx.fillText('LUNAR FIELD GUIDE / 001',0,34);
          ctx.fillStyle='#d7e5df';ctx.font='15px system-ui, sans-serif';ctx.fillText('Camera-headed. Solar-powered.',0,72);ctx.fillText('A little further from ordinary.',0,98);
          ctx.fillStyle='#b4ecdb';ctx.font='bold 13px system-ui, sans-serif';ctx.fillText('WALK CLOSER  /  E TO READ',0,137);ctx.restore();
        }
      }
      const names={flock:'THE FLOCK',signal:'SIGNAL STATION',bell:'GOLDEN BELL',board:'FIELD GUIDE'};
      for(const id of ['flock','signal','bell','board']){
        const p=config[id],done=state.completed.includes(id),label=(done?'✓ ':'')+names[id];
        pill([p.x,terrainHeight(p.x,p.z)+(id==='signal'?4.8:id==='board'?3.65:3.15),p.z],label,id==='bell'?'#ecd39b':id===location?'#d1fff0':'#9bbcc6',true);
      }
      const age=playClock-baaClock;
      if(age<1.1)pill([state.x,state.y+2.25,state.z],'BAA-AA!','#f4f0d1');
      else pill([state.x,state.y+2.02,state.z],'YOU','#c9f4e2',true);
      if(flockResponds&&age>.3&&age<2.0)for(const i of [1,2]){const p=FLOCK[i];pill([p.x,terrainHeight(p.x,p.z)+2.35*p.scale,p.z],i===1?'Baa!':'Baa-aa!','#ede7ce',true);}
      // A selected destination stays findable when the player turns away from it.
      const target=config[location];
      if(target){
        const p=projection([target.x,terrainHeight(target.x,target.z)+2,target.z],basis,view);
        if(!p||p.x<55||p.x>width-55){
          const dx=target.x-state.x,dz=target.z-state.z,right=dx*Math.cos(camera.yaw)-dz*Math.sin(camera.yaw),front=-dx*Math.sin(camera.yaw)-dz*Math.cos(camera.yaw);
          const side=right>=0?1:-1,x=width/2+side*Math.min(width*.33,340),y=height*.44;
          ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='10px ui-monospace, monospace';const label=(front<0?'TURN ':'')+(side>0?'→ ':'← ')+names[location];
          const w=ctx.measureText(label).width+18;ctx.fillStyle='rgba(4,17,25,.8)';ctx.fillRect(clamp(x-w/2,7,width-w-7),y-14,w,28);ctx.fillStyle='#c5e7d9';ctx.fillText(label,clamp(x,w/2+7,width-w/2-7),y);ctx.restore();
        }
      }
      if(width>1000&&height>740){
        const mx=104,my=height-122,r=58;ctx.save();ctx.fillStyle='rgba(5,19,28,.78)';ctx.beginPath();ctx.arc(mx,my,r,0,TAU);ctx.fill();ctx.strokeStyle='rgba(159,211,207,.27)';ctx.lineWidth=1;ctx.stroke();
        ctx.font='8px ui-monospace, monospace';ctx.textAlign='center';ctx.fillStyle='#95b5bf';ctx.fillText('HABITAT',mx,my-r-10);
        const map=p=>({x:mx+(p.x+1.5)*2.3,y:my+(p.z-1)*2.3});
        for(const id of ['flock','signal','bell','board']){const m=map(config[id]);ctx.fillStyle=id===location?'#dcffe8':id==='bell'?'#d3b96e':'#698f9c';ctx.beginPath();ctx.arc(m.x,m.y,id===location?4:2.8,0,TAU);ctx.fill();}
        const p=map(state);ctx.translate(p.x,p.y);ctx.rotate(-state.yaw);ctx.beginPath();ctx.moveTo(0,5);ctx.lineTo(-3.7,-3.7);ctx.lineTo(3.7,-3.7);ctx.closePath();ctx.fillStyle='#c7f4e3';ctx.fill();ctx.restore();
      }
    }
    function draw(){
      if(!alive)return;size();basis=cameraBasis(camera);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;sky();const list=objects();
      if(glRenderer){try{glRenderer.render(list,basis,view,canvas.width,canvas.height);ctx.drawImage(glRenderer.surface,0,0,width,height);}catch{glRenderer.destroy();glRenderer=null;renderMode='canvas';projectedStatic=null;size();ctx.setTransform(dpr,0,0,dpr,0,0);sky();canvasMesh(list);}}
      else canvasMesh(list);
      accents();playOverlay();dirty=false;notify();
      if(!ready){ready=true;Promise.resolve().then(()=>{if(alive)safeCall('onReady');});}
    }
    function canRun(){return alive&&visible&&!doc.hidden;}
    function needsFrame(){const p=player?.getState();return dirty||!!transition||(motion&&!reduced)||(playing&&(p.speed>.001||!p.grounded||keys.size||touchMove.right||touchMove.forward||playClock-baaClock<3));}
    function sync(){if(!canRun()){if(frame)win.cancelAnimationFrame(frame);frame=0;last=0;return;}if(!frame&&needsFrame())frame=win.requestAnimationFrame(tick);}
    function tick(now){
      frame=0;if(!canRun()){last=0;return;}
      const elapsed=last?Math.max(0,(now-last)/1000):0,dt=Math.min(.07,elapsed);last=now;
      if(motion&&!reduced)clock+=dt;
      if(playable&&playing&&!arriving){
        playClock+=Math.min(.25,elapsed);const p=player.step(Math.min(.25,elapsed),camera.yaw);
        const desired=[p.x,terrainHeight(p.x,p.z)+1+Math.min(p.height*.18,.28),p.z];
        const ease=reduced?1:1-Math.exp(-9*Math.min(.25,elapsed));
        camera.target=camera.target.map((v,i)=>mix(v,desired[i],ease));
        if(p.speed>.001||!p.grounded||length(sub(camera.target,desired))>.001||playClock-baaClock<3)dirty=true;
        if(flockResponds&&!replyPlayed&&playClock-baaClock>.40){replyPlayed=true;sound('reply');}
      }
      // Travel follows elapsed time even on a slow Canvas frame. Visibility suspension resets
      // last, while the smaller simulation delta keeps flock movement gentle after a long frame.
      if(transition){const tr=transition;tr.elapsed+=Math.min(2,elapsed);const f=clamp(tr.elapsed/tr.duration,0,1),e=f*f*f*(f*(f*6-15)+10);
        camera.target=tr.from.target.map((v,i)=>mix(v,tr.to.target[i],e));camera.yaw=mix(tr.from.yaw,tr.to.yaw,e);camera.pitch=mix(tr.from.pitch,tr.to.pitch,e);camera.distance=mix(tr.from.distance,tr.to.distance,e);dirty=true;
        if(f===1){setCamera(tr.to);transition=null;arriving=false;notify();}
      }
      const interval=renderMode==='canvas'?50:33;
      if(!lastPaint||now-lastPaint>=interval){draw();lastPaint=now;}
      if(needsFrame())sync();else last=0;
    }
    function go(to,duration){
      if(reduced){transition=null;arriving=false;setCamera(to);draw();sync();return;}
      const from=cameraCopy();let yaw=to.yaw;while(yaw-from.yaw>Math.PI)yaw-=TAU;while(yaw-from.yaw< -Math.PI)yaw+=TAU;
      transition={from,to:{...to,yaw},duration,elapsed:0};dirty=true;notify();sync();
    }
    function focus(id){if(!alive||!Object.hasOwn(LOCATIONS,id))return false;location=id;if(playable){dirty=true;notify();sync();return true;}arriving=false;const p=LOCATIONS[id];go({target:p.target.slice(),yaw:p.yaw,pitch:p.pitch,distance:p.distance*(width<700?1.17:1)},1.45);return true;}
    function interact(id){
      if(playable)return action('interact');
      if(!alive||arriving)return false;const target=id??nearby();if(!Object.hasOwn(LOCATIONS,target)||nearby()!==target)return false;
      interactionID=target;interactionClock=clock;dirty=true;draw();safeCall('onInteract',target);sync();return true;
    }
    function skipArrival(){if(!alive||!arriving)return;const to=transition?.to||overview();transition=null;arriving=false;setCamera(to);draw();sync();}
    function manual(){if(arriving)skipArrival();if(transition){transition=null;dirty=true;}notify();}
    function hit(x,y){
      if(!basis)return null;const candidates=[];
      for(const [id,l]of Object.entries(LOCATIONS)){
        const p=projection(l.target,basis,view);if(!p)continue;
        const radius=clamp(p.scale*l.radius,18,width*.23),d=Math.hypot(x-p.x,y-p.y);if(d<radius)candidates.push({id,d:d/radius,z:p.z});
      }
      candidates.sort((a,b)=>a.d-b.d||a.z-b.z);return candidates[0]?.id||null;
    }
    function local(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
    function pointerDistance(){const p=Array.from(pointers.values());return p.length>1?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0;}
    function pointerDown(e){if(!alive||e.button>0)return;manual();canvas.focus?.({preventScroll:true});const p=local(e);pointers.set(e.pointerId,p);canvas.setPointerCapture?.(e.pointerId);pointerStart={...p,time:Date.now()};dragged=false;if(pointers.size>1){pinch=pointerDistance();dragged=true;}if(canvas.style)canvas.style.cursor='grabbing';}
    function pointerMove(e){
      const p=local(e),previous=pointers.get(e.pointerId);
      if(!previous){if(canvas.style)canvas.style.cursor=playable?'grab':hit(p.x,p.y)?'pointer':'grab';return;}
      pointers.set(e.pointerId,p);const dx=p.x-previous.x,dy=p.y-previous.y;
      if(pointerStart&&Math.hypot(p.x-pointerStart.x,p.y-pointerStart.y)>4)dragged=true;
      if(pointers.size>1){const distance=pointerDistance();if(pinch>0&&distance>0)camera.distance=clamp(camera.distance*pinch/distance,playable?5.4:5.2,playable?15:66);pinch=distance;dragged=true;}
      else{camera.yaw-=dx*.005;camera.pitch=clamp(camera.pitch+dy*.0035,playable?.16:.065,playable?.72:.92);}
      dirty=true;notify();sync();
    }
    function pointerUp(e){
      const p=local(e),was=pointers.has(e.pointerId),click=was&&!dragged&&pointers.size===1&&pointerStart&&Date.now()-pointerStart.time<700;
      pointers.delete(e.pointerId);pinch=pointerDistance();if(!pointers.size){if(canvas.style)canvas.style.cursor='grab';pointerStart=null;}
      if(click&&!playable){const id=hit(p.x,p.y);if(id){if(nearby()===id)interact(id);else focus(id);}}
    }
    function cancelPointer(e){pointers.delete(e.pointerId);pinch=pointerDistance();dragged=true;if(!pointers.size){pointerStart=null;if(canvas.style)canvas.style.cursor='grab';}}
    if(canvas.style){canvas.style.touchAction='none';canvas.style.cursor='grab';}if(oldTab===null||oldTab===undefined)canvas.setAttribute?.('tabindex','0');
    listen(canvas,'pointerdown',pointerDown);listen(canvas,'pointermove',pointerMove);listen(canvas,'pointerup',pointerUp);listen(canvas,'pointercancel',cancelPointer);listen(canvas,'lostpointercapture',cancelPointer);
    listen(canvas,'wheel',e=>{e.preventDefault();manual();camera.distance=clamp(camera.distance*Math.exp(clamp(e.deltaY,-160,160)*.0018),playable?5.4:5.2,playable?15:66);dirty=true;notify();sync();},{passive:false});
    listen(canvas,'keydown',e=>{
      if(e.ctrlKey||e.metaKey||e.altKey)return;const key=e.key.toLowerCase();
      if(playable){
        if(!playing||arriving)return;
        if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){e.preventDefault();keys.add(key);movement();return;}
        if([' ','spacebar','b','e','enter','home','c','+','=','-','_'].includes(key)){
          e.preventDefault();if(e.repeat)return;
          if(key===' '||key==='spacebar')action('jump');else if(key==='b')action('baa');else if(key==='e'||key==='enter')interact();else if(key==='home')reset();
          else if(key==='c'){camera.yaw=player.getState().yaw+Math.PI;camera.pitch=.28;dirty=true;sync();}
          else{camera.distance=clamp(camera.distance*(key==='+'||key==='='?.9:1.1),5.4,15);dirty=true;sync();}
        }
        return;
      }
      if(['e','enter'].includes(key)){e.preventDefault();if(!e.repeat)interact();return;}
      if(!['arrowleft','arrowright','arrowup','arrowdown','+','=','-','_','home'].includes(key))return;e.preventDefault();manual();
      if(key==='home'){reset();return;}if(key==='arrowleft')camera.yaw-=.10;if(key==='arrowright')camera.yaw+=.10;if(key==='arrowup')camera.pitch=clamp(camera.pitch+.055,.065,.92);if(key==='arrowdown')camera.pitch=clamp(camera.pitch-.055,.065,.92);
      if(key==='+'||key==='=')camera.distance=clamp(camera.distance*.90,5.2,66);if(key==='-'||key==='_')camera.distance=clamp(camera.distance*1.10,5.2,66);dirty=true;notify();sync();
    });
    listen(win,'keyup',e=>{if(!playable)return;const key=String(e.key||'').toLowerCase();if(keys.delete(key)){movement();}});
    function reset(){if(!alive)return;if(playable){clearMovement();player.reset();location='flock';transition=null;arriving=false;setCamera(followView());draw();sync();return;}location=null;arriving=false;go(overview(),1.55);}
    listen(doc,'visibilitychange',()=>{if(doc.hidden){pointers.clear();pinch=0;pointerStart=null;clearMovement();}sync();});
    listen(win,'blur',()=>{pointers.clear();pinch=0;pointerStart=null;clearMovement();});
    listen(win,'resize',()=>{if(!alive)return;size();sync();});
    const motionChanged=e=>{reduced=!!e.matches;motion=requestedMotion&&!reduced;if(reduced){if(transition){const to=transition.to;transition=null;arriving=false;setCamera(to);}dirty=true;draw();}sync();};
    if(media?.addEventListener)listen(media,'change',motionChanged);else if(media?.addListener){media.addListener(motionChanged);events.push(()=>media.removeListener(motionChanged));}
    if(win.ResizeObserver){resizeObserver=new win.ResizeObserver(()=>{if(alive){size();sync();}});resizeObserver.observe(canvas);}
    if(win.IntersectionObserver){intersectionObserver=new win.IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);sync();},{threshold:0});intersectionObserver.observe(canvas);}
    const api={
      focus,interact,
      setPlaying(value){if(!alive||!playable)return;const next=!!value;if(playing===next)return;playing=next;clearMovement();player.setEnabled(next);dirty=true;sync();},
      setMove(right,forward){if(!alive||!playable)return;touchMove.right=Number.isFinite(right)?clamp(right,-1,1):0;touchMove.forward=Number.isFinite(forward)?clamp(forward,-1,1):0;movement();},
      jump(){return action('jump');},baa(){return action('baa');},
      setProgress(ids){if(!alive||!playable)return;player.setCompleted(ids);dirty=true;notify();sync();},
      setSound,
      setMotion(value){if(!alive)return;requestedMotion=!!value;const next=requestedMotion&&!reduced;if(next===motion)return;motion=next;dirty=true;sync();},
      flyIn(){if(!alive)return;location=playable?'flock':null;if(reduced){arriving=false;setCamera(overview());draw();sync();return;}arriving=true;setCamera({target:[0,1,-7],yaw:-.43,pitch:.86,distance:102});go(overview(),3.7);draw();},
      skipArrival,reset,
      capture(){if(!alive)return null;if(dirty)draw();const out=doc.createElement('canvas');out.width=canvas.width;out.height=canvas.height;const copy=out.getContext('2d');if(!copy)return null;copy.drawImage(canvas,0,0);return out;},
      getState(){return {...status(),motion,reducedMotion:reduced,ready,alive,materialsReady:!!materials?.ready,camera:cameraCopy(),...(playable?{playing,player:player.getState()}: {})};},
      destroy(){if(!alive)return;alive=false;audioRevision++;audioOutput(0);playing=false;clearMovement();player?.setEnabled(false);if(frame)win.cancelAnimationFrame(frame);frame=0;events.forEach(off=>off());resizeObserver?.disconnect();intersectionObserver?.disconnect();pointers.clear();materials?.dispose();glRenderer?.destroy();glRenderer=null;projectedStatic=null;if(audioContext&&audioContext.state!=='closed')audioContext.close?.().catch(()=>{});audioMaster?.disconnect();audioMaster=null;audioContext=null;if(canvas.style){canvas.style.touchAction=oldTouch||'';canvas.style.cursor=oldCursor||'';}if(oldTab===null||oldTab===undefined)canvas.removeAttribute?.('tabindex');}
    };
    draw();sync();return api;
  }
  if(typeof window!=='undefined')window.ParallaxSheepleScene={create};
  if(typeof module!=='undefined'&&module.exports)module.exports={create,ground,terrainHeight,cameraBasis,projection,LOCATIONS,FLOCK,sheepPose,playerPose};
})();
