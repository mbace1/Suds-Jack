// Track — the endless descent. The course is a curve integrated from layered
// sine noise: heading, pitch and the width of the packed run all wander, and
// banking is derived from curvature so turns are dished the right way.
//
// Everything in the game addresses the mountain in TRACK SPACE — `s` metres
// down the fall line, `n` metres left/right of the centreline — and this
// module is the only thing that converts that to world space. One function,
// `surface(s, n)`, defines the ground: the terrain mesh, the craft physics,
// the props and the plume particles all read it, so they cannot disagree.
//
// Three surfaces make the risk/reward triangle:
//   PACKED  the line everyone runs — balanced
//   DEEP    off the line: slow, but it bites, and it charges the afterburner
//   CRUST   wind-scoured sheets: fastest, almost no grip
import * as THREE from 'three';
import { PAL } from './palette.js?v=2';

export const STEP = 6;                 // metres between course nodes
const ROWS = 10;                       // rows of quads per terrain chunk
export const CHUNK_LEN = ROWS * STEP;  // 60 m — also the feature "block" size
const COLS = 24;                       // chunky PS1-grade quads across the valley
export const HALF_W = 78;              // terrain half-width
const COL_W = (HALF_W * 2) / COLS;
export const EDGE = 58;                // valley walls start here — wide enough that a
                                       // full-lock carve has somewhere to go
const AHEAD = 10;                      // chunks kept in front of the player
const BEHIND = 1;

// index into SURF, returned by probe()
export const PACKED = 0, POWDER = 1, ICE = 2, ROCK = 3;
export const SURF = [
  { name: 'PACKED', speed: 1.00, grip: 1.00 },
  { name: 'DEEP',   speed: 0.84, grip: 1.20 },
  { name: 'CRUST',  speed: 1.20, grip: 0.46 },
  { name: 'ROCK',   speed: 0.40, grip: 0.80 },
];

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const _sc = {}, _sc2 = {};

export class Track {
  constructor(scene, seed = 7) {
    this.scene = scene;
    this.seed = seed;
    this.nodes = [];
    this.blocks = new Map();
    this._extend(30);
    this._makeProps();

    // --- terrain chunk pool ------------------------------------------------
    this.byK = new Map();
    this.pool = [];
    this.index = buildIndex();
    this.terrainMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    for (let i = 0; i < AHEAD + BEHIND + 3; i++) this.pool.push(new Chunk(this));
  }

  // ---------------------------------------------------------------- course
  _extend(to) {
    while (this.nodes.length <= to) {
      const i = this.nodes.length;
      const s = i * STEP;
      // Long sweepers with a shorter wiggle riding on top.
      const curv = 0.0050 * Math.sin(s * 0.0031 + 1.7)
                 + 0.0024 * Math.sin(s * 0.0089 + 4.2)
                 + 0.0011 * Math.sin(s * 0.0210 + 0.6);
      // Always descending; the pitch rolls between a cruise and a proper chute.
      const pitch = 0.215 + 0.075 * Math.sin(s * 0.0017 + 2.4)
                          + 0.035 * Math.sin(s * 0.0062 + 5.1);
      // Half-width of the packed line. Deliberately a RIBBON, not a road: a
      // wide run put the deep snow 35 m away, so the dive-to-charge loop spent
      // all its time in transit and lost to just cruising the line. Narrow, and
      // the deep stuff is a lean away — which is also the fantasy.
      const w = 15 + 5 * Math.sin(s * 0.0043 + 3.3);
      const tilt = -curv * 44;   // dh/dn — banks the turn into its inside edge
      let x, y, z, head;
      if (i === 0) { x = 0; y = 0; z = 0; head = 0; }
      else {
        const p = this.nodes[i - 1];
        head = p.head + p.curv * STEP;
        x = p.x + Math.sin(head) * STEP;
        z = p.z - Math.cos(head) * STEP;
        y = p.y - Math.tan(p.pitch) * STEP;
      }
      this.nodes.push({ s, x, y, z, head, curv, pitch, tilt, w });
    }
  }

  /** Interpolated course node at distance `s`. Writes into `out`. */
  sample(s, out = {}) {
    const f = s / STEP;
    let i = Math.floor(f);
    if (i < 0) i = 0;
    this._extend(i + 2);
    const t = f - i;
    const a = this.nodes[i], b = this.nodes[i + 1];
    out.x = a.x + (b.x - a.x) * t;
    out.y = a.y + (b.y - a.y) * t;
    out.z = a.z + (b.z - a.z) * t;
    out.head = a.head + (b.head - a.head) * t;
    out.curv = a.curv + (b.curv - a.curv) * t;
    out.pitch = a.pitch + (b.pitch - a.pitch) * t;
    out.tilt = a.tilt + (b.tilt - a.tilt) * t;
    out.w = a.w + (b.w - a.w) * t;
    return out;
  }

