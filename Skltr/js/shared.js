import * as THREE from 'three';
import { visualTest } from './modes.js?v=12';

// ── Two full palettes ─────────────────────────────────────────────────────────
// NIGHT (default): a white line drawing on pure black (Vib Ribbon look) — shapes
// are black-filled so only their white outline edges read.
// DESERT (Visual Test): the inverse — sun-bleached sand world, dark ink outlines,
// same sketch principle with the values flipped. applyPalette() mutates C and the
// shared materials in place so every consumer picks the change up.
const NIGHT = {
  bg: 0x000000, line: 0xffffff, dim: 0x3a3a3a, player: 0xffffff,
  shot: 0xa9ecff, enemy: 0xffffff, eshot: 0xff7a8a, adr: 0xffd36b,
  hp: 0xffffff, hazard: 0xff5533, boss: 0xff6b7e, beacon: 0x35f0d8,
  fill: 0x000000, ground: 0x050505, ring: 0x888888,
};
const DESERT = {
  bg: 0xdfb98a, line: 0x2b1a0e, dim: 0xb08a5f, player: 0x2b1a0e,
  shot: 0x1c5cab, enemy: 0x2b1a0e, eshot: 0xb3241a, adr: 0xb35b00,
  hp: 0x2b1a0e, hazard: 0xa33812, boss: 0xa3241a, beacon: 0x0e6e5e,
  fill: 0xdfb98a, ground: 0xd8b183, ring: 0x8a6a45,
};
export const C = { ...NIGHT };

export const FILL_MAT = new THREE.MeshBasicMaterial({ color: C.fill }); // occludes back lines
export const LINE_MAT = new THREE.LineBasicMaterial({ color: C.line });
export const EYE_MAT  = new THREE.MeshBasicMaterial({ color: C.line });

export function applyPalette(desert) {
  Object.assign(C, desert ? DESERT : NIGHT);
  FILL_MAT.color.setHex(C.fill);
  LINE_MAT.color.setHex(C.line);
  EYE_MAT.color.setHex(C.line);
}
applyPalette(visualTest);   // palette is set before any consumer constructs geometry
const lerp = (a, b, t) => a + (b - a) * t;
export { lerp };

// A black-filled shape wearing a white wire outline. Edge material is per-call so
// it can flash white→bright on hit.
export function glow(geo, color = C.line) {
  const g = new THREE.Group();
  const edge = new THREE.LineBasicMaterial({ color });
  g.add(new THREE.Mesh(geo, FILL_MAT));
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge));
  g.userData.edge = edge;
  return g;
}

// A big sketchy eye — white ring + pupil, faces -z (the character's front).
export function makeEye(r) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.RingGeometry(r * 0.62, r, 14), EYE_MAT));
  const pupil = new THREE.Mesh(new THREE.CircleGeometry(r * 0.3, 8), EYE_MAT); pupil.position.z = 0.01;
  g.add(pupil);
  g.rotation.y = Math.PI;     // faces -z
  return g;
}

class Bone {
  constructor(parent, len, thick, edge) {
    this.pivot = new THREE.Object3D(); parent.add(this.pivot);
    const geo = new THREE.BoxGeometry(thick, len, thick); geo.translate(0, -len / 2, 0);
    this.pivot.add(new THREE.Mesh(geo, FILL_MAT));
    this.pivot.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge));
    this.tip = new THREE.Object3D(); this.tip.position.y = -len; this.pivot.add(this.tip);
  }
}
function box(parent, w, h, d, x, y, z, edge) {
  const geo = new THREE.BoxGeometry(w, h, d); geo.translate(x, y, z);
  parent.add(new THREE.Mesh(geo, FILL_MAT));
  parent.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge));
}
// a higher-poly wireframe sphere — EdgesGeometry on a segmented sphere reads as a
// dense wireframe, the core of the "higher detail, still wireframe" art direction
function orb(parent, r, x, y, z, edge, w = 9, h = 7) {
  const geo = new THREE.SphereGeometry(r, w, h); geo.translate(x, y, z);
  parent.add(new THREE.Mesh(geo, FILL_MAT));
  parent.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, 4), edge));
}

