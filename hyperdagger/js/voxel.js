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
const SKULL_LAYERS = [
  ['..WWW..', '..SWS..'],
  ['.WWWWW.', '.WSWSW.', '..WWW..'],
  ['.WWKWW.', 'WWWWWWW', '.WWWWW.'],
  ['WRRWRRW', 'WWWWWWW', '.WWWWW.'],
  ['WWWWWWW', 'WWWWWWW', '.WWWWW.'],
  ['.WWWWW.', '.WWWWW.', '..WWW..'],
];

export const MODELS = {
  skull: {
    voxelSize: 0.22,
    palette: { W: 0xd8d8d8, S: 0xa8a8a8, R: [2.8, 0.2, 0.2], K: 0x1a1a1a },
    layers: SKULL_LAYERS,
  },
  // crowned skull — faster, 2 HP, red crown
  skull2: {
    voxelSize: 0.22,
    palette: { W: 0x8a8a8a, S: 0x666666, R: [2.8, 0.2, 0.2], K: 0x111111, C: [2.2, 0.2, 0.2] },
    layers: [...SKULL_LAYERS, ['.C.C.C.', '.......', '.......']],
  },
  // splitter — big white-crowned skull that bursts into minis
  skullBig: {
    voxelSize: 0.32,
    palette: { W: 0xdcdcdc, S: 0xaaaaaa, R: [2.8, 0.2, 0.2], K: 0x1a1a1a, C: [2.4, 2.4, 2.4] },
    layers: [...SKULL_LAYERS, ['.C.C.C.', '.......', '.......']],
  },
  skullTiny: {
    voxelSize: 0.12,
    palette: { W: 0xb8b8b8, S: 0x8a8a8a, R: [2.8, 0.2, 0.2], K: 0x151515 },
    layers: SKULL_LAYERS,
  },
  // dread skull — the Skull IV analog: big, fast, dark-red bone, burning crown
  skullDread: {
    voxelSize: 0.4,
    palette: { W: 0x6e1212, S: 0x4a0c0c, R: [3.2, 0.35, 0.35], K: 0x0a0202, C: [2.6, 0.2, 0.2] },
    layers: [...SKULL_LAYERS, ['C.C.C.C', '.......', '.......']],
  },
  // blinker — glitch shard that teleports toward the player
  blinker: {
    voxelSize: 0.26,
    palette: { D: 0x3a3a3a, R: [2.6, 0.2, 0.2] },
    layers: [
      ['...', '.D.', '...'],
      ['.D.', 'DRD', '.D.'],
      ['D.D', '.R.', 'D.D'],
      ['.D.', 'DRD', '.D.'],
      ['...', '.D.', '...'],
    ],
  },
  // spider egg — hatches skulls unless shot first
  egg: {
    voxelSize: 0.2,
    palette: { W: 0xe8e8e8, R: [2.4, 0.15, 0.15] },
    layers: [
      ['.W.', 'WWW', '.W.'],
      ['WWW', 'WRW', 'WWW'],
      ['.W.', 'WWW', '.W.'],
    ],
  },
  // ghost serpent — pale rings armored from the front (shoot from behind)
  serpentGhost: {
    voxelSize: 0.3,
    palette: { S: 0xf0f0f0, C: [1.4, 1.4, 1.4] },
    layers: [
      ['.S.', 'SSS', '.S.'],
      ['SSS', 'SCS', 'SSS'],
      ['.S.', 'SSS', '.S.'],
    ],
  },
  serpentGhostHead: {
    voxelSize: 0.36,
    palette: { S: 0xd8d8d8, C: [1.4, 1.4, 1.4], R: [2.8, 0.2, 0.2] },
    layers: [
      ['.S.', 'SSS', '.S.'],
      ['S.S', 'SCS', 'SSS'],
      ['R.R', 'SSS', 'SSS'],
      ['.S.', 'SSS', '.S.'],
    ],
  },
  // thorn — white spike that erupts from a telegraphed floor sigil
  thorn: {
    voxelSize: 0.3,
    anchor: 'bottom',
    palette: { W: 0xcfcfcf, S: 0x9a9a9a, R: [2.6, 0.2, 0.2] },
    layers: [
      ['WWW', 'WSW', 'WWW'],
      ['.W.', 'WWW', '.W.'],
      ['.W.', 'WSW', '.W.'],
      ['...', '.W.', '...'],
      ['...', '.W.', '...'],
      ['...', '.R.', '...'],
    ],
  },
  // watcher — hovering drone eye that fires orb volleys (Returnal turret nod)
  watcher: {
    voxelSize: 0.26,
    palette: { S: 0x2a2a2a, W: 0xcfcfcf, R: [2.8, 0.2, 0.2] },
    layers: [
      ['.SSS.', 'SSSSS', '.SSS.'],
      ['SRRRS', 'SWSWS', 'SSSSS'],
      ['.SSS.', 'SSSSS', '.SSS.'],
    ],
  },
  brute: {
    voxelSize: 0.46,
    palette: { W: 0x2e2e2e, S: 0x1e1e1e, R: [2.8, 0.2, 0.2], K: 0x0a0a0a, V: [1.8, 0.15, 0.15] },
    layers: [
      ...SKULL_LAYERS.map(l => l.map(r => r)),
      ['V.....V', '.......', '.......'],
      ['V.....V', '.......', '.......'],
    ],
  },
  // serpent body segment — armored ring with an HDR core
  serpent: {
    voxelSize: 0.3,
    palette: { S: 0xcfcfcf, C: [2.4, 0.2, 0.2] },
    layers: [
      ['.S.', 'SSS', '.S.'],
      ['SSS', 'SCS', 'SSS'],
      ['.S.', 'SSS', '.S.'],
    ],
  },
  // serpent head — eyes + open mouth at the front face
  serpentHead: {
    voxelSize: 0.36,
    palette: { S: 0x9a9a9a, C: [2.4, 0.2, 0.2], R: [2.8, 0.2, 0.2] },
    layers: [
      ['.S.', 'SSS', '.S.'],
      ['S.S', 'SCS', 'SSS'],
      ['R.R', 'SSS', 'SSS'],
      ['.S.', 'SSS', '.S.'],
    ],
  },
  // gem thief — squat body, corner legs, red eyes front
  spider: {
    voxelSize: 0.24,
    palette: { B: 0x242424, D: 0x151515, L: 0x151515, R: [2.8, 0.2, 0.2] },
    layers: [
      ['L...L', '.....', 'L...L'],
      ['.BBB.', 'BDBDB', '.BBB.'],
      ['.RBR.', 'BBBBB', '.BBB.'],
    ],
  },
  // late-game boss: dark god-head, glowing eyes/horns/crown, voxelSize 0.7
  leviathan: {
    voxelSize: 0.7,
    detailBoost: 1, // the boss gets one extra subdivision tier (27x at default)
    palette: {
      W: 0x1c1c1c, S: 0x101010, K: 0x000000,
      R: [3.0, 0.2, 0.2], V: [2.0, 0.15, 0.15], C: [2.4, 2.4, 2.4],
    },
    layers: [
      ['..WWWWW..', '..SSSSS..'],
      ['.WWWWWWW.', '.WSWSWSW.', '..WWWWW..'],
      ['.WWWKWWW.', 'WWWWWWWWW', '.WWWWWWW.'],
      ['WRRWKWRRW', 'WWWWWWWWW', '.WWWWWWW.'],
      ['WWWWWWWWW', 'WWWWWWWWW', '.WWWWWWW.'],
      ['.WWWWWWW.', '.WWWWWWW.', '..WWWWW..'],
      ['V.C.C.C.V', '.........', '.........'],
      ['V.......V', '.........', '.........'],
    ],
  },
  // first-person gauntlet: checkerboarded glove (unlit voxels need baked
  // shading to read as cubes), long HDR white blade forward (row 0)
  hand: {
    voxelSize: 0.05,
    palette: { G: 0x3a3a3a, D: 0x222222, H: 0x555555, B: [1.25, 1.25, 1.25] },
    layers: [
      ['...', '...', '...', '...', '...', '...', '...', 'DGD', 'GDG', 'DGD'],
      ['.B.', '.B.', '.B.', '.B.', '.B.', '.B.', '.B.', 'GHG', 'DGD', 'GDG'],
      ['...', '...', '...', '...', '...', '...', '...', 'DGD', 'GDG', 'DGD'],
    ],
  },
  totem: (() => {
    // M veins sit on the outer faces so the pillar glows from every angle
    const A = ['.OMO.', 'OOOOO', 'MOOOM', 'OOOOO', '.OMO.'];
    const B = ['.OOO.', 'OOOOO', 'OOOOO', 'OOOOO', '.OOO.'];
    const mouth = ['.OMO.', 'OO.OO', 'M.M.M', 'OO.OO', '.OMO.'];
    const crown = ['..O..', '.OMO.', '.MOM.', '.OMO.', '..O..'];
    return {
      voxelSize: 0.34,
      anchor: 'bottom',
      palette: { O: 0x161616, M: [2.4, 0.2, 0.2] },
      layers: [B, A, B, A, B, A, B, mouth, mouth, crown],
    };
  })(),
};

