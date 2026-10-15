// SOMEBODY DOES THE DISHES props: the robot's head (a white egg, a black visor,
// one camera eye), the operator's VR headset and ring controllers, the plate, the
// dishwasher with its drop-down door and rack, the paper price tag, the wall
// clock, the operator's monitor (painted: what the robot's eye sees), and the
// night city outside his window. Puppet scale, cm.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { sausage, ball, lathe, lumpy, mesh, rng } from './sculpt.js';
import { canvas, tex } from './city.js';
import { printedCard } from './props.js';
import { drawMasterBadge } from './master.js';

// ------------------------------------------------------------------ the robot's head
/** origin at the head's centre; the face (visor, eye) looks along +z */
export function robotHead(M) {
  const g = new THREE.Group();
  mesh(lumpy(ball(4.2, 0.96, 1.08, 1.0), 0.04, 0.5, 901), M.shell, { parent: g });
  // the visor: a glossy black cap over the front
  const vis = new THREE.SphereGeometry(4.25, 48, 32, Math.PI / 2 - 0.95, 1.9, 0.95, 1.25);   // a window centred on +z
  vis.scale(0.97, 1.09, 1.03);
  mesh(lumpy(vis, 0.01, 0.5, 902), M.visor, { parent: g, cast: false });
  // the one camera eye: chrome ring, black glass, a mint iris that can light
  const eye = new THREE.Group(); eye.position.set(0, 0.35, 4.25); g.add(eye);
  mesh(new THREE.TorusGeometry(0.95, 0.22, 12, 40), M.chrome, { parent: eye, cast: false });
  mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.7, 32).rotateX(Math.PI / 2), M.visor, { pos: [0, 0, -0.15], parent: eye, cast: false });
  mesh(ball(0.72, 1, 1, 0.45, 32), M.lens, { pos: [0, 0, 0.18], parent: eye, cast: false });
  const iris = mesh(new THREE.TorusGeometry(0.42, 0.09, 8, 32), M.iris, { pos: [0, 0, 0.45], parent: eye, cast: false });
  mesh(ball(0.12, 1, 1, 1, 10), M.glint, { pos: [0.25, 0.3, 0.55], parent: eye, cast: false });
  // ear pods with a mint ring
  for (const s of [-1, 1]) {
    mesh(lumpy(new THREE.CylinderGeometry(1.15, 1.2, 0.7, 28).rotateZ(Math.PI / 2), 0.02, 1, 905 + s), M.shell, { pos: [s * 4.0, 0, -0.2], parent: g });
    mesh(new THREE.TorusGeometry(0.8, 0.13, 8, 28).rotateY(Math.PI / 2), M.mint, { pos: [s * 4.38, 0, -0.2], parent: g, cast: false });
  }
  g.userData.eye = eye; g.userData.iris = iris;
  return g;
}

