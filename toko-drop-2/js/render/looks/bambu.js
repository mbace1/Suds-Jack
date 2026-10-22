// bambu.js — how BAMBU looks: 1.x's bamboo tower (enemy.js:865-933,
// 1584-1601, 2537-2560, 2811-2868, 3013-3079), not a gel dome.
//
//   the stalk   up to three segments, each a 14-sided cylinder flaring wider
//               toward its top and capped by a node lip, all in ONE satin gel
//               material of 1.x's `bambu` family (roughness 0.20,
//               transmission 0.10, uWobble 0.35, uRadius 0.7), so the hit
//               flash and the death glow take the whole stalk. 1.x writes the
//               hit ripple and the death tear for BLOBS only (enemy.js:1612,
//               2704-2709, 2986-2989): a stalk takes a bullet as a flash and a
//               pop, so the core's writes land on stand-in uniforms and the
//               real ones stay at rest. It rises out of the floor (scale.y
//               0.01 → 1 over 0.6 s), then breathes, and strains while the
//               shot climbs: 14% shorter and 7% fatter at the launch, then it
//               snaps back. No squash spring.
//   the orb     the charge, an additive gold sphere climbing the stalk
//               through the telegraph and growing as it goes; it is in the
//               stalk, so it breathes and strains with it
//   the ring    where the lob will land, flat on the floor, flashing on the
//               lob's own clock: slowly through the telegraph, faster in
//               flight. It is the whole tell — the damage is exactly there
//   the pops    a lost segment comes off the top and three tan goo chunks
//               fly from where it was. They are the floor's, not the
//               stalk's: one pool in the scene, so the killing shot's chunks
//               fly on after the stalk has gone (1.x drained them into its
//               one goo pool, main.js:10522-10527)
//   the kill    1.x destroy(): the breath and strain drop back to scale 1
//               (enemy.js:3024-3027) and what is left of the stalk swells and
//               goes; a shot kill has popped the last segment, so nothing is
//               left of it but its chunks (and the orb, if it was climbing:
//               1.x hid only the ring and the blob, enemy.js:3079)
// The blob in flight is the core's lob (api.fire.lob). Segments come and go
// with the sim's count (g.s.segs) — they grow back.
//
// The ring stands in the world, not on the stalk: it hangs off the view's
// root (placed at the body), offset to its world spot, so it goes with the
// view when it is pooled, and hides while a killed view plays out its last
// 0.28 s. No look hook runs while a view dies, so the stalk notices it as it
// is drawn (the core has started the view's dying timer).
let GEO = null;            // the segments, the orb and the ring, shared by every view
let POOL = null;           // the popped chunks, one pool per scene

function geometries(THREE, S) {
  if (GEO) return GEO;
  const L = S.look, segs = [];
  for (let i = 0; i < S.segments; i++) {
    const botR = L.flareBottom + i * L.flareBottomStep, topR = L.flareTop + i * L.flareTopStep;
    segs.push({
      cyl: new THREE.CylinderGeometry(topR, botR, S.segHeight, L.sides),
      lip: new THREE.CylinderGeometry(topR * L.lipScale, topR * L.lipScale, L.lipHeight, L.sides),
    });
  }
  GEO = {
    segs,
    orb: new THREE.SphereGeometry(L.orb.r, L.orb.wSeg, L.orb.hSeg),
    ring: new THREE.RingGeometry(S.ring.inner, S.ring.outer, L.ringSegs),
  };
  return GEO;
}

