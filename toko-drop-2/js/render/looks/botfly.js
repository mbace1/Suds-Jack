// botfly.js — how BOTFLY looks: 1.x's flying bot (enemy.js:745-746, 810-817,
// 1230-1247, 2280-2294, 2650-2685, 2728-2779, 3004-3033), not a gel dome.
//
//   the body    SphereGeometry(0.5, 12, 9) — a low-poly ball — in the satin
//               gel of 1.x's `omega` family (roughness 0.04, transmission
//               0.40, uWobble 0.35, uRadius 0.5), its centre HOVERING at
//               1.5 + 0.22·sin(3·wob + phase). The squash spring scales the
//               sphere about that centre, as 1.x's did, so the view's
//               floor-anchored squash group is undone first; an elite is the
//               same ball × 1.2. Only the floor footprint is the body: the sim
//               hits, shoots and touches on x and z.
//   the wings   two translucent pink planes, 0.62 × 0.3, at ±0.68 and 0.12 up
//               in the sphere's own frame (so they squash and grow with it),
//               flapping about their own centres ±(0.45 + 0.5·sin(22·wob)) —
//               both tips drooping, ≈ 3.5 Hz. It never turns: they span x.
//   the charge  the 0.5 s before a shot, 0x661144 / black at 25 rad/s; the
//               hit flash (the core's white) and a VOLATILE fuse outrank it.
//   the death   the core swells a killed view's root 1 → 2.3 about the floor
//               over 0.28 s and resets the squash group; 1.x reset the squash
//               and swelled the sphere about its centre, which stayed at the
//               height it died at, the wings frozen mid-flap. The view keeps
//               the centre there (and an elite's 1.2).
// 1.x's wobbleT starts at U(0, 2π) per body and runs with the game; the view
// runs the same curves on the render clock with its own random offset and
// phase per view. 1.x gave the sphere no hit ripple and no death thrash (it
// writes uHit / uTear for blob bodies only), so the material's gel handle is
// kept here instead of on `mat`, where the core would drive both; the hit
// flash and the death glow are the emissive, which the core still writes.
//
// The core stops calling update() once a body is dead, so the root's own
// matrix update does the dying work (OMEGA's look does the same).
let GEO = null;
function geometries(THREE, S) {
  if (GEO) return GEO;
  const L = S.look;
  GEO = {
    ball: new THREE.SphereGeometry(S.radius, L.segments[0], L.segments[1]),
    wing: new THREE.PlaneGeometry(L.wing.size[0], L.wing.size[1]),
  };
  return GEO;
}

const TAU = Math.PI * 2;

// 1.x's hover height and wing angle (enemy.js:2288-2292) at body clock `wob`
// with phase `phase`: the centre's y, and the left wing's rotation.z (the
// right wing's is its negative)
export function pose(L, wob, phase) {
  return {
    y: L.hover.base + Math.sin(wob * L.hover.rate + phase) * L.hover.amp,
    flap: L.wing.flap.base + Math.sin(wob * L.wing.flap.rate) * L.wing.flap.amp,
  };
}

export default {
  build(ctx) {
    const { THREE, S } = ctx, L = S.look, W = L.wing, G = geometries(THREE, S);
    const mat = ctx.gelMaterial(S.color, L.gelFamily, S.radius, { wobble: L.wobble });
    mat.roughness = L.roughness; mat.transmission = L.transmission;
    const gel = mat.gel;
    mat.gel = undefined;                               // no ripple, no thrash (1.x: blob bodies only)

    // body (undoes the squash group) → ball (1.x's mesh: the hover, the squash) → its wings
    const body = new THREE.Group();
    const ball = new THREE.Mesh(G.ball, mat);
    body.add(ball);
    const wingMat = new THREE.MeshBasicNodeMaterial({
      color: W.color, transparent: true, opacity: W.opacity, side: THREE.DoubleSide, depthWrite: false,
    });
    const wings = [-1, 1].map((side) => {
      const m = new THREE.Mesh(G.wing, wingMat);
      m.position.set(side * (S.radius + W.out), W.y, 0);
      ball.add(m);
      return m;
    });

    return { body, mat, gel, own: true, ball, wings, wingMat, rm: 1, hoverY: L.hover.base,
      wob: Math.random() * TAU, bob: Math.random() * TAU, Object3D: THREE.Object3D };
  },

  update(v, g, w, time, grow) {
    const S = v.S, L = S.look;
    if (!v.hooked) attach(v);

    // undo the view's squash group (1/√sq, sq, 1/√sq about the floor): 1.x
    // squashed the sphere about its centre, below
    const rq = Math.sqrt(g.sq);
    v.body.scale.set(rq, 1 / g.sq, rq);

    // 1.x's mesh: the centre at the hover, scaled (sx × rm, sq × rm, sx × rm)
    // in its own frame (enemy.js:2288, 2732, 2779); rm carries an elite's
    // 1.2. A body still swelling into being grows up out of the floor.
    const p = pose(L, time + v.wob, v.bob);
    v.hoverY = p.y;
    const sx = 1 / Math.sqrt(Math.max(g.sq, L.sqFloor));
    v.rm = g.r / S.radius;
    const rm = v.rm * grow;
    v.ball.position.set(0, p.y * grow, 0);
    v.ball.scale.set(sx * rm, g.sq * rm, sx * rm);
    v.wings[0].rotation.z = p.flap;                   // the left (−x) wing (enemy.js:2291 `wi === 0 ? 1 : -1`)
    v.wings[1].rotation.z = -p.flap;

    // the charge flicker (enemy.js:2682-2685): the hit flash and a VOLATILE
    // fuse (the core's) outrank it (enemy.js:2650-2656)
    if (g.flash <= 0 && g.affix !== 'volatile' && g.s.charge) {
      v.mat.emissive.setHex(Math.sin(time * L.charge.rate) > 0 ? L.charge.on : L.charge.off);
    }
  },

  // a pooled view comes back unflapped, at rest, with a fresh clock and phase
  reset(v) {
    v.body.scale.set(1, 1, 1);
    v.ball.position.set(0, v.S.look.hover.base, 0); v.ball.scale.set(1, 1, 1);
    for (const m of v.wings) m.rotation.z = 0;
    v.hoverY = v.S.look.hover.base; v.rm = 1;
    v.wob = Math.random() * TAU; v.bob = Math.random() * TAU;
  },
};

// Let the root's own matrix update play the death: while a killed view
// swells its root by k about the floor (and has reset the squash group), the
// ball is a uniform rm, its centre held at the height it died at (hoverY / k
// in the swelling root), the wings where they stopped.
function attach(v) {
  v.hooked = true;
  const base = v.Object3D.prototype.updateMatrixWorld;
  v.root.updateMatrixWorld = function (force) {
    if (v.dyingT > 0) {
      const k = this.scale.y || 1;
      v.body.scale.set(1, 1, 1);
      v.ball.position.set(0, v.hoverY / k, 0);
      v.ball.scale.setScalar(v.rm);
    }
    base.call(this, force);
  };
}
