// EERI — the kid (ART_BRIEF §3.7). Toy-figure proportions (~2.5 heads),
// machine-yellow hard hat as the silhouette key, expression in pose and
// timing, not face.
//
// The visual is an ASSET behind the seam: buildKidModel() is the code-built
// placeholder, and a live eeri_vN.glb replaces it by exposing the same
// contracted nodes (hipL hipR armL armR body head — see assets/README.md).
// Kid poses whatever it is handed; it never knows which side of the seam
// the model came from.

import * as THREE from 'three';
import { PAL } from './palette.js?v=1';

const FACE_TURN = 0.42 * Math.PI; // 3/4 view: forward ±x, tipped toward camera

export function buildKidModel() {
  const root = new THREE.Group(); // origin at the feet, facing +x
  const nodes = {};
  const M = (c) => new THREE.MeshLambertMaterial({ color: c });
  const box = (parent, w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };

  // legs: pivot groups at the hip so the run swings from the right joint
  for (const [name, dz] of [['hipL', 0.11], ['hipR', -0.11]]) {
    const hip = new THREE.Group(); hip.name = name;
    hip.position.set(0, 0.56, dz);
    box(hip, 0.17, 0.42, 0.19, PAL.PANTS, 0, -0.24, 0);
    box(hip, 0.2, 0.14, 0.24, PAL.BOOT, 0.03, -0.5, 0); // boot, toe forward
    root.add(hip); nodes[name] = hip;
  }

  // body: high-vis vest over shirt
  const body = new THREE.Group(); body.name = 'body'; body.position.y = 0.56;
  box(body, 0.4, 0.5, 0.3, PAL.VEST, 0, 0.25, 0);
  box(body, 0.42, 0.1, 0.32, PAL.SHIRT, 0, 0.06, 0);   // shirt hem
  box(body, 0.41, 0.07, 0.31, PAL.CLOUD, 0, 0.3, 0);   // hi-vis band
  root.add(body); nodes.body = body;

  // arms: pivot at the shoulder, children of the body so the lean carries them
  for (const [name, dz] of [['armL', 0.24], ['armR', -0.24]]) {
    const sh = new THREE.Group(); sh.name = name;
    sh.position.set(0, 0.44, dz);
    box(sh, 0.13, 0.4, 0.13, PAL.SHIRT, 0, -0.18, 0);
    box(sh, 0.12, 0.1, 0.12, PAL.SKIN, 0, -0.4, 0); // hand
    body.add(sh); nodes[name] = sh;
  }

  // head + the hat: the silhouette key
  const head = new THREE.Group(); head.name = 'head'; head.position.y = 1.12;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), M(PAL.SKIN));
  skull.position.y = 0.22; head.add(skull);
  for (const dz of [0.11, -0.11]) { // dot eyes on the +x face
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), M(PAL.INK));
    eye.position.set(0.26, 0.26, dz); head.add(eye);
  }
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.18, 12), M(PAL.MACHINE));
  hat.position.y = 0.5; head.add(hat);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 12), M(PAL.MACHINE_DK));
  brim.position.set(0.06, 0.42, 0); head.add(brim);
  root.add(head); nodes.head = head;

  return { root, nodes };
}

export class Kid {
  constructor(asset) {
    this.group = new THREE.Group();
    this.group.add(asset.root);
    this.n = asset.nodes;
    // remember rest offsets so a GLB with its own base positions poses right
    this.baseBodyY = this.n.body.position.y;

    // blob shadow — the landing aid (no shadow maps anywhere)
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;

    this.face = 1;
    this.turn = FACE_TURN;
  }

  setFace(f) { if (f) this.face = f; }

  // state: 'idle' | 'run' | 'air' | 'ride' | 'climb'
  pose(state, t, speed = 0) {
    // the turn is animated, not mirrored — a 3D cast's free win.
    // riding, the pose is local to the seat and the machine owns the facing.
    const target = state === 'ride' ? 0
      : this.face > 0 ? FACE_TURN : Math.PI - FACE_TURN;
    this.turn += (target - this.turn) * 0.18;
    this.group.rotation.y = this.turn;

    const n = this.n;
    const lerp = (o, k, v) => { o.rotation.z += (v - o.rotation.z) * k; };
    if (state === 'run') {
      const ph = t * 11;
      const sw = 0.55 + 0.45 * Math.min(1, speed / 6);
      n.hipL.rotation.z = Math.sin(ph) * sw;
      n.hipR.rotation.z = Math.sin(ph + Math.PI) * sw;
      n.armL.rotation.z = Math.sin(ph + Math.PI) * sw * 0.8;
      n.armR.rotation.z = Math.sin(ph) * sw * 0.8;
      lerp(n.body, 0.2, -0.22);                 // the run leans forward
      n.body.position.y = this.baseBodyY + Math.abs(Math.sin(ph)) * 0.04;
      lerp(n.head, 0.2, 0.1);
    } else if (state === 'air') {
      lerp(n.hipL, 0.15, 0.8); lerp(n.hipR, 0.15, -0.5);
      lerp(n.armL, 0.15, -1.4); lerp(n.armR, 0.15, -1.2);
      lerp(n.body, 0.15, -0.1); lerp(n.head, 0.15, 0);
    } else if (state === 'ride') {
      // seated: legs forward, hands to the levers, all business
      lerp(n.hipL, 0.25, 1.35); lerp(n.hipR, 0.25, 1.2);
      lerp(n.armL, 0.25, -0.85); lerp(n.armR, 0.25, -0.7);
      lerp(n.body, 0.25, 0.06); lerp(n.head, 0.25, -0.06);
      n.body.position.y = this.baseBodyY;
    } else if (state === 'climb') {
      lerp(n.hipL, 0.3, 1.0); lerp(n.hipR, 0.3, 0.2);
      lerp(n.armL, 0.3, -2.2); lerp(n.armR, 0.3, -1.8);
      lerp(n.body, 0.3, -0.15);
    } else { // idle: a kid's idle — breath, small sway, never frozen
      lerp(n.hipL, 0.1, 0); lerp(n.hipR, 0.1, 0);
      lerp(n.armL, 0.1, Math.sin(t * 1.7) * 0.06);
      lerp(n.armR, 0.1, -Math.sin(t * 1.7) * 0.06);
      lerp(n.body, 0.1, 0);
      n.body.scale.y = 1 + Math.sin(t * 2.1) * 0.015;
      n.body.position.y = this.baseBodyY;
      lerp(n.head, 0.1, Math.sin(t * 0.9) * 0.04);
    }
  }
}

