// warden.js — how WARDEN looks: 1.x's plain teal satin gel dome (a 1.x
// BLOB_TYPE with the default silhouette, so the core shapes the body: the
// squash spring, the breath, the smear it drags along the floor) plus the two
// things that make it the shield-bearer:
//
// THE AURA RING (v124, enemy.js:1118-1131, 1762-1765, 3008): a flat cyan ring
// on the floor, RingGeometry(aura − 0.18, aura, 48), additive, depthWrite off,
// DoubleSide, at y 0.06, following the body, its opacity breathing
// 0.30 + 0.13·sin(3.1·clock + phase). Its outer edge IS the rule's radius
// (1.x shared WARDEN_AURA between the two "so the read and the rule can't
// drift"), it does not grow with an elite (the aura does not), and it goes
// out the instant the WARDEN dies — the shield drops with it. A dying view is
// no longer updated, so the ring blanks itself in onBeforeRender while the
// gel's death thrash (tear) runs, which is exactly while the body is dying.
// It does not swell in with the body: the shield is up from the WARDEN's
// first step, as 1.x's was (alive from its constructor, which built the ring
// lit, enemy.js:662, 1124-1131), and the ring rides the root, which the view's
// swell (TUNING.gel.swell) does not scale, so the tell is lit and full-size
// through it — dark only while the core holds a body inert (state 'appear', a
// brood's wait, which no WARDEN has: such a body has not stepped, and the sim
// raises no shield for it).
//
// THE DEFLECTION (main.js:10709-10717): a shot the aura eats throws three
// cyan droplets back along the hit, from the bullet at the shielded body's
// mid-height + 0.15, on 1.x's goo chunk physics (main.js:1349-1388). The
// block happens on ANOTHER body, in the core's bullet test, so the sim has no
// count of it to hand this look: the look reads the core's `block` events off
// the world, once per sim step (catchBlocks). The droplets are shared by every
// WARDEN in the scene and live in the scene itself, flying on the gel clock
// and reading the world from their own onBeforeRender, so they fly on — and a
// WARDEN killed in the very step its aura blocked still throws them — after
// the WARDEN that made them is dead (1.x's goo pool was global).
// Contract gap: a look sees only the LAST step's events (main.js hands each
// step's events to actors.onEvent, which has no look hook), so on a frame
// that ran two or more sim steps the earlier steps' blocks throw nothing.
//
// Numbers: js/tuning/species/warden.js. Contract: docs/SIM_CONTRACT.md.

const SPARKS = new WeakMap();      // scene → the WARDENs' shared droplets

export default {
  build(ctx) {
    const { THREE, S, geo } = ctx, R = S.ring;
    const mat = ctx.gelMaterial(S.color, 'blob', 1);
    const body = new THREE.Mesh(geo.blob, mat);

    const ringMat = new THREE.MeshBasicNodeMaterial({
      color: R.color, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(S.aura - R.width, S.aura, R.segments), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = R.y;
    // the shield drops with the WARDEN (enemy.js:3008)
    ring.onBeforeRender = () => { if (mat.gel && mat.gel.tear.value > 0) ringMat.opacity = 0; };

    return { body, mat, ring, ringMat, sparks: sparksFor(ctx) };
  },

  update(v, g, w, time) {
    const R = v.S.ring;
    if (v.ring.parent !== v.root) v.root.add(v.ring);
    // lit from the first step, swell or no swell (enemy.js:1124-1131, 1764)
    v.ringMat.opacity = g.state === 'active' ? R.base + R.amp * Math.sin(time * R.hz + v.phase) : 0;
    if (w) v.sparks.world = w;
    v.sparks.frame(time);
  },
};

// ── the deflection droplets ─────────────────────────────────────────
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
    K, T, S, kind: ctx.kind || 'warden', mesh, m4: new THREE.Matrix4(), last: -1, world: null, seenW: null, seenTick: -1,
    drops: Array.from({ length: K.pool }, () => ({ live: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, sq: 1, sqV: 0 })),
    // a frame: fly what is in the air up to `now`, then throw what the last
    // sim step's shielded shots threw. Idempotent at one `now` and one step.
    frame(now) { fly(m, now); if (m.world) catchBlocks(m, m.world); draw(m); },
  };
  // the world the WARDENs last showed it, read even when none is left alive
  mesh.onBeforeRender = () => m.frame(GEL_TIME.value);
  ctx.scene.add(mesh);
  SPARKS.set(ctx.scene, m);
  return m;
}

