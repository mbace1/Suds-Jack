import * as THREE from 'three';

const TAU = Math.PI * 2;
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

function emissive(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    toneMapped: false,
  });
}

/**
 * Original environment kit built for Hyper Dagger's near-parity art target:
 * concentric abyss machinery, ritual pylons, orbiting shrapnel, broken gates
 * and a spherical threat lattice. Nothing is imported from another game — the
 * family resemblance comes from silhouette density, scale and motion.
 */
export class HyperEnvironment {
  constructor(scene, arenaR) {
    this.scene = scene;
    this.arenaR = arenaR;
    this.time = 0;
    this.group = new THREE.Group();
    this.group.name = 'hyper-environment';
    scene.add(this.group);

    this.darkMat = emissive(new THREE.Color().setRGB(0.035, 0.04, 0.055), 0.88);
    this.accentMat = emissive(new THREE.Color().setRGB(1.9, 0.18, 0.28), 0.34);
    this.hotMat = emissive(new THREE.Color().setRGB(2.8, 0.36, 0.46), 0.72);
    this.ghostMat = new THREE.LineBasicMaterial({
      color: new THREE.Color().setRGB(1.2, 0.18, 0.32),
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      toneMapped: false,
    });

    this.rifts = [];
    for (let i = 0; i < 5; i++) {
      const r = arenaR + 2.4 + i * 4.8;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.035 + i * 0.012, 4, 128),
        i % 2 ? this.accentMat : this.darkMat,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.42 - i * 0.16;
      ring.userData.phase = i * 1.37;
      this.group.add(ring);
      this.rifts.push(ring);
    }

