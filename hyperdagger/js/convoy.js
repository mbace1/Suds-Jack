import * as THREE from 'three';
import { Skull } from './enemy.js?v=83';

/**
 * THE CONVOY — season 3 (HAUL) as Clustertruck (owner, 2026-09-23): *the
 * platforms need to feel lopsided, fast moving, etc. The environment can be
 * abstract but needs more.*
 *
 * TRUCKS, not slabs. Each one is a trailer you stand on and a cab in front
 * of it, at a trailer height of its own (so the next truck is up or down from
 * this one, not level with it), LOPSIDED — a standing roll and pitch it was
 * loaded with, a suspension bob, a lean into its own lane changes and a dip
 * of the nose when it brakes. They are FAST (20 u/s give or take three) and
 * they are not a train: every truck picks a new speed every few seconds,
 * changes lanes, and now and then brakes hard (its brake lights say so). A
 * truck closing on the one ahead in its lane follows it instead of driving
 * through it.
 *
 * The body is CARRIED by the truck under it and keeps that velocity in the
 * air — Clustertruck's momentum. The floor under the feet is the trailer's
 * TILTED top at the exact point you stand on, and a standing body is held to
 * it (a bob that drops away under the feet would read as a fall and spend a
 * jump — the same trap v46's gel mounds found). Touching the ROAD is death.
 *
 * THE ROUTE. A new truck is laid off the front one — its lane or the next,
 * a gap of 1.5 to 5 units, a speed near its own — so there is always a way
 * forward; a second truck beside it, some of the time, makes the cluster.
 *
 * THE ROADSIDE (abstract, owner's word): a lit road with lane marks, barrier
 * posts, pylons with red lamps, monoliths standing off in the dusk, and a
 * gantry over the road every so often. All of it is laid by INDEX along the
 * world's z and hashed, so a piece recycled out of the pool comes back as
 * the same piece in the same place — a roadside that reshuffles as you look
 * at it is noise, not a place.
 */
export const ROAD_Y = -3.2;
export const LANES = [-6, -2, 2, 6];
const CHASSIS = 1.1;           // road to trailer floor
const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

const TRAILERS = [0x7a6450, 0x9a8a70, 0x46686a, 0x654f68, 0x8a4834, 0xa89c84, 0x55624a];
const CABS = [0x2a2a2e, 0x3a2620, 0x22303a, 0x3a3a30];
const EDGE = new THREE.Color(1.5, 0.62, 0.2);
const EDGE_BRAKE = new THREE.Color(1.9, 0.18, 0.1);

