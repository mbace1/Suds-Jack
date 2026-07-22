// Voxel Lab — standalone authoring workbench for the game's voxel models.
// Runs the REAL VoxelSprite / DebrisPool / parseModel code (no forks), so what
// you see here — palette, HDR glow, detail tier, chip holes, death burst — is
// exactly what the game renders. Export copies a MODELS-ready JSON blob.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { MODELS, VoxelSprite, DebrisPool, setVoxelDetail } from './voxel.js?v=31';

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 100);

const grid = new THREE.GridHelper(20, 20, 0x333333, 0x1a1a1a);
scene.add(grid);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.45, 0.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const debris = new DebrisPool(scene, 1600);

// ------------------------------------------------------------- lab state
let modelKey = 'skull';
let detail = 2;
let sprite = null;
let spin = true;
let yaw = 0.6, pitch = 0.35, dist = 4;
let target = new THREE.Vector3();
// pal: key -> {hex: '#rrggbb', glow: number}; glow > 1 rebuilds the HDR array
let pal = {};
let layers = [];

function paletteEntryToUi(val) {
  if (Array.isArray(val)) {
    const glow = Math.max(...val, 1);
    const c = new THREE.Color(val[0] / glow, val[1] / glow, val[2] / glow);
    return { hex: '#' + c.getHexString(), glow: Math.round(glow * 100) / 100 };
  }
  return { hex: '#' + new THREE.Color(val).getHexString(), glow: 1 };
}

function uiToPaletteEntry(u) {
  const c = new THREE.Color(u.hex);
  return u.glow > 1.01 ? [c.r * u.glow, c.g * u.glow, c.b * u.glow] : c.getHex();
}

function builtPalette() {
  return Object.fromEntries(Object.entries(pal).map(([k, u]) => [k, uiToPaletteEntry(u)]));
}

function currentDef() {
  const base = MODELS[modelKey];
  return { ...base, palette: builtPalette(), layers };
}

function fitCamera() {
  let lo = Infinity, hi = -Infinity, r = 0;
  for (const v of sprite.voxels) {
    lo = Math.min(lo, v.y); hi = Math.max(hi, v.y);
    r = Math.max(r, Math.hypot(v.x, v.z));
  }
  target.set(0, (lo + hi) / 2, 0);
  dist = Math.max(2.2, (hi - lo + r * 2) * 1.5);
}

function rebuild(refit = true) {
  if (sprite) { scene.remove(sprite.mesh); sprite.dispose(); }
  setVoxelDetail(detail);
  sprite = new VoxelSprite(currentDef());
  scene.add(sprite.mesh);
  if (refit) fitCamera();
  stats();
}

function loadModel(key) {
  modelKey = key;
  const def = MODELS[key];
  layers = def.layers.map(l => l.slice());
  pal = Object.fromEntries(Object.entries(def.palette).map(([k, v]) => [k, paletteEntryToUi(v)]));
  document.getElementById('layers').value = JSON.stringify(layers, null, 1);
  renderPaletteUi();
  rebuild();
}

function stats() {
  document.getElementById('stats').innerHTML =
    `${modelKey} &middot; detail &times;${detail ** 3} &middot; ` +
    `<b>${sprite.aliveCount}</b>/${sprite.voxels.length} voxels alive &middot; ` +
    `voxelSize ${MODELS[modelKey].voxelSize}`;
}

// ------------------------------------------------------------------- UI
const elModel = document.getElementById('model');
for (const k of Object.keys(MODELS)) {
  const o = document.createElement('option');
  o.value = o.textContent = k;
  elModel.appendChild(o);
}
elModel.addEventListener('change', () => loadModel(elModel.value));

const elDetail = document.getElementById('detail');
[1, 2, 3, 4].forEach(n => {
  const b = document.createElement('button');
  b.textContent = `×${n ** 3}`;
  b.dataset.n = n;
  b.addEventListener('click', () => {
    detail = n;
    [...elDetail.children].forEach(x => x.classList.toggle('on', +x.dataset.n === n));
    rebuild(false);
  });
  if (n === detail) b.classList.add('on');
  elDetail.appendChild(b);
});

function renderPaletteUi() {
  const box = document.getElementById('palette');
  box.innerHTML = '';
  for (const [k, u] of Object.entries(pal)) {
    const row = document.createElement('div');
    row.className = 'pal-row';
    row.innerHTML = `<b>${k}</b><input type="color" value="${u.hex}">
      <input class="glow" type="text" value="${u.glow}"><span>glow</span>`;
    const [color, glow] = row.querySelectorAll('input');
    const apply = () => {
      u.hex = color.value;
      u.glow = Math.max(0.05, parseFloat(glow.value) || 1);
      sprite.retint(builtPalette()); // live — no rebuild needed
    };
    color.addEventListener('input', apply);
    glow.addEventListener('change', apply);
    box.appendChild(row);
  }
}

