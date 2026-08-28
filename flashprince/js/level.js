// The world: a grid you cannot see, and the polygons drawn over it.
//
// Collision is tiles, because tiles are what a commitment-based move set needs
// — a jump has to clear a KNOWN distance or the whole contract breaks. But
// nothing on screen is drawn per tile. The grid is turned into masses: one flat
// fill for the rock, one lit band along every surface you could stand on, one
// dark band under every overhang, and a seeded row of lumps along the top so
// the silhouette is not a ruler. Same shapes, biome by biome; only the sixteen
// colours underneath them change.

import { ROOMS, RW, RH, TILE, ROOM_W, ROOM_H } from './rooms.js?v=52';
import { C } from './palette.js?v=52';
import { glyphs, weights, drape, leaves, halo } from './scenery.js?v=52';

const SOLIDS = '#~^';
const rand = s => () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;

// how the traps breathe. Shared per room so a screen has one rhythm to read.
const SPIKE_CYCLE = 190, SPIKE_UP = 78, SPIKE_MOVE = 12;
const CHOMP_CYCLE = 150, CHOMP_FALL = 9, CHOMP_HOLD = 18, CHOMP_RISE = 34;
const FIELD_CYCLE = 170, FIELD_ON = 100;
const LOOSE_HOLD = 26;
const GATE_OPEN = 230;

export class World {
  constructor() { this.load(0); }

  // `override` is the editor's copy of this room if it has one. The room in
  // rooms.js is left alone either way — an edit is a layer over the top of it,
  // never a rewrite of it, which is what makes reverting a room free.
  load(i, entryFace = 1, override = null) {
    this.index = Math.max(0, Math.min(ROOMS.length - 1, i));
    this.room = ROOMS[this.index];
    const map = override ?? this.room.map;
    this.grid = map.map(r => r.split(''));
    this.spawn = null; this.door = null;
    this.pickups = []; this.spawns = [];
    this.spikes = []; this.chompers = []; this.loose = new Map();
    this.gates = []; this.plates = []; this.fields = []; this.lights = [];
    this.gateT = 0; this.clock = 0;
    this.entryFace = entryFace;

    for (let ty = 0; ty < RH; ty++) {
      for (let tx = 0; tx < RW; tx++) {
        const ch = this.grid[ty][tx];
        const x = tx * TILE + TILE / 2, y = ty * TILE;
        if (ch === 'S') { this.spawn = { x, y: y + TILE }; this.grid[ty][tx] = ' '; }
        else if (ch === 'D') { this.door = { x, y: y + TILE, tx, ty }; this.grid[ty][tx] = ' '; }
        else if (ch === 'G') { this.pickups.push({ kind: 'gun', x, y: y + TILE - 6 }); this.grid[ty][tx] = ' '; }
        else if (ch === 'h') { this.pickups.push({ kind: 'cell', x, y: y + TILE - 6 }); this.grid[ty][tx] = ' '; }
        else if (ch === 'B') { this.pickups.push({ kind: 'sword', x, y: y + TILE - 6 }); this.grid[ty][tx] = ' '; }
        else if ('bgds'.includes(ch)) { this.spawns.push({ kind: ch, x, y: y + TILE }); this.grid[ty][tx] = ' '; }
        else if (ch === 'T') { this.lights.push({ x, y: y + 8 }); this.grid[ty][tx] = '-'; }
        else if (ch === '^') this.spikes.push({ tx, ty });
        else if (ch === 'C') { this.chompers.push({ tx, ty, phase: (tx * 47) % CHOMP_CYCLE, reach: this.shaft(tx, ty) }); this.grid[ty][tx] = ' '; }
        else if (ch === '~') this.loose.set(`${tx},${ty}`, { tx, ty, t: -1 });
        else if (ch === '|') this.gates.push({ tx, ty });
        else if (ch === 'p') this.plates.push({ tx, ty, down: false });
        else if (ch === 'f') this.fields.push({ tx, ty });
      }
    }
    this.seed = 1000 + this.index * 7919;
  }

