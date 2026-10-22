// prism.js — how PRISM looks: 1.x's twin shard (enemy.js:773-777, 813-817,
// 1000, 2470, 2666-2681, 2726-2732, 2779, 3007-3027; main.js:1967-1982, 9388,
// 10569-10584), not a gel dome.
//
//   the shard   an OctahedronGeometry(0.85, 0) stretched 0.8 × 1.35 × 0.8 —
//               "a sharp octahedron, leaner than OMEGA's faceted core" — in
//               the satin gel of 1.x's `omega` family (roughness 0.04,
//               transmission 0.40, uWobble 0.35, uRadius 0.85). Its centre
//               stands at the CFG radius, boss or not (1.x scaled the mesh
//               × 1.5 and left it there, so a boss's lower tip is under the
//               floor), spinning about y by the sim's angle (0.8 rad/s calm,
//               1.6 raged). The squash spring scales it about that centre,
//               as 1.x scaled its mesh — so the view's floor-anchored squash
//               group is undone first.
//   the glow    0.3 s before each volley, 0x88104f (raged 0xaa2200) / black
//               strobing at 30 rad/s; through the rage pop, 0xffee88 /
//               0xff5500 at 60 rad/s; the hit flash outranks both
//   the aura    a boss's: a flat additive ring on the floor at y 0.04, outer
//               radius 1.7 × the boss's radius, inner 0.82 of that, 0xffcc33
//               breathing 0.45 ± 0.3 at 5 rad/s; raged it turns 0xff2200 and
//               swells 1.15 ± 0.1 at 20 rad/s. It follows the body, never
//               squashes, and goes at the kill (1.x removed it the frame the
//               boss died)
// 1.x gave a PRISM no hit ripple and no death thrash (uHit and uTear were
// written for blob bodies only), so the material's gel handle is kept here
// instead of on `mat`, where the core would drive both; the hit flash and
// the death glow are the emissive, which the core still writes. The death
// pop is 1.x's: see build.
let GEO = null;
function geometry(THREE, S) {
  if (GEO) return GEO;
  const O = S.look.octa;
  GEO = new THREE.OctahedronGeometry(S.radius, O.detail);
  GEO.scale(O.scale[0], O.scale[1], O.scale[2]);
  return GEO;
}

export default {
  build(ctx) {
    const { THREE, S } = ctx, L = S.look, A = L.aura;
    const mat = ctx.gelMaterial(S.color, 'omega', S.radius, { wobble: L.wobble });
    mat.roughness = L.roughness; mat.transmission = L.transmission;
    const gel = mat.gel;
    mat.gel = undefined;                               // no ripple, no thrash (1.x: blob bodies only)

    // body (undoes the squash group) → core (at the CFG radius: the spin, 1.x's squash) → mesh
    const body = new THREE.Group(), core = new THREE.Group();
    const mesh = new THREE.Mesh(geometry(THREE, S), mat);
    core.add(mesh); body.add(core);

    // the boss aura: a unit ring (inner 0.82), scaled to 1.7 × the radius each frame
    const auraMat = new THREE.MeshBasicNodeMaterial({
      color: A.color, transparent: true, opacity: A.opacity0,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const aura = new THREE.Mesh(new THREE.RingGeometry(A.inner, 1, A.segs), auraMat);
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = A.y;
    aura.visible = false;
    body.add(aura);
    // A killed view plays out its last 0.28 s with no update (the core's
    // death), so the body steps in for it as the frame is drawn: the aura
    // goes the frame the boss dies (1.x disposed it, main.js:10569-10575),
    // and the shard pops as 1.x's destroy() and updateDeath() popped it
    // (enemy.js:2968-2984, 3010-3027) — unsquashed (_sq reset to 1), at the
    // CFG size for a boss too (_deathBaseScale is 1 for every non-blob,
    // enemy.js:1482-1484), swelling about its own centre at the CFG radius,
    // not about the floor the core swells the root from. `userData.view` is
    // the live view the core passes to update (build's return is copied into
    // it, so a closure over a local would never see the core's dyingT).
    const base = THREE.Object3D.prototype.updateMatrixWorld;
    body.updateMatrixWorld = function (force) {
      const view = this.userData.view;
      if (view && view.dyingT > 0) {
        const k = view.root.scale.y || 1;                // the core's 1 + 1.3t
        this.scale.set(1, 1, 1);                         // the view's squash group is 1 while dying
        core.position.y = S.radius / k;                  // the centre stays at the CFG radius
        core.scale.setScalar(L.death.base);              // × the core's swell = 1.x's (1 + 1.3t)
        aura.visible = false;
      }
      base.call(this, force);
    };
    return { body, mat, gel, own: true, core, mesh, aura, auraMat, auraOn: false };
  },

  update(v, g, w, time, grow) {
    const S = v.S, L = S.look, s = g.s || {};
    v.body.userData.view = v;

    // undo the view's squash group (1/√sq, sq, 1/√sq about the floor): 1.x
    // squashed the shard about its centre, below
    const rq = Math.sqrt(g.sq);
    v.body.scale.set(rq, 1 / g.sq, rq);

    // 1.x's mesh: at the CFG radius, spun, scaled (sx·rm, sq·rm, sx·rm)
    // (enemy.js:1000, 2470, 2732, 2779); rm carries a boss's 1.5
    // (main.js:9388). A body still swelling into being grows from the floor.
    const sx = 1 / Math.sqrt(Math.max(g.sq, L.sqFloor));
    const rm = (g.r / S.radius) * grow;
    v.core.position.y = S.radius * grow;
    v.core.rotation.y = s.spin || 0;
    v.core.scale.set(sx * rm, g.sq * rm, sx * rm);

    // the glow (enemy.js:2650-2681): the hit flash first, then the rage
    // pop, then the tell, else dark (the core wrote the flash or black)
    if (g.flash <= 0) {
      if (s.phaseFlashT > 0) {
        const P = L.phaseFlash;
        v.mat.emissive.setHex(Math.sin(time * P.rate) > 0 ? P.colors[0] : P.colors[1]);
      } else if (g.tell > 0) {
        const C = L.tell;
        v.mat.emissive.setHex(Math.sin(time * C.rate) > 0 ? (s.raged ? C.raged : C.calm) : 0x000000);
      }
    }

    // the aura, a boss's only (main.js:9391, 10569-10584)
    v.auraOn = !!g.isBoss;
    v.aura.visible = v.auraOn;
    if (v.auraOn) {
      const A = L.aura, r = g.r * A.radius;
      const k = s.raged ? A.ragedScale[0] + A.ragedScale[1] * Math.sin(time * A.ragedRate) : 1;
      v.aura.scale.setScalar(r * k);
      v.auraMat.opacity = A.opacity[0] + A.opacity[1] * Math.sin(time * A.rate);
      v.auraMat.color.setHex(s.raged ? A.raged : A.color);
    }
  },

  // a pooled view comes back with no aura, its shard where update puts it
  reset(v) {
    const A = v.S.look.aura;
    v.auraOn = false; v.aura.visible = false; v.auraMat.opacity = A.opacity0; v.auraMat.color.setHex(A.color);
    v.body.userData.view = v;
  },
};
