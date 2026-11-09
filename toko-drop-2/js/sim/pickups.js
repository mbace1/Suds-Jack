// pickups.js — 1.x's classic pickups: what lies on the floor, the gates you
// dash through, the cargo convoy and the bounty.
//
// 1.x v268's Powerup, Gate and CargoCluster and the loops that drive them
// (main.js:1675-1771, 2243-2395, 4436-4448, 7315-7323, 8149-8192, 9427-9435,
// 10446-10457, 10757-10813, 10913-10951, 11082, 11159-11299), held to
// docs/port-1x/arcade-mode.md §6.1-§6.6. Every number is
// TUNING.pickups (tuning/pickups.js). Pure JS and seeded: no DOM, no clock.
//
// The state is `w.pk`. World.js calls in at three points of its step, which
// put each rule where 1.x's frame had it:
//   afterDirector  the director has just begun a wave or landed bodies: a new
//                  gate, the bounty armed and the convoy timed (1.x
//                  spawnWave); the first body of an armed wave marked (1.x's
//                  pump); then the bounty's and the multiplier's clocks, which
//                  1.x ran down before the frame's kills
//   mothsHit       right after the hero's bullets have hit the bodies: the
//                  rest may hit a moth (1.x tested the drones after the enemies)
//   step           after everything else: the gates (colour, drift, the
//                  cooldown, retiring), the drops ageing and drifting, the
//                  convoy, the gate chain's clock, the gates against the hero
//                  and the bodies, and last the collection
// and kill() calls onKill (the bounty paid) and reads scoreMult.
//
// Chance: 1.x drew these from two places — its seeded rng() for the risk
// gate, the convoy's time and its formation, and Math.random for everything
// else (the gate's place, angle and drift, every drop's roll, the pod, the
// drift of a drop). Here all of it is ONE seeded stream of its own
// (`w.pk.rng`, from the run's seed), drawn in 1.x's order, so a run replays
// from its seed, and a pickup roll never shifts the wave's schedule: the
// director's w.rng stays in lockstep with 1.x's own source
// (test/director.mjs's oracle neutralises exactly these draws).
import { TUNING } from '../tuning.js?v=125';
import { makeRng } from './rng.js?v=125';
import { equipWeapon, grantInvincibility, grantRapid } from './hero.js?v=125';
import * as posts from './posts.js?v=125';

const T = TUNING, P = T.pickups, H = T.hero, G = P.gate, C = P.convoy, B = P.bounty, FAM = G.family;

// `gateUsed`: the player has dashed a gate in some earlier run (1.x
// tokoDropGateUsed; main.js keeps it under toko2.gateUsed), so no gate
// carries the DASH THROUGH! hint
export function create(w, { gateUsed = false } = {}) {
  return {
    on: P.modes.includes(w.mode),
    rng: makeRng((w.seed ^ 0x2545f491) >>> 0),
    items: [], gates: [], convoy: null, convoyAt: [], convoyT: 0,
    bounty: { arm: false, id: null, t: 0 },
    chain: { n: 0, t: 0 },
    multT: 0,                 // 1.x scoreMultT: seconds of × 2 left
    gateUsed: !!gateUsed, nextId: 1,
  };
}

// the score multiplier now: × 2 while a ×2 pickup runs (main.js:4422 and the rest)
export const scoreMult = (w) => (w.pk && w.pk.multT > 0 ? P.scoremult.mult : 1);

// the laser, hit as a capsule (Gate.hitsPoint, main.js:1758-1768): along it
// within 2 of its centre, across it within 0.2 + r
export function hitsGate(g, x, z, r) {
  if (!g.alive) return false;
  // v107: a HOOP is crossed, not cut: through its middle
  if (g.type === 'hoop') return Math.hypot(x - g.x, z - g.z) < g.ring * FAM.hoop.through + r;
  const dx = x - g.x, dz = z - g.z, along = dx * g.ax + dz * g.az;
  return Math.abs(along) < (g.half ?? G.half) && Math.hypot(dx - along * g.ax, dz - along * g.az) < G.thick + r;
}

// the colour a drop wears (WEAPON_PODS' L1 orb, NON_WEAPON_COLORS)
export const colorOf = (it) => (it.type === 'pod' ? H.weapons[it.fam].color[0] : P.colors[it.type]);
// and its badge (the pod's id, NON_WEAPON_GLYPHS)
export const glyphOf = (it) => (it.type === 'pod' ? P.podGlyph[it.fam] : P.glyphs[it.type]);

