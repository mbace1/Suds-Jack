import * as THREE from 'three';
import { buildSamurai, poseStance, poseWalk, poseIdle, poseSwing, setGlow } from './robots.js';

export const PLAYER_RADIUS = 0.55;

// ── The three swappable frames ────────────────────────────────────────────────
// KIRI  — cyan katana, balanced 3-hit combo
// GORO  — magenta great-cleaver, slow, huge arcs and knockback
// SAYA  — lime twin daggers, blender-fast 5-hit chain, quickest dash
export const FORMS = [
  {
    name: 'KIRI', accent: 0x00f0ff, body: 0x1d2530, weapon: 'katana',
    speed: 6.2, dmg: 22, range: 2.7, arc: 110, knock: 4,
    swings: [0.32, 0.3, 0.44], lastHitMult: 1.6, dashCdMult: 1,
  },
  {
    name: 'GORO', accent: 0xff2fd6, body: 0x2c1d2c, weapon: 'cleaver',
    speed: 5.1, dmg: 48, range: 3.3, arc: 150, knock: 8,
    swings: [0.55, 0.62], lastHitMult: 1.4, dashCdMult: 1.2, twoHanded: true,
  },
  {
    name: 'SAYA', accent: 0xa8ff00, body: 0x232b1a, weapon: 'daggers',
    speed: 7.3, dmg: 11, range: 2.2, arc: 90, knock: 2,
    swings: [0.17, 0.17, 0.17, 0.17, 0.2], lastHitMult: 2, dashCdMult: 0.65,
  },
];

const SWAP_CD  = 2.2;
const DASH_DUR = 0.22;
const DASH_SPD = 19;
const DASH_CD  = 0.95;
const HURT_IFRAMES = 0.6;

const _v = new THREE.Vector3();

export class Player {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.rigs = FORMS.map((f) => {
      const rig = buildSamurai(f);
      rig.group.visible = false;
      this.group.add(rig.group);
      return rig;
    });
    this.form = 0;
    this.rigs[0].group.visible = true;

    // run-modifiable stats (upgrades multiply these)
    this.stats = {
      dmgMul: 1, spdMul: 1, atkSpdMul: 1, dashCdMul: 1, swapCdMul: 1,
      maxHp: 100, dmgTakenMul: 1, lifesteal: 0, swapDmgMul: 1,
    };
    this.hp = this.stats.maxHp;

    this.yaw = Math.PI;      // face away from the spawn camera
    this.walkPhase = 0;
    this.moving = false;

    this.attackT = -1;      // <0 idle, else elapsed time in current swing
    this.swingIdx = 0;
    this.struck = false;
    this.chainBuffered = false;

