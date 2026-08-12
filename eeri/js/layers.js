// EERI — the diorama (ART_BRIEF §3.1–3.2). The environment is cutout
// layers: flat-colour painted shapes at real z-depths, so parallax and
// overlap come from the actual camera. In production these are PNG assets;
// in the gate-1 slice they are painted here into CanvasTextures — same
// shapes, same depths, same palette, swappable for files one layer at a
// time without touching the scene.
//
// Every layer is painted with its depth tint baked in (colours pushed
// toward the sky), shading agreeing with the upper-left key.

import * as THREE from 'three';
import { PAL, LAYER_Z, LAYER_TINT, mix } from './palette.js?v=1';
import { getLayerTexture } from './assets.js?v=1';

export const PPU = 30; // canvas pixels per world unit

// The world rects each layer occupies. These are the asset contract for 2D:
// a live PNG for a layer must be painted to this rect at PPU px per unit
// (sizes listed in assets/README.md). The plane is the same either way —
// only where the pixels come from changes.
export const LAYER_RECTS = {
  sky:     { z: LAYER_Z.SKY,     x0: -60, x1: 170, y0: -6, y1: 40 },
  skyline: { z: LAYER_Z.SKYLINE, x0: -30, x1: 130, y0: 0, y1: 30 },
  far:     { z: LAYER_Z.FAR,     x0: -20, x1: 120, y0: 0, y1: 20 },
  mid:     { z: LAYER_Z.MID,     x0: -12, x1: 110, y0: 0, y1: 14 },
  near:    { z: LAYER_Z.NEAR,    x0: -8,  x1: 104, y0: 0, y1: 8 },
  fore:    { z: LAYER_Z.FORE,    x0: -8,  x1: 104, y0: -1, y1: 5 },
};

function paintCanvas({ x0, x1, y0, y1, draw, tint }) {
  const w = x1 - x0, h = y1 - y0;
  const cv = document.createElement('canvas');
  cv.width = Math.min(4096, Math.round(w * PPU));
  cv.height = Math.round(h * PPU);
  const g = cv.getContext('2d');
  const sx = cv.width / w, sy = cv.height / h;
  // painter works in world units, y-up, origin at (x0, y0)
  g.setTransform(sx, 0, 0, -sy, -x0 * sx, y1 * sy);
  const T = (c) => (tint > 0 ? mix(c, PAL.SKY_PALE, tint) : c);
  draw(g, T);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function mountLayer(scene, rect, tex) {
  const w = rect.x1 - rect.x0, h = rect.y1 - rect.y0;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true }),
  );
  mesh.position.set(rect.x0 + w / 2, rect.y0 + h / 2, rect.z);
  scene.add(mesh);
  return mesh;
}

const rect = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

// ---- the individual paintings ------------------------------------------

function drawSky(g) {
  // bands, not gradients — but the sky itself may breathe a little
  const grad = g.createLinearGradient(0, 34, 0, 0);
  grad.addColorStop(0, PAL.SKY);
  grad.addColorStop(1, mix(PAL.SKY, PAL.SKY_PALE, 0.75));
  g.fillStyle = grad; g.fillRect(-40, 0, 240, 40);
  // sun, pale and flat
  g.fillStyle = mix(PAL.CLOUD, PAL.SKY, 0.15);
  g.beginPath(); g.arc(120, 30, 3.4, 0, 7); g.fill();
  // flat cloud shapes: stacked rounded bars
  g.fillStyle = PAL.CLOUD;
  const cloud = (x, y, s) => {
    rect(g, PAL.CLOUD, x, y, 9 * s, 1.1 * s);
    rect(g, PAL.CLOUD, x + 1.6 * s, y + 1.1 * s, 5.4 * s, 1.0 * s);
    rect(g, PAL.CLOUD, x + 3.0 * s, y + 2.1 * s, 2.6 * s, 0.8 * s);
  };
  cloud(4, 26, 1); cloud(48, 30, 1.4); cloud(96, 24, 0.9); cloud(150, 29, 1.2);
}

function drawSkyline(g, T) {
  // distant city blocks + two tower cranes — nameable from silhouette
  const base = 3.4;
  const block = (x, w, h) => {
    rect(g, T(PAL.STEEL[1]), x, base, w, h);
    rect(g, T(PAL.STEEL[2]), x, base, w * 0.42, h); // lit left face
  };
  block(-6, 8, 9); block(6, 6, 13); block(16, 10, 7); block(30, 7, 11);
  block(42, 9, 8); block(56, 6, 15); block(66, 10, 9); block(82, 8, 12);
  block(94, 7, 8); block(104, 9, 10);
  const crane = (x, h, arm) => {
    const c = T(PAL.MACHINE_DK);
    rect(g, c, x, base, 0.7, h);
    rect(g, c, x - arm * 0.28, base + h, arm, 0.6);
    rect(g, c, x + arm * 0.55, base + h - 3.2, 0.16, 3.2); // hoist line
    rect(g, c, x + arm * 0.47, base + h - 3.6, 0.5, 0.5);  // the hook block
  };
  crane(24, 17, 12); crane(74, 20, 14);
}

