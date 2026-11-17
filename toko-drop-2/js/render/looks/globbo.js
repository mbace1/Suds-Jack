// globbo.js — how GLOBBO looks: 1.x's plain satin gel dome (uWobble 1, no
// contrast rim at its luminance, no eyes — "blobs read by silhouette + motion
// tell", v98) in the default squat silhouette, teal 0x00ccaa, shaped every
// frame the way 1.x's blob scale block shaped it (enemy.js:2727-2769): the
// squash spring, the breath, the smear it drags along the floor (nose
// lifting, rear dragging), turned to its heading.
//
// Its tells are all motion, and all the sim's: the lunge surges (the smear
// and the heading pick them up from the body's velocity), the −0.85 crouch
// squash and the +0.7 launch stretch (the squash spring). 1.x gives the
// crouch no glow, so the sim leaves g.tell at 0 and this draws none.
//
// It is `own` for 1.x's details the default dome shaping does not carry:
//  - the size is the BODY's radius (r × the elite's 1.2, 1.x `r·rm`);
//  - the breath runs on the body's own clock and phase, the same `_wobbleT`
//    and `_phase` its lunge reads (g.s.clock, g.s.phase), so the breath and
//    the surge keep 1.x's fixed relation, and both hold still while the game
//    does (1.x's update did not run while paused);
//  - the smear and heading follow its OWN movement (g.s.velX/velZ, 1.x
//    `_velX`), so the swarm's current carrying a crouched GLOBBO does not
//    smear or turn it;
//  - the transform is 1.x's own. 1.x put all of it on one mesh — the scale,
//    then the nose-up tilt and the yaw — while the view's squash group scales
//    in the frame above the body, which would shear a tilted, squashed dome
//    (the leap is both). So the body is a group that undoes the squash group
//    exactly, and the mesh inside it carries 1.x's R·S, squash included.
export default {
  build(ctx) {
    const mat = ctx.gelMaterial(ctx.S.color, 'blob', 1);
    const mesh = new ctx.THREE.Mesh(ctx.geo.blob, mat);
    const body = new ctx.THREE.Group();
    body.add(mesh);
    return { body, mesh, mat, own: true, blobT: ctx.T.blob, shp: ctx.T.blob.shape, yaw: ctx.S.look.yaw0 };
  },

  update(v, g, w, time, grow) {
    const B = v.blobT, L = v.S.look, shp = v.shp;
    // undo the squash group (1/√sq, sq, 1/√sq): the mesh below is 1.x's whole transform
    const rq = Math.sqrt(g.sq);
    v.body.scale.set(rq, 1 / g.sq, rq);

    const r = g.r * grow;                                       // 1.x r × _radiusMult
    const sx = 1 / Math.sqrt(Math.max(g.sq, L.sqFloor));
    const breathe = B.breatheAmp * Math.sin(g.s.clock * B.breatheHz + g.s.phase);
    const sy = g.sq * (1 + breathe), sxz = sx * (1 - breathe * L.breatheXZ);
    const vx = g.s.velX || 0, vz = g.s.velZ || 0, sp = Math.hypot(vx, vz);
    const drag = Math.min(sp * B.dragStretchPerSpeed, B.dragMax);
    if (sp > L.yawMinSpeed) v.yaw = Math.atan2(vx, vz);
    v.mesh.rotation.set(-drag * B.rearDragTilt, v.yaw, 0);
    v.mesh.scale.set(
      r * shp.x * sxz,
      r * shp.y * (sy - drag * L.dragSink),
      r * shp.z * (sxz + drag));
  },

  // a pooled view comes back facing 1.x's starting heading
  reset(v) { v.yaw = v.S.look.yaw0; },
};
