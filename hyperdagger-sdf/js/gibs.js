import * as THREE from 'three';
import { Solver } from './avbd/solver.js?v=1';
import { Rigid } from './avbd/body.js?v=1';
import { shadedBox, applyFaceShade } from './voxel.js?v=85';

/**
 * PHYSICAL GIBS (prototype, owner: *prototype the physical gibs on a branch*).
 *
 * The classic debris (voxel.js DebrisPool) bounces off the floor and never
 * off another gib, so a kill leaves cubes that sink through each other and
 * fade. Here the biggest CHUNKS of a death go to a real rigid-body solver —
 * Augmented Vertex Block Descent (Giles, Diaz & Yuksel, SIGGRAPH 2025),
 * the CPU reference from three-avbd, in js/avbd/ — and land, tumble, stack
 * and stay: a skull becomes a heap of bone you can see.
 *
 * WHAT KEEPS IT AFFORDABLE on a phone's CPU (measured, docs in VERSIONS.md):
 *  - SLEEP. A gib that has been still for `sleepSteps` steps turns static.
 *    The solver skips static bodies, and (the one change to the port) never
 *    makes a contact between two static ones, so a settled pile costs a
 *    sphere test per pair. Only a kill's fresh chunks are ever awake.
 *  - CHUNKS, not voxels: a death's voxels are binned into `cell`-sized cubes
 *    and only the `perKill` fullest go physical. The rest are thrown as the
 *    classic debris, so a kill loses none of its spray.
 *  - CAPS AND A CLOCK. At most `awakeCap` awake and `cap` in all (the oldest
 *    go first), and if the solver's own time (a running average) passes
 *    `budgetMs`, new kills are thrown as classic debris until it recovers.
 *
 * The solver is z-up; the game is y-up. The instanced mesh lives in a group
 * turned −90° about x, so the solver's frame IS that group's local frame and
 * body transforms go straight into the instance matrices:
 *   world (x, y, z)  →  solver (x, −z, y).
 */
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();

export const GIB_DEFAULTS = {
  cell: 0.28,        // chunk size (u): a skull is ~a dozen of these
  perKill: 18,       // chunks a death may send to the solver
  minVoxels: 2,      // a cell with fewer voxels than this is spray, not a chunk
  cap: 300,          // gibs in all; the oldest are retired
  awakeCap: 72,      // gibs moving at once (kills come quicker than gibs settle)
  iterations: 4,
  friction: 0.7,
  budgetMs: 4,       // the solver's running average past this → classic debris
  sleepV: 0.08, sleepW: 0.45, sleepSteps: 20,
  maxSteps: 2,       // fixed 60 Hz steps per frame, at most
};

