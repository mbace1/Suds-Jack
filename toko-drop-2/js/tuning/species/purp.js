// purp.js — PURP CUBE: its numbers. STUB: the 1.x CFG row (1.x enemy.js:587),
// melee flag (1.x main.js:2410-2420), movement role (1.x tuning.js:300-316) and
// revenge dialect (1.x tuning.js:496-513). The species port adds the rest of
// its numbers below, with a 1.x cite for each. Contract: docs/SIM_CONTRACT.md.
export default {
  name: 'PURP CUBE',
  family: 'cube',          // look family: 'blob' (gel dome), 'cube' (rounded box) or 'custom' (its own look)
  radius: 0.75,
  hp: 3,
  speed: 1.6,
  color: 0xcc44ff,
  bulletColor: 0xcc66ff,
  fireInterval: null,
  contact: true,         // touching it hurts in classic (1.x MELEE_TYPES)
  role: 'DRIFTER',          // swarm-force profile (TUNING.movement.roles)
  revenge: 'FAN',          // HARDCADE dialect if it bites: 'AIMED' | 'FAN' | 'RING'; null = it does not
};
