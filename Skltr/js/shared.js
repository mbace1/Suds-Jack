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
// Big angular head + two big eyes, two long bent ears, a spindly white-line body
// holding a little gun that tracks the 3D aim.
export class Bunny {
  constructor(scene) {
    this.group = new THREE.Group(); scene.add(this.group);
    this.edge = new THREE.LineBasicMaterial({ color: C.line });
    const e = this.edge;
    this.body = new THREE.Object3D(); this.group.add(this.body);

    // big head + eyes
    const head = glow(new THREE.IcosahedronGeometry(0.46, 0), C.line); head.position.y = 1.55;
    head.userData.edge.color = e.color; this.body.add(head);
    const eL = makeEye(0.17); eL.position.set(-0.17, 1.6, -0.4); this.body.add(eL);
    const eR = makeEye(0.17); eR.position.set( 0.17, 1.6, -0.4); this.body.add(eR);

    // two long bent ears leaning back
    for (const sx of [-1, 1]) {
      const ear = new THREE.Object3D(); ear.position.set(sx * 0.12, 1.92, 0.02); this.body.add(ear);
      ear.rotation.set(0.35, 0, sx * 0.16);
      box(ear, 0.1, 0.55, 0.08, 0, 0.27, 0, e);
      const tip = new THREE.Object3D(); tip.position.y = 0.52; tip.rotation.x = -0.5; ear.add(tip);
      box(tip, 0.1, 0.35, 0.08, 0, 0.17, 0, e);
    }

    box(this.body, 0.26, 0.5, 0.18, 0, 0.95, 0, e);          // spindly torso
    box(this.body, 0.16, 0.16, 0.16, 0, 0.78, -0.18, e);     // puff tail

    const shL = new THREE.Object3D(); shL.position.set(-0.22, 1.2, 0); this.body.add(shL);
    const shR = new THREE.Object3D(); shR.position.set( 0.22, 1.2, 0); this.body.add(shR);
    this.armL = new Bone(shL, 0.46, 0.07, e);
    this.armR = new Bone(shR, 0.46, 0.07, e);
    box(this.armR.tip, 0.1, 0.1, 0.46, 0, -0.04, 0.2, e);    // gun

    const hpL = new THREE.Object3D(); hpL.position.set(-0.12, 0.7, 0); this.body.add(hpL);
    const hpR = new THREE.Object3D(); hpR.position.set( 0.12, 0.7, 0); this.body.add(hpR);
    this.legL = new Bone(hpL, 0.72, 0.08, e);
    this.legR = new Bone(hpR, 0.72, 0.08, e);

    this.phase = 0; this.flash = 0;
  }

  update(dt, { speed = 0, aimPitch = 0, yOffset = 0 } = {}) {
    this.phase += dt * (3 + speed * 1.1);
    const s = Math.sin(this.phase) * Math.min(1, speed / 4);
    this.legL.pivot.rotation.x =  s * 0.9; this.legR.pivot.rotation.x = -s * 0.9;
    this.armR.pivot.rotation.x = -1.55 - aimPitch;
    this.armL.pivot.rotation.x = -1.35 - aimPitch * 0.6;
    this.group.position.y = yOffset + Math.abs(s) * 0.04;
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt * 5); this.edge.color.setHex(this.flash > 0 ? 0xffffff : C.line); }
  }
  hit() { this.flash = 1; }
  visible(v) { this.group.visible = v; }
}
