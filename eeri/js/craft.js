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
import { getTexture } from './assets.js?v=59';
import { PAL } from './palette.js?v=59';

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

// ---- THE SILHOUETTE LINE ------------------------------------------------
// One dark line on the silhouette, built from the model itself so it cannot
// disagree with the pose: each mesh gets a sibling of the same geometry in
// INK, culled to BackSide and pushed OUTWARD ALONG ITS OWN NORMALS. A shell
// rather than a post pass because ART_BRIEF §3.4 forbids a post stack, and a
// child of each mesh so it inherits every bone and every pose for free.
//
// IT USED TO PUSH THE SHELL OUT BY SCALING IT (×1.045) AND THAT DOES NOTHING
// ON A SKINNED MESH: the vertex position comes out of the bones, so the
// object's own scale never reaches the silhouette. On the enemy rigs the
// scaled shell measures 0.009 tiles against a 0.7-tile body — it collapses
// inside the model instead of wrapping it, and renders as nothing at all.
// `kid.js` has used this helper since v15.25 said "the kid has an edge", so
// his edge was most likely never there either; nothing could tell, because a
// missing outline looks like a design choice.
// Displacing along the normal instead happens BEFORE the skinning chunks
// touch `transformed`, so the fattening survives the pose.
//
// Two details that are load-bearing. The width is in TILES and is divided by
// the mesh's world scale, because the displacement is applied in object space
// — these rigs are drawn at about 1/90, so a constant object-space number
// would give a hairline on one model and a coat on the next. And the shell is
// LAMBERT, not BASIC: `objectNormal` only exists in the basic shader behind
// `USE_ENVMAP`, so a basic shell silently compiles with nothing to push along.
// Black diffuse plus INK emissive renders flat ink under any light.
//
// It came from kid.js, where it was written for the kid and then needed by the
// enemies for the reason v15.28 recorded: a mid-brown mesh against pipe stacks
// of the same value has no edge, and the model that replaced the box read
// worse than the box. It lives here because this is the module that decides
// what a surface in this game looks like.
// ---- THE RIM ------------------------------------------------------------
//
// ART_TARGET rung 4: "rim light on the cast only. One cheap fresnel term in
// the character material is what keeps a silhouette readable against a busy
// background — this is how TF wins property 5, and it costs one shader
// chunk." The audit's own scoring of property 5 is "code-built kid, strong
// shapes, NO RIM LIGHT", and captured frames of all four worlds agree: on
// the night shift the kid is a mid-dark figure against a mid-dark depot and
// the brightest things near him are the bolts.
//
// The ink outline below already draws an edge. An outline says "here is a
// boundary"; a rim says "here is a form, and it is in front". They do
// different jobs and the reference uses both.
//
// COMPUTED IN THE VERTEX SHADER, deliberately. Per-pixel fresnel needs
// `vViewPosition`, which is not guaranteed to exist in every material this
// might be handed; the vertex shader always has `transformedNormal` (view
// space, and it comes out of the SKINNING chunks, so it survives a pose) and
// `mvPosition`. On a low-poly character the interpolated result is
// indistinguishable and it is one pow() per vertex instead of per fragment.
//
// It ADDS to `totalEmissiveRadiance` rather than multiplying the diffuse, so
// the rim is a light on the silhouette and not a repaint of the material —
// and so it survives `applyMood`'s colour multiply (light.js), which is what
// dims everything else at night.
const RIM = { color: '#ffffff', power: 2.6, strength: 0.5 };

/**
 * A fresnel rim on every mesh under `root`, skipping the ink shell. Returns
 * the uniform objects so a caller can retune them per world without
 * rebuilding the model — see `setRim`.
 */
