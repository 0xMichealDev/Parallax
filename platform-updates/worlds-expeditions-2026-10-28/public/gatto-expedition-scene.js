/* GATTO's imagined Italian piazza. Local 3D geometry, WebGL + perspective Canvas fallback. */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
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
  const FOG = [.069, .071, .094];
  const FUR = [.105, .109, .12], PAW = [.069, .073, .082], STONE = [.72, .65, .51];
  const GOLD = [.99, .72, .29], WARM = [1.0, .73, .34];
  const MATERIAL = {plain:0,fur:1,wool:2,stone:3,regolith:4,metal:5,glass:6,leather:7,solar:8};
  const LANTERNS = [[4.9,3.38,-2],[-8.2,3.38,1.1],[8.8,3.38,3.6],[-8.2,3.38,-6.2]];
  const TERRAIN_STEP = 3;
  const LOCATIONS = {
    cats: { target: [-1, 1.25, 4.7], yaw: -.13, pitch: .18, distance: 12.8, reach: 18, radius: 4.6 },
    lanterns: { target: [4.9, 2.0, -2.0], yaw: .17, pitch: .22, distance: 13.8, reach: 19.5, radius: 2.5 },
    sardine: { target: [9.3, 3.85, -7.4], yaw: .34, pitch: .32, distance: 10.4, reach: 15, radius: 1.2 }
  };
  const CATS = [
    {x:-1.1,z:5.2,yaw:-.10,scale:1.48,phase:.1,gx:-1.1,gz:5.2},
    {x:-4.1,z:2.4,yaw:.28,scale:1.13,phase:1.7,gx:-4.0,gz:3.5},
    {x:2.7,z:4.8,yaw:-.39,scale:1.10,phase:3.3,gx:2.5,gz:4.0},
    {x:4.4,z:1.5,yaw:-.55,scale:.92,phase:5.1,gx:3.2,gz:6.0},
    {x:-5.8,z:6.3,yaw:.20,scale:.87,phase:2.4,gx:-4.7,gz:6.2},
    {x:.4,z:.8,yaw:.15,scale:1.02,phase:4.6,gx:.5,gz:2.2},
    {x:-3.1,z:-1.3,yaw:.60,scale:1.0,phase:.9,gx:-2.5,gz:1.8},
    {x:5.8,z:-3.7,yaw:-.50,scale:.92,phase:3.9,gx:1.1,gz:7.6},
    {x:-6.4,z:-4.6,yaw:.48,scale:1.07,phase:5.8,gx:-2.6,gz:7.8}
  ];

  function noise(x, z) {
    const a = Math.floor(x), b = Math.floor(z), u = smooth(x - a), v = smooth(z - b);
    return mix(mix(hash(a, b), hash(a + 1, b), u), mix(hash(a, b + 1), hash(a + 1, b + 1), u), v);
  }
  function ground(x, z) {
    // The piazza is level, so every paw sits on the same paving used by the renderer.
    const edge = smooth(clamp((Math.hypot(x, z + 3) - 22) / 23, 0, 1));
    return edge * ((noise(x * .12 + 8, z * .12 + 1) - .5) * 1.7 + .23 * Math.sin(x * .13));
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
  function catPose(p, t, gathered = 0) {
    const x=mix(p.x,p.gx,gathered),z=mix(p.z,p.gz,gathered);
    const walking=gathered>0&&gathered<1,step=walking?Math.sin(t*8+p.phase):0;
    const yaw=p.yaw+Math.sin(t*.27+p.phase)*.018;
    const bob=walking?Math.abs(step)*.025:Math.sin(t*.8+p.phase)*.007;
    const root=matrix([x,terrainHeight(x,z)+bob*p.scale,z],yaw,0,0,p.scale);
    const stance=matrix([x,0,z],yaw,0,0,p.scale),legs=[];
    for(let j=0;j<4;j++){
      const lx=j%2===0?-.22:.22,lz=j<2?.42:-.40;
      const hip=point([lx,.90,lz],root),foot=point([lx,0,lz],stance);
      const lift=walking?Math.max(0,Math.sin(t*8+p.phase+(j===0||j===3?0:Math.PI)))*.12*p.scale:0;
      foot[1]=terrainHeight(foot[0],foot[2])+lift;
      const ankle=[foot[0],foot[1]+.10*p.scale,foot[2]];
      legs.push({hip,ankle,foot,legMatrix:segmentMatrix(hip,ankle),pawMatrix:matrix(foot,yaw,0,0,p.scale)});
    }
    const tail=multiply(root,matrix([0,1.05,-.52],Math.sin(t*.85+p.phase)*.16,0,Math.sin(t*.6+p.phase)*.035));
    return {root,legs,tail,x,z,scale:p.scale};
  }

  // Each mesh contains positions, smooth normals, colour, alpha, emission and material. Both renderers
  // consume these exact triangles; Canvas is a perspective raster fallback, not a sprite scene.
  function builder(initialMaterial = MATERIAL.plain) {
    const vertices = [], triangles = [];
    let paintGroup = null, material = initialMaterial;
    function tri(a, b, c, color, normals, emission = 0, twoSided = false) {
      const face = unit(cross(sub(b, a), sub(c, a)));
      if (length(cross(sub(b, a), sub(c, a))) < .000001) return;
      normals = normals || [face, face, face];
      const colors = Array.isArray(color[0]) ? color : [color, color, color];
      for (let i = 0; i < 3; i++) vertices.push(...[a, b, c][i], ...normals[i], colors[i][0], colors[i][1], colors[i][2], colors[i][3] ?? 1, emission, material);
      triangles.push({ a, b, c, center:[(a[0]+b[0]+c[0])/3,(a[1]+b[1]+c[1])/3,(a[2]+b[2]+c[2])/3],n: unit(normals.reduce((n, v) => n.map((x, i) => x + v[i]), [0, 0, 0])),
        color: [0, 1, 2, 3].map(i => colors.reduce((n, v) => n + (v[i] ?? 1), 0) / 3), emission, material, twoSided,
        paint:paintGroup?{anchor:paintGroup.anchor,order:paintGroup.order++}:null });
    }
    function quad(a, b, c, d, color, n, emission = 0, twoSided = false) { tri(a, b, c, color, n ? [n, n, n] : null, emission, twoSided); tri(a, c, d, color, n ? [n, n, n] : null, emission, twoSided); }
    function finish() { return { vertices: new Float32Array(vertices), triangles }; }
    function setPaintGroup(value){const previous=paintGroup;paintGroup=value;return previous;}
    function setMaterial(value){const previous=material;material=value;return previous;}
    return { tri, quad, finish, setPaintGroup, getPaintGroup:()=>paintGroup, setMaterial };
  }
  function painted(b,material,draw){const previous=b.setMaterial(material);draw();b.setMaterial(previous);}
  function sphere(b, center, radii, color, sides = 10, rows = 7, emission = 0, rocky = 0) {
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
    const b=builder(MATERIAL.stone),step=TERRAIN_STEP;
    function vertex(x,z){
      const v=noise(x*.27,z*.27),piazza=1-smooth(clamp((Math.hypot(x/1.1,(z+3)*.85)-13)/10,0,1));
      return {p:[x,ground(x,z),z],n:groundNormal(x,z),c:[mix(.18,.56,piazza)+v*.035,mix(.18,.51,piazza)+v*.03,mix(.22,.42,piazza)+v*.03]};
    }
    for(let z=-66;z<42;z+=step)for(let x=-60;x<60;x+=step){const a=vertex(x,z),c=vertex(x+step,z),d=vertex(x+step,z+step),e=vertex(x,z+step);b.tri(a.p,e.p,c.p,[a.c,e.c,c.c],[a.n,e.n,c.n]);b.tri(c.p,e.p,d.p,[c.c,e.c,d.c],[c.n,e.n,d.n]);}
    return b.finish();
  }
  function loft(b,sections,color,sides=16){
    const sample=(i,j)=>{
      const section=sections[i],before=sections[Math.max(0,i-1)],after=sections[Math.min(sections.length-1,i+1)],angle=j/sides*TAU,c=Math.cos(angle),s=Math.sin(angle);
      const tangent=[-section[1]*s,0,section[2]*c],along=[(after[1]-before[1])*c,after[0]-before[0],after[3]-before[3]+(after[2]-before[2])*s];
      return {p:[section[1]*c,section[0],section[3]+section[2]*s],n:unit(cross(along,tangent))};
    };
    for(let i=0;i<sections.length-1;i++)for(let j=0;j<sides;j++){
      const a=sample(i,j),c=sample(i,j+1),d=sample(i+1,j+1),e=sample(i+1,j);
      b.tri(a.p,e.p,c.p,color,[a.n,e.n,c.n]);b.tri(c.p,e.p,d.p,color,[c.n,e.n,d.n]);
    }
  }
  function ear(b,x){
    const side=Math.sign(x),outer=FUR.map(v=>v*.95),inner=[.15,.115,.12];
    const edge=[[x-.12,1.63,.63],[x+.12,1.64,.62],[x+side*.10,1.85,.55],[x+side*.065,2.025,.49],[x-side*.055,1.86,.51]];
    const center=[x,1.77,.60],back=[x,1.76,.42];
    for(let i=0;i<edge.length;i++){
      const a=edge[i],c=edge[(i+1)%edge.length],frontNormal=unit([side*.14,.05,1]);
      b.tri(center,a,c,outer,[frontNormal,unit([a[0]-x,.08,.65]),unit([c[0]-x,.08,.65])],0,true);
      b.tri(back,c,a,outer,null,0,true);
    }
    painted(b,MATERIAL.leather,()=>b.tri([x-.069,1.695,.646],[x+.071,1.695,.640],[x+side*.046,1.924,.544],inner,null,0,true));
    // Short rim tufts preserve the pointed silhouette without dense hair geometry.
    for(const [dx,y,z]of [[-.09,1.74,.61],[.09,1.74,.60],[side*.065,1.99,.49]])cylinder(b,[x+dx,y,z],[x+dx+side*.013,y+.047,z-.007],.010,.0015,outer,4);
  }
  function catEye(b,x){
    const side=Math.sign(x),center=[x,1.505,.925],count=14,tilt=side*.16;
    const outline=(j,scale=1,z=.905)=>{
      const angle=j/count*TAU,u=Math.cos(angle)*.104*scale,v=Math.sin(angle)*Math.pow(Math.abs(Math.sin(angle)),.35)*.057*scale;
      return [x+u*Math.cos(tilt)-v*Math.sin(tilt),center[1]+u*Math.sin(tilt)+v*Math.cos(tilt),z];
    };
    painted(b,MATERIAL.glass,()=>{
      for(let j=0;j<count;j++){
        const a=outline(j),c=outline(j+1),shade=.85+.15*Math.sin(j*1.7),edge=[.69*shade,.40*shade,.085*shade];
        b.tri(center,a,c,[[.91,.59,.13],edge,edge],[[0,0,1],unit([(a[0]-x)*3,(a[1]-center[1])*4,1]),unit([(c[0]-x)*3,(c[1]-center[1])*4,1])]);
      }
      sphere(b,[x,1.505,.935],[.0115,.047,.008],[.012,.016,.018],8,6);
      sphere(b,[x-.022,1.524,.944],[.007,.009,.004],[.84,.87,.85],6,4,.06);
    });
    for(let j=0;j<count;j++)b.quad(outline(j,1.13,.906),outline(j+1,1.13,.906),outline(j+1,1,.909),outline(j,1,.909),[.043,.047,.052],[0,0,1]);
  }
  function catMesh(){
    const b=builder(MATERIAL.fur);
    // A connected chest, waist and tapered head replace the round toy-like body.
    sphere(b,[0,1.00,-.02],[.315,.385,.64],FUR,14,9);
    sphere(b,[0,1.10,.37],[.265,.365,.30],FUR,12,8);
    cylinder(b,[0,1.12,.38],[0,1.43,.53],.205,.215,FUR,12);
    loft(b,[[1.215,.07,.085,.65],[1.28,.18,.17,.65],[1.37,.25,.235,.65],[1.49,.292,.272,.63],[1.60,.275,.24,.60],[1.69,.225,.185,.57],[1.75,.105,.095,.55],[1.77,.015,.015,.54]],FUR,18);
    ear(b,-.205);ear(b,.205);
    for(const x of [-.066,.066])sphere(b,[x,1.335,.897],[.098,.075,.079],[.12,.121,.129],10,6);
    sphere(b,[0,1.285,.868],[.115,.061,.084],FUR,10,5);
    for(const x of [-.137,.137]){
      catEye(b,x);
      for(let j=0;j<3;j++)cylinder(b,[Math.sign(x)*.09,1.342-j*.019,.970],[Math.sign(x)*(.41+j*.026),1.342+(j-1)*.052,.936],.0026,.0008,[.40,.395,.37],4);
    }
    painted(b,MATERIAL.leather,()=>{
      b.tri([-.043,1.385,.968],[.043,1.385,.968],[0,1.345,.988],[.066,.055,.057],[[0,.3,1],[0,.3,1],[0,0,1]],0,true);
      cylinder(b,[0,1.347,.978],[0,1.31,.968],.005,.004,[.023,.025,.028],5);
      for(const side of [-1,1])cylinder(b,[0,1.312,.968],[side*.045,1.305,.96],.003,.002,[.026,.027,.03],5);
    });
    painted(b,MATERIAL.metal,()=>{
      torus(b,[0,1.235,.43],[0,.98,.20],.252,.019,[.63,.43,.16],20,5);
      sphere(b,[0,1.208,.682],[.042,.055,.017],[.82,.60,.24],8,5);
    });
    return b.finish();
  }
  function legMesh(){
    const b=builder(MATERIAL.fur);
    // Fuller upper limbs taper into a wrist; endpoints retain the existing rig.
    loft(b,[[-1,.078,.074,0],[-.76,.080,.086,.006],[-.43,.103,.100,.018],[0,.125,.117,0]],FUR,10);
    return b.finish();
  }
  function pawMesh(){const b=builder(MATERIAL.fur);sphere(b,[0,.080,.036],[.111,.080,.169],PAW,11,6);return b.finish();}
  function tailMesh(){
    const b=builder(MATERIAL.fur),points=[[0,0,0],[0,.18,-.22],[.045,.42,-.39],[.10,.68,-.48],[.16,.93,-.45],[.25,1.10,-.34],[.34,1.13,-.20]];
    for(let i=0;i<points.length-1;i++)cylinder(b,points[i],points[i+1],.072-i*.006,.066-i*.006,FUR,9);
    sphere(b,points.at(-1),[.033,.033,.033],FUR,8,5);return b.finish();
  }
  function arch(b,x,y,z,width,height,color){
    const r=width/2,spring=y+height-r,trim=.16;
    painted(b,MATERIAL.leather,()=>box(b,[x,y+(height-r)/2,z-.022],[width,height-r,.045],[.065,.064,.074]));
    for(let i=0;i<14;i++){const a=i/14*Math.PI,c=(i+1)/14*Math.PI;
      b.tri([x,spring,z],[x+Math.cos(a)*r,spring+Math.sin(a)*r,z],[x+Math.cos(c)*r,spring+Math.sin(c)*r,z],[.065,.064,.074],null,0,true);
      b.quad([x+Math.cos(a)*r,spring+Math.sin(a)*r,z+.06],[x+Math.cos(a)*(r+trim),spring+Math.sin(a)*(r+trim),z+.06],[x+Math.cos(c)*(r+trim),spring+Math.sin(c)*(r+trim),z+.06],[x+Math.cos(c)*r,spring+Math.sin(c)*r,z+.06],color,[0,0,1]);
    }
    for(const side of [-1,1])box(b,[x+side*(r+trim/2),y+(height-r)/2,z+.035],[trim,height-r,.13],color);
  }
  const GLYPHS={
    G:[[[.84,.87],[.65,1],[.19,1],[0,.8],[0,.2],[.19,0],[.84,0],[.84,.45],[.48,.45]]],
    A:[[[0,0],[.42,1],[.84,0]],[[.18,.40],[.67,.40]]],
    T:[[[0,1],[.84,1]],[[.42,1],[.42,0]]],
    O:[[[.20,0],[0,.22],[0,.78],[.20,1],[.64,1],[.84,.78],[.84,.22],[.64,0],[.20,0]]],
    R:[[[0,0],[0,1],[.61,1],[.84,.82],[.84,.61],[.61,.48],[0,.48]],[[.45,.48],[.86,0]]],
    I:[[[.1,1],[.74,1]],[[.42,1],[.42,0]],[[.1,0],[.74,0]]]
  };
  function lettering(b,label,cx,y,z,size,color){
    const spacing=size*1.16,start=cx-(label.length-1)*spacing/2-size*.42;
    const material=b.setMaterial(MATERIAL.metal);
    for(let i=0;i<label.length;i++)for(const stroke of GLYPHS[label[i]]||[])for(let j=0;j<stroke.length-1;j++){
      const p=stroke[j],q=stroke[j+1];cylinder(b,[start+i*spacing+p[0]*size,y+p[1]*size,z],[start+i*spacing+q[0]*size,y+q[1]*size,z],size*.035,size*.035,color,5,.12);
    }
    b.setMaterial(material);
  }
  function roof(b,x,y,z,w,d){
    const ridge=y+Math.min(1.55,w*.26),red=[.48,.245,.17],edge=[.56,.29,.20];
    const a=[x-w/2-.18,y,z-d/2-.18],c=[x+w/2+.18,y,z-d/2-.18],e=[x-w/2-.18,y,z+d/2+.18],f=[x+w/2+.18,y,z+d/2+.18],p=[x,ridge,z-d/2-.18],q=[x,ridge,z+d/2+.18];
    b.quad(a,e,q,p,red);b.quad(p,q,f,c,edge);b.tri(e,f,q,[.63,.52,.38]);b.tri(c,a,p,[.63,.52,.38]);
    cylinder(b,p,q,.075,.075,[.62,.33,.22],7);
    for(let i=1;i<6;i++)for(const side of [-1,1]){
      const t=i/6,xx=x+side*(w/2+.18)*t,yy=mix(ridge,y,t)+.014;
      cylinder(b,[xx,yy,z-d/2-.20],[xx,yy,z+d/2+.20],.021,.021,[.31,.17,.13],5);
    }
    for(let i=1;i<5;i++)for(const side of [-1,1]){
      const zz=z-d/2+i*d/5;
      cylinder(b,[x,ridge+.025,zz],[x+side*(w/2+.18),y+.025,zz],.018,.018,[.40,.205,.145],5);
    }
  }
  function windowMesh(b,glow,x,y,z,w=.64,h=1.0){
    box(b,[x,y,z],[w+.15,h+.16,.11],[.73,.66,.52]);
    painted(b,MATERIAL.glass,()=>box(b,[x,y,z+.061],[w,h,.026],[.095,.12,.15]));
    box(glow,[x,y,z+.077],[w*.86,h*.87,.014],WARM,0,.92);
    painted(b,MATERIAL.leather,()=>{
      for(const sx of [-1,1])box(b,[x+sx*(w*.69),y,z+.07],[w*.28,h+.07,.055],[.11,.22,.22]);
      box(b,[x,y,z+.09],[.036,h,.031],[.25,.23,.19]);box(b,[x,y,z+.09],[w,.035,.031],[.25,.23,.19]);
    });
    box(b,[x,y-h*.55,z+.14],[w+.25,.09,.29],[.78,.72,.58]);
  }
  function building(b,glow,x,z,w,d,h,color,flat=false){
    // Canvas has no depth buffer: keep a facade and its applied details together.
    // Otherwise a large wall triangle can paint over the small windows in front of it.
    // The shared sequence also places emissive panes behind their crossbars.
    const group=b.getPaintGroup()||{anchor:[x,h/2,z],order:0};
    const previous=b.setPaintGroup(group),previousGlow=glow.setPaintGroup(group);
    box(b,[x,h/2,z],[w,h,d],color);
    box(b,[x,.13,z],[w+.20,.26,d+.18],[.49,.45,.38]);
    box(b,[x,h-.07,z],[w+.20,.17,d+.20],[.83,.75,.59]);
    if(!flat)roof(b,x,h,z,w,d);
    const front=z+d/2;
    for(let row=0;row<Math.max(1,Math.floor((h-1)/1.7));row++)for(let col=0;col<Math.max(2,Math.floor(w/1.55));col++){
      const cols=Math.max(2,Math.floor(w/1.55));windowMesh(b,glow,x+(col-(cols-1)/2)*1.45,1.45+row*1.74,front+.035);
    }
    b.setPaintGroup(previous);glow.setPaintGroup(previousGlow);return front;
  }
  function olive(b,x,z,scale=1){
    painted(b,MATERIAL.leather,()=>cylinder(b,[x,0,z],[x+.08,2.2*scale,z],.12*scale,.075*scale,[.30,.25,.19],7));
    painted(b,MATERIAL.plain,()=>{for(const [dx,dy,dz]of [[-.5,2.0,0],[.45,2.2,.1],[0,2.5,-.25],[-.1,2.45,.35]])sphere(b,[x+dx*scale,dy*scale,z+dz*scale],[.65*scale,.45*scale,.58*scale],(i,j)=>{const leaf=.82+hash(i*14,j*14)*.30;return [.25*leaf,.34*leaf,.25*leaf];},10,6,0,.10);});
  }
  function scenery(){
    const b=builder(MATERIAL.stone),s=builder(),sky=builder(),glow=builder(),fish=builder(MATERIAL.metal),pulse=builder(),lights=[];
    // Warm inset paving with fine seams reads as a city square against the obsidian landscape.
    for(let z=-14;z<=10;z+=1.05)for(let x=-12;x<=12;x+=1.08){
      if(Math.hypot(x/1.1,z+2)>14)continue;
      const xx=x+(Math.round(z/1.05)%2)*.40,v=hash(x,z)*.055,col=[.55+v,.50+v,.41+v];
      b.quad([xx,.008,z],[xx+.99,.008,z],[xx+.99,.008,z+.96],[xx,.008,z+.96],col,[0,1,0]);
    }
    painted(b,MATERIAL.metal,()=>{for(const radius of [5.7,5.84])ring(b,[-.4,.017,1.8],[0,1,0],radius,radius+.035,[.70,.55,.30],72,.05);});
    // Layered town buildings, not a painted backdrop. All windows share the lantern switch.
    for(const row of [[-13,-16,4.8,4.8,7.0,[.68,.57,.43]],[-8.2,-18,4.9,5.0,8.5,[.80,.68,.50]],[-2.4,-19,5.3,4.3,7.1,[.68,.63,.51]],[3.3,-19,4.7,4.9,9.0,[.80,.69,.54]],[8.2,-18,4.9,4.5,6.9,[.64,.58,.48]],[13,-15,4.8,4.7,8.3,[.78,.65,.48]],[-12.0,-9,4.6,4.2,5.0,[.68,.67,.55]]])building(b,glow,...row);
    // Trattoria Gatto: central cream facade, twin arched doors, real gold lettering and a striped canopy.
    const trattoriaPaint={anchor:[-2.6,2.85,-10.7],order:0};b.setPaintGroup(trattoriaPaint);glow.setPaintGroup(trattoriaPaint);
    const front=building(b,glow,-2.6,-10.7,8.3,4.5,5.7,[.84,.76,.60]);
    for(const x of [-4.85,-.35])arch(b,x,.09,front+.11,1.55,2.75,[.91,.83,.66]);
    box(b,[-2.6,3.65,front+.18],[5.30,1.15,.18],[.11,.14,.15]);
    box(b,[-2.6,3.65,front+.28],[5.42,1.25,.06],[.64,.47,.22]);
    box(b,[-2.6,3.65,front+.323],[5.18,1.02,.04],[.085,.10,.12]);
    lettering(b,'TRATTORIA',-2.6,3.80,front+.37,.24,[.88,.73,.43]);
    lettering(b,'GATTO',-2.6,3.19,front+.37,.47,[.99,.81,.44]);
    for(let i=0;i<14;i++){
      const xx=-6.6+i*.58,col=i%2?[.85,.80,.65]:[.20,.32,.29];
      const z0=front+.12,z1=front+1.44;
      painted(b,MATERIAL.leather,()=>{
        b.quad([xx,3.03,z0],[xx+.57,3.03,z0],[xx+.57,2.67,z1],[xx,2.67,z1],col,null,0,true);
        box(b,[xx+.285,2.59,z1],[.57,.17,.055],col);
      });
    }
    b.setPaintGroup(null);glow.setPaintGroup(null);
    // Outside tables and espresso cups make the landmark feel lived in.
    for(const x of [-5.7,.7]){
      painted(b,MATERIAL.metal,()=>cylinder(b,[x,.03,-5.6],[x,.93,-5.6],.048,.048,[.18,.18,.18],7));
      painted(b,MATERIAL.leather,()=>cylinder(b,[x,.93,-5.6],[x,1.01,-5.6],.65,.65,[.59,.42,.27],18));
      for(const side of [-1,1]){
        painted(b,MATERIAL.metal,()=>cylinder(b,[x+side*.95,0,-5.6],[x+side*.95,.57,-5.6],.05,.05,[.18,.18,.18],6));
        painted(b,MATERIAL.leather,()=>sphere(b,[x+side*.95,.58,-5.6],[.28,.055,.28],[.32,.23,.17],9,4));
      }
      for(const dx of [-.18,.18]){cylinder(b,[x+dx,1.02,-5.6],[x+dx,1.17,-5.6],.066,.078,[.94,.88,.74],9);torus(b,[x+dx+.08,1.1,-5.6],[0,0,1],.048,.014,[.94,.88,.74],9,4);}
    }
    // A slender campanile provides an unmistakable Italian skyline.
    const tx=5.1,tz=-12.3;
    const towerPaint={anchor:[tx,5.3,tz],order:0};b.setPaintGroup(towerPaint);
    box(b,[tx,5.3,tz],[2.1,10.6,2.25],[.76,.67,.52]);
    box(b,[tx,10.15,tz],[2.43,.24,2.55],[.89,.78,.59]);
    for(const xx of [tx-.48,tx+.48])arch(b,xx,7.9,tz+1.16,.61,1.75,[.88,.77,.59]);
    roof(b,tx,10.55,tz,2.5,2.6);
    cylinder(b,[tx,11.3,tz],[tx,12.3,tz],.03,.03,GOLD,6);
    box(b,[tx,11.99,tz],[.57,.045,.045],GOLD);
    cylinder(b,[tx,6.5,tz+1.15],[tx,6.5,tz+1.22],.58,.58,[.94,.86,.65],28,.2);
    cylinder(b,[tx,6.5,tz+1.235],[tx+.25,6.75,tz+1.235],.024,.024,[.19,.17,.15],6);
    cylinder(b,[tx,6.5,tz+1.24],[tx-.22,6.5,tz+1.24],.024,.024,[.19,.17,.15],6);
    b.setPaintGroup(null);
    // Rooftop terrace: the sardine hides in a little fish crate beside an olive tree.
    building(b,glow,9.6,-9.0,4.8,5.2,3.05,[.78,.66,.50],true);
    for(const x of [7.2,12.0])box(b,[x,3.28,-9.0],[.15,.47,5.2],[.86,.76,.57]);
    box(b,[9.6,3.28,-11.6],[4.8,.47,.15],[.86,.76,.57]);
    painted(b,MATERIAL.leather,()=>{
      box(b,[9.3,3.20,-7.4],[1.58,.30,.79],[.33,.23,.15]);
      for(const xx of [-.72,.72])box(b,[9.3+xx,3.42,-7.4],[.07,.42,.89],[.56,.39,.23]);
      for(const zz of [-.40,.40])box(b,[9.3,3.35,-7.4+zz],[1.54,.11,.07],[.56,.39,.23]);
    });
    cylinder(b,[11,3.08,-10],[11,3.65,-10],.38,.49,[.51,.27,.17],12);
    cylinder(b,[11,3.55,-10],[11,5.05,-10],.06,.035,[.29,.23,.17],7);
    sphere(b,[11,4.88,-10],[.69,.60,.63],[.27,.35,.24],9,6,0,.08);
    // Lamps, overhead festoon cable and architectural light are switched together.
    const metal=[.12,.14,.15];
    painted(b,MATERIAL.metal,()=>{for(const [x,,z]of LANTERNS){
      cylinder(b,[x,0,z],[x,3.15,z],.075,.045,metal,8);cylinder(b,[x,.03,z],[x,.20,z],.22,.17,metal,10);
      box(b,[x,3.08,z],[.48,.06,.48],metal);box(b,[x,3.70,z],[.48,.06,.48],metal);
      box(glow,[x,3.38,z],[.38,.50,.38],WARM,0,1);
      for(const dx of [-.23,.23])for(const dz of [-.23,.23])box(b,[x+dx,3.38,z+dz],[.03,.66,.03],metal);
      cylinder(b,[x,3.72,z],[x,3.95,z],.34,.025,metal,4);
      lights.push({p:[x,3.38,z],color:[255,194,102],radius:.80,kind:'lanterns'});
    }});
    for(let i=0;i<16;i++){
      const x=-9+i*1.2,next=x+1.2,y=5.25-.70*Math.sin(i/15*Math.PI),ny=5.25-.70*Math.sin((i+1)/15*Math.PI),z=-5.1;
      if(i<15)cylinder(b,[x,y,z],[next,ny,z],.012,.012,metal,5);
      cylinder(b,[x,y,z],[x,y-.18,z],.014,.014,metal,5);
      sphere(glow,[x,y-.25,z],[.085,.12,.085],WARM,7,5,1);
      lights.push({p:[x,y-.25,z],color:[255,198,117],radius:.28,kind:'lanterns'});
    }
    // A fountain and olive trees frame the gathering without obscuring the black cats.
    const fx=-.7,fz=-3.4;
    cylinder(b,[fx,.01,fz],[fx,.27,fz],1.25,1.25,[.53,.48,.39],26);
    torus(b,[fx,.30,fz],[0,1,0],1.18,.13,[.77,.69,.54],28,6);
    painted(b,MATERIAL.glass,()=>cylinder(b,[fx,.23,fz],[fx,.25,fz],1.04,1.04,[.20,.30,.32],26,.03));
    cylinder(b,[fx,.25,fz],[fx,1.28,fz],.19,.13,[.73,.65,.50],12);
    sphere(b,[fx,1.35,fz],[.48,.10,.48],[.73,.65,.50],16,6);
    sphere(glow,[fx,1.49,fz],[.10,.13,.10],GOLD,9,6,.8);
    for(const [x,z,scale]of [[-10,7,1.05],[11,7,1.2],[-10,-4,1.1],[13,-8,.9]]){cylinder(b,[x,.01,z],[x,.48,z],.52,.66,[.52,.30,.21],12);olive(b,x,z,scale);shadow(s,x,z,.95,.9,.32);}
    // Distant low hills and a gold-ringed world keep the scene grounded on GATTO's planet.
    for(const [x,z,rx,ry,rz]of [[-29,-33,15,3.5,8],[23,-34,13,3.2,8],[-38,-12,11,2.8,12],[39,-10,10,2.3,12]])sphere(b,[x,ground(x,z)-1,z],[rx,ry,rz],[.20,.22,.25],10,5,0,.28);
    const pc=[-43,26,-145];sphere(sky,pc,[10,10,10],[.17,.19,.23],26,16);
    for(const [inner,outer]of [[13.5,14.8],[16.0,16.55]])ring(sky,pc,[.19,.68,.46],inner,outer,[.76,.60,.29],96,.35);
    sphere(sky,[65,35,-212],[6,6,6],[.55,.54,.49],20,12);
    // The golden sardine is complete geometry, including fins, gills and an eye.
    sphere(fish,[0,0,0],[.60,.23,.16],GOLD,14,8,.15);
    fish.tri([-.47,0,0],[-.91,.27,.02],[-.91,-.27,.02],[.83,.51,.15],null,.2,true);
    fish.tri([-.15,.16,0],[.12,.40,0],[.28,.15,0],[.94,.62,.20],null,.2,true);
    for(const side of [-1,1]){
      painted(fish,MATERIAL.glass,()=>sphere(fish,[.38,.073,side*.145],[.048,.048,.017],[.08,.075,.06],8,5));
      cylinder(fish,[.15,-.13,side*.139],[.18,.13,side*.139],.012,.012,[.67,.41,.12],5);
      for(let i=0;i<4;i++)cylinder(fish,[-.28+i*.11,-.12,side*.145],[-.28+i*.11,.12,side*.145],.006,.006,[.93,.75,.37],4,.2);
    }
    ring(pulse,[0,0,0],[0,1,0],.97,1,[.98,.73,.30,.32],48,.9);
    const cb=builder();shadow(cb,0,0,.52,.86,.40);
    return {props:b.finish(),shadows:s.finish(),sky:sky.finish(),glow:glow.finish(),fish:fish.finish(),pulse:pulse.finish(),catShadow:cb.finish(),lights,fishBase:[9.3,3.69,-7.4]};
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
  function lanternLight(kind,albedo,p,n,view,out=[0,0,0]){
    out[0]=out[1]=out[2]=0;
    const strength=kind===MATERIAL.glass?.23:kind===MATERIAL.metal?.16:.012,exponent=kind===MATERIAL.glass?64:kind===MATERIAL.metal?36:10;
    for(const lamp of LANTERNS){
      const dx=lamp[0]-p[0],dy=lamp[1]-p[1],dz=lamp[2]-p[2],distance2=dx*dx+dy*dy+dz*dz,inverse=1/(Math.sqrt(distance2)||1);
      const lx=dx*inverse,ly=dy*inverse,lz=dz*inverse,hx=lx+view[0],hy=ly+view[1],hz=lz+view[2],halfLength=Math.hypot(hx,hy,hz)||1;
      const diffuse=Math.max(0,n[0]*lx+n[1]*ly+n[2]*lz),specular=Math.max(0,(n[0]*hx+n[1]*hy+n[2]*hz)/halfLength)**exponent*strength;
      const falloff=1/(1+distance2*.12);
      out[0]+=(albedo[0]*diffuse*1.7+specular)*falloff;
      out[1]+=(albedo[1]*diffuse*1.7+specular)*.65*falloff;
      out[2]+=(albedo[2]*diffuse*1.7+specular)*.30*falloff;
    }
    return out;
  }

  const VERTEX = `
    precision highp float;
    attribute vec3 position; attribute vec3 normal; attribute vec4 color; attribute float emission,material;
    uniform mat4 model; uniform vec3 eye,right,up,forward; uniform float lens,aspect; uniform vec2 offset;
    varying vec3 vNormal,vWorld,vLocal,vLocalNormal; varying vec4 vColor; varying float vEmission,vMaterial;
    void main(){vec3 p=(model*vec4(position,1.0)).xyz;vec3 d=p-eye;float z=dot(d,forward);
      gl_Position=vec4(dot(d,right)/(lens*aspect)+offset.x*z,dot(d,up)/lens+offset.y*z,1.000375*z-.300056,z);
      vNormal=normalize(mat3(model)*normal);vWorld=p;vLocal=position;vLocalNormal=normal;vColor=color;vEmission=emission;vMaterial=material;}`;
  const FALLBACK_MATERIAL = `
    vec3 expeditionAlbedo(float kind,vec3 p,vec3 n,vec3 base){return base;}
    vec3 expeditionShade(float kind,vec3 albedo,vec3 normal,vec3 view,vec3 direction){
      float light=max(0.,dot(normal,direction)),hemi=.29+.12*max(0.,normal.y),rim=pow(1.-abs(dot(normal,view)),3.)*.16;
      return albedo*(hemi*vec3(.92,.94,1.)+light*vec3(1.,.91,.75)*.84)+rim*vec3(.23,.20,.15);
    }`;
  const FRAGMENT = `
    precision highp float;
    uniform vec3 eye;uniform float fog,opacity,lanternPower;
    varying vec3 vNormal,vWorld,vLocal,vLocalNormal;varying vec4 vColor;varying float vEmission,vMaterial;
    __EXPEDITION_MATERIALS__
    vec3 lampLight(vec3 lamp,vec3 albedo,vec3 n,vec3 view){
      vec3 delta=lamp-vWorld,light=normalize(delta),halfway=normalize(light+view+vec3(.000001));
      float strength=vMaterial>5.5&&vMaterial<6.5?.23:vMaterial>4.5&&vMaterial<5.5?.16:.012;
      float exponent=vMaterial>5.5&&vMaterial<6.5?64.:vMaterial>4.5&&vMaterial<5.5?36.:10.;
      float diffuse=max(0.,dot(n,light)),specular=pow(max(0.,dot(n,halfway)),exponent)*strength;
      return (albedo*diffuse*1.7+specular)*vec3(1.,.65,.30)/(1.+dot(delta,delta)*.12);
    }
    void main(){vec3 n=normalize(vNormal),view=normalize(eye-vWorld),light=normalize(vec3(-.48,.82,.36));
      vec3 albedo=expeditionAlbedo(vMaterial,vLocal,normalize(vLocalNormal),vColor.rgb);
      vec3 c=expeditionShade(vMaterial,albedo,n,view,light);
      if(vMaterial>.5&&vMaterial<1.5)c+=pow(1.-max(0.,dot(n,view)),3.)*vec3(.032,.024,.014);
      if(lanternPower>.0)c+=lanternPower*(${LANTERNS.map(p=>'lampLight(vec3('+p.map(v=>v.toFixed(3)).join(',')+'),albedo,n,view)').join('+')});
      c=mix(c,albedo,clamp(vEmission,0.0,1.0));float d=length(eye-vWorld);float mist=min(.79,1.0-exp(-d*d*.000075))*fog;
      gl_FragColor=vec4(mix(c,vec3(.069,.071,.094),mist),vColor.a*opacity);}`;

  function createGL(doc,materials,materialModule) {
    const surface=doc.createElement('canvas');let gl,program;const buffers=new Map(),shaders=[];
    try{
      gl=surface.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true,preserveDrawingBuffer:true,powerPreference:'low-power'});
      if(!gl)return null;
      program=gl.createProgram();
      for(const [type,source]of [[gl.VERTEX_SHADER,VERTEX],[gl.FRAGMENT_SHADER,FRAGMENT.replace('__EXPEDITION_MATERIALS__',materialModule?.glsl||FALLBACK_MATERIAL)]]){const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error('Scene shader unavailable');gl.attachShader(program,shader);}
      gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Scene program unavailable');
      shaders.forEach(s=>gl.deleteShader(s));shaders.length=0;
      const attrs=Object.fromEntries(['position','normal','color','emission','material'].map(n=>[n,gl.getAttribLocation(program,n)]));
      const uniforms=Object.fromEntries(['model','eye','right','up','forward','lens','aspect','offset','fog','opacity','lanternPower'].map(n=>[n,gl.getUniformLocation(program,n)]));
      gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
      return {surface,gl,
        render(objects,basis,view,w,h,lit){
          if(gl.isContextLost())throw Error('Scene context lost');
          if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;}
          gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(program);
          materials?.bind(gl,program,0);gl.uniform1f(uniforms.lanternPower,lit?1:0);
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
    let reduced=!!options.reducedMotion||!!media?.matches,requestedMotion=!reduced,motion=!reduced,alive=true,visible=true,ready=false,frame=0,last=0,clock=0,lastPaint=0;
    let glRenderer=null,renderMode='canvas',location=null,arriving=false,transition=null,dirty=true,statusKey='';
    let width=1,height=1,dpr=1,view=null,basis=null,projectedStatic=null,staticKey='',interactionClock=-100,interactionID=null;
    const materialModule=win.ParallaxExpeditionMaterials,materials=materialModule?.create({document:doc,onChange(){if(!alive)return;projectedStatic=null;dirty=true;sync();}});
    glRenderer=createGL(doc,materials,materialModule);renderMode=glRenderer?'webgl':'canvas';
    const terrain=terrainMesh(),world=scenery(),cat=catMesh(),leg=legMesh(),paw=pawMesh(),tail=tailMesh(),I=identity();
    let catsGathered=false,lanternsLit=false,sardineFound=false,gatherClock=0;
    const staticObjects=[{mesh:world.sky,matrix:I,fog:false},{mesh:terrain,matrix:I},{mesh:world.shadows,matrix:I,transparent:true},{mesh:world.props,matrix:I}];
    const stars=Array.from({length:640},(_,i)=>{const y=.025+hash(i,63)*.96,a=hash(i,77)*TAU,r=Math.sqrt(1-y*y);return {p:[Math.cos(a)*r,y,Math.sin(a)*r],size:.45+hash(i,44)*1.15,alpha:.22+hash(i,21)*.64,phase:hash(i,25)*TAU};});
    const pointers=new Map(),events=[],oldTouch=canvas.style?.touchAction,oldCursor=canvas.style?.cursor,oldTab=canvas.getAttribute?.('tabindex');
    let pinch=0,pointerStart=null,dragged=false,resizeObserver=null,intersectionObserver=null;
    const camera={target:[0,2.1,-4.0],yaw:.045,pitch:.27,distance:33};
    function overview(){return {target:[0,2.1,-4.0],yaw:.045,pitch:.27,distance:width<700?42:33};}
    function listen(target,name,handler,opts){target?.addEventListener?.(name,handler,opts);events.push(()=>target?.removeEventListener?.(name,handler,opts));}
    function safeCall(name,arg){try{options[name]?.(arg);}catch(error){win.console?.error?.('GATTO scene callback:',error);}}
    function nearby(){
      if(!location||arriving||transition)return null;const p=LOCATIONS[location];
      return camera.distance<=p.reach&&(length(sub(camera.target,p.target))<1.5)?location:null;
    }
    function status(){return {location,nearby:nearby(),arriving,travelling:!!transition,renderMode};}
    function notify(){const data=status(),key=JSON.stringify(data);if(key!==statusKey){statusKey=key;safeCall('onStatus',data);}}
    function setCamera(value){camera.target=value.target.slice();camera.yaw=value.yaw;camera.pitch=value.pitch;camera.distance=value.distance;dirty=true;}
    function cameraCopy(){return {target:camera.target.slice(),yaw:camera.yaw,pitch:camera.pitch,distance:camera.distance};}
    function size(){
      const rect=canvas.getBoundingClientRect?.()||{},w=Math.max(240,Math.round(rect.width||canvas.clientWidth||960)),h=Math.max(260,Math.round(rect.height||canvas.clientHeight||640));
      const ratio=Math.min(win.devicePixelRatio||1,renderMode==='webgl'?1.75:1.5,Math.sqrt(1800000/(w*h)));
      if(w===width&&h===height&&Math.abs(ratio-dpr)<.001)return;
      const wasMobile=width<700;width=w;height=h;dpr=ratio;canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);
      if(!location&&!transition&&(wasMobile!==(w<700)||!ready))setCamera(overview());
      const lens=Math.tan(26*Math.PI/180);view={w,h,lens,f:h/(2*lens),cx:w*(w<700?.50:.59),cy:h*(w<700?.40:.51)};dirty=true;projectedStatic=null;
    }
    function objects(){
      const out=staticObjects.slice(),t=clock;
      out.push({mesh:world.glow,matrix:I,opacity:lanternsLit?1:.20,transparent:true});
      const gathered=catsGathered?(reduced||!motion?1:smooth((clock-gatherClock)/2.6)):0;
      for(const p of CATS){
        const pose=catPose(p,t,gathered);
        out.push({mesh:world.catShadow,matrix:matrix([pose.x,terrainHeight(pose.x,pose.z)+.01,pose.z],p.yaw,0,0,p.scale),transparent:true});
        for(const limb of pose.legs){out.push({mesh:leg,matrix:limb.legMatrix});out.push({mesh:paw,matrix:limb.pawMatrix});}
        out.push({mesh:cat,matrix:pose.root});out.push({mesh:tail,matrix:pose.tail});
      }
      const elapsed=clock-interactionClock;
      const fishY=sardineFound?.46+Math.sin(t*1.4)*.045:0;
      out.push({mesh:world.fish,matrix:matrix([world.fishBase[0],world.fishBase[1]+fishY,world.fishBase[2]],sardineFound?t*.48:-.25)});
      if(interactionID==='lanterns'&&elapsed>=0&&elapsed<3)for(let i=0;i<2;i++){
        const f=(elapsed*.48+i*.45)%1;out.push({mesh:world.pulse,matrix:matrix([4.9,.04,-2],0,0,0,.5+f*3.5),opacity:(1-f)*.7,transparent:true});
      }
      if(sardineFound)out.push({mesh:world.pulse,matrix:matrix([9.3,3.20,-7.4],0,0,0,.7),opacity:.40,transparent:true});
      return out;
    }
    function sky(){
      const gradient=ctx.createLinearGradient(0,0,0,height);gradient.addColorStop(0,'#050810');gradient.addColorStop(.43,'#141b2c');gradient.addColorStop(.78,'#3a3331');gradient.addColorStop(1,'#24232a');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
      // Broad atmospheric light sits behind the actual projected mountain and planet geometry.
      for(const [direction,color,r]of [[[.2,.15,-1],'rgba(187,133,61,.19)',.66],[[-.65,.36,-1],'rgba(92,91,143,.13)',.48]]){
        const d=unit(direction),z=dot(d,basis.forward);if(z<=.1)continue;const x=view.cx+dot(d,basis.right)*view.f/z,y=view.cy-dot(d,basis.up)*view.f/z,radius=width*r;
        const g=ctx.createRadialGradient(x,y,0,x,y,radius);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);
      }
      for(const star of stars){const z=dot(star.p,basis.forward);if(z<=.1)continue;const x=view.cx+dot(star.p,basis.right)*view.f/z,y=view.cy-dot(star.p,basis.up)*view.f/z;if(x<-3||x>width+3||y<-3||y>height+3)continue;
        const shimmer=.86+.14*Math.sin(clock*.45+star.phase);ctx.fillStyle='rgba(200,230,239,'+(star.alpha*shimmer).toFixed(3)+')';ctx.beginPath();ctx.arc(x,y,star.size,0,TAU);ctx.fill();
        if(star.size>1.45){ctx.fillStyle='rgba(165,221,233,.11)';ctx.fillRect(x-3.5,y-.45,7,1);ctx.fillRect(x-.45,y-3.5,1,7);}
      }
      const moon=projection([-43,26,-145],basis,view);if(moon){const radius=moon.scale*24,g=ctx.createRadialGradient(moon.x,moon.y,moon.scale*9,moon.x,moon.y,radius);g.addColorStop(0,'rgba(211,169,87,.13)');g.addColorStop(1,'rgba(39,74,113,0)');ctx.fillStyle=g;ctx.fillRect(moon.x-radius,moon.y-radius,radius*2,radius*2);}
    }
    function projectObjects(list){
      const out=[],worldNormal=[0,0,0],worldView=[0,0,0],worldPoint=[0,0,0],shaded=[0,0,0],lampColor=[0,0,0];
      for(const obj of list){if(obj.opacity<=.001)continue;const m=obj.matrix;
        // Compose local-to-camera once per object. The inner loop avoids allocating world
        // vectors for every vertex, keeping the software path useful on mobile hardware.
        const scale=Math.hypot(m[0],m[1],m[2]),inverse=1/scale,dx=basis.eye[0]-m[12],dy=basis.eye[1]-m[13],dz=basis.eye[2]-m[14];
        const localEye=[(m[0]*dx+m[1]*dy+m[2]*dz)*inverse*inverse,(m[4]*dx+m[5]*dy+m[6]*dz)*inverse*inverse,(m[8]*dx+m[9]*dy+m[10]*dz)*inverse*inverse];
        const localLight=[(m[0]*LIGHT[0]+m[1]*LIGHT[1]+m[2]*LIGHT[2])*inverse,(m[4]*LIGHT[0]+m[5]*LIGHT[1]+m[6]*LIGHT[2])*inverse,(m[8]*LIGHT[0]+m[9]*LIGHT[1]+m[10]*LIGHT[2])*inverse];
        const rows=[basis.right,basis.up,basis.forward].map(v=>[v[0]*m[0]+v[1]*m[1]+v[2]*m[2],v[0]*m[4]+v[1]*m[5]+v[2]*m[6],v[0]*m[8]+v[1]*m[9]+v[2]*m[10],-dot(v,[dx,dy,dz])]);
        const rx=rows[0],ry=rows[1],rz=rows[2],opacity=obj.opacity??1;
        for(const tri of obj.mesh.triangles){
          const n=tri.n,a=tri.a,b=tri.b,c=tri.c,center=tri.center,ex=localEye[0]-center[0],ey=localEye[1]-center[1],ez=localEye[2]-center[2],facing=n[0]*ex+n[1]*ey+n[2]*ez;
          if(!tri.twoSided&&facing<=0)continue;
          const az=dot(a,rz)+rz[3],bz=dot(b,rz)+rz[3],cz=dot(c,rz)+rz[3];if(az<=.15||bz<=.15||cz<=.15)continue;
          const ax=view.cx+(dot(a,rx)+rx[3])*view.f/az,ay=view.cy-(dot(a,ry)+ry[3])*view.f/az,bx=view.cx+(dot(b,rx)+rx[3])*view.f/bz,by=view.cy-(dot(b,ry)+ry[3])*view.f/bz,cx=view.cx+(dot(c,rx)+rx[3])*view.f/cz,cy=view.cy-(dot(c,ry)+ry[3])*view.f/cz;
          if(Math.max(ax,bx,cx)<-2||Math.min(ax,bx,cx)>width+2||Math.max(ay,by,cy)<-2||Math.min(ay,by,cy)>height+2||Math.abs((bx-ax)*(cy-ay)-(by-ay)*(cx-ax))<.035)continue;
          const dist=Math.hypot(ex,ey,ez),lit=Math.max(0,dot(n,localLight)),hemi=.29+.12*Math.max(0,(m[1]*n[0]+m[5]*n[1]+m[9]*n[2])*inverse),rim=(1-Math.abs(facing/(dist||1)))**3*.16,mist=obj.fog===false?0:Math.min(.79,1-Math.exp(-dist*dist*scale*scale*.000075)),color=materials?.surface(tri)||tri.color,em=clamp(tri.emission,0,1);
          worldNormal[0]=(m[0]*n[0]+m[4]*n[1]+m[8]*n[2])*inverse;worldNormal[1]=(m[1]*n[0]+m[5]*n[1]+m[9]*n[2])*inverse;worldNormal[2]=(m[2]*n[0]+m[6]*n[1]+m[10]*n[2])*inverse;
          const viewLength=(dist||1)*scale;worldView[0]=(m[0]*ex+m[4]*ey+m[8]*ez)/viewLength;worldView[1]=(m[1]*ex+m[5]*ey+m[9]*ez)/viewLength;worldView[2]=(m[2]*ex+m[6]*ey+m[10]*ez)/viewLength;
          if(materialModule?.shade)materialModule.shade(tri.material,color,worldNormal,worldView,LIGHT,shaded);
          else{shaded[0]=color[0]*(hemi*.92+lit*.84)+rim*.23;shaded[1]=color[1]*(hemi*.94+lit*.91*.84)+rim*.20;shaded[2]=color[2]*(hemi+lit*.75*.84)+rim*.15;}
          if(tri.material===MATERIAL.fur){const edge=(1-Math.max(0,dot(worldNormal,worldView)))**3;shaded[0]+=edge*.032;shaded[1]+=edge*.024;shaded[2]+=edge*.014;}
          if(lanternsLit){
            worldPoint[0]=m[0]*center[0]+m[4]*center[1]+m[8]*center[2]+m[12];worldPoint[1]=m[1]*center[0]+m[5]*center[1]+m[9]*center[2]+m[13];worldPoint[2]=m[2]*center[0]+m[6]*center[1]+m[10]*center[2]+m[14];
            lanternLight(tri.material,color,worldPoint,worldNormal,worldView,lampColor);shaded[0]+=lampColor[0];shaded[1]+=lampColor[1];shaded[2]+=lampColor[2];
          }
          const r=Math.round(clamp(mix(mix(shaded[0],color[0],em),FOG[0],mist),0,1)*255),g=Math.round(clamp(mix(mix(shaded[1],color[1],em),FOG[1],mist),0,1)*255),bl=Math.round(clamp(mix(mix(shaded[2],color[2],em),FOG[2],mist),0,1)*255);
          const alpha=color[3]*opacity,css=alpha>.998?'rgb('+r+','+g+','+bl+')':'rgba('+r+','+g+','+bl+','+alpha.toFixed(3)+')';
          // Architectural groups form a single painter island. Native depth testing
          // still handles the unmodified geometry in WebGL; this affects Canvas only.
          // A tiny local layer step preserves facade → trim → pane → detail order,
          // including glow triangles merged from the separate dynamic mesh.
          const z=tri.paint?dot(tri.paint.anchor,rz)+rz[3]-tri.paint.order*.000001:(az+bz+cz)/3;
          out.push({ax,ay,bx,by,cx,cy,z,color:css,opaque:alpha>.98&&!obj.transparent});
        }
      }
      out.sort((a,b)=>b.z-a.z);return out;
    }
    function canvasMesh(list){
      const key=[width,height,...camera.target,camera.yaw,camera.pitch,camera.distance,Number(lanternsLit),materials?.revision||0].map(v=>Number(v).toFixed(5)).join('|');
      if(!projectedStatic||key!==staticKey){staticKey=key;projectedStatic=projectObjects(staticObjects);}
      const dynamic=projectObjects(list.slice(staticObjects.length));let a=0,b=0;
      while(a<projectedStatic.length||b<dynamic.length){
        const tri=b>=dynamic.length||(a<projectedStatic.length&&projectedStatic[a].z>=dynamic[b].z)?projectedStatic[a++]:dynamic[b++];
        ctx.fillStyle=tri.color;ctx.beginPath();
        // A fraction of a CSS pixel seals antialias cracks without changing the 3D silhouette.
        const cx=(tri.ax+tri.bx+tri.cx)/3,cy=(tri.ay+tri.by+tri.cy)/3,expand=tri.opaque?.22:0,al=Math.hypot(tri.ax-cx,tri.ay-cy)||1,bl=Math.hypot(tri.bx-cx,tri.by-cy)||1,cl=Math.hypot(tri.cx-cx,tri.cy-cy)||1;
        ctx.moveTo(tri.ax+(tri.ax-cx)/al*expand,tri.ay+(tri.ay-cy)/al*expand);ctx.lineTo(tri.bx+(tri.bx-cx)/bl*expand,tri.by+(tri.by-cy)/bl*expand);ctx.lineTo(tri.cx+(tri.cx-cx)/cl*expand,tri.cy+(tri.cy-cy)/cl*expand);
        ctx.closePath();ctx.fill();
      }
    }
    function accents(){
      for(const light of world.lights){
        const p=projection(light.p,basis,view);if(!p||p.x<-30||p.x>width+30||p.y<-30||p.y>height+30)continue;
        const r=clamp(p.scale*light.radius*(lanternsLit?1:.60),2.4,36),alpha=lanternsLit?.34:.07;
        const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);
        g.addColorStop(0,'rgba('+light.color.join(',')+','+alpha+')');g.addColorStop(.25,'rgba('+light.color.join(',')+','+(alpha*.40)+')');g.addColorStop(1,'rgba('+light.color.join(',')+',0)');ctx.fillStyle=g;ctx.fillRect(p.x-r,p.y-r,r*2,r*2);
      }
      if(sardineFound){const p=projection([9.3,4.15,-7.4],basis,view);if(p){const r=clamp(p.scale*.8,4,42),g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r);g.addColorStop(0,'rgba(255,203,102,.22)');g.addColorStop(1,'rgba(255,203,102,0)');ctx.fillStyle=g;ctx.fillRect(p.x-r,p.y-r,r*2,r*2);}}
      const vignette=ctx.createRadialGradient(width*.55,height*.43,Math.min(width,height)*.25,width*.52,height*.45,Math.max(width,height)*.80);
      vignette.addColorStop(0,'rgba(3,5,11,0)');vignette.addColorStop(1,'rgba(3,5,11,.38)');ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
    }
    function draw(){
      if(!alive)return;size();basis=cameraBasis(camera);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalAlpha=1;sky();const list=objects();
      if(glRenderer){try{glRenderer.render(list,basis,view,canvas.width,canvas.height,lanternsLit);ctx.drawImage(glRenderer.surface,0,0,width,height);}catch{glRenderer.destroy();glRenderer=null;renderMode='canvas';projectedStatic=null;size();ctx.setTransform(dpr,0,0,dpr,0,0);sky();canvasMesh(list);}}
      else canvasMesh(list);
      accents();dirty=false;notify();
      if(!ready){ready=true;Promise.resolve().then(()=>{if(alive)safeCall('onReady');});}
    }
    function canRun(){return alive&&visible&&!doc.hidden;}
    function needsFrame(){return dirty||!!transition||(motion&&!reduced);}
    function sync(){if(!canRun()){if(frame)win.cancelAnimationFrame(frame);frame=0;last=0;return;}if(!frame&&needsFrame())frame=win.requestAnimationFrame(tick);}
    function tick(now){
      frame=0;if(!canRun()){last=0;return;}
      const elapsed=last?Math.max(0,(now-last)/1000):0,dt=Math.min(.07,elapsed);last=now;
      if(motion&&!reduced)clock+=dt;
      // Travel follows elapsed time even on a slow Canvas frame. Visibility suspension resets
      // last, while the smaller simulation delta keeps cat movement gentle after a long frame.
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
    function focus(id){if(!alive||!Object.hasOwn(LOCATIONS,id))return false;location=id;arriving=false;const p=LOCATIONS[id];go({target:p.target.slice(),yaw:p.yaw,pitch:p.pitch,distance:p.distance*(width<700?1.17:1)},1.45);return true;}
    function interact(id){
      if(!alive||arriving)return false;const target=id??nearby();if(!Object.hasOwn(LOCATIONS,target)||nearby()!==target)return false;
      interactionID=target;interactionClock=clock;
      if(target==='cats'){catsGathered=true;gatherClock=clock;}
      if(target==='lanterns')lanternsLit=true;
      if(target==='sardine')sardineFound=true;
      dirty=true;draw();safeCall('onInteract',target);sync();return true;
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
      if(!previous){if(canvas.style)canvas.style.cursor=hit(p.x,p.y)?'pointer':'grab';return;}
      pointers.set(e.pointerId,p);const dx=p.x-previous.x,dy=p.y-previous.y;
      if(pointerStart&&Math.hypot(p.x-pointerStart.x,p.y-pointerStart.y)>4)dragged=true;
      if(pointers.size>1){const distance=pointerDistance();if(pinch>0&&distance>0)camera.distance=clamp(camera.distance*pinch/distance,5.2,66);pinch=distance;dragged=true;}
      else{camera.yaw-=dx*.005;camera.pitch=clamp(camera.pitch+dy*.0035,.065,.92);}
      dirty=true;notify();sync();
    }
    function pointerUp(e){
      const p=local(e),was=pointers.has(e.pointerId),click=was&&!dragged&&pointers.size===1&&pointerStart&&Date.now()-pointerStart.time<700;
      pointers.delete(e.pointerId);pinch=pointerDistance();if(!pointers.size){if(canvas.style)canvas.style.cursor='grab';pointerStart=null;}
      if(click){const id=hit(p.x,p.y);if(id){if(nearby()===id)interact(id);else focus(id);}}
    }
    function cancelPointer(e){pointers.delete(e.pointerId);pinch=pointerDistance();dragged=true;if(!pointers.size){pointerStart=null;if(canvas.style)canvas.style.cursor='grab';}}
    if(canvas.style){canvas.style.touchAction='none';canvas.style.cursor='grab';}if(oldTab===null||oldTab===undefined)canvas.setAttribute?.('tabindex','0');
    listen(canvas,'pointerdown',pointerDown);listen(canvas,'pointermove',pointerMove);listen(canvas,'pointerup',pointerUp);listen(canvas,'pointercancel',cancelPointer);listen(canvas,'lostpointercapture',cancelPointer);
    listen(canvas,'wheel',e=>{e.preventDefault();manual();camera.distance=clamp(camera.distance*Math.exp(clamp(e.deltaY,-160,160)*.0018),5.2,66);dirty=true;notify();sync();},{passive:false});
    listen(canvas,'keydown',e=>{
      if(e.ctrlKey||e.metaKey||e.altKey)return;const key=e.key.toLowerCase();if(['e','enter'].includes(key)){e.preventDefault();if(!e.repeat)interact();return;}
      if(!['arrowleft','arrowright','arrowup','arrowdown','+','=','-','_','home'].includes(key))return;e.preventDefault();manual();
      if(key==='home'){reset();return;}if(key==='arrowleft')camera.yaw-=.10;if(key==='arrowright')camera.yaw+=.10;if(key==='arrowup')camera.pitch=clamp(camera.pitch+.055,.065,.92);if(key==='arrowdown')camera.pitch=clamp(camera.pitch-.055,.065,.92);
      if(key==='+'||key==='=')camera.distance=clamp(camera.distance*.90,5.2,66);if(key==='-'||key==='_')camera.distance=clamp(camera.distance*1.10,5.2,66);dirty=true;notify();sync();
    });
    function reset(){if(!alive)return;location=null;arriving=false;go(overview(),1.55);}
    listen(doc,'visibilitychange',()=>{if(doc.hidden){pointers.clear();pinch=0;pointerStart=null;}sync();});
    listen(win,'blur',()=>{pointers.clear();pinch=0;pointerStart=null;});
    listen(win,'resize',()=>{if(!alive)return;size();sync();});
    const motionChanged=e=>{reduced=!!e.matches;motion=requestedMotion&&!reduced;if(reduced){if(transition){const to=transition.to;transition=null;arriving=false;setCamera(to);}dirty=true;draw();}sync();};
    if(media?.addEventListener)listen(media,'change',motionChanged);else if(media?.addListener){media.addListener(motionChanged);events.push(()=>media.removeListener(motionChanged));}
    if(win.ResizeObserver){resizeObserver=new win.ResizeObserver(()=>{if(alive){size();sync();}});resizeObserver.observe(canvas);}
    if(win.IntersectionObserver){intersectionObserver=new win.IntersectionObserver(entries=>{visible=entries.some(e=>e.isIntersecting);sync();},{threshold:0});intersectionObserver.observe(canvas);}
    const api={
      focus,interact,
      setMotion(value){if(!alive)return;requestedMotion=!!value;const next=requestedMotion&&!reduced;if(next===motion)return;motion=next;dirty=true;sync();},
      flyIn(){if(!alive)return;location=null;if(reduced){arriving=false;setCamera(overview());draw();sync();return;}arriving=true;setCamera({target:[0,3,-10],yaw:-.40,pitch:.75,distance:102});go(overview(),3.7);draw();},
      skipArrival,reset,
      capture(){if(!alive)return null;if(dirty)draw();const out=doc.createElement('canvas');out.width=canvas.width;out.height=canvas.height;const copy=out.getContext('2d');if(!copy)return null;copy.drawImage(canvas,0,0);return out;},
      getState(){return {...status(),motion,reducedMotion:reduced,ready,alive,camera:cameraCopy(),worldState:{catsGathered,lanternsLit,sardineFound},catCount:CATS.length};},
      destroy(){if(!alive)return;alive=false;if(frame)win.cancelAnimationFrame(frame);frame=0;events.forEach(off=>off());resizeObserver?.disconnect();intersectionObserver?.disconnect();pointers.clear();materials?.dispose();glRenderer?.destroy();glRenderer=null;projectedStatic=null;if(canvas.style){canvas.style.touchAction=oldTouch||'';canvas.style.cursor=oldCursor||'';}if(oldTab===null||oldTab===undefined)canvas.removeAttribute?.('tabindex');}
    };
    draw();sync();return api;
  }
  if(typeof window!=='undefined')window.ParallaxGattoScene={create};
  if(typeof module!=='undefined'&&module.exports)module.exports={create,ground,terrainHeight,cameraBasis,projection,LOCATIONS,CATS,catPose,point,lanternLight,MATERIAL};
})();
