const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const loaded={exports:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/sheeple-expedition-scene.js'),'utf8'),{module:loaded});
const {sheepPose,FLOCK,ground}=loaded.exports;

const EPS=1e-8;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>a.map((x,i)=>x-b[i]);
const length=a=>Math.hypot(...a);
const transform=(p,m)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
const column=(m,i)=>[m[i*4],m[i*4+1],m[i*4+2]];
const inversePoint=(p,m)=>{const d=sub(p,[m[12],m[13],m[14]]);return [0,1,2].map(i=>dot(d,column(m,i))/dot(column(m,i),column(m,i)));};
const close=(a,b,message)=>assert.ok(Math.abs(a-b)<EPS,`${message}: ${a} vs ${b}`);
const samePoint=(a,b,message)=>a.forEach((n,i)=>close(n,b[i],message+' axis '+i));
const ellipsoid=(p,center,radii)=>p.reduce((sum,n,i)=>sum+((n-center[i])/radii[i])**2,0);

function timesFor(p){
  const values=new Set(Array.from({length:129},(_,i)=>i*.5));
  // Include turning points of every independent idle cycle, plus a long-running scene.
  for(const speed of [.23,.43,.85])for(let k=0;k<8;k++){
    const t=(Math.PI/2+k*Math.PI-p.phase)/speed;if(t>=0)values.add(t);
  }
  values.add(100000);return [...values];
}

function renderedGround(x,z){
  // Interpolate the actual 3-unit terrain triangles, independently of the rig's sampler.
  const x0=Math.floor((x+60)/3)*3-60,z0=Math.floor((z+66)/3)*3-66;
  const u=(x-x0)/3,v=(z-z0)/3,a=ground(x0,z0),b=ground(x0+3,z0),c=ground(x0,z0+3),d=ground(x0+3,z0+3);
  return u+v<=1?a+(b-a)*u+(c-a)*v:d+(c-d)*(1-u)+(b-d)*(1-v);
}

test('all four hips stay embedded in the wool body throughout every sheep’s idle motion',()=>{
  assert.equal(FLOCK.length,6);
  for(const [index,p]of FLOCK.entries())for(const t of timesFor(p)){
    const pose=sheepPose(p,t);assert.equal(pose.legs.length,4);
    const quadrants=new Set();
    for(const leg of pose.legs){
      const hip=inversePoint(leg.hip,pose.root);
      assert.ok(ellipsoid(hip,[0,1.13,0],[.59,.53,.83])<.9,`sheep ${index}, t=${t}: leg attachment must overlap the body`);
      quadrants.add(`${Math.sign(hip[0])}:${Math.sign(hip[2])}`);
    }
    assert.equal(quadrants.size,4,'front and rear pairs must remain distinct');
  }
});

test('rendered leg matrices connect each body hip directly into its hoof',()=>{
  for(const [index,p]of FLOCK.entries())for(const t of timesFor(p)){
    for(const leg of sheepPose(p,t).legs){
      samePoint(transform([0,0,0],leg.legMatrix),leg.hip,`sheep ${index} upper endpoint`);
      samePoint(transform([0,-1,0],leg.legMatrix),leg.ankle,`sheep ${index} lower endpoint`);
      const localAnkle=inversePoint(leg.ankle,leg.hoofMatrix);
      assert.ok(ellipsoid(localAnkle,[0,.105,0],[.13,.105,.18])<.8,'the ankle must overlap the hoof volume');
      const extent=length(sub(leg.hip,leg.ankle))/p.scale;
      assert.ok(extent>.65&&extent<1.2,'a grounded idle leg must stay within a natural length range');
    }
  }
});

test('leg transforms stay orthogonal and uniformly scaled for both renderers',()=>{
  for(const p of FLOCK)for(const t of timesFor(p))for(const leg of sheepPose(p,t).legs){
    const m=leg.legMatrix,axes=[0,1,2].map(i=>column(m,i)),extent=length(sub(leg.hip,leg.ankle));
    assert.ok(m.every(Number.isFinite),'leg matrix must contain only finite values');
    axes.forEach(axis=>close(length(axis),extent,'uniform leg scale'));
    close(dot(axes[0],axes[1]),0,'orthogonal X/Y');close(dot(axes[0],axes[2]),0,'orthogonal X/Z');close(dot(axes[1],axes[2]),0,'orthogonal Y/Z');
    const determinant=m[0]*(m[5]*m[10]-m[9]*m[6])-m[4]*(m[1]*m[10]-m[9]*m[2])+m[8]*(m[1]*m[6]-m[5]*m[2]);
    assert.ok(determinant>0,'normal direction and winding must not be mirrored');
    close(determinant,extent**3,'uniform transform determinant');
  }
});

test('all feet remain planted on the displayed terrain while their bodies sway',()=>{
  let observedSway=false;
  for(const p of FLOCK){
    const baseline=sheepPose(p,0);
    for(const t of timesFor(p)){
      const pose=sheepPose(p,t);
      observedSway ||= length(sub(pose.legs[0].hip,baseline.legs[0].hip))>.001;
      pose.legs.forEach((leg,i)=>{
        samePoint(leg.foot,baseline.legs[i].foot,'planted foot');
        samePoint(transform([0,0,0],leg.hoofMatrix),leg.foot,'hoof lowest point');
        close(leg.foot[1],renderedGround(leg.foot[0],leg.foot[2]),'hoof contact with visible terrain');
        const up=column(leg.hoofMatrix,1);samePoint(up,[0,p.scale,0],'hoof stays upright');
      });
    }
  }
  assert.ok(observedSway,'grounding should preserve the intentional subtle idle movement');
});

test('a frozen animation time produces exactly the same complete pose',()=>{
  for(const p of FLOCK)for(const t of [0,7.2,31.7]){
    const a=sheepPose(p,t),b=sheepPose(p,t);
    assert.equal(JSON.stringify(a),JSON.stringify(b),'pose should not depend on a wall clock or random values');
  }
});
