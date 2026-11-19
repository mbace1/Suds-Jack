// bossphases.js — the worlds' own bosses fought in THREE PHASES (v154).
//
// Decision 15 Nov 2026 (the owner, design-talks/toko-drop/DESIGN.md "Bosses are
// multi-wave fights"): "Bosses should be multiple waves, like 3 with harder
// strategy each wave. Usually ramping up pacing." Until v153 each of the seven
// world bosses fought one way and, once, at half health, raged (bosskit.js).
// Here each has three phases, read off its health (`at`, a share of its whole,
// only ever up) or, if a phase names `after`, off the fight's clock as well
// (whichever comes first; `after` counts from the start of the phase before):
//   phase 1  its own pattern, as it was (the one trick to read)
//   phase 2  its old rage (the trick doubled)
//   phase 3  a new ask on top of the rage — the world's own gel
//            joins it (`adds`), the pace ramps (`pace`), and `set` moves its
//            own numbers (shorter windows, more shots)
// THE STAGES' LENGTHS (owner, 2026-11-15: "3 stages, slightly longer each time is
// a good general rule"): each stage a little longer than the one before, about
// 1 : 1.15 : 1.3 of the fight's time. The lines (`at`) are NOT thirds: each boss's
// damage comes in its own rhythm (MAW only while it is up, BLISTER only while it
// is bare, KETTLE between stalls), so the split and each phase's `min` (the
// shortest it can last, s; minPhase where it names none) were set off the bot
// bench (td2-tools/stagebench.mjs, 16 seeds, ARCADE) — PR #648 has the table.
// A phase's `set` is laid over the species' tuning for that boss from then on
// (each phase's on top of the one before), so the behaviour code reads its
// numbers as it always did. `pace` multiplies its movement speed and divides
// the fire clocks that run on fireMult. `rage: true` is the old `mad` flag.
//
// `hp` (ARCADE / HARDCADE only; a campaign room keeps its own number) evens the
// fights out: until v153 the world 2 boss was a 200 hp wall (S line 30 s) and
// the world 4 boss 30 hp (Astra, 2026-11-11). v157: the grade lines
// (tuning/bossfights.js) are measured with the phases and the boss kinds on
// (scripts/boss-tiers.mjs), so the `tiers` estimate that scaled the old lines is
// gone. A strategic boss's health is bosskinds.js's where it names one.
//
// TWIN PRISMS (world 1) and OMEGA (world 9) are 1.x's and keep their own
// phases (OMEGA's three acts at 66% / 33%; the twins' rage when one shatters).
//
// Switches: `on` (?bossphases=off — the v153 bosses, for an A/B on the phone);
// `campaign` (?bossphases=all — the phases in the campaign's boss rooms too:
// PACK ICE, BOIL OVER, THE DEEP END keep the v153 boss until the owner says).
export const BOSS_PHASES = {
  on: true,
  campaign: false,
  modes: ['arcade', 'hardcade'],
  banner: 1.4, shake: 0.35,
  // a phase is never skipped: until it has lasted its `min` (else `minPhase`) s the boss's health holds just over the next phase's line
  // (one burst of damage — BLISTER's bare seconds, a dash pod's volley — used to carry it through two phases at once)
  minPhase: 5,

  bosses: {
    // THE DRIVEWAY (world 2): a wall → a three-beat fight
    curbking: { hp: 110, phases: [
      { at: 1, min: 6.8 },
      { at: 0.65, min: 8.4, label: 'THE KING HOPS TWICE!', rage: true },
      { at: 0.37, label: 'THE KING CALLS HIS COURT!', rage: true, pace: 1.15,
        adds: { kind: 'hoppa', n: 3 },
        set: { ring: { count: 12 }, rage: { crouch: 0.4, rest: [0.5, 0.8], brood: { every: 3 } } } },
    ] },
    // THE SEWER (world 3)
    maw: { hp: 70, phases: [
      { at: 1, min: 5.3 },
      { at: 0.75, min: 9, label: 'THE MAW IS HUNGRY!', rage: true },
      { at: 0.64, label: 'THE MAW SPLITS THE FLOOR!', rage: true, pace: 1.1,
        adds: { kind: 'worma', n: 2 },
        set: { up: 2.6, spiral: { arms: 4, turn: 0.4 }, erupt: { count: 18 } } },
    ] },
    // THE CISTERN (world 4): a pushover → a rhythm that tightens
    blister: { hp: 40, phases: [
      { at: 1, min: 6.3 },
      { at: 0.73, min: 7.2, label: 'THE BLISTER SWELLS!', rage: true },
      { at: 0.44, label: 'THE BLISTER BROODS!', rage: true, pace: 1.15,
        adds: { kind: 'bubbla', n: 3 },
        set: { shell: 11, bare: 3.4, panic: { count: 7 }, rage: { burst: 11 } } },
    ] },
    // THE BOILER ROOM (world 5)
    kettle: { hp: 120, phases: [
      { at: 1, min: 7.6 },
      { at: 0.72, min: 8.9, label: 'THE KETTLE BOILS OVER!', rage: true },
      { at: 0.69, label: 'THE KETTLE BLOWS ITS LID!', rage: true, pace: 1.1,
        adds: { kind: 'steama', n: 2 },
        set: { stall: { every: 3 }, vent: { steam: { r: 3.4 } }, rage: { jets: 5, fill: 1.5 } } },
    ] },
    // THE RIVER (world 6): one charge, then two, then three
    pike: { hp: 90, phases: [
      { at: 1, min: 6.8 },
      { at: 0.763, min: 8.4, label: 'THE PIKE STRIKES TWICE!', rage: true, set: { rage: { chain: 2, aim: 0.6 } } },
      { at: 0.544, label: 'THE PIKE STRIKES THRICE!', rage: true, pace: 1.1,
        adds: { kind: 'salma', n: 3 },
        set: { charge: { speed: 19 }, rage: { chain: 3, aim: 0.5 } } },
    ] },
    // THE ICE SHEET (world 7)
    berg: { hp: 100, phases: [
      { at: 1, min: 6.0 },
      { at: 0.61, min: 7.5, label: 'THE BERG CALVES!', rage: true },
      { at: 0.4, label: 'THE BERG SHATTERS!', rage: true, pace: 1.1,
        adds: { kind: 'skata', n: 2 },
        set: { freeze: { every: [3.6, 4.4], tell: 0.65, n: 6 } } },
    ] },
    // THE DEEP (world 8)
    angler: { hp: 150, phases: [
      { at: 1, min: 7.2 },
      { at: 0.623, min: 8.9, label: 'THE DEEP WAKES!', rage: true },
      { at: 0.448, label: 'THE LURE BURNS BRIGHT!', rage: true, pace: 1.15,
        adds: { kind: 'glowa', n: 2 },
        set: { bite: { tell: 0.45, rest: 0.9, ring: 16 }, lantern: { count: 4 } } },
    ] },
  },
};
