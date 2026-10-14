// Toko, grown-up: the worked example's Adult — the same head, hair, strap and
// clay disc mask from the traced master (magenta here) — dressed in a hoodie
// (hood down, strings, kangaroo pocket, ribbed cuffs), magenta gloves with a
// thumb, and trainers that can point their toes down for a kneel.
//
// Same frame and pose contract as Adult: P.hip (world), yaw, lean, side, knee,
// foot (figure-frame offsets), elL/hdL/elR/hdR (world points), hp/hr/hy.
// Index 0 of hands/arms is the figure's own RIGHT (−x when facing +z).

import * as THREE from 'three';
import { sausage, ball, lathe, lumpy, mesh, tokoMask } from './sculpt.js';
import { V3 } from './rig.js';
import { orient } from './beasts.js';

const { add, sub, mul, nrm, lerp3 } = V3;
const dir = (a, sd) => nrm([Math.sin(sd), Math.cos(a) * Math.cos(sd), Math.sin(a) * Math.cos(sd)]);

export class Toko {
  constructor(M, o = {}) {
    this.M = M;
    this.p = { headR: 4.5, headSZ: 0.86, torsoW: 5.7, torsoD: 4.5, armR: 1.85, legR: 2.25, lump: 0.22, lumpF: 0.26, maskR: 3.95, ...o };
    const p = this.p, L = (g, a = p.lump, f = p.lumpF, s = 1) => lumpy(g, a, f, s);
    this.group = new THREE.Group();
    this.parts = {};
    for (const k of ['hips', 'torso', 'armL', 'armR', 'thighL', 'thighR', 'shinL', 'shinR'])
      this.parts[k] = mesh(new THREE.BufferGeometry(), k.startsWith('arm') || k === 'torso' ? M.hoodie : M.jeans, { parent: this.group });
    this.parts.hips.geometry = L(ball(5.6, 1.05, 0.62, 0.92), p.lump, p.lumpF, 60);
    // trainers: a dark upper on a pale sole
    this.shoes = [-1, 1].map(s => {
      const g = new THREE.Group(); this.group.add(g);
      mesh(L(ball(1.85, 1.0, 0.72, 1.55), 0.07, 0.6, 61 + s), M.shoes, { pos: [0, 0.25, 0], parent: g });
      mesh(L(ball(2.0, 1.0, 0.3, 1.62), 0.04, 0.7, 63 + s), M.sole, { pos: [0, -0.55, 0.1], parent: g });
      return g;
    });
    // gloves: a mitt and a thumb, magenta
    this.hands = [-1, 1].map(s => {
      const g = new THREE.Group(); this.group.add(g);
      mesh(L(ball(1.5, 1.08, 0.74, 1.28), 0.06, 0.8, 65 + s), M.glove, { parent: g });
      mesh(L(sausage([[-s * 0.95, 0.15, -0.3], [-s * 1.45, 0.4, 0.45], [-s * 1.35, 0.55, 1.15]], [0.55, 0.48, 0.42], { up: [0, 1, 0] }), 0.03, 1, 67 + s), M.glove, { parent: g });
      return g;
    });
    this.cuffs = [-1, 1].map(s => mesh(L(new THREE.TorusGeometry(1.45, 0.62, 12, 30), 0.04, 0.8, 69 + s), M.cuff, { parent: this.group }));
    this.collar = mesh(L(new THREE.TorusGeometry(2.6, 0.95, 16, 36).rotateX(Math.PI / 2), p.lump * 0.5, p.lumpF, 71), M.hoodie, { parent: this.group });
    this.pocket = mesh(L(new THREE.CapsuleGeometry(1.5, 5.2, 4, 12).rotateZ(Math.PI / 2).scale(1, 1, 0.42), 0.06, 0.6, 72), M.hoodie2, { parent: this.group });
    // the head: exactly the worked example's grown-up head — hair, the clay disc mask
    // from the traced master on its strap, the parting and the bun (only the mask is magenta)
    this.head = new THREE.Group(); this.group.add(this.head);
    mesh(L(ball(p.headR, 1.0, 1.06, p.headSZ), p.lump * 0.7, p.lumpF, 66), M.hair, { parent: this.head });
    const front = p.headR * p.headSZ, maskThick = 0.9, dome = 0.22;
    const maskZ = front + 0.2 - maskThick - dome * p.maskR * 0.5;
    this.mask = tokoMask(p.maskR, M.maskDisc, M.maskInk, { kind: 'clay', lump: 0.02, raise: 0.26, bevel: 0.13, dome, thick: maskThick, seed: 9 });
    this.mask.position.set(0, -0.2, maskZ); this.head.add(this.mask);
    const rimZ = maskZ + maskThick * 0.5, ang = Math.atan2(rimZ, p.maskR * 0.98), SR = Math.hypot(rimZ, p.maskR * 0.98);
    const strap = new THREE.TorusGeometry(SR, 0.3, 12, 72, Math.PI + 2 * ang); strap.rotateZ(-ang); strap.rotateX(-Math.PI / 2);
    mesh(L(strap, 0.03, 0.8, 67), M.strap, { pos: [0, -0.1, 0], parent: this.head });
    mesh(L(ball(p.headR * 1.02, 1.0, 0.5, 0.86).translate(0, p.headR * 0.45, -1.3), 0.12, 0.9, 68), M.hair, { parent: this.head });
    mesh(L(ball(2.3, 1.0, 0.9, 0.9), 0.15, 0.9, 69), M.hair, { pos: [0, 1.6, -p.headR * 0.95], parent: this.head });
    for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.45; mesh(L(sausage([[Math.sin(a) * 1.0, 3.2, -3.0], [Math.sin(a) * 2.2, 2.4, -4.6], [Math.sin(a) * 2.0, 1.2, -5.6]], [0.5, 0.55, 0.3], { up: [0, 0, 1] }), 0.05, 1, 70 + i), M.hair, { parent: this.head }); }
    // the hoodie's hood, DOWN: a fat roll lying round the back of the neck, its strings hanging at the front
    this.hood = new THREE.Group(); this.group.add(this.hood);
    const hp = []; for (let i = 0; i <= 10; i++) { const t = -1.15 + 2.3 * i / 10; hp.push([Math.sin(t) * 4.3, 0.6 + Math.cos(t * 1.1) * 0.9, -Math.cos(t) * 3.9 - 0.4]); }
    mesh(L(sausage(hp.map(([x, y, z]) => [x * 0.92, y - 0.4, z * 0.82]), [1.0, 1.35, 1.55, 1.7, 1.75, 1.75, 1.75, 1.7, 1.55, 1.35, 1.0], { up: [0, 1, 0], steps: 60 }), 0.12, 0.5, 74), M.hoodie, { parent: this.hood });
    for (const s of [-1, 1]) {
      const a = [s * 1.5, 0.2, 2.4], b = [s * 1.65, -2.6, 3.2], c = [s * 1.55, -5.0, 3.5];
      mesh(L(sausage([a, b, c], [0.24, 0.22, 0.2], { seg: 10, steps: 18 }), 0.02, 1, 76 + s), M.string, { parent: this.hood });
      mesh(new THREE.CapsuleGeometry(0.26, 0.7, 3, 8), M.aglet, { pos: [c[0], c[1] - 0.5, c[2]], parent: this.hood, cast: false });
    }
    this.anchor = {};
  }

  /** P: hip, yaw, lean, side, knee, foot, shoePitch, elL, hdL, elR, hdR, viaL, viaR, palm, hp, hr, hy */
  pose(P) {
    const p = this.p, L = (g, s) => lumpy(g, p.lump, p.lumpF, s);
    const hip = P.hip, yaw = P.yaw || 0;
    const R = (v) => [v[0] * Math.cos(yaw) + v[2] * Math.sin(yaw), v[1], -v[0] * Math.sin(yaw) + v[2] * Math.cos(yaw)];
    const at = (v) => add(hip, R(v));
    this.parts.hips.position.set(...at([0, 2.4, 0])); this.parts.hips.rotation.set(0, yaw, 0);
    const a = P.lean ?? 0.1, sd = P.side || 0;
    const H0 = at([0, 3.0, 0]);
    const d0 = R(dir(a * 0.4, sd * 0.4)), d1 = R(dir(a * 0.8, sd * 0.8)), d2 = R(dir(a, sd));
    const H1 = add(H0, mul(d0, 5.2)), H2 = add(H1, mul(d1, 5.0)), H3 = add(H2, mul(d2, 2.6));
    const W = p.torsoW * (1 + (P.breathe || 0) * 0.02), D = p.torsoD * (1 + (P.breathe || 0) * 0.03);
    this.parts.torso.geometry.dispose();
    this.parts.torso.geometry = L(sausage([H0, H1, H2, H3], [[W * 1.02, D * 1.02], [W * 0.98, D * 0.95], [W, D * 0.88], [W * 0.56, D * 0.62]], { up: R([0, 0, 1]), seg: 40, steps: 56 }), 77);
    this.collar.position.set(...add(H3, [0, 0.1, 0])); this.collar.rotation.set(a - 0.3, yaw, 0);
    this.hood.position.set(...add(H3, [0, 0.2, 0])); this.hood.rotation.set(a * 0.7 - 0.15, yaw, -sd * 0.5, 'YXZ');
    // pocket on the belly, riding the torso's lean
    const pc = add(lerp3(H0, H1, 0.62), R(mul([0, -Math.sin(a * 0.4), Math.cos(a * 0.4)], D * 0.93)));
    this.pocket.position.set(...pc); orient(this.pocket, R([0, -Math.sin(a * 0.4), Math.cos(a * 0.4)]), d0);
    const lat = R([Math.cos(sd), -Math.sin(sd), 0]);
    const S = [-1, 1].map(s => add(add(H2, mul(lat, s * 4.7)), [0, 0.3, 0]));
    const ha = a * 0.6 + (P.hp || 0);
    this.head.position.set(...add(H3, R([0, 4.1 * Math.cos(ha), 4.1 * Math.sin(ha) - 0.2])));
    this.head.rotation.set(ha, yaw + (P.hy || 0), (P.hr || 0) - sd * 0.6, 'YXZ');
    // arms: index 0 is the figure's own right
    const hands = [P.hdR, P.hdL], els = [P.elR, P.elL], vias = [P.viaR, P.viaL];
    [-1, 1].forEach((s, i) => {
      const a0 = add(S[i], mul(lat, s * 0.4)), el = els[i], hd = hands[i], via = vias[i];
      const pre = via || el;
      const wr = add(hd, mul(nrm(sub(hd, pre)), -1.35));
      const g = L(sausage([a0, lerp3(a0, el, 0.5), el, via || lerp3(el, wr, 0.5), wr], [p.armR * 1.12, p.armR, p.armR * 0.96, p.armR * 0.92, p.armR * 0.84], { up: [0, 1, 0], steps: 64 }), 78 + s);
      const m = this.parts[i ? 'armL' : 'armR']; m.geometry.dispose(); m.geometry = g;
      this.hands[i].position.set(...hd); orient(this.hands[i], sub(hd, pre), P.palm ? P.palm[i] : [0, 1, 0]);
      this.cuffs[i].position.set(...add(hd, mul(nrm(sub(hd, pre)), -1.25))); orient(this.cuffs[i], sub(hd, pre), [0, 1, 0]);
    });
    // legs
    [-1, 1].forEach((s, i) => {
      const hp = at([s * 2.6, 2.4, 0.6]);
      const kn = at(add([s * 3.0, 0, 0], P.knee)), ft = at(add([s * 3.2, 0, 0], P.foot));
      const t = this.parts[i ? 'thighL' : 'thighR'], sh = this.parts[i ? 'shinL' : 'shinR'];
      t.geometry.dispose(); t.geometry = L(sausage([hp, lerp3(hp, kn, 0.5), kn], [p.legR * 1.25, p.legR * 1.12, p.legR], { up: [0, 1, 0] }), 80 + s);
      sh.geometry.dispose(); sh.geometry = L(sausage([kn, lerp3(kn, ft, 0.5), add(ft, [0, 1.2, 0])], [p.legR, p.legR * 0.92, p.legR * 0.82], { up: R([0, 0, 1]) }), 82 + s);
      const sp = P.shoePitch || 0;
      this.shoes[i].position.set(...add(ft, R([0, 0.4 + Math.sin(-sp) * 0.9, 1.2 * Math.cos(sp)])));
      this.shoes[i].rotation.set(sp, yaw + (P.shoeYaw || 0) * s, 0, 'YXZ');
    });
    this.anchor = { H0, H1, H2, H3, S };
  }
}
