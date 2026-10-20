// world.js — the rules of a run.
//
// Plain JS: no DOM, no three.js, no clock. One fixed step at a time from a
// seed, so a run is reproducible and testable in bare node (test/sim.mjs).
// The view reads the world; it never writes it. What happened during a step
// is reported in `world.events` for the view and the sound to act on.
//
// Coordinates: the arena is centred on the origin, x across (right +), z
// toward the bottom of the screen. Its size is 1.x's, chosen per run by the
// screen's shape (TUNING.arena). Gels pop in on an ellipse inside it, as in
// 1.x, swell into being, and the arena's edges are walls.
//
// Modes: 'arcade', 'hardcade' (corpses fire back) and 'survival'.
import { TUNING } from '../tuning.js?v=4';
import { makeRng } from './rng.js?v=4';

const T = TUNING;

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

function body() { return { ex: 0, ez: 0, vex: 0, vez: 0, wy: 0, vwy: 0 }; }

// Squash along a contact normal: compress along it, bulge up. The spring
// brings it back; the view turns ex/ez/wy into the gel's shape.
function kick(b, nx, nz, amount) {
  b.vex -= amount * nx * nx * 9;
  b.vez -= amount * nz * nz * 9;
  b.vwy += amount * 5;
}

function springStep(b, dt) {
  const k = T.gel.spring, c = T.gel.damping;
  b.vex += (-k * b.ex - c * b.vex) * dt; b.ex += b.vex * dt;
  b.vez += (-k * b.ez - c * b.vez) * dt; b.ez += b.vez * dt;
  b.vwy += (-k * b.wy - c * b.vwy) * dt; b.wy += b.vwy * dt;
  b.ex = clamp(b.ex, -0.45, 0.6); b.ez = clamp(b.ez, -0.45, 0.6); b.wy = clamp(b.wy, -0.5, 0.6);
}

export function createWorld({ seed = 1, mode = 'survival', arena = T.arena.landscape } = {}) {
  return {
    seed, mode, rng: makeRng(seed), tick: 0, time: 0, over: false,
    hx: arena.hx, hz: arena.hz,
    hero: {
      x: 0, z: 0, px: 0, pz: 0, aimX: 1, aimZ: 0, faceX: 1, faceZ: 0,
      lives: T.hero.lives, mercy: 0, dash: 0, dashCd: 0, dashX: 0, dashZ: 0, dashId: 0,
      fireCd: 0, alive: true, body: body(),
    },
    gels: [], bullets: [], fuses: [],
    spawnCd: T.director.firstSpawn, nextId: 1,
    score: 0, mult: 1, combo: 0, comboT: 0, kills: 0, grazes: 0,
    nextExtend: T.score.extendEvery,
    killedBy: null,
    events: [],
  };
}

// ── one step ───────────────────────────────────────────────────────
// input: { mx, mz } move (length ≤ 1), { ax, az, aim } aim direction and
// whether the player is aiming, fire, dash (edge: true on the step it is asked)
export function step(w, input) {
  const dt = T.sim.dt;
  w.events.length = 0;
  if (w.over) return w;
  w.tick++; w.time += dt;

  const h = w.hero;
  h.px = h.x; h.pz = h.z;
  for (const g of w.gels) { g.px = g.x; g.pz = g.z; }
  for (const b of w.bullets) { b.px = b.x; b.pz = b.z; }

  heroStep(w, input, dt);
  director(w, dt);
  for (const g of w.gels) gelStep(w, g, dt);
  separate(w);
  fusesStep(w, dt);
  bulletsStep(w, dt);
  contacts(w);

  // the chain cools
  if (w.comboT > 0 && (w.comboT -= dt) <= 0) { w.combo = 0; w.mult = 1; }
  if (w.gels.some((g) => !g.alive)) w.gels = w.gels.filter((g) => g.alive);
  return w;
}

