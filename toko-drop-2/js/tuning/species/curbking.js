// curbking.js — CURB KING, THE DRIVEWAY's boss (2.0's own, v45): HOPPA's
// king. A crowned lime gel the size of a car that bounds across the slab: it
// squats (the tell, its landing marked on the floor), leaps to where you are
// going, and lands with a shockwave ring. In the air it is over your head;
// the window is the squat and the landing. Raging, it hops twice in a row,
// its rings come doubled, and every third landing shakes two HOPPA loose.
// Behaviour: js/sim/species/curbking.js.
export default {
  name: 'CURB KING',
  family: 'blob',
  radius: 1.3,             // × 1.5 as a boss
  hp: 8,
  bossHp: 200,
  speed: 1.6,              // u/s, the shuffle between hops
  color: 0xc8e832,         // HOPPA's lime, a shade deeper
  bulletColor: 0xeaff7a,
  fireInterval: null,
  contact: true,           // on the ground (a landing on you hurts); in the air it is over your head
  role: 'FIXED',           // it steers itself
  revenge: null,
  deathSound: { wave: 'sine', f0: 220, f1: 40, dur: 0.5, vol: 0.32, noiseVol: 0.12, noiseDur: 0.3 },

  firstRest: [1.0, 1.6],   // s before its first squat
  rest: [1.1, 1.6],        // s on the ground after a landing
  crouch: 0.7,             // s: the tell
  flight: 1.0,             // s in the air
  height: 4.5,             // u at the top of the arc
  reach: [5, 14],          // u: how far a hop goes
  lead: 0.35,              // s of your velocity it aims ahead by
  airborne: 1.4,           // u: above this it is over your head
  crouchSquash: -1.0, launchSquash: 0.9, landSquash: -1.3,
  // the landing
  ring: { count: 16, speed: 0.75 },      // the shockwave
  ring2: { count: 16, speed: 0.5 },      // raging: a second, slower ring, turned half a step
  landShake: 0.25,

  rage: { at: 0.5, label: 'THE KING HOPS TWICE!', banner: 1.4, shake: 0.35,
          crouch: 0.45, rest: [0.7, 1.0],        // quicker, and…
          brood: { every: 3, n: 2, kind: 'hoppa' } },   // …every third landing shakes HOPPA loose

  look: { marker: 0.9, stretch: 0.3, crown: 0xffd23a },
};
