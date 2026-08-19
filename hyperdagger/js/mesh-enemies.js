import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const KIND_URL = {
  skull: new URL('../models/enemies/skull.glb', import.meta.url).href,
  spider: new URL('../models/enemies/spider.glb', import.meta.url).href,
  totem: new URL('../models/enemies/totem.glb', import.meta.url).href,
};

export const MESH_FOR_TYPE = {
  skull: 'skull', dread: 'skull', brute: 'skull',
  spider: 'spider', totem: 'totem',
};

const templates = new Map();
let loading = null;

export function preloadMeshEnemies() {
  if (loading) return loading;
  loading = (async () => {
    const loader = new GLTFLoader();
    await Promise.all(Object.entries(KIND_URL).map(async ([kind, url]) => {
      try {
        const gltf = await loader.loadAsync(url);
        const root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 0.001);
        const target = kind === 'totem' ? 2.6 : kind === 'spider' ? 1.5 : 1.15;
        root.scale.multiplyScalar(target / maxDim);
        root.updateMatrixWorld(true);
        const box2 = new THREE.Box3().setFromObject(root);
        const c = box2.getCenter(new THREE.Vector3());
        root.position.x -= c.x;
        root.position.z -= c.z;
        root.position.y -= box2.min.y;
        root.traverse(o => {
          if (!o.isMesh) return;
          o.layers.enable(2);
          o.material = new THREE.MeshBasicMaterial({
            color: kind === 'spider' ? 0xc4b8a8 : 0xe8dcc8,
          });
          o.userData.baseColor = o.material.color.clone();
        });
        templates.set(kind, root);
      } catch (e) {
        console.warn('[mesh-enemies]', kind, e);
      }
    }));
  })();
  return loading;
}

export function cloneMeshEnemy(kind) {
  const t = templates.get(kind);
  if (!t) return null;
  const c = t.clone(true);
  c.traverse(o => {
    if (o.isMesh && o.material) {
      o.material = o.material.clone();
      o.userData.baseColor = o.material.color.clone();
    }
    o.layers?.enable(2);
  });
  return c;
}

export function flashMeshRoot(root, k = 1.8) {
  if (!root) return;
  root.traverse(o => {
    if (o.isMesh && o.material?.color) {
      o.material.color.setRGB(Math.min(1, 0.55 * k), Math.min(1, 0.18 * k), Math.min(1, 0.12 * k));
    }
  });
  root.userData.flashT = 0.14;
}

export function updateMeshRoot(root, dt) {
  if (!root || root.userData.flashT == null) return;
  root.userData.flashT -= dt;
  if (root.userData.flashT > 0) return;
  root.userData.flashT = null;
  root.traverse(o => {
    if (o.isMesh && o.userData.baseColor) o.material.color.copy(o.userData.baseColor);
  });
}
