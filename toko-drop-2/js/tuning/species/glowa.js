// glowa.js — GLOWA, THE DEEP's gel (2.0's own, world 8): an anglerfish.
// Its body is nearly the colour of the dark; what you see is its lure, a
// light held out in front of it on a stalk. It noses the lure toward you,
// and when you are close to the light, it lunges. Behaviour:
// js/sim/species/glowa.js.
export default {
  name: 'GLOWA',
  family: 'blob',
  radius: 0.95,
  hp: 4,
  speed: 1.5,
  color: 0x22335a,        // near the dark
  bulletColor: null,
  fireInterval: null,
  contact: true,
  role: 'HUNTER',
  revenge: 'RING',

  lure: { reach: 1.9, glow: 0x9fe8ff },   // the light, this far in front (× radius), this colour
  bite: { range: 3.6, tell: 0.4, time: 0.32, speed: 13, rest: 1.6 },   // close to the lure: a tell, then the lunge
};