const byId = (w, id) => { for (let i = w.gels.length - 1; i >= 0; i--) if (w.gels[i].id === id) return w.gels[i]; return null; };
const clearBounty = (b) => { b.id = null; b.t = 0; };

// ── the director's beat ────────────────────────────────────────────
export function afterDirector(w, dt) {
  const k = w.pk;
  if (!k?.on) return;
  for (let i = 0, n = w.events.length; i < n; i++) {
    const e = w.events[i];
    if (e.type === 'wave') startWave(w, k, e);
    else if (e.type === 'spawn' && k.bounty.arm && !e.boss) mark(w, k, e);
  }
  // the bounty shadows its body and its window closes without ceremony
  // (main.js:10446-10457); the multiplier runs down (main.js:10534)
  const b = k.bounty;
  if (b.id != null) { const g = byId(w, b.id); if (!g || !g.alive || (b.t -= dt) <= 0) clearBounty(b); }
  if (k.multT > 0) k.multT -= dt;
}

// spawnWave's living arena (main.js:7315-7323, 8134, 8149, 8156, 8190-8192),
// on every wave start, a carry included, in 1.x's order
function startWave(w, k, e) {
  const wave = e.wave;
  if (wave >= G.from) {
    // the oldest of two or more standing retires over 4 s, then a new one stands (v107: a slalom's three stand,
    // count and retire as one)
    const live = k.gates.filter((g) => g.retireT == null && !g.follower);
    if (live.length >= G.keep) for (const o of k.gates) if (o === live[0] || (o.group != null && o.group === live[0].group)) o.retireT = G.retire;
    const risk = wave >= G.risk.from && k.rng.next() < G.risk.chance;
    const g = makeGate(w, k, risk, wave >= G.drift.from);
    k.gates.push(g);
    family(w, k, g);
  }
  // an unclaimed bounty dies with its wave; every third wave from 4 arms one
  clearBounty(k.bounty);
  k.bounty.arm = wave >= B.from && wave % B.every === B.at && e.kind !== 'boss';
  // the gate chain dies with the wave state (clearArenaObjectives, main.js:1849-1853)
  k.chain.n = 0; k.chain.t = 0;
  // one convoy, 3-8 s in, once the last one has gone
  k.convoyT = 0; k.convoyAt = [C.at.base + k.rng.next() * C.at.rand];
}

// new Gate (main.js:1679-1691): a random place and angle, and from wave 10 a drift
function makeGate(w, k, risk, drift) {
  const r = k.rng;
  const x = (r.next() - 0.5) * w.hx * G.span;
  const z = (r.next() - 0.5) * w.hz * G.span;
  const angle = r.next() * Math.PI;
  // the posts, and the laser between them, lie along (−sin a, cos a)
  const g = { id: k.nextId++, x, z, px: x, pz: z, angle, ax: -Math.sin(angle), az: Math.cos(angle),
              risk, green: true, alive: true, cd: 0, retireT: null, drift, dx: 0, dz: 0 };
  // v108: never standing in what stands on a later world's floor (sim/posts.js)
  if (posts.clear(w, g, G.half * 0.6)) { g.px = g.x; g.pz = g.z; }
  if (drift) { const da = r.next() * Math.PI * 2; g.dx = Math.cos(da) * G.drift.speed; g.dz = Math.sin(da) * G.drift.speed; }
  w.events.push({ type: 'gate', id: g.id, x, z, angle, risk, drift });
  return g;
}

