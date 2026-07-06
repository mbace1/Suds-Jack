import * as THREE from 'three';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();

/**
 * Voxel models as string-art layers. layers[0] is the BOTTOM slice; each layer
 * is an array of rows (row 0 = front face, toward +z after parsing, which is
 * the side `Object3D.lookAt(target)` points at the target). '.' = empty.
 * Palette values are hex ints, or [r,g,b] arrays with components > 1 for
 * HDR glow parts that should trip the bloom pass.
 */
export const MODELS = {
  skull: {
    voxelSize: 0.22,
    palette: { W: 0xcfc5ac, S: 0xa89c82, R: [2.6, 0.25, 0.5], K: 0x2a2138 },
    layers: [
      ['..WWW..', '..SWS..'],
      ['.WWWWW.', '.WSWSW.', '..WWW..'],
      ['.WWKWW.', 'WWWWWWW', '.WWWWW.'],
      ['WRRWRRW', 'WWWWWWW', '.WWWWW.'],
      ['WWWWWWW', 'WWWWWWW', '.WWWWW.'],
      ['.WWWWW.', '.WWWWW.', '..WWW..'],
    ],
  },
  brute: {
    voxelSize: 0.46,
    palette: { W: 0xc23e5e, S: 0x8a2440, R: [0.4, 2.6, 1.9], K: 0x330a1e, V: 0x8a3ce0 },
    layers: [
      ['..WWW..', '..SWS..'],
      ['.WWWWW.', '.WSWSW.', '..WWW..'],
      ['.WWKWW.', 'WWWWWWW', '.WWWWW.'],
      ['WRRWRRW', 'WWWWWWW', '.WWWWW.'],
      ['WWWWWWW', 'WWWWWWW', '.WWWWW.'],
      ['.WWWWW.', '.WWWWW.', '..WWW..'],
      ['V.....V', '.......', '.......'],
      ['V.....V', '.......', '.......'],
    ],
  },
  totem: (() => {
    const A = ['.OOO.', 'OOOOO', 'OOMOO', 'OOOOO', '.OOO.'];
    const B = ['.OOO.', 'OOMOO', 'OMMMO', 'OOMOO', '.OOO.'];
    const mouth = ['.OOO.', 'OO.OO', 'O.M.O', 'OO.OO', '.OOO.'];
    const crown = ['..O..', '.OOO.', '.OMO.', '.OOO.', '..O..'];
    return {
      voxelSize: 0.34,
      anchor: 'bottom',
      palette: { O: 0x2a1745, M: [2.4, 0.3, 2.0] },
      layers: [A, B, A, B, A, B, A, mouth, mouth, crown],
    };
  })(),
};

/** Parse a model definition into centred local-space voxels. */
export function parseModel(def) {
  const { layers, palette, voxelSize: s, anchor = 'center' } = def;
  const voxels = [];
  const h = layers.length;
  for (let y = 0; y < h; y++) {
    const rows = layers[y];
    const d = rows.length;
    for (let zi = 0; zi < d; zi++) {
      const row = rows[zi];
      for (let x = 0; x < row.length; x++) {
        const col = palette[row[x]];
        if (col === undefined) continue;
        const color = Array.isArray(col)
          ? new THREE.Color().setRGB(col[0], col[1], col[2])
          : new THREE.Color(col);
        voxels.push({
          x: (x - (row.length - 1) / 2) * s,
          y: anchor === 'bottom' ? (y + 0.5) * s : (y - (h - 1) / 2) * s,
          z: ((d - 1) / 2 - zi) * s,
          color,
        });
      }
    }
  }
  return voxels;
}

