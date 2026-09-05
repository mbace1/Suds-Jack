import * as THREE from 'three';
import { shadedBox } from './voxel.js?v=71';

/**
 * WALLS — the first geometry this arena has ever had that is not a floor.
 * A `court` arena is the disc plus a set of oriented slabs the player
 * collides with (and, from v39, can run along). Enemies do not know about
 * them: the DD modes keep the open disc, and the court is for the movement
 * experiments — MOVE first, then a TRUCK course.
 *
 * Collision is a point (the feet) against an oriented box in the wall's own
 * frame: push out along the shortest axis, kill the velocity into it, and
 * report the contact normal so a wall run knows which way is "along".
 */
export class Walls {
  /** `material` — pass the floor's own material and the walls are the same
   *  plates the floor is; an unlit flat colour read as black paper cut-outs. */
  constructor(scene, material = null) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'walls';
    scene.add(this.group);
    this.walls = []; // { x, z, yaw, len, h, thick, mesh, cos, sin }
    this.mat = material || new THREE.MeshBasicMaterial({ color: 0x14100f });
  }

  /** One slab: centre (x, z), yaw radians, len along its own x, height h, thickness. */
  add({ x, z, yaw = 0, len = 12, h = 5, thick = 1, tag = null }) {
    const geo = new THREE.BoxGeometry(len, h, thick);
    // the floor shader tiles its map uRepeat times across the 52-unit disc;
    // scale each face's uv so a wall's plates are the same size underfoot
    const uv = geo.getAttribute('uv');
    const per = 52 / 10; // world units per tile at uRepeat 10
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (len / per), uv.getY(i) * (h / per));
    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.position.set(x, h / 2, z);
    mesh.rotation.y = yaw;
    this.group.add(mesh);
    this.walls.push({ x, z, yaw, len, h, thick, mesh, tag, cos: Math.cos(yaw), sin: Math.sin(yaw) });
  }

  /** Drop every wall the predicate names — the track culls its course walls
   *  behind the player the way it culls its slabs. */
  cull(pred) {
    for (let i = this.walls.length - 1; i >= 0; i--) {
      const w = this.walls[i];
      if (!pred(w)) continue;
      this.group.remove(w.mesh); w.mesh.geometry.dispose();
      this.walls.splice(i, 1);
    }
  }

  /** The four-wall court: tangent slabs at radius r, one per quadrant. */
  court(r = 16, len = 12, h = 5) {
    this.clear();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      this.add({ x: Math.sin(a) * r, z: -Math.cos(a) * r, yaw: a, len, h, thick: 1 });
    }
  }

  clear() {
    for (const w of this.walls) { this.group.remove(w.mesh); w.mesh.geometry.dispose(); }
    this.walls.length = 0;
  }

  /**
   * Resolve the player against every wall. Runs AFTER player.update. Sets
   * player.wallContact = { nx, nz, wall } when touching one this frame (null
   * otherwise) — the hook a wall run reads.
   */
  resolve(player, radius = 0.45) {
    player.wallContact = null;
    const f = player.feet;
    for (const w of this.walls) {
      if (f.y > w.h) continue;
      // into the wall's frame: u along its length, v through its thickness
      const dx = f.x - w.x, dz = f.z - w.z;
      const u = dx * w.cos - dz * w.sin;
      const v = dx * w.sin + dz * w.cos;
      const hu = w.len / 2 + radius, hv = w.thick / 2 + radius;
      if (Math.abs(u) >= hu || Math.abs(v) >= hv) continue;
      // shortest way out
      const pu = hu - Math.abs(u), pv = hv - Math.abs(v);
      let nu = 0, nv = 0;
      if (pv <= pu) nv = Math.sign(v) || 1; else nu = Math.sign(u) || 1;
      const push = Math.min(pu, pv);
      // back to world
      const nx = nu * w.cos + nv * w.sin;
      const nz = -nu * w.sin + nv * w.cos;
      f.x += nx * push; f.z += nz * push;
      const into = player.velocity.x * nx + player.velocity.z * nz;
      if (into < 0) { player.velocity.x -= nx * into; player.velocity.z -= nz * into; }
      if (player.dashT > 0) { const d = player.dashDir.x * nx + player.dashDir.z * nz; if (d < 0) { player.dashDir.x -= nx * d; player.dashDir.z -= nz * d; } }
      player.wallContact = { nx, nz, wall: w };
    }
    if (player.wallContact) player._sync?.();
    return player.wallContact;
  }

  getState() { return { count: this.walls.length, walls: this.walls.map(w => ({ x: +w.x.toFixed(1), z: +w.z.toFixed(1), yaw: +w.yaw.toFixed(2), len: w.len, h: w.h })) }; }
}
