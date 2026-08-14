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
  ground, mound, ledge, ladder, girderBeam, pit, bank, brickWall, chasm,
  machine, robot, hazard, swingBall, bolts, startAt, exitAt, shot, girderStack,
} from './parts.js?v=3';

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

      // The ball lives in the stretch only the kid ever walks, well clear of
      // the excavator's run. A hit takes the ride, so on a machine's route a
      // ride-ender is not a hazard, it is a wall — the prover refuses it.
      girderBeam(32, 38, 7),
      swingBall(35, 8),

      hazard(40, 'steam'),                // telegraphed, on the way to the pit
      pit(46, 48),                        // 3 wide — a full tile inside the run
      bolts([[11, 46], [11, 47], [11, 48]]),

      ledge(52, 57, 5),
      bolts([[11, 53], [11, 54], [11, 55], [11, 56]]),

      // THE MACHINE SITS ON THE ROUTE, FACING ITS JOB (DESIGN.md §8.0).
      // It used to park at x=61 with the bank at 84 — so you walked past it,
      // met a wall you could not jump, and had to walk twenty-three tiles
      // BACK to fetch it. That is the lock-and-key shape the pivot retired,
      // and it is what the playtest felt as an impossible blocker. Now you
      // meet it a short drive short of the work and ride forwards into it.
      machine('excavator', 77, [70, 92]),

      // Scenery you pass under. A ball used to hang off this beam, on the
      // machine's route, and it threw you out of the cab often enough that
      // the level read as an impossible wall.
      girderBeam(66, 72, 7),
      robot(66, 72),                      // moved off the machine's parking spot
      bolts([[13, 67], [13, 68], [13, 69]]),

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

      hazard(16, 'steam'),                // on the KID's stretch, before the pit

      // UP, then back down (DESIGN.md §4.2). A ladder off the floor to a
      // high walk, bolts along it that the ground route never reaches, and
      // a two-tile step down at the far end so you rejoin the level without
      // needing the ladder again.
      // the ladder must reach PAST the walk it serves, or he climbs to the
      // last rung and bumps his head on the thing he was climbing to
      ladder(26, 4, 11),
      ledge(27, 34, 10),
      bolts([[6, 28], [6, 30], [6, 32]]),   // only reachable off the ladder

      robot(38, 41),
      bolts([[13, 39], [13, 40]]),

      // §8.0 again: parked beside the stack it has to lift, not eighteen
      // tiles short of it. The steam vent used to stand at x=44, between the
      // machine and that stack — and a vent throws you out of the cab exactly
      // as the ball does, so it was the same bug wearing different art. The
      // prover knows about every ride-ender now, not just the ball.
      machine('excavator', 43, [38, 57]),
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

      pit(28, 30),                        // 3 wide — a full tile of slack
      bolts([[11, 28], [11, 29], [11, 30]]),

      ledge(36, 42, 6),
      bolts([[10, 37], [10, 38], [10, 39]]),

      hazard(48, 'steam'),
      mound(52, 58, 2),
      robot(62, 70),

      // §8.0: within sight of the wall, facing it
      machine('crane', 74, [68, 92]),

      brickWall(80, 84, 4),               // four tiles of brick
      bolts([[12, 88], [12, 89]]),
      exitAt(92.5),

      shot(24, 36, { z: 38, y: 3.0 }),
      shot(60, 96, { z: 43, y: 3.6, lead: 2.0 }),
    ],
  },
];
