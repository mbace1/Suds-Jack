// splitta.js — SPLITTA, 1.x's splitter: the biggest dome, slow and tough,
// and the one that makes its death your problem. A bullet kill rings out 12
// bullets from the corpse; any kill drops three GLOBBOs round it when its
// death pop ends.
//
// 1.x js/ at v268: the walk enemy.js:1748-1753; the velocity 1680, 2694-2697;
// the low-HP strobe 2663-2665; the split 3058-3061, 2996-3000 and main.js
// 10586-10620; the ring main.js:10731-10736. Spec: docs/port-1x/species-a.md
// §6, bullets-graze.md §5.2. Every number is tuning/species/splitta.js.
//
// Per step (1.x's update, after the swarm forces have moved it):
//   WALK    while farther than 1.2 from you it walks straight at you at spd
//           (CFG speed × the wave's speedMult × swift × a SIREN's surge);
//           inside 1.2 it stands. Contact reaches r + 0.5 = 1.6, so the walk
//           alone brings it onto you. SCHOOL: the swarm forces (the strongest
//           dodge, full flock and current) are the core's, before this.
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
//           they are handed back to the core's `appear` with that long left,
//           so until then they can neither hurt, be hit, nor move.
const TAU = Math.PI * 2;

export default {
  init(w, g) {
    g.s.velX = 0; g.s.velZ = 0;          // 1.x `_velX/_velZ`: its own movement, smoothed
  },

  step(w, g, dt, api) {
    const S = api.S(g), s = g.s, h = w.hero;
    const dx = h.x - g.x, dz = h.z - g.z, dist = Math.hypot(dx, dz) || 0.001;
    if (dist > S.stopAt) {
      const spd = api.speed(g);
      g.vx = (dx / dist) * spd; g.vz = (dz / dist) * spd;
      g.faceX = dx / dist; g.faceZ = dz / dist;
    }
    g.tell = g.hp <= S.lowHp ? 1 : 0;
    s.velX += (g.vx - s.velX) * S.velSmooth; s.velZ += (g.vz - s.velZ) * S.velSmooth;
  },

  onKill(w, g, api) {
    const S = api.S(g), R = S.ring, C = S.children;
    // the ring: a player-bullet kill only (1.x main.js:10729-10736)
    if (R.from.includes(killedBy(w, g))) {
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
    const cap = w.dir?.childCap > 0 ? w.dir.childCap : Infinity;
    let live = 0;
    if (cap < Infinity) for (const o of w.gels) if (o.alive) live++;
    const speedMult = g.speedMult * (g.affix === 'swift' ? api.T.variants.swiftSpeed : 1);
    const wait = api.T.blob.death, appear = api.T.gel.appear;
    for (const [x, z] of pts) {
      if (live >= cap) break;
      const c = api.spawn(w, C.kind, x, z, { child: true, speedMult, intervalMult: g.intervalMult });
      api.clamp(w, c);
      // not yet: the core's `appear`, with the death pop's 0.28 s left of it
      c.state = 'appear'; c.t = appear - wait;
      live++;
    }
  },
};

// what killed it: the core's kill event, pushed just before onKill, names it
// ('hero' a hero bullet, 'dash', 'env'); with none, the commonest — a bullet
function killedBy(w, g) {
  for (let i = w.events.length - 1; i >= 0; i--) {
    const e = w.events[i];
    if (e.type === 'kill' && e.id === g.id) return e.src;
  }
  return 'hero';
}
