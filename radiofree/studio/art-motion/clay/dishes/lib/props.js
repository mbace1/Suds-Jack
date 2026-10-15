// The props: the home camera and the price tag hanging off it, the phones,
// the camera's card brackets and flag labels, and Toko's handwritten DOG tag.
// Text is painted into canvases (Inter is a system font here) and carried on
// flat card faces; the card bodies are the same matte surfaces as the set.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { sausage, ball, lathe, lumpy, mesh, rng } from './sculpt.js';
import { canvas, tex } from './city.js';

/** a card shape: rectangle with clipped top corners and a punched hole at the top centre */
function tagShape(w, h, clip = 0.9, holeR = 0.32, holeY = null) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, -h / 2); s.lineTo(w / 2, -h / 2); s.lineTo(w / 2, h / 2 - clip); s.lineTo(w / 2 - clip, h / 2);
  s.lineTo(-w / 2 + clip, h / 2); s.lineTo(-w / 2, h / 2 - clip); s.closePath();
  if (holeR > 0) { const p = new THREE.Path(); p.absarc(0, holeY ?? h / 2 - 0.75, holeR, 0, Math.PI * 2, true); s.holes.push(p); }
  return s;
}
/** a flat card with a printed face: extrude the shape, map the canvas across the shape's own coordinates */
export function printedCard(shape, w, h, depth, paint, { px = 64, rough = 0.92, color = '#ffffff', back = null, bend = 0 } = {}) {
  const c = canvas(Math.round(w * px), Math.round(h * px)), g = c.getContext('2d');
  g.scale(px, px); paint(g, w, h);
  const t = tex(c); t.repeat.set(1 / w, 1 / h); t.offset.set(0.5, 0.5);
  let geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
  geo.translate(0, 0, -depth / 2);
  if (bend) {   // a gentle curl across the card, keeping its UVs
    geo = geo.toNonIndexed();
    const P = geo.attributes.position;
    for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setZ(i, P.getZ(i) + bend * ((x / (w / 2)) ** 2 * 0.6 + (y / (h / 2)) * 0.25)); }
    geo.computeVertexNormals();
  }
  const face = new THREE.MeshStandardMaterial({ map: t, roughness: rough, color: new THREE.Color(color) });
  const edge = new THREE.MeshStandardMaterial({ color: new THREE.Color(back || '#d8cfb8'), roughness: 0.95 });
  // ExtrudeGeometry groups: 0 = caps (front/back), 1 = sides
  const m = new THREE.Mesh(geo, [face, edge]);
  m.castShadow = true; m.receiveShadow = true;
  m.userData.canvas = c; m.userData.tex = t;
  return m;
}

// ------------------------------------------------------------------ the home camera
export class HomeCam {
  constructor(M) {
    this.group = new THREE.Group();
    const L = (g, a = 0.04, f = 0.8, s = 1) => lumpy(g, a, f, s);
    mesh(L(lathe([[0.01, 0], [1.55, 0], [1.68, 0.18], [1.6, 0.45], [1.1, 0.62], [0.01, 0.66]], 40), 0.03, 0.9, 201), M.white, { parent: this.group });
    mesh(L(new THREE.CylinderGeometry(0.42, 0.5, 1.5, 16).translate(0, 1.3, 0), 0.02, 1, 202), M.white, { parent: this.group });
    this.yaw = new THREE.Group(); this.yaw.position.set(0, 2.15, 0); this.group.add(this.yaw);
    mesh(ball(0.62, 1, 1, 1, 20), M.white, { parent: this.yaw });
    this.pitch = new THREE.Group(); this.pitch.position.set(0, 0.55, 0); this.yaw.add(this.pitch);
    const pr = [[0.01, -1.5], [1.25, -1.5], [1.62, -1.25], [1.78, -0.7], [1.78, 0.55], [1.66, 0.95], [1.4, 1.12], [0.01, 1.12]];
    const body = lathe(pr, 48); body.rotateX(Math.PI / 2);   // axis along z, front at +z
    mesh(L(body, 0.03, 0.9, 203), M.white, { pos: [0, 1.25, 0], parent: this.pitch });
    mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.14, 40).rotateX(Math.PI / 2), M.black, { pos: [0, 1.25, 1.16], parent: this.pitch, cast: false });
    mesh(ball(0.6, 1, 1, 0.55, 28), M.lens, { pos: [0, 1.16, 1.22], parent: this.pitch, cast: false });
    mesh(new THREE.TorusGeometry(0.62, 0.07, 8, 32), M.lensRing, { pos: [0, 1.16, 1.24], parent: this.pitch, cast: false });
    mesh(ball(0.12, 1, 1, 1, 10), M.glint, { pos: [0.2, 1.38, 1.53], parent: this.pitch, cast: false });
    this.led = mesh(ball(0.17, 1, 1, 0.8, 14), M.led, { pos: [0.82, 2.0, 1.25], parent: this.pitch, cast: false });
    // the cable, trailing off the back
    mesh(sausage([[0, 0.25, -1.2], [-0.4, 0.15, -2.6], [-1.6, 0.12, -3.6], [-2.4, 0.12, -6]], [0.16, 0.16, 0.16, 0.16], { seg: 8, steps: 24, capSteps: 2 }), M.black, { parent: this.group, cast: false });
  }
  /** look: yaw (+ turns its lens toward +x), pitch (+ tips the lens down) */
  look(yaw, pitch) { this.yaw.rotation.y = yaw; this.pitch.rotation.x = pitch; }
  ledWorld(t = new THREE.Vector3()) { this.group.updateMatrixWorld(true); return this.led.getWorldPosition(t); }
  lensWorld(t = new THREE.Vector3()) { this.group.updateMatrixWorld(true); return this.pitch.localToWorld(t.set(0, 1.16, 1.5)); }
}

