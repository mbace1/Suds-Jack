// Every surface in the pit, painted into a canvas. There is no image file in
// this game: the concrete, the playfield, the marquee, the reels and the ATM's
// screen are all drawn here, with a fixed seed so the room is the same room
// every time you come back to it.

import * as THREE from 'three';
import { makeRng } from '../rng.js?v=6';
import { drawBadge } from '../../../toko/js/face.js';   // the brand's own mark, from the site's toko/

export function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function tex(c, { nearest = true, repeat = null } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (nearest) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestMipmapNearestFilter; }
  else { t.anisotropy = 4; }
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

const hex = (h, a = 1) => {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};

// ── concrete ─────────────────────────────────────────────────────────────
// Cinder block, damp at the bottom, with somebody's tally marks on it.
export function concrete({ w = 256, h = 256, base = '#5d6158', seed = 3, blocks = true, tally = false, stain = 0.5 } = {}) {
  const c = canvas(w, h), g = c.getContext('2d'), R = makeRng(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  // grain: a thousand little flecks of lighter and darker aggregate
  for (let i = 0; i < w * h / 6; i++) {
    const v = R.next();
    g.fillStyle = v < 0.5 ? `rgba(0,0,0,${0.05 + R.next() * 0.12})` : `rgba(255,255,240,${0.03 + R.next() * 0.07})`;
    g.fillRect(R.int(w), R.int(h), 1 + (R.next() < 0.2), 1);
  }
  // blotches
  for (let i = 0; i < 18; i++) {
    const x = R.int(w), y = R.int(h), r = 10 + R.next() * 40;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    const dark = R.next() < 0.6;
    gr.addColorStop(0, dark ? 'rgba(20,24,18,0.18)' : 'rgba(200,200,180,0.08)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  if (blocks) {
    // mortar lines: 4 courses of 2 blocks, the courses offset
    g.fillStyle = 'rgba(20,22,18,0.35)';
    const rows = 4, bh = h / rows;
    for (let r = 0; r < rows; r++) {
      g.fillRect(0, Math.round(r * bh), w, 2);
      const off = r % 2 ? w / 4 : 0;
      for (let k = 0; k < 3; k++) g.fillRect(Math.round((off + k * w / 2) % w), Math.round(r * bh), 2, Math.round(bh));
    }
    g.fillStyle = 'rgba(255,255,230,0.06)';
    for (let r = 0; r < rows; r++) g.fillRect(0, Math.round(r * bh) + 2, w, 1);
  }
  // streaks: water running down from the top
  for (let i = 0; i < Math.round(10 * stain); i++) {
    const x = R.int(w), len = h * (0.2 + R.next() * 0.7), wd = 1 + R.int(3);
    const gr = g.createLinearGradient(0, 0, 0, len);
    gr.addColorStop(0, 'rgba(30,26,12,0.28)'); gr.addColorStop(1, 'rgba(30,26,12,0)');
    g.fillStyle = gr; g.fillRect(x, 0, wd, len);
  }
  // damp at the foot
  const damp = g.createLinearGradient(0, h * 0.72, 0, h);
  damp.addColorStop(0, 'rgba(10,16,8,0)'); damp.addColorStop(1, `rgba(10,16,8,${0.45 * stain})`);
  g.fillStyle = damp; g.fillRect(0, 0, w, h);
  if (tally) {
    // the last tenant counted something
    g.strokeStyle = 'rgba(230,225,200,0.55)'; g.lineWidth = 1;
    let x = 30;
    for (let grp = 0; grp < 6; grp++) {
      for (let k = 0; k < 4; k++) { g.beginPath(); g.moveTo(x + k * 4, 70 + R.int(3)); g.lineTo(x + k * 4 + 1, 88); g.stroke(); }
      g.beginPath(); g.moveTo(x - 2, 84); g.lineTo(x + 16, 72); g.stroke();
      x += 26;
    }
  }
  return tex(c, { repeat: [1, 1] });
}

// the last tenant counted something, in groups of five
export function tally() {
  const w = 256, h = 96, c = canvas(w, h), g = c.getContext('2d'), R = makeRng(17);
  g.strokeStyle = 'rgba(225,220,196,0.7)'; g.lineWidth = 2; g.lineCap = 'round';
  let x = 10;
  for (let grp = 0; grp < 7; grp++) {
    const n = grp === 6 ? 3 : 4;
    for (let k = 0; k < n; k++) { g.beginPath(); g.moveTo(x + k * 7 + R.wobble(1), 18 + R.int(4)); g.lineTo(x + k * 7 + R.wobble(2), 70 + R.int(5)); g.stroke(); }
    if (n === 4) { g.beginPath(); g.moveTo(x - 4, 62); g.lineTo(x + 26, 26); g.stroke(); }
    x += 36;
  }
  const t = tex(c); return t;
}

// ── the floor grate over the drop ────────────────────────────────────────
export function grate() {
  const w = 128, c = canvas(w, w), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, w, w);
  const bar = (x, y, bw, bh, lit) => {
    g.fillStyle = '#3a3c3a'; g.fillRect(x, y, bw, bh);
    g.fillStyle = lit; g.fillRect(x, y, bw, 1);
  };
  for (let i = 0; i <= 8; i++) {
    bar(i * 16 - 2, 0, 4, w, '#6f716a');
    bar(0, i * 16 - 2, w, 4, '#6a6c66');
  }
  // rust in the corners of the cells
  const R = makeRng(11);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${110 + R.int(40)},${50 + R.int(20)},20,${0.3 + R.next() * 0.4})`; g.fillRect(R.int(w), R.int(w), 2, 2); }
  return tex(c);
}

// ── the playfield: the painting behind the nails ─────────────────────────
// Garish on purpose — a pachinko board is the loudest object in any room —
// and laid out FOR the nails: each pocket gets a painted halo that tells you
// where it is before you have read a single label.
export function boardArt(layout, { W = 60, H = 84, ppu = 12 } = {}) {
  const cw = W * ppu, ch = H * ppu;
  const c = canvas(cw, ch), g = c.getContext('2d');
  const X = x => (x + W / 2) * ppu, Y = y => (H - y) * ppu;
  // ground: deep ultramarine to violet, a sunburst from the window
  const bg = g.createLinearGradient(0, 0, 0, ch);
  bg.addColorStop(0, '#1d1a5c'); bg.addColorStop(0.5, '#3b1d6e'); bg.addColorStop(1, '#16123a');
  g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
  g.save();
  g.translate(X(0), Y(50));
  for (let i = 0; i < 24; i++) {
    g.rotate(Math.PI * 2 / 24);
    g.fillStyle = i % 2 ? 'rgba(255,200,90,0.07)' : 'rgba(120,200,255,0.05)';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-40, -900); g.lineTo(40, -900); g.closePath(); g.fill();
  }
  g.restore();
  // the field inside the rail, a little lighter, so the lane reads as outside
  g.save();
  g.beginPath(); g.arc(X(0), Y(50), 27.2 * ppu, Math.PI, 0); g.lineTo(X(27.2), Y(0)); g.lineTo(X(-27.2), Y(0)); g.closePath();
  g.clip();
  const f = g.createRadialGradient(X(0), Y(46), 20, X(0), Y(46), 40 * ppu);
  f.addColorStop(0, 'rgba(255,230,160,0.22)'); f.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = f; g.fillRect(0, 0, cw, ch);
  // clovers scattered in the paint — and NO coins: a painted coin on a board
  // that real coins fall down is a decoy, and the first render had dozens
  const R = makeRng(21);
  for (let i = 0; i < 40; i++) {
    const x = R.range(-27, 27), y = R.range(4, 78), s = R.range(1.2, 2.4) * ppu;
    g.globalAlpha = 0.1 + R.next() * 0.1;
    clover(g, X(x), Y(y), s, '#4fe07a');
  }
  g.globalAlpha = 1;
  g.restore();
  // halos under every pocket, in the colour the HUD calls it by
  const halo = (x, y, r, col) => {
    const gr = g.createRadialGradient(X(x), Y(y), 2, X(x), Y(y), r * ppu);
    gr.addColorStop(0, hex(col, 0.75)); gr.addColorStop(1, hex(col, 0));
    g.fillStyle = gr; g.beginPath(); g.arc(X(x), Y(y), r * ppu, 0, Math.PI * 2); g.fill();
  };
  for (const p of layout.pockets) {
    const col = { start: '#ff3b5c', tulip: '#ff7ad9', pocket: '#43e06b', attacker: '#ffd23f' }[p.kind] ?? '#fff';
    halo(p.x, p.y + 1.5, p.kind === 'attacker' ? 11 : 6, col);
  }
  // the way: a painted lane under the fence
  g.strokeStyle = 'rgba(80,255,170,0.35)'; g.lineWidth = 2.2 * ppu; g.lineCap = 'round';
  g.beginPath(); g.moveTo(X(-20.8), Y(41.4)); g.lineTo(X(-4.9), Y(32.2)); g.stroke();
  // the right route, lettered, because it only matters in FEVER
  g.save();
  g.translate(X(24.5), Y(30)); g.rotate(Math.PI / 2);
  g.font = `bold ${2.2 * ppu}px "Arial Black", Impact, sans-serif`;
  g.fillStyle = 'rgba(255,210,63,0.55)'; g.textAlign = 'center';
  g.fillText('RIGHT ▸▸', 0, 0);
  g.restore();
  // the name, arched under the rail
  g.save();
  g.font = `bold ${3.4 * ppu}px "Arial Black", Impact, sans-serif`;
  g.textAlign = 'center';
  const text = 'PACHI PIT';
  for (let i = 0; i < text.length; i++) {
    const a = Math.PI * 1.5 + (i - (text.length - 1) / 2) * 0.12;
    g.save();
    g.translate(X(0) + Math.cos(a) * 22 * ppu, Y(50) + Math.sin(a) * 22 * ppu);
    g.rotate(a + Math.PI / 2);
    g.fillStyle = '#2a0b12'; g.fillText(text[i], 3, 3);
    g.fillStyle = '#ffd23f'; g.fillText(text[i], 0, 0);
    g.restore();
  }
  g.restore();
  // Toko, lower left, watching you shoot
  tokoFace(g, X(-19), Y(12), 6.5 * ppu);
  // the lane outside the guide rail
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.fillRect(X(-30), Y(50), 2.6 * ppu, 46 * ppu);
  return tex(c, { nearest: false });
}

export function clover(g, x, y, s, col) {
  g.fillStyle = col;
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4;
    g.beginPath(); g.arc(x + Math.cos(a) * s * 0.42, y + Math.sin(a) * s * 0.42, s * 0.36, 0, Math.PI * 2); g.fill();
  }
  g.fillRect(x - s * 0.05, y, s * 0.1, s * 0.8);
}

// The landlord is TOKO now (owner, 2026-09-27: "change any raccoon or similar
// to Toko face"): the studio's own mark, drawn from the brand's geometry on
// its magenta disc — never redrawn by hand, so it cannot drift from the logo.
// `s` is the size the raccoon's head used to be; `glow` keeps its halo.
export function tokoFace(g, x, y, s, { glow = false } = {}) {
  g.save();
  if (glow) { g.shadowColor = '#f0027f'; g.shadowBlur = s * 0.35; }
  drawBadge(g, x, y, s * 0.78);
  g.restore();
}

// ── the marquee on top of the cabinet ─────────────────────────────────────
export function marquee() {
  const w = 512, h = 128, c = canvas(w, h), g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#5a0f22'); bg.addColorStop(1, '#23060e');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  // bulbs round the edge
  for (let x = 8; x < w; x += 16) for (const y of [7, h - 7]) bulb(g, x, y, 4, '#ffe28a');
  for (let y = 23; y < h - 16; y += 16) for (const x of [7, w - 7]) bulb(g, x, y, 4, '#ffe28a');
  g.font = 'bold 68px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#000'; g.fillText('PACHI PIT', w / 2 + 34 + 4, h / 2 + 5);
  const txt = g.createLinearGradient(0, 30, 0, 96);
  txt.addColorStop(0, '#fff3a8'); txt.addColorStop(0.5, '#ffc53a'); txt.addColorStop(1, '#e0761a');
  g.fillStyle = txt; g.fillText('PACHI PIT', w / 2 + 34, h / 2 + 1);
  tokoFace(g, 64, h / 2 + 8, 46);
  return tex(c, { nearest: false });
}

function bulb(g, x, y, r, col) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r * 2);
  gr.addColorStop(0, col); gr.addColorStop(0.4, hex('#ffcc55', 0.6)); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
}

// ── a coin's face: a rim and a clover, in relief (light from the top left) ─
export function coinFace() {
  const s = 64, c = canvas(s, s), g = c.getContext('2d');
  g.fillStyle = '#b8b8b8'; g.fillRect(0, 0, s, s);
  const ring = (r, col, w) => { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(s / 2, s / 2, r, 0, Math.PI * 2); g.stroke(); };
  ring(29, '#ffffff', 3); ring(26, '#707070', 2);
  g.save(); g.translate(1, 1); clover(g, s / 2, s / 2 - 3, 20, '#6a6a6a'); g.restore();
  clover(g, s / 2, s / 2 - 3, 20, '#f0f0f0');
  return tex(c, { nearest: false });
}

// ── the reel symbols: 32px pixel art, one row, in SYMBOLS order ────────────
export function symbolSheet() {
  const s = 32, names = ['cherry', 'bell', 'coin', 'clover', 'seven', 'mask'];
  const c = canvas(s * names.length, s), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  names.forEach((n, i) => { g.save(); g.translate(i * s, 0); drawSymbol(g, n, s); g.restore(); });
  return { canvas: c, size: s, names };
}

export function drawSymbol(g, name, s) {
  const px = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  switch (name) {
    case 'cherry':
      px(15, 4, 2, 10, '#3c8a2a'); px(16, 4, 7, 2, '#3c8a2a'); px(10, 8, 6, 2, '#3c8a2a');
      for (const [x, y] of [[9, 16], [19, 18]]) {
        g.fillStyle = '#e8203a'; g.beginPath(); g.arc(x, y, 6, 0, Math.PI * 2); g.fill();
        px(x - 3, y - 3, 2, 2, '#ff9aa6');
      }
      break;
    case 'bell':
      g.fillStyle = '#ffcc2a';
      g.beginPath(); g.moveTo(16, 4); g.quadraticCurveTo(26, 6, 26, 22); g.lineTo(28, 25); g.lineTo(4, 25); g.lineTo(6, 22); g.quadraticCurveTo(6, 6, 16, 4); g.fill();
      px(14, 25, 4, 4, '#b07a10'); px(10, 9, 3, 8, '#fff3b0');
      break;
    case 'coin':
      g.fillStyle = '#c8cdd6'; g.beginPath(); g.arc(16, 16, 12, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#8f96a3'; g.beginPath(); g.arc(16, 16, 9, 0, Math.PI * 2); g.fill();
      px(14, 10, 4, 12, '#eef2f8'); px(11, 12, 10, 2, '#eef2f8'); px(11, 18, 10, 2, '#eef2f8');
      break;
    case 'clover':
      clover(g, 16, 14, 20, '#3fcf62'); px(15, 22, 2, 7, '#2a8a40');
      px(10, 8, 2, 2, '#b9ffcb');
      break;
    case 'seven':
      g.fillStyle = '#ff2448';
      g.beginPath(); g.moveTo(6, 5); g.lineTo(27, 5); g.lineTo(27, 10); g.lineTo(17, 28); g.lineTo(10, 28); g.lineTo(20, 11); g.lineTo(6, 11); g.closePath(); g.fill();
      g.strokeStyle = '#ffe0a0'; g.lineWidth = 1.5; g.stroke();
      break;
    case 'mask':
      tokoFace(g, 16, 18, 18, { eyes: '#ff3030', glow: false });
      break;
  }
}

// ── the reel window: redrawn every frame the reels move ───────────────────
export function makeReelScreen() {
  const W = 192, H = 128;
  const c = canvas(W, H), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  const sheet = symbolSheet();
  const t = tex(c, { nearest: true });
  return { canvas: c, ctx: g, texture: t, sheet, W, H };
}

// ── the ATM's green screen ───────────────────────────────────────────────
export function makeAtmScreen() {
  const W = 160, H = 120, c = canvas(W, H), g = c.getContext('2d');
  return { canvas: c, ctx: g, texture: tex(c), W, H };
}

export function drawAtm(scr, st, time) {
  const { ctx: g, W, H } = scr;
  g.fillStyle = '#031a0c'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#35ff7a';
  g.font = 'bold 11px monospace'; g.textBaseline = 'top';
  const line = (y, a, b = '') => { g.fillText(a, 8, y); if (b) { const w = g.measureText(b).width; g.fillText(b, W - 8 - w, y); } };
  line(8, 'PIT SAVINGS & LOAN');
  g.fillRect(8, 22, W - 16, 1);
  line(28, 'DEBT', String(st.debt));
  line(42, 'IN ATM', String(st.atm));
  line(56, 'DUE', st.due ? 'NOW' : `SHIFT ${st.shift}/3`);
  line(70, 'LOCK', `${st.deadline}/8`);
  // a progress bar that is the whole point of the screen
  const k = Math.max(0, Math.min(1, st.atm / Math.max(1, st.debt)));
  g.strokeStyle = '#35ff7a'; g.strokeRect(8, 88, W - 16, 10);
  g.fillRect(10, 90, (W - 20) * k, 6);
  if (st.due && Math.floor(time * 2) % 2) { g.fillStyle = '#ffec5a'; line(104, 'INSERT PAYMENT'); }
  else { g.fillStyle = '#1f9a4a'; line(104, `+${Math.round(st.interest * 100)}% A SHIFT`); }
  // scanlines
  g.fillStyle = 'rgba(0,0,0,0.25)';
  for (let y = 0; y < H; y += 2) g.fillRect(0, y, W, 1);
  scr.texture.needsUpdate = true;
}

// ── labels, posters and small signs ──────────────────────────────────────
export function sign(text, { w = 256, h = 64, bg = '#141414', fg = '#e8e0c8', font = 'bold 34px "Arial Black", Impact, sans-serif', border = null } = {}) {
  const c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  if (border) { g.strokeStyle = border; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8); }
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  return tex(c, { nearest: false });
}

export function poster() {
  const w = 128, h = 176, c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#d9cfae'; g.fillRect(0, 0, w, h);
  const R = makeRng(8);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(90,70,40,${R.next() * 0.12})`; g.fillRect(R.int(w), R.int(h), 2, 2); }
  g.fillStyle = '#1b1b1b'; g.font = 'bold 20px "Arial Black", Impact, sans-serif'; g.textAlign = 'center';
  g.fillText('WANTED', w / 2, 24);
  g.fillStyle = '#3a3a3a'; g.fillRect(14, 34, w - 28, 92);
  tokoFace(g, w / 2, 86, 40, { eyes: '#e8e0c0' });
  g.fillStyle = '#1b1b1b'; g.font = 'bold 11px monospace';
  g.fillText('FOR RENT ARREARS', w / 2, 142);
  g.fillText('REWARD: 1 COIN', w / 2, 158);
  // torn corner
  g.fillStyle = '#000'; g.beginPath(); g.moveTo(w, h); g.lineTo(w - 22, h); g.lineTo(w, h - 30); g.fill();
  return tex(c);
}

