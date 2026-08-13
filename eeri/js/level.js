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
import { PAL, mix } from './palette.js?v=2';
import { getTexture } from './assets.js?v=2';

import { ROOMS } from './rooms.js?v=1';
import { compile, W, H, SOLID_CHARS, GROUND } from './parts.js?v=1';

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
    // Every EARTH surface takes the crafted card grain; steel and bolts stay
    // clean, because one material language does not mean one material.
    const grained = [];
    const grain = (m, scale = 1) => { m.__grain = scale; grained.push(m); return m; };
    const dirtMats = new Map();
    const dirtMat = (c) => {
      if (!dirtMats.has(c)) dirtMats.set(c, grain(new THREE.MeshLambertMaterial({ color: c })));
      return dirtMats.get(c);
    };
    grain(mat.cut, 2.2); grain(mat.shade, 2.2); grain(mat.back, 0.7); grain(mat.lip, 3);
    // UVs in WORLD SPACE, not per face. BoxGeometry maps 0…1 across every
    // face whatever its size, so one shared material with one repeat stretched
    // the card over a 136-unit earth band and squashed it onto a 1-unit cell —
    // it read as horizontal streaking, not as card. Scaling each box's own UVs
    // by its own size gives every surface the same texel density.
    const TILE = 5;
    const box = (w, h, d, m, x, y, z) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      if (m.__grain) {
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) {
          uv.setXY(i, uv.getX(i) * (w / TILE) * m.__grain, uv.getY(i) * (h / TILE) * m.__grain);
        }
        uv.needsUpdate = true;
      }
      const mesh = new THREE.Mesh(geo, m);
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
        // a bank and a wall are PIECES — they carry their own states and are
        // built by pieces.js, so the tile painter leaves their cells alone
        if (ch === ' ' || ch === 'B' || ch === 'K') { c++; continue; }
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
    // the grain lands whenever it lands; the room is already playable. A
    // texture must never be able to delay or block a level build.
    getTexture('card').then((tex) => {
      if (!tex) return;
      for (const m of grained) { m.map = tex; m.needsUpdate = true; }
    });

    scene.add(group);
    return group;
  }
}
