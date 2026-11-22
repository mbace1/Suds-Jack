#!/usr/bin/env node
// pickups.mjs — 1.x's classic pickups (js/sim/pickups.js), in bare node: the
// floor's drops, the gates, the cargo convoy and the bounty, held to
// docs/port-1x/arcade-mode.md §6.1-§6.6 and to 1.x's own numbers (each check
// cites 1.x v268's file:line; when 1.x's tree is here, its source is read to
// confirm those lines still say so). Plus 2.0's two rules: the clean sweep's
// DASH pod, and a hit costing a dash level.
//
// Usage: node test/pickups.mjs           (exit 1 on any failure)
import { existsSync, readFileSync } from 'node:fs';
import { createWorld, step, api } from '../js/sim/world.js?v=162';
import { TUNING as T } from '../js/tuning.js?v=162';
import * as PK from '../js/sim/pickups.js?v=162';
import { invincible } from '../js/sim/hero.js?v=162';
import { waveKind } from '../js/sim/director/arcade.js?v=162';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const P = T.pickups, G = P.gate, C = P.convoy, B = P.bounty, H = T.hero, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 0, az: 0, aim: false, fire: false, dash: false };
const QUIET = { step() {} };
const W = (o = {}) => { const w = createWorld({ seed: 1, ...o }); w.director = QUIET; return w; };
const run = (w, n, inp = IDLE) => { for (let i = 0; i < n && !w.over; i++) step(w, typeof inp === 'function' ? inp(i) : inp); };
// begin wave n through the real step, the way the director does: its 'wave'
// event at the top of a step, then quiet
const begin = (w, n, inp = IDLE) => {
  w.director = { step(w) { w.wave = n; w.events.push({ type: 'wave', wave: n, kind: waveKind(n), carry: false }); w.director = QUIET; } };
  step(w, inp);
};
const evs = (w, type) => w.events.filter((e) => e.type === type);
// a gate put down by hand where a test wants it (the fields makeGate gives one)
const gateAt = (w, x, z, angle, { risk = false, drift = false } = {}) => {
  const g = { id: 900 + w.pk.gates.length, x, z, px: x, pz: z, angle, ax: -Math.sin(angle), az: Math.cos(angle), risk, green: true, alive: true, cd: 0, retireT: null, drift, dx: 0, dz: 0 };
  w.pk.gates.push(g); return g;
};
const mothBullet = (w, m) => w.bullets.push({ hero: true, x: m.x, z: m.z, px: m.x, pz: m.z, vx: 0, vz: 0, r: T.bullets.heroRadius, life: 1, dead: false });

// ── 1.x's own source says so (read-only; TOKO_1X overrides the path) ──
{
  const ROOT1 = process.env.TOKO_1X || new URL('../../toko-drop', import.meta.url).pathname;   // 1.x sits beside 2.0 in the repo
  if (!existsSync(`${ROOT1}/js/main.js`)) console.log(`  · 1.x source check skipped: no 1.x tree at ${ROOT1} (set TOKO_1X)`);
  else {
    const read = (f) => readFileSync(`${ROOT1}/js/${f}`, 'utf8').split('\n');
    const src = { 'main.js': read('main.js'), 'tuning.js': read('tuning.js'), 'player.js': read('player.js') };
    const LINES = [
      ['main.js', 2245, 'this._life = 9.0'], ['main.js', 2283, '0.6 + Math.sin(t * 3) * 0.15'], ['main.js', 2285, 'dt * 1.6'],
      ['main.js', 2287, '0.5 + 0.4 * Math.sin(t * 5)'], ['main.js', 2291, 'this._life < 2.5'], ['main.js', 2291, 'Math.sin(this._life * 16) > 0 ? 1 : 0.12'],
      ['main.js', 2256, ': 0.38'], ['main.js', 2273, ': 0.8'], ['main.js', 2274, 'wpDef ? 0.9 : 0.62'],
      ['main.js', 11242, '< 0.8 + PLAYER_RADIUS'], ['main.js', 11249, 'grantInvincibility(3.0)'], ['main.js', 11251, 'player.hp + 1'],
      ['main.js', 11268, 'grantFireRateBoost(8.0)'], ['main.js', 11273, '250 + wave * 25'], ['main.js', 11280, 'scoreMultT = 10.0'],
      ['main.js', 2006, 'hp: 0xff4466, invincible: 0xffffff, firerate: 0xff88aa, scoremult: 0xffdd22, score: 0x88ff88'],
      ['main.js', 2240, "hp: '+', invincible: '★', firerate: '»', scoremult: '×2', score: '$'"], ['main.js', 2004, "['S', 'B', 'L', 'R', 'G']"],
      ['main.js', 4422, '(scoreMultT > 0 ? 2 : 1)'], ['main.js', 10860, '(scoreMultT > 0 ? 2 : 1)'], ['player.js', 416, '? 0.4 : 1'],
      ['tuning.js', 160, 'favourUnheld: 0.7'], ['tuning.js', 461, 'gateRetire: 4'],
      ['main.js', 7315, 'wave >= 3'], ['main.js', 7319, 'live.length >= 2'], ['main.js', 7321, 'wave >= 5 && rng() < 0.35, wave >= 10'],
      ['main.js', 1680, '(Math.random() - 0.5) * HALF_X * 1.5'], ['main.js', 1681, '(Math.random() - 0.5) * HALF_Z * 1.5'], ['main.js', 1682, 'Math.random() * Math.PI'],
      ['main.js', 1690, 'Math.cos(da) * 0.4'], ['main.js', 1695, 'halfSep = 2'], ['main.js', 1732, 'Math.floor(t / 1.6) % 2 === 0'],
      ['main.js', 1740, 'HALF_X - 3'], ['main.js', 1741, 'HALF_Z - 3'], ['main.js', 1768, 'Math.abs(para) < 2.0 && perpDist < 0.2 + radius'],
      ['main.js', 11165, 'player.dashing'], ['main.js', 11171, 'DUD! GREEN MEANS GO'], ['main.js', 11184, "['hp', 'invincible', 'firerate', 'scoremult']"],
      ['main.js', 11188, 'g._x + 1.2'], ['main.js', 11189, 'GREEN RUSH! DOUBLE PRIZE'], ['main.js', 11192, 'gateChainT > 0 ? gateChainN + 1 : 1'],
      ['main.js', 11193, 'gateChainT = 6.0'], ['main.js', 11195, '500 * gateChainN'], ['main.js', 11206, 'e.radius * 0.5'],
      ['main.js', 11208, "onKill(e, 'env')"], ['main.js', 11210, '_dmgCooldown = 0.5'], ['main.js', 5310, "'tokoDropGateUsed'"],
      ['main.js', 8192, '3 + rng() * 5'], ['main.js', 2318, '3 + Math.floor(rng() * 3)'], ['main.js', 2321, '-(HALF_Z+3)'],
      ['main.js', 2326, '5.5 + rng() * 2'], ['main.js', 2331, '3 + rng() * 5'], ['main.js', 2332, '0.7 + rng() * 1.0'],
      ['main.js', 2339, '* 1.4'], ['main.js', 2341, 'bodyR = 0.32'], ['main.js', 2379, 'arena.contains(p.x, p.z, -5)'],
      ['main.js', 10766, '+ 0.32'], ['main.js', 10786, 'pu._life = 12.0'], ['main.js', 10799, '[0.55, 0.25]'],
      ['main.js', 10805, '0.8 + Math.random() * 0.6'], ['main.js', 10808, 'pu._life = 7.0'],
      ['main.js', 8149, 'wave >= 4 && wave % 3 === 1 && kind !== \'boss\''], ['main.js', 9427, 'bountyArm && !s.boss'], ['main.js', 9430, 'bountyT = 8'],
      ['main.js', 4436, 'bountyT > 0'], ['main.js', 4437, '(1500 + wave * 100) * (scoreMultT > 0 ? 2 : 1)'], ['main.js', 4443, 'pod._life = 10.0'],
      ['main.js', 2084, 'hitCostsLevel'], ['main.js', 2086, 'held.level !== 2'],
    ];
    const bad = LINES.filter(([f, n, text]) => !(src[f][n - 1] || '').includes(text));
    check(`1.x's source holds every number cited here (${LINES.length} lines)`, !bad.length, bad.map(([f, n, t]) => `${f}:${n} "${t}"`).join('; '));
  }
}

