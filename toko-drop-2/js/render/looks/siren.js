// siren.js — how SIREN looks: 1.x's plain satin gel dome (uWobble 1, no
// contrast rim at its luminance, L 0.273, no eyes — "blobs read by silhouette
// + motion tell", v98) in the default squat silhouette, lilac 0xbb66ff, shaped
// every frame the way 1.x's blob scale block shaped it (enemy.js:2731-2769):
// the squash spring, the breath, the smear it drags along the floor (nose
// lifting, rear dragging), turned to its heading. Plus two things of its own:
//
// THE INHALE (v141, enemy.js:1826-1829): over the 0.8 s before it screams it
// swells to 1.45× and strobes its glow 0x6633aa / 0x220044 on sin(20·clock).
// 1.x wrote both and overwrote both in the same frame, so it never drew them
// (species-a.md §8.4); the port draws the tell v141 meant, from g.tell (the
// inhale's progress k, which the sim leaves at 0 when tuning `inhaleTell` is
// off). The hit flash and a VOLATILE body's smoulder outrank the strobe, as
// they outranked every species' own glow in 1.x.
//
// THE DEATH POP: the core grows an own look's root for its last 0.28 s and
// stops updating it, so the mesh is put back to 1.x's plain round base
// (r × the elite's 1.2, the squash reset) before each of those frames draws.
//
// THE SCREAM RING (1.x ScreamRing, main.js:2518-2540): a flat additive violet
// ring, RingGeometry(0.82, 1.0, 40) at y 0.05, that grows from where it
// screamed out to exactly the surge's reach (scale 1 + 6k) while its opacity
// falls 0.7·(1 − k), over 0.55 s. It stays where it was let out and plays out
// even if the SIREN dies inside it (1.x kept it in main.js's own list): the
// body's view is pooled and only updated while the body lives, so the ring
// lies in the scene, not under the body, and animates itself in
// onBeforeRender on the shared gel clock (GEL_TIME). It starts when the view
// sees the sim's scream counter move (g.s.screams, from g.s.screamX/Z).
//
// It is `own` for 1.x's details the default dome shaping does not carry: the
// size is the BODY's radius (r × the elite's 1.2, 1.x `r·rm`); the breath and
// the strobe run on the body's own clock and phase (g.s.clock, g.s.phase,
// 1.x `_wobbleT`, `_phase`); the smear and heading follow its OWN movement
// (g.s.velX/velZ, 1.x `_velX`), so the swarm's current carrying it does not
// smear or turn it; and the swell is 1.x's 45%, not the default 12%. 1.x put
// the whole transform on one mesh — scale, then the yaw and the nose-up tilt —
// while the view's squash group scales in the world frame above it; so the
// body is a group that undoes the squash group exactly and the mesh inside it
// carries 1.x's own rotation and scale, squash included.
export default {
  build(ctx) {
    const mat = ctx.gelMaterial(ctx.S.color, 'blob', 1);
    const mesh = new ctx.THREE.Mesh(ctx.geo.blob, mat);
    const body = new ctx.THREE.Group();
    body.add(mesh);
    return { body, mesh, mat, own: true, blobT: ctx.T.blob, shp: ctx.T.blob.shape, yaw: ctx.S.look.yaw0, seen: 0, ring: makeRing(ctx) };
  },

  update(v, g, w, time, grow) {
    const B = v.blobT, L = v.S.look, shp = v.shp, s = g.s;
    // undo the squash group (1/√sq, sq, 1/√sq): the mesh below is 1.x's whole transform
    const rq = Math.sqrt(g.sq);
    v.body.scale.set(rq, 1 / g.sq, rq);

    const r = g.r * grow;                                    // 1.x r × _radiusMult
    const clock = s.clock ?? time, phase = s.phase ?? v.phase;
    const sx = 1 / Math.sqrt(Math.max(g.sq, L.sqFloor));
    const breathe = B.breatheAmp * Math.sin(clock * B.breatheHz + phase);
    const sy = g.sq * (1 + breathe), sxz = sx * (1 - breathe * L.breatheXZ);
    const vx = s.velX ?? 0, vz = s.velZ ?? 0, sp = Math.hypot(vx, vz);
    const drag = Math.min(sp * B.dragStretchPerSpeed, B.dragMax);
    if (sp > L.yawMinSpeed) v.yaw = Math.atan2(vx, vz);
    const swell = 1 + L.swell * g.tell;                      // the inhale (1.x enemy.js:1828)
    v.mesh.rotation.set(-drag * B.rearDragTilt, v.yaw, 0);
    v.mesh.scale.set(
      r * shp.x * sxz * swell,
      r * shp.y * (sy - drag * L.dragSink) * swell,
      r * shp.z * (sxz + drag) * swell);
    // the inhale's strobe; the hit flash and a VOLATILE body's smoulder
    // outrank it, as they outranked every species' own glow in 1.x's emissive
    // chain (enemy.js:2650-2656) — the core has already drawn those
    if (g.flash <= 0 && g.affix !== 'volatile' && g.tell > 0) v.mat.emissive.setHex(Math.sin(clock * L.strobeHz) > 0 ? L.strobe[0] : L.strobe[1]);
    if (!v.deathHook) { v.deathHook = true; v.mesh.onBeforeRender = () => { if (v.dyingT > 0) deathPose(v); }; }

    // a new scream lets a ring out where it was screamed
    const n = s.screams || 0;
    if (n !== v.seen) {
      v.seen = n;
      if (n > 0) startRing(v.ring, s.screamX, s.screamZ, time);
    }
  },

  // a pooled view comes back facing 1.x's starting heading, with no scream
  // seen (a ring still playing out from its last body is left to finish)
  reset(v) { v.yaw = v.S.look.yaw0; v.seen = 0; },
};

