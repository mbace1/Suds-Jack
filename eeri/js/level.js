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
import { PAL, mix } from './palette.js?v=59';
import { craftMat, craftBox, craft, cutQuad } from './craft.js?v=59';

import { ROOMS, LAB } from './rooms.js?v=59';
import { compile, W, H, SOLID_CHARS, CLIMB_CHAR, BELT_CHARS, TARP_CHAR, WATER_CHAR, GROUND } from './parts.js?v=59';

export { ROOMS, LAB };
const EPS = 0.001;

// A Level is one compiled room. It compiles on construction rather than
// sharing a grid, because DIGGING AND SPANNING EDIT THE MAP — two Levels
// over one grid would have the second remember the first one's excavation.

// ---- THE GROUND IS NOT THE SAME GROUND IN EVERY WORLD --------------------
//
// One `PAL.EARTH` ramp served all four worlds, so the strip you stand on was
// the identical brown under a sunlit construction site, a flooded trench, a
// forest and a night shift. It is the one band on screen in EVERY frame of
// the game — the backdrops change completely behind it and the floor
// underneath answered none of it, which is most of why four worlds read as
// the same place with different wallpaper.
//
// Each world TINTS the ramp rather than replacing it: the strata keep their
// order and their spacing, because the cut has to stay legible as a section.
// No new palette constants — every colour is `PAL.EARTH` mixed toward
// something already in the palette, which keeps this a level-lane change. If
// the art lane wants real per-world earth, this is the one table to replace.
//
//   groundworks  untouched. It is what everything else is judged against.
//   pipeworks    cooler and greyer — wet ground beside concrete.
//   grove        peat: darker, with humus in the topsoil, because the top of
//                a cut in a forest is roots and leaf litter.
//   nightshift   the whole ramp toward INK. Not "the same earth, darker" — a
//                warm brown goes BLUE before it goes black at night, so the
//                mix is toward the ink the night sky already uses.
//
// v15.51: the mixes were roughly doubled, because at the strengths above
// all four worlds still screenshotted as the same brown — Lambert and the
// detail map between them flatten a 15% tint to nothing a phone can see.
// And the night ramp goes toward SKY as well as INK: the blue is what says
// "night" rather than "dim".
const EARTH_FOR = {
  groundworks: (E) => [E[0], mix(E[1], E[0], 0.5), E[1], E[2]],
  pipeworks: (E) => [
    mix(E[0], PAL.STEEL[0], 0.4),
    mix(mix(E[1], E[0], 0.5), PAL.STEEL[0], 0.36),
    mix(E[1], PAL.STEEL[1], 0.32),
    mix(E[2], PAL.STEEL[2], 0.28),
  ],
  grove: (E) => [
    mix(E[0], PAL.INK, 0.32),
    mix(mix(E[1], E[0], 0.5), PAL.INK, 0.24),
    mix(E[1], PAL.GREEN_DK, 0.22),
    mix(E[2], PAL.GREEN_DK, 0.38),
  ],
  nightshift: (E) => [
    mix(mix(E[0], PAL.INK, 0.58), PAL.SKY, 0.14),
    mix(mix(mix(E[1], E[0], 0.5), PAL.INK, 0.5), PAL.SKY, 0.13),
    mix(mix(E[1], PAL.INK, 0.44), PAL.SKY, 0.12),
    mix(mix(E[2], PAL.INK, 0.38), PAL.SKY, 0.1),
  ],
};

// The grass lip goes with it: a daylight green strip is wrong at night and
// wrong in a trench, and it is the brightest thing on the floor — so it is
// the first thing that gives the reuse away.
const LIP_FOR = {
  groundworks: (g) => g,
  pipeworks: (g) => mix(g, PAL.STEEL[2], 0.3),
  grove: (g) => mix(g, PAL.GREEN_DK, 0.45),
  nightshift: (g) => mix(mix(g, PAL.INK, 0.48), PAL.SKY, 0.12),
};

