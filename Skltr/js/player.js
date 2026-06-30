import * as THREE from 'three';
import { Figure, C } from './shared.js?v=2';
import { computeStats } from './items.js?v=2';

const Y = new THREE.Vector3(0, 1, 0);
const GRAV = 26, JUMP_V = 9.5, SPRINT_MUL = 1.5;

// Cooldowns (seconds). Dash (q) is short — Returnal makes the i-frame dodge the
// central defensive verb for weaving through dense projectile clusters.
const CD = { m2: 2.6, q: 2.3, r: 9.0 };

// Returnal-style Adrenaline: kills without taking a hit climb 5 tiers; a single hit
// wipes it. Each tier escalates damage + fire rate.
const ADR_THRESH = [3, 6, 10, 15, 21];   // cumulative kills for tiers 1..5

export class Player {
  constructor(scene, pool) {
    this.scene = scene; this.pool = pool;
    this.fig = new Figure(scene, { accent: C.player, scale: 1.0, gun: true });
    this.inv = new Map();             // itemId → count
    this.reset();
  }

  reset() {
    this.x = 0; this.z = 0; this.y = 0; this.vy = 0; this.yaw = 0;
    this.vx = 0; this.vz = 0;
    this.inv.clear(); this.recompute();
    this.hp = this.stats.maxHp;
    this.cool = { m2: 0, q: 0, r: 0 };
    this.fireT = 0; this.aimHold = 0; this.iframe = 0; this.alive = true;
    this.adr = 0; this.adrKills = 0;   // adrenaline tier (0..5) + kills banked toward the next
    this.fig.group.visible = true;
  }

  // adrenaline buffs
  adrDmgMul()  { return 1 + 0.07 * this.adr; }
  adrFireMul() { return 1 / (1 + 0.09 * this.adr); }
  addKill() {
    this.adrKills++;
    let t = 0; for (const k of ADR_THRESH) if (this.adrKills >= k) t++;
    this.adr = t;
  }

  recompute() {
    const prevMax = this.stats ? this.stats.maxHp : 0;
    this.stats = computeStats(this.inv);
    if (this.hp != null && this.stats.maxHp > prevMax) this.hp += this.stats.maxHp - prevMax; // new HP from gear is granted
  }
  addItem(id) { this.inv.set(id, (this.inv.get(id) || 0) + 1); this.recompute(); }

  get pos() { return { x: this.x, z: this.z }; }
  forward() { return new THREE.Vector3(0, 0, -1).applyAxisAngle(Y, this.yaw); }
  right()   { return new THREE.Vector3(1, 0, 0).applyAxisAngle(Y, this.yaw); }

  // pick an aim direction: camera-forward, snapping onto a near enemy in the front cone
  aimDir(enemies) {
    const f = this.forward();
    let best = null, bestDot = 0.62, bestD = 1e9;
    for (const e of enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.x, dz = e.z - this.z, d = Math.hypot(dx, dz);
      if (d < 0.1 || d > 34) continue;
      const dot = (dx / d) * f.x + (dz / d) * f.z;
      if (dot > bestDot && d < bestD) { bestDot = dot; bestD = d; best = { x: dx / d, z: dz / d }; }
    }
    return best || { x: f.x, z: f.z };
  }

  _shoot(dir, n, dmgMul, color, speed = 38, pierce = this.stats.pierce) {
    const base = Math.atan2(dir.x, dir.z);
    const spread = 0.16;
    for (let i = 0; i < n; i++) {
      const off = n === 1 ? 0 : (i - (n - 1) / 2) * spread;
      const a = base + off;
      const crit = Math.random() < this.stats.critChance;
      const dmg = this.stats.damage * dmgMul * this.adrDmgMul() * (crit ? this.stats.critMult : 1);
      this.pool.spawn(this.x, this.z, Math.sin(a), Math.cos(a), {
        fromPlayer: true, speed, damage: dmg, crit, pierce, color, y: 1.0, r: 0.4,
      });
    }
    this.aimHold = 0.25;
  }

