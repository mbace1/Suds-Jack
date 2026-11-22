#!/usr/bin/env node
// splitta.mjs — SPLITTA's own checks, in bare node: 1.x's numbers
// (enemy.js:582, 1680, 1682, 1748-1753, 2663-2665, 2696-2697, 2732-2769,
// 2968-3000, 3007, 3013, 3026, 3058-3061; main.js:2410-2413, 4367-4377,
// 10153-10185, 10272, 10586-10620, 10731-10736; tuning.js:39, 53, 288, 302,
// 496-497), asserted against the sim stepping on
// its fixed 1/60 s. The split's timing is checked against an ORACLE: 1.x's own
// per-frame arithmetic for the death pop (`_deathT = 0.28`, `−= dt` a frame,
// the brood on the frame it reaches 0).
import { readFileSync } from 'node:fs';
import { createWorld, step, api } from '../../js/sim/world.js?v=162';
import { TUNING as T } from '../../js/tuning.js?v=162';
import behaviour from '../../js/sim/species/splitta.js?v=162';
import look from '../../js/render/looks/splitta.js?v=162';

let failed = 0, passed = 0;
const check = (claim, ok, detail = '') => {
  if (ok) { passed++; return; }
  failed++;
  console.log(`  ✗ ${claim}${detail ? ` — ${detail}` : ''}`);
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const TAU = Math.PI * 2;
const angDiff = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const wrap = (a) => ((a % TAU) + TAU) % TAU;

const S = T.species.splitta, dt = T.sim.dt;
const IDLE = { mx: 0, mz: 0, ax: 1, az: 0, aim: false, fire: false, dash: false };

// A world with nothing in it but one SPLITTA (anchored: no swarm forces or
// crowd, so what moves it is its own step), the hero at the origin and never
// running out of lives.
function world({ seed = 1, mode = 'arcade', x = 10, z = 0, o = {}, anchored = true } = {}) {
  const w = createWorld({ seed, mode });
  w.director = { step() {} };
  w.hero.lives = 1e9;
  const g = api.spawn(w, 'splitta', x, z, o);
  g.anchored = anchored;
  return { w, g };
}
// a hero bullet that lands on g this step: it starts one body-width short
// and flies 0.4 u (24 u/s) into it before the hits are tested
function shoot(w, g) { api.heroBullet(w, g.x - g.r - 0.3, g.z, 0); }
const gelBullets = (w) => w.bullets.filter((b) => !b.hero && !b.dead);
const kids = (w) => w.gels.filter((o) => o.kind === 'globbo');
// 1.x's own frame arithmetic: frames until `_deathT = 0.28` reaches 0 (enemy.js:2970, 2996)
const popFrames = (() => { let t = 0.28, n = 0; while (!(t <= 0)) { t -= dt; n++; } return n; })();

// ── the CFG row and its own numbers ──────────────────────────────────
{
  check('CFG: radius 1.1, hp 5, speed 1.0, lime 0x88ff22, ring colour 0xaaff44, no gun (1.x enemy.js:582)',
    S.radius === 1.1 && S.hp === 5 && S.speed === 1.0 && S.color === 0x88ff22 && S.bulletColor === 0xaaff44 && S.fireInterval === null);
  check('a blob dome, SCHOOL, hurts to touch in classic (MELEE_TYPES), not a biter',
    S.family === 'blob' && S.role === 'SCHOOL' && S.contact === true && S.revenge === null);
  const R = T.movement.roles.SCHOOL;
  check('SCHOOL: dodge 0.9, flock 1.0, current 1.0, no weave (1.x tuning.js:288)', R.dodge === 0.9 && R.flock === 1.0 && R.current === 1.0 && R.weave === 0);
  check('it walks at you while farther than 1.2 (1.x enemy.js:1749), its distance floored at 0.001 (1.x enemy.js:1682)', S.stopAt === 1.2 && S.velSmooth === 0.3 && S.distFloor === 0.001);
  check('it strobes at hp ≤ 2 (1.x enemy.js:2663)', S.lowHp === 2);
  check('the ring: 12, fixed phase from +x, at the gel bullet\'s 7 u/s, bullet kills only (1.x main.js:10731-10736)',
    S.ring.count === 12 && S.ring.base === 0 && S.ring.speedMult === 1 && T.bullets.gelSpeed === 7 && S.ring.from.length === 1 && S.ring.from[0] === 'hero');
  check('the split: 3 GLOBBOs, (j/3)·2π + U·0.3, 1.2 + U·1.5 out (1.x enemy.js:3059-3060, main.js:10595-10598)',
    S.children.kind === 'globbo' && S.children.count === 3 && S.children.jitter === 0.3 && S.children.dist[0] === 1.2 && near(S.children.dist[1], 2.7));
  check('they land when the 0.28 s death pop ends (1.x enemy.js:3007, 2996-3000)', T.blob.death === 0.28);
  check('the look: the default dome {1.05, 0.82, 1.05}, breathing 0.18 (1.x tuning.js:39, 53; enemy.js:803-806)',
    T.blob.shape.x === 1.05 && T.blob.shape.y === 0.82 && T.blob.shape.z === 1.05 && !T.blob.shapes.splitta && T.blob.breatheAmpSplitta === 0.18);
  check('the strobe: 0x224400 / black at 18 rad/s (1.x enemy.js:2665)', S.look.strobeOn === 0x224400 && S.look.strobeOff === 0 && S.look.strobeRate === 18);
  check('the death screen calls it a green splitta (1.x main.js:5028)', S.deathLabel === 'green splitta');
  const src = readFileSync(new URL('../../js/sim/species/splitta.js', import.meta.url), 'utf8');
  check('the behaviour uses no Math.random and no clock', !/Math\.random|Date\.now|performance\./.test(src));
  check('no special hits or bodies: every bullet lands, a circle of r', !behaviour.onHit && !behaviour.hitTest && !behaviour.touches);
}

// ── the walk: straight at you at spd, until 1.2 ──────────────────────
{
  const { w, g } = world({ x: 12, z: 5 });
  let exact = true, along = true;
  for (let i = 0; i < 120; i++) {
    const x0 = g.x, z0 = g.z, d = Math.hypot(x0, z0);
    step(w, IDLE);
    const mx = g.x - x0, mz = g.z - z0;
    exact &&= near(Math.hypot(mx, mz), S.speed * dt, 1e-12);
    along &&= near(mx, (-x0 / d) * S.speed * dt, 1e-12) && near(mz, (-z0 / d) * S.speed * dt, 1e-12);
  }
  check('it walks 1.0 u/s at wave 1\'s ×1 (1.x enemy.js:1750-1751)', exact);
  check('straight at you, from where it stands', along);
  check('it faces where it walks', near(g.faceX, -g.x / Math.hypot(g.x, g.z), 1e-9) && near(g.faceZ, -g.z / Math.hypot(g.x, g.z), 1e-9));
  // the wave's speedMult, swift and a SIREN's surge all reach it
  const at = (o, setup) => { const r = world({ x: 12, z: 0, o }); setup?.(r.g); const x0 = r.g.x; step(r.w, IDLE); return x0 - r.g.x; };
  check('× the wave\'s speedMult (wave 3: 1.244)', near(at({ speedMult: 1.244 }), 1.244 * dt, 1e-12));
  check('× 1.35 SWIFT', near(at({ affix: 'swift' }), 1.35 * dt, 1e-12));
  check('× 1.6 under a SIREN\'s surge', near(at({}, (g2) => { g2.surgeT = 3; g2.surgeMult = 1.6; }), 1.6 * dt, 1e-12));
  // it stands inside 1.2 and walks again past it
  const { w: w2, g: g2 } = world({ x: 1.19, z: 0 });
  for (let i = 0; i < 30; i++) step(w2, IDLE);
  check('inside 1.2 it stands still', g2.x === 1.19 && g2.z === 0);
  const { w: w3, g: g3 } = world({ x: 1.21, z: 0 });
  step(w3, IDLE);
  check('just past 1.2 it walks', g3.x < 1.21);
  for (let i = 0; i < 30; i++) step(w3, IDLE);
  check('and stops at 1.2', g3.x <= 1.2 && g3.x > 1.2 - S.speed * dt - 1e-12);
  // contact: r + 0.5 = 1.6 — it touches you just by walking in
  const hurtAt = (d) => { const r = world({ x: d, z: 0 }); r.g.state = 'active'; const l = r.w.hero.lives; r.g.s.velX = 0; step(r.w, IDLE); return r.w.hero.lives < l; };
  check('touching it hurts within r + 0.5 = 1.6 (1.x main.js:10886-10906)', hurtAt(1.55) && !hurtAt(1.7));
}

// ── its own velocity, for the look ───────────────────────────────────
{
  const { w, g } = world({ x: 12, z: 0 });
  let ok = true;
  for (let n = 1; n <= 40; n++) { step(w, IDLE); ok &&= near(g.s.velX, -S.speed * (1 - 0.7 ** n), 1e-12) && near(g.s.velZ, 0, 1e-12); }
  check('its own walk, eased 0.3 a step (1.x enemy.js:2696-2697)', ok);
  // a dodge or the current is not in it: with the forces on, it reads only the walk
  const { w: w2, g: g2 } = world({ x: 12, z: 0, anchored: false });
  w2.wave = 4;
  let only = true, dodged = false, fast = 0;
  for (let i = 0; i < 200 && g2.alive; i++) {
    if (i % 20 === 0) api.heroBullet(w2, g2.x - 3, g2.z, 0);   // bullets at it: it sidesteps them
    step(w2, IDLE);
    dodged ||= w2.events.some((e) => e.type === 'dodge' && e.id === g2.id);
    fast = Math.max(fast, Math.hypot(g2.velX, g2.velZ));
    only &&= Math.hypot(g2.s.velX, g2.s.velZ) <= S.speed + 1e-9;
  }
  check('SCHOOL: it sidesteps a bullet lane (the core\'s dodge, share 0.9)', dodged && fast > 3 * S.speed, `${dodged} ${fast.toFixed(2)}`);
  check('the swarm forces and a dodge never reach its own velocity', only);
  // an elite (r 1.32) is over the dodge's 1.1 gate (1.x main.js:10272 `e.radius <= 1.1`)
  const { w: w3, g: g3 } = world({ x: 12, z: 0, anchored: false, o: { variant: 'elite' } });
  w3.wave = 4;
  let eliteDodged = false;
  for (let i = 0; i < 200 && g3.alive; i++) {
    if (i % 20 === 0) api.heroBullet(w3, g3.x - 3, g3.z, 0);
    step(w3, IDLE);
    eliteDodged ||= w3.events.some((e) => e.type === 'dodge' && e.id === g3.id);
  }
  check('an elite SPLITTA never sidesteps: r 1.32 is over the 1.1 gate', !eliteDodged && T.movement.dodge.maxRadius === 1.1);
  // standing on you: the floored distance, no NaN, it stays put
  const { w: w4, g: g4 } = world({ x: 0, z: 0 });
  for (let i = 0; i < 5; i++) step(w4, IDLE);
  check('right on top of you it stands, and nothing goes NaN', g4.x === 0 && g4.z === 0 && Number.isFinite(g4.s.velX) && Number.isFinite(g4.faceX));
}

// ── the tell: hp ≤ 2 ─────────────────────────────────────────────────
{
  const { w, g } = world({ x: 12, z: 0 });
  step(w, IDLE);
  check('at full hp: no tell', g.tell === 0);
  g.hp = 3; step(w, IDLE);
  check('at 3: none', g.tell === 0);
  g.hp = 2; step(w, IDLE);
  check('at 2: armed', g.tell === 1);
  g.hp = 1; step(w, IDLE);
  check('at 1: armed', g.tell === 1);
  // a real hit: the strobe shows on the step after, as 1.x's emissive (before the bullets) did
  const { w: w2, g: g2 } = world({ x: 12, z: 0 });
  g2.hp = 3; step(w2, IDLE);
  shoot(w2, g2); step(w2, IDLE);
  check('the hit that takes it to 2 lands this step; the tell starts next step', g2.hp === 2 && g2.tell === 0);
  step(w2, IDLE);
  check('… and there it is', g2.tell === 1);
  // the threshold is absolute: an elite has 10 and pulses only at its last 2
  const { w: w3, g: g3 } = world({ x: 12, z: 0, o: { variant: 'elite' } });
  check('an elite SPLITTA: hp 10, r 1.32', g3.hp === 10 && near(g3.r, 1.32));
  g3.hp = 3; step(w3, IDLE);
  const at3 = g3.tell;
  g3.hp = 2; step(w3, IDLE);
  check('an elite pulses only at its last 2', at3 === 0 && g3.tell === 1);
}

// ── the death ring: a hero bullet's kill ─────────────────────────────
{
  const { w, g } = world({ x: 6, z: -3 });
  g.hp = 1;
  shoot(w, g); step(w, IDLE);
  const kill = w.events.find((e) => e.type === 'kill' && e.id === g.id);
  const ring = gelBullets(w);
  check('a bullet kill: the kill names the hero', !g.alive && kill?.src === 'hero');
  check('12 bullets ring out', ring.length === 12, `${ring.length}`);
  check('from the corpse\'s centre (they leave after the bullets moved, so they have not yet)',
    ring.every((b) => b.x === g.x && b.z === g.z));
  const angs = ring.map((b) => wrap(Math.atan2(b.vz, b.vx))).sort((a, b) => a - b);
  check('30° apart, the first along +x, not aimed at you', angs.every((a, j) => angDiff(a, (j / 12) * TAU) < 1e-12), angs.map((a) => a.toFixed(3)).join(','));
  check('at 7 u/s, lime 0xaaff44, from the splitta, not revenge',
    ring.every((b) => near(Math.hypot(b.vx, b.vz), 7, 1e-12) && b.color === 0xaaff44 && b.src === 'splitta' && b.revenge === false && b.homing === 0 && b.r === T.bullets.gelRadius && b.life === T.bullets.life));
  check('one gelShot for the sound', w.events.filter((e) => e.type === 'gelShot' && e.kind === 'splitta').length === 1);
  step(w, IDLE);
  check('next step they fly', gelBullets(w).every((b) => near(Math.hypot(b.x - g.x, b.z - g.z), 7 * dt, 1e-12)));
  // an elite rings the same 12
  const { w: w2, g: g2 } = world({ x: 6, z: 3, o: { variant: 'elite' } });
  g2.hp = 1; shoot(w2, g2); step(w2, IDLE);
  check('an elite rings the same 12', !g2.alive && gelBullets(w2).length === 12);
  // every mode: HARDCADE too, and it is not corpse fire
  const { w: w3, g: g3 } = world({ x: 6, z: 3, mode: 'hardcade' });
  w3.wave = 9;
  g3.hp = 1; shoot(w3, g3); step(w3, IDLE);
  const hb = gelBullets(w3);
  check('HARDCADE: the same living ring, and no corpse fire (not a biter)',
    hb.length === 12 && hb.every((b) => !b.revenge && b.color === 0xaaff44) && !w3.events.some((e) => e.type === 'revenge'));
}

{
  // the killer comes from the core: a kill it names as a hero bullet rings
  const { w, g } = world({ x: 6, z: 0 });
  step(w, IDLE);
  api.kill(w, g, 'hero');
  check('a kill the core names as the hero\'s rings', gelBullets(w).length === 12);
  // VOLATILE: 1.x fires both — the fuse's 8 at corpse speed and the living 12 (main.js:4367-4377, 10731-10736)
  const { w: w2, g: g2 } = world({ x: 6, z: 0, o: { affix: 'volatile' } });
  step(w2, IDLE);
  g2.hp = 1; shoot(w2, g2); step(w2, IDLE);
  for (let i = 0; i < 120 && w2.seeds.length; i++) step(w2, IDLE);   // v103: the corpse warns before it bites
  const all = gelBullets(w2), lime = all.filter((b) => !b.revenge), fuse = all.filter((b) => b.revenge);
  check('a VOLATILE SPLITTA rings out both: its 12 in lime at 7, and the fuse\'s 8 at corpse speed',
    lime.length === 12 && lime.every((b) => b.color === 0xaaff44 && near(b.speed, 7, 1e-12))
    && fuse.length === 8 && fuse.every((b) => near(b.speed, 7 * T.revenge.speedMult, 1e-12)));
}

// ── what does NOT ring: the dash, the environment ────────────────────
for (const src of ['dash', 'env']) {
  const { w, g } = world({ x: 6, z: 0 });
  step(w, IDLE);
  api.kill(w, g, src);
  check(`a ${src} kill: no ring`, gelBullets(w).length === 0 && !w.events.some((e) => e.type === 'gelShot'));
  check(`a ${src} kill still splits`, kids(w).length === 3);
}
{
  // the hero's real dash at level 1 cuts it: no ring, and the brood comes
  const { w, g } = world({ x: 3, z: 0 });
  w.hero.dashLevel = 1;
  g.anchored = true;
  let killed = null, killStep = -1, landStep = -1;
  for (let i = 0; i < 60 && landStep < 0; i++) {
    step(w, { ...IDLE, mx: i < 20 ? 1 : 0, dash: i === 0 });
    if (!killed && (killed = w.events.find((e) => e.type === 'kill' && e.id === g.id))) killStep = i;
    if (killStep >= 0 && kids(w).length === 3 && kids(w).every((c) => c.state === 'active')) landStep = i;
  }
  check('dashed through at level 1: killed by the dash, no ring', !g.alive && killed?.src === 'dash' && gelBullets(w).filter((b) => b.src === 'splitta').length === 0);
  check('… and the three still come', kids(w).length === 3);
  // 1.x's dash cuts BEFORE the enemy loop (main.js:10153-10185, then 10367-10410),
  // so the death pop's first tick is that same frame: the brood comes a frame sooner
  check(`… ${popFrames - 1} steps after a dash kill (the pop ticks on the kill's own frame)`, landStep - killStep === popFrames - 1, `${landStep - killStep}`);
}

// ── the split: three GLOBBOs, 0.28 s after the kill ──────────────────
{
  const { w, g } = world({ x: 4, z: 6, o: { speedMult: 1.346, intervalMult: 0.835 } });
  step(w, IDLE);
  g.hp = 1; shoot(w, g); step(w, IDLE);
  const k = kids(w);
  check('3 GLOBBOs', k.length === 3);
  check('ordinary bodies: hp 1, r 0.55, no variant, no affix, marked as children',
    k.every((c) => c.hp === 1 && c.maxHp === 1 && c.r === 0.55 && c.variant === 'normal' && c.affix === null && c.child === true && !c.isBoss));
  check('on the parent\'s wave multipliers (1.x new Enemy(…, e._speedMult, e._intervalMult))',
    k.every((c) => c.speedMult === 1.346 && c.intervalMult === 0.835));
  const placed = k.map((c, j) => {
    const a = wrap(Math.atan2(c.z - g.z, c.x - g.x)), d = Math.hypot(c.x - g.x, c.z - g.z);
    return { j, a, d, off: wrap(a - (j / 3) * TAU) };
  });
  check('child j at (j/3)·2π + [0, 0.3) round the corpse', placed.every((p) => p.off >= 0 && p.off < 0.3 + 1e-12), placed.map((p) => p.off.toFixed(3)).join(','));
  check('1.2–2.7 u out', placed.every((p) => p.d >= 1.2 - 1e-12 && p.d < 2.7 + 1e-12));
  check('none is out yet: they wait out the pop (the core\'s wait, state appear, t = −0.28)', k.every((c) => c.state === 'appear' && near(c.t, -0.28, 1e-12)));
  const at = k.map((c) => [c.x, c.z]);
  // they cannot be hit while they wait: a bullet through one flies on
  const c0 = k[0];
  api.heroBullet(w, c0.x - 0.5, c0.z, 0);
  let activeAt = -1, still = true, unhurt = true, unhit = true;
  const lives = w.hero.lives;
  for (let n = 1; n <= 40; n++) {
    if (n === 2) { w.hero.x = k[1].x; w.hero.z = k[1].z; }  // stand on one: it does not hurt yet
    step(w, IDLE);
    if (activeAt < 0 && k.every((c) => c.state === 'active')) activeAt = n;
    if (activeAt < 0) {
      still &&= k.every((c, j) => c.x === at[j][0] && c.z === at[j][1]);
      unhurt &&= w.hero.lives === lives;
      unhit &&= k.every((c) => c.hp === 1 && c.alive);
    }
    if (n === 3) { w.hero.x = 0; w.hero.z = 0; }
  }
  check(`they come out on 1.x's frame: ${popFrames} steps after the kill (the death pop's 0.28 s)`, activeAt === popFrames, `${activeAt}`);
  check('until then they do not move', still);
  check('nor hurt you', unhurt);
  check('nor take a bullet', unhit);
}
{
  // 1.x built the brood at rest, sq 1 and sqV 0 (enemy.js:669-670), when the
  // pop ended — after the big-death shockwave (a SPLITTA is big, r 1.1 ≥ 0.75,
  // enemy.js:582), which squashed only the bodies alive at the kill
  // (main.js:4518-4529: −0.55 inside 3.5 u). So a bullet-killed SPLITTA's
  // GLOBBOs, all 2.7 or less from it, wait and come out unsquashed
  const { w, g } = world({ x: 0, z: 0 });
  const near1 = api.spawn(w, 'yela', 3.4, 0), far1 = api.spawn(w, 'yela', -3.6, 0);
  near1.anchored = far1.anchored = true;
  step(w, IDLE);
  g.hp = 1; shoot(w, g); step(w, IDLE);
  const k = kids(w);
  check('its death squashes a body 3.4 off (−0.55) and not one 3.6 off', !g.alive && near(near1.sqV, -0.55, 1e-12) && far1.sqV === 0, `${near1.sqV} ${far1.sqV}`);
  check('…but not its own brood: each starts at rest, sq 1 and sqV 0', k.length === 3 && k.every((c) => c.sq === 1 && c.sqV === 0), k.map((c) => `${c.sq}/${c.sqV}`).join(','));
  let rest = true, released = false;
  for (let n = 1; n <= popFrames; n++) {
    step(w, IDLE);
    rest &&= k.every((c) => c.sq === 1 && c.sqV === 0);
    if (n === popFrames) released = k.every((c) => c.state === 'active');
  }
  check('…holds still through the wait, and is let out at rest: sq 1, sqV 0 (1.x enemy.js:669-670)', rest && released, k.map((c) => `${c.state} ${c.sq}/${c.sqV}`).join(','));
}
{
  // nor does another big death during the pop rattle it: 1.x had nothing
  // there yet to rattle (the brood is built when the pop ends, main.js:10586-10620)
  const { w, g } = world({ x: 0, z: 0 });
  const redd = api.spawn(w, 'redd', 0, 3); redd.anchored = true;
  step(w, IDLE);
  api.kill(w, g, 'env');
  const k = kids(w);
  for (let n = 1; n <= 5; n++) step(w, IDLE);
  const by = k.filter((c) => Math.hypot(c.x - redd.x, c.z - redd.z) <= T.death.shockRadius);
  api.kill(w, redd, 'env');
  check('a REDD (big, 0.75) dying beside the waiting brood leaves it at rest', by.length > 0 && k.every((c) => c.state === 'appear' && c.sq === 1 && c.sqV === 0), k.map((c) => c.sqV).join(','));
  for (let n = 6; n <= popFrames; n++) step(w, IDLE);
  check('…and it comes out at rest', k.every((c) => c.state === 'active' && c.sq === 1 && c.sqV === 0));
}
{
  // the first step out they stand (the core's landing step); the next, the pounce stalk walks
  const { w, g } = world({ x: 10, z: 0 });
  step(w, IDLE);
  api.kill(w, g, 'env');
  const k = kids(w);
  for (const c of k) c.anchored = true;
  for (let n = 1; n < popFrames; n++) step(w, IDLE);
  const at = k.map((c) => [c.x, c.z]);
  step(w, IDLE);
  check('on the step they land, they have not walked yet', k.every((c, j) => c.state === 'active' && c.x === at[j][0] && c.z === at[j][1]));
  step(w, IDLE);
  check('the step after, they stalk you as GLOBBOs', k.every((c, j) => c.x !== at[j][0] || c.z !== at[j][1]) && k.every((c) => c.s.pounce === 'stalk'));
}
{
  // swift is baked into 1.x's _speedMult, so the children inherit it
  const { w, g } = world({ x: 6, z: 0, o: { affix: 'swift', speedMult: 1.1 } });
  api.kill(w, g, 'env');
  check('a SWIFT parent\'s brood inherits the ×1.35 (1.x main.js:9416 bakes it into _speedMult)',
    kids(w).every((c) => near(c.speedMult, 1.1 * 1.35, 1e-12) && c.affix === null));
  // an elite's brood is still three ordinary GLOBBOs
  const { w: w2, g: g2 } = world({ x: 6, z: 0, o: { variant: 'elite' } });
  api.kill(w2, g2, 'env');
  check('an elite\'s brood: three ordinary GLOBBOs', kids(w2).length === 3 && kids(w2).every((c) => c.r === 0.55 && c.hp === 1 && c.variant === 'normal'));
}
{
  // the spread over many corpses: the whole of 1.x's jitter and distance
  const offs = [], ds = [];
  for (let seed = 1; seed <= 150; seed++) {
    const { w, g } = world({ seed, x: 0, z: 0 });
    api.kill(w, g, 'env');
    kids(w).forEach((c, j) => { offs.push(wrap(Math.atan2(c.z, c.x) - (j / 3) * TAU)); ds.push(Math.hypot(c.x, c.z)); });
  }
  check('the jitter covers [0, 0.3)', Math.min(...offs) < 0.02 && Math.max(...offs) > 0.28 && Math.max(...offs) < 0.3);
  check('the distance covers [1.2, 2.7)', Math.min(...ds) < 1.25 && Math.max(...ds) > 2.65 && Math.max(...ds) < 2.7);
}
{
  // against a wall: 1.x leaves a child up to 2.7 outside it; 2.0's walls hold every body, so it is born inside
  const w = createWorld({ seed: 3 }); w.director = { step() {} };
  const g = api.spawn(w, 'splitta', w.hx - 1.1, w.hz - 1.1);
  api.kill(w, g, 'env');
  check('a corner corpse: its brood is inside the walls', kids(w).every((c) => Math.abs(c.x) <= w.hx - c.r && Math.abs(c.z) <= w.hz - c.r));
}
{
  // the child valve: none past the live cap × 2 (1.x main.js:10612-10619)
  const { w, g } = world({ x: 0, z: 0 });
  for (let i = 0; i < 4; i++) api.spawn(w, 'yela', -15 + i * 2, 8);
  w.dir.childCap = 6;
  api.kill(w, g, 'env');
  check('with 4 living and a cap of 6, two of the three come out', kids(w).length === 2);
  const { w: w2, g: g2 } = world({ x: 0, z: 0 });
  for (let i = 0; i < 6; i++) api.spawn(w2, 'yela', -15 + i * 2, 8);
  w2.dir.childCap = 6;
  api.kill(w2, g2, 'env');
  check('at the cap, none', kids(w2).length === 0);
  // the arcade director's own valve
  const w3 = createWorld({ seed: 5, mode: 'arcade' });
  step(w3, IDLE);
  check('the arcade director sets the valve at its live cap × 2 (1.x tuning.js:428)', w3.dir.childCap === w3.dir.liveCap * T.waves.caps.childMult && w3.dir.childCap > 0);
}
{
  // the director's clear cannot fire between a SPLITTA and its brood
  const w = createWorld({ seed: 7, mode: 'arcade' });
  step(w, IDLE);
  w.dir.queue.length = 0;
  for (const o of w.gels) o.alive = false;
  w.gels.length = 0;
  w.hero.lives = 1e9;
  const g = api.spawn(w, 'splitta', 8, 0);
  step(w, IDLE);
  let cleared = false;
  api.kill(w, g, 'env');
  for (let n = 0; n < popFrames + 2; n++) { step(w, IDLE); if (w.events.some((e) => e.type === 'clear')) cleared = true; }
  check('the floor is not clear while the brood is on its way', !cleared && kids(w).length === 3);
  for (const c of kids(w)) api.kill(w, c, 'env');
  for (let n = 0; n < 60 && !cleared; n++) { step(w, IDLE); if (w.events.some((e) => e.type === 'clear')) cleared = true; }
  check('… and is, once the brood is dead (the control)', cleared);
}

// ── determinism ──────────────────────────────────────────────────────
{
  const run = (seed) => {
    const { w, g } = world({ seed, x: 7, z: 2, anchored: false });
    for (let i = 0; i < 40; i++) step(w, IDLE);
    g.hp = 1; shoot(w, g);
    for (let i = 0; i < 60; i++) step(w, IDLE);
    return w.gels.map((o) => `${o.kind}:${o.x.toFixed(9)},${o.z.toFixed(9)}`).join(';') + '|' + w.bullets.length;
  };
  check('a run replays from its seed', run(11) === run(11) && run(11).includes('globbo'));
  check('another seed splits elsewhere', run(11) !== run(12));
}

// ── the look: 1.x's scale block (enemy.js:2732-2769) and the strobe ──
{
  class O3 {
    constructor() { this.children = []; this.scale = { set(x, y, z) { this.v = [x, y, z]; }, setScalar(s) { this.v = [s, s, s]; }, v: [1, 1, 1] }; this.rotation = { set(x, y, z) { this.v = [x, y, z]; }, v: [0, 0, 0] }; }
    add(c) { this.children.push(c); }
  }
  class Mesh extends O3 { constructor(geo, mat) { super(); this.geo = geo; this.mat = mat; } }
  const emissive = { hex: -1, setHex(h) { this.hex = h; return this; } };
  const ctx = { THREE: { Group: O3, Mesh }, geo: { blob: 'dome' }, T, S, gelMaterial: (hex, fam, r) => ({ hex, fam, r, emissive }) };
  const built = look.build(ctx);
  check('build: the body is the gel dome itself in its colour, blob family, unit radius (1.x makeSatinMat(color, \'blob\', 1))',
    built.body instanceof Mesh && built.body.geo === 'dome' && built.mat.hex === 0x88ff22 && built.mat.fam === 'blob' && built.mat.r === 1 && built.body.mat === built.mat);
  // not `own`: the core's plain-body death (actors.js stepFx) resets the squash
  // and pops a uniform dome of r × (1 + 1.3t), which is 1.x's destroy()
  // (enemy.js:2981, 3013, 3026); an own body would pop in its live shape
  check('not own, so its death pop is 1.x\'s uniform dome of r·rm × (1 + 1.3t)', !built.own && T.blob.deathSwell === 1.3 && T.blob.death === 0.28);
  const v = { S, phase: 0, yaw: 0, ...built };
  const sh = T.blob.shape, B = T.blob;
  // what reaches the screen: the view's squash group (1/√sq, sq, 1/√sq) × the body's scale
  const shown = (sq) => { const b = v.body.scale.v; return [b[0] / Math.sqrt(sq), b[1] * sq, b[2] / Math.sqrt(sq)]; };
  const g = { r: 1.1, sq: 1, tell: 0, flash: 0, affix: null, s: { velX: 0, velZ: 0 } };

  look.update(v, g, null, 0, 1);
  check('at rest it is r × the dome: 2.31 wide, 1.53 tall', near(shown(1)[0], 1.1 * sh.x) && near(shown(1)[1], 1.1 * sh.y) && near(shown(1)[2], 1.1 * sh.z)
    && near(2 * 1.1 * sh.x, 2.31, 1e-9) && near(1.7 * 1.1 * sh.y, 1.5334, 1e-3));
  check('it faces +z until it first walks (1.x _moveYaw = 0)', v.yaw === 0 && v.body.rotation.v[1] === 0);
  const tq = Math.PI / (2 * B.breatheHz);           // the top of the breath
  look.update(v, g, null, tq, 1);
  check('it breathes 0.18 deep: taller by 18%, 9% narrower (1.x enemy.js:2748-2751)',
    near(shown(1)[1], 1.1 * sh.y * 1.18) && near(shown(1)[0], 1.1 * sh.x * (1 - 0.09)));
  g.sq = 0.7; g.s.velX = 2; g.s.velZ = 0;
  const time = 0.37, b = B.breatheAmpSplitta * Math.sin(time * B.breatheHz);
  look.update(v, g, null, time, 1);
  const sx = 1 / Math.sqrt(0.7), drag = Math.min(2 * B.dragStretchPerSpeed, B.dragMax);
  const want = [1.1 * sh.x * sx * (1 - b * 0.5), 1.1 * sh.y * (0.7 * (1 + b) - drag * 0.25), 1.1 * sh.z * (sx * (1 - b * 0.5) + drag)];
  check('squashed, breathing and dragging, what shows is 1.x\'s formula (the squash group\'s share taken back out)',
    shown(0.7).every((x, k) => near(x, want[k], 1e-12)), `${shown(0.7)} vs ${want}`);
  check('no inflate with the tell (that is SPITTOR\'s)', (() => { g.tell = 1; look.update(v, g, null, time, 1); const s2 = shown(0.7); g.tell = 0; return s2.every((x, k) => near(x, want[k], 1e-12)); })());
  check('it turns to its heading, nose lifting with the drag (1.x rotation (−0.35 drag, yaw, 0))',
    near(v.yaw, Math.atan2(2, 0)) && near(v.body.rotation.v[1], v.yaw) && near(v.body.rotation.v[0], -drag * B.rearDragTilt) && v.body.rotation.v[2] === 0);
  // the core's default shaping runs first and writes v.yaw from the WHOLE
  // displacement (the dodge in it); the look puts its own heading back
  v.yaw = -1; g.s.velX = 0.3; g.s.velZ = 0.1; look.update(v, g, null, time, 1);
  check('below 0.4 u/s it holds its own heading, whatever the default shaping wrote', near(v.yaw, Math.atan2(2, 0)) && near(v.body.rotation.v[1], Math.atan2(2, 0)));
  g.sq = 1; g.s.velX = g.s.velZ = 0; g.r = 1.32; look.update(v, g, null, 0, 0.5);
  check('the radius it is drawn at is the body\'s own (elite × 1.2) × the view\'s swell grow (TUNING.gel.swell)', near(shown(1)[0], 1.32 * 0.5 * sh.x));
  g.r = 1.1;

  // the strobe
  const on = Math.PI / 36, off = Math.PI / 18 + Math.PI / 36;   // sin(18t) > 0 / < 0
  emissive.hex = -1; look.update(v, g, null, on, 1);
  check('no tell: no glow of its own', emissive.hex === -1);
  g.tell = 1; look.update(v, g, null, on, 1);
  check('armed: 0x224400 while sin(18t) > 0', emissive.hex === 0x224400);
  look.update(v, g, null, off, 1);
  check('… black while it is not', emissive.hex === 0x000000);
  let flips = 0, last = null;
  for (let i = 0; i < 1000; i++) { look.update(v, g, null, i / 1000, 1); if (last !== null && emissive.hex !== last) flips++; last = emissive.hex; }
  check('a 2.86 Hz square: ~5.7 changes a second', flips === 5 || flips === 6, `${flips}`);
  emissive.hex = -1; g.flash = 0.1; look.update(v, g, null, on, 1);
  check('the hit flash outranks it', emissive.hex === -1);
  g.flash = 0; g.affix = 'volatile'; look.update(v, g, null, on, 1);
  check('so does the VOLATILE fuse (1.x enemy.js:2653-2656 comes first)', emissive.hex === -1);
  g.affix = null;

  v.yaw = 2; v.heading = 2; look.reset(v);
  check('reset: a reused view faces +z again', v.yaw === 0 && v.heading === 0);

  // the sim's velocity, not the view's: standing inside 1.2, nothing turns it
  const { w, g: gg } = world({ seed: 4, x: 1.1, z: 0 });
  const vv = { S, phase: 0, yaw: 0, ...look.build(ctx) };
  let turned = false;
  for (let i = 0; i < 120; i++) { step(w, IDLE); look.update(vv, gg, w, i * dt, 1); if (vv.yaw !== 0) turned = true; }
  check('a SPLITTA standing on you never turns', !turned);
}

if (failed) { console.log(`✗ splitta: ${failed} of ${passed + failed} checks failed`); process.exit(1); }
console.log(`✔ splitta: ${passed} checks`);
