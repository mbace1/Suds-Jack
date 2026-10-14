// The two actors, built the same way for every 3D style so only the making
// changes: a slumped child in a Toko mask, and the AI plush they hug.
//
// Local frame: origin on the seat under the child's hips, +z toward camera,
// +y up, centimetres. `P` carries proportions and the pose; `M` the materials.

import * as THREE from 'three';
import { sausage, ball, lathe, lumpy, mesh, tokoMask } from './sculpt.js';

export function buildKid(M, P = {}) {
  const p = {
    headR: 5.0, headSZ: 0.84, headY: 16.4, headZ: 2.4, pitch: 0.36, roll: -0.34, yaw: 0.06,
    torsoW: 4.1, torsoD: 3.3, lump: 0.10, lumpF: 0.35,
    maskR: 4.25, maskThick: 1.0, maskDome: 0.24, maskY: -0.45, maskRaise: 0.26, maskBevel: 0.13,
    armR: 1.45, legR: 1.75, shinLen: 8.0, seatEdge: 9.0, thighY: 2.0,
    hat: true, hair: true, bangs: false, ...P,
  };
  const L = (g, a = p.lump, f = p.lumpF, s = 1) => lumpy(g, a, f, s);
  const kid = new THREE.Group();

  // hips and the slumped torso: a rolled sausage bending forward
  mesh(L(ball(4.3, 1.05, 0.62, 0.9), p.lump, p.lumpF, 2), M.trousers, { pos: [0, 2.2, 0.2], parent: kid });
  const spine = [[0, 2.6, 0], [0, 6.4, 0.9], [0, 10.0, 2.1], [0, 12.4, 2.8]];
  mesh(L(sausage(spine, [[p.torsoW, p.torsoD], [p.torsoW * 0.97, p.torsoD * 0.95], [p.torsoW * 0.92, p.torsoD * 0.9], [p.torsoW * 0.6, p.torsoD * 0.64]], { up: [0, 0, 1], seg: 40 }), p.lump, p.lumpF, 3), M.jumper, { parent: kid });
  if (M.collar) mesh(L(new THREE.TorusGeometry(2.0, 0.6, 16, 36).rotateX(Math.PI / 2 - 0.5), p.lump * 0.5, p.lumpF, 9), M.collar, { pos: [0, 12.7, 3.1], parent: kid });
  // shoulders slump: a lump each side, dropped
  for (const s of [-1, 1]) mesh(L(ball(2.2, 1.0, 0.85, 0.95), p.lump, p.lumpF, 4 + s), M.jumper, { pos: [s * 3.3, 9.7, 1.8], parent: kid });

  if (p.legPose === 'cross') {
    // sitting cross-legged on the cushion: knees out, shins crossed in front, socks tucked
    for (const s of [-1, 1]) {
      const fz = s > 0 ? 0 : 0.9, fy = s > 0 ? 0.35 : 0;   // one shin rides over the other
      const hip = [s * 2.2, 2.0, 0.6], knee = [s * 6.2, 2.4, 5.2];
      const ankle = [-s * 1.3, 1.45 + fy, 7.6 + fz];
      mesh(L(sausage([hip, [s * 4.5, 2.1, 3.0], knee], [p.legR * 1.2, p.legR * 1.1, p.legR], { up: [0, 1, 0] }), p.lump, p.lumpF, 5 + s), M.trousers, { parent: kid });
      mesh(L(sausage([knee, [s * 4.2, 1.8 + fy, 7.0 + fz * 0.6], ankle], [p.legR, p.legR * 0.9, p.legR * 0.82], { up: [0, 1, 0] }), p.lump, p.lumpF, 7 + s), M.trousers, { parent: kid });
      mesh(L(sausage([ankle, [-s * 2.9, 1.2 + fy, 7.8 + fz], [-s * 4.2, 0.9 + fy, 7.4 + fz]], [p.legR * 0.86, p.legR * 0.84, p.legR * 0.74], { up: [0, 1, 0] }), p.lump, p.lumpF, 11 + s), M.sockFn ? M.sockFn(s, ankle) : M.socks, { parent: kid });
    }
  } else {
    // legs: thighs forward along the seat, shins hanging over its edge
    for (const s of [-1, 1]) {
      const hip = [s * 2.2, p.thighY + 0.3, 0.8], knee = [s * 2.6, p.thighY, p.seatEdge], ankle = [s * 2.45, p.thighY - p.shinLen, p.seatEdge + 1.4 + s * 0.4];
      mesh(L(sausage([hip, [s * 2.4, p.thighY + 0.1, (p.seatEdge + 0.8) / 2], knee], [p.legR * 1.15, p.legR * 1.05, p.legR], { up: [0, 1, 0] }), p.lump, p.lumpF, 5 + s), M.trousers, { parent: kid });
      mesh(L(sausage([knee, [s * 2.55, p.thighY - p.shinLen * 0.5, p.seatEdge + 1.0], ankle], [p.legR, p.legR * 0.9, p.legR * 0.82], { up: [0, 0, 1] }), p.lump, p.lumpF, 7 + s), M.trousers, { parent: kid });
      mesh(L(sausage([[ankle[0], ankle[1] + 0.9, ankle[2]], [ankle[0], ankle[1] - 1.0, ankle[2] + 0.2], [ankle[0] - s * 0.5, ankle[1] - 1.9, ankle[2] + 2.4]], [p.legR * 0.86, p.legR * 0.84, p.legR * 0.8], { up: [1, 0, 0] }), p.lump, p.lumpF, 11 + s), M.sockFn ? M.sockFn(s, ankle) : M.socks, { parent: kid });
    }
  }

  // head: a ball flattened in front, drooped and tilted
  const head = new THREE.Group();
  head.position.set(0, p.headY, p.headZ);
  head.rotation.set(p.pitch, p.yaw, p.roll, 'YXZ');
  kid.add(head);
  mesh(L(ball(p.headR, 1.0, 1.0, p.headSZ), p.lump * 0.8, p.lumpF, 13), M.head || M.skin, { parent: head });   // the mask is the face; what shows round it is hair
  // the mask: a thick clay disc whose face stands just proud of the head
  const front = p.headR * p.headSZ;
  const maskZ = front + 0.2 - p.maskThick - p.maskDome * p.maskR * 0.5;
  const mask = tokoMask(p.maskR, M.maskDisc, M.maskInk, { kind: p.maskKind || 'clay', lump: p.maskLump ?? 0.02, raise: p.maskRaise, bevel: p.maskBevel, dome: p.maskDome, thick: p.maskThick, threadMat: M.thread || null, rimThreadMat: M.rimThread || null });
  mask.position.set(0, p.maskY, maskZ);
  head.add(mask);
  // strap round the BACK of the head, from rim to rim
  const rimZ = maskZ + p.maskThick * 0.5;
  const ang = Math.atan2(rimZ, p.maskR * 0.98);
  // a torus angle θ lands at (cos θ, 0, −sin θ) after the X turn: run θ from −ang round the back to π+ang
  const SR = Math.hypot(rimZ, p.maskR * 0.98);
  const strap = new THREE.TorusGeometry(SR, 0.3, 12, 72, Math.PI + 2 * ang);
  strap.rotateZ(-ang); strap.rotateX(-Math.PI / 2);
  mesh(L(strap, 0.03, 0.8, 15), M.strap, { pos: [0, p.maskY + 0.1, 0], parent: head });
  // the small red LED, on the strap just behind the mask's right rim, facing out
  const la = -ang + 0.32, lx = Math.cos(la) * (SR + 0.25), lz = -Math.sin(la) * (SR + 0.25);
  mesh(L(ball(0.55, 1.0, 0.8, 0.7), 0.02, 1, 16), M.strap, { pos: [lx, p.maskY + 0.1, lz], rot: [0, Math.atan2(lx, lz), 0], parent: head });
  mesh(ball(0.22, 1, 1, 1, 16), M.redLed, { pos: [lx * 1.07, p.maskY + 0.12, lz * 1.07], parent: head, cast: false });

  if (p.hat) {
    // a beanie pushed back off the mask: the cuff rides a tilted circle of the head,
    // just above the mask in front and down at the nape behind
    const hat = new THREE.Group(); hat.position.set(0, p.hatY ?? 1.55, -0.9); hat.rotation.set(-0.56, 0, 0.05); head.add(hat);
    const R0 = p.headR * 0.95;
    const pr = [];
    for (let i = 0; i <= 20; i++) { const a = (i / 20) * Math.PI / 2; pr.push([Math.max(0.01, Math.cos(a) * R0 * 1.1 * (1 - 0.05 * Math.sin(a * 2))), 1.6 + Math.sin(a) * p.headR * 1.0]); }
    mesh(L(lathe(pr, 56), p.lump * 0.9, p.lumpF * 1.2, 17), M.hat, { parent: hat });   // bottom → top, so it faces out
    const cuff = lathe([[R0 * 0.98, 2.4], [R0 * 0.98, 0.0], [R0 * 1.12, 0.0], [R0 * 1.17, 0.6], [R0 * 1.17, 1.8], [R0 * 1.13, 2.4]], 72);
    mesh(L(cuff, p.lump * 0.5, p.lumpF, 18), M.hatBrim || M.hat, { parent: hat });
    mesh(L(ball(1.7), 0.3, 0.9, 19), M.pompom || M.hat, { pos: [0.3, p.headR * 1.0 + 2.9, 0.2], parent: hat });
  }
  if (p.hair && M.hair) {
    // tufts escaping the beanie at the temples and the nape
    const tufts = [[-4.4, 0.8, 0.6, -0.8], [-4.7, -0.4, -0.6, -1.1], [4.5, 0.7, 0.4, 0.8], [4.6, -0.6, -1.0, 1.1], [-2.6, 0.1, -3.8, -0.3], [2.5, 0.0, -4.0, 0.3], [0, -0.3, -4.4, 0]];
    for (const [x, y, z, a] of tufts) {
      mesh(L(sausage([[x * 0.9, y + 1.2, z * 0.9], [x, y - 0.4, z], [x * 1.05 + a * 0.4, y - 1.6, z * 1.02]], [0.75, 0.6, 0.15], { up: [0, 0, 1] }), 0.06, 0.9, 20 + x), M.hair, { parent: head });
    }
    if (p.bangs) {
      // a fringe falling from under the cuff onto the top of the mask
      for (let i = 0; i < 7; i++) {
        const x = -3.3 + i * 1.1, z0 = 3.0 - Math.abs(x) * 0.18;
        mesh(L(sausage([[x * 0.95, 4.3, z0 - 0.6], [x, 3.6, z0 + 0.4], [x + 0.25 * Math.sin(i * 2.1), 3.0 + 0.25 * Math.cos(i * 1.7), z0 + 1.1]], [0.62, 0.55, 0.12], { up: [0, 0, 1] }), 0.05, 0.9, 27 + i), M.hair, { parent: head });
      }
    }
  }
  kid.userData.head = head;
  kid.userData.mask = mask;
  return kid;
}

