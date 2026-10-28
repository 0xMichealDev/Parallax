/* Shared real-time planet renderer for Studio, Premium, public worlds and PNGs. */
(()=>{'use strict';
const solhandleEmblem='solhandle-emblem-v198.png';
const gattoFace='gatto-face-v207.png';
const portraitFiles=Object.freeze({bonk:'bonk-realism-v209.webp',pengu:'pengu-realism-v209.webp',wif:'wif-realism-v209.webp',popcat:'popcat-realism-v209.webp',sheeple:'sheeple-realism-v209.webp',trump:'trump-realism-v209.webp'});
const vertex=`attribute vec2 aPosition;varying vec2 vUv;void main(){vUv=aPosition*.5+.5;gl_Position=vec4(aPosition,0.,1.);}`;
const fragment=`
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap,uCloud,uNight,uEmblem,uGattoMap,uPortraitMap,uPortraitContour;
uniform vec3 uAccent,uLight;
uniform vec3 uBrandPrimary,uBrandSecondary,uBrandRing;
uniform float uBrandEnabled,uRefined,uNatural,uAir,uPluto,uPixel,uIdentity;
uniform float uSolhandle,uHasEmblem;
uniform float uHasGattoMap,uGattoMoon;
uniform float uHasPortrait,uRealTerrain,uPortraitAngle;
uniform float uTime,uSurface,uMaterial,uRings,uWeather,uAtmosphere,uHasMap,uHasCloud,uHasNight;
// Sheeple's overlapping fleece is shaded once after the closest analytic hit.
// This avoids repeating the material noise for every overlapping wool lobe.
vec3 identityFeaturePoint,identityFeatureNormal;
float identityFeatureKind,identityFeatureAngle;
float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float a=.5,v=0.;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec3(8.2,3.7,1.4);a*=.5;}return v;}
vec3 rotateY(vec3 p,float a){return vec3(cos(a)*p.x+sin(a)*p.z,p.y,-sin(a)*p.x+cos(a)*p.z);}
vec3 rotateX(vec3 p,float a){return vec3(p.x,cos(a)*p.y-sin(a)*p.z,sin(a)*p.y+cos(a)*p.z);}
vec3 rotateZ(vec3 p,float a){return vec3(cos(a)*p.x-sin(a)*p.y,sin(a)*p.x+cos(a)*p.y,p.z);}
vec2 sphereUV(vec3 p){return vec2(fract(atan(p.z,p.x)/6.2831853+.5),acos(clamp(p.y,-1.,1.))/3.14159265);}
vec2 fleeceUV(vec3 point){return sphereUV(normalize(point))*vec2(1.35,1.);}
float fleeceHeight(vec2 uv){return dot(texture2D(uMap,fract(uv)).rgb,vec3(.299,.587,.114));}
vec3 fleeceBase(vec3 point){
 float detail=uHasMap>.5?fleeceHeight(fleeceUV(point)):.76+.09*noise(point*44.);
 return vec3(.92,.86,.74)*(.30+.82*detail);
}
vec3 fleeceNormal(vec3 point,vec3 normal){
 if(uHasMap<.5)return normal;
 vec2 uv=fleeceUV(point),step=vec2(.0015,0.);
 float dx=fleeceHeight(uv+step)-fleeceHeight(uv-step),dy=fleeceHeight(uv+step.yx)-fleeceHeight(uv-step.yx);
 vec3 tangent=normalize(vec3(-point.z,0.,point.x)+vec3(.0001,0.,0.)),bitangent=normalize(cross(normalize(point),tangent));
 return normalize(normal-(tangent*dx+bitangent*dy)*1.8);
}
// Community identities are planetary sculptures. Analytic intersections keep
// landmarks dimensional without an iterative raymarch or additional textures.
float ellipseMask(vec2 point,vec2 center,vec2 radius,float feather){
 float edge=max(feather,min(.7,uPixel*.50/min(radius.x,radius.y)));
 return 1.-smoothstep(1.-edge,1.+edge,length((point-center)/radius));
}
float featureEllipsoid(vec3 ro,vec3 rd,vec3 center,vec3 radius){
 vec3 o=(ro-center)/radius,d=rd/radius;float a=dot(d,d),b=dot(o,d),c=dot(o,o)-1.,h=b*b-a*c;
 if(h<0.)return -1.;float t=(-b-sqrt(h))/a;return t>0.?t:-1.;
}
float featureCone(vec3 ro,vec3 rd,vec3 center,vec3 radius,out vec3 normal){
 vec3 o=ro-center,d=rd;float h=radius.y,splay=sign(center.x)*.18;
 o.x-=o.y*splay;d.x-=d.y*splay;
 float a=d.x*d.x/(radius.x*radius.x)+d.z*d.z/(radius.z*radius.z)-d.y*d.y/(h*h);
 float b=o.x*d.x/(radius.x*radius.x)+o.z*d.z/(radius.z*radius.z)+(1.-o.y/h)*d.y/h;
 float c=o.x*o.x/(radius.x*radius.x)+o.z*o.z/(radius.z*radius.z)-(1.-o.y/h)*(1.-o.y/h);
 float disc=b*b-a*c;if(disc<0.||abs(a)<.00001)return -1.;
 float ta=(-b-sqrt(disc))/a,tb=(-b+sqrt(disc))/a,t=min(ta,tb);vec3 q=o+t*d;
 if(t<0.||q.y<0.||q.y>h*.893934){t=max(ta,tb);q=o+t*d;}
 if(t<0.||q.y<0.||q.y>h*.893934)return -1.;
 vec3 g=vec3(q.x/(radius.x*radius.x),(1.-q.y/h)/h,q.z/(radius.z*radius.z));
 normal=normalize(vec3(g.x,g.y-splay*g.x,g.z));return t;
}
float featureBox(vec3 ro,vec3 rd,vec3 center,vec3 radius,out vec3 normal){
 vec3 o=ro-center,inv=1./(rd+vec3(.0000001));vec3 a=(-radius-o)*inv,b=(radius-o)*inv;
 vec3 lo=min(a,b),hi=max(a,b);float t=max(max(lo.x,lo.y),lo.z),far=min(min(hi.x,hi.y),hi.z);
 if(t<0.||t>far)return -1.;vec3 q=(o+t*rd)/radius;
 vec3 k=abs(q);normal=k.x>k.y&&k.x>k.z?vec3(sign(q.x),0,0):k.y>k.z?vec3(0,sign(q.y),0):vec3(0,0,sign(q.z));return t;
}
float featureCylinder(vec3 ro,vec3 rd,vec3 center,vec3 radius,out vec3 normal){
 vec3 o=ro-center;vec2 q=o.xy/radius.xy,d=rd.xy/radius.xy;
 float a=dot(d,d),b=dot(q,d),c=dot(q,q)-1.,disc=b*b-a*c,hit=100.;
 if(a>.000001&&disc>=0.){
  float t=(-b-sqrt(disc))/a;
  if(t>0.&&abs(o.z+t*rd.z)<=radius.z){hit=t;normal=normalize(vec3((o.xy+t*rd.xy)/(radius.xy*radius.xy),0.));}
 }
 if(abs(rd.z)>.000001){
  float side=rd.z<0.?1.:-1.,t=(side*radius.z-o.z)/rd.z;
  if(t>0.&&t<hit&&length((o.xy+t*rd.xy)/radius.xy)<=1.){hit=t;normal=vec3(0.,0.,side);}
 }
 return hit<99.?hit:-1.;
}
vec3 featureColor(vec3 point,vec3 normal,float kind,float angle){
 vec3 base=vec3(.25),emission=vec3(0.);float grain=noise(point*85.),terrain=fbm(point*12.);
 float gloss=.06,shine=45.;vec3 nv=rotateY(normal,-angle);
 if(kind<1.5){ // Soft triangular ears with peach inner panels.
  float center=uIdentity<1.5?.60:.66;
  float inner=(1.-smoothstep(.10,.21,abs(abs(point.x)-center)))*smoothstep(.83,1.02,point.y)*smoothstep(.15,.65,normal.z);
  base=uIdentity<1.5?vec3(1.,.105,.0003):vec3(.35,.245,.18);
  base=mix(base,vec3(.92,.51,.38),inner*.94)*(.97+.04*terrain);gloss=.08;
  if(uIdentity>6.5){ // GATTO keeps black ears with a quiet warm inner rim.
   base=mix(vec3(.012,.016,.022),vec3(.060,.029,.010),inner*.65)*(.98+.02*terrain);
   base+=vec3(.048,.025,.007)*pow(1.-abs(normal.z),3.)*smoothstep(.78,1.13,point.y);gloss=.065;
  }
 }else if(kind<2.5){ // Warm salmon knit: broad, low-contrast stitches and a rolled cuff.
  float longitude=atan(point.z,point.x),rows=point.y*68.;
  float rib=.5+.5*cos(longitude*46.+sin(rows)*1.15),loop=.5+.5*cos(rows+sin(longitude*46.)*1.1);
  float cuff=1.-smoothstep(.78,.86,point.y);rib=mix(rib,.5+.5*cos(longitude*55.),cuff);
  base=vec3(.65,.275,.225)*(.85+.09*rib+.06*loop);
  float thread=sin(longitude*46.+sin(rows)*1.15);nv=normalize(nv+vec3(thread*.014,sin(rows)*.012,0.));gloss=.035;
 }else if(kind<3.5){ // A small peach-orange bill, with a clean soft shine.
  base=vec3(.94,.39,.105)*(.98+.02*terrain);gloss=.11;shine=50.;
  if(point.y<.12&&point.y>-.03)base*=1.-.22*(1.-smoothstep(.008,.018,abs(point.y-.035)));
 }else if(kind<4.5){ // Periwinkle penguin flippers.
  base=vec3(.20,.32,.78)*(.98+.02*terrain);gloss=.07;
 }else if(kind<5.5){ // Deep matte CCTV housing, with softly readable edges.
  base=vec3(.009,.011,.013)*(.94+.08*terrain);
  base+=vec3(.007,.008,.009)*pow(1.-abs(normal.z),2.);gloss=.115;shine=60.;
 }else if(kind<6.5){ // Compact dark optics; the concentric barrel reads as a real camera.
  float radius=length(point.xy-vec2(0.,1.055));
  float rim=smoothstep(.125,.145,radius);
  base=mix(vec3(.0015,.003,.004),vec3(.014,.018,.021),rim);
  float grooves=(1.-smoothstep(.002,.006,abs(radius-.144)))+(1.-smoothstep(.002,.006,abs(radius-.175)))+(1.-smoothstep(.002,.005,abs(radius-.101)));
  base+=vec3(.018,.020,.022)*grooves;
  float reflection=exp(-length((point.xy-vec2(-.035,1.11))*vec2(45.,60.)));
  base+=vec3(.11,.16,.19)*reflection;
  float glass=1.-smoothstep(.08,.11,radius);base+=vec3(.003,.005,.006)*glass;gloss=.23;shine=115.;
 }else if(kind<7.5){base=vec3(.65,.008,.012);emission=vec3(.65,.012,.008);gloss=.16;}
 else if(kind<8.5){ // Sculpted blond locks follow one continuous, gently curved sweep.
  if(point.y>.60){vec3 crown=normalize(vec3(point.x*.70,(point.y-.60)*1.7,point.z*.82));nv=rotateY(normalize(mix(normal,crown,.22)),-angle);}
  float flow=point.y-.22*point.x+.12*point.x*point.x+.16*point.z;
  float strand=.5+.5*sin(flow*124.),groove=pow(.5+.5*cos(flow*37.),8.);
  float root=smoothstep(.64,1.13,point.y);
  base=mix(vec3(.55,.285,.065),vec3(.95,.69,.255),root)*(.92+.055*strand-.10*groove);
  vec3 tangent=vec3(.24*point.x-.22,1.,.16);
  nv=normalize(nv-rotateY(tangent,-angle)*cos(flow*124.)*.012);gloss=.075;shine=48.;
 }else if(kind<9.5){ // Cream fleece with small curls and soft, uneven clumps.
  base=fleeceBase(point);gloss=.008;nv=rotateY(fleeceNormal(point,normal),-angle);
 }else if(kind<10.5){ // Glossy little noses remain dimensional at every rotation.
  base=vec3(.005,.006,.008);gloss=.26;shine=75.;
 }else if(kind<11.5){
  float gx=abs(fract(point.x*9.+.5)-.5),gz=abs(fract(point.z*10.+.5)-.5);
  float grid=1.-smoothstep(.012,.035,min(gx,gz));
  base=mix(vec3(.012,.027,.065),vec3(.12,.17,.23),grid*.70);gloss=.13;shine=80.;
 }else if(kind<12.5){ // Bracket hardware and solar-panel frame.
  base=vec3(.14,.16,.17)*(.93+.07*grain);gloss=.21;shine=75.;
 }else if(kind<13.5){ // A dimensional red collar, separate from the wool body.
  base=vec3(.53,.009,.016)*(.91+.06*terrain+.03*grain);gloss=.045;
 }else if(kind<14.5){
  base=vec3(.019,.016,.012)*(.96+.04*terrain);gloss=.055;
 }else if(kind<15.5){ // Warm porcelain-like skin, with soft cheeks rather than flat paint.
  base=vec3(.89,.535,.325)*(.99+.012*terrain);
  float blush=exp(-dot((point.xy-vec2(sign(point.x)*.37,.035))*vec2(7.,9.),(point.xy-vec2(sign(point.x)*.37,.035))*vec2(7.,9.)));
  base=mix(base,vec3(.86,.39,.265),blush*.14);
  float nostril=max(ellipseMask(point.xy,vec2(-.067,.073),vec2(.025,.012),.12),ellipseMask(point.xy,vec2(.067,.073),vec2(.025,.012),.12))*smoothstep(1.08,1.14,point.z);
  base=mix(base,vec3(.36,.14,.08),nostril*.45);gloss=.035;shine=42.;
 }else if(kind<16.5){ // Small dimensional blue eyes with an inset iris and a single catchlight.
  vec2 eye=point.xy-vec2(sign(point.x)*.255,.31);
  float iris=1.-smoothstep(.044,.050,length(eye*vec2(1.,.93)));
  float pupil=1.-smoothstep(.021,.026,length(eye));
  float irisGrain=.5+.5*sin(atan(eye.y,eye.x)*24.);
  base=mix(vec3(.91,.935,.94),vec3(.055,.235,.39)*(.88+.12*irisGrain),iris);
  base=mix(base,vec3(.006,.014,.023),pupil);
  float glint=ellipseMask(eye,vec2(-.015,.022),vec2(.014,.016),.06);
  base=mix(base,vec3(.97,.99,1.),glint);gloss=.15;shine=95.;
 }else if(kind<17.5){ // A restrained, softly curved smile with a warm lower lip.
  float seam=1.-smoothstep(.004,.010,abs(point.y+.145-.43*point.x*point.x));
  base=mix(vec3(.68,.32,.23),vec3(.25,.085,.053),seam*.62);gloss=.035;shine=45.;
 }else{
  base=vec3(.89,.535,.325);gloss=.035;
 }
 float light=dot(nv,uLight),diff=.5*(light+sqrt(light*light+.06));
 float spec=pow(max(0.,dot(reflect(-normalize(uLight),nv),vec3(0,0,1))),shine)*gloss;
 float fill=kind>8.5&&kind<9.5?.17+.055*max(0.,nv.z):.19;
 return pow(max(base*(fill+diff*.93)+spec*vec3(.94,.96,1.)+emission,vec3(0.)),vec3(.4545));
}
void paintFeature(vec3 point,vec3 normal,float kind,float angle,inout vec3 col){
 if(uIdentity>4.5&&uIdentity<6.5){identityFeaturePoint=point;identityFeatureNormal=normal;identityFeatureKind=kind;identityFeatureAngle=angle;}
 else col=featureColor(point,normal,kind,angle);
}
void putEllipsoid(vec3 ro,vec3 rd,vec3 center,vec3 radius,float kind,float angle,inout float depth,inout vec3 col,inout float alpha){
 float t=featureEllipsoid(ro,rd,center,radius);if(t>0.&&t<depth){vec3 point=ro+t*rd,normal=normalize((point-center)/(radius*radius));paintFeature(point,normal,kind,angle,col);depth=t;alpha=1.;}
}
void putWoolTuft(vec3 ro,vec3 rd,vec3 center,vec3 radius,float angle,inout float depth,inout vec3 col,inout float alpha){
 float hit=featureEllipsoid(ro,rd,center,radius);
 if(hit>0.&&hit<depth){
  vec3 point=ro+hit*rd,normal=normalize((point-center)/(radius*radius));
  // The fleece has a soft outer contour, not isolated bumps across its face.
  float edge=smoothstep(.85,1.055,length(rotateY(point,-angle).xy));
  normal=normalize(mix(normalize(point),normal,edge));
  paintFeature(point,normal,9.,angle,col);depth=hit;alpha=1.;
 }
}
void putCone(vec3 ro,vec3 rd,vec3 center,vec3 radius,float angle,inout float depth,inout vec3 col,inout float alpha){
 vec3 normal;float t=featureCone(ro,rd,center,radius,normal);if(t>0.&&t<depth){col=featureColor(ro+t*rd,normal,1.,angle);depth=t;alpha=1.;}
 // This cap is tangent to the cone in normalized space, so no bead or flat join is exposed.
 float splay=sign(center.x)*.18;vec3 capRo=ro-center,capRd=rd;capRo.x-=capRo.y*splay;capRd.x-=capRd.y*splay;
 vec3 capCenter=vec3(0.,radius.y*.787868,0.),capRadius=radius*.15;
 float cap=featureEllipsoid(capRo,capRd,capCenter,capRadius);
 if(cap>0.&&cap<depth){vec3 g=(capRo+cap*capRd-capCenter)/(capRadius*capRadius);normal=normalize(vec3(g.x,g.y-splay*g.x,g.z));col=featureColor(ro+cap*rd,normal,1.,angle);depth=cap;alpha=1.;}
}
void putTiltedEllipsoid(vec3 ro,vec3 rd,vec3 center,vec3 radius,float tilt,float kind,float angle,inout float depth,inout vec3 col,inout float alpha){
 vec3 localRo=rotateZ(ro-center,-tilt),localRd=rotateZ(rd,-tilt);float hit=featureEllipsoid(localRo,localRd,vec3(0.),radius);
 if(hit>0.&&hit<depth){vec3 normal=rotateZ(normalize((localRo+hit*localRd)/(radius*radius)),tilt);paintFeature(ro+hit*rd,normal,kind,angle,col);depth=hit;alpha=1.;}
}
float triangleMask(vec2 p,vec2 a,vec2 b,vec2 c){
 vec2 e0=b-a,e1=c-b,e2=a-c;vec2 v0=p-a,v1=p-b,v2=p-c;
 float signum=sign(e0.x*(c.y-a.y)-e0.y*(c.x-a.x));
 float d=min(min(signum*(e0.x*v0.y-e0.y*v0.x)/length(e0),signum*(e1.x*v1.y-e1.y*v1.x)/length(e1)),signum*(e2.x*v2.y-e2.y*v2.x)/length(e2));
 return smoothstep(-uPixel*.65,uPixel*.65,d);
}
void putBox(vec3 ro,vec3 rd,vec3 center,vec3 radius,float kind,float angle,inout float depth,inout vec3 col,inout float alpha){
 vec3 normal;float hit=featureBox(ro,rd,center,radius,normal);
 if(hit>0.&&hit<depth){paintFeature(ro+hit*rd,normal,kind,angle,col);depth=hit;alpha=1.;}
}
void putCylinder(vec3 ro,vec3 rd,vec3 center,vec3 radius,float kind,float angle,inout float depth,inout vec3 col,inout float alpha){
 vec3 normal;float hit=featureCylinder(ro,rd,center,radius,normal);
 if(hit>0.&&hit<depth){paintFeature(ro+hit*rd,normal,kind,angle,col);depth=hit;alpha=1.;}
}
void putRoundedBox(vec3 ro,vec3 rd,vec3 center,vec3 radius,float corner,float kind,float angle,inout float depth,inout vec3 col,inout float alpha){
 putBox(ro,rd,center,vec3(radius.x-corner,radius.y,radius.z),kind,angle,depth,col,alpha);
 putBox(ro,rd,center,vec3(radius.x,radius.y-corner,radius.z),kind,angle,depth,col,alpha);
 for(int i=0;i<4;i++){
  vec2 side=vec2(i<2?-1.:1.,mod(float(i),2.)<.5?-1.:1.);
  putCylinder(ro,rd,center+vec3(side*(radius.xy-corner),0.),vec3(corner,corner,radius.z),kind,angle,depth,col,alpha);
 }
}
// GATTO has its own sculpted silhouette and object-space portrait. The exact
// same shader produces the interactive world and its static/social artwork.
void gattoEllipsoid(vec3 ro,vec3 rd,vec3 center,vec3 radius,float kind,inout float depth,inout vec3 point,inout vec3 normal,inout float material){
 float hit=featureEllipsoid(ro,rd,center,radius);
 if(hit>0.&&hit<depth){depth=hit;point=ro+hit*rd;normal=normalize((point-center)/(radius*radius));material=kind;}
}
void gattoEar(vec3 ro,vec3 rd,vec3 center,vec3 radius,inout float depth,inout vec3 point,inout vec3 normal,inout float material){
 vec3 n;float hit=featureCone(ro,rd,center,radius,n);
 if(hit>0.&&hit<depth){depth=hit;point=ro+hit*rd;normal=n;material=2.;}
 float splay=sign(center.x)*.18;vec3 o=ro-center,d=rd;o.x-=o.y*splay;d.x-=d.y*splay;
 vec3 capCenter=vec3(0.,radius.y*.787868,0.),capRadius=radius*.15;
 hit=featureEllipsoid(o,d,capCenter,capRadius);
 if(hit>0.&&hit<depth){vec3 g=(o+hit*d-capCenter)/(capRadius*capRadius);depth=hit;point=ro+hit*rd;normal=normalize(vec3(g.x,g.y-splay*g.x,g.z));material=2.;}
}
vec2 gattoPortraitUv(vec3 point){return vec2(point.x/2.30+.5,(1.40-point.y)/2.30);}
float gattoRelief(vec2 q){
 vec2 elliptical=vec2(q.x/.98,(q.y-.03)/.87);
 float shell=.12+.55*sqrt(max(.035,1.-dot(elliptical,elliptical)));
 float muzzle=.145*exp(-dot((q-vec2(0.,-.14))*vec2(5.,5.2),(q-vec2(0.,-.14))*vec2(5.,5.2)));
 return shell+muzzle;
}
vec2 gattoReliefGradient(vec2 q){
 float step=.004;
 return vec2(gattoRelief(q+vec2(step,0.))-gattoRelief(q-vec2(step,0.)),gattoRelief(q+vec2(0.,step))-gattoRelief(q-vec2(0.,step)))/(2.*step);
}
vec3 gattoMaterial(vec3 point,vec3 normal,float material,float angle){
 vec3 viewNormal=rotateY(normal,-angle),light=normalize(uLight);
 float lambert=dot(viewNormal,light),diffuse=.5*(lambert+sqrt(lambert*lambert+.07));
 float grain=noise(point*95.),strand=.5+.5*sin((point.y+.16*sin(point.x*8.))*230.+noise(point*24.)*5.);
 vec3 base=vec3(.006,.008,.012)*(.72+.20*grain+.08*strand);
 if(material>3.5&&material<4.5){
  float stone=fbm(point*52.);base=mix(vec3(.09,.10,.115),vec3(.36,.34,.29),stone);
  return pow(base*(.11+diffuse*.86),vec3(.4545));
 }
 // Image coordinates are top-to-bottom, matching DOM Image and offline PNG upload.
 vec2 faceUv=gattoPortraitUv(point);
 vec4 portrait=texture2D(uGattoMap,clamp(faceUv,vec2(.001),vec2(.999)));
 float frontView=smoothstep(.1,.5,cos(angle))*(1.-smoothstep(.05,.30,abs(sin(angle))));
 float front=material>4.5?1.:smoothstep(-.08,.22,point.z)*max(frontView,smoothstep(.12,.60,normal.z));
 float usePortrait=front*uHasGattoMap*portrait.a;
 base=mix(base,pow(portrait.rgb,vec3(2.2)),usePortrait);
 // The rear remains a dark, finely textured volume when the portrait rotates away.
 float sheen=pow(max(0.,dot(reflect(-light,viewNormal),vec3(0,0,1))),45.)*.014;
 float rim=pow(1.-max(0.,viewNormal.z),4.)*max(0.,dot(viewNormal,normalize(vec3(.75,.65,-.22))));
 vec3 color=base*(.58+diffuse*.48)+vec3(.32,.36,.43)*sheen;
 color+=vec3(.25,.145,.042)*rim*.18;
 if(material>2.5&&material<3.5)color+=vec3(.05,.06,.07)*pow(max(0.,dot(reflect(-light,viewNormal),vec3(0,0,1))),75.);
 vec3 shaded=pow(max(color,vec3(0.)),vec3(.4545));
 // The approved portrait already contains its own fur detail and lighting.
 // Keep those colors intact; geometry adds volume chiefly at oblique angles.
 return mix(shaded,portrait.rgb*(.96+.04*diffuse),usePortrait);
}
vec4 gattoWorld(vec2 p){
 float angle=(uTime-6.4)*.15;
 vec3 ro=rotateY(vec3(p,3.),angle),rd=rotateY(vec3(0,0,-1),angle);
 float depth=100.,material=0.;vec3 point=vec3(0.),normal=vec3(0,0,1);
 // A lean cranium, tapered jaw, cheek planes and a subtle projecting muzzle.
 gattoEllipsoid(ro,rd,vec3(0.,.03,0.),vec3(.96,.84,.65),1.,depth,point,normal,material);
 gattoEllipsoid(ro,rd,vec3(0.,-.35,.035),vec3(.75,.48,.61),1.,depth,point,normal,material);
 gattoEllipsoid(ro,rd,vec3(-.49,-.24,.18),vec3(.47,.40,.47),1.,depth,point,normal,material);
 gattoEllipsoid(ro,rd,vec3(.49,-.24,.18),vec3(.47,.40,.47),1.,depth,point,normal,material);
 gattoEar(ro,rd,vec3(-.64,.50,-.075),vec3(.37,.91,.255),depth,point,normal,material);
 gattoEar(ro,rd,vec3(.64,.50,-.075),vec3(.37,.91,.255),depth,point,normal,material);
 gattoEllipsoid(ro,rd,vec3(-.135,-.245,.635),vec3(.225,.19,.145),1.,depth,point,normal,material);
 gattoEllipsoid(ro,rd,vec3(.135,-.245,.635),vec3(.225,.19,.145),1.,depth,point,normal,material);
 gattoEllipsoid(ro,rd,vec3(0.,-.14,.77),vec3(.088,.062,.066),3.,depth,point,normal,material);
 vec3 color=vec3(0.);float alpha=0.;
 if(depth<99.){
  color=gattoMaterial(point,normal,material,angle);
  float frontView=smoothstep(.08,.55,cos(angle))*(1.-smoothstep(.10,.65,abs(sin(angle))));
  float coverage=texture2D(uGattoMap,clamp(gattoPortraitUv(point),vec2(.001),vec2(.999))).a;
  alpha=mix(1.,coverage,frontView*uHasGattoMap);
 }
 // A shallow relief preserves the approved portrait's complete fur/whisker
 // silhouette. It is intersected in object space, rather than facing the camera.
 if(uHasGattoMap>.5&&rd.z<-.35){
  float hit=(.65-ro.z)/rd.z;
  for(int i=0;i<6;i++){
   vec3 q=ro+rd*hit;vec2 gradient=gattoReliefGradient(q.xy);
   float derivative=rd.z-dot(gradient,rd.xy);
   if(abs(derivative)>.08)hit-=clamp((q.z-gattoRelief(q.xy))/derivative,-.35,.35);
  }
  vec3 q=ro+rd*hit;vec2 uv=gattoPortraitUv(q);
  if(hit>0.&&hit<depth+.035&&uv.x>0.&&uv.x<1.&&uv.y>0.&&uv.y<1.&&abs(q.z-gattoRelief(q.xy))<.025){
   vec4 portrait=texture2D(uGattoMap,uv);vec2 gradient=gattoReliefGradient(q.xy);
   if(portrait.a>.001){
    vec3 reliefColor=gattoMaterial(q,normalize(vec3(-gradient,1.)),5.,angle);
    color=(color*alpha*(1.-portrait.a)+reliefColor*portrait.a)/max(.0001,alpha*(1.-portrait.a)+portrait.a);
    alpha+=(1.-alpha)*portrait.a;depth=hit;
   }
  }
 }
 // Two metallic orbital ribbons share one plane and use the actual head depth.
 // Their lower crossing keeps the cat's eyes unobstructed, with no black gaps.
 if(uRings>.5){
  vec3 ringNormal=normalize(vec3(.18,.86,.39));
  float ringZ=-(ringNormal.x*p.x+ringNormal.y*(p.y+.25))/ringNormal.z;
  float radius=length(vec3(p.x,p.y+.25,ringZ));
  float edge=max(.0025,uPixel*.85);
  float ring=1.-smoothstep(.012,.012+edge,abs(radius-1.24));
  if(uRings>3.5)ring=max(ring,(1.-smoothstep(.0055,.0055+edge,abs(radius-1.43)))*.72);
  if(depth<99.&&ringZ<3.-depth)ring*=1.-alpha;
  vec3 ringPoint=vec3(p.x,p.y+.25,ringZ);
  float highlight=.5+.5*dot(normalize(ringPoint),normalize(vec3(-.70,.4,.8)));
  vec3 gold=mix(vec3(.39,.235,.065),vec3(1.,.83,.42),pow(highlight,.65));
  float shine=pow(max(0.,1.-abs(radius-1.24)/.017),3.);
  gold+=vec3(.16,.14,.09)*shine;
  float opacity=ring*.95;
  color=(color*alpha*(1.-opacity)+gold*opacity)/max(.0001,alpha*(1.-opacity)+opacity);
  alpha+=(1.-alpha)*opacity;
 }
 // The companion belongs to this composite, so cards and live views agree.
 if(uGattoMoon>.5){
  float orbit=(uTime-6.4)*.035+.62;
  vec3 center=vec3(cos(orbit)*1.71,sin(orbit)*.92+.05,sin(orbit)*.62);
  vec3 moonRo=vec3(p,3.),moonRd=vec3(0,0,-1);
  float moonHit=featureEllipsoid(moonRo,moonRd,center,vec3(.118));
  if(moonHit>0.&&moonHit<depth){vec3 moonPoint=moonRo+moonHit*moonRd,moonNormal=normalize(moonPoint-center);color=gattoMaterial(moonPoint,moonNormal,4.,0.);alpha=1.;}
 }
 return vec4(color,clamp(alpha,0.,1.));
}
// The portrait itself defines each horizontal section of one rounded volume.
// A two-pixel contour lookup replaces per-fragment alpha scans. The original
// alpha still preserves fur, whiskers, spaces between legs and panel gaps.
vec2 portraitUV(vec3 p){return vec2(p.x/2.65+.5,.5-p.y/2.65);}
vec3 portraitSection(float y){
 vec3 left=texture2D(uPortraitContour,vec2(.25,y)).rgb,right=texture2D(uPortraitContour,vec2(.75,y)).rgb;
 return vec3(dot(left.rg,vec2(256.,1.))/257.,dot(right.rg,vec2(256.,1.))/257.,min(left.b,right.b));
}
float portraitPart(vec3 p){
 if(uIdentity>1.5&&uIdentity<2.5&&p.y<-.94)return 5.;
 if(uIdentity>2.5&&uIdentity<3.5&&p.y>.34)return 7.;
 if(uIdentity>4.5&&uIdentity<5.5){if(p.y>.78)return 4.;if(p.y>.18)return 3.;if(p.y>.08)return 6.;if(p.y<-.93)return 5.;}
 if(uIdentity>5.5&&p.y>.76)return 7.;
 return 1.;
}
vec3 portraitSurface(vec3 p,vec3 normal,float part,float angle,vec2 bounds){
 float grain=noise(p*95.),fine=.5+.5*sin(p.y*195.+noise(p*27.)*4.);
 vec3 albedo=vec3(.19,.10,.045);
 if(uIdentity<1.5)albedo=mix(vec3(.32,.115,.025),vec3(.61,.36,.12),.5+.5*p.y);
 else if(uIdentity<2.5){albedo=vec3(.055,.13,.22);if(part>4.5)albedo=vec3(.54,.22,.035);}
 else if(uIdentity<3.5){albedo=vec3(.40,.29,.17);if(part>6.5)albedo=vec3(.44,.19,.21)*(.87+.06*sin(p.y*75.)+.07*sin(atan(p.z,p.x)*85.));}
 else if(uIdentity<4.5)albedo=mix(vec3(.25,.15,.09),vec3(.68,.60,.45),1.-smoothstep(-.5,-.05,p.y));
 else if(uIdentity<5.5){
  albedo=fleeceBase(p);
  if(part>2.5&&part<3.5)albedo=vec3(.007,.010,.014);
  if(part>3.5&&part<4.5)albedo=vec3(.008,.023,.065);
  if(part>4.5&&part<5.5)albedo=vec3(.018,.014,.011);
  if(part>5.5&&part<6.5)albedo=vec3(.42,.008,.013);
 }
 else{albedo=p.y<-.40?vec3(.011,.022,.045):vec3(.58,.30,.17);if(part>6.5)albedo=vec3(.52,.31,.09);}
 vec2 uv=portraitUV(p);
 // The rear takes its local color from the actual silhouette, never face details.
 float border=mix(bounds.x,bounds.y,step(.5,uv.x));
 border=mix(border,(bounds.x+bounds.y)*.5,.07);
 vec4 edge=texture2D(uPortraitMap,vec2(border,clamp(uv.y,.001,.999)));
 albedo=mix(albedo,pow(edge.rgb,vec3(2.2)),edge.a*.72);
 albedo*=.83+.12*grain+.05*fine;
 vec3 nv=rotateY(normal,-angle),light=normalize(uLight);float ndl=dot(nv,light),diffuse=.5*(ndl+sqrt(ndl*ndl+.045));
 vec3 shaded=pow(max(albedo*(.28+diffuse*.72),vec3(0.)),vec3(.4545));
 vec4 portrait=texture2D(uPortraitMap,clamp(uv,vec2(.001),vec2(.999)));
 float front=smoothstep(-.04,.18,normal.z);
 return mix(shaded,portrait.rgb*(.975+.025*diffuse),front);
}
vec4 portraitWorld(vec2 p){
 float angle=uPortraitAngle,depth=100.;
 vec3 ro=rotateY(vec3(p,3.),angle),rd=rotateY(vec3(0,0,-1),angle);
 vec3 color=vec3(0.);float alpha=0.;
 float y=.5-p.y/2.65;
 if(y>0.&&y<1.){
  vec3 section=portraitSection(y);
  float center=(section.x+section.y-1.)*1.325,radius=max(.001,(section.y-section.x)*1.325);
  // The continuous front and rear share the source contour. There is no
  // independently faded backing model and no second hat, ear or set of feet.
  float thickness=radius*(uIdentity>4.5&&uIdentity<5.5?.74:.66);
  vec2 o=vec2((ro.x-center)/radius,ro.z/thickness),d=vec2(rd.x/radius,rd.z/thickness);
  float a=dot(d,d),b=dot(o,d),c=dot(o,o)-1.,disc=b*b-a*c;
  if(section.z>.5&&disc>=0.){
   float hit=(-b-sqrt(disc))/a;
   {
    vec3 point=ro+hit*rd;vec2 uv=portraitUV(point);
    vec4 portrait=texture2D(uPortraitMap,clamp(uv,vec2(.001),vec2(.999)));
    if(hit>0.&&uv.x>0.&&uv.x<1.){
     vec3 normal=normalize(vec3((point.x-center)/(radius*radius),point.y*.45,point.z/(thickness*thickness)));
     if(portrait.a>.001){color=portraitSurface(point,normal,portraitPart(point),angle,section.xy);alpha=portrait.a;depth=hit;}
    }
   }
  }

 }
 if(uRings>.5){
  vec3 rn=normalize(vec3(.18,.86,.39));float rz=-(rn.x*p.x+rn.y*(p.y+.45))/rn.z;
  float radius=length(vec3(p.x,p.y+.45,rz)),edge=max(.0025,uPixel*.85);
  float ring=1.-smoothstep(.010,.010+edge,abs(radius-1.43));
  if(depth<99.&&rz<3.-depth)ring*=1.-alpha;
  float highlight=.5+.5*dot(normalize(vec3(p.x,p.y+.45,rz)),normalize(vec3(-.70,.4,.8)));
  vec3 ink=mix(uBrandRing*.55,mix(uBrandRing,vec3(1.),.32),highlight);
  float opacity=ring*.90;color=(color*alpha*(1.-opacity)+ink*opacity)/max(.0001,alpha*(1.-opacity)+opacity);alpha+=(1.-alpha)*opacity;
 }
 return vec4(color,clamp(alpha,0.,1.));
}
void main(){
 if(uIdentity>6.5){gl_FragColor=gattoWorld((vUv-.5)*4.1);return;}
 if(uIdentity>.5&&uHasPortrait>.5){gl_FragColor=portraitWorld((vUv-.5)*4.1);return;}
 identityFeatureKind=0.;
 vec2 p=(vUv-.5)*4.1;float rr=dot(p,p),d=sqrt(rr),z=sqrt(max(0.,1.-rr));vec3 col=vec3(0.);float alpha=0.;
 vec3 atm=mix(vec3(.22,.55,1.),uAccent,.48);float strength=1.+uAtmosphere*.36;
 if(uRefined>.5){atm=mix(uAccent,vec3(.55,.72,.86),.18);strength=uAir*(1.+uAtmosphere*.36);}
 if(uBrandEnabled>.5)atm=mix(uBrandPrimary,uBrandSecondary,.18);
 if(uRealTerrain>.5){atm=mix(vec3(.31,.46,.66),uAccent,.22);strength=.36;}
 if(uIdentity>6.5)atm=mix(vec3(.15,.18,.24),uAccent,.72);
 if(uIdentity>5.5&&uIdentity<6.5){atm=vec3(.22,.40,.66);strength*=.55;}
 if(uSolhandle>.5){atm=mix(vec3(.36,.87,.97),vec3(.72,.58,.98),smoothstep(-.9,.9,p.x));strength=uRealTerrain>.5?.38:1.15;}
 if(rr>1.){float halo=exp(-(d-1.)*21.)*.32*strength;halo+=exp(-(d-1.)*7.)*.028;
 if(uRealTerrain>.5)halo=exp(-(d-1.)*68.)*.10+exp(-(d-1.)*24.)*.008;
 if(uRefined>.5)halo=(exp(-(d-1.)*55.)*.20+exp(-(d-1.)*18.)*.018)*strength;float side=.35+.65*max(0.,dot(normalize(vec3(p,.1)),uLight));col=atm;alpha=halo*side;}
 if(rr<=1.){
  vec3 n=vec3(p,z),rot=rotateY(n,uTime*.15),material=rot;vec2 uv=sphereUV(rot);float light=dot(n,uLight),day=smoothstep(-.12,.2,light),diff=max(0.,light);
  vec3 tex=mix(vec3(.25,.36,.42),texture2D(uMap,uv).rgb,uHasMap);
  // Pluto's source mosaic has no southern coverage. Blend into an explicitly
  // credited artistic continuation; never show the missing-data mask as terrain.
  if(uPluto>.5&&uHasMap>.5){
   float terrain=fbm(material*8.),grain=fbm(material*65.);
   vec3 fill=mix(vec3(.31,.24,.20),vec3(.65,.57,.49),smoothstep(.25,.75,terrain))*(.86+.26*grain);
   vec3 observed=texture2D(uMap,vec2(uv.x,min(uv.y,.60))).rgb;
   tex=mix(observed,fill,smoothstep(.50,.66,uv.y));
  }
  vec3 base=pow(tex,vec3(2.2));vec3 emission=vec3(0.);float spec=0.;
  if(uIdentity<.5&&uRealTerrain<.5){
  if(uMaterial<.5){if(uNatural<.5)base=mix(base,base*uAccent*1.8,.17);if(uSurface<.5){float ocean=smoothstep(.025,.13,tex.b-max(tex.r,tex.g)*.7);spec=pow(max(0.,dot(reflect(-uLight,n),vec3(0,0,1))),48.)*ocean*.55;emission=pow(texture2D(uNight,uv).rgb,vec3(1.3))*vec3(1.,.68,.32)*(1.-day)*uHasNight*.8;}}
  if(uMaterial>.5&&uMaterial<1.5){float land=fbm(material*5.);float cracks=1.-smoothstep(.014,.065,abs(fbm(material*12.+land*4.)-.49));base=mix(vec3(.018,.012,.02),vec3(.17,.065,.025),land);emission=mix(vec3(1.,.11,.008),vec3(1.,.55,.08),cracks)*pow(cracks,2.)*(1.2+.15*sin(uTime+land*20.));}
  if(uMaterial>1.5&&uMaterial<2.5){float ice=fbm(material*6.);float seams=1.-smoothstep(.01,.055,abs(fbm(material*18.)-.51));base=mix(vec3(.025,.13,.25),vec3(.62,.82,.87),smoothstep(.3,.65,ice));base*=1.-seams*.5;emission=vec3(.05,.55,1.)*seams*.24;spec=pow(max(0.,dot(reflect(-uLight,n),vec3(0,0,1))),65.)*.75;}
  if(uMaterial>2.5&&uMaterial<3.5){float islands=fbm(material*4.8);float coast=1.-smoothstep(.005,.045,abs(islands-.52));float cells=pow(noise(material*180.),14.);base=mix(vec3(.005,.025,.06),vec3(.01,.15,.12),smoothstep(.48,.55,islands));emission=(vec3(.06,1.,.64)*coast*.7+vec3(.25,.5,1.)*cells*.8)*(1.-day*.5);spec=pow(max(0.,dot(reflect(-uLight,n),vec3(0,0,1))),42.)*.3;}
  if(uMaterial>3.5){float stone=fbm(material*9.);float grain=fbm(material*80.);float veins=1.-smoothstep(.006,.025,abs(fbm(material*11.+stone*2.)-.5));base=mix(vec3(.002,.003,.005),vec3(.021,.024,.029),stone)*(.75+.4*grain);vec3 gold=pow(uAccent,vec3(2.2));base=mix(base,gold*.22,veins*.55);emission=gold*veins*.26;spec=pow(max(0.,dot(reflect(-uLight,n),vec3(0,0,1))),85.)*.25;}
  // Ecosystem palettes are opt-in. Existing creator materials retain their original colors.
  if(uBrandEnabled>.5){
   vec3 primary=pow(uBrandPrimary,vec3(2.2)),secondary=pow(uBrandSecondary,vec3(2.2));
   if(uMaterial<.5){float band=dot(tex,vec3(.2126,.7152,.0722));base=mix(secondary*.24,primary,smoothstep(.12,.82,band));}
   else if(uMaterial<1.5){float terrain=fbm(material*5.);float lava=1.-smoothstep(.014,.065,abs(fbm(material*12.+terrain*4.)-.49));base=mix(secondary*.012,primary*.16,terrain);emission=mix(secondary,primary,lava)*pow(lava,2.)*(1.25+.15*sin(uTime+terrain*20.));}
   else if(uMaterial<2.5){float ice=fbm(material*6.);float seams=1.-smoothstep(.01,.055,abs(fbm(material*18.)-.51));base=mix(secondary*.23,primary,smoothstep(.25,.65,ice))*(1.-seams*.45);emission=primary*seams*.22;spec*=.45;}
   else{float islands=fbm(material*4.8);float coast=1.-smoothstep(.005,.045,abs(islands-.52));float cells=pow(noise(material*180.),14.);base=mix(secondary*.22,primary*.24,smoothstep(.48,.55,islands));emission=(primary*coast*.9+secondary*cells*1.3)*(1.-day*.5);}
  }
  }
  if(uRealTerrain>.5){
   // Real source-map relief survives the brand treatment: craters, coastlines
   // and gas bands remain readable under a directional key and soft fill.
   vec2 step=vec2(.0015,0.);vec3 weight=vec3(.299,.587,.114);
   float du=dot(texture2D(uMap,uv+step).rgb-texture2D(uMap,uv-step).rgb,weight);
   float dv=dot(texture2D(uMap,uv+step.yx).rgb-texture2D(uMap,uv-step.yx).rgb,weight);
   vec3 tangent=normalize(vec3(-material.z,0.,material.x)+vec3(.0001,0.,0.));
   vec3 bitangent=normalize(cross(normalize(material),tangent));
   vec3 terrainNormal=normalize(n-rotateY(tangent*du+bitangent*dv,-uTime*.15)*(uSurface>1.5?.55:1.6));
   light=dot(terrainNormal,normalize(uLight));diff=max(0.,light);day=smoothstep(-.08,.25,light);
   float lum=dot(tex,weight),detail=.91+.09*noise(material*175.);
   vec3 neutral=pow(tex,vec3(2.2));
   base=neutral*detail;emission=vec3(0.);
   if(uMaterial>.5&&uMaterial<1.5){
    base=pow(mix(tex,tex*vec3(1.08,.76,.52),.44),vec3(2.2))*.62*detail;
    float terrain=fbm(material*5.),seam=1.-smoothstep(.004,.018,abs(fbm(material*18.+terrain)-.50));
    float molten=seam*seam*smoothstep(.52,.76,terrain);
    emission=vec3(1.,.17,.018)*molten*.62;
   }else if(uMaterial>1.5&&uMaterial<2.5){
    vec3 ice=mix(vec3(.40,.43,.50),uBrandPrimary,.27)*(.26+lum*.93);
    base=pow(ice,vec3(2.2))*detail;
    float seam=1.-smoothstep(.005,.023,abs(fbm(material*20.)-.5));
    emission=pow(uAccent,vec3(2.2))*seam*.018;
   }else if(uMaterial>2.5&&uMaterial<3.5){
    float ocean=smoothstep(.02,.15,tex.b-max(tex.r,tex.g)*.80);
    vec3 land=mix(tex,tex*mix(vec3(1.),uBrandPrimary*1.25,.35),.30);
    vec3 water=mix(tex,vec3(.035,.12,.105),.66);
    base=pow(mix(land,water,ocean),vec3(2.2))*detail;
    float coast=(1.-smoothstep(.025,.11,abs(tex.b-max(tex.r,tex.g)*.80-.065)));
    emission=pow(uAccent,vec3(2.2))*coast*(1.-day)*.025;
    float cloud=pow(texture2D(uCloud,sphereUV(rotateY(n,uTime*.153))).r,1.65)*uHasCloud;
    base=mix(base,vec3(.55,.59,.61),cloud*.34);
   }else if(uSurface>1.5){
    vec3 bands=mix(tex,vec3(lum)*mix(vec3(.70,.76,.67),uBrandPrimary,.26),.57);
    base=pow(bands,vec3(2.2))*detail;
   }else if(uMaterial>3.5){
    base=mix(vec3(.004,.009,.018),vec3(.027,.045,.065),smoothstep(.18,.72,lum))*detail;
   }
   spec=pow(max(0.,dot(reflect(-normalize(uLight),terrainNormal),vec3(0,0,1))),54.)*(uSurface>1.5?.035:.055);
  }
  if(uIdentity>.5){
   float identityAngle=(uTime-6.4)*.15+(uIdentity>4.5&&uIdentity<5.5?.48:0.);
   vec3 face=rotateY(n,identityAngle);vec2 q=face.xy;float front=smoothstep(.04,.28,face.z);
   vec3 bump=vec3(noise(face*28.+vec3(.2,0,0))-noise(face*28.-vec3(.2,0,0)),noise(face*28.+vec3(0,.2,0))-noise(face*28.-vec3(0,.2,0)),noise(face*28.+vec3(0,0,.2))-noise(face*28.-vec3(0,0,.2)));
   vec3 satinNormal=rotateY(uIdentity>4.5&&uIdentity<5.5?fleeceNormal(face,face):normalize(face-bump*.035),-identityAngle);light=dot(satinNormal,uLight);diff=max(0.,light);
   float terrain=fbm(face*8.),rough=.97+.045*terrain;emission=vec3(0.);
   spec=pow(max(0.,dot(reflect(-normalize(uLight),satinNormal),vec3(0,0,1))),38.)*.045;
   if(uIdentity<1.5){
    // BONK: cream brows, sleepy crescents, asymmetric muzzle and no mouth.
    float muzzle=max(ellipseMask(q,vec2(-.27,-.30),vec2(.53,.43),.025),ellipseMask(q,vec2(.30,-.25),vec2(.53,.43),.025));
    float cheek=ellipseMask(q,vec2(0.,-.45),vec2(.81,.42),.025),pale=max(muzzle,cheek)*front;
    base=mix(vec3(1.,.105,.0003),vec3(1.,.97,.76),pale)*rough;
    vec2 left=q-vec2(-.35,.44),right=q-vec2(.34,.47);
    float brows=max(ellipseMask(vec2(left.x*.98-left.y*.20,left.x*.20+left.y*.98),vec2(0.),vec2(.14,.065),.025),ellipseMask(vec2(right.x*.97+right.y*.24,-right.x*.24+right.y*.97),vec2(0.),vec2(.14,.065),.025))*front;
    base=mix(base,vec3(1.,.97,.76),brows);
    float el=ellipseMask(q,vec2(-.35,.22),vec2(.105,.065),.04)*(1.-ellipseMask(q,vec2(-.378,.255),vec2(.082,.063),.04));
    float er=ellipseMask(q,vec2(.33,.25),vec2(.102,.066),.04)*(1.-ellipseMask(q,vec2(.302,.286),vec2(.082,.063),.04));
    base=mix(base,vec3(.003,.004,.006),max(el,er)*front);
   }else if(uIdentity<2.5){
    // PENGU's bright periwinkle shell and white heart-shaped face.
    float cheeks=max(ellipseMask(q,vec2(-.25,.24),vec2(.43,.49),.025),ellipseMask(q,vec2(.25,.24),vec2(.43,.49),.025));
    float chest=ellipseMask(q,vec2(0.,-.35),vec2(.72,.58),.025),white=max(cheeks,chest)*front;
    base=mix(vec3(.20,.32,.78),vec3(.96,.985,1.),white)*rough;
    float eyes=max(ellipseMask(q,vec2(-.275,.285),vec2(.079,.105),.04),ellipseMask(q,vec2(.275,.285),vec2(.079,.105),.04))*front;
    base=mix(base,vec3(.004,.012,.022),eyes);
    float gleam=max(ellipseMask(q,vec2(-.295,.32),vec2(.025,.032),.04),ellipseMask(q,vec2(.255,.32),vec2(.025,.032),.04))*front;
    base=mix(base,vec3(.96,.99,1.),gleam);
   }else if(uIdentity<3.5){
    // WIF keeps a tan Shiba face, dark almond eyes and a modest muzzle.
    float cheeks=max(ellipseMask(q,vec2(-.28,-.30),vec2(.40,.40),.035),ellipseMask(q,vec2(.28,-.30),vec2(.40,.40),.035));
    float muzzle=ellipseMask(q,vec2(0.,-.25),vec2(.42,.36),.035),pale=max(cheeks,muzzle)*front;
    base=mix(vec3(.53,.32,.13),vec3(.94,.85,.64),pale)*rough;
    float bridge=ellipseMask(q,vec2(0.,.08),vec2(.16,.33),.10)*front;base=mix(base,vec3(.65,.43,.20),bridge*.25);
    vec2 el=q-vec2(-.32,.25),er=q-vec2(.32,.25);
    float eyes=max(ellipseMask(vec2(el.x-el.y*.22,el.y+el.x*.22),vec2(0.),vec2(.12,.084),.05),ellipseMask(vec2(er.x+er.y*.22,er.y-er.x*.22),vec2(0.),vec2(.12,.084),.05))*front;
    base=mix(base,vec3(.004,.006,.008),eyes);
    float gleam=max(ellipseMask(q,vec2(-.35,.272),vec2(.021,.021),.05),ellipseMask(q,vec2(.29,.272),vec2(.021,.021),.05))*front;base=mix(base,vec3(.72,.80,.86),gleam);
    float smile=(1.-smoothstep(.007,.015,abs(q.y+.27-.90*q.x*q.x)))*(1.-smoothstep(.14,.18,abs(q.x)))*front;
    base=mix(base,vec3(.035,.025,.018),smile*.48);
   }else if(uIdentity<4.5){
    // POPCAT: pale face, taupe cap, tiny pink nose and a broad open O.
    float cream=ellipseMask(q,vec2(0.,-.20),vec2(.84,.86),.035)*front;
    base=mix(vec3(.35,.245,.18),vec3(.98,.94,.82),cream)*rough;
    float r=length((q-vec2(0.,-.235))/vec2(.535,.505));
    float mouth=(1.-smoothstep(.84,.88,r))*front;
    float rim=(1.-smoothstep(.025,.058,abs(r-.94)))*front;
    base=mix(base,vec3(.37,.13,.11),rim*.8);
    vec3 cavity=mix(vec3(.012,.0015,.003),vec3(.095,.011,.018),smoothstep(.1,.95,-q.y));
    base=mix(base,cavity,mouth);
    float eyes=max(ellipseMask(q,vec2(-.35,.37),vec2(.115,.053),.05),ellipseMask(q,vec2(.35,.37),vec2(.115,.053),.05))*front;
    base=mix(base,vec3(.025,.018,.016),eyes);
    float nose=ellipseMask(q,vec2(0.,.29),vec2(.085,.047),.04)*front;base=mix(base,vec3(.50,.25,.23),nose);
   }else if(uIdentity<5.5){
    // A fleece-covered world, rather than a smooth globe with a painted stripe.
    base=fleeceBase(face);spec*=.15;
   }else if(uIdentity<6.5){
    // A tailored navy globe anchors the dimensional portrait and swept blond crown.
    float weave=.985+.015*sin(face.x*210.)*sin(face.y*210.);
    base=vec3(.012,.025,.053)*rough*weave;
    float lapels=max(triangleMask(q,vec2(-.52,-.28),vec2(-.30,-.69),vec2(-.04,-.89)),triangleMask(q,vec2(.52,-.28),vec2(.30,-.69),vec2(.04,-.89)))*front;
    base=mix(base,vec3(.024,.043,.077),lapels);
    float shirt=triangleMask(q,vec2(-.29,-.35),vec2(.29,-.35),vec2(0.,-.77))*front;
    base=mix(base,vec3(.84,.875,.90),shirt);
    float collar=max(triangleMask(q,vec2(-.35,-.32),vec2(-.022,-.39),vec2(-.15,-.59)),triangleMask(q,vec2(.35,-.32),vec2(.022,-.39),vec2(.15,-.59)))*front;
    base=mix(base,vec3(.96,.97,.98),collar);
    float knot=triangleMask(q,vec2(-.073,-.407),vec2(.073,-.407),vec2(0.,-.52));
    float tie=max(triangleMask(q,vec2(-.043,-.49),vec2(.043,-.49),vec2(.076,-.77)),triangleMask(q,vec2(-.043,-.49),vec2(.076,-.77),vec2(-.076,-.77)));
    tie=max(tie,triangleMask(q,vec2(-.076,-.77),vec2(.076,-.77),vec2(0.,-.86)));
    vec3 silk=mix(vec3(.38,.006,.014),vec3(.68,.024,.032),1.-smoothstep(-.07,.08,q.x));
    base=mix(base,silk,max(knot,tie)*front);
   }else{
    // GATTO: a satin-black cat, warm almond eyes and restrained whiskers.
    base=vec3(.013,.017,.025)*rough;
    float cheeks=max(ellipseMask(q,vec2(-.18,-.19),vec2(.28,.21),.10),ellipseMask(q,vec2(.18,-.19),vec2(.28,.21),.10))*front;
    base=mix(base,vec3(.027,.030,.037)*rough,cheeks*.67);
    vec2 left=q-vec2(-.32,.235),right=q-vec2(.32,.235);
    vec2 el=vec2(left.x*.995-left.y*.10,left.x*.10+left.y*.995)/vec2(.205,.137);
    vec2 er=vec2(right.x*.995+right.y*.10,-right.x*.10+right.y*.995)/vec2(.205,.137);
    float edge=max(.055,uPixel*4.);
    float eyes=max(1.-smoothstep(1.-edge,1.+edge,abs(el.y)+el.x*el.x),1.-smoothstep(1.-edge,1.+edge,abs(er.y)+er.x*er.x))*front;
    vec3 amber=mix(vec3(.52,.205,.012),vec3(1.,.62,.12),smoothstep(.11,.34,q.y));
    base=mix(base,amber,eyes);emission+=vec3(.028,.011,.001)*eyes;
    float pupils=max(ellipseMask(q,vec2(-.32,.235),vec2(.035,.117),.07),ellipseMask(q,vec2(.32,.235),vec2(.035,.117),.07))*eyes;
    base=mix(base,vec3(.0015,.002,.003),pupils);emission*=1.-pupils;
    float glints=max(ellipseMask(q,vec2(-.365,.280),vec2(.020,.023),.04),ellipseMask(q,vec2(.275,.280),vec2(.020,.023),.04))*eyes;
    base=mix(base,vec3(1.,.95,.79),glints);
    float mouthX=abs(q.x)-.085;
    float smile=(1.-smoothstep(.005,.010,abs(q.y+.235-3.5*mouthX*mouthX)))*(1.-smoothstep(.15,.19,abs(q.x)));
    float stem=(1.-smoothstep(.004,.009,abs(q.x)))*smoothstep(-.225,-.210,q.y)*(1.-smoothstep(-.16,-.15,q.y));
    base=mix(base,vec3(.003,.004,.006),max(smile,stem)*front*.75);
    float x=abs(q.x),span=smoothstep(.30,.35,x)*(1.-smoothstep(.61,.69,x));
    float whiskers=min(min(abs(q.y+.15-(x-.33)*.20),abs(q.y+.23)),abs(q.y+.30+(x-.33)*.20));
    float whisker=(1.-smoothstep(max(.003,uPixel*.35),max(.006,uPixel*.75),whiskers))*span*front;
    base=mix(base,vec3(.12,.095,.060),whisker*.48);
   }
  }
  if(uSolhandle>.5){
   // The official mark belongs to the curved, rotating surface. It is not a
   // screen-space badge, and it never enters the animal-sculpture branches.
   vec3 face=rotateY(n,(uTime-6.4)*.15);vec2 q=face.xy;
   float shell=.96+.04*noise(face*65.);
   base=mix(vec3(.004,.008,.018),vec3(.015,.025,.048),.5+.5*face.y)*shell;
   if(uRealTerrain>.5){float terrain=dot(tex,vec3(.299,.587,.114));base=mix(vec3(.003,.007,.015),vec3(.025,.043,.064),smoothstep(.18,.70,terrain))*(.93+.07*noise(face*145.));}
   float latitude=1.-smoothstep(.009,.018,abs(sin(asin(clamp(face.y,-1.,1.))*12.)));
   float longitude=1.-smoothstep(.012,.025,abs(sin(atan(face.z,face.x)*10.)));
   vec3 signal=mix(vec3(.20,.76,.97),vec3(.65,.33,.94),.5+.5*face.x);
   emission=signal*max(latitude,longitude)*.012;
   vec2 markUV=vec2(q.x,-q.y)/2.35+vec2(.505,.55);
   vec3 mark=texture2D(uEmblem,clamp(markUV,vec2(.001),vec2(.999))).rgb;
   float peak=max(mark.r,max(mark.g,mark.b));
   float front=smoothstep(.03,.24,face.z);
   float edge=1.-smoothstep(.88,.985,length(q));
   // The source artwork has an opaque midnight background. A luminance key
   // and a soft circular boundary preserve its neon detail without a square.
   float ink=smoothstep(.055,.18,peak)*front*edge*uHasEmblem;
   base=mix(base,pow(mark,vec3(2.2))*.27,ink);
   emission+=pow(mark,vec3(1.45))*ink*(uRealTerrain>.5?.66:.82);
   spec=pow(max(0.,dot(reflect(-normalize(uLight),n),vec3(0,0,1))),70.)*.11;
  }
  if(uIdentity<.5&&uRefined<.5&&uSolhandle<.5&&uRealTerrain<.5){float relief=fbm(material*35.);base*=.83+.35*relief;}
  col=base*(.025+diff*1.28)+spec*vec3(.9,.94,1.)+emission;
  if(uRealTerrain>.5){float softDiffuse=.5*(light+sqrt(light*light+.025));col=base*(.035+softDiffuse*1.03)+spec*vec3(.85,.91,1.)*.65+emission;}
  if(uRefined>.5){float fill=.045+.045*z,softDiffuse=.5*(light+sqrt(light*light+.035));col=base*(fill+softDiffuse*1.12)+spec*vec3(.83,.91,1.)*.6+emission*.7;}
  if(uIdentity>.5){float fill=.17+.055*z,softDiffuse=.5*(light+sqrt(light*light+.06));col=base*(fill+softDiffuse*.91)+spec*vec3(.96,.98,1.)+emission;}
  if(uIdentity<.5&&uWeather>.5&&uHasCloud>.5){vec2 cuv=sphereUV(rotateY(n,uTime*.165));vec4 cloud=texture2D(uCloud,cuv);float c=pow(cloud.r,1.3)*(uRefined>.5?.58:.8);col=mix(col,vec3(.74,.83,.93)*(.08+diff),c*(uMaterial>.5?.4:1.));}
  float rim=pow(1.-z,3.7)*(.16+diff*.85)*strength;if(uRefined>.5)rim=pow(1.-z,5.)*(.025+diff*.20)*strength;if(uRealTerrain>.5)rim=pow(1.-z,5.5)*(.012+diff*.10);col+=atm*rim;col=pow(max(col,vec3(0.)),vec3(.4545));alpha=1.-smoothstep(uRefined>.5||uRealTerrain>.5?1.-uPixel:.993,1.,d);
 }
 if(uRings>.5){
  vec3 rn=normalize(vec3(.22,.81,.43));float rz=-(rn.x*p.x+rn.y*p.y)/rn.z;float rad=length(vec3(p,rz));
  float outer=uRings<1.5?1.51:uRings<2.5?1.86:1.95;
  float edge=max(.003,uPixel*1.5);
  float ring=smoothstep(1.24-edge,1.24+edge,rad)*(1.-smoothstep(outer-edge,outer+edge,rad));
  float fine=.58+.42*(.5+.5*sin(rad*170.))*max(.25,1.-uPixel*25.);
  if(uRings>2.5&&uRings<3.5)ring=1.-smoothstep(.014,.014+edge,abs(rad-1.59));
  else if(uRings>3.5&&uRings<4.5)ring=1.-smoothstep(.017,.017+edge,min(abs(rad-1.43),abs(rad-1.81)));
  else if(uRings>5.5&&uRings<6.5){
   float bands=min(min(abs(rad-1.38),abs(rad-1.47)),min(abs(rad-1.73),abs(rad-1.82)));
   ring=(1.-smoothstep(.007,.007+edge,bands))*.85;
  }else if(uRings>6.5){
   float angle=atan(rz,p.x),sector=floor((angle+3.14159265)*66.);
   float grain=hash(vec3(sector,floor(rad*52.),2.));
   float rocks=smoothstep(.54,.8,grain)*(.4+.6*noise(vec3(p*135.,rz*135.)));
   ring*=rocks*.75;
  }else{
   ring*=fine;
   ring*=1.-(smoothstep(1.59-edge,1.59+edge,rad)*(1.-smoothstep(1.64-edge,1.64+edge,rad)));
   if(uRings>4.5)ring*=.35+.65*noise(vec3(p*100.,rz*100.));
  }
  if(uIdentity>5.5&&uIdentity<6.5)ring=1.-smoothstep(.012,.012+edge,abs(rad-1.49));
  bool particulate=uRealTerrain>.5&&((uRings>1.5&&uRings<2.5)||(uRings>4.5&&uRings<5.5));
  if(particulate){
   float envelope=smoothstep(1.24,1.31,rad)*(1.-smoothstep(outer-.09,outer+.015,rad));
   float density=.30+.38*noise(vec3(rad*13.,1.7,3.4))+.32*noise(vec3(rad*43.,4.3,8.1));
   float grains=.75+.25*noise(vec3(p*190.,rz*190.));
   float gap=1.-smoothstep(.012,.033,abs(rad-1.61));
   ring=envelope*density*grains*(1.-gap*.84)*(uRings>4.5?.68:1.);
  }
  if(rr<1.&&rz<z)ring=0.;
  vec3 rp=vec3(p,rz);float along=dot(rp,uLight);float shadow=along<0.&&dot(rp,rp)-along*along<1.?.13:1.;
  if(particulate){float distance=sqrt(max(0.,dot(rp,rp)-along*along));shadow=mix(mix(.18,1.,smoothstep(.88,1.08,distance)),1.,smoothstep(-.06,.08,along));}
  vec3 ringCol=mix(vec3(.74,.69,.58),uAccent,.37)*shadow*(.7+.3*sin(rad*180.));if(uRings>2.5&&uRings<4.5)ringCol=mix(uAccent,vec3(1.),.16)*shadow;
  if(uBrandEnabled>.5)ringCol=uBrandRing*shadow*(.76+.24*sin(rad*180.));
  if(uRealTerrain>.5){vec3 mineral=mix(uBrandRing,vec3(dot(uBrandRing,vec3(.299,.587,.114))),.42);ringCol=mineral*mix(.35,1.,shadow)*(.72+.20*sin(rad*180.)+.08*noise(vec3(p*155.,rz*155.)));}
  if(particulate){vec3 mineral=mix(uBrandRing,vec3(dot(uBrandRing,vec3(.299,.587,.114))),.50);ringCol=mineral*shadow*(.79+.21*noise(vec3(rad*31.,2.7,5.1)));}
  if(uSolhandle>.5){
   float arc=atan(rz,p.x),dash=.68+.32*smoothstep(.0,.25,sin(arc*32.+uTime*.12));
   ring*=dash;ringCol=mix(vec3(.36,.87,.97),vec3(.72,.58,.98),.5+.5*sin(arc+.3))*mix(.42,1.,shadow);
  }
  if(uIdentity>5.5&&uIdentity<6.5)ringCol=mix(vec3(.55,.34,.12),vec3(1.,.82,.46),.55+.30*dot(normalize(rp),normalize(uLight)))*shadow;
  float ra=ring*(uRings>2.5?.92:.8);col=(col*alpha*(1.-ra)+ringCol*ra)/max(.0001,alpha*(1.-ra)+ra);alpha=alpha+(1.-alpha)*ra;
 }
 if(uIdentity>.5){
  float angle=(uTime-6.4)*.15+(uIdentity>4.5&&uIdentity<5.5?.48:0.);vec3 ro=rotateY(vec3(p,3.),angle),rd=rotateY(vec3(0,0,-1),angle);
  float depth=rr<1.?3.-z:100.;
  if(uIdentity<1.5){
   putCone(ro,rd,vec3(-.44,.25,-.015),vec3(.47,1.08,.31),angle,depth,col,alpha);
   putCone(ro,rd,vec3(.44,.25,-.015),vec3(.47,1.12,.31),angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(.035,-.045,1.005),vec3(.155,.108,.11),10.,angle,depth,col,alpha);
  }else if(uIdentity<2.5){
   putEllipsoid(ro,rd,vec3(-.91,-.15,-.02),vec3(.18,.43,.23),4.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(.91,-.15,-.02),vec3(.18,.43,.23),4.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(0.,.025,1.005),vec3(.145,.075,.10),3.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(-.32,-.91,.12),vec3(.24,.12,.22),3.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(.32,-.91,.12),vec3(.24,.12,.22),3.,angle,depth,col,alpha);
  }else if(uIdentity<3.5){
   putTiltedEllipsoid(ro,rd,vec3(-.06,.90,-.065),vec3(.84,.78,.81),.045,2.,angle,depth,col,alpha);
   putTiltedEllipsoid(ro,rd,vec3(0.,.66,.055),vec3(.965,.235,.88),.045,2.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(0.,-.075,1.005),vec3(.14,.108,.105),10.,angle,depth,col,alpha);
  }else if(uIdentity<4.5){
   putCone(ro,rd,vec3(-.49,.20,-.025),vec3(.46,1.08,.31),angle,depth,col,alpha);
   putCone(ro,rd,vec3(.49,.20,-.025),vec3(.46,1.08,.31),angle,depth,col,alpha);
  }else if(uIdentity<5.5){
   // The canonical camera-headed sheep becomes a small, woolly planetary sculpture.
   // Evenly distributed fleece lobes preserve its silhouette throughout rotation.
   for(int i=0;i<30;i++){
    float f=float(i),y=-.94+1.88*(f+.5)/30.,az=f*2.399963,rad=sqrt(1.-y*y);
    vec3 center=vec3(cos(az)*rad,y,sin(az)*rad)*.795;
    float tuft=.285+.013*sin(f*5.7);
    putWoolTuft(ro,rd,center,vec3(tuft,tuft*.94,tuft),angle,depth,col,alpha);
   }
   // Four woolly legs have staggered depth and spacing so the default pose reads clearly.
   // The slimmer rear pair tucks into the fleece and shares the front hooves' ground level.
   putEllipsoid(ro,rd,vec3(-.46,-.92,-.56),vec3(.13,.29,.15),9.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(.46,-.92,-.56),vec3(.13,.29,.15),9.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(-.505,-1.14,-.53),vec3(.067,.085,.14),14.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(-.415,-1.14,-.53),vec3(.067,.085,.14),14.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(.415,-1.14,-.53),vec3(.067,.085,.14),14.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(.505,-1.14,-.53),vec3(.067,.085,.14),14.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(-.39,-.91,.33),vec3(.16,.29,.17),9.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(.39,-.91,.33),vec3(.16,.29,.17),9.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(-.43,-1.14,.39),vec3(.083,.09,.15),14.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(-.33,-1.14,.39),vec3(.078,.09,.15),14.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(.34,-1.14,.39),vec3(.078,.09,.15),14.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(.44,-1.14,.39),vec3(.083,.09,.15),14.,angle,depth,col,alpha);
   // The collar wraps an actual raised neck; it no longer cuts across the globe.
   putEllipsoid(ro,rd,vec3(0.,.65,.63),vec3(.42,.48,.38),9.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(0.,.635,.64),vec3(.455,.105,.405),13.,angle,depth,col,alpha);
   putRoundedBox(ro,rd,vec3(.30,.635,.95),vec3(.065,.063,.025),.018,12.,angle,depth,col,alpha);
   putBox(ro,rd,vec3(.30,.635,.978),vec3(.035,.033,.005),13.,angle,depth,col,alpha);
   // Deep square-ended CCTV, complete with a projecting hood and compact lens.
   putRoundedBox(ro,rd,vec3(0.,1.065,.85),vec3(.335,.285,.365),.075,5.,angle,depth,col,alpha);
   putRoundedBox(ro,rd,vec3(0.,1.355,.89),vec3(.365,.043,.42),.028,5.,angle,depth,col,alpha);
   putCylinder(ro,rd,vec3(0.,1.055,1.24),vec3(.194,.194,.045),6.,angle,depth,col,alpha);
   putCylinder(ro,rd,vec3(0.,1.055,1.295),vec3(.16,.16,.025),6.,angle,depth,col,alpha);
   putCylinder(ro,rd,vec3(0.,1.055,1.326),vec3(.111,.111,.008),6.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(.257,1.255,1.223),vec3(.014,.014,.008),7.,angle,depth,col,alpha);
   for(int i=0;i<4;i++){
    vec2 side=vec2(i<2?-1.:1.,mod(float(i),2.)<.5?-1.:1.);
    putEllipsoid(ro,rd,vec3(side*vec2(.255,.21)+vec2(0.,1.065),1.22),vec3(.018,.018,.009),12.,angle,depth,col,alpha);
   }
   // U-bracket, side hinge, and the broad upward-facing solar array.
   putBox(ro,rd,vec3(.38,1.24,.56),vec3(.043,.30,.045),5.,angle,depth,col,alpha);
   putBox(ro,rd,vec3(0.,1.49,.56),vec3(.40,.035,.055),5.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(.40,1.10,.77),vec3(.05,.08,.08),12.,angle,depth,col,alpha);
   putBox(ro,rd,vec3(0.,1.51,.55),vec3(.07,.12,.07),5.,angle,depth,col,alpha);
   vec3 panelCenter=vec3(0.,1.67,.56),panelRo=rotateX(ro-panelCenter,-.46),panelRd=rotateX(rd,-.46),panelNormal;
   float panelHit=featureBox(panelRo,panelRd,vec3(0.),vec3(.62,.035,.405),panelNormal);
   if(panelHit>0.&&panelHit<depth){
    vec3 point=panelRo+panelHit*panelRd;
    float border=max(abs(point.x)/.62,abs(point.z)/.405);
    paintFeature(point,rotateX(panelNormal,.46),border>.94||abs(panelNormal.y)<.5?5.:11.,angle,col);depth=panelHit;alpha=1.;
   }
  }else if(uIdentity<6.5){
   // Face and features are actual curved surfaces, with a compact collectible silhouette.
   putEllipsoid(ro,rd,vec3(0.,.145,.735),vec3(.66,.67,.465),15.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(-.66,.18,.75),vec3(.081,.14,.105),15.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(.66,.18,.75),vec3(.081,.14,.105),15.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(0.,.215,1.16),vec3(.059,.115,.061),15.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(0.,.128,1.212),vec3(.081,.056,.052),15.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(-.255,.31,1.145),vec3(.108,.061,.034),16.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(.255,.31,1.145),vec3(.108,.061,.034),16.,angle,depth,col,alpha);
   putTiltedEllipsoid(ro,rd,vec3(-.255,.419,1.105),vec3(.133,.023,.029),.095,8.,angle,depth,col,alpha);
   putTiltedEllipsoid(ro,rd,vec3(.255,.419,1.105),vec3(.133,.023,.029),-.065,8.,angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(0.,-.143,1.158),vec3(.137,.018,.014),17.,angle,depth,col,alpha);
   // One full scalp and closely overlapping swept locks avoid the former stacked blobs.
   putTiltedEllipsoid(ro,rd,vec3(0.,.72,-.055),vec3(.85,.37,.81),-.025,8.,angle,depth,col,alpha);
   putTiltedEllipsoid(ro,rd,vec3(-.035,.925,.10),vec3(.79,.315,.72),.115,8.,angle,depth,col,alpha);
   putTiltedEllipsoid(ro,rd,vec3(-.095,.805,.64),vec3(.72,.17,.28),.19,8.,angle,depth,col,alpha);
   putTiltedEllipsoid(ro,rd,vec3(-.055,.91,.56),vec3(.68,.145,.28),.19,8.,angle,depth,col,alpha);
   putTiltedEllipsoid(ro,rd,vec3(-.005,1.008,.405),vec3(.61,.135,.29),.18,8.,angle,depth,col,alpha);
   putTiltedEllipsoid(ro,rd,vec3(.59,.69,.48),vec3(.20,.32,.28),-.25,8.,angle,depth,col,alpha);
  }else{
   putCone(ro,rd,vec3(-.47,.23,-.025),vec3(.43,1.17,.30),angle,depth,col,alpha);
   putCone(ro,rd,vec3(.47,.23,-.025),vec3(.43,1.17,.30),angle,depth,col,alpha);
   putEllipsoid(ro,rd,vec3(0.,-.095,1.005),vec3(.095,.067,.065),10.,angle,depth,col,alpha);
  }
 }
 if(identityFeatureKind>.5)col=featureColor(identityFeaturePoint,identityFeatureNormal,identityFeatureKind,identityFeatureAngle);
 gl_FragColor=vec4(col,clamp(alpha,0.,1.));
}`;
let gl=null,canvas=null,program=null,failed=false;const uniforms={},images=new Map(),textures=new Map();
function init(){if(gl)return true;if(failed)return false;try{canvas=document.createElement('canvas');canvas.width=canvas.height=1536;gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false,depth:false});if(!gl)throw Error();const compile=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error();gl.useProgram(program);const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const pos=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);for(const name of ['uPortraitMap','uPortraitContour','uHasPortrait','uRealTerrain','uPortraitAngle','uGattoMap','uHasGattoMap','uGattoMoon','uSolhandle','uHasEmblem','uEmblem','uIdentity','uRefined','uNatural','uAir','uPluto','uPixel','uBrandEnabled','uBrandPrimary','uBrandSecondary','uBrandRing','uMap','uCloud','uNight','uAccent','uLight','uTime','uSurface','uMaterial','uRings','uWeather','uAtmosphere','uHasMap','uHasCloud','uHasNight'])uniforms[name]=gl.getUniformLocation(program,name);canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;gl=null;window.dispatchEvent(new Event('parallax:planet-texture'));});return true;}catch{gl=null;failed=true;return false;}}
function sourceImage(file){let im=images.get(file);if(!im){im=new Image();im.crossOrigin='anonymous';im.onload=()=>{im.ready=true;window.dispatchEvent(new Event('parallax:planet-texture'));};im.src='/assets/globe/'+file;images.set(file,im);}return im;}
// A shaded Canvas fallback retains the identity if WebGL is unavailable.
function solhandleFallback(ctx,cx,cy,r,time){
 const im=sourceImage(solhandleEmblem),angle=(time-6.4)*.15;ctx.save();ctx.translate(cx,cy);
 const aura=ctx.createRadialGradient(0,0,r*.85,0,0,r*1.3);aura.addColorStop(0,'#5cdff700');aura.addColorStop(.5,'#5cdff726');aura.addColorStop(1,'#b894f900');ctx.fillStyle=aura;ctx.fillRect(-r*1.3,-r*1.3,r*2.6,r*2.6);
 const ink=ctx.createLinearGradient(-r*1.8,0,r*1.8,0);ink.addColorStop(0,'#5cdff7');ink.addColorStop(1,'#b894f9');
 const rings=front=>{ctx.save();ctx.rotate(-.25);ctx.strokeStyle=ink;ctx.lineWidth=Math.max(.7,r*.012);ctx.globalAlpha=.82;ctx.setLineDash([r*.065,r*.025]);for(const k of [1.43,1.81]){ctx.beginPath();ctx.ellipse(0,0,r*k,r*k*.40,0,front?0:Math.PI,front?Math.PI:Math.PI*2);ctx.stroke();}ctx.restore();};
 rings(false);ctx.save();ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.clip();
 const shell=ctx.createRadialGradient(-r*.4,-r*.4,0,r*.4,r*.3,r*1.65);shell.addColorStop(0,'#20334b');shell.addColorStop(.5,'#0b1528');shell.addColorStop(1,'#02050c');ctx.fillStyle=shell;ctx.fillRect(-r,-r,r*2,r*2);
 const front=Math.cos(angle);if(im.ready&&front>.02){ctx.save();ctx.translate(-Math.sin(angle)*r*.56,0);ctx.scale(front,1);ctx.globalCompositeOperation='screen';ctx.globalAlpha=Math.min(1,front*3);ctx.drawImage(im,-.505*2.35*r,-.55*2.35*r,2.35*r,2.35*r);ctx.restore();}
 const shade=ctx.createLinearGradient(-r,0,r,0);shade.addColorStop(0,'#00000000');shade.addColorStop(.6,'#00000010');shade.addColorStop(1,'#00000090');ctx.fillStyle=shade;ctx.fillRect(-r,-r,r*2,r*2);ctx.restore();
 ctx.strokeStyle=ink;ctx.lineWidth=Math.max(.8,r*.009);ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();rings(true);ctx.restore();return true;
}
function texture(file,unit){gl.activeTexture(gl.TEXTURE0+unit);const im=sourceImage(file);let tx=textures.get(file);if(!tx){tx=gl.createTexture();textures.set(file,tx);gl.bindTexture(gl.TEXTURE_2D,tx);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([70,90,110,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);}gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,tx);if(im.ready&&!im.uploaded){gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im);const pot=v=>Number.isInteger(v)&&v>0&&(v&(v-1))===0;if(pot(im.naturalWidth)&&pot(im.naturalHeight)){gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);}im.uploaded=true;}return !!im.ready;}
// Portrait views turn naturally through the verified photographic range.
// Manual input uses the inverse helper, so its direction never follows a sine
// derivative and no hidden overscroll accumulates at either bound.
const portraitLimit=24*Math.PI/180;
const isPortrait=style=>typeof style?.identity==='string'&&Object.hasOwn(portraitFiles,style.identity);
const clampPortraitYaw=yaw=>Math.max(-portraitLimit,Math.min(portraitLimit,Number.isFinite(yaw)?yaw:0));
const portraitAngle=phase=>portraitLimit*Math.sin(((Number.isFinite(phase)?phase:6.4)-6.4)*.15/portraitLimit);
function portraitPhaseForYaw(yaw,previousPhase=6.4){
 const theta=((Number.isFinite(previousPhase)?previousPhase:6.4)-6.4)*.15/portraitLimit;
 let next=Math.asin(clampPortraitYaw(yaw)/portraitLimit);
 if(Math.cos(theta)<0)next=Math.PI-next;
 next+=Math.round((theta-next)/(2*Math.PI))*2*Math.PI;
 return 6.4+next*portraitLimit/.15;
}
function draw(ctx,cx,cy,r,design,time,premium,options={}){
 const solhandle=premium?.identity==='solhandle',gatto=premium?.identity==='gatto',portraitFile=typeof premium?.identity==='string'&&Object.hasOwn(portraitFiles,premium.identity)?portraitFiles[premium.identity]:null;if(solhandle)sourceImage(solhandleEmblem);if(gatto)sourceImage(gattoFace);if(portraitFile){sourceImage(portraitFile);sourceImage(premium.identity+'-realism-contour-v209.png');}
 if(!init())return solhandle&&premium?.realism!=='terrain-v209'?solhandleFallback(ctx,cx,cy,r,time):false;
 try{
  const d=decodePlanet(design),s=premium||{},isSolar=design?.startsWith('solar-');
  const palette=s.palette,branded=!!palette&&['primary','secondary','ring'].every(key=>typeof palette[key]==='string'&&/^#[a-f0-9]{6}$/i.test(palette[key]));
  const original=!['volcanic','glacial','biolume','obsidian'].includes(s.surface);
  // Natural worlds use the same complete surface in every renderer consumer.
  // Studio's display profile is transient; it never enters saved Premium styles.
  const natural=isSolar&&original&&!branded&&!s.accent;
  const refined=original&&!branded&&(isSolar||options.profile==='studio'||s.optics==='atlas');
  const matrix=ctx.getTransform?.(),density=matrix?Math.max(Math.hypot(matrix.a,matrix.b),Math.hypot(matrix.c,matrix.d)):1;
  const accent=s.accent||planetPalette[d.index][1],size=Math.min(refined?1536:1200,Math.max(128,Math.ceil(r*4.1*(Number.isFinite(density)?density:1))));
  gl.viewport(0,0,size,size);gl.useProgram(program);
  const file=s.identity==='sheeple'?'sheeple-fleece-v194.png':isSolar?realPlanetMaps[design.slice(6)]:({earth:'2k_earth_daymap.jpg',rocky:'2k_mars.jpg',gas:'2k_jupiter.jpg'}[d.surface]);
  const hasMap=texture(file||'2k_earth_daymap.jpg',0),hasCloud=texture('2k_earth_clouds.jpg',1),hasNight=texture('2k_earth_nightmap.jpg',2);
  for(const [u,v] of [['uMap',0],['uCloud',1],['uNight',2]])gl.uniform1i(uniforms[u],v);
  const hasEmblem=solhandle?texture(solhandleEmblem,3):false,hasGattoMap=gatto?texture(gattoFace,4):false;
  gl.uniform1i(uniforms.uGattoMap,gatto?4:0);gl.uniform1f(uniforms.uHasGattoMap,hasGattoMap?1:0);gl.uniform1f(uniforms.uGattoMoon,gatto&&s.moons>0?1:0);
  const hasPortraitMap=portraitFile?texture(portraitFile,5):false,hasContour=portraitFile?texture(s.identity+'-realism-contour-v209.png',6):false,hasPortrait=hasPortraitMap&&hasContour;
  gl.uniform1f(uniforms.uPortraitAngle,portraitFile?(Number.isFinite(options.portraitYaw)?clampPortraitYaw(options.portraitYaw):portraitAngle(time)):0);
  gl.uniform1i(uniforms.uPortraitMap,portraitFile?5:0);gl.uniform1i(uniforms.uPortraitContour,portraitFile?6:0);gl.uniform1f(uniforms.uHasPortrait,hasPortrait?1:0);gl.uniform1f(uniforms.uRealTerrain,s.realism==='terrain-v209'&&!isSolar?1:0);
  // Every active sampler needs a complete texture, even when its branch is off.
  gl.uniform1i(uniforms.uEmblem,solhandle?3:0);gl.uniform1f(uniforms.uSolhandle,solhandle?1:0);gl.uniform1f(uniforms.uHasEmblem,hasEmblem?1:0);
  gl.uniform3fv(uniforms.uAccent,accent.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16)/255));
  gl.uniform1f(uniforms.uBrandEnabled,branded?1:0);
  const identities={bonk:1,pengu:2,wif:3,popcat:4,sheeple:5,trump:6,gatto:7};
  gl.uniform1f(uniforms.uIdentity,typeof s.identity==='string'&&Object.hasOwn(identities,s.identity)?identities[s.identity]:0);
  for(const [key,name] of [['primary','uBrandPrimary'],['secondary','uBrandSecondary'],['ring','uBrandRing']])gl.uniform3fv(uniforms[name],branded?palette[key].slice(1).match(/.{2}/g).map(v=>parseInt(v,16)/255):[0,0,0]);
  const lights=refined?{studio:[-.48,.36,.80],sunrise:[-.85,.24,.47],dusk:[.72,.29,.49]}:{studio:[-.65,.45,.62],sunrise:[-.91,.18,.32],dusk:[.75,.25,.23]};
  const light=lights[s.lighting]||lights.studio;
  gl.uniform3fv(uniforms.uLight,refined?light.map(v=>v/Math.hypot(...light)):light);
  const air={mercury:.035,venus:.55,earth:1,moon:.025,mars:.13,jupiter:.28,europa:.04,saturn:.24,uranus:.58,neptune:.52,pluto:.06};
  gl.uniform1f(uniforms.uRefined,refined?1:0);gl.uniform1f(uniforms.uNatural,natural?1:0);
  gl.uniform1f(uniforms.uAir,refined?(isSolar?air[design.slice(6)]??.1:{earth:1,gas:.35,rocky:.08}[d.surface]):1);
  gl.uniform1f(uniforms.uPluto,original&&design==='solar-pluto'?1:0);gl.uniform1f(uniforms.uPixel,4.1/size);
  const rings=s.rings&&s.rings!=='inherit'?{none:0,halo:3,double:4,dust:5,silk:6,asteroid:7}[s.rings]:({none:0,thin:1,wide:2}[d.rings]);
  for(const [u,v] of [['uTime',time],['uSurface',d.surface==='earth'?0:d.surface==='gas'?2:1],['uMaterial',{volcanic:1,glacial:2,biolume:3,obsidian:4}[s.surface]||0],['uRings',rings||0],['uWeather',s.surface==='obsidian'?0:d.weather==='clouds'?1:0],['uAtmosphere',s.atmosphere==='ion'?2:s.atmosphere==='vivid'?1:0],['uHasMap',hasMap?1:0],['uHasCloud',hasCloud?1:0],['uHasNight',hasNight?1:0]])gl.uniform1f(uniforms[u],v);
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,6);
  ctx.drawImage(canvas,0,canvas.height-size,size,size,cx-r*2.05,cy-r*2.05,r*4.1,r*4.1);return true;
 }catch{failed=true;gl=null;return false;}
}
function ready(design,premium){const portraitFile=typeof premium?.identity==='string'&&Object.hasOwn(portraitFiles,premium.identity)?portraitFiles[premium.identity]:null;if(portraitFile&&(!images.get(portraitFile)?.ready||!images.get(premium.identity+'-realism-contour-v209.png')?.ready))return false;if(premium?.identity==='gatto'&&!images.get(gattoFace)?.ready)return false;if(premium?.identity==='solhandle'&&!images.get(solhandleEmblem)?.ready)return false;if(failed)return true;const d=decodePlanet(design),file=premium?.identity==='sheeple'?'sheeple-fleece-v194.png':design?.startsWith('solar-')?realPlanetMaps[design.slice(6)]:({earth:'2k_earth_daymap.jpg',rocky:'2k_mars.jpg',gas:'2k_jupiter.jpg'}[d.surface]);return !!images.get(file)?.ready&&(!(d.weather==='clouds')||!!images.get('2k_earth_clouds.jpg')?.ready)&&!!images.get('2k_earth_nightmap.jpg')?.ready;}
window.ParallaxPlanetRenderer={draw,ready,isPortrait,portraitAngle,portraitPhaseForYaw,clampPortraitYaw,available:()=>!failed,shaders:{vertex,fragment}};
})();
