import * as THREE from 'three';
import { Solver } from './avbd/solver.js?v=1';
import { Rigid } from './avbd/body.js?v=1';
import { shadedBox, applyFaceShade } from './voxel.js?v=85';

/**
 * CARGO (v53, season 3 — owner: *cargo, not decks*). Trailers carry stacked
 * crates in a rigid-body solver of their own (AVBD, js/avbd/). Each trailer
 * is a kinematic body — static in the solver, posed from the truck every
 * step — so a crate resting on it is carried by friction, and a truck that
 * brakes hard or swerves has its load slide. A crate that leaves the trailer
 * lands on the road (a static slab) and is culled once it falls behind.
 *
 * WHAT KEEPS IT CHEAP: a crate that has been riding quietly for `weldSteps`
 * steps is WELDED — it goes static and is posed from its trailer each step
 * at the offset it settled at, and costs nothing. A jolt (the trailer's
 * acceleration over `jolt`, a jackknife, a missile) unwelds every crate on
 * that trailer. So on a steady convoy nothing is solved at all.
 *
 * Frame: the solver is z-up. world (x, y, z) → solver (x, −z, y); the
 * instanced mesh lives in a group turned −90° about x, so a body's transform
 * is its instance matrix.
 */
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();
const CRATES = [[0.62, 0.48, 0.30], [0.70, 0.62, 0.42], [0.36, 0.46, 0.50], [0.55, 0.30, 0.24], [0.60, 0.58, 0.32]];

export const CARGO_DEFAULTS = {
  cap: 160,
  chance: 0.75,      // a truck carries cargo
  min: 2, max: 5,    // crates per loaded trailer
  size: [0.7, 1.05], // crate edge, drawn between
  friction: 0.55,
  iterations: 4,
  weldSteps: 12, weldV: 0.25, weldW: 1.0,
  jolt: 9,           // trailer acceleration (u/s²) that unwelds the load
  budgetMs: 4,
};

