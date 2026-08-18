#!/usr/bin/env node
// EERI world compositor v4 — build all four worlds' parallax layers from the
// APPROVED LIBRARIES in art-src/world-N-library/.
//
// Why this exists alongside build-layers.mjs: that one composes the magenta-
// backed `craft/pieces/*.jpg` pool, which is the v14 art. The owner's verdict
// on the result (2026-08-18) was that World 1 "has old graphics", that World 2
// was "filled with World 1 assets" — it was, its pool was mostly the same
// pieces — and that Worlds 3 and 4 had no art at all, which is what kept them
// out of the pause menu (main.js `dressed()`). All four are now built from the
// libraries, which are the current approved look.
//
// THREE RULES THIS FILE EXISTS TO KEEP:
//
//  1. ONE POOL PER WORLD. A world's lanes may only draw from its own library.
//     That is the whole fix for World 2 — sharing a pool is how two worlds end
//     up being the same picture at different tints.
//  2. PIECES ARE CUT, NOT CROPPED BY HAND. A library board carries several
//     objects on one background; `components()` finds each one by flood fill,
//     so `w1-yard-dressing-c#3` means the 4th object found on that board in
//     raster order. Re-run this file and the same index means the same object.
//  3. PAINT TO THE ROW. assets/README.md's table is the contract and the smoke
//     gate measures it; LANES below is that table, and nothing here may invent
//     a size.
//
// Output is WEBP, not PNG. The v3 set was 14 MB of PNG for five strips of
// flat-ish craft render — the same pictures at q0.88 webp are about a tenth of
// that, which is the difference between a phone loading this world on a train
// and not. `test/smoke.cjs` measures webp headers as well as PNG ones.
//
// Run:  NODE_PATH=$(npm root -g) node art-src/tools/build-worlds.mjs [world…]

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');          // eeri/
const LIBS = path.join(ROOT, 'art-src');
const OUT = path.join(ROOT, 'assets', '2d');

// ---- the contract (assets/README.md) -----------------------------------
// px: the documented PNG size. world: the rect's width/height in units.
// ground: where the ground line sits, in units up from the rect's bottom.
// tint: LAYER_TINT — mixed toward the pale sky and BAKED IN, per the README.
// value: an extra darkening step so each lane sits below the one behind it;
// without it every lane washes to the same cream and the kid is lost in it.
//
// `ground` is MEASURED OFF js/layers.js's code painter (its `base` per lane:
// 3.0 / 3.4 / 3.8 / 3.9, and FORE_GROUND 3.4 which is 5.4 up from the fore
// rect's y0 of −2). It is not a free choice: a live PNG and the placeholder
// have to put their ground in the same place or flipping a layer to `live`
// moves the horizon. The first build guessed 1.5 for `near` and sank every
// prop two units into the floor.
//
// `ground` is where pieces STAND; `band` is how much painted earth is drawn
// under them, and the two are separate because the fore lane stands at 5.4
// units and must paint NO band at all — the first build filled the bottom 5.4
// units of the foreground with brown and walled the playfield off behind it.
//
// `gap` is [minimum, extra] as a multiple of the piece's own width, and it is
// the single most important number here. At [0.62, 0.5] every lane came out
// solid: the foreground was a picket fence the kid ran behind for a whole
// level, and the far lane had no sky left in it. A parallax lane is mostly
// EMPTY; the pieces are punctuation.
const LANES = {
  skyline: { px: [4096, 900], world: [160, 30], ground: 3.0, band: 0,   tint: 0.78, value: 0.00, gap: [1.00, 1.10] },
  far:     { px: [4096, 600], world: [140, 20], ground: 3.4, band: 3.4, tint: 0.55, value: 0.03, gap: [0.85, 0.95] },
  mid:     { px: [3660, 420], world: [122, 14], ground: 3.8, band: 3.8, tint: 0.26, value: 0.06, gap: [0.80, 0.95] },
  near:    { px: [3360, 240], world: [112,  8], ground: 3.9, band: 3.9, tint: 0.08, value: 0.09, gap: [1.20, 1.60] },
  fore:    { px: [3360, 480], world: [112, 16], ground: 5.4, band: 0,   tint: 0.00, value: 0.14, gap: [4.50, 4.00] },
};
const SKY_PALE = [0xc2, 0xe2, 0xf4];

// ---- the pools ---------------------------------------------------------
// `src` is "<library-folder-relative-path>#<component index>", `h` the world
// height the piece stands at, `w` its draw weight, `hero` a rare piece that is
// ALLOWED to break the height line (a run of equal heights is a fence, not a
// skyline). `crop` trims a fraction off a side before use — that is how the
// billboard's baked grass strip and the gable frame's baked skyline are taken
// off rather than shipped.
const L1 = 'world-1-library', L2 = 'world-2-library', L3 = 'world-3-library', L4 = 'world-4-library';

