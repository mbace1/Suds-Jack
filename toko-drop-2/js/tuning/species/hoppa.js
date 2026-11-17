// hoppa.js — HOPPA, the driveway's curb-hopper (2.0's own, world 2; owner,
// 2026-10-23: "maybe new species ... world specific"). No 1.x row: every
// number is a design number. Behaviour: js/sim/species/hoppa.js.
export default {
  name: 'HOPPA',
  family: 'blob',
  radius: 0.75,
  hp: 4,
  speed: 2.0,              // u/s, the shuffle between hops
  color: 0xd4f03c,         // lime, a tennis ball on the concrete
  bulletColor: 0xeaff7a,
  fireInterval: null,      // its shots are the landing ring, on its own clock
  contact: true,           // on the ground; in the air it is over your head (touches)
  role: 'DRIFTER',
  revenge: null,

  // ── the hop: rest → crouch → flight → land ──
  firstRest: [0.6, 1.6],   // s before its first crouch
  rest: [0.9, 1.5],        // s on the ground after a landing, shuffling at you
  crouch: 0.42,            // s: the tell — it squats and glows, the landing spot is marked
  crouchSquash: -0.9,
  flight: 0.72,            // s in the air
  height: 2.6,             // u at the top of the arc
  reach: [3.5, 7.5],       // u: how far a hop goes (toward where you will be)
  lead: 0.45,              // s of your velocity it aims ahead by
  launchSquash: 0.8,
  landSquash: -1.1,
  airborne: 0.9,           // u: above this it is over your head (no contact) and bullets pass under it
  // the landing: a slow ring, every other landing turned half a step
  ringCount: 8,
  ringSpeed: 0.7,          // × the base 7 u/s

  look: {
    marker: 0.9,           // the landing mark's radius, × its own
    stretch: 0.35,         // tall in the air at the top of the climb
  },
};
