// EERI — the level. Design and collision live on an honest tile grid
// (ART_BRIEF §4); the dressing is drawn over it, but a standable lip is a
// tile edge, exactly. Collision never comes from artwork.
//
// World units = tiles. Cell (c, cy) spans x [c, c+1), y [cy, cy+1);
// cy counts up from the bottom of the map.
//
// v6: rooms are assembled from js/parts.js and compiled here — see rooms.js.
// each site is one room built on the same grammar: a kid-shaped obstacle,
// a machine-shaped lock, and an exit only the pair of them opens.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=6';
import { craftMat, craftBox, craft, cutQuad } from './craft.js?v=6';

import { ROOMS } from './rooms.js?v=6';
import { compile, W, H, SOLID_CHARS, GROUND, LADDER_CH } from './parts.js?v=6';

export { ROOMS };
const EPS = 0.001;

// A Level is one compiled room. It compiles on construction rather than
// sharing a grid, because DIGGING AND SPANNING EDIT THE MAP — two Levels
// over one grid would have the second remember the first one's excavation.

export class Level {
  constructor(room = ROOMS[0]) {
    this.room = room;
    this.def = compile(room);        // fresh grid every time — see above
    this.w = W; this.h = H;
    this.map = this.def.grid;
    this.boltCells = this.def.bolts.map(([r, c]) => ({ x: c + 0.5, y: (H - 1 - r) + 0.5 }));
  }

  solidCell(c, cy) {
    if (c < 0 || c >= W) return true;          // the world has ends
    if (cy < 0) return true;
    if (cy >= H) return false;
    return SOLID_CHARS.includes(this.map[H - 1 - cy][c]);
  }

  // A ladder is the one tile you can be INSIDE and still be held up. It is
  // not solid, so nothing above changes; the kid asks whether he is on one.
  ladderAt(x, y) {
    const c = Math.floor(x), cy = Math.floor(y);
    if (c < 0 || c >= W || cy < 0 || cy >= H) return false;
    return this.map[H - 1 - cy][c] === LADDER_CH;
  }

  // is there ladder anywhere in the body's span? (feet, middle, head)
  onLadder(box) {
    return this.ladderAt(box.x, box.y + 0.1)
      || this.ladderAt(box.x, box.y + box.h * 0.5)
      || this.ladderAt(box.x, box.y + box.h - 0.1);
  }

  // digging edits the map, so collision stays honest — the bank shrinks as
  // a fact about the level, not as a fact about a picture
  clearRow(c0, c1, cy) {
    for (let c = c0; c <= c1; c++) this.map[H - 1 - cy][c] = ' ';
  }

  // …and seating a girder edits it the other way: the span is a fact too
  fillRow(c0, c1, cy, ch = 'G') {
    for (let c = c0; c <= c1; c++) this.map[H - 1 - cy][c] = ch;
  }

  // fell past the floor: back to the near side of whichever hole took you
  fallRespawn(x) {
    for (const p of this.def.pits) {
      if (x > p.c0 - 1 && x < p.c1 + 2) return { x: p.backX, y: 5 };
    }
    const s = this.def.spawn.kid;
    return { x: s.x, y: s.y + 1 };
  }

  // Axis-separated AABB sweep. box = {x (centre), y (feet), hw, h}.
  // Speeds here stay well under a tile per step, so single-cell checks hold.
  moveX(box, dx) {
    if (dx === 0) return { x: box.x, hit: false };
    const s = Math.sign(dx);
    let nx = box.x + dx;
    const edge = nx + s * box.hw;
    const c = Math.floor(edge);
    for (let sy = box.y + 0.02; sy < box.y + box.h; sy += 0.9) {
      if (this.solidCell(c, Math.floor(Math.min(sy, box.y + box.h - 0.02)))) {
        nx = s > 0 ? c - box.hw - EPS : c + 1 + box.hw + EPS;
        return { x: nx, hit: true };
      }
    }
    return { x: nx, hit: false };
  }

  moveY(box, dy) {
    if (dy === 0) return { y: box.y, hit: false, grounded: false };
    let ny = box.y + dy;
    if (dy < 0) {
      const row = Math.floor(ny);
      for (let sx = box.x - box.hw + 0.02; sx < box.x + box.hw; sx += 0.9) {
        if (this.solidCell(Math.floor(Math.min(sx, box.x + box.hw - 0.02)), row)) {
          return { y: row + 1, hit: true, grounded: true };
        }
      }
      return { y: ny, hit: false, grounded: false };
    }
    const row = Math.floor(ny + box.h);
    for (let sx = box.x - box.hw + 0.02; sx < box.x + box.hw; sx += 0.9) {
      if (this.solidCell(Math.floor(Math.min(sx, box.x + box.hw - 0.02)), row)) {
        return { y: row - box.h - EPS, hit: true, grounded: false };
      }
    }
    return { y: ny, hit: false, grounded: false };
  }

