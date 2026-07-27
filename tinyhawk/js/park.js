// ── Park ───────────────────────────────────────────────────────────────────
// The ground is a heightfield: h(x, z) is the max over a list of analytic
// features, so a ramp rises out of flat concrete with no seam work and no
// authored mesh. Normals come from finite differences of h.
//
// This is what makes the tiny2d physics carry over unchanged — that game
// integrated ballistically and then projected velocity onto the surface
// tangent, and the only thing that changes in 3D is that the tangent plane
// comes from a gradient instead of a scalar slope.
//
// A park is a list of placements (design doc §5). Authoring a new one is
// arranging a dozen entries, which is what makes a node-per-spot roguelike
// affordable later.

import * as THREE from 'three';
import { COL, GLOW } from './palette.js?v=1';

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (t) => t * t * (3 - 2 * t);

// ── Feature primitives ─────────────────────────────────────────────────────
// Each returns a height at (x, z), zero outside its footprint. They combine by
// max(), so everything here rises out of the flat.

// A quarterpipe transition: flat at the base, vertical at the lip. h = R − √(R²−d²)
// is the actual circular transition, which is why it meets the flat ground with
// zero slope and you can roll into it without a lump.
function quarter({ x0, x1, z0, z1, r, dir = '+z' }) {
  return (x, z) => {
    if (x < x0 || x > x1 || z < z0 || z > z1) return 0;
    let d;
    if (dir === '+z') d = z - z0;
    else if (dir === '-z') d = z1 - z;
    else if (dir === '+x') d = x - x0;
    else d = x1 - x;
    d = Math.min(d, r);
    return r - Math.sqrt(Math.max(0, r * r - d * d));
  };
}

// A straight bank with eased ends, so it does not knife into the flat.
function bank({ x0, x1, z0, z1, h, dir = '+z', ease = 2 }) {
  return (x, z) => {
    if (x < x0 || x > x1 || z < z0 || z > z1) return 0;
    const t = dir === '+z' ? (z - z0) / (z1 - z0)
            : dir === '-z' ? (z1 - z) / (z1 - z0)
            : dir === '+x' ? (x - x0) / (x1 - x0)
            : (x1 - x) / (x1 - x0);
    // Taper across the width too so the sides are rideable, not cliffs.
    const w = dir === '+z' || dir === '-z'
      ? Math.min((x - x0) / ease, (x1 - x) / ease)
      : Math.min((z - z0) / ease, (z1 - z) / ease);
    return h * smooth(clamp01(t)) * clamp01(w);
  };
}

// A funbox: flat top, sloped on all four sides.
function box({ x0, x1, z0, z1, h, slope = 3 }) {
  return (x, z) => {
    if (x < x0 - slope || x > x1 + slope || z < z0 - slope || z > z1 + slope) return 0;
    const kx = Math.min((x - (x0 - slope)) / slope, ((x1 + slope) - x) / slope);
    const kz = Math.min((z - (z0 - slope)) / slope, ((z1 + slope) - z) / slope);
    return h * smooth(clamp01(Math.min(kx, kz)));
  };
}

function pyramid({ cx, cz, half, h }) {
  return (x, z) => {
    const d = Math.max(Math.abs(x - cx), Math.abs(z - cz));
    if (d > half) return 0;
    return h * (1 - d / half);
  };
}

// The rim: a quarterpipe running all the way around the park. It is the
// boundary and it is also the best thing to skate — a park should send you back
// into itself rather than fence you in.
function rim({ inner, depth, h }) {
  return (x, z) => {
    const d = Math.max(Math.abs(x), Math.abs(z));
    if (d < inner) return 0;
    const t = Math.min((d - inner) / depth, 1);
    return h * (1 - Math.sqrt(Math.max(0, 1 - t * t)));
  };
}

// ── The P0 park ────────────────────────────────────────────────────────────
const RIM_INNER = 34, RIM_DEPTH = 10, RIM_H = 9;
// Only a hair of flat past the lip. Any wider and you can roll over the rim,
// stall on the plateau outside, and there is nothing out there to skate back
// down — the boundary has to be the lip itself.
export const PARK_EXTENT = RIM_INNER + RIM_DEPTH + 1;

const FEATURES = [
  rim({ inner: RIM_INNER, depth: RIM_DEPTH, h: RIM_H }),
  // A facing pair down the middle — the closest thing to a halfpipe here.
  quarter({ x0: -26, x1: -6, z0: -20, z1: -10, r: 7, dir: '-z' }),
  quarter({ x0: -26, x1: -6, z0: 10, z1: 20, r: 7, dir: '+z' }),
  // Centre funbox with a flat top you can land on.
  box({ x0: 2, x1: 16, z0: -6, z1: 6, h: 2.6, slope: 4 }),
  // Two banks off to the side for transfer lines.
  bank({ x0: 8, x1: 26, z0: -30, z1: -18, h: 4.2, dir: '-z', ease: 3 }),
  bank({ x0: -30, x1: -14, z0: 20, z1: 30, h: 3.4, dir: '+z', ease: 3 }),
  pyramid({ cx: 20, cz: 20, half: 9, h: 3.2 }),
];

