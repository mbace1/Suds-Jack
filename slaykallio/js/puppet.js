// Cardboard puppets. A character is a painted 2D cutout — flat gouache fills
// inside a wobbly ink line, on paper — standing on a 3D cardboard wedge with
// a strip of tape across its feet. No image assets: the painting is done on a
// canvas from the `look` table in data.js, so a theme switch repaints the same
// figure in different clothes.
//
// The cutout is drawn IN PROFILE (the game is a side view) facing +x; enemies
// are mirrored by negative scale. When it dies it falls over in 3D — the
// whole group pivots about its feet on an axis tilted between the camera's x
// and z, so the flat shape foreshortens as it goes down and the taped base
// comes up with it.

import * as THREE from 'three';

const TW = 256, TH = 512;        // texture size; the figure fills ~70% of the height
export const PUPPET_H = 1.5;     // world height of a scale-1 figure

// ── the painter ──────────────────────────────────────────────────────────
function rngFrom(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const INK = '#1b1410';

function shade(hex, k) {
  const c = parseInt(hex.slice(1), 16);
  const ch = i => Math.max(0, Math.min(255, Math.round(((c >> (16 - i * 8)) & 255) * k)));
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
}

// a polygon with a hand's wobble along every edge
function wob(ctx, pts, fill, rnd, { stroke = INK, width = 4, amp = 2.2 } = {}) {
  ctx.beginPath();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    const segs = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 14));
    for (let k = 0; k < segs; k++) {
      const t = k / segs;
      const x = x0 + (x1 - x0) * t + (rnd() - 0.5) * amp;
      const y = y0 + (y1 - y0) * t + (rnd() - 0.5) * amp;
      if (i === 0 && k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.stroke(); }
}

function blob(ctx, cx, cy, rx, ry, fill, rnd, opts) {
  const pts = [];
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  wob(ctx, pts, fill, rnd, opts);
}

// a dry-brush highlight: a lighter stripe that does not reach the edges
function brush(ctx, x, y, w, h, color, rnd) {
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) ctx.fillRect(x + rnd() * w * 0.3, y + i * h / 3 + rnd() * 6, w * (0.5 + rnd() * 0.3), h / 3 - 6);
  ctx.restore();
}

function grain(ctx, rnd) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(rnd() * TW, rnd() * TH, 2, 2);
  }
  ctx.restore();
}

