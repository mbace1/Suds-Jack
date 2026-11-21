// bot.mjs — the players the bot passes play with (scripts/room-tiers.mjs
// for the campaign's rooms, scripts/boss-tiers.mjs for the arcade's boss
// waves, scripts/reach.mjs for whole arcade runs): it shoots the nearest body
// it may hurt, keeps its distance, goes for what a room asks, dashes through
// gates and, in a CUT room, through bodies, and gets out of the way of what is
// coming by looking ahead (plan() below). Moved here from room-tiers.mjs in v42
// so the passes play the same game.
import { TUNING as T } from '../js/tuning.js?v=31';
import { strands } from '../js/sim/formation.js?v=160';

// v56 (owner, 2026-10-28: "Better line bots"): every skill looks AHEAD the way
// v55's expert did, because a person reads a bullet's line and a hopper's tell,
// not just how near a thing is (v35-v55's line bots stepped sideways from
// whatever was within three metres, which is how OMEGA took three lives off the
// sharp one in eight seconds and how HARD PAIN's FORGE got an S line of 4.9k).
// What separates them is the human part:
//   react    s before something new (a bullet, a hopper's tell, a lob) is taken in
//   see      the chance it notices a volley at all: everything one source fired
//            from one spot within half a second is caught, or missed, together
//   focus    how many bullets it keeps track of at once: the most urgent ones
//            (soonest to come close); past that, in a dense pattern, some slip by
//   horizon  s it thinks ahead
//   every    sim steps between decisions (60 a second: 3 is 20 decisions a second)
//   jitter   rad its thumb is off by when it moves (or dashes)
//   dashAt   how bad the next moment must look before it reaches for the dash
//   reads    the chance it reads a tell: a hopper's landing, a lob's, a WARDEN's
//            shield, a BULWARK's plate (decided once each)
//   noise    rad its aim is off by;  range  how far it will shoot from;
//   greed    how close it goes in for HEAT when the floor is calm (the campaign only)
//   dark     THE VOID's dark limits what it sees (a body or bullet past the light
//            is not there to it; with nothing in sight it goes looking)
// sharp is a good player, average an ordinary one, rough a first-timer; the
// expert has no human part at all and only measures how far a run can go.
export const SKILLS = {
  sharp: { react: 0.2, see: 0.97, focus: 24, horizon: 0.8, every: 3, jitter: 0.06, dashAt: 6, reads: 1, noise: 0.04, range: 1, greed: 1, dark: true },
  average: { react: 0.4, see: 0.85, focus: 10, horizon: 0.5, every: 6, jitter: 0.2, dashAt: 12, reads: 0.6, noise: 0.14, range: 0.85, greed: 0, dark: true },
  rough: { react: 0.65, see: 0.45, focus: 5, horizon: 0.3, every: 10, jitter: 0.4, dashAt: 40, reads: 0, noise: 0.28, range: 0.7, greed: 0, dark: true },
  // v55: no reaction time, nothing missed, the longest look, and it sees through
  // the dark — it measures how far a run can go, it never sets a line
  expert: { react: 0, see: 1, focus: Infinity, horizon: 0.9, every: 2, jitter: 0, dashAt: 6, reads: 1, noise: 0.02, range: 1, greed: 1 },
};
// v59: four players who PLAY differently, with the good player's hands (sharp's
// limits), so a world that is hard for one way of playing and not the others
// shows as that rather than as the world (scripts/curve.mjs; owner, 2026-10-29:
// "Keep testing with different bots"). They measure; they never set a line.
//   close   plays for HEAT in the arcade too: in close on a small body when the floor is quiet
//   kite    keeps its distance and circles what it shoots at
//   still   holds the middle of the floor and moves only to get out of the way
//   dasher  reaches for the dash at the first sign of trouble
Object.assign(SKILLS, {
  close: { ...SKILLS.sharp, style: 'close' },
  kite: { ...SKILLS.sharp, style: 'kite' },
  still: { ...SKILLS.sharp, style: 'still' },
  dasher: { ...SKILLS.sharp, style: 'dasher', dashAt: 1.5 },
});
// the skills the grade lines are drawn from (scripts/lines.mjs, room-tiers.mjs,
// boss-tiers.mjs); the expert measures reach and never sets a line
export const LINE_SKILLS = ['sharp', 'average', 'rough'];
// the bot's own dice (never the world's: the room must replay from its seed)
export const prng = (seed) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
// ── the bot ──────────────────────────────────────────────────────────
// v159: `K.off`, a Set of a room's strategies this player does NOT play (scripts/strategy.mjs): 'priority' (no reads,
// no quarry: the nearest body), 'aim' (no lead), 'movement' (no dash), 'position' (no going where the room asks).
// 'risk' and the rest of 'priority' are K's own numbers (greed, reads), set by the caller
const NONE = new Set();
export function think(w, mem, K) {
  const h = w.hero, ch = w.ch, G = ch?.goal ?? {}, gun = !w.gun?.off, off = K.off ?? NONE;
  // what it can see: in THE VOID's dark only what the light reaches
  const vis = sight(w, K);
  const live = w.gels.filter((g) => g.alive && g.state === 'active' && (vis === Infinity || Math.hypot(g.x - h.x, g.z - h.z) <= vis + g.r));
  const hurtable = live.filter((g) => !g.locked);
  // v160: a room that names what to put down first (its level's `plan.first`, room 3: "shooters first: the one that
  // fires, before the ones that walk") — a player who plays the room's priority does that, but not past a body
  // already on top of them. Only that room: a blanket "shooters first" made most rooms worse (DESIGN, 21 Nov)
  const first = !off.has('priority') && w.mode === 'campaign' ? (mem.firstKinds ??= new Set((w.room?.level?.plan?.first ?? []).map((k) => T.campaign.kinds[k] ?? k))) : null;
  // the nearest body it may hurt (an order room: the lit one; a hunt: the quarry first)
  let target = null, td = Infinity;
  for (const g of hurtable) {
    let d = Math.hypot(g.x - h.x, g.z - h.z);
    if (first?.size && !first.has(g.kind) && d > 3) d += 12;
    // a hunt: the quarry first, but not past a body already on top of you (v47)
    if (G.type === 'hunt' && !off.has('priority') && g.kind !== mem.quarry && d > 4) d += 30;
    // v46: reading the room — a body in a WARDEN's aura shrugs the shot off,
    // so a player who sees the shield shoots something it can hurt (the
    // sharp bot always, the average one more often than not, the rough one
    // never). The campaign only: the arcade's boss lines were measured
    // without it (tuning/bossfights.js).
    if (g.shield && w.mode === 'campaign' && (K.reads ?? 0) > ((mem.rnd?.() ?? 0.5))) d += 30;
    // v159: reading a STRATEGIC boss's window (tuning/bosskinds.js; its ring says which, g.s.armour) — shut, a reader
    // spends its shots on what it can hurt; open, it turns on the boss at once. The campaign only, as the reads above
    if (g.isBoss && typeof g.s?.armour === 'boolean' && w.mode === 'campaign' && (K.reads ?? 0) > ((mem.rnd?.() ?? 0.5))) d += g.s.armour ? 30 : -30;
    if (d < td) { td = d; target = g; }
  }
  let mx = 0, mz = 0;
  const pull = (x, z, k = 1) => { const dx = x - h.x, dz = z - h.z, d = Math.hypot(dx, dz) || 1; mx += (dx / d) * k; mz += (dz / d) * k; return d; };
  // what the room asks
  let goalPoint = null, dash = false;
  if (ch?.zone) goalPoint = { x: ch.zone.x, z: ch.zone.z, k: 2.2 };
  if (ch?.orbs) { let best = null, bd = Infinity; for (const o of ch.orbs) if (o.out && !o.taken && !o.lost) { const d = Math.hypot(o.x - h.x, o.z - h.z); if (d < bd) { bd = d; best = o; } } if (best) goalPoint = { x: best.x, z: best.z, k: 2 }; }
  if (ch?.heart) { const H2 = ch.heart; if (Math.hypot(H2.x - h.x, H2.z - h.z) > 5) goalPoint = { x: H2.x, z: H2.z, k: 1.2 }; }
  const gates = w.pk?.gates?.filter((g) => g.alive) ?? [];
  if ((G.type === 'gates' || !gun) && gates.length) {
    // the nearest gate: come at it square to its beam, dash through the middle
    let gt = null, gd = Infinity;
    for (const g of gates) { const d = Math.hypot(g.x - h.x, g.z - h.z); if (d < gd) { gd = d; gt = g; } }
    // in a no-gun room the gates are the weapon: wait by one with bodies coming, dash through when they reach it
    const nx = gt.az, nz = -gt.ax, side = Math.sign((h.x - gt.x) * nx + (h.z - gt.z) * nz) || 1;
    const ax = gt.x + nx * side * 3, az = gt.z + nz * side * 3;
    if (G.type === 'gates') {
      if (Math.hypot(ax - h.x, az - h.z) > 0.7 && mem.lineup !== gt.id) goalPoint = { x: ax, z: az, k: 3 };
      else { mem.lineup = gt.id; mx = -nx * side * 3; mz = -nz * side * 3; dash = h.dashCd <= 0; if (gd < 0.6 || h.dash > 0) mem.lineup = null; }
    } else if (live.some((g) => Math.hypot(g.x - gt.x, g.z - gt.z) < 2.5)) goalPoint = { x: gt.x, z: gt.z, k: 1.5 };
    else goalPoint = { x: ax, z: az, k: 1.2 };
  }
  // v159: an ANGLER shut and creeping opens only by biting: a reader steps up to its light to draw the bite (the room's
  // lesson, "risk, position"), and the planner below takes it out of the lunge's way
  const ang = w.mode === 'campaign' && (K.reads ?? 0) >= 0.5 ? live.find((g) => g.isBoss && g.kind === 'angler' && g.s?.armour === true && g.s.state === 'creep') : null;
  if (ang && !goalPoint) goalPoint = { x: ang.s.lx, z: ang.s.lz, k: Math.hypot(ang.s.lx - h.x, ang.s.lz - h.z) > 3.5 ? 1.6 : -0.6 };
  if (off.has('position')) goalPoint = null;
  if (goalPoint) pull(goalPoint.x, goalPoint.z, goalPoint.k);
  // the target: keep at range with a gun, close in with the CUT
  const cut = w.dashMode === 'cut' && !gun;
  if (target && !goalPoint) {
    if (cut) { pull(target.x, target.z, 1.4); if (td < 4.2 && h.dashCd <= 0) dash = true; }
    else {
      // v52: playing for HEAT (sim/heat.js pays a kill made close): a greedy
      // player closes in, but only when the floor is quiet enough to — a few
      // bodies, no gel bullet coming — and backs off to range otherwise. `greed`
      // is how close and how often; never at a boss or a big body (the campaign only: the arcade's boss lines
      // were measured standing off at 5)
      const style = K.style, G2 = w.mode === 'campaign' || style === 'close' ? (K.greed ?? 0) : 0;
      const calm = G2 > 0 && !target.isBoss && target.r < 1 && !live.some((g) => g.isBoss) && live.length <= 1 + Math.round(3 * G2) && !w.bullets.some((b) => !b.hero && !b.dead && Math.hypot(b.x - h.x, b.z - h.z) < 4.5);
      const near = (calm ? 5 - 2.4 * G2 : target.isBoss || target.r > 1.2 ? 7.5 : 5) + (style === 'kite' ? 3 : 0);
      // v59's styles: a turret holds the middle (the planner still steps it out of the way);
      // a runner keeps further off and circles what it shoots at
      if (style === 'still') pull(0, 0, Math.min(1, Math.hypot(h.x, h.z) / 4));
      else if (td < near) pull(target.x, target.z, -1); else if (td > (calm ? near + 1 : 9 + (style === 'kite' ? 3 : 0))) pull(target.x, target.z, calm ? 1 : 0.6);
      if (style === 'kite') { const side = mem.orbit ??= mem.rnd() < 0.5 ? -1 : 1; mx += (-(target.z - h.z) / td) * 0.9 * side; mz += ((target.x - h.x) / td) * 0.9 * side; }
    }
    // v46: a BULWARK's plate faces you and turns slower than you can go round
    // it, so a player who reads it circles for its side (the campaign only, as above)
    if (target.kind === 'bulwark' && w.mode === 'campaign' && (K.reads ?? 0) > ((mem.rnd?.() ?? 0.5))) {
      const dx = target.x - h.x, dz = target.z - h.z, side = mem.circle ??= 1;
      if ((-dx / td) * target.faceX + (-dz / td) * target.faceZ > 0.5) { mx += (-dz / td) * (K.circle ?? 1.6) * side; mz += (dx / td) * (K.circle ?? 1.6) * side; }
    }
  }
  if (cut && target && td < 3.5 && h.dashCd <= 0) { const dx = target.x - h.x, dz = target.z - h.z; mx = dx; mz = dz; dash = true; }
  // nothing in sight and nothing asked: go looking, round the floor
  if (!target && !goalPoint && vis < Infinity) { mem.look = (mem.look ?? mem.rnd() * Math.PI * 2) + 0.004 * (K.every ?? 1); pull(Math.cos(mem.look) * w.hx * 0.55, Math.sin(mem.look) * w.hz * 0.55, 0.8); }
  // room to breathe: it wants space from the bodies round it (the planner then
  // keeps it out of their way); a greedy player lets its own target closer
  for (const g of live) { const dx = h.x - g.x, dz = h.z - g.z, d = Math.hypot(dx, dz); if (d < (g === target && !g.isBoss && g.r < 1 && (w.mode === 'campaign' || K.style === 'close') && (K.greed ?? 0) > 0 ? 2.2 : 3.2) && !(cut && g === target)) { mx += (dx / (d || 1)) * (3.2 - d) * 1.2; mz += (dz / (d || 1)) * (3.2 - d) * 1.2; } }
  // the look-ahead chooses the step (and the dash) toward what it wants, as far
  // as this player takes things in; then its thumb carries it a little off
  // in a CUT room, with the dash ready, the body it is about to cut through is the point, not a threat
  const p = plan(w, mx, mz, dash, K, mem, vis, cut && target && h.dashCd <= 0 ? target : null); mx = p.mx; mz = p.mz; dash = p.dash;
  if ((K.jitter ?? 0) > 0 && (mx || mz)) { const a = (mem.rnd() - 0.5) * 2 * K.jitter, c = Math.cos(a), sn = Math.sin(a); [mx, mz] = [mx * c - mz * sn, mx * sn + mz * c]; }
  // aim with a little lead
  let ax = 1, az = 0;
  if (target) {
    const lead = off.has('aim') ? 0 : td / T.bullets.heroSpeed; ax = target.x + (target.velX || 0) * lead - h.x; az = target.z + (target.velZ || 0) * lead - h.z;
    // v46: at a BULWARK's plate a reader aims for its rim, where a grazing shot lands outside the plate's arc
    if (target.kind === 'bulwark' && w.mode === 'campaign' && (K.reads ?? 0) >= 0.5 && (-ax * target.faceX - az * target.faceZ) / (Math.hypot(ax, az) || 1) > 0.5) {
      const l = Math.hypot(ax, az) || 1, off = (target.r + 0.15) * 0.95 * (mem.circle ?? 1);
      ax += (-az / l) * off; az += (ax / l) * off;
    }
    const a = Math.atan2(az, ax) + (mem.rnd() - 0.5) * 2 * K.noise, l = Math.hypot(ax, az); ax = Math.cos(a) * l; az = Math.sin(a) * l;
  }
  const ml = Math.hypot(mx, mz);
  if (ml > 1) { mx /= ml; mz /= ml; }
  // an ammo room: fire only when the shot is likely to land. The arcade sets
  // no gun at all (only the campaign's rooms and challenges do): its ammo is
  // as endless as a room's with none counted (v45 — the boss pass's bot had
  // held its fire past 7 u, against bosses that keep their distance)
  const endless = !w.gun || w.gun.ammo === Infinity;
  const fire = gun && !!target && (endless ? td < 14 * K.range : td < 7 * K.range);
  return { mx, mz, ax, az, aim: !!target, fire, dash: dash && !off.has('movement') ? true : false };
}


