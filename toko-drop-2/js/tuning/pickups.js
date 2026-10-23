// pickups.js — 1.x's classic pickups as data: the floor's drops, the gates,
// the cargo convoy and the bounty (1.x main.js at v268; the spec is
// docs/port-1x/arcade-mode.md §6, every number below carries its 1.x cite).
// The rules are js/sim/pickups.js; the look is js/render/pickups.js. The
// timers the pickups give (invincible 3.0 s, fire rate 8.0 s at × 0.4) and the
// reach they are taken at live with the hero (tuning.js hero.pickup,
// hero.rapidMult), the pods' own numbers with hero.weapons.
//
// Owner, 2026-10-22: healing is 1.x's gates AS THEY ARE. A longer life for the
// gate's drops and a rare heart from kills are kept as knobs below
// (`gate.dropLife`, `heart`), OFF by default: at 1.x's value, and a heart
// chance of 0 (which draws nothing, so a seed replays the same either way).
export default {
  // 1.x's classic arcade (ARCADE and HARDCADE); SURVIVAL has none for now
  // (owner, 2026-10-22: "forget survival for now")
  modes: ['arcade', 'hardcade'],

  // ── §6.1 the record (Powerup, main.js:2243-2313) ──────────────────
  life: 9,                                  // seconds, unless the source says otherwise (main.js:2245)
  blink: { last: 2.5, rate: 16, low: 0.12 },   // the last 2.5 s: sin(life × 16) > 0 ? 1 : 0.12 (main.js:2291)
  bob: { y: 0.6, amp: 0.15, rate: 3 },      // y = 0.6 + sin(3t) × 0.15 (main.js:2283)
  spin: 1.6,                                // rad/s (main.js:2285)
  pulse: { base: 0.5, amp: 0.4, rate: 5 },  // the orb's opacity, 0.5 + 0.4 sin(5t) (main.js:2286-2287)
  orb: 0.38,                                // the orb's radius (a level-2 pod's 0.45 never drops: main.js:2256)
  // the glyph sprite's size and lift (main.js:2273-2274), and its picture: a
  // 96 px canvas, a ring r 40 of 4 px, the glyph bold 44 px, 34 if longer (makeGlyphTexture, main.js:2042-2056)
  badge: { pod: 0.9, other: 0.8, liftPod: 0.9, liftOther: 0.62, px: 96, ring: 40, stroke: 4, font: [44, 34] },
  // taken within hero.pickup.reach + hero.radius = 1.3 of the hero's centre (main.js:11242)
  shake: 0.12,                              // the collection pop (main.js:11298)
  pop: { count: 8, size: 0.12 },            // 8 bits of goo in its colour (main.js:11292-11297), thrown at the actors' own spray speeds

  // ── §6.2 the types (main.js:11244-11293) ──────────────────────────
  // a pod is one of hero.weapons' families: the draw is LEVEL 1 only, in 1.x's
  // LV1_WEAPONS order (main.js:2004), leaning to a family you do not hold with
  // hero.weapons.favourUnheld (randomWeaponPodId, main.js:2030-2036)
  pods: ['spread', 'burst', 'laser', 'rapid', 'shotgun'],
  podGlyph: { spread: 'S', burst: 'B', laser: 'L', rapid: 'R', shotgun: 'G' },   // WEAPON_PODS' ids (main.js:1985-1998)
  // NON_WEAPON_COLORS and NON_WEAPON_GLYPHS (main.js:2006, 2238-2241); `dash`
  // is 2.0's DASH pod, in the dash ghosts' blue (heroLook.ghost.color)
  colors: { hp: 0xff4466, invincible: 0xffffff, firerate: 0xff88aa, scoremult: 0xffdd22, score: 0x88ff88, dash: 0x88bbff },
  glyphs: { hp: '+', invincible: '★', firerate: '»', scoremult: '×2', score: '$', dash: 'D' },
  hp: 1,                                    // +1 hp, to the max (main.js:11251)
  scoremult: { time: 10, mult: 2 },         // 10 s of × 2 (main.js:11280) on kills, grazes, bounties, gate chains and nuggets (main.js:4422, 10860, 4437, 11195, 11273); never the clear bonus (main.js:11392)
  score: { base: 250, perWave: 25 },        // a nugget is 250 + 25 × the wave, × 2 under the multiplier (main.js:11273)

  // ── §6.4 gates (v175; Gate main.js:1675-1771; spawnWave 7315-7323; loop 11159-11214) ──
  gate: {
    from: 3,                                // one a spawnWave from wave 3, a carry included (main.js:7315)
    keep: 2,                                // with 2 or more older gates standing, the oldest retires (main.js:7317-7319)
    retire: 4,                              // ...over 4 s (1.x tuning.js:461)
    span: 1.5,                              // the centre at (rand − 0.5) × HALF × 1.5: within ±0.75 of the half-extents (main.js:1680-1681)
    half: 2, thick: 0.2,                    // posts 4 apart; the laser hit as a capsule, |along| < 2 and |across| < 0.2 + r (main.js:1695, 1758-1768)
    risk: { from: 5, chance: 0.35, cycle: 1.6 },   // green / red on a strict 1.6 s cycle — 1.x's wall clock (performance.now, main.js:10911, read by 1732), here the run's (main.js:7321)
    drift: { from: 10, speed: 0.4, inset: 3 },      // wanders at 0.4 u/s, bouncing 3 inside the walls (main.js:7321, 1688-1691, 1738-1748)
    types: ['hp', 'invincible', 'firerate', 'scoremult'],   // a dash through drops one of these, uniform (main.js:11184-11185, 11188)
    second: 1.2,                            // a green risk gate's second prize, 1.2 to the right (main.js:11188)
    dropLife: 9,                            // its drops' life: 1.x's 9 (the Powerup default). A KNOB (owner, 2026-10-22): longer drops are a heal
    chain: { window: 6, pay: 500 },         // another gate within 6 s pays 500 × N, from N = 2 (main.js:11192-11199)
    zap: { damage: 1, every: 0.5, reach: 0.5 },   // a body whose centre is within 0.2 + 0.5 × its radius of the beam takes 1, one a gate a 0.5 s, as an 'env' kill (main.js:11202-11213, 1768)
    dashShake: 0.14,                        // main.js:11182
    banner: { dud: 1.0, green: 1.1, chain: 1.1 },   // milestoneT (main.js:11171, 11189, 11197)
    shards: { count: 14, size: 0.13 },      // the burst at the gate's centre, half green, half pale (main.js:11176-11181)
    // the look (main.js:1693-1724, 1726-1736, 5891-5906): grey posts, a beam
    // pulsing 0.5 + 0.4 sin(8t) in a halo of 0.12 + 0.18 × that, green, or red
    // on a risk gate's red beat. A retiring gate stands whole for its 4 s and
    // then vanishes, as 1.x's did (main.js:7318-7319, 10918), whatever its v257
    // comment says: it zaps and pays for all 4 s, so it is drawn for all 4 s.
    // DASH THROUGH! (and the bounty's tag) is drawn only while the game is
    // playing (main.js:5893, 6018): not over the pause panel.
    post: { r: 0.25, h: 1.8, segments: 8, color: 0x888899, roughness: 0.4, metalness: 0.2 },   // 1.x's was Phong, shininess 60
    laser: { y: 0.9, w: 0.25, d: 0.5, glow: [0.7, 1.1], opacity: { base: 0.5, amp: 0.4, rate: 8 }, glowOpacity: { base: 0.12, amp: 0.18 } },
    green: 0x44ff88, red: 0xff4455, shard: 0x88ffcc,
    hint: { y: 2.1, color: '#aaffcc', glow: '#44ff88', alpha: [0.75, 0.25], rate: 6 },   // "DASH THROUGH!", alpha 0.75 + 0.25 sin(6t), until a gate has ever been dashed (1.x key tokoDropGateUsed; here toko2.gateUsed)
  },

  // ── §6.5 the cargo convoy (CargoCluster main.js:2316-2395; loop 10757-10813, 10927-10951) ──
  convoy: {
    at: { base: 3, rand: 5 },               // one a wave, 3 + 5·rng s in (main.js:8191-8192), once the last one is gone (main.js:10928)
    count: { base: 3, rand: 3 },            // 3-5 moths (main.js:2318)
    outside: 3, span: 1.5,                  // from a random edge, 3 outside it, at (rand − 0.5) × HALF × 1.5 along it (main.js:2319-2324)
    speed: { base: 5.5, rand: 2 },          // u/s, straight across (main.js:2326)
    gap: 1.4,                               // spaced 1.4 apart across the line (main.js:2337)
    sway: { amp: [3, 5], freq: [0.7, 1.0] },   // sin((0.7–1.7) t + φ) × (3–8) sideways (main.js:2331-2333)
    escape: 5,                              // more than 5 outside the arena: escaped (main.js:2379)
    r: 0.32,                                // the moth, and its hit: 0.32 + the bullet's radius (main.js:2341, 10766)
    drop: { pod: 0.55, score: 0.25, life: 7, drift: [0.8, 0.6] },   // shot: 55% pod, 25% nugget, 20% ×2, drifting 0.8-1.4 u/s, 7 s (main.js:10796-10808)
    sweepLife: 12,                          // the clean sweep's pod, 12 s (main.js:10783-10787)
    shake: 0.08,                            // main.js:10770
    // the look (main.js:2336-2349, 2357-2364)
    // wings flap sin(12t + 0.8i) × 0.75, the body spins 1.5t + 0.5i, moth i of the line
    y: 0.8, color: 0xffdd55, wing: { w: 0.52, h: 0.28, x: 0.40, y: 0.06, color: 0xffee88, opacity: 0.6, flap: 12, amp: 0.75, phase: 0.8 }, spin: { rate: 1.5, phase: 0.5 },
    burst: { count: 5, size: 0.1 },         // a shot moth's gold goo (main.js:10773-10777), at the actors' own spray speeds
  },
  // the clean sweep's pod (2.0, owner 2026-10-22): a DASH pod while the hero's
  // dash level is under `max` — taking it raises the level by one (hero.js
  // dashLevel: 1 kills what it passes, 2 adds the boom) — and 1.x's weapon pod
  // once the dash is maxed
  dashPod: { max: 2 },

  // ── §6.6 bounty (v133; main.js:8149, 9427-9435, 4436-4448, 10446-10457, 6017-6031) ──
  bounty: {
    from: 4, every: 3, at: 1,               // waves w ≥ 4, w % 3 = 1, not a boss wave (main.js:8149)
    time: 8,                                // the first non-boss body landed is marked for 8 s (main.js:9430)
    pay: 1500, perWave: 100,                // killed in time: 1500 + 100w, × 2 under the multiplier (main.js:4437)
    podLife: 10,                            // and a pod at the body (main.js:4442-4443)
    banner: 1.2,                            // main.js:4439
    // the look: a gold ground ring and the countdown over the body (main.js:2503-2510, 10452-10455, 6018-6031)
    // scaled max(0.8, the body's r) × (1 + 0.1 sin(12t)), opacity 0.45 + 0.35 |sin(8t)|
    ring: { inner: 1.05, outer: 1.3, segments: 26, y: 0.05, color: 0xffcc33, min: 0.8, opacity: [0.45, 0.35], pulse: 0.1, rate: 12, blink: 8 },
    // at 1.x's fxY + 2r + 1.3 (main.js:6021); fxY is a body's mid-height, its
    // radius for a blob or a slug and 0.9r for a cube (enemy.js:1479, 1000),
    // which 2.0's bodies standing on the floor put at r
    label: { lift: 1.3, color: '#ffdd66', glow: '#ffcc33' },
    // the mark's ping (main.js:9432, 5860-5875): a gold "!" in a red glow at
    // fxY + 2r + 0.8 for 1.6 s, alpha min(1, 2 × left), its size pulsing
    // 1 + 0.18 sin(20t) (performance.now() × 0.02 in ms)
    ping: { time: 1.6, lift: 0.8, color: '#ffdd44', glow: '#ff4444', pulse: 0.18, rate: 20, size: 20 / 13 },   // 20 px against the labels' 13
  },

  // a heart from kills, 1.x's BINDING suds-heart (main.js:4458-4462). A KNOB,
  // off (owner, 2026-10-22): at chance 0 nothing is drawn
  heart: { chance: 0, life: 8, drift: 0.6, floorCap: 12 },

  // the floor's light under a pickup and along a gate's laser (render/light.js's map)
  light: { item: { r: 0.9, k: 0.22 }, laser: { r: 1.2, k: 0.28 }, moth: { r: 0.8, k: 0.16 } },
  label: { h: 1.2, px: 48 },
  // 1.x's DamageNumber (main.js:2397-2407, 6034-6043): floating text at a
  // world point, rising 2.5 u/s for 0.6 s, alpha = life / 0.6, bold 13 px —
  // "+N" in gold over a nugget (main.js:11276), "x2!" in pink over a ×2
  // (11281), "+N" over a paid bounty at fxY + r + 0.4 (4440-4441); the same
  // 13 px as the labels, so drawn at label.h
  floater: { life: 0.6, rise: 2.5, y: 1.2, score: '#ffdd44', mult: '#ffaaff', bounty: '#ffcc33', bountyLift: 0.4 },                // world-space text (DASH THROUGH!, BOUNTY n): height in metres (the letters ~0.6, about 1.x's 13 px HUD text at the far edge), canvas font size
};
