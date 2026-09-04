// Terrain — flatlands, and the canyon cut through them.
//
// The world is OPEN. There is no ribbon and no fall line: `height(x, z)` is a
// pure function of world position, and everything else in the game reads it —
// the tile meshes, the four hover pads under the craft, the props, the dust.
// One function, so they cannot disagree.
//
// The shape of the place, in order of how much it matters:
//
//   THE FLATS   a near-level dune field. Choppy enough that the suspension has
//               something to do, open enough that you pick your own line.
//   THE CANYON  a meandering rift 30-50 m deep with a salt floor — the fast
//               surface in the game, and the tight one. It is the reason to
//               take a risk.
//   THE BREACH  where the canyon shallows out into a wide bowl. Its walls are
//               otherwise ~60 degrees and unclimbable, so without these the
//               canyon would be a trap you could enter and never leave. They
//               are the on-ramps, and they set the rhythm of a run.
//   THE MESAS   raised plateaus on the flats with steep sides. Obstacles to
//               read and route around, and the silhouette the sun rakes.
import * as THREE from 'three';
import { PAL } from './palette.js?v=3';
import { populate, makePropKit } from './props.js?v=3';

export const TILE = 100;         // metres per terrain tile
const Q = 16;                    // quads per tile edge — 6.25 m resolution
const RING = 5;                  // tiles kept each way: 11x11, 550 m of world each way
export const VIEW = TILE * (RING + 0.5);

export const SALT = 0, DUNE = 1, GRAVEL = 2, ROCK = 3;
export const SURF = [
  // mu    grip available to the skirts;  drag  multiplier on body drag
  { name: 'SALT PAN',   mu: 1.25, drag: 0.92 },
  { name: 'DUNE FIELD', mu: 0.86, drag: 1.30 },
  { name: 'GRAVEL',     mu: 0.52, drag: 1.55 },
  { name: 'ROCK',       mu: 1.00, drag: 2.10 },
];

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
    this._n = new THREE.Vector3();
  }

  // -------------------------------------------------------------- the canyon
  /** Centreline of the rift at depth `z`. */
  canyonX(z) {
    return 52 * Math.sin(z * 0.00135) + 26 * Math.sin(z * 0.0039 + 1.7);
  }

  /**
   * How shallow the canyon is here: 1 through the deep sections, dropping to
   * ~0.12 at a breach. Breaches are what make the canyon enterable at all.
   */
  canyonDepthFactor(z) {
    const cycle = 940;
    const u = ((z % cycle) + cycle) % cycle / cycle;      // 0..1 along the cycle
    const gap = Math.abs(u - 0.5) * 2;                    // 0 at the breach
    // Measured, not guessed: with a narrow window only ~90 m either side of
    // the breach centre was shallow, so anything approaching the rim on a
    // diagonal — which is every approach — met deep wall and stopped dead.
    // This leaves roughly 40% of each cycle drivable, which is what makes the
    // canyon a route rather than a trench you watch go past.
    return 0.12 + 0.88 * smoothstep(0.30, 0.62, gap);
  }

  /**
   * Z of the next breach ahead (the route runs toward -z). The breaches are
   * the only way in or out of a deep section, so this is the single most
   * useful thing the navigation display can tell you.
   */
  nextBreach(z) {
    const cycle = 940, phase = 470;
    return phase - cycle * Math.ceil((phase - z) / cycle);
  }

  /** Geometry of the rift at (x, z): normalised distance, width, depth. */
  canyon(x, z, out) {
    const cx = this.canyonX(z);
    const df = this.canyonDepthFactor(z);
    const W = (40 + 15 * Math.sin(z * 0.0021 + 0.6)) * (1 + (1 - df) * 0.85);
    const D = (38 + 13 * Math.sin(z * 0.0012 + 2.2)) * df;
    out.d = Math.abs(x - cx) / W;
    out.W = W; out.D = D; out.cx = cx; out.df = df;
    return out;
  }

  // --------------------------------------------------------------- the plain
  mesa(x, z) {
    // A couple of broad sine fields crossed and then thresholded: below the
    // window it is flat plain, inside it the ground steps up to a plateau.
    const f = Math.sin(x * 0.0032 + 1.1) * Math.cos(z * 0.0027 - 0.4)
            + 0.7 * Math.sin(x * 0.0061 - z * 0.0048 + 2.3);
    return smoothstep(0.62, 0.96, f) * 30;
  }

  /** THE height function. Everything reads this. */
  height(x, z) {
    let h = 2.4 * Math.sin(x * 0.0075 + 0.4) * Math.cos(z * 0.0061)
          + 1.5 * Math.sin(x * 0.021 - z * 0.017)
          + 0.45 * Math.sin(x * 0.062) * Math.sin(z * 0.058);

    const c = this.canyon(x, z, _c);
    if (c.d < 1.18) {
      // rim lip just outside the edge, so the canyon has a hard silhouette
      h += 3.2 * Math.max(0, 1 - Math.abs(c.d - 1.06) / 0.12) * c.df;
    }
    if (c.d < 1) {
      // flat floor out to half width, then a steep wall up to the rim
      const u = c.d < 0.5 ? 0 : (c.d - 0.5) / 0.5;
      h -= c.D * (1 - u) * (1 - u);
    } else {
      h += this.mesa(x, z);   // mesas only stand on the plain, never in the rift
    }
    return h;
  }

  /** Which ground you are on. */
  surfaceAt(x, z) {
    const c = this.canyon(x, z, _c);
    if (c.d < 0.52 && c.df > 0.4) return SALT;
    if (c.d < 1.0 && c.df > 0.4) return ROCK;
    if (this.mesa(x, z) > 3) return ROCK;
    // gravel drifts, in broad slow patches out on the flats
    const g = Math.sin(x * 0.0045 - 2.1) * Math.cos(z * 0.0038 + 0.9);
    if (g > 0.58) return GRAVEL;
    return DUNE;
  }

  /** Surface normal by central differences — the suspension needs it. */
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

  /** Boulders on the tiles around (x, z). Tiles keep their own lists. */
  rocksNear(x, z, out) {
    out.length = 0;
    const ci = Math.round(x / TILE), cj = Math.round(z / TILE);
    for (let i = ci - 1; i <= ci + 1; i++) {
      for (let j = cj - 1; j <= cj + 1; j++) {
        const t = this.tiles.get(i + ',' + j);
        const list = t && t.props.userData.rocks;
        if (!list) continue;
        for (let n = 0; n < list.length; n++) out.push(list[n]);
      }
    }
    return out;
  }

  /** Every floating rock currently streamed in, so main can turn them. */
  floaters(out) {
    out.length = 0;
    for (const t of this.tiles.values()) {
      const list = t.props.userData.floaters;
      if (!list) continue;
      for (let n = 0; n < list.length; n++) out.push(list[n]);
    }
    return out;
  }

  rng(i, j) { return mulberry32((this.seed * 7919 + i * 92837111 + j * 689287499) >>> 0); }
}

