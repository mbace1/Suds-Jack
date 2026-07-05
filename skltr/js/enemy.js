import * as THREE from 'three';
import { FILL_MAT, makeEye, C, lerp } from './shared.js?v=11';
import { visualTest } from './modes.js?v=11';

// Archetypes — animal ROBOTS in the wireframe sketch style: a robot wolf, a tank
// tortoise, a wasp drone, and three heavy chassis bosses. y is the shape's CENTER
// height (flyers hover). Ranged types spit slow, dense clusters (the Returnal
// bullet-hell). accent only shows in Visual Test (desert) — dark per-type inks.
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
  o.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 4), edge));
  parent.add(o); return o;
}
// two-segment robot leg: hip pivot + knee pivot, box segments hanging -y
function limb(parent, x, y, z, lu, ll, thick, edge) {
  const hip = new THREE.Object3D(); hip.position.set(x, y, z); parent.add(hip);
  const ug = new THREE.BoxGeometry(thick, lu, thick); ug.translate(0, -lu / 2, 0);
  hip.add(new THREE.Mesh(ug, FILL_MAT)); hip.add(new THREE.LineSegments(new THREE.EdgesGeometry(ug), edge));
  const knee = new THREE.Object3D(); knee.position.y = -lu; hip.add(knee);
  const lg = new THREE.BoxGeometry(thick * 0.8, ll, thick * 0.8); lg.translate(0, -ll / 2, 0);
  knee.add(new THREE.Mesh(lg, FILL_MAT)); knee.add(new THREE.LineSegments(new THREE.EdgesGeometry(lg), edge));
  return { hip, knee };
}

