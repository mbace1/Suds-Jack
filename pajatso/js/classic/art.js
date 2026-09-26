// The painted face of the Pajatso, drawn in code from the SAME layout the
// physics steps — so a number painted over a cup is the cup that pays it, and
// moving a cup in layout.js moves its paint.
//
// The register is a 1950s kiosk machine: cream enamel, a red arch with gold
// rays, a clown (the Bajazzo the machine is named after) whose mouth is a cup,
// and big plain numbers you can read from across the room.

import { PAYS, JACKPOT } from './layout.js?v=2';

export const PPU = 16;                      // canvas pixels per board unit
const X0 = -31, Y1 = 82, W = 62, H = 84;    // the painted area, in board units

export function faceCanvas(L) {
  const c = document.createElement('canvas');
  c.width = W * PPU; c.height = H * PPU;
  const g = c.getContext('2d');
  const px = x => (x - X0) * PPU, py = y => (Y1 - y) * PPU;
  const u = PPU;

  // enamel, warmest at the middle, with a little age in it
  const bg = g.createRadialGradient(px(0), py(40), 4 * u, px(0), py(40), 52 * u);
  bg.addColorStop(0, '#f6ecd2'); bg.addColorStop(1, '#d8c79f');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);

  // the arch: red, with gold rays behind the clown
  g.save();
  g.beginPath(); g.arc(px(0), py(50), 30 * u, Math.PI, 0); g.lineTo(px(30), py(50)); g.closePath(); g.clip();
  g.fillStyle = '#b3172b'; g.fillRect(0, 0, c.width, py(50));
  for (let i = 0; i < 24; i++) {
    const a0 = Math.PI + (i / 24) * Math.PI, a1 = a0 + Math.PI / 48;
    g.beginPath(); g.moveTo(px(0), py(58));
    g.arc(px(0), py(58), 40 * u, a0, a1); g.closePath();
    g.fillStyle = i % 2 ? 'rgba(255, 210, 90, .30)' : 'rgba(255, 240, 180, .12)'; g.fill();
  }
  g.restore();
  // a gold band where the arch meets the field
  g.fillStyle = '#d9a632'; g.fillRect(px(-27), py(50.4), 54 * u, 0.8 * u);

  // the lane: a dark track just inside the rail
  g.strokeStyle = '#3b2616'; g.lineWidth = 3.0 * u;
  g.beginPath(); g.arc(px(0), py(50), 28.5 * u, Math.PI, 2 * Math.PI); g.stroke();
  g.fillStyle = '#3b2616'; g.fillRect(px(-30), py(50), 3 * u, 46 * u);

  // THE CLOWN, around the clown cup: the cup is his mouth
  const cl = L.byId.clown;
  if (cl) clown(g, px(cl.x), py(cl.y + 1.2), u);

  // decorative field lines, like pinstriping on a cabinet
  g.strokeStyle = 'rgba(150, 30, 40, .35)'; g.lineWidth = 0.25 * u;
  for (const y of [30.5, 21.5]) { g.beginPath(); g.moveTo(px(-26), py(y)); g.lineTo(px(26), py(y)); g.stroke(); }

  // a plaque under every cup with the number it pays
  for (const p of L.pockets) plaque(g, px(p.x), py(p.y - p.depth - 0.4), u, p.pay);

  // the kickers' paint: a red chevron on each
  for (const s of L.segs) if (s.kind === 'kicker') {
    g.strokeStyle = '#8f1323'; g.lineWidth = 1.1 * u; g.lineCap = 'round';
    g.beginPath(); g.moveTo(px(s.ax), py(s.ay)); g.lineTo(px(s.bx), py(s.by)); g.stroke();
  }

  // the bottom: dark slots, the middle one marked as the coin back
  for (const s of L.slots) {
    const back = s.pay === 'back';
    g.fillStyle = back ? '#1e5a36' : '#2a1a12';
    g.fillRect(px(s.x0) + 2, py(5), (s.x1 - s.x0) * u - 4, 5 * u);
    g.fillStyle = back ? '#bff5cf' : 'rgba(240, 220, 180, .35)';
    g.font = `900 ${Math.round((back ? 2.2 : 1.5) * u)}px "Arial Black", Impact, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(back ? '1' : '—', px((s.x0 + s.x1) / 2), py(2.5));
  }

  // every nail throws a small shadow down and to the right: the only thing
  // that tells a flat texture the nails stand out of it
  g.fillStyle = 'rgba(40, 20, 10, .35)';
  for (const p of L.pins) { g.beginPath(); g.ellipse(px(p.x + 0.35), py(p.y - 0.45), 0.55 * u, 0.4 * u, 0, 0, Math.PI * 2); g.fill(); }

  // the name, painted across the bottom of the field
  g.font = `900 ${Math.round(3.6 * u)}px "Arial Black", Impact, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#b3172b';
  g.fillText('PAJATSO', px(0), py(11.2));

  // age: a fine speckle, fixed, so it does not crawl
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(90, 60, 30, ${0.04 + rnd() * 0.06})`;
    g.fillRect(rnd() * c.width, rnd() * c.height, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  return c;
}

function clown(g, x, y, u) {
  // hat: a striped cone with a pompom
  g.save();
  g.beginPath(); g.moveTo(x - 5 * u, y - 9 * u); g.lineTo(x, y - 18 * u); g.lineTo(x + 5 * u, y - 9 * u); g.closePath();
  g.fillStyle = '#2f5fb8'; g.fill();
  g.clip();
  g.fillStyle = '#f3d23a';
  for (let i = -3; i < 4; i++) g.fillRect(x + i * 2.4 * u, y - 18 * u, 1.1 * u, 10 * u);
  g.restore();
  g.fillStyle = '#fff4e0'; g.beginPath(); g.arc(x, y - 18 * u, 1.3 * u, 0, Math.PI * 2); g.fill();
  // hair tufts
  g.fillStyle = '#e8641e';
  for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * 6.2 * u, y - 5 * u, 2.4 * u, 0, Math.PI * 2); g.fill(); }
  // the face
  g.fillStyle = '#fbf3e6'; g.strokeStyle = '#2a1a12'; g.lineWidth = 0.35 * u;
  g.beginPath(); g.ellipse(x, y - 4 * u, 6 * u, 6.6 * u, 0, 0, Math.PI * 2); g.fill(); g.stroke();
  // eyes: crosses of blue paint, and brows
  g.strokeStyle = '#2f5fb8'; g.lineWidth = 0.55 * u;
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(x + s * 2.4 * u, y - 8.4 * u); g.lineTo(x + s * 2.4 * u, y - 5.6 * u);
    g.moveTo(x + s * 1.2 * u, y - 7 * u); g.lineTo(x + s * 3.6 * u, y - 7 * u); g.stroke();
  }
  g.fillStyle = '#2a1a12';
  for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * 2.4 * u, y - 7 * u, 0.5 * u, 0, Math.PI * 2); g.fill(); }
  // the nose
  g.fillStyle = '#e0202e'; g.beginPath(); g.arc(x, y - 4.2 * u, 1.35 * u, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(x - 0.45 * u, y - 4.6 * u, 0.4 * u, 0, Math.PI * 2); g.fill();
  // the painted lips round the mouth-cup
  g.strokeStyle = '#e0202e'; g.lineWidth = 0.9 * u;
  g.beginPath(); g.ellipse(x, y + 0.6 * u, 3.6 * u, 2.6 * u, 0, Math.PI * 0.05, Math.PI * 0.95); g.stroke();
  // a ruff
  g.fillStyle = '#f3d23a';
  for (let i = -3; i <= 3; i++) { g.beginPath(); g.arc(x + i * 1.9 * u, y + 3.4 * u, 1.1 * u, 0, Math.PI); g.fill(); }
}

function plaque(g, x, y, u, pay) {
  const n = PAYS[pay];
  const star = pay === JACKPOT;
  const w = star ? 6.4 * u : 4.4 * u, h = star ? 3.4 * u : 2.9 * u;
  g.fillStyle = star ? '#1f3f8f' : pay === 'clown' ? '#b3172b' : '#2a1a12';
  roundRect(g, x - w / 2, y, w, h, 0.6 * u); g.fill();
  g.strokeStyle = '#d9a632'; g.lineWidth = 0.25 * u; g.stroke();
  g.fillStyle = star ? '#ffe06a' : '#fff4e0';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `900 ${Math.round((star ? 2.0 : 2.3) * u)}px "Arial Black", Impact, sans-serif`;
  g.fillText(star ? `★${n}` : String(n), x, y + h / 2 + 0.1 * u);
  if (star) {
    g.font = `900 ${Math.round(0.95 * u)}px "Arial Black", Impact, sans-serif`;
    g.fillText('POTTI', x, y - 0.8 * u);
  }
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}

// the coin's face: a plain markka-ish disc, a ring and a 1
export function coinCanvas() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(50, 44, 10, 64, 64, 64);
  gr.addColorStop(0, '#fff6d8'); gr.addColorStop(0.6, '#d9b45a'); gr.addColorStop(1, '#8a6a22');
  g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 64, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(90, 60, 20, .8)'; g.lineWidth = 5; g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
  g.fillStyle = 'rgba(90, 60, 20, .85)'; g.font = '900 64px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1', 64, 68);
  return c;
}

// the sign on the header
export function signCanvas() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 192;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 192);
  gr.addColorStop(0, '#c81f34'); gr.addColorStop(1, '#7d0c1c');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 192);
  g.strokeStyle = '#d9a632'; g.lineWidth = 8; g.strokeRect(10, 10, 1004, 172);
  for (let x = 30; x < 1000; x += 38) { g.fillStyle = '#ffe9a0'; g.beginPath(); g.arc(x, 24, 5, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x, 168, 5, 0, Math.PI * 2); g.fill(); }
  g.font = '900 112px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = '#4a0610'; g.fillText('PAJATSO', 516, 104);
  g.fillStyle = '#ffe06a'; g.fillText('PAJATSO', 512, 98);
  return c;
}

// knotty pine panelling for the kiosk wall behind the machine
export function wallCanvas() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  let s = 11; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 8; i++) {
    const x = i * 64;
    g.fillStyle = `hsl(${28 + rnd() * 6}, ${38 + rnd() * 10}%, ${30 + rnd() * 8}%)`;
    g.fillRect(x, 0, 64, 512);
    for (let k = 0; k < 40; k++) {
      g.strokeStyle = `rgba(40, 20, 8, ${0.08 + rnd() * 0.1})`; g.lineWidth = 1 + rnd() * 2;
      g.beginPath(); const gx = x + rnd() * 64; g.moveTo(gx, 0); g.bezierCurveTo(gx + 6, 170, gx - 6, 340, gx + 3, 512); g.stroke();
    }
    if (rnd() < 0.7) { g.fillStyle = 'rgba(60, 30, 10, .5)'; g.beginPath(); g.ellipse(x + 20 + rnd() * 24, rnd() * 512, 4, 7, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x + 62, 0, 2, 512);
  }
  return c;
}