// ── the hero ───────────────────────────────────────────────────────
function heroStep(w, input, dt) {
  const h = w.hero, H = T.hero;
  if (h.mercy > 0) h.mercy -= dt;
  if (h.dashCd > 0) h.dashCd -= dt;
  springStep(h.body, dt);

  const ml = Math.hypot(input.mx, input.mz);
  if (ml > 0.05) { h.faceX = input.mx / ml; h.faceZ = input.mz / ml; }
  if (input.aim) {
    const al = Math.hypot(input.ax, input.az);
    if (al > 1e-6) { h.aimX = input.ax / al; h.aimZ = input.az / al; }
  } else if (ml > 0.05) { h.aimX = h.faceX; h.aimZ = h.faceZ; }

  // Dash: along the aim if aiming, else the way you are moving.
  if (input.dash && h.dash <= 0 && h.dashCd <= 0) {
    const dx = input.aim ? h.aimX : ml > 0.05 ? h.faceX : h.aimX;
    const dz = input.aim ? h.aimZ : ml > 0.05 ? h.faceZ : h.aimZ;
    h.dashX = dx; h.dashZ = dz; h.dash = H.dashTime; h.dashId++;
    kick(h.body, dx, dz, -0.5);                 // stretch along the dash
    w.events.push({ type: 'dash', x: h.x, z: h.z });
  }

  if (h.dash > 0) {
    h.x += h.dashX * H.dashSpeed * dt; h.z += h.dashZ * H.dashSpeed * dt;
    h.dash -= dt;
    if (h.dash <= 0) h.dashCd = H.dashCooldown;
    // the body-check: everything near is shoved, once per dash
    for (const g of w.gels) {
      if (g.state !== 'active' || g.shovedBy === h.dashId) continue;
      const dx = g.x - h.x, dz = g.z - h.z, d = Math.hypot(dx, dz) || 1e-6;
      if (d < H.shoveRadius + g.r) {
        const nx = dx / d, nz = dz / d, heavy = 0.55 / g.r;
        g.kx += nx * H.shove * heavy; g.kz += nz * H.shove * heavy;
        g.shovedBy = h.dashId;
        kick(g.body, nx, nz, T.gel.contactSquash * 1.4);
        w.events.push({ type: 'shove', x: g.x, z: g.z, id: g.id });
      }
    }
  } else if (ml > 0.01) {
    const s = H.speed * Math.min(1, ml);
    h.x += (input.mx / Math.max(ml, 1)) * s * dt; h.z += (input.mz / Math.max(ml, 1)) * s * dt;
  }

  const r = H.radius, HX = w.hx, HZ = w.hz;
  if (h.x < -HX + r) { h.x = -HX + r; kick(h.body, 1, 0, 0.12); }
  if (h.x > HX - r) { h.x = HX - r; kick(h.body, 1, 0, 0.12); }
  if (h.z < -HZ + r) { h.z = -HZ + r; kick(h.body, 0, 1, 0.12); }
  if (h.z > HZ - r) { h.z = HZ - r; kick(h.body, 0, 1, 0.12); }

  if (h.fireCd > 0) h.fireCd -= dt;
  if (input.fire && h.alive) {
    while (h.fireCd <= 0) {
      fire(w, h.x + h.aimX * (r + 0.1), h.z + h.aimZ * (r + 0.1), Math.atan2(h.aimZ, h.aimX),
        T.bullets.heroSpeed, T.bullets.heroRadius, T.bullets.heroColor, true, null);
      h.fireCd += H.fireEvery;
      w.events.push({ type: 'shot' });
    }
  } else if (h.fireCd < 0) h.fireCd = 0;
}

// ── who comes, and when ────────────────────────────────────────────
function director(w, dt) {
  const N = T.director, f = clamp(w.time / N.ramp, 0, 1);
  if ((w.spawnCd -= dt) > 0) return;
  const alive = w.gels.length;
  const max = Math.round(lerp(N.maxAlive[0], N.maxAlive[1], f));
  w.spawnCd = lerp(N.spawnEvery[0], N.spawnEvery[1], f) * w.rng.range(0.8, 1.2);
  if (alive >= max) return;
  const kind = pickSpecies(w);
  const group = Math.min(max - alive, w.rng.int(N.groupOf[0], Math.round(lerp(N.groupOf[0], N.groupOf[1], f))));
  for (let i = 0; i < group; i++) spawn(w, kind);
}

