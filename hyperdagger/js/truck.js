// TRUCK mode — Clustertruck-style auto-scroll track on the Hyper Dagger body.
import * as THREE from 'three';
import { TUNING as T } from './tuning.js?v=82';
import { Skull } from './enemy.js?v=82';

const matOk = new THREE.MeshBasicMaterial({ color: 0x3a342c });
const matWarn = new THREE.MeshBasicMaterial({ color: 0x6a4030 });
const matHot = new THREE.MeshBasicMaterial({ color: 0x8a3020 });
// v51: a moving truck wears a lit OUTLINE. The first loop of the convoy showed
// near-black slabs on a black road: the next truck — the one thing you must
// read to jump — melted into the fog or stood as a black block against the
// horizon. HDR so the bloom takes it, and fog-free so the truck you are
// aiming for reads at distance; it turns red when the truck is about to go.
const EDGE = new THREE.Color(1.5, 0.62, 0.2);
const EDGE_WARN = new THREE.Color(1.9, 0.18, 0.1);
const edgeMat = new THREE.LineBasicMaterial({ color: EDGE, fog: false });
function disposeTruck(p) {
  p.mesh.geometry.dispose();
  p.mesh.material?.dispose?.();
  if (p.edge) { p.edge.geometry.dispose(); p.edge.material.dispose(); }
}

export class TruckTrack {
  constructor(scene) {
    this.scene = scene;
    this.platforms = [];
    this.nextZ = 0;
    this.cfg = T.truck;
    this.carryX = 0; this.carryZ = 0;
    this.last = null;
  }

  /** v51: a season may lay its own track over T.truck. With nothing to add
   *  the config IS T.truck — the same object, so a gate that edits the
   *  tuning mid-run is still read. */
  setConfig(extra) { this.cfg = extra ? { ...T.truck, ...extra } : T.truck; }

  clear() {
    for (const p of this.platforms) {
      this.scene.remove(p.mesh);
      disposeTruck(p);
    }
    this.platforms.length = 0;
    this.nextZ = 0;
    this.last = null;
    this.carryX = 0; this.carryZ = 0;
  }

  /**
   * Where the next slab sits across the track. A bounded RANDOM WALK, not a
   * fresh roll: scattering each platform independently across the full width
   * makes islands, and a route you cannot see the shape of is not a route.
   * Stepping at most ~1.6 either way keeps every slab overlapping the one
   * before it laterally, so the track reads as a road that wanders.
   */
  walkX(first = false) {
    if (first) return (this.lastX = 0);
    const step = (Math.random() - 0.5) * 3.2;
    this.lastX = Math.max(-5, Math.min(5, (this.lastX ?? 0) + step));
    return this.lastX;
  }

