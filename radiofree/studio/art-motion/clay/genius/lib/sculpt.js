// What a modeller's hands make: balls, rolled sausages, pressed discs, and the
// Toko mask built from the traced master.
//
// Everything is built at real miniature size in centimetres. `lumpy()` pushes
// each vertex along a noise field keyed on POSITION, so coincident vertices
// move together and nothing cracks.

import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { MASTER, SHAPES, masterBounds } from './master.js';

// ---- a deterministic 3D noise for the CPU side --------------------------
function hash(x, y, z, s) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, z, s) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash(xi + dx, yi + dy, zi + dz, s);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v),
    L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}
export function noise3(x, y, z, s = 0) {
  return vnoise(x, y, z, s) * 0.62 + vnoise(x * 2.1 + 5, y * 2.1, z * 2.1, s + 1) * 0.28 + vnoise(x * 4.3, y * 4.3 + 3, z * 4.3, s + 2) * 0.1;
}
export function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** push vertices by a positional vector-noise field; amp in cm, freq per cm */
export function lumpy(geom, amp = 0.15, freq = 0.4, seed = 1, worldOffset = [0, 0, 0]) {
  let g = geom;
  if (g.index === null || g.attributes.uv) {
    g = g.clone();
    g.deleteAttribute('normal'); if (g.attributes.uv) g.deleteAttribute('uv');
    if (g.attributes.uv1) g.deleteAttribute('uv1');
    g = mergeVertices(g, 1e-4);
  }
  const p = g.attributes.position;
  const [ox, oy, oz] = worldOffset;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const X = (x + ox) * freq, Y = (y + oy) * freq, Z = (z + oz) * freq;
    p.setXYZ(i,
      x + noise3(X, Y, Z, seed) * amp,
      y + noise3(X + 31, Y, Z, seed + 7) * amp,
      z + noise3(X, Y + 17, Z, seed + 13) * amp);
  }
  g.computeVertexNormals();
  return g;
}

/**
 * A rolled sausage along points with radius per point (or [rx, ry] pairs),
 * capped round at both ends. `up` steers the cross-section's orientation.
 */
export function sausage(pts, radii, { seg = 28, steps = 64, up = [0, 1, 0], capSteps = 8, flat = 1 } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal');
  const R = (t) => {
    const f = t * (radii.length - 1), i = Math.min(radii.length - 2, Math.floor(f)), k = f - i;
    const a = radii[i], b = radii[i + 1];
    const s = k * k * (3 - 2 * k);
    if (Array.isArray(a)) return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s];
    return [a + (b - a) * s, (a + (b - a) * s) * flat];
  };
  const ref = new THREE.Vector3(...up).normalize();
  const rings = [];
  const frame = (t) => {
    const P = curve.getPointAt(t), T = curve.getTangentAt(t).normalize();
    let N = new THREE.Vector3().crossVectors(ref, T);
    if (N.lengthSq() < 1e-6) N = new THREE.Vector3().crossVectors(new THREE.Vector3(1, 0, 0), T);
    N.normalize();
    const B = new THREE.Vector3().crossVectors(T, N).normalize();
    return { P, T, N, B };
  };
  // start cap
  const f0 = frame(0), f1 = frame(1), r0 = R(0), r1 = R(1);
  for (let c = capSteps; c >= 1; c--) {
    const a = (c / capSteps) * Math.PI / 2;
    const k = Math.max(Math.cos(a), 0.02);
    rings.push({ P: f0.P.clone().addScaledVector(f0.T, -Math.sin(a) * Math.min(r0[0], r0[1])), N: f0.N, B: f0.B, rx: r0[0] * k, ry: r0[1] * k });
  }
  for (let s = 0; s <= steps; s++) {
    const t = s / steps, f = frame(t), r = R(t);
    rings.push({ P: f.P, N: f.N, B: f.B, rx: r[0], ry: r[1] });
  }
  for (let c = 1; c <= capSteps; c++) {
    const a = (c / capSteps) * Math.PI / 2;
    const k = Math.max(Math.cos(a), 0.02);
    rings.push({ P: f1.P.clone().addScaledVector(f1.T, Math.sin(a) * Math.min(r1[0], r1[1])), N: f1.N, B: f1.B, rx: r1[0] * k, ry: r1[1] * k });
  }
  const pos = [], idx = [];
  for (const rg of rings) for (let j = 0; j < seg; j++) {
    const a = (j / seg) * Math.PI * 2;
    const v = rg.P.clone().addScaledVector(rg.N, Math.cos(a) * rg.rx).addScaledVector(rg.B, Math.sin(a) * rg.ry);
    pos.push(v.x, v.y, v.z);
  }
  // tips
  const tipA = pos.length / 3; pos.push(...f0.P.clone().addScaledVector(f0.T, -Math.min(r0[0], r0[1])).toArray());
  const tipB = pos.length / 3; pos.push(...f1.P.clone().addScaledVector(f1.T, Math.min(r1[0], r1[1])).toArray());
  for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < seg; j++) {
    const a = i * seg + j, b = i * seg + (j + 1) % seg, c = (i + 1) * seg + j, d = (i + 1) * seg + (j + 1) % seg;
    idx.push(a, b, c, b, d, c);   // outward: (b−a)×(c−a) = tangent-round × along = +N
  }
  for (let j = 0; j < seg; j++) idx.push(tipA, (j + 1) % seg, j);
  const L = (rings.length - 1) * seg;
  for (let j = 0; j < seg; j++) idx.push(tipB, L + j, L + (j + 1) % seg);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** a ball, optionally squashed, ready to lump */