// v107: THE GATE FAMILY (TUNING.pickups.gate.family). From world 2 a wave's gate may stand as one of its kinds,
// drawn from a stream of its own (so the pickups' own draws, and world 1's gates, are 1.x's): it takes the
// place and angle the gate was given and becomes a TURNSTILE (pinned, turning), a SLALOM (three short gates in
// a line across the dash), a FENCE (a long beam sliding across the floor), a FUSE (short, striped, a burst when
// dashed) or a HOOP (a ring on the floor, crossed through its middle)
function family(w, k, g) {
  if (!T.worlds.modes.includes(w.mode) || !(w.world >= 2)) return;
  const r = (k.frng ??= makeRng((w.seed ^ 0x51ed270b) >>> 0));
  const pool = Object.entries(FAM.weights).filter(([t]) => w.world >= (FAM.from[t] ?? 1));
  let u = r.next() * pool.reduce((a, [, x]) => a + x, 0), type = 'gate';
  for (const [t, x] of pool) if ((u -= x) < 0) { type = t; break; }
  g.type = type;
  if (type === 'gate') return;
  g.risk = false; g.green = true;
  const at = (x, z) => { const m = 1.5; return [Math.max(-w.hx + m, Math.min(w.hx - m, x)), Math.max(-w.hz + m, Math.min(w.hz - m, z))]; };
  if (type === 'turnstile') {
    const F = FAM.turnstile;
    g.half = F.half; g.spin = (r.next() < 0.5 ? -1 : 1) * (2 * Math.PI) / (F.period[0] + r.next() * (F.period[1] - F.period[0]));
    g.drift = false; g.dx = g.dz = 0;
    if (posts.clear(w, g, F.half + 0.2)) { g.px = g.x; g.pz = g.z; }   // v108: its sweep clears what stands on the floor
  } else if (type === 'slalom') {
    // three, `gap` apart along the beam's normal (cos a, sin a), the middle one where the gate stood
    const F = FAM.slalom, nx = Math.cos(g.angle), nz = Math.sin(g.angle), group = g.id;
    g.half = F.half; g.group = group; g.drift = false; g.dx = g.dz = 0;
    [g.x, g.z] = at(g.x, g.z); g.px = g.x; g.pz = g.z;
    for (const s of [-1, 1]) {
      const [x, z] = at(g.x + nx * F.gap * s, g.z + nz * F.gap * s);
      k.gates.push({ ...g, id: k.nextId++, x, z, px: x, pz: z, follower: true });
    }
  } else if (type === 'fence') {
    // along x or z (the floor's own axes), across most of that side, sliding along its normal
    const F = FAM.fence, alongZ = r.next() < 0.5;
    g.angle = alongZ ? 0 : Math.PI / 2; g.ax = -Math.sin(g.angle); g.az = Math.cos(g.angle);
    g.half = F.frac * (alongZ ? w.hz : w.hx);
    if (alongZ) { g.z = 0; g.dx = (r.next() < 0.5 ? -1 : 1) * F.speed; g.dz = 0; } else { g.x = 0; g.dz = (r.next() < 0.5 ? -1 : 1) * F.speed; g.dx = 0; }
    g.px = g.x; g.pz = g.z; g.drift = true; g.inset = F.inset;
  } else if (type === 'fuse') {
    g.half = FAM.fuse.half;
  } else if (type === 'hoop') {
    const F = FAM.hoop, a = r.next() * Math.PI * 2;
    g.ring = F.r; g.drift = true; g.dx = Math.cos(a) * F.drift; g.dz = Math.sin(a) * F.drift;
  }
  w.events.push({ type: 'gateKind', id: g.id, kind: type });
}

// a campaign room's own gate (sim/challenge.js): where and when the room says
export function placeGate(w, x, z, angle, drift = false) {
  const k = w.pk;
  k.on = true;
  const g = { id: k.nextId++, x, z, px: x, pz: z, angle, ax: -Math.sin(angle), az: Math.cos(angle),
              risk: false, green: true, alive: true, cd: 0, retireT: null, drift, dx: 0, dz: 0 };
  if (drift) { const da = k.rng.next() * Math.PI * 2; g.dx = Math.cos(da) * G.drift.speed; g.dz = Math.sin(da) * G.drift.speed; }
  k.gates.push(g);
  w.events.push({ type: 'gate', id: g.id, x, z, angle, risk: false, drift });
  return g;
}

// the pump lands the first body of an armed wave (main.js:9427-9435): the
// first that is not a boss is the bounty, 8 s from the moment it steps in
function mark(w, k, e) {
  const g = byId(w, e.id);
  if (!g || g.child || g.isBoss) return;
  k.bounty.arm = false; k.bounty.id = g.id; k.bounty.t = B.time;
  w.events.push({ type: 'bounty', id: g.id, x: g.x, z: g.z, t: B.time });
}

// ── a kill (onKill, main.js:4436-4448, 4458-4462) ──────────────────
// The bounty pays from any kill (a bullet, a dash, a gate's laser): 1500 +
// 100 × the wave, doubled under the multiplier, and a pod at the body. Then
// the heart knob, off unless its chance is above 0.
export function onKill(w, g) {
  const k = w.pk;
  if (!k?.on) return;
  const b = k.bounty;
  if (b.id === g.id && b.t > 0) {
    const pay = (B.pay + w.wave * B.perWave) * scoreMult(w);
    w.score += pay;                         // kill() runs the milestones after
    drop(w, k, g.x, g.z, { type: 'pod', fam: randomPod(w, k) }, B.podLife);
    w.events.push({ type: 'bountyPaid', id: g.id, x: g.x, z: g.z, r: g.r, pay, banner: B.banner });
    clearBounty(b);
  }
  const HT = P.heart;
  if (HT.chance > 0 && k.rng.next() < HT.chance && k.items.length < HT.floorCap) {
    const vx = (k.rng.next() - 0.5) * HT.drift, vz = (k.rng.next() - 0.5) * HT.drift;
    drop(w, k, g.x, g.z, { type: 'hp' }, HT.life, vx, vz);
  }
}

