import * as THREE from 'three';

/**
 * v26 reset: the arena needs negative space, not a theme-park backdrop.
 * One dim horizon ring is retained for orientation. Everything else belongs
 * to enemies, projectiles or the floor—the things the player can act on.
 */
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
    };
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
      groupChildren: 1,
    };
  }

  dispose() {
    this.scene.remove(this.group);
    this.horizon.geometry.dispose();
    this.horizonMat.dispose();
  }
}
