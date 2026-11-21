// campaign.js — a CAMPAIGN room (1.x v237 playLevel, v263-v265 campaign): an
// authored level played on its own clock. Its bodies arrive at the times and
// places the level gives them; the room ends on its clock, or the moment its
// goal is met (a quota) or broken (a hit in a flawless room), and is graded.
//
// The room comes in as createWorld's `room`: { id, goal, kills, level } with
// `level` the parsed levels/<id>.json and `turn` true when a portrait screen
// lays it along its length (x and z swap; sim/shape.js levelShape does the
// same to its region). It ends with
//   roomEnd  { id, outcome: 'clear' | 'dead' | 'fail', grade, kills, hits, time, score, value, why }
// `why` says what an F was: 'died', 'hit' (a no-hits room), 'heart', 'clock', 'score' (cleared under C).
// and w.over, as a death does. What the room ASKS — its goal and its mods —
// is sim/challenge.js (CAMPAIGN_PLAN.md); `fail` is a room whose clock ran
// out on a goal it did not meet. Every number is TUNING.campaign.
import { kindOf } from '../species/bosskit.js?v=159';
import { BOSS_KINDS } from '../../tuning/bosskinds.js?v=159';
import { holdRoom } from '../bossfight.js?v=159';
import { fairPoint } from '../fairspawn.js?v=159';
import { TUNING } from '../../tuning.js?v=159';
import * as challenge from '../challenge.js?v=159';
import * as heat from '../heat.js?v=159';

const T = TUNING, C = T.campaign, ORDER = ['F', 'D', 'C', 'B', 'A', 'S'];   // v157: D, a clear under C

// the bodies a room offers (pickups are not bodies)
export const roomBodies = (level) => level.spawns.filter((s) => s.kind !== 'pickup').length;

// the grade (v51): a room is graded on its SCORE. Anything but a clear is F
// (dying, the heart, the orbs, the clock on a goal); a clear is graded
// against the room's score lines. v157 (owner, 19 Nov: "F likely for first 2 or so tries, the D and C.. only after
// really great runs should get B, A, and really practice gets you an S"): a clear under C is a D, where it was an F
// (2026-10-27's "F is a small but still challenging score"), so F is the tries that did not get through, D is
// getting through, and the lines above it are the climb.
export function grade(room, level, result) {
  if (result.outcome !== 'clear') return 'F';
  const L = tiersFor(room, level), s = result.score ?? 0;
  return s >= L.S ? 'S' : s >= L.A ? 'A' : s >= L.B ? 'B' : s >= L.C ? 'C' : 'D';
}

// the lines a room is graded against, in points (the room card shows them):
// its level's tiers from bot play (a HARD room its own), else lines at
// TUNING.campaign.scoreRate points a second of its clock
export function tiersFor(room, level) {
  if (room?.hard && level.tiersHard) return level.tiersHard;   // a HARD room's own lines (v49)
  if (level.tiers?.C != null) return level.tiers;
  const D = level.duration, R = C.scoreRate;
  return { S: D * R.S, A: D * R.A, B: D * R.B, C: D * R.C };
}
// The grade a room's score stands at while it runs, and the next line up with
// the points still to find for it (the HUD reads it)
export function onCourse(w) {
  const R = w.room;
  if (!R || !w.dir) return null;
  const H = tiersFor(R, R.level), s = w.score + (w.pot || 0);
  // (under C a run still going is on course for a D: through the room is a D, v157)
  const at = ['S', 'A', 'B', 'C'].find((g) => s >= H[g]) ?? 'D';
  const up = { D: 'C', C: 'B', B: 'A', A: 'S' }[at];
  return { grade: at, next: up ?? null, need: up ? H[up] - s : 0 };
}

export const better = (a, b) => ORDER.indexOf(a) > ORDER.indexOf(b);

// the rooms in play order, which is also the order they open in
export function rooms() {
  const out = [];
  C.worlds.forEach((wd, wi) => wd.rooms.forEach((r, ri) => out.push({ ...r, goal: r.goal ?? 'survive', world: wi, index: out.length, first: ri === 0 })));
  return out;
}
// a room is open when the one before it has a grade above F. A HARD room
// (v49) also needs its own room cleared on the normal route (`normal`, that
// route's progress): you play a room before you play it hard
const passed = (progress, id) => { const g = progress?.[id]?.grade; return !!g && g !== 'F'; };
export function isOpen(i, progress, normal = null) {
  if (normal && !passed(normal, rooms()[i]?.id)) return false;
  return i === 0 || passed(progress, rooms()[i - 1]?.id);
}

