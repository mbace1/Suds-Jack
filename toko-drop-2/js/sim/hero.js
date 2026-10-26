// hero.js — the hero: moving, aiming, dashing, firing, being hit.
//
// 1.x's hero (js/player.js at v268, with the dash and hit wiring of main.js),
// held to docs/port-1x/player-controls.md. Every timer is 1.x's per-frame
// one, ticked once per 60 Hz step in 1.x's order, so the frame-quantised
// feel ports exactly rather than through a continuous rewrite:
//
//   1. the dash press (1.x's onDash runs before player.update: §2)
//   2. tick the timers: dash cooldown, gun, pickups, flash
//   3. EITHER the dash moves you OR you walk (never both)
//   4. mercy, the squash spring, the clamp, the stretch
//   5. the gun, from where the clamp left you
//   6. this game's dash upgrades (kill, boom), after the move as 1.x's dash
//      boom was (main.js:10216-10225), or the PUSH dash's shove in its place
//
// Input (world axes): { mx, mz } the move stick, analog, length ≤ 1;
// { ax, az } the aim and `aim` whether it points anywhere; `fire` the
// trigger; `dash` an edge on the step it is asked: true for 1.x's own dash
// (a button), or a flick { kind: 'flick', sL, sV, dx, dz } (input.js, the
// direction in world axes) for one as long and as fast as the flick was
// (dashPlan). 1.x fires only
// while the aim is valid AND the trigger is held: a touch or pad aim stick is
// both at once, a mouse aims all the time and fires only while held.
import { TUNING } from '../tuning.js?v=49';
import { BEHAVIOUR } from './species/index.js?v=49';   // read at run time only (a species' hitTest)
import { slip } from './rules.js?v=49';   // THE FOAM's slick floor

const T = TUNING, H = T.hero, L = T.heroLook;

export function makeHero() {
  return {
    x: 0, z: 0, px: 0, pz: 0, velX: 0, velZ: 0,
    // 1.x _lastAim: the direction of the last SHOT, never of the stick or the
    // cursor alone (player.js:401). The eyes face it; a still dash takes it.
    aimX: H.aim0[0], aimZ: H.aim0[1],
    lives: H.lives, alive: true,
    mercy: 0, flash: 0,          // 1.x _mercyT, _flashT
    invinc: 0, rapid: 0,         // 1.x _invincBoost, _fireRateBoost: the pickups' timers
    dash: 0, dashCd: 0, dashX: 0, dashZ: 0, dashId: 0, ghostT: 0,
    // a flick dash in flight (dashPlan): its speed (0 = 1.x's dash), the
    // distance still to go, the cooldown it ends on, and its speed against
    // 1.x's, which scales what it does to the bodies it meets
    dashV: 0, dashLeft: 0, dashCdNext: 0, dashK: 1,
    fireCd: 0,                   // 1.x _fireT
    sq: 1, sqV: 0,
    stretch: 0, stretchX: 0, stretchZ: 1, sVelX: 0, sVelZ: 0, sPrevX: 0, sPrevZ: 0, sSeen: false,
    dashLevel: 0,                // 0: 1.x's dash; 1: it kills what it passes through; 2: and a boom
    // 1.x _weaponMode: null is the bare gun (SINGLE); a pod is { fam, level },
    // fam one of H.weapons' families. equipWeapon() is how a pickup gives one.
    weapon: null,
    burst: [],                   // 1.x _burstQueue: a BURST's rounds still owed, { t, dx, dz }
    pullX: 0, pullZ: 0,          // MAGNA and friends add here; applied after the bodies move
    sink: 0, fall: 0,            // between worlds (worlds.js): down the hole 0 → 1, then dropping in 1 → 0
  };
}

// 1.x `invincible` (player.js:166-169): a dash, mercy, or the pickup
export const invincible = (h) => h.dash > 0 || h.mercy > 0 || h.invinc > 0;

