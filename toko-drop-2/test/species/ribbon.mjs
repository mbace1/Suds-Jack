#!/usr/bin/env node
// ribbon.mjs — RIBBON's own checks, in bare node: 1.x's numbers (enemy.js:625,
// 814, 973-990, 1272-1288, 1391-1459, 1704-1710, 2727, 2976-2984; tuning.js:
// 315, 334-339, 496-497; main.js:2416, 4476-4480, 10166, 10649-10652, 10894),
// asserted against the sim stepping on its fixed 1/60 s — the steer against an
// independent model of 1.x's `_arcSteer` and `_updateRibbon` — and its look
// against a real three.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=157';
import { TUNING as T } from '../../js/tuning.js?v=157';
import behaviour from '../../js/sim/species/ribbon.js?v=157';
import look from '../../js/render/looks/ribbon.js?v=157';
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

const S = T.species.ribbon, A = S.arc, TR = S.trail, K = S.look, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const TAU = Math.PI * 2;

// a world with nothing in it but one RIBBON, the hero where asked; anchored
// (no swarm forces, no crowd) unless asked, so what moves it is its own step
function world({ seed = 1, mode = 'arcade', x = 0, z = 0, hero = [12, 0], o = {}, anchored = true, dashMode = 'pass', invinc = true } = {}) {
  const w = createWorld({ seed, mode, dashMode });
  w.director = { step() {} };
  const h = w.hero; h.x = h.px = hero[0]; h.z = h.pz = hero[1];
  if (invinc) h.invinc = 1e9;                    // a hero who cannot be hurt, so a long run never ends
  const g = api.spawn(w, 'ribbon', x, z, o);
  g.anchored = anchored;
  return { w, g };
}
const run = (w, n, input = IDLE) => { for (let i = 0; i < n; i++) step(w, input); };
// lay a straight trail along −x from (x0, z0), the head on its newest point
function straight(g, x0 = 0, z0 = 0) {
  g.x = g.px = x0; g.z = g.pz = z0;
  g.s.trail = Array.from({ length: TR.samples }, (_, i) => ({ x: x0 - i * TR.step, z: z0 }));
}

// 1.x's _arcSteer + _updateRibbon (enemy.js:1272-1288, 1418), written out
// again from the source rather than imported: the port must agree with it
function model(m, hx, hz, spd, HX, HZ) {
  const want = Math.atan2(hz - m.z, hx - m.x);
  m.phase += dt * 1.7;
  const desired = want + Math.sin(m.phase) * 0.55;
  let d = desired - m.heading;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const max = 2.2 * dt;
  m.heading += Math.max(-max, Math.min(max, d));
  const nx = m.x + Math.cos(m.heading) * spd * dt, nz = m.z + Math.sin(m.heading) * spd * dt;
  const cx = Math.max(-(HX - 0.4), Math.min(HX - 0.4, nx)), cz = Math.max(-(HZ - 0.4), Math.min(HZ - 0.4, nz));
  m.bent = cx !== nx || cz !== nz;
  if (m.bent) m.heading += 2.2 * dt * 2;
  m.x = cx; m.z = cz;
  const tr = m.trail;
  if (Math.hypot(m.x - tr[0].x, m.z - tr[0].z) >= 0.30) { tr.pop(); tr.unshift({ x: m.x, z: m.z }); m.pushes++; }
}
const fromBody = (g) => ({ x: g.x, z: g.z, heading: g.s.heading, phase: g.s.phase, trail: g.s.trail.map((p) => ({ ...p })), pushes: 0, bent: false });
const sameTrail = (a, b, e = 0) => a.length === b.length && a.every((p, i) => near(p.x, b[i].x, e) && near(p.z, b[i].z, e));

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.4, hp 4, speed 2.6, cyan 0x66ddee (1.x enemy.js:625)', S.radius === 0.4 && S.hp === 4 && S.speed === 2.6 && S.color === 0x66ddee);
  check('CFG: no gun (enemy.js:625, _tick 2790)', S.bulletColor === null && S.fireInterval === null);
  check('its own body (custom), SCHOOL, hurts to touch in classic (MELEE_TYPES main.js:2416), not a HARDCADE biter (tuning.js:496-497)',
    S.family === 'custom' && S.role === 'SCHOOL' && S.contact === true && S.revenge === null && T.movement.roles.SCHOOL);
  check('the steer: 2.2 rad/s turn limit, weave 1.7 rad/s × 0.55 rad, a wall bends it 2× more (1.x tuning.js:335-337, enemy.js:1286)',
    A.turnRate === 2.2 && A.weaveHz === 1.7 && A.weaveAmp === 0.55 && A.wallBend === 2 && A.phase0[0] === 0 && A.phase0[1] === TAU);
  check('the body: 22 samples, 0.30 apart by distance, 0.34 wide (1.x tuning.js:339)', TR.samples === 22 && TR.step === 0.30 && TR.width === 0.34);
  check('the weave runs at the swarm\'s own weaveSpeed (1.x tuning.js:336 "matches movement.weaveSpeed")', A.weaveHz === T.movement.weaveSpeed);
  check('the look: blob satin, 3 spline points a sample, tension 0.5, nose taper 6, y 0.30 + 0.10 arch, dies fading from 0.82 (1.x enemy.js:814, 1395, 1410, 1431-1432, 2983)',
    K.family === 'blob' && K.subdiv === 3 && K.tension === 0.5 && K.noseTaper === 6 && K.y === 0.30 && K.arch === 0.10 && K.deathOpacity === 0.82);
  const D = S.deathSound;
  check('it dies with the cube\'s square pop and hiss, as 1.x filed it (main.js:4476-4480, audio.js:248)',
    D.wave === 'square' && D.f0 === 380 && D.f1 === 55 && D.dur === 0.18 && D.vol === 0.22 && D.noiseVol === 0.09 && D.noiseDur === 0.13);
  const src = readFileSync(new URL('../../js/sim/species/ribbon.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  check('it takes hits the ordinary way and dies the core\'s death (1.x hit() and destroy() have no RIBBON branch)', !behaviour.onHit && !behaviour.onKill);
  check('…but it hit-tests itself, and touches with the same body (enemy.js:1444-1459)', typeof behaviour.hitTest === 'function' && typeof behaviour.touches === 'function');
}