// ── §6.1 the record: 1.x's numbers ────────────────────────────────
{
  check('a drop lives 9 s (main.js:2245)', P.life === 9);
  check('the last 2.5 s blink hard: sin(life × 16) > 0 ? 1 : 0.12 (main.js:2291)', P.blink.last === 2.5 && P.blink.rate === 16 && P.blink.low === 0.12);
  check('it bobs 0.6 + 0.15 sin(3t) and spins 1.6 rad/s (main.js:2283-2285)', P.bob.y === 0.6 && P.bob.amp === 0.15 && P.bob.rate === 3 && P.spin === 1.6);
  check('its orb is r 0.38, pulsing 0.5 + 0.4 sin(5t) (main.js:2256, 2287)', P.orb === 0.38 && P.pulse.base === 0.5 && P.pulse.amp === 0.4 && P.pulse.rate === 5);
  check('its badge is 0.9 (a pod) or 0.8, lifted 0.9 or 0.62 (main.js:2273-2274)', P.badge.pod === 0.9 && P.badge.other === 0.8 && P.badge.liftPod === 0.9 && P.badge.liftOther === 0.62);
  check('taken within 0.8 + the hero\'s 0.5 = 1.3 (main.js:11242)', near(H.pickup.reach + H.radius, 1.3));

  const L = PK.itemLook({ life: 5 }, Math.PI / 6);
  check('the look: at t = π/6 it stands 0.75 up (the bob\'s crest)', near(L.y, 0.75) && L.badge === 1);
  check('the look: the orb at its brightest is 0.9', near(PK.itemLook({ life: 5 }, Math.PI / 10).opacity, 0.9));
  // sin(16 × 2.4) = sin(38.4) > 0, sin(16 × 2.3) = sin(36.8) < 0
  const on = PK.itemLook({ life: 2.4 }, 0), off = PK.itemLook({ life: 2.3 }, Math.PI / 10);
  check('the look: under 2.5 s left orb and badge blink 1 / 0.12 on sin(16 · life)', on.badge === 1 && off.badge === 0.12 && near(off.opacity, 0.9 * 0.12));
  check('the look: above 2.5 s it never blinks', [2.6, 4, 8.9].every((l) => PK.itemLook({ life: l }, 0).badge === 1));

  const w = W();
  PK.place(w, 5, 0, { type: 'hp' });
  const it = w.pk.items[0];
  check('a drop is placed with 9 s to live', it.life === 9 && it.max === 9);
  run(w, 538);
  const stays = w.pk.items.length === 1;
  run(w, 4);
  check('…and goes when they run out (540 steps)', stays && w.pk.items.length === 0);
  const d = W(); PK.place(d, 5, 0, { type: 'hp' }, 9, 1.2, -0.6); run(d, 60);
  check('a drifting drop drifts at its own (vx, vz)', near(d.pk.items[0].x, 6.2, 1e-9) && near(d.pk.items[0].z, -0.6, 1e-9));

  const inR = W(); inR.hero.lives = 2; PK.place(inR, 1.29, 0, { type: 'hp' }); step(inR, IDLE);
  const outR = W(); outR.hero.lives = 2; PK.place(outR, 1.31, 0, { type: 'hp' }); step(outR, IDLE);
  check('the hero\'s centre within 1.3 takes it; 1.31 does not', inR.hero.lives === 3 && outR.hero.lives === 2 && outR.pk.items.length === 1);
  const said = evs(inR, 'pickup').length === 1 && inR.pk.items[0]?.taken; step(inR, IDLE);
  check('a drop taken goes from the floor (at the next update, as 1.x\'s)', said && inR.pk.items.length === 0);

  // the glyph badges (main.js:2238-2241, pods their id)
  const g = (type, fam) => PK.glyphOf({ type, fam });
  check('every pickup wears a glyph: + ★ » ×2 $, the pod its letter, the DASH pod D',
    g('hp') === '+' && g('invincible') === '★' && g('firerate') === '»' && g('scoremult') === '×2' && g('score') === '$' && g('dash') === 'D' &&
    ['spread', 'burst', 'laser', 'rapid', 'shotgun'].map((f) => g('pod', f)).join('') === 'SBLRG');
  const c = (type, fam) => PK.colorOf({ type, fam });
  check('and its colour: NON_WEAPON_COLORS, the pod its L1 orb (main.js:1986-1995, 2006)',
    c('hp') === 0xff4466 && c('invincible') === 0xffffff && c('firerate') === 0xff88aa && c('scoremult') === 0xffdd22 && c('score') === 0x88ff88 && c('pod', 'laser') === 0xff3355);
}

