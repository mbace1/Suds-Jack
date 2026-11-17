// worma.js — WORMA, the sewer's pipe-worm (2.0's own, world 3). It swims
// under the floor where nothing can touch it, comes up near you, spits, and
// goes back down. No 1.x row: every number is a design number. Behaviour:
// js/sim/species/worma.js.
export default {
  name: 'WORMA',
  family: 'blob',
  radius: 0.6,
  hp: 3,
  speed: 5.5,              // u/s under the floor
  color: 0xff6fae,         // pink, against the sewer's teal water
  bulletColor: 0xff9fca,
  fireInterval: null,      // its fans are on its own clock
  contact: true,           // only while up (touches)
  role: 'FIXED',           // it steers itself: no swarm forces
  revenge: null,

  // ── the cycle: under → rise → up → sink ──
  firstUnder: [0.8, 1.6],  // s under before its first rise
  under: [1.6, 2.4],       // s swimming under
  surface: [3.5, 5.5],     // u from you, where it heads to come up
  rise: 0.4,               // s: the tell — the floor bulges where it will come up
  up: 1.5,                 // s up and shootable
  sink: 0.3,               // s going back down
  fans: [0.3, 0.95],       // s into `up`: a fan at you each time
  fanCount: 5,
  fanSpread: 0.16,         // rad between shots
  fanSpeed: 0.9,           // × the base 7 u/s

  look: {
    segments: 3,           // the body standing out of the floor: head and two behind it
    gap: 0.55,             // × its radius between segments
    lean: 0.35,            // how far the body arches back from the head
    wake: 0.08,            // the bulge under the floor while it swims, × its height
  },
};
