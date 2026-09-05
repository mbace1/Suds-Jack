import * as THREE from 'three';
import { toLambert, voxelizeMesh } from './meshassets.js?v=70';
import { MODELS, registerVoxelModel } from './voxel.js?v=70';

// assets/ is the documented drop-in home (see assets/README.md). An earlier
// cut of this file invented a second one, `models/enemies/`, which existed in
// no branch — while 5 MB of real Meshy exports sat unused in assets/.
const BASE = new URL('../assets/', import.meta.url).href;

// Fallback fit (largest dimension, world units) per kind, used when the
// manifest does not state one. skull is 1.40 because that is the height the
// string-art slot it replaces stands at, and assets/README.md is explicit
// that a mismatch here changes how an enemy LOOKS against how it HITS.
const KIND_SIZE = { skull: 1.40, spider: 1.5, totem: 2.6 };

/**
 * THE SEAM. The loader used to name all three GLBs unconditionally, so a tree
 * with no art in it fired three requests that 404 on EVERY boot — fail-soft,
 * but a console full of misses is not the same as nothing going wrong. A kind
 * is requested only if `models/enemies/manifest.json` names it. The manifest
 * itself is allowed to be missing (an older deploy), and then nothing at all
 * is asked for.
 */
async function readManifest() {
  try {
    const r = await fetch(BASE + 'manifest.json');
    if (!r.ok) return {};
    const j = await r.json();
    const models = (j && typeof j.models === 'object' && j.models) || {};
    // A kind may be a bare filename or { file, size, tint } — the long form
    // exists so the fit and the colour are tunable without touching code,
    // which is the point of a seam.
    const out = {};
    for (const [kind, v] of Object.entries(models)) {
      const cfg = typeof v === 'string' ? { file: v } : (v || {});
      if (cfg.file) out[kind] = cfg;
    }
    return out;
  } catch { return {}; }
}

/**
 * THE VOXEL ROUTE (v38). A manifest entry with `as: "voxel"` is not shown as
 * a mesh at all: it is scaled to the height of the string-art slot it
 * replaces (so the hitbox and every gameplay number hold), rasterized into
 * a lattice at `pitch` (default: a third of the slot's pitch — the ×27 mini
 * size the game already budgets for), its colours snapped to the house
 * palette, and registered so `modelFor(kind)` hands it to the enemy class.
 * Chips, islands, gibs and the bone-yard all work unchanged, because to the
 * rest of the engine it is just voxels.
 *
 *   "skull": { "file": "skull.glb", "as": "voxel", "palette": "bone",
 *              "pitch": 0.045, "eyes": [[0.34,0.62,0.78],[0.66,0.62,0.78]],
 *              "eyeR": 1.6, "jaw": 0.22 }
 *
 *   palette  "bone" maps luminance onto the skull's bone ramp and keeps
 *            strong reds as crimson; "keep" leaves the texture's colours
 *   eyes     normalized [x,y,z] in the model's box (x left→right,
 *            y bottom→top, z back→FRONT); voxels within eyeR cells burn HDR
 *   jaw      fraction of height that becomes the hinged jaw (skull only)
 */
