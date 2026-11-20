#!/usr/bin/env node
// sim.mjs — the simulation, in bare node: no browser, no GPU, no clock.
//
// js/sim/ is plain JS on a fixed timestep from a seed (CLAUDE.md), which is
// what lets these checks assert exact behaviour in milliseconds instead of
// guessing at it through a headless browser. Each check is a claim about the
// rules; a failure names the claim.
//
// Usage: node test/sim.mjs           (exit 1 on any failure)
import { makeRng, dailySeed } from '../js/sim/rng.js';
import { press } from '../js/sim/press.js?v=158';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};

// ── chance ─────────────────────────────────────────────────────────
{
  const a = makeRng(12345), b = makeRng(12345);
  const sa = Array.from({ length: 1000 }, () => a.next());
  const sb = Array.from({ length: 1000 }, () => b.next());
  check('the same seed gives the same sequence', sa.every((v, i) => v === sb[i]));
  check('values stay in [0, 1)', sa.every((v) => v >= 0 && v < 1));
  const c = makeRng(12346);
  check('a different seed gives a different sequence', c.next() !== makeRng(12345).next());
  const r = makeRng(7); for (let i = 0; i < 50; i++) r.next();
  const saved = r.state, ahead = [r.next(), r.next()];
  r.state = saved;
  check('a saved state resumes bit-identically', r.next() === ahead[0] && r.next() === ahead[1]);
  const ints = Array.from({ length: 2000 }, () => a.int(1, 6));
  check('int(a, b) is inclusive at both ends', ints.includes(1) && ints.includes(6) && ints.every((v) => v >= 1 && v <= 6));
  const d1 = dailySeed(new Date(Date.UTC(2026, 9, 19, 0, 1))), d2 = dailySeed(new Date(Date.UTC(2026, 9, 19, 23, 59)));
  check('the daily seed holds all UTC day', d1 === d2);
  check('the daily seed moves at UTC midnight', d1 !== dailySeed(new Date(Date.UTC(2026, 9, 20, 0, 0))));
}

// ── a night ────────────────────────────────────────────────────────
const { createWorld, step, api } = await import('../js/sim/world.js?v=158');
const { TUNING: T } = await import('../js/tuning.js?v=158');
const IDLE = { mx: 0, mz: 0, ax: 0, az: 0, aim: false, fire: false, dash: false };
const near = (a, b, eps = 1e-9) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) <= eps;   // angles, wrapped

// A bot that plays: back away from the nearest gel, shoot the nearest one,
// dash when something is close. Not good — just honest enough to fight.
function bot(w) {
  const h = w.hero, HX = w.hx, HZ = w.hz; let near = null, nd = Infinity;
  for (const g of w.gels) { if (g.state !== 'active') continue; const d = Math.hypot(g.x - h.x, g.z - h.z); if (d < nd) { nd = d; near = g; } }
  if (!near) return { mx: -h.x * 0.1, mz: -h.z * 0.1, ax: 0, az: -1, aim: true, fire: true, dash: false };
  const dx = near.x - h.x, dz = near.z - h.z;
  let mx = -dx / nd, mz = -dz / nd;
  mx += -h.x / HX * 0.8; mz += -h.z / HZ * 0.8;         // and keep off the walls
  return { mx, mz, ax: dx / nd, az: dz / nd, aim: true, fire: true, dash: nd < 1.6 && w.tick % 20 === 0 };
}
const run = (seed, mode, policy, maxSeconds) => {
  const w = createWorld({ seed, mode });
  const n = Math.round(maxSeconds / T.sim.dt);
  let nan = false, outside = 0, maxGels = 0, maxBullets = 0, revenge = 0;
  for (let i = 0; i < n && !w.over; i++) {
    step(w, policy(w));
    const h = w.hero;
    if (!Number.isFinite(h.x) || !Number.isFinite(h.z) || w.gels.some((g) => !Number.isFinite(g.x) || !Number.isFinite(g.z))) nan = true;
    // the slab as it is now: SURVIVAL's changes size (sim/reshape.js), and its walls carry what they meet
    const X = w.hx, Z = w.hz;
    if (Math.abs(h.x) > X || Math.abs(h.z) > Z) outside++;
    for (const g of w.gels) if (g.state === 'active' && (Math.abs(g.x) > X - g.r + 1e-6 || Math.abs(g.z) > Z - g.r + 1e-6)) outside++;
    maxGels = Math.max(maxGels, w.gels.length); maxBullets = Math.max(maxBullets, w.bullets.length);
    revenge += w.events.filter((e) => e.type === 'revenge').length;
  }
  return { w, nan, outside, maxGels, maxBullets, revenge };
};