// Global voxel density: every model voxel is split into detail³ minis of the
// same silhouette (2 → 8×, 3 → 27×). New sprites pick the current value up;
// the perf governor drops it to 1 on weak devices (affects future spawns).
let globalDetail = 2;
export function setVoxelDetail(n) { globalDetail = Math.max(1, Math.min(4, n | 0)); }
export function getVoxelDetail() { return globalDetail; }

/** Parse a model definition into centred local-space voxels, subdividing
 *  each source voxel into subdivide³ minis. */
export function parseModel(def, subdivide = 1) {
  const { layers, palette, voxelSize: s, anchor = 'center' } = def;
  const voxels = [];
  const h = layers.length;
  const ms = s / subdivide; // mini size
  const off = (s - ms) / 2; // centre the mini grid inside the source voxel
  for (let y = 0; y < h; y++) {
    const rows = layers[y];
    const d = rows.length;
    for (let zi = 0; zi < d; zi++) {
      const row = rows[zi];
      for (let x = 0; x < row.length; x++) {
        const col = palette[row[x]];
        if (col === undefined) continue;
        const cx = (x - (row.length - 1) / 2) * s;
        const cy = anchor === 'bottom' ? (y + 0.5) * s : (y - (h - 1) / 2) * s;
        const cz = ((d - 1) / 2 - zi) * s;
        for (let sx = 0; sx < subdivide; sx++) {
          for (let sy = 0; sy < subdivide; sy++) {
            for (let sz = 0; sz < subdivide; sz++) {
              const color = Array.isArray(col)
                ? new THREE.Color().setRGB(col[0], col[1], col[2])
                : new THREE.Color(col);
              voxels.push({
                x: cx - off + sx * ms,
                y: cy - off + sy * ms,
                z: cz - off + sz * ms,
                color,
                key: row[x], // palette key kept for later retints (gauntlet evolution)
              });
            }
          }
        }
      }
    }
  }
  return voxels;
}

