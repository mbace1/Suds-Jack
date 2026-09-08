import * as THREE from 'three';
import { shadedBox } from './voxel.js?v=76';

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
  add({ x, z, yaw = 0, len = 12, h = 5, thick = 1, tag = null, material = null, geometry = null }) {
    if (geometry) {
      // v41: a prebuilt look (shale.js) whose origin is its BASE centre. The
      // collision box is still (len, h, thick) — the look jitters inside it.
      const m = new THREE.Mesh(geometry, material || this.mat);
      m.position.set(x, 0, z);
      m.rotation.y = yaw;
      this.group.add(m);
      this.walls.push({ x, z, yaw, len, h, thick, mesh: m, tag, cos: Math.cos(yaw), sin: Math.sin(yaw) });
      return;
    }
    const geo = new THREE.BoxGeometry(len, h, thick);
    // the floor shader tiles its map uRepeat times across the 52-unit disc;
    // scale each face's uv so a wall's plates are the same size underfoot
    const uv = geo.getAttribute('uv');
    const per = 52 / 10; // world units per tile at uRepeat 10
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (len / per), uv.getY(i) * (h / per));
    const mesh = new THREE.Mesh(geo, material || this.mat);
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

  /**
   * v42: push a point out of any wall it is inside, horizontally, and return
   * the wall it was pushed from. This is what makes rock an OBSTACLE for the
   * swarm rather than scenery it drifts through: `main.js` runs it over every
   * enemy, so a skull has to come round a pile instead of through it.
   * A body above the wall's top is left alone — that is what flying over is.
   */
  pushOut(pos, radius = 0.6, foot = 0) {
    let hit = null;
    for (const w of this.walls) {
      if (pos.y - foot > w.h) continue;
      const dx = pos.x - w.x, dz = pos.z - w.z;
      const u = dx * w.cos - dz * w.sin, v = dx * w.sin + dz * w.cos;
      const hu = w.len / 2 + radius, hv = w.thick / 2 + radius;
      if (Math.abs(u) >= hu || Math.abs(v) >= hv) continue;
      const pu = hu - Math.abs(u), pv = hv - Math.abs(v);
      let nu = 0, nv = 0;
      if (pv <= pu) nv = Math.sign(v) || 1; else nu = Math.sign(u) || 1;
      const push = Math.min(pu, pv);
      pos.x += (nu * w.cos + nv * w.sin) * push;
      pos.z += (-nu * w.sin + nv * w.cos) * push;
      hit = w;
    }
    return hit;
  }

  /** Does the segment p0→p1 enter any wall? Rock stops a nail; the test is
   *  a slab test in the wall's own frame so a fast projectile cannot tunnel. */
  blocks(p0, p1) {
    for (const w of this.walls) {
      const u0 = (p0.x - w.x) * w.cos - (p0.z - w.z) * w.sin, v0 = (p0.x - w.x) * w.sin + (p0.z - w.z) * w.cos;
      const u1 = (p1.x - w.x) * w.cos - (p1.z - w.z) * w.sin, v1 = (p1.x - w.x) * w.sin + (p1.z - w.z) * w.cos;
      let tmin = 0, tmax = 1, out = false;
      for (const [o, d, lo, hi] of [[u0, u1 - u0, -w.len / 2, w.len / 2], [p0.y, p1.y - p0.y, 0, w.h], [v0, v1 - v0, -w.thick / 2, w.thick / 2]]) {
        if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) { out = true; break; } continue; }
        let t0 = (lo - o) / d, t1 = (hi - o) / d;
        if (t0 > t1) { const s = t0; t0 = t1; t1 = s; }
        if (t0 > tmin) tmin = t0;
        if (t1 < tmax) tmax = t1;
        if (tmin > tmax) { out = true; break; }
      }
      if (!out) return w;
    }
    return null;
  }

  getState() { return { count: this.walls.length, walls: this.walls.map(w => ({ x: +w.x.toFixed(1), z: +w.z.toFixed(1), yaw: +w.yaw.toFixed(2), len: w.len, h: w.h, tag: w.tag })) }; }
}
