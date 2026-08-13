// EERI — the level. Design and collision live on an honest tile grid
// (ART_BRIEF §4); the dressing is drawn over it, but a standable lip is a
// tile edge, exactly. Collision never comes from artwork.
//
// World units = tiles. Cell (c, cy) spans x [c, c+1), y [cy, cy+1);
// cy counts up from the bottom of the map.
//
// v3: the level goes beyond one room. SITES is the whole game as data —
// each site is one room built on the same grammar: a kid-shaped obstacle,
// a machine-shaped lock, and an exit only the pair of them opens.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=2';

const W = 96, H = 18;
const EPS = 0.001;

function blankGrid() {
  return Array.from({ length: H }, () => new Array(W).fill(' '));
}
function filler(g) {
  return (r0, r1, c0, c1, ch) => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) g[r][c] = ch;
  };
}

export const SITES = [
  // SITE 1 — the dig. The PIT is kid-shaped — he clears it in a run and the
  // machine refuses a cliff — and the BANK is machine-shaped, three tiles of
  // dirt above his jump, taken down a row at a time by the bucket.
  {
    name: 'SITE 1',
    buildMap() {
      const g = blankGrid(); const fill = filler(g);
      fill(14, 17, 0, W - 1, '#');       // ground band
      fill(14, 17, 46, 48, ' ');         // THE PIT — the kid-shaped obstacle
      fill(12, 13, 8, 14, '#');          // mound one (teaches the climb)
      fill(10, 10, 11, 16, '=');         // steel platform over mound one
      fill(12, 12, 52, 57, '=');         // platform past the pit
      fill(10, 10, 66, 72, 'G');         // the girder the ball hangs from
      fill(11, 13, 84, 88, 'B');         // THE BANK — the machine-shaped lock
      return g;
    },
    bolts: [
      [9, 12], [9, 13], [9, 14], [9, 15],
      [13, 34], [13, 35], [13, 36],
      [11, 46], [11, 47], [11, 48],       // the arc over the pit
      [11, 53], [11, 54], [11, 55], [11, 56],
      [13, 76], [13, 77], [13, 78],       // the run to the bank
      [12, 90], [12, 91],                 // past it — only reachable once it is dug
    ],
    bank: { c0: 84, c1: 88, cy0: 4, rows: 3 },
    girder: null,
    ball: { px: 70, py: 8, len: 2.6, zoneW: 7.5 },
    exit: { x: 92.5, y: 4 },
    spawn: { kid: { x: 4.5, y: 4 }, excavator: { x: 61, y: 4 } },
    pits: [{ c0: 46, c1: 48, backX: 43 }],
    // authored framings (js/camera.js): the room pulls back where it is
    // asking you to READ something and closes in where it is not
    shots: [
      { x0: 40, x1: 52, z: 37.5, y: 3.0 },              // the pit: see both lips
      { x0: 52, x1: 74, z: 41, y: 3.4, lead: 2.2 },     // the machine's cycle, and the ball
      { x0: 76, x1: 96, z: 42, y: 3.6, lead: 2.0 },     // the bank: a lock you cannot see is not a lock
    ],
  },

  // SITE 2 — the girder. THE GAP is past both of them: eight tiles, beyond
  // the kid's jump, and the machine refuses the cliff. The girder comes off
  // its stack slung under the bucket and seats as a span — the second
  // manipulable piece, and the map changes the way the dig changed it.
  // The kid pit by the start pens the machine in; the kid crosses to it.
  {
    name: 'SITE 2',
    buildMap() {
      const g = blankGrid(); const fill = filler(g);
      fill(14, 17, 0, W - 1, '#');       // ground band
      fill(14, 17, 20, 22, ' ');         // the kid pit — the machine's pen wall
      fill(12, 13, 8, 11, '#');          // mound by the start
      fill(10, 10, 9, 14, '=');          // platform over it, jumped from the mound
      fill(14, 17, 58, 65, ' ');         // THE GAP — no jump reaches, no machine dares
      return g;
    },
    bolts: [
      [9, 10], [9, 11], [9, 12],          // over the start platform
      [11, 20], [11, 21], [11, 22],       // the arc over the pit
      [13, 34], [13, 35], [13, 36],       // the walk to the machine
      [11, 61], [11, 62],                 // over the gap — only from the span
      [12, 70], [12, 71],                 // jumped for, past the gap
      [13, 84], [13, 85],                 // the run out
    ],
    bank: null,
    girder: {
      stackX: 48,                         // where the girder waits on its trestles
      gap: { c0: 58, c1: 65, cy: 3 },     // the row the span fills
      seat: { x0: 53.6, x1: 57.3 },       // machine at the lip = close enough to lower it in
      spanLen: 9.8,
    },
    ball: null,
    exit: { x: 92.5, y: 4 },
    spawn: { kid: { x: 4.5, y: 4 }, excavator: { x: 30, y: 4 } },
    pits: [{ c0: 20, c1: 22, backX: 17 }, { c0: 58, c1: 65, backX: 55 }],
    shots: [
      { x0: 16, x1: 26, z: 37.5, y: 3.0 },              // the kid pit
      // the stack and the gap in one frame: the girder has to be visibly
      // the answer to the thing eight tiles wide
      { x0: 42, x1: 72, z: 44, y: 3.8, lead: 2.2 },
    ],
  },
];

