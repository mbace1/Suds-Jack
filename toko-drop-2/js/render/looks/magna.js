// magna.js — how MAGNA looks: 1.x's plain satin gel dome (uWobble 1, no
// contrast rim at its luminance, L 0.445, no eyes — "blobs read by
// silhouette + motion tell", v98) in the default squat silhouette, amber
// 0xff9944, shaped every frame the way 1.x's blob scale block shaped it
// (enemy.js:2731-2769): the squash spring, the breath, the smear it drags
// along the floor (nose lifting, rear dragging), turned to its heading. It
// has no body tell; the tether carries it (species-a.md §7.4).
//
// THE TETHER (v144, enemy.js:1171-1184, 1895-1904, 3011): a faint amber
// thread from the MAGNA to you whenever its pull has hold —
// BoxGeometry(0.09, 0.02, 1), MeshBasic 0xffaa55, additive, no depth write —
// laid at the midpoint of the two at y 0.45, turned along the line and
// stretched to its length. Its opacity is the sim's g.s.tether: 0.30–0.45,
// shimmering at a 0.52 s period while it holds, easing to nothing when it
// lets go (a dash). Both ends sit inside the bodies, which hide them. It
// hangs off the view's root (offset back to its world spot) so it goes with
// the view when the view is pooled, and it hides the moment the MAGNA is
// killed (1.x destroy() hid it at the killing hit), while the dome plays out
// its last 0.28 s.
//
// It is `own` for 1.x's details the default dome shaping does not carry: the
// size is the BODY's radius (r × the elite's 1.2, 1.x `r·rm`); the breath
// runs on the body's own clock and phase (g.s.clock, g.s.phase, 1.x
// `_wobbleT`, `_phase`); the smear and heading follow its OWN movement
// (g.s.velX/velZ, 1.x `_velX`), so a MAGNA standing its ground while the
// swarm's current carries it neither smears nor turns. 1.x put the whole
// transform on one mesh — scale, then the yaw and the nose-up tilt — while
// the view's squash group scales in the world frame above it; so the body is
// a group that undoes the squash group exactly and the mesh inside it
// carries 1.x's own rotation and scale, squash included.
let GEO = null;                      // the tether's box, shared by every view

export default {
  build(ctx) {
    const { THREE } = ctx, S = ctx.S, Lt = S.look.tether;
    const mat = ctx.gelMaterial(S.color, 'blob', 1);
    const mesh = new THREE.Mesh(ctx.geo.blob, mat);
    const body = new THREE.Group();
    body.add(mesh);

    GEO ||= new THREE.BoxGeometry(Lt.width, Lt.thick, 1);
    const tmat = new THREE.MeshBasicNodeMaterial({
      color: Lt.color, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const tether = new THREE.Mesh(GEO, tmat);
    tether.visible = false;
    const fx = new THREE.Group();
    fx.add(tether);
    return { body, mesh, mat, own: true, blobT: ctx.T.blob, shp: ctx.T.blob.shape, yaw: S.look.yaw0, fx, tether, tmat, Object3D: THREE.Object3D };
  },

  update(v, g, w, time, grow) {
    const B = v.blobT, L = v.S.look, shp = v.shp, s = g.s;
    if (v.fx.parent !== v.root) attachFx(v);

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
    v.mesh.rotation.set(-drag * B.rearDragTilt, v.yaw, 0);
    v.mesh.scale.set(
      r * shp.x * sxz,
      r * shp.y * (sy - drag * L.dragSink),
      r * shp.z * (sxz + drag));

    drawTether(v, g, w);
  },

  // a pooled view comes back facing 1.x's starting heading, with no tether
  reset(v) { v.yaw = v.S.look.yaw0; v.tether.visible = false; v.tmat.opacity = 0; },
};

// 1.x enemy.js:1895-1903: midpoint, y 0.45, turned along the line, stretched
// to its length, at the sim's eased opacity. Between the drawn MAGNA and the
// drawn hero: the hero is drawn as far through the step as the body is (the
// view interpolates both by the same amount), read off the body's own
// interpolation; a body that did not move this step gives no reading, and
// the hero's end of the step is taken (that end is inside the hero's body).
function drawTether(v, g, w) {
  const Lt = v.S.look.tether, op = g.s.tether ?? 0, t = v.tether;
  if (!w || !w.hero.alive || !(op >= Lt.unseen)) { t.visible = false; v.tmat.opacity = 0; return; }
  const h = w.hero, p = v.root.position;
  const ddx = g.x - g.px, ddz = g.z - g.pz, dd = ddx * ddx + ddz * ddz;
  const a = dd > 1e-12 ? Math.min(1, Math.max(0, ((p.x - g.px) * ddx + (p.z - g.pz) * ddz) / dd)) : 1;
  const dx = h.px + (h.x - h.px) * a - p.x, dz = h.pz + (h.z - h.pz) * a - p.z;
  t.visible = true;
  t.position.set(dx / 2, Lt.y, dz / 2);                     // the midpoint, offset from the body the root stands on
  t.rotation.y = Math.atan2(dx, dz);
  t.scale.z = Math.max(Lt.minLen, Math.hypot(dx, dz));
  v.tmat.opacity = op;
}

// Hang the tether off the view's root, once per view. A dying view plays its
// last 0.28 s under its root; the tether hides through it (1.x hid it at the
// kill, enemy.js:3011).
function attachFx(v) {
  v.root.add(v.fx);
  const base = v.Object3D.prototype.updateMatrixWorld;
  v.fx.updateMatrixWorld = function (force) {
    this.visible = !(v.dyingT > 0);
    base.call(this, force);
  };
}
