#!/usr/bin/env node
// hero.mjs — the hero and its input, held to 1.x's numbers, in bare node.
//
// 1.x's hero ran its timers once a rendered frame; the sim runs them once a
// 1/60 s step, so every count here is 1.x's at 60 Hz exactly
// (docs/port-1x/player-controls.md §3-§12, §14.4, §16.3). input.js is driven
// through stubbed DOM events and a stubbed pad.
//
// Usage: node test/hero.mjs           (exit 1 on any failure)
import { createWorld, step, api } from '../js/sim/world.js?v=159';
import { TUNING as T } from '../js/tuning.js?v=159';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const H = T.hero, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 0, az: 0, aim: false, fire: false, dash: false };
const W = (o = {}) => { const w = createWorld({ seed: 1, ...(typeof o === 'function' ? {} : o) }); w.director = { step() {} }; if (typeof o === 'function') o(w); return w; };
const run = (w, n, inp = IDLE) => { for (let i = 0; i < n; i++) step(w, typeof inp === 'function' ? inp(i) : inp); };
const heroShots = (w) => w.bullets.filter((b) => b.hero);

check('1/60 s steps, so 1.x\'s per-frame counts port as they are', near(dt, 1 / 60));

// ── 1.x's constants, as 1.x wrote them (player.js:5-17; main.js:9235, 11242-11268; tuning.js:146-160) ──
{
  const want = { radius: 0.5, hitRadius: 0.5, speed: 6, dashSpeed: 26, dashTime: 0.18, dashCooldown: 0.75, fireEvery: 0.09, muzzle: 0.3,
    mouseNoAim: 0.5, rapidMult: 0.4, lives: 3, mercy: 1.2, flash: 0.25, dashNormalise: false };
  for (const [k, v] of Object.entries(want)) check(`tuning.hero.${k} is 1.x's ${v}`, H[k] === v, `${H[k]}`);
  check('aim0 faces screen-right before the first shot (player.js:32)', H.aim0[0] === 1 && H.aim0[1] === 0);
  check('the squash spring is 0.28 / 0.84, clamped 0.55-1.55, kicked +0.6 by a dash and -0.9 by a hit (player.js:241, 252, 362-363)',
    H.sq.spring === 0.28 && H.sq.damp === 0.84 && H.sq.min === 0.55 && H.sq.max === 1.55 && H.sq.dash === 0.6 && H.sq.hit === -0.9);
  check('the pickups: reach 0.8, 3.0 s invincible, 8.0 s fire rate', H.pickup.reach === 0.8 && H.pickup.invincible === 3 && H.pickup.rapid === 8);
  const Wp = H.weapons;   // 1.x tuning.js:146-160 and the pod colours at main.js:1986-1995
  check('SPREAD 5 / 7 shots, pi/9 / pi/11 apart, rate 1', Wp.spread.l1.shots === 5 && Wp.spread.l1.step === 9 && Wp.spread.l1.rate === 1 && Wp.spread.l2.shots === 7 && Wp.spread.l2.step === 11 && Wp.spread.l2.rate === 1);
  check('BURST 4 / 6 rounds at rate 2.0 / 2.2', Wp.burst.l1.rounds === 4 && Wp.burst.l1.rate === 2 && Wp.burst.l2.rounds === 6 && Wp.burst.l2.rate === 2.2);
  check('LASER 1 rail at 1, then 2 rails 0.55 apart at 1.5', Wp.laser.l1.rails === 1 && Wp.laser.l1.rate === 1 && Wp.laser.l2.rails === 2 && Wp.laser.l2.railGap === 0.55 && Wp.laser.l2.rate === 1.5);
  check('RAPID at 0.45 / 0.30', Wp.rapid.l1.rate === 0.45 && Wp.rapid.l2.rate === 0.3);
  check('SHOTGUN 5 / 7 pellets over 0.45 / 0.5 rad at 1.55 / 1.5', Wp.shotgun.l1.pellets === 5 && Wp.shotgun.l1.spread === 0.45 && Wp.shotgun.l1.rate === 1.55 && Wp.shotgun.l2.pellets === 7 && Wp.shotgun.l2.spread === 0.5 && Wp.shotgun.l2.rate === 1.5);
  check('a hit costs a level (tuning.js:158)', Wp.hitCostsLevel === true);
  const cols = { spread: [0xffcc44, 0xffee11], burst: [0x44ffcc, 0x11ffee], laser: [0xff3355, 0xff1133], rapid: [0xaa55ff, 0xcc22ff], shotgun: [0xff8833, 0xffaa22] };
  check('the pod orbs wear WEAPON_PODS\' colours', Object.entries(cols).every(([k, c]) => Wp[k].color[0] === c[0] && Wp[k].color[1] === c[1]));
  const L = T.heroLook;
  check('the ghosts: every 0.03 s, 0.28 s, 0x88bbff (player.js:13-15, 73), pooled 10 (2.0: 1.x\'s 7 for a longer dash)', L.ghost.count === 10 && L.ghost.every === 0.03 && L.ghost.life === 0.28 && L.ghost.color === 0x88bbff && L.ghost.opacity === 0.45 && L.ghost.scale === 0.6);
  check('the muzzle pop: r 0.2 at 0.85, 0.05 s (player.js:99-108, 467-474)', L.muzzle.r === 0.2 && L.muzzle.offset === 0.35 && L.muzzle.life === 0.05 && L.muzzle.opacity === 0.9 && L.muzzle.y === 0.3);
  check('the lunge: 0.4 / 0.025 / 0.45 / 0.35 / 0.3 (player.js:378-384)', L.stretch.vel === 0.4 && L.stretch.perSpeed === 0.025 && L.stretch.max === 0.45 && L.stretch.ease === 0.35 && L.stretch.minSpeed === 0.3);
  check('the blinks: mercy 0.3 + 0.7|sin 12t|, dash 0.35 + 0.65|sin 55t| (player.js:282, 328)', L.mercyBlink.base === 0.3 && L.mercyBlink.amp === 0.7 && L.mercyBlink.rate === 12 && L.dashBlink.base === 0.35 && L.dashBlink.amp === 0.65 && L.dashBlink.rate === 55);
  check('the haptics: 35 ms a hit, [50, 40, 90] the death (haptics.js:25, 30)', L.haptics.hit === 35 && L.haptics.death.join() === '50,40,90');
  check('the vignette: 0.32 s at 0.55 (main.js:4798, 5555-5557); the death shake 0.9 (main.js:9033)', L.vignette.life === 0.32 && L.vignette.alpha === 0.55 && L.vignette.inner === 0.35 && L.vignette.outer === 1.05 && L.deathShake === 0.9);
  check('the hero wears 1.x\'s white at 0.98, wobble 0.6 (player.js:61-65)', H.color === 0xffffff && L.opacity === 0.98 && L.wobble === 0.6);
}

// ── walking (player.js:5, 300-322) ─────────────────────────────────
{
  const w = W(); run(w, 60, { ...IDLE, mx: 1 });
  check('a full stick walks 6 u/s, no run-up', near(w.hero.x, 6, 1e-9), `x ${w.hero.x}`);
  const a = W(); step(a, { ...IDLE, mx: 1 });
  check('full speed from the first step', near(a.hero.x, 6 * dt, 1e-12));
  step(a, IDLE);
  check('and a dead stop the step you let go', near(a.hero.x, 6 * dt, 1e-12));
  const h = W(); run(h, 60, { ...IDLE, mx: 0.5 });
  check('half a stick walks half as fast (analog, linear)', near(h.hero.x, 3, 1e-9), `x ${h.hero.x}`);
  const d = W(); run(d, 60, { ...IDLE, mx: 1, mz: 1 });
  check('a long stick is renormalised: the diagonal is still 6 u/s', near(Math.hypot(d.hero.x, d.hero.z), 6, 1e-9));
  const c = W(); run(c, 600, { ...IDLE, mx: 1, mz: -0.3 });
  check('the wall is a hard clamp at the half-size less the radius', near(c.hero.x, c.hx - H.radius) && near(c.hero.z, -(c.hz - H.radius)), `${c.hero.x}, ${c.hero.z}`);
  const m = W(); m.hero.mercy = 1; step(m, { ...IDLE, mx: 1 });
  check('you walk through mercy at full speed', near(m.hero.x, 6 * dt, 1e-12));
}

