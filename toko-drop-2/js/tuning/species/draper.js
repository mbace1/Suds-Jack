// draper.js — DRAPER: its numbers. STUB: the 1.x CFG row (1.x enemy.js:624),
// melee flag (1.x main.js:2410-2420), movement role (1.x tuning.js:300-316) and
// revenge dialect (1.x tuning.js:496-513). The species port adds the rest of
// its numbers below, with a 1.x cite for each. Contract: docs/SIM_CONTRACT.md.
export default {
  name: 'DRAPER',
  family: 'blob',          // look family: 'blob' (gel dome), 'cube' (rounded box) or 'custom' (its own look)
  radius: 0.8,
  hp: 5,
  speed: 0.9,
  color: 0x9955ff,
  bulletColor: 0xcc88ff,
  fireInterval: 5.0,
  contact: false,         // touching it hurts in classic (1.x MELEE_TYPES)
  role: 'HOLDER',          // swarm-force profile (TUNING.movement.roles)
  revenge: 'FAN',          // HARDCADE dialect if it bites: 'AIMED' | 'FAN' | 'RING'; null = it does not
};
