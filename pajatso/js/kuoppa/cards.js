// The picture on each part's card — the sheet that says what was just bolted
// onto the machine. Drawn in code like everything else here, in a parts
// catalogue's register: the part alone on the red of the face, lit, big, with
// the thing it does shown happening (owner, v4: "not sure what tulips are
// here" — so the card SHOWS a tulip catching a coin).

import { drawSymbol } from '../view/textures.js?v=6';

const W = 360, H = 180;

function coin(g, x, y, r = 11) {
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
  gr.addColorStop(0, '#fff3c8'); gr.addColorStop(0.6, '#d5b15a'); gr.addColorStop(1, '#86651f');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(90,60,20,.8)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x, y, r * 0.78, 0, Math.PI * 2); g.stroke();
}
function nail(g, x, y) { g.fillStyle = '#eef2f6'; g.beginPath(); g.arc(x, y, 3.2, 0, Math.PI * 2); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(x + 2, y + 2, 3, 0, Math.PI * 2); g.fill(); }
function trail(g, pts) { g.strokeStyle = 'rgba(255,240,180,.55)'; g.setLineDash([4, 5]); g.lineWidth = 2; g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.stroke(); g.setLineDash([]); }
function petal(g, x, y, side, open) {
  g.save(); g.translate(x, y); g.rotate(side * (0.15 + open * 0.8)); g.scale(-side, 1);
  const gr = g.createLinearGradient(0, 0, 20, -50); gr.addColorStop(0, '#8a0a18'); gr.addColorStop(1, '#ff4050');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-18, -26, -6, -54); g.quadraticCurveTo(6, -40, 10, -8); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(255,200,200,.6)'; g.lineWidth = 1.5; g.stroke();
  g.restore();
}

