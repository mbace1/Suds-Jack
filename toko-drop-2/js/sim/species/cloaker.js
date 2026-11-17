// cloaker.js — CLOAKER, 1.x's ambusher (v143; enemy.js:1201-1206, 1843-1886).
// An ice-blue gel dome that never walks at you: it lingers a beat in full
// view, fades to a faint shimmer and runs to a flank point a quarter turn
// round you, fades back in over 0.6 s — the tell — and spits one aimed
// three-shot burst from where it stands. Then again. It punishes tunnel
// vision; a cloaked one can still be shot ("tracking pays").
//
// One timer (1.x `_ckT`) is counted down by dt at the top of every step and
// read by the state it is in:
//   VISIBLE  it stands (only the swarm forces move it: HUNTER's dodge, weave
//            and current, in every state). When the beat runs out it draws,
//            in 1.x's order, the run's clock (1.8 + U·0.6 s), a side (U < 0.5
//            → +1) and the flank point: from the angle the hero sees it at,
//            turned side·(π/2 + U·0.6), 6.5 + U·1.5 from the hero — not
//            clamped to the arena. It does not move on that step.
//   CLOAK    it runs at its walking speed (speed × speedMult × swift × surge)
//            straight for the point while farther than 0.3 from it; when the
//            clock runs out or it is within 0.3 (measured before this step's
//            run) it starts to decloak, the same step. A point past a wall:
//            1.x had no per-frame enemy clamp, so the run carried it off the
//            floor; 2.0's curbs are walls, so the core holds it at the wall
//            until the clock ends (species-a.md §1.1-1.2).
//   DECLOAK  0.6 s fading back in, k = 1 − max(t, 0)/0.6. When the clock runs
//            out: fanStep(aim, 3, 0.18) at the hero from where it stood at the
//            top of the step, plain 7 u/s gel shots in 0x88eeff, and a fresh
//            visible beat of 0.9 + U·0.5 s.
// The cloak is a LOOK, not a rule: 1.x's bullet test and hit() have no
// cloak branch (main.js:10636-10720, enemy.js:1603-1667), so the plain circle
// is hit in every state and there is no hitTest or onHit here. What the look
// needs is written each step as 1.x's _setOpacity calls would have drawn it:
// g.cloak 0 (full) … 1 (cloaked to the 0.14 floor), and g.s.drew, the branch
// that drew this step ('visible', 'cloak' with its shimmer, 'decloak' with
// its strobe, 'burst' snapped back to full).
//
// It is otherwise plain: the core's contact (none: not a MELEE_TYPE), death
// and elites; in HARDCADE its corpse bites AIMED (a biter, 1.x tuning.js:
// 496-497, 510). Wave escalation reaches its run speed and nothing else: 1.x
// read no `_intervalMult` on this cycle. Numbers: js/tuning/species/cloaker.js.

const draw = (w, d) => d.base + w.rng.next() * d.rand;    // 1.x's `base + Math.random() * rand`

export default {
  init(w, g, api) {
    const S = api.S(g), s = g.s;
    s.state = 'visible';                 // 1.x `_ckState`
    s.t = draw(w, S.firstVisible);       // 1.x `_ckT = 0.8 + rand·0.6` (enemy.js:1204)
    s.tx = g.x; s.tz = g.z;              // 1.x `_ckTx/_ckTz`: the flank point (enemy.js:1205)
    s.side = 0;                          // the side of the last flank (+1 / −1)
    s.k = 0;                             // the decloak's progress, 0 → 1
    s.drew = 'visible';
    s.bursts = 0;                        // bursts fired (the look and the tests count them)
    g.cloak = 0;
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero;
    s.t -= dt;                           // enemy.js:1844
    if (s.state === 'visible') {
      // linger a beat at full presence, then vanish and pick a flank spot
      // ~90° around the player at mid range (enemy.js:1845-1857)
      s.drew = 'visible';
      if (s.t <= 0) {
        s.state = 'cloak';
        s.t = draw(w, S.cloak);
        const side = w.rng.next() < S.flankSide ? 1 : -1;
        const a0 = Math.atan2(g.z - h.z, g.x - h.x) + side * (S.flankTurn + w.rng.next() * S.flankJitter);
        const r0 = draw(w, S.flankRange);
        s.tx = h.x + Math.cos(a0) * r0; s.tz = h.z + Math.sin(a0) * r0;
        s.side = side;
      }
    } else if (s.state === 'cloak') {
      // shimmer-run to the flank point; still hittable (enemy.js:1858-1868)
      s.drew = 'cloak'; g.cloak = 1;
      const mx = s.tx - g.x, mz = s.tz - g.z, ml = Math.hypot(mx, mz);
      if (ml > S.arrive) {
        const v = api.speed(g);
        g.vx = (mx / ml) * v; g.vz = (mz / ml) * v;
        g.faceX = mx / ml; g.faceZ = mz / ml;
      }
      if (s.t <= 0 || ml <= S.arrive) { s.state = 'decloak'; s.t = S.decloak; s.k = 0; }
    } else {
      // decloak: the tell — fade back in, then the burst (enemy.js:1869-1884)
      s.k = 1 - Math.max(s.t, 0) / S.decloak;
      g.cloak = 1 - s.k; s.drew = 'decloak';
      if (s.t <= 0) {
        g.cloak = 0; s.drew = 'burst';
        const aim = api.fire.aimAngle(w, g.x, g.z);
        api.fire.fanStep(w, g.x, g.z, aim, S.burst.count, S.burst.step, { color: S.bulletColor, src: g.kind, speedMult: S.burstSpeedMult });
        w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind, id: g.id, angle: aim, n: S.burst.count });
        s.state = 'visible';
        s.t = draw(w, S.visible);
        s.bursts++;
      }
    }
  },
};
