import * as THREE from 'three';
import { FILL_MAT, makeEye, C } from './shared.js?v=10';
import { visualTest } from './modes.js?v=10';

// Archetypes — sketch-line critters. y is the shape's CENTER height (flyers hover).
// Ranged types spit slow, dense clusters (the Returnal bullet-hell). accent only
// shows in Visual Test (desert) — dark per-type inks readable on the sand background.
const T = {
  chaser: { hp: 26,  speed: 5.2, dmg: 12, r: 0.7, y: 0.7,  cd: 0.7,  ranged: false, accent: 0x1f6e54 },
  turret: { hp: 40,  speed: 2.0, dmg: 9,  r: 0.9, y: 1.1,  cd: 1.6,  ranged: true,  keep: 14, accent: 0x8a5a10 },
  flyer:  { hp: 30,  speed: 3.4, dmg: 10, r: 0.8, y: 3.6,  cd: 1.3,  ranged: true,  keep: 16, fly: true, accent: 0x5a3a8a },
  boss:   { hp: 1500,speed: 2.4, dmg: 16, r: 2.0, y: 2.2,  cd: 1.0,  ranged: true,  keep: 18, boss: true, accent: 0xa32222 },
  boss2:  { hp: 900, speed: 4.6, dmg: 10, r: 1.3, y: 1.4,  cd: 2.4,  ranged: true,  keep: 20, boss: true, accent: 0x8a5a10 },   // swarm caller — fast, glassy, calls in backup
  boss3:  { hp: 2200,speed: 0,   dmg: 18, r: 2.4, y: 2.0,  cd: 0.55, ranged: true,  keep: 0,  boss: true, accent: 0x5a3a8a },   // turret nest — stationary (speed 0), 4 spiral arms
};
export const COST = { chaser: 1, turret: 1.6, flyer: 2, boss: 30, boss2: 22, boss3: 34 };

