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
import { PAL, SUN_DIR } from './palette.js?v=12';
import { populate, bakeProps, makePropKit } from './props.js?v=12';

export const TILE = 100;
const Q = 16;                    // 6.25 m resolution
const RING = 5;                  // 11x11 tiles, 550 m each way
export const VIEW = TILE * (RING + 0.5);

export const SALT = 0, DUNE = 1, GRAVEL = 2, ROCK = 3, ROAD = 4;
export const SURF = [
  //  mu    grip;  drag  body drag x;  sink  m a loaded runner settles;  shear  s the bite lags
  { name: 'SALT PAN',   mu: 1.25, drag: 0.92, sink: 0.05, shear: 0.02 },
  { name: 'DEEP SAND',  mu: 0.95, drag: 1.45, sink: 0.55, shear: 0.12 },
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
    // v11: the trail map the pods cut their grooves into (trench.js points
    // these at its render target; until then, a black texel and no box)
    const none = new THREE.DataTexture(new Uint8Array(4), 1, 1);
    none.needsUpdate = true;
    this.trail = { tex: { value: none }, box: { value: new THREE.Vector3(0, 0, 0) } };
    groundDetail(this.mat, this.trail);
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

  /**
   * The ground's colour at a point — what the tiles paint into their vertex
   * colours, and what a trench is cut into (v11: trench.js reads it so a
   * groove is the sand it runs through, not a stripe laid on top of it).
   */
  colorAt(x, z, y, s, out) {
    if (s === SALT) {
      out.copy(C.salt).lerp(C.saltDark, 0.5 + 0.5 * Math.sin(x * 0.11 + z * 0.07));
    } else if (s === ROCK) {
      const band = 0.5 + 0.5 * Math.sin(y * 0.52 + Math.sin(x * 0.02) * 1.4);
      out.copy(C.rockDark).lerp(C.rockLit, band * 0.85).lerp(C.rock, 0.3);
    } else if (s === ROAD) {
      const r2 = this.roadAt(z, _r);
      out.copy(C.road).lerp(C.roadEdge, smoothstep(ROAD_W * 0.32, ROAD_W * 0.5, r2.off));
    } else if (s === GRAVEL) {
      out.copy(C.gravel);
    } else {
      // white sand with a grey grain: the ripples are what the low sun
      // has to rake, and the grey is the sky in the shadow side
      out.copy(C.dune).lerp(C.duneDark, 0.5 + 0.5 * Math.sin(x * 0.021 - z * 0.017));
    }
    const c2 = this.canyon(x, z, _c);
    if (c2.d < 1.05) out.lerp(_shade, (1 - Math.min(1, c2.d)) * c2.df * 0.42);
    return out;
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

// ------------------------------------------------------------ ground detail
// v11. The ground was vertex colour on a 6.25 m grid and nothing else, so at
// 160 km/h nothing near the lens moved and the sand read as a painted floor.
// Now it has a surface: WIND RIPPLES on the sand, laid across the sun so the
// low key rakes them (lit face, shadowed face, every half metre), a fine
// GRAIN, and on the salt pan the polygon CRUST a dry lake cracks into. Three
// patterns in one tileable texture (R ripple height, G crust lines, B grain),
// chosen per vertex by weights, embossed toward the sun in the shader — two
// taps, no normal map, no tangents — and faded out with distance so the
// repeat never shows and nothing shimmers.
const DETAIL = 6;                                // m per repeat

function detailTexture() {
  const N = 256, img = new ImageData(N, N);
  const rnd = mulberry32(911);
  // tileable value noise, for perturbing the ripples
  const G = 8, grid = Array.from({ length: G * G }, () => rnd());
  const vnoise = (u, v) => {
    const x = u * G, y = v * G, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
    const at = (i, j) => grid[((j % G + G) % G) * G + ((i % G + G) % G)];
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return (at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx) * (1 - sy) + (at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx) * sy;
  };
  // crust: Voronoi cells, distances wrapped so the tile repeats
  const sites = Array.from({ length: 22 }, () => [rnd(), rnd()]);
  // the ripples run ACROSS the direction toward the sun, on an integer
  // lattice so they tile: (1, -3) is ~the sun's bearing in (x, z)
  const RA = 1, RB = -3, RK = 4;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const u = i / N, v = j / N;
    const ph = (RA * u + RB * v) * RK + 0.55 * vnoise(u, v) + 0.25 * vnoise(u * 2 + 0.3, v * 2 + 0.7);
    const f = ph - Math.floor(ph);
    // a ripple is asymmetric: a long stoss slope and a short steep lee
    const rip = f < 0.72 ? f / 0.72 : (1 - f) / 0.28;
    let d1 = 9, d2 = 9;
    for (const [sx, sy] of sites) {
      let dx = Math.abs(u - sx), dy = Math.abs(v - sy);
      dx = Math.min(dx, 1 - dx); dy = Math.min(dy, 1 - dy);
      const d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const edge = Math.sqrt(d2) - Math.sqrt(d1);
    const crack = Math.max(0, 1 - edge / 0.012);
    const k = (j * N + i) * 4;
    img.data[k] = rip * 255;
    img.data[k + 1] = crack * 255;
    img.data[k + 2] = 90 + rnd() * 110;
    img.data[k + 3] = 255;
  }
  const c = document.createElement('canvas');
  c.width = c.height = N;
  c.getContext('2d').putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;             // data, not colour
  t.anisotropy = 8;
  return t;
}

function groundDetail(mat, trail) {
  const tex = detailTexture();
  // toward the sun, in detail-texture space (x, z scale alike)
  const toSun = new THREE.Vector2(-SUN_DIR[0], -SUN_DIR[2]).normalize();
  mat.onBeforeCompile = sh => {
    sh.uniforms.uDetail = { value: tex };
    sh.uniforms.uToSun = { value: toSun };
    sh.uniforms.uTrail = trail.tex;
    sh.uniforms.uTrailBox = trail.box;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec2 aDuv;
attribute vec2 aSurf;
varying vec2 vDuv;
varying vec2 vSurf;
varying float vDist;
varying vec2 vWxz;`)
      .replace('#include <project_vertex>', `#include <project_vertex>
vDuv = aDuv; vSurf = aSurf; vDist = -mvPosition.z;
vWxz = (modelMatrix * vec4(transformed, 1.0)).xz;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform sampler2D uDetail;
uniform vec2 uToSun;
uniform sampler2D uTrail;
uniform vec3 uTrailBox;
varying vec2 vDuv;
varying vec2 vSurf;
varying float vDist;
varying vec2 vWxz;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  // near: full detail; by ~140 m the repeat would show, so it is gone
  float near = 1.0 - smoothstep(35.0, 140.0, vDist);
  vec3 d0 = texture2D(uDetail, vDuv).rgb;
  // the emboss: height rising toward the sun is a face turned to it
  float up = texture2D(uDetail, vDuv + uToSun * 0.006).r - d0.r;
  float sand = vSurf.x, salt = vSurf.y;
  // v11: the grooves (trench.js). R is how deep, G the berm either side.
  // A groove's depth rising TOWARD the sun is ground falling toward it — a
  // wall facing the sun — so the emboss here is depth ahead minus depth
  // here, 30 cm toward the light; the floor darkens with depth (compacted,
  // fresh-cut sand, and the shadow of its own walls) and the berm lightens.
  vec2 tuv = (vWxz - uTrailBox.xy) * uTrailBox.z + 0.5;
  vec2 tr = vec2(0.0);
  float groove = 0.0;
  // only where the map is (64 m round the player): most of the frame's
  // ground is farther than that and should not pay for two more fetches
  if (uTrailBox.z > 0.0 && tuv.x > 0.0 && tuv.x < 1.0 && tuv.y > 0.0 && tuv.y < 1.0) {
    tr = texture2D(uTrail, tuv).rg;
    float trSun = texture2D(uTrail, tuv + uToSun * 0.30 * uTrailBox.z).r;
    groove = -tr.r * 0.30 + (trSun - tr.r) * 1.7 + tr.g * 0.16;
  }
  float rip = ((d0.r - 0.5) * 0.10 + up * 2.6) * (1.0 - min(1.0, tr.r * 1.6));
  float grain = (d0.b - 0.5) * (0.10 + 0.08 * (1.0 - sand));
  float crust = -d0.g * 0.26;
  float k = 1.0 + near * (sand * rip + salt * crust + grain) + (1.0 - smoothstep(70.0, 190.0, vDist)) * groove;
  diffuseColor.rgb *= clamp(k, 0.55, 1.4);
}`);
  };
  mat.customProgramCacheKey = () => 'powder-ground-v11b';
}

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
    this.duv = new Float32Array(n * 2);          // v11: detail texture coordinates
    this.surf = new Float32Array(n * 2);         // v11: sand-ness, salt-ness
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geo.setAttribute('aDuv', new THREE.BufferAttribute(this.duv, 2));
    this.geo.setAttribute('aSurf', new THREE.BufferAttribute(this.surf, 2));
    this.geo.setIndex(terrain.index);
    this.mesh = new THREE.Mesh(this.geo, terrain.mat);
    this.mesh.receiveShadow = true;
    this.props = new THREE.Group();
    this.baked = null;
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
        // v11: the detail texture repeats every DETAIL m, in world space so
        // neighbouring tiles meet; the weights say which pattern this is
        const vi = (v / 3) * 2;
        this.duv[vi] = x / DETAIL; this.duv[vi + 1] = z / DETAIL;
        this.surf[vi] = s === DUNE ? 1 : s === GRAVEL ? 0.55 : s === ROCK ? 0.25 : 0;
        this.surf[vi + 1] = s === SALT ? 1 : 0;
        t.colorAt(x, z, y, s, _col);
        this.col[v] = _col.r; this.col[v + 1] = _col.g; this.col[v + 2] = _col.b;
        v += 3;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.attributes.aDuv.needsUpdate = true;
    this.geo.attributes.aSurf.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.geo.computeBoundingSphere();
    t.scene.add(this.mesh);

    this.props.clear();
    this.props.userData = {};
    populate(t, this.props, i, j, TILE);
    // and immediately collapse the static ones into a single mesh — see
    // bakeProps. The tile owns the merged geometry, so it disposes it.
    this.baked = bakeProps(this.props, t.kit);
    t.scene.add(this.props);
  }

  release() {
    this.t.scene.remove(this.mesh);
    this.t.scene.remove(this.props);
    this.props.clear();
    this.props.userData = {};
    if (this.baked) { this.baked.dispose(); this.baked = null; }
    this.i = this.j = null;
  }
}
