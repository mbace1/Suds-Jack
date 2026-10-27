// heat.js — the score's one multiplier (v51, owner 2026-10-27: "a multiplier
// dynamic that allows for better scores with higher risk"; "Heat in general,
// maybe some levels bank … one base one and there may be mutators"). It is
// the game's scoring in every mode, ARCADE and the rooms alike, and it
// replaces 1.x's 100 × streak, which compounded without a ceiling and so
// could not be graded (RUSH_DESIGN.md §3.1 found the same).
//
// HEAT climbs on the risky things — a kill, more for one made close (a dash
// kill is point-blank), a bullet grazed, a room's goal taken — and drains
// once you go quiet for `grace` seconds while there is something to kill,
// faster the hotter it is (an empty floor holds it, v53). A hit
// throws it away. Every point is paid at 1 + floor(heat): ×1 … ×levels.
//
// A room may add MUTATORS (`score: { mutators: [...] }` in its level):
//   bank     points sit in a POT while the heat holds; they are banked when it
//            drains out (or the room is cleared), and a hit loses the pot
//   coldgun  every shot costs heat: the gun is the safe way, and it cools you
//            (Rush's juggle, for a room or two — not the base)
// Pure: no DOM, no clock.
import { TUNING } from '../tuning.js?v=53';

const T = TUNING, H = T.heat;

export const mult = (w) => 1 + Math.min(H.levels - 1, Math.floor(w.heat || 0));
export const has = (w, m) => !!w.mutators?.includes(m);

export function create(w) {
  w.heat = 0; w.heatT = 0; w.pot = 0;
  w.mutators = [...(w.room?.level?.score?.mutators ?? [])];
}

// what a kill is worth in heat: a dash is point-blank, a shot pays by how
// close you stood
export function killHeat(w, g, src) {
  if (src === 'env') return 0;
  if (src === 'dash') return H.kill * H.near.k0;
  const h = w.hero, d = h ? Math.hypot(h.x - g.x, h.z - g.z) : H.near.r1, N = H.near;
  const u = Math.max(0, Math.min(1, (d - N.r0) / (N.r1 - N.r0)));
  return H.kill * (1 + (N.k0 - 1) * (1 - u) ** N.pow);
}

export function gain(w, n) {
  if (!(n > 0) || !w.hero?.alive) return;
  const was = mult(w);
  w.heat = Math.min(H.levels - 1e-6, (w.heat || 0) + n);
  w.heatT = H.grace;
  const m = mult(w);
  if (m > was) w.events.push({ type: 'heat', mult: m, up: true });
}

// points, paid at the heat: into the score, or the pot under BANK
export function pay(w, points, hard = false) {
  const n = Math.round(points * mult(w) * (hard ? T.revenge.scoreMult : 1));
  if (has(w, 'bank')) w.pot += n; else w.score += n;
  return n;
}

// v53: it drains only while there is something on the floor to kill. Through
// a lull — between waves, a floor emptied, bodies not yet down from their
// arrival — it HOLDS: you cannot be out-paced by a lull you did not make (the
// v52 playtest: the arcade's early waves came in small groups with gaps, and
// a whole first minute averaged ×1.02)
export const lull = (w) => !w.gels.some((g) => g.alive && g.state === 'active' && !g.locked);
export function step(w, dt) {
  if (w.heatT > 0) { w.heatT -= dt; return; }
  if (!(w.heat > 0) || lull(w)) return;
  const was = mult(w);
  w.heat = Math.max(0, w.heat - (H.drain + H.drainPer * Math.floor(w.heat)) * dt);
  const m = mult(w);
  if (m < was) w.events.push({ type: 'heat', mult: m, up: false });
  if (w.heat <= 0) bank(w);
}

// BANK: the pot goes into the score
export function bank(w) {
  if (!(w.pot > 0)) return;
  w.score += w.pot;
  w.events.push({ type: 'bank', n: w.pot });
  w.pot = 0;
}

// a hit: the heat is gone, and an unbanked pot with it
export function hit(w) {
  const was = mult(w);
  w.heat = (w.heat || 0) * H.hitKeep; w.heatT = 0;
  if (mult(w) < was) w.events.push({ type: 'heat', mult: mult(w), up: false, hit: true });
  if (w.pot > 0) { w.events.push({ type: 'potLost', n: w.pot }); w.pot = 0; }
}

// COLD GUN: a shot costs heat
export function shot(w) {
  if (!has(w, 'coldgun') || !(w.heat > 0)) return;
  const was = mult(w);
  w.heat = Math.max(0, w.heat - H.coldShot);
  if (mult(w) < was) w.events.push({ type: 'heat', mult: mult(w), up: false });
  if (w.heat <= 0) bank(w);
}