function person(ctx, look, rnd) {
  // proportions on a 256×512 sheet; feet at y=470, crown at ~y=110
  const cx = 128, foot = 470;
  const skin = look.skin, top = look.top, bottom = look.bottom, hair = look.hair;
  // back leg, front leg — profile, walking-stance
  wob(ctx, [[cx - 4, 330], [cx + 24, 330], [cx + 30, foot], [cx + 4, foot]], shade(bottom, 0.8), rnd);
  wob(ctx, [[cx - 26, 330], [cx + 2, 330], [cx - 6, foot], [cx - 32, foot]], bottom, rnd);
  // shoes
  if (look.shoes !== 'none') {
    wob(ctx, [[cx - 36, foot - 12], [cx - 4, foot - 12], [cx + 4, foot], [cx - 40, foot]], look.shoes, rnd);
    wob(ctx, [[cx + 2, foot - 12], [cx + 32, foot - 12], [cx + 42, foot], [cx - 2, foot]], look.shoes, rnd);
  }
  // torso: a trapezoid leaning forward (facing +x = right)
  wob(ctx, [[cx - 30, 210], [cx + 26, 205], [cx + 30, 335], [cx - 30, 335]], top, rnd);
  brush(ctx, cx - 22, 220, 44, 100, '#ffffff', rnd);
  // back arm hanging, front arm forward holding the prop
  wob(ctx, [[cx - 34, 215], [cx - 14, 215], [cx - 16, 300], [cx - 36, 300]], shade(top, 0.75), rnd);
  wob(ctx, [[cx + 8, 222], [cx + 30, 226], [cx + 66, 268], [cx + 52, 284]], top, rnd);
  blob(ctx, cx + 62, 280, 13, 13, skin, rnd);   // hand
  // neck + head in profile with a nose
  wob(ctx, [[cx - 6, 190], [cx + 14, 190], [cx + 12, 214], [cx - 8, 214]], shade(skin, 0.85), rnd);
  wob(ctx, [[cx - 30, 130], [cx + 18, 122], [cx + 40, 150], [cx + 46, 166], [cx + 36, 172], [cx + 30, 190], [cx - 20, 200], [cx - 34, 170]], skin, rnd);
  // eye + brow
  ctx.fillStyle = INK; ctx.fillRect(cx + 18, 150, 6, 7); ctx.fillRect(cx + 12, 140, 18, 3);
  // hair
  const hs = look.hairStyle;
  if (hs === 'bun') { wob(ctx, [[cx - 34, 128], [cx + 20, 118], [cx + 24, 134], [cx - 30, 150]], hair, rnd); blob(ctx, cx - 30, 128, 18, 16, hair, rnd); }
  if (hs === 'mohawk') { wob(ctx, [[cx - 22, 128], [cx - 10, 60], [cx + 4, 66], [cx + 14, 122]], look.accent, rnd); wob(ctx, [[cx - 34, 130], [cx + 22, 120], [cx + 18, 134], [cx - 30, 150]], hair, rnd); }
  if (hs === 'bob') wob(ctx, [[cx - 40, 128], [cx + 22, 116], [cx + 30, 140], [cx + 18, 132], [cx - 26, 190], [cx - 46, 176]], hair, rnd);
  if (hs === 'short') wob(ctx, [[cx - 34, 130], [cx + 22, 118], [cx + 26, 138], [cx - 32, 152]], hair, rnd);
  if (hs === 'quiff') { wob(ctx, [[cx - 34, 130], [cx + 22, 118], [cx + 30, 138], [cx - 32, 152]], hair, rnd); wob(ctx, [[cx - 10, 124], [cx + 20, 96], [cx + 42, 112], [cx + 26, 128]], hair, rnd); }
  // hats
  const hat = look.hat;
  if (hat === 'cap') { wob(ctx, [[cx - 36, 132], [cx + 22, 120], [cx + 26, 138], [cx - 34, 148]], look.top, rnd); wob(ctx, [[cx + 10, 128], [cx + 60, 132], [cx + 58, 142], [cx + 12, 140]], shade(look.top, 0.7), rnd); }
  if (hat === 'beret') wob(ctx, [[cx - 44, 132], [cx + 10, 108], [cx + 30, 126], [cx - 30, 146]], look.accent, rnd);
  if (hat === 'hood') wob(ctx, [[cx - 50, 140], [cx - 10, 96], [cx + 34, 118], [cx + 30, 134], [cx - 8, 122], [cx - 34, 150], [cx - 40, 210], [cx - 54, 200]], shade(look.top, 0.85), rnd);
  if (hat === 'feather') { wob(ctx, [[cx - 40, 134], [cx + 26, 116], [cx + 30, 130], [cx - 36, 146]], look.bottom, rnd); wob(ctx, [[cx - 20, 126], [cx - 44, 70], [cx - 32, 66], [cx - 4, 120]], look.accent, rnd); }
  if (hat === 'goggles') { blob(ctx, cx - 6, 120, 16, 12, look.accent, rnd); blob(ctx, cx + 22, 116, 16, 12, look.accent, rnd); }
  if (hat === 'helm') wob(ctx, [[cx - 40, 136], [cx - 26, 104], [cx + 22, 100], [cx + 40, 138], [cx + 38, 160], [cx + 28, 160], [cx + 26, 138], [cx - 30, 148]], look.top, rnd);
  if (hat === 'horns') { wob(ctx, [[cx - 30, 130], [cx - 50, 80], [cx - 18, 118]], '#e8e0d0', rnd); wob(ctx, [[cx + 14, 124], [cx + 26, 78], [cx + 30, 122]], '#e8e0d0', rnd); }
  // props, in the front hand
  const px = cx + 62, py = 280, acc = look.accent;
  switch (look.prop) {
    case 'cup': wob(ctx, [[px - 6, py - 30], [px + 22, py - 30], [px + 18, py - 2], [px - 2, py - 2]], '#f4f0e6', rnd); break;
    case 'flask': wob(ctx, [[px + 2, py - 40], [px + 12, py - 40], [px + 14, py - 22], [px + 26, py - 2], [px - 10, py - 2], [px, py - 22]], acc, rnd); break;
    case 'bass': wob(ctx, [[px - 60, py + 60], [px - 30, py + 40], [px + 40, py - 90], [px + 48, py - 82], [px - 14, py + 60], [px - 44, py + 74]], '#3a1a10', rnd); blob(ctx, px - 38, py + 54, 26, 20, acc, rnd); break;
    case 'lute': wob(ctx, [[px - 40, py + 50], [px + 40, py - 70], [px + 48, py - 62], [px - 20, py + 60]], '#6a3a1a', rnd); blob(ctx, px - 30, py + 50, 24, 20, '#c89a5a', rnd); break;
    case 'basket': wob(ctx, [[px - 16, py + 4], [px + 30, py + 4], [px + 24, py + 40], [px - 10, py + 40]], '#c89a5a', rnd); wob(ctx, [[px - 8, py + 4], [px + 2, py - 20], [px + 14, py - 20], [px + 22, py + 4]], null, rnd, { width: 5 }); break;
    case 'wrench': wob(ctx, [[px - 4, py - 44], [px + 8, py - 44], [px + 8, py + 6], [px - 4, py + 6]], '#9a9aa4', rnd); blob(ctx, px + 2, py - 46, 12, 10, '#9a9aa4', rnd); break;
    case 'shield': blob(ctx, px + 8, py + 8, 34, 42, acc, rnd, { width: 5 }); blob(ctx, px + 8, py + 8, 10, 12, look.top, rnd); break;
    case 'mic': wob(ctx, [[px - 2, py - 6], [px + 6, py - 6], [px + 16, py - 36], [px + 8, py - 38]], '#404048', rnd); blob(ctx, px + 14, py - 42, 11, 11, '#909098', rnd); break;
    case 'staff': wob(ctx, [[px - 4, py - 120], [px + 6, py - 120], [px + 10, py + 60], [px, py + 60]], '#5a3a1a', rnd); blob(ctx, px + 2, py - 130, 14, 14, acc, rnd); break;
    case 'clipboard': wob(ctx, [[px - 10, py - 40], [px + 30, py - 40], [px + 30, py + 10], [px - 10, py + 10]], '#e8e4d8', rnd); ctx.fillStyle = INK; ctx.fillRect(px - 2, py - 26, 24, 3); ctx.fillRect(px - 2, py - 16, 18, 3); break;
    case 'ledger': wob(ctx, [[px - 10, py - 40], [px + 30, py - 40], [px + 30, py + 10], [px - 10, py + 10]], '#5a2a1a', rnd); break;
    case 'ring': ctx.save(); ctx.strokeStyle = acc; ctx.lineWidth = 22; ctx.beginPath(); ctx.ellipse(cx, 300, 62, 30, 0, 0, Math.PI * 2); ctx.stroke(); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(cx, 300, 73, 41, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.ellipse(cx, 300, 51, 19, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); break;
    case 'earpiece': ctx.fillStyle = '#101010'; ctx.fillRect(cx - 24, 160, 6, 6); ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 21, 166); ctx.quadraticCurveTo(cx - 40, 190, cx - 30, 212); ctx.stroke(); break;
    default: break;
  }
}

