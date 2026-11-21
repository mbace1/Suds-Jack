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
//            v157, an ENDURANCE boss: + { endure, hold, left, dealt, prev, hits0, hits } and tiers are HITS
//   events   bossDown { kind, grade, time, bonus, tiers }
import { TUNING } from '../tuning.js?v=159';
import { BOSS_TIERS } from '../tuning/bossfights.js?v=159';
import * as pickups from './pickups.js?v=159';
import { endsWorld, endsRun } from './worlds.js?v=159';
import { kindOf } from './species/bosskit.js?v=159';
import { BOSS_KINDS } from '../tuning/bosskinds.js?v=159';

const T = TUNING;
const ORDER = ['S', 'A', 'B', 'C'];

// the lines for this world's headliner; a world the pass has not measured
// (a run started past world 9, a test) borrows the nearest one before it
export function tiersFor(world, kind) {
  for (let k = Math.max(1, world | 0); k >= 1; k--) if (BOSS_TIERS[k]?.[kind]) return BOSS_TIERS[k][kind];
  return null;
}

// v157: the lines are measured with the phases and the kinds on (scripts/boss-tiers.mjs, 19 Nov 2026), so they are
// read as written; v154's `tiers` estimate, which scaled the pre-phase lines, is gone
const linesFor = (w, kind) => tiersFor(w.world ?? 1, kind);

export function start(w, kind) {
  w.fight = { kind, t: 0, seen: false, done: false, tiers: linesFor(w, kind), hp: 0, max: 0, ids: new Map(), x: 0, z: 0 };
  // v157 (tuning/bosskinds.js): an ENDURANCE boss fights on a clock and is graded on the hits you took in it
  if (kindOf(w, kind) === 'endure') {
    const E = BOSS_KINDS.endure;
    Object.assign(w.fight, { endure: true, hold: E.hold[kind] ?? 36, left: E.hold[kind] ?? 36, dealt: 0, prev: new Map(), hits0: w.hits || 0, hits: 0, tiers: { ...E.grade } });
  }
}

export const gradeOf = (tiers, t) => (!tiers ? 'C' : t <= tiers.S + 1e-9 ? 'S' : t <= tiers.A + 1e-9 ? 'A' : t <= tiers.B + 1e-9 ? 'B' : 'C');

// what the HUD shows: the grade the fight is on course for, and the seconds
// that line has left (none past B)
export function onCourse(w) {
  const F = w.fight;
  if (!F || F.done) return null;
  if (F.endure) return { grade: gradeOf(F.tiers, F.hits), left: F.left, hold: true };   // v157: the clock, and the hits
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
    if (!F.ids.has(g.id)) F.ids.set(g.id, g.maxHp ?? g.hp);
    F.x = g.x; F.z = g.z;
  }
  if (alive) F.seen = true;
  F.max = 0; for (const m of F.ids.values()) F.max += m;
  // (the clock out, the boss breaks this step and the fight ends with it)
  if (F.endure && alive) { hp = clock(w, F, api); alive = (w.gels ?? []).filter((g) => g.isBoss && g.alive).length; }
  F.hp = hp;
  if (F.seen && !alive && !w.dir.queue.some((q) => q.boss)) finish(w, F, api);
}

