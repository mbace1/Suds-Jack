// Radio Free Helsinki — Toko, the figure.
//
// The CURRENT Toko, as Toko Live draws him (`toko-live/main.js`, `draw()`):
// a black head disc inside a magenta ring with the face in white ink, a dark
// hooded body that widens to the shoulders and falls straight, and two dark
// arms that end in magenta hands. The all-magenta bust this station used to
// seat at the desk was the older carrier (`drawHead`) and the teal gel before
// it was a local invention; both are gone from here.
//
// Every number below is Toko Live's, in its own units — the ring is 112 — so
// the two cannot drift by more than a rescale. `k` is the scale: 1 draws him
// at Toko Live's size, a phone post asks for about 0.7, the sign-off portrait
// about 0.2. The face geometry is imported from the brand, never copied.

import { drawFace } from '../../toko/js/face.js';
import { TOKO } from '../../toko/js/palette.js';

export const FIG = {
  ring: 112, inner: 94,           // the head: magenta ring, black disc
  face: 200,                      // the face box, centred on the head
  bodyY: 117,                     // the body's origin below the head centre
  shoulderX: 108, shoulderY: 145, // where the arms hang from (head-relative)
  upper: 100, fore: 100,          // arm segments — Toko Live draws one 128 limb
  limb: 30, hand: 13,
  INK: '#101015', LIMB: '#0c0c10', HEAD: '#050507', PAPER: '#ffffff',
};

// The hooded body, head-relative. Toko Live's outline to the point where it
// tapers back in (y 188), then straight down to `hem` so it can stand behind a
// desk of any height.
function bodyPath(c, cx, cy, k, hem) {
  const y = (v) => cy + (FIG.bodyY + v) * k, x = (v) => cx + v * k;
  const bottom = Math.max(y(188), hem);
  c.beginPath();
  c.moveTo(x(-138), y(58));
  c.quadraticCurveTo(x(-120), y(-40), x(-72), y(-58));
  c.lineTo(x(72), y(-58));
  c.quadraticCurveTo(x(120), y(-40), x(138), y(58));
  c.lineTo(x(106), y(188));
  c.lineTo(x(106), bottom);
  c.lineTo(x(-106), bottom);
  c.lineTo(x(-106), y(188));
  c.closePath();
}

// opts: { hem, rim (a colour for the inside rim light), shadow (flat colour —
// draws the silhouette only) }
export function drawBody(c, cx, cy, k, opts = {}) {
  const hem = opts.hem != null ? opts.hem : cy + (FIG.bodyY + 188) * k;
  c.save();
  bodyPath(c, cx, cy, k, hem);
  if (opts.shadow) { c.fillStyle = opts.shadow; c.fill(); c.restore(); return; }
  // a slow falloff down the cloth — the top catches the studio, the lap does not
  const g = c.createLinearGradient(0, cy, 0, hem);
  g.addColorStop(0, '#17171e');
  g.addColorStop(1, FIG.INK);
  c.fillStyle = g;
  c.fill();
  if (opts.rim) {
    // light from the set, inside the silhouette only: clip, then a fat stroke
    c.clip();
    c.globalAlpha = 0.42;
    c.strokeStyle = opts.rim;
    c.lineWidth = Math.max(2, 7 * k);
    c.stroke();
  }
  c.restore();
}

// opts: { face: drawFace opts (open/squash/grin), glow: 0..1, shadow }
export function drawHead(c, cx, cy, k, opts = {}) {
  c.save();
  if (opts.shadow) {
    c.fillStyle = opts.shadow;
    c.beginPath(); c.arc(cx, cy, FIG.ring * k, 0, Math.PI * 2); c.fill();
    c.restore();
    return;
  }
  const glow = opts.glow == null ? 1 : opts.glow;
  if (glow > 0) {
    c.shadowColor = TOKO.MAGENTA;
    c.shadowBlur = 34 * k * glow;
  }
  c.fillStyle = TOKO.MAGENTA;
  c.beginPath(); c.arc(cx, cy, FIG.ring * k, 0, Math.PI * 2); c.fill();
  c.shadowBlur = 0;
  c.fillStyle = FIG.HEAD;
  c.beginPath(); c.arc(cx, cy, FIG.inner * k, 0, Math.PI * 2); c.fill();
  // the white ink carries a faint bloom of its own on a film frame
  if (glow > 0) { c.shadowColor = 'rgba(255,255,255,0.55)'; c.shadowBlur = 10 * k * glow; }
  const f = FIG.face * k;
  drawFace(c, cx - f / 2, cy - f / 2, f, { color: FIG.PAPER, open: 0.08, ...(opts.face || {}) });
  c.restore();
}

// Two-bone arm: the shoulder is fixed, the hand goes where it is asked and the
// elbow bends OUTWARD (`side` -1 left, +1 right), which is what keeps a hand on
// the desk reading as a forearm resting rather than a wing.
export function drawArm(c, sx, sy, hx, hy, k, side, opts = {}) {
  const a = FIG.upper * k, b = FIG.fore * k;
  let dx = hx - sx, dy = hy - sy;
  let d = Math.hypot(dx, dy) || 1;
  if (d > a + b - 0.5) { const s = (a + b - 0.5) / d; dx *= s; dy *= s; hx = sx + dx; hy = sy + dy; d = a + b - 0.5; }
  const along = (a * a - b * b + d * d) / (2 * d);
  const off = Math.sqrt(Math.max(0, a * a - along * along));
  let px = -dy / d, py = dx / d;                 // a perpendicular…
  if (px * side < 0) { px = -px; py = -py; }     // …the outward one
  const ex = sx + (dx / d) * along + px * off, ey = sy + (dy / d) * along + py * off;
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = opts.shadow || FIG.LIMB;
  c.lineWidth = FIG.limb * k;
  c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke();
  if (opts.rim && !opts.shadow) {
    c.globalAlpha = 0.35;
    c.strokeStyle = opts.rim;
    c.lineWidth = Math.max(1, 2.2 * k);
    c.beginPath();
    c.moveTo(sx - side * FIG.limb * k * 0.42, sy); c.lineTo(ex - side * FIG.limb * k * 0.42, ey);
    c.stroke();
    c.globalAlpha = 1;
  }
  c.fillStyle = opts.shadow || TOKO.MAGENTA;
  c.beginPath(); c.arc(hx, hy, FIG.hand * k * (opts.handScale || 1), 0, Math.PI * 2); c.fill();
  c.restore();
}

// where the shoulders are, for a caller that places the hands
export function shoulders(cx, cy, k) {
  return [
    [cx - FIG.shoulderX * k, cy + FIG.shoulderY * k],
    [cx + FIG.shoulderX * k, cy + FIG.shoulderY * k],
  ];
}