function part(parent, geo, edge) {
  const o = new THREE.Object3D();
  o.add(new THREE.Mesh(geo, FILL_MAT));
  o.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge));
  parent.add(o); return o;
}
// Build a characterful white-line creature for each archetype.
function build(type, edge) {
  const g = new THREE.Group();
  if (type === 'chaser') {                                   // skittery lizard-critter
    const body = part(g, new THREE.OctahedronGeometry(0.5), edge); body.scale.set(1, 0.65, 1.35);
    const head = part(g, new THREE.IcosahedronGeometry(0.26), edge); head.position.set(0, 0.12, -0.5);
    const tail = part(g, new THREE.ConeGeometry(0.16, 0.7, 4), edge); tail.position.set(0, 0.05, 0.7); tail.rotation.x = -Math.PI / 2;
    for (const sx of [-1, 1]) { const e = makeEye(0.1); e.position.set(sx * 0.11, 0.2, -0.7); g.add(e); }
  } else if (type === 'turret') {                            // squat frog that spits
    const body = part(g, new THREE.OctahedronGeometry(0.7), edge); body.scale.set(1.15, 0.72, 1.0);
    for (const sx of [-1, 1]) {
      const e = makeEye(0.18); e.position.set(sx * 0.22, 0.4, -0.42); g.add(e);
      const foot = part(g, new THREE.BoxGeometry(0.18, 0.12, 0.28), edge); foot.position.set(sx * 0.45, -0.5, -0.2);
    }
  } else if (type === 'flyer') {                             // hovering bat-thing
    part(g, new THREE.OctahedronGeometry(0.42), edge);
    for (const sx of [-1, 1]) {
      const w = part(g, new THREE.BoxGeometry(0.7, 0.04, 0.5), edge);
      w.position.set(sx * 0.55, 0.05, 0); w.rotation.z = sx * 0.3; w.rotation.y = sx * 0.2;
      const e = makeEye(0.11); e.position.set(sx * 0.13, 0.06, -0.36); g.add(e);
    }
  } else if (type === 'boss') {                              // many-eyed beast
    part(g, new THREE.IcosahedronGeometry(1.85, 0), edge);
    for (const a of [-0.5, 0, 0.5]) { const e = makeEye(0.3); e.position.set(Math.sin(a) * 1.0, 0.5, -Math.cos(a) * 1.6); e.rotation.y = Math.PI + a; g.add(e); }
    for (const sx of [-1, 1]) { const s = part(g, new THREE.ConeGeometry(0.3, 1.0, 4), edge); s.position.set(sx * 1.4, 0.8, 0.4); s.rotation.z = sx * 0.5; }
  } else if (type === 'boss2') {                             // swarm caller — lean quadruped, banner-spikes
    const body = part(g, new THREE.OctahedronGeometry(0.95), edge); body.scale.set(1, 0.7, 1.3);
    const head = part(g, new THREE.IcosahedronGeometry(0.4), edge); head.position.set(0, 0.6, -0.7);
    for (const a of [-0.8, -0.27, 0.27, 0.8]) {
      const s = part(g, new THREE.ConeGeometry(0.18, 1.3, 4), edge);
      s.position.set(Math.sin(a) * 0.7, 1.1, Math.cos(a) * 0.4); s.rotation.z = -a * 0.6; s.rotation.x = -0.3;
    }
    for (const sx of [-1, 1]) { const e = makeEye(0.2); e.position.set(sx * 0.16, 0.68, -0.95); g.add(e); }
  } else {                                                   // boss3 — turret nest, squat drum ringed with eyes/barrels
    part(g, new THREE.CylinderGeometry(1.7, 2.1, 1.6, 8), edge);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const e = makeEye(0.26); e.position.set(Math.sin(a) * 1.75, 0.3, Math.cos(a) * 1.75); e.rotation.y = Math.PI + a; g.add(e);
      const barrel = part(g, new THREE.CylinderGeometry(0.12, 0.12, 0.6, 5), edge);
      barrel.position.set(Math.sin(a) * 2.0, 0.3, Math.cos(a) * 2.0); barrel.rotation.x = Math.PI / 2; barrel.rotation.y = -a;
    }
  }
  return g;
}

