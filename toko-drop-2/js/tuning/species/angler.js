// angler.js — ANGLER, THE DEEP's boss (2.0's own, v45): GLOWA's elder. A
// great dark gel you see mostly by the lure it holds out ahead of it. It
// creeps at you; come near the light and it tells, then lunges along the line
// and bursts a ring of lights where it stops. Every few seconds it lets three
// slow lanterns go that follow you. Raging, two GLOWA come out of the dark to
// it, and its lanterns come twice as often.
// Behaviour: js/sim/species/angler.js.
export default {
  name: 'ANGLER',
  family: 'blob',
  radius: 1.3,             // × 1.5 as a boss
  hp: 8,
  bossHp: 150,
  speed: 1.8,
  color: 0x24345e,         // near the dark
  bulletColor: 0x9fe8ff,   // its lure's light: readable in the dark
  barColor: 0x9fe8ff,      // its health on the HUD in the lure's light too: its own colour is the dark's
  fireInterval: null,
  contact: true,
  role: 'FIXED',
  revenge: null,
  deathSound: { wave: 'sine', f0: 140, f1: 30, dur: 0.7, vol: 0.3, noiseVol: 0.1, noiseDur: 0.4 },

  lure: { reach: 1.9, glow: 0x9fe8ff },          // the light, this far in front (× radius)
  bite: { range: 4.5, tell: 0.55, time: 0.45, speed: 15, rest: 1.3, ring: 12, ringSpeed: 0.6 },
  lantern: { every: [5.0, 6.0], count: 3, span: 1.2, speed: 0.45, homing: 1.1, life: 4.5, radius: 0.3 },
  rage: { at: 0.5, label: 'THE DEEP WAKES!', banner: 1.4, shake: 0.35, lantern: [2.6, 3.2], call: { n: 2, kind: 'glowa' } },
};
