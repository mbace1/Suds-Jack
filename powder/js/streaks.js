// Streaks — particles drawn as motion, not as dots.
//
// v11. A point sprite is a round disc whatever it is supposed to be, and a
// round disc of sand reads as smoke; Flowsnow (the snowboarding cabinet)
// measured the same thing and moving its plume to streaks took it from 20%
// of the frame to 3%. So the sand SPRAY off a carving edge, the rooster tail
// and the SPEED streaks in the air are all one thing here: a quad per
// particle, stretched in screen space from where the particle is to where it
// appeared to be a moment ago — which is its own velocity RELATIVE TO THE
// CAMERA. A grain hanging still in the air is a streak because you are the
// one moving; sand thrown along with you is short.
//
// One instanced draw call per pool, on whatever layer it is given. The
// streak's length is clamped in NDC so nothing near the lens smears across
// the frame, and never shorter than its own width, so a slow grain is a dot.
import * as THREE from 'three';

const VERT = `
attribute vec2 corner;            // x: 0 tail .. 1 head, y: -1 .. 1 across
attribute vec3 iPos;
attribute vec3 iVel;
attribute vec4 iCol;              // rgb, alpha
attribute float iSize;            // world width, m
uniform vec3 uCamVel;
uniform float uBlur;              // s of motion the streak shows
uniform float uMaxLen;            // longest streak, in NDC
uniform float uAspect;
uniform float uP11;
uniform float uMaxW;              // widest streak, in NDC
uniform float uNear;              // m from the lens where a streak is gone
varying vec4 vCol;
varying vec2 vCorner;
varying float vDepth;
void main() {
  vCol = iCol; vCorner = corner;
  vec4 head = projectionMatrix * viewMatrix * vec4(iPos, 1.0);
  vec4 tail = projectionMatrix * viewMatrix * vec4(iPos - (iVel - uCamVel) * uBlur, 1.0);
  vDepth = head.w;
  if (head.w < 0.05 || iCol.a <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  tail.w = max(tail.w, 0.05);
  // work in aspect-corrected NDC, where a unit is the same length both ways
  vec2 A = vec2(uAspect, 1.0);
  vec2 h = head.xy / head.w * A, t = tail.xy / tail.w * A;
  vec2 d = h - t;
  float len = length(d);
  // width in NDC at the head's depth — clamped, and faded out as it nears
  // the lens: a grain a metre from the camera is a smear on the glass, not
  // a grain (the first cut drew them as soft grey bricks across the frame)
  float wN = min(iSize * uP11 / head.w, uMaxW);
  vCol.a *= smoothstep(uNear, uNear * 2.4, head.w);
  vec2 dir = len > 1e-5 ? d / len : vec2(0.0, 1.0);
  len = clamp(len, wN, uMaxLen);
  vec2 n = vec2(-dir.y, dir.x);
  vec2 p = h - dir * len * (1.0 - corner.x) + n * wN * corner.y;
  p.x /= uAspect;
  gl_Position = vec4(p * head.w, head.z, head.w);
}`;

const FRAG = `
uniform vec3 fogColor;
uniform float fogNear, fogFar, uFog;
varying vec4 vCol;
varying vec2 vCorner;
varying float vDepth;
void main() {
  // soft across, fading toward the tail
  float a = vCol.a * (1.0 - vCorner.y * vCorner.y) * mix(0.15, 1.0, vCorner.x);
  if (a < 0.01) discard;
  float f = smoothstep(fogNear, fogFar, vDepth) * uFog;
  gl_FragColor = vec4(mix(vCol.rgb, fogColor, f), a);
}`;

