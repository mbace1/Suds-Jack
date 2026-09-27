// The puppets and the props, in plasticine.
//
// A puppet is built the way an Aardman armature is dressed: a pear of a body,
// a head that is too big, eyes that touch at the bridge of the nose, brows
// that are two slugs of clay, and a wide mouth that is swapped rather than
// bent (REPLACEMENT mouths — the whole face of stop motion is a drawer of
// them). `pose()` moves the parts; nothing is skinned.
//
// Sizes are centimetres: a customer stands about 19 cm, which is the scale
// the lens and the ambient occlusion are tuned for.

import * as THREE from 'three';
import { lump, feltMat, feltNormal, cardMat, woodMat, glassMat, metalMat, printMat, clayText, rng } from './clay.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const put = (m, x, y, z) => (m.position.set(x, y, z), m);

export const SKIN = ['#f1c3a1', '#c98a62', '#f6d3b8', '#8b5a3c', '#e7b28c'];

/** a customer. opts: sweater, skin, hair, trousers, hairStyle */
export function customer({ sweater = '#3f6fd0', skin = SKIN[0], hair = '#2b1d1a', trousers = '#2d2b3a', style = 0, seed = 1 } = {}) {
  const g = new THREE.Group(), s = seed * 10;
  // feet and legs
  for (const x of [-1.3, 1.3]) {
    g.add(put(lump(new THREE.SphereGeometry(1.1, 24, 16).scale(1.2, 0.62, 1.7), '#241f26', { seed: s + 1, lump: 0.08 }), x, 0.6, 0.5));
    g.add(put(lump(new THREE.CapsuleGeometry(0.95, 2.0, 8, 16), trousers, { seed: s + 2, lump: 0.07 }), x, 2.3, 0));
  }
  // body: a pear on a lathe
  const prof = [[0, 0], [2.6, 0.2], [3.4, 1.6], [3.5, 3.4], [3.0, 5.2], [2.0, 6.4], [0.9, 6.9], [0, 7.0]].map(([x, y]) => new THREE.Vector2(x, y));
  const body = put(lump(new THREE.LatheGeometry(new THREE.SplineCurve(prof).getPoints(24), 40), sweater, { seed: s + 3, lump: 0.16, freq: 0.3, mottle: 0.06 }), 0, 3.3, 0);
  g.add(body);
  // head on a pivot, so it can turn and tilt
  const head = new THREE.Group(); head.position.set(0, 12.4, 0.2); g.add(head);
  head.add(lump(new THREE.SphereGeometry(3.3, 48, 36).scale(1.08, 0.94, 0.95), skin, { seed: s + 4, lump: 0.1, freq: 0.4, mottle: 0.05, marble: null }));
  head.add(put(lump(new THREE.SphereGeometry(0.95, 24, 16).scale(1, 0.85, 1.25), new THREE.Color(skin).offsetHSL(0, 0.05, -0.05), { seed: s + 5, lump: 0.05 }), 0, -0.35, 3.25));
  for (const x of [-3.35, 3.35]) head.add(put(lump(new THREE.SphereGeometry(0.75, 16, 12).scale(0.55, 1, 0.8), skin, { seed: s + 6, lump: 0.04 }), x, 0.1, 0));
  // eyes: two white balls touching at the bridge, pupils that look, lids that blink
  const eyes = [];
  for (const x of [-1.02, 1.02]) {
    const eye = new THREE.Group(); eye.position.set(x, 1.0, 2.55); head.add(eye);
    eye.add(lump(new THREE.SphereGeometry(1.08, 32, 24), '#f7f4ee', { seed: s + 7, lump: 0.02, mottle: 0.015, mat: { rough: 0.16, prints: 0.15, sheen: 0, sss: 0.1 } }));
    const pupil = put(lump(new THREE.SphereGeometry(0.42, 16, 12), '#121016', { seed: s + 8, lump: 0.01, boil: 0.004, mat: { rough: 0.12, prints: 0.1, sheen: 0, sss: 0 } }), 0, 0, 0.92);
    eye.add(pupil);
    const lid = lump(new THREE.SphereGeometry(1.15, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), skin, { seed: s + 9, lump: 0.02 });
    eye.add(lid);
    eyes.push({ eye, pupil, lid });
  }
  // brows
  const brows = [-1.1, 1.1].map((x) => {
    const b = put(lump(new THREE.CapsuleGeometry(0.26, 1.3, 6, 12).rotateZ(Math.PI / 2), hair, { seed: s + 10, lump: 0.03 }), x, 2.35, 2.75);
    head.add(b); return b;
  });
  // replacement mouths — one drawer, one face at a time
  const mouths = {
    smile: lump(new THREE.TorusGeometry(1.35, 0.3, 10, 28, Math.PI).rotateZ(Math.PI), '#5b1a22', { seed: s + 11, lump: 0.02 }),
    flat: lump(new THREE.CapsuleGeometry(0.26, 1.7, 6, 12).rotateZ(Math.PI / 2), '#5b1a22', { seed: s + 12, lump: 0.02 }),
    o: lump(new THREE.TorusGeometry(0.55, 0.3, 10, 20), '#5b1a22', { seed: s + 13, lump: 0.02 }),
    grin: (() => {
      const m = lump(new THREE.SphereGeometry(1.5, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.6, 0.45), '#3a0e16', { seed: s + 14, lump: 0.02 });
      m.add(put(lump(new THREE.BoxGeometry(2.3, 0.45, 0.4, 6, 2, 2), '#fbf6ea', { seed: s + 15, lump: 0.02 }), 0, -0.2, 0.55));
      return m;
    })(),
  };
  for (const [k, m] of Object.entries(mouths)) { m.position.set(0, -1.75, 2.85); m.rotation.x = -0.18; head.add(m); m.visible = k === 'smile'; }
  // hair
  const hr = rng(seed + 20);
  if (style === 0) for (let i = 0; i < 7; i++) head.add(put(lump(new THREE.SphereGeometry(1.2 + hr() * 0.5, 16, 12), hair, { seed: s + 20 + i, lump: 0.08 }), -2.4 + i * 0.8, 2.6 + Math.sin(i) * 0.3, -0.6 + hr()));
  else if (style === 1) head.add(put(lump(new THREE.SphereGeometry(3.4, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), hair, { seed: s + 27, lump: 0.12 }), 0, 0.3, -0.15));
  else head.add(put(lump(new THREE.TorusGeometry(2.2, 0.9, 12, 24).rotateX(Math.PI / 2), hair, { seed: s + 28, lump: 0.1 }), 0, 2.4, -0.3));
  // the laptop, held at the chest; its screen lights their face
  const laptop = new THREE.Group(); laptop.position.set(0, 6.7, 3.9); g.add(laptop);
  const shell = new THREE.MeshStandardMaterial({ color: '#3a3b46', roughness: 0.45, metalness: 0.2 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(7, 0.35, 4.6), shell); base.castShadow = base.receiveShadow = true; laptop.add(base);
  // hinged at the FAR edge and tipped back a little, so the screen faces them
  // and the camera sees the lid's back, with its sticker
  const lidG = new THREE.Group(); lidG.position.set(0, 0.15, 2.2); lidG.rotation.x = 0.62; laptop.add(lidG);
  const lidM = new THREE.Mesh(new THREE.BoxGeometry(7, 3.8, 0.3), shell); lidM.position.set(0, 1.9, 0); lidM.castShadow = true; lidG.add(lidM);
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(6.3, 3.2), new THREE.MeshBasicMaterial({ color: '#8fe6ff' }));
  screen.rotation.y = Math.PI; screen.position.set(0, 1.9, -0.16); lidG.add(screen);
  const sticker = put(lump(new THREE.CylinderGeometry(1.1, 1.1, 0.25, 24).rotateX(Math.PI / 2), '#ff4f8b', { seed: s + 33, lump: 0.03 }), 0, 2.0, 0.2); lidG.add(sticker);
  const glow = new THREE.PointLight('#8fe6ff', 30, 16, 2); glow.position.set(0, 3.2, -2.5); lidG.add(glow);
  // arms from the shoulders to the laptop's corners
  const arms = [-1, 1].map((sx) => {
    const curve = new THREE.CatmullRomCurve3([V(sx * 3.0, 8.7, 0.3), V(sx * 3.9, 6.9, 1.8), V(sx * 3.2, 6.6, 3.9)]);
    const arm = lump(new THREE.TubeGeometry(curve, 16, 0.8, 12), sweater, { seed: s + 30, lump: 0.06, mottle: 0.05 });
    g.add(arm);
    g.add(put(lump(new THREE.SphereGeometry(0.85, 16, 12).scale(1, 0.8, 1.1), skin, { seed: s + 31, lump: 0.05 }), sx * 3.2, 6.6, 4.1));
    return arm;
  });
  // a coffee cup, parked unless someone sips
  const cup = new THREE.Group(); cup.visible = false; g.add(cup);
  cup.add(lump(new THREE.CylinderGeometry(0.95, 0.75, 2.3, 20), '#fbf3e4', { seed: s + 40, lump: 0.04 }));
  cup.add(put(lump(new THREE.CylinderGeometry(0.99, 0.99, 0.6, 20), '#e2573e', { seed: s + 41, lump: 0.02 }), 0, 0.2, 0));

  const pose = ({ look = 0, lookY = 0, blink = 0, mouth = 'smile', yaw = 0, tilt = 0, lean = 0, brow = 0, sip = 0 } = {}) => {
    head.rotation.set(-0.06 + lookY * 0.2, yaw, tilt);
    body.rotation.z = lean * 0.06;
    for (const e of eyes) {
      e.pupil.position.set(look * 0.62, 0.05 + lookY * 0.45, Math.sqrt(Math.max(0.2, 0.85 - look * look * 0.38)));
      e.lid.rotation.x = -0.55 + blink * 2.05;
    }
    brows.forEach((b, i) => { b.position.y = 2.35 + brow * 0.45; b.rotation.z = (i ? -1 : 1) * brow * 0.25; });
    for (const [k, m] of Object.entries(mouths)) m.visible = k === mouth;
    cup.visible = sip > 0;
    if (sip > 0) { const k = Math.sin(Math.min(1, sip) * Math.PI); cup.position.set(2.6, 9.3 + k * 1.6, 4.2 - k * 0.6); cup.rotation.z = k * 0.4; }
  };
  pose();
  g.userData = { pose, head, screen, glow };
  return g;
}

