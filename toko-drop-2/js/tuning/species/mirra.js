// mirra.js — MIRRA, THE CORE's gel (2.0's own, world 9): it stands where
// you would be in a mirror through the middle of the floor, and fires at you
// across it. Moving is how you move it: walk it into your line, or into a
// wall, and it cannot get round you. Behaviour: js/sim/species/mirra.js.
export default {
  name: 'MIRRA',
  family: 'blob',
  radius: 0.75,
  hp: 5,
  speed: 6.5,             // how fast it goes to its mirror point
  color: 0xff66ee,
  bulletColor: 0xff99f2,
  fireInterval: null,
  contact: true,
  role: 'FIXED',
  revenge: 'AIMED',

  axes: ['point', 'x', 'z'],   // the mirror: through the middle, or across one axis (drawn per body)
  every: [1.8, 2.6],            // s between volleys
  volley: 3,                    // shots in one, spread
  spread: 0.12,                 // rad between them
  shotSpeed: 0.9,
};
