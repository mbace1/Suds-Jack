// toro.js — how TORO looks: 1.x's v255 sawblade wheel (enemy.js:126-152,
// 827-856, 2562-2662, 2726-2738), not a gel dome.
//
//   the wheel   ONE merged geometry in the satin gel of 1.x's `toro` family
//               (roughness 0.10, transmission 0.25, uWobble 0.35, uRadius
//               1.0): a tyre (torus 0.68 / 0.30), a sawblade of 8 four-sided
//               spikes out to 1.58, a hub and three spokes through the
//               centre — the spokes are what make the rev's spin a picture.
//               It stands upright with its centre at the CFG radius (1.0,
//               elite or not; an elite or boss is the same wheel scaled), its
//               axle across its line, turned to where it creeps or will dash,
//               spinning about the axle by the sim's angle. The squash spring
//               scales it about the axle, as 1.x scaled its group — so the
//               view's floor-anchored squash group is undone first.
//   the glow    through the rev, black → 0x003319 (the hit flash outranks it)
//   the arrow   the telegraph, on the floor where it stood when the rev
//               ended: a 0.34 shaft stretched to the dash's exact length and
//               a three-sided arrowhead with its tip exactly where the dash
//               will stop, 0xff2200, flashing 0.7 / 0.15 at ≈ 4 Hz. It does
//               not follow the wheel (the wave's current can drift the wheel
//               off it, as in 1.x), and it goes when the dash starts or the
//               TORO dies (1.x enemy.js:2614, 3074-3077)
// 1.x gave a TORO no hit ripple and no death thrash (uHit and uTear were
// written for blob bodies only), so the material's gel handle is kept here
// instead of on `mat`, where the core would drive both; the hit flash and the
// death glow are the emissive, which the core still writes. A dying TORO
// swells to 2.3x as 1.x's did (the core's own-look death).
//
// The arrow stands in the world, not on the wheel: it hangs off the view's
// root, offset to its world spot, so it goes with the view when it is pooled;
// it hides while a killed view plays out its last 0.28 s.
let GEO = null;
function geometries(THREE, S) {
  if (GEO) return GEO;
  const L = S.look, I = L.indicator;
  const shaft = new THREE.BoxGeometry(I.width, I.thick, 1);
  shaft.translate(0, 0, 0.5);                          // origin at the near end → scale.z = the dash length
  const arrow = new THREE.ConeGeometry(I.arrow.radius, I.arrow.length, I.arrow.sides);
  arrow.rotateX(Math.PI / 2);                          // cone +y → +z: lying along the path
  arrow.translate(0, 0, -I.arrow.length / 2);          // its tip at local z = 0
  GEO = { wheel: wheelGeometry(THREE, S), shaft, arrow };
  return GEO;
}

// 1.x toroWheelGeometry (enemy.js:126-152): in local XY, axle along z, travel +x
function wheelGeometry(THREE, S) {
  const L = S.look, r = S.radius;
  const rimR = r * S.rim, tubeR = r * L.tube;
  const parts = [new THREE.TorusGeometry(rimR, tubeR, L.tyreSegs[0], L.tyreSegs[1])];
  // the sawblade: each cone's +y points radially out, its base sunk into the tyre
  for (let i = 0; i < L.rimSpikes; i++) {
    const a = (i / L.rimSpikes) * Math.PI * 2;
    const c = new THREE.ConeGeometry(L.spike.base, L.spike.length, L.spike.sides);
    const d = rimR + tubeR - L.spike.sink + L.spike.length / 2;
    c.rotateZ(a - Math.PI / 2);
    c.translate(Math.cos(a) * d, Math.sin(a) * d, 0);
    parts.push(c);
  }
  // the hub, along the axle
  const hub = new THREE.CylinderGeometry(L.hub.r, L.hub.r, L.hub.depth, L.hub.sides);
  hub.rotateX(Math.PI / 2);
  parts.push(hub);
  // the spokes, through the centre in the wheel's plane
  const spokeLen = (rimR - tubeR * L.spokes.inset) * 2;
  for (let i = 0; i < L.spokes.count; i++) {
    const b = new THREE.BoxGeometry(L.spokes.w, spokeLen, L.spokes.d);
    b.rotateZ((i / L.spokes.count) * Math.PI);
    parts.push(b);
  }
  return concat(THREE, parts);
}

