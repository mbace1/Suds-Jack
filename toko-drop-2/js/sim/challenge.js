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
import { TUNING } from '../tuning.js?v=38';
import { levelShape, KIND } from './shape.js?v=38';
import * as pickups from './pickups.js?v=38';
import * as rules from './rules.js?v=38';

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
    Z.inside = !!h?.alive && Math.hypot(h.x - Z.x, h.z - Z.z) < Z.r;
    if (Z.inside) Z.fill = Math.min(G.need, Z.fill + dt);
    ch.n = Z.fill;
  }

  // PROTECT: a body on the heart bites it; a gel's bullet that reaches it lands
  if (ch.heart) {
    const H = ch.heart;
    if (H.cd > 0) H.cd -= dt;
    if (H.cd <= 0) for (const g of w.gels ?? []) {
      if (!g.alive || g.state !== 'active' || Math.hypot(g.x - H.x, g.z - H.z) > g.r + H.r) continue;
      hurtHeart(w, H, 1); H.cd = C.heart.bite; break;
    }
    for (const b of w.bullets ?? []) if (!b.hero && !b.dead && Math.hypot(b.x - H.x, b.z - H.z) < b.r + H.r) { b.dead = true; hurtHeart(w, H, 1); }
  }

  // COLLECT: the orbs come out on their times; walking over one takes it
  if (ch.orbs) for (const o of ch.orbs) {
    if (!o.out && o.t <= ch.t + 1e-9) { o.out = true; w.events.push({ type: 'orb', i: o.i, x: o.x, z: o.z }); }
    if (o.out && !o.taken && h?.alive && Math.hypot(h.x - o.x, h.z - o.z) < C.orb.reach + T.hero.radius) {
      o.taken = true; ch.n++; w.events.push({ type: 'chStep', what: 'orb', x: o.x, z: o.z, n: ch.n, of: ch.of });
    }
  }

  if (G.type === 'combo') {
    if (ch.arcade) { if (w.streak < ch.prev) ch.base = 0; ch.prev = w.streak; ch.n = Math.max(0, w.streak - ch.base); ch.best = Math.max(ch.best, ch.n); }
    else { ch.best = Math.max(ch.best, w.streak); ch.n = ch.best; }
  }
  return ch.arcade ? trialStep(w, api) : outcome(w);
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