function pickSpecies(w) {
  const pool = Object.entries(T.species).filter(([, s]) => s.unlock <= w.time && s.weight > 0);
  let total = pool.reduce((a, [, s]) => a + s.weight, 0), roll = w.rng.next() * total;
  for (const [k, s] of pool) if ((roll -= s.weight) < 0) return k;
  return pool[0][0];
}

// On the ellipse at `ring` of the arena (1.x), at a random angle, and never
// near the hero: of a handful of tries, the farthest from you wins.
function spawn(w, kind) {
  const D = T.director, h = w.hero;
  let bx = 0, bz = 0, best = -1;
  for (let tries = 0; tries < 6; tries++) {
    const a = w.rng.range(0, Math.PI * 2);
    const x = Math.cos(a) * w.hx * D.ring, z = Math.sin(a) * w.hz * D.ring;
    const d = Math.hypot(x - h.x, z - h.z);
    if (d > best) { best = d; bx = x; bz = z; }
    if (d > D.clearOfHero) break;
  }
  w.gels.push(makeGel(w, kind, bx, bz, 'appear'));
  w.events.push({ type: 'spawn', x: bx, z: bz, kind });
}

function makeGel(w, kind, x, z, state) {
  const S = T.species[kind];
  return {
    id: w.nextId++, kind, x, z, px: x, pz: z,
    r: S.radius, hp: S.hp, vx: 0, vz: 0, kx: 0, kz: 0, state, t: 0, alive: true,
    fireCd: (S.fireEvery || 2) * w.rng.range(0.6, 1.1), windup: false,
    dartCd: (S.dartEvery || 2) * w.rng.range(0.5, 1), dart: 0, dartX: 0, dartZ: 0,
    faceX: 0, faceZ: 1, flash: 0, wander: w.rng.range(0, Math.PI * 2), shovedBy: -1,
    body: body(),
  };
}

// ── the gels ───────────────────────────────────────────────────────
function gelStep(w, g, dt) {
  const G = T.gel, S = T.species[g.kind], h = w.hero;
  springStep(g.body, dt);
  if (g.flash > 0) g.flash -= dt;

  if (g.state === 'appear') {
    if ((g.t += dt) >= G.appear) { g.state = 'active'; g.body.vwy -= 2.4; w.events.push({ type: 'land', x: g.x, z: g.z }); }
    return;
  }

  const dx = h.x - g.x, dz = h.z - g.z, d = Math.hypot(dx, dz) || 1e-6;
  const nx = dx / d, nz = dz / d;
  g.faceX = nx; g.faceZ = nz;
  g.wander += dt * 1.7;
  const wob = Math.sin(g.wander) * 0.35;           // a sway, so a chase is not a rail
  let tx = (nx - nz * wob) * S.speed, tz = (nz + nx * wob) * S.speed;

  if (g.kind === 'yela') {
    if (g.dart > 0) { g.dart -= dt; tx = g.dartX * S.dartSpeed; tz = g.dartZ * S.dartSpeed; }
    else if ((g.dartCd -= dt) <= 0) {
      g.dart = S.dartTime; g.dartX = nx; g.dartZ = nz; g.dartCd = S.dartEvery * w.rng.range(0.8, 1.2);
      kick(g.body, nx, nz, -0.3);
    }
  } else if (g.kind === 'spittor') {
    const k = d > S.range + 0.5 ? 1 : d < S.range - 1 ? -1 : 0;
    tx = (nx * k - nz * 0.4) * S.speed; tz = (nz * k + nx * 0.4) * S.speed;
  } else if (g.kind === 'orange') {
    const k = clamp((d - S.range) * 0.8, -1, 1);
    tx = (nx * k - nz) * S.speed; tz = (nz * k + nx) * S.speed;
  } else if (g.kind === 'fanner') {
    tx *= 0.8; tz *= 0.8;
  }

  // shooters wind up (a swell you can read), then fire
  if (S.fireEvery) {
    g.fireCd -= dt;
    if (!g.windup && g.fireCd <= S.windup) { g.windup = true; g.body.vwy += 2.2; }
    if (g.fireCd <= 0) {
      g.windup = false; g.fireCd = S.fireEvery * w.rng.range(0.85, 1.15);
      const a = Math.atan2(nz, nx), col = S.bulletColor ?? livingColor(S.color);
      const sp = T.bullets.gelSpeed;
      if (g.kind === 'spittor') fire(w, g.x, g.z, a, sp, T.bullets.gelRadius, col, false, g.kind);
      else if (g.kind === 'orange') for (const o of [-1, 0, 1]) fire(w, g.x, g.z, a + o * S.spreadDeg * Math.PI / 180, sp, T.bullets.gelRadius, col, false, g.kind);
      else if (g.kind === 'fanner') fan(w, g.x, g.z, a, S.count, S.arcDeg, sp, col, g.kind);
      kick(g.body, nx, nz, 0.2);
      w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
    }
  }

  const acc = Math.min(1, 7 * dt);
  g.vx += (tx - g.vx) * acc; g.vz += (tz - g.vz) * acc;
  const fr = Math.exp(-G.knockFriction * dt);
  g.kx *= fr; g.kz *= fr;
  g.x += (g.vx + g.kx) * dt; g.z += (g.vz + g.kz) * dt;

  // the arena's edges are walls: bodies flatten against them and bounce back
  const r = g.r, HX = w.hx, HZ = w.hz;
  if (g.x < -HX + r) { g.x = -HX + r; wall(w, g, 1, 0); }
  if (g.x > HX - r) { g.x = HX - r; wall(w, g, -1, 0); }
  if (g.z < -HZ + r) { g.z = -HZ + r; wall(w, g, 0, 1); }
  if (g.z > HZ - r) { g.z = HZ - r; wall(w, g, 0, -1); }
}

