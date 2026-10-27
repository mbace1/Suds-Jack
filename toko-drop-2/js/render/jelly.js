// jelly.js — a soft body you can cut: a big gel dies as jelly, sliced in two.
//
// The owner's reference is a WebGPU "melon jelly" you slice with a knife: a
// tetrahedral soft body solved with XPBD, cut by a blade plane into pieces
// that keep simulating, with a smooth surface pinned to the tetrahedra. The
// Godot build landed it as a boss's death (toko-drop-godot Q-052,
// scripts/jelly_body.gd); this is that file ported to plain JS, so a big gel
// here dies the same way along the line of the shot that killed it.
//
// A dome of tetrahedra (a cube lattice, six Kuhn tets a cube, a cube kept if
// any corner is inside the dome, so the tets COVER it) in the body's own
// silhouette: the unit sphere raised `lift` and cut at the floor, scaled by
// the body's radius and species shape. XPBD (Macklin, Müller & Chentanez
// 2016), small steps: `substeps` a frame, one iteration each, edge lengths
// compliant (the wobble) and tet volumes held (jelly does not compress),
// gravity, damping, the floor with friction. What you SEE is a smooth dome
// pinned to the tets by barycentric weights (Müller's "Ten Minute Physics"),
// and, after a cut, the seam's tet faces as the flesh.
//
// PURELY A LOOK, and pure JS: no three.js, no DOM, no clock. The kill, the
// score and the revenge happened before a body is handed to this.
import { TUNING } from '../tuning.js?v=51';

const J = () => TUNING.death.jelly;

// ── small vector helpers on (x, y, z) triples in flat arrays ────────────────
const sub = (a, ai, b, bi, o) => { o[0] = a[ai] - b[bi]; o[1] = a[ai + 1] - b[bi + 1]; o[2] = a[ai + 2] - b[bi + 2]; return o; };
const cross = (a, b, o) => { const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0]; o[0] = x; o[1] = y; o[2] = z; return o; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// signed volume of the tet (a, b, c, d) given as 3-arrays
function vol3(a, b, c, d) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const cx = c[0] - a[0], cy = c[1] - a[1], cz = c[2] - a[2];
  const dx = d[0] - a[0], dy = d[1] - a[1], dz = d[2] - a[2];
  return ((by * cz - bz * cy) * dx + (bz * cx - bx * cz) * dy + (bx * cy - by * cx) * dz) / 6;
}
const min4 = (w) => Math.min(Math.min(w[0], w[1]), Math.min(w[2], w[3]));
const P = (arr, i) => [arr[3 * i], arr[3 * i + 1], arr[3 * i + 2]];

// barycentric weights of q in the tet (a, b, c, d); a flat tet answers "no"
function bary(q, a, b, c, d) {
  const v0 = vol3(a, b, c, d);
  if (Math.abs(v0) < 1e-12) return [-1e9, -1e9, -1e9, -1e9];
  return [vol3(q, b, c, d) / v0, vol3(a, q, c, d) / v0, vol3(a, b, q, d) / v0, vol3(a, b, c, q) / v0];
}

// bary() for every tet of a body at once: each tet's edge matrix inverted
// up front, so a query is nine multiply-adds rather than five determinants.
// Pinning a cut's ~500 render vertices against ~200 tets is what a kill
// costs, and it was 9-28 ms on a desktop before this
function baryFor(jb) {
  const X = jb.x, T = jb.tets, nt = T.length / 4, inv = new Float64Array(nt * 9), ok = new Uint8Array(nt);
  for (let t = 0; t < nt; t++) {
    const a = 3 * T[4 * t], b = 3 * T[4 * t + 1], c = 3 * T[4 * t + 2], d = 3 * T[4 * t + 3];
    const m00 = X[b] - X[a], m01 = X[c] - X[a], m02 = X[d] - X[a];
    const m10 = X[b + 1] - X[a + 1], m11 = X[c + 1] - X[a + 1], m12 = X[d + 1] - X[a + 1];
    const m20 = X[b + 2] - X[a + 2], m21 = X[c + 2] - X[a + 2], m22 = X[d + 2] - X[a + 2];
    const c00 = m11 * m22 - m12 * m21, c01 = m12 * m20 - m10 * m22, c02 = m10 * m21 - m11 * m20;
    const det = m00 * c00 + m01 * c01 + m02 * c02;
    if (Math.abs(det) < 6e-12) continue;
    ok[t] = 1;
    const o = 9 * t;
    inv[o] = c00 / det; inv[o + 1] = (m02 * m21 - m01 * m22) / det; inv[o + 2] = (m01 * m12 - m02 * m11) / det;
    inv[o + 3] = c01 / det; inv[o + 4] = (m00 * m22 - m02 * m20) / det; inv[o + 5] = (m02 * m10 - m00 * m12) / det;
    inv[o + 6] = c02 / det; inv[o + 7] = (m01 * m20 - m00 * m21) / det; inv[o + 8] = (m00 * m11 - m01 * m10) / det;
  }
  return (q, t) => {
    if (!ok[t]) return [-1e9, -1e9, -1e9, -1e9];
    const a = 3 * T[4 * t], o = 9 * t, px = q[0] - X[a], py = q[1] - X[a + 1], pz = q[2] - X[a + 2];
    const w1 = inv[o] * px + inv[o + 1] * py + inv[o + 2] * pz;
    const w2 = inv[o + 3] * px + inv[o + 4] * py + inv[o + 5] * pz;
    const w3 = inv[o + 6] * px + inv[o + 7] * py + inv[o + 8] * pz;
    return [1 - w1 - w2 - w3, w1, w2, w3];
  };
}

