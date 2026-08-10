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
  // The whole locomotion chain is pinned by the belt, frame by frame, so that
  // stand → step → wind-up → run → halt → stand hands over without a sideways
  // pop anywhere in it. One averaged column per row is what put the pops there.
  // ONE frame. Row 0 is not three frames of breathing — it is the ABOUT-FACE,
  // ten frames of him rotating through front-on to the other side, and looping
  // its first three as an idle had him rocking his shoulders round and back
  // every ninety frames for no reason. Conrad stands still.
  stand: { row: 0, c0: 1, n: 1, ground: 44, hold: 60, loop: true, ax: 13.0 },
  // his walk is twelve frames: two steps of six, and they are not the same six
  step: { row: 1, c0: 1, n: 6, ground: 42, axs: [11.5, 17.5, 14.0, 13.0, 9.5, 7.0] },
  stepB: { row: 1, c0: 7, n: 6, ground: 42, axs: [9.5, 16.0, 13.0, 9.5, 8.0, 14.5] },
  // THE RUN, and the twenty frames need twenty anchors. One averaged column
  // for the row was what made it shudder: measured off the sheet his belt sits
  // anywhere from x=10.5 to x=19.5 and it zigzags four to six pixels between
  // ADJACENT frames, so on top of the 1.94px he really travels each frame he
  // was lurching forward and then backwards half a body-width. Seven frames in
  // twenty had him moving BACKWARDS. Pinning each frame by its own belt makes
  // the pelvis dead steady and lets the engine's constant speed do the moving,
  // which is what a run is.
  run: {
    row: 4, c0: 1, n: 20, ground: 44, hold: 1.1, loop: true,
    axs: [13.5, 18.0, 16.0, 19.5, 17.5, 13.5, 10.5, 15.5, 12.0, 17.0,
          13.5, 18.5, 15.0, 12.5, 17.0, 13.0, 10.5, 17.0, 13.5, 16.0],
  },

  // Grounded moves, where one anchor for the whole row is enough because his
  // feet are on the floor in every frame of it. The airborne ones — the two
  // jumps on rows 9 and 13, the hang on 25, the mantle on 39 — need a per-frame
  // anchor taken off the hip instead, or the sprite's own rise fights the
  // engine's, so they are not mapped yet.
  crouch: { row: 17, c0: 1, n: 4, ground: 46, ax: 16.6 },
  crouchLow: { row: 17, c0: 4, n: 2, ground: 46, ax: 16.6, hold: 40, loop: true },
  rise: { row: 17, c0: 11, n: 4, ground: 46, ax: 16.6 },
  roll: { row: 15, c0: 1, n: 22, ground: 47, ax: 20.6 },
  // Getting up off the floor, and being put on it. Both rows are cropped to
  // the TOP of their cells — a prone man is seven pixels tall and he is drawn
  // in the first seven rows — so one floor line for the row had him lying in
  // mid-air thirty-one pixels up. Each frame carries its own floor.
  wake: { row: 38, c0: 1, n: 15,
          axs: [14.0, 12.5, 13.0, 13.0, 13.0, 13.0, 13.0, 11.5, 12.0, 12.0, 12.5, 11.5, 9.5, 9.0, 6.0],
          grounds: [6, 6, 6, 7, 10, 13, 13, 16, 17, 17, 17, 23, 28, 34, 37] },
  // The death is the same, plus an arc: he is knocked off his feet and has to
  // come back down, and the rip cannot say so — every frame of it is cropped
  // to the corner. So the floor per frame is his own lowest pixel, lifted by a
  // hand-made throw that peaks a third of the way in.
  dead: { row: 31, c0: 1, n: 11,
          axs: [6.0, 12.0, 16.0, 17.5, 18.5, 19.0, 21.0, 21.0, 23.5, 18.5, 12.0],
          grounds: [45, 32, 29, 30, 30, 25, 23, 21, 13, 8, 9] },

  // Getting UP to a run and coming DOWN off one, and they are two different
  // rows. Row 5 starts him stood still with his feet together and winds him
  // forward frame by frame until he is in full running posture — that is the
  // wind-UP. Row 6 starts him leaning back hard with his arms flung out and
  // straightens him up until he is standing — that is the halt. The stop used
  // to play row 5, so letting go of the stick wound him up instead of down,
  // which is why it never settled.
  runStart: { row: 5, c0: 1, n: 12, ground: 38,
              axs: [3.5, 7.0, 5.5, 8.5, 10.5, 11.5, 9.5, 9.0, 9.5, 9.5, 9.5, 8.0] },
  skid: { row: 6, c0: 1, n: 12, ground: 47,
          axs: [15.5, 11.5, 15.0, 19.0, 14.5, 11.5, 20.0, 15.5, 15.0, 12.5, 11.0, 10.0] },

  // ── the pistol ─────────────────────────────────────────────────────
  // All Conrad's own, so no change of build the way the sword has: row 18 is
  // the draw, row 33 the aim and the shot standing, rows 20/21/30 the same
  // crouched. The recoil picks columns out of order — level, up, level — which
  // is what `cols` is for.
  drawGun: { row: 18, c0: 1, n: 16, ground: 47, ax: 21.0 },
  holsterGun: { row: 18, c0: 1, n: 16, ground: 47, ax: 21.0, rev: true },
  aim: { row: 33, cols: [1, 1], hold: 44, loop: true, ground: 37, ax: 15.0 },
  // the recoil throws the arm up and the whole figure sits differently in
  // each cell, so the shot needs both anchors per frame — it was sliding
  // eight pixels sideways and floating four every time he pulled it
  fire: { row: 33, cols: [3, 2, 1, 1, 1],
          axs: [7.0, 13.0, 15.0, 15.0, 15.0], grounds: [39, 39, 37, 37, 37] },
  crouchDraw: { row: 20, c0: 1, n: 6, ground: 47, ax: 20.2 },
  // Crouched, and it is row 21 — not row 30. Row 30 is a man STANDING with the
  // arm out and the knees flexed, which is what he was doing when you took him
  // to the floor and told him to shoot. Row 21 is the one where he is actually
  // down: pistol up by the ear, then extended level along the ground.
  crouchAim: { row: 21, cols: [6, 6], hold: 44, loop: true, ground: 47, ax: 18.0 },
  crouchFire: { row: 21, cols: [4, 5, 6, 6, 6], ground: 47, ax: 18.0 },

  // The standing jump: he gathers, drives up, and lands. Row 13 keeps his feet
  // down through the drive — the sheet has no free-flight frames for it — so
  // the extended frames carry the whole airborne phase while the engine's
  // ballistic y does the actual rising.
  gather: { row: 13, c0: 1, n: 5, ground: 47, ax: 16.1 },
  // THE FLIGHT of a standing jump, and it is row 14 — not row 13. Row 13 is
  // floor-registered from end to end: his feet are on cell row 47 in all
  // seventeen frames of it, because it is the crouch, the arm swing and the
  // rise onto his toes, and then the landing. It is what he does ON the
  // ground either side of a jump. Four of its frames were being used as the
  // flight and hung off the hip, so the jump was a man standing still and
  // reaching, floated up the screen by the engine.
  //
  // Row 14 is him actually off it: tucked at the launch, then extending, arms
  // up, into the reach that becomes a hang if there is a lip there.
  airUp: { row: 14, c0: 1, n: 7, air: true,
           anchors: [[22.5, 15], [15.0, 17], [10.0, 20], [9.5, 20], [9.0, 20], [10.0, 21], [10.0, 22]] },
  land: { row: 13, c0: 14, n: 4, ground: 47, ax: 12.8 },
  // A landing you do not walk away from. Row 32 is the whole fall — arms up,
  // impact, and then eight frames of sliding out flat — and its tail is the
  // part that happens once he is down. Top-cropped like the other prone rows,
  // so it carries a floor per frame.
  landHard: { row: 32, c0: 9, n: 7, ground: 47,
              axs: [17.5, 16.5, 24.5, 19.0, 20.5, 16.0, 15.5],
              grounds: [19, 15, 9, 7, 6, 6, 6] },

  // The running jump, which the sheet DOES have in full: a gather, the launch,
  // and a long tuck through the air.
  // Two frames, two floors: his ink ends at cell row 33 in the first and 36 in
  // the second, so one number for the row hovered him three pixels off the
  // ground on one of them — the last place you want a hover
  gatherRun: { row: 9, c0: 1, n: 2, axs: [8.0, 9.0], grounds: [33, 36] },
  airRun: {
    row: 9, c0: 3, n: 12, air: true,
    anchors: [[9.4, 15], [10.8, 15], [10.8, 16], [7.9, 17], [5, 18], [4.9, 18],
              [5, 19], [5, 19], [6.5, 21], [7.8, 20], [7.8, 20], [7.5, 18]],
  },
  // FALLING, which is its own row and not three frames borrowed out of the
  // middle of a running jump. Row 16: arms up, legs together, coming down.
  // Walking off a ledge used to play a man mid-leap with his knees tucked.
  fall: { row: 16, c0: 1, n: 4, air: true, loop: true, hold: 6,
          anchors: [[11.5, 20], [10.5, 23], [7.0, 21], [6.5, 21]] },

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
  // THE MANTLE, and it takes two rows. Row 39 — what this used to play — is a
  // hanging man SWINGING HIS LEGS, so going up a storey was a winch: he rose
  // twenty-four pixels without ever changing what his body was doing. The move
  // is on row 27 (hanging, hands above the cell) and row 26 (the fold: head
  // held still while the knees come up to the chest and then unfold into
  // standing). Played hang → fold → stand, with the anchor walking from his
  // hands at the lip to his feet on it, that is a man getting up onto a roof.
  mantle: { ledge: true,
            cells: [[27, 1], [27, 4], [26, 7], [26, 5], [26, 3], [26, 2], [26, 1]],
            anchors: [[5.5, 0], [9.5, 2], [5.5, 8], [5.5, 16], [5.5, 26], [4.5, 33], [2.5, 38]] },
  // lowering himself over an edge is the mantle run backwards, which is what
  // Flashback does too
  lower: { ledge: true, rev: true,
           cells: [[27, 1], [27, 4], [26, 7], [26, 5], [26, 3], [26, 2], [26, 1]],
           anchors: [[5.5, 0], [9.5, 2], [5.5, 8], [5.5, 16], [5.5, 26], [4.5, 33], [2.5, 38]] },

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
  // THE TURN — Conrad's own, and it was hiding under the standing frames the
  // whole time. Row 0 is ten frames of a full about-face: side-on, rotating
  // through FRONT-ON with both arms showing, then round to side-on the other
  // way. It used to come off the Prince of Persia sheet because the first
  // three frames of this row had been mapped as an idle and nobody looked at
  // the other seven.
  //
  // It plays UNFLIPPED for the whole move and the engine flips his facing at
  // the very end. Turning left-to-right you see the sheet as drawn; turning
  // right-to-left the mirror runs the same ten frames the other way round.
  // Flipping in the middle instead — which is what a `flipAt` there would do —
  // reverses the rotation halfway and he turns back into himself.
  turn: { row: 0, c0: 1, n: 10, ground: 44,
          axs: [13.0, 12.0, 11.5, 12.5, 11.5, 13.5, 14.5, 14.0, 12.5, 13.5] },

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
  return a.n ?? a.cols?.length ?? a.cells?.length ?? a.rects?.length ?? 0;
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
  const n = frameCount(anim);
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
    // `cells` is the fourth way in: [row, col] per frame, for a move that
    // does not live on one row of the sheet. The mantle is the reason —
    // the hang and the fold-up onto the ledge are two different rows.
    const cell = a.cells ? a.cells[j] : null;
    sx = (cell ? cell[1] : a.cols ? a.cols[j] : a.c0 + j) * CELL_W;
    sy = (cell ? cell[0] : a.row) * CELL_H;
    sw = CELL_W; sh = CELL_H;
    const anc = a.anchors ? a.anchors[j] : null;
    // `axs` is the third way: his feet are on the floor every frame, so the
    // vertical anchor is still the row's one floor line, but the column he
    // stands in moves and has to be given per frame.
    ax = a.axs ? a.axs[j] : anc ? anc[0] : a.ax;
    // ...and `grounds` is the vertical twin of it. Most rows on this rip are
    // drawn against a common floor line, so one `ground` for the row is right.
    // Some are not — the death and the getting-up are cropped to the top of
    // their cells, so a single number left him hanging thirty pixels in the
    // air — and those carry the floor per frame instead.
    ay = a.ledge ? anc[1] : a.grounds ? a.grounds[j] : anc ? anc[1] + HIP : a.ground;
  }
  if (flip) ax = sw - ax;
  scr.blit(img, sx, sy, sw, sh, Math.round(x - ax), Math.round(y - ay), flip);
  return true;
}
