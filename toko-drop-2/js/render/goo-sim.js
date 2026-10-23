// goo-sim.js — the goo a kill throws: droplets as particles, in plain JS (no
// three.js, no DOM, no clock), so it benches and tests in bare node. The view
// (goo.js) draws what it holds and lays its stamps into the floor's film.
//
// It is the VIEW's physics, not the game's: it reads the bodies the sim has
// already placed and never writes the world, so Math.random is fine here and
// the run stays a replay of its seed.
//
// Every droplet is in one of three states:
//   AIR   gravity and air drag (linear plus quadratic, the quadratic part
//         falling with size: a fine mist slows, a fat drop carries), and the
//         bodies: a drop that meets a gel or the hero RIDES it
//   SLIDE on the floor: kinetic friction and the film's own drag slow it, and
//         as it slides it leaves itself behind (a STREAK stamp a step) until
//         it stops or runs dry; then its last blob and it is gone
//   RIDE  stuck to a body's skin, carried with it and creeping down its side
//         under gravity (faster for a fatter drop: a film runs as its
//         thickness squared); it drips off at the foot
// A floor impact decides between SPLASH (fast and fat: a crown of finer drops
// and an elongated stain), BOUNCE (fast and fine: surface tension wins, a
// little mark and off again) and SLIDE (everything else). The stain of an
// impact stretches along the travel by 1/sin of the impact angle, as spatter
// does: a drop that comes in low leaves a long tail, one that falls straight
// down a round blot.
//
// Stamps are the sim's output to the floor: STAMP floats a stamp, a capsule
// from (x, z) along (dx, dz) of length `len` and half-width `wid`, carrying
// `amt` of goo VOLUME (m³) and a colour. What a drop loses to the floor is
// what the floor gains, so a big kill leaves a deep pool and a mist a stipple.
// Every number is TUNING.goo.

export const STAMP = 10;   // x, z, dx, dz, len, wid, amt, r, g, b
export const BODY = 8;     // x, z, R, H, vx, vz, id, shape (0 dome, 1 box, 2 ball)
export const AIR = 1, SLIDE = 2, RIDE = 3;
const VOL = 4 / 3 * Math.PI;   // a drop of radius r holds VOL r³
const _w = new Float32Array(16);   // a splash's shares

export class GooSim {
  constructor(cap, P) {
    this.cap = cap; this.P = P;
    const f = () => new Float32Array(cap);
    this.x = f(); this.y = f(); this.z = f(); this.vx = f(); this.vy = f(); this.vz = f();
    this.r = f(); this.life = f(); this.cr = f(); this.cg = f(); this.cb = f();
    this.ra = f(); this.rh = f();               // RIDE: bearing round the body, height up it
    this.st = new Uint8Array(cap); this.body = new Int32Array(cap);
    this.n = 0;                                  // live drops, packed at the front
    this.stamps = new Float32Array(P.stampCap * STAMP); this.ns = 0;
    this.stats = { emitted: 0, refused: 0, splashed: 0, bounced: 0, rode: 0, stamps: 0 };
    this._bi = new Map();
  }

  clear() { this.n = 0; this.ns = 0; }

  // one drop; false when the pool is full (the view's budget decides how
  // much a single event may throw, so this is the last guard, not the plan)
  emit(x, y, z, vx, vy, vz, r, cr, cg, cb) {
    if (this.n >= this.cap) { this.stats.refused++; return false; }
    const i = this.n++;
    this.x[i] = x; this.y[i] = Math.max(y, r); this.z[i] = z; this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.r[i] = r; this.life[i] = this.P.life; this.cr[i] = cr; this.cg[i] = cg; this.cb[i] = cb; this.st[i] = AIR; this.body[i] = -1;
    this.stats.emitted++;
    return true;
  }

  // the last drop takes this one's slot: the pool stays packed, so the view
  // uploads one contiguous run
  _kill(i) {
    const j = --this.n;
    if (i === j) return;
    this.x[i] = this.x[j]; this.y[i] = this.y[j]; this.z[i] = this.z[j];
    this.vx[i] = this.vx[j]; this.vy[i] = this.vy[j]; this.vz[i] = this.vz[j];
    this.r[i] = this.r[j]; this.life[i] = this.life[j]; this.cr[i] = this.cr[j]; this.cg[i] = this.cg[j]; this.cb[i] = this.cb[j];
    this.ra[i] = this.ra[j]; this.rh[i] = this.rh[j]; this.st[i] = this.st[j]; this.body[i] = this.body[j];
  }

  stamp(x, z, dx, dz, len, wid, amt, r, g, b) {
    if (this.ns >= this.P.stampCap) return;
    const o = this.ns++ * STAMP, s = this.stamps;
    s[o] = x; s[o + 1] = z; s[o + 2] = dx; s[o + 3] = dz; s[o + 4] = len; s[o + 5] = wid; s[o + 6] = amt; s[o + 7] = r; s[o + 8] = g; s[o + 9] = b;
    this.stats.stamps++;
  }

