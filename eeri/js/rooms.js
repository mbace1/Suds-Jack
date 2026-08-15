// EERI — the levels.
//
// Every room is a list of known-good pieces from js/parts.js, and nothing
// here restates a rule: a pit knows it is a hole and that a machine will not
// drive into one, a ladder knows it needs a foot and a landing, a bank knows
// it needs a bucket. `check()` walks each of these against the kid's real
// reach budget, so a room that cannot be finished — or a bolt that cannot be
// had — fails `test/rooms.mjs` rather than stranding somebody halfway.
//
// THE SHAPE OF A LEVEL (DESIGN §4, the owner's Mario/Yoshi direction), and
// it is why these rooms are laid out the way they are:
//
//   ONE IDEA PER LEVEL, IN FOUR BEATS. Introduce it alone and safe · vary
//   it · combine it with something already known · test it once, at the
//   peak. A level that introduces two ideas is two levels.
//
// The beats are marked below because the marks are the only thing that
// stops beat 2 quietly becoming another beat 1. The RIDE sits at beat 3–4,
// in the back half — `check()` enforces that much, since a ride that opens
// a level is a level whose peak is its first minute.
//
// What each level teaches:
//   1 — THE STOMP. Small things you land on. Nothing else is new.
//   2 — THE CLIMB. Ladders and decks; the room stops being a corridor.
//   3 — BOTH, and the crane. The big one, and the world's own ending.
//   4 / WORLD 2-1 — THE WADE. Water can be floor, slowdown, or a soft reset.
//   5 / WORLD 2-2 — THE PIPE. A route can go through the scenery, not over it.
//   6 / WORLD 2-3 — THE PAIRING. Water + pipes + hoist, then the world ending.

import {
  ground, mound, ledge, girderBeam, pit, bank, brickWall, chasm,
  machine, robot, hopper, roller, hazard, swingBall, startAt, exitAt, shot,
  girderStack, scaffold, checkpoint, flagAt, golden, belt, tarp, shallow, deep, pipe,
  bucketBot, hoist,
  boltRun, boltArc, boltCol, GROUND,
} from './parts.js?v=24';

