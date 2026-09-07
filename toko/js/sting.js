// TOKO MIDORI GAMES — the sting. Two of them, on purpose.
//
//   draw   the face draws itself: the mouth sweeps open, the eyes drop in, it
//          blinks once, the logotype lands beside it. The arcs are stroked
//          with a dash offset so they genuinely GROW along their own path
//          rather than fading in — the mark is made of strokes, and this
//          should look like somebody drawing them.
//
//   goo    a gel cube flops in from above, lands, and thins into the face.
//          Then it flops down and the impact throws out the logotype, and
//          then the whole lockup flops out of the bottom of the frame.
//
// Both, rather than one, for the same reason the floor has three layouts:
// this is the thing most worth arguing about and nobody can argue with a
// screenshot. `playStingOnce` picks one and RECORDS which, so a note about
// the intro can be told from a note about the other intro.
//
// Three seconds-ish, on magenta, and skippable on any input from the very
// first frame — a sting you cannot skip is an ad, and this workshop does not
// run ads.
//
// The gel is Toko Drop's, which is the other half of the workshop: a body with
// volume that squashes when it lands and takes a moment to stop wobbling. It
// obeys the two-colour rule like everything else — paper on magenta, no
// gradient, no third value, no translucency. What makes it read as gel is
// squash-and-stretch and a decaying wobble on its outline, never shading.
//
// AND THE MARK EMERGES FROM ITS OWN MOST SENSITIVE NUMBER. The face is not
// faded in over the blob: it is DRAWN, at a stroke weight that starts about
// four times too heavy — which is exactly the failure the brand doc warns
// about, "too heavy and the slots close and the eyes go solid". At that weight
// the three arcs merge into one mass, and that mass IS the blob. Thinning the
// stroke back to GEO.stroke is the entire transformation: the slots open, the
// mouth separates from the eyes, and the mark is standing there. Nothing
// crossfades, so nothing needs a third colour to do it.

import { Surface } from './surface.js';
import { TOKO, VOICE, TYPE } from './palette.js';
import { GEO, bounds } from './face.js';
import { drawLogotype } from './lockup.js';

const D = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (p) => 1 - Math.pow(1 - clamp(p), 3);
const easeIn = (p) => Math.pow(clamp(p), 1.9);
const lerp = (a, b, p) => a + (b - a) * clamp(p);

const T = {
  mouth: 0.00, mouthEnd: 0.62,
  eyes:  0.42, eyesEnd:  0.92,
  blink: 1.24,
  type:  1.30, typeEnd:  1.75,
  hold:  2.70,
  fade:  2.70, end: 3.05,
};

// stroke one arc, revealed along its own length by `p` (0..1)
function growArc(ctx, cx, cy, r, a0, a1, p) {
  const len = Math.abs((a1 - a0) * D) * r;
  ctx.save();
  ctx.setLineDash([len, len]);
  ctx.lineDashOffset = len * (1 - clamp(p));
  ctx.beginPath();
  ctx.arc(cx, cy, r, a0 * D, a1 * D);
  ctx.stroke();
  ctx.restore();
}

