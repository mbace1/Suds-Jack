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
  { file: 'hand.glb',     angle: 2.30, r: 41, y: -1.4, h: 15, dim: 0.60, tilt: 0.00 },
  { file: 'gate.glb',     angle: 5.05, r: 52, y: -0.8, h: 20, dim: 0.52, tilt: 0.00 },
  { file: 'colossus.glb', angle: 0.62, r: 38, y:  0.4, h:  7, dim: 0.62, tilt: 0.10 },
  { file: 'mountain.glb', angle: 3.75, r: 47, y: -9.5, h: 17, dim: 0.50, tilt: 0.00 },
];

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
    };

    this.monumentMats = [];
    this._loadMonuments();
  }

  /**
   * Monuments load lazily and are allowed to never arrive: a failed fetch, a
   * missing file or a browser without webp leaves the void exactly as v26 had
   * it. Nothing downstream asks whether they loaded.
   */
  _loadMonuments() {
    const loader = new GLTFLoader();
    for (const m of MONUMENTS) {
      loader.load(`assets/env/${m.file}`, (gltf) => {
        const model = gltf.scene;

        // No lights in this renderer: a standard material would render black.
        // Keep the baked albedo, drop everything that wants a light.
        model.traverse((o) => {
          if (!o.isMesh) return;
          const src = o.material;
          const mat = new THREE.MeshBasicMaterial({
            map: src.map || null,
            color: src.map ? 0xffffff : (src.color ? src.color.clone() : new THREE.Color(0x8a8a8a)),
            fog: true,
            toneMapped: true,
          });
          // Pull the whole monument down toward the horizon ring's value so it
          // reads as void, not scenery. Bone-white albedo sits near the 0.78
          // bloom threshold; dimming also keeps it from blooming out there.
          mat.color.multiplyScalar(m.dim);
          o.material = mat;
          o.frustumCulled = true;
          this.monumentMats.push({ mat, dim: m.dim });
          src.dispose?.();
        });

        // Normalise: the exporter's scale and origin are arbitrary, so fit to
        // a declared world height and stand the piece on its own base.
        const bb = new THREE.Box3().setFromObject(model);
        const size = bb.getSize(new THREE.Vector3());
        const s = m.h / (size.y || 1);
        model.scale.setScalar(s);
        model.position.set(
          -(bb.min.x + size.x / 2) * s,
          -bb.min.y * s,
          -(bb.min.z + size.z / 2) * s,
        );

        const pivot = new THREE.Group();
        pivot.add(model);
        pivot.position.set(Math.cos(m.angle) * m.r, m.y, Math.sin(m.angle) * m.r);
        // Face the arena centre, so each piece shows the side Meshy actually
        // reconstructed rather than the side it had to invent.
        pivot.rotation.y = -m.angle + Math.PI / 2;
        pivot.rotation.z = m.tilt;
        pivot.name = `monument-${m.file.replace('.glb', '')}`;
        this.group.add(pivot);
        this.assets.monuments++;
      }, undefined, () => { /* the void keeps its emptiness */ });
    }
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
