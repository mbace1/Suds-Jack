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
import { poseAt, frameAt, clipLength, REST } from './motion.js?v=31';
import { plateReady, drawPlate, posesFor } from './plates.js?v=38';

const TW = 256, TH = 512;        // texture size; the figure fills ~70% of the height
export const PUPPET_H = 1.5;     // world height of a scale-1 figure

// ── the painter ──────────────────────────────────────────────────────────
function rngFrom(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const INK = '#1b1410';

// HEX OUT, NOT `rgb()` (v46). Canvas takes either, so this was invisible for
// forty-five versions — until `bands` and `wear` arrived, which have to read a
// fill back to darken it and bail on anything that is not `#rrggbb`. Every
// derived tone in every painter (`dark`, `lit`, an ear, a nose) comes through
// here, so returning `rgb()` would have left the new passes working on the
// base colours alone and silently flat everywhere else.
function shade(hex, k) {
  const c = parseInt(hex.slice(1), 16);
  const ch = i => Math.max(0, Math.min(255, Math.round(((c >> (16 - i * 8)) & 255) * k)));
  return '#' + [ch(0), ch(1), ch(2)].map(v => v.toString(16).padStart(2, '0')).join('');
}

// ── the shared hand's modelling, from cardart.js v29 ─────────────────────
// v29 gave the CARDS banding, wear and a harder ink line and every one of the
// forty-two pictures moved, because `wob` and `blob` draw all of them. The
// figures never got that pass, so the frame carried two art languages at once:
// thirteen photographed people in TURF's register standing beside ten animals
// filled with one flat tone each. This is the same code one level along, and
// it lands on all ten at once for the same reason — nothing below is redrawn.
const LIGHT = { x: -0.55, y: -0.83 };   // the torch, up and to the left

// A BAND IS A FRACTION OF THE THING, never of the sheet — v29 paid for that
// once, when half-planes measured from the middle of the card fell entirely on
// one side of a small object and darkened it instead of modelling it.
function bands(ctx, path, fill, rnd, k = 1, box) {
  if (!fill || fill[0] !== '#') return;
  const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
  const R = Math.max(10, Math.hypot(box.x1 - box.x0, box.y1 - box.y0));
  const plane = (ox, oy) => {
    ctx.beginPath();
    ctx.moveTo(cx + ox + LIGHT.y * R, cy + oy - LIGHT.x * R);
    ctx.lineTo(cx + ox - LIGHT.y * R, cy + oy + LIGHT.x * R);
    ctx.lineTo(cx + ox - LIGHT.y * R - LIGHT.x * R * 2, cy + oy + LIGHT.x * R - LIGHT.y * R * 2);
    ctx.lineTo(cx + ox + LIGHT.y * R - LIGHT.x * R * 2, cy + oy - LIGHT.x * R - LIGHT.y * R * 2);
    ctx.closePath(); ctx.fill();
  };
  ctx.save();
  ctx.clip(path);
  for (const [step, dark] of [[0.24, 0.76], [0.54, 0.58]]) {
    ctx.fillStyle = shade(fill, dark + (1 - k) * (1 - dark));
    plane(-LIGHT.x * R * step, -LIGHT.y * R * step);
  }
  ctx.globalAlpha = 0.42 * k;                       // the catch is a THIN band, never a gradient
  ctx.fillStyle = shade(fill, 1.22);
  ctx.beginPath();
  ctx.moveTo(cx + LIGHT.x * R * 0.46 + LIGHT.y * R, cy + LIGHT.y * R * 0.46 - LIGHT.x * R);
  ctx.lineTo(cx + LIGHT.x * R * 0.46 - LIGHT.y * R, cy + LIGHT.y * R * 0.46 + LIGHT.x * R);
  ctx.lineTo(cx + LIGHT.x * R * 0.46 - LIGHT.y * R + LIGHT.x * R * 2, cy + LIGHT.y * R * 0.46 + LIGHT.x * R + LIGHT.y * R * 2);
  ctx.lineTo(cx + LIGHT.x * R * 0.46 + LIGHT.y * R + LIGHT.x * R * 2, cy + LIGHT.y * R * 0.46 - LIGHT.x * R + LIGHT.y * R * 2);
  ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// WEAR. Rain and grease run DOWN — a streak going any other way reads as a
// scratch — and a thing that has lived in a canal is mostly streaks. Chips are
// taken where a shape gets knocked. Both are measured against the SHAPE.
function wear(ctx, path, fill, rnd, k = 1, box) {
  if (!fill || fill[0] !== '#' || k <= 0) return;
  const bw = Math.max(4, box.x1 - box.x0), bh = Math.max(4, box.y1 - box.y0);
  ctx.save();
  ctx.clip(path);
  for (let i = 0; i < Math.round(6 * k); i++) {
    const x = box.x0 + rnd() * bw, y = box.y0 + rnd() * bh * 0.7;
    const len = bh * (0.12 + rnd() * 0.4) * k, w = bw * 0.012 + rnd() * bw * 0.02;
    ctx.globalAlpha = 0.10 + rnd() * 0.16;
    ctx.fillStyle = rnd() > 0.45 ? shade(fill, 0.6) : shade(fill, 1.18);
    ctx.fillRect(x, y, Math.max(0.8, w), len);
  }
  for (let i = 0; i < Math.round(8 * k); i++) {
    const x = box.x0 + rnd() * bw, y = box.y0 + rnd() * bh;
    ctx.globalAlpha = 0.10 + rnd() * 0.2;
    ctx.fillStyle = rnd() > 0.5 ? shade(fill, 0.5) : shade(fill, 1.3);
    ctx.fillRect(x, y, 1 + rnd() * bw * 0.02, 1 + rnd() * bh * 0.016);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// Under this span a polygon is a MARK, not a mass: an ear, a claw, a bottle
// cap. Banding one is not modelling, it is a dark patch on something too small
// to have a lit side, and v29's own lesson says a band has to be a fraction of
// the thing it is on.
const BAND_MIN = 50;

// a polygon with a hand's wobble along every edge, banded and worn
//
// THE PATH IS CARRIED, not left on the context. `beginPath()` THROWS THE
// CURRENT PATH AWAY, so a pass that lays a half-plane down to model the shape
// destroys the shape it was supposed to be clipped to — v29 shipped exactly
// that on the cards and every picture came back with two black diagonals ruled
// corner to corner. A Path2D is the fix and is why `bands` can take one.
function wob(ctx, pts, fill, rnd, { stroke = INK, width = 4, amp = 2.2, band = 1, worn = 0.8 } = {}) {
  const path = new Path2D();
  const n = pts.length;
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % n];
    const segs = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 14));
    for (let k = 0; k < segs; k++) {
      const t = k / segs;
      const x = x0 + (x1 - x0) * t + (rnd() - 0.5) * amp;
      const y = y0 + (y1 - y0) * t + (rnd() - 0.5) * amp;
      if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
      if (y < by0) by0 = y; if (y > by1) by1 = y;
      if (i === 0 && k === 0) path.moveTo(x, y); else path.lineTo(x, y);
    }
  }
  path.closePath();
  if (fill) {
    ctx.fillStyle = fill; ctx.fill(path);
    const box = { x0: bx0, y0: by0, x1: bx1, y1: by1 };
    if (Math.hypot(bx1 - bx0, by1 - by0) >= BAND_MIN) {
      if (band > 0) bands(ctx, path, fill, rnd, band, box);
      if (worn > 0) wear(ctx, path, fill, rnd, worn, box);
    }
  }
  if (stroke) {
    // the line is drawn twice at different weights: a brush loaded unevenly
    ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = width; ctx.stroke(path);
    ctx.globalAlpha = 0.5; ctx.lineWidth = width * (1.5 + rnd() * 0.5); ctx.stroke(path); ctx.globalAlpha = 1;
  }
}

function blob(ctx, cx, cy, rx, ry, fill, rnd, opts) {
  const pts = [];
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  wob(ctx, pts, fill, rnd, opts);
}