// the core's `block` events of the step just run, once per step. A block is
// the aura's when the body it landed on is under one now (g.shield), or a
// WARDEN died this step with that body inside its aura (the shield dropped
// after it blocked) — never a BULWARK plate's, which 1.x tested first and
// which threw its own sparks (main.js:10683-10700). The body may have died
// later in the step itself; its kill event says where it was.
function catchBlocks(m, w) {
  if (m.seenW === w && m.seenTick === w.tick) return;
  m.seenW = w; m.seenTick = w.tick;
  const ev = w.events;
  for (const e of ev) {
    if (e.type !== 'block') continue;
    if (ev.some((p) => p.type === 'plate' && p.id === e.id && p.x === e.x && p.z === e.z)) continue;
    const g = w.gels.find((o) => o.id === e.id) ?? ev.find((k) => k.type === 'kill' && k.id === e.id);
    if (!g || g.kind === m.kind) continue;
    if (g.shield || ev.some((k) => k.type === 'kill' && k.kind === m.kind && Math.hypot(k.x - g.x, k.z - g.z) < m.S.aura)) throwDrops(m, g, e.x, e.z);
  }
}

// 1.x main.js:10714-10717: from the bullet, back along the hit
function throwDrops(m, g, x, z) {
  const K = m.K, base = Math.atan2(z - g.z, x - g.x), y = fxY(m, g) + K.lift;
  for (let i = 0; i < K.count; i++) {
    let s = m.drops.find((q) => !q.live);
    if (!s) s = m.drops.reduce((a, q) => (q.life < a.life ? q : a));          // full: the one with least life left
    const a = base + (Math.random() - 0.5) * K.spread;
    Object.assign(s, { live: true, x, y, z,
      vx: Math.cos(a) * K.speed, vy: K.up[0] + Math.random() * (K.up[1] - K.up[0]), vz: Math.sin(a) * K.speed,
      life: K.life, sq: 1, sqV: 0 });
  }
}

// 1.x's e.fxY, by 1.x's own sets: a blob's radius, a cube's rest height,
// any other body's own y
function fxY(m, g) {
  const K = m.K;
  if (K.fxYAt[g.kind] != null) return K.fxYAt[g.kind];
  if (K.fxRadius.includes(g.kind)) return g.r;
  if (K.fxCube.includes(g.kind)) return K.cubeFxY * g.r;
  return m.T.species[g.kind].radius;
}

// 1.x ChunkPool.update (main.js:1366-1388), on the frame clock
function fly(m, now) {
  const K = m.K, dt = m.last < 0 ? 0 : Math.min(0.1, Math.max(0, now - m.last));
  m.last = now;
  if (dt <= 0) return;
  const k = Math.min(3, dt * 60);
  for (const s of m.drops) {
    if (!s.live) continue;
    if ((s.life -= dt) <= 0) { s.live = false; continue; }
    s.vy -= K.gravity * dt;
    s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
    if (s.y <= K.floorAt && s.vy < 0) {
      s.y = 0; s.sqV -= Math.abs(s.vy) * K.landSquash;
      s.vy = 0; s.vx *= K.floorKeep; s.vz *= K.floorKeep;
    }
    s.sqV = (s.sqV - (s.sq - 1) * K.spring * k) * Math.pow(K.damp, k);
    s.sq = Math.max(K.sqMin, Math.min(K.sqMax, s.sq + s.sqV * k));
  }
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
