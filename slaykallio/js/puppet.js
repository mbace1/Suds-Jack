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

  // A heavy figure is wider through the middle and shorter in the leg; it is
  // the only proportion change in the whole painter and it is what makes the
  // boss read as mass rather than as a tall man.
  const W = look.heavy ? 1.34 : 1, hipY = look.heavy ? 348 : 330;
  const w = (dx) => cx + dx * W;

  // trousers: too long, bunched over the boots
  wob(ctx, [[w(-2), hipY], [w(26), hipY], [w(32), foot - 6], [w(6), foot - 6]], shade(bottom, 0.72), rnd);
  wob(ctx, [[w(-28), hipY], [w(4), hipY], [w(-6), foot - 6], [w(-34), foot - 6]], bottom, rnd);
  brush(ctx, w(-30), hipY + 10, 60 * W, foot - hipY, shade(bottom, 1.3), rnd, 1.1);
  // the white side stripe of a tracksuit leg — two thin lines down the outside
  if (look.stripe) {
    for (const dy of [0, 6]) wob(ctx, [[w(-27) + dy, hipY + 4], [w(-6) + dy, foot - 8]], null, rnd,
      { close: false, width: 3, stroke: look.stripe, amp: 1.6 });
  }
  // boots, and they do not match
  if (look.shoes !== 'none') {
    if (look.shoeStyle === 'clog') {
      // rubber clogs, worn in all weathers: a blunt round toe and no heel,
      // which is a completely different silhouette from a boot
      for (const [ox, k] of [[-40, 1], [4, 1.12]]) {
        wob(ctx, [[w(ox), foot - 20], [w(ox + 6), foot - 26], [w(ox + 30 * k), foot - 24], [w(ox + 40 * k), foot - 10], [w(ox + 36 * k), foot], [w(ox - 4), foot]],
          k > 1 ? shade(look.shoes, 1.2) : look.shoes, rnd, { amp: 2.5 });
        for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(w(ox + 10 + i * 8), foot - 21, 3, 3); }
      }
    } else {
      wob(ctx, [[w(-40), foot - 26], [w(-2), foot - 30], [w(6), foot], [w(-46), foot]], look.shoes, rnd);
      wob(ctx, [[w(2), foot - 22], [w(34), foot - 26], [w(48), foot], [w(-2), foot]], shade(look.shoes, 1.25), rnd);
    }
  }

  // the coat: long, open, and the single most characterful shape on the figure
  wob(ctx, [[cx - 36, 208], [cx + 24, 200], [cx + 36, 232], [cx + 34, 356], [cx + 22, 370], [cx - 34, 366], [cx - 42, 250]], top, rnd, { amp: 3.2 });
  brush(ctx, cx - 30, 214, 62, 150, shade(top, 1.3), rnd, 1.3);
  // the lapel and the gap where it hangs open
  wob(ctx, [[cx + 4, 206], [cx + 26, 202], [cx + 30, 250], [cx + 10, 300], [cx + 2, 260]], shade(top, 0.7), rnd, { width: 3 });
  // a jumper showing at the neck
  wob(ctx, [[cx - 8, 196], [cx + 16, 192], [cx + 18, 224], [cx - 6, 226]], shade(look.accent, 0.55), rnd, { width: 3 });

  // arms: the back one hanging, the front one out with whatever it is carrying
  wob(ctx, [[w(-40), 214], [w(-18), 212], [w(-20), 306], [w(-42), 304]], shade(top, 0.68), rnd);
  wob(ctx, [[w(6), 220], [w(30), 226], [cx + 68, 270], [cx + 52, 288]], shade(top, 0.88), rnd);
  blob(ctx, cx + 64, 284, 14, 13, skin, rnd);

  // neck and head, with a jaw and a nose. A heavy figure gets a thicker neck,
  // a wider jaw and a jowl — without them a wide body under a normal head just
  // reads as a tall man in a big coat.
  const H = look.heavy ? 1.2 : 1, hx = dx => cx + dx * H;
  wob(ctx, [[hx(-10), 186], [hx(20), 186], [hx(18), 214], [hx(-12), 214]], shade(skin, 0.78), rnd, { amp: look.heavy ? 3 : 2.2 });
  wob(ctx, [[hx(-32), 132], [hx(16), 122], [hx(40), 148], [hx(48), 168], [hx(36), 174], [hx(32), 192], [hx(6), 202], [hx(-22), 198], [hx(-36), 168]], skin, rnd, { amp: 3 });
  if (look.heavy) {
    // the jowl, and the shoulders coming up to meet it
    wob(ctx, [[hx(-20), 186], [hx(24), 182], [hx(30), 200], [hx(-14), 206]], shade(skin, 0.92), rnd, { amp: 3, width: 3 });
    wob(ctx, [[hx(28), 176], [hx(40), 180], [hx(34), 196]], shade(skin, 0.84), rnd, { width: 3 });
  }
  brush(ctx, cx - 22, 146, 52, 48, shade(skin, 1.22), rnd, 0.45);
  // eye, socket and brow — the socket is what makes a face look worn
  ctx.globalAlpha = 0.35; ctx.fillStyle = INK; ctx.fillRect(hx(10), 144, 26 * H, 14); ctx.globalAlpha = 1;
  ctx.fillStyle = INK; ctx.fillRect(hx(18), 150, 7, 7); ctx.fillRect(hx(12), 139, 20 * H, 4);
  // stubble
  ctx.globalAlpha = 0.3 * g;
  for (let i = 0; i < 90; i++) { ctx.fillStyle = INK; ctx.fillRect(hx(-20) + rnd() * 52 * H, 168 + rnd() * 32, 2, 2); }
  ctx.globalAlpha = 1;

  // hair
  const hs = look.hairStyle;
  if (hs === 'greasy') { wob(ctx, [[cx - 40, 134], [cx + 18, 120], [cx + 26, 138], [cx - 22, 150], [cx - 34, 186], [cx - 46, 178]], hair, rnd, { amp: 3 }); }
  if (hs === 'tangle') { wob(ctx, [[cx - 46, 140], [cx + 20, 112], [cx + 32, 138], [cx + 14, 134], [cx - 20, 196], [cx - 52, 186]], hair, rnd, { amp: 5 });
    for (let i = 0; i < 7; i++) wob(ctx, [[cx - 40 + i * 4, 150 + i * 6], [cx - 62 + rnd() * 10, 140 + i * 8], [cx - 44 + i * 4, 158 + i * 6]], hair, rnd, { width: 3, amp: 4 }); }
  if (hs === 'shaggy') { wob(ctx, [[cx - 42, 138], [cx + 20, 116], [cx + 30, 140], [cx - 24, 154], [cx - 40, 176]], hair, rnd, { amp: 4 }); }
  if (hs === 'bald') { wob(ctx, [[cx - 34, 158], [cx - 24, 140], [cx - 16, 158], [cx - 26, 180]], hair, rnd, { width: 3, amp: 3 }); }
  // lank: long, unwashed, hanging in strands past the jaw — it is most of what
  // reads at a distance on the wanderer's silhouette
  if (hs === 'lank') {
    wob(ctx, [[cx - 44, 140], [cx + 16, 118], [cx + 30, 140], [cx - 18, 148], [cx - 26, 206], [cx - 48, 200]], hair, rnd, { amp: 4 });
    for (let i = 0; i < 6; i++) wob(ctx, [[cx - 42 + i * 5, 150], [cx - 52 + (i % 2) * 8, 176 + i * 8], [cx - 40 + i * 5, 172 + i * 6]], hair, rnd, { width: 4, amp: 3 });
  }
  // slick: combed flat back off a heavy brow, one wave at the crown
  if (hs === 'slick') {
    wob(ctx, [[cx - 38, 152], [cx - 22, 122], [cx + 18, 118], [cx + 30, 134], [cx - 6, 132], [cx - 30, 160]], hair, rnd, { amp: 2.5 });
    wob(ctx, [[cx - 38, 152], [cx - 46, 168], [cx - 30, 166]], hair, rnd, { width: 3 });
  }

  // hats
  const hat = look.hat;
  if (hat === 'beanie') { wob(ctx, [[cx - 40, 140], [cx - 30, 108], [cx + 18, 104], [cx + 32, 138], [cx - 34, 152]], shade(look.accent, 0.7), rnd, { amp: 3 });
    wob(ctx, [[cx - 42, 136], [cx + 34, 130], [cx + 34, 146], [cx - 42, 152]], shade(look.accent, 0.5), rnd); }
  // A bucket hat. The reference sheet carries a real supermarket wordmark on
  // it; the shape and the yellow are what read at this size, and the mark is
  // not reproduced.
  if (hat === 'bucket') {
    const hc = look.hatColor ?? look.accent;
    wob(ctx, [[cx - 38, 134], [cx - 28, 106], [cx + 16, 102], [cx + 30, 130], [cx - 34, 142]], hc, rnd, { amp: 3 });
    wob(ctx, [[cx - 50, 130], [cx + 44, 124], [cx + 40, 146], [cx - 46, 150]], shade(hc, 0.88), rnd, { amp: 3.5 });
    brush(ctx, cx - 44, 106, 84, 40, shade(hc, 1.2), rnd, 0.9);
  }
  if (hat === 'cap') { wob(ctx, [[cx - 38, 136], [cx - 22, 112], [cx + 20, 112], [cx + 28, 138], [cx - 34, 150]], shade(top, 1.15), rnd);
    wob(ctx, [[cx + 12, 130], [cx + 62, 136], [cx + 60, 146], [cx + 14, 142]], shade(top, 0.72), rnd); }
  if (hat === 'hood') wob(ctx, [[cx - 52, 146], [cx - 12, 96], [cx + 34, 118], [cx + 30, 136], [cx - 6, 124], [cx - 32, 152], [cx - 38, 214], [cx - 56, 204]], shade(top, 0.8), rnd, { amp: 3.5 });
  if (hat === 'feather') { wob(ctx, [[cx - 42, 138], [cx + 26, 116], [cx + 30, 132], [cx - 38, 150]], shade(bottom, 1.1), rnd);
    wob(ctx, [[cx - 22, 128], [cx - 46, 70], [cx - 32, 66], [cx - 4, 122]], look.accent, rnd); }
  if (hat === 'helm') wob(ctx, [[cx - 42, 138], [cx - 26, 102], [cx + 22, 98], [cx + 42, 138], [cx + 40, 162], [cx + 28, 162], [cx + 26, 140], [cx - 32, 150]], shade(top, 1.1), rnd);
  if (hat === 'horns') { wob(ctx, [[cx - 32, 132], [cx - 54, 78], [cx - 18, 118]], '#cfc6b2', rnd); wob(ctx, [[cx + 14, 124], [cx + 28, 76], [cx + 32, 122]], '#cfc6b2', rnd); }

  // a cigarette, burning, with the smoke drifting back over the shoulder
  if (look.smoke) {
    wob(ctx, [[cx + 34, 176], [cx + 60, 170], [cx + 61, 176], [cx + 35, 182]], '#e8e2d2', rnd, { width: 2 });
    ctx.fillStyle = '#d86a30'; ctx.fillRect(cx + 59, 170, 4, 6);
    ctx.strokeStyle = 'rgba(226,222,212,0.5)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx + 62, 168);
    ctx.bezierCurveTo(cx + 78, 148, cx + 54, 132, cx + 68, 112); ctx.stroke();
  }
  // a gold chain: on this bridge it is the whole characterisation of the one
  // person with money
  if (look.chain) {
    ctx.strokeStyle = '#d8b43a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx - 6, 212); ctx.quadraticCurveTo(cx + 8, 238, cx + 20, 214); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.stroke();
  }

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
// A canal rat, and the roster's weakest drawing until now: it was a body and
// two ears while every bum had a hat, hair, a prop and a silhouette. There is
// no shading inside a flat fill, so everything that says MANGY has to be either
// a shape or a mark — a spine ridge and a hunched back in the outline, matted
// clumps along it, a bald tail, ribs showing, a milky eye, a chewed ear.
function rat(ctx, look, rnd) {
  const cx = 128, foot = 470;
  const body = look.body, dark = shade(look.body, 0.66), lit = shade(look.body, 1.3);
  // the tail: bald, kinked, and thicker at the root. Drawn first, behind.
  ctx.strokeStyle = look.beak; ctx.lineWidth = 11; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 66, 402);
  ctx.bezierCurveTo(cx - 132, 410, cx - 168, 372, cx - 128, 314);
  ctx.stroke();
  ctx.lineWidth = 5; ctx.strokeStyle = shade(look.beak, 0.72);
  ctx.beginPath(); ctx.moveTo(cx - 128, 314); ctx.lineTo(cx - 118, 292); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx - 66, 402); ctx.bezierCurveTo(cx - 132, 410, cx - 168, 372, cx - 128, 314); ctx.lineTo(cx - 118, 292); ctx.stroke();
  // the body: a HUNCH. The arch of the back is where the shape has to happen,
  // because a flat fill has nowhere else to put it.
  blob(ctx, cx - 34, 400, 60, 50, dark, rnd, { amp: 3.5 });
  wob(ctx, [[cx - 82, foot - 6], [cx - 76, 372], [cx - 44, 322], [cx + 4, 310], [cx + 52, 340],
    [cx + 72, 382], [cx + 74, 416], [cx + 34, foot - 6]], body, rnd, { amp: 4.5 });
  brush(ctx, cx - 56, 330, 110, 84, lit, rnd, 1.3);
  // ribs, read through a thin flank
  ctx.globalAlpha = 0.4; ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - 30 + i * 15, 356 + i * 3);
    ctx.quadraticCurveTo(cx - 24 + i * 15, 384, cx - 34 + i * 15, 404);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Matted fur breaking the outline. Evenly spaced triangles read as a BOAR —
  // the first cut looked like a hedgehog. Fur clumps are irregular in height,
  // spacing and lean, they mostly lie back along the animal, and they are the
  // body's own colour: a tuft is hair stuck together, not a spine.
  // Walk the back and put a tuft down only SOMETIMES. Evenly spaced marks read
  // as a comb whatever their heights are; the gaps are what make it fur.
  let t = 0.04;
  while (t < 0.96) {
    t += 0.03 + rnd() * 0.12;                             // irregular spacing, and gaps
    if (rnd() < 0.28) continue;
    const ax = cx - 76 + t * 146, ay = 370 - Math.sin(t * Math.PI) * 56;
    const h = 3 + rnd() * rnd() * 16;                     // mostly short, rarely long
    const lean = -5 - rnd() * 10;                         // swept back toward the tail
    const w = 3 + rnd() * 4;
    wob(ctx, [[ax - w, ay + 9], [ax + lean * 0.5 + (rnd() - 0.5) * 5, ay - h], [ax + w, ay + 9]],
      rnd() > 0.7 ? dark : body, rnd, { width: 1.6, amp: 1.8 });
  }
  // head: a wedge, dropped low, with the snout leading
  wob(ctx, [[cx + 30, 344], [cx + 78, 338], [cx + 116, 382], [cx + 120, 404], [cx + 76, 416], [cx + 40, 398]], look.head, rnd, { amp: 3 });
  wob(ctx, [[cx + 104, 384], [cx + 132, 394], [cx + 104, 406]], look.beak, rnd, { width: 3 });
  blob(ctx, cx + 128, 396, 5, 4, shade(look.beak, 0.5), rnd, { width: 1.6 });   // wet nose
  // A jaw line, so the head is a head and not the front of the body
  ctx.strokeStyle = INK; ctx.globalAlpha = 0.5; ctx.lineWidth = 2.6;
  ctx.beginPath(); ctx.moveTo(cx + 40, 352); ctx.quadraticCurveTo(cx + 52, 388, cx + 46, 410); ctx.stroke();
  ctx.globalAlpha = 1;
  // Ears: FLAPS, not donuts, and set back on the skull. The first cut was a big
  // ringed disc in the middle of the head and every eye went to it — it read as
  // the eye, and the actual eye read as a speck. One whole, one chewed; nothing
  // on this animal is a matched pair.
  const earC = shade(look.beak, 0.78);
  wob(ctx, [[cx + 36, 342], [cx + 40, 318], [cx + 58, 316], [cx + 60, 340]], earC, rnd, { width: 3, amp: 2 });
  ctx.globalAlpha = 0.5;
  wob(ctx, [[cx + 42, 338], [cx + 45, 324], [cx + 55, 323], [cx + 56, 337]], shade(look.beak, 0.5), rnd, { width: 0, stroke: null });
  ctx.globalAlpha = 1;
  wob(ctx, [[cx + 64, 336], [cx + 70, 318], [cx + 82, 322], [cx + 78, 330], [cx + 84, 336]], earC, rnd, { width: 3, amp: 2 });
  // The eye, and it has to read at 40px on a deck: a dark bead, a milky cast
  // over it, one hard glint. A 5px square was invisible.
  blob(ctx, cx + 74, 370, 11, 11, '#d6cfba', rnd, { width: 2.8 });
  blob(ctx, cx + 76, 371, 6, 6, INK, rnd, { width: 0, stroke: null });
  ctx.globalAlpha = 0.4; ctx.fillStyle = '#eae6da';
  ctx.beginPath(); ctx.arc(cx + 74, 370, 10, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = '#f0ece0'; ctx.fillRect(cx + 71, 366, 3, 3);
  // whiskers, and one broken tooth
  ctx.strokeStyle = 'rgba(230,222,208,0.8)'; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx + 110, 394); ctx.lineTo(cx + 156 + rnd() * 10, 362 + i * 18); ctx.stroke(); }
  ctx.fillStyle = '#ded6c4'; ctx.fillRect(cx + 106, 406, 7, 12);
  ctx.fillStyle = shade('#ded6c4', 0.7); ctx.fillRect(cx + 106, 412, 7, 6);
  // feet: splayed, with claws
  for (const x of [cx - 54, cx + 4, cx + 50]) {
    wob(ctx, [[x, foot - 24], [x + 26, foot - 28], [x + 32, foot], [x - 4, foot]], dark, rnd, { width: 3 });
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 4 + i * 9, foot); ctx.lineTo(x + 1 + i * 9, foot + 7); ctx.stroke(); }
  }
}

