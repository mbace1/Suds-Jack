import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { InputManager } from './input.js?v=61';
import { Player } from './player.js?v=61';
import { DaggerPool } from './daggers.js?v=61';
import { GemPool } from './gems.js?v=61';
import { DebrisPool, LitterField, VoxelSprite, MODELS, setVoxelDetail, getVoxelDetail, setStyleHue, styleTint, setHullMode, getHullMode } from './voxel.js?v=63';
import { Skull, Wraith, Splitter, MiniSkull, DreadSkull, Husk, Revenant, Brute, Totem, Serpent, Spider, Leviathan, Watcher, Blinker, Egg } from './enemy.js?v=61';
import { OrbPool } from './bullets.js?v=61';
import { AudioKit } from './audio.js?v=61';
import { mulberry32, fnv1a, utcDateStr, mixSeed } from './rng.js?v=61';
import { TUNING as T } from './tuning.js?v=63';
import { HyperEnvironment } from './environment.js?v=61';

const ARENA_R = 26;
const FIRE_SPREAD = T.weapon.spread;
const SKULL_CAP = 64;
const TOTEM_CAP = 6;
const SERPENT_CAP = 2;

// display names for the death-recap "felled by ___" line + kill breakdown
const ENEMY_NAMES = {
  skull: 'a skull', brute: 'a brute', serpent: 'the serpent', spider: 'a spider',
  watcher: 'a watcher', blinker: 'a blinker', leviathan: 'THE LEVIATHAN',
  thorn: 'a thorn spike', orb: 'an orb', totem: 'a totem', dread: 'the DREAD SKULL',
  husk: 'a husk', revenant: 'a revenant',
};

// player-tunable options (pause menu), persisted across sessions
// v25 deliberately starts from a clean image. A new key prevents old,
// spectacle-heavy defaults from silently carrying into the reset.
const OPTS_KEY = 'hyperDaggerOptsV26';
const opts = Object.assign(
  // motion=false is the reduced-motion master switch (forces smear/shake/chroma/FOV
  // kicks off without touching the individual toggles); contrast=true brightens
  // orbs + telegraphs and kills the floor's red flush for readability
  { speed: 1, fov: 90, sens: 1, aim: true, projection: false, smear: false, shake: true, chroma: false, edge: false, music: true, motion: true, contrast: false, perf: 'auto', haptics: true, detail: 'auto', style: 'crimson', look: 'smooth' },
  JSON.parse(localStorage.getItem(OPTS_KEY) || '{}'));

// STYLE presets: hue targets for the accent recolor (null = native crimson).
// Distilled in the Voxel Lab; bone/greys never shift, only red-dominant glow.
const STYLE_HUES = { crimson: null, cyan: 0.5, gold: 0.11, violet: 0.77 };

// ------------------------------------------------ performance governor
// Auto-degrades render cost on weak devices (opts.perf 'auto'; 'high'/'low'
// pin tier 0/4). The governor NEVER writes opts.* — effective pass state is
// always userToggle && tierAllows (reconciled in applyOpts), so the pause
// menu keeps showing user intent and a step-up can't resurrect a toggle the
// user turned off.
const BASE_PR = Math.min(window.devicePixelRatio, 2);
// Devil Daggers' image is authored as a coarse software raster, not a clean
// high-DPI WebGL frame. Keep every performance tier inside the same visual
// language and let CSS enlarge the buffer with hard nearest-neighbour pixels.
const SOFTWARE_PR = Math.min(BASE_PR, 0.72);
// Phones open at ×27, not the ×64 desktop default: the governor needs a few
// seconds of frame samples to react, and a mid-range phone spending those
// seconds at the ceiling stutters through the opening spawn. An explicit
// VOXEL pick still reaches ×64 on any device.
// v4.31: the models themselves carry ~4× more voxels now, so the AUTO
// subdivision ladder sits one tier lower for the same instance budget —
// detail comes from the sculpt, not from subdividing a blob
const AUTO_DETAIL_CEIL = window.matchMedia?.('(pointer: coarse)').matches ? 2 : 3;
const PERF_TIERS = [
  // gibs = how many pieces ONE death throws (scales with the voxel density
  // ladder below, so a ×64 enemy actually shatters instead of chunking)
  { chroma: true,  smear: true,  edge: true,  hull: true,  sphereEvery: 2, pr: SOFTWARE_PR,                 bloom: true,  debrisCap: 4000, gibs: 520, litter: 2500 }, // T0 full
  { chroma: false, smear: true,  edge: true,  hull: true,  sphereEvery: 3, pr: SOFTWARE_PR,                 bloom: true,  debrisCap: 4000, gibs: 420, litter: 2000 }, // T1
  { chroma: false, smear: false, edge: false, hull: true,  sphereEvery: 4, pr: SOFTWARE_PR,                 bloom: true,  debrisCap: 3000, gibs: 300, litter: 1200 }, // T2
  { chroma: false, smear: false, edge: false, hull: false, sphereEvery: 0, pr: Math.min(SOFTWARE_PR, 0.62), bloom: true,  debrisCap: 2000, gibs: 220, litter: 600 }, // T3
  { chroma: false, smear: false, edge: false, hull: false, sphereEvery: 0, pr: Math.min(SOFTWARE_PR, 0.50), bloom: false, debrisCap: 800,  gibs: 110, litter: 0 }, // T4 floor
];
// mutable so headless tests can shrink the timescales
const perfTuning = { downMs: 40, upMs: 22, settleMs: 2000, stableMs: 15000, downHoldMs: 1500, emaAlpha: 0.08 };
let perfTier = 0;
let frameEMA = 16.7;
let perfSettleUntil = 0; // ignore samples until this performance.now()
let perfBadSince = 0;
let perfGoodSince = 0;
let forcedFrameTime = null; // debug override (ms)

// Devil-Daggers-style dagger levels, advanced by collecting gems.
const LEVEL_GEMS = T.weapon.levelGems; // gems needed to reach index level
const WEAPON = T.weapon.tiers;         // LV4 — the crimson hand (DD's fourth tier)
const GEM_DROPS = { totem: 3, brute: 2, serpent: 1, leviathan: 10, watcher: 1, blinker: 1, dread: 3, husk: 4, revenant: 2 };

// The gauntlet itself evolves with the weapon (DD's hand upgrades): knuckle
// glow at LV2, red veins at LV3, full crimson-and-fire at LV4. Keys are the
// hand model's palette letters; retint() rewrites just those voxels.
const GAUNTLET_TIERS = [
  null,
  { G: 0xbeb4a6, D: 0x5c554d, H: 0xe2d8c8, B: [2.2, 0.22, 0.08] },
  { G: 0xc8bdaa, D: 0x625a50, H: [1.25, 0.72, 0.40], B: [2.35, 0.24, 0.08] },
  { G: 0x8c8174, D: [1.35, 0.10, 0.06], H: [1.5, 0.45, 0.22], B: [2.5, 0.26, 0.08] },
  { G: 0x4a1010, D: [2.2, 0.16, 0.10], H: [2.0, 0.32, 0.12], B: [2.7, 0.34, 0.10] },
];

// Style/combo meter (Returnal/DMC-flavoured): fast kills and dash-throughs
// fill it, idling bleeds it out. Rank climbs D→SSS; it drives music intensity
// and the peak rank is a run-end brag. `min` is the fill needed to reach a
// tier. Style gained per event scales with the meter, rewarding chains.
const STYLE_TIERS = [
  { min: 0, label: '', color: '' },
  { min: 6, label: 'D', color: '#9a9a9a' },
  { min: 15, label: 'C', color: '#c8c8c8' },
  { min: 28, label: 'B', color: '#f0f0f0' },
  { min: 45, label: 'A', color: '#ffffff' },
  { min: 66, label: 'S', color: '#ff6b6b' },
  { min: 92, label: 'SS', color: '#e83030' },
  { min: 124, label: 'SSS', color: '#c81e1e' },
];
const STYLE_CAP = T.style.cap;
// style awarded per kill by enemy type (dash-through orbs + gems add their own)
const STYLE_GAIN = {
  skull: 3, brute: 6, serpent: 5, spider: 5, watcher: 5,
  blinker: 5, leviathan: 30, thorn: 0, dread: 8, husk: 9, revenant: 6,
};

// ---------------------------------------------------------------- renderer
const canvas = document.getElementById('canvas-game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(BASE_PR);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.86;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x020202, 24, 72);

const camera = new THREE.PerspectiveCamera(opts.fov, window.innerWidth / window.innerHeight, 0.1, 300);
scene.add(camera); // so the first-person hand (a camera child) renders
camera.layers.enable(1); // first-person layer; spherical world cameras omit it

// v23: a real 360-degree scene source. The world cube gives the projection
// shader geometry behind the player; the threat cube isolates enemy shapes so
// rear silhouettes can burn red without tinting the entire arena. Low-res and
// cadence-gated by the performance governor: awareness, not a second beauty render.
const sphereWorldTarget = new THREE.WebGLCubeRenderTarget(192, {
  minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  generateMipmaps: false,
});
const sphereThreatTarget = new THREE.WebGLCubeRenderTarget(128, {
  minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
  generateMipmaps: false,
});
const sphereWorldCamera = new THREE.CubeCamera(0.2, 220, sphereWorldTarget);
sphereWorldCamera.layers.set(0);
const sphereThreatCamera = new THREE.CubeCamera(0.2, 80, sphereThreatTarget);
sphereThreatCamera.layers.set(2);
const _sphereCamRot = new THREE.Matrix3();

const SphereShader = {
  uniforms: {
    tDiffuse: { value: null },
    uWorld: { value: sphereWorldTarget.texture },
    uThreat: { value: sphereThreatTarget.texture },
    uCamRot: { value: _sphereCamRot },
    uAspect: { value: window.innerWidth / window.innerHeight },
    uAmount: { value: 1 },
    uTint: { value: new THREE.Color(2.7, 0.12, 0.12) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform samplerCube uWorld;
    uniform samplerCube uThreat;
    uniform mat3 uCamRot;
    uniform float uAspect;
    uniform float uAmount;
    uniform vec3 uTint;
    varying vec2 vUv;
    void main() {
      vec4 forward = texture2D(tDiffuse, vUv);
      vec2 p = vUv * 2.0 - 1.0;
      p.x *= uAspect;
      float edgeR = sqrt(uAspect * uAspect + 1.0);
      float nr = clamp(length(p) / edgeR, 0.0, 1.0);
      vec2 radial = length(p) > 0.0001 ? normalize(p) : vec2(0.0);
      // Centre stays conventional for aiming; the frame edge bends through
      // the side view and reaches almost directly behind at the corners.
      float theta = nr * 3.05;
      vec3 localDir = vec3(radial * sin(theta), -cos(theta));
      vec3 worldDir = normalize(uCamRot * localDir);
      vec3 sphere = textureCube(uWorld, worldDir).rgb;
      // A small cross-shaped dilation keeps distant threats legible after the
      // deliberately tiny cube capture. It is still the enemy's real shape,
      // not a HUD marker or a generic edge alarm.
      vec3 tangent = normalize(cross(abs(worldDir.y) < 0.92 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), worldDir));
      vec3 bitangent = normalize(cross(worldDir, tangent));
      float threatLum = max(textureCube(uThreat, worldDir).r, max(textureCube(uThreat, worldDir).g, textureCube(uThreat, worldDir).b));
      vec3 tx = textureCube(uThreat, normalize(worldDir + tangent * 0.035)).rgb;
      vec3 nx = textureCube(uThreat, normalize(worldDir - tangent * 0.035)).rgb;
      vec3 ty = textureCube(uThreat, normalize(worldDir + bitangent * 0.035)).rgb;
      vec3 ny = textureCube(uThreat, normalize(worldDir - bitangent * 0.035)).rgb;
      threatLum = max(threatLum, max(max(max(tx.r, max(tx.g, tx.b)), max(nx.r, max(nx.g, nx.b))), max(max(ty.r, max(ty.g, ty.b)), max(ny.r, max(ny.g, ny.b)))));
      float rear = smoothstep(1.05, 2.45, theta);
      float silhouette = smoothstep(0.018, 0.32, threatLum);
      sphere = mix(sphere, sphere + uTint * (0.72 + threatLum * 0.48), silhouette * rear * 0.78);
      // Fine scan breakup keeps the rear signal graphic rather than a red fog.
      sphere += uTint * silhouette * rear * (0.035 + 0.025 * sin(vUv.y * 96.0));
      float lens = smoothstep(0.12, 0.82, nr) * uAmount;
      gl_FragColor = vec4(mix(forward.rgb, sphere, lens), forward.a);
    }`,
};

// HYPERDEMON-ish chromatic aberration, driven by the trauma system
const ChromaShader = {
  uniforms: { tDiffuse: { value: null }, uAmount: { value: 0.0012 } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
      vec2 d = (vUv - 0.5) * uAmount;
      gl_FragColor = vec4(
        texture2D(tDiffuse, vUv - d).r,
        texture2D(tDiffuse, vUv).g,
        texture2D(tDiffuse, vUv + d).b,
        1.0);
    }`,
};

// v4.30 neon rim: a cross-gradient edge tint over the raw render — every
// silhouette gets HYPERDEMON's wire glow. It sits BEFORE the smear and the
// bloom on purpose: edges streak with motion and flare like everything else
// bright, instead of being pasted on top of the finished frame.
const EdgeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uPx: { value: new THREE.Vector2(1 / window.innerWidth, 1 / window.innerHeight) },
    uTint: { value: new THREE.Color(1.6, 0.35, 0.35) }, // HDR so bloom bites (STYLE re-aims it)
    uAmt: { value: 0.15 }, // v4.31: halved — a rim, not a wash (owner's call)
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 uPx;
    uniform vec3 uTint;
    uniform float uAmt;
    varying vec2 vUv;
    float lum(vec2 o) {
      vec3 c = texture2D(tDiffuse, vUv + o * uPx).rgb;
      return dot(c, vec3(0.299, 0.587, 0.114));
    }
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      float gx = lum(vec2(1.0, 0.0)) - lum(vec2(-1.0, 0.0));
      float gy = lum(vec2(0.0, 1.0)) - lum(vec2(0.0, -1.0));
      // soft threshold keeps the dither of the sky quiet; only real
      // silhouettes (enemy vs void, grid vs floor) light up
      float e = clamp(length(vec2(gx, gy)) * 2.0 - 0.16, 0.0, 1.0);
      gl_FragColor = vec4(base.rgb + uTint * e * uAmt, base.a);
    }`,
};

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const spherePass = new ShaderPass(SphereShader);
composer.addPass(spherePass);
const edgePass = new ShaderPass(EdgeShader);
composer.addPass(edgePass);
// motion smear on everything bright; damp is DYNAMIC since v4.30 — it deepens
// mid-dash (see the fovKick block), so the hardest smear is always transient
// and the 0.82-starburst trap stays closed
const SMEAR_BASE = 0.74;
const SMEAR_DASH = 0.12;
const afterimage = new AfterimagePass(SMEAR_BASE);
composer.addPass(afterimage);
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.32, 0.25, 0.78);
composer.addPass(bloom);
const chromaPass = new ShaderPass(ChromaShader);
composer.addPass(chromaPass);

// v22 spherical-awareness language: threats outside the forward view burn
// into the screen periphery. This is direction information rather than a
// conventional HUD arrow, keeping the view diegetic and readable at speed.
const ThreatShader = {
  uniforms: {
    tDiffuse: { value: null },
    uRear: { value: 0 },
    uSide: { value: 0 },
    uTint: { value: new THREE.Color(2.5, 0.18, 0.18) },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uRear;
    uniform float uSide;
    uniform vec3 uTint;
    varying vec2 vUv;
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      vec2 p = vUv * 2.0 - 1.0;
      float edge = smoothstep(0.38, 1.0, abs(p.x));
      float band = smoothstep(0.08, 0.46, 1.0 - abs(p.y));
      float scan = 0.68 + 0.32 * sin(p.y * 64.0);
      float sideBias = 0.72 + 0.28 * sign(p.x) * uSide;
      float signal = edge * band * scan * sideBias * uRear;
      base.rgb += uTint * signal * 0.22;
      gl_FragColor = base;
    }`,
};
const threatPass = new ShaderPass(ThreatShader);
composer.addPass(threatPass);