/** the price tag: a manila card, $20/MO, on a string from the camera's neck */
export function priceTag(M) {
  const w = 7.2, h = 3.9;
  const card = printedCard(tagShape(w, h, 1.0, 0.3, h / 2 - 0.62), w, h, 0.09, (g, W, H) => {
    g.fillStyle = '#efe2c2'; g.fillRect(0, 0, W, H);
    const r = rng(5); g.fillStyle = 'rgba(120,90,50,0.10)';
    for (let i = 0; i < 260; i++) g.fillRect(r() * W, r() * H, 0.05 + r() * 0.08, 0.05 + r() * 0.08);
    g.strokeStyle = 'rgba(150,110,60,0.35)'; g.lineWidth = 0.05; g.strokeRect(0.28, 0.28, W - 0.56, H - 0.56);
    g.fillStyle = '#1c1612'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.font = '900 2.0px "Inter"'; const tw = g.measureText('$20/MO').width; g.save(); g.translate(W / 2, H * 0.84); g.scale(Math.min(1, (W - 1.0) / tw), 1); g.fillText('$20/MO', 0, 0); g.restore();
  }, { px: 90, back: '#d9c9a3', bend: 0.18 });
  const g = new THREE.Group();
  card.position.set(0, -h / 2 - 0.15, 0); g.add(card);
  mesh(new THREE.TorusGeometry(0.42, 0.1, 8, 24), M.ring, { pos: [0, -0.77, 0.06], parent: g, cast: false });
  g.userData.card = card;
  return g;
}

// ------------------------------------------------------------------ phones
/** paint the phone's screen: the lock screen, and the brief card sliding up by k (0..1) */
export function paintScreen(g, W, H, k, buzz = 0) {
  const gr = g.createLinearGradient(0, 0, W * 0.3, H);
  gr.addColorStop(0, '#173238'); gr.addColorStop(0.55, '#1d2333'); gr.addColorStop(1, '#2b1a2c');
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  // a quiet wallpaper: a few soft blobs
  for (const [x, y, r, c] of [[0.2, 0.75, 0.5, 'rgba(60,140,130,0.18)'], [0.85, 0.35, 0.45, 'rgba(150,60,120,0.16)'], [0.5, 1.0, 0.6, 'rgba(200,120,60,0.10)']]) {
    const rg = g.createRadialGradient(x * W, y * H, 0, x * W, y * H, r * W); rg.addColorStop(0, c); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, W, H);
  }
  g.textAlign = 'center'; g.fillStyle = 'rgba(240,236,228,0.92)';
  g.font = `300 ${W * 0.235}px "Inter"`; g.fillText('18:42', W / 2, H * 0.205);
  // the card
  if (k > 0) {
    const cw = W * 0.9, ch = H * 0.31, cx = (W - cw) / 2;
    const y = H * 1.02 + (H * 0.33 - H * 1.02) * k;
    g.save(); g.globalAlpha = Math.min(1, k * 2.5);
    g.shadowColor = 'rgba(0,0,0,0.45)'; g.shadowBlur = W * 0.04; g.shadowOffsetY = W * 0.012;
    g.fillStyle = 'rgba(244,240,232,0.97)'; g.beginPath(); g.roundRect(cx, y, cw, ch, W * 0.06); g.fill();
    g.shadowColor = 'transparent';
    // the app's mark: a little house, ochre with a magenta door (not anyone's trade dress)
    const ix = cx + W * 0.09, iy = y + H * 0.048, s = W * 0.05;
    g.fillStyle = '#d9a02a'; g.beginPath(); g.moveTo(ix - s, iy); g.lineTo(ix, iy - s * 0.95); g.lineTo(ix + s, iy); g.lineTo(ix + s * 0.78, iy); g.lineTo(ix + s * 0.78, iy + s * 0.9); g.lineTo(ix - s * 0.78, iy + s * 0.9); g.lineTo(ix - s * 0.78, iy); g.closePath(); g.fill();
    g.fillStyle = '#d8167a'; g.fillRect(ix - s * 0.22, iy + s * 0.3, s * 0.44, s * 0.6);
    g.textAlign = 'left'; g.fillStyle = '#3c3a36';
    g.font = `700 ${W * 0.05}px "Inter"`; g.fillText('DOODLE HOME', ix + s * 1.6, iy + s * 0.55);
    g.textAlign = 'right'; g.fillStyle = '#7b776e'; g.font = `500 ${W * 0.047}px "Inter"`; g.fillText('18:42', cx + cw - W * 0.06, iy + s * 0.55);
    g.textAlign = 'left'; g.fillStyle = '#16140f'; g.font = `600 ${W * 0.074}px "Inter"`;
    const words = 'Unexpectedly, a deer briefly entered the family room.'.split(' '), lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > cw - W * 0.13 && line) { lines.push(line); line = w; } else line = t; }
    lines.push(line);
    lines.forEach((l, i) => g.fillText(l, cx + W * 0.065, y + H * 0.13 + i * H * 0.052));
    g.restore();
  }
  if (buzz > 0) { g.fillStyle = `rgba(255,255,255,${0.08 * buzz})`; g.fillRect(0, 0, W, H); }
}

