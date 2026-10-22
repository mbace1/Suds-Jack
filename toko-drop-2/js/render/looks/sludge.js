// sludge.js — how SLUDGE CUBE looks: 1.x's lime rounded cube (three's
// RoundedBoxGeometry 1.8 r a side, 4 corner segments, a 0.18 corner,
// enemy.js:738; satin family `cube`: roughness 0.10, transmission 0.25,
// uWobble 0.35, no contrast rim at its luminance) that TIPS over its leading
// bottom edge, and the v220 poured trail behind it, which is the readable part
// of the species (1.x drew the poison zones themselves as nothing since v100).
//
// The cube (1.x enemy.js:1543-1561, 2739-2740, 2770-2777, 3015): mid-flop it
// is its plain size — no squash, no breath — rotated p × 90° about
// (dir.z, 0, −dir.x) with its centre D·sin(ang) up; the angle is read off
// where the view has put the body (between steps), so the leading edge stays
// planted on the floor at any frame rate. At rest it breathes,
// (1 − b/2, 1 + b, 1 − b/2), b = 0.10·sin(2.4 t + φ), on the squash spring
// the landing kicked. It is `own` because the default cube shaping yaws a
// cube to its heading, which 1.x never did. 1.x wrote the hit ripple and the
// death tear for BLOBS only (enemy.js:1609-1625, 2702-2708, 2986-2989): a cube
// takes a bullet as a flash and a squash and dies as a pop, so the core's
// writes land on stand-in uniforms and the real ones stay at rest. When it
// dies its squash and breath drop out and a tumble snaps flat (1.x destroy()).
//
// The trail (1.x SludgeRibbon, main.js:1602-1673): one squashed droplet
// (r, 0.26 r, r) per trail point the sim keeps (g.s.trail), r = 1.5 × the
// body's radius × an undulation × (1 − 0.45 × age), overlapping into one
// poured streak that dries down as its points age; opacity pulses
// 0.35 + 0.2·|sin 5t| while the cube lives ("lethal"), and once it is dead the
// droplets hold (age 0.5) and fade from 0.4 over 2 s. Fumes (v132) rise off a
// live trail into one pool of 48 shared by every trail (1.x's bubble pool,
// main.js:2442; 1.x also shared it with YELA's slime fizz and three other
// fizzers, which no species look can reach). The body's view is pooled and
// only updated while the body lives, so the trail and the fumes animate
// themselves in onBeforeRender: a trail whose body was not updated this
// frame is dead. Their clock is the sim's while any
// cube is drawn — 1.x ran them in its game update, so a pause froze them
// (main.js:9293-9299) — and the frame's (capped as 1.x's was) once every cube
// is gone and only fading trails are left. Each view carries two trails, so a
// view reused for a new cube leaves the last one's trail to finish its fade.
// A new run clears every trail and fume of the last one the moment a cube of
// the new run is drawn, as 1.x's clearFX did at startGame (main.js:7156-7171).
const DEG = Math.PI / 180;
const shared = new WeakMap();        // per scene: the cube, the droplet geometry, the fume pool, the clock

function sharedFor(ctx) {
  let sh = shared.get(ctx.scene);
  if (sh) return sh;
  const { THREE } = ctx, S = ctx.S, K = S.look, R = K.ribbon, F = K.fumes;
  sh = {
    cubeGeo: roundedBox(THREE, 2 * S.flop.halfEdge, K.corner / S.radius, K.segments),
    blobGeo: new THREE.SphereGeometry(1, R.segments[0], R.segments[1]),
    wall: ctx.GEL_TIME, cap: K.frameCap,
    clock: { now: 0, frame: null, world: null, simT: 0 },
    trails: [], world: null,          // every trail in the scene, and the run they were last poured in
  };
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, F.segments[0], F.segments[1]),
    new THREE.MeshBasicNodeMaterial({ color: F.color, transparent: true, opacity: F.opacity, depthWrite: false }), F.pool);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false; mesh.count = 0;
  sh.fumes = {
    mesh, F, sh, last: null, m: new THREE.Matrix4(),
    x: new Float32Array(F.pool), y: new Float32Array(F.pool), z: new Float32Array(F.pool),
    life: new Float32Array(F.pool), size: new Float32Array(F.pool), active: new Uint8Array(F.pool),
  };
  mesh.onBeforeRender = () => stepFumes(sh.fumes);
  ctx.scene.add(mesh);
  shared.set(ctx.scene, sh);
  return sh;
}

// The trail's and the fumes' clock, once a frame however many read it: the
// sim's time while a cube is drawn (`w` given: a view's update), so a pause or
// a held look check freezes them as 1.x's pause did; the frame's otherwise.
// Either way no frame counts more than 1.x's 0.05 s.
function tick(sh, w) {
  const C = sh.clock, wall = sh.wall.value;
  if (C.frame === wall) return C.now;
  if (w) {
    C.now += C.world === w ? Math.min(sh.cap, Math.max(0, w.time - C.simT)) : 0;
    C.world = w; C.simT = w.time;
  } else {
    C.now += C.frame == null ? 0 : Math.min(sh.cap, Math.max(0, wall - C.frame));
    C.world = null;
  }
  C.frame = wall;
  return C.now;
}

