// arcade.js — ARCADE's director (HARDCADE runs it too): 1.x's classic waves.
//
// 1.x v268's getEnemySchedule, spawnWave, the round pump and the round end
// (main.js:92-389, 7200-7313, 8135-8148, 9318-9437, 11318-11441), on 1.x's
// own arena. The spec is docs/port-1x/arcade-mode.md §2; every number is in
// js/tuning/waves.js. Pure JS and seeded: every draw is the run's w.rng, in
// 1.x's order.
//
// A wave: build a schedule (boss entries, then the deliberate shooters, then
// the mob, re-paced into fronts across the round's clock), lay it out on the
// 0.85 ellipse, and pump it in as each entry falls due — a front waits while
// the floor is at its live cap, and pulls in early when the floor is nearly
// empty. The round ends one of two ways: the floor is CLEARED (500 × wave and
// a 1.5 s breather), or the clock runs out with bodies standing and the next
// wave pours in on top of them (a CARRY). A live boss holds the round open.
//
// Step order. 1.x checks the round end at the END of a frame, after the
// kills; 2.0's director steps FIRST. So each step here does the previous
// step's round end (the arena curtain, the breather, the carry, the clear),
// then this step's clock, pull-in and pump, and last the death beat that 1.x
// runs down in its enemy loop — the same sequence 1.x runs, with the seam in
// a different place. test/director.mjs holds all of it in lockstep with 1.x's
// own loop source.
import { TUNING } from '../../tuning.js?v=18';

const T = TUNING, W = T.waves, TAU = Math.PI * 2;

// ── the wave, as numbers ───────────────────────────────────────────

// 1.x waveKind (main.js:129-136). Wave 0 is a boss, so wave 1 is a breather.
export function waveKind(wave) {
  const R = W.rhythm;
  if (wave % R.bossEvery === 0) return 'boss';
  if (wave % R.spikeEvery === 0) return 'spike';
  if (wave >= R.curtainFrom && wave % R.curtainEvery === 0) return 'curtain';
  if (wave >= R.swarmFrom && wave % R.swarmEvery === 0) return 'swarm';
  return 'normal';
}

export const isBreather = (wave) => waveKind(wave) === 'normal' && waveKind(wave - 1) !== 'normal';

// 1.x waveScaleFor (main.js:92-105): the bodies' speed and fire-clock multipliers
export function waveScale(wave) {
  const S = W.scale;
  const ramp = Math.min(wave, S.knee) - 1, post = Math.max(0, wave - S.knee);
  const ease = wave < S.speed.easeUntil ? (S.speed.easeUntil - wave) * S.speed.ease : 0;
  return {
    speedMult: Math.min(S.speed.base + ramp * S.speed.ramp + post * S.speed.post - ease, S.speed.max),
    intervalMult: Math.max(S.interval.base - ramp * S.interval.ramp - post * S.interval.post, S.interval.min),
  };
}

// 1.x waveBudgetBase (main.js:110-120) and the kind key it is read with
// (main.js:178-179): a curtain wave budgets as normal
export function budgetKey(wave) {
  const k = waveKind(wave);
  return k === 'boss' || k === 'spike' || k === 'swarm' ? k : isBreather(wave) ? 'breather' : 'normal';
}
export function budgetFor(wave) {
  const B = W.budget;
  const base = B.base + Math.min(wave, B.knee) * B.ramp + Math.max(0, wave - B.knee) * B.post;
  let budget = Math.floor(base * B.kind[budgetKey(wave)]);
  if (wave < B.early.until) budget = Math.floor(budget * (B.early.base + B.early.step * (wave - 1)));
  return Math.max(budget, B.min);
}

// the entry cap (main.js:228-235): list entries, not bodies
export function entryCap(wave) {
  const C = W.caps;
  return waveKind(wave) === 'swarm'
    ? Math.min(C.swarm.max, C.swarm.base + Math.floor(wave * C.swarm.per))
    : Math.min(C.normal.max, C.normal.base + wave * C.normal.per);
}
// the live floor (main.js:7252-7259)
export const liveCapFor = (wave) => Math.max(W.caps.liveMin, Math.round(entryCap(wave) * W.caps.liveMult));
export const roundLenFor = (wave) => W.round[waveKind(wave)] ?? W.round.normal;