// ── drops ──────────────────────────────────────────────────────────
// randomWeaponPodId (main.js:2030-2036): level 1 only, and with
// favourUnheld's chance not the family in your hands
function randomPod(w, k) {
  const held = w.hero.weapon?.fam, list = P.pods, others = list.filter((f) => f !== held);
  const pool = held && others.length && k.rng.next() < H.weapons.favourUnheld ? others : list;
  return pool[Math.floor(k.rng.next() * pool.length)];
}

// new Powerup (main.js:2244-2279): `what` is { type, fam? }; it drifts at
// (vx, vz) u/s for its `life` seconds
function drop(w, k, x, z, what, life = P.life, vx = 0, vz = 0) {
  const it = { id: k.nextId++, type: what.type, fam: what.fam ?? null, x, z, px: x, pz: z, vx, vz, life, max: life, taken: false };
  if (posts.clear(w, it, 0.7)) { it.px = it.x; it.pz = it.z; }   // v108: a drop never lies inside a post (v110: nor in a ram's lane)
  k.items.push(it);
  w.events.push({ type: 'drop', id: it.id, kind: it.type, fam: it.fam, x, z });
  return it;
}

// a challenge met (sim/challenge.js, v36): a pod, a step from where you are
export function reward(w, x, z) {
  const k = w.pk;
  if (!k) return null;
  return drop(w, k, x + 1.2, z, { type: 'pod', fam: randomPod(w, k) }, P.life);
}

// a drop put down by hand (the tests, a look check)
export const place = (w, x, z, what, life, vx, vz) => drop(w, w.pk, x, z, what, life, vx, vz);

// ── the convoy ─────────────────────────────────────────────────────
// new CargoCluster (main.js:2317-2357), its draws in 1.x's order
function makeConvoy(w, k) {
  const r = () => k.rng.next(), HX = w.hx, HZ = w.hz;
  const count = C.count.base + Math.floor(r() * C.count.rand);
  const edge = Math.floor(r() * 4);
  let sx, sz, dx, dz;
  if (edge === 0) { sx = (r() - 0.5) * HX * C.span; sz = -(HZ + C.outside); dx = 0; dz = 1; }
  else if (edge === 1) { sx = (r() - 0.5) * HX * C.span; sz = HZ + C.outside; dx = 0; dz = -1; }
  else if (edge === 2) { sx = -(HX + C.outside); sz = (r() - 0.5) * HZ * C.span; dx = 1; dz = 0; }
  else { sx = HX + C.outside; sz = (r() - 0.5) * HZ * C.span; dx = -1; dz = 0; }
  const speed = C.speed.base + r() * C.speed.rand;
  const ppx = -dz, ppz = dx;                                   // the line's perpendicular
  const amp = C.sway.amp[0] + r() * C.sway.amp[1], freq = C.sway.freq[0] + r() * C.sway.freq[1], phase = r() * Math.PI * 2;
  // 1.x built each moth on the bare line and swayed it on its first update,
  // a jump of up to 8 u in one frame; here it is built where that update will
  // sway it from, so the view does not draw the jump. Nothing tests a moth
  // before that update (it runs in the step that builds the convoy), so the
  // rules are 1.x's. 1.x's quirk is kept: a moth that the sway starts more
  // than 5 outside has escaped at once, and that convoy can never be swept clean.
  const off0 = Math.sin(phase) * amp, moths = [];
  for (let i = 0; i < count; i++) {
    const base = (i - (count - 1) / 2) * C.gap;
    const x = sx + ppx * (base + off0), z = sz + ppz * (base + off0);
    moths.push({ i, x, z, px: x, pz: z, base, alive: true, escaped: false });
  }
  w.events.push({ type: 'convoy', count, edge });
  return { cx: sx, cz: sz, dx, dz, ppx, ppz, speed, amp, freq, phase, elapsed: 0, moths, killed: 0 };
}

