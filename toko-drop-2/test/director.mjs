#!/usr/bin/env node
// director.mjs — ARCADE's wave director (js/sim/director/arcade.js), in bare
// node: 1.x's classic waves, held to docs/port-1x/arcade-mode.md §2.
//
// Most checks drive the director against a stand-in world and api (the core
// and the species do not matter to who comes when), so they hold while the
// species are still being ported; the last block runs it in the real world.
//
// Usage: node test/director.mjs           (exit 1 on any failure)
import { makeRng } from '../js/sim/rng.js?v=159';
import { TUNING as T } from '../js/tuning.js?v=159';
import arcade, * as A from '../js/sim/director/arcade.js?v=159';
import { BOSS_KINDS } from '../js/tuning/bosskinds.js?v=159';
// v158: the director's own rules — a boss wave on 1.x's clock, a live boss holding the round — are tested with the
// boss kinds off (an endurance boss's own clock ends its fight; test/bosskinds.mjs holds that)
BOSS_KINDS.on = false;

const W = T.waves, dt = T.sim.dt;
let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const SHOOT = new Set(W.shooters);
const minWave = Object.fromEntries(W.pool.map(([k, m]) => [k, m]));
const costOf = Object.fromEntries(W.pool.map(([k, , c]) => [k, c]));

// ── the wave, as numbers (§2.2–§2.4) ───────────────────────────────
{
  const kinds = 'N N SW SP N CU N B SW N N SP N N SW B N CU N SP SW N N B'.split(' ');
  const name = { N: 'normal', SW: 'swarm', SP: 'spike', CU: 'curtain', B: 'boss' };
  const got = kinds.map((_, i) => A.waveKind(i + 1));
  check('the wave kinds repeat 1.x\'s 24-wave pattern', got.every((k, i) => k === name[kinds[i]]), got.join(' '));
  const breathers = [1, 5, 7, 10, 13, 17, 19, 22];
  check('a breather is a normal wave after any other (wave 1 included)',
    Array.from({ length: 24 }, (_, i) => i + 1).every((w) => A.isBreather(w) === breathers.includes(w)));
  check('the pattern repeats past 24', A.waveKind(32) === 'boss' && A.waveKind(28) === 'spike' && A.waveKind(30) === 'curtain' && A.waveKind(27) === 'swarm');

  // §2.4's table: wave, budget, entry cap, live cap, shooter cap, shooter budget, speedMult, iM, round
  const table = [
    [1, 6, 5, 8, 1, 2, 1.040, 1.000, 14], [2, 7, 6, 9, 1, 2, 1.142, 0.945, 14], [3, 11, 9, 14, 1, 3, 1.244, 0.890, 12],
    [4, 15, 8, 12, 2, 5, 1.346, 0.835, 15], [5, 7, 9, 14, 2, 2, 1.448, 0.780, 14], [6, 15, 10, 15, 5, 9, 1.550, 0.725, 15],
    [7, 10, 11, 17, 3, 3, 1.640, 0.670, 14], [8, 38, 12, 18, 2, 13, 1.730, 0.615, 16], [9, 26, 17, 26, 1, 9, 1.820, 0.560, 12],
    [10, 13, 14, 21, 4, 4, 1.910, 0.505, 14], [11, 23, 14, 21, 4, 8, 1.930, 0.495, 14], [12, 34, 14, 21, 5, 11, 1.950, 0.485, 15],
    [14, 26, 14, 21, 5, 9, 1.990, 0.465, 14], [15, 33, 22, 33, 1, 11, 2.010, 0.455, 12], [16, 55, 14, 21, 2, 19, 2.030, 0.445, 16],
    [18, 29, 14, 21, 7, 17, 2.070, 0.425, 15], [20, 43, 14, 21, 5, 15, 2.110, 0.405, 15], [24, 68, 14, 21, 2, 23, 2.190, 0.365, 16],
    [32, 81, 14, 21, 2, 28, 2.350, 0.350, 16], [40, 94, 14, 21, 2, 32, 2.400, 0.350, 16], [48, 106, 14, 21, 2, 37, 2.400, 0.350, 16],
  ];
  for (const [w, budget, cap, live, sCap, sBud, sm, im, round] of table) {
    const sp = A.shooterPlan(w), sc = A.waveScale(w);
    const row = [A.budgetFor(w), A.entryCap(w), A.liveCapFor(w), sp.cap, sp.budget, A.roundLenFor(w)];
    check(`wave ${w}: budget ${budget}, entry cap ${cap}, live cap ${live}, shooters ${sCap}/${sBud}, round ${round} s`,
      row.join() === [budget, cap, live, sCap, sBud, round].join(), row.join(' '));
    check(`wave ${w}: speed × ${sm.toFixed(3)}, fire clocks × ${im.toFixed(3)}`,
      near(sc.speedMult, sm, 5e-4) && near(sc.intervalMult, im, 5e-4), `${sc.speedMult.toFixed(4)} ${sc.intervalMult.toFixed(4)}`);
  }
  check('speed caps at 2.4 by wave 35, fire clocks floor at 0.35 by wave 26',
    A.waveScale(34).speedMult < 2.4 && A.waveScale(35).speedMult === 2.4 && A.waveScale(25).intervalMult > 0.35 && A.waveScale(26).intervalMult === 0.35);
}

