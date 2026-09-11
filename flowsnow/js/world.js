// The mountain on screen: a ring of terrain tiles that follows the rider and
// rebuilds only the tiles that are new, standing stones read off the same tile
// indices, the track the board leaves, and the shadow under the rider.
import * as THREE from 'three';
import { snowMaterial, trailMaterial, shadowMaterial } from './snowmat.js?v=1';
import { STONE } from './palette.js?v=1';

const SEG = 20;
const SIDE = 8, AHEAD = 8, BEHIND = 2;      // tiles around the rider (ahead is -z)
const BUILDS_PER_FRAME = 3;

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
  }
  _mesh() {
    if (this.pool.length) return this.pool.pop();
    const g = new THREE.PlaneGeometry(this.TILE, this.TILE, SEG, SEG);
    g.rotateX(-Math.PI / 2);
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
export class Trail {
  constructor(scene, u) {
    this.samples = [];                        // {lx,ly,lz,rx,ry,rz,on}
    const geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(TRAIL_N * 2 * 3);
    this.alpha = new Float32Array(TRAIL_N * 2);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1));
    const idx = [];
    for (let i = 0; i < TRAIL_N - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    geo.setIndex(idx);
    geo.setDrawRange(0, 0);
    this.mesh = new THREE.Mesh(geo, trailMaterial(u));
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.last = null;
    this._r = new THREE.Vector3();
  }
  add(s, rootQuat, terrain) {
    if (this.last && Math.hypot(s.x - this.last[0], s.z - this.last[1]) < TRAIL_STEP) return;
    this.last = [s.x, s.z];
    const r = this._r.set(1, 0, 0).applyQuaternion(rootQuat);
    const on = s.grounded ? 1 : 0;
    // a board buried in powder leaves a TRENCH, not a line: it widens with the
    // sink and sits below the surface it displaced
    const half = TRAIL_HALF * (1 + (s.sink ?? 0) * 2.4);
    const drop = Math.min((s.sink ?? 0) * 0.5, 0.35);
    const lx = s.x - r.x * half, lz = s.z - r.z * half;
    const rx = s.x + r.x * half, rz = s.z + r.z * half;
    this.samples.push({ lx, ly: terrain.height(lx, lz) + 0.05 - drop, lz,
      rx, ry: terrain.height(rx, rz) + 0.05 - drop, rz, on });
    if (this.samples.length > TRAIL_N) this.samples.shift();
    this._write();
  }
  _write() {
    const n = this.samples.length;
    for (let i = 0; i < n; i++) {
      const s = this.samples[i], o = i * 6;
      this.pos[o] = s.lx; this.pos[o + 1] = s.ly; this.pos[o + 2] = s.lz;
      this.pos[o + 3] = s.rx; this.pos[o + 4] = s.ry; this.pos[o + 5] = s.rz;
      const a = s.on * Math.min(1, (i / n) * 1.4);
      this.alpha[i * 2] = a; this.alpha[i * 2 + 1] = a;
    }
    this.mesh.geometry.attributes.position.needsUpdate = true;
    this.mesh.geometry.attributes.aAlpha.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, Math.max(0, (n - 1) * 6));
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
