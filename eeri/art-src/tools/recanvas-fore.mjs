#!/usr/bin/env node
// EERI — re-canvas the fore layer onto the corrected rect.
//
// The fore painting was composed against the old contract (world y −1…5,
// 3360×180). The occluder lane now spans y −2…14 (3360×480) so a foreground
// piece can actually be CROPPED by the top of the frame — see ART_BRIEF
// §3.2.1. That is a taller canvas, NOT a different composition: this drops
// the delivered pixels onto the new canvas at the exact world position they
// were painted for, and leaves the rest transparent. The art does not move
// by a single world unit; there is simply now room above it.
//
// Run: NODE_PATH=$(npm root -g) node eeri/art-src/tools/recanvas-fore.mjs

import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';

// ESM does not honour NODE_PATH, which is why the sibling tool pinned an
// absolute path into somebody's scratch dir and stopped working the moment
// that session ended. CJS resolution does honour it, so ask through that
// and fall back to the global root rather than hardcoding a machine.
const require = createRequire(import.meta.url);
const { chromium } = (() => {
  try { return require('playwright'); } catch { /* not on NODE_PATH */ }
  return require(execSync('npm root -g').toString().trim() + '/playwright');
})();

const PPU = 30;
const OLD = { y0: -1, y1: 5 };          // what the painting was composed for
const NEW = { y0: -2, y1: 14 };         // js/layers.js LAYER_RECTS.fore
const SRC = new URL('../../assets/2d/groundworks_fore_v1.png', import.meta.url);

const b64 = (await readFile(SRC)).toString('base64');
const browser = await chromium.launch();
const page = await browser.newPage();

const out = await page.evaluate(async ({ src, OLD, NEW, PPU }) => {
  const img = new Image(); img.src = src; await img.decode();
  const cw = img.width;
  const ch = Math.round((NEW.y1 - NEW.y0) * PPU);
  // canvas y grows downward from the rect's TOP (y1), so the old band's top
  // edge sits this far down the new canvas
  const top = Math.round((NEW.y1 - OLD.y1) * PPU);
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const g = cv.getContext('2d');
  g.drawImage(img, 0, top, cw, Math.round((OLD.y1 - OLD.y0) * PPU));
  return { url: cv.toDataURL('image/png'), w: cw, h: ch, top, was: img.height };
}, { src: `data:image/png;base64,${b64}`, OLD, NEW, PPU });

await writeFile(SRC, Buffer.from(out.url.split(',')[1], 'base64'));
console.log(`fore: ${out.w}×${out.was} → ${out.w}×${out.h} (art placed at y+${out.top}px, world y ${OLD.y0}…${OLD.y1} unchanged)`);
await browser.close();