function frameDraw(scr, t, W, H) {
  const ctx = scr.ctx;
  ctx.fillStyle = TOKO.MAGENTA;
  ctx.fillRect(0, 0, W, H);

  const b = bounds();
  const faceH = H * 0.34;
  const boxW = faceH * (GEO.box / b.h);
  const faceW = boxW * (b.w / GEO.box);
  const x = (W - faceW) / 2 - (b.x / GEO.box) * boxW;
  const y = H * 0.20 - (b.y / GEO.box) * boxW;
  const s = boxW / GEO.box;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.strokeStyle = TOKO.PAPER;
  ctx.lineWidth = GEO.stroke;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const m = GEO.mouth, e = GEO.eye;

  // 1. the mouth sweeps open, outer then inner
  const pm = ease((t - T.mouth) / (T.mouthEnd - T.mouth));
  if (pm > 0) {
    growArc(ctx, m.cx, m.cy, m.outer.r, m.outer.a0, m.outer.a1, pm);
    growArc(ctx, m.cx, m.cy, m.inner.r, m.inner.a0, m.inner.a1, clamp((pm - 0.25) / 0.75));
  }

  // 2. the eyes drop in from above and blink once when they land
  const pe = ease((t - T.eyes) / (T.eyesEnd - T.eyes));
  if (pe > 0) {
    const drop = (1 - pe) * -18;
    // the same heavy lid as everywhere else — eased, not snapped. The sting's
    // TIMELINE stays brisk (it is an event, and an event you cannot skip is an
    // ad), but the blink inside it is Toko's own.
    const bt = (t - T.blink) / 0.52;
    const lid = bt < 0 || bt > 1 ? 0
      : (bt < 0.32 ? bt / 0.32 : 1 - (bt - 0.32) / 0.68);
    const blink = 1 - Math.max(0, Math.min(1, lid * lid * (3 - 2 * lid))) * 0.92;
    for (const side of [-1, 1]) {
      const cx = 50 + side * e.dx;
      ctx.save();
      ctx.translate(cx, e.cy + drop);
      ctx.scale(1, blink);
      growArc(ctx, 0, 0, e.outer.r, e.outer.a0, e.outer.a1, pe);
      ctx.setLineDash([]);
      for (const s2 of [-1, 1]) {               // the legs grow after the crown
        ctx.beginPath();
        ctx.moveTo(s2 * e.outer.r, 0);
        ctx.lineTo(s2 * e.outer.r, (e.legs.y - e.cy) * clamp((pe - 0.4) / 0.6));
        ctx.stroke();
      }
      ctx.restore();
    }
  }
  ctx.restore();

  // 3. the logotype lands under it
  if (t >= T.type) {
    const p = ease((t - T.type) / (T.typeEnd - T.type));
    const size = Math.min(W * 0.09, H * 0.085);
    ctx.save();
    ctx.globalAlpha = p;
    ctx.translate(0, (1 - p) * 12);
    ctx.textAlign = 'center';
    drawLogotype(ctx, W / 2, H * 0.62, size, {
      color: TOKO.PAPER, lines: [VOICE.company], align: 'center', tm: false,
    });
    ctx.font = `${size * 0.42}px ${TYPE.family}`;
    ctx.fillStyle = TOKO.PAPER;
    ctx.textAlign = 'center';
    ctx.fillText(VOICE.cry, W / 2, H * 0.62 + size * 1.9);
    ctx.restore();
  }
}


// ── the gel ─────────────────────────────────────────────────────────
// A body with volume, landing. `p` is seconds since impact: it starts squashed
// and rings down. Width is the reciprocal of height, so the thing keeps its
// mass rather than merely getting shorter — which is the whole difference
// between gel and a rectangle being scaled.
function squash(p, amount = 0.42, hz = 7, damp = 7.5) {
  if (p < 0) return { sx: 1, sy: 1 };
  const k = Math.exp(-damp * p) * Math.cos(hz * Math.PI * p) * amount;
  const sy = Math.max(0.2, 1 - k);
  return { sx: 1 / sy, sy };
}

// The body itself: a superellipse, so ONE number turns a cube into a blob.
// `n` near 6 is a rounded cube, near 2.4 is a bubble — which is what the thing
// does on impact, and it costs a lerp rather than a second shape and a morph
// between them. The wobble rides on the radius so the outline ripples without
// the silhouette losing its volume.
function gel(ctx, cx, cy, rx, ry, n, wob, phase) {
  const N = 48;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    const k = 2 / n;
    const w = 1 + wob * Math.sin(a * 3 + phase) * 0.5 + wob * Math.sin(a * 5 - phase * 1.4) * 0.3;
    const x = cx + Math.sign(c) * Math.pow(Math.abs(c), k) * rx * w;
    const y = cy + Math.sign(s) * Math.pow(Math.abs(s), k) * ry * w;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

// The mark, at a stroke weight of your choosing. `weight` 1 is the shipping
// mark; above about 3 the slots have closed and it is a blob.
function markAt(ctx, weight, blink = 1) {
  const m = GEO.mouth, e = GEO.eye;
  ctx.lineWidth = GEO.stroke * weight;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(m.cx, m.cy, m.outer.r, m.outer.a0 * D, m.outer.a1 * D);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(m.cx, m.cy, m.inner.r, m.inner.a0 * D, m.inner.a1 * D);
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(50 + side * e.dx, e.cy);
    ctx.scale(1, blink);
    ctx.beginPath();
    ctx.arc(0, 0, e.outer.r, e.outer.a0 * D, e.outer.a1 * D);
    ctx.stroke();
    for (const s2 of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s2 * e.outer.r, 0);
      ctx.lineTo(s2 * e.outer.r, e.legs.y - e.cy);
      ctx.stroke();
    }
    ctx.restore();
  }
}

