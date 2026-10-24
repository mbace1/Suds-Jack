// specimen.js — the gel that got you, alive on the card (owner, 2026-10-23:
// "the options and death menu also used to have enemy screen" — 1.x's death
// screen carried a live portrait of its killer, v212). The death screen and
// the pause menu show the last gel to land a hit; this draws that gel, the
// game's own body and look in a throwaway world, into the box the card
// leaves for it, after the main frame, through a scissor: nothing is copied
// and the gel is exactly what was on the floor (classic or SDF).
//
// Every number is TUNING.specimen.
import * as THREE from 'three/webgpu';
import { createWorld, api } from '../sim/world.js?v=41';

export class Specimen {
  constructor(T, actors, environment) {
    this.cache = new Map();
    this._box = new THREE.Box3(); this._b2 = new THREE.Box3(); this._c = new THREE.Vector3(); this._s = new THREE.Vector3(); this._d = new THREE.Vector3();
    this.T = T; this.actors = actors; this.el = null; this.kind = null; this.view = null; this.g = null;
    const S = (this.S = T.specimen);
    this.scene = new THREE.Scene();
    if (environment) { this.scene.environment = environment; this.scene.environmentIntensity = T.env.intensity; }
    this.scene.add(new THREE.AmbientLight(0xffffff, T.light.ambient));
    const sun = new THREE.DirectionalLight(0xffffff, T.light.sun.intensity);
    sun.position.set(...T.light.sun.position);
    this.scene.add(sun);
    this.camera = new THREE.PerspectiveCamera(S.fov, 1, 0.1, 100);
  }

  // show `kind` in `el` (a box the card made), or nothing
  show(kind, el) {
    this.hide();
    if (!kind || !el || !this.T.species[kind]) return;
    // a real body, stepped in a world of its own, so a look that reads the
    // body's state (a ribbon's path, a worm's segments) has it to read
    const w = createWorld({ seed: 1, mode: 'arcade' });
    w.director = { step() {} };
    const g = api.spawn(w, kind, 0, 0, {});
    g.faceX = 0; g.faceZ = 1; g.t = 99;
    if (g.s && 'up' in g.s) g.s.up = 1;          // a worm, standing up out of the floor
    if (g.s && 'y' in g.s) g.s.y = 0;
    this.w = w; this.g = g; this.kind = kind; this.el = el;
    // one body per species and style, made once (a pause after a pause reuses it)
    const key = `${kind}:${this.actors.gels}`;
    let v = this.cache.get(key);
    if (!v) this.cache.set(key, (v = this.actors._makeGel(kind)));
    this.view = v;
    v.r = g.r;
    this.scene.add(v.root);
    this.root = v.root;
    const r = g.r, S = this.S;
    this.camera.position.set(0, r * S.up, r * S.dist);
    this.camera.lookAt(0, r * S.look, 0);
  }

  hide() {
    if (this.root) this.scene.remove(this.root);
    this.root = this.view = this.g = this.el = this.kind = this.cv = null;
  }

  // after the main frame. The card is DOM over the canvas, so the gel cannot
  // be drawn on the canvas under it: it is rendered into a small target and
  // read back into a 2D canvas inside the box, `hz` times a second
  render(renderer, time) {
    const el = this.el, v = this.view, g = this.g;
    if (!el || !v || !el.isConnected) return;
    // a readback that never came back (a lost frame) does not stop the next
    if (this.busy && time - this.busyT < 0.5) return;
    if (time - (this.lastT ?? -1) < 1 / this.S.hz) return;
    const box = el.getBoundingClientRect();
    if (box.width < 4 || box.height < 4) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(box.width * dpr), H = Math.round(box.height * dpr);
    if (!this.cv || this.cv.parentNode !== el) {
      this.cv = document.createElement('canvas');
      this.cv.style.cssText = 'width:100%;height:100%;display:block';
      el.replaceChildren(this.cv);
    }
    if (this.cv.width !== W || this.cv.height !== H) { this.cv.width = W; this.cv.height = H; this.img = null; }
    if (!this.rt || this.rt.width !== W || this.rt.height !== H) {
      this.rt?.dispose();
      this.rt = new THREE.RenderTarget(W, H);
      this.rt.texture.colorSpace = THREE.SRGBColorSpace;
    }
    this.lastT = time;
    // turn slowly so its shape reads, and breathe as it does on the floor
    v.root.rotation.y = Math.sin(time * this.S.turnHz) * this.S.turn;
    v.squash.scale.set(1, 1, 1);
    try {
      if (!v.own) this.actors._shape(v, time, 1, 0);
      v.L.update?.(v, g, this.w, time, 1);
    } catch { /* a look that needs more of the run than a lone body has: drawn as built */ }
    v.root.position.set(0, 0, 0);
    // frame what is there, whatever its shape (a strip, a worm, a dome)
    v.root.updateMatrixWorld(true);
    const b = this._box.makeEmpty();
    v.root.traverseVisible((o) => { if (o.isMesh && o.geometry) { o.geometry.boundingBox ?? o.geometry.computeBoundingBox(); b.union(this._b2.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld)); } });
    if (b.isEmpty()) b.setFromCenterAndSize(this._c.set(0, 0.4, 0), this._s.setScalar(1));
    const c = b.getCenter(this._c), sz = b.getSize(this._s), R = Math.max(0.3, Math.max(sz.x, sz.y, sz.z) / 2);
    const S = this.S, dir = this._d.set(0, S.up, S.dist).normalize();
    const fit = R + (R / Math.tan((S.fov * Math.PI) / 360)) * S.margin;
    this.camera.position.copy(c).addScaledVector(dir, fit);
    this.camera.lookAt(c);
    this.camera.aspect = W / H; this.camera.updateProjectionMatrix();
    const prev = renderer.getRenderTarget(), cc = renderer.getClearColor(new THREE.Color()), ca = renderer.getClearAlpha();
    renderer.setClearColor(this.S.back, 1);
    renderer.setRenderTarget(this.rt);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(prev);
    renderer.setClearColor(cc, ca);
    this.busy = true; this.busyT = time; this.reads = (this.reads ?? 0) + 1;
    const flip = !renderer.backend?.isWebGPUBackend;   // WebGL reads rows bottom-up
    renderer.readRenderTargetPixelsAsync(this.rt, 0, 0, W, H).then((px) => {
      this.busy = false; this.done = (this.done ?? 0) + 1;
      if (!this.cv || this.el !== el) return;
      const ctx = this.cv.getContext('2d');
      if (!this.img) this.img = ctx.createImageData(W, H);
      // WebGPU pads each row of a readback to 256 bytes: read the stride off the length
      const d = this.img.data, row = W * 4, padded = Math.ceil(row / 256) * 256;
      const stride = padded !== row && px.length >= padded * (H - 1) + row ? padded : row;
      for (let y = 0; y < H; y++) { const at = (flip ? H - 1 - y : y) * stride; d.set(px.subarray(at, at + row), y * row); }
      ctx.putImageData(this.img, 0, 0);
    }, () => { this.busy = false; });
  }
}
