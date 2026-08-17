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
import { getTexture } from './assets.js?v=27';

// world units per texture repeat, per material — a felt nap is fine and a
// card flute is coarse, so they do not share a scale
// A flute ripple is ~0.2 world units, so `flute` is dense; card liner is
// coarse; felt nap is fine. These are not interchangeable — one shared
// density made three materials look like one blurry material.
// v12: the earth's four strata each take their OWN section at their own
// scale. They used to share one `flute` map, which is how ~30% of the screen
// came to be an evenly-spaced motif marching across 136 world units — a
// material may repeat (a card flute genuinely is regular) but four bands that
// are four tints of one stamp is not four bands.
const DENSITY = {
  card: 1 / 5, felt: 1 / 1.6, balsa: 1 / 2.4, flute: 1 / 2.6,
  topsoil: 1 / 1.7, strata: 1 / 3.4, flutecoarse: 1 / 5.5,
  packed: 1 / 2.2, gritty: 1 / 2.8,
};

// A DETAIL MAP MUST TILE, WHICH MEANS IT MUST BE FEATURELESS. `packed` and
// `gritty` shipped once and had to be pulled: generated with the house craft
// block, which names split pins and masking tape, they came back as
// photographs of a specific card assemblage — so at a 2-unit repeat you could
// count the same shape across the whole level. Regenerated from a prompt that
// asks for the MATERIAL and forbids anything nameable, both tile cleanly.
// **It was the prompt, not the model**: the swatch that tiles best of the four
// came from base nano banana, not Pro. The test is not "does the patch look
// like card" — it is TILE IT 3×3 AND LOOK, which is the only thing that shows
// it.

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

// ---- CUTOUTS -------------------------------------------------------------
//
// The other half of the material story, and the one that was missing. A
// detail map modulates a surface that is already there; a cutout IS the
// shape — a torn card edge, a felt fringe, a stone embedded in the cut face.
// It carries its own colour and its own alpha, so it is deliberately NOT
// multiplied onto a palette colour: §3.2 says no asset invents a colour, and
// these do not — they are the palette's own materials, photographed, with the
// backing keyed out.
//
// `alphaTest` rather than blending, because a blended quad has to be sorted
// against every other transparent thing in the scene and these sit flat
// against the earth where sorting artefacts read as flicker.

const cutCache = new Map();

/** A material for a keyed cutout: real colour, real alpha, no palette tint. */
export function cutMat(name, opts = {}) {
  const m = new THREE.MeshLambertMaterial({
    color: 0xffffff, transparent: true, alphaTest: 0.5,
    side: THREE.DoubleSide, ...opts,
  });
  getTexture(name).then((tex) => {
    if (!tex) { m.visible = false; return; }  // no file: draw nothing, not a white slab
    m.map = tex; m.needsUpdate = true;
  });
  return m;
}

/**
 * A flat quad wearing a cutout, sized in world units. `repeatX` tiles the
 * cutout along its length — for a torn edge that runs the width of the level,
 * which is the one cutout that is allowed to repeat, because a torn line is
 * only read locally.
 */
export function cutQuad(w, h, name, { repeatX = 0, ...opts } = {}) {
  const key = `${name}|${repeatX}|${JSON.stringify(opts)}`;
  if (!cutCache.has(key)) {
    const m = cutMat(name, opts);
    if (repeatX) {
      // repeat lives on the Texture, and getTexture caches one per name — so
      // a tiled edge needs its own clone or it retunes every other user of
      // the same cutout. (This is the v11 lesson, one surface further on.)
      getTexture(name).then((tex) => {
        if (!tex) return;
        const t = tex.clone(); t.needsUpdate = true;
        t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping;
        t.repeat.set(repeatX, 1);
        m.map = t; m.needsUpdate = true;
      });
    }
    cutCache.set(key, m);
  }
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), cutCache.get(key));
}
