// challenge.js — what a CAMPAIGN room asks of you (CAMPAIGN_PLAN.md). A room
// is a GOAL — what ends it and the one number it is graded on — plus MODS,
// what it takes away or changes. The room's level file says both:
//
//   "goal": { "type": "survive" }                 last the clock; graded on the share put down
//           { "type": "survive", "metric": "hits" }   …graded on the hits taken (a curtain)
//           { "type": "quota", "kills": 12 }      put down that many; graded on the time
//           { "type": "clear" }                   put down every body; graded on the time
//           { "type": "gates" }                   dash through every gate ("gates" below)
//           { "type": "hold", "need": 12, "zone": { "x", "z", "r", "orbit"? } }
//                                                 stand in the ring until it fills
//           { "type": "protect", "heart": { "x", "z", "r", "hp" } }
//                                                 the heart must live; graded on what it keeps
//           { "type": "order" }                   only the lit body can be hurt, in turn
//           { "type": "hunt", "kind": "cloaker" } put down every one of that kind
//           { "type": "combo", "streak": 12 }     reach that streak
//           { "type": "collect", "orbs": [{ "t", "x", "z" }] }
//           { "type": "boss" }                    put down the boss
//           { "type": "gauntlet", "stages": [{ "at": 0, "rule": "current" }, …] }
//                                                 last the clock while the rule changes
//   "mods": { "flawless": true }   one hit ends the room
//           { "noGun": true }      no gun (the gates, the dash, nothing else)
//           { "dash": "cut" }      the dash cuts, whatever the title says
//           { "ammo": 24 }         this many shots for the room
//           { "escalate": { "every": 10, "speed": 0.15 } }   everything faster every `every` s
//   "gates": [{ "t", "x", "z", "angle", "drift"? }]   1.x's gates, placed by the room
//   "rule": null | "current" | …   the room's own rule instead of its world's
//   arena shapes may MOVE ("orbit", "pulse": sim/shape.js levelShape at a time)
//   "tiers": { "S", "A", "B", "source" }   the graded number's bounds (from bot play)
//
// The sim keeps w.ch and reports
//   chStep   { what, n, of }   progress the HUD reads: a gate, a lit body, an orb
//   heart    { hp, x, z }      the heart was hurt
// Pure: no DOM, no clock, w.rng only.
import { TUNING } from '../tuning.js?v=32';
import { levelShape, KIND } from './shape.js?v=32';
import * as pickups from './pickups.js?v=32';
import * as rules from './rules.js?v=32';

const T = TUNING, C = T.campaign;

// the goals graded on time (lower is better); the rest on a share (higher)
const TIMED = new Set(['quota', 'clear', 'gates', 'hold', 'order', 'hunt', 'combo', 'collect', 'boss']);

// a level's body type: 1.x's name (TUNING.campaign.kinds) or a 2.0 species key
export const speciesOf = (type) => C.kinds[type] ?? (T.species[type] ? type : null);

export const goalOf = (room) => room?.level?.goal ?? { type: room?.goal ?? 'survive', kills: room?.kills };
export const modsOf = (room) => {
  const m = { ...(room?.level?.mods ?? {}) };
  if (room?.goal === 'flawless') m.flawless = true;   // the old form: flawless as the goal
  return m;
};

// what the room's number is and which way is better
export function metricOf(room) {
  const g = goalOf(room);
  if (g.type === 'survive' && g.metric === 'hits') return { name: 'hits', low: true };
  if (g.type === 'protect') return { name: 'heart', low: false };
  if (TIMED.has(g.type)) return { name: 'time', low: true };
  return { name: 'share', low: false };
}

