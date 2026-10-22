// waves.js — ARCADE's wave director as data: 1.x's TUNING.waves (1.x
// tuning.js:342-476) plus the numbers 1.x wrote inline in getEnemySchedule,
// spawnWave, the round loop and the round end (1.x main.js:92-389,
// 7200-7313, 8135-8148, 9318-9437, 11318-11441). The algorithm is
// js/sim/director/arcade.js; the spec it is held to is
// docs/port-1x/arcade-mode.md §2 and §10. 1.x's own arena, so every number
// ports as written. Contract: docs/SIM_CONTRACT.md.
//
// SURVIVAL (sim/director/survival.js) reads `pool` and `scale` too: keep
// their shapes.
export default {
  // [key, minWave, cost] — ORDER IS DRAW ORDER: a seeded index rolls into
  // this list, so append, never reorder (1.x tuning.js:328-330, 357-380)
  pool: [
    ['globbo', 1, 1], ['yela', 1, 1], ['spittor', 1, 2], ['fanner', 1, 2],
    ['orange', 2, 2], ['weeva', 2, 3],
    ['sludge', 3, 2], ['bambu', 3, 3], ['splitta', 3, 3],
    ['redd', 4, 3],
    ['purp', 5, 3], ['pyra', 5, 4], ['botfly', 5, 4],
    ['toro', 6, 5],
    ['warden', 7, 5],
    ['bulwark', 6, 4],
    ['siren', 8, 5],
    ['cloaker', 9, 4],
    ['magna', 10, 5],
    ['draper', 7, 5],
    ['shepherd', 4, 4],
    ['ribbon', 2, 3],
    ['slug', 2, 3],
  ],
  // the ranged types: placed deliberately (capped, spread) instead of
  // flooded (1.x tuning.js:393-394)
  shooters: ['spittor', 'fanner', 'weeva', 'orange', 'purp', 'bambu', 'pyra', 'botfly', 'cloaker', 'draper'],
  // elite behaviour modifiers — order is draw order (1.x tuning.js:395)
  affixes: ['volatile', 'swift', 'anchored'],
  // an empty draw becomes one of these at t = 0 (1.x main.js:388)
  empty: 'globbo',

  // 1.x waveScaleFor (main.js:92-105; tuning.js:344-349): speed and fire
  // clocks climb to a knee at wave 10, then creep; waves 1-5 shave a little speed
  scale: { knee: 10,
    speed: { base: 1.1, ramp: 0.09, post: 0.02, max: 2.4, easeUntil: 6, ease: 0.012 },
    interval: { base: 1.0, ramp: 0.055, post: 0.010, min: 0.35 } },

  // 1.x waveKind (main.js:129-136; tuning.js:355). Precedence
  // boss > spike > curtain > swarm; a normal wave after any other is a breather
  rhythm: { bossEvery: 8, spikeEvery: 4, curtainEvery: 6, curtainFrom: 6, swarmEvery: 3, swarmFrom: 3 },

  // 1.x waveBudgetBase (main.js:110-120; tuning.js:397-401). A curtain wave
  // budgets as normal (1.x main.js:178-179: its `curtain` and `prize` rows are
  // never read on a classic round, so they are not ported)
  budget: { base: 5, ramp: 1.8, post: 0.8, knee: 10, slack: 3, min: 6,
            kind: { boss: 2.0, spike: 1.4, swarm: 1.25, breather: 0.6, normal: 1.0 },
            early: { until: 6, base: 0.85, step: 0.03 } },

  // entry caps count list ENTRIES, not bodies (1.x main.js:228-235;
  // tuning.js:408-410); the live floor is the entry cap × liveMult, at least
  // liveMin (1.x main.js:7252-7259; tuning.js:421); children stop at the
  // live cap × childMult (1.x main.js:10608-10620; tuning.js:428)
  caps: { swarm: { base: 5, per: 1.4, max: 22 }, normal: { base: 4, per: 1, max: 14 },
          liveMult: 1.5, liveMin: 6, childMult: 2 },

  // the deliberate shooters (1.x main.js:279-297; tuning.js:431-433)
  shooterPlan: { capBase: 1, capPerWaves: 3, capMax: 5, swarmCap: 1, bossCap: 2,
                 budgetShare: 0.35, slack: 2, first: 0.8, gap: 2.5, gapRand: 1.5,
                 curtainShare: 0.6, curtainCapBonus: 2, curtainGap: 1.2 },

  // the mob's variant draw (odds = repetition) and pricing (1.x
  // tuning.js:435-444); the group fan, its stagger and push, and the twin's
  // offset (1.x main.js:7285-7304). The core applies elite hp × 2 /
  // radius × 1.2 and elitelite hp × 1.5 (TUNING.variants); the elitelite's
  // 50% affix roll is TUNING.variants.elitelite.affixChance (1.x main.js:315)
  variants: {
    normal: ['normal', 'normal', 'normal', 'elite', 'elitelite', 'twin', 'group'],
    swarm: ['group', 'group', 'twin', 'normal'],
    eliteCost: 1.6, eliteliteCost: 1.25, twinCost: 1.6,
    swarmCostMax: 2,                                  // swarm waves (and groups) draw bodies this cheap
    group: { base: 3, rand: 2, min: 3, spread: 1.5, stagger: 0.12, speedMult: 1.2 },
    twinOffset: 3,                                    // the twin lands (rng − 0.5) × 3 off, per axis
  },

  // a classic round is a clock, by kind (1.x tuning.js:460; the breather and
  // prize rows are never read, main.js:7248 — a breather runs 14 s)
  round: { normal: 14, swarm: 12, spike: 15, boss: 16, curtain: 15 },

  // the mob arrives as fronts across the round (1.x main.js:341-359;
  // tuning.js:462-470): front k of `count` lands at
  // (from + k/(count−1) × span) × round, its entries `stagger` apart. A front
  // PULLS IN when ≤ pullIn bodies stand, no sooner than pullGap after the last
  // front landed. `landedInit` is 1.x's "no front yet" (main.js:7250).
  // `evenFronts` is the spec's fix (arcade-mode.md §2.7 trap): 1.x's
  // per = ceil(n / count) leaves the last fronts EMPTY when n is just over a
  // multiple of count (n = 5 of 4: fronts 0,0,1,1,2 and the pour ends at 7 s
  // of 14); true spreads them k = floor(i × count / n). false = 1.x as written.
  pulses: { count: 4, span: 0.75, from: 0, stagger: 0.25, swarmStagger: 0.12,
            byKind: { swarm: { count: 5, span: 0.78 }, spike: { count: 3, span: 0.60 },
                      boss: { count: 3, span: 0.50, from: 0.28 }, curtain: { count: 3, span: 0.70 } },
            pullIn: 2, pullGap: 1.5, landedInit: -99, evenFronts: true },

  // where a body lands: 1.x's ellipse at 0.85 of the arena (1.x main.js:9359,
  // arena.js:56-60), shooters maximally separated from a seeded base angle
  // (main.js:7276-7284), everything else at i / total of the circle. 1.x has
  // NO keep-out around the hero (clearOfHero 0) and pops a body in at full
  // size the frame it is due; `appear: true` keeps 2.0's 0.3 s swell
  // (TUNING.gel.appear) — open question arcade-mode.md §10.6 #10.
  placement: { ring: 0.85, clearOfHero: 0, appear: true },

  // besides the shooters, these get the entrance ping (1.x main.js:9376-9380)
  ping: ['warden', 'siren', 'magna'],

  // the boss wave (1.x main.js:239-277, 9382-9400): the headliner alternates
  // per boss cycle floor(w / 8), the seed picking who opens — the TWIN PRISMS
  // (two entries) or OMEGA; WARDEN escorts min(2, floor(w / 8) − 1). Boss hp
  // is the species' `bossHp` if it has one, else 1.x's hp × 3 (BAMBU and
  // PYRA, `noHpMult`, never multiply); the core makes the radius × 1.5.
  boss: { cycle: 8, cost: 10,                              // ceil(4 × 2.5), main.js:262
          prism: { kind: 'prism', t: [0, 0.4] },            // main.js:257-258
          omega: { kind: 'omega', t: [0] },                 // main.js:260
          hpMult: 3,                                        // main.js:9384 (the gauntlet's 5 is cabinet-only)
          // 1.x's escort t = 2.0 + 1.5k is overwritten by the fronts (they carry
          // no boss flag, main.js:269 vs 344), so it is not ported
          escort: { kind: 'warden', max: 2, cycleOffset: 1, cost: 5 } },   // main.js:267-271

  // a CLEAR (every body dead and done dying, nothing queued): 500 × wave,
  // then a 1.5 s breather (1.x main.js:11384-11440). 1.x's clear waits for
  // the last death (`_dying`, 0.28 s: enemy.js:3006-3007, 2970-2993); 2.0
  // removes a body the step it dies, so the director holds that beat itself.
  // The white flash is 0.4 s (main.js:11393), the "WAVE N CLEAR" banner
  // 1.0 s in #66ffcc (main.js:11438-11440).
  clear: { perWave: 500, breather: 1.5, dying: 0.28, banner: 1.0, color: 0x66ffcc, flash: 0.4 },

  // the wave banner, by kind (1.x WAVE_BANNER, main.js:6996-7001; 2.0 s for a
  // boss, else 1.4: main.js:8323). A curtain wave has no row and shows as normal.
  banner: { normal: { label: null, color: 0xffdd44, dur: 1.4 },
            swarm: { label: 'SWARM', color: 0x66ffcc, dur: 1.4 },
            spike: { label: 'HEAVY', color: 0xffaa44, dur: 1.4 },
            boss: { label: 'BOSS!', color: 0xff5566, dur: 2.0 } },
  // the current's call from wave 2 (1.x main.js:7226-7237, FLUID_ARCHS
  // main.js:2806 — the same order crowd.js reads); a curtain wave calls the curtain
  calls: { from: 2, archs: ['stream', 'ring', 'pincer'] },

  // the ARENA CURTAIN (v171/v177; 1.x main.js:2633-2670, 8135-8148,
  // 11318-11342; bullets-graze.md §5.6): armed on 55% of the classic waves
  // from 6, never a boss wave; a 1.1 s warning at 5–11 s into the round, then
  // a wall of slow bullets marches from one wall to the other through two
  // 3-slot gaps. `diag` shears it 0.6 off the normal; `cross` sends a second
  // wall from the next side 1.1 s later. 1.x rolled the side, the shear and
  // the gaps with Math.random; 2.0 rolls them from the run's seed.
  arenaCurtain: { from: 6, chance: 0.55,                      // main.js:8138-8142
                  cross: { from: 10, chance: 0.35 },         // main.js:8143
                  diag: { from: 8, chance: 0.45 },           // main.js:8144
                  at: { min: 5, rand: 6 },                   // main.js:8146
                  warn: 1.1, crossDelay: 1.1,                // main.js:11320, 11331
                  spacing: 0.9, inset: 0.5,                  // main.js:2659, 2665
                  gap: { width: 3, from: 2, trim: 10, apart: 5, wrapTrim: 4 },   // main.js:2660-2664
                  diagLat: 0.6, speedMult: 0.62, color: 0xff66aa },             // main.js:2654, 2668, 8145
};