/** a brain in a glass jar, with a lid; glow 0..1 lights the brain */
export function brainJar({ lid = '#f2b23a', seed = 1 } = {}) {
  const g = new THREE.Group();
  const prof = [[0, 0], [4.2, 0], [4.6, 0.5], [4.6, 9.2], [4.2, 9.8], [3.6, 10.1], [3.6, 10.6]].map(([x, y]) => new THREE.Vector2(x, y));
  const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), glassMat());
  glass.material.side = THREE.DoubleSide;
  g.add(glass);
  const brain = lump(new THREE.SphereGeometry(3.2, 96, 72).scale(1, 0.82, 1.1), '#ff8fb8', { seed: seed * 7, lump: 0.3, freq: 0.3, ridges: 1.9, boil: 0.04, marble: '#e2507f', mottle: 0.06, fissure: true });
  brain.position.set(0, 4.2, 0); g.add(brain);
  // the fluid it sits in
  const fluid = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 6.8, 40), new THREE.MeshPhysicalMaterial({ color: '#bfe9ff', transmission: 0.9, roughness: 0.15, thickness: 2, transparent: true, opacity: 0.55 }));
  fluid.position.y = 3.6; g.add(fluid);
  const cap = put(lump(new THREE.CylinderGeometry(4.3, 4.3, 1.5, 40), lid, { seed: seed * 7 + 1, lump: 0.08 }), 0, 11.1, 0);
  g.add(cap);
  g.userData = { brain };
  return g;
}

