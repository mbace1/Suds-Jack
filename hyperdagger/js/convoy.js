import * as THREE from 'three';
import { Skull } from './enemy.js?v=85';
import { Cargo } from './cargo.js?v=85';

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

/** HD-014 (#598, B2 + C2 + D2 + E2): the landspeeders' thruster and road-glow
 *  colour. Mikael's pick, not answered yet (plan Q3) — a ONE-LINE switch:
 *  AMBER matches the season 3 sun and the missile glow (seasons.js haul
 *  gun.glow 2.6/1.3/0.25); CYAN is the cool contrast. */
export const HOVER_GLOWS = { AMBER: [2.6, 1.3, 0.25], CYAN: [0.3, 1.6, 2.4] };
export const HOVER_GLOW = HOVER_GLOWS.AMBER;
// C2 float: the child keel's own slow bob (u) and roll lag (rad), 0.8–1.2 Hz.
// Visual only — the group (deck, crates, topAt) keeps its 0.07 bob.
const FLOAT_AMP = 0.06, FLOAT_ROLL = 0.025;
const KEEL_H = 0.45;
// HD-014 step 4 (F2 STALL): a jackknifed truck's thrusters fade to red and
// sputter, its keel stops floating and sags; a wrecked one (the pile-up)
// grounds — the keel drops until the pods touch the road. Visual only, on the
// child keel/pods and the world-space pool: the group, the deck, the crates
// and every rule stay where they were.
const STALL_RED = [1.9, 0.12, 0.06];   // the brake-light red (EDGE_BRAKE)
const STALL_SAG = 0.3, STALL_LIST = 0.09, STALL_RATE = 1.4;   // u, rad, 1/s           // the tapered underside, inside CHASSIS (1.1)
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

/** move the vertices of a box that pass `sel` toward its centre line: x by
 *  kx, z by kz, then z back by `dz(v)` (B2's taper and the canopy's rake).
 *  `parameters` stay the box's own, so the box still reads as w × h × d. */