{
  const idle = run(3, 'survival', () => IDLE, 600);
  check('standing still, the night gets you', idle.w.over, `alive at ${idle.w.time.toFixed(0)} s`);
  check('nothing goes NaN', !idle.nan);
  check('gels arrive', idle.maxGels > 0);
  check('standing still kills nothing', idle.w.kills === 0);

  const play = run(3, 'survival', bot, 180);
  check('the bot kills gels and scores', play.w.kills > 5 && play.w.score > 500, `${play.w.kills} kills, ${play.w.score} pts`);
  check('the bot outlives standing still', play.w.time > idle.w.time, `${play.w.time.toFixed(0)} s vs ${idle.w.time.toFixed(0)} s`);
  check('no body leaves the slab', play.outside === 0, `${play.outside} frames out`);
  check('nothing goes NaN under fire', !play.nan);
  check('the bullet caps hold', play.maxBullets <= T.bullets.maxHero + T.bullets.maxGel);

  const again = run(3, 'survival', bot, 180);
  check('the same seed and inputs replay exactly', again.w.score === play.w.score && again.w.kills === play.w.kills && again.w.tick === play.w.tick,
    `${again.w.score}/${again.w.kills} vs ${play.w.score}/${play.w.kills}`);

  const hard = run(3, 'hardcade', bot, 120);
  check('in HARDCADE, corpses fire back', hard.w.events !== undefined && hard.revenge > 0, `${hard.revenge} blooms`);
}

