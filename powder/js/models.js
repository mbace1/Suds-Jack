// Models — the door the Blender pipeline comes through.
//
// pipeline/README.md is the contract; this file ENFORCES it. A ship or a
// landmark arrives as a .glb, is checked against the spec (which way it
// faces, how big it is, what its materials are called, whether the empties
// the game needs are there), and is registered here. Nothing in this file
// knows how a ship is assembled — craft.js does that, from a loaded model
// when one is registered and from the procedural kit when it is not, so the
// game runs identically with zero, some, or all of the models present.
//
// Loading is async and vehicles are built synchronously at race start, so
// main.js calls preloadModels() at boot and the registry is simply consulted
// later. A model that fails validation is reported and NOT registered: a
// wrong-way-round ship is worse than the kit ship.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/** Material names the game assigns meaning to. Anything else is left as authored. */
export const MATERIALS = ['HULL', 'ACCENT', 'CHROME', 'GUNMETAL', 'GLASS', 'INTAKE', 'DECAL', 'FAN', 'LAND'];

/** The ship envelope, metres, in the game's frame (nose toward -z). */
export const SHIP = {
  length: [8.5, 12.5],       // z extent, probe included
  width:  [2.2, 4.4],        // x extent across the nacelles
  height: [1.0, 3.2],        // y extent
  tris: 9000,
  empties: ['nozzle_L', 'nozzle_R'],
  fans: ['fan_L', 'fan_R'],  // optional, spun by N1 when present
};
export const LANDMARK = { size: [3, 80], tris: 2500 };

export const models = {
  ships: {},          // id → { scene, box, tris, file }
  landmarks: [],      // [{ name, geo (merged, vertex colour), radius }]
  numerals: null,     // THREE.Texture: the 3x3 roundel sheet, or null
  report: [],         // human-readable validation lines, for the console
  ready: false,
};

const note = (line, warn = false) => { models.report.push(line); (warn ? console.warn : console.log)('[models] ' + line); };

function makeLoader() {
  const draco = new DRACOLoader();
  // the decoder rides on the same CDN as three itself (the importmap in
  // index.html), so a Draco-compressed file needs no local copy of it
  draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.167.0/examples/jsm/libs/draco/');
  const loader = new GLTFLoader();
  loader.setDRACOLoader(draco);
  return loader;
}

function triangles(root) {
  let n = 0;
  root.traverse(o => {
    if (!o.isMesh) return;
    const g = o.geometry;
    n += (g.index ? g.index.count : g.attributes.position.count) / 3;
  });
  return Math.round(n);
}

function materialNames(root) {
  const names = new Set();
  root.traverse(o => { if (o.isMesh) for (const m of Array.isArray(o.material) ? o.material : [o.material]) names.add(m.name || '(unnamed)'); });
  return [...names];
}

/**
 * Check a ship against the envelope and the naming contract. Returns the
 * list of problems; empty means it passes. Warnings (fans missing) are
 * noted but do not fail it.
 */
export function validateShip(root, file) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const problems = [];
  const within = (v, [a, b]) => v >= a && v <= b;
  if (!within(size.z, SHIP.length) || !within(size.x, SHIP.width) || !within(size.y, SHIP.height)) {
    problems.push(`${file}: envelope ${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)} m (w x h x l) is outside `
      + `${SHIP.width.join('-')} x ${SHIP.height.join('-')} x ${SHIP.length.join('-')}. `
      + (size.x > size.z ? 'The long axis is X: the ship is exported facing sideways. ' : '')
      + (size.y > size.z ? 'The long axis is Y: the ship is exported standing up (Blender +Z up was not converted). ' : '')
      + 'Model in metres, nose along Blender +Y, and apply scale before export.');
  }
  const tris = triangles(root);
  if (tris > SHIP.tris) problems.push(`${file}: ${tris} triangles, budget is ${SHIP.tris}`);
  const unknown = materialNames(root).filter(n => !MATERIALS.includes(n));
  if (unknown.length) problems.push(`${file}: materials not in the contract: ${unknown.join(', ')} (allowed: ${MATERIALS.join(', ')})`);
  for (const e of SHIP.empties) if (!root.getObjectByName(e)) problems.push(`${file}: empty '${e}' is missing — the flames and the exhaust haze anchor there`);
  for (const f of SHIP.fans) if (!root.getObjectByName(f)) note(`${file}: no '${f}' object; the turbine face will not spin`, true);
  // the nose has to be toward -z: the nozzles sit behind the centre of mass
  // on an aft sled and ahead of it on a nose sled, so that is not a test —
  // but a canopy, if named, is always forward of centre
  const canopy = root.getObjectByName('canopy');
  if (canopy) { const c = new THREE.Vector3(); new THREE.Box3().setFromObject(canopy).getCenter(c);
    if (c.z > 0) problems.push(`${file}: 'canopy' is behind the origin (z ${c.z.toFixed(1)}) — the ship is facing backwards; nose is Blender +Y`); }
  return { problems, box, size, tris };
}