document.getElementById('chip').addEventListener('click', () => {
  const alive = sprite.voxels.filter(v => v.alive);
  if (!alive.length) return;
  const v = alive[(Math.random() * alive.length) | 0];
  sprite.mesh.updateWorldMatrix(true, false);
  const p = new THREE.Vector3(v.x, v.y, v.z).applyMatrix4(sprite.mesh.matrixWorld);
  const out = sprite.chip(p, Math.max(3, Math.round(sprite.voxels.length / 25)));
  for (const c of out) {
    debris.spawn(c.pos, c.color,
      new THREE.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4),
      sprite.size * 0.9, 1.2);
  }
  stats();
});

document.getElementById('burst').addEventListener('click', () => {
  debris.burst(sprite.worldVoxels(), sprite.size, new THREE.Vector3(0, 2, 0), 1.2);
  sprite.mesh.visible = false;
  setTimeout(() => rebuild(false), 900); // respawn fresh, DD-style
});

document.getElementById('flash').addEventListener('click', () => sprite.flash(2.2));

const toggles = { spin: () => (spin = !spin), bloom: () => (bloom.enabled = !bloom.enabled) };
for (const [id, fn] of Object.entries(toggles)) {
  const b = document.getElementById(id);
  b.addEventListener('click', () => { fn(); b.classList.toggle('on'); });
}

document.getElementById('apply').addEventListener('click', () => {
  try {
    const parsed = JSON.parse(document.getElementById('layers').value);
    if (!Array.isArray(parsed) || !parsed.every(l => Array.isArray(l) && l.every(r => typeof r === 'string'))) {
      throw new Error('layers must be string[][]');
    }
    layers = parsed;
    // letters with no palette entry would silently vanish — auto-add them white
    for (const ch of new Set(parsed.flat().join(''))) {
      if (ch !== '.' && !(ch in pal)) pal[ch] = { hex: '#ffffff', glow: 1 };
    }
    renderPaletteUi();
    rebuild();
  } catch (e) {
    document.getElementById('stats').textContent = 'layers parse error: ' + e.message;
  }
});
document.getElementById('revert').addEventListener('click', () => loadModel(modelKey));

document.getElementById('export').addEventListener('click', async e => {
  const def = MODELS[modelKey];
  const out = JSON.stringify({
    voxelSize: def.voxelSize,
    ...(def.anchor ? { anchor: def.anchor } : {}),
    ...(def.detailBoost ? { detailBoost: def.detailBoost } : {}),
    palette: builtPalette(),
    layers,
  }, null, 2);
  try {
    await navigator.clipboard.writeText(out);
    e.target.textContent = 'COPIED';
  } catch {
    document.getElementById('layers').value = out; // clipboard blocked — show it
    e.target.textContent = 'IN TEXTAREA';
  }
  setTimeout(() => { e.target.textContent = 'COPY MODEL JSON'; }, 1200);
});

// ---------------------------------------------------------------- orbit
let dragging = false, lx = 0, ly = 0;
canvas.addEventListener('pointerdown', e => { dragging = true; lx = e.clientX; ly = e.clientY; });
addEventListener('pointerup', () => { dragging = false; });
addEventListener('pointermove', e => {
  if (!dragging) return;
  yaw -= (e.clientX - lx) * 0.006;
  pitch = Math.max(-1.2, Math.min(1.4, pitch + (e.clientY - ly) * 0.006));
  lx = e.clientX; ly = e.clientY;
});
canvas.addEventListener('wheel', e => {
  dist = Math.max(1, Math.min(40, dist * (e.deltaY > 0 ? 1.12 : 0.9)));
}, { passive: true });

// ----------------------------------------------------------------- loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (spin && sprite) sprite.mesh.rotation.y += dt * 0.5;
  if (sprite) sprite.update(dt);
  debris.update(dt);
  camera.position.set(
    target.x + Math.sin(yaw) * Math.cos(pitch) * dist,
    target.y + Math.sin(pitch) * dist,
    target.z + Math.cos(yaw) * Math.cos(pitch) * dist,
  );
  camera.lookAt(target);
  composer.render();
}

loadModel(modelKey);
animate();

// console + smoke-test handle
window.__lab = {
  get sprite() { return sprite; },
  debris,
  setModel: k => { elModel.value = k; loadModel(k); },
  setDetail: n => { detail = Math.max(1, Math.min(4, n)); rebuild(false); },
  getState: () => ({ modelKey, detail, alive: sprite.aliveCount, total: sprite.voxels.length }),
};
