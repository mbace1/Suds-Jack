// The painted face of the Pajatso and everything else that is a picture,
// drawn in code from the SAME layout the physics steps — so a payout printed
// under a window is the window that pays it, and moving one in layout.js moves
// its paint.
//
// The register is the owner's photographs (2026-09-27): a Finnish 1 mk
// machine. Deep red above, a pale grey band carrying a row of black windows
// with their payouts printed white (the 7:00 in red), red V deflectors, and
// the pot behind chrome dividers on a pale ribbed back. A teak-veneer case, a
// black 1 mk plate down the right, and an orange bar wall behind it all.

import { LABEL, JACKPOT, FACE, POTTI_COLS, YAKU } from './layout.js?v=6';

export const PPU = 16;                      // canvas pixels per board unit
export const X0 = -31, Y1 = 82, W = 62, H = 82;   // the painted area, in board units
const BLACK = '"Arial Black", Impact, sans-serif';

export function faceCanvas(L) {
  const c = document.createElement('canvas');
  c.width = W * PPU; c.height = H * PPU;
  const g = c.getContext('2d');
  const px = x => (x - X0) * PPU, py = y => (Y1 - y) * PPU;
  const u = PPU;
  const band = { top: 56.5, bottom: 44.2 };

  // the red: darkest at the top, where the lamp does not reach
  const red = g.createLinearGradient(0, 0, 0, c.height);
  red.addColorStop(0, '#5e0a12'); red.addColorStop(0.3, '#9c1420'); red.addColorStop(1, '#7c0f19');
  g.fillStyle = red; g.fillRect(0, 0, c.width, c.height);

  // the lane: a dark track just inside the rail, over the top and down the left
  g.strokeStyle = '#2a0508'; g.lineWidth = 3.0 * u;
  g.beginPath(); g.arc(px(0), py(50), 28.5 * u, Math.PI, 2 * Math.PI); g.stroke();
  g.fillStyle = '#2a0508'; g.fillRect(px(-30), py(50), 3 * u, 46 * u);

  // the little black rules card, top right, as on the real one
  g.fillStyle = '#111'; g.fillRect(px(17.5), py(78.2), 7.6 * u, 3.6 * u);
  g.fillStyle = 'rgba(235,235,235,.75)';
  for (let r = 0; r < 6; r++) g.fillRect(px(18.1), py(77.6 - r * 0.5), (5.2 + (r % 3)) * u * 0.9, 0.18 * u);

  // THE GREY BAND and its windows
  g.fillStyle = '#c9ccd0'; g.fillRect(px(-27), py(band.top), 57 * u, (band.top - band.bottom) * u);
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(px(-27), py(band.top), 57 * u, 0.4 * u);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(px(-27), py(band.bottom + 0.3), 57 * u, 0.3 * u);
  for (const p of L.pockets) if (p.window != null) win(g, px, py, u, p);
  // KUOPPA's parts, where they are bolted on
  const st = L.byId.start;
  if (st) {
    // the yakumono's panel: dark behind the LCD, a gold rim, a purple stage
    const { x0, x1, y0, lip, side, apex, mid } = YAKU;
    g.beginPath();
    g.moveTo(px(x0), py(lip)); g.lineTo(px(x0), py(side)); g.lineTo(px(mid - 3), py(apex - 0.9)); g.lineTo(px(mid), py(apex));
    g.lineTo(px(mid + 3), py(apex - 0.9)); g.lineTo(px(x1), py(side)); g.lineTo(px(x1), py(lip)); g.lineTo(px(mid), py(y0)); g.closePath();
    const yg = g.createLinearGradient(0, py(apex), 0, py(y0));
    yg.addColorStop(0, '#2a1446'); yg.addColorStop(0.8, '#120822'); yg.addColorStop(1, '#5a2a8a');
    g.fillStyle = yg; g.fill();
    g.strokeStyle = '#f0c040'; g.lineWidth = 0.35 * u; g.stroke();
    // the warp's mouth, lit
    g.fillStyle = '#6fe0ff'; g.fillRect(px(x0) - 0.3 * u, py(YAKU.warp[1]), 0.6 * u, (YAKU.warp[1] - YAKU.warp[0]) * u);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(px(st.x), py(st.y - 1), 4.4 * u, 3.6 * u, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#0c0c0e'; g.fillRect(px(st.x - st.w / 2 - 0.5), py(st.y + 0.6), (st.w + 1) * u, (st.depth + 0.6) * u);
    const pw = 5.2 * u, ph = 1.9 * u, top = py(st.y - st.depth - 0.4);
    g.fillStyle = '#0f3d22'; g.fillRect(px(st.x) - pw / 2, top, pw, ph);
    g.strokeStyle = '#6fe08a'; g.lineWidth = 0.15 * u; g.strokeRect(px(st.x) - pw / 2, top, pw, ph);
    g.fillStyle = '#bff5cf'; g.font = `900 ${Math.round(1.1 * u)}px ${BLACK}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('START', px(st.x), top + ph / 2 + 0.05 * u);
  }
  const dn = L.byId.denchu;
  if (dn) {
    g.fillStyle = '#0c0c0e'; g.fillRect(px(dn.x - dn.w / 2 - 0.5), py(dn.y + 0.6), (dn.w + 1) * u, (dn.depth + 0.6) * u);
    const pw = 5.6 * u, ph = 1.7 * u, top = py(dn.y - dn.depth - 0.4);
    g.fillStyle = '#10306a'; g.fillRect(px(dn.x) - pw / 2, top, pw, ph);
    g.fillStyle = '#bfe0ff'; g.font = `900 ${Math.round(1.0 * u)}px ${BLACK}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('電チュー', px(dn.x), top + ph / 2 + 0.05 * u);
  }
  const att = L.byId.attacker;
  if (att) {
    const x0 = px(att.x - att.w / 2), w = att.w * u, y0 = py(att.y - 0.2), h = 1.0 * u;
    g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip();
    for (let x = x0 - h; x < x0 + w + h; x += 1.2 * u) {
      g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(x, y0 + h); g.lineTo(x + 0.6 * u, y0 + h); g.lineTo(x + 0.6 * u + h, y0); g.lineTo(x + h, y0); g.closePath(); g.fill();
    }
    g.restore();
    g.fillStyle = '#1a0306'; g.fillRect(px(att.x) - 3.4 * u, y0 - 0.1 * u, 6.8 * u, h + 0.2 * u);
    g.fillStyle = '#ffd23f'; g.font = `900 ${Math.round(0.9 * u)}px ${BLACK}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('FEVER ▸', px(att.x), y0 + h / 2 + 0.05 * u);
  }

  // the red V under the band, and its dark edges: they carry the eye into the
  // pot the way they carry the coins
  g.fillStyle = '#b3172b';
  g.beginPath(); g.moveTo(px(-27), py(band.bottom)); g.lineTo(px(30), py(band.bottom));
  g.lineTo(px(30), py(36)); g.lineTo(px(1.5), py(31)); g.lineTo(px(-27), py(36)); g.closePath(); g.fill();
  g.strokeStyle = '#1a0306'; g.lineWidth = 0.7 * u; g.lineCap = 'round';
  for (const s of L.segs) if (s.kind === 'deflector' || s.kind === 'kicker') {
    g.beginPath(); g.moveTo(px(s.ax), py(s.ay)); g.lineTo(px(s.bx), py(s.by)); g.stroke();
  }

  // THE POT's back: pale ribbed columns behind chrome dividers
  for (const col of L.columns) {
    const x0 = px(col.x0), w = (col.x1 - col.x0) * u;
    const gr = g.createLinearGradient(x0, 0, x0 + w, 0);
    gr.addColorStop(0, '#9fa3a8'); gr.addColorStop(0.35, '#eef0f2'); gr.addColorStop(0.7, '#d7dadd'); gr.addColorStop(1, '#8e9297');
    g.fillStyle = gr; g.fillRect(x0, py(FACE.COL_TOP), w, FACE.COL_TOP * u);
  }
  // a gold line over the POTTI's three says which coins the 7:00 opens
  const a = L.columns[POTTI_COLS[0]], b = L.columns[POTTI_COLS[POTTI_COLS.length - 1]];
  g.fillStyle = '#ffd23f';
  g.fillRect(px(a.x0) + 3, py(FACE.COL_TOP + 1.1), (b.x1 - a.x0) * u - 6, 0.45 * u);
  g.font = `900 ${Math.round(1.2 * u)}px ${BLACK}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#ffe9a0'; g.fillText('POTTI', px((a.x0 + b.x1) / 2), py(FACE.COL_TOP + 2.2));

  // every nail throws a small shadow down and to the right
  g.fillStyle = 'rgba(20, 0, 4, .45)';
  for (const p of L.pins) { g.beginPath(); g.ellipse(px(p.x + 0.35), py(p.y - 0.45), 0.55 * u, 0.4 * u, 0, 0, Math.PI * 2); g.fill(); }

  // age: a fine speckle, fixed, so it does not crawl
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2200; i++) {
    g.fillStyle = `rgba(30, 10, 10, ${0.03 + rnd() * 0.05})`;
    g.fillRect(rnd() * c.width, rnd() * c.height, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  return c;
}

// one window: a black box a coin can sit in, the little chrome fork over it,
// and its payout in a black plate underneath
function win(g, px, py, u, p) {
  const jack = p.pay === JACKPOT;
  const x = px(p.x), w = p.w * u;
  if (p.tulip) {
    // a tulip's stem and two leaves under the plastic flower
    g.fillStyle = '#3c8a2a'; g.fillRect(x - 0.2 * u, py(p.y - p.depth - 0.5), 0.4 * u, 0.9 * u);
  }
  g.fillStyle = '#0c0c0e'; g.fillRect(x - w / 2 - 0.5 * u, py(p.y + 0.6), w + u, (p.depth + 0.6) * u);
  // the fork over the mouth: two chrome prongs and a bar
  g.fillStyle = '#e9ecef';
  for (const sx of [-1, 1]) g.fillRect(x + sx * (w / 2 + 0.25 * u) - 0.2 * u, py(p.y + 2.2), 0.4 * u, 1.6 * u);
  g.fillRect(x - w / 2 - 0.45 * u, py(p.y + 2.3), w + 0.9 * u, 0.3 * u);
  // the payout plate
  const pw = 4.6 * u, ph = 2.6 * u, top = py(p.y - p.depth - 0.5);
  g.fillStyle = '#101012'; g.fillRect(x - pw / 2, top, pw, ph);
  g.strokeStyle = '#6d7076'; g.lineWidth = 0.15 * u; g.strokeRect(x - pw / 2, top, pw, ph);
  g.fillStyle = jack ? '#ff3b3b' : p.pay === 'x3' ? '#ffd23f' : '#f4f4f4';
  g.font = `900 ${Math.round((p.pay === 'R' ? 1.9 : 1.45) * u)}px ${BLACK}`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(LABEL[p.pay], x, top + ph / 2 + 0.08 * u);
}

// the coin's face: a 1 mk, brass, a ring and a 1
export function coinCanvas() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(50, 44, 10, 64, 64, 64);
  gr.addColorStop(0, '#fff3c8'); gr.addColorStop(0.6, '#d5b15a'); gr.addColorStop(1, '#86651f');
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(90, 60, 20, .8)'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(90, 60, 20, .85)'; g.font = `900 64px ${BLACK}`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1', 64, 68);
  return c;
}

// the black plate down the right of the glass: coin slot, 1 mk, the change
// machine in two languages, as printed on the real one
export function plateCanvas() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 640;
  const g = c.getContext('2d');
  g.fillStyle = '#0d0d0f'; g.fillRect(0, 0, 128, 640);
  g.strokeStyle = '#3a3a40'; g.lineWidth = 4; g.strokeRect(4, 4, 120, 632);
  g.fillStyle = 'rgba(230,230,230,.7)';
  for (let r = 0; r < 12; r++) g.fillRect(16, 26 + r * 11, 70 + (r * 37 % 26), 3);
  g.fillStyle = '#c9ccd0'; g.fillRect(40, 190, 48, 78);
  g.fillStyle = '#111'; g.fillRect(58, 202, 12, 44);
  g.fillStyle = '#e9ecef'; g.beginPath(); g.moveTo(64, 290); g.lineTo(34, 330); g.lineTo(94, 330); g.closePath(); g.fill();
  g.fillStyle = '#f4f4f4'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 46px ${BLACK}`; g.fillText('1mk', 64, 372);
  g.font = '700 15px Arial, sans-serif'; g.fillText('VAIHTOKONE', 64, 410); g.fillText('MYNTVÄXLARE', 64, 470);
  g.font = '600 11px Arial, sans-serif'; g.fillText('RAHA KAHDEKSI', 64, 430); g.fillText('TVÅ MYNT', 64, 490);
  g.font = `900 40px ${BLACK}`; g.fillText('2×50p', 64, 540);
  return c;
}

// the small brass plate in the top of the case
export function nameCanvas() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 96;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 96);
  gr.addColorStop(0, '#f3dc8e'); gr.addColorStop(0.5, '#c79a3a'); gr.addColorStop(1, '#8a6420');
  g.fillStyle = gr; g.fillRect(0, 0, 512, 96);
  g.strokeStyle = '#5a3e12'; g.lineWidth = 6; g.strokeRect(6, 6, 500, 84);
  g.font = `900 58px ${BLACK}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#3d2708'; g.fillText('PAJATSO', 256, 52);
  return c;
}

// teak veneer: the 1970s case
export function woodCanvas() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  let s = 23; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#9a6a3a'; g.fillRect(0, 0, 256, 512);
  for (let k = 0; k < 120; k++) {
    g.strokeStyle = `rgba(${60 + rnd() * 40}, ${30 + rnd() * 20}, 10, ${0.12 + rnd() * 0.2})`;
    g.lineWidth = 0.6 + rnd() * 2.4;
    const x = rnd() * 256;
    g.beginPath(); g.moveTo(x, 0);
    g.bezierCurveTo(x + (rnd() - 0.5) * 30, 170, x + (rnd() - 0.5) * 30, 340, x + (rnd() - 0.5) * 12, 512); g.stroke();
  }
  for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(255, 220, 160, ${0.04 + rnd() * 0.06})`; g.fillRect(rnd() * 256, 0, 2 + rnd() * 6, 512); }
  return c;
}

// the bar's wall: orange paint, a little uneven — the second photograph
export function wallCanvas() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  let s = 11; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#e4611d'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = `rgba(${rnd() < 0.5 ? '255,160,80' : '120,30,0'}, ${0.03 + rnd() * 0.05})`;
    g.fillRect(rnd() * 512, rnd() * 512, 2 + rnd() * 10, 2 + rnd() * 10);
  }
  return c;
}

// the bar table: worn light wood, two coin holes in it
export function tableCanvas() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  let s = 5; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#c49a64'; g.fillRect(0, 0, 512, 256);
  for (let k = 0; k < 90; k++) {
    g.strokeStyle = `rgba(90, 55, 20, ${0.08 + rnd() * 0.16})`; g.lineWidth = 0.6 + rnd() * 2;
    const y = rnd() * 256;
    g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(170, y + (rnd() - 0.5) * 20, 340, y + (rnd() - 0.5) * 20, 512, y + (rnd() - 0.5) * 8); g.stroke();
  }
  for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(60, 30, 10, ${0.05 + rnd() * 0.1})`; g.beginPath(); g.arc(rnd() * 512, rnd() * 256, 2 + rnd() * 12, 0, 7); g.fill(); }
  for (const x of [90, 170]) {
    g.fillStyle = '#5a3a1a'; g.beginPath(); g.arc(x, 90, 30, 0, 7); g.fill();
    g.fillStyle = '#2a170a'; g.beginPath(); g.arc(x, 94, 24, 0, 7); g.fill();
  }
  return c;
}
