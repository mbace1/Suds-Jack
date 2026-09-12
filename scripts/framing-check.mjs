#!/usr/bin/env node
// framing-check.mjs — the camera frames the fight and never loses it (v247).
// Bare node. The portrait preset's ray, both aspects, and the rules the
// framing promises: a spawn on the rim keeps the whole arena in view; a tight
// fight pulls the camera in to the dolly floor and no further; every point
// that matters stays inside the frustum margins at whatever distance it
// picked; at full-out the view IS the fixed one; the ease never overshoots.
import { basis, frameTarget, easeToward, allInside, FRAMING_DEFAULTS } from '../toko-drop/js/framing.js';

let checks = 0, fails = 0;
const ok = (n, c, info = '') => { checks++; if (!c) { fails++; console.error(`✘ ${n} ${info}`); } else console.log(`  ok   ${n}`); };
const REST = { x: 0, y: 27, z: 21 }, LOOK = { x: 0, z: -3 }, TAN = Math.tan(Math.PI / 6);
const HX = 11, HZ = 18;
for (const aspect of [9 / 16, 16 / 9]) {
  const B = basis(REST, { x: LOOK.x, y: 0, z: LOOK.z });
  const R = { restLook: LOOK, B, aspect, tanHalf: TAN };
  const tag = aspect < 1 ? 'portrait' : 'landscape';
  const rim = [{ x: -HX, z: -HZ }, { x: HX, z: -HZ }, { x: -HX, z: HZ }, { x: HX, z: HZ }, { x: 0, z: 0 }];
  const a = frameTarget(rim, false, R);
  ok(`${tag}: bodies on every corner → the fixed view (rest distance, rest look)`, Math.abs(a.dist - B.restDist) < 1e-6 && a.look.x === LOOK.x && a.look.z === LOOK.z, JSON.stringify(a));
  const tight = [{ x: 0, z: 2 }, { x: 1, z: 3 }, { x: -1, z: 1.5 }, { x: 0.5, z: 2.5 }];
  const t = frameTarget(tight, false, R);
  ok(`${tag}: a tight fight pulls the camera to the dolly floor and no further`, Math.abs(t.dist - B.restDist * (1 - FRAMING_DEFAULTS.dollyMax)) < 1e-6, `dist=${t.dist.toFixed(2)} floor=${(B.restDist * 0.65).toFixed(2)}`);
  ok(`${tag}: …and every point of it is inside the frame there`, allInside(tight, t.look, B, t.dist, aspect, TAN, 0.96, 0.93));
  const corner = [{ x: 7, z: 12 }, { x: 9, z: 14 }, { x: 8, z: 13 }];
  const c = frameTarget(corner, false, R);
  ok(`${tag}: a fight in a corner is looked AT (the look point moves toward it) and stays in frame`, c.look.x > 3 && c.look.z > 5 && allInside(corner, c.look, B, c.dist, aspect, TAN, 0.96, 0.93), JSON.stringify(c));
  const wide = [{ x: -9, z: -14 }, { x: 9, z: 14 }, { x: 0, z: 0 }];
  const w = frameTarget(wide, false, R);
  // (portrait's rest is a FIXED framing, not a fit — a box the rest view cannot
  // hold stays at rest, which is the rule "never further out than rest")
  ok(`${tag}: a fight across the arena sits between floor and rest — and if the camera came in at all, all of it is in frame`, w.dist > B.restDist * 0.65 - 1e-6 && w.dist <= B.restDist + 1e-6 && (w.dist >= B.restDist - 1e-6 || allInside(wide, w.look, B, w.dist, aspect, TAN, 0.96, 0.93)), `dist=${w.dist.toFixed(2)} rest=${B.restDist.toFixed(2)}`);
  ok(`${tag}: a pending spawn keeps the whole arena in view`, Math.abs(frameTarget(tight, true, R).dist - B.restDist) < 1e-6);
  ok(`${tag}: the player alone frames nothing (the title never zooms)`, Math.abs(frameTarget([{ x: 0, z: 15 }], false, R).dist - B.restDist) < 1e-6);
  ok(`${tag}: disabled → the fixed view`, Math.abs(frameTarget(tight, false, R, { ...FRAMING_DEFAULTS, enabled: false }).dist - B.restDist) < 1e-6);
}
{ const B = basis(REST, { x: 0, y: 0, z: -3 }); const cur = { dist: B.restDist, look: { x: 0, z: -3 } }; const tgt = { dist: B.restDist * 0.65, look: { x: 4, z: 2 } };
  let last = cur.dist, mono = true; for (let i = 0; i < 120; i++) { easeToward(cur, tgt, 1 / 60, FRAMING_DEFAULTS.ease); if (cur.dist > last + 1e-9) mono = false; last = cur.dist; }
  ok('the ease approaches monotonically and lands within 2% in two seconds', mono && Math.abs(cur.dist - tgt.dist) < tgt.dist * 0.02 && Math.abs(cur.look.x - 4) < 0.1, `dist=${cur.dist.toFixed(2)} want=${tgt.dist.toFixed(2)}`); }
{ const B = basis(REST, { x: 0, y: 0, z: -3 }); const R = { restLook: LOOK, B, aspect: 9 / 16, tanHalf: TAN }; const pts = [{ x: 1, z: 2 }, { x: -2, z: 5 }];
  const a = frameTarget(pts, false, R), b = frameTarget(pts, false, R); ok('deterministic', a.dist === b.dist && a.look.x === b.look.x && a.look.z === b.look.z); }
{ const B = basis(REST, { x: 0, y: 0, z: -3 }); const inn = { dist: B.restDist * 0.65, look: { x: 0, z: -3 } }, out = { dist: B.restDist, look: { x: 0, z: -3 } };
  const c = { dist: B.restDist * 0.65, look: { x: 0, z: -3 } }; for (let i = 0; i < 30; i++) easeToward(c, out, 1 / 60, 2.0, 5.0);
  const back = (c.dist - inn.dist) / (out.dist - inn.dist);
  ok('coming OUT for a spawn is urgent: 90% of the way back to rest inside half a second', back > 0.9, `back=${(back * 100).toFixed(0)}%`); }
console.log(`\n${checks - fails} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
