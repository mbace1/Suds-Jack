// The armature: a clay puppet that can WALK and TALK.
//
// Joints are groups — hips, a pivot at each hip and shoulder, a neck — so a
// pose is a handful of rotations, the way an animator bends the wire inside a
// real puppet. Two things this rig does that the first customers could not:
//
//   walk(phase)   a full cycle per unit of phase: legs swing from the hip,
//                 the body drops on the passing position and rises on the
//                 contact, arms counter-swing, the head lags a frame behind
//   say(mouth)    lip-sync from the voice: [open, bright] per exposure picks
//                 one of SIX replacement mouths — rest, small, open, wide,
//                 oo, ee — which is exactly how a stop-motion face is done:
//                 a drawer of mouths, swapped on twos
//
// Sizes in centimetres; a standing puppet is about 17 cm to the crown.

import * as THREE from 'three';
import { lump, glassMat, metalMat, rng } from './clay.js';

const put = (m, x, y, z) => (m.position.set(x, y, z), m);
const LIP = '#5b1a22', DARK = '#2a0b12', TEETH = '#fbf6ea';

function mouthSet(parent, s) {
  const M = {};
  M.rest = lump(new THREE.CapsuleGeometry(0.24, 1.7, 6, 12).rotateZ(Math.PI / 2), LIP, { seed: s + 1, lump: 0.02 });
  M.small = lump(new THREE.SphereGeometry(1, 20, 12).scale(0.75, 0.38, 0.3), DARK, { seed: s + 2, lump: 0.02 });
  M.open = (() => {
    const m = lump(new THREE.SphereGeometry(1, 24, 14).scale(1.2, 0.85, 0.36), DARK, { seed: s + 3, lump: 0.02 });
    m.add(put(lump(new THREE.BoxGeometry(1.6, 0.34, 0.3, 4, 2, 2), TEETH, { seed: s + 4, lump: 0.02 }), 0, 0.55, 0.2));
    m.add(put(lump(new THREE.SphereGeometry(0.55, 12, 8).scale(1.3, 0.5, 0.6), '#d9505e', { seed: s + 5, lump: 0.02 }), 0, -0.45, 0.12));
    return m;
  })();
  M.wide = (() => {
    const m = lump(new THREE.SphereGeometry(1.5, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.62, 0.42), DARK, { seed: s + 6, lump: 0.02 });
    m.add(put(lump(new THREE.BoxGeometry(2.3, 0.42, 0.34, 6, 2, 2), TEETH, { seed: s + 7, lump: 0.02 }), 0, -0.18, 0.5));
    return m;
  })();
  M.oo = lump(new THREE.TorusGeometry(0.5, 0.3, 10, 20), LIP, { seed: s + 8, lump: 0.02 });
  M.ee = (() => {
    const m = lump(new THREE.SphereGeometry(1, 24, 12).scale(1.45, 0.34, 0.3), DARK, { seed: s + 9, lump: 0.02 });
    m.add(put(lump(new THREE.BoxGeometry(2.2, 0.3, 0.3, 6, 2, 2), TEETH, { seed: s + 10, lump: 0.02 }), 0, 0.05, 0.14));
    return m;
  })();
  for (const m of Object.values(M)) { m.position.set(0, -1.75, 2.9); m.rotation.x = -0.18; parent.add(m); m.visible = false; }
  M.rest.visible = true;
  return M;
}

/** which replacement mouth a voice exposure calls for */
export function mouthFor([open, bright] = [0, 0]) {
  if (open < 0.12) return 'rest';
  if (bright > 0.55) return open > 0.45 ? 'ee' : 'small';
  if (open > 0.72) return 'open';
  if (open > 0.4) return bright < 0.18 ? 'oo' : 'wide';
  return 'small';
}

