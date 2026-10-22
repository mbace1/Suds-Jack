// omega.js — OMEGA: its numbers. STUB: the 1.x CFG row (1.x enemy.js:593),
// melee flag (1.x main.js:2410-2420), movement role (1.x tuning.js:300-316) and
// revenge dialect (1.x tuning.js:496-513). The species port adds the rest of
// its numbers below, with a 1.x cite for each. Contract: docs/SIM_CONTRACT.md.
export default {
  name: 'OMEGA',
  family: 'blob',          // look family: 'blob' (gel dome), 'cube' (rounded box) or 'custom' (its own look)
  radius: 0.95,
  hp: 5,
  speed: 1.3,
  color: 0x00eeff,
  bulletColor: 0x66f2ff,
  fireInterval: null,
  contact: false,         // touching it hurts in classic (1.x MELEE_TYPES)
  role: 'MASS',          // swarm-force profile (TUNING.movement.roles)
  revenge: null,          // HARDCADE dialect if it bites: 'AIMED' | 'FAN' | 'RING'; null = it does not
};
