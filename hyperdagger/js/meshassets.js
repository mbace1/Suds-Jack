import * as THREE from 'three';
import { VoxelSprite, bakeShading, MODELS } from './voxel.js?v=54';

// registry keys are MODELS keys; enemies hand us the model OBJECT, so keep
// the reverse map here where both sides are visible
const SLOT_OF = new Map(Object.entries(MODELS).map(([k, v]) => [v, k]));

/**
 * Mesh assets — the Nano Banana → Meshy pipeline's landing pad (v4.35).
 *
 * A Meshy GLB becomes an enemy in two halves, on the v4.32 split:
 *  - the mesh itself is the ALIVE-SKIN (in the hull slot), lit by the new
 *    asset light rig and re-materialed to Lambert (the rest of the game is
 *    unlit MeshBasic, so the lights touch imported assets and nothing else);
 *  - the lattice is VOXELIZED from the mesh at load, so chips, chunk
 *    detachment, death bursts and the bone-yard keep working unchanged.
 *
 * Damage tells the truth: chips tear the lattice under the skin, and when
 * enough matter is gone (SKIN_SHED) the skin shatters off in a debris burst
 * and the wounded voxel body fights on — the skin is how it looks whole,
 * the voxels are what it IS.
 *
 * Drop Meshy exports into assets/ and register them below. Everything is
 * fail-soft: a missing or broken file logs one warning and the enemy keeps
 * its built-in string-art model, so the game never breaks on a bad export.
 */

// slot → asset config. height = world height in units (hitboxes are locked
// per enemy class, so match the slot's current model height — see the table
// in ART_PIPELINE.md). voxelSize ≈ the slot's current lattice pitch.
// emissive (optional) re-lights near-black-red texels? No — keep Meshy
// textures flat; `emissive: 0xrrggbb` adds a uniform glow if an asset needs it.
export const MESH_ASSETS = {
  // skull:     { url: 'assets/skull.glb?v=1',     height: 1.40, voxelSize: 0.14, yaw: 0 },
  // watcher:   { url: 'assets/watcher.glb?v=1',   height: 0.76, voxelSize: 0.19, yaw: 0 },
  // leviathan: { url: 'assets/leviathan.glb?v=1', height: 6.30, voxelSize: 0.35, yaw: 0 },
};

/** Fraction of the lattice that must survive for the skin to stay on. */
export const SKIN_SHED = 0.78;

const loaded = new Map(); // slot → { template, voxels, size } | null (failed)

/** True once preloadSkins has resolved (assets may still have failed). */
export let skinsReady = false;

/** Kick off loading every registered asset. Resolves when all settled;
 *  failures resolve to null so one bad export can't block the rest. */
export async function preloadSkins() {
  const slots = Object.keys(MESH_ASSETS);
  if (!slots.length) { skinsReady = true; return; }
  // the loader is 110 KB — pay for it only when assets are registered
  const { GLTFLoader } = await import('../vendor/jsm/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();
  await Promise.all(slots.map(async slot => {
    const cfg = MESH_ASSETS[slot];
    try {
      const gltf = await loader.loadAsync(cfg.url);
      loaded.set(slot, prepareAsset(gltf.scene, cfg));
    } catch (e) {
      console.warn(`mesh asset '${slot}' failed (${e.message ?? e}) — using the built-in model`);
      loaded.set(slot, null);
    }
  }));
  skinsReady = true;
}

/** Normalize + re-material + voxelize one loaded scene. */
export function prepareAsset(root, cfg) {
  // normalize: yaw, then scale so bbox height = cfg.height, centered on origin
  root.rotation.y = cfg.yaw ?? 0;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const h = Math.max(1e-6, box.max.y - box.min.y);
  const s = cfg.height / h;
  root.scale.multiplyScalar(s);
  root.updateMatrixWorld(true);
  box.setFromObject(root);
  const c = box.getCenter(new THREE.Vector3());
  root.position.sub(c);
  root.updateMatrixWorld(true);

  // Lambert conversion: responds to the asset light rig, costs almost
  // nothing, and keeps the albedo map. Everything native stays MeshBasic,
  // so the lights change imported assets and nothing else.
  root.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    o.material = new THREE.MeshLambertMaterial({
      map: m.map ?? null,
      color: m.color ? m.color.clone() : new THREE.Color(0xffffff),
      emissive: cfg.emissive ? new THREE.Color(cfg.emissive) : new THREE.Color(0x000000),
    });
    o.material.side = THREE.FrontSide;
  });

  const { voxels, size } = voxelizeMesh(root, cfg.voxelSize);
  return { template: root, voxels, size };
}

/** Per-spawn sprite for a MODELS entry, or null when no (working) asset is
 *  registered — the caller falls back to the string-art model. */
export function skinFor(model) {
  const a = loaded.get(SLOT_OF.get(model));
  if (!a) return null;
  return VoxelSprite.fromVoxels(
    // each spawn mutates alive flags + colors — deep-copy the lattice
    a.voxels.map(v => ({ ...v, color: v.color.clone() })),
    a.size,
    a.template.clone(true), // shares geometry/materials, own transform tree
  );
}

// ---------------------------------------------------------------- voxelizer

const _va = new THREE.Vector3(), _vb = new THREE.Vector3(), _vc = new THREE.Vector3();
const _p = new THREE.Vector3();

/** Rasterize a mesh into a voxel lattice: surface cells take the texture
 *  color sampled at their UV; enclosed interior cells fill with a darkened
 *  average so a torn-open body shows flesh, not vacuum. Open (non-watertight)
 *  meshes degrade gracefully to a surface shell. */