// Scumbled paint: short broken strokes of a lighter and a darker tone over a
// fill, which is what stops a flat colour reading as vector art.
//
// AND IT IS CLIPPED TO WHAT IS ALREADY PAINTED (v46). It never was, and for
// forty-five versions that did not matter, because every caller handed it a
// box sitting well inside a convex body. The moment the bear's back got a dip
// in it, a scumble box drawn over a sloping line put four horizontal dashes in
// mid-air above the animal's shoulder. `source-atop` is what every other pass
// in this file already uses for the same reason.
function brush(ctx, x, y, w, h, color, rnd, k = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
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
function grime(ctx, rnd, k = 0.8, f = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  // Specks and paper tooth. The pale half used to be `255,250,235` at up to
  // 0.12 alpha on 55% of fifteen hundred specks, and NOT scaled by k — so a
  // black coat got full snow whatever its grime was set to, and the figures
  // read as speckled with white dots (owner, 2026-09-07). Tooth is a warm
  // dimness in the board, not light landing on the figure: fewer of them,
  // dimmer, warmer, and scaled like everything else here.
  for (let i = 0; i < 1500; i++) {
    ctx.fillStyle = rnd() > 0.72 ? `rgba(206,196,172,${(0.02 + rnd() * 0.035) * k})` : `rgba(0,0,0,${0.05 + rnd() * 0.1 * k})`;
    ctx.fillRect(rnd() * TW, rnd() * TH, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  // streaks running DOWN the figure: rain, spills, whatever it has been through
  // ...and they are as long as the FIGURE, not as long as the sheet (v46): a
  // 110px run down a person is rain, and down a 135px rat it is a stripe.
  ctx.globalAlpha = 0.12 * k;
  for (let i = 0; i < 22; i++) {
    const x = rnd() * TW, y = 120 + rnd() * 300;
    ctx.fillStyle = rnd() > 0.5 ? '#231a10' : '#0d0a08';
    ctx.fillRect(x, y, 1 + rnd() * 3, (20 + rnd() * 90) * f);
  }
  // a couple of stains
  // Three, not five, and half the alpha: these were tuned against a
  // figure-shaped area, and on a whole board they read as blobs floating on
  // it rather than as something spilled on it.
  ctx.globalAlpha = 0.08 * k;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = '#2a1e10';
    ctx.beginPath(); ctx.ellipse(40 + rnd() * (TW - 80), 160 + rnd() * 300, (12 + rnd() * 26) * f, (8 + rnd() * 18) * f, rnd() * 3, 0, Math.PI * 2); ctx.fill();
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
// A NICK IS DAMAGE AT AN EDGE. This used to punch ellipses anywhere on the
// canvas, which was survivable while the card was die-cut to the figure —
// most of them landed on transparent space and did nothing. On a BOARD every
// point is opaque, so all forty became holes through the middle of it and the
// standee read as woodworm (owner, 2026-09-07). A card gets knocked on its
// rim and its corners; nothing punches a clean hole in the middle of one.
// So a nick is placed where the silhouette actually ENDS: opaque here,
// transparent a few pixels away. It quietly improves the die-cut figures too,
// where a nick in the centre of a torso read as a bullet hole.
function nicks(ctx, rnd, n = 26, f = 1) {
  const d = ctx.getImageData(0, 0, TW, TH).data;
  const at = (x, y) => (x < 0 || y < 0 || x >= TW || y >= TH) ? 0 : d[((y | 0) * TW + (x | 0)) * 4 + 3];
  const onEdge = (x, y, r) => at(x, y) > 40 &&
    (at(x + r, y) < 30 || at(x - r, y) < 30 || at(x, y + r) < 30 || at(x, y - r) < 30);
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, r = 0, found = false;
    for (let t = 0; t < 60 && !found; t++) {
      // v46 — AND A BITE IS A FRACTION OF THE FIGURE. At a fixed 2-8px this
      // is 2% of a person and 6% of a rat, so the same "damage at an edge"
      // took a chunk out of the animal the size of its own ear.
      x = rnd() * TW; y = 90 + rnd() * (TH - 120); r = (2 + rnd() * 6) * f;
      found = onEdge(x, y, r + 3 * f);
    }
    if (!found) continue;                       // nothing to bite here
    ctx.beginPath();
    ctx.ellipse(x, y, r, (2 + rnd() * 5) * f, rnd() * 3, 0, Math.PI * 2);
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
    case 'lead': {
      // a dog's lead, taut, running off the bottom of the frame — the dog is
      // out of shot and pulling, which says more about it than drawing it would
      ctx.strokeStyle = '#8a3a2a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px + 4, py - 6); ctx.quadraticCurveTo(px + 40, py + 60, px + 90, py + 220); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      blob(ctx, px + 4, py - 8, 10, 8, '#6a6a70', rnd, { width: 2.6 });                 // the loop in the hand
      break;
    }
    case 'gloves': {
      // both hands gloved, one up. The glove is the boxer's whole silhouette.
      const g = acc;
      blob(ctx, px + 6, py - 4, 24, 22, g, rnd, { width: 4, amp: 2.5 });
      wob(ctx, [[px - 10, py + 8], [px + 20, py + 6], [px + 22, py + 22], [px - 8, py + 24]], shade(g, 0.8), rnd, { width: 3 });
      for (let i = 0; i < 3; i++) { ctx.strokeStyle = '#e8e0d0'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(px - 2 + i * 6, py + 10); ctx.lineTo(px + i * 6, py + 20); ctx.stroke(); }
      blob(ctx, cx - 62, 262, 22, 20, g, rnd, { width: 4, amp: 2.5 });                    // the back hand, up by the jaw
      wob(ctx, [[cx - 78, 274], [cx - 48, 272], [cx - 46, 288], [cx - 76, 290]], shade(g, 0.8), rnd, { width: 3 });
      break;
    }
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


// ── the non-person cast, SIZED OFF ITS OWN INK ─────────────────────────────
// v42, and it fixes two faults that had been shipping since these painters
// were written. Both were invisible in a fight and obvious the moment the row
// was rendered at full size, which is this project's standing lesson.
//
// 1. THEY WERE ALL THE SAME SIZE. Ten figures ran four painters at one scale,
//    so a canal rat, the King Rat and a blob spawn stood exactly as tall as
//    each other and as a gull. Three drawings wearing ten names - TURF's own
//    "eighteen portraits of one enemy", in art rather than in behaviour.
//
// 2. TWO OF THEM WERE DRAWN OUTSIDE THEIR OWN CANVAS. The bear reaches
//    cx + 172 on a 256-wide texture centred at 128, so THE BEAR HAS NEVER HAD
//    A HEAD - 44px of it, the muzzle and one eye, fell off the right edge, and
//    that is why the act-two boss read as a tombstone. The rat spans 334px in
//    the same 256 and lost its tail on one side and its whiskers on the other.
//
// The fix is the rule this codebase already applies to TURF's plates: SIZE OFF
// THE INK, NEVER THE FRAME. Paint to a scratch canvas big enough that nothing
// can clip, measure the alpha that came out, then place THAT - feet on the
// foot line, height a share of the texture scaled by `look.scale`, centred on
// its own ink rather than on the painter's assumed axis. A painter can now
// draw wherever it likes and a new one cannot silently lose a limb.
// THE SIZE HIERARCHY IS NOT IN HERE, and getting that wrong cost a round trip
// worth writing down. A contact sheet renders TEXTURES; the hierarchy between
// these figures lives on the puppet's world PLANE (`ENEMIES[id].scale`, 0.42
// for a pigeon to 1.32 for the Bear), so the sheet showed ten same-sized
// drawings and a size fix looked obviously needed. Adding one multiplied the
// two together and made the act-two boss SHORTER THAN THE HERO on the bridge,
// which the sheet could not show either. Every figure fills its own texture
// the same way now, and the world scale does what it always did.
const BEAST_FILL = 0.92;              // share of the usable width the drawing takes
const BEAST_MARGIN = 34;              // room for the kraft border to grow into
function drawBeast(ctx, look, rnd) {
  const PAD = 256;                                        // room on every side
  const s = document.createElement('canvas');
  s.width = TW + PAD * 2; s.height = TH + PAD * 2;
  const g = s.getContext('2d');
  g.lineJoin = 'round'; g.lineCap = 'round';
  g.translate(PAD, PAD);
  if (look.shape === 'rat') rat(g, look, rnd);
  else if (look.shape === 'blob') slime(g, look, rnd);
  else if (look.shape === 'bird') bird(g, look, rnd);
  else if (look.shape === 'bear') bear(g, look, rnd);
  else person(g, look, rnd);
  // what actually came out
  const d = g.getImageData(0, 0, s.width, s.height).data;
  let x0 = s.width, y0 = s.height, x1 = -1, y1 = -1;
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) {
    if (d[(y * s.width + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (x1 < 0) return;                                     // painted nothing
  const iw = x1 - x0 + 1, ih = y1 - y0 + 1;
  // Height decides the scale - these are figures standing in a row, and a row
  // reads off how tall things are. Width is then clamped so a wide animal (the
  // bear, nose to tail) still fits rather than being cropped again.
  const usable = TW - BEAST_MARGIN;
  // Width sets the fit because every one of these is LANDSCAPE - a rat is
  // 290x161 of ink, the bear 290x250 - and height is only a cap, so nothing
  // can grow out of the top of its texture the way the bear grew out of the
  // side of it.
  const k = Math.min((usable * BEAST_FILL) / iw, (TH * 0.72) / ih);
  const dw = iw * k, dh = ih * k;
  ctx.drawImage(s, x0, y0, iw, ih, (TW - dw) / 2, 470 - dh, dw, dh);
}

// A rat: low, long and pointed, with the tail doing most of the silhouette.
// A canal rat, and the roster's weakest drawing until now: it was a body and
// two ears while every bum had a hat, hair, a prop and a silhouette. There is
// no shading inside a flat fill, so everything that says MANGY has to be either
// a shape or a mark — a spine ridge and a hunched back in the outline, matted
// clumps along it, a bald tail, ribs showing, a milky eye, a chewed ear.
function rat(ctx, look, rnd) {
  const cx = 128, foot = 470;
  const h = n => foot - n;                      // heights above the deck, as the bear does
  const body = look.body, dark = shade(look.body, 0.66), mid = shade(look.body, 0.84), lit = shade(look.body, 1.3);
  // the tail: bald, kinked, thicker at the root. Drawn first, behind.
  ctx.strokeStyle = look.beak; ctx.lineWidth = 11; ctx.lineCap = 'round';
  const tail = c => { c.beginPath(); c.moveTo(cx - 92, h(62)); c.bezierCurveTo(cx - 150, h(52), cx - 178, h(92), cx - 140, h(152)); c.stroke(); };
  tail(ctx);
  ctx.lineWidth = 5; ctx.strokeStyle = shade(look.beak, 0.72);
  ctx.beginPath(); ctx.moveTo(cx - 140, h(152)); ctx.lineTo(cx - 128, h(174)); ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  tail(ctx); ctx.beginPath(); ctx.moveTo(cx - 140, h(152)); ctx.lineTo(cx - 128, h(174)); ctx.stroke();
  // the far pair of legs, behind the body
  wob(ctx, [[cx - 62, h(66)], [cx - 34, h(62)], [cx - 28, h(10)], [cx - 60, h(10)]], dark, rnd, { amp: 2.5 });
  wob(ctx, [[cx + 18, h(62)], [cx + 44, h(58)], [cx + 46, h(10)], [cx + 16, h(10)]], dark, rnd, { amp: 2.5 });
  // THE BODY IS NOT A BOX. The outline this animal shipped with ran straight
  // down to the deck at both ends and straight across the top, so the "hunch"
  // the comment claimed lived entirely in a 12px rise that the matted fur then
  // filled in — at the size a fight shows it, a brown rectangle with a triangle
  // stuck to one end. A rat is LONG, its back arches to a peak over the
  // shoulder, the rump falls away behind it, and the belly is off the ground:
  // that last one is what turns four trapezoids sitting on a slab into legs.
  wob(ctx, [
    [cx - 96, h(94)], [cx - 56, h(126)], [cx - 10, h(144)],     // rump, up the arch
    [cx + 30, h(138)], [cx + 56, h(114)],                        // over the shoulder
    [cx + 62, h(84)], [cx + 40, h(52)],                          // down the chest
    [cx - 4, h(44)], [cx - 52, h(46)], [cx - 86, h(56)],         // the belly, clear of the deck
    [cx - 102, h(74)],
  ], body, rnd, { amp: 4 });
  brush(ctx, cx - 70, h(138), 120, 80, lit, rnd, 1.3);
  // ribs, read through a thin flank. IRREGULAR: four evenly spaced parallel
  // curves are a comb, which is the same fault the fur had and the gull's
  // primaries still have — the spacing is what makes it anatomy.
  ctx.globalAlpha = 0.34; ctx.strokeStyle = INK; ctx.lineCap = 'round';
  let rx = cx - 18;
  for (let i = 0; i < 5; i++) {
    rx += 9 + rnd() * 11;
    ctx.lineWidth = 1.8 + rnd() * 1.4;
    ctx.beginPath();
    ctx.moveTo(rx, h(112) - rnd() * 8);
    ctx.quadraticCurveTo(rx + 7, h(84), rx - 5 - rnd() * 6, h(58));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // Matted fur breaking the outline. Evenly spaced triangles read as a BOAR —
  // the first cut looked like a hedgehog. Fur clumps are irregular in height,
  // spacing and lean, they mostly lie back along the animal, and they are the
  // body's own colour: a tuft is hair stuck together, not a spine.
  let t = 0.04;
  while (t < 0.94) {
    t += 0.04 + rnd() * 0.13;                             // irregular spacing, and gaps
    if (rnd() < 0.3) continue;
    const ax = cx - 96 + t * 152, ay = h(96 + Math.sin(t * Math.PI) * 50);
    const hh = 4 + rnd() * rnd() * 18;                    // mostly short, rarely long
    const lean = -5 - rnd() * 10;                         // swept back toward the tail
    const w = 3 + rnd() * 4;
    wob(ctx, [[ax - w, ay + 9], [ax + lean * 0.5 + (rnd() - 0.5) * 5, ay - hh], [ax + w, ay + 9]],
      rnd() > 0.7 ? dark : body, rnd, { width: 1.6, amp: 1.8 });
  }
  // the near pair of legs: short, and they END at the deck rather than being
  // three identical trapezoids parked under a slab
  for (const [lx, lw] of [[cx - 48, 26], [cx + 26, 22]]) {
    wob(ctx, [[lx, h(62)], [lx + lw, h(58)], [lx + lw + 4, h(22)], [lx + lw + 9, h(2)], [lx - 5, h(2)], [lx - 2, h(24)]], mid, rnd, { amp: 2.5 });
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(lx + 1 + i * 7, h(4)); ctx.lineTo(lx - 2 + i * 7, h(-5)); ctx.stroke(); }
  }
  // the ear goes down first so the skull crosses it: one whole, one chewed,
  // and nothing on this animal is a matched pair
  const earC = shade(look.beak, 0.78);
  wob(ctx, [[cx + 40, h(134)], [cx + 38, h(150)], [cx + 46, h(162)], [cx + 60, h(164)], [cx + 70, h(154)], [cx + 70, h(138)]], earC, rnd, { width: 3, amp: 2 });
  ctx.globalAlpha = 0.45;
  wob(ctx, [[cx + 45, h(138)], [cx + 44, h(150)], [cx + 54, h(157)], [cx + 64, h(150)], [cx + 64, h(140)]], shade(look.beak, 0.52), rnd, { width: 0, stroke: null, band: 0, worn: 0 });
  ctx.globalAlpha = 1;
  wob(ctx, [[cx + 74, h(132)], [cx + 74, h(148)], [cx + 84, h(156)], [cx + 88, h(146)], [cx + 96, h(148)], [cx + 92, h(134)]], earC, rnd, { width: 3, amp: 2 });
  // THE HEAD: a wedge off the shoulder, carried low, narrowing the whole way
  // to the nose. It used to butt onto the body at a hard vertical seam — two
  // shapes, not one animal.
  wob(ctx, [[cx + 44, h(128)], [cx + 74, h(138)], [cx + 100, h(126)], [cx + 122, h(102)],
    [cx + 132, h(90)], [cx + 118, h(78)], [cx + 90, h(72)], [cx + 58, h(84)]], look.head, rnd, { amp: 3 });
  blob(ctx, cx + 132, h(90), 6, 5, shade(look.beak, 0.5), rnd, { width: 1.8, band: 0, worn: 0 });  // wet nose
  // THE EYE IS A BEAD, and it sits up by the snout where a rat's eye is. An
  // 11px ringed disc in the middle of the skull is the loudest mark on the
  // animal and every glance went to it — v10 recorded that fault about the
  // EAR and the fix put the same ring back in the same place under a new name.
  blob(ctx, cx + 100, h(112), 6, 5.5, '#141013', rnd, { width: 1.8, band: 0, worn: 0 });
  ctx.globalAlpha = 0.28; ctx.fillStyle = '#b9b0a0';        // one milky crescent, off to the shadow side
  ctx.beginPath(); ctx.arc(cx + 102, h(110), 4.6, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  ctx.fillStyle = '#efe9db'; ctx.fillRect(cx + 97, h(114), 2.2, 2.2);
  // a jaw line, so the head is a head and not the front of the body
  ctx.strokeStyle = INK; ctx.globalAlpha = 0.45; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(cx + 56, h(120)); ctx.quadraticCurveTo(cx + 72, h(92), cx + 92, h(76)); ctx.stroke();
  ctx.globalAlpha = 1;
  // whiskers, and one broken tooth
  ctx.strokeStyle = 'rgba(228,220,206,0.75)';
  for (let i = 0; i < 4; i++) {
    ctx.lineWidth = 1.4 + rnd() * 0.8;
    ctx.beginPath(); ctx.moveTo(cx + 124, h(92));
    ctx.quadraticCurveTo(cx + 150, h(96 + i * 10), cx + 172 + rnd() * 10, h(88 + i * 16));
    ctx.stroke();
  }
  ctx.fillStyle = '#ded6c4'; ctx.fillRect(cx + 114, h(76), 6, 11);
  ctx.fillStyle = shade('#ded6c4', 0.7); ctx.fillRect(cx + 114, h(70), 6, 5);

  // v42 — WHAT MAKES THIS RAT THAT RAT. Three rats shared this painter and
  // differed only in the hex of their fur, which at full size is not a
  // difference at all: the row read as one drawing printed three times.
  // Each mark below is on the ART_REQUEST's own description of the animal.

  // `litter` — the Bin Rat has been IN the bin: a crisp packet stuck to its
  // flank and a strip of peel hanging off it. Stuck ON the fur, over the
  // outline, because that is what rubbish does.
  if (look.litter) {
    wob(ctx, [[cx - 26, h(124)], [cx + 6, h(132)], [cx + 16, h(104)], [cx - 16, h(94)]], '#c4482e', rnd, { width: 2.6, amp: 3, band: 0.5 });
    ctx.globalAlpha = 0.45;
    wob(ctx, [[cx - 20, h(124)], [cx + 6, h(128)], [cx + 10, h(110)]], '#e8c84a', rnd, { width: 0, stroke: null, amp: 2, band: 0, worn: 0 });
    ctx.globalAlpha = 1;
    wob(ctx, [[cx - 62, h(96)], [cx - 80, h(62)], [cx - 70, h(38)], [cx - 58, h(64)]], '#8a9a3a', rnd, { width: 2.2, amp: 3, band: 0 });
  }

  // `scars` — the King Rat has WON. Bald patches where the fur never came
  // back, and two closed slashes across the shoulder.
  if (look.scars) {
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 3; i++) blob(ctx, cx - 36 + i * 34, h(118 - (i % 2) * 22), 13 + rnd() * 7, 8 + rnd() * 5, shade(look.beak, 0.86), rnd, { width: 0, stroke: null, band: 0, worn: 0 });
    ctx.globalAlpha = 1;
    ctx.strokeStyle = shade(look.beak, 1.1); ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    for (const [x0, y0, x1, y1] of [[cx - 4, h(146), cx + 30, h(110)], [cx + 12, h(150), cx + 40, h(124)]]) {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.4;
      for (let k = 1; k < 4; k++) {                                   // the stitches that closed it
        const tt = k / 4, mx = x0 + (x1 - x0) * tt, my = y0 + (y1 - y0) * tt;
        ctx.beginPath(); ctx.moveTo(mx - 6, my - 3); ctx.lineTo(mx + 6, my + 3); ctx.stroke();
      }
      ctx.strokeStyle = shade(look.beak, 1.1); ctx.lineWidth = 3.4;
    }
  }

  // `crown` — a BOTTLE-CAP crown, which is the ART_REQUEST's own word for it,
  // and it has to sit on the skull rather than float over it: a bent wire
  // band with three caps crimped on, one of them missing.
  if (look.crown) {
    const cy = h(166), kx = cx + 66;
    ctx.strokeStyle = '#b9a34a'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
    const band = c => { c.beginPath(); c.moveTo(kx - 30, cy + 12); c.quadraticCurveTo(kx, cy - 2, kx + 30, cy + 10); c.stroke(); };
    band(ctx);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.6; band(ctx);
    const caps = [[kx - 24, cy + 4, '#b8402c'], [kx + 2, cy - 10, '#c8a83a'], [kx + 26, cy + 2, '#3a6a8a']];
    for (const [x, y, col] of caps) {
      blob(ctx, x, y, 10, 9, col, rnd, { width: 2.6, band: 0, worn: 0 });
      blob(ctx, x, y, 4.5, 4, shade(col, 0.72), rnd, { width: 0, stroke: null, band: 0, worn: 0 });
      ctx.strokeStyle = shade(col, 0.6); ctx.lineWidth = 1.4;                // the crimped rim
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * 7, y + Math.sin(a) * 6.5); ctx.lineTo(x + Math.cos(a) * 10, y + Math.sin(a) * 9); ctx.stroke();
      }
    }
    // the gap where a fourth one came off, wire still bent for it
    ctx.strokeStyle = '#b9a34a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(kx + 30, cy + 10); ctx.lineTo(kx + 40, cy + 2); ctx.stroke();
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

  // v42 — TAR IS A DIFFERENT MATERIAL, and that is the whole difference
  // between this and the green one. The tar blob shipped as the same drawing
  // in a darker hex, which at full size is not a second enemy. Tar does not
  // hold the canal's rubbish in suspension (it is opaque), it does not bubble
  // (it sags), and it takes a HARD SPECULAR the gel never does - one bright
  // sliver where the torch hits a wet skin, which is the one thing that says
  // "glossy" on a flat fill.
  if (look.glossy) {
    // A skin of tar over the SUSPENDED JUNK ONLY, and nowhere near the face.
    // The first cut washed the whole mass at 0.72 and the tar blob lost its
    // eyes and its mouth - a material pass that costs the figure its read is
    // worse than the recolour it replaced.
    ctx.save(); ctx.globalAlpha = 0.66; ctx.fillStyle = shade(body, 0.9);
    ctx.beginPath(); ctx.ellipse(cx - 30, 424, 116, 56, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // and the face is put BACK on top of it, brighter than the tar so it reads
    const teye = (x, y, r) => {
      blob(ctx, x, y, r, r * 1.08, '#e8e4d4', rnd, { width: 3 });
      blob(ctx, x + r * 0.1, y + r * 0.06, r * 0.44, r * 0.52, INK, rnd, { width: 0, stroke: null });
      ctx.fillStyle = 'rgba(244,240,230,0.9)';
      ctx.beginPath(); ctx.arc(x - r * 0.32, y - r * 0.36, Math.max(1.6, r * 0.17), 0, Math.PI * 2); ctx.fill();
    };
    teye(cx + 2, 344, 21); teye(cx + 52, 368, 12); teye(cx - 44, 336, 8);
    wob(ctx, [[cx - 12, 406], [cx + 22, 396], [cx + 68, 402], [cx + 58, 428], [cx + 20, 438], [cx - 2, 424]],
      shade(body, 1.9), rnd, { width: 4, amp: 4 });
    wob(ctx, [[cx - 4, 410], [cx + 20, 402], [cx + 58, 408], [cx + 50, 424], [cx + 18, 431], [cx + 2, 421]],
      '#0a0806', rnd, { width: 0, stroke: null, amp: 3 });
    // the specular: a long thin crescent high on the mass, and one small one
    ctx.save(); ctx.globalAlpha = 0.85; ctx.fillStyle = shade(body, 2.6);
    ctx.beginPath(); ctx.ellipse(cx - 34, 322, 52, 13, -0.34, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.ellipse(cx - 34, 328, 52, 12, -0.34, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.7; ctx.fillStyle = shade(body, 2.2);
    ctx.beginPath(); ctx.ellipse(cx + 62, 356, 15, 6, 0.4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // THORNS. The tar blob is the one that answers a blow, so the thing that
    // does it is on the outside: black spines set INTO the surface, irregular,
    // mostly along the shoulder where a hand would land.
    for (let i = 0; i < 9; i++) {
      const t = i / 9, ax = cx - 96 + t * 200 + (rnd() - 0.5) * 18;
      const ay = 330 - Math.sin(t * Math.PI) * 44 + (rnd() - 0.5) * 20;
      const h = 12 + rnd() * rnd() * 26, lean = (rnd() - 0.5) * 14;
      wob(ctx, [[ax - 5, ay + 8], [ax + lean, ay - h], [ax + 5, ay + 8]], '#0d0b09', rnd, { width: 1.8, amp: 1.2 });
      ctx.globalAlpha = 0.5; ctx.strokeStyle = shade(body, 2.2); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(ax - 1, ay + 4); ctx.lineTo(ax + lean * 0.7, ay - h * 0.7); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

// A pigeon, or with `look.big` a gull, or with `look.crown` the one that
// rules them. Birds are the one Kallio animal nobody has ever been afraid of,
// which is the point of putting four of them in a row: individually a joke,
// together a wall of pecks. Plump, hunched, one eye showing, feet like wire.
function bird(ctx, look, rnd) {
  const cx = 128, foot = 470;
  const S = look.big ? 1.35 : 1;
  const body = look.body, dark = shade(look.body, 0.7), lit = shade(look.body, 1.25);
  const bx = cx - 10 * S, by = foot - 62 * S;
  const P = (dx, dy) => [bx + dx * S, by + dy * S];        // the bird is drawn in its own units
  // legs first, behind the body: thin, bent back, three toes
  ctx.strokeStyle = look.beak; ctx.lineWidth = 5 * S; ctx.lineCap = 'round';
  for (const lx of [bx - 14 * S, bx + 18 * S]) {
    ctx.beginPath(); ctx.moveTo(lx, by + 30 * S); ctx.lineTo(lx + 4 * S, foot - 10 * S); ctx.lineTo(lx, foot); ctx.stroke();
    for (const t of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(lx, foot); ctx.lineTo(lx + t * 12 * S + 4 * S, foot + 2); ctx.stroke(); }
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 2;
  for (const lx of [bx - 14 * S, bx + 18 * S]) { ctx.beginPath(); ctx.moveTo(lx, by + 30 * S); ctx.lineTo(lx + 4 * S, foot - 10 * S); ctx.lineTo(lx, foot); ctx.stroke(); }
  // tail, a fan of stiff feathers pointing back and down
  wob(ctx, [P(-60, 10), P(-104, 34), P(-96, 48), P(-56, 34)], dark, rnd, { amp: 3 });
  for (let i = 0; i < 3; i++) wob(ctx, [P(-62, 16 + i * 8), P(-98, 34 + i * 5)], null, rnd, { width: 1.6, stroke: shade(look.body, 0.5) });
  // THE BODY, and it is not a hexagon. Eight long straight runs read as a cut
  // polygon at the size a fight shows this at, which is half of why the bird
  // was a circle sitting on a shape — a body has no corners and the wobble
  // cannot put a curve where the points do not go.
  wob(ctx, [P(-70, 16), P(-58, -16), P(-36, -38), P(-4, -48), P(28, -44),
    P(52, -26), P(60, 0), P(54, 26), P(30, 46), P(-6, 52), P(-40, 44), P(-66, 30)],
    body, rnd, { amp: 4 });
  brush(ctx, bx - 40 * S, by - 30 * S, 90 * S, 60 * S, lit, rnd, 1.2);
  // THE NECK. There was none: a circle was drawn overlapping an egg and the
  // seam between them was the most visible line on the animal — a snowman.
  // A bird's head sits on a column of feathers that widens into the shoulder,
  // and drawing that column in the BODY's own colour is what welds the two.
  wob(ctx, [P(28, -40), P(40, -64), P(70, -68), P(66, -22)], body, rnd, { amp: 3, stroke: null });
  // the neck sheen — the one iridescent patch a pigeon has, and what says pigeon
  ctx.globalAlpha = 0.85;
  wob(ctx, [P(34, -40), P(42, -60), P(64, -62), P(62, -30)], look.neck, rnd, { amp: 2.4, stroke: null, band: 0.6, worn: 0 });
  ctx.globalAlpha = 1;
  // THE FOLDED WING TAPERS TO A POINT. It was a hexagon inside a hexagon — a
  // flat panel laid on the flank with the same width at the shoulder and at
  // the tip, which is a plate and not a wing. The primaries used to run OUT of
  // it and down across the body, so every bird had a grey stick through it.
  wob(ctx, [P(38, -28), P(8, -36), P(-26, -28), P(-62, -2), P(-50, 10), P(-16, 8), P(18, 4), P(36, -8)],
    look.wing, rnd, { amp: 3 });
  for (let i = 0; i < 3; i++) wob(ctx, [P(-8, -8 + i * 5), P(-52, 0 + i * 3)], null, rnd, { width: 1.8, stroke: shade(look.wing, 0.6) });
  if (look.big) {                                                 // a gull's wingtips are black
    wob(ctx, [P(-34, -18), P(-62, -2), P(-50, 10), P(-30, 2)], '#1c1a18', rnd, { width: 2, amp: 2 });
  }
  // head: small, carried forward off the neck, with a bead of an eye
  wob(ctx, [P(44, -68), P(58, -84), P(76, -82), P(84, -70), P(80, -56), P(62, -50), P(48, -56)], look.head, rnd, { amp: 2.4 });
  wob(ctx, [P(82, -74), P(106, -68), P(82, -60)], look.beak, rnd, { width: 2.6, band: 0 });
  blob(ctx, bx + 66 * S, by - 72 * S, 4.6 * S, 4.4 * S, '#141013', rnd, { width: 1.6, band: 0, worn: 0 });
  ctx.fillStyle = '#efe9db'; ctx.fillRect(bx + 64 * S, by - 74 * S, 1.8 * S, 1.8 * S);
  // v42 — A CROWN OF BREAD TAGS, which is what the ART_REQUEST asks for and
  // is a far better joke than a gold zig-zag: the King of the gulls is crowned
  // in the little notched plastic clips off bread bags. They are FLAT, they are
  // four different colours because they came off four different loaves, and
  // they are threaded on a loop of the same wire the bin rats drag about. The
  // first cut was a 32px gold zig-zag and read as a party hat.
  if (look.crown) {
    const cy = by - 58 * S, cxx = bx + 50 * S, R = 26 * S;
    ctx.strokeStyle = '#9a9184'; ctx.lineWidth = 3 * S;                   // the wire it is threaded on
    ctx.beginPath(); ctx.ellipse(cxx, cy + 4 * S, R, 8 * S, 0, 0, Math.PI * 2); ctx.stroke();
    const TAGS = ['#d8452c', '#e8c43a', '#3a7ac8', '#e0e0d8', '#5aa84a'];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * 0.86 + (i / 4) * Math.PI * 0.72;
      const x = cxx + Math.cos(a) * R, y = cy + 4 * S + Math.sin(a) * 8 * S;
      const h = (13 + (i % 2) * 5) * S, w = 9 * S, lean = (i - 2) * 5 * S;
      // a bread tag: a flat tab with a NOTCH bitten out of the bottom edge
      wob(ctx, [[x - w, y], [x - w + lean * 0.4, y - h], [x + w + lean * 0.4, y - h], [x + w, y],
        [x + 3 * S, y], [x + 1 * S, y - 5 * S], [x - 1 * S, y - 5 * S], [x - 3 * S, y]],
        TAGS[i], rnd, { width: 2.2 * S, amp: 1.2 });
    }
  }
}

// THE BEAR. The granite statue in the plate behind the bridge, woken — the
// thing that was in the photograph all along. The first cut read as a
// tombstone with a hand on it: the head never left the hump, a "carved plane"
// put a square in the middle of it, and the paws were posts. A bear is a
// SILHOUETTE before it is a surface — one high hump, a neck that dips, a head
// thrust forward and DOWN with a blunt muzzle, one round ear on top, and two
// forelegs that end in paws — so that is drawn first, and the granite (cracks,
// moss, two lit eyes) goes on top of a shape that already reads.
function bear(ctx, look, rnd) {
  const cx = 128, foot = 470;
  // Heights ABOVE the foot, because every line in this animal is a height and
  // reading them off `foot - n` is how the back ended up a single arc: you
  // cannot see a silhouette in a column of subtractions.
  const h = n => foot - n;
  const stone = look.body, dark = shade(stone, 0.62), mid = shade(stone, 0.82), lit = shade(stone, 1.22);
  // the plinth it has not quite left
  wob(ctx, [[cx - 118, foot], [cx - 110, h(22)], [cx + 118, h(22)], [cx + 124, foot]], dark, rnd, { amp: 1.5 });
  // the far pair, behind everything: a hind haunch and a foreleg, both darker
  wob(ctx, [[cx - 96, h(22)], [cx - 100, h(116)], [cx - 60, h(150)], [cx - 34, h(96)], [cx - 44, h(22)]], dark, rnd, { amp: 3 });
  wob(ctx, [[cx + 40, h(22)], [cx + 34, h(104)], [cx + 70, h(128)], [cx + 84, h(96)], [cx + 80, h(22)]], dark, rnd, { amp: 3 });
  // THE BACK IS NOT ONE ARC. The first two cuts of this animal put the rump,
  // the shoulder and the skull on one unbroken dome from the plinth to the ear
  // and it read as a TOMBSTONE — which is the exact word the v10 note used,
  // and it was still true three versions later, because a comment saying the
  // neck dips is not a dip. A bear in profile is four events along its top
  // line: a rump, a LOW loin, a shoulder hump that is the highest point of the
  // animal, and then a neck that drops hard before the head. And the belly has
  // to be off the ground — the legs were drawn inside a shape that ran to the
  // plinth, so they were ink ON a slab and could never be masses.
  wob(ctx, [
    [cx - 86, h(176)], [cx - 44, h(168)],                      // rump, then the loin DIPS
    [cx - 6, h(226)], [cx + 34, h(248)], [cx + 62, h(238)],    // up over the shoulder hump
    [cx + 82, h(202)],                                          // and the neck drops away
    [cx + 92, h(152)], [cx + 86, h(110)],                       // the chest
    [cx + 54, h(94)], [cx - 6, h(86)], [cx - 46, h(96)],        // the belly, clear of the deck
    [cx - 84, h(118)], [cx - 98, h(150)],                       // the haunch, and up the rump
  ], stone, rnd, { amp: 4 });
  brush(ctx, cx - 60, h(226), 140, 124, lit, rnd, 1.3);
  // the near hind leg: a haunch that starts inside the body and ends in a paw
  wob(ctx, [[cx - 86, h(126)], [cx - 64, h(146)], [cx - 40, h(140)], [cx - 28, h(112)],
    [cx - 34, h(74)], [cx - 30, h(44)], [cx - 20, h(22)], [cx - 70, h(22)],
    [cx - 76, h(46)], [cx - 88, h(84)]], mid, rnd, { amp: 3.5 });
  // the near foreleg. A bear's foreleg is a heavy shoulder that NARROWS to the
  // wrist and spreads again into the paw, so the outline has to pinch — a
  // four-point near-vertical quad is a RECTANGLE, and a rectangle is the one
  // shape that reads as UI rather than as an animal (v10, on the blob).
  wob(ctx, [[cx + 34, h(126)], [cx + 74, h(118)], [cx + 82, h(74)],
    [cx + 76, h(40)], [cx + 84, h(22)], [cx + 36, h(22)], [cx + 30, h(56)], [cx + 26, h(98)]], mid, rnd, { amp: 3.5 });
  for (const px of [cx - 66, cx + 40]) {
    ctx.strokeStyle = INK; ctx.lineWidth = 2.6;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(px + i * 14, h(34)); ctx.lineTo(px - 2 + i * 14, h(20)); ctx.stroke(); }
  }
  // the ear goes down FIRST, so the skull line crosses it and it is set INTO
  // the head instead of perched on top like a second, smaller head
  blob(ctx, cx + 96, h(226), 13, 12, mid, rnd, { width: 3 });
  // THE HEAD, hung off the end of the neck's drop and OUTSIDE the body's
  // outline — while it sat inside it, the muzzle was the only part of the bear
  // that was not the dome, which is why the dome was all anybody saw.
  wob(ctx, [[cx + 74, h(206)], [cx + 100, h(224)], [cx + 132, h(218)], [cx + 158, h(194)],
    [cx + 174, h(168)], [cx + 178, h(146)], [cx + 148, h(134)], [cx + 114, h(144)], [cx + 86, h(170)]],
    look.head, rnd, { amp: 3 });
  // the muzzle: a second lump under the brow, and a nose worn dark by a
  // century of hands on it
  wob(ctx, [[cx + 134, h(180)], [cx + 154, h(180)], [cx + 172, h(170)], [cx + 181, h(156)],
    [cx + 176, h(142)], [cx + 156, h(135)], [cx + 140, h(146)]], shade(look.head, 0.86), rnd, { width: 3, amp: 2 });
  blob(ctx, cx + 176, h(160), 9, 7, look.beak, rnd, { width: 2.4 });
  ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(cx + 152, h(146)); ctx.quadraticCurveTo(cx + 164, h(140), cx + 174, h(150)); ctx.stroke();
  // ONE EYE. This is a profile, and the second one was on the far side of the
  // skull — two amber lamps side by side on a cheek, which is what you draw
  // when you are thinking about a face and not about a head.
  ctx.fillStyle = look.eye;
  ctx.beginPath(); ctx.ellipse(cx + 138, h(196), 6.5, 4.5, -0.18, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(cx + 139, h(196), 2.6, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.28; ctx.fillStyle = look.eye;
  ctx.beginPath(); ctx.ellipse(cx + 138, h(196), 17, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
  // granite: long cracks that follow the form rather than crossing it
  ctx.strokeStyle = 'rgba(14,12,10,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const seams = [];
  for (let i = 0; i < 6; i++) {
    const x0 = cx - 86 + rnd() * 150, y0 = h(120 + rnd() * 110);
    ctx.beginPath(); ctx.moveTo(x0, y0);
    let x = x0, y = y0;
    for (let k = 0; k < 3; k++) { x += (rnd() - 0.5) * 24 + 5; y += 12 + k * 16 + rnd() * 8; ctx.lineTo(x, y); }
    ctx.stroke();
    seams.push([x0 + (x - x0) * 0.5, y0 + (y - y0) * 0.5]);
  }
  // MOSS GROWS IN A SEAM AND ON A LEDGE, nowhere else. Scattered at random it
  // is four green lollipops floating on the stone — Kindling's canopy fault,
  // which that project recorded and this one then drew anyway. So each patch
  // is laid ON one of the cracks just drawn, or along the top of the hump
  // where rain sits, and it is a cluster of small dabs rather than one disc.
  const patch = (px, py, n, a) => {
    ctx.globalAlpha = a;
    for (let i = 0; i < n; i++) blob(ctx, px + (rnd() - 0.5) * 22, py + (rnd() - 0.5) * 9, 3 + rnd() * 5, 2 + rnd() * 3, look.moss, rnd, { width: 0, stroke: null, band: 0, worn: 0 });
    ctx.globalAlpha = 1;
  };
  for (const [sx, sy] of seams) if (rnd() < 0.8) patch(sx, sy, 5 + Math.round(rnd() * 4), 0.75);
  for (let i = 0; i < 3; i++) patch(cx - 10 + rnd() * 70, h(238 + rnd() * 10), 4, 0.45);
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

function torchlight(c, mood, f = 1) {
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
  ctx.globalAlpha = 0.85; ctx.drawImage(edgeBand(c, 1, mood.warm, Math.max(1.2, 3 * f)), 0, 0);
  ctx.globalAlpha = 0.5; ctx.drawImage(edgeBand(c, -1, mood.rim, Math.max(1, 2 * f)), 0, 0);
  ctx.restore();
  return c;
}

// MUTATION. Past dusk the things on the bridge start to change, and it has
// to be visible on the figure or it is a number in a tooltip. Eyes are the
// one growth every silhouette can carry and every player reads at 40px: a
// mutated figure grows extra eyes where there should be none, plus a few
// boils, all placed on the figure's own opaque pixels so nothing floats.
function mutate(c, rnd, level) {
  const done = { eyes: 0, boils: 0 };
  const ctx = c.getContext('2d');
  const W = c.width, H = c.height;
  const d = ctx.getImageData(0, 0, W, H).data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && d[((y | 0) * W + (x | 0)) * 4 + 3] > 200;
  // v42 — SEARCH THE INK, NOT A BAND. This looked for somewhere to put an eye
  // inside a hard-coded box (x 30..W-30, y 60..0.62H), which was written when
  // every figure filled its texture. Once the non-person cast was fitted to its
  // own drawing they sit low and short, and the box no longer overlapped them:
  // a mutated rat grew ZERO eyes and nightfall stopped being visible on it.
  let ix0 = W, iy0 = H, ix1 = -1, iy1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    if (d[(y * W + x) * 4 + 3] > 200) { if (x < ix0) ix0 = x; if (x > ix1) ix1 = x; if (y < iy0) iy0 = y; if (y > iy1) iy1 = y; }
  if (ix1 < 0) { c.mutations = done; return; }
  const iw = ix1 - ix0, ih = iy1 - iy0;
  const spot = () => {
    for (let k = 0; k < 120; k++) {
      // the upper two-thirds of the figure's OWN box — a growth belongs on the
      // body and the head, not down among the feet
      const x = ix0 + rnd() * iw, y = iy0 + rnd() * ih * 0.72;
      // deep inside the figure, not on its edge: a 9px ring must all be solid
      if ([[0, 0], [9, 0], [-9, 0], [0, 9], [0, -9], [6, 6], [-6, -6]].every(([dx, dy]) => solid(x + dx, y + dy))) return [x, y];
    }
    return null;
  };
  for (let i = 0; i < 2 * level; i++) {
    const p = spot(); if (!p) break;
    const r = 5 + rnd() * 6;
    blob(ctx, p[0], p[1], r, r * 1.1, '#e6e2d2', rnd, { width: 2.6 });
    blob(ctx, p[0] + r * 0.12, p[1], r * 0.42, r * 0.5, INK, rnd, { width: 0, stroke: null });
    ctx.fillStyle = 'rgba(240,236,224,0.8)'; ctx.beginPath(); ctx.arc(p[0] - r * 0.3, p[1] - r * 0.35, Math.max(1.5, r * 0.16), 0, Math.PI * 2); ctx.fill();
    done.eyes++;
  }
  for (let i = 0; i < 3 * level; i++) {
    const p = spot(); if (!p) break;
    ctx.globalAlpha = 0.7;
    blob(ctx, p[0], p[1], 3 + rnd() * 4, 3 + rnd() * 3, level > 1 ? '#8a9a3a' : '#a8926a', rnd, { width: 1.6 });
    ctx.globalAlpha = 1;
    done.boils++;
  }
  c.mutations = done;                      // the painter says what it grew; a gate reads it
}

// ── the paper it is made of ────────────────────────────────────────────────
// Owner's references (2026-09-05): a cardboard diorama, a newsprint collage, a
// torn-paper relief. The cutouts were PAINTED cardboard and read as painted —
// the material was named in the fills but never shown. Two marks show it, and
// they are the two a collage always has:
//
// FIBRE. A torn edge is pale, because the core of the board is lighter than
// its printed face. So the silhouette gets an intermittent light rim — and so
// does every nick, since a nick is where the card was torn. (v10 learned the
// opposite lesson about a WARM ADDITIVE rim: that read as forty glowing spots.
// This one is desaturated, under `source-atop`, and ragged rather than a
// clean outline, which is the difference between torn paper and chickenpox.)
// 0.32, not 0.46: on a die-cut figure the fibre traces the DRAWING's outline,
// and a plate's outline is a high-contrast pixel edge with far more of it than
// a painted one has. At the old strength it read as a white sticker rim rather
// than as the board's core showing through a cut. On a 'card' cut it traces
// the board instead, where it is doing its real job.
function fibre(c, rnd, tone = '#c8bca4', alpha = 0.32, f = 1) {
  const ctx = c.getContext('2d');
  const band = document.createElement('canvas'); band.width = TW; band.height = TH;
  const b = band.getContext('2d');
  b.drawImage(c, 0, 0);
  // erode: eight shifted copies subtracted leaves only the outermost ring —
  // of the silhouette AND of every hole punched in it
  b.globalCompositeOperation = 'destination-out';
  // The ring's thickness follows the figure (v46) — floored at a pixel and a
  // bit, because a rim thinner than that is not a torn edge, it is nothing.
  const e = Math.max(1.15, 2 * f);
  for (const [dx, dy] of [[e, 0], [-e, 0], [0, e], [0, -e], [e * 0.75, e * 0.75], [-e * 0.75, e * 0.75], [e * 0.75, -e * 0.75], [-e * 0.75, -e * 0.75]]) b.drawImage(c, dx, dy);
  b.globalCompositeOperation = 'source-in';
  // A torn edge CATCHES LIGHT — it is not a constant ring. At one alpha all
  // the way round it read as a white sticker outline, which is the opposite of
  // the reference: the core shows where the light reaches it and disappears on
  // the shadow side. The torch is on the left, so the fibre is.
  const g = b.createLinearGradient(0, 0, TW, TH * 0.4);
  g.addColorStop(0, tone); g.addColorStop(0.55, `${tone}88`); g.addColorStop(1, `${tone}22`);
  b.fillStyle = g; b.fillRect(0, 0, TW, TH);
  // ragged, not an outline: a torn edge shows its core in patches
  b.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 340; i++) { b.beginPath(); b.arc(rnd() * TW, rnd() * TH, (1 + rnd() * 3.5) * Math.max(0.55, f), 0, Math.PI * 2); b.fill(); }
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(band, 0, 0); ctx.restore();
}

// NEWSPRINT. Rows of dashes too small to read, which is what print is at this
// size — the collage's other signal, and what stops a flat fill being flat.
// `k` is how STRONG the print is; `f` is how BIG it is. At rows 7-12px apart
// newsprint is fine print across a person and a ruled grid across a rat — the
// rectangular lattice visible over every beast in the v45 contact sheet was
// this, not a texture anybody drew.
function newsprint(ctx, rnd, k = 1, f = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  // Dark ink on a light fill, light ink on a dark one — a single dark dash was
  // invisible on the figures that are mostly black, which is most of them at
  // night. Two passes, offset, so every fill has print in it somewhere.
  for (const [ink, a, off] of [['#14100c', 0.13, 0], ['#e8dfc8', 0.07, 3]]) {
    ctx.globalAlpha = a * k;
    ctx.fillStyle = ink;
    for (let y = 56 + off * f; y < TH; y += Math.max(2.2, (7 + Math.floor(rnd() * 5)) * f)) {
      if (rnd() < 0.34) continue;                  // a column ends, or a picture sits there
      let x = rnd() * 34 * f;
      while (x < TW) {
        const w = Math.max(1.4, (3 + rnd() * 10) * f);
        ctx.fillRect(x, y, w, Math.max(0.9, 1.4 * f));
        x += w + Math.max(1, (2 + rnd() * 5) * f);
      }
    }
  }
  ctx.restore();
}

// ── HOW BIG THE DRAWING ACTUALLY CAME OUT ────────────────────────────────
// THE PASSES ARE ALL MEASURED IN TEXTURE PIXELS, AND NOT EVERY FIGURE IS A
// PERSON (v46). Newsprint, nicks, the torn rim, the grime streaks, the rim
// light and the card's own blade were every one of them calibrated against a
// bum, who fills about 356px of this 512px sheet. A rat fills 135. So the same
// absolute numbers gave the rat a bite the size of its ear, a torn rim three
// times as thick as a person's, newsprint whose rows are a twelfth of its body
// — which is the ruled grid visible across every animal in the v45 sheet — and
// a cut line that welded its whiskers together. Nobody drew the animals badly.
// The passes that make a figure belong to this bridge were person-sized, and
// they were applied to a rat at full size.
//
// This is the one number that fixes all of it, and it is deliberately a RATIO
// rather than a per-figure table: a table is a hand-kept list that the next
// animal is left out of.
const REF_INK = 356;

function inkHeight(cv) {
  const d = cv.getContext('2d').getImageData(0, 0, TW, TH).data;
  let top = -1, bottom = -1;
  for (let y = 0; y < TH; y++) {
    let any = false;
    for (let x = 0; x < TW && !any; x += 2) if (d[(y * TW + x) * 4 + 3] > 8) any = true;
    if (any) { if (top < 0) top = y; bottom = y; }
  }
  return bottom < 0 ? 0 : bottom - top + 1;
}

// Capped at 1 because nothing here is bigger than a person and a pass that
// grew would be a second bug; floored because below about a third of a person
// every mark goes sub-pixel and the figure loses its grain altogether.
function figureScale(cv) {
  const h = inkHeight(cv);
  return h ? Math.max(0.34, Math.min(1, h / REF_INK)) : 1;
}

// The default hour. `main.js` hands the active skin's in when it builds a
// puppet, so the fantasy evening lights its cast its own way.
export const DUSK = { warm: '#ffab52', cold: '#101a24', rim: '#6f93ad', depth: '99' };

export function paintCutout(look, seed = 1, mood = DUSK, pose = 'idle') {
  const c = document.createElement('canvas');
  c.width = TW; c.height = TH;
  const ctx = c.getContext('2d');
  const rnd = rngFrom(seed * 7919 + 17);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // A TURF plate replaces the PAINT and not the process: everything below
  // still runs over it, because those passes are what make a figure belong to
  // this bridge rather than to TURF's board. A plate that has not decoded yet,
  // or a figure with no plate (every rat, blob, bird and the bear), falls
  // through to the painter — so the switch can never leave a blank plane.
  const plate = ART === 'turf' && look.id ? plateReady(look.id, pose) : null;
  // In 'card' the drawing goes onto its own layer first, so its ink can be
  // measured and a board cut to fit it. In 'silhouette' it goes straight down,
  // which is the path this game shipped and one canvas cheaper.
  // A CUT-OUT IS CUT AROUND THE FIGURE (v34, owner: *"characters should look
  // more like cut outs"*). The first cut of this version printed the art on a
  // round-topped BOARD — a standee — and it read as a sticker on a tombstone:
  // the board was a field behind the figure and took the silhouette away,
  // which is exactly the fault v20 recorded against boarding a drawn rat. A
  // cut-out keeps the silhouette: the card follows the drawing's own outline
  // with a few millimetres to spare, the way scissors do, and the torn edge,
  // the nicks and the fibre sit on THAT edge. So under 'card' every figure —
  // plated or drawn — is drawn to its own layer, and `cutoutBorder` lays a
  // kraft contour under it: the dilated silhouette, a flat foot where the
  // base is, and a darker band at the rim that reads as the card's thickness.
  const fig = CUT === 'card' ? document.createElement('canvas') : c;
  if (fig !== c) { fig.width = TW; fig.height = TH; }
  const fx = fig === c ? ctx : fig.getContext('2d');
  fx.lineJoin = 'round'; fx.lineCap = 'round';
  if (plate) drawPlate(fx, plate, { tw: TW, th: TH, foot: 470, tall: 356 });
  else if (look.shape) drawBeast(fx, look, rnd);
  else person(fx, look, rnd);
  // Measured off the FIGURE and before the board is cut, which is the only
  // moment the drawing's own size is on the canvas by itself.
  const f = figureScale(fig);
  if (fig !== c) {
    cutoutBorder(ctx, fig, rnd, f);
    // The card is cut flat at CUT_FOOT, so the PRINTING stops there too. The
    // border pass erases its mask below that line; drawing the figure over it
    // unclipped left anything that hangs lower — `slime()` runs the blob's
    // drips to foot + 52 — floating below its own board with no kraft behind
    // it and no dark edge.
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, TW, CUT_FOOT); ctx.clip();
    ctx.drawImage(fig, 0, 0);
    ctx.restore();
  }
  // ORDER MATTERS, and it cost a figure with chickenpox to find out: the rim
  // pass finds every edge in the alpha, and `nicks` punches HOLES in it, so
  // rimming first drew a glowing ring around each of forty nicks. Light the
  // clean silhouette, then take the bites out — which is also the true order,
  // since a cutout is painted first and carried around afterwards.
  if (look.mutated) mutate(c, rnd, look.mutated);
  newsprint(ctx, rnd, 1, f);
  if (mood) torchlight(c, mood, f);
  // Fewer than it looks like it should be, and that is a consequence of the
  // placement getting smarter rather than a taste change: nicks used to be
  // thrown anywhere and MOST OF THEM MISSED, landing on transparent space. Now
  // that every one of them finds an edge, the same count reads as perforation
  // — a dotted border round a standee. The number had to come down with it.
  // The count comes down with the size as well as the radius: the same number
  // of bites on a shorter perimeter is perforation however small each one is.
  nicks(ctx, rnd, Math.round((9 + (look.grime ?? 0.6) * 9) * (0.5 + 0.5 * f)), f);
  // the fibre comes AFTER the nicks, so a torn hole shows its core too — that
  // is the whole reason a nick reads as torn rather than as a dot of nothing
  fibre(c, rnd, '#c8bca4', 0.32, f);
  grime(ctx, rnd, look.grime ?? 0.7, f);
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
// ── the paper motion switch ──────────────────────────────────────────────
// One module-level setting rather than a field walked over every figure: they
// all obey the same toggle, and a live switch has to reach the enemies already
// standing on the bridge as well as the next ones.
//   'paper' — Paper Mario: anticipation, a lunge that squashes, a card that
//             bends when it is hit, and a breath at rest.
//   'still' — what this game shipped through v16: a slide and a small wobble.
let MOTION = 'paper';
export function setFigureMotion(m) { MOTION = m === 'still' ? 'still' : 'paper'; }
export function figureMotion() { return MOTION; }

// FROZEN holds every clip at whatever `t` it was scrubbed to, so a contact
// sheet can be taken of the real poses. Without it a screenshot is a picture
// of the wall clock: a frame grab takes about a second under SwiftShader and
// the whole attack is 0.61s, so the first shot lands on the lunge and every
// one after it on the breath. Nothing in the game sets this — only the debug
// seam does, the same way every other test here is driven off state rather
// than off time.
let FROZEN = false;
export function freezeFigures(v) { FROZEN = !!v; }

// ── which art the figures wear ───────────────────────────────────────────
// 'drawn' — the code-painted cutout this game shipped with.
// 'turf'  — the owner's TURF character plates, for the person-shaped figures
//           that have one. The rats, blobs, birds and the bear stay drawn
//           either way: a roster of street operators has no rat in it.
// TURF's plates are the DEFAULT from v21 (owner, on the four-way contact sheet:
// *"the first characters, style and all work. let's make that the default"* —
// the first of the four being the plates, die-cut). 'drawn' is still one tap
// away and is still what every figure with no plate wears, so the mixed row is
// now the ordinary look of this game rather than a fallback.
let ART = 'turf';
export function setFigureArt(a) { ART = a === 'turf' ? 'turf' : 'drawn'; }
export function figureArt() { return ART; }

// ── how the card is CUT ──────────────────────────────────────────────────
// Owner, 2026-09-07: *"we can test alternative that uses circular cut card
// board instead of fitting to the exact dimensions of the art."*
//   'silhouette' — die-cut around the figure, which is what this game shipped.
//   'card'       — the art PRINTED on a shaped board: straight sides, a
//                  round top, a flat foot. What a paper standee actually is.
//
// It is not only a look. Die-cutting to the silhouette makes every edge of the
// drawing an edge of the CARD, so the torn-fibre pass has to trace the whole
// figure — which is where the white fringe came from on the plates, since
// pixel art has an enormous amount of alpha edge. Cut it as a board and the
// torn edge is the BOARD's edge: one clean outline, and the art inside it is
// left alone.
// 'card' is the DEFAULT from v34 — a CUT-OUT: the card follows the figure's
// own silhouette (see `cutoutBorder`), plated or drawn alike. Owner,
// 2026-09-13: *"characters should look more like cut outs."*
let CUT = 'card';
export function setFigureCut(c) { CUT = c === 'card' ? 'card' : 'silhouette'; }
export function figureCut() { return CUT; }

// The cut line follows the drawing. Dilating the figure's own alpha is what
// makes it a CUT-OUT rather than a print: the border is the same shape as the
// figure, a few px out, so a raised arm gets a border and the space under it
// stays air. Done by stamping the figure round a ring of offsets into a mask
// and tinting the mask with `source-in` — no contour tracing, and it works on
// a plate and a painted rat alike. The foot is cut FLAT at the baseline (a
// cut-out stands on a tab), and a darker band at the rim is the card's edge
// seen at a slight angle, which is the one cue that says thickness.
const CUT_PAD = 7;                       // card beyond the ink, in texture px
const CUT_FOOT = 470 + 6;                // the flat cut, just under the baseline drawPlate uses

// Erode a silhouette: keep only the pixels whose whole r-neighbourhood is ink.
// `destination-in` multiplies alpha, so a ring of shifted copies leaves the
// core and takes the boundary — which is the definition, done in one pass each.
function erode(src, r) {
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'destination-in';
  for (let a = 0; a < 12; a++) x.drawImage(src, Math.cos(a / 12 * Math.PI * 2) * r, Math.sin(a / 12 * Math.PI * 2) * r);
  return c;
}

function hasInk(cv) {
  const d = cv.getContext('2d').getImageData(0, 0, TW, TH).data;
  for (let i = 3; i < d.length; i += 40) if (d[i] > 24) return true;
  return false;
}

// THE BLADE WAS WIDER THAN SOME OF THE MARKS (v46). Growing the silhouette by
// CUT_PAD closes every gap narrower than twice it, and the rat's four whiskers
// are 1.4px lines about 12px apart: the board grew around each of them, the
// four borders met, and the animal came back with a solid black paddle off the
// side of its face. The gull's wing tip and the bear's scratched moss went the
// same way, and none of it was visible at the size a fight shows them at.
//
// The answer is what scissors actually do: you cut round the BODY and you
// print the whisker. So the mask is OPENED first — eroded by `blade` and grown
// back with the pad — which drops every feature thinner than the blade and
// leaves the body's own cut line exactly where it was. The figure is drawn
// over the top afterwards either way, so nothing disappears; it just stops
// dragging a piece of card around with it.
function cutoutBorder(ctx, fig, rnd, f = 1) {
  const pad = Math.max(3, CUT_PAD * f);
  const blade = Math.max(1.5, 3 * f);
  const core = erode(fig, blade);
  // A figure thinner than the blade all over would open to nothing. That is a
  // drawing this game does not have, and a cut-out with no card is worse than
  // a welded whisker, so it falls back rather than trusting the arithmetic.
  const src = hasInk(core) ? core : fig;
  const grow = src === core ? pad + blade : pad;
  const m = document.createElement('canvas'); m.width = TW; m.height = TH;
  const mx = m.getContext('2d');
  // the mask: the opened silhouette grown by the pad in every direction
  for (let a = 0; a < 16; a++) {
    const dx = Math.cos(a / 16 * Math.PI * 2) * grow, dy = Math.sin(a / 16 * Math.PI * 2) * grow;
    mx.drawImage(src, dx, dy);
  }
  for (let a = 0; a < 8; a++) {          // fill the ring so the border is solid, not a halo of copies
    const dx = Math.cos(a / 8 * Math.PI * 2) * grow * 0.5, dy = Math.sin(a / 8 * Math.PI * 2) * grow * 0.5;
    mx.drawImage(src, dx, dy);
  }
  mx.drawImage(src, 0, 0);
  // flat foot: nothing below the cut line
  mx.globalCompositeOperation = 'destination-out';
  mx.fillRect(0, CUT_FOOT, TW, TH - CUT_FOOT);
  // kraft card, tinted through the mask — paler than the back and never flat
  mx.globalCompositeOperation = 'source-in';
  const g = mx.createLinearGradient(0, 0, TW, TH);
  g.addColorStop(0, '#8d8066'); g.addColorStop(0.5, '#7d715b'); g.addColorStop(1, '#685e4c');
  mx.fillStyle = g; mx.fillRect(0, 0, TW, TH);
  mx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 70; i++) {          // stock, not a swatch — at the card's own scale
    mx.fillStyle = rnd() > 0.5 ? 'rgba(0,0,0,0.04)' : 'rgba(255,248,232,0.05)';
    mx.fillRect(rnd() * TW, rnd() * TH, (6 + rnd() * 40) * f, (3 + rnd() * 18) * f);
  }
  // the card's edge: darken the outer ~2px of the mask. Draw the mask, then
  // knock the inner region (figure grown by PAD-2) back to the plain kraft.
  const inner = document.createElement('canvas'); inner.width = TW; inner.height = TH;
  const ix = inner.getContext('2d');
  for (let a = 0; a < 16; a++) {
    const r = grow - Math.max(1.1, 2.2 * f), dx = Math.cos(a / 16 * Math.PI * 2) * r, dy = Math.sin(a / 16 * Math.PI * 2) * r;
    ix.drawImage(src, dx, dy);
  }
  ix.drawImage(src, 0, 0);
  ix.globalCompositeOperation = 'destination-out';
  ix.fillRect(0, CUT_FOOT - 2, TW, TH - CUT_FOOT + 2);
  // edge = mask − inner, painted dark; the flat foot keeps its own edge line
  const edge = document.createElement('canvas'); edge.width = TW; edge.height = TH;
  const ex = edge.getContext('2d');
  ex.drawImage(m, 0, 0);
  ex.globalCompositeOperation = 'destination-out';
  ex.drawImage(inner, 0, 0);
  ex.globalCompositeOperation = 'source-in';
  ex.fillStyle = 'rgba(58,46,32,0.7)'; ex.fillRect(0, 0, TW, TH);
  ctx.drawImage(m, 0, 0);
  ctx.drawImage(edge, 0, 0);
}

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

    // THE FRAME SET. A figure with drawn poses bakes one texture pair per
    // frame HERE rather than on the beat it is needed: `paintCutout` runs
    // newsprint, torchlight, nicks and fibre, which is far too much work to do
    // inside an attack — the swap has to be a pointer move. `posesFor` returns
    // ['idle'] for everything without pose art, so the ordinary figure pays
    // exactly what it paid before. `ART === 'drawn'` also collapses to one,
    // since the painter has no second drawing to give.
    const names = ART === 'turf' ? posesFor(look.id) : ['idle'];
    this.frames = {};
    for (const n of names) {
      const cv = paintCutout(look, seed, mood, n);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      const b = new THREE.CanvasTexture(paintBack(cv));
      b.colorSpace = THREE.SRGBColorSpace;
      this.frames[n] = { front: t, back: b };
    }
    this.posed = names.length > 1;
    this.frame = 'idle';
    const front = this.frames.idle.front.image;
    const tex = this.frames.idle.front;
    const backTex = this.frames.idle.back;

    const h = PUPPET_H * scale, w = h * TW / TH;
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(0, h / 2, 0);
    this.mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.35, side: THREE.FrontSide });
    this.mat.color = new THREE.Color(1, 1, 1);
    const face = new THREE.Mesh(geo, this.mat);
    const back = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: backTex, transparent: true, alphaTest: 0.35, side: THREE.BackSide }));
    // a hair of thickness: the back drawn a shade behind reads as card
    const edge = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: backTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide }));
    this.backMats = [back.material, edge.material];
    edge.position.z = -0.012;
    const body = new THREE.Group();
    body.add(face, back, edge);
    // faces +x by default: mirror the sheet for a left-facing enemy
    body.scale.x = facing;
    this.body = body;
    // THE FLEX. A shear has no Object3D field — three.js gives you position,
    // quaternion and scale, and a sheared matrix is none of those — so the
    // card bends through a group that composes its own matrix. It sits
    // BETWEEN the base and the body on purpose: a tin oval does not squash,
    // and putting the scale on the whole group made the figure's stand
    // breathe with it, which reads as the camera bobbing.
    this.flex = new THREE.Group();
    this.flex.matrixAutoUpdate = false;
    this.flex.add(body);
    // Its origin is the group's origin, which is the FEET: the plane geometry
    // is translated up by h/2 at build time, so every rotation and every
    // squash here is already anchored where the figure touches the plank.
    this.clip = null;                 // { name, t, dir }
    this.phase = (seed % 97) / 97;    // so a row of six does not breathe in unison

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
      this.group.add(this.flex, disc, lip, tab);
    } else {
      const wedge = new THREE.Mesh(new THREE.BoxGeometry(bw, 0.05 * scale, bd), BOARD);
      wedge.position.y = 0.025 * scale;
      const slot = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.5, 0.09 * scale, 0.06 * scale), FLUTE);
      slot.position.set(0, 0.07 * scale, -0.04 * scale);
      const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.18 * scale, 0.1 * scale),
        new THREE.MeshBasicMaterial({ map: tapeTexture(), transparent: true, depthWrite: false }));
      tape.position.set(0, 0.06 * scale, 0.03 * scale);
      tape.rotation.x = -0.9; tape.rotation.z = 0.15;
      this.group.add(this.flex, wedge, slot, tape);
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

  // A verb is a thing that happens to the OBJECT. `dir` is world-signed: an
  // attack goes the way the figure faces, a blow arrives from the other side.
  play(name, dir) { this.clip = { name, t: 0, dir }; }

  // Swap the drawing. A frame this figure has not got resolves to its idle, so
  // a caller never has to ask whether a pose exists — and a figure with one
  // drawing takes this call all day and does nothing, which is what lets
  // `update` run the same three lines for every puppet on the bridge.
  showFrame(name) {
    const f = this.frames[name] ?? this.frames.idle;
    if (this.frame === (this.frames[name] ? name : 'idle')) return;
    this.frame = this.frames[name] ? name : 'idle';
    this.mat.map = f.front;
    for (const m of this.backMats) m.map = f.back;
  }

  hit() {
    this.flash = 1;
    if (MOTION === 'paper') this.play('hurt', -this.facing);
    else this.wobbleVel += 9 * (Math.random() > 0.5 ? 1 : -1);
  }
  attack() {
    if (MOTION === 'paper') this.play('attack', this.facing);
    else this.lunge = 1;
  }
  hop() { if (MOTION === 'paper') this.play('hop', this.facing); }

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

    // ── the pose ───────────────────────────────────────────────────────
    // In 'paper' the figure is moved as an object: a clip while one is
    // playing, the breath the rest of the time. In 'still' it is v16's slide
    // and nothing else, which is what the toggle exists to be compared with.
    let pose = REST;
    if (MOTION === 'paper' && this.alive) {
      if (this.clip) {
        if (!FROZEN) this.clip.t += dt;
        if (this.clip.t > clipLength(this.clip.name)) this.clip = null;
        else pose = poseAt(this.clip.name, this.clip.t, { dir: this.clip.dir });
      }
      if (!this.clip) pose = poseAt('breath', (this.tAlive = (this.tAlive ?? this.phase * 2.8) + (FROZEN ? 0 : dt)), {});
      // The drawing follows the same stage list as the transform, so the
      // extended arm and the lunge land on the same frame rather than a beat
      // apart — which is the whole reason `frameAt` walks `poseAt`'s own
      // durations instead of carrying a second set of numbers.
      if (this.posed) this.showFrame(this.clip ? frameAt(this.clip.name, this.clip.t) : 'idle');
    } else {
      // attack lunge: out toward the enemy and back
      if (this.lunge > 0) this.lunge = Math.max(0, this.lunge - dt * 2.8);
      const l = Math.sin(this.lunge * Math.PI) * 0.35 * this.facing;
      pose = { ...REST, dx: l / this.height, dz: Math.sin(this.lunge * Math.PI) * 0.12 / this.height };
    }
    // Offsets are in the figure's OWN height, so one number reads the same on
    // a rat and on the Bridge King.
    const H = this.height;
    g.position.set(this.home.x + pose.dx * H, this.home.y + pose.dy * H, this.home.z + pose.dz * H);
    // R(rot) · Shear(skew) · Scale(sx, sy), written straight into the matrix
    // because a shear is not a field. Matrix4.set takes ROW-major arguments.
    const c = Math.cos(pose.rot), sn = Math.sin(pose.rot);
    this.flex.matrix.set(
      c * pose.sx, c * pose.skew * pose.sy - sn * pose.sy, 0, 0,
      sn * pose.sx, sn * pose.skew * pose.sy + c * pose.sy, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    );
    this.flex.matrixWorldNeedsUpdate = true;

    if (this.fall && !this.fall.done) {
      const f = this.fall;
      // Falling, then fallen. `death-down` is the only frame in the set drawn
      // lying horizontal, and it is the one the topple is carrying to ground —
      // swapping at the first floor contact means the card that settles is a
      // body on the planks and not a standing figure lying on its side.
      if (this.posed) this.showFrame(f.bounces > 0 || f.rest > 0 ? 'death-down' : 'death-fall');
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

