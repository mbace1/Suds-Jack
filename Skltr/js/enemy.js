import * as THREE from 'three';
import { Figure, C } from './shared.js?v=2';

// Enemy archetypes. Stats here are the stage-1 baseline; the director multiplies HP
// and damage by the run's scaling coefficient as time / stages climb (RoR2 clock).
const TYPES = {
  grunt:  { hp: 42,   speed: 3.7, dmg: 11, gold: 6,  range: 1.9,  cd: 0.85, scale: 1.0,  ranged: false, accent: C.enemy },
  gunner: { hp: 30,   speed: 2.5, dmg: 8,  gold: 9,  range: 19,   cd: 1.2,  scale: 0.95, ranged: true,  accent: 0xff7a45 },
  brute:  { hp: 120,  speed: 2.9, dmg: 18, gold: 16, range: 2.2,  cd: 1.1,  scale: 1.5,  ranged: false, accent: 0xd11f1f },
  boss:   { hp: 1300, speed: 2.3, dmg: 24, gold: 90, range: 26,   cd: 1.3,  scale: 2.4,  ranged: true,  accent: C.boss, boss: true },
};
export const ENEMY_COST = { grunt: 1, gunner: 1.4, brute: 4, boss: 30 };

export class Enemy {
  constructor(scene, type, scaling) {
    const t = TYPES[type]; this.t = t; this.type = type; this.boss = !!t.boss;
    this.fig = new Figure(scene, { accent: t.accent, scale: t.scale, gun: t.ranged });
    this.maxHp = Math.round(t.hp * scaling.hpMul);
    this.hp = this.maxHp;
    this.dmg = t.dmg * scaling.dmgMul;
    this.gold = Math.round(t.gold * (0.7 + scaling.hpMul * 0.3));
    this.speed = t.speed; this.range = t.range; this.cd = 0; this.alive = true;
    this._volley = 0;
    this.x = 0; this.z = 0;
  }
  place(x, z) { this.x = x; this.z = z; this.fig.group.position.set(x, 0, z); }

  takeDamage(d) { this.hp -= d; this.fig.hit(); if (this.hp <= 0) { this.hp = 0; this.alive = false; } return !this.alive; }
  dispose() { this.fig.dispose(); }

  update(dt, player, pool) {
    if (!this.alive) return;
    this.cd = Math.max(0, this.cd - dt);
    const dx = player.x - this.x, dz = player.z - this.z, d = Math.hypot(dx, dz) || 1e-3;
    this.fig.group.rotation.y = Math.atan2(-dx, -dz);

    const wantClose = this.t.ranged ? this.range * 0.7 : this.range;
    if (d > wantClose) {                       // chase
      const v = this.speed * dt;
      this.x += dx / d * v; this.z += dz / d * v;
    } else if (this.t.ranged && d < this.range * 0.45) {
      const v = this.speed * 0.6 * dt;          // kite back if too close
      this.x -= dx / d * v; this.z -= dz / d * v;
    }

    // attack — ranged enemies fire slow, dense neon clusters (Returnal bullet-hell)
    if (this.cd === 0 && d <= this.range) {
      this.cd = this.t.cd;
      if (this.t.ranged) {
        const a = Math.atan2(dx, dz);
        const fire = (ang, sp) => pool.spawn(this.x, this.z, Math.sin(ang), Math.cos(ang),
          { fromPlayer: false, speed: sp, damage: this.dmg, color: this.t.accent, y: 1.1, r: 0.5, life: 5 });
        if (this.boss) {
          this._volley ^= 1;
          if (this._volley === 0) {                 // radial ring — fills the arena from all sides
            const N = 16; for (let i = 0; i < N; i++) fire((i / N) * Math.PI * 2, 11);
          } else {                                   // wide aimed fan
            const N = 7, spread = 0.9;
            for (let i = 0; i < N; i++) fire(a + (i - (N - 1) / 2) * (spread / (N - 1)), 14);
          }
        } else {                                     // gunner — slow aimed 3-cluster
          const N = 3, spread = 0.28;
          for (let i = 0; i < N; i++) fire(a + (i - (N - 1) / 2) * spread, 13);
        }
      } else {
        player.hurt(this.dmg);                  // melee contact
      }
    }

    this.fig.group.position.set(this.x, 0, this.z);
    this.fig.update(dt, { speed: this.speed });
  }
}
