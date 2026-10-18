// The puppets, posable: the child, the plush, the grown-up.
//
// A stop-motion puppet is re-sculpted between exposures, so this is too: the
// parts that bend (spine, arms, the grown-up's legs) are rebuilt as rolled
// sausages from a pose every held frame; the parts that do not (the head with
// its mask, the hat, the crossed legs, the plush) are built once and moved.
// Everything is in centimetres. The child's frame: origin on the seat under the
// hips, +z toward the room, +y up. A figure's own right hand is at −x.

import * as THREE from 'three';
import { sausage, ball, lathe, lumpy, mesh, tokoMask } from './sculpt.js';

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const nrm = (a) => mul(a, 1 / (len(a) || 1));
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export const V3 = { add, sub, mul, len, nrm, lerp3 };

/** a figure leaning by `a` (toward +z) and listing by `sd` (toward +x) */
const dir = (a, sd) => nrm([Math.sin(sd), Math.cos(a) * Math.cos(sd), Math.sin(a) * Math.cos(sd)]);

function swap(m, g) { if (m.geometry) m.geometry.dispose(); m.geometry = g; }

/** orient a group so its +z runs along f and its +y is as close to u as it can be */
function orient(obj, f, u) {
  const z = new THREE.Vector3(...nrm(f));
  let x = new THREE.Vector3().crossVectors(new THREE.Vector3(...u), z);
  if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
  x.normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

// --------------------------------------------------------------------------
// the child
// --------------------------------------------------------------------------
export class Kid {
  constructor(M, o = {}) {
    this.M = M;
    this.p = { headR: 5.0, headSZ: 0.84, torsoW: 4.1, torsoD: 3.3, lump: 0.2, lumpF: 0.3, maskR: 4.25, maskThick: 1.0, maskDome: 0.24, maskY: -0.45, armR: 1.45, legR: 1.75, ...o };
    const p = this.p, L = (g, a = p.lump, f = p.lumpF, s = 1) => lumpy(g, a, f, s);
    this.group = new THREE.Group();
    this.body = new THREE.Group(); this.group.add(this.body);
    // hips and the crossed legs: they do not move relative to each other
    mesh(L(ball(4.3, 1.05, 0.62, 0.9), p.lump, p.lumpF, 2), M.trousers, { pos: [0, 2.2, 0.2], parent: this.body });
    for (const s of [-1, 1]) {
      const fz = s > 0 ? 0 : 0.9, fy = s > 0 ? 0.35 : 0;
      const hip = [s * 2.2, 2.0, 0.6], knee = [s * 6.2, 2.4, 5.2], ankle = [-s * 1.3, 1.45 + fy, 7.6 + fz];
      mesh(L(sausage([hip, [s * 4.5, 2.1, 3.0], knee], [p.legR * 1.2, p.legR * 1.1, p.legR], { up: [0, 1, 0] }), p.lump, p.lumpF, 5 + s), M.trousers, { parent: this.body });
      mesh(L(sausage([knee, [s * 4.2, 1.8 + fy, 7.0 + fz * 0.6], ankle], [p.legR, p.legR * 0.9, p.legR * 0.82], { up: [0, 1, 0] }), p.lump, p.lumpF, 7 + s), M.trousers, { parent: this.body });
      mesh(L(sausage([ankle, [-s * 2.9, 1.2 + fy, 7.8 + fz], [-s * 4.2, 0.9 + fy, 7.4 + fz]], [p.legR * 0.86, p.legR * 0.84, p.legR * 0.74], { up: [0, 1, 0] }), p.lump, p.lumpF, 11 + s), M.socks, { parent: this.body });
    }
    // the parts rebuilt every pose
    this.torso = mesh(new THREE.BufferGeometry(), M.jumper, { parent: this.body });
    this.collar = mesh(L(new THREE.TorusGeometry(2.0, 0.6, 16, 36).rotateX(Math.PI / 2), p.lump * 0.5, p.lumpF, 9), M.collar, { parent: this.body });
    this.shoulders = [-1, 1].map(s => mesh(L(ball(2.2, 1.0, 0.85, 0.95), p.lump, p.lumpF, 4 + s), M.jumper, { parent: this.body }));
    this.arms = [-1, 1].map(() => mesh(new THREE.BufferGeometry(), M.jumper, { parent: this.body }));
    this.mitts = [-1, 1].map(s => {
      const g = new THREE.Group(); this.body.add(g);
      mesh(lumpy(ball(1.25, 1.05, 0.72, 1.2), 0.06, 0.8, 35 + s), M.skin, { parent: g });
      mesh(lumpy(sausage([[-s * 0.75, 0.15, -0.2], [-s * 1.15, 0.45, 0.6]], [0.48, 0.4], { up: [0, 1, 0] }), 0.03, 1, 37 + s), M.skin, { parent: g });
      return g;
    });
    // open hands, palm up: a flat palm, four short fingers curling up at the tips, the thumb splayed
    this.opens = [-1, 1].map(s => {
      const g = new THREE.Group(); this.body.add(g);
      mesh(lumpy(ball(1.2, 1.12, 0.46, 1.0), 0.04, 0.9, 54 + s), M.skin, { pos: [0, 0, 0.2], parent: g });
      for (let f = 0; f < 4; f++) {
        const x = (f - 1.5) * 0.58, l = [1.2, 1.4, 1.35, 1.05][f];
        mesh(lumpy(sausage([[x, 0.02, 0.9], [x * 1.05, 0.08, 0.9 + l * 0.6], [x * 1.08, 0.32, 0.9 + l]], [0.3, 0.28, 0.25], { up: [0, 1, 0], seg: 12, steps: 12, capSteps: 4 }), 0.02, 1, 56 + f + s), M.skin, { parent: g });
      }
      mesh(lumpy(sausage([[-s * 0.95, 0.05, 0.0], [-s * 1.55, 0.15, 0.55], [-s * 1.85, 0.35, 1.05]], [0.38, 0.33, 0.28], { up: [0, 1, 0], seg: 12, steps: 12, capSteps: 4 }), 0.02, 1, 60 + s), M.skin, { parent: g });
      g.visible = false;
      return g;
    });
    // cupped hands: one bowl, made of two halves meeting at a seam, with thumbs on the rim
    this.cup = new THREE.Group(); this.body.add(this.cup);
    for (const s of [-1, 1]) {
      const prof = [[0.01, -1.05], [0.9, -0.98], [1.45, -0.6], [1.75, 0.0], [1.78, 0.25], [1.55, 0.38], [1.32, 0.12], [1.05, -0.35], [0.01, -0.5]];
      const half = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 24, s < 0 ? Math.PI : 0, Math.PI);
      mesh(lumpy(half, 0.05, 0.9, 50 + s), M.skin, { pos: [s * 0.08, 0, 0], parent: this.cup });
      mesh(lumpy(sausage([[s * 1.55, 0.3, -0.4], [s * 1.25, 0.75, 0.5], [s * 0.7, 0.85, 0.95]], [0.42, 0.38, 0.34], { up: [0, 1, 0] }), 0.03, 1, 52 + s), M.skin, { parent: this.cup });
    }
    this.cup.visible = false;
    // the head: ball, mask, strap and its LED, beanie, hair
    this.head = new THREE.Group(); this.body.add(this.head);
    const head = this.head;
    mesh(L(ball(p.headR, 1.0, 1.0, p.headSZ), p.lump * 0.8, p.lumpF, 13), M.head || M.skin, { parent: head });
    const front = p.headR * p.headSZ;
    const maskZ = front + 0.2 - p.maskThick - p.maskDome * p.maskR * 0.5;
    this.mask = tokoMask(p.maskR, M.maskDisc, M.maskInk, { kind: 'clay', lump: 0.02, raise: 0.26, bevel: 0.13, dome: p.maskDome, thick: p.maskThick });
    this.mask.position.set(0, p.maskY, maskZ); head.add(this.mask);
    const rimZ = maskZ + p.maskThick * 0.5, ang = Math.atan2(rimZ, p.maskR * 0.98), SR = Math.hypot(rimZ, p.maskR * 0.98);
    const strap = new THREE.TorusGeometry(SR, 0.3, 12, 72, Math.PI + 2 * ang); strap.rotateZ(-ang); strap.rotateX(-Math.PI / 2);
    mesh(L(strap, 0.03, 0.8, 15), M.strap, { pos: [0, p.maskY + 0.1, 0], parent: head });
    const la = -ang + 0.32, lx = Math.cos(la) * (SR + 0.25), lz = -Math.sin(la) * (SR + 0.25);
    mesh(L(ball(0.55, 1.0, 0.8, 0.7), 0.02, 1, 16), M.strap, { pos: [lx, p.maskY + 0.1, lz], rot: [0, Math.atan2(lx, lz), 0], parent: head });
    mesh(ball(0.22, 1, 1, 1, 16), M.redLed, { pos: [lx * 1.07, p.maskY + 0.12, lz * 1.07], parent: head, cast: false });
    const hat = new THREE.Group(); hat.position.set(0, 1.55, -0.9); hat.rotation.set(-0.56, 0, 0.05); head.add(hat);
    const R0 = p.headR * 0.95, pr = [];
    for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI / 2; pr.push([Math.max(0.01, Math.cos(a) * R0 * 1.1 * (1 - 0.05 * Math.sin(a * 2))), 1.6 + Math.sin(a) * p.headR * 1.0]); }
    mesh(L(lathe(pr, 56), p.lump * 0.9, p.lumpF * 1.2, 17), M.hat, { parent: hat });
    mesh(L(lathe([[R0 * 0.98, 2.4], [R0 * 0.98, 0.0], [R0 * 1.12, 0.0], [R0 * 1.17, 0.6], [R0 * 1.17, 1.8], [R0 * 1.13, 2.4]], 72), p.lump * 0.5, p.lumpF, 18), M.hatBrim, { parent: hat });
    this.pompom = mesh(L(ball(1.7), 0.3, 0.9, 19), M.pompom, { pos: [0.3, p.headR * 1.0 + 2.9, 0.2], parent: hat });
    for (const [x, y, z, a] of [[-4.4, 0.8, 0.6, -0.8], [-4.7, -0.4, -0.6, -1.1], [4.5, 0.7, 0.4, 0.8], [4.6, -0.6, -1.0, 1.1], [-2.6, 0.1, -3.8, -0.3], [2.5, 0.0, -4.0, 0.3], [0, -0.3, -4.4, 0]])
      mesh(L(sausage([[x * 0.9, y + 1.2, z * 0.9], [x, y - 0.4, z], [x * 1.05 + a * 0.4, y - 1.6, z * 1.02]], [0.75, 0.6, 0.15], { up: [0, 0, 1] }), 0.06, 0.9, 20 + x), M.hair, { parent: head });
  }

  /**
   * P: lean, slump, side, shrink, hp, hr, hy, breathe,
   *    elL, hdL, elR, hdR (kid-space points), cup (0/1), cupAt, cupTilt
   */
  pose(P) {
    const p = this.p, M = this.M, sh = P.shrink || 0, sl = P.slump || 0, br = P.breathe || 0;
    const lean = (P.lean ?? 0.15) - sh * 0.12, side = P.side || 0;
    const H0 = [0, 2.6 - 0.5 * sl, -0.3 * sl];
    const Ls = [3.8, 3.7 * (1 - 0.06 * sh), 2.5 * (1 - 0.3 * sh)];
    const as = [lean * 0.3 + sl * 0.06, lean * 0.7 + sl * 0.2, lean + sl * 0.42];
    const ss = [side * 0.3, side * 0.7, side];
    const H1 = add(H0, mul(dir(as[0], ss[0]), Ls[0]));
    const H2 = add(H1, mul(dir(as[1], ss[1]), Ls[1]));
    const H3 = add(H2, mul(dir(as[2], ss[2]), Ls[2]));
    const W = p.torsoW * (1 + br * 0.025), D = p.torsoD * (1 + br * 0.04);
    swap(this.torso, lumpy(sausage([H0, H1, H2, H3], [[W, D], [W * 0.97, D * 0.95], [W * 0.92 * (1 - 0.05 * sl), D * 0.9], [W * 0.6, D * 0.64]], { up: [0, 0, 1], seg: 40, steps: 56 }), p.lump, p.lumpF, 3));
    this.collar.position.set(...add(H3, [0, 0.25, 0.25]));
    this.collar.rotation.set(as[2] - 0.45, 0, -ss[2]);
    // shoulders: dropped and drawn in by the slump, hunched up by the shrink
    const lat = [Math.cos(ss[2]), -Math.sin(ss[2]), 0];
    const S = [-1, 1].map(s => add(add(H2, mul(lat, s * 3.3 * (1 - 0.12 * sl - 0.08 * sh))), [0, -0.5 * sl + 1.0 * sh + br * 0.15, 0.2 + 0.6 * sl]));
    this.shoulders.forEach((m, i) => m.position.set(...S[i]));
    // head rides the neck
    const ha = as[2] * 0.7 + (P.hp || 0), hroll = -ss[2] * 0.8 + (P.hr || 0);
    const eul = new THREE.Euler(ha, P.hy || 0, hroll, 'YXZ');
    const v = new THREE.Vector3(0, 4.0 * (1 - 0.22 * sh), -0.3).applyEuler(eul);
    this.head.position.set(H3[0] + v.x + (P.hx || 0), H3[1] + v.y, H3[2] + v.z);
    this.head.rotation.copy(eul);
    // arms
    const cup = (P.cup || 0) > 0.5;
    this.cup.visible = cup;
    this.mitts.forEach(m => (m.visible = !cup));
    this.opens.forEach(m => (m.visible = false));
    let hands;
    if (cup) {
      const c = P.cupAt;
      this.cup.position.set(...c);
      this.cup.rotation.set(P.cupTilt || 0.35, P.cupYaw || 0, 0);
      hands = [add(c, [-1.7, 0.1, -0.4]), add(c, [1.7, 0.1, -0.4])];
    } else hands = [P.hdL, P.hdR];
    const els = [P.elL, P.elR];
    [-1, 1].forEach((s, i) => {
      const a0 = add(S[i], mul(lat, s * 0.6));
      const hd = hands[i], el = els[i];
      const wr = add(hd, mul(nrm(sub(hd, el)), -1.1));
      swap(this.arms[i], lumpy(sausage([a0, lerp3(a0, el, 0.55), el, lerp3(el, wr, 0.5), wr], [p.armR * 1.1, p.armR, p.armR * 0.97, p.armR * 0.93, p.armR * 0.86], { up: [0, 1, 0], steps: 48 }), p.lump * 0.8, p.lumpF, 30 + s));
      if (!cup) {
        const open = (P.open || 0) > 0.5, h = open ? this.opens[i] : this.mitts[i];
        this.mitts[i].visible = !open; this.opens[i].visible = open;
        h.position.set(...hd);
        orient(h, sub(hd, el), P.palm ? P.palm[i] : [s * 0.3, 1, 0.4]);
      }
    });
    this.anchor = { H2, H3, S };
  }
}