// ── the schedule (§2.5–§2.7) ───────────────────────────────────────
const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);
{
  let capOk = true, spendOk = true, shootOk = true, mobOk = true, variantOk = true, swarmOk = true, timeOk = true, early = [];
  const seen = new Set();
  for (const s of SEEDS) {
    for (let w = 1; w <= 26; w++) {
      const p = A.schedule(w, makeRng(s * 1000 + w), s), L = p.list;
      const shooters = L.filter((e) => e.shooter), mob = L.filter((e) => !e.boss && !e.shooter);
      if (L.length > p.cap) capOk = false;
      if (p.spent > p.budget + W.budget.slack) spendOk = false;
      const sSpent = shooters.reduce((n, e) => n + costOf[e.kind], 0);
      if (shooters.length > p.shooterCap || sSpent > p.shooterBudget + W.shooterPlan.slack || !shooters.length) shootOk = false;
      if (shooters.some((e) => !SHOOT.has(e.kind) || e.variant !== 'normal' || e.affix || e.count)) shootOk = false;
      if (shooters.some((e, i) => e.slot !== i)) shootOk = false;
      // shooters arrive 0.8 s in, then every 2.5–4.0 s (curtain 1.2–2.7 s):
      // 1.x's numbers as written (tuning.js:431-433), not read back from ours
      const gap = p.kind === 'curtain' ? [1.2, 2.7] : [2.5, 4.0];
      if (shooters.length && !near(shooters[0].t, 0.8)) timeOk = false;
      for (let i = 1; i < shooters.length; i++) { const g = shooters[i].t - shooters[i - 1].t; if (g < gap[0] - 1e-9 || g > gap[1]) timeOk = false; }
      if (mob.some((e) => SHOOT.has(e.kind))) mobOk = false;
      for (const e of L) {
        seen.add(e.kind);
        if (minWave[e.kind] > w && !e.escort) early.push(`${e.kind}@${w}`);
        if (e.variant === 'elite' && !W.affixes.includes(e.affix)) variantOk = false;
        if (e.variant === 'elitelite' && e.affix != null && !W.affixes.includes(e.affix)) variantOk = false;
        if (e.variant === 'group' && (e.count < 3 || e.count > 4 || costOf[e.kind] > W.variants.swarmCostMax)) variantOk = false;
        if (e.variant === 'twin' && e.count !== 2) variantOk = false;
      }
      if (p.kind === 'swarm' && mob.some((e) => costOf[e.kind] > W.variants.swarmCostMax || e.variant === 'elite' || e.variant === 'elitelite')) swarmOk = false;
      for (let i = 1; i < L.length; i++) if (L[i].t < L[i - 1].t) timeOk = false;
    }
  }
  check('a schedule never holds more entries than its cap', capOk);
  check('a schedule never spends past its budget + 3', spendOk);
  check('the shooters: 1..cap of them, within their share + 2, no variants, slots in order', shootOk);
  check('the shooters land 0.8 s in and then every 2.5–4.0 s (curtain 1.2–2.7 s)', timeOk);
  check('the mob never draws a shooter', mobOk);
  check('variants: elites carry an affix; groups are 3–4 cheap bodies; twins are 2', variantOk);
  check('a swarm draws only bodies of cost ≤ 2, and no elites', swarmOk);
  check('nothing arrives before its unlock wave', !early.length, early.slice(0, 6).join(' '));
  const all = [...W.pool.map(([k]) => k), 'omega', 'prism'];
  check('by wave 26 the whole roster has been drawn, and the bosses', all.every((k) => seen.has(k)), all.filter((k) => !seen.has(k)).join(' '));

  // the roster by wave: what each wave can draw is exactly what has unlocked
  const at = (w) => { const s = new Set(); for (const sd of SEEDS) for (const e of A.schedule(w, makeRng(sd), sd).list) s.add(e.kind); return s; };
  const w1 = at(1);
  check('wave 1 draws only GLOBBO, YELA, SPITTOR and FANNER', [...w1].every((k) => ['globbo', 'yela', 'spittor', 'fanner'].includes(k)) && w1.size === 4, [...w1].join(' '));
  check('wave 2 unlocks ORANGE, WEEVA, RIBBON and SLUG', ['orange', 'weeva', 'ribbon', 'slug'].every((k) => at(2).has(k)) && !at(1).has('slug'));
  check('MAGNA first comes at wave 10, CLOAKER at 9', !at(9).has('magna') && at(10).has('magna') && !at(8).has('cloaker') && at(9).has('cloaker'));

  // shooter counts where the plan leaves no choice
  const nShoot = (w, s) => A.schedule(w, makeRng(s), s).list.filter((e) => e.shooter).length;
  check('wave 1 has exactly one shooter', SEEDS.every((s) => nShoot(1, s) === 1));
  check('a swarm wave has exactly one shooter', SEEDS.every((s) => nShoot(3, s) === 1 && nShoot(9, s) === 1));
  check('a boss wave has at most two', SEEDS.every((s) => nShoot(8, s) <= 2 && nShoot(16, s) <= 2));
  check('a curtain wave seats up to five at wave 6', SEEDS.some((s) => nShoot(6, s) >= 4) && SEEDS.every((s) => nShoot(6, s) <= 5));
  check('a wave-12 spike seats up to five', SEEDS.every((s) => nShoot(12, s) <= 5) && SEEDS.some((s) => nShoot(12, s) === 5));
}

// ── the fronts (§2.7) ──────────────────────────────────────────────
{
  const fronts = (p) => {                 // the first time in each front, in front order
    const m = new Map();
    for (const e of p.list) if (e.front != null) m.set(e.front, Math.min(m.get(e.front) ?? Infinity, e.t));
    return [...m.keys()].sort((a, b) => a - b).map((k) => m.get(k));
  };
  const want = { normal: [0, 3.5, 7, 10.5], swarm: [0, 2.34, 4.68, 7.02, 9.36], spike: [0, 4.5, 9], boss: [4.48, 8.48, 12.48], curtain: [0, 5.25, 10.5] };
  for (const [w, kind] of [[11, 'normal'], [9, 'swarm'], [12, 'spike'], [16, 'boss'], [18, 'curtain']]) {
    const p = A.schedule(w, makeRng(77), 77), f = fronts(p);
    check(`a ${kind} wave's fronts land at ${want[kind].join(', ')} s`, f.length === want[kind].length && f.every((t, i) => near(t, want[kind][i], 1e-9)), f.map((t) => t.toFixed(2)).join(' '));
  }
  // the fronts span the round even when the mob is just over a multiple of
  // the count (the spec's fix; 1.x's ceil left the last ones empty)
  let spanOk = true, staggerOk = true;
  for (const s of SEEDS) for (const w of [2, 11, 14]) {
    const p = A.schedule(w, makeRng(s), s), mob = p.list.filter((e) => e.front != null);
    if (mob.length >= 4 && Math.max(...mob.map((e) => e.front)) !== 3) spanOk = false;
    const byFront = new Map();
    for (const e of mob) (byFront.get(e.front) ?? byFront.set(e.front, []).get(e.front)).push(e.t);
    for (const ts of byFront.values()) { ts.sort((a, b) => a - b); for (let i = 1; i < ts.length; i++) if (!near(ts[i] - ts[i - 1], W.pulses.stagger, 1e-9)) staggerOk = false; }
  }
  check('with four or more mob entries a normal wave uses all four fronts', spanOk);
  check('a front\'s entries land 0.25 s apart', staggerOk);
  const wave1 = A.schedule(1, makeRng(5), 5);
  check('wave 1 is a round, not a pour: its last front lands 10.5 s in', near(Math.max(...wave1.list.map((e) => e.t)), 10.5) || wave1.list.filter((e) => e.front != null).length < 2);
}

