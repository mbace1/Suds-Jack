import * as THREE from 'three';

const POOL_SIZE           = 300;
const ENEMY_BULLET_SPEED  = 7;
const PLAYER_BULLET_SPEED = 24;
export const BULLET_CONFIG = { enemySpeed: ENEMY_BULLET_SPEED, playerBulletScale: 1.0 };

export const BULLET_R     = 0.15;
export const FAT_BULLET_R = 0.45;

class Bullet {
  constructor(scene) {
    const geo = new THREE.SphereGeometry(0.15, 6, 4);
    this.mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.visible = false;
    scene.add(this.mesh);

    // Drop shadow
    const shadowGeo = new THREE.CircleGeometry(1, 8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    this.shadow = new THREE.Mesh(shadowGeo, shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.visible = false;
    scene.add(this.shadow);

    // Glow trail for enemy bullets
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
    this._trailMat = new THREE.LineBasicMaterial({
      color: 0xff4422,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    this._trail = new THREE.Line(trailGeo, this._trailMat);
    this._trail.visible = false;
    scene.add(this._trail);

    this.vx = 0; this.vz = 0;
    this.alive = false;
    this.isPlayer = false;
    this.lifetime = 0;
    this.fat = false;
    this.speed = ENEMY_BULLET_SPEED;
  }
}

export class BulletPool {
  constructor(scene) {
    this._pool = Array.from({ length: POOL_SIZE }, () => new Bullet(scene));
    this.active = [];
  }

  spawnDir(x, z, dx, dz, isPlayer, color, fat = false) {
    const b = this._pool.pop();
    if (!b) return;
    const speed = isPlayer ? PLAYER_BULLET_SPEED : (fat ? 3.5 : BULLET_CONFIG.enemySpeed);
    b.speed = speed;
    b.fat = fat;
    b.mesh.position.set(x, 0.3, z);
    const resolvedColor = color ?? (isPlayer ? 0x44ff88 : 0xff4422);
    b.mat.color.set(resolvedColor);
    b._trailMat.color.set(resolvedColor);
    b.vx = dx * speed; b.vz = dz * speed;
    b.alive = true; b.isPlayer = isPlayer;
    b.lifetime = 4;
    b.mesh.visible = true;
    b._trail.visible = false;
    if (fat) {
      b.mesh.scale.setScalar(3);
    } else {
      b.mesh.scale.setScalar(isPlayer ? BULLET_CONFIG.playerBulletScale : 1);
    }
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
      } else {
        // Update shadow
        const shadowR = b.fat ? 0.5 : 0.18;
        b.shadow.position.set(p.x, 0.02, p.z);
        b.shadow.scale.setScalar(shadowR);
        b.shadow.visible = true;

        // Glow trail for all bullets (player = green, enemy = red — colour set in spawnDir)
        {
          const len = Math.hypot(b.vx, b.vz);
          if (len > 0) {
            const nx = b.vx / len, nz = b.vz / len;
            const arr = b._trail.geometry.attributes.position.array;
            const step = b.fat ? 0.55 : (b.isPlayer ? 0.22 : 0.28);
            const trailOpacity = b.isPlayer ? 0.45 : 0.55;
            b._trailMat.opacity = trailOpacity;
            for (let j = 0; j < 3; j++) {
              arr[j * 3]     = p.x - nx * step * j;
              arr[j * 3 + 1] = 0.3;
              arr[j * 3 + 2] = p.z - nz * step * j;
            }
            b._trail.geometry.attributes.position.needsUpdate = true;
            b._trail.visible = true;
          }
        }
      }
    }
  }

  recycleAt(i) {
    const b = this.active[i];
    b.alive = false;
    b.mesh.visible = false;
    b.mesh.scale.setScalar(1);
    b.shadow.visible = false;
    b._trail.visible = false;
    b.fat = false;
    this.active.splice(i, 1);
    this._pool.push(b);
  }

  clear() {
    while (this.active.length) this.recycleAt(0);
  }
}