// ── the dash (player.js:6-8, 244-299; main.js:9154-9158) ────────────
{
  const w = W(); const xs = [], inv = [];
  step(w, { ...IDLE, mx: 1, dash: true }); xs.push(w.hero.x); inv.push(api.invincible(w));
  for (let i = 0; i < 14; i++) { step(w, { ...IDLE, mx: 1 }); xs.push(w.hero.x); inv.push(api.invincible(w)); }
  const moved = xs.findIndex((x, i) => i > 0 && near(x - xs[i - 1], H.speed * dt, 1e-9));
  check('a dash runs 11 steps at 26 u/s', moved === 11, `walks again from step ${moved + 1}`);
  check('and covers 11 × 26 / 60 = 4.77 u', near(xs[10], 11 * 26 * dt, 1e-9), `x ${xs[10]}`);
  check('i-frames through the 10 steps before it ends, not the 11th', inv.slice(0, 10).every(Boolean) && !inv[10], inv.map((v) => (v ? 1 : 0)).join(''));
  check('the move stick is ignored while it runs', near(xs[5] - xs[4], 26 * dt, 1e-9));
}
{
  // the cooldown: 0.75 s from the dash's END, ticked once a step, no buffer
  const w = W(), starts = [];
  for (let i = 1; i <= 130; i++) { step(w, { ...IDLE, mx: 1, dash: true }); if (w.events.some((e) => e.type === 'dash')) starts.push(i); }
  check('mashing dash: a new one every 56 steps (11 dashing + 45 cooling = 0.93 s)', starts[0] === 1 && starts[1] === 57 && starts[2] === 113, starts.join(','));
  const b = W(); step(b, { ...IDLE, mx: 1, dash: true }); run(b, 20, { ...IDLE, mx: 1 });
  step(b, { ...IDLE, mx: 1, dash: true });
  run(b, 40, { ...IDLE, mx: 1 });
  check('a press inside the cooldown is lost, not buffered', b.hero.dash <= 0 && b.hero.dashId === 1);
  const c = W(); step(c, { ...IDLE, mx: 1, dash: true }); run(c, 4);
  step(c, { ...IDLE, mx: 0, mz: 1, dash: true });
  check('and a press during the dash does not turn it', c.hero.dashId === 1 && c.hero.dashZ === 0);
}
{
  // direction: where you walk; standing still, where you last shot
  const w = W(); step(w, { ...IDLE, mz: 1, ax: 1, az: 0, aim: true, fire: true, dash: true });
  check('a dash goes where you are walking, not where you aim', w.hero.dashX === 0 && w.hero.dashZ === 1);
  const s = W(); step(s, { ...IDLE, ax: 0, az: -1, aim: true, fire: true }); run(s, 3);
  step(s, { ...IDLE, ax: 1, az: 0, aim: true, dash: true });
  check('standing still, it goes the way of the last SHOT', s.hero.dashX === 0 && s.hero.dashZ === -1, `${s.hero.dashX}, ${s.hero.dashZ}`);
  const f = W(); step(f, { ...IDLE, dash: true });
  check('before any shot, that is screen-right', f.hero.dashX === 1 && f.hero.dashZ === 0);
  const h = W(); step(h, { ...IDLE, mx: 0.5, dash: true }); run(h, 12);
  check('half a stick dashes half as far, as 1.x did (trap T1)', near(h.hero.x, 0.5 * 11 * 26 * dt, 1e-9), `x ${h.hero.x}`);
  const keep = H.dashNormalise; H.dashNormalise = true;
  const n = W(); step(n, { ...IDLE, mx: 0.5, dash: true }); run(n, 12);
  H.dashNormalise = keep;
  check('with dashNormalise it dashes the full 4.77 u', near(n.hero.x, 11 * 26 * dt, 1e-9));
  // v124: a thumb resting on the move stick (a few px of jitter, under dashMoveMin) is not a walk: the dash is a
  // still one, the full 4.77 u the way of the last shot (1.x dashed ~0.1 u there: trap T1)
  const r = W(); step(r, { ...IDLE, ax: 0, az: -1, aim: true, fire: true }); run(r, 3);
  const z0 = r.hero.z; step(r, { ...IDLE, mx: 0.03, mz: 0.02, dash: true }); run(r, 12);
  check('a resting thumb\'s jitter on the move stick dashes the full 4.77 u the way of the last shot', r.hero.dashX === 0 && r.hero.dashZ === -1 && near(z0 - r.hero.z, 11 * 26 * dt, 1e-6), `${r.hero.dashX}, ${r.hero.dashZ}, ${z0 - r.hero.z}`);
  const q = W(); step(q, { ...IDLE, mx: H.dashMoveMin + 0.01, dash: true }); run(q, 12);
  check('a stick just past dashMoveMin is a walk, and dashes as short as 1.x\'s', near(q.hero.x, (H.dashMoveMin + 0.01) * 11 * 26 * dt, 1e-9), `x ${q.hero.x}`);
  const g = W(), ghosts = [];
  for (let i = 1; i <= 15; i++) { step(g, { ...IDLE, mx: 1, dash: i === 1 }); if (g.events.some((e) => e.type === 'ghost')) ghosts.push(i); }
  check('a ghost every 0.03 s from the first step: 6 a dash', ghosts.join(',') === '1,3,5,7,9,11', ghosts.join(','));
}
{
  // bullets and bodies pass through a dash; nothing lands and nothing grazes
  const w = W(); step(w, { ...IDLE, mx: 1, dash: true });
  api.fire.emit(w, w.hero.x, w.hero.z, 0, { src: 'test' });
  api.fire.emit(w, w.hero.x + 1, w.hero.z, 0, { src: 'test' });
  step(w, { ...IDLE, mx: 1 });
  check('a bullet passes through a dashing hero', w.hero.lives === 3 && w.grazes === 0, `lives ${w.hero.lives}, grazes ${w.grazes}`);
  check('and is not spent on it', w.bullets.filter((b) => !b.hero).length === 2);
}

// ── the FLICK dash (v18; owner, 2026-10-23): a flick's length is the
// distance, its speed the speed, its direction the way it goes ──────
{
  const { dashPlan } = await import('../js/sim/hero.js?v=159');
  const F = H.flick, flick = (sL, sV, dx = 0, dz = -1) => ({ kind: 'flick', sL, sV, dx, dz });
  const lo = dashPlan(flick(0, 0)), hi = dashPlan(flick(1, 1));
  check('the lightest flick is 1.x\'s dash, 4.77 u at 26 u/s in 11 steps (v91); the longest 11 u', near(lo.d, 26 * 11 / 60) && near(lo.v, 26) && lo.steps === 11 && near(hi.d, F.d[1]) && F.d[1] > 2 * 26 * 11 / 60, `${lo.d} @ ${lo.v} in ${lo.steps} … ${hi.d}`);
  check('the fastest at 46 u/s (1.x\'s 26)', near(hi.v, 46), hi.v);
  const long = dashPlan(flick(1, 0));
  check('a long slow flick is held to 24 steps: the speed gives way, never the distance', long.steps === 24 && near(long.d, 11) && near(long.v, 11 / (24 * dt)), JSON.stringify(long));
  check('the cooldown grows with the distance: 1.x\'s 0.75 s at 1.x\'s 4.77 u',
    near(dashPlan({ kind: 'flick', sL: (26 * 11 / 60 - F.d[0]) / (F.d[1] - F.d[0]), sV: 0.3 }).cd, 0.75, 0.01) && hi.cd > 0.75 && near(lo.cd, 0.75, 0.01), `${lo.cd} … ${hi.cd}`);
  const q = dashPlan(flick(0.5 + 1e-7, 0.5)), q2 = dashPlan(flick(0.5, 0.5));
  check('the strengths are quantised to 1/256, so a replay reproduces the dash', q.d === q2.d && q.v === q2.v);

  // in flight: exactly its distance, where it was flicked, whatever you walk
  const w = W(); const x0 = w.hero.x, z0 = w.hero.z;
  step(w, { ...IDLE, mx: 1, dash: flick(0.5, 0.5, 0, -1) });
  const P = dashPlan(flick(0.5, 0.5));
  const inv = [true];
  for (let i = 1; i < P.steps; i++) { step(w, { ...IDLE, mx: 1 }); inv.push(api.invincible(w)); }
  check('a flick goes where it was flicked, not where you walk, and exactly its distance', near(w.hero.x, x0, 1e-9) && near(z0 - w.hero.z, P.d, 1e-9), `${w.hero.x}, ${z0 - w.hero.z} vs ${P.d}`);
  step(w, { ...IDLE, mx: 1 });
  check('it lasts its steps, i-frames until its last, as 1.x\'s, and then you walk', inv.slice(0, -1).every(Boolean) && !inv[inv.length - 1] && near(w.hero.x - x0, H.speed * dt, 1e-9), `${inv.map(Number).join('')} x ${w.hero.x}`);
  const ev = (() => { const v = W(); step(v, { ...IDLE, dash: flick(0.5, 0.5) }); return v.events.find((e) => e.type === 'dash'); })();
  check('its dash event says what kind and how far', ev?.kind === 'flick' && near(ev.d, P.d) && ev.steps === P.steps);
  // its cooldown runs from its end
  const c = W(), starts = [];
  for (let i = 1; i <= 160; i++) { step(c, { ...IDLE, dash: i === 1 ? flick(1, 1) : true }); if (c.events.some((e) => e.type === 'dash')) starts.push(i); }
  check('the next dash comes its cooldown after its end', starts[1] === 1 + hi.steps + Math.ceil(hi.cd / dt - 1e-6), `${starts.join(',')} (steps ${hi.steps}, cd ${hi.cd})`);
  // a button is still 1.x's dash, to the step
  const b = W(); step(b, { ...IDLE, mx: 1, dash: true }); run(b, 10);
  check('a button (input.dash true) is 1.x\'s 4.77 u in 11 steps', near(b.hero.x, 11 * 26 * dt, 1e-9));

  // the CUT: a faster flick cuts deeper (owner: yes)
  const cut = (dash, mz = 0) => { const k = W({ dashMode: 'cut' }); const g = api.spawn(k, 'globbo', 0, -2, { isBoss: true, hp: 20 }); step(k, { ...IDLE, mz, dash }); run(k, 30); return 20 - g.hp; };
  const slowCut = cut(flick(0.5, 0)), btnCut = cut(true, -1), fastCut = cut(flick(0.5, 1));
  check('CUT: the slowest flick cuts 1.x\'s 2, as the button does (v91: no flick is slower than 1.x\'s dash), a fast flick 4', slowCut === H.cut.hits && btnCut === H.cut.hits && fastCut === 4, `${slowCut} / ${btnCut} / ${fastCut}`);
  // the PUSH: a faster flick shoves harder
  const push = (dash) => { const k = W({ dashMode: 'push' }); const g = api.spawn(k, 'globbo', 0, -1.6); step(k, { ...IDLE, dash }); return Math.hypot(g.kx, g.kz); };
  check('PUSH: a faster flick shoves harder', push(flick(0.5, 1)) > push(true) && push(true) > push(flick(0.5, 0)) * 0.99, `${push(flick(0.5, 0))} / ${push(true)} / ${push(flick(0.5, 1))}`);
}