function bird(ctx, look, rnd) {
  const cx = 128, foot = 470;
  // legs
  ctx.strokeStyle = look.beak; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - 14, 400); ctx.lineTo(cx - 20, foot); ctx.moveTo(cx + 14, 400); ctx.lineTo(cx + 20, foot); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - 34, foot); ctx.lineTo(cx - 6, foot); ctx.moveTo(cx + 6, foot); ctx.lineTo(cx + 36, foot); ctx.stroke();
  // body, tail, wing, head, beak
  blob(ctx, cx, 340, 74, 58, look.body, rnd);
  wob(ctx, [[cx - 60, 330], [cx - 120, 300], [cx - 116, 340], [cx - 70, 366]], shade(look.body, 0.8), rnd);
  wob(ctx, [[cx - 40, 316], [cx + 40, 300], [cx + 10, 352], [cx - 60, 356]], look.wing, rnd);
  blob(ctx, cx + 50, 272, 34, 32, look.head, rnd);
  wob(ctx, [[cx + 78, 266], [cx + 118, 276], [cx + 78, 288]], look.beak, rnd);
  ctx.fillStyle = INK; ctx.fillRect(cx + 58, 262, 7, 7);
  ctx.fillStyle = '#fff'; ctx.fillRect(cx + 60, 263, 2, 2);
}