// the shooter plan's seats and spend (main.js:281-286)
export function shooterPlan(wave) {
  const SP = W.shooterPlan, kind = waveKind(wave), curtain = kind === 'curtain';
  let cap = Math.min(SP.capBase + Math.floor(wave / SP.capPerWaves), SP.capMax);
  if (kind === 'swarm') cap = SP.swarmCap;
  if (kind === 'boss') cap = Math.min(cap, SP.bossCap);
  if (curtain) cap += SP.curtainCapBonus;
  return { cap, budget: Math.floor(budgetFor(wave) * (curtain ? SP.curtainShare : SP.budgetShare)) };
}

// the boss wave's headliner (main.js:255-261): the TWIN PRISMS on an even
// (cycle + seed parity), else OMEGA — so wave 8 is PRISMS on an odd seed
export function headliner(wave, seed) {
  return (Math.floor(wave / W.boss.cycle) + (seed % 2)) % 2 === 0 ? W.boss.prism : W.boss.omega;
}
export const escortsFor = (wave) => Math.max(0, Math.min(W.boss.escort.max, Math.floor(wave / W.boss.cycle) - W.boss.escort.cycleOffset));

// ── the schedule (getEnemySchedule, main.js:142-389) ──────────────
// Returns the wave's sorted entries { kind, t, variant, affix?, count?,
// shooter?, slot?, boss?, front? } and the numbers that built them. Pure but
// for `rng`, which it draws from in 1.x's order.
export function schedule(wave, rng, seed) {
  const r = () => rng.next();
  const pick = (list) => list[Math.floor(r() * list.length)];
  const kind = waveKind(wave), swarm = kind === 'swarm', curtain = kind === 'curtain', boss = kind === 'boss';
  const budget = budgetFor(wave), cap = entryCap(wave), V = W.variants, SP = W.shooterPlan;

  const available = W.pool.filter(([, min]) => wave >= min);
  const SHOOT = new Set(W.shooters);
  const mobPool = available.filter(([k]) => !SHOOT.has(k));
  const shootPool = available.filter(([k]) => SHOOT.has(k));
  const VARIANTS = swarm ? V.swarm : V.normal;
  const swarmPool = mobPool.filter(([, , c]) => c <= V.swarmCostMax);
  const drawPool = swarm && swarmPool.length ? swarmPool : mobPool.length ? mobPool : available;

  const list = [];
  let spent = 0;

  // the boss up front, and from the second boss on its WARDEN umbrella
  // (main.js:250-272). 1.x writes the escorts at t = 2.0 + 1.5k but gives
  // them no boss flag, so its fronts below re-pace them with the mob (they
  // are its first entries: front 0, 4.48 s into a boss round) — ported as
  // the code runs, not as its comment reads.
  if (boss) {
    const H = headliner(wave, seed);
    for (const t of H.t) list.push({ kind: H.kind, t, variant: 'normal', boss: true });
    spent += W.boss.cost;
    const E = W.boss.escort;
    for (let k = 0; k < escortsFor(wave); k++) { list.push({ kind: E.kind, t: 0, variant: 'normal', escort: true }); spent += E.cost; }
  }

  // the deliberate shooters (main.js:279-297): no variant, spaced in time
  {
    const sp = shooterPlan(wave);
    let sSpent = 0, k = 0, st = SP.first;
    while (shootPool.length && k < sp.cap && sSpent < sp.budget) {
      const [type, , cost] = pick(shootPool);
      if (sSpent + cost > sp.budget + SP.slack) break;
      list.push({ kind: type, t: st, variant: 'normal', shooter: true, slot: k });
      sSpent += cost;
      st += (curtain ? SP.curtainGap : SP.gap) + r() * SP.gapRand;
      k++;
    }
    spent += sSpent;
  }

  // the mob (main.js:299-339): stop at the first entry that would overspend
  while (spent < budget && list.length < cap) {
    const [type, , cost] = pick(drawPool);
    const variant = pick(VARIANTS);
    let entry, entryCost;
    if (variant === 'elite') {
      entryCost = Math.ceil(cost * V.eliteCost);
      entry = { kind: type, t: 0, variant, affix: pick(W.affixes) };
    } else if (variant === 'elitelite') {
      entryCost = Math.ceil(cost * V.eliteliteCost);
      entry = { kind: type, t: 0, variant, affix: r() < T.variants.elitelite.affixChance ? pick(W.affixes) : null };
    } else if (variant === 'twin') {
      entryCost = Math.ceil(cost * V.twinCost);
      entry = { kind: type, t: 0, variant, count: 2 };
    } else if (variant === 'group') {
      const cheaper = swarmPool.length ? swarmPool : mobPool;
      const p = cheaper.length ? pick(cheaper) : [type, 0, cost];
      const size = V.group.base + Math.floor(r() * V.group.rand);
      entryCost = p[2] * size;
      entry = { kind: p[0], t: 0, variant, count: size };
    } else {
      entryCost = cost;
      entry = { kind: type, t: 0, variant: 'normal' };
    }
    if (spent + entryCost > budget + W.budget.slack) break;
    list.push(entry);
    r();   // 1.x's drip cadence (main.js:337-338): the fronts replace its times, but the draw is spent
    spent += entryCost;
  }

  // the fronts (main.js:341-359): only the mob is re-paced; bosses keep
  // t = 0 and the shooters their own plan
  const PL = W.pulses, roundLen = roundLenFor(wave);
  const PK = { count: PL.count, span: PL.span, from: PL.from, ...(PL.byKind[kind] || {}) };
  const mob = list.filter((e) => !e.boss && !e.shooter);
  const n = mob.length, cnt = Math.max(1, Math.min(PK.count, n)), per = Math.max(1, Math.ceil(n / cnt));
  const stag = swarm ? PL.swarmStagger : PL.stagger;
  let lastK = -1, j = 0;
  mob.forEach((e, i) => {
    const k = PL.evenFronts ? Math.floor((i * cnt) / n) : Math.floor(i / per);
    j = PL.evenFronts ? (k === lastK ? j + 1 : 0) : i % per;
    lastK = k;
    e.t = (PK.from + (cnt > 1 ? k / (cnt - 1) : 0) * PK.span) * roundLen + j * stag;
    e.front = k;
  });

  list.sort((a, b) => a.t - b.t);
  if (!list.length) list.push({ kind: W.empty, t: 0, variant: 'normal' });
  const sp = shooterPlan(wave);
  return { wave, kind, breather: isBreather(wave), budget, spent, cap, liveCap: liveCapFor(wave), roundLen,
           shooterCap: sp.cap, shooterBudget: sp.budget, fronts: cnt, list };
}