  primary(enemies) {
    if (this.fireT > 0) return;
    this.fireT = this.stats.fireInterval * this.adrFireMul();
    this._shoot(this.aimDir(enemies), 1 + this.stats.forks, 1, C.player);
  }
  secondary(enemies) {                       // PHASE ROUND — heavy piercing slug
    if (this.cool.m2 > 0) return; this.cool.m2 = CD.m2;
    this._shoot(this.aimDir(enemies), 1, 3.2, 0x0ed0c0, 46, this.stats.pierce + 4);
  }
  utility() {                                // TACTICAL DASH — i-frames
    if (this.cool.q > 0) return; this.cool.q = CD.q;
    const move = Math.hypot(this.vx, this.vz) > 0.5 ? { x: this.vx, z: this.vz } : this.forward();
    const d = Math.hypot(move.x, move.z) || 1;
    this.vx = move.x / d * 26; this.vz = move.z / d * 26; this.iframe = 0.4;
  }
  special(enemies) {                         // NOVA — radial burst
    if (this.cool.r > 0) return; this.cool.r = CD.r;
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const crit = Math.random() < this.stats.critChance;
      this.pool.spawn(this.x, this.z, Math.sin(a), Math.cos(a), {
        fromPlayer: true, speed: 30, damage: this.stats.damage * 1.5 * (crit ? this.stats.critMult : 1),
        crit, pierce: 2, color: 0xffd34d, y: 1.0, r: 0.4, life: 1.2,
      });
    }
  }

  tryJump() { if (this.alive && this.y <= 0.001) this.vy = JUMP_V; }   // mobile jump button

  hurt(d) {
    if (!this.alive || this.iframe > 0) return;
    this.hp -= d; this.fig.hit();
    this.adr = 0; this.adrKills = 0;               // any hit wipes adrenaline (Returnal)
    if (this.hp <= 0) { this.hp = 0; this.alive = false; this.fig.group.visible = false; }
  }
  heal(a) { this.hp = Math.min(this.stats.maxHp, this.hp + a); }

  update(dt, input) {
    // cooldowns / timers
    for (const k of ['m2', 'q', 'r']) this.cool[k] = Math.max(0, this.cool[k] - dt);
    this.fireT = Math.max(0, this.fireT - dt);
    this.aimHold = Math.max(0, this.aimHold - dt);
    this.iframe = Math.max(0, this.iframe - dt);
    if (!this.alive) return;

    // regen
    this.heal(this.stats.regen * dt);

    // planar movement (camera-relative)
    const f = this.forward(), r = this.right();
    let dx = f.x * input.moveZ + r.x * input.moveX;
    let dz = f.z * input.moveZ + r.z * input.moveX;
    const m = Math.hypot(dx, dz);
    const sprint = input.sprint && m > 0.1;
    const spd = this.stats.moveSpeed * (sprint ? SPRINT_MUL : 1);
    if (m > 0.001) { dx /= m; dz /= m; }
    const tvx = dx * spd, tvz = dz * spd;
    // blend toward target velocity (dash leaves residual velocity that decays)
    const accel = this.iframe > 0 ? 2 : 12;
    this.vx += (tvx - this.vx) * Math.min(1, dt * accel);
    this.vz += (tvz - this.vz) * Math.min(1, dt * accel);
    this.x += this.vx * dt; this.z += this.vz * dt;
    const R = 46; this.x = Math.max(-R, Math.min(R, this.x)); this.z = Math.max(-R, Math.min(R, this.z));

    // jump / gravity
    if (input.jump && this.y <= 0.001) this.vy = JUMP_V;
    this.vy -= GRAV * dt; this.y += this.vy * dt;
    if (this.y < 0) { this.y = 0; this.vy = 0; }

    // face the aim, animate
    this.yaw = input.yaw;
    this.fig.group.position.set(this.x, this.y, this.z);
    this.fig.group.rotation.y = this.yaw;
    this.fig.update(dt, { speed: Math.hypot(this.vx, this.vz), aim: this.aimHold > 0 ? 1 : 0, lean: sprint ? 0.18 : 0 });

    // auto-fire primary while held (and not sprinting, RoR2-style)
    if (input.firing && !sprint) this.primary(input.enemies || []);
  }
}