export function heroStep(w, input, dt, api) {
  const h = w.hero;
  if (!h.alive) return;
  // 1.x's move is the stick as it is (input.js:170-191): a long one is
  // renormalised, a short one walks — and dashes — short
  let mx = input.mx || 0, mz = input.mz || 0;
  const ml = Math.hypot(mx, mz);
  if (ml > 1) { mx /= ml; mz /= ml; }

  // 1. the press (player.js:244-253): dropped while dashing or cooling down
  let started = false;
  if (input.dash && h.dash <= 0 && h.dashCd <= 0) {
    const g = typeof input.dash === 'object' ? input.dash : null, plan = g ? dashPlan(g) : null;
    // a flick goes where it was flicked, its full length. A button goes
    // where you are walking; only with no move at all, the last shot's way
    // (main.js:9156-9158). Not normalised: half a stick, half a dash.
    let dx = h.aimX, dz = h.aimZ;
    const gl = g ? Math.hypot(g.dx || 0, g.dz || 0) : 0;
    if (gl > 1e-9) { dx = g.dx / gl; dz = g.dz / gl; }
    else if (mx !== 0 || mz !== 0) {
      const l = Math.hypot(mx, mz);
      dx = H.dashNormalise || plan ? mx / l : mx; dz = H.dashNormalise || plan ? mz / l : mz;
    }
    h.dashX = dx; h.dashZ = dz; h.ghostT = 0; h.dashId++;
    if (plan) {
      h.dashV = plan.v; h.dashLeft = plan.d; h.dashCdNext = plan.cd; h.dashK = plan.v / H.flick.vStd;
      h.dash = plan.steps * dt - dt / 2;           // > 0 through exactly plan.steps steps: the i-frames
      h.sqV += H.sq.dash * clampTo(h.dashK, H.flick.squash);
    } else {
      h.dashV = 0; h.dashK = 1; h.dash = H.dashTime;
      h.sqV += H.sq.dash;
    }
    started = true;
    w.events.push({ type: 'dash', x: h.x, z: h.z, dx, dz, level: h.dashLevel, kind: g ? g.kind : 'button', d: plan?.d, v: plan?.v, steps: plan?.steps });
  }

  // 2. timers (player.js:260-268)
  if (h.dashCd > 0) h.dashCd -= dt;
  if (h.fireCd > 0) h.fireCd -= dt;
  if (h.invinc > 0) h.invinc -= dt;
  if (h.rapid > 0) h.rapid -= dt;
  if (h.flash > 0) h.flash -= dt;

  // 3. the dash, or the walk (player.js:275-323)
  const dashing = h.dash > 0;
  if (dashing) {
    h.dash -= dt;
    if (h.dashV > 0) {
      // a flick dash: exactly its distance, the last step moving what is left
      const m = Math.min(h.dashLeft, h.dashV * dt);
      h.x += h.dashX * m; h.z += h.dashZ * m; h.dashLeft -= m;
    } else { h.x += h.dashX * H.dashSpeed * dt; h.z += h.dashZ * H.dashSpeed * dt; }
    // a ghost where the dash has got to (before the clamp, as 1.x copied it)
    if ((h.ghostT -= dt) <= 0) { h.ghostT = L.ghost.every; w.events.push({ type: 'ghost', x: h.x, z: h.z, k: h.dashK }); }
    if (h.dash <= 0) h.dashCd = h.dashV > 0 ? h.dashCdNext : H.dashCooldown;
  } else {
    // no acceleration: the stick is the velocity, even through mercy — but
    // on THE FOAM's slick floor the stick is where you accelerate (sim/rules.js)
    if (!slip(w, mx, mz, H.speed, dt)) { h.x += mx * H.speed * dt; h.z += mz * H.speed * dt; }
  }

  // 4. mercy (player.js:326-333), the squash spring (362-365), the clamp (367-369)
  if (h.mercy > 0) h.mercy -= dt;
  h.sqV = (h.sqV - (h.sq - 1) * H.sq.spring) * H.sq.damp;
  h.sq = Math.max(H.sq.min, Math.min(H.sq.max, h.sq + h.sqV));
  clampHero(w);
  stretch(h, dt);

  // 5. a BURST's rounds still owed (player.js:387-397): each one from where
  // you are now, along the line its volley was fired on
  for (let i = h.burst.length - 1; i >= 0; i--) {
    const q = h.burst[i];
    if ((q.t -= dt) > 0) continue;
    shoot(w, h, q.dx, q.dz, 0, api);
    w.events.push({ type: 'shot', x: h.x, z: h.z, dx: q.dx, dz: q.dz, round: true });
    h.burst.splice(i, 1);
  }

  // 6. the gun (player.js:399-475): the timer is ASSIGNED, so the period is
  // whole steps (0.09 s → 6 steps, 10/s at 60 Hz), and it fires through a
  // dash and through mercy. A trigger let go keeps its timer running. With a
  // pod (h.weapon) the volley is its family's and the period × its rate.
  const al = Math.hypot(input.ax || 0, input.az || 0);
  // a campaign room may take the gun away, or count its shots (sim/challenge.js)
  const gun = w.gun, armed = !gun || (!gun.off && gun.ammo > 0);
  if (armed && input.fire && input.aim && al > 1e-9 && h.fireCd <= 0) {
    if (gun && gun.ammo !== Infinity) { gun.ammo--; if (gun.ammo <= 0) w.events.push({ type: 'dry' }); }
    const ax = input.ax / al, az = input.az / al;
    h.aimX = ax; h.aimZ = az;
    const fam = h.weapon ? H.weapons[h.weapon.fam][h.weapon.level >= 2 ? 'l2' : 'l1'] : null;
    const base = H.fireEvery * (h.rapid > 0 ? H.rapidMult : 1);
    volley(w, h, ax, az, fam, base, api);
    h.fireCd = base * (fam?.rate ?? 1);
    const m = H.radius + L.muzzle.offset;
    w.events.push({ type: 'shot', x: h.x + ax * m, z: h.z + az * m, dx: ax, dz: az });
  }

  // 7. dash level 1: the dash kills what it passes through (a boss takes
  // one hit a dash). Each body is cut once a dash. Touching is the hero's
  // circle against the body as the species' own hitTest sees it (a long body
  // is touched along its length, as 1.x's one body-cutting dash asked
  // e.touches(): main.js:10166-10168), else centre to centre. The bodies are
  // the ones standing when the cut starts: one a cut brings into being is
  // judged from the next step, as world.js steps a snapshot of them.
  //
  // The CUT dash (owner, 2026-10-22: "likely we want dashes that go through
  // and do damage in the end") is the same cut from level 0, as damage:
  // every body it passes takes TUNING.hero.cut.hits, a boss's included; from
  // level 1 it kills what is not a boss outright, as PASS does.
  const cutting = w.dashMode === 'cut';
  if (dashing && w.dashMode === 'push') shove(w, h, api);
  else if (dashing && (h.dashLevel >= 1 || cutting)) {
    const R = H.dashKill.reach;
    for (const g of w.gels.slice()) {
      if (g.state !== 'active' || !g.alive || g.dashedBy === h.dashId || g.locked) continue;
      const B = BEHAVIOUR[g.kind];
      if (!(B?.hitTest ? B.hitTest(w, g, h.x, h.z, R) : Math.hypot(g.x - h.x, g.z - h.z) < g.r + R)) continue;
      g.dashedBy = h.dashId;
      w.events.push({ type: 'dashCut', x: g.x, z: g.z, id: g.id });
      if (!g.isBoss && h.dashLevel >= 1) { api.kill(w, g, 'dash'); continue; }
      // a boss takes it as one of the hero's hits (a CUT, as its hits): the
      // flash, the squash, and the hit event (the ripple from the side the
      // hero came through, the sound) that world.js heroBulletsHit sends for a bullet
      g.hp -= cutting ? cutHits(h) : H.dashKill.bossHits; g.flash = T.gel.flash; g.sqV += T.gel.sq.hit;
      w.events.push({ type: 'hit', x: h.x, z: h.z, id: g.id, kind: g.kind });
      if (g.hp <= 0) api.kill(w, g, 'dash');
    }
  }
  // dash level 2: 1.x's dash boom, a ring from where the first dash step
  // left you, in its own orange (main.js:10216-10225)
  if (started && h.dashLevel >= 2) {
    const B = H.dashBoom;
    for (let i = 0; i < B.count; i++) {
      const a = (i / B.count) * Math.PI * 2;
      bullet(w, h, h.x, h.z, Math.cos(a), Math.sin(a), B.color, api);
    }
    w.events.push({ type: 'dashBoom', x: h.x, z: h.z, shake: B.shake });
  }
}

