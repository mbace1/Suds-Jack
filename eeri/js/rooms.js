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
// it is why these three rooms are laid out the way they are:
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

import {
  ground, mound, ledge, girderBeam, pit, bank, brickWall, chasm,
  machine, robot, hopper, roller, hazard, swingBall, startAt, exitAt, shot,
  girderStack, scaffold, checkpoint, flagAt, golden, belt, tarp,
  boltRun, boltArc, boltCol,
} from './parts.js?v=4';

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

      // ── 4 · TEST, then THE RIDE ── the excavator is the peak, and it
      // sits ON THE ROUTE, FACING THE BANK (§8.0): you meet it with the job
      // in view, board where you stand, and ride forwards four tiles into
      // it. It used to park at 63 — a 21-tile walk-back once the bank
      // stopped you, which is the lock-and-key shape the pivot retired.
      hazard(60, 'steam'),
      girderBeam(66, 72, 7),
      boltRun(5, 64, 69),
      boltRun(6, 64, 69),
      boltRun(5, 70, 73),
      robot(68, 74),
      boltRun(5, 74, 79),
      machine('excavator', 80, [76, 92]),
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
      roller(68, 74),
      boltRun(5, 68, 75),
      boltRun(6, 68, 75),
      // the crane parks ON the route, three tiles short of its wall (§8.0):
      // read the swing, board, and the first strike is seconds away. It
      // used to park at 66 — a 14-tile walk-back.
      machine('crane', 77, [34, 92]),
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
    boltRun(5, 54, 62),

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
    boltRun(5, 86, 91),
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