/** a pair of glasses; `smart` adds the camera and the little light */
export function glasses({ frame = '#1d1a22', smart = false, seed = 1 } = {}) {
  const g = new THREE.Group();
  const ring = new THREE.Shape(); ring.absellipse(0, 0, 1.25, 0.95, 0, Math.PI * 2);
  const hole = new THREE.Path(); hole.absellipse(0, 0, 0.95, 0.66, 0, Math.PI * 2, true); ring.holes.push(hole);
  for (const x of [-1.25, 1.25]) {
    const r = lump(new THREE.ExtrudeGeometry(ring, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 3, curveSegments: 20 }), frame, { seed: seed + (x > 0), lump: 0.02, boil: 0.006, mat: { rough: 0.35, prints: 0.25, sss: 0.05 } });
    r.position.x = x; g.add(r);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(1, 24).scale(0.98, 0.7, 1), glassMat()); lens.position.set(x, 0, 0.2); g.add(lens);
  }
  g.add(put(lump(new THREE.CapsuleGeometry(0.16, 0.55, 4, 8).rotateZ(Math.PI / 2), frame, { seed: seed + 3, lump: 0.01 }), 0, 0.25, 0.2));
  for (const x of [-2.45, 2.45]) g.add(put(lump(new THREE.CapsuleGeometry(0.16, 3.2, 4, 8).rotateX(Math.PI / 2), frame, { seed: seed + 4, lump: 0.01 }), x, 0.2, -1.5));
  let led = null;
  if (smart) {
    led = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshBasicMaterial({ color: '#5ff3ff' }));
    led.position.set(2.35, 0.55, 0.3); g.add(led);
    const cam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 12).rotateX(Math.PI / 2), metalMat('#333', 0.2)); cam.position.set(-2.35, 0.55, 0.32); g.add(cam);
  }
  g.userData = { led };
  return g;
}

/**
 * A puppet on an armature.
 *   outfit   'sweater' | 'suit'
 *   seated   hides the legs (behind a desk)
 */