// ── its starting state (1.x enemy.js:973-990, 1391-1394) ─────────────
{
  const spots = [[10, 3], [-12, -6], [0, 9], [5, -8]];
  let heads = true, laid = true;
  for (const [x, z] of spots) {
    const { g } = world({ x, z });
    heads &&= g.s.heading === Math.atan2(-z, -x) && near(g.faceX, Math.cos(g.s.heading)) && near(g.faceZ, Math.sin(g.s.heading));
    laid &&= g.s.trail.length === 22 && g.s.trail.every((p, i) => p.x === x && near(p.z, z - i * 0.3, 1e-12));
  }
  check('its first heading is at the arena\'s centre: atan2(−z, −x) (enemy.js:980)', heads);
  check('it lies straight up the screen from its spawn: 22 points, 0.30 apart toward −z (enemy.js:1394)', laid);
  const phases = [];
  for (let seed = 1; seed <= 200; seed++) phases.push(world({ seed }).g.s.phase);
  check('its weave starts anywhere in [0, 2π), drawn from the run\'s seed (enemy.js:980)',
    phases.every((p) => p >= 0 && p < TAU) && Math.min(...phases) < 0.3 && Math.max(...phases) > TAU - 0.3 && world({ seed: 7 }).g.s.phase === world({ seed: 7 }).g.s.phase);
}

// ── the steer, step for step against 1.x's own (enemy.js:1272-1288, 1418) ──
{
  const cases = [
    { name: 'chasing a hero in the open', x: -10, z: 5, hero: [12, 0], n: 900 },
    { name: 'a hero in a corner, so it meets the walls', x: 4, z: -6, hero: [17.5, 9.5], n: 1800 },
    { name: 'a hero behind it at the far wall', x: 15, z: 0, hero: [-18, -10], n: 1200 },
    { name: 'a fast wave (speedMult 2.4)', x: -16, z: -9, hero: [0, 0], n: 900, o: { speedMult: 2.4 } },
  ];
  for (const c of cases) {
    const { w, g } = world({ x: c.x, z: c.z, hero: c.hero, o: c.o || {} });
    const m = fromBody(g), spd = S.speed * (c.o?.speedMult ?? 1);
    let same = true, bends = 0, at = -1;
    for (let i = 0; i < c.n && same; i++) {
      model(m, w.hero.x, w.hero.z, spd, w.hx, w.hz);
      step(w, IDLE);
      if (m.bent) bends++;
      same = g.x === m.x && g.z === m.z && g.s.heading === m.heading && g.s.phase === m.phase && g.s.bent === m.bent && sameTrail(g.s.trail, m.trail);
      if (!same) at = i;
    }
    check(`${c.name}: head, heading, weave and body match 1.x's to the bit for ${c.n} steps`, same, `diverged at step ${at}`);
    check(`${c.name}: it grows its body as it goes`, m.pushes > c.n * spd * dt / 0.31 * 0.8, `${m.pushes} samples`);
    if (c.name.includes('corner')) check('…and the walls bent it', bends > 0, `${bends}`);
  }
}

