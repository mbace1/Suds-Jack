// EERI — the wrecking crane: the second mount, and the third verb.
//
// The brief had this machine down as a "hazard boss" (ART_BRIEF §5 cast
// list). The owner's direction moves it: a machine is dangerous until it is
// YOURS, and the ball that swings at you unmanned is the ball you swing at
// the wall once you are in the cab. Same object, both sides of the mount —
// which is the game's whole thesis stated in one machine.
//
// It reuses the excavator's contract exactly (house / boom / seat / step /
// wheels / beacon), so `assets.js` drops a live GLB behind it with the same
// node check and the same paint map. The ball hangs off the boom on a
// cable, and the swing is the wrecking ball's own arc from hazards.js —
// wind back, then strike — because that read is already learned.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=39';
import { craftMat, craftBox } from './craft.js?v=39';

export function buildCraneModel(tint = 0) {
  const T = (c) => (tint > 0 ? mix(c, PAL.SKY_PALE, tint) : c);
  const root = new THREE.Group();
  const nodes = {};
  const M = (c) => craftMat(T(c), 'balsa');   // painted wood (§3.3)
  const box = (parent, w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };
  const cyl = (parent, r, h, c, x, y, z, seg = 10) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), M(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };

  // crawler tracks, same undercarriage language as the excavator
  const tracks = new THREE.Group(); tracks.name = 'tracks'; root.add(tracks);
  const wheels = new THREE.Group(); wheels.name = 'wheels'; tracks.add(wheels);
  for (const dz of [0.66, -0.66]) {
    box(tracks, 3.0, 0.66, 0.44, PAL.DARK, 0, 0.38, dz);
    box(tracks, 2.4, 0.2, 0.48, PAL.INK, 0, 0.08, dz);
    for (const wx of [-1.05, -0.35, 0.35, 1.05]) {
      const spin = new THREE.Group(); spin.position.set(wx, 0.3, dz);
      const w = cyl(spin, 0.25, 0.52, PAL.STEEL[1], 0, 0, 0, 9);
      w.rotation.x = Math.PI / 2;
      cyl(spin, 0.09, 0.56, PAL.INK, 0, 0, 0, 6).rotation.x = Math.PI / 2;
      wheels.add(spin);
    }
  }
  nodes.wheels = wheels;

  const step = new THREE.Group(); step.name = 'step';
  step.position.set(1.0, 0.55, 0.66);
  box(step, 0.38, 0.07, 0.32, PAL.MACHINE, 0, 0, 0);
  box(step, 0.06, 0.45, 0.06, PAL.DARK, -0.16, 0.25, 0);
  root.add(step); nodes.step = step;

  box(root, 2.2, 0.18, 1.2, PAL.STEEL[0], -0.05, 0.78, 0);

  const house = new THREE.Group(); house.name = 'house'; house.position.y = 0.88;
  root.add(house); nodes.house = house;
  box(house, 1.4, 0.78, 1.1, PAL.MACHINE, -0.34, 0.39, 0);
  box(house, 0.6, 0.68, 1.1, PAL.MACHINE_DK, -1.26, 0.36, 0);   // counterweight
  box(house, 1.4, 0.1, 1.14, PAL.MACHINE_DK, -0.34, 0.05, 0);
  cyl(house, 0.06, 0.42, PAL.DARK, -0.8, 0.95, 0.32, 8);
  for (const bx of [-0.9, -0.5, -0.1]) {
    cyl(house, 0.05, 0.06, PAL.DARK, bx, 0.54, 0.57, 6).rotation.x = Math.PI / 2;
  }

  // open cab, the rider readable — the Yoshi rule
  const cab = new THREE.Group(); cab.position.set(0.56, 0, 0); house.add(cab);
  box(cab, 0.82, 0.07, 0.82, PAL.STEEL[1], 0, 0.03, 0);
  box(cab, 0.32, 0.28, 0.54, PAL.MACHINE_DK, 0.38, 0.21, 0);
  box(cab, 0.36, 0.1, 0.36, PAL.DARK, -0.12, 0.22, 0);
  box(cab, 0.1, 0.42, 0.36, PAL.DARK, -0.32, 0.43, 0);
  for (const dz of [0.1, -0.1]) {
    cyl(cab, 0.022, 0.32, PAL.INK, 0.2, 0.33, dz, 6).rotation.z = -0.35;
  }
  const seat = new THREE.Group(); seat.name = 'seat';
  seat.position.set(-0.1, 0.12, 0); cab.add(seat); nodes.seat = seat;

  // the unmanned tell, identical to the excavator's so it reads instantly
  const beacon = new THREE.Group(); beacon.name = 'beacon';
  beacon.position.set(-0.54, 1.16, 0.34); house.add(beacon);
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.17, 8),
    new THREE.MeshBasicMaterial({ color: '#ff9c1a' }),
  );
  lamp.position.y = 0.1; beacon.add(lamp);
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.16),
    new THREE.MeshBasicMaterial({ color: '#ffdc8a', transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  flash.position.set(0.13, 0.1, 0); flash.rotation.y = Math.PI / 2; beacon.add(flash);
  box(beacon, 0.1, 0.1, 0.1, PAL.DARK, 0, 0, 0);
  nodes.beacon = beacon;

  // THE BOOM: a lattice jib, raked up. The crane's one exaggerated feature
  // is height and hook — the silhouette rule (§5).
  const boom = new THREE.Group(); boom.name = 'boom';
  boom.position.set(0.3, 0.34, 0); house.add(boom); nodes.boom = boom;
  const L = 4.6;
  for (const dy of [0.16, -0.16]) {
    box(boom, L, 0.12, 0.16, PAL.MACHINE, L / 2, dy, 0);      // chords
  }
  for (let i = 0.4; i < L - 0.2; i += 0.72) {                   // lattice web
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.42, 0.13), M(PAL.MACHINE_DK));
    w.position.set(i, 0, 0); w.rotation.z = (i % 1.44 < 0.72) ? 0.6 : -0.6;
    boom.add(w);
  }
  box(boom, 0.3, 0.4, 0.3, PAL.MACHINE_DK, L, 0, 0);           // head sheave

  // the cable + ball hang from the boom head, and swing about it
  const arm = new THREE.Group(); arm.name = 'arm';
  arm.position.set(L, 0, 0); boom.add(arm); nodes.arm = arm;
  const drop = 2.5;
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, drop, 6), M(PAL.DARK));
  cable.position.y = -drop / 2; arm.add(cable);
  const ball = new THREE.Group(); ball.name = 'ball';
  ball.position.y = -drop; arm.add(ball); nodes.ball = ball;
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.56, 16, 12), M(PAL.STEEL[1]));
  ball.add(sphere);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.08, 6, 16), M(PAL.STEEL[0]));
  band.rotation.y = Math.PI / 2; ball.add(band);

  boom.rotation.z = 0.42;
  return { root, nodes, ballDrop: drop, boomLen: L };
}