const clampTo = (x, [a, b]) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const STD_D = 26 * 11 / 60;    // 1.x's dash: 11 steps at 26 u/s, 4.77 u

// What a flick is worth (TUNING.hero.flick): its length sL → the distance,
// its speed sV → the speed, each 0..1. The strengths are quantised to 1/256
// first, so a replay (or the Godot port) carrying them reproduces the dash
// exactly; the rest is plain arithmetic on them.
export function dashPlan(g) {
  const F = H.flick, dt = T.sim.dt;
  const q = (x) => Math.round(Math.max(0, Math.min(1, x || 0)) * 256) / 256;
  const d = lerp(F.d[0], F.d[1], Math.pow(q(g.sL), F.dPow));
  let v = lerp(F.v[0], F.v[1], Math.pow(q(g.sV), F.vPow));
  let steps = Math.ceil(d / (v * dt) - 1e-6);
  const s = clampTo(steps, F.steps);
  if (s !== steps) { steps = s; v = d / (steps * dt); }
  const cd = Math.max(F.cooldown.min, F.cooldown.at + F.cooldown.perU * (d - STD_D));
  return { d, v, steps, cd };
}

// The CUT's hits (owner, 2026-10-23: a faster dash cuts deeper): 1.x's
// button dash takes cut.hits, a flick that many × its speed against 1.x's
const cutHits = (h) => (h.dashV > 0 ? clampTo(Math.round(H.cut.hits * h.dashK), H.flick.cut) : H.cut.hits);