/** a hanging card price tag with its string; returns the group and a redraw hook */
export function priceTag(text, { color = '#fff8ea', ink = '#1f1d33' } = {}) {
  const g = new THREE.Group();
  const draw = (c, w, h, stamp) => {
    c.fillStyle = color; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(0,0,0,.06)'; for (let i = 0; i < 400; i++) c.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    c.fillStyle = ink; let fs = h * 0.42; do { c.font = `${Math.round(fs)}px "Archivo Black"`; fs *= 0.94; } while (c.measureText(text).width > w * 0.86); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, w / 2, h * 0.58);
    c.fillStyle = '#333'; c.beginPath(); c.arc(w / 2, h * 0.14, h * 0.05, 0, Math.PI * 2); c.fill();
    if (stamp) {
      c.save(); c.translate(w / 2, h * 0.58); c.rotate(-0.2); c.globalAlpha = 0.88;
      c.strokeStyle = '#d7263d'; c.lineWidth = h * 0.05; c.strokeRect(-w * 0.4, -h * 0.28, w * 0.8, h * 0.56);
      c.fillStyle = '#d7263d'; c.font = `${Math.round(h * 0.4)}px Anton`; c.fillText(stamp, 0, h * 0.03);
      c.restore();
    }
  };
  const mat = printMat(512, 280, (c, w, h) => draw(c, w, h, null));
  const card = new THREE.Mesh(new THREE.BoxGeometry(6.4, 3.5, 0.12), [cardMat(color), cardMat(color), cardMat(color), cardMat(color), mat, cardMat(color)]);
  card.castShadow = true; card.receiveShadow = true;
  card.position.y = -3.4;
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6), new THREE.MeshStandardMaterial({ color: '#5a4a3a', roughness: 1 }));
  string.position.y = -0.8;
  g.add(card, string);
  g.userData = { stamp: (s) => mat.userData.redraw((c, w, h) => draw(c, w, h, s)) };
  return g;
}

