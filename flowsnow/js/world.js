// The mountain on screen: a ring of terrain tiles that follows the rider and
// rebuilds only the tiles that are new, standing stones read off the same tile
// indices, the track the board leaves, and the shadow under the rider.
import * as THREE from 'three';
import { snowMaterial, trailMaterial, shadowMaterial } from './snowmat.js?v=4';
import { STONE } from './palette.js?v=1';

const SEG = 20;
const SIDE = 8, AHEAD = 8, BEHIND = 2;      // tiles around the rider (ahead is -z)
const BUILDS_PER_FRAME = 2;

export class Field {
  constructor(scene, u, terrain) {
    this.t = terrain; this.scene = scene;
    this.TILE = terrain.TILE;
    this.mat = snowMaterial(u);
    this.tiles = new Map();                 // "ix,iz" -> mesh
    this.pool = [];
    this.queue = [];
    this.center = null;
    this.stone = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshLambertMaterial({ color: STONE }), 420);
    this.stone.count = 0;
    this.stone.frustumCulled = false;
    scene.add(this.stone);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
    this.dirtyStones = true;
    // the sun the shadows were baked for, and a queue of tiles to re-bake when
    // it has moved far enough down the run that the old bake would lie
    this.sun = [0.6, 0.5, -0.6];
    this.bakedSun = [0.6, 0.5, -0.6];
    this.rebake = [];
  }
  setSun(sx, sy, sz) {
    this.sun[0] = sx; this.sun[1] = sy; this.sun[2] = sz;
    const b = this.bakedSun;
    const drift = Math.hypot(sx - b[0], sy - b[1], sz - b[2]);
    if (drift > 0.05 && this.rebake.length === 0) {
      this.bakedSun = [sx, sy, sz];
      this.rebake = [...this.tiles.values()];
    }
  }
  // shadow only: heights are already in the mesh, so this is the march alone
  _bakeShadow(m) {
    const pos = m.geometry.attributes.position, sh = m.geometry.attributes.aShadow;
    const ox = m.position.x, oz = m.position.z;
    for (let i = 0; i < pos.count; i++) {
      sh.setX(i, this.t.occlusion(pos.getX(i) + ox, pos.getZ(i) + oz, this.sun, pos.getY(i)));
    }
    sh.needsUpdate = true;
  }
  _mesh() {
    if (this.pool.length) return this.pool.pop();
    const g = new THREE.PlaneGeometry(this.TILE, this.TILE, SEG, SEG);
    g.rotateX(-Math.PI / 2);
    g.setAttribute('aShadow', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count).fill(1), 1));
    const m = new THREE.Mesh(g, this.mat);
    m.frustumCulled = true;
    return m;
  }
  _build(m, ix, iz) {
    const t = this.t, T = this.TILE;
    const ox = ix * T + T / 2, oz = iz * T + T / 2;
    const pos = m.geometry.attributes.position, nor = m.geometry.attributes.normal;
    const n = [0, 1, 0];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + ox, z = pos.getZ(i) + oz;
      pos.setY(i, t.height(x, z));
      t.normal(x, z, n);
      nor.setXYZ(i, n[0], n[1], n[2]);
    }
    pos.needsUpdate = true; nor.needsUpdate = true;
    m.geometry.computeBoundingSphere();
    m.position.set(ox, 0, oz);
    m.visible = true;
    this._bakeShadow(m);
  }
  // THE GROUND THE RIDER HAS CHANGED. Heights and normals only — the shadow
  // bake is an eight-step horizon march per vertex and a trench does not move
  // anyone's horizon, so re-baking it here would cost the frame and change
  // nothing. One tile a frame out of the four nearest, which at 60 Hz gives
  // each of them fifteen refreshes a second.
  //
  // HONEST LIMIT, and it is geometric rather than a tuning: a tile is 48 m over
  // SEG 20, so its vertices are 2.4 m apart and a board is 0.30 m wide. This
  // mesh can carry a BERM, which is metres across, as a soft swell. It cannot
  // carry a trench at any refresh rate, because there is nowhere to put one.
  _reheight(m) {
    const t = this.t;
    const ox = m.position.x, oz = m.position.z;
    const pos = m.geometry.attributes.position, nor = m.geometry.attributes.normal;
    const n = [0, 1, 0];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + ox, z = pos.getZ(i) + oz;
      pos.setY(i, t.height(x, z));
      t.normal(x, z, n);
      nor.setXYZ(i, n[0], n[1], n[2]);
    }
    pos.needsUpdate = true; nor.needsUpdate = true;
  }
  refresh(x, z) {
    const T = this.TILE;
    const cx = Math.floor(x / T), cz = Math.floor(z / T);
    const near = [];
    for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iz = cz - 1; iz <= cz + 1; iz++) {
      const m = this.tiles.get(`${ix},${iz}`);
      if (m && m.visible) near.push(m);
    }
    if (!near.length) return;
    this._turn = ((this._turn || 0) + 1) % near.length;
    this._reheight(near[this._turn]);
  }
  update(x, z) {
    const T = this.TILE;
    const cx = Math.floor(x / T), cz = Math.floor(z / T);
    if (!this.center || this.center[0] !== cx || this.center[1] !== cz) {
      this.center = [cx, cz];
      const want = new Set();
      for (let ix = cx - SIDE; ix <= cx + SIDE; ix++) for (let iz = cz - AHEAD; iz <= cz + BEHIND; iz++) want.add(`${ix},${iz}`);
      for (const [k, m] of this.tiles) if (!want.has(k)) { this.tiles.delete(k); this.scene.remove(m); this.pool.push(m); }
      this.queue = [];
      for (const k of want) if (!this.tiles.has(k)) this.queue.push(k);
      // nearest first, so the ground under you is never the last to arrive
      this.queue.sort((a, b) => {
        const [ax, az] = a.split(',').map(Number), [bx, bz] = b.split(',').map(Number);
        return (ax - cx) ** 2 + (az - cz) ** 2 - ((bx - cx) ** 2 + (bz - cz) ** 2);
      });
      this.dirtyStones = true;
    }
    let n = 0;
    while (this.queue.length && n++ < BUILDS_PER_FRAME) {
      const k = this.queue.shift();
      if (this.tiles.has(k)) continue;
      const [ix, iz] = k.split(',').map(Number);
      const m = this._mesh();
      this._build(m, ix, iz);
      this.tiles.set(k, m);
      this.scene.add(m);
    }
    if (this.dirtyStones) { this._stones(); this.dirtyStones = false; }
    // one re-bake a frame: the sun moves slowly, the queue drains long before it matters
    if (this.rebake.length) { const m = this.rebake.pop(); if (m.visible) this._bakeShadow(m); }
  }
  // build everything queued now (the smoke test, and the first frame)
  flush() { while (this.queue.length) this.update(this.center[0] * this.TILE + 1, this.center[1] * this.TILE + 1); }
  _stones() {
    const [cx, cz] = this.center;
    let i = 0;
    const put = (x, y, z, sx, sy, sz, yaw) => {
      if (i >= 420) return;
      this._p.set(x, y, z); this._s.set(sx, sy, sz); this._q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      this._m.compose(this._p, this._q, this._s);
      this.stone.setMatrixAt(i++, this._m);
    };
    for (let ix = cx - SIDE; ix <= cx + SIDE; ix++) for (let iz = cz - AHEAD; iz <= cz + BEHIND; iz++) {
      for (const m of this.t.monolithsIn(ix, iz)) {
        if (!m.arch) put(m.x, m.y + m.h / 2 - 0.4, m.z, m.w, m.h, m.d, m.yaw);
        else {
          const c = Math.cos(m.yaw), s = Math.sin(m.yaw), off = m.w * 0.42;
          const legW = Math.max(0.9, m.w * 0.16);
          put(m.x + c * off, m.y + m.h / 2 - 0.4, m.z - s * off, legW, m.h, m.d, m.yaw);
          put(m.x - c * off, m.y + m.h / 2 - 0.4, m.z + s * off, legW, m.h, m.d, m.yaw);
          put(m.x, m.y + m.h - m.h * 0.06 - 0.4, m.z, m.w, m.h * 0.13, m.d * 1.15, m.yaw);
        }
      }
    }
    this.stone.count = i;
    this.stone.instanceMatrix.needsUpdate = true;
  }
}