// The PUSH dash (TUNING.hero.push): every body whose edge is within reach of
// the dashing hero is knocked straight away from it, once a dash, harder the
// smaller it is. Planted bodies (ANCHORED, the FIXED role) stand. From dash
// level 1 the shove is also a hit, a boss's included.
function shove(w, h, api) {
  const P = H.push;
  for (const g of w.gels.slice()) {
    if (g.state !== 'active' || !g.alive || g.anchored || (!P.plough && g.shovedBy === h.dashId)) continue;
    if (T.species[g.kind].role === 'FIXED') continue;
    let dx = g.x - h.x, dz = g.z - h.z, d = Math.hypot(dx, dz);
    if (d >= P.reach + g.r) continue;
    if (d < 1e-6) { dx = h.dashX; dz = h.dashZ; d = Math.hypot(dx, dz) || 1; }
    const nx = dx / d, nz = dz / d, want = P.force * P.heavy / g.r * (h.dashV > 0 ? clampTo(h.dashK, H.flick.push) : 1);
    if (P.plough) {
      // every step it is in reach, it is kept moving away at least this fast
      const along = g.kx * nx + g.kz * nz;
      if (along < want) { g.kx += nx * (want - along); g.kz += nz * (want - along); }
      if (g.shovedBy === h.dashId) continue;
    } else { g.kx += nx * want; g.kz += nz * want; }
    g.shovedBy = h.dashId;
    g.sqV += P.squash;
    w.events.push({ type: 'shove', x: g.x, z: g.z, id: g.id, kind: g.kind });
    if (h.dashLevel >= 1) {
      g.hp -= P.hurt; g.flash = T.gel.flash; g.sqV += T.gel.sq.hit;
      w.events.push({ type: 'hit', x: h.x, z: h.z, id: g.id, kind: g.kind });
      if (g.hp <= 0) api.kill(w, g, 'dash');
    }
  }
}

