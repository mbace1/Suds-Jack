// EERI — Worlds 3 and 4 greybox rooms.
//
// These six rooms deliberately spend ONLY mechanics already proved by Worlds
// 1-2 and the Gizmo Lab. The eventual World-3 cherry-picker / World-4 light
// rig can replace the familiar machine proxies later without holding up the
// thing we need now: six addressable, finishable layouts to playtest.
//
// World 3 = FOREST CLEARING AND DIGS: vertical, springy, timber/root rhythm.
// World 4 = EVENING SITE UNDER LIGHTS: belts, work decks and a final full-kit
// exam. Visual identity is a separate, non-collision dressing layer.

import {
  ground, ledge, girderBeam, pit, bank, brickWall, chasm,
  machine, robot, hopper, roller, swingBall, startAt, exitAt, shot,
  girderStack, scaffold, checkpoint, flagAt, golden, belt, tarp, hoist,
  boltRun, boltArc, boltCol, GROUND,
} from './parts.js?v=33';

// THE TRAIL IS THE LEVEL TALKING, so it cannot be the same trail in six
// levels. What was here was four quiet 25-bolt blocks — 100 exactly, laid at
// columns 6-79 in every room whatever stood there. It was honest greybox
// scaffolding and it did the job it was for (route and beat shape first), but
// it left the bolts saying nothing: hanging over pits, ignoring every shelf
// the level wants you standing on, and stopping dead at column 79 so the
// whole ride beat was bare.
//
// Each room now lays its own, to the rules Level 1 set:
//
//   * a RUN out of the gate — the level saying which way it goes before it
//     asks you for anything;
//   * an ARC over each hazard, because following the bolts IS the jump's
//     timing (boltArc rises and comes back down; it teaches, it does not
//     announce);
//   * a COLUMN wherever the answer is up — over a tarp, beside a hoist
//     shaft — since a stack of bolts is the only shape that says "the floor
//     throws you here";
//   * a RUN along every deck the level built, at feet and head height, so
//     climbing is paid for rather than merely permitted; and
//   * bolts PAST the thing the machine clears — you cannot reach those until
//     the bank is dug or the girder is seated, which is the ride's receipt.
//
// Still exactly 100 a room (`check()` refuses ninety-nine under a HUD that
// says a hundred) and still three golden ones off the walking line.

