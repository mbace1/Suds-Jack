// bulwark.js — how BULWARK looks: 1.x's plain steel-blue gel dome (it is a
// 1.x BLOB_TYPE with the default silhouette, so the core shapes the body:
// the squash spring, the breath, the smear it drags) plus its two own things:
//
// THE PLATE (v140, enemy.js:1149-1158, 1807-1815, 3010): a pale steel slab,
// BoxGeometry(1.7, 1.15, 0.16), unlit (1.x MeshBasicMaterial) and
// translucent, hovering at radius × the elite's 1.2 + 0.25 out along the
// facing, 0.6 off the floor, squared up to it (rotation.y = atan2(fx, fz)),
// its opacity glinting 0.75 + 0.2·|sin(2.2·t)|. The facing is the one the sim
// keeps in g.faceX / g.faceZ, the same facing the block reads, so the plate
// IS the tell of the arc that stops your shots. Like 1.x's it is a separate
// object: it does not squash with the body and does not grow with an elite —
// only its distance does. It goes the frame the bulwark dies (enemy.js:3010):
// a dying view is no longer updated, so the plate is discarded (no colour, no
// depth) while the gel's death thrash (tear) runs, which is exactly while
// the body is dying.
// It swells in with the body over the view's swell (new in 2.0, TUNING.gel.swell).
//
// THE SPARKS (main.js:10694-10698): a shot the plate shrugs off throws three
// steel droplets back along the hit, from the bullet at the body's mid-height
// + 0.15, on 1.x's goo chunk physics (main.js:1349-1394). 1.x's goo pool was
// global, so the droplets fly on after the bulwark is dead: they live in the
// scene, shared by every BULWARK there, flying on the gel clock and drawn from
// their own onBeforeRender. Each body's blocks come from the sim's log
// (g.s.log, numbered by g.s.blocks), so a frame that ran several sim steps
// throws every one, each already as far into its flight as the run time
// since its block (1.x threw them the frame the shot landed). A body dead
// by the time a frame looks is no longer in the world, so the scene keeps
// every BULWARK a frame has shown until it dies and then throws the rest of
// its log — a block in one step and the killing shot in a later step of the
// same frame keep their sparks. One no frame ever showed (killed the step it
// could first be hit) is caught from that step's `plate` event, which says
// where the body stood.
//
// Numbers: js/tuning/species/bulwark.js. Contract: docs/SIM_CONTRACT.md.

const SPARKS = new WeakMap();      // scene → the BULWARKs' shared droplets

export default {
  build(ctx) {
    const { THREE, TSL, S, geo } = ctx, P = S.plate;
    const mat = ctx.gelMaterial(S.color, 'blob', 1);
    const body = new THREE.Mesh(geo.blob, mat);

    // the plate: unlit, translucent, its opacity the glint; gone while the
    // gel's death thrash (tear) runs. step(tear, 0) is 1 only while tear is
    // exactly 0 (actors.js zeroes it on every reuse and sets it only on the
    // dying), so no threshold lets the plate back for a frame as the thrash
    // runs out; and a zero-opacity fragment is discarded (alphaTest at 0), so
    // the dead plate writes no depth either: 1.x's `visible = false`
    const glint = TSL.uniform(P.glintBase + P.glintAmp);
    const plateMat = new THREE.MeshBasicNodeMaterial({ color: P.color, transparent: true });
    plateMat.opacityNode = glint.mul(TSL.step(mat.gel.tear, TSL.float(0)));
    plateMat.alphaTestNode = TSL.float(0);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(P.size[0], P.size[1], P.size[2]), plateMat);

    return { body, mat, plate, plateMat, glint, sparks: sparksFor(ctx) };
  },

  update(v, g, w, time, grow) {
    const P = v.S.plate;
    if (v.plate.parent !== v.root) v.root.add(v.plate);

    // the plate rides the facing at radius + gap, squared up to it
    const d = (g.r + P.gap) * grow;
    v.plate.position.set(g.faceX * d, P.y * grow, g.faceZ * d);
    v.plate.rotation.set(0, Math.atan2(g.faceX, g.faceZ), 0);
    v.plate.scale.setScalar(grow);
    v.glint.value = P.glintBase + P.glintAmp * Math.abs(Math.sin(P.glintHz * (time + v.phase)));

    // the sparks: fly what is in the air up to now, throw this body's new
    // blocks, then whatever the dead blocked
    const m = v.sparks;
    if (w) { m.world = w; m.bodies.set(g, w); }
    fly(m, time);
    fromLog(m, g);
    m.frame(time);
  },
};

// ── the steel sparks ────────────────────────────────────────────────
function sparksFor(ctx) {
  let m = SPARKS.get(ctx.scene);
  if (m) return m;
  const { THREE, S, T, GEL_TIME } = ctx, K = S.spark, M = T.material;
  const mat = new THREE.MeshPhysicalNodeMaterial({
    color: K.color, roughness: M.roughness, clearcoat: M.clearcoat, clearcoatRoughness: M.clearcoatRoughness, sheen: M.sheen,
  });
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 9, 7), mat, K.pool);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0; mesh.frustumCulled = false;
  m = {
    K, mesh, m4: new THREE.Matrix4(), last: -1, world: null, seenW: null, seenTick: -1, frameDt: T.sim.dt,
    seen: new WeakMap(),     // body → the last of its blocks thrown
    bodies: new Map(),       // body → its world: every BULWARK a frame has shown, until it dies
    drops: Array.from({ length: K.pool }, () => ({ live: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, sq: 1, sqV: 0 })),
    // a frame: fly what is in the air up to `now`, then throw what the dead
    // blocked. Idempotent at one `now` and one step.
    frame(now) { fly(m, now); if (m.world) { fromEvents(m, m.world); fromDead(m, m.world); } draw(m); },
  };
  // the world the BULWARKs last showed it, read even when none is left alive
  mesh.onBeforeRender = () => m.frame(GEL_TIME.value);
  ctx.scene.add(mesh);
  SPARKS.set(ctx.scene, m);
  return m;
}