  // how far a ceiling slab can fall before it hits something
  shaft(tx, ty) {
    for (let y = ty + 1; y < RH; y++) if (SOLIDS.includes(this.grid[y][tx])) return y * TILE;
    return ROOM_H;
  }

  tile(tx, ty) {
    if (tx < 0 || tx >= RW || ty < 0 || ty >= RH) return ' ';
    return this.grid[ty][tx];
  }

  solidTile(tx, ty) {
    const ch = this.tile(tx, ty);
    if (ch === '|') return this.gateT <= 0;
    if (ch === '~') { const l = this.loose.get(`${tx},${ty}`); return !l || l.t < LOOSE_HOLD; }
    if (ch === 'p') return true;
    return SOLIDS.includes(ch);
  }

  boxSolid(x, y, w, h) {
    const x0 = Math.floor(x / TILE), x1 = Math.floor((x + w - 1) / TILE);
    const y0 = Math.floor(y / TILE), y1 = Math.floor((y + h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) if (this.solidTile(tx, ty)) return true;
    }
    return false;
  }

  // ── ledges ─────────────────────────────────────────────────────────
  // A lip is the top corner of a solid tile with sky above it and nothing on
  // the side he is coming from. Everything about how these games move is built
  // on finding one of these in the air and stopping dead.
  ledgeAhead(x, y, face) {
    const tx = Math.floor((x + face * 7) / TILE);
    const target = y - 26;                          // where his hands are
    for (let ty = Math.floor((target - 11) / TILE); ty <= Math.floor((target + 11) / TILE); ty++) {
      if (!this.solidTile(tx, ty) || this.solidTile(tx, ty - 1)) continue;
      if (this.solidTile(tx - face, ty)) continue;  // it is a wall face, not a corner
      const lipY = ty * TILE;
      if (Math.abs(lipY - target) > 10) continue;
      const hx = tx * TILE + (face > 0 ? -5 : TILE + 5);
      if (this.boxSolid(hx - 4, lipY + 3, 8, 22)) continue;
      return { x: hx, y: lipY, face };
    }
    return null;
  }

  // Something a foot high directly ahead: one tile, with sky above it. Prince
  // of Persia steps onto these rather than making you hang off them, and the
  // difference matters — a move set that dangles you from a kerb is comic.
  stepUpAhead(x, y, face) {
    const tx = Math.floor((x + face * 10) / TILE);
    const ty = Math.round(y / TILE) - 1;
    if (ty < 1) return null;
    if (!this.solidTile(tx, ty) || this.solidTile(tx, ty - 1)) return null;
    const lipY = ty * TILE;
    if (this.boxSolid(tx * TILE + 3, lipY - 29, 10, 28)) return null;
    return lipY;
  }

  // The edge he is standing AT, in front of him — the one he climbs down over
  // on purpose. `ledgeBehind` is the same geometry found after the mistake;
  // this one is found before it.
  lipAhead(x, y, face) {
    const ty = Math.round(y / TILE);
    const here = Math.floor(x / TILE);
    if (!this.solidTile(here, ty)) return null;
    if (this.solidTile(here + face, ty)) return null;
    const edge = face > 0 ? (here + 1) * TILE : here * TILE;
    if (Math.abs(x - edge) > 14) return null;       // he has to be AT it
    const hx = edge + face * 5;
    const lipY = ty * TILE;
    if (this.boxSolid(hx - 4, lipY + 3, 8, 22)) return null;
    return { x: hx, y: lipY, face: -face };
  }

  // the lip he has just walked off the end of, which he catches on the way past
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

  // ── traps ──────────────────────────────────────────────────────────
  update(hero) {
    this.clock++;
    if (this.gateT > 0) this.gateT--;

    for (const p of this.plates) {
      const on = hero && Math.abs(hero.x - (p.tx * TILE + 8)) < 12 && Math.abs(hero.y - p.ty * TILE) < 4;
      p.down = on;
      if (on) this.gateT = GATE_OPEN;
    }

    for (const [, l] of this.loose) {
      if (l.t < 0) {
        const on = hero && Math.abs(hero.x - (l.tx * TILE + 8)) < 12 && hero.y === l.ty * TILE;
        if (on) l.t = 0;
      } else if (l.t < LOOSE_HOLD + 40) l.t++;
    }
  }