  /** Snow height at (s, n). The single source of truth for the mountain. */
  surface(s, n, nd) {
    if (!nd) nd = this.sample(s, _sc);
    let y = nd.y + n * nd.tilt;
    // Rollers, a cross-slope swell, then a fine chop. The wavelengths matter
    // more than the amplitudes: at 600 m the snowfield reads as a dead plane,
    // at ~110 m the low sun rakes it and you can see the shape of the hill.
    y += 4.2 * Math.sin(s * 0.048 + n * 0.018)
       + 2.2 * Math.sin(s * 0.021 + 2.1) * Math.cos(n * 0.045 + 0.4)
       + 0.55 * Math.sin(s * 0.047 + 1.3) * Math.cos(n * 0.052);
    const a = Math.abs(n);
    if (a > EDGE) { const d = a - EDGE; y += 0.055 * d * d; }
    y += this.featureH(s, n);
    return y;
  }

  /** World position of a track-space point. */
  worldPos(s, n, out) {
    const nd = this.sample(s, _sc2);
    out.set(nd.x + Math.cos(nd.head) * n, this.surface(s, n, nd), nd.z + Math.sin(nd.head) * n);
    return out;
  }

  /** Which snow you are on, plus how deep the powder is (0..1). */
  probe(s, n, out = {}) {
    const nd = this.sample(s, _sc2);
    const a = Math.abs(n);
    out.w = nd.w;
    if (a > EDGE - 3) { out.type = ROCK; out.depth = 0; return out; }
    const b = Math.floor(s / CHUNK_LEN);
    for (let k = b - 2; k <= b; k++) {
      for (const p of this.block(k).ice) {
        if (s >= p.s && s <= p.s + p.len && Math.abs(n - p.n) < p.w) {
          out.type = ICE; out.depth = 0; return out;
        }
      }
    }
    if (a < nd.w) { out.type = PACKED; out.depth = 0; return out; }
    out.type = POWDER;
    out.depth = Math.min(1, (a - nd.w) / 13);
    return out;
  }

