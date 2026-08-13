// EERI — the CRAFT MATERIAL FACTORY.
//
// Crafted World is a KIT of materials, not one material: corrugated card,
// wool felt, painted balsa, paper tube, cotton, tape, split pins. The game's
// surfaces should each be made of the thing they would really be made of.
//
// This exists because the first attempt wired the card map into `level.js`
// alone, and a probe of the live scene found the truth: three materials had
// a map and **seventy-odd did not**. Every module had grown its own
// `const M = (c) => new THREE.MeshLambertMaterial({ color: c })` — level,
// pieces, excavator, crane, hazards, robots, main — so the grass lip, every
// playfield cell, both machines and all the props were still flat paint
// while the ground behind them was card. Patching each call site would have
// left the next one to be written flat again.
//
// So: ONE factory. `craftMat(colour, material)` is the only way a surface is
// made, and it carries three things a bare material cannot:
//
//  1. the MAP arrives late and centrally — the texture is fetched once per
//     material name and applied to every material that asked for it, so a
//     scene is playable in flat palette colour and gains its craft when the
//     images land. A texture must never delay a level build.
//  2. the map is greyscale and MULTIPLIES the palette colour (§3.2 — "one
//     palette, no asset invents a colour"). The colour is still the
//     palette's; the material only modulates it.
//  3. world-space UV density, via `craftBox`. BoxGeometry maps 0…1 across
//     every face whatever its size, so one shared material stretched the
//     card over a 136-unit earth band and squashed it onto a 1-unit cell —
//     it read as streaking rather than as card.
//
// Adding a material is a manifest entry plus a name here. Nothing else.

import * as THREE from 'three';
import { getTexture } from './assets.js?v=3';

// world units per texture repeat, per material — a felt nap is fine and a
// card flute is coarse, so they do not share a scale
// A flute ripple is ~0.2 world units, so `flute` is dense; card liner is
// coarse; felt nap is fine. These are not interchangeable — one shared
// density made three materials look like one blurry material.
const DENSITY = { card: 1 / 5, felt: 1 / 1.6, balsa: 1 / 2.4, flute: 1 / 2.6 };

const waiting = new Map();     // material name → [materials]
const fetched = new Set();

function want(mat, name) {
  if (!waiting.has(name)) waiting.set(name, []);
  waiting.get(name).push(mat);
  if (fetched.has(name)) return;
  fetched.add(name);
  getTexture(name).then((tex) => {
    if (!tex) return;                       // no file: flat colour, no drama
    for (const m of waiting.get(name) || []) { m.map = tex; m.needsUpdate = true; }
  });
}

/**
 * A surface made of something. `material` is a name in the manifest's
 * `textures` block ('card' | 'felt' | 'balsa'); omit it for a surface that
 * is genuinely bare — an unlit lamp, a glass pane, a shadow.
 */
export function craftMat(color, material = null, opts = {}) {
  const m = new THREE.MeshLambertMaterial({ color, ...opts });
  if (material) {
    m.__craft = DENSITY[material] ?? 1 / 5;
    want(m, material);
  }
  return m;
}

/**
 * A box whose UVs are scaled by its own world size, so every surface built
 * from the same material has the same texel density. Use this instead of
 * `new THREE.Mesh(new THREE.BoxGeometry(...), m)` wherever the material
 * came from `craftMat` with a material name.
 */
export function craftBox(w, h, d, m) {
  const geo = new THREE.BoxGeometry(w, h, d);
  if (m?.__craft) {
    const uv = geo.attributes.uv, k = m.__craft;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * w * k, uv.getY(i) * h * k);
    }
    uv.needsUpdate = true;
  }
  return new THREE.Mesh(geo, m);
}

/** Retro-fit: give an already-built material a craft surface. */
export function craft(m, material) {
  if (!m || !material) return m;
  m.__craft = DENSITY[material] ?? 1 / 5;
  want(m, material);
  return m;
}
