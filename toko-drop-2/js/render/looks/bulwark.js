// bulwark.js — how BULWARK looks: 1.x's plain steel-blue gel dome (it is a
// 1.x BLOB_TYPE with the default silhouette, so the core shapes the body)
// plus its shield plate — a pale steel slab hovering on its front face
// (1.x v140, enemy.js:1149-1158, 1807-1815). The plate follows the facing
// the sim keeps in g.faceX / g.faceZ, the same facing the block reads, so the
// plate IS the tell of the arc that stops your shots. Unlit (1.x
// MeshBasicMaterial), glinting on a slow |sin|, and gone the frame the
// bulwark dies (enemy.js:3010).
//
// A shot it shrugs off throws three steel droplets back along the hit
// (main.js:10694-10698), on 1.x's goo chunk physics (main.js:1349-1394).
// The sim records each block in g.s; the droplets are this look's own, so
// they live under the view's root and leave with it.
//
// Numbers: js/tuning/species/bulwark.js. Contract: docs/SIM_CONTRACT.md.

export default {
  build(ctx) {
    const { THREE, TSL, S, geo, T } = ctx;
    const P = S.plate, K = S.spark, M = T.material;
    const mat = ctx.gelMaterial(S.color, 'blob', 1);
    const body = new THREE.Mesh(geo.blob, mat);

    // the plate: unlit, translucent, its opacity the glint; hidden while the
    // gel's death thrash (tear) runs, which is exactly while the body is dying
    const glint = TSL.uniform(P.glintBase + P.glintAmp);
    const plateMat = new THREE.MeshBasicNodeMaterial({ color: P.color, transparent: true });
    plateMat.opacityNode = glint.mul(TSL.float(1).sub(TSL.step(1e-4, mat.gel.tear)));
    const plate = new THREE.Mesh(new THREE.BoxGeometry(P.size[0], P.size[1], P.size[2]), plateMat);

    // steel droplets for blocked shots: a small pool, drawn in one call
    const sparkMat = new THREE.MeshPhysicalNodeMaterial({
      color: K.color, roughness: M.roughness, clearcoat: M.clearcoat, clearcoatRoughness: M.clearcoatRoughness, sheen: M.sheen,
    });
    const sparks = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 9, 7), sparkMat, K.pool);
    sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    sparks.count = 0; sparks.frustumCulled = false;
    const drops = Array.from({ length: K.pool }, () => ({ live: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, sq: 1, sqV: 0 }));

    return { body, mat, plate, glint, sparks, drops, glintPhase: Math.random() * Math.PI * 2,
      lastBlocks: 0, lastTime: -1, m4: new THREE.Matrix4() };
  },

  update(v, g, w, time, grow) {
    const S = v.S, P = S.plate;
    if (v.plate.parent !== v.root) v.root.add(v.plate, v.sparks);

    // the plate rides the facing at radius + gap, squared up to it
    const d = (g.r + P.gap) * grow;
    v.plate.position.set(g.faceX * d, P.y * grow, g.faceZ * d);
    v.plate.rotation.set(0, Math.atan2(g.faceX, g.faceZ), 0);
    v.plate.scale.setScalar(grow);
    v.glint.value = P.glintBase + P.glintAmp * Math.abs(Math.sin(time * P.glintHz + v.glintPhase));

    // steel sparks: new blocks throw droplets, then 1.x's chunk physics
    const K = S.spark, dt = v.lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, time - v.lastTime));
    v.lastTime = time;
    const blocks = g.s.blocks || 0;
    if (blocks > v.lastBlocks) {
      const n = Math.min(blocks - v.lastBlocks, Math.floor(K.pool / K.count)) * K.count;
      const base = Math.atan2(g.s.blockZ - g.z, g.s.blockX - g.x);
      for (let i = 0; i < n; i++) {
        let s = v.drops.find((q) => !q.live);
        if (!s) s = v.drops.reduce((a, q) => (q.life < a.life ? q : a));
        const a = base + (Math.random() - 0.5) * K.spread;
        Object.assign(s, { live: true, x: g.s.blockX, y: g.r + K.lift, z: g.s.blockZ,
          vx: Math.cos(a) * K.speed, vy: K.up[0] + Math.random() * (K.up[1] - K.up[0]), vz: Math.sin(a) * K.speed,
          life: K.life, sq: 1, sqV: 0 });
      }
    }
    v.lastBlocks = blocks;
    const k = Math.min(3, dt * 60), ox = v.root.position.x, oz = v.root.position.z;
    let c = 0;
    for (const s of v.drops) {
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
      const f = K.size * Math.min(1, s.life / K.shrink), sx = f / Math.sqrt(Math.max(s.sq, 0.1));
      v.m4.makeScale(sx, s.sq * f, sx).setPosition(s.x - ox, s.y, s.z - oz);
      v.sparks.setMatrixAt(c++, v.m4);
    }
    v.sparks.count = c;
    v.sparks.instanceMatrix.needsUpdate = true;
  },

  // a pooled view, reused for a new bulwark
  reset(v) {
    v.lastBlocks = 0; v.lastTime = -1; v.sparks.count = 0;
    for (const s of v.drops) s.live = false;
  },
};