export function create(w) {
  const R = w.room;
  if (!R) return;
  const goal = goalOf(R), mods = modsOf(R), L = R.level, turn = !!R.turn;
  const sw = (p) => (turn ? { ...p, x: p.z, z: p.x } : p);
  const ch = w.ch = { goal, mods, t: 0, done: false, n: 0, of: 0, best: 0, esc: 1, escN: 0, lit: null };
  w.gun = { off: !!mods.noGun || mods.dash === 'only', ammo: mods.ammo ?? Infinity };
  // the gates come on the room's clock, wherever it puts them
  ch.gates = (L.gates ?? []).map((g) => sw(g)).sort((a, b) => a.t - b.t);
  if (ch.gates.length) w.pk.on = true;
  if (goal.type === 'gates') ch.of = ch.gates.length;
  if (goal.type === 'collect') { ch.orbs = (goal.orbs ?? []).map((o, i) => ({ ...sw(o), i, out: false, taken: false })); ch.of = ch.orbs.length; }
  if (goal.type === 'hold') { const z = sw(goal.zone ?? {}); ch.zone = { x: z.x ?? 0, z: z.z ?? 0, x0: z.x ?? 0, z0: z.z ?? 0, r: z.r ?? 3, orbit: z.orbit ?? null, fill: 0, inside: false }; ch.of = goal.need; }
  if (goal.type === 'protect') { const H = sw(goal.heart ?? {}); ch.heart = { x: H.x ?? 0, z: H.z ?? 0, r: H.r ?? 1.4, hp: H.hp ?? 10, max: H.hp ?? 10, cd: 0 }; }
  if (goal.type === 'hunt') ch.of = goal.kills ?? L.spawns.filter((s) => speciesOf(s.type) === speciesOf(goal.kind)).length;
  if (goal.type === 'quota') ch.of = goal.kills;
  if (goal.type === 'combo') ch.of = goal.streak;
  if (goal.type === 'order') ch.of = L.spawns.filter((s) => s.kind !== 'pickup').length;
  // a moving floor: the region is rebuilt from the level at the room's time
  ch.moving = !!w.region && (L.arena?.shapes ?? []).some((s) => s.orbit || s.pulse);
  if (goal.type === 'gauntlet') { ch.stages = goal.stages ?? []; ch.stage = -1; }
}

// the room's region at time t (a moving floor)
export function regionAt(w, t) { return levelShape(w.room.level, !!w.room.turn, t); }

// before the bodies step, after the director has spawned this step's arrivals
export function step(w, dt, api) {
  const ch = w.ch;
  if (!ch) return null;
  ch.t += dt;
  const h = w.hero, G = ch.goal, M = ch.mods;

  // the floor moves
  if (ch.moving) w.region.setShape(regionAt(w, ch.t));

  // the gates the room places, on its clock
  while (ch.gates.length && ch.gates[0].t <= ch.t + 1e-9) {
    const g = ch.gates.shift();
    pickups.placeGate(w, g.x, g.z, g.angle ?? 0, !!g.drift);
  }

  // everything faster, every so often
  if (M.escalate) {
    const n = Math.floor(ch.t / M.escalate.every);
    if (n > ch.escN) {
      const k = (1 + M.escalate.speed * n) / ch.esc;
      ch.escN = n; ch.esc = 1 + M.escalate.speed * n;
      for (const g of w.gels) if (g.alive) g.speedMult *= k;
      w.events.push({ type: 'chStep', what: 'faster', n, of: 0 });
    }
  }

  // the gauntlet's stages: the rule changes on its clock
  if (ch.stages) {
    let s = ch.stage;
    while (s + 1 < ch.stages.length && ch.stages[s + 1].at <= ch.t + 1e-9) s++;
    if (s !== ch.stage) { ch.stage = s; rules.setKind(w, ch.stages[s].rule ?? null); w.events.push({ type: 'chStep', what: 'stage', n: s + 1, of: ch.stages.length }); }
  }

  // ORDER: the lowest-numbered live body is lit; the rest cannot be hurt
  if (G.type === 'order') {
    let lit = null;
    for (const g of w.gels) if (g.alive && g.order != null && (!lit || g.order < lit.order)) lit = g;
    for (const g of w.gels) if (g.order != null) g.locked = g !== lit;
    if (lit && ch.lit !== lit.id) { ch.lit = lit.id; w.events.push({ type: 'chStep', what: 'lit', id: lit.id, n: ch.n, of: ch.of }); }
  }

  // HOLD: the ring moves on its orbit; standing in it fills it
  if (ch.zone) {
    const Z = ch.zone, O = Z.orbit;
    if (O) { const a = (O.phase ?? 0) + (ch.t / O.period) * Math.PI * 2; Z.x = Z.x0 + Math.cos(a) * O.r; Z.z = Z.z0 + Math.sin(a) * O.r; }
    if (w.rule?.kind === 'current' && G.zone?.drift) { const Rc = C.rules.current; Z.x += Math.cos(w.rule.angle) * Rc.speed * Rc.playerMult * dt; Z.z += Math.sin(w.rule.angle) * Rc.speed * Rc.playerMult * dt; clampPoint(w, Z, Z.r); }
    Z.inside = h.alive && Math.hypot(h.x - Z.x, h.z - Z.z) < Z.r;
    if (Z.inside) Z.fill = Math.min(G.need, Z.fill + dt);
    ch.n = Z.fill;
  }

  // PROTECT: a body on the heart bites it; a gel's bullet that reaches it lands
  if (ch.heart) {
    const H = ch.heart;
    if (H.cd > 0) H.cd -= dt;
    if (H.cd <= 0) for (const g of w.gels) {
      if (!g.alive || g.state !== 'active' || Math.hypot(g.x - H.x, g.z - H.z) > g.r + H.r) continue;
      hurtHeart(w, H, 1); H.cd = C.heart.bite; break;
    }
    for (const b of w.bullets) if (!b.hero && !b.dead && Math.hypot(b.x - H.x, b.z - H.z) < b.r + H.r) { b.dead = true; hurtHeart(w, H, 1); }
  }

  // COLLECT: the orbs come out on their times; walking over one takes it
  if (ch.orbs) for (const o of ch.orbs) {
    if (!o.out && o.t <= ch.t + 1e-9) { o.out = true; w.events.push({ type: 'orb', i: o.i, x: o.x, z: o.z }); }
    if (o.out && !o.taken && h.alive && Math.hypot(h.x - o.x, h.z - o.z) < C.orb.reach + T.hero.radius) {
      o.taken = true; ch.n++; w.events.push({ type: 'chStep', what: 'orb', x: o.x, z: o.z, n: ch.n, of: ch.of });
    }
  }

  if (G.type === 'combo') { ch.best = Math.max(ch.best, w.streak); ch.n = ch.best; }
  return outcome(w);
}