// ── the run ────────────────────────────────────────────────────────

const aliveCount = (w) => { let n = 0; for (const g of w.gels) if (g.alive) n++; return n; };

// placement (spawnWave, main.js:7274-7313): the wave's schedule laid out as
// a queue of bodies, in list order (the pump only ever looks at its head, so
// a group's trailing members hold back whatever was listed after them, as in
// 1.x). Shooters are maximally separated from one seeded angle, the rest go
// round the circle by list index; a group fans ±0.75 rad, its members 0.12 s
// apart and pushing in 1.2× faster; a twin's second body lands a seeded
// offset away. Pure but for `rng`, drawn in 1.x's order.
export function layout(plan, rng) {
  const sc = waveScale(plan.wave), V = W.variants;
  const list = plan.list, total = list.length;
  const nShoot = list.reduce((k, e) => k + (e.shooter ? 1 : 0), 0);
  const shooterBase = rng.next() * TAU;
  const queue = [];
  list.forEach((e, i) => {
    const cnt = e.count || 1, group = cnt >= V.group.min;
    const base = e.shooter ? shooterBase + e.slot * (TAU / Math.max(1, nShoot)) : (i / total) * TAU;
    for (let k = 0; k < cnt; k++) {
      let angle = base, ox = 0, oz = 0;
      if (group) angle = base + (k / (cnt - 1) - 0.5) * V.group.spread;
      else if (k > 0) { ox = (rng.next() - 0.5) * V.twinOffset; oz = (rng.next() - 0.5) * V.twinOffset; }
      queue.push({
        kind: e.kind, delay: e.t + (group ? k * V.group.stagger : 0), angle, ox, oz,
        shooter: !!e.shooter, boss: !!e.boss, front: e.front ?? null,
        speedMult: sc.speedMult * (group ? V.group.speedMult : 1), intervalMult: sc.intervalMult,
        variant: e.variant, affix: e.affix ?? null,
      });
    }
  });
  return queue;
}

// the arena curtain, armed (or not) for this wave (main.js:8135-8148): the
// arming roll is skipped before wave 6 and on a boss wave, the style's rolls
// before waves 10 / 8; the time is rolled on every wave, as in 1.x
export function armCurtain(wave, kind, rng) {
  const A = W.arenaCurtain;
  const armed = wave >= A.from && kind !== 'boss' && rng.next() < A.chance;
  const style = wave >= A.cross.from && rng.next() < A.cross.chance ? 'cross'
              : wave >= A.diag.from && rng.next() < A.diag.chance ? 'diag' : 'wall';
  return { armed, style, at: A.at.min + rng.next() * A.at.rand };
}

