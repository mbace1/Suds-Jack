// fanner.js — how FANNER looks: 1.x's plain satin gel dome (uWobble 1, no
// contrast rim at its luminance, L 0.242) in the "wide flat pancake"
// silhouette, shaped every frame the way 1.x's blob scale block shaped it
// (enemy.js:2732-2769): the squash spring, the breath, the smear it drags,
// turned to its heading — plus its two tells. A constant SWAY, a roll of
// 0.10 rad at 7 rad/s (≈ 1.1 Hz) about its own long axis (enemy.js:2763-2765,
// tuning.js:50), so the wide pancake rocks side to side the whole time; and
// the 0.4 s before each volley a dark magenta glow 0x440022 (enemy.js:
// 2686-2687; not on the tell's first frame, which 1.x drew before it set the
// flag). No inflate: that is SPITTOR's tell only (enemy.js:2758-2760). The
// volley itself is the sim's −0.8 squash kick.
//
// It is `own` because the default dome shaping inflates every tell by a fixed
// 12%, flickers it in the body colour and has no sway; this one is 1.x's.
// 1.x put the whole transform on one mesh — scale, then rotation (−drag ×
// tilt, yaw, rock) in three's XYZ order, so the rock rolls the scaled pancake
// about its own length before it is turned to its heading — while the view's
// squash group scales in the world frame above it. So the body is a group that
// undoes the squash group exactly, and the mesh inside it carries 1.x's own
// R·S, squash included: the rocking, squashed pancake is the shape 1.x drew,
// not a sheared copy. The heading and the smear read the sim's g.s.velX/velZ
// (1.x's _velX, its own walk only), not the view's whole-step velocity, which
// also carries the wave's current and the crowd's nudges.
export default {
  build(ctx) {
    const mat = ctx.gelMaterial(ctx.S.color, 'blob', 1);
    const mesh = new ctx.THREE.Mesh(ctx.geo.blob, mat);
    const body = new ctx.THREE.Group();
    body.add(mesh);
    // 1.x's breath and sway read one body clock, U(0, 2π) at spawn
    // (enemy.js:668); the view runs on the render clock, so the sway gets its
    // own random offset to keep a wave's pancakes out of step
    return { body, mesh, mat, own: true, blobT: ctx.T.blob, yaw: ctx.S.look.yaw0, swayPhase: Math.random() * Math.PI * 2 };
  },

  update(v, g, w, time, grow) {
    const B = v.blobT, L = v.S.look, shp = L.shape;
    // undo the squash group (1/√sq, sq, 1/√sq): the mesh below is 1.x's whole transform
    const rq = Math.sqrt(g.sq);
    v.body.scale.set(rq, 1 / g.sq, rq);

    const r = g.r * grow;                                   // 1.x r × _radiusMult
    const sx = 1 / Math.sqrt(Math.max(g.sq, L.sqFloor));
    const breathe = B.breatheAmp * Math.sin(time * B.breatheHz + v.phase);
    const sy = g.sq * (1 + breathe), sxz = sx * (1 - breathe * L.breatheXZ);
    const vx = g.s.velX || 0, vz = g.s.velZ || 0, sp = Math.hypot(vx, vz);
    const drag = Math.min(sp * B.dragStretchPerSpeed, B.dragMax);
    if (sp > L.yawMinSpeed) v.yaw = Math.atan2(vx, vz);
    const rock = L.sway * Math.sin(time * L.swayRate + v.swayPhase);
    v.mesh.rotation.set(-drag * B.rearDragTilt, v.yaw, rock);
    v.mesh.scale.set(
      r * shp.x * sxz,
      r * shp.y * (sy - drag * L.dragSink),
      r * shp.z * (sxz + drag));
    // the hit flash and a VOLATILE fuse outrank the tell (1.x's emissive
    // order, enemy.js:2650-2690: flash, then the fuse, then the tell; the
    // fuse is the core's to draw). A shooter never carries an affix in 1.x's
    // classic waves (main.js:279-297), so this is a guard.
    if (g.flash <= 0 && g.tell > 0 && g.affix !== 'volatile') v.mat.emissive.setHex(L.tellEmissive);
  },

  // a pooled view comes back facing 1.x's starting heading
  reset(v) { v.yaw = v.S.look.yaw0; },
};