const BONE = { r: 0xd8 / 255, g: 0xd2 / 255, b: 0xc4 / 255 };
const CRIMSON = { r: 0.55, g: 0.09, b: 0.06 };
const EMBER = [4.4, 0.12, 0.025];
const BANDS = 5; // albedo value steps in the bone remap
function remapColor(c, mode, lift = 1) {
  if (mode !== 'bone') return c;
  // lift: a Meshy bake that is dark all over (brute, dread) lands in the
  // bottom bands and its sockets stop reading — the curve wants it pulled up
  const lum = Math.min(1, (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) * lift);
  const redness = c.r - Math.max(c.g, c.b);
  if (redness > 0.22 && c.r > 0.3) {
    // a real red in the source (mouth, wound, marking) stays crimson
    return c.setRGB(CRIMSON.r * (0.6 + lum), CRIMSON.g, CRIMSON.b);
  }
  // bone: an S-curve keeps the texture's DARKS dark — sockets, the nasal
  // hole, the gaps between teeth are what make a skull read — and pushes
  // the lights to ivory; then the value is BANDED to five steps. With the
  // speckle blurred out first, banding the albedo is what makes a limited
  // palette: hard value regions, the way a sprite is coloured.
  const t = Math.min(1, Math.max(0, (lum - 0.08) / 0.62));
  const sc = t * t * (3 - 2 * t);
  const k = Math.round((0.16 + sc * 0.84) * BANDS) / BANDS;
  return c.setRGB(BONE.r * k, BONE.g * k, BONE.b * k);
}
const SLOT_HEIGHT = { skull: 1.40 }; // the sculpt without its horn shelves
function slotHeight(kind) {
  if (SLOT_HEIGHT[kind]) return SLOT_HEIGHT[kind];
  const m = MODELS[kind];
  return m ? m.layers.length * m.voxelSize : 1.2;
}
/** Turn an export upright and fit it to its slot: yaw, tilt, scale to the
 *  slot HEIGHT (hitboxes hold), centre on the origin. Done once per kind. */
function prepareRoot(root, cfg, height) {
  // yaw (radians): the game lookAt()s the player along +z, so an export that
  // faces some other way is turned here, before it is cut into cells.
  // tilt (radians about x): the brute export arrived nose-down, so from the
  // front the game saw the top of its cranium — a turn about y cannot fix
  // that. NOT called pitch: `pitch` is the lattice cell size, and the first
  // cut of this reused the word and sliced the brute into 0.75-unit cubes.
  root.rotation.set(cfg.tilt || 0, cfg.yaw || 0, 0);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const h = Math.max(1e-6, box.max.y - box.min.y);
  root.scale.multiplyScalar(height / h);
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  root.position.sub(box.getCenter(new THREE.Vector3()));
  root.updateMatrixWorld(true);
  return box.setFromObject(root);
}

/** Cut a prepared root into a coloured lattice at `pitch`. */
function cutLattice(root, box, cfg, pitch) {
  const { voxels, size } = voxelizeMesh(root, pitch);
  const span = box.getSize(new THREE.Vector3());
  // eyes: HDR ember at the marked spots, recessed the way the sculpt's are
  const eyes = (cfg.eyes || []).map(([nx, ny, nz]) => ({
    x: box.min.x + nx * span.x, y: box.min.y + ny * span.y, z: box.min.z + nz * span.z,
  }));
  const eyeR = (cfg.eyeR || 1.6) * size;
  // Coherence before colour. A Meshy bake carries texture detail far finer
  // than the lattice, so a cell sampled on its own is one random speck of
  // it and the whole body reads as static. A 26-neighbour average over the
  // SURFACE cells keeps the features a skull is made of — the dark of a
  // socket spans many cells — and drops the ones it is not.
  const keyOf = v => `${Math.round(v.x / size)},${Math.round(v.y / size)},${Math.round(v.z / size)}`;
  const surf = new Map();
  for (const v of voxels) if (v.key === 'M') surf.set(keyOf(v), v);
  const passes = cfg.smooth ?? 1;
  for (let pass = 0; pass < passes; pass++) {
    const next = new Map();
    for (const [k, v] of surf) {
      const [ix, iy, iz] = k.split(',').map(Number);
      let r = v.color.r, g = v.color.g, b = v.color.b, n = 1;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        if (!dx && !dy && !dz) continue;
        const nb = surf.get(`${ix + dx},${iy + dy},${iz + dz}`);
        if (nb) { r += nb.color.r; g += nb.color.g; b += nb.color.b; n++; }
      }
      next.set(k, { r: r / n, g: g / n, b: b / n });
    }
    for (const [k, c] of next) surf.get(k).color.setRGB(c.r, c.g, c.b);
  }
  for (const v of voxels) {
    let ember = false;
    for (const e of eyes) {
      if (Math.hypot(v.x - e.x, v.y - e.y, v.z - e.z) <= eyeR) { ember = true; break; }
    }
    if (ember) { v.color.setRGB(EMBER[0], EMBER[1], EMBER[2]); v.key = 'R'; }
    else if (v.key === 'I') v.color.setRGB(BONE.r * 0.34, BONE.g * 0.30, BONE.b * 0.28); // marrow: only seen torn open
    else remapColor(v.color, cfg.palette || 'bone', cfg.lift || 1);
  }
  const base = { voxelSize: size, palette: {}, layers: [], noHull: true, source: cfg.file };
  const def = { ...base, voxels };
  if (cfg.jaw) {
    const cut = box.min.y + cfg.jaw * span.y;
    def.head = { ...base, voxels: voxels.filter(v => v.y >= cut) };
    def.jaw = { ...base, voxels: voxels.filter(v => v.y < cut) };
    // the hinge sits on the cut plane at the back third of the head, in the
    // def's own frame — the enemy swings the jaw about THIS, not about the
    // string-art sculpt's hand-tuned offsets
    def.hinge = { x: 0, y: cut, z: box.min.z + span.z * 0.3 };
  }
  return def;
}

