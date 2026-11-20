#!/usr/bin/env node
// jelly.mjs — the jelly death's soft body (js/render/jelly.js), in bare node:
// it holds its volume, settles without exploding, cuts into two halves along
// the blade, and the halves' skins stay pinned and finite.
//
// Usage: node test/jelly.mjs           (exit 1 on any failure)
import { JellyBody, template } from '../js/render/jelly.js?v=158';
import { TUNING as T } from '../js/tuning.js?v=158';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => { if (ok) { passed++; return; } failed++; console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`); };
const J = T.death.jelly, dt = 1 / 60;
const finite = (a) => a.every(Number.isFinite);

const tp = template(J.cells);
check('the template is a lattice of tets covering the dome', tp.tets.length / 4 > 100 && tp.pts.length / 3 > 60, `${tp.tets.length / 4} tets, ${tp.pts.length / 3} points`);
check('every skin vertex is pinned to a tet that holds it', [...Array(tp.rvTet.length).keys()].every((i) => Math.min(...tp.rvW.slice(4 * i, 4 * i + 4)) > -0.05));
check('the template is cached', template(J.cells) === tp);

const r = 1.1, shape = T.blob.shape, jb = JellyBody.dome(r * shape.x, r * shape.y);
const v0 = jb.volume();
for (let i = 0; i < 30; i++) jb.step(dt);
check('half a second on the floor, it keeps its volume (within 3%)', Math.abs(jb.volume() - v0) / v0 < 0.03, `${(jb.volume() / v0).toFixed(3)}`);
check('…and stays finite', finite(jb.x) && finite(jb.v));
let minY = Infinity; for (let i = 1; i < jb.x.length; i += 3) minY = Math.min(minY, jb.x[i]);
check('…and never sinks through the floor', minY >= -1e-9, `${minY}`);

const [a, b] = jb.cut([0, 0, 0], [1, 0, 0]);
check('a cut through the middle makes two halves', a && b);
check('every tet goes to one half or the other', a.tets.length + b.tets.length === jb.tets.length);
const side = (body) => { let s = 0; for (let i = 0; i < body.x.length; i += 3) s += body.x[i]; return s / (body.x.length / 3); };
check('the halves are on their own sides of the blade', side(a) > 0 && side(b) < 0, `${side(a).toFixed(2)} / ${side(b).toFixed(2)}`);
check('each half has a skin and a flat cut face', a.rIdx.length > 0 && b.rIdx.length > 0 && a.seam.length > 0 && b.seam.length > 0);
check('every skin vertex of a half is pinned to a tet of its own', [a, b].every((h) => [...h.rvTet].every((t) => t >= 0 && t < h.tets.length / 4)));

a.kick(J.push, J.up, 0); b.kick(-J.push, J.up, 0);
let maxR = 0;
const pos = new Float32Array(Math.max(a.vertexCount, b.vertexCount) * 3), nor = new Float32Array(pos.length);
for (let i = 0; i < Math.round(J.life / dt); i++) {
  a.step(dt); b.step(dt);
  for (const h of [a, b]) {
    const n = h.fill(pos, nor);
    for (let k = 0; k < n * 3; k += 3) maxR = Math.max(maxR, Math.hypot(pos[k], pos[k + 2]));
  }
}
check('the halves part and slump without the skin exploding (it stays within 4 radii)', maxR < 4 * r, `${maxR.toFixed(2)}`);
check('the drawn vertices are finite', finite(pos) && finite(nor));
check('the halves moved apart along the blade\'s normal', side(a) > 0.5 && side(b) < -0.5, `${side(a).toFixed(2)} / ${side(b).toFixed(2)}`);

// every cut, not just one: three sizes, four blade angles, through the middle
// and off it. The halves part, and no particle of either is ever faster than
// the kick gave it. A soft set left one half in nine firing a particle off at
// 40 m/s a second after the cut, and that half rolled back into the blade
const sweep = (cuts) => {
  let fastest = 0, leastParted = Infinity;
  const along = (h, n) => { let q = 0; for (let i = 0; i < h.x.length; i += 3) q += h.x[i] * n[0] + h.x[i + 2] * n[2]; return q / (h.x.length / 3); };
  for (const [rr, n, off] of cuts) {
    const body = JellyBody.dome(rr * shape.x, rr * shape.y);
    for (let i = 0; i < 30; i++) body.step(dt);
    const [p, q] = body.cut([off * n[0], 0, off * n[2]], n);
    if (!p || !q) continue;
    const gap0 = along(p, n) - along(q, n);
    p.kick(n[0] * J.push, J.up, n[2] * J.push); q.kick(-n[0] * J.push, J.up, -n[2] * J.push);
    for (let i = 0; i < Math.round(J.life / dt); i++) for (const h of [p, q]) {
      h.step(dt);
      for (let k = 0; k < h.v.length; k += 3) fastest = Math.max(fastest, Math.hypot(h.v[k], h.v[k + 1], h.v[k + 2]));
    }
    leastParted = Math.min(leastParted, along(p, n) - along(q, n) - gap0);
  }
  return { fastest, leastParted };
};
const cuts = [];
for (const rr of [0.8, 1.1, 1.6]) for (const n of [[1, 0, 0], [0, 0, 1], [0.6, 0, 0.8], [0.8, 0, -0.6]]) for (const off of [0, 0.15]) cuts.push([rr, n, off]);
const sw = sweep(cuts), kick = Math.hypot(J.push, J.up);
check('across 24 cuts no particle outruns its kick (25% headroom)', sw.fastest < 1.25 * kick, `${sw.fastest.toFixed(1)} m/s against a ${kick.toFixed(1)} kick`);
check('…and every pair of halves parts by 0.3 m or more', sw.leastParted > 0.3, `${sw.leastParted.toFixed(2)} m`);
check('a cut that misses the body leaves one piece and a null', (() => { const c = JellyBody.dome(1, 1); const [p, q] = c.cut([5, 0, 0], [1, 0, 0]); return p === null && q && q.tets.length === c.tets.length; })());

// stable: a body left alone stays a body. With no set (match 0) the edges
// carried no shear, the lattice flowed into slivers and the volume solve fired
// it into the air — an uncut dome reached 3x its own height in under a second
const hmax = (b) => { let m = 0; for (let i = 1; i < b.x.length; i += 3) m = Math.max(m, b.x[i]); return m; };
const settle = JellyBody.dome(r * shape.x, r * shape.y), h0 = hmax(settle);
let peakH = 0, peakV = 0;
for (let i = 0; i < 240; i++) {
  settle.step(dt); peakH = Math.max(peakH, hmax(settle));
  for (let k = 0; k < settle.v.length; k += 3) peakV = Math.max(peakV, Math.hypot(settle.v[k], settle.v[k + 1], settle.v[k + 2]));
}
check('a dome left on the floor for four seconds stays a dome (never above 1.1x its height, never faster than 2 m/s)', peakH < 1.1 * h0 && peakV < 2, `${(peakH / h0).toFixed(2)}x, ${peakV.toFixed(1)} m/s`);

// the cut face stays a face: through the whole slump, every vertex of it
// within 0.15 m of its own plane (carried by the half's rotation). Pinned
// from outside their tets with no softening, they bulged 0.8 m and the half
// read as crumpled paper
let bulge = 0;
for (const n of [[1, 0, 0], [0.6, 0, 0.8], [0.8, 0, -0.6]]) {
  const body = JellyBody.dome(r * shape.x, r * shape.y);
  for (let i = 0; i < 30; i++) body.step(dt);
  const hs = body.cut([0.1, 0, 0], n).filter(Boolean);
  hs.forEach((h, k) => h.kick(n[0] * J.push * (k ? -1 : 1), J.up, n[2] * J.push * (k ? -1 : 1)));
  const fp = new Float32Array(3 * Math.max(...hs.map((h) => h.vertexCount))), fn = fp.slice();
  for (let i = 0; i < Math.round(J.life / dt); i++) for (const h of hs) {
    h.step(dt);
    const cnt = h.fill(fp, fn), nf = h.fIdx.length, R = h.rotation();
    const m = [R[0] * n[0] + R[2] * n[2], R[3] * n[0] + R[5] * n[2], R[6] * n[0] + R[8] * n[2]];
    let c = 0, lo = Infinity, hi = -Infinity;
    for (let k = cnt - nf; k < cnt; k++) { const d = fp[3 * k] * m[0] + fp[3 * k + 1] * m[1] + fp[3 * k + 2] * m[2]; c += d / nf; lo = Math.min(lo, d); hi = Math.max(hi, d); }
    bulge = Math.max(bulge, c - lo, hi - c);
  }
}
check('the cut face stays a flat face while the half slumps (within 0.15 m of its plane)', bulge < 0.15, `${bulge.toFixed(3)} m`);

const t0 = performance.now(), bench = JellyBody.dome(r * shape.x, r * shape.y);
const [h1, h2] = bench.cut([0, 0, 0], [0, 0, 1]);
for (let i = 0; i < 60; i++) { h1.step(dt); h2.step(dt); h1.fill(pos, nor); h2.fill(pos, nor); }
const ms = (performance.now() - t0) / 60;
check('a sliced body costs under 3 ms a frame here (both halves, stepped and filled)', ms < 3, `${ms.toFixed(2)} ms`);

console.log(failed ? `\n✗ jelly: ${failed} failed, ${passed} passed` : `✔ jelly: ${passed} checks (${ms.toFixed(2)} ms a frame for a sliced body)`);
process.exit(failed ? 1 : 0);
