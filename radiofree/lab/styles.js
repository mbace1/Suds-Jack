// Radio Free Helsinki — STYLE LAB.
//
// Three candidate looks for the films, drawn over ONE shared scene so they can
// be compared on the art alone: the Godot bulletin (a ministry that opened its
// forecast with a line from a play about two men waiting by a tree). Every
// look is LAYERED — sky, city, water, ground, figures, type — and every layer
// is a pure function of t, so any of them can be pushed, parallaxed and cut
// the way film.js already cuts the pixel panels.
//
//   riso   — three fluorescent spot inks on paper, misregistered, halftoned
//   paper  — cut-paper diorama: real depth, drop shadows, fibre texture
//   neon   — motion graphic: saturated gradients, extruded type, glow; the old
//            terminal survives as the TEXTURE behind it, not the picture
//
// Nothing here is wired into the station yet. This is where a look is chosen.

import { drawMasterBadge } from '../../toko/js/master.js';

export const W = 1080, H = 1920;

export const STYLES = {
  riso:  { name: 'A · Riso print' },
  paper: { name: 'B · Paper diorama' },
  neon:  { name: 'C · Motion graphic' },
};

export async function ready() {
  await Promise.all(['Anton', 'Archivo Black', 'Space Grotesk'].map(f => document.fonts.load(`80px "${f}"`)));
}

// ── shared bits ────────────────────────────────────────────────────────────
const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (k) => (k = clamp(k), k * k * (3 - 2 * k));
const eob = (k) => { k = clamp(k); const c = 1.70158; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const canvas = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

const COPY = {
  slug: 'VALTIO · 26.09',
  kicker: 'THE OFFICE OF TOMORROW OY',
  head: ['WE EXPECTED', 'HIM TOMORROW.', 'HE CAME', 'YESTERDAY.'],
  sub: 'Growth of 1.8% forecast. The deficit rises to 4.5%.',
  fig: '+1.8%',
};

// Helsinki Cathedral, as SHAPES: podium, colonnade, pediment, drum, dome,
// lantern, and the four small corner domes. `ink` paints each part and may be
// one colour (riso: one plate) or a set (paper: white body, green domes).
function cathedral(ctx, cx, base, s, ink) {
  const body = ink.body, dome = ink.dome || ink.body, dark = ink.dark || null;
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(cx + x * s, base - (y + h) * s, w * s, h * s); };
  // steps and podium
  R(-260, 0, 520, 30, body); R(-230, 30, 460, 40, body);
  // main block and portico
  R(-200, 70, 400, 170, body);
  if (dark) for (let i = 0; i < 6; i++) R(-150 + i * 60, 80, 14, 130, dark); // column shadows
  // pediment
  ctx.fillStyle = body; ctx.beginPath();
  ctx.moveTo(cx - 170 * s, base - 240 * s); ctx.lineTo(cx, base - 300 * s); ctx.lineTo(cx + 170 * s, base - 240 * s); ctx.fill();
  // drum
  R(-90, 240, 180, 120, body);
  if (dark) for (let i = 0; i < 5; i++) R(-70 + i * 32, 262, 10, 70, dark);
  // dome
  ctx.fillStyle = dome; ctx.beginPath();
  ctx.ellipse(cx, base - 360 * s, 105 * s, 115 * s, 0, Math.PI, 0); ctx.fill();
  R(-14, 470, 28, 40, dome);                    // lantern
  ctx.beginPath(); ctx.ellipse(cx, base - 510 * s, 20 * s, 26 * s, 0, Math.PI, 0); ctx.fill();
  R(-3, 536, 6, 44, dome); R(-14, 560, 28, 6, dome); // cross
  // corner domes
  for (const x of [-230, 230]) {
    R(x - 26, 240, 52, 60, body);
    ctx.fillStyle = dome; ctx.beginPath();
    ctx.ellipse(cx + x * s, base - 300 * s, 34 * s, 40 * s, 0, Math.PI, 0); ctx.fill();
    R(x - 3, 340, 6, 30, dome);
  }
}