// Build each archetype's chassis; returns the group plus a parts bag (p) of every
// pivot the per-frame animation drives (legs, jaws, wheels, wings, cannons...).
function build(type, edge) {
  const g = new THREE.Group(); const p = {};
  if (type === 'chaser') {                                   // HOUND — robot wolf
    part(g, new THREE.BoxGeometry(0.52, 0.4, 1.05), edge);
    part(g, new THREE.BoxGeometry(0.56, 0.1, 0.5), edge).position.set(0, 0.24, 0.12);   // back armor plate
    p.head = new THREE.Object3D(); p.head.position.set(0, 0.16, -0.6); g.add(p.head);
    part(p.head, new THREE.BoxGeometry(0.3, 0.26, 0.32), edge);
    part(p.head, new THREE.BoxGeometry(0.16, 0.12, 0.26), edge).position.set(0, -0.05, -0.26);   // snout
    p.jaw = new THREE.Object3D(); p.jaw.position.set(0, -0.12, -0.1); p.head.add(p.jaw);
    part(p.jaw, new THREE.BoxGeometry(0.14, 0.05, 0.3), edge).position.set(0, -0.02, -0.15);
    for (const sx of [-1, 1]) {
      const e2 = makeEye(0.08); e2.position.set(sx * 0.1, 0.07, -0.17); p.head.add(e2);
      part(p.head, new THREE.BoxGeometry(0.05, 0.22, 0.05), edge).position.set(sx * 0.11, 0.24, 0.05);   // antenna ears
    }
    part(g, new THREE.BoxGeometry(0.14, 0.12, 0.3), edge).position.set(0, 0.36, -0.02);   // back gun mount
    const bar = part(g, new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8), edge);
    bar.rotation.x = Math.PI / 2; bar.position.set(0, 0.38, -0.35);
    p.tail = new THREE.Object3D(); p.tail.position.set(0, 0.16, 0.5); g.add(p.tail);
    part(p.tail, new THREE.BoxGeometry(0.05, 0.05, 0.38), edge).position.set(0, 0.08, 0.19);
    p.legs = [];
    for (const [lx, lz] of [[-0.28, -0.32], [0.28, -0.32], [-0.28, 0.34], [0.28, 0.34]])
      p.legs.push(limb(g, lx, -0.12, lz, 0.28, 0.26, 0.09, edge));
  } else if (type === 'turret') {                            // TORTOISE — tank turtle
    p.wheels = [];
    for (const sx of [-1, 1]) {
      part(g, new THREE.BoxGeometry(0.3, 0.24, 1.15), edge).position.set(sx * 0.55, -0.8, 0);
      for (const wz of [-0.38, 0, 0.38]) {
        const wp = new THREE.Object3D(); wp.position.set(sx * 0.55, -0.86, wz); g.add(wp);
        const wg = new THREE.CylinderGeometry(0.14, 0.14, 0.34, 10); wg.rotateZ(Math.PI / 2);
        wp.add(new THREE.Mesh(wg, FILL_MAT)); wp.add(new THREE.LineSegments(new THREE.EdgesGeometry(wg, 4), edge));
        p.wheels.push(wp);
      }
    }
    const dome = part(g, new THREE.SphereGeometry(0.8, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), edge);
    dome.position.y = -0.45;                                 // shell
    part(g, new THREE.BoxGeometry(0.26, 0.2, 0.3), edge).position.set(0, -0.42, -0.82);   // head peek
    for (const sx of [-1, 1]) { const e2 = makeEye(0.07); e2.position.set(sx * 0.07, -0.4, -0.98); g.add(e2); }
    p.tur = new THREE.Object3D(); p.tur.position.set(0, 0.42, 0); g.add(p.tur);
    part(p.tur, new THREE.BoxGeometry(0.34, 0.2, 0.42), edge);
    p.barrel = part(p.tur, new THREE.CylinderGeometry(0.055, 0.055, 0.72, 8), edge);
    p.barrel.rotation.x = Math.PI / 2; p.barrel.position.set(0, 0.02, -0.5);
  } else if (type === 'flyer') {                             // WASP — gun drone
    const fus = part(g, new THREE.CylinderGeometry(0.2, 0.14, 0.66, 10), edge); fus.rotation.x = Math.PI / 2;
    part(g, new THREE.SphereGeometry(0.16, 8, 6), edge).position.z = -0.38;               // nose
    part(g, new THREE.BoxGeometry(0.06, 0.06, 0.5), edge).position.set(0, 0.05, 0.55);    // tail boom
    part(g, new THREE.BoxGeometry(0.04, 0.26, 0.2), edge).position.set(0, 0.18, 0.78);    // tail fin
    part(g, new THREE.CylinderGeometry(0.045, 0.045, 0.18, 6), edge).position.y = 0.26;   // rotor mast
    p.rotor = new THREE.Object3D(); p.rotor.position.set(0, 0.36, 0); g.add(p.rotor);
    for (const rr of [0, Math.PI / 2]) {
      const bl = part(p.rotor, new THREE.BoxGeometry(0.95, 0.02, 0.09), edge); bl.rotation.y = rr;
    }
    p.wings = [];
    for (const sx of [-1, 1]) {
      const wp = new THREE.Object3D(); wp.position.set(sx * 0.18, 0.08, -0.05); g.add(wp); wp.userData.sx = sx;
      const wg = new THREE.BoxGeometry(0.72, 0.025, 0.3); wg.translate(sx * 0.36, 0, 0);
      wp.add(new THREE.Mesh(wg, FILL_MAT)); wp.add(new THREE.LineSegments(new THREE.EdgesGeometry(wg), edge));
      p.wings.push(wp);
    }
    p.pod = part(g, new THREE.BoxGeometry(0.12, 0.12, 0.3), edge); p.pod.position.set(0, -0.22, -0.12);
    const pb = part(p.pod, new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), edge);
    pb.rotation.x = Math.PI / 2; pb.position.z = -0.26;
    for (const sx of [-1, 1]) { const e2 = makeEye(0.08); e2.position.set(sx * 0.09, 0.02, -0.5); g.add(e2); }
  } else if (type === 'boss') {                              // WARBEAR — cannon-armed heavy
    part(g, new THREE.BoxGeometry(2.0, 1.5, 1.15), edge).position.y = 0.15;               // chest
    part(g, new THREE.BoxGeometry(1.5, 0.8, 1.0), edge).position.y = -0.9;                // pelvis
    for (const sx of [-1, 1]) {
      part(g, new THREE.BoxGeometry(0.7, 0.45, 0.8), edge).position.set(sx * 1.15, 0.85, 0);       // pauldrons
      part(g, new THREE.BoxGeometry(0.55, 1.0, 0.6), edge).position.set(sx * 0.6, -1.6, 0);        // stump legs
      part(g, new THREE.BoxGeometry(0.6, 0.25, 0.85), edge).position.set(sx * 0.6, -2.12, -0.08);  // feet
    }
    p.arms = [];
    for (const sx of [-1, 1]) {
      const ap = new THREE.Object3D(); ap.position.set(sx * 1.3, 0.7, 0); g.add(ap);
      const ug = new THREE.BoxGeometry(0.4, 1.0, 0.45); ug.translate(0, -0.5, 0);
      ap.add(new THREE.Mesh(ug, FILL_MAT)); ap.add(new THREE.LineSegments(new THREE.EdgesGeometry(ug), edge));
      const cannon = part(ap, new THREE.CylinderGeometry(0.2, 0.24, 0.9, 10), edge);
      cannon.rotation.x = Math.PI / 2; cannon.position.set(0, -1.1, -0.3);
      p.arms.push({ ap, kick: 0 });
    }
    const hd = new THREE.Object3D(); hd.position.set(0, 1.1, -0.3); g.add(hd);
    part(hd, new THREE.BoxGeometry(0.55, 0.45, 0.5), edge);
    const eC = makeEye(0.16); eC.position.set(0, 0.02, -0.27); hd.add(eC);
    for (const sx of [-1, 1]) {
      const e2 = makeEye(0.07); e2.position.set(sx * 0.19, 0.1, -0.26); hd.add(e2);
      part(hd, new THREE.BoxGeometry(0.06, 0.28, 0.06), edge).position.set(sx * 0.2, 0.34, 0);     // horn antennas
    }
  } else if (type === 'boss2') {                             // STAG — antlered swarm caller
    part(g, new THREE.BoxGeometry(0.6, 0.55, 1.35), edge).position.y = 0.1;
    part(g, new THREE.BoxGeometry(0.5, 0.12, 0.6), edge).position.set(0, 0.42, 0.1);      // saddle plate
    p.neck = new THREE.Object3D(); p.neck.position.set(0, 0.35, -0.6); g.add(p.neck);
    const ng = new THREE.BoxGeometry(0.18, 0.55, 0.18); ng.translate(0, 0.27, 0);
    p.neck.add(new THREE.Mesh(ng, FILL_MAT)); p.neck.add(new THREE.LineSegments(new THREE.EdgesGeometry(ng), edge));
    const hd = new THREE.Object3D(); hd.position.set(0, 0.6, -0.12); p.neck.add(hd);
    part(hd, new THREE.BoxGeometry(0.24, 0.22, 0.42), edge);
    for (const sx of [-1, 1]) {
      const e2 = makeEye(0.07); e2.position.set(sx * 0.08, 0.04, -0.22); hd.add(e2);
      // antlers — three branching tines a side
      const tine = (len, px, py, rz, rx) => {
        const t2 = part(hd, new THREE.CylinderGeometry(0.025, 0.04, len, 6), edge);
        t2.position.set(px, py, 0.05); t2.rotation.z = rz; t2.rotation.x = rx;
      };
      tine(0.55, sx * 0.22, 0.32, sx * -0.55, -0.15);
      tine(0.35, sx * 0.38, 0.5, sx * -0.95, -0.1);
      tine(0.3, sx * 0.16, 0.52, sx * -0.2, 0.25);
    }
    p.legs = [];
    for (const [lx, lz] of [[-0.24, -0.5], [0.24, -0.5], [-0.24, 0.52], [0.24, 0.52]])
      p.legs.push(limb(g, lx, -0.15, lz, 0.62, 0.58, 0.07, edge));
  } else {                                                   // boss3: CRAB — rotating turret nest
    part(g, new THREE.CylinderGeometry(1.45, 1.7, 1.3, 10), edge);
    part(g, new THREE.CylinderGeometry(0.7, 1.05, 0.5, 8), edge).position.y = 0.85;
    p.ring = new THREE.Object3D(); g.add(p.ring);
    p.barrels = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const bp = new THREE.Object3D();
      bp.position.set(Math.sin(a) * 1.5, 0.15, Math.cos(a) * 1.5); bp.rotation.y = Math.PI + a;
      p.ring.add(bp);
      const bar = part(bp, new THREE.CylinderGeometry(0.09, 0.09, 0.8, 8), edge);
      bar.rotation.x = Math.PI / 2; bar.position.z = -0.45;
      p.barrels.push(bar);
      const e2 = makeEye(0.18); const a2 = a + Math.PI / 4;
      e2.position.set(Math.sin(a2) * 1.62, 0.35, Math.cos(a2) * 1.62); e2.rotation.y = Math.PI + a2;
      p.ring.add(e2);
    }
    p.legs = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const l = limb(g, Math.sin(a) * 1.5, -0.4, Math.cos(a) * 1.5, 0.9, 0.85, 0.14, edge);
      l.hip.rotation.y = a; l.hip.rotation.z = 0.85; l.knee.rotation.z = -1.35;
      p.legs.push(l);
    }
  }
  return { g, p };
}

