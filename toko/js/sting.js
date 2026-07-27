// TOKO MIDORI — the sting.
//
// Three seconds of signal finding a face. Noise resolves into the mask, the
// mask takes a hit, the seal comes down on it, and the name types itself out
// under a line that says GO MAKE YOUR OWN — which is the whole point of the
// brand and therefore the last thing on screen.
//
// It is skippable on any input from the first frame. A sting you cannot skip
// is an ad, and Toko does not run ads.

import { Screen } from './pixel.js';
import { TOKO, VOICE } from './palette.js';
import { drawMask, drawSeal, drawWordmark, SEAL } from './mark.js';
import { tear, split, dropout, noise, scanlines, carrier } from './glitch.js';

const AW = 160, AH = 104;

// the beats, in seconds
const T = {
  find:  0.45,   // noise → mask
  settle:1.05,   // tear decays out
  riot:  1.12,   // the hit
  riotEnd:1.38,
  stamp: 1.46,   // the seal comes down
  stampSet: 1.66,
  type:  1.76,   // the name types
  tag:   2.42,   // GO MAKE YOUR OWN
  fade:  3.00,
  end:   3.30,
};

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

function frame(scr, t) {
  const { g } = scr;
  g.p(0, 0, AW, AH, TOKO.VOID);

  const maskS = 2, maskX = (AW - 24 * maskS) >> 1, maskY = 8;
  const riot = t >= T.riot && t < T.riotEnd;

  drawMask(g, maskX, maskY, { scale: maskS, reg: riot ? 'RIOT' : 'LIVE' });

  // ── 1. the signal finds it ────────────────────────────────────────────
  if (t < T.find) {
    const p = clamp(t / T.find);
    noise(scr.ctx, AW, AH, { density: 0.30 * (1 - p), seed: 1 + ((t * 60) | 0) });
    dropout(scr.ctx, AW, AH, { n: Math.round(34 * (1 - p)), seed: 5 + ((t * 60) | 0), color: TOKO.VOID, max: 14 });
    tear(scr.ctx, AW, AH, { bands: 6, amount: Math.round(14 * (1 - p)), seed: 9 + ((t * 40) | 0) });
  } else if (t < T.settle) {
    // ── 2. it stops sliding ─────────────────────────────────────────────
    const p = clamp((t - T.find) / (T.settle - T.find));
    tear(scr.ctx, AW, AH, { bands: 3, amount: Math.round(6 * (1 - p)), seed: 21 + ((t * 30) | 0) });
    split(scr.ctx, AW, AH, { dx: Math.round(2 * (1 - p)) });
  }

  // ── 3. the hit ────────────────────────────────────────────────────────
  if (riot) {
    const p = clamp((t - T.riot) / (T.riotEnd - T.riot));
    split(scr.ctx, AW, AH, { dx: 3, dy: 1 });
    tear(scr.ctx, AW, AH, { bands: 7, amount: 9, seed: 41 + ((t * 60) | 0) });
    noise(scr.ctx, AW, AH, { density: 0.12 * (1 - p), seed: 61 + ((t * 60) | 0) });
    g.ctx.save();
    g.ctx.globalAlpha = 0.28 * (1 - p);
    g.p(0, 0, AW, AH, TOKO.VERMILION);
    g.ctx.restore();
  }

  // ── 4. the seal comes down ────────────────────────────────────────────
  const sx = AW - SEAL - 6, sy = AH - SEAL - 4;
  if (t >= T.stamp && t < T.stampSet) {
    // a ring collapsing onto the spot: the press travelling, not a fade
    const p = clamp((t - T.stamp) / (T.stampSet - T.stamp));
    const pad = Math.round(9 * (1 - p));
    g.frame(sx - pad, sy - pad, SEAL + pad * 2, SEAL + pad * 2, TOKO.VERM_DEEP, 1);
  } else if (t >= T.stampSet) {
    const flash = t < T.stampSet + 0.06;
    drawSeal(g, sx, sy, { scale: 1, color: flash ? TOKO.BONE : TOKO.VERMILION, knock: TOKO.VOID });
  }

  // ── 5. the name types ─────────────────────────────────────────────────
  if (t >= T.type) {
    const n = Math.min(VOICE.name.length, Math.floor((t - T.type) / 0.045));
    const txt = VOICE.name.slice(0, n);
    drawWordmark(g, 34, 64, { scale: 1, color: TOKO.BONE, text: txt, track: 2 });
    if (n < VOICE.name.length && ((t * 12) | 0) % 2 === 0) g.p(34 + n * 7, 64, 5, 7, TOKO.MIDORI);
    if (n >= VOICE.name.length) g.p(34, 74, 75, 1, TOKO.MIDORI);
  }

  // ── 6. the cry ────────────────────────────────────────────────────────
  if (t >= T.tag) {
    const p = (t - T.tag);
    const on = p > 0.18 || ((p * 22) | 0) % 2 === 0;   // two flickers, then held
    if (on) drawWordmark(g, 32, 80, { scale: 1, color: TOKO.MIDORI, text: VOICE.cry, track: 1 });
  }

  // ── the glass ─────────────────────────────────────────────────────────
  carrier(scr.ctx, AW, AH, { y: (t * 62) % (AH + 8), height: 2, alpha: 0.16 });
  scanlines(scr.ctx, AW, AH, { darkness: 0.16, gap: 2, phase: t * 10 });
}

// Play the sting over `parent`. Returns { destroy, done } — `done` resolves
// whether the sting finished or was skipped, so callers can always await it.
export function playSting(opts = {}) {
  const { parent = document.body, onDone } = opts;

  const root = document.createElement('div');
  Object.assign(root.style, {
    position: 'fixed', inset: '0', display: 'grid', placeItems: 'center',
    background: TOKO.VOID, zIndex: '99999', cursor: 'pointer',
    transition: 'opacity .26s linear',
  });
  root.setAttribute('aria-label', `${VOICE.name} — ${VOICE.cry}`);
  root.setAttribute('role', 'img');
  parent.appendChild(root);

  const fit = Math.floor(Math.min(window.innerWidth * 0.92 / AW, window.innerHeight * 0.7 / AH));
  const scale = Math.max(1, Math.min(9, fit));
  const scr = new Screen(root, AW, AH, scale);

  let finished = false, resolve;
  const done = new Promise(r => { resolve = r; });

  const finish = () => {
    if (finished) return;
    finished = true;
    scr.stop();
    root.style.opacity = '0';
    removeEventListener('keydown', finish);
    root.removeEventListener('pointerdown', finish);
    setTimeout(() => { root.remove(); }, 280);
    if (onDone) onDone();
    resolve();
  };

  addEventListener('keydown', finish);
  root.addEventListener('pointerdown', finish);

  const still = typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (still) {
    // no motion: show the resolved mark, hold it, leave
    frame(scr, T.fade - 0.01);
    setTimeout(finish, 1400);
  } else {
    scr.loop((t) => {
      frame(scr, t);
      if (t >= T.fade) root.style.opacity = String(clamp(1 - (t - T.fade) / (T.end - T.fade)));
      if (t >= T.end) finish();
    });
  }

  return { destroy: finish, done };
}

// The sting, but once per browser rather than once per load — what a game
// actually wants on its title screen. Returns null if it has already played.
export function playStingOnce(key = 'tokoSting', opts = {}) {
  try {
    if (localStorage.getItem(key)) return null;
    localStorage.setItem(key, String(Date.now()));
  } catch { /* private mode: just play it */ }
  return playSting(opts);
}
