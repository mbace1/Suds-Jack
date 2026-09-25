// Toko Move — THE WEEK AS A POSTER (leap 5, v2.54).
//
// Friday's end card used to be text you could copy. It is also a picture now:
// the city's lines faint in the dark, the five routes you actually rode drawn
// over them in five colours, and under them each day's grid and money, the
// rent, and the kit you carried. One image, 1080 × 1350 (a phone's 4:5), made
// from the week's own save — the trails were recorded shift by shift as you
// played, because each day was a separate page and a poster drawn from memory
// would have nothing to draw.
//
// No DOM beyond the canvas it is handed, no network, no fonts to fetch.
export const W = 1080, H = 1350;
export const DAY_COLOURS = ['#e2683c', '#5aa860', '#2f9fb8', '#e0b43c', '#9b59b6'];
const GRID = { ok: '#5aa860', late: '#e0b43c', none: '#3a4148' };

// The box every trail (or, with none, every line) fits in.
export function bounds(week, layers = []) {
  const pts = [];
  for (const s of week?.shifts || []) for (const p of s?.trail || []) pts.push(p);
  if (pts.length < 2) for (const l of layers) for (const p of l.path || []) pts.push(p);
  if (!pts.length) return null;
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const [lat, lon] of pts) { a = Math.min(a, lat); b = Math.max(b, lat); c = Math.min(c, lon); d = Math.max(d, lon); }
  const pad = Math.max(b - a, (d - c) * 0.55) * 0.12 + 0.002;
  return { s: a - pad, n: b + pad, w: c - pad, e: d + pad };
}
// lat/lon → poster pixels inside the map frame, keeping the city's shape.
export function projector(box, frame) {
  const lat0 = (box.s + box.n) / 2, k = Math.cos(lat0 * Math.PI / 180);
  const sx = frame.w / ((box.e - box.w) * k), sy = frame.h / (box.n - box.s), sc = Math.min(sx, sy);
  const ox = frame.x + (frame.w - (box.e - box.w) * k * sc) / 2, oy = frame.y + (frame.h - (box.n - box.s) * sc) / 2;
  return (lat, lon) => ({ x: ox + (lon - box.w) * k * sc, y: oy + (box.n - lat) * sc });
}

export function drawPoster(canvas, { week, layers = [], rent = 0, verdict = null, kit = [], title = 'TOKO MOVE' } = {}) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#15262b'; ctx.fillRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.fillStyle = '#fffdf7'; ctx.font = '900 76px ui-monospace, monospace'; ctx.fillText(title, 60, 120);
  ctx.fillStyle = '#9fb0b6'; ctx.font = '700 30px ui-monospace, monospace'; ctx.fillText(`WEEK ${week?.seed ?? ''} · HELSINKI · MON–FRI`, 64, 164);
  const frame = { x: 40, y: 200, w: W - 80, h: 820 };
  ctx.fillStyle = '#1b2f35'; ctx.beginPath(); ctx.roundRect(frame.x, frame.y, frame.w, frame.h, 24); ctx.fill();
  const box = bounds(week, layers);
  if (box) {
    const P = projector(box, { x: frame.x + 30, y: frame.y + 30, w: frame.w - 60, h: frame.h - 60 });
    ctx.save(); ctx.beginPath(); ctx.roundRect(frame.x, frame.y, frame.w, frame.h, 24); ctx.clip();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const l of layers) { const path = l.path || []; if (path.length < 2) continue;
      ctx.strokeStyle = l.colour || '#52676d'; ctx.globalAlpha = 0.28; ctx.lineWidth = 4; ctx.beginPath();
      path.forEach(([lat, lon], i) => { const q = P(lat, lon); i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.stroke(); }
    ctx.globalAlpha = 1;
    (week?.shifts || []).forEach((s, i) => { const t = s?.trail || []; if (t.length < 1) return; const col = DAY_COLOURS[i % 5];
      ctx.strokeStyle = '#0f1418'; ctx.lineWidth = 16; ctx.beginPath(); t.forEach(([lat, lon], j) => { const q = P(lat, lon); j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y); }); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = 9; ctx.stroke();
      const a = P(t[0][0], t[0][1]), z = P(t[t.length - 1][0], t[t.length - 1][1]);
      ctx.fillStyle = col; ctx.strokeStyle = '#fffdf7'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(a.x, a.y, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fffdf7'; ctx.beginPath(); ctx.arc(z.x, z.y, 12, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.stroke(); });
    ctx.restore();
  }
  // five days: name, grid, money
  const cw = (W - 80) / 5, y0 = 1070;
  (week?.shifts || []).forEach((s, i) => { const x = 40 + i * cw + cw / 2, col = DAY_COLOURS[i % 5];
    ctx.textAlign = 'center'; ctx.fillStyle = col; ctx.font = '900 30px ui-monospace, monospace'; ctx.fillText((s?.name || '').slice(0, 3), x, y0);
    const r = s?.results || []; for (let k = 0; k < 3; k++) { ctx.fillStyle = GRID[r[k]] || GRID.none; ctx.beginPath(); ctx.roundRect(x - 52 + k * 36, y0 + 18, 30, 30, 6); ctx.fill(); }
    ctx.fillStyle = '#fffdf7'; ctx.font = '800 32px ui-monospace, monospace'; ctx.fillText(`€${s?.euros ?? 0}${s?.left ? '*' : ''}`, x, y0 + 92); });
  ctx.textAlign = 'left'; const v = verdict;
  if (v) { ctx.fillStyle = v.paid ? '#7ac478' : '#e2683c'; ctx.font = '900 44px ui-monospace, monospace';
    ctx.fillText(v.paid ? `RENT PAID · €${v.over} OVER` : `SHORT €${-v.over} ON THE RENT`, 60, 1260); }
  ctx.fillStyle = '#9fb0b6'; ctx.font = '700 26px ui-monospace, monospace'; ctx.fillText(`rent €${rent} · €${v?.total ?? 0} earned`, 62, 1300);
  if (kit.length) { ctx.textAlign = 'right'; ctx.font = '44px sans-serif'; ctx.fillText(kit.join(' '), W - 60, 1296); }
  return canvas;
}
