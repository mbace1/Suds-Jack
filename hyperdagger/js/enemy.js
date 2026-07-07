import * as THREE from 'three';
import { VoxelSprite, MODELS } from './voxel.js?v=1';

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

/** Gilded skull — faster, 2 HP, appears later in a run. */
export class Wraith extends Skull {
  constructor(scene, pos, speedBoost = 0) {
    super(scene, pos, speedBoost + 1.8, MODELS.skull2);
    this.hp = 2;
    this.score = 2;
    this.accel = 18;
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

/** Drifting obsidian pillar that exhales skulls from its mouth. */
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
    this.orbitR = Math.hypot(pos.x, pos.z);
    this.orbitA = Math.atan2(pos.z, pos.x);
  }

  center(out) { return out.set(this.pos.x, this.hitY, this.pos.z); }

  mouthPos(out) { return out.set(this.pos.x, 2.9, this.pos.z); }

  update(dt) {
    this.baseUpdate(dt);
    this.group.rotation.y += dt * 0.6;
    if (this.spawnK < 1) return;
    // slow orbit around the arena centre
    this.orbitA += dt * 0.05;
    this.pos.x = Math.cos(this.orbitA) * this.orbitR;
    this.pos.z = Math.sin(this.orbitA) * this.orbitR;
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.interval;
      this.emit = true;
    }
  }
}

/**
 * Gem thief (Devil Daggers spider homage). Skitters on the floor toward loose
 * gems and eats them; killing it releases everything it swallowed plus one.
 */
export class Spider extends VoxelEnemy {
  constructor(scene, pos) {
    super(scene, MODELS.spider, pos);
    this.type = 'spider';
    this.hp = 6;
    this.radius = 0.9;
    this.score = 3;
    this.stolen = 0;
    this.vel = new THREE.Vector3();
    this.wanderT = 0;
    this.wander = new THREE.Vector3();
    this.pos.y = 0.45;
  }

  update(dt, playerEye, gems) {
    this.baseUpdate(dt);
    // chase the nearest loose gem; otherwise skitter between edge waypoints
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
      } else {
        _dir.divideScalar(d);
      }
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
    this.vel.addScaledVector(_dir, 12 * dt);
    if (this.vel.length() > 4.5) this.vel.setLength(4.5);
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

/**
 * Late-game boss (Devil Daggers Leviathan homage): a huge dark god-head that
 * rises at the arena centre, exhales skulls, and periodically drags the
 * player toward itself — dash out or die on its face.
 */
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
    this.pullCycle = 6;   // first pull comes fairly quickly
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
    if (this.spawnTimer <= 0) {
      this.spawnTimer = this.interval;
      this.emit = true;
    }
    this.pullCycle -= dt;
    if (this.pullCycle <= 0) {
      this.pullCycle = 9;
      this.pullT = 1.8;
      this.pullStarted = true; // main plays the warning + applies the drag
    }
    if (this.pullT > 0) this.pullT -= dt;
  }
}

/** One destructible ring of the serpent. Moved by its Serpent controller. */
export class SerpentSegment extends VoxelEnemy {
  constructor(scene, pos, isHead) {
    super(scene, isHead ? MODELS.serpentHead : MODELS.serpent, pos);
    this.type = 'serpent';
    this.isHead = isHead;
    this.hp = isHead ? 4 : 2;
    this.radius = isHead ? 0.85 : 0.7;
    this.score = isHead ? 3 : 1;
  }

  update(dt) { this.baseUpdate(dt); }
}

const _tv = new THREE.Vector3();
const _sd = new THREE.Vector3();

/**
 * Segmented flying worm (Devil Daggers centipede homage). Owns an array of
 * SerpentSegment enemies; the caller pushes them into the main enemies list so
 * daggers/player collisions reuse the normal loops. The controller snakes the
 * head around the player, dive-bombing every few seconds, and chain-follows
 * the surviving segments behind it.
 */
export class Serpent {
  constructor(scene, origin, bound, nSeg = 12) {
    this.bound = bound;
    this.t = Math.random() * 10;
    this.attackT = 6;
    this.attacking = 0;
    this.vel = new THREE.Vector3(0, -4, 0);
    this.segments = [];
    for (let i = 0; i < nSeg; i++) {
      const pos = origin.clone();
      pos.y += i * 0.95;
      this.segments.push(new SerpentSegment(scene, pos, i === 0));
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
    let speed = 7.5;
    if (this.attacking > 0) {
      this.attacking -= dt;
      _tv.copy(playerEye);       // dive-bomb straight at the player
      speed = 11;
    } else {
      const a = this.t * 0.55;   // weave a ring around the player
      _tv.set(
        playerEye.x + Math.cos(a) * 11,
        3.2 + Math.sin(this.t * 0.8) * 2.4,
        playerEye.z + Math.sin(a) * 11,
      );
    }

    _sd.copy(_tv).sub(head.pos).normalize();
    this.vel.addScaledVector(_sd, 9 * dt);
    if (this.vel.length() > speed) this.vel.setLength(speed);
    head.pos.addScaledVector(this.vel, dt);
    if (head.pos.y < 0.8) head.pos.y = 0.8;
    const hr = Math.hypot(head.pos.x, head.pos.z);
    if (hr > this.bound) {
      head.pos.x *= this.bound / hr;
      head.pos.z *= this.bound / hr;
    }
    head.group.lookAt(_tv.copy(head.pos).add(this.vel));

    // rigid chain-follow through the surviving segments
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
