// EERI — the small robots, and the small hazards.
//
// The house rule is the one the game already lives by: EVERYTHING
// TELEGRAPHS, and nothing kills. A robot is not a chaser — it patrols a
// declared span of floor (js/parts.js refuses to place one across a hole),
// it notices you, it winds up, and only then does it lunge. The cost is the
// Yoshi rule: a hit takes the RIDE, not the run.
//
// The clock is flashprince's sentry, compressed: patrol → notice → wind →
// lunge → recover, one state string and one accumulator, so the animation
// and the danger read off the same number and cannot disagree.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=2';
import { craftMat, craftBox } from './craft.js?v=2';

const NOTICE = 0.35, WIND = 0.45, LUNGE = 0.5, RECOVER = 0.7;
const SEE = 5.2, WALK = 1.5, LUNGE_SPEED = 6.4;

function buildRobot() {
  const g = new THREE.Group();
  const M = (c) => craftMat(c, 'balsa');
  const box = (w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
    m.position.set(x, y, z); g.add(m); return m;
  };
  // squat, wide, one exaggerated feature: the eye. Machine yellow says it
  // belongs to the worksite; hazard red says this one is not yours.
  box(0.62, 0.42, 0.5, PAL.MACHINE_DK, 0, 0.34, 0);          // body
  box(0.66, 0.1, 0.54, PAL.DARK, 0, 0.12, 0);                // skirt
  const eye = box(0.16, 0.16, 0.1, PAL.HAZARD, 0.26, 0.4, 0); // the eye
  box(0.5, 0.12, 0.42, mix(PAL.MACHINE, PAL.INK, 0.2), 0, 0.6, 0);
  const legs = [];
  for (const dx of [-0.2, 0.2]) {
    for (const dz of [0.18, -0.18]) {
      legs.push(box(0.1, 0.24, 0.1, PAL.DARK, dx, 0.12, dz));
    }
  }
  return { group: g, eye, legs };
}

export class Robot {
  // span = { c0, c1 } in cells; it never leaves it
  constructor(scene, level, span) {
    this.level = level;
    this.c0 = span.c0; this.c1 = span.c1;
    this.x = (span.c0 + span.c1) / 2;
    this.y = level.groundTop(this.x, 8);
    this.face = 1;
    this.state = 'patrol'; this.t = 0;
    this.dead = false;
    const built = buildRobot();
    this.group = built.group;
    this.eye = built.eye;
    this.legs = built.legs;
    this.hw = 0.34; this.h = 0.7;
    this.group.position.set(this.x, this.y, 0);
    scene.add(this.group);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 14),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.24 }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    scene.add(this.shadow);
  }

  go(s) { this.state = s; this.t = 0; }

  update(dt, target, reduced) {
    if (this.dead) return;
    this.t += dt;
    const dx = target.x - this.x;
    const near = Math.abs(dx) < SEE && Math.abs(target.y - this.y) < 2.2;

    if (this.state === 'patrol') {
      this.x += this.face * WALK * dt;
      if (this.x < this.c0) { this.x = this.c0; this.face = 1; }
      if (this.x > this.c1 + 1) { this.x = this.c1 + 1; this.face = -1; }
      if (near) { this.face = Math.sign(dx) || this.face; this.go('notice'); }
    } else if (this.state === 'notice') {
      if (this.t >= NOTICE) this.go('wind');
    } else if (this.state === 'wind') {
      this.x -= this.face * 0.9 * dt;                       // it draws back
      if (this.t >= WIND) this.go('lunge');
    } else if (this.state === 'lunge') {
      this.x += this.face * LUNGE_SPEED * dt;
      // it will not leave its own floor, ever
      this.x = Math.max(this.c0 - 0.6, Math.min(this.c1 + 1.6, this.x));
      if (this.t >= LUNGE) this.go('recover');
    } else if (this.state === 'recover') {
      if (this.t >= RECOVER) this.go(near ? 'wind' : 'patrol');
    }

    this.y = this.level.groundTop(this.x, this.y + 1.2);
    this.group.position.set(this.x, this.y, 0);
    this.group.rotation.y = this.face > 0 ? 0 : Math.PI;

    // the telegraph, drawn: the eye brightens through notice and wind, and
    // reduced motion holds it lit rather than flashing
    const hot = this.state === 'notice' || this.state === 'wind';
    const blink = reduced ? 1 : (Math.sin(this.t * 26) * 0.5 + 0.5);
    this.eye.material.color.set(hot ? mix(PAL.HAZARD, '#ffffff', blink * 0.7) : PAL.HAZARD);
    const crouch = this.state === 'wind' ? 0.82 : 1;
    this.group.scale.y = crouch;
    // legs scuttle while patrolling
    if (!reduced && this.state === 'patrol') {
      for (let i = 0; i < this.legs.length; i++) {
        this.legs[i].position.y = 0.12 + Math.sin(this.t * 14 + i * 1.6) * 0.03;
      }
    }
    this.shadow.position.set(this.x, this.y + 0.02, 0);
  }

  // only the lunge hurts — a robot walking about is scenery you step over
  hits(x, y, hw, h) {
    if (this.dead || this.state !== 'lunge') return false;
    return Math.abs(x - this.x) < hw + this.hw
      && y < this.y + this.h && y + h > this.y;
  }

  // a machine drives straight over one; the kid cannot squash it
  crush(mx, mhw) {
    if (this.dead || Math.abs(mx - this.x) > mhw + this.hw) return false;
    this.dead = true;
    this.group.visible = false;
    this.shadow.visible = false;
    return true;
  }
}