export function rimLight(root, opts = {}) {
  const o = { ...RIM, ...opts };
  const us = [];
  root.traverse((m) => {
    if (!m.isMesh || m.userData.__outline) return;
    const mat = m.material;
    if (!mat || mat.__rim) return;
    const u = {
      uRimColor: { value: new THREE.Color(o.color) },
      uRimStrength: { value: o.strength },
      uRimPower: { value: o.power },
    };
    mat.__rim = u;
    const prev = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      if (prev) prev(sh, r);
      Object.assign(sh.uniforms, u);
      sh.vertexShader = 'varying float vRimF;\nuniform float uRimPower;\n' + sh.vertexShader.replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n\tvRimF = pow(1.0 - abs(dot(normalize(transformedNormal), normalize(-mvPosition.xyz))), uRimPower);',
      );
      sh.fragmentShader = 'varying float vRimF;\nuniform vec3 uRimColor;\nuniform float uRimStrength;\n' + sh.fragmentShader.replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += uRimColor * (vRimF * uRimStrength);',
      );
    };
    // an injected uniform must not share a program with a material that has
    // none — same rule the ink shell above already lives by
    mat.customProgramCacheKey = () => 'rim';
    mat.needsUpdate = true;
    us.push(u);
  });
  root.userData.__rim = us;
  return us;
}

/**
 * Retune a built rim. The cast crosses four worlds without being rebuilt, and
 * what makes a silhouette read is not the same light in a sunlit yard as it
 * is on a night shift — so the colour and the strength are a per-world dial
 * (`CAST_RIM` in light.js), not a constant.
 */
export function setRim(root, color, strength) {
  for (const u of root.userData.__rim || []) {
    u.uRimColor.value.set(color);
    u.uRimStrength.value = strength;
  }
}

const OUTLINE = 0.028;           // tiles — a line, not a border
export function outlineShell(root, width = OUTLINE) {
  root.updateWorldMatrix(true, true);
  const targets = [];
  root.traverse((o) => { if (o.isMesh && !o.userData.__outline) targets.push(o); });
  // A SKINNED MESH IS NOT DRAWN AT ITS NODE'S SCALE, and taking that number is
  // how the first cut of this put a black shell across the whole sky. Meshy
  // hangs `char1` under a 0.01 cm→m node, so its world scale reads 0.008 while
  // the thing on screen is 0.7 tiles tall — the size comes from the BONES, by
  // way of bindMatrix, not from the node transform. Dividing by 0.008 asked
  // for a 180% inflation. The honest ratio for a skinned mesh is what it
  // MEASURES on screen over what its geometry measures in bind space; for an
  // ordinary mesh the node scale is exactly right.
  const wb = new THREE.Box3().setFromObject(root);
  const worldH = Math.max(1e-6, wb.max.y - wb.min.y);
  const _s = new THREE.Vector3();
  for (const m of targets) {
    m.geometry.computeBoundingBox();
    const gb = m.geometry.boundingBox;
    const geomH = Math.max(1e-6, gb.max.y - gb.min.y);
    let k;
    if (m.isSkinnedMesh) k = worldH / geomH;
    else { m.getWorldScale(_s); k = (Math.abs(_s.x) + Math.abs(_s.y) + Math.abs(_s.z)) / 3; }
    const w = width / Math.max(1e-6, k);
    const mat = new THREE.MeshLambertMaterial({
      color: 0x000000, emissive: PAL.INK, side: THREE.BackSide, depthWrite: false,
    });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uOutline = { value: w };
      sh.vertexShader = 'uniform float uOutline;\n' + sh.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n\ttransformed += normalize(objectNormal) * uOutline;',
      );
    };
    // a material with an injected uniform must not be shared across programs
    mat.customProgramCacheKey = () => 'inkshell' + w.toFixed(5);
    let shell;
    if (m.isSkinnedMesh) {
      shell = new THREE.SkinnedMesh(m.geometry, mat);
      shell.bind(m.skeleton, m.bindMatrix);
    } else {
      shell = new THREE.Mesh(m.geometry, mat);
    }
    shell.userData.__outline = true;
    // What the gate reads. The displacement is a shader uniform, so no Box3
    // can see it — an outline that is absent and an outline that swallows the
    // screen are both invisible to every measurement this project already
    // has, and this release shipped one of each before a picture caught them.
    // As a FRACTION of the mesh it wraps, which is the number that means the
    // same thing on every model.
    shell.userData.__outlineFrac = w / geomH;
    shell.renderOrder = -1;
    shell.frustumCulled = false;   // it is bigger than the geometry says it is
    m.add(shell);
  }
}