/** arms that hug a toy of radius tr centred at t (kid space): shoulder → elbow round its side → mitt on its belly */
export function buildArms(M, P = {}) {
  const p = { armR: 1.45, lump: 0.1, lumpF: 0.35, t: [0.3, 7.4, 7.2], tr: 3.6, ...P };
  const g = new THREE.Group();
  const [tx, ty, tz] = p.t, R = p.tr;
  for (const s of [-1, 1]) {
    const sh = [s * 3.8, 9.6, 1.8];
    const el = [tx + s * (R + 1.3), ty - 0.2, tz - 1.4];
    const wr = [tx + s * (R * 0.95), ty - R * 0.45, tz + R * 0.55];
    const hd = [tx + s * R * 0.52, ty - R * 0.5, tz + R * 0.86];
    mesh(lumpy(sausage([sh, [s * (3.8 + R) * 0.6 + tx * 0.4, (sh[1] + el[1]) / 2 + 0.6, (sh[2] + el[2]) / 2], el, [tx + s * (R + 0.9), ty - R * 0.3, tz + R * 0.2], wr],
      [p.armR * 1.1, p.armR, p.armR * 0.98, p.armR * 0.95, p.armR * 0.88], { up: [0, 1, 0] }), p.lump, p.lumpF, 30 + s), M.sleeveFn ? M.sleeveFn(s, sh, wr) : (M.sleeve || M.jumper), { parent: g });
    if (M.cuffFn) mesh(lumpy(new THREE.TorusGeometry(p.armR * 0.82, p.armR * 0.28, 10, 28).lookAt(new THREE.Vector3(...wr).sub(new THREE.Vector3(...el))), 0.02, 1, 33 + s), M.cuffFn(s), { pos: wr, parent: g });
    // the mitt with a thumb, pressed flat against the toy
    mesh(lumpy(ball(1.25, 1.1, 0.75, 1.15), 0.06, 0.8, 35 + s), M.skin, { pos: hd, rot: [0.25, s * 0.55, s * 0.2], parent: g });
    mesh(lumpy(sausage([[hd[0] - s * 0.6, hd[1] + 0.5, hd[2] + 0.1], [hd[0] - s * 1.0, hd[1] + 1.1, hd[2] + 0.2]], [0.48, 0.4], { up: [0, 0, 1] }), 0.03, 1, 37 + s), M.skin, { parent: g });
  }
  return g;
}