// ── bosses (§2.6, §5.1) ────────────────────────────────────────────
{
  const bosses = (w, s) => A.schedule(w, makeRng(s), s).list.filter((e) => e.boss);
  const odd = bosses(8, 3), even = bosses(8, 4);
  check('wave 8 on an odd seed: the TWIN PRISMS, two entries at 0 and 0.4 s',
    odd.length === 2 && odd.every((e) => e.kind === 'prism') && near(odd[0].t, 0) && near(odd[1].t, 0.4), odd.map((e) => e.kind).join(' '));
  check('wave 8 on an even seed: OMEGA alone at 0 s', even.length === 1 && even[0].kind === 'omega' && even[0].t === 0);
  check('consecutive bosses differ', bosses(16, 3)[0].kind === 'omega' && bosses(16, 4)[0].kind === 'prism' && bosses(24, 3)[0].kind === 'prism');
  check('no boss off a boss wave', [1, 4, 7, 9, 12, 15].every((w) => !bosses(w, 3).length));
  const esc = (w) => A.schedule(w, makeRng(9), 9).list.filter((e) => e.escort);
  check('WARDEN escorts: none at 8, one at 16, two from 24', esc(8).length === 0 && esc(16).length === 1 && esc(24).length === 2 && esc(32).length === 2 && esc(16).every((e) => e.kind === 'warden'));
  check('the escorts ride the first front, as 1.x\'s code runs (4.48 s)', esc(24).every((e) => e.front === 0) && near(Math.min(...esc(24).map((e) => e.t)), 4.48));
}

// ── determinism ────────────────────────────────────────────────────
{
  const a = JSON.stringify([1, 6, 8, 9, 16].map((w) => A.schedule(w, makeRng(42), 42)));
  const b = JSON.stringify([1, 6, 8, 9, 16].map((w) => A.schedule(w, makeRng(42), 42)));
  const c = JSON.stringify([1, 6, 8, 9, 16].map((w) => A.schedule(w, makeRng(43), 43)));
  check('the same seed draws the same schedule', a === b);
  check('another seed draws another', a !== c);
}

// ── the run, in a stand-in world ───────────────────────────────────
const fake = {
  ringPoint(w, a, frac) { return { x: Math.cos(a) * w.hx * frac, z: Math.sin(a) * w.hz * frac }; },
  spawn(w, kind, x, z, o = {}) {
    let before = 0; for (const g of w.gels) if (g.alive) before++;
    const g = { id: w.nextId++, kind, x, z, alive: true, isBoss: !!o.isBoss, hp: o.hp, o, wave: w.wave, at: w.dir.waveT, before, liveCap: w.dir.liveCap };
    w.gels.push(g); w.spawns.push(g);
    return g;
  },
  clamp() {},
  fire: { curtain(w, x, z, lx, lz, dx, dz, slots, spacing, gaps, opts) { w.curtains.push({ x, z, lx, lz, dx, dz, slots, spacing, gaps, opts, wave: w.wave, at: w.dir.waveT }); } },
};
function world(seed, arena = T.arena.landscape) {
  const w = { seed, mode: 'arcade', rng: makeRng(seed), hx: arena.hx, hz: arena.hz, hero: { x: 0, z: 0 }, gels: [], events: [], log: [],
              score: 0, wave: 1, nextMilestone: T.score.milestone, nextId: 1, time: 0, spawns: [], curtains: [] };
  w.dir = arcade.create(w, fake);
  return w;
}
function tick(w) {
  w.events.length = 0; w.time += dt;
  arcade.step(w, dt, fake);
  w.gels = w.gels.filter((g) => g.alive);
  for (const e of w.events) w.log.push({ ...e, time: w.time });
}
const kill = (w, g) => { g.alive = false; w.log.push({ type: 'kill', time: w.time }); arcade.onKill(w, g, fake); };
const killAll = (w, pred = () => true) => { for (const g of w.gels) if (g.alive && pred(g)) kill(w, g); };
const run = (w, secs, each) => { for (let i = 0, n = Math.round(secs / dt); i < n; i++) { tick(w); each?.(w); } };
// jump: the next step starts wave n (the breather's own way in)
const jumpTo = (w, n) => { w.dir.wave = n - 1; w.dir.gapT = 1e-9; w.dir.queue = []; };

{
  const w = world(7);
  tick(w);
  const e = w.log.find((x) => x.type === 'wave');
  check('the first step starts wave 1', e && e.wave === 1 && w.wave === 1 && e.carry === false && e.label === null && e.call === null);
  check('wave 1\'s round is 14 s, its live floor 8', w.dir.roundLen === 14 && w.dir.liveCap === 8);

  // nobody dies: the clock ends each round and the next pours in on top
  run(w, 45);
  const waves = w.log.filter((x) => x.type === 'wave');
  check('standing still, the clock ends wave 1 at 14 s and wave 2 at 28 s',
    waves[1]?.wave === 2 && waves[1].carry && waves[1].time >= 14 && waves[1].time <= 14 + 3 * dt &&
    waves[2]?.wave === 3 && waves[2].time >= 28 && waves[2].time <= 28 + 4 * dt,
    waves.map((x) => `${x.wave}@${x.time.toFixed(3)}`).join(' '));
  check('a carried round pays nothing', w.score === 0 && !w.log.some((x) => x.type === 'clear'));
  check('the survivors stay', w.gels.some((g) => g.wave === 1));
  check('wave 3 is called a SWARM', waves[2]?.label === 'SWARM' && waves[2].kind === 'swarm');
  check('the call names the wave\'s current from wave 2', waves[1].call === W.calls.archs[(2 + 7) % 3]);
  // every body carries its wave's scale; group members push in 1.2× faster
  let scaleOk = true;
  for (const g of w.spawns) {
    const sc = A.waveScale(g.wave), m = g.o.variant === 'group' ? W.variants.group.speedMult : 1;
    if (!near(g.o.speedMult, sc.speedMult * m) || !near(g.o.intervalMult, sc.intervalMult)) scaleOk = false;
  }
  check('every body is spawned with its wave\'s speed and fire-clock multipliers', scaleOk);
  check('every spawn lands on the 0.85 ellipse (a twin\'s partner a little off it)',
    w.spawns.every((g) => g.o.variant === 'twin' || near((g.x / (w.hx * 0.85)) ** 2 + (g.z / (w.hz * 0.85)) ** 2, 1, 1e-9)));
  check('shooters, WARDEN, SIREN and MAGNA get the entrance ping; the rest do not',
    w.spawns.every((g) => g.o.ping === (SHOOT.has(g.kind) || W.ping.includes(g.kind))));
}