// The death pop. While a killed body plays out its last 0.28 s the core
// stops updating its view and, for an own look, grows only the root
// (1 + 1.3t); left alone, the mesh would keep its last shaped, breathing,
// maybe swollen pose and the body group its undo of a squash the core has
// just reset to 1 — a stretched dome where 1.x drew a round one. 1.x's
// destroy() reset the squash and the scale to the plain base, r × the
// elite's 1.2 (enemy.js:3013, 3026, `_deathBaseScale` 1482-1484), and
// updateDeath grew that (enemy.js:2981); the mesh keeps its heading and
// tilt, as 1.x's did.
function deathPose(v) {
  v.body.scale.set(1, 1, 1);
  v.mesh.scale.setScalar(v.r ?? v.S.radius);
  v.body.updateMatrixWorld(true);                      // this frame's draw reads the new pose
}

// the ring: one per view (a SIREN screams at most every 4.3 s; a ring lasts 0.55 s)
function makeRing(ctx) {
  const { THREE } = ctx, R = ctx.S.look.ring;
  const mat = new THREE.MeshBasicNodeMaterial({
    color: R.color, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(R.inner, R.outer, R.segments), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = R.y;
  mesh.visible = false; mesh.frustumCulled = false;
  const ring = { mesh, mat, R, reach: ctx.S.reach, start: -Infinity };
  mesh.onBeforeRender = () => drawRing(ring, ctx.GEL_TIME.value);
  ctx.scene.add(mesh);
  return ring;
}

function startRing(ring, x, z, now) {
  ring.start = now;
  ring.mesh.position.set(x, ring.R.y, z);
  ring.mesh.visible = true;
  drawRing(ring, now);
}

// 1.x ScreamRing.update (main.js:2533-2538): k = t / 0.55, scale 1 + k·(7 − 1),
// opacity 0.7·(1 − k); gone once k reaches 1
function drawRing(ring, now) {
  const k = (now - ring.start) / ring.R.life;
  if (!(k >= 0 && k < 1)) { ring.mat.opacity = 0; ring.mesh.visible = false; return; }
  ring.mesh.scale.setScalar(1 + k * (ring.reach - 1));
  ring.mesh.updateMatrixWorld();                       // this frame's draw reads the new size
  ring.mat.opacity = ring.R.opacity * (1 - k);
}
