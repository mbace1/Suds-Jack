// Props — the set dressing, and where the surrealism actually lives. Placed
// deterministically per tile from a seeded RNG, so the world is the same every
// run. Nothing spawns on the canyon floor: the rift is the racing line.
//
// New this pass: the BRIDGES. Each road crossing is carried over the rift on
// a deck between the rims, with piers down to the floor. The deck is drivable
// (terrain.groundUnder knows about it) and the floor under it is runnable.
// The bridge is placed by the one tile that contains the canyon centreline at
// that crossing, so it is built exactly once.
import * as THREE from 'three';
import { PAL } from './palette.js?v=4';

export function makePropKit() {
  const lam = (c) => new THREE.MeshLambertMaterial({ color: c });
  return {
    geo: {
      slab: new THREE.BoxGeometry(1, 1, 1),
      spire: new THREE.ConeGeometry(1, 1, 5),
      rock: new THREE.DodecahedronGeometry(1, 0),
      shard: new THREE.OctahedronGeometry(1, 0),
      bar: new THREE.BoxGeometry(1, 1, 1),
      scrub: new THREE.ConeGeometry(1, 1, 4),
      pier: new THREE.CylinderGeometry(1, 1.3, 1, 8),
    },
    mat: {
      mono: lam(PAL.monolith), monoLit: lam(PAL.monoLit),
      arch: lam(PAL.arch), rock: lam(PAL.rock), rockDark: lam(PAL.rockDark),
      floater: lam(PAL.floater), scrub: lam(PAL.scrub),
      bridge: lam(PAL.bridge), bridgeLit: lam(PAL.bridgeLit),
      glow: new THREE.MeshBasicMaterial({ color: PAL.glow }),
    },
  };
}

