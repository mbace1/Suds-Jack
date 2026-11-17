// spittor.js — how SPITTOR looks: 1.x's plain satin gel dome (uWobble 1, no
// contrast rim at its luminance, L 0.28) in the snouty silhouette, shaped
// every frame the way 1.x's blob scale block shaped it (enemy.js:2733-2769):
// the squash spring, the breath, the smear it drags, the snout turned to its
// heading — plus its tell: it swells linearly to +22% over the 0.45 s before
// it spits and glows a dull orange 0x442200 the whole time (enemy.js:2686-2687,
// 2758-2760; not on the tell's first frame, which 1.x drew before it set the
// flag). The spit itself is the sim's: a squash kick and a 0.18 kick back.
// The kick back is a snap, not a smear: 1.x sampled the body's velocity
// before it, so the snout and the drag read the sim's g.s.velX/velZ (1.x's
// _velX, its own walk only), never the view's whole-step velocity.
//
// It is `own` because the default dome shaping inflates every tell by a fixed
// 12% and flickers it in the body colour; this one is 1.x's. 1.x put the
// whole transform on one mesh — scale, then the yaw and the nose-up tilt —
// while the view's squash group scales in the world frame above it. So the
// body is a group that undoes the squash group exactly, and the mesh inside
// it carries 1.x's own R·S, squash included: the tilted, squashed snout is
// the shape 1.x drew, not a sheared copy.
export default {
  build(ctx) {
    const mat = ctx.gelMaterial(ctx.S.color, 'blob', 1);
    const mesh = new ctx.THREE.Mesh(ctx.geo.blob, mat);
    const body = new ctx.THREE.Group();
    body.add(mesh);
    return { body, mesh, mat, own: true, blobT: ctx.T.blob, yaw: ctx.S.look.yaw0 };
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
    const swell = 1 + L.inflate * g.tell;
    v.mesh.rotation.set(-drag * B.rearDragTilt, v.yaw, 0);
    v.mesh.scale.set(
      r * shp.x * sxz * swell,
      r * shp.y * (sy - drag * L.dragSink) * swell,
      r * shp.z * (sxz + drag) * swell);
    // the hit flash and a VOLATILE fuse outrank the tell (1.x's emissive
    // order, enemy.js:2650-2690; the fuse is the core's to draw). A shooter
    // never carries an affix in 1.x's classic waves, so this is a guard.
    if (g.flash <= 0 && g.tell > 0 && g.affix !== 'volatile') v.mat.emissive.setHex(L.tellEmissive);
  },

  // a pooled view comes back facing 1.x's starting heading
  reset(v) { v.yaw = v.S.look.yaw0; },
};
