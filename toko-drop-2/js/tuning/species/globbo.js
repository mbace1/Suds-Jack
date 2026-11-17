// globbo.js — GLOBBO: its numbers. The 1.x CFG row (1.x enemy.js:578),
// melee flag (1.x main.js:2410-2420), movement role (1.x tuning.js:300-316),
// revenge dialect (1.x tuning.js:496-513: not a biter), and everything its
// port reads: the v58 pouncer — a lunging stalk, a 0.32 s crouch with the
// direction locked, a 0.30 s leap at 3.2× — and the look's per-frame numbers.
// Spec: docs/port-1x/species-a.md §3. Contract: docs/SIM_CONTRACT.md.
export default {
  name: 'GLOBBO',
  family: 'blob',          // look family: the gel dome (render/looks/globbo.js shapes it, 1.x's own way)
  radius: 0.55,
  hp: 1,
  speed: 2.8,
  color: 0x00ccaa,
  bulletColor: null,
  fireInterval: null,      // no gun: contact only (1.x enemy.js:578)
  contact: true,         // touching it hurts in classic (1.x MELEE_TYPES)
  role: 'DRIFTER',          // swarm-force profile (TUNING.movement.roles)
  revenge: null,          // HARDCADE dialect if it bites: 'AIMED' | 'FAN' | 'RING'; null = it does not

  // ── the pounce: stalk → crouch → leap (v58, 1.x enemy.js:1712-1746) ──
  firstPounce: [1.0, 2.4],  // the first crouch comes after 1.0 + U·1.4 s (1.x enemy.js:710 `_pounceT = 1.0 + rand·1.4`)
  pounceDir: [0, 1],        // the locked direction before any crouch (1.x enemy.js:711 `_pounceDir = {x: 0, z: 1}`)
  distFloor: 0.001,         // its distance to you, floored so a GLOBBO standing on you never divides by zero (1.x enemy.js:1682 `|| 0.001`)
  stalkStop: 1.2,           // it stalks only while farther than this from you (1.x enemy.js:1716 `dist > 1.2`)
  // the stalk's lunging-slime speed pulse: spd × (max(0, sin(lungeHz·clock + phase))² × gain + floor)
  lungeHz: 3.0,             // rad/s, despite the name: a 2.09 s period (1.x tuning.js:51 globboLungeHz)
  lungeGain: 2.6,           // the surge rises to floor + gain = 3.0× (1.x tuning.js:51 globboLungeGain)
  lungeFloor: 0.4,          // and settles at 0.4× between surges (1.x tuning.js:51 globboLungeFloor)
  pounceRange: 12,          // it crouches only once the timer is out AND you are within 12 (1.x enemy.js:1725 `dist < 12`)
  crouchTime: 0.32,         // the crouch: no movement of its own; the tell (1.x enemy.js:1727)
  crouchSquash: -0.85,      // the crouch flattens it: a kick to the squash spring (1.x enemy.js:1728 `_sqV −= 0.85`)
  leapTime: 0.30,           // the leap (1.x enemy.js:1734)
  leapSquash: 0.7,          // it stretches tall on launch (1.x enemy.js:1735 `_sqV += 0.7`)
  leapSpeed: 3.2,           // × its walking speed, along the direction locked at the crouch (1.x enemy.js:1738-1739)
  restPounce: [1.6, 3.0],   // the stalk after a leap lasts 1.6 + U·1.4 s (1.x enemy.js:1742)

  // ── its clocks (1.x enemy.js:668, 671, 2724-2725) ──
  clockStart: [0, Math.PI * 2],  // `_wobbleT = rand·2π`, then += dt every frame: drives the lunge and the breath
  phaseStart: [0, Math.PI * 2],  // `_phase = rand·2π`: desyncs the breath and the lunge across a wave
  // the velocity its look smears and turns by: 1.x's `_velX/_velZ`, the body's
  // OWN movement this frame (measured from where the swarm forces left it, before
  // the crowd solver), smoothed 0.3 a frame (1.x enemy.js:2694-2697)
  velSmooth: 0.3,

  // ── the look (render/looks/globbo.js): 1.x's blob scale block (enemy.js:2741-2769) ──
  // the silhouette is the default dome, TUNING.blob.shape {1.05, 0.82, 1.05}
  // (1.x tuning.js:39, enemy.js:803-806: GLOBBO has no override)
  look: {
    sqFloor: 0.1,          // the squash read for the across-scale never goes below this (1.x enemy.js:2732 `1/√max(_sq, 0.1)`)
    breatheXZ: 0.5,        // the breath gives back half of itself across (1.x enemy.js:2751 `sx × (1 − breathe × 0.5)`)
    dragSink: 0.25,        // the smear lowers the crown by a quarter of the drag (1.x enemy.js:2768 `sy − drag × 0.25`)
    yawMinSpeed: 0.4,      // it turns to its heading only above this smoothed speed (1.x enemy.js:2755)
    yaw0: 0,               // a new body faces +z until it first moves (1.x enemy.js:806 `_moveYaw = 0`)
  },
};
