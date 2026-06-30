import * as THREE from 'three';
import { Bunny, C } from './shared.js?v=3';

const GROUND_Y = 0;
const ADR_THRESH = [3, 6, 10, 15, 21];   // cumulative no-hit kills for tiers 1..5

// Tuned for Returnal's second-to-second: fast, twitchy, dash-centric.
const BASE = {
  damage: 9, fireInterval: 0.11, moveSpeed: 8.2, sprintMul: 1.4, maxHp: 100, regen: 0,
  dashCD: 1.1, dashSpeed: 30, dashTime: 0.18, iframe: 0.34,
};

export class Player {
  constructor(scene, pool) {
    this.scene = scene; this.pool = pool;
    this.fig = new Bunny(scene, C.player);
    this.reset();
  }

  reset() {
    this.x = 0; this.z = 0; this.y = GROUND_Y;
    this.vx = 0; this.vz = 0; this.yaw = 0;
    this.hp = BASE.maxHp; this.maxHp = BASE.maxHp;
    this.fireT = 0; this.dashCD = 0; this.dashT = 0; this.iframe = 0;
    this.adr = 0; this.adrKills = 0; this.alive = true;
    this.fig.visible(true);
  }

  adrDmgMul()  { return 1 + 0.06 * this.adr; }
  adrFireMul() { return 1 / (1 + 0.08 * this.adr); }
  addKill() { this.adrKills++; let t = 0; for (const k of ADR_THRESH) if (this.adrKills >= k) t++; this.adr = t; }

  dash() {
    if (this.dashCD > 0 || !this.alive) return false;
    this.dashCD = BASE.dashCD; this.dashT = BASE.dashTime; this.iframe = BASE.iframe;
    const m = Math.hypot(this.vx, this.vz);
    let dx, dz;
    if (m > 0.5) { dx = this.vx / m; dz = this.vz / m; }
    else { dx = -Math.sin(this.yaw); dz = -Math.cos(this.yaw); }   // dash where you face
    this.vx = dx * BASE.dashSpeed; this.vz = dz * BASE.dashSpeed;
    return true;
  }

  // 3D aim, snapping onto a near enemy in the look cone for game-feel
  _aimDir(aim, enemies) {
    let bx = aim.fx, by = aim.fy, bz = aim.fz, bestDot = 0.93, best = null;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.x, dy = e.y - 1.25, dz = e.z - this.z;
      const d = Math.hypot(dx, dy, dz); if (d < 0.1 || d > 40) continue;
      const dot = (dx / d) * aim.fx + (dy / d) * aim.fy + (dz / d) * aim.fz;
      if (dot > bestDot) { bestDot = dot; best = { x: dx / d, y: dy / d, z: dz / d }; }
    }
    if (best) { bx = best.x; by = best.y; bz = best.z; }
    return { x: bx, y: by, z: bz };
  }

  primary(aim, enemies) {
    if (this.fireT > 0) return;
    this.fireT = BASE.fireInterval * this.adrFireMul();
    const d = this._aimDir(aim, enemies);
    const dmg = BASE.damage * this.adrDmgMul();
    this.pool.spawn(this.x + d.x * 0.4, 1.25 + d.y * 0.4, this.z + d.z * 0.4, d.x, d.y, d.z,
      { fromPlayer: true, speed: 46, damage: dmg, color: C.shot, r: 0.4, life: 1.6 });
  }

  hurt(d) {
    if (!this.alive || this.iframe > 0) return;
    this.hp -= d; this.fig.hit();
    this.adr = 0; this.adrKills = 0;             // any hit wipes adrenaline (Returnal)
    if (this.hp <= 0) { this.hp = 0; this.alive = false; this.fig.visible(false); }
  }
  heal(a) { this.hp = Math.min(this.maxHp, this.hp + a); }

  update(dt, input, aim, enemies) {
    this.fireT = Math.max(0, this.fireT - dt);
    this.dashCD = Math.max(0, this.dashCD - dt);
    this.dashT = Math.max(0, this.dashT - dt);
    this.iframe = Math.max(0, this.iframe - dt);
    if (!this.alive) return;

    // camera-relative ground movement (basis from yaw → robust at any look pitch)
    const sy = Math.sin(aim.yaw), cy = Math.cos(aim.yaw);
    const fwd = { x: -sy, z: -cy };
    const rgt = { x: cy, z: -sy };
    const mv = input.getMove();
    const sprint = input.sprint && Math.hypot(mv.x, mv.z) > 0.1;
    const spd = BASE.moveSpeed * (sprint ? BASE.sprintMul : 1);
    let dx = fwd.x * mv.z + rgt.x * mv.x, dz = fwd.z * mv.z + rgt.z * mv.x;
    const m = Math.hypot(dx, dz); if (m > 0.001) { dx /= m; dz /= m; }
    const tvx = dx * spd, tvz = dz * spd;
    const accel = this.dashT > 0 ? 1.5 : 13;     // dash leaves decaying momentum
    this.vx += (tvx - this.vx) * Math.min(1, dt * accel);
    this.vz += (tvz - this.vz) * Math.min(1, dt * accel);
    this.x += this.vx * dt; this.z += this.vz * dt;

    this.yaw = aim.yaw;
    this.fig.group.position.set(this.x, this.y, this.z);
    this.fig.group.rotation.y = this.yaw;
    this.fig.update(dt, { speed: Math.hypot(this.vx, this.vz), aimPitch: aim.pitch });

    if (input.firing && !sprint) this.primary(aim, enemies);
  }
}