// v157: an ENDURANCE boss's health IS the clock (tuning/bosskinds.js). What the hero's hits took off it since the
// last step (`prev`, what this wrote then) is time off the hold, up to `shave` of it; the rest runs out on its own.
// Its health is written back as the share of the hold that is left, so the bar, its phases (bossphases.js reads
// the health) and the HUD all read the one clock. Empty, the boss breaks: a kill, as if shot down.
function clock(w, F, api) {
  const E = BOSS_KINDS.endure, cap = E.shave * F.hold;
  let hp = 0;
  for (const g of w.gels ?? []) {
    if (!g.isBoss || !g.alive) continue;
    F.dealt += Math.max(0, (F.prev.get(g.id) ?? F.ids.get(g.id)) - g.hp);
  }
  F.hits = (w.hits || 0) - F.hits0;
  F.left = Math.max(0, F.hold - F.t - Math.min(cap, (F.dealt / (F.max || 1)) * cap));
  // a boss of more than one body (the TWIN PRISMS) breaks one body at a time: the hold in equal shares, in the order
  // they came, so the first shatters halfway and the other rages on alone (prism.js) for the rest
  const order = [...F.ids.keys()], n = order.length || 1, gone = F.hold - F.left;
  for (const g of w.gels.slice()) {
    if (!g.isBoss || !g.alive) continue;
    const j = Math.max(0, order.indexOf(g.id)), k = Math.min(1, Math.max(0, 1 - (gone - (F.hold * j) / n) / (F.hold / n)));
    if (k <= 0) { if (api.kill) api.kill(w, g, 'hero'); else g.alive = false; continue; }
    g.hp = Math.max(1, Math.ceil(F.ids.get(g.id) * k));
    F.prev.set(g.id, g.hp); hp += g.hp;
  }
  return hp;
}

// v159: a campaign boss room's ENDURANCE boss — the same clock, kept on w.hold (the room has no w.fight; its own goal,
// the boss down, ends the room). Started the step the boss is first on the floor; the room's own clock is the room's
export function holdRoom(w, dt, api) {
  let H = w.hold;
  const bosses = (w.gels ?? []).filter((g) => g.isBoss && g.alive);
  if (!H) {
    const g = bosses[0];
    if (!g || kindOf(w, g.kind) !== 'endure') return;
    const E = BOSS_KINDS.endure, hold = BOSS_KINDS.rooms?.[w.room?.id]?.hold ?? E.hold[g.kind] ?? 36;
    H = w.hold = { kind: g.kind, endure: true, hold, left: hold, t: 0, dealt: 0, prev: new Map(), ids: new Map(), max: 0, hp: 0, hits0: w.hits || 0, hits: 0 };
  }
  if (H.left <= 0 || !bosses.length) return;
  H.t += dt;
  for (const g of bosses) if (!H.ids.has(g.id)) H.ids.set(g.id, g.maxHp ?? g.hp);
  H.max = 0; for (const m of H.ids.values()) H.max += m;
  H.hp = clock(w, H, api);
}

function finish(w, F, api) {
  F.done = true;
  if (F.endure) F.hits = (w.hits || 0) - F.hits0;
  const grade = gradeOf(F.tiers, F.endure ? F.hits : F.t), share = T.waves.bossFight.share[grade];
  const bonus = Math.round(share * T.waves.bossFight.perWave * (w.dir.wave || 1));
  // (a director test's stand-in world has no score or pop to call: it gets the plain arithmetic)
  if (api.score) api.score(w, bonus); else w.score = (w.score || 0) + bonus;
  if (grade === 'S' || grade === 'A') pickups.reward(w, F.x, F.z);
  // the boss is down, so the wave is: what it brought goes with it
  for (const g of w.gels ?? []) if (g.alive) { if (api.pop) api.pop(w, g); else g.alive = false; }
  for (const b of w.bullets ?? []) if (!b.hero) b.dead = true;
  w.dir.queue.length = 0;
  // v126 (the state audit): a world's boss down, the hero is safe until the floor opens (WORLD CLEAR's hold, then the
  // world change keeps it so) — what the wave left in the air and on the floor (a lob, a puddle, HARDCADE's corpse
  // rings, which still fire) hit the hero under the WORLD CLEAR card, and on a last life ended the run there. Only a
  // boss whose wave ends a world or the run (every boss the arcade fights); a stand-in with the worlds off gets none
  const wave = w.dir.wave || 0;
  if (w.hero && (endsWorld(w, wave) || endsRun(w, wave))) w.hero.grace = Math.max(w.hero.grace || 0, T.waves.worldClear.hold + 1);
  F.grade = grade; F.bonus = bonus;
  w.events.push({ type: 'bossDown', kind: F.kind, grade, time: F.t, bonus, tiers: F.tiers, x: F.x, z: F.z, endure: !!F.endure, hits: F.hits ?? null });
}

export const GRADES = ORDER;
