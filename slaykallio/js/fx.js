// Slay Kallio — pixel effects (v51). Metal Slug's feel lives in its effects:
// a hit is a burst of hot squares, a block is a clank of cold ones, a body
// going down throws dust and bits of itself. Everything here is SQUARE and
// its colour STEPS down a ramp rather than blending — a sprite effect is drawn
// as a handful of frames in a few flat colours, and a smooth fade is exactly
// the thing that makes a particle read as a particle system instead.
//
// One pool, one draw call: a THREE.Points cloud whose points are drawn as
// squares at a world size, so a spark is the same size next to a rat as next
// to the Bear and scales with the camera like everything else on the bridge.
// Driven off the replay (main.js calls it where the log is acted out), so it
// can never show a hit the engine did not deal. `prefers-reduced-motion`
// switches it off entirely: it is decoration, and nothing it shows is
// information the numbers do not already carry.
import * as THREE from 'three';

const CAP = 640;
const G = -5.5;                                   // world units / s²

// ramps, hot to cold, in the order a spark lives through them
const RAMPS = {
  hit:   ['#ffffff', '#fff4a8', '#ffd24a', '#ff9a2a', '#e0501c', '#7a2412'],
  big:   ['#ffffff', '#ffffff', '#fff4a8', '#ffd24a', '#ff7a1a', '#c8321a', '#5a1a10'],
  block: ['#ffffff', '#d8f0ff', '#8cc8f0', '#4a86b8', '#23405a'],
  dust:  ['#b8ab94', '#9a8e78', '#7a705e', '#554e42', '#353028'],
  kraft: ['#c8b48a', '#a8946c', '#8d8066', '#685e4c'],
  bite:  ['#fff0d0', '#e8c890', '#c89a5a', '#8a6038', '#4a3020'],
};
const lin = Object.fromEntries(Object.entries(RAMPS).map(([k, r]) => [k, r.map(h => new THREE.Color(h))]));

