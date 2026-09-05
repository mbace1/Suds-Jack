// EERI — the flattener: World 1's second machine (DESIGN §8.4).
//
// A road roller. It clears a `sheet` obstacle by DRIVING OVER IT — no aim,
// no held button, the tell is the drum. That means it never digs, so it is
// built against the excavator's own node contract (ART_BRIEF/§8.4: house,
// wheels, seat, step, beacon, and bucket AS THE DRUM) and driven by the
// SAME `Excavator` class, unmodified — a new machine here is a new MODEL,
// not a new class, same as rigs.js's skidder and loader.
//
// The boom → stick → bucket chain exists on every Excavator-classed
// machine whether or not it digs, so `bucket` (the drum) hangs off it the
// same way a real excavator's bucket does — main.js pins `boomTarget` and
// `stickTarget` to 0 for this machine right after construction, but that
// alone does not hold the boom at 0: Excavator.animate()'s own non-digging
// branch recomputes stickTarget from boomTarget every frame and clamps
// boomTarget to a 0.08 rad floor, so it settles there instead. Since
// main.js also gates boomUp/boomDown off for this machine (see main.js),
// `dir` is always 0 and that 0.08 rad is a stable, known fixed point —
// not a moving target. Rather than compose three formula-derived angles
// (boom, stick, bucket) by hand to keep a visible mesh level, `bucket`
// stays an empty contract marker (zero position offset at every joint, so
// its WORLD POSITION — what the flatten trigger reads — never moves
// regardless of rotation), and the actual drum hangs directly off `boom`
// instead, one joint up the chain and one known angle away.

import * as THREE from 'three';
import { PAL, mix } from './palette.js?v=57';
import { craftMat } from './craft.js?v=57';

