// TRUCK mode — Clustertruck-style auto-scroll track on the Hyper Dagger body.
import * as THREE from 'three';
import { TUNING as T } from './tuning.js?v=63';
import { Skull } from './enemy.js?v=63';

const matOk = new THREE.MeshBasicMaterial({ color: 0x3a342c });
const matWarn = new THREE.MeshBasicMaterial({ color: 0x6a4030 });
const matHot = new THREE.MeshBasicMaterial({ color: 0x8a3020 });

export class TruckTrack {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [];
    this.nextZ = 0;
  }

  clear() {
    for (const p of this.platforms) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      p.mesh.material?.dispose?.();
    }
    this.platforms.length = 0;
    this.nextZ = 0;
  }

  addPlatform(z, x = 0) {
    const w = T.truck.width * (0.85 + Math.random() * 0.45);
    const depth = 3.0 + Math.random() * 1.6;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.45, depth), matOk.clone());
    mesh.position.set(x, -0.2, z);
    this.scene.add(mesh);
    this.platforms.push({
      mesh, z, x, w, depth,
      life: T.truck.platformLife,
      touched: false,
      falling: false,
      vy: 0,
    });
  }

  seed(player) {
    this.clear();
    for (let i = 0; i < 10; i++) {
      const z = -i * T.truck.platformGap;
      const x = i === 0 ? 0 : (Math.random() - 0.5) * 5.5;
      this.addPlatform(z, x);
    }
    this.nextZ = -10 * T.truck.platformGap;
    player.feet.set(0, 0.4, 0);
    player.velocity.set(0, 0, 0);
    player.vy = 0;
    player._sync();
  }

  update(dt, player, gameTime, enemies) {
    const ahead = player.feet.z - 45;
    while (this.nextZ > ahead) {
      const x = (Math.random() - 0.5) * 8;
      this.addPlatform(this.nextZ, x);
      let gap = T.truck.platformGap * (0.8 + Math.random() * 0.45);
      if (gameTime > 20 && Math.random() < 0.12) gap *= 1.35;
      this.nextZ -= gap;
    }

    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const p = this.platforms[i];
      if (!p.falling && p.touched) {
        p.life -= dt;
        if (p.life <= 0) {
          p.falling = true;
          p.mesh.material.color.copy(matHot.color);
        } else if (p.life < 0.85) {
          p.mesh.material.color.copy(matWarn.color);
        }
      }
      if (p.falling) {
        p.vy -= 28 * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.rotation.z += dt * 1.3;
        if (p.mesh.position.y < -22) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          this.platforms.splice(i, 1);
        }
      }
    }

    const rate = 0.2 + Math.min(0.8, gameTime * 0.015);
    if (gameTime > 8 && Math.random() < dt * rate) {
      const z = player.feet.z - 16 - Math.random() * 12;
      const x = (Math.random() - 0.5) * 7;
      enemies.push(new Skull(this.scene, new THREE.Vector3(x, 1.2, z), 1.5 + gameTime * 0.02));
    }
  }

  supportPlayer(player) {
    player.feet.z -= T.truck.scrollSpeed * (1 + Math.min(0.6, Math.max(0, -player.feet.z) * 0.004));
    let on = false;
    for (const p of this.platforms) {
      if (p.falling) continue;
      const dx = Math.abs(player.feet.x - p.mesh.position.x);
      const dz = Math.abs(player.feet.z - p.mesh.position.z);
      if (dx < p.w * 0.5 + 0.35 && dz < p.depth * 0.5 + 0.35) {
        const top = p.mesh.position.y + 0.25;
        if (player.feet.y <= top + 0.4 && player.vy <= 0.6) {
          player.feet.y = top;
          player.vy = 0;
          p.touched = true;
          on = true;
        }
      }
    }
    return on;
  }
}
