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
// `why` says what an F was: 'died', 'hit' (a no-hits room), 'heart', 'clock'.
// and w.over, as a death does. What the room ASKS — its goal and its mods —
// is sim/challenge.js (CAMPAIGN_PLAN.md); `fail` is a room whose clock ran
// out on a goal it did not meet. Every number is TUNING.campaign.
import { TUNING } from '../../tuning.js?v=38';
import * as challenge from '../challenge.js?v=38';

const T = TUNING, C = T.campaign, ORDER = ['F', 'C', 'B', 'A', 'S'];

// the bodies a room offers (pickups are not bodies)
export const roomBodies = (level) => level.spawns.filter((s) => s.kind !== 'pickup').length;

// the grade (1.x campaignGrade, main.js:4178-4199, generalised): anything but
// a clear is F. A room with `tiers` in its level file grades its own number
// against them (they come from bot play, scripts/room-tiers.mjs); without,
// a share room grades 1.x's way and a timed room on fractions of its clock.
export function grade(room, level, result) {
  if (result.outcome !== 'clear') return 'F';
  const m = challenge.metricOf({ ...room, level });
  if (m.name === 'share') {
    const share = Math.min(1, result.kills / Math.max(1, roomBodies(level))), H = tiersFor(room, level);
    const base = share >= H.S - 1e-9 ? 4 : share >= H.A - 1e-9 ? 3 : share >= H.B - 1e-9 ? 2 : 1;
    return ORDER[Math.max(1, base - (result.hits || 0) * C.hitCost)];
  }
  const v = result.value ?? result.time;
  const tt = tiersFor(room, level);
  if (!tt) {
    // 1.x's quota with no tiers: seconds BEHIND the arrival of the last body the count needs
    const kills = level.goal?.kills ?? room.kills;
    if (result.kills < kills) return 'F';
    const ts = level.spawns.filter((s) => s.kind !== 'pickup').map((s) => s.t).sort((a, b) => a - b);
    const lag = v - (ts[Math.min(ts.length, kills) - 1] ?? 0), Q = C.quotaLag;
    return lag <= Q.S ? 'S' : lag <= Q.A ? 'A' : lag <= Q.B ? 'B' : 'C';
  }
  if (m.low) return v <= tt.S + 1e-9 ? 'S' : v <= tt.A + 1e-9 ? 'A' : v <= tt.B + 1e-9 ? 'B' : 'C';
  return v >= tt.S - 1e-9 ? 'S' : v >= tt.A - 1e-9 ? 'A' : v >= tt.B - 1e-9 ? 'B' : 'C';
}

// the lines a room is graded against, in its own number (the room card shows
// them): its level's tiers, else the defaults; null for 1.x's quota, which
// grades on the lag behind its last needed body and has no fixed lines
export function tiersFor(room, level) {
  const m = challenge.metricOf({ ...room, level });
  if (level.tiers) return level.tiers;
  if (m.name === 'share') return C.share;
  if (m.name === 'time' && (room.goal === 'quota' || level.goal?.type === 'quota')) return null;
  const D = level.duration;
  return m.name === 'time' ? { S: D * C.timeTiers.S, A: D * C.timeTiers.A, B: D * C.timeTiers.B } : m.name === 'hits' ? { S: 0, A: 1, B: 3 } : { S: 1, A: 0.7, B: 0.4 };
}
// The grade a room is ON COURSE for while it runs (the HUD reads it): the
// best one still within reach, and for a timed room the seconds left before
// that line goes. A room graded on a share can still put every body down, so
// it is on course for S less a grade a hit; on hits or the heart, the grade
// those stand at now.
export function onCourse(w) {
  const R = w.room, d = w.dir;
  if (!R || !d) return null;
  const L = R.level, m = challenge.metricOf(R), H = tiersFor(R, L);
  if (!H) return null;
  if (m.name === 'time') {
    for (const g of ['S', 'A', 'B']) if (d.t <= H[g] + 1e-9) return { grade: g, left: H[g] - d.t };
    return { grade: 'C', left: null };
  }
  if (m.name === 'share') return { grade: ORDER[Math.max(1, 4 - (w.hits || 0) * C.hitCost)], left: null };
  const v = m.name === 'hits' ? w.hits || 0 : w.ch?.heart ? Math.max(0, w.ch.heart.hp) / w.ch.heart.max : 1;
  const g = m.low ? (v <= H.S ? 'S' : v <= H.A ? 'A' : v <= H.B ? 'B' : 'C') : (v >= H.S - 1e-9 ? 'S' : v >= H.A - 1e-9 ? 'A' : v >= H.B - 1e-9 ? 'B' : 'C');
  return { grade: g, left: null };
}

export const better = (a, b) => ORDER.indexOf(a) > ORDER.indexOf(b);

// the rooms in play order, which is also the order they open in
export function rooms() {
  const out = [];
  C.worlds.forEach((wd, wi) => wd.rooms.forEach((r, ri) => out.push({ ...r, goal: r.goal ?? 'survive', world: wi, index: out.length, first: ri === 0 })));
  return out;
}
// a room is open when the one before it has a grade above F
export function isOpen(i, progress) {
  if (i === 0) return true;
  const prev = rooms()[i - 1], g = prev && progress[prev.id]?.grade;
  return !!g && g !== 'F';
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
      const g = api.spawn(w, s.kind, s.x, s.z, o);
      api.clamp(w, g);
      challenge.onSpawn(w, g, s);
    }
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
  const result = { outcome, kills: w.kills, hits: w.hits || 0, time: Math.round(d.t * 10) / 10, score: w.score };
  result.value = challenge.measure(w, result);
  result.why = outcome === 'clear' ? null : w.ch?.why ?? (outcome === 'fail' ? 'clock' : 'died');
  const g = grade(R, R.level, result);
  w.roomResult = { id: R.id, grade: g, ...result };
  w.events.push({ type: 'roomEnd', id: R.id, grade: g, ...result });
  w.over = true;
}