  addPlatform(z, x = 0) {
    const c = this.cfg;
    const w = c.width * (0.85 + Math.random() * 0.45);
    const depth = c.platformDepth + Math.random() * c.platformDepthVar;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.45, depth), matOk.clone());
    mesh.position.set(x, -0.2, z);
    this.scene.add(mesh);
    const p = {
      mesh, z, x, w, depth,
      life: c.platformLife,
      touched: false,
      falling: false,
      vy: 0,
      vx: 0, vz: 0,
    };
    // v51 SEASON 3: the trucks DRIVE. Each one has its own speed down the
    // road (a hair faster the further out it was laid) and a slow lane-sway,
    // and whatever you stand on carries you — see preUpdate.
    if (c.moving) {
      const scale = 1 + Math.min(0.5, Math.max(0, -z) * 0.003);
      p.vz = -(c.driveSpeed + (Math.random() * 2 - 1) * c.driveVar) * scale;
      p.baseX = x; p.swayA = Math.random() * c.sway; p.swayW = 0.35 + Math.random() * 0.45;
      p.phase = Math.random() * Math.PI * 2; p.t = 0;
      p.edge = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), edgeMat.clone());
      mesh.add(p.edge);
    }
    this.platforms.push(p);
    this.last = p;
  }

  reset(player) {
    this.clear();
    this.lastX = 0;
    for (let i = 0; i < 10; i++) {
      this.addPlatform(-i * this.cfg.platformGap, this.walkX(i === 0));
    }
    this.nextZ = -10 * this.cfg.platformGap;
    // you start ON the first truck, so you start at its speed
    this.carryX = 0; this.carryZ = this.cfg.moving ? this.platforms[0].vz : 0;
    player.feet.set(0, 0.4, 0);
    player.velocity.set(0, 0, 0);
    player.vy = 0;
    player.floorY = -Infinity;
    player._sync();
  }

  /**
   * Runs BEFORE player.update: scrolls the body down the track and tells it
   * what it is standing on this frame. It has to be before, not after, or the
   * player never reads as grounded and jumps never refill — which is the whole
   * mode. (It also has to scale by dt: the first cut moved a flat 14 units per
   * FRAME, so the track ran ~50x too fast at 60fps and faster on a better
   * screen. Nothing caught it because the mode was never actually reachable.)
   */
  preUpdate(dt, player) {
    if (this.cfg.moving) {
      // MOMENTUM (v51): the truck under you carries you, and in the air you
      // keep the velocity of the one you left — the road does not push you,
      // what you were standing on does
      player.feet.x += this.carryX * dt;
      player.feet.z += this.carryZ * dt;
    } else {
      const boost = 1 + Math.min(0.6, Math.max(0, -player.feet.z) * 0.004);
      player.feet.z -= this.cfg.scrollSpeed * boost * dt;
    }

    let floor = -Infinity, under = null;
    for (const p of this.platforms) {
      if (p.falling) continue;
      const dx = Math.abs(player.feet.x - p.mesh.position.x);
      const dz = Math.abs(player.feet.z - p.mesh.position.z);
      if (dx > p.w * 0.5 + 0.35 || dz > p.depth * 0.5 + 0.35) continue;
      const top = p.mesh.position.y + 0.25;
      // Only surfaces at or below the feet hold you up — you pass through the
      // side of a platform you are jumping past rather than snagging on it.
      if (top > player.feet.y + 0.45) continue;
      if (top > floor) { floor = top; under = p; }
      // Standing on it starts its clock. Touching is what makes it leave.
      if (player.feet.y <= top + 0.45) p.touched = true;
    }
    player.floorY = floor;
    if (this.cfg.moving && under && player.feet.y <= floor + 0.05) { this.carryX = under.vx; this.carryZ = under.vz; }
    return floor > -Infinity;
  }

  update(dt, player, gameTime, enemies, walls = null) {
    const ahead = player.feet.z - 45;
    const c = this.cfg;
    if (c.moving) {
      // lay the road off the front truck's CURRENT position: the trucks move,
      // so a fixed spawn cursor would drift away from the convoy
      let front = this.last ? this.last.mesh.position.z : 0;
      while (front > ahead) {
        front -= c.platformGap * (0.8 + Math.random() * 0.45);
        this.addPlatform(front, this.walkX());
      }
    }
    while (!c.moving && this.nextZ > ahead) {
      this.addPlatform(this.nextZ, this.walkX());
      let gap = c.platformGap * (0.8 + Math.random() * 0.45);
      if (gameTime > 20 && Math.random() < c.courseChance) {
        // THE COURSE (v40): a hole too wide to jump gets a wall along one
        // side of it, from the slab you leave to the slab you land on — the
        // way across is to run the wall. Which side alternates, so the
        // body has to read it, and the wall stands just off the slab edge
        // so a run along it is a run, not a scrape.
        gap *= c.courseGap;
        if (walls) {
          const side = (this._courseSide = -(this._courseSide || 1));
          const x = this.lastX + side * (c.width * 0.5 + 1.2);
          const z = this.nextZ - gap / 2;
          walls.add({ x, z, yaw: Math.PI / 2, len: gap + c.platformDepth, h: c.courseWallH, thick: 0.8, tag: 'course' });
        }
      }
      this.nextZ -= gap;
    }
    // course walls fall away behind, like the slabs do
    if (walls) walls.cull(w => w.tag === 'course' && w.z > player.feet.z + 24);

    for (let i = this.platforms.length - 1; i >= 0; i--) {
      const p = this.platforms[i];
      if (c.moving) {
        p.t += dt;
        const a = p.phase + p.t * p.swayW;
        p.mesh.position.x = p.baseX + Math.sin(a) * p.swayA;
        p.vx = Math.cos(a) * p.swayA * p.swayW;
        p.mesh.position.z += p.vz * dt;
        // a truck you skipped never falls — cull it once it is well behind
        if (p.mesh.position.z > player.feet.z + 30) {
          this.scene.remove(p.mesh); disposeTruck(p);
          this.platforms.splice(i, 1);
          continue;
        }
      }
      if (!p.falling && p.touched) {
        p.life -= dt;
        if (p.life <= 0) {
          p.falling = true;
          p.mesh.material.color.copy(matHot.color);
          if (p.edge) p.edge.material.color.copy(EDGE_WARN);
        } else if (p.life < 0.85) {
          p.mesh.material.color.copy(matWarn.color);
          if (p.edge) p.edge.material.color.copy(EDGE_WARN);
        }
      }
      if (p.falling) {
        p.vy -= 28 * dt;
        p.mesh.position.y += p.vy * dt;
        p.mesh.rotation.z += dt * 1.3;
        if (p.mesh.position.y < -22) {
          this.scene.remove(p.mesh);
          disposeTruck(p);
          this.platforms.splice(i, 1);
        }
      }
    }

    const rate = 0.2 + Math.min(0.8, gameTime * 0.015);
    if (gameTime > 8 && Math.random() < dt * rate) {
      const z = player.feet.z - 16 - Math.random() * 12;
      const x = (Math.random() - 0.5) * 7;
      enemies.push(new Skull(this.scene, new THREE.Vector3(x, 1.2, z), 1.5 + gameTime * 0.02));
    }
  }

}
