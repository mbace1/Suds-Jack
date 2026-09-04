// Props — the set dressing, and where the surrealism actually lives.
//
// The terrain on its own is a desert. What makes it somewhere else is what
// stands on it: slabs too regular to be geology, arches with nothing holding
// them up, and rock that hangs in the air and slowly turns. Everything here is
// placed deterministically per tile from a seeded RNG, so the world is the
// same every run and a tile that streams back in comes back identical.
//
// Two rules learned the hard way on the last build:
//   - contrast at distance is a trap. Anything dark and large drawn near the
//     horizon reads as a wall across the frame, so the big silhouettes are
//     kept OFF the deep canyon and lit warm on their sun side.
//   - a prop must never stand where the craft has to drive. Nothing spawns on
//     the canyon floor; the rift is the racing line and it stays clear.
import * as THREE from 'three';
import { PAL } from './palette.js?v=3';

export function makePropKit() {
  const lam = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
  return {
    geo: {
      slab: new THREE.BoxGeometry(1, 1, 1),
      spire: new THREE.ConeGeometry(1, 1, 5),
      rock: new THREE.DodecahedronGeometry(1, 0),
      shard: new THREE.OctahedronGeometry(1, 0),
      bar: new THREE.BoxGeometry(1, 1, 1),
      ring: new THREE.TorusGeometry(1, 0.14, 4, 16),
      scrub: new THREE.ConeGeometry(1, 1, 4),
    },
    mat: {
      mono: lam(PAL.monolith), monoLit: lam(PAL.monoLit),
      arch: lam(PAL.arch), rock: lam(PAL.rock), rockDark: lam(PAL.rockDark),
      floater: lam(PAL.floater),
      scrub: lam(PAL.scrub),
      glow: new THREE.MeshBasicMaterial({ color: PAL.glow }),
      marker: lam(PAL.hull),
    },
  };
}

/** Fill one tile's group with whatever stands on it. */
export function populate(terrain, group, i, j, TILE) {
  const rnd = terrain.rng(i, j);
  const k = terrain.kit;
  const x0 = i * TILE - TILE / 2, z0 = j * TILE - TILE / 2;
  const _c = {};

  const place = (mesh, x, z, lift = 0) => {
    mesh.position.set(x, terrain.height(x, z) + lift, z);
    mesh.castShadow = true;
    group.add(mesh);
    return mesh;
  };

  // How much of this tile is rift? Props stay out of it.
  const cMid = terrain.canyon(x0 + TILE / 2, z0 + TILE / 2, _c);
  const overRift = cMid.d < 1.25 && cMid.df > 0.4;

  // ---- monoliths: rows of slabs, too regular to be natural ---------------
  if (!overRift && rnd() < 0.16) {
    const n = 2 + Math.floor(rnd() * 4);
    const bx = x0 + rnd() * TILE, bz = z0 + rnd() * TILE;
    const ang = rnd() * Math.PI, h = 16 + rnd() * 26;
    for (let s = 0; s < n; s++) {
      const d = s * (9 + rnd() * 5);
      const x = bx + Math.cos(ang) * d, z = bz + Math.sin(ang) * d;
      const m = new THREE.Mesh(k.geo.slab, s % 2 ? k.mat.monoLit : k.mat.mono);
      const hh = h * (1 - s * 0.13);
      m.scale.set(3.4 + rnd() * 2, hh, 1.4 + rnd());
      m.rotation.y = ang + (rnd() - 0.5) * 0.3;
      m.rotation.z = (rnd() - 0.5) * 0.06;      // just off vertical. Unsettling.
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

  // ---- floating rock: the one thing that cannot be explained ------------
  if (rnd() < 0.12) {
    const x = x0 + rnd() * TILE, z = z0 + rnd() * TILE;
    const r = 3 + rnd() * 7;
    const m = new THREE.Mesh(k.geo.rock, k.mat.floater);
    m.scale.set(r, r * (0.5 + rnd() * 0.5), r * (0.8 + rnd() * 0.5));
    m.rotation.set(rnd() * 3, rnd() * 6, rnd() * 3);
    place(m, x, z, 22 + rnd() * 46);
    m.userData.spin = (rnd() - 0.5) * 0.09;    // main.js turns these
    m.userData.bob = rnd() * 6.28;
    m.userData.y0 = m.position.y;
    group.userData.floaters = group.userData.floaters || [];
    group.userData.floaters.push(m);
    // a shard orbiting it, because one floating rock reads as a mistake and
    // two read as a rule
    if (rnd() < 0.5) {
      const s = new THREE.Mesh(k.geo.shard, k.mat.floater);
      const sr = r * 0.3;
      s.scale.setScalar(sr);
      s.position.set(m.position.x + r * 2.2, m.position.y - r * 0.6, m.position.z + r);
      s.castShadow = true;
      group.add(s);
    }
  }

  // ---- rock litter on the flats, boulders along the rim -----------------
  const rocks = 3 + Math.floor(rnd() * 5);
  for (let s = 0; s < rocks; s++) {
    const x = x0 + rnd() * TILE, z = z0 + rnd() * TILE;
    const c = terrain.canyon(x, z, _c);
    if (c.d < 0.75 && c.df > 0.4) continue;          // keep the floor clear
    const r = 1.1 + rnd() * 3.4;
    const m = new THREE.Mesh(k.geo.rock, rnd() < 0.5 ? k.mat.rock : k.mat.rockDark);
    m.scale.set(r, r * (0.5 + rnd() * 0.5), r * (0.7 + rnd() * 0.6));
    m.rotation.set(rnd() * 3, rnd() * 6, rnd() * 3);
    place(m, x, z, -r * 0.35);
    group.userData.rocks = group.userData.rocks || [];
    group.userData.rocks.push({ x, z, r: r * 1.1 });
  }

  // ---- spires, tall and thin, out on the open plain ---------------------
  if (!overRift && rnd() < 0.2) {
    const n = 1 + Math.floor(rnd() * 3);
    for (let s = 0; s < n; s++) {
      const x = x0 + rnd() * TILE, z = z0 + rnd() * TILE;
      const h = 14 + rnd() * 34;
      const m = new THREE.Mesh(k.geo.spire, k.mat.rockDark);
      m.scale.set(2.2 + rnd() * 2, h, 2.2 + rnd() * 2);
      m.rotation.y = rnd() * 3;
      place(m, x, z, h / 2 - 2);
    }
  }

  // ---- scrub, so the ground has a sense of scale ------------------------
  for (let s = 0; s < 6; s++) {
    const x = x0 + rnd() * TILE, z = z0 + rnd() * TILE;
    const c = terrain.canyon(x, z, _c);
    if (c.d < 0.6 && c.df > 0.4) continue;
    const r = 0.5 + rnd() * 1.1;
    const m = new THREE.Mesh(k.geo.scrub, k.mat.scrub);
    m.scale.set(r, r * 1.6, r);
    m.rotation.y = rnd() * 3;
    m.castShadow = false;
    m.position.set(x, terrain.height(x, z) + r * 0.6, z);
    group.add(m);
  }
}