// ------------------------------------------------------------------ the operator's headset and controllers
/** origin at the head's centre; the headset sits over the front (+z) and straps round the back */
export function vrHeadset(M, headR = 4.5) {
  const g = new THREE.Group();
  mesh(lumpy(new RoundedBoxGeometry(8.4, 4.6, 4.2, 4, 1.5), 0.03, 0.5, 920), M.vr, { pos: [0, 0.3, headR * 0.86 + 0.8], parent: g });
  mesh(lumpy(new RoundedBoxGeometry(7.6, 3.6, 0.4, 3, 1.2), 0.01, 0.5, 921), M.vrFace, { pos: [0, 0.3, headR * 0.86 + 2.95], parent: g, cast: false });
  mesh(new RoundedBoxGeometry(4.8, 0.32, 0.2, 2, 0.12), M.vrLed, { pos: [0, -0.9, headR * 0.86 + 3.2], parent: g, cast: false });
  // the strap round the back of the head, and the one over the top
  mesh(lumpy(new THREE.TorusGeometry(headR * 0.98, 0.42, 10, 48, Math.PI * 1.15).rotateX(Math.PI / 2).rotateY(Math.PI * 0.92), 0.02, 1, 922), M.vrStrap, { pos: [0, 0.4, -0.2], parent: g });
  mesh(lumpy(new THREE.TorusGeometry(headR * 0.98, 0.38, 10, 40, Math.PI * 0.9).rotateY(Math.PI / 2).rotateX(-Math.PI * 0.05), 0.02, 1, 923), M.vrStrap, { pos: [0, 0.2, -0.6], parent: g });
  return g;
}
export function controller(M) {
  const g = new THREE.Group();   // origin at the grip
  mesh(lumpy(new THREE.CapsuleGeometry(0.62, 2.2, 4, 12), 0.02, 1, 930), M.vr, { parent: g });
  mesh(lumpy(new THREE.TorusGeometry(1.25, 0.26, 10, 32), 0.02, 1, 931), M.vr, { pos: [0, 2.1, 0.5], rot: [0.9, 0, 0], parent: g });
  mesh(new THREE.TorusGeometry(1.25, 0.08, 6, 32), M.vrLed, { pos: [0, 2.1, 0.5], rot: [0.9, 0, 0], scale: 1.02, parent: g, cast: false });
  return g;
}

// ------------------------------------------------------------------ the plate
export function plate(M) {
  const g = new THREE.Group();   // origin at the plate's centre; its face toward +z
  mesh(lumpy(lathe([[0.01, -0.25], [2.4, -0.25], [3.6, 0.0], [4.1, 0.35], [4.15, 0.5], [3.9, 0.42], [3.4, 0.12], [2.4, 0.0], [0.01, 0.0]], 48), 0.02, 0.8, 940), M.crock, { rot: [Math.PI / 2, 0, 0], parent: g });
  mesh(new THREE.TorusGeometry(3.75, 0.13, 8, 48), M.mint, { pos: [0, 0, 0.36], parent: g, cast: false });
  return g;
}