const G = {
  land: 0.44,                  // the cube comes down and hits
  thin: 0.56, thinEnd: 1.24,   // and thins into the mark
  blink: 1.40,
  drop: 1.58, splat: 1.90,     // the mark flops down onto the line
  type: 1.90, typeEnd: 2.20,   // which throws the logotype out
  hold: 2.34,
  out: 2.90, end: 3.40,
};

function frameGoo(scr, t, W, H) {
  const ctx = scr.ctx;
  ctx.fillStyle = TOKO.MAGENTA;
  ctx.fillRect(0, 0, W, H);

  const b = bounds();
  const faceH = H * 0.30;
  const boxW = faceH * (GEO.box / b.h);
  const s = boxW / GEO.box;
  const restY = H * 0.19;
  const typeY = H * 0.66;

  // Everything leaves together at the end, so the exit is a transform on the
  // whole lockup rather than a fade — it flops out of the frame, it does not
  // dissolve where it stands.
  const pOut = easeIn((t - G.out) / (G.end - G.out));
  ctx.save();
  ctx.translate(0, pOut * H * 1.25);
  ctx.scale(1, 1 + pOut * 0.5);              // stretching as it goes

  // 1. the drop, and 3. the second drop onto the line. Both are the same
  //    fall-and-squash, which is why they are one expression.
  // Off the top by a bit more than half the frame, not a whole one: from
  // higher up, with the ease it wants, the first fifth of a second was blank
  // magenta — an intro whose opening beat is nothing at all.
  const fall = t < G.land
    ? -(1 - easeIn(t / G.land)) * H * 0.62
    : 0;
  const sit = lerp(0, H * 0.055, ease((t - G.drop) / (G.splat - G.drop)));
  const hit = t < G.land ? -1 : (t < G.drop ? t - G.land : t - G.splat);
  const q = squash(hit, t < G.drop ? 0.42 : 0.3);

  ctx.save();
  ctx.translate(W / 2, restY + faceH * 0.5 + fall + sit);
  ctx.scale(q.sx, q.sy);
  ctx.fillStyle = TOKO.PAPER;
  ctx.strokeStyle = TOKO.PAPER;

  // The cube and the over-weight mark are the SAME COLOUR, so their union is
  // just a shape and one can take over from the other with no crossfade at
  // all: the cube shrinks away underneath exactly as the mark's stroke gets
  // heavy enough to fill the same footprint.
  const pThin = clamp((t - G.thin) / (G.thinEnd - G.thin));
  // A short handover on purpose. Held open longer, the mark's mouth at four
  // times weight reaches wider than the cube does and sticks out either side
  // of it — the union stops being one body and starts being a lump with ears.
  const cube = 1 - clamp((t - G.thin) / 0.14);
  if (cube > 0) {
    const wob = Math.exp(-6 * Math.max(0, t - G.land)) * 0.06;
    gel(ctx, 0, 0, faceH * 0.5 * cube, faceH * 0.5 * cube,
      lerp(5.5, 2.6, ease((t - G.land) / 0.3)), wob, t * 9);
  }
  if (t >= G.thin) {
    const bt = (t - G.blink) / 0.5;
    const lid = bt < 0 || bt > 1 ? 0 : (bt < 0.32 ? bt / 0.32 : 1 - (bt - 0.32) / 0.68);
    const blink = 1 - Math.max(0, Math.min(1, lid * lid * (3 - 2 * lid))) * 0.92;
    ctx.save();
    ctx.scale(s, s);
    ctx.translate(-50, -(b.y + b.h / 2));
    markAt(ctx, lerp(3.9, 1, ease(pThin)), blink);
    ctx.restore();
  }
  ctx.restore();

  // 4. the logotype, thrown out by the landing rather than faded up
  if (t >= G.type) {
    const p = ease((t - G.type) / (G.typeEnd - G.type));
    const size = Math.min(W * 0.09, H * 0.085);
    const qt = squash(t - G.type, 0.5, 6, 8);
    ctx.save();
    ctx.translate(W / 2, typeY);
    ctx.scale(qt.sx * p, qt.sy * p);
    ctx.textAlign = 'center';
    drawLogotype(ctx, 0, 0, size, {
      color: TOKO.PAPER, lines: [VOICE.company], align: 'center', tm: false,
    });
    ctx.font = `${size * 0.42}px ${TYPE.family}`;
    ctx.fillStyle = TOKO.PAPER;
    ctx.fillText(VOICE.cry, 0, size * 1.9);
    ctx.restore();
  }
  ctx.restore();
}