// ── the upgrades (owner, 2026-10-21) ───────────────────────────────
{
  const w = W(); w.hero.dashLevel = 1;
  const g = api.spawn(w, 'globbo', 2, 0), b = api.spawn(w, 'globbo', 4, 0, { isBoss: true, hp: 5 });
  step(w, { ...IDLE, mx: 1, dash: true }); run(w, 12);
  check('level 1: the dash kills what it passes through', !g.alive);
  check('a boss takes one hit a dash', b.alive && b.hp === 5 - H.dashKill.bossHits, `hp ${b.hp}`);
  const z = W(); z.hero.dashLevel = 2;
  step(z, { ...IDLE, mx: 1, dash: true });
  const ring = heroShots(z);
  check('level 2: 1.x\'s 12-bullet boom', ring.length === 12, `${ring.length}`);
  check('from where the first dash step left you, in the boom\'s own orange', ring.every((r) => near(Math.hypot(r.x - 26 * dt, r.z), 24 * dt, 1e-9) && r.color === 0xff8844));
  let more = 0;
  for (let i = 0; i < 30; i++) { step(z, IDLE); more += z.events.filter((e) => e.type === 'dashBoom').length; }
  check('once a dash', more === 0);
  const z0 = W(); z0.hero.dashLevel = 1; step(z0, { ...IDLE, mx: 1, dash: true });
  check('level 1 has no boom', heroShots(z0).length === 0);

  // the reach: the hero's own radius past the body's, the reach a walk-in
  // hurts at (1.x main.js:10895); the cut runs before the bodies move, so a
  // body is judged where it stood when the first dash step ended
  const x1 = H.dashSpeed * dt, gr = T.species.globbo.radius;
  const inR = W(); inR.hero.dashLevel = 1;
  const gi = api.spawn(inR, 'globbo', x1, gr + H.dashKill.reach - 0.01);
  step(inR, { ...IDLE, mx: 1, dash: true });
  const outR = W(); outR.hero.dashLevel = 1;
  const go = api.spawn(outR, 'globbo', x1, gr + H.dashKill.reach + 0.01);
  step(outR, { ...IDLE, mx: 1, dash: true });
  check('it cuts within the body\'s radius + the hero\'s, and not past it', !gi.alive && go.alive);
  check('a walk-in touch is the same reach: what would hurt is what is cut', H.dashKill.reach === T.gel.contactRadius && H.dashKill.reach === H.radius);

  // a species' own hitTest decides touching (a long body along its length)
  const { BEHAVIOUR } = await import('../js/sim/species/index.js?v=159');
  const hadHit = BEHAVIOUR.globbo.hitTest, hadKill = BEHAVIOUR.globbo.onKill;
  const ht = W(); ht.hero.dashLevel = 1;
  const far = api.spawn(ht, 'globbo', 15, 8), on = api.spawn(ht, 'globbo', x1, 0);
  BEHAVIOUR.globbo.hitTest = (w, g) => g === far;
  step(ht, { ...IDLE, mx: 1, dash: true });
  BEHAVIOUR.globbo.hitTest = hadHit;
  check('a species\' hitTest says what the dash touches', !far.alive && on.alive);

  // a body a cut brings into being is judged from the next step, not mid-cut
  const sn = W(); sn.hero.dashLevel = 1; let kid = null;
  api.spawn(sn, 'globbo', x1, 0);
  BEHAVIOUR.globbo.onKill = (w, g, a) => { if (!kid) kid = a.spawn(w, 'globbo', g.x + 0.3, g.z, { child: true }); };
  step(sn, { ...IDLE, mx: 1, dash: true });
  const kidAfter1 = kid?.alive;
  step(sn, { ...IDLE, mx: 1 });
  BEHAVIOUR.globbo.onKill = hadKill;
  check('a body born of a cut is not cut in the same step, and is on the next', kid && kidAfter1 === true && !kid.alive);

  // a boss takes the cut as a hit: the event the view ripples and sounds on
  const bh = W(); bh.hero.dashLevel = 1;
  const boss = api.spawn(bh, 'globbo', x1, 0, { isBoss: true, hp: 5 });
  step(bh, { ...IDLE, mx: 1, dash: true });
  check('a boss cut is a hit: hp, flash and a hit event', boss.hp === 4 && boss.flash > 0 && bh.events.some((e) => e.type === 'hit' && e.id === boss.id));
}
{
  // level 0 is 1.x's dash: bodies pass through it as bullets do (main.js:10886-10887)
  const w = W(), g = api.spawn(w, 'globbo', 2, 0);
  step(w, { ...IDLE, mx: 1, dash: true }); run(w, 9, { ...IDLE, mx: 1 });
  check('a dash runs through a body that hurts to touch, and leaves it be', w.hero.lives === 3 && g.alive && w.hero.x > g.x, `lives ${w.hero.lives}, x ${w.hero.x.toFixed(2)} vs ${g.x.toFixed(2)}`);
  const s = W(); api.spawn(s, 'globbo', 0.9, 0); step(s, IDLE);
  check('standing in one is a hit', s.hero.lives === 2);
}

