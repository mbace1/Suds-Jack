// shepherd.js — SHEPHERD: its numbers. STUB: the 1.x CFG row (1.x enemy.js:628),
// melee flag (1.x main.js:2410-2420), movement role (1.x tuning.js:300-316) and
// revenge dialect (1.x tuning.js:496-513). The species port adds the rest of
// its numbers below, with a 1.x cite for each. Contract: docs/SIM_CONTRACT.md.
export default {
  name: 'SHEPHERD',
  family: 'blob',          // look family: 'blob' (gel dome), 'cube' (rounded box) or 'custom' (its own look)
  radius: 0.6,
  hp: 3,
  speed: 1.6,
  color: 0x66ffcc,
  bulletColor: null,
  fireInterval: null,
  contact: false,         // touching it hurts in classic (1.x MELEE_TYPES)
  role: 'HERDER',          // swarm-force profile (TUNING.movement.roles)
  revenge: null,          // HARDCADE dialect if it bites: 'AIMED' | 'FAN' | 'RING'; null = it does not
  // the herd: every other body inside this ring is dragged toward the hero
  // (one shepherd's pull; they don't stack) — read by sim/crowd.js
  herd: { radius: 7.5, speed: 2.8, stopAt: 1.2 },   // 1.x main.js:10243-10260, SHEPHERD_RADIUS
};
