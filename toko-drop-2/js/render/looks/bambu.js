// bambu.js — how BAMBU looks: 1.x's bamboo tower (enemy.js:865-933,
// 1584-1601, 2537-2560, 2811-2868), not a gel dome.
//
//   the stalk   up to three segments, each a 14-sided cylinder flaring wider
//               toward its top and capped by a node lip, all in ONE satin gel
//               material of 1.x's `bambu` family (roughness 0.20,
//               transmission 0.10, uWobble 0.35, uRadius 0.7), so the hit
//               flash, the ripple and the death thrash take the whole stalk.
//               It rises out of the floor (scale.y 0.01 → 1 over 0.6 s), then
//               breathes, and strains while the shot climbs: 14% shorter and
//               7% fatter at the launch, then it snaps back. No squash spring.
//   the orb     the charge, an additive gold sphere climbing the stalk
//               through the telegraph and growing as it goes; it is in the
//               stalk, so it breathes and strains with it
//   the ring    where the lob will land, flat on the floor, flashing on the
//               lob's own clock: slowly through the telegraph, faster in
//               flight. It is the whole tell — the damage is exactly there
//   the pops    a shot knocks the top segment off: three tan goo chunks fly
//               from where it was
// The blob in flight is the core's lob (api.fire.lob). Segments come and go
// with the sim's count (g.s.segs) — they grow back.
//
// The ring and the chunks stand in the world, not on the stalk: they hang
// off the view's root (placed at the body), offset to their world spot, so
// they go with the view when it is pooled. While a killed view plays out its
// last 0.28 s the root swells, so they hide (1.x hid the ring at death,
// enemy.js:3079).
let GEO = null;
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
    chunk: new THREE.SphereGeometry(1, L.popGeo[0], L.popGeo[1]),
  };
  return GEO;
}

export default {
  build(ctx) {
    const { THREE, S, T } = ctx, L = S.look, G = geometries(THREE, S);
    const mat = ctx.gelMaterial(S.color, 'bambu', S.radius, { wobble: L.wobble });
    mat.roughness = L.roughness; mat.transmission = L.transmission;

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

    const orb = new THREE.Mesh(G.orb, new THREE.MeshBasicNodeMaterial({
      color: S.bulletColor, transparent: true, opacity: L.orb.opacity, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    orb.visible = false;
    body.add(orb);

    // what stands in the world: the landing ring and the popped chunks
    const fx = new THREE.Group();
    const ringMat = new THREE.MeshBasicNodeMaterial({
      color: S.bulletColor, transparent: true, opacity: L.telegraphOpacity[1], side: THREE.DoubleSide, depthWrite: false,
    });
    const ring = new THREE.Mesh(G.ring, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.visible = false;
    fx.add(ring);
    const M = T.material;
    const chunkMat = new THREE.MeshPhysicalNodeMaterial({
      color: L.popColor, roughness: M.roughness, clearcoat: M.clearcoat, clearcoatRoughness: M.clearcoatRoughness, sheen: M.sheen,
    });
    const chunkMeshes = [];
    for (let i = 0; i < L.popPool; i++) {
      const c = new THREE.Mesh(G.chunk, chunkMat);
      c.visible = false;
      fx.add(c);
      chunkMeshes.push(c);
    }

    return { body, mat, own: true, segs, orb, fx, ring, ringMat, chunkMeshes, chunks: [], lastPops: null, lastTime: null,
      Object3D: THREE.Object3D, D: T.death, frame: T.sim.dt };
  },

  update(v, g, w, time) {
    const S = v.S, L = S.look, s = g.s;
    if (v.fx.parent !== v.root) attachFx(v);

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

    // the landing ring, at its world spot, flashing on the lob's clock
    const live = tele || s.state === 'lobbing';
    v.ring.visible = live;
    if (live) {
      v.ring.position.set(s.tx - v.root.position.x, L.ringY, s.tz - v.root.position.z);
      const [rate, [on, off]] = tele ? [L.telegraphFlashRate, L.telegraphOpacity] : [L.flightFlashRate, L.flightOpacity];
      v.ringMat.opacity = Math.sin(s.lobT * rate) > 0 ? on : off;
    }

    // the chunks in flight move on; a segment shot off since the last frame
    // throws three more from where it was
    const dt = v.lastTime == null ? 0 : Math.max(0, Math.min(L.frameDtCap, time - v.lastTime));
    v.lastTime = time;
    stepChunks(v, dt);
    if (v.lastPops == null) v.lastPops = s.pops;
    for (; v.lastPops < s.pops; v.lastPops++) {
      for (let k = 0; k < L.popChunks; k++) {
        const a = Math.random() * Math.PI * 2;
        if (v.chunks.length >= v.chunkMeshes.length) v.chunks.shift();
        v.chunks.push({ x: 0, y: s.popY, z: 0, vx: Math.cos(a) * L.popSpeed, vy: L.popUp[0] + Math.random() * (L.popUp[1] - L.popUp[0]),
          vz: Math.sin(a) * L.popSpeed, life: v.D.chunkLife, sq: 1, sqV: 0 });
      }
    }
    drawChunks(v);
  },

  reset(v) {
    v.ring.visible = false; v.orb.visible = false;
    v.chunks.length = 0; v.lastPops = null; v.lastTime = null;
    for (const c of v.chunkMeshes) c.visible = false;
  },
};

// Hang the world-standing parts off the view's root, once per view. A dying
// view swells its root for 0.28 s; the ring and chunks hide through it.
function attachFx(v) {
  v.root.add(v.fx);
  const base = v.Object3D.prototype.updateMatrixWorld;
  v.fx.updateMatrixWorld = function (force) {
    this.visible = !(v.dyingT > 0);
    base.call(this, force);
  };
}

// 1.x's chunk physics (main.js:1366-1400), per frame, in the root's frame
// (the stalk barely drifts, so its chunks drift with it)
function stepChunks(v, dt) {
  const L = v.S.look, D = v.D, Q = L.popSquash, k = dt / v.frame;   // 1.x's springs are per 60 Hz frame
  for (let i = v.chunks.length - 1; i >= 0; i--) {
    const c = v.chunks[i];
    if ((c.life -= dt) <= 0) { v.chunks.splice(i, 1); continue; }
    c.vy -= D.gravity * dt;
    c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
    if (c.y <= L.popFloor && c.vy < 0) {
      c.y = 0; c.sqV -= Math.abs(c.vy) * Q.land;
      c.vy = 0; c.vx *= D.floorKeep; c.vz *= D.floorKeep;
    }
    c.sqV = (c.sqV - (c.sq - 1) * Q.spring * k) * Math.pow(Q.damp, k);
    c.sq = Math.max(Q.min, Math.min(Q.max, c.sq + c.sqV * k));
  }
}

function drawChunks(v) {
  const L = v.S.look, D = v.D;
  for (let i = 0; i < v.chunkMeshes.length; i++) {
    const m = v.chunkMeshes[i], c = v.chunks[i];
    m.visible = !!c;
    if (!c) continue;
    const f = L.popSize * Math.min(1, c.life / D.shrink), sx = f / Math.sqrt(c.sq);
    m.position.set(c.x, c.y, c.z);
    m.scale.set(sx, f * c.sq, sx);
  }
}
