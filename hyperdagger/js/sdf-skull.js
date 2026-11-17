import * as THREE from 'three';

// The URL is an explicit override; otherwise retain the player's menu choice.
const RENDER_KEY = 'hyperDaggerRenderer';
function initialRenderer() {
  if (typeof location === 'undefined') return false;
  const choice = new URLSearchParams(location.search).get('skull');
  if (choice === 'sdf' || choice === 'classic') return choice === 'sdf';
  try { return localStorage.getItem(RENDER_KEY) === 'sdf'; } catch { return false; }
}
export let sdfSkullsEnabled = initialRenderer();
export function setSdfSkullsEnabled(on) {
  sdfSkullsEnabled = !!on;
  try { localStorage.setItem(RENDER_KEY, on ? 'sdf' : 'classic'); } catch {}
  // Clear the one-time URL override so reload agrees with the visible choice.
  if (typeof location !== 'undefined') {
    const url = new URL(location.href); url.searchParams.delete('skull');
    try { history.replaceState(null, '', url); } catch {}
  }
  return sdfSkullsEnabled;
}
const PROFILES = {
  skull: { id: 0, scale: 1.35 }, wraith: { id: 1, scale: 1.35 },
  splitter: { id: 2, scale: 1.75 }, mini: { id: 3, scale: 0.78 },
  dread: { id: 4, scale: 2.0 },
  watcher: { id: 5, scale: 1.15 }, totem: { id: 6, scale: 2.0, y: 1.9 },
};
const keyDirection = new THREE.Vector3(-.5,.8,1).normalize();
const fillColor = new THREE.Color(.18,.012,.004);
export function setSdfLighting(direction, color) {
  keyDirection.fromArray(direction).normalize();
  fillColor.fromArray(color).multiplyScalar(.18);
}
const geometry = new THREE.BoxGeometry(2.06, 1.9, 1.36);
const vertexShader = `
out vec3 localSurface;
void main() {
  localSurface = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const fragmentShader = `