/** the plush: a chubby ball with ears, stubby arms, an antenna and the LED */
export function buildToy(M, P = {}) {
  const p = { r: 4.0, lump: 0.12, lumpF: 0.4, lean: 0.32, ...P };
  const k = p.r / 4.6;
  const toy = new THREE.Group();
  const body = new THREE.Group(); toy.add(body);
  body.rotation.set(-0.16, -0.15, p.lean); // the cheery lean
  const L = (g, a = p.lump, s = 1) => lumpy(g, a, p.lumpF, s);
  mesh(L(ball(p.r, 1.06, 0.98, 0.94), p.lump, 40), M.body, { parent: body });
  if (M.belly) mesh(L(ball(p.r * 0.66, 1.0, 1.0, 0.5), p.lump * 0.5, 41), M.belly, { pos: [0, -0.9 * k, p.r * 0.62], parent: body });
  // ears
  for (const s of [-1, 1]) mesh(L(ball(1.35 * k * (p.ear ?? 1), 0.8, 1.2, 0.6), p.lump * 0.5, 42 + s), M.ear || M.body, { pos: [s * p.r * 0.62, p.r * 0.82, -0.3], rot: [0, 0, -s * 0.5], parent: body });
  // antenna with a bobble, out over the toy's right ear, away from the child's face
  mesh(L(sausage([[p.r * 0.62, p.r * 0.62, 0.8], [p.r * 1.05, p.r * 0.7, 1.3], [p.r * 1.5, p.r * 0.55, 1.6]], [0.26 * k, 0.22 * k, 0.2 * k], { up: [0, 0, 1] }), 0.02, 45), M.antenna || M.body, { parent: body });
  mesh(L(ball(0.7 * k), 0.04, 46), M.bobble || M.body, { pos: [p.r * 1.58, p.r * 0.52, 1.65], parent: body });
  // stubby arms: one up in a wave — cheer
  mesh(L(sausage([[-p.r * 0.85, 0.6 * k, 0.6], [-p.r * 1.15, 1.6 * k, 1.2 * k], [-p.r * 1.25, 3.0 * k, 1.4 * k]], [0.95 * k, 0.85 * k, 0.8 * k], { up: [0, 0, 1] }), p.lump * 0.6, 47), M.body, { parent: body });
  mesh(L(sausage([[p.r * 0.8, 0.4 * k, 0.9], [p.r * 1.0, 0.6 * k, 1.9 * k], [p.r * 1.0, 0.3 * k, 2.6 * k]], [0.95 * k, 0.85 * k, 0.8 * k], { up: [0, 0, 1] }), p.lump * 0.6, 48), M.body, { parent: body });
  // face: two bead eyes and a stitched smile, high on the ball
  const fz = (x, y) => Math.sqrt(Math.max(0, p.r * p.r - x * x - y * y)) * 0.94;
  for (const s of [-1, 1]) {
    const x = s * 1.45 * k, y = 1.7 * k;
    mesh(ball(0.5 * k, 1, 1.15, 0.6, 24), M.eye, { pos: [x, y, fz(x, y) + 0.1], parent: body });
    mesh(ball(0.14 * k, 1, 1, 1, 12), M.eyeGlint || M.eye, { pos: [x + 0.17 * k, y + 0.22 * k, fz(x, y) + 0.38 * k], parent: body, cast: false });
  }
  const sm = [];
  for (let i = 0; i <= 8; i++) { const a = Math.PI * (0.22 + 0.56 * i / 8); const x = Math.cos(a) * -1.3 * k, y = (1.05 - Math.sin(a) * 0.7) * k; sm.push([x, y, fz(x, y) + 0.1]); }
  mesh(L(sausage(sm, [0.16 * k, 0.19 * k, 0.16 * k], { up: [0, 0, 1], seg: 12 }), 0.01, 49), M.smile || M.eye, { parent: body });
  if (M.cheek) for (const s of [-1, 1]) mesh(ball(0.45 * k, 1.2, 0.8, 0.3, 16), M.cheek, { pos: [s * 2.35 * k, 0.85 * k, fz(s * 2.35 * k, 0.85 * k) + 0.05], rot: [0, s * 0.45, 0], parent: body });
  // the chest LED: a bezel ring and the glowing lens
  const ly = -1.0 * k, lz = fz(0, ly);
  mesh(new THREE.TorusGeometry(0.85 * k, 0.24 * k, 12, 32), M.bezel || M.eye, { pos: [0, ly, lz + 0.05], rot: [-0.18, 0, 0], parent: body });
  mesh(ball(0.72 * k, 1, 1, 0.55, 24), M.led, { pos: [0, ly, lz + 0.1], parent: body, cast: false });
  toy.userData.body = body;
  toy.userData.ledLocal = new THREE.Vector3(0, ly, lz + 2.6);
  toy.userData.ledLens = new THREE.Vector3(0, ly, lz + 0.4);
  return toy;
}
