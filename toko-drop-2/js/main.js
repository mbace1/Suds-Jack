// main.js — boot, the loop, and (later) states and input wiring.
//
// One renderer path: WebGPURenderer, which falls back to WebGL 2 by itself
// when the device has no WebGPU. `?webgl` forces the fallback, so both paths
// can be checked on any device. The HUD label says which one is running.
import * as THREE from 'three/webgpu';
import { TUNING } from './tuning.js?v=1';
import { buildDriveway } from './render/driveway.js?v=1';
import { fitCamera } from './render/view.js?v=1';

const T = TUNING;
const params = new URLSearchParams(location.search);
const stage = document.getElementById('stage');

// three reports its own failures (a shader that will not compile on this GPU,
// a validation error, a lost device) through console.error and carries on,
// so on a phone they would be a black or frozen screen with no message.
// Same output as three's default, plus the fault box.
THREE.setConsoleFunction((level, message, ...rest) => {
  const trace = rest[0];
  if (trace && trace.isStackTrace) console[level](trace.getError(message));
  else console[level](message, ...rest);
  if (level === 'error') window.__fault?.(message);
});

// The page's own near-black follows the tuned clear colour once we are up.
const voidHex = '#' + new THREE.Color(T.render.clearColor).getHexString();
document.documentElement.style.setProperty('--void', voidHex);
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', voidHex);

const renderer = new THREE.WebGPURenderer({ antialias: true, forceWebGL: params.has('webgl') });
renderer.setPixelRatio(Math.min(devicePixelRatio, T.render.maxPixelRatio));
stage.appendChild(renderer.domElement);
await renderer.init();

const backend = renderer.backend.isWebGPUBackend ? 'webgpu' : 'webgl2';
document.getElementById('backend').textContent = ` · ${backend}`;

const scene = new THREE.Scene();
scene.background = new THREE.Color(T.render.clearColor);
const driveway = buildDriveway(T);
scene.add(driveway.group);
const camera = new THREE.PerspectiveCamera();

function resize() {
  const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
  renderer.setSize(w, h, false);
  fitCamera(camera, driveway.arena, w / h, T.camera);
}
new ResizeObserver(resize).observe(stage);
resize();

const debug = {
  THREE, renderer, scene, camera, backend,
  arena: driveway.arena, poolCentre: driveway.poolCentre,
  frames: 0, ready: false,
};
window.__toko = debug;

renderer.setAnimationLoop(() => {
  renderer.render(scene, camera);
  debug.frames++;
});
debug.ready = true;
