// orange.js — how ORANGE CUBE looks: 1.x's rounded cube (RoundedBoxGeometry
// 1.8r a side, 4 corner segments, a 0.18 corner, enemy.js:738 — 1.35 on a
// side at radius 0.75) in the firmer `cube` satin family (roughness 0.10,
// transmission 0.25, lumps at 0.35 wobble, makeSatinMat(color, 'cube', …),
// enemy.js:807-809), orange 0xff8800 (no contrast rim at its luminance, L
// 0.39), no eyes, no motion trail, and the two things it does:
//
// THE TUMBLE (enemy.js:1542-1565, 2739-2740). Mid-flop the cube is rigid and
// unsquashed, pivoting over its planted leading bottom edge: its centre sits
// L + D·cos(ang) along the heading from where the flop began and D·sin(ang)
// above the floor, and it is turned (135° − ang) about the ground axis
// (dir.z, 0, −dir.x). ORANGE's heading is free, so it tips over a DIAGONAL
// edge as often as a square one (v43). The angle is read back from where the
// view stands on the flop line, not from the sim's last step, so the edge
// stays planted between steps too (the view interpolates the position). At
// rest it stands upright and unturned, with its centre at L, carrying the
// squash spring and a 0.10 breath ABOUT THAT CENTRE (enemy.js:1000, 1559,
// 2770-2777: the mesh origin is the box centre, so a landing's squash lifts
// its bottom face a little off the floor and a stretch sinks it in).
//
// THE STROBE (enemy.js:2657-2658). For the last 0.6 s before each wall (while
// the sim's g.tell > 0) the body's emissive is a square wave, 0x442200 /
// black at 20 rad/s off the frame clock (1.x read performance.now()). 1.x's
// emissive order holds: the hit flash outranks it, and so does the VOLATILE
// fuse (enemy.js:2650-2656), which this leaves alone.
//
// 1.x writes the hit ripple and the death tear for BLOBS only (enemy.js:1611,
// 2704-2709, 2986-2989): a cube takes a bullet as a flash and a squash, and
// dies as a pop. The core drives every gel's `mat.gel`, so this look hands it
// stand-in uniforms and keeps the real ones at rest. The kill (destroy,
// enemy.js:3013-3029; updateDeath 2968-2984): it snaps flat where it stood —
// mid-flop it pops at the height it had reached — unsquashed, and swells to
// 2.3× about its own centre.
const DEG = Math.PI / 180;
let GEO = null;            // one rounded cube for every view

export default {
  build(ctx) {
    const { THREE, S } = ctx, K = S.look;
    GEO ||= roundedBox(THREE, 2 * S.flop.halfExtent, K.corner / S.radius, K.segments);
    const mat = ctx.gelMaterial(S.color, 'cube', 1);
    const gel = mat.gel;
    mat.gel = { ...gel, hit: { value: 0 }, hitDir: { value: new THREE.Vector2() }, tear: { value: 0 } };
    const body = new THREE.Mesh(GEO, mat);
    // the kill: no look hook runs while it dies, so the body notices as it is
    // drawn (the core has started the view's dying timer and swells the root
    // about the floor) and keeps its centre where it popped
    body.onBeforeRender = () => {
      const v = body.userData.view;
      if (!v || !(v.dyingT > 0)) return;
      if (!v.popped) {
        v.popped = true;
        v.popY = body.position.y;
        body.quaternion.identity();
        body.scale.setScalar(v.rNow);
      }
      body.position.y = v.popY / (v.root.scale.y || 1);
      body.updateMatrixWorld();
    };
    return { body, mat, own: true, gel, axis: new THREE.Vector3(), popped: false, popY: 0, rNow: 0 };
  },

  update(v, g, w, time, grow) {
    const S = v.S, F = S.flop, K = S.look, s = g.s, b = v.body;
    const r = g.r * grow, L = F.halfExtent * r;
    v.rNow = r; b.userData.view = v;
    v.squash.scale.set(1, 1, 1);           // the spring is drawn here: about the centre at rest, not at all mid-flop
    if (s.tumble) {
      const D = L * Math.SQRT2, a0 = F.arcStartDeg * DEG, a1 = F.arcEndDeg * DEG;
      const along = (v.root.position.x - s.x0) * s.dirX + (v.root.position.z - s.z0) * s.dirZ;
      const ang = Math.acos(clamp((clamp(along, 0, 2 * L) - L) / D, -1, 1));
      b.scale.setScalar(r);
      b.position.set(0, D * Math.sin(ang), 0);
      b.quaternion.setFromAxisAngle(v.axis.set(s.dirZ, 0, -s.dirX).normalize(), ((a0 - ang) / (a0 - a1)) * (Math.PI / 2));
    } else {
      const br = K.breatheAmp * Math.sin(time * K.breatheRate + v.phase);
      const across = (1 / Math.sqrt(Math.max(g.sq, K.sqFloor))) * (1 - br * K.breatheXZ), tall = g.sq * (1 + br);
      b.scale.set(r * across, r * tall, r * across);
      b.position.set(0, L, 0);            // its centre at L (1.x enemy.js:1559)
      b.quaternion.identity();
    }
    // the strobe: under the hit flash and the volatile fuse (1.x enemy.js:2650-2658)
    if (g.tell > 0 && !(g.flash > 0) && g.affix !== 'volatile' && v.mat?.emissive) {
      v.mat.emissive.setHex(Math.sin(time * K.strobeRate) > 0 ? K.strobeOn : K.strobeOff);
    }
  },

  reset(v) { v.popped = false; v.body.quaternion.identity(); },
};

// three's RoundedBoxGeometry (examples/jsm/geometries, MIT), centred, without
// UVs: a box of 2·segments + 1 per side whose vertices are pushed out from
// the inner box along their own normals, so the corners round off smoothly
// and the normals are smooth across every seam.
function roundedBox(THREE, size, radius, segments) {
  const n = segments * 2 + 1, half = 0.5 / n, inner = size / 2 - radius;
  const g = new THREE.BoxGeometry(1, 1, 1, n, n, n).toNonIndexed();
  g.deleteAttribute('uv');
  const p = g.attributes.position.array, nr = g.attributes.normal.array;
  for (let i = 0; i < p.length; i += 3) {
    let nx = p[i] - Math.sign(p[i]) * half, ny = p[i + 1] - Math.sign(p[i + 1]) * half, nz = p[i + 2] - Math.sign(p[i + 2]) * half;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    p[i] = inner * Math.sign(p[i]) + nx * radius;
    p[i + 1] = inner * Math.sign(p[i + 1]) + ny * radius;
    p[i + 2] = inner * Math.sign(p[i + 2]) + nz * radius;
    nr[i] = nx; nr[i + 1] = ny; nr[i + 2] = nz;
  }
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