// ── the gun (player.js:9, 399-475) ─────────────────────────────────
{
  const w = W(), at = [];
  for (let i = 1; i <= 60; i++) { step(w, { ...IDLE, ax: 0, az: 1, aim: true, fire: true }); if (w.events.some((e) => e.type === 'shot')) at.push(i); }
  check('held fire: a shot every 6 steps, 10 a second (the timer is assigned, not carried)', at.length === 10 && at.every((s, i) => s === 1 + 6 * i), at.join(','));
  const one = W(); step(one, { ...IDLE, ax: 0, az: 1, aim: true, fire: true });
  const b = heroShots(one)[0];
  check('a shot leaves 0.8 from the centre along the aim, and flies its first step at once', near(b.z, 0.8 + 24 * dt, 1e-9) && near(b.x, 0), `${b.z}`);
  const m = W(); run(m, 30, { ...IDLE, ax: 1, az: 0, aim: true, fire: false });
  check('aiming without the trigger fires nothing (a mouse with no button held)', heroShots(m).length === 0);
  check('and does not turn the eyes: they face the last shot', m.hero.aimX === H.aim0[0] && m.hero.aimZ === H.aim0[1]);
  const t = W(); run(t, 30, { ...IDLE, ax: 1, az: 0, aim: false, fire: true });
  check('a trigger with nothing aimed fires nothing', heroShots(t).length === 0);
  const r = W(), rat = [];
  for (let i = 1; i <= 12; i++) {
    step(r, { ...IDLE, ax: 1, az: 0, aim: true, fire: i === 1 || i >= 3 });
    if (r.events.some((e) => e.type === 'shot')) rat.push(i);
  }
  check('letting go and pulling again does not reset the gun', rat[0] === 1 && rat[1] === 7, rat.join(','));
  const d = W(), dat = [];
  step(d, { ...IDLE, mx: 1, ax: 0, az: 1, aim: true, fire: true, dash: true }); if (d.events.some((e) => e.type === 'shot')) dat.push(1);
  for (let i = 2; i <= 11; i++) { step(d, { ...IDLE, ax: 0, az: 1, aim: true, fire: true }); if (d.events.some((e) => e.type === 'shot')) dat.push(i); }
  check('it fires through a dash', dat.join(',') === '1,7');
  const q = W(); q.hero.rapid = 8; const qat = [];
  for (let i = 1; i <= 12; i++) { step(q, { ...IDLE, ax: 1, aim: true, fire: true }); if (q.events.some((e) => e.type === 'shot')) qat.push(i); }
  check('the fire-rate pickup\'s ×0.4 period is 3 steps', qat.join(',') === '1,4,7,10', qat.join(','));
}

// ── the pods (player.js:404-465, main.js:2058-2091) ─────────────────
{
  const { equipWeapon } = await import('../js/sim/hero.js?v=159');
  const FIRE = { ...IDLE, ax: 1, az: 0, aim: true, fire: true };
  // 1.x's own recurrence (player.js:261, 387-397, 400, 465): the period is
  // ASSIGNED on the trigger and ticked once a frame, each owed round's timer
  // likewise, so every cadence here is derived from 1.x's numbers, not read
  // off the port
  const cadence = (period, rounds = 1, n = 24) => {
    const at = []; let t = 0, q = [];
    for (let i = 1; i <= n; i++) {
      if (t > 0) t -= dt;
      q = q.filter((r) => { r.t -= dt; if (r.t > 0) return true; at.push(i + 'r'); return false; });
      if (t <= 0) { at.push(String(i)); t = period; for (let k = 1; k < rounds; k++) q.push({ t: (period / rounds) * k }); }
    }
    return at.join(',');
  };
  const fireAt = (w, n = 24) => { const at = []; for (let i = 1; i <= n; i++) { step(w, FIRE); if (w.events.some((e) => e.type === 'shot')) at.push(i + (w.events.some((e) => e.type === 'shot' && e.round) ? 'r' : '')); } return at.join(','); };
  const angles = (w) => heroShots(w).map((b) => Math.atan2(b.vz, b.vx)).sort((a, b) => a - b);
  const sp = W(); equipWeapon(sp, 'spread'); step(sp, FIRE);
  check('SPREAD L1: five shots, pi/9 apart, centred on the aim (player.js:427-434)', angles(sp).every((a, i) => near(a, (i - 2) * (Math.PI / 9))), angles(sp).map((a) => a.toFixed(3)).join(' '));
  const sp2 = W(); equipWeapon(sp2, 'spread'); equipWeapon(sp2, 'spread'); step(sp2, FIRE);
  check('SPREAD L2: seven, pi/11 apart', angles(sp2).length === 7 && angles(sp2).every((a, i) => near(a, (i - 3) * (Math.PI / 11))));
  check('SPREAD fires on the bare gun\'s cadence', fireAt(W((w) => equipWeapon(w, 'spread'))) === cadence(0.09) && cadence(0.09) === '1,7,13,19');
  const sg = W(); equipWeapon(sg, 'shotgun'); step(sg, FIRE);
  check('SHOTGUN L1: five pellets at (i-2)·0.225 rad, so ±0.45 (player.js:417-426)', angles(sg).every((a, i) => near(a, (i - 2) * 0.225)), angles(sg).map((a) => a.toFixed(3)).join(' '));
  check('SHOTGUN L1 fires every 9 steps (0.1395 s): 6.7/s at 60 Hz', fireAt(W((w) => equipWeapon(w, 'shotgun'))) === cadence(0.09 * 1.55) && cadence(0.09 * 1.55) === '1,10,19');
  check('BURST L1: four rounds inside one 0.18 s cycle, the rest 0.045 s apart (player.js:435-442)', fireAt(W((w) => equipWeapon(w, 'burst'))) === cadence(0.18, 4) && cadence(0.18, 4) === '1,4r,7r,10r,12,15r,18r,21r,23');
  check('BURST L2: six in 0.198 s', fireAt(W((w) => { equipWeapon(w, 'burst'); equipWeapon(w, 'burst'); })) === cadence(0.09 * 2.2, 6) && cadence(0.09 * 2.2, 6).startsWith('1,3r,5r,7r,9r,11r,13'));
  const bq = W(); equipWeapon(bq, 'burst'); step(bq, FIRE); run(bq, 3, { ...IDLE, ax: 0, az: 1, aim: true, fire: false });
  check('a BURST\'s owed rounds keep the line they were fired on', heroShots(bq).length === 2 && heroShots(bq).every((b) => b.vz === 0 && b.vx > 0));
  const la = W(); equipWeapon(la, 'laser'); equipWeapon(la, 'laser'); step(la, FIRE);
  const rails = heroShots(la).map((b) => b.z).sort((a, b) => a - b);
  check('LASER L2: two rails ±0.55 across the shot (player.js:446-449)', rails.length === 2 && near(rails[0], -0.55) && near(rails[1], 0.55), rails.join(' '));
  check('and every LASER bullet pierces (main.js:2075-2076)', heroShots(la).every((b) => b.pierce === true));
  check('LASER L2 fires every 9 steps (0.135 s)', fireAt(W((w) => { equipWeapon(w, 'laser'); equipWeapon(w, 'laser'); })) === '1,10,19');
  check('RAPID L1 fires every 3 steps (0.0405 s: 20/s at 60 Hz, not the nominal 24.7)', fireAt(W((w) => equipWeapon(w, 'rapid'))) === cadence(0.09 * 0.45) && cadence(0.09 * 0.45) === '1,4,7,10,13,16,19,22');
  check('RAPID L2 every 2 (0.027 s: 30/s)', fireAt(W((w) => { equipWeapon(w, 'rapid'); equipWeapon(w, 'rapid'); })) === cadence(0.09 * 0.3) && cadence(0.09 * 0.3).startsWith('1,3,5,7,9'));
  // equipping, 1.x main.js:2058-2078: a pod lands at level 1; the same family
  // again earns level 2; anything else — a different family, OR the same one
  // while already at 2 — lands at level 1
  const eq = W();
  check('a pod lands at level 1', equipWeapon(eq, 'spread') === 1 && eq.hero.weapon.fam === 'spread');
  check('the same family again is level 2', equipWeapon(eq, 'spread') === 2);
  check('the same family at level 2 lands at level 1 again, as 1.x wrote it (held.level === 1 is part of the test, main.js:2065)', equipWeapon(eq, 'spread') === 1);
  equipWeapon(eq, 'spread');
  check('a different family swaps in at level 1', equipWeapon(eq, 'burst') === 1 && eq.hero.weapon.fam === 'burst');
  check('an unknown pod is refused', equipWeapon(eq, 'homing') === 0 && eq.hero.weapon.fam === 'burst');
  // a hit, 1.x weaponTakeHit (main.js:2083-2091, from tryHitPlayer at 4801)
  equipWeapon(eq, 'burst');
  check('a hit knocks level 2 down to 1', api.hurt(eq, 'globbo') && eq.hero.weapon.level === 1 && eq.events.some((e) => e.type === 'weapon' && e.down));
  eq.hero.mercy = 0;
  check('and never takes the gun away', api.hurt(eq, 'globbo') && eq.hero.weapon.fam === 'burst' && eq.hero.weapon.level === 1);
  const bare = W(); equipWeapon(bare, 'rapid'); bare.hero.rapid = 8; const bat = fireAt(bare, 12);
  check('the fire-rate pickup multiplies a pod\'s period too (0.0405 × 0.4 → 1 step)', bat === '1,2,3,4,5,6,7,8,9,10,11,12', bat);
}

