// cloaker.js — CLOAKER: its numbers. The 1.x CFG row (1.x enemy.js:598), melee
// flag (1.x main.js:2410-2421), movement role (1.x tuning.js:308) and revenge
// dialect (1.x tuning.js:496-497, 510), then the ambusher's own numbers (v143:
// enemy.js:493-496, 1201-1206, 1843-1886; the death fade 2983-2984).
// Contract: docs/SIM_CONTRACT.md.
export default {
  name: 'CLOAKER',
  deathLabel: 'ice Cloaker', // the death screen's name for it (1.x main.js:5046)
  family: 'blob',          // 1.x BLOB_TYPES (enemy.js:644-648); no TUNING.blob.shapes row (enemy.js:802-805), so the default dome
  radius: 0.7,
  hp: 3,
  speed: 2.4,              // u/s × speedMult: the shimmer-run's pace, and only that (enemy.js:1699-1700, 1864-1866); it never walks otherwise
  color: 0x66ddee,
  bulletColor: 0x88eeff,
  fireInterval: null,      // no clock of its own: _tick returns at once (enemy.js:2790); its one burst ends the decloak (enemy.js:1876-1880)
  contact: false,          // not in MELEE_TYPES, so harmless to touch in classic (1.x main.js:2410-2421)
  role: 'HUNTER',          // swarm-force profile (1.x tuning.js:308): the forces move it in every state, standing or running
  revenge: 'AIMED',        // a biter (1.x tuning.js:496-497), and its corpse spits AIMED (1.x tuning.js:510)
  // No deathSound: it dies with its family's voice, the blob's. 1.x gave it
  // the cube's square crunch by accident — main.js chose the voice from its
  // own BLOB_TYPES, which predates CLOAKER (1.x main.js:2422-2424, 4476-4480)
  // — and the spec ports one family table instead (species-a.md §10.4.5), as
  // the SIREN and MAGNA ports do.

  // ── the cycle: visible → cloak (the flank run) → decloak (the tell) → burst (v143, enemy.js:1843-1886) ──
  // One timer, `_ckT`, counted down by dt at the top of every step and read
  // by the state it is in; a state that runs out hands over the same step.
  // Each draw is 1.x's `base + U·rand`, kept in that form so the arithmetic is
  // 1.x's to the last bit (a [lo, hi] range would be lo + U·(hi − lo), and
  // 1.4 − 0.9 is not 0.5 in floating point)
  firstVisible: { base: 0.8, rand: 0.6 },  // the first beat at full presence, 0.8–1.4 s (enemy.js:1204 `_ckT = 0.8 + rand·0.6`)
  visible: { base: 0.9, rand: 0.5 },       // and after every burst, 0.9–1.4 s (enemy.js:1882 `_ckT = 0.9 + rand·0.5`)
  cloak: { base: 1.8, rand: 0.6 },         // the run lasts at most 1.8–2.4 s (enemy.js:1850 `_ckT = 1.8 + rand·0.6`)
  // the flank point, drawn when the visible beat runs out (enemy.js:1848-1856):
  // from the angle the hero sees it at, turned a quarter and up to 0.6 rad
  // more round to one side or the other, 6.5–8 from the hero. Nothing clamps
  // the point, and 1.x clamped no running body either (no per-frame enemy
  // clamp; only the crowd solver's nudge clamps, species-a.md §1.1), so a run
  // at a point past a wall carried a 1.x CLOAKER off the floor. 2.0's curbs
  // are walls (species-a.md §1.2): the core holds it at the wall until the
  // run's clock ends, and it decloaks and fires from there.
  flankSide: 0.5,            // side = U < 0.5 ? +1 : −1 (enemy.js:1851)
  flankTurn: Math.PI / 2,    // a0 = atan2(it − hero) + side·(π/2 + U·0.6) (enemy.js:1852-1853)
  flankJitter: 0.6,          // (enemy.js:1853 `Math.random() * 0.6`)
  flankRange: { base: 6.5, rand: 1.5 },    // r0 = 6.5 + U·1.5, so 6.5–8 from the hero (enemy.js:1854)
  arrive: 0.3,               // it runs only while farther than 0.3 from the point, and is there at 0.3 (enemy.js:1864, 1868 `ml > 0.3`, `ml <= 0.3`)
  // cloaked, it is STILL HITTABLE: 1.x's bullet test has no cloak branch and
  // hit() none either (main.js:10636-10720, enemy.js:1603-1667; v143: "Cloaked
  // bodies can still be hit — tracking pays"), so the port has no hitTest/onHit
  decloak: 0.6,              // the tell: 0.6 s fading back in (enemy.js:1868 `_ckT = 0.6`; 1870 `k = 1 − max(_ckT, 0) / 0.6`)
  // the burst, from where it stood at the top of the step, at the hero
  burst: { count: 3, step: 0.18 },   // offsets −0.18, 0, +0.18 rad about the aim: fanStep(aim, 3, 0.18) (enemy.js:1876-1880)
  burstSpeedMult: 1,                 // bullets.spawnDir(…) at its default speed: the plain 7 u/s gel shot (bullet.js:91, 94)

  // ── the look (render/looks/cloaker.js) ──
  // 1.x's plain satin dome in ice blue, made transparent at birth so its
  // opacity can live (enemy.js:1206 `mat.transparent = true`), and nothing
  // else: no eyes, no ring ("blobs read by silhouette + motion tell", v98)
  look: {
    floor: 0.14,             // cloaked it is 14% there … (enemy.js:1860, 1871)
    shimmer: 0.05,           // … ± 0.05 … (enemy.js:1860 `0.14 + 0.05·sin(_wobbleT·9)`)
    shimmerRate: 9,          // … at 9 rad/s on its own clock (enemy.js:1860)
    // the decloak ramps 0.14 → 1 linearly over the 0.6 s (enemy.js:1871
    // `0.14 + 0.86·k`) and snaps to 1 as it fires (enemy.js:1874)
    // the strobe the decloak wrote: 0x226677 / black on sin(24·clock) > 0
    // (enemy.js:1872). 1.x wrote it and overwrote it in the same frame — the
    // emissive chain after the movement switch ends in an `else` that writes
    // black (enemy.js:2689), and no branch of it is the CLOAKER's — from
    // v143's own commit on, so on screen the decloak was the fade alone. The
    // port draws the "strobing teal glow — the tell" v143 meant, as the SIREN
    // port draws its inhale (species-a.md §10.4 trap 1); the hit flash and a
    // VOLATILE body's smoulder outrank it, as they outranked every body's own
    // glow in 1.x's chain (enemy.js:2650-2656). false = 1.x as it drew.
    strobe: true,
    strobeOn: 0x226677, strobeOff: 0x000000,   // (enemy.js:1872)
    strobeRate: 24,          // rad/s on its own clock: a 0.26 s period (enemy.js:1872 `sin(_wobbleT·24)`)
    clockStart: [0, Math.PI * 2],   // its clock `_wobbleT` starts at U·2π (enemy.js:668) and runs with time (enemy.js:2725)
    // the death: 1.x's destroy() made every body transparent and its
    // updateDeath faded it (1 − t)²·0.82 over the 0.28 s pop (enemy.js:2983-
    // 2984, 3021); a CLOAKER's gel is transparent already, so the port fades
    // it as 1.x did — a body shot dead while cloaked pops back into view
    deathOpacity: 0.82,      // a blob's base (enemy.js:2983)
    deathFadePow: 2,         // (1 − t)² (enemy.js:2984)
  },
};