function wall(w, g, nx, nz) {
  const vn = g.kx * nx + g.kz * nz;
  if (vn < 0) { g.kx -= (1 + T.gel.wallBounce) * vn * nx; g.kz -= (1 + T.gel.wallBounce) * vn * nz; }
  const hard = Math.min(1, Math.abs(vn) / 6);
  if (hard > 0.15) { kick(g.body, nx, nz, T.gel.contactSquash * hard); w.events.push({ type: 'wall', x: g.x, z: g.z, hard }); }
}

// Soft bodies: overlapping gels push apart, heavier ones shove lighter ones,
// and each squashes along the contact. This is what makes a crowd pile.
function separate(w) {
  const gs = w.gels, k = T.gel.separation, HX = w.hx, HZ = w.hz;
  for (let i = 0; i < gs.length; i++) {
    const a = gs[i];
    if (a.state !== 'active' || !a.alive) continue;
    for (let j = i + 1; j < gs.length; j++) {
      const b = gs[j];
      if (b.state !== 'active' || !b.alive) continue;
      const dx = b.x - a.x, dz = b.z - a.z, rr = a.r + b.r;
      const d2 = dx * dx + dz * dz;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 1e-6, nx = dx / d, nz = dz / d, over = rr - d;
      const ma = a.r * a.r, mb = b.r * b.r, sa = mb / (ma + mb), sb = ma / (ma + mb);
      a.x -= nx * over * k * sa; a.z -= nz * over * k * sa;
      b.x += nx * over * k * sb; b.z += nz * over * k * sb;
      // the push runs after the curb walls, so it may not undo them
      a.x = clamp(a.x, -HX + a.r, HX - a.r); a.z = clamp(a.z, -HZ + a.r, HZ - a.r);
      b.x = clamp(b.x, -HX + b.r, HX - b.r); b.z = clamp(b.z, -HZ + b.r, HZ - b.r);
      const rel = (b.kx - a.kx) * nx + (b.kz - a.kz) * nz;   // closing knock speed
      if (rel < 0) { a.kx += nx * rel * sa; a.kz += nz * rel * sa; b.kx -= nx * rel * sb; b.kz -= nz * rel * sb; }
      const sq = Math.min(0.25, over / rr) * T.gel.contactSquash;
      kick(a.body, nx, nz, sq); kick(b.body, nx, nz, sq);
    }
  }
}