  // One step. `bodies` is a flat array of BODY floats a body; `hx`, `hz` the
  // arena's half sizes: its rail is a wall the goo runs down, as a curb is.
  // The stamps of this step are left in `stamps[0 … ns)` for the view.
  step(dt, bodies, nb, hx, hz) {
    const P = this.P, G = P.gravity, A = P.air, F = P.floor, Rd = P.ride;
    this.ns = 0;
    const bi = this._bi; bi.clear();
    for (let k = 0; k < nb; k++) bi.set(bodies[k * BODY + 6], k);
    // newest first: a splash's crown is appended past the end and waits a step
    for (let i = this.n - 1; i >= 0; i--) {
      if ((this.life[i] -= dt) <= 0) { this._kill(i); continue; }
      const r = this.r[i], st = this.st[i];
      if (st === AIR) {
        this.vy[i] -= G * dt;
        const sp = Math.hypot(this.vx[i], this.vy[i], this.vz[i]);
        const k = 1 / (1 + (A.lin + A.quad * sp / r) * dt);       // implicit: stable at any dt
        this.vx[i] *= k; this.vy[i] *= k; this.vz[i] *= k;
        let x = this.x[i] + this.vx[i] * dt, y = this.y[i] + this.vy[i] * dt, z = this.z[i] + this.vz[i] * dt;
        // the rail: the goo meets it, loses its way and runs down it
        if (x < -hx + r || x > hx - r) { x = Math.max(-hx + r, Math.min(hx - r, x)); this.vx[i] *= -A.wall; this.vz[i] *= 0.5; }
        if (z < -hz + r || z > hz - r) { z = Math.max(-hz + r, Math.min(hz - r, z)); this.vz[i] *= -A.wall; this.vx[i] *= 0.5; }
        this.x[i] = x; this.y[i] = y; this.z[i] = z;
        // a body in the way: the drop sticks to it
        let hit = -1;
        if (y < P.bodyTop) {
          for (let b = 0; b < nb; b++) {
            const o = b * BODY, R = bodies[o + 2], H = bodies[o + 3];
            if (y > H || (bodies[o + 7] === 2 && r > Rd.heroMaxR)) continue;   // the hero wears only fine drops
            const dx = x - bodies[o], dz = z - bodies[o + 1];
            if (Math.abs(dx) > R + r || Math.abs(dz) > R + r) continue;
            const rad = radiusAt(bodies[o + 7], R, H, y);
            if (dx * dx + dz * dz < (rad + r * 0.5) ** 2) { hit = b; break; }
          }
        }
        if (hit >= 0) {
          // it sticks where it struck, on the skin
          const o = hit * BODY, a = Math.atan2(z - bodies[o + 1], x - bodies[o]), h = Math.max(r, y);
          const rad = radiusAt(bodies[o + 7], bodies[o + 2], bodies[o + 3], Math.min(h, bodies[o + 3])) + r * Rd.proud;
          this.st[i] = RIDE; this.body[i] = bodies[o + 6];
          this.ra[i] = a; this.rh[i] = h;
          this.x[i] = bodies[o] + Math.cos(a) * rad; this.z[i] = bodies[o + 1] + Math.sin(a) * rad; this.y[i] = h;
          this.life[i] = Math.min(this.life[i], Rd.max);
          this.stats.rode++;
          continue;
        }
        if (y <= r) this._land(i, r, hx, hz);
      } else if (st === SLIDE) {
        let vx = this.vx[i], vz = this.vz[i];
        const sp = Math.hypot(vx, vz);
        const nsp = Math.max(0, sp - (F.mu * G + F.visc * sp) * dt);
        // it leaves itself behind as it goes: a streak its own width,
        // carrying the volume it lost (`shed` of its volume a metre)
        const dist = sp * dt, V = VOL * r * r * r, lose = Math.min(V, V * F.shed * dist);
        if (dist > 1e-4 && lose > 0) this.stamp(this.x[i], this.z[i], vx / sp, vz / sp, dist, r * F.streakWide, lose, this.cr[i], this.cg[i], this.cb[i]);
        if (sp > 1e-6) { vx *= nsp / sp; vz *= nsp / sp; }
        const nr = Math.cbrt((V - lose) / VOL);
        let x = this.x[i] + vx * dt, z = this.z[i] + vz * dt;
        if (Math.abs(x) > hx - nr) { x = Math.sign(x) * (hx - nr); vx = 0; }
        if (Math.abs(z) > hz - nr) { z = Math.sign(z) * (hz - nr); vz = 0; }
        this.x[i] = x; this.z[i] = z; this.vx[i] = vx; this.vz[i] = vz;
        this.r[i] = nr; this.y[i] = nr * F.flat;
        if (nsp < F.stop || nr < F.minR) {
          this.stamp(x, z, 1, 0, 0, nr * F.blob, VOL * nr * nr * nr, this.cr[i], this.cg[i], this.cb[i]);
          this._kill(i);
        }
      } else {   // RIDE
        const k = bi.get(this.body[i]);
        if (k === undefined) {
          // the body has gone (dead, or a brood not out yet): it falls off
          this.st[i] = AIR; this.vx[i] = Math.cos(this.ra[i]) * Rd.out; this.vz[i] = Math.sin(this.ra[i]) * Rd.out; this.vy[i] = 1;
          continue;
        }
        const o = k * BODY, R = bodies[o + 2], H = bodies[o + 3];
        this.rh[i] -= (Rd.creep + Rd.creepR * r * r) * dt;
        const h = Math.min(this.rh[i], H);
        const rad = radiusAt(bodies[o + 7], R, H, h) + r * Rd.proud;
        this.x[i] = bodies[o] + Math.cos(this.ra[i]) * rad; this.z[i] = bodies[o + 1] + Math.sin(this.ra[i]) * rad; this.y[i] = h;
        this.vx[i] = bodies[o + 4]; this.vz[i] = bodies[o + 5]; this.vy[i] = 0;
        if (this.rh[i] <= r || this.life[i] < 0.05) {
          // off at the foot: a drip that slides out the way the body was going
          this.st[i] = SLIDE; this.y[i] = r * F.flat;
          this.vx[i] = bodies[o + 4] * Rd.carry + Math.cos(this.ra[i]) * Rd.out; this.vz[i] = bodies[o + 5] * Rd.carry + Math.sin(this.ra[i]) * Rd.out;
          this.life[i] = Math.max(this.life[i], 0.6);
        }
      }
    }
  }

