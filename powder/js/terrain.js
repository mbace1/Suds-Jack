// Terrain — a mellow mountain of white sand, and the canyon cut through it.
//
// The world is OPEN. `height(x, z)` is a pure function of world position and
// everything reads it — tiles, the runners under the sled, props, dust — so
// nothing can disagree. Second pass on the owner's direction:
//
//   THE MOUNTAIN  the whole field descends gently along the route (-z), so
//                 gravity has a downhill component and you carve to hold
//                 speed instead of just holding the throttle.
//   THE SAND      deep and white and it SINKS. Per-surface `sink` (how far a
//                 loaded runner settles) and `shear` (how late the lateral
//                 bite arrives — the sand shifting under you) live on SURF;
//                 the vehicle does the settling.
//   THE CANYON    wider now, 70-130 m, salt floor, walls still unclimbable.
//   THE BREACHES  the shallow sections that make it enterable. Measured, not
//                 guessed: about 40% of each cycle is drivable.
//   THE CROSSINGS roads across the flats at right angles to the route, each
//                 carried over the rift on a bridge deck. The deck is NOT in
//                 the height field — a heightfield cannot hold a bridge — so
//                 groundUnder(x, z, y) is the two-layer query the runners use:
//                 it returns the deck when you are on it and the floor when
//                 you are under it.
import * as THREE from 'three';
import { PAL } from './palette.js?v=5';
import { populate, makePropKit } from './props.js?v=5';

export const TILE = 100;
const Q = 16;                    // 6.25 m resolution
const RING = 5;                  // 11x11 tiles, 550 m each way
export const VIEW = TILE * (RING + 0.5);

export const SALT = 0, DUNE = 1, GRAVEL = 2, ROCK = 3, ROAD = 4;
export const SURF = [
  //  mu    grip;  drag  body drag x;  sink  m a loaded runner settles;  shear  s the bite lags
  { name: 'SALT PAN',   mu: 1.25, drag: 0.92, sink: 0.05, shear: 0.02 },
  { name: 'DEEP SAND',  mu: 0.95, drag: 1.45, sink: 0.55, shear: 0.22 },
  { name: 'GRAVEL',     mu: 0.55, drag: 1.55, sink: 0.12, shear: 0.06 },
  { name: 'ROCK',       mu: 1.00, drag: 2.10, sink: 0.00, shear: 0.01 },
  { name: 'CROSSING',   mu: 1.35, drag: 0.85, sink: 0.00, shear: 0.01 },
];