/** One voxel model as a single InstancedMesh with per-voxel colors.
 *  Voxels can be chipped off before death (bullet holes) — dead voxels are
 *  scaled to zero and excluded from worldVoxels()/death bursts. */
export class VoxelSprite {
  constructor(def, subdivide = globalDetail + (def.detailBoost || 0)) {
    subdivide = Math.max(1, Math.min(4, subdivide));
    this.voxels = parseModel(def, subdivide);
    this.size = def.voxelSize / subdivide;
    this.aliveCount = this.voxels.length;
    this.material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(this.size, this.size, this.size),
      this.material,
      this.voxels.length,
    );
    mesh.frustumCulled = false;
    this.voxels.forEach((v, i) => {
      v.alive = true;
      mesh.setMatrixAt(i, _m.makeTranslation(v.x, v.y, v.z));
      mesh.setColorAt(i, v.color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.instanceColor.needsUpdate = true;
    this.mesh = mesh;
    this.flashK = 0;
  }

  /** Knock out up to n alive voxels nearest to worldPoint (a dagger impact),
   *  leaving a visible hole. Returns the removed voxels' world positions +
   *  colors so a few can fly off as debris. */
  chip(worldPoint, n) {
    if (this.aliveCount <= 4 || n <= 0) return [];
    this.mesh.updateWorldMatrix(true, false);
    _v.copy(worldPoint);
    this.mesh.worldToLocal(_v);
    // rank alive voxels by distance to the impact (partial selection is
    // overkill at these counts — a sort of ≤ a few thousand entries is fine)
    const ranked = [];
    for (let i = 0; i < this.voxels.length; i++) {
      const vx = this.voxels[i];
      if (!vx.alive) continue;
      const dx = vx.x - _v.x, dy = vx.y - _v.y, dz = vx.z - _v.z;
      ranked.push({ i, d2: dx * dx + dy * dy + dz * dz });
    }
    ranked.sort((a, b) => a.d2 - b.d2);
    const out = [];
    const take = Math.min(n, ranked.length, this.aliveCount - 4);
    for (let k = 0; k < take; k++) {
      const i = ranked[k].i;
      const vx = this.voxels[i];
      vx.alive = false;
      this.aliveCount--;
      out.push({
        pos: _s.set(vx.x, vx.y, vx.z).applyMatrix4(this.mesh.matrixWorld).clone(),
        color: vx.color,
      });
      this.mesh.setMatrixAt(i, _m.makeScale(0, 0, 0));
    }
    if (out.length) this.mesh.instanceMatrix.needsUpdate = true;
    return out;
  }

  /** Hit flash: brightens material.color, which multiplies every instance color. */
  flash(k = 1.8) { this.flashK = k; }

  update(dt) {
    if (this.flashK > 0) {
      this.flashK = Math.max(0, this.flashK - dt * 7);
      this.material.color.setScalar(1 + this.flashK);
    }
  }

  /** Recolor every voxel whose palette key appears in `palette` (hex int or
   *  [r,g,b] HDR array). Drives the per-level gauntlet evolution. */
  retint(palette) {
    this.voxels.forEach((v, i) => {
      const col = palette[v.key];
      if (col === undefined) return;
      if (Array.isArray(col)) v.color.setRGB(col[0], col[1], col[2]);
      else v.color.set(col);
      this.mesh.setColorAt(i, v.color);
    });
    this.mesh.instanceColor.needsUpdate = true;
  }

  randomColor() {
    return this.voxels[(Math.random() * this.voxels.length) | 0].color;
  }

  /** World-space positions + colors of ALIVE voxels (chipped ones already
   *  left as debris), for handing off to the debris pool on death. */
  worldVoxels() {
    this.mesh.updateWorldMatrix(true, false);
    const out = [];
    for (const v of this.voxels) {
      if (!v.alive) continue;
      out.push({
        pos: _v.set(v.x, v.y, v.z).applyMatrix4(this.mesh.matrixWorld).clone(),
        color: v.color,
      });
    }
    return out;
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
    this.softCap = cap; // perf governor lowers this; pool stays preallocated
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
    if (!this.free.length || this.items.length >= this.softCap) return;
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

  /** Explode a set of world voxels outward from their centroid, plus an
   *  impulse. High-detail models can carry thousands of voxels — stride-sample
   *  down to ~170 so one death can't drain the shared pool. */
  burst(worldVoxels, size, impulse, power = 1) {
    if (!worldVoxels.length) return;
    const stride = Math.max(1, Math.ceil(worldVoxels.length / 170));
    if (stride > 1) {
      worldVoxels = worldVoxels.filter((_, i) => i % stride === 0);
      size *= Math.cbrt(stride); // conserve apparent gib volume
    }
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