export class Level {
  // `world` is the dressing key main.js already computes (`worldOf`), handed
  // in rather than derived here: a room does not know which world it is in —
  // that mapping is the campaign's — and guessing it from the level name
  // would put a second copy of that rule in this file.
  constructor(room = ROOMS[0], world = 'groundworks') {
    this.room = room;
    this.world = EARTH_FOR[world] ? world : 'groundworks';
    this.def = compile(room);        // fresh grid every time — see above
    this.w = W; this.h = H;
    this.map = this.def.grid;
    this.boltCells = this.def.bolts.map(([r, c]) => ({ x: c + 0.5, y: (H - 1 - r) + 0.5 }));
    // THE NON-TILE FLOORS. Empty in every room that has none, which is all
    // of them until world 2 — but it must EXIST, because the player's
    // platform pass walks it every frame and a room without the field would
    // throw on its first step. main.js fills it once the hoists are built.
    this.platforms = [];
  }

  solidCell(c, cy) {
    if (c < 0 || c >= W) return true;          // the world has ends
    if (cy < 0) return true;
    if (cy >= H) return false;
    return SOLID_CHARS.includes(this.map[H - 1 - cy][c]);
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

  // A rung is NOT solid in any direction — you walk through it, fall through
  // it, and only the climb verb holds you on it. A solid ladder is a wall
  // with a picture of a ladder on it. The two samples are the feet and the
  // chest, so standing at the foot of one is enough to start.
  climbable(x, y) {
    const c = Math.floor(x);
    if (c < 0 || c >= W) return false;
    for (const sy of [y + 0.1, y + 0.8]) {
      const cy = Math.floor(sy);
      if (cy >= 0 && cy < H && this.map[H - 1 - cy][c] === CLIMB_CHAR) return true;
    }
    return false;
  }

  // WHICH ladder he is on, so the climb can pin him to its centre. The map
  // knows the column; nothing was asking it, so a climb drifted by up to half
  // a tile and he looked like he was holding air beside the rungs.
  ladderAt(x, y) {
    const c = Math.floor(x);
    if (c < 0 || c >= W) return null;
    for (const sy of [y + 0.1, y + 0.8]) {
      const cy = Math.floor(sy);
      if (cy >= 0 && cy < H && this.map[H - 1 - cy][c] === CLIMB_CHAR) return { c };
    }
    return null;
  }

  // the top of the ladder under (x, y) — the climb stops with his feet on
  // the deck rather than one rung above it, in the air
  // The tile under his feet, which is how both gizmos are read: a belt is a
  // floor that moves you and a tarp is a floor that throws you, so neither
  // needs an entity — only the character under the boot.
  underfoot(x, y) {
    const c = Math.floor(x), cy = Math.floor(y - 0.05);
    if (c < 0 || c >= W || cy < 0 || cy >= H) return ' ';
    return this.map[H - 1 - cy][c];
  }

  // +1 right, -1 left, 0 for anything that is not a belt
  beltAt(x, y) {
    const ch = this.underfoot(x, y);
    return BELT_CHARS.includes(ch) ? (ch === 'C' ? 1 : -1) : 0;
  }

  tarpAt(x, y) { return this.underfoot(x, y) === TARP_CHAR; }

  // Standing in shallow water. Same one-character read as the belt and the
  // tarp — the gizmos are all "what is under your boot", which is why they
  // cost almost nothing.
  waterAt(x, y) { return this.underfoot(x, y) === WATER_CHAR; }

  climbTop(x, y) {
    const c = Math.floor(x);
    let top = null;
    for (let cy = Math.max(0, Math.floor(y) - 1); cy < H; cy++) {
      if (this.map[H - 1 - cy][c] === CLIMB_CHAR) top = cy; else if (top !== null) break;
    }
    return top === null ? null : top + 1;
  }

  // fell past the floor: back to the near side of whichever hole took you,
  // and failing that to the last checkpoint passed — never to the start,
  // because a level is 60–90 seconds and losing all of it to one hole is the
  // cost this game promised it would never charge (DESIGN §4)
  fallRespawn(x) {
    for (const p of this.def.pits) {
      if (x > p.c0 - 1 && x < p.c1 + 2) return { x: p.backX, y: 5 };
    }
    if (this.respawn) return { x: this.respawn.x, y: this.respawn.y + 1 };
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
    // cy 0 is the deepest of the band and cy 3 the topsoil; WHICH four colours
    // those are belongs to the world (see EARTH_FOR at the top of this file)
    const STRATA = EARTH_FOR[this.world](PAL.EARTH);
    const strata = (cy) => STRATA[Math.min(cy, STRATA.length - 1)];
    // ABOVE THE TOPSOIL EVERY ROW IS THE SAME CARD, so a two-row mound was
    // one flat rectangle with a grass strip on it (v15.50's screenshots, all
    // four worlds). A mound in a hand-built set is card layers STACKED, and
    // the read of that is that no two adjacent layers are quite the same
    // tone. Alternate rows step a little toward ink; the tongues between
    // rows, which were invisible between two identical bands, now show.
    const tone = (cy) => (cy >= STRATA.length && cy % 2 ? mix(strata(cy), PAL.INK, 0.08) : strata(cy));
    const mat = {
      lip:   new THREE.MeshLambertMaterial({ color: LIP_FOR[this.world](PAL.GREEN) }),
      shade: new THREE.MeshLambertMaterial({ color: mix(STRATA[0], PAL.INK, 0.45) }),
      back:  new THREE.MeshLambertMaterial({ color: mix(STRATA[0], PAL.INK, 0.5) }),
      // a FRESH cut is lighter than the weathered face it is cut through,
      // and it has a shadow line where the corrugation turns in
      cut:   new THREE.MeshLambertMaterial({ color: mix(mix(STRATA[3], PAL.EARTH[3], 0.6), PAL.CLOUD, 0.3) }),
      cutDk: new THREE.MeshLambertMaterial({ color: mix(STRATA[0], PAL.INK, 0.5) }),
      // THE KEY IS UPPER-LEFT (ART_BRIEF §3.1: "a single darker tone for
      // side faces, shading painted in, key from upper-left"). So the
      // right-hand cut of any mound is in its own shadow, and a mound
      // throws a shadow to its right onto whatever it stands on. Neither
      // is a cast shadow — the scene has no shadow map and the brief keeps
      // the light soft — both are painted in, and between them they are
      // what makes a rectangle read as a block standing on a floor.
      cutR:   new THREE.MeshLambertMaterial({ color: mix(mix(mix(STRATA[3], PAL.EARTH[3], 0.6), PAL.CLOUD, 0.3), PAL.INK, 0.3) }),
      shadow: new THREE.MeshBasicMaterial({ color: PAL.INK, transparent: true, opacity: 0.3, depthWrite: false }),
      // pressed steel in three tones: the painted body, the lit top plate,
      // and the raw edge where the paint stops — one value cannot say
      // "plate", three can
      steel:     new THREE.MeshLambertMaterial({ color: PAL.STEEL[2] }),
      steelDk:   new THREE.MeshLambertMaterial({ color: mix(PAL.STEEL[2], PAL.INK, 0.16) }),
      steelLt:   new THREE.MeshLambertMaterial({ color: PAL.STEEL[3] }),
      steelEdge: new THREE.MeshLambertMaterial({ color: PAL.STEEL[0] }),
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
    craft(mat.cut, 'flutecoarse'); craft(mat.cutR, 'flutecoarse'); craft(mat.cutDk, 'flute');
    craft(mat.shade, 'flute'); craft(mat.back, 'card');
    craft(mat.lip, 'felt');                              // grass is felt
    for (const k of ['steel', 'steelDk', 'steelLt', 'steelEdge', 'girder']) {
      craft(mat[k], 'balsa');                            // painted wood
    }
    const box = (w, h, d, m, x, y, z) => {
      const mesh = craftBox(w, h, d, m);
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    };

    // the deep earth below the playable band — banded, so the eye has
    // somewhere to go, and darkening downward the way a real cut does
    // …and they start from the WORLD's deepest stratum. They used to start
    // from raw PAL.EARTH[0], which is how a third of every frame — the band
    // under the play row — came out the identical brown in all four worlds
    // whatever EARTH_FOR said above it. That was most of "the earth is the
    // same everywhere", and it was one identifier.
    const DEEP = [
      { y0: -1.6, y1: 0, c: mix(STRATA[0], PAL.INK, 0.12) },
      { y0: -4.2, y1: -1.6, c: mix(STRATA[0], PAL.INK, 0.26) },
      { y0: -10, y1: -4.2, c: mix(STRATA[0], PAL.INK, 0.4) },
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
    // WHAT IS BURIED DEPENDS ON WHERE YOU ARE. A forest floor is roots and
    // stones; a pumphouse trench is pipe, brick and a drum; a depot at night
    // is drums, bottles and pipe. The bag is re-weighted per world rather
    // than re-authored — same seven cutouts, different odds — which is
    // ART_TARGET rung 6's "material identity per world" at zero asset cost.
    const FEATURE_K = ({
      pipeworks:  { f_pipe: 6, f_brick: 5, f_drum: 3, f_root: 0, f_stones: 3 },
      grove:      { f_root: 7, f_stones: 6, f_stone: 6, f_pipe: 0, f_brick: 1, f_drum: 0 },
      nightshift: { f_drum: 3, f_bottle: 3, f_pipe: 4, f_root: 1 },
    })[this.world] || {};
    const bag = FEATURES.flatMap((f) => Array(FEATURE_K[f.n] ?? f.k).fill(f));
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
        // a bank, a wall and a sheet are PIECES — they carry their own
        // states and are built by pieces.js, so the tile painter leaves
        // their cells alone
        if (ch === ' ' || ch === 'B' || ch === 'K' || ch === 'F') { c++; continue; }
        let e = c;
        while (e + 1 < W && this.map[r][e + 1] === ch) e++;
        const cy = H - 1 - r;
        const cx = (c + e + 1) / 2, w = e - c + 1;
        if (ch === '#') {
          box(w, 1, 1.6, dirtMat(tone(cy), section(cy)), cx, cy + 0.5, 0);
          // …and the boundary with the stratum below wanders, per run, so a
          // dug hole is never bridged
          if (cy >= 1) {
            tongues(cy, dirtMat(tone(cy), section(cy)),
                    dirtMat(tone(cy - 1), section(cy - 1)), c, e + 1, 6);
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
          // THE CUT EDGE IS THE MATERIAL. Where a run of earth meets air on
          // its side, what you see is a section through card, and a section
          // through card shows its FLUTING and its THICKNESS. The old rim was
          // a 0.16 hairline of one tone — at 32 px a line, not an edge, which
          // is why every mound in every world's screenshot read as a brown
          // rectangle with a grass strip on it. ART_TARGET rung 1b: "where a
          // flat ends, paint its thickness." So: wider, the COARSE flute, a
          // lighter value than the face (the cut is fresh, the face is
          // weathered), and a dark line on the inside where the corrugation
          // turns into shadow. Two tones is the minimum for thickness to read.
          const cutEdge = (x, inward) => {
            box(0.38, 1, 1.7, inward > 0 ? mat.cut : mat.cutR, x, cy + 0.5, 0);
            box(0.06, 1, 1.72, mat.cutDk, x + inward * 0.19, cy + 0.5, 0);
          };
          if (c > 0 && this.map[r][c - 1] === ' ' && cy >= 1) cutEdge(c + 0.19, 1);
          if (e < W - 1 && this.map[r][e + 1] === ' ' && cy >= 1) {
            cutEdge(e + 0.81, -1);
            // the painted shadow at the foot of the right-hand face, on the
            // floor it stands on — only where there IS a floor there
            if (this.solidCell(e + 1, cy - 1)) {
              const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.16), mat.shadow);
              sh.position.set(e + 1.35, cy + 0.06, 0.88);
              group.add(sh);
            }
          }

          // A RAISED PLATFORM IS A SLAB, NOT A HOLE IN THE SKY.
          //
          // Everything above dresses earth that is part of the CUT — the
          // strata read as a section because there is more section under
          // them. A run with air beneath it gets none of that: it was one
          // flat topsoil rectangle with a grass strip on top, and against
          // backdrops that are layered, hazed and lit it is the least
          // finished thing on screen. Looked at in a captured frame it reads
          // as a brown card someone slid in front of the level.
          //
          // Two bands, and between them they are the whole of §3.1's "a
          // single darker tone for side faces" and "shading painted in, key
          // from upper-left":
          //
          //   * the FACE steps down in tone below the lip, so the slab has a
          //     lit top and a shaded body instead of one value; and
          //   * the UNDERSIDE gets the darkest tone in the lane, because the
          //     bottom edge of a floating slab is the one place the eye looks
          //     for thickness and there was nothing there at all.
          //
          // Depth 1.62/1.64 rather than 1.6: these sit a hair proud of the
          // slab so they win the z-fight outright instead of shimmering.
          //
          // v15.50: the face is PANELS, not one band. One card panel per
          // ~3 tiles, each lapped 0.12 over the last, a hair proud of it and
          // a hair off in tone — a slab in a hand-built set is boards over a
          // frame, and the lap is what says so (rung 1b: "overlapping
          // panels with a visible lap, never a flush join"). The underside
          // is a cut like the ends, in the coarse flute.
          if (r + 1 < H && this.map[r + 1][c] === ' ') {
            const base = strata(cy);
            const nP = Math.max(1, Math.round(w / 3)), pw = w / nP;
            for (let i = 0; i < nP; i++) {
              const x0 = c + pw * i - (i > 0 ? 0.12 : 0), x1 = c + pw * (i + 1);
              const odd = i % 2;
              box(x1 - x0, 0.5 + odd * 0.04, 1.62 + odd * 0.02,
                  dirtMat(mix(base, PAL.INK, odd ? 0.19 : 0.14), section(cy)),
                  (x0 + x1) / 2, cy + 0.34, 0);
            }
            box(w, 0.17, 1.66, dirtMat(mix(base, PAL.INK, 0.34), 'flutecoarse'),
                cx, cy + 0.085, 0);
          }
        } else if (ch === '=') {
          // A PLATFORM IS PRESSED STEEL PLATE OVER A FRAME, and it has to
          // say so at 32 px. It was one slab of one value with a bolt at
          // each end, and in every world's screenshot it was the flattest
          // thing on screen — the one piece in the lane you could not say
          // what it was made of (ART_TARGET §2b, "made of identifiable
          // stuff", the biggest gap in either audit). Rung 1b's list,
          // applied in full: overlapping PANELS with a visible lap, a lit
          // top plate, FIXINGS along the length rather than only at the
          // ends, an honest raw CUT EDGE where the paint stops, a bracket
          // under each end holding it up, and a little imperfection — no
          // two panels sit at quite the same height.
          const nP = Math.max(1, Math.round(w / 2)), pw = w / nP;
          for (let i = 0; i < nP; i++) {
            const x0 = c + pw * i - (i > 0 ? 0.1 : 0), x1 = c + pw * (i + 1);
            const odd = i % 2, j = odd * 0.025, px = (x0 + x1) / 2;
            box(x1 - x0, 0.42, 1.4 + odd * 0.03, odd ? mat.steelDk : mat.steel, px, cy + 0.74 + j, 0);
            box(x1 - x0, 0.07, 1.42 + odd * 0.03, mat.steelLt, px, cy + 0.965 + j, 0);
          }
          box(w, 0.1, 1.44, mat.girder, cx, cy + 0.5, 0); // darker underside band
          // the plate's painted shadow on the ground beneath it, pushed
          // right by the upper-left key — one strip per run of floor
          for (let i = c; i <= e; i++) {
            if (!this.solidCell(i, cy - 1)) continue;
            let j = i;
            while (j < e && this.solidCell(j + 1, cy - 1)) j++;
            const sh = new THREE.Mesh(new THREE.PlaneGeometry(j - i + 1, 0.16), mat.shadow);
            sh.position.set((i + j + 1) / 2 + 0.3, cy + 0.06, 0.88);
            group.add(sh);
            i = j;
          }
          for (const ex of [c + 0.06, e + 0.94]) {        // the raw edge
            box(0.12, 0.5, 1.46, mat.steelEdge, ex, cy + 0.74, 0);
          }
          for (const bx of [c + 0.35, e + 0.65]) {        // angle brackets
            box(0.34, 0.12, 0.9, mat.girder, bx, cy + 0.42, 0);
            box(0.12, 0.3, 0.9, mat.girder, bx, cy + 0.32, 0);
          }
          // bolt heads — the shared detail motif (§3.6) — at the ends AND
          // at every lap, so the panels read as bolted down, not laid on
          const bolts = [c + 0.3, e + 0.7];
          for (let i = 1; i < nP; i++) bolts.push(c + pw * i - 0.02);
          for (const bx of bolts) {
            const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 6), mat.bolt);
            b.rotation.x = Math.PI / 2;
            b.position.set(bx, cy + 0.74, 0.76);
            group.add(b);
          }
        } else if (ch === 'C' || ch === 'c') {
          // a belt: a plate with rollers under it, and CHEVRONS on top
          // pointing the way it runs — the direction has to be readable
          // standing still, not inferred once it has already moved you
          box(w, 0.3, 1.4, mat.steel, cx, cy + 0.82, 0);
          box(w, 0.16, 1.2, mat.girder, cx, cy + 0.6, 0);
          for (let i = c; i <= e; i++) {
            const chev = craftBox(0.34, 0.1, 0.34, craftMat(PAL.MACHINE, 'balsa'));
            chev.position.set(i + 0.5, cy + 0.99, 0);
            chev.rotation.y = ch === 'C' ? 0.78 : -0.78;
            group.add(chev);
          }
        } else if (ch === '~') {
          // SHALLOW WATER. It replaces the ground's top row, so the bed has
          // to be drawn back in underneath or the run reads as a hole with
          // a lid on it. Then the water itself: a CUT SHEET of blue-green
          // craft material sitting slightly proud, flat and matte — never a
          // transparency and never a shader (ART_BRIEF §3.2, and WORLD2 §3).
          box(w, 1, 1.6, dirtMat(strata(cy), section(cy)), cx, cy + 0.5, 0);
          const sheet = craftBox(w, 0.2, 1.5, craftMat(PAL.WATER, 'felt'));
          sheet.position.set(cx, cy + 0.94, 0);
          group.add(sheet);
          // the hand-cut edge at each end, so a puddle has a rim rather
          // than fading out — the seam IS the material
          for (const ex of [c - 0.02, e + 1.02]) {
            const rim = craftBox(0.12, 0.26, 1.52, craftMat(PAL.WATER_DK, 'felt'));
            rim.position.set(ex, cy + 0.94, 0); group.add(rim);
          }
        } else if (ch === 'T') {
          // a tarp: sheet stretched over a frame, and it SAGS in the middle,
          // because a flat one is a plank and reads as somewhere to stand
          for (let i = c; i <= e; i++) {
            const t = w === 1 ? 0 : (i - c) / (e - c) * 2 - 1;
            const sag = (1 - t * t) * 0.22;
            const sheet = craftBox(1, 0.14, 1.4, craftMat(PAL.CLOUD, 'felt'));
            sheet.position.set(i + 0.5, cy + 0.86 - sag, 0);
            group.add(sheet);
          }
          for (const bx of [c + 0.08, e + 0.92]) {
            box(0.16, 0.9, 0.5, mat.girder, bx, cy + 0.45, 0);
          }
        } else if (ch === 'H') {
          // a ladder: two stiles and a rung per tile, set forward of the
          // play plane so the rungs read against the earth behind them. It
          // goes through box() like everything else, so it is painted balsa
          // rather than the flat paint craft.js exists to stop.
          for (const sx of [cx - 0.3, cx + 0.3]) {
            box(0.12, 1, 0.12, mat.steel, sx, cy + 0.5, 0.45);
          }
          for (const ry of [0.2, 0.7]) {
            box(0.66, 0.1, 0.1, mat.girder, cx, cy + ry, 0.45);
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

    // ---- the pipes -------------------------------------------------------
    // Drawn AFTER the tile walk because a mouth is not a tile — it is a
    // place in front of the wall, the way a ladder's rungs are. The read it
    // has to carry is "you can go in here", and at 32 px that is one thing:
    // a DARK opening inside a bright rim. Nothing else about it matters.
    for (const q of this.def.pipes || []) {
      for (const m of [q.a, q.b]) {
        const x = m.c + 0.5, y = m.cy + 0.5;
        // the collar, painted balsa like every other made thing here
        const collar = craftBox(1.15, 1.15, 0.5, craftMat(PAL.STEEL[2], 'balsa'));
        collar.position.set(x, y, 0.5); group.add(collar);
        const rim = craftBox(1.35, 1.35, 0.22, craftMat(PAL.MACHINE, 'balsa'));
        rim.position.set(x, y, 0.42); group.add(rim);
        // …and the hole, which is the whole message
        const bore = craftBox(0.78, 0.78, 0.3, craftMat(PAL.INK, 'card'));
        bore.position.set(x, y, 0.66); group.add(bore);
      }
    }

    scene.add(group);
    return group;
  }
}