/** the shelf: a wooden board on two brackets */
export function shelf(w = 64) {
  const g = new THREE.Group();
  const board = new THREE.Mesh(new THREE.BoxGeometry(w, 1.6, 12), woodMat()); board.castShadow = board.receiveShadow = true; g.add(board);
  for (const x of [-w * 0.38, w * 0.38]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.4, 5, 7), woodMat()); b.position.set(x, -3.3, -2.4); b.castShadow = true; g.add(b);
  }
  return g;
}

/** a back wall of striped wallpaper (card) and a wooden floor */
export function room({ wall = '#f3d3ad', stripe = '#eac295', floor = true, w = 140, h = 110 } = {}) {
  const g = new THREE.Group();
  const paper = printMat(1024, 1024, (c, W, H) => {
    c.fillStyle = wall; c.fillRect(0, 0, W, H);
    c.fillStyle = stripe; for (let x = 0; x < W; x += 64) c.fillRect(x, 0, 30, H);
    c.fillStyle = 'rgba(255,255,255,.18)'; for (let x = 12; x < W; x += 64) c.fillRect(x, 0, 4, H);
  }, { rough: 0.92 });
  paper.map.wrapS = paper.map.wrapT = THREE.RepeatWrapping; paper.map.repeat.set(w / 40, h / 40);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), paper); back.position.set(0, h / 2 - 2, -12); back.receiveShadow = true; g.add(back);
  if (floor) {
    const wm = woodMat(); const f = new THREE.Mesh(new THREE.PlaneGeometry(w, 90), wm);
    f.material = f.material.clone(); f.material.map = wm.map.clone(); f.material.map.repeat.set(3, 6); f.material.map.needsUpdate = true;
    f.rotation.x = -Math.PI / 2; f.position.set(0, 0, 30); f.receiveShadow = true; g.add(f);
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(w, 3, 1.2), cardMat('#fbf3e4')); skirt.position.set(0, 1.5, -11.4); skirt.receiveShadow = skirt.castShadow = true; g.add(skirt);
  }
  return g;
}