export class Enemy {
  constructor(scene, type, sc) {
    const t = T[type]; this.t = t; this.type = type; this.boss = !!t.boss;
    this.restColor = visualTest ? t.accent : C.line;
    this.edge = new THREE.LineBasicMaterial({ color: this.restColor });
    const built = build(type, this.edge); this.g = built.g; this.p = built.p;
    scene.add(this.g);
    this.maxHp = Math.round(t.hp * sc.hpMul); this.hp = this.maxHp;
    this.dmg = t.dmg * sc.dmgMul;
    this.r = t.r; this.alive = true; this.cd = 0.4 + Math.random() * t.cd;
    this.x = 0; this.z = 0; this.y = t.y; this.bob = Math.random() * 6; this.spin = 0; this.flash = 0; this._v = 0;
    this.summonPulse = false;                                    // boss2: set true once per pulse, main.js reads+clears it
    this._arms = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];       // boss3: 4 simultaneous spiral-arm phase offsets
    this._gait = 0; this._px = 0; this._pz = 0; this._f = 0;
  }
  place(x, z) { this.x = x; this.z = z; this._px = x; this._pz = z; this.g.position.set(x, this.y, z); }
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
        if (this.boss && this.type === 'boss') {                 // warbear: alternating ring / aimed fan
          this._v ^= 1;
          if (this._v === 0) {
            const N = 20; for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2 + this.spin; fire(Math.cos(a), 0, Math.sin(a), 10); }
            for (const a2 of this.p.arms) a2.kick = 1;
          } else {
            const [ax, ay, az] = aim(); const base = Math.atan2(az, ax);
            for (let i = -3; i <= 3; i++) { const a = base + i * 0.16; fire(Math.cos(a), ay, Math.sin(a), 13); }
            this.p.arms[this._f ^= 1].kick = 1;
          }
        } else if (this.boss && this.type === 'boss2') {          // stag: sparse aimed burst + periodic summon pulse
          const [ax, ay, az] = aim(); const base = Math.atan2(az, ax);
          for (let i = -1; i <= 1; i++) { const a = base + i * 0.22; fire(Math.cos(a), ay, Math.sin(a), 15); }
          this._v = (this._v + 1) % 3;
          if (this._v === 0) { this.summonPulse = true; this.p.howlT = 1; }
        } else if (this.boss && this.type === 'boss3') {          // crab: 4 simultaneous rotating spiral arms
          for (const armOffset of this._arms) { const a = armOffset + this.spin * 2.2; fire(Math.cos(a), 0, Math.sin(a), 9); }
          this.p.rec = 1;
        } else if (this.t.fly) {
          const [ax, ay, az] = aim(); const base = Math.atan2(az, ax);
          for (let i = -1; i <= 1; i++) { const a = base + i * 0.18; fire(Math.cos(a), ay, Math.sin(a), 14); }
          this.p.rec = 1;
        } else {
          const N = 10; for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2 + this.spin * 0.5; fire(Math.cos(a), 0, Math.sin(a), 11); }
          this.p.rec = 1;
        }
      } else if (dh < this.r + 0.9) { this.cd = this.t.cd; player.hurt(this.dmg); }
    }

    // ── procedural animation (visual only — driven by real velocity + fire recoil) ──
    const velNow = Math.hypot(this.x - this._px, this.z - this._pz) / Math.max(dt, 1e-4);
    this._px = this.x; this._pz = this.z;
    this._gait += dt * (2 + velNow * 1.7);
    const P = this.p;
    if (this.type === 'chaser') {
      const k = Math.min(1, velNow / 4.5);
      P.legs.forEach((l, i) => {
        const ph = this._gait * 2.4 + ((i === 0 || i === 3) ? 0 : Math.PI);     // diagonal gallop pairs
        l.hip.rotation.x = Math.sin(ph) * 0.7 * k;
        l.knee.rotation.x = Math.max(0.08, -Math.sin(ph - 0.6)) * 0.85 * k;
      });
      P.jaw.rotation.x = dh < 4.5 ? 0.35 + Math.sin(this.bob * 9) * 0.3 : lerp(P.jaw.rotation.x, 0.06, dt * 8);   // snapping jaw
      P.tail.rotation.x = 0.35 + Math.sin(this.bob * 3.2) * 0.25;
      P.head.rotation.x = Math.sin(this.bob * 1.4) * 0.06;
    } else if (this.type === 'turret') {
      for (const w of P.wheels) w.rotation.x -= velNow * dt * 3.2;              // treads roll with movement
      P.rec = Math.max(0, (P.rec ?? 0) - dt * 4);
      P.barrel.position.z = -0.5 + P.rec * 0.22;                                // barrel recoil on fire
      const dyA = (player.y + 1.1) - this.y;
      P.tur.rotation.x = lerp(P.tur.rotation.x, Math.max(-0.5, Math.min(0.35, -Math.atan2(dyA, dh) * 0.7)), dt * 4);   // turret elevates
    } else if (this.type === 'flyer') {
      for (const wv of P.wings) wv.rotation.z = wv.userData.sx * (0.18 + Math.sin(this.bob * 12) * 0.5);   // wing flap
      P.rotor.rotation.y += dt * 30;
      P.rec = Math.max(0, (P.rec ?? 0) - dt * 4);
      P.pod.position.z = -0.12 + P.rec * 0.12;
    } else if (this.type === 'boss') {
      P.arms.forEach((a2, i) => {
        a2.kick = Math.max(0, a2.kick - dt * 3.5);
        a2.ap.rotation.x = -0.45 + Math.sin(this.bob * 1.5 + i * Math.PI) * 0.12 * Math.min(1, velNow / 2) - a2.kick * 0.5;
      });
    } else if (this.type === 'boss2') {
      const k = Math.min(1, velNow / 4.5);
      P.legs.forEach((l, i) => {
        const ph = this._gait * 2.6 + ((i === 0 || i === 3) ? 0 : Math.PI);     // trot
        l.hip.rotation.x = Math.sin(ph) * 0.55 * k;
        l.knee.rotation.x = Math.max(0.06, -Math.sin(ph - 0.6)) * 0.7 * k;
      });
      P.howlT = Math.max(0, (P.howlT ?? 0) - dt * 1.4);
      P.neck.rotation.x = 0.28 - P.howlT * 0.85;                                // head throws back to howl on a summon
    } else if (this.type === 'boss3') {
      P.ring.rotation.y = this.spin * 2.2 - this.g.rotation.y;                  // barrels track the spiral-arm angle
      P.rec = Math.max(0, (P.rec ?? 0) - dt * 4);
      for (const b of P.barrels) b.position.z = -0.45 + P.rec * 0.16;
      P.legs.forEach((l, i) => { l.knee.rotation.z = -1.35 + Math.sin(this.bob * 2 + i) * 0.07; });   // leg pistons
    }

    this.x = Math.max(-bound, Math.min(bound, this.x)); this.z = Math.max(-bound, Math.min(bound, this.z));
    this.g.position.set(this.x, this.y, this.z);
    this.g.rotation.y = Math.atan2(-dx, -dz);                // face the player (eyes on you)
    if (this.t.fly) this.g.rotation.z = Math.sin(this.bob) * 0.15;
  }
}