// a body's blocks it has not thrown yet, oldest first
function fromLog(m, g) {
  const log = g.s?.log, n = g.s?.blocks || 0, seen = m.seen.get(g) || 0;
  if (!log || n <= seen) return;
  for (let k = Math.max(seen + 1, n - log.length + 1); k <= n; k++) {
    const e = log[(k - 1) % log.length];
    if (e.n === k) throwDrops(m, e.gx, e.gz, g.r, e.x, e.z, age(m, e.t));
  }
  m.seen.set(g, n);
}

// the bodies a frame has shown that have died since: the rest of their log.
// A frame can run several sim steps (main.js catches up to TUNING.sim.maxSteps)
// and the world's events are only the last step's, so a plate block in one
// step and the killing shot in a later one would otherwise lose the sparks.
// A body from another world (a new run) is dropped without throwing.
function fromDead(m, w) {
  for (const [g, gw] of m.bodies) {
    if (gw !== w) { m.bodies.delete(g); continue; }
    if (g.alive) continue;
    fromLog(m, g);
    m.bodies.delete(g);
  }
}

// the `plate` events of the step just run, once per step, for a body killed
// in that step that no frame ever showed (a living body, or one a frame has
// shown, throws from its log)
function fromEvents(m, w) {
  if (m.seenW === w && m.seenTick === w.tick) return;
  m.seenW = w; m.seenTick = w.tick;
  for (const e of w.events) {
    if (e.type !== 'plate' || w.gels.some((o) => o.id === e.id && o.alive)) continue;
    let shown = false;
    for (const [g, gw] of m.bodies) if (gw === w && g.id === e.id && !g.alive) { shown = true; break; }
    if (!shown) throwDrops(m, e.gx, e.gz, e.r, e.x, e.z, age(m, e.t));
  }
}

// how long ago, in run time, a block happened (0 for one of the step just run)
const age = (m, t) => Math.max(0, (m.world?.time ?? t) - t);

// 1.x main.js:10695-10698: from the bullet, back along the hit (body → bullet);
// a block `ago` seconds back flies that long first, a 60 Hz frame at a time
function throwDrops(m, gx, gz, r, x, z, ago = 0) {
  const K = m.K, base = Math.atan2(z - gz, x - gx), y = r + K.lift;
  if (ago >= K.life) return;
  for (let i = 0; i < K.count; i++) {
    let s = m.drops.find((q) => !q.live);
    if (!s) s = m.drops.reduce((a, q) => (q.life < a.life ? q : a));          // full: the one with least life left
    const a = base + (Math.random() - 0.5) * K.spread;
    Object.assign(s, { live: true, x, y, z,
      vx: Math.cos(a) * K.speed, vy: K.up[0] + Math.random() * (K.up[1] - K.up[0]), vz: Math.sin(a) * K.speed,
      life: K.life, sq: 1, sqV: 0 });
    for (let t = ago; t > 1e-9 && s.live; t -= m.frameDt) flyDrop(K, s, Math.min(m.frameDt, t));
  }
}

// 1.x ChunkPool.update (main.js:1366-1388), on the frame clock
function fly(m, now) {
  const K = m.K, dt = m.last < 0 ? 0 : Math.min(0.1, Math.max(0, now - m.last));
  m.last = now;
  if (dt <= 0) return;
  for (const s of m.drops) if (s.live) flyDrop(K, s, dt);
}

// one droplet, dt seconds: gravity, the floor, the squash spring (its
// per-frame constants scaled to dt in 60 Hz frames)
function flyDrop(K, s, dt) {
  if ((s.life -= dt) <= 0) { s.live = false; return; }
  const k = Math.min(3, dt * 60);
  s.vy -= K.gravity * dt;
  s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
  if (s.y <= K.floorAt && s.vy < 0) {
    s.y = 0; s.sqV -= Math.abs(s.vy) * K.landSquash;
    s.vy = 0; s.vx *= K.floorKeep; s.vz *= K.floorKeep;
  }
  s.sqV = (s.sqV - (s.sq - 1) * K.spring * k) * Math.pow(K.damp, k);
  s.sq = Math.max(K.sqMin, Math.min(K.sqMax, s.sq + s.sqV * k));
}

function draw(m) {
  const K = m.K;
  let c = 0;
  for (const s of m.drops) {
    if (!s.live) continue;
    const f = K.size * Math.min(1, s.life / K.shrink), sx = f / Math.sqrt(Math.max(s.sq, K.sxFloor));
    m.m4.makeScale(sx, s.sq * f, sx).setPosition(s.x, s.y, s.z);
    m.mesh.setMatrixAt(c++, m.m4);
  }
  m.mesh.count = c;
  m.mesh.instanceMatrix.needsUpdate = true;
}
