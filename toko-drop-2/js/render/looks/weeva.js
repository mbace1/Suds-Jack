// weeva.js — how WEEVA looks: 1.x's satin gel dome (uWobble 1) in the taller
// "drill dome" silhouette (1.x tuning.js:43 — not in the core's
// TUNING.blob.shapes, so it lives here, from tuning/species/weeva.js), shaped
// every frame the way 1.x's blob scale block shaped it (enemy.js:2732-2769):
// the squash spring, the breath, the smear it drags, turned to its heading —
// plus its one tell, a constant drill VIBRATION, 0.03 at 40 rad/s (≈ 6.4 Hz),
// added across and taken off the height (enemy.js:2761-2762, 2767-2768;
// tuning.js:49). 1.x runs that vibration on the body's OWN clock, `_wobbleT`
// (seeded U(0, 2π), advanced after each walk), which the sim keeps as
// g.s.clock — so the drill reads that, not the render clock with a random
// offset: it is 1.x's phase, it replays from the seed, and it stands still
// when the run does. The breath stays on the render clock with the rest of
// the roster (the core's default dome and SPITTOR's look): one clock for a
// wave's breathing, so WEEVA breathes beside its neighbours, not out of step
// with them.
//
// No telegraph glow (1.x gives WEEVA none: enemy.js:2650-2690), so the core's
// emissive chain (the hit flash, else nothing) is the whole story. Its colour
// sits under 1.x's v246 contrast floor (L 0.0855 against 0.16), which the
// core's gelMaterial applies on its own, as 1.x's makeSatinMat did: a fresnel
// rim of 1.025 in the colour lifted 55% to white, and the base lifted to
// 0.096 luminance (≈ 0x4824fb), so it does not read as a hole in the floor.
//
// It is `own` because the default dome shaping wears the core's squat shape
// and no vibration. 1.x put the whole transform on one mesh — scale, then the
// yaw and the nose-up tilt — while the view's squash group scales in the
// WORLD frame above it; a squash above a rotation is a shear, not 1.x's
// transform (small here — a drill tilts by at most a few degrees — but the
// exact form costs nothing). So, as SPITTOR's look does, the body is a group
// that undoes the squash group exactly, and the mesh inside it carries 1.x's
// own R·S, squash included. It turns and smears by 1.x's own smoothed
// velocity, which the sim keeps (g.s.velX/velZ: the body's own walk only,
// 1.x enemy.js:2696-2697), not by the view's, which also carries the swarm's
// current and the crowd.
export default {
  build(ctx) {
    const mat = ctx.gelMaterial(ctx.S.color, 'blob', 1);
    const mesh = new ctx.THREE.Mesh(ctx.geo.blob, mat);
    const body = new ctx.THREE.Group();
    body.add(mesh);
    return { body, mesh, mat, own: true, blobT: ctx.T.blob };
  },

  update(v, g, w, time, grow) {
    const B = v.blobT, L = v.S.look, shp = L.shape;
    // undo the squash group (1/√sq, sq, 1/√sq): the mesh below is 1.x's whole transform
    const rq = Math.sqrt(g.sq);
    v.body.scale.set(rq, 1 / g.sq, rq);

    const r = g.r * grow;                                   // 1.x r × _radiusMult (enemy.js:2736, 2767-2769)
    const sx = 1 / Math.sqrt(Math.max(g.sq, L.sqFloor));    // enemy.js:2732
    const breathe = B.breatheAmp * Math.sin(time * B.breatheHz + v.phase);   // enemy.js:2749
    const sy = g.sq * (1 + breathe), sxz = sx * (1 - breathe * L.breatheXZ); // enemy.js:2750-2751
    const jit = L.vibrate * Math.sin(g.s.clock * L.vibrateRate);             // enemy.js:2761-2762, on the body's clock
    const vx = g.s.velX || 0, vz = g.s.velZ || 0, sp = Math.hypot(vx, vz);
    const drag = Math.min(sp * B.dragStretchPerSpeed, B.dragMax);            // enemy.js:2754
    if (sp > L.yawMinSpeed) v.yaw = Math.atan2(vx, vz);                      // enemy.js:2755
    v.mesh.rotation.set(-drag * B.rearDragTilt, v.yaw, 0);                   // enemy.js:2765 (no rock: that is FANNER's)
    v.mesh.scale.set(                                                        // enemy.js:2766-2769
      r * shp.x * (sxz + jit),
      r * shp.y * (sy - drag * L.dragSink - jit),
      r * shp.z * (sxz + drag));
  },

  // a pooled view starts facing +z, as every 1.x body did (`_moveYaw = 0`,
  // enemy.js:806), not wherever its last owner was looking
  reset(v) { v.yaw = 0; },
};
