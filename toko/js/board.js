// TOKO MIDORI GAMES — the brand board.
//
// Everything here is drawn by the same modules a game imports; nothing on this
// page is a picture of the brand, it IS the brand, running. If a mark looks
// wrong here it is wrong everywhere — which is the point of building the board
// out of the shipping code instead of screenshots.

import { Surface } from './surface.js';
import { TOKO, VOICE, SHEET, cssVars } from './palette.js';
import {
  drawFace, drawIcon, drawBadge, bounds, GEO,
  svgFace, svgBadge, faviconHref,
} from './face.js';
import { drawLockup, drawLogotype, drawSheet, drawCredit, substituted } from './lockup.js';
import { hit, tear, split, scanlines, carrier } from './glitch.js';
import { pulse } from './util.js';
import { playSting } from './sting.js';
import { startMasthead } from './masthead.js';

const $ = s => document.querySelector(s);
const el = (tag, cls, txt) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
};

cssVars();
$('#favicon').href = faviconHref();

// say it out loud when the licensed face is not installed, rather than quietly
// shipping the wrong letterforms
if (substituted()) $('#font-warn').hidden = false;

startMasthead($('#masthead'), { w: 620, h: 168 });

function card(parent, title, note, paper) {
  const c = el('div', 'card');
  c.appendChild(el('h3', null, title));
  const shot = el('div', 'shot' + (paper ? ' paper' : ''));
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
}

// place the face's INK inside a box — the mark hangs low in its own design box
function faceIn(ctx, x, y, w, h, opts) {
  const b = bounds();
  const boxW = Math.min(w / (b.w / GEO.box), h / (b.h / GEO.box) * (GEO.box / GEO.box));
  const scale = Math.min(w / b.w, h / b.h);
  const bw = GEO.box * scale;
  drawFace(ctx, x + (w - b.w * scale) / 2 - b.x * scale,
    y + (h - b.h * scale) / 2 - b.y * scale, bw, opts);
}

