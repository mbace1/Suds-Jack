import * as THREE from 'three';
import { bakeShading } from './voxel.js?v=66';

/**
 * ARENA MESH ASSETS — the Meshy pipeline's landing pad for ENVIRONMENT.
 *
 * Enemy skins are NOT here: `mesh-enemies.js` owns those and is already
 * wired into enemy.js. This module keeps the two jobs that module does not
 * do — the instanced floor-panel field, and the mesh voxelizer that turns
 * an imported mesh into a damage lattice.
 *
 * Everything is fail-soft: nothing registered means nothing loads, and a
 * broken file logs one warning and leaves the procedural arena alone.
 */

/**
 * ARENA assets — environment, not enemies, so they never get voxelized and
 * never take damage. `floorPanel` is the one the owner asked for: a Meshy
 * floor tile, instanced across the disc on a square grid and clipped to the
 * arena radius. It sits just above the procedural floor so the glowing seams
 * still read between the plates, and it inherits the same asset light rig,
 * which is the whole point — a Meshy panel underfoot and a Meshy skull above
 * it are lit by the same two sources.
 *
 *   floorPanel: { url: 'assets/panel.glb?v=1', size: 4, yaw: 0, lift: 0.02 }
 *
 * `size` is the tile's world footprint in units (the disc is ARENA_R×2
 * across, so size 4 on a 44-unit disc is ~95 tiles — keep the GLB cheap,
 * ≤2k tris, it is instanced).
 */
export const ARENA_ASSETS = {
  // floorPanel: { url: 'assets/panel.glb?v=1', size: 4, yaw: 0, lift: 0.02 },
};





/**
 * Build the instanced floor-panel field, or null when no panel is
 * registered (the procedural floor is always there underneath either way).
 * Returns an Object3D the caller adds to the scene.
 */
export async function buildFloorPanels(arenaR) {
  const cfg = ARENA_ASSETS.floorPanel;
  if (!cfg) return null;
  let root;
  try {
    const { GLTFLoader } = await import('../vendor/jsm/loaders/GLTFLoader.js');
    root = (await new GLTFLoader().loadAsync(cfg.url)).scene;
  } catch (e) {
    console.warn(`floor panel failed (${e.message ?? e}) — procedural floor only`);
    return null;
  }
  // normalize the tile to `size` across, sitting ON the floor plane
  root.rotation.y = cfg.yaw ?? 0;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const span = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 1e-6);
  root.scale.multiplyScalar((cfg.size ?? 4) / span);
  root.updateMatrixWorld(true);

  // merge every mesh in the tile into ONE instanced draw — a 95-tile floor
  // must not be 95 draw calls (or 285, if the export has three parts)
  const geos = [];
  let mat = null;
  root.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    // keep only position/uv/normal so the merge can't fail on mismatched attrs
    for (const name of Object.keys(g.attributes)) {
      if (!['position', 'uv', 'normal'].includes(name)) g.deleteAttribute(name);
    }
    geos.push(g);
    mat ??= o.material;
  });
  if (!geos.length) return null;
  const { mergeGeometries } = await import('../vendor/jsm/utils/BufferGeometryUtils.js');
  const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
  if (!merged) { console.warn('floor panel: geometry merge failed — procedural floor only'); return null; }
  merged.computeBoundingBox();
  // drop the tile so its top face sits at y=0 + lift
  const mb = merged.boundingBox;
  merged.translate(0, -mb.max.y + (cfg.lift ?? 0.02), 0);

  const lit = new THREE.MeshLambertMaterial({
    map: mat?.map ?? null,
    color: mat?.color ? mat.color.clone() : new THREE.Color(0xffffff),
  });
  const size = cfg.size ?? 4;
  const n = Math.ceil((arenaR * 2) / size) + 1;
  const spots = [];
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const x = (i - (n - 1) / 2) * size;
      const z = (j - (n - 1) / 2) * size;
      // clip to the disc — a square field would spill past the rim, and the
      // rim ending cleanly is load-bearing (no barrier visual)
      if (Math.hypot(x, z) > arenaR - size * 0.35) continue;
      spots.push([x, z]);
    }
  }
  const mesh = new THREE.InstancedMesh(merged, lit, spots.length);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  spots.forEach(([x, z], i) => {
    // quarter-turn variety so a directional tile doesn't stripe the floor
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), (Math.floor(Math.random() * 4) * Math.PI) / 2);
    m.compose(new THREE.Vector3(x, 0, z), q, one);
    mesh.setMatrixAt(i, m);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  mesh.userData.tiles = spots.length;
  return mesh;
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
