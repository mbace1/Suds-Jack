// leaves.js — the driveway's fallen leaves (v138; the owner's concept, art-ref/world-2-driveway-concept.jpg, and
// "we can go way beyond with geometry"). Real ones, lying on the slab and the lawn: a curled blade with a midrib,
// each its own autumn colour, its own little shadow under it. And they are THERE: a body going by scuffs them
// along, a dash blows them out of its road, a burst throws them up. They slide, tumble, settle against the curb
// and stay where the fight left them, so the slab remembers the run.
//
// Looks only. The sim never knows a leaf (their dice are their own, never the run's), and nothing here can change
// a run: main.js hands the world over to be read, as it does to the actors.
//
//   build(hx, hz, posts)   lay them out on a floor (seeded: the same driveway every time)
//   sync(w, dt)            the bodies move them; the ones in motion are stepped and redrawn
//   onEvent(e)             a burst throws the ones near it
// Every number is TUNING.scenery.driveway.leaves.
import * as THREE from 'three/webgpu';
import { uv, vec3, float, abs, smoothstep, mix } from 'three/tsl';
import { TUNING } from '../tuning.js?v=139';
import { seeded } from './kit.js?v=139';
import { SUN_AT } from './sun.js?v=139';

const T = TUNING;

// one leaf, a metre long, lying along +z in the floor's plane: pointed at both ends, folded up a little along its
// midrib and curled up toward its tips (uv: x across it, y along it)
function leafGeometry(L) {
  const pos = [], uvs = [], idx = [], N = 6;
  for (let i = 0; i <= N; i++) {
    const t = i / N, hw = L.wide * 0.5 * Math.pow(Math.sin(Math.PI * (0.06 + 0.9 * t)), 0.75), curl = L.curl * (2 * t - 1) ** 2;
    for (const sd of [-1, 0, 1]) { pos.push(sd * hw, curl + Math.abs(sd) * hw * L.fold, t - 0.5); uvs.push((sd + 1) / 2, t); }
  }
  for (let i = 0; i < N; i++) { const a = i * 3; idx.push(a, a + 3, a + 1, a + 1, a + 3, a + 4, a + 1, a + 4, a + 2, a + 2, a + 4, a + 5); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export class LeafLitter {
  constructor(group) {
    this.group = group; this.n = 0; this.mesh = null; this.shade = null;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
    this._seed = 1;
  }
  // its own dice (a kick's spin): never the run's
  _rnd() { this._seed = (this._seed * 1664525 + 1013904223) >>> 0; return this._seed / 4294967296; }

  build(hx, hz, add) {
    const L = T.scenery.driveway.leaves, rnd = seeded(L.seed), spots = [];
    // on the slab: thin in the open, thicker toward its edges, where the wind leaves them
    const edge = (x, z) => Math.min(hx - Math.abs(x), z + hz);
    for (let tries = 0; spots.length < L.slab && tries < L.slab * 40; tries++) {
      const x = (rnd() * 2 - 1) * (hx - 0.4), z = (rnd() * 2 - 1) * (hz - 0.4);
      if (rnd() < L.open + (1 - L.open) * Math.exp(-edge(x, z) / L.drift)) spots.push([x, z, true]);
    }
    // heaped in the two far corners
    for (const sx of [-1, 1]) for (let k = 0; k < L.corner; k++) { const a = rnd() * Math.PI * 0.5, d = Math.sqrt(rnd()) * L.cornerR; spots.push([sx * (hx - 0.35 - Math.cos(a) * d), -hz + 0.35 + Math.sin(a) * d, true]); }
    // and on the lawn past the curb: the far side and the two long ones, never the near side
    const W = T.scenery.driveway.curbWidth;
    for (let k = 0; k < L.lawn; k++) {
      const out = W + 0.3 + rnd() * L.lawnOut, side = rnd();
      if (side < 0.5) spots.push([(rnd() * 2 - 1) * (hx + W), -(hz + out), false]);
      else spots.push([(side < 0.75 ? -1 : 1) * (hx + out), -hz + rnd() * (2 * hz - 1.5), false]);
    }
    const n = this.n = spots.length;
    this.hx = hx; this.hz = hz;
    this.x = new Float32Array(n); this.z = new Float32Array(n); this.y = new Float32Array(n);
    this.vx = new Float32Array(n); this.vz = new Float32Array(n); this.vy = new Float32Array(n);
    this.yaw = new Float32Array(n); this.spin = new Float32Array(n); this.roll = new Float32Array(n); this.flip = new Float32Array(n);
    this.size = new Float32Array(n); this.free = new Uint8Array(n); this.awake = new Uint8Array(n);
    const geo = leafGeometry(L), mat = new THREE.MeshStandardNodeMaterial({ side: THREE.DoubleSide, roughness: L.rough, metalness: 0 });
    // its own colour (per leaf), darker along the midrib and browner toward the tip
    mat.colorNode = mix(vec3(1), vec3(...L.tip), smoothstep(0.55, 1.0, uv().y).mul(L.tipK)).mul(float(1).sub(float(1).sub(smoothstep(0.0, 0.16, abs(uv().x.sub(0.5)))).mul(L.rib)));
    this.mesh = add(new THREE.InstancedMesh(geo, mat, n));
    this.mesh.frustumCulled = false;
    // each one's shadow: the leaf's own outline, flat on the floor, a step away from the sun
    const sm = new THREE.MeshBasicNodeMaterial({ color: 0x000000, transparent: true, opacity: L.shadow, depthWrite: false, side: THREE.DoubleSide });
    this.shade = add(new THREE.InstancedMesh(geo, sm, n));
    this.shade.frustumCulled = false; this.shade.renderOrder = 2;
    const c = new THREE.Color();
    spots.forEach(([x, z, free], i) => {
      this.x[i] = x; this.z[i] = z; this.yaw[i] = rnd() * Math.PI * 2; this.roll[i] = (rnd() - 0.5) * 0.5;
      this.size[i] = L.size[0] + rnd() * (L.size[1] - L.size[0]); this.free[i] = free ? 1 : 0;
      const tone = L.tones[Math.floor(rnd() * L.tones.length)], v = 0.8 + rnd() * 0.4;
      this.mesh.setColorAt(i, c.setRGB(tone[0] * v, tone[1] * v, tone[2] * v));
      this._put(i);
    });
    this.mesh.instanceMatrix.needsUpdate = true; this.shade.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  // where leaf i is drawn, and its shadow
  _put(i) {
    const L = T.scenery.driveway.leaves, s = this.size[i], y = this.y[i];
    // in the air it tumbles (flip); lying, it keeps the tilt it settled with
    this._e.set(this.flip[i], this.yaw[i], this.roll[i], 'YXZ'); this._q.setFromEuler(this._e);
    this._s.set(s, s, s); this._p.set(this.x[i], L.lie + y, this.z[i]);
    this.mesh.setMatrixAt(i, this._m.compose(this._p, this._q, this._s));
    // the shadow: flat, the further from it the higher it flies, and fainter (smaller) up there
    const sun = SUN_AT.value, sh = Math.hypot(sun.x, sun.z) || 1, off = (L.lie + y) * Math.min(2.2, sh / Math.max(sun.y, 1e-3)), k = 1 / (1 + y * 0.8);
    this._e.set(0, this.yaw[i], 0, 'YXZ'); this._q.setFromEuler(this._e);
    this._s.set(s * k, 0.0001, s * k); this._p.set(this.x[i] - (sun.x / sh) * off, 0.012, this.z[i] - (sun.z / sh) * off);
    this.shade.setMatrixAt(i, this._m.compose(this._p, this._q, this._s));
  }

  // push leaf i: (ix, iz) m/s along the floor, `up` m/s off it
  _kick(i, ix, iz, up) {
    const L = T.scenery.driveway.leaves;
    this.vx[i] += ix; this.vz[i] += iz;
    const sp = Math.hypot(this.vx[i], this.vz[i]);
    if (sp > L.max) { this.vx[i] *= L.max / sp; this.vz[i] *= L.max / sp; }
    if (up > 0 && this.y[i] < 0.05) this.vy[i] = Math.max(this.vy[i], up);
    this.spin[i] += (this._rnd() - 0.5) * L.spin * Math.min(1, sp / 3);
    this.awake[i] = 1;
  }

  sync(w, dt) {
    if (!this.n || !w || dt <= 0) return;
    const L = T.scenery.driveway.leaves, h = w.hero, hr = T.hero.radius;
    // what moves them: the hero (a dash is a gust) and every body, each as far as it reaches and as fast as it goes
    const M = this._movers ?? (this._movers = []);
    M.length = 0;
    if (h.alive && !(h.fall > 0) && !(h.sink > 0)) { const d = h.dash > 0; M.push(h.x, h.z, h.velX || 0, h.velZ || 0, hr + (d ? L.gust : L.scuff), d ? L.gustK : 1); }
    for (const g of w.gels) if (g.alive) M.push(g.x, g.z, g.velX || 0, g.velZ || 0, g.r + L.scuff, 1);
    let moved = false;
    for (let i = 0; i < this.n; i++) {
      if (!this.free[i]) continue;
      const x = this.x[i], z = this.z[i];
      if (this.y[i] < 0.4) for (let k = 0; k < M.length; k += 6) {
        const dx = x - M[k], dz = z - M[k + 1], R = M[k + 4];
        if (dx > R || dx < -R || dz > R || dz < -R) continue;
        const d2 = dx * dx + dz * dz;
        if (d2 >= R * R) continue;
        const sp = Math.hypot(M[k + 2], M[k + 3]);
        if (sp < L.minSpeed) continue;
        // out of its road, and along with it: the nearer the harder
        const d = Math.sqrt(d2) || 1e-3, near = 1 - d / R, g = M[k + 5], push = L.push * sp * near * g;
        this._kick(i, (dx / d) * push + M[k + 2] * L.carry * near * g, (dz / d) * push + M[k + 3] * L.carry * near * g, sp * near * g > L.liftAt ? L.lift * near * g : 0);
      }
      if (!this.awake[i]) continue;
      moved = true;
      // on the floor it drags to a stop; in the air it is carried, flutters and comes down
      const air = this.y[i] > 0, drag = Math.exp(-(air ? L.airDrag : L.drag) * dt);
      this.vx[i] *= drag; this.vz[i] *= drag;
      this.x[i] += this.vx[i] * dt; this.z[i] += this.vz[i] * dt;
      if (air || this.vy[i] > 0) {
        this.vy[i] -= L.fall * dt; this.y[i] += this.vy[i] * dt;
        this.flip[i] += this.spin[i] * 0.7 * dt;
        if (this.y[i] <= 0) { this.y[i] = 0; this.vy[i] = 0; this.flip[i] = 0; this.roll[i] = (this._rnd() - 0.5) * 0.5; }
      }
      this.yaw[i] += this.spin[i] * dt; this.spin[i] *= Math.exp(-L.spinDrag * dt);
      // the curb stops it on three sides (it lies against it); the near side is open, and the lawn takes it
      const mx = this.hx - 0.2;
      if (this.x[i] > mx) { this.x[i] = mx; this.vx[i] *= -0.2; } else if (this.x[i] < -mx) { this.x[i] = -mx; this.vx[i] *= -0.2; }
      if (this.z[i] < -this.hz + 0.2) { this.z[i] = -this.hz + 0.2; this.vz[i] *= -0.2; }
      if (this.z[i] > this.hz + L.lawnOut) { this.z[i] = this.hz + L.lawnOut; this.vz[i] = 0; }
      // and it never lies inside what stands on the floor
      if (w.posts) for (const p of w.posts) {
        if (p.pit) continue;
        const dx = this.x[i] - p.x, dz = this.z[i] - p.z, min = p.r + 0.12, d2 = dx * dx + dz * dz;
        if (d2 < min * min) { const d = Math.sqrt(d2) || 1e-3; this.x[i] = p.x + (dx / d) * min; this.z[i] = p.z + (dz / d) * min; }
      }
      if (this.y[i] === 0 && Math.hypot(this.vx[i], this.vz[i]) < L.rest && Math.abs(this.spin[i]) < 0.3) { this.awake[i] = 0; this.vx[i] = this.vz[i] = this.spin[i] = 0; }
      this._put(i);
    }
    if (moved) { this.mesh.instanceMatrix.needsUpdate = true; this.shade.instanceMatrix.needsUpdate = true; }
  }

  // a body bursting throws the leaves round it
  onEvent(e) {
    if (!this.n || e.type !== 'kill') return;
    const L = T.scenery.driveway.leaves, R = (e.r ?? 1) * L.burstR;
    for (let i = 0; i < this.n; i++) {
      if (!this.free[i]) continue;
      const dx = this.x[i] - e.x, dz = this.z[i] - e.z, d2 = dx * dx + dz * dz;
      if (d2 >= R * R) continue;
      const d = Math.sqrt(d2) || 1e-3, k = 1 - d / R;
      this._kick(i, (dx / d) * L.burst * k, (dz / d) * L.burst * k, L.lift * (0.6 + k));
    }
  }
}