  spikeUp() {
    const p = this.clock % SPIKE_CYCLE;
    if (p < SPIKE_MOVE) return p / SPIKE_MOVE;
    if (p < SPIKE_UP) return 1;
    if (p < SPIKE_UP + SPIKE_MOVE) return 1 - (p - SPIKE_UP) / SPIKE_MOVE;
    return 0;
  }

  fieldOn() { return (this.clock % FIELD_CYCLE) < FIELD_ON; }

  chompY(c) {
    const p = (this.clock + c.phase) % CHOMP_CYCLE;
    const top = c.ty * TILE;
    const span = c.reach - top - TILE;
    if (p < CHOMP_FALL) return top + span * (p / CHOMP_FALL) ** 0.6;
    if (p < CHOMP_FALL + CHOMP_HOLD) return top + span;
    if (p < CHOMP_FALL + CHOMP_HOLD + CHOMP_RISE) {
      return top + span * (1 - (p - CHOMP_FALL - CHOMP_HOLD) / CHOMP_RISE);
    }
    return top;
  }

  // what, if anything, in this box is currently lethal
  lethal(x, y, w, h) {
    const up = this.spikeUp();
    if (up > 0.55) {
      for (const s of this.spikes) {
        const sx = s.tx * TILE, sy = s.ty * TILE;
        if (x < sx + TILE && x + w > sx && y < sy + 6 && y + h > sy - 11 * up) return 'spike';
      }
    }
    if (this.fieldOn()) {
      for (const f of this.fields) {
        const fx = f.tx * TILE, fy = f.ty * TILE;
        if (x < fx + TILE && x + w > fx && y < fy + TILE && y + h > fy) return 'field';
      }
    }
    for (const c of this.chompers) {
      const cy = this.chompY(c), cx = c.tx * TILE;
      if (cy <= c.ty * TILE + 1) continue;
      if (x < cx + TILE && x + w > cx && y < cy + TILE && y + h > cy) return 'slab';
    }
    return null;
  }

  // ── drawing ────────────────────────────────────────────────────────
  // Static rock is painted once per room; only the traps move.
  drawTiles(scr) {
    scr.cached(`tiles:${this.index}`, () => this.paintTiles(scr));
  }

