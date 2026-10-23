// yela.js — how YELA CUBE looks: 1.x's rounded cube (RoundedBoxGeometry 1.8r
// a side, 4 corner segments, a 0.18 corner, enemy.js:738) in the firmer
// `cube` satin family (roughness 0.10, transmission 0.25, lumps at 0.35
// wobble, makeSatinMat(color, 'cube', …), enemy.js:807-809), yellow 0xffdd00,
// and the two things it does that no other gel does:
//
// THE TUMBLE (enemy.js:1542-1565, 2739-2740). Mid-flop the cube is rigid and
// unsquashed, pivoting over its planted leading bottom edge: its centre sits
// L + D·cos(ang) along the heading from where the flop began and D·sin(ang)
// above the floor, and it is turned (135° − ang) about the ground axis
// (dir.z, 0, −dir.x). The angle is read back from where the view stands on
// the flop line, not from the sim's last step, so the edge stays planted
// between steps too (the view interpolates the position). At rest it stands
// upright on its bottom face and carries the squash spring and a 0.10 breath
// (enemy.js:2770-2777); it never turns to its heading.
//
// THE SLIME TRAIL (main.js:1547-1578, 10466-10471; the bubbles 2443-2489).
// Every splat the sim lays (g.s.slime) becomes a flat yellow-green disc,
// jittered and spun, fading over 2 s, fizzing small rising bubbles while it
// is young. It belongs to the floor, not the body: one shared pool in the
// scene, faded on the GPU against its own clock, so a trail outlives its
// cube and goes on fading when no cube is left. The clock runs with the sim
// while any cube is drawn (a pause or a held look check freezes it, as 1.x's
// splat pool did) and on the frame clock otherwise.
//
// 1.x writes the hit ripple and the death tear for BLOBS only (enemy.js:1611,
// 2986-2989): a cube takes a bullet as a flash and a squash, and dies as a
// pop. The core drives every gel's `mat.gel`, so this look hands it stand-in
// uniforms and keeps the real ones at rest. A cube killed mid-flop snaps
// upright as it pops (enemy.js:3015).
const DEG = Math.PI / 180;
let GEO = null;            // one rounded cube for every view
let POOL = null;           // the slime on the floor, one per scene

export default {
  build(ctx) {
    const { THREE, S } = ctx, K = S.look;
    GEO ||= roundedBox(THREE, 2 * S.flop.halfExtent, K.corner / S.radius, K.segments);
    const mat = ctx.gelMaterial(S.color, 'cube', 1);
    const gel = mat.gel;
    mat.gel = { ...gel, hit: { value: 0 }, hitDir: { value: new THREE.Vector2() }, tear: { value: 0 } };
    const body = new THREE.Mesh(GEO, mat);
    // the kill: no look hook runs then, so the body notices it as it is drawn
    // (the core starts the view's dying timer) and stands up for its pop
    body.onBeforeRender = () => {
      const v = body.userData.view;
      if (!v || !(v.dyingT > 0) || v.popped) return;
      v.popped = true;
      body.quaternion.identity();
      body.scale.setScalar(v.rNow);
      if (v.upright) body.position.y = S.flop.halfExtent * v.rNow;
    };
    return { body, mat, own: true, gel, axis: new THREE.Vector3(), pool: slimePool(ctx), seen: -1, popped: false, rNow: 0, upright: true };
  },

  update(v, g, w, time, grow) {
    const S = v.S, F = S.flop, K = S.look, s = g.s, b = v.body;
    const r = g.r * grow, L = F.halfExtent * r;
    v.rNow = r; b.userData.view = v;
    v.squash.scale.set(1, 1, 1);           // the spring is drawn here: about the floor at rest, not at all mid-flop
    if (s.tumble) {
      const D = L * Math.SQRT2, a0 = F.arcStartDeg * DEG, a1 = F.arcEndDeg * DEG;
      const along = (v.root.position.x - s.x0) * s.dirX + (v.root.position.z - s.z0) * s.dirZ;
      const ang = Math.acos(clamp((clamp(along, 0, 2 * L) - L) / D, -1, 1));
      b.scale.setScalar(r);
      b.position.set(0, D * Math.sin(ang), 0);
      b.quaternion.setFromAxisAngle(v.axis.set(s.dirZ, 0, -s.dirX), ((a0 - ang) / (a0 - a1)) * (Math.PI / 2));
      v.upright = false;
    } else {
      const br = K.breatheAmp * Math.sin(time * K.breatheRate + v.phase);
      const across = (1 / Math.sqrt(Math.max(g.sq, 0.1))) * (1 - br * K.breatheXZ), tall = g.sq * (1 + br);
      b.scale.set(r * across, r * tall, r * across);
      b.position.set(0, L * tall, 0);     // its bottom face on the floor
      b.quaternion.identity();
      v.upright = true;
    }
    if (w && v.pool) trail(v, g, w, time);
  },

  reset(v) { v.seen = -1; v.popped = false; v.upright = true; v.body.quaternion.identity(); },
};