// how far it sees: everything, except a line player in THE VOID's dark. The
// view (main.js ruleFrame) draws the dark as a gradient round the hero: clear
// to `near` and 94% black by `far` at its darkest, the whole floor when it
// opens. A bright gel on that dark still shows part of the way down the
// fade, so sight ends 60% of the way from clear to black
export function sight(w, K) {
  if (!K.dark || w.rule?.kind !== 'dark') return Infinity;
  const D = T.campaign.rules.dark, k = w.rule.dark ?? 0, OPEN = 40;   // u: past any floor
  const clear = D.near + (OPEN - D.near) * (1 - k), black = D.far + (OPEN * 1.4 - D.far) * (1 - k);
  return clear + 0.6 * (black - clear);
}

// ── the look-ahead (v55's expert; every skill's from v56) ─────────────
// Everything that can hurt the hero and that this player has taken in is
// projected forward over its horizon: a gel bullet along its line; a body that
// hurts to touch along its velocity; a hopper whose tell it read, where it will
// LAND (in the air it is over your head), with the ring it lands with as a
// softer keep-away; a lob it read, where it comes down; a puddle where it lies.
// Each way the hero could walk (PLAN.dirs directions at two speeds, the exact
// way it wanted, and standing still) is priced by how soon and how deep it
// meets one of them, plus how far it turns from what the bot wanted; a dash is
// priced from where it ends, its i-frames carrying it through whatever is on
// the way, and only looked at once the best walk is worse than `dashAt` (it
// costs a cooldown).
const PLAN = { horizon: 0.9, dt: 0.06, dirs: 16, margin: 0.45, berth: 1.6, berthK: 0.04, hit: 60, soft: 3, ringR: 2.6, turn: 1.6, wall: 1.2, dashCost: 2.5, dashAt: 6, wanted: 1 };
const PERFECT = { react: 0, see: 1, focus: Infinity, horizon: PLAN.horizon, reads: 1, dashAt: PLAN.dashAt };

