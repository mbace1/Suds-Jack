// salma.js — SALMA, THE RIVER's gel (2.0's own, world 6): a slim fish of a
// gel that swims in darts — a burst straight across the floor, a glide, a
// turn toward you — always nosing against the current. Small and quick, it
// comes in schools. Behaviour: js/sim/species/salma.js.
export default {
  name: 'SALMA',
  family: 'blob',
  radius: 0.5,
  hp: 1,
  speed: 3.0,
  color: 0x77ffcc,
  bulletColor: null,
  fireInterval: null,
  contact: true,
  role: 'FIXED',          // it swims its own line, the current included
  revenge: 'AIMED',

  dart: { time: 0.45, speed: 10 },   // the burst
  glide: [0.5, 0.9],                  // s coasting after it
  turn: 0.55,                         // how far toward you each new dart aims (0 straight on, 1 at you)
  upstream: 0.5,                      // and how much against the current, in a current world
  look: { stretch: 1.6 },             // it is long while it darts
};
