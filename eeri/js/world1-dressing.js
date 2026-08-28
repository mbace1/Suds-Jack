// EERI — World 1 / GROUNDWORKS visual dressing.
//
// The same job world2-dressing.js does for pipeworks, off the same rule:
// collision stays in the room grid, the live groundworks_* PNGs stay the
// authored parallax backdrop, and this bridges the gap between those large
// layers and the playable lane with the modular vocabulary
// art-src/world-1-library/CATALOG.md already names — a hazard barrier, a
// material yard (pipe stack beside a pallet), a scaffold bay, a gabled
// half-built frame, a taped billboard, a crate cluster. One or two strong
// identifiers per screen, never wallpaper, same as pipeworks.
//
// GROUNDWORKS is the FIRST world a player sees, so it is worth naming what
// this buys over the bare parallax: a level that plays IDENTICALLY without
// this file, and reads like a WORKSITE rather than a corridor with it — the
// same distance world2-dressing closed for the pipe yard.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=51';
import { craftMat, craftBox } from './craft.js?v=51';
import { placeScenery } from './scenery.js?v=51';

export function buildGroundworksDressing(scene) {
  const root = new THREE.Group();
  root.name = 'groundworks-playfield-dressing';
  scene.add(root);

  // Behind the actors and collision meshes — the same lane world2-dressing
  // uses, so a level that carries both worlds' habits (none does yet, but
  // nothing here assumes it cannot) never has to reconcile two z rules.
  const BACK_Z = -0.72;

  const ownedMats = new Set();
  const own = (m) => { ownedMats.add(m); return m; };
  const timber = own(craftMat(mix(PAL.EARTH[1], PAL.SKY_PALE, 0.06), 'balsa'));
  const timberDk = own(craftMat(PAL.EARTH[0], 'balsa'));
  const kraft = own(craftMat(mix(PAL.EARTH[2], PAL.SKY_PALE, 0.1), 'card'));
  const steel = own(craftMat(mix(PAL.STEEL[2], PAL.SKY_PALE, 0.1), 'balsa'));
  const steelDk = own(craftMat(PAL.STEEL[0], 'balsa'));
  const yellow = own(craftMat(PAL.MACHINE, 'balsa'));
  const ink = own(new THREE.MeshLambertMaterial({ color: PAL.INK }));
  const board = own(craftMat(mix(PAL.SKY_PALE, PAL.CLOUD, 0.4), 'card'));

  const box = (w, h, d, mat, x, y, z = BACK_Z) => {
    const m = craftBox(w, h, d, mat);
    m.position.set(x, y, z);
    root.add(m);
    return m;
  };

  // ---- HAZARD BARRIER — the catalog's `hazard-barricade-frame-a`: a flat
  // black/yellow striped board on two posts, no product-render feet, the
  // stripe language `pieces.js`'s bank sign already uses.
  const hazardBarrier = (x, w = 2.4) => {
    box(0.14, 1.1, 0.14, timberDk, x - w / 2 + 0.1, 0.55, BACK_Z + 0.05);
    box(0.14, 1.1, 0.14, timberDk, x + w / 2 - 0.1, 0.55, BACK_Z + 0.05);
    const b = box(w, 0.7, 0.1, yellow, x, 1.15, BACK_Z + 0.08);
    for (let i = 0; i < 4; i++) {
      const st = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.9, 0.11), ink);
      st.position.set(x - w / 2 + 0.4 + i * (w - 0.8) / 3, 1.15, BACK_Z + 0.09);
      st.rotation.z = 0.5;
      root.add(st);
    }
  };

  // ---- MATERIAL YARD — the catalog's `material-yard-a`: a strapped pipe
  // pyramid beside kraft/corrugated sheet stacks. `ring` is world2's own
  // pipe-mouth shape at World 1 scale.
  const ring = (r, t, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(r - t, r, 18), mat);
    m.position.set(x, y, z);
    root.add(m);
  };
  const materialYard = (x, y = 0) => {
    const pts = [[0, 0], [0.98, 0], [1.96, 0], [0.49, 0.86], [1.47, 0.86]];
    for (const [dx, dy] of pts) ring(0.46, 0.15, steel, x + dx, y + dy + 0.46, BACK_Z + 0.1);
    box(2.4, 0.1, 0.1, steelDk, x + 0.98, y + 0.96, BACK_Z + 0.2);
    // kraft sheet stack beside it, alternating tones so it reads as a
    // stack of individual sheets rather than one tall block
    for (let i = 0; i < 4; i++) {
      box(1.3, 0.14, 0.9, i % 2 ? kraft : timber, x + 2.7, y + 0.1 + i * 0.16, BACK_Z + 0.1);
    }
  };

  // ---- SCAFFOLD BAY — the catalog's `scaffold-bay-a`: a modular cross-
  // braced bay, designed to repeat.
  const scaffoldBay = (x, w = 2.6, h = 3.6) => {
    for (const dx of [0, w]) box(0.14, h, 0.14, steel, x + dx, h / 2, BACK_Z + 0.05);
    for (let dy = 1.1; dy < h; dy += 1.1) box(w, 0.1, 0.1, steelDk, x + w / 2, dy, BACK_Z + 0.06);
    const brace1 = box(Math.hypot(w, 1.1), 0.08, 0.08, steelDk, x + w / 2, h * 0.55, BACK_Z + 0.07);
    brace1.rotation.z = Math.atan2(1.1, w);
    const brace2 = box(Math.hypot(w, 1.1), 0.08, 0.08, steelDk, x + w / 2, h * 0.55, BACK_Z + 0.07);
    brace2.rotation.z = -Math.atan2(1.1, w);
  };

  // ---- GABLE FRAME — the catalog's `frame-gable-a`: the tallest
  // identifier on the site, a half-built pitched timber frame. One per
  // world is plenty — it reads as THE landmark rather than a repeat.
  const gableFrame = (x, w = 4.2, h = 3.4) => {
    for (const dx of [0, w]) box(0.2, h, 0.2, timber, x + dx, h / 2, BACK_Z);
    const rise = 1.3;
    const rafterL = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(w / 2, rise), 0.16, 0.16), timber);
    rafterL.position.set(x + w / 4, h + rise / 2, BACK_Z + 0.02);
    rafterL.rotation.z = Math.atan2(rise, w / 2);
    root.add(rafterL);
    const rafterR = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(w / 2, rise), 0.16, 0.16), timber);
    rafterR.position.set(x + 3 * w / 4, h + rise / 2, BACK_Z + 0.02);
    rafterR.rotation.z = -Math.atan2(rise, w / 2);
    root.add(rafterR);
    for (let dy = h * 0.3; dy < h; dy += h * 0.32) box(w, 0.1, 0.1, timberDk, x + w / 2, dy, BACK_Z + 0.03);
  };

  // ---- BILLBOARD — the catalog's `billboard-blank-a`: a blank taped
  // board on a single post, cut off at the foot (no baked ground strip
  // here — the level's own ground line owns that).
  const billboard = (x, h = 2.6) => {
    box(0.16, h, 0.16, timberDk, x, h / 2, BACK_Z + 0.04);
    box(2.0, 1.2, 0.08, board, x, h, BACK_Z + 0.06);
    box(2.0, 0.06, 0.09, timberDk, x - 0.4, h + 0.44, BACK_Z + 0.07);
    box(2.0, 0.06, 0.09, timberDk, x + 0.3, h - 0.3, BACK_Z + 0.07);
  };

  // ---- CRATE CLUSTER — the catalog's site-kit crates/pipes/cones: a low
  // stack that reads as "materials waiting", not a hazard and not a
  // landmark — the filler between the two strong identifiers either side.
  const crateCluster = (x, y = 0) => {
    box(0.9, 0.7, 0.9, kraft, x, y + 0.35, BACK_Z + 0.1);
    box(0.8, 0.6, 0.8, timber, x + 0.85, y + 0.3, BACK_Z + 0.12);
    box(0.7, 0.7, 0.7, kraft, x + 0.5, y + 1.0, BACK_Z + 0.11);
  };

  // Named once, same reason world2-dressing names its own: the dev-page
  // editor reuses the exact closures for live placement.
  const builders = { hazardBarrier, materialYard, scaffoldBay, gableFrame, billboard, crateCluster };
  placeScenery('groundworks', builders, (_made, row) => {
    for (let i = root.children.length - 1; i >= 0 && !root.children[i].userData.sceneryRow; i--) {
      root.children[i].userData.sceneryRow = row;
    }
  });

  return {
    root,
    builders,
    dispose() {
      scene.remove(root);
      root.traverse((o) => o.geometry?.dispose?.());
      for (const m of ownedMats) m.dispose?.();
      ownedMats.clear();
    },
  };
}
