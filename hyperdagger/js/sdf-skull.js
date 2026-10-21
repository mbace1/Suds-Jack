import * as THREE from 'three';

// Opt-in pilot: the regular Skull only. The voxel lattice remains authoritative
// for hits, chips and gibs. No fullscreen pass: march inside a tight proxy box.
export const sdfSkullsEnabled = typeof location !== 'undefined' &&
  new URLSearchParams(location.search).get('skull') === 'sdf';
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
vec2 field(vec3 p) {
  float bone = ellipsoid(p-vec3(0,0.19,-0.08),vec3(0.48,0.52,0.43));
  bone = smoothUnion(bone,ellipsoid(p-vec3(0,-0.10,0.23),vec3(0.39,0.24,0.29)),0.10);
  vec3 sym = vec3(abs(p.x),p.y,p.z);
  bone = smoothUnion(bone,ellipsoid(sym-vec3(0.37,-0.03,0.23),vec3(0.17,0.18,0.20)),0.05);
  bone = smoothUnion(bone,capsule(sym,vec3(0.36,0.43,-0.08),vec3(0.91,0.79,-0.12),0.14,0.012),0.06);
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
  float light=0.23+0.65*max(0.0,dot(n,normalize(vec3(-0.5,0.8,1))));
  float grain=0.96+0.04*sin(p.x*89.0)*sin(p.y*113.0)*sin(p.z*91.0);
  // Darken recessed bone inside each orbital bowl. This is local cavity
  // shading, not another shadow march per pixel.
  vec3 orbital=vec3(abs(p.x)-0.235,p.y-0.16,p.z-0.405);
  float inSocket=1.0-smoothstep(0.85,1.1,length(orbital.xy/vec2(0.16,0.17)));
  float cavity=mix(1.0,0.10+0.9*smoothstep(0.26,0.46,p.z),inSocket);
  vec3 bone=vec3(0.72,0.66,0.55)*light*grain*cavity;
  bone+=vec3(0.18,0.012,0.004)*max(0.0,-n.y);
  vec3 color=mix(bone,vec3(4.4,0.12,0.025),hit.y);
  outColor=vec4(mix(color,vec3(3),flash),1);
  // Write the marched surface depth, not the enclosing box's depth.
  vec4 clip=localToClip*vec4(p,1);
  gl_FragDepth=0.5*(clip.z/clip.w)+0.5;
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createSdfSkull() {
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3, vertexShader, fragmentShader,
    side: THREE.BackSide,
    uniforms: { eyeLocal: { value: new THREE.Vector3() }, localToClip: { value: new THREE.Matrix4() },
      jawOpen: { value: 0.1 }, flash: { value: 0 } },
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'SDF skull pilot';
  mesh.scale.setScalar(1.35); // match the current 17-cell horn span (~2.4 units)
  mesh.layers.enable(2);
  // The proxy is a rendering surface only, never a gameplay hit target.
  mesh.raycast = () => {};
  const inverse = new THREE.Matrix4();
  mesh.onBeforeRender = (_renderer, _scene, camera) => {
    inverse.copy(mesh.matrixWorld).invert();
    material.uniforms.eyeLocal.value.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inverse);
    material.uniforms.localToClip.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(mesh.matrixWorld);
  };
  return mesh;
}
