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
//
// Grounded animations anchor on the FLOOR: `ground` is the row's own floor, the
// rip not being aligned between rows, and `ax` is the column his hip rides on
// averaged over the animation, so he does not slide sideways between frames.
//
// Airborne ones cannot anchor there. A jump's cell carries its own rise, and
// pinning it to the floor would add that rise to the engine's ballistic one and
// send him up twice. So they anchor on the HIP instead, frame by frame —
// `anchors` is [hipX, hipY] per frame, measured off the sheet, and the sprite
// is placed so that hip sits twenty pixels above the engine's feet position,
// which is where his hip is when he stands.
export const ANIM = {
  stand: { row: 0, c0: 1, n: 3, ground: 44, ax: 13.9, hold: 30, loop: true },
  // his walk is twelve frames: two steps of six, and they are not the same six
  step: { row: 1, c0: 1, n: 6, ground: 42, ax: 13.0 },
  stepB: { row: 1, c0: 7, n: 6, ground: 42, ax: 13.0 },
  run: { row: 4, c0: 1, n: 20, ground: 44, ax: 16.1, hold: 1.1, loop: true },

  // Grounded moves, where one anchor for the whole row is enough because his
  // feet are on the floor in every frame of it. The airborne ones — the two
  // jumps on rows 9 and 13, the hang on 25, the mantle on 39 — need a per-frame
  // anchor taken off the hip instead, or the sprite's own rise fights the
  // engine's, so they are not mapped yet.
  crouch: { row: 17, c0: 1, n: 4, ground: 46, ax: 16.6 },
  crouchLow: { row: 17, c0: 4, n: 2, ground: 46, ax: 16.6, hold: 40, loop: true },
  rise: { row: 17, c0: 11, n: 4, ground: 46, ax: 16.6 },
  roll: { row: 15, c0: 1, n: 22, ground: 47, ax: 20.6 },
  wake: { row: 38, c0: 1, n: 15, ground: 37, ax: 12.7 },
  dead: { row: 31, c0: 1, n: 11, ground: 45, ax: 17.8 },

  // Coming to a halt out of a run.
  skid: { row: 5, c0: 1, n: 12, ground: 38, ax: 9.5 },

  // There is no about-face on this sheet. Row 18 looked like one — profile,
  // then something happening across the chest — and it is him DRAWING THE
  // PISTOL. Checked the rest: every wide-chested frame on the sheet is arms
  // flung out, being shot or throwing, never a man rotating. Flashback turns
  // Conrad instantly, so this game does too, and the gun draw is kept here for
  // the gallery rather than pretending to be a turn in the middle of a walk.
  drawGun: { row: 18, c0: 1, n: 16, ground: 47, ax: 21.2 },

  // The standing jump: he gathers, drives up, and lands. Row 13 keeps his feet
  // down through the drive — the sheet has no free-flight frames for it — so
  // the extended frames carry the whole airborne phase while the engine's
  // ballistic y does the actual rising.
  gather: { row: 13, c0: 1, n: 5, ground: 47, ax: 16.1 },
  airUp: { row: 13, c0: 6, n: 4, air: true, anchors: [[7.7, 26], [7, 26], [13.4, 26], [18.3, 24]] },
  land: { row: 13, c0: 14, n: 4, ground: 47, ax: 12.8 },

  // The running jump, which the sheet DOES have in full: a gather, the launch,
  // and a long tuck through the air.
  gatherRun: { row: 9, c0: 1, n: 2, ground: 36, ax: 9.7 },
  airRun: {
    row: 9, c0: 3, n: 12, air: true,
    anchors: [[9.4, 15], [10.8, 15], [10.8, 16], [7.9, 17], [5, 18], [4.9, 18],
              [5, 19], [5, 19], [6.5, 21], [7.8, 20], [7.8, 20], [7.5, 18]],
  },
  fall: { row: 9, c0: 11, n: 3, air: true, loop: true, hold: 6,
          anchors: [[6.5, 21], [7.8, 20], [7.8, 20]] },

  // The ledge. These anchor on the LIP — cell top on the ledge line — because
  // that is what the sheet draws them against: the whole vertical of a mantle
  // is in the frames themselves. Only the horizontal is cancelled out of them,
  // so the move's own carry does the sideways travel and he does not go twice.
  hang: { row: 25, c0: 6, n: 4, hold: 24, loop: true, lip: true,
          anchors: [[4.8, 25], [6.1, 24], [6.3, 24], [6.3, 24]] },
  mantle: { row: 39, c0: 4, n: 7, lip: true,
            anchors: [[4.9, 26], [11.7, 26], [14.7, 24], [17.1, 24], [19.9, 23], [16.9, 22], [15.6, 20]] },
  // lowering himself over an edge is the mantle run backwards, which is what
  // Flashback does too
  lower: { row: 39, c0: 4, n: 7, lip: true, rev: true,
           anchors: [[4.9, 26], [11.7, 26], [14.7, 24], [17.1, 24], [19.9, 23], [16.9, 22], [15.6, 20]] },
};

// where his hip sits above his feet when he is standing — the airborne anchor
const HIP = 20;

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
  const k = a.loop ? ((i % a.n) + a.n) % a.n : Math.max(0, Math.min(a.n - 1, i));
  const col = a.c0 + (a.rev ? a.n - 1 - k : k);
  const sx = col * CELL_W, sy = a.row * CELL_H;
  const hip = a.anchors ? a.anchors[a.rev ? a.n - 1 - k : k] : null;
  // he faces left on the sheet, so the anchor mirrors with him
  const ax = hip ? (face > 0 ? CELL_W - hip[0] : hip[0])
                 : (face > 0 ? CELL_W - a.ax : a.ax);
  const ay = a.lip ? 0 : hip ? hip[1] + HIP : a.ground;
  const dx = Math.round(x - ax), dy = Math.round(y - ay);
  scr.blit(sheet, sx, sy, CELL_W, CELL_H, dx, dy, face > 0);
  return true;
}