// ── hit, mercy, lives (player.js:10-11, 234-242; main.js:4558-4563, 4789-4816) ──
{
  const w = W(); w.streak = 4;
  check('three lives', w.hero.lives === 3);
  check('a hit lands', api.hurt(w, 'globbo') && w.hero.lives === 2);
  check('it resets the streak', w.streak === 0);
  check('1.2 s of mercy and the 0.25 s red flash', w.hero.mercy === 1.2 && w.hero.flash === 0.25, `${w.hero.mercy} ${w.hero.flash}`);
  let k = 0;
  for (k = 1; k <= 200; k++) { step(w, IDLE); if (api.hurt(w, 'globbo')) break; }
  check('mercy covers the next 71 steps; the 72nd can be hit', k === 72, `hit again at step ${k}`);
  check('the third hit is the last', (() => { run(w, 80); return api.hurt(w, 'spittor') && w.over && !w.hero.alive && w.hero.lives === 0; })());
  check('it names what got you', w.killedBy === 'spittor');
  check('the fatal hit sets no mercy (1.x die() just hides the hero)', w.hero.mercy <= 0);
  check('a dead hero cannot be hit again', !api.hurt(w, 'globbo') && w.hero.lives === 0);
  const s = W(); s.hero.invinc = 3;
  check('the invincibility pickup\'s timer is i-frames too', !api.hurt(s, 'globbo') && s.hero.lives === 3);
  const { grantInvincibility, grantRapid } = await import('../js/sim/hero.js?v=159');
  const gi = W(); grantInvincibility(gi); check('the invincibility pickup gives 3.0 s (main.js:11249)', gi.hero.invinc === 3);
  gi.hero.invinc = 2; grantInvincibility(gi, 1); check('a pickup takes the LONGER timer, never adds (player.js:177)', gi.hero.invinc === 2);
  grantRapid(gi); check('the fire-rate pickup gives 8.0 s (main.js:11268)', gi.hero.rapid === 8);
  gi.hero.rapid = 1; grantRapid(gi, 0.5); check('and takes the longer too (player.js:178)', gi.hero.rapid === 1);
  // a bullet crossing the hero's path, 0.6 out (it moves 7/60 before the test)
  const b = W(); api.fire.emit(b, 0.6, 0, Math.PI / 2, { src: 'spittor' }); step(b, IDLE);
  check('a gel bullet hits inside 0.15 + 0.5 of the centre', b.hero.lives === 2);
  const o = W(); api.fire.emit(o, 0.7, 0, Math.PI / 2, { src: 'spittor' }); step(o, IDLE);
  check('one just outside misses, and grazes', o.hero.lives === 3 && o.grazes === 1);
}

// ── the squash spring (player.js:362-365; §14.4's table) ───────────
{
  const w = W(); api.hurt(w, 'globbo'); const sq = [];
  for (let i = 0; i < 60; i++) { step(w, IDLE); sq.push(w.hero.sq); }
  check('a hit pins the body flat at 0.55 for 5 steps', sq.slice(0, 5).every((v) => v === H.sq.min) && sq[5] > H.sq.min);
  const peak = Math.max(...sq.slice(5, 15));
  check('then rebounds to 1.26', near(peak, 1.262, 0.0005), peak.toFixed(4));
  const settle = sq.findLastIndex((v) => Math.abs(v - 1) >= 0.02) + 1;
  check('and settles in 0.63 s', (settle + 1) * dt > 0.62 && (settle + 1) * dt < 0.64, `${((settle + 1) * dt).toFixed(3)} s`);
  const d = W(); const dq = [];
  step(d, { ...IDLE, dash: true }); dq.push(d.hero.sq);
  for (let i = 0; i < 60; i++) { step(d, IDLE); dq.push(d.hero.sq); }
  check('a dash kicks it tall: 1.504, then 1.55 for two steps', near(dq[0], 1.504) && dq[1] === H.sq.max && dq[2] === H.sq.max && dq[3] < H.sq.max, dq.slice(0, 4).map((v) => v.toFixed(3)).join(' '));
  const low = Math.min(...dq.slice(3, 12));
  check('undershoots to 0.68', near(low, 0.684, 0.0005), low.toFixed(4));
  const ds = dq.findLastIndex((v) => Math.abs(v - 1) >= 0.02) + 1;
  check('and settles in 0.70 s', near((ds + 1) * dt, 0.70, 0.01), `${((ds + 1) * dt).toFixed(3)} s`);
}

// ── the stretch (player.js:371-385) ────────────────────────────────
{
  const w = W(); run(w, 60, { ...IDLE, mx: 1 });
  check('walking settles the lunge at 0.15, along the walk', near(w.hero.stretch, 0.15, 1e-6) && near(w.hero.stretchX, 1));
  const d = W(); step(d, { ...IDLE, mx: 1, dash: true }); run(d, 9);
  check('a dash reaches 0.44 in 10 steps, under the 0.45 cap', near(d.hero.stretch, 0.442, 0.001), d.hero.stretch.toFixed(4));
}