// ---- the platforming body (Mario grammar: snappy, committed) -------------

const RUN = 6.2, ACC = 42, ACC_AIR = 20, FRIC = 34;
const GRAV = 30, FALL_X = 1.35, JUMP_V = 12.6;
const COYOTE = 0.09, BUFFER = 0.12;

export class Player {
  constructor(level, spawn, kid) {
    this.level = level;
    this.kid = kid;
    this.x = spawn.x; this.y = spawn.y;
    this.vx = 0; this.vy = 0;
    this.hw = 0.3; this.h = 1.5;
    this.groundedT = 0; this.jumpBufT = 0;
    this.grounded = false;
    this.squash = 0;
    this.t = 0;
    this.mercyT = 0;
    // one-frame events for the noise to hang off
    this.justJumped = false; this.justLanded = false;
  }

  // knocked back by a hazard: the cost is never death (ART_BRIEF hazards)
  struck(fromX) {
    if (this.mercyT > 0) return false;
    this.mercyT = 1.3;
    this.vx = (this.x < fromX ? -1 : 1) * 7.5;
    this.vy = 7;
    return true;
  }

  box() { return { x: this.x, y: this.y, hw: this.hw, h: this.h }; }

  update(dt, input) {
    this.t += dt;
    this.justJumped = false; this.justLanded = false;
    this.mercyT = Math.max(0, this.mercyT - dt);
    const wasGrounded = this.grounded;
    const ax = input.axis();

    // horizontal: accelerate hard, stop hard — tap = a step, hold = a run
    const acc = this.grounded ? ACC : ACC_AIR;
    if (ax !== 0) {
      this.vx += ax * acc * dt;
      this.vx = Math.max(-RUN, Math.min(RUN, this.vx));
      this.kid.setFace(ax);
    } else if (this.grounded) {
      const s = Math.sign(this.vx);
      this.vx -= s * FRIC * dt;
      if (Math.sign(this.vx) !== s) this.vx = 0;
    }

    // jump: buffered + coyote, variable height on release
    if (input.take('jump') || input.take('up')) this.jumpBufT = BUFFER;
    else this.jumpBufT -= dt;
    if (this.jumpBufT > 0 && this.groundedT > 0) {
      this.vy = JUMP_V; this.jumpBufT = 0; this.groundedT = 0;
      this.justJumped = true;
    }
    if (!input.down.jump && !input.down.up && this.vy > 4) this.vy = 4;

    this.vy -= GRAV * (this.vy < 0 ? FALL_X : 1) * dt;
    this.vy = Math.max(this.vy, -22);

    const mx = this.level.moveX(this.box(), this.vx * dt);
    this.x = mx.x; if (mx.hit) this.vx = 0;
    const my = this.level.moveY(this.box(), this.vy * dt);
    this.y = my.y;
    if (my.hit) {
      if (my.grounded && this.vy < -9) this.squash = 0.12; // hard landing
      this.vy = 0;
    }
    this.grounded = my.grounded || this.level.grounded(this.box());
    this.groundedT = this.grounded ? COYOTE : this.groundedT - dt;
    if (this.grounded && !wasGrounded) this.justLanded = true;

    // fell in a pit (its floor is dressing, not ground): the level knows
    // which hole took him and hands back the near side of it
    if (this.y < 0.9) {
      const r = this.level.fallRespawn(this.x);
      this.x = r.x; this.y = r.y; this.vx = 0; this.vy = 0;
    }

    this.updateVisual();
  }

  updateVisual() {
    const k = this.kid;
    k.group.position.set(this.x, this.y, 0);
    this.squash = Math.max(0, this.squash - 0.016);
    k.group.scale.y = this.squash > 0 ? 0.86 : 1;
    // mercy flicker — the one place the kid is allowed to disappear
    k.group.visible = this.mercyT <= 0 || Math.floor(this.mercyT * 18) % 2 === 0;
    const state = !this.grounded ? 'air' : Math.abs(this.vx) > 0.4 ? 'run' : 'idle';
    k.pose(state, this.t, Math.abs(this.vx));
    const gy = this.level.groundTop(this.x, this.y + 0.1);
    k.shadow.position.set(this.x, gy + 0.02, 0);
    const drop = Math.max(0, this.y - gy);
    k.shadow.scale.setScalar(Math.max(0.35, 1 - drop * 0.12));
    k.shadow.material.opacity = Math.max(0.08, 0.28 - drop * 0.03);
    k.shadow.visible = gy > -3;
  }
}
