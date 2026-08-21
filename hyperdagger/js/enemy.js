import * as THREE from 'three';
import { VoxelSprite, MODELS } from './voxel.js?v=66';
import { MESH_FOR_TYPE, cloneMeshEnemy, flashMeshRoot, updateMeshRoot } from './mesh-enemies.js?v=66';

const _dir = new THREE.Vector3();
const _c = new THREE.Vector3();

class VoxelEnemy {
  constructor(scene, model, pos) {
    this.sprite = new VoxelSprite(model);
    this.parts = [this.sprite];
    this.group = new THREE.Group();
    this.group.add(this.sprite.mesh);
    this.group.traverse(o => o.layers.enable(2));
    this.group.position.copy(pos);
    this.group.scale.setScalar(0.01);
    this.spawnK = 0;
    this.alive = true;
    this.meshRoot = null;
    scene.add(this.group);
  }

  get pos() { return this.group.position; }

  center(out) { return out.copy(this.pos); }

  tryMeshVisual(type) {
    if (this.meshRoot) return true;
    const kind = MESH_FOR_TYPE[type];
    if (!kind) return false;
    const root = cloneMeshEnemy(kind);
    if (!root) return false;
    this.meshRoot = root;
    this.group.add(root);
    // hide voxel skin while mesh is up; voxels still drive physics/gibs
    this.sprite.mesh.visible = false;
    if (this.sprite.hull) this.sprite.hull.visible = false;
    return true;
  }

  baseUpdate(dt) {
    if (this.spawnK < 1) {
      this.spawnK = Math.min(1, this.spawnK + dt * 2.4);
      this.group.scale.setScalar(this.spawnK);
    }
    if (!this.meshRoot && this.type) this.tryMeshVisual(this.type);
    for (const part of this.parts) {
      part.update(dt);
      if (part.hull) part.hull.layers.enable(2);
    }
    updateMeshRoot(this.meshRoot, dt);
  }

  hit(dmg, dir) {
    this.hp -= dmg;
    for (const part of this.parts) part.flash();
    flashMeshRoot(this.meshRoot);
  }

  deathVoxels() { return this.parts.flatMap(part => part.worldVoxels()); }

  remove(scene) {
    if (this.removed) return;
    this.removed = true;
    scene.remove(this.group);
    for (const part of this.parts) part.dispose();
    this.meshRoot = null;
  }
}

/** Fast chaser. One dagger kills it; takes knockback. */
export class Skull extends VoxelEnemy {
  constructor(scene, pos, speedBoost = 0, model = MODELS.skull) {
    const animatedJaw = model === MODELS.skull;
    super(scene, animatedJaw ? MODELS.skullHead : model, pos);
    if (animatedJaw) {
      this.jaw = new VoxelSprite(MODELS.skullJaw);
      this.jaw.material.transparent = true;
      this.jaw.material.depthTest = false;
      this.jaw.material.depthWrite = false;
      this.jaw.mesh.renderOrder = 3;
      this.jawPivot = new THREE.Group();
      this.jawPivot.position.set(0, -0.44, -0.05);
      this.jaw.mesh.position.set(0, 0.52, 0.12);
      this.jawPivot.add(this.jaw.mesh);
      this.group.add(this.jawPivot);
      this.parts.push(this.jaw);
      this.jawPivot.traverse(o => o.layers.enable(2));
      this.jawT = Math.random() * Math.PI * 2;
      this.jawOpen = 0;
    }
    this.type = 'skull';
    this.hp = 1;
    this.radius = 0.75;
    this.score = 1;
    this.vel = new THREE.Vector3();
    this.maxSpeed = 10.8 + speedBoost;
    this.accel = 7.2;
    this.knock = 8;
    this.bobT = Math.random() * Math.PI * 2;
  }