export class PixelFX {
  constructor(scene) {
    this.off = matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.p = Array.from({ length: CAP }, () => ({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, size: 0, ramp: 'hit', drag: 0, floor: -1 }));
    this.next = 0;
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(CAP * 3); this.col = new Float32Array(CAP * 3); this.siz = new Float32Array(CAP);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('size', new THREE.BufferAttribute(this.siz, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 } },
      vertexShader: `attribute float size; attribute vec3 color; uniform float uScale; varying vec3 vC;
        void main() { vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size > 0.0 ? max(1.0, floor(size * uScale / -mv.z + 0.5)) : 0.0;
          gl_Position = projectionMatrix * mv; }`,
      // no round-off, no soft edge: a point IS a square, which is the look
      fragmentShader: `varying vec3 vC; void main() { gl_FragColor = vec4(vC, 1.0);
        #include <colorspace_fragment>
        }`,
      // TRANSPARENT, though every square is opaque: three draws the opaque
      // pass first and the cutouts are transparent (alpha-tested card), so an
      // opaque spark was drawn BEFORE the figures and every figure painted
      // over it. Only the half of each burst hanging off a silhouette showed.
      transparent: true, depthWrite: false, toneMapped: false,
    });
    this.points = new THREE.Points(geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    scene.add(this.points);
    this.live = 0;
  }

  // pixels per world unit at distance 1, for whatever is being rendered into
  setScale(targetHeight, fovDeg) { this.mat.uniforms.uScale.value = targetHeight / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2)); }

  _spawn(o) {
    if (this.off) return;
    const q = this.p[this.next]; this.next = (this.next + 1) % CAP;
    Object.assign(q, { drag: 0, floor: -1 }, o, { life: o.max });
  }

  // `at` is a world point; `dir` +1 flings to the right, −1 to the left
  hit(at, dir = 1, big = false) {
    const n = big ? 26 : 14, rnd = Math.random;
    for (let i = 0; i < n; i++) {
      const a = (rnd() - 0.5) * 1.6, sp = (big ? 2.6 : 1.9) * (0.4 + rnd());
      this._spawn({ x: at.x, y: at.y + (rnd() - 0.5) * 0.12, z: at.z, vx: Math.cos(a) * sp * dir, vy: Math.sin(a) * sp + 0.8, vz: (rnd() - 0.5) * 0.4,
        size: (big ? 0.03 : 0.022) * (0.6 + rnd() * 0.8), max: 0.22 + rnd() * 0.28, ramp: big ? 'big' : 'hit', drag: 2.2, floor: 0.02 });
    }
    // the impact star: four arms of squares that stand still and burn out —
    // the one-frame flash every Metal Slug hit carries
    const arm = big ? 5 : 3, s = big ? 0.034 : 0.026;
    for (let k = -arm; k <= arm; k++) {
      this._spawn({ x: at.x + k * s * 0.9, y: at.y, z: at.z, size: s, max: 0.12, ramp: 'big' });
      if (k) this._spawn({ x: at.x, y: at.y + k * s * 0.9, z: at.z, size: s, max: 0.12, ramp: 'big' });
    }
  }

  // a CLANK: a flash where the blow stopped and a fan of cold chips thrown
  // back toward whoever struck. The first cut laid twelve even squares on a
  // vertical arc and it read as a dotted line: evenly spaced marks are a
  // PATTERN, and an impact is not one.
  block(at, dir = 1) {
    const rnd = Math.random;
    for (let i = 0; i < 3; i++) this._spawn({ x: at.x + dir * 0.06 + (rnd() - 0.5) * 0.05, y: at.y + (rnd() - 0.5) * 0.08, z: at.z, size: 0.05, max: 0.09, ramp: 'block' });
    for (let i = 0; i < 11; i++) {
      const a = (rnd() - 0.5) * 2.1, sp = 1.1 + rnd() * 1.1;
      this._spawn({ x: at.x + dir * 0.06, y: at.y + (rnd() - 0.5) * 0.1, z: at.z, vx: dir * Math.cos(a) * sp, vy: Math.sin(a) * sp + 0.3, vz: 0,
        size: 0.022 + rnd() * 0.016, max: 0.16 + rnd() * 0.12, ramp: 'block', drag: 5 });
    }
  }

  // a body going down: dust rolling out along the deck, and bits of card
  dust(at, width = 0.5) {
    const rnd = Math.random;
    for (let i = 0; i < 22; i++) {
      const side = rnd() < 0.5 ? -1 : 1;
      this._spawn({ x: at.x + side * rnd() * width * 0.5, y: 0.03 + rnd() * 0.06, z: at.z + (rnd() - 0.5) * 0.2, vx: side * (0.5 + rnd() * 1.2), vy: 0.35 + rnd() * 0.7, vz: (rnd() - 0.5) * 0.5,
        size: 0.03 + rnd() * 0.03, max: 0.5 + rnd() * 0.5, ramp: 'dust', drag: 3.2, floor: 0.02 });
    }
    for (let i = 0; i < 9; i++) {
      this._spawn({ x: at.x + (rnd() - 0.5) * width, y: at.y, z: at.z, vx: (rnd() - 0.5) * 2.2, vy: 1.2 + rnd() * 1.6, vz: (rnd() - 0.5) * 0.6,
        size: 0.026, max: 0.7 + rnd() * 0.4, ramp: 'kraft', drag: 0.6, floor: 0.02 });
    }
  }

  // the dog going in: a scuffle of fur-coloured squares low on the target
  bite(at, dir = 1) {
    for (let i = 0; i < 16; i++) {
      const rnd = Math.random, a = (rnd() - 0.5) * 2.4;
      this._spawn({ x: at.x - dir * 0.1, y: at.y * 0.55 + (rnd() - 0.5) * 0.2, z: at.z, vx: Math.cos(a) * 1.4 * dir, vy: Math.sin(a) * 1.4 + 0.6, vz: 0,
        size: 0.024 * (0.7 + rnd() * 0.6), max: 0.25 + rnd() * 0.25, ramp: 'bite', drag: 2.5, floor: 0.02 });
    }
  }

  update(dt) {
    let live = 0;
    for (let i = 0; i < CAP; i++) {
      const q = this.p[i];
      if (q.life <= 0) { this.siz[i] = 0; continue; }
      q.life -= dt;
      if (q.life <= 0) { this.siz[i] = 0; continue; }
      live++;
      const k = Math.exp(-q.drag * dt);
      q.vx *= k; q.vz *= k; q.vy = q.vy * k + (q.drag ? G * dt : 0);
      q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
      if (q.floor >= 0 && q.y < q.floor) { q.y = q.floor; q.vy *= -0.25; q.vx *= 0.6; }
      // STEP down the ramp — the index, never a blend
      const ramp = lin[q.ramp], t = 1 - q.life / q.max;
      const c = ramp[Math.min(ramp.length - 1, Math.floor(t * ramp.length))];
      this.pos[i * 3] = q.x; this.pos[i * 3 + 1] = q.y; this.pos[i * 3 + 2] = q.z;
      this.col[i * 3] = c.r; this.col[i * 3 + 1] = c.g; this.col[i * 3 + 2] = c.b;
      this.siz[i] = q.size;
    }
    this.live = live;
    const g = this.points.geometry;
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true; g.attributes.size.needsUpdate = true;
  }
}