/** Merge a landmark scene into ONE vertex-coloured geometry the tile bake can take. */
function bakeLandmark(root, file) {
  root.updateMatrixWorld(true);
  const parts = [];
  const white = new THREE.Color(1, 1, 1);
  root.traverse(o => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    if (!g.attributes.color) {
      // no vertex colour authored: the material colour becomes one, so the
      // bake (which is vertex-colour only) still shows what Blender showed
      const c = (o.material && o.material.color) || white;
      const n = g.attributes.position.count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    } else if (g.attributes.color.itemSize === 4) {
      // Blender exports RGBA colour attributes; the bake wants RGB
      const a = g.attributes.color, n = a.count, col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { col[i * 3] = a.getX(i); col[i * 3 + 1] = a.getY(i); col[i * 3 + 2] = a.getZ(i); }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    parts.push(g);
  });
  if (!parts.length) return null;
  // mergeGeometries lives in the utils addon; imported lazily so a build with
  // no landmarks never pays for it
  return import('three/addons/utils/BufferGeometryUtils.js').then(({ mergeGeometries }) => {
    const geo = mergeGeometries(parts, false);
    for (const g of parts) g.dispose();
    geo.computeBoundingSphere();
    const size = new THREE.Vector3(); geo.computeBoundingBox(); geo.boundingBox.getSize(size);
    const tris = geo.attributes.position.count / 3;
    const longest = Math.max(size.x, size.y, size.z);
    if (longest < LANDMARK.size[0] || longest > LANDMARK.size[1])
      note(`${file}: landmark is ${longest.toFixed(1)} m across; expected ${LANDMARK.size.join('-')}`, true);
    if (tris > LANDMARK.tris) note(`${file}: ${tris} triangles, landmark budget is ${LANDMARK.tris}`, true);
    // the sled collides with a landmark as a boulder of this footprint
    const radius = Math.max(size.x, size.z) * 0.42;
    return { name: file.replace(/\.glb$/, ''), geo, radius, size };
  });
}

/**
 * Load everything the manifest lists. Resolves when all attempts are done;
 * never rejects — a missing manifest just means "the kit, then".
 * @param {string} base  directory of manifest.json, relative to index.html
 */
export async function preloadModels(base = 'models/') {
  let manifest = null;
  try {
    const r = await fetch(base + 'manifest.json', { cache: 'no-cache' });
    if (r.ok) manifest = await r.json();
  } catch (e) { /* no manifest: nothing to load */ }
  if (!manifest) { note('no models/manifest.json — every ship is the procedural kit'); models.ready = true; return models; }
  const loader = makeLoader();
  const load = url => new Promise((res, rej) => loader.load(url, res, undefined, rej));

  const jobs = [];
  for (const [id, file] of Object.entries(manifest.ships || {})) {
    jobs.push(load(base + file).then(gltf => {
      const v = validateShip(gltf.scene, file);
      if (v.problems.length) { for (const p of v.problems) note(p, true); note(`${file}: NOT registered; '${id}' stays on the kit`, true); return; }
      models.ships[id] = { scene: gltf.scene, box: v.box, tris: v.tris, file };
      note(`ship '${id}' ← ${file}: ${v.tris} tris, ${v.size.x.toFixed(1)} x ${v.size.y.toFixed(1)} x ${v.size.z.toFixed(1)} m`);
    }).catch(e => note(`${file}: failed to load (${e.message || e})`, true)));
  }
  for (const file of manifest.landmarks || []) {
    jobs.push(load(base + file).then(gltf => bakeLandmark(gltf.scene, file)).then(l => {
      if (l) { models.landmarks.push(l); note(`landmark ${l.name}: ${l.size.x.toFixed(0)} x ${l.size.y.toFixed(0)} x ${l.size.z.toFixed(0)} m`); }
    }).catch(e => note(`${file}: failed to load (${e.message || e})`, true)));
  }
  if (manifest.numerals) {
    jobs.push(new Promise(res => new THREE.TextureLoader().load(manifest.numerals, t => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; models.numerals = t;
      note(`numerals ← ${manifest.numerals}`); res();
    }, undefined, () => { note(`${manifest.numerals}: failed to load; numerals stay canvas-drawn`, true); res(); })));
  }
  await Promise.all(jobs);
  models.ready = true;
  return models;
}

/** One digit of the numeral sheet as its own texture (3x3 grid, 1-9, row-major). */
export function numeralTexture(num) {
  if (!models.numerals) return null;
  const t = models.numerals.clone();
  const i = Math.max(1, Math.min(9, num)) - 1;
  t.repeat.set(1 / 3, 1 / 3);
  t.offset.set((i % 3) / 3, 1 - (Math.floor(i / 3) + 1) / 3);
  t.needsUpdate = true;
  return t;
}
