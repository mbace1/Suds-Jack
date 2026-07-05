import * as THREE from 'three';

// ── Transient VFX manager ─────────────────────────────────────────────────────
// Each effect is { meshes:[], update(dt) -> alive }. Geometry created per
// effect is disposed when it dies; shard bursts share cached geometry.

const _tetra = new THREE.TetrahedronGeometry(0.09);
const _shard = new THREE.BoxGeometry(0.16, 0.16, 0.05);

function addMat(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  });
}

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.live = [];
  }

  _push(fx) {
    for (const m of fx.meshes) this.scene.add(m);
    this.live.push(fx);
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const fx = this.live[i];
      if (!fx.update(dt)) {
        for (const m of fx.meshes) {
          this.scene.remove(m);
          if (fx.ownGeo) m.geometry?.dispose();
          m.material?.dispose();
        }
        this.live.splice(i, 1);
      }
    }
  }

  // Sector flash showing a melee swing's actual hit area.
  slashArc(pos, yaw, range, arcDeg, color) {
    const w = (arcDeg * Math.PI) / 180;
    const geo = new THREE.RingGeometry(range * 0.35, range, 20, 1, -w / 2, w);
    const mesh = new THREE.Mesh(geo, addMat(color, 0.55));
    mesh.rotation.x = -Math.PI / 2;
    const grp = new THREE.Group();
    grp.add(mesh);
    grp.position.set(pos.x, 1.1, pos.z);
    grp.rotation.y = yaw - Math.PI / 2;
    grp.scale.setScalar(0.65);
    let t = 0;
    return this._push({
      meshes: [grp],
      ownGeo: false,
      update: (dt) => {
        t += dt;
        const k = t / 0.18;
        grp.scale.setScalar(0.65 + k * 0.4);
        mesh.material.opacity = 0.55 * (1 - k);
        if (k >= 1) { geo.dispose(); mesh.material.dispose(); return false; }
        return true;
      },
    });
  }

  // Ground ring: telegraph (grow over dur) or shockwave (expand + fade fast).
  ring(pos, radius, dur, color, shock = false) {
    const geo = new THREE.RingGeometry(0.82, 1, 40);
    const mesh = new THREE.Mesh(geo, addMat(color, shock ? 0.8 : 0.4));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, 0.06, pos.z);
    mesh.scale.setScalar(0.2);
    let t = 0;
    this._push({
      meshes: [mesh],
      ownGeo: true,
      update: (dt) => {
        t += dt;
        const k = t / dur;
        if (k >= 1) return false;
        mesh.scale.setScalar(radius * (shock ? k : 0.2 + 0.8 * k));
        mesh.material.opacity = shock ? 0.8 * (1 - k) : 0.4 * (0.6 + 0.4 * Math.sin(t * 18));
        return true;
      },
    });
  }

  // Small impact sparks.
  sparks(pos, color, n = 7, speed = 4) {
    const mat = addMat(color, 1);
    const meshes = [];
    const vels = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(_tetra, mat);
      m.position.set(pos.x, pos.y ?? 1.1, pos.z);
      const a = Math.random() * Math.PI * 2;
      const up = 1 + Math.random() * 3;
      vels.push(new THREE.Vector3(Math.cos(a) * speed * (0.4 + Math.random()), up, Math.sin(a) * speed * (0.4 + Math.random())));
      meshes.push(m);
    }
    let t = 0;
    this._push({
      meshes,
      ownGeo: false,
      update: (dt) => {
        t += dt;
        for (let i = 0; i < meshes.length; i++) {
          vels[i].y -= 14 * dt;
          meshes[i].position.addScaledVector(vels[i], dt);
          meshes[i].rotation.x += 9 * dt;
          meshes[i].rotation.z += 7 * dt;
        }
        mat.opacity = 1 - t / 0.45;
        return t < 0.45;
      },
    });
  }

  // Death burst: body panels fly apart.
  shards(pos, color, n = 12) {
    const mat = addMat(color, 1);
    const meshes = [];
    const vels = [];
    const spins = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(_shard, mat);
      m.position.set(pos.x, 0.4 + Math.random() * 1.2, pos.z);
      const a = Math.random() * Math.PI * 2;
      const sp = 2 + Math.random() * 5;
      vels.push(new THREE.Vector3(Math.cos(a) * sp, 2 + Math.random() * 5, Math.sin(a) * sp));
      spins.push(4 + Math.random() * 10);
      meshes.push(m);
    }
    let t = 0;
    this._push({
      meshes,
      ownGeo: false,
      update: (dt) => {
        t += dt;
        for (let i = 0; i < meshes.length; i++) {
          vels[i].y -= 16 * dt;
          const m = meshes[i];
          m.position.addScaledVector(vels[i], dt);
          if (m.position.y < 0.08) { m.position.y = 0.08; vels[i].y *= -0.35; vels[i].x *= 0.7; vels[i].z *= 0.7; }
          m.rotation.x += spins[i] * dt;
          m.rotation.y += spins[i] * 0.7 * dt;
        }
        mat.opacity = 1 - t / 0.9;
        return t < 0.9;
      },
    });
  }

  // Vertical beam marking an enemy spawn point.
  spawnBeam(pos, color, dur = 0.7) {
    const geo = new THREE.CylinderGeometry(0.45, 0.45, 9, 8, 1, true);
    const mesh = new THREE.Mesh(geo, addMat(color, 0.5));
    mesh.position.set(pos.x, 4.5, pos.z);
    let t = 0;
    this._push({
      meshes: [mesh],
      ownGeo: true,
      update: (dt) => {
        t += dt;
        const k = t / dur;
        mesh.scale.set(1 - k * 0.7, 1, 1 - k * 0.7);
        mesh.material.opacity = 0.5 * (1 - k);
        return k < 1;
      },
    });
  }
}
