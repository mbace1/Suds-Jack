// Snow — the two things that sell a hover racer ploughing through powder:
// the plume it throws, and the scar it leaves.
//
// The plume is a pooled point cloud with per-particle size and alpha, sized to
// billow the way the reference plates do; the scars are one InstancedMesh of
// quads laid on the snow that fade by lerping back toward the surface colour
// (no alpha, no sorting cost), pitched to sit flush on a slope.
import * as THREE from 'three';
import { PAL } from './palette.js?v=1';

const PUFF_MAX = 1000;
const SCAR_MAX = 640;
const SCAR_LIFE = 7;

function puffTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  // quantised radial falloff — banded on purpose, like a 90s particle sprite
  for (let i = 5; i >= 1; i--) {
    g.fillStyle = `rgba(255,255,255,${0.19 * i / 5 + 0.06})`;
    g.beginPath(); g.arc(16, 16, 16 * i / 5, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

const VERT = `
attribute float aSize;
attribute float aAlpha;
varying float vAlpha;
varying vec3 vCol;
varying float vDepth;
void main() {
  vAlpha = aAlpha;
  vCol = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vDepth = -mv.z;
  gl_PointSize = aSize * (420.0 / max(-mv.z, 1.0));
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
  if (a < 0.02) discard;
  float f = smoothstep(fogNear, fogFar, vDepth);
  gl_FragColor = vec4(mix(vCol, fogColor, f), a);
}`;

/** Pooled billowing snow puffs. */
export class SprayPool {
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
        fogNear: { value: fog.near },
        fogFar: { value: fog.far },
      },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, vertexColors: true,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 3;
    scene.add(this.points);

    this._lit = new THREE.Color(PAL.plume);
    this._shd = new THREE.Color(PAL.plumeShd);
  }

  /**
   * @param {THREE.Vector3} p      world spawn point
   * @param {THREE.Vector3} fwd    craft forward (unit)
   * @param {THREE.Vector3} right  craft right (unit)
   * @param {number} side          lateral kick along `right`, signed m/s
   * @param {number} power         0..1, how much snow is actually moving
   */
  emit(p, fwd, right, side, power) {
    const i = this.head = (this.head + 1) % this.n;
    const i3 = i * 3;
    this.pos[i3] = p.x + (Math.random() - 0.5) * 1.6;
    this.pos[i3 + 1] = p.y + Math.random() * 0.5;
    this.pos[i3 + 2] = p.z + (Math.random() - 0.5) * 1.6;
    const back = 2 + power * 10;
    const spread = 2.2 + power * 4;
    const kick = side * (0.5 + Math.random() * 0.9);
    this.vel[i3]     = -fwd.x * back + right.x * kick + (Math.random() - 0.5) * spread;
    this.vel[i3 + 2] = -fwd.z * back + right.z * kick + (Math.random() - 0.5) * spread;
    this.vel[i3 + 1] = 2.4 + Math.random() * (3 + power * 10);
    this.life[i] = 0;
    this.max[i] = 0.45 + Math.random() * (0.45 + power * 0.6);
    this.size[i] = 1.1 + Math.random() * 1.6;
    this.grow[i] = 2.4 + power * 5;
    const c = Math.random() < 0.62 ? this._lit : this._shd;
    this.col[i3] = c.r; this.col[i3 + 1] = c.g; this.col[i3 + 2] = c.b;
    this.alpha[i] = 0.55;
  }

  update(dt) {
    const { pos, vel, life, max, size, alpha, grow } = this;
    const drag = Math.exp(-2.1 * dt);
    for (let i = 0; i < this.n; i++) {
      if (alpha[i] <= 0) continue;
      const t = (life[i] += dt);
      if (t >= max[i]) { alpha[i] = 0; size[i] = 0; continue; }
      const i3 = i * 3;
      vel[i3] *= drag; vel[i3 + 2] *= drag;
      vel[i3 + 1] = vel[i3 + 1] * drag - 5.5 * dt;
      pos[i3] += vel[i3] * dt;
      pos[i3 + 1] += vel[i3 + 1] * dt;
      pos[i3 + 2] += vel[i3 + 2] * dt;
      size[i] += grow[i] * dt;
      const u = t / max[i];
      alpha[i] = 0.6 * (1 - u * u);
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.aSize.needsUpdate = true;
    this.geo.attributes.aAlpha.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _v = new THREE.Vector3();
const _sc = new THREE.Vector3(1, 1, 1);
const _cc = new THREE.Color();

/** Hover scars pressed into the snow, fading back to the surface colour. */
export class ScarField {
  constructor(scene) {
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    // Multiply blending, not a lit quad. A lit quad has to match the shading
    // of the ground it sits on, and it never quite does — every trail ends up
    // reading as grey road markings. Multiplying just darkens whatever is
    // already there, so the scar tracks the terrain's colour and light for
    // free, and fading it is a lerp back to white.
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, transparent: true, blending: THREE.MultiplyBlending,
      depthWrite: false, fog: false,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.InstancedMesh(geo, mat, SCAR_MAX);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.instanceColor =
      new THREE.InstancedBufferAttribute(new Float32Array(SCAR_MAX * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.age = new Float32Array(SCAR_MAX).fill(SCAR_LIFE + 1);
    this.dark = new Float32Array(SCAR_MAX);
    this.head = 0;
    _m.makeScale(0, 0, 0);
    for (let i = 0; i < SCAR_MAX; i++) this.mesh.setMatrixAt(i, _m);
    this.mesh.renderOrder = 2;
    scene.add(this.mesh);
    this.deepCol = new THREE.Color(0xa89f8e);   // multiply tint at full depth
    this.fadeCol = new THREE.Color(0xffffff);   // white multiplies to nothing
  }

  /**
   * Lay one scar quad on the snow at `p`, along world yaw `heading`.
   * It has to be tilted onto the local slope, not just dropped flat: a quad
   * with an up normal on a lit slope takes visibly different light from the
   * terrain under it and the trail reads as grey road markings.
   */
  lay(p, heading, pitch, roll, width, len, dark) {
    const i = this.head = (this.head + 1) % SCAR_MAX;
    _e.set(-pitch, heading, roll, 'YXZ');
    _q.setFromEuler(_e);
    _sc.set(width, 1, len);
    _v.copy(p); _v.y += 0.07;
    _m.compose(_v, _q, _sc);
    this.mesh.setMatrixAt(i, _m);
    this.age[i] = 0;
    this.dark[i] = dark;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  update(dt) {
    let dirty = false;
    for (let i = 0; i < SCAR_MAX; i++) {
      const a = this.age[i];
      if (a > SCAR_LIFE) continue;
      const na = this.age[i] = a + dt;
      if (na > SCAR_LIFE) {
        _m.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, _m);
        dirty = true;
      }
      // wind fills the trench back in
      _cc.copy(this.fadeCol).lerp(this.deepCol, this.dark[i] * (1 - na / SCAR_LIFE));
      this.mesh.setColorAt(i, _cc);
    }
    if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }
}
