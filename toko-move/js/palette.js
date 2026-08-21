// Toko Move — the paper the network is drawn on.
//
// A transit diagram is two kinds of ink: the LAND, which is quiet and almost
// not there, and the LINES, which are the loudest thing on the page. Keep that
// gap wide. Every colour here is either barely visible or fully committed;
// nothing sits in the middle, because a diagram with mid-tones reads as mud.

// HOMAGE, NOT A CLONE (owner's steer). The strongest divergences from the game
// this one descends from are FORM, not hue — the grab nub at a line's end, the
// riders shown along a train's roof, the queue as a block rather than a fan, and
// the ghosted passenger below. The palette is shifted too, and measured: closest
// pair of lines 98 apart where the old set was 90.
export const PAL = {
  paper: '#eee9dc',
  grain: 'rgba(27,34,40,0.05)',
  ink: '#1b2228',
  dim: '#566068',          // 5.30:1 on paper — AA for body text, and it has drifted before
  rule: '#d5cfc2',
  water: '#c3dbe8',
  waterEdge: '#a9cadd',
  station: '#faf7ee',
  warn: '#d8452f',         // the crowding ring: a graphic, not type
  warnText: '#b03018',     // the same alarm at 5.28:1, for anything with words in it
  train: '#2b333a',
  // somebody waiting for a shape no line reaches. Ghosted rather than recoloured
  // or refilled: the silhouette has to stay exactly what they want, or the mark
  // reads as a different destination — which is why filling over-capacity
  // passengers solid was tried and thrown away.
  stranded: '#9ba09f',
  // the car layer's ground. It is something you LAID, so it is a slab rather
  // than a stroke — but the first cut took "a shade off the paper" literally at
  // #ddd6c6, which is 1.19:1 against the ground and simply did not appear in a
  // screenshot. A road you cannot see is not a quiet road, it is no road. So:
  // warm tarmac, clear of the paper, and still light enough that a paper-filled
  // car and an ink-outlined building read on top of it.
  road: '#a29883',
  roadSeam: '#8b8271',
  roadLine: '#efe9da',     // the dashed centre stripe — what says "street" rather than "tile"


  // Handed out in this order, and a colour returns to the pile when its line
  // is torn up. Seven is deliberate: it is more lines than the board can
  // usefully hold, so running out of colours is never the thing that stops you.
  //
  // Red is in here, and the CROWDING RING IS NOT RED — it is ink. The first cut
  // had it the other way round and line one came out the same red as the alarm,
  // so a healthy line read as a warning. Trying to solve that by banning red
  // from the palette only pushed the collision onto orange; the real answer is
  // that the alarm should never have been competing on hue at all. A closing
  // dark ring cannot be confused with any line, whatever colours get added.
  // Amber and orange sat 50 apart and read as one colour two stops in; the
  // seventh slot was picked by measuring candidates against the other six
  // rather than by eye.
  lines: ['#2b5fa8', '#d0452b', '#4a8f3f', '#d19a1f', '#7a4aa6', '#b93a86', '#18908a'],
};

// Hit targets, stated in SCREEN pixels and converted to board units at the
// current scale — the opposite of everything above, and deliberately.
//
// A radius fixed in board units is a target that shrinks with the window: the
// end-of-line nub measured 46px on a 1200px desktop and 17px on a 390px phone,
// so on touch there was no way to shorten or delete a line at all. What has to
// stay constant is the size under the finger, not the size on the board.
export const TOUCH = {
  nubGapPx: 21,       // from the stop's edge to the middle of its nub
  nubHitPx: 46,       // grab diameter, comfortably over the 44px floor
  stationHitPx: 50,
  nubDrawPx: 7.5,     // drawn radius — visible on a phone, discreet on a desktop

  // DRAWING floors, also in screen pixels. Below these the board stops being
  // readable rather than merely small: on a portrait phone a stop drew at 7px
  // across and a waiting shape at 2px, which is a diagram nobody can play.
  minStationRPx: 11,
  minSpecialRPx: 12.5,
  minPipRPx: 3.4,
};

// Stroke weights, in board units. The line is thicker than the station outline
// on purpose — the network is the subject and the stops are punctuation.
export const INK = {
  line: 9,
  lineGap: 11.5,    // how far apart two lines sharing a leg are pushed
  station: 3.6,
  stationR: 15.5,
  specialR: 18,
  pipR: 4.4,        // a waiting passenger
};

// What the furniture is actually drawn at, for a given zoom: the declared
// board-unit size, or the screen floor, whichever is bigger. It lives in one
// place because the renderer draws these AND the nub has to stand off them —
// two copies of this would drift and the nub would sit on the stop.
export const sizeAt = scale => ({
  stationR: Math.max(INK.stationR, TOUCH.minStationRPx / scale),
  specialR: Math.max(INK.specialR, TOUCH.minSpecialRPx / scale),
  pipR: Math.max(INK.pipR, TOUCH.minPipRPx / scale),
});