// One hero bullet along (dx, dz), a unit vector. While a LASER is held every
// hero bullet pierces (1.x set one global flag, BULLET_CONFIG.playerWeaponPierce,
// main.js:2075-2076, read for every player bullet at main.js:10644), so the
// bullet carries `pierce` for world.js to honour.
function bullet(w, h, x, z, dx, dz, color, api) {
  const n = w.bullets.length;
  api.heroBullet(w, x, z, Math.atan2(dz, dx));
  const b = w.bullets.length > n ? w.bullets[n] : null;
  if (!b) return;                   // the hero's pool is full
  if (color != null) b.color = color;
  if (h.weapon?.fam === 'laser') b.pierce = true;
}

// a shot from the muzzle, radius + 0.3 out along (dx, dz) (player.js:391-393,
// 402-403), `side` u to its left (a LASER L2 rail: player.js:446-449)
function shoot(w, h, dx, dz, side, api) {
  const o = H.radius + H.muzzle;
  bullet(w, h, h.x + dx * o - dz * side, h.z + dz * o + dx * side, dx, dz, null, api);
}

// what one pull of the trigger fires (player.js:404-464); `fam` is the pod's
// level row of H.weapons, or null for the bare gun
function volley(w, h, ax, az, fam, base, api) {
  const rot = (a) => { const c = Math.cos(a), s = Math.sin(a); return [ax * c - az * s, ax * s + az * c]; };
  const kind = h.weapon?.fam;
  if (kind === 'shotgun') {
    // pellets across the arc: (i − (n−1)/2) · (spread / (n−1)) · 2 (player.js:421-425)
    const n = fam.pellets;
    for (let i = 0; i < n; i++) shoot(w, h, ...rot((i - (n - 1) / 2) * (fam.spread / Math.max(1, n - 1)) * 2), 0, api);
  } else if (kind === 'spread') {
    // a fan of `shots`, π/step apart (player.js:428-433)
    const half = (fam.shots - 1) / 2;
    for (let i = 0; i < fam.shots; i++) shoot(w, h, ...rot((i - half) * (Math.PI / fam.step)), 0, api);
  } else if (kind === 'burst') {
    // one round now and the rest owed inside the same cycle, on the line it
    // was fired (player.js:436-441)
    shoot(w, h, ax, az, 0, api);
    const gap = (base * fam.rate) / fam.rounds;
    for (let i = 1; i < fam.rounds; i++) h.burst.push({ t: gap * i, dx: ax, dz: az });
  } else if (kind === 'laser' && (fam.rails ?? 1) > 1) {
    // level 2 is a second RAIL, ±railGap across the shot (player.js:446-449)
    shoot(w, h, ax, az, fam.railGap, api); shoot(w, h, ax, az, -fam.railGap, api);
  } else {
    shoot(w, h, ax, az, 0, api);    // the bare gun, RAPID, LASER L1 (player.js:451, 460-463)
  }
}

// A pod picked up (1.x equipWeapon, main.js:2058-2079): it always lands at
// level 1, and the same family picked up again at level 1 takes it to
// level 2. As 1.x wrote it, ANY other pick lands at level 1 — a different
// family, and also the same family picked up while already at level 2
// (held.level === 1 is part of the upgrade test, main.js:2065). Returns the
// level now held.
export function equipWeapon(w, fam) {
  const h = w.hero;
  if (!H.weapons[fam]) return 0;
  const level = h.weapon && h.weapon.fam === fam && h.weapon.level === 1 ? 2 : 1;
  h.weapon = { fam, level };
  w.events.push({ type: 'weapon', fam, level, up: level === 2 });
  return level;
}

