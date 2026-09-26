// THE PUSHER — the Raccoin half of the machine. Pure: no DOM, no three.js, no
// clock; stepped with a fixed dt by the engine.
//
// Top-down coordinates (bu): x in [-HW, HW] across, z from the back wall (0)
// toward you; the front edge is at z = D. The slab's front face moves between
// PZ0 and PZ1. Heights are LEVELS, not positions: a coin lies on the bed
// (level 0), on the coins under it (1, 2), or on top of the slab (the shelf).
//
// This is quasi-static on purpose. A coin on a pusher bed does not slide
// anywhere on its own — friction eats a push in a hand's breadth — so a coin
// moves because something moved it: the slab, a coin that was moved, a coin it
// was lying on. That is what makes a bed a PILE that conserves coins (a coin in
// at the back is roughly a coin out at the front) rather than a slide.

export const PUSHER = {
  HW: 23, D: 30,
  PZ0: 6, PZ1: 13,
  PERIOD: 2.6,           // seconds per stroke
  GZ: 22,                // beyond this the side walls stop: the gutters
  COIN_R: 1.0,
  THICK: 0.3,            // one level of height, in bu, for the eye
  SLAB_H: 2.2,           // the shelf's height above the bed
  DT: 1 / 60,
  MAX_LVL: 1,
  ITER: 4,
};

let _uid = 1;

export class Pusher {
  constructor(rng, opts = {}) {
    this.rng = rng;
    this.coins = [];       // every coin on the shelf or the bed
    this.events = [];
    this.t = 0;
    this.zp = PUSHER.PZ0;
    this.dzp = 0;
    this.stroke = opts.stroke ?? 0;          // extra reach, from charms
    this.period = opts.period ?? PUSHER.PERIOD;
    this.guards = opts.guards ?? 0;          // 0..1: how much of the gutter is walled
    this.tilt = opts.tilt ?? 0;              // bu/s the bed creeps forward
    this.strokes = 0;
    this._phase = 0;
  }

  get PZ1() { return PUSHER.PZ1 + this.stroke; }
  get gutterZ() { return PUSHER.GZ + (PUSHER.D - PUSHER.GZ) * this.guards; }

  // The house float: the bed a machine is delivered with. Laid on a jittered
  // hex lattice, because dropping coins at random jams at about 55% cover
  // (random sequential adsorption) and stacks the rest — a bed that has never
  // been pushed. A few go on top for the pile's texture, and the shelf gets a
  // row, so the first shift pays instead of filling.
  //
  // PACKED is the word that matters. A pile only passes a push along if it is
  // solid from the slab's reach to the lip: at 86% cover the first cut
  // swallowed 36 coins without paying one, every push spent closing gaps. So
  // the lattice is touching, it runs from the lip back to where the slab
  // reaches, and the front row already hangs a little over the edge — the way
  // a machine looks when the arcade has loaded it.
  fill({ bed = 1, stacked = 30, shelf = 1, value = () => ({}) } = {}) {
    const { HW, D } = PUSHER, r = PUSHER.COIN_R;
    const dx = 2 * r * 1.002, dz = dx * Math.sqrt(3) / 2;
    let row = 0;
    for (let z = D - r * 0.55; z > this.PZ1 + r * 0.6; z -= dz, row++) {
      for (let x = -HW + r + (row % 2 ? dx / 2 : 0); x < HW - r; x += dx) {
        if (this.rng.next() > bed) continue;
        this.coins.push(this.make(x + this.rng.wobble(0.05), z + this.rng.wobble(0.05), 0, false, value()));
      }
    }
    for (let i = 0; i < stacked; i++) {
      const c = this.make(this.rng.range(-HW + 2, HW - 2), this.rng.range(this.PZ1 + 3, D - 4), 1, false, value());
      this.coins.push(c);
    }
    // the shelf too: packed from the back wall to the slab's edge, so the very
    // first coin that lands on it shoves one off the front
    row = 0;
    for (let z = r; z < this.zp - r * 0.25; z += dz, row++) {
      for (let x = -HW + r + (row % 2 ? dx / 2 : 0); x < HW - r; x += dx) {
        if (this.rng.next() > shelf) continue;
        this.coins.push(this.make(x + this.rng.wobble(0.05), z, 0, true, value()));
      }
    }
    for (let k = 0; k < 30; k++) { this.settle(0); this.settle(1); }
  }

  make(x, z, lvl, shelf, props = {}) {
    const r = PUSHER.COIN_R * (props.scale ?? 1);
    return { id: _uid++, x, z, r, m: (props.scale ?? 1) ** 2, lvl, shelf, vx: 0, vz: 0,
      value: props.value ?? 1, kind: props.kind ?? 'copper', fall: 0,
      spin: this.rng.next() * Math.PI * 2, tilt: 0, age: 10, meta: props.meta ?? null, support: 1 };
  }

