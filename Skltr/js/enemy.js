import * as THREE from 'three';
import { FILL_MAT, makeEye, C, lerp } from './shared.js?v=12';
import { visualTest } from './modes.js?v=12';

// Archetypes — animal ROBOTS in the wireframe sketch style. v13 gives each regular
// enemy a clearer combat job for the auto-fire game: HOUND forces movement, TORTOISE
// cuts lanes, WASP pulls attention upward and sideways. Bosses retain their patterns.
const T = {
  chaser: { hp: 22,  speed: 6.0, dmg: 11, r: 0.7, y: 0.7,  cd: 0.9,  ranged: false, accent: 0x1f6e54 },
  turret: { hp: 46,  speed: 1.55,dmg: 8,  r: 0.9, y: 1.1,  cd: 1.8,  ranged: true,  keep: 17, accent: 0x8a5a10 },
  flyer:  { hp: 28,  speed: 3.8, dmg: 9,  r: 0.8, y: 4.4,  cd: 1.45, ranged: true,  keep: 13, fly: true, accent: 0x5a3a8a },
  boss:   { hp: 1500,speed: 2.4, dmg: 16, r: 2.0, y: 2.2,  cd: 1.0,  ranged: true,  keep: 18, boss: true, accent: 0xa32222 },
  boss2:  { hp: 900, speed: 4.6, dmg: 10, r: 1.3, y: 1.4,  cd: 2.4,  ranged: true,  keep: 20, boss: true, accent: 0x8a5a10 },
  boss3:  { hp: 2200,speed: 0,   dmg: 18, r: 2.4, y: 2.0,  cd: 0.55, ranged: true,  keep: 0,  boss: true, accent: 0x5a3a8a },
};
export const COST = { chaser: 1, turret: 1.8, flyer: 2.1, boss: 30, boss2: 22, boss3: 34 };

function part(parent, geo, edge) {
  const o = new THREE.Object3D();
  o.add(new THREE.Mesh(geo, FILL_MAT));
  o.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 4), edge));
  parent.add(o); return o;
}
function limb(parent, x, y, z, lu, ll, thick, edge) {
  const hip = new THREE.Object3D(); hip.position.set(x, y, z); parent.add(hip);
  const ug = new THREE.BoxGeometry(thick, lu, thick); ug.translate(0, -lu / 2, 0);
  hip.add(new THREE.Mesh(ug, FILL_MAT)); hip.add(new THREE.LineSegments(new THREE.EdgesGeometry(ug), edge));
  const knee = new THREE.Object3D(); knee.position.y = -lu; hip.add(knee);
  const lg = new THREE.BoxGeometry(thick * 0.8, ll, thick * 0.8); lg.translate(0, -ll / 2, 0);
  knee.add(new THREE.Mesh(lg, FILL_MAT)); knee.add(new THREE.LineSegments(new THREE.EdgesGeometry(lg), edge));
  return { hip, knee };
}

