// bosskit.js — what the worlds' own bosses share (v45: CURB KING, MAW,
// BLISTER, KETTLE, PIKE, BERG, ANGLER): their rage. Each fights one way until
// its health falls to `rage.at` of its whole, then — once, only ever up, a
// boss's only — it rages: the banner (`phase`, as OMEGA's act change and the
// TWIN PRISMS' rage are), a shake, and from then on its harder pattern.
// g.s.enraged is what the boss aura reads (render/looks/bossaura.js).
//
// v154 (Decision 15 Nov 2026, "Bosses are multi-wave fights"): where
// tuning/bossphases.js has the boss and the mode, the one rage is THREE PHASES
// instead (phases() below); `rage()` still answers "is it raging", so each
// boss's own code reads as it did. The phase's numbers come in through
// api.S(g) (sim/world.js), which hands a phased boss its own merged tuning.
import { TUNING } from '../../tuning.js?v=156';
import { BOSS_PHASES } from '../../tuning/bossphases.js?v=156';

// the phases this boss fights in, or null (the v153 rage): only a boss, only in
// the modes the switch names (and the campaign's rooms only with `campaign`)
export function phaseSpec(w, kind) {
  const P = BOSS_PHASES, B = P.bosses[kind];
  if (!P.on || !B) return null;
  if (w.mode === 'campaign' ? !P.campaign : !P.modes.includes(w.mode)) return null;
  return B;
}

// `b` laid over `a`, a new object: objects merged key by key, anything else (an
// array, a number) replaced
export function overlay(a, b) {
  if (!b) return a;
  const o = { ...a };
  for (const k of Object.keys(b)) {
    const v = b[k];
    o[k] = v && typeof v === 'object' && !Array.isArray(v) && a?.[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) ? overlay(a[k], v) : v;
  }
  return o;
}

function enter(w, g, B, i, api) {
  const s = g.s, ph = B.phases[i], P = BOSS_PHASES;
  s.phase = i; s.since = w.time;
  let S = TUNING.species[g.kind];
  for (let k = 1; k <= i; k++) S = overlay(S, B.phases[k].set);
  s.phS = S;
  const pace = ph.pace ?? s.pace ?? 1;
  if (pace !== s.pace) { g.speedMult *= pace / s.pace; g.fireMult *= s.pace / pace; s.pace = pace; }
  s.enraged = !!ph.rage;
  w.events.push({ type: 'phase', id: g.id, kind: g.kind, phase: i + 1, x: g.x, z: g.z, label: ph.label, dur: P.banner, shake: P.shake });
  w.events.push({ type: 'shake', amount: P.shake, id: g.id, kind: g.kind, x: g.x, z: g.z });
  // the world's own gel comes to it, round the edge of the floor, away from the hero
  const A = ph.adds;
  if (A && api) {
    const n = Math.min(A.n, api.childrenAllowed(w));
    for (let k = 0; k < n; k++) {
      const p = api.ringPoint(w, w.rng.next() * Math.PI * 2, 0.85, 5);
      api.spawn(w, A.kind, p.x, p.z, { child: true, speedMult: s.wave?.speed ?? 1, intervalMult: s.wave?.interval ?? 1 });
    }
  }
}

// a phased boss's step: into the next phase when its health (or the clock)
// says so, only ever up. True while the phase it is in rages
function phases(w, g, B, api) {
  const s = g.s;
  if (s.phase == null) {
    s.phase = 0; s.pace = 1; s.since = w.time; s.phS = TUNING.species[g.kind];
    s.wave = { speed: g.speedMult, interval: g.intervalMult };
  }
  // a phase is not skipped: until it has lasted its `min` (else minPhase) s, the health holds just over the next one's line (a whole point over: on the line counts as crossed)
  const next = B.phases[s.phase + 1];
  if (next && w.time - s.since < (B.phases[s.phase].min ?? BOSS_PHASES.minPhase)) g.hp = Math.max(g.hp, Math.floor(g.maxHp * next.at) + 1);
  // one phase per step: a big hit that crosses two lines enters the next one,
  // whose own hold then lifts the health back to the line after it
  if (next && (g.hp <= g.maxHp * next.at || (next.after != null && w.time - s.since >= next.after))) {
    enter(w, g, B, s.phase + 1, api);
    const after = B.phases[s.phase + 1];
    if (after) g.hp = Math.max(g.hp, Math.floor(g.maxHp * after.at) + 1);
  }
  return !!B.phases[s.phase].rage;
}

export function rage(w, g, S, api) {
  const s = g.s;
  const B = g.isBoss ? (s.spec !== undefined ? s.spec : (s.spec = phaseSpec(w, g.kind))) : null;
  if (B) return phases(w, g, B, api);
  if (s.enraged || !g.isBoss || g.hp > g.maxHp * S.rage.at) return !!s.enraged;
  s.enraged = true;
  w.events.push({ type: 'phase', id: g.id, kind: g.kind, phase: 2, x: g.x, z: g.z, label: S.rage.label, dur: S.rage.banner, shake: S.rage.shake });
  w.events.push({ type: 'shake', amount: S.rage.shake, id: g.id, kind: g.kind, x: g.x, z: g.z });
  return true;
}

export const range = (w, [a, b]) => a + w.rng.next() * (b - a);

// the hero's direction from (x, z), and how far
export function toHero(w, x, z) {
  const dx = w.hero.x - x, dz = w.hero.z - z, d = Math.hypot(dx, dz) || 1e-6;
  return { ux: dx / d, uz: dz / d, d };
}

// a point kept `m` inside the walls
export const inside = (w, x, z, m) => ({ x: Math.max(-w.hx + m, Math.min(w.hx - m, x)), z: Math.max(-w.hz + m, Math.min(w.hz - m, z)) });
