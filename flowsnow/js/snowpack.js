// THE SNOW REMEMBERS YOU.
//
// A rolling delta on the snow DEPTH — not on the height. That distinction is the
// whole design. `terrain.depth(x, z)` is how much loose snow lies over the firm
// floor, and it is already what the rider sinks into, what decides whether an
// edge can bite, what cushions a landing and what the score is keyed to. Write
// the displacement THERE and every one of those follows for free: riding your
// own trench is shallower snow, so it is faster and it grips; the berm you threw
// is deeper snow, so it slows you and floats you. Nothing had to be told.
//
// It is also why a carve can never cut below the firm floor: `cut` may only take
// what is actually lying there, and `depth` clamps at zero anyway.
//
// WHAT YOU TAKE, YOU PUT SOMEWHERE. That is the one invariant worth having, and
// it is exact rather than approximate: the volume removed from the trough is
// summed and then distributed over the berm ring by weight, so the field's total
// is unchanged by any carve. `core.mjs` asserts it to within a millilitre. A
// snowpack that quietly loses mass is one that flattens the mountain over 2,400 m.
//
// Pure — no DOM, no three.js, no clock — so the gate runs it in bare node.

// A board is about 0.30 m wide and a real carve leaves a trough a metre or so
// across with soft shoulders, so the cell is sized to resolve the SHOULDER
// rather than the edge: at 0.40 m a trough spans three or four cells and the
// finite-difference normal (EPS 0.35 in terrain.js) reads a slope rather than a
// cliff. Finer than this and the normal flips between neighbouring samples,
// which the rider feels as jitter rather than as a groove.
export const CELL = 0.40;
export const N = 192;                       // 192 x 0.40 = 76.8 m of memory
const HALF = (N * CELL) / 2;

export class Snowpack {
  constructor(n = N, cell = CELL) {
    this.n = n; this.cell = cell;
    this.d = new Float32Array(n * n);
    // absolute cell coordinates of the window's low corner. The buffer is
    // addressed toroidally, so scrolling costs only the rows that come into
    // view rather than a copy of the whole field.
    this.ox = 0; this.oz = 0;
    this.moved = 0;                          // m^3 displaced this run, for the HUD
  }

  clear() { this.d.fill(0); this.moved = 0; }

  // --- the window -----------------------------------------------------------
  // Centre on the rider. Whatever scrolls in is zeroed: it is ground this run
  // has not touched, and a toroidal buffer would otherwise hand back the
  // deformation from 77 m ago at the same index.
  recentre(x, z) {
    const n = this.n;
    const nx = Math.floor((x - HALF) / this.cell);
    const nz = Math.floor((z - HALF) / this.cell);
    const dx = nx - this.ox, dz = nz - this.oz;
    if (dx === 0 && dz === 0) return;
    if (Math.abs(dx) >= n || Math.abs(dz) >= n) { this.d.fill(0); this.ox = nx; this.oz = nz; return; }
    if (dx > 0) for (let k = 0; k < dx; k++) this._zeroCol(this.ox + n + k);
    else for (let k = 0; k < -dx; k++) this._zeroCol(this.ox - 1 - k);
    if (dz > 0) for (let k = 0; k < dz; k++) this._zeroRow(this.oz + n + k);
    else for (let k = 0; k < -dz; k++) this._zeroRow(this.oz - 1 - k);
    this.ox = nx; this.oz = nz;
  }
  _zeroCol(ax) { const n = this.n, i = ((ax % n) + n) % n; for (let j = 0; j < n; j++) this.d[j * n + i] = 0; }
  _zeroRow(az) { const n = this.n, j = ((az % n) + n) % n; const r = j * n; for (let i = 0; i < n; i++) this.d[r + i] = 0; }

  _in(ax, az) {
    return ax >= this.ox && ax < this.ox + this.n && az >= this.oz && az < this.oz + this.n;
  }
  _idx(ax, az) {
    const n = this.n;
    return (((az % n) + n) % n) * n + (((ax % n) + n) % n);
  }
  _get(ax, az) { return this._in(ax, az) ? this.d[this._idx(ax, az)] : 0; }