// ── §6.2 the types and what they do ───────────────────────────────
{
  const take = (setup, what) => { const w = W(); setup?.(w); PK.place(w, 0.5, 0, what); step(w, IDLE); return w; };
  const a = take(null, { type: 'pod', fam: 'spread' });
  check('a pod equips its family at level 1 (equipWeapon)', a.hero.weapon?.fam === 'spread' && a.hero.weapon.level === 1 && evs(a, 'weapon').length === 1);
  PK.place(a, 0.5, 0, { type: 'pod', fam: 'spread' }); step(a, IDLE);
  check('…the same family again: level 2 (main.js:2065)', a.hero.weapon.level === 2);
  PK.place(a, 0.5, 0, { type: 'pod', fam: 'laser' }); step(a, IDLE);
  check('…another family: back to level 1 of that one', a.hero.weapon.fam === 'laser' && a.hero.weapon.level === 1);
  const hp = take((w) => { w.hero.lives = 1; }, { type: 'hp' });
  const full = take(null, { type: 'hp' });
  check('hp: +1, to the max of 3 (main.js:11251)', hp.hero.lives === 2 && full.hero.lives === 3);
  const inv = take(null, { type: 'invincible' });
  check('invincible: 3.0 s of i-frames (main.js:11249)', inv.hero.invinc === 3 && invincible(inv.hero) && inv.hero.mercy === 0);
  run(inv, 170);
  const still = invincible(inv.hero);
  run(inv, 12);
  check('…and they run out at 3.0 s', still && !invincible(inv.hero));
  const fr = take(null, { type: 'firerate' });
  check('firerate: 8.0 s at the gun\'s period × 0.4 (main.js:11268, player.js:416)', fr.hero.rapid === 8 && H.rapidMult === 0.4);
  const sm = take(null, { type: 'scoremult' });
  // v53: a bystander on the floor, so no kill here is the one that empties it (that one heats a level)
  const byst = api.spawn(sm, 'globbo', -12, -6); byst.state = 'active'; byst.speedMult = 0;
  check('scoremult: 10 s of × 2 (main.js:11280)', sm.pk.multT === 10 && PK.scoreMult(sm) === 2);
  api.kill(sm, api.spawn(sm, 'globbo', 8, 0));
  check('…a kill pays 100 × the streak × 2 (main.js:4422)', sm.score === 200, `${sm.score}`);
  sm.bullets.push({ hero: false, x: 1.0, z: 0, px: 1.0, pz: 0, vx: 0, vz: 0, r: 0.15, life: 1, dead: false, grazed: false, speed: 0 });
  const s0 = sm.score; step(sm, IDLE);
  check('…a graze pays 25 × 2 (main.js:10860)', sm.score - s0 === 50, `${sm.score - s0}`);
  run(sm, 597);
  const s1 = sm.score; api.kill(sm, api.spawn(sm, 'globbo', 8, 0));
  const doubledLate = sm.score - s1 === 200;                               // 100 × 2 at ×1 heat (v51: no streak)
  run(sm, 4);
  const s2 = sm.score; api.kill(sm, api.spawn(sm, 'globbo', 8, 0));
  check('…for 10 s, and not after', doubledLate && sm.score - s2 === 100 && PK.scoreMult(sm) === 1, `${sm.score - s1}`);
  const nug = take((w) => { w.wave = 5; }, { type: 'score' });
  check('a score nugget pays 250 + 25 × the wave (main.js:11273)', nug.score === 375, `${nug.score}`);
  const nug2 = take((w) => { w.wave = 5; w.pk.multT = 5; }, { type: 'score' });
  check('…× 2 under the multiplier', nug2.score === 750, `${nug2.score}`);
  const clr = W(); clr.pk.multT = 5;
  check('the multiplier never touches the clear bonus (main.js:11392): api.score is as given', (api.score(clr, 500), clr.score === 500));
}