// CargoCluster.update (main.js:2359-2390): the line flies straight across and
// sways; a moth past 5 outside the arena has escaped; with none left in it,
// the convoy is done
function convoyStep(w, c, dt) {
  c.elapsed += dt;
  c.cx += c.dx * c.speed * dt; c.cz += c.dz * c.speed * dt;
  const off = Math.sin(c.freq * c.elapsed + c.phase) * c.amp;
  let any = false;
  for (const m of c.moths) {
    m.px = m.x; m.pz = m.z;
    if (!m.alive) continue;
    const perp = m.base + off;
    m.x = c.cx + c.ppx * perp; m.z = c.cz + c.ppz * perp;
    if (Math.max(Math.abs(m.x) - w.hx, Math.abs(m.z) - w.hz) > C.escape) { m.escaped = true; m.alive = false; }
    else any = true;
  }
  return any;
}

// the hero's bullets against the moths (main.js:10757-10813): a moth never
// hurts and never scores; shot, it drops 55% a pod, 25% a nugget, 20% a ×2,
// drifting, for 7 s — and the one that makes a CLEAN SWEEP (all shot, none
// escaped) drops a pod for 12 s. 2.0's rule: that pod is a DASH pod while the
// dash has a level to go. A bullet that hit a moth is spent, laser or not.
export function mothsHit(w) {
  const c = w.pk?.convoy;
  if (!c) return;
  const k = w.pk;
  for (let i = w.bullets.length - 1; i >= 0; i--) {
    const b = w.bullets[i];
    if (!b.hero || b.dead) continue;
    for (const m of c.moths) {
      if (!m.alive || Math.hypot(b.x - m.x, b.z - m.z) >= b.r + C.r) continue;
      m.alive = false; c.killed++; b.dead = true;
      const clean = c.moths.every((d) => !d.alive) && !c.moths.some((d) => d.escaped);
      w.events.push({ type: 'mothShot', x: m.x, z: m.z, i: m.i, clean });
      w.events.push({ type: 'shake', amount: C.shake });
      if (clean) {
        const what = w.hero.dashLevel < P.dashPod.max ? { type: 'dash' } : { type: 'pod', fam: randomPod(w, k) };
        drop(w, k, m.x, m.z, what, C.sweepLife);
      } else {
        const roll = k.rng.next();
        const what = roll < C.drop.pod ? { type: 'pod', fam: randomPod(w, k) } : roll < C.drop.pod + C.drop.score ? { type: 'score' } : { type: 'scoremult' };
        const a = k.rng.next() * Math.PI * 2, sp = C.drop.drift[0] + k.rng.next() * C.drop.drift[1];
        drop(w, k, m.x, m.z, what, C.drop.life, Math.cos(a) * sp, Math.sin(a) * sp);
      }
      break;
    }
  }
}

// ── the end of the step ────────────────────────────────────────────
export function step(w, dt, api) {
  const k = w.pk;
  if (!k?.on) return;
  // the gates (Gate.update, main.js:1726-1750): red or green on the run's
  // clock (1.x read the wall clock, main.js:10911 → 1732), the drift, the zap's cooldown; then the
  // retiring ones go (main.js:10918)
  for (const g of k.gates) {
    g.px = g.x; g.pz = g.z;
    if (!g.alive) continue;
    if (g.risk) g.green = Math.floor(w.time / G.risk.cycle) % 2 === 0;
    if (g.spin) { g.angle += g.spin * dt; g.ax = -Math.sin(g.angle); g.az = Math.cos(g.angle); }   // v107: a turnstile turns
    if (g.drift) {
      g.x += g.dx * dt; g.z += g.dz * dt;
      const inset = g.inset ?? G.drift.inset;
      if (Math.abs(g.x) > w.hx - inset) g.dx *= -1;
      if (Math.abs(g.z) > w.hz - inset) g.dz *= -1;
      // v108: a drifting gate glances off what stands on the floor (sim/posts.js), as off a wall
      const off = g.type === 'fence' ? null : posts.push(w, g, g.type === 'hoop' ? g.ring : G.half * 0.6, null, true);
      if (off) { const dn = g.dx * off.nx + g.dz * off.nz; if (dn < 0) { g.dx -= 2 * dn * off.nx; g.dz -= 2 * dn * off.nz; } }
    }
    if (g.cd > 0) g.cd -= dt;
  }
  for (let i = k.gates.length - 1; i >= 0; i--) { const g = k.gates[i]; if (g.retireT != null && (g.retireT -= dt) <= 0) k.gates.splice(i, 1); }

  // the drops age and drift (Powerup.update, main.js:2280-2296); the expired
  // and the taken go (main.js:10919-10925)
  for (const it of k.items) { it.px = it.x; it.pz = it.z; it.life -= dt; it.x += it.vx * dt; it.z += it.vz * dt; }
  if (k.items.some((it) => it.life <= 0 || it.taken)) k.items = k.items.filter((it) => it.life > 0 && !it.taken);

  // the convoy comes on its time and flies (main.js:10927-10951)
  if (!k.convoy && k.convoyAt.length) {
    k.convoyT += dt;
    if (k.convoyT >= k.convoyAt[0]) { k.convoy = makeConvoy(w, k); k.convoyAt.shift(); }
  }
  if (k.convoy && !convoyStep(w, k.convoy, dt)) k.convoy = null;

  // the gate chain's clock (main.js:11082)
  if (k.chain.t > 0) { k.chain.t -= dt; if (k.chain.t <= 0) k.chain.n = 0; }

  gatesTouch(w, k, api);
  collect(w, k, api);
}

