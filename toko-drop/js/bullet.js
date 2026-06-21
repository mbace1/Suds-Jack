import * as THREE from 'three';

const POOL_SIZE = 300;
const ENEMY_BULLET_SPEED = 16;
const PLAYER_BULLET_SPEED = 24;

class Bullet {
  constructor(scene) {
    const geo = new THREE.SphereGeometry(0.15, 6, 4);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.visible = false;
    scene.add(this.mesh);
    this.vx = 0; this.vz = 0;
    this.alive = false;
    this.isPlayer = false;
    this.lifetime = 0;
  }
}

export class BulletPool {
  constructor(scene) {
    this._pool = Array.from({ length: POOL_SIZE }, () => new Bullet(scene));
    this.active = [];
  }

  spawnDir(x, z, dx, dz, isPlayer, color) {
    const b = this._pool.pop();
    if (!b) return;
    const speed = isPlayer ? PLAYER_BULLET_SPEED : ENEMY_BULLET_SPEED;
    b.mesh.position.set(x, 0.3, z);
    b.mat.color.set(color ?? (isPlayer ? 0x44ff88 : 0xff4422));
    b.vx = dx * speed; b.vz = dz * speed;
    b.alive = true; b.isPlayer = isPlayer;
    b.lifetime = 4;
    b.mesh.visible = true;
    this.active.push(b);
  }

  update(dt, halfSize) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const b = this.active[i];
      b.mesh.position.x += b.vx * dt;
      b.mesh.position.z += b.vz * dt;
      b.lifetime -= dt;
      const p = b.mesh.position;
      if (b.lifetime <= 0 || Math.abs(p.x) > halfSize + 2 || Math.abs(p.z) > halfSize + 2) {
        this.recycleAt(i);
      }
    }
  }

  recycleAt(i) {
    const b = this.active[i];
    b.alive = false;
    b.mesh.visible = false;
    this.active.splice(i, 1);
    this._pool.push(b);
  }

  clear() {
    while (this.active.length) this.recycleAt(0);
  }
}