export class Cargo {
  constructor(scene, cfg = {}) {
    this.cfg = { ...CARGO_DEFAULTS, ...cfg };
    this.sv = new Solver();
    this.sv.iterations = this.cfg.iterations;
    this.group = new THREE.Group();
    this.group.rotation.x = -Math.PI / 2;
    this.group.name = 'cargo';
    scene.add(this.group);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    applyFaceShade(mat);
    mat.customProgramCacheKey = () => 'voxel-cargo';
    this.mesh = new THREE.InstancedMesh(shadedBox(1), mat, this.cfg.cap);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(this.cfg.cap * 3), 3);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.group.add(this.mesh);
    this.crates = [];
    this.trailers = new Map();   // truck → { body, prevVx, prevVz }
    this.road = null;
    this.ms = 0;
    this.acc = 0;
    this.stats = { loaded: 0, spilled: 0, rewelded: 0, jolts: 0 };
  }

  clear() {
    this.sv.clear();
    this.crates.length = 0;
    this.trailers.clear();
    this.road = null;
    this.mesh.count = 0;
    this.acc = 0;
  }

  /** the road: one static slab under the convoy, moved along with it */
  _ensureRoad(roadY, z) {
    if (!this.road) this.road = new Rigid(this.sv, [40, 600, 2], 0, this.cfg.friction, [0, -z, roadY - 1]);
    else this.road.positionLin[1] = -z;
  }

  /** a truck's trailer as a kinematic body, posed from the truck now */
  _trailer(t) {
    let tr = this.trailers.get(t);
    if (!tr) {
      tr = { body: new Rigid(this.sv, [t.w, t.depth, t.trailerH], 0, this.cfg.friction, [0, 0, 0]), pvx: t.vx, pvz: t.vz, awake: 0 };
      this.trailers.set(t, tr);
    }
    this._poseTrailer(t, tr.body);
    return tr;
  }

  _poseTrailer(t, body) {
    // the trailer's top centre is the truck group's origin; its body centre is trailerH/2 below
    const g = t.group;
    _q.setFromEuler(g.rotation);
    _p.set(0, -t.trailerH / 2, 0).applyQuaternion(_q).add(g.position);
    // world → solver: position (x, −z, y); rotation: conjugate by the −90° x turn
    body.positionLin[0] = _p.x; body.positionLin[1] = -_p.z; body.positionLin[2] = _p.y;
    // a world rotation in the solver's frame is R⁻¹·q, R the group's −90° about x
    _q2.setFromAxisAngle(_s.set(1, 0, 0), Math.PI / 2).multiply(_q);
    body.positionAng[0] = _q2.x; body.positionAng[1] = _q2.y; body.positionAng[2] = _q2.z; body.positionAng[3] = _q2.w;
  }

  /** load a truck: stacked crates on the trailer's top, welded from the start */
  load(t) {
    const c = this.cfg;
    if (Math.random() > c.chance || this.crates.length >= c.cap - c.max) return 0;
    const tr = this._trailer(t);
    const n = c.min + Math.floor(Math.random() * (c.max - c.min + 1));
    let placed = 0;
    for (let i = 0; i < n; i++) {
      const s = c.size[0] + Math.random() * (c.size[1] - c.size[0]);
      const u = (Math.random() - 0.5) * (t.w - s), v = (Math.random() - 0.5) * (t.depth - s);
      const stack = Math.random() < 0.3 ? s : 0;
      const local = new THREE.Vector3(u, s / 2 + stack + 0.02, v);   // in the truck group's frame (top centre origin)
      const world = local.clone().applyEuler(t.group.rotation).add(t.group.position);
      const b = new Rigid(this.sv, [s, s, s], 1, c.friction, [world.x, -world.z, world.y]);
      const col = CRATES[Math.floor(Math.random() * CRATES.length)];
      const cr = { b, s, m: b.mass, truck: t, local, welded: true, quiet: 0, col };
      b.mass = 0;
      this.crates.push(cr);
      placed++;
    }
    this.stats.loaded += placed;
    return placed;
  }

  /** unweld everything on a truck (a jolt, a jackknife, a hit) */
  jolt(t, kick = 0) {
    let n = 0;
    for (const cr of this.crates) {
      if (cr.truck !== t || !cr.welded) continue;
      cr.welded = false; cr.quiet = 0; cr.b.mass = cr.m;
      cr.b.velocityLin[0] = t.vx + (Math.random() - 0.5) * kick;
      cr.b.velocityLin[1] = -t.vz;
      cr.b.velocityLin[2] = kick * 0.4 * Math.random();
      n++;
    }
    if (n) this.stats.jolts++;
    return n;
  }

  /**
   * v54 CARGO IS THE SCORE (season 3): land on a loose crate that is still on
   * its trailer and your weight sets it back — it re-welds where it is. Returns
   * how many were saved, so the caller can pay for them.
   */
  stomp(feet) {
    let n = 0;
    for (const cr of this.crates) {
      if (cr.welded || !cr.truck || cr.stomped) continue;
      const p = cr.b.positionLin, h = cr.s / 2;
      if (Math.abs(feet.x - p[0]) > h + 0.3 || Math.abs(-feet.z - p[1]) > h + 0.3) continue;
      if (feet.y > p[2] + h + 0.35 || feet.y < p[2] - h) continue;   // the feet in it or just on it (a loose crate is not floor, so a body falls INTO it)
      const t = cr.truck, g = t.group;
      _p.set(p[0], p[2], -p[1]).sub(g.position).applyEuler(_e.set(-g.rotation.x, -g.rotation.y, -g.rotation.z, 'ZYX'));
      if (Math.abs(_p.x) > t.w / 2 || Math.abs(_p.z) > t.depth / 2 || _p.y < 0) continue;
      cr.local.copy(_p); cr.welded = true; cr.b.mass = 0; cr.b.velocityLin.fill(0); cr.b.velocityAng.fill(0);
      this.stats.rewelded++; this.stats.stomped = (this.stats.stomped || 0) + 1;
      n++;
    }
    return n;
  }

  /** the top of a WELDED crate under (x, z), for the body to stand on */
  topAt(x, z) {
    let best = null;
    for (const cr of this.crates) {
      if (!cr.welded) continue;
      const p = cr.b.positionLin;
      if (Math.abs(x - p[0]) > cr.s / 2 + 0.25 || Math.abs(-z - p[1]) > cr.s / 2 + 0.25) continue;
      const top = p[2] + cr.s / 2;
      if (best === null || top > best) best = top;
    }
    return best;
  }

  update(dt, trucks, playerZ, roadY) {
    const c = this.cfg;
    // pose every trailer from its truck; a jolt unwelds its load
    for (const t of trucks) {
      const tr = this.trailers.get(t);
      if (!tr) continue;
      const ax = (t.vx - tr.pvx) / Math.max(dt, 1e-3), az = (t.vz - tr.pvz) / Math.max(dt, 1e-3);
      tr.pvx = t.vx; tr.pvz = t.vz;
      if (Math.hypot(ax, az) > c.jolt || t.jack > 0) this.jolt(t, t.jack > 0 ? 3 : 0);
      this._poseTrailer(t, tr.body);
    }
    // trailers whose truck is gone
    for (const [t, tr] of this.trailers) {
      if (trucks.includes(t)) continue;
      for (const f of tr.body.forces.slice()) f.destroy();
      const j = this.sv.bodies.indexOf(tr.body); if (j >= 0) this.sv.bodies.splice(j, 1);
      this.trailers.delete(t);
    }
    // welded crates ride their trailer
    for (const cr of this.crates) {
      if (!cr.welded || !cr.truck) continue;
      const g = cr.truck.group;
      _p.copy(cr.local).applyEuler(g.rotation).add(g.position);
      cr.b.positionLin[0] = _p.x; cr.b.positionLin[1] = -_p.z; cr.b.positionLin[2] = _p.y;
      _q.setFromEuler(g.rotation);
      _q2.setFromAxisAngle(_s.set(1, 0, 0), Math.PI / 2).multiply(_q);
      cr.b.positionAng[0] = _q2.x; cr.b.positionAng[1] = _q2.y; cr.b.positionAng[2] = _q2.z; cr.b.positionAng[3] = _q2.w;
    }
    this._ensureRoad(roadY, playerZ - 200);
    // solve the loose ones
    const awake = this.crates.some(cr => !cr.welded);
    this.acc = Math.min(this.acc + dt, 2 / 60);
    let steps = 0, spent = 0;
    while (this.acc >= 1 / 60 && steps < 2) {
      this.acc -= 1 / 60; steps++;
      if (!awake) continue;
      const t0 = performance.now();
      this.sv.step();
      spent += performance.now() - t0;
      // re-weld: a loose crate riding quietly on a trailer again
      for (const cr of this.crates) {
        if (cr.welded) continue;
        const b = cr.b, t = cr.truck;
        // fallen below its deck: it is the road's now (it can never be quiet
        // relative to a truck doing twenty, so the re-weld test never ran)
        if (t && b.positionLin[2] < t.group.position.y - 0.6) { cr.truck = null; cr.quiet = 0; continue; }
        const tr = t && this.trailers.get(t);
        const rel = tr ? Math.hypot(b.velocityLin[0] - t.vx, b.velocityLin[1] + t.vz, b.velocityLin[2]) : 99;
        const w = Math.hypot(b.velocityAng[0], b.velocityAng[1], b.velocityAng[2]);
        cr.quiet = (rel < c.weldV && w < c.weldW) ? cr.quiet + 1 : 0;
        if (cr.quiet > c.weldSteps && tr) {
          // is it still on the trailer? (its centre inside the footprint, above the top)
          const g = t.group;
          _p.set(b.positionLin[0], b.positionLin[2], -b.positionLin[1]).sub(g.position).applyEuler(_e.set(-g.rotation.x, -g.rotation.y, -g.rotation.z, 'ZYX'));
          if (Math.abs(_p.x) < t.w / 2 && Math.abs(_p.z) < t.depth / 2 && _p.y > 0) {
            cr.local.copy(_p); cr.welded = true; b.mass = 0; b.velocityLin.fill(0); b.velocityAng.fill(0);
            this.stats.rewelded++;
          } else { cr.truck = null; cr.quiet = 0; }
        }
      }
    }
    if (steps) this.ms += ((spent / steps) - this.ms) * 0.15;
    // spilled crates on the road: static once still; gone once behind
    for (let i = this.crates.length - 1; i >= 0; i--) {
      const cr = this.crates[i], p = cr.b.positionLin;
      const worldZ = -p[1];
      if (worldZ > playerZ + 40 || p[2] < roadY - 3) { this._remove(i); continue; }
      if (!cr.welded && !cr.truck && cr.b.mass > 0) {
        const v = Math.hypot(cr.b.velocityLin[0], cr.b.velocityLin[1], cr.b.velocityLin[2]);
        if (v < 0.15) { cr.b.mass = 0; cr.b.velocityLin.fill(0); cr.b.velocityAng.fill(0); this.stats.spilled++; }
      }
    }
    this._draw();
  }

  _remove(i) {
    const { b } = this.crates[i];
    for (const f of b.forces.slice()) f.destroy();
    const j = this.sv.bodies.indexOf(b); if (j >= 0) this.sv.bodies.splice(j, 1);
    this.crates.splice(i, 1);
  }

  _draw() {
    const n = Math.min(this.crates.length, this.cfg.cap);
    for (let i = 0; i < n; i++) {
      const cr = this.crates[i], b = cr.b;
      _q.set(b.positionAng[0], b.positionAng[1], b.positionAng[2], b.positionAng[3]);
      _m.compose(_p.set(b.positionLin[0], b.positionLin[1], b.positionLin[2]), _q, _s.set(cr.s, cr.s, cr.s));
      this.mesh.setMatrixAt(i, _m);
      this.mesh.setColorAt(i, _c.setRGB(cr.col[0], cr.col[1], cr.col[2]));
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }

  getState() {
    return { n: this.crates.length, welded: this.crates.filter(c => c.welded).length, loose: this.crates.filter(c => !c.welded).length,
      onRoad: this.crates.filter(c => !c.truck).length, ms: +this.ms.toFixed(3), ...this.stats };
  }
}