  // AIR → the floor: splash, bounce or slide
  _land(i, r, hx, hz) {
    const P = this.P, F = P.floor, S = P.splash, B = P.bounce;
    const vn = -this.vy[i], vx = this.vx[i], vz = this.vz[i], vt = Math.hypot(vx, vz);
    const ux = vt > 1e-6 ? vx / vt : 1, uz = vt > 1e-6 ? vz / vt : 0;
    const sinA = vn / Math.max(1e-6, Math.hypot(vn, vt)), stretch = Math.min(F.maxElong, 1 / Math.max(0.05, sinA));
    const cr = this.cr[i], cg = this.cg[i], cb = this.cb[i], x = this.x[i], z = this.z[i], V = VOL * r * r * r;
    if (vn > S.speed && r > S.minR) {
      // a crown: the stain keeps `keep` of the drop, the rest flies on as
      // finer drops thrown forward of the impact (more so the lower it came in)
      this.stats.splashed++;
      this.stamp(x, z, ux, uz, r * (stretch - 1) * 2, r * F.blob, V * S.keep, cr, cg, cb);
      const n = Math.max(1, Math.min(S.count, Math.round(S.perSpeed * vn * r / S.minR)));
      const spread = Math.PI * (1 - Math.min(0.8, vt / (vn + vt)));
      // the children share what the stain did not keep, unevenly, and no more
      const w = _w; let sum = 0;
      for (let k = 0; k < n; k++) { w[k] = 0.5 + Math.random(); sum += w[k]; }
      this._kill(i);
      for (let k = 0; k < n; k++) {
        const rc = r * Math.cbrt((1 - S.keep) * w[k] / sum);
        const a = Math.atan2(uz, ux) + (Math.random() * 2 - 1) * spread, sp = (0.3 + 0.7 * Math.random()) * (S.out * vn + S.carry * vt);
        // a full pool keeps the share as stain rather than losing it
        if (!this.emit(Math.max(-hx + rc, Math.min(hx - rc, x)), rc, Math.max(-hz + rc, Math.min(hz - rc, z)),
          Math.cos(a) * sp, vn * S.up * (0.4 + 0.6 * Math.random()), Math.sin(a) * sp, rc, cr, cg, cb)) this.stamp(x, z, ux, uz, 0, rc * F.blob, VOL * rc * rc * rc, cr, cg, cb);
      }
      return;
    }
    if (vn > B.speed && r < B.maxR) {
      this.stats.bounced++;
      this.stamp(x, z, ux, uz, r * (stretch - 1), r * 0.6, V * B.mark, cr, cg, cb);
      this.y[i] = r; this.vy[i] = vn * B.e; this.vx[i] *= B.keep; this.vz[i] *= B.keep; this.r[i] = r * Math.cbrt(1 - B.mark);
      return;
    }
    // slide: the impact's stain, then it skids on with what is left
    this.stamp(x, z, ux, uz, r * (stretch - 1), r * F.blob * 0.8, V * F.impact, cr, cg, cb);
    this.r[i] = r * Math.cbrt(1 - F.impact);
    this.st[i] = SLIDE; this.y[i] = r * F.flat;
    this.vx[i] = vx * F.keep; this.vz[i] = vz * F.keep;
  }
}

// how wide a body is at height y: the dome is the unit sphere raised 0.7 and
// cut at the floor (gel.js domeGeometry), the box stands upright, the ball
// (the hero) sits on the floor
export function radiusAt(shape, R, H, y) {
  if (shape === 1) return R * 0.9;
  if (shape === 2) { const c = H * 0.5, d = (y - c) / c; return R * Math.sqrt(Math.max(0, 1 - d * d)); }
  const Y = (y / H) * 1.7 - 0.7;
  return R * Math.sqrt(Math.max(0, 1 - Y * Y));
}