// ── the turn-rate limit, the weave and the speed ─────────────────────
{
  // the hero straight behind: it can only come round at 2.2 rad/s
  const { w, g } = world({ x: 0, z: 0, hero: [-10, 0] });
  g.s.heading = 0; g.s.phase = 0;
  const hs = [g.s.heading];
  for (let i = 0; i < 40; i++) { step(w, IDLE); hs.push(g.s.heading); }
  const dh = hs.slice(1).map((h, i) => h - hs[i]);
  check('a hero behind it: it turns at exactly the limit, 2.2 · dt a step, never faster (enemy.js:1280-1281)',
    dh.every((d) => near(Math.abs(d), 2.2 * dt, 1e-12)) && dh.every((d) => Math.sign(d) === Math.sign(dh[0])));
  run(w, 60);
  const want = Math.atan2(w.hero.z - g.z, w.hero.x - g.x);
  let off = g.s.heading - want; off = Math.atan2(Math.sin(off), Math.cos(off));
  check('…and a U-turn takes it about π / 2.2 ≈ 1.4 s', Math.abs(off) < A.weaveAmp + 1e-9);

  // the weave is a heading OFFSET: once caught up it flies exactly the desired heading
  const f = world({ x: -15, z: 0, hero: [30, 0] }); // a hero too far to reach (outside the arena: the target only)
  f.g.s.heading = 0;
  f.w.hero.x = 18.5; f.w.hero.px = 18.5;
  run(f.w, 30);
  let tracks = true, curvy = 0, along = true;
  for (let i = 0; i < 150; i++) {
    const x0 = f.g.x, z0 = f.g.z;
    step(f.w, IDLE);
    const des = Math.atan2(f.w.hero.z - z0, f.w.hero.x - x0) + Math.sin(f.g.s.phase) * A.weaveAmp;
    let e = f.g.s.heading - des; e = Math.atan2(Math.sin(e), Math.cos(e));
    tracks &&= Math.abs(e) < 1e-9;
    curvy = Math.max(curvy, Math.abs(f.g.z));
    // it moves along its heading: the path curves, it never crabs sideways
    const mv = Math.atan2(f.g.z - z0, f.g.x - x0);
    let ea = mv - f.g.s.heading; ea = Math.atan2(Math.sin(ea), Math.cos(ea));
    along &&= Math.abs(ea) < 1e-9;
  }
  check('the serpentine: heading = want + sin(phase) · 0.55 once caught up (its swing, 0.94 rad/s, is under the limit) (enemy.js:1275-1276)', tracks);
  check('…so the path curves (here ' + curvy.toFixed(2) + ' u off the straight line) …', curvy > 0.4);
  check('…and every step is along the heading: it never crabs (enemy.js:1282-1283)', along);
  const ph0 = f.g.s.phase; step(f.w, IDLE);
  check('its weave phase runs at 1.7 rad/s, a step at a time', near(f.g.s.phase - ph0, 1.7 * dt, 1e-12));

  // the speed: 2.6 u/s × the wave, × SWIFT, × a SIREN's surge
  const pace = (o, setup) => {
    const s = world({ x: 0, z: 0, hero: [10, 0], o });
    setup?.(s.g);
    const x0 = s.g.x, z0 = s.g.z;
    step(s.w, IDLE);
    return Math.hypot(s.g.x - x0, s.g.z - z0) / dt;
  };
  check('it covers 2.6 u/s (enemy.js:625, 1699-1700)', near(pace({}), 2.6, 1e-9));
  check('…× the wave\'s speedMult', near(pace({ speedMult: 1.7 }), 2.6 * 1.7, 1e-9));
  check('…× 1.35 SWIFT (main.js:9416)', near(pace({ affix: 'swift' }), 2.6 * T.variants.swiftSpeed, 1e-9) && T.variants.swiftSpeed === 1.35);
  check('…× a SIREN\'s surge while it lasts (enemy.js:1698-1700)', near(pace({}, (g) => { g.surgeT = 1; g.surgeMult = 1.6; }), 2.6 * 1.6, 1e-9));
}

// ── the wall (enemy.js:1284-1287) ────────────────────────────────────
{
  const { w, g } = world({ x: 0, z: 0, hero: [18, 8] });
  g.x = g.px = w.hx - 0.4 - 0.01; g.z = g.pz = 0;
  g.s.heading = 0; g.s.phase = 0;
  const m = fromBody(g);
  model(m, w.hero.x, w.hero.z, S.speed, w.hx, w.hz);
  const h0 = g.s.heading;
  step(w, IDLE);
  check('a step into the wall is clamped there, and bends the heading a further 2 · 2.2 · dt off it',
    g.s.bent && g.x === w.hx - 0.4 && near(g.s.heading - h0, 2.2 * dt + 2 * 2.2 * dt, 1e-12) && g.s.heading === m.heading && g.x === m.x);
  // an elite stands at the wall the core holds it at (g.r), and bends off that one
  const e = world({ x: 0, z: 0, hero: [18, 8], o: { variant: 'elite' } });
  e.g.x = e.g.px = e.w.hx - e.g.r - 0.01; e.g.s.heading = 0; e.g.s.phase = 0;
  step(e.w, IDLE);
  check('an elite (r × 1.2) bends off the wall the core holds it at, never stuck sliding along it', e.g.s.bent && near(e.g.x, e.w.hx - e.g.r, 1e-12) && near(e.g.r, 0.48, 1e-12));
}

