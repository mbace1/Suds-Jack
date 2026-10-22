// pyra.js — how PYRA looks: 1.x's spinner (enemy.js:935-971, 1641-1661,
// 2533-2535, 2967-2995, 3007-3030), not a gel dome.
//
//   the ring    a flat torus (major 0.9, tube 0.15, 8 × 20) in the satin gel
//               of 1.x's `pyra` family (roughness 0.10, transmission 0.25,
//               uWobble 0.35, uRadius 1.0), floating with its centre at the
//               CFG radius, 1.0 above the floor, elite or not. No squash
//               spring (1.x skips it), so the view's squash group is undone.
//   the holes   gold Phong cones (0xffcc44, shininess 80) round the ring's
//               centre line, one per hole the sim has; a hole shot off is
//               gone. They turn with the sim's spin and point out along the
//               line their fan leaves on. 1.x drew them under three's
//               rotation.y = θ, which turns the other way from its fire angle
//               (θ + a, atan2 sense), so its holes counter-rotated against
//               their own fans (bullets-graze.md trap 7); here a hole is drawn
//               where its bullets come out.
//   the pops    a lost hole throws three gold goo chunks from where it was
//               drawn, at the ring's height (1.x enemy.js:1649-1660). They
//               are the floor's, not the ring's: one pool in the scene, so the
//               killing shot's chunks fly on after the ring has gone (1.x
//               drained them into its one goo pool, main.js:10522-10527).
//   the kill    1.x destroy() and updateDeath: the group swells 1 + 1.3 t
//               about its own centre, the ring's height (enemy.js:2976-2977,
//               3023-3024), with what holes it had left; the core swells an
//               own look's root from the floor, which would lift the dying
//               ring to 2.3, so a dying view holds the ring at 1.0 / swell.
// 1.x gave a PYRA no hit ripple and no death thrash (uHit and uTear were
// written for blob bodies only, enemy.js:1612, 2704-2709, 2986-2989), so the
// material's gel handle is kept here instead of on `mat`, where the core
// would drive both; the hit flash and the death glow are the emissive, which
// the core still writes (1.x flashed and death-tinted the ring's material,
// never the holes').
//
// An elite or a boss is the same spinner scaled by its size: 1.x scaled only
// the torus (the group's `mesh`, main.js:9388, 9406), which left the cones at
// 0.9 inside a 1.08 or 1.35 ring.
let GEO = null;            // the ring and a cone, shared by every view
let POOL = null;           // the popped chunks, one pool per scene

function geometries(THREE, S) {
  if (GEO) return GEO;
  const L = S.look, R = L.ring, H = L.hole;
  // in its own XY plane: the mesh lays it flat, as 1.x's did, so the gel's
  // vertex graph (the lumps, the depth-varying thickness) reads 1.x's local frame
  const ring = new THREE.TorusGeometry(S.radius * R.r, R.tube, R.radialSegs, R.tubularSegs);
  const cone = new THREE.ConeGeometry(H.r, H.h, H.sides);
  cone.rotateZ(-Math.PI / 2);                // tip +y → +x: a cone yawed by −a points out along atan2 angle a
  GEO = { ring, cone };
  return GEO;
}

export default {
  build(ctx) {
    const { THREE, S } = ctx, L = S.look, G = geometries(THREE, S);
    const mat = ctx.gelMaterial(S.color, 'pyra', S.radius, { wobble: L.wobble });
    mat.roughness = L.roughness; mat.transmission = L.transmission;
    const gel = mat.gel;
    mat.gel = undefined;                     // no ripple, no thrash (1.x: blob bodies only)

    // body (undoes the squash group) → hub (at the CFG radius, the size) → spinner (−θ) → ring + cones
    const body = new THREE.Group(), hub = new THREE.Group(), spinner = new THREE.Group();
    const ring = new THREE.Mesh(G.ring, mat);
    ring.rotation.x = Math.PI / 2;           // lay flat for top-down view (1.x enemy.js:947)
    spinner.add(ring);
    const holeMat = new THREE.MeshPhongNodeMaterial({ color: L.hole.color, shininess: L.hole.shininess });
    const cones = [];
    for (let i = 0; i < L.maxHoles; i++) {
      const c = new THREE.Mesh(G.cone, holeMat);
      c.visible = false;
      spinner.add(c);
      cones.push(c);
    }
    hub.add(spinner); body.add(hub);
    return { body, mat, gel, own: true, hub, spinner, ring, cones, holeMat, pool: chunkPool(ctx), g: null, open: [], Object3D: THREE.Object3D, hooked: false };
  },

  update(v, g, w, time, grow) {
    const S = v.S, s = g.s;
    if (!v.hooked) hook(v);
    if (v.g !== g) { v.g = g; v.open = s.holes.map((h) => h.alive); }

    // undo the view's squash group (1/√sq, sq, 1/√sq): 1.x never squashed it
    const rq = Math.sqrt(g.sq);
    v.body.scale.set(rq, 1 / g.sq, rq);

    // 1.x's group: its centre at the CFG radius, the whole spinner at the
    // body's size; one still swelling into being grows from the floor
    v.hub.position.y = S.radius * grow;
    v.hub.scale.setScalar((g.r / S.radius) * grow);
    v.spinner.rotation.y = -s.spin;          // a local angle a is drawn at world atan2 angle a + θ: where it fires
    placeHoles(v, s);

    // the chunks in flight move on (on the sim's clock while a ring is drawn),
    // then a hole lost since the last frame throws three more
    tickPool(v.pool, w.over ? null : w, time);
    throwPops(v, g);
  },

  reset(v) { v.g = null; v.open = []; for (const c of v.cones) c.visible = false; },
};

