// warden.js — WARDEN: its numbers. The 1.x CFG row (1.x enemy.js:595), melee
// flag (1.x main.js:2410-2421), movement role (1.x tuning.js:307) and revenge
// dialect (1.x tuning.js:496-497), then the shield-bearer's own numbers (v124:
// enemy.js:573-575, 1118-1131, 1755-1767, 3008; main.js:10703-10720).
// Contract: docs/SIM_CONTRACT.md.
export default {
  name: 'WARDEN',
  family: 'blob',          // 1.x BLOB_TYPES (enemy.js:644-648); no TUNING.blob.shapes row (tuning.js:40-44), so the default dome
  radius: 0.85,
  hp: 5,
  speed: 1.1,
  color: 0x33ffdd,
  bulletColor: null,
  fireInterval: null,      // it never attacks: no gun, no _tick branch (enemy.js:483-485, 595)
  contact: false,          // not in MELEE_TYPES, so harmless to touch in classic (main.js:2410-2421)
  role: 'SUPPORT',         // swarm-force profile (1.x tuning.js:307)
  revenge: null,           // not a biter (1.x tuning.js:496-497): its corpse never fires back

  // ── the walk (enemy.js:1755-1761) ──────────────────────────────────
  // It plods straight at the hero at its own speed (speed × speedMult, × the
  // SIREN surge, enemy.js:1697-1698), and stands still once its centre is
  // within this of yours, so its aura drags the pack it protects forward.
  stopAt: 1.4,             // enemy.js:1758
  distFloor: 0.001,        // 1.x's guard on a zero distance: hypot(...) || 0.001 (enemy.js:1682)

  // ── the aura (main.js:10703-10720; enemy.js:573-575) ───────────────
  // Every OTHER living body whose centre is closer than this to a living
  // WARDEN's centre (strictly: hypot < 4.5) shrugs off hero bullets — the
  // bullet is spent, no damage, no flash. Bosses included; never another
  // WARDEN, never itself, so the priority target is always killable.
  aura: 4.5,               // WARDEN_AURA (enemy.js:575; main.js:10708)

  // ── the ring: the tell IS the rule's radius (enemy.js:1118-1131, 1762-1765, 3008)
  // A flat cyan ring on the floor, RingGeometry(WARDEN_AURA − 0.18,
  // WARDEN_AURA, 48), MeshBasicMaterial additive, depthWrite off, DoubleSide,
  // laid flat (rotation.x −π/2) at y 0.06. Its outer edge is `aura`, so the
  // read and the rule cannot drift. Opacity 0.30 + 0.13·sin(3.1·clock +
  // phase) on the body's own visual clock; hidden the instant it dies.
  ring: {
    width: 0.18,           // enemy.js:1124
    segments: 48,          // enemy.js:1124
    color: 0x33ffdd,       // enemy.js:1126
    y: 0.06,               // enemy.js:1130, 1763
    base: 0.30, amp: 0.13, hz: 3.1,   // enemy.js:1764
  },

  // ── a shielded shot: cyan sparks (main.js:10713-10717), flying on the goo
  // chunk pool's physics (main.js:1349-1388). Three droplets thrown back along
  // the hit from the bullet, at the shielded body's mid-height + 0.15, so
  // "no damage" reads as SHIELDED, not a whiff.
  spark: {
    count: 3,              // main.js:10714
    color: 0x33ffdd,       // main.js:10717
    size: 0.08,            // main.js:10717
    spread: 1.6,           // atan2(hit) + (rand − 0.5) × 1.6 (main.js:10715)
    speed: 4,              // cos/sin(a) × 4 (main.js:10717)
    up: [2, 4],            // vy = 2 + rand × 2 (main.js:10717)
    lift: 0.15,            // y = e.fxY + 0.15 (main.js:10716)
    // e.fxY (enemy.js:1479) goes by 1.x's own sets, not 2.0's families: a
    // BLOB_TYPE's (and RIBBON's and SLUG's) is its radius, × the elite's 1.2
    // or the boss's 1.5 (enemy.js:644-648, 1468-1470); anything else's is its
    // mesh's y — a cube rests on its half-extent, 0.9 × its radius × the same
    // mult (CUBE_TYPES enemy.js:654-657; L, enemy.js:1498); BAMBU stands at
    // 0 (enemy.js:870) and BOTFLY hovers at 1.5 (its _hoverBase, enemy.js:
    // 1233; the ±0.22 bob, enemy.js:2288, is left out); the rest stand at
    // their CFG radius: TORO, PYRA, OMEGA, the PRISMs, DRAPER, SHEPHERD
    // (enemy.js:837, 939, 1000)
    fxRadius: ['globbo', 'spittor', 'fanner', 'weeva', 'splitta', 'warden', 'bulwark', 'siren', 'cloaker', 'magna', 'ribbon', 'slug'],
    fxCube: ['yela', 'orange', 'sludge', 'redd', 'purp', 'reddmini', 'purpmini'],
    cubeFxY: 0.9,
    fxYAt: { bambu: 0, botfly: 1.5 },
    life: 1.4,             // main.js:1353
    gravity: 14,           // main.js:1373
    floorAt: 0.01,         // it lands once y ≤ 0.01 while falling, and sits at y 0 (main.js:1377-1378)
    floorKeep: 0.35,       // horizontal speed kept on landing (main.js:1380)
    landSquash: 0.4,       // sqV −= |vy| × 0.4 on landing (main.js:1379)
    spring: 0.32, damp: 0.80,   // squash spring, per 60 Hz frame (main.js:1383)
    sqMin: 0.55, sqMax: 1.4,    // main.js:1384
    sxFloor: 0.1,          // width 1/√max(sq, 0.1) (main.js:1386)
    shrink: 0.3,           // shrinks to nothing over its last 0.3 s (main.js:1387)
    // 2.0: 1.x drew these from its shared 384-droplet goo pool (main.js:1284),
    // reusing the slot with the least life when full (main.js:1340-1345);
    // this pool is the WARDENs' own, shared by every WARDEN in the scene
    pool: 96,
  },
};