// ── the body: sampled by distance (enemy.js:1418) ───────────────────
{
  const { w, g } = world({ x: -12, z: 4, hero: [12, -3] });
  let ok = true, n = 0, spaced = true;
  for (let i = 0; i < 1200; i++) {
    const t0 = { ...g.s.trail[0] };
    step(w, IDLE);
    const tr = g.s.trail, pushed = !(tr[0].x === t0.x && tr[0].z === t0.z);
    // a new point is taken exactly when the head stands a step from the last
    const due = Math.hypot(g.x - t0.x, g.z - t0.z) >= 0.3;
    ok &&= pushed === due && tr.length === 22 && (!pushed || (tr[0].x === g.x && tr[0].z === g.z));
    if (pushed) n++;
  }
  const tr = g.s.trail;
  for (let i = 1; i < tr.length; i++) spaced &&= Math.hypot(tr[i].x - tr[i - 1].x, tr[i].z - tr[i - 1].z) >= 0.3 - 1e-12;
  check('a point is taken the step the head is 0.30 from the newest — and only then; the oldest goes; always 22', ok && n > 100);
  check('…so the points are at least 0.30 apart and the body is ~6.3 u long whatever the frame rate', spaced);
  check('at 2.6 u/s that is a new point every 7 steps (0.30 / (2.6 · dt) = 6.9)', (() => {
    const s = world({ x: -15, z: 0, hero: [18, 0] }); s.g.s.heading = 0; s.g.s.phase = Math.PI / 2; // a straight-ish run
    straight(s.g, -15, 0);
    let k = 0; const t0 = s.g.s.trail[0];
    while (s.g.s.trail[0] === t0 && k < 20) { step(s.w, IDLE); k++; }
    return k === 7;
  })());
}

// ── hitting it: along its length, at the width it has there (enemy.js:1452-1457) ──
{
  const { w, g } = world({ x: 0, z: 0 });
  straight(g, 0, 0);
  const r = T.bullets.heroRadius, ht = (x, z, rr = r) => behaviour.hitTest(w, g, x, z, rr);
  const e = 1e-9, mid = 0.34 * (1 - 10 / 22), tail = 0.34 * (1 - 21 / 22);
  check('the newest point hits at its radius 0.4 + the bullet\'s', ht(0.4 + r - e, 0) && !ht(0.4 + r + e, 0));
  check('the middle (point 10) at 0.34 · 12/22 + r', ht(-3, mid + r - e) && !ht(-3, mid + r + e));
  check('the tail (point 21) at 0.34 · 1/22 + r — it tapers to almost nothing', ht(-6.3, tail + r - e) && !ht(-6.3, tail + r + e));
  check('past the tail it is gone', !ht(-6.3 - tail - r - 0.01, 0));
  // the head itself is not the body: a head a few hundredths past the newest point
  g.x = 0.29;
  check('the body is the trail, never the head circle: a shot at the head but beyond the newest point misses', !ht(0.29 + 0.4, 0) && ht(0.29 - 0.1, 0));
  g.x = 0;

  // through the core: a hero bullet across the tail lands
  const b = world({ x: 0, z: 0, hero: [0, 8] }); straight(b.g, 0, 0); b.g.s.heading = Math.PI; b.g.s.phase = 0;
  api.heroBullet(b.w, -6.0, -T.bullets.heroSpeed * dt, Math.PI / 2);   // after its step it is on the body at x −6
  step(b.w, IDLE);
  check('a hero bullet across the TAIL hits it — 4 hp to 3 — with the hit at the bullet (main.js:10649-10652)',
    b.g.hp === 3 && b.w.events.some((ev) => ev.type === 'hit' && ev.id === b.g.id) && b.w.bullets.filter((x) => x.hero).length === 0);
  api.heroBullet(b.w, -6.0, -0.6 - T.bullets.heroSpeed * dt, 0);      // along, 0.6 off the body
  step(b.w, IDLE);
  check('…one passing 0.6 off it flies on', b.g.hp === 3 && b.w.bullets.filter((x) => x.hero).length === 1);
  // and four of them kill it, as anybody: the kill at the head
  const k = world({ x: 2, z: 0, hero: [0, 8] }); straight(k.g, 2, 0); k.g.s.heading = Math.PI;
  let killed = null;
  for (let i = 0; i < 4; i++) {
    api.heroBullet(k.w, -2, -T.bullets.heroSpeed * dt, Math.PI / 2);
    step(k.w, IDLE);
    killed ||= k.w.events.find((ev) => ev.type === 'kill');
  }
  check('four hits kill it; the kill is at the head, a ribbon, the hero\'s', killed && killed.kind === 'ribbon' && killed.src === 'hero' && near(killed.x, k.g.x) && !k.w.gels.length);
  // HARDCADE: it is not a biter, its corpse stays quiet
  const hc = world({ mode: 'hardcade', x: 2, z: 0, hero: [0, 8] }); hc.w.wave = 9; straight(hc.g, 2, 0);
  hc.g.hp = 1; api.heroBullet(hc.w, -2, -T.bullets.heroSpeed * dt, Math.PI / 2); step(hc.w, IDLE);
  check('HARDCADE: its corpse does not bite (1.x tuning.js:496-497)', !hc.w.gels.length && !hc.w.events.some((ev) => ev.type === 'revenge') && hc.w.bullets.length === 0);
}