{
  // the live floor holds the fronts: killing one body every 2 s (the oldest)
  // to wave 12, no front body ever lands on a full floor — and it had to hold
  const w = world(12);
  let held = false, n = 0;
  run(w, 400, (w) => {
    if (w.dir.held > 0) held = true;
    if (++n % 120 === 0 && w.gels.length) kill(w, w.gels[0]);
  });
  const front = w.spawns.filter((g) => !g.isBoss && !SHOOT.has(g.kind));
  check('the run got to wave 12', w.wave >= 12, `wave ${w.wave}`);
  check('a front body never lands on a floor at its live cap', front.every((g) => g.before < g.liveCap), front.filter((g) => g.before >= g.liveCap).length + ' over');
  check('the cap actually held fronts back', held);
  check('shooters land whatever the floor holds', w.spawns.some((g) => SHOOT.has(g.kind) && g.before >= g.liveCap));
  // 1.x (§2.9): both round ends need an empty queue, so a front the cap is
  // holding keeps the round open past its clock — nobody dying, wave 4 stalls
  const s = world(8);
  run(s, 120);
  check('a held front keeps the round open past its clock, as in 1.x', s.wave === 4 && s.dir.waveT > 60 && s.dir.queue.length > 0 && s.dir.held > 50,
    `wave ${s.wave} at ${s.dir.waveT.toFixed(0)} s, ${s.dir.queue.length} queued`);
}

{
  // a CLEAR: the floor emptied with nothing queued pays 500 × wave, then a 1.5 s breather
  const w = world(21);
  run(w, 0.2);
  killAll(w);
  run(w, 0.5);
  check('an empty floor between fronts is not a clear', !w.log.some((x) => x.type === 'clear') && w.dir.queue.length > 0);
  let guard = 0;
  while (w.dir.queue.length && guard++ < 2000) { tick(w); }
  const k = w.time;
  killAll(w);
  run(w, 0.6);
  const c = w.log.find((x) => x.type === 'clear');
  check('a cleared floor pays 500 × the wave', c && c.wave === 1 && c.bonus === 500 && w.score === 500, JSON.stringify(c));
  // 1.x: the kill's frame does not count down its own 0.28 s death; the next
  // 17 frames do (16.8 → 17), and the clear is checked at the end of the
  // 17th. The director steps at the START of a step, so it sees that frame's
  // end one step later: 18 steps from the kill (0.30 s)
  const beat = Math.ceil(0.28 / dt - 1e-9) + 1;
  check(`the clear waits for the last death to play: ${beat} steps, as 1.x's frame count`, c && Math.round((c.time - k) / dt) === beat, c && `${Math.round((c.time - k) / dt)} steps`);
  run(w, 1.6);
  const next = w.log.filter((x) => x.type === 'wave')[1];
  check('a 1.5 s breather, then the next wave', next && next.wave === 2 && !next.carry && near(next.time - c.time, W.clear.breather, 2 * dt), next && (next.time - c.time).toFixed(3));
  check('the clear pays once', w.log.filter((x) => x.type === 'clear').length === 1);
  // the bonus scales with the wave: wave 5's clear is 2,500
  const w5 = world(22); jumpTo(w5, 5); tick(w5);
  guard = 0; while (w5.dir.queue.length && guard++ < 3000) tick(w5);
  killAll(w5); run(w5, 0.5);
  check('wave 5\'s clear pays 2,500', w5.log.find((x) => x.type === 'clear')?.bonus === 2500 && w5.score === 2500);
  const wm = world(23); wm.score = T.score.milestone - 100; tick(wm);
  guard = 0; while (wm.dir.queue.length && guard++ < 2000) tick(wm);
  killAll(wm); run(wm, 0.5);
  check('a clear that crosses 25,000 shows the milestone', wm.log.some((x) => x.type === 'milestone' && x.score === T.score.milestone));
}

{
  // a boss wave: the headliner by seed parity, 1.x's boss hp, and a live boss holds the round
  const bossHp = (k) => T.species[k].bossHp ?? Math.ceil(T.species[k].hp * W.boss.hpMult);
  for (const [seed, kind, n] of [[3, 'prism', 2], [4, 'omega', 1]]) {
    const w = world(seed); jumpTo(w, 8); tick(w);
    const ev = w.log.find((x) => x.type === 'wave');
    check(`seed ${seed}: wave 8 is a BOSS! wave`, ev?.wave === 8 && ev.label === 'BOSS!' && w.dir.roundLen === 16);
    run(w, 1);
    const b = w.spawns.filter((g) => g.isBoss);
    check(`seed ${seed}: the boss is ${kind} ×${n} with ${bossHp(kind)} hp`, b.length === n && b.every((g) => g.kind === kind && g.hp === bossHp(kind) && g.o.isBoss), b.map((g) => `${g.kind}:${g.hp}`).join(' '));
    run(w, 24);
    check(`seed ${seed}: past its 16 s clock, a live boss holds the round`, w.wave === 8 && w.dir.waveT > 20 && !w.dir.queue.length);
    killAll(w, (g) => g.isBoss);
    run(w, 0.5);
    // v42 (sim/bossfight.js): the boss down ends the fight, what it brought is popped, and the wave clears — where 1.x's clock carried the rest into wave 9
    check(`seed ${seed}: the boss dead, the fight ends and the wave clears rather than carrying (v42)`, w.wave === 8 && w.log.some((x) => x.type === 'bossDown') && w.log.some((x) => x.type === 'clear') && !w.log.some((x) => x.type === 'wave' && x.wave === 9));
  }
  {
    // and with the fight switched off, 1.x's boss wave as it was
    W.bossFight.on = false;
    const w = world(4); jumpTo(w, 8); tick(w); run(w, 25);
    killAll(w, (g) => g.isBoss); run(w, 0.1);
    check('with the fight off: the boss dead, 1.x\'s clock carries the rest into wave 9', w.wave === 9 && w.log.some((x) => x.type === 'wave' && x.wave === 9 && x.carry) && !w.log.some((x) => x.type === 'bossDown'));
    W.bossFight.on = true;
  }
  const w16 = world(3); jumpTo(w16, 16); tick(w16); run(w16, 6);
  check('wave 16 brings one WARDEN escort, and no boss multiplier on it', w16.spawns.filter((g) => g.kind === 'warden' && !g.isBoss).length >= 1 && w16.spawns.filter((g) => g.isBoss).length === 1);
}

