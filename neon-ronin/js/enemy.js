import * as THREE from 'three';
import { buildSamurai, poseStance, poseWalk, poseIdle, poseSwing, poseAim, setGlow, setFlash } from './robots.js';

export const ENEMY_RADIUS = 0.55;

export const EnemyType = {
  SLASHER: 'slasher',   // crimson katana bot — closes in, telegraphed slash
  GUNNER:  'gunner',    // violet rifle bot — keeps range, strafes, 3-bolt bursts
  BRUTE:   'brute',     // ember cleaver hulk — slow, ground-slam AoE
};

const CONF = {
  slasher: { hp: 60,  speed: 3.4, score: 100, accent: 0xff3040, body: 0x2a2026, weapon: 'katana',  scale: 1 },
  gunner:  { hp: 40,  speed: 2.6, score: 150, accent: 0xb04dff, body: 0x241f30, weapon: 'rifle',   scale: 0.95 },
  brute:   { hp: 230, speed: 1.5, score: 400, accent: 0xff7300, body: 0x30241c, weapon: 'cleaver', scale: 1.55 },
};

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

// ── Enemy bolt pool (neon projectiles) ────────────────────────────────────────
export class BoltPool {
  constructor(scene, cap = 80) {
    this.scene = scene;
    this.free = [];
    this.active = [];
    const geo = new THREE.OctahedronGeometry(0.16);
    for (let i = 0; i < cap; i++) {
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xcc80ff }));
      mesh.visible = false;
      scene.add(mesh);
      this.free.push({ mesh, vel: new THREE.Vector3(), ttl: 0 });
    }
  }

  spawn(pos, dir, speed, color = 0xcc80ff) {
    const b = this.free.pop();
    if (!b) return;
    b.mesh.position.copy(pos);
    b.mesh.material.color.setHex(color);
    b.mesh.visible = true;
    b.vel.copy(dir).setY(0).normalize().multiplyScalar(speed);
    b.ttl = 4;
    this.active.push(b);
  }

  recycleAt(i) {
    const b = this.active[i];
    b.mesh.visible = false;
    this.active.splice(i, 1);
    this.free.push(b);
  }

  update(dt, arenaR) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const b = this.active[i];
      b.ttl -= dt;
      b.mesh.position.addScaledVector(b.vel, dt);
      b.mesh.rotation.y += 10 * dt;
      const p = b.mesh.position;
      if (b.ttl <= 0 || p.x * p.x + p.z * p.z > arenaR * arenaR) this.recycleAt(i);
    }
  }

  clear() {
    for (let i = this.active.length - 1; i >= 0; i--) this.recycleAt(i);
  }
}

// ── Enemy ─────────────────────────────────────────────────────────────────────
// ctx per frame: { playerPos, dt, t, combat, effects, audio, bolts, enemies, arenaR }
export class Enemy {
  constructor(scene, type, x, z, diff = 1) {
    this.type = type;
    const c = CONF[type];
    this.conf = c;
    this.hp = c.hp * (0.8 + 0.2 * diff);
    this.maxHp = this.hp;
    this.speed = c.speed * (0.9 + 0.1 * diff);
    this.score = c.score;
    this.radius = ENEMY_RADIUS * c.scale;
    this.rig = buildSamurai(c);
    this.mesh = this.rig.group;
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);