/** deterministic 0…1 from an integer (and a salt) */
function hash(i, salt = 0) {
  let h = (i * 374761393 + salt * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function roadTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#121113'; g.fillRect(0, 0, 256, 256);
  // asphalt grain
  for (let i = 0; i < 900; i++) {
    const v = 14 + Math.floor(Math.random() * 14);
    g.fillStyle = `rgb(${v},${v},${v + 2})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  // road is 28 wide across 256 px: x = (u − 14) · 256/28
  const px = u => (u + 14) * 256 / 28;
  g.fillStyle = '#c9b48a';
  for (const u of [-4, 0, 4]) g.fillRect(px(u) - 2, 0, 4, 128);      // dashed lane marks (half the tile)
  g.fillStyle = '#d8c79a';
  for (const u of [-8.4, 8.4]) g.fillRect(px(u) - 2, 0, 4, 256);     // solid edge lines
  g.fillStyle = '#0b0a0b';
  g.fillRect(0, 0, px(-9), 256); g.fillRect(px(9), 0, 256 - px(9), 256); // shoulders
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.ClampToEdgeWrapping; t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const ROAD_LEN = 480, ROAD_TILE = 16;

/** Instanced pieces laid by index along −z; `place(i, m)` fills a matrix and
 *  returns a colour or null. Only the indices in view are drawn. */
class Strip {
  constructor(scene, geo, mat, spacing, max, place) {
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    scene.add(this.mesh);
    this.spacing = spacing; this.max = max; this.place = place;
  }
  update(z) {
    const s = this.spacing;
    const k0 = Math.floor(-(z + 40) / s), k1 = Math.ceil(-(z - 260) / s);
    let n = 0;
    for (let k = k0; k <= k1 && n < this.max; k++) {
      const col = this.place(k, _m);
      if (col === false) continue;
      this.mesh.setMatrixAt(n, _m);
      if (col) this.mesh.setColorAt(n, col);
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
  set visible(v) { this.mesh.visible = v; }
  dispose(scene) { scene.remove(this.mesh); this.mesh.geometry.dispose(); this.mesh.material.dispose(); }
}

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const mat = (col, fog = true) => new THREE.MeshBasicMaterial({ color: col, fog });

function compose(x, y, z, sx, sy, sz, ry = 0, m = _m) {
  _e.set(0, ry, 0); _q.setFromEuler(_e);
  return m.compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
}

export class Convoy {
  constructor(scene) {
    this.scene = scene;
    this.trucks = [];
    this.cfg = null;
    this.carryX = 0; this.carryZ = 0;
    this.standing = null;
    this.built = false;
  }

  /** the gate and the loop harness read `platforms` the way they read the old road */
  get platforms() { return this.trucks; }

  _build() {
    if (this.built) return;
    this.built = true;
    const sc = this.scene;
    this.roadTex = roadTexture();
    this.roadTex.repeat.set(1, ROAD_LEN / ROAD_TILE);
    this.road = new THREE.Mesh(new THREE.PlaneGeometry(28, ROAD_LEN).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: this.roadTex }));
    this.road.position.y = ROAD_Y;
    sc.add(this.road);
    // beyond the shoulders: a dark plain, so the road is ON something
    this.plain = new THREE.Mesh(new THREE.PlaneGeometry(900, ROAD_LEN + 200).rotateX(-Math.PI / 2), mat(0x0a0706));
    this.plain.position.y = ROAD_Y - 0.05;
    sc.add(this.plain);
    const white = () => new THREE.MeshBasicMaterial({ color: 0xffffff });
    // barrier posts, both shoulders, every 5 u — the thing that says SPEED
    this.posts = new Strip(sc, box(0.35, 1.1, 0.35), white(), 2.5, 260, (k, m) => {
      const side = k & 1 ? 1 : -1, z = -Math.floor(k / 2) * 5;
      compose(side * 10.4, ROAD_Y + 0.55, z, 1, 1, 1, 0, m);
      return _c.setHex(hash(k, 1) < 0.18 ? 0xd07a2a : 0x7a7064);
    });
    // reflectors on the posts: HDR, so the edge of the road is a line of light
    this.lamps = new Strip(sc, box(0.22, 0.22, 0.1), mat(0xffffff, false), 5, 130, (k, m) => {
      const side = k & 1 ? 1 : -1;
      compose(side * 10.4, ROAD_Y + 0.95, -k * 5, 1, 1, 1, 0, m);
      return side < 0 ? _c.setRGB(2.2, 0.5, 0.12) : _c.setRGB(1.6, 1.3, 0.9);
    });
    // pylons: tall, thin, off the road, a red lamp on top
    this.pylons = new Strip(sc, box(0.6, 1, 0.6), white(), 22, 30, (k, m) => {
      const side = hash(k, 2) < 0.5 ? -1 : 1, h = 9 + hash(k, 3) * 16;
      compose(side * (17 + hash(k, 4) * 10), ROAD_Y + h / 2, -k * 22, 1, h, 1, 0, m);
      return _c.setHex(0x2a2226);
    });
    this.pylonLamps = new Strip(sc, box(0.9, 0.5, 0.9), mat(0xffffff, false), 22, 30, (k, m) => {
      const side = hash(k, 2) < 0.5 ? -1 : 1, h = 9 + hash(k, 3) * 16;
      compose(side * (17 + hash(k, 4) * 10), ROAD_Y + h + 0.25, -k * 22, 1, 1, 1, 0, m);
      return _c.setRGB(2.6, 0.2, 0.08);
    });
    // monoliths: big abstract slabs standing off in the dusk — depth, not detail
    this.monoliths = new Strip(sc, box(1, 1, 1), white(), 17, 36, (k, m) => {
      if (hash(k, 5) < 0.3) return false;
      const side = hash(k, 6) < 0.5 ? -1 : 1;
      const w = 4 + hash(k, 7) * 14, h = 6 + hash(k, 8) * hash(k, 9) * 46, d = 3 + hash(k, 10) * 10;
      compose(side * (38 + hash(k, 11) * 70), ROAD_Y + h / 2, -k * 17, w, h, d, hash(k, 12) * 1.2, m);
      const v = 0.05 + hash(k, 13) * 0.07;
      return _c.setRGB(v * 1.3, v * 0.9, v * 0.8);
    });
    // gantries over the road: two posts and a beam, with a strip of light
    this.gantryPosts = new Strip(sc, box(0.7, 12, 0.7), white(), 70, 12, (k, m) => {
      const g = Math.floor(k / 2), side = k & 1 ? 1 : -1;
      if (hash(g, 14) < 0.35) return false;
      compose(side * 11.5, ROAD_Y + 6, -g * 140 - 60, 1, 1, 1, 0, m);
      return _c.setHex(0x3a3436);
    });
    this.gantryBeams = new Strip(sc, box(24, 0.9, 0.9), white(), 140, 6, (k, m) => {
      if (hash(k, 14) < 0.35) return false;
      compose(0, ROAD_Y + 12, -k * 140 - 60, 1, 1, 1, 0, m);
      return _c.setHex(0x3a3436);
    });
    this.gantryLights = new Strip(sc, box(22, 0.25, 0.3), mat(0xffffff, false), 140, 6, (k, m) => {
      if (hash(k, 14) < 0.35) return false;
      compose(0, ROAD_Y + 11.4, -k * 140 - 59.5, 1, 1, 1, 0, m);
      return _c.setRGB(2.4, 1.2, 0.35);
    });
    this.strips = [this.posts, this.lamps, this.pylons, this.pylonLamps, this.monoliths, this.gantryPosts, this.gantryBeams, this.gantryLights];
    // one draw each for the truck parts that have no per-truck state
    this.wheelGeo = box(0.5, 0.9, 0.9);
    this.wheelMat = mat(0x0c0c0d);
  }

  setVisible(v) {
    if (!this.built) return;
    this.road.visible = v; this.plain.visible = v;
    for (const s of this.strips) s.visible = v;
  }

  clear() {
    for (const t of this.trucks) this._remove(t);
    this.trucks.length = 0;
    this.carryX = 0; this.carryZ = 0; this.standing = null;
    this.setVisible(false);
  }

  _remove(t) {
    this.scene.remove(t.group);
    t.group.traverse(o => {
      if (o.isMesh || o.isLineSegments) {
        if (o.geometry !== this.wheelGeo) o.geometry.dispose();
        if (o.material !== this.wheelMat) o.material.dispose();
      }
    });
  }

  /** A truck: trailer (the floor), cab in front, wheels, an outline and
   *  brake lights. Its group's origin is the CENTRE OF THE TRAILER TOP, so
   *  the tilt is about the point you stand on and topAt() stays exact. */
  _truck(lane, z, speed, depth = 7 + Math.random() * 4.5) {
    const c = this.cfg;
    const w = 2.6 + Math.random() * 0.8;
    const trailerH = 2.0 + Math.random() * 1.8;          // tops from −0.1 to +1.7: up and down, not level
    const top = ROAD_Y + CHASSIS + trailerH;
    const group = new THREE.Group();
    const trailerCol = TRAILERS[Math.floor(Math.random() * TRAILERS.length)];
    const trailer = new THREE.Mesh(box(w, trailerH, depth), mat(trailerCol));
    trailer.position.y = -trailerH / 2;
    group.add(trailer);
    // a lighter roof: the surface you land on reads first
    const roof = new THREE.Mesh(box(w * 0.96, 0.06, depth * 0.98), mat(_c.setHex(trailerCol).offsetHSL(0, -0.05, 0.12).getHex()));
    roof.position.y = 0.01;
    group.add(roof);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(trailer.geometry), new THREE.LineBasicMaterial({ color: EDGE, fog: false }));
    edge.position.copy(trailer.position);
    group.add(edge);
    // the cab: lower than the trailer, in front of it (−z)
    const cabH = 2.3, cabL = 2.6;
    const cab = new THREE.Mesh(box(w * 0.92, cabH, cabL), mat(CABS[Math.floor(Math.random() * CABS.length)]));
    cab.position.set(0, -(top - (ROAD_Y + CHASSIS * 0.6)) + cabH / 2, -(depth / 2 + cabL / 2 + 0.25));
    group.add(cab);
    const glass = new THREE.Mesh(box(w * 0.8, 0.6, 0.05), mat(0x8fa8b0));
    glass.position.set(0, cab.position.y + 0.45, cab.position.z - cabL / 2 - 0.03);
    group.add(glass);
    // wheels: three axles under the trailer, one under the cab
    const wy = -(top - ROAD_Y) + 0.45;
    for (const wz of [depth * 0.38, depth * 0.24, -depth * 0.3, cab.position.z]) {
      for (const sx of [-1, 1]) {
        const wh = new THREE.Mesh(this.wheelGeo, this.wheelMat);
        wh.position.set(sx * (w / 2 - 0.15), wy, wz);
        group.add(wh);
      }
    }
    // brake lights on the back of the trailer (+z)
    const brakeMat = new THREE.MeshBasicMaterial({ color: 0x3a0806, fog: false });
    for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(box(0.45, 0.25, 0.06), brakeMat);
      b.position.set(sx * (w / 2 - 0.4), -trailerH + 0.35, depth / 2 + 0.04);
      group.add(b);
    }
    this.scene.add(group);
    const t = {
      group, mesh: group, edge, brakeMat,
      w, depth, trailerH, top,
      lane, x: LANES[lane], z,
      spd: speed, ts: speed, vx: 0, vz: -speed,
      nextThink: 1 + Math.random() * 3, brakeT: 0,
      laneT: 2 + Math.random() * 4,
      roll0: (Math.random() - 0.5) * 2 * c.roll, pitch0: (Math.random() - 0.5) * 2 * c.pitch,
      ph: Math.random() * 6.28, ph2: Math.random() * 6.28, bobW: 2.6 + Math.random() * 1.4,
      age: 0,
    };
    group.position.set(t.x, top, z);
    this.trucks.push(t);
    return t;
  }

  /** the height of truck `t`'s tilted top under (x, z), or null off its footprint */
  topAt(t, x, z) {
    const g = t.group.position;
    const lx = x - g.x, lz = z - g.z;
    if (Math.abs(lx) > t.w / 2 + 0.3 || Math.abs(lz) > t.depth / 2 + 0.3) return null;
    return g.y + lx * Math.tan(t.group.rotation.z) - lz * Math.tan(t.group.rotation.x);
  }

  /** the front of the convoy (most −z) */
  front() {
    let f = null;
    for (const t of this.trucks) if (!f || t.group.position.z < f.group.position.z) f = t;
    return f;
  }

  _layAhead(playerZ) {
    // Lay the road off the frontmost truck WITHIN REACH, not the frontmost
    // truck. The first cut laid off the convoy's very front, so a fast truck
    // that pulled a hundred units clear stopped the laying and left the road
    // in front of you empty — the loop showed a lone truck on a dark road.
    const c = this.cfg, lim = playerZ - c.ahead;
    let f = null;
    for (const t of this.trucks) {
      if (t.z < lim - 20 || t.z > playerZ + 10) continue;
      if (!f || t.z < f.z) f = t;
    }
    if (!f) {
      // nothing ahead at all: put one where a jump can reach it
      f = this._truck(this.standing?.lane ?? 1, playerZ - 14, this.standing?.spd ?? c.speed);
    }
    while (f.z > lim) {
      const d = 7 + Math.random() * 4.5;
      const gap = 1.5 + Math.random() * 3.5;
      const z = f.z - f.depth / 2 - gap - d / 2;
      const lane = Math.max(0, Math.min(LANES.length - 1, f.lane + Math.floor(Math.random() * 3) - 1));
      const spd = Math.max(c.speed - c.speedVar, Math.min(c.speed + c.speedVar, f.ts + (Math.random() - 0.5) * 2));
      const t = this._truck(lane, z, spd, d);
      // the cluster: sometimes a truck alongside, in another lane
      if (Math.random() < c.sideChance) {
        const others = [0, 1, 2, 3].filter(l => Math.abs(l - lane) >= 1 && Math.abs(l - lane) <= 2);
        const l2 = others[Math.floor(Math.random() * others.length)];
        if (l2 !== undefined) this._truck(l2, z + (Math.random() - 0.5) * 6, spd + (Math.random() - 0.5) * 3);
      }
      f = t;
    }
  }

  reset(player) {
    this.clear();
    this._build();
    this.setVisible(true);
    const c = this.cfg;
    // your truck, then the road laid off it
    const first = this._truck(1, 0, c.speed);
    first.roll0 = 0; first.pitch0 = 0;
    this._pose(first, 0);
    this._layAhead(0);
    player.feet.set(first.group.position.x, first.top, 0);
    player.velocity.set(0, 0, 0);
    player.vy = 0;
    player.floorY = first.top;
    player._sync();
    this.carryX = 0; this.carryZ = first.vz;
    this.standing = first;
    this._roadside(0);
  }

  /** put the body back on the nearest truck ahead of it (the harness and the
   *  gate use this where a bot that never jumps would otherwise die) */
  respawnOn(player) {
    let best = null;
    for (const t of this.trucks) {
      const dz = player.feet.z - t.group.position.z;
      if (dz > -2 && (!best || dz < player.feet.z - best.group.position.z)) best = t;
    }
    best ??= this.front();
    if (!best) return;
    player.feet.set(best.group.position.x, best.group.position.y + 0.1, best.group.position.z);
    player.vy = 0;
    this.carryX = best.vx; this.carryZ = best.vz;
  }

  preUpdate(dt, player) {
    // MOMENTUM: carried by the truck under you, and in the air by the one you left
    player.feet.x += this.carryX * dt;
    player.feet.z += this.carryZ * dt;
    let floor = -Infinity, under = null;
    for (const t of this.trucks) {
      const h = this.topAt(t, player.feet.x, player.feet.z);
      if (h === null || h > player.feet.y + 0.45) continue;
      if (h > floor) { floor = h; under = t; }
    }
    // no truck under you: the road is the floor, and main kills you on it
    player.floorY = under ? floor : ROAD_Y;
    if (under && player.vy <= 0 && player.feet.y <= floor + 0.12) {
      player.feet.y = floor;               // HELD to a top that bobs and tilts under you
      this.carryX = under.vx; this.carryZ = under.vz;
      this.standing = under;
    } else {
      this.standing = null;
    }
    return !!under;
  }

  _pose(t, dt) {
    t.age += dt;
    const g = t.group;
    const lean = -t.vx * this.cfg.leanK;                            // into its own lane change
    const dive = Math.max(0, t.brakeT) * this.cfg.diveK;            // nose down when it brakes
    g.rotation.set(
      t.pitch0 + Math.sin(t.age * 2.3 + t.ph2) * this.cfg.jostle * 0.6 - dive,
      -t.vx * 0.035,
      t.roll0 + Math.sin(t.age * 1.7 + t.ph) * this.cfg.jostle + lean,
    );
    g.position.set(t.x, t.top + Math.sin(t.age * t.bobW + t.ph) * this.cfg.bob, t.z);
  }

  update(dt, player, gameTime, enemies) {
    const c = this.cfg;
    for (const t of this.trucks) {
      // THINK: a new speed every few seconds, and sometimes a hard brake
      t.nextThink -= dt;
      if (t.nextThink <= 0) {
        t.nextThink = 2.5 + Math.random() * 3;
        if (Math.random() < c.brakeChance) { t.brakeT = 1.4; t.ts = c.speed - c.speedVar - 7; }
        else t.ts = c.speed + (Math.random() * 2 - 1) * c.speedVar;
      }
      if (t.brakeT > 0) { t.brakeT -= dt; if (t.brakeT <= 0) t.ts = c.speed + (Math.random() - 0.5) * c.speedVar; }
      // LANES: drift to a neighbour, unless someone is beside you there
      t.laneT -= dt;
      if (t.laneT <= 0) {
        t.laneT = 3 + Math.random() * 4;
        const l2 = t.lane + (Math.random() < 0.5 ? -1 : 1);
        if (l2 >= 0 && l2 < LANES.length && !this.trucks.some(o => o !== t && o.lane === l2
          && Math.abs(o.z - t.z) < (o.depth + t.depth) / 2 + 4)) t.lane = l2;
      }
      // FOLLOW: never drive through the truck ahead in your lane
      let limit = Infinity;
      for (const o of this.trucks) {
        if (o === t || Math.abs(o.x - t.x) > 2.4 || o.z > t.z) continue;
        const gap = (t.z - t.depth / 2) - (o.z + o.depth / 2);
        if (gap < 5) limit = Math.min(limit, o.spd - (gap < 1.5 ? 2 : 0));
      }
      const want = Math.min(t.ts, limit);
      const acc = want < t.spd ? (t.brakeT > 0 ? 12 : 7) : 4;
      t.spd += Math.sign(want - t.spd) * Math.min(Math.abs(want - t.spd), acc * dt);
      t.spd = Math.max(4, t.spd);
      // steer to the lane's centre
      const tx = LANES[t.lane];
      const wantVx = Math.max(-c.laneSpeed, Math.min(c.laneSpeed, (tx - t.x) * 1.4));
      t.vx += (wantVx - t.vx) * Math.min(1, dt * 3);
      t.x += t.vx * dt;
      t.vz = -t.spd;
      t.z += t.vz * dt;
      this._pose(t, dt);
      t.brakeMat.color.copy(t.brakeT > 0 || want < t.spd - 1 ? EDGE_BRAKE : _c.setHex(0x3a0806));
      t.edge.material.color.copy(t.brakeT > 0 ? EDGE_BRAKE : EDGE);
    }
    this._layAhead(player.feet.z);
    for (let i = this.trucks.length - 1; i >= 0; i--) {
      const t = this.trucks[i];
      // behind you, or run away far ahead: gone (a runaway is replaced by the laying)
      if (t.z > player.feet.z + 40 || t.z < player.feet.z - this.cfg.ahead - 60) { this._remove(t); this.trucks.splice(i, 1); }
    }
    // skulls come down the road at you — they are what the look is for
    const rate = 0.25 + Math.min(0.9, gameTime * 0.016);
    if (gameTime > c.skullsFrom && Math.random() < dt * rate) {
      const z = player.feet.z - 22 - Math.random() * 16;
      const x = LANES[Math.floor(Math.random() * LANES.length)] + (Math.random() - 0.5) * 2;
      enemies.push(new Skull(this.scene, new THREE.Vector3(x, 2.2 + Math.random() * 2.2, z), 1.5 + gameTime * 0.02));
    }
    this._roadside(player.feet.z);
  }

  _roadside(z) {
    if (!this.built) return;
    // the road moves with you in whole tiles, so its marks stay put in the world
    this.road.position.z = Math.round(z / ROAD_TILE) * ROAD_TILE - ROAD_LEN / 2 + 60;
    this.plain.position.z = this.road.position.z;
    this.plain.position.x = 0;
    for (const s of this.strips) s.update(z);
  }
}
