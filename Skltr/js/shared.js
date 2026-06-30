import * as THREE from 'three';

// ── Minimalist vector palette ─────────────────────────────────────────────────
export const INK   = 0x141414;     // every outline
export const WHITE = 0xffffff;
export const C = {
  player: 0x00b3a4,   // teal — you
  enemy:  0xff3b30,   // red — hostiles
  boss:   0xb1119b,   // magenta — boss
  gold:   0xf5a623,   // amber — money / chests
  tele:   0x8e5bff,   // violet — teleporter
  hp:     0x16b06a,   // green — health / heal
  shield: 0x2b8cff,
};
// item rarity colours (RoR2-style tiers)
export const RARITY = { common: 0xbfbfbf, uncommon: 0x39c66b, rare: 0xff4d4d, boss: 0xf5a623 };

export const WHITE_MAT = new THREE.MeshBasicMaterial({ color: WHITE });
export const inkMat = (c = INK) => new THREE.LineBasicMaterial({ color: c });
const lerp = (a, b, t) => a + (b - a) * t;

// A white box with a crisp black (or tinted) outline.
export function outlinedBox(w, h, d, edgeMat) {
  const g = new THREE.Group();
  const geo = new THREE.BoxGeometry(w, h, d);
  g.add(new THREE.Mesh(geo, WHITE_MAT));
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat || inkMat()));
  return g;
}

// ── A procedural vector humanoid — used for the player and every enemy ─────────
class Bone {
  constructor(parent, len, thick, edge) {
    this.pivot = new THREE.Object3D(); parent.add(this.pivot);
    const geo = new THREE.BoxGeometry(thick, len, thick); geo.translate(0, -len / 2, 0);
    this.pivot.add(new THREE.Mesh(geo, WHITE_MAT));
    this.pivot.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edge));
    this.tip = new THREE.Object3D(); this.tip.position.y = -len; this.pivot.add(this.tip);
  }
}

export class Figure {
  // accent: scarf/marker colour. scale: overall size. gun: hold a little vector gun.
  constructor(scene, { accent = C.player, scale = 1, gun = true } = {}) {
    this.group = new THREE.Group();
    this.group.scale.setScalar(scale);
    scene.add(this.group);
    this.edge = new THREE.LineBasicMaterial({ color: INK });   // own material → flashable
    const e = this.edge;
    this.body = new THREE.Object3D(); this.group.add(this.body);

    const torso = outlinedBox(0.4, 0.62, 0.26, e); torso.position.y = 1.0; this.body.add(torso);
    const head  = outlinedBox(0.3, 0.3, 0.3, e);   head.position.y = 1.5;  this.body.add(head);
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 0.3), new THREE.MeshBasicMaterial({ color: accent }));
    scarf.position.y = 1.3; this.body.add(scarf);

    const shL = new THREE.Object3D(); shL.position.set(-0.3, 1.28, 0); this.body.add(shL);
    const shR = new THREE.Object3D(); shR.position.set( 0.3, 1.28, 0); this.body.add(shR);
    this.armL = new Bone(shL, 0.5, 0.13, e);
    this.armR = new Bone(shR, 0.5, 0.13, e);
    if (gun) { const g = outlinedBox(0.14, 0.14, 0.5, e); g.position.set(0, -0.5, 0.2); this.armR.pivot.add(g); }

    const hpL = new THREE.Object3D(); hpL.position.set(-0.16, 0.7, 0); this.body.add(hpL);
    const hpR = new THREE.Object3D(); hpR.position.set( 0.16, 0.7, 0); this.body.add(hpR);
    this.legL = new Bone(hpL, 0.72, 0.16, e);
    this.legR = new Bone(hpR, 0.72, 0.16, e);

    this.phase = 0; this.flash = 0;
  }

  // speed: horizontal m/s (drives stride). aim: 0..1 raise both arms forward to shoot.
  update(dt, { speed = 0, aim = 0, yOffset = 0, lean = 0 } = {}) {
    this.phase += dt * (2 + speed * 1.1);
    const s = Math.sin(this.phase) * Math.min(1, speed / 4);
    this.legL.pivot.rotation.x =  s * 0.9; this.legR.pivot.rotation.x = -s * 0.9;
    const swing = aim > 0.5 ? -1.45 : -s * 0.7;          // arms forward to fire, else counter-swing
    this.armL.pivot.rotation.x = aim > 0.5 ? -1.45 : s * 0.7;
    this.armR.pivot.rotation.x = swing;
    this.body.rotation.x = lean;
    this.group.position.y = yOffset + Math.abs(s) * 0.05;
    if (this.flash > 0) {
      this.flash = Math.max(0, this.flash - dt * 5);
      this.edge.color.setHex(this.flash > 0 ? 0xff8a3b : INK);
    }
  }
  hit() { this.flash = 1; }
  dispose() { this.group.parent && this.group.parent.remove(this.group); }
}

export { lerp };