// ── touching it: the same body, at the hero's radius (enemy.js:1459, main.js:10894) ──
{
  const at = (hz, hx = -3) => {
    const { w, g } = world({ x: 0, z: 0, hero: [hx, hz], invinc: false });
    straight(g, 0, 0); g.s.heading = Math.PI; g.s.phase = 0;
    step(w, IDLE);
    return w.hero.lives;
  };
  const reach = 0.34 * (1 - 10 / 22) + T.gel.contactRadius;
  check('standing on its MIDDLE hurts, 3 m from its head (MELEE_TYPES along the body)', at(reach - 0.005) === T.hero.lives - 1);
  check('…just off its width does not', at(reach + 0.01) === T.hero.lives);
  check('…its tail still hurts', at(0.3, -6.3) === T.hero.lives - 1);
  check('the hero\'s contact reach is 1.x\'s PLAYER_RADIUS 0.5', T.gel.contactRadius === 0.5 && T.hero.radius === 0.5);
}

// ── the dashes: a CUT goes through its length and does damage ─────────
// (owner, 2026-10-22: "likely we want dashes that go through and do damage
// in the end"; 1.x's one body-cutting dash asked e.touches(), main.js:10166)
{
  const across = (mode, level = 0, hp) => {
    const { w, g } = world({ x: 0, z: 0, hero: [-5, -3], dashMode: mode, invinc: false });
    straight(g, 0, 0); g.s.heading = Math.PI; g.s.phase = Math.PI;     // its head points away, it holds the line a moment
    w.hero.dashLevel = level;
    if (hp != null) g.hp = hp;
    let missedHead = true, cuts = 0, kill = null;
    step(w, { ...IDLE, mz: 1, dash: true });
    for (let i = 0; i < 14; i++) {
      missedHead &&= Math.hypot(g.x - w.hero.x, g.z - w.hero.z) > g.r + T.hero.dashKill.reach;
      cuts += w.events.filter((ev) => ev.type === 'dashCut').length;
      kill ||= w.events.find((ev) => ev.type === 'kill');
      step(w, IDLE);
    }
    return { g, w, missedHead, cuts, kill };
  };
  const cut = across('cut');
  check('a CUT dash across its TAIL, 5 u from its head, hurts it: 4 hp to 2 (TUNING.hero.cut.hits), once a dash',
    cut.missedHead && cut.cuts === 1 && cut.g.hp === 4 - T.hero.cut.hits && T.hero.cut.hits === 2);
  check('…and the hero comes through it unhurt', cut.w.hero.lives === T.hero.lives);
  const fin = across('cut', 0, 2);
  check('…a second one finishes it, a dash kill', fin.kill && fin.kill.src === 'dash' && fin.kill.kind === 'ribbon' && !fin.w.gels.length);
  const pass = across('pass');
  check('1.x\'s own dash (PASS) goes through it and does nothing to it', pass.cuts === 0 && pass.g.hp === 4 && pass.w.hero.lives === T.hero.lives);
  const lvl = across('pass', 1);
  check('a dash-kill upgrade (level 1) cuts it along its length too', lvl.kill && lvl.kill.src === 'dash');

  // a knock (the PUSH dash's shove) moves its head on top of its own step, and stays
  const twin = () => { const s = world({ x: 0, z: 0, hero: [10, 4] }); s.g.s.phase = 0; return s; };
  const a = twin(), b = twin();
  b.g.kx = 6;
  step(a.w, IDLE); step(b.w, IDLE);
  const fr = Math.exp(-T.gel.knockFriction * dt);
  check('a knock moves its head as the core integrates it, on top of its own step (world.js gelStep)',
    near(b.g.x - a.g.x, 6 * fr * dt, 1e-12) && b.g.z === a.g.z && b.g.s.heading === a.g.s.heading);
  const x1 = b.g.x;
  step(b.w, IDLE);
  check('…and its next step starts from where the knock left it: nothing thrown away',
    near(b.g.x - x1 - Math.cos(b.g.s.heading) * S.speed * dt, 6 * fr * fr * dt, 1e-12));
  // the PUSH dash proper, through the core: the shove reaches it by its head
  const p = world({ x: 0, z: 0, hero: [-1.2, 0], dashMode: 'push', invinc: false, anchored: false });   // ANCHORED stands
  p.g.s.phase = 0;
  step(p.w, { ...IDLE, mx: 1, dash: true });
  check('a PUSH dash at its head shoves it (TUNING.hero.push; measured from the head, hero.js)', p.g.kx > 0 && p.w.events.some((ev) => ev.type === 'shove' && ev.id === p.g.id));
  // …and only there: the core's shove reads the head circle, not the body
  // (a contract gap — no species hook lets it ask hitTest)
  const pt = world({ x: 0, z: 0, hero: [-5, -3], dashMode: 'push', invinc: false, anchored: false });
  straight(pt.g, 0, 0); pt.g.s.heading = Math.PI; pt.g.s.phase = Math.PI;
  step(pt.w, { ...IDLE, mz: 1, dash: true });
  for (let i = 0; i < 14; i++) step(pt.w, IDLE);
  check('…a PUSH dash across its tail, 5 u from its head, leaves it alone', !pt.w.events.some((ev) => ev.type === 'shove') && pt.g.kx === 0 && pt.g.kz === 0);
  // a shove carries the head ~0.45 u a step: one point a step, as 1.x, so the
  // body stretches while the knock lasts and draws back in after it
  const sh = world({ x: -10, z: 0, hero: [14, 0] }); straight(sh.g, -10, 0); sh.g.s.heading = 0; sh.g.s.phase = 0;
  sh.g.kx = T.hero.push.force * T.hero.push.heavy / S.radius;
  const link = (tr) => Math.max(...tr.slice(1).map((q, k) => Math.hypot(q.x - tr[k].x, q.z - tr[k].z)));
  let widest = 0, whole = true;
  for (let i = 0; i < 30; i++) { step(sh.w, IDLE); widest = Math.max(widest, link(sh.g.s.trail)); whole &&= sh.g.s.trail.length === 22; }
  for (let i = 0; i < 600; i++) step(sh.w, IDLE);
  // (a point is taken once the head is a step out, so a link is under one
  // step plus one step's move: here 0.30 + (24.75 + 2.6) · dt = 0.756)
  check('a shoved body keeps its 22 points, one a step as 1.x took them (enemy.js:1418), so its links open up to a step plus a step\'s throw …',
    whole && widest > 0.4 && widest < TR.step + (T.hero.push.force * T.hero.push.heavy / S.radius + S.speed) * dt, widest.toFixed(3));
  check('…and once the knock has died it is a 0.30-step body again', link(sh.g.s.trail) < 0.30 + S.speed * dt + 1e-9);
}