// ── §6.4 gates ─────────────────────────────────────────────────────
{
  check('gates: from wave 3; with 2 standing the oldest retires over 4 s (main.js:7315-7321; tuning.js:461)', G.from === 3 && G.keep === 2 && G.retire === 4);
  check('…two posts 4 apart, the laser a capsule |along| < 2, |across| < 0.2 + r (main.js:1695, 1768)', G.half === 2 && G.thick === 0.2);
  check('…risk from wave 5 at 35% on a 1.6 s cycle; drift from wave 10 at 0.4 u/s, 3 inside the walls (main.js:7321, 1690, 1732, 1740)',
    G.risk.from === 5 && G.risk.chance === 0.35 && G.risk.cycle === 1.6 && G.drift.from === 10 && G.drift.speed === 0.4 && G.drift.inset === 3);
  check('…a dash through drops one of hp / invincible / firerate / scoremult; a green one a second 1.2 over (main.js:11184-11188)',
    G.types.join() === 'hp,invincible,firerate,scoremult' && G.second === 1.2 && G.dropLife === P.life);
  check('…the chain pays 500 × N within 6 s; the laser 1 a body, a gate a 0.5 s, at half its radius (main.js:11193-11210)',
    G.chain.window === 6 && G.chain.pay === 500 && G.zap.damage === 1 && G.zap.every === 0.5 && G.zap.reach === 0.5);

  // arrival: one a wave from 3, the oldest of two retiring as the next stands
  const w = W();
  begin(w, 1); begin(w, 2);
  const none = w.pk.gates.length === 0;
  begin(w, 3); const at3 = w.pk.gates.length;
  run(w, 300); begin(w, 4); const at4 = w.pk.gates.length;
  run(w, 300); begin(w, 5);
  const at5 = w.pk.gates.length, retiring = w.pk.gates.filter((g) => g.retireT != null);
  check('no gate before wave 3; one at 3, two at 4', none && at3 === 1 && at4 === 2);
  check('at wave 5 the oldest retires (4 s) as the third stands', at5 === 3 && retiring.length === 1 && retiring[0] === w.pk.gates[0] && near(retiring[0].retireT, 4 - dt, 1e-12));
  run(w, 236); const before = w.pk.gates.length;
  run(w, 6);
  check('…and is gone 4 s later', before === 3 && w.pk.gates.length === 2, `${before} → ${w.pk.gates.length}`);
  let most = 0, live = 0;
  for (let n = 6; n <= 30; n++) { run(w, 300); begin(w, n); most = Math.max(most, w.pk.gates.length); live = Math.max(live, w.pk.gates.filter((g) => g.retireT == null).length); }
  check('so with the waves 4 s or more apart at most three stand, two of them live', most === 3 && live === 2, `${most} / ${live}`);
  // a wave inside 4 s of the last (a floor cleared fast) retires a second before the first is gone: 1.x's code does the same
  const fast = W(); for (const n of [3, 4, 5]) { run(fast, 300); begin(fast, n); } run(fast, 120); begin(fast, 6);
  check('…and a wave inside 4 s of the last can show a fourth for a moment, as 1.x\'s can', fast.pk.gates.length === 4 && fast.pk.gates.filter((g) => g.retireT == null).length === 2);

  // placement, risk and drift over many gates (main.js:1680-1691, 7321)
  let inside = true, angles = true, risk5 = 0, n5 = 0, risky = 0, drifted = 0, driftOk = true, early = 0;
  for (let s = 1; s <= 600; s++) {
    const v = W({ seed: s });
    for (const n of [3, 4, 5, 9, 10, 11]) {
      begin(v, n);
      const g = v.pk.gates.at(-1);
      if (Math.abs(g.x) > 0.75 * v.hx || Math.abs(g.z) > 0.75 * v.hz) inside = false;
      if (!(g.angle >= 0 && g.angle < Math.PI)) angles = false;
      if (n < 5 && g.risk) risky++;
      if (n >= 5) { n5++; if (g.risk) risk5++; }
      if (n < 10 && g.drift) early++;
      if (n >= 10) { if (g.drift) drifted++; if (!near(Math.hypot(g.dx, g.dz), 0.4, 1e-12)) driftOk = false; }
    }
  }
  check('a gate stands within ±0.75 of the half-extents, at an angle in [0, π)', inside && angles);
  check(`risk gates from wave 5 only, at 35% (${(risk5 / n5 * 100).toFixed(1)}% of ${n5})`, risky === 0 && Math.abs(risk5 / n5 - 0.35) < 0.03);
  check('drift gates from wave 10 only, every one of them, at 0.4 u/s', early === 0 && drifted === 1200 && driftOk);

  // the capsule
  const cap = W(), cg = gateAt(cap, 0, 0, 0);                              // angle 0: the laser runs along z
  check('the laser is hit along it within 2 of its centre', PK.hitsGate(cg, 0, 1.99, 0) && !PK.hitsGate(cg, 0, 2.01, 0));
  check('…and across it within 0.2 + r', PK.hitsGate(cg, 0.69, 0, 0.5) && !PK.hitsGate(cg, 0.71, 0, 0.5));
  const tilted = gateAt(cap, 3, 2, 0.8);
  check('…along (−sin a, cos a) at any angle', PK.hitsGate(tilted, 3 - Math.sin(0.8) * 1.9, 2 + Math.cos(0.8) * 1.9, 0) && !PK.hitsGate(tilted, 3 + Math.cos(0.8) * 0.5, 2 + Math.sin(0.8) * 0.5, 0.2));

  // the risk cycle, on the run's clock (1.x read the wall clock)
  const rc = W(), rg = gateAt(rc, 5, 5, 0, { risk: true });
  const at = (t) => { rc.time = t - dt; step(rc, IDLE); return rg.green; };
  check('a risk gate is green for 1.6 s, red for 1.6 s, and so on', at(0.5) && at(1.55) && !at(1.65) && !at(3.15) && at(3.25) && !at(4.9));

  // drift: bouncing 3 inside the walls
  const dr = W(), dg = gateAt(dr, dr.hx - 3.2, 0, 0, { drift: true }); dg.dx = 0.4;
  let maxX = 0; for (let i = 0; i < 600; i++) { step(dr, IDLE); maxX = Math.max(maxX, dg.x); }
  check('a drifting gate turns back once it is past 3 inside a wall', dg.dx < 0 && maxX < dr.hx - 3 + 0.4 * dt + 1e-9 && near(Math.hypot(dg.dx, dg.dz), 0.4));

  // DASHING through, never walking
  // across the laser's end (z 1.6), so the hero does not pick the prize up as it
  // lands: 1.x drops it at the gate's centre, and a dash through the middle,
  // within 1.3 of it, takes it the same frame (main.js:11185, 11238-11242)
  const dashAcross = (w, z = 1.6) => {
    const seen = []; w.hero.x = -1.5; w.hero.px = -1.5; w.hero.z = z; w.hero.pz = z;
    step(w, { ...IDLE, mx: 1, dash: true }); seen.push(...w.events);
    for (let i = 0; i < 10; i++) { step(w, { ...IDLE, mx: 1 }); seen.push(...w.events); }
    return seen;
  };
  const walk = W(), wg = gateAt(walk, 0, 0, 0);
  walk.hero.x = -1.5; run(walk, 60, { ...IDLE, mx: 1 });
  check('walking through a gate does nothing', wg.alive && walk.pk.items.length === 0 && walk.hero.x > 1);
  const dsh = W(), dg2 = gateAt(dsh, 0, 0, 0);
  const drops = dashAcross(dsh).filter((e) => e.type === 'drop');
  check('dashing through switches it off and drops one prize at its centre, for 9 s',
    !dg2.alive && drops.length === 1 && drops[0].x === 0 && drops[0].z === 0 && G.types.includes(drops[0].kind) && dsh.pk.items.length === 1 && dsh.pk.items[0].max === 9, JSON.stringify(drops));
  const mid = W(); gateAt(mid, 0, 0, 0);
  const midEv = dashAcross(mid, 0);
  check('…and a dash through its middle takes that prize the same step, as 1.x\'s did', midEv.some((e) => e.type === 'drop') && midEv.some((e) => e.type === 'pickup') && mid.pk.items.length === 0);
  const counts = {};
  for (let s = 1; s <= 2000; s++) { const v = W({ seed: s }); gateAt(v, 0, 0, 0); for (const e of dashAcross(v)) if (e.type === 'drop') counts[e.kind] = (counts[e.kind] || 0) + 1; }
  check(`…uniform over the four (${G.types.map((t) => `${t} ${counts[t]}`).join(', ')})`, G.types.every((t) => Math.abs(counts[t] / 2000 - 0.25) < 0.035));
  const green = W(), gg = gateAt(green, 0, 0, 0, { risk: true }); green.time = 0.2;
  const greenEv = dashAcross(green), gd = greenEv.find((e) => e.type === 'gateDash'), gdrops = greenEv.filter((e) => e.type === 'drop');
  check('a green risk gate drops two, the second 1.2 over (GREEN RUSH! DOUBLE PRIZE, 1.1 s)', !gg.alive && gdrops.length === 2 && gdrops[0].x === 0 && near(gdrops[1].x, 1.2) && gd?.green && gd.banner === 1.1, JSON.stringify(gdrops));
  const red = W(), rd = gateAt(red, 0, 0, 0, { risk: true }); red.time = 1.8;
  const redEv = dashAcross(red);
  const dud = redEv.find((e) => e.type === 'gateDash');
  check('a red one is a dud: switched off, nothing dropped (DUD! GREEN MEANS GO, 1.0 s)', !rd.alive && !redEv.some((e) => e.type === 'drop') && dud?.dud && dud.banner === 1.0);

  // the chain: another gate within 6 s pays 500 × N, × 2 under the multiplier
  const ch = W(); for (const x of [0, 6, 12, 18]) gateAt(ch, x, 0, 0);
  const pays = [];
  const dashAt = (x) => { ch.hero.x = x - 1.5; ch.hero.px = ch.hero.x; ch.hero.z = 1.6; ch.hero.pz = 1.6; ch.hero.dashCd = 0; ch.hero.dash = 0; step(ch, { ...IDLE, mx: 1, dash: true }); pays.push(...evs(ch, 'gateChain')); for (let i = 0; i < 10; i++) { step(ch, { ...IDLE, mx: 1 }); pays.push(...evs(ch, 'gateChain')); } };
  const sc0 = ch.score; dashAt(0); const first = ch.score - sc0;
  run(ch, 120); dashAt(6); run(ch, 120); ch.pk.multT = 10; dashAt(12);
  check('the gate chain: the second within 6 s pays 1000, a third 1500 × 2 under the multiplier',
    first === 0 && pays.length === 2 && pays[0].n === 2 && pays[0].pay === 1000 && pays[1].n === 3 && pays[1].pay === 3000, JSON.stringify(pays));
  run(ch, 400); ch.pk.multT = 0; pays.length = 0; dashAt(18);
  check('…a gate more than 6 s after the last starts it again: nothing paid', pays.length === 0 && ch.pk.chain.n === 1);
  ch.pk.chain.t = 3; begin(ch, 9);
  check('…and a new wave ends the chain (clearArenaObjectives, main.js:1849-1853)', ch.pk.chain.n === 0 && ch.pk.chain.t === 0);

  // the bodies on the laser
  const z = W(), zg = gateAt(z, 0, 0, 0);
  z.hero.x = 10; z.hero.z = 8; z.hero.mercy = 1e9;
  const body = api.spawn(z, 'globbo', 0.1, 0.5, { hp: 100 });
  const hitsAt = [];
  for (let i = 1; i <= 125; i++) { body.x = 0.1; body.z = 0.5; step(z, IDLE); if (evs(z, 'hit').some((e) => e.by === 'gate' && e.id === body.id)) hitsAt.push(i); }
  const gaps = hitsAt.slice(1).map((v, i) => v - hitsAt[i]);
  check('a body touching the laser takes 1 at most once a gate per 0.5 s', hitsAt[0] === 1 && gaps.every((g) => g === 30 || g === 31) && body.hp === 100 - hitsAt.length, `${hitsAt.join(',')}`);
  const two = W(); gateAt(two, 0, 0, 0); two.hero.x = 10; two.hero.mercy = 1e9;
  const b1 = api.spawn(two, 'globbo', 0, 1, { hp: 100 }), b2 = api.spawn(two, 'globbo', 0, -1, { hp: 100 });
  for (let i = 0; i < 29; i++) { b1.x = 0; b1.z = 1; b2.x = 0; b2.z = -1; step(two, IDLE); }
  check('…one body a gate in that 0.5 s, not every body on it', b1.hp + b2.hp === 199);
  const off = W(); gateAt(off, 0, 0, 0); const edge = 0.2 + T.species.globbo.radius * 0.5;
  off.hero.x = edge; off.hero.z = 10; off.hero.mercy = 1e9;            // straight up the laser: the bodies walk along it
  const far = api.spawn(off, 'globbo', edge + 0.05, 1, { hp: 100 }), close = api.spawn(off, 'globbo', edge - 0.05, -1, { hp: 100 });
  step(off, IDLE);
  check('…touching is its centre within 0.2 + half its radius', far.hp === 100 && close.hp === 99, `${far.hp} ${close.hp}`);
  const kz = W(); gateAt(kz, 0, 0, 0); kz.hero.x = 10; kz.hero.mercy = 1e9;
  const weak = api.spawn(kz, 'globbo', 0, 0, { hp: 1 });
  step(kz, IDLE);
  const kill = evs(kz, 'kill')[0];
  check('…and one it kills is an \'env\' kill: it scores', !weak.alive && kill?.src === 'env' && kz.score === 100);
  const hc = W({ mode: 'hardcade' }); hc.wave = 5; gateAt(hc, 0, 0, 0); hc.hero.x = 10; hc.hero.mercy = 1e9;
  api.spawn(hc, 'spittor', 0, 0, { hp: 1 });
  step(hc, IDLE);
  check('…and in HARDCADE never bites back (main.js:4385-4398)', hc.kills === 1 && !hc.bullets.some((b) => b.revenge) && !evs(hc, 'revenge').length);

  // a SLUG on a beam takes its segment rule where the laser crosses it, not
  // at the hero: held with its head on the beam and the hero 9 away beside
  // its middle (where the hero's segment would split it), each zap shortens
  // it from the head, it never splits, and its death is the laser's ('env',
  // no revenge in HARDCADE). (1.x's NaN _slugHit is a bug: §6.10.)
  for (const mode of ['arcade', 'hardcade']) {
    const sw = W({ mode }); sw.wave = 8; gateAt(sw, 0, 0, 0);
    const slug = api.spawn(sw, 'slug', 0, 0), n0 = slug.s.chain.length;
    const mid = slug.s.chain[Math.floor(n0 / 2)];
    sw.hero.x = mid.x; sw.hero.z = mid.z + 9; sw.hero.mercy = 1e9;
    const heroSeg = (() => { let b = -1, bd = Infinity; slug.s.chain.forEach((c, i) => { const d = Math.hypot(c.x - sw.hero.x, c.z - sw.hero.z); if (d < bd) { bd = d; b = i; } }); return b; })();
    let slugs = 1, firstZap = -1, after = null;
    const kills = [];
    for (let i = 0; i < 3000 && slug.alive; i++) {
      slug.x = 0; slug.z = 0;
      step(sw, IDLE);
      slugs += evs(sw, 'spawn').filter((e) => e.kind === 'slug').length;
      kills.push(...evs(sw, 'kill'));
      if (firstZap < 0 && evs(sw, 'hit').some((e) => e.by === 'gate')) firstZap = i;
      else if (firstZap >= 0 && after == null) after = slug.s.chain.length;
    }
    check(`a SLUG on a beam (${mode}): the zap's segment is at the beam, not the hero's middle one (${heroSeg} of ${n0})`,
      heroSeg > 0 && heroSeg < n0 - 1 && after === n0 - 1 && slugs === 1, `after ${after}, slugs ever ${slugs}`);
    check(`…eaten from the head to the end, an 'env' death with nothing bitten back (${mode})`,
      !slug.alive && kills.length === 1 && kills[0].src === 'env' && !sw.bullets.some((b) => b.revenge));
  }

  // a gate blocks nothing
  const nb = W(); gateAt(nb, 2, 0, 0); nb.hero.mercy = 1e9;
  api.heroBullet(nb, 0, 0, 0);
  run(nb, 10);
  const shot = nb.bullets.find((b) => b.hero);
  check('a gate never blocks a bullet', shot && near(shot.x, 4, 1e-9));
  const nw = W(); gateAt(nw, 0, 0, 0); nw.hero.x = 6; nw.hero.mercy = 1e9;
  const walker = api.spawn(nw, 'globbo', -3, 0, { hp: 100 });
  run(nw, 240);
  check('…or a body', walker.x > 1, `x ${walker.x.toFixed(2)}`);

  // the hint: until a gate has ever been dashed (1.x tokoDropGateUsed)
  const hint = W(); gateAt(hint, 0, 0, 0); gateAt(hint, 6, 0, 0);
  const firstUse = []; hint.hero.x = -1.5; hint.hero.px = -1.5;
  check('a new player\'s gates carry the DASH THROUGH! hint', hint.pk.gateUsed === false);
  step(hint, { ...IDLE, mx: 1, dash: true }); firstUse.push(...evs(hint, 'gateUsed'));
  for (let i = 0; i < 10; i++) { step(hint, { ...IDLE, mx: 1 }); firstUse.push(...evs(hint, 'gateUsed')); }
  hint.hero.x = 4.5; hint.hero.px = 4.5; hint.hero.dashCd = 0;
  step(hint, { ...IDLE, mx: 1, dash: true }); for (let i = 0; i < 10; i++) { step(hint, { ...IDLE, mx: 1 }); firstUse.push(...evs(hint, 'gateUsed')); }
  check('…until the first dash through, said once (main.js keeps it under toko2.gateUsed)', hint.pk.gateUsed === true && firstUse.length === 1 && !hint.pk.gates[1].alive);
  check('…and a player who has dashed one starts without it', createWorld({ seed: 1, gateUsed: true }).pk.gateUsed === true);
}

