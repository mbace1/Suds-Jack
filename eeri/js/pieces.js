// EERI — manipulable world pieces (ART_BRIEF §5.1): the things a machine
// digs, lifts or breaks. 3D rather than cutouts, because they are moved and
// changed in play.
//
// Each piece ships all of its states as sibling nodes (state0/state1/…) and
// the game shows exactly one at a time. That is the whole contract, so a
// real GLB drops in behind the same seam as everything else — see
// assets/README.md. Below is the code-built placeholder.
//
// The rule the art brief states and this file obeys: draw the CHANGE. A
// half-dug bank is not a shorter bank — it has a fresh cut face and spill
// at its foot.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=1';

export function buildBankModel(rows = 3, width = 5) {
  const root = new THREE.Group();
  const nodes = {};
  const M = (c) => new THREE.MeshLambertMaterial({ color: c });
  const box = (parent, w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };

  // one state per remaining height: state0 = untouched, and each later
  // state is a shorter bank with a cut face the bucket has left behind
  for (let s = 0; s < rows; s++) {
    const h = rows - s;                       // tiles still standing
    const g = new THREE.Group(); g.name = `state${s}`;
    box(g, width, h, 1.6, PAL.EARTH[1], width / 2, h / 2, 0);
    box(g, width, 0.16, 1.66, PAL.EARTH[2], width / 2, h - 0.08, 0);   // sunlit crown
    if (s === 0) {
      box(g, width, 0.14, 1.7, PAL.GREEN, width / 2, h - 0.02, 0);     // untouched: still turfed
    } else {
      // the cut face: raw, lighter, and it spills at the foot
      box(g, width, 0.1, 1.72, PAL.EARTH[3], width / 2, h - 0.05, 0);
      for (let i = 0; i < 5 + s * 3; i++) {
        const a = (i * 2.39) % 1, b = (i * 0.77) % 1;
        const r = 0.12 + b * 0.16;
        const sp = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), M(mix(PAL.EARTH[1], PAL.EARTH[3], b)));
        sp.position.set(a * width, r * 0.8, (b - 0.5) * 1.3);
        sp.rotation.set(a * 6, b * 6, a * 3);
        g.add(sp);
      }
    }
    root.add(g); nodes[`state${s}`] = g;
  }
  return { root, nodes };
}

export class Bank {
  // rect = { c0, c1, cy0, rows } in cells; the map is the collision
  constructor(scene, level, rect, asset) {
    this.level = level; this.rect = rect;
    this.dug = 0;
    this.n = asset.nodes;
    this.states = rect.rows;
    this.group = new THREE.Group();
    this.group.add(asset.root);
    this.group.position.set(rect.c0, rect.cy0, 0);
    scene.add(this.group);

    // dirt thrown by the bucket — pooled, so a dig has weight
    this.spray = [];
    const geo = new THREE.DodecahedronGeometry(0.16, 0);
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: PAL.EARTH[2] }));
      m.visible = false; m.life = 1;
      this.spray.push(m); scene.add(m);
    }
    this.show();
  }

  get remaining() { return this.rect.rows - this.dug; }
  get cleared() { return this.remaining <= 0; }

  show() {
    for (let s = 0; s < this.states; s++) {
      if (this.n[`state${s}`]) this.n[`state${s}`].visible = (s === this.dug);
    }
  }

  // one bucketful: the top row leaves the MAP, so the level really did change
  dig() {
    if (this.cleared) return false;
    const cy = this.rect.cy0 + this.remaining - 1;
    this.level.clearRow(this.rect.c0, this.rect.c1, cy);
    this.dug++;
    this.show();
    // throw dirt off the cut
    let n = 0;
    for (const p of this.spray) {
      if (p.life < 1 || n >= 6) continue;
      n++;
      p.life = 0; p.visible = true;
      p.position.set(this.rect.c0 + Math.random() * (this.rect.c1 - this.rect.c0 + 1), cy + 1, (Math.random() - 0.5) * 1.2);
      p.vx = -1.4 - Math.random() * 2.2;
      p.vy = 3.4 + Math.random() * 2.6;
    }
    return true;
  }

  update(dt) {
    for (const p of this.spray) {
      if (p.life >= 1) { p.visible = false; continue; }
      p.life = Math.min(1, p.life + dt / 0.9);
      p.vy -= 26 * dt;
      p.position.x += p.vx * dt;
      p.position.y += p.vy * dt;
      p.rotation.x += dt * 7; p.rotation.z += dt * 5;
      if (p.life >= 1) p.visible = false;
    }
  }
}