const TRAIL_N = 700, TRAIL_STEP = 0.45, TRAIL_HALF = 0.15;
const COLS = 5;            // crest, wall, floor, wall, crest — the trench in cross-section
export class Trail {
  constructor(scene, u) {
    this.samples = [];
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(TRAIL_N * COLS * 3);
    this.alpha = new Float32Array(TRAIL_N * COLS);
    this.cross = new Float32Array(TRAIL_N * COLS);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    geo.setAttribute('aCross', new THREE.BufferAttribute(this.cross, 1));
    const idx = [];
    for (let i = 0; i < TRAIL_N - 1; i++) {
      const a = i * COLS, b = (i + 1) * COLS;
      for (let c = 0; c < COLS - 1; c++) idx.push(a + c, b + c, a + c + 1, a + c + 1, b + c, b + c + 1);
    }
    geo.setIndex(idx);
    geo.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(geo, trailMaterial(u));
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.last = null;
    this._r = new THREE.Vector3();
  }
  // THE RIBBON IS THE TRENCH. The terrain mesh cannot be: a tile is 48 m over
  // SEG 20, so its vertices are 2.4 m apart and a board is 0.30 m wide — there
  // is nowhere in that mesh to put a groove, at any refresh rate. This strip
  // already follows the exact path the board took, so it is the one surface in
  // the game fine enough to carry one, and it costs five vertices a sample.
  //
  // Every height comes from `terrain.height`, which is base + depth + the pack's
  // own delta. That matters more than it looks: the ribbon used to carry its own
  // `drop` computed from sink, which was a SECOND model of the same displacement
  // and free to drift from the one the rider was actually feeling. Now the thing
  // you see is the thing you are riding on, because it is the same function.
  add(s, rootQuat, terrain) {
    if (this.last && Math.hypot(s.x - this.last[0], s.z - this.last[1]) < TRAIL_STEP) return;
    this.last = [s.x, s.z];
    const r = this._r.set(1, 0, 0).applyQuaternion(rootQuat);
    const on = s.grounded ? 1 : 0;
    // THE SAME WIDTH PHYSICS ACTUALLY CUTS. physics.js cuts a trough of radius
    // 0.62 - 0.18*|edge| and the pack throws its berm out to 2.6x that, so the
    // ribbon reads those rather than keeping a third number of its own — one
    // more copy of the same fact is one more thing free to drift.
    const half = 0.62 - 0.18 * Math.abs(s.edge ?? 0);
    const wide = half * 2.6;
    const offs = [-wide, -half, 0, half, wide];
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const x = s.x + r.x * offs[c], z = s.z + r.z * offs[c];
      row.push(x, terrain.height(x, z) + 0.035, z);
    }
    this.samples.push({ row, on });
    if (this.samples.length > TRAIL_N) this.samples.shift();
    this._write();
  }
  _write() {
    const n = this.samples.length;
    for (let i = 0; i < n; i++) {
      const sm = this.samples[i];
      const a = sm.on * Math.min(1, (i / n) * 1.4);
      for (let c = 0; c < COLS; c++) {
        const o = (i * COLS + c) * 3;
        this.pos[o] = sm.row[c * 3]; this.pos[o + 1] = sm.row[c * 3 + 1]; this.pos[o + 2] = sm.row[c * 3 + 2];
        // -1 at the left crest, 0 on the floor, +1 at the right crest
        this.cross[i * COLS + c] = (c - 2) / 2;
        // the crests are the surrounding snow, so the strip has to vanish there
        // or the trench reads as a painted stripe with hard sides
        this.alpha[i * COLS + c] = a * (c === 0 || c === COLS - 1 ? 0 : 1);
      }
    }
    const g = this.mesh.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    g.attributes.aCross.needsUpdate = true;
    g.setDrawRange(0, Math.max(0, (n - 1) * (COLS - 1) * 6));
  }
  clear() { this.samples = []; this.last = null; this._write(); }
}

export class Shadow {
  constructor(scene, u) {
    this.mat = shadowMaterial(u);
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(1.1, 18), this.mat);
    this.mesh.geometry.rotateX(-Math.PI / 2);
    scene.add(this.mesh);
    this._n = new THREE.Vector3(); this._up = new THREE.Vector3(0, 1, 0);
  }
  update(s, terrain) {
    const h = terrain.height(s.x, s.z);
    const n = terrain.normal(s.x, s.z);
    this.mesh.position.set(s.x, h + 0.03, s.z);
    this.mesh.quaternion.setFromUnitVectors(this._up, this._n.set(n[0], n[1], n[2]));
    // a board down inside the pack casts nothing — the snow is over it
    const above = Math.max(0, s.y - h);
    const k = Math.max(0, 1 - above / 5) * Math.max(0, 1 - (s.sink ?? 0) * 1.2);
    this.mat.uniforms.uAlpha.value = k;
    const sc = 1 + above * 0.15;
    this.mesh.scale.set(sc, 1, sc);
  }
}
