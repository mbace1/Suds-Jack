// TOKO MIDORI — the brand board.
//
// Everything on this page is drawn by the same modules a game imports; nothing
// here is a picture of the brand, it IS the brand, running. If a mark looks
// wrong on this page it is wrong everywhere, which is the point of building
// the board out of the shipping code instead of screenshots.

import { Screen, textWidth } from './pixel.js';
import { TOKO, VOICE, REGISTER } from './palette.js';
import {
  drawMask, drawSeal, drawWordmark, drawStack, drawLockup,
  svgMask, svgSeal, svgWordmark, faviconHref, SEAL,
} from './mark.js';
import { hit, pulse, scanlines, carrier, tear, split, dropout } from './glitch.js';
import { playSting } from './sting.js';
import { startMasthead } from './masthead.js';

const $ = s => document.querySelector(s);
const el = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
};

// ── the favicon is the 16×16 mask, generated, not a file ─────────────────
$('#favicon').href = faviconHref();

// ── masthead ─────────────────────────────────────────────────────────────
startMasthead($('#masthead'), { scale: 3 });

// ── a card: a title, a live shot, a note, and whatever buttons ───────────
function card(parent, title, note) {
  const c = el('div', 'card');
  c.appendChild(el('h3', null, title));
  const shot = el('div', 'shot');
  c.appendChild(shot);
  if (note) c.appendChild(el('p', 'meta', note));
  parent.appendChild(c);
  return { card: c, shot };
}

