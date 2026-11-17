// blister.js — BLISTER, THE CISTERN's boss (2.0's own, v45): BUBBLA's
// queen. A gel afloat in a great bubble that takes your shots — thinning with
// each, popping on the last — while it blows big slow bubbles at you that
// burst into rings. Popped, the gel inside is bare for a few seconds and
// panics: it backs off and fires fast. Then the bubble grows back whole. Raging,
// its bubbles burst into more, and it blows them more often.
// Behaviour: js/sim/species/blister.js.
export default {
  name: 'BLISTER',
  family: 'blob',
  radius: 1.4,             // the bubble's, × 1.5 as a boss; the gel inside is half of it
  hp: 6,
  bossHp: 30,              // the gel's own: only a popped BLISTER takes them
  speed: 1.2,
  color: 0x7fe0ff,
  bulletColor: 0xbff4ff,
  fireInterval: null,
  contact: true,
  role: 'FIXED',
  revenge: null,
  deathSound: { wave: 'sine', f0: 900, f1: 120, dur: 0.45, vol: 0.28, noiseVol: 0.16, noiseDur: 0.25 },

  shell: 10,               // shots the bubble takes before it pops
  bare: 4.0,               // s the gel is bare before the bubble grows back
  keep: 6.5,               // u it keeps from you while whole
  bob: [0.5, 0.6],         // its float: Hz, and u of sway
  // the bubbles it blows: big and slow, each bursting into a ring at the end of its life
  blow: { every: [2.0, 2.6], count: 3, span: 0.7, speed: 0.32, radius: 0.55, life: 2.0,
          burst: { count: 6, speed: 0.55 } },
  // popped: it backs off slowly, wobbling, and fires fast fans while it can
  panic: { speed: 1.8, every: 0.55, count: 5, span: 0.6, shotSpeed: 0.9 },
  rage: { at: 0.5, label: 'THE BLISTER SWELLS!', banner: 1.4, shake: 0.35,
          every: [1.4, 1.8], burst: 9 },

  look: { shell: 1.0, inner: 0.5 },
};
