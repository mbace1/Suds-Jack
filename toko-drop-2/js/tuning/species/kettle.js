// kettle.js — KETTLE, THE BOILER ROOM's boss (2.0's own, v45): STEAMA's
// pot. An iron-dark gel that builds pressure (it swells and glows), then
// vents: three jets of shots turning round it like a sprinkler, and scalding
// steam where it stands. Every second vent it overheats and stalls, red-hot:
// then every shot does double. Raging, four jets, turning either way.
// Behaviour: js/sim/species/kettle.js.
export default {
  name: 'KETTLE',
  family: 'blob',
  radius: 1.3,             // × 1.5 as a boss
  hp: 8,
  bossHp: 140,
  speed: 1.1,
  color: 0xd2662e,         // hot iron
  bulletColor: 0xffc08a,
  fireInterval: null,
  contact: true,
  role: 'FIXED',
  revenge: null,
  deathSound: { wave: 'square', f0: 160, f1: 40, dur: 0.55, vol: 0.24, noiseVol: 0.2, noiseDur: 0.5 },

  keep: 6,                 // u it keeps from you
  fill: 2.6,               // s of pressure building to a vent (g.tell is the gauge)
  vent: { time: 2.2, jets: 3, spin: 1.1, every: 0.1, speed: 0.8, steam: { r: 2.8, life: 2.6, color: 0xffd9b0 } },
  stall: { every: 2, time: 3.0, damage: 2 },   // every 2nd vent: 3 s red-hot, every shot does 2
  rage: { at: 0.5, label: 'THE KETTLE BOILS OVER!', banner: 1.4, shake: 0.35, jets: 4, fill: 1.9 },

  look: { lid: 0x3a2a24, hot: 0xff3a10 },
};