// dash speedlines: additive radial streaks from screen centre while dashK is
// hot (HYPERDEMON's punched-through-space read). Enabled only mid-dash, and
// gated by the motion toggle + the same perf tier as the smear.
const SpeedShader = {
  uniforms: { tDiffuse: { value: null }, uAmount: { value: 0 }, uTime: { value: 0 } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    uniform float uTime;
    varying vec2 vUv;
    float hash(float n) { return fract(sin(n) * 43758.5453); }
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      vec2 d = vUv - 0.5;
      float ang = atan(d.y, d.x);
      float r = length(d);
      // ~60 radial spokes, randomly gated per-spoke, sliding outward
      float spoke = floor((ang + 3.14159) * 9.55);
      float gate = step(0.72, hash(spoke + floor(uTime * 14.0) * 61.0));
      float line = smoothstep(0.92, 1.0, fract((ang + 3.14159) * 9.55));
      float mask = smoothstep(0.12, 0.55, r); // keep the centre clean
      col.rgb += vec3(1.0) * line * gate * mask * uAmount * 0.5;
      gl_FragColor = col;
    }`,
};
const speedPass = new ShaderPass(SpeedShader);
speedPass.enabled = false;
composer.addPass(speedPass);

// impact distortion: a damped radial UV ripple from screen centre, fired on
// heavy kills / player hits / death (HYPERDEMON's space-warp hits)
const RippleShader = {
  uniforms: { tDiffuse: { value: null }, uT: { value: 9 }, uAmp: { value: 0 } },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uT;
    uniform float uAmp;
    varying vec2 vUv;
    void main() {
      vec2 d = vUv - 0.5;
      float r = length(d);
      float w = sin(r * 42.0 - uT * 16.0) * exp(-r * 3.5) * exp(-uT * 6.0) * uAmp;
      vec2 uv = vUv + (r > 0.0001 ? d / r : vec2(0.0)) * w * 0.02;
      gl_FragColor = texture2D(tDiffuse, uv);
    }`,
};
const ripplePass = new ShaderPass(RippleShader);
ripplePass.enabled = false;
composer.addPass(ripplePass);
composer.addPass(new OutputPass());

let rippleT = 9;
let rippleAmp = 0;

function triggerRipple(amp) {
  rippleT = 0;
  rippleAmp = Math.max(rippleAmp, amp);
}

/** Controller haptics, behind the HAPTICS pause toggle. */
function buzz(strong, weak, ms) {
  if (opts.haptics) input.rumble(strong, weak, ms);
}

// ---------------------------------------------------------------- arena
function makeFloorTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const hash = (x, y) => {
    let n = Math.imul(x + 17, 374761393) ^ Math.imul(y + 31, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };
  // Uneven soot and old blood replace the clean Tron grid. Work in chunky
  // 2x2 texels so the ground reads as a hand-made software texture in motion.
  for (let y = 0; y < 128; y += 2) for (let x = 0; x < 128; x += 2) {
    const n = hash(x >> 1, y >> 1);
    const grit = 8 + Math.floor(n * 15);
    g.fillStyle = `rgb(${grit + (n > 0.88 ? 7 : 0)},${Math.max(4, grit - 3)},${Math.max(3, grit - 5)})`;
    g.fillRect(x, y, 2, 2);
  }
  // Broken slab seams give motion scale without drawing a luminous grid.
  g.lineWidth = 1;
  for (let i = 0; i <= 128; i += 16) {
    g.strokeStyle = `rgba(96,32,22,${0.10 + hash(i, 1) * 0.08})`;
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke();
  }
  g.fillStyle = 'rgba(126,38,24,0.10)';
  for (let i = 0; i < 36; i++) {
    const x = Math.floor(hash(i, 7) * 128);
    const y = Math.floor(hash(i, 19) * 128);
    g.fillRect(x, y, 1 + (i & 1), 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// the grid simply stops at the arena edge — no barrier visual. The grid
// pulses with the music and flushes red with trauma (HYPERDEMON's reactive
// world): uPulse brightens the lines on the beat, uRed tints them.
const floorMat = new THREE.ShaderMaterial({
  uniforms: {
    map: { value: makeFloorTexture() },
    uPulse: { value: 0 },
    uGlow: { value: 0.9 },
    uRed: { value: 0 },
    uAccent: { value: new THREE.Color(2.2, 0.25, 0.25) }, // hurt-flush tint (STYLE re-aims it)
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D map;
    uniform float uPulse;
    uniform float uGlow;
    uniform float uRed;
    uniform vec3 uAccent;
    varying vec2 vUv;
    void main() {
      vec3 col = texture2D(map, vUv * 10.0).rgb;
      col *= uGlow + uPulse * 0.28;
      col = mix(col, col * uAccent, clamp(uRed, 0.0, 1.0));       // hurt flush
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const floor = new THREE.Mesh(
  new THREE.CircleGeometry(ARENA_R, 64).rotateX(-Math.PI / 2),
  floorMat,
);
scene.add(floor);

// Devil Daggers reference: almost-black void, with one low ember horizon.
// No hue walk, bands or decorative motion compete with enemy silhouettes.
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    uTime: { value: 0 },
    uEmber: { value: 0 },
    uEmberCol: { value: new THREE.Color(0.30, 0.02, 0.02) }, // horizon glow (STYLE re-aims it)
  },
  vertexShader: /* glsl */`
    varying vec3 vPos;
    void main() {
      vPos = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    varying vec3 vPos;
    uniform float uTime;
    uniform float uEmber;
    uniform vec3 uEmberCol;
    void main() {
      vec3 d = normalize(vPos);
      float h = d.y;
      vec3 col = vec3(0.0015);
      float horiz = pow(max(0.0, 1.0 - abs(h) * 4.8), 4.0);
      col += uEmberCol * horiz * (0.52 + uEmber * 0.32);
      gl_FragColor = vec4(col, 1.0);
    }`,
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(220, 32, 16), skyMat));

// drifting dust motes for depth + speed perception
const dust = (() => {
  const n = 80;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 42;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = Math.random() * 9;
    pos[i * 3 + 2] = Math.sin(a) * r;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xb8aca4, size: 0.045, transparent: true, opacity: 0.12,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const p = new THREE.Points(geo, mat);
  scene.add(p);
  return p;
})();

// One horizon line only. The fight owns the rest of the frame.
const environment = new HyperEnvironment(scene, ARENA_R);

// ---------------------------------------------------------------- actors
const input = new InputManager();
const player = new Player(camera, input, ARENA_R);
const daggers = new DaggerPool(scene);
const debris = new DebrisPool(scene);
// settled gibs retire into the bone-yard: a static instanced mesh with no
// per-frame physics, so a run's carnage accumulates for one draw call
const litter = new LitterField(scene, 2500);
debris.litter = litter;
const gems = new GemPool(scene);
const orbs = new OrbPool(scene);
const audio = new AudioKit();
const enemies = [];
const serpents = [];

// ------------------------------------------------------------- ground VFX
// Blob shadows: flat dark discs under the player + every enemy so unlit
// voxels stop floating — height finally reads (jumps, serpent dives, orbs).
// One InstancedMesh; scale shrinks with altitude to fake soft attenuation.
const SHADOW_CAP = 96;
const shadows = new THREE.InstancedMesh(
  new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4, depthWrite: false }),
  SHADOW_CAP,
);
shadows.frustumCulled = false;
shadows.renderOrder = 1; // above the floor, below everything else
scene.add(shadows);
const _shM = new THREE.Matrix4();
const _shQ = new THREE.Quaternion();
const _shS = new THREE.Vector3();
const _shP = new THREE.Vector3();

function updateShadows() {
  let i = 0;
  const put = (x, y, z, base) => {
    if (i >= SHADOW_CAP) return;
    const k = Math.max(0, 1 - y / 9); // higher = smaller, gone by y=9
    if (k <= 0.05) return;
    _shM.compose(
      _shP.set(x, 0.02, z),
      _shQ.identity(),
      _shS.setScalar(base * (0.55 + 0.45 * k) * k),
    );
    shadows.setMatrixAt(i++, _shM);
  };
  put(player.feet.x, player.feet.y, player.feet.z, 0.62);
  for (const e of enemies) {
    if (e.type === 'totem') continue; // grounded pillar — a disc just z-fights
    e.center(_shP);
    const y = _shP.y;
    put(e.pos.x, Math.max(0, y - e.radius), e.pos.z, e.radius * 1.35);
  }
  shadows.count = i;
  shadows.instanceMatrix.needsUpdate = true;
}

// Impact sparks (dagger hits) + shockwave rings (heavy kills). The spark is an
// authored 8px software sprite rather than a clean translucent WebGL square.
const sparks = [];
const sparkPool = [];
const sparkData = new Uint8Array(8 * 8 * 4);
for (let y = 0; y < 8; y++) {
  for (let x = 0; x < 8; x++) {
    const dx = Math.abs(x - 3.5), dy = Math.abs(y - 3.5);
    const core = dx <= 1 && dy <= 1;
    const arm = (dx <= 0.5 && dy <= 3.5) || (dy <= 0.5 && dx <= 3.5);
    const diag = Math.abs(dx - dy) < 0.35 && dx <= 2.5;
    const a = core ? 255 : arm ? 220 : diag ? 150 : 0;
    const i = (y * 8 + x) * 4;
    sparkData[i] = 255; sparkData[i + 1] = core ? 210 : 88;
    sparkData[i + 2] = core ? 120 : 18; sparkData[i + 3] = a;
  }
}
const sparkTex = new THREE.DataTexture(sparkData, 8, 8, THREE.RGBAFormat);
sparkTex.magFilter = THREE.NearestFilter;
sparkTex.minFilter = THREE.NearestFilter;
sparkTex.generateMipmaps = false;
sparkTex.needsUpdate = true;
const sparkGeo = new THREE.PlaneGeometry(0.68, 0.68);
const sparkMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color().setRGB(2.6, 0.85, 0.28), map: sparkTex,
  transparent: true, opacity: 1, alphaTest: 0.04,
  blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
});
const ringGeo = new THREE.RingGeometry(0.82, 1, 40).rotateX(-Math.PI / 2);
const ringMat = new THREE.MeshBasicMaterial({
  color: new THREE.Color().setRGB(2.4, 0.25, 0.25), transparent: true, opacity: 1,
  blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
});

function spawnSpark(pos, big = false) {
  let m = sparkPool.pop();
  if (!m) {
    if (sparks.length > 40) return;
    m = new THREE.Mesh(sparkGeo, sparkMat.clone());
    scene.add(m);
  }
  m.visible = true;
  m.position.copy(pos);
  const roll = Math.random() * Math.PI * 2;
  sparks.push({ m, t: 0.14, max: 0.14, big, ring: false, roll });
}

function spawnShockwave(pos) {
  const m = new THREE.Mesh(ringGeo, ringMat.clone()); // rare (heavy kills only) — no pool
  scene.add(m);
  m.position.set(pos.x, 0.05, pos.z);
  sparks.push({ m, t: 0.45, max: 0.45, big: true, ring: true });
  // the ring isn't just a decal — it blasts the surrounding gib field outward
  debris.shove(pos.x, 0.4, pos.z, 7, 11);
  litter.shove(debris, pos.x, 0.4, pos.z, 7, 9); // bones leap back into the air
}

function updateSparks(dt) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.t -= dt;
    const k = Math.max(0, s.t / s.max);
    if (s.ring) {
      s.m.scale.setScalar(0.4 + (1 - k) * 7);
      s.m.material.opacity = k * 0.9;
    } else {
      s.m.scale.setScalar((s.big ? 1.6 : 0.8) * (0.4 + (1 - k) * 1.4));
      s.m.material.opacity = k;
      s.m.lookAt(camera.position);
      s.m.rotateZ(s.roll);
    }
    if (s.t <= 0) {
      if (s.ring) {
        scene.remove(s.m);
        s.m.material.dispose();
      } else {
        s.m.visible = false;
        sparkPool.push(s.m);
      }
      sparks.splice(i, 1);
    }
  }
}

// first-person voxel gauntlet, child of the camera; recoils on fire
const hand = new VoxelSprite(MODELS.hand);
const handGroup = new THREE.Group();
handGroup.add(hand.mesh);
// A true first-person overlay: the old four-finger claw is pitched into the
// screen so its silhouette reads, and world geometry can never hide it.
hand.material.depthTest = false;
hand.material.depthWrite = false;
hand.material.transparent = true;
hand.mesh.renderOrder = 20;
const HAND_BASE = { x: 0, y: -0.92, z: -1.5, rx: -0.75, ry: Math.PI + 0.12, rz: 0 };
handGroup.rotation.set(HAND_BASE.rx, HAND_BASE.ry, HAND_BASE.rz);
handGroup.position.set(HAND_BASE.x, HAND_BASE.y, HAND_BASE.z);
handGroup.traverse(o => o.layers.set(1));
camera.add(handGroup);
let recoil = 0;

/** Re-skin the gauntlet to match the current dagger level (DD's evolving hand). */
function applyGauntlet(lv) {
  hand.retint(GAUNTLET_TIERS[Math.min(lv, GAUNTLET_TIERS.length - 1)]);
}

// ---------------------------------------------------------------- HUD
const ui = document.getElementById('canvas-ui');
const uiCtx = ui.getContext('2d');
const elTimer = document.getElementById('timer');
const elKills = document.getElementById('kills');
const elGems = document.getElementById('gems');
const elStyle = document.getElementById('style');
const elStyleRank = document.getElementById('styleRank');
const elStyleMult = document.getElementById('styleMult');
const elStyleFill = document.getElementById('styleFill');
const elMsg = document.getElementById('msg');
const elToast = document.getElementById('toast');
const elCross = document.getElementById('crosshair');
function setRunFrame(active) {
  document.body.classList.toggle('in-run', active);
}
const elVignette = document.getElementById('vignette');
let toastTimeout = 0;

function toast(text, ms = 1500) {
  elToast.textContent = text;
  elToast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => elToast.classList.remove('show'), ms);
}

/** First-encounter announcement: big toast + stinger, once per run per key. */
function announce(key, text) {
  if (announced[key]) return;
  announced[key] = true;
  toast(text, 2200);
  audio.stinger();
  trauma = Math.max(trauma, 0.2);
}

/** One code path for pixel ratio + size so tier changes and window resizes
 *  can't undo each other. EffectComposer caches its own pixel ratio — setting
 *  only the renderer's is not enough. */
