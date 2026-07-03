import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { InputManager } from './input.js?v=8';
import { Player } from './player.js?v=8';
import { Enemy, COST } from './enemy.js?v=8';
import { ProjectilePool } from './projectile.js?v=8';
import { C, glow, FILL_MAT } from './shared.js?v=8';
import { audio } from './audio.js?v=8';
import { t, getLang, setLang, langs } from './lang.js?v=8';
import { visualTest, depthTest, setVisualTest, setDepthTest } from './modes.js?v=8';
import { shards, UPGRADES, levelOf, canBuy, buy, addShards, resolvedStats } from './progress.js?v=8';
import { seenWelcome, seenDash, seenDoubleJump, seenHazard, seenObjective,
  markWelcome, markDash, markDoubleJump, markHazard, markObjective } from './onboarding.js?v=8';

const css = h => '#' + (h >>> 0).toString(16).padStart(6, '0').slice(-6);
let runTime = 0;   // declared early: heightAt()/updatePlatforms() close over this for moving platforms, and buildTerrain() runs at module load

// ── Renderer + night scene with neon bloom ────────────────────────────────────
const gameCanvas = document.getElementById('canvas-game');
const input = new InputManager(gameCanvas);   // built early: input.isTouch gates the quality tier below
const LOW_TIER = input.isTouch || devicePixelRatio < 1.5;   // touch / low-DPR devices get a lighter render path
const renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, antialias: !LOW_TIER });
renderer.setPixelRatio(Math.min(devicePixelRatio, LOW_TIER ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.background = new THREE.Color(C.bg);
scene.fog = new THREE.Fog(C.bg, 42, 165);
const camera = new THREE.PerspectiveCamera(66, innerWidth / innerHeight, 0.1, 400);

// ── Orientation (portrait / landscape camera framing) — toko-drop-style toggle ──
const ORIENT = { landscape: { fov: 66, dist: 5.6 }, portrait: { fov: 78, dist: 6.6 } };
let orientUserSet = localStorage.getItem('skltrOrientSet') === '1';
let orientLandscape = orientUserSet ? localStorage.getItem('skltrLandscape') === '1' : innerWidth >= innerHeight;
let camFovBase = ORIENT.landscape.fov, camDist = ORIENT.landscape.dist;
function applyOrient(land) { const o = land ? ORIENT.landscape : ORIENT.portrait; camFovBase = o.fov; camDist = o.dist; }
applyOrient(orientLandscape);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomRes = LOW_TIER ? new THREE.Vector2(innerWidth / 2, innerHeight / 2) : new THREE.Vector2(innerWidth, innerHeight);
const bloom = new UnrealBloomPass(bloomRes, visualTest ? 0.62 : 0.35, 0.5, 0.0);
composer.addPass(bloom);
// Visual Test's "Neon Arcade" pass: RGB channel split + scrolling scanlines. Off by
// default (enabled toggled with the mode), lets Visual Test read as a genuinely
// different render pipeline rather than just recolored edges.
const NEON_SHADER = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      float shift = 0.0035;
      float r = texture2D(tDiffuse, uv + vec2(shift, 0.0)).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - vec2(shift, 0.0)).b;
      vec3 col = vec3(r, g, b);
      col -= max(0.0, sin(uv.y * 340.0 + time * 2.0)) * 0.06;
      gl_FragColor = vec4(col, 1.0);
    }`,
};
const neonPass = new ShaderPass(NEON_SHADER);
neonPass.enabled = visualTest;
composer.addPass(neonPass);
composer.addPass(new OutputPass());
FILL_MAT.color.setHex(visualTest ? 0x170022 : 0x000000);   // Visual Test: dark violet fill instead of pure black

// ── Terrain (elevation above 0 + canyons below 0) ──────────────────────────────
// Flat surfaces (platforms/steps) + linear ramps rise above the y=0 plane; pit
// floors/ramps/walls carve canyons below it; islands float at any height over a
// void; roofs are floating overhang slabs (visual only). heightAt() is
// authoritative for physics. All are per-mode now (see NORMAL/DEPTH, buildTerrain).
// Normal scale: a long west trench (walk-through, ramps at both ends) + a dead-end
// south-east pocket (one ramp in).
const NORMAL = {
  arenaR: 78,
  flats: [
    { x0: 9,   x1: 24,  z0: -25, z1: -9,  top: 3.0 },   // raised NE platform
    { x0: -25, x1: -11, z0: 9,   z1: 22,  top: 1.6 },   // low SW platform
    { x0: -6,  x1: 6,   z0: 21,  z1: 31,  top: 2.2 },   // north platform
    { x0: -9,  x1: -4,  z0: -11, z1: -6,  top: 0.7 },   // step
    { x0: 5,   x1: 10,  z0: 6,   z1: 11,  top: 0.9 },   // step
  ],
  ramps: [
    { x0: 13,  x1: 20,  z0: -9, z1: -1, hA: 3.0, hB: 0 },    // up to NE platform
    { x0: -22, x1: -14, z0: 6,  z1: 9,  hA: 0,   hB: 1.6 },  // up to SW platform
    { x0: -3,  x1: 3,   z0: 15, z1: 21, hA: 0,   hB: 2.2 },  // up to north platform
  ],
  islands: [],
  voidFloor: 0,
  pitFloors: [
    { x0: -70, x1: -50, z0: -40, z1: 10, floor: -8 },
    { x0: 34,  x1: 58,  z0: 34,  z1: 58, floor: -5.5 },
  ],
  pitRamps: [
    { x0: -70, x1: -50, z0: -50, z1: -40, hA: 0,   hB: -8 },
    { x0: -70, x1: -50, z0: 10,  z1: 20,  hA: -8,  hB: 0 },
    { x0: 34,  x1: 58,  z0: 24,  z1: 34,  hA: 0,   hB: -5.5 },
  ],
  pitWalls: [
    { x: -70, z0: -40, z1: 10, floor: -8,   axis: 'x' },
    { x: -50, z0: -40, z1: 10, floor: -8,   axis: 'x' },
    { x: 34,  z0: 34,  z1: 58, floor: -5.5, axis: 'x' },
    { x: 58,  z0: 34,  z1: 58, floor: -5.5, axis: 'x' },
    { z: 58,  x0: 34,  x1: 58, floor: -5.5, axis: 'z' },
  ],
  roofs: [],
  hazards: [
    { x: -60, z: -15, r: 5, dps: 16 },       // electrified pool on the west canyon floor
  ],
  movingPlatforms: [
    { x0: -52, x1: -48, z0: -8, z1: -2, top: -4, axis: 'z', amp: 5, speed: 0.4, phase: 0 },   // sliding stepping-stone
  ],
  objSpots: [
    { x: 16, z: -17 }, { x: -18, z: 15 }, { x: 0, z: 26 },
    { x: -60, z: -14 }, { x: 46, z: 46 },
    { x: 32, z: 18 }, { x: -32, z: -18 }, { x: 28, z: -32 }, { x: -28, z: 32 }, { x: 0, z: -38 }, { x: 36, z: -4 },
    { x: 62, z: 0 }, { x: -62, z: 55 }, { x: 55, z: -62 }, { x: -14, z: -62 },
  ],
};
// Depth Test: "THE ABYSS" — a radically different landscape from NORMAL's canyon-in-
// flat-ground. There is no continuous ground at all: a small spawn plateau, four long
// walkable ramp-arms climbing/descending out to floating islands, and nothing else —
// step off any of it and you fall into a bottomless void (fall death, see loop()).
// Ramps stay walkable (no jump needed) because the slope is gradual over a long run;
// jump height in this game is tiny (~2 units), so big elevation changes are always
// bridged by a long ramp, never a ledge.
function depthArm(axis, dir, run, rise, halfW, islandDepth, islandHalfW) {
  const near = 16, far = near + run;
  const ramp = axis === 'z'
    ? { x0: -halfW, x1: halfW, z0: dir < 0 ? -far : near, z1: dir < 0 ? -near : far, hA: dir < 0 ? rise : 0, hB: dir < 0 ? 0 : rise, axis: 'z' }
    : { x0: dir < 0 ? -far : near, x1: dir < 0 ? -near : far, z0: -halfW, z1: halfW, hA: dir < 0 ? rise : 0, hB: dir < 0 ? 0 : rise, axis: 'x' };
  const islandCenter = dir < 0 ? -(far + islandDepth / 2) : (far + islandDepth / 2);
  const island = axis === 'z'
    ? { x0: -islandHalfW, x1: islandHalfW, z0: islandCenter - islandDepth / 2, z1: islandCenter + islandDepth / 2, top: rise }
    : { x0: islandCenter - islandDepth / 2, x1: islandCenter + islandDepth / 2, z0: -islandHalfW, z1: islandHalfW, top: rise };
  return { ramp, island };
}
const ARM_N = depthArm('z', +1, 48, 20, 9, 20, 13);    // north — climbs up to a high vista island
const ARM_S = depthArm('z', -1, 48, -16, 9, 20, 13);   // south — descends to a sunken island
const ARM_E = depthArm('x', +1, 44, 16, 9, 20, 13);    // east — climbs up
const ARM_W = depthArm('x', -1, 44, -14, 9, 20, 13);   // west — descends
const DEPTH = {
  arenaR: 112,
  flats: [], ramps: [ARM_N.ramp, ARM_E.ramp],       // rising arms use the elevated (Math.max) composition
  pitFloors: [],
  pitRamps: [ARM_S.ramp, ARM_W.ramp],               // descending arms use the pit (Math.min) composition
  pitWalls: [],
  roofs: [],
  islands: [
    { x0: -16, x1: 16, z0: -16, z1: 16, top: 0 },   // spawn plateau
    ARM_N.island, ARM_S.island, ARM_E.island, ARM_W.island,
    { x0: 55, x1: 75, z0: 40, z1: 60, top: 20 },     // satellite off the east/north high islands (same height, jump/dash gap)
  ],
  voidFloor: -500,   // heightAt() default off any island — falling here is fatal, see loop()'s void check
  hazards: [
    { x: 0, z: -74, r: 6, dps: 20 },                 // electrified pool on the sunken south island
  ],
  movingPlatforms: [
    { x0: 60, x1: 70, z0: 16, z1: 40, top: 18, axis: 'z', amp: 12, speed: 0.3, phase: 0 },   // bridges the east island to its satellite
  ],
  objSpots: [
    { x: 0, z: 74 }, { x: 0, z: -74 }, { x: 70, z: 0 }, { x: -70, z: 0 }, { x: 65, z: 50 },
  ],
};

let ARENA_R = NORMAL.arenaR, flats = [], ramps = [], pitFloors = [], pitRamps = [], pitWalls = [], roofs = [], hazards = [], movingPlatforms = [], islands = [], voidFloor = 0, OBJ_SPOTS = [];
// A ramp's height varies along z by default (the original, still-used convention);
// axis:'x' varies it along x instead — needed for Depth Test's 4-directional arms.
function rampHeight(r, x, z) {
  if (r.axis === 'x') { const t = Math.min(1, Math.max(0, (x - r.x0) / (r.x1 - r.x0))); return r.hA + (r.hB - r.hA) * t; }
  const t = Math.min(1, Math.max(0, (z - r.z0) / (r.z1 - r.z0))); return r.hA + (r.hB - r.hA) * t;
}
function heightAt(x, z) {
  let h = 0;
  for (const r of ramps) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) h = Math.max(h, rampHeight(r, x, z));
  for (const f of flats) if (x >= f.x0 && x <= f.x1 && z >= f.z0 && z <= f.z1) h = Math.max(h, f.top);
  let base;
  if (h > 0) base = h;                                    // elevated ground always wins (e.g. a bridge)
  else {
    // pit/island composition tracks whether anything matched at all, rather than
    // seeding the accumulator with voidFloor — Math.min/Math.max against a very
    // negative void value would otherwise swallow every real (less extreme) height.
    let matchedPit = false, d = 0;
    for (const pr of pitRamps) if (x >= pr.x0 && x <= pr.x1 && z >= pr.z0 && z <= pr.z1) {
      const v = rampHeight(pr, x, z); d = matchedPit ? Math.min(d, v) : v; matchedPit = true;
    }
    for (const p of pitFloors) if (x >= p.x0 && x <= p.x1 && z >= p.z0 && z <= p.z1) {
      d = matchedPit ? Math.min(d, p.floor) : p.floor; matchedPit = true;
    }
    let matchedIsl = false, isl2 = 0;
    for (const isl of islands) if (x >= isl.x0 && x <= isl.x1 && z >= isl.z0 && z <= isl.z1) {
      isl2 = matchedIsl ? Math.max(isl2, isl.top) : isl.top; matchedIsl = true;
    }
    base = matchedIsl ? isl2 : (matchedPit ? d : voidFloor);   // voidFloor: 0 in NORMAL, a bottomless drop in Depth Test
  }
  // moving platforms slide back and forth over time (runTime closure) — every heightAt
  // call site automatically picks up the current position with no signature change.
  // Compared last via Math.max so a platform sitting inside a canyon (top negative but
  // higher than the local pit floor) still wins over the plain floor beneath it.
  for (const mp of movingPlatforms) {
    const off = Math.sin(runTime * mp.speed + (mp.phase || 0)) * mp.amp;
    const x0 = mp.x0 + (mp.axis === 'x' ? off : 0), x1 = mp.x1 + (mp.axis === 'x' ? off : 0);
    const z0 = mp.z0 + (mp.axis === 'z' ? off : 0), z1 = mp.z1 + (mp.axis === 'z' ? off : 0);
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) base = Math.max(base, mp.top);
  }
  return base;
}

let terrainMeshes = [], groundMesh = null, grid = null, ring = null, platformMeshes = [];
function disposeMesh(o) { o.traverse?.(c => c.geometry?.dispose()); scene.remove(o); }
function renderRamp(r) {
  const rise = r.hB - r.hA;
  let g;
  if (r.axis === 'x') {
    const lenX = r.x1 - r.x0, d = r.z1 - r.z0;
    g = glow(new THREE.BoxGeometry(Math.hypot(lenX, rise), 0.12, d));
    g.rotation.z = Math.atan2(rise, lenX);
  } else {
    const w = r.x1 - r.x0, lenZ = r.z1 - r.z0;
    g = glow(new THREE.BoxGeometry(w, 0.12, Math.hypot(lenZ, rise)));
    g.rotation.x = -Math.atan2(rise, lenZ);
  }
  g.position.set((r.x0 + r.x1) / 2, (r.hA + r.hB) / 2, (r.z0 + r.z1) / 2);
  scene.add(g); terrainMeshes.push(g);
}
// (re)builds the ground/grid/ring + all terrain geometry for the current mode —
// called once at boot and again whenever Depth Test is toggled on the title screen.
function buildTerrain() {
  for (const o of terrainMeshes) disposeMesh(o);
  terrainMeshes = [];
  for (const pm of platformMeshes) disposeMesh(pm.mesh);
  platformMeshes = [];
  if (groundMesh) { disposeMesh(groundMesh); groundMesh.material.dispose(); groundMesh = null; }
  if (grid) { disposeMesh(grid); grid = null; }
  if (ring) { disposeMesh(ring); ring.material.dispose(); ring = null; }

  const D = depthTest ? DEPTH : NORMAL;
  ARENA_R = D.arenaR; flats = D.flats; ramps = D.ramps; pitFloors = D.pitFloors; pitRamps = D.pitRamps; pitWalls = D.pitWalls; roofs = D.roofs;
  hazards = D.hazards ?? []; movingPlatforms = D.movingPlatforms ?? []; islands = D.islands ?? []; voidFloor = D.voidFloor ?? 0; OBJ_SPOTS = D.objSpots;
  scene.fog.far = ARENA_R * 2.1;

  // NORMAL: a black ground plane (with canyon holes cut in) + faint grid — continuous
  // ground everywhere except the carved pits. Depth Test has NO ground plane at all —
  // it's a void by design (see islands/voidFloor above) — only the boundary ring stays.
  if (!depthTest) {
    const GS = ARENA_R * 1.2;
    const groundShape = new THREE.Shape();
    groundShape.moveTo(-GS, -GS); groundShape.lineTo(GS, -GS); groundShape.lineTo(GS, GS); groundShape.lineTo(-GS, GS); groundShape.closePath();
    const cutHole = (x0, x1, z0, z1) => {
      const h = new THREE.Path();
      h.moveTo(x0, -z0); h.lineTo(x1, -z0); h.lineTo(x1, -z1); h.lineTo(x0, -z1); h.closePath();
      groundShape.holes.push(h);
    };
    for (const p of pitFloors) cutHole(p.x0, p.x1, p.z0, p.z1);
    for (const pr of pitRamps) cutHole(pr.x0, pr.x1, pr.z0, pr.z1);
    groundMesh = new THREE.Mesh(new THREE.ShapeGeometry(groundShape), new THREE.MeshBasicMaterial({ color: 0x050505 }));
    groundMesh.rotateX(-Math.PI / 2); scene.add(groundMesh);
    const gridDiv = Math.round(ARENA_R * 40 / 47);
    grid = new THREE.GridHelper(ARENA_R * 2, gridDiv, C.dim, C.dim);
    grid.material.transparent = true; grid.material.opacity = 0.45; scene.add(grid);
  }
  ring = new THREE.Mesh(new THREE.TorusGeometry(ARENA_R, 0.12, 6, 96),
    new THREE.MeshBasicMaterial({ color: 0x888888 })); ring.rotation.x = -Math.PI / 2; scene.add(ring);

  for (const isl of islands) {                                // floating island — a thin slab, not connected to any ground
    const g = glow(new THREE.BoxGeometry(isl.x1 - isl.x0, 0.6, isl.z1 - isl.z0));
    g.position.set((isl.x0 + isl.x1) / 2, isl.top, (isl.z0 + isl.z1) / 2); scene.add(g); terrainMeshes.push(g);
  }
  for (const f of flats) {
    const g = glow(new THREE.BoxGeometry(f.x1 - f.x0, f.top, f.z1 - f.z0));
    g.position.set((f.x0 + f.x1) / 2, f.top / 2, (f.z0 + f.z1) / 2); scene.add(g); terrainMeshes.push(g);
  }
  for (const r of ramps) renderRamp(r);
  for (const p of pitFloors) {
    const g = glow(new THREE.BoxGeometry(p.x1 - p.x0, 0.15, p.z1 - p.z0));
    g.position.set((p.x0 + p.x1) / 2, p.floor, (p.z0 + p.z1) / 2); scene.add(g); terrainMeshes.push(g);
  }
  for (const pr of pitRamps) renderRamp(pr);
  for (const w of pitWalls) {
    const top = w.top ?? 0, h = top - w.floor;
    let g;
    if (w.axis === 'x') { g = glow(new THREE.BoxGeometry(0.3, h, w.z1 - w.z0)); g.position.set(w.x, (top + w.floor) / 2, (w.z0 + w.z1) / 2); }
    else { g = glow(new THREE.BoxGeometry(w.x1 - w.x0, h, 0.3)); g.position.set((w.x0 + w.x1) / 2, (top + w.floor) / 2, w.z); }
    scene.add(g); terrainMeshes.push(g);
  }
  for (const rf of roofs) {                                 // floating overhang slab — visual only, no heightAt effect
    const g = glow(new THREE.BoxGeometry(rf.x1 - rf.x0, rf.top - rf.bottom, rf.z1 - rf.z0));
    g.position.set((rf.x0 + rf.x1) / 2, (rf.top + rf.bottom) / 2, (rf.z0 + rf.z1) / 2); scene.add(g); terrainMeshes.push(g);
  }
  for (const hz of hazards) {                               // DoT zone — a warning ring on the floor beneath it
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(hz.r, 0.08, 6, 32), new THREE.MeshBasicMaterial({ color: C.hazard }));
    ring2.rotation.x = -Math.PI / 2; ring2.position.set(hz.x, heightAt(hz.x, hz.z) + 0.05, hz.z);
    scene.add(ring2); terrainMeshes.push(ring2);
  }
  for (const mp of movingPlatforms) {
    const mesh = glow(new THREE.BoxGeometry(mp.x1 - mp.x0, 0.3, mp.z1 - mp.z0));
    scene.add(mesh); platformMeshes.push({ mesh, mp });
  }
  updatePlatforms();
}
// repositions each moving-platform mesh from the same sine formula heightAt() uses,
// so the visible slab always matches where heightAt() says its top surface is.
function updatePlatforms() {
  for (const pm of platformMeshes) {
    const mp = pm.mp, off = Math.sin(runTime * mp.speed + (mp.phase || 0)) * mp.amp;
    const cx = (mp.x0 + mp.x1) / 2 + (mp.axis === 'x' ? off : 0);
    const cz = (mp.z0 + mp.z1) / 2 + (mp.axis === 'z' ? off : 0);
    pm.mesh.position.set(cx, mp.top, cz);
  }
}
buildTerrain();

// ── A→B objective challenge (beacon at each waypoint; reach A then B) ──────────
const BEACON_COL = 0x35f0d8;
const beacon = new THREE.Group();
const beaconCol = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 22, 12, 1, true),
  new THREE.MeshBasicMaterial({ color: BEACON_COL, transparent: true, opacity: 0.22, side: THREE.DoubleSide }));
beaconCol.position.y = 11; beacon.add(beaconCol);
const beaconRing = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.16, 8, 40), new THREE.MeshBasicMaterial({ color: BEACON_COL }));
beaconRing.rotation.x = -Math.PI / 2; beaconRing.position.y = 0.12; beacon.add(beaconRing);
scene.add(beacon); beacon.visible = false;
const obj = { pts: [], idx: 0, r: 3.4 };
function placeBeacon() { const w = obj.pts[obj.idx]; beacon.position.set(w.x, heightAt(w.x, w.z), w.z); beacon.visible = true; }
function newChallenge() {
  const pool2 = OBJ_SPOTS.slice();
  const A = pool2.splice((Math.random() * pool2.length) | 0, 1)[0];
  let B; do { B = pool2[(Math.random() * pool2.length) | 0]; } while (Math.hypot(B.x - A.x, B.z - A.z) < 28);
  obj.pts = [A, B]; obj.idx = 0; placeBeacon();
  toast('CHALLENGE — REACH A', BEACON_COL);
  if (!seenObjective) { markObjective(); toast('Reach the glowing beacon for a heal', BEACON_COL); }
}
function objectiveUpdate(dt) {
  beacon.rotation.y += dt * 0.8;
  beaconRing.scale.setScalar(1 + Math.sin(performance.now() / 300) * 0.05);
  const w = obj.pts[obj.idx];
  if (Math.hypot(player.x - w.x, player.z - w.z) < obj.r) {
    if (obj.idx === 0) { obj.idx = 1; placeBeacon(); toast('REACH B', BEACON_COL); audio.objective(0); }
    else {
      challenges++; player.heal(30);
      burst(w.x, heightAt(w.x, w.z) + 1, w.z, BEACON_COL, 18);
      toast('CHALLENGE COMPLETE  +heal', C.hp); audio.objective(1);
      newChallenge();
    }
  }
}

// ── Environmental hazards (DoT zones) ───────────────────────────────────────────
let hazardInsidePrev = false;
function hazardUpdate(dt) {
  let inside = false;
  for (const hz of hazards) {
    if (Math.hypot(player.x - hz.x, player.z - hz.z) > hz.r) continue;
    inside = true;
    const hpb = player.hp; player.hurt(hz.dps * dt);
    if (player.hp < hpb) shake = Math.max(shake, 0.3);
    if (!player.alive) { gameOver(); return; }
  }
  if (inside && !hazardInsidePrev) {
    audio.hurt();
    if (!seenHazard) { markHazard(); toast('Hazard zone — get out, it drains HP', C.hazard); }
  }
  hazardInsidePrev = inside;
}
// Depth Test's islands float over a real bottomless void — falling off one is fatal,
// same as any other way of dying. voidFloor is always 0 in NORMAL, so this never fires there.
function voidCheck() {
  if (depthTest && player.alive && player.y < -50) gameOver();
}

// ── Objects ───────────────────────────────────────────────────────────────────
const pool = new ProjectilePool(scene);
const player = new Player(scene, pool);
let enemies = [];

// ── Run state ─────────────────────────────────────────────────────────────────
let gameState = 'title';     // title | playing | paused | gameover
let kills = 0, shake = 0, fovKick = 0, challenges = 0, hitstopT = 0, killPunch = 0, dashTipTimer = 0;
const HITSTOP_KILL = 0.05, HITSTOP_BOSS_KILL = 0.09, HITSTOP_HURT = 0.07;
let credits = 0, spawnCD = 0, nextBoss = 65, bossAlive = false, bossKills = 0;
let toasts = [];
let best = parseFloat(localStorage.getItem('skltrBestTime') || '0');

const PHASES = [[25, 'CALM', 0x9be7b0], [60, 'RISING', 0x9bc7ff], [110, 'FRENZY', 0xffd36b],
                [170, 'OVERLOAD', 0xff9a3a], [1e9, 'NIGHTMARE', 0xff5a6b]];
function phase() { for (const p of PHASES) if (runTime < p[0]) return p; return PHASES[PHASES.length - 1]; }
function scaling() { return { hpMul: 1 + runTime * 0.011, dmgMul: 0.55 + runTime * 0.008 }; }

// ── HUD / overlay ─────────────────────────────────────────────────────────────
const uiCanvas = document.getElementById('canvas-ui');
const ctx = uiCanvas.getContext('2d');
const overlay = document.getElementById('overlay');
function showOverlay(h) { overlay.innerHTML = h; overlay.style.display = 'block'; }
function fmt(s) { const m = (s / 60) | 0, ss = (s % 60) | 0; return `${m}:${ss.toString().padStart(2, '0')}`; }
function toast(t, c) { toasts.push({ t, c, life: 2.6 }); }

// title screen has 3 states: main (default), 'settings', 'upgrades' — keeps the
// default screen down to logo/best/start, with everything else behind one tap.
let titlePanel = null;
function backChip(slot, label) {
  const b = document.createElement('div'); b.textContent = '‹ BACK';
  b.style.cssText = 'display:inline-block;pointer-events:auto;cursor:pointer;user-select:none;font-size:12px;font-weight:bold;padding:6px 14px;border-radius:7px;margin-bottom:18px;border:2px solid #3a4a6a;color:#8899bb;';
  chip(b, () => { titlePanel = null; showTitle(); });
  slot.appendChild(b);
  const h = document.createElement('div'); h.textContent = label;
  h.style.cssText = 'font-size:16px;font-weight:bold;letter-spacing:3px;opacity:.85;margin-bottom:18px'; slot.appendChild(h);
}
function showTitle() {
  overlay.style.pointerEvents = 'none';
  if (titlePanel === 'settings') return showSettingsPanel();
  if (titlePanel === 'upgrades') return showUpgradesPanel();
  overlay.innerHTML =
    `<div style="font-size:clamp(38px,12vw,64px);font-weight:bold;letter-spacing:10px;color:#9bfff0">SKLTR</div>` +
    `<div style="font-size:13px;opacity:.6;margin:8px 0 18px">${t('subtitle')}</div>` +
    (best > 0 ? `<div style="font-size:13px;color:${css(C.adr)};opacity:.85;margin-bottom:12px">${t('best')} ${fmt(best)}</div>` : ``) +
    `<div style="font-size:15px;opacity:.9">${t('tapStart')}</div>` +
    `<div style="font-size:11px;opacity:.45;margin-top:8px">${t('ctrlTouch')}</div>` +
    `<div id="menu-slot" style="margin-top:22px;display:flex;gap:10px;justify-content:center"></div>`;
  overlay.style.display = 'block';
  buildMainMenuButtons(document.getElementById('menu-slot'));
}
function buildMainMenuButtons(slot) {
  if (!slot) return;
  const mk = (label, cb) => {
    const b = document.createElement('div'); b.textContent = label;
    b.style.cssText = 'pointer-events:auto;cursor:pointer;user-select:none;font-size:12px;font-weight:bold;padding:9px 16px;border-radius:8px;background:rgba(0,0,0,.35);border:2px solid #3a4a6a;color:#8899bb;';
    chip(b, cb); return b;
  };
  slot.appendChild(mk('SETTINGS', () => { titlePanel = 'settings'; showTitle(); }));
  slot.appendChild(mk(`UPGRADES · ${shards}◆`, () => { titlePanel = 'upgrades'; showTitle(); }));
}
function showSettingsPanel() {
  overlay.innerHTML = `<div id="settings-body" style="text-align:left;display:inline-block;max-width:min(440px,84vw)"></div>`;
  overlay.style.display = 'block';
  const body = document.getElementById('settings-body');
  body.style.textAlign = 'center';
  backChip(body, 'SETTINGS');
  const orient = document.createElement('div'); orient.style.marginBottom = '18px'; body.appendChild(orient);
  buildOrientChip(orient);
  const lang = document.createElement('div'); lang.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-bottom:18px'; body.appendChild(lang);
  buildLangChips(lang);
  const modes = document.createElement('div'); modes.style.marginBottom = '18px'; body.appendChild(modes);
  buildModeChips(modes);
  const ctrl = document.createElement('div');
  ctrl.style.cssText = 'font-size:11px;opacity:.5;line-height:1.9;margin-top:8px';
  ctrl.innerHTML = `${t('ctrlD1')}<br>${t('ctrlD2')}<br><span style="opacity:.85">${t('ctrlTouch')}</span>`;
  body.appendChild(ctrl);
}
function showUpgradesPanel() {
  overlay.innerHTML = `<div id="upgrades-body"></div>`;
  overlay.style.display = 'block';
  const body = document.getElementById('upgrades-body');
  backChip(body, `UPGRADES · ${shards}◆`);
  buildUnlockPanel(body);
}
function showPause() { overlay.style.pointerEvents = 'none'; showOverlay(`<div style="font-size:42px;font-weight:bold">PAUSED</div><div style="font-size:13px;opacity:.5;margin-top:10px">ESC to resume</div>`); }
function showGameOver(earned = 0) {
  const rec = runTime >= best;
  overlay.style.pointerEvents = 'auto';
  overlay.innerHTML =
    `<div style="font-size:44px;font-weight:bold;letter-spacing:3px;color:#ff7aa0">${t('youDied')}</div>` +
    `<div style="font-size:18px;margin-top:10px;color:#9bfff0">${t('survived', fmt(runTime), kills)}</div>` +
    (rec ? `<div style="font-size:15px;color:${css(C.adr)};margin-top:6px">${t('newBest')}</div>` : `<div style="font-size:12px;opacity:.5;margin-top:6px">${t('best')} ${fmt(best)}</div>`) +
    `<div style="font-size:12px;opacity:.7;margin-top:6px">+${earned} shards</div>` +
    `<div id="fb-slot" style="margin-top:16px"></div>`;
  overlay.style.display = 'block';
  buildFeedbackPanel(document.getElementById('fb-slot'));
}

// A title-screen chip: pointerdown activates, touchend is swallowed so it doesn't start the game.
function chip(el, activate) {
  el.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); activate(); });
  el.addEventListener('touchend', e => e.stopPropagation());
}
function buildLangChips(slot) {
  if (!slot) return; const active = getLang();
  for (const { code, label } of langs()) {
    const on = code === active, c = document.createElement('div'); c.textContent = label;
    c.style.cssText = 'pointer-events:auto;cursor:pointer;user-select:none;font-size:13px;font-weight:bold;padding:7px 14px;border-radius:8px;background:rgba(0,0,0,.35);transition:all .12s;'
      + `border:2px solid ${on ? '#6688ff' : '#3a4a6a'};color:${on ? '#aaccff' : '#7788aa'};text-shadow:${on ? '0 0 12px #4466ff' : 'none'};`;
    chip(c, () => { if (code !== getLang()) { setLang(code); showTitle(); } });
    slot.appendChild(c);
  }
}
function buildOrientChip(slot) {
  if (!slot) return;
  const btn = document.createElement('div'), hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;opacity:.45;margin-top:6px';
  const render = () => {
    const land = orientLandscape;
    btn.textContent = `${t('orientation')}: ${land ? t('landscape') : t('portrait')}`;
    btn.style.cssText = 'display:inline-block;pointer-events:auto;cursor:pointer;user-select:none;font-size:14px;font-weight:bold;padding:8px 18px;border-radius:8px;background:rgba(0,0,0,.35);transition:all .12s;'
      + `border:2px solid ${land ? '#ffaa33' : '#3a4a6a'};color:${land ? '#ffcc66' : '#7788aa'};text-shadow:${land ? '0 0 12px #ffaa33' : 'none'};`;
    hint.textContent = land ? t('orientLandH') : t('orientPortH');
  };
  render();
  chip(btn, () => { orientLandscape = !orientLandscape; orientUserSet = true;
    localStorage.setItem('skltrLandscape', orientLandscape ? '1' : '0'); localStorage.setItem('skltrOrientSet', '1');
    applyOrient(orientLandscape); render(); });
  slot.appendChild(btn); slot.appendChild(hint);
}
// Two experimental preview toggles: Visual Test (color/VFX pass) and Depth Test
// (giant valley + cave, bigger arena). Both default off; Depth Test rebuilds terrain.
function buildModeChips(slot) {
  if (!slot) return;
  const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap';
  const mkToggle = (label, accentHex, isOn, onToggle) => {
    const accent = css(accentHex), btn = document.createElement('div');
    const render = () => {
      const on = isOn();
      btn.textContent = `${label}: ${on ? 'ON' : 'OFF'}`;
      btn.style.cssText = 'pointer-events:auto;cursor:pointer;user-select:none;font-size:12px;font-weight:bold;padding:7px 14px;border-radius:8px;background:rgba(0,0,0,.35);transition:all .12s;'
        + `border:2px solid ${on ? accent : '#3a4a6a'};color:${on ? accent : '#7788aa'};text-shadow:${on ? `0 0 12px ${accent}` : 'none'};`;
    };
    render();
    chip(btn, () => { onToggle(); render(); });
    return btn;
  };
  row.appendChild(mkToggle(t('visualTest'), 0xff8bd6, () => visualTest,
    () => {
      setVisualTest(!visualTest);
      bloom.strength = visualTest ? 0.62 : 0.35;
      neonPass.enabled = visualTest;
      FILL_MAT.color.setHex(visualTest ? 0x170022 : 0x000000);
    }));
  row.appendChild(mkToggle(t('depthTest'), 0x6bd9ff, () => depthTest,
    () => { setDepthTest(!depthTest); buildTerrain(); }));
  slot.appendChild(row);
  const hint = document.createElement('div');
  hint.style.cssText = 'font-size:11px;opacity:.45;margin-top:6px;line-height:1.6';
  hint.innerHTML = `${t('visualTestH')}<br>${t('depthTestH')}`;
  slot.appendChild(hint);
}
// Title-screen shard shop — a small, bounded set of permanent stat unlocks (see
// progress.js). Buying re-renders the whole title, matching the lang/mode chips' convention.
function buildUnlockPanel(slot) {
  if (!slot) return;
  const row = document.createElement('div');
  row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:440px;margin:0 auto';
  for (const u of UPGRADES) {
    const lvl = levelOf(u.id), maxed = lvl >= u.maxLevel, buyable = !maxed && canBuy(u.id);
    const el = document.createElement('div');
    el.textContent = `${u.name} · Lv ${lvl}/${u.maxLevel} · ${maxed ? 'MAX' : u.cost(lvl) + '◆'}`;
    el.style.cssText = 'pointer-events:auto;cursor:pointer;user-select:none;font-size:11px;padding:7px 12px;border-radius:14px;transition:all .1s;'
      + `border:1.5px solid ${buyable ? '#44cc88' : '#3a4a6a'};background:${buyable ? 'rgba(60,220,150,.20)' : 'rgba(0,0,0,.3)'};color:${buyable ? '#aaffcc' : '#8888aa'};text-shadow:${buyable ? '0 0 10px #33cc77' : 'none'};`;
    chip(el, () => { if (buy(u.id)) showTitle(); });
    row.appendChild(el);
  }
  slot.appendChild(row);
}

// ── Feedback (death screen) — ported from toko-drop ────────────────────────────
function buildPositiveReasons() { return [
  { id: 'like:feel', label: t('likeFeel') }, { id: 'like:dodge', label: t('likeDodge') },
  { id: 'like:aim', label: t('likeAim') }, { id: 'like:vibe', label: t('likeVibe') }, { id: 'like:vert', label: t('likeVert') }]; }
function buildFeedbackReasons() { return [
  { id: 'too_fast', label: t('fbFast') }, { id: 'unfair', label: t('fbUnfair') }, { id: 'unclear', label: t('fbUnclear') },
  { id: 'bullets', label: t('fbBullets') }, { id: 'dash', label: t('fbDash') }, { id: 'swarm', label: t('fbSwarm') }]; }
function saveFeedback(selIds, selLabels, comment, likedIds = [], likedLabels = []) {
  if (!selIds.length && !likedIds.length && !comment) return;
  const KEY = 'skltrFeedback', list = JSON.parse(localStorage.getItem(KEY) || '[]');
  list.unshift({ date: new Date().toISOString(), time: Math.round(runTime), kills, challenges, lang: getLang(),
    reasons: selLabels, reasonIds: selIds, liked: likedLabels, likedIds, comment: comment || '' });
  if (list.length > 100) list.length = 100;
  localStorage.setItem(KEY, JSON.stringify(list));
}
function buildFeedbackPanel(slot) {
  if (!slot) return;
  const liked = new Set(), selected = new Set(), labelById = {};
  const addRow = (heading, reasons, set, accent) => {
    const on = accent === 'pos' ? { b: '#44cc88', bg: 'rgba(60,220,150,.20)', c: '#aaffcc', g: '0 0 10px #33cc77' }
                                : { b: '#ff6644', bg: 'rgba(255,90,60,.22)', c: '#ffbbaa', g: '0 0 10px #ff5533' };
    const title = document.createElement('div'); title.textContent = heading;
    title.style.cssText = 'font-size:12px;letter-spacing:2px;opacity:.55;margin-bottom:10px'; slot.appendChild(title);
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:440px;margin:0 auto 14px';
    for (const r of reasons) {
      labelById[r.id] = r.label;
      const el = document.createElement('div'); el.textContent = r.label;
      const paint = () => { const s = set.has(r.id);
        el.style.cssText = 'pointer-events:auto;cursor:pointer;user-select:none;font-size:12px;padding:7px 13px;border-radius:16px;transition:all .1s;'
          + `border:1.5px solid ${s ? on.b : '#3a4a6a'};background:${s ? on.bg : 'rgba(0,0,0,.3)'};color:${s ? on.c : '#8888aa'};text-shadow:${s ? on.g : 'none'};`; };
      paint();
      el.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); set.has(r.id) ? set.delete(r.id) : set.add(r.id); paint(); });
      el.addEventListener('touchend', e => e.stopPropagation());
      row.appendChild(el);
    }
    slot.appendChild(row);
  };
  addRow(t('fbEnjoy'), buildPositiveReasons(), liked, 'pos');
  addRow(t('fbWrong'), buildFeedbackReasons(), selected, 'neg');
  const box = document.createElement('textarea'); box.placeholder = t('fbElse'); box.rows = 2;
  box.style.cssText = 'pointer-events:auto;user-select:text;display:block;width:min(440px,80vw);margin:0 auto 14px;background:rgba(0,0,0,.4);border:1.5px solid #3a4a6a;border-radius:8px;color:#ccd;font-family:monospace,sans-serif;font-size:13px;padding:8px 10px;resize:none;outline:none';
  box.addEventListener('keydown', e => e.stopPropagation());
  slot.appendChild(box);
  const btnRow = document.createElement('div'); btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center';
  const mkBtn = (text, ac, cb) => {
    const b = document.createElement('div'); b.textContent = text;
    b.style.cssText = 'pointer-events:auto;cursor:pointer;user-select:none;font-size:12px;font-weight:bold;padding:8px 17px;border-radius:7px;letter-spacing:1px;transition:all .12s;'
      + `border:2px solid ${ac ? '#44cc88' : '#3a4a6a'};background:rgba(0,0,0,.35);color:${ac ? '#88ffbb' : '#8888aa'};text-shadow:${ac ? '0 0 12px #44cc88' : 'none'};`;
    b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); cb(); });
    b.addEventListener('touchend', e => e.stopPropagation()); return b;
  };
  btnRow.appendChild(mkBtn(t('fbSend'), true, () => {
    saveFeedback([...selected], [...selected].map(id => labelById[id]), box.value.trim(), [...liked], [...liked].map(id => labelById[id]));
    returnToTitle();
  }));
  btnRow.appendChild(mkBtn(t('fbSkip'), false, returnToTitle));
  slot.appendChild(btnRow);
}
window._feedback = () => { const l = JSON.parse(localStorage.getItem('skltrFeedback') || '[]');
  console.log(`=== SKLTR FEEDBACK (${l.length}) ===`); const tally = {};
  for (const f of l) for (const r of (f.liked || []).concat(f.reasons || [])) tally[r] = (tally[r] || 0) + 1;
  for (const [r, n] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${n}×  ${r}`);
  l.filter(f => f.comment).forEach(f => console.log(`  [${f.time}s] ${f.comment}`)); return l; };
