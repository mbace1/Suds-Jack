import * as THREE from 'three';

/**
 * v61 (HD-022) AN SDF BODY DIES AS A LIQUID. Under RENDER · SDF a skull is a
 * raymarched surface, and breaking it into cubes alone throws that away at
 * the last moment. So its death is also one more signed distance field: a
 * core and six lobes joined by a smooth union that LOOSENS as they fly — one
 * mass tearing into beads — falling under gravity toward the floor, where the
 * season's liquid (fx-fluid.js) takes over as a pool or a ring.
 *
 * Same contract as sdf-skull.js: a bounded proxy box, the march stays inside
 * it, and the whole thing is pooled. Six at once, 0.7 seconds each, twenty
 * steps a pixel over a patch of screen the size of the body that died. The
 * lobes' paths are a function of age and a seed, so there is no per-frame
 * state beyond one float.
 */

const POOL = 6;
const LIFE = 0.72;

const VERT = /* glsl */`
  varying vec3 vLocal;
  void main() { vLocal = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const FRAG = /* glsl */`
  precision highp float;
  varying vec3 vLocal;
  uniform vec3 uEye;       // the camera, in the box's own units
  uniform float uT;        // age, 0..1
  uniform float uSeed;
  uniform vec3 uDir;       // the blow that killed it
  uniform vec3 uKey;       // the season's light
  uniform vec3 uColA;      // lit
  uniform vec3 uColB;      // in shadow
  uniform vec3 uRim;       // the edge against the sky
  uniform vec3 uHot;       // what it is while it is new
  uniform float uFloorL;   // the floor, in the box's units (below it nothing is drawn)
  uniform mat4 uLocalToClip;   // so the surface that was hit, not the box, is what is depth-tested
  float h1(float n) { return fract(sin(n * 12.9898) * 43758.5453); }
  vec3 h3(float n) { return vec3(h1(n), h1(n + 17.1), h1(n + 41.7)); }
  float smin(float a, float b, float k) { float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0); return mix(b, a, h) - k * h * (1.0 - h); }
  float map(vec3 p) {
    float t = uT;
    float k = mix(0.34, 0.10, t);
    float d = length(p - vec3(0.0, -0.3 * t * t, 0.0)) - 0.30 * (1.0 - t);
    for (int i = 0; i < 6; i++) {
      float fi = float(i) + uSeed * 31.0;
      vec3 dir = normalize(h3(fi) * 2.0 - 1.0 + uDir * 0.7 + vec3(0.0, 0.4, 0.0));
      float sp = 0.5 + 0.5 * h1(fi * 7.3);
      vec3 c = dir * (0.2 + sp * 0.62 * (1.0 - exp(-3.6 * t)));   // already apart: it was a body, not a ball
      c.y -= 0.6 * t * t;
      float r = (0.17 + 0.08 * h1(fi * 3.1)) * (1.0 - 0.6 * t);
      d = smin(d, length(p - c) - r, k);
    }
    // a liquid's skin is never smooth while it is being thrown
    d += 0.022 * sin(p.x * 13.0 + uSeed * 40.0 + t * 9.0) * sin(p.y * 11.0 - t * 7.0) * sin(p.z * 12.0 + uSeed * 17.0);
    return d;
  }
  void main() {
    vec3 ro = uEye;
    vec3 rd = normalize(vLocal - uEye);
    // start where the ray enters the box, never behind the eye
    vec3 inv = 1.0 / rd;
    vec3 t0 = (-1.0 - ro) * inv, t1 = (1.0 - ro) * inv;
    vec3 tmin = min(t0, t1), tmax = max(t0, t1);
    float tn = max(max(tmin.x, tmin.y), max(tmin.z, 0.0));
    float tf = min(tmax.x, min(tmax.y, tmax.z));
    float t = tn;
    float hit = -1.0;
    for (int i = 0; i < 20; i++) {
      if (t > tf) break;
      float d = map(ro + rd * t);
      if (d < 0.012) { hit = t; break; }
      t += d * 0.92;
    }
    if (hit < 0.0) discard;
    vec3 p = ro + rd * hit;
    if (p.y < uFloorL) discard;
    vec2 e = vec2(0.02, -0.02);
    vec3 n = normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) + e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
    // light in whole steps: this is a raster, not a render
    float lit = floor(clamp(dot(n, uKey) * 0.6 + 0.45, 0.0, 1.0) * 4.0 + 0.5) / 4.0;
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 2.5);
    float spec = step(0.93, dot(reflect(-uKey, n), -rd));
    vec4 clip = uLocalToClip * vec4(p, 1.0);
    gl_FragDepth = clamp(clip.z / clip.w * 0.5 + 0.5, 0.0, 1.0);
    vec3 col = mix(uColB, uColA, lit) + uRim * fres + uRim * spec * 1.4;
    col = mix(col, uHot, (1.0 - uT) * (1.0 - uT) * 0.45 * (0.35 + 0.65 * lit));
    gl_FragColor = vec4(col, 1.0);
  }`;

const _eye = new THREE.Vector3();
const _m = new THREE.Matrix4();

export class Ichor {
  constructor(scene) {
    this.items = [];
    const geo = new THREE.BoxGeometry(2, 2, 2);
    for (let i = 0; i < POOL; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uEye: { value: new THREE.Vector3() }, uT: { value: 0 }, uSeed: { value: i * 0.37 },
          uDir: { value: new THREE.Vector3(0, 0, -1) }, uKey: { value: new THREE.Vector3(-0.4, 0.8, 0.45).normalize() },
          uColA: { value: new THREE.Color() }, uColB: { value: new THREE.Color() }, uRim: { value: new THREE.Color() }, uHot: { value: new THREE.Color() },
          uFloorL: { value: -9 }, uLocalToClip: { value: new THREE.Matrix4() },
        },
        vertexShader: VERT, fragmentShader: FRAG, fog: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false; mesh.frustumCulled = false; mesh.renderOrder = 2;
      scene.add(mesh);
      this.items.push({ mesh, t: 9, s: 1 });
    }
    this.next = 0;
    this.bursts = 0;
    this.floorY = 0;
  }

  /** The season's liquid: {a, b, rim, hot} and where its light comes from. */
  setLook(def, sunDir) {
    for (const it of this.items) {
      const u = it.mesh.material.uniforms;
      u.uColA.value.setRGB(...(def?.a ?? [0.5, 0.5, 0.5]));
      u.uColB.value.setRGB(...(def?.b ?? [0.05, 0.05, 0.05]));
      u.uRim.value.setRGB(...(def?.rim ?? [1, 1, 1]));
      u.uHot.value.setRGB(...(def?.hot ?? def?.a ?? [1, 1, 1]));
      if (sunDir) u.uKey.value.set(sunDir[0], Math.max(0.35, sunDir[1]), sunDir[2]).normalize();
      it.mesh.visible = false; it.t = 9;
    }
    this.def = def ?? null;
  }

  /** A body of radius `r` died at `c`, struck along `dir`. */
  burst(c, dir, r, camera) {
    if (!this.def) return false;
    const s = Math.max(0.9, r * 2.3);
    camera.getWorldPosition(_eye);
    // inside the box the march would start behind the eye: the sparks carry it
    if (Math.abs(_eye.x - c.x) < s && Math.abs(_eye.y - c.y) < s && Math.abs(_eye.z - c.z) < s) return false;
    const it = this.items[this.next];
    this.next = (this.next + 1) % POOL;
    it.t = 0; it.s = s;
    it.mesh.position.copy(c); it.mesh.scale.setScalar(s); it.mesh.visible = true;
    const u = it.mesh.material.uniforms;
    u.uSeed.value = (u.uSeed.value * 1.618 + 0.271) % 1;
    u.uDir.value.set(dir.x, dir.y * 0.3, dir.z).normalize();
    u.uFloorL.value = (this.floorY - c.y) / s;
    this.bursts++;
    return true;
  }

  update(dt, camera) {
    let any = false;
    for (const it of this.items) if (it.mesh.visible) { any = true; break; }
    if (!any) return;
    camera.getWorldPosition(_eye);
    for (const it of this.items) {
      if (!it.mesh.visible) continue;
      it.t += dt;
      if (it.t >= LIFE) { it.mesh.visible = false; continue; }
      const u = it.mesh.material.uniforms;
      u.uT.value = it.t / LIFE;
      u.uEye.value.copy(_eye).sub(it.mesh.position).divideScalar(it.s);
      _m.makeScale(it.s, it.s, it.s).setPosition(it.mesh.position);
      u.uLocalToClip.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(_m);
    }
  }

  clear() { for (const it of this.items) { it.mesh.visible = false; it.t = 9; } }
  get live() { let n = 0; for (const it of this.items) if (it.mesh.visible) n++; return n; }
}