function applyRenderScale() {
  const pr = PERF_TIERS[perfTier].pr;
  renderer.setPixelRatio(pr);
  composer.setPixelRatio(pr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  edgePass.uniforms.uPx.value.set(1 / (window.innerWidth * pr), 1 / (window.innerHeight * pr));
}

function resize() {
  applyRenderScale();
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  spherePass.uniforms.uAspect.value = camera.aspect;
  ui.width = window.innerWidth;
  ui.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

function setPerfTier(t) {
  t = Math.max(0, Math.min(PERF_TIERS.length - 1, t));
  if (t === perfTier) return;
  perfTier = t;
  applyRenderScale();
  applyOpts();
  perfSettleUntil = performance.now() + perfTuning.settleMs;
  perfBadSince = 0;
  perfGoodSince = 0;
}

/** Called once per frame with the UNCLAMPED delta (ms). EMA-based hysteresis:
 *  step down after ~1.5s sustained over downMs, step up one tier per ~15s
 *  stable under upMs. Samples right after tier changes / unpause /
 *  tab-visibility flips are ignored (perfSettleUntil). */
function perfGovern(now, rawMs) {
  if (opts.perf !== 'auto' || state !== 'playing' || paused) return;
  const ms = forcedFrameTime ?? rawMs;
  // the >250ms discard catches tab-hidden gaps — it only applies to REAL
  // samples, so forced (test) frame times always count
  if (now < perfSettleUntil || (forcedFrameTime === null && rawMs > 250)) {
    perfBadSince = 0;
    perfGoodSince = 0;
    return;
  }
  frameEMA += (ms - frameEMA) * perfTuning.emaAlpha;
  if (frameEMA > perfTuning.downMs) {
    perfGoodSince = 0;
    if (!perfBadSince) perfBadSince = now;
    else if (now - perfBadSince > perfTuning.downHoldMs) setPerfTier(perfTier + 1);
  } else if (frameEMA < perfTuning.upMs) {
    perfBadSince = 0;
    if (!perfGoodSince) perfGoodSince = now;
    else if (now - perfGoodSince > perfTuning.stableMs) setPerfTier(perfTier - 1);
  } else {
    perfBadSince = 0;
    perfGoodSince = 0;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    perfSettleUntil = performance.now() + perfTuning.settleMs;
  }
});

// ---------------------------------------------------------------- game state
let state = 'menu'; // 'menu' | 'tips' | 'playing' | 'dead'
let paused = false;
let gameTime = 0;
let kills = 0;
let killsByType = {};
let lastKiller = null;
const lastKillerPos = new THREE.Vector3(); // where the fatal hit came from
let lastKillerRef = null;                  // entity ref for the death-cam flash
let deathCam = null;                       // {yaw, pitch, t} — killer-focus lerp
let gemCount = 0;
let weaponLv = 1;
let fireTimer = 0;
// DD gunfeel state: how long the trigger has been held, whether it was held
// last frame, and the lockout after a shotgun burst
let fireHeldT = 0;
let fireWasHeld = false;
let shotCd = 0;
let homingAmmo = 0;
let homingFireTimer = 0;
let homingHeldT = 0;
let homingWasHeld = false;
let weaponActive = false;
let styleVal = 0;      // current meter fill (0..STYLE_CAP), bleeds when idle
let stylePeakIdx = 0;  // best tier reached this run (for the death recap)
let nextTotemAt = 0;
let nextLevAt = 0;
let nextThornAt = 0;
let nextRevenantAt = 110; // the dead only rise once there are dead
let nextPulseAt = 0; // budgeted pressure pulses (toko-drop's wave system, adapted)
let pulseN = 0;
let pureScriptCursor = 0;
let serpentsSpawned = 0;
let musicI = 0; // smoothed music intensity, reused by the reactive floor + sky
let levAlive = false; // Leviathan on the field — the sky's ember burns hotter
let hitStop = 0; // heavy-kill micro time-freeze (seconds remaining)
let announced = {};
let deathAt = 0;
let trauma = 0;
let fovKick = 0;
let slowmo = 0;
// PURE = Devil Daggers rules (one touch kills). HYPER = HYPERDEMON rules:
// a draining life-timer is your health — kills add seconds, hits cost 10.
// New key intentionally returns existing players to the DD-authored default;
// HYPER remains an optional remix they can select again from the menu.
const MODE_KEY = 'hyperDaggerModeV31';
let mode = localStorage.getItem(MODE_KEY) === 'hyper' ? 'hyper' : 'pure';
let hiScore = parseFloat(localStorage.getItem(hiKey()) || '0');
const HYPER_START = T.hyper.start;
const HYPER_CAP = T.hyper.cap;
const HYPER_HIT_COST = T.hyper.hitCost;
let lifeT = HYPER_START;
let mercyT = 0; // post-hit i-frames (hyper mode)

// -------------------------------------------------------- daily runs
// DAILY seeds the director from the UTC date + mode so same-day players face
// the same unlock schedule and per-pulse pick sequences (full determinism is
// impossible — player input diverges the sim immediately; see rng.js). Only
// director-level draws use the seeded stream; enemy micro-jitter, debris and
// gems stay Math.random.
let runKind = localStorage.getItem('hyperDaggerRunKind') === 'daily' ? 'daily' : 'free';
let runSeed = 0;
let runDate = ''; // pinned at resetRun so a run straddling UTC midnight scores against its seed day
let dateOverride = null; // debug/test hook
const rng = { next: Math.random }; // director-level stream, swapped per run
const DAILY_TABLE_KEY = 'hyperDaggerDailyBest';

function todayStr() { return dateOverride ?? utcDateStr(); }

function dailyKey(date, m) { return `hyperDaggerDaily:${date}:${m}`; }

function readDailyTable() {
  try { return JSON.parse(localStorage.getItem(DAILY_TABLE_KEY) || '[]'); } catch { return []; }
}

/** Fold a finished daily time into the capped all-time table; returns rank. */
function pushDailyTable(date, m, t) {
  const table = readDailyTable();
  const rank = 1 + table.filter(e => e.t > t).length;
  table.push({ date, mode: m, t });
  table.sort((a, b) => b.t - a.t);
  localStorage.setItem(DAILY_TABLE_KEY, JSON.stringify(table.slice(0, 30)));
  return rank;
}

/** Merge stale per-day keys into the table, then delete them — localStorage
 *  stays bounded at ≤2 live keys (pure+hyper today) plus one 30-entry table. */
function gcDailyKeys() {
  const today = todayStr();
  const stale = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    const m = k && k.match(/^hyperDaggerDaily:(\d{4}-\d{2}-\d{2}):(\w+)$/);
    if (m && m[1] !== today) stale.push({ k, date: m[1], mode: m[2] });
  }
  for (const s of stale) {
    const t = parseFloat(localStorage.getItem(s.k) || '0');
    if (t > 0) pushDailyTable(s.date, s.mode, t);
    localStorage.removeItem(s.k);
  }
}
gcDailyKeys();

// ------------------------------------------------- global daily board
// Optional remote leaderboard backed by scripts/daily-board.gs (Google Apps
// Script, zero cost — deploy guide in that file's header, paste the /exec URL
// here). Empty endpoint = feature fully off: zero fetches, no board DOM.
let BOARD_ENDPOINT = '';
const INITIALS_KEY = 'hyperDaggerInitials';

function sanitizeInitials(v) {
  return String(v || '').toUpperCase().replace(/[^A-Z0-9?]/g, '').slice(0, 3) || '???';
}
function getInitials() { return sanitizeInitials(localStorage.getItem(INITIALS_KEY)); }

/** POST this daily run, then GET the day's top 10 into the death screen's
 *  #board block. Fire-and-forget with quiet failure — never blocks the UI. */
async function boardReport(date, m, t) {
  if (!BOARD_ENDPOINT) return;
  // re-query per use: a restart may have rebuilt the overlay's innerHTML
  const board = () => document.getElementById('board');
  try {
    await fetch(BOARD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' }, // dodges the CORS preflight Apps Script can't answer
      body: JSON.stringify({ date, mode: m, t: Math.round(t * 10) / 10, name: getInitials() }),
    });
    const res = await fetch(
      `${BOARD_ENDPOINT}?date=${date}&mode=${m}&t=${Math.round(t * 10) / 10}`);
    const data = await res.json();
    const el = board();
    if (!el || !data || !Array.isArray(data.top)) return;
    const rows = data.top.map((r, i) =>
      `#${i + 1} ${sanitizeInitials(r.name)} ${Number(r.t).toFixed(1)}s`).join('<br>');
    el.innerHTML =
      `<p class="history">GLOBAL TOP &middot; ${date}${
        data.rank ? ` &middot; you: #${data.rank} of ${data.count} today` : ''}</p>
       <p class="history">${rows || 'no runs yet today — yours is first'}</p>`;
  } catch {
    const el = board();
    if (el) el.innerHTML = '<p class="history">board offline</p>';
  }
}

/** Menu extra: today's global best for the selected mode (daily view only). */
async function menuBoardLine() {
  if (!BOARD_ENDPOINT || runKind !== 'daily') return;
  try {
    const res = await fetch(`${BOARD_ENDPOINT}?date=${todayStr()}&mode=${mode}`);
    const data = await res.json();
    const top = data?.top?.[0];
    const el = document.getElementById('menuBoard');
    if (el && top && state === 'menu') {
      el.innerHTML = `today's global best ${Number(top.t).toFixed(1)}s by ${
        sanitizeInitials(top.name)}<br>`;
    }
  } catch { /* board offline — menu shows nothing extra */ }
}

function showMenu() {
  setRunFrame(false);
  elMsg.style.display = 'block';
  const modeLine = mode === 'hyper'
    ? `HYPER &mdash; your clock is your life: kills add seconds, a hit costs ${HYPER_HIT_COST}`
    : 'PURE &mdash; scripted spawns, one touch kills, no escape button';
  const controls = mode === 'hyper'
    ? 'mouse look + <b>WASD</b> &middot; <b>SPACE</b> hop &middot; <b>SHIFT</b> dash &middot; <b>R</b> reap'
    : 'mouse look + <b>WASD</b> &middot; <b>SPACE</b> hop &middot; <b>LMB</b> daggers &middot; <b>RMB</b> homing';
  elMsg.innerHTML =
    `<h1>HYPER DAGGER</h1>
     <p class="sub">a stripped-down Devil Daggers homage</p>
     <p>survive the swarm &mdash; time is your only score</p>
     <p class="keys">${controls} &middot; <b>ESC</b> options<br>
     gamepad &mdash; sticks &middot; <b>A/&#10005;</b> jump &middot; triggers fire &nbsp;|&nbsp; touch &mdash; <b>left tap = jump</b> &middot; <b>right tap = burst</b></p>
     <button id="modeBtn">MODE: ${modeLine}</button>
     <button id="runKindBtn" class="opt">RUN: ${runKind === 'daily'
    ? `DAILY &mdash; everyone faces the ${todayStr()} seed`
    : 'FREE &mdash; pure random'}</button>
     <p class="go"><span id="menuBoard"></span>${bestLine()}click / tap / press &#10005; or START to descend</p>`;
  menuBoardLine();
  document.getElementById('modeBtn').addEventListener('pointerdown', e => {
    e.stopPropagation();
    mode = mode === 'hyper' ? 'pure' : 'hyper';
    localStorage.setItem(MODE_KEY, mode);
    hiScore = parseFloat(localStorage.getItem(hiKey()) || '0');
    showMenu();
  });
  document.getElementById('runKindBtn').addEventListener('pointerdown', e => {
    e.stopPropagation();
    runKind = runKind === 'daily' ? 'free' : 'daily';
    localStorage.setItem('hyperDaggerRunKind', runKind);
    showMenu();
  });
}

function bestLine() {
  if (runKind === 'daily') {
    const dayBest = parseFloat(localStorage.getItem(dailyKey(todayStr(), mode)) || '0');
    return dayBest > 0 ? `today's best ${dayBest.toFixed(1)}s &mdash; ` : '';
  }
  return hiScore > 0 ? `best ${hiScore.toFixed(1)}s &mdash; ` : '';
}

// One-time 3-tip card before the very first run — the mechanics that aren't
// obvious from the HUD. After this the menu stays terse.
const TIPS_KEY = 'hyperDaggerSeenTips';

function showTips() {
  state = 'tips';
  setRunFrame(false);
  elMsg.style.display = 'block';
  elMsg.innerHTML =
    `<h1>HOW TO SURVIVE</h1>
     <p class="big">&#9876; <b>tap</b> = shotgun burst &middot; <b>hold</b> = stream</p>
     <p class="sub">every dagger is aimed &mdash; on touch the stream runs itself while you move</p>
     <p class="big">&#10227; <b>jump as you land</b> to carry speed</p>
     <p class="sub">burst down after takeoff, then again near the apex</p>
     <p class="big">&#9670; <b>gems level your daggers</b></p>
     <p class="sub">10 / 70 &rarr; faster &middot; then bank 150 for the final hand; RMB spends homing</p>
     <p class="go">click / tap / press &#10005; to descend</p>`;
}

function hiKey() { return mode === 'hyper' ? 'hyperDaggerHiHyper' : 'hyperDaggerHi'; }

// last-10 run history (all modes together), most recent first
const HISTORY_KEY = 'hyperDaggerHistory';

function pushRunHistory(entry) {
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { hist = []; }
  hist.unshift(entry);
  hist = hist.slice(0, 10);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
  return hist;
}

// Run telemetry (toko-drop's hit-log pattern): one record per death, capped
// at 40 runs, powering __hd.debug.report() so balance tuning works from data
// instead of guesses. Local only — nothing leaves the browser.
const RUNLOG_KEY = 'hyperDaggerRunLog';

function pushRunLog(timedOut) {
  let log = [];
  try { log = JSON.parse(localStorage.getItem(RUNLOG_KEY) || '[]'); } catch { log = []; }
  log.unshift({
    t: Math.round(gameTime * 10) / 10,
    mode,
    cause: timedOut ? 'timeout' : (lastKiller || 'unknown'),
    kills,
    killsByType: { ...killsByType },
    lv: weaponLv,
    gems: gemCount,
    peak: STYLE_TIERS[stylePeakIdx].label || '-',
    pulseN,
    lastPulseKind: pulseKind(pulseN),
  });
  log = log.slice(0, 40);
  localStorage.setItem(RUNLOG_KEY, JSON.stringify(log));
}

/** Console balance report over the run log: what kills players, when, and
 *  how far the weapon/style economy gets. */
function runReport() {
  let log = [];
  try { log = JSON.parse(localStorage.getItem(RUNLOG_KEY) || '[]'); } catch { log = []; }
  if (!log.length) return { runs: 0 };
  const ts = log.map(r => r.t).sort((a, b) => a - b);
  const causes = {};
  const kinds = {};
  let lvSum = 0;
  for (const r of log) {
    causes[r.cause] = (causes[r.cause] || 0) + 1;
    kinds[r.lastPulseKind || '-'] = (kinds[r.lastPulseKind || '-'] || 0) + 1;
    lvSum += r.lv;
  }
  return {
    runs: log.length,
    medianT: ts[(ts.length / 2) | 0],
    bestT: ts[ts.length - 1],
    deathsByCause: Object.fromEntries(Object.entries(causes).sort((a, b) => b[1] - a[1])),
    deathsByPulseKind: kinds,
    avgWeaponLv: Math.round(lvSum / log.length * 10) / 10,
    peaks: log.map(r => r.peak).join(' '),
  };
}

function showDeath(timedOut) {
  const t = gameTime.toFixed(1);
  // daily times never touch the FREE all-time board — separate economies
  let best = false;
  let dailyLines = '';
  if (runKind === 'daily') {
    const key = dailyKey(runDate, mode); // runDate, not today — midnight straddle
    const dayBest = parseFloat(localStorage.getItem(key) || '0');
    best = gameTime > dayBest;
    if (best) localStorage.setItem(key, String(gameTime));
    const rank = pushDailyTable(runDate, mode, gameTime);
    dailyLines =
      `<p>${best ? 'NEW DAILY BEST' : `today's best ${dayBest.toFixed(1)}s`} &middot; ${runDate}${
        rank <= 30 ? ` &middot; daily #${rank} all-time` : ''}</p>${
        BOARD_ENDPOINT
          ? `<div id="board"><p class="history">fetching global top&hellip;</p></div>
             <p class="history">initials <input id="initials" maxlength="3" value="${getInitials()}"> (next run's board name)</p>`
          : ''}`;
  } else if (gameTime > hiScore) {
    best = true;
    hiScore = gameTime;
    localStorage.setItem(hiKey(), String(hiScore));
  }

  const causeLine = timedOut
    ? 'the clock ran out'
    : `felled by ${ENEMY_NAMES[lastKiller] || 'something'}`;
  const breakdown = Object.entries(killsByType)
    .sort((a, b) => b[1] - a[1])
    .map(([type, n]) => `${n}&times; ${ENEMY_NAMES[type] || type}`)
    .join(' &middot; ');

  const hist = pushRunHistory({ t: gameTime, mode, daily: runKind === 'daily' || undefined });
  pushRunLog(timedOut);
  const historyLine = hist.slice(1, 9).map(r => r.t.toFixed(1) + 's').join(' &middot; ');
  const peakRank = stylePeakIdx > 0 ? ` &middot; peak rank ${STYLE_TIERS[stylePeakIdx].label}` : '';

  const heavies = Math.floor(pulseN / 8);
  const pulseLine = pulseN > 0
    ? `<p class="breakdown">survived ${pulseN} pulse${pulseN === 1 ? '' : 's'}${heavies ? ` (${heavies} heavy)` : ''}</p>` : '';
  const share = `HYPER DAGGER · ${runKind === 'daily' ? `daily ${runDate}` : 'free run'} · ${
    mode.toUpperCase()} · ${t}s · ${kills} kills · LV${weaponLv}${
    stylePeakIdx > 0 ? ` · rank ${STYLE_TIERS[stylePeakIdx].label}` : ''}`;

  elMsg.style.display = 'block';
  elMsg.innerHTML =
    `<h1 class="dead">${timedOut ? 'TIME OUT' : 'DEVOURED'}</h1>
     <p class="big">${t}s &middot; ${kills} kills &middot; ${gemCount} gems</p>
     <p class="cause">${causeLine} &middot; daggers LV${weaponLv}${peakRank}</p>
     ${breakdown ? `<p class="breakdown">${breakdown}</p>` : ''}
     ${pulseLine}
     ${runKind === 'daily' ? dailyLines
    : `<p>${best ? 'NEW BEST' : `best ${hiScore.toFixed(1)}s`}${mode === 'hyper' ? ' &middot; hyper' : ''}</p>`}
     ${historyLine ? `<p class="history">recent: ${historyLine}</p>` : ''}
     <button id="shareBtn" class="opt">COPY RUN</button>
     <p class="go">click / tap / &#10005; to retry</p>`;
  document.getElementById('shareBtn').addEventListener('pointerdown', async e => {
    e.stopPropagation(); // don't let the copy tap restart the run
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText(share);
      btn.textContent = 'COPIED';
    } catch {
      btn.textContent = share; // clipboard blocked — show it for manual copy
    }
  });
  const initialsEl = document.getElementById('initials');
  if (initialsEl) {
    // taps/keys in the input must not restart the run
    initialsEl.addEventListener('pointerdown', e => e.stopPropagation());
    initialsEl.addEventListener('input', e => {
      const v = sanitizeInitials(e.target.value);
      localStorage.setItem(INITIALS_KEY, v);
    });
  }
  if (runKind === 'daily') boardReport(runDate, mode, gameTime);
}

function clearEnemies() {
  for (const e of enemies) e.remove(scene);
  enemies.length = 0;
  serpents.length = 0;
}

