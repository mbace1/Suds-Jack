import * as THREE from 'three';
import { outlinedBox, inkMat, C, INK } from './shared.js?v=2';
import { rollItem } from './items.js?v=2';

export const ARENA_R = 46;
const CHARGE_TIME = 22;        // seconds to charge the teleporter (when stood in)

export class World {
  constructor(scene) {
    this.scene = scene;
    this.chests = [];

    // ground grid + boundary (the only floor read, on the white void)
    const grid = new THREE.GridHelper(ARENA_R * 2, 40, 0xdadada, 0xeaeaea);
    grid.position.y = 0; scene.add(grid);
    const ringGeo = new THREE.TorusGeometry(ARENA_R, 0.18, 6, 80);
    const bound = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: INK }));
    bound.rotation.x = -Math.PI / 2; scene.add(bound);

    // teleporter: flat ring + a beam that lights when ready
    this.teleR = 6;
    this.teleRing = new THREE.Mesh(new THREE.TorusGeometry(this.teleR, 0.32, 8, 64),
      new THREE.MeshBasicMaterial({ color: C.tele }));
    this.teleRing.rotation.x = -Math.PI / 2; scene.add(this.teleRing);
    this.teleBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 30, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: C.tele, transparent: true, opacity: 0.18, side: THREE.DoubleSide }));
    this.teleBeam.position.y = 15; this.teleBeam.visible = false; scene.add(this.teleBeam);

    this.tele = { x: 0, z: 0, state: 'idle', progress: 0 };   // idle | charging | ready
  }

  _makeChest(x, z, cost) {
    const g = new THREE.Group();
    const box = outlinedBox(2.0, 1.4, 1.4, inkMat(C.gold)); box.position.y = 0.7; g.add(box);
    const lid = outlinedBox(2.1, 0.4, 1.5, inkMat(C.gold)); lid.position.y = 1.55; g.add(lid);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.1), new THREE.MeshBasicMaterial({ color: C.gold }));
    mark.position.set(0, 0.8, 0.72); g.add(mark);
    g.position.set(x, 0, z); this.scene.add(g);
    return { group: g, x, z, cost, opened: false, lid };
  }

  newStage(stage) {
    for (const c of this.chests) this.scene.remove(c.group);
    this.chests = [];
    const cost = Math.round(25 * Math.pow(1.18, stage - 1) / 5) * 5;
    const n = 4 + Math.min(4, stage);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * (ARENA_R - 18);
      this.chests.push(this._makeChest(Math.cos(a) * r, Math.sin(a) * r, cost));
    }
    // place teleporter away from spawn
    const a = Math.random() * Math.PI * 2, r = ARENA_R * 0.55;
    this.tele.x = Math.cos(a) * r; this.tele.z = Math.sin(a) * r;
    this.tele.state = 'idle'; this.tele.progress = 0;
    this.teleRing.position.set(this.tele.x, 0.05, this.tele.z);
    this.teleBeam.position.set(this.tele.x, 15, this.tele.z); this.teleBeam.visible = false;
    this.teleRing.material.color.setHex(C.tele);
  }

  nearestChest(x, z, reach = 3.2) {
    for (const c of this.chests) {
      if (c.opened) continue;
      if (Math.hypot(c.x - x, c.z - z) < reach) return c;
    }
    return null;
  }
  openChest(c) {                      // returns the rolled item
    c.opened = true;
    c.lid.position.y = 1.7; c.lid.rotation.z = 0.4;       // pop the lid
    for (const ch of c.group.children) ch.traverse?.(o => { if (o.material && o.material.color) {} });
    return rollItem();
  }

  inTeleporter(x, z) { return Math.hypot(x - this.tele.x, z - this.tele.z) < this.teleR; }
  startCharge() { if (this.tele.state === 'idle') { this.tele.state = 'charging'; return true; } return false; }

  // advances the teleporter while the player stands inside; returns true the frame it completes
  update(dt, playerInside) {
    const t = performance.now() / 1000;
    this.teleRing.rotation.z = t * 0.6;
    this.teleRing.scale.setScalar(1 + Math.sin(t * 3) * 0.02);
    let justDone = false;
    if (this.tele.state === 'charging') {
      if (playerInside) this.tele.progress = Math.min(1, this.tele.progress + dt / CHARGE_TIME);
      const k = this.tele.progress;
      this.teleRing.material.color.setRGB(
        (1 - k) * 0.56 + k * 0.09, (1 - k) * 0.36 + k * 0.69, (1 - k) * 1.0 + k * 0.41); // violet→green
      if (this.tele.progress >= 1) { this.tele.state = 'ready'; justDone = true;
        this.teleRing.material.color.setHex(C.hp); this.teleBeam.visible = true; }
    }
    return justDone;
  }
}
