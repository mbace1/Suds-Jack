// EERI — the asset seam (ART_BRIEF §2). The game never asks "file or
// placeholder?" — it asks this module for a model or a layer texture and
// gets the same shape either way:
//
//   model  → { root: Object3D, nodes: { name: Object3D, … } }
//   layer  → THREE.Texture or null (null = paint the built-in placeholder)
//
// assets/manifest.json decides which side of the seam each entry is on.
// A model that arrives without its contracted nodes is refused loudly and
// the placeholder ships instead — a silent half-rig is worse than a grey box.

import * as THREE from 'three';
import { PAL } from './palette.js?v=40';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js?v=1';

const BASE = new URL('../assets/', import.meta.url);

// ---- the house material language, enforced at the seam -------------------
// ART_BRIEF §3.2 makes this a make-or-break rule, not a preference: ONE
// palette ("no asset invents a colour") and ONE material language ("flat
// fills… no photo textures, no grunge maps, no PBR gloss anywhere"), because
// the whole risk of a 2D/3D game is the cast and the world reading as two
// different games sharing a screen. §5 says it again for GLBs.
//
// A generated model arrives with baked photo textures and metal/rough set,
// which is exactly that failure: the first excavator rendered rust-brown
// against a brown hoarding and stopped being safety yellow. The node
// contract is already enforced here, so the surface is too — a model whose
// manifest entry carries a `paint` map has its materials replaced by flat
// palette colours, keeping every bit of the geometry and the rig.
//
// Opt out per model by leaving `paint` off the entry.

const ROLE = {
  MACHINE: PAL.MACHINE, MACHINE_DK: PAL.MACHINE_DK,
  DARK: PAL.DARK, INK: PAL.INK,
  STEEL0: PAL.STEEL[0], STEEL1: PAL.STEEL[1], STEEL2: PAL.STEEL[2], STEEL3: PAL.STEEL[3],
  EARTH0: PAL.EARTH[0], EARTH1: PAL.EARTH[1], EARTH2: PAL.EARTH[2], EARTH3: PAL.EARTH[3],
  // the two state colours the PIECES need and the machines never did: a flag
  // cloth is HAZARD or MACHINE and a lit checkpoint is GREEN, and js/flag.js
  // already builds its code placeholders from exactly these two
  HAZARD: PAL.HAZARD, GREEN: PAL.GREEN,
};

// The cast is "painted wood and pressed steel" (§3.3), so its flat palette
// colours take the BALSA grain — brush strokes and a paint chip — the way the
// ground takes card and the grass takes felt. Same rule as everywhere: the
// map is greyscale and multiplies the palette colour, it never supplies one.
// Async and additive: the machine is already on screen in flat colour and
// gains its brushwork when the texture lands.
function grainPaint(mats) {
  getTexture('balsa').then((tex) => {
    if (!tex) return;
    // An imported GLB carries its OWN UV atlas — 0…1 across the whole model —
    // so `craftBox`'s world-space trick is not available and a plain repeating
    // map simply stretches one copy of the brushwork over the entire machine,
    // which is why the excavator still read as smooth plastic. Tile it across
    // the atlas instead. Cloned per call: repeat lives on the Texture, and
    // the cached one is shared with every other surface asking for balsa.
    const t = tex.clone();
    t.needsUpdate = true;
    t.repeat.set(9, 9);
    for (const m of mats) { m.map = t; m.needsUpdate = true; }
  });
}

function housePaint(root, paint, name) {
  // a mesh belongs to the NEAREST named owner above it, so painting `house`
  // does not reach down into the beacon hanging off it — the beacon is an
  // unlit lamp and repainting it would put the machine's one light out
  const owners = new Set([...Object.keys(paint), 'beacon']);
  const mats = new Map();
  const flat = (role) => {
    if (!mats.has(role)) {
      const c = ROLE[role];
      if (!c) console.warn(`[eeri] model "${name}": unknown palette role "${role}"`);
      mats.set(role, new THREE.MeshLambertMaterial({ color: c || 0xff00ff }));
    }
    return mats.get(role);
  };
  for (const [nodeName, role] of Object.entries(paint)) {
    // resolved off the model, not the rig contract: a paint map may name
    // parts the game never animates (the track frames, say)
    const node = root.getObjectByName(nodeName);
    if (!node) { console.warn(`[eeri] model "${name}": paint names "${nodeName}", which is not in the model`); continue; }
    node.traverse((o) => {
      if (!o.isMesh) return;
      let owner = o;
      while (owner && !owners.has(owner.name)) owner = owner.parent;
      if (owner?.name !== nodeName) return;          // somebody else's part
      const old = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of old) { m.map?.dispose(); m.dispose(); }
      o.material = flat(role);
    });
  }
  // the beacon is a LIGHT and must stay unlit and untextured — brushing it
  // would put the machine's one lamp out, which is its unmanned tell (§1.2)
  grainPaint([...mats.values()]);
}