  update(dt, playerEye) {
    this.baseUpdate(dt);
    this.bobT += dt * 3;
    _dir.copy(playerEye).sub(this.pos);
    if (this.jawPivot) {
      const near = Math.max(0, Math.min(1, 1 - _dir.length() / 18));
      this.jawT += dt * (7.5 + near * 4.5);
      const bite = Math.pow(0.5 + 0.5 * Math.sin(this.jawT), 1.6);
      this.jawOpen = 0.05 + bite * (0.28 + near * 0.16);
      this.jawPivot.rotation.x = this.jawOpen;
      this.jawPivot.position.y = -0.44 - this.jawOpen * 0.12;
      this.jawPivot.position.z = -0.05 + this.jawOpen * 0.08;
    }
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

export class Husk extends VoxelEnemy {
  constructor(scene, pos, speedBoost = 0) {
    super(scene, MODELS.husk, pos);
    this.type = 'husk';
    this.hp = 16;
    this.maxHp = 16;
    this.radius = 1.45;
    this.score = 7;
    this.vel = new THREE.Vector3();
    this.maxSpeed = 3.2 + speedBoost;
    this.accel = 8;
    this.knock = 1.5;
    this.shellTotal = this.sprite.voxels.length;
    this.cracked = false;
    this.bobT = Math.random() * Math.PI * 2;
  }
  get hitSound() { return this.coreExposed ? 'hit' : 'plate'; }
  get exposure() { return 1 - this.sprite.aliveCount / this.shellTotal; }
  get coreExposed() { return this.exposure >= 0.32; }
  checkCrack() {
    if (this.cracked || !this.coreExposed) return false;
    this.cracked = true;
    this.sprite.retint({ C: [4.2, 0.35, 0.35] });
    return true;
  }
  update(dt, playerEye) {
    this.baseUpdate(dt);
    this.bobT += dt * 1.6;
    _dir.copy(playerEye).sub(this.pos);
    _dir.y = 0;
    _dir.normalize();
    this.vel.addScaledVector(_dir, this.accel * dt);
    const sp = this.vel.length();
    if (sp > this.maxSpeed) this.vel.multiplyScalar(this.maxSpeed / sp);
    this.pos.addScaledVector(this.vel, dt);
    this.pos.y = 1.35 + Math.sin(this.bobT) * 0.06;
    this.group.lookAt(playerEye.x, this.pos.y, playerEye.z);
  }
  hit(dmg, dir) {
    this.hp -= this.coreExposed ? dmg * 2 : dmg * 0.2;
    this.sprite.flash();
    flashMeshRoot(this.meshRoot);
    this.vel.addScaledVector(dir, this.knock);
  }
}

export class Revenant extends VoxelEnemy {
  constructor(scene, pos, speedBoost = 0) {
    super(scene, MODELS.revenant, pos);
    this.type = 'revenant';
    this.hp = 6;
    this.maxHp = 6;
    this.radius = 1.0;
    this.score = 4;
    this.vel = new THREE.Vector3();
    this.maxSpeed = 5.2 + speedBoost;
    this.accel = 13;
    this.knock = 4;
    this.bobT = Math.random() * Math.PI * 2;
    this.riseT = 0.9;
    this.pos.y = -0.6;
  }
  get rising() { return this.riseT > 0; }
  update(dt, playerEye) {
    this.baseUpdate(dt);
    this.group.lookAt(playerEye.x, this.pos.y, playerEye.z);
    if (this.riseT > 0) {
      this.riseT = Math.max(0, this.riseT - dt);
      this.pos.y = 1.05 - (this.riseT / 0.9) * 1.65;
      return;
    }
    this.bobT += dt * 2.6;
    _dir.copy(playerEye).sub(this.pos);
    _dir.y = 0;
    _dir.normalize();
    this.vel.addScaledVector(_dir, this.accel * dt);
    const sp = this.vel.length();
    if (sp > this.maxSpeed) this.vel.multiplyScalar(this.maxSpeed / sp);
    this.pos.addScaledVector(this.vel, dt);
    this.pos.y = 1.05 + Math.sin(this.bobT) * 0.08;
  }
  hit(dmg, dir) {
    super.hit(dmg, dir);
    this.vel.addScaledVector(dir, this.knock);
  }
}

export class Wraith extends Skull {
  constructor(scene, pos, speedBoost = 0) {
    super(scene, pos, speedBoost + 1.8, MODELS.skull2);
    this.hp = 2;
    this.score = 2;
    this.accel = 18;
  }
}

export class Splitter extends Skull {
  constructor(scene, pos, speedBoost = 0) {
    super(scene, pos, speedBoost - 1.5, MODELS.skullBig);
    this.hp = 4;
    this.radius = 1.05;
    this.score = 2;
    this.knock = 4;
    this.splits = true;
  }
}

export class DreadSkull extends Skull {
  constructor(scene, pos, speedBoost = 0) {
    super(scene, pos, speedBoost + 2.6, MODELS.skullDread);
    this.type = 'dread';
    this.hp = 8;
    this.radius = 1.3;
    this.score = 5;
    this.accel = 22;
    this.knock = 2;
  }
}

export class MiniSkull extends Skull {
  constructor(scene, pos, speedBoost = 0) {
    super(scene, pos, speedBoost + 2.6, MODELS.skullTiny);
    this.radius = 0.45;
    this.accel = 20;
    this.knock = 11;
  }
}

export class Watcher extends VoxelEnemy {
  constructor(scene, pos, bound = 25) {
    super(scene, MODELS.watcher, pos);
    this.type = 'watcher';
    this.hp = 4;
    this.radius = 0.85;
    this.score = 3;
    this.bound = bound;
    this.vel = new THREE.Vector3();
    this.orbitA = Math.random() * Math.PI * 2;
    this.orbitDir = Math.random() < 0.5 ? -1 : 1;
    this.fireT = 2.5 + Math.random() * 2;
    this.bobT = Math.random() * Math.PI * 2;
    this.warnReq = false;
    this.volley = null;
    this._warned = false;
  }
  update(dt, playerEye) {
    this.baseUpdate(dt);
    this.bobT += dt;
    this.orbitA += this.orbitDir * dt * 0.35;
    const _wt = new THREE.Vector3(
      playerEye.x + Math.cos(this.orbitA) * 13,
      2.3 + Math.sin(this.bobT * 1.3) * 0.5,
      playerEye.z + Math.sin(this.orbitA) * 13,
    );
    _dir.copy(_wt).sub(this.pos).normalize();
    this.vel.addScaledVector(_dir, 8 * dt);
    if (this.vel.length() > 6) this.vel.setLength(6);
    this.pos.addScaledVector(this.vel, dt);
    const hr = Math.hypot(this.pos.x, this.pos.z);
    if (hr > this.bound) { this.pos.x *= this.bound / hr; this.pos.z *= this.bound / hr; }
    if (this.pos.y < 1.2) this.pos.y = 1.2;
    this.group.lookAt(playerEye);
    if (this.spawnK < 1) return;
    this.fireT -= dt;
    if (this.fireT <= 0.7) {
      if (!this._warned) { this._warned = true; this.warnReq = true; }
      this.sprite.flash(0.5);
    }
    if (this.fireT <= 0) {
      this.fireT = 4.2;
      this._warned = false;
      _dir.copy(playerEye).sub(this.pos).normalize();
      const dirs = [];
      for (const a of [-0.12, 0, 0.12]) {
        const cos = Math.cos(a), sin = Math.sin(a);
        dirs.push(new THREE.Vector3(_dir.x * cos - _dir.z * sin, _dir.y, _dir.x * sin + _dir.z * cos).normalize());
      }
      this.volley = dirs;
    }
  }
  hit(dmg, dir) { super.hit(dmg, dir); this.vel.addScaledVector(dir, 5); }
}

export class Blinker extends VoxelEnemy {
  constructor(scene, pos, bound = 25) {
    super(scene, MODELS.blinker, pos);
    this.type = 'blinker';
    this.hp = 3;
    this.radius = 0.8;
    this.score = 3;
    this.bound = bound;
    this.blinkT = 1 + Math.random();
    this.bobT = Math.random() * Math.PI * 2;
    this.puffReq = null;
  }
  update(dt, playerEye) {
    this.baseUpdate(dt);
    this.bobT += dt;
    this.pos.y = 1.2 + Math.sin(this.bobT * 2) * 0.15;
    this.group.rotation.y += dt * 1.5;
    if (this.spawnK < 1) return;
    this.blinkT -= dt;
    if (this.blinkT > 0) return;
    this.blinkT = 2.2;
    const dx = playerEye.x - this.pos.x, dz = playerEye.z - this.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const step = Math.min(d - 1.6, 7.5);
    if (step < 0.5) return;
    this.puffReq = this.pos.clone();
    const jitter = (Math.random() - 0.5) * 4;
    this.pos.x += (dx / d) * step + (-dz / d) * jitter;
    this.pos.z += (dz / d) * step + (dx / d) * jitter;
    const hr = Math.hypot(this.pos.x, this.pos.z);
    if (hr > this.bound) { this.pos.x *= this.bound / hr; this.pos.z *= this.bound / hr; }
    this.spawnK = 0.35;
    this.sprite.flash(1.5);
  }
}

export class Egg extends VoxelEnemy {
  constructor(scene, pos) {
    super(scene, MODELS.egg, pos);
    this.type = 'egg';
    this.hp = 2;
    this.radius = 0.55;
    this.score = 1;
    this.hatchT = 4;
    this.hatch = false;
    this.pos.y = 0.35;
  }
  update(dt) {
    this.baseUpdate(dt);
    if (this.spawnK < 1) return;
    this.hatchT -= dt;
    const pulse = 1 + Math.sin(this.hatchT * 12) * 0.08 * (1 - this.hatchT / 4);
    this.group.scale.setScalar(pulse);
    if (this.hatchT <= 0) this.hatch = true;
  }
}

export class Brute extends Skull {
  constructor(scene, pos, speedBoost = 0) {
    super(scene, pos, 0, MODELS.brute);
    this.type = 'brute';
    this.hp = 10;
    this.radius = 1.55;
    this.score = 5;
    this.maxSpeed = 3.7 + speedBoost;
    this.accel = 6;
    this.knock = 1.6;
  }
  update(dt, playerEye) {
    super.update(dt, playerEye);
    if (this.pos.y < 1.25) this.pos.y = 1.25;
  }
}

export class Totem extends VoxelEnemy {
  constructor(scene, pos, interval, ddTier = 0) {
    super(scene, MODELS.totem, pos);
    this.type = 'totem';
    this.ddTier = ddTier;
    this.hp = ddTier ? ddTier * 10 : 25;
    this.radius = 1.7;
    this.score = 10;
    if (ddTier) this.gemDrop = ddTier;
    this.hitY = 1.7;
    this.interval = interval;
    this.spawnTimer = ddTier ? 3 : interval * 0.5;
    this.emit = false;
    this.orbitR = Math.hypot(pos.x, pos.z);
    this.orbitA = Math.atan2(pos.z, pos.x);
    this.ringTimer = 5 + Math.random() * 3;
    this.ringReq = false;
  }
  center(out) { return out.set(this.pos.x, this.hitY, this.pos.z); }
  mouthPos(out) { return out.set(this.pos.x, 2.9, this.pos.z); }
  update(dt) {
    this.baseUpdate(dt);
    this.group.rotation.y += dt * 0.6;
    if (this.spawnK < 1) return;
    this.orbitA += dt * 0.05;
    this.pos.x = Math.cos(this.orbitA) * this.orbitR;
    this.pos.z = Math.sin(this.orbitA) * this.orbitR;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) { this.spawnTimer = this.interval; this.emit = true; }
    if (this.ddTier) return;
    this.ringTimer -= dt;
    if (this.ringTimer <= 0) { this.ringTimer = 6; this.ringReq = true; }
  }
}

export class Spider extends VoxelEnemy {
  constructor(scene, pos, ddRules = false) {
    super(scene, MODELS.spider, pos);
    this.type = 'spider';
    this.ddRules = ddRules;
    this.hp = ddRules ? 25 : 6;
    this.radius = 0.9;
    this.score = 3;
    if (ddRules) this.gemDrop = 1;
    this.stolen = 0;
    this.vel = new THREE.Vector3();
    this.wanderT = 0;
    this.wander = new THREE.Vector3();
    this.eggT = 8 + Math.random() * 4;
    this.layEgg = false;
    this.pos.y = 0.45;
  }
  update(dt, playerEye, gems) {
    this.baseUpdate(dt);
    let target = null, best = Infinity;
    if (gems) {
      for (const g of gems.active) {
        const d2 = g.m.position.distanceToSquared(this.pos);
        if (d2 < best) { best = d2; target = g; }
      }
    }
    if (target) {
      _dir.copy(target.m.position).sub(this.pos);
      _dir.y = 0;
      const d = _dir.length();
      if (d < 0.8) {
        gems.recycle(gems.active.indexOf(target));
        this.stolen++;
        this.sprite.flash(0.8);
        target = null;
      } else _dir.divideScalar(d);
    }
    if (!target) {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = 4;
        const a = Math.random() * Math.PI * 2;
        this.wander.set(Math.cos(a) * 20, 0, Math.sin(a) * 20);
      }
      _dir.copy(this.wander).sub(this.pos);
      _dir.y = 0;
      _dir.normalize();
    }
    if (this.spawnK >= 1) {
      this.eggT -= dt;
      if (this.eggT <= 0) { this.eggT = 10; this.layEgg = true; }
    }
    this.vel.addScaledVector(_dir, 12 * dt);
    if (this.vel.length() > 5.2) this.vel.setLength(5.2);
    this.pos.addScaledVector(this.vel, dt);
    this.pos.y = 0.45 + Math.abs(Math.sin(performance.now() * 0.012)) * 0.06;
    _c.copy(this.pos).add(this.vel);
    _c.y = this.pos.y;
    this.group.lookAt(_c);
  }
  hit(dmg, dir) {
    super.hit(dmg, dir);
    this.vel.addScaledVector(dir, 4);
    this.vel.y = 0;
  }
}

