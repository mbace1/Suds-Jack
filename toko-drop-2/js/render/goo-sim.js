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
//   CLING on the rail's wall (v81): a drop that met the rail below the
//         wall's height sticks where it struck and runs down the wall by the
//         same law, streaking it as it goes (a WALL stamp a step), until it
//         reaches the foot and slides on across the floor, or runs dry
// And the bodies in the goo (v84): a coarse WET MAP of the floor, fed by every
// stamp and pour, tells each body what it stands in — a fast body in a pool
// SPRAYS drops out of its foot, and a foot that stood in goo lays TRACKS of
// it once it is out (stamps, like a sliding drop's streak).
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
// The wall's stamps (`wstamps`, v81) are the same floats on the wall's own
// plane: `s` metres along the rail (wallS) for x, metres UP the wall for z.
// Every number is TUNING.goo.

export const STAMP = 10;   // x, z, dx, dz, len, wid, amt, r, g, b
export const BODY = 8;     // x, z, R, H, vx, vz, id, shape (0 dome, 1 box, 2 ball: the hero; 3 the hero mid-dash, which nothing rides)
export const AIR = 1, SLIDE = 2, RIDE = 3, CLING = 4;
const VOL = 4 / 3 * Math.PI;   // a drop of radius r holds VOL r³
const _w = new Float32Array(16);   // a splash's shares
const _p = { x: 0, z: 0 };

// The rail unwrapped into one line (v81), `s` metres along it from the far
// wall's left end, going round clockwise seen from above: side 0 the far wall
// (z = −hz, s runs with x), 1 the right wall (x = hx, s with z), 2 the near
// wall (z = hz, s against x), 3 the left wall (x = −hx, s against z). Seen
// from inside the arena every wall has s running left to right.
export const wallLen = (hx, hz) => 4 * (hx + hz);
export function wallS(side, x, z, hx, hz) { return side === 0 ? x + hx : side === 1 ? 2 * hx + z + hz : side === 2 ? 3 * hx + 2 * hz - x : 4 * hx + 3 * hz - z; }
export function wallXZ(side, s, hx, hz, out) {
  if (side === 0) { out.x = s - hx; out.z = -hz; } else if (side === 1) { out.x = hx; out.z = s - 2 * hx - hz; }
  else if (side === 2) { out.x = 3 * hx + 2 * hz - s; out.z = hz; } else { out.x = -hx; out.z = 4 * hx + 3 * hz - s; }
  return out;
}
// each wall's inward normal and the way s runs along it, and the span of s it covers
export const WALL_N = [[0, 1], [-1, 0], [0, -1], [1, 0]], WALL_T = [[1, 0], [0, 1], [-1, 0], [0, -1]];
export function wallSpan(side, hx, hz) { const a = side === 0 ? 0 : side === 1 ? 2 * hx : side === 2 ? 2 * hx + 2 * hz : 4 * hx + 2 * hz; return [a, a + (side % 2 ? 2 * hz : 2 * hx)]; }

export class GooSim {
  constructor(cap, P) {
    this.cap = cap; this.P = P;
    const f = () => new Float32Array(cap);
    this.x = f(); this.y = f(); this.z = f(); this.vx = f(); this.vy = f(); this.vz = f();
    this.r = f(); this.life = f(); this.cr = f(); this.cg = f(); this.cb = f();
    this.ra = f(); this.rh = f();               // RIDE: bearing round the body, height up it
    this.ws = f(); this.side = new Uint8Array(cap);   // CLING: s along the rail, which wall
    this.st = new Uint8Array(cap); this.body = new Int32Array(cap);
    this.n = 0;                                  // live drops, packed at the front
    this.stamps = new Float32Array(P.stampCap * STAMP); this.ns = 0;
    this.wstamps = new Float32Array(P.stampCap * STAMP); this.nws = 0;   // the wall's (v81)
    this.stats = { emitted: 0, refused: 0, splashed: 0, bounced: 0, rode: 0, clung: 0, stamps: 0, sprayed: 0, tracked: 0 };
    this._bi = new Map();
    // v84: the wet map (a cell's goo volume and its hue, weighted by volume) and each body's foot
    this.wet = { cols: 0, rows: 0, hx: 0, hz: 0, v: null, r: null, g: null, b: null };
    this.feet = new Map(); this.tick = 0;
  }

