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
  boltRun, GROUND,
} from './parts.js?v=23';

// Four quiet 25-bolt blocks = exactly 100. Keeping the breadcrumb count
// mechanically boring is intentional in a greybox: playtests should be about
// route/beat shape first, then the final collectible choreography can move.
const hundredTrail = () => [
  boltRun(5, 6, 17), boltRun(6, 6, 17), boltRun(7, 18, 18),
  boltRun(5, 27, 38), boltRun(6, 27, 38), boltRun(7, 39, 39),
  boltRun(5, 48, 59), boltRun(6, 48, 59), boltRun(7, 60, 60),
  boltRun(5, 67, 78), boltRun(6, 67, 78), boltRun(7, 79, 79),
];

export const WORLD34_ROOMS = [
  // ── LEVEL 7 / WORLD 3-1 — THE CUT BANK ──────────────────────────────
  // One idea: THE TARP finally becomes a campaign verb. In the forest it
  // reads naturally as a springy sheet/root crossing: safe first, then a
  // higher reward, then paired with familiar enemies and a small pit.
  {
    name: 'LEVEL 7 — THE CUT BANK',
    idea: 'the springy forest floor',
    parts: [
      ground(), startAt(4.5), ...hundredTrail(),

      // 1 · INTRODUCE — one low tarp on empty floor.
      tarp(14, 17, GROUND - 1),
      golden(8, [16]),

      // 2 · VARY — a second bounce opens a clearly higher timber/root shelf.
      tarp(29, 32, GROUND - 1),
      ledge(34, 40, 9),
      golden(12, [36]),

      checkpoint(46),

      // 3 · COMBINE — old stomp timing, then one generous three-tile cut.
      hopper(48, 53),
      pit(56, 58),
      tarp(61, 64, GROUND - 1),

      // 4 · RIDE — excavator + earth bank is the greybox proxy for the
      // forest-clearing/dig machine payoff.
      machine('excavator', 68, [60, 92]),
      bank(84, 88, 3),
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
      ground(), startAt(4.5), ...hundredTrail(),

      // 1 · INTRODUCE — board on flat floor, step onto one obvious shelf.
      hoist(14, 15, GROUND, 9, 4),
      ledge(16, 22, 9),
      golden(12, [19]),

      // 2 · VARY — taller lift and longer shelf; still no hazard in the shaft.
      hoist(30, 31, GROUND, 10, 4.4),
      ledge(32, 38, 10),
      golden(13, [35]),

      checkpoint(46),

      // 3 · COMBINE — known gap + hopper after coming back to ground.
      pit(50, 52),
      hopper(55, 59),

      // 4 · RIDE — the existing span is an honest proxy for moving/placing
      // a felled log across a clearing.
      machine('excavator', 64, [60, 70]),
      girderStack(68),
      chasm(72, 79),
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
      ground(), startAt(4.5), ...hundredTrail(),

      // 1 · PAIR — bounce through a low root pocket.
      tarp(14, 17, GROUND - 1),
      ledge(19, 25, 9),
      golden(8, [16]),

      // 2 · VARY — hoist to the highest work shelf of the world.
      hoist(30, 31, GROUND, 10, 4.2),
      ledge(32, 39, 10),
      golden(13, [36]),

      checkpoint(46),

      // 3 · COMBINE — a generous cut and familiar spacing enemy.
      pit(50, 52),
      roller(55, 60),

      // 4 · WORLD PEAK — familiar crane smash, big flag, clock-out gate.
      machine('crane', 68, [66, 79]),
      brickWall(80, 84, 4),
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
      ground(), startAt(4.5), ...hundredTrail(),

      // 1 · INTRODUCE — carried toward the level, no threat.
      belt(14, 20, GROUND - 1, 1),
      golden(7, [18]),

      // 2 · VARY — the same floor now pushes against the player.
      belt(28, 34, GROUND - 1, -1),
      golden(7, [33]),

      checkpoint(46),

      // 3 · COMBINE — helpful belt into a known hopper spacing read.
      belt(48, 54, GROUND - 1, 1),
      hopper(56, 60),

      // 4 · RIDE — familiar dig in a new night-shift context. This is a
      // placeholder for the eventual World-4 floodlight-rig machine beat.
      machine('excavator', 68, [64, 92]),
      bank(84, 88, 3),
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
      ground(), startAt(4.5), ...hundredTrail(),

      // 1 · INTRODUCE — short lift to a low service deck.
      hoist(14, 15, GROUND, 8, 4),
      ledge(16, 22, 8),
      golden(11, [19]),

      // 2 · VARY — taller work deck, then a familiar ladder back into flow.
      hoist(30, 31, GROUND, 10, 4.5),
      ledge(32, 38, 10),
      golden(13, [35]),
      ...scaffold(40, 44, 7),

      checkpoint(46),

      // 3 · COMBINE — one hanging-load read, placed well before the ride.
      girderBeam(49, 55, 10),
      swingBall(52, 11),
      roller(56, 60),

      // 4 · RIDE — bridge a dark work gap. Later this can become a light-rig
      // traversal without changing the level's first three beats.
      machine('excavator', 64, [61, 70]),
      girderStack(68),
      chasm(72, 79),
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
      ground(), startAt(4.5), ...hundredTrail(),

      // 1 · PAIR — belt hands directly into the springy floor.
      belt(14, 19, GROUND - 1, 1),
      tarp(20, 22, GROUND - 1),
      golden(8, [21]),

      // 2 · VARY — familiar climb with a hopper on the upper work deck.
      ...scaffold(28, 34, 7),
      robot(30, 33, 'hopper', 8),
      golden(10, [32]),

      checkpoint(46),

      // 3 · COMBINE — last vertical lift, then a spacing enemy on the floor.
      hoist(50, 51, GROUND, 10, 4.3),
      ledge(52, 58, 10),
      roller(60, 64),

      // 4 · FINAL RIDE — one readable smash, then the final big flag/gate.
      machine('crane', 68, [66, 79]),
      brickWall(80, 84, 4),
      golden(7, [86]),
      flagAt(88, true),
      exitAt(92.5),

      shot(10, 30, { z: 40, y: 3.4 }),
      shot(28, 56, { z: 45, y: 4.2, lead: 1.7 }),
      shot(54, 96, { z: 44, y: 3.8, lead: 2.0 }),
    ],
  },
];
