// EERI — the level. Design and collision live on an honest tile grid
// (ART_BRIEF §4); the dressing is drawn over it, but a standable lip is a
// tile edge, exactly. Collision never comes from artwork.
//
// World units = tiles. Cell (c, cy) spans x [c, c+1), y [cy, cy+1);
// cy counts up from the bottom of the map.

import * as THREE from 'three';
import { PAL } from './palette.js?v=1';

const W = 96, H = 18;
const EPS = 0.001;

function blankGrid() {
  return Array.from({ length: H }, () => new Array(W).fill(' '));
}

// The gate-1 room: a ground run, two dirt mounds, steel platforms, one pit,
// a girder — enough to prove run/jump/ride against real edges.
function buildMap() {
  const g = blankGrid();
  const fill = (r0, r1, c0, c1, ch) => {
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) g[r][c] = ch;
  };
  fill(14, 17, 0, W - 1, '#');       // ground band
  fill(14, 17, 46, 48, ' ');         // the pit
  fill(12, 13, 8, 14, '#');          // mound one (teaches the climb)
  fill(12, 13, 62, 68, '#');         // mound two
  fill(10, 10, 11, 16, '=');         // steel platform over mound one
  fill(11, 11, 52, 57, '=');         // platform past the pit
  fill(10, 10, 66, 72, 'G');         // girder off mound two
  return g;
}

const BOLTS = [
  [9, 12], [9, 13], [9, 14], [9, 15],
  [13, 34], [13, 35], [13, 36],
  [11, 46], [11, 47], [11, 48],       // the arc over the pit
  [10, 53], [10, 54], [10, 55], [10, 56],
  [9, 67], [9, 68], [9, 69], [9, 70], [9, 71],
];

export const SPAWN = { kid: { x: 4.5, y: 4 }, excavator: { x: 22.5, y: 4 } };

export class Level {
  constructor() {
    this.w = W; this.h = H;
    this.map = buildMap();
    this.boltCells = BOLTS.map(([r, c]) => ({ x: c + 0.5, y: (H - 1 - r) + 0.5 }));
  }

  solidCell(c, cy) {
    if (c < 0 || c >= W) return true;          // the world has ends
    if (cy < 0) return true;
    if (cy >= H) return false;
    const ch = this.map[H - 1 - cy][c];
    return ch === '#' || ch === '=' || ch === 'G';
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
    return -4; // over the pit: below the world
  }

  // ---- dressing: shallow 3D slabs wearing the flat-colour read -----------

  buildMeshes(scene) {
    const group = new THREE.Group();
    const mat = {
      dirt:  new THREE.MeshLambertMaterial({ color: PAL.EARTH[1] }),
      dirtDk:new THREE.MeshLambertMaterial({ color: PAL.EARTH[0] }),
      lip:   new THREE.MeshLambertMaterial({ color: PAL.GREEN }),
      steel: new THREE.MeshLambertMaterial({ color: PAL.STEEL[2] }),
      girder:new THREE.MeshLambertMaterial({ color: PAL.STEEL[1] }),
      bolt:  new THREE.MeshLambertMaterial({ color: PAL.DARK }),
    };
    const box = (w, h, d, m, x, y, z) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    };

    // the earth under everything — the world is not floating on sky, and
    // the pit reads as a hole with a dark floor instead of a window
    box(136, 10, 1.6, mat.dirtDk, 48, -5, 0);
    // …and a back wall behind the ground band, so the pit shows earth, not sky
    box(136, 3.98, 0.1, mat.dirtDk, 48, 2, -0.9);

    // merge horizontal runs per row so the slab count stays sane
    for (let r = 0; r < H; r++) {
      let c = 0;
      while (c < W) {
        const ch = this.map[r][c];
        if (ch === ' ') { c++; continue; }
        let e = c;
        while (e + 1 < W && this.map[r][e + 1] === ch) e++;
        const cy = H - 1 - r;
        const cx = (c + e + 1) / 2, w = e - c + 1;
        if (ch === '#') {
          const deep = r + 1 < H && this.map[r + 1][c] === '#';
          box(w, 1, 1.6, deep ? mat.dirt : mat.dirt, cx, cy + 0.5, 0);
          // grass lip on tops with air above — the ACCENT GREEN "safe edge" role
          if (r === 0 || this.map[r - 1][c] === ' ') {
            box(w, 0.14, 1.66, mat.lip, cx, cy + 0.94, 0);
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
