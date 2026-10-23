// skata.js — SKATA, THE ICE SHEET's gel (2.0's own, world 7): a cube that
// slides like a puck. It never stops: it glances off the walls and comes off
// each a little faster, and every few bounces it lines up on you again. A
// shot knocks it. Behaviour: js/sim/species/skata.js.
export default {
  name: 'SKATA',
  family: 'cube',
  radius: 0.7,
  hp: 3,
  speed: 4.5,             // its first slide
  color: 0xcfeaff,
  bulletColor: null,
  fireInterval: null,
  contact: true,
  role: 'FIXED',          // nothing steers a puck
  revenge: 'FAN',

  gain: 1.08,             // × its speed off every wall
  max: 11,                // u/s at most
  reaim: 4,               // every this many bounces it lines up on you
  knock: 2.2,             // u/s a shot adds along it
};