export const ROOMS = [
  // ── LEVEL 1 — GROUNDWORKS ───────────────────────────────────────────
  // THE STOMP. A hopper is a rhythm you either wait out or land on, and
  // landing on it throws you higher than a jump ever does — which is the
  // whole reason the verb exists and the reason the first secret is up
  // where only a bounce feels natural.
  {
    name: 'LEVEL 1 — GROUNDWORKS',
    idea: 'the stomp',
    parts: [
      ground(),
      startAt(4.5),
      // a trail out of the gate: bolts at head height are collected by
      // walking, which is how the level says "this way" without a word
      boltRun(5, 8, 13),

      // ── 1 · INTRODUCE ── one hopper, open floor, nothing else on screen.
      // The arc over it is the timing, drawn: follow the bolts and the jump
      // is already right.
      hopper(15, 21),
      boltArc(5, 15, 20, 2),
      boltRun(5, 16, 19),
      boltRun(5, 22, 24),

      // ── 2 · VARY ── the same thing from a step, then two of them at
      // different spacings, and a deck to read them from.
      mound(25, 30, 2),
      boltRun(6, 25, 30),
      boltRun(7, 26, 29),
      ledge(31, 35, 6),
      boltRun(8, 31, 35),
      boltRun(9, 32, 34),
      golden(9, [33]),                    // one jump off that deck
      hopper(33, 38),
      boltRun(5, 36, 38),
      hopper(42, 46),
      boltRun(5, 39, 41),
      boltRun(5, 42, 46),
      // The ball hangs where only the KID ever walks. It used to hang at 70,
      // squarely across the excavator's run from its park at 63 to the bank
      // at 84 — a hit takes the ride, so the ride kept ending on the way to
      // its own job. Found by somebody actually playing it.
      girderBeam(36, 42, 7),
      swingBall(39, 8),

      // ── 3 · COMBINE ── the hole and the hopper in one breath, and the
      // golden bolt is IN the hole: a pit costs you nothing but the walk
      // back, so going in on purpose is a fair thing to ask.
      pit(48, 50),
      boltArc(5, 47, 51, 2),
      golden(4, [49]),
      checkpoint(53),
      boltRun(5, 54, 58),
      boltRun(6, 54, 57),
      boltRun(5, 59, 63),

      // ── 4 · TEST, then THE RIDE ── the excavator is the peak. It is not
      // a puzzle: board it, dig the bank out of the way, step off.
      hazard(60, 'steam'),
      machine('excavator', 63, [50, 92]),
      girderBeam(66, 72, 7),
      boltRun(5, 64, 69),
      boltRun(6, 64, 69),
      boltRun(5, 70, 73),
      robot(74, 80),
      boltRun(5, 74, 79),
      boltRun(6, 81, 83),

      bank(84, 88, 3),                    // 3 tiles — above his jump
      boltRun(5, 89, 92),                 // only once it is dug
      boltRun(6, 89, 92),
      golden(6, [90]),
      flagAt(93),

      shot(40, 52, { z: 37.5, y: 3.0 }),
      shot(52, 74, { z: 41, y: 3.4, lead: 2.2 }),
      shot(76, 96, { z: 42, y: 3.6, lead: 2.0 }),
    ],
  },

  // ── LEVEL 2 — THE SCAFFOLD ──────────────────────────────────────────
  // THE CLIMB. Every ladder here goes up and comes back down, because a
  // level that ends higher than it started is a level whose camera never
  // gets home (DESIGN §4.2). The stomp is not re-taught — it is simply
  // there, underneath, as the thing you already know.
  {
    name: 'LEVEL 2 — THE SCAFFOLD',
    idea: 'the climb',
    parts: [
      ground(),
      startAt(4.5),
      boltRun(5, 7, 10),

      // ── 1 · INTRODUCE ── one ladder, one deck, nothing under it. The
      // bolts run UP the rungs, so the first climb is a thing you do for a
      // reward rather than a thing you are told about.
      ...scaffold(12, 18, 7),
      boltCol(12, 5, 8),
      boltRun(5, 13, 18),
      boltRun(9, 13, 18),

      // ── 2 · VARY ── a hole under the next one, and a taller climb. The
      // deck is the way over the hole; the hole is three tiles, so the jump
      // is also the way over the hole. Both are right.
      pit(20, 22),
      boltArc(5, 19, 23, 2),
      boltArc(6, 19, 23, 2),
      ...scaffold(26, 32, 9),
      boltCol(26, 5, 10),
      boltRun(5, 27, 32),
      boltRun(11, 27, 32),
      golden(12, [30]),

      // ── 3 · COMBINE ── what is already known, underneath what is new: a
      // roller trundles the floor you would have walked, and the deck you
      // just learned to climb passes over the top of it.
      hazard(24, 'steam'),
      hopper(30, 33),
      roller(35, 41),
      boltRun(5, 34, 38),
      boltRun(6, 34, 37),
      ...scaffold(43, 48, 6),
      boltRun(5, 43, 48),
      boltRun(8, 44, 48),
      boltRun(5, 50, 55),
      checkpoint(46),

      // ── 4 · THE RIDE ── the span. The gap past the stack is past both of
      // them: no jump reaches it and the machine refuses a cliff, so the
      // only way over is a girder the machine carries there and lowers in.
      machine('excavator', 52, [44, 57]),
      girderStack(48),
      chasm(58, 65),                      // 8 wide — machine-shaped
      boltRun(5, 59, 64),                 // only over the span
      golden(7, [62]),

      // …and down again, on the far side
      ...scaffold(70, 75, 6),
      boltCol(70, 5, 7),
      boltRun(8, 71, 75),
      golden(9, [73]),
      hopper(78, 84),
      boltArc(5, 78, 83, 2),
      boltRun(5, 86, 91),
      flagAt(93),

      shot(16, 26, { z: 37.5, y: 3.0 }),
      shot(42, 72, { z: 44, y: 3.8, lead: 2.2 }),
    ],
  },

  // ── LEVEL 3 — THE HIGH WALL ─────────────────────────────────────────
  // THE BIG ONE (DESIGN §4.2): no new verb, both of the old ones, and the
  // crane. Its flag is the big one, and past it is the gate — the world's
  // curtain, not the level's, so this is the only room that ends with Eeri
  // clocking out and walking through.
  {
    name: 'LEVEL 3 — THE HIGH WALL',
    idea: 'both verbs, and the crane',
    parts: [
      ground(),
      startAt(4.5),
      boltRun(5, 7, 12),

      // ── 1 · INTRODUCE (the pairing, not a verb) ── a hopper on a deck:
      // the climb takes you to it and the stomp takes it off.
      ...scaffold(15, 21, 6),
      boltCol(15, 5, 7),
      robot(17, 20, 'hopper', 7),
      boltRun(5, 16, 21),
      boltRun(8, 16, 21),
      golden(9, [19]),

      // ── 2 · VARY ── the hole, with the roller on the far side of it.
      boltRun(5, 23, 26),
      pit(28, 30),
      boltArc(5, 27, 31, 2),
      roller(33, 40),
      boltRun(5, 33, 39),
      boltRun(6, 33, 39),

      // ── 3 · COMBINE ── a deck over a hopper, a hopper on the deck, and
      // the ladder is the only way between them.
      ...scaffold(42, 48, 6),
      boltRun(5, 43, 48),
      boltRun(8, 43, 48),
      boltRun(9, 44, 47),
      golden(10, [45]),
      hopper(43, 47),
      checkpoint(50),
      boltRun(5, 50, 51),
      boltRun(6, 50, 51),
      mound(52, 58, 2),
      boltRun(7, 52, 57),
      boltRun(5, 62, 63),
      hazard(60, 'steam'),

      // ── 4 · THE RIDE ── the crane, and the wall. The ball that swings at
      // you unmanned is the ball you swing at the wall once the cab is
      // yours: the room's one new object is a whole verb.
      machine('crane', 66, [34, 92]),
      roller(70, 76),
      boltRun(5, 68, 75),
      boltRun(6, 68, 75),
      golden(6, [78]),

      brickWall(80, 84, 4),               // four tiles of brick
      boltRun(5, 86, 91),
      boltRun(6, 86, 91),
      flagAt(88, true),                   // the big flag — the world's peak
      exitAt(92.5),                       // …and the gate past it: clocking out

      shot(24, 36, { z: 38, y: 3.0 }),
      shot(60, 96, { z: 43, y: 3.6, lead: 2.0 }),
    ],
  },

  // ── LEVEL 4 / WORLD 2-1 — THE WET TRENCH ────────────────────────────
  // WATER is the one new idea. Shallow water first slows the run with no
  // threat; deep water then asks for the same jump the player already owns
  // and returns Eeri to the near lip rather than hurting him.
  //
  // The excavator/bank at the peak is intentionally a GREYBOX PROXY for the
  // planned pump/flooded-trench ride. It uses a verb already proved in World
  // 1, so this level can be played and tuned now while art/engineering swap
  // the proxy for the pump later without changing the water lesson.
  {
    name: 'LEVEL 4 — THE WET TRENCH',
    idea: 'water as a floor',
    parts: [
      ground(),
      startAt(4.5),
      boltRun(5, 6, 13),
      boltRun(6, 6, 13),

      // ── 1 · INTRODUCE ── a single broad shallow puddle on flat ground.
      // Nothing attacks, jumps or moves here: walking slower IS the lesson.
      shallow(15, 22),
      boltRun(5, 15, 22),
      boltRun(6, 15, 22),
      golden(7, [20]),

      // ── 2 · VARY ── first bring a known hopper into the slow floor, then
      // put a short DEEP cut beyond a dry takeoff and draw the jump in bolts.
      shallow(25, 31),
      hopper(27, 31),
      boltRun(5, 25, 31),
      boltRun(6, 25, 31),
      deep(35, 36),
      boltArc(5, 34, 37, 2),
      golden(7, [35]),
      boltRun(5, 38, 45),
      boltRun(6, 38, 45),
      checkpoint(46),

      // ── 3 · COMBINE ── wade, regain dry footing, jump the deep channel,
      // then meet a roller on the far bank. The dry strip before the jump is
      // deliberate: this is a reading/timing test, not a speed-budget trap.
      shallow(48, 50),
      boltRun(5, 48, 50),
      boltRun(6, 48, 50),
      boltRun(5, 51, 52),
      boltRun(6, 51, 52),
      deep(54, 55),
      boltArc(5, 53, 56, 2),
      roller(59, 64),
      boltRun(5, 59, 64),
      boltRun(6, 59, 64),

      // ── 4 · TEST / RIDE ── familiar tool use, new context. For this
      // greybox the tall silt bank stands in for the flooded trench lock.
      machine('excavator', 68, [60, 92]),
      boltRun(5, 67, 70),
      bank(82, 86, 3),
      boltRun(5, 88, 91),
      golden(7, [90]),
      flagAt(93),

      shot(12, 32, { z: 38, y: 3.0 }),
      shot(32, 60, { z: 40.5, y: 3.3, lead: 1.8 }),
      shot(58, 96, { z: 42, y: 3.5, lead: 2.0 }),
    ],
  },

  // ── LEVEL 5 / WORLD 2-2 — THE PIPE RUN ──────────────────────────────
  // THE PIPE is the only new idea. First both mouths fit in one view, then
  // the tube changes height, then it crosses water. The back-half span uses
  // the existing excavator as a greybox stand-in for the pipe-layer: same
  // physical job, no second lesson smuggled into the level.
  {
    name: 'LEVEL 5 — THE PIPE RUN',
    idea: 'the pipe',
    parts: [
      ground(),
      startAt(4.5),
      boltRun(5, 6, 11),
      boltRun(6, 6, 11),

      // ── 1 · INTRODUCE ── both mouths visible, flat floor, no hazard.
      // The player sees the destination before choosing to disappear into it.
      pipe({ c: 12, cy: GROUND }, { c: 20, cy: GROUND }),
      boltRun(5, 12, 20),
      boltRun(6, 12, 20),

      // ── 2 · VARY ── the same object now changes elevation. The upper
      // mouth lands on a deck with a ladder down, so the pipe never traps.
      boltRun(5, 23, 30),
      boltRun(6, 23, 30),
      pipe({ c: 27, cy: GROUND }, { c: 34, cy: 8 }),
      ledge(32, 38, 7),
      ...scaffold(38, 42, 7),
      boltRun(9, 32, 42),
      boltRun(10, 34, 38),
      golden(10, [35]),
      checkpoint(44),

      // ── 3 · COMBINE ── use the tube as an obvious alternate crossing of
      // deep water, then arrive beside the sleeping bucket. The ordinary
      // jump remains legal: the pipe is an invitation, never a forced trick.
      boltRun(5, 43, 47),
      boltRun(6, 43, 47),
      pipe({ c: 47, cy: GROUND }, { c: 54, cy: GROUND }),
      deep(49, 52),
      boltArc(5, 48, 53, 2),
      golden(7, [50]),
      bucketBot(55),
      boltRun(5, 54, 60),
      boltRun(6, 54, 60),

      // ── 4 · TEST / RIDE ── the pipe-layer's intended job is mechanically
      // the known span verb, so the excavator is an honest greybox proxy.
      machine('excavator', 64, [58, 70]),
      girderStack(66),
      boltRun(5, 62, 65),
      chasm(71, 78),
      boltRun(5, 81, 84),
      golden(7, [84]),
      flagAt(93),

      shot(10, 30, { z: 38, y: 3.0 }),
      shot(28, 58, { z: 42, y: 3.8, lead: 1.8 }),
      shot(56, 96, { z: 43, y: 3.5, lead: 2.1 }),
    ],
  },

  // ── LEVEL 6 / WORLD 2-3 — THE PUMPHOUSE ─────────────────────────────
  // No new verb. This is the world's exam: water, pipes and the hoist share
  // the same spaces. The hoist is optional for the main line but owns a
  // golden-bolt route, so a child can finish without waiting for a cycle and
  // a confident player has a reason to master it.
  //
  // The crane/wall at the end is another greybox ride proxy: a familiar,
  // readable heavy-machine climax against the pumphouse shell while the
  // final World-2 ride art remains a separate lane.
  {
    name: 'LEVEL 6 — THE PUMPHOUSE',
    idea: 'water, pipes, and the hoist together',
    parts: [
      ground(),
      startAt(4.5),
      boltRun(5, 6, 12),
      boltRun(6, 6, 12),

      // ── 1 · PAIR ── a pipe carries you to a deck over deep water. You can
      // still make the jump underneath; the pipe shows the safer authored way.
      pipe({ c: 14, cy: GROUND }, { c: 22, cy: 8 }),
      deep(17, 20),
      boltRun(5, 14, 21),
      boltRun(6, 14, 21),
      golden(7, [18]),
      ledge(22, 28, 7),
      ...scaffold(29, 33, 7),
      boltRun(9, 22, 28),
      boltRun(9, 30, 33),
      boltRun(10, 23, 27),

      // ── 2 · READ ── the settling pond: similar-looking shallow and deep
      // bands alternate. The last two-tile channel deliberately starts from
      // shallow water but stays inside the reduced wading jump budget.
      shallow(34, 36),
      boltRun(5, 34, 38),
      boltRun(6, 34, 38),
      deep(40, 41),
      boltArc(5, 39, 42, 2),
      shallow(43, 44),
      boltRun(5, 43, 43),
      boltRun(6, 43, 44),
      deep(45, 46),
      boltArc(5, 44, 47, 2),
      checkpoint(48),

      // ── 3 · COMBINE ── shallow approach into the hoist, an upper deck,
      // then a pipe back down beyond another deep channel. The floor route
      // still works; the high route is faster and carries the hidden reward.
      shallow(49, 51),
      boltRun(5, 49, 54),
      boltRun(6, 49, 54),
      hoist(52, 53, GROUND, 10, 4),
      ledge(54, 60, 10),
      pipe({ c: 58, cy: 11 }, { c: 65, cy: GROUND }),
      boltRun(12, 54, 58),
      golden(13, [58]),
      deep(61, 63),
      boltArc(5, 60, 64, 2),
      boltRun(5, 65, 67),

      // ── 4 · WORLD PEAK ── a known crane smash closes the pumphouse, then
      // the big flag and clock-out gate close World 2 rather than just a room.
      machine('crane', 68, [66, 79]),
      boltRun(5, 68, 71),
      brickWall(80, 84, 4),
      boltRun(5, 86, 89),
      golden(7, [88]),
      flagAt(88, true),
      exitAt(92.5),

      shot(10, 32, { z: 39, y: 3.2 }),
      shot(30, 54, { z: 40.5, y: 3.3, lead: 1.7 }),
      shot(50, 72, { z: 45, y: 4.1, lead: 1.8 }),
      shot(66, 96, { z: 43, y: 3.6, lead: 2.0 }),
    ],
  },
];