/** a door in a frame, hinged on its left; `open` 0..1 swings it toward camera */
export function exitDoor() {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(18, 34, 2), cardMat('#4a4766')); frame.position.set(0, 17, -11); g.add(frame);
  // daylight outside: a glowing card and a light that spills through
  // the daylight sits just proud of the frame's face, so an open door shows it
  const out = new THREE.Mesh(new THREE.PlaneGeometry(14.5, 31), new THREE.MeshBasicMaterial({ color: '#fff4d6' })); out.position.set(0, 15.5, -9.95); g.add(out);
  const spill = new THREE.SpotLight('#fff1c8', 0, 140, 0.7, 0.8, 1.2); spill.position.set(0, 28, -9.5); spill.target.position.set(-10, 0, 35); spill.castShadow = true;
  spill.shadow.mapSize.set(1024, 1024); spill.shadow.radius = 8;
  g.add(spill, spill.target);
  const hinge = new THREE.Group(); hinge.position.set(-7.25, 0.2, -9.3); g.add(hinge);
  const door = new THREE.Mesh(new THREE.BoxGeometry(14.5, 31, 0.9), new THREE.MeshStandardMaterial({ color: '#e8574a', roughness: 0.75, normalMap: null }));
  door.position.set(7.25, 15.5, 0); door.castShadow = door.receiveShadow = true; hinge.add(door);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.7, 16, 12), metalMat('#e7c46a', 0.3)); knob.position.set(12.6, 15, 0.8); hinge.add(knob);
  // the sign, glowing green
  const sign = new THREE.Mesh(new THREE.BoxGeometry(10, 3.4, 0.8), printMat(512, 174, (c, w, h) => {
    c.fillStyle = '#1f9a4c'; c.fillRect(0, 0, w, h); c.fillStyle = '#eafff1'; c.font = `${h * 0.72}px Anton`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('EXIT', w / 2, h * 0.54);
  }));
  sign.material.emissive = new THREE.Color('#ffffff'); sign.material.emissiveMap = sign.material.map; sign.material.emissiveIntensity = 0.7;
  sign.position.set(0, 36.5, -10.6); g.add(sign);
  g.userData = { set: (open) => { hinge.rotation.y = -open * 1.7; spill.intensity = open * 1400; } };
  g.userData.set(0);
  return g;
}

/** clay coins: a stack of n pressed discs */
export function coinStack(n, { color = '#f2b53a', seed = 1 } = {}) {
  const g = new THREE.Group(), r = rng(seed);
  for (let i = 0; i < n; i++) {
    const c = lump(new THREE.CylinderGeometry(3.4, 3.4, 0.9, 40), color, { seed: seed * 100 + i, lump: 0.06, mottle: 0.04, boil: 0.012 });
    c.position.set((r() - 0.5) * 0.5, 0.45 + i * 0.95, (r() - 0.5) * 0.5); c.rotation.y = r() * 3; g.add(c);
    const rim = lump(new THREE.TorusGeometry(3.1, 0.22, 8, 36).rotateX(Math.PI / 2), '#c98d1e', { seed: seed * 100 + i + 50, lump: 0.02 });
    rim.position.copy(c.position).y += 0.47; g.add(rim);
  }
  return g;
}

