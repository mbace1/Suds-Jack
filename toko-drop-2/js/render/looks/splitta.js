// splitta.js — how SPLITTA looks: 1.x's plain satin gel dome (uWobble 1, no
// contrast rim at its luminance, L 0.77, no eyes, no child bulges since v99)
// in the default squat silhouette, lime 0x88ff22 — the biggest of the plain
// domes, 2.31 wide and 1.53 tall — shaped every frame the way 1.x's blob
// scale block shaped it (enemy.js:2732-2769): the squash spring, a breath
// deeper than the other blobs' (0.18 against 0.13), the smear it drags along
// the floor (nose lifting, rear dragging), turned to its heading.
//
// Its tell is the low-HP strobe (enemy.js:2663-2665): while the sim says it
// is armed (g.tell, hp ≤ 2) it flashes 0x224400 / black, a square wave at
// 18 rad/s off the frame clock (1.x read performance.now()). 1.x's emissive
// order holds: the hit flash outranks it, and so does the VOLATILE fuse,
// which is the core's to draw (this leaves a volatile body's glow alone).
//
// The body is the dome mesh itself, NOT `own`: after the core's default
// dome shaping this update writes 1.x's own transform over it — the size is
// the BODY's radius (r × the elite's 1.2, 1.x `r·rm`), the smear and heading
// follow its OWN walk (g.s.velX/velZ, 1.x `_velX`: a dodge or the current
// carrying it does not smear it), no inflate with the tell (that is
// SPITTOR's), and the squash the view's squash group already carries is
// divided back out of 1.x's scale, which has it inside. Staying off `own` is
// what keeps 1.x's death: destroy() reset the squash and popped a UNIFORM
// dome of r·rm × (1 + 1.3t) (enemy.js:2968-2984, 3013-3029), which is the
// core's default death for a plain body; an `own` body is only root-scaled,
// so it would pop in its last squat, squashed live shape instead.
export default {
  build(ctx) {
    const mat = ctx.gelMaterial(ctx.S.color, 'blob', 1);
    const body = new ctx.THREE.Mesh(ctx.geo.blob, mat);
    return { body, mat, blobT: ctx.T.blob, shp: ctx.T.blob.shape, heading: ctx.S.look.yaw0 };
  },

  update(v, g, w, time, grow) {
    const B = v.blobT, L = v.S.look, shp = v.shp;
    const r = g.r * grow;                                   // 1.x r × _radiusMult
    const sx = 1 / Math.sqrt(Math.max(g.sq, L.sqFloor));
    const breathe = B.breatheAmpSplitta * Math.sin(time * B.breatheHz + v.phase);
    const sy = g.sq * (1 + breathe), sxz = sx * (1 - breathe * L.breatheXZ);
    const vx = g.s.velX || 0, vz = g.s.velZ || 0, sp = Math.hypot(vx, vz);
    const drag = Math.min(sp * B.dragStretchPerSpeed, B.dragMax);
    if (sp > L.yawMinSpeed) v.heading = Math.atan2(vx, vz);
    v.yaw = v.heading;                                      // the hit ripple turns into the body's frame by it
    v.body.rotation.set(-drag * B.rearDragTilt, v.heading, 0);
    // 1.x's scale, with the squash group's (1/√sq, sq, 1/√sq) taken back out
    const qxz = Math.sqrt(g.sq), qy = 1 / g.sq;
    v.body.scale.set(
      qxz * r * shp.x * sxz,
      qy * r * shp.y * (sy - drag * L.dragSink),
      qxz * r * shp.z * (sxz + drag));

    // the low-HP strobe: under the hit flash and the volatile fuse (1.x enemy.js:2650-2665)
    if (g.tell > 0 && g.flash <= 0 && g.affix !== 'volatile' && v.mat?.emissive) {
      v.mat.emissive.setHex(Math.sin(time * L.strobeRate) > 0 ? L.strobeOn : L.strobeOff);
    }
  },

  // a pooled view comes back facing 1.x's starting heading
  reset(v) { v.heading = v.yaw = v.S.look.yaw0; },
};