/** the hero phone: big enough for a close-up, screen as an unlit canvas */
export class Phone {
  constructor(M, { w = 7.4, h = 15.6, d = 0.85, px = 140 } = {}) {
    this.group = new THREE.Group();
    mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(w, h) * 0.12), M.phone, { parent: this.group });
    const sw = w * 0.92, sh = h * 0.955;
    this.c = canvas(Math.round(sw * px), Math.round(sh * px)); this.g = this.c.getContext('2d');
    this.t = tex(this.c); this.t.anisotropy = 8;
    this.screenMat = new THREE.MeshBasicMaterial({ map: this.t, toneMapped: false });
    const geo = new RoundedBoxGeometry(sw, sh, 0.02, 2, Math.min(sw, sh) * 0.1);
    // a plane with rounded corners: use a shape so the UVs run 0..1 across it
    const s = new THREE.Shape(), r = Math.min(sw, sh) * 0.1, x0 = -sw / 2, y0 = -sh / 2;
    s.moveTo(x0 + r, y0); s.lineTo(x0 + sw - r, y0); s.quadraticCurveTo(x0 + sw, y0, x0 + sw, y0 + r); s.lineTo(x0 + sw, y0 + sh - r); s.quadraticCurveTo(x0 + sw, y0 + sh, x0 + sw - r, y0 + sh);
    s.lineTo(x0 + r, y0 + sh); s.quadraticCurveTo(x0, y0 + sh, x0, y0 + sh - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
    const sg = new THREE.ShapeGeometry(s, 8);
    const uv = sg.attributes.uv, P = sg.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (P.getX(i) - x0) / sw, (P.getY(i) - y0) / sh);
    geo.dispose();
    this.screen = mesh(sg, this.screenMat, { pos: [0, 0, d / 2 + 0.06], parent: this.group, cast: false, recv: false });
    this.w = w; this.h = h; this.k = -1; this.paint(0, 0, 1);
  }
  paint(k, buzz = 0, bright = 1) {
    const key = `${k.toFixed(3)}:${buzz.toFixed(2)}`;
    if (key !== this.k) { this.k = key; paintScreen(this.g, this.c.width, this.c.height, k, buzz); this.t.needsUpdate = true; }
    this.screenMat.color.setScalar(bright);
  }
}

/** the puppet-scale phone: a slab with a glowing face, no words */
export function smallPhone(M) {
  const g = new THREE.Group();
  mesh(new RoundedBoxGeometry(2.2, 4.4, 0.32, 3, 0.3), M.phone, { parent: g });
  g.userData.glow = mesh(new THREE.PlaneGeometry(1.95, 4.05), M.smallScreen, { pos: [0, 0, 0.17], parent: g, cast: false });
  return g;
}

// ------------------------------------------------------------------ the camera's labels
/** four card corners, set by setBox(w, h) */
export class Brackets {
  constructor(mat) {
    this.group = new THREE.Group();
    this.corners = [];
    const arm = (l, w) => new RoundedBoxGeometry(l, w, 0.28, 2, 0.1);
    for (const [sx, sy] of [[-1, 1], [1, 1], [1, -1], [-1, -1]]) {
      const c = new THREE.Group();
      const A = 3.4, Wd = 0.62;
      mesh(lumpy(arm(A, Wd), 0.02, 1, 210 + sx + sy * 3).translate(-sx * (A / 2 - Wd / 2), 0, 0), mat, { parent: c });
      mesh(lumpy(arm(Wd, A), 0.02, 1, 214 + sx + sy * 3).translate(0, -sy * (A / 2 - Wd / 2), 0), mat, { parent: c });
      c.userData.s = [sx, sy];
      this.group.add(c); this.corners.push(c);
    }
  }
  setBox(w, h) { for (const c of this.corners) { const [sx, sy] = c.userData.s; c.position.set(sx * w / 2, sy * h / 2, 0); } }
}