export function puppet({ outfit = 'sweater', color = '#3f6fd0', skin = '#f1c3a1', hair = '#2b1d1a', trousers = '#2d2b3a',
  style = 0, seed = 1, tie = '#d7263d', shirt = '#fbf6ea', glass = null, seated = false } = {}) {
  const s = seed * 100, root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 4.6; root.add(hips);
  // legs: a pivot at each hip, a trouser leg and a shoe hanging from it
  const legs = [-1.3, 1.3].map((x, i) => {
    const pivot = new THREE.Group(); pivot.position.set(x, 0, 0); hips.add(pivot);
    pivot.add(put(lump(new THREE.CapsuleGeometry(0.95, 2.4, 8, 16), trousers, { seed: s + 1 + i, lump: 0.07 }), 0, -1.9, 0));
    pivot.add(put(lump(new THREE.SphereGeometry(1.1, 24, 16).scale(1.2, 0.62, 1.75), '#241f26', { seed: s + 3 + i, lump: 0.07 }), 0, -4.0, 0.55));
    pivot.visible = !seated;
    return pivot;
  });
  // the body, from the hips up
  const torso = new THREE.Group(); hips.add(torso);
  const prof = [[0, 0], [2.7, 0.1], [3.45, 1.5], [3.55, 3.4], [3.1, 5.3], [2.1, 6.5], [0.9, 7.0], [0, 7.1]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = lump(new THREE.LatheGeometry(new THREE.SplineCurve(prof).getPoints(24), 40), color, { seed: s + 5, lump: 0.15, freq: 0.3, mottle: 0.06 });
  body.position.y = -1.3; torso.add(body);
  if (outfit === 'suit') {
    // shirt front, tie, and two lapels over the jacket
    const vee = new THREE.Shape(); vee.moveTo(-1.4, 5.7); vee.lineTo(1.4, 5.7); vee.lineTo(0, 1.6); vee.closePath();
    const sh = lump(new THREE.ExtrudeGeometry(vee, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.12, bevelSegments: 3 }), shirt, { seed: s + 6, lump: 0.03 });
    sh.position.set(0, -1.3, 3.05); sh.rotation.x = -0.28; torso.add(sh);
    const tieS = new THREE.Shape(); tieS.moveTo(-0.35, 5.5); tieS.lineTo(0.35, 5.5); tieS.lineTo(0.6, 2.4); tieS.lineTo(0, 1.8); tieS.lineTo(-0.6, 2.4); tieS.closePath();
    const t = lump(new THREE.ExtrudeGeometry(tieS, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.1, bevelSegments: 3 }), tie, { seed: s + 7, lump: 0.03 });
    t.position.set(0, -1.2, 3.35); t.rotation.x = -0.26; torso.add(t);
    for (const sx of [-1, 1]) {
      const lap = new THREE.Shape(); lap.moveTo(0, 0); lap.lineTo(sx * 1.2, 0.2); lap.lineTo(sx * 1.6, -3.4); lap.closePath();
      const l = lump(new THREE.ExtrudeGeometry(lap, { depth: 0.2, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.08, bevelSegments: 2 }), new THREE.Color(color).multiplyScalar(0.8), { seed: s + 8, lump: 0.02 });
      l.position.set(sx * 1.35, 4.4, 3.2); l.rotation.x = -0.25; torso.add(l);
    }
  }
  // arms: shoulder pivots, a sleeve and a hand
  const arms = [-1, 1].map((sx) => {
    const pivot = new THREE.Group(); pivot.position.set(sx * 3.05, 3.9, 0.2); torso.add(pivot);
    pivot.add(put(lump(new THREE.CapsuleGeometry(0.8, 3.0, 8, 14), color, { seed: s + 9, lump: 0.06, mottle: 0.05 }), 0, -2.0, 0));
    const hand = put(lump(new THREE.SphereGeometry(0.85, 16, 12).scale(1, 1.1, 0.9), skin, { seed: s + 10, lump: 0.05 }), 0, -4.1, 0.1);
    pivot.add(hand);
    pivot.rotation.z = sx * 0.12;
    return { pivot, hand };
  });
  // the head on a neck pivot
  const neck = new THREE.Group(); neck.position.set(0, 7.2, 0.2); torso.add(neck);
  const head = new THREE.Group(); head.position.y = 2.9; neck.add(head);
  head.add(lump(new THREE.SphereGeometry(3.3, 48, 36).scale(1.08, 0.95, 0.95), skin, { seed: s + 11, lump: 0.1, freq: 0.4, mottle: 0.05 }));
  head.add(put(lump(new THREE.SphereGeometry(0.95, 24, 16).scale(1, 0.85, 1.25), new THREE.Color(skin).offsetHSL(0.01, 0.06, -0.06), { seed: s + 12, lump: 0.05 }), 0, -0.35, 3.25));
  for (const x of [-3.35, 3.35]) head.add(put(lump(new THREE.SphereGeometry(0.75, 16, 12).scale(0.55, 1, 0.8), skin, { seed: s + 13, lump: 0.04 }), x, 0.1, 0));
  const eyes = [-1.02, 1.02].map((x) => {
    const eye = new THREE.Group(); eye.position.set(x, 1.0, 2.55); head.add(eye);
    eye.add(lump(new THREE.SphereGeometry(1.08, 32, 24), '#f7f4ee', { seed: s + 14, lump: 0.02, mottle: 0.015, mat: { rough: 0.16, prints: 0.15, sheen: 0, sss: 0.1 } }));
    const pupil = put(lump(new THREE.SphereGeometry(0.42, 16, 12), '#121016', { seed: s + 15, lump: 0.01, boil: 0.004, mat: { rough: 0.12, prints: 0.1, sheen: 0, sss: 0 } }), 0, 0, 0.92);
    eye.add(pupil);
    const lid = lump(new THREE.SphereGeometry(1.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), skin, { seed: s + 16, lump: 0.02 });
    eye.add(lid);
    return { eye, pupil, lid };
  });
  const brows = [-1.1, 1.1].map((x) => { const b = put(lump(new THREE.CapsuleGeometry(0.26, 1.3, 6, 12).rotateZ(Math.PI / 2), hair, { seed: s + 17, lump: 0.03 }), x, 2.35, 2.75); head.add(b); return b; });
  const mouths = mouthSet(head, s + 20);
  const hr = rng(seed + 20);
  if (style === 0) for (let i = 0; i < 7; i++) head.add(put(lump(new THREE.SphereGeometry(1.2 + hr() * 0.5, 16, 12), hair, { seed: s + 40 + i, lump: 0.08 }), -2.4 + i * 0.8, 2.6 + Math.sin(i) * 0.3, -0.6 + hr()));
  else if (style === 1) head.add(put(lump(new THREE.SphereGeometry(3.4, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), hair, { seed: s + 47, lump: 0.12 }), 0, 0.3, -0.15));
  else if (style === 2) head.add(put(lump(new THREE.TorusGeometry(2.2, 0.9, 12, 24).rotateX(Math.PI / 2), hair, { seed: s + 48, lump: 0.1 }), 0, 2.4, -0.3));
  else { // the newsreader's quiff: a swept wave of clay over a close cap
    head.add(put(lump(new THREE.SphereGeometry(3.42, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.4), hair, { seed: s + 49, lump: 0.1 }), 0, 0.25, -0.2));
    const q = lump(new THREE.CapsuleGeometry(1.25, 3.4, 8, 16).rotateZ(Math.PI / 2).scale(1, 1, 1.3), hair, { seed: s + 50, lump: 0.14 });
    q.position.set(0.3, 3.35, 1.3); q.rotation.set(-0.35, 0, 0.12); head.add(q);
    for (const x of [-3.2, 3.2]) head.add(put(lump(new THREE.SphereGeometry(0.75, 12, 10).scale(0.6, 1.3, 0.8), '#b9b4b0', { seed: s + 51, lump: 0.05 }), x, 1.2, -0.3));
  }
  let specs = null;
  if (glass) { specs = glasses(glass); specs.position.set(0, 1.0, 3.55); head.add(specs); }

  const state = { walk: 0 };
  root.userData = {
    head, neck, torso, hips, legs, arms, eyes, brows, mouths, specs,
    /** everything but the walk: where they look, blink, brows, mouth, head */
    pose({ look = 0, lookY = 0, blink = 0, brow = 0, mouth = null, say = null, yaw = 0, nod = 0, tilt = 0 } = {}) {
      neck.rotation.set(-0.04 + nod * 0.18 + lookY * 0.15, yaw, tilt);
      for (const e of eyes) {
        e.pupil.position.set(look * 0.62, 0.05 + lookY * 0.45, Math.sqrt(Math.max(0.2, 0.85 - look * look * 0.38)));
        e.lid.rotation.x = -0.55 + blink * 2.05;
      }
      brows.forEach((b, i) => { b.position.y = 2.35 + brow * 0.45; b.rotation.z = (i ? -1 : 1) * brow * 0.25; });
      const m = mouth || (say ? mouthFor(say) : 'rest');
      for (const [k, o] of Object.entries(mouths)) o.visible = k === m;
    },
    /** a walk cycle, one full cycle per unit of phase; amount 0..1 blends to standing */
    walk(phase, amount = 1) {
      const a = Math.PI * 2 * phase, k = amount;
      legs[0].rotation.x = Math.sin(a) * 0.55 * k; legs[1].rotation.x = -Math.sin(a) * 0.55 * k;
      arms[0].pivot.rotation.x = -Math.sin(a) * 0.45 * k; arms[1].pivot.rotation.x = Math.sin(a) * 0.45 * k;
      // lowest with the legs spread (contact), highest as they pass; the head
      // follows the body a beat late, which is what makes it read as weight
      hips.position.y = 4.6 - Math.abs(Math.sin(a)) * 0.32 * k;
      torso.rotation.x = 0.06 * k; torso.rotation.y = Math.sin(a) * 0.08 * k;
      neck.position.y = 7.2 + Math.abs(Math.sin(a - 0.5)) * 0.12 * k;
    },
    /** raise an arm: 0 hanging, 1 straight forward */
    reach(side, k, out = 0) { arms[side].pivot.rotation.x = -k * 1.5; arms[side].pivot.rotation.z = (side ? 1 : -1) * (0.12 + out); },
    state,
  };
  root.userData.pose();
  return root;
}