function resetRun() {
  runDate = todayStr();
  if (runKind === 'daily') {
    runSeed = fnv1a(runDate + ':' + mode);
    rng.next = mulberry32(runSeed);
  } else {
    runSeed = 0;
    rng.next = Math.random;
  }
  clearEnemies();
  clearPending();
  daggers.reset();
  debris.reset();
  litter.reset();
  gems.reset();
  orbs.reset();
  clearThorns();
  gameTime = 0;
  kills = 0;
  killsByType = {};
  lastKiller = null;
  lastKillerRef = null;
  deathCam = null;
  hitStop = 0;
  rippleT = 9;
  rippleAmp = 0;
  levAlive = false;
  endFlyby();
  flybyDone = false;
  gemCount = 0;
  weaponLv = 1;
  fireTimer = 0;
  // pretend the trigger is already down a long time, so releasing the click
  // that started the run can never fire a spurious shotgun
  fireHeldT = 999;
  fireWasHeld = true;
  shotCd = 0;
  homingAmmo = 0;
  homingFireTimer = 0;
  homingHeldT = 999;
  homingWasHeld = true;
  weaponActive = false;
  styleVal = 0;
  stylePeakIdx = 0;
  // onboarding pacing lives in PULSE_POOL's unlock gates (watcher 25s …
  // dread 120s) — pulses can only draw a type once its gate opens, so debuts
  // still land one at a time. Totems/thorns/Leviathan stay on their own clocks.
  nextTotemAt = 0;
  nextThornAt = 60;
  nextLevAt = 150;
  nextRevenantAt = 110;
  reapCool = 0;
  nextPulseAt = 20;
  pulseN = 0;
  pureScriptCursor = 0;
  serpentsSpawned = 0;
  musicI = 0;
  applyGauntlet(1);
  announced = {};
  debuted = {};
  trauma = 0;
  fovKick = 0;
  slowmo = 0;
  lifeT = HYPER_START;
  mercyT = 0;
  player.reset();
  player.dashEnabled = mode === 'hyper';
}

function goFullscreen() {
  if (!input.touchMode || document.fullscreenElement) return;
  const p = document.documentElement.requestFullscreen?.();
  if (p && p.then) {
    p.then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  }
}

function startGame() {
  goFullscreen();
  resetRun();
  gfocus = -1;
  // drain A/B edges accumulated while menuing so the run doesn't open with
  // a phantom jump or dash
  input.consumeJump();
  input.consumeDash();
  input.consumeDashFlick();
  state = 'playing';
  paused = false;
  setRunFrame(true);
  elMsg.style.display = 'none';
  // The claw and its projectile stream are the sight. A pasted HUD crosshair
  // made the frame feel like a generic browser FPS and is absent in the target.
  elCross.style.display = 'none';
  elPause.style.display = 'block';
  audio.droneStart();
  if (opts.music) audio.musicStart();
}

function die(timedOut = false) {
  state = 'dead';
  setRunFrame(false);
  deathAt = performance.now();
  slowmo = 1;
  trauma = 1;
  triggerRipple(1);
  buzz(1, 1, 320);
  // killer-focus death cam: swing the view toward what got you during the
  // slow-mo. TIME OUT has no killer — the clock did it — so no swing there.
  if (!timedOut && lastKiller && lastKiller !== 'timeout') {
    const dx = lastKillerPos.x - camera.position.x;
    const dz = lastKillerPos.z - camera.position.z;
    const hd = Math.hypot(dx, dz);
    if (hd > 0.4) {
      deathCam = {
        yaw: Math.atan2(-dx, -dz),
        pitch: Math.max(-0.9, Math.min(0.6, Math.atan2(lastKillerPos.y - camera.position.y, hd))),
        t: 1.3,
      };
      lastKillerRef?.sprite?.flash?.(3); // the killer burns bright
    }
  }
  audio.droneStop();
  audio.musicStop();
  audio.death();
  elVignette.style.opacity = 1;
  setTimeout(() => { elVignette.style.opacity = 0; }, 450);
  elCross.style.display = 'none';
  elPause.style.display = 'none';
  elStyle.style.opacity = '0';
  if (document.pointerLockElement) document.exitPointerLock();
  showDeath(timedOut);
}

window.addEventListener('pointerdown', e => {
  audio.ensure();
  const isMouse = e.pointerType === 'mouse';
  if (state === 'menu') {
    if (!localStorage.getItem(TIPS_KEY)) {
      localStorage.setItem(TIPS_KEY, '1');
      showTips();
    } else {
      startGame();
    }
  } else if (state === 'tips') {
    startGame();
  } else if (state === 'dead') {
    if (performance.now() - deathAt < 700) return;
    startGame();
  } else if (state === 'playing' && paused) {
    paused = false;
    setRunFrame(true);
    perfSettleUntil = performance.now() + perfTuning.settleMs; // stale EMA after pause
    elMsg.style.display = 'none';
    elPause.style.display = 'block';
  }
  if (isMouse && state === 'playing' && !document.pointerLockElement) {
    canvas.requestPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  if (state === 'playing' && !input.touchMode && !document.pointerLockElement && !paused) {
    showPause();
  }
});

// ------------------------------------------------------------- pause menu
const elPause = document.getElementById('pauseBtn');
elPause.addEventListener('pointerdown', e => {
  e.stopPropagation();
  if (state === 'playing' && !paused) {
    if (document.pointerLockElement) document.exitPointerLock(); // triggers showPause
    else showPause();
  }
});

function saveOpts() {
  localStorage.setItem(OPTS_KEY, JSON.stringify(opts));
  applyOpts();
}

function applyOpts() {
  // perf HIGH/LOW pin the tier; setPerfTier no-ops when unchanged so the
  // recursive applyOpts call inside it terminates immediately
  if (opts.perf === 'high') setPerfTier(0);
  else if (opts.perf === 'low') setPerfTier(PERF_TIERS.length - 1);
  const tier = PERF_TIERS[perfTier];
  // voxel density: AUTO starts at the x64 design default and the governor
  // walks it down the ladder (x27/x8/x1) as the tier degrades; an explicit
  // VOXEL choice overrides it. Existing sprites keep their detail until they
  // die — the swarm re-densifies within seconds.
  const autoDetail = opts.perf === 'low' ? 1
    : Math.min(AUTO_DETAIL_CEIL, [3, 2, 2, 1, 1][perfTier]);
  setVoxelDetail(opts.detail === 'auto' ? autoDetail : opts.detail);
  // reduced motion (opts.motion=false) and the perf tier both override the
  // individual FX toggles without rewriting them — user intent stays in opts.*
  afterimage.enabled = opts.smear && opts.motion && tier.smear;
  chromaPass.enabled = opts.chroma && opts.motion && tier.chroma;
  // the neon rim is a static effect, so the motion toggle leaves it alone
  edgePass.enabled = opts.edge && tier.edge;
  spherePass.enabled = opts.projection && tier.sphereEvery > 0;
  // The peripheral warning was visually loud without improving the core aim.
  // Keep rear awareness inside the optional spherical view only.
  threatPass.enabled = false;
  bloom.enabled = tier.bloom;
  debris.softCap = tier.debrisCap;
  debris.gibTarget = tier.gibs;
  // LOW tier turns the bone-yard off; settled gibs fall back to expiring
  debris.litter = tier.litter > 0 ? litter : null;
  if (tier.litter <= 0) litter.reset();
  // STYLE preset: re-hue every accent surface. Hue is applied at voxel parse
  // for new spawns; live sprites re-derive from their pre-style base colors.
  setStyleHue(STYLE_HUES[opts.style] ?? null);
  hand.applyStyle();
  litter.applyStyle();
  // v4.32 LOOK: smooth hull skin vs raw cubes — user toggle gated by the
  // perf tier (a skin rebuild on every chip is not free on weak hardware)
  const hullOn = opts.look === 'smooth' && tier.hull;
  setHullMode(hullOn);
  hand.setHull(hullOn); // noHull in the model def keeps it cubes regardless
  for (const e of enemies) {
    for (const part of e.parts || [e.sprite]) {
      part.applyStyle?.();
      part.setHull?.(hullOn);
    }
  }
  if (flyby) for (const p of flyby.parts) { p.sprite.applyStyle(); p.sprite.setHull(hullOn); }
  // high contrast: hotter orbs so projectiles read against the bloom
  // (intensity picked first, then the style hue re-aims it)
  styleTint(orbs.mat.color.setRGB(...(opts.contrast ? [3.4, 0.5, 0.5] : [2.6, 0.2, 0.2])));
  styleTint(gems.mesh.material.color.setRGB(2.4, 0.15, 0.15));
  styleTint(floorMat.uniforms.uAccent.value.setRGB(2.2, 0.25, 0.25));
  styleTint(skyMat.uniforms.uEmberCol.value.setRGB(0.30, 0.02, 0.02));
  styleTint(edgePass.uniforms.uTint.value.setRGB(1.6, 0.35, 0.35));
  styleTint(threatPass.uniforms.uTint.value.setRGB(2.5, 0.18, 0.18));
  styleTint(spherePass.uniforms.uTint.value.setRGB(2.7, 0.12, 0.12));
  const envAccent = styleTint(new THREE.Color().setRGB(2.2, 0.22, 0.22));
  environment.setAccent(envAccent);
  environment.setQuality(perfTier);
  player.sens = opts.sens;
  // reconcile music with the toggle live (only while a run is active)
  if (state === 'playing') {
    if (opts.music && !audio.musicPlaying()) audio.musicStart();
    else if (!opts.music && audio.musicPlaying()) audio.musicStop();
  }
}

function optRow(label, key, values, fmt) {
  const btns = values.map(v =>
    `<button class="opt ${opts[key] === v ? 'on' : ''}" data-k="${key}" data-v="${v}">${fmt(v)}</button>`).join('');
  return `<div class="optrow"><span>${label}</span>${btns}</div>`;
}

function showPause() {
  paused = true;
  setRunFrame(false);
  elPause.style.display = 'none';
  elMsg.style.display = 'block';
  let voxCount = hand.aliveCount;
  for (const e of enemies) {
    for (const part of e.parts || [e.sprite]) voxCount += part.aliveCount;
  }
  elMsg.innerHTML =
    `<h1>PAUSED</h1>
     <p class="sub">~${Math.min(999, Math.round(1000 / Math.max(1, frameEMA)))} fps &middot; ${voxCount.toLocaleString()} voxels on field &middot; new spawns use the VOXEL setting</p>
     ${optRow('SPEED', 'speed', [1, 1.25, 1.5], v => v + '\u00d7')}
     ${optRow('FOV', 'fov', [70, 80, 90], v => v)}
     ${optRow('VIEW', 'projection', [true, false], v => v ? 'SPHERE' : 'NORMAL')}
     ${optRow('SENS', 'sens', [0.7, 1, 1.3, 1.6], v => ({ 0.7: 'LOW', 1: 'MED', 1.3: 'HIGH', 1.6: 'MAX' })[v])}
     ${optRow('AIM', 'aim', [true, false], v => v ? 'ASSIST ON' : 'ASSIST OFF')}
     ${optRow('FX', 'smear', [true, false], v => v ? 'SMEAR ON' : 'SMEAR OFF')}
     ${optRow('', 'shake', [true, false], v => v ? 'SHAKE ON' : 'SHAKE OFF')}
     ${optRow('', 'chroma', [true, false], v => v ? 'CHROMA ON' : 'CHROMA OFF')}
     ${optRow('', 'edge', [true, false], v => v ? 'EDGE ON' : 'EDGE OFF')}
     ${optRow('', 'music', [true, false], v => v ? 'MUSIC ON' : 'MUSIC OFF')}
     ${optRow('A11Y', 'motion', [true, false], v => v ? 'MOTION FULL' : 'MOTION REDUCED')}
     ${optRow('', 'contrast', [false, true], v => v ? 'CONTRAST HIGH' : 'CONTRAST NORMAL')}
     ${optRow('PERF', 'perf', ['auto', 'high', 'low'], v => v.toUpperCase())}
     ${optRow('', 'haptics', [true, false], v => v ? 'HAPTICS ON' : 'HAPTICS OFF')}
     ${optRow('VOXEL', 'detail', ['auto', 1, 2, 3, 4], v => v === 'auto' ? 'AUTO' : ({ 1: '1X', 2: '8X', 3: '27X', 4: '64X' })[v])}
     ${optRow('LOOK', 'look', ['smooth', 'cubes'], v => v.toUpperCase())}
     ${optRow('STYLE', 'style', ['crimson', 'cyan', 'gold', 'violet'], v => v.toUpperCase())}
     <p class="go">click / tap anywhere else to resume</p>`;
  for (const b of elMsg.querySelectorAll('button.opt')) {
    b.addEventListener('pointerdown', e => {
      e.stopPropagation();
      const k = b.dataset.k;
      const raw = b.dataset.v;
      opts[k] = raw === 'true' ? true : raw === 'false' ? false
        : isNaN(parseFloat(raw)) ? raw : parseFloat(raw);
      saveOpts();
      showPause(); // re-render with the new selection
    });
  }
}

// ---------------------------------------------------------------- spawning
const _sv = new THREE.Vector3();

// telegraphed spawns: a light beam marks the spot, then the enemy appears
const pending = [];

function telegraph(pos, colorRGB, delay, fn) {
  const hot = opts.contrast ? 1.4 : 1;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.45, 26, 10, 1, true),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color().setRGB(colorRGB[0] * hot, colorRGB[1] * hot, colorRGB[2] * hot),
      transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  beam.position.set(pos.x, 13, pos.z);
  scene.add(beam);
  pending.push({ t: delay, total: delay, beam, fn });
}

function updatePending(dt) {
  for (let i = pending.length - 1; i >= 0; i--) {
    const p = pending[i];
    p.t -= dt;
    const k = 1 - Math.max(0, p.t) / p.total;
    p.beam.material.opacity = Math.sin(k * Math.PI) * 0.5;
    p.beam.rotation.y += dt * 4;
    if (p.t <= 0) {
      scene.remove(p.beam);
      p.beam.geometry.dispose();
      p.beam.material.dispose();
      pending.splice(i, 1);
      p.fn();
    }
  }
}

// Thorn hazard (area denial): a red sigil pulses under the player, then a
// white voxel spike erupts — move, dash, or be airborne when it fires.
const thorns = [];

function spawnThorn(x, z) {
  const sigil = new THREE.Mesh(
    new THREE.CircleGeometry(1.3, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color().setRGB(1.8, 0.12, 0.12),
      transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }),
  );
  sigil.position.set(x, 0.03, z);
  scene.add(sigil);
  const sprite = new VoxelSprite(MODELS.thorn);
  const group = new THREE.Group();
  group.add(sprite.mesh);
  group.position.set(x, 0, z);
  group.scale.y = 0.01;
  group.visible = false;
  scene.add(group);
  thorns.push({ sigil, sprite, group, state: 'warn', t: 0.9, struck: false });
  audio.warn();
}

function updateThorns(dt) {
  for (let i = thorns.length - 1; i >= 0; i--) {
    const th = thorns[i];
    th.t -= dt;
    if (th.state === 'warn') {
      th.sigil.material.opacity = 0.25 + 0.35 * Math.abs(Math.sin(th.t * 18));
      if (th.t <= 0) {
        th.state = 'up';
        th.t = 0.12;
        th.group.visible = true;
        audio.gib(false);
        trauma = Math.max(trauma, 0.15);
      }
      continue;
    }
    if (th.state === 'up') {
      th.group.scale.y = Math.min(1, 1 - th.t / 0.12);
      if (th.t <= 0) { th.state = 'hold'; th.t = 1.1; }
    } else if (th.state === 'hold') {
      if (th.t <= 0) { th.state = 'down'; th.t = 0.35; }
    } else {
      th.group.scale.y = Math.max(0.01, th.t / 0.35);
      if (th.t <= 0) { removeThorn(i); continue; }
    }
    th.sigil.material.opacity = Math.max(0, th.sigil.material.opacity - dt * 2);
    // spike is lethal while up; a good jump (or dash-through timing) clears it
    if (!th.struck && th.state !== 'down'
        && Math.hypot(player.feet.x - th.group.position.x, player.feet.z - th.group.position.z) < 1.1
        && player.feet.y < 1.4) {
      th.struck = true;
      if (playerStruck(th.group.position.x, th.group.position.z, 'thorn', th)) return;
    }
  }
}

function removeThorn(i) {
  const th = thorns[i];
  scene.remove(th.sigil);
  th.sigil.geometry.dispose();
  th.sigil.material.dispose();
  scene.remove(th.group);
  th.sprite.dispose();
  thorns.splice(i, 1);
}

function clearThorns() {
  for (let i = thorns.length - 1; i >= 0; i--) removeThorn(i);
}

function clearPending() {
  for (const p of pending) {
    scene.remove(p.beam);
    p.beam.geometry.dispose();
    p.beam.material.dispose();
  }
  pending.length = 0;
}

