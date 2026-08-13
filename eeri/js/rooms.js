// EERI — the rooms, as parts.
//
// Every room is a list of known-good pieces from js/parts.js, and nothing
// here restates a rule: a pit knows it is a hole and that a machine will not
// drive into one, a bank knows it needs a bucket, a machine knows the run of
// floor it can work. `check()` walks each of these against the kid's real
// reach budget, so a room that cannot be finished fails `test/rooms.mjs`
// rather than stranding somebody halfway.
//
// The shape of a room, every time: the kid meets something HE can pass, then
// something only the machine can, and the machine's track is laid so it can
// actually reach its own job. That last line is the one the first two rooms
// got wrong.

import {
  ground, mound, ledge, girderBeam, pit, bank, brickWall, chasm,
  machine, robot, hazard, swingBall, bolts, startAt, exitAt, shot, girderStack,
} from './parts.js?v=1';

export const ROOMS = [
  // ── SITE 1 — THE DIG ────────────────────────────────────────────────
  // Teaches the whole game in one room: a step you take, a hole you jump,
  // an unmanned machine you have to read, and a bank only its bucket moves.
  {
    name: 'SITE 1',
    parts: [
      ground(),
      startAt(4.5),

      mound(8, 14, 2),                    // 2 tiles — inside the kid's step
      ledge(11, 16, 7),                   // one hop up off the mound's top
      bolts([[9, 12], [9, 13], [9, 14], [9, 15]]),

      robot(24, 34),                      // a skitter to time, on open floor
      bolts([[13, 30], [13, 31], [13, 32]]),

      hazard(40, 'steam'),                // telegraphed, on the way to the pit
      pit(46, 48),                        // 3 wide — a run clears 4
      bolts([[11, 46], [11, 47], [11, 48]]),

      ledge(52, 57, 5),
      bolts([[11, 53], [11, 54], [11, 55], [11, 56]]),

      // the excavator lives PAST the pit, so its track is one unbroken run
      // of floor from the pit's far lip to the exit — it can always reach
      // the bank, and it can never pen itself against a hole
      machine('excavator', 61, [50, 92]),

      girderBeam(66, 72, 7),
      swingBall(70, 8),                   // hangs off that girder
      robot(74, 80),
      bolts([[13, 76], [13, 77], [13, 78]]),

      bank(84, 88, 3),                    // 3 tiles — above his jump
      bolts([[12, 90], [12, 91]]),        // only reachable once it is dug
      exitAt(92.5),

      shot(40, 52, { z: 37.5, y: 3.0 }),
      shot(52, 74, { z: 41, y: 3.4, lead: 2.2 }),
      shot(76, 96, { z: 42, y: 3.6, lead: 2.0 }),
    ],
  },

  // ── SITE 2 — THE GIRDER ─────────────────────────────────────────────
  // The same machine, the other verb. The chasm is past both of them: no
  // jump reaches it and the machine refuses the cliff, so the only way over
  // is a span the machine carries there and lowers in.
  {
    name: 'SITE 2',
    parts: [
      ground(),
      startAt(4.5),

      mound(8, 11, 2),
      ledge(9, 14, 7),
      bolts([[9, 10], [9, 11], [9, 12]]),

      pit(20, 22),                        // 3 wide — the kid's hole
      bolts([[11, 20], [11, 21], [11, 22]]),

      robot(26, 36),
      bolts([[13, 34], [13, 35], [13, 36]]),

      // track runs from past the kid's pit to the chasm's near lip: the
      // girder stack AND the lip are both inside it
      machine('excavator', 30, [24, 57]),

      hazard(44, 'steam'),
      girderStack(48),                    // the span waits on its trestles
      chasm(58, 65),                      // 8 wide — machine-shaped
      bolts([[11, 61], [11, 62]]),        // only over the span

      robot(70, 78),
      bolts([[12, 70], [12, 71]]),
      bolts([[13, 84], [13, 85]]),
      exitAt(92.5),

      shot(16, 26, { z: 37.5, y: 3.0 }),
      shot(42, 72, { z: 44, y: 3.8, lead: 2.2 }),
    ],
  },

  // ── SITE 3 — THE WALL ───────────────────────────────────────────────
  // The third verb. A wrecking crane is parked behind a brick wall four
  // tiles high; nothing else in the room touches it. Read its swing, take
  // the cab, and knock the way out down.
  {
    name: 'SITE 3',
    parts: [
      ground(),
      startAt(4.5),

      robot(14, 22),
      bolts([[13, 16], [13, 17], [13, 18]]),

      pit(28, 31),                        // 4 wide — the limit of a run
      bolts([[11, 28], [11, 29], [11, 30], [11, 31]]),

      ledge(36, 42, 6),
      bolts([[10, 37], [10, 38], [10, 39]]),

      hazard(48, 'steam'),
      mound(52, 58, 2),
      robot(62, 70),

      // the crane's track is the whole far half — it reaches the wall from
      // either side of it
      machine('crane', 66, [34, 92]),

      brickWall(80, 84, 4),               // four tiles of brick
      bolts([[12, 88], [12, 89]]),
      exitAt(92.5),

      shot(24, 36, { z: 38, y: 3.0 }),
      shot(60, 96, { z: 43, y: 3.6, lead: 2.0 }),
    ],
  },
];