let manifest = null;

export async function loadManifest() {
  // THE MANIFEST'S OWN TOKEN MUST MATCH THE `v` INSIDE IT. The manifest
  // declares the cache token for every asset, so it is the one file that
  // cannot bust itself: a returning visitor holding a cached copy at the old
  // token never learns the new one exists and keeps the old art forever,
  // with every asset URL inside it still perfectly correct. This shipped at
  // `?v=1` for eleven versions. The smoke gate now asserts the two agree.
  const res = await fetch(new URL('manifest.json?v=32', BASE));
  manifest = await res.json();
  return manifest;
}

// ---- 3D: models against a rig contract -----------------------------------

// NO PBR GLOSS ANYWHERE (ART_BRIEF §3.1/§3.4) — enforced here rather than
// hoped for per asset.
//
// Every Meshy export arrives `metallic 0.5, roughness 0.5`: half metal, half
// gloss. This scene has ONE hemisphere fill and ONE directional key and
// deliberately no environment map, and a metal with nothing to reflect
// renders DARK. That is not a subtlety — it is why the collectable bolts read
// as specks of dirt on the ground rather than as the thing you are there to
// pick up, and it would have done the same to every machine as it got wired.
//
// The hand-built models in the same folder are already `metallic 0,
// roughness 1`, which is what "painted toy" means in glTF terms. So this
// levels the two families to the same language on load: matte, lit by the
// rig, colour from the map.
//
// Left alone on purpose: baseColor and the texture. This changes how a
// surface answers light, not what colour it is.
function paintedToy(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (!m) continue;
      if (m.metalness !== undefined) m.metalness = 0;
      if (m.roughness !== undefined) m.roughness = 1;
      m.needsUpdate = true;
    }
  });
}


export async function getModel(name, buildPlaceholder, kind = 'models') {
  const entry = manifest?.[kind]?.[name];
  if (!entry || entry.status !== 'live') return buildPlaceholder();
  try {
    const gltf = await new GLTFLoader().loadAsync(new URL(entry.file + '?v=' + manifest.v, BASE).href);
    const root = gltf.scene;
    paintedToy(root);

    // HEIGHT IN TILES, AND IT APPLIES TO EVERY RIG KIND. Meshy rigs to
    // real-world metres, so Eeri arrived 0.95 units tall in a world where he
    // is 1.62 and stood in the level like a background figure. Data, not a
    // number buried in game code.
    // It used to live INSIDE the skinned branch, which meant a node rig or a
    // prop could declare `height` and silently not get it — the manifest, the
    // README and the audit tool all say the seam rescales to this field, so a
    // model that quietly ignored it is the expensive kind of wrong: it renders
    // perfectly, at the wrong size, and no gate can tell. Two were doing it —
    // `rollerbot` declared 0.5 and arrived 0.76 (52% too big, which is a whole
    // enemy reading as a different enemy), and `token_bolt` declared 0.85 and
    // arrived 0.62. The rescale is a no-op for an entry with no `height`, so
    // hoisting it cannot touch anything that was not already asking for it.
    const fitHeight = () => {
      if (!entry.height) return;
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const h = box.max.y - box.min.y;
      if (h > 0.001) root.scale.multiplyScalar(entry.height / h);
    };

    // A SECOND KIND OF RIG. A hand-cut model is a tree of named nodes the
    // game rotates. A Meshy auto-rigged character is a SKINNED mesh driven by
    // named CLIPS — a bone skeleton, not the game's node names — so it is
    // checked against `clips`. `rig: "skinned"` picks which, and both come
    // back through this one call so game code cannot tell them apart.
    if (entry.rig === 'skinned') {
      const clips = {};
      for (const c of gltf.animations) clips[c.name] = c;
      const lacking = (entry.clips || []).filter((c) => !clips[c]);
      if (lacking.length) {
        console.warn(`[eeri] model "${name}" is missing clips: ${lacking.join(', ')} — using placeholder`);
        return buildPlaceholder();
      }
      if (entry.paint) housePaint(root, entry.paint, name);
      else root.traverse((o) => {          // §3.2 applies either way
        if (!o.isMesh && !o.isSkinnedMesh) return;
        const m = o.material;
        o.material = new THREE.MeshLambertMaterial({
          map: m.map ?? null, color: m.color?.clone() ?? new THREE.Color(0xffffff),
        });
      });
      fitHeight();
      return { root, nodes: {}, clips, skinned: true, live: true };
    }

    // A PROP has neither nodes nor clips — nothing inside it moves, the game
    // spins and bobs it whole (a bolt, a token). Without this it fell into
    // the node loop, threw on an absent `nodes`, and silently served the code
    // placeholder instead of the model that had just been fetched.
    if (entry.rig === 'prop') { fitHeight(); return { root, nodes: {}, clips: {}, live: true }; }

    const nodes = {};
    const missing = [];
    for (const n of entry.nodes || []) {
      const obj = root.getObjectByName(n);
      if (obj) nodes[n] = obj; else missing.push(n);
    }
    if (missing.length) {
      console.warn(`[eeri] model "${name}" is missing contracted nodes: ${missing.join(', ')} — using placeholder`);
      return buildPlaceholder();
    }
    if (entry.paint) housePaint(root, entry.paint, name);
    fitHeight();
    return { root, nodes, live: true };
  } catch (e) {
    console.warn(`[eeri] model "${name}" failed to load (${e.message}) — using placeholder`);
    return buildPlaceholder();
  }
}