// ── the unit template, cached per lattice resolution ────────────────────────
const templates = new Map();
export function template(cells) {
  if (templates.has(cells)) return templates.get(cells);
  const { lift, segs, rings } = J();
  const inside = (x, y, z) => y >= -1e-6 && Math.hypot(x, y - lift, z) <= 1 + 1e-6;
  const top = 1 + lift, cell = 2 / cells, ny = Math.max(2, Math.ceil(top / cell)), cy = top / ny;
  const idx = new Map(), pts = [], tets = [];
  const corner = (i, j, k) => {
    const key = (i * 64 + j) * 64 + k;
    if (!idx.has(key)) { idx.set(key, pts.length / 3); pts.push(-1 + i * cell, j * cy, -1 + k * cell); }
    return idx.get(key);
  };
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  for (let i = 0; i < cells; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < cells; k++) {
    let any = false;
    for (let c = 0; c < 8 && !any; c++) any = inside(-1 + (i + (c & 1)) * cell, (j + ((c >> 1) & 1)) * cy, -1 + (k + ((c >> 2) & 1)) * cell);
    if (!any) continue;
    for (const pm of perms) {
      const c3 = [i, j, k];
      tets.push(corner(...c3));
      for (const a of pm) { c3[a]++; tets.push(corner(...c3)); }
    }
  }
  // the render dome: rings from the floor rim to the crown, and a floor disc
  const rv = [], a0 = Math.asin(Math.max(-1, Math.min(1, -lift)));
  for (let ring = 0; ring <= rings; ring++) {
    const lat = a0 + (Math.PI / 2 - a0) * (ring / rings);
    for (let s = 0; s < segs; s++) {
      const lon = (2 * Math.PI * s) / segs;
      rv.push([Math.cos(lat) * Math.cos(lon), Math.sin(lat) + lift, Math.cos(lat) * Math.sin(lon)]);
    }
  }
  const ctr = rv.length;
  rv.push([0, 0, 0]);
  const rIdx = [];
  for (let ring = 0; ring < rings; ring++) for (let s = 0; s < segs; s++) {
    const a = ring * segs + s, b = ring * segs + ((s + 1) % segs), c = a + segs, d = b + segs;
    rIdx.push(a, c, b, b, c, d);
  }
  for (let s = 0; s < segs; s++) rIdx.push(ctr, s, (s + 1) % segs);
  // every triangle OUTWARD (counter-clockwise seen from outside): away from
  // the sphere's centre, and down for the floor disc
  const e1 = [0, 0, 0], e2 = [0, 0, 0], n = [0, 0, 0];
  for (let f = 0; f < rIdx.length / 3; f++) {
    const A = rv[rIdx[3 * f]], B = rv[rIdx[3 * f + 1]], C = rv[rIdx[3 * f + 2]];
    const cen = [(A[0] + B[0] + C[0]) / 3, (A[1] + B[1] + C[1]) / 3, (A[2] + B[2] + C[2]) / 3];
    const out = cen[1] < 1e-4 ? [0, -1, 0] : [cen[0], cen[1] - lift, cen[2]];
    e1[0] = B[0] - A[0]; e1[1] = B[1] - A[1]; e1[2] = B[2] - A[2];
    e2[0] = C[0] - A[0]; e2[1] = C[1] - A[1]; e2[2] = C[2] - A[2];
    if (dot(cross(e1, e2, n), out) < 0) { const t = rIdx[3 * f + 1]; rIdx[3 * f + 1] = rIdx[3 * f + 2]; rIdx[3 * f + 2] = t; }
  }
  // pin every render vertex to the tet it is most inside
  const nt = tets.length / 4, rvTet = new Int32Array(rv.length), rvW = new Float64Array(rv.length * 4);
  for (let i = 0; i < rv.length; i++) {
    let best = -1e9;
    for (let t = 0; t < nt; t++) {
      const w = bary(rv[i], P(pts, tets[4 * t]), P(pts, tets[4 * t + 1]), P(pts, tets[4 * t + 2]), P(pts, tets[4 * t + 3]));
      const m = Math.min(w[0], w[1], w[2], w[3]);
      if (m > best) { best = m; rvTet[i] = t; rvW.set(w, 4 * i); }
    }
  }
  const T = { pts: Float64Array.from(pts), tets: Int32Array.from(tets), rvTet, rvW, rIdx: Int32Array.from(rIdx) };
  templates.set(cells, T);
  return T;
}

