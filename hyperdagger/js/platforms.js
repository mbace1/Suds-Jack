import * as THREE from 'three';
import { shaleGeometry } from './shale.js?v=77';
import { gelMoundGeometry, GelSpring } from './gel.js?v=77';

/**
 * PLATFORMS — slabs that GROW out of the floor, DRIFT, and SINK back.
 *
 * Season 1's brief: "growing and moving platforms", and then "lower mostly".
 * Each one rises from the disc over `grow` seconds, stands for a while
 * orbiting a small circle, then sinks and is re-seeded somewhere else —
 * never under your feet, never on the rock. While it stands it is a floor
 * (`player.floorY`, the same value the track writes) and its sides are walls
 * (push-out, and a `wallContact` so a wall run can use a moving slab). A
 * body standing on one is CARRIED: the slab's motion this frame is added to
 * the feet, or a moving floor slides out from under you and reads as ice.
 *
 * Only the disc and court arenas have these; the track keeps its own slabs.
 */
export class Platforms {
  constructor(scene, material) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'platforms';
    scene.add(this.group);
    this.mat = material;
    this.list = [];
    this.cfg = null;
    this.draw = Math.random;
    this.avoid = null;   // (x, z, half) => bool — true where a slab may not stand
    this.player = null;
    this.gelMat = null;  // v44: a season's gel material, for `look: 'gel'` slabs
  }

  get count() { return this.list.length; }

  /** Seed `cfg.count` slabs. `draw` is the run's rng (seeded on DAILY so
   *  everyone gets the same arena); `avoid` says where rock already stands. */
  build(cfg, draw = Math.random, avoid = null, player = null) {
    this.clear();
    this.cfg = cfg;
    this.draw = draw;
    this.avoid = avoid;
    this.player = player;
    if (!cfg) return;
    for (let i = 0; i < cfg.count; i++) {
      const p = this._make();
      // stagger the first crop so they are not all born in the same second
      p.t = -draw() * cfg.grow * 2.5;
      this.list.push(p);
    }
  }

  _make() {
    const c = this.cfg, d = this.draw;
    const w = c.wMin + d() * (c.wMax - c.wMin);
    const depth = c.wMin + d() * (c.wMax - c.wMin);
    // LOW, mostly: the draw is SQUARED, so most slabs sit near hMin and only
    // a few reach hMax (owner: "platforms should be lower mostly")
    const t = d(); const h = c.hMin + t * t * (c.hMax - c.hMin);
    // dark shale in beds, crooked tiles on top (shale.js) — or, for season 2,
    // a MOUND of goo cubes with a rounded silhouette (gel.js), the brief's
    // "soft edges on large voxel platforms"
    const gel = c.look === 'gel' && this.gelMat;
    const geo = gel
      ? gelMoundGeometry({ w, h, d: depth, draw: d, ...(c.gel ?? {}) })
      : shaleGeometry({ w, h, d: depth, draw: d, ...(c.shale ?? {}) });
    const mesh = new THREE.Mesh(geo, gel ? this.gelMat : this.mat);
    this.group.add(mesh);
    // v46: a gel mound GIVES WAY — a squash spring (gel.js, from Toko Drop)
    // on its height; a shale slab is rock and has none
    const spring = gel ? new GelSpring(c.spring ?? {}) : null;
    const p = { w, depth, h, mesh, phase: 'grow', t: 0, k: 0, life: 0, spring, sq: 1, wasOn: false,
      cx: 0, cz: 0, x: 0, z: 0, px: 0, pz: 0, ang: 0, top: 0, dir: d() < 0.5 ? -1 : 1 };
    this._place(p);
    return p;
  }

  /** A spot in the radius band, off the player and off the rock. */
  _place(p) {
    const c = this.cfg, d = this.draw;
    const half = Math.max(p.w, p.depth) * 0.5;
    for (let tries = 0; tries < 40; tries++) {
      const a = d() * Math.PI * 2;
      const r = c.rMin + d() * (c.rMax - c.rMin);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (this.player && Math.hypot(x - this.player.feet.x, z - this.player.feet.z) < c.avoidPlayer + half) continue;
      if (this.avoid && this.avoid(x, z, half + c.drift)) continue;
      let clash = false;
      for (const o of this.list) {
        if (o === p) continue;
        if (Math.hypot(x - o.cx, z - o.cz) < half + Math.max(o.w, o.depth) * 0.5 + c.drift * 2 + 1.0) { clash = true; break; }
      }
      if (clash) continue;
      p.cx = x; p.cz = z; break;
    }
    p.ang = d() * Math.PI * 2;
    p.life = c.lifeMin + d() * (c.lifeMax - c.lifeMin);
    p.t = 0; p.k = 0; p.phase = 'grow';
    p.spring?.reset(); p.sq = 1; p.wasOn = false;
    this._pose(p);
    p.px = p.x; p.pz = p.z;
  }

  _pose(p) {
    const c = this.cfg;
    p.x = p.cx + Math.cos(p.ang) * c.drift;
    p.z = p.cz + Math.sin(p.ang) * c.drift;
    const k = Math.max(0.02, p.k);
    p.top = p.h * k * p.sq;
    p.mesh.scale.y = k * p.sq;          // shale's origin is its BASE: it grows up out of the floor
    if (p.spring) { const s = p.spring.side; p.mesh.scale.x = s; p.mesh.scale.z = s; } // volume kept
    p.mesh.position.set(p.x, 0, p.z);
    p.mesh.visible = p.k > 0.01;
  }

  /**
   * Runs BEFORE player.update (same rule as the track): the floor has to be
   * known before gravity integrates. Writes player.floorY = the highest slab
   * top under the feet, or the arena floor. Also advances every slab.
   */
  preUpdate(dt, player, baseFloor = 0) {
    const c = this.cfg;
    if (!c) { player.floorY = baseFloor; return; }
    const ease = k => k * k * (3 - 2 * k);
    for (const p of this.list) {
      p.px = p.x; p.pz = p.z;
      p.t += dt;
      if (p.phase === 'grow') {
        if (p.t >= 0) p.k = ease(Math.min(1, p.t / c.grow));
        if (p.t >= c.grow) { p.phase = 'live'; p.t = 0; p.k = 1; }
      } else if (p.phase === 'live') {
        p.ang += c.driftW * p.dir * dt;
        if (p.t >= p.life) { p.phase = 'sink'; p.t = 0; }
      } else {
        p.k = 1 - ease(Math.min(1, p.t / c.sink));
        if (p.t >= c.sink) { this._place(p); continue; }
      }
      if (p.spring) p.sq = p.spring.step(dt);
      this._pose(p);
    }
    // what is under the feet
    let floor = baseFloor, on = null;
    const f = player.feet;
    for (const p of this.list) {
      if (p.k < 0.05) continue;
      if (Math.abs(f.x - p.x) > p.w * 0.5 + 0.3 || Math.abs(f.z - p.z) > p.depth * 0.5 + 0.3) continue;
      // only a top at or below the feet holds you — you pass the side of a
      // slab you are jumping past rather than snapping up onto it
      if (p.top > f.y + 0.45) continue;
      if (p.top > floor) { floor = p.top; on = p; }
    }
    player.floorY = floor;
    // CARRIED: standing on it, its motion is yours
    if (on && f.y <= on.top + 0.05 && player.vy <= 0) {
      f.x += on.x - on.px;
      f.z += on.z - on.pz;
    }
    // v46 GEL: landing on a mound squashes it (harder from higher), leaving it
    // upward lets it stretch back, and while it is giving way under you your
    // feet stay ON it — a floor that dips out from under a body would read as
    // a fall and spend a jump
    for (const p of this.list) {
      if (!p.spring) continue;
      const here = on === p;
      if (here && !p.wasOn && player.vy < -2) p.spring.kick(-(this.cfg.landSquish ?? 0.32) * Math.min(1, -player.vy / 14));
      else if (!here && p.wasOn && player.vy > 1) p.spring.kick(0.12);
      if (here && p.sq < 0.995 && player.vy <= 0 && f.y - p.top < 0.7) f.y = p.top;
      p.wasOn = here;
    }
    player.platform = on;
  }

  /**
   * Runs AFTER player.update, beside walls.resolve: the sides of a slab are
   * walls. Push out along the shortest horizontal axis, kill the velocity
   * into it, and report a contact so a wall run can ride a moving slab.
   */
  resolve(player, radius = 0.45) {
    const f = player.feet;
    let contact = null;
    for (const p of this.list) {
      if (p.k < 0.05) continue;
      if (f.y >= p.top - 0.05) continue;            // on top, or above it
      const hx = p.w * 0.5 + radius, hz = p.depth * 0.5 + radius;
      const dx = f.x - p.x, dz = f.z - p.z;
      if (Math.abs(dx) >= hx || Math.abs(dz) >= hz) continue;
      const pxo = hx - Math.abs(dx), pzo = hz - Math.abs(dz);
      let nx = 0, nz = 0;
      if (pxo <= pzo) nx = Math.sign(dx) || 1; else nz = Math.sign(dz) || 1;
      const push = Math.min(pxo, pzo);
      f.x += nx * push; f.z += nz * push;
      const into = player.velocity.x * nx + player.velocity.z * nz;
      if (into < 0) { player.velocity.x -= nx * into; player.velocity.z -= nz * into; }
      if (player.dashT > 0) { const d = player.dashDir.x * nx + player.dashDir.z * nz; if (d < 0) { player.dashDir.x -= nx * d; player.dashDir.z -= nz * d; } }
      contact = { nx, nz, wall: p };
    }
    if (contact) {
      if (!player.wallContact) player.wallContact = contact;
      player._sync?.();
    }
    return contact;
  }

  /** The top of the highest slab covering (x, z), or `base`. A gem rests on
   *  a slab instead of sinking through it to the floor. */
  topAt(x, z, base = 0) {
    let top = base;
    for (const p of this.list) {
      if (p.k < 0.05) continue;
      if (Math.abs(x - p.x) > p.w * 0.5 || Math.abs(z - p.z) > p.depth * 0.5) continue;
      if (p.top > top) top = p.top;
    }
    return top;
  }

  /** Push a point out of any slab it is inside (see Walls.pushOut). A body
   *  standing on top is above it and is left alone. */
  pushOut(pos, radius = 0.6, foot = 0) {
    let hit = null;
    for (const p of this.list) {
      if (p.k < 0.05) continue;
      if (pos.y - foot >= p.top - 0.05) continue;
      const hx = p.w * 0.5 + radius, hz = p.depth * 0.5 + radius;
      const dx = pos.x - p.x, dz = pos.z - p.z;
      if (Math.abs(dx) >= hx || Math.abs(dz) >= hz) continue;
      const pxo = hx - Math.abs(dx), pzo = hz - Math.abs(dz);
      if (pxo <= pzo) pos.x += (Math.sign(dx) || 1) * pxo;
      else pos.z += (Math.sign(dz) || 1) * pzo;
      hit = p;
    }
    return hit;
  }

  /** Does the segment p0→p1 pass through a standing slab? (nails stop on it)
   *  Returns the slab, so a caller can make it flinch. */
  blocks(p0, p1) {
    for (const p of this.list) {
      if (p.k < 0.05) continue;
      if (segmentHitsBox(p0, p1, p.x - p.w / 2, p.x + p.w / 2, 0, p.top, p.z - p.depth / 2, p.z + p.depth / 2)) return p;
    }
    return null;
  }

  /** v46: a nail in the gel — the mound flinches */
  flinch(p, dv = -0.08) { p?.spring?.kick(dv); }

  clear() {
    for (const p of this.list) { this.group.remove(p.mesh); p.mesh.geometry.dispose(); }
    this.list.length = 0;
    this.cfg = null;
  }

  getState() {
    return {
      count: this.list.length,
      slabs: this.list.map(p => ({ x: +p.x.toFixed(2), z: +p.z.toFixed(2), top: +p.top.toFixed(2), h: +p.h.toFixed(2), w: +p.w.toFixed(2), d: +p.depth.toFixed(2), phase: p.phase, k: +p.k.toFixed(2), sq: +p.sq.toFixed(3), gel: !!p.spring })),
    };
  }
}

/** Segment vs axis-aligned box — the slab test both blockers use. */
export function segmentHitsBox(p0, p1, x0, x1, y0, y1, z0, z1) {
  let tmin = 0, tmax = 1;
  const axes = [[p0.x, p1.x - p0.x, x0, x1], [p0.y, p1.y - p0.y, y0, y1], [p0.z, p1.z - p0.z, z0, z1]];
  for (const [o, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return false; continue; }
    let t0 = (lo - o) / d, t1 = (hi - o) / d;
    if (t0 > t1) { const s = t0; t0 = t1; t1 = s; }
    if (t0 > tmin) tmin = t0;
    if (t1 < tmax) tmax = t1;
    if (tmin > tmax) return false;
  }
  return true;
}