export const WORLD34_ROOMS = [
  // ── LEVEL 7 / WORLD 3-1 — THE CUT BANK ──────────────────────────────
  // One idea: THE TARP finally becomes a campaign verb. In the forest it
  // reads naturally as a springy sheet/root crossing: safe first, then a
  // higher reward, then paired with familiar enemies and a small pit.
  {
    name: 'LEVEL 7 — THE CUT BANK',
    idea: 'the springy forest floor',
    parts: [
      ground(), startAt(4.5),
      boltRun(5, 6, 13), boltRun(6, 6, 13),

      // 1 · INTRODUCE — one low tarp on empty floor. The bolts stand UP over
      // it: a column is the only shape that says the floor throws you.
      tarp(14, 17, GROUND - 1),
      boltCol(15, 6, 10),
      golden(8, [16]),

      boltRun(5, 19, 27), boltRun(6, 19, 27),

      // 2 · VARY — a second bounce opens a clearly higher timber/root shelf,
      // and the shelf is paid for at feet and head height once you are on it.
      tarp(29, 32, GROUND - 1),
      boltCol(31, 6, 10),
      ledge(34, 40, 9),
      boltRun(11, 34, 40), boltRun(12, 39, 40),
      golden(12, [36]),

      checkpoint(46),
      boltRun(5, 42, 47), boltRun(6, 42, 47),

      // 3 · COMBINE — old stomp timing, then one generous three-tile cut.
      // Each arc IS the jump it wants.
      hopper(48, 53),
      boltArc(5, 48, 53, 2),
      pit(56, 58),
      boltArc(5, 55, 59, 2),
      tarp(61, 64, GROUND - 1),
      boltCol(63, 6, 9),

      // 4 · RIDE — excavator + earth bank is the greybox proxy for the
      // forest-clearing/dig machine payoff.
      machine('excavator', 68, [60, 92]),
      boltRun(5, 66, 72), boltRun(6, 68, 72),
      bank(84, 88, 3),
      boltRun(5, 89, 92), boltRun(6, 89, 92),   // only once it is dug
      golden(7, [90]),
      flagAt(93),

      shot(10, 34, { z: 39, y: 3.2 }),
      shot(30, 62, { z: 42, y: 3.8, lead: 1.7 }),
      shot(60, 96, { z: 43, y: 3.6, lead: 2.0 }),
    ],
  },

  // ── LEVEL 8 / WORLD 3-2 — THE TIMBER LIFT ───────────────────────────
  // One idea: THE HOIST as the main route instead of an optional secret.
  // The forest art can later turn these into timber-working lifts / braces;
  // the collision contract stays the already-proved moving platform.
  {
    name: 'LEVEL 8 — THE TIMBER LIFT',
    idea: 'the hoist as a vertical route',
    parts: [
      ground(), startAt(4.5),
      boltRun(5, 6, 12), boltRun(6, 6, 12),

      // 1 · INTRODUCE — board on flat floor, step onto one obvious shelf.
      // The column beside the shaft is the instruction: this one goes up.
      hoist(14, 15, GROUND, 9, 4),
      boltCol(13, 5, 10),
      ledge(16, 22, 9),
      boltRun(11, 16, 22), boltRun(12, 20, 22),
      golden(12, [19]),

      boltRun(5, 24, 29), boltRun(6, 24, 29),

      // 2 · VARY — taller lift and longer shelf; still no hazard in the shaft.
      hoist(30, 31, GROUND, 10, 4.4),
      boltCol(29, 7, 11),
      ledge(32, 38, 10),
      boltRun(12, 32, 38), boltRun(13, 36, 38),
      golden(13, [35]),

      checkpoint(46),
      boltRun(5, 41, 47), boltRun(6, 41, 47),

      // 3 · COMBINE — known gap + hopper after coming back to ground.
      pit(50, 52),
      boltArc(5, 49, 53, 2),
      hopper(55, 59),
      boltArc(5, 55, 59, 2),

      // 4 · RIDE — the existing span is an honest proxy for moving/placing
      // a felled log across a clearing. The row over the chasm is the
      // receipt: it is not collectable until the girder is seated.
      machine('excavator', 64, [60, 70]),
      girderStack(68),
      boltRun(5, 62, 66),
      chasm(72, 79),
      boltRun(5, 73, 79),
      boltRun(5, 82, 88),
      golden(7, [90]),
      flagAt(93),

      shot(10, 30, { z: 40, y: 3.5 }),
      shot(28, 54, { z: 44, y: 4.2, lead: 1.7 }),
      shot(54, 96, { z: 43, y: 3.7, lead: 2.0 }),
    ],
  },

  // ── LEVEL 9 / WORLD 3-3 — ROOT WORKS ─────────────────────────────────
  // No new verb: tarp + hoist + old enemies, then a heavy clearing climax.
  // The crane/wall is a proxy for the eventual second World-3 ride.
  {
    name: 'LEVEL 9 — ROOT WORKS',
    idea: 'forest verticality together',
    parts: [
      ground(), startAt(4.5),
      boltRun(5, 6, 12), boltRun(6, 6, 12),

      // 1 · PAIR — bounce through a low root pocket, and the shelf it opens
      // is worth standing on rather than merely reachable.
      tarp(14, 17, GROUND - 1),
      boltCol(15, 6, 10),
      ledge(19, 25, 9),
      boltRun(11, 19, 25), boltRun(12, 22, 25),
      golden(8, [16]),

      boltRun(5, 27, 29), boltRun(6, 27, 29),

      // 2 · VARY — hoist to the highest work shelf of the world.
      hoist(30, 31, GROUND, 10, 4.2),
      boltCol(29, 7, 11),
      ledge(32, 39, 10),
      boltRun(12, 32, 39), boltRun(13, 37, 39),
      golden(13, [36]),

      checkpoint(46),
      boltRun(5, 41, 47), boltRun(6, 41, 47),

      // 3 · COMBINE — a generous cut and familiar spacing enemy. The run
      // under the roller is deliberately flat: the bolts do not dodge for
      // you, the spacing does.
      pit(50, 52),
      boltArc(5, 49, 53, 2),
      roller(55, 60),
      boltRun(5, 55, 60),

      // 4 · WORLD PEAK — familiar crane smash, big flag, clock-out gate.
      machine('crane', 68, [66, 79]),
      boltRun(5, 62, 67), boltRun(6, 63, 67),
      brickWall(80, 84, 4),
      boltRun(5, 85, 90), boltRun(6, 85, 90),   // only once the wall is down
      golden(7, [86]),
      flagAt(88, true),
      exitAt(92.5),

      shot(10, 30, { z: 40, y: 3.5 }),
      shot(28, 56, { z: 44, y: 4.1, lead: 1.8 }),
      shot(54, 96, { z: 43, y: 3.7, lead: 2.0 }),
    ],
  },

  // ── LEVEL 10 / WORLD 4-1 — THE NIGHT SHIFT ───────────────────────────
  // One idea: THE BELT. It has lived in the lab but not the campaign: first
  // it helps, then resists, then sits under a familiar enemy rhythm.
  {
    name: 'LEVEL 10 — THE NIGHT SHIFT',
    idea: 'the conveyor belt',
    parts: [
      ground(), startAt(4.5),
      boltRun(5, 6, 12), boltRun(6, 6, 12),

      // 1 · INTRODUCE — carried toward the level, no threat. Seven bolts
      // laid along the belt cost you nothing: it is doing the walking.
      belt(14, 20, GROUND - 1, 1),
      boltRun(5, 14, 20), boltRun(6, 14, 16),
      golden(7, [18]),

      boltRun(5, 22, 26), boltRun(6, 22, 26),

      // 2 · VARY — the same floor now pushes against the player, and it is
      // the SAME seven bolts on the same row. Twice the work for the same
      // pay is the whole lesson of a belt, said without a word.
      belt(28, 34, GROUND - 1, -1),
      boltRun(5, 28, 34),
      golden(7, [33]),

      checkpoint(46),
      boltRun(5, 37, 45), boltRun(6, 37, 45),

      // 3 · COMBINE — helpful belt into a known hopper spacing read.
      belt(48, 54, GROUND - 1, 1),
      boltRun(5, 48, 54), boltRun(6, 48, 54),
      hopper(56, 60),
      boltArc(5, 56, 60, 2),

      // 4 · RIDE — familiar dig in a new night-shift context. This is a
      // placeholder for the eventual World-4 floodlight-rig machine beat.
      machine('excavator', 68, [64, 92]),
      boltRun(5, 63, 69), boltRun(6, 63, 69),
      bank(84, 88, 3),
      boltRun(5, 89, 92), boltRun(6, 89, 92),   // only once it is dug
      golden(7, [90]),
      flagAt(93),

      shot(10, 34, { z: 39, y: 3.1 }),
      shot(32, 62, { z: 41, y: 3.5, lead: 1.8 }),
      shot(60, 96, { z: 43, y: 3.6, lead: 2.0 }),
    ],
  },

  // ── LEVEL 11 / WORLD 4-2 — THE LIT SCAFFOLD ──────────────────────────
  // One idea: work-height rhythm under lights. Hoists are now familiar, so
  // this level varies them with a scaffold and one swinging-load read.
  {
    name: 'LEVEL 11 — THE LIT SCAFFOLD',
    idea: 'work decks under the lights',
    parts: [
      ground(), startAt(4.5),
      boltRun(5, 6, 12), boltRun(6, 6, 12),

      // 1 · INTRODUCE — short lift to a low service deck.
      hoist(14, 15, GROUND, 8, 4),
      boltCol(13, 5, 9),
      ledge(16, 22, 8),
      boltRun(10, 16, 22), boltRun(11, 20, 22),
      golden(11, [19]),

      boltRun(5, 24, 29), boltRun(6, 24, 29),

      // 2 · VARY — taller work deck, then a familiar ladder back into flow.
      hoist(30, 31, GROUND, 10, 4.5),
      boltCol(29, 7, 11),
      ledge(32, 38, 10),
      boltRun(12, 32, 38), boltRun(13, 36, 38),
      golden(13, [35]),
      ...scaffold(40, 44, 7),
      boltRun(8, 40, 44),

      checkpoint(46),
      boltRun(5, 46, 48),

      // 3 · COMBINE — one hanging-load read, placed well before the ride.
      // The row runs straight under the load, so the bolts are taken on the
      // ball's clock rather than yours.
      girderBeam(49, 55, 10),
      swingBall(52, 11),
      boltRun(5, 49, 55),
      roller(56, 60),
      boltRun(5, 56, 60),

      // 4 · RIDE — bridge a dark work gap. Later this can become a light-rig
      // traversal without changing the level's first three beats.
      machine('excavator', 64, [61, 70]),
      girderStack(68),
      boltRun(5, 62, 67),
      chasm(72, 79),
      boltRun(5, 73, 79),
      boltRun(5, 82, 88), boltRun(6, 85, 88),
      golden(7, [90]),
      flagAt(93),

      shot(10, 30, { z: 41, y: 3.6 }),
      shot(28, 56, { z: 45, y: 4.3, lead: 1.7 }),
      shot(54, 96, { z: 44, y: 3.8, lead: 2.0 }),
    ],
  },

  // ── LEVEL 12 / WORLD 4-3 — LAST LIGHTS ───────────────────────────────
  // The final greybox exam. No new mechanic: belt → tarp, climb/stomp,
  // hoist, then the known crane. It is deliberately broad rather than hard.
  {
    name: 'LEVEL 12 — LAST LIGHTS',
    idea: 'the full worksite kit together',
    parts: [
      ground(), startAt(4.5),
      boltRun(5, 6, 12), boltRun(6, 6, 12),

      // 1 · PAIR — belt hands directly into the springy floor, and the trail
      // does the same: a flat run that turns into a column at the tarp.
      belt(14, 19, GROUND - 1, 1),
      boltRun(5, 14, 19),
      tarp(20, 22, GROUND - 1),
      boltCol(22, 6, 10),
      golden(8, [21]),

      boltRun(5, 24, 27), boltRun(6, 24, 27),

      // 2 · VARY — familiar climb with a hopper on the upper work deck.
      ...scaffold(28, 34, 7),
      boltRun(8, 28, 34), boltRun(9, 33, 34),
      robot(30, 33, 'hopper', 8),
      golden(10, [32]),

      checkpoint(46),
      boltRun(5, 37, 45), boltRun(6, 37, 45),

      // 3 · COMBINE — last vertical lift, then a spacing enemy on the floor.
      hoist(50, 51, GROUND, 10, 4.3),
      boltCol(49, 5, 11),
      ledge(52, 58, 10),
      boltRun(12, 52, 58),
      roller(60, 64),
      boltRun(5, 60, 64), boltRun(6, 61, 64),

      // 4 · FINAL RIDE — one readable smash, then the final big flag/gate.
      machine('crane', 68, [66, 79]),
      boltRun(5, 65, 69),
      brickWall(80, 84, 4),
      boltRun(5, 85, 90), boltRun(6, 85, 90),   // only once the wall is down
      golden(7, [86]),
      flagAt(88, true),
      exitAt(92.5),

      shot(10, 30, { z: 40, y: 3.4 }),
      shot(28, 56, { z: 45, y: 4.2, lead: 1.7 }),
      shot(54, 96, { z: 44, y: 3.8, lead: 2.0 }),
    ],
  },
];
