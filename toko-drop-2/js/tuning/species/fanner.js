// fanner.js — FANNER: its numbers. The 1.x CFG row (1.x enemy.js:580), melee
// flag (1.x main.js:2410-2420), movement role (1.x tuning.js:301), revenge
// dialect (1.x tuning.js:511), and everything its port reads: the 8 ± 1.5
// hold band and the constant strafe that flips every 2.5-3.5 s (1.x
// enemy.js:2259-2271, 680-681), the glow-and-fan cycle (an aimed FAN of 6
// over 108° every 1.5 × intervalMult s after a 0.4 s glow, every third one 9
// over 171°: 1.x enemy.js:2904-2932, 712) and the look's per-frame numbers
// (1.x enemy.js:2741-2769, tuning.js:42, 50). Spec: docs/port-1x/species-b.md
// §4, bullets-graze.md §5.2-5.3. Contract: docs/SIM_CONTRACT.md.
//
// 1.x citations are to /home/user/sj-site/toko-drop/js/ at v268.
//
// Not ported: 1.x's motion-trail afterimage (enemy.js:640, every 0.09 s at
// 0.45 × radius) — it was off under 1.x's WEBGPU build since v193
// (main.js:10483-10489), which is 2.0's reference look.
export default {
  name: 'FANNER',
  deathLabel: 'pink fanner', // the death screen's name for it (1.x main.js:5026)
  family: 'blob',          // look family: the gel dome (render/looks/fanner.js shapes it, 1.x's own way)
  radius: 0.75,            // 1.x enemy.js:580 — big (≥ 0.75): the kill's shockwave and extra goo (1.x main.js:4495)
  hp: 3,                   // 1.x enemy.js:580
  speed: 1.4,              // u/s before the wave's speedMult (1.x enemy.js:580, 1699)
  color: 0xff00aa,         // magenta (1.x enemy.js:580); L 0.242, above the contrast floor: no rim
  bulletColor: 0xff66cc,   // 1.x enemy.js:580
  fireInterval: 1.5,       // s, × the wave's intervalMult (1.x enemy.js:580, 2873)
  contact: false,          // its touch hurts only in CLOSE COMBAT, never in classic (1.x MELEE_TYPES, main.js:2410-2420)
  role: 'HOLDER',          // swarm-force profile: the wave's current at 0.25, nothing else (1.x tuning.js:292, 301)
  revenge: 'FAN',          // HARDCADE's corpse fire: 5 slow bullets 0.5 rad apart (1.x tuning.js:496-513)

  // ── movement: a radial hold band plus a constant strafe (1.x enemy.js:2259-2271) ──
  // u = unit(hero − pos), perp = (−u.z, u.x); radial = d > hold + band ? 1 : d < hold − band ? −1 : 0
  // pos += (u·radial + perp·strafeDir·strafe)·speed·dt — NOT normalised, so
  // outside the band it moves at √2 × speed (species-b.md §4.3)
  hold: 8,                 // the distance from the hero it keeps (1.x enemy.js:2260 `want = 8`)
  holdBand: 1.5,           // walks in past hold + 1.5, backs off inside hold − 1.5 (1.x enemy.js:2267)
  strafe: 1,               // the strafe's share of speed, always on (1.x enemy.js:2268-2269 `perpX * _strafeDir`)
  strafeDir0: 1,           // every FANNER starts strafing the +perp way (1.x enemy.js:680 `_strafeDir = 1`)
  strafeStart: [1.5, 2.5], // the first flip comes after 1.5 + U(0, 1) s (1.x enemy.js:681)
  strafeFlip: [2.5, 3.5],  // then every 2.5 + U(0, 1) s (1.x enemy.js:2265 `2.5 + Math.random()`)
  velSmooth: 0.3,          // 1.x _velX: its OWN walk each frame, eased 0.3 a frame (1.x enemy.js:1680, 2693-2698)

  // ── the fan (1.x enemy.js:2904-2932) ──
  fireStart: [0, 0.5],     // the fire clock starts at U(0, 0.5) s, desyncing a wave (1.x enemy.js:674)
  tellTime: 0.4,           // the glow before each volley, hard-coded in 1.x (enemy.js:2907-2908); the clock counts through it
  fireSquash: -0.8,        // the volley flattens it: a kick to the squash spring (1.x enemy.js:2915 `_sqV −= 0.8`)
  wideEvery: 3,            // volleys 3, 6, 9… go wide: `_fannerShot = (_fannerShot + 1) % 3`, wide at 0 (1.x enemy.js:712, 2920-2921)
  fan: { n: 6, span: Math.PI * 0.6 },    // normal: 6 over 108°, 21.6° apart, NO centre bullet — the inner two straddle the aim at ±10.8° (1.x enemy.js:2922-2926)
  wide: { n: 9, span: Math.PI * 0.95 },  // wide: 9 over 171°, 21.375° apart, the 5th aimed (1.x enemy.js:2922-2926)
  bulletSpeedMult: 1,      // × the gel bullet's 7 u/s: spawnDir's default (1.x bullet.js:91-94, enemy.js:2927)

  // ── the look (render/looks/fanner.js): 1.x's blob scale block (enemy.js:2741-2769) ──
  look: {
    shape: { x: 1.30, y: 0.66, z: 1.08 },  // the "wide flat pancake": 1.95 wide, 1.62 long, 0.84 tall at rest (1.x tuning.js:42 shapes.FANNER)
    sway: 0.10,            // a constant roll about its own long axis, rad (1.x tuning.js:50 fannerSway, enemy.js:2763-2765: rotation (−drag·tilt, yaw, rock))
    swayRate: 7,           // rad/s, ≈ 1.1 Hz (1.x tuning.js:50 `fannerSwayHz`, used as sin(_wobbleT × 7))
    tellEmissive: 0x440022,// a dark magenta glow for the whole tell (1.x enemy.js:2686-2687); no inflate (1.x enemy.js:2758-2760 is SPITTOR's only)
    breatheXZ: 0.5,        // the breath gives back half of itself across (1.x enemy.js:2751 `sx × (1 − breathe × 0.5)`)
    dragSink: 0.25,        // the smear lowers the crown by a quarter of the drag (1.x enemy.js:2768 `sy − drag × 0.25`)
    yawMinSpeed: 0.4,      // it turns to its heading only above this smoothed speed (1.x enemy.js:2755)
    sqFloor: 0.1,          // the across-scale is 1/√max(sq, 0.1) (1.x enemy.js:2732)
    yaw0: 0,               // a new body faces +z until it first walks (1.x _moveYaw = 0, enemy.js:806)
  },
};