export function voxelizeMesh(root, voxelSize) {
  const box = new THREE.Box3().setFromObject(root);
  // safety: never build a lattice bigger than ~64^3 — bump voxelSize instead
  const span = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(span.x, span.y, span.z);
  const size = Math.max(voxelSize, maxDim / 64);
  const key = (i, j, k) => i + j * 1024 + k * 1048576;
  const cells = new Map(); // key → {r,g,b,n}
  const gi = v => Math.round(v / size);

  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const pos = g.getAttribute('position');
    const uv = g.getAttribute('uv');
    const idx = g.getIndex();
    const n = idx ? idx.count : pos.count;
    const sampler = textureSampler(o.material);
    const at = t => (idx ? idx.getX(t) : t);
    for (let t = 0; t < n; t += 3) {
      const a = at(t), b = at(t + 1), cix = at(t + 2);
      _va.fromBufferAttribute(pos, a).applyMatrix4(o.matrixWorld);
      _vb.fromBufferAttribute(pos, b).applyMatrix4(o.matrixWorld);
      _vc.fromBufferAttribute(pos, cix).applyMatrix4(o.matrixWorld);
      // sample density: cover the triangle at half-voxel spacing
      const longest = Math.max(_va.distanceTo(_vb), _vb.distanceTo(_vc), _vc.distanceTo(_va));
      const steps = Math.max(1, Math.ceil(longest / (size * 0.5)));
      for (let iu = 0; iu <= steps; iu++) {
        for (let iv = 0; iv <= steps - iu; iv++) {
          const u = iu / steps, v = iv / steps, w = 1 - u - v;
          _p.set(
            _va.x * w + _vb.x * u + _vc.x * v,
            _va.y * w + _vb.y * u + _vc.y * v,
            _va.z * w + _vb.z * u + _vc.z * v,
          );
          const col = sampler(uv
            ? {
              x: uv.getX(a) * w + uv.getX(b) * u + uv.getX(cix) * v,
              y: uv.getY(a) * w + uv.getY(b) * u + uv.getY(cix) * v,
            } : null);
          const k = key(gi(_p.x) + 256, gi(_p.y) + 256, gi(_p.z) + 256);
          let cell = cells.get(k);
          if (!cell) cells.set(k, cell = { r: 0, g: 0, b: 0, n: 0 });
          cell.r += col.r; cell.g += col.g; cell.b += col.b; cell.n++;
        }
      }
    }
  });

  // interior fill: flood the OUTSIDE over empty cells from the bbox margin;
  // any empty cell never reached is enclosed → give it a darkened body color
  const lo = { x: gi(box.min.x) + 255, y: gi(box.min.y) + 255, z: gi(box.min.z) + 255 };
  const hi = { x: gi(box.max.x) + 257, y: gi(box.max.y) + 257, z: gi(box.max.z) + 257 };
  const outside = new Set();
  const stack = [[lo.x, lo.y, lo.z]];
  outside.add(key(lo.x, lo.y, lo.z));
  while (stack.length) {
    const [x, y, z] = stack.pop();
    for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
      const nx = x + dx, ny = y + dy, nz = z + dz;
      if (nx < lo.x || ny < lo.y || nz < lo.z || nx > hi.x || ny > hi.y || nz > hi.z) continue;
      const k = key(nx, ny, nz);
      if (outside.has(k) || cells.has(k)) continue;
      outside.add(k);
      stack.push([nx, ny, nz]);
    }
  }
  let br = 0, bg = 0, bb = 0, bn = 0;
  for (const cell of cells.values()) { br += cell.r / cell.n; bg += cell.g / cell.n; bb += cell.b / cell.n; bn++; }
  const body = bn ? { r: (br / bn) * 0.55, g: (bg / bn) * 0.55, b: (bb / bn) * 0.55 } : { r: 0.3, g: 0.3, b: 0.3 };
  const voxels = [];
  for (let x = lo.x + 1; x < hi.x; x++) {
    for (let y = lo.y + 1; y < hi.y; y++) {
      for (let z = lo.z + 1; z < hi.z; z++) {
        const k = key(x, y, z);
        const cell = cells.get(k);
        const enclosed = !cell && !outside.has(k);
        if (!cell && !enclosed) continue;
        const col = cell
          ? new THREE.Color(cell.r / cell.n, cell.g / cell.n, cell.b / cell.n)
          : new THREE.Color(body.r, body.g, body.b);
        voxels.push({ x: (x - 256) * size, y: (y - 256) * size, z: (z - 256) * size, color: col, key: cell ? 'M' : 'I' });
      }
    }
  }
  bakeShading(voxels, size);
  return { voxels, size };
}

// texture readback: one canvas per texture, sampled at UV
const samplerCache = new WeakMap();
function textureSampler(material) {
  const fallback = material.color ?? new THREE.Color(0.8, 0.8, 0.8);
  const tex = material.map;
  if (!tex || !tex.image || !tex.image.width) return () => fallback;
  let data = samplerCache.get(tex);
  if (!data) {
    const w = Math.min(256, tex.image.width), h = Math.min(256, tex.image.height);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(tex.image, 0, 0, w, h);
    data = { px: ctx.getImageData(0, 0, w, h).data, w, h };
    samplerCache.set(tex, data);
  }
  const out = new THREE.Color();
  return uvp => {
    if (!uvp) return fallback;
    const x = Math.min(data.w - 1, Math.max(0, Math.floor((uvp.x % 1 + 1) % 1 * data.w)));
    const y = Math.min(data.h - 1, Math.max(0, Math.floor(((1 - uvp.y) % 1 + 1) % 1 * data.h)));
    const i = (y * data.w + x) * 4;
    return out.setRGB(data.px[i] / 255, data.px[i + 1] / 255, data.px[i + 2] / 255);
  };
}