    this.dashT = -1;
    this.dashCd = 0;
    this.dashDir = new THREE.Vector3(0, 0, 1);
    this.swapCd = 0;
    this.iframes = 0;
    this.dead = false;
  }

  get pos() { return this.group.position; }
  get conf() { return FORMS[this.form]; }
  get rig() { return this.rigs[this.form]; }
  get invincible() { return this.dashT >= 0 || this.iframes > 0; }

  reset() {
    this.stats = {
      dmgMul: 1, spdMul: 1, atkSpdMul: 1, dashCdMul: 1, swapCdMul: 1,
      maxHp: 100, dmgTakenMul: 1, lifesteal: 0, swapDmgMul: 1,
    };
    this.hp = this.stats.maxHp;
    this.pos.set(0, 0, 0);
    this.yaw = Math.PI;
    this.attackT = -1;
    this.dashT = -1;
    this.dashCd = 0;
    this.swapCd = 0;
    this.iframes = 0;
    this.dead = false;
    this._setForm(0);
  }

  _setForm(i) {
    this.rigs[this.form].group.visible = false;
    this.form = i;
    poseStance(this.rig);
    this.rig.group.visible = true;
    this.attackT = -1;
    this.chainBuffered = false;
  }

  hurt(dmg) {
    if (this.dead || this.invincible) return false;
    this.hp -= dmg * this.stats.dmgTakenMul;
    this.iframes = HURT_IFRAMES;
    if (this.hp <= 0) { this.hp = 0; this.dead = true; }
    return true;
  }

  heal(n) { this.hp = Math.min(this.stats.maxHp, this.hp + n); }

  // ctx: { input, camYaw, dt, t, combat, effects, audio, enemies, arenaR }
  update(ctx) {
    const { input, camYaw, dt, t } = ctx;
    const c = this.conf;

    this.dashCd = Math.max(0, this.dashCd - dt);
    this.swapCd = Math.max(0, this.swapCd - dt);
    this.iframes = Math.max(0, this.iframes - dt);

    // hurt/dash flicker
    this.rig.group.visible = this.iframes > 0 ? (t * 24 | 0) % 2 === 0 : true;

    // ── swap ──
    const swapReq = input.consumeSwap();
    if (swapReq >= 0 && this.swapCd <= 0 && this.dashT < 0) {
      const target = swapReq === 3 ? (this.form + 1) % FORMS.length : swapReq;
      if (target !== this.form) {
        this._setForm(target);
        this.swapCd = SWAP_CD * this.stats.swapCdMul;
        this.iframes = Math.max(this.iframes, 0.35);
        const burst = 35 * this.stats.swapDmgMul * this.stats.dmgMul;
        ctx.combat.meleeStrike(this.pos, this.yaw, 3.4, 360, burst, this.conf.knock + 3, this.conf.accent);
        ctx.effects.ring(this.pos, 3.4, 0.3, this.conf.accent, true);
        ctx.effects.sparks(this.pos, this.conf.accent, 10, 5);
        ctx.audio.swap();
      }
    }

    // ── movement input (camera-relative) ──
    const axes = input.moveAxes();
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw);   // screen-forward
    const rx = Math.cos(camYaw),  rz = -Math.sin(camYaw);   // screen-right
    let mx = fx * axes.y + rx * axes.x;
    let mz = fz * axes.y + rz * axes.x;
    const mLen = Math.hypot(mx, mz);
    this.moving = mLen > 0.01;
    if (this.moving) { mx /= mLen; mz /= mLen; }

    // ── dash ──
    if (input.consumeDash() && this.dashCd <= 0 && this.dashT < 0) {
      this.dashT = 0;
      this.dashCd = DASH_CD * c.dashCdMult * this.stats.dashCdMul;
      this.dashDir.set(
        this.moving ? mx : Math.sin(this.yaw), 0,
        this.moving ? mz : Math.cos(this.yaw));
      this.attackT = -1;
      ctx.audio.dash();
    }

    if (this.dashT >= 0) {
      this.dashT += dt;
      this.pos.addScaledVector(this.dashDir, DASH_SPD * dt);
      this.yaw = Math.atan2(this.dashDir.x, this.dashDir.z);
      if ((t * 60 | 0) % 3 === 0) {
        ctx.effects.sparks({ x: this.pos.x, y: 0.6, z: this.pos.z }, c.accent, 2, 2);
      }
      if (this.dashT >= DASH_DUR) this.dashT = -1;
      poseStance(this.rig);
      this.rig.torso.rotation.x = 0.5;
    } else if (this.attackT >= 0) {
      // ── attacking ──
      const dur = c.swings[this.swingIdx] * this.stats.atkSpdMul;
      this.attackT += dt;
      const k = Math.min(this.attackT / dur, 1);
      poseStance(this.rig);
      poseSwing(this.rig, k, c.twoHanded);
      if (input.consumeAttack()) this.chainBuffered = true;

      // lunge forward during the whip
      if (k > 0.3 && k < 0.6) {
        this.pos.x += Math.sin(this.yaw) * 7 * dt;
        this.pos.z += Math.cos(this.yaw) * 7 * dt;
      }
      if (!this.struck && k >= 0.45) {
        this.struck = true;
        const last = this.swingIdx === c.swings.length - 1;
        const dmg = c.dmg * this.stats.dmgMul * (last ? c.lastHitMult : 1);
        ctx.combat.meleeStrike(this.pos, this.yaw, c.range, c.arc, dmg, c.knock * (last ? 1.6 : 1), c.accent);
        ctx.effects.slashArc(this.pos, this.yaw, c.range, c.arc, c.accent);
        c.twoHanded ? ctx.audio.heavy() : ctx.audio.slash();
      }
      if (k >= 1) {
        if (this.chainBuffered && this.swingIdx < c.swings.length - 1) {
          this.swingIdx++;
          this._startSwing(ctx);
        } else {
          this.attackT = -1;
        }
      }
    } else {
      // ── free movement ──
      if (this.moving) {
        const sp = c.speed * this.stats.spdMul;
        this.pos.x += mx * sp * dt;
        this.pos.z += mz * sp * dt;
        this.yaw = Math.atan2(mx, mz);
        this.walkPhase += dt * sp * 2.1;
        poseStance(this.rig);
        poseWalk(this.rig, this.walkPhase);
      } else {
        poseStance(this.rig);
        poseIdle(this.rig, t);
      }
      if (input.consumeAttack()) {
        this.swingIdx = 0;
        this._startSwing(ctx);
      }
    }

    // arena bound
    const r = Math.hypot(this.pos.x, this.pos.z), maxR = ctx.arenaR - 0.9;
    if (r > maxR) { this.pos.x *= maxR / r; this.pos.z *= maxR / r; }

    this.group.rotation.y = this.yaw;
  }

  _startSwing(ctx) {
    this.attackT = 0;
    this.struck = false;
    this.chainBuffered = false;
    // soft-aim: snap to the nearest live enemy in front-ish range
    let best = null, bestD = 7;
    for (const e of ctx.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) this.yaw = Math.atan2(best.pos.x - this.pos.x, best.pos.z - this.pos.z);
  }
}