  // ------------------------------------------------------------- features
  /** Lazily generated per 60 m block: jumps, ice, rocks, markers, gates. */
  block(k) {
    let b = this.blocks.get(k);
    if (b) return b;
    const rnd = mulberry32((this.seed * 7919 + k * 104729) >>> 0);
    const s0 = k * CHUNK_LEN;
    b = { k, s0, jumps: [], ice: [], rocks: [], scrub: [], poles: [], gate: null };
    this.blocks.set(k, b);   // set before sampling so re-entry can't recurse

    const nd = this.sample(s0 + CHUNK_LEN * 0.5, {});
    const w = nd.w;

    if (k >= 2) {
      // wind lips and cornices to launch off
      if (rnd() < 0.34) {
        b.jumps.push({
          s: s0 + rnd() * 34, n: (rnd() * 2 - 1) * w * 0.75,
          len: 13 + rnd() * 8, w: 9 + rnd() * 7, h: 2.3 + rnd() * 2.1,
        });
      }
      // scoured ice sheets — they run over several blocks
      if (rnd() < 0.30) {
        b.ice.push({
          s: s0 + rnd() * 30, len: 45 + rnd() * 70,
          n: (rnd() * 2 - 1) * w * 0.55, w: 9 + rnd() * 11,
        });
      }
      // buried boulders: mostly off the run, occasionally right in the line
      const nRock = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < nRock; i++) {
        const side = rnd() < 0.5 ? -1 : 1;
        b.rocks.push({
          s: s0 + rnd() * CHUNK_LEN,
          n: side * (w * 0.75 + rnd() * (EDGE - w * 0.75 - 2)),
          r: 1.0 + rnd() * 1.5, seed: rnd(),
        });
      }
      if (rnd() < 0.28) {
        b.rocks.push({ s: s0 + rnd() * CHUNK_LEN, n: (rnd() * 2 - 1) * w * 0.6,
                       r: 1.0 + rnd() * 0.9, seed: rnd() });
      }
      // scrub tufts and half-buried stones, thickening away from the line —
      // the plates are full of this litter and the ground dies without it
      for (let i = 0; i < 11; i++) {
        b.scrub.push({ s: s0 + rnd() * CHUNK_LEN,
                       n: (rnd() < 0.5 ? -1 : 1) * (w * 0.55 + rnd() * (EDGE - w * 0.55)),
                       r: 0.35 + rnd() * 0.75, seed: rnd() });
      }
    }
    // course markers down both edges of the packed run
    for (let i = 0; i < 3; i++) {
      const s = s0 + i * 20 + 4;
      b.poles.push({ s, n: this.sample(s, {}).w + 2.5, flag: (k + i) % 2 });
      b.poles.push({ s, n: -(this.sample(s, {}).w + 2.5), flag: (k + i) % 2 });
    }
    if (k > 0 && k % 14 === 0) b.gate = { s: s0 + 20, w: this.sample(s0 + 20, {}).w };
    return b;
  }

  /** Height contributed by jump ramps at (s, n). */
  featureH(s, n) {
    let h = 0;
    const b = Math.floor(s / CHUNK_LEN);
    for (let k = b - 1; k <= b + 1; k++) {
      const jumps = this.block(k).jumps;
      for (let i = 0; i < jumps.length; i++) {
        const j = jumps[i];
        const du = (s - j.s) / j.len;
        if (du <= 0 || du > 1.3) continue;
        const dv = (n - j.n) / j.w;
        if (dv < -1 || dv > 1) continue;
        const lat = 0.5 + 0.5 * Math.cos(Math.PI * dv);
        // smooth rise to the lip, then a short steep back face to drop off
        const pr = du <= 1 ? Math.pow(du, 1.7) : Math.max(0, 1 - (du - 1) / 0.3);
        h += j.h * pr * lat;
      }
    }
    return h;
  }

  /** Nearest checkpoint gate at or beyond `s`, or null. */
  gateAfter(s) {
    const b = Math.floor(s / CHUNK_LEN);
    for (let k = b; k <= b + 30; k++) {
      const g = this.block(k).gate;
      if (g && g.s >= s - 4) return g;
    }
    return null;
  }

  /** Rocks near `s` that a craft could hit. */
  rocksNear(s, out) {
    out.length = 0;
    const b = Math.floor(s / CHUNK_LEN);
    for (let k = b - 1; k <= b + 1; k++) {
      const r = this.block(k).rocks;
      for (let i = 0; i < r.length; i++) out.push(r[i]);
    }
    return out;
  }

  // ---------------------------------------------------------------- props
  _makeProps() {
    const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o });
    this.geo = {
      rock: new THREE.IcosahedronGeometry(1, 0),
      scrub: new THREE.ConeGeometry(0.6, 1.1, 4),
      pole: new THREE.CylinderGeometry(0.09, 0.09, 3.4, 4),
      flag: new THREE.PlaneGeometry(0.9, 0.55),
      leg: new THREE.BoxGeometry(0.7, 7.5, 0.7),
      beam: new THREE.BoxGeometry(1, 1.3, 1.1),
    };
    this.mat = {
      rock: lam(PAL.rock), rockLit: lam(PAL.rockLit), scrub: lam(PAL.scrub),
      pole: lam(PAL.poleA),
      flagA: new THREE.MeshLambertMaterial({ color: PAL.flagA, side: THREE.DoubleSide, flatShading: true }),
      flagB: new THREE.MeshLambertMaterial({ color: PAL.flagB, side: THREE.DoubleSide, flatShading: true }),
      gate: lam(PAL.gateBody), gateTrim: lam(PAL.gateTrim),
    };
  }

  // --------------------------------------------------------------- stream
  update(s) {
    const cur = Math.floor(s / CHUNK_LEN);
    const from = cur - BEHIND, to = cur + AHEAD;
    for (const [k, c] of this.byK) {
      if (k < from || k > to) { c.release(); this.byK.delete(k); this.pool.push(c); }
    }
    for (let k = from; k <= to; k++) {
      if (this.byK.has(k)) continue;
      const c = this.pool.pop();
      if (!c) break;
      c.build(k);
      this.byK.set(k, c);
    }
  }
}

// Index buffer is identical for every chunk — build it once.
function buildIndex() {
  const idx = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const a = r * (COLS + 1) + c, b = a + 1, d = a + COLS + 1, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  return idx;
}

const _c1 = new THREE.Color(), _c2 = new THREE.Color();
const COL = {
  deepLit: new THREE.Color(PAL.deepLit), deepMid: new THREE.Color(PAL.deepMid),
  deepShd: new THREE.Color(PAL.deepShd), crust: new THREE.Color(PAL.crust),
  crustLit: new THREE.Color(PAL.crustLit), rock: new THREE.Color(PAL.rock),
  rockLit: new THREE.Color(PAL.rockLit),
};

/** One 60 m slab of mountain: a terrain mesh plus the props standing on it. */
class Chunk {
  constructor(track) {
    this.track = track;
    const n = (ROWS + 1) * (COLS + 1);
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo.setIndex(track.index);
    this.mesh = new THREE.Mesh(this.geo, track.terrainMat);
    this.mesh.frustumCulled = false;
    this.props = new THREE.Group();
    this.k = null;
  }

