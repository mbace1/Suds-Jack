// bubbla.js — BUBBLA, THE CISTERN's gel (2.0's own, world 4): a small gel
// floating inside a bubble. The bubble takes the shots — each one thins it,
// and it pops on the last — and only then can the gel be hurt; left alone a
// while the bubble grows back. Popped, the gel bolts. Every number is a
// design number. Behaviour: js/sim/species/bubbla.js.
export default {
  name: 'BUBBLA',
  family: 'blob',
  radius: 0.8,             // the bubble's; the gel inside is half of it
  hp: 2,
  speed: 1.6,              // u/s, drifting at you
  color: 0x8fe8ff,
  bulletColor: null,
  fireInterval: null,
  contact: true,
  role: 'DRIFTER',
  revenge: null,

  shell: 4,                // hits the bubble takes before it pops
  regrow: 4.5,             // s with no hit before a popped bubble grows back whole
  bob: [0.9, 0.35],        // its float: Hz, and u of sideways sway
  bolt: { time: 1.6, speed: 7.5 },   // popped, it runs from you this long, this fast
  look: { shell: 1.0, inner: 0.5 },  // the bubble's scale, and the gel's inside it (× radius)
};
