// bossfight.js — an arcade boss wave fought the way the campaign fights its
// boss rooms (v42; the campaign's 'boss' goal in sim/challenge.js): the fight
// is ON A CLOCK from the wave's start, the boss's health is on screen, and the
// wave is over the moment the last boss is down — whatever it brought with
// it goes with it (bodies and bullets alike, popped, not killed: no score, no
// split, no corpse fire). Then it is graded on the room's terms: S, A, B by
// the seconds it took against lines the bot pass measured (scripts/
// boss-tiers.mjs → tuning/bossfights.js), C past them; the grade pays a share
// of 1000 × the wave, and an S or an A drops a pod where the boss fell.
//
//   w.fight  { kind, t, seen, done, tiers, hp, max, ids, x, z, grade, bonus }
//   events   bossDown { kind, grade, time, bonus, tiers }
import { TUNING } from '../tuning.js?v=66';
import { BOSS_TIERS } from '../tuning/bossfights.js?v=66';
import * as pickups from './pickups.js?v=66';

const T = TUNING;
const ORDER = ['S', 'A', 'B', 'C'];

// the lines for this world's headliner; a world the pass has not measured
// (a run started past world 9, a test) borrows the nearest one before it
export function tiersFor(world, kind) {
  for (let k = Math.max(1, world | 0); k >= 1; k--) if (BOSS_TIERS[k]?.[kind]) return BOSS_TIERS[k][kind];
  return null;
}

export function start(w, kind) {
  w.fight = { kind, t: 0, seen: false, done: false, tiers: tiersFor(w.world ?? 1, kind), hp: 0, max: 0, ids: new Map(), x: 0, z: 0 };
}

export const gradeOf = (tiers, t) => (!tiers ? 'C' : t <= tiers.S + 1e-9 ? 'S' : t <= tiers.A + 1e-9 ? 'A' : t <= tiers.B + 1e-9 ? 'B' : 'C');

// what the HUD shows: the grade the fight is on course for, and the seconds
// that line has left (none past B)
export function onCourse(w) {
  const F = w.fight;
  if (!F || F.done) return null;
  const g = gradeOf(F.tiers, F.t);
  return { grade: g, left: g === 'C' || !F.tiers ? null : F.tiers[g] - F.t };
}

export function step(w, dt, api) {
  const F = w.fight;
  if (!F || F.done) return;
  F.t += dt;
  // its health: every boss of the wave counts, the ones already down at nothing
  let alive = 0, hp = 0;
  for (const g of w.gels ?? []) {
    if (!g.isBoss || !g.alive) continue;
    alive++; hp += Math.max(0, g.hp);
    if (!F.ids.has(g.id)) F.ids.set(g.id, g.maxHp);
    F.x = g.x; F.z = g.z;
  }
  if (alive) F.seen = true;
  F.hp = hp;
  F.max = 0; for (const m of F.ids.values()) F.max += m;
  if (F.seen && !alive && !w.dir.queue.some((q) => q.boss)) finish(w, F, api);
}

function finish(w, F, api) {
  F.done = true;
  const grade = gradeOf(F.tiers, F.t), share = T.waves.bossFight.share[grade];
  const bonus = Math.round(share * T.waves.bossFight.perWave * (w.dir.wave || 1));
  // (a director test's stand-in world has no score or pop to call: it gets the plain arithmetic)
  if (api.score) api.score(w, bonus); else w.score = (w.score || 0) + bonus;
  if (grade === 'S' || grade === 'A') pickups.reward(w, F.x, F.z);
  // the boss is down, so the wave is: what it brought goes with it
  for (const g of w.gels ?? []) if (g.alive) { if (api.pop) api.pop(w, g); else g.alive = false; }
  for (const b of w.bullets ?? []) if (!b.hero) b.dead = true;
  w.dir.queue.length = 0;
  F.grade = grade; F.bonus = bonus;
  w.events.push({ type: 'bossDown', kind: F.kind, grade, time: F.t, bonus, tiers: F.tiers, x: F.x, z: F.z });
}

export const GRADES = ORDER;