const WORLDS = {};

WORLDS.groundworks = {
  lib: L1,
  ground: { top: '#9a7549', body: '#6a4e34', edge: '#b08a5e' },
  skyline: [
    { src: `${L1}/sheets/w1-scaffold-kit-c.png#0`, h: 15, w: 3 },
    { src: `${L1}/sheets/w1-scaffold-kit-a.png#0`, h: 14, w: 3 },
    { src: `${L1}/sheets/w1-frames-truss-a.png#2`, h: 12, w: 3 },
    { src: `${L1}/sheets/w1-vertical-parts-a.png#1`, h: 16, w: 2 },
    { src: `${L1}/sheets/w1-frames-truss-a.png#0`, h: 11, w: 2 },
    { src: `${L1}/sheets/w1-site-kit-a.png#1`, h: 19, w: 1, hero: true },
    { src: `${L1}/sheets/w1-site-kit-b.png#1`, h: 21, w: 1, hero: true },
    { src: `${L1}/sheets/w1-vertical-parts-a.png#0`, h: 20, w: 1, hero: true },
  ],
  far: [
    { src: `${L1}/sheets/w1-frames-truss-a.png#0`, h: 8.5, w: 5 },
    { src: `${L1}/sheets/w1-frames-truss-a.png#2`, h: 9.5, w: 2 },
    { src: `${L1}/sheets/w1-scaffold-kit-c.png#0`, h: 11, w: 4 },
    { src: `${L1}/sheets/w1-scaffold-kit-a.png#0`, h: 10, w: 4 },
    { src: `${L1}/sheets/w1-scaffold-kit-b.png#0`, h: 7.5, w: 4 },
    { src: `${L1}/sheets/w1-scaffold-kit-b.png#1`, h: 9, w: 1 },
    { src: `${L1}/sheets/w1-vertical-parts-a.png#1`, h: 13, w: 1, hero: true },
    { src: `${L1}/sheets/w1-site-kit-b.png#1`, h: 14, w: 1, hero: true },
    { src: `${L1}/sheets/w1-frames-truss-a.png#1`, h: 5.5, w: 3 },
    { src: `${L1}/props/material-yard-a.png#0`, h: 6.5, w: 2 },
    { src: `${L1}/props/hazard-barricade-frame-a.png#0`, h: 6.0, w: 2 },
  ],
  mid: [
    { src: `${L1}/sheets/w1-scaffold-kit-b.png#0`, h: 7.5, w: 3 },
    { src: `${L1}/sheets/w1-frames-truss-a.png#1`, h: 6.5, w: 3 },
    { src: `${L1}/sheets/w1-scaffold-kit-c.png#2`, h: 5.2, w: 2 },
    { src: `${L1}/sheets/w1-scaffold-kit-a.png#2`, h: 5.0, w: 2 },
    { src: `${L1}/sheets/w1-timber-parts-a.png#2`, h: 4.4, w: 3 },
    { src: `${L1}/props/material-yard-a.png#0`, h: 5.6, w: 2 },
    { src: `${L1}/props/hazard-barricade-frame-a.png#0`, h: 5.4, w: 2 },
    { src: `${L1}/sheets/w1-scaffold-kit-a.png#0`, h: 9.5, w: 1, hero: true },
    { src: `${L1}/sheets/w1-timber-parts-a.png#0`, h: 4.0, w: 2 },
    { src: `${L1}/sheets/w1-frames-truss-a.png#3`, h: 3.4, w: 2 },
  ],
  near: [
    { src: `${L1}/sheets/w1-yard-dressing-a.png#1`, h: 2.6, w: 3 },
    { src: `${L1}/sheets/w1-yard-dressing-b.png#0`, h: 2.5, w: 3 },
    { src: `${L1}/sheets/w1-yard-dressing-c.png#1`, h: 2.4, w: 2 },
    { src: `${L1}/sheets/w1-yard-dressing-a.png#0`, h: 2.2, w: 2 },
    { src: `${L1}/sheets/w1-yard-dressing-b.png#1`, h: 2.3, w: 2 },
    { src: `${L1}/sheets/w1-yard-dressing-c.png#0`, h: 2.6, w: 2 },
    { src: `${L1}/sheets/w1-yard-dressing-a.png#3`, h: 2.1, w: 2 },
    { src: `${L1}/sheets/w1-yard-dressing-b.png#3`, h: 1.9, w: 2 },
    { src: `${L1}/sheets/w1-yard-dressing-c.png#3`, h: 2.0, w: 2 },
    { src: `${L1}/sheets/w1-scaffold-kit-b.png#2`, h: 1.9, w: 2 },
    { src: `${L1}/sheets/w1-yard-dressing-a.png#2`, h: 2.8, w: 1 },
    { src: `${L1}/sheets/w1-yard-dressing-c.png#2`, h: 3.0, w: 1 },
    { src: `${L1}/sheets/w1-site-kit-a.png#3`, h: 2.2, w: 2 },
    { src: `${L1}/sheets/w1-site-kit-b.png#3`, h: 2.0, w: 2 },
    { src: `${L1}/sheets/w1-site-kit-b.png#2`, h: 1.1, w: 2 },
    { src: `${L1}/sheets/w1-vertical-parts-a.png#3`, h: 2.2, w: 2 },
    { src: `${L1}/sheets/w1-timber-parts-a.png#3`, h: 1.3, w: 2 },
    { src: `${L1}/sheets/w1-yard-dressing-c.png#4`, h: 1.2, w: 1 },
    { src: `${L1}/sheets/w1-yard-dressing-b.png#4`, h: 1.1, w: 1 },
    { src: `${L1}/sheets/w1-yard-dressing-c.png#6`, h: 0.6, w: 1 },
  ],
  fore: [
    { src: `${L1}/sheets/w1-vertical-parts-a.png#2`, h: 17, w: 3, crop: { b: 0.02 } },
    { src: `${L1}/sheets/w1-vertical-parts-a.png#1`, h: 16, w: 3 },
    { src: `${L1}/sheets/w1-site-kit-a.png#0`, h: 14, w: 2 },
    { src: `${L1}/sheets/w1-site-kit-b.png#0`, h: 13, w: 2 },
    { src: `${L1}/sheets/w1-scaffold-kit-b.png#1`, h: 12, w: 2 },
  ],
};

