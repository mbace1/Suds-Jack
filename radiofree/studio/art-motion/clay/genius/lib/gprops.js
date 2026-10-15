// GENIUS props: the poo on a lollipop stick (with its two wire-borne flies and
// stink lines), the piggy bank that comes apart in shell pieces, coins, a
// hammer, the pop-up trophy on its spring, the speech-bubble placard, confetti,
// and the chat phone. Everything is clay or card at puppet scale (cm).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { sausage, ball, lathe, lumpy, mesh, rng } from './sculpt.js';
import { canvas, tex } from './city.js';
import { printedCard } from './props.js';

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// ------------------------------------------------------------------ the poo on a stick
/** origin at the bottom of the stick; the stick runs up +y; the poo sits on top */
export function pooStick(M, { stick = 11 } = {}) {
  const g = new THREE.Group();
  mesh(lumpy(sausage([[0, 0, 0], [0, stick * 0.5, 0], [0, stick, 0]], [0.3, 0.3, 0.3], { seg: 12, steps: 16, capSteps: 3 }), 0.02, 1.5, 801), M.stick, { parent: g });
  // the soft-serve coil: two and a half turns, tapering, ending in a curled tip
  const pts = [], rad = [];
  const N = 26;
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = t * 2.45 * Math.PI * 2 + 0.4;
    const r = 2.25 * (1 - t * 0.78);
    pts.push([Math.cos(a) * r, stick + 0.9 + t * 3.9, Math.sin(a) * r]);
    rad.push(1.05 - t * 0.55);
  }
  // the tip: up and over
  const last = pts[pts.length - 1];
  pts.push([last[0] * 0.4, last[1] + 1.0, last[2] * 0.4], [last[0] * -0.3 + 0.35, last[1] + 1.55, 0.2]);
  rad.push(0.38, 0.2);
  const coil = mesh(lumpy(sausage(pts, rad, { seg: 22, steps: 140, up: [0, 1, 0] }), 0.07, 0.9, 802), M.poo, { parent: g });
  // a little bottom disc so it sits on the stick
  mesh(lumpy(ball(2.0, 1, 0.42, 1), 0.06, 0.9, 803), M.poo, { pos: [0, stick + 0.65, 0], parent: g });
  // the ribbon bow under it: it is a PRODUCT
  const bow = new THREE.Group(); bow.position.set(0, stick - 0.4, 0.15); g.add(bow);
  mesh(lumpy(ball(0.45, 1, 1, 1), 0.02, 1, 804), M.ribbon, { parent: bow });
  for (const s of [-1, 1]) {
    mesh(lumpy(ball(0.95, 1.2, 0.62, 0.42), 0.04, 1, 805 + s), M.ribbon, { pos: [s * 0.95, 0.15, 0], rot: [0, 0, s * 0.35], parent: bow });
    mesh(lumpy(sausage([[s * 0.2, -0.1, 0], [s * 0.6, -1.0, 0.1], [s * 0.85, -1.9, 0]], [0.3, 0.28, 0.24], { up: [0, 0, 1], seg: 10, steps: 12 }), 0.03, 1, 807 + s), M.ribbon, { parent: bow });
  }
  g.userData.top = stick + 6.4;   // the poo's tip
  g.userData.mid = stick + 2.8;   // the poo's middle
  return g;
}

/** a fly on a wire: body, head, two wings; the wire is re-rolled by the caller */
export function fly(M) {
  const g = new THREE.Group();
  mesh(lumpy(ball(0.42, 1, 0.85, 1.35), 0.02, 2, 820), M.fly, { parent: g });
  mesh(ball(0.3, 1, 1, 1, 16), M.fly, { pos: [0, 0.05, 0.55], parent: g });
  for (const s of [-1, 1]) mesh(ball(0.14, 1, 1, 1, 10), M.flyEye, { pos: [s * 0.17, 0.12, 0.72], parent: g, cast: false });
  g.userData.wings = [-1, 1].map(s => {
    const w = new THREE.Group(); w.position.set(s * 0.18, 0.3, 0.05); g.add(w);
    mesh(ball(0.55, 0.62, 0.08, 1.0, 16).translate(s * 0.42, 0, -0.25), M.wing, { parent: w, cast: false });
    return w;
  });
  return g;
}