export class StreakPool {
  /**
   * @param {THREE.Scene} scene
   * @param {object} fog  { color, near, far }
   * @param {object} o    max, layer, additive, blur (s), maxLen (NDC), gravity,
   *                      drag (1/s), fog (0..1), maxW (NDC), near (m)
   */
  constructor(scene, fog, o = {}) {
    this.o = Object.assign({ max: 1200, layer: 1, additive: false, blur: 0.05, maxLen: 0.35, maxW: 0.012, near: 2.5, gravity: 9.8, drag: 0.9, fog: 1 }, o);
    const n = this.n = this.o.max;
    const base = new THREE.InstancedBufferGeometry();
    base.setAttribute('corner', new THREE.Float32BufferAttribute([0, -1, 1, -1, 1, 1, 0, 1], 2));
    base.setIndex([0, 1, 2, 0, 2, 3]);
    // three needs a position attribute to draw; the shader never reads it
    base.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
    this.pos = new Float32Array(n * 3);
    this.vel = new Float32Array(n * 3);
    this.col = new Float32Array(n * 4);
    this.size = new Float32Array(n);
    this.life = new Float32Array(n);
    this.max = new Float32Array(n);
    this.a0 = new Float32Array(n);
    this.grav = new Float32Array(n);
    const inst = (arr, k) => { const a = new THREE.InstancedBufferAttribute(arr, k); a.setUsage(THREE.DynamicDrawUsage); return a; };
    base.setAttribute('iPos', inst(this.pos, 3));
    base.setAttribute('iVel', inst(this.vel, 3));
    base.setAttribute('iCol', inst(this.col, 4));
    base.setAttribute('iSize', inst(this.size, 1));
    base.instanceCount = n;
    this.geo = base;
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uCamVel: { value: new THREE.Vector3() }, uBlur: { value: this.o.blur },
        uMaxLen: { value: this.o.maxLen }, uAspect: { value: 1 }, uP11: { value: 1 },
        uMaxW: { value: this.o.maxW }, uNear: { value: this.o.near },
        fogColor: { value: new THREE.Color(fog.color) }, fogNear: { value: fog.near }, fogFar: { value: fog.far },
        uFog: { value: this.o.fog },
      },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false,
      blending: this.o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(base, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    this.mesh.layers.set(this.o.layer);
    scene.add(this.mesh);
    this.head = 0;
    this.live = 0;
  }

  /** p, v: Vector3-likes. col: THREE.Color. */
  emit(px, py, pz, vx, vy, vz, size, life, col, alpha, grav = 1) {
    const i = this.head = (this.head + 1) % this.n;
    const i3 = i * 3, i4 = i * 4;
    this.pos[i3] = px; this.pos[i3 + 1] = py; this.pos[i3 + 2] = pz;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.col[i4] = col.r; this.col[i4 + 1] = col.g; this.col[i4 + 2] = col.b; this.col[i4 + 3] = alpha;
    this.size[i] = size; this.life[i] = 0; this.max[i] = life; this.a0[i] = alpha; this.grav[i] = grav;
  }

  /** Advance, and point the shader at the camera that will draw it. */
  update(dt, camera, camVel) {
    const { pos, vel, col, life, max, a0, grav } = this;
    const drag = Math.exp(-this.o.drag * dt), g = this.o.gravity * dt;
    let live = 0;
    for (let i = 0; i < this.n; i++) {
      const i4 = i * 4;
      if (col[i4 + 3] <= 0) continue;
      const t = (life[i] += dt);
      if (t >= max[i]) { col[i4 + 3] = 0; continue; }
      live++;
      const i3 = i * 3;
      vel[i3] *= drag; vel[i3 + 2] *= drag;
      vel[i3 + 1] = vel[i3 + 1] * drag - g * grav[i];
      pos[i3] += vel[i3] * dt; pos[i3 + 1] += vel[i3 + 1] * dt; pos[i3 + 2] += vel[i3 + 2] * dt;
      const u = t / max[i];
      col[i4 + 3] = a0[i] * (1 - u * u) * Math.min(1, t * 16);
    }
    this.live = live;
    const a = this.geo.attributes;
    a.iPos.needsUpdate = a.iVel.needsUpdate = a.iCol.needsUpdate = a.iSize.needsUpdate = true;
    const U = this.mat.uniforms;
    if (camVel) U.uCamVel.value.copy(camVel);
    U.uAspect.value = camera.aspect;
    U.uP11.value = camera.projectionMatrix.elements[5];
  }

  clear() { this.col.fill(0); }
}