/**
 * THE HYBRID (owner, on seeing the lattice alone: "what about the 3d models?
 * these voxel balls alone don't look that good"). The v4.35 design was
 * always both: the real Meshy mesh rides as the ALIVE-SKIN — lit, textured,
 * the sculpt as sculpted — and the lattice cut from that same mesh sits
 * underneath, so a wound sheds the skin and the voxel body fights on, and a
 * death bursts into cubes. Skin and lattice come from ONE prepared root, so
 * they coincide exactly; `skin: false` in the manifest gives cubes-only.
 */
function skinFrom(root, cfg) {
  const skin = root.clone(true);
  toLambert(skin);
  const tint = cfg.tint ? new THREE.Color(cfg.tint) : null;
  skin.traverse(o => {
    if (!o.isMesh) return;
    o.layers.enable(2);
    if (tint) o.material.color.multiply(tint);
    o.userData.baseColor = o.material.color.clone();
  });
  return skin;
}

function voxelizeKind(kind, root, cfg) {
  const t0 = performance.now();
  const m = MODELS[kind];
  const box = prepareRoot(root, cfg, cfg.height || slotHeight(kind));
  if (cfg.skin !== false) {
    const skin = skinFrom(root, cfg);
    skin.userData.voxelTwin = true; // only a body cut from THIS mesh may wear it
    templates.set(kind, skin);
  } else templates.delete(kind);
  const pitch = cfg.pitch || (m ? m.voxelSize / 3 : 0.05);
  const def = cutLattice(root, box, cfg, pitch);
  // THE LADDER STILL APPLIES. The perf governor walks string-art models down
  // ×27 → ×8 → ×1 as frames get expensive; a voxelized asset has no
  // subdivision to walk, so a T4 phone that used to get a 410-cube skull
  // would get 16,653 every spawn. Cut a coarse twin at double pitch (~1/8
  // the cells) and let modelFor() hand it out when the ladder is at ×1.
  def.lod = cutLattice(root, box, { ...cfg, smooth: 0 }, def.voxelSize * 2);
  registerVoxelModel(kind, def);
  timing.perKind[kind] = Math.round(performance.now() - t0);
  timing.cutMs += timing.perKind[kind];
  return def.voxels.length;
}

// enemy type → manifest kind. A type not listed here maps to a kind of the
// same name, which is how the fourteen voxel kinds find their own skins.
export const MESH_FOR_TYPE = {
  skull: 'skull', dread: 'skullDread', brute: 'brute',
  spider: 'spider', totem: 'totem', watcher: 'watcher', husk: 'husk',
  blinker: 'blinker', thorn: 'thorn', egg: 'egg', revenant: 'revenant',
  leviathan: 'leviathan', serpent: 'serpent', serpentHead: 'serpentHead',
};