  grounded(box) {
    const row = Math.floor(box.y - 0.05);
    for (let sx = box.x - box.hw + 0.02; sx < box.x + box.hw; sx += 0.9) {
      if (this.solidCell(Math.floor(Math.min(sx, box.x + box.hw - 0.02)), row)) return true;
    }
    return false;
  }

  // Top of the first solid at or below y in this column — the blob shadow's
  // ground, and the mount/dismount landing check.
  groundTop(x, yFrom) {
    const c = Math.floor(x);
    for (let cy = Math.floor(yFrom - EPS); cy >= 0; cy--) {
      if (this.solidCell(c, cy)) return cy + 1;
    }
    return -4; // over a pit: below the world
  }

  // ---- dressing: shallow 3D slabs wearing the flat-colour read -----------
  //
  // v4: the earth is a CUT SECTION, not a fill. It was one flat brown slab
  // taking the bottom third of every frame with nothing in it — the largest
  // area on screen carrying no information, which is the one thing the
  // Tropical Freeze reference never does. It bands into strata now, wears
  // cobbles, and the standable lip casts a hard shadow onto the face below
  // it so the gameplay lane stops reading as a hairline.
  //
  // v12: …and it was STILL wallpaper, because v4, v10 and v11 all worked the
  // MATERIAL axis and none of them worked composition. Every band shared one
  // `flute` map at one density, so ~30% of the screen was an evenly-spaced
  // motif marching across 136 world units, bounded by four dead-straight
  // horizontals running the full length of the level. Machine-perfect is the
  // one thing the reference is not. Three changes, and only the first is
  // about material:
  //
  //   · each stratum takes its OWN section at its own scale (craft.js)
  //   · every band boundary INTERLOCKS instead of running straight — the
  //     bands send tongues into each other, per solid run so a dug hole is
  //     never bridged. The first attempt laid a torn-card strip along each
  //     boundary and that was worse: a straight line became a regular row of
  //     identical bumps, which is the same failure with more ink. A boundary
  //     wants to be irregular in POSITION, not dressed.
  //   · the face carries FEATURES — a pipe, a drum, a root, brick, stones —
  //     placed deterministically and sparsely. The v4 "cobbles" are
  //     dodecahedrons at a value you cannot see; these are the real thing.
  //   · the grass lip gets its FELT FRINGE, tiled at the strip's own aspect.