// ── input.js: 1.x's three devices, through stubbed events ──────────
{
  const L = {}, tgt = { l: {}, addEventListener(t, f) { (this.l[t] ||= []).push(f); } };
  globalThis.addEventListener = (t, f) => (L[t] ||= []).push(f);
  globalThis.innerWidth = 1000; globalThis.innerHeight = 500;
  let pads = [];
  Object.defineProperty(globalThis, 'navigator', { value: { getGamepads: () => pads }, configurable: true });
  const { Input } = await import('../js/input.js?v=159');
  const fire = (on, type, e) => (on[type] || []).forEach((f) => f({ preventDefault() {}, target: null, repeat: false, ...e }));
  let clock = 1000;   // the events' own timeStamps, ms (flick.js reads those, never the wall clock)
  const touch = (type, id, x, y, dt = 16) => fire(tgt.l, type, { timeStamp: (clock += dt), changedTouches: [{ identifier: id, clientX: x, clientY: y }] });
  const inp = new Input(tgt); inp.enabled = true; inp.read();

  touch('touchstart', 1, 200, 300); touch('touchmove', 1, 230, 300);
  let o = inp.read();
  check('touch: the left half is an analog move stick, full at 60 px', near(o.mx, 0.5) && o.my === 0 && !o.fire);
  touch('touchmove', 1, 200, 220); o = inp.read();
  check('past 60 px it holds at full', near(o.my, -1) && o.mx === 0);
  touch('touchstart', 2, 700, 300); touch('touchmove', 2, 700, 300 + 14); o = inp.read();
  check('the right half aims and fires only past 15 px', !o.aim && !o.fire);
  touch('touchmove', 2, 700, 300 + 15); o = inp.read();
  check('at 15 px it aims and fires', o.aim && o.fire && near(o.ay, 1));
  touch('touchstart', 3, 800, 200); touch('touchmove', 3, 900, 200); o = inp.read();
  check('a second finger on a held side is ignored', near(o.ay, 1) && o.ax === 0);
  touch('touchend', 3, 900, 200); o = inp.read();
  check('and its release does nothing', !o.dash);
  // v124 (owner: "more like in v. 1.x"): DASH BY LIFT, the default, is 1.x's — every let-go of the aim stick is
  // 1.x's own dash (true: where you walk), a tap included; a cancelled touch is none
  check('a fresh Input dashes by LIFT, 1.x\'s', inp.dashBy === 'lift', inp.dashBy);
  touch('touchend', 2, 700, 315, 300); o = inp.read();
  check('LIFT: letting go of the aim stick is 1.x\'s dash', o.dash === true && !o.fire && inp.lastGesture?.kind === 'release', `${o.dash} ${inp.lastGesture?.kind}`);
  touch('touchstart', 4, 700, 300); touch('touchend', 4, 700, 300, 80); o = inp.read();
  check('LIFT: a quick tap is 1.x\'s dash too', o.dash === true && inp.lastGesture?.kind === 'tap', `${o.dash} ${inp.lastGesture?.kind}`);
  touch('touchstart', 4, 700, 300); touch('touchcancel', 4, 700, 300); o = inp.read();
  check('LIFT: a cancelled touch is no dash', !o.dash);
  // FLICK, v18's: only a flick dashes
  inp.dashBy = 'flick';
  touch('touchstart', 2, 700, 300); touch('touchmove', 2, 700, 315); inp.read();
  touch('touchend', 2, 700, 315, 300); o = inp.read();
  check('FLICK: letting go of the aim stick is no dash (v18: only a flick dashes)', !o.dash && !o.fire && inp.lastGesture?.kind === 'release', inp.lastGesture?.kind);
  touch('touchstart', 4, 700, 300); touch('touchend', 4, 700, 300, 80); o = inp.read();
  const tapKind = inp.lastGesture?.kind;
  touch('touchstart', 4, 700, 300); touch('touchcancel', 4, 700, 300); o.dash ||= inp.read().dash;
  check('FLICK: a quick tap is no dash, nor is a cancelled touch', !o.dash && tapKind === 'tap', tapKind);
  // a flick: the thumb held out to aim, then thrown 7 mm up in 50 ms and
  // lifted still moving (a touchmove a 60 Hz frame, as a screen reports it)
  const flick = (id, from, to, ms, hold = 300) => {
    touch('touchstart', id, from[0], from[1]); touch('touchmove', id, from[0] + 30, from[1]);
    const n = Math.max(1, Math.round(ms / 16.7));
    for (let i = 1; i <= n; i++) touch('touchmove', id, from[0] + 30 + (to[0] * i) / n, from[1] + (to[1] * i) / n, i === 1 ? hold : ms / n);
    touch('touchend', id, from[0] + 30 + to[0], from[1] + to[1], 4);
    return inp.read();
  };
  o = flick(6, [700, 300], [0, -44], 50);
  // v91: an ordinary 7 mm flick sits at the foot of the length ramp — it buys 1.x's own dash — and its speed above the foot of the speed ramp
  check('a flick dashes: the gesture, which way it went, how long and how fast',
    o.dash?.kind === 'flick' && near(o.dash.dirX, 0) && near(o.dash.dirY, -1) && o.dash.sL === 0 && o.dash.sV > 0, JSON.stringify(o.dash));
  const short = o.dash, long = flick(7, [700, 300], [0, -140], 50).dash, slow = flick(8, [700, 300], [0, -44], 100).dash;
  check('a longer flick reads longer (sL), at about the same speed or more', long?.sL > short.sL && long.sV >= short.sV - 1e-9, `${short.sL} → ${long?.sL}`);
  check('a slower flick of the same length reads slower (sV), the same length', slow?.kind === 'flick' && slow.sV < short.sV && near(slow.sL, short.sL, 1e-9), `${short.sV} → ${slow?.sV}`);
  // v91 (1.x parity): the thumb thrown, then stopped 80 ms before it lifts, is still that throw — 1.x dashed on
  // every lift, and a thumb landing its flick stops before it leaves the glass; stopped for 300 ms, it had come
  // to rest, and lifting a resting thumb is the plain let-go that stays no dash
  touch('touchstart', 9, 700, 300); touch('touchmove', 9, 730, 300);
  for (let i = 1; i <= 3; i++) touch('touchmove', 9, 730, 300 - 15 * i, i === 1 ? 300 : 16);
  touch('touchend', 9, 730, 255, 80); o = inp.read();
  check('a throw that stopped 80 ms before the lift still dashes, up the screen (v91)', o.dash?.kind === 'flick' && near(o.dash.dirY, -1) && o.dash.land > 60, JSON.stringify(inp.lastGesture));
  touch('touchstart', 13, 700, 300); touch('touchmove', 13, 730, 300);
  for (let i = 1; i <= 3; i++) touch('touchmove', 13, 730, 300 - 15 * i, i === 1 ? 300 : 16);
  touch('touchend', 13, 730, 255, 300); o = inp.read();
  check('a throw that rested 300 ms before the lift is no dash', !o.dash && inp.lastGesture?.kind === 'release' && inp.lastGesture.land > T.input.flick.landMs, JSON.stringify(inp.lastGesture));
  // an aim sweep that lifts while creeping round: long, but never fast
  touch('touchstart', 10, 700, 300); touch('touchmove', 10, 740, 300);
  for (let i = 1; i <= 24; i++) { const a = (i / 24) * 1.2; touch('touchmove', 10, 700 + 40 * Math.cos(a), 300 + 40 * Math.sin(a), i === 1 ? 200 : 16.7); }
  touch('touchend', 10, 700 + 40 * Math.cos(1.2), 300 + 40 * Math.sin(1.2), 4); o = inp.read();
  check('an aim sweep lifted while still creeping is no dash', !o.dash && inp.lastGesture?.kind === 'release', JSON.stringify(inp.lastGesture));
  T.input.flick.tap = true;
  touch('touchstart', 11, 700, 300); touch('touchend', 11, 700, 300, 80); o = inp.read();
  T.input.flick.tap = false;
  check('with input.flick.tap a tap is 1.x\'s own dash again', o.dash === true);
  // a throw too short to be a flick, still moving at the lift: no dash, and the
  // play record counts it as a NEAR flick (v63, a flick the thumb meant)
  o = flick(12, [700, 300], [0, -12], 33);
  check('a fast stroke too short to dash is no dash, and counts as a near flick', !o.dash && inp.lastGesture?.kind === 'release' && inp.letGos.near === 1, JSON.stringify(inp.lastGesture));
  // (v124: one let-go and one tap more than v123's count, the LIFT checks', read the same way)
  check('the let-gos are counted for the play record: flicks, near flicks, let-gos, taps', JSON.stringify(inp.letGos) === JSON.stringify({ flick: 4, near: 1, release: 4, tap: 3 }), JSON.stringify(inp.letGos));
  inp.resetCounts();
  check('…and counted again from nothing for each run', Object.values(inp.letGos).every((n) => n === 0));
  touch('touchend', 1, 200, 220); o = inp.read();
  check('letting go of the move stick stops you dead, and is no dash', o.mx === 0 && o.my === 0 && !o.dash);
  touch('touchstart', 5, 500, 10); touch('touchmove', 5, 520, 40); o = inp.read();
  check('the top-centre strip pauses and moves no stick', o.pause && !inp.left.active && !inp.right.active);
  touch('touchend', 5, 520, 40); o = inp.read();
  check('and its release is no dash', !o.dash);

  const key = (type, code) => fire(L, type, { code });
  key('keydown', 'KeyD'); key('keydown', 'KeyW'); o = inp.read();
  check('keys: a diagonal is normalised', near(Math.hypot(o.mx, o.my), 1) && o.mx > 0 && o.my < 0);
  key('keydown', 'Space'); o = inp.read();
  check('Space does not dash when pressed', !o.dash);
  key('keyup', 'Space'); o = inp.read();
  check('it dashes when released (1.x input.js:46)', o.dash);
  key('keyup', 'KeyD'); key('keyup', 'KeyW');
  inp.enabled = false; key('keydown', 'Space'); inp.read(); inp.enabled = true; inp.read(); key('keyup', 'Space'); o = inp.read();
  check('a Space pressed in a menu is not a dash when it lets go in play', !o.dash);
  fire(tgt.l, 'mousemove', { clientX: 10, clientY: 10 }); o = inp.read({ x: 0, y: 0 });
  check('the mouse aims without firing', o.source === 'keys' && o.aim && !o.fire);
  fire(tgt.l, 'mousedown', { button: 2 }); o = inp.read({ x: 0, y: 0 });
  check('and fires while any button is held', o.fire);
  // 1.x merged the devices by priority (input.js:170-208): a touch stick that
  // is HELD wins over the keys and the mouse, even at rest
  touch('touchstart', 6, 700, 300); o = inp.read({ x: 0, y: 0 });
  check('a held aim stick inside its deadzone silences the mouse: no aim, no fire', !o.aim && !o.fire && o.source === 'touch');
  touch('touchend', 6, 700, 300); inp.read();
  key('keydown', 'KeyD'); touch('touchstart', 7, 200, 300); o = inp.read();
  check('a held move stick at rest beats a held key', o.mx === 0 && o.my === 0);
  touch('touchend', 7, 200, 300); o = inp.read();
  check('and the key walks again once it is let go', o.mx === 1);
  // the page losing focus lets go of everything, and a stick let go that way is no dash
  touch('touchstart', 8, 700, 300); touch('touchmove', 8, 760, 300);
  fire(L, 'blur', {}); o = inp.read({ x: 0, y: 0 });
  check('blur lets go of the keys, the button and the sticks', o.mx === 0 && !o.fire && !inp.right.active && !inp.keys.size);
  touch('touchend', 8, 760, 300); o = inp.read();
  check('and the thumb lifting later is no dash', !o.dash);
  fire(L, 'mouseup', {});

  const pad = (axes, pressed = []) => { pads = [{ connected: true, axes, buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: pressed.includes(i) })) }]; };
  pad([0.19, 0, 0, 0]); o = inp.read();
  check('pad: a stick inside the radial 0.20 is still', o.mx === 0 && o.my === 0);
  pad([0.25, 0, 0, 0]); o = inp.read();
  check('past it, the raw value: no rescale from the edge', near(o.mx, 0.25) && inp.source === 'pad');
  pad([0.9, 0.9, 0, 0]); o = inp.read();
  check('a long stick is renormalised', near(Math.hypot(o.mx, o.my), 1));
  pad([0, 0, 0.15, 0.15]); o = inp.read();
  check('the right stick past 0.20 (radially) aims and fires', o.aim && o.fire && near(o.ax, Math.SQRT1_2) && o.source === 'pad');
  pad([0, 0, 0, 0], [7]); o = inp.read();
  check('RT dashes (1.x input.js:136)', o.dash);
  pad([0, 0, 0, 0], [7, 0]); o = inp.read();
  check('holding one dash button and pressing another is not a second dash', !o.dash);
  pad([0, 0, 0, 0], []); inp.read(); pad([0, 0, 0, 0], [5]); o = inp.read();
  check('RB dashes', o.dash);
  pad([0, 0, 0, 0], []); inp.read(); pad([0, 0, 0, 0], [4]); o = inp.read();
  check('LB does not (it was Rush\'s ability)', !o.dash);
  pad([0, 0, 0, 0], []); inp.read(); pad([0, 0, 0, 0], [9]); o = inp.read();
  check('Start pauses', o.pause);
  pad([0, 0, 0, 0], []); inp.read(); inp.enabled = false; inp.read(); pad([0, 0, 0, 0], [0]); inp.enabled = true; o = inp.read();
  check('the A that started the run is not its first dash', !o.dash);
  // 1.x's priority (input.js:171, 198): a pushed pad stick beats a held touch
  // stick, to move and to aim; still, the touch sticks have it back
  pad([0, 0, 0, 0], []); inp.read();
  touch('touchstart', 9, 200, 300); touch('touchmove', 9, 260, 300);
  touch('touchstart', 10, 700, 300); touch('touchmove', 10, 700, 360);
  pad([0, -0.5, -0.9, 0]); o = inp.read();
  check('a pushed pad stick beats a held touch stick, to move and to aim', near(o.my, -0.5) && o.mx === 0 && near(o.ax, -1) && o.fire && o.source === 'pad');
  pad([0, 0, 0, 0]); o = inp.read();
  check('and the touch sticks have it back once the pad is still', near(o.mx, 1) && near(o.ay, 1) && o.fire && o.source === 'touch');
  touch('touchend', 9, 260, 300); touch('touchend', 10, 700, 360); inp.read();
  key('keydown', 'Escape'); o = inp.read(); key('keyup', 'Escape');
  check('Esc pauses', o.pause);
}