const _c = {};

function buildIndex() {
  const idx = [];
  for (let r = 0; r < Q; r++) {
    for (let c = 0; c < Q; c++) {
      const a = r * (Q + 1) + c, b = a + 1, d = a + Q + 1, e = d + 1;
      idx.push(a, d, b, b, d, e);
    }
  }
  return new THREE.Uint16BufferAttribute(idx, 1);
}

const _col = new THREE.Color(), _shade = new THREE.Color(PAL.shade);
const C = {
  salt: new THREE.Color(PAL.salt), saltDark: new THREE.Color(PAL.saltDark),
  dune: new THREE.Color(PAL.dune), duneDark: new THREE.Color(PAL.duneDark),
  gravel: new THREE.Color(PAL.gravel), rock: new THREE.Color(PAL.rock),
  rockDark: new THREE.Color(PAL.rockDark), rockLit: new THREE.Color(PAL.rockLit),
};

/** One 80 m square of world: a mesh, and whatever stands on it. */
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
    this.mesh.castShadow = false;
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
          // oxide banding — horizontal strata, which is what makes a canyon
          // wall read as sedimentary rock rather than a brown ramp
          const band = 0.5 + 0.5 * Math.sin(y * 0.52 + Math.sin(x * 0.02) * 1.4);
          _col.copy(C.rockDark).lerp(C.rockLit, band * 0.85);
          _col.lerp(C.rock, 0.3);
        } else if (s === GRAVEL) {
          _col.copy(C.gravel);
        } else {
          _col.copy(C.dune).lerp(C.duneDark, 0.5 + 0.5 * Math.sin(x * 0.021 - z * 0.017));
        }
        // violet ambient occlusion down in the rift — the deeper you are, the
        // colder the light gets, which is the whole mood of the place
        const c2 = t.canyon(x, z, _c);
        if (c2.d < 1.05) {
          const deep = (1 - Math.min(1, c2.d)) * c2.df;
          _col.lerp(_shade, deep * 0.42);
        }
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
    // userData survives clear(), so a recycled tile would inherit the previous
    // tile's boulder and floater lists and slowly poison collision queries
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