function build(type, edge) {
  const g = new THREE.Group(); const p = {};
  if (type === 'chaser') {
    part(g, new THREE.BoxGeometry(0.52, 0.4, 1.05), edge);
    part(g, new THREE.BoxGeometry(0.56, 0.1, 0.5), edge).position.set(0, 0.24, 0.12);
    p.head = new THREE.Object3D(); p.head.position.set(0, 0.16, -0.6); g.add(p.head);
    part(p.head, new THREE.BoxGeometry(0.3, 0.26, 0.32), edge);
    part(p.head, new THREE.BoxGeometry(0.16, 0.12, 0.26), edge).position.set(0, -0.05, -0.26);
    p.jaw = new THREE.Object3D(); p.jaw.position.set(0, -0.12, -0.1); p.head.add(p.jaw);
    part(p.jaw, new THREE.BoxGeometry(0.14, 0.05, 0.3), edge).position.set(0, -0.02, -0.15);
    for (const sx of [-1, 1]) {
      const e2 = makeEye(0.08); e2.position.set(sx * 0.1, 0.07, -0.17); p.head.add(e2);
      part(p.head, new THREE.BoxGeometry(0.05, 0.22, 0.05), edge).position.set(sx * 0.11, 0.24, 0.05);
    }
    part(g, new THREE.BoxGeometry(0.14, 0.12, 0.3), edge).position.set(0, 0.36, -0.02);
    const bar = part(g, new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8), edge);
    bar.rotation.x = Math.PI / 2; bar.position.set(0, 0.38, -0.35);
    p.tail = new THREE.Object3D(); p.tail.position.set(0, 0.16, 0.5); g.add(p.tail);
    part(p.tail, new THREE.BoxGeometry(0.05, 0.05, 0.38), edge).position.set(0, 0.08, 0.19);
    p.legs = [];
    for (const [lx, lz] of [[-0.28, -0.32], [0.28, -0.32], [-0.28, 0.34], [0.28, 0.34]])
      p.legs.push(limb(g, lx, -0.12, lz, 0.28, 0.26, 0.09, edge));
  } else if (type === 'turret') {
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
    dome.position.y = -0.45;
    part(g, new THREE.BoxGeometry(0.26, 0.2, 0.3), edge).position.set(0, -0.42, -0.82);
    for (const sx of [-1, 1]) { const e2 = makeEye(0.07); e2.position.set(sx * 0.07, -0.4, -0.98); g.add(e2); }
    p.tur = new THREE.Object3D(); p.tur.position.set(0, 0.42, 0); g.add(p.tur);
    part(p.tur, new THREE.BoxGeometry(0.34, 0.2, 0.42), edge);
    p.barrel = part(p.tur, new THREE.CylinderGeometry(0.055, 0.055, 0.72, 8), edge);
    p.barrel.rotation.x = Math.PI / 2; p.barrel.position.set(0, 0.02, -0.5);
  } else if (type === 'flyer') {
    const fus = part(g, new THREE.CylinderGeometry(0.2, 0.14, 0.66, 10), edge); fus.rotation.x = Math.PI / 2;
    part(g, new THREE.SphereGeometry(0.16, 8, 6), edge).position.z = -0.38;
    part(g, new THREE.BoxGeometry(0.06, 0.06, 0.5), edge).position.set(0, 0.05, 0.55);
    part(g, new THREE.BoxGeometry(0.04, 0.26, 0.2), edge).position.set(0, 0.18, 0.78);
    part(g, new THREE.CylinderGeometry(0.045, 0.045, 0.18, 6), edge).position.y = 0.26;
    p.rotor = new THREE.Object3D(); p.rotor.position.set(0, 0.36, 0); g.add(p.rotor);
    for (const rr of [0, Math.PI / 2]) { const bl = part(p.rotor, new THREE.BoxGeometry(0.95, 0.02, 0.09), edge); bl.rotation.y = rr; }
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
  } else if (type === 'boss') {
    part(g, new THREE.BoxGeometry(2.0, 1.5, 1.15), edge).position.y = 0.15;
    part(g, new THREE.BoxGeometry(1.5, 0.8, 1.0), edge).position.y = -0.9;
    for (const sx of [-1, 1]) {
      part(g, new THREE.BoxGeometry(0.7, 0.45, 0.8), edge).position.set(sx * 1.15, 0.85, 0);
      part(g, new THREE.BoxGeometry(0.55, 1.0, 0.6), edge).position.set(sx * 0.6, -1.6, 0);
      part(g, new THREE.BoxGeometry(0.6, 0.25, 0.85), edge).position.set(sx * 0.6, -2.12, -0.08);
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
      part(hd, new THREE.BoxGeometry(0.06, 0.28, 0.06), edge).position.set(sx * 0.2, 0.34, 0);
    }
  } else if (type === 'boss2') {
    part(g, new THREE.BoxGeometry(0.6, 0.55, 1.35), edge).position.y = 0.1;
    part(g, new THREE.BoxGeometry(0.5, 0.12, 0.6), edge).position.set(0, 0.42, 0.1);
    p.neck = new THREE.Object3D(); p.neck.position.set(0, 0.35, -0.6); g.add(p.neck);
    const ng = new THREE.BoxGeometry(0.18, 0.55, 0.18); ng.translate(0, 0.27, 0);
    p.neck.add(new THREE.Mesh(ng, FILL_MAT)); p.neck.add(new THREE.LineSegments(new THREE.EdgesGeometry(ng), edge));
    const hd = new THREE.Object3D(); hd.position.set(0, 0.6, -0.12); p.neck.add(hd);
    part(hd, new THREE.BoxGeometry(0.24, 0.22, 0.42), edge);
    for (const sx of [-1, 1]) {
      const e2 = makeEye(0.07); e2.position.set(sx * 0.08, 0.04, -0.22); hd.add(e2);
      const tine = (len, px, py, rz, rx) => { const t2 = part(hd, new THREE.CylinderGeometry(0.025, 0.04, len, 6), edge); t2.position.set(px, py, 0.05); t2.rotation.z = rz; t2.rotation.x = rx; };
      tine(0.55, sx * 0.22, 0.32, sx * -0.55, -0.15); tine(0.35, sx * 0.38, 0.5, sx * -0.95, -0.1); tine(0.3, sx * 0.16, 0.52, sx * -0.2, 0.25);
    }
    p.legs = [];
    for (const [lx, lz] of [[-0.24, -0.5], [0.24, -0.5], [-0.24, 0.52], [0.24, 0.52]]) p.legs.push(limb(g, lx, -0.15, lz, 0.62, 0.58, 0.07, edge));
  } else {
    part(g, new THREE.CylinderGeometry(1.45, 1.7, 1.3, 10), edge);
    part(g, new THREE.CylinderGeometry(0.7, 1.05, 0.5, 8), edge).position.y = 0.85;
    p.ring = new THREE.Object3D(); g.add(p.ring); p.barrels = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2; const bp = new THREE.Object3D();
      bp.position.set(Math.sin(a) * 1.5, 0.15, Math.cos(a) * 1.5); bp.rotation.y = Math.PI + a; p.ring.add(bp);
      const bar = part(bp, new THREE.CylinderGeometry(0.09, 0.09, 0.8, 8), edge); bar.rotation.x = Math.PI / 2; bar.position.z = -0.45; p.barrels.push(bar);
      const e2 = makeEye(0.18); const a2 = a + Math.PI / 4; e2.position.set(Math.sin(a2) * 1.62, 0.35, Math.cos(a2) * 1.62); e2.rotation.y = Math.PI + a2; p.ring.add(e2);
    }
    p.legs = [];
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; const l = limb(g, Math.sin(a) * 1.5, -0.4, Math.cos(a) * 1.5, 0.9, 0.85, 0.14, edge); l.hip.rotation.y = a; l.hip.rotation.z = 0.85; l.knee.rotation.z = -1.35; p.legs.push(l); }
  }
  return { g, p };
}

