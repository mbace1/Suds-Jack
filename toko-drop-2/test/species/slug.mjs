#!/usr/bin/env node
// slug.mjs — SLUG's own checks, in bare node: 1.x's numbers (enemy.js:626,
// 973-990, 1272-1288, 1294-1385, 1444-1459, 1605, 2728-2732, 2779, 2983-2984,
// 3012; main.js:2416, 4476-4480, 10166-10175, 10622-10633, 10649-10652,
// 10894; tuning.js:315, 334-338; audio.js:248), asserted against the sim
// stepping on its fixed 1/60 s, and its look against a real three.
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=162';
import { TUNING as T } from '../../js/tuning.js?v=162';
import behaviour from '../../js/sim/species/slug.js?v=162';
import look, { segRadius } from '../../js/render/looks/slug.js?v=162';
import * as THREE from '../../vendor/three/three.webgpu.js?v=r186';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

const S = T.species.slug, A = S.arc, C = S.chain, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };
const rOf = (n, i) => C.headR + (C.tailR - C.headR) * (n > 1 ? i / (n - 1) : 0);

// a world with nothing in it but what is asked; the slug anchored (no swarm
// forces, no crowd) unless asked, so what moves it is its own step. With
// `still` it does not walk (speedMult 0): its chain lies where it was laid.
function world({ seed = 1, mode = 'arcade', dashMode = 'pass', x = -3, z = 0, hero = [12, 8], o = {}, anchored = true, still = false } = {}) {
  const w = createWorld({ seed, mode, dashMode });
  w.director = { step() {} };
  const h = w.hero; h.x = h.px = hero[0]; h.z = h.pz = hero[1];
  const g = api.spawn(w, 'slug', x, z, { ...(still ? { speedMult: 0 } : {}), ...o });
  g.anchored = anchored;
  return { w, g };
}
// a hero bullet that sits still where it is put, so it lands on what lies there
function bulletAt(w, x, z) {
  api.heroBullet(w, x, z, 0);
  const b = w.bullets[w.bullets.length - 1];
  b.vx = b.vz = 0;
  return b;
}
const pts = (g) => g.s.chain.map((c) => ({ x: c.x, z: c.z }));
const slugs = (w) => w.gels.filter((g) => g.kind === 'slug' && g.alive);
const spacedRight = (ch) => ch.every((c, i) => i === 0 || near(Math.hypot(c.x - ch[i - 1].x, c.z - ch[i - 1].z), C.spacing, 1e-9));
const taperRight = (ch) => ch.every((c, i) => near(c.r, rOf(ch.length, i), 1e-12));

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 0.46, hp 11 (= segments), speed 2.2, v257\'s darker green 0x5fcc14 (1.x enemy.js:626)',
    S.radius === 0.46 && S.hp === 11 && S.speed === 2.2 && S.color === 0x5fcc14);
  check('CFG: no gun', S.bulletColor === null && S.fireInterval === null);
  check('its own body, SCHOOL, hurts to touch in classic (MELEE_TYPES), not a biter (1.x tuning.js:315, main.js:2416)',
    S.family === 'custom' && S.role === 'SCHOOL' && S.contact === true && S.revenge === null);
  check('the steer: turn rate 2.2 rad/s, weave 1.7 rad/s × 0.55 rad, the wall bend ×2 (1.x tuning.js:335-337, enemy.js:1286)',
    A.turnRate === 2.2 && A.weaveHz === 1.7 && A.weaveAmp === 0.55 && A.wallBend === 2 && A.phase0[0] === 0 && near(A.phase0[1], 2 * Math.PI));
  check('the chain: 11 segments 0.50 apart, head 0.46 to tail 0.18; v253 minSplit 4 (1.x tuning.js:338)',
    C.segments === 11 && C.spacing === 0.5 && C.headR === 0.46 && C.tailR === 0.18 && C.minSplit === 4);
  check('a hit kicks −0.4 (1.x enemy.js:1340); the spring is the non-blob 0.18 / 0.90 in 0.55..1.55 (enemy.js:2728-2731)',
    S.hitSquash === -0.4 && S.squash.spring === 0.18 && S.squash.damp === 0.9 && S.squash.min === 0.55 && S.squash.max === 1.55);
  check('the dash eats within r + the hero\'s 0.5 + 0.35 (1.x main.js:10171)', S.cut.pad === 0.35 && T.hero.radius === 0.5);
  const d = S.deathSound;
  check('it dies with the cube\'s voice: square 380 → 55 Hz over 0.18 s at 0.22, noise 0.09 for 0.13 s (1.x main.js:4476-4480, audio.js:248)',
    d.wave === 'square' && d.f0 === 380 && d.f1 === 55 && d.dur === 0.18 && d.vol === 0.22 && d.noiseVol === 0.09 && d.noiseDur === 0.13);
  const K = S.look;
  check('the look: blob satin, SphereGeometry(r, 12, 9) at 0.82 tall; the eye headR × 0.3 (8, 6), white, r × 0.7 out and × 1.05 up (1.x enemy.js:814, 1304-1305, 1315-1316, 1333)',
    K.family === 'blob' && K.sphere[0] === 12 && K.sphere[1] === 9 && K.squat === 0.82 && K.eye.r === 0.3 && K.eye.sphere[0] === 8 && K.eye.sphere[1] === 6
    && K.eye.color === 0xffffff && K.eye.forward === 0.7 && K.eye.up === 1.05);
  check('the head squashes as (sx, sq, sx), sx = 1/√max(sq, 0.1); it fades (1 − t)² × 0.82 dying (1.x enemy.js:2732, 2779, 2983-2984)',
    K.sqFloor === 0.1 && K.deathOpacity === 0.82);
  const src = readFileSync(new URL('../../js/sim/species/slug.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  check('it has no gun and no death of its own', !behaviour.onKill && typeof behaviour.hitTest === 'function' && typeof behaviour.touches === 'function' && typeof behaviour.onHit === 'function');
}

// ── a fresh slug (1.x enemy.js:980-986, 1294-1321) ───────────────────
{
  const { g } = world({ x: 6, z: 2 });
  const h0 = Math.atan2(-2, -6), ch = g.s.chain;
  check('it heads for the arena\'s centre from where it spawned: atan2(−z, −x)', near(g.s.heading, h0, 1e-15));
  check('eleven segments, the head where it spawned', ch.length === 11 && ch[0].x === 6 && ch[0].z === 2 && g.x === 6 && g.z === 2);
  check('the rest lie straight back along the heading, 0.5 apart (outside the arena if that is where they fall)',
    ch.every((c, k) => near(c.x, 6 - Math.cos(h0) * k * 0.5, 1e-12) && near(c.z, 2 - Math.sin(h0) * k * 0.5, 1e-12)), JSON.stringify(ch[10]));
  check('the radii taper linearly from 0.46 at the head to 0.18 at the tail', taperRight(ch) && ch[0].r === 0.46 && near(ch[10].r, 0.18, 1e-15));
  check('hp is its length, 11; the whole animal is 11', g.hp === 11 && g.maxHp === 11);
  const phases = [];
  for (let seed = 1; seed <= 200; seed++) phases.push(world({ seed }).g.s.phase);
  check('its weave starts anywhere in [0, 2π), from the run\'s seed', phases.every((p) => p >= 0 && p < 2 * Math.PI) && Math.min(...phases) < 0.1 && Math.max(...phases) > 6.1);
  check('the same seed lays the same slug', world({ seed: 7 }).g.s.phase === world({ seed: 7 }).g.s.phase);
  const e = world({ o: { variant: 'elite' } }).g;
  check('an elite: its head\'s circle ×1.2 (0.552), but the chain and the hp are the chain\'s: 0.46 … 0.18, 11 (1.x rebuilt hp = n over the ×2)',
    near(e.r, 0.552, 1e-12) && e.hp === 11 && e.s.chain[0].r === 0.46 && taperRight(e.s.chain));
}

// ── the steer: 1.x _arcSteer to the bit (enemy.js:1272-1288) ──────────
// a reference, written straight from 1.x, against the sim over 600 steps
{
  for (const [hero, sm, name] of [[[8, 5], 1, 'a slug at wave pace'], [[-18.5, -10.5], 1.5, 'a faster one chasing you into a corner'], [[0, 0], 1.04, 'one circling you']]) {
    const { w, g } = world({ x: -14, z: 8, hero, o: { speedMult: sm } });
    w.hero.mercy = 1e9;                                        // it may touch you; nothing changes
    const ref = { x: g.x, z: g.z, heading: g.s.heading, phase: g.s.phase, ch: pts(g) };
    const spd = S.speed * sm, bx = w.hx - S.radius, bz = w.hz - S.radius;
    let same = true, turnOk = true, paceOk = true, spaced = true, bends = 0, worst = 0;
    for (let i = 0; i < 600; i++) {
      // 1.x enemy.js:1273-1288, then _placeChain 1323-1331
      const want = Math.atan2(w.hero.z - ref.z, w.hero.x - ref.x);
      ref.phase += dt * 1.7;
      let d = want + Math.sin(ref.phase) * 0.55 - ref.heading;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      const before = ref.heading;
      ref.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, d));
      const nx = ref.x + Math.cos(ref.heading) * spd * dt, nz = ref.z + Math.sin(ref.heading) * spd * dt;
      const cx = Math.max(-bx, Math.min(bx, nx)), cz = Math.max(-bz, Math.min(bz, nz));
      const bent = cx !== nx || cz !== nz;
      if (bent) { ref.heading += 2.2 * dt * 2; bends++; }
      ref.x = cx; ref.z = cz;
      ref.ch[0] = { x: cx, z: cz };
      for (let k = 1; k < ref.ch.length; k++) {
        const a = ref.ch[k - 1], b = ref.ch[k], dx = b.x - a.x, dz = b.z - a.z, dd = Math.hypot(dx, dz) || 1;
        ref.ch[k] = { x: a.x + (dx / dd) * 0.5, z: a.z + (dz / dd) * 0.5 };
      }
      const px = g.x, pz = g.z;
      step(w, IDLE);
      for (let k = 0; k < 11; k++) worst = Math.max(worst, Math.hypot(g.s.chain[k].x - ref.ch[k].x, g.s.chain[k].z - ref.ch[k].z));
      same &&= near(g.x, ref.x, 1e-9) && near(g.z, ref.z, 1e-9) && near(g.s.heading, ref.heading, 1e-9) && g.s.bent === bent;
      turnOk &&= bent || Math.abs(ref.heading - before) <= 2.2 * dt + 1e-12;
      paceOk &&= bent || near(Math.hypot(g.x - px, g.z - pz), spd * dt, 1e-9);
      spaced &&= spacedRight(g.s.chain);
    }
    check(`${name}: the head, its heading and the wall bend are 1.x's, step for step over 10 s`, same, `${g.x},${g.z} vs ${ref.x},${ref.z}`);
    check(`${name}: every segment is where 1.x's _placeChain puts it`, worst < 1e-9, `${worst}`);
    check(`${name}: the heading turns no faster than 2.2 rad/s off the walls`, turnOk);
    check(`${name}: the head walks 2.2 × speedMult u/s along it`, paceOk);
    check(`${name}: every segment exactly 0.5 behind the one ahead, every step`, spaced);
    if (name.includes('corner')) check(`${name}: it met the wall and bent off it`, bends > 0, `${bends}`);
  }
  // the bend itself: a head on the right wall, heading into it
  const { w, g } = world({ x: 0, z: 0, hero: [-10, 0] });
  g.x = w.hx - g.r - 0.01; g.s.heading = 0; g.s.phase = 0;
  const before = g.s.heading, want = Math.atan2(0 - 0, -10 - g.x);
  step(w, IDLE);
  let d = want + Math.sin(dt * 1.7) * 0.55 - before;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  check('a step the wall clamps bends the heading a further turnRate × dt × 2 (1.x enemy.js:1286)',
    g.s.bent && near(g.s.heading, before + Math.max(-2.2 * dt, Math.min(2.2 * dt, d)) + 2 * 2.2 * dt, 1e-12) && near(g.x, w.hx - g.r, 1e-12), `${g.s.heading}`);
  // the wave's pace, SWIFT and a SIREN's surge reach it through api.speed
  for (const [o, mult, label] of [[{ speedMult: 1.244 }, 1.244, 'wave 3 (×1.244)'], [{ affix: 'swift' }, T.variants.swiftSpeed, 'SWIFT (×1.35)']]) {
    const t = world({ x: -5, z: 0, hero: [10, 0], o });
    const x0 = t.g.x;
    step(t.w, IDLE);
    check(`${label} walks it 2.2 × ${mult} u/s`, near(Math.hypot(t.g.x - x0, t.g.z), S.speed * mult * dt, 1e-9));
  }
  const sv = world({ x: -5, z: 0, hero: [10, 0] });
  sv.g.surgeT = 5; sv.g.surgeMult = 1.6;
  step(sv.w, IDLE);
  check('a surge (×1.6) walks it faster', near(Math.hypot(sv.g.x + 5, sv.g.z), S.speed * 1.6 * dt, 1e-9));
  // the swarm forces move the head first; the steer starts from there (it writes the head itself)
  const fl = world({ x: -5, z: 0, hero: [10, 0], anchored: false });
  api.spawn(fl.w, 'globbo', -5, 2.5, { speedMult: 0 }).anchored = true;
  let moved = false;
  for (let i = 0; i < 30; i++) { step(fl.w, IDLE); moved ||= Math.abs(fl.g.z) > 1e-6; }
  check('it schools (SCHOOL): the flock moves its head off its own line, and it steers on from where that left it', moved && spacedRight(fl.g.s.chain));
}