export function ball(r, sx = 1, sy = 1, sz = 1, seg = 48) {
  const g = new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75));
  g.scale(sx, sy, sz);
  return g;
}

/** a lathe from a profile of [radius, y] */
export function lathe(profile, seg = 48) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}

export function mesh(geom, mat, { pos = [0, 0, 0], rot = [0, 0, 0], scale = 1, cast = true, recv = true, parent = null, order = 'XYZ' } = {}) {
  const m = new THREE.Mesh(geom, mat);
  m.position.set(...pos); m.rotation.set(...rot, order);
  if (Array.isArray(scale)) m.scale.set(...scale); else m.scale.setScalar(scale);
  m.castShadow = cast; m.receiveShadow = recv;
  if (parent) parent.add(m);
  return m;
}

/** split long edges (non-indexed) until none is longer than maxEdge, so a bend can follow */
export function tessellate(geom, maxEdge) {
  let g = geom.index ? geom.toNonIndexed() : geom;
  let pos = Array.from(g.attributes.position.array);
  const m2 = maxEdge * maxEdge;
  for (let pass = 0; pass < 12; pass++) {
    const out = []; let split = false;
    for (let i = 0; i < pos.length; i += 9) {
      const a = pos.slice(i, i + 3), b = pos.slice(i + 3, i + 6), c = pos.slice(i + 6, i + 9);
      const d = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;
      const ab = d(a, b), bc = d(b, c), ca = d(c, a), mx = Math.max(ab, bc, ca);
      if (mx <= m2) { out.push(...a, ...b, ...c); continue; }
      split = true;
      const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
      if (mx === ab) { const m = mid(a, b); out.push(...a, ...m, ...c, ...m, ...b, ...c); }
      else if (mx === bc) { const m = mid(b, c); out.push(...a, ...b, ...m, ...a, ...m, ...c); }
      else { const m = mid(c, a); out.push(...a, ...b, ...m, ...m, ...b, ...c); }
    }
    pos = out;
    if (!split) break;
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  r.computeVertexNormals();
  return r;
}

// ---- the Toko mask -------------------------------------------------------

/** the master's four loops as THREE.Shapes, placed like the badge on a disc of radius r */
export function tokoShapes(r, ink = 1.33) {
  const b = masterBounds(), s = (r * ink) / b.w, c = MASTER.size / 2;
  return SHAPES.map(k => {
    const p = MASTER[k], pts = [];
    for (let i = 0; i < p.length; i += 2) pts.push(new THREE.Vector2((p[i] - c) * s, -(p[i + 1] - c) * s));
    // the traced loops wind clockwise in y-down; flip so the face points +z
    if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
    return new THREE.Shape(pts);
  });
}

/**
 * The mask: a domed disc of radius r with the face raised on it.
 * kind: 'clay' (rolled strokes pressed on), 'inlay' (strokes flush, a groove round them),
 * 'felt' (strokes appliquéd: flat, square-edged, stitched).
 * Returns a Group whose +z is the face direction, centred on the disc's back plane.
 */
export function tokoMask(r, discMat, inkMat, { dome = 0.35, thick = 0.35, raise = 0.22, bevel = 0.12, kind = 'clay', lump = 0.03, seed = 3, threadMat = null, rimThreadMat = null } = {}) {
  const g = new THREE.Group();
  const domeZ = (x, y) => { const q = Math.min(1, (x * x + y * y) / (r * r)); return thick + dome * r * (1 - q) * 0.5; };
  // disc: lathe with a rounded rim
  const prof = [];
  prof.push([0.001, 0]);
  prof.push([r * 0.96, 0]);
  for (let i = 0; i <= 8; i++) { const a = -Math.PI / 2 + (i / 8) * Math.PI / 2; prof.push([r * 0.96 + Math.cos(a) * 0.06 * r, thick * 0.5 + Math.sin(a) * thick * 0.5]); }
  for (let i = 1; i <= 24; i++) { const x = r * (1 - i / 24); prof.push([Math.max(x, 0.001), domeZ(x, 0)]); }
  let disc = lathe(prof.map(([a, b]) => [a, b]), 72);
  disc.rotateX(Math.PI / 2); // lathe y → z
  disc = lumpy(disc, lump * r, 0.5 / r * 4, seed);
  const dm = new THREE.Mesh(disc, discMat); dm.castShadow = dm.receiveShadow = true; g.add(dm);
  // the face
  const shapes = tokoShapes(r);
  for (const sh of shapes) {
    let geo = new THREE.ExtrudeGeometry(sh, {
      depth: raise, bevelEnabled: kind !== 'felt', bevelThickness: bevel * 0.8, bevelSize: bevel * (kind === 'clay' ? 0.9 : 0.4),
      bevelOffset: -bevel * (kind === 'clay' ? 0.9 : 0.4) * 0.5, // the BASE of the stroke is the traced outline
      bevelSegments: kind === 'clay' ? 5 : 2, curveSegments: 4, steps: 1,
    });
    geo = tessellate(geo, r * 0.08);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      p.setZ(i, domeZ(x, y) - (kind === 'inlay' ? raise * 0.85 : bevel * 0.4) + z);
    }
    geo.computeVertexNormals();
    // merge so the bevel shades round; a flat-topped felt stroke keeps its hard edge
    geo = kind === 'felt' ? geo : lumpy(geo, kind === 'clay' ? lump * r * 0.5 : 0.0001, 0.6 / r * 4, seed + 5);
    const m = new THREE.Mesh(geo, inkMat); m.castShadow = m.receiveShadow = true; g.add(m);
  }
  if (threadMat) {
    // appliqué: a running stitch round each stroke, and a blanket of stitches round the rim
    const top = (x, y) => domeZ(x, y) - (kind === 'inlay' ? raise * 0.85 : bevel * 0.4) + raise;
    for (const sh of shapes) {
      const m = new THREE.Mesh(stitches(sh.getPoints(), { inset: r * 0.03, spacing: r * 0.085, len: r * 0.045, r: r * 0.008, zf: top, lift: r * 0.002 }), threadMat);
      m.castShadow = false; m.receiveShadow = true; g.add(m);
    }
    const ring = []; for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2; ring.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
    const m = new THREE.Mesh(stitches(ring, { inset: r * 0.06, spacing: r * 0.07, len: r * 0.07, r: r * 0.009, zf: domeZ, lift: r * 0.002 }), rimThreadMat || threadMat);
    m.receiveShadow = true; g.add(m);
  }
  g.userData.frontZ = domeZ(0, 0);
  return g;
}

