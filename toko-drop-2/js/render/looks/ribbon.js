// ribbon.js — how RIBBON looks: 1.x's strip (enemy.js:1386-1439), a flat
// ribbon of cyan satin gel swept along the positions the head has occupied
// (the sim's g.s.trail), not a dome. There is no head mesh: the strip IS the
// body, and it starts from nothing at the newest point.
//
//   the spline  the trail's `samples` points, relative to the head, through a
//               Catmull-Rom (tension 0.5) read at (samples − 1) × 3 + 1 even
//               parameter steps — on samples spaced by distance that is
//               already even along the length (1.x v252, enemy.js:1406-1409)
//   the width   at t (0 head, 1 tail): width · sin(min(1, 6t)·π/2) · (1 − t²),
//               across the spline's own tangent, so turns come out round and
//               it tapers to nothing at both ends (enemy.js:1426-1436)
//   the arch    it floats 0.30 above the floor, rising 0.10 in the middle to
//               catch light (enemy.js:1432)
//   the gel     1.x's satin, blob family, wobble 1.0 at radius 0.4, both
//               sides drawn (it has no thickness) and an up normal for every
//               vertex (enemy.js:814, 982, 1411-1413)
//
// ONE DEVIATION, in the triangle order, and it is a 1.x regression undone.
// 1.x wound each quad (a, a+1, a+2)(a+1, a+3, a+2) (enemy.js:1400), which
// faces DOWN: from above the camera sees the strip's back face. v251 called
// computeVertexNormals(), which for that winding points down too, so the
// double-sided flip on a back face turned it up and the strip lit cyan — the
// design sketch's ribbon (design/sketch-ribbon.gif). v252 swapped in a fixed
// up normal to save the per-frame compute (enemy.js:1411-1413); against the
// same winding the flip now turns it DOWN, and v268's ribbon shades as a
// surface lit from below: near-black on the floor (2.0's first look check
// drew exactly that). Here each quad is wound (a, a+2, a+1)(a+1, a+2, a+3) —
// the same two triangles, facing up — so v252's cheap up normal is the
// front face's own, and the strip is v251's cyan again.
//
// What 1.x did NOT do to it, kept that way: no squash spring (enemy.js:2727),
// no hit ripple and no death tear (both BLOB_TYPES only, enemy.js:1612, 2704,
// 2988). The core drives every gel's `mat.gel`, so the look hands it stand-in
// uniforms and keeps the real ones at rest (as yela.js does).
//
// Its death is 1.x's (updateDeath, enemy.js:2976-2984): the hit flash and the
// death glow are the core's (its colour, 40% to white), the swell is the
// core's (the root grows 1 + 1.3t about the head, as 1.x's group did), and
// the strip FADES as (1 − t)² × 0.82 while it swells — no look hook runs
// for a dying view, so the strip reads the view's dying timer as it is drawn.
// The material is transparent from the start (at opacity 1 it draws exactly
// as an opaque one) so that the first death compiles nothing mid-fight.
//
// An elite (g.r ×1.2) is drawn 1.2× as WIDE along its true path. 1.x scaled
// the whole strip ×1.2 about the head (main.js:9406), which drew it longer
// than the trail it is hit along; the path here is the one it hits on.
let IDX = null;            // one index list for every view (the strip's triangle order)

export default {
  build(ctx) {
    const { THREE, S, T } = ctx, K = S.look, n = S.trail.samples, N = (n - 1) * K.subdiv + 1;
    const geo = new THREE.BufferGeometry();
    const verts = new Float32Array(N * 6);
    const pos = new THREE.BufferAttribute(verts, 3);
    pos.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', pos);
    // the strip is near-flat: an up normal once (1.x v252, enemy.js:1411-1413)
    const nrm = new Float32Array(N * 6);
    for (let i = 1; i < N * 6; i += 3) nrm[i] = 1;
    geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
    if (!IDX) {
      IDX = [];
      // 1.x's two triangles a rung (enemy.js:1400), wound to face up (above)
      for (let i = 0; i < N - 1; i++) { const a = i * 2; IDX.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    geo.setIndex(IDX);

    const mat = ctx.gelMaterial(S.color, K.family, S.radius);
    mat.side = THREE.DoubleSide;            // the strip has no thickness (1.x enemy.js:982)
    mat.transparent = true;                 // opacity 1 alive; the death fade needs it, and it is set once, here
    const gel = mat.gel;
    mat.gel = { ...gel, hit: { value: 0 }, hitDir: { value: new THREE.Vector2() }, tear: { value: 0 } };

    const body = new THREE.Mesh(geo, mat);
    body.frustumCulled = false;             // it never leaves the arena; 1.x recomputed its bounds every frame
    // the kill: no look hook runs then, so the strip reads the dying timer
    // the core started (1.x enemy.js:2983-2984)
    body.onBeforeRender = () => {
      const v = body.userData.view;
      if (!v || !(v.dyingT > 0)) return;
      const t = Math.min(1, Math.max(0, 1 - v.dyingT / T.blob.death));
      mat.opacity = (1 - t) * (1 - t) * K.deathOpacity;
    };
    const pts = Array.from({ length: n }, () => new THREE.Vector3());
    // ONE curve, reused (1.x v252, enemy.js:1406-1410)
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', K.tension);
    const spline = Array.from({ length: N }, () => new THREE.Vector3());
    return { body, mat, own: true, gel, pts, curve, spline, verts, pos, N };
  },

  // 1.x _updateRibbon's drawing half (enemy.js:1419-1438), from the trail the
  // sim keeps and the head where the view stands this frame
  update(v, g, w, time, grow) {
    const S = v.S, K = S.look, tr = g.s.trail;
    v.body.userData.view = v;
    v.squash.scale.set(1, 1, 1);            // no squash spring reaches it (1.x enemy.js:2727)
    if (!tr) return;
    const rx = v.root.position.x, rz = v.root.position.z, p3 = v.pts;
    for (let i = 0; i < p3.length; i++) p3[i].set(tr[i].x - rx, 0, tr[i].z - rz);
    v.curve.needsUpdate = true;
    const N = v.N, pts = v.spline, vt = v.verts;
    for (let i = 0; i < N; i++) v.curve.getPoint(i / (N - 1), pts[i]);
    // an elite's ×1.2 (g.r / radius) widens it; a body still appearing grows in
    const full = S.trail.width * (g.r / S.radius) * grow;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);                // 0 head, 1 tail
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N - 1, i + 1)];
      let tx = b.x - a.x, tz = b.z - a.z;
      const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
      const half = full * Math.sin(Math.min(1, t * K.noseTaper) * Math.PI / 2) * (1 - t * t);
      const y = K.y + Math.sin(t * Math.PI) * K.arch;
      const p = pts[i], o = i * 6;
      vt[o] = p.x - tz * half; vt[o + 1] = y; vt[o + 2] = p.z + tx * half;
      vt[o + 3] = p.x + tz * half; vt[o + 4] = y; vt[o + 5] = p.z - tx * half;
    }
    v.pos.needsUpdate = true;
  },

  reset(v) { v.mat.opacity = 1; v.body.userData.view = v; },
};