function download(name, svg) {
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function svgButton(parent, label, file, make) {
  const b = el('button', null, label);
  b.addEventListener('click', () => download(file, make()));
  parent.appendChild(b);
  return b;
}

// paint helper: cache the still art, glitch only on the pulse frames
// On a canvas this small one scanline lands on every OTHER logo pixel, which
// stripes the mark instead of glassing it — so the still marks get no scan
// unless the surface is big enough for a scanline to read as a scanline.
function restless(scr, drawBase, opts = {}) {
  const { every = 7, key = 'base', seed = 5, scan = (scr.h >= 48 ? 0.12 : 0) } = opts;
  scr.loop((t) => {
    scr.cached(key, drawBase);
    const k = pulse(t, { every, len: 0.32, offset: opts.offset ?? 0 });
    if (k > 0) hit(scr.ctx, scr.w, scr.h, k, { seed, t, scan: false });
    if (scan) scanlines(scr.ctx, scr.w, scr.h, { darkness: scan, gap: 2, phase: t * 8 });
  });
  return scr;
}

// ── the marks ────────────────────────────────────────────────────────────
{
  const g = $('#marks');

  // the mask
  {
    const { card: c, shot } = card(g, 'The mask', '24 × 24. The crack is plotted by hand — the same break every time, because it is a signature and not a random fracture.');
    const s = new Screen(shot, 28, 28, 5, { label: 'The Toko Midori mask' });
    restless(s, (sc) => { sc.g.p(0, 0, 28, 28, TOKO.VOID); drawMask(sc.g, 2, 2, { scale: 1 }); }, { seed: 5 });
    const row = el('div', 'row'); c.appendChild(row);
    svgButton(row, 'SVG', 'toko-mask.svg', () => svgMask({ px: 8 }));
    svgButton(row, 'SVG on void', 'toko-mask-void.svg', () => svgMask({ px: 8, bg: TOKO.VOID }));
  }

  // the reduction
  {
    const { card: c, shot } = card(g, 'The reduction', '16 × 16, redrawn rather than resampled. This is the favicon on the tab of this page.');
    const s = new Screen(shot, 16, 16, 5, { label: 'The mask at 16 pixels' });
    s.loop(() => { s.g.p(0, 0, 16, 16, TOKO.VOID); drawMask(s.g, 0, 0, { small: true }); });
    const row = el('div', 'row'); c.appendChild(row);
    svgButton(row, 'SVG', 'toko-mask-16.svg', () => svgMask({ px: 8, small: true }));
  }

  // the seal
  {
    const { card: c, shot } = card(g, 'The seal', 'The signature. A hanko is always red; Toko’s is chipped, on a press that was never serviced.');
    const s = new Screen(shot, SEAL + 4, SEAL + 4, 5, { label: 'The Toko Midori seal' });
    restless(s, (sc) => {
      sc.g.p(0, 0, SEAL + 4, SEAL + 4, TOKO.VOID);
      drawSeal(sc.g, 2, 2, { scale: 1 });
    }, { seed: 9, offset: 2.4 });
    const row = el('div', 'row'); c.appendChild(row);
    svgButton(row, 'SVG', 'toko-seal.svg', () => svgSeal({ px: 8 }));
  }

  // the wordmark
  {
    const W = textWidth(VOICE.name, 1, 2) + 4;
    const { card: c, shot } = card(g, 'The wordmark', 'Letterspaced hard. A name stencilled onto a crate, not a logotype drawn to be liked.');
    const s = new Screen(shot, W, 11, 3, { fluid: true, label: 'Toko Midori wordmark' });
    s.loop((t) => {
      s.g.p(0, 0, W, 11, TOKO.VOID);
      drawWordmark(s.g, 2, 2, { color: TOKO.BONE, track: 2 });
    });
    const row = el('div', 'row'); c.appendChild(row);
    svgButton(row, 'SVG', 'toko-wordmark.svg', () => svgWordmark({ px: 8 }));
    svgButton(row, 'Cry', 'toko-cry.svg', () => svgWordmark({ text: VOICE.cry, color: TOKO.MIDORI, px: 8, track: 1 }));
  }

  // the stack
  {
    const W = textWidth(VOICE.cry, 1, 1) + 4;
    const { shot } = card(g, 'The stack', 'Name, rule, cry. The block that goes on a title screen — and the last thing the sting leaves on the glass.');
    const s = new Screen(shot, W, 22, 3, { fluid: true, label: 'Toko Midori — go make your own' });
    restless(s, (sc) => {
      sc.g.p(0, 0, W, 22, TOKO.VOID);
      drawStack(sc.g, 2, 2, { scale: 1 });
    }, { seed: 13, offset: 4.1 });
  }

  // actual size
  {
    const { shot } = card(g, 'Actual size', 'The 16 × 16 at one screen pixel per art pixel, next to the seal at 22. If it does not survive here it does not ship.');
    const s = new Screen(shot, 48, 24, 3, { label: 'The mask and seal at true size' });
    s.loop(() => {
      s.g.p(0, 0, 48, 24, TOKO.VOID);
      drawMask(s.g, 3, 4, { small: true });
      drawSeal(s.g, 23, 1, { scale: 1 });
    });
  }
}

// ── registers ────────────────────────────────────────────────────────────
{
  const g = $('#registers');
  const notes = {
    LIVE:  'Green on void. Screens, marquees, in-game. The default.',
    STAMP: 'Hanko red. Corners, credits, the seal — anywhere Toko is signing rather than speaking.',
    GHOST: 'One colour, no depth. 16px, print, and any surface that cannot hold the green.',
    RIOT:  'Green torn by red, phosphor in the highlights. Only on the frame a hit lands on.',
  };
  for (const name of ['LIVE', 'STAMP', 'GHOST', 'RIOT']) {
    const { shot } = card(g, name, notes[name]);
    const bg = REGISTER[name].bg === 'transparent' ? TOKO.PANEL : REGISTER[name].bg;
    const s = new Screen(shot, 28, 28, 4, { label: `The mask in the ${name} register` });
    if (name === 'RIOT') {
      // RIOT is not a resting state, so the board never shows it resting
      s.loop((t) => {
        s.g.p(0, 0, 28, 28, bg);
        drawMask(s.g, 2, 2, { reg: 'RIOT' });
        hit(s.ctx, 28, 28, 0.55 + 0.35 * Math.abs(Math.sin(t * 3)), { seed: 2 + ((t * 12) | 0), t, scan: false });
      });
    } else {
      s.loop(() => { s.g.p(0, 0, 28, 28, bg); drawMask(s.g, 2, 2, { reg: name }); });
    }
  }
}

// ── palette ──────────────────────────────────────────────────────────────
{
  const g = $('#swatches');
  const shown = [
    ['MIDORI', 'the colour · 11.4:1'], ['MIDORI_DEEP', 'shell, seams'],
    ['MOSS', 'the fill behind a mark'], ['LUX', 'luminescent leaf'],
    ['VERMILION', 'the stamp · 4.6:1'], ['VERM_DEEP', 'the press'],
    ['PHOSPHOR', 'borrowed: the arcade'], ['GOLD', 'borrowed: reward'],
    ['BONE', 'body copy · 15.3:1'], ['ASH', 'dim copy · 7.7:1'],
    ['VOID', 'the ground'], ['PANEL', 'a card on the ground'],
  ];
  for (const [key, note] of shown) {
    const sw = el('div', 'sw');
    const chip = el('div', 'chip');
    chip.style.background = TOKO[key];
    sw.appendChild(chip);
    const name = el('div', 'name');
    name.appendChild(el('b', null, key));
    name.appendChild(el('span', null, `${TOKO[key]} · ${note}`));
    sw.appendChild(name);
    g.appendChild(sw);
  }
}

// ── the alphabet ─────────────────────────────────────────────────────────
{
  const S = 2, W = 170, H = 92;
  const s = new Screen($('#specimen'), W, H, 2, { fluid: true, label: 'The 5 by 7 alphabet: A to Z, 0 to 9, punctuation' });
  s.loop((t) => {
    s.g.p(0, 0, W, H, TOKO.VOID);
    s.g.text('ABCDEFGHIJKLM', 6, 6, TOKO.BONE, S, 1);
    s.g.text('NOPQRSTUVWXYZ', 6, 28, TOKO.BONE, S, 1);
    s.g.text('0123456789', 6, 50, TOKO.MIDORI, S, 1);
    s.g.text(".,!?-:'/·×", 6, 72, TOKO.ASH, S, 1);
    scanlines(s.ctx, W, H, { darkness: 0.1, gap: 2, phase: t * 6 });
  });
}

// ── the lab ──────────────────────────────────────────────────────────────
{
  const AW = 32, AH = 32;
  const s = new Screen($('#lab'), AW, AH, 6, { label: 'The glitch toolkit, live' });
  const ui = {
    int: $('#s-int'), tear: $('#s-tear'), split: $('#s-split'),
    drop: $('#s-drop'), seed: $('#s-seed'),
  };
  const out = {
    int: $('#o-int'), tear: $('#o-tear'), split: $('#o-split'),
    drop: $('#o-drop'), seed: $('#o-seed'),
  };
  const code = $('#lab-code');
  let resting = false;

  const readout = (k, seed) => {
    const lines = [`hit(ctx, ${AW}, ${AH}, ${k.toFixed(2)}, { seed: ${seed}, t });`];
    if (+ui.tear.value) lines.push(`tear(ctx, ${AW}, ${AH}, { bands: 4, amount: ${ui.tear.value}, seed: ${seed} });`);
    if (+ui.split.value) lines.push(`split(ctx, ${AW}, ${AH}, { dx: ${ui.split.value} });`);
    if (+ui.drop.value) lines.push(`dropout(ctx, ${AW}, ${AH}, { n: ${ui.drop.value}, seed: ${seed} });`);
    return lines.join('\n');
  };

  s.loop((t) => {
    s.cached('mask', (sc) => {
      sc.g.p(0, 0, AW, AH, TOKO.VOID);
      drawMask(sc.g, 4, 4, { scale: 1 });
    });
    const seed = +ui.seed.value;
    const k = resting ? pulse(t, { every: 6.5, len: 0.34 }) : (+ui.int.value / 100);
    if (k > 0) hit(s.ctx, AW, AH, k, { seed, t, scan: false });
    if (+ui.tear.value) tear(s.ctx, AW, AH, { bands: 4, amount: +ui.tear.value, seed });
    if (+ui.split.value) split(s.ctx, AW, AH, { dx: +ui.split.value });
    if (+ui.drop.value) dropout(s.ctx, AW, AH, { n: +ui.drop.value, seed, color: TOKO.VOID });
    carrier(s.ctx, AW, AH, { y: (t * 22) % (AH + 6), height: 2, alpha: 0.14 });
    scanlines(s.ctx, AW, AH, { darkness: 0.10, gap: 2, phase: t * 8 });

    out.int.value = (resting ? k : +ui.int.value / 100).toFixed(2);
    out.tear.value = ui.tear.value;
    out.split.value = ui.split.value;
    out.drop.value = ui.drop.value;
    out.seed.value = ui.seed.value;
    code.textContent = resting
      ? readout(k, seed).replace(/^hit\(ctx, \d+, \d+, [\d.]+/, `hit(ctx, ${AW}, ${AH}, pulse(t)`)
      : readout(k, seed);
  });

  $('#b-pulse').addEventListener('click', (e) => {
    resting = !resting;
    e.currentTarget.setAttribute('aria-pressed', String(resting));
    ui.int.disabled = resting;
  });
  $('#b-copy').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    try { await navigator.clipboard.writeText(code.textContent); b.textContent = 'Copied'; }
    catch { b.textContent = 'Select it'; }
    setTimeout(() => { b.textContent = 'Copy the call'; }, 1600);
  });
}