// ── §6.5 the cargo convoy ──────────────────────────────────────────
{
  check('convoy: one a wave 3 + 5·rng s in, 3–5 moths 3 outside an edge, 5.5–7.5 u/s, 1.4 apart (main.js:8192, 2318-2339)',
    C.at.base === 3 && C.at.rand === 5 && C.count.base === 3 && C.count.rand === 3 && C.outside === 3 && C.span === 1.5 &&
    C.speed.base === 5.5 && C.speed.rand === 2 && C.gap === 1.4);
  check('…swaying (3–8) × sin((0.7–1.7) t + φ); escaped past 5 outside; hit at 0.32 + the bullet (main.js:2331-2333, 2379, 10766)',
    C.sway.amp.join() === '3,5' && C.sway.freq.join() === '0.7,1' && C.escape === 5 && C.r === 0.32);
  check('…a shot moth drops 55% pod / 25% nugget / 20% ×2, drifting 0.8–1.4 u/s for 7 s; the clean sweep a pod for 12 s (main.js:10786-10808)',
    C.drop.pod === 0.55 && C.drop.score === 0.25 && C.drop.life === 7 && C.drop.drift.join() === '0.8,0.6' && C.sweepLife === 12);

  // when, and the formation
  const counts = new Set(), edges = new Set();
  let timeOk = true, formOk = true, speedOk = true, swayOk = true, outsideOk = true;
  for (let s = 1; s <= 300; s++) {
    const w = W({ seed: s }); begin(w, 1);
    const at = w.pk.convoyAt[0];
    if (!(at >= 3 && at < 8)) timeOk = false;
    let n = 0; while (!w.pk.convoy && n < 600) { step(w, IDLE); n++; }
    let acc = 0, m = 0; while (acc < at) { acc += dt; m++; }              // 1.x's clusterTimer, a frame at a time; the wave's own step is the first
    if (n + 1 !== m) timeOk = false;
    const c = w.pk.convoy; if (!c) { timeOk = false; continue; }
    counts.add(c.moths.length);
    const ev = w.events.find((e) => e.type === 'convoy'); edges.add(ev.edge);
    const startC = ev.edge < 2 ? Math.abs(c.cz - c.dz * c.speed * dt) : Math.abs(c.cx - c.dx * c.speed * dt);   // undo its first step
    if (!near(startC, ev.edge < 2 ? w.hz + 3 : w.hx + 3, 1e-9)) outsideOk = false;
    if (!(c.speed >= 5.5 && c.speed < 7.5)) speedOk = false;
    if (!(c.amp >= 3 && c.amp < 8 && c.freq >= 0.7 && c.freq < 1.7)) swayOk = false;
    for (let i = 1; i < c.moths.length; i++) if (!near(c.moths[i].base - c.moths[i - 1].base, 1.4, 1e-12)) formOk = false;
  }
  check('a convoy comes 3–8 s into its wave, on the step its time is up', timeOk);
  check('3, 4 or 5 moths, from all four edges, 3 outside the arena', [3, 4, 5].every((n) => counts.has(n)) && counts.size === 3 && edges.size === 4 && outsideOk, [...counts].join());
  check('…flying 5.5–7.5 u/s, swaying 3–8 at 0.7–1.7 rad/s, 1.4 apart', speedOk && swayOk && formOk);

  // it flies across, never hurts, never scores, and escapes past 5 outside
  const w = W({ seed: 7 }); begin(w, 1);
  while (!w.pk.convoy) step(w, IDLE);
  const c = w.pk.convoy;
  let escOk = true, hurt = 0, maxOut = 0;
  for (let i = 0; i < 2000 && w.pk.convoy; i++) {
    const was = c.moths.map((m) => m.alive);
    w.hero.x = c.moths[0].x; w.hero.z = c.moths[0].z;                // stand in its way
    if (Math.abs(w.hero.x) > w.hx - 0.5 || Math.abs(w.hero.z) > w.hz - 0.5) { w.hero.x = 0; w.hero.z = 0; }
    step(w, IDLE);
    hurt += evs(w, 'hurt').length;
    c.moths.forEach((m, j) => {
      const out = Math.max(Math.abs(m.x) - w.hx, Math.abs(m.z) - w.hz);
      if (was[j] && !m.alive && !(m.escaped && out > 5)) escOk = false;
      if (m.alive) { maxOut = Math.max(maxOut, out); if (out > 5) escOk = false; }
    });
  }
  check('a convoy flies across and is gone once every moth is past 5 outside', !w.pk.convoy && c.moths.every((m) => m.escaped) && escOk && maxOut > 4.5);
  check('…a moth never hurts you', hurt === 0 && w.hero.lives === 3);

  // shot: what it drops
  const shoot = (seed, k = 0, setup) => {
    const v = W({ seed }); begin(v, 1); while (!v.pk.convoy) step(v, IDLE); setup?.(v);
    const cv = v.pk.convoy, m = cv.moths.filter((d) => d.alive)[k];
    if (!m) return null;
    mothBullet(v, m); v.events.length = 0; PK.mothsHit(v);
    return { v, cv, m, it: v.pk.items.at(-1), ev: evs(v, 'mothShot')[0] };
  };
  const tally = { pod: 0, score: 0, scoremult: 0 };
  let lifeOk = true, driftOk = true, quiet = true;
  for (let s = 1, done = 0; done < 3000; s++) {
    const r = shoot(s);
    if (!r || r.ev.clean) continue;                                       // a convoy's last moth, swept clean: the sweep's pod, not a roll
    done++;
    const { v, it, ev } = r;
    tally[it.type]++;
    if (it.max !== 7) lifeOk = false;
    const sp = Math.hypot(it.vx, it.vz); if (!(sp >= 0.8 && sp < 1.4)) driftOk = false;
    if (v.score !== 0 || v.kills !== 0 || v.streak !== 0 || ev.clean) quiet = false;
  }
  check(`a shot moth drops 55% a pod, 25% a nugget, 20% a ×2 (${tally.pod} / ${tally.score} / ${tally.scoremult} of 3000)`,
    Math.abs(tally.pod / 3000 - 0.55) < 0.03 && Math.abs(tally.score / 3000 - 0.25) < 0.025 && Math.abs(tally.scoremult / 3000 - 0.2) < 0.025);
  check('…drifting 0.8–1.4 u/s for 7 s', lifeOk && driftOk);
  check('…and never scores or touches the streak', quiet);
  const hit = shoot(3);
  check('a bullet that hits a moth is spent; the moth is out of the convoy', hit.v.bullets[0].dead && !hit.m.alive && hit.cv.killed === 1);
  const miss = W({ seed: 3 }); begin(miss, 1); while (!miss.pk.convoy) step(miss, IDLE);
  const mm = miss.pk.convoy.moths.find((d) => d.alive);
  miss.bullets.push({ hero: true, x: mm.x + 0.15 + 0.32 + 0.001, z: mm.z, r: 0.15, dead: false });
  PK.mothsHit(miss);
  check('…hit within 0.32 + the bullet\'s 0.15, and no farther', mm.alive && !miss.bullets[0].dead);

  // the clean sweep: 2.0's DASH pod while the dash has a level to go
  const sweep = (seed, setup, escapeOne = false) => {
    const v = W({ seed }); begin(v, 1); while (!v.pk.convoy) step(v, IDLE); setup?.(v);
    const cv = v.pk.convoy;
    const allIn = cv.moths.every((m) => m.alive);
    if (escapeOne) { cv.moths[0].alive = false; cv.moths[0].escaped = true; }
    for (const m of cv.moths) if (m.alive) { mothBullet(v, m); PK.mothsHit(v); }
    return { v, last: v.pk.items.at(-1), allIn };
  };
  const s0 = sweep(5);
  check('the moth that makes a clean sweep drops a DASH pod for 12 s, at dash level 0', s0.allIn && s0.last.type === 'dash' && s0.last.max === 12 && s0.last.vx === 0 && s0.last.vz === 0);
  // 1.x's quirk, kept: a moth its sway starts more than 5 outside has escaped at once
  let quirk = null;
  for (let s = 1; s < 2000 && !quirk; s++) { const v = W({ seed: s }); begin(v, 1); while (!v.pk.convoy) step(v, IDLE); if (v.pk.convoy.moths.some((m) => m.escaped)) quirk = v; }
  check('…a convoy the sway starts partly past 5 outside can never be swept clean (1.x main.js:2365-2380)', quirk && (() => {
    for (const m of quirk.pk.convoy.moths) if (m.alive) { mothBullet(quirk, m); PK.mothsHit(quirk); }
    return quirk.pk.items.every((it) => it.max === 7); })());
  const s1 = sweep(5, (v) => { v.hero.dashLevel = 1; });
  const s2 = sweep(5, (v) => { v.hero.dashLevel = 2; });
  check('…and at level 1; at level 2 (the dash maxed) a weapon pod, as 1.x', s1.last.type === 'dash' && s2.last.type === 'pod' && P.pods.includes(s2.last.fam) && s2.last.max === 12);
  const esc = sweep(5, null, true);
  check('…not if one got away: the last shot rolls as any other (7 s)', esc.last.max === 7);
  const take = W(), ups = [];
  for (let i = 0; i < 3; i++) { PK.place(take, 0.4, 0, { type: 'dash' }); step(take, IDLE); ups.push(...evs(take, 'dashLevel')); }
  check('taking a DASH pod raises the dash a level, to 2 and no further', take.hero.dashLevel === 2 && ups.map((e) => e.level).join() === '1,2' && ups.every((e) => e.up));
  // a second DASH pod on the floor once the dash is maxed is the prize the
  // sweep gives a maxed dash: a level-1 weapon pod (main.js:10783-10787)
  const maxed = W(); maxed.hero.dashLevel = 2; maxed.hero.weapon = null;
  PK.place(maxed, 0.4, 0, { type: 'dash' }); step(maxed, IDLE);
  const wp = evs(maxed, 'weapon');
  check('…and a DASH pod taken at level 2 equips a level-1 weapon pod instead of being wasted',
    maxed.hero.dashLevel === 2 && !evs(maxed, 'dashLevel').length && wp.length === 1 && P.pods.includes(wp[0].fam) && maxed.hero.weapon?.level === 1 && evs(maxed, 'pickup').length === 1,
    `${maxed.hero.dashLevel} ${JSON.stringify(maxed.hero.weapon)}`);
  check('…and level 1 is the dash that kills, level 2 the boom (hero.js)', T.hero.dashKill && T.hero.dashBoom.count === 12);

  // the next waits for this one
  const wait = W({ seed: 2 }); begin(wait, 1);
  while (!wait.pk.convoy) step(wait, IDLE);
  const first = wait.pk.convoy; begin(wait, 2);
  const nextAt = wait.pk.convoyAt[0];
  let k = 0; while (wait.pk.convoy === first && k < 4000) { step(wait, IDLE); k++; }
  const gap = wait.pk.convoyT;
  check('the next convoy\'s clock waits while one is still flying (main.js:10928)', wait.pk.convoy === null && near(gap, 0) && wait.pk.convoyAt[0] === nextAt);

  // and for real: a hero shooting at the moths brings them down
  const real = W({ seed: 4 }); begin(real, 1); real.hero.mercy = 1e9;
  let shots = 0;
  for (let i = 0; i < 1200; i++) {
    const m = real.pk.convoy?.moths.find((d) => d.alive);
    const inp = m ? { ...IDLE, ax: m.x - real.hero.x, az: m.z - real.hero.z, aim: true, fire: true } : IDLE;
    step(real, inp); shots += evs(real, 'mothShot').length;
  }
  check('in play, the hero\'s own gun brings moths down', shots > 0, `${shots} moths`);
}