// the gates against the hero and the bodies (main.js:11159-11214). Walking
// through does nothing; DASHING through switches the gate off and drops one
// of hp / invincible / firerate / scoremult — two on a green risk gate, none
// on a red one, which is a dud. A dash through another gate within 6 s pays
// 500 × N. The laser hurts a body touching it (its centre within 0.2 + half
// its radius), one a gate every 0.5 s, as an 'env' kill: it scores and never
// bites back. A gate blocks nothing.
function gatesTouch(w, k, api) {
  if (!k.gates.length) return;
  const h = w.hero;
  for (const g of k.gates) {
    if (!g.alive) continue;
    if (h.alive && h.dash > 0 && hitsGate(g, h.x, h.z, H.radius)) {
      if (!k.gateUsed) { k.gateUsed = true; w.events.push({ type: 'gateUsed' }); }
      g.alive = false;
      if (g.risk && !g.green) {
        w.events.push({ type: 'gateDash', id: g.id, x: g.x, z: g.z, dud: true, banner: G.banner.dud });
        break;                              // 1.x leaves the gate loop here (main.js:11173)
      }
      w.events.push({ type: 'gateDash', id: g.id, x: g.x, z: g.z, green: g.risk, banner: g.risk ? G.banner.green : 0, kind: g.type ?? 'gate' });
      w.ch?.onGate?.(w);                  // a campaign room counting its gates (sim/challenge.js)
      w.events.push({ type: 'shake', amount: G.dashShake });
      const pick = () => ({ type: G.types[Math.floor(k.rng.next() * G.types.length)] });
      // v107: what the gate's kind pays (sim/pickups.js family): a slalom gate its points, and its prize only when
      // all three went in one dash; a fuse its burst and no prize; a hoop two prizes; the rest one, as 1.x's
      let chained = true;
      if (g.type === 'slalom') chained = slalom(w, k, g, api, pick) === 1;   // a slalom chains once a dash, not three times
      else if (g.type === 'fuse') fuse(w, g, api);
      else {
        drop(w, k, g.x, g.z, pick(), G.dropLife);
        if (g.risk) drop(w, k, g.x + G.second, g.z, pick(), G.dropLife);
        if (g.type === 'hoop') for (let i = 1; i < FAM.hoop.prizes; i++) drop(w, k, g.x + G.second * i, g.z, pick(), G.dropLife);
      }
      if (chained) k.chain.n = k.chain.t > 0 ? k.chain.n + 1 : 1;
      k.chain.t = G.chain.window;
      if (chained && k.chain.n >= 2) {
        const pay = G.chain.pay * k.chain.n * scoreMult(w);
        api.score(w, pay);
        w.events.push({ type: 'gateChain', n: k.chain.n, pay, banner: G.banner.chain });
      }
    }
    if (g.cd <= 0 && g.type !== 'hoop') {   // v107: a hoop cuts nothing
      for (const e of w.gels) {
        if (!e.alive || e.state !== 'active' || !hitsGate(g, e.x, e.z, e.r * G.zap.reach)) continue;
        zap(w, g, e, api);
        g.cd = G.zap.every;
        break;
      }
    }
  }
}

