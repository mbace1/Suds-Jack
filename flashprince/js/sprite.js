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
const SRC = 'ref/jimbo.png';
const SWORD_SRC = 'ref/pop-jimbo.png';

// Jimbo's eighteen. The quantiser is handed these so his pixels survive it.
//
// He is Conrad's frames repainted (ref/recolour.py): brown trousers, a white
// tee, a dark letterman jacket, and the hair left brown by picking it out of
// the head region — hair and jacket share a colour on the original sheet, so
// that one had to be split by WHERE it is rather than by what it is.
export const JIMBO_COLOURS = [
  '#1f2333',
  '#2a2e40',
  '#31364a',
  '#3c4258',
  '#4f3a22',
  '#61482b',
  '#633100',
  '#634210',
  '#735221',
  '#745735',
  '#848484',
  '#88673f',
  '#946331',
  '#9a764a',
  '#bcc2ce',
  '#c67363',
  '#c6c6c6',
  '#e2e6ec',
];

// the old name, still exported so nothing that reads it breaks
export const CONRAD_COLOURS = JIMBO_COLOURS;

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

  // ── the pistol ─────────────────────────────────────────────────────
  // All Conrad's own, so no change of build the way the sword has: row 18 is
  // the draw, row 33 the aim and the shot standing, rows 20/21/30 the same
  // crouched. The recoil picks columns out of order — level, up, level — which
  // is what `cols` is for.
  drawGun: { row: 18, c0: 1, n: 16, ground: 47, ax: 21.0 },
  holsterGun: { row: 18, c0: 1, n: 16, ground: 47, ax: 21.0, rev: true },
  aim: { row: 33, cols: [1, 1], hold: 44, loop: true, ground: 41, ax: 8.5 },
  fire: { row: 33, cols: [3, 2, 1, 1, 1], ground: 41, ax: 8.5 },
  crouchDraw: { row: 20, c0: 1, n: 6, ground: 47, ax: 20.2 },
  crouchAim: { row: 30, cols: [2, 2], hold: 44, loop: true, ground: 34, ax: 16.0 },
  crouchFire: { row: 30, cols: [3, 2, 1, 1, 1], ground: 34, ax: 16.0 },

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

  // ── the ledge ──────────────────────────────────────────────────────
  // The LIP is the fixed thing in these, and what rests on it MOVES. At the
  // start of a mantle his hands are on it and his body hangs the full length
  // below; at the end his feet are on it and all of him is above. Neither a
  // cell-top anchor nor a hip anchor can say that: the first pins his head to
  // the ledge for the whole second half and he never gets up, the second puts
  // his hip where his feet would be if he were standing, which mid-mantle he
  // is not. So `ledge` anchors take the support point straight — walked from
  // the cell's top to its bottom across the move — and are drawn at the lip.
  hang: { row: 25, c0: 6, n: 4, hold: 24, loop: true, ledge: true,
          anchors: [[4.8, 0], [6.1, 0], [6.3, 0], [6.3, 0]] },
  mantle: { row: 39, c0: 4, n: 7, ledge: true,
            anchors: [[4.9, 0], [11.7, 8], [14.7, 14], [17.1, 19], [19.9, 21], [16.9, 23], [15.6, 24]] },
  // lowering himself over an edge is the mantle run backwards, which is what
  // Flashback does too
  lower: { row: 39, c0: 4, n: 7, ledge: true, rev: true,
           anchors: [[4.9, 0], [11.7, 8], [14.7, 14], [17.1, 19], [19.9, 21], [16.9, 23], [15.6, 24]] },

  // ── the sword ──────────────────────────────────────────────────────
  // Off the OTHER sheet. Flashback has no sword in it at all, so these are the
  // Prince of Persia frames, repainted the same way (ref/recolour_pop.py). His
  // figure is 40px against Conrad's 38, near enough to stand next to him.
  //
  // The repaint is not a palette swap. The instruction was to fit JIMBO onto
  // the Prince's animation rather than let a second character walk on when the
  // blade comes out, so the Prince is given Jimbo's white shoes, his white tee
  // under an open jacket, and grey sleeves — the Prince is bare-armed and
  // barefoot, so the skin on him IS the sleeve and IS the boot, which is the
  // split Conrad's own sheet can never offer. Every colour it paints is one of
  // the eighteen above, or the quantiser would not keep it.
  //
  // That rip is hand-laid rather than a grid, so every frame carries its own
  // source rect: [x, y, w, h, anchorX, anchorY] in sheet pixels. The anchor is
  // the REAR foot — he faces right on this sheet, and in a lunge the rear foot
  // is the planted one, so anchoring on the body's centre would drag him
  // backwards as he reached. `faces: 1` because that sheet faces the other way
  // from Conrad's: the flip is on face -1 here, not face 1.
  swordDraw: {
    sheet: 'sword', faces: 1,
    rects: [[0,216,15,39,3,254], [17,217,16,38,20,254], [35,217,24,38,43,254],
            [61,212,25,43,66,254], [88,218,33,37,91,254]],
  },
  swordSheathe: {
    sheet: 'sword', faces: 1, rev: true,
    rects: [[0,216,15,39,3,254], [17,217,16,38,20,254], [35,217,24,38,43,254],
            [61,212,25,43,66,254], [88,218,33,37,91,254]],
  },
  swordGuard: {
    sheet: 'sword', faces: 1, hold: 26, loop: true,
    rects: [[0,322,29,37,3,358], [31,325,24,34,34,358], [69,322,36,37,72,358],
            [107,316,41,43,110,358]],
  },
  swordAdvance: {
    sheet: 'sword', faces: 1,
    rects: [[0,270,29,37,3,306], [31,270,36,37,34,306], [69,273,24,34,72,306],
            [107,269,35,38,110,306]],
  },
  swordRetreat: {
    sheet: 'sword', faces: 1, rev: true,
    rects: [[0,270,29,37,3,306], [31,270,36,37,34,306], [69,273,24,34,72,306],
            [107,269,35,38,110,306]],
  },
  // the lunge: guard, extend, and the deep one where the blade is furthest out
  swordLunge: {
    sheet: 'sword', faces: 1,
    rects: [[107,269,35,38,110,306], [144,272,41,35,147,306], [187,276,66,30,190,306],
            [255,274,41,32,258,306], [298,269,32,37,301,306]],
  },
  // overhead, then the thrust, then back to the stance
  swordStrike: {
    sheet: 'sword', faces: 1,
    rects: [[0,155,26,48,3,202], [28,155,25,48,31,202], [55,159,29,44,59,202],
            [86,165,36,38,89,202], [124,164,40,39,127,202], [166,164,34,39,169,202],
            [202,164,26,39,205,202], [230,165,24,38,234,202], [256,165,21,38,260,202]],
  },
  // THE TURN, and it comes off this sheet because Conrad's has none — checked
  // every row of it. Six frames, and the chest goes 8px wide to 18 and back,
  // which is a man rotating through front-on and the only shape that is.
  //
  // Played REVERSED with the facing flipped on frame one, so the mirror the
  // engine already applies runs it the right way round: mirrored last frame is
  // the profile he starts in, mirrored first frame is the one he ends in.
  // Anchored on his CENTRE rather than the rear foot — he pivots on the spot.
  turn: {
    sheet: 'sword', faces: 1, rev: true,
    rects: [[0,606,10,39,5,644], [12,605,14,40,19,644], [28,605,18,40,37,644],
            [48,606,18,39,57,644], [68,606,12,39,74,644], [82,605,10,40,87,644]],
  },

  swordParry: {
    sheet: 'sword', faces: 1,
    rects: [[69,322,36,37,72,358], [107,316,41,43,110,358], [69,322,36,37,72,358]],
  },
};

