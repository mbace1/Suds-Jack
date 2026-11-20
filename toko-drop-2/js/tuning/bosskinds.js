// bosskinds.js — every world boss is ONE OF TWO KINDS, and they take turns (v157).
//
// Decision 19 Nov 2026 (the owner, asked "should a boss be a puzzle or an endurance wall?"): "make first boss
// endurance, second strategic, and so on". So worlds 1, 3, 5, 7 and 9 end on an ENDURANCE boss and worlds 2, 4,
// 6 and 8 on a STRATEGIC one: a squeeze you outlast, then a problem you read (Sakurai §2, #105: alternate the
// problems with the walls; §1, #009: squeeze, then release).
//
//   ENDURE  the fight is a CLOCK (`hold` s). The boss is not shot down: its health bar IS the clock, running
//           out on its own, and when it is empty the boss breaks. Every hit on it takes time off the clock
//           (dealing its whole health would take `shave` of the hold off) but never more than that, so the
//           least any fight lasts is (1 − shave) × hold: you cannot skip the wall, only shorten it. Its phases
//           come on the clock, since they read the bar. GRADED ON THE HITS YOU TOOK in the fight (`grade`):
//           an endurance boss asks you to stay alive, so that is what it measures.
//   READ    the boss is ARMOURED (a shot clinks off it, a dash passes through) except in a WINDOW its own
//           pattern opens: the thing to read. Each species says when it is open (`open()` in its sim file).
//           Graded on time, as every boss fight was (tuning/bossfights.js lines × bossphases.js `tiers`).
//             CURB KING  open while it squats and while it sits DAZED after a landing (`set.daze`)
//             BLISTER    open while bare — it always was (its shell takes the shots)
//             PIKE       open while it LINES UP (you stand in its lane to shoot it) and while STUNNED: bait its
//                        charge into a wall
//             ANGLER     open while it TELLS its bite and RESTS after one: come close to the light, slip the bite,
//                        punish
//           `set` is laid over the species' tuning for the boss in these modes (the windows a little wider).
//
// The same modes as the phases (bossphases.js): ARCADE and HARDCADE. The campaign's boss rooms keep their own
// fights until the owner says (`campaign`). `?bosskinds=off` is the v156 bosses, for an A/B on the phone.
export const BOSS_KINDS = {
  on: true,
  campaign: false,
  modes: ['arcade', 'hardcade'],

  kind: {
    prism: 'endure', curbking: 'read', maw: 'endure', blister: 'read', kettle: 'endure',
    pike: 'read', berg: 'endure', angler: 'read', omega: 'endure',
  },

  endure: {
    // the phases' lines on the clock, as shares of the bar left: stages 1 : 1.15 : 1.3 of the hold (owner,
    // 15 Nov: "3 stages, slightly longer each time"), where bossphases.js's own lines follow each boss's damage
    lines: [0.71, 0.38],
    shave: 0.3,                              // dealing its whole health takes this share off the hold, and no more
    grade: { S: 0, A: 1, B: 2 },             // the most hits taken in the fight for each grade; past B is C
    // s: the v154 fights ran 26-36 s. v158: the TWIN PRISMS 30 → 20 — the first boss of the game at 30 s took world 1
    // from 100% cleared to 67% for the average bot (scripts/curve.mjs, 24 seeds, bare), the boss wave 44 of its lives
    // against 17; at 20 it clears 96% and the boss takes 21 (16 s read no easier, 24 s 79%). Start easy (owner, 18 Nov)
    hold: { prism: 20, maw: 34, kettle: 38, berg: 36, omega: 44 },
  },

  read: {
    curbking: { set: { daze: 1.2 } },                                  // s still after a landing, open
    blister: {},
    // `hp`: only the windows count, so the health is lower than bossphases.js's (measured, scripts/boss-tiers.mjs)
    pike: { hp: 28, set: { stun: { time: 1.9 }, charge: { time: 1.7 } } },   // a charge reaches the wall; the stun lasts
    angler: { hp: 36, set: { bite: { rest: 1.9 } } },                       // the rest after a bite is the window
  },
};
