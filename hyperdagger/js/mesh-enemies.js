import * as THREE from 'three';
import { toLambert } from './meshassets.js?v=67';

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

export const MESH_FOR_TYPE = {
  skull: 'skull', dread: 'skull', brute: 'skull',
  spider: 'spider', totem: 'totem',
};

const templates = new Map();
let loading = null;
let lastDeclared = [];

export function preloadMeshEnemies() {
  if (loading) return loading;
  loading = (async () => {
    const declared = await readManifest();
    const kinds = Object.keys(declared).filter(k => KIND_SIZE[k]);
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
    const loader = new GLTFLoader();
    await Promise.all(kinds.map(async kind => {
      const cfg = declared[kind];
      const url = new URL(cfg.file, BASE).href;
      try {
        const gltf = await loader.loadAsync(url);
        const root = gltf.scene;
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
    }));
  })();
  return loading;
}

/** What the seam actually did this boot: what the manifest named and what
 *  loaded. A system that fails soft needs a way to say it did nothing —
 *  this one was never called at all and nothing could tell. */
export function meshSkinState() {
  return { declared: [...lastDeclared], loaded: [...templates.keys()], ran: !!loading };
}

export function cloneMeshEnemy(kind) {
  const t = templates.get(kind);
  if (!t) return null;
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