/** One voxel model as a single InstancedMesh with per-voxel colors. */
export class VoxelSprite {
  constructor(def) {
    this.voxels = parseModel(def);
    this.size = def.voxelSize;
    this.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(this.size, this.size, this.size),
      this.material,
      this.voxels.length,
    );
    mesh.frustumCulled = false;
    this.voxels.forEach((v, i) => {
      mesh.setMatrixAt(i, _m.makeTranslation(v.x, v.y, v.z));
      mesh.setColorAt(i, v.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    this.mesh = mesh;
    this.flashK = 0;
  }

  /** Hit flash: brightens material.color, which multiplies every instance color. */
  flash(k = 1.8) { this.flashK = k; }

  update(dt) {
    if (this.flashK > 0) {
      this.flashK = Math.max(0, this.flashK - dt * 7);
      this.material.color.setScalar(1 + this.flashK);
    }
  }

  randomColor() {
    return this.voxels[(Math.random() * this.voxels.length) | 0].color;
  }

  /** World-space voxel positions + colors, for handing off to the debris pool. */
  worldVoxels() {
    this.mesh.updateWorldMatrix(true, false);
    return this.voxels.map(v => ({
      pos: _v.set(v.x, v.y, v.z).applyMatrix4(this.mesh.matrixWorld).clone(),
      color: v.color,
    }));
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * Global pool of physical voxel debris: gravity, floor bounce with damping,
 * tumbling, and a shrink-out at end of life. One InstancedMesh for everything.
 */
export class DebrisPool {
  constructor(scene, cap = 1600) {
    this.cap = cap;
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), this.mat, cap);
    this.mesh.frustumCulled = false;
    this.items = [];
    this.free = [];
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < cap; i++) {
      this.mesh.setMatrixAt(i, zero);
      this.free.push(i);
    }
    scene.add(this.mesh);
  }

  spawn(pos, color, vel, size, life = 1.6) {
    if (!this.free.length) return;
    const i = this.free.pop();
    this.items.push({
      i, size, life, maxLife: life,
      px: pos.x, py: pos.y, pz: pos.z,
      vx: vel.x, vy: vel.y, vz: vel.z,
      rx: Math.random() * 6.28, ry: Math.random() * 6.28, rz: 0,
      wx: (Math.random() - 0.5) * 14, wy: (Math.random() - 0.5) * 14, wz: (Math.random() - 0.5) * 14,
    });
    this.mesh.setColorAt(i, color);
    this.mesh.instanceColor.needsUpdate = true;
  }

  /** Explode a set of world voxels outward from their centroid, plus an impulse. */
  burst(worldVoxels, size, impulse, power = 1) {
    const c = _v.set(0, 0, 0);
    for (const v of worldVoxels) c.add(v.pos);
    c.divideScalar(worldVoxels.length);
    for (const v of worldVoxels) {
      _s.copy(v.pos).sub(c);
      const len = Math.max(_s.length(), 0.05);
      _s.divideScalar(len).multiplyScalar((3 + Math.random() * 6) * power);
      _s.x += impulse.x + (Math.random() - 0.5) * 2;
      _s.y += impulse.y + 2 + Math.random() * 5;
      _s.z += impulse.z + (Math.random() - 0.5) * 2;
      this.spawn(v.pos, v.color, _s, size, 1.1 + Math.random() * 0.9);
    }
  }

  update(dt) {
    const G = -28;
    for (let k = this.items.length - 1; k >= 0; k--) {
      const d = this.items[k];
      d.life -= dt;
      if (d.life <= 0) {
        this.mesh.setMatrixAt(d.i, _m.makeScale(0, 0, 0));
        this.free.push(d.i);
        this.items.splice(k, 1);
        continue;
      }
      d.vy += G * dt;
      d.px += d.vx * dt; d.py += d.vy * dt; d.pz += d.vz * dt;
      const half = d.size / 2;
      if (d.py < half && d.vy < 0) {
        d.py = half;
        d.vy *= -0.38;
        d.vx *= 0.72; d.vz *= 0.72;
        d.wx *= 0.6; d.wy *= 0.6; d.wz *= 0.6;
      }
      d.rx += d.wx * dt; d.ry += d.wy * dt; d.rz += d.wz * dt;
      const sc = d.size * Math.min(1, d.life / 0.3);
      _m.compose(
        _v.set(d.px, d.py, d.pz),
        _q.setFromEuler(_e.set(d.rx, d.ry, d.rz)),
        _s.setScalar(sc),
      );
      this.mesh.setMatrixAt(d.i, _m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  reset() {
    for (const d of this.items) {
      this.mesh.setMatrixAt(d.i, _m.makeScale(0, 0, 0));
      this.free.push(d.i);
    }
    this.items.length = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
