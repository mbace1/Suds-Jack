import * as THREE from 'three';
import { COL } from './palette.js?v=4';
import { DRIVE_HALF } from './player.js?v=4';

const HOUSE_X      = DRIVE_HALF + 2.6;   // house centre line, just beyond the kerb
export const DELIVER_X = HOUSE_X - 1.6;  // kerbside mailbox line papers fly to
const HOUSE_SPACING= 9.5;
const SPAWN_AHEAD  = 78;                 // how far ahead of the bike to build
const CULL_BEHIND  = 20;
const ROAD_HALF    = DRIVE_HALF - 1.6;   // cars stay on tarmac

const HAZARD_TYPES = ['car', 'car', 'hydrant', 'cone', 'dog'];
const _WHITE = new THREE.Color(0xffffff);   // for the flat-colour delivery flash

// Dispose all materials under a group (geometries are shared, so leave them).
function disposeTree(group) {
  group.traverse(o => {
    if (o.material) { Array.isArray(o.material) ? o.material.forEach(m => m.dispose()) : o.material.dispose(); }
  });
}

export class World {
  constructor(scene) {
    this.scene  = scene;
    this.houses = [];
    this.hazards = [];
    this.pickups = [];
    this.missedEvents = 0;     // subscribers that scrolled past undelivered (drained by main)

    // Shared geometries
    this._roofGeo  = new THREE.ConeGeometry(2.4, 1.8, 4);
    this._bodyGeo  = new THREE.BoxGeometry(3.4, 2.6, 3.4);
    this._winGeo   = new THREE.BoxGeometry(0.7, 0.8, 0.08);
    this._doorGeo  = new THREE.BoxGeometry(0.8, 1.4, 0.1);
    this._postGeo  = new THREE.CylinderGeometry(0.07, 0.07, 1.0, 6);
    this._mailGeo  = new THREE.BoxGeometry(0.34, 0.34, 0.56);   // mailbox body
    this._flagGeo  = new THREE.BoxGeometry(0.04, 0.22, 0.14);   // red flag
    this._trunkGeo = new THREE.CylinderGeometry(0.16, 0.2, 1.2, 6);
    this._foliaGeo = new THREE.SphereGeometry(1.0, 8, 6);
    this.reset(0);
  }

  reset(playerZ) {
    for (const h of this.houses)  this.scene.remove(h.group);
    for (const z of this.hazards) this.scene.remove(z.mesh);
    for (const p of this.pickups) this.scene.remove(p.mesh);
    this.houses = []; this.hazards = []; this.pickups = [];
    this.missedEvents = 0;
    this._zHouse  = playerZ - 6;
    this._zHazard = playerZ - 30;
    this._zPickup = playerZ - 45;
    this.difficulty = 1;
  }

  setDifficulty(d) { this.difficulty = d; }