  build(k) {
    this.k = k;
    const tr = this.track, s0 = k * CHUNK_LEN;
    const nd = {}, pr = {};
    let v = 0;
    for (let r = 0; r <= ROWS; r++) {
      const s = s0 + r * STEP;
      tr.sample(s, nd);
      const ch = Math.cos(nd.head), sh = Math.sin(nd.head);
      for (let c = 0; c <= COLS; c++) {
        const n = -HALF_W + c * COL_W;
        const y = tr.surface(s, n, nd);
        this.pos[v] = nd.x + ch * n;
        this.pos[v + 1] = y;
        this.pos[v + 2] = nd.z + sh * n;

        tr.probe(s, n, pr);
        const a = Math.abs(n);
        if (pr.type === ROCK || a > EDGE) {
          // The valley sides are buried too — only the last few metres show
          // rock at all. Darken them any earlier and the two walls converge at
          // the horizon into one grey band straight across the frame.
          const t = Math.min(1, Math.max(0, (a - EDGE - 14) / 8));
          _c1.copy(COL.deepLit).lerp(COL.rockLit, t * 0.55);
        } else if (pr.type === ICE) {
          _c1.copy(COL.crust).lerp(COL.crustLit, (c & 1) ? 0.5 : 0);
        } else if (pr.type === PACKED) {
          // corduroy: alternate columns a shade apart, straight down the line
          _c1.copy(COL.deepMid).lerp(COL.deepLit, (c & 1) ? 0.30 : 0.10);
        } else {
          _c1.copy(COL.deepLit).lerp(COL.deepShd, pr.depth * 0.30);
        }
        // Deepen the folds the sun has turned away from. Flat shading alone
        // barely separates a dune field this pale; this is what gives the
        // ground somewhere to go tonally.
        const fold = Math.sin(s * 0.047 + 1.3) * Math.cos(n * 0.052);
        _c2.copy(COL.deepShd);
        _c1.lerp(_c2, Math.max(0, -fold) * 0.34);
        this.col[v] = _c1.r; this.col[v + 1] = _c1.g; this.col[v + 2] = _c1.b;
        v += 3;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
    tr.scene.add(this.mesh);

    this._props(k);
    tr.scene.add(this.props);
  }

  _props(k) {
    const tr = this.track, b = tr.block(k), g = tr.geo, m = tr.mat;
    const p = new THREE.Vector3();
    this.props.clear();

    for (const r of b.rocks) {
      const mesh = new THREE.Mesh(g.rock, r.seed > 0.5 ? m.rock : m.rockLit);
      tr.worldPos(r.s, r.n, p);
      mesh.position.copy(p);
      mesh.position.y -= r.r * 0.35;                 // half-buried in the drift
      mesh.scale.set(r.r, r.r * (0.55 + r.seed * 0.5), r.r * (0.8 + r.seed * 0.4));
      mesh.rotation.set(r.seed * 3, r.seed * 6, r.seed * 2);
      this.props.add(mesh);
    }
    for (const sc of b.scrub) {
      const mesh = new THREE.Mesh(g.scrub, m.scrub);
      tr.worldPos(sc.s, sc.n, p);
      mesh.position.copy(p);
      mesh.scale.setScalar(sc.r);
      mesh.rotation.y = sc.seed * 6;
      this.props.add(mesh);
    }
    for (const po of b.poles) {
      const pole = new THREE.Mesh(g.pole, m.pole);
      tr.worldPos(po.s, po.n, p);
      pole.position.copy(p);
      pole.position.y += 1.5;
      pole.rotation.z = (po.n > 0 ? -1 : 1) * 0.12;  // leaning, wind-battered
      this.props.add(pole);
      const flag = new THREE.Mesh(g.flag, po.flag ? m.flagA : m.flagB);
      flag.position.set(p.x + (po.n > 0 ? -0.45 : 0.45), p.y + 2.9, p.z);
      this.props.add(flag);
    }
    if (b.gate) {
      const gate = new THREE.Group();
      tr.worldPos(b.gate.s, 0, p);
      const nd = tr.sample(b.gate.s, {});
      const wide = b.gate.w * 0.8 + 4;
      for (const side of [-1, 1]) {
        // local space — the group's own rotation carries the course heading
        const leg = new THREE.Mesh(g.leg, m.gate);
        leg.position.set(wide * side, 3.4, 0);
        leg.scale.set(1.6, 1, 1.6);
        gate.add(leg);
      }
      const beam = new THREE.Mesh(g.beam, m.gate);
      beam.scale.set(wide * 2, 2.2, 1.4);
      beam.position.y = 7.6;
      gate.add(beam);
      const trim = new THREE.Mesh(g.beam, m.gateTrim);
      trim.scale.set(wide * 2, 0.7, 1.5);
      trim.position.y = 6.3;
      gate.add(trim);
      gate.position.copy(p);
      gate.rotation.y = -nd.head;
      this.props.add(gate);
    }
  }

  release() {
    this.track.scene.remove(this.mesh);
    this.track.scene.remove(this.props);
    this.props.clear();
    this.k = null;
  }
}
