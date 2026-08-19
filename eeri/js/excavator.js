// EERI — the excavator: first mount (ART_BRIEF §3.6, Tonka × Cat).
// Real anatomy — cab/house on tracks, boom → stick → bucket with pivots at
// the physical hinges; Tonka build — thick parts, big radii, one body
// colour + near-black undercarriage, bolt heads as the detail motif.
//
// The visual is an ASSET behind the seam: buildExcavatorModel() is the
// placeholder, a live excavator_vN.glb replaces it via the same node
// contract (house boom stick bucket seat step wheels). Everything animates
// through the named nodes, so game code never knows which it got.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=30';
import { craftMat, craftBox } from './craft.js?v=30';

export function buildExcavatorModel(tint = 0) {
  const T = (c) => (tint > 0 ? mix(c, PAL.SKY_PALE, tint) : c);
  const root = new THREE.Group(); // origin at ground contact, facing +x
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

  // undercarriage: two tracks with visible road wheels (the Tonka read)
  const tracks = new THREE.Group(); tracks.name = 'tracks'; root.add(tracks);
  const wheels = new THREE.Group(); wheels.name = 'wheels'; tracks.add(wheels);
  for (const dz of [0.62, -0.62]) {
    box(tracks, 2.7, 0.62, 0.42, PAL.DARK, 0, 0.36, dz);
    box(tracks, 2.2, 0.2, 0.46, PAL.INK, 0, 0.08, dz);
    for (const wx of [-0.95, -0.32, 0.32, 0.95]) {
      // each wheel is a spin group: children roll about local z
      const spin = new THREE.Group(); spin.position.set(wx, 0.3, dz);
      const w = cyl(spin, 0.24, 0.5, PAL.STEEL[1], 0, 0, 0, 9);
      w.rotation.x = Math.PI / 2;
      cyl(spin, 0.09, 0.54, PAL.INK, 0, 0, 0, 6).rotation.x = Math.PI / 2; // hub
      wheels.add(spin);
    }
  }
  nodes.wheels = wheels;

  // the step up to the cab — the mount move is legible because this exists
  const step = new THREE.Group(); step.name = 'step';
  step.position.set(0.95, 0.55, 0.62);
  box(step, 0.36, 0.07, 0.3, PAL.MACHINE, 0, 0, 0);
  box(step, 0.06, 0.45, 0.06, PAL.DARK, -0.15, 0.25, 0);
  root.add(step); nodes.step = step;

  // deck plate between tracks and house
  box(root, 2.1, 0.18, 1.15, PAL.STEEL[0], -0.05, 0.76, 0);

  // the house: body, counterweight, exhaust, open cab, and the boom root
  const house = new THREE.Group(); house.name = 'house'; house.position.y = 0.86;
  root.add(house); nodes.house = house;

  box(house, 1.3, 0.72, 1.06, PAL.MACHINE, -0.32, 0.36, 0);
  box(house, 0.52, 0.62, 1.06, PAL.MACHINE_DK, -1.18, 0.34, 0);  // counterweight
  box(house, 1.3, 0.1, 1.1, PAL.MACHINE_DK, -0.32, 0.05, 0);     // skirt band
  cyl(house, 0.055, 0.4, PAL.DARK, -0.75, 0.9, 0.3, 8);          // exhaust
  for (const bx of [-0.85, -0.45, -0.05]) {                       // bolt motif
    const b = cyl(house, 0.045, 0.06, PAL.DARK, bx, 0.5, 0.55, 6);
    b.rotation.x = Math.PI / 2;
  }

  // open seat, no canopy — the pressed-steel Tonka read, and the rider is
  // never swallowed by the mount (the Yoshi rule)
  const cab = new THREE.Group(); cab.position.set(0.52, 0, 0); house.add(cab);
  box(cab, 0.78, 0.07, 0.8, PAL.STEEL[1], 0, 0.03, 0);            // floor
  box(cab, 0.3, 0.26, 0.52, PAL.MACHINE_DK, 0.36, 0.2, 0);        // dash console
  box(cab, 0.34, 0.1, 0.34, PAL.DARK, -0.12, 0.22, 0);            // seat pad
  box(cab, 0.1, 0.4, 0.34, PAL.DARK, -0.3, 0.42, 0);              // backrest
  for (const dz of [0.09, -0.09]) {                                // the levers
    const l = cyl(cab, 0.022, 0.3, PAL.INK, 0.18, 0.32, dz, 6);
    l.rotation.z = -0.35;
  }
  const seat = new THREE.Group(); seat.name = 'seat';
  seat.position.set(-0.1, 0.12, 0); cab.add(seat); nodes.seat = seat;

  // THE BEACON (ART_BRIEF §1.2): amber, lit and turning while nobody is
  // driving, dark the moment Eeri is aboard. It is the unmanned tell, and
  // it is the hazard telegraph — one lamp doing both jobs, as on real plant.
  const beacon = new THREE.Group(); beacon.name = 'beacon';
  beacon.position.set(-0.5, 1.1, 0.34); house.add(beacon);
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.13, 0.17, 8),
    new THREE.MeshBasicMaterial({ color: '#ff9c1a' }),   // unlit material: it IS the light
  );
  lamp.position.y = 0.1; beacon.add(lamp);
  // the turning flash — one bright face sweeping round
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, 0.16),
    new THREE.MeshBasicMaterial({ color: '#ffdc8a', transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  flash.position.set(0.13, 0.1, 0); flash.rotation.y = Math.PI / 2; beacon.add(flash);
  box(beacon, 0.1, 0.1, 0.1, PAL.DARK, 0, 0, 0);        // its base
  nodes.beacon = beacon;

  // boom → stick → bucket, pivots at the physical hinges (the Cat anatomy)
  const boom = new THREE.Group(); boom.name = 'boom';
  boom.position.set(0.35, 0.28, 0); house.add(boom); nodes.boom = boom;
  box(boom, 1.65, 0.3, 0.24, PAL.MACHINE, 0.78, 0, 0);
  box(boom, 1.65, 0.08, 0.26, PAL.MACHINE_DK, 0.78, -0.15, 0);   // underside band

  const stick = new THREE.Group(); stick.name = 'stick';
  stick.position.set(1.58, 0, 0); boom.add(stick); nodes.stick = stick;
  box(stick, 1.1, 0.2, 0.18, PAL.MACHINE, 0.5, 0, 0);

  const bucket = new THREE.Group(); bucket.name = 'bucket';
  bucket.position.set(1.02, 0, 0); stick.add(bucket); nodes.bucket = bucket;
  box(bucket, 0.42, 0.1, 0.5, PAL.STEEL[1], 0.16, -0.2, 0);       // floor
  box(bucket, 0.1, 0.36, 0.5, PAL.STEEL[1], -0.06, -0.05, 0);     // back
  for (const dz of [-0.18, 0, 0.18]) {                             // teeth
    box(bucket, 0.14, 0.07, 0.1, PAL.STEEL[0], 0.4, -0.22, dz);
  }

  // rest pose: boom up, stick folded, bucket tucked
  boom.rotation.z = 0.52;
  stick.rotation.z = -1.35;
  bucket.rotation.z = -0.6;

  return { root, nodes };
}

// ---- the machine body: heavy, committed, honest joints -------------------

const TOP = 3.4, ACCEL = 4.2, GRAV = 30;

export class Excavator {
  constructor(level, x, y, asset, tamed = true) {
    this.level = level;
    this.group = new THREE.Group();
    this.group.add(asset.root);
    this.n = asset.nodes;
    // A machine is dangerous until it is yours (ART_BRIEF §1.2). Untamed, it
    // works its own cycle — it is not hunting anybody, it is heavy and blind.
    this.tamed = tamed;
    this.carrying = false;   // a slung load: the machine earns its slowness
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.hw = 1.42; this.h = 2.1;
    this.face = 1; this.turn = -0.15;
    this.t = Math.random() * 10;
    this.boomTarget = 0.52; this.boomV = 0;
    this.stickTarget = -1.35;
    this.squash = 0; this.squashV = 0;
    this.puffT = 0;

    // wide blob shadow
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.scale.set(1.7, 1, 0.7);

    // exhaust puffs: small pooled spheres, the engine ticking over
    this.puffs = [];
    for (let i = 0; i < 7; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 7, 6),
        new THREE.MeshBasicMaterial({ color: PAL.STEEL[3], transparent: true, opacity: 0 }),
      );
      p.life = 1; this.puffs.push(p); this.group.parent; // (attached by main)
    }
  }

  box() { return { x: this.x, y: this.y, hw: this.hw, h: this.h }; }
  seatWorld(v) { return this.n.seat.getWorldPosition(v); }
  stepWorld(v) { return this.n.step.getWorldPosition(v); }
  bucketWorld(v) { return this.n.bucket.getWorldPosition(v); }

  // taming it: the threat becomes the tool, and the beacon goes out
  tame() { this.tamed = true; }

  // the unmanned work cycle — a slow dig it repeats forever. The bucket
  // sweeping low IS the danger, and the lift is the window you mount in.
  work(dt) {
    this.t += dt;
    const ph = this.t * 0.62;
    this.boomTarget = 0.5 + Math.sin(ph) * 0.42;      // low = bucket in the dirt
    this.stickTarget = -1.2 + Math.sin(ph + 0.9) * 0.34;
    this.vx = 0;
    this.vy -= GRAV * dt;
    const my = this.level.moveY(this.box(), this.vy * dt);
    this.y = my.y; if (my.hit) this.vy = 0;
    this.animate(dt, 0);
  }

  // true while the bucket is down in its sweep — the half of the cycle
  // that will knock you flat
  get swinging() { return this.n.boom.rotation.z < 0.34; }

  // controls: {drive: -1|0|1, boomUp, boomDown} — null when nobody is in the cab
  update(dt, controls) {
    this.t += dt;
    const drive = controls ? controls.drive : 0;

    // drive: heavy ease in and out — weight is the whole act. A slung
    // girder halves the pace: carrying is a commitment, not a stroll.
    const target = drive * TOP * (this.carrying ? 0.55 : 1);
    this.vx += (target - this.vx) * Math.min(1, ACCEL * dt);
    if (Math.abs(this.vx) < 0.02 && !drive) this.vx = 0;
    if (drive) this.face = Math.sign(drive);

    const wasFalling = this.vy < -3;
    this.vy -= GRAV * dt;
    const mx = this.level.moveX(this.box(), this.vx * dt);
    // a machine refuses a cliff: if the ground ahead drops away, stop at the lip
    const ahead = mx.x + Math.sign(this.vx || this.face) * this.hw;
    if (this.level.grounded(this.box()) && this.level.groundTop(ahead, this.y + 0.5) < this.y - 1.5) {
      this.vx = 0;
    } else {
      this.x = mx.x; if (mx.hit) this.vx = 0;
    }
    const my = this.level.moveY(this.box(), this.vy * dt);
    this.y = my.y;
    if (my.hit) {
      if (my.grounded && wasFalling) this.squashV = -1.6; // land on the suspension
      this.vy = 0;
    }

    // boom control: eased, clamped at the real joint limits
    if (controls) {
      const dir = (controls.boomUp ? 1 : 0) - (controls.boomDown ? 1 : 0);
      this.boomTarget = Math.max(0.08, Math.min(0.95, this.boomTarget + dir * 1.1 * dt));
      this.stickTarget = -1.35 + (0.52 - this.boomTarget) * 0.9;
    }

    this.animate(dt, drive);
  }

  // background-worker mode: no physics, the boom works a slow dig loop —
  // "depth you watch, not just parallax you scroll"
  auto(dt) {
    this.t += dt;
    const ph = this.t * 0.35;
    this.boomTarget = 0.5 + Math.sin(ph) * 0.32;
    this.stickTarget = -1.2 + Math.sin(ph + 0.9) * 0.3;
    this.animate(dt, 0);
  }

  animate(dt, drive) {
    const n = this.n;

    // facing: an animated turn, sweeping through the camera — never a mirror
    const tgt = this.face > 0 ? -0.15 : Math.PI + 0.15;
    this.turn += (tgt - this.turn) * Math.min(1, 6 * dt);
    this.group.rotation.y = this.turn;

    // boom spring: ease toward target with a little overshoot-and-settle
    const cur = n.boom.rotation.z;
    this.boomV += ((this.boomTarget - cur) * 26 - this.boomV * 7.5) * dt;
    n.boom.rotation.z = cur + this.boomV * dt;
    n.stick.rotation.z += (this.stickTarget - n.stick.rotation.z) * Math.min(1, 5 * dt);
    // bucket holds a working angle against the boom, with a settle wobble
    n.bucket.rotation.z += ((-0.6 - (n.boom.rotation.z - 0.52) * 0.8) - n.bucket.rotation.z) * Math.min(1, 4 * dt);

    // wheels roll for real (children of the wheels node spin about local z)
    for (const spin of n.wheels.children) spin.rotation.z -= (this.vx * dt) / 0.24;

    // suspension squash — never the metal
    this.squashV += (1 - (1 + this.squash)) * 30 * dt - this.squashV * 8 * dt;
    this.squash += this.squashV * dt;
    const sq = 1 + Math.max(-0.18, Math.min(0.1, this.squash));
    if (n.wheels.parent) n.wheels.parent.scale.y = sq;

    // the beacon: turning while nobody is driving, dark once it is yours
    if (n.beacon) {
      n.beacon.visible = !this.tamed;
      if (!this.tamed) n.beacon.rotation.y += dt * 5.2;
    }

    // idle: the engine ticks over — the machine never freezes
    n.house.position.y = 0.86 + Math.sin(this.t * 34) * (drive ? 0.009 : 0.005);
    // slight pitch under acceleration, settling back
    const lean = -Math.sign(this.vx) * Math.min(0.035, Math.abs(this.vx) * 0.012);
    this.group.rotation.z += (lean - this.group.rotation.z) * Math.min(1, 3 * dt);

    this.group.position.set(this.x, this.y, this.group.position.z);

    // shadow
    const gy = this.level.groundTop(this.x, this.y + 0.1);
    this.shadow.position.set(this.x, gy + 0.02, this.group.position.z);
    this.shadow.visible = gy > -3;

    // exhaust
    this.puffT -= dt;
    if (this.puffT <= 0) {
      this.puffT = drive ? 0.28 : 0.62;
      const p = this.puffs.find((q) => q.life >= 1);
      if (p) {
        p.life = 0;
        this.n.house.getWorldPosition(p.position);
        p.position.x -= 0.75 * this.face; p.position.y += 1.35;
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