export class Enemy {
  constructor(scene, type, sc) {
    const t = T[type]; this.t = t; this.type = type; this.boss = !!t.boss;
    this.restColor = visualTest ? t.accent : C.line;
    this.edge = new THREE.LineBasicMaterial({ color: this.restColor });
    const built = build(type, this.edge); this.g = built.g; this.p = built.p; scene.add(this.g);
    this.maxHp = Math.round(t.hp * sc.hpMul); this.hp = this.maxHp; this.dmg = t.dmg * sc.dmgMul;
    this.r = t.r; this.alive = true; this.cd = 0.4 + Math.random() * t.cd;
    this.x = 0; this.z = 0; this.y = t.y; this.bob = Math.random() * 6; this.spin = 0; this.flash = 0; this._v = 0;
    this.summonPulse = false; this._arms = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
    this._gait = 0; this._px = 0; this._pz = 0; this._f = 0; this._orbit = Math.random() < 0.5 ? -1 : 1;
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
    const nx = dx / dh, nz = dz / dh, tx = -nz, tz = nx;

    if (this.type === 'flyer') {
      // WASP: stay at medium range and orbit. It should make the player keep moving and
      // occasionally look up, rather than becoming another enemy sitting in front.
      const want = this.t.keep;
      const radial = (dh - want) * 0.65;
      const strafe = this.t.speed * this._orbit;
      this.x += (nx * radial + tx * strafe) * dt;
      this.z += (nz * radial + tz * strafe) * dt;
      this.y = this.t.y + Math.sin(this.bob) * 0.55;
    } else if (this.type === 'turret') {
      // TORTOISE: anchor a lane. It creeps to a useful range and only sidesteps a little;
      // the projectile pattern does the displacement work.
      const keep = this.t.keep;
      if (dh > keep + 2) { this.x += nx * this.t.speed * dt; this.z += nz * this.t.speed * dt; }
      else if (dh < keep - 4) { this.x -= nx * this.t.speed * dt; this.z -= nz * this.t.speed * dt; }
      else { this.x += tx * this.t.speed * 0.18 * this._orbit * dt; this.z += tz * this.t.speed * 0.18 * this._orbit * dt; }
    } else if (this.t.ranged) {
      const keep = this.t.keep;
      if (dh > keep) { this.x += nx * this.t.speed * dt; this.z += nz * this.t.speed * dt; }
      else if (dh < keep * 0.6) { this.x -= nx * this.t.speed * dt; this.z -= nz * this.t.speed * dt; }
    } else {
      // HOUND: commits harder inside 9m so the player must dash/jump through pressure.
      const pounce = dh < 9 && dh > 2.2 ? 1.7 : 1;
      this.x += nx * this.t.speed * pounce * dt; this.z += nz * this.t.speed * pounce * dt;
    }
    if (!this.t.fly) this.y = heightAt(this.x, this.z) + this.t.y + (this.boss ? Math.sin(this.bob) * 0.2 : 0);

    if (this.cd === 0) {
      if (this.t.ranged) {
        this.cd = this.t.cd;
        const aim = () => { const ax = px - this.x, ay = py - this.y, az = pz - this.z, l = Math.hypot(ax, ay, az) || 1; return [ax / l, ay / l, az / l]; };
        const col = C.eshot;
        const fire = (dirx, diry, dirz, sp, scale = 1.3) => pool.spawn(this.x, this.y, this.z, dirx, diry, dirz,
          { fromPlayer: false, speed: sp, damage: this.dmg, color: col, r: 0.45, life: 6, scale });
        if (this.boss && this.type === 'boss') {
          this._v ^= 1;
          if (this._v === 0) {
            const N = 20; for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2 + this.spin; fire(Math.cos(a), 0, Math.sin(a), 10); }
            for (const a2 of this.p.arms) a2.kick = 1;
          } else {
            const [ax, ay, az] = aim(); const base = Math.atan2(az, ax);
            for (let i = -3; i <= 3; i++) { const a = base + i * 0.16; fire(Math.cos(a), ay, Math.sin(a), 13); }
            this.p.arms[this._f ^= 1].kick = 1;
          }
        } else if (this.boss && this.type === 'boss2') {
          const [ax, ay, az] = aim(); const base = Math.atan2(az, ax);
          for (let i = -1; i <= 1; i++) { const a = base + i * 0.22; fire(Math.cos(a), ay, Math.sin(a), 15); }
          this._v = (this._v + 1) % 3; if (this._v === 0) { this.summonPulse = true; this.p.howlT = 1; }
        } else if (this.boss && this.type === 'boss3') {
          for (const armOffset of this._arms) { const a = armOffset + this.spin * 2.2; fire(Math.cos(a), 0, Math.sin(a), 9); }
          this.p.rec = 1;
        } else if (this.type === 'flyer') {
          // WASP: narrow aimed burst with a slight vertical ladder. It creates a jump/dash
          // question without blanketing the arena in random bullets.
          const [ax, ay, az] = aim(); const base = Math.atan2(az, ax);
          for (let i = -1; i <= 1; i++) { const a = base + i * 0.12; fire(Math.cos(a), ay + i * 0.055, Math.sin(a), 15.5, 1.15); }
          this.p.rec = 1;
        } else if (this.type === 'turret') {
          // TORTOISE: alternating 5-shot fan. The fan is deliberately wide enough to
          // close a lane but leaves obvious gaps to dash through.
          const [ax, ay, az] = aim(); const base = Math.atan2(az, ax); this._v ^= 1;
          const bias = this._v ? 0.16 : -0.16;
          for (let i = -2; i <= 2; i++) { const a = base + bias + i * 0.18; fire(Math.cos(a), ay * 0.55, Math.sin(a), 11.5, 1.2); }
          this.p.rec = 1;
        }
      } else if (dh < this.r + 0.9) { this.cd = this.t.cd; player.hurt(this.dmg); }
    }

