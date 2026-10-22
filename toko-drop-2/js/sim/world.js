// world.js — the rules of a run.
//
// Plain JS: no DOM, no three.js, no clock. One fixed step at a time from a
// seed, so a run is reproducible and testable in bare node (test/sim.mjs,
// test/species.mjs). The view reads the world; it never writes it. What
// happened during a step is reported in `world.events` for the view and the
// sound to act on.
//
// Coordinates: the arena is centred on the origin, x across (right +), z
// toward the bottom of the screen; its size is 1.x's (TUNING.arena). Each
// species is a module (sim/species/), each mode's spawning a director
// (sim/director/); docs/SIM_CONTRACT.md is the contract between them and
// this file. The frame order is 1.x's (bullets-graze.md §7.1): everything
// moves, then everything is tested, against post-move positions.
//
// Modes: 'arcade', 'hardcade' (corpses fire back) and 'survival'.
import { TUNING } from '../tuning.js?v=5';
import { makeRng } from './rng.js?v=5';
import { BEHAVIOUR } from './species/index.js?v=5';
import { DIRECTORS } from './director/index.js?v=5';
import * as fire from './fire.js?v=5';
import { makeHero, heroStep, applyPull, hurtHero, invincible } from './hero.js?v=5';
import { swarmForces, resolveCrowd } from './crowd.js?v=5';
import { revengeColor } from './color.js?v=5';

const T = TUNING;

export function createWorld({ seed = 1, mode = 'arcade', arena = T.arena.landscape } = {}) {
  const w = {
    seed, mode, rng: makeRng(seed), rngFx: makeRng((seed ^ 0x5bd1e995) >>> 0), tick: 0, time: 0, over: false,
    hx: arena.hx, hz: arena.hz, hero: makeHero(),
    gels: [], bullets: [], lobs: [], hazards: [], events: [],
    heroBullets: 0, gelBullets: 0, refused: 0,
    nextId: 1, score: 0, streak: 0, kills: 0, grazes: 0, nextMilestone: T.score.milestone, killedBy: null,
    wave: 1, dir: null,
  };
  w.director = DIRECTORS[mode] ?? DIRECTORS.arcade;
  w.dir = w.director.create(w, api);
  return w;
}