    // Twelve five-sided ritual pylons: one instanced draw, huge silhouettes.
    const pylonGeo = new THREE.ConeGeometry(1.25, 9, 5, 1, true);
    this.pylons = new THREE.InstancedMesh(pylonGeo, this.darkMat, 12);
    this.pylons.name = 'bone-pylons';
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + 0.17;
      const r = arenaR + 12 + (i % 3) * 4.5;
      _p.set(Math.cos(a) * r, 3.1 + (i % 2) * 1.8, Math.sin(a) * r);
      _q.setFromEuler(_e.set(0, -a + Math.PI / 2, (i % 2 ? 1 : -1) * 0.08));
      _s.set(0.75 + (i % 4) * 0.1, 0.8 + (i % 3) * 0.22, 0.75);
      _m.compose(_p, _q, _s);
      this.pylons.setMatrixAt(i, _m);
    }
    this.group.add(this.pylons);

    // Split horns crown every pylon; two instances per tower.
    const hornGeo = new THREE.ConeGeometry(0.34, 5.2, 4, 1, true);
    this.horns = new THREE.InstancedMesh(hornGeo, this.accentMat, 24);
    this.horns.name = 'pylon-horns';
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + 0.17;
      const r = arenaR + 12 + (i % 3) * 4.5;
      for (let side = -1; side <= 1; side += 2) {
        const n = i * 2 + (side > 0 ? 1 : 0);
        _p.set(Math.cos(a) * r + Math.cos(a + Math.PI / 2) * side * 0.72,
          8.0 + (i % 3) * 1.8, Math.sin(a) * r + Math.sin(a + Math.PI / 2) * side * 0.72);
        _q.setFromEuler(_e.set(side * 0.42, -a, side * 0.22));
        _s.setScalar(0.72 + (i % 2) * 0.13);
        _m.compose(_p, _q, _s);
        this.horns.setMatrixAt(n, _m);
      }
    }
    this.group.add(this.horns);

    // A debris halo makes the void spatial instead of a flat sky texture.
    const shardGeo = new THREE.TetrahedronGeometry(0.44, 0);
    this.shards = new THREE.InstancedMesh(shardGeo, this.accentMat, 96);
    this.shards.name = 'void-shards';
    this.shardData = [];
    for (let i = 0; i < 96; i++) {
      const a = i * 2.399963 + (i % 7) * 0.07;
      const r = arenaR + 7 + (i % 17) * 2.1;
      const y = 1.2 + ((i * 13) % 31) * 0.48;
      const scale = 0.35 + (i % 9) * 0.11;
      this.shardData.push({ a, r, y, scale, spin: 0.04 + (i % 5) * 0.012 });
      _p.set(Math.cos(a) * r, y, Math.sin(a) * r);
      _q.setFromEuler(_e.set(a * 0.7, a, a * 1.3));
      _s.set(scale * 0.5, scale * 2.4, scale);
      _m.compose(_p, _q, _s);
      this.shards.setMatrixAt(i, _m);
    }
    this.group.add(this.shards);

    // Four broken gates frame the horizon and make turning readable.
    this.arches = [];
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + Math.PI / 4;
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(8.5, 0.13, 5, 48, Math.PI * 1.42),
        this.accentMat,
      );
      arch.position.set(Math.cos(a) * (arenaR + 25), 6.2, Math.sin(a) * (arenaR + 25));
      arch.rotation.set(0, -a + Math.PI / 2, -Math.PI * 0.21);
      arch.userData.phase = i * Math.PI / 2;
      this.group.add(arch);
      this.arches.push(arch);
    }

    const latticeGeo = new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(92, 2), 18);
    this.lattice = new THREE.LineSegments(latticeGeo, this.ghostMat);
    this.lattice.name = 'threat-lattice';
    this.lattice.position.y = 8;
    this.group.add(this.lattice);

    this.assets = { rifts: 5, pylons: 12, horns: 24, shards: 96, arches: 4, lattice: 1 };
  }

  setQuality(tier) {
    this.shards.visible = tier <= 2;
    this.horns.visible = tier <= 3;
    this.arches.forEach(a => { a.visible = tier <= 2; });
    this.lattice.visible = tier <= 1;
  }

  setAccent(color) {
    const c = color.clone();
    const peak = Math.max(c.r, c.g, c.b, 1e-5);
    this.accentMat.color.copy(c).multiplyScalar(1.9 / peak);
    this.hotMat.color.copy(c).multiplyScalar(2.8 / peak);
    this.ghostMat.color.copy(c).multiplyScalar(1.2 / peak);
  }

  update(dt, { intensity = 0, trauma = 0, leviathan = false } = {}) {
    this.time += dt;
    const danger = Math.min(1, trauma * trauma + (leviathan ? 0.55 : 0) + intensity * 0.22);
    this.group.rotation.y += dt * (0.004 + intensity * 0.018);
    this.rifts.forEach((ring, i) => {
      ring.position.y = -0.42 - i * 0.16 + Math.sin(this.time * (0.4 + i * 0.05) + ring.userData.phase) * 0.06;
      ring.scale.setScalar(1 + Math.sin(this.time * 0.65 + i) * 0.0025 * (1 + intensity));
    });
    this.arches.forEach((arch, i) => {
      arch.rotation.z = -Math.PI * 0.21 + Math.sin(this.time * 0.17 + arch.userData.phase) * 0.04;
      arch.scale.setScalar(1 + danger * 0.025);
    });
    this.lattice.rotation.y -= dt * (0.006 + intensity * 0.025);
    this.lattice.rotation.x = Math.sin(this.time * 0.07) * 0.08;
    this.ghostMat.opacity = 0.08 + intensity * 0.08 + danger * 0.08;
    this.accentMat.opacity = 0.24 + intensity * 0.14 + danger * 0.18;

    if (this.shards.visible) {
      for (let i = 0; i < this.shardData.length; i++) {
        const d = this.shardData[i];
        const a = d.a + this.time * d.spin;
        _p.set(Math.cos(a) * d.r, d.y + Math.sin(this.time * 0.7 + i) * 0.35, Math.sin(a) * d.r);
        _q.setFromEuler(_e.set(a * 0.7 + this.time * 0.11, a, a * 1.3 - this.time * 0.08));
        _s.set(d.scale * 0.5, d.scale * (2.4 + danger), d.scale);
        _m.compose(_p, _q, _s);
        this.shards.setMatrixAt(i, _m);
      }
      this.shards.instanceMatrix.needsUpdate = true;
    }
  }

  getState() {
    return {
      ...this.assets,
      visibleShards: this.shards.visible ? this.shards.count : 0,
      lattice: this.lattice.visible,
      groupChildren: this.group.children.length,
    };
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse(o => o.geometry?.dispose?.());
    for (const m of [this.darkMat, this.accentMat, this.hotMat, this.ghostMat]) m.dispose();
  }
}