{
  // the dash is 1.x's: it passes through; level 1 kills what it passes; level 2 booms
  const w = createWorld({ seed: 9 });
  w.director = { step() {} };
  const g = api.spawn(w, 'spittor', 1.2, 0);
  step(w, { ...IDLE, ax: 1, az: 0, aim: true, dash: true });
  for (let i = 0; i < 10; i++) step(w, IDLE);
  check('a level-0 dash passes through a body, as in 1.x', g.alive && Math.abs(g.x - 1.2) < 0.3, `gel at x ${g.x.toFixed(2)}`);
  const k = createWorld({ seed: 9 }); k.director = { step() {} }; k.hero.dashLevel = 1;
  const kg = api.spawn(k, 'spittor', 1.2, 0);
  step(k, { ...IDLE, ax: 1, az: 0, aim: true, dash: true });
  for (let i = 0; i < 12; i++) step(k, IDLE);
  check('a level-1 dash kills what it passes through', !kg.alive && k.kills === 1);
  const bm = createWorld({ seed: 9 }); bm.director = { step() {} }; bm.hero.dashLevel = 2;
  step(bm, { ...IDLE, ax: 1, az: 0, aim: true, dash: true });
  check('a level-2 dash booms a ring of hero bullets', bm.bullets.filter((b) => b.hero).length === T.hero.dashBoom.count);

  // v82: what presses on a body is reported as a vector toward it — the view's
  // contact squash reads it; the rules read nothing of it
  {
    const p = createWorld({ seed: 9 }); p.director = { step() {} }; p.hero.x = p.hero.px = 30; p.hero.z = p.hero.pz = 0;   // the hero far off, out of every reach
    const a = api.spawn(p, 'globbo', 0, 0), b = api.spawn(p, 'globbo', 0.6, 0);   // standing in each other
    step(p, IDLE);
    check('two bodies standing in each other are each pressed toward the other', a.pressX > 0 && b.pressX < 0 && Math.abs(a.pressX + b.pressX) < 1e-9, `a ${a.pressX?.toFixed(4)}, b ${b.pressX?.toFixed(4)}`);
    const wall = api.spawn(p, 'globbo', p.hx - 0.2, 4); wall.kx = 6;   // knocked into the right wall
    step(p, IDLE);
    check('a body pushed into a wall is pressed toward the wall', wall.pressX > 0 && Math.abs(wall.x - (p.hx - wall.r)) < 1e-9, `${wall.pressX?.toFixed(4)}`);
    const far = api.spawn(p, 'globbo', -8, -6);
    step(p, IDLE);
    check('a body with nothing against it is not pressed', far.pressX === 0 && far.pressZ === 0);
    const q = createWorld({ seed: 9 }); q.director = { step() {} }; q.hero.mercy = 9;
    const onHim = api.spawn(q, 'globbo', 0.4, 0);
    step(q, IDLE);
    check('a body standing in the hero presses on him and he on it, toward each other', onHim.pressX < 0 && q.hero.pressX > 0, `gel ${onHim.pressX?.toFixed(3)}, hero ${q.hero.pressX?.toFixed(3)}`);
    check('…and the press is this step\'s alone', (step(q, IDLE), onHim.pressX < 0) && (onHim.x = 8, onHim.px = 8, step(q, IDLE), onHim.pressX === 0 && q.hero.pressX === 0));
    // v90: pressed from both sides the vector cancels; the total and the folded axis do not (sim/press.js), so the middle of a crowd squashes
    const s2 = createWorld({ seed: 9 }); s2.director = { step() {} }; s2.hero.mercy = 9;
    api.spawn(s2, 'globbo', -0.45, 0); api.spawn(s2, 'globbo', 0.45, 0);
    step(s2, IDLE);
    const hh = s2.hero;
    check('a hero squeezed from both sides has next to no net press, a total, and an axis along the squeeze', Math.abs(hh.pressX) < 0.05 && hh.pressM > 0.3 && Math.abs(hh.pressAX) > 0.3 && Math.abs(hh.pressAZ) < 0.05, `net ${hh.pressX?.toFixed(3)}, total ${hh.pressM?.toFixed(3)}, axis ${hh.pressAX?.toFixed(3)},${hh.pressAZ?.toFixed(3)}`);
    const o = {}; press(o, 1, 0); press(o, -1, 0); press(o, 0.2, 0.1);
    check('press() adds every push to the total and folds opposite pushes onto one axis', Math.abs(o.pressX - 0.2) < 1e-9 && Math.abs(o.pressM - (2 + Math.hypot(0.2, 0.1))) < 1e-9 && Math.abs(o.pressAX - 2.2) < 1e-9 && Math.abs(o.pressAZ - 0.1) < 1e-9, JSON.stringify(o));
  }

  // v51: a kill pays 100 × the HEAT (1.x paid 100 × the streak, which compounded
  // without a ceiling); far off, with a bystander on the floor, three kills stay at ×1
  const s = createWorld({ seed: 4 }); s.director = { step() {} };
  const by = api.spawn(s, 'globbo', -12, -6); by.state = 'active';
  for (let i = 0; i < 3; i++) { const g = api.spawn(s, 'globbo', 5 + i, 5); g.state = 'active'; api.kill(s, g); }
  check('kills pay 100 × the heat', s.score === 300 && s.heat > 0, `score ${s.score}`);
  // v53: a kill is paid at the heat it was made at, then heats you; the one that empties the floor heats more
  const c = createWorld({ seed: 4 }); c.director = { step() {} };
  const c1 = api.spawn(c, 'globbo', 9, 5); c1.state = 'active'; api.kill(c, c1);
  const c2 = api.spawn(c, 'globbo', 9, 5); c2.state = 'active'; api.kill(c, c2);
  check('the kill that empties the floor heats the next one up a level', c.score === 100 + 200, `score ${c.score}`);
  s.hero.mercy = 0; api.hurt(s, 'test');
  check('a hit resets the streak', s.streak === 0);

  // HARDCADE: a biter's corpse blooms; a non-biter's does not; nothing before wave 3
  const hc = createWorld({ seed: 5, mode: 'hardcade' }); hc.director = { step() {} }; hc.wave = 3;
  const N3 = Math.round(T.revenge.aimed.count * T.revenge.density), tellSteps = Math.round(T.revenge.tell / T.sim.dt);
  hc.hero.x = 2; hc.hero.z = 3; hc.hero.px = 2; hc.hero.pz = 3;
  api.kill(hc, api.spawn(hc, 'spittor', 8, 0));
  // v103 (owner: revenge "needs certain predictability to stay fair"): it WARNS first — a seed on the corpse,
  // its lines fixed at where the hero stood, and nothing in the air for `tell` s — then fires along them
  const sd = hc.seeds[0], aimAt = Math.atan2(3 - 0, 2 - 8);
  check('in HARDCADE a SPITTOR corpse first lays a seed, a line for each bullet of its AIMED burst',
    hc.seeds.length === 1 && sd.angles.length === N3 && !hc.bullets.some((b) => b.revenge) && hc.events.some((e) => e.type === 'revengeSeed'));
  check('… its lines centred on where the hero stood', near(sd.angles.reduce((a, b) => a + b, 0) / N3, aimAt, 1e-9), `${sd.angles} vs ${aimAt}`);
  hc.hero.x = -6; hc.hero.z = -5;   // the hero walks away: the lines do not follow
  for (let i = 0; i < tellSteps - 2; i++) step(hc, IDLE);
  check('… nothing in the air while it warns', !hc.bullets.some((b) => b.revenge) && hc.seeds.length === 1);
  for (let i = 0; i < 3; i++) step(hc, IDLE);
  const fired = hc.bullets.filter((b) => b.revenge);
  check('… then it fires its AIMED burst along those lines, the seed gone', fired.length === N3 && hc.seeds.length === 0
    && fired.every((b, k) => near(Math.atan2(b.vz, b.vx), sd.angles[k], 1e-9)), `${fired.length}`);
  hc.bullets.length = 0; hc.gelBullets = 0;
  api.kill(hc, api.spawn(hc, 'globbo', 8, 0));
  check('a GLOBBO corpse does not bite', hc.bullets.length === 0 && hc.seeds.length === 0);
  hc.wave = 2; api.kill(hc, api.spawn(hc, 'fanner', 8, 0));
  check('no corpse fire before wave 3', hc.bullets.length === 0 && hc.seeds.length === 0);
  // within `near` of the hero a corpse cannot bite (a dash kill is point-blank): it fizzles
  hc.wave = 3; hc.hero.x = 7; hc.hero.z = 0;
  api.kill(hc, api.spawn(hc, 'spittor', 8, 0));
  check('a biter killed within reach of the hero does not bite: it fizzles', hc.seeds.length === 0 && hc.events.some((e) => e.type === 'revengeFizzle'));
  // a RING's first bullet goes where the hero stood (1.x turned it at random)
  hc.hero.x = 0; hc.hero.z = 0;
  api.kill(hc, api.spawn(hc, 'steama', 6, 6));
  const rg = hc.seeds[0];
  check('a RING corpse\'s first line points at the hero, the rest evenly round', rg && near(rg.angles[0], Math.atan2(-6, -6), 1e-9)
    && rg.angles.every((a, k) => near(a - rg.angles[0], (k * Math.PI * 2) / rg.angles.length, 1e-9)), `${rg?.angles}`);

  // the arena is 1.x's, either way up
  const tall = createWorld({ seed: 2, arena: T.arena.portrait });
  check('a tall screen gets 1.x\'s portrait arena', tall.hx === 11 && tall.hz === 18);
  check('a wide screen gets 1.x\'s landscape arena', createWorld({ seed: 2 }).hx === 19);

  // 1.x's corpse colours (revenge-hardcade.md §4)
  const { revengeColor } = await import('../js/sim/color.js?v=158');
  check('SPITTOR\'s corpse fire is 1.x\'s 0xcb2c00', revengeColor('spittor') === 0xcb2c00, revengeColor('spittor').toString(16));
  check('YELA\'s turns poison green 0x87ec00', revengeColor('yela') === 0x87ec00, revengeColor('yela').toString(16));
}