// ── THE RULE: eat it from an end, or it splits (1.x enemy.js:1339-1364) ──
{
  // the head shot off: one shorter, the next segment is the head
  {
    const { w, g } = world({ still: true });
    const before = pts(g);
    bulletAt(w, before[0].x, before[0].z);
    step(w, IDLE);
    const ch = g.s.chain;
    check('a shot on the head: ten segments, hp 10, the old second segment is the head',
      ch.length === 10 && g.hp === 10 && near(g.x, before[1].x, 1e-12) && near(g.z, before[1].z, 1e-12) && g.s.event === 'shorten' && slugs(w).length === 1);
    check('…the radii re-taper to the new length and every gap is 0.5', taperRight(ch) && spacedRight(ch) && near(ch[9].r, 0.18, 1e-15));
    check('…the core lands its flash and its hit', g.flash > 0 && w.events.some((e) => e.type === 'hit' && e.id === g.id));
  }
  // the tail shot off
  {
    const { w, g } = world({ still: true });
    const before = pts(g);
    bulletAt(w, before[10].x, before[10].z);
    step(w, IDLE);
    check('a shot on the tail: ten segments, the head where it was', g.s.chain.length === 10 && g.hp === 10 && near(g.x, before[0].x, 1e-12) && slugs(w).length === 1
      && g.s.chain.every((c, i) => near(c.x, before[i].x, 1e-12)));
  }
  // overlapping segments: the first touched, head first, takes it
  {
    const { w, g } = world({ still: true });
    const before = pts(g);
    bulletAt(w, before[1].x, before[1].z);       // the head's 0.46 + 0.15 reaches 0.5 back
    step(w, IDLE);
    check('a shot centred on the second segment touches the head first (head first, 0.46 + 0.15 > 0.5): it shortens, never splits',
      g.s.chain.length === 10 && slugs(w).length === 1 && near(g.x, before[1].x, 1e-12));
  }
  // the middle: two animals, the back half reversed
  {
    const { w, g } = world({ still: true });
    const before = pts(g);
    bulletAt(w, before[5].x, before[5].z);       // segment 4 reaches 0.348 + 0.15 < 0.5
    step(w, IDLE);
    const all = slugs(w), c = all.find((x) => x !== g);
    check('a shot in the middle (segment 5 of 11) splits it: [5, 5c], as 1.x measured (v253)', all.length === 2 && g.s.chain.length === 5 && c && c.s.chain.length === 5 && g.s.event === 'split' && g.s.splits === 1);
    check('…the front keeps the head and segments 0-4', g.s.chain.every((p, i) => near(p.x, before[i].x, 1e-12) && near(p.z, before[i].z, 1e-12)) && g.hp === 5);
    check('…the back is 10, 9, 8, 7, 6: its old tail is its head', c.s.chain.every((p, i) => near(p.x, before[10 - i].x, 1e-12) && near(p.z, before[10 - i].z, 1e-12)) && near(c.x, before[10].x, 1e-12) && c.hp === 5);
    check('…both re-taper to five: 0.46 … 0.18', taperRight(g.s.chain) && taperRight(c.s.chain));
    check('…the half heads for the arena\'s centre from its new head, as 1.x\'s constructor did', near(c.s.heading, Math.atan2(-c.z, -c.x), 1e-15));
    check('…an ordinary body that never splits, born active (a child), at the parent\'s pace', c.s.noSplit && !g.s.noSplit && c.child && c.state === 'active' && c.variant === 'normal' && c.affix === null && c.speedMult === g.speedMult && c.intervalMult === g.intervalMult);
    check('…only the head of the two is the parent\'s: one kill has not happened', w.kills === 0);
    // the half's middle: it never splits again
    const cb = pts(c);
    bulletAt(w, cb[2].x, cb[2].z);
    step(w, IDLE);
    check('then the half hit in the middle shortens, it never splits: [5, 4c] (1.x v253)', slugs(w).length === 2 && c.s.chain.length === 4 && c.hp === 4 && c.s.event === 'shorten');
  }
  // minSplit: a chain shorter than four only shortens
  {
    const { w, g } = world({ x: 0, z: 0, still: true, o: { chain: [{ x: 0, z: 0 }, { x: -0.5, z: 0 }, { x: -1, z: 0 }] } });
    step(w, IDLE);                                // born: not on the floor the step it is laid
    bulletAt(w, -0.5, 0.4);                       // segment 1 (0.32 + 0.15), clear of the head (0.64 > 0.61)
    step(w, IDLE);
    check('a 3-chain hit in the middle → [2], not [1, 1] (1.x v253, minSplit 4)', slugs(w).length === 1 && g.s.chain.length === 2 && g.hp === 2
      && near(g.s.chain[1].x, -0.5, 1e-12) && g.s.chain[1].r === 0.18);
  }
  {
    const { w, g } = world({ x: 0, z: 0, still: true, o: { chain: [0, 1, 2, 3].map((k) => ({ x: -0.5 * k, z: 0 })) } });
    step(w, IDLE);
    bulletAt(w, -0.5, 0.42);                      // segment 1 of four (0.367 + 0.15), clear of the head
    step(w, IDLE);
    const c = slugs(w).find((x) => x !== g);
    check('a 4-chain hit at its second segment splits: [1, 2c], the half headed by the old tail', slugs(w).length === 2 && g.s.chain.length === 1 && c?.s.chain.length === 2 && near(c.x, -1.5, 1e-12));
    bulletAt(w, g.x, g.z);
    step(w, IDLE);
    check('a chain of one dies to the next hit: a kill, 100 × the streak', !g.alive && w.kills === 1 && w.events.some((e) => e.type === 'kill' && e.id === g.id && e.src === 'hero') && w.score === 100);
  }
  // the second animal is not on the floor the step it is born (1.x built it next frame)
  {
    const { w, g } = world({ still: true });
    const before = pts(g);
    bulletAt(w, before[5].x, before[5].z);
    const b2 = bulletAt(w, before[8].x, before[8].z);
    step(w, IDLE);
    const c = slugs(w).find((x) => x !== g);
    check('a second bullet the same step passes where the back half will be: it is not there yet', c && !b2.dead && c.s.chain.length === 5);
    step(w, IDLE);
    check('…and lands on it the next step', b2.dead && c.s.chain.length === 4);
  }
  // two middle hits on one slug in one step: 1.x kept ONE `_splitPts` a body
  // (enemy.js:1362, main.js:10626-10627), so the second split overwrote the
  // first and that first back half never came into being
  {
    const { w, g } = world({ still: true });
    const before = pts(g);
    // a reference straight from 1.x: hitTest head first (enemy.js:1446-1449),
    // _slugHit (1346-1363) with its one _splitPts, for the bullets in the
    // order the core tests them
    let ch = before.map((p, i) => ({ ...p, k: i })), splitPts = null;
    const tap = (bx, bz) => {
      const n = ch.length, r = (i) => 0.46 + (0.18 - 0.46) * (n > 1 ? i / (n - 1) : 0);
      const i = ch.findIndex((c, j) => Math.hypot(c.x - bx, c.z - bz) < r(j) + T.bullets.heroRadius);
      if (i < 0) return;
      if (i === 0 || i === n - 1 || n < 4) { ch.splice(i, 1); return; }
      splitPts = ch.slice(i + 1).reverse(); ch = ch.slice(0, i);
    };
    tap(before[7].x, before[7].z); tap(before[3].x, before[3].z);
    bulletAt(w, before[7].x, before[7].z);
    bulletAt(w, before[3].x, before[3].z);
    step(w, IDLE);
    const all = slugs(w), c = all.find((x) => x !== g);
    const keys = (body) => body.s.chain.map((p) => before.findIndex((q) => near(q.x, p.x, 1e-9) && near(q.z, p.z, 1e-9))).join();
    check('two splits of one slug in one step: one half, the second — the first back half is gone (1.x _splitPts)',
      all.length === 2 && c && keys(g) === ch.map((p) => p.k).join() && keys(c) === splitPts.map((p) => p.k).join() && g.s.splits === 2,
      `${all.length} [${keys(g)}] [${c && keys(c)}] vs [${ch.map((p) => p.k)}] [${splitPts?.map((p) => p.k)}]`);
    check('…that half is laid from its own head, heading for the centre, born active this step', c && near(c.s.heading, Math.atan2(-c.z, -c.x), 1e-15)
      && c.hp === c.s.chain.length && taperRight(c.s.chain) && spacedRight(c.s.chain) && c.s.born === w.tick && c.state === 'active');
  }
  // 1.x built the half the NEXT frame, after the dash loop and every body's
  // update, before the bullet test (main.js:10622-10633): the step after it
  // is born it holds where it was laid and no dash can cut it; it walks, and
  // can be cut, from the step after that
  {
    const { w, g } = world({ dashMode: 'cut', x: -3, z: 0, hero: [-6, 0] });
    w.hero.mercy = 1e9;                           // it lies under the hero: touching changes nothing
    g.speedMult = 0;                              // the parent lies still; the half walks at the wave's pace
    const before = pts(g);
    bulletAt(w, before[5].x, before[5].z);
    step(w, IDLE);
    const c = slugs(w).find((x) => x !== g), laid = pts(c), phase = c.s.phase;
    step(w, { ...IDLE, mx: -1, dash: true });   // the hero dashes into it: x −6 → −6.43, over its tail
    const held = c.s.chain.every((p, i) => p.x === laid[i].x && p.z === laid[i].z) && c.x === laid[0].x && c.z === laid[0].z && c.s.phase === phase;
    check('the step after it is born the half holds where it was laid (forces undone, no steer) and the dash over it cuts nothing',
      held && c.alive && c.s.chain.length === 5 && c.dashedBy === -1 && w.events.every((e) => e.type !== 'dashCut'), `${held} ${c.s.chain.length}`);
    step(w, { ...IDLE, mx: -1 });                 // −6.87: every segment of the half is within r + 0.85
    check('…the step after, the same dash eats it whole; the parent\'s front, out of reach, is untouched',
      !c.alive && w.kills === 1 && g.alive && g.s.chain.length === 5);
    const walk = world({ x: -3, z: 0, hero: [12, 8] });
    walk.w.hero.mercy = 1e9;
    walk.g.speedMult = 0;
    const wb = pts(walk.g);
    bulletAt(walk.w, wb[5].x, wb[5].z);
    step(walk.w, IDLE);
    const h2 = slugs(walk.w).find((x) => x !== walk.g), x0 = h2.x, z0 = h2.z, p0 = h2.s.phase;
    h2.speedMult = 1; h2.anchored = true;         // walking at the base pace, with no forces on it, so the walk is its own
    step(walk.w, IDLE);
    const x1 = h2.x, z1 = h2.z, p1 = h2.s.phase;
    step(walk.w, IDLE);
    check('…and it walks from its second step, 2.2 u/s along its heading, its weave clock starting then',
      x1 === x0 && z1 === z0 && p1 === p0 && near(Math.hypot(h2.x - x1, h2.z - z1), S.speed * dt, 1e-9) && near(h2.s.phase, p0 + dt * 1.7, 1e-12));
  }
  // a split from a SWIFT parent keeps its pace (1.x baked swift into _speedMult)
  {
    const { w, g } = world({ still: true, o: { affix: 'swift' } });
    g.speedMult = 1.1;
    const before = pts(g);
    bulletAt(w, before[5].x, before[5].z);
    step(w, IDLE);
    const c = slugs(w).find((x) => x !== g);
    check('a SWIFT slug\'s half: speedMult × 1.35, no affix of its own', c && near(c.speedMult, 1.1 * T.variants.swiftSpeed, 1e-12) && c.affix === null);
  }
  // a WARDEN's aura blocks before the rule runs
  {
    const { w, g } = world({ x: -3, z: 0, still: true });
    const wd = api.spawn(w, 'warden', -3, 2, { speedMult: 0 }); wd.anchored = true;
    const before = pts(g);
    bulletAt(w, before[5].x, before[5].z);
    bulletAt(w, before[0].x, before[0].z);
    step(w, IDLE);
    const blocks = w.events.filter((e) => e.type === 'block' && e.id === g.id).length;
    check('in a WARDEN\'s aura a shot is blocked and it loses nothing: no split, no shorter', g.shield && blocks === 2 && g.s.chain.length === 11 && g.hp === 11 && slugs(w).length === 1, `${blocks} ${g.s.chain.length}`);
  }
  // a hit's squash: −0.4 and 1.x's non-blob spring
  {
    const { w, g } = world({ still: true });
    for (let i = 0; i < 5; i++) step(w, IDLE);
    const sq0 = g.sq, v0 = g.sqV;
    const before = pts(g);
    bulletAt(w, before[10].x, before[10].z);
    step(w, IDLE);
    const kicked = g.sqV, sqK = g.sq;
    check('a hit at rest leaves the spring kicked −0.4, not a gel\'s −0.75 (1.x enemy.js:1340)', near(sq0, 1, 1e-12) && v0 === 0 && near(kicked, -0.4, 1e-12), `${kicked}`);
    step(w, IDLE);
    const want = (kicked - (sqK - 1) * 0.18) * 0.9;
    check('…and the next step runs 1.x\'s 0.18 / 0.90 on it: sq 0.64 from rest', near(g.sqV, want, 1e-12) && near(g.sq, 1 + want, 1e-12) && near(g.sq, 0.64, 1e-12), `${g.sqV} ${g.sq}`);
  }
}