  clear() { this.n = 0; this.ns = 0; this.nws = 0; this.feet.clear(); for (const a of [this.wet.v, this.wet.r, this.wet.g, this.wet.b]) a?.fill(0); }

  // the arena's half sizes: the wet map covers it at `cell` m a cell, and a
  // new arena starts dry (step() checks too, so a sim never run through here
  // still has a map; but goo laid before its first step needs this first)
  setArena(hx, hz) { if (this.P.wet) this._wetGrid(hx, hz); }

  _wetGrid(hx, hz) {
    const W = this.wet, c = this.P.wet?.cell ?? 1;
    if (W.hx === hx && W.hz === hz && W.v) return;
    W.hx = hx; W.hz = hz; W.cols = Math.max(1, Math.ceil(2 * hx / c)); W.rows = Math.max(1, Math.ceil(2 * hz / c));
    const n = W.cols * W.rows;
    W.v = new Float32Array(n); W.r = new Float32Array(n); W.g = new Float32Array(n); W.b = new Float32Array(n);
    this.feet.clear();
  }

  _cell(x, z) {
    const W = this.wet, c = this.P.wet?.cell ?? 1;
    const cx = Math.max(0, Math.min(W.cols - 1, Math.floor((x + W.hx) / c))), cz = Math.max(0, Math.min(W.rows - 1, Math.floor((z + W.hz) / c)));
    return cz * W.cols + cx;
  }

  // goo laid on the floor at (x, z): `vol` m³ of this colour (every stamp of
  // the sim's own, and the view's pours and puddles)
  wetAdd(x, z, vol, r, g, b) {
    const W = this.wet;
    if (!W.v || !(vol > 0)) return;
    const i = this._cell(x, z);
    W.v[i] += vol; W.r[i] += r * vol; W.g[i] += g * vol; W.b[i] += b * vol;
  }

