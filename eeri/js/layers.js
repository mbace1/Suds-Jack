// EERI — the diorama (ART_BRIEF §3.1–3.2). The environment is cutout
// layers: flat-colour painted shapes at real z-depths, so parallax and
// overlap come from the actual camera. In production these are PNG assets;
// in the gate-1 slice they are painted here into CanvasTextures — same
// shapes, same depths, same palette, swappable for files one layer at a
// time without touching the scene.
//
// Every layer is painted with its depth tint baked in (colours pushed
// toward the sky), shading agreeing with the upper-left key.
//
// v4 — the Tropical Freeze pass. Three rules the stack now obeys, because
// the LOOK said it did not:
//   1. THE FOREGROUND CROPS THE FRAME. The fore rect used to stop at y=5,
//      a tile above the ground line, so its pieces could never reach the
//      top of the screen and sat buried in the dirt instead of passing in
//      front of the action. It runs −2…14 now, which is the whole visible
//      band at that depth, and it carries a real kit.
//   2. DISTANCE IS VALUE, NOT JUST HUE. A haze band sits the far stack in
//      air and the skyline lost its internal contrast — it was as crisp as
//      the playfield and fought it.
//   3. THE BACKGROUND WORKS. One digging machine was one event in 96
//      tiles; a crane traverses a load across the skyline and a truck
//      crosses the far road, slow enough never to pull the eye.

import * as THREE from 'three';
import { PAL, LAYER_Z, LAYER_TINT, mix } from './palette.js?v=34';
import { getLayerTexture } from './assets.js?v=34';
import { buildPipeworksDressing } from './world2-dressing.js?v=34';

// CANVAS PIXELS PER WORLD UNIT — no longer one number (v15.23).
//
// Resolution has to follow how close a lane is to the camera, because that is
// what decides whether its painting is magnified on screen. The play plane
// shows at about 57 px per world unit and the fore lane, magnified by its own
// depth, at about 69. Every lane was stored at 30, so everything near the
// camera was displayed at roughly twice its painted resolution through a
// LinearFilter — the soft, smeared read that "not HD" names.
//
// The close lanes go to the 4096 cap and no further. That cap is the texture
// size a modest phone GPU is guaranteed to accept, and a layer that fails to
// upload is not a soft layer, it is a missing one. Over a 112-unit rect the
// ceiling is 36.6 px/unit, so this buys 22% and not the 60% the camera wants.
//
// `PPU` stays exported at the old value: it is the CODE-DRAWN fallback's
// density, and those are painted per level rather than shipped, so nothing is
// gained by making them heavier.
export const PPU = 30; // canvas pixels per world unit (code-drawn fallback)

// THE EXACT PIXEL SIZE a shipped layer must be painted to, per lane. A table
// and not a formula, and that is deliberate: the far lanes are NOT square-
// pixeled — they are painted at 30 px/unit vertically and then squashed
// horizontally by the 4096 cap (assets/README.md's footnote calls this out).
// A derivation clean enough to describe the close lanes silently disagreed
// with the three that already shipped, so the table is the contract.
//
// THREE PLACES MUST AGREE and test/smoke.cjs holds them to each other:
// this table, `LANES` in art-src/tools/build-worlds.mjs, and the size table in
// assets/README.md. A painting at the wrong size does not fail — it STRETCHES
// onto the plane, which looks like slightly worse art rather than a bug.
export const LAYER_PX = {
  sky:     { pxW: 4096, pxH: 1380 },
  skyline: { pxW: 4096, pxH: 900 },
  far:     { pxW: 4096, pxH: 600 },
  // raised in v15.23: these sit close enough to be magnified on screen.
  // `tiles` is how many textures the lane ships as, laid left to right; pxW
  // is the size of EACH tile, so a 2-tile lane carries 2 x pxW across its
  // rect and that is what gets it past the 4096 cap.
  mid:     { pxW: 4096, pxH: 940, tiles: 2 },
  near:    { pxW: 4096, pxH: 586, tiles: 2 },
  fore:    { pxW: 4096, pxH: 585 },
};