// ── one body ────────────────────────────────────────────────────────────────
export class JellyBody {
  // a dome of x/z radius `sx` and height scale `sy`: the scale the body's own
  // dome wears (radius × its species shape), in metres, standing on y = 0
  static dome(sx, sy, cells = J().cells) {
    const T = template(cells), pts = new Float64Array(T.pts.length);
    for (let i = 0; i < pts.length; i += 3) { pts[i] = T.pts[i] * sx; pts[i + 1] = T.pts[i + 1] * sy; pts[i + 2] = T.pts[i + 2] * sx; }
    const jb = new JellyBody(pts, T.tets, null);
    jb.shape = [sx, sy, sx];
    jb.rvTet = T.rvTet; jb.rvW = T.rvW; jb.rIdx = T.rIdx;
    return jb;
  }

  constructor(pts, tets, vel) {
    this.x = Float64Array.from(pts);
    this.p = Float64Array.from(pts);
    this.x0 = Float64Array.from(pts);   // where every particle rested when this body was made
    this.v = vel && vel.length === pts.length ? Float64Array.from(vel) : new Float64Array(pts.length);
    this.tets = tets;
    const nt = tets.length / 4, X = this.x;
    this.restVol = new Float64Array(nt);
    const eset = new Map(), N = pts.length / 3;
    for (let t = 0; t < nt; t++) {
      const q = [tets[4 * t], tets[4 * t + 1], tets[4 * t + 2], tets[4 * t + 3]];
      this.restVol[t] = vol3(P(X, q[0]), P(X, q[1]), P(X, q[2]), P(X, q[3]));
      for (const [a, b] of [[q[0], q[1]], [q[0], q[2]], [q[0], q[3]], [q[1], q[2]], [q[1], q[3]], [q[2], q[3]]]) {
        const lo = Math.min(a, b), hi = Math.max(a, b);
        eset.set(lo * N + hi, [lo, hi]);
      }
    }
    const es = [...eset.values()];
    this.edges = new Int32Array(es.length * 2);
    this.restLen = new Float64Array(es.length);
    // a tet the cut flattened to a sliver keeps its edges but not its
    // volume: held to a near-zero volume, the slivers along the blade pinned
    // each half's face flat against it and the halves would not part
    let meanV = 0;
    for (let t = 0; t < nt; t++) meanV += Math.abs(this.restVol[t]) / nt;
    this.volOn = Uint8Array.from(this.restVol, (v) => (Math.abs(v) >= J().sliver * meanV ? 1 : 0));
    es.forEach(([a, b], e) => {
      this.edges[2 * e] = a; this.edges[2 * e + 1] = b;
      this.restLen[e] = Math.hypot(X[3 * a] - X[3 * b], X[3 * a + 1] - X[3 * b + 1], X[3 * a + 2] - X[3 * b + 2]);
    });
    this.rvTet = new Int32Array(0); this.rvW = new Float64Array(0); this.rIdx = new Int32Array(0);
    this.seam = new Int32Array(0);
    this.shape = [1, 1, 1];
    this.age = 0;
  }

  // summed |volume| of the tets (the lattice's tets come in both
  // handednesses, so the signed total is near zero by construction)
  volume() {
    let s = 0;
    const X = this.x, T = this.tets;
    for (let t = 0; t < T.length / 4; t++) s += Math.abs(vol3(P(X, T[4 * t]), P(X, T[4 * t + 1]), P(X, T[4 * t + 2]), P(X, T[4 * t + 3])));
    return s;
  }

