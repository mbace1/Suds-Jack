// draper.js — how DRAPER looks: 1.x's v171 loom (enemy.js:771-772, 811-817,
// 1000, 1097-1105, 2207, 2212-2213, 2649-2690, 2726-2737, 2779, 2968-3029),
// not a gel dome.
//
//   the loom    BoxGeometry(1.5, 0.9, 0.4) — a slab, its broad face turned
//               square to you every step (the sim's faceX/Z: 1.x's
//               rotation.y = atan2(ddx, ddz), local +z at you) — in the satin
//               gel of 1.x's `omega` family (roughness 0.04, transmission
//               0.40, uWobble 0.35, uRadius 0.8). Its centre stands at the CFG
//               radius, elite or not, so it hangs 0.35 off the floor (an
//               elite is the same slab × 1.2 about that centre). The squash
//               spring scales the mesh itself, about its centre — 1.x's
//               non-blob mesh.scale (sx·rm, sq·rm, sx·rm) — so the view's
//               floor-anchored squash group is undone first.
//   the spools  two upright CylinderGeometry(0.14, 0.14, 1.0, 8) in unlit
//               0xcc88ff at the slab's ends (local ±0.78), children of the
//               loom so they turn, squash and swell with it: "the curtain
//               visibly comes off the loom". Through the wind-up they tumble
//               about their x at 18 rad/s (the sim's s.spool) and hold the
//               angle after — the tell 1.x actually showed.
//   the glow    the core's: the hit flash (white), a VOLATILE fuse, the death
//               glow. 1.x also wrote a wind-up strobe (0x5522aa / 0x110022 on
//               sin(clock × 22)) that its emissive chain overwrote with black
//               the same frame, so it never showed; it is here behind
//               look.strobe.on, off.
//   the death   the core swells a killed view's root 1 → 2.3 about the floor
//               over 0.28 s and resets the squash group; 1.x reset the squash
//               and swelled the slab about its CENTRE from scale 1 (an elite's
//               1.2 too: _deathBaseScale is 1 for a non-blob), its face and
//               spools where they were. The body's own matrix update holds the
//               centre at the CFG radius through it (the core stops calling
//               update() once a body is dead).
// 1.x gave the loom no hit ripple and no death thrash (uHit and uTear were
// written for blob bodies only), so the material's gel handle is kept here
// instead of on `mat`, where the core would drive both.
//
// Numbers: js/tuning/species/draper.js. Contract: docs/SIM_CONTRACT.md.
let GEO = null;
function geometries(THREE, S) {
  if (GEO) return GEO;
  const L = S.look, B = L.loom, P = L.spool;
  GEO = {
    loom: new THREE.BoxGeometry(B.width, B.height, B.depth),
    spool: new THREE.CylinderGeometry(P.radius, P.radius, P.height, P.segments),
  };
  return GEO;
}

export default {
  build(ctx) {
    const { THREE, S } = ctx, L = S.look, P = L.spool, G = geometries(THREE, S);
    const mat = ctx.gelMaterial(S.color, 'omega', S.radius, { wobble: L.wobble });
    mat.roughness = L.roughness; mat.transmission = L.transmission;
    const gel = mat.gel;
    mat.gel = undefined;                               // no ripple, no thrash (1.x: blob bodies only)

    // body (undoes the squash group) → mesh (1.x's mesh: centre, face, squash) → the spools
    const body = new THREE.Group();
    const mesh = new THREE.Mesh(G.loom, mat);
    body.add(mesh);
    const spoolMat = new THREE.MeshBasicNodeMaterial({ color: P.color });
    const spools = [-1, 1].map((side) => {
      const sp = new THREE.Mesh(G.spool, spoolMat);
      sp.position.set(side * P.x, 0, 0);
      mesh.add(sp);
      return sp;
    });

    // A killed view plays out its last 0.28 s with no update, so the body
    // steps in for it as the frame is drawn: unsquashed, at 1.x's death scale,
    // its centre held at the CFG radius inside the root the core swells about
    // the floor. `userData.view` is the live view (build's return is copied
    // into it, so a closure over a local would never see the core's dyingT).
    const base = THREE.Object3D.prototype.updateMatrixWorld;
    body.updateMatrixWorld = function (force) {
      const view = this.userData.view;
      if (view && view.dyingT > 0) {
        const k = view.root.scale.y || 1;              // the core's 1 + 1.3t
        this.scale.set(1, 1, 1);                       // the view's squash group is 1 while dying
        mesh.position.set(0, S.radius / k, 0);
        mesh.scale.setScalar(L.death.base);            // × the core's swell = 1.x's (1 + 1.3t)
      }
      base.call(this, force);
    };
    return { body, mat, gel, own: true, mesh, spools, spoolMat };
  },

  update(v, g, w, time, grow) {
    const S = v.S, L = S.look;
    v.body.userData.view = v;

    // undo the view's squash group (1/√sq, sq, 1/√sq about the floor): 1.x
    // squashed the slab about its centre, below
    const rq = Math.sqrt(g.sq);
    v.body.scale.set(rq, 1 / g.sq, rq);

    // 1.x's mesh: centre at the CFG radius, face to you, scaled (sx × rm,
    // sq × rm, sx × rm) in its own frame (enemy.js:1000, 2207, 2732, 2779); rm
    // carries an elite's 1.2 (main.js:9406). While the view swells it in
    // (TUNING.gel.swell, 2.0's alone) it grows from the floor; the body under
    // it is live from its first step, so its face is the sim's, turned by that
    // step as 1.x's first update turned it the frame it was made.
    const sx = 1 / Math.sqrt(Math.max(g.sq, L.sqFloor));
    const rm = (g.r / S.radius) * grow;
    v.mesh.position.set(0, S.radius * grow, 0);
    v.mesh.rotation.set(0, Math.atan2(g.faceX, g.faceZ), 0);
    v.mesh.scale.set(sx * rm, g.sq * rm, sx * rm);

    // the spools tumble through the wind-up and hold (enemy.js:2213)
    const a = g.s?.spool || 0;
    for (const sp of v.spools) sp.rotation.set(a, 0, 0);

    // the strobe 1.x wrote and never showed (enemy.js:2212 vs 2688-2689); the
    // hit flash and a VOLATILE fuse outrank it, as in 1.x's chain
    const B = L.strobe;
    if (B.on && g.s?.windup > 0 && g.flash <= 0 && g.affix !== 'volatile' && v.mat?.emissive) {
      v.mat.emissive.setHex(Math.sin(time * B.rate + v.phase) > 0 ? B.colors[0] : B.colors[1]);
    }
  },

  // a pooled view comes back unsquashed, unturned, its spools upright
  reset(v) {
    v.body.scale.set(1, 1, 1);
    v.mesh.rotation.set(0, 0, 0);
    for (const sp of v.spools) sp.rotation.set(0, 0, 0);
    v.body.userData.view = v;
  },
};