// The mutating blob, and the one place "Eldritch Kallio" actually has to land.
// It was a flat green lump with two eyes. A cutout has no shading to be wrong
// in, so WRONG has to live in the silhouette and in what you can see inside it:
// the mass sags to one side under its own weight, a pseudopod reaches somewhere
// the body is not going, and the canal's rubbish is suspended in it — bottle
// caps, a trolley wheel, a ring-pull, something that used to have a bone in it.
function slime(ctx, look, rnd) {
  const cx = 128, foot = 470;
  const body = look.body, deep = shade(body, 0.62), lit = shade(body, 1.42);
  // ── the mass. Deliberately unbalanced: heavy and sagging on the left, drawn
  // up into a thin peak on the right, so no axis of it matches another.
  wob(ctx, [[cx - 116, foot], [cx - 124, 398], [cx - 96, 340], [cx - 52, 300], [cx - 14, 276],
    [cx + 16, 296], [cx + 34, 250], [cx + 54, 292], [cx + 96, 336], [cx + 116, 396],
    [cx + 104, 440], [cx + 96, foot]], body, rnd, { amp: 8 });
  // an unexplained bulge, as if something under the surface moved
  blob(ctx, cx - 74, 402, 42, 38, shade(body, 1.12), rnd, { amp: 5, width: 3 });
  // pseudopods, one reaching and one collapsing
  wob(ctx, [[cx + 92, 340], [cx + 158, 288], [cx + 150, 328], [cx + 172, 344], [cx + 106, 372]], shade(body, 0.86), rnd, { amp: 5 });
  wob(ctx, [[cx - 100, 380], [cx - 158, 366], [cx - 140, 404], [cx - 96, 410]], shade(body, 0.86), rnd, { amp: 5 });
  // the wet top where the torch lands
  blob(ctx, cx - 20, 332, 66, 42, look.head, rnd, { stroke: null });
  brush(ctx, cx - 92, 312, 180, 140, lit, rnd, 1.8);

  // ── what is inside it. Drawn UNDER a translucent wash so it reads as
  // suspended rather than stuck on: this thing has been eating the canal.
  ctx.save();
  ctx.globalAlpha = 0.78;
  const wheel = [cx - 58, 424];                                    // a trolley wheel
  blob(ctx, wheel[0], wheel[1], 19, 19, '#3c4046', rnd, { width: 2.6 });
  blob(ctx, wheel[0], wheel[1], 7, 7, '#6a7078', rnd, { width: 2 });
  for (let i = 0; i < 5; i++) {                                     // bottle caps
    const x = cx - 96 + rnd() * 190, y = 340 + rnd() * 110;
    blob(ctx, x, y, 8, 6, i % 2 ? '#8e3a2c' : '#b8a03a', rnd, { width: 2 });
  }
  ctx.strokeStyle = '#cfc6ae'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx + 46, 424); ctx.lineTo(cx + 74, 438); ctx.stroke();   // a bone
  blob(ctx, cx + 44, 422, 5, 5, '#cfc6ae', rnd, { width: 1.6 });
  blob(ctx, cx + 76, 440, 5, 5, '#cfc6ae', rnd, { width: 1.6 });
  blob(ctx, cx + 20, 386, 7, 7, '#9aa0a6', rnd, { width: 2 });                          // a ring-pull
  ctx.restore();
  // the wash that puts them back under the surface
  ctx.save(); ctx.globalAlpha = 0.2; ctx.fillStyle = body;
  ctx.beginPath(); ctx.ellipse(cx - 6, 392, 130, 108, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();

  // bubbles rising through it, smaller at the top where they are about to go
  for (let i = 0; i < 11; i++) {
    const t = rnd(), y = 300 + t * 150;
    blob(ctx, cx - 84 + rnd() * 176, y, 3 + t * 8, 3 + t * 8, shade(body, 1.22), rnd, { width: 2 });
  }

  // ── the eyes. Not two: FOUR, at three sizes, none of them a pair and one of
  // them clouded over. A matched pair reads as a face; a mismatched crowd reads
  // as something that grew them.
  const eye = (x, y, r, pupil = 1) => {
    blob(ctx, x, y, r, r * 1.08, '#e6e2d2', rnd, { width: 3 });
    // a ROUND pupil — the first cut used fillRect and every eye had a square in
    // it, which is the one shape that reads as UI rather than as an animal
    if (pupil) {
      blob(ctx, x + r * 0.1, y + r * 0.06, r * 0.42, r * 0.5, INK, rnd, { width: 0, stroke: null });
      ctx.fillStyle = 'rgba(240,236,224,0.8)';
      ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.36, Math.max(1.5, r * 0.16), 0, Math.PI * 2); ctx.fill();
    }
  };
  eye(cx + 2, 344, 21);
  eye(cx + 52, 368, 12);
  eye(cx - 44, 336, 8);
  eye(cx + 30, 306, 6, 0);                       // this one has clouded over
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#b9b6a4';
  ctx.beginPath(); ctx.arc(cx + 30, 306, 6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;

  // A slack mouth with nothing behind it — and NOT a rectangle. The first cut
  // was a black bar and read as a letterbox cut in the card. It hangs open
  // unevenly, deeper on the heavy side, with two strands still bridging it.
  wob(ctx, [[cx - 12, 406], [cx + 22, 396], [cx + 68, 402], [cx + 58, 428], [cx + 20, 438], [cx - 2, 424]],
    shade(look.beak, 0.8), rnd, { width: 4, amp: 4 });
  wob(ctx, [[cx - 4, 410], [cx + 20, 402], [cx + 58, 408], [cx + 50, 424], [cx + 18, 431], [cx + 2, 421]],
    '#140f0c', rnd, { width: 0, stroke: null, amp: 3 });
  ctx.strokeStyle = shade(body, 1.25); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  for (let i = 0; i < 2; i++) {
    const x = cx + 10 + i * 26;
    ctx.beginPath(); ctx.moveTo(x, 405); ctx.quadraticCurveTo(x + 3, 417, x - 2, 428); ctx.stroke();
  }

  // it is dripping, and the drips are not evenly spaced
  for (let i = 0; i < 5; i++) {
    const x = cx - 96 + rnd() * 190, len = 18 + rnd() * 34;
    wob(ctx, [[x, foot - 12], [x + 11, foot - 12], [x + 7, foot + len], [x + 3, foot + len]], shade(body, 0.88), rnd, { width: 2 });
    blob(ctx, x + 5, foot + len, 5, 6, shade(body, 0.8), rnd, { width: 2 });
  }
}