export function door() {
  const w = 128, h = 256, c = canvas(w, h), g = c.getContext('2d');
  g.fillStyle = '#3d4247'; g.fillRect(0, 0, w, h);
  const R = makeRng(14);
  for (let i = 0; i < 1500; i++) { g.fillStyle = R.next() < 0.5 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.04)'; g.fillRect(R.int(w), R.int(h), 1, 1); }
  // panels and rivets
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 2;
  g.strokeRect(12, 14, w - 24, h / 2 - 20); g.strokeRect(12, h / 2 + 6, w - 24, h / 2 - 20);
  g.fillStyle = '#8a9096';
  for (let y = 8; y < h; y += 16) { g.fillRect(4, y, 3, 3); g.fillRect(w - 7, y, 3, 3); }
  // rust weeping from the rivets
  for (let i = 0; i < 12; i++) {
    const x = R.next() < 0.5 ? 5 : w - 6, y = R.int(h);
    const gr = g.createLinearGradient(0, y, 0, y + 30);
    gr.addColorStop(0, 'rgba(130,60,20,0.5)'); gr.addColorStop(1, 'rgba(130,60,20,0)');
    g.fillStyle = gr; g.fillRect(x - 1, y, 3, 30);
  }
  return tex(c);
}

// a lacquered cabinet panel: deep red with a gold pinstripe
export function lacquer(w = 128, h = 128, { base = '#6d0f1f', stripe = '#d8a73a' } = {}) {
  const c = canvas(w, h), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, w, h);
  gr.addColorStop(0, base); gr.addColorStop(1, '#3a0610');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = stripe; g.lineWidth = 2; g.strokeRect(6, 6, w - 12, h - 12);
  const R = makeRng(5);
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(0,0,0,${R.next() * 0.2})`; g.fillRect(R.int(w), R.int(h), 1, 1); }
  return tex(c);
}

export function metal(w = 64, h = 64, base = '#8a8f96', seed = 2) {
  const c = canvas(w, h), g = c.getContext('2d'), R = makeRng(seed);
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y++) { g.fillStyle = `rgba(255,255,255,${R.next() * 0.06})`; g.fillRect(0, y, w, 1); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(0,0,0,${R.next() * 0.2})`; g.fillRect(R.int(w), R.int(h), 1 + R.int(3), 1); }
  return tex(c);
}
