// sludge.js — SLUDGE CUBE: its numbers. The 1.x CFG row (1.x enemy.js:585),
// melee flag (1.x main.js:2413), movement role (1.x tuning.js:303), revenge
// dialect (none: it is not in 1.x TUNING.revenge.biters, tuning.js:496), and
// everything its port reads: the edge-pivot flop (1.x TUNING.flop,
// tuning.js:56-62, enemy.js:1494-1566), the zoner's stop-and-wander at 7
// (enemy.js:2326-2330), the invisible poison zones every 0.5 s
// (enemy.js:2351-2356, main.js:1591-1600, 10459-10464, 11302-11313), the
// poured trail's points (enemy.js:2337-2350, main.js:1643-1648) and the look's
// per-frame numbers (the cube's rest breath, enemy.js:2770-2777; the v220
// SludgeRibbon, main.js:1602-1673; the v132 fumes, main.js:2442-2491).
// Spec: docs/port-1x/species-b.md §2.13, §7. Contract: docs/SIM_CONTRACT.md.
export default {
  name: 'SLUDGE CUBE',
  family: 'cube',          // look family: the rounded cube (render/looks/sludge.js tips it over its edge, 1.x's own way)
  radius: 0.65,
  hp: 2,
  speed: 0.75,             // u/s: the flop's AVERAGE ground speed (one stride a cycle)
  color: 0xaaee00,
  bulletColor: null,       // it never shoots
  fireInterval: null,
  contact: true,           // touching it hurts in classic: |hero − body| < r + 0.5 (1.x MELEE_TYPES main.js:2413, 10886-10905)
  role: 'MASS',            // swarm-force profile: the wave's current at 0.10, nothing else (1.x tuning.js:303)
  revenge: null,           // not a biter (1.x tuning.js:496); HARDCADE's every-corpse fallback is the core's RING

  // ── movement: the zoner (1.x enemy.js:2296-2331) ──
  // want = unit(hero − body), or nothing within `hold` of the hero. A flop
  // that starts with a want snaps it to the cardinal of its larger axis, then
  // rolls U: < toward → that cardinal, < keep → the previous direction, else
  // a random cardinal. With no want: U < idleKeep → the previous direction,
  // else a random cardinal. So it staircases in to 7, then random-walks there.
  hold: 7,                 // within this of the hero it stops advancing (1.x enemy.js:2329 `dist <= 7`)
  distFloor: 0.001,        // the distance to the hero never reads below this (1.x enemy.js:1682 `|| 0.001`)
  pick: { toward: 0.70, keep: 0.90 },   // the roll's bands (1.x enemy.js:1519)
  idleKeep: 0.7,           // with no want, keep the previous direction this often (1.x enemy.js:1521)
  // the cardinals, in 1.x's order: a random one is `cardinals[floor(U × 4)]`
  // (1.x enemy.js:1211, 1502)
  cardinals: [[1, 0], [-1, 0], [0, 1], [0, -1]],

  // ── the edge-pivot flop (1.x enemy.js:1494-1566, TUNING.flop tuning.js:56-62) ──
  // L = halfEdge × r (half the cube's edge), D = L√2 (centre to the pivot
  // edge), stride = 2L, cycle = stride / max(speed, minSpeed). A flop sweeps
  // the pivot angle arcStart → arcEnd linearly over min(timeMax, share ×
  // cycle): the centre sits at L + D·cos(ang) along the flop and D·sin(ang)
  // up, tipped p × 90° about (dir.z, 0, −dir.x). It lands snapped one stride
  // on, kicks the squash spring, and rests max(minRest, cycle − flop).
  // Before it starts, a stride that would cross the wall (the arena's half
  // size less the CFG radius, 1.x enemy.js:1527) turns it back along x, or
  // failing that along z.
  flop: {
    halfEdge: 0.9,         // L / r: the rounded box is 1.8 r on a side (1.x enemy.js:738, 1498)
    arcStartDeg: 135,      // the pivot sweep (1.x tuning.js:58)
    arcEndDeg: 45,
    timeMax: 0.30,         // the tip never takes longer than this (1.x tuning.js:60 flopTimeMax)
    shareOfCycle: 0.65,    // nor more than this share of the cycle (1.x tuning.js:60 flopShareOfCycle)
    minSpeed: 0.01,        // the cycle's speed floor (1.x enemy.js:1501 `max(spd, 0.01)`)
    minRest: 0.02,         // the shortest rest between flops (1.x enemy.js:1564)
    landSquish: 0.32,      // the landing's squash kick, `_sqV −= 0.32` (1.x tuning.js:59)
    firstRest: 0.25,       // the first rest is U(0, 0.25) s, staggering a wave (1.x enemy.js:1213)
  },

  // ── the hazard: poison zones (1.x main.js:1591-1600, 10459-10464, 11302-11313) ──
  // Every `every` s (the clock starts full, enemy.js:1218) a zone drops where
  // the cube stands, alive or resting, flopping or not (enemy.js:2351-2356).
  // A zone lives 3.5 s and is lethal while its life is above 1.0 — its first
  // 2.5 s, which is the whole life of a 2.0 hazard (api.fire.hazard hurts as
  // long as it lives). It hurts a hero whose centre comes within radius × r
  // + the hero's 0.5 (1.x `z.radius + PLAYER_RADIUS`): 1.17 + 0.5 for a plain
  // cube, 1.40 + 0.5 elite. One hit per touch; the mercy window protects.
  // Zones are not the cube's: they keep their clock after it dies. 1.x drew
  // none (pure data since v100): the trail is the read.
  poison: {
    every: 0.5,            // s between zones (1.x TUNING.fx.poisonInterval, tuning.js:622; enemy.js:2352-2355)
    radius: 1.8,           // × the body's radius (1.x main.js:10463 `e.radius * 1.8`)
    life: 3.5,             // the zone's life (1.x main.js:1593)
    harmlessBelow: 1.0,    // it stops hurting once its life is this low (1.x main.js:1597 `isDangerous`)
    color: 0x88cc00,       // the hazard's colour if the view draws it: the trail's (1.x main.js:1617)
    kind: 'poison',        // 1.x's name for it (tryHitPlayer('poison'), main.js:11309)
  },

  // ── the poured trail's points (1.x enemy.js:2337-2350, main.js:1643-1648) ──
  // Each step, once the cube stands `spacing` from its last point (or has
  // none), its position is pushed with the time; at most `max` (the oldest
  // dropped), and while it lives, points older than `expire` s are dropped.
  // The time is the cube's clock as it stood BEFORE this step: 1.x stamped
  // `_wobbleT` (enemy.js:2347), which advances at the end of update()
  // (enemy.js:2725), and aged points against it after that advance
  // (main.js:1646), so a point lives 180 frames, not 181.
  trail: {
    spacing: 0.35,         // u between points: by distance, not time, since v105 (1.x enemy.js:2346)
    max: 12,               // points kept (1.x enemy.js:2348)
    expire: 3.0,           // s a point lives on a live cube (1.x main.js:1647)
  },

  // ── the look (render/looks/sludge.js) ──
  look: {
    // The body: three's RoundedBoxGeometry(1.8 r, 1.8 r, 1.8 r, 4, 0.18)
    // (1.x enemy.js:738), built at the CFG size and scaled for an elite, so
    // the corner is 0.18 / 0.65 of a radius in the unit cube.
    corner: 0.18,
    segments: 4,
    // The trail and the fumes ran in 1.x's game update: a pause froze them
    // (main.js:9293-9299) and no frame counted more than 0.05 s (main.js:9268).
    frameCap: 0.05,
    // At rest the cube breathes: scale (1 − b/2, 1 + b, 1 − b/2) on top of the
    // squash spring, b = amp·sin(2.4·t + φ) (1.x enemy.js:2773-2777). In a
    // flop it is its plain size: no squash, no breath (1.x enemy.js:2739-2740).
    breatheAmp: 0.10,      // (1.x tuning.js:61 TUNING.flop.breatheAmp)
    breatheHz: 2.4,        // rad/s (1.x enemy.js:2773 `_wobbleT * 2.4`)
    breatheXZ: 0.5,        // the breath gives back half of itself across (1.x enemy.js:2775)
    // The v220 poured trail (1.x SludgeRibbon, main.js:1602-1673): one
    // squashed droplet per trail point, overlapping into one streak.
    ribbon: {
      color: 0x88cc00,     // MeshBasicMaterial, transparent, no depth write (1.x main.js:1616-1618)
      segments: [10, 7],   // SphereGeometry(1, 10, 7), shared (1.x main.js:1604)
      y: 0.02,             // the group's height (1.x main.js:1627)
      width: 1.5,          // hw = 1.5 × the body's radius (1.x main.js:1652)
      // r = hw × (base + amp·sin(perIndex·i + rate·t)) × (1 − dry × age),
      // i = 0 the oldest point, t the ribbon's own clock (1.x main.js:1660)
      base: 0.85, amp: 0.25, perIndex: 1.9, rate: 2.2,
      dry: 0.45,           // an aged blob has shrunk this much (1.x main.js:1660)
      deadAge: 0.5,        // every blob's age once the cube is dead (1.x main.js:1659)
      flat: 0.26,          // scale (r, flat × r, r): a poured droplet (1.x main.js:1663)
      pulse: [0.35, 0.2, 5],   // live opacity 0.35 + 0.2·|sin(5 t)|: "lethal" (1.x main.js:1640)
      fade: 2.0,           // s it fades once the cube is dead (1.x main.js:1614, 1635)
      fadeOpacity: 0.4,    // from this opacity (1.x main.js:1635)
      max: 12,             // pooled droplets (1.x main.js:1621)
    },
    // The v132 fumes: bubbles rising off a live trail (1.x main.js:1665-1669, 2442-2491).
    fumes: {
      rate: 5,             // spawn chance per second while the trail has ≥ minPoints (1.x main.js:1666 `dt * 5`)
      minPoints: 2,        // (1.x main.js:1666 `n >= 2`)
      color: 0xaadd44,     // (1.x main.js:1668)
      pool: 48,            // shared by every trail; a spawn into a full pool is dropped (1.x main.js:2442, 2465)
      segments: [6, 5],    // SphereGeometry(1, 6, 5) (1.x main.js:2446)
      opacity: 0.5,        // (1.x main.js:2447)
      y: 0.08,             // start height (1.x main.js:2467)
      life: [0.9, 1.4],    // s (1.x main.js:2468)
      size: [0.07, 0.15],  // (1.x main.js:2469)
      rise: 0.9,           // u/s (1.x main.js:2482)
      wiggle: [9, 0.15],   // x += sin(9·y + i)·0.15·dt (1.x main.js:2483)
      popRate: 3,          // shrinks out over its last third of a second: size × min(1, 3·life) (1.x main.js:2484)
    },
  },
};