WORLDS.pipeworks = {
  lib: L2,
  ground: { top: '#6d7787', body: '#4c545f', edge: '#8b95a3' },
  skyline: [
    { src: `${L2}/midground/plant-facade-a.png#0`, h: 20, w: 3 },
    { src: `${L2}/midground/pipe-rack-a.png#0`, h: 17, w: 3 },
    { src: `${L2}/midground/pipe-wall-a.png#0`, h: 13, w: 2 },
    { src: `${L2}/midground/standpipe-valve-a.png#0`, h: 24, w: 1, hero: true },
    { src: `${L2}/accents/hydrant-post-a.png#0`, h: 22, w: 1, hero: true },
    { src: `${L2}/midground/service-bay-a.png#0`, h: 15, w: 2 },
  ],
  far: [
    { src: `${L2}/midground/plant-facade-a.png#0`, h: 13, w: 3 },
    { src: `${L2}/midground/pipe-rack-a.png#0`, h: 11.5, w: 3 },
    { src: `${L2}/midground/pipe-wall-b.png#0`, h: 8.5, w: 3 },
    { src: `${L2}/midground/service-bay-a.png#0`, h: 10, w: 2 },
    { src: `${L2}/midground/hatch-wall-a.png#0`, h: 8, w: 2 },
    { src: `${L2}/midground/standpipe-valve-a.png#0`, h: 16, w: 1, hero: true },
  ],
  mid: [
    { src: `${L2}/midground/pipe-wall-a.png#0`, h: 6.4, w: 3 },
    { src: `${L2}/midground/pipe-wall-b.png#0`, h: 6.2, w: 3 },
    { src: `${L2}/midground/service-wall-a.png#0`, h: 5.4, w: 3 },
    { src: `${L2}/midground/hatch-wall-a.png#0`, h: 5.8, w: 2 },
    { src: `${L2}/midground/drainage-channel-a.png#0`, h: 4.4, w: 2 },
    { src: `${L2}/midground/canal-water-a.png#0`, h: 4.4, w: 2 },
    { src: `${L2}/midground/valve-junction-a.png#0`, h: 5.0, w: 2 },
    { src: `${L2}/midground/pump-platform-a.png#0`, h: 5.2, w: 2 },
    { src: `${L2}/midground/service-bay-a.png#0`, h: 6.6, w: 2 },
    { src: `${L2}/midground/standpipe-valve-a.png#0`, h: 9.0, w: 1, hero: true },
  ],
  near: [
    { src: `${L2}/accents/stacked-pipes-a.png#0`, h: 2.4, w: 3 },
    { src: `${L2}/accents/valve-post-a.png#0`, h: 3.2, w: 3 },
    { src: `${L2}/accents/hydrant-post-a.png#0`, h: 3.0, w: 2 },
    { src: `${L2}/accents/drain-grate-a.png#0`, h: 1.5, w: 2 },
    { src: `${L2}/midground/valve-junction-a.png#0`, h: 2.6, w: 2 },
    { src: `${L2}/midground/pump-platform-a.png#0`, h: 2.6, w: 2 },
    { src: `${L2}/midground/canal-water-a.png#0`, h: 2.2, w: 1 },
  ],
  fore: [
    { src: `${L2}/midground/standpipe-valve-a.png#0`, h: 15, w: 3 },
    { src: `${L2}/accents/hydrant-post-a.png#0`, h: 13, w: 3 },
    { src: `${L2}/accents/valve-post-a.png#0`, h: 12, w: 2 },
  ],
};