// ── §6.6 the bounty ────────────────────────────────────────────────
{
  const armed = Array.from({ length: 30 }, (_, i) => i + 1).filter((n) => n >= B.from && n % B.every === B.at && waveKind(n) !== 'boss');
  check('bounty waves are 4, 7, 10, 13, 19, 22, 25, 28 (w ≥ 4, w % 3 = 1, not a boss wave: main.js:8149)', armed.join() === '4,7,10,13,19,22,25,28', armed.join());
  check('…8 s to kill it, for 1500 + 100w and a pod for 10 s (main.js:9430, 4437, 4443)', B.time === 8 && B.pay === 1500 && B.perWave === 100 && B.podLife === 10);

  // a director that begins wave n and lands bodies, the way the pump does
  const landing = (n, kinds, o = {}) => {
    const w = W(o);
    w.director = { step(w, dt, api) { w.wave = n; w.events.push({ type: 'wave', wave: n, kind: waveKind(n), carry: false });
      for (const [kind, boss] of kinds) api.spawn(w, kind, 8, 4, boss ? { isBoss: true, hp: 30 } : {}); w.director = QUIET; } };
    w.hero.mercy = 1e9; w.hero.x = -10;
    step(w, IDLE);
    return w;
  };
  const w = landing(4, [['globbo'], ['yela']]);
  const target = w.gels[0];
  check('on a bounty wave the first body landed is marked, with 8 s on it', w.pk.bounty.id === target.id && near(w.pk.bounty.t, 8 - dt, 1e-12) && evs(w, 'bounty').length === 1);
  const skip = landing(4, [['omega', true], ['globbo']]);
  check('…not a boss: the first that is not one', skip.pk.bounty.id === skip.gels[1].id);
  const plain = landing(5, [['globbo']]);
  check('…and no mark on a wave that is not armed', plain.pk.bounty.id === null && plain.pk.bounty.arm === false);
  run(w, 400);
  const s0 = w.score; api.kill(w, target, 'hero');
  const paid = w.pk.items.at(-1);
  check('killed inside its 8 s: 1500 + 100 × 4 on top of the kill, and a pod there for 10 s', w.score - s0 === 1900 + 100 && paid?.type === 'pod' && paid.max === 10 && near(paid.x, target.x) && w.pk.bounty.id === null);
  const dbl = landing(7, [['globbo']]); dbl.pk.multT = 5;
  const d0 = dbl.score; api.kill(dbl, dbl.gels[0], 'env');
  check('…× 2 under the multiplier, from any kill (a gate\'s too)', dbl.score - d0 === (1500 + 700) * 2 + 200);
  const late = landing(10, [['globbo']]); run(late, 470);
  const onTime = late.pk.bounty.id !== null;
  run(late, 15);
  const l0 = late.score; api.kill(late, late.gels[0], 'hero');
  check('…after 8 s the mark lapses without a word, and pays nothing', onTime && late.pk.bounty.id === null && late.score - l0 === 100 && !late.pk.items.length);
  const gone = landing(13, [['globbo']]); begin(gone, 14);
  check('a new wave takes an unclaimed bounty with it', gone.pk.bounty.id === null);

  // with the real director: wave 4's first body
  const real = createWorld({ seed: 21, mode: 'arcade' });
  let first4 = null, marked = null;
  for (let i = 0; i < 120 / dt && real.wave < 5; i++) {
    real.hero.mercy = 1;
    if (real.wave < 4 && i % 60 === 0) for (const g of real.gels.slice()) api.kill(real, g, 'env');   // clear the floor so the waves roll
    step(real, IDLE);
    if (real.wave === 4 && !first4) { const sp = real.events.find((e) => e.type === 'spawn' && !e.boss); if (sp) first4 = sp.id; }
    const b = real.events.find((e) => e.type === 'bounty'); if (b) marked = b.id;
  }
  check('with the real director, wave 4 marks its first body', first4 != null && marked === first4, `${first4} ${marked}`);
}

