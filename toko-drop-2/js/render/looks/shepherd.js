// shepherd.js — how SHEPHERD looks: 1.x's v203 conductor (enemy.js:783-787,
// 811-817, 1000, 1134-1147, 1785-1789, 2726-2737, 2779, 2968-3029), not a
// gel dome.
//
//   the spire  ConeGeometry(0.45, 1.56, 6) — a slim hexagonal cone, "a
//              CONDUCTOR, not a body to bump into" — in the satin gel of
//              1.x's `omega` family (roughness 0.04, transmission 0.40,
//              uWobble 0.35, uRadius 0.6). Its centre stands at the CFG
//              radius, elite or not (an elite is the same cone × 1.2, so it
//              sits a little deeper into the floor, as 1.x's did), turning
//              about y by the sim's angle (2.2 rad/s, the conductor's
//              baton). The squash spring scales the mesh itself, about its
//              centre — 1.x's non-blob mesh.scale (sx·rm, sq·rm, sx·rm) — so
//              the view's floor-anchored squash group is undone first.
//   the ring   the herd ring IS the tell: a flat additive ring on the floor
//              at y 0.05, its outer edge the herd's own 7.5 and 0.14 wide,
//              following the body, its opacity breathing 0.16 + 0.10·sin(4t
//              + phase) on the body's own clock. It does not grow with an
//              elite (the herd does not), it is dark while the body is still
//              appearing (2.0's 0.3 s swell-in runs no step, and the herd is
//              not on yet either), and it goes out the instant the SHEPHERD
//              dies — the herd is released with it (enemy.js:3009).
//   the glow   the core's: the hit flash (white) and a VOLATILE fuse; 1.x's
//              emissive chain gave a SHEPHERD nothing else (enemy.js:2649-2690).
//   the death  the core swells a killed view's root 1 → 2.3 about the floor
//              over 0.28 s and resets the squash group; 1.x reset the squash
//              and swelled the cone about its CENTRE, its spin stopped. The
//              view keeps the centre at the CFG radius through it, and an
//              elite's 1.2 (1.x's non-blob death pop dropped it to 1 —
//              `_deathBaseScale` is 1 for a non-blob, enemy.js:1482-1484 —
//              a bug its blobs had been fixed for).
// 1.x gave the spire no hit ripple and no death thrash (uHit and uTear were
// written for blob bodies only), so the material's gel handle is kept here
// instead of on `mat`, where the core would drive both; the hit flash and the
// death glow are the emissive, which the core still writes.
//
// The ring hangs off the view's root (so it goes with the view when it is
// pooled), not off the squash group. The core stops calling update() once a
// body is dead, so the root's own matrix update does the dying work: it hides
// the ring and holds the spire's centre.
//
// Numbers: js/tuning/species/shepherd.js. Contract: docs/SIM_CONTRACT.md.
let GEO = null;
function geometries(THREE, S) {
  if (GEO) return GEO;
  const L = S.look, R = L.ring;
  GEO = {
    spire: new THREE.ConeGeometry(S.radius * L.coneRadius, S.radius * L.coneHeight, L.coneSegments),
    ring: new THREE.RingGeometry(S.herd.radius - R.width, S.herd.radius, R.segments),
  };
  return GEO;
}

export default {
  build(ctx) {
    const { THREE, S } = ctx, L = S.look, R = L.ring, G = geometries(THREE, S);
    const mat = ctx.gelMaterial(S.color, 'omega', S.radius, { wobble: L.wobble });
    mat.roughness = L.roughness; mat.transmission = L.transmission;
    const gel = mat.gel;
    mat.gel = undefined;                               // no ripple, no thrash (1.x: blob bodies only)

    // body (undoes the squash group) → mesh (1.x's mesh: centre, spin, squash)
    const body = new THREE.Group();
    const mesh = new THREE.Mesh(G.spire, mat);
    body.add(mesh);

    // the herd ring, flat on the floor round it
    const fx = new THREE.Group();
    const ringMat = new THREE.MeshBasicNodeMaterial({
      color: R.color, transparent: true, opacity: R.opacity0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(G.ring, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = R.y;
    fx.add(ring);

    return { body, mat, gel, own: true, mesh, fx, ring, ringMat, rm: 1, Object3D: THREE.Object3D };
  },

  update(v, g, w, time, grow) {
    const S = v.S, L = S.look, R = L.ring;
    if (v.fx.parent !== v.root) attach(v);

    // undo the view's squash group (1/√sq, sq, 1/√sq about the floor): 1.x
    // squashed the spire about its centre, below
    const rq = Math.sqrt(g.sq);
    v.body.scale.set(rq, 1 / g.sq, rq);

    // 1.x's mesh: centre at the CFG radius, turned by the baton, scaled
    // (sx × rm, sq × rm, sx × rm) in its own frame (enemy.js:1000, 1785,
    // 2732, 2779); rm carries an elite's 1.2 (main.js:9406). A body still
    // swelling into being grows from the floor.
    const sx = 1 / Math.sqrt(Math.max(g.sq, L.sqFloor));
    v.rm = g.r / S.radius;
    const rm = v.rm * grow;
    v.mesh.position.set(0, S.radius * grow, 0);
    v.mesh.rotation.set(0, g.s.spin || 0, 0);
    v.mesh.scale.set(sx * rm, g.sq * rm, sx * rm);

    // the herd ring (enemy.js:1787-1788): pulsing while the herd is on
    v.ringMat.opacity = g.state === 'active' ? R.base + R.amp * Math.sin(time * R.hz + v.phase) : 0;
  },

  // a pooled view comes back with a dark ring and an unturned spire
  reset(v) {
    v.ringMat.opacity = v.S.look.ring.opacity0;
    v.mesh.rotation.set(0, 0, 0); v.body.scale.set(1, 1, 1);
  },
};

// Hang the ring off the view's root, once per view, and let the root's own
// matrix update play the death: while a killed view swells its root by k
// about the floor (and has reset the squash group), the ring is hidden and
// the spire is a uniform rm, its centre held at the CFG radius (S.radius / k
// in the swelling root), its spin where it stopped.
function attach(v) {
  v.root.add(v.fx);
  const base = v.Object3D.prototype.updateMatrixWorld;
  v.root.updateMatrixWorld = function (force) {
    const dying = v.dyingT > 0;
    v.fx.visible = !dying;
    if (dying) {
      const k = this.scale.y || 1;
      v.body.scale.set(1, 1, 1);
      v.mesh.position.set(0, v.S.radius / k, 0);
      v.mesh.scale.setScalar(v.rm);
    }
    base.call(this, force);
  };
}