// ── contact: along its whole length (1.x enemy.js:1459, main.js:10894) ──
{
  const { w, g } = world({ x: -3, z: 0, still: true, hero: [0, 6] });
  const tail = g.s.chain[10];
  w.hero.x = w.hero.px = tail.x; w.hero.z = w.hero.pz = tail.z + tail.r + T.gel.contactRadius - 0.01;
  step(w, IDLE);
  check('touching the tail hurts (its 0.18 + the core\'s 0.5), 5 u from the head', w.hero.lives === T.hero.lives - 1 && w.killedBy === 'slug');
  const o = world({ x: -3, z: 0, still: true, hero: [0, 6] });
  const t2 = o.g.s.chain[10];
  o.w.hero.x = o.w.hero.px = t2.x; o.w.hero.z = o.w.hero.pz = t2.z + t2.r + T.gel.contactRadius + 0.01;
  step(o.w, IDLE);
  check('…a hair further off does not', o.w.hero.lives === T.hero.lives);
}

// ── the dashes (hero.js runs before the bodies; the slug turns hp into chain) ──
// a hero at (x, z0) dashing straight up the screen (+z) across a slug lying
// along x from (−3, 0) to (−8, 0)
const dashAcross = (dashMode, x, z0 = -3, level = 0, o = {}) => {
  const t = world({ dashMode, x: -3, z: 0, still: true, hero: [x, z0], o });
  t.w.hero.dashLevel = level;
  const at = [];
  for (let i = 0; i < 30; i++) {
    const hp = t.g.hp;
    step(t.w, { ...IDLE, mz: 1, dash: i === 0 });
    if (t.g.alive && t.g.hp !== hp && !at.length) at.push({ x: t.w.hero.x, z: t.w.hero.z });
    if (!t.g.alive && !at.length) at.push({ x: t.w.hero.x, z: t.w.hero.z });
  }
  return { ...t, at: at[0] };
};
{
  const pass = dashAcross('pass', -5.5);
  check('1.x\'s dash (PASS) goes through it and takes nothing', pass.g.alive && pass.g.s.chain.length === 11 && pass.g.hp === 11);

  // the CUT dash eats what it crosses (1.x _slugCut, enemy.js:1372-1385)
  const before = pts(world({ x: -3, z: 0, still: true }).g);
  const t = world({ dashMode: 'cut', x: -3, z: 0, still: true, hero: [-5.5, -3] });
  let bite = null, cuts = 0;
  for (let i = 0; i < 30; i++) {
    step(t.w, { ...IDLE, mz: 1, dash: i === 0 });
    cuts += t.w.events.filter((e) => e.type === 'dashCut' && e.id === t.g.id).length;
    if (!bite && t.g.s.event === 'cut') bite = { x: t.w.hero.x, z: t.w.hero.z, n: t.g.s.chain.length, hp: t.g.hp, sq: t.g.sq, sqV: t.g.sqV };
  }
  const R = 0.5 + 0.35;
  const kept = before.map((p, i) => ({ ...p, r: rOf(11, i), i })).filter((p) => bite && !(Math.hypot(p.x - bite.x, p.z - bite.z) < p.r + R));
  check('the CUT dash eats every segment within its r + 0.85 of the hero, at the step it cuts: here segments 3-7', bite && kept.map((p) => p.i).join() === '0,1,2,8,9,10', bite && `${kept.map((p) => p.i).join()} at ${bite.x},${bite.z}`);
  check('…the animal closes the gap, shorter — never a split: one slug of six, hp 6 (the hp is the chain the step it bites, not the dash\'s 11 − 2)',
    slugs(t.w).length === 1 && t.g.s.chain.length === 6 && t.g.hp === 6 && bite.hp === 6 && spacedRight(t.g.s.chain) && taperRight(t.g.s.chain));
  check('…one bite a dash', cuts === 1 && t.g.s.chain.length === 6);
  check('…and the head stays the head', near(t.g.x, before[0].x, 1e-12) && near(t.g.z, before[0].z, 1e-12));
  // 1.x _slugCut kicked −0.4 in the dash loop, BEFORE the frame's update ran
  // its spring (enemy.js:1379, main.js:10153 before 10366): sq 0.64 that frame
  check('…its squash: 1.x\'s −0.4 and the 0.18 / 0.90 spring the same step, sq 0.64 from rest (not a gel\'s −0.75)',
    bite && near(bite.sqV, -0.36, 1e-12) && near(bite.sq, 0.64, 1e-12), bite && `${bite.sqV} ${bite.sq}`);
  // the dash is 11 steps and hero.js has counted the last one off (h.dash < 0)
  // by the time it cuts on it: a slug first crossed THEN is still eaten,
  // never shot (as hp, the cut's 2 would have split it under the rule)
  {
    const u = world({ dashMode: 'cut', x: -3, z: 0, still: true, hero: [-5.5, -5.4] });
    u.w.hero.mercy = 1e9;
    let at = null;
    for (let i = 0; i < 30; i++) {
      step(u.w, { ...IDLE, mz: 1, dash: i === 0 });
      if (!at && u.w.events.some((e) => e.type === 'dashCut' && e.id === u.g.id)) at = { i, dash: u.w.hero.dash, x: u.w.hero.x, z: u.w.hero.z };
    }
    const keep = before.map((p, i) => ({ ...p, r: rOf(11, i), i })).filter((p) => at && !(Math.hypot(p.x - at.x, p.z - at.z) < p.r + R)).map((p) => p.i).join();
    check('a CUT dash that first crosses it on its LAST step (h.dash already below 0) still eats, never splits',
      at && at.i === 10 && at.dash < 0 && slugs(u.w).length === 1 && u.g.s.event === 'cut' && u.g.s.splits === 0
      && u.g.s.chain.length === keep.split(',').length && u.g.hp === u.g.s.chain.length && near(u.g.x, before[0].x, 1e-12),
      at && `${at.i} ${at.dash} ${slugs(u.w).map((s) => s.s.chain.length)} keep ${keep}`);
  }
  // eating it whole kills it, as the dash's
  const short = world({ dashMode: 'cut', x: -3, z: 0, still: true, hero: [-3.5, -3], o: { chain: [0, 1, 2].map((k) => ({ x: -3 - 0.5 * k, z: 0 })) } });
  let shortCut = null;
  for (let i = 0; i < 30; i++) {
    step(short.w, { ...IDLE, mz: 1, dash: i === 0 });
    if (!shortCut && !short.g.alive) shortCut = short.w.events.find((e) => e.type === 'kill' && e.id === short.g.id);
  }
  check('a slug the CUT dash eats whole dies to the dash, then and there (1.x main.js:10171-10172)', !short.g.alive && short.w.kills === 1 && shortCut?.src === 'dash');
  // a chain of two the cut only half crosses: the bite decides, not the
  // dash's 2 hp — 1.x _slugCut ate the head and left the tail (enemy.js:1375-1384)
  const two = world({ dashMode: 'cut', x: -3, z: 0, still: true, hero: [-2.3, -3], o: { chain: [{ x: -3, z: 0 }, { x: -3.5, z: 0 }] } });
  two.w.hero.mercy = 1e9;
  for (let i = 0; i < 2; i++) step(two.w, IDLE);                // laid, and its first step held
  let twoCut = -1;
  for (let i = 0; i < 30; i++) {
    step(two.w, { ...IDLE, mz: 1, dash: i === 0 });
    if (twoCut < 0 && two.w.events.some((e) => e.type === 'dashCut' && e.id === two.g.id)) twoCut = i;
  }
  check('a chain of two whose head the CUT dash crosses (tail 1.2 off its line, beyond 0.18 + 0.85) lives on as one: the tail, now its head, hp 1',
    twoCut >= 0 && two.g.alive && two.w.kills === 0 && two.g.s.chain.length === 1 && two.g.hp === 1 && near(two.g.x, -3.5, 1e-12) && two.g.s.chain[0].r === 0.46,
    `${twoCut} ${two.g.alive} ${two.g.s.chain.length} ${two.g.hp}`);
  // dash level 1 kills what it passes through, a slug whole
  const lv1 = dashAcross('pass', -5.5, -3, 1);
  check('a level-1 dash kills the whole slug, as it kills any body that is not a boss', !lv1.g.alive && lv1.w.kills === 1);
  for (const mode of ['pass', 'cut']) {
    const k = world({ dashMode: mode, x: -3, z: 0, still: true, hero: [-3, -2] });
    k.w.hero.dashLevel = 1;
    let kill = null;
    for (let i = 0; i < 30 && !kill; i++) {
      step(k.w, { ...IDLE, mz: 1, dash: i === 0 });
      kill = k.w.events.find((e) => e.type === 'kill' && e.id === k.g.id) ?? null;
    }
    check(`…a level-1 ${mode.toUpperCase()} dash across its head eats nothing first: it dies whole, where its head lay`,
      kill && kill.src === 'dash' && kill.x === -3 && kill.z === 0 && k.g.s.chain.length === 11 && k.g.s.event === null);
  }
  // a level-1 PUSH hurts: 1.x hit() at the hero, under the rule
  const push = world({ dashMode: 'push', x: -3, z: 0, still: true, hero: [-1, 0], anchored: false });   // an anchored body is not shoved
  push.w.hero.dashLevel = 1;
  for (let i = 0; i < 30; i++) step(push.w, { ...IDLE, mx: -1, dash: i === 0 });
  const total = slugs(push.w).reduce((n, s) => n + s.s.chain.length, 0);
  check('a level-1 shove costs it one segment, the one nearest the hero (1.x hit() with no segment recorded)', total === 10 && push.g.hp === push.g.s.chain.length, `${total}`);
}