/**
 * Running stitches along a closed 2D loop (array of Vector2), inset toward
 * the loop's inside. Returns ONE merged geometry of tiny thread capsules.
 * zf(x, y) gives the surface height to sit them on.
 */
export function stitches(loop, { inset = 0.12, spacing = 0.42, len = 0.24, r = 0.035, zf = () => 0, lift = 0.02 } = {}) {
  const n = loop.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const a = loop[i], b = loop[(i + 1) % n]; area += a.x * b.y - b.x * a.y; }
  const sgn = area > 0 ? 1 : -1;            // CCW: inside is to the left
  // resample by arc length
  const segs = []; let total = 0;
  for (let i = 0; i < n; i++) { const a = loop[i], b = loop[(i + 1) % n]; const l = a.distanceTo(b); segs.push([a, b, l]); total += l; }
  const count = Math.max(3, Math.floor(total / spacing));
  const parts = [];
  const cap = new THREE.CapsuleGeometry(r, len, 2, 6);
  let si = 0, acc = 0;
  for (let k = 0; k < count; k++) {
    const d = (k + 0.5) * total / count;
    while (si < segs.length - 1 && acc + segs[si][2] < d) { acc += segs[si][2]; si++; }
    const [a, b, l] = segs[si]; const t = (d - acc) / l;
    const p = new THREE.Vector2().lerpVectors(a, b, t);
    const dir = new THREE.Vector2().subVectors(b, a).normalize();
    const nrm = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(sgn);   // inward
    p.addScaledVector(nrm, inset);
    const g = cap.clone();
    g.rotateZ(Math.atan2(dir.y, dir.x) - Math.PI / 2);   // capsule is along y
    g.translate(p.x, p.y, zf(p.x, p.y) + lift);
    parts.push(g);
  }
  return mergeGeometries(parts);
}

/** the felt mask's stitching: round the face's four strokes and round the disc */
export function tokoStitches(r, { zf = () => 0, inset = 0.1, spacing = 0.36, len = 0.2, thread = 0.03, rim = true } = {}) {
  const loops = tokoShapes(r).map(sh => sh.getPoints());
  const gs = loops.map(l => stitches(l, { inset, spacing, len, r: thread, zf }));
  if (rim) {
    const ring = []; for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2; ring.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
    gs.push(stitches(ring, { inset: 0.22, spacing: 0.3, len: 0.22, r: thread, zf }));
  }
  return mergeGeometries(gs);
}