  // --- reading --------------------------------------------------------------
  // Bilinear, because `terrain.normal` takes finite differences over this and a
  // nearest-neighbour sample would give it a staircase to differentiate.
  at(x, z) {
    const fx = x / this.cell - 0.5, fz = z / this.cell - 0.5;
    const ax = Math.floor(fx), az = Math.floor(fz);
    const tx = fx - ax, tz = fz - az;
    const a = this._get(ax, az), b = this._get(ax + 1, az);
    const c = this._get(ax, az + 1), e = this._get(ax + 1, az + 1);
    return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + e * tx) * tz;
  }

  // --- writing --------------------------------------------------------------
  // Cut the trough to a DEPTH and pile every cubic metre of what came out into
  // the ring outside. `depth` is a target, not an increment, and that is the
  // difference between a snowpack and a trap.
  //
  // Removing a little more each step looks equivalent and is not: the ground
  // behind the board has been cut more times than the ground ahead of it, so the
  // surface rises in the direction of travel and the rider spends the entire run
  // climbing the leading face of its own trench. It read as deep snow being a
  // bog — speed to zero in the run-out, the descent stalled at 2,054 m — and no
  // amount of tuning the rate fixes it, because the ramp IS the rate. Cutting to
  // a target converges in one pass: the cell 0.6 m ahead is already at depth when
  // the board arrives, the trench under the board is level, and riding back over
  // your own groove moves nothing because there is nothing left to move.
  //
  // `bx, bz` is the outside of the turn, so a carve throws its berm the way a
  // carve does rather than building a neat doughnut. `availAt(x, z)` says how
  // much loose snow is lying at a point BEFORE this field's own delta; nothing
  // may be taken that is not there.
  //
  // `fx, fz` is the way the board is GOING. Nothing is deposited in front of it:
  // the berm ring is centred on the board, so with no forward term a rider at
  // 20 m/s drives 0.17 m a step straight into snow it piled the step before and
  // bulldozes a bow wave of its own making. That one omission stalled the run at
  // 2,197 m and failed twenty-two checks; displaced snow goes sideways and back.
  //
  // Returns the volume moved, in cubic metres.
  cut(x, z, r, depth, availAt, bx = 0, bz = 0, fx = 0, fz = 0) {
    if (!(depth > 0) || !(r > 0)) return 0;
    const cell = this.cell, area = cell * cell;
    const outer = r * 2.6;
    const reach = outer + 3.4;
    const lo = Math.floor((x - reach) / cell) - 1, hi = Math.ceil((x + reach) / cell) + 1;
    const lz = Math.floor((z - reach) / cell) - 1, hz = Math.ceil((z + reach) / cell) + 1;
    const bl = Math.hypot(bx, bz);
    const ux = bl > 1e-6 ? bx / bl : 0, uz = bl > 1e-6 ? bz / bl : 0;
    const fl = Math.hypot(fx, fz);
    const gx = fl > 1e-6 ? fx / fl : 0, gz = fl > 1e-6 ? fz / fl : 0;

    // A TRENCH IS A CROSS-SECTION SWEPT ALONG A PATH, not a bowl. Given a
    // heading, `q` is the distance out to the side of the track and `pl` the
    // distance along it, and the profile depends on q ALONE — so the floor is
    // level in the direction of travel and there is nothing to climb.
    //
    // Cut as a disc instead and the shape is a bowl centred on the board, which
    // follows the board down the hill: the ground 0.35 m ahead (where the normal
    // samples) stands about 7 degrees above the ground 0.35 m behind, for the
    // whole run. On a 17 degree grade that is a permanent forty per cent tax on
    // the driving force, and it reads as the snow being glue — every chapter
    // between 0.6 and 3.5 m/s. It is not a rate to tune; a bowl simply is a ramp.
    //
    // With no heading (a landing punches rather than sweeps) q is the radius and
    // the shape is the disc it should be.
    const lat = (dx, dz) => fl > 1e-6 ? Math.abs(dx * gz - dz * gx) : Math.hypot(dx, dz);
    const lng = (dx, dz) => fl > 1e-6 ? dx * gx + dz * gz : 0;
    // AND THE TRENCH IS BEHIND YOU. A lane that reaches even half a metre ahead
    // of the board is a board that arrives on ground it has already stripped:
    // `sink` goes to zero and takes the float, the spray, the cushion and the
    // whole surfing score with it, because the powder model and the displacement
    // model are then eating the same snow. Cut strictly behind the contact patch
    // and the board always meets virgin snow — nothing in physics.js changes at
    // all — while the groove, which is a record of where you HAVE been, appears
    // where you can actually see it.
    //
    // DEAD is set past the reach of terrain.normal's own finite difference
    // (EPS 0.35), so the surface the rider is standing on is never one this cut
    // has touched; RAMP keeps the near end of the groove from being a step.
    const DEAD = 0.75, RAMP = 0.6, TAIL = 3.2;
    const along = pl => {
      if (fl <= 1e-6) return 1;
      if (pl > -DEAD || pl < -TAIL) return 0;
      const t = Math.min(1, (-pl - DEAD) / RAMP);
      return t * t * (3 - 2 * t);
    };

    // pass one: cut the lane to its target profile, and remember exactly how
    // much came out. `depth` is a target, not an increment — see the note above
    // the method: removing a little more each step deepens the ground behind the
    // board faster than the ground ahead, which is the ramp by another route.
    let moved = 0;
    for (let az = lz; az <= hz; az++) {
      for (let ax = lo; ax <= hi; ax++) {
        if (!this._in(ax, az)) continue;
        const px = (ax + 0.5) * cell, pz = (az + 0.5) * cell;
        const dx = px - x, dz = pz - z;
        const q = lat(dx, dz);
        if (q >= r) continue;
        const a = along(lng(dx, dz));
        if (a <= 0) continue;
        // a trough has shoulders: cos^2 across, or the normal reads a wall at
        // the rim and the rider is driving in a slot
        const w = Math.cos((q / r) * Math.PI * 0.5) ** 2 * a;
        const i = this._idx(ax, az);
        const avail = Math.max(0, availAt(px, pz) + this.d[i]);
        const got = Math.min(Math.max(0, depth * w + this.d[i]), avail);
        if (got <= 0) continue;
        this.d[i] -= got;
        moved += got * area;
      }
    }
    if (moved <= 0) return 0;

    // The berm sits BESIDE the lane, and never in front of it. With the deposit
    // laid in a ring round the board, a rider at 20 m/s drives 0.17 m a step
    // straight into snow it piled the step before and bulldozes a bow wave of
    // its own making.
    const ring = (dx, dz) => {
      const q = lat(dx, dz);
      if (q < r || q >= outer) return 0;
      const a = along(lng(dx, dz));
      if (a <= 0) return 0;                                 // and never ahead of the board
      let w = Math.sin((1 - (q - r) / (outer - r)) * Math.PI * 0.5) ** 2 * a;
      const dd = Math.hypot(dx, dz);
      if (bl > 1e-6 && dd > 1e-6) w *= 0.15 + 0.85 * Math.max(0, (dx * ux + dz * uz) / dd);
      return w;
    };

    // pass two: put ALL of it back. Two sweeps, because the weights have to be
    // totalled before any of them can be scaled to the volume — the alternative
    // is guessing a per-cell amount and losing the difference. One weight
    // function called twice, or the volume that lands is not the volume totalled.
    let wsum = 0;
    for (let az = lz; az <= hz; az++) {
      for (let ax = lo; ax <= hi; ax++) {
        if (!this._in(ax, az)) continue;
        wsum += ring((ax + 0.5) * cell - x, (az + 0.5) * cell - z);
      }
    }
    if (wsum <= 0) { this.moved += moved; return moved; }   // the berm fell outside the window
    const per = moved / (wsum * area);
    for (let az = lz; az <= hz; az++) {
      for (let ax = lo; ax <= hi; ax++) {
        if (!this._in(ax, az)) continue;
        const w = ring((ax + 0.5) * cell - x, (az + 0.5) * cell - z);
        if (w > 0) this.d[this._idx(ax, az)] += per * w;
      }
    }
    this.moved += moved;
    return moved;
  }

  // the total of the field, in cubic metres — zero for a conserving carve
  volume() {
    let s = 0;
    for (let i = 0; i < this.d.length; i++) s += this.d[i];
    return s * this.cell * this.cell;
  }
  // deepest cut and highest pile, in metres
  range() {
    let lo = 0, hi = 0;
    for (let i = 0; i < this.d.length; i++) { const v = this.d[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    return [lo, hi];
  }
}

export const pack = new Snowpack();
export default pack;