    const velNow = Math.hypot(this.x - this._px, this.z - this._pz) / Math.max(dt, 1e-4);
    this._px = this.x; this._pz = this.z; this._gait += dt * (2 + velNow * 1.7); const P = this.p;
    if (this.type === 'chaser') {
      const k = Math.min(1, velNow / 4.5);
      P.legs.forEach((l, i) => { const ph = this._gait * 2.4 + ((i === 0 || i === 3) ? 0 : Math.PI); l.hip.rotation.x = Math.sin(ph) * 0.7 * k; l.knee.rotation.x = Math.max(0.08, -Math.sin(ph - 0.6)) * 0.85 * k; });
      P.jaw.rotation.x = dh < 4.5 ? 0.35 + Math.sin(this.bob * 9) * 0.3 : lerp(P.jaw.rotation.x, 0.06, dt * 8);
      P.tail.rotation.x = 0.35 + Math.sin(this.bob * 3.2) * 0.25; P.head.rotation.x = Math.sin(this.bob * 1.4) * 0.06;
    } else if (this.type === 'turret') {
      for (const w of P.wheels) w.rotation.x -= velNow * dt * 3.2;
      P.rec = Math.max(0, (P.rec ?? 0) - dt * 4); P.barrel.position.z = -0.5 + P.rec * 0.22;
      const dyA = (player.y + 1.1) - this.y; P.tur.rotation.x = lerp(P.tur.rotation.x, Math.max(-0.5, Math.min(0.35, -Math.atan2(dyA, dh) * 0.7)), dt * 4);
    } else if (this.type === 'flyer') {
      for (const wv of P.wings) wv.rotation.z = wv.userData.sx * (0.18 + Math.sin(this.bob * 12) * 0.5);
      P.rotor.rotation.y += dt * 30; P.rec = Math.max(0, (P.rec ?? 0) - dt * 4); P.pod.position.z = -0.12 + P.rec * 0.12;
    } else if (this.type === 'boss') {
      P.arms.forEach((a2, i) => { a2.kick = Math.max(0, a2.kick - dt * 3.5); a2.ap.rotation.x = -0.45 + Math.sin(this.bob * 1.5 + i * Math.PI) * 0.12 * Math.min(1, velNow / 2) - a2.kick * 0.5; });
    } else if (this.type === 'boss2') {
      const k = Math.min(1, velNow / 4.5);
      P.legs.forEach((l, i) => { const ph = this._gait * 2.6 + ((i === 0 || i === 3) ? 0 : Math.PI); l.hip.rotation.x = Math.sin(ph) * 0.55 * k; l.knee.rotation.x = Math.max(0.06, -Math.sin(ph - 0.6)) * 0.7 * k; });
      P.howlT = Math.max(0, (P.howlT ?? 0) - dt * 1.4); P.neck.rotation.x = 0.28 - P.howlT * 0.85;
    } else if (this.type === 'boss3') {
      P.ring.rotation.y = this.spin * 2.2 - this.g.rotation.y; P.rec = Math.max(0, (P.rec ?? 0) - dt * 4);
      for (const b of P.barrels) b.position.z = -0.45 + P.rec * 0.16;
      P.legs.forEach((l, i) => { l.knee.rotation.z = -1.35 + Math.sin(this.bob * 2 + i) * 0.07; });
    }

    this.x = Math.max(-bound, Math.min(bound, this.x)); this.z = Math.max(-bound, Math.min(bound, this.z));
    this.g.position.set(this.x, this.y, this.z); this.g.rotation.y = Math.atan2(-dx, -dz);
    if (this.t.fly) this.g.rotation.z = Math.sin(this.bob) * 0.15;
  }
}