// ------------------------------------------------------------------ the dishwasher
/** a built-in unit: the carcass (dark tub), a front door hinged at its foot, a rack on runners. Origin: the front-bottom-centre. */
export function dishwasher(M, { w = 14.6, h = 20, d = 14 } = {}) {
  const g = new THREE.Group();
  // the tub: a dark box open at the front
  const tub = new THREE.Group(); g.add(tub);
  mesh(new THREE.BoxGeometry(w - 0.6, 0.4, d), M.tub, { pos: [0, 1.7, -d / 2], parent: tub });
  mesh(new THREE.BoxGeometry(w - 0.6, 0.4, d), M.tub, { pos: [0, h - 1.4, -d / 2], parent: tub });
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.4, h - 3, d), M.tub, { pos: [s * (w / 2 - 0.5), h / 2, -d / 2], parent: tub });
  mesh(new THREE.BoxGeometry(w - 0.6, h - 3, 0.4), M.tubBack, { pos: [0, h / 2, -d + 0.2], parent: tub });
  // the door: hinge at y = 1.5 on the front face; rotation.x = +φ swings it down toward +z
  const door = new THREE.Group(); door.position.set(0, 1.5, 0.3); g.add(door);
  mesh(lumpy(new RoundedBoxGeometry(w - 0.3, h - 2.2, 1.2, 3, 0.35), 0.02, 0.4, 950), M.panel, { pos: [0, (h - 2.2) / 2, 0.2], parent: door });
  mesh(new RoundedBoxGeometry(w - 1.6, h - 3.6, 0.3, 2, 0.2), M.tub, { pos: [0, (h - 2.2) / 2, -0.45], parent: door, cast: false });
  mesh(lumpy(sausage([[-w * 0.36, h - 4.4, 1.0], [-w * 0.36, h - 4.4, 1.6], [w * 0.36, h - 4.4, 1.6], [w * 0.36, h - 4.4, 1.0]], [0.28, 0.28, 0.28, 0.28], { seg: 10, steps: 30 }), 0.01, 1, 951), M.chrome, { parent: door });
  mesh(new RoundedBoxGeometry(3.4, 0.5, 0.2, 2, 0.2), M.led, { pos: [w * 0.25, h - 3.2, 0.85], parent: door, cast: false });
  // the lower rack: wire baskets, it rides out on the door when open
  const rack = new THREE.Group(); g.add(rack);
  const rw = w - 2.2, rd = d - 1.6, wireR = 0.12;
  const bars = [];
  for (let i = 0; i <= 8; i++) { const x = -rw / 2 + i * rw / 8; bars.push([[x, 0, 0], [x, 0, -rd]]); }
  for (let j = 0; j <= 6; j++) { const z = -j * rd / 6; bars.push([[-rw / 2, 0, z], [rw / 2, 0, z]]); }
  for (const [a, b] of [[[-rw / 2, 0, 0], [-rw / 2, 3.2, 0]], [[rw / 2, 0, 0], [rw / 2, 3.2, 0]], [[-rw / 2, 0, -rd], [-rw / 2, 3.2, -rd]], [[rw / 2, 0, -rd], [rw / 2, 3.2, -rd]]]) bars.push([a, b]);
  bars.push([[-rw / 2, 3.2, 0], [rw / 2, 3.2, 0]], [[-rw / 2, 3.2, -rd], [rw / 2, 3.2, -rd]], [[-rw / 2, 3.2, 0], [-rw / 2, 3.2, -rd]], [[rw / 2, 3.2, 0], [rw / 2, 3.2, -rd]]);
  // tines for plates
  for (let i = 1; i < 8; i++) for (let j = 1; j < 6; j++) if (j % 2) bars.push([[-rw / 2 + i * rw / 8, 0, -j * rd / 6], [-rw / 2 + i * rw / 8, 2.4, -j * rd / 6 + 0.3]]);
  for (const [a, b] of bars) mesh(sausage([a, b], [wireR, wireR], { seg: 6, steps: 2, capSteps: 1 }), M.wire, { parent: rack, cast: false });
  g.userData = { door, rack, w, h, d, rd };
  return g;
}

// ------------------------------------------------------------------ the price tag
export function priceTag(M, text = '$20,000', { w = 8.6, h = 4.2 } = {}) {
  const clip = 1.0, holeY = h / 2 - 0.62;
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2 - clip); s.lineTo(w / 2 - clip, h / 2);
  s.lineTo(-w / 2 + clip, h / 2); s.lineTo(-w / 2, h / 2 - clip); s.closePath();
  const hole = new THREE.Path(); hole.absarc(0, holeY, 0.3, 0, Math.PI * 2, true); s.holes.push(hole);
  const card = printedCard(s, w, h, 0.09, (g, W, H) => {
    g.fillStyle = '#efe2c2'; g.fillRect(0, 0, W, H);
    const r = rng(5); g.fillStyle = 'rgba(120,90,50,0.10)';
    for (let i = 0; i < 300; i++) g.fillRect(r() * W, r() * H, 0.05 + r() * 0.08, 0.05 + r() * 0.08);
    g.strokeStyle = 'rgba(150,110,60,0.35)'; g.lineWidth = 0.05; g.strokeRect(0.28, 0.28, W - 0.56, H - 0.56);
    g.fillStyle = '#1c1612'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = '900 2.05px "Inter"'; const tw = g.measureText(text).width; g.save(); g.translate(W / 2, H * 0.84); g.scale(Math.min(1, (W - 0.9) / tw), 1); g.fillText(text, 0, 0); g.restore();
  }, { px: 110, back: '#d9c9a3', bend: 0.16 });
  const g = new THREE.Group();
  card.position.set(0, -h / 2 - 0.15, 0); g.add(card);
  mesh(new THREE.TorusGeometry(0.42, 0.1, 8, 24), M.ring, { pos: [0, -0.77, 0.06], parent: g, cast: false });
  g.userData.card = card;
  return g;
}

