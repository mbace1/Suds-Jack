import * as THREE from 'three';
import { toLambert } from './meshassets.js?v=70';

/**
 * THE BACKDROP — the owner's Meshy environment pieces, placed OUTSIDE the
 * play disc as silhouettes lit by the asset rig. Nothing here collides,
 * nothing takes damage, nothing knows about the fight; it is what the arena
 * is standing in. v26 emptied the environment to one horizon line on
 * purpose ("the fight owns the frame"), and that stays the default: an
 * `env` block in assets/manifest.json is what puts anything back, so the
 * minimal look is one deleted key away.
 *
 *   "env": {
 *     "floor":  { "file": "env/floor.png", "repeat": 10 },
 *     "pieces": [ { "file": "env/gate.glb", "at": [0, -38], "height": 16, "yaw": 0 }, … ]
 *   }
 *
 *   at      [x, z] in world units — keep |at| > ARENA_R or it is in the fight
 *   height  world height the piece is scaled to
 *   yaw     radians about y; tilt about x; lift raises the base off the floor
 *   tint    multiplies the baked albedo (env.tint applies to every piece first)
 *   lift    scalar brightness multiplier — a piece whose bake is near-black
 *           (the mountain) is lost against the void without it
 *
 * Every piece is fail-soft: a missing file logs one warning and the horizon
 * line is still there.
 */
export class Backdrop {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'backdrop';
    scene.add(this.group);
    this.pieces = [];
    this.floorTex = null;
    this.ready = null;
  }

  /** Read the manifest's env block and place everything it names. Returns a
   *  promise resolving to { pieces, floor } — the floor texture, if any, is
   *  handed back for the caller to put on its own floor material. */
  load(manifestUrl) {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('assets') === '0') return { pieces: 0, floor: null };
      let env = null;
      try {
        const r = await fetch(manifestUrl);
        env = r.ok ? (await r.json()).env : null;
      } catch { env = null; }
      if (!env) return { pieces: 0, floor: null };
      const base = new URL(manifestUrl, location.href);
      const out = { pieces: 0, floor: null };

      if (env.floor?.file) {
        try {
          const tex = await new THREE.TextureLoader().loadAsync(new URL(env.floor.file, base).href + '?v=' + (env.floor.v || 1));
          tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
          tex.magFilter = tex.minFilter = THREE.NearestFilter; // the plates are chunky on purpose
          tex.generateMipmaps = false;
          tex.colorSpace = THREE.SRGBColorSpace;
          this.floorTex = tex;
          out.floor = { tex, repeat: env.floor.repeat ?? 10 };
        } catch (e) { console.warn('[backdrop] floor texture', e?.message ?? e); }
      }

      const pieces = Array.isArray(env.pieces) ? env.pieces : [];
      if (!pieces.length) return out;
      let GLTFLoader;
      try { ({ GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')); }
      catch (e) { console.warn('[backdrop] GLTFLoader unavailable', e); return out; }
      const loader = new GLTFLoader();
      const cache = new Map(); // one fetch per file, many placements
      for (const cfg of pieces) {
        try {
          if (!cache.has(cfg.file)) cache.set(cfg.file, loader.loadAsync(new URL(cfg.file, base).href + '?v=' + (cfg.v || 1)));
          const src = (await cache.get(cfg.file)).scene;
          const root = src.clone(true);
          root.rotation.set(cfg.tilt || 0, cfg.yaw || 0, 0);
          root.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(root);
          const h = Math.max(1e-6, box.max.y - box.min.y);
          root.scale.multiplyScalar((cfg.height || 10) / h);
          root.updateMatrixWorld(true);
          box.setFromObject(root);
          const c = box.getCenter(new THREE.Vector3());
          // base on the floor plane at `at`, centred in x/z
          root.position.set((cfg.at?.[0] ?? 0) - c.x, -box.min.y + (cfg.lift || 0), (cfg.at?.[1] ?? 0) - c.z);
          toLambert(root);
          const gtint = env.tint ? new THREE.Color(env.tint) : null;
          const tint = cfg.tint ? new THREE.Color(cfg.tint) : null;
          const lift = cfg.lift ?? env.lift ?? 1;
          root.traverse(o => {
            if (!o.isMesh) return;
            o.layers.enable(2); // lit by the asset rig, like the skins
            if (gtint) o.material.color.multiply(gtint);
            if (tint) o.material.color.multiply(tint);
            if (lift !== 1) o.material.color.multiplyScalar(lift);
            o.frustumCulled = true;
          });
          this.group.add(root);
          this.pieces.push({ cfg, root });
          out.pieces++;
        } catch (e) { console.warn('[backdrop]', cfg.file, e?.message ?? e); }
      }
      return out;
    })();
    return this.ready;
  }

  getState() {
    return { pieces: this.pieces.map(p => ({ file: p.cfg.file, at: p.cfg.at, height: p.cfg.height })), floor: !!this.floorTex };
  }

  dispose() {
    this.scene.remove(this.group);
    for (const { root } of this.pieces) root.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose?.(); } });
    this.pieces.length = 0;
    this.floorTex?.dispose();
  }
}