function ringSpot(minPlayerDist, draw = rng.next) {
  for (let tries = 0; tries < 12; tries++) {
    const a = draw() * Math.PI * 2;
    const r = ARENA_R * (0.45 + draw() * 0.4);
    _sv.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    if (_sv.distanceTo(player.feet) < minPlayerDist) continue;
    let nearTotem = false;
    for (const e of enemies) {
      if (e.type === 'totem' && Math.hypot(e.pos.x - _sv.x, e.pos.z - _sv.z) < 5) {
        nearTotem = true;
        break;
      }
    }
    if (!nearTotem) return _sv;
  }
  return _sv;
}

function skullCount() {
  let n = 0;
  for (const e of enemies) if (e.type === 'skull') n++;
  return n;
}

function totemCount() {
  let n = 0;
  for (const e of enemies) if (e.type === 'totem') n++;
  return n;
}

function spawnSerpent(ghost = serpentsSpawned % 2 === 1, at = null, ddRules = false) {
  if (!ddRules) announce(ghost ? 'ghostSerpent' : 'serpent', ghost ? 'THE PALE SERPENT' : 'THE SERPENT');
  const p = at ? at.clone() : ringSpot(14).clone();
  p.y = 8;
  audio.roar();
  serpentsSpawned++;
  const s = new Serpent(scene, p, ARENA_R + 5, ghost);
  if (ddRules) {
    // 75 HP and 25 gems across twelve exposed body nodes.
    s.segments.forEach((seg, i) => {
      seg.hp = i === 0 ? 9 : 6;
      seg.gemDrop = i === 0 ? 3 : 2;
    });
  }
  serpents.push(s);
  enemies.push(...s.segments);
}

// ---------------------------------------------- serpent teaser flyby
// ~10s into every run a serpent circles just beyond the grid — harmless,
// untargetable, gone in seconds — foreshadowing the real arrival at 100s.
let flyby = null;
let flybyDone = false;
const FLYBY_SEGS = 8;

function flybyPath(t, a0, out) {
  // 0-2s swoop in from beyond the horizon, 2-9s low orbit, then climb away
  const orbitR = ARENA_R * 1.08;
  let r, y;
  if (t < 2) { r = orbitR + (2 - t) * 14; y = 9 - t * 1.5; }
  else if (t < 9) { r = orbitR; y = 6 + Math.sin(t * 1.4) * 1.5; }
  else { r = orbitR + (t - 9) * 9; y = 6 + (t - 9) * 4; }
  const a = a0 + t * 0.55;
  return out.set(Math.cos(a) * r, y, Math.sin(a) * r);
}

function startFlyby() {
  if (flyby) return;
  announce('serpentTease', 'SOMETHING CIRCLES THE VOID');
  audio.roar();
  const parts = [];
  for (let i = 0; i <= FLYBY_SEGS; i++) {
    const sprite = new VoxelSprite(i === 0 ? MODELS.serpentHead : MODELS.serpent);
    const g = new THREE.Group();
    g.add(sprite.mesh);
    g.position.set(0, -60, 0); // below the void until the path places it
    scene.add(g);
    parts.push({ sprite, g });
  }
  flyby = { parts, trail: [], t: 0, a0: Math.random() * Math.PI * 2 };
}

function endFlyby() {
  if (!flyby) return;
  for (const p of flyby.parts) {
    scene.remove(p.g);
    p.sprite.dispose();
  }
  flyby = null;
}

function updateFlyby(dt) {
  if (!flyby) return;
  const f = flyby;
  f.t += dt;
  flybyPath(f.t, f.a0, _sv);
  f.trail.push({ x: _sv.x, y: _sv.y, z: _sv.z });
  if (f.trail.length > 600) f.trail.shift();
  f.parts[0].g.position.copy(_sv);
  flybyPath(f.t + 0.15, f.a0, _c);
  f.parts[0].g.lookAt(_c);
  f.parts[0].sprite.update(dt);
  // rings chain-follow the head by arc length along the recorded trail
  let idx = f.trail.length - 1;
  let acc = 0;
  for (let i = 1; i < f.parts.length; i++) {
    const target = i * 1.0;
    while (idx > 0 && acc < target) {
      const a = f.trail[idx], b = f.trail[idx - 1];
      acc += Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      idx--;
    }
    const tp = f.trail[idx];
    f.parts[i].g.position.set(tp.x, tp.y, tp.z);
    f.parts[i].g.lookAt(f.parts[i - 1].g.position);
    f.parts[i].sprite.update(dt);
  }
  if (f.t > 14) endFlyby();
}

// ------------------------------------------------ DD-authored spawnset
// PURE is deliberately learnable: the same threats arrive at the same second
// every run. The first 229 seconds mirror DD's early-game structure using the
// closest Hyper Dagger analogs (squid spawner, gem thief, centipede).
const DD_SPAWNSET = [
  [3, 'squid1'], [14, 'squid1'], [19, 'squid1'], [24, 'squid1'],
  [39, 'squid2'], [39, 'spider'],
  [49, 'squid2'], [49, 'squid1'],
  [64, 'squid2'], [64, 'squid1'],
  [79, 'squid2'], [79, 'squid1'],
  [94, 'squid2'], [94, 'squid1'],
  [109, 'squid2'], [114, 'centipede'], [119, 'spider'],
  [134, 'squid2'], [134, 'squid1'],
  [144, 'squid2'], [144, 'squid1'],
  [154, 'squid2'], [154, 'squid1'],
  [164, 'squid2'], [164, 'squid1'],
  [174, 'centipede'], [174, 'spider'], [174, 'spider'], [174, 'spider'],
  [184, 'squid2'], [184, 'squid1'],
  [189, 'squid2'], [189, 'squid1'],
  [199, 'spider'], [199, 'spider'], [199, 'spider'],
  [229, 'squid1'], [229, 'squid1'], [229, 'squid1'],
  [229, 'squid1'], [229, 'squid1'], [229, 'squid1'],
];

function ddEdgeSpot(i) {
  // A fixed golden-angle walk makes simultaneous spawns legible without
  // turning the script into a repeating four-corner pattern.
  const a = i * 2.399963229728653;
  const r = ARENA_R * 0.84;
  return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
}

function spawnDDEntry(kind, index) {
  const at = ddEdgeSpot(index);
  audio.spawn();
  if (kind === 'squid1' || kind === 'squid2') {
    enemies.push(new Totem(scene, at, 20, kind === 'squid1' ? 1 : 2));
  } else if (kind === 'spider') {
    enemies.push(new Spider(scene, at, true));
  } else if (kind === 'centipede') {
    spawnSerpent(false, at, true);
  }
}

function ddDirector() {
  while (pureScriptCursor < DD_SPAWNSET.length &&
      gameTime >= DD_SPAWNSET[pureScriptCursor][0]) {
    const [, kind] = DD_SPAWNSET[pureScriptCursor];
    spawnDDEntry(kind, pureScriptCursor);
    pureScriptCursor++;
    pulseN = pureScriptCursor;
  }
  emitSpawnerWaves(true);
  for (let i = serpents.length - 1; i >= 0; i--) {
    if (!serpents[i].alive) serpents.splice(i, 1);
  }
}

// ---------------------------------------------------- pulse director
// Toko-drop's wave/budget system adapted to continuous time: every ~14s a
// "pulse" fires with a budget that grows over the run (knee at 2.5 min),
// spent on a [key, unlockTime, cost] pool. A deterministic rhythm shapes the
// pulses — every 8th is HEAVY (guaranteed serpent/dread centrepiece), every
// 4th a SPIKE (1.5× budget, favours heavies), every 3rd a SWARM (bodies only,
// tight burst), and a normal pulse right after any intense one runs at half
// budget (the breather). Unlock gates preserve the onboarding debut order.
const PULSE_POOL = [
  // [key, unlockTime, cost]
  ['skulls', 20, 2], // pack of 3 direct chasers — the swarm fodder
  ['watcher', 25, 3],
  ['husk', 35, 5],  // armored grind — teaches 'chew the shell' while it's calm
  ['brute', 45, 3],
  ['spider', 75, 4],
  ['blinker', 90, 3],
  ['serpent', 100, 8],
  ['dread', 120, 6],
];
const PULSE_CAPS = { watcher: 3, blinker: 3, spider: 2, dread: 2, husk: 2 };
const SWARM_KEYS = new Set(['skulls', 'blinker']);
const SPIKE_KEYS = new Set(['brute', 'dread', 'spider', 'husk']);

function pulseKind(n) {
  if (n < 1) return 'normal'; // so pulse 1 isn't judged a post-"spike 0" breather
  if (n % 8 === 0) return 'heavy';
  if (n % 4 === 0) return 'spike';
  if (n >= 3 && n % 3 === 0) return 'swarm';
  return 'normal';
}

function pulseBudget(n, kind) {
  // budget grows with PULSE INDEX, not wall time — the pulse count is the
  // director's own clock, and it keeps daily pick sequences comparable
  // across players (a time-based budget made the same pulse redraw
  // differently depending on when it fired). Knee at pulse 11 ≈ the old
  // 2.5-minute knee at average cadence.
  const base = 3 + Math.min(n, 11) * 0.75 + Math.max(0, n - 11) * 0.3;
  const breather = kind === 'normal' && pulseKind(n - 1) !== 'normal';
  const mod = kind === 'heavy' ? 1.6 : kind === 'spike' ? 1.5
    : kind === 'swarm' ? 1.3 : breather ? 0.5 : 1;
  return base * mod;
}

function enemyCount(type) {
  let n = 0;
  for (const e of enemies) if (e.type === type) n++;
  return n;
}

function pulseEligible([key, unlock]) {
  if (gameTime < unlock) return false;
  if (key === 'serpent') return serpents.length < SERPENT_CAP;
  if (key === 'skulls') return skullCount() <= SKULL_CAP - 3;
  const cap = PULSE_CAPS[key];
  return cap === undefined || enemyCount(key) < cap;
}

/** Telegraphed spawn of one pool pick, `stagger` seconds after the pulse.
 *  `draw` is the pulse's PRNG (seeded per pulse index in daily runs) — the
 *  telegraph callbacks capture it, and staggers are monotonic within a pulse,
 *  so draw order stays deterministic even though spawns resolve later. */
function spawnPick(key, stagger, draw = rng.next) {
  debuted[key] = true;
  const delay = 0.7 + stagger;
  if (key === 'serpent') { spawnSerpent(); return; } // its own sky entrance
  audio.spawn();
  if (key === 'skulls') {
    const at = ringSpot(12, draw).clone();
    telegraph(at, [2.0, 0.15, 0.15], delay, () => {
      const boost = Math.min(6, gameTime * 0.06);
      for (let i = 0; i < 3 && skullCount() < SKULL_CAP; i++) {
        _sv.set(at.x + (draw() - 0.5) * 1.6, 1.1 + draw() * 0.8,
          at.z + (draw() - 0.5) * 1.6);
        enemies.push(gameTime > 60 && draw() < 0.3
          ? new Wraith(scene, _sv, boost) : new Skull(scene, _sv, boost));
      }
    });
  } else if (key === 'watcher') {
    announce('watcher', 'THE WATCHERS');
    const at = ringSpot(12, draw).clone();
    at.y = 2.2;
    telegraph(at, [2.0, 0.15, 0.15], delay, () => enemies.push(new Watcher(scene, at, ARENA_R - 1)));
  } else if (key === 'husk') {
    announce('husk', 'THE HUSKS &mdash; BREAK THE SHELL');
    const at = ringSpot(13, draw).clone();
    telegraph(at, [2.2, 0.18, 0.18], delay + 0.15, () => {
      at.y = 1.35;
      enemies.push(new Husk(scene, at, Math.min(1.2, (gameTime - 30) * 0.008)));
    });
  } else if (key === 'brute') {
    announce('brute', 'THE BRUTES');
    const at = ringSpot(14, draw).clone();
    telegraph(at, [2.0, 0.15, 0.15], delay, () => {
      at.y = 1.25;
      enemies.push(new Brute(scene, at, Math.min(1.5, (gameTime - 40) * 0.01)));
    });
  } else if (key === 'spider') {
    announce('spider', 'THE THIEVES');
    const at = ringSpot(10, draw).clone();
    telegraph(at, [2.0, 0.15, 0.15], delay, () => enemies.push(new Spider(scene, at)));
  } else if (key === 'blinker') {
    announce('blinker', 'THE BLINKERS');
    const at = ringSpot(12, draw).clone();
    at.y = 1.2;
    telegraph(at, [2.0, 0.15, 0.15], delay, () => enemies.push(new Blinker(scene, at, ARENA_R - 1)));
  } else if (key === 'dread') {
    announce('dread', 'THE DREAD SKULL');
    const at = ringSpot(15, draw).clone();
    telegraph(at, [2.6, 0.2, 0.2], delay + 0.2, () => {
      at.y = 1.5;
      enemies.push(new DreadSkull(scene, at, Math.min(4, (gameTime - 110) * 0.008)));
    });
  }
}

// Which pool keys the player has actually MET this run. The rhythm+budget
// lottery can otherwise delay a debut far past its unlock (measured: spiders
// unlock at 75s but first appeared at a median of 139s, watchers as late as
// 139s), which silently breaks the documented one-mechanic-at-a-time
// onboarding — so an undebuted, unlocked type jumps the queue.
let debuted = {};

const lastPulsePicks = []; // debug: {n, kind, picks[]} per pulse, capped

function runPulse(n) {
  const kind = pulseKind(n);
  // daily runs seed a FRESH stream per pulse index, so pulse N's pick
  // sequence is comparable across players regardless of when it fires
  const draw = runKind === 'daily' ? mulberry32(mixSeed(runSeed, n)) : Math.random;
  let budget = pulseBudget(n, kind);
  let stagger = 0;
  const picks = [];
  // DEBUT GUARANTEE: the earliest-unlocked type the player hasn't met yet
  // spawns regardless of this pulse's kind or budget, so unlock times are
  // real introduction times. PULSE_POOL is ordered by unlock, so `find`
  // already yields the right one; it's deterministic (pulse fire times and
  // `debuted` don't depend on random draws), which also makes daily runs
  // MORE comparable, not less.
  const debut = PULSE_POOL.find(e => !debuted[e[0]] && pulseEligible(e));
  if (debut) {
    spawnPick(debut[0], 0, draw);
    budget -= debut[2];
    picks.push(debut[0] + '*'); // starred in the debug log = forced debut
  }
  // heavy pulses open with a guaranteed centrepiece
  if (kind === 'heavy') {
    if (gameTime >= 100 && serpents.length < SERPENT_CAP) { spawnPick('serpent', 0, draw); budget -= 8; picks.push('serpent'); }
    else if (gameTime >= 120 && enemyCount('dread') < PULSE_CAPS.dread) { spawnPick('dread', 0, draw); budget -= 6; picks.push('dread'); }
  }
  for (let guard = 0; guard < 20 && budget > 0.5; guard++) {
    let pool = PULSE_POOL.filter(pulseEligible);
    if (!pool.length) break;
    if (kind === 'swarm') {
      const p = pool.filter(([k]) => SWARM_KEYS.has(k));
      if (p.length) pool = p;
    } else if (kind === 'spike' && draw() < 0.7) {
      const p = pool.filter(([k]) => SPIKE_KEYS.has(k));
      if (p.length) pool = p;
    }
    const [key, , cost] = pool[(draw() * pool.length) | 0];
    if (cost > budget + 1) continue; // too rich for what's left — redraw
    spawnPick(key, stagger, draw);
    budget -= cost;
    picks.push(key);
    stagger += kind === 'swarm' ? 0.12 + draw() * 0.3 : 0.4 + draw() * 0.8;
  }
  lastPulsePicks.push({ n, kind, picks });
  if (lastPulsePicks.length > 20) lastPulsePicks.shift();
}

function emitSpawnerWaves(ddRules = false) {
  for (const e of enemies) {
    if ((e.type !== 'totem' && e.type !== 'leviathan') || !e.emit) continue;
    e.emit = false;
    const m = e.mouthPos(_sv).clone();
    if (ddRules && e.ddTier) {
      const count = e.ddTier === 1 ? 9 : 10;
      for (let i = 0; i < count && skullCount() < SKULL_CAP; i++) {
        const at = m.clone().add(_c.set(
          (Math.random() - 0.5) * 1.6,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 1.6));
        enemies.push(new Skull(scene, at));
      }
      if (skullCount() < SKULL_CAP) {
        const leader = new Wraith(scene, m, e.ddTier === 2 ? 1.5 : 0);
        leader.hp = e.ddTier === 1 ? 5 : 10;
        leader.gemDrop = 1;
        enemies.push(leader);
      }
      audio.spawn();
      continue;
    }
    if (skullCount() >= SKULL_CAP) continue;
    const boost = Math.min(6, gameTime * 0.06);
    const roll = rng.next(); // seeded in daily runs — exhale mix is part of the schedule
    const skull =
      gameTime > 45 && roll < 0.15 ? new Splitter(scene, m, boost) :
      gameTime > 60 && roll < 0.45 ? new Wraith(scene, m, boost) :
      new Skull(scene, m, boost);
    if (skull instanceof Splitter) announce('splitter', 'THE SPLITTERS');
    else if (skull instanceof Wraith) announce('wraith', 'CROWNED SKULLS');
    enemies.push(skull);
    for (let i = 0; i < 4; i++) {
      debris.spawn(m, skull.sprite.randomColor(),
        _sv.clone().set((Math.random() - 0.5) * 4, 2 + Math.random() * 3, (Math.random() - 0.5) * 4),
        0.14, 0.8);
    }
    audio.spawn();
  }
}