function slime(ctx, look, rnd) {
  const cx = 128, foot = 470;
  wob(ctx, [[cx - 100, foot], [cx - 96, 380], [cx - 60, 300], [cx, 270], [cx + 60, 300], [cx + 98, 380], [cx + 100, foot]], look.body, rnd, { amp: 4 });
  blob(ctx, cx - 20, 330, 40, 26, look.head, rnd, { stroke: null });
  brush(ctx, cx - 60, 320, 80, 90, '#ffffff', rnd);
  ctx.fillStyle = INK; ctx.fillRect(cx + 10, 340, 12, 16); ctx.fillRect(cx + 44, 344, 12, 16);
  ctx.fillStyle = '#fff'; ctx.fillRect(cx + 12, 342, 4, 4); ctx.fillRect(cx + 46, 346, 4, 4);
  wob(ctx, [[cx + 8, 386], [cx + 60, 380], [cx + 40, 400]], look.beak, rnd, { width: 3 });
}

// Paint one cutout. Returns the canvas — the alpha is the cutout's outline.
export function paintCutout(look, seed = 1) {
  const c = document.createElement('canvas');
  c.width = TW; c.height = TH;
  const ctx = c.getContext('2d');
  const rnd = rngFrom(seed * 7919 + 17);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (look.shape === 'bird') bird(ctx, look, rnd);
  else if (look.shape === 'blob') slime(ctx, look, rnd);
  else person(ctx, look, rnd);
  grain(ctx, rnd);
  return c;
}

// the kraft-cardboard back of the same cutout: the shape, in brown, with flutes
function paintBack(front) {
  const c = document.createElement('canvas');
  c.width = TW; c.height = TH;
  const ctx = c.getContext('2d');
  ctx.drawImage(front, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#b8895a'; ctx.fillRect(0, 0, TW, TH);
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let y = 0; y < TH; y += 8) ctx.fillRect(0, y, TW, 3);
  return c;
}

let tapeTex = null;
function tapeTexture() {
  if (tapeTex) return tapeTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(232,214,170,0.78)'; ctx.fillRect(0, 0, 128, 32);
  ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(0, 6, 128, 4);
  // torn ends
  ctx.globalCompositeOperation = 'destination-out';
  for (let y = 0; y < 32; y += 4) { ctx.fillRect(0, y, 2 + Math.random() * 5, 4); ctx.fillRect(122 + Math.random() * 6, y, 6, 4); }
  tapeTex = new THREE.CanvasTexture(c);
  return tapeTex;
}

const BOARD = new THREE.MeshLambertMaterial({ color: '#c9a070' });
const FLUTE = new THREE.MeshLambertMaterial({ color: '#a67c50' });