/** the big rubber stamp, gripped in a clay hand at the end of a suited arm */
export function stampArm() {
  const g = new THREE.Group();
  const block = new THREE.Mesh(new THREE.BoxGeometry(9, 3.4, 5.5), woodMat()); block.position.y = 2.6; block.castShadow = true; g.add(block);
  const rubber = put(lump(new THREE.BoxGeometry(8.4, 0.9, 5, 8, 2, 6), '#d7263d', { seed: 70, lump: 0.05 }), 0, 0.45, 0); g.add(rubber);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 4.5, 16), woodMat()); neck.position.y = 6.4; neck.castShadow = true; g.add(neck);
  const knob = put(lump(new THREE.SphereGeometry(2.3, 24, 16).scale(1, 0.8, 1), '#8a5433', { seed: 71, lump: 0.08 }), 0, 9.3, 0); g.add(knob);
  const hand = put(lump(new THREE.SphereGeometry(2.4, 24, 16).scale(1.15, 0.85, 1), '#f1c3a1', { seed: 72, lump: 0.1 }), 0, 10.6, 0.4); g.add(hand);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 60, 20), new THREE.MeshStandardMaterial({ color: '#23233a', roughness: 0.85 }));
  arm.position.y = 41; arm.castShadow = true; g.add(arm);
  const cuff = put(lump(new THREE.CylinderGeometry(2.7, 2.7, 1.6, 20), '#fbf3e4', { seed: 73, lump: 0.05 }), 0, 12.2, 0); g.add(cuff);
  return g;
}

/** a padlock in clay and metal; `shut` 0..1 */
export function padlock() {
  const g = new THREE.Group();
  g.add(lump(new THREE.BoxGeometry(6, 5, 2.4, 8, 8, 4), '#f2b53a', { seed: 80, lump: 0.12, freq: 0.4 }));
  const hole = put(lump(new THREE.CylinderGeometry(0.6, 0.6, 0.5, 16).rotateX(Math.PI / 2), '#231b1b', { seed: 81, lump: 0.02 }), 0, 0.2, 1.25); g.add(hole);
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.55, 12, 24, Math.PI), metalMat()); shackle.castShadow = true; g.add(shackle);
  g.userData = { set: (shut) => { shackle.position.y = 2.5 + (1 - shut) * 1.8; } };
  g.userData.set(1);
  return g;
}

/** chain links along a curve, grown to fraction k (set by `grow`) */
export function chain(points, { links = 26 } = {}) {
  const g = new THREE.Group(), curve = new THREE.CatmullRomCurve3(points), m = metalMat('#aab2bf', 0.35);
  const geo = new THREE.TorusGeometry(0.75, 0.22, 8, 16).scale(1, 1.6, 1);
  const list = [];
  for (let i = 0; i < links; i++) {
    const u = i / (links - 1), p = curve.getPointAt(u), t = curve.getTangentAt(u);
    const l = new THREE.Mesh(geo, m); l.position.copy(p);
    l.quaternion.setFromUnitVectors(V(0, 1, 0), t); l.rotateY(i % 2 ? Math.PI / 2 : 0);
    l.castShadow = true; g.add(l); list.push(l);
  }
  g.userData = { grow: (k) => list.forEach((l, i) => { l.visible = i < k * links; }) };
  return g;
}

/** a party balloon: glossy rubber, not clay */
export function balloon(color = '#ff5a4f') {
  const g = new THREE.Group();
  const skin = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 36).scale(0.92, 1, 0.92), new THREE.MeshPhysicalMaterial({ color, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.3 }));
  skin.castShadow = true; g.add(skin);
  const knot = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.2, 12), skin.material); knot.position.y = -1.05; knot.rotation.x = Math.PI; g.add(knot);
  return g;
}

/** a felt sunburst: alternate wedges, for a reveal backdrop */
export function sunburst(a, b, n = 20, r = 200) {
  const g = new THREE.Group();
  for (let i = 0; i < n; i++) {
    const w = new THREE.Mesh(new THREE.CircleGeometry(r, 2, (i / n) * Math.PI * 2, Math.PI * 2 / n), feltMat(i % 2 ? a : b));
    w.position.z = (i % 2) * 0.3; w.receiveShadow = true; g.add(w);
  }
  return g;
}