  // ── Builders ──────────────────────────────────────────────────────────────
  _buildHouse(side, z, sub) {
    const g = new THREE.Group();
    g.position.set(side * HOUSE_X, 0, z);

    const bodyMat = new THREE.MeshBasicMaterial({ color: sub ? COL.subscriber : COL.nonSub });
    const body = new THREE.Mesh(this._bodyGeo, bodyMat);
    body.position.y = 1.3; body.castShadow = true; body.receiveShadow = true;
    g.add(body);

    const roof = new THREE.Mesh(this._roofGeo,
      new THREE.MeshBasicMaterial({ color: sub ? COL.subRoof : COL.nonSubRoof }));
    roof.position.y = 3.4; roof.rotation.y = Math.PI / 4; roof.castShadow = true;
    g.add(roof);

    // Windows face the road
    const winMat = new THREE.MeshBasicMaterial({ color: sub ? COL.subWindow : COL.nonSubWindow });
    const windows = [];
    for (const wx of [-0.8, 0.8]) {
      const w = new THREE.Mesh(this._winGeo, winMat.clone());
      w.position.set(wx, 1.4, -side * 1.72);
      g.add(w); windows.push(w);
    }

    // Front door facing the road
    const door = new THREE.Mesh(this._doorGeo,
      new THREE.MeshBasicMaterial({ color: sub ? COL.subRoof : COL.nonSubRoof }));
    door.position.set(0, 0.9, -side * 1.72); g.add(door);

    // Curbside mailbox at the delivery line — every house has one (US-style box + flag)
    const post = new THREE.Mesh(this._postGeo, new THREE.MeshBasicMaterial({ color: 0x6a4a2a }));
    post.position.set(-side * 1.6, 0.5, 0); g.add(post);
    const mbox = new THREE.Mesh(this._mailGeo,
      new THREE.MeshBasicMaterial({ color: sub ? 0xf3f3ea : 0x8b9088 }));
    mbox.position.set(-side * 1.6, 1.05, 0); g.add(mbox);
    const flag = new THREE.Mesh(this._flagGeo, new THREE.MeshBasicMaterial({ color: COL.hudDanger }));
    flag.position.set(-side * 1.84, sub ? 1.22 : 0.98, 0); g.add(flag); // flag up = wants a paper

    // A leafy tree on the lawn, set back from the road
    if (Math.random() < 0.6) {
      const tx = side * 2.6, tz = (Math.random() * 2 - 1) * 2.6;
      const trunk = new THREE.Mesh(this._trunkGeo, new THREE.MeshBasicMaterial({ color: 0x6a4a2a }));
      trunk.position.set(tx, 0.6, tz); trunk.castShadow = true; g.add(trunk);
      const foliage = new THREE.Mesh(this._foliaGeo, new THREE.MeshBasicMaterial({ color: 0x4f9e36 }));
      foliage.position.set(tx, 1.8, tz); foliage.scale.set(1, 0.85, 1); foliage.castShadow = true; g.add(foliage);
    }

    this.scene.add(g);
    this.houses.push({
      group: g, side, z, sub,
      delivered: false, smashed: false, missed: false,
      zoneX: side * (HOUSE_X - 1.6), zoneR: 3.5,
      bodyMat, baseColor: sub ? COL.subscriber : COL.nonSub, windows, flashT: 0,
    });
  }