{
  // a new body is dangerous from its first frame (owner, 2026-10-22, "c or
  // less"): 1.x had no appear phase — the pump built a body live (main.js:9371)
  // ahead of the update loop that moved it the same frame (main.js:10366-10368).
  // Only its look swells in, over TUNING.gel.swell.
  const quiet = () => { const w = createWorld({ seed: 11 }); w.director = { step() {} }; return w; };
  const mv = quiet(), g = api.spawn(mv, 'globbo', 8, 0);
  check('a new body is active the moment it spawns', g.state === 'active');
  check('…and lands then, once', mv.events.filter((e) => e.type === 'land').length === 1);
  step(mv, IDLE);
  check('…and its species step runs on its first step: it walks at you', g.x < 8 && Math.abs(g.t - T.sim.dt) < 1e-12, `x ${g.x}, t ${g.t}`);
  let lands = 0;
  for (let i = 0; i < 60; i++) { step(mv, IDLE); lands += mv.events.filter((e) => e.type === 'land').length; }
  check('…and never lands again', lands === 0, `${lands}`);

  const ht = quiet(), hg = api.spawn(ht, 'globbo', 8, 0, { hp: 3 });
  api.heroBullet(ht, 8 - 0.6, 0, 0);
  step(ht, IDLE);
  check('a new body can be hit on its first step', hg.hp === 2 && ht.events.some((e) => e.type === 'hit' && e.id === hg.id), `hp ${hg.hp}`);

  const ct = quiet(); api.spawn(ct, 'globbo', 0.6, 0);
  step(ct, IDLE);
  check('a new body hurts to touch on its first step', ct.hero.lives === T.hero.lives - 1, `lives ${ct.hero.lives}`);
  check('the swell is the view\'s: a tuning number, shorter than 2.0\'s old 0.3 s', T.gel.swell > 0 && T.gel.swell <= 0.15 && T.gel.appear === undefined);
  // the retired option is accepted and does nothing (docs/SIM_CONTRACT.md, api.spawn)
  const ro = quiet(), rg = api.spawn(ro, 'globbo', 8, 0, { appear: false });
  check('the retired `appear: false` changes nothing: active, landed, live at once', rg.state === 'active' && rg.t === 0 && ro.events.filter((e) => e.type === 'land').length === 1);

  // a brood still waits out its parent's 0.28 s death pop, inert: 1.x's
  // _deathT counts 0.28 down and the brood is built on the frame it reaches
  // 0 (enemy.js:2970-2998, 3007), after the update loop (main.js:10586-10620),
  // so it can be hit that frame and moves from the next
  const br = quiet(), red = api.spawn(br, 'redd', 8, 0);
  api.kill(br, red, 'env');
  const kids = br.gels.filter((c) => c.alive && c.kind === 'reddmini'), at = kids.map((c) => [c.x, c.z]);
  check('REDD\'s brood is spawned at the kill, waiting', kids.length > 0 && kids.every((c) => c.child && c.state === 'appear' && c.t === -T.blob.death));
  const popSteps = (() => { let t = T.blob.death, n = 0; while (t > 0) { t -= T.sim.dt; n++; } return n; })();
  let still = true, out = -1, landsAt = [], hits = 0;
  for (let i = 1; i <= popSteps + 3; i++) {
    if (i < popSteps && kids[0]) api.heroBullet(br, kids[0].x - 0.6, kids[0].z, 0);
    step(br, IDLE);
    if (i < popSteps) hits += br.events.filter((e) => e.type === 'hit').length;
    const n = br.events.filter((e) => e.type === 'land').length;
    if (n) landsAt.push(`${i}×${n}`);
    if (i < popSteps && kids.some((c, j) => c.state !== 'appear' || c.x !== at[j][0] || c.z !== at[j][1])) still = false;
    if (out < 0 && kids.every((c) => c.state === 'active')) out = i;
  }
  check('…inert and untouchable through the pop', still && hits === 0, `still ${still}, ${hits} hits`);
  check(`…and out on the pop's last step (step ${popSteps}, 1.x's frame), all at once`, out === popSteps, `out at ${out}`);
  check('…landing then, each once', landsAt.length === 1 && landsAt[0] === `${popSteps}×${kids.length}`, landsAt.join(' '));

  // 1.x built the brood after its crowd pass (main.js:10426, 10586-10620), so
  // on the step it is let out the crowd solver does not move it, even laid in
  // a heap; it is pushed apart from the next step on
  const pp = quiet(), purp = api.spawn(pp, 'purp', -6, 0);
  api.kill(pp, purp, 'env');
  const heap = pp.gels.filter((c) => c.alive && c.kind === 'purpmini');
  heap.forEach((c, j) => { c.x = c.px = -6 + 0.05 * j; c.z = c.pz = 0.03 * j; });
  const laid = heap.map((c) => [c.x, c.z]);
  for (let i = 1; i <= popSteps; i++) step(pp, IDLE);
  check('a brood let out sits exactly where it was laid on its release step (no crowd push)',
    heap.length >= 2 && heap.every((c, j) => c.state === 'active' && c.x === laid[j][0] && c.z === laid[j][1]),
    heap.map((c, j) => `${(c.x - laid[j][0]).toExponential(1)},${(c.z - laid[j][1]).toExponential(1)}`).join(' '));
  step(pp, IDLE);
  check('…and the crowd pushes the heap apart from the next step', heap.some((c, j) => Math.hypot(c.x - laid[j][0], c.z - laid[j][1]) > 1e-3));
}

console.log(failed ? `\n✗ sim: ${failed} failed, ${passed} passed` : `✔ sim: ${passed} checks`);
process.exit(failed ? 1 : 0);