// ── bullets ────────────────────────────────────────────────────────
function fire(w, x, z, angle, speed, radius, color, hero, src) {
  if (w.bullets.length >= T.bullets.max) return;
  w.bullets.push({ x, z, px: x, pz: z, vx: Math.cos(angle) * speed, vz: Math.sin(angle) * speed, r: radius, life: T.bullets.life, hero, color, src, grazed: false, dead: false });
}

function fan(w, x, z, a, count, arcDeg, speed, color, src) {
  const arc = arcDeg * Math.PI / 180;
  for (let i = 0; i < count; i++) fire(w, x, z, a - arc / 2 + (count > 1 ? (arc * i) / (count - 1) : arc / 2), speed, T.bullets.gelRadius, color, false, src);
}

function bulletsStep(w, dt) {
  const h = w.hero, HX = w.hx, HZ = w.hz;
  for (const b of w.bullets) {
    b.x += b.vx * dt; b.z += b.vz * dt;
    if ((b.life -= dt) <= 0 || Math.abs(b.x) > HX + 1.5 || Math.abs(b.z) > HZ + 1.5) { b.dead = true; continue; }
    if (b.hero) {
      for (const g of w.gels) {
        if (!g.alive || g.state !== 'active') continue;
        const dx = g.x - b.x, dz = g.z - b.z, rr = g.r + b.r;
        if (dx * dx + dz * dz > rr * rr) continue;
        b.dead = true;
        const l = Math.hypot(b.vx, b.vz) || 1, nx = b.vx / l, nz = b.vz / l;
        g.kx += nx * T.gel.hitKnock * (0.55 / g.r); g.kz += nz * T.gel.hitKnock * (0.55 / g.r);
        g.flash = 0.08;
        kick(g.body, nx, nz, T.gel.contactSquash * 0.6);
        g.hp -= T.bullets.heroDamage;
        w.events.push({ type: 'hit', x: b.x, z: b.z, id: g.id, nx, nz });
        if (g.hp <= 0) kill(w, g);
        break;
      }
    } else if (h.alive) {
      const dx = h.x - b.x, dz = h.z - b.z, d = Math.hypot(dx, dz);
      if (d < T.hero.hitRadius + b.r) {
        if (h.mercy <= 0 && h.dash <= 0) { b.dead = true; hurt(w, b.src); }
      } else if (!b.grazed && d < T.graze.radius) {
        b.grazed = true; w.grazes++;
        w.score += T.graze.points * w.mult;
        if (w.comboT > 0) w.comboT = Math.max(w.comboT, T.score.comboWindow * 0.5);
        w.events.push({ type: 'graze', x: b.x, z: b.z });
        checkExtend(w);
      }
    }
  }
  if (w.bullets.some((b) => b.dead)) w.bullets = w.bullets.filter((b) => !b.dead);
}

function contacts(w) {
  const h = w.hero;
  if (!h.alive) return;
  for (const g of w.gels) {
    if (!g.alive || g.state !== 'active') continue;
    const dx = g.x - h.x, dz = g.z - h.z, d = Math.hypot(dx, dz) || 1e-6;
    if (d > g.r + T.hero.radius * 0.8) continue;
    if (h.mercy <= 0 && h.dash <= 0) {
      hurt(w, g.kind);
      g.kx += (dx / d) * 6; g.kz += (dz / d) * 6;
      kick(g.body, dx / d, dz / d, T.gel.contactSquash);
    }
  }
}

function hurt(w, by) {
  const h = w.hero;
  h.lives--; h.mercy = T.hero.mercy;
  w.combo = 0; w.mult = 1; w.comboT = 0;
  w.killedBy = by;
  kick(h.body, 0, 0, 0); h.body.vwy -= 4;
  // a breath: gel bullets close to you are cleared
  for (const b of w.bullets) if (!b.hero && Math.hypot(b.x - h.x, b.z - h.z) < 3) b.dead = true;
  w.events.push({ type: 'hurt', x: h.x, z: h.z, by, lives: h.lives });
  if (h.lives <= 0) {
    h.alive = false; w.over = true;
    w.events.push({ type: 'over', score: w.score, by });
  }
}

