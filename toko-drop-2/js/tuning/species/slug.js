// slug.js — SLUG: its numbers. The 1.x CFG row (1.x enemy.js:626), melee
// flag (1.x main.js:2416), movement role (1.x tuning.js:315), revenge dialect
// (1.x tuning.js:496-513: not a biter), and everything its port reads: v251's
// arc-mover steering (TUNING.arc, 1.x tuning.js:334-338; enemy.js:1272-1288),
// the chain of gel domes pulled a fixed distance behind each other
// (enemy.js:1290-1334), the damage rule — eat it from an END and it shortens,
// hit the MIDDLE and it splits (enemy.js:1335-1364, main.js:10622-10633),
// v253's bounds on that (minSplit, a split's half never splits again), the
// dash that EATS what it crosses (enemy.js:1366-1385), and the look.
// Contract: docs/SIM_CONTRACT.md.
export default {
  name: 'SLUG',
  family: 'custom',        // its look builds its own body: a chain of squat gel spheres, not one dome (1.x enemy.js:1294-1321)
  radius: 0.46,            // the head: the crowd's circle and the wall it bends off (1.x enemy.js:626, 1284; = chain.headR)
  hp: 11,                  // hp IS the chain: one a segment (1.x enemy.js:626 "hp = segments", 1319 `this.hp = n`)
  speed: 2.2,              // u/s along its heading, × speedMult (1.x enemy.js:626, 1699-1700, 1707)
  color: 0x5fcc14,         // v257's darker green, 0x88ff22 → 0x5fcc14 (1.x enemy.js:626)
  bulletColor: null,
  fireInterval: null,      // no gun: the body is the threat (1.x enemy.js:626; _tick returns with no interval, 2790)
  contact: true,           // touching it hurts, ALONG its length (1.x MELEE_TYPES main.js:2416; touches, enemy.js:1459, main.js:10894)
  role: 'SCHOOL',          // the flock's profile; it steers itself (1.x tuning.js:315)
  revenge: null,           // not a HARDCADE biter (1.x tuning.js:496-513)

  // ── the steering: a turn-rate limit no other body has (TUNING.arc, 1.x tuning.js:334-337) ──
  arc: {
    turnRate: 2.2,         // rad/s, the ceiling on how fast the heading may change (1.x tuning.js:335, enemy.js:1280-1281)
    weaveHz: 1.7,          // rad/s of the serpentine phase (1.x tuning.js:336, enemy.js:1275)
    weaveAmp: 0.55,        // rad of heading OFFSET at full swing: the path curves, it never crabs (1.x tuning.js:337, enemy.js:1276)
    wallBend: 2,           // a step the wall clamped turns it a further turnRate × dt × 2 (1.x enemy.js:1286)
    phase0: [0, 2 * Math.PI], // the weave starts anywhere, U·2π (1.x enemy.js:980 `Math.random() * Math.PI * 2`)
    // its first heading is at the arena's centre from where its head spawned,
    // atan2(−z, −x) — a split's half too, whatever way its body lies (1.x enemy.js:980, main.js:10629)
  },

  // ── the chain (1.x tuning.js:338 `slug`) ──
  chain: {
    segments: 11,          // a fresh slug: eleven domes, head first (1.x tuning.js:338, enemy.js:984-985)
    spacing: 0.50,         // each held exactly this far behind the one ahead — no springs, it must not wobble like a rope (1.x tuning.js:338, enemy.js:1322-1330)
    headR: 0.46,           // the fat head … (1.x tuning.js:338)
    tailR: 0.18,           // … tapering linearly to the tail: r_i = headR + (tailR − headR) · i/(n − 1) (1.x tuning.js:338, enemy.js:1302-1303)
    // a new slug lies straight back along its heading from the head,
    // `spacing` apart (1.x enemy.js:984-985); its segments are never clamped
    // to the arena (1.x enemy.js:1322-1332) — only the head is
    minSplit: 4,           // v253: a chain SHORTER than this never splits; the hit segment just dies (1.x tuning.js:338, enemy.js:1354)
    // v253: a body born from a split never splits again (1.x main.js:10632 `_noSplit`, enemy.js:1354)
  },

  // ── a hit (1.x _slugHit, enemy.js:1339-1364) ──
  // The segment a bullet touched first (in chain order, head first) decides:
  // the head or the tail → that segment dies and the chain is one shorter;
  // the middle → the chain SPLITS there: the front keeps the head, the back
  // (reversed: its old tail is its head now) becomes a second slug. A chain of
  // one dies. A hit with no segment recorded takes the one nearest the impact.
  hitSquash: -0.4,         // a hit, or a dash's bite, kicks the squash spring this much — not a gel's −0.75 (1.x enemy.js:1340, 1379)
  // the hit flash is 1.x's 0.12 s (enemy.js:1340), which is the core's T.gel.flash

  // ── its squash spring: 1.x's NON-blob one, for the slug is not a BLOB_TYPE (1.x enemy.js:2728-2731) ──
  squash: { spring: 0.18, damp: 0.90, min: 0.55, max: 1.55 },   // per 60 Hz step; it squashes the HEAD only (enemy.js:2779)

  // ── the dash that cuts EATS (v253, 1.x enemy.js:1366-1385, main.js:10166-10175) ──
  // 1.x built this for its one dash that cuts bodies (main.js:10152-10183),
  // which is the NEX DEUS cabinet's (the loop sits inside `if (nexdeusMode …)`,
  // main.js:9978; v253's commit: "_slugCut() … stays as NEX DEUS's rule" —
  // the classic dash only passes through): "a dash is a cut, not a shot:
  // every segment it crosses is eaten and the animal closes the gap, shorter.
  // Never a split." Here it is the slug's answer to 2.0's CUT dash
  // (TUNING.hero.cut), which is that dash; and to a boss-hitting dash level 1.
  // One bite a dash; a dash that kills it outright (level 1) eats nothing.
  cut: { pad: 0.35 },      // eats every segment within its r + the hero's radius + 0.35 of the hero (1.x main.js:10171 `PLAYER_RADIUS + 0.35`, enemy.js:1376)

  // ── its kill voice: 1.x filed it as neither blob nor toro/bambu/pyra, so it
  // died with the cube's square pop and hiss (1.x main.js:4476-4480 `_cat`,
  // audio.js:248 `_tone(380, 0.18, 'square', 0.22, 55); _noise(0.09, 0.13)`);
  // the view's audio voices family 'cube' only, so a custom body names it here
  deathSound: { wave: 'square', f0: 380, f1: 55, dur: 0.18, vol: 0.22, noiseVol: 0.09, noiseDur: 0.13 },

  // ── the look (render/looks/slug.js): 1.x _buildChain / _placeChain (enemy.js:1294-1334) ──
  look: {
    family: 'blob',        // satin gel, the blob family, lumps at uRadius 0.46 for every segment (1.x enemy.js:814-818 `makeSatinMat(cfg.color, 'blob', cfg.radius)`)
    sphere: [12, 9],       // each segment a SphereGeometry(r, 12, 9) … (1.x enemy.js:1304)
    squat: 0.82,           // … squashed to 0.82 tall, so the chain reads as ONE animal, sitting on the floor at r × 0.82 (1.x enemy.js:1305, 1312, 1330)
    // the head's eye: the ONE mark that says which end you must attack from
    eye: {
      r: 0.3,              // headR × 0.3 (1.x enemy.js:1315)
      sphere: [8, 6],      // SphereGeometry(…, 8, 6) (1.x enemy.js:1315)
      color: 0xffffff,     // unlit white (1.x enemy.js:1316 MeshBasicMaterial)
      forward: 0.7,        // head r × 0.7 along the HEADING (not the velocity) … (1.x enemy.js:1333)
      up: 1.05,            // … and head r × 1.05 up (1.x enemy.js:1333); it is not squashed with the head
    },
    sqFloor: 0.1,          // the head is (sx, sq, sx) × rm, sx = 1/√max(sq, 0.1) (1.x enemy.js:2732, 2779)
    deathOpacity: 0.82,    // dying, the chain fades as (1 − t)² × 0.82 while it swells (1.x enemy.js:2983-2984), the eye gone at once (3012)
    // 1.x writes no hit ripple and no death tear into it: both are for
    // BLOB_TYPES only and SLUG is not one (1.x enemy.js:1605, 1612, 2704, 2988)
  },
};