WORLDS.grove = {
  lib: L3,
  ground: { top: '#6d5238', body: '#4f3c29', edge: '#5f8a3c', haze: 0.68 },
  skyline: [
    { src: `${L3}/sheets/w3-w4-combined-sheet-b.png#9`, h: 22, w: 4 },
    { src: `${L3}/sheets/w3-w4-combined-sheet-a.png#19`, h: 16, w: 3 },
    { src: `${L3}/sheets/w3-w4-combined-sheet-a.png#23`, h: 20, w: 2 },
    { src: `${L3}/sheets/w3-w4-combined-sheet-a.png#20`, h: 26, w: 1, hero: true },
    { src: `${L3}/sheets/w3-w4-combined-sheet-b.png#10`, h: 19, w: 3 },
  ],
  far: [
    { src: `${L3}/background/forest-clearing-a.png#0`, h: 13, w: 4 },
    { src: `${L3}/sheets/w3-w4-combined-sheet-b.png#9`, h: 15, w: 3 },
    { src: `${L3}/sheets/w3-forest-craft-sheet-a.png#15`, h: 16, w: 2 },
    { src: `${L3}/sheets/w3-forest-craft-sheet-a.png#14`, h: 12, w: 3 },
    { src: `${L3}/sheets/w3-w4-combined-sheet-a.png#25`, h: 17, w: 1, hero: true },
    { src: `${L3}/sheets/w3-w4-combined-sheet-b.png#10`, h: 13, w: 2 },
  ],
  mid: [
    { src: `${L3}/midground/root-tunnel-a.png#0`, h: 6.4, w: 3 },
    { src: `${L3}/midground/retaining-wall-a.png#0`, h: 6.2, w: 3 },
    { src: `${L3}/midground/timber-shoring-wall-a.png#0`, h: 6.0, w: 3 },
    { src: `${L3}/midground/timber-shoring-wall-b.png#0`, h: 6.0, w: 3 },
    { src: `${L3}/midground/fallen-log-a.png#0`, h: 4.6, w: 2 },
    { src: `${L3}/midground/log-bank-vignette-a.png#0`, h: 5.2, w: 2 },
    { src: `${L3}/sheets/w3-w4-combined-sheet-a.png#24`, h: 9.0, w: 1, hero: true },
    { src: `${L3}/sheets/w3-w4-combined-sheet-a.png#26`, h: 8.0, w: 1, hero: true },
    { src: `${L3}/midground/asset-set-b.png#0`, h: 5.0, w: 2 },
    { src: `${L3}/midground/asset-set-b.png#3`, h: 4.2, w: 2 },
  ],
  near: [
    { src: `${L3}/props/stump-clearing-a.png#0`, h: 2.8, w: 3 },
    { src: `${L3}/midground/asset-set-c.png#1`, h: 2.4, w: 3 },
    { src: `${L3}/midground/asset-set-c.png#0`, h: 2.2, w: 2 },
    { src: `${L3}/midground/asset-set-c.png#2`, h: 2.8, w: 2 },
    { src: `${L3}/midground/asset-set-c.png#3`, h: 1.5, w: 2 },
    { src: `${L3}/midground/asset-set-a.png#1`, h: 2.2, w: 3 },
    { src: `${L3}/midground/asset-set-a.png#2`, h: 2.6, w: 2 },
    { src: `${L3}/sheets/w3-w4-combined-sheet-a.png#29`, h: 1.4, w: 2 },
    { src: `${L3}/sheets/w3-w4-combined-sheet-a.png#31`, h: 1.6, w: 2 },
    { src: `${L3}/sheets/w3-w4-combined-sheet-a.png#27`, h: 2.0, w: 2 },
    { src: `${L3}/sheets/w3-forest-craft-sheet-a.png#12`, h: 2.4, w: 1 },
  ],
  fore: [
    { src: `${L3}/foreground/tree-brace-a.png#0`, h: 13, w: 4 },
    { src: `${L3}/midground/asset-set-a.png#0`, h: 12, w: 3 },
    { src: `${L3}/sheets/w3-w4-combined-sheet-a.png#22`, h: 11, w: 2 },
    { src: `${L3}/sheets/w3-w4-combined-sheet-a.png#26`, h: 12, w: 2 },
    { src: `${L3}/midground/asset-set-b.png#2`, h: 12, w: 2 },
  ],
};