// Glowing line-work. In the reference the ground is a silhouette and the LINES
// do all the describing — coping on a quarterpipe lip, edges on a box, road
// markings. Each entry is a polyline in xz; it is resampled onto the surface at
// draw time so it hugs a transition instead of cutting through it.
const LINES = [
  { pts: [[-26, -20], [-6, -20]], glow: 'coping' },          // quarterpipe lips
  { pts: [[-26, 20], [-6, 20]], glow: 'coping' },
  { pts: [[2, -6], [16, -6], [16, 6], [2, 6], [2, -6]], glow: 'line' },   // funbox
  { pts: [[-40, 0], [40, 0]], glow: 'line' },                // the long stripe
  { pts: [[0, -40], [0, 40]], glow: 'line' },
  { pts: [[11, 11], [29, 11], [29, 29], [11, 29], [11, 11]], glow: 'line' },
];
const LINE_STEP = 0.7;   // resample spacing along a polyline
const LINE_LIFT = 0.07;  // above the surface, or it z-fights the ground

const GRID = 1.15;   // heightfield mesh sampling step

export class Park {
  constructor(scene) {
    this.features = FEATURES;
    this.mesh = this.build();
    scene.add(this.mesh);
    this.lines = this.buildLines();
    scene.add(this.lines);
  }

  // Resampled onto the surface so a line follows a transition rather than
  // cutting a chord through it. HDR colour, so only these bloom.
  buildLines() {
    const pos = [], col = [];
    const c = new THREE.Color();
    for (const L of LINES) {
      const g = GLOW[L.glow] || GLOW.line;
      c.setRGB(g[0], g[1], g[2]);
      for (let i = 0; i < L.pts.length - 1; i++) {
        const [x0, z0] = L.pts[i], [x1, z1] = L.pts[i + 1];
        const len = Math.hypot(x1 - x0, z1 - z0);
        const n = Math.max(2, Math.ceil(len / LINE_STEP));
        let px = x0, pz = z0, py = this.height(x0, z0) + LINE_LIFT;
        for (let k = 1; k <= n; k++) {
          const t = k / n;
          const x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t;
          const y = this.height(x, z) + LINE_LIFT;
          pos.push(px, py, pz, x, y, z);
          col.push(c.r, c.g, c.b, c.r, c.g, c.b);
          px = x; py = y; pz = z;
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const mesh = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true }));
    mesh.frustumCulled = false;
    return mesh;
  }

  height(x, z) {
    let h = 0;
    for (const f of this.features) {
      const v = f(x, z);
      if (v > h) h = v;
    }
    return h;
  }

  // Central differences. eps has to be comfortably larger than the float noise
  // in the feature functions and comfortably smaller than the smallest radius,
  // or transitions read as faceted.
  normal(x, z, out = new THREE.Vector3()) {
    const e = 0.35;
    const dx = (this.height(x + e, z) - this.height(x - e, z)) / (2 * e);
    const dz = (this.height(x, z + e) - this.height(x, z - e)) / (2 * e);
    return out.set(-dx, 1, -dz).normalize();
  }

  // ── Mesh ─────────────────────────────────────────────────────────────────
  // Non-indexed so each triangle can take a flat tone from its own normal —
  // the three-tone rule from the design doc, done with vertex colours and no
  // lights at all.
  build() {
    const S = PARK_EXTENT;
    const n = Math.ceil((S * 2) / GRID);
    const pos = [], col = [];
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const ab = new THREE.Vector3(), ac = new THREE.Vector3(), nrm = new THREE.Vector3();
    const tint = new THREE.Color();

    const push = (p0, p1, p2) => {
      ab.subVectors(p1, p0); ac.subVectors(p2, p0);
      nrm.crossVectors(ab, ac).normalize();
      // The grid walk emits triangles wound so the normal points down, which
      // back-face culls the entire park. Swap the last two vertices rather than
      // switching the material to DoubleSide — culling the underside of a
      // heightfield is free performance we should keep.
      let v1 = p1, v2 = p2;
      if (nrm.y < 0) { nrm.negate(); v1 = p2; v2 = p1; }
      tint.setHex(nrm.y > 0.93 ? COL.groundUp : nrm.y > 0.55 ? COL.groundMid : COL.groundLow);
      for (const p of [p0, v1, v2]) {
        pos.push(p.x, p.y, p.z);
        col.push(tint.r, tint.g, tint.b);
      }
    };

    const at = (i, j, v) => {
      const x = -S + i * GRID, z = -S + j * GRID;
      return v.set(x, this.height(x, z), z);
    };
    const p00 = new THREE.Vector3(), p10 = new THREE.Vector3();
    const p01 = new THREE.Vector3(), p11 = new THREE.Vector3();

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        at(i, j, p00); at(i + 1, j, p10); at(i, j + 1, p01); at(i + 1, j + 1, p11);
        a.copy(p00); b.copy(p10); c.copy(p11); push(a, b, c);
        a.copy(p00); b.copy(p11); c.copy(p01); push(a, b, c);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
    mesh.frustumCulled = false;
    return mesh;
  }
}
