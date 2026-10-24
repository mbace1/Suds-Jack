// berg.js — BERG, THE ICE SHEET's boss (2.0's own, v45): SKATA's
// mountain. A great block of ice that slides at you and never slows, glancing
// off the walls with a fan of shards at each; every few seconds it stops dead,
// frosts over (the tell), and fires walls of icicles out along four lines.
// Raging, it calves two SKATA, slides faster, and its icicles go eight ways.
// Behaviour: js/sim/species/berg.js.
export default {
  name: 'BERG',
  family: 'cube',
  radius: 1.2,             // × 1.5 as a boss
  hp: 8,
  bossHp: 88,
  speed: 5.5,              // its slide
  color: 0xbfe6ff,
  bulletColor: 0xe6f7ff,
  fireInterval: null,
  contact: true,
  role: 'FIXED',
  revenge: null,
  deathSound: { wave: 'square', f0: 700, f1: 90, dur: 0.5, vol: 0.24, noiseVol: 0.2, noiseDur: 0.45 },

  bounce: { count: 5, span: 0.7, speed: 0.8 },        // shards at you off each wall
  reaim: 2,                // every this many bounces it lines up on you again
  knock: 1.2,              // u/s a shot adds along it
  max: 9,                  // u/s at most
  freeze: { every: [5.0, 6.0], tell: 0.8, hold: 0.35, lines: 4, n: 5, width: 2.6, speed: 0.75 },
  rage: { at: 0.5, label: 'THE BERG CALVES!', banner: 1.4, shake: 0.4, speed: 1.3, lines: 8, calf: { n: 2, kind: 'skata' } },

  look: { frost: 0xffffff },
};
