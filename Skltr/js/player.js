import * as THREE from 'three';
import { Bunny, C } from './shared.js?v=3';

const ADR_THRESH = [3, 6, 10, 15, 21];   // cumulative no-hit kills for tiers 1..5

// Tuned for Returnal's second-to-second: fast, twitchy, dash-centric, now with a jump.
const BASE = {
  damage: 9, fireInterval: 0.11, moveSpeed: 8.2, sprintMul: 1.4, maxHp: 100,
  dashCD: 1.0, dashSpeed: 30, dashTime: 0.18, iframe: 0.34,
  airDashSpeed: 26, jumpV: 10.5, grav: 26,
};

export class Player {
  constructor(scene, pool) {
    this.scene = scene; this.pool = pool;
    this.fig = new Bunny(scene);
    this.autoAim = true;
    this.reset();
  }

  reset() {
    this.x = 0; this.z = 0; this.y = 0; this.vy = 0;
    this.vx = 0; this.vz = 0; this.yaw = 0;
    this.hp = BASE.maxHp; this.maxHp = BASE.maxHp;
    this.fireT = 0; this.dashCD = 0; this.dashT = 0; this.iframe = 0;
    this.airDashUsed = false; this._fired = false; this._target = false;
    this.adr = 0; this.adrKills = 0; this.alive = true;
    this.fig.visible(true);
  }

  grounded() { return this.y <= 0.02; }
  adrDmgMul()  { return 1 + 0.06 * this.adr; }
  adrFireMul() { return 1 / (1 + 0.08 * this.adr); }
  addKill() { this.adrKills++; let t = 0; for (const k of ADR_THRESH) if (this.adrKills >= k) t++; this.adr = t; }

  // ── traversal verbs ──
  jump() { if (this.alive && this.grounded()) { this.vy = BASE.jumpV; return true; } return false; }
  groundDash(dir) {
    if (!this.alive || !this.grounded() || this.dashCD > 0) return false;
    this.dashCD = BASE.dashCD; this.dashT = BASE.dashTime; this.iframe = BASE.iframe;
    this.vx = dir.x * BASE.dashSpeed; this.vz = dir.z * BASE.dashSpeed; return true;
  }
  airDash(dir) {
    if (!this.alive || this.grounded() || this.airDashUsed) return false;
    this.airDashUsed = true; this.dashT = BASE.dashTime; this.iframe = BASE.iframe; this.vy = 0;
    this.vx = dir.x * BASE.airDashSpeed; this.vz = dir.z * BASE.airDashSpeed; return true;
  }

  // 3D aim result: camera-forward, snapping onto a near enemy in the sights (locked).
  _aim(aim, enemies) {
    let bx = aim.fx, by = aim.fy, bz = aim.fz, bestDot = 0.9, locked = false;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.x, dy = e.y - 1.25, dz = e.z - this.z;
      const d = Math.hypot(dx, dy, dz); if (d < 0.1 || d > 42) continue;
      const dot = (dx / d) * aim.fx + (dy / d) * aim.fy + (dz / d) * aim.fz;
      if (dot > bestDot) { bestDot = dot; bx = dx / d; by = dy / d; bz = dz / d; locked = true; }
    }
    return { x: bx, y: by, z: bz, locked };
  }

  _fire(dir) {
    this.fireT = BASE.fireInterval * this.adrFireMul();
    const dmg = BASE.damage * this.adrDmgMul();
    this.pool.spawn(this.x + dir.x * 0.4, 1.25 + dir.y * 0.4, this.z + dir.z * 0.4, dir.x, dir.y, dir.z,
      { fromPlayer: true, speed: 46, damage: dmg, color: C.shot, r: 0.4, life: 1.6 });
    this._fired = true;
  }

  hurt(d) {
    if (!this.alive || this.iframe > 0) return;
    this.hp -= d; this.fig.hit();
    this.adr = 0; this.adrKills = 0;             // any hit wipes adrenaline (Returnal)
    if (this.hp <= 0) { this.hp = 0; this.alive = false; this.fig.visible(false); }
  }
  heal(a) { this.hp = Math.min(this.maxHp, this.hp + a); }

  update(dt, input, aim, enemies) {
    this._fired = false;
    this.fireT = Math.max(0, this.fireT - dt);
    this.dashCD = Math.max(0, this.dashCD - dt);
    this.dashT = Math.max(0, this.dashT - dt);
    this.iframe = Math.max(0, this.iframe - dt);
    if (!this.alive) return;

    // camera-relative ground movement (basis from yaw → robust at any look pitch)
    const sy = Math.sin(aim.yaw), cy = Math.cos(aim.yaw);
    const fwd = { x: -sy, z: -cy }, rgt = { x: cy, z: -sy };
    const mv = input.getMove();
    const sprint = input.sprint && Math.hypot(mv.x, mv.z) > 0.1;
    const spd = BASE.moveSpeed * (sprint ? BASE.sprintMul : 1);
    let dx = fwd.x * mv.z + rgt.x * mv.x, dz = fwd.z * mv.z + rgt.z * mv.x;
    const m = Math.hypot(dx, dz); if (m > 0.001) { dx /= m; dz /= m; }
    const tvx = dx * spd, tvz = dz * spd;
    const accel = this.dashT > 0 ? 1.5 : (this.grounded() ? 13 : 4);   // dash momentum / air control
    this.vx += (tvx - this.vx) * Math.min(1, dt * accel);
    this.vz += (tvz - this.vz) * Math.min(1, dt * accel);
    this.x += this.vx * dt; this.z += this.vz * dt;

    // jump / gravity
    this.vy -= BASE.grav * dt; this.y += this.vy * dt;
    if (this.y <= 0) { this.y = 0; this.vy = 0; this.airDashUsed = false; }

    this.yaw = aim.yaw;
    this.fig.group.position.set(this.x, this.y, this.z);
    this.fig.group.rotation.y = this.yaw;
    this.fig.update(dt, { speed: Math.hypot(this.vx, this.vz), aimPitch: aim.pitch, yOffset: this.y });

    // aim + fire: auto-fire when a target is in the sights (auto-aim), or when held
    const ar = this._aim(aim, enemies);
    this._target = ar.locked;
    const wantFire = !sprint && ((this.autoAim && ar.locked) || input.firing);
    if (wantFire && this.fireT <= 0) this._fire(ar);
  }
}
