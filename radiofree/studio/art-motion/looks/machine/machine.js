// THE MACHINE KIT (RFH 3D family, plan/3D-LOOKS.md): a toy marble run / Rube Goldberg track, built once and reused.
// Owner, 6 Nov: "You can plan and make other 3d than trucks". The road kit (looks/cars) carries vehicles; this one
// carries THINGS: money, data, parcels, as rolling balls through ramps, helices, loop-the-loops, funnels and lifts.
//
// Everything is a pure function of time, so any frame can be rendered on its own (the pipeline renders stills and
// frames out of order):
//   · a track is a curve for the BALL CENTRE; the channel is built around it from parallel-transported frames, so a
//     helix stays banked and a loop-the-loop turns its channel inward, as a real one does;
//   · a Ride turns a curve into time: gravity (v² = v0² + 2g·drop, with a toy friction cap) or a constant speed;
//   · a Gate releases one thing per slot; a Lift is a belt of cups, and a ball waits for the next free cup;
//   · schedule() runs every ball through the circuit once, event by event, and gives each a list of legs. A frame
//     at time t only looks the legs up.
// No randomness at frame time; nothing accumulates between frames.

import * as THREE from 'three';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

/** parallel-transport frames along a curve: points, tangents, an UP that stays continuous, and the SIDE */
export function railFrames(curve, n, up0 = new THREE.Vector3(0, 1, 0)) {
  const P = [], T = [], U = [], S = [];
  for (let i = 0; i <= n; i++) { const u = i / n; P.push(curve.getPointAt(u)); T.push(curve.getTangentAt(u).normalize()); }
  let up = up0.clone().sub(T[0].clone().multiplyScalar(up0.dot(T[0])));
  if (up.lengthSq() < 1e-6) up = new THREE.Vector3(1, 0, 0).sub(T[0].clone().multiplyScalar(T[0].x));
  up.normalize();
  const q = new THREE.Quaternion();
  for (let i = 0; i <= n; i++) {
    if (i) { q.setFromUnitVectors(T[i - 1], T[i]); up = up.clone().applyQuaternion(q); }
    up.sub(T[i].clone().multiplyScalar(up.dot(T[i]))).normalize();
    U.push(up.clone()); S.push(new THREE.Vector3().crossVectors(T[i], up).normalize());
  }
  return { P, T, U, S, n };
}

/**
 * A half-pipe channel around a ball path: an open U (±A from the bottom) of radius R whose bottom touches the ball,
 * two round rims along its lips, and optional posts down to the ground. Returns a Group.
 *   opts: { r: ball radius, R, A (rad), n, m, mat, rimMat, postMat, posts: [u...], ground, up0, rimR, postR }
 */
export function channel(curve, opts = {}) {
  const { r = 0.42, R = 0.6, A = 1.75, n = 220, m = 14, mat, rimMat = mat, postMat, posts = [], ground = 0, up0, rimR = 0.11, postR = 0.09 } = opts;
  const F = railFrames(curve, n, up0), g = new THREE.Group();
  const pos = [], idx = [], edgeL = [], edgeR = [];
  for (let i = 0; i <= n; i++) {
    const axis = F.P[i].clone().addScaledVector(F.U[i], R - r);
    for (let j = 0; j <= m; j++) {
      const a = -A + (2 * A * j) / m, d = F.U[i].clone().multiplyScalar(-Math.cos(a)).addScaledVector(F.S[i], Math.sin(a));
      const p = axis.clone().addScaledVector(d, R); pos.push(p.x, p.y, p.z);
      if (j === 0) edgeL.push(p.clone()); if (j === m) edgeR.push(p.clone());
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const a = i * (m + 1) + j, b = a + m + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const half = new THREE.Mesh(geo, mat); half.castShadow = true; half.receiveShadow = true; g.add(half);
  for (const e of [edgeL, edgeR]) { const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(e), n, rimR, 8, false), rimMat); t.castShadow = true; g.add(t); }
  if (postMat) for (const u of posts) {
    const i = Math.round(u * n), p = F.P[i].clone().addScaledVector(F.U[i], -r - 0.05), h = p.y - ground; if (h < 0.3) continue;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(postR, postR * 1.3, h, 8), postMat); c.position.set(p.x, ground + h / 2, p.z); c.castShadow = true; g.add(c);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(postR * 3.2, postR * 3.6, 0.12, 12), postMat); foot.position.set(p.x, ground + 0.06, p.z); g.add(foot);
  }
  g.userData.frames = F;
  return g;
}

/** points of a helix around a vertical axis: centre c (x,z), radius R, from (phi0, y0) to (phi1, y1), n points */
export function helix(c, R, y0, y1, phi0, phi1, n = 24) {
  const out = [];
  for (let i = 0; i <= n; i++) { const k = i / n, f = phi0 + (phi1 - phi0) * k; out.push(new THREE.Vector3(c[0] + R * Math.cos(f), y0 + (y1 - y0) * k, c[1] + R * Math.sin(f))); }
  return out;
}
/** a loop-the-loop in the x–y plane entered at its bottom moving along +dir·x, drifting dz across one turn so the exit passes beside the entry */
export function loopTheLoop(cx, yBottom, z0, R, dz, dir = 1, n = 28) {
  const out = [];
  for (let i = 0; i <= n; i++) { const th = (i / n) * Math.PI * 2; out.push(new THREE.Vector3(cx + dir * R * Math.sin(th), yBottom + R * (1 - Math.cos(th)), z0 + dz * (i / n))); }
  return out;
}

