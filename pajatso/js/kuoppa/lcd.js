// The reel screen in the box on top of the case: three reels, the REACH that
// holds its breath, the winning line, the hold lamps, and between spins what
// the machine wants of you. Redrawn every frame the view draws; the symbols
// are the old pit's pixel art (../view/textures.js).

import { makeReelScreen } from '../view/textures.js?v=10';
import { LINES, STOP_ORDER } from '../reels.js?v=10';
import { HOLD } from './data.js?v=10';

// the screen in the yakumono is wide, so the reel canvas is too
export function makeLcd() {
  const base = makeReelScreen();
  const c = document.createElement('canvas'); c.width = 240; c.height = 128;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  base.texture.image = c; base.texture.needsUpdate = true;
  return { ...base, canvas: c, ctx, W: 240, H: 128, lastGrid: null };
}

export function drawLcd(scr, g0, time, words) {
  const { ctx: g, W, H, sheet } = scr;
  const cellH = 34, top = 8, colW = W / 3;
  const fever = g0.fever > 0, chance = g0.chance > 0;
  g.fillStyle = fever ? '#2a1600' : chance ? '#1a0024' : '#0b0620'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 18; i++) {
    const x = (i * 53 + time * (8 + i % 5)) % W, y = (i * 29) % H;
    g.fillStyle = fever ? 'rgba(255,200,80,0.35)' : 'rgba(150,120,255,0.3)'; g.fillRect(x | 0, y, 1, 1);
  }
  const s = g0.spin;
  for (let k = 0; k < 3; k++) {
    const x0 = k * colW;
    g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(x0 + 3, top - 2, colW - 6, cellH * 3 + 4);
    let offset = 0, spinning = false, col = s ? s.grid[k] : scr.lastGrid?.[k];
    if (s) {
      const left = s.stops[k] - s.t;
      if (left > 0) {
        spinning = true;
        // fast, then easing into the stop; a reach reel crawls its last second and a half
        const isReach = s.reach && k === STOP_ORDER[2];
        offset = left * (isReach && left < 1.9 ? 2.2 + left * 3 : 14);
      }
    }
    for (let r = -1; r < 4; r++) {
      let name;
      const pos = r - offset, rowIdx = Math.floor(pos), frac = pos - rowIdx;
      if (spinning) name = rowIdx >= 0 && rowIdx < 3 && col ? col[rowIdx] : sheet.names[Math.abs(rowIdx * 7 + k * 3) % sheet.names.length];
      else { if (r < 0 || r > 2) continue; name = col ? col[r] : sheet.names[(r + k * 2) % sheet.names.length]; }
      const yy = spinning ? top + (r - frac) * cellH : top + r * cellH;
      const si = sheet.names.indexOf(name);
      if (si < 0 || yy < -cellH || yy > H) continue;
      g.globalAlpha = spinning ? 0.75 : 1;
      g.drawImage(sheet.canvas, si * sheet.size, 0, sheet.size, sheet.size, x0 + (colW - 32) / 2, yy + 1, 32, 32);
      g.globalAlpha = 1;
    }
  }
  if (s && s.t >= s.stops[STOP_ORDER[2]] && s.line) {
    g.strokeStyle = s.outcome === 'mask' ? '#ff3030' : '#ffe14a'; g.lineWidth = 3;
    g.beginPath();
    LINES[s.line].forEach(([rk, rw], i) => { const x = rk * colW + colW / 2, y = top + rw * cellH + cellH / 2; i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
  }
  if (s) scr.lastGrid = s.grid;
  const say = (text, y, col = '#ffe14a') => { g.fillStyle = col; g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, W / 2, y); };
  if (s && s.reach && s.t >= s.stops[STOP_ORDER[1]] && s.t < s.stops[STOP_ORDER[2]] && Math.floor(time * 6) % 2) {
    g.fillStyle = 'rgba(255,40,70,0.85)'; g.fillRect(0, H / 2 - 12, W, 24);
    g.fillStyle = '#fff'; g.font = 'bold 18px "Arial Black", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(words.reach, W / 2, H / 2 + 1);
  }
  if (fever) { g.fillStyle = '#ffd23f'; g.font = 'bold 11px monospace'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(`FEVER ${g0.fever - 1}`, 4, H - 13); g.textAlign = 'right'; g.fillText('▸▸', W - 4, H - 13); }
  else if (chance) { g.fillStyle = '#e080ff'; g.font = 'bold 11px monospace'; g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(`CHANCE ${g0.chance}`, 4, H - 13); }
  // the hold lamps: spins waiting their turn
  for (let i = 0; i < HOLD; i++) {
    g.fillStyle = i < g0.spins.length ? '#ff4d6d' : '#2a1a3a';
    g.beginPath(); g.arc(W / 2 - 21 + i * 14, H - 5, 3.2, 0, Math.PI * 2); g.fill();
  }
  if (!s && (g0.phase === 'shop' || g0.phase === 'due')) {
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, W, H);
    if (Math.floor(time * 1.5) % 2) say(g0.phase === 'due' ? words.lcdDue : words.lcdShop, H / 2, '#b89cff');
  }
  scr.texture.needsUpdate = true;
}
