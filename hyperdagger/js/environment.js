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

    this.horizonMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      uniforms: {
        uColor: { value: new THREE.Color(0.85, 0.12, 0.04) },
        uOpacity: { value: 0.55 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uTime;
        varying vec2 vUv;
        void main() {
          float band = pow(1.0 - abs(vUv.y - 0.5) * 2.0, 1.35);
          float breathe = 0.82 + 0.18 * sin(uTime * 0.65 + vUv.x * 26.0);
          float a = band * uOpacity * breathe;
          gl_FragColor = vec4(uColor * a, a);
        }`,
    });
    this.horizon = new THREE.Mesh(
      new THREE.TorusGeometry(arenaR + 2.2, 0.055, 6, 160),
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

  setRadius(arenaR) {
    this.horizon.geometry.dispose();
    this.horizon.geometry = new THREE.TorusGeometry(arenaR + 1.1, 0.055, 6, 160);
    this.horizon.rotation.x = Math.PI / 2;
    this.horizon.position.y = -0.36;
  }

  setQuality() {}

  setAccent(color) {
    const c = color.clone();
    const peak = Math.max(c.r, c.g, c.b, 1e-5);
    this.horizonMat.uniforms.uColor.value.copy(c).multiplyScalar(1.15 / peak);
  }

  update(dt, { intensity = 0 } = {}) {
    this.horizonMat.uniforms.uTime.value += dt;
    this.horizonMat.uniforms.uOpacity.value = 0.42 + Math.min(1, intensity) * 0.2;
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
