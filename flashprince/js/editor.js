// The room editor.
//
// A room is twenty by twelve characters of ASCII and always has been, which
// makes it the rare data format that is already an editor's document — there
// is nothing to serialise, nothing to parse back, and a room you build here is
// a room you can paste into `rooms.js` by hand if you want to.
//
// It is deliberately a PLAIN editor. No layers, no undo tree, no snapping, no
// preview of what the biome will do to it. You lay out the shape of a screen —
// where the floor is, where the gap is, what is standing on it — and the
// thematics are applied afterwards by whichever biome the room sits in. That
// separation is the point: the same twenty by twelve grid is a jungle clearing
// or a reactor floor depending on one number, so the editor has no business
// knowing which.
//
// Everything is kept in localStorage under one key, so a room survives a
// refresh, and `dump()` prints the room as the exact array literal `rooms.js`
// wants.

const KEY = 'flashPrinceRooms';

// The brushes, in the order they appear in the strip. The character IS the
// data — see the legend at the top of rooms.js — so this table is only here to
// give each one a name and a swatch you can recognise at 8px.
export const BRUSHES = [
  { ch: ' ', name: 'AIR' },
  { ch: '#', name: 'SOLID' },
  { ch: '-', name: 'WALL' },
  { ch: '~', name: 'LOOSE' },
  { ch: '^', name: 'SPIKES' },
  { ch: 'C', name: 'SLAB' },
  { ch: '|', name: 'GATE' },
  { ch: 'p', name: 'PLATE' },
  { ch: 'f', name: 'FIELD' },
  { ch: 'T', name: 'LIGHT' },
  { ch: 'S', name: 'START' },
  { ch: 'D', name: 'DOOR' },
  { ch: 'G', name: 'PISTOL' },
  { ch: 'B', name: 'BLADE' },
  { ch: 'h', name: 'FLASK' },
  { ch: 's', name: 'SWORDSMAN' },
  { ch: 'g', name: 'SENTRY' },
  { ch: 'b', name: 'BEAST' },
  { ch: 'd', name: 'DRONE' },
];

// Characters there can only be one of in a room. Painting a second start point
// takes the first one away rather than leaving two and letting the loader pick.
const UNIQUE = 'SD';

export class Editor {
  constructor(scr) {
    this.scr = scr;
    this.brush = 1;                    // SOLID, the one you want nine times out of ten
    this.cursor = { tx: 10, ty: 6 };
    this.painting = 0;                 // 0 none, 1 paint, -1 erase
    this.edits = this.load();
  }

  load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }

  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.edits)); } catch { /* private mode */ }
  }

  // The edited version of a room if there is one, otherwise nothing — the
  // loader falls back to what is in rooms.js, so an untouched room stays
  // untouched and deleting the storage puts everything back.
  mapFor(i) { return this.edits[i] ?? null; }

  // Take a copy of whatever is on screen now so there is something to edit.
  begin(world) {
    this.rows = (this.edits[world.index] ?? world.room.map).map(r => r.padEnd(20, ' ').slice(0, 20));
    this.index = world.index;
  }

  set(tx, ty, ch) {
    if (tx < 0 || tx > 19 || ty < 0 || ty > 11) return;
    if (UNIQUE.includes(ch)) {
      this.rows = this.rows.map(r => r.replace(new RegExp(ch, 'g'), ' '));
    }
    const r = this.rows[ty];
    this.rows[ty] = r.slice(0, tx) + ch + r.slice(tx + 1);
  }

  at(tx, ty) { return this.rows[ty]?.[tx] ?? ' '; }

  // Painting is held-down, because laying a floor one click at a time is how
  // an editor stops being used.
  paintAt(tx, ty) {
    if (!this.painting) return;
    this.set(tx, ty, this.painting > 0 ? BRUSHES[this.brush].ch : ' ');
  }

  commit(world) {
    this.edits[this.index] = this.rows.slice();
    this.save();
    world.load(this.index, 1);
  }

  revert(world) {
    delete this.edits[this.index];
    this.save();
    world.load(this.index, 1);
    this.begin(world);
  }

  // The room as `rooms.js` wants it, ready to paste. Printed rather than
  // downloaded: a room is twelve short lines and the console is where the
  // person doing this already is.
  dump() {
    const body = this.rows.map(r => `      '${r}',`).join('\n');
    const text = `    map: [\n${body}\n    ],`;
    console.log(text);
    return text;
  }
}
