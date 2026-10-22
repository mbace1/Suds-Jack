// slug.js — how SLUG looks: 1.x's chain (enemy.js:1290-1334), a line of squat
// green satin gel spheres, fat at the head and tapering to the tail, with ONE
// white eye on the head — the mark that says which end you must attack from.
//
//   the chain   one sphere a segment (SphereGeometry(r, 12, 9) squashed to
//               0.82 tall, sitting on the floor), r from the sim's chain, at
//               the sim's positions. Shot shorter, the radii re-taper to the
//               new length (the sim says which), so each length has its own
//               geometries — built once, shared by every view
//   the gel     1.x's satin, blob family, lumps at uRadius 0.46 on every
//               segment, ONE material for the whole animal so the hit flash
//               and the death glow take all of it at once (enemy.js:814-818,
//               1307-1308)
//   the head    1.x's squash spring (the sim's, 0.18 / 0.90) squashes the
//               head only, (sx, sq, sx) about its own centre, × an elite's
//               1.2; the rest of the chain never squashes (enemy.js:2779)
//   the eye     unlit white, headR × 0.3, head r × 0.7 out along the HEADING
//               and × 1.05 up; it is the group's, not the head's, so it does
//               not squash or grow with an elite's head (enemy.js:1315-1318,
//               1333) — an elite's bigger head all but swallows it, as 1.x's did
//
// What 1.x did NOT do to it, kept that way: no hit ripple and no death tear
// (both BLOB_TYPES only, enemy.js:1612, 2704, 2988). The core drives every
// gel's `mat.gel`, so the look keeps the real uniforms to itself (as toro.js
// does): the lumps simmer, a bullet ripples nothing.
//
// Its death is 1.x's (updateDeath, enemy.js:2976-2984): the hit flash and the
// death glow are the core's (its colour, 40% to white), the swell is the
// core's (the root grows 1 + 1.3t about the head, as 1.x's group did), the
// chain FADES as (1 − t)² × 0.82 while it swells and the eye is gone at once
// (enemy.js:3012) — no look hook runs for a dying view, so the body reads the
// view's dying timer as the scene updates. The material is transparent from
// the start (at opacity 1 it draws as it would opaque; a transmissive gel is
// in the transparent list anyway) so the first death compiles nothing.
const GEO = new Map();     // radius → the segment geometry, shared by every view
let EYE = null;

function segGeo(THREE, S, r) {
  const key = r.toFixed(6);
  let g = GEO.get(key);
  if (!g) {
    const [ws, hs] = S.look.sphere;
    g = new THREE.SphereGeometry(r, ws, hs);
    g.scale(1, S.look.squat, 1);                                 // squat (1.x enemy.js:1305)
    GEO.set(key, g);
  }
  return g;
}

// the radius of segment i of a chain of n (1.x enemy.js:1302-1303), as the sim lays it
export const segRadius = (C, n, i) => C.headR + (C.tailR - C.headR) * (n > 1 ? i / (n - 1) : 0);

export default {
  build(ctx) {
    const { THREE, S, T } = ctx, K = S.look, C = S.chain;
    const mat = ctx.gelMaterial(S.color, K.family, S.radius);
    mat.transparent = true;                                      // the death fade; set once, here
    const gel = mat.gel;
    mat.gel = undefined;                                         // no ripple, no thrash (1.x: blob bodies only)

    const body = new THREE.Group(), segs = [];
    for (let i = 0; i < C.segments; i++) {
      const m = new THREE.Mesh(segGeo(THREE, S, segRadius(C, C.segments, i)), mat);
      body.add(m);
      segs.push(m);
    }
    EYE ??= new THREE.SphereGeometry(C.headR * K.eye.r, K.eye.sphere[0], K.eye.sphere[1]);
    const eye = new THREE.Mesh(EYE, new THREE.MeshBasicNodeMaterial({ color: K.eye.color }));
    body.add(eye);

    // the death: no look hook runs then, so the body reads the dying timer
    // the core started as the scene updates (1.x enemy.js:2983-2984, 3012)
    const base = THREE.Object3D.prototype.updateMatrixWorld;
    body.updateMatrixWorld = function (force) {
      const v = this.userData.view;
      if (v && v.dyingT > 0) {
        const t = Math.min(1, Math.max(0, 1 - v.dyingT / T.blob.death));
        mat.opacity = (1 - t) * (1 - t) * K.deathOpacity;
        eye.visible = false;
      }
      base.call(this, force);
    };
    return { body, mat, gel, own: true, segs, eye, n: C.segments, THREE };
  },

  // 1.x _placeChain's drawing half (enemy.js:1322-1333), from the chain the
  // sim keeps and the head where the view stands this frame
  update(v, g, w, time, grow) {
    const S = v.S, K = S.look, C = S.chain, s = g.s, ch = s.chain;
    v.body.userData.view = v;
    v.mat.opacity = 1;
    v.eye.visible = true;
    // the view's squash group is not 1.x's: the spring squashes the head only
    v.squash.scale.set(1, 1, 1);
    v.body.scale.setScalar(grow);                                // a body still swelling into being grows about its head
    if (!ch) return;
    const n = ch.length;
    if (v.n !== n) {
      v.n = n;
      for (let i = 0; i < v.segs.length; i++) {
        v.segs[i].visible = i < n;
        if (i < n) v.segs[i].geometry = segGeo(v.THREE, S, segRadius(C, n, i));
      }
    }
    // every segment where the sim has it, moved with the head as the view
    // interpolates it; each sits on the floor at r × 0.82
    for (let i = 1; i < n; i++) v.segs[i].position.set(ch[i].x - g.x, ch[i].r * K.squat, ch[i].z - g.z);
    // the head: (sx, sq, sx) × rm about its own centre (1.x enemy.js:1312, 2732, 2779)
    const head = v.segs[0], rm = g.r / S.radius, sx = 1 / Math.sqrt(Math.max(g.sq, K.sqFloor));
    head.position.set(0, C.headR * K.squat, 0);
    head.scale.set(sx * rm, g.sq * rm, sx * rm);
    // the eye, on the heading (1.x enemy.js:1333)
    const hr = ch[0].r, hd = s.heading;
    v.eye.position.set(Math.cos(hd) * hr * K.eye.forward, hr * K.eye.up, Math.sin(hd) * hr * K.eye.forward);
  },

  // a pooled view comes back whole and opaque
  reset(v) { v.mat.opacity = 1; v.eye.visible = true; v.body.userData.view = v; },
};