// ── 2.0: a hit costs a dash level ──────────────────────────────────
{
  check('a hit costs the dash a level by default (TUNING.hero.dashUpgrade.loseOnHit)', H.dashUpgrade.loseOnHit === true);
  const at = (level, flag = true) => {
    const keep = H.dashUpgrade.loseOnHit; H.dashUpgrade.loseOnHit = flag;
    const w = W(); w.hero.dashLevel = level; api.hurt(w, 'test');
    H.dashUpgrade.loseOnHit = keep;
    return w;
  };
  const two = at(2), one = at(1), zero = at(0), kept = at(2, false);
  check('a hit knocks dash level 2 down to 1, said as it goes', two.hero.dashLevel === 1 && evs(two, 'dashLevel').some((e) => e.down && e.level === 1));
  check('…never below 1', one.hero.dashLevel === 1 && zero.hero.dashLevel === 0 && !evs(one, 'dashLevel').length);
  check('…and with the flag off the level stays for the run', kept.hero.dashLevel === 2);
  const pod = W(); pod.hero.weapon = { fam: 'spread', level: 2 }; pod.hero.dashLevel = 2; api.hurt(pod, 'test');
  check('…the same hit that knocks a level-2 pod down (weaponTakeHit, main.js:2083-2091)', pod.hero.weapon.level === 1 && pod.hero.dashLevel === 1);
}

