// EERI — THE MACHINE DRIVE TABLE.
//
// One entry per machine: which node moves, on what channel, between what
// limits, and where it rests. This is the whole "animation" for the fleet,
// because none of these are skinned — a vehicle animates by driving named
// transforms, and the routing rule (PHASING §1) sends exactly that to code.
//
// It is DATA rather than eight modules of tweening so that one thing can read
// it: the game to drive a machine, and `machine-swing.mjs` to prove every
// joint actually moves geometry. A drive table nobody can test is a list of
// numbers that agree with each other and with nothing else.
//
// CHANNELS
//   rot  — rotation about the named axis, radians. Segments are PARENTED, so
//          a boom angle carries its stick and bucket with it. Rest is the
//          pose the machine sits in when nobody is driving it.
//   pos  — translation along the named axis, world units at model scale. Only
//          two machines use it, and both are lifts rather than hinges.
//   spin — free rotation with no limits, driven by ground speed rather than
//          by a control: `rate` is radians per world unit travelled, i.e.
//          1/radius. Wheels and the roller drum.
//   turn — free rotation at a constant rate, radians per second. The beacon.
//
// `wheelR` is the rolling radius in model units and is what `spin` divides by.
// It is measured off the cut, not guessed — a wheel spun at the wrong radius
// skates, and skating is the single most legible way for a toy to look fake.

export const DRIVE = {
  excavator: {
    length: 2.9, rideable: true, wheelR: 0.24,
    joints: {
      boom:   { ch: 'rot', axis: 'z', rest: 0.52,  min: 0.10, max: 0.95 },
      stick:  { ch: 'rot', axis: 'z', rest: -1.35, min: -1.9, max: -0.6 },
      bucket: { ch: 'rot', axis: 'z', rest: -0.6,  min: -1.5, max: 0.3 },
      wheelF: { ch: 'spin', axis: 'z' },
      wheelR: { ch: 'spin', axis: 'z' },
      beacon: { ch: 'turn', axis: 'y', rate: 5.2 },
    },
  },

  crane: {
    length: 3.0, rideable: true, wheelR: 0.26,
    // Node names follow js/crane.js, not the crane: it is a wrecking-ball
    // crane and keeps `arm` plumb by counter-rotating it against the boom.
    // The rope is NOT in the mesh
    // — image-to-3D will not model a 2 px thread — so the game draws it as a
    // cylinder from `arm` to `ball` and rescales it each frame. That is why
    // `arm` is an empty: it is the top end of a rope with no geometry.
    rope: { from: 'arm', to: 'ball' },
    joints: {
      boom:   { ch: 'rot', axis: 'z', rest: 0.70, min: 0.35, max: 1.15 },
      arm:    { ch: 'rot', axis: 'z', rest: 0,    min: -1.2, max: 0 },
      ball:   { ch: 'pos', axis: 'y', rest: 0,    min: -1.6, max: 0 },
      wheelF: { ch: 'spin', axis: 'z' },
      wheelR: { ch: 'spin', axis: 'z' },
      beacon: { ch: 'turn', axis: 'y', rate: 5.2 },
    },
  },

  dumptruck: {
    length: 3.4, rideable: true, wheelR: 0.29,
    joints: {
      // hinged at the REAR BOTTOM edge, so it rears up off the chassis
      // instead of sinking through it. Negative z tips the body backwards.
      tipper: { ch: 'rot', axis: 'z', rest: 0, min: -0.95, max: 0 },
      wheelF: { ch: 'spin', axis: 'z' },
      wheelM: { ch: 'spin', axis: 'z' },
      wheelR: { ch: 'spin', axis: 'z' },
      beacon: { ch: 'turn', axis: 'y', rate: 5.2 },
    },
  },

  roller: {
    length: 2.6, rideable: true, wheelR: 0.42,
    // The drum is a wheel that is also the tool. It spins on ground speed
    // like any wheel, but at its OWN radius — it is far bigger than the rear
    // tyre, and sharing one radius between them makes one of the two skate.
    joints: {
      drum:   { ch: 'spin', axis: 'z', radius: 0.45 },
      wheelR: { ch: 'spin', axis: 'z' },
      beacon: { ch: 'turn', axis: 'y', rate: 5.2 },
    },
  },

  forklift: {
    length: 2.2, rideable: true, wheelR: 0.19,
    // The MAST DOES NOT MOVE; only the carriage rides up it. Forks are
    // children of the carriage and inherit the lift for free.
    joints: {
      carriage: { ch: 'pos', axis: 'y', rest: 0, min: 0, max: 1.05 },
      wheelF: { ch: 'spin', axis: 'z' },
      wheelR: { ch: 'spin', axis: 'z' },
      beacon: { ch: 'turn', axis: 'y', rate: 5.2 },
    },
  },

  cherrypicker: {
    length: 3.2, rideable: true, wheelR: 0.22,
    // `level: 'boom'` is a CODE RULE, not a pose: whatever the boom does, the
    // basket counter-rotates by the same angle so it stays flat. A basket
    // that tips with its arm is the one thing a child will notice instantly,
    // because they have watched a real one and it never does.
    level: { node: 'basket', against: 'boom' },
    joints: {
      boom:   { ch: 'rot', axis: 'z', rest: 0.44, min: 0.05, max: 1.05 },
      basket: { ch: 'rot', axis: 'z', rest: -0.44, min: -1.05, max: -0.05 },
      wheelF: { ch: 'spin', axis: 'z' },
      wheelM: { ch: 'spin', axis: 'z' },
      wheelR: { ch: 'spin', axis: 'z' },
      beacon: { ch: 'turn', axis: 'y', rate: 5.2 },
    },
  },

  pipelayer: {
    length: 2.8, rideable: true, wheelR: 0.22,
    rope: { from: 'hook', to: 'load' },
    joints: {
      boom:   { ch: 'rot', axis: 'z', rest: 0.30, min: -0.10, max: 0.75 },
      load:   { ch: 'pos', axis: 'y', rest: 0, min: -0.9, max: 0 },
      flag:   { ch: 'wave', axis: 'z', amp: 0.10, rate: 2.4 },
      wheelF: { ch: 'spin', axis: 'z' },
      wheelR: { ch: 'spin', axis: 'z' },
      beacon: { ch: 'turn', axis: 'y', rate: 5.2 },
    },
  },

  floodlight: {
    length: 1.5, rideable: false, wheelR: 0.20,
    // Not rideable — no seat, no step. Site furniture that lights a dark span.
    // `lamps` is an emissive swap rather than a movement: the only machine in
    // the fleet whose "animation" is a material and not a transform.
    lamps: { node: 'lamps', emissive: true },
    joints: {
      mast:   { ch: 'pos', axis: 'y', rest: 0, min: 0, max: 0.8 },
      wheelL: { ch: 'spin', axis: 'z' },
      wheelR: { ch: 'spin', axis: 'z' },
      beacon: { ch: 'turn', axis: 'y', rate: 5.2 },
    },
  },
};
