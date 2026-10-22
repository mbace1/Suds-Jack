// siren.js — SIREN: its numbers. The 1.x CFG row (1.x enemy.js:597), melee
// flag (1.x main.js:2410-2420: not in MELEE_TYPES), movement role (1.x
// tuning.js:307), revenge dialect (1.x tuning.js:496-513: not a biter), and
// everything its port reads: the v141 screamer — a coward support that hovers
// 8–10 from you, and every 4.3–5.8 s inhales for 0.8 s and screams: every
// other living, non-boss, non-SIREN body within 7 surges to 1.6× its walking
// speed for 3 s. Spec: docs/port-1x/species-a.md §8. Contract: docs/SIM_CONTRACT.md.
export default {
  name: 'SIREN',
  family: 'blob',          // look family: the gel dome (render/looks/siren.js shapes it, 1.x's own way)
  radius: 0.75,
  hp: 3,
  speed: 1.2,
  color: 0xbb66ff,
  bulletColor: null,
  fireInterval: null,      // no gun: the scream is its attack (1.x enemy.js:597)
  contact: false,         // touching it hurts in classic (1.x MELEE_TYPES): it does not (1.x main.js:2410-2420)
  role: 'SUPPORT',          // swarm-force profile (TUNING.movement.roles; 1.x tuning.js:307)
  revenge: null,          // HARDCADE dialect if it bites: 'AIMED' | 'FAN' | 'RING'; null = it does not (1.x tuning.js:496-497)
  // No deathSound: it dies with its family's voice, the blob's. 1.x gave it
  // the cube's square crunch by accident — main.js chose the voice from its
  // own BLOB_TYPES, which predates SIREN (1.x main.js:2422-2424, 4476-4480) —
  // and the spec ports one family table instead (species-a.md §10.4.5), as
  // MAGNA's port does.

  // ── the hold: "coward support: hovers at mid distance, backs away when pressed" (1.x enemy.js:1819-1823) ──
  keep: 9,                  // the distance it keeps from you (1.x enemy.js:1821 `const keep = 9`)
  keepBand: 1,              // it closes only past keep + 1 = 10, backs off only inside keep − 1 = 8 (1.x enemy.js:1822-1823)
  retreat: 1.3,             // × its walking speed when it backs off (1.x enemy.js:1823 `spd * 1.3`)

  // ── the scream cycle: cruise → 0.8 s inhale → scream (v141, 1.x enemy.js:1165-1169, 1824-1839) ──
  screamFirst: [2.5, 4.0],  // the first inhale starts 2.5 + U·1.5 s after it arrives (1.x enemy.js:1166 `_screamT = 2.5 + rand·1.5`)
  screamEvery: [3.5, 5.0],  // and 3.5 + U·1.5 s after each scream (1.x enemy.js:1832 `_screamT = 3.5 + rand·1.5`)
  inhale: 0.8,              // the inhale, s (1.x enemy.js:1838 `_inhaleT = 0.8`; 1827 `k = 1 − _inhaleT / 0.8`)
  // 1.x wrote the inhale's swell and strobe and overwrote both in the same
  // frame — the emissive chain's last `else` writes black (1.x enemy.js:2689)
  // and the blob scale block rewrites mesh.scale (1.x enemy.js:2766-2769) —
  // from v141's own commit on, so on screen a SIREN was a plain dome until
  // the ring went out (species-a.md §8.4 and §10.4.1; PLAYTEST P5, "SIREN has
  // no rest tell"). The port draws the tell v141 meant ("visible swell +
  // strobing violet glow"): the sim writes the inhale's progress into g.tell.
  // false = 1.x as it drew: no tell at all.
  inhaleTell: true,

  // ── the scream (1.x main.js:10387-10397) ──
  reach: 7,                 // every other living, non-boss, non-SIREN body with its centre within 7 (strict) (1.x main.js:2541 `SIREN_RADIUS = 7`, 10390-10391)
  surgeTime: 3,             // gets `_surgeT = 3` s — set, not added: a second scream refreshes, never stacks (1.x main.js:10392)
  surgeMult: 1.6,           // and while it runs walks at 1.6× (1.x enemy.js:1698-1700 `spd = … × (_surgeT > 0 ? 1.6 : 1)`)

  // ── its clocks (1.x enemy.js:668, 671, 2724-2725) ──
  clockStart: [0, Math.PI * 2],  // `_wobbleT = rand·2π`, then += dt every frame: drives the breath and the inhale strobe
  phaseStart: [0, Math.PI * 2],  // `_phase = rand·2π`: desyncs the breath across a wave
  // the velocity its look smears and turns by: 1.x's `_velX/_velZ`, the body's
  // OWN movement this frame (measured from where the swarm forces left it,
  // before the crowd solver), smoothed 0.3 a frame (1.x enemy.js:2694-2697)
  velSmooth: 0.3,

  // ── the look (render/looks/siren.js) ──
  // the silhouette is the default dome, TUNING.blob.shape {1.05, 0.82, 1.05}
  // (1.x tuning.js:39, enemy.js:803-806: SIREN has no override): 0.79 wide, 1.05 tall
  look: {
    // 1.x's blob scale block (enemy.js:2731-2769)
    breatheXZ: 0.5,        // the breath gives back half of itself across (1.x enemy.js:2751 `sx × (1 − breathe × 0.5)`)
    dragSink: 0.25,        // the smear lowers the crown by a quarter of the drag (1.x enemy.js:2768 `sy − drag × 0.25`)
    yawMinSpeed: 0.4,      // it turns to its heading only above this smoothed speed (1.x enemy.js:2755)
    sqFloor: 0.1,          // the volume-keeping width reads max(_sq, 0.1) (1.x enemy.js:2732)
    yaw0: 0,               // a new body faces +z (1.x enemy.js:806 `_moveYaw = 0`)
    // the inhale tell v141 wrote (1.x enemy.js:1826-1829), drawn on its own channel
    swell: 0.45,           // the body swells to (1 + 0.45·k) of itself over the inhale, k 0 → 1 (1.x enemy.js:1828)
    strobeHz: 20,          // rad/s on its own clock: sin(20·clock) > 0 is the bright half, a 0.31 s period (1.x enemy.js:1829)
    strobe: [0x6633aa, 0x220044],  // the emissive it strobes between, bright then dark (1.x enemy.js:1829)
    // the ScreamRing (1.x main.js:2518-2540): a flat additive violet ring that
    // grows from where it screamed out to exactly the surge's reach, and fades
    ring: {
      inner: 0.82, outer: 1.0, segments: 40,   // RingGeometry(0.82, 1.0, 40) (1.x main.js:2527)
      y: 0.05,                                 // lying flat on the floor (1.x main.js:2528-2529)
      color: 0xbb66ff,                         // MeshBasic, additive, no depth write, both sides (1.x main.js:2523-2526)
      opacity: 0.7,                            // fading 0.7·(1 − k) (1.x main.js:2524, 2536)
      life: 0.55,                              // k = t / 0.55; scale 1 + k·(reach − 1): outer radius 1 → 7 (1.x main.js:2533-2537)
    },
  },

  // ── its sound, for the audio module (the core's; it has no 'scream' voice yet) ──
  // audio.sirenScream() (1.x audio.js:258-263): a rising two-voice wail and a hiss
  sound: {
    scream: [
      { wave: 'sawtooth', from: 700, to: 1500, dur: 0.45, vol: 0.20 },
      { wave: 'square', from: 705, to: 1520, dur: 0.45, vol: 0.10 },
    ],
    noise: { vol: 0.06, dur: 0.3 },
  },
};
