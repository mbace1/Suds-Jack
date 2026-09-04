// Dust — the plume off the skirts, and the scar it presses into the ground.
//
// Both are held over from the last build because both survived contact with
// the thing they were built for. The plume is a pooled point cloud with
// per-particle size and alpha and its own fog term. The scars MULTIPLY rather
// than being lit: a lit quad has to match the shading of the ground it lies on
// and never quite does, and every version of that read as grey road markings.
import * as THREE from 'three';
import { PAL } from './palette.js?v=3';

const PUFF_MAX = 1400;
const SCAR_MAX = 700;
const SCAR_LIFE = 9;

function puffTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 1, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,0.85)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.35)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = false;
  t.minFilter = THREE.LinearFilter;
  return t;
}

const VERT = `
attribute float aSize;
attribute float aAlpha;
varying float vAlpha;
varying vec3 vCol;
varying float vDepth;
void main() {
  vAlpha = aAlpha; vCol = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  // Clamped, and on a much smaller scale factor. Unclamped, a puff that
  // has grown for two seconds twenty metres from the camera resolves to a
  // 900 px sprite and fills the entire frame with white.
  gl_PointSize = min(aSize * (210.0 / max(-mv.z, 1.0)), 120.0);
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
uniform sampler2D map;
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
varying float vAlpha;
varying vec3 vCol;
varying float vDepth;
void main() {
  vec4 t = texture2D(map, gl_PointCoord);
  float a = t.a * vAlpha;
  if (a < 0.015) discard;
  float f = smoothstep(fogNear, fogFar, vDepth);
  gl_FragColor = vec4(mix(vCol, fogColor, f), a);
}`;

export class DustPool {
  constructor(scene, fog) {
    this.n = PUFF_MAX;
    this.pos = new Float32Array(this.n * 3);
    this.col = new Float32Array(this.n * 3);
    this.size = new Float32Array(this.n);
    this.alpha = new Float32Array(this.n);
    this.vel = new Float32Array(this.n * 3);
    this.life = new Float32Array(this.n);
    this.max = new Float32Array(this.n);
    this.grow = new Float32Array(this.n);
    this.head = 0;

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo = g;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: puffTexture() },
        fogColor: { value: new THREE.Color(fog.color) },
        fogNear: { value: fog.near }, fogFar: { value: fog.far },
      },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, vertexColors: true,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    scene.add(this.points);
    this._lit = new THREE.Color(PAL.dust);
    this._shd = new THREE.Color(PAL.dustShd);
  }

  emit(p, fwd, right, side, power) {
    const i = this.head = (this.head + 1) % this.n;
    const i3 = i * 3;
    this.pos[i3] = p.x + (Math.random() - 0.5) * 2.2;
    this.pos[i3 + 1] = p.y + Math.random() * 0.7;
    this.pos[i3 + 2] = p.z + (Math.random() - 0.5) * 2.2;
    const back = 3 + power * 16;
    const spread = 2.6 + power * 6;
    const kick = side * (0.5 + Math.random());
    this.vel[i3]     = -fwd.x * back + right.x * kick + (Math.random() - 0.5) * spread;
    this.vel[i3 + 2] = -fwd.z * back + right.z * kick + (Math.random() - 0.5) * spread;
    this.vel[i3 + 1] = 2.6 + Math.random() * (3.5 + power * 9);
    this.life[i] = 0;
    this.max[i] = 0.6 + Math.random() * (0.7 + power * 1.0);
    this.size[i] = 1.6 + Math.random() * 2.4;
    this.grow[i] = 2.2 + power * 5;
    const c = Math.random() < 0.6 ? this._lit : this._shd;
    this.col[i3] = c.r; this.col[i3 + 1] = c.g; this.col[i3 + 2] = c.b;
    this.alpha[i] = 0.5;
  }

  update(dt) {
    const { pos, vel, life, max, size, alpha, grow } = this;
    const drag = Math.exp(-1.7 * dt);
    for (let i = 0; i < this.n; i++) {
      if (alpha[i] <= 0) continue;
      const t = (life[i] += dt);
      if (t >= max[i]) { alpha[i] = 0; size[i] = 0; continue; }
      const i3 = i * 3;
      vel[i3] *= drag; vel[i3 + 2] *= drag;
      vel[i3 + 1] = vel[i3 + 1] * drag - 4.2 * dt;
      pos[i3] += vel[i3] * dt;
      pos[i3 + 1] += vel[i3 + 1] * dt;
      pos[i3 + 2] += vel[i3 + 2] * dt;
      size[i] += grow[i] * dt;
      const u = t / max[i];
      alpha[i] = 0.55 * (1 - u * u);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ'), _v = new THREE.Vector3();
const _s = new THREE.Vector3(1, 1, 1), _cc = new THREE.Color();

export class ScarField {
  constructor(scene) {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, blending: THREE.MultiplyBlending,
      depthWrite: false, fog: false,
      polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, SCAR_MAX);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor =
      new THREE.InstancedBufferAttribute(new Float32Array(SCAR_MAX * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.age = new Float32Array(SCAR_MAX).fill(SCAR_LIFE + 1);
    this.dark = new Float32Array(SCAR_MAX);
    this.head = 0;
    _m.makeScale(0, 0, 0);
    for (let i = 0; i < SCAR_MAX; i++) this.mesh.setMatrixAt(i, _m);
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
    this.deepCol = new THREE.Color(0xa08f78);
    this.fadeCol = new THREE.Color(0xffffff);
  }

  lay(x, y, z, heading, pitch, roll, width, len, dark) {
    const i = this.head = (this.head + 1) % SCAR_MAX;
    _e.set(pitch, heading, roll, 'YXZ');
    _q.setFromEuler(_e);
    _s.set(width, 1, len);
    _v.set(x, y + 0.09, z);
    _m.compose(_v, _q, _s);
    this.mesh.setMatrixAt(i, _m);
    this.age[i] = 0; this.dark[i] = dark;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  update(dt) {
    let dirty = false;
    for (let i = 0; i < SCAR_MAX; i++) {
      const a = this.age[i];
      if (a > SCAR_LIFE) continue;
      const na = this.age[i] = a + dt;
      if (na > SCAR_LIFE) { _m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, _m); dirty = true; }
      _cc.copy(this.fadeCol).lerp(this.deepCol, this.dark[i] * (1 - na / SCAR_LIFE));
      this.mesh.setColorAt(i, _cc);
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }
}