  paintTiles(scr) {
    const r = rand(this.seed);
    const empty = (tx, ty) => !SOLIDS.includes(this.tile(tx, ty)) && this.tile(tx, ty) !== '|' && this.tile(tx, ty) !== 'p';

    // the wall behind him — not sky, not floor. Courses of block, faint.
    for (let ty = 0; ty < RH; ty++) {
      for (let tx = 0; tx < RW; tx++) {
        if (this.tile(tx, ty) !== '-') continue;
        scr.rect(tx * TILE, ty * TILE, TILE, TILE, C.NEAR);
      }
    }
    for (let ty = 0; ty < RH; ty++) {
      for (let tx = 0; tx < RW; tx++) {
        if (this.tile(tx, ty) !== '-') continue;
        const x = tx * TILE, y = ty * TILE;
        if (this.tile(tx, ty - 1) === '-') scr.rect(x, y, TILE, 1, C.DARK);
        if (ty % 2 === 0) scr.rect(x + (ty % 4 ? 0 : 8), y, 1, TILE, C.DARK);
        if (this.tile(tx, ty - 1) !== '-') scr.rect(x, y, TILE, 2, C.DARK);
      }
    }
    // Niches cut into the back wall. A flat wall with writing on it reads as
    // wallpaper; a wall with holes in it reads as a place that was built for
    // something. Cheap: one dark rect and one lit lip each.
    {
      const w = weights(this.room.t);
      if (w.ruin > 0.25 || w.palace > 0.25) {
        const rr = rand(this.seed + 977);
        for (let ty = 1; ty < RH - 1; ty++) {
          for (let tx = 1; tx < RW - 1; tx++) {
            if (this.tile(tx, ty) !== '-' || this.tile(tx, ty + 1) !== '-') continue;
            if (rr() > 0.04) continue;
            // Small and shallow. The first cut made them full-tile black
            // rectangles and the wall read as a row of doorways rather than a
            // wall with alcoves cut into it.
            const x = tx * TILE + 4, y = ty * TILE + 4;
            const w2 = TILE - 8, h2 = TILE + 3;
            scr.rect(x, y, w2, h2, C.DARK);
            scr.rect(x, y, w2, 1, C.SOLID);
            scr.rect(x, y + h2 - 2, w2, 2, C.NEAR);
            if (rr() < 0.5) scr.rect(x + 2, y + h2 - 7, w2 - 4, 5, C.NEAR);
          }
        }
      }
    }
    // CARVED RELIEF. The references cut real panels into their stone — a
    // recessed field with a lit top edge and a shadowed sill, and a repeating
    // motif band along the courses. Flat wall plus writing reads as wallpaper;
    // wall plus relief reads as something a mason spent a season on.
    {
      const w2 = weights(this.room.t);
      if (w2.ruin > 0.3 || w2.palace > 0.3) {
        const rr2 = rand(this.seed + 4211);
        for (let ty = 1; ty < RH - 2; ty++) {
          for (let tx = 1; tx < RW - 2; tx++) {
            if (this.tile(tx, ty) !== '-' || this.tile(tx + 1, ty) !== '-') continue;
            if (rr2() > 0.07) continue;
            const x = tx * TILE + 2, y = ty * TILE + 3, pw = TILE * 2 - 4, ph = TILE - 6;
            scr.rect(x, y, pw, ph, C.DARK);                 // the recess
            scr.rect(x, y, pw, 1, C.SOLID);                 // its lit head
            scr.rect(x, y + ph - 1, pw, 1, C.NEAR);         // and its sill
            for (let k = 0; k < 3; k++) {                   // the motif inside
              scr.rect(x + 3 + k * 8, y + 2, 5, 1, C.NEAR);
              scr.rect(x + 3 + k * 8 + 4, y + 2, 1, 4, C.NEAR);
              scr.rect(x + 3 + k * 8, y + 5, 5, 1, C.NEAR);
            }
          }
        }
      }
    }
    glyphs(scr, this.room, this.index);
    for (const L of this.lights) {
      // a sconce, and the flat wash it throws on the wall behind it
      scr.veil([L.x - 13, L.y - 8, L.x + 13, L.y - 8, L.x + 18, L.y + 26, L.x - 18, L.y + 26], C.LUX2, 0.16);
      scr.rect(L.x - 3, L.y + 2, 6, 9, C.DARK);
      scr.rect(L.x - 5, L.y + 10, 10, 2, C.DARK);
    }

    // ── the mass, and its edges are NOT the grid ─────────────────────
    // Nothing in the references meets air along a straight line. Rock plates
    // bulge, concrete crumbles, bark scallops — and a tile-shaped edge is the
    // single loudest thing that says "this was made out of tiles".
    //
    // So an exposed face is not the tile's edge, it is a line that wanders two
    // or three pixels either side of it, and the mass is filled as a POLYGON
    // rather than a rect. Filling it as a polygon is what lets the wander cut
    // INWARD as well as outward — a bump that only ever bulges out reads as a
    // blob stuck on, and it is the bites that read as weathering.
    //
    // The wander is a hash of the WORLD coordinate, not of the tile, so two
    // tiles sharing an edge agree about it and the line runs on through the
    // corner instead of stepping at every boundary. One value per four pixels:
    // per-pixel noise is fizz, four is a plate.
    const chew = (a, b) => {
      let h = (a * 374761393 + b * 668265263) >>> 0;
      h = (h ^ (h >>> 13)) * 1274126177 >>> 0;
      return ((h >>> 8) % 5) - 2;                 // -2..+2
    };
    const STEP = 4;
    // one face of a tile as a run of points, chewed if it is open to the air
    const face = (x0, y0, x1, y1, open, key) => {
      const pts = [];
      if (!open) { pts.push(x0, y0, x1, y1); return pts; }
      const horiz = y0 === y1;
      const len = horiz ? x1 - x0 : y1 - y0;
      const n = Math.max(1, Math.round(Math.abs(len) / STEP));
      const sgn = len < 0 ? -1 : 1;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t;
        // the displacement is sampled ALONG the edge and pushed across it
        const along = horiz ? Math.round(px / STEP) : Math.round(py / STEP);
        const d = chew(along, key);
        pts.push(horiz ? px : px + d * sgn * (key === 3 ? -1 : 1),
                 horiz ? py + d * sgn * (key === 0 ? -1 : 1) : py);
      }
      return pts;
    };