// ── the face ─────────────────────────────────────────────────────────────
{
  const g = $('#marks');

  {
    const { card: c, shot } = card(g, 'The mark', 'Black on paper. The primary, and the one that goes on anything printed.', true);
    const s = new Surface(shot, 230, 150, { label: 'The Toko Midori Games face' });
    s.loop((t) => {
      s.clear(TOKO.PAPER);
      const k = pulse(t, { every: 6, len: 0.16, offset: 1.2 });
      faceIn(s.ctx, 12, 12, 206, 126, { color: TOKO.INK, squash: 1 - k * 0.92 });
    });
    const row = el('div', 'row'); c.appendChild(row);
    svgButton(row, 'SVG', 'toko-face.svg', () => svgFace({ color: TOKO.INK }));
    svgButton(row, 'Reversed', 'toko-face-reverse.svg', () => svgFace({ color: TOKO.PAPER, ground: TOKO.INK }));
  }

  {
    const { card: c, shot } = card(g, 'Reversed', 'Paper on black. The screen default — the arcade, the games, this page.');
    const s = new Surface(shot, 230, 150, { label: 'The face reversed out of black' });
    s.loop((t) => {
      s.clear(TOKO.INK);
      const k = pulse(t, { every: 6, len: 0.16, offset: 3.4 });
      faceIn(s.ctx, 12, 12, 206, 126, { color: TOKO.PAPER, squash: 1 - k * 0.92 });
    });
    const row = el('div', 'row'); c.appendChild(row);
    svgButton(row, 'SVG', 'toko-face-hot.svg', () => svgFace({ color: TOKO.MAGENTA, ground: TOKO.INK }));
  }

  {
    const { card: c, shot } = card(g, 'The badge', 'The face on a disc. The sticker, the pin, the favicon, and the signature a game wears in its corner.');
    const s = new Surface(shot, 230, 150, { label: 'The Toko Midori Games badge' });
    s.loop((t) => {
      s.clear(TOKO.INK);
      const k = pulse(t, { every: 5.5, len: 0.16, offset: 0.6 });
      drawBadge(s.ctx, 78, 75, 60, { ground: TOKO.MAGENTA, ink: TOKO.PAPER, face: { squash: 1 - k * 0.92 } });
      drawBadge(s.ctx, 176, 75, 38, { ground: TOKO.PAPER, ink: TOKO.INK, face: { squash: 1 - k * 0.92 } });
    });
    const row = el('div', 'row'); c.appendChild(row);
    svgButton(row, 'SVG', 'toko-badge.svg', () => svgBadge({}));
  }

  {
    const { shot } = card(g, 'The icon', 'Full bleed on a rounded square. App icons, cartridge labels, anywhere the mark has to fill a slot.');
    const s = new Surface(shot, 230, 150, { label: 'The app icon' });
    s.loop(() => {
      s.clear(TOKO.INK);
      drawIcon(s.ctx, 20, 12, 126, { ground: TOKO.MAGENTA, ink: TOKO.PAPER });
      drawIcon(s.ctx, 158, 48, 54, { ground: TOKO.INK, ink: TOKO.PAPER });
    });
  }

  {
    const { shot } = card(g, 'At size', 'The badge at 44, 28 and 16 pixels. Below 44 the two slots start to close and the eyes go solid — that is the floor, and it is why the signature clamps to it.');
    const s = new Surface(shot, 230, 90, { label: 'The badge at 44, 28 and 16 pixels' });
    s.loop(() => {
      s.clear(TOKO.INK);
      drawBadge(s.ctx, 40, 45, 22, { ground: TOKO.MAGENTA, ink: TOKO.PAPER });
      drawBadge(s.ctx, 100, 45, 14, { ground: TOKO.MAGENTA, ink: TOKO.PAPER });
      drawBadge(s.ctx, 145, 45, 8, { ground: TOKO.MAGENTA, ink: TOKO.PAPER });
    });
  }

  {
    const { shot } = card(g, 'The creator', 'How the artist signs: 美鳥十湖, with the role above it and the reading below.', true);
    const s = new Surface(shot, 230, 120, { label: 'Toko Midori, The Game Creator' });
    s.loop(() => { s.clear(TOKO.PAPER); drawCredit(s.ctx, 16, 34, 30, { color: TOKO.INK }); });
  }
}

// ── lockups ──────────────────────────────────────────────────────────────
{
  const g = $('#lockups');
  const shots = [
    ['Primary', TOKO.INK, TOKO.PAPER, true],
    ['Reversed', TOKO.PAPER, TOKO.INK, false],
    ['Hot', TOKO.MAGENTA, TOKO.INK, false],
    ['On magenta', TOKO.PAPER, TOKO.MAGENTA, false],
  ];
  for (const [name, ink, ground, paper] of shots) {
    const { shot } = card(g, name, null, paper);
    const s = new Surface(shot, 300, 120, { fluid: true, label: `Toko Midori Games lockup — ${name}` });
    s.loop((t) => {
      s.clear(ground);
      const k = pulse(t, { every: 7 + name.length * 0.4, len: 0.16 });
      const b = bounds();
      const h = 74;
      const boxW = h * (GEO.box / b.h);
      drawFace(s.ctx, 16 - (b.x / GEO.box) * boxW, 22 - (b.y / GEO.box) * boxW, boxW,
        { color: ink, squash: 1 - k * 0.92 });
      drawLogotype(s.ctx, 16 + boxW * (b.w / GEO.box) + 12, 22, h / 2.95, { color: ink });
    });
  }
  // the one-liner
  const { shot } = card(g, 'One line', 'For anywhere too short to stack.', true);
  const s = new Surface(shot, 300, 70, { fluid: true, label: 'Toko Midori Games, one line' });
  s.loop(() => {
    s.clear(TOKO.PAPER);
    drawLogotype(s.ctx, 14, 22, 26, { color: TOKO.INK, lines: [VOICE.company] });
  });
}