// ── the swarm's forces move it, and its steer carries them (role SCHOOL) ──
{
  const make = (anchored) => {
    const s = world({ x: 0, z: 0, hero: [-12, 0], anchored });
    s.g.s.phase = 0;
    api.heroBullet(s.w, -4, 0.2, 0);          // a lane straight at it
    return s;
  };
  const a = make(true), f = make(false);
  for (let i = 0; i < 6; i++) { step(a.w, IDLE); step(f.w, IDLE); }
  check('its SCHOOL role reads your gun: a bullet lane at it makes it sidestep (TUNING.movement.roles.SCHOOL dodge 0.9)',
    Math.abs(f.g.z - a.g.z) > 0.2 && f.g.s.trail.length === 22);
}

// ── many of them, in the open, for a long time ───────────────────────
{
  const sim = () => {
    const w = createWorld({ seed: 11, mode: 'arcade' });
    w.director = { step() {} };
    w.hero.invinc = 1e9;
    const gs = [api.spawn(w, 'ribbon', 12, 6), api.spawn(w, 'ribbon', -14, -5), api.spawn(w, 'ribbon', 3, -9)];
    for (let i = 0; i < 2400; i++) {
      const a = i * 0.01;
      step(w, { ...IDLE, mx: Math.cos(a), mz: Math.sin(a) * 0.8 });
    }
    return gs;
  };
  const r1 = sim(), r2 = sim();
  check('three of them for 40 s replay the same from the seed', r1.every((g, k) => g.x === r2[k].x && g.z === r2[k].z && sameTrail(g.s.trail, r2[k].s.trail)));
  check('…their bodies stay whole and on the floor', r1.every((g) => g.alive && g.s.trail.length === 22
    && g.s.trail.every((p) => Number.isFinite(p.x) && Math.abs(p.x) <= 19 && Math.abs(p.z) <= 11)));
}

