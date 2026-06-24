import * as THREE from 'three';

const MAX         = 300;
const FAT_MAX     = 20;
const ENEMY_SPEED = 7;
const PLAYER_SPEED = 24;

export const BULLET_R     = 0.15;
export const FAT_BULLET_R = 0.45;

const _m4  = new THREE.Matrix4();
const _col = new THREE.Color();

export class BulletPool {
  constructor(scene) {
    // Normal bullets — player + enemy, per-instance color
    const normGeo = new THREE.SphereGeometry(0.15, 6, 4);
    this._normMesh = new THREE.InstancedMesh(
      normGeo,
      new THREE.MeshBasicMaterial({ vertexColors: true }),
      MAX,
    );
    this._normMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._normMesh.count = 0;
    scene.add(this._normMesh);

    // Fat bullets — enemy only (BAMBU lob)
    const fatGeo = new THREE.SphereGeometry(0.45, 8, 6);
    this._fatMesh = new THREE.InstancedMesh(
      fatGeo,
      new THREE.MeshBasicMaterial({ color: 0xff6600 }),
      FAT_MAX,
    );
    this._fatMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this._fatMesh.count = 0;
    scene.add(this._fatMesh);

    // Typed arrays — slot-based storage, zero alloc per frame
    this.x        = new Float32Array(MAX);
    this.z        = new Float32Array(MAX);
    this.vx       = new Float32Array(MAX);
    this.vz       = new Float32Array(MAX);
    this.life     = new Float32Array(MAX);
    this.isPlayer = new Uint8Array(MAX);
    this.fat      = new Uint8Array(MAX);
    this._cr      = new Uint8Array(MAX);
    this._cg      = new Uint8Array(MAX);
    this._cb      = new Uint8Array(MAX);

    // active: list of occupied slot indices
    this.active = [];
    this._free  = Array.from({ length: MAX }, (_, i) => MAX - 1 - i);
  }

  spawnDir(x, z, dx, dz, isPlayer, color, fat = false) {
    if (this._free.length === 0) return;
    const s = this._free.pop();

    const spd = isPlayer ? PLAYER_SPEED : (fat ? 3.5 : ENEMY_SPEED);
    this.x[s]        = x;
    this.z[s]        = z;
    this.vx[s]       = dx * spd;
    this.vz[s]       = dz * spd;
    this.life[s]     = 4;
    this.isPlayer[s] = isPlayer ? 1 : 0;
    this.fat[s]      = fat ? 1 : 0;

    const c = color ?? (isPlayer ? 0x44ff88 : 0xff4422);
    this._cr[s] = (c >> 16) & 0xff;
    this._cg[s] = (c >>  8) & 0xff;
    this._cb[s] = (c      ) & 0xff;

    this.active.push(s);
  }

  update(dt, halfSize) {
    let nNorm = 0, nFat = 0;

    for (let ai = this.active.length - 1; ai >= 0; ai--) {
      const s = this.active[ai];
      this.x[s]    += this.vx[s] * dt;
      this.z[s]    += this.vz[s] * dt;
      this.life[s] -= dt;

      const ax = this.x[s], az = this.z[s];
      if (this.life[s] <= 0 || Math.abs(ax) > halfSize + 2 || Math.abs(az) > halfSize + 2) {
        this._free.push(s);
        this.active.splice(ai, 1);
        continue;
      }

      if (this.fat[s]) {
        _m4.makeTranslation(ax, 0.45, az);
        this._fatMesh.setMatrixAt(nFat++, _m4);
      } else {
        _m4.makeTranslation(ax, 0.3, az);
        this._normMesh.setMatrixAt(nNorm, _m4);
        _col.setRGB(this._cr[s] / 255, this._cg[s] / 255, this._cb[s] / 255);
        this._normMesh.setColorAt(nNorm, _col);
        nNorm++;
      }
    }

    this._normMesh.count = nNorm;
    this._fatMesh.count  = nFat;
    this._normMesh.instanceMatrix.needsUpdate = true;
    if (this._normMesh.instanceColor) this._normMesh.instanceColor.needsUpdate = true;
    this._fatMesh.instanceMatrix.needsUpdate = true;
  }

  // ai = index into this.active (the outer loop counter when iterating backwards)
  recycleAt(ai) {
    this._free.push(this.active[ai]);
    this.active.splice(ai, 1);
  }

  clear() {
    this.active.length = 0;
    this._free.length  = 0;
    for (let i = MAX - 1; i >= 0; i--) this._free.push(i);
    this._normMesh.count = 0;
    this._fatMesh.count  = 0;
    this._normMesh.instanceMatrix.needsUpdate = true;
    this._fatMesh.instanceMatrix.needsUpdate  = true;
  }
}