export function buildFlattenerModel(tint = 0) {
  const T = (c) => (tint > 0 ? mix(c, PAL.SKY_PALE, tint) : c);
  const root = new THREE.Group(); // origin at ground contact, facing +x
  const nodes = {};
  const M = (c) => craftMat(T(c), 'balsa');
  const box = (parent, w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };
  const cyl = (parent, r, h, c, x, y, z, seg = 12) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), M(c));
    m.position.set(x, y, z); parent.add(m); return m;
  };

  // REAR: two ordinary road wheels, same convention as every other machine
  // — the part of the vehicle that just rolls.
  const under = new THREE.Group(); under.name = 'tracks'; root.add(under);
  const wheels = new THREE.Group(); wheels.name = 'wheels'; under.add(wheels);
  box(under, 1.3, 0.3, 1.2, PAL.INK, -0.85, 0.4, 0);        // rear axle beam
  for (const dz of [0.58, -0.58]) {
    const spin = new THREE.Group(); spin.position.set(-0.85, 0.4, dz);
    cyl(spin, 0.4, 0.32, PAL.DARK, 0, 0, 0, 14).rotation.x = Math.PI / 2;
    cyl(spin, 0.16, 0.36, PAL.STEEL[1], 0, 0, 0, 8).rotation.x = Math.PI / 2;
    wheels.add(spin);
  }
  nodes.wheels = wheels;
  nodes.step = (() => {
    const step = new THREE.Group(); step.name = 'step';
    step.position.set(-0.4, 0.62, 0.66);
    box(step, 0.36, 0.07, 0.3, PAL.MACHINE, 0, 0, 0);
    box(step, 0.06, 0.4, 0.06, PAL.DARK, 0.15, 0.22, 0);
    root.add(step); return step;
  })();

  // deck plate between the wheels and the house
  box(root, 1.6, 0.16, 1.1, PAL.STEEL[0], -0.55, 0.72, 0);

  // THE HOUSE. Simpler than the excavator's — a roller has no swing turret,
  // it is one long chassis the driver sits low and forward in.
  const house = new THREE.Group(); house.name = 'house'; house.position.y = 0.78;
  root.add(house); nodes.house = house;
  box(house, 1.5, 0.6, 1.0, PAL.MACHINE, -0.55, 0.3, 0);
  box(house, 1.5, 0.08, 1.04, PAL.MACHINE_DK, -0.55, 0.02, 0);
  cyl(house, 0.05, 0.36, PAL.DARK, -1.15, 0.78, 0.28, 8);      // exhaust
  for (const bx of [-1.05, -0.7, -0.35]) {
    const b = cyl(house, 0.04, 0.055, PAL.DARK, bx, 0.45, 0.51, 6);
    b.rotation.x = Math.PI / 2;
  }

  const cab = new THREE.Group(); cab.position.set(-0.05, 0, 0); house.add(cab);
  box(cab, 0.7, 0.06, 0.76, PAL.STEEL[1], 0, 0.34, 0);          // floor
  box(cab, 0.26, 0.5, 0.06, PAL.MACHINE_DK, 0.3, 0.55, 0.32);   // console-side rail
  box(cab, 0.26, 0.5, 0.06, PAL.MACHINE_DK, 0.3, 0.55, -0.32);
  box(cab, 0.32, 0.08, 0.34, PAL.DARK, -0.15, 0.4, 0);          // seat pad
  box(cab, 0.08, 0.38, 0.34, PAL.DARK, -0.32, 0.58, 0);         // backrest
  cyl(cab, 0.03, 0.34, PAL.INK, 0.34, 0.62, 0, 8);              // steering post
  cyl(cab, 0.16, 0.03, PAL.INK, 0.34, 0.8, 0, 10).rotation.x = 1.15; // wheel
  const seat = new THREE.Group(); seat.name = 'seat';
  seat.position.set(-0.15, 0.34, 0); cab.add(seat); nodes.seat = seat;

  // THE BEACON — identical language to every other machine on the site.
  const beacon = new THREE.Group(); beacon.name = 'beacon';
  beacon.position.set(-0.85, 0.98, 0.3); house.add(beacon);
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.12, 0.16, 8),
    new THREE.MeshBasicMaterial({ color: '#ff9c1a' }),
  );
  lamp.position.y = 0.09; beacon.add(lamp);
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.3, 0.15),
    new THREE.MeshBasicMaterial({ color: '#ffdc8a', transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  flash.position.set(0.12, 0.09, 0); flash.rotation.y = Math.PI / 2; beacon.add(flash);
  box(beacon, 0.09, 0.09, 0.09, PAL.DARK, 0, 0, 0);
  nodes.beacon = beacon;

  // boom → stick → bucket: kept only because every Excavator-classed
  // machine reads these names, and main.js's flatten trigger reads
  // `bucketWorld()` for where the drum is. They carry NO visible geometry.
  const boom = new THREE.Group(); boom.name = 'boom';
  boom.position.set(1.05, -0.06, 0); house.add(boom); nodes.boom = boom;
  const stick = new THREE.Group(); stick.name = 'stick';
  boom.add(stick); nodes.stick = stick;
  const bucket = new THREE.Group(); bucket.name = 'bucket';
  stick.add(bucket); nodes.bucket = bucket;

  // THE DRUM. One wide smooth cylinder — the whole reason this machine
  // reads as a roller rather than a second excavator. It hangs off `boom`
  // directly (not the stick/bucket chain) so it only ever inherits boom's
  // own known, fixed rest angle — compensated below with a matching,
  // constant counter-rotation.
  const drum = new THREE.Group(); drum.rotation.z = -0.08; boom.add(drum);
  box(drum, 0.14, 0.5, 1.5, PAL.MACHINE_DK, -0.15, 0.22, 0);   // the hanger frame
  const barrel = cyl(drum, 0.46, 1.62, PAL.STEEL[2], 0.05, -0.02, 0, 20);
  barrel.rotation.x = Math.PI / 2;
  cyl(drum, 0.48, 0.06, PAL.STEEL[0], 0.05, -0.02, 0.79, 16).rotation.x = Math.PI / 2; // rim
  cyl(drum, 0.48, 0.06, PAL.STEEL[0], 0.05, -0.02, -0.79, 16).rotation.x = Math.PI / 2;
  cyl(drum, 0.1, 1.7, PAL.DARK, 0.05, -0.02, 0, 8).rotation.x = Math.PI / 2;             // the axle, glimpsed through
  for (const dz of [-0.5, 0, 0.5]) {                                                     // scraper bar
    box(drum, 0.06, 0.06, 0.06, PAL.INK, 0.32, -0.4, dz);
  }
  box(drum, 0.08, 0.06, 1.5, PAL.INK, 0.34, -0.4, 0);

  return { root, nodes };
}