export function layerPx(name) {
  return LAYER_PX[name] || null;
}

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
  // the occluder lane: tall enough to be CROPPED by the frame, top and
  // bottom, which is the whole point of a foreground
  fore:    { z: LAYER_Z.FORE,    x0: -8,  x1: 104, y0: -2, y1: 14 },
};

// Where the ground line falls on each plane. Nearer ground sits lower in
// frame, so the fore lane stands below the playfield's y=4 — that offset
// is what stops a foreground piece reading as a thing standing on the path.
const FORE_GROUND = 3.4;

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

// Mounts a lane. `tex` is one texture or an ARRAY of them, and an array is
// laid left to right across the rect in equal columns — the lane is one
// painting that happens to be stored in more than one file, which is how a
// close lane gets past the 4096 texture cap.
//
// Returns an array of meshes either way, because `dispose()` has to take down
// everything it put up: a plane left in the scene is a full-width quad still
// drawing behind the new world, and the near ones are opaque.
function mountLayer(scene, rect, tex) {
  const texs = Array.isArray(tex) ? tex : [tex];
  const w = rect.x1 - rect.x0, h = rect.y1 - rect.y0;
  const cw = w / texs.length;
  return texs.map((t, i) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(cw, h),
      new THREE.MeshBasicMaterial({ map: t, transparent: true }),
    );
    mesh.position.set(rect.x0 + cw * (i + 0.5), rect.y0 + h / 2, rect.z);
    scene.add(mesh);
    return mesh;
  });
}

const rect = (g, c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };

// ---- the individual paintings ------------------------------------------

function drawSky(g) {
  // bands, not gradients — but the sky itself may breathe a little
  const grad = g.createLinearGradient(0, 34, 0, 2);
  grad.addColorStop(0, PAL.SKY);
  grad.addColorStop(1, mix(PAL.SKY, PAL.SKY_PALE, 0.8));
  g.fillStyle = grad; g.fillRect(-40, 0, 240, 40);

  // THE HAZE: a pale band sitting on the horizon, so the far stack stands
  // in air instead of being pasted on. Distance is value before it is hue.
  const haze = g.createLinearGradient(0, 12, 0, -2);
  haze.addColorStop(0, mix(PAL.SKY_PALE, PAL.SKY, 0.85));
  haze.addColorStop(1, PAL.SKY_PALE);
  g.fillStyle = haze; g.fillRect(-40, -2, 240, 14);

  // sun, pale and flat
  g.fillStyle = mix(PAL.CLOUD, PAL.SKY, 0.15);
  g.beginPath(); g.arc(120, 30, 3.4, 0, 7); g.fill();
  // flat cloud shapes: stacked rounded bars
  const cloud = (x, y, s) => {
    rect(g, PAL.CLOUD, x, y, 9 * s, 1.1 * s);
    rect(g, PAL.CLOUD, x + 1.6 * s, y + 1.1 * s, 5.4 * s, 1.0 * s);
    rect(g, PAL.CLOUD, x + 3.0 * s, y + 2.1 * s, 2.6 * s, 0.8 * s);
  };
  cloud(4, 26, 1); cloud(48, 30, 1.4); cloud(96, 24, 0.9); cloud(150, 29, 1.2);
}