// v107: a SLALOM gate dashed: its points, and when all three of its group went in ONE dash, the threading pays
// and drops a prize where the last one stood
function slalom(w, k, g, api, pick) {
  const F = FAM.slalom, h = w.hero, mult = scoreMult(w);
  api.score(w, F.pay * mult);
  const s = k.slalom && k.slalom.group === g.group && k.slalom.dash === h.dashId ? k.slalom : (k.slalom = { group: g.group, dash: h.dashId, n: 0 });
  s.n++;
  w.events.push({ type: 'slalom', x: g.x, z: g.z, pay: F.pay * mult, n: s.n });
  const n = s.n;
  if (n >= 3) {
    api.score(w, F.threaded * mult);
    drop(w, k, g.x, g.z, pick(), G.dropLife);
    w.events.push({ type: 'threaded', x: g.x, z: g.z, pay: F.threaded * mult, banner: F.banner });
    k.slalom = null;
  }
  return n;   // how far down its line this dash has come
}

// v107: a FUSE dashed: it bursts. Every body within `r` (never a boss) takes `damage` straight to its hp — an 'env'
// kill, as the laser's — and what lives is shoved out; the gel shots inside the ring are gone
function fuse(w, g, api) {
  const F = FAM.fuse;
  w.events.push({ type: 'fuse', x: g.x, z: g.z, r: F.r, banner: F.banner });
  w.events.push({ type: 'shake', amount: F.shake });
  for (const e of w.gels.slice()) {
    if (!e.alive || e.state !== 'active' || e.isBoss) continue;
    const dx = e.x - g.x, dz = e.z - g.z, d = Math.hypot(dx, dz);
    if (d > F.r + e.r) continue;
    e.hitAt = { x: e.x, z: e.z, by: 'env', tick: w.tick };
    e.hp -= F.damage; e.flash = T.gel.flash; e.sqV += T.gel.sq.hit;
    w.events.push({ type: 'hit', x: e.x, z: e.z, id: e.id, kind: e.kind, by: 'fuse' });
    if (e.hp <= 0) { api.kill(w, e, 'env'); continue; }
    const l = d || 1;
    e.kx += (dx / l) * F.push; e.kz += (dz / l) * F.push;
  }
  for (const b of w.bullets) if (!b.hero && !b.dead && Math.hypot(b.x - g.x, b.z - g.z) < F.r) b.dead = true;
}

// one hit from the laser (1.x e.hit(), enemy.js:1603-1608): the flash and the
// squash of a shot, taken where the body crosses the beam, and death as an
// 'env' kill. Like a dash's cut it takes hp directly: a plate or an aura does
// not turn it (1.x tested those on bullets only). It records where it struck
// (`e.hitAt`, the beam's crossing), so a species that keeps its own hp books
// takes the loss there: a SLUG on a beam takes its segment rule at the beam,
// not at the hero. (1.x's e.hit() handed _slugHit no point at all
// (main.js:11207, enemy.js:1605, 1339-1363): every distance NaN, a split that
// duplicated the whole chain and no hp lost — a bug, not a rule; 2.0 takes the
// rule where the laser cut, arcade-mode.md §6.10.)
function zap(w, g, e, api) {
  const along = (e.x - g.x) * g.ax + (e.z - g.z) * g.az, ix = g.x + along * g.ax, iz = g.z + along * g.az;
  e.hitAt = { x: ix, z: iz, by: 'env', tick: w.tick };
  e.hp -= G.zap.damage; e.flash = T.gel.flash; e.sqV += T.gel.sq.hit;
  w.events.push({ type: 'hit', x: ix, z: iz, id: e.id, kind: e.kind, by: 'gate' });
  if (e.hp <= 0) api.kill(w, e, 'env');
}

// collection (main.js:11238-11299): the hero's centre within 0.8 + 0.5 of it
function collect(w, k, api) {
  const h = w.hero;
  if (!h.alive || !k.items.length) return;
  const reach = H.pickup.reach + H.radius;
  for (const it of k.items) {
    if (it.taken || Math.hypot(h.x - it.x, h.z - it.z) >= reach) continue;
    it.taken = true;
    let value = 0;
    if (it.type === 'pod') equipWeapon(w, it.fam);
    else if (it.type === 'dash') {
      // a DASH pod taken with the dash already maxed (a second one dropped
      // before the first was taken) is the prize the sweep gives a maxed
      // dash: 1.x's level-1 weapon pod (main.js:10783-10787)
      if (h.dashLevel < P.dashPod.max) { h.dashLevel++; w.events.push({ type: 'dashLevel', level: h.dashLevel, up: true }); }
      else equipWeapon(w, randomPod(w, k));
    } else if (it.type === 'invincible') grantInvincibility(w);
    else if (it.type === 'hp') h.lives = Math.min(H.lives, h.lives + P.hp);
    else if (it.type === 'firerate') grantRapid(w);
    else if (it.type === 'score') { value = (P.score.base + w.wave * P.score.perWave) * scoreMult(w); api.score(w, value); }
    else if (it.type === 'scoremult') k.multT = P.scoremult.time;
    w.events.push({ type: 'pickup', id: it.id, kind: it.type, fam: it.fam, x: it.x, z: it.z, value, color: colorOf(it) });
    w.events.push({ type: 'shake', amount: P.shake });
  }
}