// ── the timers, the wall, the pull, and where things leave from ─────
// (player.js:177, 238, 262-263, 266-267, 289, 367-369, 391-393, 467-471;
// main.js:4798-4801, 10209-10212, 11249, 11268). A timer read off a
// 1/60 s clock can land a step either side of its seconds, as 1.x's did.
{
  const about = (n, secs) => Math.abs(n * dt - secs) <= dt + 1e-9;
  const f = W(); api.hurt(f, 'globbo'); let n = 0;
  while (f.hero.flash > 0 && n < 100) { step(f, IDLE); n++; }
  check('the red flash runs 0.25 s (player.js:238, 266-267)', about(n, 0.25), `${n} steps`);
  const iv = W(); iv.hero.invinc = H.pickup.invincible; let k = 0;
  for (k = 1; k <= 400; k++) { step(iv, IDLE); if (api.hurt(iv, 'globbo')) break; }
  check('the invincibility pickup is 3.0 s of i-frames, then a hit lands (main.js:11249, player.js:262)', about(k, 3.0) && iv.hero.lives === 2, `hit at step ${k}`);
  const rq = W(); rq.hero.rapid = H.pickup.rapid; run(rq, Math.ceil(H.pickup.rapid / dt) + 1); const rat = [];
  for (let i = 1; i <= 12; i++) { step(rq, { ...IDLE, ax: 1, aim: true, fire: true }); if (rq.events.some((e) => e.type === 'shot')) rat.push(i); }
  check('the fire-rate pickup runs out after 8.0 s: the bare 6-step gun again (main.js:11268, player.js:263)', rat.join(',') === '1,7', rat.join(','));
  const md = W(); md.hero.mercy = 1; step(md, { ...IDLE, mx: 1, dash: true });
  check('a dash starts through mercy (1.x dash() asks only the dash and its cooldown, player.js:246)', md.hero.dashId === 1 && near(md.hero.x, 26 * dt, 1e-12));
  // a dash into the wall slides along it; its ghost is laid where the dash
  // got to BEFORE the clamp (player.js:289 copies the position, 367 clamps it)
  const wl = W(); wl.hero.x = wl.hx - 0.6; const D = Math.SQRT1_2;
  step(wl, { ...IDLE, mx: D, mz: D, dash: true });
  const gh = wl.events.find((e) => e.type === 'ghost');
  check('a dash\'s first ghost is laid before the clamp', gh && near(gh.x, wl.hx - 0.6 + D * 26 * dt, 1e-9) && near(wl.hero.x, wl.hx - H.radius), `${gh?.x} ${wl.hero.x}`);
  run(wl, 10, { ...IDLE, mx: D, mz: D });
  check('and the dash slides along the wall with what is left of it', near(wl.hero.x, wl.hx - H.radius) && near(wl.hero.z, D * 11 * 26 * dt, 1e-9), `${wl.hero.x}, ${wl.hero.z}`);
  // MAGNA's pull lands after the bodies move, and is clamped (main.js:10209-10212)
  const pl = W(); pl.hero.x = pl.hx - 0.6; pl.hero.pullX = 0.5; pl.hero.pullZ = -0.25; step(pl, IDLE);
  check('a pull drags the hero, and the wall still holds', near(pl.hero.x, pl.hx - H.radius) && near(pl.hero.z, -0.25) && pl.hero.pullX === 0 && pl.hero.pullZ === 0);
  // the muzzle pop sits at radius + 0.35 along the shot (player.js:467-471)
  const mz = W(); step(mz, { ...IDLE, ax: 0, az: -1, aim: true, fire: true });
  const sh = mz.events.find((e) => e.type === 'shot');
  check('the muzzle is 0.85 out along the shot', sh && near(sh.x, 0) && near(sh.z, -0.85) && !sh.round);
  // a BURST's owed round leaves from where the hero is NOW (player.js:391-393)
  const { equipWeapon: eqw } = await import('../js/sim/hero.js?v=159');
  const bw = W(); eqw(bw, 'burst');
  run(bw, 4, { ...IDLE, mz: 1, ax: 1, az: 0, aim: true, fire: true });
  const zs = heroShots(bw).map((b) => b.z).sort((a, b) => a - b);
  check('a BURST round leaves from where the hero has walked to', zs.length === 2 && near(zs[0], 6 * dt) && near(zs[1], 4 * 6 * dt), zs.join(' '));
  // the fatal hit: 1.x die() hides the hero (no flash, no mercy, no squash),
  // and weaponTakeHit runs after hit() whatever it did (main.js:4799-4801), so
  // a level 2 pod goes down a level on the way out too
  const dd = W(); dd.hero.lives = 1; eqw(dd, 'laser'); eqw(dd, 'laser');
  check('the last hit ends the run', api.hurt(dd, 'globbo') && dd.over && !dd.hero.alive);
  check('with no flash, no mercy and no squash', dd.hero.flash === 0 && dd.hero.mercy === 0 && dd.hero.sqV === 0);
  check('and the pod knocked down all the same', dd.hero.weapon.level === 1);
}