// ── what species and directors may call (docs/SIM_CONTRACT.md) ──────
export const api = {
  T, fire,
  S: (g) => T.species[g.kind],
  // the body's walking speed now: its species' speed, the wave's escalation,
  // the SWIFT affix and a SIREN's surge
  speed(g) {
    return T.species[g.kind].speed * g.speedMult * (g.affix === 'swift' ? T.variants.swiftSpeed : 1) * (g.surgeT > 0 ? g.surgeMult : 1);
  },
  spawn: (w, kind, x, z, opts) => spawn(w, kind, x, z, opts),
  // a point on the ellipse at `frac` of the arena, at `angle`; with
  // `clear`, the farthest of a few tries from the hero
  ringPoint(w, angle, frac, clear = 0) {
    let best = null, bd = -1;
    for (let i = 0; i < (clear ? 6 : 1); i++) {
      const a = i === 0 ? angle : w.rng.range(0, Math.PI * 2);
      const x = Math.cos(a) * w.hx * frac, z = Math.sin(a) * w.hz * frac;
      const d = Math.hypot(x - w.hero.x, z - w.hero.z);
      if (d > bd) { bd = d; best = { x, z }; }
      if (d > clear) break;
    }
    return best;
  },
  // hurt the hero unless they are in mercy or a dash; true if it landed
  hurt(w, by) { if (!w.hero.alive || invincible(w.hero)) return false; hurtHero(w, by); return true; },
  invincible: (w) => invincible(w.hero),
  heroBullet(w, x, z, angle) {
    if (w.heroBullets >= T.bullets.maxHero) return;
    const s = T.bullets.heroSpeed;
    w.bullets.push({ x, z, px: x, pz: z, vx: Math.cos(angle) * s, vz: Math.sin(angle) * s, speed: s, r: T.bullets.heroRadius,
      life: T.bullets.life, hero: true, color: T.bullets.heroColor, src: null, revenge: false, homing: 0, grazed: false, dead: false });
    w.heroBullets++;
  },
  kill: (w, g, src) => kill(w, g, src),
  clamp(w, g) { if (!g) return; g.x = clamp(g.x, -w.hx + g.r, w.hx - g.r); g.z = clamp(g.z, -w.hz + g.r, w.hz - g.r); },
  // points from anything but a kill or a graze (a wave's clear bonus), with
  // the milestones that follow
  score(w, n) { w.score += n; milestones(w); },
  // how many more children (a split's brood) 1.x lets onto the floor now:
  // children skip the live cap but stop at twice it (1.x main.js:10608-10620)
  childrenAllowed(w) {
    const cap = w.dir?.childCap > 0 ? w.dir.childCap : Infinity;
    if (cap === Infinity) return Infinity;
    let live = 0;
    for (const g of w.gels) if (g.alive) live++;
    return Math.max(0, cap - live);
  },
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ── one step ───────────────────────────────────────────────────────
export function step(w, input) {
  const dt = T.sim.dt;
  w.events.length = 0;
  if (w.over) return w;
  w.tick++; w.time += dt;

  const h = w.hero;
  h.px = h.x; h.pz = h.z;
  for (const g of w.gels) { g.px = g.x; g.pz = g.z; g.shield = false; }
  for (const b of w.bullets) { b.px = b.x; b.pz = b.z; }
  for (const l of w.lobs) { l.px = l.x; l.pz = l.z; }

  w.director.step(w, dt, api);
  heroStep(w, input, dt, api);
  swarmForces(w, dt);
  for (const g of w.gels.slice()) gelStep(w, g, dt);
  applyPull(w);
  resolveCrowd(w, dt);
  bulletsStep(w, dt);
  lobsStep(w, dt);
  hazardsStep(w, dt);
  heroBulletsHit(w);
  gelBulletsHit(w);
  contacts(w);

  // bookkeeping
  if (w.bullets.some((b) => b.dead)) {
    w.bullets = w.bullets.filter((b) => !b.dead);
    w.heroBullets = w.bullets.filter((b) => b.hero).length;
    w.gelBullets = w.bullets.length - w.heroBullets;
  }
  if (w.gels.some((g) => !g.alive)) w.gels = w.gels.filter((g) => g.alive);
  for (const g of w.gels) { g.velX += ((g.x - g.px) / dt - g.velX) * 0.3; g.velZ += ((g.z - g.pz) / dt - g.velZ) * 0.3; }
  h.velX += ((h.x - h.px) / dt - h.velX) * 0.3; h.velZ += ((h.z - h.pz) / dt - h.velZ) * 0.3;
  return w;
}

// ── bodies ─────────────────────────────────────────────────────────
function spawn(w, kind, x, z, o = {}) {
  const S = T.species[kind], V = T.variants;
  let r = S.radius, hp = S.hp;
  if (o.variant === 'elite') { r *= V.elite.radius; if (!S.noHpMult) hp = Math.ceil(hp * V.elite.hp); }
  else if (o.variant === 'elitelite' && !S.noHpMult) hp = Math.ceil(hp * V.elitelite.hp);
  if (o.isBoss) r *= V.boss.radius;
  if (o.hp != null) hp = o.hp;
  const g = {
    id: w.nextId++, kind, x, z, px: x, pz: z, vx: 0, vz: 0, kx: 0, kz: 0, velX: 0, velZ: 0,
    r, hp, maxHp: hp, state: o.child || o.appear === false ? 'active' : 'appear', t: 0, alive: true,
    flash: 0, sq: 1, sqV: 0, speedMult: o.speedMult ?? 1, intervalMult: o.intervalMult ?? 1,
    variant: o.variant ?? 'normal', affix: o.affix ?? null, anchored: o.affix === 'anchored', isBoss: !!o.isBoss, child: !!o.child,
    shield: false, surgeT: 0, surgeMult: 1, cloak: 0, tell: 0, faceX: 0, faceZ: 1, dashedBy: -1,
    dodgeCd: 0, dodgeT: 0, dodgeVx: 0, dodgeVz: 0, mvPhase: w.rngFx.range(0, Math.PI * 2), mvSide: w.rngFx.next() < 0.5 ? 1 : -1,
    nudgedX: 0, nudgedZ: 0, s: {},
  };
  w.gels.push(g);
  BEHAVIOUR[kind].init?.(w, g, api, o);
  w.events.push({ type: 'spawn', id: g.id, x, z, kind, boss: g.isBoss, ping: !!o.ping });
  return g;
}

function gelStep(w, g, dt) {
  if (!g.alive) return;
  const S = T.species[g.kind];
  const [k, c] = T.gel.sq[S.family === 'cube' ? 'cube' : 'blob'];
  g.sqV = (g.sqV - (g.sq - 1) * k) * c;
  g.sq = clamp(g.sq + g.sqV, 0.55, 1.55);
  if (g.flash > 0) g.flash -= dt;
  if (g.surgeT > 0) g.surgeT -= dt;
  g.t += dt;
  if (g.state === 'appear') {
    if (g.t >= T.gel.appear) { g.state = 'active'; g.t = 0; w.events.push({ type: 'land', x: g.x, z: g.z }); }
    return;
  }
  g.vx = g.vz = 0;
  BEHAVIOUR[g.kind].step(w, g, dt, api);
  if (!g.alive) return;
  const fr = Math.exp(-T.gel.knockFriction * dt);
  g.kx *= fr; g.kz *= fr;
  g.x += (g.vx + g.kx) * dt; g.z += (g.vz + g.kz) * dt;
  // the arena's edges are walls
  const HX = w.hx - g.r, HZ = w.hz - g.r;
  if (g.x < -HX || g.x > HX) { g.x = clamp(g.x, -HX, HX); if (Math.abs(g.kx) > 2) g.sqV += T.gel.sq.wall; g.kx *= -T.gel.wallBounce; }
  if (g.z < -HZ || g.z > HZ) { g.z = clamp(g.z, -HZ, HZ); if (Math.abs(g.kz) > 2) g.sqV += T.gel.sq.wall; g.kz *= -T.gel.wallBounce; }
}

function kill(w, g, src = 'hero') {
  if (!g.alive) return;
  g.alive = false;
  const S = T.species[g.kind], hard = w.mode === 'hardcade';
  w.kills++; w.streak++;
  w.score += Math.round(T.score.perKill * w.streak * (hard ? T.revenge.scoreMult : 1));
  w.events.push({ type: 'kill', id: g.id, x: g.x, z: g.z, kind: g.kind, r: g.r, color: S.color, big: g.r >= T.death.big, boss: g.isBoss, src });
  BEHAVIOUR[g.kind].onKill?.(w, g, api, src);
  // a big death shakes the bodies around it (1.x main.js:4517-4540)
  if (g.r >= T.death.big) for (const o of w.gels) if (o.alive && o !== g && Math.hypot(o.x - g.x, o.z - g.z) <= T.death.shockRadius) o.sqV -= T.death.shockSquash;
  // VOLATILE: an 8-ring at corpse speed on death, in every mode (1.x main.js:4367-4377)
  if (g.affix === 'volatile') {
    fire.ring(w, g.x, g.z, 8, w.rngFx.range(0, Math.PI * 2), { speedMult: T.revenge.speedMult, color: revengeColor(g.kind), src: g.kind, revenge: true });
  }
  if (hard && src !== 'env') revenge(w, g);
  w.director.onKill?.(w, g, api);
  milestones(w);
}

// HARDCADE: 1.x's corpse fire (main.js:4390-4420). Biters (or every corpse,
// with `who: 'all'`) and bosses bloom from the corpse's centre the step they
// die: AIMED is a tight burst at you, FAN a slow arc, RING the circle. Not
// before `fromWave`, and not while the floor already holds `fieldCap` live
// corpse bullets (a bloom that starts under the cap lands whole).
function revenge(w, g) {
  const R = T.revenge, S = T.species[g.kind];
  if (!(g.isBoss || S.revenge || R.who === 'all') || w.wave < R.fromWave) return;
  let live = 0;
  for (const b of w.bullets) if (b.revenge && !b.dead) live++;
  if (live >= Math.min(R.fieldCap.max, Math.round(R.fieldCap.base + w.wave * R.fieldCap.per)) || w.gelBullets >= R.poolGate) return;
  const h = w.hero, near = Math.hypot(h.x - g.x, h.z - g.z) < 0.001;
  const aim = near ? w.rngFx.range(0, Math.PI * 2) : Math.atan2(h.z - g.z, h.x - g.x);
  const opts = { speedMult: R.speedMult, color: revengeColor(g.kind), src: g.kind, revenge: true };
  const dialect = g.isBoss ? 'RING' : (S.revenge ?? 'RING');
  const n = (c) => Math.max(1, Math.round(c * R.density));
  if (dialect === 'AIMED') fire.fanStep(w, g.x, g.z, aim, n(R.aimed.count), R.aimed.spread, opts);
  else if (dialect === 'FAN') fire.fanStep(w, g.x, g.z, aim, n(R.fan.count), R.fan.spread, opts);
  else fire.ring(w, g.x, g.z, n(g.isBoss ? R.ring.boss : g.r > R.ring.bigRadius ? R.ring.big : R.ring.small), w.rngFx.range(0, Math.PI * 2), opts);
  w.events.push({ type: 'revenge', x: g.x, z: g.z, kind: g.kind });
}

function milestones(w) {
  while (w.score >= w.nextMilestone) { w.events.push({ type: 'milestone', score: w.nextMilestone }); w.nextMilestone += T.score.milestone; }
}

// ── bullets, lobs, hazards ─────────────────────────────────────────
function bulletsStep(w, dt) {
  const h = w.hero, HX = w.hx + 1.5, HZ = w.hz + 1.5;
  for (const b of w.bullets) {
    if (b.dead) continue;
    if (b.homing && !b.hero) {
      // steer toward the hero at no more than `homing` rad/s, at constant speed
      const want = Math.atan2(h.z - b.z, h.x - b.x), cur = Math.atan2(b.vz, b.vx);
      let d = want - cur; d = Math.atan2(Math.sin(d), Math.cos(d));
      const a = cur + clamp(d, -b.homing * dt, b.homing * dt);
      b.vx = Math.cos(a) * b.speed; b.vz = Math.sin(a) * b.speed;
    }
    b.x += b.vx * dt; b.z += b.vz * dt;
    if ((b.life -= dt) <= 0 || Math.abs(b.x) > HX || Math.abs(b.z) > HZ) b.dead = true;
  }
}

function lobsStep(w, dt) {
  if (!w.lobs.length) return;
  for (const l of w.lobs) {
    l.t += dt;
    const u = Math.min(1, l.t / l.flight);
    l.x = l.x0 + (l.tx - l.x0) * u; l.z = l.z0 + (l.tz - l.z0) * u;
    l.y = 0.5 + Math.sin(Math.PI * u) * l.height;
    if (u >= 1) {
      l.done = true;
      w.events.push({ type: 'lobLand', x: l.x, z: l.z, color: l.color, splash: l.splash, src: l.src });
      if (Math.hypot(w.hero.x - l.x, w.hero.z - l.z) < l.splash + T.hero.radius) api.hurt(w, l.src);
      if (l.hazard) fire.hazard(w, l.x, l.z, { ...l.hazard, src: l.src, color: l.color });
    }
  }
  w.lobs = w.lobs.filter((l) => !l.done);
}

function hazardsStep(w, dt) {
  if (!w.hazards.length) return;
  const h = w.hero;
  for (const z of w.hazards) {
    z.life -= dt;
    if (Math.hypot(h.x - z.x, h.z - z.z) < z.r) api.hurt(w, z.src);
  }
  w.hazards = w.hazards.filter((z) => z.life > 0);
}

// hero bullets → bodies: point against circle at post-move positions (1.x)
function heroBulletsHit(w) {
  for (const b of w.bullets) {
    if (!b.hero || b.dead) continue;
    for (const g of w.gels) {
      if (!g.alive || g.state !== 'active') continue;
      const B = BEHAVIOUR[g.kind];
      const touching = B.hitTest ? B.hitTest(w, g, b.x, b.z, b.r) : Math.hypot(g.x - b.x, g.z - b.z) < b.r + g.r;
      if (!touching) continue;
      const res = B.onHit?.(w, g, b, api);
      if (res === 'pass') continue;
      b.dead = true;
      if (res === 'block' || g.shield) { w.events.push({ type: 'block', x: b.x, z: b.z, id: g.id }); break; }
      g.hp -= T.bullets.heroDamage;
      g.flash = T.gel.flash;
      g.sqV += T.gel.sq.hit;
      w.events.push({ type: 'hit', x: b.x, z: b.z, id: g.id, kind: g.kind });
      if (g.hp <= 0) kill(w, g, 'hero');
      break;
    }
  }
}

// gel bullets → the hero, then graze (1.x main.js:10839-10867): nothing
// lands or grazes while you are invincible, and one bullet hit per step
function gelBulletsHit(w) {
  const h = w.hero;
  if (!h.alive || invincible(h)) return;
  for (const b of w.bullets) {
    if (b.hero || b.dead) continue;
    const d = Math.hypot(b.x - h.x, b.z - h.z);
    if (d < b.r + T.hero.hitRadius) {
      b.dead = true;
      hurtHero(w, b.revenge ? `revenge:${b.src}` : b.src);
      return;
    }
    if (!b.grazed && d < T.graze.radius) {
      b.grazed = true; w.grazes++;
      w.score += T.graze.points * (w.mode === 'hardcade' ? T.revenge.scoreMult : 1);
      w.events.push({ type: 'graze', x: b.x, z: b.z });
      milestones(w);
    }
  }
}

// bodies that hurt to touch (each species' `contact`; 1.x MELEE_TYPES)
function contacts(w) {
  const h = w.hero;
  if (!h.alive || invincible(h)) return;
  for (const g of w.gels) {
    if (!g.alive || g.state !== 'active') continue;
    const B = BEHAVIOUR[g.kind];
    const touching = B.touches ? B.touches(w, g) : T.species[g.kind].contact && Math.hypot(g.x - h.x, g.z - h.z) < g.r + T.gel.contactRadius;
    if (touching) { hurtHero(w, g.kind); return; }
  }
}
