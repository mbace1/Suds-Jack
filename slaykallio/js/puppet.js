// Tin soldiers and painted cardboard cutouts. A character is a 2D figure —
// flat fills inside a heavy, wobbling ink line — standing on a 3D base: either
// a TIN SOLDIER'S oval, a stamped metal disc with a lip and a dull sheen, or a
// CARDBOARD wedge with a strip of tape over the feet. `look.base` picks which,
// and the mix is the point: a row of them looks like things somebody collected
// rather than a set that shipped together.
//
// Gritty is not a filter here, it is in the drawing: the paint is scumbled
// rather than flat, the ink line varies in weight, edges are nicked and
// furred, and everything carries a wash of grime whose strength is
// `look.grime`. No image assets — the painting is done on a canvas from the
// `look` table in data.js, so a theme switch repaints the same figure.
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
  if (stroke) {
    // the line is drawn twice at different weights: a brush loaded unevenly
    ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = width; ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.lineWidth = width * (1.5 + rnd() * 0.5); ctx.stroke(); ctx.globalAlpha = 1;
  }
}

function blob(ctx, cx, cy, rx, ry, fill, rnd, opts) {
  const pts = [];
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  wob(ctx, pts, fill, rnd, opts);
}

// Scumbled paint: short broken strokes of a lighter and a darker tone over a
// fill, which is what stops a flat colour reading as vector art.
function brush(ctx, x, y, w, h, color, rnd, k = 1) {
  ctx.save();
  for (let i = 0; i < 26 * k; i++) {
    ctx.globalAlpha = 0.04 + rnd() * 0.07;
    ctx.fillStyle = rnd() > 0.45 ? color : 'rgba(0,0,0,1)';
    const bw = w * (0.15 + rnd() * 0.4), bh = 2 + rnd() * 4;
    ctx.fillRect(x + rnd() * (w - bw), y + rnd() * (h - bh), bw, bh);
  }
  ctx.restore();
}