WORLDS.nightshift = {
  lib: L4,
  night: true,
  ground: { top: '#31363f', body: '#1d2027', edge: '#454b56', haze: 0.55 },
  skyline: [
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#1`, h: 26, w: 5 },
    { src: `${L4}/background/warehouse-dock-a.png#0`, h: 18, w: 2 },
    { src: `${L4}/midground/prop-sheet-a.png#0`, h: 15, w: 2 },
  ],
  far: [
    { src: `${L4}/background/warehouse-dock-a.png#0`, h: 14, w: 3 },
    { src: `${L4}/background/loading-facade-a.png#0`, h: 12.5, w: 3 },
    { src: `${L4}/midground/prop-sheet-a.png#0`, h: 11, w: 3 },
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#2`, h: 10, w: 2 },
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#16`, h: 16, w: 1, hero: true },
  ],
  mid: [
    { src: `${L4}/background/loading-facade-a.png#0`, h: 8.0, w: 3 },
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#2`, h: 7.0, w: 3 },
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#3`, h: 4.2, w: 3 },
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#4`, h: 4.2, w: 2 },
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#6`, h: 4.6, w: 2 },
    { src: `${L4}/midground/prop-sheet-a.png#3`, h: 4.4, w: 2 },
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#16`, h: 10, w: 1, hero: true },
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#5`, h: 3.6, w: 2 },
  ],
  near: [
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#8`, h: 1.9, w: 3 },
    { src: `${L4}/accents/hazard-sheet-a.png#2`, h: 1.8, w: 3 },
    { src: `${L4}/accents/hazard-sheet-a.png#5`, h: 2.2, w: 2 },
    { src: `${L4}/accents/hazard-sheet-a.png#0`, h: 2.4, w: 2 },
    { src: `${L4}/accents/hazard-sheet-a.png#4`, h: 3.0, w: 2 },
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#9`, h: 1.7, w: 2 },
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#10`, h: 1.5, w: 2 },
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#11`, h: 1.6, w: 2 },
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#12`, h: 1.5, w: 2 },
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#13`, h: 1.0, w: 2 },
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#14`, h: 2.2, w: 1 },
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#15`, h: 1.3, w: 2 },
    { src: `${L4}/accents/hazard-sheet-a.png#1`, h: 2.6, w: 2 },
  ],
  fore: [
    { src: `${L4}/sheets/w4-dock-night-sheet-a.png#16`, h: 15, w: 4 },
    { src: `${L4}/accents/hazard-sheet-a.png#4`, h: 12, w: 3 },
    { src: `${L4}/accents/hazard-sheet-a.png#1`, h: 11, w: 2 },
  ],
};