// manipulable world pieces are the same contract in a different block
export function getPiece(name, buildPlaceholder) {
  return getModel(name, buildPlaceholder, 'pieces');
}

// ---- 2D: layer paintings --------------------------------------------------

// ---- 2D for the DOM: the title logo and the button sheet ------------------
//
// The layer path below returns a `THREE.Texture`, which is the right thing
// for something that goes on a plane in the scene and the wrong thing for
// something that goes in an `<img>`. The intro's logo is DOM, not scene.
//
// So this is its own small seam: a `ui` block in the manifest, `status`
// flipped the same way as everything else, and a plain URL back. It returns
// **null** rather than throwing when there is no entry, because the caller's
// job is to draw its own thing in that case — the intro ships a code-drawn
// wordmark and swaps to the painted logo when one exists.
export function uiAsset(name) {
  const entry = manifest?.ui?.[name];
  if (!entry || entry.status !== 'live') return null;
  return new URL(entry.file + '?v=' + manifest.v, BASE).href;
}

// Returns an ARRAY of textures, left to right across the lane's rect.
//
// A LANE MAY BE SPLIT ACROSS SEVERAL TEXTURES, and that is the only way past
// the 4096 cap. The close lanes are magnified on screen — the play plane
// shows ~57 px per world unit and the fore lane ~69 — while one 4096-wide
// texture over a 112-unit rect can only carry 36.6. Two carry 73, which is
// past the camera, and that is the difference between craft paper you can
// read the grain of and a soft photograph of it.
//
// It costs memory, not disk: two tiles decode to twice the RGBA of one
// whatever the file compresses to. That is why it is opt-in per lane rather
// than applied to all six — `near` and `mid` carry the dressing the player
// actually looks at, and the far lanes sit behind a depth tint where softness
// is the aerial perspective doing its job.
export async function getLayerTexture(world, layer) {
  const entry = manifest?.layers?.[world]?.[layer];
  if (!entry || entry.status !== 'live') return null;
  const files = entry.files || (entry.file ? [entry.file] : []);
  if (!files.length) return null;
  try {
    const texs = await Promise.all(files.map(async (f) => {
      const tex = await new THREE.TextureLoader().loadAsync(new URL(f + '?v=' + manifest.v, BASE).href);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      return tex;
    }));
    return texs;
  } catch (e) {
    console.warn(`[eeri] layer "${world}/${layer}" failed to load (${e.message}) — painting placeholder`);
    return null;
  }
}

// ---- surfaces: a crafted DETAIL MAP over the palette ---------------------
// The playfield is flat-coloured boxes and the layers behind it are crafted
// card, so the gameplay plane was the one thing still reading as paint. Fixed
// with a material: a greyscale card map MULTIPLIED onto each surface's own
// palette colour, so §3.2's "no asset invents a colour" holds exactly.
const texCache = new Map();

export async function getTexture(name) {
  const entry = manifest?.textures?.[name];
  if (!entry || entry.status !== 'live') return null;
  if (texCache.has(name)) return texCache.get(name);
  const p = new THREE.TextureLoader().loadAsync(new URL(entry.file + '?v=' + manifest.v, BASE).href)
    .then((tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    })
    .catch((e) => {
      console.warn(`[eeri] texture "${name}" failed to load (${e.message}) — flat colour`);
      return null;
    });
  texCache.set(name, p);
  return p;
}

export function manifestData() { return manifest; }