// Skins can be shed by the perf governor: below the hull tier they cost
// more than a lattice and the cubes stand alone.
let skinsOn = true;
export function setMeshSkins(on) { skinsOn = !!on; }
export function meshSkinsOn() { return skinsOn; }

const templates = new Map();
const voxelized = new Map(); // kind → voxel count, for the bench readout
const roots = new Map();     // kind → the prepared scene, so a kind can be re-cut live
const declaredCfg = new Map();
const timing = { fetchMs: 0, cutMs: 0, perKind: {} }; // boot cost, for the bench
let loading = null;
let lastDeclared = [];

export function preloadMeshEnemies() {
  if (loading) return loading;
  loading = (async () => {
    const bootT0 = performance.now();
    // ?assets=0 — the gate uses this on pages that test the mode registry
    // rather than the art: fetching and cutting 5 MB of GLB per page reload
    // is most of the suite's wall clock, and those pages never spawn.
    if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('assets') === '0') return;
    const declared = await readManifest();
    let kinds = Object.keys(declared).filter(k => KIND_SIZE[k] || declared[k].as === 'voxel');
    // Cut in the order the player MEETS them (the director's unlock list), so
    // the skull is art before the first one reaches you and the leviathan can
    // take its time. Total work is the same; what changes is what is ready first.
    const meetOrder = ['skull', 'watcher', 'husk', 'brute', 'spider', 'blinker',
      'totem', 'thorn', 'egg', 'skullDread', 'serpent', 'serpentHead', 'revenant', 'leviathan'];
    kinds = kinds.slice().sort((a, b) => {
      const ia = meetOrder.indexOf(a), ib = meetOrder.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    lastDeclared = kinds;
    // No art registered is the normal state of this repo, and it costs nothing:
    // not even the GLTF loader is fetched, and every enemy stays string-art.
    if (!kinds.length) return;
    let GLTFLoader;
    try {
      const mod = await import('three/addons/loaders/GLTFLoader.js');
      GLTFLoader = mod.GLTFLoader;
    } catch (e) {
      console.warn('[mesh-enemies] GLTFLoader unavailable, voxel fallback only', e);
      return;
    }
    // Let the service worker take control first. It precaches every GLB the
    // manifest names, and the first kind is requested within milliseconds of
    // boot — early enough, on a first visit, to race the worker's activation
    // and go to the network instead of the cache. Offline that is a miss.
    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      await Promise.race([
        navigator.serviceWorker.ready.catch(() => {}),
        new Promise(r => setTimeout(r, 3000)), // never block the roster on it
      ]);
    }
    const loader = new GLTFLoader();
    // Cutting fourteen lattices is seconds of synchronous main-thread work, so
    // it is yielded between kinds: the menu stays responsive and the roster
    // densifies as the assets land, rather than the page locking up at boot.
    const yieldFrame = () => new Promise(r => requestAnimationFrame(r));
    // one at a time: fetching all fourteen at once makes the order meaningless
    // and starves the first one the player will actually meet
    for (const kind of kinds) await (async () => {
      const cfg = declared[kind];
      const url = new URL(cfg.file, BASE).href + '?v=' + (cfg.v || 1); // tokened: cache-first offline, CDN-safe
      try {
        const gltf = await loader.loadAsync(url);
        const root = gltf.scene;
        if (cfg.as === 'voxel') {
          roots.set(kind, root.clone(true)); // an untouched copy, for revoxelize
          declaredCfg.set(kind, cfg);
          await yieldFrame(); // let the frame that loaded it actually draw
          const n = voxelizeKind(kind, root, cfg);
          voxelized.set(kind, n);
          return;
        }
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 0.001);
        const target = cfg.size || KIND_SIZE[kind];
        root.scale.multiplyScalar(target / maxDim);
        root.updateMatrixWorld(true);
        const box2 = new THREE.Box3().setFromObject(root);
        const c = box2.getCenter(new THREE.Vector3());
        root.position.x -= c.x;
        root.position.z -= c.z;
        root.position.y -= box2.min.y;
        // Layer 2 is what the asset light rig illuminates — native geometry
        // stays unlit MeshBasic and never sees these lights.
        toLambert(root);
        const tint = cfg.tint ? new THREE.Color(cfg.tint) : null;
        root.traverse(o => {
          if (!o.isMesh) return;
          o.layers.enable(2);
          // A tint MULTIPLIES the baked albedo, so it pulls a Meshy export
          // toward the house palette without flattening the texture away.
          if (tint) o.material.color.multiply(tint);
          o.userData.baseColor = o.material.color.clone();
        });
        templates.set(kind, root);
      } catch (e) {
        console.warn('[mesh-enemies]', kind, e);
      }
    })();
    timing.fetchMs = Math.round(performance.now() - bootT0);
  })();
  return loading;
}