// ── the same run twice is the same run ──────────────────────────────
{
  const run = (seed) => {
    const { w } = world({ seed, x: -12, z: 6, hero: [6, -2], anchored: false });
    api.spawn(w, 'slug', 10, -6);
    for (let i = 0; i < 900; i++) {
      const h = w.hero;
      step(w, { mx: Math.sin(i * 0.01), mz: 0, ax: -1, az: 0.2 * Math.sin(i * 0.03), aim: true, fire: true, dash: i % 120 === 0 });
      h.mercy = Math.max(h.mercy, 0.5);
    }
    return JSON.stringify(slugs(w).map((g) => [g.x, g.z, g.s.heading, g.s.chain.length]).concat([w.kills, w.score]));
  };
  const a = run(3), b = run(3);
  check('a seeded run under fire replays exactly', a === b && a.length > 10, a.slice(0, 80));
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
  const ctx = { THREE, TSL, gelMaterial, GEL_TIME, geo: {}, T, scene, S, kind: 'slug' };
  const view = () => {
    const v = { kind: 'slug', S, L: look, root: new THREE.Group(), squash: new THREE.Group(), phase: 0, vx: 0, vz: 0, yaw: 0, hit: 0, dyingT: 0 };
    Object.assign(v, look.build({ ...ctx }));
    v.squash.add(v.body); v.root.add(v.squash); look.reset(v);
    return v;
  };
  const v = view();
  check('build: its own body, own: true, ONE gel material for the chain, green, the blob family at uRadius 0.46 (1.x makeSatinMat(color, \'blob\', cfg.radius))',
    v.own === true && made.length === 1 && made[0].hex === 0x5fcc14 && made[0].fam === 'blob' && made[0].r === 0.46 && v.mat === made[0].m && v.segs.every((m) => m.material === v.mat));
  check('the core\'s ripple and tear reach nothing: 1.x gave neither to a slug (BLOB_TYPES only)', v.mat.gel === undefined && v.gel && v.gel.hit.value === 0);
  check('eleven segments and an eye, the eye unlit white', v.segs.length === 11 && v.eye.material.color.getHex() === 0xffffff && v.eye.material.isMeshBasicNodeMaterial);
  const bb = (m) => { m.geometry.computeBoundingBox(); return m.geometry.boundingBox; };
  check('each segment is a sphere of its r, 0.82 tall: 0.46 … 0.18 over eleven',
    v.segs.every((m, i) => near(m.geometry.parameters.radius, segRadius(C, 11, i), 1e-12) && m.geometry.parameters.widthSegments === 12
      && m.geometry.parameters.heightSegments === 9 && near(bb(m).max.y, segRadius(C, 11, i) * 0.82, 1e-6)), `${bb(v.segs[10]).max.y}`);
  check('every view shares the geometries', view().segs[3].geometry === v.segs[3].geometry);

  const { w, g } = world({ x: -3, z: 0, still: true });
  look.update(v, g, w, 0, 1);
  check('the squash group is not 1.x\'s: it is held at 1 (the spring squashes the head only)', v.squash.scale.x === 1 && v.squash.scale.y === 1);
  check('the head sits on the floor at 0.46 × 0.82 at the root; every other segment where the sim has it, on the floor at r × 0.82',
    v.segs[0].position.x === 0 && near(v.segs[0].position.y, 0.46 * 0.82, 1e-12)
    && v.segs.slice(1).every((m, k) => near(m.position.x, g.s.chain[k + 1].x - g.x, 1e-12) && near(m.position.z, g.s.chain[k + 1].z - g.z, 1e-12) && near(m.position.y, g.s.chain[k + 1].r * 0.82, 1e-12)));
  const hd = g.s.heading;
  check('the eye: head r × 0.7 out along the heading, × 1.05 up (1.x enemy.js:1333)',
    near(v.eye.position.x, Math.cos(hd) * 0.46 * 0.7, 1e-12) && near(v.eye.position.y, 0.46 * 1.05, 1e-12) && near(v.eye.position.z, Math.sin(hd) * 0.46 * 0.7, 1e-12) && v.eye.scale.x === 1);
  g.sq = 0.64; g.r = 0.552;
  look.update(v, g, w, 0, 1);
  const sx = 1 / Math.sqrt(0.64);
  check('the head squashes (sx, sq, sx) × an elite\'s 1.2; the tail and the eye do not',
    near(v.segs[0].scale.x, sx * 1.2, 1e-12) && near(v.segs[0].scale.y, 0.64 * 1.2, 1e-12) && v.segs[5].scale.x === 1 && v.eye.scale.y === 1);
  g.sq = 1; g.r = 0.46;
  // shot shorter: the view takes the new length's geometries and hides the rest
  const bl = pts(g);
  bulletAt(w, bl[0].x, bl[0].z);
  step(w, IDLE);
  look.update(v, g, w, 0, 1);
  check('shot to ten, the view draws ten, re-tapered (0.46 … 0.18), the eleventh hidden',
    v.segs.filter((m) => m.visible).length === 10 && !v.segs[10].visible && near(v.segs[9].geometry.parameters.radius, 0.18, 1e-12) && near(v.segs[5].geometry.parameters.radius, segRadius(C, 10, 5), 1e-12));
  look.update(v, g, w, 0, 0.5);
  check('a slug still swelling in grows about its head', v.body.scale.x === 0.5 && v.body.scale.y === 0.5);
  // the death: it fades (1 − t)² × 0.82 and the eye goes (1.x enemy.js:2983-2984, 3012)
  look.update(v, g, w, 0, 1);
  v.dyingT = T.blob.death * 0.5;
  v.root.updateMatrixWorld(true);
  check('dying, it fades as (1 − t)² × 0.82 and its eye is gone', near(v.mat.opacity, 0.25 * 0.82, 1e-12) && !v.eye.visible, `${v.mat.opacity}`);
  v.dyingT = 0; look.reset(v);
  check('a pooled view comes back opaque, with its eye', v.mat.opacity === 1 && v.eye.visible && v.mat.transparent === true);
  // a half born this step stands where the sim laid it: a slug walking in
  // from the right wall, its tail past it, shot in the middle — the half's
  // head (the old tail) is pulled inside, and the view does not slide it in
  // from the spawn point (actors.js places the root between px and x)
  const r2 = world({ x: 17.5, z: 0, still: true, hero: [0, 8] });
  const rb = pts(r2.g);
  bulletAt(r2.w, rb[5].x, rb[5].z);
  step(r2.w, IDLE);
  const half = slugs(r2.w).find((x) => x !== r2.g), hv = view();
  hv.root.position.set(half.px, 0, half.pz);
  look.update(hv, half, r2.w, 0, 1);
  check('a half born this step: its old tail past the wall is laid inside, and the view stands it there, not where it was spawned',
    half && near(rb[10].x, 22.5, 1e-9) && near(half.x, r2.w.hx - half.r, 1e-12) && half.px !== half.x && hv.root.position.x === half.x && hv.root.position.z === half.z,
    half && `${half.px} ${half.x} ${hv.root.position.x}`);
}

if (failed) { console.log(`✗ slug: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ slug: ${passed} checks`);