const DRAW = {
  chucker(g) {
    // the yakumono: a gold frame, the LCD with three reels, the stage, the heso
    g.fillStyle = '#2a1446'; g.beginPath(); g.moveTo(90, 118); g.lineTo(90, 44); g.lineTo(180, 14); g.lineTo(270, 44); g.lineTo(270, 118); g.lineTo(180, 136); g.closePath(); g.fill();
    g.strokeStyle = '#f0c040'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#0b0620'; g.fillRect(110, 50, 140, 62);
    ['seven', 'seven', 'cherry'].forEach((n, i) => { g.save(); g.translate(118 + i * 45, 62); drawSymbol(g, n, 32); g.restore(); });
    g.fillStyle = 'rgba(255,40,70,.85)'; g.fillRect(110, 76, 140, 14); g.fillStyle = '#fff'; g.font = 'bold 12px "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText('REACH!', 180, 87);
    g.fillStyle = '#6fe0ff'; g.fillRect(86, 70, 7, 22);                          // the warp
    nail(g, 163, 150); nail(g, 197, 150);                                     // life nails
    g.fillStyle = '#0c0c0e'; g.fillRect(166, 150, 28, 24);
    g.fillStyle = '#0f3d22'; g.fillRect(160, 164, 40, 14); g.fillStyle = '#bff5cf'; g.font = 'bold 10px "Arial Black", sans-serif'; g.fillText('ヘソ', 180, 175);
    trail(g, [[40, 20], [80, 80], [96, 82], [150, 126], [180, 140], [180, 158]]);
    coin(g, 180, 160, 10);
  },
  tulips(g) {
    // two tulips: one shut, one with its petals swung open catching a coin
    for (const [x, open] of [[110, 0], [250, 1]]) {
      g.fillStyle = '#0c0c0e'; g.fillRect(x - 16, 96, 32, 44);
      g.fillStyle = '#c8102e'; g.beginPath(); g.ellipse(x, 140, 26, 9, 0, 0, Math.PI * 2); g.fill();
      petal(g, x - 16, 100, -1, open); petal(g, x + 16, 100, 1, open);
      g.fillStyle = '#3c8a2a'; g.fillRect(x - 3, 148, 6, 22);
      g.fillStyle = open ? '#ffe060' : '#5a4a10'; g.beginPath(); g.arc(x, 128, 5, 0, Math.PI * 2); g.fill();
    }
    trail(g, [[300, 10], [270, 50], [252, 90], [250, 116]]);
    coin(g, 250, 118, 11);
    g.fillStyle = '#fff'; g.font = 'bold 13px "Arial Black", sans-serif'; g.textAlign = 'center';
    g.fillText('SHUT', 110, 30); g.fillText('OPEN', 250, 30);
  },
  fever(g) {
    // the attacker: a red flap tipped open under a row of windows, coins pouring in
    for (let i = 0; i < 5; i++) { g.fillStyle = '#c9ccd0'; g.fillRect(40 + i * 60, 24, 44, 30); g.fillStyle = '#0c0c0e'; g.fillRect(48 + i * 60, 30, 28, 18); }
    g.fillStyle = '#e8e8ec'; g.fillRect(70, 118, 220, 8);
    g.fillStyle = '#d4182c'; g.beginPath(); g.moveTo(70, 118); g.lineTo(290, 118); g.lineTo(300, 92); g.lineTo(80, 92); g.closePath(); g.fill();
    g.fillStyle = '#0c0c0e'; g.fillRect(74, 126, 212, 20);
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#ffd23f' : '#ff6a3a'; g.beginPath(); g.arc(88 + i * 23, 136, 5, 0, Math.PI * 2); g.fill(); }
    [[130, 70], [175, 84], [220, 64], [250, 100]].forEach(([x, y]) => coin(g, x, y, 9));
    g.fillStyle = '#ffd23f'; g.font = 'bold 22px "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText('大当たり', 180, 172);
  },
  windmills(g) {
    for (const [x, y, rot] of [[110, 90, 0.2], [250, 90, 0.9]]) {
      g.save(); g.translate(x, y); g.rotate(rot);
      for (let k = 0; k < 4; k++) {
        g.save(); g.rotate(k * Math.PI / 2);
        g.fillStyle = k % 2 ? '#ffd23f' : '#d4182c';
        g.beginPath(); g.moveTo(0, 0); g.lineTo(10, 6); g.quadraticCurveTo(44, 36, 56, 4); g.closePath(); g.fill();
        g.restore();
      }
      g.fillStyle = '#eef2f6'; g.beginPath(); g.arc(0, 0, 7, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    for (const [x, y] of [[40, 40], [180, 40], [320, 40], [180, 140], [40, 150], [320, 150]]) nail(g, x, y);
    trail(g, [[180, 0], [160, 50], [128, 70], [70, 60], [40, 110]]);
    coin(g, 40, 112, 10);
  },
  chain(g) {
    // the LCD gone gold for 確変, and the electric tulip with its wings open
    g.fillStyle = '#3a2400'; g.fillRect(40, 20, 170, 100);
    g.strokeStyle = '#ffd23f'; g.lineWidth = 5; g.strokeRect(40, 20, 170, 100);
    ['seven', 'seven', 'seven'].forEach((n, i) => { g.save(); g.translate(56 + i * 52, 44); drawSymbol(g, n, 32); g.restore(); });
    g.fillStyle = '#ffd23f'; g.font = 'bold 24px "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText('確変', 125, 110);
    g.fillStyle = '#0c0c0e'; g.fillRect(270, 100, 30, 36);
    g.fillStyle = '#1060d0';
    g.beginPath(); g.moveTo(270, 102); g.lineTo(240, 74); g.lineTo(248, 70); g.lineTo(274, 96); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(300, 102); g.lineTo(330, 74); g.lineTo(322, 70); g.lineTo(296, 96); g.closePath(); g.fill();
    g.fillStyle = '#10306a'; g.fillRect(260, 140, 50, 16); g.fillStyle = '#bfe0ff'; g.font = 'bold 11px "Arial Black", sans-serif'; g.fillText('電チュー', 285, 152);
    trail(g, [[350, 10], [320, 50], [290, 80], [285, 110]]);
    coin(g, 285, 112, 10);
    g.fillStyle = '#fff'; g.font = 'bold 13px "Arial Black", sans-serif'; g.fillText('RUSH ▸', 300, 40);
  },
  multiplier(g) {
    for (const [x, lbl] of [[110, 'R'], [250, '×3']]) {
      g.fillStyle = '#c9ccd0'; g.fillRect(x - 40, 50, 80, 70);
      g.fillStyle = '#0c0c0e'; g.fillRect(x - 20, 58, 40, 32);
      g.fillStyle = '#101012'; g.fillRect(x - 30, 96, 60, 20);
      g.fillStyle = lbl === 'R' ? '#f4f4f4' : '#ffd23f'; g.font = 'bold 16px "Arial Black", sans-serif'; g.textAlign = 'center'; g.fillText(lbl, x, 112);
    }
    g.fillStyle = '#fff'; g.font = 'bold 28px "Arial Black", sans-serif'; g.fillText('→', 180, 94);
    coin(g, 250, 74, 10);
    [[300, 60], [318, 84], [300, 108]].forEach(([x, y]) => coin(g, x, y, 8));
  },
};

export function partCard(part) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#5e0a12'); bg.addColorStop(1, '#9c1420');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  DRAW[part]?.(g);
  return c;
}