// ---- the browser half --------------------------------------------------
// Everything below runs inside chromium: it has a canvas, a webp encoder and
// an image decoder, and no dependency this repo would otherwise carry.
const PAGE = `
const SKY_PALE = [${SKY_PALE.join(',')}];

// mulberry32 — seeded, so the same commit builds the same layers. A build you
// cannot reproduce is a build you cannot review.
function rng(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// KEYING. The libraries arrived on three different negative-space colours and
// none of them is the magenta keylib.js expects (world-1-library/INDEX.md saw
// this coming). So the background is identified from the corner and cut by the
// test that suits it: black and white by distance, blue by CHROMA — the blue
// backings are gradients, so a single-colour distance test keeps the dark half
// of the sky and drops the light half.
function keyOut(img) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 3; i < p.length; i += 4 * 977) if (p[i] < 250) return c;   // already cut
  const r0 = p[8], g0 = p[9], b0 = p[10];
  const blue = b0 > 120 && b0 - Math.max(r0, g0) > 25;
  const tol = Math.max(r0, g0, b0) < 45 ? 66 : 46;
  for (let i = 0; i < p.length; i += 4) {
    const r = p[i], gg = p[i + 1], b = p[i + 2];
    const hit = blue
      ? (b > 110 && b - Math.max(r, gg) > 18)
      : (Math.abs(r - r0) + Math.abs(gg - g0) + Math.abs(b - b0) < tol);
    if (hit) p[i + 3] = 0;
  }
  g.putImageData(d, 0, 0);
  return c;
}

// FLOOD FILL, raster order, step 2. The index a pool entry names ("#3") is
// this order, so do not "tidy" the scan into something prettier: every pool
// entry in this file is written against it.
function components(cv, minArea) {
  const g = cv.getContext('2d', { willReadFrequently: true });
  const { width: w, height: h } = cv;
  const a = g.getImageData(0, 0, w, h).data;
  const seen = new Uint8Array(w * h);
  const out = [];
  const stack = new Int32Array(w * h);
  for (let sy = 0; sy < h; sy += 2) for (let sx = 0; sx < w; sx += 2) {
    const s = sy * w + sx;
    if (seen[s] || a[s * 4 + 3] < 40) continue;
    let n = 0, top = 0;
    stack[top++] = s; seen[s] = 1;
    let x0 = sx, x1 = sx, y0 = sy, y1 = sy, area = 0;
    while (top) {
      const i = stack[--top], x = i % w, y = (i - x) / w;
      area++;
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      const N = [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]];
      for (const [dx, dy] of N) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (!seen[j] && a[j * 4 + 3] >= 40) { seen[j] = 1; stack[top++] = j; }
      }
    }
    n = area;
    if (n > minArea) out.push({ x0, y0, x1: x1 + 1, y1: y1 + 1, n });
  }
  return out;
}

// One key + one flood fill per FILE, not per piece: a seven-object board would
// otherwise be scanned seven times.
const BOARDS = new Map(), CUT = new Map();
async function board(file, dataUrl) {
  if (BOARDS.has(file)) return BOARDS.get(file);
  const img = new Image();
  await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = dataUrl; });
  const keyed = keyOut(img);
  const rec = { keyed, cs: components(keyed, 9000) };
  BOARDS.set(file, rec);
  return rec;
}
async function piece(spec, dataUrl) {
  if (CUT.has(spec)) return CUT.get(spec);
  const [file, idxs] = spec.split('#');
  const { keyed, cs } = await board(file, dataUrl);
  const b = cs[Number(idxs)];
  if (!b) throw new Error(spec + ': no component ' + idxs + ' (found ' + cs.length + ')');
  const c = document.createElement('canvas');
  c.width = b.x1 - b.x0; c.height = b.y1 - b.y0;
  c.getContext('2d').drawImage(keyed, -b.x0, -b.y0);
  CUT.set(spec, c);
  return c;
}
`;