// ---- the machine ---------------------------------------------------------

const TOP = 2.8, ACCEL = 3.4, GRAV = 30;
const WIND = 0.7, SWING = 0.95, RESET = 0.7;

export class Crane {
  constructor(level, x, y, asset, tamed = true) {
    this.level = level;
    this.group = new THREE.Group();
    this.group.add(asset.root);
    this.n = asset.nodes;
    this.drop = asset.ballDrop ?? 2.5;
    this.boomLen = asset.boomLen ?? 4.6;
    this.tamed = tamed;
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.hw = 1.6; this.h = 2.3;
    this.face = 1; this.turn = -0.15;
    this.t = Math.random() * 10;
    this.boomTarget = 0.42; this.boomV = 0;
    this.squash = 0; this.squashV = 0;
    this.puffT = 0;

    // the swing, on the wrecking ball's own clock: it winds back, and only
    // then does it strike. Readable first, dangerous second — and the same
    // arc whether it is threatening you or working for you.
    this.swing = 'rest'; this.swingT = 0; this.angle = 0;
    this.struckThisSwing = false;

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.scale.set(1.9, 1, 0.7);

    this.puffs = [];
    for (let i = 0; i < 7; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 7, 6),
        new THREE.MeshBasicMaterial({ color: PAL.STEEL[3], transparent: true, opacity: 0 }),
      );
      p.life = 1; this.puffs.push(p);
    }
    this._v = new THREE.Vector3();
  }

  box() { return { x: this.x, y: this.y, hw: this.hw, h: this.h }; }
  seatWorld(v) { return this.n.seat.getWorldPosition(v); }
  stepWorld(v) { return this.n.step.getWorldPosition(v); }
  ballWorld(v) { return this.n.ball.getWorldPosition(v); }
  tame() { this.tamed = true; }

  // true while the ball is coming through the bottom of its arc
  get striking() { return this.swing === 'strike' && this.swingT > 0.18 && this.swingT < 0.62; }

  // start a swing; ignored if one is already running
  heave() {
    if (this.swing !== 'rest') return false;
    this.swing = 'wind'; this.swingT = 0; this.struckThisSwing = false;
    return true;
  }

  // unmanned: it works its own slow cycle, heaving every few seconds
  work(dt) {
    this.t += dt;
    this.boomTarget = 0.42 + Math.sin(this.t * 0.4) * 0.1;
    this.vx = 0;
    this.vy -= GRAV * dt;
    const my = this.level.moveY(this.box(), this.vy * dt);
    this.y = my.y; if (my.hit) this.vy = 0;
    if (this.swing === 'rest' && Math.sin(this.t * 0.55) > 0.985) this.heave();
    this.animate(dt, 0);
  }

  update(dt, controls) {
    this.t += dt;
    const drive = controls ? controls.drive : 0;
    const target = drive * TOP;
    this.vx += (target - this.vx) * Math.min(1, ACCEL * dt);
    if (Math.abs(this.vx) < 0.02 && !drive) this.vx = 0;
    if (drive) this.face = Math.sign(drive);

    const wasFalling = this.vy < -3;
    this.vy -= GRAV * dt;
    const mx = this.level.moveX(this.box(), this.vx * dt);
    // a machine refuses a cliff — the same rule the excavator obeys
    const ahead = mx.x + Math.sign(this.vx || this.face) * this.hw;
    if (this.level.grounded(this.box()) && this.level.groundTop(ahead, this.y + 0.5) < this.y - 1.5) {
      this.vx = 0;
    } else {
      this.x = mx.x; if (mx.hit) this.vx = 0;
    }
    const my = this.level.moveY(this.box(), this.vy * dt);
    this.y = my.y;
    if (my.hit) { if (my.grounded && wasFalling) this.squashV = -1.6; this.vy = 0; }

    if (controls) {
      const dir = (controls.boomUp ? 1 : 0) - (controls.boomDown ? 1 : 0);
      this.boomTarget = Math.max(0.12, Math.min(0.86, this.boomTarget + dir * 0.9 * dt));
      if (controls.swing) this.heave();
    }
    this.animate(dt, drive);
  }

  auto(dt) {
    this.t += dt;
    this.boomTarget = 0.42 + Math.sin(this.t * 0.3) * 0.12;
    if (this.swing === 'rest' && Math.sin(this.t * 0.4) > 0.99) this.heave();
    this.animate(dt, 0);
  }

  animate(dt, drive) {
    const n = this.n;
    const tgt = this.face > 0 ? -0.15 : Math.PI + 0.15;
    this.turn += (tgt - this.turn) * Math.min(1, 6 * dt);
    this.group.rotation.y = this.turn;

    const cur = n.boom.rotation.z;
    this.boomV += ((this.boomTarget - cur) * 20 - this.boomV * 7) * dt;
    n.boom.rotation.z = cur + this.boomV * dt;

    // the arc: wind back slow, come through fast, settle
    this.swingT += dt;
    if (this.swing === 'wind') {
      this.angle = -1.05 * Math.min(1, this.swingT / WIND) ** 2;
      if (this.swingT >= WIND) { this.swing = 'strike'; this.swingT = 0; }
    } else if (this.swing === 'strike') {
      const k = Math.min(1, this.swingT / SWING);
      this.angle = -1.05 * Math.cos(k * Math.PI * 2) * (1 - k * 0.45);
      if (this.swingT >= SWING) { this.swing = 'settle'; this.swingT = 0; }
    } else if (this.swing === 'settle') {
      this.angle += (0 - this.angle) * Math.min(1, 5 * dt);
      if (this.swingT >= RESET) { this.swing = 'rest'; this.swingT = 0; }
    } else {
      this.angle += (0 - this.angle) * Math.min(1, 4 * dt);
    }
    // the cable hangs from the boom head, so the swing is about that point
    n.arm.rotation.z = -this.angle - n.boom.rotation.z;

    for (const spin of n.wheels.children) spin.rotation.z -= (this.vx * dt) / 0.25;

    this.squashV += (1 - (1 + this.squash)) * 30 * dt - this.squashV * 8 * dt;
    this.squash += this.squashV * dt;
    if (n.wheels.parent) n.wheels.parent.scale.y = 1 + Math.max(-0.18, Math.min(0.1, this.squash));

    if (n.beacon) {
      n.beacon.visible = !this.tamed;
      if (!this.tamed) n.beacon.rotation.y += dt * 5.2;
    }

    n.house.position.y = 0.88 + Math.sin(this.t * 34) * (drive ? 0.009 : 0.005);
    const lean = -Math.sign(this.vx) * Math.min(0.035, Math.abs(this.vx) * 0.012);
    this.group.rotation.z += (lean - this.group.rotation.z) * Math.min(1, 3 * dt);
    this.group.position.set(this.x, this.y, this.group.position.z);

    const gy = this.level.groundTop(this.x, this.y + 0.1);
    this.shadow.position.set(this.x, gy + 0.02, this.group.position.z);
    this.shadow.visible = gy > -3;

    this.puffT -= dt;
    if (this.puffT <= 0) {
      this.puffT = drive ? 0.28 : 0.62;
      const p = this.puffs.find((q) => q.life >= 1);
      if (p) {
        p.life = 0;
        n.house.getWorldPosition(p.position);
        p.position.x -= 0.85 * this.face; p.position.y += 1.4;
        p.scale.setScalar(1);
      }
    }
    for (const p of this.puffs) {
      if (p.life >= 1) { p.material.opacity = 0; continue; }
      p.life = Math.min(1, p.life + dt / 0.9);
      p.position.y += 1.1 * dt;
      p.position.x -= 0.25 * this.face * dt;
      p.scale.setScalar(1 + p.life * 2.2);
      p.material.opacity = 0.42 * (1 - p.life);
    }
  }
}