// ── the look ─────────────────────────────────────────────────────────
{
  const TSL = THREE.TSL, scene = new THREE.Scene(), GEL_TIME = TSL.uniform(0);
  const made = [];
  const gelMaterial = (hex, fam, r) => {
    const m = new THREE.MeshPhysicalNodeMaterial();
    m.gel = { hit: TSL.uniform(0), hitDir: TSL.uniform(new THREE.Vector2()), tear: TSL.uniform(0), wobble: TSL.uniform(1) };
    made.push({ hex, fam, r, m });
    return m;
  };
  const ctx = { THREE, TSL, gelMaterial, GEL_TIME, geo: {}, T, scene, S, kind: 'ribbon' };
  const view = () => {
    const v = { kind: 'ribbon', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0, vx: 0, vz: 0, yaw: 0, hit: 0, dyingT: 0 };
    Object.assign(v, look.build({ ...ctx }));
    v.squash.add(v.body); v.root.add(v.squash); look.reset(v);
    return v;
  };
  const v = view();
  const geo = v.body.geometry, P = geo.attributes.position, Nn = geo.attributes.normal, idx = geo.index.array;
  const N = (22 - 1) * 3 + 1;
  check('build: its own body, own: true, one satin gel in its cyan, the blob family, at radius 0.4 (1.x makeSatinMat(cfg.color, \'blob\', cfg.radius))',
    v.own === true && made.length === 1 && made[0].hex === 0x66ddee && made[0].fam === 'blob' && made[0].r === 0.4 && v.mat === made[0].m);
  check('both sides drawn (enemy.js:982), transparent at full opacity so it can fade', v.mat.side === THREE.DoubleSide && v.mat.transparent === true && v.mat.opacity === 1);
  check('the strip: (22 − 1) × 3 + 1 = 64 points, two vertices each, 63 quads (enemy.js:1395-1401)', N === 64 && P.count === 128 && idx.length === 63 * 6);
  // 1.x's two triangles a rung, {a, a+1, a+2} and {a+1, a+2, a+3} (enemy.js:1400) …
  const tri = (k) => [...idx.slice(k * 3, k * 3 + 3)].sort((x, y) => x - y).join();
  let same = true;
  for (let i = 0; i < N - 1; i++) { const a = i * 2; same &&= tri(2 * i) === [a, a + 1, a + 2].join() && tri(2 * i + 1) === [a + 1, a + 2, a + 3].join(); }
  let up = true;
  for (let i = 0; i < Nn.count; i++) up &&= Nn.getX(i) === 0 && Nn.getY(i) === 1 && Nn.getZ(i) === 0;
  check('1.x\'s two triangles a rung, with v252\'s up normal at every vertex (enemy.js:1400, 1411-1413)', same && up);
  // … wound to FACE UP, so the up normal is the visible face's own: 1.x v252
  // kept a down-facing winding with an up normal, and a double-sided strip
  // seen from its back face then shades as lit from below — near-black
  const facesUp = (G) => {
    const Q = G.attributes.position, I = G.index.array, A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
    let ok = true, n = 0;
    for (let k = 0; k < I.length; k += 3) {
      A.fromBufferAttribute(Q, I[k]); B.fromBufferAttribute(Q, I[k + 1]); C.fromBufferAttribute(Q, I[k + 2]);
      const ny = B.sub(A).cross(C.sub(A)).y;
      if (Math.abs(ny) < 1e-9) continue;           // a rung of zero width (the very nose and tail)
      ok &&= ny > 0; n++;
    }
    return ok && n > 100;
  };
  v.mat.gel.hit.value = 1; v.mat.gel.tear.value = 1; v.mat.gel.hitDir.value.set(1, 0);
  check('the core\'s ripple and tear land on stand-ins: the strip\'s own stay at rest (BLOB_TYPES only, enemy.js:1612, 2988)',
    made[0].m.gel !== v.gel && v.gel.hit.value === 0 && v.gel.tear.value === 0 && v.mat.gel.wobble === v.gel.wobble);

  // a straight body, as spawned: every vertex where 1.x put it
  const tr0 = Array.from({ length: 22 }, (_, i) => ({ x: 0, z: -i * 0.3 }));
  const g = { r: 0.4, sq: 0.6, tell: 0, flash: 0, s: { trail: tr0 } };
  v.squash.scale.set(1.3, 0.6, 1.3);                    // what the core set; the look takes it back
  look.update(v, g, { time: 0 }, 0, 1);
  const expect = (i, wscale = 1) => {
    const t = i / (N - 1);
    return { z: -t * 21 * 0.3, half: 0.34 * wscale * Math.sin(Math.min(1, t * 6) * Math.PI / 2) * (1 - t * t), y: 0.30 + Math.sin(t * Math.PI) * 0.10 };
  };
  const strip = (wscale = 1, ox = 0, oz = 0) => {
    let ok = true;
    for (let i = 0; i < N; i++) {
      const e = expect(i, wscale);
      // the vertices are Float32: good to a few parts in 10⁷ of a few units
      ok &&= near(P.getX(2 * i), ox + e.half, 2e-6) && near(P.getX(2 * i + 1), ox - e.half, 2e-6)
        && near(P.getZ(2 * i), oz + e.z, 2e-6) && near(P.getZ(2 * i + 1), oz + e.z, 2e-6)
        && near(P.getY(2 * i), e.y, 2e-6) && near(P.getY(2 * i + 1), e.y, 2e-6);
    }
    return ok;
  };
  check('a straight body: the strip runs from the newest point back 6.3 u, width 0.34 · sin(min(1, 6t)·π/2) · (1 − t²), y 0.30 + 0.10 · sin(tπ) (enemy.js:1426-1436)', strip());
  const halves = Array.from({ length: N }, (_, i) => P.getX(2 * i));
  check('…from nothing at the head and to nothing at the tail, widest about a sixth of the way down',
    P.getX(0) === 0 && P.getX(1) === 0 && P.getX(2 * 63) === 0 && halves.indexOf(Math.max(...halves)) === 10 && near(expect(10.5).half, 0.34 * (1 - 1 / 36), 1e-12));
  check('every triangle of a straight body faces up (the winding, above)', facesUp(geo));
  check('no squash spring reaches it (enemy.js:2727)', v.squash.scale.x === 1 && v.squash.scale.y === 1 && v.squash.scale.z === 1);
  // the strip is in the view's frame: it stays put in the world as the head moves on
  v.root.position.set(1, 0, 2);
  g.s.trail = tr0.map((p) => ({ x: p.x + 1, z: p.z + 2 }));
  look.update(v, g, { time: 0 }, 0, 1);
  check('it hangs off the head: the same strip one unit over and two down is the same strip in the view\'s frame', strip());
  v.root.position.set(1.05, 0, 2);
  look.update(v, g, { time: 0 }, 0, 1);
  check('…and when the head has moved on between samples the strip stays where the body was', strip(1, -0.05, 0));
  v.root.position.set(0, 0, 0); g.s.trail = tr0;
  g.r = 0.48; look.update(v, g, { time: 0 }, 0, 1);
  check('an elite is drawn 1.2× as wide along the same path', strip(1.2));
  g.r = 0.4; look.update(v, g, { time: 0 }, 0, 0.5);
  check('one still swelling in grows into its width', strip(0.5));

  // a real curved body from the sim: each pair of vertices straddles the spline at its half-width
  const { w: sw, g: sg } = world({ x: -12, z: 4, hero: [12, -3] });
  run(sw, 400);
  const cv = view();
  cv.root.position.set(sg.x, 0, sg.z);
  look.update(cv, sg, sw, 0, 1);
  const curve = new THREE.CatmullRomCurve3(sg.s.trail.map((p) => new THREE.Vector3(p.x - sg.x, 0, p.z - sg.z)), false, 'catmullrom', 0.5);
  const pts = curve.getPoints(N - 1), CP = cv.body.geometry.attributes.position;
  let straddle = true;
  for (let i = 0; i < N; i++) {
    const mx = (CP.getX(2 * i) + CP.getX(2 * i + 1)) / 2, mz = (CP.getZ(2 * i) + CP.getZ(2 * i + 1)) / 2;
    const hw = Math.hypot(CP.getX(2 * i) - CP.getX(2 * i + 1), CP.getZ(2 * i) - CP.getZ(2 * i + 1)) / 2;
    straddle &&= near(mx, pts[i].x, 1e-6) && near(mz, pts[i].z, 1e-6) && near(hw, expect(i).half, 1e-6);
  }
  check('a curved body (400 steps of a chase): every rib straddles 1.x\'s Catmull-Rom (tension 0.5, getPoints(63)) at the width it has there', straddle);
  check('…and every triangle of it faces up, through every turn', facesUp(cv.body.geometry));

  // its death: the core swells the root and lights it; the strip fades (enemy.js:2983-2984)
  v.dyingT = T.blob.death; v.body.onBeforeRender();
  const o0 = v.mat.opacity;
  v.dyingT = T.blob.death / 2; v.body.onBeforeRender();
  const o1 = v.mat.opacity;
  v.dyingT = 0.0001; v.body.onBeforeRender();
  check('dying, it fades as (1 − t)² × 0.82 over the core\'s 0.28 s (1.x enemy.js:2983-2984)',
    T.blob.death === 0.28 && near(o0, 0.82, 1e-12) && near(o1, 0.25 * 0.82, 1e-12) && v.mat.opacity < 1e-6);
  v.dyingT = 0; look.reset(v);
  check('…and a reused view is whole again', v.mat.opacity === 1);
  look.update(v, g, { time: 0 }, 0, 1); v.body.onBeforeRender();
  check('…and alive, it never fades', v.mat.opacity === 1);
}

if (failed) { console.log(`✗ ribbon: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ ribbon: ${passed} checks`);