// ── the PUSH dash, on test beside 1.x's (owner, 2026-10-22) ─────────
{
  const P = H.push, fr = Math.exp(-T.gel.knockFriction * dt), x1 = H.dashSpeed * dt, gr = T.species.globbo.radius;
  check('a world is 1.x\'s unless told: pass-through dash, hit points as written', W().dashMode === 'pass' && W().hpMult === 1);
  check('the push\'s numbers: reach 1.5, force 18 × 0.55 / r, a plough, on knock friction 3', P.reach === 1.5 && P.force === 18 && P.heavy === 0.55 && P.plough === true && T.gel.knockFriction === 3);
  const w = W({ dashMode: 'push' });
  const g = api.spawn(w, 'globbo', 1.5, 0);
  const hp0 = g.hp;
  step(w, { ...IDLE, mx: 1, dash: true });
  check('it knocks a body straight away from the hero, by force × 0.55 / r, coasting on the core\'s friction',
    near(g.kx, P.force * P.heavy / gr * fr, 1e-9) && near(g.kz, 0, 1e-9), `kx ${g.kx}`);
  check('at dash level 0 the shove does not hurt', g.alive && g.hp === hp0);
  {
    // the plough: still in reach and slowed (here, stopped by hand), it is pushed on again
    const wp = W({ dashMode: 'push' }), gq = api.spawn(wp, 'globbo', 0.9, 0);
    step(wp, { ...IDLE, mx: 1, dash: true });
    gq.kx = gq.kz = 0; gq.x = wp.hero.x + 0.9; gq.z = wp.hero.z;
    step(wp, IDLE);
    check('a plough: a body still in reach mid-dash is kept moving away at the shove\'s speed', near(gq.kx, P.force * P.heavy / gr * fr, 1e-9), `${gq.kx}`);
  }
  let shoves = w.events.filter((e) => e.type === 'shove').length;
  for (let i = 0; i < 10; i++) { step(w, IDLE); shoves += w.events.filter((e) => e.type === 'shove').length; }
  check('once a dash', shoves === 1, `${shoves}`);
  {
    const twin = W(); const gt = api.spawn(twin, 'globbo', 1.5, 0);
    step(twin, { ...IDLE, mx: 1, dash: true }); run(twin, 10);
    check('the knock carries it off: over a metre past where 1.x\'s dash leaves the same body', g.x - gt.x > 1, `${(g.x - gt.x).toFixed(3)}`);
  }
  run(w, Math.ceil(H.dashCooldown / dt) + 2);
  const gx = g.x; w.hero.x = gx - 1; w.hero.z = g.z; g.kx = g.kz = 0;
  step(w, { ...IDLE, mx: 1, dash: true });
  check('the next dash shoves it again', g.kx > 0);

  const pass = W(); const gp = api.spawn(pass, 'globbo', 1.5, 0);
  step(pass, { ...IDLE, mx: 1, dash: true });
  check('1.x\'s dash does not shove', gp.kx === 0 && gp.kz === 0);

  const inR = W({ dashMode: 'push' }), gi = api.spawn(inR, 'globbo', x1, gr + P.reach - 0.01);
  step(inR, { ...IDLE, mx: 1, dash: true });
  const outR = W({ dashMode: 'push' }), go = api.spawn(outR, 'globbo', x1, gr + P.reach + 0.01);
  step(outR, { ...IDLE, mx: 1, dash: true });
  check('it reaches the body\'s edge within 1.5, and not past it', gi.kz > 0 && go.kz === 0);

  const big = W({ dashMode: 'push' }), gb = api.spawn(big, 'globbo', 1.5, 0, { isBoss: true, hp: 9 });
  step(big, { ...IDLE, mx: 1, dash: true });
  check('a bigger body takes less of it (a boss, 1.5 × the radius, two thirds)', near(gb.kx, P.force * P.heavy / gb.r * fr, 1e-9) && gb.kx < g.kx + 1e-9);

  const planted = W({ dashMode: 'push' });
  const ga = api.spawn(planted, 'globbo', 1.5, 0, { affix: 'anchored' });
  const gf = api.spawn(planted, 'pyra', 1.5, 1.0);
  step(planted, { ...IDLE, mx: 1, dash: true });
  check('a planted body stands: ANCHORED, and the FIXED role (PYRA)', ga.kx === 0 && ga.kz === 0 && gf.kx === 0 && gf.kz === 0);

  const hurt = W({ dashMode: 'push' }); hurt.hero.dashLevel = 1;
  const gh = api.spawn(hurt, 'globbo', 1.5, 0, { hp: 3 });
  const bh = api.spawn(hurt, 'globbo', 1.5, 1.2, { isBoss: true, hp: 5 });
  step(hurt, { ...IDLE, mx: 1, dash: true });
  check('at dash level 1 the shove is a hit, a boss\'s included', gh.hp === 3 - P.hurt && bh.hp === 5 - P.hurt && gh.kx > 0, `${gh.hp} ${bh.hp}`);
  const one = W({ dashMode: 'push' }); one.hero.dashLevel = 1;
  const g1 = api.spawn(one, 'globbo', 1.5, 0, { hp: 1 });
  step(one, { ...IDLE, mx: 1, dash: true });
  check('… and a shove that empties a body kills it, as the dash', !g1.alive);
  const boom = W({ dashMode: 'push' }); boom.hero.dashLevel = 2;
  step(boom, { ...IDLE, mx: 1, dash: true });
  check('level 2 keeps the boom', heroShots(boom).length === H.dashBoom.count);

  // a cube mid-tumble writes its position from the tumble's origin each
  // step: the knock has to move the origin too, or the shove is thrown away
  {
    const mk = () => { const w = W({ dashMode: 'push' }); w.hero.x = -8; const c = api.spawn(w, 'orange', 0, 0); return [w, c]; };
    const [wa, ca] = mk(), [wb, cb] = mk();
    let n = 0;
    while (!(ca.s.flopping && cb.s.flopping) && n++ < 600) { step(wa, IDLE); step(wb, IDLE); }
    ca.kz += 6;
    run(wa, 20); run(wb, 20);
    check('a cube shoved mid-tumble keeps the shove', n < 600 && ca.z - cb.z > 0.5, `${n} steps, ${(ca.z - cb.z).toFixed(3)}`);
  }

  // the sponge test: every non-boss body's hit points × hpMult, rounded
  const sp = W({ hpMult: 3 });
  const s1 = api.spawn(sp, 'globbo', 5, 0);
  const s2 = api.spawn(sp, 'globbo', 5, 2, { variant: 'elite' });
  const s3 = api.spawn(sp, 'globbo', 5, 4, { isBoss: true, hp: 20 });
  const base = T.species.globbo.hp, elite = Math.ceil(base * T.variants.elite.hp);
  check('GEL HP ×3 triples a body\'s hit points, an elite\'s after its own ×', s1.hp === base * 3 && s1.maxHp === base * 3 && s2.hp === elite * 3, `${s1.hp} ${s2.hp}`);
  check('… and leaves a boss as the wave built it', s3.hp === 20);
}

// ── the CUT dash: through, and it hurts (owner, 2026-10-22) ─────────
{
  const C = H.cut;
  check('a CUT is 2 hits a body', C.hits === 2);
  const w = W({ dashMode: 'cut' });
  const a = api.spawn(w, 'globbo', 2, 0, { hp: 5 });
  const b = api.spawn(w, 'globbo', 3.5, 0, { hp: 2 });
  const boss = api.spawn(w, 'globbo', 4.5, 0, { isBoss: true, hp: 9 });
  step(w, { ...IDLE, mx: 1, dash: true });
  let cuts = w.events.filter((e) => e.type === 'dashCut').length;
  for (let i = 0; i < 12; i++) { step(w, IDLE); cuts += w.events.filter((e) => e.type === 'dashCut').length; }
  check('at dash level 0 it cuts every body it passes, once a dash, for 2 hits', a.alive && a.hp === 5 - C.hits && !b.alive && cuts === 3, `${a.hp} ${b.alive} ${cuts}`);
  check('… a boss\'s included', boss.alive && boss.hp === 9 - C.hits, `${boss.hp}`);
  check('… and it passes through: no knock', a.kx === 0 && a.kz === 0);
  check('the hero went through them all', w.hero.x > 4.5);
  const up = W({ dashMode: 'cut' }); up.hero.dashLevel = 1;
  const u = api.spawn(up, 'globbo', 2, 0, { hp: 9 }), ub = api.spawn(up, 'globbo', 4, 0, { isBoss: true, hp: 9 });
  step(up, { ...IDLE, mx: 1, dash: true }); run(up, 12);
  check('from dash level 1 it kills what is not a boss outright; a boss still takes 2', !u.alive && ub.hp === 9 - C.hits, `${u.alive} ${ub.hp}`);
  const pass = W(); const p0 = api.spawn(pass, 'globbo', 2, 0, { hp: 5 });
  step(pass, { ...IDLE, mx: 1, dash: true }); run(pass, 12);
  check('1.x\'s PASS at level 0 still leaves them be', p0.alive && p0.hp === 5);
}

console.log(failed ? `\n✗ hero: ${failed} failed, ${passed} passed` : `✔ hero: ${passed} checks`);
process.exit(failed ? 1 : 0);