precision highp float;
in vec3 localSurface;
out vec4 outColor;
#define gl_FragColor outColor
uniform vec3 eyeLocal;
uniform mat4 localToClip;
uniform float jawOpen;
uniform float flash;
uniform float profile;
uniform vec3 boneColor;
uniform vec3 eyeColor;
uniform float time;
uniform float charge;
uniform float woundCount;
uniform vec4 wounds[6];
uniform vec3 woundAxes[6];
uniform mat3 normalToWorld;
uniform vec3 keyDirection;
uniform vec3 fillColor;
float ellipsoid(vec3 p, vec3 r) {
  // Conservative lower bound; sphere tracing must never step past a surface.
  return (length(p / r) - 1.0) * min(r.x, min(r.y, r.z));
}
float capsule(vec3 p, vec3 a, vec3 b, float ra, float rb) {
  vec3 ba = b-a; float h = clamp(dot(p-a,ba)/dot(ba,ba),0.0,1.0);
  return (length(p-a-ba*h)-mix(ra,rb,h))*0.65;
}
float smoothUnion(float a, float b, float k) {
  float h = clamp(0.5+0.5*(b-a)/k,0.0,1.0);
  return mix(b,a,h)-k*h*(1.0-h);
}
float torus(vec3 p, vec2 t) { return length(vec2(length(p.xy)-t.x,p.z))-t.y; }
vec2 bodyField(vec3 p) {
  if(profile == 5.0) {
    // A floating orbital ring around a living iris, with bone outriggers.
    float ring=torus(p,vec2(.48,.11));
    vec3 sym=vec3(abs(p.x),p.y,p.z);
    ring=min(ring,capsule(sym,vec3(.43,-.12,0),vec3(.85,.21,-.06),.12,.025));
    float shell=ellipsoid(p-vec3(0,0,-.04),vec3(.35,.35,.21));
    shell=max(shell,-ellipsoid(p-vec3(0,0,.19),vec3(.27,.27,.19)));
    ring=min(ring,shell);
    float iris=ellipsoid(p-vec3(0,0,.10),vec3(.19+charge*.055,.23,.09));
    return iris<ring?vec2(iris,1):vec2(ring,0);
  }
  if(profile == 6.0) {
    // Open, segmented shell with a suspended breathing heart.
    float cyl=max(length(p.xz)-.48,abs(p.y)-.84);
    float hollow=max(length(p.xz)-.36,abs(p.y)-.94);
    float shell=max(cyl,-hollow);
    float seam=abs(sin(atan(p.z,p.x)*3.0+p.y*2.8+1.570796))-.52;
    shell=max(shell,-seam*.16);
    float collars=min(abs(p.y-.66),abs(p.y+.66));
    float rim=max(abs(length(p.xz)-.44)-.095,collars-.07);
    shell=min(shell,rim);
    float core=ellipsoid(p,vec3(.22+.025*sin(time*4.0)+charge*.04,.62,.22));
    return core<shell?vec2(core,1):vec2(shell,0);
  }
  float bone = ellipsoid(p-vec3(0,0.19,-0.08),vec3(0.48,0.52,0.43));
  bone = smoothUnion(bone,ellipsoid(p-vec3(0,-0.10,0.23),vec3(0.39,0.24,0.29)),0.10);
  vec3 sym = vec3(abs(p.x),p.y,p.z);
  bone = smoothUnion(bone,ellipsoid(sym-vec3(0.37,-0.03,0.23),vec3(0.17,0.18,0.20)),0.05);
  if (profile != 3.0) bone = smoothUnion(bone,capsule(sym,vec3(0.36,0.43,-0.08),vec3(0.91,0.79,-0.12),0.14,0.012),0.06);
  if (profile == 1.0 || profile == 4.0) {
    // Crowned and dread skulls retain a readable rank silhouette.
    bone=min(bone,capsule(sym,vec3(0.18,0.56,0.02),vec3(0.22,0.91,0.02),0.08,0.015));
    bone=min(bone,capsule(p,vec3(0,0.57,0.02),vec3(0,0.94,0.02),0.075,0.012));
  }
  if (profile == 2.0) {
    // A carved central cleft identifies the parent which splits into minis.
    bone=max(bone,-capsule(p,vec3(0,0.65,0.32),vec3(0,0.28,0.40),0.025,0.012));
  }
  // Carve real cavities, rather than painting eyes onto a sphere.
  float socket = ellipsoid(sym-vec3(0.235,0.16,0.405),vec3(0.16,0.17,0.235));
  bone = max(bone,-socket);
  bone = max(bone,-ellipsoid(p-vec3(0,-0.07,0.48),vec3(0.075,0.12,0.14)));
  bone = max(bone,-ellipsoid(p-vec3(0,-0.27,0.27),vec3(0.30,0.10,0.30)));
  // Inverse hinge rotation; lower jaw opens with the existing enemy bite.
  vec3 q=p-vec3(0,-0.30,-0.12);
  float c=cos(jawOpen), s=sin(jawOpen);
  q.yz=mat2(c,-s,s,c)*q.yz;
  q+=vec3(0,-0.30,-0.12);
  float jaw=ellipsoid(q-vec3(0,-0.43,0.16),vec3(0.36,0.13,0.30));
  jaw=max(jaw,-ellipsoid(q-vec3(0,-0.36,0.21),vec3(0.26,0.13,0.23)));
  // Six distinct teeth on each side of the bite line.
  vec3 tooth=p; tooth.x=mod(p.x+0.045,0.09)-0.045;
  if(abs(p.x)<0.29) bone=min(bone,ellipsoid(tooth-vec3(0,-0.265,0.425),vec3(0.033,0.065,0.05)));
  tooth=q; tooth.x=mod(q.x+0.045,0.09)-0.045;
  if(abs(q.x)<0.29) jaw=min(jaw,ellipsoid(tooth-vec3(0,-0.345,0.40),vec3(0.031,0.055,0.045)));
  bone=min(bone,jaw);
  float eye=ellipsoid(sym-vec3(0.235,0.16,0.245),vec3(0.055,0.066,0.045));
  return eye<bone ? vec2(eye,1) : vec2(bone,0);
}
vec2 field(vec3 p) {
  vec2 body=bodyField(p);
  float nearestCut=100.0;
  for(int i=0;i<6;i++) {
    if(float(i)>=woundCount) break;
    vec3 q=p-wounds[i].xyz;
    float cut=length(q-woundAxes[i]*dot(q,woundAxes[i]))-wounds[i].w;
    nearestCut=min(nearestCut,abs(cut));
    body.x=max(body.x,-cut);
  }
  if(nearestCut<.022 && body.y<.5) body.y=2.0;
  return body;
}
void main() {
  vec3 rd=normalize(localSurface-eyeLocal);
  // Ray/box entry handles cameras inside the proxy as well as outside it.
  vec3 inv=1.0/rd;
  vec3 t0=(-vec3(1.03,0.95,0.68)-eyeLocal)*inv;
  vec3 t1=( vec3(1.03,0.95,0.68)-eyeLocal)*inv;
  vec3 lo=min(t0,t1), hi=max(t0,t1);
  float t=max(0.0,max(lo.x,max(lo.y,lo.z)));
  float end=min(hi.x,min(hi.y,hi.z));
  vec3 p; vec2 hit; bool found=false;
  for(int i=0;i<80;i++) {
    p=eyeLocal+rd*t; hit=field(p);
    if(hit.x<0.0015) { found=true; break; }
    t+=max(hit.x,0.0008);
    if(t>end) break;
  }
  if(!found || t>end) discard;
  const float e=0.002;
  vec3 n=normalize(vec3(field(p+vec3(e,0,0)).x-field(p-vec3(e,0,0)).x,
                        field(p+vec3(0,e,0)).x-field(p-vec3(0,e,0)).x,
                        field(p+vec3(0,0,e)).x-field(p-vec3(0,0,e)).x));
  float light=0.23+0.65*max(0.0,dot(normalize(normalToWorld*n),keyDirection));
  float grain=0.96+0.04*sin(p.x*89.0)*sin(p.y*113.0)*sin(p.z*91.0);
  // Darken recessed bone inside each orbital bowl. This is local cavity
  // shading, not another shadow march per pixel.
  vec3 orbital=vec3(abs(p.x)-0.235,p.y-0.16,p.z-0.405);
  float inSocket=1.0-smoothstep(0.85,1.1,length(orbital.xy/vec2(0.16,0.17)));
  float cavity=mix(1.0,0.10+0.9*smoothstep(0.26,0.46,p.z),inSocket);
  if(profile>4.5)cavity=1.0;
  vec3 bone=boneColor*light*grain*cavity;
  bone+=fillColor*max(0.0,-normalize(normalToWorld*n).y);
  vec3 color=bone;
  if(hit.y>.5 && hit.y<1.5) color=eyeColor*(.7+.3*sin(time*5.0)+charge*1.5);
  if(hit.y>1.5) color=mix(bone*.20,fillColor*1.8,.5);
  outColor=vec4(mix(color,vec3(3),flash),1);
  // Write the marched surface depth, not the enclosing box's depth.
  vec4 clip=localToClip*vec4(p,1);
  gl_FragDepth=0.5*(clip.z/clip.w)+0.5;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createSdfSkull({ variant = 'skull', bone, eyes = new THREE.Color(4.4,.12,.025) } = {}) {
  const config = PROFILES[variant] || PROFILES.skull;
  bone ||= new THREE.Color(...(variant==='totem'?[.075,.065,.06]:variant==='watcher'?[.32,.29,.25]:[.72,.66,.55]));
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader, fragmentShader,
    side: THREE.BackSide,
    uniforms: { eyeLocal: { value: new THREE.Vector3() }, localToClip: { value: new THREE.Matrix4() },
      jawOpen: { value: 0.1 }, flash: { value: 0 }, profile: { value: config.id },
      boneColor: { value: bone.clone() }, eyeColor: { value: eyes.clone() },
      time: { value: 0 }, charge: { value: 0 }, woundCount: { value: 0 },
      wounds: { value: Array.from({length:6},()=>new THREE.Vector4()) },
      woundAxes: { value: Array.from({length:6},()=>new THREE.Vector3(0,0,1)) },
      normalToWorld: { value: new THREE.Matrix3() },
      keyDirection: { value: keyDirection }, fillColor: { value: fillColor } },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'SDF '+variant;
  mesh.scale.setScalar(config.scale);
  mesh.position.y = config.y || 0;
  mesh.userData.sdfVariant = variant;
  mesh.layers.enable(2);
  // The proxy is a rendering surface only, never a gameplay hit target.
  mesh.raycast = () => {};
  const inverse = new THREE.Matrix4();
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    inverse.copy(mesh.matrixWorld).invert();
    material.uniforms.normalToWorld.value.getNormalMatrix(mesh.matrixWorld);
    material.uniforms.eyeLocal.value.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inverse);
    material.uniforms.localToClip.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(mesh.matrixWorld);
  };
  return mesh;
}

// At most six geometric through-wounds per body, replacing the oldest at cap.
// A line wound is invariant to where the fast projectile ended on that line.
const impactPoint = new THREE.Vector3(), impactAxis = new THREE.Vector3();
const impactInverse = new THREE.Matrix4();
export function carveSdfImpact(mesh, point, direction, damage = 1) {
  if (!mesh || !point || !direction || direction.lengthSq() < 1e-10) return;
  mesh.updateWorldMatrix(true, false);
  impactInverse.copy(mesh.matrixWorld).invert();
  impactPoint.copy(point).applyMatrix4(impactInverse);
  impactAxis.copy(direction).transformDirection(impactInverse);
  const u=mesh.material.uniforms, serial=mesh.userData.sdfHitSerial || 0, i=serial%6;
  u.wounds.value[i].set(impactPoint.x,impactPoint.y,impactPoint.z,Math.min(.24,.13+Math.max(0,damage-1)*.025));
  u.woundAxes.value[i].copy(impactAxis);
  u.woundCount.value=Math.min(6,serial+1);
  mesh.userData.sdfHitSerial=serial+1;
  u.flash.value=1;
}