// ── the torch, painted in ──────────────────────────────────────────────────
// A cutout is an UNLIT plane, so nothing the scene's lights do reaches it. Once
// the hour went to evening that stopped being a detail and became the whole
// problem: the world went dark and the figures stayed in daylight, standing in
// front of the night rather than in it.
//
// Painting the light in is the Darkest Dungeon answer anyway — its figures are
// not lit by an engine either, they are DRAWN lit. Three passes, in the order a
// painter would work:
//
//   1. the shadow side, a cold wash gathering toward the far edge
//   2. the torch side, a warm wash on the near edge
//   3. a RIM on each side — a bright warm edge where the torch catches the
//      silhouette, a cold one opposite. The rim is the load-bearing pass: a
//      dark figure against a dark backdrop has no outline until something
//      draws one, and DD's whole cast is legible for exactly this reason.
function edgeBand(src, dx, colour, width = 3) {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'destination-out';
  x.drawImage(src, dx * width, 0);              // subtract a shifted copy: one edge survives
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = colour; x.fillRect(0, 0, c.width, c.height);
  return c;
}

function torchlight(c, mood) {
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  // 1 + 2: the wash across the figure. `source-atop` keeps the silhouette, so
  // the nicked edges and the gaps between limbs stay gaps.
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, `${mood.warm}55`);
  g.addColorStop(0.35, 'rgba(0,0,0,0)');
  g.addColorStop(1, `${mood.cold}${mood.depth}`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // and a floor-up darkening: the torch is above the deck, so boots are darker
  // than a face. Without it a figure reads as a sticker at one value.
  const v = ctx.createLinearGradient(0, H * 0.45, 0, H);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `${mood.cold}66`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // 3: the rims, added rather than painted, so they read as light and not paint
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.85; ctx.drawImage(edgeBand(c, 1, mood.warm, 3), 0, 0);
  ctx.globalAlpha = 0.5; ctx.drawImage(edgeBand(c, -1, mood.rim, 2), 0, 0);
  ctx.restore();
  return c;
}