  // one frame: substeps × (integrate, edges, volumes, the floor, velocities)
  step(dt) {
    const C = J(), h = dt / C.substeps, X = this.x, Pp = this.p, V = this.v, n = X.length / 3;
    const ae = C.edgeCompliance / (h * h), av = C.volCompliance / (h * h), dampk = Math.max(0, 1 - C.damp * h);
    const E = this.edges, L = this.restLen, T = this.tets, RV = this.restVol;
    const ga = [0, 0, 0], gb = [0, 0, 0], gc = [0, 0, 0], gd = [0, 0, 0], u = [0, 0, 0], w = [0, 0, 0];
    for (let s = 0; s < C.substeps; s++) {
      for (let i = 0; i < n; i++) {
        const j = 3 * i;
        V[j + 1] += C.gravity * h;
        V[j] *= dampk; V[j + 1] *= dampk; V[j + 2] *= dampk;
        Pp[j] = X[j]; Pp[j + 1] = X[j + 1]; Pp[j + 2] = X[j + 2];
        X[j] += V[j] * h; X[j + 1] += V[j + 1] * h; X[j + 2] += V[j + 2] * h;
      }
      for (let e = 0; e < L.length; e++) {
        const a = 3 * E[2 * e], b = 3 * E[2 * e + 1];
        const dx = X[a] - X[b], dy = X[a + 1] - X[b + 1], dz = X[a + 2] - X[b + 2], l = Math.hypot(dx, dy, dz);
        if (l < 1e-9) continue;
        const k = -(l - L[e]) / (2 + ae) / l;
        X[a] += dx * k; X[a + 1] += dy * k; X[a + 2] += dz * k;
        X[b] -= dx * k; X[b + 1] -= dy * k; X[b + 2] -= dz * k;
      }
      for (let t = 0; t < RV.length; t++) {
        if (!this.volOn[t]) continue;
        const a = 3 * T[4 * t], b = 3 * T[4 * t + 1], c = 3 * T[4 * t + 2], d = 3 * T[4 * t + 3];
        cross(sub(X, d, X, b, u), sub(X, c, X, b, w), ga);
        cross(sub(X, c, X, a, u), sub(X, d, X, a, w), gb);
        cross(sub(X, d, X, a, u), sub(X, b, X, a, w), gc);
        cross(sub(X, b, X, a, u), sub(X, c, X, a, w), gd);
        const wsum = dot(ga, ga) + dot(gb, gb) + dot(gc, gc) + dot(gd, gd);
        if (wsum < 1e-12) continue;
        const vol = vol3(P(X, a / 3), P(X, b / 3), P(X, c / 3), P(X, d / 3));
        const dl = -((vol - RV[t]) * 6) / (wsum + av);
        X[a] += ga[0] * dl; X[a + 1] += ga[1] * dl; X[a + 2] += ga[2] * dl;
        X[b] += gb[0] * dl; X[b + 1] += gb[1] * dl; X[b + 2] += gb[2] * dl;
        X[c] += gc[0] * dl; X[c + 1] += gc[1] * dl; X[c + 2] += gc[2] * dl;
        X[d] += gd[0] * dl; X[d + 1] += gd[1] * dl; X[d + 2] += gd[2] * dl;
      }
      // the jelly's own spring: a pull toward its rest shape, carried with
      // its centre and overall rotation (shape matching). Edges and volumes
      // alone have no shear to speak of at this softness, so a body flowed
      // like syrup until its tets were slivers and the volume solve fired it
      // into the air; this is what a set jelly has and syrup has not
      if (C.match > 0) {
        const R = this.rotation(), c = this._c, c0 = this._c0, X0 = this.x0, k = C.match;
        for (let i = 0; i < n; i++) {
          const j = 3 * i, ox = X0[j] - c0[0], oy = X0[j + 1] - c0[1], oz = X0[j + 2] - c0[2];
          X[j] += (c[0] + R[0] * ox + R[1] * oy + R[2] * oz - X[j]) * k;
          X[j + 1] += (c[1] + R[3] * ox + R[4] * oy + R[5] * oz - X[j + 1]) * k;
          X[j + 2] += (c[2] + R[6] * ox + R[7] * oy + R[8] * oz - X[j + 2]) * k;
        }
      }
      for (let i = 0; i < n; i++) {
        const j = 3 * i;
        if (X[j + 1] < 0) {
          X[j + 1] = 0;
          X[j] -= (X[j] - Pp[j]) * C.friction;
          X[j + 2] -= (X[j + 2] - Pp[j + 2]) * C.friction;
        }
      }
      for (let i = 0; i < X.length; i++) V[i] = (X[i] - Pp[i]) / h;
    }
    this.age += dt;
  }

