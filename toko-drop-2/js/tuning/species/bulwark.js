// bulwark.js — BULWARK: its numbers. The 1.x CFG row (1.x enemy.js:596),
// melee flag (1.x main.js:2410-2420), movement role (1.x tuning.js:300-316)
// and revenge dialect (1.x tuning.js:496-513), then the plate walker's own
// numbers (v140: enemy.js:1149-1158, 1793-1817, 3010; main.js:10683-10700).
// Contract: docs/SIM_CONTRACT.md.
export default {
  name: 'BULWARK',
  family: 'blob',          // 1.x BLOB_TYPES (enemy.js:644-648): the default gel dome and TUNING.blob.shape (enemy.js:801-806)
  radius: 0.9,
  hp: 4,
  speed: 1.5,
  color: 0x7f93c4,
  bulletColor: null,
  fireInterval: null,      // it never fires (enemy.js:596; it has no _tick branch)
  contact: true,           // touching it hurts in classic (1.x MELEE_TYPES, main.js:2412)
  role: 'MASS',            // swarm-force profile (1.x tuning.js:307)
  revenge: null,           // not a biter (1.x tuning.js:496-497)

  // ── the walk (enemy.js:1793-1806) ──────────────────────────────────
  // Plate-first advance: straight at the hero at its own speed (1.x `spd`,
  // enemy.js:1697-1698: CFG speed × _speedMult × the SIREN surge — api.speed)
  // until it is this close, then it holds (dist > 1.3 walks, enemy.js:1797).
  // Not ported: the boss enrage's × 1.45 in `spd` (enemy.js:1699): a BULWARK
  // is never a boss in classic (the arcade's bosses are OMEGA and the TWIN
  // PRISMS, js/sim/director/arcade.js).
  holdAt: 1.3,
  // dist = hypot(toHero) || 0.001 (enemy.js:1682): on top of you it stands
  distFloor: 0.001,
  // The facing chases the hero's direction: face += (toHero − face) ×
  // min(1, turnRate × dt) every step, then normalised (enemy.js:1800-1806),
  // walking or holding — it is outside the walk's `if`. A lerp, not a fixed
  // rad/s (the v140 log calls it "2.2 rad/s"; the code is this), so a quick
  // side-step stays a real answer. It starts facing +z, toward the bottom of
  // the screen (enemy.js:1157) — the core spawns every body with faceX 0,
  // faceZ 1, which is the same.
  turnRate: 2.2,

  // ── the block (main.js:10683-10700) ────────────────────────────────
  // A hero bullet touching the body (the plain circle, |b − e| < br + radius:
  // main.js:10648-10652) whose direction from the centre lies inside the
  // front arc — dot(unit(bullet − body), face) > blockDot, i.e. strictly
  // inside ±60° of the facing — is spent with no damage, even a piercing one
  // (main.js:10684, 10690-10691). It is tested before a WARDEN's aura
  // (main.js:10703), so a plate shot is the plate's, aura or no aura. 1.x
  // moves every body before it tests a bullet, so the arc is the facing this
  // step turned to (enemy.update, then main.js:10636).
  blockDot: 0.5,

  // ── the plate: the tell IS the hitbox arc (enemy.js:1149-1158) ─────
  plate: {
    size: [1.7, 1.15, 0.16],   // BoxGeometry(1.7, 1.15, 0.16): width, height, depth (enemy.js:1154)
    color: 0xc7d4f2,           // MeshBasicMaterial, unlit pale steel (enemy.js:1155)
    y: 0.6,                    // centre height above the floor (enemy.js:1156, 1810)
    gap: 0.25,                 // it hovers at radius × radiusMult + 0.25 along the facing (enemy.js:1808)
    // steel glint: opacity 0.75 + 0.2·|sin(2.2·_wobbleT)| (enemy.js:1814),
    // _wobbleT starting anywhere in [0, 2π) (enemy.js:668)
    glintBase: 0.75, glintAmp: 0.2, glintHz: 2.2,
  },

  // ── a blocked shot: steel sparks (main.js:10695-10698), flying on the
  // goo chunk pool's physics (main.js:1349-1394). Three droplets thrown back
  // along the hit, from the bullet at the body's mid-height + 0.15.
  spark: {
    count: 3,                  // main.js:10695
    color: 0xc7d4f2,           // main.js:10698
    size: 0.08,                // main.js:10698
    spread: 1.6,               // atan2(hit) + (rand − 0.5) × 1.6 (main.js:10696)
    speed: 4,                  // cos/sin(a) × 4 (main.js:10698)
    up: [2, 4],                // vy = 2 + rand × 2 (main.js:10698)
    lift: 0.15,                // y = e.fxY + 0.15; a BLOB_TYPE's fxY is its radius × the elite's 1.2 (main.js:10697, enemy.js:1468-1470, 1479)
    life: 1.4,                 // main.js:1353
    gravity: 14,               // main.js:1373
    floorAt: 0.01,             // it lands once y ≤ 0.01 while falling, and sits at y 0 (main.js:1377-1378)
    floorKeep: 0.35,           // horizontal speed kept on landing (main.js:1380)
    landSquash: 0.4,           // sqV −= |vy| × 0.4 on landing (main.js:1379)
    spring: 0.32, damp: 0.80,  // squash spring, per 60 Hz frame (main.js:1383)
    sqMin: 0.55, sqMax: 1.4,   // main.js:1384
    sxFloor: 0.1,              // width 1/√max(sq, 0.1) (main.js:1386)
    shrink: 0.3,               // shrinks to nothing over its last 0.3 s (main.js:1387)
    // 2.0: 1.x drew these from its shared 384-droplet goo pool (main.js:1284,
    // 2436: SphereGeometry(1, 9, 7)), reusing the slot with the least life
    // when full (main.js:1342-1347); this pool is the BULWARKs' own, shared
    // by every BULWARK in the scene, and like 1.x's it outlives the body
    pool: 96,
    // 2.0: the sim keeps the last `log` blocks per body (where the bullet
    // was) so the look throws every one of them, even from a frame that ran
    // several sim steps (a shotgun volley on a plate is up to 7 blocks:
    // 1.x tuning.js shotgun l2 pellets 7)
    log: 12,
  },
};