    const mass = [];
    for (let ty = 0; ty < RH; ty++) {
      for (let tx = 0; tx < RW; tx++) {
        const ch = this.tile(tx, ty);
        if (!SOLIDS.includes(ch) && ch !== 'p') continue;
        const x = tx * TILE, y = ty * TILE;
        const up = empty(tx, ty - 1), dn = empty(tx, ty + 1);
        const lf = empty(tx - 1, ty), rt = empty(tx + 1, ty);
        if (!up && !dn && !lf && !rt) {
          scr.rect(x, y, TILE, TILE, C.SOLID);     // buried: no edge to chew
        } else {
          scr.poly([
            ...face(x, y, x + TILE, y, up, 0),
            ...face(x + TILE, y, x + TILE, y + TILE, rt, 1),
            ...face(x + TILE, y + TILE, x, y + TILE, dn, 2),
            ...face(x, y + TILE, x, y, lf, 3),
          ], C.SOLID);
        }
        mass.push([tx, ty]);
      }
    }

    // ── the mottle ───────────────────────────────────────────────────
    // Bark, damp concrete, weathered stone: in every reference the body of a
    // mass carries a scatter of two adjacent tones, clustered into blotches a
    // few pixels across rather than sprinkled per pixel. It is most of what
    // separates a painted surface from a filled shape, and it costs a handful
    // of rects a tile. Kept OFF the top four pixels, where the lit plane and
    // its turn-under do their own job.
    for (const [tx, ty] of mass) {
      if (this.tile(tx, ty) === '~') continue;    // loose tiles stay legible
      const x = tx * TILE, y = ty * TILE;
      const blots = 2 + ((r() * 3) | 0);
      for (let i = 0; i < blots; i++) {
        const dark = r() < 0.55;
        const bx = x + 1 + r() * (TILE - 5), by = y + 4 + r() * (TILE - 7);
        const col = dark ? C.DARK : C.NEAR;
        // a blotch is two or three overlapping rects, not one — a single rect
        // reads as a brick, three read as a stain
        scr.rect(bx, by, 2 + r() * 3, 1 + r() * 2, col);
        if (r() < 0.7) scr.rect(bx + 1 + r() * 2, by + 1, 1 + r() * 2, 1, col);
        if (r() < 0.35) scr.rect(bx - 1, by + 1 + r() * 2, 1 + r() * 2, 1, col);
      }
    }