// ── THE GIZMO LAB ───────────────────────────────────────────────────────
// NOT a level and deliberately not in ROOMS: it is the standalone reference
// for the gizmo kit, the way toko-drop keeps `enemy-lab.html` — "when a
// written brief and the lab disagree, the lab wins".
//
// It exists because of the rule that makes the kit necessary in the first
// place: ONE IDEA PER LEVEL means a new gizmo cannot be dropped into levels
// 1–3 without making each of them two levels. So the kit is proved here and
// spent on levels 4–6, which are due a world-2 backdrop anyway.
//
// It is held to every rule a level is, so a gizmo that cannot be placed
// legally fails the build before it is ever authored into a level.
export const LAB = {
  name: 'GIZMO LAB',
  idea: 'the kit, proved before it is spent',
  parts: [
    ground(),
    startAt(4.5),
    boltRun(5, 6, 11),

    // a belt WITH you, then a belt AGAINST you: the same object, and the
    // whole of its design is which way the chevrons point
    belt(14, 20, 3, 1),
    boltRun(5, 14, 20),
    belt(26, 32, 3, -1),
    boltRun(5, 26, 32),

    // a tarp under a deck it can actually reach, which is the point of the
    // headroom rule — 5.1 tiles of throw wants somewhere to go
    tarp(38, 41, 3),
    boltRun(9, 38, 41),
    ledge(44, 50, 9),
    boltRun(11, 44, 50),
    golden(12, [47]),

    checkpoint(52),

    // WATER, both kinds, proved in the lab before a level spends them.
    // Shallow first and alone — you walk in and you are slow, which is the
    // whole of it. Then deep, which is a hole wearing different paint, with
    // a DRY lip on the near side to be handed back to.
    shallow(54, 58),
    boltRun(5, 54, 58),
    deep(61, 62),
    boltArc(5, 60, 63, 2),

    // …and a PIPE, which is the other way across a thing you would rather
    // not cross: in at 66, out at 75, both mouths on the flat and both
    // visible at once, because a first pipe you cannot see the end of is a
    // trap rather than an invitation.
    pipe({ c: 66, cy: GROUND }, { c: 75, cy: GROUND }),

    // THE BUCKET, asleep beside the pipe's far mouth — which is exactly
    // the beat WORLD2.md §3 level 5 asks for, proved here first. Walk past
    // it and nothing happens; come OUT of the pipe onto the floor beside
    // it and it wakes. That is the lesson in one object: the pipe is the
    // way across, and the way across has a price at the other end.
    bucketBot(77),

    // …and the HOIST, the one gizmo that is not a tile. Two tiles wide, from
    // the floor up to the deck at cy=10, with a clear shaft and somewhere to
    // step off at the top — both ends, which is the contract it inherits
    // from the ladder.
    hoist(86, 87, GROUND, 10, 4),
    ledge(88, 91, 10),
    boltCol(85, 5, 10),

    // …and the two together: a belt that feeds a tarp
    belt(64, 69, 3, 1),
    tarp(70, 72, 3),
    boltRun(8, 70, 73),
    boltRun(5, 64, 69),
    golden(10, [71]),
    ...scaffold(78, 84, 6),
    boltCol(78, 5, 7),
    boltRun(8, 79, 84),
    golden(9, [82]),
    boltRun(6, 86, 91),
    boltRun(6, 54, 62),
    boltRun(4, 6, 11),
    boltRun(6, 14, 20),
    boltRun(7, 26, 32),
    flagAt(93),

    shot(0, 40, { z: 38, y: 3.0 }),
    shot(40, 96, { z: 41, y: 3.4 }),
  ],
};