// the cones the sim's holes ask for: hole i at local angle a, pointing out
function placeHoles(v, s) {
  const S = v.S, R = S.radius * S.look.ring.r;
  for (let i = 0; i < v.cones.length; i++) {
    const c = v.cones[i], h = s.holes[i];
    c.visible = !!h && h.alive;
    if (!h) continue;
    c.position.set(Math.cos(h.angle) * R, 0, Math.sin(h.angle) * R);
    c.rotation.y = -h.angle;
  }
}

// Three chunks for every hole that has closed since this view last looked,
// from where it was drawn: the ring's height, 0.9 × its size out along
// θ + a (1.x enemy.js:1649-1660)
function throwPops(v, g) {
  const S = v.S, L = S.look, s = g.s;
  const k = (g.r / S.radius), R = S.radius * L.ring.r * k;
  for (let i = 0; i < s.holes.length; i++) {
    const h = s.holes[i];
    if (h.alive || !v.open[i]) { v.open[i] = h.alive; continue; }
    v.open[i] = false;
    const a = s.spin + h.angle, x = g.x + Math.cos(a) * R, z = g.z + Math.sin(a) * R;
    for (let j = 0; j < L.popChunks; j++) {
      const ra = Math.random() * Math.PI * 2;
      spawnChunk(v.pool, x, S.radius, z, Math.cos(ra) * L.popSpeed, L.popUp[0] + Math.random() * (L.popUp[1] - L.popUp[0]), Math.sin(ra) * L.popSpeed);
    }
  }
}

// Once per view: take over what the core's death does not do as 1.x did. A
// dying view swells its root about the floor for 0.28 s and this look's
// update no longer runs, so as the body is drawn: the squash undo goes to 1
// (the core has set the squash group to 1), the hub stands at 1.0 / swell so
// the root's swell leaves its centre at 1.0 (1.x scaled the group about its
// own origin, enemy.js:2976-2977), the cones are the holes it died with, and
// the killing shot's hole — or every hole a killing dash took — pops.
function hook(v) {
  v.hooked = true;
  const base = v.Object3D.prototype.updateMatrixWorld;
  v.body.updateMatrixWorld = function (force) {
    if (v.dyingT > 0 && v.g) {
      const S = v.S;
      this.scale.set(1, 1, 1);
      v.hub.position.y = S.radius / (v.root.scale.y || 1);
      v.hub.scale.setScalar(v.g.r / S.radius);
      placeHoles(v, v.g.s);
      throwPops(v, v.g);
    }
    base.call(this, force);
  };
}

// ── the chunk pool ─────────────────────────────────────────────────
// 1.x's gooChunkPool (main.js:1284-1392): smooth 9 × 7 droplets in the
// core's goo, every slot drawn and the idle ones at scale 0, a full pool
// reusing the chunk with least life. Its clock: the sim's while a ring is
// drawn (update passes the world), the frame clock once none is (or the run
// is over), so the last chunks still finish when their ring has gone.
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

// Once a frame, however many rings or passes ask: the sim's time since the
// last tick when given the world, else the frame clock held to 1.x's 0.05 s.
// The chunks then step in 1/60 s slices, so 1.x's per-frame spring is its
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