export class Leviathan extends VoxelEnemy {
  constructor(scene, interval) {
    super(scene, MODELS.leviathan, new THREE.Vector3(0, 3.2, 0));
    this.type = 'leviathan';
    this.hp = 60;
    this.radius = 4.2;
    this.score = 25;
    this.interval = interval;
    this.spawnTimer = interval;
    this.emit = false;
    this.pullCycle = 6;
    this.pullT = 0;
    this.pullStarted = false;
    this.bobT = 0;
  }
  get pullActive() { return this.pullT > 0; }
  mouthPos(out) { return out.set(this.pos.x, 4.8, this.pos.z); }
  update(dt) {
    this.baseUpdate(dt);
    this.bobT += dt;
    this.group.rotation.y += dt * 0.4;
    this.pos.y = 3.2 + Math.sin(this.bobT * 0.9) * 0.35;
    if (this.spawnK < 1) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) { this.spawnTimer = this.interval; this.emit = true; }
    this.pullCycle -= dt;
    if (this.pullCycle <= 0) { this.pullCycle = 9; this.pullT = 1.8; this.pullStarted = true; }
    if (this.pullT > 0) this.pullT -= dt;
  }
}

export class SerpentSegment extends VoxelEnemy {
  constructor(scene, pos, isHead, ghost = false) {
    super(scene, ghost
      ? (isHead ? MODELS.serpentGhostHead : MODELS.serpentGhost)
      : (isHead ? MODELS.serpentHead : MODELS.serpent), pos);
    this.type = 'serpent';
    this.isHead = isHead;
    this.armored = ghost;
    this.hp = isHead ? 4 : 2;
    this.radius = isHead ? 0.85 : 0.7;
    this.score = isHead ? 3 : 1;
  }
  update(dt) { this.baseUpdate(dt); }
}