function drawSkyline(g, T) {
  // distant city blocks + two tower cranes — nameable from silhouette.
  // The lit/shade split is deliberately SHALLOW here: at this distance a
  // crisp two-tone block reads as near, and it was competing with the
  // playfield for the eye.
  const base = 3.4;
  const block = (x, w, h) => {
    rect(g, T(PAL.STEEL[2]), x, base, w, h);
    rect(g, T(PAL.STEEL[3]), x, base, w * 0.42, h); // lit left face, barely
  };
  block(-6, 8, 9); block(6, 6, 13); block(16, 10, 7); block(30, 7, 11);
  block(42, 9, 8); block(56, 6, 15); block(66, 10, 9); block(82, 8, 12);
  block(94, 7, 8); block(104, 9, 10);
  const crane = (x, h, arm) => {
    const c = T(mix(PAL.MACHINE_DK, PAL.STEEL[3], 0.35));
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

// THE OCCLUDER LANE. Dark, near-silhouette, and CROPPED — every piece here
// runs off the top or the bottom of its rect, because a foreground element
// that fits inside the frame is just scenery placed early. Pieces are
// narrow and sit in the level's quiet stretches: you pass behind one for a
// beat, which is the depth cue, and you are never hidden mid-jump.
function drawFore(g) {
  const STEEL = mix(PAL.STEEL[0], PAL.INK, 0.55);
  const STEEL_LT = mix(PAL.STEEL[1], PAL.INK, 0.4);
  const TIMBER = mix(PAL.EARTH[0], PAL.INK, 0.45);
  const IRON = mix(PAL.DARK, PAL.INK, 0.3);
  const base = FORE_GROUND;

  // a scaffold bay standing in front: standards run clean off the top
  const scaffoldLeg = (x, w = 1.5) => {
    for (const dx of [0, w]) rect(g, STEEL, x + dx, -2, 0.3, 16);
    for (const ly of [1.0, 3.4, 5.8]) rect(g, STEEL_LT, x, base + ly, w + 0.3, 0.22);
    g.strokeStyle = STEEL_LT; g.lineWidth = 0.2;
    g.beginPath();
    g.moveTo(x + 0.15, base + 1.0); g.lineTo(x + w + 0.15, base + 3.4);
    g.moveTo(x + w + 0.15, base + 3.4); g.lineTo(x + 0.15, base + 5.8);
    g.stroke();
    rect(g, IRON, x - 0.2, base - 0.6, 0.7, 0.5);          // sandbag foot
    rect(g, IRON, x + w - 0.2, base - 0.6, 0.7, 0.5);
  };

  // a chain and hook hanging in from above — cropped by the top edge, and
  // it stops HIGH: a hook dangling at head height is a thing in the way,
  // not a thing in front
  const chainHook = (x, toY) => {
    rect(g, IRON, x - 0.05, toY, 0.1, 14 - toY);
    rect(g, IRON, x - 0.24, toY - 0.38, 0.48, 0.42);       // the hook block
    rect(g, IRON, x - 0.09, toY - 0.86, 0.18, 0.5);        // the hook itself
  };

  // cable drums — SMALL and sunk to the bottom edge. They were 1.25-unit
  // discs at eye level, which is the worst thing a foreground can be: a
  // dark blob parked over the middle of the frame with the action behind
  // it. A foreground occludes in passing or it lines the bottom; it does
  // not sit in the shot.
  const drums = (x) => {
    const drum = (dx, dy, r) => {
      g.fillStyle = TIMBER;
      g.beginPath(); g.arc(x + dx, dy, r, 0, 7); g.fill();
      g.fillStyle = IRON;
      g.beginPath(); g.arc(x + dx, dy, r * 0.34, 0, 7); g.fill();
    };
    drum(0, base - 1.5, 0.72); drum(1.5, base - 1.6, 0.62);
    drum(0.75, base - 0.45, 0.6);
  };

  // spoil heaped along the bottom — the near ground sweeping under the
  // action, cropped by the frame's lower edge. Its crest has to break the
  // PLAYFIELD's ground line (y=4) or the whole heap sits inside the earth
  // band and reads as a hole cut in the dirt rather than a mound in front
  // of it — which is exactly how it read on the first pass.
  const spoilHeap = (x, w, h = 1.4) => {
    const crest = base + h;
    g.fillStyle = mix(PAL.EARTH[0], PAL.INK, 0.52);
    g.beginPath();
    g.moveTo(x, -2);
    g.lineTo(x + w * 0.22, crest * 0.94);
    g.lineTo(x + w * 0.5, crest);
    g.lineTo(x + w * 0.79, crest * 0.88);
    g.lineTo(x + w, -2);
    g.closePath(); g.fill();
    // stones catching the light along the crest
    g.fillStyle = mix(PAL.EARTH[1], PAL.INK, 0.42);
    for (let i = 0.26; i < 0.8; i += 0.2) {
      g.beginPath();
      g.arc(x + w * i, crest * 0.9 - 0.12, 0.17, 0, 7);
      g.fill();
    }
  };

  // a pipe run crossing high, over the whole action
  const pipeRun = (x0, w, y) => {
    rect(g, STEEL, x0, y, w, 0.42);
    rect(g, STEEL_LT, x0, y + 0.42, w, 0.12);
    for (let i = 1.4; i < w; i += 3.2) {                    // hangers to the top
      rect(g, IRON, x0 + i, y + 0.5, 0.12, 14 - y);
    }
  };

  // a hoarding corner, bolted, cropped by the bottom
  const hoarding = (x, w) => {
    rect(g, TIMBER, x, -2, w, base + 2.4);
    rect(g, mix(PAL.EARTH[1], PAL.INK, 0.5), x, base + 2.0, w, 0.4);
    for (let i = 0.7; i < w; i += 1.9) rect(g, IRON, x + i, base + 0.6, 0.26, 0.26);
  };

  // Placed in the gaps between the room's beats — the mound is 8–16, the
  // pit 46–48, the machine 61, the ball 66–72, the bank 84–88 — and never
  // over the thing a room is asking you to read. Verticals pass by,
  // heaps line the bottom, the pipe run crosses above everything.
  scaffoldLeg(1);
  spoilHeap(13, 8);
  chainHook(27, base + 5.4);
  scaffoldLeg(37);
  pipeRun(41, 15, 10.6);
  spoilHeap(50, 6.5, 1.2);
  hoarding(57, 2.0);
  drums(74);
  scaffoldLeg(95);
}


// ---- WORLD 3, THE GROVE: its own set of painters -------------------------
// Until this, EVERY world painted the construction site. `PLACEHOLDER_DRAW`
// was one world-agnostic set, so `buildLayers(scene, 'grove')` dressed a
// forest in half-built concrete frames and scaffold bays — which is why
// World 3 read as "greybox with some trees on it" rather than as a place.
//
// These are code paintings, like every other placeholder here: no PNG, no
// credits, and they hold the same contract, so the moment the art lane
// paints `grove_far_v1.png` the file wins and this is never called again.
//
// The world is "forest clearing and DIGS" (DESIGN §4.2) — so it is not a
// forest, it is a worksite IN one. Every layer carries both: canopy and a
// cut, roots and shoring, moss and a stack of cut logs. A pure forest here
// would be a different game's backdrop.

// A POSITIVE modulo. `%` in JS keeps the sign of the DIVIDEND, and every
// layer rect here starts at a negative x — so `(x * 7919) % 13` went
// negative on the left-hand half of the world, the size derived from it
// went negative, and `arc()` threw on a negative radius. That is a thrown
// error inside buildLayers, which is awaited during boot, so the whole game
// failed to start rather than drawing one odd bush.
const wob = (x, n) => ((x * 7919) % n + n) % n / n;

// one soft canopy mass — a fan of overlapping discs, never a single circle,
// because a circle reads as a ball and a fan reads as leaves
function canopy(g, c, cx, cy, r) {
  g.fillStyle = c;
  const lobes = [[0, 0, 1], [-0.72, 0.16, 0.78], [0.72, 0.16, 0.78], [-0.34, 0.6, 0.66], [0.36, 0.58, 0.62]];
  for (const [dx, dy, k] of lobes) {
    g.beginPath();
    g.arc(cx + dx * r, cy + dy * r, r * k, 0, Math.PI * 2);
    g.fill();
  }
}

function tree(g, T, x, base, h, r, leaf, bark) {
  rect(g, T(bark), x - h * 0.055, base, h * 0.11, h * 0.72);
  canopy(g, T(leaf), x, base + h * 0.78, r);
}

function drawGroveSkyline(g, T) {
  // a far ridge, and the treeline ON it — the horizon of a valley you are
  // digging in the bottom of
  rect(g, T(PAL.GREEN_DK), -30, 3.0, 160, 2.4);
  for (let x = -28; x < 130; x += 3.1) {
    const h = 2.2 + wob(x, 13) * 2.6;
    // firs: a stack of narrowing bars is a conifer at this distance, and it
    // costs nothing next to a path
    for (let i = 0; i < 3; i++) {
      const w = 2.0 - i * 0.55;
      rect(g, T(PAL.GREEN_DK), x - w / 2, 4.6 + i * h * 0.3, w, h * 0.34);
    }
  }
  // the one built thing on the horizon: a crane over the cut
  rect(g, T(PAL.STEEL[2]), 74, 5.0, 0.5, 9.5);
  rect(g, T(PAL.STEEL[2]), 62, 14.0, 26, 0.5);
  rect(g, T(PAL.MACHINE), 66, 12.6, 1.1, 1.4);
}

function drawGroveFar(g, T) {
  // full canopy, staggered depths, with sky between the crowns — a wall of
  // green is a wall, and this has to read as trees you could walk into
  const base = 3.4;
  // SCALE, learned by looking: the first cut used crowns of r 3.0…4.3 and
  // they filled the frame as flat green masses — a tree you cannot see the
  // top of is a wall. Crowns are smaller and the trunks TALLER, so the stand
  // reads as trunks with sky and canopy above rather than as foliage with a
  // path under it. More of them, closer together, for the same reason.
  const stand = [[2, 9.5, 1.9], [9, 11.0, 2.2], [15, 8.6, 1.7], [23, 10.4, 2.1],
                 [31, 9.0, 1.8], [38, 11.4, 2.3], [46, 8.8, 1.7], [54, 10.0, 2.0],
                 [62, 9.2, 1.9], [70, 11.2, 2.2], [78, 8.6, 1.7], [86, 10.6, 2.1],
                 [94, 9.4, 1.9], [102, 10.8, 2.2]];
  for (const [x, h, r] of stand) tree(g, T, x, base, h, r, PAL.GREEN_DK, PAL.EARTH[3]);
  rect(g, T(PAL.EARTH[2]), -20, 2.0, 145, 1.6);
}

function drawGroveMid(g, T) {
  // THE DIG. A cut bank in layered earth with root ends coming out of it,
  // held back by timber shoring — the world's whole idea in one silhouette:
  // the forest is being opened, and it is being held open.
  const base = 3.8;
  for (let i = 0; i < 4; i++) {                       // the strata
    rect(g, T(PAL.EARTH[3 - (i % 2)]), -12, base + i * 0.62, 124, 0.62);
  }
  const shoring = (x, w, h) => {
    rect(g, T(PAL.EARTH[3]), x, base, 0.42, h);       // posts
    rect(g, T(PAL.EARTH[3]), x + w, base, 0.42, h);
    for (let y = 0.5; y < h; y += 0.85) {             // horizontal boards
      rect(g, T(PAL.EARTH[2]), x, base + y, w + 0.42, 0.5);
    }
  };
  shoring(6, 7.5, 4.2); shoring(38, 9.0, 5.0); shoring(74, 6.5, 3.6);
  // root ends breaking the cut face — the tell that this is a forest floor
  g.strokeStyle = T(PAL.EARTH[1]); g.lineCap = 'round';
  for (const [rx, ry] of [[20, 5.4], [27, 4.6], [56, 6.0], [64, 5.0], [92, 5.6], [100, 4.8]]) {
    g.lineWidth = 0.3;
    g.beginPath(); g.moveTo(rx, ry); g.lineTo(rx + 1.5, ry + 0.55); g.stroke();
    g.lineWidth = 0.18;
    g.beginPath(); g.moveTo(rx + 1.5, ry + 0.55); g.lineTo(rx + 2.4, ry + 0.25); g.stroke();
    g.beginPath(); g.moveTo(rx + 1.5, ry + 0.55); g.lineTo(rx + 2.3, ry + 1.1); g.stroke();
  }
  // stacked cut logs: what the dig takes out, left where it was taken
  for (let i = 0; i < 3; i++) {
    rect(g, T(PAL.EARTH[2]), 24 + i * 0.2, base + i * 0.62, 4.4, 0.6);
  }
}

function drawGroveNear(g, T) {
  // the moss lip and the undergrowth the path runs through
  rect(g, T(PAL.GREEN_DK), -8, 3.2, 115, 0.9);
  for (let x = -6; x < 104; x += 2.4) {
    const h = 0.7 + wob(x, 9) * 0.9;
    canopy(g, T(PAL.GREEN), x, 4.0, h * 0.62);       // fern clumps
  }
  // stumps, cut flat — a clearing is a place where trees WERE
  for (const sx of [9, 41, 77]) {
    rect(g, T(PAL.EARTH[3]), sx, 3.6, 1.8, 1.5);
    rect(g, T(PAL.EARTH[1]), sx - 0.15, 5.0, 2.1, 0.34);
  }
}

function drawGroveFore(g, T) {
  // ONE trunk, cropped by the frame top and bottom, and a brace on it —
  // the occluder lane's whole job is to be closer than the game is
  rect(g, T(PAL.EARTH[3]), 6, -2, 1.9, 16);
  rect(g, T(PAL.EARTH[2]), 5.4, 6.4, 3.1, 0.55);
  rect(g, T(PAL.EARTH[3]), 92, -2, 1.5, 16);
  // DEPTH MAGNIFIES, and the fore lane is the closest thing in the world.
  // A crown of r 2.4 here is not "a tree slightly nearer" — at z +2.2 it
  // covered a third of the screen in flat green, which is what made the
  // first two passes read as blobs rather than as a wood. Small, and in the
  // TOP CORNERS, where a canopy hangs into frame without standing in it.
  canopy(g, T(PAL.GREEN_DK), 0.4, 12.4, 0.9);
  canopy(g, T(PAL.GREEN_DK), 100.4, 12.2, 0.85);
}

const GROVE_DRAW = {
  skyline: { draw: drawGroveSkyline, tint: LAYER_TINT.SKYLINE },
  far:     { draw: drawGroveFar,     tint: LAYER_TINT.FAR },
  mid:     { draw: drawGroveMid,     tint: LAYER_TINT.MID },
  near:    { draw: drawGroveNear,    tint: LAYER_TINT.NEAR },
  fore:    { draw: drawGroveFore,    tint: 0 },
};

const PLACEHOLDER_DRAW = {
  skyline: { draw: drawSkyline, tint: LAYER_TINT.SKYLINE },
  far:     { draw: drawFar,     tint: LAYER_TINT.FAR },
  mid:     { draw: drawMid,     tint: LAYER_TINT.MID },
  near:    { draw: drawNear,    tint: LAYER_TINT.NEAR },
  fore:    { draw: drawFore,    tint: 0 },
};

// ---- the background WORKS (ART_BRIEF §3.5) -------------------------------
// "Depth you watch, not just parallax you scroll." One event per screen,
// slow, never competing with the playfield. These are meshes rather than
// paint because they move; they are tinted to their layer's depth so they
// belong to it, and reduced motion parks them.

function backgroundEvents(scene) {
  const events = [];
  const T = (c, t) => mix(c, PAL.SKY_PALE, t);
  const M = (c) => new THREE.MeshBasicMaterial({ color: c });

  // a tower crane traversing a load across the skyline
  {
    const g = new THREE.Group();
    const c = T(mix(PAL.MACHINE_DK, PAL.STEEL[3], 0.35), LAYER_TINT.SKYLINE);
    const line = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 9), M(c));
    line.position.y = -4.5; g.add(line);
    const load = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.8), M(c));
    load.position.y = -9.4; g.add(load);
    g.position.set(74, 23.4, LAYER_Z.SKYLINE + 0.2);
    scene.add(g);
    events.push({ obj: g, x0: 66, x1: 86, speed: 0.55, dir: 1 });
  }

  // a dump truck crossing the far road
  {
    const g = new THREE.Group();
    const body = T(PAL.MACHINE, LAYER_TINT.FAR);
    const dark = T(PAL.DARK, LAYER_TINT.FAR);
    const bed = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.1), M(body));
    bed.position.set(-0.5, 0.85, 0); g.add(bed);
    const cab = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.2), M(body));
    cab.position.set(1.6, 0.9, 0); g.add(cab);
    for (const wx of [-1.5, 0.2, 1.7]) {
      const w = new THREE.Mesh(new THREE.CircleGeometry(0.42, 10), M(dark));
      w.position.set(wx, 0.35, 0.01); g.add(w);
    }
    g.position.set(-16, 3.3, LAYER_Z.FAR + 0.3);
    scene.add(g);
    events.push({ obj: g, x0: -18, x1: 118, speed: 3.4, dir: 1 });
  }

  return {
    // the crane and the truck are meshes too, and they belong to whichever
    // world mounted them — see buildLayers().dispose
    dispose() {
      for (const e of events) {
        scene.remove(e.obj);
        e.obj.traverse?.((o) => {
          o.geometry?.dispose?.();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material?.dispose?.();
        });
      }
      events.length = 0;
    },
    update(dt) {
      for (const e of events) {
        e.obj.position.x += e.speed * e.dir * dt;
        if (e.obj.position.x > e.x1) {
          if (e.speed > 2) e.obj.position.x = e.x0;   // the truck loops round
          else e.dir = -1;                             // the crane traverses back
        } else if (e.obj.position.x < e.x0) {
          e.dir = 1;
        }
      }
    },
    // for the gate: "the background works" is a claim, so it is measurable
    positions: () => events.map((e) => e.obj.position.x),
  };
}