  kick(vx, vy, vz) {
    const V = this.v;
    for (let i = 0; i < V.length; i += 3) { V[i] += vx; V[i + 1] += vy; V[i + 2] += vz; }
  }

  // a render vertex where its tet now holds it
  rvPos(i, out) {
    const t = this.rvTet[i], X = this.x, T = this.tets, w = this.rvW;
    out[0] = out[1] = out[2] = 0;
    for (let k = 0; k < 4; k++) {
      const q = 3 * T[4 * t + k], wk = w[4 * i + k];
      out[0] += X[q] * wk; out[1] += X[q + 1] * wk; out[2] += X[q + 2] * wk;
    }
    return out;
  }

  // the body's overall rotation since it was made: shape matching (the
  // rotation part of Σ (x − c)(x0 − c0)ᵀ, by Higham's iteration)
  rotation() {
    const X = this.x, X0 = this.x0, n = X.length / 3, c = [0, 0, 0], c0 = [0, 0, 0];
    for (let i = 0; i < X.length; i += 3) for (let k = 0; k < 3; k++) { c[k] += X[i + k] / n; c0[k] += X0[i + k] / n; }
    let A = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < X.length; i += 3) for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) A[3 * r + q] += (X[i + r] - c[r]) * (X0[i + q] - c0[q]);
    const det = (M) => M[0] * (M[4] * M[8] - M[5] * M[7]) - M[1] * (M[3] * M[8] - M[5] * M[6]) + M[2] * (M[3] * M[7] - M[4] * M[6]);
    this._c = c; this._c0 = c0;
    if (!(det(A) > 1e-12)) return (this.rot = this.rot || [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    for (let it = 0; it < 12; it++) {
      const d = det(A);   // R ← (R + R⁻ᵀ) / 2, with R⁻ᵀ = cof(R) / det
      const cof = [
        A[4] * A[8] - A[5] * A[7], A[5] * A[6] - A[3] * A[8], A[3] * A[7] - A[4] * A[6],
        A[2] * A[7] - A[1] * A[8], A[0] * A[8] - A[2] * A[6], A[1] * A[6] - A[0] * A[7],
        A[1] * A[5] - A[2] * A[4], A[2] * A[3] - A[0] * A[5], A[0] * A[4] - A[1] * A[3],
      ];
      A = A.map((v, k) => 0.5 * (v + cof[k] / d));
    }
    return (this.rot = A);
  }

  // Cut with a vertical plane through `point` (body-local), normal `nrm`
  // (x, z). Returns [the side (c − point)·nrm ≥ 0, the other side]; a side
  // the plane missed is null. Each tet goes to the side its centroid is on;
  // faces shared by tets of different sides are the seam, flattened onto the
  // blade and clipped to the dome so the flesh is a flat face inside the
  // silhouette; render triangles go to the side their centre is on and are
  // re-pinned to tets of their own half (never a tet the flattening squashed).
  cut(point, nrm) {
    const { lift } = J(), X = this.x, T = this.tets, nt = T.length / 4;
    const side = new Uint8Array(nt);
    const ofs = (q) => (q[0] - point[0]) * nrm[0] + (q[1] - point[1]) * nrm[1] + (q[2] - point[2]) * nrm[2];
    const centroid = (t, src = X) => {
      const c = [0, 0, 0];
      for (let k = 0; k < 4; k++) { const q = 3 * T[4 * t + k]; c[0] += src[q] / 4; c[1] += src[q + 1] / 4; c[2] += src[q + 2] / 4; }
      return c;
    };
    for (let t = 0; t < nt; t++) side[t] = ofs(centroid(t)) >= 0 ? 0 : 1;
    // the seam: faces shared by two tets of different sides
    const owner = new Map(), seamFaces = [[], []], N = X.length / 3;
    for (let t = 0; t < nt; t++) {
      const [a, b, c, d] = [T[4 * t], T[4 * t + 1], T[4 * t + 2], T[4 * t + 3]];
      for (const f of [[a, b, c, d], [a, b, d, c], [a, c, d, b], [b, c, d, a]]) {
        const s3 = [f[0], f[1], f[2]].sort((p, q) => p - q), key = (s3[0] * N + s3[1]) * N + s3[2];
        const o = owner.get(key);
        if (o) { if (side[o[0]] !== side[t]) { seamFaces[side[t]].push(f); seamFaces[side[o[0]]].push(o[1]); } }
        else owner.set(key, [t, f]);
      }
    }
    // flatten the seam onto the blade, no further out than the dome itself
    const onplane = new Set();
    for (const s of [0, 1]) for (const f of seamFaces[s]) { onplane.add(f[0]); onplane.add(f[1]); onplane.add(f[2]); }
    const xs = Float64Array.from(X), sh = this.shape;
    for (const q of onplane) {
      const j = 3 * q, d = ofs([xs[j], xs[j + 1], xs[j + 2]]);
      let px = xs[j] - nrm[0] * d, py = xs[j + 1] - nrm[1] * d, pz = xs[j + 2] - nrm[2] * d;
      let ux = px / sh[0], uy = py / sh[1] - lift, uz = pz / sh[2];
      const ul = Math.hypot(ux, uy, uz);
      if (ul > 1) {
        ux /= ul; uy /= ul; uz /= ul;
        px = ux * sh[0]; py = (uy + lift) * sh[1]; pz = uz * sh[2];
        const d2 = ofs([px, py, pz]);
        px -= nrm[0] * d2; py -= nrm[1] * d2; pz -= nrm[2] * d2;
      }
      xs[j] = px; xs[j + 1] = Math.max(py, 0); xs[j + 2] = pz;
    }
    // the render surface where it is now, to sort its triangles by side
    const nrv = this.rvTet.length, rp = new Float64Array(nrv * 3), tmp = [0, 0, 0];
    for (let i = 0; i < nrv; i++) { this.rvPos(i, tmp); rp[3 * i] = tmp[0]; rp[3 * i + 1] = tmp[1]; rp[3 * i + 2] = tmp[2]; }
    const out = [];
    for (const s of [0, 1]) {
      const remap = new Map(), tmap = new Map(), px = [], pv = [], ntl = [];
      for (let t = 0; t < nt; t++) {
        if (side[t] !== s) continue;
        tmap.set(t, ntl.length / 4);
        for (let k = 0; k < 4; k++) {
          const q = T[4 * t + k];
          if (!remap.has(q)) { remap.set(q, px.length / 3); px.push(xs[3 * q], xs[3 * q + 1], xs[3 * q + 2]); pv.push(this.v[3 * q], this.v[3 * q + 1], this.v[3 * q + 2]); }
          ntl.push(remap.get(q));
        }
      }
      if (!ntl.length) { out.push(null); continue; }
      const jb = new JellyBody(Float64Array.from(px), Int32Array.from(ntl), Float64Array.from(pv));
      jb.shape = this.shape;
      jb.age = this.age;
      const jt = jb.tets.length / 4, ctrs = [], volOk = new Uint8Array(jt);
      let meanV = 0;
      for (let t = 0; t < jt; t++) meanV += Math.abs(jb.restVol[t]);
      meanV /= Math.max(1, jt);
      for (let t = 0; t < jt; t++) { ctrs.push(jbCentroid(jb, t)); volOk[t] = Math.abs(jb.restVol[t]) > 0.25 * meanV ? 1 : 0; }
      const reach = 2 * Math.cbrt(meanV * 6);
      const vmap = new Map(), rvT = [], rvW = [], rI = [];
      const baryT = baryFor(jb);
      for (let f = 0; f < this.rIdx.length / 3; f++) {
        const tri = [this.rIdx[3 * f], this.rIdx[3 * f + 1], this.rIdx[3 * f + 2]];
        // a half keeps every triangle with a vertex on its side, the vertices
        // across flattened onto the blade, so its rim meets the cut face
        // exactly (sorting by the centre left a sawtooth of notches there)
        const dq3 = tri.map((q) => ofs([rp[3 * q], rp[3 * q + 1], rp[3 * q + 2]]));
        if (!dq3.some((d) => (s === 0 ? d >= 0 : d <= 0))) continue;
        for (const q of tri) {
          if (!vmap.has(q)) {
            vmap.set(q, rvT.length);
            const r = [rp[3 * q], rp[3 * q + 1], rp[3 * q + 2]], dq = ofs(r);
            const across = s === 0 ? dq < 0 : dq > 0;
            const at = across ? [r[0] - nrm[0] * dq, r[1] - nrm[1] * dq, r[2] - nrm[2] * dq] : r;
            let bt = -1, bw = null, best = -1e9;
            if (!across && tmap.has(this.rvTet[q])) {
              const t0 = tmap.get(this.rvTet[q]);
              if (volOk[t0]) {
                const w0 = baryT(at, t0);
                if (min4(w0) > -0.25) { bt = t0; bw = w0; }
              }
            }
            if (bt < 0) {
              for (const rTry of [reach, reach * 2, 1e9]) {
                for (let t = 0; t < jt; t++) {
                  if (!volOk[t]) continue;
                  const ex = ctrs[t][0] - at[0], ey = ctrs[t][1] - at[1], ez = ctrs[t][2] - at[2];
                  if (ex * ex + ey * ey + ez * ez > rTry * rTry) continue;
                  const ww = baryT(at, t), m = min4(ww);
                  if (m > best) { best = m; bt = t; bw = ww; }
                }
                if (bt >= 0) break;
              }
            }
            rvT.push(bt); rvW.push(...(bw || [0.25, 0.25, 0.25, 0.25]));
          }
          rI.push(vmap.get(q));
        }
      }
      jb.rvTet = Int32Array.from(rvT); jb.rvW = Float64Array.from(rvW); jb.rIdx = Int32Array.from(rI);
      // the seam's faces, outward (away from their own tet), counter-clockwise from outside
      const seam = [];
      for (const f of seamFaces[s]) {
        const fa = remap.get(f[0]), fb = remap.get(f[1]), fc = remap.get(f[2]);
        const A = P(X, f[0]), B = P(X, f[1]), C = P(X, f[2]), D = P(X, f[3]);
        const n3 = cross([B[0] - A[0], B[1] - A[1], B[2] - A[2]], [C[0] - A[0], C[1] - A[1], C[2] - A[2]], [0, 0, 0]);
        if (dot(n3, [D[0] - A[0], D[1] - A[1], D[2] - A[2]]) > 0) seam.push(fa, fc, fb); else seam.push(fa, fb, fc);
      }
      jb.seam = Int32Array.from(seam);
      cutFace(jb, point, nrm, s === 0 ? -1 : 1, volOk, ctrs, reach, baryT);
      out.push(jb);
    }
    return out;
  }

  // the triangles to draw, non-indexed: the skin (smooth normals) then the
  // flesh (flat normals). Returns the vertex count written.
  fill(pos, nor) {
    const nrv = this.rvTet.length, rp = new Float64Array(nrv * 3), rn = new Float64Array(nrv * 3), tmp = [0, 0, 0];
    for (let i = 0; i < nrv; i++) { this.rvPos(i, tmp); rp[3 * i] = tmp[0]; rp[3 * i + 1] = tmp[1]; rp[3 * i + 2] = tmp[2]; }
    const R = this.rIdx, e1 = [0, 0, 0], e2 = [0, 0, 0], fn = [0, 0, 0];
    for (let f = 0; f < R.length / 3; f++) {
      const a = 3 * R[3 * f], b = 3 * R[3 * f + 1], c = 3 * R[3 * f + 2];
      cross(sub(rp, b, rp, a, e1), sub(rp, c, rp, a, e2), fn);
      for (const q of [a, b, c]) { rn[q] += fn[0]; rn[q + 1] += fn[1]; rn[q + 2] += fn[2]; }
    }
    let k = 0;
    for (let f = 0; f < R.length; f++) {
      const q = 3 * R[f], l = Math.hypot(rn[q], rn[q + 1], rn[q + 2]) || 1;
      pos[k] = rp[q]; pos[k + 1] = rp[q + 1]; pos[k + 2] = rp[q + 2];
      nor[k] = rn[q] / l; nor[k + 1] = rn[q + 1] / l; nor[k + 2] = rn[q + 2] / l;
      k += 3;
    }
    // the cut face: a clean cross-section of the dome on the blade, pinned
    // to this half's tets like the skin, so it wobbles with the jelly
    const F = this.fIdx || [];
    for (let f = 0; f < F.length / 3; f++) {
      const a = 3 * F[3 * f], b = 3 * F[3 * f + 1], c = 3 * F[3 * f + 2];
      cross(sub(rp, b, rp, a, e1), sub(rp, c, rp, a, e2), fn);
      const l = Math.hypot(fn[0], fn[1], fn[2]) || 1;
      for (const q of [a, b, c]) {
        pos[k] = rp[q]; pos[k + 1] = rp[q + 1]; pos[k + 2] = rp[q + 2];
        nor[k] = fn[0] / l; nor[k + 1] = fn[1] / l; nor[k + 2] = fn[2] / l;
        k += 3;
      }
    }
    return k / 3;
  }

  // vertices fill() writes
  get vertexCount() { return this.rIdx.length + (this.fIdx ? this.fIdx.length : 0); }
}