// ── the knobs, off ─────────────────────────────────────────────────
{
  check('healing is 1.x\'s gates as they are: the gate drops live 9 s and no kill drops a heart', G.dropLife === 9 && P.heart.chance === 0);
  const w = W(); for (let i = 0; i < 50; i++) api.kill(w, api.spawn(w, 'globbo', 8, 0));
  check('…at chance 0 nothing drops and nothing is drawn', w.pk.items.length === 0 && w.pk.rng.state === W().pk.rng.state);
  const keep = P.heart.chance; P.heart.chance = 1;
  const h = W(); api.kill(h, api.spawn(h, 'globbo', 8, 0));
  P.heart.chance = keep;
  const heart = h.pk.items[0];
  check('…turned on, a kill drops a heart for 8 s, drifting ±0.3 (BINDING, main.js:4458-4462)', heart?.type === 'hp' && heart.max === 8 && Math.abs(heart.vx) <= 0.3 && Math.abs(heart.vz) <= 0.3);
}

// ── seeded, and its own stream ─────────────────────────────────────
{
  // a bot that fights: shoots the nearest gel or moth, backs off, dashes at gates
  const bot = (w) => {
    const h = w.hero; let tx = null, tz = null, nd = Infinity;
    for (const g of w.gels) { if (g.state !== 'active') continue; const d = Math.hypot(g.x - h.x, g.z - h.z); if (d < nd) { nd = d; tx = g.x; tz = g.z; } }
    for (const m of w.pk.convoy?.moths ?? []) if (m.alive) { tx = m.x; tz = m.z; break; }
    const it = w.pk.items[0], gate = w.pk.gates.find((g) => g.alive);
    let mx = it ? it.x - h.x : gate ? gate.x - h.x : -h.x * 0.2, mz = it ? it.z - h.z : gate ? gate.z - h.z : -h.z * 0.2;
    const near = gate && Math.hypot(gate.x - h.x, gate.z - h.z) < 2.5;
    return { mx, mz, ax: tx == null ? 1 : tx - h.x, az: tz == null ? 0 : tz - h.z, aim: true, fire: true, dash: near && w.tick % 15 === 0 };
  };
  const play = (seed, mode = 'arcade', secs = 150) => {
    const w = createWorld({ seed, mode }), log = [];
    const KEEP = new Set(['gate', 'drop', 'pickup', 'gateDash', 'gateChain', 'convoy', 'mothShot', 'bounty', 'bountyPaid', 'dashLevel']);
    for (let i = 0; i < secs / dt && !w.over; i++) {
      w.hero.mercy = Math.max(w.hero.mercy, 0.5);        // a long run, not a short one
      step(w, bot(w));
      for (const e of w.events) if (KEEP.has(e.type)) log.push(`${w.tick}:${e.type}:${e.kind ?? ''}:${e.fam ?? ''}:${(e.x ?? 0).toFixed(6)}:${(e.z ?? 0).toFixed(6)}:${e.pay ?? ''}`);
    }
    return { w, log };
  };
  const a = play(31), b = play(31), c = play(32);
  const kinds = new Set(a.log.map((l) => l.split(':')[1]));
  check(`a run's pickups replay exactly from its seed (${a.log.length} events, to wave ${a.w.wave})`, a.log.length > 20 && a.log.join() === b.log.join() && a.w.score === b.w.score);
  check('…the run saw gates, drops, a convoy shot down and something taken', ['gate', 'drop', 'convoy', 'mothShot', 'pickup'].every((k) => kinds.has(k)), [...kinds].join());
  check('…and another seed gets other ones', a.log.join() !== c.log.join());

  // pickups never draw the director's stream (w.rng): drive every rule with it trapped
  const t = W({ seed: 8 }); let drew = 0;
  const real = t.rng; t.rng = { ...real, next() { drew++; return real.next(); }, range() { drew++; return 0; }, int() { drew++; return 0; }, pick(l) { drew++; return l[0]; } };
  t.hero.mercy = 1e9;
  for (const n of [3, 4, 5, 7, 10, 11, 12, 13]) {
    begin(t, n);
    for (let i = 0; i < 600; i++) {
      const m = t.pk.convoy?.moths.find((d) => d.alive); if (m) { mothBullet(t, m); }
      const g = t.pk.gates.find((x) => x.alive); if (g && i % 50 === 0) { t.hero.x = g.x - 1.2 * Math.cos(g.angle); t.hero.z = g.z - 1.2 * Math.sin(g.angle); t.hero.dashCd = 0; }
      step(t, i % 50 === 0 ? { ...IDLE, mx: Math.cos(t.pk.gates[0]?.angle ?? 0), mz: Math.sin(t.pk.gates[0]?.angle ?? 0), dash: true } : IDLE);
    }
  }
  check('pickups draw their own stream, never the director\'s w.rng (its 1.x oracle stays in lockstep)', drew === 0 && t.pk.items.length + t.pk.gates.length > 0, `${drew} draws`);

  // SURVIVAL has none, for now
  const sv = createWorld({ seed: 3, mode: 'survival' });
  for (let i = 0; i < 40 / dt; i++) { sv.hero.mercy = 1; step(sv, IDLE); }
  check('SURVIVAL has no pickups for now (owner, 2026-10-22)', !sv.pk.on && !sv.pk.gates.length && !sv.pk.convoy && !sv.pk.items.length);
  check('HARDCADE has them as ARCADE does', createWorld({ seed: 3, mode: 'hardcade' }).pk.on && createWorld({ seed: 3 }).pk.on);
}

console.log(failed ? `\n✗ pickups: ${failed} failed, ${passed} passed` : `✔ pickups: ${passed} checks`);
process.exit(failed ? 1 : 0);
