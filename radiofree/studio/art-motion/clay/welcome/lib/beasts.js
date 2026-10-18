// The animals: a Finnish hound (tall, long-legged, big hanging ears — the dog a
// camera could take for a deer) and a tabby cat. One quadruped rig drives both.
//
// Built at the film's puppet scale (≈1:4, centimetres). The animal's own frame:
// origin on the ground under the middle of the body, +z toward the head, +y up,
// +x the animal's left. Like the people, the parts that bend (torso, neck,
// legs, tail) are re-rolled as sausages every held pose; the head, its ears,
// the collar and the antlers are built once and moved.
//
// The legs are two-bone IK from the shoulder/hip to an ankle that sits a fixed
// offset above the paw, then a short pastern down to the paw: front elbows bend
// back, hind stifles bend forward, which is what makes a quadruped read as a dog
// and not a table.

import * as THREE from 'three';
import { sausage, ball, lumpy, mesh } from './sculpt.js';

const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const nrm = (a) => mul(a, 1 / (len(a) || 1));
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const lerp = (a, b, k) => a + (b - a) * k;

function swap(m, g) { if (m.geometry) m.geometry.dispose(); m.geometry = g; }

/** orient a group so its +z runs along f and its +y is as close to u as it can be */
export function orient(obj, f, u) {
  const z = new THREE.Vector3(...nrm(f));
  let x = new THREE.Vector3().crossVectors(new THREE.Vector3(...u), z);
  if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
  x.normalize();
  const y = new THREE.Vector3().crossVectors(z, x);
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

/** two-bone IK: the knee for a limb from J to A with bone lengths l1, l2, bending toward pole */
function ik(J, A, l1, l2, pole) {
  const d0 = sub(A, J); let d = len(d0); const dir = mul(d0, 1 / (d || 1));
  d = Math.min(Math.max(d, Math.abs(l1 - l2) + 0.05), (l1 + l2) * 0.995);
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let pp = sub(pole, mul(dir, dot(pole, dir)));
  if (len(pp) < 1e-4) pp = [0, 0, 1];
  return add(add(J, mul(dir, a)), mul(nrm(pp), h));
}

/** a trot: per-leg paw offsets for gait phase ph (cycles), diagonal pairs together */
export function trot(ph, { stride = 6, lift = 2.2, duty = 0.55, off = { lf: 0, rh: 0.04, rf: 0.5, lh: 0.54 } } = {}) {
  const o = {};
  for (const k of ['lf', 'rf', 'lh', 'rh']) {
    const q = ((ph + off[k]) % 1 + 1) % 1;
    if (q < duty) o[k] = { dz: stride * (0.5 - q / duty), dy: 0, sw: 0 };
    else { const s = (q - duty) / (1 - duty); o[k] = { dz: stride * (-0.5 + s * s * (3 - 2 * s)), dy: lift * Math.sin(Math.PI * s), sw: Math.sin(Math.PI * s) }; }
  }
  return o;
}
/** body speed (cm per cycle) that keeps the stance paws planted */
export const trotAdvance = (stride = 6, duty = 0.55) => stride / duty;

export const DOG = {
  kind: 'dog',
  fy: 13.6, ry: 13.2,                         // spine centre heights, standing
  tz: [-9.4, -5.0, 1.0, 5.6, 8.0],            // torso stations along z
  tr: [[3.2, 3.5], [2.6, 2.8], [3.0, 3.7], [3.2, 4.0], [2.6, 3.0]],
  shoulder: [2.0, -1.4, 5.0], hip: [2.1, -0.8, -7.2],
  front: { l1: 5.8, l2: 5.6, l3: 2.4, r: [2.0, 1.25, 0.9, 0.85], ank: [0, 2.4, -0.25], paw: 1.05 },
  hind: { l1: 6.2, l2: 5.8, l3: 3.2, r: [2.6, 1.5, 0.95, 0.85], ank: [0, 3.0, -1.1], paw: 1.05 },
  neck: { base: [0, 1.4, 6.4], len: 6.0, r: [2.3, 1.75, 1.55] },
  tail: { root: [0, 1.6, -9.8], seg: [3.0, 2.8, 2.6], r: [1.0, 0.8, 0.6, 0.42] },
};
export const CAT = {
  kind: 'cat',
  fy: 6.4, ry: 6.8,
  tz: [-5.8, -2.6, 0.8, 3.6, 5.0],
  tr: [[2.1, 2.2], [1.8, 1.9], [1.9, 2.1], [1.9, 2.2], [1.5, 1.7]],
  shoulder: [1.2, -0.8, 3.2], hip: [1.3, -0.5, -4.4],
  front: { l1: 2.7, l2: 2.5, l3: 1.1, r: [1.05, 0.7, 0.55, 0.5], ank: [0, 1.1, -0.15], paw: 0.62 },
  hind: { l1: 3.0, l2: 2.8, l3: 1.6, r: [1.45, 0.85, 0.6, 0.5], ank: [0, 1.5, -0.55], paw: 0.62 },
  neck: { base: [0, 0.9, 4.3], len: 2.4, r: [1.5, 1.25, 1.15] },
  tail: { root: [0, 1.4, -6.2], seg: [2.8, 2.8, 2.6, 2.0], r: [0.62, 0.55, 0.5, 0.45, 0.4] },
};

export class Beast {
  /** M: materials { coat, coatLeg, saddle, white, nose, eye, glint, collar, inner, antler, whisker } */
  constructor(M, C = DOG, { antlers = false, lump = 0.16, lumpF = 0.42, seed = 0 } = {}) {
    this.M = M; this.C = C; this.lump = lump; this.lumpF = lumpF; this.seed = seed;
    const L = (g, a = lump, s = 1) => lumpy(g, a, lumpF, s + seed);
    this.group = new THREE.Group();         // placed in the world by the shot
    this.root = new THREE.Group(); this.group.add(this.root);
    const coatLeg = M.coatLeg || M.coat;
    this.torso = mesh(new THREE.BufferGeometry(), M.coat, { parent: this.root });
    this.neck = mesh(new THREE.BufferGeometry(), M.coat, { parent: this.root });
    this.legs = {};
    for (const k of ['lf', 'rf', 'lh', 'rh']) this.legs[k] = mesh(new THREE.BufferGeometry(), coatLeg, { parent: this.root });
    this.paws = {};
    for (const k of ['lf', 'rf', 'lh', 'rh']) {
      const c = k[1] === 'f' ? C.front : C.hind;
      this.paws[k] = mesh(L(ball(c.paw, 1.0, 0.62, 1.35), 0.05, 50 + k.charCodeAt(0) + k.charCodeAt(1)), C.kind === 'dog' ? M.white : coatLeg, { parent: this.root });
    }
    this.tail = mesh(new THREE.BufferGeometry(), C.kind === 'cat' ? coatLeg : M.coat, { parent: this.root });
    if (C.kind === 'dog') {
      this.saddle = mesh(new THREE.BufferGeometry(), M.saddle, { parent: this.root });
      this.chest = mesh(L(ball(1.9, 1.0, 1.45, 0.6), 0.08, 30), M.white, { parent: this.root });
      this.tailTip = mesh(L(ball(0.62, 1, 1, 1.4), 0.04, 31), M.white, { parent: this.root });
    } else {
      this.chest = mesh(L(ball(1.15, 1.0, 1.4, 0.6), 0.05, 30), M.white, { parent: this.root });
    }
    // collar
    if (M.collar) {
      const cr = C.kind === 'dog' ? 2.35 : 1.4;
      this.collar = new THREE.Group(); this.root.add(this.collar);
      mesh(L(new THREE.TorusGeometry(cr, C.kind === 'dog' ? 0.42 : 0.25, 10, 40), 0.04, 32), M.collar, { parent: this.collar });
      mesh(new THREE.TorusGeometry(0.42, 0.12, 8, 18), M.ring || M.collar, { pos: [0, -cr - 0.35, 0.1], rot: [0, Math.PI / 2, 0], parent: this.collar, cast: false });
      this.collarR = cr;
    }
    // the head: built once, origin at the skull's centre, +z out of the nose
    this.head = new THREE.Group(); this.root.add(this.head);
    this.eyes = []; this.glints = []; this.brows = []; this.ears = [];
    const H = this.head;
    if (C.kind === 'dog') {
      mesh(L(ball(3.0, 0.92, 0.9, 1.1), 0.12, 33), M.coat, { parent: H });
      mesh(L(sausage([[0, -0.2, 1.4], [0, -0.6, 3.9], [0, -0.85, 5.9]], [[1.9, 1.7], [1.55, 1.38], [1.3, 1.18]], { up: [0, 1, 0] }), 0.07, 34), M.coat, { parent: H });
      mesh(L(ball(1.2, 1.0, 0.55, 1.9), 0.05, 35), M.coat, { pos: [0, -1.75, 3.6], parent: H });   // the jaw
      mesh(L(sausage([[0, 2.42, 1.0], [0, 1.72, 2.4], [0, 0.7, 3.9], [0, 0.34, 5.5]], [[0.5, 0.18], [0.62, 0.2], [0.55, 0.2], [0.42, 0.18]], { up: [0, 1, 0] }), 0.02, 36), M.white, { parent: H });   // the blaze, lying flat on the face
      this.nose = mesh(L(ball(0.85, 1.25, 0.85, 0.95), 0.03, 38), M.nose, { pos: [0, -0.35, 6.55], parent: H });
      for (const s of [-1, 1]) {
        const e = mesh(ball(0.58, 1, 1, 0.8, 24), M.eye, { pos: [s * 1.4, 0.72, 2.55], parent: H });
        this.eyes.push(e);
        this.glints.push(mesh(ball(0.15, 1, 1, 1, 10), M.glint, { pos: [s * 1.4 + 0.2, 0.95, 3.02], parent: H, cast: false }));
        const b = mesh(L(ball(0.62, 1.2, 0.6, 0.8), 0.03, 40 + s), M.coat, { pos: [s * 1.25, 1.7, 2.35], parent: H });
        b.userData.base = [s * 1.25, 1.7, 2.35]; this.brows.push(b);
        // the ear: a big soft leaf hung from the top of the skull, longer than the jaw
        const ear = new THREE.Group(); ear.position.set(s * 2.05, 1.8, -0.4); H.add(ear);
        mesh(L(ball(1, 0.55, 3.7, 1.6).translate(0, -2.75, 0.25), 0.1, 42 + s), M.ear || M.coat, { rot: [0, 0, 0], parent: ear });
        ear.userData.s = s; this.ears.push(ear);
      }
    } else {
      mesh(L(ball(2.15, 1.04, 0.9, 0.95), 0.07, 33), M.coat, { parent: H });
      mesh(L(ball(0.95, 1.3, 0.78, 0.85), 0.04, 34), M.white, { pos: [0, -0.75, 1.55], parent: H });
      this.nose = mesh(ball(0.3, 1.2, 0.8, 0.8, 16), M.nose, { pos: [0, -0.2, 2.2], parent: H });
      for (const s of [-1, 1]) {
        const e = mesh(ball(0.5, 1, 1.05, 0.62, 24), M.eye, { pos: [s * 0.88, 0.38, 1.55], parent: H });
        mesh(ball(0.5, 0.3, 0.92, 0.5, 16), M.pupil, { pos: [0, 0, 0.22], parent: e, cast: false });
        this.eyes.push(e);
        this.glints.push(mesh(ball(0.11, 1, 1, 1, 8), M.glint, { pos: [s * 0.88 + 0.16, 0.6, 1.92], parent: H, cast: false }));
        const ear = new THREE.Group(); ear.position.set(s * 1.2, 1.55, -0.2); ear.rotation.z = -s * 0.32; H.add(ear);
        mesh(L(new THREE.ConeGeometry(0.95, 2.1, 14).translate(0, 0.95, 0).scale(1, 1, 0.55), 0.05, 42 + s), M.coat, { parent: ear });
        mesh(new THREE.ConeGeometry(0.6, 1.5, 12).translate(0, 0.8, 0).scale(1, 1, 0.4), M.inner, { pos: [0, 0.05, 0.22], parent: ear, cast: false });
        ear.userData.s = s; this.ears.push(ear);
        for (let w = 0; w < 3; w++) {
          const y = -0.75 + (w - 1) * 0.22;
          mesh(sausage([[s * 0.7, y, 2.0], [s * 1.9, y + 0.05 + (w - 1) * 0.1, 2.15], [s * 3.0, y + (w - 1) * 0.35 - 0.05, 1.9]], [0.05, 0.04, 0.025], { seg: 6, steps: 10, capSteps: 2 }), M.whisker, { parent: H, cast: false });
        }
      }
    }
    if (antlers) {
      // the reflection's: two pale branching beams, the camera's idea of this animal
      for (const s of [-1, 1]) {
        const X = (p) => [s * p[0], p[1], p[2]];
        const beam = [[1.1, 2.3, -0.7], [2.3, 4.6, -1.5], [3.9, 7.3, -1.9], [5.0, 10.0, -1.2], [5.4, 12.2, 0.2]];
        mesh(L(sausage(beam.map(X), [0.62, 0.55, 0.45, 0.36, 0.24], { up: [0, 0, 1] }), 0.05, 60 + s), M.antler, { parent: H });
        for (const [a, b, c] of [[[1.5, 3.1, -0.9], [1.9, 3.9, 0.6], [2.0, 4.3, 2.2]], [[2.9, 5.7, -1.7], [3.1, 7.6, -0.4], [3.0, 9.4, 0.9]], [[4.4, 8.6, -1.6], [4.0, 10.6, -1.7], [3.6, 12.4, -1.1]]])
          mesh(L(sausage([a, b, c].map(X), [0.38, 0.3, 0.2], { up: [0, 0, 1] }), 0.04, 64 + s + a[1]), M.antler, { parent: H });
      }
    }
    this.anchor = {};
  }

  /**
   * P: fy, ry (spine centre heights), bob, legs { lf, rf, lh, rh: { f: [x,y,z] paw, ank?: offset, pole? } },
   *    na (neck angle above horizontal), ny (neck yaw), hp (head pitch, + is nose down), hy, hr (tilt),
   *    tu (tail angle above horizontal-back), wag, curl, ear (0 hanging … 1 pricked), shut, brow, breathe
   */
  pose(P) {
    const C = this.C, L = (g, s) => lumpy(g, this.lump, this.lumpF, s + this.seed);
    const bob = P.bob || 0, br = P.breathe || 0;
    const fy = P.fy + bob, ry = P.ry + bob;
    const z0 = C.tz[0], z1 = C.tz[C.tz.length - 1];
    const sy = (z) => lerp(ry, fy, (z - z0) / (z1 - z0));
    const arch = P.arch ?? 0.4;
    const spine = C.tz.map((z, i) => [0, sy(z) + arch * Math.sin(Math.PI * i / (C.tz.length - 1)), z]);
    const kb = 1 + br * 0.045;
    swap(this.torso, L(sausage(spine, C.tr.map(([a, b]) => [a * kb, b * (1 + br * 0.03)]), { up: [0, 1, 0], seg: 36, steps: 56 }), 3));
    if (this.saddle) {
      const sp = spine.slice(0, 4).map((p, i) => add(p, [0, [1.55, 1.9, 2.1, 2.0][i], 0]));
      swap(this.saddle, L(sausage(sp, [[2.85, 1.25], [2.5, 1.15], [2.75, 1.25], [2.4, 0.9]].map(([a, b]) => [a * kb, b]), { up: [0, 1, 0], seg: 30, steps: 40 }), 4));
    }
    const front = spine[spine.length - 2];
    this.chest.position.set(0, front[1] - (C.kind === 'dog' ? 1.6 : 0.9), z1 - (C.kind === 'dog' ? 0.6 : 0.4));
    this.chest.rotation.set(-0.35, 0, 0);
    // neck and head
    const na = P.na ?? 0.85, ny = P.ny || 0;
    const nd = [Math.sin(ny) * Math.cos(na), Math.sin(na), Math.cos(ny) * Math.cos(na)];
    const N0 = [C.neck.base[0], fy + C.neck.base[1], C.neck.base[2]];
    const N1 = add(N0, mul(nd, C.neck.len));
    swap(this.neck, L(sausage([add(N0, mul(nd, -1.2)), lerp3(N0, N1, 0.5), N1], C.neck.r, { up: [0, 1, 0], seg: 28, steps: 30 }), 5));
    const hc = add(N1, mul(nd, C.kind === 'dog' ? 0.9 : 0.5));
    this.head.position.set(hc[0], hc[1] + (C.kind === 'dog' ? 0.9 : 0.6), hc[2]);
    this.head.rotation.set(P.hp ?? 0.25, ny + (P.hy || 0), P.hr || 0, 'YXZ');
    if (this.collar) {
      const cp = add(N0, mul(nd, C.kind === 'dog' ? 1.4 : 0.6));
      this.collar.position.set(...cp);
      orient(this.collar, nd, [0, 1, 0]);   // the ring, on the collar's −y, hangs at the throat
    }
    // ears: hanging, swung out by `ear`, pricked forward by `prick`
    const ear = P.ear || 0, earFlop = P.earFlop || 0;
    for (const e of this.ears) {
      const s = e.userData.s;
      if (C.kind === 'dog') e.rotation.set(-0.12 - ear * 0.35 + earFlop * 0.25 * s, 0, s * (0.1 + ear * 0.5) + earFlop * 0.3);
      else e.rotation.set(-0.1 + (P.earBack || 0) * 0.9, 0, -s * (0.32 + (P.earBack || 0) * 0.6));
    }
    // eyes: shut is a squash to a dark line
    const shut = P.shut || 0;
    for (const e of this.eyes) e.scale.set(1, Math.max(0.12, 1 - shut * 0.88), 1);
    for (const g of this.glints) g.visible = shut < 0.5;
    const brow = P.brow || 0;
    this.brows.forEach((b, i) => { const s = i ? 1 : -1, u = b.userData.base; b.position.set(u[0], u[1] + brow * 0.45 * (1 + (P.browTilt || 0) * s), u[2]); });
    // legs
    const ends = {};
    for (const k of ['lf', 'rf', 'lh', 'rh']) {
      const isF = k[1] === 'f', s = k[0] === 'l' ? 1 : -1, c = isF ? C.front : C.hind, base = isF ? C.shoulder : C.hip;
      const J = [s * base[0], (isF ? fy : ry) + base[1], base[2]];
      const lp = P.legs[k];
      const F = lp.f;
      const A = lp.A || add(F, lp.ank || c.ank);
      const pole = lp.pole || (isF ? [s * 0.15, 0, -1] : [s * 0.15, 0, 1]);
      const K = lp.K || ik(J, A, c.l1, c.l2, pole);
      const pw = add(F, [0, c.paw * 0.55, 0.45 * c.paw]);
      swap(this.legs[k], L(sausage([add(J, [0, 0.8, 0]), K, A, pw], c.r, { up: [0, 0, 1], seg: 22, steps: 40 }), 10 + k.charCodeAt(1)));
      this.paws[k].position.set(...pw);
      this.paws[k].rotation.set(lp.pawPitch || 0, lp.pawYaw || 0, 0);
      ends[k] = pw;
    }
    // tail: a chain bending by `curl`, swung by `wag`
    const T = C.tail, tu = P.tu ?? 0.4, wag = P.wag || 0, curl = P.curl ?? 0.25;
    let p = [T.root[0], ry + T.root[1], T.root[2]], ang = tu;
    const pts = [p];
    T.seg.forEach((l, i) => {
      const yaw = wag * (0.5 + i * 0.35);
      const d = [Math.sin(yaw) * Math.cos(ang), Math.sin(ang), -Math.cos(yaw) * Math.cos(ang)];
      p = add(p, mul(d, l)); pts.push(p);
      ang += (i === T.seg.length - 1 && C.kind === 'cat') ? curl * 2.4 : curl;
    });
    swap(this.tail, L(sausage(pts, T.r.slice(0, pts.length), { up: [0, 1, 0], seg: 18, steps: 36 }), 6));
    if (this.tailTip) { const e = pts[pts.length - 1], d = nrm(sub(e, pts[pts.length - 2])); this.tailTip.position.set(...add(e, mul(d, 0.25))); orient(this.tailTip, d, [0, 1, 0]); }
    this.anchor = { N0, N1, nd, ends, spine };
  }

  /** world position of a point on the collar's ring (where a tag would hang) */
  collarRing(target = new THREE.Vector3()) {
    this.group.updateMatrixWorld(true);
    return this.collar.localToWorld(target.set(0, -this.collarR - 0.35, 0.1));
  }
  /** world position of a head-local point */
  headPoint(p, target = new THREE.Vector3()) { this.group.updateMatrixWorld(true); return this.head.localToWorld(target.set(...p)); }
}

/** standing paw targets, for a gait to add to */
export function stance(C, { spreadF = 1, spreadH = 1, zf = 0, zh = 0 } = {}) {
  return {
    lf: [C.shoulder[0] * 0.85 * spreadF, 0, C.shoulder[2] + 0.4 + zf], rf: [-C.shoulder[0] * 0.85 * spreadF, 0, C.shoulder[2] + 0.4 + zf],
    lh: [C.hip[0] * 0.95 * spreadH, 0, C.hip[2] - 0.8 + zh], rh: [-C.hip[0] * 0.95 * spreadH, 0, C.hip[2] - 0.8 + zh],
  };
}