/**
 * Time along a curve. Gravity: v(s) = min(vmax, sqrt(v0² + 2g(h0 − h(s)))), floored at vmin; or a constant speed.
 * at(dt) → { p: point, s: arc length, u }.
 */
export class Ride {
  constructor(curve, { g = 3, v0 = 1.2, vmin = 0.9, vmax = 6, speed = 0, n = 400 } = {}) {
    this.curve = curve; this.L = curve.getLength();
    const h0 = curve.getPointAt(0).y, ts = [0]; this.n = n;
    let t = 0;
    for (let i = 1; i <= n; i++) {
      const u = (i - 0.5) / n, y = curve.getPointAt(u).y;
      const v = speed || clamp(Math.sqrt(Math.max(0, v0 * v0 + 2 * g * (h0 - y))), vmin, vmax);
      t += this.L / n / v; ts.push(t);
    }
    this.ts = ts; this.dur = t;
  }
  /** arc-length fraction at elapsed time dt (linear inside each of the n steps) */
  uAt(dt) {
    if (dt <= 0) return 0; if (dt >= this.dur) return 1;
    let lo = 0, hi = this.n; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (this.ts[mid] <= dt) lo = mid; else hi = mid; }
    return (lo + (dt - this.ts[lo]) / (this.ts[hi] - this.ts[lo])) / this.n;
  }
  at(dt) { const u = this.uAt(dt); return { p: this.curve.getPointAt(u), s: u * this.L, u }; }
}

/** one thing per slot: slot k opens at first + k·period; take(t) books the first free slot at or after t */
export class Gate {
  constructor(first, period) { this.first = first; this.period = period; this.used = new Set(); }
  take(t) { let k = Math.max(0, Math.ceil((t - this.first) / this.period - 1e-9)); while (this.used.has(k)) k++; this.used.add(k); return this.first + k * this.period; }
}

/**
 * A belt lift: a closed belt running up a vertical strand of height H from (x, y0, z), over the top and down a strand
 * behind it (zBack). K cups, evenly spaced, at speed v. A ball boards the next free cup passing the bottom.
 */
export class Lift {
  constructor({ x, y0, z, H, zBack, K = 14, v = 2.6, phase = 0 }) {
    Object.assign(this, { x, y0, z, H, zBack, K, v, phase });
    this.Rp = Math.abs(z - zBack) / 2; this.Lb = 2 * H + 2 * Math.PI * this.Rp; this.gap = this.Lb / K;
    this.gate = new Gate(-phase / v, this.gap / v);           // cup k passes the bottom at (k·gap − phase)/v
    this.ride = H / v;
  }
  board(t) { return this.gate.take(t + 0.04); }
  /** a cup's pose at belt position s (0 = bottom of the up strand), returns { p, up: facing } */
  cupAt(s) {
    s = ((s % this.Lb) + this.Lb) % this.Lb; const { x, y0, z, H, zBack, Rp } = this, zc = (z + zBack) / 2, arc = Math.PI * Rp;
    if (s < H) return { p: new THREE.Vector3(x, y0 + s, z), a: 0 };
    s -= H; if (s < arc) { const f = s / Rp; return { p: new THREE.Vector3(x, y0 + H + Math.sin(f) * Rp, zc + Math.cos(f) * Rp * Math.sign(z - zBack)), a: f }; }
    s -= arc; if (s < H) return { p: new THREE.Vector3(x, y0 + H - s, zBack), a: Math.PI };
    s -= H; const f = s / Rp; return { p: new THREE.Vector3(x, y0 - Math.sin(f) * Rp, zc - Math.cos(f) * Rp * Math.sign(z - zBack)), a: Math.PI + f };
  }
  cups(t) { const out = []; for (let k = 0; k < this.K; k++) out.push(this.cupAt(k * this.gap + this.v * t + this.phase)); return out; }
}

/**
 * Run every ball through a circuit and record its legs. `steps` is the circuit as named stations, each a function
 * (ball, t) → { legs: [...], next: station name, t: time it is free again }. Balls are advanced in time order, so a
 * shared gate or cup is booked first-come, first-served. A leg is { t0, t1, kind: 'ride'|'wait'|'lift', ... }.
 */
export function schedule(balls, steps, tEnd) {
  for (;;) {
    let b = null; for (const x of balls) if (x.t <= tEnd && (!b || x.t < b.t || (x.t === b.t && x.id < b.id))) b = x;
    if (!b) break;
    const r = steps[b.at](b, b.t); b.legs.push(...r.legs); b.at = r.next; b.t = r.t;
  }
  return balls;
}
/** where a ball is at time t: the leg it is on (before its first leg it waits at its first station) */
export function legAt(ball, t) {
  const L = ball.legs; if (!L.length || t < L[0].t0) return { leg: L[0] || null, k: 0, before: true };
  let lo = 0, hi = L.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (L[mid].t0 <= t) lo = mid; else hi = mid - 1; }
  const leg = L[lo]; return { leg, k: clamp((t - leg.t0) / Math.max(1e-6, leg.t1 - leg.t0)), before: false };
}
