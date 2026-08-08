// js/specimen.js — a small, self-contained "one enemy, up close" view.
//
// Built for the v212 contextual feedback panel: when the death screen asks you
// about the thing that just killed you, it shows you the thing. Kept separate
// from the pause-menu enemy tester (designer.js) because that one is wired to
// menu state, HIT/KILL buttons and live CFG editing; this is a passive portrait
// that any screen can mount and forget.
//
// Usage:
//   const view = createSpecimen({ width: 220, height: 170 });
//   el.appendChild(view.canvas);
//   view.show(EnemyType.FLIT);   // spawn / respawn the subject
//   view.start();                // begins its own rAF loop
//   view.dispose();              // ALWAYS call when the host screen closes
//
// v216 (enemy lab rebuild): the lab renders through this module too, so the
// portrait and the lab can never drift apart. Lab-only options, all inert for
// the death-screen portrait:
//   roam: true        — the specimen keeps its real wander instead of being
//                       recentred like a portrait, in designer-tester bounds
//   onFrame(s, dt)    — per-frame hook; when provided, the specimen's queued
//                       FX (chunks/_hitChunks) are left for the host to drain
//   .resize(w, h)     — live viewport resize (the lab is fullscreen)
//   .hit() / .kill()  — poke the subject through the REAL damage path
//   .specimen()       — the live Enemy, for info readouts
import * as THREE from 'three';
import { CFG, Enemy, GOO_TIME } from './enemy.js?v=175';

export function createSpecimen({ width = 220, height = 170, bg = 0x07071a,
                                 roam = false, onFrame = null } = {}) {
  const canvas = document.createElement('canvas');
  // The flag build has no THREE.WebGLRenderer export, so follow the main
  // renderer's kind the way designer.js does (v191/v192).
  const isGpu = typeof THREE.WebGPURenderer === 'function';
  const renderer = isGpu
    ? new THREE.WebGPURenderer({ canvas, antialias: true, alpha: true })
    : new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(width, height, false);
  canvas.style.cssText = `width:${width}px;height:${height}px;display:block;border-radius:10px;`;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const sun = new THREE.DirectionalLight(0xffffff, 1.35);
  sun.position.set(6, 16, 9);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 40);

  const state = {
    specimen: null, type: null, t: 0, running: false, last: 0,
    ready: !isGpu, raf: 0, dead: false,
  };
  if (isGpu) renderer.init().then(() => { state.ready = true; });

  // A fake player for the specimen to face; it orbits slowly so the body turns
  // and shows itself off rather than staring down the lens.
  const ghost = { x: 2.6, z: 0 };

  function show(type) {
    if (state.dead) return;
    if (state.specimen) state.specimen.removeFrom(scene);
    state.type = type;
    state.specimen = new Enemy(scene, type, roam ? 2 : 0, 0, 1, 1);
    state.specimen.hp = 9999;          // a portrait never dies mid-question
    // Frame the body: bigger radius, further back.
    const r = CFG[type]?.radius ?? 0.6;
    camera.position.set(0, 1.5 + r * 1.2, 3.4 + r * 3.4);
    camera.lookAt(0, Math.min(0.9, 0.35 + r * 0.5), 0);
  }

  function loop(ts) {
    if (!state.running || state.dead) return;
    state.raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (ts - state.last) / 1000 || 0.016);
    state.last = ts;
    state.t += dt;
    GOO_TIME.value += dt;              // keep the goo wobble alive while paused
    ghost.x = Math.cos(state.t * 0.6) * 3.0;
    ghost.z = Math.sin(state.t * 0.6) * 3.0;
    const s = state.specimen;
    if (s) {
      // stubBullets: firing behaviours no-op safely in a portrait
      if (s.alive) s.update(dt, ghost, { spawnDir() {} }, roam ? 11 : 6, roam ? 7 : 6);
      s.updateDeath(dt);
      if (onFrame) onFrame(s, dt);       // the host drains chunks itself
      else {
        if (s.chunks) s.chunks.length = 0;
        if (s._hitChunks) s._hitChunks.length = 0;
      }
      if (!roam) {
        // keep it centred: this is a portrait, not a chase
        s.position.x *= 0.86;
        s.position.z *= 0.86;
      }
    }
    if (state.ready) renderer.render(scene, camera);
  }

  return {
    canvas,
    scene,
    camera,   // v216: the lab frames its own wider stage
    show,
    specimen: () => state.specimen,
    resize(w, h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    // Both go through the REAL damage path, so wobble, tear and death FX are
    // exactly the shipped ones — the entire point of the lab rebuild.
    hit() {
      const s = state.specimen;
      if (s && s.alive) s.hit(s.position.x, s.position.z);
    },
    kill() {
      const s = state.specimen;
      if (s && s.alive) { s.hp = 1; s.hit(s.position.x, s.position.z); }
    },
    start() {
      if (state.running || state.dead) return;
      state.running = true;
      state.last = performance.now();
      state.raf = requestAnimationFrame(loop);
    },
    stop() {
      state.running = false;
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = 0;
    },
    dispose() {
      this.stop();
      state.dead = true;
      if (state.specimen) { state.specimen.removeFrom(scene); state.specimen = null; }
      try { renderer.dispose(); } catch (_) {}
    },
  };
}