export { clayText };

// ── set pieces ────────────────────────────────────────────────────────────
import { MASTER, SHAPES } from '../../../toko/js/master.js';

/** Toko: the traced original face, extruded in white clay on a magenta clay disc */
export function tokoBadge({ r = 10, ground = '#f0027f', ink = '#ffffff' } = {}) {
  const g = new THREE.Group();
  g.add(lump(new THREE.CylinderGeometry(r, r, r * 0.34, 72, 4).rotateX(Math.PI / 2), ground, { seed: 90, lump: r * 0.02, freq: 0.3, mottle: 0.04 }));
  const face = new THREE.Group(); face.position.z = r * 0.17; g.add(face);
  const S = (r * 2 * 0.72) / 700;
  const parts = {};
  for (const k of SHAPES) {
    const p = MASTER[k], shape = new THREE.Shape();
    for (let i = 0; i < p.length; i += 2) { const x = (p[i] - 350) * S, y = -(p[i + 1] - 350) * S; i ? shape.lineTo(x, y) : shape.moveTo(x, y); }
    const geo = new THREE.ExtrudeGeometry(shape, { depth: r * 0.05, bevelEnabled: true, bevelThickness: r * 0.06, bevelSize: r * 0.035, bevelSegments: 5, curveSegments: 4 });
    const m = lump(geo, ink, { seed: 91 + SHAPES.indexOf(k), lump: r * 0.006, freq: 0.6, boil: r * 0.002, mottle: 0.02 });
    face.add(m); parts[k] = m;
  }
  // blink: squash the eyes toward their feet (the master's own pivot)
  const eyeFoot = -(250 - 350) * S;
  g.userData = { blink: (k) => { for (const e of [parts.eyeL, parts.eyeR]) { e.scale.y = 1 - k * 0.85; e.position.y = (1 - e.scale.y) * eyeFoot * 0.35; } } };
  return g;
}

/** a striped felt awning with a scalloped edge */
export function awning(w = 90, n = 9) {
  const g = new THREE.Group(), sw = w / n;
  for (let i = 0; i < n; i++) {
    const m = feltMat(i % 2 ? '#fbf3e4' : '#ff6b5b');
    const slab = new THREE.Mesh(new THREE.BoxGeometry(sw, 0.5, 16), m);
    slab.position.set(-w / 2 + sw * (i + 0.5), 0, 8); slab.rotation.x = 0.35; slab.castShadow = slab.receiveShadow = true; g.add(slab);
    // the scallop hangs DOWN from the slab's front edge: the lower half of a disc
    const half = new THREE.Shape(); half.absarc(0, 0, sw / 2, Math.PI, Math.PI * 2, false); half.closePath();
    const scallop = new THREE.Mesh(new THREE.ExtrudeGeometry(half, { depth: 0.5, bevelEnabled: false }), m);
    scallop.position.set(-w / 2 + sw * (i + 0.5), -2.75, 15.6); scallop.rotation.x = 0.35; scallop.castShadow = true; g.add(scallop);
  }
  return g;
}

/** felt bunting on a string between two points, sagging */
export function bunting(x0, x1, y, z, n = 11) {
  const g = new THREE.Group(), cols = ['#f0027f', '#ffd166', '#3fc6a4', '#5ab8ff'];
  const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push(V(x0 + (x1 - x0) * u, y - Math.sin(u * Math.PI) * 5, z)); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.08, 6), new THREE.MeshStandardMaterial({ color: '#5a4a3a', roughness: 1 })));
  const flags = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, sh = new THREE.Shape(); sh.moveTo(-2, 0); sh.lineTo(2, 0); sh.lineTo(0, -4.4); sh.closePath();
    const f = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.2, bevelEnabled: false }), feltMat(cols[i % 4]));
    f.position.set(x0 + (x1 - x0) * u, y - Math.sin(u * Math.PI) * 5, z); f.castShadow = true; g.add(f); flags.push(f);
  }
  g.userData = { sway: (t) => flags.forEach((f, i) => { f.rotation.x = Math.sin(t * 2.2 + i) * 0.12; }) };
  return g;
}