// Everything below is clipped to what has already been painted, so grime
// never leaks outside the cutout's own silhouette.
function grime(ctx, rnd, k = 0.8) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  // specks and paper tooth
  for (let i = 0; i < 1500; i++) {
    ctx.fillStyle = rnd() > 0.45 ? `rgba(255,250,235,${0.05 + rnd() * 0.07})` : `rgba(0,0,0,${0.05 + rnd() * 0.1 * k})`;
    ctx.fillRect(rnd() * TW, rnd() * TH, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  // streaks running DOWN the figure: rain, spills, whatever it has been through
  ctx.globalAlpha = 0.12 * k;
  for (let i = 0; i < 22; i++) {
    const x = rnd() * TW, y = 120 + rnd() * 300;
    ctx.fillStyle = rnd() > 0.5 ? '#231a10' : '#0d0a08';
    ctx.fillRect(x, y, 1 + rnd() * 3, 20 + rnd() * 90);
  }
  // a couple of stains
  ctx.globalAlpha = 0.15 * k;
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = '#2a1e10';
    ctx.beginPath(); ctx.ellipse(40 + rnd() * (TW - 80), 160 + rnd() * 300, 12 + rnd() * 30, 8 + rnd() * 22, rnd() * 3, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // one warm light from the left, and a genuinely dark shadow side
  const g = ctx.createLinearGradient(0, 0, TW, TH * 0.5);
  g.addColorStop(0, 'rgba(255,226,172,0.17)');
  g.addColorStop(0.5, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(8,8,14,0.3)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, TW, TH);
  ctx.restore();
}

// nick the outline: a cutout that has been carried around is not cut clean
function nicks(ctx, rnd, n = 26) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < n; i++) {
    const x = rnd() * TW, y = 90 + rnd() * (TH - 120);
    ctx.beginPath();
    ctx.ellipse(x, y, 2 + rnd() * 6, 2 + rnd() * 5, rnd() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ── the figures ─────────────────────────────────────────────────────────
// All of them are drawn IN PROFILE facing +x on a 256×512 sheet, feet at 470.

function person(ctx, look, rnd) {
  const cx = 128, foot = 470;
  const skin = look.skin, top = look.top, bottom = look.bottom, hair = look.hair;
  const g = look.grime ?? 0.7;

  // trousers: too long, bunched over the boots
  wob(ctx, [[cx - 2, 330], [cx + 26, 330], [cx + 32, foot - 6], [cx + 6, foot - 6]], shade(bottom, 0.72), rnd);
  wob(ctx, [[cx - 28, 330], [cx + 4, 330], [cx - 6, foot - 6], [cx - 34, foot - 6]], bottom, rnd);
  brush(ctx, cx - 30, 340, 60, 120, shade(bottom, 1.3), rnd, 1.1);
  // boots, and they do not match
  if (look.shoes !== 'none') {
    wob(ctx, [[cx - 40, foot - 26], [cx - 2, foot - 30], [cx + 6, foot], [cx - 46, foot]], look.shoes, rnd);
    wob(ctx, [[cx + 2, foot - 22], [cx + 34, foot - 26], [cx + 48, foot], [cx - 2, foot]], shade(look.shoes, 1.25), rnd);
  }

  // the coat: long, open, and the single most characterful shape on the figure
  wob(ctx, [[cx - 36, 208], [cx + 24, 200], [cx + 36, 232], [cx + 34, 356], [cx + 22, 370], [cx - 34, 366], [cx - 42, 250]], top, rnd, { amp: 3.2 });
  brush(ctx, cx - 30, 214, 62, 150, shade(top, 1.3), rnd, 1.3);
  // the lapel and the gap where it hangs open
  wob(ctx, [[cx + 4, 206], [cx + 26, 202], [cx + 30, 250], [cx + 10, 300], [cx + 2, 260]], shade(top, 0.7), rnd, { width: 3 });
  // a jumper showing at the neck
  wob(ctx, [[cx - 8, 196], [cx + 16, 192], [cx + 18, 224], [cx - 6, 226]], shade(look.accent, 0.55), rnd, { width: 3 });

  // arms: the back one hanging, the front one out with whatever it is carrying
  wob(ctx, [[cx - 40, 214], [cx - 18, 212], [cx - 20, 306], [cx - 42, 304]], shade(top, 0.68), rnd);
  wob(ctx, [[cx + 6, 220], [cx + 30, 226], [cx + 68, 270], [cx + 52, 288]], shade(top, 0.88), rnd);
  blob(ctx, cx + 64, 284, 14, 13, skin, rnd);

  // neck and head, with a jaw and a nose
  wob(ctx, [[cx - 6, 188], [cx + 14, 188], [cx + 12, 212], [cx - 8, 212]], shade(skin, 0.78), rnd);
  wob(ctx, [[cx - 32, 132], [cx + 16, 122], [cx + 40, 148], [cx + 48, 168], [cx + 36, 174], [cx + 32, 192], [cx + 6, 202], [cx - 22, 198], [cx - 36, 168]], skin, rnd, { amp: 3 });
  brush(ctx, cx - 22, 146, 52, 48, shade(skin, 1.22), rnd, 0.45);
  // eye, socket and brow — the socket is what makes a face look worn
  ctx.globalAlpha = 0.35; ctx.fillStyle = INK; ctx.fillRect(cx + 10, 144, 26, 14); ctx.globalAlpha = 1;
  ctx.fillStyle = INK; ctx.fillRect(cx + 18, 150, 7, 7); ctx.fillRect(cx + 12, 139, 20, 4);
  // stubble
  ctx.globalAlpha = 0.3 * g;
  for (let i = 0; i < 90; i++) { ctx.fillStyle = INK; ctx.fillRect(cx - 20 + rnd() * 52, 168 + rnd() * 32, 2, 2); }
  ctx.globalAlpha = 1;

  // hair
  const hs = look.hairStyle;
  if (hs === 'greasy') { wob(ctx, [[cx - 40, 134], [cx + 18, 120], [cx + 26, 138], [cx - 22, 150], [cx - 34, 186], [cx - 46, 178]], hair, rnd, { amp: 3 }); }
  if (hs === 'tangle') { wob(ctx, [[cx - 46, 140], [cx + 20, 112], [cx + 32, 138], [cx + 14, 134], [cx - 20, 196], [cx - 52, 186]], hair, rnd, { amp: 5 });
    for (let i = 0; i < 7; i++) wob(ctx, [[cx - 40 + i * 4, 150 + i * 6], [cx - 62 + rnd() * 10, 140 + i * 8], [cx - 44 + i * 4, 158 + i * 6]], hair, rnd, { width: 3, amp: 4 }); }
  if (hs === 'shaggy') { wob(ctx, [[cx - 42, 138], [cx + 20, 116], [cx + 30, 140], [cx - 24, 154], [cx - 40, 176]], hair, rnd, { amp: 4 }); }
  if (hs === 'bald') { wob(ctx, [[cx - 34, 158], [cx - 24, 140], [cx - 16, 158], [cx - 26, 180]], hair, rnd, { width: 3, amp: 3 }); }

  // hats
  const hat = look.hat;
  if (hat === 'beanie') { wob(ctx, [[cx - 40, 140], [cx - 30, 108], [cx + 18, 104], [cx + 32, 138], [cx - 34, 152]], shade(look.accent, 0.7), rnd, { amp: 3 });
    wob(ctx, [[cx - 42, 136], [cx + 34, 130], [cx + 34, 146], [cx - 42, 152]], shade(look.accent, 0.5), rnd); }
  if (hat === 'cap') { wob(ctx, [[cx - 38, 136], [cx - 22, 112], [cx + 20, 112], [cx + 28, 138], [cx - 34, 150]], shade(top, 1.15), rnd);
    wob(ctx, [[cx + 12, 130], [cx + 62, 136], [cx + 60, 146], [cx + 14, 142]], shade(top, 0.72), rnd); }
  if (hat === 'hood') wob(ctx, [[cx - 52, 146], [cx - 12, 96], [cx + 34, 118], [cx + 30, 136], [cx - 6, 124], [cx - 32, 152], [cx - 38, 214], [cx - 56, 204]], shade(top, 0.8), rnd, { amp: 3.5 });
  if (hat === 'feather') { wob(ctx, [[cx - 42, 138], [cx + 26, 116], [cx + 30, 132], [cx - 38, 150]], shade(bottom, 1.1), rnd);
    wob(ctx, [[cx - 22, 128], [cx - 46, 70], [cx - 32, 66], [cx - 4, 122]], look.accent, rnd); }
  if (hat === 'helm') wob(ctx, [[cx - 42, 138], [cx - 26, 102], [cx + 22, 98], [cx + 42, 138], [cx + 40, 162], [cx + 28, 162], [cx + 26, 140], [cx - 32, 150]], shade(top, 1.1), rnd);
  if (hat === 'horns') { wob(ctx, [[cx - 32, 132], [cx - 54, 78], [cx - 18, 118]], '#cfc6b2', rnd); wob(ctx, [[cx + 14, 124], [cx + 28, 76], [cx + 32, 122]], '#cfc6b2', rnd); }

  // what is in the front hand
  const px = cx + 64, py = 284, acc = look.accent;
  switch (look.prop) {
    case 'can':
      wob(ctx, [[px - 8, py - 34], [px + 16, py - 34], [px + 14, py + 2], [px - 6, py + 2]], '#8a8f94', rnd);
      wob(ctx, [[px - 8, py - 38], [px + 16, py - 38], [px + 16, py - 30], [px - 8, py - 30]], '#b0b6bc', rnd, { width: 3 });
      ctx.fillStyle = acc; ctx.fillRect(px - 6, py - 22, 20, 11);
      break;
    case 'bottle':
      wob(ctx, [[px - 8, py + 8], [px - 8, py - 22], [px - 3, py - 32], [px - 3, py - 48], [px + 9, py - 48], [px + 9, py - 32], [px + 14, py - 22], [px + 14, py + 8]], '#3d5c40', rnd);
      ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(px - 5, py - 18, 4, 20);
      ctx.fillStyle = acc; ctx.fillRect(px - 7, py - 14, 20, 10);
      break;
    case 'flask':
      wob(ctx, [[px, py - 44], [px + 12, py - 44], [px + 14, py - 24], [px + 28, py], [px - 12, py], [px - 2, py - 24]], acc, rnd);
      break;
    case 'guitar':
      wob(ctx, [[px - 66, py + 66], [px - 34, py + 44], [px + 42, py - 96], [px + 52, py - 88], [px - 14, py + 64], [px - 48, py + 80]], '#4a2a18', rnd, { amp: 3 });
      blob(ctx, px - 42, py + 58, 30, 24, shade(acc, 0.8), rnd);
      blob(ctx, px - 42, py + 58, 9, 8, '#140f0a', rnd, { width: 3 });
      for (let i = 0; i < 3; i++) wob(ctx, [[px - 52 + i * 3, py + 76 - i * 2], [px + 46 + i * 3, py - 90 - i * 2]], null, rnd, { width: 1.6, stroke: '#cfc6b2' });
      break;
    case 'lute':
      wob(ctx, [[px - 44, py + 54], [px + 42, py - 74], [px + 52, py - 66], [px - 22, py + 64]], '#6a3a1a', rnd);
      blob(ctx, px - 32, py + 54, 26, 22, '#a8814a', rnd);
      break;
    case 'bag':
      wob(ctx, [[px - 24, py + 8], [px - 16, py - 26], [px + 26, py - 30], [px + 34, py + 12], [px + 20, py + 62], [px - 14, py + 58]], '#7a7466', rnd, { amp: 4 });
      brush(ctx, px - 20, py - 10, 50, 60, '#b8b2a2', rnd, 1.0);
      for (let i = 0; i < 4; i++) blob(ctx, px - 10 + i * 12, py - 26 + (i % 2) * 8, 8, 10, i % 2 ? '#3d5c40' : '#8a8f94', rnd, { width: 3 });
      break;
    case 'cart':
      // a supermarket trolley, loaded: the character's whole life is in it
      wob(ctx, [[px - 30, py + 20], [px - 22, py - 40], [px + 62, py - 44], [px + 52, py + 20]], '#8a9098', rnd, { amp: 2 });
      for (let i = 0; i < 6; i++) wob(ctx, [[px - 24 + i * 14, py - 40], [px - 28 + i * 14, py + 18]], null, rnd, { width: 3, stroke: '#6a7078' });
      wob(ctx, [[px - 28, py - 12], [px + 58, py - 16]], null, rnd, { width: 3, stroke: '#6a7078' });
      blob(ctx, px - 16, py + 34, 12, 12, '#22242a', rnd, { width: 3 });
      blob(ctx, px + 42, py + 34, 12, 12, '#22242a', rnd, { width: 3 });
      for (let i = 0; i < 5; i++) blob(ctx, px - 14 + i * 16, py - 48 - (i % 2) * 10, 11, 9, ['#3d5c40', '#8a8f94', '#9a7548'][i % 3], rnd, { width: 3 });
      break;
    case 'plank':
      wob(ctx, [[px - 44, py - 74], [px - 22, py - 92], [px + 44, py + 26], [px + 22, py + 42]], '#6a563e', rnd);
      for (let i = 0; i < 3; i++) wob(ctx, [[px - 36 + i * 8, py - 76 + i * 4], [px + 30 + i * 8, py + 30 + i * 4]], null, rnd, { width: 2, stroke: shade('#6a563e', 0.7) });
      blob(ctx, px + 30, py + 4, 5, 5, '#3a3430', rnd, { width: 2 });
      break;
    case 'shield':
      blob(ctx, px + 8, py + 8, 36, 44, shade(acc, 0.9), rnd, { width: 5 });
      blob(ctx, px + 8, py + 8, 11, 13, shade(top, 0.8), rnd);
      break;
    default: break;
  }
}

// A rat: low, long and pointed, with the tail doing most of the silhouette.
function rat(ctx, look, rnd) {
  const cx = 128, foot = 470;
  const body = look.body, dark = shade(look.body, 0.7);
  // tail, first, so it sits behind everything
  ctx.strokeStyle = look.beak; ctx.lineWidth = 9; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 66, 400);
  ctx.quadraticCurveTo(cx - 150, 396, cx - 130, 320);
  ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
  // haunch and body, low to the deck
  blob(ctx, cx - 30, 396, 56, 48, dark, rnd, { amp: 3 });
  wob(ctx, [[cx - 78, foot - 6], [cx - 60, 348], [cx + 10, 336], [cx + 62, 366], [cx + 70, 412], [cx + 30, foot - 6]], body, rnd, { amp: 4 });
  brush(ctx, cx - 50, 350, 100, 80, shade(look.body, 1.35), rnd, 1.2);
  // head: a wedge with a snout
  wob(ctx, [[cx + 30, 350], [cx + 74, 344], [cx + 112, 386], [cx + 116, 404], [cx + 74, 414], [cx + 40, 400]], look.head, rnd, { amp: 3 });
  wob(ctx, [[cx + 100, 388], [cx + 126, 396], [cx + 100, 406]], look.beak, rnd, { width: 3 });
  // ear, eye, whiskers, teeth
  blob(ctx, cx + 44, 340, 20, 20, look.beak, rnd);
  blob(ctx, cx + 44, 340, 10, 10, shade(look.beak, 0.7), rnd, { width: 2 });
  ctx.fillStyle = INK; ctx.fillRect(cx + 74, 372, 9, 8);
  ctx.fillStyle = '#c04040'; ctx.fillRect(cx + 75, 373, 4, 4);
  ctx.strokeStyle = '#e6ded0'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx + 106, 396); ctx.lineTo(cx + 150, 372 + i * 20); ctx.stroke(); }
  ctx.fillStyle = '#e6ded0'; ctx.fillRect(cx + 104, 404, 7, 10);
  // feet
  for (const x of [cx - 50, cx + 6, cx + 52]) wob(ctx, [[x, foot - 22], [x + 26, foot - 26], [x + 30, foot], [x - 4, foot]], dark, rnd, { width: 3 });
}

