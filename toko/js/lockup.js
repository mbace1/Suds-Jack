// TOKO MIDORI GAMES — the logotype and the lockups.
//
// The logotype is set, not drawn: a condensed squarish grotesque, tight, in
// three lines that stack almost solid. The face sits to its left. That pairing
// — face, gap, three lines, ™ — is the primary lockup and the thing that goes
// on a title screen, a cartridge, or a business card.
//
// THE REAL TYPEFACE IS NOT IN THIS REPO. It is the owner's licence, not ours to
// redistribute. Register it as the family `Toko Grotesk` (a @font-face rule, a
// local() lookup, anything at all) and every lockup here picks it up with no
// other change. Until that happens the stack falls through to whatever the
// machine already has and `substituted()` reports true, so a page can say so
// out loud instead of quietly shipping the wrong letterforms.

import { TOKO, TYPE, VOICE, SHEET } from './palette.js';
import { drawFace, drawBadge, bounds, GEO } from './face.js';

export const substituted = () => !TYPE.loaded();

function font(size) {
  return `${TYPE.weight} ${size}px ${TYPE.family}`;
}

// ── the logotype ─────────────────────────────────────────────────────────

// Three lines, flush left, stacked tight. Returns the block's measured size.
export function drawLogotype(ctx, x, y, size, opts = {}) {
  const { color = TOKO.INK, lines = VOICE.lines, tm = true, align = 'left' } = opts;
  const lh = size * TYPE.lineHeight;
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = font(size);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = align;

  let w = 0;
  lines.forEach((ln, i) => {
    ctx.letterSpacing = `${(TYPE.tracking * size).toFixed(2)}px`;
    ctx.fillText(ln, x, y + size + i * lh);
    w = Math.max(w, ctx.measureText(ln).width);
  });

  if (tm) {
    const s = size * 0.19;
    ctx.font = font(s);
    const last = ctx.measureText(lines[lines.length - 1]);
    ctx.font = font(size);
    const lastW = ctx.measureText(lines[lines.length - 1]).width;
    ctx.font = font(s);
    ctx.fillText(VOICE.tm, x + lastW + size * 0.06, y + size + (lines.length - 1) * lh);
    w = Math.max(w, lastW + size * 0.06 + last.width);
  }

  ctx.restore();
  return { w, h: size + (lines.length - 1) * lh };
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
  const size = h / 2.95;                       // three lines ≈ the face's height
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