  // a coin arrives from above: a chute, the payout hopper, a prize drop
  drop(x, z, props = {}) {
    const r = PUSHER.COIN_R * (props.scale ?? 1);
    const coin = {
      id: _uid++, x: clamp(x, -PUSHER.HW + r, PUSHER.HW - r), z, r, m: (props.scale ?? 1) ** 2,
      lvl: 0, shelf: false, vx: props.vx ?? 0, vz: props.vz ?? 0,
      value: props.value ?? 1, kind: props.kind ?? 'copper',
      fall: props.fall ?? 0.35,         // seconds of drop the eye still sees
      spin: this.rng.next() * Math.PI * 2, tilt: 0, age: 0, meta: props.meta ?? null,
    };
    this.place(coin);
    this.coins.push(coin);
    this.events.push({ t: 'drop', coin });
    return coin;
  }

  // Where a coin comes to rest when it lands at (x, z): on the slab if the slab
  // is under it, else on the bed at the lowest level with room, resting on
  // whatever is there.
  place(c) {
    c.shelf = c.z < this.zp;
    const level = (lvl) => this.coins.filter(o => o !== c && o.shelf === c.shelf && o.lvl === lvl && !o.gone);
    for (let lvl = 0; lvl <= PUSHER.MAX_LVL; lvl++) {
      const same = level(lvl);
      const crowd = same.some(o => dist(o, c) < (o.r + c.r) * 0.72);
      if (crowd) continue;
      if (lvl > 0 && !level(lvl - 1).some(o => dist(o, c) < (o.r + c.r) * 0.95)) { c.lvl = Math.max(0, lvl - 1); return; }
      c.lvl = lvl; return;
    }
    c.lvl = PUSHER.MAX_LVL;
  }

  step(dt = PUSHER.DT) {
    const { PZ0 } = PUSHER;
    this.t += dt;
    const prevZ = this.zp;
    this._phase += dt / this.period;
    if (this._phase >= 1) { this._phase -= 1; this.strokes++; this.events.push({ t: 'stroke', n: this.strokes }); }
    this.zp = PZ0 + (this.PZ1 - PZ0) * (1 - Math.cos(this._phase * Math.PI * 2)) / 2;
    this.dzp = this.zp - prevZ;

    const cs = this.coins;
    const decay = Math.exp(-dt / 0.12);
    for (const c of cs) {
      c.age += dt;
      if (c.fall > 0) c.fall = Math.max(0, c.fall - dt);
      c._x = c.x; c._z = c.z;
      if (c.shelf) { if (c.lvl === 0) c.z += this.dzp; }      // the slab carries what lies on it
      else {
        c.x += c.vx * dt; c.z += c.vz * dt;                  // what was just dropped slides a little
        c.vx *= decay; c.vz *= decay;
        if (this.tilt && c.lvl === 0) c.z += this.tilt * dt;
      }
    }
    // Level by level, bottom up: settle a level, then carry the one above it
    // by what its supporters did — a coin lying on others goes where they go.
    this.settle(0);
    for (let lvl = 1; lvl <= PUSHER.MAX_LVL; lvl++) { this.carry(lvl); this.settle(lvl); }
    this.transitions();
  }

  settle(lvl) {
    const group = this.coins.filter(c => c.lvl === lvl);
    if (!group.length) return;
    for (let it = 0; it < PUSHER.ITER; it++) {
      this.separate(group);
      for (const c of group) this.walls(c);
    }
  }

  carry(lvl) {
    const below = this.coins.filter(c => c.lvl === lvl - 1);
    const g = hash(below), { head, next } = g;
    for (const c of this.coins) {
      if (c.lvl !== lvl) continue;
      let sx = 0, sz = 0, n = 0;
      const ix = cellX(c.x), iz = cellZ(c.z);
      for (let z = Math.max(0, iz - 1); z <= Math.min(NZ - 1, iz + 1); z++) {
        for (let x = Math.max(0, ix - 1); x <= Math.min(NX - 1, ix + 1); x++) {
          for (let j = head[z * NX + x]; j >= 0; j = next[j]) {
            const o = below[j];
            if (o.shelf !== c.shelf) continue;
            const dx = o.x - c.x, dz = o.z - c.z, rr = (o.r + c.r) * 0.95;
            if (dx * dx + dz * dz < rr * rr) { sx += o.x - o._x; sz += o.z - o._z; n++; }
          }
        }
      }
      c.support = n;
      if (n) { c.x += sx / n; c.z += sz / n; }
    }
  }