// ── the object ───────────────────────────────────────────────────────────
export class Puppet {
  constructor({ look, seed = 1, scale = 1, facing = 1 }) {
    this.group = new THREE.Group();
    this.scale = scale;
    this.facing = facing;
    this.alive = true;
    this.fall = null;           // { angle, vel, axis, done }
    this.wobble = 0; this.wobbleVel = 0;
    this.flash = 0;
    this.lunge = 0;             // slide toward the other side, for an attack
    this.home = new THREE.Vector3();

    const front = paintCutout(look, seed);
    const tex = new THREE.CanvasTexture(front);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const backTex = new THREE.CanvasTexture(paintBack(front));
    backTex.colorSpace = THREE.SRGBColorSpace;

    const h = PUPPET_H * scale, w = h * TW / TH;
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, h / 2, 0);
    this.mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.FrontSide });
    this.mat.color = new THREE.Color(1, 1, 1);
    const face = new THREE.Mesh(geo, this.mat);
    const back = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: backTex, transparent: true, alphaTest: 0.35, side: THREE.BackSide }));
    // a hair of thickness: the back drawn a shade behind reads as card
    const edge = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: backTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }));
    edge.position.z = -0.012;
    const body = new THREE.Group();
    body.add(face, back, edge);
    // faces +x by default: mirror the sheet for a left-facing enemy
    body.scale.x = facing;
    this.body = body;

    // the base: a cardboard wedge, a slot block, and a strip of tape over the feet
    const bw = w * 0.9, bd = 0.22 * scale;
    const wedge = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.05 * scale, bd), BOARD);
    wedge.position.y = 0.025 * scale;
    const slot = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.5, 0.09 * scale, 0.06 * scale), FLUTE);
    slot.position.set(0, 0.07 * scale, -0.04 * scale);
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.16 * scale, 0.09 * scale),
      new THREE.MeshBasicMaterial({ map: tapeTexture(), transparent: true, depthWrite: false }));
    tape.position.set(0, 0.06 * scale, 0.02 * scale);
    tape.rotation.x = -0.9; tape.rotation.z = 0.15;
    this.group.add(body, wedge, slot, tape);

    // a soft shadow on the bench, which the fall leaves behind
    const sh = new THREE.Mesh(new THREE.CircleGeometry(bw * 0.55, 20),
      new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.22, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.scale.y = 0.45; sh.position.y = 0.004;
    this.shadow = sh;
    this.height = h; this.width = w;
  }

  setHome(x, y, z) { this.home.set(x, y, z); this.group.position.copy(this.home); this.shadow.position.set(x, y + 0.004, z); }

  hit() { this.wobbleVel += 9 * (Math.random() > 0.5 ? 1 : -1); this.flash = 1; }
  attack() { this.lunge = 1; }

  die() {
    if (!this.alive) return;
    this.alive = false;
    // an axis between the camera's x and the depth axis, either way round —
    // so it falls back and to the side, never a flat 2D tip-over
    const side = Math.random() > 0.5 ? 1 : -1;
    const back = Math.random() > 0.35 ? 1 : -1;
    const axis = new THREE.Vector3(back * (0.55 + Math.random() * 0.35), 0, side * (0.4 + Math.random() * 0.4)).normalize();
    this.fall = { angle: 0.02, vel: 0.6 + Math.random() * 0.6, axis, bounces: 0, rest: 0, done: false, spin: (Math.random() - 0.5) * 1.2 };
  }

  get fallen() { return !!this.fall?.done; }

  update(dt) {
    const g = this.group;
    // hit wobble: a damped swing about the feet
    this.wobbleVel += -this.wobble * 90 * dt;
    this.wobbleVel *= Math.exp(-6 * dt);
    this.wobble += this.wobbleVel * dt;
    if (this.flash > 0) { this.flash = Math.max(0, this.flash - dt * 4); const k = 1 + this.flash * 1.6; this.mat.color.setRGB(k, k, k); }

    // attack lunge: out toward the enemy and back
    if (this.lunge > 0) this.lunge = Math.max(0, this.lunge - dt * 2.8);
    const l = Math.sin(this.lunge * Math.PI) * 0.35 * this.facing;
    g.position.set(this.home.x + l, this.home.y, this.home.z + Math.sin(this.lunge * Math.PI) * 0.12);

    if (this.fall && !this.fall.done) {
      const f = this.fall;
      // torque grows with the lean; a hard stop at the floor with a small bounce
      f.vel += Math.sin(f.angle) * 14 * dt + 2.5 * dt;
      f.angle += f.vel * dt;
      if (f.angle >= Math.PI / 2 - 0.02) {
        f.angle = Math.PI / 2 - 0.02;
        if (f.vel > 0.9 && f.bounces < 2) { f.vel = -f.vel * 0.28; f.bounces++; }
        else { f.vel = 0; f.rest += dt; if (f.rest > 1.4) f.done = true; }
      }
      g.quaternion.setFromAxisAngle(f.axis, f.angle);
      g.rotateY(f.spin * Math.min(1, f.angle));
      this.shadow.material.opacity = 0.22 * Math.max(0, 1 - f.angle / (Math.PI / 2)) + 0.06;
    } else if (!this.fall) {
      g.rotation.set(0, 0, this.wobble * 0.08);
    }
    if (this.fall?.done) {
      // sink through the bench and go; the bench is for the living
      g.position.y -= dt * 0.3;
      this.mat.opacity = Math.max(0, (this.mat.opacity ?? 1) - dt * 0.8);
      this.mat.transparent = true;
      this.shadow.material.opacity = Math.max(0, this.shadow.material.opacity - dt * 0.2);
      if (this.mat.opacity <= 0) { this.gone = true; }
    }
  }

  // where a label hangs: over the head, in world space
  headWorld(v = new THREE.Vector3()) {
    return v.set(this.home.x, this.home.y + this.height * 1.02, this.home.z);
  }
}
