// EERI — World 2 / PIPEWORKS visual dressing.
//
// This is deliberately VISUAL ONLY. Collision stays in the room grid and
// the live pipeworks_* PNGs stay the authored parallax backdrop. This group
// bridges the gap between those large layers and the playable lane with the
// modular vocabulary in art-src/world-2-library/CATALOG.md:
// service walls, pipe racks, drainage pieces, pump/valve hardware and one
// high walkway. One or two strong identifiers per screen, never wallpaper.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=55';
import { craftMat, craftBox, cutQuad } from './craft.js?v=55';
import { placeScenery } from './scenery.js?v=55';

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

  // ---- placement is DATA now (js/scenery.js) ---------------------------
  // Everything above this line is the vocabulary and belongs to the art
  // lane; everything below used to be twenty literal calls and is now a
  // walk over rows. The numbers did not change — a refactor that also
  // retunes the picture is a refactor nobody can review. What changed is
  // that each built thing now carries the ROW that made it, which is the
  // handle dev/inspector.js has never had and the reason it cannot save.
  // Named once so the dev-page editor can reuse the exact same closures
  // for LIVE placement — a builder called by hand here and a builder called
  // by hand from a palette click are the same function, which is what
  // keeps a placed-in-the-editor prop indistinguishable from an authored
  // one.
  const builders = {
    pipeStack: (p) => pipeStack(p.x, p.y, p.s),
    buriedPipe: (p) => buriedPipe(p.x, p.y, p.s, p.rot),
    serviceWall: (p) => serviceWall(p.x, p.w, p.h),
    pipeMouth: (p) => pipeMouth(p.x, p.y, p.r),
    standpipe: (p) => standpipe(p.x, p.h),
    pumpPlatform: (p) => pumpPlatform(p.x),
    walkway: (p) => walkway(p.x, p.w, p.y),
    valve: (p) => valve(p.x, p.y, p.r),
  };
  placeScenery('pipeworks', builders, (_made, row) => {
    // The builders add straight to `root` and mostly return nothing, so the
    // tag goes on whatever they just added rather than on a return value.
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