export class Level {
  constructor(def = SITES[0]) {
    this.def = def;
    this.w = W; this.h = H;
    this.map = def.buildMap();
    this.boltCells = def.bolts.map(([r, c]) => ({ x: c + 0.5, y: (H - 1 - r) + 0.5 }));
  }

  solidCell(c, cy) {
    if (c < 0 || c >= W) return true;          // the world has ends
    if (cy < 0) return true;
    if (cy >= H) return false;
    const ch = this.map[H - 1 - cy][c];
    return ch === '#' || ch === '=' || ch === 'G' || ch === 'B';
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
    const dirtMats = new Map();
    const dirtMat = (c) => {
      if (!dirtMats.has(c)) dirtMats.set(c, new THREE.MeshLambertMaterial({ color: c }));
      return dirtMats.get(c);
    };
    const box = (w, h, d, m, x, y, z) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
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
    for (const b of DEEP) {
      box(136, b.y1 - b.y0, 1.6, dirtMat(b.c), 48, (b.y0 + b.y1) / 2, 0);
    }
    // …and a back wall behind the ground band, darker than any face, so a
    // pit reads as a hole receding rather than a notch cut in a wall
    box(136, 3.98, 0.1, mat.back, 48, 2, -0.9);

    // cobbles embedded in the face — deterministic, so a screenshot of the
    // same frame is the same picture twice
    const cobGeo = new THREE.DodecahedronGeometry(1, 0);
    let seed = 1337;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let i = 0; i < 90; i++) {
      const x = rnd() * 136 - 20;
      const y = -0.4 - rnd() * rnd() * 8;
      const s = 0.12 + rnd() * 0.26;
      const c = rnd() < 0.35 ? PAL.STEEL[0] : mix(PAL.EARTH[0], PAL.INK, 0.5 + rnd() * 0.2);
      const m = new THREE.Mesh(cobGeo, dirtMat(c));
      m.position.set(x, y, 0.82);
      m.scale.set(s, s * 0.8, s * 0.5);
      m.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
      group.add(m);
    }

    // merge horizontal runs per row so the slab count stays sane
    for (let r = 0; r < H; r++) {
      let c = 0;
      while (c < W) {
        const ch = this.map[r][c];
        if (ch === ' ' || ch === 'B') { c++; continue; }   // the bank is a piece
        let e = c;
        while (e + 1 < W && this.map[r][e + 1] === ch) e++;
        const cy = H - 1 - r;
        const cx = (c + e + 1) / 2, w = e - c + 1;
        if (ch === '#') {
          box(w, 1, 1.6, dirtMat(strata(cy)), cx, cy + 0.5, 0);
          // grass lip on tops with air above — the ACCENT GREEN "safe edge"
          // role — and a hard shadow under it. The lip is where the game is
          // played; without the shadow it was a 0.14 hairline on a flat wall.
          if (r === 0 || this.map[r - 1][c] === ' ') {
            box(w, 0.14, 1.66, mat.lip, cx, cy + 0.94, 0);
            box(w, 0.22, 1.68, mat.shade, cx, cy + 0.76, 0);
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