// spawnWave (main.js:7200-7313): the next wave. `carry`: the clock ended the
// round and the survivors stay.
function startWave(w, d, carry) {
  d.wave++;
  w.wave = d.wave;
  const plan = schedule(d.wave, w.rng, w.seed);
  d.kind = plan.kind; d.plan = plan;
  d.roundLen = plan.roundLen; d.waveT = 0; d.frontLandedAt = W.pulses.landedInit;
  d.liveCap = plan.liveCap; d.childCap = plan.liveCap * W.caps.childMult; d.held = 0;
  // a carry removes the dead and keeps the living (main.js:7201-7202), so no
  // death still playing can hold the next clear
  d.dying = 0; d.present = carry && aliveCount(w) > 0;
  d.queue = layout(plan, w.rng);
  Object.assign(d.curtain, armCurtain(d.wave, plan.kind, w.rng), { warnT: 0, cross: null });

  const B = W.banner[plan.kind] ?? W.banner.normal, K = W.calls;
  const call = d.wave >= K.from ? (plan.kind === 'curtain' ? 'curtain' : K.archs[(d.wave + w.seed) % K.archs.length]) : null;
  w.events.push({ type: 'wave', wave: d.wave, label: B.label, kind: plan.kind, color: B.color, dur: B.dur, carry, call });
}

// the round pump (main.js:9318-9437)
function pump(w, d, dt, api) {
  const q = d.queue, PL = W.pulses, P = W.placement;
  // the pull-in: the floor is nearly empty and the next front is not due —
  // bring that whole front forward, its own stagger kept. Only the head of
  // the queue is looked at, as in 1.x
  if (q.length && q[0].front != null) {
    if (aliveCount(w) <= PL.pullIn && d.waveT >= d.frontLandedAt + PL.pullGap && d.waveT < q[0].delay) {
      const f = q[0].front;
      let start = Infinity;
      for (const s of q) if (s.front === f) start = Math.min(start, s.delay);
      for (const s of q) if (s.front === f) s.delay = d.waveT + (s.delay - start);
    }
  }
  // the pump: a front body waits while the floor is at its live cap, counted
  // per body landed (v258: a gate outside the loop is not a gate); shooters,
  // bosses and anything else off the fronts never wait. It holds the pump,
  // never the step.
  let alive = aliveCount(w);
  while (q.length && d.waveT >= q[0].delay) {
    if (q[0].front != null && alive >= d.liveCap) { d.held += dt; break; }
    if (q[0].front != null) d.frontLandedAt = d.waveT;
    alive++;
    const s = q.shift();
    const p = api.ringPoint(w, s.angle, P.ring, P.clearOfHero);
    const S = T.species[s.kind];
    const o = { speedMult: s.speedMult, intervalMult: s.intervalMult, variant: s.variant, affix: s.affix,
                ping: s.shooter || W.ping.includes(s.kind) };
    if (s.boss) { o.isBoss = true; o.hp = S.bossHp ?? (S.noHpMult ? S.hp : Math.ceil(S.hp * W.boss.hpMult)); }
    const g = api.spawn(w, s.kind, p.x + s.ox, p.z + s.oz, o);
    if (s.ox || s.oz) api.clamp(w, g);
    d.present = true;
  }
}

// fireArenaCurtain (main.js:2645-2670): a wall from one side, marching across
function fireCurtain(w, api, style, forceSide) {
  const A = W.arenaCurtain, rng = w.rng;
  const side = forceSide ?? Math.floor(rng.next() * 4);
  const horiz = side === 1 || side === 3;            // from a ±z wall
  const span = horiz ? w.hx : w.hz;
  const edge = side === 0 ? w.hx : side === 1 ? w.hz : side === 2 ? -w.hx : -w.hz;
  let dx = side === 0 ? -1 : side === 2 ? 1 : 0, dz = side === 1 ? -1 : side === 3 ? 1 : 0;
  if (style === 'diag') {
    const lat = rng.next() < 0.5 ? A.diagLat : -A.diagLat;
    if (horiz) dx = lat; else dz = lat;
    const l = Math.hypot(dx, dz); dx /= l; dz /= l;
  }
  const G = A.gap, n = Math.floor((span * 2 - 2 * A.inset) / A.spacing);
  const g1 = G.from + Math.floor(rng.next() * Math.max(1, n - G.trim));
  let g2 = G.from + Math.floor(rng.next() * Math.max(1, n - G.trim));
  if (Math.abs(g2 - g1) < G.apart) g2 = ((g1 + Math.floor(n / 2)) % Math.max(1, n - G.wrapTrim)) + G.from;
  const gaps = new Set();
  for (let i = 0; i < G.width; i++) { gaps.add(g1 + i); gaps.add(g2 + i); }
  // slots i = 0..n at −span + inset + i × spacing along the wall: centred
  // on the middle slot, which is what fire.curtain lays out
  const mid = -span + A.inset + (n * A.spacing) / 2;
  api.fire.curtain(w, horiz ? mid : edge, horiz ? edge : mid, horiz ? 1 : 0, horiz ? 0 : 1, dx, dz, n + 1, A.spacing, gaps,
    { speedMult: A.speedMult, color: A.color, src: null });
  w.events.push({ type: 'curtain', side, style });
  return side;
}