// ------------------------------------------------------------------ the clock
/** a minimal white wall clock; returns { group, set(minutes) } — minutes since 12:00 */
export function wallClock(M, R = 5.2) {
  const g = new THREE.Group();
  mesh(lumpy(new THREE.CylinderGeometry(R, R, 1.1, 48).rotateX(Math.PI / 2), 0.02, 0.6, 960), M.shellW, { parent: g });
  mesh(new THREE.TorusGeometry(R - 0.25, 0.25, 8, 48), M.mint, { pos: [0, 0, 0.55], parent: g, cast: false });
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; mesh(new RoundedBoxGeometry(i % 3 ? 0.22 : 0.36, i % 3 ? 0.7 : 1.1, 0.1, 1, 0.08), M.ink, { pos: [Math.sin(a) * (R - 1.1), Math.cos(a) * (R - 1.1), 0.6], rot: [0, 0, -a], parent: g, cast: false }); }
  const hh = new THREE.Group(); hh.position.z = 0.7; g.add(hh);
  mesh(new RoundedBoxGeometry(0.42, 2.9, 0.12, 1, 0.1), M.ink, { pos: [0, 1.15, 0], parent: hh, cast: false });
  const mh = new THREE.Group(); mh.position.z = 0.8; g.add(mh);
  mesh(new RoundedBoxGeometry(0.3, 4.1, 0.12, 1, 0.1), M.mint2, { pos: [0, 1.7, 0], parent: mh, cast: false });
  mesh(ball(0.32, 1, 1, 0.4, 12), M.ink, { pos: [0, 0, 0.9], parent: g, cast: false });
  return { group: g, set(min) { mh.rotation.z = -min / 60 * Math.PI * 2; hh.rotation.z = -min / 720 * Math.PI * 2; } };
}

