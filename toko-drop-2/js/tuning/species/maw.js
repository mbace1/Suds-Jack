// maw.js — MAW, THE SEWER's boss (2.0's own, v45): WORMA's mother. A great
// pink worm that swims under the floor, where only the bulge it pushes up
// shows, comes up near you with a ring, sprays a turning spiral while it
// stands, and goes back down. You get it while it is up. Raging, it comes up
// sooner and leaves a pool of sludge in every hole it goes down.
// Behaviour: js/sim/species/maw.js.
export default {
  name: 'MAW',
  family: 'blob',
  radius: 1.0,             // × 1.5 as a boss
  hp: 7,
  bossHp: 54,
  speed: 6.5,              // u/s under the floor
  color: 0xff5a9e,         // WORMA's pink, deeper
  bulletColor: 0xff9fca,
  fireInterval: null,
  contact: true,           // only while up
  role: 'FIXED',
  revenge: null,
  deathSound: { wave: 'sawtooth', f0: 180, f1: 35, dur: 0.6, vol: 0.26, noiseVol: 0.14, noiseDur: 0.4 },

  firstUnder: [1.0, 1.4],
  under: [1.8, 2.4],       // s swimming under
  surface: [3.0, 5.0],     // u from you, where it heads to come up
  rise: 0.75,              // s: the tell — the floor bulges where it will come up
  up: 3.2,                 // s up and shootable
  sink: 0.45,              // s going back down
  erupt: { count: 14, speed: 0.6 },              // the ring as it breaks the floor
  spiral: { every: 0.14, arms: 3, turn: 0.32, speed: 0.75, from: 0.35 },   // while up: a turning three-arm spray
  rage: { at: 0.5, label: 'THE MAW IS HUNGRY!', banner: 1.4, shake: 0.35,
          under: [0.9, 1.3],                       // it comes up sooner…
          sludge: { r: 1.8, life: 7, color: 0xb6ff3a } },   // …and every hole it goes down fills with sludge

  look: { segments: 5, gap: 0.5, lean: 0.3, wake: 0.08 },
};