export function populate(terrain, group, i, j, TILE) {
  const rnd = terrain.rng(i, j);
  const k = terrain.kit;
  const x0 = i * TILE - TILE / 2, z0 = j * TILE - TILE / 2;
  const _c = {}, _r = {};

  const place = (mesh, x, z, lift = 0) => {
    mesh.position.set(x, terrain.height(x, z) + lift, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };

  const cMid = terrain.canyon(x0 + TILE / 2, z0 + TILE / 2, _c);
  const overRift = cMid.d < 1.25 && cMid.df > 0.4;

  // ---- the bridge, if a crossing runs through this tile over the rift -----
  const road = terrain.roadAt(z0 + TILE / 2, _r);
  if (road.z >= z0 && road.z < z0 + TILE) {
    const cx = terrain.canyonX(road.z);
    if (cx >= x0 && cx < x0 + TILE) {
      const c = terrain.canyon(cx, road.z, _c);
      if (c.df > 0.4) {
        const span = c.W * 1.12;
        const yl = terrain.plain(cx - span, road.z) + 1.2, yr = terrain.plain(cx + span, road.z) + 1.2;
        const deck = new THREE.Mesh(k.geo.slab, k.mat.bridgeLit);
        deck.scale.set(span * 2 + 6, 2.4, 15);
        deck.position.set(cx, (yl + yr) / 2 - 1.2, road.z);
        deck.rotation.z = Math.atan2(yr - yl, span * 2);
        deck.castShadow = true; deck.receiveShadow = true;
        group.add(deck);
        for (const side of [-1, 1]) {           // parapets
          const p = new THREE.Mesh(k.geo.slab, k.mat.bridge);
          p.scale.set(span * 2 + 6, 1.6, 0.8);
          p.position.set(cx, (yl + yr) / 2 + 0.9, road.z + side * 7.4);
          p.rotation.z = deck.rotation.z;
          group.add(p);
        }
        const n = Math.max(2, Math.round(span / 22));   // piers down to the floor
        for (let s = 1; s < n; s++) {
          const x = cx - span + (2 * span) * s / n;
          const floor = terrain.height(x, road.z);
          const top = yl + (yr - yl) * s / n - 1.2;
          const pier = new THREE.Mesh(k.geo.pier, k.mat.bridge);
          const h = Math.max(4, top - floor + 2);
          pier.scale.set(2.2, h, 2.2);
          pier.position.set(x, floor + h / 2 - 2, road.z);
          pier.castShadow = true;
          group.add(pier);
          // a pier is a boulder as far as the sled is concerned
          (group.userData.rocks = group.userData.rocks || []).push({ x, z: road.z, r: 2.6 });
        }
      }
    }
  }

  // ---- monoliths: rows of slabs, too regular to be natural ---------------
  if (!overRift && rnd() < 0.16) {
    const n = 2 + Math.floor(rnd() * 4);
    const bx = x0 + rnd() * TILE, bz = z0 + rnd() * TILE;
    const ang = rnd() * Math.PI, h = 16 + rnd() * 26;
    for (let s = 0; s < n; s++) {
      const d = s * (9 + rnd() * 5);
      const x = bx + Math.cos(ang) * d, z = bz + Math.sin(ang) * d;
      if (terrain.roadAt(z, _r).on) continue;
      const m = new THREE.Mesh(k.geo.slab, s % 2 ? k.mat.monoLit : k.mat.mono);
      const hh = h * (1 - s * 0.13);
      m.scale.set(3.4 + rnd() * 2, hh, 1.4 + rnd());
      m.rotation.y = ang + (rnd() - 0.5) * 0.3;
      m.rotation.z = (rnd() - 0.5) * 0.06;
      place(m, x, z, hh / 2 - 1.5);
    }
  }

  // ---- an arch, with nothing holding it up -------------------------------
  if (!overRift && rnd() < 0.07) {
    const x = x0 + rnd() * TILE, z = z0 + rnd() * TILE;
    const span = 26 + rnd() * 30, rise = 18 + rnd() * 18;
    const g = new THREE.Group();
    const segs = 9;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs, a = Math.PI * t;
      const m = new THREE.Mesh(k.geo.bar, k.mat.arch);
      m.position.set(-Math.cos(a) * span / 2, Math.sin(a) * rise, 0);
      m.scale.set(span / segs * 1.25, 4.5 + Math.sin(a) * 2.5, 5 + rnd() * 2);
      m.rotation.z = -a + Math.PI / 2;
      m.castShadow = true;
      g.add(m);
    }
    g.rotation.y = rnd() * Math.PI;
    g.position.set(x, terrain.height(x, z) - 2, z);
    group.add(g);
  }

  // ---- floating rock ------------------------------------------------------
  if (rnd() < 0.12) {
    const x = x0 + rnd() * TILE, z = z0 + rnd() * TILE;
    const r = 3 + rnd() * 7;
    const m = new THREE.Mesh(k.geo.rock, k.mat.floater);
    m.scale.set(r, r * (0.5 + rnd() * 0.5), r * (0.8 + rnd() * 0.5));
    m.rotation.set(rnd() * 3, rnd() * 6, rnd() * 3);
    place(m, x, z, 22 + rnd() * 46);
    m.userData.spin = (rnd() - 0.5) * 0.09;
    m.userData.bob = rnd() * 6.28;
    m.userData.y0 = m.position.y;
    (group.userData.floaters = group.userData.floaters || []).push(m);
    if (rnd() < 0.5) {
      const s = new THREE.Mesh(k.geo.shard, k.mat.floater);
      s.scale.setScalar(r * 0.3);
      s.position.set(m.position.x + r * 2.2, m.position.y - r * 0.6, m.position.z + r);
      s.castShadow = true;
      group.add(s);
    }
  }

  // ---- rock litter, off the floor and off the roads ----------------------
  const rocks = 3 + Math.floor(rnd() * 5);
  for (let s = 0; s < rocks; s++) {
    const x = x0 + rnd() * TILE, z = z0 + rnd() * TILE;
    const c = terrain.canyon(x, z, _c);
    if (c.d < 0.75 && c.df > 0.4) continue;
    if (terrain.roadAt(z, _r).off < 14) continue;
    const r = 1.1 + rnd() * 3.4;
    const m = new THREE.Mesh(k.geo.rock, rnd() < 0.5 ? k.mat.rock : k.mat.rockDark);
    m.scale.set(r, r * (0.5 + rnd() * 0.5), r * (0.7 + rnd() * 0.6));
    m.rotation.set(rnd() * 3, rnd() * 6, rnd() * 3);
    place(m, x, z, -r * 0.35);
    (group.userData.rocks = group.userData.rocks || []).push({ x, z, r: r * 1.1 });
  }

  // ---- spires ------------------------------------------------------------
  if (!overRift && rnd() < 0.2) {
    const n = 1 + Math.floor(rnd() * 3);
    for (let s = 0; s < n; s++) {
      const x = x0 + rnd() * TILE, z = z0 + rnd() * TILE;
      if (terrain.roadAt(z, _r).off < 12) continue;
      const h = 14 + rnd() * 34;
      const m = new THREE.Mesh(k.geo.spire, k.mat.rockDark);
      m.scale.set(2.2 + rnd() * 2, h, 2.2 + rnd() * 2);
      m.rotation.y = rnd() * 3;
      place(m, x, z, h / 2 - 2);
    }
  }

  // ---- scrub -------------------------------------------------------------
  for (let s = 0; s < 6; s++) {
    const x = x0 + rnd() * TILE, z = z0 + rnd() * TILE;
    const c = terrain.canyon(x, z, _c);
    if (c.d < 0.6 && c.df > 0.4) continue;
    if (terrain.roadAt(z, _r).on) continue;
    const r = 0.5 + rnd() * 1.1;
    const m = new THREE.Mesh(k.geo.scrub, k.mat.scrub);
    m.scale.set(r, r * 1.6, r); m.rotation.y = rnd() * 3;
    m.position.set(x, terrain.height(x, z) + r * 0.6, z);
    group.add(m);
  }
}