  // Coins at the same level on the same surface may not overlap. The grid's
  // cell is one coin across, so a pair of ordinary coins is always in
  // neighbouring cells; the rare big ones (jumbos, prizes) check everything.
  separate(group) {
    const g = hash(group), { head, next } = g;
    const n = group.length;
    for (let i = 0; i < n; i++) {
      const a = group[i];
      if (a.r > 1.02) { for (let j = 0; j < n; j++) if (j !== i && (group[j].r <= 1.02 || j > i)) this.push(a, group[j]); continue; }
      const ix = cellX(a.x), iz = cellZ(a.z);
      for (let z = iz > 0 ? iz - 1 : 0, z1 = iz < NZ - 1 ? iz + 1 : NZ - 1; z <= z1; z++) {
        for (let x = ix > 0 ? ix - 1 : 0, x1 = ix < NX - 1 ? ix + 1 : NX - 1; x <= x1; x++) {
          for (let j = head[z * NX + x]; j >= 0; j = next[j]) {
            if (j <= i || group[j].r > 1.02) continue;
            this.push(a, group[j]);
          }
        }
      }
    }
  }

  push(a, b) {
    if (b.shelf !== a.shelf) return;
    const ex = b.x - a.x, ez = b.z - a.z, rr = a.r + b.r;
    if (ex >= rr || ex <= -rr || ez >= rr || ez <= -rr) return;
    const d2 = ex * ex + ez * ez;
    if (d2 >= rr * rr) return;
    let d = Math.sqrt(d2), nx, nz;
    if (d < 1e-6) { const ang = this.rng.next() * Math.PI * 2; nx = Math.cos(ang); nz = Math.sin(ang); d = 0; }
    else { nx = ex / d; nz = ez / d; }
    const over = rr - d, ia = 1 / a.m, ib = 1 / b.m, sum = ia + ib;
    a.x -= nx * over * ia / sum; a.z -= nz * over * ia / sum;
    b.x += nx * over * ib / sum; b.z += nz * over * ib / sum;
  }

  walls(c) {
    const { HW } = PUSHER;
    if (c.shelf) {
      if (c.z < c.r) c.z = c.r;                                  // the back wall scrapes
      c.x = clamp(c.x, -HW + c.r, HW - c.r);
      return;
    }
    if (c.z < this.zp + c.r) c.z = this.zp + c.r;                // the slab's face shoves
    if (c.z < this.gutterZ) c.x = clamp(c.x, -HW + c.r, HW - c.r);
  }

  transitions() {
    const { HW, D } = PUSHER;
    const cs = this.coins;
    for (let i = cs.length - 1; i >= 0; i--) {
      const c = cs[i];
      if (c.shelf && c.z > this.zp + c.r * 0.15) {
        // off the front of the slab and down onto the bed
        c.shelf = false; c.fall = 0.18;
        c.vz = Math.max(0, this.dzp / PUSHER.DT) * 0.2;
        this.place(c);
        this.events.push({ t: 'tumble', coin: c });
        continue;
      }
      if (!c.shelf && c.z > D) {
        cs.splice(i, 1);
        this.events.push({ t: 'collect', coin: c });
        continue;
      }
      if (!c.shelf && Math.abs(c.x) > HW && c.z >= this.gutterZ) {
        cs.splice(i, 1);
        this.events.push({ t: 'gutter', coin: c, side: Math.sign(c.x) });
        continue;
      }
      // a coin whose supporters have gone drops a level
      if (c.lvl > 0 && c.support === 0 && c.fall === 0) {
        c.lvl--; c.fall = 0.1;
        this.place(c);
      }
    }
  }

  // take coins off the bed without paying for them (the raccoon, a charm)
  remove(pred, reason) {
    const out = [];
    for (let i = this.coins.length - 1; i >= 0; i--) {
      if (pred(this.coins[i])) { out.push(this.coins[i]); this.coins.splice(i, 1); }
    }
    for (const c of out) this.events.push({ t: 'removed', coin: c, reason });
    return out;
  }

  // Is the machine quiet? Nothing still falling, nothing still sliding.
  get settled() {
    return this.coins.every(c => c.fall === 0 && Math.abs(c.vx) + Math.abs(c.vz) < 0.2);
  }

  drain() { const e = this.events; this.events = []; return e; }
}

// A flat bucket grid over the bed (and a margin past every edge): rebuilt per
// pass from linked lists in typed arrays. The Map it replaced cost 0.9 ms a
// step at 340 coins; this is the pile's whole inner loop.
const CELL = 2.05;               // one ordinary coin across, and a hair
const GX0 = -27, GZ0 = -4, NX = 27, NZ = 19;
const cellX = x => { const i = Math.floor((x - GX0) / CELL); return i < 0 ? 0 : i >= NX ? NX - 1 : i; };
const cellZ = z => { const i = Math.floor((z - GZ0) / CELL); return i < 0 ? 0 : i >= NZ ? NZ - 1 : i; };
function hash(list) {
  const head = new Int32Array(NX * NZ).fill(-1), next = new Int32Array(list.length);
  for (let i = 0; i < list.length; i++) {
    const k = cellZ(list[i].z) * NX + cellX(list[i].x);
    next[i] = head[k]; head[k] = i;
  }
  return { head, next };
}
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
