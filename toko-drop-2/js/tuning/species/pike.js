// pike.js — PIKE, THE RIVER's boss (2.0's own, v45): SALMA's hunter. A long
// green fish of a gel that circles you, lines up (its lane lit on the floor),
// and charges along it, leaving a wake of slow shots either side; if the
// charge ends in a wall it is stunned there for a moment. Raging, it charges
// three times in a row.
// Behaviour: js/sim/species/pike.js.
export default {
  name: 'PIKE',
  family: 'blob',
  radius: 1.0,             // × 1.5 as a boss
  hp: 7,
  bossHp: 80,
  speed: 4.2,              // u/s round you while it circles
  color: 0x3fd9a0,
  bulletColor: 0xa8ffe0,
  fireInterval: null,
  contact: true,
  role: 'FIXED',
  revenge: null,
  deathSound: { wave: 'sawtooth', f0: 300, f1: 50, dur: 0.45, vol: 0.24, noiseVol: 0.12, noiseDur: 0.3 },

  circle: { time: [1.6, 2.3], want: 8.5, band: 1.5, fan: { every: 1.1, count: 3, span: 0.35, speed: 0.85 } },
  aim: 0.85,               // s still, lined up, its lane lit: the tell
  charge: { speed: 17, time: 1.15 },
  wake: { every: 0.075, speed: 0.22, life: 2.6 },   // a shot each side, square to its line, as it goes
  stun: { time: 1.1, ring: 10, speed: 0.6 },        // a charge that ends in a wall
  rage: { at: 0.5, label: 'THE PIKE STRIKES THRICE!', banner: 1.4, shake: 0.35, chain: 3, aim: 0.5 },

  look: { length: 2.3, height: 0.6, fin: 0x1f8a66, lane: 0xffe9a0 },
};