// The two of them, each with its own clock. `hold` is the frame reduced motion
// is shown; `end` is when the thing is over.
export const STYLES = {
  draw: { frame: frameDraw, hold: T.hold - 0.01, fade: T.fade, end: T.end },
  goo:  { frame: frameGoo,  hold: G.hold,        fade: G.end,  end: G.end },
};

export function playSting(opts = {}) {
  const { parent = document.body, onDone, style = 'goo' } = opts;
  const kit = STYLES[style] ?? STYLES.goo;

  const root = document.createElement('div');
  Object.assign(root.style, {
    position: 'fixed', inset: '0', display: 'grid', placeItems: 'center',
    background: TOKO.MAGENTA, zIndex: '99999', cursor: 'pointer',
    transition: 'opacity .26s linear',
  });
  // A class of its own. `[role="img"]` is not enough to find this by: every
  // signed game carries a badge with the same role, so a test that looked for
  // one found the signature in the corner of the game it had just navigated to
  // and reported the sting as still on screen.
  root.className = 'toko-sting';
  root.setAttribute('role', 'img');
  root.setAttribute('aria-label', `${VOICE.company} — ${VOICE.cry}`);
  parent.appendChild(root);

  const W = Math.min(640, Math.floor(window.innerWidth * 0.92));
  const H = Math.min(420, Math.floor(window.innerHeight * 0.8));
  const scr = new Surface(root, W, H);

  let finished = false, resolve;
  const done = new Promise(r => { resolve = r; });

  const finish = () => {
    if (finished) return;
    finished = true;
    scr.stop();
    root.style.opacity = '0';
    removeEventListener('keydown', finish);
    root.removeEventListener('pointerdown', finish);
    setTimeout(() => root.remove(), 280);
    if (onDone) onDone();
    resolve();
  };

  addEventListener('keydown', finish);
  root.addEventListener('pointerdown', finish);

  const still = typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (still) {
    kit.frame(scr, kit.hold, W, H);       // the finished lockup, held
    setTimeout(finish, 1400);
  } else {
    scr.loop((t) => {
      kit.frame(scr, t, W, H);
      // `goo` walks itself out of the frame, so it has nothing to fade; `draw`
      // ends where it stands and does. Same field either way, set per style.
      if (t >= kit.fade) {
        root.style.opacity = String(clamp(1 - (t - kit.fade) / Math.max(0.01, kit.end - kit.fade)));
      }
      if (t >= kit.end) finish();
    });
  }

  return { destroy: finish, done };
}

// The sting, but once per browser rather than once per load — what a game
// actually wants on its title screen.
//
// With two of them and one showing, the choice is a coin flip and the result
// is WRITTEN DOWN (`<key>Style`). An intro somebody saw once and cannot name
// is an intro you cannot get feedback about: "the opening is too long" has to
// be attributable to the one that was actually on screen.
export function playStingOnce(key = 'tokoSting', opts = {}) {
  try {
    if (localStorage.getItem(key)) return null;
    localStorage.setItem(key, String(Date.now()));
  } catch { /* private mode: just play it */ }
  let style = opts.style;
  if (!style) {
    style = Math.random() < 0.5 ? 'draw' : 'goo';
    try { localStorage.setItem(`${key}Style`, style); } catch { /* */ }
  }
  return playSting({ ...opts, style });
}

// Which one was shown, for anything that wants to say so alongside a note.
export function stingStyle(key = 'tokoSting') {
  try { return localStorage.getItem(`${key}Style`); } catch { return null; }
}