// 1.x's lunge (player.js:371-385), per step from the post-clamp position:
// a velocity smoothed off the position delta (so pushes count), a target
// stretch from its speed, eased toward
function stretch(h, dt) {
  const S = L.stretch;
  if (!h.sSeen) { h.sPrevX = h.px; h.sPrevZ = h.pz; h.sSeen = true; }   // a hero placed before its first step does not lunge
  const ivx = (h.x - h.sPrevX) / dt, ivz = (h.z - h.sPrevZ) / dt;
  h.sPrevX = h.x; h.sPrevZ = h.z;
  h.sVelX += (ivx - h.sVelX) * S.vel; h.sVelZ += (ivz - h.sVelZ) * S.vel;
  const sp = Math.hypot(h.sVelX, h.sVelZ);
  h.stretch += (Math.min(sp * S.perSpeed, S.max) - h.stretch) * S.ease;
  if (sp > S.minSpeed) { h.stretchX = h.sVelX / sp; h.stretchZ = h.sVelZ / sp; }
}

// 1.x's pickup timers (player.js:177-178): each takes the LONGER of what it
// has and what it is given, so two pickups in a row do not add up. The
// invincibility pickup is i-frames with no blink (invincible() reads it); the
// fire-rate one multiplies the gun's period by H.rapidMult while it runs.
export const grantInvincibility = (w, t = H.pickup.invincible) => { w.hero.invinc = Math.max(w.hero.invinc, t); };
export const grantRapid = (w, t = H.pickup.rapid) => { w.hero.rapid = Math.max(w.hero.rapid, t); };

// what the bodies added to the hero this step (MAGNA's pull), applied after
// they moved
export function applyPull(w) {
  const h = w.hero;
  if (h.pullX || h.pullZ) { h.x += h.pullX; h.z += h.pullZ; h.pullX = h.pullZ = 0; clampHero(w); }
}

// the arena's walls: a hard clamp, sliding along them (arena.js:48-53)
export function clampHero(w) {
  const h = w.hero, r = H.radius;
  h.x = Math.max(-w.hx + r, Math.min(w.hx - r, h.x));
  h.z = Math.max(-w.hz + r, Math.min(w.hz - r, h.z));
  // a campaign room's region (sim/shape.js), when it is not a rectangle
  if (w.region && !w.region.contains(h.x, h.z, r)) { const p = w.region.clamp(h.x, h.z, r, _rp); h.x = p.x; h.z = p.z; }
}
const _rp = { x: 0, z: 0 };

// One hit on the hero (a bullet, a body, a hazard, a lob): 1.x hit() and
// tryHitPlayer (player.js:234-242, main.js:4789-4816). Nothing lands while
// invincible. `by` names the species for the results screen. Returns true
// when it was the last life.
export function hurtHero(w, by) {
  const h = w.hero;
  if (!h.alive || invincible(h)) return false;
  h.lives--;
  w.streak = 0;                     // 1.x: the streak resets only on a hit, the fatal one too
  w.killedBy = by;                  // the last one to land is what got you (main.js:4810)
  w.hits = (w.hits || 0) + 1;       // a campaign room grades on it (sim/director/campaign.js)
  w.events.push({ type: 'hurt', x: h.x, z: h.z, by, lives: h.lives });
  // a hit knocks a level-2 pod down to level 1, never off (weaponTakeHit,
  // main.js:2083-2091, called from tryHitPlayer at main.js:4801)
  if (H.weapons.hitCostsLevel && h.weapon?.level >= 2) {
    h.weapon = { fam: h.weapon.fam, level: 1 };
    w.events.push({ type: 'weapon', fam: h.weapon.fam, level: 1, down: true });
  }
  // and the dash the same way: level 2 down to 1, never below 1
  // (TUNING.hero.dashUpgrade.loseOnHit; the levels come from the convoy's DASH pod)
  if (H.dashUpgrade.loseOnHit && h.dashLevel >= 2) {
    h.dashLevel = 1;
    w.events.push({ type: 'dashLevel', level: 1, down: true });
  }
  if (h.lives <= 0) {
    // 1.x die(): the hero just goes — no flash, no mercy, no squash
    h.alive = false; w.over = true;
    w.events.push({ type: 'over', score: w.score, by });
    return true;
  }
  h.flash = H.flash; h.mercy = H.mercy;
  h.dash = 0;                       // 1.x cancels the dash (never live: a dash is invincible)
  h.sqV += H.sq.hit;
  return false;
}