// ------------------------------------------------------------------ the piggy bank
/** a pink pig as twelve shell pieces (and the bits stuck to them); each piece is a group pivoting at its centre */
export function piggy(M) {
  const g = new THREE.Group();
  const R = 3.9, SX = 1.28, SY = 1.0, SZ = 0.98;   // body ellipsoid: long along x
  const pieces = [];
  const PH = 4, TH = 3;
  for (let ti = 0; ti < TH; ti++) for (let pi = 0; pi < PH; pi++) {
    const phi0 = pi / PH * Math.PI * 2 + 0.3, dphi = Math.PI * 2 / PH;
    const th0 = [0, 0.95, 2.05][ti], dth = [0.95, 1.1, Math.PI - 2.05][ti];
    let geo = new THREE.SphereGeometry(R, 14, 8, phi0, dphi, th0, dth);
    geo.scale(SX, SY, SZ);
    geo = lumpy(geo, 0.1, 0.45, 830);   // keyed on position: the seams stay closed
    const c = new THREE.Vector3(); { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) c.add(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i))); c.divideScalar(p.count); }
    geo.translate(-c.x, -c.y, -c.z);
    const piv = new THREE.Group(); piv.position.copy(c); g.add(piv);
    mesh(geo, M.pig, { parent: piv });
    piv.userData.home = c.clone(); piv.userData.dir = c.clone().normalize();
    pieces.push(piv);
  }
  // what sticks to which piece: find the piece whose centre is nearest a point on the body
  const nearest = (p) => { let b = null, d = 1e9; for (const q of pieces) { const e = q.userData.home.distanceTo(p); if (e < d) { d = e; b = q; } } return b; };
  const stick = (obj, world) => { const q = nearest(world); obj.position.sub(q.userData.home); q.add(obj); };
  // snout (+x is the front)
  { const s = new THREE.Group(); s.position.set(R * SX + 0.2, -0.2, 0); mesh(lumpy(new THREE.CylinderGeometry(1.35, 1.5, 1.3, 24).rotateZ(Math.PI / 2), 0.05, 1, 840), M.pig, { parent: s }); for (const z of [-0.45, 0.45]) mesh(ball(0.27, 0.5, 1.2, 1, 12), M.pigDark, { pos: [0.66, 0, z], parent: s, cast: false }); stick(s, s.position.clone().setX(R * SX - 0.6)); }
  // eyes
  for (const z of [-1.5, 1.5]) { const e = mesh(ball(0.36, 1, 1, 1, 16), M.eye, { pos: [R * SX * 0.82, 1.45, z * 0.95], cast: false }); stick(e, e.position.clone()); const gl = mesh(ball(0.1, 1, 1, 1, 8), M.glint, { pos: [R * SX * 0.82 + 0.25, 1.62, z * 0.95 + 0.1], cast: false }); stick(gl, e.position.clone()); }
  // ears
  for (const z of [-1, 1]) { const e = mesh(lumpy(new THREE.ConeGeometry(1.0, 1.9, 14).scale(1, 1, 0.45), 0.04, 1, 842 + z), M.pig, { pos: [R * SX * 0.55, R * 0.88, z * 1.75], rot: [z * 0.35, 0, -0.55] }); stick(e, new THREE.Vector3(R * SX * 0.55, R * 0.8, z * 1.6)); }
  // legs
  for (const [x, z] of [[2.6, 1.8], [2.6, -1.8], [-2.6, 1.8], [-2.6, -1.8]]) { const l = mesh(lumpy(new THREE.CylinderGeometry(0.85, 0.8, 1.9, 16), 0.04, 1, 844 + x + z), M.pig, { pos: [x, -R + 0.15, z] }); stick(l, new THREE.Vector3(x, -R * 0.75, z)); }
  // tail
  { const pts = []; for (let i = 0; i <= 10; i++) { const a = i / 10 * Math.PI * 3.2; pts.push([-R * SX - 0.2 - i * 0.12, 0.8 + Math.sin(a) * 0.55, Math.cos(a) * 0.55]); } const t = mesh(lumpy(sausage(pts, [0.26, 0.22, 0.18], { seg: 10, steps: 30 }), 0.02, 1, 850), M.pig); stick(t, new THREE.Vector3(-R * SX + 0.3, 0.6, 0)); }
  // the coin slot on top
  { const s = mesh(new RoundedBoxGeometry(2.6, 0.5, 0.45, 2, 0.18), M.pigDark, { pos: [-0.2, R * SY - 0.05, 0], cast: false }); stick(s, new THREE.Vector3(-0.2, R - 0.5, 0)); }
  g.userData.pieces = pieces;
  g.userData.R = R;
  g.userData.base = R - 0.15 + 0.95;   // centre height above the table (legs)
  return g;
}