function threatsFor(w, h, K, mem, vis = Infinity, through = null) {
  const H = T.hero, list = [], hz = K.horizon ?? PLAN.horizon, reach = H.speed * hz + 1;
  const inSight = (x, z, r = 0) => vis === Infinity || Math.hypot(x - h.x, z - h.z) <= vis + r;
  const react = K.react ?? 0, see = K.see ?? 1, focus = K.focus ?? Infinity, reads = K.reads ?? 1, now = w.time ?? 0;
  // a volley: what one source fired from one spot within half a second, noticed (or not) together
  const volley = (b) => {
    if (see >= 1) return true;
    mem.born ??= new WeakMap(); mem.volleys ??= new Map();
    let at = mem.born.get(b); if (at === undefined) { at = now; mem.born.set(b, at); }
    mem.first ??= new WeakMap(); let p = mem.first.get(b); if (!p) { p = { x: b.x, z: b.z }; mem.first.set(b, p); }
    const key = `${b.src}:${Math.floor(at / 0.5)}:${Math.round(p.x / 2)}:${Math.round(p.z / 2)}`;
    let n = mem.volleys.get(key); if (n === undefined) { n = mem.rnd() < see; mem.volleys.set(key, n); if (mem.volleys.size > 4000) mem.volleys.clear(); }
    return n;
  };
  // taken in: there long enough to have been noticed, and noticed at all (once each)
  const noticed = (o, chance) => {
    if (react > 0) { mem.born ??= new WeakMap(); let b = mem.born.get(o); if (b === undefined) { b = now; mem.born.set(o, b); } if (now - b < react) return false; }
    if (chance < 1) { mem.seen ??= new WeakMap(); let n = mem.seen.get(o); if (n === undefined) { n = mem.rnd() < chance; mem.seen.set(o, n); } if (!n) return false; }
    return true;
  };
  // v117 (instrument): a corpse's fire WARNS (sim/world.js plantSeed, v103) — a line on the floor for every bullet
  // it will fire, `tell` s before it does. A person reads those lines as the bullets they are about to be, and
  // follows those bullets as they leave along them; until now the bot met them only once they flew, and then only
  // after its reaction time. A seed is taken in (or not, as one) from the moment it shows, and its reaction time
  // runs from then: line by line, a bullet still to come out of the corpse, then the bullet that came out along it
  const lines = (mem.lines ??= []);
  mem.planted ??= new WeakSet(); mem.known ??= new WeakMap();
  for (const sd of w.seeds ?? []) {
    if (mem.planted.has(sd) || !inSight(sd.x, sd.z)) continue;
    mem.planted.add(sd);
    if (see < 1 && !(mem.rnd() < see)) continue;
    const sp = T.bullets.gelSpeed * (sd.opts?.speedMult ?? 1), life = sd.opts?.life ?? T.bullets.life, r = sd.opts?.radius ?? T.bullets.gelRadius;
    for (const a of sd.angles) lines.push({ x: sd.x, z: sd.z, c: Math.cos(a), s: Math.sin(a), sp, r, at: now + sd.t, end: now + sd.t + life, known: now + react, b: null });
  }
  const shots = [];
  for (const b of w.bullets) {
    if (b.hero || b.dead) continue;
    // a line's bullet, just out of its corpse: the one on that line, flying along it
    if (b.revenge && !mem.known.has(b)) for (const l of lines) {
      if (l.b || now < l.at - 1e-6) continue;
      const dx = b.x - l.x, dz = b.z - l.z, sp = Math.hypot(b.vx, b.vz) || 1;
      if (Math.abs(dx * l.s - dz * l.c) < 0.05 && dx * l.c + dz * l.s > -0.05 && (b.vx * l.c + b.vz * l.s) / sp > 0.9999) { l.b = b; mem.known.set(b, l.known); break; }
    }
    const sp = Math.hypot(b.vx, b.vz);
    if (Math.hypot(b.x - h.x, b.z - h.z) > reach + sp * hz + b.r + H.hitRadius + H.dashSpeed * H.dashTime) continue;
    const k = mem.known.get(b);
    if (!inSight(b.x, b.z) || (k !== undefined ? now < k : !noticed(b, 1) || !volley(b))) continue;
    // how urgent: when it comes closest to where you stand, if it comes close at all
    const rx = b.x - h.x, rz = b.z - h.z, v2 = b.vx * b.vx + b.vz * b.vz || 1e-9;
    const tc = Math.max(0, -(rx * b.vx + rz * b.vz) / v2), dc = Math.hypot(rx + b.vx * tc, rz + b.vz * tc);
    shots.push({ b, u: dc < 2.5 ? tc : 10 + dc });
  }
  // the lines still to fire (a line whose bullet never came — refused, or gone at once — is let go)
  mem.lines = lines.filter((l) => !l.b && now <= l.at + 0.1);
  for (const l of mem.lines) {
    if (now < l.known) continue;
    const t0 = Math.max(0, l.at - now), vx = l.c * l.sp, vz = l.s * l.sp, x = l.x - vx * (l.at - now), z = l.z - vz * (l.at - now);
    if (Math.hypot(l.x - h.x, l.z - h.z) > reach + l.sp * Math.max(0, hz - t0) + l.r + H.hitRadius + H.dashSpeed * H.dashTime) continue;
    const rx = l.x - h.x, rz = l.z - h.z, tc = Math.max(0, -(rx * l.c + rz * l.s) / l.sp), dc = Math.hypot(rx + vx * tc, rz + vz * tc);
    shots.push({ b: { x, z, vx, vz, r: l.r, t0, life: l.end - now }, u: dc < 2.5 ? t0 + tc : 10 + dc });
  }
  // attention: past `focus` bullets it keeps track of the most urgent only
  if (shots.length > focus) { shots.sort((p, q) => p.u - q.u); shots.length = focus; }
  for (const { b } of shots) list.push({ x: b.x, z: b.z, vx: b.vx, vz: b.vz, r: b.r + H.hitRadius, t0: b.t0 ?? 0, t1: Math.min(hz, b.life ?? 99) });
  for (const g of w.gels) {
    if (!g.alive || g.state !== 'active' || g === through) continue;
    const S = T.species[g.kind];
    if (!S?.contact) continue;
    const r = g.r + T.gel.contactRadius, s = g.s;
    if (!inSight(g.x, g.z, g.r)) continue;
    if (s && typeof s.tx === 'number' && (s.state === 'crouch' || s.state === 'hop')) {
      // a hopper's tell: read (once a hop) and up long enough to be taken in
      let known = true;
      if (s.state === 'crouch' && (s.crouch ?? S.crouch ?? 0) - s.t < react) known = false;
      if (known && reads < 1) {
        mem.hop ??= new WeakMap();
        let k = mem.hop.get(g);
        if (!k || k.x !== s.tx || k.z !== s.tz) { k = { x: s.tx, z: s.tz, read: mem.rnd() < reads }; mem.hop.set(g, k); }
        known = k.read;
      }
      if (known) {
        // committed to a landing: harmless overhead until it comes down there
        const land = s.state === 'hop' ? Math.max(0, s.t) : Math.max(0, s.t) + (S.flight ?? 1);
        list.push({ x: s.tx, z: s.tz, vx: 0, vz: 0, r, t0: land - 0.08, t1: 99 });
        list.push({ x: s.tx, z: s.tz, vx: 0, vz: 0, r: r + PLAN.ringR, t0: land - 0.08, t1: land + 0.5, soft: true });
        if (s.state === 'crouch') list.push({ x: g.x, z: g.z, vx: 0, vz: 0, r, t0: 0, t1: Math.max(0, s.t) });
        continue;
      }
      // unread, it is just a body going where it seems to be going
    }
    if (Math.hypot(g.x - h.x, g.z - h.z) > reach + r + 8) continue;
    list.push({ x: g.x, z: g.z, vx: g.velX || 0, vz: g.velZ || 0, r, t0: 0, t1: 99 });
  }
  // v106: a linked pair's strand hurts to touch: circles along it between the two bodies, carried with them
  for (const { a, b } of strands(w)) {
    const len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(2, Math.ceil(len / 0.6)), r = T.forms.pair.r + H.hitRadius;
    for (let k = 1; k < n; k++) {
      const t = k / n;
      if (t * len < a.r || (1 - t) * len < b.r) continue;
      const x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
      if (!inSight(x, z) || Math.hypot(x - h.x, z - h.z) > reach + r + 8) continue;
      list.push({ x, z, vx: (a.velX || 0) * (1 - t) + (b.velX || 0) * t, vz: (a.velZ || 0) * (1 - t) + (b.velZ || 0) * t, r, t0: 0, t1: 99 });
    }
  }
  for (const l of w.lobs) {
    if (!inSight(l.tx, l.tz) || !noticed(l, reads)) continue;
    const left = l.flight - l.t;
    list.push({ x: l.tx, z: l.tz, vx: 0, vz: 0, r: (l.splash ?? 1) + H.radius, t0: left - 0.1, t1: left + 0.1 });
    if (l.hazard) list.push({ x: l.tx, z: l.tz, vx: 0, vz: 0, r: l.hazard.r ?? 1, t0: left, t1: 99 });
  }
  for (const z of w.hazards) if (inSight(z.x, z.z, z.r)) list.push({ x: z.x, z: z.z, vx: 0, vz: 0, r: z.r + 0.05, t0: 0, t1: z.life });
  // v112: a giant gathering for its slam: its ring, at the moment it lands (as a person reads the ring on the floor)
  for (const g of w.gels) if (g.alive && g.slam?.phase === 'warn') list.push({ x: g.slam.x, z: g.slam.z, vx: 0, vz: 0, r: g.r + T.sizes.slam.reach + 0.1, t0: Math.max(0, g.slam.t - 0.05), t1: g.slam.t + 0.12 });
  return list;
}