// the arena curtain's beat (main.js:11318-11342)
function curtainStep(w, d, dt, api) {
  const C = d.curtain, A = W.arenaCurtain;
  if (C.armed) {
    if (C.warnT <= 0 && d.waveT >= C.at) {
      C.warnT = A.warn;
      w.events.push({ type: 'curtainWarn', style: C.style, t: A.warn });
    } else if (C.warnT > 0) {
      C.warnT -= dt;
      if (C.warnT <= 0) {
        C.armed = false;
        const s1 = fireCurtain(w, api, C.style === 'diag' ? 'diag' : 'wall');
        if (C.style === 'cross') C.cross = { t: A.crossDelay, side: (s1 + 1) % 4 };
      }
    }
  }
  if (C.cross) {
    C.cross.t -= dt;
    if (C.cross.t <= 0) { fireCurtain(w, api, 'wall', C.cross.side); C.cross = null; }
  }
}

// the round end (main.js:11356-11441), in 1.x's order
function roundEnd(w, d, dt, api) {
  curtainStep(w, d, dt, api);
  // the breather runs out: the next wave rolls in
  if (d.gapT > 0) { d.gapT -= dt; if (d.gapT <= 0) startWave(w, d, false); }
  let alive = 0, boss = false;
  for (const g of w.gels) if (g.alive) { alive++; if (g.isBoss) boss = true; }
  if (alive) d.present = true;
  // THE CLOCK: nothing queued, the round's time is up, bodies stand and none
  // is a boss — they stay, and the next wave pours in around them
  if (d.gapT <= 0 && !d.queue.length && d.waveT >= d.roundLen && alive && !boss) { startWave(w, d, true); return; }
  // THE CLEAR: the floor is empty (and the last death has played), nothing is queued
  if (d.gapT <= 0 && d.present && !alive && d.dying <= 0 && !d.queue.length) {
    const bonus = W.clear.perWave * d.wave;
    w.score += bonus;
    // the core's milestone banner fires on kills and grazes only; 1.x checks
    // every frame, so a clear that crosses one shows it here
    while (w.score >= w.nextMilestone) { w.events.push({ type: 'milestone', score: w.nextMilestone }); w.nextMilestone += T.score.milestone; }
    w.events.push({ type: 'clear', wave: d.wave, bonus, dur: W.clear.banner, color: W.clear.color, flash: W.clear.flash });
    d.gapT = W.clear.breather;
  }
}

export default {
  create() {
    return {
      wave: 0, kind: null, plan: null, waveT: 0, roundLen: 0, queue: [], liveCap: 0, childCap: 0,
      frontLandedAt: W.pulses.landedInit, gapT: 0, dying: 0, present: false, held: 0,
      curtain: { armed: false, style: 'wall', at: 0, warnT: 0, cross: null },
    };
  },
  step(w, dt, api) {
    const d = w.dir;
    if (!d.wave) startWave(w, d, false);     // startGame → spawnWave (main.js:8833-8834)
    else roundEnd(w, d, dt, api);
    d.waveT += dt;                           // main.js:9321
    pump(w, d, dt, api);
    // the death beat runs down with the frame's bodies (1.x updateDeath,
    // enemy.js:2967-2993, called from the enemy loop at main.js:10408), so
    // the next step's round end sees it as 1.x's end-of-frame check does: a
    // kill on step K clears on step K + 18, which is 1.x's frame K + 17's end
    if (d.dying > 0) d.dying -= dt;
  },
  // 1.x's clear waits for the dying to finish dying (enemy.js:3006-3007)
  onKill(w) { w.dir.dying = W.clear.dying; },
};
