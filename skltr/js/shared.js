import * as THREE from 'three';

// ── Night-mode "white sketch on black" palette (Vib Ribbon look) ──────────────
// Everything is a white line drawing on pure black: shapes are black-filled so only
// their white outline edges read. A few faint functional tints stay on projectiles
// so a bullet-hell is still legible.
export const C = {
  bg:     0x000000,
  line:   0xffffff,   // white sketch lines (player + enemies)
  dim:    0x3a3a3a,   // faint grid
  player: 0xffffff,
  shot:   0xa9ecff,   // your fire — faint cool white
  enemy:  0xffffff,
  eshot:  0xff7a8a,   // enemy fire — faint warm (danger)
  adr:    0xffd36b,   // adrenaline accent (HUD)
  hp:     0xffffff,
};

export const FILL_MAT = new THREE.MeshBasicMaterial({ color: 0x000000 }); // occludes back lines
export const LINE_MAT = new THREE.LineBasicMaterial({ color: C.line });
export const EYE_MAT  = new THREE.MeshBasicMaterial({ color: C.line });
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

// ── The bunny-humanoid protagonist (Vib-Ribbon sketch) ────────────────────────
// A small head with two big eyes, two upright ears splayed to the sides, a spindly
// white-line body holding an AR that tracks the 3D aim. Simple procedural anims for
// run / jump / dash / fire-recoil / hurt.
export class Bunny {
  constructor(scene) {
    this.group = new THREE.Group(); scene.add(this.group);
    this.edge = new THREE.LineBasicMaterial({ color: C.line });
    const e = this.edge;
    this.body = new THREE.Object3D(); this.group.add(this.body);

    // smaller head + eyes
    const head = glow(new THREE.IcosahedronGeometry(0.32, 0), C.line); head.position.y = 1.44;
    head.userData.edge.color = e.color; this.body.add(head);
    const eL = makeEye(0.12); eL.position.set(-0.12, 1.47, -0.28); this.body.add(eL);
    const eR = makeEye(0.12); eR.position.set( 0.12, 1.47, -0.28); this.body.add(eR);

    // ears: mostly upright, splayed out to the sides (a small back tilt)
    this.ears = [];
    for (const sx of [-1, 1]) {
      const ear = new THREE.Object3D(); ear.position.set(sx * 0.13, 1.62, 0.0); this.body.add(ear);
      ear.rotation.set(0.12, 0, sx * 0.42);       // up, spread sideways
      ear.userData.sx = sx;
      box(ear, 0.09, 0.5, 0.07, 0, 0.25, 0, e);
      const tip = new THREE.Object3D(); tip.position.y = 0.48; tip.rotation.x = -0.18; ear.add(tip);
      box(tip, 0.08, 0.28, 0.06, 0, 0.14, 0, e);
      this.ears.push(ear);
    }

    box(this.body, 0.24, 0.5, 0.17, 0, 0.95, 0, e);          // spindly torso
    box(this.body, 0.15, 0.15, 0.15, 0, 0.78, -0.17, e);     // puff tail

    const shL = new THREE.Object3D(); shL.position.set(-0.2, 1.2, 0); this.body.add(shL);
    const shR = new THREE.Object3D(); shR.position.set( 0.2, 1.2, 0); this.body.add(shR);
    this.armL = new Bone(shL, 0.44, 0.07, e);
    this.armR = new Bone(shR, 0.44, 0.07, e);
    this._buildAR(this.armR.tip, e);                          // AR held in the right hand
    this.muzzle = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), new THREE.MeshBasicMaterial({ color: 0xfff0a0 }));
    this.muzzle.position.set(0, -0.03, 0.82); this.muzzle.visible = false; this.armR.tip.add(this.muzzle);   // muzzle flash

    const hpL = new THREE.Object3D(); hpL.position.set(-0.12, 0.7, 0); this.body.add(hpL);
    const hpR = new THREE.Object3D(); hpR.position.set( 0.12, 0.7, 0); this.body.add(hpR);
    this.legL = new Bone(hpL, 0.72, 0.08, e);
    this.legR = new Bone(hpR, 0.72, 0.08, e);

    this.phase = 0; this.flash = 0; this.recoil = 0;
  }

  _buildAR(hand, e) {
    box(hand, 0.08, 0.11, 0.4, 0, -0.05, 0.2, e);            // receiver
    box(hand, 0.05, 0.05, 0.5, 0, -0.03, 0.5, e);            // barrel
    box(hand, 0.06, 0.17, 0.08, 0, -0.17, 0.12, e);          // magazine
    box(hand, 0.06, 0.08, 0.16, 0, -0.05, -0.06, e);         // stock
    box(hand, 0.025, 0.06, 0.03, 0, 0.03, 0.28, e);          // front sight
  }

  update(dt, { speed = 0, aimPitch = 0, yOffset = 0, airborne = false, dashing = false, firing = false } = {}) {
    this.phase += dt * (3 + speed * 1.1);
    this.recoil = firing ? Math.min(1, this.recoil + 0.6) : Math.max(0, this.recoil - dt * 7);
    const on = this.recoil > 0.2; this.muzzle.visible = on;
    if (on) this.muzzle.scale.setScalar((0.55 + Math.random() * 0.9) * this.recoil);
    const hurt = this.flash, s = Math.sin(this.phase) * Math.min(1, speed / 4);

    // legs: tuck in the air, sweep back on a dash, else run cycle
    if (airborne) {
      this.legL.pivot.rotation.x = lerp(this.legL.pivot.rotation.x, 0.7, dt * 12);
      this.legR.pivot.rotation.x = lerp(this.legR.pivot.rotation.x, 0.35, dt * 12);
    } else if (dashing) {
      this.legL.pivot.rotation.x = lerp(this.legL.pivot.rotation.x, -0.5, dt * 16);
      this.legR.pivot.rotation.x = lerp(this.legR.pivot.rotation.x, -0.8, dt * 16);
    } else {
      this.legL.pivot.rotation.x = s * 0.9; this.legR.pivot.rotation.x = -s * 0.9;
    }

    // body lean: forward when dashing / fast, jerk back when hurt
    let lean = dashing ? 0.72 : (speed > 6 ? 0.22 : 0);
    if (hurt > 0) lean = -0.5 * hurt;
    this.body.rotation.x = lerp(this.body.rotation.x, lean, dt * 12);
    this.body.rotation.z = hurt > 0 ? (Math.random() - 0.5) * 0.2 * hurt : lerp(this.body.rotation.z, 0, dt * 10);

    // arms brace the AR toward the aim, with a recoil kick while firing
    const kick = this.recoil * 0.22;
    this.armR.pivot.rotation.x = -1.5 - aimPitch + kick;
    this.armL.pivot.rotation.x = -1.35 - aimPitch * 0.6 + kick * 0.7;

    // ears: floppy sway while moving, pinned back on dash / in air
    const back = (airborne || dashing) ? 0.6 : 0;
    const sway = Math.sin(this.phase * 1.3) * 0.14 * Math.min(1, speed / 3);
    for (const ear of this.ears) ear.rotation.x = lerp(ear.rotation.x, 0.12 + back + sway, dt * 10);

    this.group.position.y = yOffset + (airborne ? 0 : Math.abs(s) * 0.04);
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt * 4); this.edge.color.setHex(this.flash > 0 ? 0xffffff : C.line); }
  }
  hit() { this.flash = 1; }
  visible(v) { this.group.visible = v; }
}
