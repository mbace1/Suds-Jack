// ribbon.js — RIBBON: its numbers. The 1.x CFG row (1.x enemy.js:625), melee
// flag (1.x main.js:2416), movement role (1.x tuning.js:315), revenge dialect
// (1.x tuning.js:496-497: not a biter), and everything its port reads: v251's
// arc-mover steering (TUNING.arc, 1.x tuning.js:334-339; enemy.js:1272-1288),
// the body that is its own recent path (enemy.js:1386-1439), the strip that
// hit-tests itself along its length (enemy.js:1441-1459), and the look.
// Contract: docs/SIM_CONTRACT.md.
export default {
  name: 'RIBBON',
  family: 'custom',        // its look builds its own body: a flat gel strip, not a dome (1.x enemy.js:1396-1403)
  radius: 0.4,             // the head: the wall it bends off, and the newest sample's hit radius (1.x enemy.js:625, 1284, 1454)
  hp: 4,                   // (1.x enemy.js:625)
  speed: 2.6,              // u/s along its heading, × speedMult (1.x enemy.js:625, 1699-1700, 1707)
  color: 0x66ddee,         // (1.x enemy.js:625)
  bulletColor: null,
  fireInterval: null,      // no gun: the body is the threat (1.x enemy.js:625; _tick returns with no interval, 2790)
  contact: true,           // touching it hurts, ALONG its length (1.x MELEE_TYPES main.js:2416; touches, enemy.js:1459, main.js:10894)
  role: 'SCHOOL',          // the flock's profile; it steers itself (1.x tuning.js:315)
  revenge: null,           // not a HARDCADE biter (1.x tuning.js:496-497)

  // ── the steering: a turn-rate limit no other body has (TUNING.arc, 1.x tuning.js:334-337) ──
  arc: {
    turnRate: 2.2,         // rad/s, the ceiling on how fast the heading may change (1.x tuning.js:335, enemy.js:1280-1281)
    weaveHz: 1.7,          // rad/s of the serpentine phase (1.x tuning.js:336, enemy.js:1275)
    weaveAmp: 0.55,        // rad of heading OFFSET at full swing: the path curves, it never crabs (1.x tuning.js:337, enemy.js:1276)
    wallBend: 2,           // a step the wall clamped turns it a further turnRate × dt × 2, off the wall (1.x enemy.js:1286)
    phase0: [0, 2 * Math.PI], // the weave starts anywhere, U·2π (1.x enemy.js:980 `Math.random() * Math.PI * 2`)
    // its first heading is at the arena's centre from where it spawned,
    // atan2(−z, −x) (1.x enemy.js:980)
  },

  // ── the body: the positions the head has occupied, sampled BY DISTANCE (1.x tuning.js:339) ──
  trail: {
    samples: 22,           // points kept, newest first (1.x tuning.js:339, enemy.js:1394)
    step: 0.30,            // a new one each step the head stands this far from the newest (1.x tuning.js:339, enemy.js:1418)
    width: 0.34,           // full half-width; sample i ≥ 1 hit-tests at width × (1 − i / samples) (1.x enemy.js:1454)
    // a new ribbon lies straight up the screen from where it spawned, the
    // samples `step` apart toward −z, whatever its heading (1.x enemy.js:1394)
  },

  // ── its kill voice: 1.x filed it as neither blob nor toro/bambu/pyra, so it
  // died with the cube's square pop and hiss (1.x main.js:4476-4480 `_cat`,
  // audio.js:248 `_tone(380, 0.18, 'square', 0.22, 55); _noise(0.09, 0.13)`);
  // the view's audio voices family 'cube' only, so a custom body names it here
  deathSound: { wave: 'square', f0: 380, f1: 55, dur: 0.18, vol: 0.22, noiseVol: 0.09, noiseDur: 0.13 },

  // ── the look (render/looks/ribbon.js): 1.x _buildRibbon / _updateRibbon (enemy.js:1391-1439) ──
  look: {
    family: 'blob',        // satin gel, the blob family: lumps at wobble 1.0, uRadius 0.4 (1.x enemy.js:814, makeSatinMat(cfg.color, 'blob', cfg.radius))
    subdiv: 3,             // the strip has (samples − 1) × 3 + 1 points along a Catmull-Rom spline (1.x enemy.js:1395, 1423-1424)
    tension: 0.5,          // CatmullRomCurve3(pts, false, 'catmullrom', 0.5) (1.x enemy.js:1410)
    noseTaper: 6,          // the half-width rises as sin(min(1, t·6)·π/2) from nothing at the head … (1.x enemy.js:1431)
    // … and falls as (1 − t²) to nothing at the tail (enemy.js:1431; t is 0 at the head, 1 at the tail)
    y: 0.30,               // the strip floats 0.30 above the floor … (1.x enemy.js:1432)
    arch: 0.10,            // … rising sin(t·π) · 0.10 in the middle, a slight arch to catch light (1.x enemy.js:1432)
    deathOpacity: 0.82,    // dying, it fades as (1 − t)² × 0.82 while it swells (1.x enemy.js:2983-2984; destroy 3020-3021)
    // 1.x writes no hit ripple and no death tear into it: both are for
    // BLOB_TYPES only and RIBBON is not one (1.x enemy.js:1612, 2704, 2988);
    // nor does its squash spring reach it (1.x enemy.js:2727)
  },
};