    // EVERY SURFACE IS A RAMP, not a fill. This is the whole lesson of the
    // reference art: a rock face there is a lit top plane, a mid face, a shadow
    // side and a dark crevice line — four values on one shape — and the mass
    // here was being painted with one. The eleven world slots are enough for
    // that; they were just being spent flat.
    const w0 = weights(this.room.t);
    const nat = Math.max(w0.ruin, w0.palace, w0.machine) < 0.3;
    for (const [tx, ty] of mass) {
      const x = tx * TILE, y = ty * TILE;
      const lit = empty(tx, ty - 1);
      if (lit) {
        scr.rect(x, y, TILE, 2, C.EDGE);                       // the lit plane
        scr.rect(x, y + 2, TILE, 2, C.NEAR);                   // its turn-under
        const n = 1 + ((r() * 3) | 0);
        for (let i = 0; i < n; i++) {
          const w = 2 + r() * 4, h = 1 + r() * 2, ox = r() * (TILE - w);
          scr.poly([x + ox, y, x + ox + w, y, x + ox + w - 1, y - h, x + ox + 1, y - h], C.EDGE);
        }
      }
      if (empty(tx, ty + 1)) {
        scr.rect(x, y + TILE - 3, TILE, 3, C.DARK);
        if (r() < 0.5) scr.poly([x + 3, y + TILE, x + 11, y + TILE, x + 8, y + TILE + 3], C.DARK);
      }
      // the two vertical faces get opposite treatment — one catches the light
      // the top plane catches, the other is the shadow side
      if (empty(tx - 1, ty)) { scr.rect(x, y, 2, TILE, C.NEAR); scr.rect(x, y, 1, TILE, C.DARK); }
      if (empty(tx + 1, ty)) scr.rect(x + TILE - 3, y, 3, TILE, C.DARK);
      if (r() < 0.22) scr.rect(x + 2 + r() * 6, y + 4 + r() * 8, 3 + r() * 5, 2, C.DARK);
    }

    // ── what grows on it ─────────────────────────────────────────────
    // Moss over every lip and creeper hanging off it, lighter than the stone.
    // In both references the growth is the LIGHT thing and the rock is the dark
    // thing; the other way round it reads as damage rather than as life.
    if (nat || w0.vine > 0.25) {
      for (const [tx, ty] of mass) {
        if (!empty(tx, ty - 1)) continue;
        const x = tx * TILE, y = ty * TILE;
        if (r() < 0.75) drape(scr, x + 1, y + 3, TILE - 2, nat ? C.SOLID : C.EDGE, r, 11);
        if (r() < 0.45) {
          leaves(scr, x + 3 + r() * 9, y - 1, 6 + r() * 5,
            nat ? C.SOLID : C.NEAR, C.EDGE, 5, Math.PI * 0.95);
        }
      }
    }

    // ── what the rock is MADE of ─────────────────────────────────────
    // The mass alone reads as one poured shape. Coursing it — a joint every
    // couple of tiles, offset row to row — is what turns it from a silhouette
    // into masonry, and it costs one rect per tile. The jungle gets strata
    // instead of courses, because rock is bedded and walls are laid.
    const w = weights(this.room.t);
    const built = Math.max(w.ruin, w.palace, w.machine);
    for (const [tx, ty] of mass) {
      const x = tx * TILE, y = ty * TILE;
      if (empty(tx, ty - 1) || this.tile(tx, ty) === '~') continue;
      if (built > 0.3) {
        if ((ty & 1) === 0) scr.rect(x, y, TILE, 1, C.DARK);
        const j = ((ty & 1) ? 0 : 8);
        if (!empty(tx, ty)) scr.rect(x + j, y, 1, TILE, C.DARK);
      } else {
        // bedding planes: long, wavering, and nothing like a straight joint
        if ((ty * 7 + tx * 3) % 5 === 0) {
          scr.rect(x, y + 3 + ((tx * 5) % 4), TILE, 1, C.DARK);
        }
        if (r() < 0.18) scr.rect(x + 3 + r() * 8, y + 6 + r() * 6, 2, 2, C.EDGE);
      }
    }