// ── THE ARCADE'S CHALLENGE WAVES (v36, CAMPAIGN_PLAN.md step 4) ────────
// The campaign's goals asked of an arcade wave: from wave TUNING.waves.trial
// `from`, every `every`th wave carries one on top of its bodies — dash the
// gates, hold the ring, collect the orbs, a streak, protect the heart. It is
// a bonus, never a fail: met, it pays `bonus` × the wave and drops a pod;
// missed, nothing (HARDCADE too). Its draws come from its own dice, so the
// waves' own schedule replays exactly as it did without it.
export const TRIALS = ['gates', 'hold', 'collect', 'combo', 'protect'];
// A world of its own (v37) asks its SIGNATURE — TUNING.worlds.list `trial` —
// on every challenge wave in it; the first world, and the last, go round them all.
export function trialFor(wave, seed, world = 1) {
  const Q = T.waves.trial;
  if (!Q.on || wave < Q.from || (wave - Q.from) % Q.every !== 0) return null;
  return T.worlds.list[world - 1]?.trial ?? TRIALS[(Math.floor((wave - Q.from) / Q.every) + (seed >>> 0)) % TRIALS.length];
}
export function startTrial(w, kind, rng) {
  const Q = T.waves.trial, K = Q[kind], R = () => rng.next();
  // a world that closes in for its challenge (v37, `squeeze`): the walls come in
  // while it runs and go back when it ends, and what it puts down is inside them
  const k = T.worlds.modes.includes(w.mode) ? T.worlds.list[(w.world || 1) - 1]?.squeeze : null;
  if (k && !w.squeeze) squeezeTo(w, { hx: w.hx * k, hz: w.hz * k }, { hx: w.hx, hz: w.hz });
  const hx = w.squeeze?.to.hx ?? w.hx, hz = w.squeeze?.to.hz ?? w.hz;
  const at = (frac) => { const a = R() * Math.PI * 2, r = frac * (0.4 + 0.6 * R()); return { x: Math.cos(a) * hx * r, z: Math.sin(a) * hz * r }; };
  const goal = { type: kind };
  const ch = w.ch = { goal, mods: {}, arcade: true, kind, t: 0, limit: K.limit, done: false, n: 0, of: 0, best: 0, esc: 1, escN: 0, lit: null, gates: [], wave: w.wave };
  ch.onGate = onGate;
  if (kind === 'gates' && w.pk) { for (let i = 0; i < K.count; i++) { const p = at(0.7); pickups.placeGate(w, p.x, p.z, R() * Math.PI); } ch.of = K.count; }
  if (kind === 'hold') { const p = at(0.5); goal.need = K.need; goal.zone = { drift: true }; ch.zone = { x: p.x, z: p.z, x0: p.x, z0: p.z, r: K.r, orbit: null, fill: 0, inside: false }; ch.of = K.need; }
  if (kind === 'collect') { goal.orbs = Array.from({ length: K.count }, (_, i) => ({ t: i * K.every, ...at(0.8) })); ch.orbs = goal.orbs.map((o, i) => ({ ...o, i, out: false, taken: false })); ch.of = K.count; }
  if (kind === 'combo') { goal.streak = K.streak + Math.floor(w.wave * K.perWave); ch.of = goal.streak; ch.base = w.streak; ch.prev = w.streak; }
  if (kind === 'protect') { ch.heart = { x: 0, z: 0, r: K.r, hp: K.hp, max: K.hp, cd: 0 }; }
  w.events.push({ type: 'trial', kind, wave: w.wave, of: ch.of, limit: ch.limit });
}
// a trial's end: met (bonus + a pod where it was met), or missed
function trialStep(w) {
  const ch = w.ch, G = ch.goal;
  let met = false;
  switch (G.type) {
    case 'gates': case 'collect': met = ch.n >= ch.of; break;
    case 'hold': met = ch.zone.fill >= G.need; break;
    case 'combo': met = ch.best >= G.streak; break;
    case 'protect': met = ch.t >= ch.limit && ch.heart.hp > 0; break;
  }
  if (met) { endTrial(w, true); return null; }
  if (ch.t >= ch.limit || (ch.heart && ch.heart.hp <= 0)) endTrial(w, false);
  return null;
}
export function endTrial(w, met) {
  const ch = w.ch;
  if (!ch?.arcade || ch.done) return;
  ch.done = true;
  const bonus = met ? T.waves.trial.bonus * ch.wave : 0;
  if (met) { w.score += bonus; if (w.hero) pickups.reward(w, w.hero.x, w.hero.z); }
  w.events.push({ type: 'trialEnd', kind: ch.kind, met, bonus });
  w.ch = null;
  if (w.squeeze && !w.squeeze.back) squeezeTo(w, w.squeeze.home, w.squeeze.home, true);
}

// The walls closing in and going back out (v37): SURVIVAL's reshape
// (sim/reshape.js), the same events so the view draws it the same way — the
// floor lights where it is about to go, then the walls move and carry
// whatever stands in their way.
function squeezeTo(w, to, home, back = false) {
  const S = T.waves.trial.squeeze;
  w.squeeze = { phase: 'warn', t: 0, from: { hx: w.hx, hz: w.hz }, to, home, back, world: w.world };
  w.events.push({ type: 'reshapeWarn', hx: to.hx, hz: to.hz, from: w.squeeze.from, t: S.warn });
}
export function squeezeStep(w, dt) {
  const Z = w.squeeze, S = T.waves.trial.squeeze;
  if (!Z) return;
  if (Z.world !== w.world) { w.squeeze = null; return; }   // the world went down its drain: its walls went with it
  Z.t += dt;
  if (Z.phase === 'warn' && Z.t >= S.warn) { Z.phase = 'move'; Z.t = 0; w.events.push({ type: 'reshape', hx: Z.to.hx, hz: Z.to.hz }); }
  else if (Z.phase === 'move') {
    const u = Math.min(1, Z.t / S.move), e = 1 - (1 - u) * (1 - u) * (1 - u);
    w.hx = Z.from.hx + (Z.to.hx - Z.from.hx) * e; w.hz = Z.from.hz + (Z.to.hz - Z.from.hz) * e;
    if (u >= 1) {
      w.hx = Z.to.hx; w.hz = Z.to.hz; Z.phase = 'hold';
      w.events.push({ type: 'reshaped', hx: w.hx, hz: w.hz });
      if (Z.back) w.squeeze = null;
    }
  }
}

// is the room won, lost or going on (null)
function outcome(w) {
  const ch = w.ch, G = ch.goal, d = w.dir;
  if (ch.mods.flawless && (w.hits || 0) > 0) { ch.why = 'hit'; return 'dead'; }
  if (ch.heart && ch.heart.hp <= 0) { ch.why = 'heart'; return 'dead'; }
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
  if (d.t >= d.duration - 1e-9) { if (TIMED.has(G.type)) { ch.why = 'clock'; return 'fail'; } return 'clear'; }
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