const PAGE2 = `
// ---- one lane ----------------------------------------------------------
// The composition rules, and each one is a note the owner has already given
// on an earlier build:
//   * a CONTINUOUS ground line, full width, or the lane reads as cutouts
//     floating with air under them;
//   * a HEIGHT PROFILE with rare heroes, or the run is a fence;
//   * a CONTACT SHADOW per piece, or nothing is standing ON anything;
//   * the tint baked at the end with 'source-atop', so it lands on the art
//     and never on the transparent sky the lane behind shows through.
async function lane(cfg, pool, ground, seed, night) {
  const [W, H] = cfg.px, [wu, hu] = cfg.world;
  const sx = W / wu, sy = H / hu;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const R = rng(seed);
  const gy = H - cfg.ground * sy;             // ground line, in canvas px
  // A WORLD MAY DAMP THE HAZE. The tint numbers are tuned for a pale city
  // sky; run them over a forest and the far stand goes milky, because green
  // mixed toward pale blue is the colour of nothing. Grove damps to 0.68 of
  // the table, the night dock to 0.55 — haze at night is a different thing.
  const haze = ground.haze == null ? 1 : ground.haze;

  // the ground: a torn band the full width. Skyline gets none — it is the
  // horizon, and a band there draws a hard line across the sky.
  if (cfg.band > 0) {
    const band = cfg.band * sy;
    // STRATA, not a slab. The ground is the biggest single area in the lane,
    // and one flat brown rectangle is the loudest possible tell that a layer
    // was generated. The house material is layered kraft with torn edges, so
    // the band is four torn courses in the world's own three tones.
    const tones = [ground.body, ground.top, ground.body, ground.top];
    g.fillStyle = ground.body;
    g.fillRect(0, gy, W, H - gy);
    for (let i = 1; i < tones.length; i++) {
      const cy = gy + band * (i / tones.length);
      g.fillStyle = tones[i];
      g.globalAlpha = 0.55 + 0.35 * ((i * 37) % 5) / 5;
      g.beginPath();
      g.moveTo(0, cy);
      for (let x = 0; x <= W; x += 22) g.lineTo(x, cy + (R() - 0.5) * band * 0.13);
      g.lineTo(W, H); g.lineTo(0, H); g.closePath(); g.fill();
    }
    g.globalAlpha = 1;
    g.fillStyle = ground.edge;
    g.beginPath();
    g.moveTo(0, gy);
    for (let x = 0; x <= W; x += 18) g.lineTo(x, gy - 2 - 5 * R());
    g.lineTo(W, gy + band * 0.12); g.lineTo(0, gy + band * 0.12); g.closePath(); g.fill();
    // …and grit, so the band is a made surface rather than a printed bar. A
    // flat rectangle of one brown is the single loudest tell that a layer was
    // drawn by code, and it is the note the v2 build got.
    g.save();
    g.globalAlpha = 0.16;
    for (let i = 0; i < W / 7; i++) {
      const bx = R() * W, by = gy + R() * band * 1.5, bw = 4 + R() * 22;
      g.fillStyle = R() < 0.5 ? '#000' : '#fff';
      g.fillRect(bx, by, bw, 2 + R() * 4);
    }
    g.restore();
  }

  // placements, tallest first so short clutter overlaps tall structure
  const total = pool.reduce((s, p) => s + p.w, 0);
  const pick = () => {
    let r = R() * total;
    for (const p of pool) { r -= p.w; if (r <= 0) return p; }
    return pool[pool.length - 1];
  };
  const plan = [];
  let x = -0.06 * W;
  while (x < W * 1.04) {
    let p = pick();
    if (p.hero && R() > 0.34) p = pool.find((q) => !q.hero) || p;
    const h = p.h * sy * (0.84 + 0.34 * R());
    const src = CUT.get(p.src);
    const w = h * (src.width / src.height);
    plan.push({ p, src, x, h, w, flip: R() < 0.4 });
    x += w * (cfg.gap[0] + cfg.gap[1] * R());
  }
  plan.sort((a, b) => b.h - a.h);

  for (const it of plan) {
    const base = gy + (it.p.sink ? it.p.sink * sy : 0);
    const y = base - it.h;
    // contact shadow: a hard-edged cutout smear, not a soft blob — this is
    // paper on paper
    if (cfg.band > 0) {
      g.save();
      g.globalAlpha = 0.26;
      g.fillStyle = '#000';
      g.beginPath();
      g.ellipse(it.x + it.w / 2, base + 2, it.w * 0.44, Math.max(3, it.h * 0.035), 0, 0, 7);
      g.fill();
      g.restore();
    }
    g.save();
    if (it.flip) { g.translate(it.x + it.w, y); g.scale(-1, 1); g.drawImage(it.src, 0, 0, it.w, it.h); }
    else g.drawImage(it.src, it.x, y, it.w, it.h);
    g.restore();
  }

  // VALUE STAIRCASE then DEPTH TINT, both source-atop so the sky stays clear.
  if (cfg.value > 0) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(28,22,14,' + cfg.value + ')';
    g.fillRect(0, 0, W, H);
    g.restore();
  }
  if (cfg.tint * haze > 0) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    const t = night ? [26, 34, 58] : SKY_PALE;
    g.fillStyle = 'rgba(' + t.join(',') + ',' + (cfg.tint * haze) + ')';
    g.fillRect(0, 0, W, H);
    g.restore();
  }
  return cv.toDataURL('image/webp', 0.88);
}

// ---- the night sky -----------------------------------------------------
// World 4 is the one world whose sky cannot be shared: it is a night shift.
// Painted rather than rendered, because a sky is a gradient with things on it
// and a 4 MB photograph of one is the thing this build is trying to stop.
function nightSky(W, H, seed) {
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d'), R = rng(seed);
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#0b1330');
  grd.addColorStop(0.55, '#152449');
  grd.addColorStop(1, '#2c3c63');
  g.fillStyle = grd; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 420; i++) {
    const x = R() * W, y = R() * H * 0.72, r = 1 + R() * 2.4;
    g.globalAlpha = 0.25 + R() * 0.6;
    g.fillStyle = '#dce6ff';
    g.fillRect(x, y, r, r);
  }
  g.globalAlpha = 1;
  // ONE paper moon, cut with a torn edge like every other shape here
  const mx = W * 0.72, my = H * 0.26, mr = H * 0.11;
  g.fillStyle = '#f2eede';
  g.beginPath();
  for (let a = 0; a < 7; a += 0.14) {
    const rr = mr * (0.965 + 0.035 * R());
    g.lineTo(mx + Math.cos(a) * rr, my + Math.sin(a) * rr);
  }
  g.closePath(); g.fill();
  g.globalAlpha = 0.10; g.fillStyle = '#8fa3c8';
  for (let i = 0; i < 5; i++) {
    const x = R() * W, y = H * (0.3 + R() * 0.5), w = W * (0.08 + R() * 0.16), h = H * 0.05;
    g.beginPath(); g.ellipse(x, y, w, h, 0, 0, 7); g.fill();
  }
  return cv.toDataURL('image/webp', 0.9);
}
`;