// ── how it rests ─────────────────────────────────────────────────────────
{
  const s = new Screen($('#rest'), 32, 32, 4, { label: 'A signed page at rest' });
  restless(s, (sc) => { sc.g.p(0, 0, 32, 32, TOKO.VOID); drawSeal(sc.g, 5, 5, { scale: 1 }); },
    { every: 8, seed: 17, scan: 0.12 });
}

// ── the sting ────────────────────────────────────────────────────────────
$('#b-sting').addEventListener('click', () => { playSting(); });

// ── lockups ──────────────────────────────────────────────────────────────
{
  // the accents are the cabinets' own, lifted from the arcade's game list so
  // a lockup on this page and a card on the hub cannot disagree
  const GAMES = [
    ['SUDS JACK', '#22e0e8'],
    ['TOKO DROP', '#5ad1a8'],
    ['HYPER DAGGER', '#d8412f'],
    ['DROP CABAL', '#e8913a'],
    ['PAPER ROUTE', '#6fc7e8'],
    ['GAME OF LIFE', '#8faf6a'],
    ['NEON RONIN', '#e83ca8'],
    ['SKLTR', '#3ce85a'],
  ];
  const g = $('#lockups');
  const W = 112, H = 26;
  for (const [name, accent] of GAMES) {
    const { shot } = card(g, name, null);
    const s = new Screen(shot, W, H, 3, { fluid: true, label: `Toko Midori × ${name}` });
    restless(s, (sc) => {
      sc.g.p(0, 0, W, H, TOKO.VOID);
      drawLockup(sc.g, 3, 1, { scale: 1, game: name, accent });
    }, { every: 9 + Math.random() * 4, seed: name.length + 7 });
  }
}

// ── the credit line in the footer ────────────────────────────────────────
{
  const s = new Screen($('#credit-seal'), SEAL, SEAL, 1, { label: 'Signed: Toko Midori' });
  s.loop(() => { s.clear(); drawSeal(s.g, 0, 0, { scale: 1 }); });
}
