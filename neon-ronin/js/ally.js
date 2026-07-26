import * as THREE from 'three';
import { buildSamurai, poseStance, poseRun, poseIdle, poseSwing, setFlash } from './robots.js';

// ── Squad allies ──────────────────────────────────────────────────────────────
// Recruited via the RONIN BANNER card. They hold a ring formation around the
// player, auto-engage anything that comes close, and the CHARGE command (E /
// touch button) sends the whole squad hunting with a damage+speed boost.
// Death costs nothing but the body — fallen allies stand back up next room.

export const ALLY_ACCENT = 0x9ac7ff;   // steel blue: reads friendly vs enemy reds
export const ALLY_RADIUS = 0.5;
const ALLY_HP = 50;
const FOLLOW_R = 2.3;
const ENGAGE_R = 4;       // picks fights this close to itself while escorting
const CHARGE_HUNT_R = 16; // during CHARGE, hunts anything in the room
const SWING_DUR = 0.42;
const ATTACK_RANGE = 2.4;
const ATTACK_ARC = 100;
const BASE_DMG = 12;

const _v = new THREE.Vector3();

export class Ally {
  constructor(scene, x, z) {
    this.scene = scene;
    this.rig = buildSamurai({ accent: ALLY_ACCENT, body: 0x222b38, weapon: 'katana' });
    this.mesh = this.rig.group;
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
    this.hp = ALLY_HP;
    this.radius = ALLY_RADIUS;
    this.yaw = 0;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.swingT = -1;
    this.struck = false;
    this.attackCd = 0;
    this.flashT = 0;
    this.knock = new THREE.Vector3();
    this.chargeT = 0;
    this.dead = false;
  }

  get pos() { return this.mesh.position; }

  hurt(dmg, fromPos) {
    if (this.dead) return;
    this.hp -= dmg;
    this.flashT = 0.1;
    setFlash(this.rig, true);
    if (fromPos) {
      _v.subVectors(this.pos, fromPos).setY(0).normalize();
      this.knock.addScaledVector(_v, 3);
    }
    if (this.hp <= 0) this.dead = true;   // main handles shards + mesh removal
  }

  revive(x, z) {
    this.dead = false;
    this.hp = ALLY_HP;
    this.swingT = -1;
    this.chargeT = 0;
    this.mesh.position.set(x, 0, z);
    this.scene.add(this.mesh);
  }

  charge() { this.chargeT = 4; }

  _faceTowards(x, z, dt, rate = 12) {
    const want = Math.atan2(x - this.pos.x, z - this.pos.z);
    let d = want - this.yaw;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * Math.min(1, rate * dt);
    this.mesh.rotation.y = this.yaw;
  }

  // ctx: main's frame ctx (enemies, combat, effects, dt, t, arenaR, playerPos)
  update(ctx, slot, count) {
    const { dt, t } = ctx;
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.chargeT = Math.max(0, this.chargeT - dt);
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) setFlash(this.rig, false);
    }
    this.pos.addScaledVector(this.knock, dt);
    this.knock.multiplyScalar(Math.max(0, 1 - 9 * dt));

    const charging = this.chargeT > 0;
    const dmgMul = charging ? 1.5 : 1;
    const spdMul = charging ? 1.4 : 1;

    // nearest live enemy inside my engagement bubble
    let foe = null, foeD = charging ? CHARGE_HUNT_R : ENGAGE_R;
    for (const e of ctx.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
      if (d < foeD) { foeD = d; foe = e; }
    }

    poseStance(this.rig);

    if (this.swingT >= 0) {
      // mid-swing: rooted, finish the cut
      this.swingT += dt;
      const k = Math.min(this.swingT / SWING_DUR, 1);
      poseSwing(this.rig, k);
      if (!this.struck && k >= 0.5) {
        this.struck = true;
        ctx.combat.allyStrike(this.pos, this.yaw, ATTACK_RANGE, ATTACK_ARC, BASE_DMG * dmgMul);
        ctx.effects.slashArc(this.pos, this.yaw, ATTACK_RANGE, ATTACK_ARC, ALLY_ACCENT);
      }
      if (k >= 1) { this.swingT = -1; this.attackCd = charging ? 0.25 : 0.55; }
    } else if (foe) {
      // engage: close in, then cut
      this._faceTowards(foe.pos.x, foe.pos.z, dt);
      if (foeD > 1.9) {
        _v.subVectors(foe.pos, this.pos).setY(0).normalize();
        const sp = 5.6 * spdMul;
        this.pos.addScaledVector(_v, sp * dt);
        this.walkPhase += dt * sp * 2.2;
        poseRun(this.rig, this.walkPhase, charging ? 1 : 0.7);
      } else if (this.attackCd <= 0) {
        this.swingT = 0;
        this.struck = false;
        ctx.audio.slash();
      } else {
        poseIdle(this.rig, t + this.walkPhase);
      }
    } else {
      // escort: hold my formation slot around the player
      const a = (slot / Math.max(count, 1)) * Math.PI * 2 + Math.PI / count;
      const sx = ctx.playerPos.x + Math.sin(a) * FOLLOW_R;
      const sz = ctx.playerPos.z + Math.cos(a) * FOLLOW_R;
      const d = Math.hypot(sx - this.pos.x, sz - this.pos.z);
      if (d > 0.35) {
        const sprint = d > 6 ? 8.5 : 5.8;
        _v.set(sx - this.pos.x, 0, sz - this.pos.z).normalize();
        this._faceTowards(sx, sz, dt);
        this.pos.addScaledVector(_v, sprint * dt);
        this.walkPhase += dt * sprint * 2.2;
        poseRun(this.rig, this.walkPhase, Math.min(1, d / 3));
      } else {
        this._faceTowards(ctx.playerPos.x + Math.sin(this.yaw), ctx.playerPos.z + Math.cos(this.yaw), dt, 2);
        poseIdle(this.rig, t + this.walkPhase);
      }
    }

    // stay off the player's toes and out of each other
    for (const other of ctx.allies) {
      if (other === this || other.dead) continue;
      const dx = this.pos.x - other.pos.x, dz = this.pos.z - other.pos.z;
      const d2 = dx * dx + dz * dz, min = 0.9;
      if (d2 > 0.0001 && d2 < min * min) {
        const d = Math.sqrt(d2);
        this.pos.x += (dx / d) * (min - d) * 0.5;
        this.pos.z += (dz / d) * (min - d) * 0.5;
      }
    }

    const r = Math.hypot(this.pos.x, this.pos.z), maxR = ctx.arenaR - 1;
    if (r > maxR) { this.pos.x *= maxR / r; this.pos.z *= maxR / r; }
  }
}