function drawFar(g, T) {
  // half-built concrete frames: columns and slabs, sky showing through
  const base = 3.6;
  const frame = (x, bays, floors) => {
    const bw = 3.2, fh = 2.4;
    for (let f = 0; f <= floors; f++) {
      rect(g, T(PAL.STEEL[3]), x - 0.3, base + f * fh, bays * bw + 0.6, 0.5);
    }
    for (let b = 0; b <= bays; b++) {
      rect(g, T(PAL.STEEL[2]), x + b * bw, base, 0.55, floors * fh);
    }
    // one bay wears hoarding — machine yellow lives in the depth too
    rect(g, T(PAL.MACHINE), x + bw * (bays - 1), base, bw, fh * 0.9);
  };
  frame(2, 4, 3); frame(34, 5, 2); frame(58, 3, 4); frame(84, 4, 2);
  // dirt line along the bottom so the frames stand on something
  rect(g, T(PAL.EARTH[2]), -10, 2.2, 130, 1.6);
}

function drawMid(g, T) {
  // scaffold bays with braces + plywood hoarding — the built stage showing
  const base = 3.8;
  const scaffold = (x, bays, lifts) => {
    const bw = 2.6, lh = 2.0;
    g.strokeStyle = T(PAL.STEEL[1]); g.lineWidth = 0.22;
    for (let b = 0; b <= bays; b++) {
      rect(g, T(PAL.STEEL[1]), x + b * bw, base, 0.28, lifts * lh);
    }
    for (let l = 1; l <= lifts; l++) {
      rect(g, T(PAL.EARTH[3]), x, base + l * lh, bays * bw + 0.28, 0.34); // plank
    }
    for (let b = 0; b < bays; b++) { // diagonal braces
      g.beginPath();
      g.moveTo(x + b * bw + 0.14, base);
      g.lineTo(x + (b + 1) * bw + 0.14, base + lh);
      g.stroke();
    }
  };
  const hoarding = (x, w) => {
    rect(g, T(PAL.EARTH[3]), x, base, w, 2.6);           // plywood
    rect(g, T(PAL.EARTH[2]), x, base + 2.2, w, 0.4);     // top rail
    for (let i = 0.6; i < w; i += 2.2) {                  // bolt heads
      rect(g, T(PAL.INK), x + i, base + 1.2, 0.22, 0.22);
    }
  };
  scaffold(6, 3, 3); hoarding(20, 9); scaffold(40, 4, 2);
  hoarding(58, 7); scaffold(72, 3, 4); hoarding(88, 10);
  rect(g, T(PAL.EARTH[1]), -10, 2.6, 130, 1.4); // ground line
}

function drawNear(g, T) {
  // dirt banks, pipe stacks, cones — just behind the action
  const base = 3.9;
  const bank = (x, w, h) => {
    g.fillStyle = T(PAL.EARTH[1]);
    g.beginPath();
    g.moveTo(x, base); g.lineTo(x + w * 0.3, base + h);
    g.lineTo(x + w * 0.7, base + h); g.lineTo(x + w, base);
    g.closePath(); g.fill();
    rect(g, T(PAL.EARTH[0]), x + w * 0.55, base + h - 0.28, w * 0.32, 0.28); // shade side
  };
  const pipes = (x, n) => {
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < n - r; i++) {
        g.fillStyle = T(r ? PAL.STEEL[3] : PAL.STEEL[2]);
        g.beginPath();
        g.arc(x + i * 1.1 + r * 0.55, base + 0.55 + r * 0.95, 0.55, 0, 7);
        g.fill();
        g.fillStyle = T(PAL.STEEL[0]);
        g.beginPath();
        g.arc(x + i * 1.1 + r * 0.55, base + 0.55 + r * 0.95, 0.26, 0, 7);
        g.fill();
      }
    }
  };
  const cone = (x) => {
    g.fillStyle = T(PAL.VEST);
    g.beginPath();
    g.moveTo(x, base); g.lineTo(x + 0.3, base + 0.85); g.lineTo(x + 0.6, base);
    g.closePath(); g.fill();
    rect(g, T(PAL.CLOUD), x + 0.12, base + 0.34, 0.36, 0.16);
  };
  bank(2, 6, 1.8); pipes(26, 4); bank(38, 5, 1.4); cone(50); cone(51.2);
  bank(74, 7, 2.1); pipes(88, 3); cone(60);
}

function drawFore(g) {
  // the occluder lane: sparse, dark, cropped by the frame —
  // "cropped foreground = depth", in-game
  const c = mix(PAL.STEEL[0], PAL.INK, 0.4);
  rect(g, c, 40, 0, 14, 1.5);                       // girder crossing low
  rect(g, mix(PAL.MACHINE_DK, PAL.INK, 0.35), 42, 1.5, 1.0, 0.5); // clamp
  for (let i = 41; i < 53.4; i += 2.4) rect(g, PAL.INK, i, 0.55, 0.3, 0.3);
  rect(g, c, 78, 0, 1.1, 2.6);                      // a post
}

const PLACEHOLDER_DRAW = {
  skyline: { draw: drawSkyline, tint: LAYER_TINT.SKYLINE },
  far:     { draw: drawFar,     tint: LAYER_TINT.FAR },
  mid:     { draw: drawMid,     tint: LAYER_TINT.MID },
  near:    { draw: drawNear,    tint: LAYER_TINT.NEAR },
  fore:    { draw: drawFore,    tint: 0 },
};

// world = the level's theme; each named layer asks the asset seam for a
// live PNG first and paints its placeholder if there is none.
export async function buildLayers(scene, world = 'groundworks') {
  mountLayer(scene, LAYER_RECTS.sky, paintCanvas({ ...LAYER_RECTS.sky, tint: 0, draw: drawSky }));
  for (const name of ['skyline', 'far', 'mid', 'near', 'fore']) {
    const rect = LAYER_RECTS[name];
    const live = await getLayerTexture(world, name);
    mountLayer(scene, rect, live || paintCanvas({ ...rect, ...PLACEHOLDER_DRAW[name] }));
  }
}
