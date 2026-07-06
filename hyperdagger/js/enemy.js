import * as THREE from 'three';
import { VoxelSprite, MODELS } from './voxel.js';

const _dir = new THREE.Vector3();
const _c = new THREE.Vector3();

class VoxelEnemy {
  constructor(scene, model, pos) {
    this.sprite = new VoxelSprite(model);
    this.group = new THREE.Group();
    this.group.add(this.sprite.mesh);
    this.group.position.copy(pos);
    this.group.scale.setScalar(0.01);
    this.spawnK = 0;
    this.alive = true;
    scene.add(this.group);
  }

  get pos() { return this.group.position; }

  /** Sphere centre used for dagger + player collision. */
  center(out) { return out.copy(this.pos); }

  baseUpdate(dt) {
    if (this.spawnK < 1) {
      this.spawnK = Math.min(1, this.spawnK + dt * 2.4);
      this.group.scale.setScalar(this.spawnK);
    }
    this.sprite.update(dt);
  }

  hit(dmg, dir) {
    this.hp -= dmg;
    this.sprite.flash();
  }

  remove(scene) {
    scene.remove(this.group);
    this.sprite.dispose();
  }
}

/** Fast chaser. One dagger kills it; takes knockback. */
export class Skull extends VoxelEnemy {
  constructor(scene, pos, speedBoost = 0, model = MODELS.skull) {
    super(scene, model, pos);
    this.type = 'skull';
    this.hp = 1;
    this.radius = 0.75;
    this.score = 1;
    this.vel = new THREE.Vector3();
    this.maxSpeed = 5.2 + speedBoost;
    this.accel = 15;
    this.knock = 8;
    this.bobT = Math.random() * Math.PI * 2;
  }

  update(dt, playerEye) {
    this.baseUpdate(dt);
    this.bobT += dt * 3;
    _dir.copy(playerEye).sub(this.pos);
    _dir.y += Math.sin(this.bobT) * 0.5;
    _dir.normalize();
    this.vel.addScaledVector(_dir, this.accel * dt);
    const sp = this.vel.length();
    if (sp > this.maxSpeed) this.vel.multiplyScalar(this.maxSpeed / sp);
    this.pos.addScaledVector(this.vel, dt);
    if (this.pos.y < 0.55) this.pos.y = 0.55;
    this.group.lookAt(playerEye);
  }

  hit(dmg, dir) {
    super.hit(dmg, dir);
    this.vel.addScaledVector(dir, this.knock);
  }
}

/** Slow tank with cyan eyes and horns. Shrugs off most knockback. */
export class Brute extends Skull {
  constructor(scene, pos, speedBoost = 0) {
    super(scene, pos, 0, MODELS.brute);
    this.type = 'brute';
    this.hp = 10;
    this.radius = 1.55;
    this.score = 5;
    this.maxSpeed = 3.1 + speedBoost;
    this.accel = 6;
    this.knock = 1.6;
  }

  update(dt, playerEye) {
    super.update(dt, playerEye);
    if (this.pos.y < 1.25) this.pos.y = 1.25;
  }
}

/** Stationary obsidian pillar that exhales skulls from its mouth. */
export class Totem extends VoxelEnemy {
  constructor(scene, pos, interval) {
    super(scene, MODELS.totem, pos);
    this.type = 'totem';
    this.hp = 25;
    this.radius = 1.7;
    this.score = 10;
    this.hitY = 1.7;
    this.interval = interval;
    this.spawnTimer = interval * 0.5;
    this.emit = false;
  }

  center(out) { return out.set(this.pos.x, this.hitY, this.pos.z); }

  mouthPos(out) { return out.set(this.pos.x, 2.9, this.pos.z); }

  update(dt) {
    this.baseUpdate(dt);
    this.group.rotation.y += dt * 0.6;
    if (this.spawnK < 1) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.interval;
      this.emit = true;
    }
  }
}
