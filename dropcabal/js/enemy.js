// Drop Cabal — the Toko Drop menagerie in a Cabal gallery.
// Enemies live on fixed depth rows in the field, run/strafe laterally, and fire slow
// readable orbs at the player plane. Blobs are gel spheres that hop, cubes are
// rounded boxes that slide with a rock — same colours + silhouettes as toko-drop.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const EType = { BLOB: 0, CUBE: 1, SPITTOR: 2, HEAVY: 3, BIG: 4, MINI: 5 };

export const ECFG = {
  [EType.BLOB]:    { name: 'GLOBBO',      color: 0x00ccaa, r: 0.62, hp: 1, speed: 5.5, fire: [2.4, 4.2], score: 100, shape: 'blob', shot: 'aim',    orb: 0x66ffe0 },
  [EType.CUBE]:    { name: 'YELA CUBE',   color: 0xffdd00, r: 0.60, hp: 2, speed: 7.5, fire: [2.2, 3.8], score: 150, shape: 'cube', shot: 'fast',   orb: 0xffee66 },
  [EType.SPITTOR]: { name: 'SPITTOR',     color: 0xff5533, r: 0.80, hp: 3, speed: 3.2, fire: [2.6, 4.4], score: 300, shape: 'blob', shot: 'lob',    orb: 0xff7755 },
  [EType.HEAVY]:   { name: 'ORANGE CUBE', color: 0xff8800, r: 0.78, hp: 4, speed: 2.6, fire: [3.0, 4.8], score: 400, shape: 'cube', shot: 'spread', orb: 0xffaa44 },
  [EType.BIG]:     { name: 'SPLITTA',     color: 0x88ff22, r: 1.15, hp: 7, speed: 2.2, fire: [2.4, 4.0], score: 800, shape: 'blob', shot: 'lob',    orb: 0xaaff44 },
  [EType.MINI]:    { name: 'MINI',        color: 0x55eecc, r: 0.34, hp: 1, speed: 8.5, fire: null,       score: 50,  shape: 'blob', shot: null,     orb: 0 },
};

const _white = new THREE.Color(0xffffff);

export class Enemy {
  constructor(scene, type, row, fromSide, atX = null) {
    this.type = type;
    this.cfg = ECFG[type];
    this.row = row;               // { z, half }
    this.alive = true;
    this.hp = this.cfg.hp;
    this.r = this.cfg.r;
    this._t = Math.random() * 10;
    this._flashT = 0;
    this._fireT = this._rollFire();
    this._strafeT = 0.6 + Math.random();
    this.state = 'enter';

    const half = row.half;
    this.z = row.z;
    this.targetX = (Math.random() * 2 - 1) * half * 0.85;
    if (atX !== null) {          // e.g. minis bursting out of a dead Splitta
      this.x = atX;
      this.state = 'strafe';
    } else {
      this.x = fromSide * (half + 5);
    }

    this._build(scene);
  }

  _rollFire() {
    const f = this.cfg.fire;
    return f ? f[0] + Math.random() * (f[1] - f[0]) : Infinity;
  }

  _build(scene) {
    this.group = new THREE.Group();
    const c = this.cfg;
    this.mat = new THREE.MeshBasicMaterial({ color: c.color });
    this.baseColor = new THREE.Color(c.color);
    let geo;
    if (c.shape === 'cube') {
      const s = c.r * 1.7;
      geo = new RoundedBoxGeometry(s, s, s, 2, c.r * 0.28);
    } else {
      geo = new THREE.SphereGeometry(c.r, 12, 10);
    }
    this.body = new THREE.Mesh(geo, this.mat);
    this.group.add(this.body);

    // eyes face +z (the camera / player side)
    const eyeGeo = new THREE.SphereGeometry(c.r * 0.16, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1028 });
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(sx * c.r * 0.34, c.r * 0.22, c.r * 0.82);
      this.group.add(eye);
    }

    this.group.position.set(this.x, c.r, this.z);
    scene.add(this.group);
  }

  // ctx: { dt, playerX, playerZ, shoot(e) }
  update(ctx) {
    const dt = ctx.dt;
    this._t += dt;
    const c = this.cfg;

    if (this.type === EType.MINI) {
      // kamikaze: rush the player plane
      this.z += c.speed * dt;
      this.x += Math.sign(ctx.playerX - this.x) * Math.min(4 * dt, Math.abs(ctx.playerX - this.x));
    } else if (this.state === 'enter') {
      const d = this.targetX - this.x;
      this.x += Math.sign(d) * Math.min(c.speed * 1.3 * dt, Math.abs(d));
      if (Math.abs(d) < 0.2) this.state = 'strafe';
    } else {
      const d = this.targetX - this.x;
      this.x += Math.sign(d) * Math.min(c.speed * dt, Math.abs(d));
      this._strafeT -= dt;
      if (this._strafeT <= 0) {
        this.targetX = (Math.random() * 2 - 1) * this.row.half * 0.85;
        this._strafeT = 1.2 + Math.random() * 1.6;
      }
      this._fireT -= dt;
      if (this._fireT <= 0) {
        this._fireT = this._rollFire();
        ctx.shoot(this);
      }
    }

    // body language
    let y = c.r;
    if (c.shape === 'blob') {
      const hop = Math.abs(Math.sin(this._t * (this.type === EType.MINI ? 11 : 6)));
      y += hop * c.r * 0.7;
      const squish = 1 - Math.sin(this._t * 6) * 0.08;
      this.body.scale.set(1 + (1 - squish) * 0.6, squish, 1 + (1 - squish) * 0.6);
    } else {
      this.body.rotation.z = Math.sin(this._t * 5) * 0.14;
    }
    this.group.position.set(this.x, y, this.z);

    if (this._flashT > 0) {
      this._flashT -= dt;
      const k = Math.max(0, this._flashT / 0.12);
      this.mat.color.copy(this.baseColor).lerp(_white, k);
    }
  }

  takeHit(dmg = 1) {
    this.hp -= dmg;
    this._flashT = 0.12;
    this.mat.color.copy(_white);
    return this.hp <= 0;
  }

  muzzle(out) {
    out.set(this.x, this.group.position.y + this.r * 0.4, this.z + this.r * 0.9);
    return out;
  }

  dispose(scene) {
    scene.remove(this.group);
    this.body.geometry.dispose();
    this.mat.dispose();
  }
}