// ---- a small hazard: a steam vent on the floor ---------------------------
// It breathes on a fixed clock with a visible tell before it blows, so it is
// a rhythm to walk through rather than a surprise.

const VENT_CYCLE = 2.6, VENT_WARN = 0.55, VENT_BLOW = 0.6;

export class SteamVent {
  constructor(scene, level, x) {
    this.x = x;
    this.y = level.groundTop(x, 8);
    this.t = Math.random() * VENT_CYCLE;

    this.group = new THREE.Group();
    this.group.position.set(x, this.y, 0);
    const M = (c) => craftMat(c, 'balsa');
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.16, 10), M(PAL.STEEL[1]));
    cap.position.y = 0.08; this.group.add(cap);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 6, 14), M(PAL.MACHINE));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.16; this.group.add(ring);

    this.puffs = [];
    for (let i = 0; i < 8; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 7),
        new THREE.MeshBasicMaterial({ color: PAL.CLOUD, transparent: true, opacity: 0 }),
      );
      p.life = 1; this.puffs.push(p); scene.add(p);
    }
    scene.add(this.group);
  }

  get blowing() {
    const k = this.t % VENT_CYCLE;
    return k > VENT_WARN && k < VENT_WARN + VENT_BLOW;
  }
  get warning() { return (this.t % VENT_CYCLE) <= VENT_WARN; }

  update(dt, reduced) {
    this.t += dt;
    if (this.blowing) {
      const p = this.puffs.find((q) => q.life >= 1);
      if (p) {
        p.life = 0;
        p.position.set(this.x + (Math.random() - 0.5) * 0.3, this.y + 0.2, (Math.random() - 0.5) * 0.6);
        p.scale.setScalar(0.6);
      }
    }
    for (const p of this.puffs) {
      if (p.life >= 1) { p.material.opacity = 0; continue; }
      p.life = Math.min(1, p.life + dt / 0.8);
      p.position.y += 3.4 * dt;
      p.scale.setScalar(0.6 + p.life * 2.4);
      p.material.opacity = 0.7 * (1 - p.life);
    }
    // the tell: the collar glows before it blows, steady under reduced motion
    const ring = this.group.children[1];
    ring.material.color.set(this.warning
      ? mix(PAL.MACHINE, PAL.HAZARD, reduced ? 0.7 : (Math.sin(this.t * 22) * 0.5 + 0.5))
      : PAL.MACHINE);
  }

  hits(x, y, hw, h) {
    if (!this.blowing) return false;
    return Math.abs(x - this.x) < hw + 0.42 && y < this.y + 2.2 && y + h > this.y;
  }
}
