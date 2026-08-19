// EERI — World 2 / PIPEWORKS visual dressing.
//
// This is deliberately VISUAL ONLY. Collision stays in the room grid and
// the live pipeworks_* PNGs stay the authored parallax backdrop. This group
// bridges the gap between those large layers and the playable lane with the
// modular vocabulary in art-src/world-2-library/CATALOG.md:
// service walls, pipe racks, drainage pieces, pump/valve hardware and one
// high walkway. One or two strong identifiers per screen, never wallpaper.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=31';
import { craftMat, craftBox, cutQuad } from './craft.js?v=31';

export function buildPipeworksDressing(scene) {
  const root = new THREE.Group();
  root.name = 'pipeworks-playfield-dressing';
  scene.add(root);

  // Behind the actors and collision meshes. A few cut-face assets sit just
  // in front of the earth at y<4, where they cannot hide gameplay.
  const BACK_Z = -0.72;
  const FACE_Z = 0.86;

  // These materials are owned by this dressing group. Their craft texture
  // maps are shared by the central material cache, so dispose the materials
  // but never dispose those shared maps when a world swap tears us down.
  const ownedMats = new Set();
  const own = (m) => { ownedMats.add(m); return m; };
  const steel = own(craftMat(mix(PAL.STEEL[2], PAL.SKY_PALE, 0.12), 'balsa'));
  const steelDark = own(craftMat(mix(PAL.STEEL[0], PAL.INK, 0.16), 'balsa'));
  const yellow = own(craftMat(PAL.MACHINE, 'balsa'));
  const yellowDark = own(craftMat(PAL.MACHINE_DK, 'balsa'));
  const card = own(craftMat(mix(PAL.EARTH[2], PAL.SKY_PALE, 0.08), 'card'));
  const water = own(craftMat(PAL.WATER_DK, 'felt'));
  const pumpBlue = own(craftMat(mix(PAL.WATER_DK, PAL.STEEL[2], 0.35), 'balsa'));
  const ink = own(new THREE.MeshLambertMaterial({ color: PAL.DARK }));

  const box = (w, h, d, mat, x, y, z = BACK_Z) => {
    const m = craftBox(w, h, d, mat);
    m.position.set(x, y, z);
    root.add(m);
    return m;
  };

  const ring = (r, t, mat, x, y, z = BACK_Z + 0.1) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(r - t, r, 20), mat);
    m.position.set(x, y, z);
    root.add(m);
    return m;
  };

  const pipeMouth = (x, y, r = 0.62) => {
    ring(r, 0.18, steel, x, y);
    const bore = new THREE.Mesh(new THREE.CircleGeometry(r - 0.2, 20), ink);
    bore.position.set(x, y, BACK_Z + 0.08);
    root.add(bore);
  };

  const pipeStack = (x, y, s = 1) => {
    // Strapped triangular stack: the World-2 yard silhouette from the source
    // library, kept low and behind the lane.
    const pts = [[0, 0], [1.18, 0], [2.36, 0], [0.59, 1.02], [1.77, 1.02]];
    for (const [dx, dy] of pts) pipeMouth(x + dx * s, y + dy * s, 0.56 * s);
    box(3.15 * s, 0.14, 0.14, yellowDark, x + 1.18 * s, y + 0.5 * s, BACK_Z + 0.2);
  };

  const serviceWall = (x, w, h) => {
    // Broad card/cement connector with visible steel structural straps.
    box(w, h, 0.24, card, x + w / 2, 3.55 + h / 2);
    for (let sx = x + 0.7; sx < x + w; sx += 2.1) {
      box(0.18, h + 0.25, 0.12, steelDark, sx, 3.55 + h / 2, BACK_Z + 0.08);
    }
  };

  const valve = (x, y, r = 0.48) => {
    ring(r, 0.11, yellow, x, y, BACK_Z + 0.24);
    for (let a = 0; a < Math.PI; a += Math.PI / 4) {
      const spoke = box(r * 1.55, 0.08, 0.08, yellowDark, x, y, BACK_Z + 0.23);
      spoke.rotation.z = a;
    }
    const hub = new THREE.Mesh(new THREE.CircleGeometry(0.12, 10), ink);
    hub.position.set(x, y, BACK_Z + 0.26); root.add(hub);
  };

  const standpipe = (x, h = 2.5) => {
    box(0.42, h, 0.42, steel, x, 3.75 + h / 2);
    box(1.05, 0.38, 0.42, steelDark, x + 0.31, 3.75 + h - 0.22);
    valve(x, 3.75 + h * 0.66, 0.44);
  };

  const pumpPlatform = (x) => {
    // Small control/pump assembly: readable industrial punctuation, not an
    // interactable machine. The real ride remains visually dominant.
    box(4.6, 0.28, 1.0, steelDark, x + 2.3, 4.02);
    box(1.45, 1.65, 0.8, pumpBlue, x + 1.1, 4.95);
    box(0.9, 0.28, 0.82, yellow, x + 1.1, 5.64, BACK_Z + 0.05);
    // gauge
    ring(0.26, 0.07, steelDark, x + 1.1, 5.13, BACK_Z + 0.3);
    // short manifold and valve
    box(1.8, 0.34, 0.34, steel, x + 3.15, 4.82);
    valve(x + 3.65, 5.12, 0.38);
    // a folded blue felt hose at the foot
    const hose = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.09, 8, 20), water);
    hose.scale.y = 0.55;
    hose.position.set(x + 2.7, 4.25, BACK_Z + 0.12);
    root.add(hose);
  };

  const walkway = (x, w, y) => {
    // High crossing only: it frames the lane without pretending to be a
    // platform, because collision never comes from artwork.
    box(w, 0.26, 0.7, steelDark, x + w / 2, y);
    for (let px = x + 0.35; px < x + w; px += 1.55) {
      box(0.1, 1.2, 0.12, yellowDark, px, y + 0.72, BACK_Z + 0.02);
    }
    box(w, 0.1, 0.12, yellow, x + w / 2, y + 1.28, BACK_Z + 0.02);
  };

  const buriedPipe = (x, y, s = 1, rot = 0) => {
    // This is the actual live production cut-face asset, not a redraw or
    // palette-tinted substitute. The cutout material is cached by craft.js,
    // so its material belongs to that cache rather than this group.
    const q = cutQuad(1.9 * s, 0.8 * s, 'f_pipe');
    q.position.set(x, y, FACE_Z);
    q.rotation.z = rot;
    root.add(q);
  };

  // OPENING — pipe yard identity before the first hazard.
  pipeStack(7.2, 3.65, 0.82);
  buriedPipe(13.0, 2.55, 1.15, -0.08);

  // TRENCH / SERVICE WALL — a strong built connector with one valve, then
  // negative space around the actual shallow/deep-water reads.
  serviceWall(21.0, 6.8, 2.5);
  pipeMouth(24.4, 5.0, 0.82);
  standpipe(29.6, 2.15);

  // MIDPOINT — pump hardware sells the treatment-plant fantasy while the
  // checkpoint and traversal remain unobscured in front.
  pumpPlatform(42.0);
  buriedPipe(51.5, 2.2, 0.9, 0.12);

  // BACK HALF — elevated infrastructure frames the pipe/hoist sequences.
  walkway(57.0, 8.2, 9.6);
  pipeStack(69.2, 3.55, 0.72);
  standpipe(76.4, 2.8);

  // FINAL SCREEN — one large junction shape, leaving the ride/wall/flag
  // silhouette clear at play height.
  serviceWall(85.5, 6.0, 2.0);
  pipeMouth(87.2, 4.95, 0.72);
  pipeMouth(90.0, 4.95, 0.72);
  valve(93.0, 5.35, 0.52);

  return {
    root,
    dispose() {
      scene.remove(root);
      root.traverse((o) => o.geometry?.dispose?.());
      for (const m of ownedMats) m.dispose?.();
      ownedMats.clear();
    },
  };
}