{
  // the arena curtain: from wave 6, never a boss wave, ~55% of waves; a 1.1 s warning then a wall
  let armed = 0, eligible = 0, badArm = 0, fired = 0, geomOk = true, timingOk = true, cross = 0;
  for (let s = 1; s <= 60; s++) {
    const w = world(s * 7 + 1);
    let lastWave = 0;
    run(w, 260, (w) => {
      if (w.wave !== lastWave) {
        lastWave = w.wave;
        const C = w.dir.curtain;
        if (w.wave >= 6 && A.waveKind(w.wave) !== 'boss') { eligible++; if (C.armed) armed++; }
        else if (C.armed) badArm++;
      }
      if (Math.round(w.time / dt) % 360 === 0) killAll(w);   // clear the floor every 6 s so the waves roll
    });
    for (const c of w.curtains) {
      fired++;
      const horiz = c.lx === 1, span = horiz ? w.hx : w.hz, n = Math.floor((2 * span - 1) / 0.9);
      if (c.slots !== n + 1 || c.spacing !== 0.9 || c.gaps.size !== 6 || [...c.gaps].some((g) => g < 2 || g > n)) geomOk = false;
      const first = (horiz ? c.x : c.z) - (n / 2) * 0.9, edge = horiz ? c.z : c.x;
      if (!near(first, -span + 0.5, 1e-9) || !near(Math.abs(edge), horiz ? w.hz : w.hx)) geomOk = false;
      if (Math.sign(edge) === Math.sign(horiz ? c.dz : c.dx)) geomOk = false;     // it marches inward
      if (c.opts.speedMult !== 0.62 || c.opts.color !== 0xff66aa || c.opts.src !== 'curtain') geomOk = false;   // named for the death card (v69)
    }
    const warns = w.log.filter((x) => x.type === 'curtainWarn'), shots = w.log.filter((x) => x.type === 'curtain');
    cross += warns.filter((x) => x.style === 'cross').length;
    for (const x of warns) {
      // a new wave re-arms the curtain and drops a warning in flight, as
      // 1.x's spawnWave does (main.js:8141-8148); time only the others
      const cut = w.log.some((y) => y.type === 'wave' && y.time >= x.time && y.time <= x.time + W.arenaCurtain.warn + 2 * dt);
      if (cut || x.time > w.time - 2) continue;
      const s1 = shots.find((y) => y.time > x.time);
      if (!s1 || !near(s1.time - x.time, W.arenaCurtain.warn, 2 * dt)) timingOk = false;
    }
  }
  check('the arena curtain never arms on a boss wave or before wave 6', badArm === 0);
  check('it arms on about 55% of the eligible waves', eligible > 200 && armed / eligible > 0.45 && armed / eligible < 0.65, `${armed}/${eligible}`);
  check('it fires: a wall across the arena from the edge, two 3-slot gaps, at 0.62 speed', fired > 0 && geomOk, `${fired} walls`);
  check('a 1.1 s warning comes first', timingOk);
  check('from wave 10 some are crossing curtains', cross > 0);
}

{
  // the same seed replays exactly; another does not
  const play = (seed) => { const w = world(seed); run(w, 120, (w) => { if (w.tick = (w.tick ?? 0) + 1, w.tick % 90 === 0) killAll(w); }); return JSON.stringify(w.spawns.map((g) => [g.kind, g.x.toFixed(6), g.z.toFixed(6), g.at.toFixed(4), g.o.variant, g.o.affix])) + w.score; };
  const a = play(31), b = play(31), c = play(32);
  check('a run replays from its seed', a === b);
  check('another seed plays another run', a !== c);
}

{
  // a tall screen: the ellipse and the curtain follow the arena
  const w = world(5, T.arena.portrait);
  run(w, 3);
  check('on a tall screen bodies land on the portrait ellipse',
    w.spawns.filter((g) => g.o.variant !== 'twin').every((g) => near((g.x / (11 * 0.85)) ** 2 + (g.z / (18 * 0.85)) ** 2, 1, 1e-9)));
}

