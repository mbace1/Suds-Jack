// A picture on every card.
//
// Owner, 2026-09-04: "have basic pictures on each card". So each card carries a
// small painted panel above its text — a thing, not an icon. They are drawn on
// a 96×62 canvas in the same register as the puppets: flat fills, a heavy ink
// line that wobbles, one warm light from the left, and a wash of grime over
// the lot. Nothing is symmetrical and nothing is centred perfectly, because a
// card that looks stamped out reads as UI rather than as an object somebody
// painted.
//
// A picture is cheap to draw and there are at most ten on screen, so each is
// painted once and cached by `${pic}|${accent}` — a hand being re-rendered on
// every play must not repaint ten canvases.

const W = 96, H = 62;
const INK = '#17120e';
const cache = new Map();

function rngFrom(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function shade(hex, k) {
  if (hex[0] !== '#') return hex;
  const c = parseInt(hex.slice(1), 16);
  const ch = i => Math.max(0, Math.min(255, Math.round(((c >> (16 - i * 8)) & 255) * k)));
  return `rgb(${ch(0)},${ch(1)},${ch(2)})`;
}

// the shared hand: a wobbly filled polygon
function wob(ctx, pts, fill, rnd, { stroke = INK, width = 2.4, amp = 1.2, close = true } = {}) {
  ctx.beginPath();
  const n = pts.length;
  const last = close ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    const segs = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 9));
    for (let k = 0; k < segs; k++) {
      const t = k / segs;
      const x = x0 + (x1 - x0) * t + (rnd() - 0.5) * amp;
      const y = y0 + (y1 - y0) * t + (rnd() - 0.5) * amp;
      if (i === 0 && k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
  }
  if (close) ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); }
}

function blob(ctx, cx, cy, rx, ry, fill, rnd, opts) {
  const pts = [];
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; pts.push([cx + Math.cos(a) * rx * (0.9 + rnd() * 0.2), cy + Math.sin(a) * ry * (0.9 + rnd() * 0.2)]); }
  wob(ctx, pts, fill, rnd, opts);
}

const line = (ctx, x0, y0, x1, y1, c, w = 2.4) => {
  ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
};