// ------------------------------------------------------------------ coins, hammer, trophy
export function coinGeo() { return new THREE.CylinderGeometry(0.85, 0.85, 0.22, 24); }

export function hammer(M) {
  const g = new THREE.Group();   // origin at the grip; handle along +y
  mesh(lumpy(sausage([[0, -2.5, 0], [0, 3, 0], [0, 8.6, 0]], [0.5, 0.46, 0.42], { seg: 14, steps: 20 }), 0.03, 1, 860), M.handle, { parent: g });
  mesh(lumpy(new RoundedBoxGeometry(4.6, 1.75, 1.75, 3, 0.35), 0.04, 0.8, 861), M.steel, { pos: [0.4, 9.2, 0], parent: g });
  g.userData.head = new THREE.Vector3(0.4, 9.2, 0);
  return g;
}

/** a tiny gold cup on a black plinth; origin at the bottom of the plinth */
export function trophy(M) {
  const g = new THREE.Group();
  mesh(new RoundedBoxGeometry(1.7, 0.7, 1.7, 2, 0.12), M.plinth, { pos: [0, 0.35, 0], parent: g });
  mesh(lathe([[0.01, 0], [0.75, 0], [0.62, 0.22], [0.2, 0.4], [0.16, 1.1], [0.35, 1.35], [0.95, 1.7], [1.1, 2.6], [1.0, 2.7], [0.01, 2.62]], 32), M.gold, { pos: [0, 0.7, 0], parent: g });
  for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.42, 0.11, 8, 20, Math.PI * 1.2).rotateZ(s > 0 ? -Math.PI * 0.6 : Math.PI * 0.4), M.gold, { pos: [s * 1.12, 2.85, 0], parent: g });
  mesh(ball(0.14, 1, 1, 1, 10), M.glint, { pos: [-0.5, 3.0, 0.75], parent: g, cast: false });
  return g;
}