// how the floor moves you (sim/rules.js): on THE FOAM's slick floor the stick
// is where you accelerate, not where you go, and you coast; on THE WELL's the
// current carries you. Left out, you go where the stick says, as everywhere else
function floorMotion(w) {
  const S = w.rule, R = T.campaign.rules, h = w.hero;
  if (S?.kind === 'slip') return { slip: true, vx: h.slipX || 0, vz: h.slipZ || 0, k: Math.min(1, R.slip.accel * PLAN.dt), drag: Math.max(0, 1 - R.slip.drag * PLAN.dt), dx: 0, dz: 0 };
  if (S?.kind === 'current') return { slip: false, dx: Math.cos(S.angle) * R.current.speed * R.current.playerMult, dz: Math.sin(S.angle) * R.current.speed * R.current.playerMult };
  return null;
}

// where a post will be `t` s on (v110): a drifting or orbiting one (v111: or the rolling ball) carried on at the speed it has now, a ram that is
// warning, punching or holding at its full reach (gone back, or resting, where it is)
function postAt(w, p, t) {
  if (p.ram) {
    if (p.ram.stage === 'rest' || p.ram.stage === 'back') return [p.x, p.z];
    const R = T.posts.worlds[w.world]?.rams, m = p.ram, c = m.side * (m.half - (R?.reach ?? 0) + p.r);
    return m.zWalls ? [m.along, c] : [c, m.along];
  }
  if (p.drift || p.orbit || p.ball) return [p.x + ((p.x - p.px) / T.sim.dt) * t, p.z + ((p.z - p.pz) / T.sim.dt) * t];
  return [p.x, p.z];
}