function kill(w, g) {
  if (!g.alive) return;
  g.alive = false;
  const S = T.species[g.kind], hard = w.mode === 'hardcade';
  w.combo++; w.comboT = T.score.comboWindow;
  w.mult = Math.min(T.score.maxMult, 1 + Math.floor(w.combo / T.score.comboStep));
  w.score += Math.round(S.score * w.mult * (hard ? T.revenge.scoreMult : 1));
  w.kills++;
  w.events.push({ type: 'kill', id: g.id, x: g.x, z: g.z, kind: g.kind, r: g.r, color: S.color });
  if (S.children) {
    for (let i = 0; i < S.children; i++) {
      const a = (i / S.children) * Math.PI * 2 + w.rng.range(0, 1);
      const c = makeGel(w, S.childKind, g.x + Math.cos(a) * 0.4, g.z + Math.sin(a) * 0.4, 'active');
      c.kx = Math.cos(a) * 6; c.kz = Math.sin(a) * 6;
      w.gels.push(c);
    }
  }
  if (hard) { w.fuses.push({ x: g.x, z: g.z, kind: g.kind, t: T.revenge.fuse }); w.events.push({ type: 'fuse', x: g.x, z: g.z, kind: g.kind }); }
  checkExtend(w);
}

// HARDCADE: the corpse fires back in its species' dialect, slower, darker —
// after a fuse you can see, and never from on top of you. Fired from the
// centre of a gel killed at point-blank, a ring lands the instant it exists:
// the first cut did exactly that and a bot lasted twelve seconds. Revenge is
// meant to be the graze game, not a wall (1.x v220).
function fusesStep(w, dt) {
  if (!w.fuses.length) return;
  for (const f of w.fuses) if ((f.t -= dt) <= 0) revenge(w, f);
  w.fuses = w.fuses.filter((f) => f.t > 0);
}

function revenge(w, f) {
  const R = T.revenge, h = w.hero, S = T.species[f.kind], sp = T.bullets.gelSpeed * R.speedMult;
  const col = corpseColor(S.color), a = Math.atan2(h.z - f.z, h.x - f.x);
  const before = w.bullets.length;
  if (S.revenge === 'aimed') {
    for (let i = 0; i < R.aimed.count; i++) fire(w, f.x, f.z, a, sp * (1 - i * 0.14), T.bullets.gelRadius, col, false, f.kind);
  } else if (S.revenge === 'fan') fan(w, f.x, f.z, a, R.fan.count, R.fan.arcDeg, sp, col, f.kind);
  // a ring is for grazing: rotated half a step so you stand in a gap, not on a bullet
  else for (let i = 0; i < R.ring.count; i++) fire(w, f.x, f.z, a + ((i + 0.5) / R.ring.count) * Math.PI * 2, sp, T.bullets.gelRadius, col, false, f.kind);
  // too close to fire at all: the corpse spends itself harmlessly
  if (Math.hypot(h.x - f.x, h.z - f.z) < R.safeRadius) w.bullets.length = before;
  else w.events.push({ type: 'revenge', x: f.x, z: f.z, kind: f.kind });
}

function checkExtend(w) {
  while (w.score >= w.nextExtend) {
    w.nextExtend += T.score.extendEvery;
    if (w.hero.lives < T.score.maxLives) { w.hero.lives++; w.events.push({ type: 'extend', lives: w.hero.lives }); }
  }
}

// colour helpers (numbers in, numbers out — the view turns them into colours)
function mixHex(a, b, t) {
  const ch = (c, s) => (c >> s) & 255;
  const m = (s) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * t) << s;
  return m(16) | m(8) | m(0);
}
export const livingColor = (c) => mixHex(c, 0xffffff, 0.35);
export const corpseColor = (c) => mixHex(c, 0x000000, T.revenge.darken);