// A mutating blob: it is meant to look like it is about to be something else,
// so the silhouette carries three half-formed limbs and a second eye that does
// not match the first.
function slime(ctx, look, rnd) {
  const cx = 128, foot = 470;
  const body = look.body;
  wob(ctx, [[cx - 104, foot], [cx - 108, 388], [cx - 74, 318], [cx - 26, 286], [cx + 18, 300], [cx + 40, 262],
    [cx + 62, 300], [cx + 100, 350], [cx + 112, 404], [cx + 102, foot]], body, rnd, { amp: 7 });
  // pseudopods reaching off the mass
  wob(ctx, [[cx + 96, 344], [cx + 148, 300], [cx + 138, 336], [cx + 104, 372]], shade(body, 0.85), rnd, { amp: 5 });
  wob(ctx, [[cx - 96, 372], [cx - 146, 348], [cx - 132, 392], [cx - 92, 400]], shade(body, 0.85), rnd, { amp: 5 });
  // the lighter, wetter top where the light lands
  blob(ctx, cx - 16, 340, 62, 40, look.head, rnd, { stroke: null });
  brush(ctx, cx - 80, 320, 160, 130, shade(look.body, 1.45), rnd, 1.8);
  // bubbles rising through it
  for (let i = 0; i < 9; i++) blob(ctx, cx - 70 + rnd() * 150, 320 + rnd() * 130, 5 + rnd() * 9, 5 + rnd() * 9, shade(body, 1.2), rnd, { width: 2 });
  // two eyes that do not match, which is what says MUTATING rather than slime
  blob(ctx, cx + 6, 348, 20, 22, '#e8e4d4', rnd, { width: 3 });
  blob(ctx, cx + 54, 366, 12, 13, '#e8e4d4', rnd, { width: 3 });
  ctx.fillStyle = INK; ctx.fillRect(cx + 4, 344, 11, 13); ctx.fillRect(cx + 52, 364, 7, 8);
  // a slack mouth
  wob(ctx, [[cx - 4, 408], [cx + 64, 398], [cx + 40, 428]], look.beak, rnd, { width: 4 });
  // it is dripping
  for (let i = 0; i < 4; i++) { const x = cx - 80 + rnd() * 170; wob(ctx, [[x, foot - 10], [x + 12, foot - 10], [x + 8, foot + 30], [x + 2, foot + 30]], shade(body, 0.9), rnd, { width: 2 }); }
}