// The default hour. `main.js` hands the active skin's in when it builds a
// puppet, so the fantasy evening lights its cast its own way.
export const DUSK = { warm: '#ffab52', cold: '#101a24', rim: '#6f93ad', depth: '99' };

export function paintCutout(look, seed = 1, mood = DUSK) {
  const c = document.createElement('canvas');
  c.width = TW; c.height = TH;
  const ctx = c.getContext('2d');
  const rnd = rngFrom(seed * 7919 + 17);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (look.shape === 'rat') rat(ctx, look, rnd);
  else if (look.shape === 'blob') slime(ctx, look, rnd);
  else person(ctx, look, rnd);
  // ORDER MATTERS, and it cost a figure with chickenpox to find out: the rim
  // pass finds every edge in the alpha, and `nicks` punches HOLES in it, so
  // rimming first drew a glowing ring around each of forty nicks. Light the
  // clean silhouette, then take the bites out — which is also the true order,
  // since a cutout is painted first and carried around afterwards.
  if (mood) torchlight(c, mood);
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

// Knocked back deliberately: against dark wet timber a bright tan base is the
// brightest thing on the deck and pulls the eye off the figure standing on it.
const BOARD = new THREE.MeshLambertMaterial({ color: '#7d6144' });
const FLUTE = new THREE.MeshLambertMaterial({ color: '#5f4831' });
// Tin: dull, scratched, and a touch warm — a toy soldier's base is stamped
// metal that has been in a tin with thirty others, not chrome.
const TIN = new THREE.MeshLambertMaterial({ color: '#7a7d84' });
const TIN_DARK = new THREE.MeshLambertMaterial({ color: '#6a6d74' });

// ── the object ───────────────────────────────────────────────────────────
export class Puppet {
  constructor({ look, seed = 1, scale = 1, facing = 1, mood = DUSK }) {
    this.group = new THREE.Group();
    this.scale = scale;
    this.facing = facing;
    this.alive = true;
    this.fall = null;           // { angle, vel, axis, done }
    this.wobble = 0; this.wobbleVel = 0;
    this.flash = 0;
    this.lunge = 0;             // slide toward the other side, for an attack
    this.lightK = 1;            // set by the arena each frame from the torch
    this.home = new THREE.Vector3();

    const front = paintCutout(look, seed, mood);
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
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 4);
    // A cutout is unlit, so the arena hands it a light LEVEL and the hit flash
    // rides on top of it — otherwise a flash would reset a figure standing in
    // the dark to full brightness and leave it there.
    const k = this.lightK * (1 + this.flash * 1.6);
    this.mat.color.setRGB(k, k, k);

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