  // how wet the floor is under (x, z), 0..1
  wetAt(x, z) { const W = this.wet; return W.v ? Math.min(1, W.v[this._cell(x, z)] * this.P.wet.gain) : 0; }

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
    this.ws[i] = this.ws[j]; this.side[i] = this.side[j];
  }

  stamp(x, z, dx, dz, len, wid, amt, r, g, b) {
    if (this.ns >= this.P.stampCap) return;
    const o = this.ns++ * STAMP, s = this.stamps;
    s[o] = x; s[o + 1] = z; s[o + 2] = dx; s[o + 3] = dz; s[o + 4] = len; s[o + 5] = wid; s[o + 6] = amt; s[o + 7] = r; s[o + 8] = g; s[o + 9] = b;
    this.stats.stamps++;
    this.wetAdd(x + dx * len * 0.5, z + dz * len * 0.5, amt, r, g, b);
  }

  // a stamp on the wall (v81): `s` along the rail, `y` up the wall
  wstamp(s_, y, ds, dy, len, wid, amt, r, g, b) {
    if (this.nws >= this.P.stampCap) return;
    const o = this.nws++ * STAMP, s = this.wstamps;
    s[o] = s_; s[o + 1] = y; s[o + 2] = ds; s[o + 3] = dy; s[o + 4] = len; s[o + 5] = wid; s[o + 6] = amt; s[o + 7] = r; s[o + 8] = g; s[o + 9] = b;
    this.stats.stamps++;
  }

  // One step. `bodies` is a flat array of BODY floats a body; `hx`, `hz` the
  // arena's half sizes: its rail is a wall the goo runs down, as a curb is.
  // The stamps of this step are left in `stamps[0 … ns)` for the view, and
  // the wall's in `wstamps[0 … nws)`.
  step(dt, bodies, nb, hx, hz) {
    const P = this.P, G = P.gravity, A = P.air, F = P.floor, Rd = P.ride, Wl = P.wall;
    this.ns = 0; this.nws = 0; this.tick++;
    if (P.wet) this._wetGrid(hx, hz);
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
        // the rail: below the wall's height the goo meets a WALL and clings to
        // it (v81); above it, the old invisible rail: it loses its way and runs down
        let side = -1;
        if (x < -hx + r) side = 3; else if (x > hx - r) side = 1;
        else if (z < -hz + r) side = 0; else if (z > hz - r) side = 2;
        if (side >= 0) {
          if (Wl?.on && y <= Wl.h && y > r) { this.x[i] = x; this.y[i] = y; this.z[i] = z; this._cling(i, side, r, hx, hz); continue; }
          if (x < -hx + r || x > hx - r) { x = Math.max(-hx + r, Math.min(hx - r, x)); this.vx[i] *= -A.wall; this.vz[i] *= 0.5; }
          if (z < -hz + r || z > hz - r) { z = Math.max(-hz + r, Math.min(hz - r, z)); this.vz[i] *= -A.wall; this.vx[i] *= 0.5; }
        }
        this.x[i] = x; this.y[i] = y; this.z[i] = z;
        // a body in the way: the drop sticks to it
        let hit = -1;
        if (y < P.bodyTop) {
          for (let b = 0; b < nb; b++) {
            const o = b * BODY, R = bodies[o + 2], H = bodies[o + 3], shape = bodies[o + 7];
            if (y > H || shape === 3 || (shape === 2 && r > Rd.heroMaxR)) continue;   // the hero wears only fine drops, and none mid-dash
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
      } else if (st === CLING) {
        // down the wall at the speed a film its size runs, its sideways slip
        // dying out; it leaves itself behind on the wall as it goes
        const side = this.side[i], span = wallSpan(side, hx, hz);
        const term = Wl.creep + Wl.creepR * r * r;
        this.vy[i] += (-term - this.vy[i]) * Math.min(1, Wl.settle * dt);
        this.vx[i] *= Math.exp(-Wl.slip * dt);
        const ds = this.vx[i] * dt, dy = this.vy[i] * dt, dist = Math.hypot(ds, dy);
        const V = VOL * r * r * r, lose = Math.min(V, V * Wl.shed * dist);
        if (dist > 1e-4 && lose > 0) this.wstamp(this.ws[i], this.y[i], ds / dist, dy / dist, dist, r * Wl.streakWide, lose, this.cr[i], this.cg[i], this.cb[i]);
        const nr = Math.cbrt((V - lose) / VOL);
        let s = this.ws[i] + ds;
        const y = this.y[i] + dy;
        if (s < span[0] + nr) { s = span[0] + nr; this.vx[i] = 0; } else if (s > span[1] - nr) { s = span[1] - nr; this.vx[i] = 0; }   // it stops at the corner
        this.ws[i] = s; this.r[i] = nr;
        if (y <= nr) {
          // at the foot: onto the floor, sliding on a little off the wall
          const vs = this.vx[i], o = wallXZ(side, s, hx, hz, _p), N = WALL_N[side], Tg = WALL_T[side];
          this.st[i] = SLIDE; this.y[i] = nr * F.flat;
          this.x[i] = o.x + N[0] * nr * 1.5; this.z[i] = o.z + N[1] * nr * 1.5;
          this.vx[i] = Tg[0] * vs + N[0] * Wl.out; this.vz[i] = Tg[1] * vs + N[1] * Wl.out;
          this.life[i] = Math.max(this.life[i], 0.6);
        } else if (nr < Wl.minR) {
          this.wstamp(s, y, 0, -1, 0, nr * Wl.blob, VOL * nr * nr * nr, this.cr[i], this.cg[i], this.cb[i]);
          this._kill(i);
        } else this._onWall(i, side, s, y, nr, hx, hz);
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
    if (P.wet) this._bodies(dt, bodies, nb);
  }

  // v84: the bodies in the goo. The wet map drains; each body reads what it
  // stands in: a fast one in a pool sprays drops out of its foot (back and to
  // the sides, in the pool's colour), and a foot picks goo up in a wet cell
  // and lays it down as a streak once it is out and moving
  _bodies(dt, bodies, nb) {
    const P = this.P, Wt = P.wet, S = Wt.spray, Tk = Wt.tracks, W = this.wet, feet = this.feet;
    const k = Math.exp(-dt / Wt.tau);
    for (let i = 0; i < W.v.length; i++) if (W.v[i] > 0) { W.v[i] *= k; W.r[i] *= k; W.g[i] *= k; W.b[i] *= k; if (W.v[i] < 1e-7) W.v[i] = W.r[i] = W.g[i] = W.b[i] = 0; }
    for (let b = 0; b < nb; b++) {
      const o = b * BODY, x = bodies[o], z = bodies[o + 1], R = bodies[o + 2], vx = bodies[o + 4], vz = bodies[o + 5], id = bodies[o + 6];
      const sp = Math.hypot(vx, vz), ux = sp > 1e-6 ? vx / sp : 1, uz = sp > 1e-6 ? vz / sp : 0;
      const ci = this._cell(x, z), vol = W.v[ci], wet = Math.min(1, vol * Wt.gain);
      let f = feet.get(id);
      if (!f) { f = { fw: 0, r: 1, g: 1, b: 1, acc: 0, seen: 0 }; feet.set(id, f); }
      f.seen = this.tick;
      if (wet > Tk.pickAt) {
        // in the goo: the foot takes some on, in the pool's colour
        const take = Math.min(Tk.cap - f.fw, Tk.pick * wet * dt);
        if (take > 0) {
          const hr = W.r[ci] / vol, hg = W.g[ci] / vol, hb = W.b[ci] / vol, t = f.fw + take;
          f.r = (f.r * f.fw + hr * take) / t; f.g = (f.g * f.fw + hg * take) / t; f.b = (f.b * f.fw + hb * take) / t; f.fw = t;
        }
        // a fast body throws the pool out of its foot: back and to the sides
        if (wet > S.minWet && sp > S.minSpeed) {
          f.acc += S.rate * wet * (sp / 6) * dt;
          const hr = W.r[ci] / vol, hg = W.g[ci] / vol, hb = W.b[ci] / vol, lo = Math.log(S.size.min), span = Math.log(S.size.max) - lo;
          for (let n = 0; n < S.perStep && f.acc >= 1; n++) {
            f.acc -= 1;
            const a = Math.atan2(-uz, -ux) + (Math.random() * 2 - 1) * S.back, r = Math.exp(lo + span * Math.random() ** S.size.skew);
            const v = S.speed[0] + Math.random() * (S.speed[1] - S.speed[0]) + sp * S.carry * Math.random();
            if (this.emit(x + Math.cos(a) * R * 0.8, r + 0.01, z + Math.sin(a) * R * 0.8, Math.cos(a) * v, S.up[0] + Math.random() * (S.up[1] - S.up[0]), Math.sin(a) * v, r, hr, hg, hb)) this.stats.sprayed++;
          }
        }
      } else if (wet < Tk.layAt && f.fw > 1e-7 && sp > Tk.minSpeed) {
        // out of the goo and moving: the foot lays what it carries behind it
        const dist = sp * dt, lose = Math.min(f.fw, f.fw * Tk.lay * dist);
        this.stamp(x - ux * dist, z - uz * dist, ux, uz, dist, R * Tk.wide, lose, f.r, f.g, f.b);
        f.fw -= lose; this.stats.tracked++;
      }
    }
    // feet of bodies long gone
    if (feet.size > 256) for (const [id, f] of feet) if (this.tick - f.seen > 600) feet.delete(id);
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

// AIR → a wall (v81): an impact stain on it; a crown back off it if it came
// in fast and fat, else it clings with what is left and runs down
GooSim.prototype._cling = function (i, side, r, hx, hz) {
  const P = this.P, Wl = P.wall, S = P.splash, F = P.floor, N = WALL_N[side], Tg = WALL_T[side];
  const vx = this.vx[i], vy = this.vy[i], vz = this.vz[i];
  const vn = Math.max(0, -(vx * N[0] + vz * N[1])), vt = vx * Tg[0] + vz * Tg[1];   // into the wall; along it
  const span = wallSpan(side, hx, hz);
  const s = Math.max(span[0] + r, Math.min(span[1] - r, wallS(side, this.x[i], this.z[i], hx, hz)));
  const y = Math.max(r, Math.min(Wl.h, this.y[i]));
  const vp = Math.hypot(vt, vy), ut = vp > 1e-6 ? vt / vp : 1, uy = vp > 1e-6 ? vy / vp : 0;   // the way it travels on the wall
  const sinA = vn / Math.max(1e-6, Math.hypot(vn, vp)), stretch = Math.min(F.maxElong, 1 / Math.max(0.05, sinA));
  const cr = this.cr[i], cg = this.cg[i], cb = this.cb[i], V = VOL * r * r * r;
  if (vn > S.speed && r > S.minR) {
    // a crown back off the wall: the stain keeps `keep` of the drop, the rest
    // flies back into the arena, swung toward the way it was travelling
    this.stats.splashed++;
    this.wstamp(s, y, ut, uy, r * (stretch - 1) * 2, r * F.blob, V * S.keep, cr, cg, cb);
    const n = Math.max(1, Math.min(S.count, Math.round(S.perSpeed * vn * r / S.minR)));
    const w = _w; let sum = 0;
    for (let k = 0; k < n; k++) { w[k] = 0.5 + Math.random(); sum += w[k]; }
    const px = this.x[i], pz = this.z[i], sw = vt < 0 ? -1 : 1;
    this._kill(i);
    for (let k = 0; k < n; k++) {
      const rc = r * Math.cbrt((1 - S.keep) * w[k] / sum), sp = (0.3 + 0.7 * Math.random()) * S.out * vn, a = (Math.random() * 2 - 1) * 1.2;
      const ox = N[0] * Math.cos(a) + Tg[0] * Math.sin(a) * sw, oz = N[1] * Math.cos(a) + Tg[1] * Math.sin(a) * sw;
      const ex = Math.max(-hx + rc, Math.min(hx - rc, px + N[0] * rc * 2)), ez = Math.max(-hz + rc, Math.min(hz - rc, pz + N[1] * rc * 2));
      if (!this.emit(ex, y, ez, ox * sp + Tg[0] * vt * S.carry, Math.abs(vy) * S.up * (0.4 + 0.6 * Math.random()), oz * sp + Tg[1] * vt * S.carry, rc, cr, cg, cb)) this.wstamp(s, y, ut, uy, 0, rc * F.blob, VOL * rc * rc * rc, cr, cg, cb);
    }
    return;
  }
  // the impact's stain on the wall, then it clings with what is left
  this.wstamp(s, y, ut, uy, r * (stretch - 1), r * F.blob * 0.8, V * Wl.impact, cr, cg, cb);
  const nr = r * Math.cbrt(1 - Wl.impact);
  this.st[i] = CLING; this.side[i] = side; this.ws[i] = s; this.r[i] = nr;
  this.vx[i] = vt * Wl.keep; this.vy[i] = Math.min(0, vy) * Wl.keep; this.vz[i] = 0;   // vx: along the wall; vy: down it
  this._onWall(i, side, s, y, nr, hx, hz);
  this.stats.clung++;
};

// a clinging drop's place in the world: on its wall, `proud` × its radius off it
GooSim.prototype._onWall = function (i, side, s, y, r, hx, hz) {
  const o = wallXZ(side, s, hx, hz, _p), off = r * this.P.wall.proud, N = WALL_N[side];
  this.x[i] = o.x + N[0] * off; this.z[i] = o.z + N[1] * off; this.y[i] = y;
};

// how wide a body is at height y: the dome is the unit sphere raised 0.7 and
// cut at the floor (gel.js domeGeometry), the box stands upright, the ball
// (the hero) sits on the floor
export function radiusAt(shape, R, H, y) {
  if (shape === 1) return R * 0.9;
  if (shape >= 2) { const c = H * 0.5, d = (y - c) / c; return R * Math.sqrt(Math.max(0, 1 - d * d)); }
  const Y = (y / H) * 1.7 - 0.7;
  return R * Math.sqrt(Math.max(0, 1 - Y * Y));
}