// ── the pictures ─────────────────────────────────────────────────────────
// Each gets the canvas, the rng, and the card owner's accent so a character's
// own cards carry their colour.
const PICS = {
  fist(c, r, a) {
    wob(c, [[30, 46], [30, 26], [40, 18], [58, 18], [66, 26], [66, 44], [56, 50], [36, 50]], '#c08a68', r);
    for (const y of [26, 33, 40]) line(c, 44, y, 64, y, shade('#c08a68', 0.68), 2);
    wob(c, [[26, 30], [32, 26], [34, 40], [27, 42]], shade('#c08a68', 0.8), r);   // thumb
    for (let i = 0; i < 3; i++) line(c, 72 + i * 5, 20 + i * 4, 82 + i * 4, 14 + i * 5, a, 2);  // the swing
  },
  twofist(c, r, a) {
    wob(c, [[14, 40], [14, 24], [24, 18], [38, 18], [44, 25], [44, 42], [34, 47], [20, 46]], '#c08a68', r);
    wob(c, [[52, 46], [52, 28], [62, 22], [76, 22], [82, 29], [82, 46], [72, 51], [58, 50]], shade('#c08a68', 0.85), r);
    line(c, 46, 16, 54, 10, a, 2); line(c, 84, 20, 92, 14, a, 2);
  },
  can(c, r, a) {
    wob(c, [[36, 14], [60, 14], [62, 50], [34, 50]], '#8a8f94', r);
    wob(c, [[36, 12], [60, 12], [60, 18], [36, 18]], '#b0b6bc', r);
    c.fillStyle = a; c.fillRect(37, 26, 22, 11);
    line(c, 40, 20, 56, 20, shade('#8a8f94', 0.7), 1.6);
    c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(39, 16, 4, 32);
    line(c, 66, 22, 74, 16, '#9ab4c0', 2); line(c, 70, 34, 80, 30, '#9ab4c0', 2);   // fumes
  },
  bottle(c, r, a) {
    wob(c, [[40, 50], [40, 26], [45, 20], [45, 10], [55, 10], [55, 20], [60, 26], [60, 50]], '#4a6a4a', r);
    c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(43, 28, 4, 18);
    c.fillStyle = a; c.fillRect(41, 34, 18, 8);
    wob(c, [[44, 6], [56, 6], [56, 11], [44, 11]], '#7a3a2a', r);
  },
  bottlebreak(c, r, a) {
    wob(c, [[38, 52], [38, 34], [44, 26], [44, 16], [54, 16], [54, 26], [58, 32], [56, 40], [60, 52]], '#4a6a4a', r);
    wob(c, [[56, 30], [70, 20], [66, 32], [76, 30], [64, 40]], '#6a8a6a', r, { width: 2 });
    for (let i = 0; i < 5; i++) line(c, 62 + r() * 20, 12 + r() * 30, 70 + r() * 22, 8 + r() * 30, '#9ab89a', 1.6);
    c.fillStyle = a; c.fillRect(40, 40, 16, 7);
  },
  cardboard(c, r, a) {
    wob(c, [[16, 46], [24, 14], [72, 12], [80, 44]], '#9a7548', r);
    for (let y = 18; y < 44; y += 6) line(c, 22, y, 76, y - 1, shade('#9a7548', 0.78), 1.6);
    wob(c, [[30, 22], [56, 20], [58, 30], [32, 32]], 'rgba(238,222,182,0.7)', r, { width: 1.4 });  // tape
    c.fillStyle = a; c.fillRect(20, 46, 60, 4);
  },
  hand(c, r, a) {
    wob(c, [[26, 50], [24, 30], [30, 22], [40, 20], [56, 20], [68, 26], [70, 40], [58, 50]], '#c08a68', r);
    for (const x of [40, 50, 60]) line(c, x, 22, x, 34, shade('#c08a68', 0.7), 1.6);
    for (let i = 0; i < 3; i++) line(c, 20 - i * 3, 24 + i * 8, 12 - i * 3, 22 + i * 8, a, 1.6);
  },
  spray(c, r, a) {
    blob(c, 30, 34, 12, 14, '#7a8a4a', r);
    for (let i = 0; i < 14; i++) { const t = i / 14; blob(c, 42 + t * 46, 34 + Math.sin(i) * 16 * t, 2 + t * 4, 2 + t * 4, i % 2 ? '#8a9a5a' : a, r, { width: 1.2 }); }
  },
  double(c, r, a) {
    blob(c, 38, 32, 16, 18, shade(a, 0.9), r);
    c.globalAlpha = 0.55; blob(c, 54, 34, 16, 18, a, r); c.globalAlpha = 1;
    c.fillStyle = INK; c.fillRect(32, 26, 5, 6); c.fillRect(46, 27, 5, 6);
  },
  sunburst(c, r, a) {
    for (let i = 0; i < 12; i++) { const t = i / 12 * Math.PI * 2; line(c, 48 + Math.cos(t) * 14, 32 + Math.sin(t) * 14, 48 + Math.cos(t) * (26 + r() * 8), 32 + Math.sin(t) * (24 + r() * 8), a, 2.4); }
    blob(c, 48, 32, 13, 13, '#e8c86a', r);
  },
  guitar(c, r, a) {
    wob(c, [[22, 52], [16, 40], [24, 30], [36, 30], [44, 40], [40, 52], [30, 56]], '#8a5a2a', r);
    blob(c, 30, 42, 7, 7, '#20180f', r, { width: 1.6 });
    wob(c, [[38, 34], [72, 10], [78, 16], [44, 40]], '#6a4420', r);
    wob(c, [[72, 6], [84, 4], [86, 14], [74, 16]], '#3a2a1a', r);
    for (let i = 0; i < 3; i++) line(c, 34 + i * 2, 46 - i, 76 + i * 2, 12 - i, a, 1.2);
  },
  string(c, r, a) {
    wob(c, [[18, 50], [26, 46], [70, 14], [78, 10]], null, r, { close: false, width: 2, stroke: '#c8c0a8' });
    for (let i = 0; i < 6; i++) line(c, 44 + r() * 18, 26 + r() * 14, 52 + r() * 20, 18 + r() * 14, a, 1.6);
    blob(c, 22, 48, 4, 4, '#9a9a8a', r, { width: 1.4 });
  },
  hat(c, r, a) {
    wob(c, [[18, 44], [28, 22], [66, 20], [78, 42], [66, 50], [30, 50]], '#4a4038', r);
    wob(c, [[12, 44], [84, 42], [84, 50], [12, 52]], '#3a322c', r);
    for (let i = 0; i < 4; i++) blob(c, 34 + i * 10, 34 + (i % 2) * 5, 4, 4, a, r, { width: 1.4 });   // coins in it
  },
  crowd(c, r, a) {
    for (let i = 0; i < 7; i++) {
      const x = 10 + i * 12, h = 18 + r() * 14;
      wob(c, [[x, 52], [x, 52 - h], [x + 9, 52 - h], [x + 9, 52]], i % 3 ? '#3a3a44' : '#4a4450', r, { width: 1.6 });
      blob(c, x + 4, 50 - h, 4, 4, i % 2 ? '#b08868' : '#c09070', r, { width: 1.4 });
      if (i % 2) line(c, x + 4, 50 - h - 6, x + 4, 50 - h - 12, a, 2);
    }
  },
  note(c, r, a) {
    blob(c, 36, 44, 10, 8, a, r);
    wob(c, [[44, 44], [44, 12], [50, 12], [50, 44]], a, r);
    wob(c, [[50, 12], [76, 6], [76, 16], [50, 22]], a, r);
    line(c, 66, 24, 74, 18, '#c8c0a8', 1.6); line(c, 70, 34, 80, 30, '#c8c0a8', 1.6);
  },
  noise(c, r, a) {
    for (let i = 0; i < 5; i++) {
      const y = 12 + i * 10;
      c.strokeStyle = i % 2 ? a : '#8a8a94'; c.lineWidth = 2; c.beginPath();
      for (let x = 8; x < 88; x += 4) c.lineTo(x, y + (r() - 0.5) * 9);
      c.stroke();
    }
  },
  bin(c, r, a) {
    wob(c, [[24, 50], [28, 20], [70, 20], [74, 50]], '#4a5a4a', r);
    wob(c, [[20, 14], [78, 12], [78, 21], [20, 23]], '#3a4a3a', r);
    for (let x = 34; x < 68; x += 10) line(c, x, 24, x - 2, 48, shade('#4a5a4a', 0.75), 1.8);
    blob(c, 66, 12, 6, 5, a, r, { width: 1.6 });     // something worth having, on top
  },
  bag(c, r, a) {
    wob(c, [[24, 52], [20, 26], [34, 18], [64, 18], [78, 26], [74, 52]], '#8a8474', r);
    wob(c, [[36, 20], [40, 8], [58, 8], [62, 20]], null, r, { width: 2.2 });
    for (let i = 0; i < 4; i++) blob(c, 32 + i * 12, 32 + (i % 2) * 8, 5, 6, i % 2 ? '#4a6a4a' : a, r, { width: 1.4 });
  },
  haul(c, r, a) {
    for (let i = 0; i < 6; i++) {
      const x = 14 + (i % 3) * 24, y = 22 + Math.floor(i / 3) * 18;
      wob(c, [[x, y + 16], [x, y], [x + 18, y], [x + 18, y + 16]], i % 2 ? '#4a6a4a' : '#8a8f94', r, { width: 1.8 });
    }
    c.fillStyle = a; c.fillRect(12, 52, 72, 4);
  },
  coin(c, r, a) {
    blob(c, 40, 34, 15, 15, '#c8a83a', r);
    blob(c, 40, 34, 8, 8, shade('#c8a83a', 0.78), r, { width: 1.4 });
    blob(c, 62, 42, 11, 11, '#a89030', r);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(33, 26, 5, 5);
    line(c, 20, 16, 28, 22, a, 1.6);
  },
  shove(c, r, a) {
    wob(c, [[10, 44], [10, 26], [22, 20], [40, 22], [44, 34], [40, 46], [22, 48]], '#c08a68', r);
    wob(c, [[54, 50], [56, 18], [68, 14], [72, 50]], '#5a4a3a', r);   // the shoved figure
    blob(c, 64, 12, 7, 7, '#b08868', r, { width: 1.8 });
    for (let i = 0; i < 3; i++) line(c, 44 + i * 3, 26 + i * 6, 52 + i * 3, 24 + i * 7, a, 2);
  },
  cart(c, r, a) {
    wob(c, [[16, 40], [22, 16], [76, 16], [70, 40]], '#8a9098', r);
    for (let x = 26; x < 70; x += 8) line(c, x, 18, x - 2, 38, shade('#8a9098', 0.72), 1.6);
    line(c, 18, 26, 74, 26, shade('#8a9098', 0.72), 1.6);
    blob(c, 26, 48, 6, 6, '#2a2a2e', r, { width: 1.6 }); blob(c, 62, 48, 6, 6, '#2a2a2e', r, { width: 1.6 });
    wob(c, [[70, 16], [84, 10], [86, 16], [72, 22]], a, r, { width: 1.8 });
  },
  rattle(c, r, a) {
    wob(c, [[30, 48], [34, 18], [62, 18], [66, 48]], '#8a9098', r);
    for (let i = 0; i < 6; i++) line(c, 22 - (i % 3) * 4, 20 + i * 5, 14 - (i % 3) * 4, 18 + i * 5, a, 1.8);
    for (let i = 0; i < 6; i++) line(c, 74 + (i % 3) * 4, 20 + i * 5, 82 + (i % 3) * 4, 18 + i * 5, a, 1.8);
  },
  stack(c, r, a) {
    for (let i = 0; i < 4; i++) {
      const y = 46 - i * 10, w = 60 - i * 8;
      wob(c, [[48 - w / 2, y], [48 + w / 2, y - 1], [48 + w / 2, y - 9], [48 - w / 2, y - 8]], i % 2 ? '#9a7548' : '#8a6740', r, { width: 1.8 });
    }
    c.fillStyle = a; c.fillRect(20, 48, 56, 4);
  },
  sweep(c, r, a) {
    wob(c, [[12, 46], [24, 20], [40, 20], [30, 46]], '#8a9098', r);
    for (let i = 0; i < 5; i++) { const t = i / 5; line(c, 40 + t * 40, 18 + t * 6, 48 + t * 40, 34 + t * 6, a, 2.4); }
    blob(c, 78, 40, 8, 9, '#5a4a3a', r, { width: 1.8 });
  },
  bridge(c, r, a) {
    wob(c, [[6, 30], [90, 26], [90, 38], [6, 42]], '#6a563e', r);
    for (let x = 12; x < 86; x += 11) line(c, x, 28, x, 41, shade('#6a563e', 0.7), 1.8);
    for (const x of [20, 68]) wob(c, [[x, 40], [x + 7, 40], [x + 7, 58], [x, 58]], '#4a3c2c', r, { width: 1.8 });
    c.fillStyle = a; c.fillRect(6, 26, 84, 2);
    line(c, 6, 50, 90, 48, '#3a4448', 3);   // the water under it
  },
  coat(c, r, a) {
    wob(c, [[26, 54], [22, 22], [34, 12], [62, 12], [74, 22], [70, 54]], '#4a4438', r);
    wob(c, [[46, 14], [52, 14], [50, 54], [46, 54]], shade('#4a4438', 0.7), r, { width: 1.6 });
    for (let i = 0; i < 3; i++) blob(c, 44, 24 + i * 10, 2.5, 2.5, a, r, { width: 1.2 });
    for (let i = 0; i < 6; i++) line(c, 16 + i * 13, 4 + (i % 2) * 4, 13 + i * 13, 14 + (i % 2) * 4, '#8aa0b0', 1.4);
  },
  shout(c, r, a) {
    wob(c, [[12, 40], [18, 18], [46, 14], [56, 26], [50, 44], [24, 48], [14, 56]], '#e0d8c0', r);
    c.fillStyle = INK;
    c.font = 'bold 17px system-ui, sans-serif';
    c.fillText('!?', 24, 38);
    for (let i = 0; i < 3; i++) line(c, 60 + i * 8, 20 + i * 8, 72 + i * 8, 16 + i * 9, a, 2);
  },
  lamp(c, r, a) {
    line(c, 68, 58, 66, 16, '#3a3a3e', 4);
    wob(c, [[44, 12], [66, 8], [70, 16], [48, 20]], '#3a3a3e', r);
    blob(c, 48, 20, 9, 7, '#e8d08a', r, { width: 1.6 });
    c.globalAlpha = 0.3;
    wob(c, [[40, 22], [58, 22], [78, 58], [18, 58]], '#e8d08a', r, { stroke: null });
    c.globalAlpha = 1;
    for (let i = 0; i < 5; i++) line(c, 20 + i * 14, 4 + (i % 2) * 6, 17 + i * 14, 16 + (i % 2) * 6, a, 1.2);
  },
  rain(c, r, a) {
    for (let i = 0; i < 22; i++) { const x = r() * W, y = r() * H; line(c, x, y, x - 5, y + 11, '#8aa0b0', 1.6); }
    wob(c, [[24, 54], [22, 34], [34, 26], [58, 26], [70, 34], [68, 54]], '#4a4438', r);
    c.globalAlpha = 0.5; c.fillStyle = '#20303a'; c.fillRect(0, 0, W, H); c.globalAlpha = 1;
  },
};