  buildMeshes(scene) {
    const group = new THREE.Group();
    // strata: the section gets darker and cooler with depth, in bands
    const STRATA = [
      PAL.EARTH[0],                          // cy 0 — deepest of the band
      mix(PAL.EARTH[1], PAL.EARTH[0], 0.5),  // cy 1
      PAL.EARTH[1],                          // cy 2
      PAL.EARTH[2],                          // cy 3 — topsoil
    ];
    const strata = (cy) => STRATA[Math.min(cy, STRATA.length - 1)];
    const mat = {
      lip:   new THREE.MeshLambertMaterial({ color: PAL.GREEN }),
      shade: new THREE.MeshLambertMaterial({ color: mix(PAL.EARTH[0], PAL.INK, 0.45) }),
      back:  new THREE.MeshLambertMaterial({ color: mix(PAL.EARTH[0], PAL.INK, 0.5) }),
      cut:   new THREE.MeshLambertMaterial({ color: PAL.EARTH[3] }),
      steel: new THREE.MeshLambertMaterial({ color: PAL.STEEL[2] }),
      girder:new THREE.MeshLambertMaterial({ color: PAL.STEEL[1] }),
      bolt:  new THREE.MeshLambertMaterial({ color: PAL.DARK }),
    };
    // Every EARTH surface takes the crafted card grain; steel and bolts stay
    // clean, because one material language does not mean one material.
    // The earth is a CUT, and a cut through card shows its fluting — but a
    // cut through card also shows that the layers are not all the same card.
    // Each band names its own section; `flute` stays the fallback so a
    // missing source is a flat band, never a missing band.
    const SECTION = ['packed', 'gritty', 'strata', 'topsoil'];
    const section = (cy) => SECTION[Math.min(cy, SECTION.length - 1)];
    const dirtMats = new Map();
    const dirtMat = (c, mat = 'flute') => {
      const k = c + '|' + mat;
      if (!dirtMats.has(k)) dirtMats.set(k, craftMat(c, mat));
      return dirtMats.get(k);
    };
    // each surface takes the material it would really be made of
    craft(mat.cut, 'flute'); craft(mat.shade, 'flute'); craft(mat.back, 'card');
    craft(mat.lip, 'felt');                              // grass is felt
    craft(mat.steel, 'balsa'); craft(mat.girder, 'balsa'); // painted wood
    const box = (w, h, d, m, x, y, z) => {
      const mesh = craftBox(w, h, d, m);
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    };

    // the deep earth below the playable band — banded, so the eye has
    // somewhere to go, and darkening downward the way a real cut does
    const DEEP = [
      { y0: -1.6, y1: 0, c: mix(PAL.EARTH[0], PAL.INK, 0.12) },
      { y0: -4.2, y1: -1.6, c: mix(PAL.EARTH[0], PAL.INK, 0.26) },
      { y0: -10, y1: -4.2, c: mix(PAL.EARTH[0], PAL.INK, 0.4) },
    ];
    const DEEP_MAT = ['packed', 'packed', 'gritty'];
    DEEP.forEach((b, i) => {
      box(136, b.y1 - b.y0, 1.6, dirtMat(b.c, DEEP_MAT[i]), 48, (b.y0 + b.y1) / 2, 0);
    });
    // …and a back wall behind the ground band, darker than any face, so a
    // pit reads as a hole receding rather than a notch cut in a wall
    box(136, 3.98, 0.1, mat.back, 48, 2, -0.9);

    // deterministic, so a screenshot of the same frame is the same picture
    // twice
    let seed = 1337;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

    // INTERLOCK, rather than decorate. The four band boundaries were four
    // dead-straight horizontals running the whole level, and the first fix
    // for that was a torn-card strip laid along each one — which replaced a
    // straight line with a REGULAR ROW OF IDENTICAL BUMPS, i.e. traded one
    // machine-perfect motif for a louder one. A boundary wants to be
    // irregular in POSITION, not dressed: each band sends tongues of itself
    // down into the band below at varying widths and depths, so the line
    // between two strata wanders the way a real cut does and costs no asset
    // at all.
    const tongues = (yBoundary, upper, lower, x0, x1, n) => {
      let x = x0 + rnd() * 3;
      for (let i = 0; i < n && x < x1; i++) {
        const w = 0.8 + rnd() * rnd() * 5;
        const d = 0.12 + rnd() * 0.42;
        // the upper band droops into the lower one, and now and then the
        // lower one pushes up instead — a cut is not a comb
        const up = rnd() < 0.3;
        const b = up ? lower : upper;
        box(Math.min(w, x1 - x), d, 1.62, b, x + Math.min(w, x1 - x) / 2,
            yBoundary + (up ? d / 2 : -d / 2), 0);
        x += w + 0.6 + rnd() * 4;
      }
    };
    for (let i = 0; i < DEEP.length; i++) {
      const b = DEEP[i], above = i === 0 ? dirtMat(STRATA[0], SECTION[0]) : dirtMat(DEEP[i - 1].c, DEEP_MAT[i - 1]);
      tongues(b.y1, above, dirtMat(b.c, DEEP_MAT[i]), -18, 118, 40);
    }

    // LADDERS. Two stiles and a rung every tile — drawn from the map, so a
    // ladder is where the collision says it is and nowhere else.
    for (const L of this.def.ladders || []) {
      const x = L.c + 0.5;
      for (const dx of [-0.26, 0.26]) {
        box(0.1, L.cy1 - L.cy0 + 1, 0.1, mat.steel, x + dx, (L.cy0 + L.cy1 + 1) / 2, 0.35);
      }
      for (let cy = L.cy0; cy <= L.cy1; cy++) {
        box(0.62, 0.08, 0.1, mat.girder, x, cy + 0.5, 0.35);
      }
    }

    // FEATURES embedded in the cut face. This replaces the v4 "cobbles" —
    // ninety grey dodecahedrons at 0.12–0.38 units, mixed toward INK, on a
    // brown face: invisible, which is why the face read as empty however much
    // material was thrown at it. A buried pipe you can NAME is worth ninety
    // pebbles you cannot see. Weighted so stones are common and the drum and
    // the bottle are a find.
    const FEATURES = [
      { n: 'f_stones', w: 1.5, h: 0.75, k: 5 },
      { n: 'f_stone',  w: 0.5, h: 0.5,  k: 6 },
      { n: 'f_brick',  w: 1.7, h: 1.0,  k: 3 },
      { n: 'f_pipe',   w: 1.9, h: 0.8,  k: 3 },
      { n: 'f_root',   w: 1.8, h: 1.1,  k: 2 },
      { n: 'f_drum',   w: 1.1, h: 0.9,  k: 1 },
      { n: 'f_bottle', w: 0.4, h: 0.5,  k: 1 },
    ];
    const bag = FEATURES.flatMap((f) => Array(f.k).fill(f));
    let placed = 0;
    for (let i = 0; i < 90 && placed < 40; i++) {
      const f = bag[(rnd() * bag.length) | 0];
      const x = rnd() * 140 - 21;
      // IN THE VISIBLE BAND. The first cut ran y from −0.5 down to −8, which
      // is almost entirely below the bottom of the frame — forty-six cutouts
      // loaded, lit and rendered where nobody would ever see one. Biased
      // shallow: a section shows most of its history near the top, and the
      // deep bands are meant to go quiet.
      const y = 2.9 - rnd() * rnd() * 5.2;
      // …and never over a hole. A buried pipe floating in a dug pit is worse
      // than no pipe, and pits are exactly where the player is looking.
      if (y > 0 && !this.solidCell(Math.floor(x), Math.floor(y))) continue;
      const s = 0.8 + rnd() * 0.5;
      // knocked back into the earth. At full value a keyed cutout reads as
      // pasted onto the face rather than buried in it — it is the only thing
      // in the section that was not lit by the same light.
      const q = cutQuad(f.w * s, f.h * s, f.n, { color: 0x9d8d7a });
      q.position.set(x, y, 0.84);
      q.rotation.z = (rnd() - 0.5) * 0.5;
      group.add(q);
      placed++;
    }

    // merge horizontal runs per row so the slab count stays sane
    for (let r = 0; r < H; r++) {
      let c = 0;
      while (c < W) {
        const ch = this.map[r][c];
        // a bank and a wall are PIECES — they carry their own states and are
        // built by pieces.js, so the tile painter leaves their cells alone
        if (ch === ' ' || ch === 'B' || ch === 'K') { c++; continue; }
        let e = c;
        while (e + 1 < W && this.map[r][e + 1] === ch) e++;
        const cy = H - 1 - r;
        const cx = (c + e + 1) / 2, w = e - c + 1;
        if (ch === '#') {
          box(w, 1, 1.6, dirtMat(strata(cy), section(cy)), cx, cy + 0.5, 0);
          // …and the boundary with the stratum below wanders, per run, so a
          // dug hole is never bridged
          if (cy >= 1) {
            tongues(cy, dirtMat(strata(cy), section(cy)),
                    dirtMat(strata(cy - 1), section(cy - 1)), c, e + 1, 6);
          }
          // grass lip on tops with air above — the ACCENT GREEN "safe edge"
          // role — and a hard shadow under it. The lip is where the game is
          // played; without the shadow it was a 0.14 hairline on a flat wall.
          if (r === 0 || this.map[r - 1][c] === ' ') {
            box(w, 0.14, 1.66, mat.lip, cx, cy + 0.94, 0);
            box(w, 0.22, 1.68, mat.shade, cx, cy + 0.76, 0);
            // …and the felt's own cut edge. A flat green bar with a hard
            // straight top is the last machine-perfect thing in the lane, and
            // it is the line the player's feet are on.
            // tiled at the strip's OWN aspect. Stretching it to a round
            // number of repeats per run is what compressed the tufts into a
            // regular scalloped chain — a fringe reads as grass only while
            // its tufts are the size grass tufts are.
            const FH = 0.42, reps = Math.max(1, Math.round(w / (FH * 5.6)));
            const fr = cutQuad(w, FH, 'fringe', { repeatX: reps });
            fr.position.set(cx, cy + 1.12, 0.85);
            group.add(fr);
          }
          // a fresh cut edge either side of a hole, so the rim is drawn
          if (c > 0 && this.map[r][c - 1] === ' ' && cy >= 1) {
            box(0.16, 1, 1.7, mat.cut, c + 0.05, cy + 0.5, 0);
          }
          if (e < W - 1 && this.map[r][e + 1] === ' ' && cy >= 1) {
            box(0.16, 1, 1.7, mat.cut, e + 0.95, cy + 0.5, 0);
          }
        } else if (ch === '=') {
          box(w, 0.5, 1.4, mat.steel, cx, cy + 0.72, 0);
          box(w, 0.1, 1.44, mat.girder, cx, cy + 0.5, 0); // darker underside band
          // bolt heads at the ends — the shared detail motif (§3.6)
          for (const bx of [c + 0.3, e + 0.7]) {
            const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 6), mat.bolt);
            b.rotation.x = Math.PI / 2;
            b.position.set(bx, cy + 0.72, 0.74);
            group.add(b);
          }
        } else if (ch === 'G') {
          box(w, 0.3, 1.2, mat.girder, cx, cy + 0.85, 0);      // top chord
          box(w, 0.3, 1.2, mat.girder, cx, cy + 0.15, 0);      // bottom chord
          for (let i = c; i <= e; i += 2) {                    // web posts
            box(0.18, 0.7, 1.0, mat.steel, i + 0.5, cy + 0.5, 0);
          }
        }
        c = e + 1;
      }
    }
    scene.add(group);
    return group;
  }
}