/** a flag label: a card with a word, on a short pin; origin at the foot of the pin */
export function flag(text, M, { w = null, h = 2.5, pole = 3.0, bg = '#e2452c', fg = '#fff3e0', side = 1 } = {}) {
  const g = new THREE.Group();
  mesh(sausage([[0, -0.6, 0], [0, pole * 0.5, 0], [0, pole + h, 0]], [0.1, 0.1, 0.1], { seg: 8, steps: 12, capSteps: 2 }), M.pin, { parent: g });
  mesh(ball(0.3, 1, 1, 1, 12), M.pinHead, { pos: [0, pole + h + 0.15, 0], parent: g, cast: false });
  const cw = w ?? (0.82 * h * text.length * 0.62 + 1.3);
  const s = new THREE.Shape(); s.moveTo(0, -h / 2); s.lineTo(cw, -h / 2); s.lineTo(cw, h / 2); s.lineTo(0, h / 2); s.closePath();
  const card = printedCard(s, cw, h, 0.14, (c, W, H) => {
    c.fillStyle = bg; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(0,0,0,0.10)'; c.fillRect(0, H * 0.86, W, H * 0.14);
    c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = `800 ${H * 0.62}px "Inter"`; c.save(); c.translate(W / 2, H * 0.53); c.scale(Math.min(1, (W - 0.9) / c.measureText(text).width), 1); c.fillText(text, 0, 0); c.restore();
  }, { px: 110, back: bg, rough: 0.8 });
  // the card's shape coords run 0..cw in x: shift its texture so 0 maps to the left edge
  card.userData.tex.offset.set(0, 0.5);
  card.material[0].emissive = new THREE.Color(bg); card.material[0].emissiveMap = card.userData.tex; card.material[0].emissiveIntensity = 0.32;
  card.position.set(side > 0 ? 0.12 : -0.12 - cw, pole + h / 2, 0);
  g.add(card);
  g.userData.card = card; g.userData.w = cw; g.userData.h = h; g.userData.pole = pole;
  return g;
}

/** Toko's own label: a manila tag, DOG in black marker, written by hand (strokes, not a font) */
export function dogTag(M) {
  const w = 5.6, h = 3.4;
  const card = printedCard(tagShape(w, h, 0.85, 0.28, h / 2 - 0.55), w, h, 0.08, (g, W, H) => {
    g.fillStyle = '#e8d6a8'; g.fillRect(0, 0, W, H);
    const r = rng(9); g.fillStyle = 'rgba(110,80,40,0.12)';
    for (let i = 0; i < 160; i++) g.fillRect(r() * W, r() * H, 0.04 + r() * 0.07, 0.04 + r() * 0.07);
    // marker strokes: D, O, G — a little uneven, the way a hand does it
    g.strokeStyle = '#141210'; g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = 0.36;
    const ox = 0.62, oy = 0.95, sc = 1.0;
    g.save(); g.translate(ox, oy); g.rotate(-0.04); g.scale(sc, sc);
    g.beginPath(); g.moveTo(0.1, 0.05); g.lineTo(0.05, 1.95);                                    // D
    g.moveTo(0.05, 0.08); g.bezierCurveTo(1.55, -0.05, 1.6, 2.0, 0.08, 1.92);
    g.moveTo(2.55, 0.0); g.bezierCurveTo(1.55, 0.05, 1.6, 2.05, 2.5, 1.98); g.bezierCurveTo(3.3, 1.95, 3.35, 0.0, 2.55, 0.0);   // O
    g.moveTo(4.65, 0.28); g.bezierCurveTo(4.45, -0.05, 3.55, -0.05, 3.55, 0.95); g.bezierCurveTo(3.55, 2.05, 4.5, 2.1, 4.7, 1.55); g.lineTo(4.72, 1.08); g.lineTo(4.18, 1.1);   // G
    g.stroke(); g.restore();
  }, { px: 110, back: '#cdb98a', bend: 0.12 });
  const g = new THREE.Group();
  card.position.set(0, -h / 2 - 0.1, 0); g.add(card);
  mesh(new THREE.TorusGeometry(0.4, 0.09, 8, 24), M.ring, { pos: [0, -0.65, 0.05], parent: g, cast: false });
  g.userData.card = card; g.userData.h = h;
  return g;
}