// ------------------------------------------------------------------ the operator's monitor
/** paint what the robot's eye sees. st: { mode: 'plate' | 'toko', wave, t } — no words */
export function paintMonitor(g, W, H, st) {
  // the kitchen through a wide lens: a white wall, mint cupboards, a bright window
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#f4f8f6'); gr.addColorStop(1, '#dfe9e5');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  if (st.mode === 'plate') {
    g.fillStyle = '#8fd3c1'; g.fillRect(0, H * 0.62, W, H * 0.38);
    g.fillStyle = '#ffffff'; g.fillRect(0, H * 0.58, W, H * 0.05);
    g.fillStyle = '#bfe8ff'; g.fillRect(W * 0.06, H * 0.08, W * 0.24, H * 0.32);
    // the open dishwasher's rack, lower right
    g.strokeStyle = '#9aa3a6'; g.lineWidth = W * 0.006;
    for (let i = 0; i < 9; i++) { g.beginPath(); g.moveTo(W * (0.58 + i * 0.045), H * 0.78); g.lineTo(W * (0.55 + i * 0.05), H * 0.98); g.stroke(); }
    // two white robot hands holding a plate
    const px = W * 0.5 + (st.dx || 0) * W, py = H * 0.52;
    g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(px, py, W * 0.17, H * 0.21, 0, 0, 7); g.fill();
    g.strokeStyle = '#8fd3c1'; g.lineWidth = W * 0.01; g.beginPath(); g.ellipse(px, py, W * 0.15, H * 0.185, 0, 0, 7); g.stroke();
    g.fillStyle = '#e8ecea';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(px + s * W * 0.19, py + H * 0.08, W * 0.07, H * 0.12, s * 0.4, 0, 7); g.fill(); g.fillRect(px + s * W * 0.19 - W * 0.05 + (s > 0 ? 0 : 0), py + H * 0.12, W * 0.1, H * 0.4); }
  } else {
    g.fillStyle = '#8fd3c1'; g.fillRect(0, H * 0.78, W, H * 0.22);
    g.fillStyle = '#bfe8ff'; g.fillRect(W * 0.72, H * 0.06, W * 0.22, H * 0.3);
    // Toko, close, looking in: hood, the mask, a waving magenta glove
    const cx = W * 0.46, cy = H * 0.5;
    g.fillStyle = '#44546e'; g.beginPath(); g.ellipse(cx, cy + H * 0.62, W * 0.34, H * 0.42, 0, 0, 7); g.fill();
    g.fillStyle = '#8a8278'; g.beginPath(); g.arc(cx, cy - H * 0.02, H * 0.36, 0, 7); g.fill();
    drawMasterBadge(g, cx, cy + H * 0.02, H * 0.3, { ground: '#e2068e', ink: '#fbf4e6' });
    const a = Math.sin(st.wave || 0) * 0.5;
    const hx = W * 0.78 + Math.sin(st.wave || 0) * W * 0.05, hy = H * 0.36;
    g.save(); g.translate(hx, hy); g.rotate(a); g.fillStyle = '#cc1574';
    g.beginPath(); g.ellipse(0, 0, W * 0.07, H * 0.13, 0, 0, 7); g.fill();
    g.beginPath(); g.ellipse(-W * 0.06, H * 0.03, W * 0.025, H * 0.06, -0.6, 0, 7); g.fill();
    g.restore();
    g.fillStyle = '#44546e'; g.beginPath(); g.moveTo(W * 0.66, H); g.quadraticCurveTo(W * 0.72, H * 0.6, hx - W * 0.02, hy + H * 0.12); g.lineTo(hx + W * 0.05, hy + H * 0.16); g.quadraticCurveTo(W * 0.8, H * 0.65, W * 0.82, H); g.fill();
  }
  // the teleop overlay: corner brackets and a recording dot (no words)
  g.strokeStyle = 'rgba(40,140,120,0.9)'; g.lineWidth = W * 0.012;
  const m = W * 0.04, L = W * 0.08;
  for (const [x, y, sx, sy] of [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]]) { g.beginPath(); g.moveTo(x, y + sy * L); g.lineTo(x, y); g.lineTo(x + sx * L, y); g.stroke(); }
  g.fillStyle = '#e8463a'; g.beginPath(); g.arc(W - m * 2.2, m * 2.2, W * 0.018, 0, 7); g.fill();
  // scanlines: it is a screen
  g.fillStyle = 'rgba(0,30,25,0.05)'; for (let y = 0; y < H; y += 4) g.fillRect(0, y, W, 1.5);
}

/** the night outside the operator's window: navy sky, office towers with a few lit windows, a thin moon */
export function nightCity(w = 1024, h = 512) {
  const c = canvas(w, h), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#060a1c'); gr.addColorStop(0.6, '#121a3a'); gr.addColorStop(1, '#2a2846');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const r = rng(61);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(230,235,255,${0.3 + r() * 0.6})`; g.fillRect(r() * w, r() * h * 0.45, 1.5, 1.5); }
  // the moon
  g.fillStyle = '#f4f0d8'; g.beginPath(); g.arc(w * 0.78, h * 0.18, h * 0.06, 0, 7); g.fill();
  g.fillStyle = '#0a1024'; g.beginPath(); g.arc(w * 0.78 + h * 0.025, h * 0.18 - h * 0.012, h * 0.055, 0, 7); g.fill();
  // towers
  let x = -10;
  while (x < w) {
    const bw = 50 + r() * 90, top = h * (0.28 + r() * 0.3);
    g.fillStyle = ['#0b1126', '#0e1530', '#10172f'][(r() * 3) | 0]; g.fillRect(x, top, bw, h - top);
    for (let yy = top + 8; yy < h - 6; yy += 13) for (let xx = x + 6; xx < x + bw - 8; xx += 11) {
      if (r() < 0.13) { g.fillStyle = r() < 0.7 ? '#ffd27a' : '#bfe4ff'; g.fillRect(xx, yy, 6, 7); }
      else { g.fillStyle = 'rgba(40,55,90,0.5)'; g.fillRect(xx, yy, 6, 7); }
    }
    x += bw + 4 + r() * 10;
  }
  return c;
}