// ---- the node half -----------------------------------------------------
const WORK = process.env.MESHY_WORK || path.dirname(process.env.NODE_PATH || '/usr/local/lib/node_modules');
const { chromium } = await import(
  existsSync(path.join(WORK, 'node_modules', 'playwright', 'index.mjs'))
    ? path.join(WORK, 'node_modules', 'playwright', 'index.mjs')
    : 'playwright');

const want = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const build = want.length ? want : Object.keys(WORLDS);
const VER = { groundworks: 'v4', pipeworks: 'v2', grove: 'v1', nightshift: 'v1' };

const dataUrl = async (rel) => {
  const b = await readFile(path.join(LIBS, rel));
  return 'data:image/png;base64,' + b.toString('base64');
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('  page:', m.text()); });
await page.addScriptTag({ content: PAGE });
await page.addScriptTag({ content: PAGE2 });

const written = [];
for (const world of build) {
  const W = WORLDS[world];
  if (!W) { console.log('unknown world', world); continue; }
  // every distinct source file, loaded once
  const specs = [...new Set(Object.keys(LANES).flatMap((l) => (W[l] || []).map((p) => p.src)))];
  for (const spec of specs) {
    const file = spec.split('#')[0];
    await page.evaluate(async ([s, u]) => { await piece(s, u); }, [spec, await dataUrl(file)]);
  }
  let seed = 0;
  for (const ch of world) seed = (seed * 31 + ch.charCodeAt(0)) | 0;
  for (const [name, cfg] of Object.entries(LANES)) {
    const pool = W[name];
    if (!pool) continue;
    const url = await page.evaluate(
      async ([cfg, pool, ground, seed, night]) => lane(cfg, pool, ground, seed, night),
      [cfg, pool, W.ground, seed + name.length * 7919, !!W.night]);
    const out = `${world}_${name}_${VER[world]}.webp`;
    const bytes = Buffer.from(url.split(',')[1], 'base64');
    await writeFile(path.join(OUT, out), bytes);
    written.push([out, bytes.length]);
    console.log(`  ${out.padEnd(34)} ${(bytes.length / 1024).toFixed(0)} kB`);
  }
  if (W.sky === false) { /* shares the day sky */ }
  if (W.night) {
    const url = await page.evaluate(([w, h, s]) => nightSky(w, h, s), [4096, 1380, seed]);
    const bytes = Buffer.from(url.split(',')[1], 'base64');
    const out = `${world}_sky_${VER[world]}.webp`;
    await writeFile(path.join(OUT, out), bytes);
    written.push([out, bytes.length]);
    console.log(`  ${out.padEnd(34)} ${(bytes.length / 1024).toFixed(0)} kB`);
  }
}
// RECOMPRESSED, not composed. These pictures are right; their container was
// not. The day sky was 4.2 MB of paper gradient and cotton wool and was the
// single largest file in the game; the two pad plates and the logo are flat
// painted card that PNG stores a pixel at a time. Nothing here is redrawn —
// same image, same size, a tenth of the bytes.
//
// The source PNGs are DELETED once these exist, so this block is a no-op on a
// clean tree. That is deliberate: keeping both is how a project ends up
// shipping the heavy one because something still pointed at it.
const RECOMPRESS = [
  ['groundworks_sky_v1.png', 'day_sky_v2.webp', 0.90],
  ['padplate_v1.png', 'padplate_v2.webp', 0.92],
  ['padplate_landscape_v1.png', 'padplate_landscape_v2.webp', 0.92],
  ['logo_v2.png', 'logo_v3.webp', 0.94],
];
for (const [from, to, q] of RECOMPRESS) {
  const src = path.join(OUT, from);
  if (!existsSync(src)) continue;
  const b = await readFile(src);
  const url = await page.evaluate(async ([u, q]) => {
    const img = new Image();
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = u; });
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    return c.toDataURL('image/webp', q);
  }, ['data:image/png;base64,' + b.toString('base64'), q]);
  const bytes = Buffer.from(url.split(',')[1], 'base64');
  await writeFile(path.join(OUT, to), bytes);
  written.push([to, bytes.length]);
  console.log(`  ${to.padEnd(34)} ${(bytes.length / 1024).toFixed(0)} kB  (was ${(b.length / 1024).toFixed(0)} kB PNG)`);
}
await browser.close();
console.log(`\n${written.length} files, ${(written.reduce((s, w) => s + w[1], 0) / 1048576).toFixed(2)} MB total`);