  _buildHazard(type, x, z) {
    let mesh, r = 0.7, vx = 0, vz = 0;
    if (type === 'car') {
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 2.6),
        new THREE.MeshBasicMaterial({ color: COL.car }));
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.3),
        new THREE.MeshBasicMaterial({ color: COL.car }));
      cab.position.y = 0.55;
      mesh = new THREE.Group(); mesh.add(body, cab);
      mesh.position.set(x, 0.5, z);
      r = 1.2;
      vz = (3 + this.difficulty * 0.8) * (Math.random() < 0.7 ? 1 : -1); // mostly oncoming
    } else if (type === 'hydrant') {
      mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.0, 8),
        new THREE.MeshBasicMaterial({ color: COL.hydrant }));
      mesh.position.set(x, 0.5, z); r = 0.6;
    } else if (type === 'cone') {
      mesh = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.9, 12),
        new THREE.MeshBasicMaterial({ color: COL.cone }));
      mesh.position.set(x, 0.45, z); r = 0.5;
    } else { // dog
      mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8),
        new THREE.MeshBasicMaterial({ color: COL.dog }));
      mesh.position.set(x, 0.5, z); r = 0.6;
      vx = (Math.random() < 0.5 ? -1 : 1) * (2 + this.difficulty * 0.5);
    }
    mesh.traverse?.(o => { if (o.isMesh) o.castShadow = true; });
    if (mesh.isMesh) mesh.castShadow = true;
    this.scene.add(mesh);
    this.hazards.push({ type, mesh, x, z, r, vx, vz, alive: true });
  }

  _buildPickup(x, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7),
      new THREE.MeshBasicMaterial({ color: COL.bundle }));
    mesh.position.set(x, 0.6, z); mesh.castShadow = true;
    this.scene.add(mesh);
    this.pickups.push({ mesh, x, z, r: 0.9, taken: false });
  }

  // ── Per-frame ───────────────────────────────────────────────────────────────
  update(dt, playerZ, t) {
    // Stream houses (both sides each step)
    while (this._zHouse > playerZ - SPAWN_AHEAD) {
      this._zHouse -= HOUSE_SPACING;
      for (const side of [-1, 1]) {
        const sub = Math.random() < 0.55;
        this._buildHouse(side, this._zHouse, sub);
      }
    }
    // Stream hazards
    const hazGap = Math.max(5.5, 9 - this.difficulty * 0.6);
    while (this._zHazard > playerZ - SPAWN_AHEAD) {
      this._zHazard -= hazGap * (0.7 + Math.random() * 0.8);
      const type = HAZARD_TYPES[(Math.random() * HAZARD_TYPES.length) | 0];
      const x = (Math.random() * 2 - 1) * ROAD_HALF;
      this._buildHazard(type, x, this._zHazard);
    }
    // Stream pickups
    while (this._zPickup > playerZ - SPAWN_AHEAD) {
      this._zPickup -= 26 + Math.random() * 22;
      const x = (Math.random() * 2 - 1) * (ROAD_HALF - 0.5);
      this._buildPickup(x, this._zPickup);
    }

    // Move hazards + animate
    for (const h of this.hazards) {
      if (h.type === 'car')  { h.z += h.vz * dt; h.mesh.position.z = h.z; }
      if (h.type === 'dog')  {
        h.x += h.vx * dt;
        if (Math.abs(h.x) > ROAD_HALF) h.vx *= -1;
        h.mesh.position.x = h.x;
        h.mesh.position.y = 0.5 + Math.abs(Math.sin(t * 8)) * 0.2; // hops
      }
      if (h.type === 'cone' || h.type === 'hydrant')
        h.mesh.rotation.y += dt * 0.5;
    }

    // Animate pickups (spin + bob)
    for (const p of this.pickups) {
      if (p.taken) continue;
      p.mesh.rotation.y += dt * 2.2;
      p.mesh.position.y = 0.6 + Math.sin(t * 3) * 0.12;
    }

    // House delivery flashes
    for (const h of this.houses) {
      if (h.flashT > 0) {
        h.flashT -= dt;
        const k = Math.max(0, h.flashT / 0.5);
        h.bodyMat.color.set(h.baseColor).lerp(_WHITE, k);   // white pop, fading back
        if (h.flashT <= 0) h.bodyMat.color.set(h.baseColor);
      }
      // Missed subscriber: scrolled behind the bike, never delivered
      if (h.sub && !h.delivered && !h.missed && h.z > playerZ + 4) {
        h.missed = true; this.missedEvents++;
        h.baseColor = COL.hudDanger; h.bodyMat.color.setHex(COL.hudDanger);
      }
    }

    // Cull everything well behind the bike (dispose materials to stay leak-free)
    const cullZ = playerZ + CULL_BEHIND;
    this.houses = this.houses.filter(h => {
      if (h.z > cullZ) { this.scene.remove(h.group); disposeTree(h.group); return false; } return true; });
    this.hazards = this.hazards.filter(h => {
      if (h.z > cullZ + 10 || h.z < playerZ - SPAWN_AHEAD - 30) { this.scene.remove(h.mesh); h.mesh.material.dispose(); return false; } return true; });
    this.pickups = this.pickups.filter(p => {
      if (p.taken || p.z > cullZ) { this.scene.remove(p.mesh); p.mesh.material.dispose(); return false; } return true; });
  }

  // Resolve a landed paper → returns {result, points} and applies flashes.
  resolvePaper(p) {
    let best = null, bestD = Infinity;
    for (const h of this.houses) {
      if (h.side !== p.side) continue;
      const d = Math.hypot(p.x - h.zoneX, p.z - h.z);
      if (d < h.zoneR && d < bestD) { bestD = d; best = h; }
    }
    if (!best) return { result: 'miss', points: 0 };

    if (best.sub && !best.delivered) {
      best.delivered = true;
      best.baseColor = COL.delivered;            // house stays green after the flash
      best.flashT = 0.5; best.bodyMat.color.setHex(COL.delivered);
      for (const w of best.windows) w.material.color.setHex(COL.smash);
      return { result: 'deliver', points: 250, house: best };
    }
    if (!best.sub && !best.smashed) {
      best.smashed = true;
      best.flashT = 0.5;
      for (const w of best.windows) w.material.color.setHex(COL.smash);
      return { result: 'smash', points: 100, house: best };
    }
    return { result: 'miss', points: 0 };
  }

  // Nearest live hazard overlapping the bike, or null.
  hazardHit(px, pz, pr) {
    for (const h of this.hazards) {
      if (!h.alive) continue;
      if (Math.abs(h.z - pz) > h.r + pr + 2) continue;
      if (Math.hypot(h.x - px, h.z - pz) < h.r + pr) return h;
    }
    return null;
  }

  // Pickup overlapping the bike (marks it taken), or null.
  pickupHit(px, pz, pr) {
    for (const p of this.pickups) {
      if (p.taken) continue;
      if (Math.hypot(p.x - px, p.z - pz) < p.r + pr) { p.taken = true; return p; }
    }
    return null;
  }
}
