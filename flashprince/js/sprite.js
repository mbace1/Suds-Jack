// Conrad, blitted.
//
// The rest of this game has no image assets in it — a man is thirteen joint
// angles turned into filled polygons, the Another World way. That gets you his
// pose, his proportions and his timing, and it will never get you his pixels:
// the flare of the jacket, the shape of the hair, the placement of a highlight.
// So for the hero the polygons are set aside and the frames themselves are
// drawn, cut straight out of the SNES sheet in ref/conrad.png.
//
// The sheet is a clean 32×48 grid. Black is never one of his fourteen colours,
// so black is the cell background and keys out cleanly; the whole sheet is
// prepared once into a canvas with that black made transparent, and after that
// a frame is one drawImage.
//
// Two things keep it exact. Nothing is ever drawn at a fractional position or
// scaled, and the framebuffer's sixteen-colour quantise pass is taught his
// fourteen colours as fixed points (see Screen.keepColours) so it maps them to
// themselves and leaves him alone while it snaps the world around him. He faces
// LEFT on the sheet, so the flip is on face 1, not face -1.

export const CELL_W = 32, CELL_H = 48;
const SRC = 'ref/conrad.png';

// His fourteen. The quantiser is handed these so his pixels survive it.
export const CONRAD_COLOURS = [
  '#8484f7', '#7373e7', '#6363c6', '#5252b5', '#4242a5',   // jeans, lit to shade
  '#634210', '#633100', '#946331', '#735221',              // the jacket
  '#c67363',                                                // skin
  '#848484', '#c6c6c6',                                     // the shoes
  '#b52152', '#941042',                                     // the shirt
];

// Where an animation lives on the sheet, and where the man stands inside a cell.
// `ground` is the row's own floor — the rip is not aligned between rows — and
// `ax` is the column his hip rides on, averaged over the animation, so he does
// not slide sideways when the frames change.
export const ANIM = {
  stand: { row: 0, c0: 1, n: 3, ground: 44, ax: 13.9, hold: 30, loop: true },
  // his walk is twelve frames: two steps of six, and they are not the same six
  step: { row: 1, c0: 1, n: 6, ground: 42, ax: 13.0 },
  stepB: { row: 1, c0: 7, n: 6, ground: 42, ax: 13.0 },
  run: { row: 4, c0: 1, n: 20, ground: 44, ax: 16.1, hold: 1.1, loop: true },
};

let sheet = null;

export function loadSheet(onReady) {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingEnabled = false;
    x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height);
    const px = new Uint32Array(d.data.buffer);
    for (let i = 0; i < px.length; i++) {
      // black is the cell background and nothing else — none of his fourteen
      // colours is black, so this cannot punch a hole in him
      if ((px[i] & 0x00ffffff) === 0) px[i] = 0;
    }
    x.putImageData(d, 0, 0);
    sheet = c;
    onReady?.();
  };
  img.src = SRC;
  return img;
}

export const ready = () => !!sheet;

// Draw frame `i` of `anim` with his feet at (x, y) in picture pixels. Whole
// pixels only: a half-pixel offset would resample him and he would stop being
// his own artwork.
export function drawSprite(scr, anim, i, x, y, face) {
  if (!sheet) return false;
  const a = ANIM[anim];
  if (!a) return false;
  const col = a.c0 + (a.loop ? ((i % a.n) + a.n) % a.n : Math.max(0, Math.min(a.n - 1, i)));
  const sx = col * CELL_W, sy = a.row * CELL_H;
  // he faces left on the sheet, so the anchor mirrors with him
  const ax = face > 0 ? CELL_W - a.ax : a.ax;
  const dx = Math.round(x - ax), dy = Math.round(y - a.ground);
  scr.blit(sheet, sx, sy, CELL_W, CELL_H, dx, dy, face > 0);
  return true;
}