// --------------------------------------------------------------------------
// the plush
// --------------------------------------------------------------------------
export class Toy {
  constructor(M, o = {}) {
    const p = this.p = { r: 3.6, lump: 0.16, lumpF: 0.4, ...o };
    const k = p.r / 4.6;
    this.group = new THREE.Group();      // placed by the shot
    this.spring = new THREE.Group();     // squash and stretch, about the base
    this.body = new THREE.Group();       // its lean and turn
    this.group.add(this.spring); this.spring.add(this.body);
    this.body.position.y = p.r;          // the toy's origin is where it sits
    const body = this.body, L = (g, a = p.lump, s = 1) => lumpy(g, a, p.lumpF, s);
    mesh(L(ball(p.r, 1.06, 0.98, 0.94), p.lump, 40), M.body, { parent: body });
    mesh(L(ball(p.r * 0.66, 1.0, 1.0, 0.5), p.lump * 0.5, 41), M.belly, { pos: [0, -0.9 * k, p.r * 0.62], parent: body });
    for (const s of [-1, 1]) mesh(L(ball(1.35 * k, 0.8, 1.2, 0.6), p.lump * 0.5, 42 + s), M.ear, { pos: [s * p.r * 0.62, p.r * 0.82, -0.3], rot: [0, 0, -s * 0.5], parent: body });
    mesh(L(sausage([[p.r * 0.62, p.r * 0.62, 0.8], [p.r * 1.05, p.r * 0.7, 1.3], [p.r * 1.5, p.r * 0.55, 1.6]], [0.26 * k, 0.22 * k, 0.2 * k], { up: [0, 0, 1] }), 0.02, 45), M.antenna, { parent: body });
    mesh(L(ball(0.7 * k), 0.04, 46), M.bobble, { pos: [p.r * 1.58, p.r * 0.52, 1.65], parent: body });
    this.armL = mesh(L(sausage([[-p.r * 0.85, 0.6 * k, 0.6], [-p.r * 1.15, 1.6 * k, 1.2 * k], [-p.r * 1.25, 3.0 * k, 1.4 * k]], [0.95 * k, 0.85 * k, 0.8 * k], { up: [0, 0, 1] }), p.lump * 0.6, 47), M.body, { parent: body });
    this.armR = mesh(L(sausage([[p.r * 0.8, 0.4 * k, 0.9], [p.r * 1.0, 0.6 * k, 1.9 * k], [p.r * 1.0, 0.3 * k, 2.6 * k]], [0.95 * k, 0.85 * k, 0.8 * k], { up: [0, 0, 1] }), p.lump * 0.6, 48), M.body, { parent: body });
    const fz = (x, y) => Math.sqrt(Math.max(0, p.r * p.r - x * x - y * y)) * 0.94;
    for (const s of [-1, 1]) {
      const x = s * 1.45 * k, y = 1.7 * k;
      mesh(ball(0.5 * k, 1, 1.15, 0.6, 24), M.eye, { pos: [x, y, fz(x, y) + 0.1], parent: body });
      mesh(ball(0.14 * k, 1, 1, 1, 12), M.eyeGlint, { pos: [x + 0.17 * k, y + 0.22 * k, fz(x, y) + 0.38 * k], parent: body, cast: false });
    }
    const sm = [];
    for (let i = 0; i <= 8; i++) { const a = Math.PI * (0.22 + 0.56 * i / 8); const x = Math.cos(a) * -1.3 * k, y = (1.05 - Math.sin(a) * 0.7) * k; sm.push([x, y, fz(x, y) + 0.1]); }
    mesh(L(sausage(sm, [0.16 * k, 0.19 * k, 0.16 * k], { up: [0, 0, 1], seg: 12 }), 0.01, 49), M.smile, { parent: body });
    for (const s of [-1, 1]) mesh(ball(0.45 * k, 1.2, 0.8, 0.3, 16), M.cheek, { pos: [s * 2.35 * k, 0.85 * k, fz(s * 2.35 * k, 0.85 * k) + 0.05], rot: [0, s * 0.45, 0], parent: body });
    const ly = -1.0 * k, lz = fz(0, ly);
    mesh(new THREE.TorusGeometry(0.85 * k, 0.24 * k, 12, 32), M.bezel, { pos: [0, ly, lz + 0.05], rot: [-0.18, 0, 0], parent: body });
    this.lens = mesh(ball(0.72 * k, 1, 1, 0.55, 24), M.led, { pos: [0, ly, lz + 0.1], parent: body, cast: false });
    this.ledLocal = new THREE.Vector3(0, ly, lz + 2.4);
  }
  /** h: hop height (cm), sq: squash (+) or stretch (−), lean, yaw, wave (arm swing) */
  pose({ h = 0, sq = 0, lean = 0.3, pitch = -0.16, yaw = -0.15, wave = 0 } = {}) {
    this.spring.position.y = h;
    this.spring.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
    this.body.rotation.set(pitch, yaw, lean, 'YXZ');
    this.armL.rotation.set(0, 0, wave * 0.5);
    this.armL.position.set(-wave * 0.3, -wave * 0.6, 0);
  }
  ledWorld() { this.group.updateMatrixWorld(true); return this.body.localToWorld(this.ledLocal.clone()); }
}