// a bare tree — the one in the play — grown from a seed, swaying with t
function tree(ctx, x, y, s, t, color, width = 1) {
  const r = rng(7);
  ctx.strokeStyle = color; ctx.lineCap = 'round';
  const branch = (x, y, a, len, w, d) => {
    const sway = Math.sin(t * 1.3 + d * 0.9) * 0.025 * d;
    const x2 = x + Math.cos(a + sway) * len, y2 = y + Math.sin(a + sway) * len;
    ctx.lineWidth = w * width; ctx.beginPath(); ctx.moveTo(x, y);
    ctx.quadraticCurveTo((x + x2) / 2 + (r() - 0.5) * len * 0.3, (y + y2) / 2, x2, y2); ctx.stroke();
    if (d < 6 && len > 14 * s) {
      const n = d < 2 ? 2 : 2 + (r() > 0.6);
      for (let i = 0; i < n; i++) branch(x2, y2, a + (r() - 0.5) * 1.3, len * (0.62 + r() * 0.16), w * 0.62, d + 1);
    }
  };
  branch(x, y, -Math.PI / 2 - 0.05, 260 * s, 38 * s, 0);
}

// Vladimir and Estragon, as a silhouette pair: coats, bowler hats, one
// checking the road. `fill` is the coat, `hat` the hat.
function waiters(ctx, x, y, s, t, fill, hat) {
  const one = (px, lean, look) => {
    const bob = Math.sin(t * 2 + px) * 2 * s;
    ctx.fillStyle = fill;
    ctx.beginPath(); // coat
    ctx.moveTo(px - 26 * s, y); ctx.lineTo(px - 18 * s + lean, y - 120 * s + bob);
    ctx.lineTo(px + 18 * s + lean, y - 120 * s + bob); ctx.lineTo(px + 28 * s, y); ctx.fill();
    ctx.fillRect(px - 20 * s, y, 12 * s, 10 * s); ctx.fillRect(px + 8 * s, y, 12 * s, 10 * s);
    ctx.beginPath(); ctx.arc(px + lean + look, y - 140 * s + bob, 20 * s, 0, TAU); ctx.fill(); // head
    ctx.fillStyle = hat; // bowler
    ctx.beginPath(); ctx.ellipse(px + lean + look, y - 152 * s + bob, 28 * s, 6 * s, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(px + lean + look, y - 156 * s + bob, 18 * s, Math.PI, 0); ctx.fill();
  };
  one(x - 50 * s, -4 * s, -4 * s);
  one(x + 50 * s, 6 * s, 8 * s * Math.sin(t * 0.7));
}

// the Helsinki tram, 1960s outline, crossing
function tram(ctx, x, y, s, body, win, stripe) {
  ctx.fillStyle = body;
  round(ctx, x, y - 110 * s, 420 * s, 100 * s, 22 * s); ctx.fill();
  ctx.fillRect(x + 190 * s, y - 150 * s, 4 * s, 40 * s);              // pantograph
  ctx.fillRect(x + 150 * s, y - 152 * s, 90 * s, 4 * s);
  ctx.fillStyle = win;
  for (let i = 0; i < 6; i++) { round(ctx, x + (22 + i * 64) * s, y - 96 * s, 48 * s, 40 * s, 6 * s); ctx.fill(); }
  if (stripe) { ctx.fillStyle = stripe; ctx.fillRect(x + 8 * s, y - 44 * s, 404 * s, 10 * s); }
  ctx.fillStyle = win; for (const wx of [70, 350]) { ctx.beginPath(); ctx.arc(x + wx * s, y - 6 * s, 14 * s, 0, TAU); ctx.fill(); }
}
function round(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function gulls(ctx, t, n, color, seed, area, s = 1) {
  const r = rng(seed); ctx.strokeStyle = color; ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const sp = 30 + r() * 50, x = (r() * W + t * sp) % (W + 200) - 100, y = area[0] + r() * (area[1] - area[0]);
    const f = Math.sin(t * 7 + i) * 10 * s, w = (14 + r() * 12) * s;
    ctx.lineWidth = 4 * s; ctx.beginPath();
    ctx.moveTo(x - w, y - f); ctx.quadraticCurveTo(x - w / 2, y - 8 * s, x, y); ctx.quadraticCurveTo(x + w / 2, y - 8 * s, x + w, y - f); ctx.stroke();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// A · RISO — three plates on warm paper. Every plate is drawn in black into
// its own canvas, then tinted and MULTIPLIED down with its own registration
// error, which is what makes overlaps turn into the fourth, fifth, sixth
// colours for free. Tone is halftone dots, never a gradient. The plates
// "boil" at 8 fps: registration drifts a pixel or two, the way a real run
// of prints does from sheet to sheet.
// ═══════════════════════════════════════════════════════════════════════════
const RISO = { paper: '#f2ebdc', pink: '#ff48b0', blue: '#2f5bd3', yellow: '#ffd800' };
let risoPlates = null, grain = null;
function grainCanvas() {
  if (grain) return grain;
  grain = canvas(512, 512); const g = grain.getContext('2d'), im = g.createImageData(512, 512), r = rng(3);
  for (let i = 0; i < im.data.length; i += 4) {
    const v = 200 + r() * 55 - (r() > 0.985 ? 90 : 0);
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); return grain;
}
function halftone(ctx, x0, y0, w, h, val, cell = 14, angle = 0.26) {
  const ca = Math.cos(angle), sa = Math.sin(angle), R = Math.hypot(w, h);
  for (let u = -R; u < R; u += cell) for (let v = -R; v < R; v += cell) {
    const x = x0 + w / 2 + u * ca - v * sa, y = y0 + h / 2 + u * sa + v * ca;
    if (x < x0 - cell || x > x0 + w + cell || y < y0 - cell || y > y0 + h + cell) continue;
    const k = val(x, y); if (k <= 0.02) continue;
    ctx.beginPath(); ctx.arc(x, y, Math.sqrt(clamp(k)) * cell * 0.62, 0, TAU); ctx.fill();
  }
}
function riso(ctx, t) {
  if (!risoPlates) risoPlates = { pink: canvas(), blue: canvas(), yellow: canvas() };
  const P = risoPlates, frame = Math.floor(t * 8), jr = rng(frame + 11);
  const cam = Math.sin(t * 0.5) * 18;           // a slow truck, so the layers part
  for (const k in P) P[k].getContext('2d').clearRect(0, 0, W, H);
  const pk = P.pink.getContext('2d'), bl = P.blue.getContext('2d'), ye = P.yellow.getContext('2d');
  for (const c of [pk, bl, ye]) { c.fillStyle = c.strokeStyle = '#000'; }

  // SKY: a yellow halftone ramp, densest at the horizon, and a big sun
  const hz = 1080;
  ye.save(); halftone(ye, 0, 0, W, hz, (x, y) => 0.15 + 0.85 * (y / hz) ** 1.6, 16, 0.2); ye.restore();
  ye.beginPath(); ye.arc(W / 2 + cam * 0.2, 700, 300, 0, TAU); ye.fill();
  // a pink ramp from the top, crossing the yellow into orange
  halftone(pk, 0, 0, W, 620, (x, y) => 0.5 * (1 - y / 620) ** 2, 18, 1.1);
  // growth: bars rising through the sun, overprinted in pink
  const bars = [0.32, 0.38, 0.35, 0.44, 0.5, 0.47, 0.6, 0.72];
  bars.forEach((v, i) => {
    const g = ease((t * 0.9) - i * 0.08);
    const bh = v * 520 * g, bx = 240 + i * 78 + cam * 0.3;
    pk.fillRect(bx, 1000 - bh, 52, bh);
  });
  // CITY: cathedral in blue, over the sun
  cathedral(bl, W / 2 + cam * 0.45, 1060, 0.95, { body: '#000' });
  // the old town either side, blue halftone so it steps back
  bl.save(); bl.beginPath();
  const rr = rng(21);
  for (let x = -40; x < W + 40; x += 70) { const h = 60 + rr() * 130; if (Math.abs(x - W / 2) > 250) bl.rect(x + cam * 0.4, 1060 - h, 64, h); }
  bl.clip(); halftone(bl, 0, 800, W, 280, () => 0.55, 10, 0.8); bl.restore();
  // WATER: pink and blue stripes, drifting
  for (let i = 0; i < 6; i++) {
    const y = 1080 + i * 22 + i * i * 2, off = Math.sin(t * 1.4 + i) * 30;
    (i % 2 ? pk : bl).fillRect(-50 + off, y, W + 100, 6 + i * 1.4);
  }
  // reflected sun, broken
  for (let i = 0; i < 6; i++) { const w = 220 - i * 22 + Math.sin(t * 3 + i) * 18; ye.fillRect(W / 2 - w / 2 + cam * 0.2, 1086 + i * 26, w, 10); }
  // GROUND: a blue hill, the tree, the two men
  // the hill: a yellow ridge first, so the tree and the men stand on light
  ye.beginPath(); ye.moveTo(0, 1300); ye.quadraticCurveTo(W * 0.4, 1236, W, 1290); ye.lineTo(W, 1420); ye.lineTo(0, 1420); ye.fill();
  bl.beginPath(); bl.moveTo(0, 1420); bl.quadraticCurveTo(W * 0.4, 1380, W, 1410); bl.lineTo(W, H); bl.lineTo(0, H); bl.fill();
  tree(bl, 220 + cam * 0.9, 1300, 1.0, t, '#000');
  waiters(pk, 560 + cam * 0.9, 1296, 0.95, t, '#000', '#000');
  // gulls
  gulls(bl, t, 6, '#000', 5, [360, 620]);

  // TYPE: overprinted — pink over the blue hill makes the magenta-violet
  // two lines in yellow (over blue: green), two in pink (over blue: violet)
  // the headline is a KNOCKOUT: cut out of the blue plate, so lines 1-2 are
  // bare paper and lines 3-4 have yellow printed into the hole — the crispest
  // thing a riso can do, and it stays legible where overprint went to mud
  pk.font = ye.font = bl.font = '128px Anton';
  COPY.head.forEach((line, i) => {
    const k = eob(t * 1.3 - 0.2 - i * 0.1), x = 64 - (1 - k) * 120, y = 1580 + i * 104;
    bl.globalCompositeOperation = 'destination-out'; bl.globalAlpha = clamp(k * 3);
    bl.fillText(line, x, y); bl.globalCompositeOperation = 'source-over'; bl.globalAlpha = 1;
    if (i >= 2) { ye.globalAlpha = clamp(k * 3); ye.fillText(line, x, y); ye.globalAlpha = 1; }
  });
  bl.font = '34px "Space Grotesk"'; bl.globalCompositeOperation = 'destination-out'; bl.fillText(COPY.kicker, 66, 1470); bl.globalCompositeOperation = 'source-over';
  bl.fillText('RADIO FREE HELSINKI · 104.40', 66, 90);
  // the figure, huge, in pink over the sky
  pk.font = '210px Anton'; pk.textAlign = 'right';
  pk.fillText(COPY.fig, W - 50, 330); pk.textAlign = 'left';

  // PRINT: paper, then each plate multiplied with its own registration error
  ctx.save();
  ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = RISO.paper; ctx.fillRect(0, 0, W, H);
  const reg = { yellow: [jr() * 6 - 3, jr() * 6 - 3], pink: [3 + jr() * 3, -2 + jr() * 3], blue: [-3 + jr() * 2, 2 + jr() * 2] };
  const tint = canvas();
  for (const k of ['yellow', 'pink', 'blue']) {
    const tc = tint.getContext('2d'); tc.clearRect(0, 0, W, H);
    tc.globalCompositeOperation = 'source-over'; tc.drawImage(P[k], 0, 0);
    tc.globalCompositeOperation = 'source-in'; tc.fillStyle = RISO[k]; tc.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = k === 'blue' ? 0.95 : 0.92;
    ctx.drawImage(tint, reg[k][0], reg[k][1]);
  }
  // Toko, on his own plate: the original, in pink, stamped over everything
  // (a sticker, not a plate: printed through the yellow he went orange and
  // his face — which is the paper showing through — vanished into the hill)
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  const pop = eob(t * 1.4 - 0.9);
  if (pop > 0) {
    ctx.save(); ctx.translate(W - 200, 1240); ctx.rotate(-0.12 + Math.sin(t * 2) * 0.03); ctx.scale(pop, pop);
    drawMasterBadge(ctx, 0, 0, 130, { ground: RISO.pink, ink: RISO.paper });
    ctx.restore();
  }
  // grain: paper tooth and ink starvation
  ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.5;
  const gr = grainCanvas(), go = (frame * 97) % 512;
  for (let y = -go; y < H; y += 512) for (let x = -((frame * 53) % 512); x < W; x += 512) ctx.drawImage(gr, x, y);
  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// B · PAPER — a diorama. Each layer is cut from its own sheet: filled, given
// fibre texture on top of its own pixels only, then dropped onto the stack
// with a soft shadow whose length grows with the gap to the layer below. The
// camera trucks and the layers part by depth. It is the set clay Toko has
// been missing: a desk-top model of the city, not a picture of one.
// ═══════════════════════════════════════════════════════════════════════════
const PAPER = {
  sky0: '#2b3a8f', sky1: '#e2567a', sky2: '#ffb36b', sun: '#fff1b8',
  far: '#6d5fb0', mid: '#4a3f8f', cath: '#fbf7ee', dome: '#3fae8c', domeD: '#2b8a6c',
  sea0: '#1f6fa8', sea1: '#2b89c2', foam: '#e9f6ff', hill: '#2f7d4e', hill2: '#3f9a5d',
  coat: '#232235', hat: '#15141f', tree: '#3a2a26', tram: '#2e9e5b', tramW: '#fff4c9',
};
let fibre = null;
function fibreCanvas() {
  if (fibre) return fibre;
  fibre = canvas(384, 384); const g = fibre.getContext('2d'), r = rng(9);
  g.fillStyle = '#808080'; g.fillRect(0, 0, 384, 384);
  const im = g.getImageData(0, 0, 384, 384);
  for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() - 0.5) * 34; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; }
  g.putImageData(im, 0, 0);
  for (let i = 0; i < 260; i++) { // fibres
    g.strokeStyle = r() > 0.5 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.12)'; g.lineWidth = 1;
    const x = r() * 384, y = r() * 384, a = r() * TAU, l = 6 + r() * 22;
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a + 1) * l / 2, y + Math.sin(a + 1) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  return fibre;
}
const layerBufs = [];
function paperLayer(ctx, i, depth, drawFn, shadow = 18) {
  const buf = layerBufs[i] || (layerBufs[i] = canvas()), b = buf.getContext('2d');
  b.setTransform(1, 0, 0, 1, 0, 0); b.globalCompositeOperation = 'source-over'; b.clearRect(0, 0, W, H);
  drawFn(b);
  b.globalCompositeOperation = 'overlay'; b.globalAlpha = 0.55;       // fibre on this sheet only…
  b.fillStyle = b.createPattern(fibreCanvas(), 'repeat'); b.fillRect(0, 0, W, H);
  b.globalCompositeOperation = 'destination-in'; b.globalAlpha = 1;    // …clipped back to its cut
  const mask = layerBufs['m' + i] || (layerBufs['m' + i] = canvas()); const m = mask.getContext('2d');
  m.clearRect(0, 0, W, H); drawFn(m); b.drawImage(mask, 0, 0);
  b.globalCompositeOperation = 'source-over';
  ctx.save();
  ctx.shadowColor = 'rgba(20,10,40,.45)'; ctx.shadowBlur = shadow * 1.6; ctx.shadowOffsetY = shadow * 0.7; ctx.shadowOffsetX = shadow * 0.25;
  ctx.drawImage(buf, 0, 0); ctx.restore();
}
function wavy(c, y, amp, per, ph, color, bottom = H) {
  c.fillStyle = color; c.beginPath(); c.moveTo(-20, bottom);
  for (let x = -20; x <= W + 20; x += 12) c.lineTo(x, y + Math.sin(x / per + ph) * amp + Math.sin(x / (per * 0.37) + ph * 1.7) * amp * 0.3);
  c.lineTo(W + 20, bottom); c.fill();
}
function paper(ctx, t) {
  const cam = Math.sin(t * 0.45) * 26, P = PAPER;
  const px = (d) => cam * d;
  // sky: a painted card, the one gradient allowed, because it is the backdrop
  const g = ctx.createLinearGradient(0, 0, 0, 1150);
  g.addColorStop(0, P.sky0); g.addColorStop(0.55, P.sky1); g.addColorStop(1, P.sky2);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = 0.35;
  ctx.fillStyle = ctx.createPattern(fibreCanvas(), 'repeat'); ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  // stars: pinholes
  const sr = rng(4); ctx.fillStyle = '#fff6d8';
  for (let i = 0; i < 40; i++) { const x = sr() * W, y = sr() * 500, tw = 0.5 + 0.5 * Math.sin(t * 3 + i); ctx.globalAlpha = 0.4 + tw * 0.6; ctx.beginPath(); ctx.arc(x, y, 2 + sr() * 2.5, 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  // sun, on a wire
  paperLayer(ctx, 0, 0.1, (c) => {
    c.fillStyle = P.sun; c.beginPath(); c.arc(W * 0.66 + px(0.1), 760 + Math.sin(t) * 6, 190, 0, TAU); c.fill();
  }, 10);
  // growth bars, cut from card, rising like stage flats
  paperLayer(ctx, 1, 0.2, (c) => {
    const bars = [0.30, 0.36, 0.33, 0.42, 0.48, 0.45, 0.58, 0.70];
    bars.forEach((v, i) => {
      const k = eob(t * 0.9 - i * 0.07), h = v * 560 * k, x = 150 + i * 100 + px(0.2);
      c.fillStyle = i === bars.length - 1 ? '#ffd166' : '#f7a1c4'; c.fillRect(x, 1010 - h, 70, h + 20);
    });
    c.fillStyle = '#ffd166'; c.font = '150px "Archivo Black"'; c.textAlign = 'center';
    const k = eob(t * 1.1 - 0.9); c.globalAlpha = clamp(k * 2);
    c.fillText(COPY.fig, 690 + px(0.2), 390 + (1 - k) * 60); c.globalAlpha = 1;
  }, 12);
  // far hills
  paperLayer(ctx, 2, 0.3, (c) => wavy(c, 960, 34, 150, 0.4, P.far, 1200), 14);
  // city: cathedral in white card, green domes
  paperLayer(ctx, 3, 0.45, (c) => {
    const r = rng(12); c.fillStyle = P.mid;
    for (let x = -30; x < W + 40; x += 64) { const h = 70 + r() * 120; if (Math.abs(x - W / 2) > 270) { c.fillRect(x + px(0.45), 1080 - h, 58, h + 30); c.beginPath(); c.moveTo(x + px(0.45), 1080 - h); c.lineTo(x + 29 + px(0.45), 1080 - h - 34); c.lineTo(x + 58 + px(0.45), 1080 - h); c.fill(); } }
    c.fillStyle = '#8a6f9e'; c.fillRect(-20, 1075, W + 40, 40);            // the quay the city stands on
    c.fillStyle = '#b39ac4'; c.fillRect(-20, 1075, W + 40, 8);
    cathedral(c, W / 2 + px(0.45), 1080, 0.92, { body: P.cath, dome: P.dome, dark: '#d9d2c3' });
  }, 16);
  // sea, three cut strips that slide against each other
  paperLayer(ctx, 4, 0.6, (c) => wavy(c, 1080, 10, 60, t * 1.2, P.sea0, 1500), 12);
  paperLayer(ctx, 5, 0.7, (c) => {
    wavy(c, 1130, 12, 70, -t * 1.5 + 1, P.sea1, 1500);
    tram(c, ((t * 120 + 300) % (W + 700)) - 520 + px(0.7), 1100, 0.6, P.tram, P.tramW, '#f4c94a');
  }, 12);
  paperLayer(ctx, 6, 0.8, (c) => {
    wavy(c, 1210, 14, 80, t * 1.8 + 2, P.foam, 1500);
    wavy(c, 1222, 14, 80, t * 1.8 + 2.2, P.sea0, 1500);
  }, 10);
  // the hill, the tree, the two men — the nearest sheet
  paperLayer(ctx, 7, 1, (c) => {
    wavy(c, 1330, 40, 260, 0.8, P.hill2);
    c.fillStyle = P.hill; c.beginPath(); c.moveTo(0, 1440); c.quadraticCurveTo(W * 0.4, 1330, W, 1420); c.lineTo(W, H); c.lineTo(0, H); c.fill();
    tree(c, 220 + px(1), 1400, 1.08, t, P.tree);
    waiters(c, 560 + px(1), 1400, 1.35, t, P.coat, P.hat);
  }, 22);
  // gulls on sticks
  paperLayer(ctx, 8, 1.1, (c) => gulls(c, t, 5, '#fbf7ee', 5, [420, 640], 1.3), 8);
  // TYPE: a cut-paper caption card, pinned
  paperLayer(ctx, 9, 1.2, (c) => {
    const k = eob(t * 1.3 - 0.3);
    c.save(); c.translate(0, (1 - k) * 420); c.rotate(-0.025);
    c.fillStyle = '#fff8ea'; round(c, 40, 1500, 760, 380, 18); c.fill();
    c.fillStyle = '#e2567a'; c.fillRect(40, 1500, 760, 60);
    c.fillStyle = '#fff8ea'; c.font = '32px "Space Grotesk"'; c.fillText('RADIO FREE HELSINKI · ' + COPY.slug, 70, 1541);
    c.fillStyle = '#1f1d33'; c.font = '66px "Archivo Black"';
    COPY.head.forEach((l, i) => c.fillText(l, 70, 1640 + i * 68 - (i > 1 ? 0 : 0)));
    c.restore();
  }, 20);
  // Toko: the clay badge on a rod, like a puppet over the card
  paperLayer(ctx, 10, 1.3, (c) => {
    const pop = eob(t * 1.4 - 1), y = 1450 + Math.sin(t * 2.4) * 10;
    if (pop <= 0) return;
    c.fillStyle = '#7a5a3a'; c.fillRect(W - 206, y, 12, 600);
    c.save(); c.translate(W - 200, y); c.rotate(Math.sin(t * 1.7) * 0.08); c.scale(pop, pop);
    drawMasterBadge(c, 0, 0, 150, { ground: '#f0027f', ink: '#ffffff' });
    const sh = c.createRadialGradient(-50, -60, 20, 0, 0, 160); sh.addColorStop(0, 'rgba(255,255,255,.35)'); sh.addColorStop(0.6, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(40,0,30,.4)');
    c.fillStyle = sh; c.beginPath(); c.arc(0, 0, 150, 0, TAU); c.fill();
    c.restore();
  }, 24);
  // tilt-shift: the top and bottom of the model go soft, as a macro lens does
  tiltShift(ctx, 1000, 520);
}
let tiltBuf = null;
function tiltShift(ctx, focusY, band) {
  tiltBuf = tiltBuf || canvas(W / 4, H / 4);
  const b = tiltBuf.getContext('2d'); b.clearRect(0, 0, W / 4, H / 4);
  b.filter = 'blur(3px)'; b.drawImage(ctx.canvas, 0, 0, W / 4, H / 4); b.filter = 'none';
  const soft = canvas(); const s = soft.getContext('2d');
  s.drawImage(tiltBuf, 0, 0, W, H);
  const m = s.createLinearGradient(0, 0, 0, H);
  const a = (focusY - band) / H, z = (focusY + band * 0.2) / H;
  m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(clamp(a), 'rgba(0,0,0,0)'); m.addColorStop(clamp(z), 'rgba(0,0,0,0)'); m.addColorStop(clamp(z + 0.12), 'rgba(0,0,0,.0)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  s.globalCompositeOperation = 'destination-in'; s.fillStyle = m; s.fillRect(0, 0, W, H);
  ctx.drawImage(soft, 0, 0);
}

// ═══════════════════════════════════════════════════════════════════════════
// C · NEON — the motion-graphic register. The old terminal is still here: it
// is the scanline field at the back, running the station's green text. On top
// of it, everything the terminal could never do — a gradient sky, a sun with
// a real glow, the number EXTRUDED in 3D, an isometric chart lit from above,
// and a glass headline card with the light behind it.
// ═══════════════════════════════════════════════════════════════════════════
function neon(ctx, t) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#12002e'); g.addColorStop(0.42, '#5b0f8a'); g.addColorStop(0.62, '#ff3d7f'); g.addColorStop(0.75, '#ff9a3c'); g.addColorStop(1, '#1a0630');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // the terminal, at the back: pixel text crawling in green scanlines
  ctx.save(); ctx.globalAlpha = 0.16; ctx.fillStyle = '#39ff9a'; ctx.font = '22px "DejaVu Sans Mono"';
  const lines = ['> WIRE 2026-09-26 VALTIO', '> DECODE ARRIVAL', '> GROWTH +1.8 DEF 4.5 UNEMP 10.3', '> SPIN 1/1', '> 104.40 HELSINKI'];
  for (let i = 0; i < 40; i++) ctx.fillText(lines[(i + Math.floor(t * 4)) % lines.length] + '  ' + '░'.repeat((i * 7) % 13), 30, 40 + i * 30);
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,.28)'; for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 3);
  // sun: banded, glowing
  const sy = 860;
  ctx.save(); ctx.shadowColor = '#ffb13c'; ctx.shadowBlur = 140;
  const sg = ctx.createLinearGradient(0, sy - 300, 0, sy + 300); sg.addColorStop(0, '#fff27a'); sg.addColorStop(1, '#ff2e88');
  ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(W / 2, sy, 300, 0, TAU); ctx.fill(); ctx.restore();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 8; i++) { const y = sy + 30 + i * 34 + ((t * 30) % 34); ctx.fillRect(W / 2 - 320, y, 640, 4 + i * 2.2); }
  ctx.globalCompositeOperation = 'source-over';
  // city silhouette in deep violet, with window lights
  ctx.fillStyle = '#240a44'; cathedral(ctx, W / 2, 1180, 0.9, { body: '#240a44' });
  const r = rng(31);
  for (let x = -20; x < W; x += 58) {
    const h = 80 + r() * 200; if (Math.abs(x - W / 2) < 240) continue;
    ctx.fillStyle = '#240a44'; ctx.fillRect(x, 1180 - h, 54, h);
    for (let wy = 1180 - h + 16; wy < 1170; wy += 26) for (let wx = x + 8; wx < x + 48; wx += 16)
      if (r() > 0.55) { ctx.fillStyle = r() > 0.5 ? '#ffcf5a' : '#58f0ff'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + wx * wy); ctx.fillRect(wx, wy, 7, 10); ctx.globalAlpha = 1; }
  }
  // a floor: perspective grid, streaming toward us
  ctx.save(); ctx.beginPath(); ctx.rect(0, 1180, W, 760); ctx.clip();
  ctx.fillStyle = '#16042b'; ctx.fillRect(0, 1180, W, 760);
  ctx.strokeStyle = '#ff3d9a'; ctx.lineWidth = 2; ctx.shadowColor = '#ff3d9a'; ctx.shadowBlur = 12;
  for (let i = -14; i <= 14; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 12, 1180); ctx.lineTo(W / 2 + i * 190, H); ctx.stroke(); }
  for (let i = 0; i < 14; i++) { const k = ((i + t * 1.2) % 14) / 14, y = 1180 + (k ** 2.2) * 760; ctx.globalAlpha = k; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
  // the tree and the two men, black on the glow, standing on the grid
  tree(ctx, 170, 1400, 0.95, t, '#0b0118');
  waiters(ctx, 420, 1400, 1.0, t, '#0b0118', '#0b0118');
  // isometric chart, lit: top face bright, sides in two shades
  const bars = [0.3, 0.38, 0.34, 0.45, 0.52, 0.49, 0.64, 0.8];
  bars.forEach((v, i) => {
    const k = eob(t * 0.9 - i * 0.07), h = v * 380 * k, x = 560 + i * 56, y = 1330 + i * 10, w = 34, d = 18;
    const top = i === bars.length - 1 ? '#fff27a' : '#7cf4ff', l = i === bars.length - 1 ? '#ffb13c' : '#2fb6ff', rr = i === bars.length - 1 ? '#d9683a' : '#1d63c9';
    ctx.fillStyle = l; ctx.fillRect(x, y - h, w, h);
    ctx.fillStyle = rr; ctx.beginPath(); ctx.moveTo(x + w, y - h); ctx.lineTo(x + w + d, y - h - d * 0.55); ctx.lineTo(x + w + d, y - d * 0.55); ctx.lineTo(x + w, y); ctx.fill();
    ctx.fillStyle = top; ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + d, y - h - d * 0.55); ctx.lineTo(x + w + d, y - h - d * 0.55); ctx.lineTo(x + w, y - h); ctx.fill();
  });
  // the number, extruded
  const k = eob(t * 1.2 - 0.4);
  ctx.save(); ctx.translate(W / 2, 470 + (1 - k) * 200); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k); ctx.globalAlpha = clamp(k * 2);
  ctx.font = '300px Anton'; ctx.textAlign = 'center';
  for (let i = 26; i > 0; i--) { ctx.fillStyle = `hsl(${320 - i * 2}, 90%, ${18 + i * 0.8}%)`; ctx.fillText(COPY.fig, i * 1.2, i * 2.2); }
  const tg = ctx.createLinearGradient(0, -240, 0, 0); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#ffe46b');
  ctx.shadowColor = '#fff27a'; ctx.shadowBlur = 40; ctx.fillStyle = tg; ctx.fillText(COPY.fig, 0, 0);
  ctx.restore();
  // glass card with the headline
  const ck = eob(t * 1.3 - 0.7);
  ctx.save(); ctx.translate(0, (1 - ck) * 300); ctx.globalAlpha = clamp(ck * 2);
  round(ctx, 40, 1480, 1000, 380, 36);
  ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#7cf4ff'; ctx.font = '30px "Space Grotesk"'; ctx.fillText('● ON AIR  ' + COPY.slug, 80, 1540);
  ctx.fillStyle = '#fff'; ctx.font = '80px Anton';
  ctx.fillText(COPY.head[0] + ' ' + COPY.head[1], 80, 1650);
  const hg = ctx.createLinearGradient(80, 0, 900, 0); hg.addColorStop(0, '#ff3d9a'); hg.addColorStop(1, '#ffb13c');
  ctx.fillStyle = hg; ctx.fillText(COPY.head[2] + ' ' + COPY.head[3], 80, 1745);
  ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.font = '32px "Space Grotesk"'; ctx.fillText(COPY.sub, 80, 1815);
  ctx.restore();
  // Toko with a halo of rings
  const pop = eob(t * 1.4 - 1.1);
  if (pop > 0) {
    ctx.save(); ctx.translate(W - 200, 1420); ctx.scale(pop, pop);
    for (let i = 0; i < 3; i++) { const rr = 150 + ((t * 60 + i * 40) % 120); ctx.strokeStyle = `rgba(255,61,154,${1 - (rr - 150) / 120})`; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke(); }
    ctx.shadowColor = '#f0027f'; ctx.shadowBlur = 60;
    drawMasterBadge(ctx, 0, 0, 140, { ground: '#f0027f', ink: '#ffffff' });
    ctx.restore();
  }
  // sparks
  const pr = rng(8);
  for (let i = 0; i < 60; i++) { const x = pr() * W, sp = 40 + pr() * 120, y = (pr() * H - t * sp) % H; ctx.fillStyle = pr() > 0.5 ? '#fff27a' : '#7cf4ff'; ctx.globalAlpha = 0.6; ctx.fillRect(x, y < 0 ? y + H : y, 3, 3); }
  ctx.globalAlpha = 1;
}

export function renderAt(ctx, style, t) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, W, H);
  ({ riso, paper, neon })[style](ctx, t);
  ctx.restore();
}
