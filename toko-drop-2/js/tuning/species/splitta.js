// splitta.js — SPLITTA: its numbers. The 1.x CFG row (1.x enemy.js:582),
// melee flag (1.x main.js:2410-2420), movement role (1.x tuning.js:288, 302),
// revenge dialect (1.x tuning.js:496-497: not a biter), and everything its
// port reads: the slow walk that stops at 1.2, the low-HP strobe that
// telegraphs the death ring, the RING of 12 a bullet kill rings out, the
// three GLOBBOs it splits into when its death pop ends, and the look's
// per-frame numbers. Spec: docs/port-1x/species-a.md §6, bullets-graze.md
// §5.2. Contract: docs/SIM_CONTRACT.md.
//
// Not ported: 1.x's motion-trail afterimage (enemy.js:637, every 0.07 s at
// 0.60 × radius) — it was off under 1.x's WEBGPU build since v193
// (main.js:10485-10489), which is 2.0's reference look.
//
// 1.x citations are to /home/user/sj-site/toko-drop/js/ at v268.
export default {
  name: 'SPLITTA',
  deathLabel: 'green splitta', // the death screen's name for it (1.x main.js:5028)
  family: 'blob',          // look family: the gel dome (render/looks/splitta.js shapes it, 1.x's own way)
  radius: 1.1,             // the biggest plain dome: 2.31 wide, 1.53 tall (1.x enemy.js:582)
  hp: 5,                   // 1.x enemy.js:582
  speed: 1.0,              // u/s before the wave's speedMult (1.x enemy.js:582, 1699)
  color: 0x88ff22,         // lime (1.x enemy.js:582)
  bulletColor: 0xaaff44,   // the death ring's colour: 1.x hard-codes 0xaaff44 at the ring (main.js:10734),
                           // the same value as this CFG field, which nothing else in 1.x reads
  fireInterval: null,      // no gun: it never fires while alive (1.x enemy.js:582)
  contact: true,           // touching it hurts in classic (1.x MELEE_TYPES, main.js:2410-2413): within r + 0.5 = 1.6
  role: 'SCHOOL',          // swarm-force profile: dodge 0.9, flock 1.0, current 1.0 (1.x tuning.js:288, 302)
  revenge: null,           // not a HARDCADE biter (1.x tuning.js:496-497); its living ring is its own

  // ── movement (1.x enemy.js:1748-1753) ──
  distFloor: 0.001,        // its distance to you, floored so one standing on you never divides by zero (1.x enemy.js:1682 `|| 0.001`)
  stopAt: 1.2,             // it walks at you at spd only while farther than this (1.x enemy.js:1749 `dist > 1.2`);
                           // contact reaches r + 0.5 = 1.6, so unlike GLOBBO it touches by walking
  velSmooth: 0.3,          // 1.x _velX: its OWN walk each frame, eased 0.3 a frame (1.x enemy.js:1680, 2696-2697);
                           // the swarm forces moved it before `ex` was taken, so a dodge never smears it

  // ── the tell: a nervous strobe as it nears death (v58, 1.x enemy.js:2663-2665) ──
  lowHp: 2,                // at hp ≤ 2 — absolute, so an elite (hp 10) pulses only at its last 2 (1.x enemy.js:2663)

  // ── the death ring (1.x main.js:10731-10736; bullets-graze.md §5.2) ──
  ring: {
    count: 12,             // 30° apart (1.x main.js:10732 `j < 12`)
    base: 0,               // fixed phase, the first along +x, not aimed (1.x main.js:10733 `a = (j / 12)·2π`)
    speedMult: 1,          // × the gel bullet's 7 u/s: spawnDir's default (1.x bullet.js:91-94, main.js:10734)
    // only a player-bullet kill rings: it lives inside main.js's player-bullet
    // loop (1.x main.js:10729-10736), so a dash, the environment (gates, vents,
    // 'env') and chain kills do not. The dash boom's bullets are hero bullets
    // (1.x main.js:10216-10224), so a kill by one does ring.
    from: ['hero'],
  },

  // ── the split (v99/v211; 1.x enemy.js:3058-3061, 2996-3000, main.js:10586-10620) ──
  // They land when the 0.28 s death pop ends — the same `_deathT` the view's
  // pop runs on (1.x enemy.js:3007, 2996-3000), which 2.0 keeps as
  // TUNING.blob.death — so the port reads that rather than a copy.
  children: {
    kind: 'globbo',        // always GLOBBOs (1.x enemy.js:3059 `_childType = GLOBBO`)
    count: 3,              // always 3 (1.x enemy.js:3060, v99)
    jitter: 0.3,           // child j at (j / 3)·2π + U·0.3 rad round the corpse (1.x main.js:10595-10597)
    dist: [1.2, 2.7],      // and 1.2 + U·1.5 u out (1.x main.js:10598 `r = 1.2 + rand·1.5`)
  },

  // ── the look (render/looks/splitta.js): 1.x's blob scale block (enemy.js:2732-2769) ──
  // the silhouette is the default dome, TUNING.blob.shape {1.05, 0.82, 1.05}
  // (1.x tuning.js:39, enemy.js:803-806: SPLITTA has no override); it breathes
  // deeper than the other blobs, TUNING.blob.breatheAmpSplitta 0.18 (1.x tuning.js:53)
  look: {
    strobeOn: 0x224400,    // the low-HP strobe: this emissive while sin(18·t) > 0 … (1.x enemy.js:2665)
    strobeOff: 0x000000,   // … else black (1.x enemy.js:2665)
    strobeRate: 18,        // rad/s: 1.x's sin(performance.now()·0.018) on the ms clock, a 2.86 Hz square (1.x enemy.js:2665)
    breatheXZ: 0.5,        // the breath gives back half of itself across (1.x enemy.js:2751 `sx × (1 − breathe × 0.5)`)
    dragSink: 0.25,        // the smear lowers the crown by a quarter of the drag (1.x enemy.js:2768 `sy − drag × 0.25`)
    yawMinSpeed: 0.4,      // it turns to its heading only above this smoothed speed (1.x enemy.js:2755)
    sqFloor: 0.1,          // the across-scale is 1/√max(sq, 0.1) (1.x enemy.js:2732)
    yaw0: 0,               // a new body faces +z until it first walks (1.x _moveYaw = 0, enemy.js:806)
  },
};
