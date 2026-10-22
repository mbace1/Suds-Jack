// bambu.js — BAMBU, 1.x's lobber (v86): a bamboo stalk that rises out of the
// floor, grows to three segments, and lobs a glowing blob onto a flashing
// ring it has laid near you. Shooting it pops segments off the top — and
// they grow back.
//
// 1.x js/enemy.js at v268: construction 865-933, the radius 1468-1470, the
// segment pop in hit() 1627-1639, emergence and growth 2537-2560, the lob in
// _tick 2811-2868, death 3078-3079; the splashdown main.js:10501-10520.
// Spec: docs/port-1x/species-b.md §8, bullets-graze.md §5.2. Every number is
// tuning/species/bambu.js.
//
// Per step, in 1.x's frame order (the movement switch, then the fire tick):
//   EMERGE   0.6 s rising out of the floor; it can be shot from its first
//            step (one segment, one hit, a 0.6 hitbox: "tiny until it grows,
//            which is the point")
//   GROW     once emerged, a segment every 0.18 s up to three, each one +1
//            hp and +0.6 of hitbox (0.6, 1.2, 1.8). The grow clock keeps
//            running at full height, so a segment shot off grows back the
//            very next step if 0.18 s have passed since the last growth: a
//            full stalk takes ≈5 hits from one stream, not 3 (spec trap 17)
//   STRAIN   what the look draws, read here before the tick as 1.x's scale
//            block read it: the telegraph's progress, 0..1
//   WAITING  the fire clock: 1.3 s from its arrival (running through the
//            emergence), then 4.0 × intervalMult from each landing. It also
//            waits for the emergence to end
//   TELL     0.7 s: the target is fixed (the hero's spot ± 1.2 on each axis,
//            from the seeded stream), the ring flashes there and the charge
//            orb climbs the stalk
//   LOB      the step the tell runs out: the blob leaves the stalk's top
//            (api.fire.lob, not a pool bullet: no graze, cannot be shot down)
//            and flies 1.0 s whatever the distance; it hurts the hero inside
//            the ring's outer edge + 0.5 at the instant it lands, then
//            nothing lingers. The fire clock restarts at the landing
// It takes no squash spring (1.x skips it), never walks (speed 0; the wave's
// current still drifts it), and if it dies mid-cycle the ring goes and the
// blob in the air never lands.
export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.segs = 1;                        // 1.x _segs: one segment to start
    g.hp = 1;                          // 1.x enemy.js:876, whatever the spawn asked for
    g.maxHp = S.segments;              // 1.x hpFrac = hp / _maxSegs
    g.r = radius(S, 1);
    s.emergeT = S.emerge;              // 1.x _emergeT
    s.growT = S.growEvery;             // 1.x _growTimer
    s.fireT = S.firstLob;              // 1.x _bambuFireTimer
    s.state = 'waiting';               // 1.x _bambuState
    s.timer = 0;                       // 1.x _bambuTimer
    s.lobT = 0;                        // 1.x _lobT: the ring's flash clock, telegraph and flight
    s.tx = 0; s.tz = 0;                // 1.x _lobTargetX/Z
    s.strain = 0;                      // the telegraph's progress the scale block read
    s.lob = null;                      // the lob in the air, so a death can take it back
    s.pops = 0; s.popY = 0;            // segments shot off so far, and where the last one was (the look's chunks)
    g.sq = 1; g.sqV = 0;
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s;
    // 1.x skips the squash spring for BAMBU (enemy.js:2727): it never squashes
    g.sq = 1; g.sqV = 0;
    // a segment lost to anything but a shot (the hp is the segments)
    if (g.hp < s.segs) s.segs = Math.max(0, g.hp);

    // the movement switch (1.x enemy.js:2537-2560)
    if (s.emergeT > 0) s.emergeT -= dt;
    if (s.emergeT <= 0) {
      s.growT -= dt;
      if (s.growT <= 0 && s.segs < S.segments) {
        s.growT = S.growEvery;
        s.segs++; g.hp++;
        w.events.push({ type: 'grow', id: g.id, kind: g.kind, segs: s.segs });
      }
      s.strain = s.state === 'telegraphing' ? 1 - Math.max(s.timer, 0) / S.lobTelegraph : 0;
    }
    g.r = radius(S, s.segs);

    // the fire tick (1.x enemy.js:2811-2868)
    if (s.state === 'waiting') {
      s.fireT -= dt;
      if (s.fireT <= 0 && s.emergeT <= 0) {
        s.state = 'telegraphing';
        s.timer = S.lobTelegraph;
        s.lobT = 0;
        s.tx = w.hero.x + w.rng.range(-S.lobSpread, S.lobSpread);
        s.tz = w.hero.z + w.rng.range(-S.lobSpread, S.lobSpread);
        w.events.push({ type: 'tell', id: g.id, kind: g.kind, x: s.tx, z: s.tz });
      }
    } else if (s.state === 'telegraphing') {
      s.timer -= dt; s.lobT += dt;
      if (s.timer <= 0) {
        s.state = 'lobbing';
        s.timer = S.lobFlight;
        api.fire.lob(w, g.x, g.z, s.tx, s.tz, S.lobFlight, S.lobArcHeight,
          { splash: S.ring.outer, color: S.bulletColor, src: g.kind, size: S.lobBlobRadius });
        s.lob = w.lobs[w.lobs.length - 1];
        w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind, id: g.id, lob: true, tx: s.tx, tz: s.tz });
      }
    } else if (s.state === 'lobbing') {
      s.timer -= dt; s.lobT += dt;
      if (s.timer <= 0) {
        s.state = 'waiting';
        s.fireT = S.fireInterval * g.intervalMult;
        s.lob = null;
      }
    }
  },

  // A shot pops the top segment (1.x enemy.js:1627-1638) and its hitbox
  // shrinks at once, so the next bullet this step meets the shorter stalk.
  // The core then takes the hp. A WARDEN's aura blocks before 1.x's hit()
  // runs, so a shielded stalk loses nothing.
  onHit(w, g, b, api) {
    if (g.shield) return;
    const S = api.S(g), s = g.s;
    if (s.segs <= 0) return;
    s.segs--;
    g.r = radius(S, s.segs);
    s.pops++; s.popY = (s.segs + 0.5) * S.segHeight;      // 1.x segY (enemy.js:1630)
    w.events.push({ type: 'segPop', id: g.id, kind: g.kind, segs: s.segs, x: g.x, z: g.z, y: s.popY });
  },

  // Dying mid-cycle takes the ring and the blob with it: nothing lands
  // (1.x enemy.js:3078-3079).
  onKill(w, g) {
    const s = g.s;
    if (s.lob) { const i = w.lobs.indexOf(s.lob); if (i >= 0) w.lobs.splice(i, 1); s.lob = null; }
    s.state = 'dead';
  },
};

// 1.x's radius getter: max(0.6, 0.6 × segments) (enemy.js:1469)
function radius(S, segs) { return Math.max(S.hitRadius.min, segs * S.hitRadius.perSeg); }
