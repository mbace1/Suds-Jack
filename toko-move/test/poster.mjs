// THE POSTER's rules in bare node (js/poster.js, and the trail in js/week.js):
// the trail is kept, thinned and survives a clock-out; the poster's frame
// fits every point of the week inside it and keeps the city's shape.
//
//   node toko-move/test/poster.mjs
import * as P from '../js/poster.js';
import * as W from '../js/week.js';

let pass = 0, fail = 0;
const ok = (c, m, x = '') => { if (c) pass++; else { fail++; console.log(`  FAIL ${m}${x ? ' — ' + x : ''}`); } };
const mem = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

// ── the trail ───────────────────────────────────────────────────────────
const long = Array.from({ length: 900 }, (_, i) => [60.16 + i * 1e-5, 24.93 + i * 2e-5]);
const t = W.thin(long);
ok(t.length === W.TRAIL_MAX, `a long trail is thinned to ${W.TRAIL_MAX} points`);
ok(t[0] === long[0] && t[t.length - 1] === long[long.length - 1], 'keeping where the day started and ended');
ok(W.thin([[1, 2], null, [NaN, 3], [4, 5]]).length === 2, 'and dropping anything that is not a point');
{ const s = mem(); let w = W.resume(s, () => 0.5); W.begin(w); W.progress(w, { score: 300, results: ['ok'], trail: long.slice(0, 40) }); W.saveWeek(w, s);
  w = W.resume(s); ok(w.shifts[0].trail.length === 40 && w.shifts[0].left, 'a shift left half-way keeps the line it had drawn');
  W.begin(w); W.close(w, { score: 900, results: ['ok', 'ok', 'ok'], trail: long }); ok(w.shifts[1].trail.length === W.TRAIL_MAX, 'and a finished one keeps its thinned line');
  ok(JSON.stringify(w).length < 30000, `five days of lines stay small in the save (${JSON.stringify(w).length} bytes for two)`); }

// ── the frame ───────────────────────────────────────────────────────────
const week = { seed: 7, shifts: [{ trail: long.slice(0, 300) }, { trail: [[60.20, 24.90], [60.21, 24.99]] }] };
const box = P.bounds(week, []);
ok(box && box.s < 60.16 && box.n > 60.21 && box.w < 24.90 && box.e > 24.99, 'the box holds every point of every day, with room');
const frame = { x: 70, y: 230, w: 940, h: 760 }, pr = P.projector(box, frame);
const all = week.shifts.flatMap(s => s.trail).map(([a, b]) => pr(a, b));
ok(all.every(q => q.x >= frame.x - 0.5 && q.x <= frame.x + frame.w + 0.5 && q.y >= frame.y - 0.5 && q.y <= frame.y + frame.h + 0.5), 'every point lands inside the frame');
// shape: 1 km east and 1 km north are the same length on the poster
const lat0 = 60.18, k = Math.cos(lat0 * Math.PI / 180), o = pr(lat0, 24.95), e = pr(lat0, 24.95 + 1 / (111.32 * k)), n = pr(lat0 + 1 / 111.32, 24.95);
ok(Math.abs(Math.hypot(e.x - o.x, e.y - o.y) / Math.hypot(n.x - o.x, n.y - o.y) - 1) < 0.01, 'a kilometre east is a kilometre north — the city keeps its shape');
ok(P.bounds({ shifts: [] }, [{ path: [[60.1, 24.9], [60.2, 25.0]] }]) !== null, 'a week with no movement still has a map to draw: the lines');
ok(P.DAY_COLOURS.length === 5 && new Set(P.DAY_COLOURS).size === 5, 'five days, five colours');

console.log(`poster: ${pass} checks passed${fail ? `, ${fail} FAILED` : ''}`);
process.exit(fail ? 1 : 0);
