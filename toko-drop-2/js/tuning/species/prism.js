// prism.js — PRISM: its numbers. The 1.x CFG row (1.x enemy.js:620), melee
// flag (1.x main.js:2410-2421), movement role (1.x tuning.js:314), revenge
// dialect (1.x tuning.js:496-513), and everything its port reads: the boss
// multipliers (main.js:9384-9389), the pairing (main.js:9392-9400), the orbit,
// the volley clocks and the survivor's rage (enemy.js:2447-2488), the tells
// (enemy.js:2666-2681) and the look's numbers (the octahedron shard,
// enemy.js:773-777; the satin `omega` family, tuning.js:32; the boss aura,
// main.js:1967-1982, 10569-10584). Specs: docs/port-1x/arcade-mode.md §5.2,
// §5.4; bullets-graze.md §5.5. Contract: docs/SIM_CONTRACT.md.
//
// 1.x citations are to /home/user/sj-site/toko-drop/js/ at v268. 1.x's
// strobes run on performance.now() in ms (sin(now × k)); here they are
// rad/s on the view's seconds clock, k × 1000.
export default {
  name: 'PRISM',
  family: 'custom',        // its own body: a sharp octahedron, not a gel dome (1.x enemy.js:773-777); render/looks/prism.js builds it.
                           // Its death chunks are 1.x's smooth goo (it is not in CUBE_TYPES_FX, main.js:2425-2428, 2618);
                           // its kill SOUND is the cube's square-wave pop, not the blob's: deathSound, below
  radius: 0.85,            // 1.x enemy.js:620; as a boss × 1.5 = 1.275 (main.js:9388, the core's variants.boss.radius)
  hp: 3,                   // 1.x enemy.js:620
  bossHp: 9,               // hp × 3 as a boss (1.x main.js:9384-9386); the director reads it (arcade-mode.md §5.4)
  speed: 1.5,              // u/s × the wave's speedMult (1.x enemy.js:620, 2462). Read here, not through api.speed: 1.x's
                           // PRISM recomputes its speed without the SIREN surge (enemy.js:2462 vs 1699-1700), and a boss is never SWIFT
  color: 0xff55cc,         // 1.x enemy.js:620
  bulletColor: 0xff99ee,   // 1.x enemy.js:620
  fireInterval: null,      // 1.x enemy.js:620: its clocks are its own (below)
  contact: false,          // bosses have no contact damage in classic: not in MELEE_TYPES (1.x main.js:2410-2421)
  role: 'MASS',            // swarm-force profile (1.x tuning.js:314); a boss gets no swarm forces anyway (crowd.js)
  revenge: null,           // not a biter (1.x tuning.js:496-513); as a boss its HARDCADE corpse fires the boss RING (the core's)

  // ── the pair (1.x main.js:9392-9400; the director spawns two, 0.4 s apart, main.js:257-258) ──
  // the second to arrive finds the other living PRISM: it takes twinIdx 1, the other 0, and the OPPOSITE orbit sign
  orbit: {
    flip: 0.5,             // a lone body's orbit sign is a coin: random < 0.5 → +1, else −1 (1.x enemy.js:702)
    want: 7.2,             // the preferred distance from the hero, calm (1.x enemy.js:2461)
    wantRaged: 6.0,        // … raged (1.x enemy.js:2461)
    band: 1.5,             // no radial motion within want ± band (1.x enemy.js:2464)
    radial: 0.5,           // the radial share of the speed outside the band: in when far, out when near (1.x enemy.js:2465-2466)
    tangent: 1,            // the tangential share, × the orbit sign (1.x enemy.js:2465-2466)
  },
  rageSpeed: 1.45,         // the survivor's speed × 1.45 (1.x enemy.js:2462, the phase-3 enrage of 1688-1700)
  spin: { calm: 0.8, raged: 1.6 },   // rad/s about y, for show (1.x enemy.js:2470)

  // ── the volleys (1.x enemy.js:2471-2487); every period × the wave's intervalMult ──
  fire: {
    first: 1.2,            // twin 0's first volley, s after its first active step (1.x enemy.js:2471 `1.2 + twinIdx × 1.4`)
    twinStagger: 1.4,      // 1.x's fixed offset for twin 1, after ITS OWN first step (1.x enemy.js:2471). Read only when
                           // strictTurns is false: the spec names it a trap (arcade-mode.md §5.4) — the period scales with
                           // the wave and the offset does not, so at wave 8 the pair lands 0.08 s apart
    strictTurns: true,     // the spec's fix (arcade-mode.md §5.4 "offset twin 1 by half the period"): twin 1's first volley
                           // lands half a calm period (rounded to a step) after twin 0's next, counted in whole steps on
                           // the pair's clocks, so the pair ALTERNATES — 1.x's stated intent ("strict turns", enemy.js:2449-2450)
    calm: { every: 2.8, count: 4, span: Math.PI * 0.26 },   // an aimed 4-fan over 0.26π (47°), endpoints included
                           // (1.x enemy.js:2479-2485: baseA − span/2 + j × span/3)
    raged: { every: 0.75, count: 10, base: 0 },             // a 10-ring from angle 0, fixed orientation (1.x enemy.js:2474-2475, 2961-2966)
  },
  tell: 0.3,               // the strobe starts this long before each volley (1.x enemy.js:2679 `_prismFireT < 0.3`)
  phaseFlash: 0.5,         // s of gold/orange strobe when the survivor rages (1.x enemy.js:2456)
  // the rage announcement (1.x main.js:10398-10407): the popup, its time, the shake; reported as a `phase` event
  rage: { label: 'THE SURVIVOR RAGES!', banner: 1.1, shake: 0.3 },
  // 1.x's squash spring for every non-blob body, per 60 Hz frame (1.x enemy.js:2728-2731): spring, damp, held to
  // 0.55..1.55. The core picks its spring by family (a custom body gets the blob 0.24/0.86), so the behaviour runs
  // this one in its place, as TORO does.
  squash: { spring: 0.18, damp: 0.90, min: 0.55, max: 1.55 },

  // the kill sound: 1.x's death voice for every body not a blob, TORO, BAMBU or PYRA — the 'cube' square-wave pop and
  // its noise (1.x main.js:4476-4480; audio.js:248 `_tone(380, 0.18, 'square', 0.22, 55); _noise(0.09, 0.13)`). The
  // view's audio voices family 'cube' only, so a custom body names its voice here (audio.js reads `deathSound`)
  deathSound: { wave: 'square', f0: 380, f1: 55, dur: 0.18, vol: 0.22, noiseVol: 0.09, noiseDur: 0.13 },

  // ── what the core does not do per species (reported in the port's contractGaps) ──
  bossDeath: { extraDroplets: 14 },   // a boss's death throws 14 extra droplets, not a big body's 8 (1.x main.js:4499)

  // ── the look (render/looks/prism.js) ──
  look: {
    // the material: 1.x's satin, family `omega` — "boss keeps a hard crystal read": roughness 0.04, transmission 0.40
    // (1.x tuning.js:32, enemy.js:813-817), uWobble 0.35 (every non-blob family, enemy.js:323), uRadius the CFG 0.85
    // (enemy.js:817). No hit ripple and no death thrash: 1.x writes uHit and uTear for BLOB_TYPES only (enemy.js:1612,
    // 2704-2707, 2988-2990)
    roughness: 0.04, transmission: 0.40, wobble: 0.35,
    // the shard: an OctahedronGeometry(radius, 0) stretched 0.8 × 1.35 × 0.8 — "leaner than OMEGA's faceted core"
    // (1.x enemy.js:773-777)
    octa: { detail: 0, scale: [0.8, 1.35, 0.8] },
    // its centre stands at the CFG radius, boss or not (1.x enemy.js:1000 `position.set(x, cfg.radius, z)`; main.js:9388
    // scales the mesh × 1.5 and leaves it there), the squash spring scales it about that centre (enemy.js:2732, 2779)
    sqFloor: 0.1,          // the across-scale is 1/√max(sq, 0.1) (1.x enemy.js:2732)
    // the death pop: 1.x's destroy() sets the mesh to _deathBaseScale(), which is 1 for every non-blob body — a boss
    // too, so its pop starts from the CFG size, not its 1.5 — then updateDeath() swells it × (1 + 1.3t) about the
    // mesh's own centre (1.x enemy.js:1482-1484, 2978-2981, 3013, 3026; the 1.3 and 0.28 s are the core's)
    death: { base: 1 },
    // the tell: pc / black on sin(now × 0.03) (1.x enemy.js:2679-2681)
    tell: { calm: 0x88104f, raged: 0xaa2200, rate: 30 },
    // the rage pop: hot gold / orange on sin(now × 0.06) (1.x enemy.js:2666-2669)
    phaseFlash: { colors: [0xffee88, 0xff5500], rate: 60 },
    // the boss aura (1.x makeBossAura, main.js:1967-1982; its beat 10569-10584): a flat ring on the floor at y 0.04,
    // outer radius 1.7 × the boss's radius, inner 0.82 of that, 40 segments, additive 0xffcc33 at 0.6 then
    // 0.45 + 0.3 sin(now × 0.005); raged it is 0xff2200 at scale 1.15 + 0.1 sin(now × 0.02). Only a boss wears one
    aura: {
      color: 0xffcc33, raged: 0xff2200, radius: 1.7, inner: 0.82, segs: 40, y: 0.04,
      opacity0: 0.6, opacity: [0.45, 0.3], rate: 5,
      ragedScale: [1.15, 0.1], ragedRate: 20,
    },
  },
};