    this.state = 'seek';
    this.stateT = 0;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.flashT = 0;
    this.knock = new THREE.Vector3();
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    this.strafeT = 1 + Math.random() * 2;
    this.shootT = 1 + Math.random() * 1.5;
    this.struck = false;
    this.dead = false;
  }

  get pos() { return this.mesh.position; }

  hit(dmg, fromPos) {
    if (this.dead) return false;
    this.hp -= dmg;
    this.flashT = 0.1;
    setFlash(this.rig, true);
    _v.subVectors(this.pos, fromPos).setY(0).normalize();
    this.knock.addScaledVector(_v, this.type === 'brute' ? 1.5 : 4);
    if (this.hp <= 0) { this.dead = true; return true; }
    return false;
  }

  _faceTowards(target, dt, rate = 10) {
    const want = Math.atan2(target.x - this.pos.x, target.z - this.pos.z);
    let d = want - this.mesh.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.mesh.rotation.y += d * Math.min(1, rate * dt);
  }

  update(ctx) {
    const { dt, playerPos } = ctx;
    this.stateT += dt;

    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) setFlash(this.rig, false);
    }

    // knockback decay
    this.pos.addScaledVector(this.knock, dt);
    this.knock.multiplyScalar(Math.max(0, 1 - 9 * dt));

    const dist = Math.hypot(playerPos.x - this.pos.x, playerPos.z - this.pos.z);
    poseStance(this.rig);

    if (this.type === EnemyType.SLASHER) this._slasher(ctx, dist);
    else if (this.type === EnemyType.GUNNER) this._gunner(ctx, dist);
    else this._brute(ctx, dist);

    // separation from other enemies
    for (const e of ctx.enemies) {
      if (e === this || e.dead) continue;
      const dx = this.pos.x - e.pos.x, dz = this.pos.z - e.pos.z;
      const d2 = dx * dx + dz * dz, min = this.radius + e.radius + 0.15;
      if (d2 > 0.0001 && d2 < min * min) {
        const d = Math.sqrt(d2);
        this.pos.x += (dx / d) * (min - d) * 0.5;
        this.pos.z += (dz / d) * (min - d) * 0.5;
      }
    }
    // arena bound
    const r = Math.hypot(this.pos.x, this.pos.z), maxR = ctx.arenaR - 1;
    if (r > maxR) { this.pos.x *= maxR / r; this.pos.z *= maxR / r; }
  }

  _move(ctx, dirX, dirZ, mult = 1) {
    const sp = this.speed * mult;
    this.pos.x += dirX * sp * ctx.dt;
    this.pos.z += dirZ * sp * ctx.dt;
    this.walkPhase += ctx.dt * sp * 2.4;
    poseWalk(this.rig, this.walkPhase, 0.5);
  }

  _slasher(ctx, dist) {
    const { playerPos, dt } = ctx;
    if (this.state === 'seek') {
      this._faceTowards(playerPos, dt);
      if (dist > 2.1) {
        _v.subVectors(playerPos, this.pos).setY(0).normalize();
        this._move(ctx, _v.x, _v.z);
      } else { this.state = 'windup'; this.stateT = 0; }
    } else if (this.state === 'windup') {
      this._faceTowards(playerPos, dt, 4);
      setGlow(this.rig, 1 + this.stateT * 4);
      poseSwing(this.rig, (this.stateT / 0.55) * 0.4);
      if (this.stateT >= 0.55) { this.state = 'strike'; this.stateT = 0; this.struck = false; ctx.audio.slash(); }
    } else if (this.state === 'strike') {
      const k = 0.4 + (this.stateT / 0.18) * 0.28;
      poseSwing(this.rig, Math.min(k, 0.68));
      if (!this.struck && this.stateT >= 0.07) {
        this.struck = true;
        setGlow(this.rig, 1);
        const yaw = this.mesh.rotation.y;
        ctx.effects.slashArc(this.pos, yaw, 2.6, 110, this.conf.accent);
        if (dist < 2.6) {
          const ang = Math.atan2(playerPos.x - this.pos.x, playerPos.z - this.pos.z);
          let d = ang - yaw;
          while (d > Math.PI) d -= Math.PI * 2;
          while (d < -Math.PI) d += Math.PI * 2;
          if (Math.abs(d) < (110 / 2) * (Math.PI / 180)) ctx.combat.hurtPlayer(12, this.pos);
        }
      }
      if (this.stateT >= 0.18) { this.state = 'recover'; this.stateT = 0; }
    } else if (this.state === 'recover') {
      poseSwing(this.rig, 0.68 + (this.stateT / 0.7) * 0.32);
      if (this.stateT >= 0.7) { this.state = 'seek'; this.stateT = 0; }
    }
  }

  _gunner(ctx, dist) {
    const { playerPos, dt } = ctx;
    this._faceTowards(playerPos, dt);
    this.strafeT -= dt;
    if (this.strafeT <= 0) { this.strafeDir *= -1; this.strafeT = 1.5 + Math.random() * 2.5; }

    if (this.state === 'seek') {
      _v.subVectors(playerPos, this.pos).setY(0).normalize();
      // hold a ~9u ring, strafing sideways
      const radial = dist > 11 ? 1 : dist < 7 ? -1 : 0;
      const sx = -_v.z * this.strafeDir, sz = _v.x * this.strafeDir;
      this._move(ctx, _v.x * radial * 0.8 + sx * 0.6, _v.z * radial * 0.8 + sz * 0.6);
      this.shootT -= dt;
      if (this.shootT <= 0 && dist < 16) { this.state = 'aim'; this.stateT = 0; }
    } else if (this.state === 'aim') {
      poseAim(this.rig);
      setGlow(this.rig, 1 + this.stateT * 6);
      if (this.stateT >= 0.35) {
        this.state = 'fire'; this.stateT = 0; this.burst = 3; this.burstT = 0;
      }
    } else if (this.state === 'fire') {
      poseAim(this.rig);
      this.burstT -= dt;
      if (this.burst > 0 && this.burstT <= 0) {
        this.burst--;
        this.burstT = 0.13;
        _v.subVectors(playerPos, this.pos).setY(0).normalize();
        const a = (Math.random() - 0.5) * 0.14;
        const dx = _v.x * Math.cos(a) - _v.z * Math.sin(a);
        const dz = _v.x * Math.sin(a) + _v.z * Math.cos(a);
        ctx.bolts.spawn(_v2.set(this.pos.x, 1.25, this.pos.z), _v.set(dx, 0, dz), 9.5, this.conf.accent);
        ctx.audio.shot();
      }
      if (this.burst <= 0) {
        setGlow(this.rig, 1);
        this.state = 'seek'; this.stateT = 0;
        this.shootT = 2.2 + Math.random() * 0.8;
      }
    }
  }

  _brute(ctx, dist) {
    const { playerPos, dt } = ctx;
    if (this.state === 'seek') {
      this._faceTowards(playerPos, dt, 5);
      if (dist > 2.9) {
        _v.subVectors(playerPos, this.pos).setY(0).normalize();
        this._move(ctx, _v.x, _v.z);
      } else {
        this.state = 'windup'; this.stateT = 0;
        ctx.effects.ring(this.pos, 3.7, 0.9, this.conf.accent);
      }
    } else if (this.state === 'windup') {
      setGlow(this.rig, 1 + this.stateT * 3.5);
      poseSwing(this.rig, (this.stateT / 0.9) * 0.4, true);
      if (this.stateT >= 0.9) {
        this.state = 'slam'; this.stateT = 0; this.struck = false;
      }
    } else if (this.state === 'slam') {
      poseSwing(this.rig, Math.min(0.4 + (this.stateT / 0.16) * 0.28, 0.68), true);
      if (!this.struck && this.stateT >= 0.08) {
        this.struck = true;
        setGlow(this.rig, 1);
        ctx.audio.slam();
        ctx.effects.ring(this.pos, 3.7, 0.35, 0xffffff, true);
        ctx.effects.sparks({ x: this.pos.x, y: 0.3, z: this.pos.z }, this.conf.accent, 12, 6);
        ctx.combat.shake(0.35);
        if (dist < 3.7) ctx.combat.hurtPlayer(25, this.pos, 9);
      }
      if (this.stateT >= 0.16) { this.state = 'recover'; this.stateT = 0; }
    } else if (this.state === 'recover') {
      poseSwing(this.rig, 0.68 + (this.stateT / 1.2) * 0.32, true);
      if (this.stateT >= 1.2) { this.state = 'seek'; this.stateT = 0; }
    }
    if (this.state === 'seek' && dist <= 2.9) poseIdle(this.rig, ctx.t);
  }
}