// Lay every splat the sim has laid since this view last looked, and run the
// pool's clock with the sim's (once a frame, however many cubes are drawn).
function trail(v, g, w, time) {
  const P = v.pool, K = v.S.look, sl = g.s.slime;
  if (P.world !== w) { clearPool(P); P.world = w; P.simT = w.time; }
  if (P.frame !== time) { P.now.value += Math.max(0, w.time - P.simT); P.frame = time; }
  P.simT = w.time;
  if (!sl) return;
  for (const e of sl) {
    if (e.n <= v.seen) continue;
    v.seen = e.n;
    const age = w.time - e.t;
    if (age < K.slimeLife) lay(P, K, e.x, e.z, v.S.slime.radius, P.now.value - age);
  }
}

// One splat at (x, z), born at `born` on the pool's clock, and its fizz: a
// stream of bubbles at fizzRate a second while it is young (1.x drew one with
// a 1.5·dt chance each frame).
export function lay(P, K, x, z, radius, born) {
  const i = P.si; P.si = (P.si + 1) % P.splats.count;
  const j = K.slimeJitter, sx = radius * rand(j[0], j[1]), sz = radius * rand(j[0], j[1]);
  P.q.setFromAxisAngle(P.up, Math.random() * Math.PI * 2);
  P.m.compose(P.p.set(x, K.slimeY, z), P.q, P.s.set(sx, 1, sz));
  P.splats.setMatrixAt(i, P.m);
  P.splats.instanceMatrix.needsUpdate = true;
  P.born.setX(i, born); P.born.needsUpdate = true;
  let t = gap(K.fizzRate);
  for (let k = 0; k < K.fizzMax && t < K.slimeLife - K.fizzUntil; k++, t += gap(K.fizzRate)) {
    const n = P.bi; P.bi = (P.bi + 1) % P.bubbles.count;
    P.bub.setXYZW(n, x + (Math.random() - 0.5) * K.fizzSpread, z + (Math.random() - 0.5) * K.fizzSpread, born + t, rand(K.bubbleLife[0], K.bubbleLife[1]));
    P.bub2.setXY(n, rand(K.bubbleSize[0], K.bubbleSize[1]), n);
  }
  P.bub.needsUpdate = true; P.bub2.needsUpdate = true;
  return i;
}

function clearPool(P) {
  P.m.makeScale(0, 0, 0);
  for (let i = 0; i < P.splats.count; i++) { P.splats.setMatrixAt(i, P.m); P.born.setX(i, -1e9); }
  for (let i = 0; i < P.bubbles.count; i++) P.bub.setZ(i, -1e9);
  P.splats.instanceMatrix.needsUpdate = P.born.needsUpdate = P.bub.needsUpdate = true;
  P.si = P.bi = 0;
}