// ── a look check (main.js __toko.stagePickups, test/smoke.mjs) ─────
// One of everything round the hero, at fixed places (no draws): a plain gate
// and a risk gate, a drifting one, a drop of every type, a convoy coming in,
// and the nearest body marked for the bounty.
export function stage(w) {
  const k = w.pk;
  if (!k) return null;
  const h = w.hero, hx = w.hx, hz = w.hz;
  const gate = (x, z, angle, risk, drift) => {
    const g = { id: k.nextId++, x, z, px: x, pz: z, angle, ax: -Math.sin(angle), az: Math.cos(angle), risk, green: true, alive: true, cd: 0, retireT: null, drift, dx: drift ? G.drift.speed : 0, dz: 0 };
    k.gates.push(g); return g;
  };
  gate(-hx * 0.45, -hz * 0.3, 0.4, false, false);
  gate(hx * 0.45, -hz * 0.3, 1.9, true, false);
  gate(0, -hz * 0.55, Math.PI / 2, false, true);
  const types = [['pod', 'spread'], ['pod', 'laser'], ['dash'], ['hp'], ['invincible'], ['firerate'], ['scoremult'], ['score']];
  types.forEach(([type, fam], i) => {
    const a = (i / types.length) * Math.PI * 2;
    drop(w, k, h.x + Math.cos(a) * 3.2, h.z + Math.sin(a) * 2.6, { type, fam }, i === 0 ? P.blink.last + 0.5 : P.life);
  });
  const r = k.rng, keep = r.state;
  k.convoy = makeConvoy(w, k);
  r.state = keep;                           // the look check draws nothing from the run's stream
  let near = null, nd = Infinity;
  for (const g of w.gels) { if (!g.alive || g.isBoss) continue; const d = Math.hypot(g.x - h.x, g.z - h.z); if (d < nd) { nd = d; near = g; } }
  if (near) { k.bounty.arm = false; k.bounty.id = near.id; k.bounty.t = B.time; }
  return { gates: k.gates.length, items: k.items.length, moths: k.convoy.moths.length, bounty: near?.id ?? null };
}

// ── what the view draws ────────────────────────────────────────────
// Pure, so the numbers are held in bare node (test/pickups.mjs); `t` is the
// view's clock. A drop (Powerup.update, main.js:2280-2296): it bobs 0.6 +
// 0.15 sin(3t), spins 1.6 rad/s, its orb pulses 0.5 + 0.4 sin(5t), and over
// its last 2.5 s orb and badge blink hard, sin(life × 16) > 0 ? 1 : 0.12.
export function itemLook(it, t) {
  const blink = it.life < P.blink.last ? (Math.sin(it.life * P.blink.rate) > 0 ? 1 : P.blink.low) : 1;
  return { y: P.bob.y + Math.sin(t * P.bob.rate) * P.bob.amp, spin: t * P.spin, opacity: (P.pulse.base + P.pulse.amp * Math.sin(t * P.pulse.rate)) * blink, badge: blink };
}
// A gate (Gate.update, main.js:1726-1736): the beam's opacity and its halo's
// and its colour. A retiring gate is drawn whole for its 4 s, as 1.x's was
// (only the removal loop reads _retireT, main.js:7318-7319, 10918): it is
// fully live until it goes, so it looks it. `fade` stays 1 for the view.
export function gateLook(g, t) {
  const L = G.laser, pulse = L.opacity.base + L.opacity.amp * Math.sin(t * L.opacity.rate);
  // v107: a family gate wears its kind's own colour (it is never a risk gate)
  const kind = g.type && g.type !== 'gate' ? FAM.colors[g.type] : null;
  return { color: kind ?? (g.risk && !g.green ? G.red : G.green), laser: g.alive ? pulse : 0, glow: g.alive ? L.glowOpacity.base + L.glowOpacity.amp * pulse : 0, fade: 1 };
}