export class Enemy {
  constructor(scene, type, sc) {
    const t = T[type]; this.t = t; this.type = type; this.boss = !!t.boss;
    this.restColor = visualTest ? t.accent : C.line;
    this.edge = new THREE.LineBasicMaterial({ color: this.restColor });
    this.g = build(type, this.edge); scene.add(this.g);
    this.maxHp = Math.round(t.hp * sc.hpMul); this.hp = this.maxHp;
    this.dmg = t.dmg * sc.dmgMul;
    this.r = t.r; this.alive = true; this.cd = 0.4 + Math.random() * t.cd;
    this.x = 0; this.z = 0; this.y = t.y; this.bob = Math.random() * 6; this.spin = 0; this.flash = 0; this._v = 0;
    this.summonPulse = false;                                    // boss2: set true once per pulse, main.js reads+clears it
    this._arms = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];       // boss3: 4 simultaneous spiral-arm phase offsets
  }
  place(x, z) { this.x = x; this.z = z; this.g.position.set(x, this.y, z); }
  takeDamage(d) { this.hp -= d; this.flash = 1; this.edge.color.setHex(0xff6b6b); if (this.hp <= 0) { this.hp = 0; this.alive = false; } return !this.alive; }
  dispose() { this.g.parent && this.g.parent.remove(this.g); }

  update(dt, player, pool, heightAt = () => 0, bound = 47) {
    if (!this.alive) return;
    this.cd = Math.max(0, this.cd - dt);
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt * 5); if (this.flash === 0) this.edge.color.setHex(this.restColor); }
    this.spin += dt * 1.2; this.bob += dt * 2;

    const px = player.x, pz = player.z, py = 1.1;
    const dx = px - this.x, dz = pz - this.z, dh = Math.hypot(dx, dz) || 1e-3;

    if (this.t.fly) {
      const want = 6, ang = Math.atan2(dz, dx);
      const tx = px - Math.cos(ang) * want, tz = pz - Math.sin(ang) * want;
      this.x += (tx - this.x) * Math.min(1, dt * 0.8); this.z += (tz - this.z) * Math.min(1, dt * 0.8);
      this.y = this.t.y + Math.sin(this.bob) * 0.4;
    } else if (this.t.ranged) {
      const keep = this.t.keep;
      if (dh > keep) { this.x += dx / dh * this.t.speed * dt; this.z += dz / dh * this.t.speed * dt; }
      else if (dh < keep * 0.6) { this.x -= dx / dh * this.t.speed * dt; this.z -= dz / dh * this.t.speed * dt; }
    } else {
      this.x += dx / dh * this.t.speed * dt; this.z += dz / dh * this.t.speed * dt;
    }
    if (!this.t.fly) this.y = heightAt(this.x, this.z) + this.t.y + (this.boss ? Math.sin(this.bob) * 0.2 : 0);   // walk on terrain

    if (this.cd === 0) {
      if (this.t.ranged) {
        this.cd = this.t.cd;
        const aim = () => { const ax = px - this.x, ay = py - this.y, az = pz - this.z, l = Math.hypot(ax, ay, az) || 1; return [ax / l, ay / l, az / l]; };
        const col = C.eshot;
        const fire = (dirx, diry, dirz, sp) => pool.spawn(this.x, this.y, this.z, dirx, diry, dirz,
          { fromPlayer: false, speed: sp, damage: this.dmg, color: col, r: 0.45, life: 6, scale: 1.3 });
        if (this.boss && this.type === 'boss') {                 // many-eyed beast: alternating ring / aimed fan
          this._v ^= 1;
          if (this._v === 0) { const N = 20; for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2 + this.spin; fire(Math.cos(a), 0, Math.sin(a), 10); } }
          else { const [ax, ay, az] = aim(); const base = Math.atan2(az, ax); for (let i = -3; i <= 3; i++) { const a = base + i * 0.16; fire(Math.cos(a), ay, Math.sin(a), 13); } }
        } else if (this.boss && this.type === 'boss2') {          // swarm caller: sparse aimed burst + periodic summon pulse
          const [ax, ay, az] = aim(); const base = Math.atan2(az, ax);
          for (let i = -1; i <= 1; i++) { const a = base + i * 0.22; fire(Math.cos(a), ay, Math.sin(a), 15); }
          this._v = (this._v + 1) % 3;
          if (this._v === 0) this.summonPulse = true;
        } else if (this.boss && this.type === 'boss3') {          // turret nest: 4 simultaneous rotating spiral arms
          for (const armOffset of this._arms) { const a = armOffset + this.spin * 2.2; fire(Math.cos(a), 0, Math.sin(a), 9); }
        } else if (this.t.fly) {
          const [ax, ay, az] = aim(); const base = Math.atan2(az, ax);
          for (let i = -1; i <= 1; i++) { const a = base + i * 0.18; fire(Math.cos(a), ay, Math.sin(a), 14); }
        } else {
          const N = 10; for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2 + this.spin * 0.5; fire(Math.cos(a), 0, Math.sin(a), 11); }
        }
      } else if (dh < this.r + 0.9) { this.cd = this.t.cd; player.hurt(this.dmg); }
    }

    this.x = Math.max(-bound, Math.min(bound, this.x)); this.z = Math.max(-bound, Math.min(bound, this.z));
    this.g.position.set(this.x, this.y, this.z);
    this.g.rotation.y = Math.atan2(-dx, -dz);                // face the player (eyes on you)
    if (this.t.fly) this.g.rotation.z = Math.sin(this.bob) * 0.15;
  }
}