// 1.x concatGeometries (enemy.js:108-124): every piece non-indexed, so a
// merge is three appends
function concat(THREE, parts) {
  const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    const items = flat.map((g) => g.getAttribute(name)).filter(Boolean);
    if (items.length !== flat.length) continue;
    const size = items[0].itemSize, arr = new Float32Array(items.reduce((n, a) => n + a.count, 0) * size);
    let off = 0;
    for (const a of items) { arr.set(a.array.subarray(0, a.count * size), off); off += a.count * size; }
    out.setAttribute(name, new THREE.BufferAttribute(arr, size));
  }
  for (const g of parts) g.dispose();
  for (const g of flat) g.dispose();
  out.computeBoundingSphere();
  return out;
}

export default {
  build(ctx) {
    const { THREE, S } = ctx, L = S.look, I = L.indicator, G = geometries(THREE, S);
    const mat = ctx.gelMaterial(S.color, 'toro', S.radius, { wobble: L.wobble });
    mat.roughness = L.roughness; mat.transmission = L.transmission;
    const gel = mat.gel;
    mat.gel = undefined;                               // no ripple, no thrash (1.x: blob bodies only)

    // body (undoes the squash group) → axle (at the CFG radius: yaw, 1.x's squash) → wheel (the spin) → mesh
    const body = new THREE.Group(), axle = new THREE.Group(), wheel = new THREE.Group();
    const mesh = new THREE.Mesh(G.wheel, mat);
    wheel.add(mesh); axle.add(wheel); body.add(axle);

    // the arrow, standing in the world
    const fx = new THREE.Group();
    const indMat = new THREE.MeshBasicNodeMaterial({ color: I.color, transparent: true, opacity: I.opacity0 });
    const ind = new THREE.Group();
    const shaft = new THREE.Mesh(G.shaft, indMat), arrow = new THREE.Mesh(G.arrow, indMat);
    ind.add(shaft, arrow);
    ind.visible = false;
    fx.add(ind);

    return { body, mat, gel, own: true, axle, wheel, mesh, fx, ind, indMat, shaft, arrow, Object3D: THREE.Object3D };
  },

  update(v, g, w, time, grow) {
    const S = v.S, L = S.look, I = L.indicator, s = g.s;
    if (v.fx.parent !== v.root) attachFx(v);

    // undo the view's squash group (1/√sq, sq, 1/√sq about the floor): 1.x
    // squashed the wheel about its axle, below
    const rq = Math.sqrt(g.sq);
    v.body.scale.set(rq, 1 / g.sq, rq);

    // 1.x's group: at the CFG radius, yawed to the line, scaled (sx, sq, sx)
    // (enemy.js:836, 2569, 2587, 2737-2738). A body still swelling into
    // being grows from the floor.
    const sx = 1 / Math.sqrt(Math.max(g.sq, L.sqFloor));
    v.axle.position.y = S.radius * grow;
    v.axle.rotation.y = s.yaw;
    v.axle.scale.set(sx, g.sq, sx);
    v.wheel.rotation.z = -s.spin;
    // the mesh carries the size (an elite's 1.2, a boss's 1.5, 1.x
    // main.js:9389, 9406) and the ANCHORED affix's squat (main.js:9419)
    const rm = (g.r / S.radius) * grow;
    if (g.affix === 'anchored') v.mesh.scale.set(rm * L.anchored.xz, rm * L.anchored.y, rm * L.anchored.xz);
    else v.mesh.scale.setScalar(rm);

    // the rev glow: (v << 8) | (v × 0.5), v = ⌊ramp × 0x33⌋; the flash outranks it
    if (g.flash <= 0 && g.tell > 0) {
      const k = Math.floor(g.tell * L.revGlow);
      v.mat.emissive.setHex((k << 8) | (k * L.revGlowBlue));
    }

    // the arrow, from where it was laid to where the dash will stop
    const tele = s.state === 'telegraphing';
    v.ind.visible = tele;
    if (tele) {
      v.ind.position.set(s.tx - v.root.position.x, I.y, s.tz - v.root.position.z);
      v.ind.rotation.y = Math.atan2(s.dirX, s.dirZ);
      v.shaft.scale.z = s.len;
      v.arrow.position.z = s.len;
      v.indMat.opacity = Math.sin(s.stateT * I.flashRate) > 0 ? I.opacity[0] : I.opacity[1];
    }
  },

  // a pooled view comes back with no arrow
  reset(v) { v.ind.visible = false; v.indMat.opacity = v.S.look.indicator.opacity0; },
};

// Hang the arrow off the view's root, once per view. A dying view swells its
// root for 0.28 s; the arrow hides through it (1.x hid it at the kill).
function attachFx(v) {
  v.root.add(v.fx);
  const base = v.Object3D.prototype.updateMatrixWorld;
  v.fx.updateMatrixWorld = function (force) {
    this.visible = !(v.dyingT > 0);
    base.call(this, force);
  };
}