// ── the sticker sheet ────────────────────────────────────────────────────
{
  const cols = 4, r = 30, gap = 16;
  const rows = Math.ceil(SHEET.length / cols);
  const w = cols * (r * 2 + gap) + gap, h = rows * (r * 2 + gap) + gap;
  const s = new Surface($('#sheet'), w, h, { fluid: true, label: 'The Toko Midori Games sticker sheet' });
  s.loop(() => { s.clear('#3a3f47'); drawSheet(s.ctx, gap, gap, cols, r, gap); });
}

// ── the lab ──────────────────────────────────────────────────────────────
{
  const W = 200, H = 130;
  const s = new Surface($('#lab'), W, H, { label: 'The glitch toolkit, live' });
  const ui = { int: $('#s-int'), tear: $('#s-tear'), split: $('#s-split'), seed: $('#s-seed') };
  const out = { int: $('#o-int'), tear: $('#o-tear'), split: $('#o-split'), seed: $('#o-seed') };
  const code = $('#lab-code');
  let resting = false;

  const readout = (kLabel, seed) => {
    const lines = [`hit(ctx, ${W}, ${H}, ${kLabel}, { seed: ${seed}, t });`];
    if (+ui.tear.value) lines.push(`tear(ctx, ${W}, ${H}, { bands: 4, amount: ${ui.tear.value}, seed: ${seed} });`);
    if (+ui.split.value) lines.push(`split(ctx, ${W}, ${H}, { dx: ${ui.split.value} });`);
    return lines.join('\n');
  };

  s.loop((t) => {
    s.clear(TOKO.INK);
    faceIn(s.ctx, 12, 10, W - 24, H - 20, { color: TOKO.PAPER });
    const seed = +ui.seed.value;
    const k = resting ? pulse(t, { every: 6.5, len: 0.34 }) : (+ui.int.value / 100);
    if (k > 0) hit(s.ctx, W, H, k, { seed, t, scan: false });
    if (+ui.tear.value) tear(s.ctx, W, H, { bands: 4, amount: +ui.tear.value, seed });
    if (+ui.split.value) split(s.ctx, W, H, { dx: +ui.split.value });
    carrier(s.ctx, W, H, { y: (t * 60) % (H + 8), height: 3, alpha: 0.2 });
    scanlines(s.ctx, W, H, { darkness: 0.12, gap: 3, phase: t * 20 });

    out.int.value = k.toFixed(2);
    out.tear.value = ui.tear.value;
    out.split.value = ui.split.value;
    out.seed.value = ui.seed.value;
    code.textContent = readout(resting ? 'pulse(t)' : (+ui.int.value / 100).toFixed(2), seed);
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
  const s = new Surface($('#rest'), 200, 130, { label: 'A signed game at rest' });
  s.loop((t) => {
    s.clear(TOKO.INK);
    const k = pulse(t, { every: 6.5, len: 0.16, offset: 2.1 });
    drawBadge(s.ctx, 100, 65, 30, {
      ground: TOKO.MAGENTA, ink: TOKO.PAPER, face: { squash: 1 - k * 0.92 },
    });
  });
}

// ── the sting ────────────────────────────────────────────────────────────
$('#b-sting').addEventListener('click', () => { playSting(); });

// ── the footer badge ─────────────────────────────────────────────────────
{
  const s = new Surface($('#credit-badge'), 30, 30, { label: 'Signed: Toko Midori Games' });
  s.loop((t) => {
    s.clear();
    const k = pulse(t, { every: 6.5, len: 0.16, offset: 2.1 });
    drawBadge(s.ctx, 15, 15, 15, { ground: TOKO.MAGENTA, ink: TOKO.PAPER, face: { squash: 1 - k * 0.92 } });
  });
}