// world = the level's theme; each named layer asks the asset seam for a
// live PNG first and paints its placeholder if there is none.
export async function buildLayers(scene, world = 'groundworks', reduced = false) {
  const mounted = [];
  // the sky is a layer like any other now — the crafted paper sky ships as a
  // PNG through the same seam, and drawSky stays as its code placeholder
  const liveSky = await getLayerTexture(world, 'sky');
  mounted.push(...mountLayer(scene, LAYER_RECTS.sky,
    liveSky || paintCanvas({ ...LAYER_RECTS.sky, tint: 0, draw: drawSky })));
  for (const name of ['skyline', 'far', 'mid', 'near', 'fore']) {
    const rect = LAYER_RECTS[name];
    const live = await getLayerTexture(world, name);
    // a world paints ITSELF when it has its own set; everything without one
    // still falls back to the site, which is what worlds 1 and 2 want
    const set = world === 'grove' ? GROVE_DRAW : PLACEHOLDER_DRAW;
    mounted.push(...mountLayer(scene, rect, live || paintCanvas({ ...rect, ...set[name] })));
  }
  const events = backgroundEvents(scene);
  const dressing = world === 'pipeworks' ? buildPipeworksDressing(scene) : null;
  return {
    world,
    update: (dt) => { if (!reduced) events.update(dt); },
    positions: () => events.positions(),
    // A WORLD IS A SET OF LAYERS, and until World 2 had levels there was
    // only ever one set, built once at boot. Swapping worlds means taking
    // this one down first — every plane, its geometry, its material and
    // its texture — because a diorama left in the scene is six full-width
    // planes still drawing behind the new ones, and the near ones are
    // opaque. `mounted` is collected rather than re-found by traversing:
    // the background events add their own meshes and those come down with
    // `events.dispose()`, which knows which are its.
    dispose: () => {
      for (const m of mounted) {
        scene.remove(m);
        m.geometry.dispose();
        m.material.map?.dispose();
        m.material.dispose();
      }
      mounted.length = 0;
      dressing?.dispose?.();
      events.dispose?.();
    },
  };
}