// How many frames an animation has. Three of the four ways of laying one out
// count differently — a grid run says `n`, a hand-picked column order says
// `cols`, and the sword's own source rects say `rects` — so anything that
// needs the length asks here rather than reading `n` and getting undefined.
export function frameCount(anim) {
  const a = ANIM[anim];
  if (!a) return 0;
  return a.n ?? a.cols?.length ?? a.rects?.length ?? 0;
}

// where his hip sits above his feet when he is standing — the airborne anchor
const HIP = 20;

const sheets = {};

function prepare(src, key, onReady) {
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
    sheets[key] = c;
    onReady?.();
  };
  img.src = src;
  return img;
}

export function loadSheet(onReady) {
  prepare(SRC, 'body', onReady);
  prepare(SWORD_SRC, 'sword');
}

export const ready = () => !!sheets.body;

// Draw frame `i` of `anim` with his feet at (x, y) in picture pixels. Whole
// pixels only: a half-pixel offset would resample him and he would stop being
// his own artwork.
export function drawSprite(scr, anim, i, x, y, face) {
  const a = ANIM[anim];
  if (!a) return false;
  const img = sheets[a.sheet ?? 'body'];
  if (!img) return false;
  const n = a.n ?? a.cols?.length ?? a.rects.length;
  const k = a.loop ? ((i % n) + n) % n : Math.max(0, Math.min(n - 1, i));
  const j = a.rev ? n - 1 - k : k;
  // the sheet's own facing: Conrad's frames face left, the sword sheet's right
  const flip = (a.faces ?? -1) < 0 ? face > 0 : face < 0;

  let sx, sy, sw, sh, ax, ay;
  if (a.rects) {
    const r = a.rects[j];
    [sx, sy, sw, sh] = r;
    ax = r[4] - r[0];                       // the anchor, inside its own rect
    ay = r[5] - r[1];
  } else {
    sx = (a.cols ? a.cols[j] : a.c0 + j) * CELL_W; sy = a.row * CELL_H;
    sw = CELL_W; sh = CELL_H;
    const anc = a.anchors ? a.anchors[j] : null;
    ax = anc ? anc[0] : a.ax;
    ay = a.ledge ? anc[1] : anc ? anc[1] + HIP : a.ground;
  }
  if (flip) ax = sw - ax;
  scr.blit(img, sx, sy, sw, sh, Math.round(x - ax), Math.round(y - ay), flip);
  return true;
}