// how bad it is to be at (x, z) from time t, walking (vx, vz) to the horizon
function pathRisk(w, list, x0, z0, vx, vz, from, inv, hz, fm = null) {
  const H = T.hero, n = Math.round(hz / PLAN.dt), lim = H.radius;
  let risk = 0, x = x0, z = z0, ux = fm?.vx ?? 0, uz = fm?.vz ?? 0;
  for (let k = 1; k <= n; k++) {
    const t = k * PLAN.dt;
    if (t <= from) continue;
    let sx = vx, sz = vz;
    if (fm?.slip) {
      ux += (vx - ux) * fm.k; uz += (vz - uz) * fm.k;
      if (!vx && !vz) { ux *= fm.drag; uz *= fm.drag; }
      sx = ux; sz = uz;
    }
    const nx = x + (sx + (fm?.dx ?? 0)) * PLAN.dt, nz = z + (sz + (fm?.dz ?? 0)) * PLAN.dt;
    // the walls stop you (sliding along them), and a shaped floor's edge too
    x = Math.max(-w.hx + lim, Math.min(w.hx - lim, nx)); z = Math.max(-w.hz + lim, Math.min(w.hz - lim, nz));
    if (w.region && w.region.sdf(x, z) > -lim) { x -= sx * PLAN.dt; z -= sz * PLAN.dt; }
    // v108: the posts on a later world's floor stop you too (sim/posts.js); v110: a moving one where it will BE —
    // a drifting block (or an orbiting crystal) carried on along its way, a ram that is warning or out at its full
    // reach, as a person reads its striped lane
    // v137: and you slide round one, as the game pushes you out of it (sim/posts.js push) — stopping dead made every
    // path that touched a post a dead end, and the blockers that block more of the floor made that most paths
    if (w.posts?.length) for (let pass = 0; pass < 2; pass++) for (const p of w.posts) {
      const [qx, qz] = postAt(w, p, t), dx = x - qx, dz = z - qz, d = Math.hypot(dx, dz), min = p.r + lim;
      if (d >= min) continue;
      if (d > 1e-6) { x = qx + (dx / d) * min; z = qz + (dz / d) * min; } else { x -= sx * PLAN.dt; z -= sz * PLAN.dt; }
    }
    if (t < inv) continue;
    const early = 1 + (hz - t) / hz;   // sooner is worse: less time to change your mind
    for (const q of list) {
      if (t < q.t0 || t > q.t1) continue;
      const c = Math.hypot(q.x + q.vx * t - x, q.z + q.vz * t - z) - q.r;
      if (q.soft) { if (c < 0) risk += PLAN.soft * (-c / PLAN.ringR) * early; continue; }
      if (c < 0) return risk + PLAN.hit * early;   // a hit ends the look
      if (c < PLAN.margin) risk += ((PLAN.margin - c) / PLAN.margin) * early;
      // and a wider berth is a little better than a close one, all else equal
      if (c < PLAN.berth) risk += PLAN.berthK * (PLAN.berth - c) / PLAN.berth;
    }
  }
  // where it ends up: room to move, not a corner
  const ex = Math.max(0, Math.abs(x) - (w.hx - 2)), ez = Math.max(0, Math.abs(z) - (w.hz - 2));
  return risk + (ex + ez) * PLAN.wall;
}