function director(dt) {
  if (mode === 'pure') { ddDirector(); return; }
  updatePending(dt);
  if (gameTime >= nextTotemAt && totemCount() < TOTEM_CAP) {
    const interval = Math.max(1.7, 3.4 - gameTime * 0.02);
    const at = ringSpot(12).clone();
    audio.spawn();
    telegraph(at, [2.0, 0.15, 0.15], 0.7, () => enemies.push(new Totem(scene, at, interval)));
    // cadence tightens from every 24s down to every 16s as the run goes on
    nextTotemAt = gameTime + Math.max(16, 24 - gameTime * 0.03);
  }
  // THE REVENANT rises out of the player's own bone-yard — it needs a dense
  // patch of corpses, devours it, and claws up on the spot. No carnage, no
  // revenant: the spawn is gated on the litter field, not just the clock.
  if (gameTime >= nextRevenantAt && enemyCount('revenant') < 3) {
    const spot = litter.densestSpot(45, 4.5);
    if (spot) {
      announce('revenant', 'THE DEAD RISE');
      litter.consume(spot.x, spot.z, 4.5, 160);
      _sv.set(spot.x, 0.6, spot.z);
      audio.spawn();
      telegraph(_sv, [2.2, 0.2, 0.2], 0.7, () => {
        _sv.set(spot.x, -0.6, spot.z);
        audio.rise();
        enemies.push(new Revenant(scene, _sv, Math.min(1.5, (gameTime - 110) * 0.006)));
      });
      nextRevenantAt = gameTime + Math.max(13, 24 - gameTime * 0.02);
    } else {
      nextRevenantAt = gameTime + 5; // no pile yet — look again shortly
    }
  }
  if (gameTime >= nextPulseAt) {
    pulseN++;
    runPulse(pulseN);
    // pulse cadence tightens from ~14s toward a 9s floor over the run
    nextPulseAt = gameTime + Math.max(9, 14 - gameTime * 0.01);
  }
  if (!flybyDone && gameTime >= 10) {
    flybyDone = true;
    startFlyby();
  }
  if (gameTime >= nextThornAt) {
    announce('thorn', 'THORNS BENEATH');
    spawnThorn(player.feet.x, player.feet.z);
    nextThornAt = gameTime + Math.max(6, 12 - gameTime * 0.025);
  }
  if (gameTime >= nextLevAt) {
    if (!enemies.some(e => e.type === 'leviathan')) {
      // the boss always gets its entrance, even on respawns
      announced.leviathan = false;
      announce('leviathan', 'THE LEVIATHAN RISES');
      audio.roar();
      telegraph(new THREE.Vector3(0, 0, 0), [2.6, 0.2, 0.2], 1.2,
        () => enemies.push(new Leviathan(scene, 5)));
    }
    nextLevAt = gameTime + 120;
  }
  emitSpawnerWaves(false);
  for (let i = serpents.length - 1; i >= 0; i--) {
    if (!serpents[i].alive) serpents.splice(i, 1);
  }
}

// ---------------------------------------------------------------- weapon
function levelForGems(n) {
  return n >= LEVEL_GEMS[3] ? 3 : n >= LEVEL_GEMS[2] ? 2 : 1;
}

function setWeaponLevel(lv) {
  if (lv <= weaponLv) return;
  weaponLv = lv;
  applyGauntlet(lv);
  audio.levelup();
  toast(lv === 4 ? 'LEVEL 4 — THE CRIMSON HAND'
    : lv === 3 ? 'LEVEL 3 — RMB HOMING' : `DAGGERS LEVEL ${lv}`);
  trauma = Math.max(trauma, lv === 4 ? 0.5 : 0.3);
}

function onGemsCollected(n) {
  const before = gemCount;
  gemCount += n;
  audio.gem();
  addStyle(n); // hoarding gems mid-fight keeps the meter warm
  const lv = levelForGems(gemCount);
  if (weaponLv < 3) {
    setWeaponLevel(lv);
    // Only gems beyond the 70-gem upgrade become spendable homing ammo.
    homingAmmo += Math.max(0, gemCount - Math.max(before, LEVEL_GEMS[3]));
  } else {
    homingAmmo += n;
  }
  if (weaponLv === 3 && homingAmmo >= 150) {
    homingAmmo -= 150;
    setWeaponLevel(4);
  }
}

// ---------------------------------------------------------------- style
function styleTierIdx(v) {
  for (let i = STYLE_TIERS.length - 1; i > 0; i--) {
    if (v >= STYLE_TIERS[i].min) return i;
  }
  return 0;
}

/** Paint the rank badge + fill bar to match the current meter value. */
function updateStyleHud() {
  const idx = styleTierIdx(styleVal);
  if (idx === 0) { elStyle.style.opacity = '0'; return; }
  const tier = STYLE_TIERS[idx];
  const next = STYLE_TIERS[idx + 1];
  const hi = next ? next.min : STYLE_CAP;
  const frac = Math.max(0, Math.min(1, (styleVal - tier.min) / (hi - tier.min)));
  elStyle.style.opacity = '1';
  elStyleRank.textContent = tier.label;
  elStyleRank.style.color = tier.color;
  elStyleMult.textContent = '×' + (1 + idx * 0.5).toFixed(1);
  elStyleFill.style.width = (frac * 100) + '%';
  elStyleFill.style.background = tier.color;
}

/** Add to the style meter and remember the tier crossings for the recap +
 *  a rank-up flourish (stinger + trauma) so climbing feels like an event. */
function addStyle(amount) {
  if (amount <= 0 || state !== 'playing') return;
  const before = styleTierIdx(styleVal);
  styleVal = Math.min(STYLE_CAP, styleVal + amount);
  const after = styleTierIdx(styleVal);
  if (after > before) {
    if (after > stylePeakIdx) stylePeakIdx = after;
    // only S+ interrupts with a toast/flourish — lower tiers read off the
    // HUD meter so we never clobber an enemy-debut announcement
    if (after >= 5) {
      audio.levelup();
      trauma = Math.max(trauma, 0.2);
      toast(`RANK ${STYLE_TIERS[after].label}`, 900);
    }
  }
}

// ------------------------------------------------------------- aim assist
// Pad aim can't match a mouse on small fast targets, so the reticle gets
// STICKY, not magnetic: near a target the look rate scales down, which makes
// tracking hold. Nothing is ever aimed for you — it amplifies aim, it doesn't
// replace it — and mouse and touch never see it at all.
const AIM_CONE = T.aim.cone;
const AIM_FADE = T.aim.fade;
const AIM_SLOW = T.aim.slow;
const AIM_MAX_D = T.aim.maxDist;
const _aimF = new THREE.Vector3();
const _aimT = new THREE.Vector3();

/** The slowdown the nearest-to-centre target earns, ungated. */
function aimAssistRawK() {
  camera.getWorldDirection(_aimF);
  let best = Infinity;
  for (const e of enemies) {
    e.center(_aimT);
    _aimT.sub(camera.position);
    const d = _aimT.length();
    if (d < 1 || d > AIM_MAX_D) continue;
    const ang = Math.acos(Math.min(1, Math.max(-1, _aimT.dot(_aimF) / d)));
    if (ang < best) best = ang;
  }
  if (best >= AIM_FADE) return 1;
  const t = best <= AIM_CONE ? 1 : (AIM_FADE - best) / (AIM_FADE - AIM_CONE);
  return 1 - (1 - AIM_SLOW) * t;
}

function aimAssistK() {
  if (!opts.aim || !input.gamepad) return 1; // pad only — touch was good as-is
  return aimAssistRawK();
}

// ---------------------------------------------------------------- combat
const _p0 = new THREE.Vector3();
const _c = new THREE.Vector3();
const _seg = new THREE.Vector3();
const _hitDir = new THREE.Vector3();
const _fwd2 = new THREE.Vector3();

function segHitsSphere(p0, p1, c, r) {
  _seg.copy(p1).sub(p0);
  const len2 = _seg.lengthSq();
  let t = 0;
  if (len2 > 0) {
    t = _p0.copy(c).sub(p0).dot(_seg) / len2;
    t = Math.max(0, Math.min(1, t));
  }
  _p0.copy(p0).addScaledVector(_seg, t);
  return _p0.distanceToSquared(c) <= r * r;
}

function fireDagger(spread, speed, homing, damage = 1) {
  camera.getWorldDirection(_hitDir);
  _hitDir.x += (Math.random() - 0.5) * spread * 2;
  _hitDir.y += (Math.random() - 0.5) * spread * 2;
  _hitDir.z += (Math.random() - 0.5) * spread * 2;
  _hitDir.normalize();
  // launch from the gauntlet corner, not the crosshair — with auto-fire on
  // nearly all the time, streaks through screen centre are too distracting
  _p0.copy(camera.position).addScaledVector(_hitDir, 0.85);
  _seg.setFromMatrixColumn(camera.matrixWorld, 0); // camera right
  _p0.addScaledVector(_seg, 0.24 + (Math.random() - 0.5) * T.weapon.originJitter);
  _c.setFromMatrixColumn(camera.matrixWorld, 1); // camera up
  _p0.addScaledVector(_c, -0.26 + (Math.random() - 0.5) * T.weapon.originJitter);
  daggers.fire(_p0, _hitDir, speed, homing, damage);
}

function killEnemy(e, dir) {
  e.alive = false;
  kills += e.score;
  killsByType[e.type] = (killsByType[e.type] || 0) + 1;
  addStyle(STYLE_GAIN[e.type] ?? 3);
  if (mode === 'hyper') lifeT = Math.min(HYPER_CAP, lifeT + e.score); // kills buy time
  e.center(_c);
  debris.burst(e.deathVoxels?.() ?? e.sprite.worldVoxels(), e.sprite.size,
    _hitDir.copy(dir).multiplyScalar(5), e.type === 'skull' ? 1 : 1.4);
  audio.gib(e.type !== 'skull');
  // heavy kills stamp a shockwave ring into the floor, warp the frame, and
  // freeze time for a beat (~50ms at 12% speed) so the impact lands
  if (e.type === 'brute' || e.type === 'dread' || e.type === 'leviathan' || e.isHead) {
    spawnShockwave(_c);
    triggerRipple(e.type === 'leviathan' ? 1 : 0.7);
    hitStop = 0.05;
    buzz(0.7, 0.35, 90);
  }
  trauma = Math.max(trauma, e.type === 'skull' ? 0.18 : 0.35);
  let drops = e.gemDrop ?? GEM_DROPS[e.type] ?? 0;
  if (e.isHead && e.gemDrop === undefined) drops = 2;
  if (e.type === 'spider') drops = 1 + e.stolen; // thieves give it all back
  for (let i = 0; i < drops; i++) gems.spawn(_c);
  if (e.splits) {
    for (let i = 0; i < 3; i++) {
      _seg.set(_c.x + (Math.random() - 0.5) * 1.2, _c.y, _c.z + (Math.random() - 0.5) * 1.2);
      enemies.push(new MiniSkull(scene, _seg, Math.min(6, gameTime * 0.06)));
    }
  }
  if (e.type === 'leviathan') trauma = 1;
  e.remove(scene);
}

/** The other half of DD's gunfeel: a tap dumps a fistful of daggers in a
 *  wide cone at once, then locks the hand out briefly. Burst damage for a
 *  brute in your face, at the cost of your stream. */
function fireShotgun(w) {
  weaponActive = true;
  camera.getWorldDirection(_fwd2);
  for (let i = 0; i < T.weapon.shotgunCount[weaponLv]; i++) {
    fireDagger(T.weapon.shotgunSpread,
      T.weapon.shotgunSpeed * (0.93 + Math.random() * 0.14), w.homing);
  }
  gems.blast(camera.position);
  shotCd = T.weapon.shotgunCd;
  recoil = 0.15;
  hand.flash(1.25);
  fovKick = Math.max(fovKick, 3.5);
  trauma = Math.max(trauma, 0.22);
  if (player.daggerJump(_fwd2)) {
    fovKick = Math.max(fovKick, 7);
    trauma = Math.max(trauma, 0.32);
    buzz(0.65, 0.45, 110);
  }
  audio.shotgun();
  buzz(0.5, 0.3, 90);
}

function fireHomingShot() {
  const count = Math.min(homingAmmo, T.weapon.homingShot[weaponLv] || 0);
  if (count <= 0) return false;
  for (let i = 0; i < count; i++) {
    fireDagger(T.weapon.shotgunSpread * 0.8,
      T.weapon.shotgunSpeed * (0.93 + Math.random() * 0.14), true, T.weapon.homingDamage);
  }
  homingAmmo -= count;
  shotCd = T.weapon.shotgunCd;
  weaponActive = true;
  recoil = 0.13;
  hand.flash(1.4);
  fovKick = Math.max(fovKick, 3.5);
  trauma = Math.max(trauma, 0.2);
  gems.blast(camera.position);
  audio.shotgun();
  return true;
}

