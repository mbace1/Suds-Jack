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
// Left to right: floor, a two-tile gap to run at, more floor, and a ledge one
// storey up on the right — 48 pixels, which is a lip he can catch standing and
// clear comfortably out of a run.
const BENCH = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '..............######',
  '..............######',
  '..............######',
  '#####..#############',
  '#####..#############',
  '#####..#############',
];

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
      if (Math.abs(lipY - target) > 10) continue;
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