export class PhysGibs {
  constructor(scene, arenaR, cfg = {}) {
    this.cfg = { ...GIB_DEFAULTS, ...cfg };
    this.arenaR = arenaR;
    this.sv = new Solver();
    this.sv.iterations = this.cfg.iterations;
    this.sv.gravity = -20;   // the game's bodies fall at 24; the reference's 10 floated a rock down from the sky
    this.group = new THREE.Group();
    this.group.rotation.x = -Math.PI / 2;
    this.group.name = 'physgibs';
    scene.add(this.group);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    applyFaceShade(mat);
    mat.customProgramCacheKey = () => 'voxel-physgib';
    this.mesh = new THREE.InstancedMesh(shadedBox(1), mat, this.cfg.cap);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.cfg.cap * 3), 3);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.group.add(this.mesh);
    this.on = true;
    this.ms = 0;            // running average of the solver's time per step
    this.acc = 0;
    this.stats = { bursts: 0, sent: 0, refused: 0, retired: 0, fell: 0 };
    this.reset();
  }

  reset() {
    this.sv.clear();
    // the floor: a static slab whose top is y = 0 (the disc). It is square;
    // a gib that leaves the disc's radius is taken off (the arena has no edge)
    new Rigid(this.sv, [this.arenaR * 2 + 4, this.arenaR * 2 + 4, 2], 0, this.cfg.friction, [0, 0, -1]);
    this.gibs = [];
    this.mesh.count = 0;
    this.acc = 0;
  }

  get awake() { let n = 0; for (const g of this.gibs) if (g.b.mass > 0) n++; return n; }

  /**
   * A death. Bins its voxels into chunks, sends the fullest to the solver
   * and RETURNS the voxels it did not take, for the classic debris to throw.
   */
  burst(worldVoxels, voxelSize, impulse) {
    const c = this.cfg;
    const room = c.awakeCap - this.awake;
    if (!this.on || !worldVoxels.length || room < 4 || this.ms > c.budgetMs) { this.stats.refused++; return worldVoxels; }
    const cells = new Map();
    const cen = _p.set(0, 0, 0);
    for (const v of worldVoxels) {
      cen.add(v.pos);
      const k = `${Math.floor(v.pos.x / c.cell)},${Math.floor(v.pos.y / c.cell)},${Math.floor(v.pos.z / c.cell)}`;
      let cell = cells.get(k);
      if (!cell) cells.set(k, cell = { x: 0, y: 0, z: 0, r: 0, g: 0, b: 0, n: 0, vox: [] });
      cell.x += v.pos.x; cell.y += v.pos.y; cell.z += v.pos.z;
      cell.r += v.color.r; cell.g += v.color.g; cell.b += v.color.b;
      cell.n++; cell.vox.push(v);
    }
    cen.divideScalar(worldVoxels.length);
    const chosen = [...cells.values()].filter(k => k.n >= c.minVoxels).sort((a, b) => b.n - a.n)
      .slice(0, Math.min(c.perKill, room));
    const taken = new Set();
    for (const k of chosen) {
      const x = k.x / k.n, y = k.y / k.n, z = k.z / k.n;
      // a chunk's size follows how full its cell was: a solid cell is a full cube
      const s = c.cell * (0.62 + 0.38 * Math.min(1, Math.cbrt(k.n * voxelSize ** 3 / c.cell ** 3)));
      _s.set(x - cen.x, y - cen.y, z - cen.z);
      const len = Math.max(_s.length(), 0.05);
      // a HEAP, not confetti: the chunks slump out of the body and fall where
      // it died (the first cut threw them at 2–5 u/s and they scattered)
      _s.divideScalar(len).multiplyScalar(0.6 + Math.random() * 1.2);
      _s.x += impulse.x * 0.25 + (Math.random() - 0.5) * 0.6;
      _s.y += impulse.y * 0.25 + 0.4 + Math.random() * 1.2;
      _s.z += impulse.z * 0.25 + (Math.random() - 0.5) * 0.6;
      // world → solver: (x, y, z) → (x, −z, y)
      const b = new Rigid(this.sv, [s, s, s], 1, c.friction, [x, -z, Math.max(y, s * 0.6)], [_s.x, -_s.z, _s.y]);
      b.velocityAng.set([(Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8]);
      this.gibs.push({ b, s, m: b.mass, r: k.r / k.n, g: k.g / k.n, bl: k.b / k.n, still: 0 });
      for (const v of k.vox) taken.add(v);
    }
    while (this.gibs.length > c.cap) { this._remove(0); this.stats.retired++; }
    this.stats.bursts++;
    this.stats.sent += chosen.length;
    return taken.size ? worldVoxels.filter(v => !taken.has(v)) : worldVoxels;
  }

  /**
   * RUBBLE (v53, season 1's cover that dies): a pile collapses into `count`
   * chunks drawn from inside its box (centre x, z; yaw; len × h × thick),
   * each `size` across, in `color`. They fall and heap where the pile stood.
   */
  rubble(x, z, yaw, len, h, thick, count, size, color) {
    const c = this.cfg;
    const room = Math.max(0, c.awakeCap - this.awake);
    count = Math.min(count, room);
    if (!this.on || count <= 0 || this.ms > c.budgetMs) { this.stats.refused++; return 0; }
    const cs = Math.cos(yaw), sn = Math.sin(yaw);
    for (let i = 0; i < count; i++) {
      const u = (Math.random() - 0.5) * (len - size), v = (Math.random() - 0.5) * (thick - size);
      const wx = x + u * cs + v * sn, wz = z - u * sn + v * cs, wy = size * 0.6 + Math.random() * (h - size);
      const s = size * (0.7 + Math.random() * 0.6);
      const b = new Rigid(this.sv, [s, s, s], 1, c.friction, [wx, -wz, wy], [(Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.6]);
      b.velocityAng.set([(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4]);
      const k = 0.8 + Math.random() * 0.4;
      this.gibs.push({ b, s, m: b.mass, r: color[0] * k, g: color[1] * k, bl: color[2] * k, still: 0 });
    }
    while (this.gibs.length > c.cap) { this._remove(0); this.stats.retired++; }
    this.stats.sent += count;
    return count;
  }

  /** v53 THE ROCKFALL: one chunk dropped from `y` at (x, z), flagged as a hazard
   *  until it comes to rest — main asks `fallingOn(feet)` every frame. */
  rock(x, z, y, size, color) {
    const c = this.cfg;
    if (!this.on || this.awake >= c.awakeCap) { this.stats.refused++; return null; }
    const s = size * (0.8 + Math.random() * 0.4);
    const b = new Rigid(this.sv, [s, s, s], 1, c.friction, [x, -z, y], [(Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8, -2]);
    b.velocityAng.set([(Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5]);
    const k = 0.85 + Math.random() * 0.3;
    const g = { b, s, m: b.mass, r: color[0] * k, g: color[1] * k, bl: color[2] * k, still: 0, hazard: true };
    this.gibs.push(g);
    while (this.gibs.length > c.cap) { this._remove(0); this.stats.retired++; }
    return g;
  }

  /** is a falling hazard about to land on a body standing at (x, y, z)? */
  fallingOn(x, y, z, radius = 0.5) {
    for (const g of this.gibs) {
      if (!g.hazard || g.b.mass <= 0) continue;
      const p = g.b.positionLin;
      if (p[0] === undefined) continue;
      if (g.b.velocityLin[2] > -3) continue;
      if (Math.hypot(p[0] - x, -p[1] - z) > g.s * 0.5 + radius) continue;
      if (p[2] - g.s * 0.5 > y + 2.2 || p[2] + g.s * 0.5 < y) continue;
      g.hazard = false;   // one strike per rock
      return g;
    }
    return null;
  }

  _remove(i) {
    const { b } = this.gibs[i];
    for (const f of b.forces.slice()) f.destroy();
    const j = this.sv.bodies.indexOf(b);
    if (j >= 0) this.sv.bodies.splice(j, 1);
    this.gibs.splice(i, 1);
  }

  /**
   * THE TIDE (v53, season 2): the crest lifts every gib it reaches, carries it
   * along its travel and drops it where the crest leaves it — so the heaps
   * move with the sea and the floor is never the same twice. A sleeping gib
   * is woken by the water; it sleeps again where it lands.
   */
  carry(goo) {
    if (!goo.cfg) return 0;
    let n = 0;
    for (const g of this.gibs) {
      const b = g.b, p = b.positionLin;                 // solver (x, y, z) = world (x, −z, y)
      const h = goo.heightAt(p[0], -p[1]);
      if (h < g.s * 0.5 + 0.02) continue;              // no crest under it
      const lift = h - (p[2] - g.s * 0.5);
      if (lift <= 0) continue;                          // already riding above it
      if (b.mass <= 0) { b.mass = g.m; g.still = 0; }   // the water wakes it
      // slower than the crest, so the crest overtakes it and sets it down a few
      // units on (at 0.9× it rode the crest clean off the disc — the first probe)
      b.velocityLin[0] = goo.dirX * goo.speed * 0.45;
      b.velocityLin[1] = -goo.dirZ * goo.speed * 0.45;
      b.velocityLin[2] = Math.max(b.velocityLin[2], Math.min(lift * 14, 6));
      n++;
    }
    this.stats.carried = (this.stats.carried || 0) + n;
    return n;
  }

  update(dt) {
    const c = this.cfg;
    this.acc = Math.min(this.acc + dt, c.maxSteps / 60);
    let steps = 0, spent = 0;
    while (this.acc >= 1 / 60 && steps < c.maxSteps) {
      this.acc -= 1 / 60;
      steps++;
      if (!this.awake) continue;               // a sleeping heap costs nothing
      const t0 = performance.now();
      this.sv.step();
      spent += performance.now() - t0;
      // SLEEP: still for long enough → static, and it stays where it came to rest
      for (const g of this.gibs) {
        const b = g.b;
        if (b.mass <= 0) continue;
        const v = Math.hypot(b.velocityLin[0], b.velocityLin[1], b.velocityLin[2]);
        const w = Math.hypot(b.velocityAng[0], b.velocityAng[1], b.velocityAng[2]);
        g.still = (v < c.sleepV && w < c.sleepW) ? g.still + 1 : 0;
        if (g.still > c.sleepSteps) { b.mass = 0; b.velocityLin.fill(0); b.velocityAng.fill(0); g.hazard = false; }
      }
    }
    if (steps) this.ms += ((spent / steps) - this.ms) * 0.15;
    // off the disc, or through the floor: gone
    for (let i = this.gibs.length - 1; i >= 0; i--) {
      const p = this.gibs[i].b.positionLin;
      if (Math.hypot(p[0], p[1]) > this.arenaR + 0.3 || p[2] < -2) { this._remove(i); this.stats.fell++; }
    }
    this._draw();
  }

  _draw() {
    const n = this.gibs.length;
    for (let i = 0; i < n; i++) {
      const g = this.gibs[i], b = g.b;
      _q.set(b.positionAng[0], b.positionAng[1], b.positionAng[2], b.positionAng[3]);
      _m.compose(_p.set(b.positionLin[0], b.positionLin[1], b.positionLin[2]), _q, _s.set(g.s, g.s, g.s));
      this.mesh.setMatrixAt(i, _m);
      this.mesh.setColorAt(i, _c.setRGB(g.r, g.g, g.bl));
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }

  /**
   * v54 THE RUBBLE IS THE LEVEL (season 1). A SLEEPING gib is terrain: its top
   * is a floor (`topAt`), it stops a projectile (`blocks`) and a body is pushed
   * out of it (`pushOut`). Only the sleeping ones — a chunk still tumbling is
   * debris, not ground. Each is treated as its axis-aligned cube, which is a
   * little generous on a chunk that came to rest turned; at 0.3–0.95 u that is
   * inside a foot's width. World (x, y, z) = solver (x, z, −y).
   */
  topAt(x, z, maxY = Infinity) {
    let top = null;
    for (const g of this.gibs) {
      if (g.b.mass > 0) continue;
      const p = g.b.positionLin, h = g.s * 0.5;
      if (Math.abs(x - p[0]) > h + 0.2 || Math.abs(z + p[1]) > h + 0.2) continue;
      const t = p[2] + h;
      if (t > maxY) continue;
      if (top === null || t > top) top = t;
    }
    return top;
  }

  blocks(p0, p1) {
    for (const g of this.gibs) {
      if (g.b.mass > 0 || g.s < 0.4) continue;       // a knuckle of bone is not cover
      const p = g.b.positionLin, h = g.s * 0.5;
      if (segBox(p0, p1, p[0] - h, p[0] + h, p[2] - h, p[2] + h, -p[1] - h, -p[1] + h)) return g;
    }
    return null;
  }

  pushOut(pos, radius = 0.6, foot = 0) {
    let hit = null;
    for (const g of this.gibs) {
      if (g.b.mass > 0 || g.s < 0.4) continue;
      const p = g.b.positionLin, h = g.s * 0.5;
      if (pos.y - foot >= p[2] + h - 0.05) continue;  // standing on it, not in it
      const dx = pos.x - p[0], dz = pos.z + p[1], hx = h + radius;
      if (Math.abs(dx) >= hx || Math.abs(dz) >= hx) continue;
      const ox = hx - Math.abs(dx), oz = hx - Math.abs(dz);
      if (ox <= oz) pos.x += (Math.sign(dx) || 1) * ox; else pos.z += (Math.sign(dz) || 1) * oz;
      hit = g;
    }
    return hit;
  }

  getState() {
    let top = 0, minZ = Infinity;
    for (const g of this.gibs) { top = Math.max(top, g.b.positionLin[2]); minZ = Math.min(minZ, g.b.positionLin[2] - g.s / 2); }
    return { on: this.on, n: this.gibs.length, awake: this.awake, ms: +this.ms.toFixed(3), cap: this.cfg.cap,
      top: +top.toFixed(3), floorGap: this.gibs.length ? +minZ.toFixed(3) : null, ...this.stats };
  }
}

/** slab test of segment p0→p1 against an axis-aligned box (v54) */
function segBox(p0, p1, x0, x1, y0, y1, z0, z1) {
  let t0 = 0, t1 = 1;
  const o = [p0.x, p0.y, p0.z], d = [p1.x - p0.x, p1.y - p0.y, p1.z - p0.z];
  const lo = [x0, y0, z0], hi = [x1, y1, z1];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) { if (o[i] < lo[i] || o[i] > hi[i]) return false; continue; }
    let a = (lo[i] - o[i]) / d[i], b = (hi[i] - o[i]) / d[i];
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, b);
    if (t0 > t1) return false;
  }
  return true;
}