// Paint one cutout. Returns the canvas — the alpha IS the cutout's outline.
export function paintCutout(look, seed = 1) {
  const c = document.createElement('canvas');
  c.width = TW; c.height = TH;
  const ctx = c.getContext('2d');
  const rnd = rngFrom(seed * 7919 + 17);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (look.shape === 'rat') rat(ctx, look, rnd);
  else if (look.shape === 'blob') slime(ctx, look, rnd);
  else person(ctx, look, rnd);
  nicks(ctx, rnd, 18 + Math.round((look.grime ?? 0.6) * 22));
  grime(ctx, rnd, look.grime ?? 0.7);
  return c;
}

// the kraft-cardboard back of the same cutout: the shape, in brown, with flutes
function paintBack(front) {
  const c = document.createElement('canvas');
  c.width = TW; c.height = TH;
  const ctx = c.getContext('2d');
  ctx.drawImage(front, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#9c7b52'; ctx.fillRect(0, 0, TW, TH);
  ctx.globalCompositeOperation = 'source-atop';
  // the flutes of the corrugation, and the wear along them
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let y = 0; y < TH; y += 8) ctx.fillRect(0, y, TW, 3);
  ctx.fillStyle = 'rgba(255,240,210,0.10)';
  for (let y = 4; y < TH; y += 8) ctx.fillRect(0, y, TW, 1);
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.14)' : 'rgba(255,240,210,0.09)';
    ctx.fillRect(Math.random() * TW, Math.random() * TH, 2, 2);
  }
  return c;
}