function taper(geo, sel, kx, kz, dz = () => 0) {
  const a = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < a.count; i++) {
    v.fromBufferAttribute(a, i);
    if (!sel(v)) continue;
    a.setXYZ(i, v.x * kx, v.y, v.z * kz + dz(v));
  }
  a.needsUpdate = true;
  geo.computeBoundingBox(); geo.computeBoundingSphere();
}

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
    this.cargo = new Cargo(scene);   // v53: the loads
    this.jackknifed = 0;
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
    // HD-014: shared by every truck (one geometry, one material each — the
    // pulse is a colour lerp on the shared material, once a frame)
    const g = new THREE.Color(...HOVER_GLOW);
    this.podGeo = new THREE.CylinderGeometry(0.22, 0.3, 0.32, 8);
    this.podMat = new THREE.MeshBasicMaterial({ color: g.clone(), fog: false });
    this.finGeo = box(0.06, 0.34, 1);
    this.poolGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    // a soft pool, not a slab: a radial falloff drawn once
    const pc = document.createElement('canvas'); pc.width = pc.height = 64;
    const px = pc.getContext('2d'), rg = px.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, '#fff'); rg.addColorStop(0.45, 'rgba(255,255,255,0.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    px.fillStyle = rg; px.fillRect(0, 0, 64, 64);
    this.poolTex = new THREE.CanvasTexture(pc);
    this.poolMat = new THREE.MeshBasicMaterial({ map: this.poolTex, color: g.clone().multiplyScalar(0.35), transparent: true, opacity: 0.7,
      blending: THREE.AdditiveBlending, depthWrite: false });
    this.glow = g;
    // F2: the stalled pods and pool share their own pair, so a stall is a
    // material swap on that truck (no per-truck materials, no new draws)
    this.stallMix = new THREE.Color(...STALL_RED);
    this.podStallMat = new THREE.MeshBasicMaterial({ color: this.stallMix.clone(), fog: false });
    this.poolStallMat = this.poolMat.clone();
    this.poolStallMat.color.copy(this.stallMix).multiplyScalar(0.22);
    this.shared = new Set([this.podGeo, this.podMat, this.finGeo, this.poolGeo, this.poolMat, this.podStallMat, this.poolStallMat]);
  }

  setVisible(v) {
    if (!this.built) return;
    this.road.visible = v; this.plain.visible = v;
    for (const s of this.strips) s.visible = v;
  }

  clear() {
    for (const t of this.trucks) this._remove(t);
    this.trucks.length = 0;
    this.cargo.clear();
    this.jackknifed = 0;
    this.carryX = 0; this.carryZ = 0; this.standing = null;
    this.setVisible(false);
  }

  _remove(t) {
    this.scene.remove(t.group);
    t.group.traverse(o => {
      if (o.isMesh || o.isLineSegments) {
        if (!this.shared.has(o.geometry)) o.geometry.dispose();
        if (!this.shared.has(o.material)) o.material.dispose();
      }
    });
    if (t.pool) this.scene.remove(t.pool);   // world-space, shared geo/mat
  }

  /** A truck: trailer (the floor), cab in front, an outline and brake
   *  lights. HD-014: no wheels (the trucks become landspeeders), and every
   *  part is NAMED so later steps can find it: 'hull' (the trailer body),
   *  'deck' (the roof slab you land on), 'edge', 'cab', 'glass', 'brake'.
   *  HD-014 step 3 (B2 skiff): the hull's underside is tapered, the cab is a
   *  canopy pod (its box and centre unchanged — the gaze locks it), and a
   *  child 'keel' under the hull carries the 'fin's and four thruster 'pod's
   *  at the old axle positions. The keel floats (C2) on its own; the group,
   *  the hull and the deck do not move any more than they did. The road
   *  'pool' (E2) is world-space, so it does not tilt with the truck.
   *  Its group's origin is the CENTRE OF THE TRAILER TOP, so the tilt is about the point you stand on and topAt() stays exact. */
  _truck(lane, z, speed, depth = 7 + Math.random() * 4.5) {
    const c = this.cfg;
    const w = 2.6 + Math.random() * 0.8;
    const trailerH = 2.0 + Math.random() * 1.8;          // tops from −0.1 to +1.7: up and down, not level
    const top = ROAD_Y + CHASSIS + trailerH;
    const group = new THREE.Group();
    group.name = 'truck';
    const trailerCol = TRAILERS[Math.floor(Math.random() * TRAILERS.length)];
    const hullGeo = box(w, trailerH, depth);
    taper(hullGeo, v => v.y < 0, 0.8, 1);            // B2: the bottom face narrows; the top face is the deck, untouched
    const trailer = new THREE.Mesh(hullGeo, mat(trailerCol));
    trailer.position.y = -trailerH / 2;
    trailer.name = 'hull';
    group.add(trailer);
    // a lighter roof: the surface you land on reads first
    const roof = new THREE.Mesh(box(w * 0.96, 0.06, depth * 0.98), mat(_c.setHex(trailerCol).offsetHSL(0, -0.05, 0.12).getHex()));
    roof.position.y = 0.01;
    roof.name = 'deck';
    group.add(roof);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(trailer.geometry), new THREE.LineBasicMaterial({ color: EDGE, fog: false }));
    edge.position.copy(trailer.position);
    edge.name = 'edge';
    group.add(edge);
    // the cab: lower than the trailer, in front of it (−z)
    const cabH = 2.3, cabL = 2.6;
    const cabGeo = box(w * 0.92, cabH, cabL);
    taper(cabGeo, v => v.y > 0, 0.72, 1, v => (v.z < 0 ? cabL * 0.45 : 0));   // a canopy: narrow, raked-back top
    const cab = new THREE.Mesh(cabGeo, mat(CABS[Math.floor(Math.random() * CABS.length)]));
    cab.name = 'cab';
    cab.position.set(0, -(top - (ROAD_Y + CHASSIS * 0.6)) + cabH / 2, -(depth / 2 + cabL / 2 + 0.25));
    group.add(cab);
    const glass = new THREE.Mesh(box(w * 0.7, 0.9, 0.05), mat(0x8fa8b0));
    glass.name = 'glass';
    // the canopy pane, laid on the raked front (the face leans 0.45·cabL back
    // over its height); 70% of the way up it
    glass.position.set(0, cab.position.y + cabH * 0.2, cab.position.z - cabL / 2 + cabL * 0.45 * 0.7 - 0.04);
    glass.rotation.x = Math.atan2(cabL * 0.45, cabH);
    group.add(glass);
    // brake lights on the back of the trailer (+z)
    const brakeMat = new THREE.MeshBasicMaterial({ color: 0x3a0806, fog: false });
    for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(box(0.45, 0.25, 0.06), brakeMat);
      b.name = 'brake';
      b.position.set(sx * (w / 2 - 0.4), -trailerH + 0.35, depth / 2 + 0.04);
      group.add(b);
    }
    // B2 + D2: the keel — a narrower box under the hull — with side fins and
    // four thruster pods where the axles were; C2 floats it in _hover()
    const keel = new THREE.Mesh(box(w * 0.6, KEEL_H, depth * 0.86), mat(_c.setHex(trailerCol).offsetHSL(0, 0, -0.12).getHex()));
    keel.name = 'keel';
    const keelY = -trailerH - KEEL_H / 2;
    keel.position.y = keelY;
    for (const sx of [-1, 1]) {
      const fin = new THREE.Mesh(this.finGeo, keel.material);
      fin.name = 'fin';
      fin.scale.z = depth * 0.5;
      fin.position.set(sx * (w * 0.3 + 0.03), 0, depth * 0.12);
      fin.rotation.z = sx * 0.5;
      keel.add(fin);
      for (const pz of [depth * 0.31, -depth * 0.3]) {
        const pod = new THREE.Mesh(this.podGeo, this.podMat);
        pod.name = 'pod';
        pod.position.set(sx * (w * 0.3 - 0.1), -KEEL_H / 2 - 0.12, pz);
        keel.add(pod);
      }
    }
    group.add(keel);
    // E2: a glow pool on the asphalt, world-space (posed in _hover)
    const pool = new THREE.Mesh(this.poolGeo, this.poolMat);
    pool.name = 'pool';
    pool.scale.set(w * 1.5, 1, depth * 1.15);
    pool.renderOrder = 1;
    this.scene.add(pool);
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
      // v53 THE JACKKNIFE: three missiles in the cab and the truck folds — it
      // brakes to a crawl, swings its trailer across the lane and spills its
      // load. `proxy` is what the gaze locks: alive while the cab is whole.
      hp: 3, jack: 0, jackYaw: 0, jackDir: Math.random() < 0.5 ? -1 : 1, jacked: false,
      cabLocal: new THREE.Vector3(0, cab.position.y, cab.position.z),
      keel, keelY, pool,
    };
    // C2: 0.8–1.2 Hz off the truck's own phase — no new Math.random, so the
    // RNG stream (and so every deck) is the one it was
    t.floatW = Math.PI * 2 * (0.8 + 0.4 * t.ph / 6.28);
    t.proxy = { isTruck: true, truck: t, alive: true, radius: 1.6, type: 'truck',
      center: (v) => v.copy(t.cabLocal).applyEuler(t.group.rotation).add(t.group.position) };
    group.position.set(t.x, top, z);
    this._hover(t);
    this.trucks.push(t);
    this.cargo.load(t);   // v53: cargo, not decks
    return t;
  }

  /** the height of truck `t`'s tilted top under (x, z), or null off its footprint —
   *  or of a welded crate riding on it, when one is under the feet (v53) */
  topAt(t, x, z, reach = Infinity) {
    const g = t.group.position;
    const lx = x - g.x, lz = z - g.z;
    if (Math.abs(lx) > t.w / 2 + 0.3 || Math.abs(lz) > t.depth / 2 + 0.3) return null;
    const top = g.y + lx * Math.tan(t.group.rotation.z) - lz * Math.tan(t.group.rotation.x);
    const crate = this.cargo.topAt(x, z);
    // a crate too tall to step onto is not a hole in the deck: the deck is
    // still under you (it used to drop the whole truck, so a crate at your
    // feet put the road under you and killed you on the first frame)
    return crate !== null && crate > top && crate <= reach ? crate : top;
  }

  /** v53: a missile in the cab. The third one jackknifes the truck. */
  hit(t) {
    if (t.jacked) return false;
    t.hp--;
    this.cargo.jolt(t, 1.5);
    if (t.hp > 0) return false;
    t.jacked = true; t.jack = 2.0; t.ts = 2; t.brakeT = 1.2;
    t.proxy.alive = false;
    this.cargo.jolt(t, 6);
    this.jackknifed++;
    return true;
  }

  /** v53 THE PILE-UP: a truck folds and STOPS where it is — the finale's wall */
  wreck(t) {
    if (!t.jacked) { t.hp = 0; t.jacked = true; t.jack = 2.0; t.proxy.alive = false; this.cargo.jolt(t, 6); this.jackknifed++; }
    t.wrecked = true; t.ts = 0; t.brakeT = 0;
    return t;
  }

  /** what the gaze may lock besides the skulls: every whole cab in the convoy */
  targets() {
    const out = [];
    for (const t of this.trucks) if (t.proxy.alive) out.push(t.proxy);
    return out;
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
    this._hover(first);
    this._layAhead(0);
    // spawn ON whatever is at the spawn point: the deck, or a crate loaded there
    const spawnY = this.topAt(first, first.group.position.x, 0) ?? first.top;
    player.feet.set(first.group.position.x, spawnY, 0);
    player.velocity.set(0, 0, 0);
    player.vy = 0;
    player.floorY = spawnY;
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
      const h = this.topAt(t, player.feet.x, player.feet.z, player.feet.y + 0.45);
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
      -t.vx * 0.035 + t.jackYaw,
      t.roll0 + Math.sin(t.age * 1.7 + t.ph) * this.cfg.jostle + lean + t.jackYaw * 0.18,
    );
    g.position.set(t.x, t.top + Math.sin(t.age * t.bobW + t.ph) * this.cfg.bob, t.z);
  }

  /** HD-014 C2 + E2, visual only: the keel floats under the hull, and the
   *  road glow sits under the truck. Reads the group; never writes it. */
  _hover(t, dt = 0) {
    const k = t.keel, a = t.age * t.floatW + t.ph2;
    // F2: 0 → 1 over ~0.7 s once the truck has jackknifed (or been wrecked)
    if (t.jacked && !t.stalled) this._stall(t);
    else if (!t.jacked && t.stalled) this._stall(t, false);   // a fold undone (a reset): thrusters back
    t.stallK = t.jacked ? Math.min(1, (t.stallK || 0) + dt * STALL_RATE) : 0;
    const s = t.stallK || 0, float = Math.sin(a) * FLOAT_AMP * (1 - s);
    // the sag: STALL_SAG below the float; wrecked, all the way down until the
    // pods' feet touch the road (group y is the deck, so the road is −(y − ROAD_Y))
    const ground = -(t.group.position.y - ROAD_Y) + KEEL_H / 2 + 0.12 + 0.16;
    const low = t.wrecked ? ground : t.keelY - STALL_SAG;
    k.position.y = t.keelY + float + (low - t.keelY) * s;
    k.rotation.z = Math.sin(a - 0.9) * FLOAT_ROLL * (1 - s) + t.jackDir * STALL_LIST * s;   // it lists to the fold
    const g = t.group.position;
    t.pool.position.set(g.x, ROAD_Y + 0.02, g.z + 0.3);
    t.pool.rotation.y = t.group.rotation.y;
  }

  /** F2: this truck's pods and pool go to the shared stall pair (or back) */
  _stall(t, on = true) {
    t.stalled = on;
    t.keel.traverse(o => { if (o.name === 'pod') o.material = on ? this.podStallMat : this.podMat; });
    t.pool.material = on ? this.poolStallMat : this.poolMat;
  }

  update(dt, player, gameTime, enemies) {
    const c = this.cfg;
    // F2: the stalled ones sputter — dim red, with a cough now and then
    if (this.podStallMat) {
      const cough = Math.sin(gameTime * 23) * Math.sin(gameTime * 7.1) > 0.55 ? 0.15 : 0.45 + 0.1 * Math.sin(gameTime * 13);
      this.podStallMat.color.copy(this.stallMix).multiplyScalar(cough);
      this.poolStallMat.opacity = 0.7 * (cough + 0.2);
    }
    // D2: the pods pulse — one colour lerp on the shared material
    if (this.podMat) this.podMat.color.copy(this.glow).multiplyScalar(0.8 + 0.2 * Math.sin(gameTime * 9));
    for (const t of this.trucks) {
      // THINK: a new speed every few seconds, and sometimes a hard brake
      t.nextThink -= dt;
      if (t.nextThink <= 0) {
        t.nextThink = 2.5 + Math.random() * 3;
        if (Math.random() < c.brakeChance) { t.brakeT = 1.4; t.ts = c.speed - c.speedVar - 7; }
        else t.ts = c.speed + (Math.random() * 2 - 1) * c.speedVar;
      }
      if (t.brakeT > 0) { t.brakeT -= dt; if (t.brakeT <= 0) t.ts = t.jacked ? 2 : c.speed + (Math.random() - 0.5) * c.speedVar; }
      if (t.jacked) {
        // the fold: the trailer swings out over a second and stays swung; it crawls
        t.jack = Math.max(0, t.jack - dt);
        t.jackYaw += (t.jackDir * 0.7 - t.jackYaw) * Math.min(1, dt * 2.2);
        t.ts = Math.min(t.ts, t.wrecked ? 0 : 2);
      }
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
      t.spd = t.wrecked ? Math.max(0, t.spd) : Math.max(4, t.spd);
      // steer to the lane's centre
      const tx = LANES[t.lane];
      const wantVx = Math.max(-c.laneSpeed, Math.min(c.laneSpeed, (tx - t.x) * 1.4));
      t.vx += (wantVx - t.vx) * Math.min(1, dt * 3);
      t.x += t.vx * dt;
      t.vz = -t.spd;
      t.z += t.vz * dt;
      this._pose(t, dt);
      this._hover(t, dt);
      t.brakeMat.color.copy(t.brakeT > 0 || want < t.spd - 1 ? EDGE_BRAKE : _c.setHex(0x3a0806));
      t.edge.material.color.copy(t.brakeT > 0 ? EDGE_BRAKE : EDGE);
    }
    this.cargo.update(dt, this.trucks, player.feet.z, ROAD_Y);   // v53
    this._layAhead(player.feet.z);
    for (let i = this.trucks.length - 1; i >= 0; i--) {
      const t = this.trucks[i];
      // behind you, or run away far ahead: gone (a runaway is replaced by the laying)
      if (t.z > player.feet.z + 40 || t.z < player.feet.z - this.cfg.ahead - 60) { this._remove(t); this.trucks.splice(i, 1); }
    }
    // skulls come down the road at you — they are what the look is for
    const rate = (0.25 + Math.min(0.9, gameTime * 0.016)) * (c.skullMul ?? 1);
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