export class Serpent {
  constructor(scene, origin, bound, ghost = false, nSeg = 12) {
    this.bound = bound;
    this.ghost = ghost;
    this.t = Math.random() * 10;
    this.attackT = 6;
    this.attacking = 0;
    this.vel = new THREE.Vector3(0, -4, 0);
    this.segments = [];
    for (let i = 0; i < nSeg; i++) {
      const pos = origin.clone();
      pos.y += i * 0.95;
      this.segments.push(new SerpentSegment(scene, pos, i === 0, ghost));
    }
  }
  get alive() { return this.segments.some(s => s.alive); }
  update(dt, playerEye) {
    this.t += dt;
    const chain = this.segments.filter(s => s.alive);
    if (!chain.length) return;
    const head = chain[0];
    this.attackT -= dt;
    if (this.attackT <= 0) { this.attacking = 1.6; this.attackT = 8; }
    let speed = 8.5;
    const _tv = new THREE.Vector3();
    const _sd = new THREE.Vector3();
    if (this.attacking > 0) {
      this.attacking -= dt;
      _tv.copy(playerEye);
      speed = 12.5;
    } else {
      const a = this.t * 0.55;
      _tv.set(
        playerEye.x + Math.cos(a) * 9.5,
        4.8 + Math.sin(this.t * 1.1) * 3.9,
        playerEye.z + Math.sin(a) * 9.5,
      );
    }
    _sd.copy(_tv).sub(head.pos).normalize();
    this.vel.addScaledVector(_sd, 13 * dt);
    if (this.vel.length() > speed) this.vel.setLength(speed);
    head.pos.addScaledVector(this.vel, dt);
    if (head.pos.y < 0.8) head.pos.y = 0.8;
    const hr = Math.hypot(head.pos.x, head.pos.z);
    if (hr > this.bound) { head.pos.x *= this.bound / hr; head.pos.z *= this.bound / hr; }
    head.group.lookAt(_tv.copy(head.pos).add(this.vel));
    let prev = head;
    for (let i = 1; i < chain.length; i++) {
      const s = chain[i];
      _sd.copy(prev.pos).sub(s.pos);
      const d = _sd.length() || 0.001;
      const spacing = 0.95;
      if (d > spacing) s.pos.addScaledVector(_sd, (d - spacing) / d);
      if (s.pos.y < 0.6) s.pos.y = 0.6;
      s.group.lookAt(prev.pos);
      prev = s;
    }
  }
}
