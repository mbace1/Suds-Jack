// splitta.js — SPLITTA, 1.x's splitter: the biggest dome, slow and tough,
// and the one that makes its death your problem. A bullet kill rings out 12
// bullets from the corpse; any kill drops three GLOBBOs round it when its
// death pop ends.
//
// 1.x js/ at v268: the walk enemy.js:1748-1753; the velocity 1680, 2694-2697;
// the low-HP strobe 2663-2665; the split 3058-3061, 2996-3000 and main.js
// 10586-10620; the ring main.js:10729-10736. Spec: docs/port-1x/species-a.md
// §6, bullets-graze.md §5.2. Every number is tuning/species/splitta.js.
//
// Per step (1.x's update, after the swarm forces have moved it):
//   WALK    while farther than 1.2 from you it walks straight at you at spd
//           (CFG speed × the wave's speedMult × swift × a SIREN's surge);
//           inside 1.2 it stands. Contact reaches r + 0.5 = 1.6, so the walk
//           alone brings it onto you. SCHOOL: the swarm forces (the strongest
//           dodge, full flock and current) are the core's, before this; an
//           elite (r 1.32) is over the dodge's 1.1 gate and never sidesteps.
//   TELL    at hp ≤ 2 g.tell is 1: the look strobes 1.x's dark green. It
//           reads hp as this step starts, so a hit that takes it to 2 shows
//           on the next step, as 1.x's emissive block (before the bullets) did.
//   then its own velocity is smoothed for the look (1.x `_velX`, its walk only).
// No gun while it lives; no special hits (5 hp, every bullet lands).
//
// On its death (the core's kill, then this):
//   RING    only if a hero bullet killed it — 12 at 30°, the first along +x,
//           at the gel bullet's 7 u/s, lime 0xaaff44, not revenge (so the
//           HARDCADE field cap neither counts nor stops it), in every mode.
//   SPLIT   3 GLOBBOs at (j/3)·2π + U·0.3, 1.2 + U·1.5 u out, on the parent's
//           speedMult (× swift, which 1.x baked into _speedMult) and
//           intervalMult; ordinary bodies (hp 1, no variant, no affix, no
//           ping), up to the director's child valve (the live cap × 2). They
//           land when the 0.28 s death pop ends, as 1.x's did: spawned now,
//           they are handed back to the core's wait (state 'appear', t =
//           −0.28), so until then they can neither hurt, be hit, move, nor
//           be rattled by a big death's shockwave (its own or another's).
//
// Where the contract cannot say it (docs/SIM_CONTRACT.md has no delayed
// spawn): 1.x built the brood, and counted the valve, at the END of the pop;
// here both happen at the kill, so the waiting brood counts as alive for
// those 0.28 s. And 1.x fired a VOLATILE affix's 8-ring before this ring
// (main.js:4367-4377, then 10731); the core fires it after onKill.
const TAU = Math.PI * 2;

export default {
  init(w, g) {
    g.s.velX = 0; g.s.velZ = 0;          // 1.x `_velX/_velZ`: its own movement, smoothed
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero;
    const dx = h.x - g.x, dz = h.z - g.z, dist = Math.hypot(dx, dz) || S.distFloor;
    if (dist > S.stopAt) {
      const spd = api.speed(g);
      g.vx = (dx / dist) * spd; g.vz = (dz / dist) * spd;
      g.faceX = dx / dist; g.faceZ = dz / dist;
    }
    g.tell = g.hp <= S.lowHp ? 1 : 0;
    s.velX += (g.vx - s.velX) * S.velSmooth; s.velZ += (g.vz - s.velZ) * S.velSmooth;
  },

  onKill(w, g, api, src) {
    const S = api.S(g), R = S.ring, C = S.children;
    // the ring: a player-bullet kill only (1.x main.js:10729-10736). The core
    // names the killer; a call without one is a bullet's, the commonest.
    if (R.from.includes(src ?? 'hero')) {
      api.fire.ring(w, g.x, g.z, R.count, R.base, { color: S.bulletColor, src: g.kind, speedMult: R.speedMult });
      w.events.push({ type: 'gelShot', x: g.x, z: g.z, kind: g.kind });
    }
    // the brood: every place is drawn first, as 1.x's toSpawn list was, then
    // they come out until the child valve closes (1.x main.js:10587-10620)
    const pts = [];
    for (let j = 0; j < C.count; j++) {
      const a = (j / C.count) * TAU + w.rng.next() * C.jitter;
      const d = C.dist[0] + w.rng.next() * (C.dist[1] - C.dist[0]);
      pts.push([g.x + Math.cos(a) * d, g.z + Math.sin(a) * d]);
    }
    const n = Math.min(pts.length, api.childrenAllowed(w));
    const speedMult = g.speedMult * (g.affix === 'swift' ? api.T.variants.swiftSpeed : 1);
    const wait = api.T.blob.death;
    for (let j = 0; j < n; j++) {
      const c = api.spawn(w, C.kind, pts[j][0], pts[j][1], { child: true, speedMult, intervalMult: g.intervalMult });
      // 2.0's walls hold every body; 1.x's child could stand up to 2.7 outside one
      api.clamp(w, c);
      // not yet: the core's wait (state 'appear', t < 0) for the death pop's
      // 0.28 s — which also keeps it out of the big-death shockwave (a SPLITTA
      // is big, 1.1) the core runs after this hook: 1.x built its GLOBBOs at
      // rest, sq 1 and sqV 0 (enemy.js:669-670), after the shock (main.js:4518-4529)
      c.state = 'appear'; c.t = -wait;
    }
  },
};
