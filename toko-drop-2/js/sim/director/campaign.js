// campaign.js — a CAMPAIGN room (1.x v237 playLevel, v263-v265 campaign): an
// authored level played on its own clock. Its bodies arrive at the times and
// places the level gives them; the room ends on its clock, or the moment its
// goal is met (a quota) or broken (a hit in a flawless room), and is graded.
//
// The room comes in as createWorld's `room`: { id, goal, kills, level } with
// `level` the parsed levels/<id>.json and `turn` true when a portrait screen
// lays it along its length (x and z swap; sim/shape.js levelShape does the
// same to its region). It ends with
//   roomEnd  { id, outcome: 'clear' | 'dead', grade, kills, hits, time, score }
// and w.over, as a death does. Every number is TUNING.campaign.
import { TUNING } from '../../tuning.js?v=26';

const T = TUNING, C = T.campaign, ORDER = ['F', 'C', 'B', 'A', 'S'];

// the bodies a room offers (pickups are not bodies)
export const roomBodies = (level) => level.spawns.filter((s) => s.kind !== 'pickup').length;

// 1.x campaignGrade (main.js:4178-4199), as written
export function grade(room, level, result) {
  if (result.outcome === 'dead') return 'F';
  if (room.goal === 'quota') {
    if (result.kills < room.kills) return 'F';
    const ts = level.spawns.filter((s) => s.kind !== 'pickup').map((s) => s.t).sort((a, b) => a - b);
    const arrived = ts[Math.min(ts.length, room.kills) - 1] ?? 0;
    const lag = result.time - arrived, Q = C.quotaLag;
    return lag <= Q.S ? 'S' : lag <= Q.A ? 'A' : lag <= Q.B ? 'B' : 'C';
  }
  const share = Math.min(1, result.kills / Math.max(1, roomBodies(level))), H = C.share;
  const base = share >= H.S ? 4 : share >= H.A ? 3 : share >= H.B ? 2 : 1;
  return ORDER[Math.max(1, base - (result.hits || 0) * C.hitCost)];
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
    const queue = L.spawns.filter((s) => s.kind !== 'pickup' && C.kinds[s.type])
      .map((s, i) => ({ t: s.t, kind: C.kinds[s.type], x: R.turn ? s.pz : s.px, z: R.turn ? s.px : s.pz, speedMult: s.speedMult ?? 1, intervalMult: s.intervalMult ?? 1, boss: !!s.boss, elite: !!s.elite, i }))
      .sort((a, b) => a.t - b.t || a.i - b.i);
    return { queue, t: 0, duration: L.duration, ended: false, endT: 0, childCap: 0 };
  },
  step(w, dt, api) {
    const d = w.dir, R = w.room;
    if (d.ended) return;
    d.t += dt;
    w.wave = 1;
    while (d.queue.length && d.queue[0].t <= d.t + 1e-9) {
      const s = d.queue.shift();
      const o = { speedMult: s.speedMult, intervalMult: s.intervalMult, variant: s.elite ? 'elite' : 'normal' };
      if (s.boss) { o.isBoss = true; const S = T.species[s.kind]; o.hp = S.bossHp ?? (S.noHpMult ? S.hp : Math.ceil(S.hp * T.waves.boss.hpMult)); }
      const g = api.spawn(w, s.kind, s.x, s.z, o);
      api.clamp(w, g);
    }
    // the goal, then the clock (1.x main.js:11344-11356)
    let outcome = null;
    if (R.goal === 'flawless' && (w.hits || 0) > 0) outcome = 'dead';
    else if (R.goal === 'quota' && w.kills >= R.kills) outcome = 'clear';
    else if (d.t >= d.duration - 1e-9) outcome = 'clear';
    if (outcome) end(w, outcome);
  },
  // the hero died in the room
  onOver(w) { end(w, 'dead'); },
};

export function end(w, outcome) {
  const d = w.dir, R = w.room;
  if (d.ended) return;
  d.ended = true;
  const result = { outcome, kills: w.kills, hits: w.hits || 0, time: Math.round(d.t * 10) / 10, score: w.score };
  const g = grade(R, R.level, result);
  w.roomResult = { id: R.id, grade: g, ...result };
  w.events.push({ type: 'roomEnd', id: R.id, grade: g, ...result });
  w.over = true;
}