export default {
  build(ctx) {
    const { THREE, S } = ctx, L = S.look, G = geometries(THREE, S);
    const mat = ctx.gelMaterial(S.color, 'bambu', S.radius, { wobble: L.wobble });
    mat.roughness = L.roughness; mat.transmission = L.transmission;
    const gel = mat.gel;
    mat.gel = { ...gel, hit: { value: 0 }, hitDir: { value: new THREE.Vector2() }, tear: { value: 0 } };

    // the stalk: a group per segment, its base at 0.6 i (1.x _makeBambuSeg)
    const body = new THREE.Group(), segs = [];
    for (let i = 0; i < S.segments; i++) {
      const seg = new THREE.Group();
      seg.position.y = i * S.segHeight;
      const cyl = new THREE.Mesh(G.segs[i].cyl, mat);
      cyl.position.y = S.segHeight / 2;
      const lip = new THREE.Mesh(G.segs[i].lip, mat);
      lip.position.y = S.segHeight;
      seg.add(cyl, lip);
      body.add(seg);
      segs.push(seg);
    }
    const base = THREE.Object3D.prototype.updateMatrixWorld;
    body.updateMatrixWorld = function (force) { dying(this.userData.view); base.call(this, force); };

    const orb = new THREE.Mesh(G.orb, new THREE.MeshBasicNodeMaterial({
      color: S.bulletColor, transparent: true, opacity: L.orb.opacity, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    orb.visible = false;
    body.add(orb);

    // what stands in the world: the landing ring
    const fx = new THREE.Group();
    const ringMat = new THREE.MeshBasicNodeMaterial({
      color: S.bulletColor, transparent: true, opacity: L.ringOpacity0, side: THREE.DoubleSide, depthWrite: false,
    });
    const ring = new THREE.Mesh(G.ring, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    fx.add(ring);

    return { body, mat, own: true, gel, segs, orb, fx, ring, ringMat, pool: chunkPool(ctx), g: null, lastPops: null };
  },

  update(v, g, w, time) {
    const S = v.S, L = S.look, s = g.s;
    v.g = g; v.body.userData.view = v;
    if (v.fx.parent !== v.root) v.root.add(v.fx);

    // the stalk: the segments the sim has
    for (let i = 0; i < v.segs.length; i++) v.segs[i].visible = i < s.segs;
    if (s.emergeT > 0) {
      // rising out of the floor: only its height moves (1.x enemy.js:2538-2540)
      v.body.scale.set(1, Math.max(L.emergeFloor, Math.min(1, 1 - s.emergeT / S.emerge)), 1);
    } else {
      const br = L.breatheAmp * Math.sin(time * L.breatheRate + v.phase);
      const st = s.strain * L.strain;
      const xz = 1 - br * L.breatheXZ + st * L.strainXZ;
      v.body.scale.set(xz, 1 + br - st, xz);
    }

    // the charge orb climbs through the telegraph (shown from its first tick, as 1.x's was)
    const tele = s.state === 'telegraphing';
    v.orb.visible = tele && s.lobT > 0;
    if (v.orb.visible) {
      const p = Math.max(0, Math.min(1, 1 - s.timer / S.lobTelegraph));
      v.orb.position.y = p * s.segs * S.segHeight;
      v.orb.scale.setScalar(L.orb.scale0 + L.orb.scaleGain * p);
    }

    // the landing ring, at its world spot, flashing on the lob's clock from
    // the telegraph's first tick (its first frame shows it as it was)
    const live = tele || s.state === 'lobbing';
    v.ring.visible = live;
    if (live) {
      v.ring.position.set(s.tx - v.root.position.x, L.ringY, s.tz - v.root.position.z);
      if (s.lobT > 0) {
        const [rate, [on, off]] = tele ? [L.telegraphFlashRate, L.telegraphOpacity] : [L.flightFlashRate, L.flightOpacity];
        v.ringMat.opacity = Math.sin(s.lobT * rate) > 0 ? on : off;
      }
    }

    // the chunks in flight move on (a pause stops them: this is the sim's
    // clock), then a segment lost since the last frame throws three more
    tickPool(v.pool, w.over ? null : w, time);
    throwPops(v, g);
  },

  reset(v) {
    v.ring.visible = false; v.orb.visible = false; v.fx.visible = true;
    v.ringMat.opacity = v.S.look.ringOpacity0;
    v.g = null; v.lastPops = null;
  },
};

// The kill, as the stalk is drawn: 1.x destroy() sets the group's scale back
// to 1 before the pop swells it (enemy.js:3024-3027), the segments are the
// ones it died with, the ring goes, and the killing pop throws its chunks.
function dying(v) {
  if (!v) return;
  const dead = v.dyingT > 0;
  v.fx.visible = !dead;
  if (!dead || !v.g) return;
  v.body.scale.set(1, 1, 1);
  for (let i = 0; i < v.segs.length; i++) v.segs[i].visible = i < v.g.s.segs;
  throwPops(v, v.g);
}

// Three chunks for every segment lost since this view last looked, from
// where each one stood (the sim remembers the last few), at the body's spot
// (1.x enemy.js:1627-1638).
function throwPops(v, g) {
  const s = g.s, L = v.S.look, n = s.popLog.length;
  if (v.lastPops == null) v.lastPops = s.pops;
  if (s.pops - v.lastPops > n) v.lastPops = s.pops - n;
  for (; v.lastPops < s.pops; v.lastPops++) {
    const y = s.popLog[v.lastPops % n];
    for (let k = 0; k < L.popChunks; k++) {
      const a = Math.random() * Math.PI * 2;
      spawnChunk(v.pool, g.x, y, g.z, Math.cos(a) * L.popSpeed, L.popUp[0] + Math.random() * (L.popUp[1] - L.popUp[0]), Math.sin(a) * L.popSpeed);
    }
  }
}

// ── the chunk pool ─────────────────────────────────────────────────
// 1.x's gooChunkPool (main.js:1284-1392): smooth 9 × 7 droplets in the
// core's goo, every slot drawn and the idle ones at scale 0, a full pool
// reusing the chunk with least life. Its clock: the sim's while a stalk is
// drawn (update passes the world), the frame clock once none is (or the run
// is over), so the last chunks still finish when their stalk has gone.
function chunkPool(ctx) {
  if (POOL && POOL.scene === ctx.scene) return POOL;
  const { THREE, S, T } = ctx, L = S.look, M = T.material;
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, L.popGeo[0], L.popGeo[1]),
    new THREE.MeshPhysicalNodeMaterial({ color: L.popColor, roughness: M.roughness, clearcoat: M.clearcoat, clearcoatRoughness: M.clearcoatRoughness, sheen: M.sheen }),
    L.popPool);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  const P = { scene: ctx.scene, mesh, chunks: [], L, D: T.death, step: T.sim.dt, clock: ctx.GEL_TIME, world: null, simT: 0, frame: null,
    m: new THREE.Matrix4(), p: new THREE.Vector3(), q: new THREE.Quaternion(), s: new THREE.Vector3() };
  draw(P);
  mesh.onBeforeRender = () => tickPool(P, null, P.clock.value);
  ctx.scene?.add(mesh);
  return (POOL = P);
}

function spawnChunk(P, x, y, z, vx, vy, vz) {
  if (P.chunks.length >= P.L.popPool) P.chunks.shift();   // every chunk lives 1.4 s: the oldest has least left
  P.chunks.push({ x, y, z, vx, vy, vz, life: P.D.chunkLife, sq: 1, sqV: 0 });
  draw(P);
}

// Once a frame, however many stalks or passes ask: the sim's time since the
// last tick when given the world, else the frame clock held to 1.x's 0.05 s.
// The chunks then step in 1/60 s slices, so 1.x's per-frame springs are its
// own whatever the frame rate.
function tickPool(P, w, now) {
  if (P.frame === now) return;
  let dt;
  if (w) { dt = P.world === w ? w.time - P.simT : 0; P.world = w; }
  else dt = P.frame == null ? 0 : Math.min(P.L.frameDtCap, Math.max(0, now - P.frame));
  if (P.world) P.simT = P.world.time;
  P.frame = now;
  if (!P.chunks.length) return;
  for (dt = Math.min(dt, P.D.chunkLife); dt > 1e-9 && P.chunks.length; dt -= P.step) stepChunks(P, Math.min(P.step, dt));
  draw(P);
}

// 1.x's chunk physics (main.js:1366-1392), one slice: gravity, a landing that
// squashes and skids (and lands again every frame it sits, as 1.x's did),
// the per-frame spring, and the life running out
function stepChunks(P, h) {
  const L = P.L, D = P.D, Q = L.popSquash, k = h / P.step;
  for (let i = P.chunks.length - 1; i >= 0; i--) {
    const c = P.chunks[i];
    if ((c.life -= h) <= 0) { P.chunks.splice(i, 1); continue; }
    c.vy -= D.gravity * h;
    c.x += c.vx * h; c.y += c.vy * h; c.z += c.vz * h;
    if (c.y <= L.popFloor && c.vy < 0) {
      c.y = 0; c.sqV -= Math.abs(c.vy) * Q.land;
      c.vy = 0; c.vx *= D.floorKeep; c.vz *= D.floorKeep;
    }
    c.sqV = (c.sqV - (c.sq - 1) * Q.spring * k) * Math.pow(Q.damp, k);
    c.sq = Math.max(Q.min, Math.min(Q.max, c.sq + c.sqV * k));
  }
}

// the shrink over the last 0.3 s stands in for a fade (1.x main.js:1386-1390)
function draw(P) {
  const L = P.L, D = P.D, mesh = P.mesh;
  for (let i = 0; i < L.popPool; i++) {
    const c = P.chunks[i];
    if (c) {
      const f = L.popSize * Math.min(1, c.life / D.shrink), sx = f / Math.sqrt(c.sq);
      P.m.compose(P.p.set(c.x, c.y, c.z), P.q, P.s.set(sx, f * c.sq, sx));
    } else P.m.makeScale(0, 0, 0);
    mesh.setMatrixAt(i, P.m);
  }
  mesh.instanceMatrix.needsUpdate = true;
}
