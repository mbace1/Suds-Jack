// worma.js — how WORMA looks: a pink worm standing out of the sewer floor,
// its head and two segments behind it arching back down into the stone.
// Under the floor it is only a low bulge sliding along (g.s.up 0); coming up
// it swells and glows (the sim's tell), then the body rises (g.s.up → 1).
export default {
  build(ctx) {
    const { THREE, S } = ctx;
    const mat = ctx.gelMaterial(S.color, 'blob', 1);
    const body = new THREE.Group(), segs = [];
    for (let i = 0; i < S.look.segments; i++) { const m = new THREE.Mesh(ctx.geo.blob, mat); body.add(m); segs.push(m); }
    return { body, mat, segs, own: true, yaw: 0 };
  },

  update(v, g, w, time, grow) {
    const s = g.s, L = v.S.look, up = s.up || 0, r = g.r * grow;
    // undo the squash group: the segments carry their own shape
    const rq = Math.sqrt(g.sq); v.body.scale.set(rq, 1 / g.sq, rq);
    const fx = g.faceX || 0, fz = g.faceZ || 1;
    if (Math.hypot(fx, fz) > 1e-3) v.yaw = Math.atan2(fx, fz);
    v.body.rotation.y = v.yaw;
    const bulge = 1 + g.tell * 0.35;
    v.segs.forEach((m, i) => {
      const k = 1 - i * 0.18;                           // each segment a little smaller
      if (up < 0.05) {
        // under: the bulge it pushes up through the floor, the head only
        m.visible = i === 0;
        m.position.set(0, 0, 0);
        m.scale.set(r * 1.35 * bulge, r * (L.wake + 0.25 * g.tell), r * 1.35 * bulge);
        return;
      }
      m.visible = true;
      // the arch: the head up and forward, each segment back and lower, the
      // last half in the floor
      const back = -i * L.gap * r * 2, h = (1 - i / L.segments) * up;
      m.position.set(0, (h * 1.4 - 0.25 * i) * r * g.sq, back * (1 + L.lean * up));
      m.scale.set(r * k, r * k * (0.75 + 0.5 * h) * g.sq, r * k);
    });
  },

  reset(v) { v.yaw = 0; },
};
