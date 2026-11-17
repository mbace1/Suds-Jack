// pyra.js — PYRA: its numbers. The 1.x CFG row (1.x enemy.js:592), melee
// flag (1.x main.js:2409-2420), movement role (1.x tuning.js:306), revenge
// dialect (1.x tuning.js:511), and everything its port reads: the spinning
// ring whose holes are its hit points, every hole firing a three-shot fan on
// one clock, the spin quickening with each hole shot off, and the look's
// numbers (1.x writes them inline in the constructor). Spec:
// docs/port-1x/bullets-graze.md §5.2 (the PYRA row) and trap 7.
// Contract: docs/SIM_CONTRACT.md.
//
// 1.x citations are to /home/user/sj-site/toko-drop/js/ at v268.
export default {
  name: 'PYRA',
  deathLabel: 'Pyra spinner', // the death screen's name for it (1.x main.js:5038)
  family: 'custom',        // its own body: a group-bodied spinner (1.x GROUP_BODY, enemy.js:652); render/looks/pyra.js builds it
  radius: 1.0,             // CFG radius (1.x enemy.js:592): the hitbox (×1.2 elite, ×1.5 boss), the ring's size and its height
  hp: 4,                   // CFG hp (1.x enemy.js:592) — never the hp it fights with: the constructor makes that the hole count (enemy.js:967)
  speed: 0,                // 1.x enemy.js:592: it never walks
  color: 0xff9900,         // the ring (1.x enemy.js:592, 937)
  bulletColor: 0xffcc44,   // its fans (1.x enemy.js:592, 2804)
  fireInterval: 2.5,       // s × the wave's intervalMult, every hole at once (1.x enemy.js:592, 971, 2795)
  contact: false,          // its touch never hurts in classic (1.x MELEE_TYPES, main.js:2409-2420)
  role: 'FIXED',           // no swarm forces at all (1.x tuning.js:295, 306 — v253: "HUNTER's dodge was nudging a turret");
                           // the crowd solver still parts it from a body it overlaps (1.x crowd.js:68-71 skips only ANCHORED),
                           // and the PUSH dash leaves it standing (core: hero.js shove)
  revenge: 'FAN',          // HARDCADE's corpse fire: 5 slow bullets 0.5 rad apart (1.x tuning.js:511, 515)
  noHpMult: true,          // elites and bosses never multiply its hp (1.x main.js:9385, 9403, 9408)
  // its own death voice: onKill files it as 'pyra' (1.x main.js:4476-4479) and enemyDieType plays
  // _tone(1300, 0.16, 'sine', 0.20, 550), no noise (1.x audio.js:247) — a bright falling chime
  deathSound: { wave: 'sine', f0: 1300, f1: 550, dur: 0.16, vol: 0.20 },

  // ── the holes: its hit points (1.x enemy.js:952-967) ──
  // tier = ⌊(1 − intervalMult) / 0.09⌋ (0 when intervalMult ≤ 0); 4 holes below tier 3, 6 below
  // tier 5, else 8 — so 4 to wave 5, 6 from wave 6, 8 from wave 10. They sit evenly round the
  // ring, hole i at 2π i / n, and hp = n whatever the spawn asked for (a boss's too)
  holes: { tierStep: 0.09, tiers: [3, 5], counts: [4, 6, 8] },

  // ── the spin (1.x enemy.js:970, 2533-2535, 1648) ──
  spin: 1.8,               // rad/s at spawn: 1.x group.rotation.y += _spinSpeed × dt, from 0
  spinPerHole: 0.6,        // rad/s more for every hole shot off (1.x hit(): _spinSpeed += 0.6)

  // ── the fire (1.x enemy.js:971, 2792-2808) ──
  // the clock starts FULL (2.5 × im, not the shared random _t: enemy.js:971), counts down a step
  // at a time, and at ≤ 0 is set back to 2.5 × im (the overshoot dropped, so the period rounds up
  // to a whole step). Then every live hole fires a fan of 3 about the spin + its own angle:
  // −spread/2, 0, +spread/2 with spread π/6, i.e. fanStep(…, 3, π/12) (bullets-graze.md §5.1)
  fan: { shots: 3, step: Math.PI / 12 },

  // ── the look (render/looks/pyra.js) ──
  look: {
    // the material: 1.x's satin, family `pyra` (1.x tuning.js:31) — uWobble 0.35 (every
    // non-blob family) and uRadius the CFG 1.0 (1.x enemy.js:323, 937)
    roughness: 0.10, transmission: 0.25, wobble: 0.35,
    // the ring: a torus of major radius 0.9 × radius, tube 0.15, 8 × 20 segments, laid flat,
    // its centre at the CFG radius 1.0 above the floor, elite or not (1.x enemy.js:939-947)
    ring: { r: 0.9, tube: 0.15, radialSegs: 8, tubularSegs: 20 },
    // the holes: gold cones r 0.18, 0.4 long, 5-sided, on the ring's centre line, in a Phong
    // 0xffcc44 at shininess 80 (1.x enemy.js:956-962). 1.x laid each on its side with
    // rotation.z = π/2, rotation.y = a, which in three's yaw sense points them alternately in and
    // out round the ring; these all point OUT, along the line their fan leaves on
    hole: { r: 0.18, h: 0.4, sides: 5, color: 0xffcc44, shininess: 80 },
    maxHoles: 8,           // cones built per view (the most a PYRA has, enemy.js:954)
    // a hole shot off pops: 3 gold gel chunks from where it was, at the ring's height, each 3 u/s
    // along its own random heading (1.x `ra`, not outward), vy 2–5, size 0.12 (1.x
    // enemy.js:1649-1660), as smooth goo droplets, a 9 × 7 sphere
    // (1.x main.js:2436, 2617, drained at 10522-10527). 1.x's goo pool physics, per 60 Hz frame
    // (1.x main.js:1366-1392): life 1.4, gravity 14, landing at y ≤ 0.01 with a squash kick
    // 0.4 × |vy| and 0.35 of the skid kept, a 0.32 / 0.80 spring held to 0.55..1.4, and a shrink
    // over the last 0.3 s (life, gravity, floorKeep and shrink are TUNING.death's, the same numbers)
    popChunks: 3, popSpeed: 3, popUp: [2, 5], popSize: 0.12, popColor: 0xffcc44, popGeo: [9, 7],
    popFloor: 0.01, popSquash: { land: 0.4, spring: 0.32, damp: 0.80, min: 0.55, max: 1.4 },
    frameDtCap: 0.05,      // the chunks' frame clock is held to 1.x's own dt cap (1.x main.js:9268)
    popPool: 48,           // chunks in flight at once, every PYRA's together: two full 8-hole rings' worth
                           // (2.0's budget; 1.x shared its 384, reusing the one with least life: main.js:1342-1347)
  },
};
