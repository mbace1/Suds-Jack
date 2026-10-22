// omega.js — how OMEGA looks: 1.x's faceted crystal (enemy.js:741-745, 816,
// 993-1001, 2417-2420, 2650-2672, 2726-2760, 2968-3029) under the boss aura
// main.js hung beneath every boss (main.js:1967-1982, 10569-10584), not a gel
// dome.
//
//   the crystal  IcosahedronGeometry(0.95, 0) — twenty flat faces — in the
//                satin gel of 1.x's `omega` family (roughness 0.04,
//                transmission 0.40, uWobble 0.35, uRadius 0.95): the boss
//                keeps a hard crystal read. Its centre stands at the CFG
//                radius, boss or not (a boss is the same crystal × 1.5, so it
//                sits 0.475 into the floor as 1.x's did), turning 0.6 rad/s
//                about y and 0.25 about x by the sim's own angles. The squash
//                spring scales the mesh itself, as 1.x's did — so it squashes
//                in the crystal's own spinning frame (three's T·R·S) — and the
//                view's floor-anchored squash group is undone first.
//   the strobes  the last 0.25 s before a volley, cyan / amber / red by act
//                over black at 30 rad/s; a phase change, 0.5 s of gold /
//                orange at 60 rad/s, which outranks it. The hit flash (the
//                core's white) and a VOLATILE fuse outrank both (1.x's chain).
//   the aura     a boss only: a flat additive ring on the floor at y 0.04,
//                1.7 × its radius out and 0.82 of that in, gold breathing
//                0.45 ± 0.3 at 5 rad/s; red and swelling 1.15 ± 0.1 at
//                20 rad/s while enraged. It goes when the boss dies.
//   the death    the core swells a killed view's root 1 → 2.3 about the floor
//                over 0.28 s and resets the squash group; 1.x reset the
//                squash and swelled the crystal about its CENTRE, with the
//                spin stopped. The view keeps the centre at the CFG radius
//                through it (and the boss's 1.5 — 1.x's non-blob death pop
//                dropped it, a bug its blobs had been fixed for).
// 1.x gave the crystal no hit ripple and no death thrash (uHit and uTear
// were written for blob bodies only), so the material's gel handle is kept
// here instead of on `mat`, where the core would drive both; the hit flash
// and the death glow are the emissive, which the core still writes.
//
// The aura hangs off the view's root (so it goes with the view when it is
// pooled). The core stops calling update() once a body is dead, so the
// root's own matrix update does the dying work: it hides the aura (1.x
// removed the ring the frame the boss died) and holds the crystal's centre.
let GEO = null;
function geometries(THREE, S) {
  if (GEO) return GEO;
  const L = S.look, A = L.aura;
  GEO = {
    crystal: new THREE.IcosahedronGeometry(S.radius, L.detail),
    aura: new THREE.RingGeometry(A.inner, 1, A.segments),   // unit outer radius; scaled to 1.7 × the boss's radius
  };
  return GEO;
}

export default {
  build(ctx) {
    const { THREE, S } = ctx, L = S.look, A = L.aura, G = geometries(THREE, S);
    const mat = ctx.gelMaterial(S.color, 'omega', S.radius, { wobble: L.wobble });
    mat.roughness = L.roughness; mat.transmission = L.transmission;
    const gel = mat.gel;
    mat.gel = undefined;                               // no ripple, no thrash (1.x: blob bodies only)

    // body (undoes the squash group) → mesh (1.x's mesh: centre, spin, squash)
    const body = new THREE.Group();
    const mesh = new THREE.Mesh(G.crystal, mat);
    body.add(mesh);

    // the aura, flat on the floor under the boss
    const fx = new THREE.Group();
    const auraMat = new THREE.MeshBasicNodeMaterial({
      color: A.color, transparent: true, opacity: A.opacity0,
      side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const aura = new THREE.Mesh(G.aura, auraMat);
    aura.rotation.x = -Math.PI / 2;
    aura.position.y = A.y;
    aura.visible = false;
    fx.add(aura);

    return { body, mat, gel, own: true, mesh, fx, aura, auraMat, rm: 1, Object3D: THREE.Object3D };
  },

  update(v, g, w, time, grow) {
    const S = v.S, L = S.look, A = L.aura, s = g.s;
    if (v.fx.parent !== v.root) attach(v);

    // undo the view's squash group (1/√sq, sq, 1/√sq about the floor): 1.x
    // squashed the crystal about its centre, below
    const rq = Math.sqrt(g.sq);
    v.body.scale.set(rq, 1 / g.sq, rq);

    // 1.x's mesh: centre at the CFG radius, rotation (x, y, 0), scaled
    // (sx × rm, sq × rm, sx × rm) in its own frame (enemy.js:1001, 2419-2420,
    // 2733-2736, 2760); rm carries an elite's 1.2 or a boss's 1.5
    // (main.js:9389, 9406). A body still swelling into being grows from the
    // floor.
    const sx = 1 / Math.sqrt(Math.max(g.sq, L.sqFloor));
    v.rm = g.r / S.radius;
    const rm = v.rm * grow;
    v.mesh.position.set(0, S.radius * grow, 0);
    v.mesh.rotation.set(s.rotX, s.rotY, 0);
    v.mesh.scale.set(sx * rm, g.sq * rm, sx * rm);

    // the strobes: the hit flash and a VOLATILE fuse (the core's) outrank the
    // phase pop, which outranks the fire tell (enemy.js:2650-2672). The sim
    // says whether this step wore the pop (its clock > 0 before the step's
    // countdown, as 1.x tested it), so the pop lasts 1.x's 30 frames, not 29
    if (g.flash <= 0 && g.affix !== 'volatile') {
      if (s.popOn) v.mat.emissive.setHex(Math.sin(time * L.phaseFlash.rate) > 0 ? L.phaseFlash.a : L.phaseFlash.b);
      else if (g.tell > 0) v.mat.emissive.setHex(Math.sin(time * L.tell.rate) > 0 ? tellColor(L, s.phase) : L.tell.off);
    }

    // the boss aura (main.js:10578-10583)
    v.aura.visible = !!g.isBoss;
    if (g.isBoss) {
      v.auraMat.opacity = A.opacity.base + A.opacity.amp * Math.sin(time * A.opacity.rate);
      v.auraMat.color.setHex(s.enraged ? A.enraged : A.color);
      const k = s.enraged ? A.enragedScale.base + A.enragedScale.amp * Math.sin(time * A.enragedScale.rate) : 1;
      v.aura.scale.setScalar(g.r * A.outer * k);
    }
  },

  // a pooled view comes back with no aura and an unturned crystal
  reset(v) {
    v.aura.visible = false; v.auraMat.opacity = v.S.look.aura.opacity0;
    v.mesh.rotation.set(0, 0, 0); v.body.scale.set(1, 1, 1);
  },
};

const tellColor = (L, phase) => (phase === 3 ? L.tell.p3 : phase === 2 ? L.tell.p2 : L.tell.p1);

// Hang the aura off the view's root, once per view, and let the root's own
// matrix update play the death: while a killed view swells its root by k
// about the floor (and has reset the squash group), the aura is hidden and
// the crystal is a uniform rm, its centre held at the CFG radius (S.radius / k
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