export default {
  create(w, api) {
    const R = w.room, L = R.level;
    const queue = L.spawns.filter((s) => s.kind !== 'pickup' && challenge.speciesOf(s.type))
      .map((s, i) => ({ t: s.t, kind: challenge.speciesOf(s.type), x: R.turn ? s.pz : s.px, z: R.turn ? s.px : s.pz, speedMult: s.speedMult ?? 1, intervalMult: s.intervalMult ?? 1, boss: !!s.boss, elite: !!s.elite, order: s.order, hp: s.hp, i }))
      .sort((a, b) => a.t - b.t || a.i - b.i);
    const d = { queue, t: 0, duration: L.duration, ended: false, endT: 0, childCap: 0 };
    challenge.create(w);
    if (w.ch) w.ch.onGate = challenge.onGate;
    return d;
  },
  step(w, dt, api) {
    const d = w.dir;
    if (d.ended) return;
    d.t += dt;
    w.wave = 1;
    while (d.queue.length && d.queue[0].t <= d.t + 1e-9) {
      const s = d.queue.shift();
      const o = { speedMult: s.speedMult, intervalMult: s.intervalMult, variant: s.elite ? 'elite' : 'normal' };
      if (s.boss) { o.isBoss = true; const S = T.species[s.kind]; o.hp = S.bossHp ?? (S.noHpMult ? S.hp : Math.ceil(S.hp * T.waves.boss.hpMult)); }
      if (s.hp) o.hp = s.hp;   // a room's own number for a body (a boss sized for the room)
      // v159: a STRATEGIC boss is hurt only in its window, so its room gives it its own health (tuning/bosskinds.js)
      if (s.boss && kindOf(w, s.kind) === 'read' && BOSS_KINDS.rooms?.[w.room.id]?.hp) o.hp = BOSS_KINDS.rooms[w.room.id].hp;
      // v157: not on top of the hero, nor just ahead of where it is going (sim/fairspawn.js); a boss as its room put it
      const p = s.boss ? s : fairPoint(w, s.x, s.z);
      const g = api.spawn(w, s.kind, p.x, p.z, o);
      api.clamp(w, g);
      challenge.onSpawn(w, g, s);
    }
    // v159: an ENDURANCE boss's clock (sim/bossfight.js holdRoom): empty, the boss breaks and the room's boss is down
    holdRoom(w, dt, api);
    // the goal and the clock (1.x main.js:11344-11356; sim/challenge.js)
    const outcome = challenge.step(w, dt, api);
    if (outcome) end(w, outcome);
  },
  onKill(w, g) { challenge.onKill(w, g); },
  // the hero died in the room
  onOver(w) { end(w, 'dead'); },
};

export function end(w, outcome) {
  const d = w.dir, R = w.room;
  if (d.ended) return;
  d.ended = true;
  // a room won early pays its seconds left; a heart, the share of it kept;
  // and under BANK the pot is banked (a room lost loses it)
  if (outcome === 'clear') {
    const P = C.points, hard = !!R.hard ? T.revenge.scoreMult : 1;
    if (d.duration - d.t > 1e-6 && challenge.TIMED.has(w.ch?.goal?.type)) w.score += Math.round(Math.floor(d.duration - d.t) * P.timeLeft * hard);
    if (w.ch?.heart) w.score += Math.round(P.heart * Math.max(0, w.ch.heart.hp) / w.ch.heart.max * hard);
    heat.bank(w);
  } else if (w.pot > 0) { w.events.push({ type: 'potLost', n: w.pot }); w.pot = 0; }
  const result = { outcome, kills: w.kills, hits: w.hits || 0, time: Math.round(d.t * 10) / 10, score: w.score };
  result.value = w.score;
  result.why = outcome === 'clear' ? null : w.ch?.why ?? (outcome === 'fail' ? 'clock' : 'died');
  const g = grade(R, R.level, result);
  w.roomResult = { id: R.id, grade: g, ...result };
  w.events.push({ type: 'roomEnd', id: R.id, grade: g, ...result });
  w.over = true;
}