// a body the room brings in: its order number, and the escalation so far
export function onSpawn(w, g, s) {
  const ch = w.ch;
  if (!ch) return;
  if (ch.goal.type === 'order') { g.order = s.order ?? s.i; g.locked = true; }
  if (ch.esc !== 1) g.speedMult *= ch.esc;
}

export function onKill(w, g) {
  const ch = w.ch;
  if (!ch) return;
  const G = ch.goal;
  if (G.type === 'order' && g.order != null) { ch.n++; w.events.push({ type: 'chStep', what: 'order', n: ch.n, of: ch.of }); }
  if (G.type === 'hunt' && g.kind === speciesOf(G.kind)) { ch.n++; w.events.push({ type: 'chStep', what: 'hunt', n: ch.n, of: ch.of }); }
  if (G.type === 'boss' && g.isBoss) ch.bossDown = (ch.bossDown || 0) + 1;
}

// a gate dashed through (pickups.js)
export function onGate(w) {
  const ch = w.ch;
  if (!ch || ch.goal.type !== 'gates') return;
  ch.n++; w.events.push({ type: 'chStep', what: 'gate', n: ch.n, of: ch.of });
}

// is the room won, lost or going on (null)
function outcome(w) {
  const ch = w.ch, G = ch.goal, d = w.dir;
  if (ch.mods.flawless && (w.hits || 0) > 0) return 'dead';
  if (ch.heart && ch.heart.hp <= 0) return 'dead';
  const all = d.queue.length === 0, live = w.gels.some((g) => g.alive);
  let won = false;
  switch (G.type) {
    case 'quota': won = w.kills >= G.kills; break;
    case 'clear': case 'order': won = all && !live; break;
    case 'gates': won = ch.of > 0 && ch.n >= ch.of; break;
    case 'hold': won = ch.zone.fill >= G.need; break;
    case 'hunt': won = ch.n >= ch.of; break;
    case 'combo': won = ch.best >= G.streak; break;
    case 'collect': won = ch.n >= ch.of; break;
    case 'boss': won = (ch.bossDown || 0) > 0 && !d.queue.some((q) => q.boss) && !w.gels.some((g) => g.alive && g.isBoss); break;   // the boss, not its adds
  }
  if (won) return 'clear';
  if (d.t >= d.duration - 1e-9) return TIMED.has(G.type) ? 'fail' : 'clear';
  return null;
}

// the graded number, from how the room ended
export function measure(w, result) {
  const m = metricOf(w.room), ch = w.ch;
  if (m.name === 'time') return result.time;
  if (m.name === 'hits') return result.hits;
  if (m.name === 'heart') return ch?.heart ? Math.max(0, ch.heart.hp) / ch.heart.max : 1;
  return null;   // a share: the director's own count
}

function hurtHeart(w, H, n) {
  H.hp -= n;
  w.events.push({ type: 'heart', hp: H.hp, max: H.max, x: H.x, z: H.z });
}

function clampPoint(w, p, r) {
  p.x = Math.max(-w.hx + r, Math.min(w.hx - r, p.x));
  p.z = Math.max(-w.hz + r, Math.min(w.hz - r, p.z));
  if (w.region && !w.region.contains(p.x, p.z, r)) { const q = w.region.clamp(p.x, p.z, r, { x: 0, z: 0 }); p.x = q.x; p.z = q.z; }
}

export { KIND };