// The pool: splats (flat discs, one draw) and bubbles (one draw), every
// splat's fade and every bubble's whole life computed on the GPU from the
// birth times written at laying; the CPU only lays them and runs the clock.
function slimePool(ctx) {
  if (POOL && POOL.scene === ctx.scene) return POOL;
  if (!ctx.scene) return null;
  const { THREE, TSL } = ctx, K = ctx.S.look;
  const now = TSL.uniform(0);
  // the splats (1.x SplatPool: a flat disc, colour, opacity fading linearly over its life)
  const sGeo = new THREE.CircleGeometry(1, K.slimeSegments).rotateX(-Math.PI / 2);
  const born = new THREE.InstancedBufferAttribute(new Float32Array(K.slimeCap), 1).setUsage(THREE.DynamicDrawUsage);
  sGeo.setAttribute('aBorn', born);
  const sMat = new THREE.MeshBasicNodeMaterial({ color: K.slimeColor, transparent: true, depthWrite: false });
  const age = now.sub(TSL.attribute('aBorn', 'float'));
  sMat.opacityNode = TSL.float(K.slimeOpacity).mul(TSL.clamp(TSL.float(1).sub(age.div(K.slimeLife)), 0, 1)).mul(TSL.step(0, age));
  const splats = new THREE.InstancedMesh(sGeo, sMat, K.slimeCap);
  splats.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  splats.frustumCulled = false; splats.renderOrder = -1;
  // the bubbles (1.x BubblePool): rise from bubbleY at bubbleRise u/s, a lazy
  // wiggle x += sin(9·y + i)·0.15·dt — in closed form along the rise — and a
  // shrink over the last 1/3 s; every instance matrix stays the identity
  const bGeo = new THREE.SphereGeometry(1, K.bubbleSegments[0], K.bubbleSegments[1]);
  const bub = new THREE.InstancedBufferAttribute(new Float32Array(K.bubbleCap * 4), 4).setUsage(THREE.DynamicDrawUsage);   // x, z, born, life
  const bub2 = new THREE.InstancedBufferAttribute(new Float32Array(K.bubbleCap * 2), 2).setUsage(THREE.DynamicDrawUsage);  // size, i
  bGeo.setAttribute('aBub', bub); bGeo.setAttribute('aBub2', bub2);
  const bMat = new THREE.MeshBasicNodeMaterial({ color: K.fizzColor, transparent: true, opacity: K.bubbleOpacity, depthWrite: false });
  const A = TSL.attribute('aBub', 'vec4'), B = TSL.attribute('aBub2', 'vec2');
  const bAge = now.sub(A.z), left = A.w.sub(bAge);
  const k = B.x.mul(TSL.clamp(left.mul(K.bubblePop), 0, 1)).mul(TSL.step(0, bAge));
  const y = TSL.float(K.bubbleY).add(bAge.mul(K.bubbleRise));
  const [wf, wa] = K.bubbleWiggle, c = wa / (wf * K.bubbleRise);
  const x = A.x.add(TSL.cos(B.y.add(wf * K.bubbleY)).sub(TSL.cos(y.mul(wf).add(B.y))).mul(c));
  bMat.positionNode = TSL.positionLocal.mul(k).add(TSL.vec3(x, y, A.y));
  const bubbles = new THREE.InstancedMesh(bGeo, bMat, K.bubbleCap);
  bubbles.frustumCulled = false;
  ctx.scene.add(splats, bubbles);
  const P = { scene: ctx.scene, splats, bubbles, born, bub, bub2, now, si: 0, bi: 0, world: null, simT: 0, frame: -1,
    m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), s: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) };
  clearPool(P);
  // with no cube on the floor nothing calls update, so the trail left behind
  // fades on the frame clock (once a frame, however many passes draw it)
  const T = ctx.GEL_TIME;
  splats.onBeforeRender = () => {
    const wall = T.value;
    if (P.frame === wall) return;
    if (P.frame >= 0) P.now.value += clamp(wall - P.frame, 0, K.slimeLife);
    P.frame = wall;
    if (P.world) P.simT = P.world.time;
  };
  return (POOL = P);
}

// three's RoundedBoxGeometry (examples/jsm/geometries, MIT), centred, without
// UVs: a box of 2·segments + 1 per side whose vertices are pushed out from
// the inner box along their own normals, so the corners round off smoothly.
export function roundedBox(THREE, size, radius, segments) {
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
  g.userData.sdf = { shape: 'box', half: size / 2, round: radius };   // sdf.js draws it as a field
  return g;
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const gap = (rate) => -Math.log(1 - Math.random()) / rate;     // the wait to the next event of a Poisson stream
