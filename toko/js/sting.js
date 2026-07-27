// TOKO MIDORI GAMES — the sting.
//
// The face draws itself: the mouth sweeps open, the eyes drop in, it blinks
// once, the logotype lands beside it. Then it holds and leaves. About three
// seconds, on magenta, and skippable on any input from the very first frame —
// a sting you cannot skip is an ad, and this workshop does not run ads.
//
// The arcs are drawn with a dash offset so they genuinely GROW along their own
// path rather than fading in. The mark is made of strokes; the sting should
// look like somebody drawing them.

import { Surface } from './surface.js';
import { TOKO, VOICE, TYPE } from './palette.js';
import { GEO, bounds } from './face.js';
import { drawLogotype } from './lockup.js';

const D = Math.PI / 180;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (p) => 1 - Math.pow(1 - clamp(p), 3);

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

function frame(scr, t, W, H) {
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

export function playSting(opts = {}) {
  const { parent = document.body, onDone } = opts;

  const root = document.createElement('div');
  Object.assign(root.style, {
    position: 'fixed', inset: '0', display: 'grid', placeItems: 'center',
    background: TOKO.MAGENTA, zIndex: '99999', cursor: 'pointer',
    transition: 'opacity .26s linear',
  });
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
    frame(scr, T.hold - 0.01, W, H);      // the finished mark, held
    setTimeout(finish, 1400);
  } else {
    scr.loop((t) => {
      frame(scr, t, W, H);
      if (t >= T.fade) root.style.opacity = String(clamp(1 - (t - T.fade) / (T.end - T.fade)));
      if (t >= T.end) finish();
    });
  }

  return { destroy: finish, done };
}

// The sting, but once per browser rather than once per load — what a game
// actually wants on its title screen.
export function playStingOnce(key = 'tokoSting', opts = {}) {
  try {
    if (localStorage.getItem(key)) return null;
    localStorage.setItem(key, String(Date.now()));
  } catch { /* private mode: just play it */ }
  return playSting(opts);
}