window._feedbackExport = () => { const l = JSON.parse(localStorage.getItem('skltrFeedback') || '[]');
  if (!l.length) { console.warn('No feedback.'); return; }
  const cols = ['date', 'time', 'kills', 'challenges', 'lang', 'liked', 'reasons', 'comment'], esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [cols.join(',')];
  for (const f of l) rows.push([esc(f.date), esc(f.time), esc(f.kills), esc(f.challenges), esc(f.lang), esc((f.liked || []).join(' | ')), esc((f.reasons || []).join(' | ')), esc(f.comment)].join(','));
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }));
  a.download = `skltr_feedback_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); };

// ── Flow ──────────────────────────────────────────────────────────────────────
function startGame() {
  overlay.style.display = 'none'; overlay.style.pointerEvents = 'none';
  runTime = 0; kills = 0; shake = 0; credits = 0; spawnCD = 0; nextBoss = 65; bossAlive = false; bossKills = 0; toasts = []; challenges = 0;
  hitstopT = 0; killPunch = 0;
  hazardInsidePrev = false; dashTipTimer = 0;
  for (const e of enemies) e.dispose(); enemies = []; pool.clear();
  player.reset(resolvedStats());
  if (!seenWelcome) { markWelcome(); toast('WASD move · aim anywhere · auto-fire on target', C.line); }
  newChallenge();
  gameState = 'playing'; audio.start();
}
function gameOver() {
  gameState = 'gameover'; shake = 1;
  if (runTime > best) { best = runTime; localStorage.setItem('skltrBestTime', best.toFixed(1)); }
  const earned = Math.floor(kills / 4) + Math.floor(runTime / 20) + challenges * 3;
  addShards(earned);
  audio.gameover(); showGameOver(earned);
}
function returnToTitle() {
  if (gameState !== 'gameover') return;
  for (const e of enemies) e.dispose(); enemies = []; pool.clear();
  overlay.style.pointerEvents = 'none'; gameState = 'title'; titlePanel = null; showTitle();
}

// ── Spawn director ────────────────────────────────────────────────────────────
function spawnAt(type, dist = 26) {
  const e = new Enemy(scene, type, scaling());
  const a = Math.random() * Math.PI * 2, r = dist + Math.random() * 8;
  let x = player.x + Math.cos(a) * r, z = player.z + Math.sin(a) * r;
  x = Math.max(-ARENA_R + 2, Math.min(ARENA_R - 2, x)); z = Math.max(-ARENA_R + 2, Math.min(ARENA_R - 2, z));
  e.place(x, z); enemies.push(e);
  if (e.boss) { bossAlive = true; audio.bossSpawn(); }
  return e;
}
function pickType() {
  const r = Math.random();
  if (runTime > 22 && r < 0.16) return 'flyer';
  if (runTime > 8 && r < 0.44) return 'turret';
  return 'chaser';
}
// boss2 unlocks after the player's first boss kill this run, boss3 after their second —
// simple run-local pacing, no persisted state.
function pickBoss() {
  const pool2 = ['boss'];
  if (bossKills >= 1) pool2.push('boss2');
  if (bossKills >= 2) pool2.push('boss3');
  return pool2[(Math.random() * pool2.length) | 0];
}
function director(dt) {
  credits += dt * (2.4 + runTime * 0.05);
  const cap = Math.min(9 + Math.floor(runTime / 11), LOW_TIER ? 24 : 60);
  spawnCD -= dt;
  if (spawnCD <= 0 && enemies.length < cap) {
    spawnCD = Math.max(0.35, 1.15 - runTime * 0.004);
    const type = pickType(), cost = COST[type];
    if (credits >= cost) { credits -= cost; spawnAt(type); }
  }
  if (runTime >= nextBoss && !bossAlive) { spawnAt(pickBoss(), 30); toast('BOSS INBOUND', C.boss); nextBoss += 95; }
}

// distance from point P to the segment A→B (swept collision, prevents tunneling)
function segDist(ax, ay, az, bx, by, bz, px, py, pz) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const l2 = dx * dx + dy * dy + dz * dz;
  let t = l2 > 1e-9 ? ((px - ax) * dx + (py - ay) * dy + (pz - az) * dz) / l2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t), pz - (az + dz * t));
}
// ── Collisions (3D, swept) ────────────────────────────────────────────────────
function collide() {
  for (let i = pool.active.length - 1; i >= 0; i--) {
    const p = pool.active[i];
    if (p.fromPlayer) {
      let consumed = false;
      for (const e of enemies) {
        if (!e.alive || (p.hitSet && p.hitSet.has(e))) continue;
        if (segDist(p.px, p.py, p.pz, p.x, p.y, p.z, e.x, e.y, e.z) > e.r + p.r) continue;
        const dead = e.takeDamage(p.damage);
        if (dead) onKill(e);
        if (p.pierce > 0) { p.pierce--; (p.hitSet || (p.hitSet = new Set())).add(e); } else consumed = true;
        break;
      }
      if (consumed) pool.recycle(i);
    } else {
      if (segDist(p.px, p.py, p.pz, p.x, p.y, p.z, player.x, 1.0, player.z) < 0.85 + p.r) {
        const hpb = player.hp; player.hurt(p.damage); pool.recycle(i);
        if (player.hp < hpb) { shake = Math.max(shake, 0.55); hitstopT = Math.max(hitstopT, HITSTOP_HURT); audio.hurt(); }
        if (!player.alive) { gameOver(); return; }
      }
    }
  }
  for (let i = enemies.length - 1; i >= 0; i--) if (!enemies[i].alive) { enemies[i].dispose(); enemies.splice(i, 1); }
}
function onKill(e) {
  kills++; audio.kill();
  const before = player.adr; player.addKill();
  if (player.adr > before) { audio.adrenaline(player.adr); toast(`ADRENALINE ${player.adr}`, C.adr); }
  if (e.boss) { bossAlive = false; bossKills++; toast('BOSS DOWN', C.adr); }
  hitstopT = Math.max(hitstopT, e.boss ? HITSTOP_BOSS_KILL : HITSTOP_KILL);
  killPunch = Math.max(killPunch, e.boss ? 1.6 : 1);
  burst(e.x, e.y, e.z, visualTest ? e.restColor : C.line, visualTest ? 16 : 8);
}

// ── Hit sparks (object-pooled — same pattern as ProjectilePool, no per-hit alloc) ──
const SPARK_CAP = 160;
const sparkGeo = new THREE.SphereGeometry(1, 5, 4);   // unit sphere; per-spawn scale sets the visible radius
const sparkPool = [];
for (let i = 0; i < SPARK_CAP; i++) {
  const mesh = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ transparent: true }));
  mesh.visible = false; scene.add(mesh);
  sparkPool.push({ mesh, active: false, vx: 0, vy: 0, vz: 0, life: 0 });
}
function sparkSpawn(x, y, z, color, radius, life) {
  const s = sparkPool.find(s => !s.active); if (!s) return null;   // pool exhausted → drop, never allocate
  s.active = true; s.vx = 0; s.vy = 0; s.vz = 0; s.life = life;
  s.mesh.visible = true; s.mesh.material.color.setHex(color); s.mesh.material.opacity = 1;
  s.mesh.scale.setScalar(radius); s.mesh.position.set(x, y, z);
  return s;
}
function burst(x, y, z, color, n = 8) {
  for (let i = 0; i < n; i++) {
    const s = sparkSpawn(x, y, z, color, 0.12, 0.5); if (!s) continue;
    const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI - Math.PI / 2, sp = 3 + Math.random() * 5;
    s.vx = Math.cos(a) * Math.cos(e) * sp; s.vy = Math.sin(e) * sp + 2; s.vz = Math.sin(a) * Math.cos(e) * sp;
  }
}
function updateSparks(dt) {
  for (const s of sparkPool) {
    if (!s.active) continue;
    s.life -= dt; s.vy -= 14 * dt;
    s.mesh.position.x += s.vx * dt; s.mesh.position.y += s.vy * dt; s.mesh.position.z += s.vz * dt;
    if (s.life <= 0) { s.active = false; s.mesh.visible = false; }
  }
}

// ── Input wiring ──────────────────────────────────────────────────────────────
function dashDir() {                     // world dir from move input, else aim-forward
  const mv = input.getMove();
  if (Math.hypot(mv.x, mv.z) > 0.1) {
    const s = Math.sin(input.yaw), c = Math.cos(input.yaw);
    let x = -s * mv.z + c * mv.x, z = -c * mv.z - s * mv.x; const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l };
  }
  const l = Math.hypot(_aim.fx, _aim.fz) || 1; return { x: _aim.fx / l, z: _aim.fz / l };
}
function screenToWorld(sx, sy) {         // swipe screen dir → world dir (camera-relative)
  const s = Math.sin(input.yaw), c = Math.cos(input.yaw);
  let x = (-s) * (-sy) + c * sx, z = (-c) * (-sy) + (-s) * sx; const l = Math.hypot(x, z) || 1; return { x: x / l, z: z / l };
}
function didDash() { audio.dash(); fovKick = 1; }   // dash feedback: whoosh + camera punch
input.onTap = () => {                    // tap: jump on ground, double-jump in the air
  if (gameState !== 'playing') return;
  if (player.grounded()) { if (player.jump()) audio.jump(); }
  else {
    if (!seenDoubleJump) { markDoubleJump(); toast('Jump again mid-air to double-jump', C.line); }
    if (player.doubleJump()) audio.jump();
  }
};
input.onSwipe = (sx, sy) => {            // swipe/flick: dash in the flicked direction
  if (gameState !== 'playing') return;
  const d = screenToWorld(sx, sy);
  if (player.grounded() ? player.groundDash(d) : player.airDash(d)) didDash();
};
input.onDashKey = () => {                // desktop Q
  if (gameState !== 'playing') return;
  if (player.grounded() ? player.groundDash(dashDir()) : player.airDash(dashDir())) didDash();
};
input.onToggleAim = () => { player.autoAim = !player.autoAim; toast(player.autoAim ? 'AUTO-AIM ON' : 'AUTO-AIM OFF', C.adr); };
input.onStart = () => {
  if (gameState === 'title') { if (titlePanel) { titlePanel = null; showTitle(); } else startGame(); }
  else if (gameState === 'gameover') returnToTitle();
};
input.onPause = () => {
  if (gameState === 'playing') { gameState = 'paused'; showPause(); }
  else if (gameState === 'paused') { overlay.style.display = 'none'; gameState = 'playing'; }
  else if (gameState === 'title') { if (titlePanel) { titlePanel = null; showTitle(); } else startGame(); }
  else if (gameState === 'gameover') returnToTitle();
};
// tap / click to start from the title (ignores taps on overlay chips/buttons, and does
// nothing while a settings/upgrades sub-panel is open — only its own BACK chip returns)
const _onOverlayUI = e => e.target && e.target.closest && e.target.closest('#overlay') && e.target.id !== 'overlay';
addEventListener('pointerdown', e => { if (_onOverlayUI(e)) return; if (gameState === 'title' && !titlePanel) startGame(); });

// ── Camera (free-look over-the-shoulder; aim any direction) ────────────────────
const _aim = { fx: 0, fy: 0, fz: -1, yaw: 0, pitch: 0 };
function computeAim() {
  const y = input.yaw, p = input.pitch, cp = Math.cos(p);
  _aim.yaw = y; _aim.pitch = p;
  _aim.fx = -Math.sin(y) * cp; _aim.fy = Math.sin(p); _aim.fz = -Math.cos(y) * cp;
  return _aim;
}
function updateCamera() {
  const a = _aim, dist = camDist, shoulder = 0.8;
  const cp = Math.cos(a.pitch);
  const rx = Math.cos(a.yaw), rz = -Math.sin(a.yaw);        // camera-right (horizontal)
  let sx = 0, sy = 0;
  if (shake > 0) { const m = shake * shake, t = performance.now() / 1000; sx = Math.sin(t * 53) * m * 0.5; sy = Math.cos(t * 47) * m * 0.5; }
  const hx = player.x, hy = player.y + 1.5, hz = player.z;
  const camY = Math.max(player.y + 0.3, hy - a.fy * dist + 0.25 + sy);   // never dip below the player's feet
  camera.position.set(hx - a.fx * dist + rx * shoulder * cp + sx, camY, hz - a.fz * dist + rz * shoulder * cp);
  camera.lookAt(camera.position.x + a.fx, camera.position.y + a.fy, camera.position.z + a.fz);
  const fov = camFovBase + fovKick * 7 + killPunch * 4;       // orientation base + dash punch + kill punch
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
}

// ── HUD ───────────────────────────────────────────────────────────────────────
function bar(x, y, w, h, k, color) {
  ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x, y, w * Math.max(0, Math.min(1, k)), h);
}
const _v = new THREE.Vector3();
function enemyBars() {
  for (const e of enemies) {
    if (!e.alive || (!e.boss && e.type === 'chaser')) continue;
    _v.set(e.x, e.y + e.r + 0.5, e.z).project(camera);
    if (_v.z > 1) continue;
    const sx = (_v.x * .5 + .5) * uiCanvas.width, sy = (-_v.y * .5 + .5) * uiCanvas.height;
    const w = e.boss ? 160 : 34, h = e.boss ? 7 : 4;
    bar(sx - w / 2, sy, w, h, e.hp / e.maxHp, css(e.boss ? 0xff6b7e : 0xffffff));
  }
}
function drawObjective(W, H) {
  const w = obj.pts[obj.idx]; if (!w) return;
  const label = obj.idx === 0 ? 'A' : 'B';
  _v.set(w.x, heightAt(w.x, w.z) + 2.4, w.z).project(camera);
  const onScreen = _v.z < 1 && Math.abs(_v.x) < 0.96 && Math.abs(_v.y) < 0.96;
  ctx.fillStyle = css(BEACON_COL); ctx.strokeStyle = css(BEACON_COL); ctx.lineWidth = 2; ctx.textAlign = 'center';
  if (onScreen) {
    const sx = (_v.x * .5 + .5) * W, sy = (-_v.y * .5 + .5) * H;
    ctx.beginPath(); ctx.arc(sx, sy, 12, 0, 7); ctx.stroke();
    ctx.font = 'bold 13px monospace'; ctx.fillText(label, sx, sy + 4);
  } else {
    const camAng = Math.atan2(-Math.cos(input.yaw), -Math.sin(input.yaw));
    const bearing = Math.atan2(w.z - player.z, w.x - player.x) - camAng;
    const r = Math.min(W, H) * 0.34, ax = W / 2 + Math.sin(bearing) * r, ay = H / 2 - Math.cos(bearing) * r;
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(bearing);
    ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(9, 8); ctx.lineTo(-9, 8); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  const dist = Math.hypot(player.x - w.x, player.z - w.z) | 0;
  ctx.font = 'bold 13px monospace'; ctx.fillText(`REACH ${label}  ·  ${dist}m`, W / 2, H - 42);
}
function reticle(W, H) {
  const locked = player._target;
  const col = locked ? 0xff6b7e : (player.adr > 0 ? C.adr : C.player);
  ctx.strokeStyle = css(col); ctx.lineWidth = 2;
  const cx = W / 2, cy = H / 2, o = locked ? 15 : 12;
  ctx.beginPath();
  ctx.moveTo(cx - o, cy); ctx.lineTo(cx - 5, cy); ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + o, cy);
  ctx.moveTo(cx, cy - o); ctx.lineTo(cx, cy - 5); ctx.moveTo(cx, cy + 5); ctx.lineTo(cx, cy + o);
  ctx.stroke();
  if (locked) { ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 7); ctx.stroke(); }   // lock ring
  ctx.fillStyle = css(col); ctx.beginPath(); ctx.arc(cx, cy, 1.6, 0, 7); ctx.fill();
  if (player.autoAim) { ctx.fillStyle = 'rgba(205,234,255,.4)'; ctx.font = '9px monospace'; ctx.textAlign = 'center'; ctx.fillText('AUTO', cx, cy + 30); }
  // dash-cooldown ring around the reticle
  const k = 1 - player.dashCD / 1.1;
  ctx.strokeStyle = k >= 1 ? css(C.player) : 'rgba(180,200,255,.5)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(cx, cy, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, k)); ctx.stroke();
}
function drawHUD() {
  ctx.clearRect(0, 0, uiCanvas.width, uiCanvas.height);
  const W = uiCanvas.width, H = uiCanvas.height;
  input.btns = [];
  if (gameState !== 'playing' && gameState !== 'paused') return;

  enemyBars();
  drawObjective(W, H);
  reticle(W, H);

  // health + adrenaline (top-left)
  ctx.textAlign = 'left';
  bar(16, 16, 240, 16, player.hp / player.maxHp, css(C.hp));
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1; ctx.strokeRect(16, 16, 240, 16);
  ctx.fillStyle = '#cdeaff'; ctx.font = 'bold 11px monospace'; ctx.fillText(`${Math.ceil(player.hp)}`, 22, 28);
  ctx.fillStyle = player.adr > 0 ? css(C.adr) : 'rgba(205,234,255,.4)'; ctx.font = 'bold 10px monospace';
  ctx.fillText('ADRENALINE', 16, 50);
  for (let i = 0; i < 5; i++) { const px = 16 + i * 16;
    ctx.beginPath(); ctx.rect(px, 56, 12, 8);
    if (i < player.adr) { ctx.fillStyle = css(C.adr); ctx.fill(); }
    ctx.strokeStyle = 'rgba(205,234,255,.35)'; ctx.lineWidth = 1; ctx.stroke(); }

  // time + phase (top-center)
  const ph = phase();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#cdeaff'; ctx.font = 'bold 22px monospace'; ctx.fillText(fmt(runTime), W / 2, 30);
  ctx.fillStyle = css(ph[2]); ctx.font = 'bold 13px monospace'; ctx.fillText(ph[1], W / 2, 50);

  // kills + best (top-right)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#cdeaff'; ctx.font = 'bold 18px monospace'; ctx.fillText(`${kills} kills`, W - 16, 28);
  ctx.fillStyle = css(BEACON_COL); ctx.font = 'bold 12px monospace'; ctx.fillText(`${challenges} runs`, W - 16, 46);
  if (best > 0) { ctx.fillStyle = 'rgba(205,234,255,.5)'; ctx.font = '11px monospace'; ctx.fillText(`best ${fmt(best)}`, W - 16, 62); }

  // toasts
  ctx.textAlign = 'center'; ctx.font = 'bold 15px monospace';
  toasts.forEach((t, i) => { ctx.globalAlpha = Math.min(1, t.life); ctx.fillStyle = css(t.c); ctx.fillText(t.t, W / 2, H * 0.3 + i * 22); ctx.globalAlpha = 1; });

  if (input.isTouch) drawTouchUI(W, H);
}
function drawStick(s, dx, dy) {
  const bx = s.active ? s.ox : dx, by = s.active ? s.oy : dy, R = 60, kr = 26;
  ctx.beginPath(); ctx.arc(bx, by, R, 0, 7); ctx.strokeStyle = 'rgba(205,234,255,.25)'; ctx.lineWidth = 2; ctx.stroke();
  const cl = v => Math.max(-R, Math.min(R, v));
  ctx.beginPath(); ctx.arc(bx + cl(s.dx), by + cl(s.dy), kr, 0, 7); ctx.fillStyle = s.active ? 'rgba(120,240,230,.4)' : 'rgba(205,234,255,.14)'; ctx.fill();
}
function drawTouchUI(W, H) {
  drawStick(input.left, W * 0.2, H * 0.74);
  drawStick(input.look, W * 0.8, H * 0.74);
  ctx.fillStyle = 'rgba(205,234,255,.35)'; ctx.font = '18px monospace'; ctx.textAlign = 'center'; ctx.fillText('❙❙', W / 2, 40);
  // gesture hints (tap = jump/air-dash · swipe = dash)
  ctx.fillStyle = 'rgba(205,234,255,.3)'; ctx.font = '10px monospace';
  ctx.fillText('tap: jump / double-jump    swipe: dash', W / 2, H - 12);
}

// ── Loop ──────────────────────────────────────────────────────────────────────
let prev = performance.now();
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now(); const rawDt = Math.min((now - prev) / 1000, 0.05); prev = now;
  if (shake > 0) shake = Math.max(0, shake - rawDt * 2.2);
  if (fovKick > 0) fovKick = Math.max(0, fovKick - rawDt * 4);
  if (killPunch > 0) killPunch = Math.max(0, killPunch - rawDt * 6);
  if (hitstopT > 0) hitstopT = Math.max(0, hitstopT - rawDt);
  for (let i = toasts.length - 1; i >= 0; i--) { toasts[i].life -= rawDt; if (toasts[i].life <= 0) toasts.splice(i, 1); }
  computeAim();
  const dt = hitstopT > 0 ? 0 : rawDt;   // brief freeze-frame on big hits/kills; rendering below still runs every real frame

  if (gameState === 'playing') {
    runTime += dt;
    if (!seenDash && !player.dashing) {
      dashTipTimer += dt;
      if (dashTipTimer > 8 && player.dashCD <= 0) { markDash(); toast('Q / swipe to DASH through bullets', C.shot); }
    }
    input.updateLook(dt);
    player.update(dt, input, _aim, enemies, heightAt);
    updatePlatforms();
    voidCheck();
    if (player._fired) audio.shoot();
    if (player.dashing) {                       // fading dash streak
      const col = visualTest ? (player.adr > 0 ? C.adr : 0x6bd9ff) : C.player;
      sparkSpawn(player.x, player.y + 0.8, player.z, col, visualTest ? 0.17 : 0.12, visualTest ? 0.45 : 0.3);
    }
    for (const e of enemies) e.update(dt, player, pool, heightAt, ARENA_R);
    for (const e of enemies) if (e.summonPulse) { e.summonPulse = false; spawnAt('chaser', 4); spawnAt('chaser', 4); }
    pool.update(dt);
    collide();
    hazardUpdate(dt);
    director(dt);
    objectiveUpdate(dt);
    updateSparks(dt);
  } else {
    if (gameState === 'gameover') updateSparks(dt);        // death FX linger; feedback panel drives the return
    player.fig.group.position.set(player.x, player.y, player.z);
    player.fig.group.rotation.y = input.yaw + Math.PI;     // face the camera on the title / death screen
    player.fig.update(dt, { speed: 0, aimPitch: 0 });
  }

  updateCamera();
  if (visualTest) neonPass.uniforms.time.value = now / 1000;
  composer.render();
  drawHUD();
}

// ── Resize / boot ─────────────────────────────────────────────────────────────
function resize() {
  renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
  bloom.resolution.set(innerWidth / (LOW_TIER ? 2 : 1), innerHeight / (LOW_TIER ? 2 : 1));
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  uiCanvas.width = innerWidth; uiCanvas.height = innerHeight;
  // default orientation follows the device until the player picks one explicitly
  if (!orientUserSet) { const land = innerWidth >= innerHeight; if (land !== orientLandscape) { orientLandscape = land; applyOrient(land); if (gameState === 'title') showTitle(); } }
}
addEventListener('resize', resize);
resize();
showTitle();
loop();