// 1.x BubblePool.spawn: the first free slot, or nothing (main.js:2462-2471)
function spawnFume(f, x, z) {
  const F = f.F;
  let s = -1;
  for (let i = 0; i < F.pool; i++) if (!f.active[i]) { s = i; break; }
  if (s < 0) return;
  f.x[s] = x; f.y[s] = F.y; f.z[s] = z;
  f.life[s] = F.life[0] + Math.random() * (F.life[1] - F.life[0]);
  f.size[s] = F.size[0] + Math.random() * (F.size[1] - F.size[0]);
  f.active[s] = 1;
}

// 1.x BubblePool.update (main.js:2475-2490): rise, wiggle, pop
function stepFumes(f) {
  const F = f.F, now = tick(f.sh), dt = f.last == null ? 0 : now - f.last;
  f.last = now;
  let n = 0;
  for (let i = 0; i < F.pool; i++) {
    if (!f.active[i]) continue;
    f.life[i] -= dt;
    if (f.life[i] <= 0) { f.active[i] = 0; continue; }
    f.y[i] += F.rise * dt;
    f.x[i] += Math.sin(f.y[i] * F.wiggle[0] + i) * F.wiggle[1] * dt;
    const k = f.size[i] * Math.min(1, f.life[i] * F.popRate);
    f.m.makeScale(k, k, k).setPosition(f.x[i], f.y[i], f.z[i]);
    f.mesh.setMatrixAt(n++, f.m);
  }
  f.mesh.count = n;
  f.mesh.instanceMatrix.needsUpdate = true;
}

function makeTrail(ctx, sh) {
  const { THREE } = ctx, R = ctx.S.look.ribbon;
  const mat = new THREE.MeshBasicNodeMaterial({ color: R.color, transparent: true, opacity: R.fadeOpacity, depthWrite: false });
  const mesh = new THREE.InstancedMesh(sh.blobGeo, mat, R.max);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.position.y = R.y; mesh.frustumCulled = false; mesh.count = 0;
  const tr = {
    mesh, mat, R, sh, Fu: ctx.S.look.fumes, m: new THREE.Matrix4(),
    n: 0, x: new Float32Array(R.max), z: new Float32Array(R.max), age: new Float32Array(R.max),
    hw: 0, seen: -Infinity, seenAt: 0, t: 0, last: null, world: null,
  };
  mesh.onBeforeRender = () => drawTrail(tr);
  ctx.scene.add(mesh);
  sh.trails.push(tr);
  return tr;
}

// A cube of a new run is being drawn: what the last run poured is gone, as
// 1.x's clearFX swept its ribbons and its bubble pool at startGame
// (main.js:7167, 7171).
function newRun(sh, w) {
  sh.world = w;
  for (const tr of sh.trails) if (tr.world !== w) { tr.n = 0; tr.mesh.count = 0; }
  const f = sh.fumes;
  f.active.fill(0); f.mesh.count = 0;
}

// 1.x SludgeRibbon.update (main.js:1630-1671)
function drawTrail(tr) {
  const R = tr.R, sh = tr.sh, now = tick(sh), dt = tr.last == null ? 0 : now - tr.last;
  tr.last = now;
  tr.t += dt;                                     // the ribbon's own clock
  if (!tr.n) { tr.mesh.count = 0; return; }
  const alive = tr.seen === sh.wall.value;        // its body's view was updated this frame
  if (alive) tr.mat.opacity = R.pulse[0] + R.pulse[1] * Math.abs(Math.sin(tr.t * R.pulse[2]));
  else {
    const k = 1 - (now - tr.seenAt) / R.fade;
    if (k <= 0) { tr.n = 0; tr.mesh.count = 0; return; }
    tr.mat.opacity = R.fadeOpacity * k;
  }
  for (let i = 0; i < tr.n; i++) {
    const age = alive ? tr.age[i] : R.deadAge;
    const r = tr.hw * (R.base + R.amp * Math.sin(i * R.perIndex + tr.t * R.rate)) * (1 - age * R.dry);
    tr.m.makeScale(r, r * R.flat, r).setPosition(tr.x[i], 0, tr.z[i]);
    tr.mesh.setMatrixAt(i, tr.m);
  }
  tr.mesh.count = tr.n;
  tr.mesh.instanceMatrix.needsUpdate = true;
  // fumes off a live trail (1.x main.js:1665-1669)
  const Fu = tr.Fu;
  if (alive && tr.n >= Fu.minPoints && Math.random() < dt * Fu.rate) {
    const i = Math.floor(Math.random() * tr.n);
    spawnFume(sh.fumes, tr.x[i] + (Math.random() - 0.5) * tr.hw, tr.z[i] + (Math.random() - 0.5) * tr.hw);
  }
}