// ------------------------------------------------------------------ the speech-bubble placard
/** a white card speech bubble on a clear rod; NO text — a gold star, a heart and sparkles. Origin at the tail's tip. */
export function bubbleCard(M, { w = 6.4, h = 3.5 } = {}) {
  const r = 1.1, tailX = w * 0.28;
  const s = new THREE.Shape();
  const x0 = -w / 2, y0 = 0.9, x1 = w / 2, y1 = y0 + h;
  s.moveTo(x0 + r, y0); s.lineTo(tailX - 0.15, y0); s.lineTo(tailX - 0.7, 0); s.lineTo(tailX + 0.75, y0);
  s.lineTo(x1 - r, y0); s.quadraticCurveTo(x1, y0, x1, y0 + r); s.lineTo(x1, y1 - r); s.quadraticCurveTo(x1, y1, x1 - r, y1);
  s.lineTo(x0 + r, y1); s.quadraticCurveTo(x0, y1, x0, y1 - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const card = printedCard(s, w, y1 + 0.2, 0.16, (g, W, H) => {
    // the shape's coords run x ∈ [−w/2, w/2], y ∈ [0, y1]; printedCard maps (0.5, 0.5) offset, so paint centred
    g.fillStyle = '#fbf8f1'; g.fillRect(0, 0, W, H);
    const rr = rng(21); g.fillStyle = 'rgba(120,100,70,0.07)';
    for (let i = 0; i < 300; i++) g.fillRect(rr() * W, rr() * H, 0.04 + rr() * 0.06, 0.04 + rr() * 0.06);
    // canvas y runs down; the bubble's body is the upper part of the card
    const cy = H / 2 - (y0 + h / 2 - (y1 + 0.2) / 2);
    const star = (cx, cy, R, rot, col) => { g.save(); g.translate(cx, cy); g.rotate(rot); g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? R * 0.45 : R; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fillStyle = col; g.fill(); g.lineWidth = R * 0.09; g.strokeStyle = 'rgba(90,60,0,0.35)'; g.stroke(); g.restore(); };
    const heart = (cx, cy, R, col) => { g.save(); g.translate(cx, cy); g.beginPath(); g.moveTo(0, R * 0.95); g.bezierCurveTo(-R * 1.5, -R * 0.1, -R * 0.75, -R * 1.25, 0, -R * 0.45); g.bezierCurveTo(R * 0.75, -R * 1.25, R * 1.5, -R * 0.1, 0, R * 0.95); g.fillStyle = col; g.fill(); g.restore(); };
    const sparkle = (cx, cy, R, col) => { g.save(); g.translate(cx, cy); g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = i % 2 ? R * 0.22 : R; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fillStyle = col; g.fill(); g.restore(); };
    const midX = W / 2;
    const k = w / 9.4;
    star(midX - 2.75 * k, cy + 0.05 * k, 1.55 * k, -0.12, '#f2b01e');
    heart(midX + 0.05 * k, cy + 0.2 * k, 1.35 * k, '#e2068e');
    star(midX + 2.75 * k, cy + 0.05 * k, 1.55 * k, 0.14, '#f2b01e');
    sparkle(midX - 1.35 * k, cy - 1.45 * k, 0.55 * k, '#4fb3a9'); sparkle(midX + 1.5 * k, cy + 1.6 * k, 0.5 * k, '#4fb3a9'); sparkle(midX + 4.0 * k, cy - 1.6 * k, 0.42 * k, '#e2068e'); sparkle(midX - 4.0 * k, cy + 1.5 * k, 0.42 * k, '#e2068e');
  }, { px: 120, back: '#e9e2d2', rough: 0.85 });
  card.userData.tex.offset.set(0.5, 0);
  card.userData.tex.repeat.set(1 / w, 1 / (y1 + 0.2));
  const g = new THREE.Group(); g.add(card);
  card.material[0].emissive = new THREE.Color('#fbf8f1'); card.material[0].emissiveMap = card.userData.tex; card.material[0].emissiveIntensity = 0.28;
  g.userData.card = card; g.userData.h = y1;
  return g;
}

// ------------------------------------------------------------------ the chat phone
/** the phone's screen: a chat. No words anywhere — bars stand for text; the sent photo is the poo on its stick. */
export function paintChat(g, W, H, st) {
  g.fillStyle = '#f6f2ea'; g.fillRect(0, 0, W, H);
  // header
  g.fillStyle = '#dcefea'; g.fillRect(0, 0, W, H * 0.12);
  g.fillStyle = '#f2c94c'; g.beginPath(); g.arc(W * 0.14, H * 0.065, W * 0.075, 0, 7); g.fill();
  g.fillStyle = '#fff'; spark(g, W * 0.14, H * 0.065, W * 0.05);
  g.fillStyle = '#5c6b68'; rbar(g, W * 0.27, H * 0.05, W * 0.34, H * 0.025);
  // the sent photo, right side, in a teal bubble
  const bx = W * 0.3, by = H * 0.17, bw = W * 0.62, bh = H * 0.33;
  g.fillStyle = '#4fb3a9'; rr(g, bx, by, bw, bh, W * 0.06); g.fill();
  g.fillStyle = '#fff6df'; rr(g, bx + W * 0.04, by + W * 0.04, bw - W * 0.08, bh - W * 0.16, W * 0.03); g.fill();
  // the photo: a poo on its stick, bow and all
  const px = bx + bw / 2, py = by + bh * 0.52, s = W * 0.06;
  g.fillStyle = '#f0ece2'; g.fillRect(px - s * 0.15, py, s * 0.3, s * 2.4);
  g.fillStyle = '#d6332d'; g.beginPath(); g.ellipse(px - s * 0.45, py + s * 0.1, s * 0.45, s * 0.25, 0.3, 0, 7); g.ellipse(px + s * 0.45, py + s * 0.1, s * 0.45, s * 0.25, -0.3, 0, 7); g.fill();
  g.fillStyle = '#6e4426';
  for (const [dy, rw] of [[-0.3, 1.5], [-1.0, 1.15], [-1.6, 0.8]]) { g.beginPath(); g.ellipse(px, py + dy * s, rw * s, 0.5 * s, 0, 0, 7); g.fill(); }
  g.beginPath(); g.moveTo(px - 0.3 * s, py - 1.9 * s); g.quadraticCurveTo(px, py - 2.7 * s, px + 0.4 * s, py - 2.2 * s); g.lineTo(px, py - 1.8 * s); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)'; rbar(g, bx + W * 0.06, by + bh - W * 0.09, bw * 0.5, H * 0.018);
  // typing dots, or the reply
  const ry = H * 0.56;
  if (st.reply <= 0 && st.typing >= 0) {
    g.fillStyle = '#e4ded3'; rr(g, W * 0.07, ry, W * 0.34, H * 0.075, W * 0.05); g.fill();
    for (let i = 0; i < 3; i++) { const b = Math.max(0, Math.sin((st.typing * 2.2 - i * 0.22) * Math.PI * 2)); g.fillStyle = '#8b8478'; g.beginPath(); g.arc(W * (0.15 + i * 0.09), ry + H * 0.038 - b * H * 0.012, W * 0.03, 0, 7); g.fill(); }
  } else if (st.reply > 0) {
    const k = Math.min(1, st.reply * 1.6);
    g.save(); g.globalAlpha = k;
    g.fillStyle = '#ffffff'; rr(g, W * 0.07, ry, W * 0.7, H * 0.17, W * 0.05); g.fill();
    g.fillStyle = '#c9c2b4'; rbar(g, W * 0.12, ry + H * 0.03, W * 0.56, H * 0.02); rbar(g, W * 0.12, ry + H * 0.065, W * 0.48, H * 0.02);
    g.fillStyle = '#f2b01e'; star5(g, W * 0.18, ry + H * 0.125, W * 0.05); star5(g, W * 0.34, ry + H * 0.125, W * 0.05);
    g.fillStyle = '#e2068e'; g.beginPath(); g.arc(W * 0.26, ry + H * 0.125, W * 0.035, 0, 7); g.fill();
    g.restore();
  }
  // the input bar
  g.fillStyle = '#ebe6dc'; rr(g, W * 0.05, H * 0.9, W * 0.9, H * 0.065, W * 0.05); g.fill();
  if (st.flash > 0) { const gr = g.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, W); gr.addColorStop(0, `rgba(255,214,90,${0.85 * st.flash})`); gr.addColorStop(1, `rgba(255,170,40,${0.25 * st.flash})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function rbar(g, x, y, w, h) { rr(g, x, y, w, h, h / 2); g.fill(); }
function spark(g, x, y, R) { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = i % 2 ? R * 0.25 : R; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fill(); }
function star5(g, x, y, R) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, q = i % 2 ? R * 0.45 : R; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fill(); }

export class ChatPhone {
  constructor(M, { w = 3.3, h = 6.8, d = 0.42, px = 180 } = {}) {
    this.group = new THREE.Group();   // origin at the phone's centre; screen faces +z
    mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(w, h) * 0.13), M.phone, { parent: this.group });
    const sw = w * 0.9, sh = h * 0.94;
    this.c = canvas(Math.round(sw * px), Math.round(sh * px)); this.g = this.c.getContext('2d');
    this.t = tex(this.c); this.t.anisotropy = 8;
    this.mat = new THREE.MeshBasicMaterial({ map: this.t, toneMapped: false });
    const s = new THREE.Shape(), r = sw * 0.12, x0 = -sw / 2, y0 = -sh / 2;
    s.moveTo(x0 + r, y0); s.lineTo(x0 + sw - r, y0); s.quadraticCurveTo(x0 + sw, y0, x0 + sw, y0 + r); s.lineTo(x0 + sw, y0 + sh - r); s.quadraticCurveTo(x0 + sw, y0 + sh, x0 + sw - r, y0 + sh);
    s.lineTo(x0 + r, y0 + sh); s.quadraticCurveTo(x0, y0 + sh, x0, y0 + sh - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
    const sg = new THREE.ShapeGeometry(s, 8), uv = sg.attributes.uv, P = sg.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (P.getX(i) - x0) / sw, (P.getY(i) - y0) / sh);
    this.screen = mesh(sg, this.mat, { pos: [0, 0, d / 2 + 0.02], parent: this.group, cast: false, recv: false });
    // a camera bump on the back
    mesh(new RoundedBoxGeometry(1.2, 1.2, 0.2, 2, 0.25), M.phone, { pos: [-w * 0.22, h * 0.34, -d / 2 - 0.08], parent: this.group });
    mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 20).rotateX(Math.PI / 2), M.lens, { pos: [-w * 0.22 - 0.2, h * 0.34 + 0.2, -d / 2 - 0.2], parent: this.group, cast: false });
    this.w = w; this.h = h; this.d = d; this.key = '';
  }
  paint(st, bright = 1) {
    const key = JSON.stringify(st);
    if (key !== this.key) { this.key = key; paintChat(this.g, this.c.width, this.c.height, st); this.t.needsUpdate = true; }
    this.mat.color.setScalar(bright);
  }
}