// The cut face of one half: the dome's cross-section on the blade (an ellipse
// cut by the floor), as rings of vertices round a centre, each pinned to the
// half's best-holding tet. `facing` is the side of the blade the face looks
// toward (−1: against the normal). Its vertices join the half's render
// vertices; its triangles are `fIdx`, wound to face outward.
function cutFace(jb, point, nrm, facing, volOk, ctrs, reach, baryT) {
  const { lift, faceRings, faceArc, faceChord } = J(), [sx, sy] = jb.shape;
  const d = (point[0] * nrm[0] + point[2] * nrm[2]) / sx;
  const k2 = 1 - d * d;
  if (k2 <= 0.01) { jb.fIdx = new Int32Array(0); return; }
  const kk = Math.sqrt(k2), ux = nrm[2], uz = -nrm[0];          // u: along the blade, horizontal
  const base = [point[0] - nrm[0] * (point[0] * nrm[0] + point[2] * nrm[2]), 0, point[2] - nrm[2] * (point[0] * nrm[0] + point[2] * nrm[2])];
  const at = (u, v) => [base[0] + ux * u, v, base[2] + uz * u];
  // the outline: the arc above the floor, then the chord along it
  const th0 = Math.asin(Math.max(-1, Math.min(1, -lift / kk))), rim = [];
  for (let i = 0; i <= faceArc; i++) { const th = th0 + ((Math.PI - 2 * th0) * i) / faceArc; rim.push([sx * kk * Math.cos(-th + Math.PI), sy * (lift + kk * Math.sin(th))]); }
  const uL = rim[rim.length - 1][0], uR = rim[0][0];
  for (let i = 1; i < faceChord; i++) rim.push([uL + ((uR - uL) * i) / faceChord, 0]);
  const cu = 0, cv = sy * Math.max(0.05, (lift + kk) * 0.45);    // a centre well inside the outline
  const first = jb.rvTet.length, verts = [[cu, cv]];
  for (let r = 1; r <= faceRings; r++) { const f = r / faceRings; for (const [u, v] of rim) verts.push([cu + (u - cu) * f, cv + (v - cv) * f]); }
  const rvT = [...jb.rvTet], rvW = [...jb.rvW];
  for (const [u, v] of verts) {
    const q = at(u, Math.max(0, v));
    let bt = -1, bw = null, best = -1e9;
    for (const rTry of [reach, reach * 2, 1e9]) {
      for (let t = 0; t < ctrs.length; t++) {
        if (!volOk[t]) continue;
        const ex = ctrs[t][0] - q[0], ey = ctrs[t][1] - q[1], ez = ctrs[t][2] - q[2];
        if (ex * ex + ey * ey + ez * ez > rTry * rTry) continue;
        const ww = baryT(q, t), m = min4(ww);
        if (m > best) { best = m; bt = t; bw = ww; }
      }
      if (bt >= 0) break;
    }
    rvT.push(bt); rvW.push(...(bw || [0.25, 0.25, 0.25, 0.25]));
  }
  jb.rvTet = Int32Array.from(rvT); jb.rvW = Float64Array.from(rvW);
  const n = verts.length, B = rim.length, idx = [], want = [nrm[0] * facing, 0, nrm[2] * facing];
  const tri = (a, b, c) => {
    const A = verts[a - first], Bv = verts[b - first], C = verts[c - first];
    const pa = at(...A), pb = at(...Bv), pc = at(...C);
    const nn = cross([pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]], [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]], [0, 0, 0]);
    if (dot(nn, want) < 0) idx.push(a, c, b); else idx.push(a, b, c);
  };
  for (let i = 0; i < B; i++) tri(first, first + 1 + i, first + 1 + ((i + 1) % B));
  for (let r = 1; r < faceRings; r++) for (let i = 0; i < B; i++) {
    const a = first + 1 + (r - 1) * B + i, b = first + 1 + (r - 1) * B + ((i + 1) % B), c = a + B, e = b + B;
    tri(a, c, b); tri(b, c, e);
  }
  jb.fIdx = Int32Array.from(idx);
  void n;
}

function jbCentroid(jb, t) {
  const c = [0, 0, 0], X = jb.x, T = jb.tets;
  for (let k = 0; k < 4; k++) { const q = 3 * T[4 * t + k]; c[0] += X[q] / 4; c[1] += X[q + 1] / 4; c[2] += X[q + 2] / 4; }
  return c;
}