// K: the player (SKILLS; perfect when left out); mem: what it has noticed so far
export function plan(w, wx, wz, wantDash, K = PERFECT, mem = { rnd: () => 0.5 }, vis = Infinity, through = null) {
  const h = w.hero, H = T.hero, list = threatsFor(w, h, K, mem, vis, through), hz = K.horizon ?? PLAN.horizon, fm = floorMotion(w);
  const inv = Math.max(h.dash || 0, h.mercy || 0, h.invinc || 0, h.grace || 0);   // v126: the game's grace guards too
  const wl = Math.hypot(wx, wz), ux = wl > 1e-6 ? wx / wl : 0, uz = wl > 1e-6 ? wz / wl : 0, want = Math.min(1, wl);
  let best = { mx: 0, mz: 0, dash: false, cost: Infinity };
  const consider = (mx, mz, cost) => { if (cost < best.cost) best = { mx, mz, dash: false, cost }; };
  // standing still
  consider(0, 0, pathRisk(w, list, h.x, h.z, 0, 0, 0, inv, hz, fm) + PLAN.turn * want);
  // every direction, and exactly the one it wanted (a gate is dashed square, not to the nearest 22.5°)
  const dirs = [];
  for (let i = 0; i < PLAN.dirs; i++) { const a = (i / PLAN.dirs) * Math.PI * 2; dirs.push([Math.cos(a), Math.sin(a)]); }
  if (wl > 1e-6) dirs.push([ux, uz]);
  for (const [dx, dz] of dirs) {
    const off = PLAN.turn * want * (1 - (dx * ux + dz * uz)) / 2;
    for (const k of [1, 0.5]) consider(dx * k, dz * k, pathRisk(w, list, h.x, h.z, dx * k * H.speed, dz * k * H.speed, 0, inv, hz, fm) + off + (k < 1 ? 0.15 * want : 0));
  }
  // a dash: through whatever is on the way, priced from where it ends
  const canDash = (h.dash || 0) <= 0 && (h.dashCd || 0) <= 0;
  if (canDash && (best.cost > (K.dashAt ?? PLAN.dashAt) || wantDash)) {
    const len = H.dashSpeed * H.dashTime, dur = H.dashTime;
    for (const [dx, dz] of dirs) {
      let ex = Math.max(-w.hx + H.radius, Math.min(w.hx - H.radius, h.x + dx * len)), ez = Math.max(-w.hz + H.radius, Math.min(w.hz - H.radius, h.z + dz * len));
      if (w.region && w.region.sdf(ex, ez) > -H.radius) continue;
      // a dash the room asks for (a gate, a CUT) is the point, not a cost: it wins
      // a tie with walking the same way, or the bot walks up to every gate and back
      const cost = pathRisk(w, list, ex, ez, 0, 0, dur, Math.max(inv, dur), hz, fm) + (wantDash ? -PLAN.wanted : PLAN.dashCost) + PLAN.turn * want * (1 - (dx * ux + dz * uz)) / 2;
      if (cost < best.cost) best = { mx: dx, mz: dz, dash: true, cost };
    }
  }
  return best;
}