    // and the ground shows what the light is doing to it: a second, dimmer
    // band under every lit surface so the edge is a lip rather than a line
    for (const [tx, ty] of mass) {
      if (!empty(tx, ty - 1)) continue;
      const x = tx * TILE, y = ty * TILE;
      scr.rect(x, y + 2, TILE, 1, built > 0.3 ? C.SOLID : C.DARK);
      // tufts on natural ground, chips out of built ground
      if (built > 0.3) {
        if (r() < 0.3) scr.rect(x + 2 + r() * 10, y, 2 + r() * 3, 1, C.DARK);
        // the meander again, on SOME of the step fronts. Run on every tile it
        // stopped being carving and became a zip fastener along the floor.
        if ((tx + ty) % 4 === 0) {
          scr.rect(x + 2, y + 5, 6, 1, C.DARK);
          scr.rect(x + 7, y + 5, 1, 3, C.DARK);
          scr.rect(x + 10, y + 6, 4, 1, C.DARK);
        }
      } else if (r() < 0.55) {
        const gx = x + r() * (TILE - 4);
        for (let i = 0; i < 3; i++) {
          scr.rect(gx + i * 1.6, y - 1 - (i === 1 ? 2 : 1), 1, 1 + (i === 1 ? 2 : 1), C.EDGE);
        }
      }
    }
  }

  drawTraps(scr) {
    const up = this.spikeUp();
    for (const s of this.spikes) {
      const x = s.tx * TILE, y = s.ty * TILE;
      const hgt = 11 * up;
      if (hgt > 0.5) {
        for (let i = 0; i < 4; i++) {
          const px = x + 1 + i * 4;
          scr.poly([px, y + 1, px + 3, y + 1, px + 1.5, y - hgt], C.EDGE);
        }
      }
      scr.rect(x, y, TILE, 2, C.DARK);
      for (let i = 0; i < 4; i++) scr.rect(x + 1 + i * 4, y, 3, 1, C.VOID);
    }

    for (const f of this.fields) {
      const x = f.tx * TILE, y = f.ty * TILE;
      const cap = this.tile(f.tx, f.ty - 1) !== 'f';
      const foot = this.tile(f.tx, f.ty + 1) !== 'f';
      if (cap) scr.rect(x, y - 2, TILE, 3, C.SOLID);
      if (foot) scr.rect(x, y + TILE - 1, TILE, 3, C.SOLID);
      if (!this.fieldOn()) {
        if (cap) scr.rect(x + 6, y - 1, 4, 1, C.DARK);
        continue;
      }
      // a barrier has to look like a barrier, not a wire: it fills its tile
      const w = TILE - 4 + Math.sin(this.clock * 0.4) * 1.2;
      scr.rect(x + (TILE - w) / 2, y, w, TILE, C.LUX);
      scr.rect(x + 3, y, TILE - 6, TILE, C.LUX2);
      scr.rect(x + 6, y + (this.clock * 4) % TILE, 4, 2, C.EDGE);
    }

    for (const g of this.gates) {
      const x = g.tx * TILE, y = g.ty * TILE;
      const open = this.gateT > 0;
      const drop = open ? TILE - 3 : 0;
      scr.rect(x, y, TILE, 3, C.DARK);
      if (drop < TILE - 3.5) {
        scr.rect(x + 1, y + drop, TILE - 2, TILE - drop, C.SOLID);
        for (let i = 0; i < 3; i++) scr.rect(x + 2 + i * 5, y + drop, 2, TILE - drop, C.DARK);
        scr.rect(x + 1, y + TILE - 2, TILE - 2, 2, C.EDGE);
      }
    }

    for (const p of this.plates) {
      const x = p.tx * TILE, y = p.ty * TILE + (p.down ? 2 : 0);
      scr.rect(x + 1, y, TILE - 2, 3, p.down ? C.LUX : C.EDGE);
      scr.rect(x + 1, y + 3, TILE - 2, 1, C.DARK);
    }

    for (const [, l] of this.loose) {
      if (l.t >= LOOSE_HOLD) continue;
      const x = l.tx * TILE, y = l.ty * TILE;
      const sh = l.t >= 0 ? Math.sin(l.t * 1.7) * 1.4 : 0;
      scr.rect(x + sh, y, TILE, TILE, C.SOLID);
      scr.rect(x + sh, y, TILE, 2, C.EDGE);
      // it has to read as cracked rather than as already gone: hairlines and a
      // shadow gap at each end, not two black wedges
      scr.rect(x + sh, y, 1, TILE, C.DARK);
      scr.rect(x + TILE - 1 + sh, y, 1, TILE, C.DARK);
      scr.poly([x + 4 + sh, y + 2, x + 5 + sh, y + 2, x + 6 + sh, y + TILE, x + 5 + sh, y + TILE], C.DARK);
      scr.poly([x + 11 + sh, y + 2, x + 12 + sh, y + 2, x + 10 + sh, y + TILE, x + 9 + sh, y + TILE], C.DARK);
      scr.rect(x + 2 + sh, y + TILE - 2, TILE - 4, 2, C.DARK);
    }
    // and the ones that let go, falling
    for (const [, l] of this.loose) {
      if (l.t < LOOSE_HOLD) continue;
      const k = l.t - LOOSE_HOLD;
      if (k > 40) continue;
      const x = l.tx * TILE, y = l.ty * TILE + k * k * 0.34;
      scr.poly([x + 1, y, x + TILE - 1, y + 2, x + TILE - 3, y + TILE, x + 2, y + TILE - 2], C.SOLID);
    }

    for (const c of this.chompers) {
      const y = this.chompY(c), x = c.tx * TILE;
      // two rails, not a shaft — a filled column read as a doorway and drew the
      // eye to the wrong half of the screen
      scr.rect(x + 1, c.ty * TILE - 3, 2, y - c.ty * TILE + 4, C.DARK);
      scr.rect(x + TILE - 3, c.ty * TILE - 3, 2, y - c.ty * TILE + 4, C.DARK);
      scr.rect(x - 1, c.ty * TILE - 4, TILE + 2, 5, C.DARK);
      scr.rect(x, y, TILE, TILE, C.SOLID);
      scr.rect(x, y, TILE, 3, C.DARK);
      for (let i = 0; i < 4; i++) scr.poly([x + i * 4, y + TILE - 4, x + i * 4 + 4, y + TILE - 4, x + i * 4 + 2, y + TILE + 2], C.EDGE);
    }

    if (this.door) {
      const x = this.door.tx * TILE, y = this.door.ty * TILE;
      scr.rect(x - 3, y - TILE - 2, TILE + 6, TILE * 2 + 2, C.DARK);
      const g = 2 + Math.sin(this.clock * 0.08) * 1.2;
      scr.rect(x - 1, y - TILE, TILE + 2, TILE * 2, C.LUX);
      scr.rect(x + 1 + g / 2, y - TILE + 2, TILE - 2 - g, TILE * 2 - 4, C.LUX2);
    }

    for (const p of this.pickups) {
      if (p.taken) continue;
      const bob = Math.sin(this.clock * 0.09 + p.x) * 1.6;
      if (p.kind === 'gun') {
        scr.poly([p.x - 6, p.y + bob, p.x + 6, p.y + bob - 1, p.x + 6, p.y + bob + 2, p.x - 6, p.y + bob + 3], C.HAIR);
        scr.poly([p.x - 4, p.y + bob + 3, p.x - 1, p.y + bob + 3, p.x - 2, p.y + bob + 7, p.x - 5, p.y + bob + 7], C.HAIR);
        scr.rect(p.x - 7, p.y + bob - 3, 15, 1, C.LUX);
      } else if (p.kind === 'sword') {
        scr.poly([p.x - 15, p.y + bob + 1, p.x + 9, p.y + bob - 1, p.x + 11, p.y + bob,
          p.x + 9, p.y + bob + 2, p.x - 15, p.y + bob + 3], C.EDGE);
        scr.poly([p.x - 15, p.y + bob + 1, p.x + 9, p.y + bob - 1, p.x + 11, p.y + bob], C.LUX);
        scr.rect(p.x - 18, p.y + bob - 2, 4, 6, C.DARK);
        scr.rect(p.x - 22, p.y + bob, 5, 3, C.DARK);
        scr.rect(p.x - 24, p.y + bob - 4, 15, 1, C.LUX);
      } else {
        scr.rect(p.x - 4, p.y + bob - 5, 8, 11, C.EDGE);
        scr.rect(p.x - 3, p.y + bob - 4, 6, 9, C.ALERT);
        scr.rect(p.x - 2, p.y + bob - 1, 4, 2, C.EDGE);
        scr.rect(p.x - 1, p.y + bob - 3, 2, 6, C.EDGE);
      }
    }
  }
}

export { RW, RH, TILE, ROOM_W, ROOM_H, ROOMS };