// ── the pass over everything: light, grime, and the edge of the panel ────
function finish(ctx, rnd) {
  // one warm light from the left, and the right side falling into the dark
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, 'rgba(255,224,168,0.16)');
  g.addColorStop(0.55, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(10,8,14,0.34)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // grime: specks and two smears, so no two cards are equally clean
  for (let i = 0; i < 170; i++) {
    ctx.fillStyle = rnd() > 0.45 ? 'rgba(0,0,0,0.13)' : 'rgba(255,246,220,0.10)';
    ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd());
  }
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 3; i++) { ctx.fillStyle = '#3a2c18'; ctx.beginPath(); ctx.ellipse(rnd() * W, rnd() * H, 10 + rnd() * 20, 4 + rnd() * 8, rnd() * 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;
}

// paint one card picture. `pic` is the key in the card's data entry.
export function paintCardPic(pic, accent = '#c8a03a', seed = 1) {
  const key = `${pic}|${accent}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const rnd = rngFrom(seed * 2654435761 + pic.length * 7919);
  // the ground of the panel: a flat dirty wash, lighter at the top
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#8f8674'); bg.addColorStop(1, '#5d5648');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  (PICS[pic] ?? PICS.fist)(ctx, rnd, accent);
  finish(ctx, rnd);
  cache.set(key, c);
  return c;
}

export const PIC_KEYS = Object.keys(PICS);