// ── against 1.x's own code ─────────────────────────────────────────
// When 1.x's tree is here (read-only; TOKO_1X overrides the path), its OWN
// source is the oracle: getEnemySchedule and its helpers, spawnWave's
// placement, live-cap and curtain arming, the round pump, the arena curtain
// and the round end are cut out of 1.x's main.js by their text, run against
// stubs for everything that is not the classic round, and fed the same
// mulberry32 stream as the port (2.0's rng.js is the same generator). What is
// neutralised is exactly what 2.0 does not port: the depths (no favour, no
// fall), every cabinet, SMASH, RUSH, CLOSE COMBAT, roguelike, the daily, and
// the living-arena draws spawnWave interleaves (gates, convoys, vents...).
// fireArenaCurtain's Math.random becomes the seeded stream, as in the port.
// The fronts are compared with `evenFronts: false` (1.x as written); the
// spec's fix is checked to change only the mob's times.
{
  const { existsSync, readFileSync } = await import('node:fs');
  const ROOT1 = process.env.TOKO_1X || new URL('../../toko-drop', import.meta.url).pathname;   // 1.x sits beside 2.0 in the repo
  if (!existsSync(`${ROOT1}/js/main.js`) || !existsSync(`${ROOT1}/js/tuning.js`)) {
    console.log(`  · 1.x oracle skipped: no 1.x tree at ${ROOT1} (set TOKO_1X)`);
  } else {
    const { TUNING: T1 } = await import(`${ROOT1}/js/tuning.js`);
    const src = readFileSync(`${ROOT1}/js/main.js`, 'utf8').split('\n');
    const fn = (name) => {
      const i = src.findIndex((l) => l.startsWith(`function ${name}(`));
      let j = i; while (j >= 0 && j < src.length && src[j] !== '}') j++;
      if (i < 0 || j >= src.length) throw new Error(`1.x oracle: no function ${name}`);
      return src.slice(i, j + 1).join('\n');
    };
    const cut = (a, b, incl = false) => {
      const i = src.findIndex((l) => l.startsWith(a)), j = src.findIndex((l, k) => k > i && l.startsWith(b));
      if (i < 0 || j < 0) throw new Error(`1.x oracle: anchor not found: ${a}`);
      return src.slice(i, incl ? j + 1 : j).join('\n');
    };
    const FNS = ['waveScaleFor', 'waveBudgetBase', 'depthLookIndex', 'waveKind', 'getEnemySchedule'].map(fn).join('\n')
              + '\n' + fn('fireArenaCurtain').replaceAll('Math.random()', 'rng()');
    const PLACE = cut('  const nShoot = list.reduce', '  if (player._hasShield)');              // main.js:7276-7313
    const ARM = cut('  const curtainOk = ', '  curtainCross = null;', true);                    // main.js:8138-8148
    const ROUND = cut('  waveDuration = classicRound()', '  _pumpHold = 0;', true);             // main.js:7247-7260
    const PUMP = cut('  if (classicRound() && pendingSpawns.length > 0 && pendingSpawns[0].front != null) {',
                     '  player.update(dt, moveDir, aimDir, bullets, arena);');                   // main.js:9327-9437
    const CURT = cut("  if (curtainArmed && gameState === 'playing' && player.alive) {", "  // v265: a room's GOAL");   // main.js:11318-11342
    const END = cut('  // Wave breather tick (v136)', '  // SMASH TV exit walk');                   // main.js:11357-11441
    const NAME = { YELA_CUBE: 'yela', ORANGE_CUBE: 'orange', SLUDGE_CUBE: 'sludge', REDD_CUBE: 'redd', PURP_CUBE: 'purp' };
    const key = (n) => NAME[n] ?? n.toLowerCase();
    const EnemyType = new Proxy({}, { get: (_, k) => key(String(k)) });
    const T1flat = { ...T1, depth: { ...T1.depth, looks: T1.depth.looks.map((l) => ({ ...l, favour: [] })) } };
    // one 1.x classic run, its loop cut down to the round: startGame's
    // spawnWave, then per frame the clock, the pump, the deaths playing, the
    // kills, the curtain and the round end — 1.x's order
    const run1x = new Function('TUNING', 'EnemyType', 'rng', 'runSeed', 'HALF_X', 'HALF_Z', 'hpOf', 'killScript', 'dt', `
      const rush = { on: false }, meleeRun = false, testMode = false, smashMode = false, smashRoomKind = null, smashFloor = 0, dailyMod = null;
      const inCabinet = () => false, bareArena = () => false, classicRound = () => true, TYPE_KEY = {}, _entryDoor = null;
      const tokotronMode = false, nexdeusMode = false, gaundropMode = false, loadoutMode = false, kaikkiMode = false, customLevel = null;
      const gauntlet = null, cabQuest = null, roguelikeMode = false, bindingMode = false, exitPhase = false, _roomSwap = false, roomFadeT = 0, drop = null, nxSurges = [];
      const gameState = 'playing', player = { alive: true }, scene = null, playReader = { bossMet() {} }, RANGED_TYPES = new Set(), bountyArm = false, ROUND_DUR = 20;
      const audio = new Proxy({}, { get: () => () => {} }), bossAuras = [], makeBossAura = () => ({}), _apt = { x: 0, z: 0 };
      const arena = { ringPoint(a, k, out) { out.x = Math.cos(a) * HALF_X * k; out.z = Math.sin(a) * HALF_Z * k; return out; } };
      let milestoneT = 0, milestoneText = '', waveClearFlashT = 0, waveIntroT = 0, waveIntroDur = 0, waveIntroText = '', waveIntroColor = '';
      let curtainArmed = false, curtainAt = 0, curtainWarnT = 0, curtainStyle = 'wall', curtainColor = 0xff66aa, curtainCross = null;
      let enemies = [], pendingSpawns = [], wave = 0, waveTimer = 0, waveDuration = 0, _frontLandedAt = -99, _liveCap = 0, _pumpHold = 0, waveGapT = 0, score = 0, frame = 0;
      const log = { spawns: [], waves: [], clears: [], curtains: [] };
      const bullets = { spawnDir(x, z, dx, dz, p, color, f, o, h, tr, sm) { log.curtains.at(-1)[1].push([x, z, dx, dz, sm, color]); } };
      ${FNS}
      depthLookIndex = () => 0;
      const fire1x = fireArenaCurtain;
      fireArenaCurtain = (style, side) => { log.curtains.push([frame, []]); return fire1x(style, side); };
      class Enemy {
        constructor(sc, type, x, z, sm, im) {
          Object.assign(this, { type, alive: true, _dying: false, hp: hpOf(type), _speedMult: sm, mesh: { scale: { x: 1, y: 1, z: 1, multiplyScalar() {} } } });
          log.spawns.push({ frame, en: this, type, x, z, sm, im });
        }
        setBoss() { this._isBoss = true; }
      }
      function spawnWave(carry = false, at = null) {     // at: lay out that one wave on its own
        if (carry) enemies = enemies.filter((e) => e.alive); else enemies = [];
        wave = at ?? wave + 1;
        log.waves.push([frame, wave, carry]);
        const { speedMult, intervalMult } = waveScaleFor(wave);
        const list = getEnemySchedule(wave);
        ${ROUND}
        const total = list.length, DOORS = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
        pendingSpawns = [];
        ${PLACE}
        const kind = waveKind(wave);
        ${ARM}
        return { list, pendingSpawns, curtainArmed, curtainStyle, curtainAt };
      }
      if (!killScript) return { getEnemySchedule, spawnWave, waveKind, waveBudgetBase, waveScaleFor };
      spawnWave();
      return function frameStep() {
        frame++;
        waveTimer += dt;
        ${PUMP}
        for (const e of enemies) if (e._dying) { e._deathT -= dt; if (e._deathT <= 0) e._dying = false; }
        for (const e of killScript(enemies.filter((e) => e.alive), frame)) { e.alive = false; e._dying = true; e._deathT = 0.28; }
        ${CURT}
        const s0 = score;
        ${END}
        if (score !== s0) log.clears.push([frame, wave, score - s0]);
        return log;
      };`);
    const pure = (rng, seed, TU = T1flat) => run1x(TU, EnemyType, rng, seed, 19, 11, () => 1, null, dt);
    const asEntry1 = (e) => [e.type, e.t, e.count ?? 1, !!e.shooter, e.slot ?? null, !!e.boss, e.elite ? 'elite' : e.elitelite ? 'elitelite' : '-', e.affix ?? null, e.front ?? null];
    const asEntry2 = (e) => [e.kind, e.t, e.count ?? 1, !!e.shooter, e.slot ?? null, !!e.boss, e.variant === 'elite' ? 'elite' : e.variant === 'elitelite' ? 'elitelite' : '-', e.affix ?? null, e.front ?? null];
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const even = W.pulses.evenFronts;

    // the data: our tables are 1.x's rows
    const Wx = T1.waves;
    check('1.x oracle: the pool is 1.x\'s, entry for entry, in draw order', same(W.pool, Object.entries(Wx.pool).map(([n, [m, c]]) => [key(n), m, c])));
    check('1.x oracle: the shooters and the affixes are 1.x\'s', same(W.shooters, Wx.shooters.map(key)) && same(W.affixes, Wx.affixes));
    check('1.x oracle: the rhythm, round clocks and fronts are 1.x\'s',
      ['bossEvery', 'spikeEvery', 'curtainEvery', 'curtainFrom', 'swarmEvery', 'swarmFrom'].every((k) => W.rhythm[k] === Wx.rhythm[k]) &&
      ['normal', 'swarm', 'spike', 'boss', 'curtain'].every((k) => W.round[k] === Wx.round[k]) &&
      ['count', 'span', 'stagger', 'swarmStagger', 'pullIn', 'pullGap'].every((k) => W.pulses[k] === Wx.pulses[k]) && same(W.pulses.byKind, Wx.pulses.byKind));
    check('1.x oracle: the budget, caps, shooter plan and variant tables are 1.x\'s',
      ['base', 'ramp', 'post', 'knee', 'slack', 'min'].every((k) => W.budget[k] === Wx.budget[k]) && same(W.budget.early, Wx.budget.early) &&
      ['boss', 'spike', 'swarm', 'breather', 'normal'].every((k) => W.budget.kind[k] === Wx.budget.kind[k]) &&
      same(W.caps.swarm, Wx.caps.swarm) && same(W.caps.normal, Wx.caps.normal) && W.caps.liveMult === Wx.caps.liveMult && W.caps.childMult === Wx.caps.childMult &&
      same(W.shooterPlan, Wx.shooterPlan) && same(W.variants.normal, Wx.variants.normal) && same(W.variants.swarm, Wx.variants.swarm) &&
      ['eliteCost', 'eliteliteCost', 'twinCost', 'swarmCostMax'].every((k) => W.variants[k] === Wx.variants[k]) &&
      W.variants.group.base === Wx.variants.group.base && W.variants.group.rand === Wx.variants.group.rand);

    // the numbers, bit for bit
    {
      const o = pure(Math.random, 1);
      let ok = true;
      for (let n = 1; n <= 80; n++) {
        const k = o.waveKind(n), br = k === 'normal' && o.waveKind(n - 1) !== 'normal';
        const kk = k === 'boss' || k === 'spike' || k === 'swarm' ? k : br ? 'breather' : 'normal';
        const a = o.waveScaleFor(n), b = A.waveScale(n);
        if (k !== A.waveKind(n) || o.waveBudgetBase(n, kk) !== A.budgetFor(n) || a.speedMult !== b.speedMult || a.intervalMult !== b.intervalMult) ok = false;
      }
      check('1.x oracle: waves 1–80 have 1.x\'s kind, budget, speed and fire-clock scale, bit for bit', ok);
    }

    // the schedule, the placement and the curtain's arming, every draw
    const compare = (seeds, waves) => {
      let bad = null, n = 0;
      for (const s of seeds) for (const wv of waves) {
        const r1 = makeRng(s * 7919 + wv), r2 = makeRng(s * 7919 + wv);
        const x = pure(r1.next, s).spawnWave(false, wv);
        const plan = A.schedule(wv, r2, s), q = A.layout(plan, r2), c = A.armCurtain(wv, plan.kind, r2);
        const p1 = x.pendingSpawns.map((p) => [p.type, p.delay, p.angle, p.clusterOffset?.x ?? 0, p.clusterOffset?.z ?? 0, p.shooter, p.boss, p.front ?? null, p.speedMult, p.intervalMult, p.elite ? 'elite' : p.elitelite ? 'elitelite' : '-', p.affix]);
        const p2 = q.map((p) => [p.kind, p.delay, p.angle, p.ox, p.oz, p.shooter, p.boss, p.front, p.speedMult, p.intervalMult, p.variant === 'elite' ? 'elite' : p.variant === 'elitelite' ? 'elitelite' : '-', p.affix]);
        n += p1.length;
        if (!same(x.list.map(asEntry1), plan.list.map(asEntry2)) || !same(p1, p2) || x.curtainArmed !== c.armed || x.curtainStyle !== c.style ||
            x.curtainAt !== c.at || r1.state !== r2.state) { bad ??= `seed ${s} wave ${wv}`; }
      }
      return { bad, n };
    };
    const SEEDS1 = Array.from({ length: 120 }, (_, i) => i + 1), WAVES1 = Array.from({ length: 48 }, (_, i) => i + 1);
    W.pulses.evenFronts = false;
    {
      const r = compare(SEEDS1, WAVES1);
      check(`1.x oracle: 120 seeds × waves 1–48 draw 1.x's schedule, placement and curtain arming, every field and every rng draw (${r.n} bodies)`, !r.bad, r.bad);
      // the oracle is not vacuous: a nudged price, fan or arming chance is seen
      for (const [what, obj, k, v] of [['an elite\'s price', W.variants, 'eliteCost', 1.7], ['the group fan', W.variants.group, 'spread', 1.4],
                                       ['the curtain\'s chance', W.arenaCurtain, 'chance', 0.5], ['the shooter gap', W.shooterPlan, 'gap', 2.4]]) {
        const keep = obj[k]; obj[k] = v;
        const m = compare(SEEDS1.slice(0, 20), WAVES1);
        obj[k] = keep;
        check(`1.x oracle: control — nudging ${what} is caught`, !!m.bad);
      }
    }
    {
      // with the real depth table the first depth (waves 1–8) has no
      // favourites, so even unneutralised 1.x draws the same
      let ok = true;
      for (const s of SEEDS1) for (let wv = 1; wv <= 8; wv++) {
        const r1 = makeRng(s), r2 = makeRng(s);
        if (!same(pure(r1.next, s, T1).getEnemySchedule(wv).map(asEntry1), A.schedule(wv, r2, s).list.map(asEntry2))) ok = false;
      }
      check('1.x oracle: waves 1–8 match 1.x with its real depth table too (THE SURFACE favours nobody)', ok);
    }
    W.pulses.evenFronts = even;
    {
      // the spec's even fronts (arcade-mode.md §2.7 trap) move the mob's
      // times and nothing else: same bodies, same draws, same shooters
      let ok = true, moved = 0;
      for (const s of SEEDS1) for (const wv of WAVES1) {
        const r1 = makeRng(s), r2 = makeRng(s);
        const a = pure(r1.next, s).getEnemySchedule(wv), b = A.schedule(wv, r2, s).list;
        const strip = (L, f) => L.map(f).map((e) => (e[8] == null ? e : [...e.slice(0, 1), null, ...e.slice(2, 8), null])).sort((x, y) => JSON.stringify(x) < JSON.stringify(y) ? -1 : 1);
        if (!same(strip(a, asEntry1), strip(b, asEntry2)) || r1.state !== r2.state) ok = false;
        if (!same(a.map(asEntry1), b.map(asEntry2))) moved++;
      }
      check(`1.x oracle: the even fronts change only when the mob lands (${moved} of ${SEEDS1.length * WAVES1.length} waves retimed)`, ok && (even ? moved > 0 : moved === 0));
    }

    // the round itself, in lockstep: 1.x's pump, deaths, curtain and round
    // end against the director, the same kills on the same frames
    {
      const port = (seed, killScript, arena) => {
        const w = { seed, mode: 'arcade', rng: makeRng(seed), hx: arena.hx, hz: arena.hz, hero: { x: 0, z: 0 }, gels: [], events: [],
                    score: 0, wave: 1, nextMilestone: Infinity, nextId: 1, time: 0, tick: 0 };
        const log = { spawns: [], waves: [], clears: [], curtains: [] };
        const api = {
          ringPoint: (w, a, frac) => ({ x: Math.cos(a) * w.hx * frac, z: Math.sin(a) * w.hz * frac }),
          spawn(w, kind, x, z, o = {}) { const g = { kind, x, z, o, alive: true, isBoss: !!o.isBoss }; w.gels.push(g); log.spawns.push({ frame: w.tick, g }); return g; },
          clamp() {},
          fire: { curtain(w, x, z, lx, lz, dx, dz, slots, spacing, gaps, opts) {
            const b = [];
            for (let s = 0; s < slots; s++) if (!gaps.has(s)) { const t = (s - (slots - 1) / 2) * spacing; b.push([x + lx * t, z + lz * t, dx, dz, opts.speedMult, opts.color]); }
            log.curtains.push([w.tick - 1, b]);       // fired at this step's start = 1.x's last frame's end
          } },
        };
        w.dir = arcade.create(w, api);
        return () => {
          w.tick++; w.events.length = 0;
          arcade.step(w, dt, api);
          for (const e of w.events) {
            if (e.type === 'wave') log.waves.push([w.tick - 1, e.wave, e.carry]);
            if (e.type === 'clear') log.clears.push([w.tick - 1, e.wave, e.bonus]);
          }
          for (const g of killScript(w.gels.filter((g) => g.alive), w.tick)) { g.alive = false; arcade.onKill(w, g, api); }
          w.gels = w.gels.filter((g) => g.alive);
          return log;
        };
      };
      const scripts = {
        'nobody dies': () => () => [],
        'the oldest every 2 s': () => (alive, f) => (f % 120 === 0 && alive.length ? [alive[0]] : []),
        'the floor every 6 s': () => (alive, f) => (f % 360 === 0 ? alive : []),
        'the floor every second': () => (alive, f) => (f % 60 === 0 ? alive : []),
        'two every 7 frames': () => (alive, f) => (f % 7 === 0 ? alive.slice(0, 2) : []),
        'seeded picks': (seed) => { const r = makeRng(seed ^ 0xabcdef); return (alive) => (alive.length && r.next() < 0.04 ? [alive[Math.floor(r.next() * alive.length)]] : []); },
      };
      const hpOf = (k) => T.species[k].hp;
      const lockstep = (seeds, secs) => {
        let bad = null, spawns = 0, clears = 0, curtains = 0, waves = 0;
        for (const arena of [T.arena.landscape, T.arena.portrait]) for (const seed of seeds) for (const [name, mk] of Object.entries(scripts)) {
          const r1 = makeRng(seed), x = run1x(T1flat, EnemyType, r1.next, seed, arena.hx, arena.hz, hpOf, mk(seed), dt), y = port(seed, mk(seed), arena);
          let L1, L2;
          for (let f = 0, n = Math.round(secs / dt); f < n; f++) { L1 = x(); L2 = y(); }
          const s1 = L1.spawns.map((s) => [s.frame, s.type, s.x, s.z, s.sm, s.im, s.en._isBoss ? s.en.hp : 0]);
          const s2 = L2.spawns.map((s) => [s.frame, s.g.kind, s.g.x, s.g.z, s.g.o.speedMult, s.g.o.intervalMult, s.g.o.isBoss ? s.g.o.hp : 0]);
          const c = (L) => L.curtains.map(([f, b]) => [f, b.map((v) => v.map((u) => +u.toFixed(9)))]);
          spawns += s1.length; clears += L1.clears.length; curtains += L1.curtains.length; waves = Math.max(waves, L1.waves.length);
          if (!same(s1, s2) || !same(L1.waves, L2.waves) || !same(L1.clears, L2.clears) || !same(c(L1), c(L2))) bad ??= `${arena.hx}×${arena.hz}, seed ${seed}, ${name}`;
        }
        return { bad, spawns, clears, curtains, waves };
      };
      W.pulses.evenFronts = false;
      // 1.x had no boss fight on the clock (v42): its boss wave carries on its clock
      W.bossFight.on = false;
      const r = lockstep([1, 2, 3, 4, 5, 6], 240);
      check(`1.x oracle: the round in lockstep with 1.x's loop — every spawn's frame, place and scale, every wave start, carry and clear, every curtain bullet ` +
            `(${r.spawns} spawns, ${r.clears} clears, ${r.curtains} curtains, to wave ${r.waves})`, !r.bad && r.clears > 100 && r.curtains > 50, r.bad);
      const keep = W.clear.dying; W.clear.dying = keep - dt;
      check('1.x oracle: control — a death beat one frame short is caught', !!lockstep([1], 60).bad);
      W.clear.dying = keep;
      W.bossFight.on = true;
      W.pulses.evenFronts = even;
    }
  }
}

