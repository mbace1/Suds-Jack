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
import { TUNING } from '../tuning.js?v=57';
import { makeRng } from './rng.js?v=57';
import { BEHAVIOUR } from './species/index.js?v=57';
import { DIRECTORS } from './director/index.js?v=57';
import * as fire from './fire.js?v=57';
import { makeHero, heroStep, applyPull, hurtHero, invincible } from './hero.js?v=57';
import { swarmForces, resolveCrowd } from './crowd.js?v=57';
import { revengeColor } from './color.js?v=57';
import * as pickups from './pickups.js?v=57';
import * as worlds from './worlds.js?v=57';
import * as reshape from './reshape.js?v=57';
import { Arena, levelShape, levelMoves, levelEnvelope, KIND } from './shape.js?v=57';
import * as rules from './rules.js?v=57';
import * as heat from './heat.js?v=57';

const T = TUNING;

// `dashMode` and `hpMult` are the title's two test switches: 1.x's dash
// ('pass'), the PUSH dash (TUNING.hero.push) or the CUT dash (TUNING.hero.cut),
// and every non-boss body's hit points ×
// hpMult (the "bullet sponge" test; scores are unchanged). `gateUsed`: the
// player has dashed a gate before, so no gate wears the DASH THROUGH! hint.
// `shape` is the run's screen shape, which picks every later world's arena
// as `arena` picks world 1's; `world` starts the run further on (a test, or
// ?world=), at that world's first wave.
// `room` (mode 'campaign', sim/director/campaign.js) is an authored level:
// its region sets the walls — its box in w.hx / w.hz, and when it is not a
// rectangle, the shape itself in `w.region`, which every wall clamps to too.
export function createWorld({ seed = 1, mode = 'arcade', arena = T.arena.landscape, shape = 'landscape', world = 1, dashMode = 'pass', hpMult = 1, gateUsed = false, room = null } = {}) {
  if (world > 1) arena = worlds.arenaFor(world, shape);
  let region = null;
  if (room) {
    const sh = levelShape(room.level, room.turn);
    // a moving floor keeps its region (even a rectangle: it changes size) and walls that hold it at every moment
    const moves = levelMoves(room.level);
    if (sh) { region = new Arena(sh); arena = moves ? levelEnvelope(room.level, room.turn) : { hx: region.halfX, hz: region.halfZ }; if (sh.kind === KIND.RECT && !moves) region = null; }
    if (room.level?.mods?.dash) dashMode = 'cut';   // a room that asks for the CUT has it, whatever the title says
  }
  const w = {
    seed, mode, dashMode, hpMult, rng: makeRng(seed), rngFx: makeRng((seed ^ 0x5bd1e995) >>> 0), tick: 0, time: 0, over: false,
    shape, world, trans: null, lastBoss: null,
    hx: arena.hx, hz: arena.hz, hero: makeHero(),
    gels: [], bullets: [], lobs: [], hazards: [], events: [],
    heroBullets: 0, gelBullets: 0, refused: 0,
    nextId: 1, score: 0, streak: 0, kills: 0, grazes: 0, nextMilestone: T.score.milestone, killedBy: null,
    wave: 1, dir: null, room, region, hits: 0,
  };
  // the hero starts at the middle, or where a room's region has room for it
  if (region && !region.contains(0, 0, T.hero.radius)) { const p = region.clamp(0, 0, T.hero.radius + 0.05, { x: 0, z: 0 }); w.hero.x = w.hero.px = p.x; w.hero.z = w.hero.pz = p.z; }
  heat.create(w);   // the score's multiplier and the room's mutators (v51)
  w.pk = pickups.create(w, { gateUsed });   // 1.x's classic pickups (sim/pickups.js)
  w.director = DIRECTORS[mode] ?? DIRECTORS.arcade;
  w.dir = w.director.create(w, api);
  // a run started in a later world rolls in at that world's first wave
  if (world > 1 && worlds.on(w)) { w.dir.wave = (world - 1) * T.waves.rhythm.bossEvery; w.dir.gapT = 1e-9; }
  if (reshape.on(w)) reshape.create(w);   // SURVIVAL starts small and changes size as you play
  rules.create(w);                        // a campaign world's one rule (sim/rules.js)
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
  // `clear`, the farthest of a few tries from the hero. On a floor bigger
  // than world 1's the ellipse is world 1's, round the hero (worlds.spawnFrame)
  ringPoint(w, angle, frac, clear = 0) {
    let best = null, bd = -1;
    const F = worlds.spawnFrame(w);
    for (let i = 0; i < (clear ? 6 : 1); i++) {
      const a = i === 0 ? angle : w.rng.range(0, Math.PI * 2);
      const x = F.cx + Math.cos(a) * F.hx * frac, z = F.cz + Math.sin(a) * F.hz * frac;
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
    heat.shot(w);   // COLD GUN: a shot costs heat
  },
  kill: (w, g, src) => kill(w, g, src),
  pop: (w, g) => pop(w, g),
  clamp(w, g) { if (!g) return; g.x = clamp(g.x, -w.hx + g.r, w.hx - g.r); g.z = clamp(g.z, -w.hz + g.r, w.hz - g.r); inRegion(w, g, g.r); },
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
  if (w.over) { w.director.onOver?.(w); return w; }
  w.tick++; w.time += dt;

  const h = w.hero;
  h.px = h.x; h.pz = h.z;
  for (const g of w.gels) { g.px = g.x; g.pz = g.z; g.shield = false; }
  for (const b of w.bullets) { b.px = b.x; b.pz = b.z; }
  for (const l of w.lobs) { l.px = l.x; l.pz = l.z; }

  if (w.trans) worlds.step(w, dt);   // between two worlds the run is held, and the hero is the transition's
  else {
    if (w.shapeT) reshape.step(w, dt);
    w.director.step(w, dt, api);
    pickups.afterDirector(w, dt);
    heroStep(w, input, dt, api);
    rules.step(w, dt, api);
    swarmForces(w, dt);
    for (const g of w.gels.slice()) gelStep(w, g, dt);
    applyPull(w);
    resolveCrowd(w, dt);
    for (const g of w.gels) { g.nudgedX += g.knockDX || 0; g.nudgedZ += g.knockDZ || 0; g.knockDX = g.knockDZ = 0; }
    bulletsStep(w, dt);
    lobsStep(w, dt);
    hazardsStep(w, dt);
    heroBulletsHit(w);
    pickups.mothsHit(w);
    gelBulletsHit(w);
    contacts(w);
    pickups.step(w, dt, api);
    heat.step(w, dt);
  }
  // a death in a campaign room ends the room (sim/director/campaign.js)
  if (w.over && w.director.onOver) w.director.onOver(w);

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
  // HEAVY (TUNING.worlds.heavy): a later world's bigger, tougher body
  else if (o.heavy) { r *= T.worlds.heavy.radius; if (!S.noHpMult) hp = Math.ceil(hp * T.worlds.heavy.hp); }
  if (o.hp != null) hp = o.hp;
  if (!o.isBoss && w.hpMult !== 1) hp = Math.max(1, Math.round(hp * w.hpMult));
  const g = {
    id: w.nextId++, kind, x, z, px: x, pz: z, vx: 0, vz: 0, kx: 0, kz: 0, velX: 0, velZ: 0,
    r, hp, maxHp: hp, state: 'active', t: 0, alive: true,
    flash: 0, sq: 1, sqV: 0, speedMult: o.speedMult ?? 1, intervalMult: o.intervalMult ?? 1,
    variant: o.variant ?? 'normal', affix: o.affix ?? null, anchored: o.affix === 'anchored', isBoss: !!o.isBoss, child: !!o.child, heavy: !!o.heavy && !o.isBoss,
    shield: false, surgeT: 0, surgeMult: 1, cloak: 0, tell: 0, faceX: 0, faceZ: 1, dashedBy: -1, shovedBy: -1,
    dodgeCd: 0, dodgeT: 0, dodgeVx: 0, dodgeVz: 0, mvPhase: w.rngFx.range(0, Math.PI * 2), mvSide: w.rngFx.next() < 0.5 ? 1 : -1,
    nudgedX: 0, nudgedZ: 0, s: {},
  };
  w.gels.push(g);
  BEHAVIOUR[kind].init?.(w, g, api, o);
  // a species that sizes itself (BAMBU's and SLUG's segments, PYRA's holes)
  // throws a heavy spawn's size and hp away: it is not heavy, then
  if (g.heavy && (g.r !== r || g.maxHp !== hp)) g.heavy = false;
  w.events.push({ type: 'spawn', id: g.id, x, z, kind, boss: g.isBoss, ping: !!o.ping });
  // dangerous from its first step, as 1.x's bodies were (owner, 2026-10-22):
  // it lands now, and its swell in (TUNING.gel.swell) is the view's alone. A
  // child is not announced: a split, or a brood that lands when it is let out.
  // `arrive`: the same step as its spawn, so the sound holds the thud to the
  // end of the swell (audio.js) rather than over the spawn's hiss
  if (!g.child) w.events.push({ type: 'land', x, z, arrive: true });
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
  // a brood waiting out its parent's death pop (its onKill set state 'appear'
  // and t to minus the wait): inert, untouchable and undrawn until t reaches
  // 0, then live at once, at full size — hit and touching from this step,
  // moving from the next, as 1.x built it after its update loop (main.js:10586-10620)
  // — and after its crowd pass (main.js:10426), so the crowd solver leaves it
  // where it was laid on this step (`landTick`, crowd.js resolveCrowd)
  if (g.state === 'appear') {
    if (g.t >= 0) { g.state = 'active'; g.t = 0; g.landTick = w.tick; w.events.push({ type: 'land', x: g.x, z: g.z }); }
    return;
  }
  g.vx = g.vz = 0;
  BEHAVIOUR[g.kind].step(w, g, dt, api);
  if (!g.alive) return;
  const fr = Math.exp(-T.gel.knockFriction * dt);
  g.kx *= fr; g.kz *= fr;
  g.x += (g.vx + g.kx) * dt; g.z += (g.vz + g.kz) * dt;
  // a knock moved it from outside, like the crowd: reported with the crowd's
  // nudge (below), so a cube mid-tumble carries a shove instead of dropping it
  g.knockDX = g.kx * dt; g.knockDZ = g.kz * dt;
  // the arena's edges are walls
  const HX = w.hx - g.r, HZ = w.hz - g.r;
  if (g.x < -HX || g.x > HX) { g.x = clamp(g.x, -HX, HX); if (Math.abs(g.kx) > 2) g.sqV += T.gel.sq.wall; g.kx *= -T.gel.wallBounce; }
  if (g.z < -HZ || g.z > HZ) { g.z = clamp(g.z, -HZ, HZ); if (Math.abs(g.kz) > 2) g.sqV += T.gel.sq.wall; g.kz *= -T.gel.wallBounce; }
  // a room's region is a wall too: a knock off it comes back reflected
  if (w.region && inRegion(w, g, g.r)) {
    if (Math.hypot(g.kx, g.kz) > 2) { g.sqV += T.gel.sq.wall; g.kx *= -T.gel.wallBounce; g.kz *= -T.gel.wallBounce; }
  }
}

// keep a body of radius r inside a room's region; true when it had to move
export function inRegion(w, o, r) {
  if (!w.region || w.region.contains(o.x, o.z, r)) return false;
  const p = w.region.clamp(o.x, o.z, r, _rp);
  o.x = p.x; o.z = p.z;
  return true;
}
const _rp = { x: 0, z: 0 };

// a body put away without a fight (v42: what a boss leaves on the floor when
// it goes down, sim/bossfight.js): it bursts as a kill does, but pays nothing,
// keeps no streak, splits into nothing and fires no corpse
function pop(w, g) {
  if (!g.alive) return;
  g.alive = false;
  w.events.push({ type: 'kill', id: g.id, x: g.x, z: g.z, kind: g.kind, r: g.r, color: T.species[g.kind].color, big: false, boss: false, src: 'pop' });
  w.director.onKill?.(w, g, api);
}

function kill(w, g, src = 'hero') {
  if (!g.alive) return;
  g.alive = false;
  const S = T.species[g.kind], hard = w.mode === 'hardcade' || !!w.room?.hard;
  w.kills++; w.streak++;
  // HEAT (v51): the kill heats you up by how close it was, then pays at the heat
  // (1.x paid 100 × the streak, which compounded without a ceiling)
  // paid at the heat it was made at, then it heats you (v53): by how close it was, and more for
  // the kill that empties the floor; a gate's or a hazard's kill pays, but heats nothing
  const m0 = heat.mult(w);
  heat.pay(w, T.score.perKill * pickups.scoreMult(w), hard);
  heat.gain(w, heat.killHeat(w, g, src) + (src !== 'env' && heat.lull(w) ? T.heat.clear : 0));
  pickups.onKill(w, g);             // the bounty pays (1.x main.js:4436-4448)
  w.events.push({ type: 'kill', id: g.id, x: g.x, z: g.z, kind: g.kind, r: g.r, color: S.color, big: g.r >= T.death.big, boss: g.isBoss, src, m: m0 });
  if (g.isBoss) w.lastBoss = { x: g.x, z: g.z };   // where a later world's drain opens
  BEHAVIOUR[g.kind].onKill?.(w, g, api, src);
  // a big death shakes the bodies around it (1.x main.js:4517-4540) — the ones
  // alive at the kill, so never a brood still waiting out a pop, this body's or
  // another's: 1.x built that brood only when its pop ended ("newborn minnows
  // must not be vaporized by the shockwave that birthed them", main.js:4518-4529)
  if (g.r >= T.death.big) for (const o of w.gels) if (o.alive && o !== g && o.state !== 'appear' && Math.hypot(o.x - g.x, o.z - g.z) <= T.death.shockRadius) o.sqV -= T.death.shockSquash;
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
  // a HARD campaign room (v49): every corpse, from the first, under the room's own cap
  const room = !!w.room?.hard, R = room ? { ...T.revenge, ...T.revenge.room, ...(w.room.level?.hard ?? {}) } : T.revenge, S = T.species[g.kind];
  if (!(g.isBoss || S.revenge || R.who === 'all') || (!room && w.wave < R.fromWave)) return;
  let live = 0;
  for (const b of w.bullets) if (b.revenge && !b.dead) live++;
  const cap = room ? R.cap : Math.min(R.fieldCap.max, Math.round(R.fieldCap.base + w.wave * R.fieldCap.per));
  if (live >= cap || w.gelBullets >= R.poolGate) return;
  const h = w.hero, near = Math.hypot(h.x - g.x, h.z - g.z) < 0.001;
  if (room && Math.hypot(h.x - g.x, h.z - g.z) < R.near) return;
  const aim = near ? w.rngFx.range(0, Math.PI * 2) : Math.atan2(h.z - g.z, h.x - g.x);
  const opts = { speedMult: R.speedMult, color: revengeColor(g.kind), src: g.kind, revenge: true };
  const dialect = g.isBoss ? 'RING' : (S.revenge ?? 'RING');
  const dens = room && !(g.isBoss || S.revenge) ? R.others : R.density;
  const n = (c) => Math.max(1, Math.round(c * dens));
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
    if ((b.life -= dt) <= 0 || Math.abs(b.x) > HX || Math.abs(b.z) > HZ || (w.region && b.src !== 'sweep' && w.region.sdf(b.x, b.z) > 1.5)) b.dead = true;
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
      // a campaign room's ORDER: not this one's turn, so the shot is spent on it and nothing else happens
      if (g.locked) { b.dead = true; w.events.push({ type: 'block', x: b.x, z: b.z, id: g.id, by: 'locked' }); break; }
      const res = B.onHit?.(w, g, b, api);
      if (res === 'pass') continue;
      b.dead = true;
      if (res === 'block' || g.shield) { w.events.push({ type: 'block', x: b.x, z: b.z, id: g.id, by: res === 'block' ? 'plate' : 'aura' }); break; }
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
      heat.gain(w, T.heat.graze); heat.pay(w, T.graze.points * pickups.scoreMult(w), w.mode === 'hardcade' || !!w.room?.hard);   // × 2 under the pod (1.x main.js:10860), × the heat
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
