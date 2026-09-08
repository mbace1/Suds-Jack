import * as THREE from 'three';
import { VoxelSprite, MODELS } from './voxel.js?v=77';
import { terraceGeometry } from './gel.js?v=77';

/**
 * THE SKULLSCAPE — season 2's horizon, built from what the game already owns.
 *
 * The brief says *aquamarine Inca skullscape* and there is no Meshy art for
 * it, so this is made two ways that cost nothing to ship:
 *
 *  - GIANT SKULLS: the string-art skull every run has been fighting since
 *    v1, at ten to sixteen times its size, half-sunk into the ground outside
 *    the disc, turned to face the arena. A voxel skull at ×12 is a monument
 *    made of the same cubes as the thing it was — which is the point.
 *  - TERRACES: stepped pyramids (gel.js `terraceGeometry`) standing further
 *    out, pale stone through the season's fog, so the horizon has a city on
 *    it and the skulls have something to be in front of.
 *
 * Nothing here collides or takes damage. Seeded, like the rest of the arena.
 */
export class Skullscape {
  constructor(scene, arenaR) {
    this.scene = scene;
    this.arenaR = arenaR;
    this.group = new THREE.Group();
    this.group.name = 'skullscape';
    scene.add(this.group);
    this.skulls = [];
    this.terraces = [];
    this.cfg = null;
  }

  build(cfg, draw = Math.random) {
    this.clear();
    this.cfg = cfg;
    if (!cfg) return;
    const r = this.arenaR;
    // skulls
    const sk = cfg.skulls;
    if (sk) {
      const tint = new THREE.Color().setRGB(...(sk.tint ?? [0.72, 0.98, 0.94]));
      for (let i = 0; i < sk.count; i++) {
        const a = (i / sk.count) * Math.PI * 2 + draw() * 0.6;
        const dist = r + sk.rMin + draw() * (sk.rMax - sk.rMin);
        const sp = new VoxelSprite(MODELS.skull, 1);
        const m = sp.mesh;
        m.material = m.material.clone();
        m.material.color.copy(tint);
        m.material.fog = true;
        m.material.needsUpdate = true;
        // the sprite's voxels are in model units around the origin: find its
        // base and height so it can be planted, then sunk
        let minY = Infinity, maxY = -Infinity;
        for (const v of sp.voxels) { if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y; }
        const h = Math.max(1e-3, maxY - minY);
        const scale = sk.scale * (0.7 + draw() * 0.6);
        const sink = (sk.sinkMin + draw() * (sk.sinkMax - sk.sinkMin)) * h * scale;
        m.scale.setScalar(scale);
        m.position.set(Math.cos(a) * dist, -minY * scale - sink, Math.sin(a) * dist);
        // face the arena, roughly — a skull half-buried is not looking anywhere exactly
        m.rotation.y = Math.atan2(-Math.cos(a), Math.sin(a)) + Math.PI / 2 + (draw() - 0.5) * 0.8;
        m.rotation.x = (draw() - 0.5) * 0.35;
        m.rotation.z = (draw() - 0.5) * 0.3;
        this.group.add(m);
        this.skulls.push({ mesh: m, sprite: sp, at: [+m.position.x.toFixed(1), +m.position.z.toFixed(1)], scale: +scale.toFixed(2) });
      }
    }
    // terraces
    const tc = cfg.terraces;
    if (tc) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true });
      for (let i = 0; i < tc.count; i++) {
        const a = (i / tc.count) * Math.PI * 2 + draw() * 0.9;
        const dist = r + tc.rMin + draw() * (tc.rMax - tc.rMin);
        const w = tc.wMin + draw() * (tc.wMax - tc.wMin);
        const h = tc.hMin + draw() * (tc.hMax - tc.hMin);
        const geo = terraceGeometry({ w, d: w * (0.8 + draw() * 0.4), h, steps: tc.steps ?? 6, draw, color: tc.color });
        const m = new THREE.Mesh(geo, mat);
        m.position.set(Math.cos(a) * dist, -0.05, Math.sin(a) * dist);
        m.rotation.y = draw() * Math.PI;
        this.group.add(m);
        this.terraces.push({ mesh: m, at: [+m.position.x.toFixed(1), +m.position.z.toFixed(1)], h: +h.toFixed(1) });
      }
    }
  }

  clear() {
    for (const s of this.skulls) { this.group.remove(s.mesh); s.mesh.material.dispose(); }
    for (const t of this.terraces) { this.group.remove(t.mesh); t.mesh.geometry.dispose(); }
    this.skulls.length = 0;
    this.terraces.length = 0;
    this.cfg = null;
  }

  getState() {
    return {
      on: !!this.cfg,
      skulls: this.skulls.map(s => ({ at: s.at, scale: s.scale })),
      terraces: this.terraces.map(t => ({ at: t.at, h: t.h })),
    };
  }
}
