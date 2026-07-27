// TOKO MIDORI GAMES — the logotype and the lockups.
//
// A condensed squarish grotesque, tight, in three lines that stack almost
// solid, with the face to its left. That pairing — face, gap, three lines, ™ —
// is the primary lockup: the thing that goes on a title screen, a cartridge,
// or a business card.
//
// The logotype is DRAWN, not set — see wordmark.js. It only ever says three
// words, so those words are outlines rather than a font, which is how a
// logotype works anyway and keeps the kit's no-external-assets promise.

import { TOKO, TYPE, VOICE, SHEET } from './palette.js';
import { drawFace, drawBadge, bounds, GEO } from './face.js';
import { drawWord, widthOf, M as WM } from './wordmark.js';

// Nothing is substituted any more — the letterforms are ours and are drawn.
// Kept as an export because the board still asks.
export const substituted = () => false;

function font(size) {
  return `${TYPE.weight} ${size}px ${TYPE.family}`;
}

// ── the logotype ─────────────────────────────────────────────────────────

// Three lines, flush left, stacked tight. Returns the block's measured size.
export function drawLogotype(ctx, x, y, size, opts = {}) {
  const { color = TOKO.INK, lines = VOICE.lines, tm = true, align = 'left' } = opts;
  // The drawn glyphs fill 0..cap exactly, so `size` IS the cap height and the
  // leading has to clear 1.0. TYPE.lineHeight is 0.92 because it was written
  // for a font, whose em box is taller than its caps — used here it laps the
  // three lines over each other.
  const lh = size * 1.06;
  const widths = lines.map(l => widthOf(l) * size / WM.cap);
  const block = Math.max(...widths);

  lines.forEach((ln, i) => {
    const w = widths[i];
    const lx = align === 'center' ? x - w / 2 : x;
    drawWord(ctx, ln, lx, y + size + i * lh, size, color);
  });

  if (tm) {
    // the ™ is drawn from the logotype's own T and M rather than borrowed from
    // a system font — it is the only mark that sits beside the words
    const s2 = size * 0.30;
    const last = widths[widths.length - 1];
    const lx = align === 'center' ? x - last / 2 : x;
    drawWord(ctx, 'TM', lx + last + size * 0.07,
      y + size + (lines.length - 1) * lh - size * 0.62, s2, color);
  }

  return { w: block, h: size + (lines.length - 1) * lh };
}

// One line: "Toko Midori Games". For anywhere too short to stack.
export function drawLogotypeLine(ctx, x, y, size, opts = {}) {
  return drawLogotype(ctx, x, y, size, { ...opts, lines: [VOICE.company] });
}

// ── the primary lockup ───────────────────────────────────────────────────
// Face, gap, three lines. `h` is the height of the FACE, and the logotype is
// sized to stand the same height beside it — which is the relationship in the
// master artwork and the only one that looks right.
export function drawLockup(ctx, x, y, h, opts = {}) {
  const { color = TOKO.INK, ground = null } = opts;
  const b = bounds();
  const faceW = h * (b.w / b.h);
  const boxW = faceW * (GEO.box / b.w);

  if (ground) {
    ctx.save();
    ctx.fillStyle = ground;
    ctx.fillRect(x - h * 0.12, y - h * 0.12, faceW + h * 3.2, h + h * 0.24);
    ctx.restore();
  }

  drawFace(ctx, x - (b.x / GEO.box) * boxW, y - (b.y / GEO.box) * boxW, boxW, { color });

  const gap = h * 0.14;
  const size = h / 3.2;                        // three lines ≈ the face's height
  const block = drawLogotype(ctx, x + faceW + gap, y, size, { color });
  return { w: faceW + gap + block.w, h: Math.max(h, block.h) };
}

// ── the sticker sheet ────────────────────────────────────────────────────
// The one documented place the brand leaves black-and-magenta. It is a print
// run — badges, pins, vinyl — not a palette.
export function drawSheet(ctx, x, y, cols, r, gap, opts = {}) {
  const { sheet = SHEET, ground = null } = opts;
  const pitch = r * 2 + gap;
  if (ground) {
    const rows = Math.ceil(sheet.length / cols);
    ctx.save();
    ctx.fillStyle = ground;
    ctx.fillRect(x, y, cols * pitch - gap + gap, rows * pitch - gap + gap);
    ctx.restore();
  }
  sheet.forEach((s, i) => {
    const cx = x + (i % cols) * pitch + r;
    const cy = y + Math.floor(i / cols) * pitch + r;
    drawBadge(ctx, cx, cy, r, { ground: s.bg, ink: s.ink });
  });
  return {
    w: cols * pitch - gap,
    h: Math.ceil(sheet.length / cols) * pitch - gap,
  };
}

// ── the credit line ──────────────────────────────────────────────────────
// 美鳥十湖 — the artist, as they sign a business card. The kanji needs a CJK
// face; if the machine has none it renders as boxes, so callers that cannot
// risk that should use `artistRomaji`.
export function drawCredit(ctx, x, y, size, opts = {}) {
  const { color = TOKO.INK, kanji = true } = opts;
  ctx.save();
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${size * 0.42}px ${TYPE.family}`;
  ctx.fillText(VOICE.role, x, y);
  ctx.font = kanji
    ? `${size}px 'Hiragino Sans', 'Yu Gothic', 'Noto Sans JP', ${TYPE.family}`
    : font(size);
  ctx.fillText(kanji ? VOICE.artist : VOICE.artistRomaji, x, y + size * 1.15);
  ctx.font = `${size * 0.38}px ${TYPE.family}`;
  ctx.fillText(VOICE.artistRomaji, x, y + size * 1.72);
  ctx.restore();
}
