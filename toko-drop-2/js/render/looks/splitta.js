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
// It is `own` for 1.x's details the default dome shaping does not carry: the
// size is the BODY's radius (r × the elite's 1.2, 1.x `r·rm`), the smear and
// heading follow its OWN walk (g.s.velX/velZ, 1.x `_velX`: a dodge or the
// current carrying it does not smear it), and the transform is 1.x's own: the
// body is a group that undoes the view's squash group, and the mesh inside
// carries 1.x's R·S with the squash in it.
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

    const r = g.r * grow;                                   // 1.x r × _radiusMult
    const sx = 1 / Math.sqrt(Math.max(g.sq, L.sqFloor));
    const breathe = B.breatheAmpSplitta * Math.sin(time * B.breatheHz + v.phase);
    const sy = g.sq * (1 + breathe), sxz = sx * (1 - breathe * L.breatheXZ);
    const vx = g.s.velX || 0, vz = g.s.velZ || 0, sp = Math.hypot(vx, vz);
    const drag = Math.min(sp * B.dragStretchPerSpeed, B.dragMax);
    if (sp > L.yawMinSpeed) v.yaw = Math.atan2(vx, vz);
    v.mesh.rotation.set(-drag * B.rearDragTilt, v.yaw, 0);
    v.mesh.scale.set(
      r * shp.x * sxz,
      r * shp.y * (sy - drag * L.dragSink),
      r * shp.z * (sxz + drag));

    // the low-HP strobe: under the hit flash and the volatile fuse (1.x enemy.js:2650-2665)
    if (g.tell > 0 && g.flash <= 0 && g.affix !== 'volatile' && v.mat?.emissive) {
      v.mat.emissive.setHex(Math.sin(time * L.strobeRate) > 0 ? L.strobeOn : L.strobeOff);
    }
  },

  // a pooled view comes back facing 1.x's starting heading
  reset(v) { v.yaw = v.S.look.yaw0; },
};