// ── The bunny-humanoid protagonist (Vib-Ribbon sketch) ────────────────────────
// A distinctly small head with two big eyes, two long upright ears splayed out to
// the sides, a spindly white-line body holding an AR that tracks the 3D aim.
// Procedural anims for run / jump / land-squash / dash / fire-recoil / hurt, plus
// idle breathing + ear twitches and an ear-perk flourish on kills.
export class Bunny {
  constructor(scene) {
    this.group = new THREE.Group(); scene.add(this.group);
    this.edge = new THREE.LineBasicMaterial({ color: C.line });
    const e = this.edge;
    this.body = new THREE.Object3D(); this.group.add(this.body);

    // pelvis + puff tail
    box(this.body, 0.26, 0.22, 0.18, 0, 0.92, 0, e);
    orb(this.body, 0.1, 0, 0.9, 0.16, e, 7, 5);

    // chest block (twists with the stride) + shoulder yoke + belly plate
    this.chest = new THREE.Object3D(); this.chest.position.y = 1.04; this.body.add(this.chest);
    box(this.chest, 0.3, 0.32, 0.2, 0, 0.16, 0, e);
    box(this.chest, 0.36, 0.09, 0.22, 0, 0.36, 0, e);
    box(this.chest, 0.2, 0.12, 0.16, 0, -0.05, -0.02, e);

    // head: round skull + muzzle + cheeks + buck teeth + brows + big eyes — the Bugs read.
    // Hangs off the chest so torso twist/lean carries it naturally.
    this.head = new THREE.Object3D(); this.head.position.y = 0.52; this.chest.add(this.head);
    orb(this.head, 0.2, 0, 0, 0, e, 10, 8);                    // skull
    orb(this.head, 0.11, 0, -0.06, -0.19, e, 8, 6);            // muzzle
    orb(this.head, 0.065, -0.1, -0.035, -0.15, e, 6, 5);       // cheek L
    orb(this.head, 0.065, 0.1, -0.035, -0.15, e, 6, 5);        // cheek R
    box(this.head, 0.07, 0.075, 0.022, 0, -0.15, -0.27, e);    // buck teeth
    box(this.head, 0.09, 0.026, 0.03, -0.085, 0.14, -0.165, e);// brow L
    box(this.head, 0.09, 0.026, 0.03, 0.085, 0.14, -0.165, e); // brow R
    const eL = makeEye(0.085); eL.position.set(-0.088, 0.05, -0.185); this.head.add(eL);
    const eR = makeEye(0.085); eR.position.set(0.088, 0.05, -0.185); this.head.add(eR);

    // ears — two articulated segments each, mostly upright with a slight splay;
    // the tip segment lags behind the root for follow-through
    this.ears = [];
    for (const sx of [-1, 1]) {
      const ear = new THREE.Object3D(); ear.position.set(sx * 0.08, 0.17, 0.02); this.head.add(ear);
      ear.rotation.set(0.05, 0, sx * 0.3);
      ear.userData = { sx, baseZ: sx * 0.3, mid: null };
      box(ear, 0.085, 0.5, 0.055, 0, 0.25, 0, e);
      box(ear, 0.05, 0.4, 0.02, 0, 0.24, -0.024, e);           // inner-ear panel line
      const mid = new THREE.Object3D(); mid.position.y = 0.5; ear.add(mid);
      box(mid, 0.075, 0.36, 0.05, 0, 0.18, 0, e);
      ear.userData.mid = mid;
      this.ears.push(ear);
    }

    // arms — shoulder + elbow segments with gloved hands; AR on the right forearm
    const shL = new THREE.Object3D(); shL.position.set(-0.24, 0.36, 0); this.chest.add(shL);
    const shR = new THREE.Object3D(); shR.position.set(0.24, 0.36, 0); this.chest.add(shR);
    this.armLU = new Bone(shL, 0.28, 0.07, e); this.armLF = new Bone(this.armLU.tip, 0.28, 0.06, e);
    this.armRU = new Bone(shR, 0.28, 0.07, e); this.armRF = new Bone(this.armRU.tip, 0.28, 0.06, e);
    orb(this.armLF.tip, 0.075, 0, 0, 0, e, 6, 5);              // gloves
    orb(this.armRF.tip, 0.075, 0, 0, 0, e, 6, 5);
    this._buildAR(this.armRF.tip, e);
    this.muzzle = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xfff0a0 }));
    this.muzzle.position.set(0, -0.03, 0.82); this.muzzle.visible = false; this.armRF.tip.add(this.muzzle);   // muzzle flash

    // legs — hip + knee segments with big Bugs feet
    const mkLeg = (sx) => {
      const hip = new THREE.Object3D(); hip.position.set(sx * 0.12, 0.9, 0); this.body.add(hip);
      const thigh = new Bone(hip, 0.44, 0.085, e);
      const shin = new Bone(thigh.tip, 0.4, 0.07, e);
      const foot = new THREE.Object3D(); shin.tip.add(foot);
      box(foot, 0.13, 0.08, 0.36, 0, -0.02, -0.09, e);
      return { thigh, shin, foot };
    };
    this.legL = mkLeg(-1); this.legR = mkLeg(1);

    this.phase = 0; this.flash = 0; this.recoil = 0;
    this.squash = 0; this.perkT = 0; this.breath = 0;         // landing squash / kill ear-perk / idle breathing clocks
    this.twitchT = 1.5; this.twitchEar = null; this.twitchA = 0;
    this._airPrev = false; this.dashK = 0;                    // smoothed dash-stretch factor
  }

  _buildAR(hand, e) {
    box(hand, 0.08, 0.11, 0.4, 0, -0.05, 0.2, e);            // receiver
    box(hand, 0.05, 0.05, 0.5, 0, -0.03, 0.5, e);            // barrel
    box(hand, 0.06, 0.17, 0.08, 0, -0.17, 0.12, e);          // magazine
    box(hand, 0.06, 0.08, 0.16, 0, -0.05, -0.06, e);         // stock
    box(hand, 0.025, 0.06, 0.03, 0, 0.03, 0.28, e);          // front sight
  }

  update(dt, { speed = 0, aimPitch = 0, yOffset = 0, airborne = false, dashing = false, firing = false, vy = 0, accent = null } = {}) {
    this.phase += dt * (3 + speed * 1.35);
    this.breath += dt;
    this.recoil = firing ? Math.min(1, this.recoil + 0.6) : Math.max(0, this.recoil - dt * 7);
    const on = this.recoil > 0.2; this.muzzle.visible = on;
    if (on) this.muzzle.scale.setScalar((0.55 + Math.random() * 0.9) * this.recoil);
    const hurt = this.flash, runK = Math.min(1, speed / 4), s = Math.sin(this.phase) * runK;
    const idle = !airborne && speed < 0.8;

    // landing squash: fires on the airborne→grounded transition, decays fast
    if (this._airPrev && !airborne) this.squash = 1;
    this._airPrev = airborne;
    this.squash = Math.max(0, this.squash - dt * 5);
    this.perkT = Math.max(0, this.perkT - dt * 2.5);
    this.twitchA = Math.max(0, this.twitchA - dt * 4);

    // squash & stretch: compress on landing, slight stretch while airborne, and a
    // smoothed velocity-stretch along the lunge while dashing (Returnal blink read)
    const dk = this.dashK = lerp(this.dashK, dashing ? 1 : 0, Math.min(1, dt * 14));
    const sq = this.squash, stretch = airborne ? 0.06 : 0;
    this.body.scale.set(
      (1 + sq * 0.16) * (1 - 0.07 * dk),
      (1 - sq * 0.24 + stretch) * (1 - 0.05 * dk),
      (1 + sq * 0.16) * (1 + 0.22 * dk));

    // idle life: breathing bob, weight shift, a slow look-around, occasional ear twitch
    if (idle) {
      this.twitchT -= dt;
      if (this.twitchT <= 0) { this.twitchT = 1.6 + Math.random() * 2.5; this.twitchEar = this.ears[(Math.random() * 2) | 0]; this.twitchA = 1; }
      this.body.position.y = Math.sin(this.breath * 2.2) * 0.015;
      this.head.rotation.y = Math.sin(this.breath * 0.6) * 0.22;
      this.body.rotation.z = Math.sin(this.breath * 0.9) * 0.03;
    } else {
      this.body.position.y = lerp(this.body.position.y, 0, dt * 8);
      this.head.rotation.y = lerp(this.head.rotation.y, 0, dt * 6);
    }

    // legs: two-segment cycle with knee flexion; feet counter-rotate to stay level
    const setLeg = (leg, th, sh, rate = 14) => {
      leg.thigh.pivot.rotation.x = lerp(leg.thigh.pivot.rotation.x, th, dt * rate);
      leg.shin.pivot.rotation.x = lerp(leg.shin.pivot.rotation.x, sh, dt * rate);
      leg.foot.rotation.x = -(leg.thigh.pivot.rotation.x + leg.shin.pivot.rotation.x) * 0.55;
    };
    if (airborne && vy > 1) { setLeg(this.legL, -0.7, 0.9, 12); setLeg(this.legR, 0.9, 1.25, 12); } // rising: knees tucked hard
    else if (airborne) { setLeg(this.legL, 0.12, 0.35, 10); setLeg(this.legR, -0.1, 0.3, 10); }     // falling: legs reach for the ground
    else if (dashing) { setLeg(this.legL, 0.85, 0.5, 16); setLeg(this.legR, 1.05, 0.7, 16); }       // legs trail the lunge
    else {
      const a = Math.sin(this.phase), b = Math.sin(this.phase + Math.PI);
      setLeg(this.legL, a * 0.85 * runK - 0.08, Math.max(0.12, -b * 0.95 * runK), 20);
      setLeg(this.legR, b * 0.85 * runK - 0.08, Math.max(0.12, -a * 0.95 * runK), 20);
    }

    // torso: lean into dashes/speed, jerk back when hurt, twist the chest with the stride
    let lean = dashing ? 1.0 : (speed > 6 ? 0.26 : (airborne ? 0.15 : 0));
    if (hurt > 0) lean = -0.5 * hurt;
    this.body.rotation.x = lerp(this.body.rotation.x, lean, dt * 12);
    if (!idle) this.body.rotation.z = hurt > 0 ? (Math.random() - 0.5) * 0.2 * hurt : lerp(this.body.rotation.z, s * 0.06, dt * 10);
    this.chest.rotation.y = lerp(this.chest.rotation.y, s * 0.14, dt * 10);

    // head: tracks the aim pitch a touch, bobs with the stride, snaps back when hurt
    this.head.rotation.x = lerp(this.head.rotation.x, aimPitch * 0.35 + Math.abs(s) * 0.06 - (hurt > 0 ? 0.3 * hurt : 0), dt * 10);

    // arms: right shoulder+elbow brace the AR to the aim; left supports the foregrip
    const kick = this.recoil * 0.22;
    this.armRU.pivot.rotation.x = -1.32 - aimPitch * 0.85 + kick;
    this.armRF.pivot.rotation.x = -0.34 - aimPitch * 0.15 + kick * 0.6;
    this.armLU.pivot.rotation.x = -1.1 - aimPitch * 0.5 + kick * 0.7 + s * 0.05;
    this.armLF.pivot.rotation.x = -0.62 - aimPitch * 0.2 + kick * 0.4;

    // ears: root leads, tip lags for follow-through; stream back on dash/air, droop when
    // hurt, perk forward on a kill, narrow splay while perked, idle single-ear twitch
    const back = dashing ? 0.9 : (airborne ? 0.55 : 0);
    const sway = Math.sin(this.phase * 1.3) * 0.12 * Math.min(1, speed / 3);
    const droop = hurt > 0 ? 0.5 * hurt : 0;
    for (const ear of this.ears) {
      const tx = 0.05 + back + sway + droop - this.perkT * 0.4;
      ear.rotation.x = lerp(ear.rotation.x, tx, dt * 9);
      ear.userData.mid.rotation.x = lerp(ear.userData.mid.rotation.x,
        tx * 0.7 - this.perkT * 0.2 + Math.sin(this.phase * 1.3 + 0.8) * 0.08 * runK, dt * 7);
      const twitch = (ear === this.twitchEar && this.twitchA > 0) ? Math.sin(this.twitchA * Math.PI * 3) * 0.18 * this.twitchA : 0;
      ear.rotation.z = ear.userData.baseZ * (1 - this.perkT * 0.4) + twitch;
    }

    this.group.position.y = yOffset + (airborne ? 0 : Math.abs(s) * 0.05);
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt * 4); this.edge.color.setHex(0xffffff); }
    else this.edge.color.setHex(accent ?? C.line);
  }
  hit() { this.flash = 1; }
  perk() { this.perkT = 1; }    // ears snap up/forward for a beat — kill flourish
  visible(v) { this.group.visible = v; }
}