export const GRADE = 0.045;      // the mountain: 4.5% down the route
export const ROAD_CYCLE = 940, ROAD_PHASE = -150, ROAD_W = 15;
const BREACH_CYCLE = 940, BREACH_PHASE = 470;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export class Terrain {
  constructor(scene, seed = 11) {
    this.scene = scene;
    this.seed = seed;
    this.tiles = new Map();
    this.pool = [];
    this.kit = makePropKit();
    this.mat = new THREE.MeshLambertMaterial({ vertexColors: true });
    this.index = buildIndex();
    for (let i = 0; i < (RING * 2 + 1) * (RING * 2 + 1) + 6; i++) this.pool.push(new Tile(this));
  }

  // -------------------------------------------------------------- the canyon
  canyonX(z) {
    return 52 * Math.sin(z * 0.00135) + 26 * Math.sin(z * 0.0039 + 1.7);
  }

  canyonDepthFactor(z) {
    const u = ((z % BREACH_CYCLE) + BREACH_CYCLE) % BREACH_CYCLE / BREACH_CYCLE;
    const gap = Math.abs(u - 0.5) * 2;
    // measured: a narrower window left every diagonal approach in deep wall
    return 0.12 + 0.88 * smoothstep(0.30, 0.62, gap);
  }

  nextBreach(z) {
    return BREACH_PHASE - BREACH_CYCLE * Math.ceil((BREACH_PHASE - z) / BREACH_CYCLE);
  }

  canyon(x, z, out) {
    const cx = this.canyonX(z);
    const df = this.canyonDepthFactor(z);
    // wider than the first build by ~1.8x: a canyon you can actually race in
    // side by side, with room to pick a line under the bridges
    const W = (72 + 26 * Math.sin(z * 0.0021 + 0.6)) * (1 + (1 - df) * 0.7);
    const D = (40 + 14 * Math.sin(z * 0.0012 + 2.2)) * df;
    out.d = Math.abs(x - cx) / W;
    out.W = W; out.D = D; out.cx = cx; out.df = df;
    return out;
  }

  // --------------------------------------------------------------- the plain
  mesa(x, z) {
    const f = Math.sin(x * 0.0032 + 1.1) * Math.cos(z * 0.0027 - 0.4)
            + 0.7 * Math.sin(x * 0.0061 - z * 0.0048 + 2.3);
    return smoothstep(0.62, 0.96, f) * 30;
  }

  /** The plain without the canyon cut — also the height a bridge deck sits at. */
  plain(x, z) {
    return z * GRADE                                          // the mountain
      + 2.4 * Math.sin(x * 0.0075 + 0.4) * Math.cos(z * 0.0061)
      + 1.5 * Math.sin(x * 0.021 - z * 0.017)
      + 0.45 * Math.sin(x * 0.062) * Math.sin(z * 0.058);
  }

  /** THE height function. Everything reads this. */
  height(x, z) {
    let h = this.plain(x, z);
    const c = this.canyon(x, z, _c);
    if (c.d < 1.18) {
      h += 3.2 * Math.max(0, 1 - Math.abs(c.d - 1.06) / 0.12) * c.df;   // rim lip
    }
    if (c.d < 1) {
      const u = c.d < 0.5 ? 0 : (c.d - 0.5) / 0.5;
      h -= c.D * (1 - u) * (1 - u);
    } else {
      h += this.mesa(x, z);
    }
    return h;
  }

  // ------------------------------------------------------------ the crossings
  /** Z of the road crossing nearest to z, and how far off its centreline. */
  roadAt(z, out) {
    const k = Math.round((z - ROAD_PHASE) / ROAD_CYCLE);
    out.z = ROAD_PHASE + k * ROAD_CYCLE;
    out.off = Math.abs(z - out.z);
    out.on = out.off < ROAD_W * 0.5;
    return out;
  }

  /** Bridge deck top under (x, z), or null. Decks span the rift at each crossing. */
  deckAt(x, z) {
    const r = this.roadAt(z, _r);
    if (r.off > ROAD_W * 0.5 + 1) return null;
    const c = this.canyon(x, r.z, _c);
    if (c.d > 1.12 || c.df < 0.4) return null;         // no deck where there is no rift
    // the deck runs level between the two rims, at the plain's height there
    const cx = c.cx, span = c.W * 1.12;
    const hl = this.plain(cx - span, r.z), hr = this.plain(cx + span, r.z);
    return hl + (hr - hl) * ((x - (cx - span)) / (2 * span)) + 1.2;
  }

  /**
   * The two-layer ground query the runners use. If a deck is under this point
   * and the body is at or above it, the deck is the ground; otherwise the
   * floor is. That is what lets one road both carry you over the rift and
   * roof you when you run it.
   */
  groundUnder(x, z, y, out) {
    const deck = this.deckAt(x, z);
    if (deck !== null && y >= deck - 2.0) {
      out.h = deck; out.surf = ROAD; out.deck = true; return out;
    }
    out.h = this.height(x, z); out.surf = this.surfaceAt(x, z); out.deck = false;
    return out;
  }

  surfaceAt(x, z) {
    const c = this.canyon(x, z, _c);
    if (c.d < 0.52 && c.df > 0.4) return SALT;
    if (c.d < 1.0 && c.df > 0.4) return ROCK;
    if (this.roadAt(z, _r).on) return ROAD;
    if (this.mesa(x, z) > 3) return ROCK;
    const g = Math.sin(x * 0.0045 - 2.1) * Math.cos(z * 0.0038 + 0.9);
    if (g > 0.58) return GRAVEL;
    return DUNE;
  }

  normalAt(x, z, out) {
    const e = 2.0;
    const hl = this.height(x - e, z), hr = this.height(x + e, z);
    const hd = this.height(x, z - e), hu = this.height(x, z + e);
    return out.set(hl - hr, 2 * e, hd - hu).normalize();
  }

  // ------------------------------------------------------------- streaming
  update(x, z) {
    const ci = Math.round(x / TILE), cj = Math.round(z / TILE);
    for (const [key, t] of this.tiles) {
      if (Math.abs(t.i - ci) > RING || Math.abs(t.j - cj) > RING) {
        t.release(); this.tiles.delete(key); this.pool.push(t);
      }
    }
    for (let i = ci - RING; i <= ci + RING; i++) {
      for (let j = cj - RING; j <= cj + RING; j++) {
        const key = i + ',' + j;
        if (this.tiles.has(key)) continue;
        const t = this.pool.pop();
        if (!t) return;
        t.build(i, j);
        this.tiles.set(key, t);
      }
    }
  }

  rocksNear(x, z, out) {
    out.length = 0;
    const ci = Math.round(x / TILE), cj = Math.round(z / TILE);
    for (let i = ci - 1; i <= ci + 1; i++) for (let j = cj - 1; j <= cj + 1; j++) {
      const t = this.tiles.get(i + ',' + j);
      const list = t && t.props.userData.rocks;
      if (list) for (let n = 0; n < list.length; n++) out.push(list[n]);
    }
    return out;
  }

  floaters(out) {
    out.length = 0;
    for (const t of this.tiles.values()) {
      const list = t.props.userData.floaters;
      if (list) for (let n = 0; n < list.length; n++) out.push(list[n]);
    }
    return out;
  }

  rng(i, j) { return mulberry32((this.seed * 7919 + i * 92837111 + j * 689287499) >>> 0); }
}