function updateCombat(dt) {
  const w = WEAPON[weaponLv];
  weaponActive = false;

  // DD gunfeel: TAP = shotgun burst, HOLD = stream — every dagger manually
  // aimed on desktop and pad. Touch alone keeps the old auto-fire (a thumb
  // can't work two sticks and a trigger; owner's call, 2026-07-31).
  shotCd = Math.max(0, shotCd - dt);
  let streaming;
  if (input.touchMode && !input.gamepad) {
    if (input.consumeFireTap() && shotCd <= 0) fireShotgun(w);
    const mv = input.getMove();
    streaming = input.firing || Math.hypot(mv.x, mv.y) > T.weapon.autoFireMove;
  } else {
    const held = input.firing;
    if (held) {
      fireHeldT += dt;
    } else {
      // a press released before the stream spun up was a TAP → shotgun
      if (fireWasHeld && fireHeldT < T.weapon.streamDelay && shotCd <= 0) fireShotgun(w);
      fireHeldT = 0;
    }
    fireWasHeld = held;
    streaming = held && fireHeldT >= T.weapon.streamDelay;
  }
  if (streaming && shotCd <= 0) {
    weaponActive = true;
    fireTimer -= dt;
    while (fireTimer <= 0) {
      fireTimer += 1 / w.stream;
      fireDagger(FIRE_SPREAD,
        T.weapon.streamSpeed * (0.86 + Math.random() * 0.28), w.homing);
      recoil = Math.min(0.035, recoil + 0.007);
      hand.flash(0.3);
      audio.fire();
    }
  } else {
    fireTimer = 0;
  }

  // LV3+ stores gems as a separate RMB/LT homing weapon. It uses the same
  // tap/hold grammar but consumes one banked dagger per projectile.
  const altHeld = input.altFiring;
  if (altHeld) homingHeldT += dt;
  else {
    if (homingWasHeld && homingHeldT < T.weapon.streamDelay &&
        weaponLv >= 3 && homingAmmo > 0 && shotCd <= 0) fireHomingShot();
    homingHeldT = 0;
  }
  homingWasHeld = altHeld;
  const homingStreaming = altHeld && homingHeldT >= T.weapon.streamDelay &&
    weaponLv >= 3 && homingAmmo > 0;
  if (homingStreaming && shotCd <= 0) {
    weaponActive = true;
    homingFireTimer -= dt;
    while (homingFireTimer <= 0 && homingAmmo > 0) {
      homingFireTimer += 1 / T.weapon.homingStream;
      fireDagger(FIRE_SPREAD, T.weapon.streamSpeed, true, T.weapon.homingDamage);
      homingAmmo--;
      recoil = Math.min(0.04, recoil + 0.008);
      hand.flash(0.45);
      audio.fire();
    }
  } else {
    homingFireTimer = 0;
  }

  daggers.update(dt, enemies);

  // dagger → enemy (segment vs sphere so fast daggers can't tunnel)
  for (let i = daggers.active.length - 1; i >= 0; i--) {
    const d = daggers.active[i];
    for (let j = 0; j < enemies.length; j++) {
      const e = enemies[j];
      if (!e.alive) continue;
      e.center(_c);
      if (!segHitsSphere(d.prev, d.m.position, _c, e.radius)) continue;
      _hitDir.copy(d.vel).normalize();
      if (e.armored) {
        e.group.getWorldDirection(_fwd2);
        if (_hitDir.dot(_fwd2) < 0.15) {
          // head-on hit on a ghost ring: deflected
          audio.clink();
          debris.spawn(d.m.position, e.sprite.randomColor(),
            _seg.set((Math.random() - 0.5) * 6, 2 + Math.random() * 2, (Math.random() - 0.5) * 6),
            0.1, 0.35);
          daggers.recycle(i);
          break;
        }
      }
      e.maxHp ??= e.hp;
      e.hit(d.damage ?? 1, _hitDir);
      // enemies may name their own hit voice (husk plating swallows daggers)
      audio[e.hitSound && audio[e.hitSound] ? e.hitSound : 'hit']();
      spawnSpark(d.m.position, e.hp <= 0);
      // chip real voxels out of the model near the impact — bullet holes.
      // Sized so an enemy is ~85% eroded by its final hit.
      if (e.hp > 0 && e.sprite.chip) {
        const chips = e.sprite.chip(d.m.position,
          Math.ceil(e.sprite.voxels.length / (e.maxHp * 1.2)));
        for (let k = 0; k < chips.length && k < 6; k++) {
          debris.spawn(chips[k].pos, chips[k].color,
            _seg.set(_hitDir.x * 3 + (Math.random() - 0.5) * 4, 1.5 + Math.random() * 3,
              _hitDir.z * 3 + (Math.random() - 0.5) * 4),
            e.sprite.size, 0.9);
        }
        // a hole can sever a whole region (jaw, crown, brow) — anything no
        // longer connected to the body breaks away as one tumbling chunk
        if (chips.length && e.sprite.detachIslands) {
          for (const island of e.sprite.detachIslands()) {
            const stride = Math.max(1, Math.ceil(island.length / 60));
            const cvx = _hitDir.x * 2 + (Math.random() - 0.5) * 3;
            const cvz = _hitDir.z * 2 + (Math.random() - 0.5) * 3;
            const cvy = 2 + Math.random() * 2.5;
            for (let k = 0; k < island.length; k += stride) {
              // shared chunk velocity + a whisper of jitter so it reads as
              // one piece coming off, not a spray
              debris.spawn(island[k].pos, island[k].color,
                _seg.set(cvx + (Math.random() - 0.5), cvy + Math.random(),
                  cvz + (Math.random() - 0.5)),
                e.sprite.size * Math.cbrt(stride), 1.5);
            }
          }
        }
      }
      for (let k = 0; k < 2; k++) {
        debris.spawn(d.m.position, e.sprite.randomColor(),
          _seg.set((Math.random() - 0.5) * 5, 2 + Math.random() * 3, (Math.random() - 0.5) * 5),
          0.12, 0.6);
      }
      // the shell giving way is its own beat — stinger, ripple, shockwave
      if (e.checkCrack?.()) {
        audio.breach();
        triggerRipple(0.55);
        spawnShockwave(_c);
        toast('SHELL BREACHED', 1100);
        trauma = Math.max(trauma, 0.3);
        buzz(0.6, 0.3, 80);
      }
      if (e.hp <= 0) killEnemy(e, _hitDir);
      daggers.recycle(i);
      break;
    }
  }
  for (let j = enemies.length - 1; j >= 0; j--) {
    if (!enemies[j].alive) {
      enemies[j].remove(scene); // no-op after killEnemy; releases debug/edge-path kills
      enemies.splice(j, 1);
    }
  }

  // gems: magnet + collect
  _p0.copy(player.feet);
  _p0.y += 1.1;
  const got = gems.update(dt, _p0, !weaponActive);
  if (got) onGemsCollected(got);

  // enemy → player
  if (mercyT > 0) mercyT -= dt;
  for (const e of enemies) {
    if (e.spawnK < 0.7) continue;
    if (e.type === 'egg') continue; // eggs are targets, not threats
    if (e.type === 'totem') {
      player.pushOut(e.pos.x, e.pos.z, 2.0);
      continue;
    }
    e.center(_c);
    if (_c.distanceTo(_p0) < e.radius + 0.5 || _c.distanceTo(camera.position) < e.radius + 0.4) {
      if (playerStruck(e.pos.x, e.pos.z, e.type, e)) return;
    }
  }

  // orb → player: the dash phases through projectiles (never through bodies)
  for (let i = orbs.active.length - 1; i >= 0; i--) {
    const o = orbs.active[i];
    if (o.m.position.distanceTo(_p0) < 0.72 || o.m.position.distanceTo(camera.position) < 0.62) {
      if (player.dashK > 0) { // stylish dodge — credited once per orb
        if (!o.phased) { o.phased = true; addStyle(4); }
        continue;
      }
      const ox = o.m.position.x, oz = o.m.position.z;
      orbs.recycle(i);
      if (playerStruck(ox, oz, 'orb')) return;
    }
  }
}

/** One enemy/projectile contact. Returns true when the run ended. */
function playerStruck(sx, sz, killerType, killer = null) {
  lastKillerPos.set(sx, 1.2, sz);
  lastKillerRef = killer;
  if (mode !== 'hyper') { lastKiller = killerType; die(); return true; }
  if (mercyT > 0) return false;
  lastKiller = killerType;
  // HYPERDEMON rules: a hit costs time, shoves you clear, grants i-frames
  triggerRipple(0.5);
  buzz(1, 1, 160);
  lifeT -= HYPER_HIT_COST;
  mercyT = 1.2;
  trauma = 1;
  audio.gib(true);
  elVignette.style.opacity = 0.8;
  setTimeout(() => { if (state === 'playing') elVignette.style.opacity = 0; }, 300);
  const dx = player.feet.x - sx, dz = player.feet.z - sz;
  const d = Math.hypot(dx, dz) || 1;
  player.nudge(dx / d * 3, dz / d * 3);
  if (lifeT <= 0) { die(); return true; }
  return false;
}

// ------------------------------------------------------------------ REAP
// The bone-yard is the only resource in the game, and this is how you spend
// it. Standing carnage is simultaneously a THREAT (revenants rise from dense
// piles) and a RESERVE — reaping clears the threat and converts the bones into
// a damaging pulse, but you can only do it where you have already killed, and
// once spent the field is empty when the next serpent lands on you.
// Deliberately has no HUD meter: the resource is the floor, in plain sight.
const REAP_R = T.reap.radius;
const REAP_MIN = T.reap.minBones;
const REAP_COOL = T.reap.cooldown;
let reapCool = 0;

function tryReap() {
  if (reapCool > 0) { audio.clink(); return false; }
  const px = player.feet.x, pz = player.feet.z;
  const taken = litter.consume(px, pz, REAP_R, 900);
  if (taken < REAP_MIN) {
    // nothing worth reaping — give the miss a voice so it doesn't feel broken
    audio.clink();
    return false;
  }
  reapCool = REAP_COOL;
  // power scales with the pile you spent, capped so a huge yard isn't a nuke
  const power = Math.min(1, taken / 300);
  const dmg = 1 + Math.round(power * 5);
  for (const e of enemies) {
    if (!e.alive || e.type === 'totem') continue;
    e.center(_c);
    const d = Math.hypot(_c.x - px, _c.z - pz);
    if (d > REAP_R) continue;
    e.hit(dmg * (1 - d / REAP_R * 0.5), _hitDir.set(_c.x - px, 0, _c.z - pz).normalize());
    if (e.hp <= 0) killEnemy(e, _hitDir);
  }
  debris.shove(px, 0.5, pz, REAP_R, 14);
  spawnShockwave(_sv.set(px, 0, pz));
  triggerRipple(0.8);
  addStyle(Math.round(4 + power * 10));
  audio.reap();
  buzz(0.8, 0.5, 140);
  trauma = Math.max(trauma, 0.45);
  toast(`REAPED ${taken}`, 900);
  return true;
}

// skulls shove each other apart so the swarm doesn't stack into one voxel blob
const SEPARATES = new Set(['skull', 'brute', 'dread', 'husk', 'revenant']);

function separateSkulls() {
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i];
    if (!SEPARATES.has(a.type)) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      const b = enemies[j];
      if (!SEPARATES.has(b.type)) continue;
      const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, dz = b.pos.z - a.pos.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      const min = a.radius + b.radius;
      if (d2 >= min * min || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const push = (min - d) / d * 0.5;
      a.pos.x -= dx * push; a.pos.y -= dy * push; a.pos.z -= dz * push;
      b.pos.x += dx * push; b.pos.y += dy * push; b.pos.z += dz * push;
    }
  }
}

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();

function step(dt) {
  gameTime += dt;
  player.aimAssist = aimAssistK();
  player.update(dt);
  if (player.justDashed) {
    player.justDashed = false;
    audio.dash();
    trauma = Math.max(trauma, 0.15);
  }
  // dashing wades through the carnage — a moving sweep, dt-scaled so the kick
  // is the same at any frame rate, biased along the dash so gibs get shoved
  // ahead and aside rather than blown radially
  if (player.dashK > 0) {
    debris.shove(player.feet.x, player.feet.y + 0.5, player.feet.z,
      2.4, 26 * dt, player.dashDir.x, player.dashDir.z);
    litter.shove(debris, player.feet.x, player.feet.y + 0.5, player.feet.z,
      1.9, 9, player.dashDir.x, player.dashDir.z); // kick bones up as you pass
  }
  if (player.justJumped) {
    player.justJumped = false;
    audio.jump();
  }
  if (player.justBunnyHopped) {
    player.justBunnyHopped = false;
    fovKick = Math.max(fovKick, 2.4);
  }
  player.justDaggerJumped = false;
  if (reapCool > 0) reapCool = Math.max(0, reapCool - dt);
  const reapPressed = input.consumeReap();
  if (mode === 'hyper' && reapPressed) tryReap();
  director(dt);
  for (const e of enemies) {
    e.update(dt, camera.position, gems);
    if (e.type === 'watcher') {
      if (e.warnReq) { e.warnReq = false; audio.warn(); }
      if (e.volley) {
        for (const dir of e.volley) {
          _sv.copy(e.pos).addScaledVector(dir, 1.0);
          orbs.fire(_sv, dir.multiplyScalar(11));
        }
        e.volley = null;
        audio.orb();
      }
    }
    if (e.type === 'blinker' && e.puffReq) {
      for (let k = 0; k < 6; k++) {
        debris.spawn(e.puffReq, e.sprite.randomColor(),
          _sv.set((Math.random() - 0.5) * 6, 1 + Math.random() * 3, (Math.random() - 0.5) * 6),
          0.14, 0.5);
      }
      e.puffReq = null;
      audio.blink();
    }
    if (e.type === 'spider' && e.layEgg) {
      e.layEgg = false;
      _sv.copy(e.pos);
      _sv.y = 0.35;
      enemies.push(new Egg(scene, _sv));
      audio.spawn();
    }
    if (e.type === 'egg' && e.hatch && e.alive) {
      e.alive = false;
      e.remove(scene);
      audio.roar();
      for (let k = 0; k < 2; k++) {
        _sv.set(e.pos.x + (Math.random() - 0.5), 1.2, e.pos.z + (Math.random() - 0.5));
        enemies.push(new Skull(scene, _sv, Math.min(6, gameTime * 0.06)));
      }
    }
    if (e.type === 'totem' && e.ringReq) {
      e.ringReq = false;
      audio.ring();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        _sv.set(e.pos.x + Math.cos(a) * 1.3, 1.15, e.pos.z + Math.sin(a) * 1.3);
        _hitDir.set(Math.cos(a) * 5.5, 0, Math.sin(a) * 5.5);
        orbs.fire(_sv, _hitDir);
      }
    }
    // Leviathan drag: pulls the player in along the floor — dash out
    if (e.type === 'leviathan' && e.alive) {
      if (e.pullStarted) {
        e.pullStarted = false;
        audio.pull();
        trauma = Math.max(trauma, 0.3);
      }
      if (e.pullActive) {
        const dx = e.pos.x - player.feet.x, dz = e.pos.z - player.feet.z;
        const d = Math.hypot(dx, dz);
        if (d > 0.5) player.nudge(dx / d * 7 * dt, dz / d * 7 * dt);
      }
    }
  }
  for (const s of serpents) s.update(dt, camera.position);
  separateSkulls();
  updateShadows();
  updateSparks(dt);
  updateFlyby(dt);
  updateThorns(dt);
  orbs.update(dt, ARENA_R + 6);
  updateCombat(dt);
  debris.update(dt);
  // style meter bleeds when you stop scoring — faster at higher ranks so the
  // top tiers stay fleeting and demand a continuous chain
  // provisional v4.1 soften (was 6 + 0.05v): S-rank was bleeding out between
  // pulse peaks even on good runs — revisit once the run log has real data
  if (styleVal > 0) {
    styleVal = Math.max(0, styleVal - dt * (T.style.bleedBase + styleVal * T.style.bleedScale));
  }
  updateStyleHud();
  // music intensity: swarm density (live threats, not eggs) + run progress +
  // how hard you're chaining right now (the style meter)
  let threats = 0;
  levAlive = false;
  for (const e of enemies) {
    if (e.type !== 'egg' && e.type !== 'totem') threats++;
    if (e.type === 'leviathan') levAlive = true;
  }
  const intensity = Math.min(1,
    threats / 16 * 0.5 + Math.min(gameTime / 150, 1) * 0.25 + (styleVal / STYLE_CAP) * 0.35);
  musicI += (intensity - musicI) * Math.min(1, dt * 3); // smoothed for the floor
  audio.musicUpdate(intensity);
  if (mode === 'hyper' && state === 'playing') {
    lifeT -= dt; // the clock is your life
    if (lifeT <= 0) { lifeT = 0; die(true); }
    elTimer.textContent = lifeT.toFixed(1);
    elTimer.style.color = lifeT < 10 ? '#c81e1e' : '';
    elKills.textContent = `${kills} kills · run ${gameTime.toFixed(1)}s`;
  } else {
    elTimer.textContent = gameTime.toFixed(1);
    elTimer.style.color = '';
    elKills.textContent = `${kills} kills`;
  }
  elGems.textContent = `◆ ${gemCount} · LV ${weaponLv}${weaponLv >= 3 ? ` · HOMING ${homingAmmo}` : ''}`;
}

const _threatForward = new THREE.Vector3();
const _threatTo = new THREE.Vector3();
const _threatInvQ = new THREE.Quaternion();
function updateFeel(dt) {
  // trauma-driven shake + chromatic aberration + FOV kicks (dash, shotgun)
  trauma = Math.max(0, trauma - dt * 1.5);
  const t2 = trauma * trauma;
  if (opts.shake && opts.motion && state === 'playing' && !paused) {
    camera.rotation.z += (Math.random() - 0.5) * t2 * 0.07;
    camera.rotation.x += (Math.random() - 0.5) * t2 * 0.03;
    camera.position.y += (Math.random() - 0.5) * t2 * 0.08;
  }
  chromaPass.uniforms.uAmount.value = 0.0012 + t2 * 0.02;
  // reactive floor: grid thumps on the 138 BPM beat scaled by music intensity,
  // and flushes red when you take trauma (high contrast keeps the grid clean)
  if (state !== 'playing' || paused) musicI = Math.max(0, musicI - dt * 0.8);
  const beat = 1 - ((performance.now() / 1000) * (138 / 60)) % 1;
  floorMat.uniforms.uPulse.value = musicI * (0.25 + 0.75 * beat * beat);
  floorMat.uniforms.uRed.value = opts.contrast ? 0 : t2 * 0.85;
  // Removed from the presentation: speedlines and screen-space ripples made
  // the image busier without communicating anything the weapon/camera did not.
  speedPass.enabled = false;
  rippleT += dt;
  if (rippleT > 0.8) rippleAmp = 0;
  ripplePass.enabled = false;
  // sky ember swells with trauma and while the Leviathan is on the field
  skyMat.uniforms.uEmber.value = t2 * 0.9 + (levAlive ? 0.7 : 0);
  environment.update(dt, { intensity: musicI, trauma: t2, leviathan: levAlive });

  // Nearest off-camera threat drives the peripheral burn. Signed camera-space
  // X biases the glow toward the side the player should turn toward.
  camera.getWorldDirection(_threatForward);
  let rear = 0, rearSide = 0;
  for (const e of enemies) {
    if (!e.alive || e.type === 'egg' || e.type === 'totem') continue;
    _threatTo.set(e.pos.x - camera.position.x, e.pos.y - camera.position.y, e.pos.z - camera.position.z);
    const dist = Math.max(0.01, _threatTo.length());
    _threatTo.multiplyScalar(1 / dist);
    const facing = _threatForward.dot(_threatTo);
    if (facing > 0.15) continue;
    const strength = (0.15 - facing) / 1.15 * Math.max(0, 1 - dist / 28);
    if (strength > rear) {
      rear = strength;
      _threatInvQ.copy(camera.quaternion).invert();
      _threatTo.applyQuaternion(_threatInvQ);
      rearSide = Math.sign(_threatTo.x);
    }
  }
  threatPass.uniforms.uRear.value += (rear - threatPass.uniforms.uRear.value) * Math.min(1, dt * 8);
  threatPass.uniforms.uSide.value += (rearSide - threatPass.uniforms.uSide.value) * Math.min(1, dt * 6);
  fovKick = Math.max(0, fovKick - dt * 18);
  // smear deepens mid-dash — HYPERDEMON smears hardest at speed. dashK decays
  // with the dash itself, so the heavy end is always transient.
  if (afterimage.enabled) {
    afterimage.uniforms['damp'].value = SMEAR_BASE + player.dashK * SMEAR_DASH;
  }
  const fov = opts.fov + (opts.motion ? player.dashK * 9 + player.speedK * 4 + fovKick : 0);
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }
  // The claw snaps back and rolls open on a burst. Stream fire stays a much
  // smaller vibration so the two firing modes read before their audio does.
  recoil = Math.max(0, recoil - dt * 0.28) * Math.exp(-7 * dt);
  const handBob = Math.sin(performance.now() * 0.0017) * 0.005;
  handGroup.position.set(
    HAND_BASE.x + recoil * 0.45,
    HAND_BASE.y + handBob - recoil * 0.28,
    HAND_BASE.z + recoil * 1.65,
  );
  handGroup.rotation.set(
    HAND_BASE.rx - recoil * 2.7,
    HAND_BASE.ry,
    HAND_BASE.rz + recoil * 1.25,
  );
  hand.update(dt);
}