/** a felt banner with printed lettering */
export function banner(w, h, draw) {
  const m = printMat(1024, Math.round(1024 * h / w), draw, { rough: 0.95 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.5), [feltMat('#c62f2f'), feltMat('#c62f2f'), feltMat('#c62f2f'), feltMat('#c62f2f'), m, feltMat('#c62f2f')]);
  m.normalMap = feltNormal(); m.normalScale = new THREE.Vector2(0.5, 0.5);
  b.castShadow = b.receiveShadow = true;
  return b;
}

/** cotton-wool cloud: a cluster of fuzzy white balls */
export function cloud(seed = 1, s = 1) {
  const g = new THREE.Group(), r = rng(seed), m = feltMat('#ffffff');
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry((2.2 + r() * 1.6) * s, 20, 14), m);
    b.position.set((i - 3) * 2.1 * s, Math.sin(i * 1.3) * 1.2 * s + (i > 1 && i < 5 ? 1.4 * s : 0), r() * s); b.castShadow = true; g.add(b);
  }
  return g;
}

/** a clay pie chart: a disc cut to fraction k, and the rest in another clay */
export function clayPie(k, { a = '#3fc6a4', b = '#fbf3e4', r = 9, h = 3 } = {}) {
  const g = new THREE.Group();
  const cut = Math.PI * 2 * k;
  if (k > 0.01) g.add(lump(new THREE.CylinderGeometry(r, r, h, 64, 3, false, 0, cut), a, { seed: 60, lump: 0.1, mottle: 0.05 }));
  if (k < 0.99) { const rest = lump(new THREE.CylinderGeometry(r * 0.98, r * 0.98, h * 0.94, 48, 3, false, cut + 0.04, Math.PI * 2 - cut - 0.08), b, { seed: 61, lump: 0.1, mottle: 0.04 }); rest.position.set(Math.sin(cut / 2 + Math.PI) * 0.8, 0, Math.cos(cut / 2 + Math.PI) * 0.8); g.add(rest); }
  return g;
}

/** a tumbleweed: a ball of dry clay twigs */
export function tumbleweed(seed = 5) {
  const g = new THREE.Group(), r = rng(seed);
  for (let i = 0; i < 16; i++) {
    const a = r() * Math.PI * 2, b = r() * Math.PI, rad = 3 + r() * 1.5;
    const t = new THREE.TorusGeometry(rad, 0.16, 5, 24, 1.5 + r() * 2.5);
    const m = lump(t, '#b08850', { seed: seed * 10 + i, lump: 0.05, boil: 0.02 });
    m.rotation.set(a, b, r() * 3); g.add(m);
  }
  return g;
}

/** a toothpick flag with a printed card, for labelling things on a table */
export function flag(w, h, draw) {
  const g = new THREE.Group();
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, h + 8, 8), new THREE.MeshStandardMaterial({ color: '#e8cf9c', roughness: 0.8 }));
  stick.position.y = (h + 8) / 2; stick.castShadow = true; g.add(stick);
  const m = printMat(768, Math.round(768 * h / w), draw);
  const card = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.15), [cardMat('#fff8ea'), cardMat('#fff8ea'), cardMat('#fff8ea'), cardMat('#fff8ea'), m, cardMat('#fff8ea')]);
  card.position.set(w / 2 + 0.15, h / 2 + 8, 0); card.castShadow = card.receiveShadow = true; g.add(card);
  g.userData = { redraw: (fn) => m.userData.redraw(fn) };
  return g;
}
