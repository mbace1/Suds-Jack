// steama.js — STEAMA, THE BOILER ROOM's gel (2.0's own, world 5): a squat
// copper gel that walks at you and, every few seconds, swells (the tell),
// then vents — a scalding cloud on the floor round it that hurts to stand in,
// and a slow ring of shots. Behaviour: js/sim/species/steama.js.
export default {
  name: 'STEAMA',
  family: 'blob',
  radius: 0.85,
  hp: 4,
  speed: 1.7,
  color: 0xff9955,
  bulletColor: 0xffc08a,
  fireInterval: null,
  contact: true,
  role: 'HOLDER',
  revenge: 'RING',

  every: [3.0, 4.0],      // s between vents
  tell: 0.65,             // s of swelling before one
  cloud: { r: 2.3, life: 2.6 },   // the scalding cloud it leaves
  ring: 6,                // shots in its ring
  ringSpeed: 0.6,         // × the base gel bullet speed
};
