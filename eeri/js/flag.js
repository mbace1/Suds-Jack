// EERI — the flag at the end of a level (DESIGN.md §4.2).
//
// It is not a gate you walk through, it is a thing that BUILDS. As Eeri
// comes down the last stretch it assembles itself in three phases, one
// puff of smoke each, and it finishes by being **run past** — no button,
// no stopping, no standing on a mark. A six-year-old should never have to
// work out what to press at the end of a level.
//
// Levels 1 and 2 of a world get the small flag; level 3 — the big one —
// gets a taller one in a different colour, so you can tell from a screen
// away which kind of level you are finishing.
//
// Behind the asset seam like everything else: `phase0/1/2` and `pole` are
// the node contract (assets/README.md), so a real GLB drops in with a
// status flip and no game code changes.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=3';

// how far out each phase assembles, in tiles before the flag
const PHASE_AT = [15, 10, 5.5];

export function buildFlagModel(big = false) {
  const root = new THREE.Group();
  const nodes = {};
  const M = (c) => new THREE.MeshLambertMaterial({ color: c });
  const box = (parent, w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };

  const H = big ? 6.4 : 4.8;
  const cloth = big ? PAL.HAZARD : PAL.MACHINE;   // the big one is a different colour
  const clothDk = big ? mix(PAL.HAZARD, PAL.INK, 0.3) : PAL.MACHINE_DK;

  // phase 0 — the base plate and the bolts waiting in it
  const p0 = new THREE.Group(); p0.name = 'phase0';
  box(p0, big ? 1.6 : 1.2, 0.22, big ? 1.6 : 1.2, PAL.STEEL[1], 0, 0.11, 0);
  for (const [dx, dz] of [[-0.4, 0.4], [0.4, 0.4], [-0.4, -0.4], [0.4, -0.4]]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.12, 6), M(PAL.DARK));
    b.position.set(dx, 0.26, dz); p0.add(b);
  }
  root.add(p0); nodes.phase0 = p0;

  // phase 1 — the pole goes up, braced
  const p1 = new THREE.Group(); p1.name = 'phase1';
  const pole = new THREE.Group(); pole.name = 'pole';
  box(pole, 0.17, H, 0.17, PAL.STEEL[2], 0, H / 2 + 0.2, 0);
  box(pole, 0.3, 0.14, 0.3, clothDk, 0, H + 0.24, 0);              // the finial
  p1.add(pole); nodes.pole = pole;
  for (const dx of [-0.55, 0.55]) {                                 // two braces
    const br = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.5, 0.1), M(PAL.STEEL[1]));
    br.position.set(dx, 0.85, 0); br.rotation.z = dx > 0 ? -0.5 : 0.5;
    p1.add(br);
  }
  root.add(p1); nodes.phase1 = p1;

  // phase 2 — the cloth, and the site sign under it
  const p2 = new THREE.Group(); p2.name = 'phase2';
  const w = big ? 2.8 : 2.0, h = big ? 1.8 : 1.3;
  box(p2, w, h, 0.06, cloth, w / 2 + 0.08, H - h / 2 + 0.1, 0);
  box(p2, w, 0.16, 0.07, clothDk, w / 2 + 0.08, H - h + 0.18, 0);   // its hem
  // a chevron stripe on the sign board, so it belongs to this worksite
  box(p2, w * 0.8, 0.3, 0.05, PAL.INK, w / 2 + 0.08, H - h * 0.55 + 0.1, 0.04);
  root.add(p2); nodes.phase2 = p2;

  return { root, nodes };
}

export class Flag {
  // x = where it stands; big = the level-3 flag
  constructor(scene, level, x, asset, big = false) {
    this.x = x;
    this.y = level.groundTop(x, 8);
    this.big = big;
    this.n = asset.nodes;
    this.phase = -1;            // nothing built yet
    this.done = false;
    this.raise = 0;             // 0…1 — how far the cloth has run up the pole

    this.group = new THREE.Group();
    this.group.add(asset.root);
    this.group.position.set(this.x, this.y, 0);
    scene.add(this.group);
    for (let i = 0; i < 3; i++) this.n[`phase${i}`].visible = false;

    // one puff per phase — pooled, because a build with no smoke reads as a
    // pop-in rather than as something being put up
    this.puffs = [];
    for (let i = 0; i < 10; i++) {
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 8, 7),
        new THREE.MeshBasicMaterial({ color: PAL.CLOUD, transparent: true, opacity: 0 }),
      );
      p.life = 1; this.puffs.push(p); scene.add(p);
    }
  }

  smoke(y, n = 4) {
    let made = 0;
    for (const p of this.puffs) {
      if (p.life < 1 || made >= n) continue;
      made++;
      p.life = 0;
      p.position.set(this.x + (Math.random() - 0.5) * 1.3, this.y + y + (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.9);
      p.scale.setScalar(0.5);
    }
  }

  // returns 'phase' when a piece just went up, 'done' on the run-past
  update(dt, kidX, reduced) {
    // build: each phase snaps in as he closes, and cannot un-build
    let announced = null;
    const dist = this.x - kidX;
    for (let i = 0; i < 3; i++) {
      if (this.phase >= i) continue;
      if (dist > PHASE_AT[i]) break;
      this.phase = i;
      this.n[`phase${i}`].visible = true;
      this.n[`phase${i}`].scale.set(1, 0.01, 1);          // it grows into place
      if (!reduced) this.smoke([0.2, 1.6, 3.2][i]);
      announced = 'phase';
    }
    // each built phase eases up to full height
    for (let i = 0; i <= this.phase; i++) {
      const g = this.n[`phase${i}`];
      if (g.scale.y < 1) g.scale.y = Math.min(1, g.scale.y + dt * (reduced ? 8 : 4.5));
    }

    // the cloth runs up once it exists, and keeps waving
    if (this.phase >= 2) {
      this.raise = Math.min(1, this.raise + dt * 0.9);
      const p2 = this.n.phase2;
      p2.position.y = (this.raise - 1) * 2.2;
      if (!reduced) p2.rotation.z = Math.sin(Date.now() * 0.004) * 0.03 * this.raise;
    }

    for (const p of this.puffs) {
      if (p.life >= 1) { p.material.opacity = 0; continue; }
      p.life = Math.min(1, p.life + dt / 1.1);
      p.position.y += 1.7 * dt;
      p.scale.setScalar(0.5 + p.life * 2.6);
      p.material.opacity = 0.75 * (1 - p.life);
    }

    // FINISHED BY RUNNING PAST — never by stopping on a mark
    if (!this.done && this.phase >= 2 && kidX > this.x + 0.4) {
      this.done = true;
      this.smoke(1.4, 6);
      return 'done';
    }
    return announced;
  }
}