export default {
  build(ctx) {
    const { THREE } = ctx, sh = sharedFor(ctx);
    const mat = ctx.gelMaterial(ctx.S.color, 'cube', 1);
    // the core drives every gel's hit ripple and death tear through mat.gel;
    // 1.x never rippled or tore a cube, so it writes to these
    const gel = mat.gel;
    mat.gel = { ...gel, hit: { value: 0 }, hitDir: { value: new THREE.Vector2() }, tear: { value: 0 } };
    // body (cancels the squash group mid-tumble) → tip (the centre: lift,
    // rotation, size) → the unit cube, centred on the tip
    const cube = new THREE.Mesh(sh.cubeGeo, mat);
    const tip = new THREE.Group(); tip.add(cube);
    const body = new THREE.Group(); body.add(tip);
    const st = { seen: -Infinity, dead: false, flop: false, L: 0, gelTime: ctx.GEL_TIME };
    // 1.x destroy() (enemy.js:3013-3026): its squash spring zeroed and its
    // scale made uniform, so a resting cube pops from its plain rest pose
    // (centre L up) and a tumbling one snaps flat where it is in the air
    cube.onBeforeRender = () => {
      if (st.dead || st.seen === ctx.GEL_TIME.value || !st.squash) return;
      st.dead = true;
      tip.quaternion.identity();
      tip.scale.setScalar(st.r);
      if (!st.flop) tip.position.y = st.L;
      body.scale.set(1 / st.squash.scale.x, 1 / st.squash.scale.y, 1 / st.squash.scale.z);
    };
    return {
      body, mat, gel, own: true, tip, cube, st, axis: new THREE.Vector3(),
      trails: [makeTrail(ctx, sh), makeTrail(ctx, sh)], cur: 0, sh,
    };
  },

  update(v, g, w, time, grow) {
    const S = v.S, F = S.flop, L0 = v.S.look, st = v.st, s = g.s;
    st.seen = st.gelTime.value; st.dead = false; st.squash = v.squash;
    const r = g.r * grow, L = F.halfEdge * r, tip = v.tip;
    st.r = r; st.L = L; st.flop = s.flop;
    if (s.flop) {
      // the tumble: the angle from how far along the stride the view has the
      // body (disp = L + D·cos ang), so the pivot edge stays put between steps
      const D = L * Math.SQRT2;
      const along = (v.root.position.x - s.x0) * s.dx + (v.root.position.z - s.z0) * s.dz;
      const c = Math.max(-1, Math.min(1, (Math.max(0, Math.min(2 * L, along)) - L) / D));
      const ang = Math.acos(c), a0 = F.arcStartDeg * DEG, a1 = F.arcEndDeg * DEG;
      const p = Math.max(0, Math.min(1, (a0 - ang) / (a0 - a1)));
      v.axis.set(s.dz, 0, -s.dx);
      tip.quaternion.setFromAxisAngle(v.axis, p * Math.PI / 2);
      tip.position.y = D * Math.sin(ang);
      tip.scale.setScalar(r);
      // no squash mid-tumble (1.x enemy.js:2739-2740): divide the spring out
      const q = v.squash.scale;
      v.body.scale.set(1 / q.x, 1 / q.y, 1 / q.z);
    } else {
      // at rest: the breath, on the squash spring (anchored on the floor)
      const b = L0.breatheAmp * Math.sin(time * L0.breatheHz + v.phase), across = 1 - b * L0.breatheXZ;
      tip.quaternion.identity();
      tip.position.y = L * (1 + b);
      tip.scale.set(r * across, r * (1 + b), r * across);
      v.body.scale.set(1, 1, 1);
    }

    // the trail: copy the sim's points, aged on its clock
    if (w && v.sh.world !== w) newRun(v.sh, w);
    const now = tick(v.sh, w);
    const tr = v.trails[v.cur], pts = s.trail, R = L0.ribbon, n = Math.min(pts.length, R.max);
    tr.world = w;
    for (let i = 0; i < n; i++) {
      tr.x[i] = pts[i].x; tr.z[i] = pts[i].z;
      tr.age[i] = Math.max(0, Math.min(1, (g.t - pts[i].t) / S.trail.expire));
    }
    tr.n = n;
    tr.hw = R.width * g.r;
    tr.seen = st.gelTime.value; tr.seenAt = now;
  },

  // A pooled view taken for a new cube: its last trail may still be fading,
  // so the new cube pours into the other one (the older of the two), whose
  // ribbon clock starts again as a new 1.x ribbon's did.
  reset(v) {
    const [a, b] = v.trails;
    v.cur = a.seen <= b.seen ? 0 : 1;
    const tr = v.trails[v.cur];
    tr.n = 0; tr.seen = -Infinity; tr.t = 0; tr.mesh.count = 0;
    v.st.seen = -Infinity; v.st.dead = false; v.st.flop = false;
    v.tip.quaternion.identity(); v.body.scale.set(1, 1, 1);
  },
};

// three's RoundedBoxGeometry (examples/jsm/geometries, MIT), centred, without
// UVs: a box of 2·segments + 1 per side whose vertices are pushed out from
// the inner box along their own normals, so the corners round off smoothly.
function roundedBox(THREE, size, radius, segments) {
  const n = segments * 2 + 1, half = 0.5 / n;
  radius = Math.min(size / 2, radius);
  const inner = size / 2 - radius;
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