// --------------------------------------------------------------------------
// the grown-up
// --------------------------------------------------------------------------
export class Adult {
  constructor(M, o = {}) {
    this.M = M;
    this.p = { headR: 4.5, headSZ: 0.86, torsoW: 5.6, torsoD: 4.3, armR: 1.75, legR: 2.25, lump: 0.22, lumpF: 0.26, maskR: 3.95, ...o };
    const p = this.p, L = (g, a = p.lump, f = p.lumpF, s = 1) => lumpy(g, a, f, s);
    this.group = new THREE.Group();
    this.parts = {};
    for (const k of ['hips', 'torso', 'armL', 'armR', 'thighL', 'thighR', 'shinL', 'shinR']) this.parts[k] = mesh(new THREE.BufferGeometry(), k.startsWith('arm') || k === 'torso' ? M.cardigan : M.trousers, { parent: this.group });
    this.parts.hips.geometry = L(ball(5.6, 1.05, 0.62, 0.92), p.lump, p.lumpF, 60);
    this.shoes = [-1, 1].map(s => mesh(L(ball(1.9, 1.0, 0.75, 1.55), 0.08, 0.6, 61 + s), M.shoes, { parent: this.group }));
    this.hands = [-1, 1].map(s => mesh(L(ball(1.45, 1.05, 0.72, 1.25), 0.06, 0.8, 63 + s), M.skin, { parent: this.group }));
    this.collar = mesh(L(new THREE.TorusGeometry(2.3, 0.7, 16, 36).rotateX(Math.PI / 2), p.lump * 0.4, p.lumpF, 65), M.collar, { parent: this.group });
    this.head = new THREE.Group(); this.group.add(this.head);
    mesh(L(ball(p.headR, 1.0, 1.06, p.headSZ), p.lump * 0.7, p.lumpF, 66), M.hair, { parent: this.head });
    const front = p.headR * p.headSZ, maskThick = 0.9, dome = 0.22;
    const maskZ = front + 0.2 - maskThick - dome * p.maskR * 0.5;
    this.mask = tokoMask(p.maskR, M.maskDisc, M.maskInk, { kind: 'clay', lump: 0.02, raise: 0.26, bevel: 0.13, dome, thick: maskThick, seed: 9 });
    this.mask.position.set(0, -0.2, maskZ); this.head.add(this.mask);
    const rimZ = maskZ + maskThick * 0.5, ang = Math.atan2(rimZ, p.maskR * 0.98), SR = Math.hypot(rimZ, p.maskR * 0.98);
    const strap = new THREE.TorusGeometry(SR, 0.3, 12, 72, Math.PI + 2 * ang); strap.rotateZ(-ang); strap.rotateX(-Math.PI / 2);
    mesh(L(strap, 0.03, 0.8, 67), M.strap, { pos: [0, -0.1, 0], parent: this.head });
    // hair: a parting over the top and a bun at the back
    mesh(L(ball(p.headR * 1.02, 1.0, 0.5, 0.86).translate(0, p.headR * 0.45, -1.3), 0.12, 0.9, 68), M.hair, { parent: this.head });
    mesh(L(ball(2.3, 1.0, 0.9, 0.9), 0.15, 0.9, 69), M.hair, { pos: [0, 1.6, -p.headR * 0.95], parent: this.head });
    for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.45; mesh(L(sausage([[Math.sin(a) * 1.0, 3.2, -3.0], [Math.sin(a) * 2.2, 2.4, -4.6], [Math.sin(a) * 2.0, 1.2, -5.6]], [0.5, 0.55, 0.3], { up: [0, 0, 1] }), 0.05, 1, 70 + i), M.hair, { parent: this.head }); }
  }
  /**
   * P: hip (world), yaw, lean, side, knee, foot (offsets from hip, in the figure's frame),
   *    elL, hdL, elR, hdR (world points), hp, hr, hy
   */
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
    const W = p.torsoW, D = p.torsoD;
    this.parts.torso.geometry.dispose();
    this.parts.torso.geometry = L(sausage([H0, H1, H2, H3], [[W, D], [W * 0.95, D * 0.92], [W * 0.98, D * 0.86], [W * 0.55, D * 0.6]], { up: R([0, 0, 1]), seg: 40, steps: 56 }), 71);
    this.collar.position.set(...add(H3, [0, 0.3, 0])); this.collar.rotation.set(a - 0.35, yaw, 0);
    const lat = R([Math.cos(sd), -Math.sin(sd), 0]);
    const S = [-1, 1].map(s => add(add(H2, mul(lat, s * 4.6)), [0, 0.3, 0]));
    const ha = a * 0.6 + (P.hp || 0);
    this.head.position.set(...add(H3, R([0, 4.1 * Math.cos(ha), 4.1 * Math.sin(ha) - 0.2])));
    this.head.rotation.set(ha, yaw + (P.hy || 0), (P.hr || 0) - sd * 0.6, 'YXZ');
    // arms
    // index 0 is the −x arm: the grown-up's own RIGHT
    const hands = [P.hdR, P.hdL], els = [P.elR, P.elL];
    [-1, 1].forEach((s, i) => {
      const a0 = add(S[i], mul(lat, s * 0.4)), el = els[i], hd = hands[i];
      const via = i ? P.viaL : null;              // an arm round someone needs a waypoint behind them
      const pre = via || el;
      const wr = add(hd, mul(nrm(sub(hd, pre)), -1.2));
      const g = L(sausage([a0, lerp3(a0, el, 0.5), el, via || lerp3(el, wr, 0.5), wr], [p.armR * 1.1, p.armR, p.armR * 0.96, p.armR * 0.92, p.armR * 0.82], { up: [0, 1, 0], steps: 64 }), 72 + s);
      const m = this.parts[i ? 'armL' : 'armR']; m.geometry.dispose(); m.geometry = g;
      this.hands[i].position.set(...hd); orient(this.hands[i], sub(hd, pre), P.palm ? P.palm[i] : [0, 1, 0]);
    });
    // legs
    [-1, 1].forEach((s, i) => {
      const hp = at([s * 2.6, 2.4, 0.6]);
      const kn = at(add([s * 3.0, 0, 0], P.knee)), ft = at(add([s * 3.2, 0, 0], P.foot));
      const t = this.parts[i ? 'thighL' : 'thighR'], sh = this.parts[i ? 'shinL' : 'shinR'];
      t.geometry.dispose(); t.geometry = L(sausage([hp, lerp3(hp, kn, 0.5), kn], [p.legR * 1.2, p.legR * 1.1, p.legR], { up: [0, 1, 0] }), 74 + s);
      sh.geometry.dispose(); sh.geometry = L(sausage([kn, lerp3(kn, ft, 0.5), add(ft, [0, 1.2, 0])], [p.legR, p.legR * 0.9, p.legR * 0.8], { up: R([0, 0, 1]) }), 76 + s);
      this.shoes[i].position.set(...add(ft, R([0, 0.4, 1.2]))); this.shoes[i].rotation.set(0, yaw, 0);
    });
    this.anchor = { H2, H3, S };
  }
}
