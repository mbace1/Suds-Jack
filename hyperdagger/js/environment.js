import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * v26 reset: the arena needs negative space, not a theme-park backdrop.
 * One dim horizon ring is retained for orientation. Everything else belongs
 * to enemies, projectiles or the floor—the things the player can act on.
 *
 * v4.33 adds MONUMENTS, and does it without taking that back. The v26 rule
 * was about the *play field*: nothing the player could mistake for cover, and
 * nothing competing with the fight for attention. So these sit strictly
 * beyond the rim (r ≥ 38, arena is 26), are dimmed to roughly the horizon
 * ring's value, and are deliberately few. The scene fog (24→72) does the rest
 * of the work: a monument is a silhouette dissolving into the void, not a
 * backdrop. Nothing here is ever collided against or spawned near.
 *
 * They are also the first mesh assets in this game. Two rules follow from the
 * renderer having NO LIGHTS AT ALL: every imported material must become
 * MeshBasicMaterial (a MeshStandardMaterial with no light renders pure black),
 * and the baked albedo is the only shading there is — which is why the concepts
 * were generated under flat studio light in the first place.
 */

// Where each monument stands. Angles are spread so the horizon never reads as
// a ring of props; radius keeps every one of them inside the fog's 72u reach
// but well outside the 26u arena.
const MONUMENTS = [
  { file: 'hand.glb',     angle: 2.30, r: 46, y: -1.4, h: 11, dim: 0.55, tilt: 0.00 },
  { file: 'gate.glb',     angle: 5.05, r: 56, y: -0.8, h: 15, dim: 0.48, tilt: 0.00 },
  { file: 'colossus.glb', angle: 0.62, r: 42, y:  0.3, h:  5.5, dim: 0.58, tilt: 0.10 },
  { file: 'mountain.glb', angle: 3.75, r: 52, y: -8.5, h: 13, dim: 0.46, tilt: 0.00 },
];

// v33: the obelisk ring — ONE asset, six stands. Clones share geometry and
// one material, so the whole ring costs a single texture and six draw calls.
// Angles thread the gaps between the monuments; heights and leans vary so it
// reads as ruins, not landscaping.
const OBELISKS = [
  { angle: 1.32, r: 48, h:  8.0, lean: 0.06 },
  { angle: 1.88, r: 53, h:  6.5, lean: -0.09 },
  { angle: 2.95, r: 50, h:  9.0, lean: 0.03 },
  { angle: 4.38, r: 47, h:  6.0, lean: -0.05 },
  { angle: 5.68, r: 51, h:  7.5, lean: 0.11 },
  { angle: 0.06, r: 54, h:  7.0, lean: -0.03 },
];

// The dais is the one piece allowed inside the rim, because it is FLOOR, not
// scenery: sunk to ankle height at the arena centre, where the Leviathan
// spawns — the seat it rises through. Nothing collides with it and it is too
// low to hide anything behind. Dimmed far below the monuments: bone-white at
// monument brightness turned the centre into a bright splat that both fought
// the fight for attention and camouflaged bone-white skulls flying over it —
// at 0.22 it reads as a carved shadow in the floor, which is what floor is.
const DAIS = { file: 'dais.glb', d: 9.5, top: 0.14, dim: 0.22 };

export class HyperEnvironment {
  constructor(scene, arenaR) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'minimal-environment';
    scene.add(this.group);

    this.horizonMat = new THREE.MeshBasicMaterial({
      color: 0x30292c,
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      fog: true,
      toneMapped: true,
    });
    this.horizon = new THREE.Mesh(
      new THREE.TorusGeometry(arenaR + 2.2, 0.025, 3, 128),
      this.horizonMat,
    );
    this.horizon.name = 'horizon-line';
    this.horizon.rotation.x = Math.PI / 2;
    this.horizon.position.y = -0.36;
    this.group.add(this.horizon);

    this.assets = {
      horizon: 1,
      rifts: 0,
      pylons: 0,
      horns: 0,
      shards: 0,
      arches: 0,
      lattice: 0,
      monuments: 0,
      obelisks: 0,
      dais: 0,
    };

