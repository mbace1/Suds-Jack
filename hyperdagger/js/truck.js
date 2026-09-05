// TRUCK mode — Clustertruck-style auto-scroll track on the Hyper Dagger body.
import * as THREE from 'three';
import { TUNING as T } from './tuning.js?v=69';
import { Skull } from './enemy.js?v=69';

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

  /**
   * Where the next slab sits across the track. A bounded RANDOM WALK, not a
   * fresh roll: scattering each platform independently across the full width
   * makes islands, and a route you cannot see the shape of is not a route.
   * Stepping at most ~1.6 either way keeps every slab overlapping the one
   * before it laterally, so the track reads as a road that wanders.
   */
  walkX(first = false) {
    if (first) return (this.lastX = 0);
    const step = (Math.random() - 0.5) * 3.2;
    this.lastX = Math.max(-5, Math.min(5, (this.lastX ?? 0) + step));
    return this.lastX;
  }

  addPlatform(z, x = 0) {
    const w = T.truck.width * (0.85 + Math.random() * 0.45);
    const depth = T.truck.platformDepth + Math.random() * T.truck.platformDepthVar;
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

  reset(player) {
    this.clear();
    this.lastX = 0;
    for (let i = 0; i < 10; i++) {
      this.addPlatform(-i * T.truck.platformGap, this.walkX(i === 0));
    }
    this.nextZ = -10 * T.truck.platformGap;
    player.feet.set(0, 0.4, 0);
    player.velocity.set(0, 0, 0);
    player.vy = 0;
    player.floorY = -Infinity;
    player._sync();
  }

  /**
   * Runs BEFORE player.update: scrolls the body down the track and tells it
   * what it is standing on this frame. It has to be before, not after, or the
   * player never reads as grounded and jumps never refill — which is the whole
   * mode. (It also has to scale by dt: the first cut moved a flat 14 units per
   * FRAME, so the track ran ~50x too fast at 60fps and faster on a better
   * screen. Nothing caught it because the mode was never actually reachable.)
   */
  preUpdate(dt, player) {
    const boost = 1 + Math.min(0.6, Math.max(0, -player.feet.z) * 0.004);
    player.feet.z -= T.truck.scrollSpeed * boost * dt;

    let floor = -Infinity;
    for (const p of this.platforms) {
      if (p.falling) continue;
      const dx = Math.abs(player.feet.x - p.mesh.position.x);
      const dz = Math.abs(player.feet.z - p.mesh.position.z);
      if (dx > p.w * 0.5 + 0.35 || dz > p.depth * 0.5 + 0.35) continue;
      const top = p.mesh.position.y + 0.25;
      // Only surfaces at or below the feet hold you up — you pass through the
      // side of a platform you are jumping past rather than snagging on it.
      if (top > player.feet.y + 0.45) continue;
      if (top > floor) floor = top;
      // Standing on it starts its clock. Touching is what makes it leave.
      if (player.feet.y <= top + 0.45) p.touched = true;
    }
    player.floorY = floor;
    return floor > -Infinity;
  }

  update(dt, player, gameTime, enemies) {
    const ahead = player.feet.z - 45;
    while (this.nextZ > ahead) {
      this.addPlatform(this.nextZ, this.walkX());
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

}