let tapeTex = null;
function tapeTexture() {
  if (tapeTex) return tapeTex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(190,172,132,0.7)'; ctx.fillRect(0, 0, 128, 32);
  ctx.fillStyle = 'rgba(230,216,182,0.2)'; ctx.fillRect(0, 6, 128, 4);
  // it has been on there a while
  for (let i = 0; i < 120; i++) { ctx.fillStyle = Math.random() > 0.5 ? 'rgba(60,48,32,0.18)' : 'rgba(255,246,220,0.1)'; ctx.fillRect(Math.random() * 128, Math.random() * 32, 3, 2); }
  // torn ends
  ctx.globalCompositeOperation = 'destination-out';
  for (let y = 0; y < 32; y += 4) { ctx.fillRect(0, y, 2 + Math.random() * 5, 4); ctx.fillRect(122 + Math.random() * 6, y, 6, 4); }
  tapeTex = new THREE.CanvasTexture(c);
  return tapeTex;
}

const BOARD = new THREE.MeshLambertMaterial({ color: '#9c7b52' });
const FLUTE = new THREE.MeshLambertMaterial({ color: '#7d5f3e' });
// Tin: dull, scratched, and a touch warm — a toy soldier's base is stamped
// metal that has been in a tin with thirty others, not chrome.
const TIN = new THREE.MeshLambertMaterial({ color: '#8e9198' });
const TIN_DARK = new THREE.MeshLambertMaterial({ color: '#6a6d74' });

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

    // The base. `tin` is a toy soldier's stamped oval — a flat disc with a
    // raised lip, squashed along the depth axis; `card` is a cardboard wedge
    // with a slot and a strip of tape over the feet. Which one a figure gets
    // is in its `look`, and mixing them is the point: a row of these should
    // look collected rather than manufactured.
    const bw = w * 0.9, bd = 0.24 * scale;
    if (look.base === 'tin') {
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(bw * 0.44, bw * 0.48, 0.05 * scale, 22), TIN);
      disc.position.y = 0.025 * scale; disc.scale.z = 0.55;
      const lip = new THREE.Mesh(new THREE.TorusGeometry(bw * 0.45, 0.014 * scale, 6, 24), TIN_DARK);
      lip.rotation.x = Math.PI / 2; lip.position.y = 0.05 * scale; lip.scale.y = 0.55;
      const tab = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.34, 0.03 * scale, 0.05 * scale), TIN_DARK);
      tab.position.set(0, 0.062 * scale, 0);
      this.group.add(body, disc, lip, tab);
    } else {
      const wedge = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.05 * scale, bd), BOARD);
      wedge.position.y = 0.025 * scale;
      const slot = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.5, 0.09 * scale, 0.06 * scale), FLUTE);
      slot.position.set(0, 0.07 * scale, -0.04 * scale);
      const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.18 * scale, 0.1 * scale),
        new THREE.MeshBasicMaterial({ map: tapeTexture(), transparent: true, depthWrite: false }));
      tape.position.set(0, 0.06 * scale, 0.03 * scale);
      tape.rotation.x = -0.9; tape.rotation.z = 0.15;
      this.group.add(body, wedge, slot, tape);
    }

    // a soft shadow on the bench, which the fall leaves behind
    // On planks in a low sun the shadow is tight and dark, and it is thrown
    // to one side rather than sitting under the feet like a decal.
    const sh = new THREE.Mesh(new THREE.CircleGeometry(bw * 0.6, 20),
      new THREE.MeshBasicMaterial({ color: '#0b0c10', transparent: true, opacity: 0.36, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.scale.y = 0.42; sh.position.y = 0.006;
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