    this.monumentMats = [];
    // v24 (owner's eye test): the monuments are SET DRESSING, not arena
    // furniture — in a minimalist arena shooter the enemies are the focus,
    // and stone scenery in the fight's sightlines read as clutter. So they
    // stand only while you are NOT fighting: menu and death screen, where
    // atmosphere is free. The dais stays always — it is floor, not scenery.
    this.combat = false;
    this._loadAll();
  }

  /** true while a run is live: monuments and obelisks step off the stage. */
  setCombat(active) {
    this.combat = active;
    this.group.traverse((o) => {
      if (o.name?.startsWith('monument-')) o.visible = !active;
    });
  }

  /**
   * Everything loads lazily and is allowed to never arrive: a failed fetch, a
   * missing file or a browser without webp leaves the void exactly as v26 had
   * it. Nothing downstream asks whether any of it loaded.
   */
  _loadAll() {
    const loader = new GLTFLoader();

    for (const m of MONUMENTS) {
      this._loadGLB(loader, m.file, m.dim, (model, size) => {
        this._fit(model, size, m.h / size.y);
        const pivot = new THREE.Group();
        pivot.add(model);
        pivot.position.set(Math.cos(m.angle) * m.r, m.y, Math.sin(m.angle) * m.r);
        // Face the arena centre, so each piece shows the side Meshy actually
        // reconstructed rather than the side it had to invent.
        pivot.rotation.y = -m.angle + Math.PI / 2;
        pivot.rotation.z = m.tilt;
        pivot.name = `monument-${m.file.replace('.glb', '')}`;
        pivot.visible = !this.combat;   // a run may already be live when this lands
        this.group.add(pivot);
        this.assets.monuments++;
      });
    }

    // one obelisk asset → six stands; clones share geometry and material
    this._loadGLB(loader, 'obelisk.glb', 0.55, (model, size) => {
      for (const o of OBELISKS) {
        const inst = model.clone();
        this._fit(inst, size, o.h / size.y);
        const pivot = new THREE.Group();
        pivot.add(inst);
        pivot.position.set(Math.cos(o.angle) * o.r, -0.4, Math.sin(o.angle) * o.r);
        pivot.rotation.y = -o.angle + Math.PI / 2;
        pivot.rotation.z = o.lean;
        pivot.name = 'monument-obelisk';
        pivot.visible = !this.combat;
        this.group.add(pivot);
        this.assets.obelisks++;
      }
    });

    // the dais: floor, not scenery — sunk to ankle height under the spawn seat
    this._loadGLB(loader, DAIS.file, DAIS.dim, (model, size) => {
      this._fit(model, size, DAIS.d / Math.max(size.x, size.z)); // fit by footprint
      const bb = new THREE.Box3().setFromObject(model);
      model.position.y -= bb.max.y - DAIS.top;   // sink until only the top shows
      model.name = 'dais';
      this.group.add(model);
      this.assets.dais++;
    });
  }

  _loadGLB(loader, file, dim, place) {
    loader.load(`assets/env/${file}`, (gltf) => {
      const model = gltf.scene;
      // No lights in this renderer: a standard material would render black.
      // Keep the baked albedo, drop everything that wants a light. One
      // material per FILE (not per clone) — nothing here ever flashes.
      model.traverse((o) => {
        if (!o.isMesh) return;
        const src = o.material;
        const mat = new THREE.MeshBasicMaterial({
          map: src.map || null,
          color: src.map ? 0xffffff : (src.color ? src.color.clone() : new THREE.Color(0x8a8a8a)),
          fog: true,
          toneMapped: true,
        });
        // Pull the piece down toward the horizon ring's value so it reads as
        // void, not scenery — and stays under the 0.78 bloom threshold.
        mat.color.multiplyScalar(dim);
        o.material = mat;
        o.frustumCulled = true;
        this.monumentMats.push({ mat, dim });
        src.dispose?.();
      });
      const bb = new THREE.Box3().setFromObject(model);
      const size = bb.getSize(new THREE.Vector3());
      model.userData.bb = bb;
      place(model, size);
    }, undefined, () => { /* the void keeps its emptiness */ });
  }

  // scale to fit and stand the piece on its own base, centred on x/z
  _fit(model, size, s) {
    const bb = model.userData.bb;
    model.scale.setScalar(s);
    model.position.set(
      -(bb.min.x + size.x / 2) * s,
      -bb.min.y * s,
      -(bb.min.z + size.z / 2) * s,
    );
  }

  setQuality() {}

  setAccent(color) {
    const c = color.clone();
    const peak = Math.max(c.r, c.g, c.b, 1e-5);
    this.horizonMat.color.copy(c).multiplyScalar(0.24 / peak);
  }

  update(_dt, { intensity = 0 } = {}) {
    // Keep the background still. A tiny visibility lift preserves the horizon
    // during dense fights without making it another reactive effect.
    this.horizonMat.opacity = 0.14 + Math.min(1, intensity) * 0.02;
  }

  getState() {
    return {
      ...this.assets,
      visibleShards: 0,
      groupChildren: this.group.children.length,
    };
  }

  dispose() {
    this.scene.remove(this.group);
    this.horizon.geometry.dispose();
    this.horizonMat.dispose();
    this.group.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      o.material.map?.dispose();
      o.material.dispose();
    });
  }
}