// Gamepad menu navigation: d-pad / left stick moves focus across the overlay
// buttons, A activates (or fires the screen's main action when nothing is
// focused), B/Start resumes from pause, Start pauses mid-run. Focus is a CSS
// class re-applied every frame so menu re-renders can't strand it.
let gfocus = -1;

function menuButtons() {
  return elMsg.style.display === 'block' ? [...elMsg.querySelectorAll('button')] : [];
}

function gamepadMenu() {
  const ui = input.consumeUi();
  const btns = menuButtons();
  if (gfocus >= btns.length) gfocus = btns.length - 1;
  if (ui.down && btns.length) gfocus = (gfocus + 1) % btns.length;
  if (ui.up && btns.length) gfocus = gfocus <= 0 ? btns.length - 1 : gfocus - 1;
  btns.forEach((b, i) => b.classList.toggle('gfocus', i === gfocus));
  const resume = state === 'playing' && paused && (ui.b || ui.start);
  if (ui.a && gfocus >= 0 && btns[gfocus]) {
    btns[gfocus].dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  } else if ((ui.a && gfocus < 0) || ui.start || resume) {
    // ui.start here covers "press Start to play" from menu/tips/death —
    // console muscle memory; while paused the resume branch means the same
    // main action: start / retry / resume — same path as a screen tap.
    // (Note: gamepad presses don't grant browser user-activation, so audio
    // stays silent until the first real click/touch — unavoidable.)
    gfocus = -1;
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  }
}

let sphereFrame = 0;
let sphereWorldCaptures = 0;
let sphereThreatCaptures = 0;
function updateSphereProjection() {
  camera.updateMatrixWorld();
  _sphereCamRot.setFromMatrix4(camera.matrixWorld);
  if (!spherePass.enabled) return;
  const every = PERF_TIERS[perfTier].sphereEvery;
  sphereFrame++;
  sphereThreatCamera.position.copy(camera.position);
  sphereWorldCamera.position.copy(camera.position);
  // Enemy-only capture tracks more often; the arena is mostly static and can
  // update at a slower cadence while camera rotation remains shader-side.
  if (sphereFrame === 1 || sphereFrame % every === 0) {
    sphereThreatCamera.update(renderer, scene);
    sphereThreatCaptures++;
  }
  if (sphereFrame === 1 || sphereFrame % (every * 3) === 0) {
    sphereWorldCamera.update(renderer, scene);
    sphereWorldCaptures++;
  }
}

function animate() {
  requestAnimationFrame(animate);
  const rawDt = clock.getDelta(); // unclamped — the governor needs real frame cost
  const dt = Math.min(rawDt, 0.05);
  perfGovern(performance.now(), rawDt * 1000);
  input.pollGamepad();
  if (state !== 'playing' || paused) {
    gamepadMenu();
  } else if (input.consumeUi().start) {
    // Start pauses mid-run (pointer-locked mice can't reach the ⏸ button)
    if (document.pointerLockElement) document.exitPointerLock(); // triggers showPause
    else showPause();
  }
  // sky bands accelerate with the music (warped clock keeps phase continuous)
  skyMat.uniforms.uTime.value += dt * (1 + musicI * 1.8);
  dust.rotation.y += dt * 0.012;
  if (state === 'playing' && !paused) {
    // heavy-kill hit-stop: a beat at 12% speed so the impact registers
    const ts = hitStop > 0 ? 0.12 : 1;
    if (hitStop > 0) hitStop -= rawDt;
    step(dt * opts.speed * ts);
  } else if (state !== 'playing') {
    // death slow-mo: debris + daggers keep tumbling at quarter speed
    slowmo = Math.max(0, slowmo - dt * 0.8);
    const eff = dt * (1 - 0.75 * slowmo);
    debris.update(eff);
    daggers.update(eff);
    updateSparks(eff); // in-flight sparks/shockwaves finish out in slow-mo
    // killer-focus swing (shortest-path yaw so it never spins the long way)
    if (deathCam && state === 'dead') {
      deathCam.t -= dt;
      const k = Math.min(1, dt * 4);
      const dy = ((deathCam.yaw - camera.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      camera.rotation.y += dy * k;
      camera.rotation.x += (deathCam.pitch - camera.rotation.x) * k;
      if (deathCam.t <= 0) deathCam = null;
    }
  }
  updateFeel(dt);
  updateSphereProjection();
  composer.render();
  uiCtx.clearRect(0, 0, ui.width, ui.height);
  if (state === 'playing' && !paused) input.drawTouchUI(uiCtx);
}

applyOpts();
showMenu();
animate();

// tiny debug handle (console tinkering + automated smoke tests)
window.__hd = {
  enemies, player, debris, litter, daggers, gems, serpents, orbs, thorns, audio,
  debug: {
    addGems(n) { onGemsCollected(n); },
    addStyle(n) { addStyle(n); },
    getStyle() { return { styleVal, tier: STYLE_TIERS[styleTierIdx(styleVal)].label, peak: STYLE_TIERS[stylePeakIdx].label }; },
    spawnSerpent() { spawnSerpent(); },
    spawnSpider() { enemies.push(new Spider(scene, ringSpot(8).clone())); },
    spawnWatcher() { const p = ringSpot(8).clone(); p.y = 2.2; enemies.push(new Watcher(scene, p, ARENA_R - 1)); },
    spawnSplitter() { const p = ringSpot(8).clone(); p.y = 1.2; enemies.push(new Splitter(scene, p)); },
    spawnThorn() { spawnThorn(player.feet.x, player.feet.z); },
    spawnBlinker() { const p = ringSpot(8).clone(); p.y = 1.2; enemies.push(new Blinker(scene, p, ARENA_R - 1)); },
    reap() { return tryReap(); },
    getReap() { return { cool: +reapCool.toFixed(2), bones: litter.count }; },
    getTuning() { return T; },
    getGun() {
      return {
        shotCd: +shotCd.toFixed(2), heldT: +fireHeldT.toFixed(2),
        homing: homingAmmo, homingHeldT: +homingHeldT.toFixed(2), lv: weaponLv,
      };
    },
    getMovement() {
      return {
        speed: +player.horizontalSpeed.toFixed(3),
        vx: +player.velocity.x.toFixed(3), vz: +player.velocity.z.toFixed(3),
        vy: +player.vy.toFixed(3), grounded: player.feet.y <= 0.001,
        hops: player.hopCount, daggerJumps: player.daggerJumpCount,
        daggerCharges: player.daggerJumpsLeft,
      };
    },
    getImpact() {
      return {
        w: sparkTex.image.width, h: sparkTex.image.height,
        nearest: sparkTex.magFilter === THREE.NearestFilter && sparkTex.minFilter === THREE.NearestFilter,
        mipmaps: sparkTex.generateMipmaps,
      };
    },
    getRaster() {
      const map = floorMat.uniforms.map.value;
      const gl = renderer.getContext();
      return {
        pixelRatio: renderer.getPixelRatio(),
        buffer: { w: gl.drawingBufferWidth, h: gl.drawingBufferHeight },
        viewport: { w: window.innerWidth, h: window.innerHeight },
        scaling: getComputedStyle(canvas).imageRendering,
        crosshair: getComputedStyle(elCross).display,
        floor: {
          w: map.image.width, h: map.image.height,
          nearest: map.magFilter === THREE.NearestFilter && map.minFilter === THREE.NearestFilter,
          mipmaps: map.generateMipmaps,
        },
      };
    },
    getWeaponView() {
      hand.mesh.updateWorldMatrix(true, false);
      _sv.setFromMatrixPosition(hand.mesh.matrixWorld).project(camera);
      return {
        recoil: +recoil.toFixed(3),
        x: +handGroup.position.x.toFixed(3), y: +handGroup.position.y.toFixed(3), z: +handGroup.position.z.toFixed(3),
        rx: +handGroup.rotation.x.toFixed(3), ry: +handGroup.rotation.y.toFixed(3), rz: +handGroup.rotation.z.toFixed(3),
        count: hand.mesh.count, visible: hand.mesh.visible,
        layers: { camera: camera.layers.mask, mesh: hand.mesh.layers.mask },
        screen: { x: +_sv.x.toFixed(3), y: +_sv.y.toFixed(3), z: +_sv.z.toFixed(3) },
      };
    },
    getLook() {
      const e = enemies.find(x => x.alive && x.sprite);
      return {
        mode: opts.look, hullMode: getHullMode(),
        sample: e ? { hull: !!e.sprite.hull, cubes: e.sprite.mesh.count, tris: e.sprite.hull ? e.sprite.hull.geometry.getAttribute('position').count / 3 : 0 } : null,
        hand: !!hand.hull,
      };
    },
    // aim: raw() reports the assist a stick WOULD get right now, ignoring the
    // "is a stick even in use" gate, so tests can probe the falloff curve
    // without faking a gamepad
    getAim() {
      return {
        assist: +player.aimAssist.toFixed(3),
        raw: +aimAssistRawK().toFixed(3),
        ramp: +player.turnRamp.toFixed(3),
        on: opts.aim,
      };
    },
    spawnRevenant() {
      const p = ringSpot(8).clone(); p.y = -0.6;
      const r = new Revenant(scene, p); enemies.push(r); return r;
    },
    spawnHusk() { const p = ringSpot(9).clone(); p.y = 1.35; const h = new Husk(scene, p); enemies.push(h); return h; },
    spawnSkull() { const p = ringSpot(8).clone(); p.y = 1.2; const s = new Skull(scene, p); enemies.push(s); return s; },
    getSkullMouth() {
      const s = enemies.find(e => e.alive && e.type === 'skull' && e.jawPivot);
      if (s) {
        s.jaw.mesh.updateWorldMatrix(true, false);
        _sv.setFromMatrixPosition(s.jaw.mesh.matrixWorld).project(camera);
        return {
          animated: true, parts: s.parts.length,
          open: +s.jawOpen.toFixed(3), angle: +s.jawPivot.rotation.x.toFixed(3),
          phase: +s.jawT.toFixed(3),
          jaw: {
            alive: s.jaw.aliveCount, cubes: s.jaw.mesh.count, hull: !!s.jaw.hull,
            tris: s.jaw.hull ? s.jaw.hull.geometry.getAttribute('position')?.count / 3 : 0,
            screen: { x: +_sv.x.toFixed(3), y: +_sv.y.toFixed(3), z: +_sv.z.toFixed(3) },
          },
        };
      }
      return { animated: false, parts: 0, open: 0, angle: 0, phase: 0 };
    },
    spawnDread() { const p = ringSpot(8).clone(); p.y = 1.5; enemies.push(new DreadSkull(scene, p)); },
    spawnGhostSerpent() { spawnSerpent(true); },
    spawnLeviathan() { enemies.push(new Leviathan(scene, 5)); },
    setLife(n) { lifeT = n; },
    setTime(t) { gameTime = t; },
    die() { if (state === 'playing') die(false); },
    report() { return runReport(); },
    setRunKind(k) { runKind = k; localStorage.setItem('hyperDaggerRunKind', k); },
    setDate(s) { dateOverride = s; },
    setBoardEndpoint(u) { BOARD_ENDPOINT = u || ''; },
    getBoardEndpoint() { return BOARD_ENDPOINT; },
    getRunInfo() { return { runKind, runSeed, runDate, mode, pulseN }; },
    lastPulsePicks,
    getDailyTable() { return readDailyTable(); },
    pulse(n) { runPulse(n ?? ++pulseN); },
    setOpt(k, v) { opts[k] = v; saveOpts(); applyOpts(); },
    getFx() { return { smear: afterimage.enabled, chroma: chromaPass.enabled, edge: edgePass.enabled, sphere: spherePass.enabled, threat: threatPass.enabled, rearSignal: threatPass.uniforms.uRear.value, edgeAmt: edgePass.uniforms.uAmt.value, damp: afterimage.uniforms['damp'].value, gridGlow: floorMat.uniforms.uGlow.value, fov: camera.fov, uRed: floorMat.uniforms.uRed.value, bloomStrength: bloom.strength }; },
    getProjection() { return { enabled: spherePass.enabled, worldCaptures: sphereWorldCaptures, threatCaptures: sphereThreatCaptures, worldSize: sphereWorldTarget.width, threatSize: sphereThreatTarget.width }; },
    getEnvironment() { return environment.getState(); },
    getVfx() { return { shadows: shadows.count, sparks: sparks.length, speedOn: speedPass.enabled, rippleT, rippleOn: ripplePass.enabled, ember: skyMat.uniforms.uEmber.value }; },
    /** Everything that could leak over a long run: pool occupancy, scene graph
     *  size, and GPU resource counts. A survival game lives or dies on the
     *  30-minute run, so these must plateau rather than climb. */
    getHealth() {
      return {
        t: +gameTime.toFixed(1),
        enemies: enemies.length, serpents: serpents.length,
        debris: debris.items.length, litter: litter.count,
        daggers: daggers.active.length, orbs: orbs.active.length,
        gems: gems.active.length, thorns: thorns.length,
        pending: pending.length, sparks: sparks.length,
        sceneChildren: scene.children.length,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? -1,
      };
    },
    // renderer.info auto-resets on every internal composer pass, so reading it
    // directly only ever sees the last fullscreen quad. Accumulate one whole
    // frame instead: animate() re-registers its rAF first, so a callback queued
    // here runs right after the next full composer render.
    countDrawCalls() {
      return new Promise(resolve => {
        renderer.info.autoReset = false;
        renderer.info.reset();
        requestAnimationFrame(() => {
          const calls = renderer.info.render.calls;
          renderer.info.autoReset = true;
          resolve(calls);
        });
      });
    },
    ripple(amp) { triggerRipple(amp ?? 1); },
    flyby() { startFlyby(); },
    getFlyby() { return flyby ? { t: flyby.t, parts: flyby.parts.length } : null; },
    setDetail(n) { setVoxelDetail(n); },
    getDetail() { return getVoxelDetail(); },
    getStyleSample() {
      // bone (must never shift) + the accent surfaces — for style smoke checks
      const bone = hand.voxels.find(v => v.key === 'G');
      const eye = enemies.find(e => e.sprite?.voxels.some(v => v.key === 'R'))
        ?.sprite.voxels.find(v => v.key === 'R');
      return {
        style: opts.style,
        bone: [bone.color.r, bone.color.g, bone.color.b],
        eye: eye ? [eye.color.r, eye.color.g, eye.color.b] : null,
        orb: [orbs.mat.color.r, orbs.mat.color.g, orbs.mat.color.b],
        gem: [gems.mesh.material.color.r, gems.mesh.material.color.g, gems.mesh.material.color.b],
        floor: floorMat.uniforms.uAccent.value.toArray(),
        ember: skyMat.uniforms.uEmberCol.value.toArray(),
      };
    },
    buzz(s, w, ms) { buzz(s ?? 1, w ?? 1, ms ?? 100); },
    forceFrameTime(ms) { forcedFrameTime = ms; },
    getPerfTier() {
      return {
        tier: perfTier, ema: frameEMA, mode: opts.perf,
        smear: afterimage.enabled, chroma: chromaPass.enabled, bloom: bloom.enabled,
        pixelRatio: renderer.getPixelRatio(), debrisSoftCap: debris.softCap,
      };
    },
    setPerfTier(t) { setPerfTier(t); },
    perfTuning,
    pulseInfo(n) { const k = pulseKind(n ?? pulseN); return { kind: k, budget: pulseBudget(n ?? pulseN, k) }; },
    getState() { return { mode, lifeT, gameTime, mercyT, state, weaponLv, gemCount, homingAmmo }; },
    getSchedule() {
      return {
        nextTotemAt, nextThornAt, nextLevAt, nextPulseAt, pulseN,
        pureScriptCursor,
        nextPureAt: DD_SPAWNSET[pureScriptCursor]?.[0] ?? null,
      };
    },
  },
};
