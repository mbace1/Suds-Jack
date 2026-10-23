// redd.js — how REDD CUBE looks: 1.x's rounded cube (RoundedBoxGeometry 1.8r
// a side, 4 corner segments, a 0.18 corner, enemy.js:738 — 1.35 on a side at
// radius 0.75) in the firmer `cube` satin family (roughness 0.10,
// transmission 0.25, lumps at 0.35 wobble, makeSatinMat(color, 'cube', …),
// enemy.js:807-809), red 0xff2211, no eyes, no motion trail, no tell (1.x
// gives it no emissive of its own, enemy.js:2648-2690), and the one thing
// every cube does:
//
// THE TUMBLE (enemy.js:1542-1565, 2739-2740). Mid-flop the cube is rigid and
// unsquashed, pivoting over its planted leading bottom edge: its centre sits
// L + D·cos(ang) along the heading from where the flop began and D·sin(ang)
// above the floor, and it is turned (135° − ang) about the ground axis
// (dir.z, 0, −dir.x). REDD's heading is a cardinal, so it always tips over a
// square edge. The angle is read back from where the view stands on the flop
// line, not from the sim's last step, so the edge stays planted between
// steps too (the view interpolates the position). At rest it stands upright
// and unturned, with its centre at L, carrying the squash spring and a 0.10
// breath ABOUT THAT CENTRE (enemy.js:1000, 1559, 2770-2777: the mesh origin is
// the box centre, so a landing's squash lifts its bottom face a little off the
// floor and a stretch sinks it in).
//
// 1.x writes the hit ripple and the death tear for BLOBS only (enemy.js:1611,
// 2704-2709, 2986-2989): a cube takes a bullet as a flash and a squash, and
// dies as a pop. The core drives every gel's `mat.gel`, so this look hands it
// stand-in uniforms and keeps the real ones at rest. The kill (destroy,
// enemy.js:3013-3029; updateDeath 2967-2984): it snaps flat where it stood —
// mid-flop it pops at the height it had reached — unsquashed, and swells to
// 2.3× about its own centre. Its brood comes out as the pop ends (the sim).
//
// REDD MINI (looks/reddmini.js) is the same cube at its own radius: each
// calls cubeLook() for a look with its own shared geometry. A brood passes
// `{ unborn: true }`: 1.x built its minis only when the parent's pop ENDED
// (enemy.js:2992-3000, main.js:10586-10620), full size, so a child waiting
// out that pop in the core's wait (state 'appear') is not drawn at all, and
// comes out at full size (a child never swells).
const DEG = Math.PI / 180;

export function cubeLook({ unborn = false } = {}) {
  let GEO = null;            // one rounded cube for every view of this species
  return {
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
      b.visible = !(unborn && g.child && g.state === 'appear');   // not built yet: its parent is still popping
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
    },

    reset(v) { v.popped = false; v.body.quaternion.identity(); v.body.visible = true; },
  };
}

export default cubeLook();

// three's RoundedBoxGeometry (examples/jsm/geometries, MIT), centred, without
// UVs: a box of 2·segments + 1 per side whose vertices are pushed out from
// the inner box along their own normals, so the corners round off smoothly
// and the normals are smooth across every seam. Three clamps the corner to
// half the shortest side; 1.x's 0.18 never reaches it, even on a mini.
function roundedBox(THREE, size, radius, segments) {
  const n = segments * 2 + 1, half = 0.5 / n, rr = Math.min(radius, size / 2), inner = size / 2 - rr;
  const g = new THREE.BoxGeometry(1, 1, 1, n, n, n).toNonIndexed();
  g.deleteAttribute('uv');
  const p = g.attributes.position.array, nr = g.attributes.normal.array;
  for (let i = 0; i < p.length; i += 3) {
    let nx = p[i] - Math.sign(p[i]) * half, ny = p[i + 1] - Math.sign(p[i + 1]) * half, nz = p[i + 2] - Math.sign(p[i + 2]) * half;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    p[i] = inner * Math.sign(p[i]) + nx * rr;
    p[i + 1] = inner * Math.sign(p[i + 1]) + ny * rr;
    p[i + 2] = inner * Math.sign(p[i + 2]) + nz * rr;
    nr[i] = nx; nr[i + 1] = ny; nr[i + 2] = nz;
  }
  g.computeBoundingBox(); g.computeBoundingSphere();
  g.userData.sdf = { shape: 'box', half: size / 2, round: rr };   // sdf.js draws it as a field
  return g;
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
