// The bench: a floor with a gap in it and one ledge to get onto.
//
// Not a level — there is no room here, nothing to reach and nothing to kill
// you. It exists so the moves that need geometry have geometry to happen
// against: you cannot judge a running jump on flat ground, and you cannot judge
// a hang or a mantle at all without a lip to catch.
//
// The tile queries are the level's own, kept because they are what the move set
// asks the world, minus everything about rooms, traps and doors.

import { HANG } from './hero.js';

export const TILE = 16;

// 20 x 12 tiles = the whole 320x192 picture.
//   #  solid
//   .  air
// Left to right: a hundred and forty pixels of floor to get up to speed on, a
// two-tile gap to run at, more floor, and a ledge on the right SIXTY-FOUR
// pixels up. Not forty-eight: his hands reach forty-six above his feet, so
// hanging off a one-storey lip his boots are two pixels off the floor and it
// reads as a man standing up and stretching rather than as a man hanging. At
// sixty-four he dangles. The run-up matters too — with the gap close to where
// he starts, the first thing anyone does is walk off into it.
const BENCH = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '..............######',
  '..............######',
  '..............######',
  '..............######',
  '#########..#########',
  '#########..#########',
  '#########..#########',
];

// A post to hit. There is nothing on the bench that can be struck, so the
// sword has no reach and no timing you can feel — the swing lands on a frame
// in the middle of the animation (`hitAt`) and that is the whole point of it,
// but not if the air is all there is. Wood, waist-high, and it rocks.
export class Post {
  constructor(x, y) { this.x = x; this.y = y; this.lean = 0; this.flash = 0; }

  // struck at `sx`: true if the edge reached, and the post takes it
  hit(sx, face) {
    if (Math.abs(sx - this.x) > 9) return false;
    this.lean = 6 * face; this.flash = 5;
    return true;
  }

  update() {
    this.lean *= 0.86;                       // it rocks back upright
    if (Math.abs(this.lean) < 0.05) this.lean = 0;
    if (this.flash > 0) this.flash--;
  }

  draw(scr, C) {
    const k = this.lean;
    const top = this.y - 34, mid = this.y - 17;
    const c = this.flash > 0 ? C.LUX : C.NEAR;
    // one leaning quad for the shaft, a crossbar, and a shadow at the foot
    scr.poly([this.x - 3, this.y, this.x + 3, this.y,
              this.x + 3 + k, top, this.x - 3 + k, top], c);
    scr.poly([this.x - 8 + k * 0.5, mid - 1, this.x + 8 + k * 0.5, mid - 1,
              this.x + 8 + k * 0.5, mid + 2, this.x - 8 + k * 0.5, mid + 2],
             this.flash > 0 ? C.LUX2 : C.EDGE);
    scr.rect(this.x - 5, this.y - 1, 10, 1, C.DARK);
  }
}

export class Bench {
  constructor() { this.rows = BENCH; }

  tile(tx, ty) {
    if (ty < 0 || ty >= this.rows.length) return '.';
    if (tx < 0 || tx >= this.rows[ty].length) return '.';
    return this.rows[ty][tx];
  }

  solidTile(tx, ty) { return this.tile(tx, ty) === '#'; }

  boxSolid(x, y, w, h) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 1) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) if (this.solidTile(tx, ty)) return true;
    }
    return false;
  }

  // A lip he can catch on the way past it, going up or coming down. `target`
  // is where his hands are, which is HANG above his feet.
  ledgeAhead(x, y, face) {
    const tx = Math.floor((x + face * 7) / TILE);
    const target = y - HANG;
    for (let ty = Math.floor((target - 11) / TILE); ty <= Math.floor((target + 11) / TILE); ty++) {
      if (!this.solidTile(tx, ty) || this.solidTile(tx, ty - 1)) continue;
      if (this.solidTile(tx - face, ty)) continue;      // a wall face, not a corner
      const lipY = ty * TILE;
      // Fourteen, not ten. A jump rises 27px and his hands reach 46, so at a
      // 64px lip the window a ten-pixel tolerance leaves open is a single
      // frame at the very apex — which in practice means he never catches it.
      if (Math.abs(lipY - target) > 14) continue;
      const hx = tx * TILE + (face > 0 ? -5 : TILE + 5);
      if (this.boxSolid(hx - 4, lipY + 3, 8, 22)) continue;
      return { x: hx, y: lipY, face };
    }
    return null;
  }

  // The lip he has just walked off the end of. Flashback's rule: step off an
  // edge and you catch it rather than fall.
  ledgeBehind(x, y, face) {
    const tx = Math.floor((x - face * 7) / TILE);
    const ty = Math.floor((y + 2) / TILE);
    if (!this.solidTile(tx, ty) || this.solidTile(tx, ty - 1)) return null;
    const lipY = ty * TILE;
    if (Math.abs(lipY - y) > 6) return null;
    const edge = face > 0 ? (tx + 1) * TILE : tx * TILE;
    const hx = edge + face * 5;
    if (this.boxSolid(hx - 4, lipY + 3, 8, 22)) return null;
    return { x: hx, y: lipY, face: -face };
  }

  // The same edge found BEFORE the mistake: he kneels and lets himself over it.
  lipAhead(x, y, face) {
    const ty = Math.round(y / TILE);
    const here = Math.floor(x / TILE);
    if (!this.solidTile(here, ty)) return null;
    if (this.solidTile(here + face, ty)) return null;
    const edge = face > 0 ? (here + 1) * TILE : here * TILE;
    if (Math.abs(x - edge) > 14) return null;          // he has to be AT it
    const hx = edge + face * 5;
    const lipY = ty * TILE;
    if (this.boxSolid(hx - 4, lipY + 3, 8, 22)) return null;
    return { x: hx, y: lipY, face: -face };
  }

  // Nothing on the bench is knee-high, so nothing is stepped onto: every ledge
  // here is a storey, which is the whole point of putting one in.
  stepUpAhead() { return null; }

  // ── drawing ────────────────────────────────────────────────────────
  // Flat masses and one lit edge. It is scaffolding, not scenery — anything
  // more here competes with the man for the eye, and he is the work.
  draw(scr, C) {
    for (let ty = 0; ty < this.rows.length; ty++) {
      for (let tx = 0; tx < this.rows[ty].length; tx++) {
        if (!this.solidTile(tx, ty)) continue;
        const x = tx * TILE, y = ty * TILE;
        scr.rect(x, y, TILE, TILE, this.solidTile(tx, ty - 1) ? C.NEAR : C.SOLID);
        if (!this.solidTile(tx, ty - 1)) scr.rect(x, y, TILE, 1, C.EDGE);
        // a mark on every other block, so a run has something to be measured
        // against — a blank band reads as a treadmill
        if (!this.solidTile(tx, ty - 1) && tx % 2 === 0) scr.rect(x + 3, y + 5, 9, 1, C.MID);
      }
    }
  }
}