// ── in the real world ──────────────────────────────────────────────
{
  const { createWorld, step, api } = await import('../js/sim/world.js?v=159');
  const { DIRECTORS } = await import('../js/sim/director/index.js?v=159');
  check('ARCADE and HARDCADE run this director', DIRECTORS.arcade === arcade && DIRECTORS.hardcade === arcade);
  const IDLE = { mx: 0, mz: 0, ax: 0, az: 0, aim: false, fire: false, dash: false };
  const live = (seed) => {
    const w = createWorld({ seed, mode: 'arcade' }), log = [];
    for (let i = 0; i < Math.round(32 / dt) && !w.over; i++) {
      w.hero.mercy = 1;                                   // the hero stands, untouchable
      step(w, IDLE);
      for (const e of w.events) if (e.type === 'wave' || e.type === 'clear' || e.type === 'spawn') log.push(`${w.tick}:${e.type}:${e.wave ?? e.kind}`);
    }
    return { w, log };
  };
  const a = live(11);
  check('in the real world, the waves roll on the clock', a.w.wave === 3 && a.log.filter((x) => x.includes(':wave:')).length === 3, a.log.filter((x) => x.includes(':wave:')).join(' '));
  check('in the real world, bodies arrive with their wave\'s scale',
    // (v105: × its size class's own speed, TUNING.sizes)
    a.w.gels.length > 0 && a.w.gels.every((g) => { const k = g.speedMult / (T.sizes.classes[g.size]?.speed ?? 1); return g.child || [1, 2, 3].some((n) => near(k, A.waveScale(n).speedMult) || near(k, A.waveScale(n).speedMult * 1.2)); }));
  check('in the real world, a run replays from its seed', live(11).log.join() === a.log.join());
  // and a real clear: everything dead with nothing queued
  const w = createWorld({ seed: 13, mode: 'arcade' });
  let guard = 0;
  do { w.hero.mercy = 1; step(w, IDLE); } while (w.dir.queue.length && guard++ < 2000);
  for (const g of w.gels.slice()) api.kill(w, g, 'env');
  const before = w.score; let clear = null;
  for (let i = 0; i < 60 && !clear; i++) { w.hero.mercy = 1; step(w, IDLE); clear = w.events.find((e) => e.type === 'clear'); for (const g of w.gels.slice()) api.kill(w, g, 'env'); }
  check('in the real world, a cleared floor pays 500 × the wave', clear && clear.bonus === 500 * clear.wave && w.score - before >= clear.bonus, JSON.stringify(clear));
}

console.log(failed ? `\n✗ director: ${failed} failed, ${passed} passed` : `✔ director: ${passed} checks`);
process.exit(failed ? 1 : 0);