const _c = {}, _r = {};

function buildIndex() {
  const idx = [];
  for (let r = 0; r < Q; r++) for (let c = 0; c < Q; c++) {
    const a = r * (Q + 1) + c, b = a + 1, d = a + Q + 1, e = d + 1;
    idx.push(a, d, b, b, d, e);
  }
  return new THREE.Uint16BufferAttribute(idx, 1);
}

const _col = new THREE.Color(), _shade = new THREE.Color(PAL.shade);
const C = {
  salt: new THREE.Color(PAL.salt), saltDark: new THREE.Color(PAL.saltDark),
  dune: new THREE.Color(PAL.dune), duneDark: new THREE.Color(PAL.duneDark),
  gravel: new THREE.Color(PAL.gravel), road: new THREE.Color(PAL.road),
  roadEdge: new THREE.Color(PAL.roadEdge),
  rock: new THREE.Color(PAL.rock), rockDark: new THREE.Color(PAL.rockDark),
  rockLit: new THREE.Color(PAL.rockLit),
};

class Tile {
  constructor(terrain) {
    this.t = terrain;
    const n = (Q + 1) * (Q + 1);
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo.setIndex(terrain.index);
    this.mesh = new THREE.Mesh(this.geo, terrain.mat);
    this.mesh.receiveShadow = true;
    this.props = new THREE.Group();
    this.i = this.j = null;
  }

  build(i, j) {
    this.i = i; this.j = j;
    const t = this.t;
    const x0 = i * TILE - TILE / 2, z0 = j * TILE - TILE / 2;
    let v = 0;
    for (let r = 0; r <= Q; r++) {
      const z = z0 + r * (TILE / Q);
      for (let c = 0; c <= Q; c++) {
        const x = x0 + c * (TILE / Q);
        const y = t.height(x, z);
        this.pos[v] = x; this.pos[v + 1] = y; this.pos[v + 2] = z;

        const s = t.surfaceAt(x, z);
        if (s === SALT) {
          _col.copy(C.salt).lerp(C.saltDark, 0.5 + 0.5 * Math.sin(x * 0.11 + z * 0.07));
        } else if (s === ROCK) {
          const band = 0.5 + 0.5 * Math.sin(y * 0.52 + Math.sin(x * 0.02) * 1.4);
          _col.copy(C.rockDark).lerp(C.rockLit, band * 0.85).lerp(C.rock, 0.3);
        } else if (s === ROAD) {
          const r2 = t.roadAt(z, _r);
          _col.copy(C.road).lerp(C.roadEdge, smoothstep(ROAD_W * 0.32, ROAD_W * 0.5, r2.off));
        } else if (s === GRAVEL) {
          _col.copy(C.gravel);
        } else {
          // white sand with a grey grain: the ripples are what the low sun
          // has to rake, and the grey is the sky in the shadow side
          _col.copy(C.dune).lerp(C.duneDark, 0.5 + 0.5 * Math.sin(x * 0.021 - z * 0.017));
        }
        const c2 = t.canyon(x, z, _c);
        if (c2.d < 1.05) _col.lerp(_shade, (1 - Math.min(1, c2.d)) * c2.df * 0.42);
        this.col[v] = _col.r; this.col[v + 1] = _col.g; this.col[v + 2] = _col.b;
        v += 3;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
    t.scene.add(this.mesh);

    this.props.clear();
    this.props.userData = {};
    populate(t, this.props, i, j, TILE);
    t.scene.add(this.props);
  }

  release() {
    this.t.scene.remove(this.mesh);
    this.t.scene.remove(this.props);
    this.props.clear();
    this.props.userData = {};
    this.i = this.j = null;
  }
}
