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
// World 1 is deliberately richer without becoming wider. W=96 is a shared
// level/runtime contract, so this pass expands ROUTE DENSITY: more authored
// height changes, optional lines and readable secrets inside the same length.
//
// What each level teaches:
//   1 — THE STOMP. Small things you land on. Nothing else is new.
//   2 — THE CLIMB. Ladders and decks; the room stops being a corridor.
//   3 — BOTH, and the crane. The big one, and the world's own ending.
//   4 / WORLD 2-1 — THE WADE. Water can be floor, slowdown, or a soft reset.
//   5 / WORLD 2-2 — THE PIPE. A route can go through the scenery, not over it.
//   6 / WORLD 2-3 — THE PAIRING. Water + pipes + hoist, then the world ending.

import {
  ground, mound, ledge, pit, bank, brickWall, chasm,
  machine, robot, hopper, roller, startAt, exitAt, shot,
  girderStack, scaffold, checkpoint, flagAt, golden, belt, tarp, shallow, deep, pipe,
  bucketBot, hoist,
  boltRun, boltArc, boltCol, GROUND,
} from './parts.js?v=23';

export const ROOMS = [
  // ── LEVEL 1 — GROUNDWORKS ───────────────────────────────────────────
  // THE STOMP. This pass removes the old swinging-ball / steam / robot
  // sampler from the teaching half: the first level now spends its attention
  // budget almost entirely on hopper rhythm, then pays it off with the dig.
  //
  // IMPORTANT: the current stomp rebound is NOT higher than a normal jump.
  // No route or secret here requires extra stomp height, so the level remains
  // honest until that separate physics decision is made.
  {
    name: 'LEVEL 1 — GROUNDWORKS',
    idea: 'the stomp',
    parts: [
      ground(),
      startAt(4.5),
      boltRun(5, 7, 13),

      // ── 1 · INTRODUCE ── one hopper in empty space. The bolt arc gives
      // the timing without text; following it naturally lands on the bot.
      hopper(15, 20),
      boltArc(5, 14, 20, 2),

      // ── 2 · VARY ── a two-tile earth step grows into an optional upper
      // work ledge. The lower route keeps the hopper rhythm; the upper line
      // gives confident players a cleaner read and the first hidden reward.
      mound(23, 28, 2),
      boltRun(7, 23, 28),
      ledge(30, 36, 6),
      boltRun(8, 30, 36),
      boltRun(5, 30, 36),
      golden(9, [33]),
      hopper(31, 35),
      hopper(39, 43),
      boltRun(5, 37, 43),
      boltRun(6, 37, 43),

      // ── 3 · COMBINE ── known jump + known stomp around one small pit.
      // The golden is TEASED above the hole rather than placed down inside
      // it, so the game never asks a young player to choose apparent failure.
      pit(46, 48),
      boltArc(5, 45, 49, 2),
      golden(7, [46]),
      hopper(51, 55),
      boltRun(5, 50, 56),
      boltRun(6, 50, 56),
      checkpoint(57),

      // ── 4 · TEST / RIDE ── a quiet runway into the excavator, then its
      // job almost immediately. Nothing ride-ending sits between cab and bank.
      boltRun(5, 58, 64),
      boltRun(6, 58, 64),
      machine('excavator', 70, [64, 79]),
      boltRun(5, 66, 70),
      boltRun(5, 72, 73),
      bank(80, 84, 3),
      boltRun(5, 86, 91),
      boltRun(6, 86, 91),
      golden(7, [89]),
      flagAt(93),

      shot(10, 34, { z: 38, y: 3.0 }),
      shot(30, 58, { z: 40.5, y: 3.4, lead: 1.8 }),
      shot(56, 96, { z: 42, y: 3.6, lead: 2.0 }),
    ],
  },

  // ── LEVEL 2 — THE SCAFFOLD ──────────────────────────────────────────
  // THE CLIMB remains the World-1 benchmark. Expansion here means more
  // deliberate up/over/down route choice, not more mechanics. Every ladder
  // still has an obvious deck, and the machine stays close to its job.
  {
    name: 'LEVEL 2 — THE SCAFFOLD',
    idea: 'the climb',
    parts: [
      ground(),
      startAt(4.5),
      boltRun(5, 7, 11),

      // ── 1 · INTRODUCE ── one clean scaffold with reward above.
      ...scaffold(12, 19, 7),
      boltCol(12, 5, 8),
      boltRun(9, 13, 19),

      // ── 2 · VARY ── the route rises twice. First a pit beside a taller
      // tower, then a low work deck that lets the player practise coming down
      // and choosing upper vs lower travel without adding another verb.
      pit(20, 22),
      boltArc(5, 19, 23, 2),
      ...scaffold(26, 33, 9),
      boltCol(26, 5, 10),
      boltRun(11, 27, 33),
      boltRun(5, 27, 33),
      golden(12, [30]),

      ...scaffold(36, 42, 6),
      boltCol(36, 5, 7),
      boltRun(8, 37, 42),
      boltRun(5, 37, 42),

      // ── 3 · COMBINE ── known roller below, learned climb above. This is
      // the level's densest read, immediately followed by the checkpoint.
      roller(43, 48),
      ...scaffold(44, 50, 7),
      boltCol(44, 5, 8),
      boltRun(9, 45, 50),
      boltRun(5, 51, 55),
      checkpoint(50),

      // ── 4 · THE RIDE ── still the benchmark construction payoff:
      // board, sling, seat, walk over the geometry you just changed.
      machine('excavator', 52, [50, 59]),
      girderStack(56),
      boltRun(6, 54, 58),
      chasm(60, 67),
      boltRun(5, 61, 66),
      golden(7, [64]),

      // A celebratory far-side climb, not a difficulty spike.
      ...scaffold(72, 79, 7),
      boltCol(72, 5, 8),
      boltRun(9, 73, 79),
      golden(10, [77]),
      boltRun(5, 82, 88),
      flagAt(93),

      shot(10, 30, { z: 38, y: 3.0 }),
      shot(26, 52, { z: 43, y: 3.8, lead: 1.8 }),
      shot(48, 76, { z: 44, y: 3.8, lead: 2.0 }),
      shot(70, 96, { z: 41, y: 3.3, lead: 1.5 }),
    ],
  },

  // ── LEVEL 3 — THE HIGH WALL ─────────────────────────────────────────
  // THE WORLD EXAM: known stomp + climb patterns become a larger site, then
  // the crane gets the whole final beat to itself. The old steam + roller
  // cluster beside the crane is gone; nothing competes with wall demolition.
  {
    name: 'LEVEL 3 — THE HIGH WALL',
    idea: 'both verbs, and the crane',
    parts: [
      ground(),
      startAt(4.5),
      boltRun(5, 7, 12),

      // ── 1 · PAIR ── climb TO the hopper. The lower route remains open;
      // the upper route is the confident line and carries the secret.
      ...scaffold(14, 21, 7),
      boltCol(14, 5, 8),
      robot(17, 20, 'hopper', 8),
      boltRun(9, 15, 21),
      boltRun(5, 15, 21),
      golden(10, [19]),

      // ── 2 · VARY ── pit + roller on the floor, then the tallest World-1
      // scaffold. The level alternates horizontal and vertical reads instead
      // of stacking every threat into one screen.
      pit(24, 26),
      boltArc(5, 23, 27, 2),
      roller(29, 35),
      boltRun(5, 29, 35),
      boltRun(6, 29, 35),
      ...scaffold(37, 44, 9),
      boltCol(37, 5, 10),
      boltRun(11, 38, 44),
      golden(12, [42]),

      // ── 3 · COMBINE ── low deck over a hopper, then a short earth rise.
      // This is the final platforming exam before the world spectacle.
      ...scaffold(47, 54, 6),
      boltCol(47, 5, 7),
      boltRun(8, 48, 54),
      boltRun(5, 48, 54),
      hopper(49, 53),
      mound(56, 61, 2),
      boltRun(7, 56, 61),
      checkpoint(62),
      boltRun(5, 62, 66),

      // ── 4 · WORLD PEAK ── crane → wall in eight tiles. No steam vent,
      // no roller and no wandering hazard in the drive. The machine, ball,
      // wall damage and debris get to own the screen.
      machine('crane', 70, [66, 77]),
      boltRun(5, 68, 72),
      boltRun(6, 68, 72),
      brickWall(78, 82, 4),
      boltRun(5, 84, 89),
      golden(7, [86]),
      flagAt(90, true),
      exitAt(93.5),

      shot(10, 30, { z: 39, y: 3.2 }),
      shot(28, 48, { z: 41, y: 3.4, lead: 1.6 }),
      shot(44, 66, { z: 42, y: 3.5, lead: 1.8 }),
      shot(64, 96, { z: 43, y: 3.6, lead: 2.0 }),
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