/**
 * Re-cut a loaded kind with manifest overrides, live — the voxel lab's
 * tuning loop. `pitch`, `yaw`, `lift`, `eyes`, `jaw`, `smooth`, `palette`
 * all take effect; the game's next spawn of that kind uses the result. This
 * is how a wrong-facing export is turned by looking at it, not by guessing.
 */
export function revoxelize(kind, overrides = {}) {
  const src = roots.get(kind);
  if (!src) return null;
  const cfg = { ...(declaredCfg.get(kind) || {}), ...overrides };
  declaredCfg.set(kind, cfg);
  const n = voxelizeKind(kind, src.clone(true), cfg);
  voxelized.set(kind, n);
  return { kind, cfg, voxels: n };
}
export function voxelConfig(kind) { return declaredCfg.get(kind) || null; }

/** What the seam actually did this boot: what the manifest named and what
 *  loaded. A system that fails soft needs a way to say it did nothing —
 *  this one was never called at all and nothing could tell. */
export function meshSkinState() {
  return {
    declared: [...lastDeclared],
    loaded: [...templates.keys(), ...voxelized.keys()],
    voxelized: Object.fromEntries(voxelized),
    ran: !!loading,
    timing: { ...timing, perKind: { ...timing.perKind } },
  };
}

/** `bodyVoxelized`: whether the caller's lattice came from the manifest. A
 *  skin cut alongside a lattice (the voxel route) refuses any other body —
 *  an enemy that spawned before the assets finished loading holds the
 *  string-art sculpt, and a Meshy skin over THAT would shed into a different
 *  skull. It stays a bare sculpt; the next spawn gets the real pair. */
export function cloneMeshEnemy(kind, bodyVoxelized = false) {
  const t = skinsOn ? templates.get(kind) : null;
  if (!t) return null;
  if (t.userData.voxelTwin && !bodyVoxelized) return null;
  const c = t.clone(true);
  c.traverse(o => {
    if (o.isMesh && o.material) {
      o.material = o.material.clone();
      o.userData.baseColor = o.material.color.clone();
    }
    o.layers?.enable(2);
  });
  return c;
}

export function flashMeshRoot(root, k = 1.8) {
  if (!root) return;
  root.traverse(o => {
    if (o.isMesh && o.material?.color) {
      o.material.color.setRGB(Math.min(1, 0.55 * k), Math.min(1, 0.18 * k), Math.min(1, 0.12 * k));
    }
  });
  root.userData.flashT = 0.14;
}

export function updateMeshRoot(root, dt) {
  if (!root || root.userData.flashT == null) return;
  root.userData.flashT -= dt;
  if (root.userData.flashT > 0) return;
  root.userData.flashT = null;
  root.traverse(o => {
    if (o.isMesh && o.userData.baseColor) o.material.color.copy(o.userData.baseColor);
  });
}
